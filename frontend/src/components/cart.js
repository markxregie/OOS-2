import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import qrImage from '../assets/qr.png';
import { Modal } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './cart.css';
import { CartContext } from '../contexts/CartContext';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Swal from 'sweetalert2';
import LocationVerifyModal from './LocationVerifyModal';
import { checkStoreStatus } from './storeUtils';

// Store location coordinates
const STORE_LOCATION = {
  lat: 14.69990446244497,
  lng: 121.08334243448036
};

// Mapbox access token
const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

try {
  if (typeof mapboxgl.setTelemetryEnabled === 'function') mapboxgl.setTelemetryEnabled(false);
} catch (err) {
  // ignore
}

const getImageUrl = (imagePath) => {
  if (!imagePath) return "https://via.placeholder.com/60";
  if (imagePath.startsWith("http")) return imagePath;
  return `http://localhost:8001${imagePath}`;
};

// --- Mobile Order Summary Modal ---
const OrderDetailsModal = ({ show, onClose, cartItems, selectedCartItems, orderTypeMain, handleCheckoutClick, setOrderTypeMain, deliveryFee, isStoreOpen }) => {
  const calculateTotal = (item) => {
    const basePrice = item.price || 0;
    const addonsTotal = (item.addons || []).reduce((sum, ao) => sum + (ao.price || ao.Price || 0), 0);
    return (basePrice + addonsTotal) * item.quantity;
  };

  const subtotal = selectedCartItems.reduce((acc, item) => {
    const basePrice = item.price || 0;
    const addonsTotal = (item.addons || []).reduce((sum, addon) => sum + (addon.price || addon.Price || 0), 0);
    return acc + (basePrice + addonsTotal) * item.quantity;
  }, 0);

  const finalTotal = subtotal + (orderTypeMain === 'Delivery' ? deliveryFee : 0);

  if (!show) return null;

  return (
    <div className="modal-custom-backdrop" onClick={onClose}>
      <div className="modal-custom-content" onClick={e => e.stopPropagation()}>
        <div className="d-flex justify-content-between align-items-center modal-header-custom p-3 border-bottom">
          <h5 className="fw-bold m-0 text-dark">Order Summary</h5>
          <button type="button" className="btn-close" onClick={onClose}></button>
        </div>
        
        <div className="p-3">
          <div className="d-flex justify-content-center mb-4">
            <div className="btn-group w-100 shadow-sm" role="group">
              <button
                type="button"
                className={`btn ${orderTypeMain === 'Pick Up' ? 'btn-primary' : 'btn-light'}`}
                onClick={() => setOrderTypeMain('Pick Up')}
                style={{ borderRadius: '8px 0 0 8px', border: '1px solid #dee2e6' }}
              >
                <i className="bi bi-bag-fill me-2"></i> Pick Up
              </button>
              <button
                type="button"
                className={`btn ${orderTypeMain === 'Delivery' ? 'btn-primary' : 'btn-light'}`}
                onClick={() => setOrderTypeMain('Delivery')}
                style={{ borderRadius: '0 8px 8px 0', border: '1px solid #dee2e6' }}
              >
                <i className="bi bi-truck me-2"></i> Delivery
              </button>
            </div>
          </div>

          <div className="order-summary-mobile custom-scrollbar" style={{ maxHeight: '40vh', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <tbody>
                {selectedCartItems.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px 0' }}>
                      <div className="fw-bold text-dark">{item.product_name}</div>
                      {item.addons && item.addons.length > 0 && (
                        <div className="small text-muted fst-italic mt-1">
                          {item.addons.map((a, idx) => (
                            <div key={idx}>+ {a.addon_name || a.name} (₱{a.price || a.Price})</div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px', color: '#666', verticalAlign: 'top' }}>x{item.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '8px', fontWeight: '600', verticalAlign: 'top' }}>₱{calculateTotal(item).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-top pt-3 mt-2">
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">Subtotal</span>
              <span className="fw-bold">₱{subtotal.toFixed(2)}</span>
            </div>
            {orderTypeMain === 'Delivery' && (
               <div className="d-flex justify-content-between mb-2 text-success">
                <span>Delivery Fee</span>
                <span>+ ₱{deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="d-flex justify-content-between mt-3 pt-2 border-top">
              <span className="h5 fw-bold text-dark">Total</span>
              <span className="h5 fw-bold" style={{ color: '#4B929D' }}>₱{finalTotal.toFixed(2)}</span>
            </div>
          </div>
          
          <button
            type="button"
            className="btn w-100 mt-4 py-3 fw-bold shadow-sm checkout-btn-hover"
            style={{ backgroundColor: '#4B929D', color: 'white', borderRadius: '12px', border: 'none' }}
            onClick={isStoreOpen ? handleCheckoutClick : null}
            disabled={selectedCartItems.length === 0 || !isStoreOpen}
          >
            {isStoreOpen ? 'Checkout Now' : 'Store Closed'}
          </button>
        </div>
      </div>
    </div>
  );
};


const Cart = () => {
  const navigate = useNavigate();
  const PRODUCTS_BASE_URL = "http://127.0.0.1:8001";
  const { cartItems, updateQuantity, removeFromCart, clearCart } = useContext(CartContext);

  const [maxQuantities, setMaxQuantities] = useState({});
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [deliverySettings, setDeliverySettings] = useState({});
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [updateTimeouts, setUpdateTimeouts] = useState({});
  const [localQuantities, setLocalQuantities] = useState({});
  const isStoreOpen = checkStoreStatus();

  const [selectedCartItems, setSelectedCartItems] = useState([]);
  const [receiptFile, setReceiptFile] = useState(null);
  const [paymentMethodMain, setPaymentMethodMain] = useState('E-Wallet');
  const [orderTypeMain, setOrderTypeMain] = useState('Pick Up');
  const [promos, setPromos] = useState([]); 

  // Fetch Delivery Settings
  useEffect(() => {
    const fetchDeliverySettings = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;
        const response = await fetch('http://localhost:7001/delivery/settings', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const settings = await response.json();
          setDeliverySettings(settings);
        }
      } catch (error) {
        console.error('Error fetching delivery settings:', error);
      }
    };
    fetchDeliverySettings();
  }, []);

  // Fetch promotions
  useEffect(() => {
    const fetchPromos = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch("http://localhost:7004/debug/promos", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setPromos(data.promos || []);
      }
    };

    fetchPromos();
  }, []);

  const getPromosForCartItem = (item) => {
    return promos.filter(promo => {
      if (promo.applicationType === "all_products") return true;

      if (
        promo.applicationType === "specific_products" &&
        promo.selectedProducts.includes(item.product_name)
      ) return true;

      if (
        promo.applicationType === "specific_categories" &&
        promo.selectedCategories.includes(item.product_category)
      ) return true;

      return false;
    });
  };

  // Fetch Max Quantities (RESTORED)
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token || cartItems.length === 0) return;

    const fetchMaxQuantities = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const results = {};
        const merchandiseResponse = await fetch('http://localhost:8002/merchandise/menu', { headers });
        let merchandiseData = [];
        if (merchandiseResponse.ok) {
           merchandiseData = await merchandiseResponse.json();
        }

        for (const item of cartItems) {
          if (!item.product_id) continue;
          if (item.product_type === "Merchandise") {
            const merchandise = merchandiseData.find(m => m.MerchandiseName === item.product_name);
            if (merchandise) {
              results[item.product_id] = {
                maxQuantity: merchandise.MerchandiseQuantity,
                status: merchandise.Status
              };
            }
          } else {
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
        }
        setMaxQuantities(results);
      } catch (error) {
        console.error('Error fetching quantities:', error);
      }
    };
    fetchMaxQuantities();
  }, [cartItems]);

  // Sync Local Quantities
  useEffect(() => {
    const quantities = {};
    cartItems.forEach(item => {
      quantities[item.cart_item_id] = item.quantity;
    });
    setLocalQuantities(quantities);
  }, [cartItems]);

  // Logic Helpers
  const getTotalProductQuantity = (productId, excludeCartItemId = null) => {
    return cartItems.reduce((total, item) => {
      if (item.product_id === productId && item.cart_item_id !== excludeCartItemId) {
        const qty = localQuantities[item.cart_item_id] ?? item.quantity;
        const parsedQty = typeof qty === 'string' ? parseInt(qty, 10) || 0 : qty;
        return total + parsedQty;
      }
      return total;
    }, 0);
  };

  const calculateTotal = (item) => {
    const basePrice = item.price || 0;
    const addonsTotal = (item.addons || []).reduce((sum, ao) => sum + (ao.price || 0), 0);
    return (basePrice + addonsTotal) * item.quantity;
  };

  const handleCheckboxChange = (item, checked) => {
    // Helper to ensure no duplicates when adding
    const addIfMissing = (list, it) => {
      if (!list.find(li => li.cart_item_id === it.cart_item_id)) return [...list, it];
      return list;
    };

    if (checked) {
      // Add the clicked item
      setSelectedCartItems(prev => {
        let next = addIfMissing(prev, item);

        // If this item has a cross-product BOGO promo, auto-select its partner(s)
        try {
          const promosForItem = getPromosForCartItem(item) || [];
          const bogo = promosForItem.find(p => p.promotionType === 'bogo' && p.applicationType === 'specific_products' && Array.isArray(p.selectedProducts) && p.selectedProducts.length > 1);
          if (bogo) {
            const partnerNames = bogo.selectedProducts.filter(n => n !== item.product_name);
            for (const name of partnerNames) {
              const partner = cartItems.find(ci => ci.product_name === name);
              if (partner) next = addIfMissing(next, partner);
            }
            // Show toast feedback when auto-selected
            toast.info('Partner item auto-selected to activate your BOGO deal!');
          }
        } catch (err) {
          console.error('Error auto-selecting BOGO partners', err);
        }

        return next;
      });
    } else {
      // Remove the clicked item
      setSelectedCartItems(prev => {
        let next = prev.filter(ci => ci.cart_item_id !== item.cart_item_id);

        // If this item has a cross-product BOGO promo, also remove its partner(s)
        try {
          const promosForItem = getPromosForCartItem(item) || [];
          const bogo = promosForItem.find(p => p.promotionType === 'bogo' && p.applicationType === 'specific_products' && Array.isArray(p.selectedProducts) && p.selectedProducts.length > 1);
          if (bogo) {
            const partnerNames = bogo.selectedProducts.filter(n => n !== item.product_name);
            for (const name of partnerNames) {
              const partner = cartItems.find(ci => ci.product_name === name);
              if (partner) next = next.filter(ci => ci.cart_item_id !== partner.cart_item_id);
            }
            toast.info('BOGO partner items deselected');
          }
        } catch (err) {
          console.error('Error auto-deselecting BOGO partners', err);
        }

        return next;
      });
    }
  };

  const handleSelectAllChange = (checked) => {
    if (checked) {
      setSelectedCartItems(cartItems);
    } else {
      setSelectedCartItems([]);
    }
  };

  // Handle Increment (RESTORED MAX CHECK)
  const handleIncrement = async (item) => {
    const isMerchandise = item.product_type === "Merchandise";
    const maxQty = maxQuantities[item.product_id]?.maxQuantity ?? (isMerchandise ? 0 : 999);
    const status = maxQuantities[item.product_id]?.status;

    if (maxQty === 0 || status === "Not Available") {
      toast.error("Item is unavailable.");
      return;
    }

    const totalInCart = getTotalProductQuantity(item.product_id, item.cart_item_id);
    const currentQty = localQuantities[item.cart_item_id] ?? item.quantity;
    const newTotal = totalInCart + currentQty + 1;

    if (newTotal > maxQty) {
      const remaining = maxQty - totalInCart - currentQty;
      if (remaining > 0) {
        toast.error(`Only ${remaining} available.`);
      } else {
        toast.error(`Maximum quantity reached.`);
      }
      return;
    }

    const newQuantity = item.quantity + 1;
    setSelectedCartItems((prev) => prev.map((s) => s.cart_item_id === item.cart_item_id ? { ...s, quantity: newQuantity } : s));

    if (updateTimeouts[item.cart_item_id]) clearTimeout(updateTimeouts[item.cart_item_id]);

    const timeoutId = setTimeout(() => {
      updateQuantity(item.cart_item_id, newQuantity).catch(err => console.error(err));
      setUpdateTimeouts(prev => {
        const newTimeouts = { ...prev };
        delete newTimeouts[item.cart_item_id];
        return newTimeouts;
      });
    }, 500);

    setUpdateTimeouts(prev => ({ ...prev, [item.cart_item_id]: timeoutId }));
  };

  const handleDecrement = async (item) => {
    if (item.quantity > 1) {
      const newQuantity = item.quantity - 1;
      setSelectedCartItems(prev => prev.map(s => s.cart_item_id === item.cart_item_id ? { ...s, quantity: newQuantity } : s));

      if (updateTimeouts[item.cart_item_id]) clearTimeout(updateTimeouts[item.cart_item_id]);

      const timeoutId = setTimeout(() => {
        updateQuantity(item.cart_item_id, newQuantity).catch(err => console.error(err));
        setUpdateTimeouts(prev => {
          const newTimeouts = { ...prev };
          delete newTimeouts[item.cart_item_id];
          return newTimeouts;
        });
      }, 500);

      setUpdateTimeouts(prev => ({ ...prev, [item.cart_item_id]: timeoutId }));
    }
  };

  const handleQuantityInput = (item, value) => {
    if (value === '') {
      setLocalQuantities(prev => ({ ...prev, [item.cart_item_id]: '' }));
      return;
    }
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;
    setLocalQuantities(prev => ({ ...prev, [item.cart_item_id]: value }));
  };

  const handleQuantityBlur = async (item) => {
    const value = localQuantities[item.cart_item_id];
    if (value === '' || parseInt(value, 10) < 1) {
      setLocalQuantities(prev => ({ ...prev, [item.cart_item_id]: 1 }));
      if (item.quantity !== 1) await updateQuantity(item.cart_item_id, 1);
      return;
    }
    const numValue = parseInt(value, 10);
    const isMerchandise = item.product_type === "Merchandise";
    const maxQty = maxQuantities[item.product_id]?.maxQuantity ?? (isMerchandise ? 0 : 999);
    
    const totalInCart = getTotalProductQuantity(item.product_id, item.cart_item_id);
    const newTotal = totalInCart + numValue;
    
    let finalQuantity = numValue;
    if (newTotal > maxQty) {
      const remaining = maxQty - totalInCart;
      finalQuantity = remaining > 0 ? remaining : item.quantity;
      toast.error(`Max quantity reached.`);
      setLocalQuantities(prev => ({ ...prev, [item.cart_item_id]: finalQuantity }));
    }

    if (finalQuantity !== item.quantity) {
      try {
        await updateQuantity(item.cart_item_id, finalQuantity);
      } catch (err) {
        setLocalQuantities(prev => ({ ...prev, [item.cart_item_id]: item.quantity }));
      }
    }
  };

  const handleQuantityKeyPress = (e, item) => {
    if (e.key === 'Enter') e.target.blur();
  };

  const handleRemove = (index) => {
    const item = cartItems[index];
    removeFromCart(item.cart_item_id);
    setSelectedCartItems(prev => prev.filter(s => s.cart_item_id !== item.cart_item_id));
  };

  const handleCheckoutClick = async (e) => {
    e.preventDefault();
    if (!checkStoreStatus()) {
      toast.error("Store is closed.");
      return;
    }
    if (selectedCartItems.length === 0) {
      toast.error("Please select items.");
      return;
    }
  
    if (orderTypeMain === 'Delivery') {
      if (!window.isSecureContext) {
        Swal.fire({
          icon: 'warning',
          title: 'Insecure Connection',
          html: "Location services require HTTPS.",
        });
        return;
      }
      setShowOrderModal(false);
      // FIXED: Removed manual overlay handling here to prevent stuck loading screen
      setIsCheckingLocation(true); 
    } else {
      setShowOrderModal(false);
      navigate('/checkout', { state: { cartItems: selectedCartItems, orderType: orderTypeMain, paymentMethod: paymentMethodMain, deliveryFee: 0 } });
    }
  };

  const subtotalForButton = selectedCartItems.reduce((acc, item) => {
    const basePrice = item.price || 0;
    const addonsTotal = (item.addons || []).reduce((sum, addon) => sum + (addon.price || addon.Price || 0), 0);
    return acc + (basePrice + addonsTotal) * item.quantity;
  }, 0);
  const totalForButton = (subtotalForButton + (orderTypeMain === 'Delivery' ? deliveryFee : 0)).toFixed(2);

  return (
    <>
    <section className="container-fluid py-4 px-2 px-md-5 mt-5" style={{ backgroundColor: '#f0f8fa', minHeight: '100vh' }}>
      
      {/* FIXED: Removed the stuck location-loader-overlay div here */}
      
      <div className="row g-4 pt-4">
        {/* Left: Cart Items */}
        <div className="col-lg-8 mb-4">
          <div className="bg-white p-4 shadow-sm border-0" style={{ borderRadius: '16px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
              <h3 className="fw-bold m-0" style={{ color: '#4B929D' }}>My Cart</h3>
              <span className="badge bg-light text-dark fs-6 px-3 py-2 rounded-pill border">{cartItems.length} Items</span>
            </div>

            {/* Desktop Table */}
            <div className="table-responsive d-none d-lg-block custom-scrollbar">
              <table className="table align-middle table-hover" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '40px' }} /> 
                  <col style={{ width: '30%' }} /> 
                  <col style={{ width: '15%' }} /> 
                  <col style={{ width: '15%' }} /> 
                  <col style={{ width: '15%' }} /> 
                  <col style={{ width: '10%' }} /> 
                  <col style={{ width: '10%' }} /> 
                  <col style={{ width: '5%' }} /> 
                </colgroup>
                <thead className="bg-light">
                  <tr style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                    <th style={{ textAlign: 'center', borderRadius: '10px 0 0 10px' }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        onChange={(e) => handleSelectAllChange(e.target.checked)}
                        checked={selectedCartItems.length === cartItems.length && cartItems.length > 0}
                      />
                    </th>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ borderRadius: '0 10px 10px 0' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item, i) => {
                    const itemPromos = getPromosForCartItem(item);
                    return (
                    <tr key={i} className="cart-row">
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          onChange={(e) => handleCheckboxChange(item, e.target.checked)}
                          checked={selectedCartItems.some(ci => ci.cart_item_id === item.cart_item_id)}
                        />
                      </td>
                      <td>
                        <div className="d-flex align-items-center py-2">
                          <img
                            src={getImageUrl(item.product_image)}
                            alt={item.product_name}
                            className="img-fluid me-3 rounded-3 shadow-sm"
                            style={{ height: '70px', width: '70px', objectFit: 'cover' }}
                          />
                          <div>
                            <div className="fw-bold text-dark mb-1">{item.product_name}</div>
                            {item.is_bogo_selected && (
                              <span className="badge bg-success mb-2" style={{ fontSize: '0.7rem' }}>
                                🎉 BOGO Activated
                              </span>
                            )}
                            {item.addons && item.addons.length > 0 && (
                              <ul className="cart-addons mb-0 ps-3 list-unstyled">
                                {item.addons.map((addon, idx) => (
                                  <li key={idx} className="small text-muted fst-italic">
                                    + {addon.addon_name || addon.AddOnName || addon.name} (₱{addon.price || addon.Price || 0})
                                  </li>
                                ))}
                              </ul>
                            )}
                            {itemPromos.length > 0 && (
                              <div className="cart-promo-preview mt-2">
                                <small className="promo-hint text-success fw-bold">
                                  🎉 {itemPromos.length} promo{itemPromos.length > 1 ? "s" : ""} available
                                </small>
                                <div className="promo-preview-badges mt-1">
                                  {itemPromos.map((promo, idx) => (
                                    <span key={idx} className="promo-badge-mini me-1">
                                      {promo.promotionType === "fixed" && `₱${promo.promotionValue} OFF`}
                                      {promo.promotionType === "percentage" && `${promo.promotionValue}% OFF`}
                                      {promo.promotionType === "bogo" && `BUY ${promo.buyQuantity} GET ${promo.getQuantity}`}
                                    </span>
                                  ))}
                                </div>
                                <small className="promo-note text-muted fst-italic">
                                  Best promo will be applied at checkout
                                </small>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-secondary">{item.product_type || '-'}</td>
                      <td className="text-secondary">{item.product_category || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {item.is_bogo_selected ? (
                          <div className="text-center">
                            <div className="fw-bold" style={{ color: '#28a745', fontSize: '1.1rem' }}>{item.quantity}</div>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>BOGO Fixed</small>
                          </div>
                        ) : (
                          <div className="quantity-control d-flex align-items-center justify-content-center bg-light rounded-pill p-1 border">
                            <button className="btn btn-sm btn-icon rounded-circle" onClick={() => handleDecrement(item)}><i className="bi bi-dash"></i></button>
                            <input
                              type="text"
                              className="quantity-input mx-1 bg-transparent border-0 text-center fw-bold"
                              value={localQuantities[item.cart_item_id] ?? item.quantity}
                              onChange={(e) => handleQuantityInput(item, e.target.value)}
                              onBlur={() => handleQuantityBlur(item)}
                              onKeyPress={(e) => handleQuantityKeyPress(e, item)}
                              style={{ width: '40px' }}
                            />
                            <button
                              className="btn btn-sm btn-icon rounded-circle"
                              onClick={() => handleIncrement(item)}
                              disabled={
                                item.product_type === "Merchandise"
                                  ? item.quantity >= (maxQuantities[item.product_id]?.maxQuantity ?? 0)
                                  : item.quantity >= (maxQuantities[item.product_id]?.maxQuantity ?? 999)
                              }
                            >
                              <i className="bi bi-plus"></i>
                            </button>
                          </div>
                        )}
                        {/* RESTORED MAX QUANTITY DISPLAY */}
                        {(() => {
                            const isMerchandise = item.MerchandiseQuantity !== undefined;
                            const maxQty = isMerchandise ? item.MerchandiseQuantity : (maxQuantities[item.product_id]?.maxQuantity ?? 999);
                            const isUnavailable = isMerchandise && (maxQty === 0 || item.Status === "Not Available");
                            const showMax = isMerchandise || (!isMerchandise && maxQty !== 999);
                            
                            if (showMax) {
                              const totalInCart = getTotalProductQuantity(item.product_id, item.cart_item_id);
                              const currentQty = localQuantities[item.cart_item_id] ?? item.quantity;
                              const remaining = maxQty - totalInCart - (typeof currentQty === 'string' ? parseInt(currentQty, 10) || 0 : currentQty);
                              
                              return (
                                <div className="max-info text-warning small mt-1">
                                  Max: {maxQty} {totalInCart > 0 && `(${remaining} left)`}
                                  {isUnavailable && <span className="text-danger ms-1"> (Unavailable)</span>}
                                </div>
                              );
                            }
                            return null;
                          })()}
                      </td>
                      <td style={{ textAlign: 'right' }} className="fw-semibold text-secondary">
                        ₱{(item.price + (item.addons?.reduce((sum, a) => sum + (a.price || 0), 0) || 0)).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }} className="fw-bold text-dark">₱{calculateTotal(item).toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="btn btn-link text-danger p-0 trash-icon-hover" onClick={() => handleRemove(i)}>
                          <i className="bi bi-trash3-fill" style={{ fontSize: '1.2rem' }}></i>
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cart List (Hidden on Desktop) */}
            <div className="d-lg-none">
              <div className="mb-3 d-flex align-items-center bg-light p-2 rounded">
                <input
                  type="checkbox"
                  className="form-check-input me-2"
                  onChange={(e) => handleSelectAllChange(e.target.checked)}
                  checked={selectedCartItems.length === cartItems.length && cartItems.length > 0}
                />
                <label className="form-check-label fw-bold text-secondary">Select All Items</label>
              </div>
              {cartItems.map((item, i) => {
                const itemPromos = getPromosForCartItem(item);
                return (
                <div key={i} className="card mb-3 p-3 cart-item-mobile shadow-sm border-0">
                  <div className="d-flex align-items-start flex-nowrap"> 
                    <input
                      type="checkbox"
                      className="form-check-input me-3 mt-1"
                      onChange={(e) => handleCheckboxChange(item, e.target.checked)}
                      checked={selectedCartItems.some(ci => ci.cart_item_id === item.cart_item_id)}
                    />
                    <img
                      src={getImageUrl(item.product_image)}
                      alt={item.product_name}
                      className="img-fluid me-3 rounded-3"
                      style={{ height: '80px', width: '80px', objectFit: 'cover' }}
                    />
                    <div className="flex-grow-1 product-details-mobile w-100">
                      <div className="d-flex justify-content-between align-items-start">
                         <div>
                           <div className="fw-bold mb-1 product-name-mobile text-dark">{item.product_name}</div>
                           {item.is_bogo_selected && (
                             <span className="badge bg-success" style={{ fontSize: '0.65rem' }}>
                               🎉 BOGO Activated
                             </span>
                           )}
                         </div>
                         <button className="btn btn-link text-danger p-0 remove-btn-mobile ms-2" onClick={() => handleRemove(i)}>
                            <i className="bi bi-trash3" style={{ fontSize: '1.1rem' }}></i>
                         </button>
                      </div>
                      
                      <div className="text-muted small mobile-detail-text mb-1">
                        {item.product_type} | {item.product_category}
                      </div>
                      
                      {item.addons && item.addons.length > 0 && (
                        <ul className="cart-addons mb-2 ps-0 list-unstyled">
                          {item.addons.map((addon, idx) => (
                            <li key={idx} className="mobile-addon-text small text-secondary">
                              + {addon.addon_name || addon.AddOnName || addon.name} (₱{addon.price || addon.Price || 0})
                            </li>
                          ))}
                        </ul>
                      )}
                      
                      {itemPromos.length > 0 && (
                        <div className="cart-promo-preview mb-2">
                          <small className="promo-hint text-success fw-bold" style={{ fontSize: '0.75rem' }}>
                            🎉 {itemPromos.length} promo{itemPromos.length > 1 ? "s" : ""} available
                          </small>
                          <div className="promo-preview-badges mt-1">
                            {itemPromos.map((promo, idx) => (
                              <span key={idx} className="promo-badge-mini me-1" style={{ fontSize: '0.7rem' }}>
                                {promo.promotionType === "fixed" && `₱${promo.promotionValue} OFF`}
                                {promo.promotionType === "percentage" && `${promo.promotionValue}% OFF`}
                                {promo.promotionType === "bogo" && `BUY ${promo.buyQuantity} GET ${promo.getQuantity}`}
                              </span>
                            ))}
                          </div>
                          <small className="promo-note text-muted fst-italic" style={{ fontSize: '0.65rem' }}>
                            Best promo will be applied at checkout
                          </small>
                        </div>
                      )}
                      
                      <div className="d-flex justify-content-between align-items-center mt-3">
                        {item.is_bogo_selected ? (
                          <div className="text-center">
                            <div className="fw-bold" style={{ color: '#28a745', fontSize: '1rem' }}>{item.quantity}</div>
                            <small className="text-muted" style={{ fontSize: '0.65rem' }}>BOGO Fixed</small>
                          </div>
                        ) : (
                          <div className="quantity-control d-flex align-items-center bg-light rounded-pill px-2 py-1 border">
                            <button className="btn btn-sm btn-icon p-0" onClick={() => handleDecrement(item)} style={{ width: '24px', height: '24px' }}>-</button>
                            <input
                              type="text"
                              className="quantity-input mx-1 bg-transparent border-0 text-center fw-bold"
                              value={localQuantities[item.cart_item_id] ?? item.quantity}
                              onChange={(e) => handleQuantityInput(item, e.target.value)}
                              onBlur={() => handleQuantityBlur(item)}
                              style={{ width: '30px', fontSize: '0.9rem' }}
                            />
                            <button 
                              className="btn btn-sm btn-icon p-0" 
                              onClick={() => handleIncrement(item)} 
                              style={{ width: '24px', height: '24px' }}
                              disabled={
                                item.product_type === "Merchandise"
                                  ? item.quantity >= (maxQuantities[item.product_id]?.maxQuantity ?? 0)
                                  : item.quantity >= (maxQuantities[item.product_id]?.maxQuantity ?? 999)
                              }
                            >
                              +
                            </button>
                          </div>
                        )}
                        <div className="text-end fw-bold total-price-mobile" style={{ color: '#4B929D', fontSize: '1.1rem' }}>
                          ₱{calculateTotal(item).toFixed(2)}
                        </div>
                      </div>
                      
                      {/* RESTORED MAX QUANTITY DISPLAY MOBILE */}
                      {(() => {
                          const isMerchandise = item.MerchandiseQuantity !== undefined;
                          const maxQty = isMerchandise ? item.MerchandiseQuantity : (maxQuantities[item.product_id]?.maxQuantity ?? 999);
                          const isUnavailable = isMerchandise && (maxQty === 0 || item.Status === "Not Available");
                          const showMax = isMerchandise || (!isMerchandise && maxQty !== 999);
                          
                          if (showMax) {
                            const totalInCart = getTotalProductQuantity(item.product_id, item.cart_item_id);
                            const currentQty = localQuantities[item.cart_item_id] ?? item.quantity;
                            const remaining = maxQty - totalInCart - (typeof currentQty === 'string' ? parseInt(currentQty, 10) || 0 : currentQty);
                            
                            return (
                              <div className="max-info text-warning small mt-1" style={{ fontSize: '0.75rem' }}>
                                Max: {maxQty} {totalInCart > 0 && `(${remaining} left)`}
                                {isUnavailable && <span className="text-danger ms-1"> (Unavailable)</span>}
                              </div>
                            );
                          }
                          return null;
                        })()}
                        
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Order Summary (Desktop) */}
        <div className="col-lg-4 d-none d-lg-block">
          <div className="bg-white p-4 shadow-sm border-0 sticky-top" style={{ borderRadius: '16px', top: '100px' }}>
            <h5 className="fw-bold mb-4 text-center text-dark">Order Summary</h5>
            
            <div className="d-flex justify-content-center mb-4">
              <div className="btn-group w-100 shadow-sm rounded-3 overflow-hidden" role="group">
                <button
                  type="button"
                  className={`btn py-2 ${orderTypeMain === 'Pick Up' ? 'btn-active-custom' : 'btn-light bg-white border'}`}
                  style={{ width: '50%' }}
                  onClick={() => setOrderTypeMain('Pick Up')}
                >
                  <i className="bi bi-bag-fill me-2"></i> Pick Up
                </button>
                <button
                  type="button"
                  className={`btn py-2 ${orderTypeMain === 'Delivery' ? 'btn-active-custom' : 'btn-light bg-white border'}`}
                  style={{ width: '50%' }}
                  onClick={() => setOrderTypeMain('Delivery')}
                >
                  <i className="bi bi-truck me-2"></i> Delivery
                </button>
              </div>
            </div>

            <div className="p-3 rounded-3 mb-4" style={{ backgroundColor: '#f8f9fa' }}>
              <div className="table-responsive" style={{maxHeight: '300px', overflowY: 'auto'}}>
                <table style={{ width: '100%' }}>
                  <tbody>
                    {selectedCartItems.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px 0' }}>
                          <div className="fw-bold text-dark">{item.product_name}</div>
                          {/* ADDONS DISPLAY IN DESKTOP SUMMARY */}
                          {item.addons && item.addons.length > 0 && (
                            <div className="small text-muted fst-italic mt-1">
                              {item.addons.map((a, idx) => (
                                <div key={idx}>+ {a.addon_name || a.name} (₱{a.price || a.Price})</div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'top', padding: '8px' }}>x{item.quantity}</td>
                        <td style={{ textAlign: 'right', verticalAlign: 'top', padding: '8px' }}>₱{calculateTotal(item).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <hr className="my-3" />
              <div className="d-flex justify-content-between mb-2">
                <span className="text-secondary">Subtotal</span>
                <span className="fw-bold">₱{subtotalForButton.toFixed(2)}</span>
              </div>
              {orderTypeMain === 'Delivery' && (
                <div className="d-flex justify-content-between mb-2 text-success">
                  <span>Delivery Fee</span>
                  <span>+ ₱{deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <hr className="my-2" />
              <div className="d-flex justify-content-between align-items-center">
                <span className="h5 fw-bold text-dark m-0">Total</span>
                <span className="h4 fw-bold m-0" style={{ color: '#4B929D' }}>₱{totalForButton}</span>
              </div>
            </div>

            <div className="mb-4">
               <label className="fw-bold text-secondary mb-2 d-block small text-uppercase ls-1">Payment Method</label>
               <div className="border rounded-3 p-3 bg-light d-flex align-items-center justify-content-center text-primary fw-bold" style={{ borderColor: '#4B929D', backgroundColor: '#eafcfd' }}>
                  <i className="bi bi-wallet2 me-2"></i> E-Wallet
               </div>
            </div>

            <button
              type="button"
              className="btn w-100 py-3 fw-bold shadow-sm checkout-btn-hover"
              style={{ backgroundColor: '#4B929D', color: 'white', borderRadius: '12px', border: 'none', fontSize: '1.1rem' }}
              onClick={isStoreOpen ? handleCheckoutClick : null}
              disabled={!isStoreOpen}
            >
              {isStoreOpen ? (
                <>Checkout <i className="bi bi-arrow-right ms-2"></i></>
              ) : (
                <>Store Closed <i className="bi bi-clock-history ms-2"></i></>
              )}
            </button>
          </div>
        </div>
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} />

      {/* Floating Button Mobile */}
      <div className="d-lg-none d-block floating-checkout-container">
        <button
          className="btn floating-checkout-button w-100 shadow-lg"
          onClick={() => setShowOrderModal(true)}
          disabled={selectedCartItems.length === 0}
        >
          <div className="d-flex justify-content-between align-items-center">
             <span>{selectedCartItems.length} Items</span>
             <span className="fw-bold">View Order • ₱{totalForButton}</span>
          </div>
        </button>
      </div>
      
      <OrderDetailsModal
        show={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        cartItems={cartItems}
        selectedCartItems={selectedCartItems}
        orderTypeMain={orderTypeMain}
        handleCheckoutClick={handleCheckoutClick}
        setOrderTypeMain={setOrderTypeMain} 
        deliveryFee={deliveryFee}
        isStoreOpen={isStoreOpen}
      />
    </section>
    
    {isCheckingLocation && (
      <LocationVerifyModal
        show={isCheckingLocation}
        onClose={() => setIsCheckingLocation(false)}
        deliverySettings={deliverySettings}
        selectedCartItems={selectedCartItems}
        orderTypeMain={orderTypeMain}
        paymentMethodMain={paymentMethodMain}
      />
    )}
    </>
  );
};

export default Cart;