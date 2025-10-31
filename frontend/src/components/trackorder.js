import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { ArrowLeft, Shop, HouseDoorFill, CheckCircleFill, XCircleFill, ArrowRightCircleFill } from 'react-bootstrap-icons';
import Swal from 'sweetalert2';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './TrackOrder.css';

// Mapbox GL will be used for map rendering in this file.

// Mapbox access token
const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
try { if (typeof mapboxgl.setTelemetryEnabled === 'function') mapboxgl.setTelemetryEnabled(false); } catch (e) { /* ignore */ }

const trackMapRef = { map: null, containerId: 'trackorder-map' };
// Persistent refs for markers and route state to avoid re-creating map repeatedly
const storeMarkerRef = { marker: null };
const custMarkerRef = { marker: null };
const riderMarkerRef = { marker: null };
const routeStateRef = { fitted: false, styleHandler: null };

// Caches and dedupe maps for directions
const directionsCache = new Map();
const pendingDirections = new Map();

async function fetchDirectionsCached(fromLng, fromLat, toLng, toLat) {
    const key = `${fromLng},${fromLat}:${toLng},${toLat}`;
    if (directionsCache.has(key)) return directionsCache.get(key);
    if (pendingDirections.has(key)) return pendingDirections.get(key);

    const p = (async () => {
        try {
            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`;
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
            if (data && data.routes && data.routes[0]) {
                const route = data.routes[0];
                directionsCache.set(key, route);
                return route;
            }
            return null;
        } catch (err) {
            console.error('fetchDirectionsCached error', err);
            return null;
        } finally {
            pendingDirections.delete(key);
        }
    })();

    pendingDirections.set(key, p);
    return p;
}

// Try a few likely backend endpoints to get a rider's current location (returns [lat,lng] or null)
async function fetchRiderLocationFromBackend(riderId) {
    if (!riderId) return null;
    const tries = [
        `http://localhost:7004/delivery/rider/${riderId}`,
        `http://localhost:7004/delivery/rider/${riderId}/location`,
        `http://localhost:7004/riders/${riderId}`,
        `http://localhost:4000/users/riders/${riderId}`
    ];

    for (const url of tries) {
        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();
            if (!data) continue;
            // Look for lat/lng in several common shapes
            const lat = data.lat || data.latitude || data.Lat || (data.location && (data.location.lat || data.location.latitude));
            const lng = data.lng || data.longitude || data.Lng || (data.location && (data.location.lng || data.location.longitude));
            if (lat && lng && Number.isFinite(parseFloat(lat)) && Number.isFinite(parseFloat(lng))) {
                return [parseFloat(lat), parseFloat(lng)];
            }
            // Some endpoints return nested rider object
            if (data.rider && (data.rider.lat || data.rider.lng)) {
                const rlat = data.rider.lat || data.rider.latitude;
                const rlng = data.rider.lng || data.rider.longitude;
                if (rlat && rlng && Number.isFinite(parseFloat(rlat)) && Number.isFinite(parseFloat(rlng))) {
                    return [parseFloat(rlat), parseFloat(rlng)];
                }
            }
        } catch (e) {
            // ignore and try next
        }
    }
    return null;
}

const TrackOrder = () => {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState(null); // customer's browser location
    const [riderLocationState, setRiderLocationState] = useState(null); // latest rider location from backend
    const mapContainerRef = useRef(null);
    const [riderIdState, setRiderIdState] = useState(null);
    const [riderLastUpdated, setRiderLastUpdated] = useState(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    // Helper to create small colored marker elements
    const makeMarkerEl = (color, label) => {
        const el = document.createElement('div');
        el.style.width = '18px';
        el.style.height = '18px';
        el.style.background = color;
        el.style.border = '2px solid white';
        el.style.borderRadius = '50%';
        el.style.boxShadow = '0 0 2px rgba(0,0,0,0.5)';
        el.title = label;
        return el;
    };

    const orderStatusSteps = ['pending', 'processing', 'waiting for pickup', 'picked up', 'delivering', 'completed'];
    const pickupStatusSteps = ['pending', 'processing', 'waiting for pickup', 'picked up', 'completed'];

    useEffect(() => {
        const fetchOrderDetails = async () => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                Swal.fire('Error', 'You must be logged in to view order details.', 'error');
                setLoading(false);
                return;
            }

            try {
                // This endpoint should fetch a single order by its ID.
                // Using the trackorder_service on port 7008.
                const response = await fetch(`http://localhost:7008/trackorder/${orderId}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch order details.');
                }

                const data = await response.json();

                // The API might return an array with one item or the object directly
                const orderData = Array.isArray(data) ? data[0] : data;

                if (!orderData) {
                    throw new Error('Order not found.');
                }

                const total = orderData.products.reduce((sum, p) => {
                    const addonSum = p.addons ? p.addons.reduce((s, a) => s + (a.price || a.Price || 0), 0) : 0;
                    return sum + (p.price + addonSum) * p.quantity;
                }, 0) + (orderData.orderType === 'Delivery' ? 50 : 0);

                // Normalize status for consistency
                const originalStatus = orderData.status.toLowerCase();
                const status = originalStatus === 'delivered' ? 'completed' : originalStatus === 'preparing' ? 'processing' : originalStatus === 'waiting for pick up' ? 'waiting for pickup' : originalStatus === 'pickedup' ? 'picked up' : originalStatus;

                // Try to extract rider location from common field names if present
                let riderLoc = null;
                try {
                    if (orderData.rider_lat && orderData.rider_lng) {
                        riderLoc = [parseFloat(orderData.rider_lat), parseFloat(orderData.rider_lng)];
                    } else if (orderData.riderLocation && orderData.riderLocation.lat && orderData.riderLocation.lng) {
                        riderLoc = [parseFloat(orderData.riderLocation.lat), parseFloat(orderData.riderLocation.lng)];
                    } else if (orderData.rider && orderData.rider.lat && orderData.rider.lng) {
                        riderLoc = [parseFloat(orderData.rider.lat), parseFloat(orderData.rider.lng)];
                    } else if (orderData.driver_lat && orderData.driver_lng) {
                        riderLoc = [parseFloat(orderData.driver_lat), parseFloat(orderData.driver_lng)];
                    }
                } catch (e) {
                    riderLoc = null;
                }

                let detectedRiderId = orderData.rider_id || orderData.riderId || (orderData.rider && orderData.rider.id) || orderData.driver_id || orderData.driverId || null;
                if (detectedRiderId) setRiderIdState(detectedRiderId);

                if (riderLoc && riderLoc.every(v => Number.isFinite(v))) {
                    setRiderLocationState(riderLoc);
                    setRiderLastUpdated(Date.now());
                } else {
                    // try to fetch rider location from backend if there's an assigned rider id
                    try {
                        const riderId = detectedRiderId;
                        if (riderId) {
                            const fetched = await fetchRiderLocationFromBackend(riderId);
                            if (fetched) {
                                setRiderLocationState(fetched);
                                setRiderLastUpdated(Date.now());
                            }
                        }
                    } catch (e) {
                        // ignore
                    }
                }

                setOrder({
                    ...orderData,
                    status,
                    total
                });
            } catch (error) {
                console.error('Error fetching order details:', error);
                // Avoid showing a popup on every interval failure
                if (loading) {
                    Swal.fire('Error', error.message, 'error');
                }
            } finally {
                // Use a functional update to avoid depending on the `loading` state
                setLoading(currentLoading => (currentLoading ? false : currentLoading));
            }
        };

        fetchOrderDetails();
        const interval = setInterval(fetchOrderDetails, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval); // Cleanup interval on component unmount
    }, [orderId, loading]);

    // Poll rider location from backend if we have a riderId
    useEffect(() => {
        let interval = null;
        const startPolling = async () => {
            if (!riderIdState) return;
            try {
                const fetched = await fetchRiderLocationFromBackend(riderIdState);
                if (fetched) {
                    setRiderLocationState(fetched);
                    setRiderLastUpdated(Date.now());
                }
            } catch (e) { /* ignore */ }
        };
        if (riderIdState) {
            // initial fetch
            startPolling();
            interval = setInterval(startPolling, 5000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [riderIdState]);

    // Initialize the map once when order is loaded and conditions are met
    useEffect(() => {
        try {
            if (trackMapRef.map) return;
            if (!order || order.orderType !== 'Delivery' || !['pending', 'processing', 'picked up', 'delivering', 'waiting for pickup'].includes(order.status)) return;
            if (!mapContainerRef || !mapContainerRef.current) {
                console.warn('trackorder: map container not available yet');
                return; // wait until DOM element exists
            }

            // Center on user's location if available, otherwise a default.
            const center = userLocation
                ? [userLocation[1], userLocation[0]]
                : [121.0, 14.6]; // Default center (e.g., Metro Manila)

            // Create the map. Use element container (safer than id string here).
            const map = new mapboxgl.Map({
                container: mapContainerRef.current,
                style: 'mapbox://styles/mapbox/streets-v11',
                center,
                zoom: 12
            });
            trackMapRef.map = map;
            map.addControl(new mapboxgl.NavigationControl());

            // ensure correct sizing once idle
            map.once('idle', () => { try { map.resize(); } catch (e) {} });

            // Debug / resilience handlers to help with white/blank map issues
            try {
                map.on('load', () => {
                    console.debug('trackorder: map load event fired, style is', map.getStyle && map.getStyle().name);
                    try { map.resize(); } catch (e) {}
                    setMapLoaded(true);
                });

                map.on('styledata', () => {
                    console.debug('trackorder: styledata event');
                });

                map.on('error', (e) => {
                    console.error('trackorder: map error event', e.error || e);
                    // Try a simple style reload once if style failed to load
                    try {
                        if (e && e.error && /style/i.test(String(e.error.message || ''))) {
                            // attempt to reset style after short delay
                            setTimeout(() => {
                                try { map.setStyle('mapbox://styles/mapbox/streets-v11'); } catch (er) { console.warn('style reload failed', er); }
                            }, 1000);
                        }
                    } catch (er) { /* ignore */ }
                });
            } catch (e) { console.warn('trackorder: could not attach map event handlers', e); }

            // ask for customer's browser location to center/map pin (non-blocking)
            try {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
                    }, (err) => {
                        // user denied or error — we'll fallback to order delivery location
                    }, { maximumAge: 60000, timeout: 5000 });
                }
            } catch (e) { }

            return () => {
                try {
                    if (routeStateRef.styleHandler && trackMapRef.map) trackMapRef.map.off('styledata', routeStateRef.styleHandler);
                } catch (e) { }
            };
        } catch (err) {
            console.error('Track map init error:', err);
        }
    }, [order]);

    // Center map on user's location when available
    useEffect(() => {
        if (trackMapRef.map && userLocation && userLocation.every(v => Number.isFinite(v))) {
            try {
                trackMapRef.map.setCenter([userLocation[1], userLocation[0]]);
                trackMapRef.map.setZoom(15); // Zoom in for better pinpointing
            } catch (e) {
                console.warn('Failed to center map on user location:', e);
            }
        }
    }, [userLocation]);

    // Update markers and route whenever `order`, `riderLocationState`, or `userLocation` change
    useEffect(() => {
        const updateRouteAndMarkers = async () => {
            try {
                if (!order || order.orderType !== 'Delivery' || !mapLoaded) return;
                const map = trackMapRef.map;
                if (!map) return;

                // Ensure the map is resized, in case it was initialized while the container was hidden.
                try {
                    map.resize();
                } catch (e) { /* ignore */ }

                // Determine coordinates
                // Rider: prefer real-time riderLocationState, otherwise check order fields
                let riderLatLng = null;
                if (riderLocationState && riderLocationState.every(v => Number.isFinite(v))) {
                    riderLatLng = riderLocationState;
                } else {
                    try {
                        if (order.rider_lat && order.rider_lng) riderLatLng = [parseFloat(order.rider_lat), parseFloat(order.rider_lng)];
                        else if (order.riderLocation && order.riderLocation.lat && order.riderLocation.lng) riderLatLng = [parseFloat(order.riderLocation.lat), parseFloat(order.riderLocation.lng)];
                        else if (order.driver_lat && order.driver_lng) riderLatLng = [parseFloat(order.driver_lat), parseFloat(order.driver_lng)];
                    } catch (e) { riderLatLng = null; }
                }

                // Temporary fix: if no rider location available, use a default location to show the rider pin
                if (!riderLatLng) {
                    riderLatLng = [14.5995, 120.9842]; // Default Manila location as fallback
                }

                // Customer: use browser geolocation.
                const custLatLng = (userLocation && userLocation.every(v => Number.isFinite(v))) ? userLocation : null;

                // Update or create markers (use small colored HTML markers for clarity)
                try {
                    if (storeMarkerRef.marker) { storeMarkerRef.marker.remove(); storeMarkerRef.marker = null; }
                    // Customer Marker
                    if (custLatLng) {
                        if (custMarkerRef.marker) {
                            custMarkerRef.marker.setLngLat([custLatLng[1], custLatLng[0]]);
                        } else {
                            custMarkerRef.marker = new mapboxgl.Marker({ element: makeMarkerEl('#ff4d4f', 'You') }).setLngLat([custLatLng[1], custLatLng[0]]).setPopup(new mapboxgl.Popup().setText('You')).addTo(map);
                        }
                    }

                    // Rider Marker
                    if (riderLatLng && riderLatLng.every(v => Number.isFinite(v))) {
                        if (riderMarkerRef.marker) riderMarkerRef.marker.setLngLat([riderLatLng[1], riderLatLng[0]]);
                        else riderMarkerRef.marker = new mapboxgl.Marker({ element: makeMarkerEl('#007bff', 'Rider') }).setLngLat([riderLatLng[1], riderLatLng[0]]).setPopup(new mapboxgl.Popup().setText('Rider')).addTo(map);
                    } else {
                        // If no current rider location, remove existing rider marker
                        try { if (riderMarkerRef.marker) { riderMarkerRef.marker.remove(); riderMarkerRef.marker = null; } } catch (er) {}
                    }
                } catch (e) { console.warn('marker error', e); }

                // Draw route from rider to customer if both locations are known
                let route = null;
                if (riderLatLng && custLatLng) {
                    route = await fetchDirectionsCached(riderLatLng[1], riderLatLng[0], custLatLng[1], custLatLng[0]);
                } else {
                    // If no locations, clear any existing route (do not chain removeLayer/removeSource)
                    try {
                        if (map.getLayer && map.getLayer('route-line')) {
                            try { map.removeLayer('route-line'); } catch (e) { console.warn('removeLayer(route-line) failed', e); }
                        }
                        if (map.getSource && map.getSource('route')) {
                            try { map.removeSource('route'); } catch (e) { console.warn('removeSource(route) failed', e); }
                        }
                    } catch (e) { console.warn('clearing route failed', e); }
                    routeStateRef.fitted = false;
                }

                if (route && route.geometry) {
                    const routeGeo = { type: 'Feature', geometry: route.geometry };

                    const addOrUpdateRoute = (m) => {
                        try {
                            if (!m || !m.getStyle) return;
                            if (m.getSource && m.getSource('route')) {
                                try { m.getSource('route').setData(routeGeo); } catch (e) { console.warn('setData failed', e); }
                                return;
                            }
                            try { m.addSource('route', { type: 'geojson', data: routeGeo }); } catch (e) { try { if (m.getSource && m.getSource('route')) m.getSource('route').setData(routeGeo); } catch (er) { console.warn('addSource/setData fallback failed', er); } }
                            try { if (!m.getLayer || !m.getLayer('route-line')) m.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#1d7fa6', 'line-width': 5 } }); } catch (e) { console.warn('addLayer failed', e); }
                        } catch (e) { console.warn('addOrUpdateRoute error', e); }
                    };

                    const safeAddRoute = () => {
                        try { if (typeof map.isStyleLoaded === 'function' && !map.isStyleLoaded()) return; } catch (e) {}
                        addOrUpdateRoute(map);
                        if (!routeStateRef.fitted) {
                            try {
                                const coordsArray = route.geometry.coordinates;
                                const bounds = coordsArray.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(coordsArray[0], coordsArray[0]));
                                map.fitBounds(bounds, { padding: 60 });
                                routeStateRef.fitted = true;
                            } catch (e) { console.warn('fitBounds failed', e); }
                        }
                    };

                    try {
                        if (typeof map.isStyleLoaded === 'function' && map.isStyleLoaded()) safeAddRoute();
                        else map.once('load', safeAddRoute);
                    } catch (e) { setTimeout(safeAddRoute, 200); }

                    try {
                        if (!routeStateRef.styleHandler) {
                            let timeout = null;
                            routeStateRef.styleHandler = () => {
                                if (timeout) clearTimeout(timeout);
                                timeout = setTimeout(() => { try { safeAddRoute(); } catch (e) { } }, 150);
                            };
                            map.on('styledata', routeStateRef.styleHandler);
                        }
                    } catch (e) { console.warn('styledata handler install failed', e); }
                }

            } catch (err) {
                console.error('updateRouteAndMarkers error:', err);
            }
        };

        updateRouteAndMarkers();
    }, [order, riderLocationState, userLocation, mapLoaded]);

    if (loading) {
        return <div className="text-center my-5">Loading order details...</div>;
    }

    if (!order) {
        return <div className="text-center my-5">Order not found.</div>;
    }

    const steps = order.orderType === 'Delivery' ? orderStatusSteps : pickupStatusSteps;
    const currentStepIndex = steps.indexOf(order.status);

    const getStepStatus = (index) => {
        if (order.status === 'cancelled') return 'cancelled';
        if (index < currentStepIndex) return 'completed';
        if (index === currentStepIndex) return 'active';
        return 'pending';
    };
    
    // Helper to render the appropriate icon for the step
    const renderStepIcon = (status) => {
        if (status === 'completed') return <CheckCircleFill />;
        if (status === 'active') return <ArrowRightCircleFill />;
        return null;
    };

    const renderStepper = () => (
        <div className="stepper-wrapper">
            {steps.map((step, index) => {
                const status = getStepStatus(index);
                return (
                    <div key={step} className={`stepper-item ${status}`}>
                        <div className="step-counter">
                            {renderStepIcon(status)}
                        </div>
                        <div className="step-name">{step.charAt(0).toUpperCase() + step.slice(1)}</div>
                    </div>
                );
            })}
        </div>
    );

    const renderMap = () => (
        <div className="map-container mb-4 mt-n3">
            <div id={trackMapRef.containerId} ref={mapContainerRef} className="track-map-content" style={{ width: '100%', height: '400px', borderRadius: '8px', overflow: 'hidden' }} />
        </div>
    );

    const renderProductList = () => (
        <ul className="product-list">
            {order.products.map((p, idx) => (
                <li key={idx} className="product-item">
                    <span className="product-name">{p.name} (x{p.quantity})</span>
                    {p.addons && p.addons.length > 0 && (
                        <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.85em", color: "#666", listStyle: 'none' }}>
                            {p.addons.map((addon, i) => (
                                <li key={i}>+ {addon.addon_name || addon.AddOnName || addon.name} (₱{(addon.price || addon.Price || 0).toFixed(2)})</li>
                            ))}
                        </ul>
                    )}
                </li>
            ))}
        </ul>
    );

    return (
        // MODIFICATION: Replaced Container/Row/Col with a single CSS-controlled div for better mobile flow
        <div className="track-order-page-wrapper">
            <div className="track-order-content-container">
                <Link to="/profile/orderhistory" className="back-link mb-3">
                    <ArrowLeft className="me-1" /> Back to Order History
                </Link>
                <Card className="track-order-card">
                    <Card.Header as="h4" className="text-center card-header-custom">
                        <span className="d-block">Tracking Order</span>
                        
                    </Card.Header>
                    <Card.Body className="track-order-card-body">
                        {/* Render map only for Delivery orders with status pending, processing, picked up, delivering, or waiting for pickup */}
                        {order.orderType === 'Delivery' && ['pending', 'processing', 'picked up', 'delivering', 'waiting for pickup'].includes(order.status) && (
                            <>
                                {renderMap()}
                            </>
                        )}

                        {/* Status Stepper or Cancelled Notice */}
                        <h5 className="section-title">Order Status</h5>
                        {order.status === 'cancelled' ? (
                            <div className="cancelled-notice">
                                <XCircleFill size={30} className="me-2" />
                                <span className='fs-5'>Order Cancelled</span>
                                <p className="mb-0 mt-2">This order has been cancelled and cannot be tracked further.</p>
                            </div>
                        ) : (
                            renderStepper()
                        )}

                        <hr className="my-4" />

                        {/* Using Row/Col for internal layout remains effective */}
                        <Row>
                            <Col md={6} className="mb-4 mb-md-0">
                                <h5 className="section-title">Order Details</h5>
                                <div className="order-detail-item">
                                    <strong>Order Type:</strong>
                                    <span className="detail-value">{order.orderType}</span>
                                </div>
                                <div className="order-detail-item">
                                    <strong>Date Placed:</strong>
                                    <span className="detail-value">{new Date(order.date).toLocaleString()}</span>
                                </div>
                                <div className="order-detail-item total-amount">
                                    <strong>Total Amount:</strong>
                                    <span className="detail-value">₱{order.total.toFixed(2)}</span>
                                </div>
                            </Col>
                            <Col md={6}>
                                <h5 className="section-title">Products Ordered</h5>
                                {renderProductList()}
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            </div>
        </div>
    );
};

export default TrackOrder;