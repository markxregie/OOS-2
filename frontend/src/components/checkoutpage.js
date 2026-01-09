import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CartContext } from '../contexts/CartContext';
import Swal from 'sweetalert2';
import './checkout.css';
const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useContext(CartContext); // Receive deliveryFee from location.state
  const { cartItems = [], orderType = 'Pick Up', paymentMethod = 'Cash', deliveryFee = 0, isTemporaryCart = false, tempCartId = null } = location.state || {};

  const orderCompletedRef = useRef(false); // Track if order was completed

  const [promoData, setPromoData] = useState(null);
  const [isLoadingPromos, setIsLoadingPromos] = useState(false);
  const [availablePromos, setAvailablePromos] = useState([]);
  const [promoCalculated, setPromoCalculated] = useState(false); // Track if promos were calculated
  const [lastCartHash, setLastCartHash] = useState(''); // Track cart changes

  const [userData, setUserData] = useState({
    username: '',
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    region: '',
    province: '',
    streetName: '',
    city: '',
    barangay: '',
    landmark: '',
  });

  // Cleanup temporary cart item when user navigates away without completing order
  useEffect(() => {
    // Cleanup function that runs when component unmounts
    return () => {
      if (isTemporaryCart && tempCartId && !orderCompletedRef.current) {
        const cleanupTempCart = async () => {
          try {
            const token = localStorage.getItem('authToken');
            await fetch(`http://localhost:7000/usercart/temp-clear/${tempCartId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('🗑️ Temporary cart item cleaned up on page exit');
          } catch (err) {
            console.error('Error cleaning up temporary cart on exit:', err);
          }
        };
        cleanupTempCart();
      }
    };
  }, [isTemporaryCart, tempCartId]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;
         
        const response = await fetch('http://localhost:4000/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          console.error('Failed to fetch user profile:', response.statusText);
          return;
        }

        const data = await response.json();
        setUserData({
          username: data.username || '',
          firstName: data.firstName || '',
          middleName: data.middleName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phoneNumber || data.phone || '',
          region: data.region || '',
          province: data.province || '',
          streetName: data.streetName || '',
          city: data.city || '',
          barangay: data.barangay || '',
          postalCode: data.postalCode || '',
          landmark: data.landmark || '',
        });
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  // Fetch available promotions
  useEffect(() => {
    const fetchPromos = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      try {
        const response = await fetch('http://localhost:7004/debug/promos', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setAvailablePromos(data.promos || []);
        }
      } catch (error) {
        console.error('Error fetching promos:', error);
      }
    };

    fetchPromos();
  }, []);

  // Fetch and calculate promotions - ONLY ONCE per cart state
  useEffect(() => {
    const calculatePromos = async () => {
      const token = localStorage.getItem('authToken');
      const username = userData.username || localStorage.getItem('username');
      
      // Create a hash of cart items to detect changes
      const cartHash = JSON.stringify(cartItems.map(i => ({ id: i.cart_item_id, qty: i.quantity })));
      
      // Reset if cart changed
      if (cartHash !== lastCartHash) {
        setPromoCalculated(false);
        setLastCartHash(cartHash);
        return; // Let the next render handle the calculation
      }
      
      if (!token || !username || cartItems.length === 0 || promoCalculated || isLoadingPromos) {
        return; // Skip if already calculating or calculated
      }

      setIsLoadingPromos(true);
      try {
        // Pass cart item IDs and orderType to backend
        const cartItemIds = cartItems.map(item => item.cart_item_id).join(',');
        const response = await fetch(`http://localhost:7004/cart/calculate-promos?username=${username}&cart_item_ids=${cartItemIds}&order_type=${encodeURIComponent(orderType)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setPromoData(data);
          setPromoCalculated(true); // Mark as calculated
          console.log('Promos calculated:', data);
          console.log('Items with discounts:', data.items);
          console.log('Subtotal discount:', data.subtotal_discount);
          console.log('Final subtotal:', data.final_subtotal);
        } else {
          console.error('Failed to calculate promos');
        }
      } catch (error) {
        console.error('Error calculating promos:', error);
      } finally {
        setIsLoadingPromos(false);
      }
    };

    if (userData.username && cartItems.length > 0) {
      calculatePromos();
    }
  }, [userData.username, cartItems, promoCalculated, isLoadingPromos, lastCartHash]);

  // Controlled inputs for delivery info to update userData state
  const handleInputChange = (field, value) => {
    setUserData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const status = queryParams.get("status");
    if (status === "success") {
      const savedData = localStorage.getItem("pendingOrderData");
      if (!savedData) return;
      localStorage.removeItem("pendingOrderData");
      confirmPayment(JSON.parse(savedData));
    } else if (status === "fail") {
      Swal.fire({
        icon: 'error',
        title: 'Payment Failed',
        text: 'Payment was unsuccessful. Please try again.',
      });
    }
  }, []);

  const calculateTotal = () => {
    // Always calculate the manual subtotal as fallback
    const manualSubtotal = cartItems.reduce((acc, item) => {
      const addonSum = item.addons ? item.addons.reduce((sum, ao) => sum + (ao.price || ao.Price || 0), 0) : 0;
      return acc + (item.price + addonSum) * item.quantity;
    }, 0);
    
    // Use promoData only if it exists and has a valid final_subtotal
    const subtotal = (promoData && promoData.final_subtotal > 0) 
      ? promoData.final_subtotal 
      : manualSubtotal;
    
    const currentDeliveryFee = orderType === 'Delivery' ? deliveryFee : 0;
    
    console.log('=== CALCULATE TOTAL DEBUG ===');
    console.log('promoData:', promoData);
    console.log('Manual subtotal:', manualSubtotal);
    console.log('Subtotal used:', subtotal);
    console.log('Delivery fee:', currentDeliveryFee);
    console.log('Final total:', subtotal + currentDeliveryFee);
    
    return subtotal + currentDeliveryFee;
  };

  // Replace the confirmPayment function in your CheckoutPage.js

const confirmPayment = async (saved) => {
  // Show loader immediately
  Swal.fire({
    title: 'Processing Order...',
    text: 'Please wait while we confirm your payment and place your order.',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  const token = localStorage.getItem("authToken");
  if (!token || !saved) return;

  const { cartItems, orderType, paymentMethod, userData: savedUserData, deliveryNotes, reference_number } = saved;
  // Destructure deliveryFee from saved data
  const { deliveryFee: savedDeliveryFee, total_discount = 0 } = saved;
  const subtotal = cartItems.reduce((acc, item) => {
    const addonSum = item.addons ? item.addons.reduce((sum, ao) => sum + (ao.price || ao.Price || 0), 0) : 0;
    return acc + (item.price + addonSum) * item.quantity;
  }, 0);
  const currentDeliveryFee = orderType === "Delivery" ? savedDeliveryFee : 0;
  const total = subtotal + currentDeliveryFee - total_discount;  // Subtract discount from total
  const cartPayload = cartItems.map(item => ({
    product_id: item.product_id,
    product_name: item.product_name,
    product_type: item.product_type || '',
    product_category: item.product_category || '',
    quantity: item.quantity,
    price: item.price,
    addons: item.addons ? item.addons.map(addon => ({
      addon_id: addon.addon_id || addon.AddOnID || 0,
      addon_name: addon.addon_name || addon.AddOnName || addon.name,
      price: addon.price || addon.Price || 0,
      status: addon.status || addon.Status || 'Available'
    })) : []
  }));

  const deliveryInfoPayload = orderType === "Delivery" ? {
    FirstName: savedUserData.firstName,
    MiddleName: savedUserData.middleName,
    LastName: savedUserData.lastName,
    Address: `${savedUserData.region}, ${savedUserData.province}, ${savedUserData.streetName}, ${savedUserData.barangay}`,
    City: savedUserData.city,
    Province: savedUserData.province,
    Landmark: savedUserData.landmark,
    EmailAddress: savedUserData.email,
    PhoneNumber: savedUserData.phone,
    Notes: deliveryNotes || "",
  } : null;

  try {
    console.log("=== CONFIRMING PAYMENT AND SAVING TO POS ===");
    console.log("Reference Number:", reference_number);
    console.log("Order Type:", orderType);
    console.log("Payment Method:", paymentMethod);

    // **CHANGED: Use the new endpoint that saves to POS immediately**
    const response = await fetch("http://localhost:7005/payment/confirm-payment-and-save-pos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username: savedUserData.username,
        order_type: orderType,
        payment_method: paymentMethod,
        subtotal,
        delivery_fee: currentDeliveryFee, // Use currentDeliveryFee here
        total,
        notes: deliveryNotes || "",
        cart_items: cartPayload,
        delivery_info: deliveryInfoPayload,
        reference_number,
        total_discount,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Payment confirmed successfully!");
      console.log("Online Order ID:", result.online_order_id);
      console.log("POS Sale ID:", result.pos_sale_id);
      console.log("Status: Order saved to both OOS and POS as PENDING");

      // Mark order as completed to prevent cleanup on unmount
      orderCompletedRef.current = true;

      // Clear the cart immediately after successful order
      await clearCart();
      localStorage.removeItem("pendingOrderData");

      // Clean up temporary cart if it was used
      if (isTemporaryCart && tempCartId) {
        try {
          const token = localStorage.getItem('authToken');
          await fetch(`http://localhost:7004/usercart/temp-clear/${tempCartId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        } catch (err) {
          console.error('Error cleaning up temporary cart:', err);
        }
      }

      Swal.fire({
        icon: 'success',
        title: 'Success',
        html: `
          <p style="margin-bottom: 15px; margin-top: -0.5rem;">Order placed successfully!</p>
          <p style="font-size: 0.9em; color: #666;">
            Your order is now pending acceptance by the cashier.
          </p>
        `,
      }).then(() => {
        navigate("/profile/orderhistory");
      });
    } else {
      console.error("❌ Backend Error:");

      if (Array.isArray(result.detail)) {
        result.detail.forEach((err, idx) =>
          console.error(`Error ${idx + 1}:`, err.loc?.join(" → "), "-", err.msg)
        );
      } else {
        console.error("❌ Server Error:", result.detail);
      }

      Swal.fire({
        icon: 'error',
        title: 'Order Failed',
        text: result.detail || 'Failed to confirm order. Please try again.',
      });
    }
  } catch (error) {
    console.error("Payment confirmation error:", error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'An error occurred while processing your payment.',
    });
  }
};

  const handlePlaceOrder = async () => {
    Swal.fire({
      title: 'Confirm Checkout',
      text: 'Are you sure you want to place the order?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, place order',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        proceedPlaceOrder();
      }
    });
  };

  const proceedPlaceOrder = async () => {
  const token = localStorage.getItem("authToken");
  if (!token) return;

  const deliveryNotes = document.getElementById("deliveryNotes")?.value || "";
  const subtotal = promoData 
    ? promoData.final_subtotal 
    : cartItems.reduce((acc, item) => {
        const addonSum = item.addons ? item.addons.reduce((sum, ao) => sum + (ao.price || ao.Price || 0), 0) : 0;
        return acc + (item.price + addonSum) * item.quantity;
      }, 0);
  
  const totalDiscount = promoData ? promoData.subtotal_discount : 0;
  // Use the passed deliveryFee here
  const currentDeliveryFee = orderType === "Delivery" ? deliveryFee : 0;
  const total = subtotal + deliveryFee;
  const reference_number = `REF-${Date.now()}`;

  // Validate required fields
  if (orderType === "Delivery") {
    const requiredFields = ['firstName', 'lastName', 'region', 'province', 'streetName', 'barangay', 'city', 'postalCode', 'landmark', 'email', 'phone'];
    const missingFields = requiredFields.filter(field => !userData[field]);

    if (missingFields.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Fields',
        text: `Please fill in all required fields: ${missingFields.join(', ')}`,
      });
      return;
    }
  }

  const currentUserData = { ...userData };

  // **CHECK PAYMENT METHOD HERE**
  if (paymentMethod === 'Cash') {
    // Handle Cash payment directly - no PayMongo needed
    const savedData = {
      cartItems,
      orderType,
      paymentMethod,
      userData: currentUserData,
      deliveryNotes,
      reference_number,
      deliveryFee: currentDeliveryFee, // Pass deliveryFee here
      total_discount: totalDiscount,
    };

    await confirmPayment(savedData);
  } else {
    // Handle online payment via PayMongo
    localStorage.setItem("pendingOrderData", JSON.stringify({
      cartItems,
      orderType,
      paymentMethod,
      userData: currentUserData,
      deliveryNotes,
      reference_number, // Missing comma here
      deliveryFee: currentDeliveryFee, // Pass deliveryFee here
      total_discount: totalDiscount,
    }));

    // Use the passed deliveryFee here
    const paymongoDeliveryFee = orderType === "Delivery" ? currentDeliveryFee : 0;
    const itemsForCheckout = cartItems.map(item => {
      const addonList = item.addons?.map(addon =>
        `${addon.addon_name || addon.AddOnName || addon.name} (₱${addon.price || addon.Price || 0})`
      ) || [];
      const basePrice = item.price + (item.addons ? item.addons.reduce((sum, ao) => sum + (ao.price || ao.Price || 0), 0) : 0);
      return {
        name: item.product_name,
        quantity: item.quantity,
        price: basePrice,
        addons: addonList
      };
    });
    try {
      const response = await fetch("http://localhost:7005/payment/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reference_number,
          redirect_url: window.location.origin + "/checkout",
          items: itemsForCheckout,
          delivery_fee: paymongoDeliveryFee, // Use paymongoDeliveryFee here
          order_type: orderType,
          user_data: currentUserData,
          discount: totalDiscount  // Pass the promo discount
        }),
      });
      const data = await response.json();
      if (data.checkout_url) {
        // Don't clear cart yet - only clear after successful payment
        window.location.href = data.checkout_url;
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Payment Failed',
          text: data.detail || 'Failed to initiate payment',
        });
      }
    } catch (error) {
      console.error("Error:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred during payment processing',
      });
    }
  }
};

  return (
    <div className="container py-5" style={{ minHeight: '100vh', marginTop: '100px' }}>
      <div className="checkout-card bg-white p-3 p-md-4 rounded">
        <h2 className="mb-4 checkout-header">Checkout</h2>

        {/* --- DESKTOP TABLE VIEW --- */}
        <div className="table-responsive d-none d-md-block">
          <table className="table checkout-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
                <th>Delivery Method</th>
                <th>Payment Method</th>
              </tr>
            </thead>
            <tbody>
              {cartItems.length === 0 ? (
                <tr><td colSpan="8" className="text-center">No items in cart.</td></tr>
              ) : (
                cartItems.map((item, index) => (
                  <tr key={index}>
                    <td>
                      {item.product_name}
                      {item.addons && item.addons.length > 0 && (
                        <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.85em", color: "#666" }}>
                          {item.addons.map((addon, i) => (
                            <li key={i} style={{ color: (addon.status || addon.Status || 'Available') === 'Unavailable' ? '#999' : '#666', fontStyle: (addon.status || addon.Status || 'Available') === 'Unavailable' ? 'italic' : 'normal' }}>+ {addon.addon_name || addon.AddOnName || addon.name} (₱{addon.price || addon.Price || 0})</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td>{item.product_type || '-'}</td>
                    <td>{item.product_category || '-'}</td>
                    <td>{item.quantity}</td>
                    <td>₱{item.price.toFixed(2)}</td>
                    <td>
                      ₱{((item.price + (item.addons ? item.addons.reduce((sum, ao) => sum + (ao.price || ao.Price || 0), 0) : 0)) * item.quantity).toFixed(2)}
                    </td>
                    <td>{orderType}</td>
                    <td>{paymentMethod}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* --- MOBILE CARD VIEW --- */}
        <div className="d-md-none">
          {cartItems.length === 0 ? (
            <div className="text-center p-3">No items in cart.</div>
          ) : (
            cartItems.map((item, index) => (
              <div key={index} className="checkout-item-card-mobile">
                <div className="fw-bold">{item.product_name}</div>
                {item.addons && item.addons.length > 0 && (
                  <ul className="checkout-addons-mobile">
                    {item.addons.map((addon, i) => (
                      <li key={i} style={{ color: (addon.status || addon.Status || 'Available') === 'Unavailable' ? '#999' : '#666', fontStyle: (addon.status || addon.Status || 'Available') === 'Unavailable' ? 'italic' : 'normal' }}>
                        + {addon.addon_name || addon.AddOnName || addon.name} (₱{addon.price || addon.Price || 0})
                      </li>
                    ))}
                  </ul>
                )}
                <div className="checkout-details-mobile">
                  <span>Qty: {item.quantity}</span>
                  <span>Total: ₱{((item.price + (item.addons ? item.addons.reduce((sum, ao) => sum + (ao.price || ao.Price || 0), 0) : 0)) * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
          <div className="checkout-summary-mobile">
            <div><span>Order Type:</span> <strong>{orderType}</strong></div>
            <div><span>Payment Method:</span> <strong>{paymentMethod}</strong></div>
          </div>
        </div>

        {/* --- TOTALS SECTION (COMMON FOR BOTH) --- */}
        <div className="checkout-totals-section">
          {isLoadingPromos && (
            <div className="total-row text-muted">
              <span>Calculating promotions...</span>
            </div>
          )}
          
          {/* Show original subtotal if there are promos */}
          {promoData && promoData.subtotal_discount > 0 && (
            <div className="total-row">
              <span>Subtotal (before discount):</span>
              <span>₱{cartItems.reduce((acc, item) => {
                const addonSum = item.addons ? item.addons.reduce((sum, ao) => sum + (ao.price || ao.Price || 0), 0) : 0;
                return acc + (item.price + addonSum) * item.quantity;
              }, 0).toFixed(2)}</span>
            </div>
          )}
          
          {/* Show item-level discounts if available */}
          {promoData && promoData.items && promoData.items.some(item => item.discount > 0) && (
            <div className="total-row text-success" style={{ fontSize: '0.9em', fontStyle: 'italic' }}>
              <span>📋 Items with discounts:</span>
              <span></span>
            </div>
          )}
          {promoData && promoData.items && promoData.items.filter(item => item.discount > 0).map((item, idx) => (
            <div key={idx} className="total-row text-success" style={{ fontSize: '0.85em', paddingLeft: '20px' }}>
              <span>{item.product_name}</span>
              <span>- ₱{item.discount.toFixed(2)}</span>
            </div>
          ))}
          
          {/* Total promo discount */}
          {promoData && promoData.subtotal_discount > 0 && (
            <div className="total-row text-success">
              <span><strong>🎉 Total Promo Discount:</strong></span>
              <span><strong>- ₱{promoData.subtotal_discount.toFixed(2)}</strong></span>
            </div>
          )}
          
          {/* Subtotal after discount */}
          {promoData && promoData.subtotal_discount > 0 && (
            <div className="total-row">
              <span>Subtotal (after discount):</span>
              <span>₱{promoData.final_subtotal.toFixed(2)}</span>
            </div>
          )}
          
          <div className="total-row">
            <span>Delivery Fee:</span> {/* Use the dynamically passed deliveryFee */}
            <span>₱{orderType === 'Delivery' ? deliveryFee.toFixed(2) : '0.00'}</span>
          </div>
          <div className="total-row grand-total">
            <strong>Grand Total:</strong>
            <strong>₱{calculateTotal().toFixed(2)}</strong>
          </div>
        </div>

        {/* Available Promotions Section */}
        {availablePromos.length > 0 && (
          <div className="mt-3 p-3 rounded" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
            <h6 style={{ color: '#4B929D', marginBottom: '10px' }}>🎁 Available Promotions</h6>
            {availablePromos.map((promo, idx) => {
              const isApplied = promoData?.items?.some(item => 
                item.applied_promo?.promotionName === promo.promotionName && item.discount > 0
              );
              
              let requirement = '';
              if (promo.minQuantity && promo.minQuantity > 1) {
                requirement += `Min. ${promo.minQuantity} items`;
              }
              if (promo.applicationType === 'specific_products' && promo.selectedProducts?.length > 0) {
                requirement += (requirement ? ' • ' : '') + `Products: ${promo.selectedProducts.join(', ')}`;
              }
              if (promo.applicationType === 'specific_categories' && promo.selectedCategories?.length > 0) {
                requirement += (requirement ? ' • ' : '') + `Categories: ${promo.selectedCategories.join(', ')}`;
              }
              
              let discount = '';
              if (promo.promotionType === 'percentage') {
                discount = `${promo.promotionValue}% OFF`;
              } else if (promo.promotionType === 'fixed') {
                discount = `₱${promo.promotionValue} OFF`;
              } else if (promo.promotionType === 'bogo') {
                discount = `Buy ${promo.buyQuantity} Get ${promo.getQuantity} ${promo.bogoDiscountValue}% OFF`;
              }

              return (
                <div 
                  key={idx} 
                  className="p-2 mb-2 rounded"
                  style={{ 
                    backgroundColor: isApplied ? '#d4edda' : 'white',
                    border: isApplied ? '1px solid #c3e6cb' : '1px solid #dee2e6',
                    fontSize: '0.9em'
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <strong style={{ color: isApplied ? '#155724' : '#4B929D' }}>
                        {isApplied && '✓ '}{promo.promotionName}
                      </strong>
                      <div style={{ color: '#6c757d', fontSize: '0.9em' }}>
                        {promo.description}
                      </div>
                      {requirement && (
                        <div style={{ color: '#6c757d', fontSize: '0.85em', fontStyle: 'italic', marginTop: '3px' }}>
                          {requirement}
                        </div>
                      )}
                    </div>
                    <span 
                      className="badge" 
                      style={{ 
                        backgroundColor: isApplied ? '#28a745' : '#4B929D',
                        color: 'white',
                        padding: '5px 10px'
                      }}
                    >
                      {discount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 p-3 bg-white rounded">
          <h2 className="mb-4 checkout-header">Delivery Information</h2>
          <h6 className="checkout-subheader">All fields are required</h6>

          <div className="checkout-form-row">
            <div className="form-group">
              <label>First Name <span className="text-danger">*</span></label>
              <input type="text" placeholder="First Name" className="form-control" value={userData.firstName} readOnly />
            </div>
            <div className="form-group">
              <label>Middle Name</label>
              <input type="text" placeholder="Middle Name" className="form-control" value={userData.middleName} readOnly />
            </div>
            <div className="form-group">
              <label>Last Name <span className="text-danger">*</span></label>
              <input type="text" placeholder="Last Name" className="form-control" value={userData.lastName} readOnly />
            </div>
          </div>

          <div className="checkout-form-row">
            <div className="form-group">
              <label>Region <span className="text-danger">*</span></label>
              <input type="text" placeholder="Region" className="form-control" value={userData.region} readOnly />
            </div>
            <div className="form-group">
              <label>Province <span className="text-danger">*</span></label>
              <input type="text" placeholder="Province" className="form-control" value={userData.province} readOnly />
            </div>
            <div className="form-group">
              <label>Street Name <span className="text-danger">*</span></label>
              <input type="text" placeholder="Street Name" className="form-control" value={userData.streetName} readOnly />
            </div>
          </div>

          <div className="checkout-form-row">
            <div className="form-group">
              <label>Barangay <span className="text-danger">*</span></label>
              <input type="text" placeholder="Barangay" className="form-control" value={userData.barangay} readOnly />
            </div>
            <div className="form-group">
              <label>City <span className="text-danger">*</span></label>
              <input type="text" placeholder="City" className="form-control" value={userData.city} readOnly />
            </div>
            <div className="form-group">
              <label>Postal Code <span className="text-danger">*</span></label>
              <input type="text" placeholder="Postal Code" className="form-control" value={userData.postalCode} readOnly />
            </div>
          </div>

          <div className="checkout-form-row">
            <div className="form-group">
              <label>Landmark <span className="text-danger">*</span></label>
              <input type="text" placeholder="Landmark" className="form-control" value={userData.landmark} readOnly />
            </div>
            <div className="form-group">
              <label>Email Address <span className="text-danger">*</span></label>
              <input type="email" placeholder="Email Address" className="form-control" value={userData.email} readOnly />
            </div>
            <div className="form-group">
              <label>Phone Number <span className="text-danger">*</span></label>
              <input type="text" placeholder="Phone Number" className="form-control" value={userData.phone} readOnly />
            </div>
          </div>



          <div style={{ marginTop: '10px' }}>
            <label htmlFor="deliveryNotes" style={{ color: '#4B929D', display: 'block', marginBottom: '5px' }}>Delivery Notes</label>
            <textarea
              id="deliveryNotes"
              placeholder="Enter delivery notes here..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '8px',
                borderColor: '#ced4da',
                borderRadius: '25px',
                outlineColor: '#ced4da',
              }}
            />
          </div>
          <div className="d-flex justify-content-end mt-3">
            <button
              type="button"
              className="btn btn-primary w-100 w-md-auto"
              onClick={handlePlaceOrder}
              style={{ backgroundColor: '#4B929D', borderColor: '#4B929D' }}
            >
              Place Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;