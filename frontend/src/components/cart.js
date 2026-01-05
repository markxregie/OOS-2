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

// Store location coordinates
const STORE_LOCATION = {
  lat: 14.69990446244497,
  lng: 121.08334243448036
};

// Mapbox access token (shared)
const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

// Try to disable telemetry
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

// Modal component definition (Order Summary for Mobile)
const OrderDetailsModal = ({ show, onClose, cartItems, selectedCartItems, orderTypeMain, handleCheckoutClick, setOrderTypeMain, deliveryFee }) => {
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
            <div className="btn-group w-100" role="group" aria-label="Order Type Toggle">
              <button
                type="button"
                className={`btn ${orderTypeMain === 'Pick Up' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setOrderTypeMain('Pick Up')}
                style={{ borderRadius: '8px 0 0 8px' }}
              >
                <i className="bi bi-bag-fill me-2"></i> Pick Up
              </button>
              <button
                type="button"
                className={`btn ${orderTypeMain === 'Delivery' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setOrderTypeMain('Delivery')}
                style={{ borderRadius: '0 8px 8px 0' }}
              >
                <i className="bi bi-truck me-2"></i> Delivery
              </button>
            </div>
          </div>

          <div className="order-summary-mobile" style={{ maxHeight: '40vh', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <tbody>
                {selectedCartItems.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px 0' }}>
                      <div className="fw-semibold text-dark">{item.product_name}</div>
                      {item.addons && item.addons.length > 0 && (
                        <small className="text-muted d-block">
                          {item.addons.map(a => `+ ${a.addon_name || a.name}`).join(', ')}
                        </small>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px', color: '#666' }}>x{item.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '8px', fontWeight: '600' }}>₱{calculateTotal(item).toFixed(2)}</td>
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
            className="btn w-100 mt-4 py-2 fw-bold"
            style={{ backgroundColor: '#4B929D', color: 'white', borderRadius: '10px' }}
            onClick={handleCheckoutClick}
            disabled={selectedCartItems.length === 0}
          >
            Checkout Now
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
  const [userLocation, setUserLocation] = useState(null);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [deliverySettings, setDeliverySettings] = useState({});
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [updateTimeouts, setUpdateTimeouts] = useState({});

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token || cartItems.length === 0) return;

    const fetchMaxQuantities = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const results = {};

        // Fetch merchandise data
        const merchandiseResponse = await fetch('http://localhost:8002/merchandise/menu', {
          headers
        });

        if (!merchandiseResponse.ok) {
          throw new Error('Failed to fetch merchandise data');
        }

        const merchandiseData = await merchandiseResponse.json();

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
        toast.error('Error fetching product quantities');
      }
    };
    fetchMaxQuantities();
  }, [cartItems]);

  // Fetch delivery settings
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
        } else {
          console.error('Failed to fetch delivery settings');
        }
      } catch (error) {
        console.error('Error fetching delivery settings:', error);
      }
    };
    fetchDeliverySettings();
  }, []);


  const [selectedCartItems, setSelectedCartItems] = useState([]);
  const [receiptFile, setReceiptFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [paymentMethodMain, setPaymentMethodMain] = useState('E-Wallet');
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
      setSelectedCartItems(prev => prev.filter(ci => ci.cart_item_id !== item.cart_item_id));
    }
  };

  const handleSelectAllChange = (checked) => {
    if (checked) {
      setSelectedCartItems(cartItems);
    } else {
      setSelectedCartItems([]);
    }
  };

  const handleIncrement = async (item) => {
    const isMerchandise = item.product_type === "Merchandise";
    const maxQty = maxQuantities[item.product_id]?.maxQuantity ?? (isMerchandise ? 0 : 999);
    const status = maxQuantities[item.product_id]?.status;

    const isUnavailable = maxQty === 0 || status === "Not Available";
    if (isUnavailable) {
      toast.error("Item is unavailable.");
      return;
    }

    if (item.quantity + 1 > maxQty) {
      toast.error(`Max quantity is ${maxQty}`);
      return;
    }

    const newQuantity = item.quantity + 1;

    // Optimistic update - update selected items immediately
    setSelectedCartItems((prevSelected) =>
      prevSelected.map((selectedItem) =>
        selectedItem.cart_item_id === item.cart_item_id
          ? { ...selectedItem, quantity: newQuantity }
          : selectedItem
      )
    );

    // Debounce backend update - clear existing timeout and set new one
    if (updateTimeouts[item.cart_item_id]) {
      clearTimeout(updateTimeouts[item.cart_item_id]);
    }

    const timeoutId = setTimeout(() => {
      updateQuantity(item.cart_item_id, newQuantity).catch(err => {
        console.error("Failed to update quantity:", err);
        toast.error("Failed to update quantity");
      });
      setUpdateTimeouts(prev => {
        const newTimeouts = { ...prev };
        delete newTimeouts[item.cart_item_id];
        return newTimeouts;
      });
    }, 500); // Wait 500ms after last click

    setUpdateTimeouts(prev => ({ ...prev, [item.cart_item_id]: timeoutId }));
  };

  const handleDecrement = async (item) => {
    if (item.quantity > 1) {
      const newQuantity = item.quantity - 1;

      // Optimistic update - update selected items immediately
      setSelectedCartItems(prevSelected => {
        return prevSelected.map(selectedItem => {
          if (selectedItem.cart_item_id === item.cart_item_id) {
            return { ...selectedItem, quantity: newQuantity };
          }
          return selectedItem;
        });
      });

      // Debounce backend update - clear existing timeout and set new one
      if (updateTimeouts[item.cart_item_id]) {
        clearTimeout(updateTimeouts[item.cart_item_id]);
      }

      const timeoutId = setTimeout(() => {
        updateQuantity(item.cart_item_id, newQuantity).catch(err => {
          console.error("Failed to update quantity:", err);
          toast.error("Failed to update quantity");
        });
        setUpdateTimeouts(prev => {
          const newTimeouts = { ...prev };
          delete newTimeouts[item.cart_item_id];
          return newTimeouts;
        });
      }, 500); // Wait 500ms after last click

      setUpdateTimeouts(prev => ({ ...prev, [item.cart_item_id]: timeoutId }));
    }
  };

  const handleRemove = (index) => {
    const item = cartItems[index];
    removeFromCart(item.cart_item_id);
    setSelectedCartItems(prev => prev.filter(selectedItem => selectedItem.cart_item_id !== item.cart_item_id));
  };

  const calculateTotal = (item) => {
    const basePrice = item.price || 0;
    const addonsTotal = (item.addons || []).reduce((sum, ao) => sum + (ao.price || 0), 0);
    return (basePrice + addonsTotal) * item.quantity;
  };

  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; 
    return d;
  };

  // --- REVISED LOCATION ALERT WITH CLEAR COST BREAKDOWN ---
  const showLocationCheckAlert = () => {
    // 1. Calculate Subtotal first (from selected items)
    const itemsSubtotal = selectedCartItems.reduce((acc, item) => {
        const basePrice = item.price || 0;
        const addonsTotal = (item.addons || []).reduce((sum, addon) => sum + (addon.price || 0), 0);
        return acc + (basePrice + addonsTotal) * item.quantity;
    }, 0);

    Swal.fire({
      title: 'Verifying Location',
      // Customized styling for the container
      customClass: {
          popup: 'location-verify-modal',
          title: 'location-verify-title',
          content: 'location-verify-content',
          confirmButton: 'location-verify-confirm',
          cancelButton: 'location-verify-cancel'
      },
      html: `
        <div style="border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 15px;">
            <div id="map-container" style="height: 300px; width: 100%;"></div>
        </div>
        <div id="swal-map-msg" style="font-size: 1rem; color: #555;">
             <div class="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
             Locating you...
        </div>
      `,
      showConfirmButton: true, 
      showCancelButton: true,  
      confirmButtonText: 'Loading...', 
      cancelButtonText: 'Cancel',      
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            Swal.getConfirmButton().disabled = true;
            Swal.getCancelButton().disabled = true;

            const userLat = latitude;
            const userLng = longitude;

            const distance = getDistanceFromLatLonInKm(
              latitude,
              longitude,
              STORE_LOCATION.lat,
              STORE_LOCATION.lng
            );

            const maxRadiusKm = deliverySettings.MaxRadiusKm || 8.0;
            const isWithinRange = distance <= maxRadiusKm;

            // Calculate delivery fee
            let calculatedFee = 0;
            if (deliverySettings.BaseFee && deliverySettings.BaseDistanceKm && deliverySettings.ExtraFeePerKm) {
              calculatedFee = deliverySettings.BaseFee;
              if (distance > deliverySettings.BaseDistanceKm) {
                const extraDistance = distance - deliverySettings.BaseDistanceKm;
                calculatedFee += extraDistance * deliverySettings.ExtraFeePerKm;
              }
              if (deliverySettings.IsSurgePricingActive) {
                calculatedFee += deliverySettings.SurgeFlatFee || 20; 
              }
            } else {
              calculatedFee = 50; 
            }
            setDeliveryFee(calculatedFee);

            // Calculate Grand Total
            const grandTotal = itemsSubtotal + calculatedFee;

            Swal.getTitle().innerText = 'Location Verified';
            Swal.hideLoading(); 

            // Create Map (GeoJSON) logic remains the same...
            const createGeoJSONCircle = (center, radiusInMeters, points = 64) => { 
              const coords = [];
              const [cx, cy] = center;
              for (let i = 0; i < points; i++) {
                const theta = (i / points) * (2 * Math.PI);
                const dx = radiusInMeters * Math.cos(theta);
                const dy = radiusInMeters * Math.sin(theta);
                const lng = cx + (dx / (111320 * Math.cos(cy * (Math.PI / 180))));
                const lat = cy + (dy / 110540);
                coords.push([lng, lat]);
              }
              coords.push(coords[0]);
              return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } };
            };

            const maxRadiusMeters = (deliverySettings.MaxRadiusKm || 8.0) * 1000;
            const baseRadiusMeters = (deliverySettings.BaseDistanceKm || 3.0) * 1000;

            if (![STORE_LOCATION.lng, STORE_LOCATION.lat, userLng, userLat].every(v => Number.isFinite(v))) {
              const msgEl = document.getElementById('swal-map-msg');
              if (msgEl) msgEl.innerText = 'Could not determine coordinates. Please try again.';
              return;
            }

            if (!mapboxgl.accessToken) {
              const msgEl = document.getElementById('swal-map-msg');
              if (msgEl) msgEl.innerText = 'Map configuration error.';
              return;
            }

            let map; 
            try {
              map = new mapboxgl.Map({
                container: 'map-container', 
                style: 'mapbox://styles/mapbox/streets-v11',
                center: [STORE_LOCATION.lng, STORE_LOCATION.lat],
                zoom: 13
              });
              map.addControl(new mapboxgl.NavigationControl());
            } catch (mapInitError) {
              const msgEl = document.getElementById('swal-map-msg');
              if (msgEl) msgEl.innerText = 'Failed to initialize map.';
              return;
            }

            map.on('load', async () => {
              try {
                new mapboxgl.Marker({ color: 'red' }).setLngLat([STORE_LOCATION.lng, STORE_LOCATION.lat]).setPopup(new mapboxgl.Popup().setText('Store Location')).addTo(map);
                new mapboxgl.Marker({ color: 'blue' }).setLngLat([userLng, userLat]).setPopup(new mapboxgl.Popup().setText('Your Location')).addTo(map);

                // Base distance circle (green)
                const baseCircleFeature = createGeoJSONCircle([STORE_LOCATION.lng, STORE_LOCATION.lat], baseRadiusMeters);
                if (!map.getSource('base-radius')) {
                  map.addSource('base-radius', { type: 'geojson', data: baseCircleFeature });
                  map.addLayer({ id: 'base-radius-fill', type: 'fill', source: 'base-radius', paint: { 'fill-color': '#2ecc71', 'fill-opacity': 0.2 } });
                  map.addLayer({ id: 'base-radius-line', type: 'line', source: 'base-radius', paint: { 'line-color': '#27ae60', 'line-width': 2, 'line-dasharray': [2, 2] } });
                }

                // Max distance circle (red)
                const maxCircleFeature = createGeoJSONCircle([STORE_LOCATION.lng, STORE_LOCATION.lat], maxRadiusMeters);
                if (!map.getSource('max-radius')) {
                  map.addSource('max-radius', { type: 'geojson', data: maxCircleFeature });
                  map.addLayer({ id: 'max-radius-fill', type: 'fill', source: 'max-radius', paint: { 'fill-color': '#e74c3c', 'fill-opacity': 0.15 } });
                  map.addLayer({ id: 'max-radius-line', type: 'line', source: 'max-radius', paint: { 'line-color': '#c0392b', 'line-width': 2, 'line-dasharray': [4, 4] } });
                }

                const bounds = new mapboxgl.LngLatBounds();
                bounds.extend([STORE_LOCATION.lng, STORE_LOCATION.lat]);
                bounds.extend([userLng, userLat]);
                map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
                setTimeout(() => map.resize(), 200);

                const dirRes = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${STORE_LOCATION.lng},${STORE_LOCATION.lat};${userLng},${userLat}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`);
                if (dirRes.ok) {
                  const dirData = await dirRes.json();
                  if (dirData.routes && dirData.routes[0]) {
                    const route = dirData.routes[0].geometry;
                    if (map.getSource('route')) {
                      map.getSource('route').setData({ type: 'Feature', geometry: route });
                    } else {
                      map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: route } });
                      map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#3b82f6', 'line-width': 4 } });
                    }

                    const distanceKm = (dirData.routes[0].distance / 1000).toFixed(2);
                    const maxRadiusKm = deliverySettings.MaxRadiusKm || 8.0;
                    const exceedsMaxRadius = distance > maxRadiusKm;

                    // --- UPDATED HTML FOR CLARITY ---
                    const msgElWithWarning = document.getElementById('swal-map-msg');
                    if (msgElWithWarning) {
                      msgElWithWarning.innerHTML = `
                        <div style="text-align: left; background: #fff; padding: 10px 0;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.95rem;">
                                <span class="text-muted">Distance:</span>
                                <strong>${distanceKm} km</strong>
                            </div>
                            <hr style="margin: 5px 0; border-color: #eee;">
                            
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.95rem;">
                                <span class="text-muted">Order Subtotal:</span>
                                <span>₱${itemsSubtotal.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.95rem; color: #d35400;">
                                <span>+ Delivery Fee:</span>
                                <strong>₱${calculatedFee.toFixed(2)}</strong>
                            </div>
                            <hr style="margin: 5px 0; border-color: #ddd;">
                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 1.2rem;">
                                <strong>Total to Pay:</strong>
                                <strong style="color: #4B929D;">₱${grandTotal.toFixed(2)}</strong>
                            </div>
                        </div>
                        
                        ${exceedsMaxRadius ? `
                            <div class="alert alert-warning d-flex align-items-center mt-3 mb-0" role="alert" style="font-size: 0.85em; text-align: left; border-left: 4px solid #ffc107;">
                                <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
                                <div>
                                    <strong>Extended Range Warning</strong><br/>
                                    This delivery distance exceeds our maximum radius of ${maxRadiusKm}km radius. Food quality may be affected due to extended travel time.
                                </div>
                            </div>` : ''
                        }
                      `;
                    }
                    Swal.showValidationMessage('');
                    Swal.getActions().style.display = 'flex';

                    Swal.getConfirmButton().disabled = false;
                    Swal.getCancelButton().disabled = false;
                    Swal.getConfirmButton().innerText = 'Yes, Proceed to Checkout';
                    Swal.getConfirmButton().style.backgroundColor = '#4b929d';
                    Swal.getCancelButton().innerText = 'Cancel';
                    Swal.getCancelButton().style.backgroundColor = '#6c757d';

                    const confirmButton = Swal.getConfirmButton();
                    confirmButton.onclick = () => {
                      Swal.close();
                      navigate('/checkout', { state: { cartItems: selectedCartItems, orderType: orderTypeMain, paymentMethod: paymentMethodMain, deliveryFee: calculatedFee } });
                    };

                    const cancelButton = Swal.getCancelButton();
                    cancelButton.onclick = () => {
                      Swal.close();
                    };
                  }
                }
              } catch (err) {
                console.error('Mapbox render error', err);
              }
            });
          },
          (error) => {
            let title = 'Location Access Denied';
            let text = 'We need your location to check for delivery eligibility. Please allow location access and try again.';
            if (error.code === error.PERMISSION_DENIED) {
                title = 'Location Permission Blocked';
                text = `
                    <div class="text-start">
                        It looks like you've previously blocked location access for this site. 
                        <br/><br/> 
                        To proceed with delivery, please go to your browser's site settings and change the location permission to <strong>"Allow"</strong> or <strong>"Ask"</strong>.
                    </div>
                `;
            }
            Swal.fire({
                icon: 'error',
                title: title,
                html: text,
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
    const token = localStorage.getItem("authToken");
  
    if (orderTypeMain === 'Delivery') {
      if (!window.isSecureContext) {
        Swal.fire({
          icon: 'warning',
          title: 'Insecure Connection',
          html: "Location services require a secure (HTTPS) connection. Please access this site via <b>localhost</b> or a secure domain.",
        });
        return;
      }
      setShowOrderModal(false); // Close the summary modal
      setIsCheckingLocation(true); // Show the location verification modal
    } else {
      setShowOrderModal(false);
      navigate('/checkout', { state: { cartItems: selectedCartItems, orderType: orderTypeMain, paymentMethod: paymentMethodMain, deliveryFee: 0 } });
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
    const basePrice = item.price || 0;
    const addonsTotal = (item.addons || []).reduce((sum, addon) => sum + (addon.price || addon.Price || 0), 0);
    return acc + (basePrice + addonsTotal) * item.quantity;
  }, 0);
  const totalForButton = (subtotalForButton + (orderTypeMain === 'Delivery' ? deliveryFee : 0)).toFixed(2);

  return (
    <>
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
                          checked={selectedCartItems.some(ci => ci.cart_item_id === item.cart_item_id)}
                        />
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <img
                            src={getImageUrl(item.product_image)}
                            alt={item.product_name}
                            className="img-fluid me-2 rounded"
                            style={{ height: '60px', width: '60px', objectFit: 'cover' }}
                          />
                          <div>
                            <div className="fw-semibold">{item.product_name}</div>
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
                      <td style={{ verticalAlign: 'middle' }}>{item.product_type || '-'}</td>
                      <td style={{ verticalAlign: 'middle' }}>{item.product_category || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="quantity-control">
                          <button className="btn btn-sm rounded-circle" onClick={() => handleDecrement(item)}>-</button>
                          <span className="mx-2">{item.quantity}</span>
                          <button
                            className="btn btn-sm rounded-circle"
                            onClick={() => handleIncrement(item)}
                            disabled={
                              item.product_type === "Merchandise"
                                ? item.quantity >= (maxQuantities[item.product_id]?.maxQuantity ?? 0)
                                : item.quantity >= (maxQuantities[item.product_id]?.maxQuantity ?? 999)
                            }
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
                      <td style={{ textAlign: 'right' }}>
                        ₱{(item.price + (item.addons?.reduce((sum, a) => sum + (a.price || 0), 0) || 0)).toFixed(2)}
                      </td>
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
                      checked={selectedCartItems.some(ci => ci.cart_item_id === item.cart_item_id)}
                    />
                    <img
                      src={getImageUrl(item.product_image)}
                      alt={item.product_name}
                      className="img-fluid me-3 rounded"
                      style={{ height: '70px', width: '70px', objectFit: 'cover' }}
                    />
                    {/* Inner container for product details and price (aligned vertically with image) */}
                    <div className="flex-grow-1 product-details-mobile w-100">
                      <div className="fw-bold mb-1 product-name-mobile">{item.product_name}</div>
                      <div className="text-muted small mobile-detail-text">Type: {item.product_type || '-'} | Category: {item.product_category || '-'}</div>
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
                      <button className="btn btn-sm rounded-circle" onClick={() => handleDecrement(item)}>-</button>
                      <span className="mx-2">{item.quantity}</span>
                      <button
                        className="btn btn-sm rounded-circle"
                        onClick={() => handleIncrement(item)}
                        disabled={
                          item.product_type === "Merchandise"
                            ? item.quantity >= (maxQuantities[item.product_id]?.maxQuantity ?? 0)
                            : item.quantity >= (maxQuantities[item.product_id]?.maxQuantity ?? 999)
                        }
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
                        <div className="fw-semibold">{item.product_name}</div>
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
                      <td style={{ textAlign: 'right', padding: '8px' }}>₱{item.price.toFixed(2)}</td>
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
                        ₱{deliveryFee.toFixed(2)}
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
        setOrderTypeMain={setOrderTypeMain} 
        deliveryFee={deliveryFee} // Pass deliveryFee
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