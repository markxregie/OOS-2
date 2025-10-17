import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import qrImage from '../assets/qr.png';
import { Modal } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './cart.css';
import { CartContext } from '../contexts/CartContext';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import Swal from 'sweetalert2';
import 'leaflet/dist/leaflet.css';

// Modal component definition
const OrderDetailsModal = ({ show, onClose, cartItems, selectedCartItems, orderTypeMain, handleCheckoutClick, setOrderTypeMain }) => {
    // Helper to calculate total (copied from main component)
    const calculateTotal = (item) => {
        const basePrice = item.ProductPrice || 0;
        const addonsTotal = (item.addons || []).reduce((sum, ao) => sum + (ao.price || ao.Price || 0), 0);
        return (basePrice + addonsTotal) * item.quantity;
    };

    const subtotal = selectedCartItems.reduce((acc, item) => {
        const basePrice = item.ProductPrice || 0;
        const addonsTotal = (item.addons || []).reduce((sum, addon) => sum + (addon.price || addon.Price || 0), 0);
        return acc + (basePrice + addonsTotal) * item.quantity;
    }, 0);

    const deliveryFee = orderTypeMain === 'Delivery' ? 50 : 0;
    const finalTotal = subtotal + deliveryFee;

    if (!show) return null;

    return (
        <div className="modal-custom-backdrop" onClick={onClose}>
            <div className="modal-custom-content" onClick={e => e.stopPropagation()}>
                <div className="d-flex justify-content-between align-items-center modal-header-custom">
                    <h5 className="fw-bold m-0">Order Details ({selectedCartItems.length} items)</h5>
                    <button type="button" className="btn-close" onClick={onClose}></button>
                </div>
                
                <div className="p-3">
                    <div className="d-flex justify-content-center mb-3">
                        <div className="btn-group-toggle" role="group" aria-label="Order Type Toggle">
                            {/* BUTTONS ARE NOW CLICKABLE AND UPDATE STATE */}
                            <button
                                type="button"
                                className={`${orderTypeMain === 'Pick Up' ? 'btn-active-custom' : ''}`}
                                onClick={() => setOrderTypeMain('Pick Up')}
                            >
                                <i className="bi bi-bag-fill"></i> Pick Up
                            </button>
                            <button
                                type="button"
                                className={`${orderTypeMain === 'Delivery' ? 'btn-active-custom' : ''}`}
                                onClick={() => setOrderTypeMain('Delivery')}
                            >
                                <i className="bi bi-truck"></i> Delivery
                            </button>
                        </div>
                    </div>

                    <div className="order-summary-mobile">
                        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '8px' }}>Product</th>
                                    <th style={{ textAlign: 'center', padding: '8px' }}>Qty</th>
                                    <th style={{ textAlign: 'right', padding: '8px' }}>Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedCartItems.map((item, i) => (
                                    <tr key={i}>
                                        <td style={{ textAlign: 'left', padding: '8px', fontSize: '0.9rem' }}>
                                            <div className="fw-semibold">{item.ProductName}</div>
                                            {/* ADD-ONS INCLUDED */}
                                            {item.addons && item.addons.length > 0 && (
                                                <ul className="cart-addons mb-0 ps-3">
                                                    {item.addons.map((addon, idx) => (
                                                        <li key={idx} style={{ fontSize: "0.8em", color: addon.status === 'Unavailable' ? '#999' : '#666', fontStyle: addon.status === 'Unavailable' ? 'italic' : 'normal' }}>
                                                            + {addon.addon_name || addon.AddOnName || addon.name} (₱{addon.price || addon.Price || 0})
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '8px', fontSize: '0.9rem' }}>{item.quantity}</td>
                                        <td style={{ textAlign: 'right', padding: '8px', fontSize: '0.9rem' }}>₱{(item.ProductPrice || 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="subtotal-row">
                                    <td colSpan="2" style={{ padding: '8px', fontWeight: 'bold' }}>Subtotal</td>
                                    <td style={{ textAlign: 'right', padding: '8px', fontWeight: 'bold' }}>₱{subtotal.toFixed(2)}</td>
                                </tr>
                                {orderTypeMain === 'Delivery' && (
                                    <tr className="delivery-fee-row subtotal-row">
                                        <td colSpan="2" style={{ padding: '8px', fontWeight: 'bold' }}>Delivery Fee</td>
                                        <td style={{ textAlign: 'right', padding: '8px', fontWeight: 'bold' }}>₱{deliveryFee.toFixed(2)}</td>
                                    </tr>
                                )}
                                <tr className="total-row modal-total-row">
                                    <td colSpan="2" style={{ padding: '8px', fontWeight: 'bold' }}>Total</td>
                                    <td style={{ textAlign: 'right', padding: '8px', fontWeight: 'bold' }}>₱{finalTotal.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    
                    <div className="d-flex justify-content-center mt-4">
                        <button
                            type="button"
                            className="btn btn-block w-100"
                            style={{ backgroundColor: '#4B929D', color: 'white', padding: '10px' }}
                            onClick={handleCheckoutClick}
                            disabled={selectedCartItems.length === 0}
                        >
                            <i className="bi bi-cart-check me-2"></i>
                            Checkout (₱{finalTotal.toFixed(2)})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const Cart = () => {
  const navigate = useNavigate();

  const PRODUCTS_BASE_URL = "http://127.0.0.1:8001";

  const { cartItems, incrementQuantity, decrementQuantity, removeFromCart, setCartItems } = useContext(CartContext);

  const [maxQuantities, setMaxQuantities] = useState({});
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);

  // Store Location and Delivery Radius
  const STORE_LOCATION = [14.699660772061614, 121.08295563928553];
  const MAX_DELIVERY_RADIUS_KM = 3;

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token || cartItems.length === 0) return;

    const fetchMaxQuantities = async () => {
      const headers = { Authorization: `Bearer ${token}` };
      const results = {};

      for (const item of cartItems) {
        if (!item.product_id) continue;
        try {
          const res = await fetch(
            `${PRODUCTS_BASE_URL}/is_products/products/${item.product_id}/max-quantity`,
            { headers }
          );
          if (res.ok) {
            const data = await res.json();
            results[item.product_id] = data;
          }
        } catch (err) {
          console.error("Failed to fetch max quantity:", err);
        }
      }
      setMaxQuantities(results);
    };

    fetchMaxQuantities();
  }, [cartItems]);

  console.log("🧾 Current cartItems:", cartItems);

  const [selectedCartItems, setSelectedCartItems] = useState([]);
  
  // Existing state variables...
  const [receiptFile, setReceiptFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [paymentMethodMain, setPaymentMethodMain] = useState('E-Wallet');
  const [orderTypeMain, setOrderTypeMain] = useState('Pick Up'); // Mutable state for Order Type

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
      setSelectedCartItems(prev => prev.filter(ci => ci.cartItemId !== item.cartItemId));
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
    const item = cartItems[index];
    const maxQty = item.MerchandiseQuantity ?? maxQuantities[item.product_id]?.maxQuantity ?? 999;
    const isMerchandise = item.MerchandiseQuantity !== undefined;
    const isUnavailable = isMerchandise && (maxQty === 0 || item.Status === "Not Available");
    if (isUnavailable) {
      toast.error("Item is unavailable.");
      return;
    }
    if (item.quantity + 1 > maxQty) {
      toast.error(`Cannot add more. Max quantity is ${maxQty}.`);
      return;
    }
    incrementQuantity(item.cartItemId);

    setSelectedCartItems(prevSelected => {
      return prevSelected.map(selectedItem => {
        if (selectedItem.cartItemId === item.cartItemId) {
          return { ...selectedItem, quantity: selectedItem.quantity + 1 };
        }
        return selectedItem;
      });
    });
  };

  const handleDecrement = (index) => {
    const item = cartItems[index];
    decrementQuantity(item.cartItemId);

    setSelectedCartItems(prevSelected => {
      return prevSelected.map(selectedItem => {
        if (selectedItem.cartItemId === item.cartItemId && selectedItem.quantity > 1) {
          return { ...selectedItem, quantity: selectedItem.quantity - 1 };
        }
        return selectedItem;
      });
    });
  };

  const handleRemove = (index) => {
    const item = cartItems[index];
    removeFromCart(item.cartItemId);
    setSelectedCartItems(prev => prev.filter(selectedItem => selectedItem.cartItemId !== item.cartItemId));
  };

  const calculateTotal = (item) => {
    const basePrice = item.ProductPrice || 0;
    const addonsTotal = (item.addons || []).reduce((sum, ao) => sum + (ao.price || ao.Price || 0), 0);
    return (basePrice + addonsTotal) * item.quantity;
  };

  // Haversine formula to calculate distance between two lat/lng points
  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  const showLocationCheckAlert = () => {
    Swal.fire({
      title: 'Checking Delivery Location...',
      html: '<div id="map-container-placeholder" style="height: 400px; width: 100%;"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">Getting your location...</p></div>',
      showConfirmButton: false,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const userCoords = [latitude, longitude];
            
            const distance = getDistanceFromLatLonInKm(
              latitude,
              longitude,
              STORE_LOCATION[0],
              STORE_LOCATION[1]
            );

            const isWithinRange = distance <= MAX_DELIVERY_RADIUS_KM;

            // Update Swal content with the map
            Swal.update({
              title: isWithinRange ? 'Location Verified!' : 'Outside Delivery Range',
              html: `
                <div id="map-container" style="height: 400px; width: 100%;"></div>
                <p class="mt-2">${isWithinRange ? 'You are within our delivery area. Proceeding to checkout...' : `Sorry, your location is outside our ${MAX_DELIVERY_RADIUS_KM}km delivery radius.`}</p>
              `,
              showConfirmButton: !isWithinRange, // Show button only if out of range
              confirmButtonText: 'Close',
              confirmButtonColor: '#dc3545',
              showCancelButton: false,
              allowOutsideClick: !isWithinRange,
            });

            // Render the map
            const map = L.map('map-container').setView(userCoords, 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            L.marker(userCoords, { icon: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] }) }).addTo(map).bindPopup('Your Location').openPopup();
            L.marker(STORE_LOCATION, { icon: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] }) }).addTo(map).bindPopup('Store Location');
            L.circle(STORE_LOCATION, { radius: MAX_DELIVERY_RADIUS_KM * 1000, color: isWithinRange ? 'green' : 'red', fillColor: isWithinRange ? 'green' : 'red', fillOpacity: 0.2 }).addTo(map);

            if (isWithinRange) {
              setTimeout(() => {
                Swal.close();
                navigate('/checkout', {
                  state: {
                    cartItems: selectedCartItems,
                    orderType: orderTypeMain,
                    paymentMethod: paymentMethodMain
                  }
                });
              }, 3000); // Wait 3 seconds then proceed
            }
          },
          (error) => {
            let title = 'Location Access Denied';
            let text = 'We need your location to check for delivery eligibility. Please allow location access and try again.';

            // Check if the error is due to a persistent "denied" state
            if (error.code === error.PERMISSION_DENIED) {
                title = 'Location Permission Blocked';
                text = `
                    It looks like you've previously blocked location access for this site. 
                    <br/><br/> 
                    To proceed with delivery, please go to your browser's site settings and change the location permission to "Allow" or "Ask".
                `;
            }

            Swal.fire({
                icon: 'error',
                title: title,
                html: text, // Use html to render the line breaks
                confirmButtonColor: '#dc3545'
            });
          }
        );
      }
    });
  };


  const handleCheckoutClick = async (e) => {
    e.preventDefault();
    if (selectedCartItems.length === 0) {
      toast.error("Please select items to checkout.");
      return;
    }
  
    // This logic now applies to both mobile and desktop checkout flows
    if (orderTypeMain === 'Delivery') {
      if (!window.isSecureContext) {
        Swal.fire({
          icon: 'warning',
          title: 'Insecure Connection',
          html: "Location services require a secure (HTTPS) connection. Please access this site via <b>localhost</b> or a secure domain.",
        });
        return;
      }
      setShowOrderModal(false);
      showLocationCheckAlert();
    } else {
      // For Pick Up or other types, proceed directly
      setShowOrderModal(false);
      navigate('/checkout', { state: { cartItems: selectedCartItems, orderType: orderTypeMain, paymentMethod: paymentMethodMain } });
    }
  };
  
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

  const handleConfirmOrder = () => {
    toast.success('Order confirmed! Redirecting...');
    setSelectedCartItems([]);
    setTimeout(() => {
      window.location.href = '/profile/orderhistory';
    }, 2000);
  };

  // Calculate total for the floating button preview
  const subtotalForButton = selectedCartItems.reduce((acc, item) => {
    const basePrice = item.ProductPrice || 0;
    const addonsTotal = (item.addons || []).reduce((sum, addon) => sum + (addon.price || addon.Price || 0), 0);
    return acc + (basePrice + addonsTotal) * item.quantity;
  }, 0);
  const totalForButton = (subtotalForButton + (orderTypeMain === 'Delivery' ? 50 : 0)).toFixed(2);


  return (
    <section className="container-fluid py-3 px-2 px-md-5 mt-5 pt-5" style={{ backgroundColor: '#eaf4f6', minHeight: '100vh' }}>
      {isCheckingLocation && (
        <div className="location-loader-overlay">
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Checking your location for delivery...</p>
        </div>)}
      <div className="row">
        {/* Cart Section (Always visible) */}
        <div className="col-lg-8 mb-4">
          <div className="bg-white p-4 shadow-sm" style={{ borderRadius: '20px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="fw-bold" style={{ color: '#4B929D' }}>Cart</h3>
              <span className="fw-semibold">{cartItems.length} Items</span>
            </div>

            {/* Desktop/Large Screen Cart Table (d-none d-lg-block to hide on mobile) */}
            <div className="table-responsive d-none d-lg-block">
              <table className="table align-middle" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '30px' }} /> 
                  <col style={{ width: '18%' }} /> 
                  <col style={{ width: '14%' }} /> 
                  <col style={{ width: '14%' }} /> 
                  <col style={{ width: '10%' }} /> 
                  <col style={{ width: '10%' }} /> 
                  <col style={{ width: '10%' }} /> 
                  <col style={{ width: '10%' }} /> 
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
                          checked={selectedCartItems.some(ci => ci.cartItemId === item.cartItemId)}
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
                            {item.addons && item.addons.length > 0 && (
                              <ul className="cart-addons mb-0 ps-3">
                                {item.addons.map((addon, idx) => (
                                  <li key={idx} style={{ fontSize: "0.85em", color: addon.status === 'Unavailable' ? '#999' : '#666', fontStyle: addon.status === 'Unavailable' ? 'italic' : 'normal' }}>
                                    + {addon.addon_name || addon.AddOnName || addon.name} (₱{addon.price || addon.Price || 0})
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>{item.ProductType || '-'}</td>
                      <td style={{ verticalAlign: 'middle' }}>{item.ProductCategory || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="quantity-control">
                          <button className="btn btn-sm rounded-circle" onClick={() => handleDecrement(i)}>-</button>
                          <span className="mx-2">{item.quantity}</span>
                          <button
                            className="btn btn-sm rounded-circle"
                            onClick={() => handleIncrement(i)}
                            disabled={item.quantity >= (item.MerchandiseQuantity ?? maxQuantities[item.product_id]?.maxQuantity ?? 999) || (item.MerchandiseQuantity !== undefined && (item.MerchandiseQuantity === 0 || item.Status === "Not Available"))}
                          >
                            +
                          </button>
                          {(() => {
                            const isMerchandise = item.MerchandiseQuantity !== undefined;
                            const maxQty = isMerchandise ? item.MerchandiseQuantity : (maxQuantities[item.product_id]?.maxQuantity ?? 999);
                            const isUnavailable = isMerchandise && (maxQty === 0 || item.Status === "Not Available");
                            const showMax = isMerchandise || (!isMerchandise && maxQty !== 999);
                            if (showMax) {
                              return (
                                <div className="max-info text-warning small">
                                  Max: {maxQty}
                                  {isUnavailable && <span className="text-danger ms-1"> (Unavailable)</span>}
                                </div>
                              );
                            }
                            return null;
                          })()}
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

            {/* Mobile/Small Screen Cart List/Cards (d-lg-none to hide on desktop) */}
            <div className="d-lg-none">
              <div className="mb-3 d-flex align-items-center">
                <input
                  type="checkbox"
                  className="me-2"
                  onChange={(e) => handleSelectAllChange(e.target.checked)}
                  checked={selectedCartItems.length === cartItems.length && cartItems.length > 0}
                />
                <label className="form-check-label fw-semibold">Select All</label>
              </div>
              {cartItems.map((item, i) => (
                <div key={i} className="card mb-3 p-3 cart-item-mobile">
                  {/* Outer flex container for checkbox, image, and details/total */}
                  <div className="d-flex align-items-start flex-nowrap"> 
                    <input
                      type="checkbox"
                      className="me-3 mt-1"
                      onChange={(e) => handleCheckboxChange(item, e.target.checked)}
                      checked={selectedCartItems.some(ci => ci.cartItemId === item.cartItemId)}
                    />
                    <img
                      src={item.ProductImage ? (item.ProductImage.startsWith('http') ? item.ProductImage : `http://localhost:8001${item.ProductImage}`) : "https://via.placeholder.com/60"}
                      alt={item.ProductName}
                      className="img-fluid me-3 rounded"
                      style={{ height: '70px', width: '70px', objectFit: 'cover' }}
                    />
                    {/* Inner container for product details and price (aligned vertically with image) */}
                    <div className="flex-grow-1 product-details-mobile w-100">
                      <div className="fw-bold mb-1 product-name-mobile">{item.ProductName}</div>
                      <div className="text-muted small mobile-detail-text">Type: {item.ProductType || '-'} | Category: {item.ProductCategory || '-'}</div>
                      {item.addons && item.addons.length > 0 && (
                        <ul className="cart-addons mb-1 ps-3">
                          {item.addons.map((addon, idx) => (
                            <li key={idx} className="mobile-addon-text" style={{ color: addon.status === 'Unavailable' ? '#999' : '#666', fontStyle: addon.status === 'Unavailable' ? 'italic' : 'normal' }}>
                              + {addon.addon_name || addon.AddOnName || addon.name} (₱{addon.price || addon.Price || 0})
                            </li>
                          ))}
                        </ul>
                      )}
                      
                      {/* MOVED TOTAL PRICE HERE (Vertically aligned with image/details) */}
                      <div className="text-end fw-bold total-price-mobile mt-2">
                        <span className='total-label-mobile'>Total:</span>
                        <span className='total-value-mobile'>₱{calculateTotal(item).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* New row for Quantity Control and Actions */}
                  <div className="d-flex justify-content-end align-items-center pt-2 mt-2 cart-actions-row">
                    
                    {/* Quantity Control (Moved out of the main flex block) */}
                    <div className="quantity-control me-3">
                      <button className="btn btn-sm rounded-circle" onClick={() => handleDecrement(i)}>-</button>
                      <span className="mx-2">{item.quantity}</span>
                      <button
                        className="btn btn-sm rounded-circle"
                        onClick={() => handleIncrement(i)}
                        disabled={item.quantity >= (item.MerchandiseQuantity ?? maxQuantities[item.product_id]?.maxQuantity ?? 999) || (item.MerchandiseQuantity !== undefined && (item.MerchandiseQuantity === 0 || item.Status === "Not Available"))}
                      >
                        +
                      </button>
                      {/* Max Info */}
                      {(() => {
                        const isMerchandise = item.MerchandiseQuantity !== undefined;
                        const maxQty = isMerchandise ? item.MerchandiseQuantity : (maxQuantities[item.product_id]?.maxQuantity ?? 999);
                        const isUnavailable = isMerchandise && (maxQty === 0 || item.Status === "Not Available");
                        const showMax = isMerchandise || (!isMerchandise && maxQty !== 999);
                        if (showMax) {
                          return (
                            <div className="max-info text-warning small text-center">
                              Max: {maxQty}
                              {isUnavailable && <span className="text-danger ms-1"> (Unavailable)</span>}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    
                    {/* Trash Button (Action) */}
                    <button className="btn btn-link text-danger p-0 remove-btn-mobile" onClick={() => handleRemove(i)}>
                      <i className="bi bi-trash" style={{ fontSize: '1.2rem' }}></i>
                    </button>
                  </div>
                  
                </div>
              ))}
            </div>
          </div>
        </div>


        {/* Desktop Order Details Section (d-none d-lg-block) */}
        <div className="col-lg-4 d-none d-lg-block">
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
                      <td style={{ textAlign: 'left', padding: '8px' }}>
                        <div className="fw-semibold">{item.ProductName}</div>
                        {item.addons && item.addons.length > 0 && (
                          <ul className="cart-addons mb-0 ps-3">
                            {item.addons.map((addon, idx) => (
                              <li key={idx} style={{ fontSize: "0.8em", color: addon.status === 'Unavailable' ? '#999' : '#666', fontStyle: addon.status === 'Unavailable' ? 'italic' : 'normal' }}>
                                + {addon.addon_name || addon.AddOnName || addon.name} (₱{addon.price || addon.Price || 0})
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
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
                      ₱{subtotalForButton.toFixed(2)}
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
                      ₱{totalForButton}
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
                          className="d-flex align-items-center justify-content-center btn-active-custom"
                          style={{ minWidth: '120px' }}
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

      {/* FLOATING CHECKOUT BUTTON FOR MOBILE VIEW */}
      <div className="d-lg-none d-block floating-checkout-container">
        <button
          className="btn floating-checkout-button w-100"
          onClick={() => setShowOrderModal(true)}
          disabled={selectedCartItems.length === 0}
        >
          View Order Summary (₱{totalForButton})
        </button>
      </div>
      
      {/* ORDER DETAILS MODAL (MOBILE ONLY) */}
      <OrderDetailsModal
        show={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        cartItems={cartItems}
        selectedCartItems={selectedCartItems}
        orderTypeMain={orderTypeMain}
        handleCheckoutClick={handleCheckoutClick}
        setOrderTypeMain={setOrderTypeMain} // Passed the state setter
      />
    </section>
  );
};

export default Cart;