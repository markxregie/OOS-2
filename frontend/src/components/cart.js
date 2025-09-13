import React, { useCallback, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import qrImage from '../assets/qr.png';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './cart.css';
import { CartContext } from '../contexts/CartContext';

const Cart = () => {
  const navigate = useNavigate();

  const { cartItems, incrementQuantity, decrementQuantity, removeFromCart } = useContext(CartContext);

  console.log("🧾 Current cartItems:", cartItems);

  const [selectedCartItems, setSelectedCartItems] = useState([]);

  const [receiptFile, setReceiptFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentMethodMain, setPaymentMethodMain] = useState('Cash');
  const [orderTypeMain, setOrderTypeMain] = useState('Pick Up');

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    address: '',
    landmark: '',
    contact: '',
    email: '',
  });

  const [errors, setErrors] = useState({});

  const handleCheckboxChange = (item, checked) => {
    if (checked) {
      setSelectedCartItems(prev => [...prev, item]);
    } else {
      setSelectedCartItems(prev => prev.filter(ci => ci.product_id !== item.product_id));
    }
  };

  const handleSelectAllChange = (checked) => {
    if (checked) {
      setSelectedCartItems(cartItems);
    } else {
      setSelectedCartItems([]);
    }
  };

  const handleIncrement = (index) => {
    const productId = cartItems[index].product_id;
    incrementQuantity(productId);

    // Update quantity in selectedCartItems if item is selected
    setSelectedCartItems(prevSelected => {
      return prevSelected.map(item => {
        if (item.product_id === productId) {
          return { ...item, quantity: item.quantity + 1 };
        }
        return item;
      });
    });
  };

  const handleDecrement = (index) => {
    const productId = cartItems[index].product_id;
    decrementQuantity(productId);

    // Update quantity in selectedCartItems if item is selected
    setSelectedCartItems(prevSelected => {
      return prevSelected.map(item => {
        if (item.product_id === productId && item.quantity > 1) {
          return { ...item, quantity: item.quantity - 1 };
        }
        return item;
      });
    });
  };

  const handleRemove = (index) => {
  const product = cartItems[index];

  if (product.quantity > 1) {
    decrementQuantity(product.product_id);
  } else {
    removeFromCart(product.product_id);
    setSelectedCartItems(prev => prev.filter(item => item.product_id !== product.product_id));
  }
};

  const calculateTotal = (item) => item.ProductPrice * item.quantity;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setReceiptFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.landmark.trim()) newErrors.landmark = 'Landmark is required';
    if (!formData.contact.trim()) {
      newErrors.contact = 'Contact number is required';
    } else if (!/^\d{11}$/.test(formData.contact)) {
      newErrors.contact = 'Contact number must be 11 digits';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    return newErrors;
  };

  const handleCheckoutClick = (e) => {
  e.preventDefault();
  if (selectedCartItems.length === 0) {
    toast.error("Please select items to checkout.");
    return;
  }

  navigate('/checkout', {
    state: {
      cartItems: selectedCartItems,
      orderType: orderTypeMain,
      paymentMethod: paymentMethodMain
    }
  });
};

  const handleConfirmOrder = () => {
    toast.success('Order confirmed! Redirecting...');
    setSelectedCartItems([]);
    setTimeout(() => {
      window.location.href = '/profile/orderhistory';
    }, 2000);
  };

  return (
    <section className="container-fluid py-3 px-5 mt-5 pt-5" style={{ backgroundColor: '#eaf4f6', minHeight: '100vh' }}>
      <div className="row">
        {/* Cart Section */}
        <div className="col-lg-8 mb-4">
          <div className="bg-white p-4 shadow-sm" style={{ borderRadius: '20px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="fw-bold" style={{ color: '#4B929D' }}>Cart</h3>
              <span className="fw-semibold">{cartItems.length} Items</span>
            </div>
            <div className="table-responsive">
  <table className="table align-middle" style={{ tableLayout: 'fixed' }}>
    <colgroup>
      <col style={{ width: '30px' }} />   {/* Checkbox */}
      <col style={{ width: '18%' }} />   {/* Product */}
      <col style={{ width: '14%' }} />   {/* Product Type */}
      <col style={{ width: '14%' }} />   {/* Product Category */}
      <col style={{ width: '10%' }} />   {/* Quantity */}
      <col style={{ width: '10%' }} />   {/* Price */}
      <col style={{ width: '10%' }} />   {/* Total */}
      <col style={{ width: '10%' }} />   {/* Actions */}
    </colgroup>
    <thead>
      <tr style={{ color: '#4B929D', verticalAlign: 'middle' }}>
      <th style={{ textAlign: 'center' }}>
          <input
            type="checkbox"
            style={{ margin: 0 }}
            onChange={(e) => handleSelectAllChange(e.target.checked)}
            checked={selectedCartItems.length === cartItems.length && cartItems.length > 0}
          />
        </th>
        <th>Product</th>
        <th>Product Type</th>
        <th>Product Category</th>
        <th style={{ textAlign: 'center' }}>Qty</th>
        <th style={{ textAlign: 'right' }}>Price</th>
        <th style={{ textAlign: 'right' }}>Total</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {cartItems.map((item, i) => (
        <tr key={i}>
          <td style={{ textAlign: 'center' }}>
            <input
              type="checkbox"
              onChange={(e) => handleCheckboxChange(item, e.target.checked)}
              checked={selectedCartItems.some(ci => ci.product_id === item.product_id)}
            />
          </td>
          <td>
            <div className="d-flex align-items-center">
              <img
                src={item.ProductImage ? (item.ProductImage.startsWith('http') ? item.ProductImage : `http://localhost:8001${item.ProductImage}`) : "https://via.placeholder.com/60"}
                alt={item.ProductName}
                className="img-fluid me-2 rounded"
                style={{ height: '60px', width: '60px', objectFit: 'cover' }}
              />
              <div>
                <div className="fw-semibold">{item.ProductName}</div>
              </div>
            </div>
          </td>
          <td style={{ verticalAlign: 'middle' }}>{item.ProductType || '-'}</td>
          <td style={{ verticalAlign: 'middle' }}>{item.ProductCategory || '-'}</td>
          <td style={{ textAlign: 'center' }}>
            <div className="d-flex align-items-center justify-content-center">
              <button className="btn btn-sm rounded-circle" onClick={() => handleDecrement(i)}>-</button>
              <span className="mx-2">{item.quantity}</span>
              <button className="btn btn-sm rounded-circle" onClick={() => handleIncrement(i)}>+</button>
            </div>
          </td>
          <td style={{ textAlign: 'right' }}>₱{item.ProductPrice.toFixed(2)}</td>
          <td style={{ textAlign: 'right' }}>₱{calculateTotal(item).toFixed(2)}</td>
          <td style={{ textAlign: 'center' }}>
            <button className="btn btn-link text-danger p-0" onClick={() => handleRemove(i)}>
              <i className="bi bi-trash" style={{ fontSize: '1.2rem' }}></i>
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

          </div>
        </div>


        {/* Pay Online Section */}
        <div className="col-lg-4">
          <div className="bg-white p-4 shadow-sm" style={{ borderRadius: '20px' }}>
            <h5 className="fw-bold mb-3 text-center">Order Details</h5>
            <div className="d-flex justify-content-center">
              <div className="btn-group-toggle btn-group-toggle-center" role="group" aria-label="Order Type Toggle">
                <button
                  type="button"
                  className={`${orderTypeMain === 'Pick Up' ? 'btn-active-custom' : ''}`}
                  style={{ minWidth: '120px', justifyContent: 'center', display: 'flex', alignItems: 'center' }}
                  onClick={() => setOrderTypeMain('Pick Up')}
                >
                  <i className="bi bi-bag-fill"></i>
                  Pick Up
                </button>
                <button
                  type="button"
                  className={`${orderTypeMain === 'Delivery' ? 'btn-active-custom' : ''}`}
                  style={{ minWidth: '120px', justifyContent: 'center', display: 'flex', alignItems: 'center' }}
                  onClick={() => setOrderTypeMain('Delivery')}
                >
                  <i className="bi bi-truck"></i>
                  Delivery
                </button>
              </div>
            </div>
            <div className="mt-4" style={{ backgroundColor: '#eaf4f6' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Product</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Quantity</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCartItems.map((item, i) => (
                    <tr key={i}>
                              {item.ProductName}
                      <td style={{ textAlign: 'center', padding: '8px' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right', padding: '8px' }}>₱{item.ProductPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="subtotal-row">
                    <td style={{ padding: '8px', fontWeight: 'bold', verticalAlign: 'middle' }}>Subtotal</td>
                    <td></td>
                    <td style={{ textAlign: 'right', padding: '8px', fontWeight: 'bold', verticalAlign: 'middle' }}>
                      ₱{selectedCartItems.reduce((acc, item) => acc + item.ProductPrice * item.quantity, 0).toFixed(2)}
                    </td>
                  </tr>
                  {orderTypeMain === 'Delivery' && (
                    <tr className="delivery-fee-row subtotal-row">
                      <td style={{ padding: '8px', fontWeight: 'bold', verticalAlign: 'middle' }}>Delivery Fee</td>
                      <td></td>
                      <td style={{ textAlign: 'right', padding: '8px', fontWeight: 'bold', verticalAlign: 'middle' }}>
                        ₱50.00
                      </td>
                    </tr>
                  )}
                  <tr className="total-row">
                    <td style={{ padding: '8px', fontWeight: 'bold', verticalAlign: 'middle' }}>Total</td>
                    <td></td>
                    <td style={{ textAlign: 'right', padding: '8px', fontWeight: 'bold', verticalAlign: 'middle' }}>
                    </td>
                  </tr>
                  <tr className="payment-method-row">
                    <td colSpan="3" style={{ padding: '8px', fontWeight: 'bold', verticalAlign: 'middle' }}>Payment Method</td>
                  </tr>
                  <tr>
                    <td colSpan="3" style={{ padding: '8px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <div className="btn-group-toggle mt-2" style={{ margin: '0 auto' }}>
                        <button
                          type="button"
                          className={`d-flex align-items-center justify-content-center ${paymentMethodMain === 'Cash' ? 'btn-active-custom' : ''}`}
                          style={{ minWidth: '120px' }}
                          onClick={() => setPaymentMethodMain('Cash')}
                        >
                          <i className="bi bi-cash-stack"></i>
                          Cash
                        </button>
                        <button
                          type="button"
                          className={`d-flex align-items-center justify-content-center ${paymentMethodMain === 'E-Wallet' ? 'btn-active-custom' : ''}`}
                          style={{ minWidth: '120px' }}
                          onClick={() => setPaymentMethodMain('E-Wallet')}
                        >
                          <i className="bi bi-wallet2"></i>
                          E-Wallet
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="3" style={{ padding: '8px', verticalAlign: 'middle' }}>
                      <div className="d-flex justify-content-center mt-3">
                        <button
                          type="button"
                          className="btn"
                          style={{ minWidth: '200px', backgroundColor: '#4B929D', color: 'white' }}
                          onClick={handleCheckoutClick}
                        >
                          <i className="bi bi-cart-check me-2"></i>
                          Checkout
                        </button>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} />
    </section>
  );
};

export default Cart;