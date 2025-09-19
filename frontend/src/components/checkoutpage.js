import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CartContext } from '../contexts/CartContext';
import Swal from 'sweetalert2';

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
          phone: data.phone || '',
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
    const subtotal = cartItems.reduce((acc, item) => acc + item.ProductPrice * item.quantity, 0);
    const deliveryFee = orderType === 'Delivery' ? 50 : 0;
    return subtotal + deliveryFee;
  };

  const confirmPayment = async (saved) => {
    const token = localStorage.getItem("authToken");
    if (!token || !saved) return;

    const { cartItems, orderType, paymentMethod, userData: savedUserData, deliveryNotes } = saved;
    const subtotal = cartItems.reduce((acc, item) => acc + item.ProductPrice * item.quantity, 0);
    const deliveryFee = orderType === "Delivery" ? 50 : 0;
    const total = subtotal + deliveryFee;

    const cartPayload = cartItems.map(item => ({
      product_id: item.product_id,
      product_name: item.ProductName,
      product_type: item.ProductType || '',
      product_category: item.ProductCategory || '',
      quantity: item.quantity,
      price: item.ProductPrice,
    }));

    const deliveryInfoPayload = orderType === "Delivery" ? {
      FirstName: savedUserData.firstName,
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
      const response = await fetch("http://localhost:7005/payment/confirm-payment", {
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
        }),
      });

      const result = await response.json();

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Order placed successfully!',
        }).then(() => {
          clearCart();
          navigate("/profile/orderhistory");
        });
        localStorage.removeItem("pendingOrderData");
      } else {
        console.error("❌ Backend Validation Error:");

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
          text: 'Failed to confirm order. Please try again.',
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
    const subtotal = cartItems.reduce((acc, item) => acc + item.ProductPrice * item.quantity, 0);
    const deliveryFee = orderType === "Delivery" ? 50 : 0;
    const total = subtotal + deliveryFee;

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

    // Save current userData with updated delivery info inputs
    const currentUserData = { ...userData };

    localStorage.setItem("pendingOrderData", JSON.stringify({
      cartItems,
      orderType,
      paymentMethod,
      userData: currentUserData,
      deliveryNotes
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
          reference_number: `REF-${Date.now()}`,
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
  };

  return (
    <div className="container py-5" style={{ minHeight: '100vh', marginTop: '100px' }}>
      <div className="bg-white p-4 rounded">
        <h2 className="mb-4" style={{ color: '#4B929D', textAlign: 'left' }}>Checkout</h2>
        <table className="table">
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
                  <td>{item.ProductName}</td>
                  <td>{item.ProductType || '-'}</td>
                  <td>{item.ProductCategory || '-'}</td>
                  <td>{item.quantity}</td>
                  <td>₱{item.ProductPrice.toFixed(2)}</td>
                  <td>₱{(item.ProductPrice * item.quantity).toFixed(2)}</td>
                  <td>{orderType}</td>
                  <td>{paymentMethod}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="7" style={{ textAlign: 'right', fontWeight: 'bold' }}>Delivery Fee:</td>
              <td>₱{orderType === 'Delivery' ? '50.00' : '0.00'}</td>
            </tr>
            <tr>
              <td colSpan="7" style={{ textAlign: 'right', fontWeight: 'bold' }}>Grand Total:</td>
              <td>₱{calculateTotal().toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-4 p-3 bg-white rounded">
          <h2 className="mb-4" style={{ color: '#4B929D', textAlign: 'left' }}>Delivery Information</h2>
          <h6 style={{ color: '#4B929D', textAlign: 'left' }}>All fields are required</h6>

          <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
            <div style={{ flex: 1, color: '#4B929D', textAlign: 'left', marginBottom: '5px' }}>First Name <span style={{ color: 'red' }}>*</span></div>
            <div style={{ flex: 1, color: '#4B929D', textAlign: 'left', marginBottom: '5px' }}>Middle Name </div>
            <div style={{ flex: 1, color: '#4B929D', textAlign: 'left', marginBottom: '5px' }}>Last Name <span style={{ color: 'red' }}>*</span></div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input type="text" placeholder="First Name" style={{ flex: 1, padding: '8px', backgroundColor: '#d0e7f9' }} value={userData.firstName} readOnly />
            <input type="text" placeholder="Middle Name" style={{ flex: 1, padding: '8px', backgroundColor: '#d0e7f9' }} value={userData.middleName} readOnly />
            <input type="text" placeholder="Last Name" style={{ flex: 1, padding: '8px', backgroundColor: '#d0e7f9' }} value={userData.lastName} readOnly />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <div style={{ flex: 1, color: '#4B929D', textAlign: 'left', marginTop: '10px' }}>Block, Street, Subdivision <span style={{ color: 'red' }}>*</span></div>
            <div style={{ flex: 1, color: '#4B929D', textAlign: 'left', marginTop: '10px' }}>City <span style={{ color: 'red' }}>*</span></div>
            <div style={{ flex: 1, color: '#4B929D', textAlign: 'left', marginTop: '10px' }}>Baranggay <span style={{ color: 'red' }}>*</span></div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input type="text" placeholder="Block, Street, Subdivision" style={{ flex: 1, padding: '8px' }} value={userData.blockStreetSubdivision} onChange={e => handleInputChange('blockStreetSubdivision', e.target.value)} />
            <input type="text" placeholder="City" style={{ flex: 1, padding: '8px' }} value={userData.city} onChange={e => handleInputChange('city', e.target.value)} />
            <input type="text" placeholder="Province" style={{ flex: 1, padding: '8px' }} value={userData.province} onChange={e => handleInputChange('province', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <div style={{ flex: 1, color: '#4B929D', textAlign: 'left', marginTop: '10px' }}>Landmark <span style={{ color: 'red' }}>*</span></div>
            <div style={{ flex: 1, color: '#4B929D', textAlign: 'left', marginTop: '10px' }}>Email Address <span style={{ color: 'red' }}>*</span></div>
            <div style={{ flex: 1, color: '#4B929D', textAlign: 'left', marginTop: '10px' }}>Phone Number <span style={{ color: 'red' }}>*</span></div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input type="text" placeholder="Landmark" style={{ flex: 1, padding: '8px' }} value={userData.landmark} onChange={e => handleInputChange('landmark', e.target.value)} />
            <input type="email" placeholder="Email Address" style={{ flex: 1, padding: '8px' }} value={userData.email} onChange={e => handleInputChange('email', e.target.value)} />
            <input type="text" placeholder="Phone Number" style={{ flex: 1, padding: '8px' }} value={userData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ backgroundColor: '#4B929D', borderColor: '#4B929D', padding: '10px 20px' }}
              onClick={handlePlaceOrder}
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
