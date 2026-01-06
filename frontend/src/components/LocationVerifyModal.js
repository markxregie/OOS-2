import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Store location coordinates
const STORE_LOCATION = {
  lat: 14.69990446244497,
  lng: 121.08334243448036
};

// Mapbox access token
const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

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

const LocationVerifyModal = ({ show, onClose, deliverySettings, selectedCartItems, orderTypeMain, paymentMethodMain }) => {
    const navigate = useNavigate();
    
    // We use a ref to track if the modal is currently open to prevent duplicate firing
    const isSwalOpen = useRef(false);

    useEffect(() => {
        if (!show) {
            return;
        }
        
        if (isSwalOpen.current) return; // Prevent double fire
        isSwalOpen.current = true;

        // 1. Calculate Items Subtotal
        const itemsSubtotal = selectedCartItems.reduce((acc, item) => {
            const basePrice = item.price || 0;
            const addonsTotal = (item.addons || []).reduce((sum, addon) => sum + (addon.price || 0), 0);
            return acc + (basePrice + addonsTotal) * item.quantity;
        }, 0);

        Swal.fire({
            title: 'Verifying Location',
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
                // Map initialization helper
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

                const maxRadiusKm = deliverySettings.MaxRadiusKm || 8.0;
                const maxRadiusMeters = maxRadiusKm * 1000;
                const baseRadiusMeters = (deliverySettings.BaseDistanceKm || 3.0) * 1000;

                // Initialize map immediately for better UX
                if (!mapboxgl.accessToken) {
                    const msgEl = document.getElementById('swal-map-msg');
                    if (msgEl) msgEl.innerText = 'Map configuration error.';
                    Swal.hideLoading();
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
                    console.error('Map initialization error:', mapInitError);
                    const msgEl = document.getElementById('swal-map-msg');
                    if (msgEl) msgEl.innerText = 'Failed to initialize map.';
                    Swal.hideLoading();
                    return;
                }

                // Show map immediately with store location
                map.on('load', () => {
                    // Add store marker immediately
                    new mapboxgl.Marker({ color: 'red' })
                        .setLngLat([STORE_LOCATION.lng, STORE_LOCATION.lat])
                        .setPopup(new mapboxgl.Popup().setText('Store Location'))
                        .addTo(map);

                    // Add delivery radius circles
                    const baseCircleFeature = createGeoJSONCircle([STORE_LOCATION.lng, STORE_LOCATION.lat], baseRadiusMeters);
                    map.addSource('base-radius', { type: 'geojson', data: baseCircleFeature });
                    map.addLayer({ 
                        id: 'base-radius-fill', 
                        type: 'fill', 
                        source: 'base-radius', 
                        paint: { 'fill-color': '#2ecc71', 'fill-opacity': 0.2 } 
                    });
                    map.addLayer({ 
                        id: 'base-radius-line', 
                        type: 'line', 
                        source: 'base-radius', 
                        paint: { 'line-color': '#27ae60', 'line-width': 2, 'line-dasharray': [2, 2] } 
                    });

                    const maxCircleFeature = createGeoJSONCircle([STORE_LOCATION.lng, STORE_LOCATION.lat], maxRadiusMeters);
                    map.addSource('max-radius', { type: 'geojson', data: maxCircleFeature });
                    map.addLayer({ 
                        id: 'max-radius-fill', 
                        type: 'fill', 
                        source: 'max-radius', 
                        paint: { 'fill-color': '#e74c3c', 'fill-opacity': 0.15 } 
                    });
                    map.addLayer({ 
                        id: 'max-radius-line', 
                        type: 'line', 
                        source: 'max-radius', 
                        paint: { 'line-color': '#c0392b', 'line-width': 2, 'line-dasharray': [4, 4] } 
                    });

                    // Ensure map renders properly
                    setTimeout(() => map.resize(), 100);
                });

                // Now request user location in parallel with optimized settings
                Swal.showLoading();
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        
                        // Safety Check: If modal closed while getting location
                        if (!Swal.isVisible()) return;

                        const userLat = latitude;
                        const userLng = longitude;

                        const distance = getDistanceFromLatLonInKm(latitude, longitude, STORE_LOCATION.lat, STORE_LOCATION.lng);

                        // Calculate Fee
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

                        const grandTotal = itemsSubtotal + calculatedFee;

                        // Update UI
                        Swal.getTitle().innerText = 'Location Verified';
                        Swal.hideLoading();

                        // Wait for map to be ready, then add user location
                        const addUserLocationToMap = async () => {
                            try {
                                // Add user marker
                                new mapboxgl.Marker({ color: 'blue' })
                                    .setLngLat([userLng, userLat])
                                    .setPopup(new mapboxgl.Popup().setText('Your Location'))
                                    .addTo(map);

                                // Fit bounds to show both locations
                                const bounds = new mapboxgl.LngLatBounds();
                                bounds.extend([STORE_LOCATION.lng, STORE_LOCATION.lat]);
                                bounds.extend([userLng, userLat]);
                                map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 1000 });

                                // Fetch and display route
                                const dirRes = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${STORE_LOCATION.lng},${STORE_LOCATION.lat};${userLng},${userLat}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`);
                                if (dirRes.ok) {
                                    const dirData = await dirRes.json();
                                    if (dirData.routes && dirData.routes[0]) {
                                        const route = dirData.routes[0].geometry;
                                        
                                        if (map.getSource('route')) {
                                            map.getSource('route').setData({ type: 'Feature', geometry: route });
                                        } else {
                                            map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: route } });
                                            map.addLayer({ 
                                                id: 'route-line', 
                                                type: 'line', 
                                                source: 'route', 
                                                layout: { 'line-cap': 'round', 'line-join': 'round' }, 
                                                paint: { 'line-color': '#3b82f6', 'line-width': 4 } 
                                            });
                                        }

                                        const distanceKm = (dirData.routes[0].distance / 1000).toFixed(2);
                                        const exceedsMaxRadius = distance > maxRadiusKm;

                                        // Update Content with Financial Breakdown
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
                                                            This distance exceeds our optimal ${maxRadiusKm}km radius. Food quality may vary.
                                                        </div>
                                                    </div>` : ''
                                                }
                                            `;
                                        }

                                        Swal.showValidationMessage('');
                                        Swal.getActions().style.display = 'flex';
                                        
                                        // Update Buttons
                                        Swal.getConfirmButton().disabled = false;
                                        Swal.getCancelButton().disabled = false;
                                        Swal.getConfirmButton().innerText = 'Yes, Proceed to Checkout';
                                        Swal.getConfirmButton().style.backgroundColor = '#4b929d';
                                        Swal.getCancelButton().innerText = 'Cancel';
                                        Swal.getCancelButton().style.backgroundColor = '#6c757d';

                                        // Attach handlers
                                        const confirmButton = Swal.getConfirmButton();
                                        confirmButton.onclick = () => {
                                            isSwalOpen.current = false;
                                            Swal.close();
                                            navigate('/checkout', { state: { cartItems: selectedCartItems, orderType: orderTypeMain, paymentMethod: paymentMethodMain, deliveryFee: calculatedFee } });
                                        };

                                        const cancelButton = Swal.getCancelButton();
                                        cancelButton.onclick = () => {
                                            isSwalOpen.current = false;
                                            Swal.close();
                                            onClose();
                                        };
                                    }
                                }
                            } catch (err) {
                                console.error('Error adding user location to map:', err);
                            }
                        };

                        // Execute after map is loaded
                        if (map.loaded()) {
                            addUserLocationToMap();
                        } else {
                            map.once('load', addUserLocationToMap);
                        }
                    },
                    (error) => {
                        // Error Handling
                        console.error('Geolocation error:', error);
                        isSwalOpen.current = false; // Reset flag
                        let title = 'Location Access Issue';
                        let text = 'We need your location to check for delivery eligibility.';
                        
                        if (error.code === 1) { // PERMISSION_DENIED
                            title = 'Location Permission Required';
                            text = `
                                <div class="text-start">
                                    <p>Please allow location access to continue with delivery.</p>
                                    <p class="mt-2"><strong>Steps:</strong></p>
                                    <ol class="text-start ps-3">
                                        <li>Click the location icon <i class="bi bi-geo-alt-fill"></i> in your browser's address bar</li>
                                        <li>Select "Allow" for location access</li>
                                        <li>Refresh the page and try again</li>
                                    </ol>
                                </div>
                            `;
                        } else if (error.code === 2) { // POSITION_UNAVAILABLE
                            title = 'Location Unavailable';
                            text = `
                                <div class="text-start">
                                    <p>Unable to determine your location. This may be due to:</p>
                                    <ul class="text-start ps-3">
                                        <li>GPS/Location services are turned off</li>
                                        <li>Poor GPS signal</li>
                                        <li>Browser location services disabled</li>
                                    </ul>
                                    <p class="mt-2">Please enable location services and try again.</p>
                                </div>
                            `;
                        } else if (error.code === 3) { // TIMEOUT
                            title = 'Location Request Timeout';
                            text = `
                                <div class="text-start">
                                    <p>Location request took too long. Please try again.</p>
                                    <p class="mt-2">Make sure your device's location services are enabled.</p>
                                </div>
                            `;
                        }
                        
                        onClose(); // Close the "loading" modal wrapper
                        Swal.fire({ 
                            icon: 'error', 
                            title: title, 
                            html: text, 
                            confirmButtonColor: '#dc3545',
                            confirmButtonText: 'OK'
                        });
                    },
                    { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
                );
            }
        }).then((result) => {
            // Handle dismissal (clicking outside)
            if (result.isDismissed) {
                isSwalOpen.current = false;
                onClose();
            }
        });

    }, [show, deliverySettings, selectedCartItems, orderTypeMain, paymentMethodMain, navigate, onClose]);

    return null; // This component strictly handles the Swal logic, no JSX to render
};

export default LocationVerifyModal;