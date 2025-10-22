import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CartContext } from '../contexts/CartContext';
import Swal from 'sweetalert2';
import './checkout.css';
const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useContext(CartContext);
  const { cartItems = [], orderType = 'Pick Up', paymentMethod = 'Cash' } = location.state || {};

  const [userData, setUserData] = useState({
    username: '',
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    blockStreetSubdivision: '',
    city: '',
    province: '',
    landmark: '',
  });

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
          blockStreetSubdivision: (data.block || '') + ' ' + (data.street || '') + ' ' + (data.subdivision || ''),
          city: data.city || '',
          province: data.province || '',
          landmark: data.landmark || '',
        });
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

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
    const subtotal = cartItems.reduce((acc, item) => {
      const addonSum = item.addons ? item.addons.reduce((sum, ao) => sum + (ao.price || ao.Price || 0), 0) : 0;
      return acc + (item.ProductPrice + addonSum) * item.quantity;
    }, 0);
    const deliveryFee = orderType === 'Delivery' ? 50 : 0;
    return subtotal + deliveryFee;
  };

  // Replace the confirmPayment function in your CheckoutPage.js

const confirmPayment = async (saved) => {
  const token = localStorage.getItem("authToken");
  if (!token || !saved) return;

  const { cartItems, orderType, paymentMethod, userData: savedUserData, deliveryNotes, reference_number } = saved;
  const subtotal = cartItems.reduce((acc, item) => {
    const addonSum = item.addons ? item.addons.reduce((sum, ao) => sum + (ao.price || ao.Price || 0), 0) : 0;
    return acc + (item.ProductPrice + addonSum) * item.quantity;
  }, 0);
  const deliveryFee = orderType === "Delivery" ? 50 : 0;
  const total = subtotal + deliveryFee;

  const cartPayload = cartItems.map(item => ({
    product_id: item.product_id,
    product_name: item.ProductName,
    product_type: item.ProductType || '',
    product_category: item.ProductCategory || '',
    quantity: item.quantity,
    price: item.ProductPrice,
    addons: item.addons ? item.addons.map(addon => ({
      addon_id: addon.addon_id || addon.AddOnID || 0,
      addon_name: addon.addon_name || addon.AddOnName || addon.name,
      price: addon.price || addon.Price || 0,
      status: addon.status || addon.Status || 'Available'
    })) : []
  }));

  const deliveryInfoPayload = orderType === "Delivery" ? {
    FirstName: savedUserData.username,
    MiddleName: savedUserData.middleName,
    LastName: savedUserData.lastName,
    Address: savedUserData.blockStreetSubdivision,
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
        delivery_fee: deliveryFee,
        total,
        notes: deliveryNotes || "",
        cart_items: cartPayload,
        delivery_info: deliveryInfoPayload,
        reference_number,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Payment confirmed successfully!");
      console.log("Online Order ID:", result.online_order_id);
      console.log("POS Sale ID:", result.pos_sale_id);
      console.log("Status: Order saved to both OOS and POS as PENDING");

      Swal.fire({
        icon: 'success',
        title: 'Success',
        html: `
          <p>Order placed successfully!</p>
          <p style="font-size: 0.9em; color: #666;">
            Your order is now pending acceptance by the cashier.
          </p>
        `,
      }).then(() => {
        clearCart();
        navigate("/profile/orderhistory");
      });
      localStorage.removeItem("pendingOrderData");
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
  const subtotal = cartItems.reduce((acc, item) => {
    const addonSum = item.addons ? item.addons.reduce((sum, ao) => sum + (ao.price || ao.Price || 0), 0) : 0;
    return acc + (item.ProductPrice + addonSum) * item.quantity;
  }, 0);
  const deliveryFee = orderType === "Delivery" ? 50 : 0;
  const total = subtotal + deliveryFee;
  const reference_number = `REF-${Date.now()}`;

  // Validate required fields
  if (orderType === "Delivery") {
    const requiredFields = ['firstName', 'lastName', 'blockStreetSubdivision', 'city', 'province', 'landmark', 'email', 'phone'];
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
      reference_number
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
      reference_number
    }));

    try {
      const response = await fetch("http://localhost:7005/payment/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(total.toFixed(2)),
          description: "Order from OOS",
          reference_number,
          redirect_url: window.location.origin + "/checkout",
        }),
      });

      const data = await response.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Payment Failed',
          text: 'Failed to initiate payment',
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
                      {item.ProductName}
                      {item.addons && item.addons.length > 0 && (
                        <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.85em", color: "#666" }}>
                          {item.addons.map((addon, i) => (
                            <li key={i} style={{ color: (addon.status || addon.Status || 'Available') === 'Unavailable' ? '#999' : '#666', fontStyle: (addon.status || addon.Status || 'Available') === 'Unavailable' ? 'italic' : 'normal' }}>+ {addon.addon_name || addon.AddOnName || addon.name} (₱{addon.price || addon.Price || 0})</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td>{item.ProductType || '-'}</td>
                    <td>{item.ProductCategory || '-'}</td>
                    <td>{item.quantity}</td>
                    <td>₱{item.ProductPrice.toFixed(2)}</td>
                    <td>
                      ₱{((item.ProductPrice + (item.addons ? item.addons.reduce((sum, ao) => sum + (ao.price || ao.Price || 0), 0) : 0)) * item.quantity).toFixed(2)}
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
                <div className="fw-bold">{item.ProductName}</div>
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
                  <span>Total: ₱{((item.ProductPrice + (item.addons ? item.addons.reduce((sum, ao) => sum + (ao.price || ao.Price || 0), 0) : 0)) * item.quantity).toFixed(2)}</span>
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
          <div className="total-row">
            <span>Delivery Fee:</span>
            <span>₱{orderType === 'Delivery' ? '50.00' : '0.00'}</span>
          </div>
          <div className="total-row grand-total">
            <strong>Grand Total:</strong>
            <strong>₱{calculateTotal().toFixed(2)}</strong>
          </div>
        </div>

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
              <label>Block, Street, Subdivision <span className="text-danger">*</span></label>
              <input type="text" placeholder="Block, Street, Subdivision" className="form-control" value={userData.blockStreetSubdivision} onChange={e => handleInputChange('blockStreetSubdivision', e.target.value)} />
            </div>
            <div className="form-group">
              <label>City <span className="text-danger">*</span></label>
              <input type="text" placeholder="City" className="form-control" value={userData.city} onChange={e => handleInputChange('city', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Baranggay <span className="text-danger">*</span></label>
              <input type="text" placeholder="Baranggay" className="form-control" value={userData.province} onChange={e => handleInputChange('province', e.target.value)} />
            </div>
          </div>

          <div className="checkout-form-row">
            <div className="form-group">
              <label>Landmark <span className="text-danger">*</span></label>
              <input type="text" placeholder="Landmark" className="form-control" value={userData.landmark} onChange={e => handleInputChange('landmark', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Email Address <span className="text-danger">*</span></label>
              <input type="email" placeholder="Email Address" className="form-control" value={userData.email} onChange={e => handleInputChange('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Phone Number <span className="text-danger">*</span></label>
              <input type="text" placeholder="Phone Number" className="form-control" value={userData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
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