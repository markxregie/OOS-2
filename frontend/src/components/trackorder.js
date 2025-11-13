import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Row, Col, Card } from 'react-bootstrap';
import { ArrowLeft, Shop, HouseDoorFill, CheckCircleFill, XCircleFill, ArrowRightCircleFill } from 'react-bootstrap-icons';
import Swal from 'sweetalert2';
import './TrackOrder.css';

// Simple in-memory caches to avoid repeating expensive external requests
const geocodeCache = new Map(); // address -> { lat, lng }
const pendingGeocode = new Map(); // address -> Promise

async function geocodeAddress(address) {
    if (!address) return null;
    const key = address.trim().toLowerCase();
    if (geocodeCache.has(key)) return geocodeCache.get(key);
    if (pendingGeocode.has(key)) return pendingGeocode.get(key);

    const p = new Promise((resolve) => {
        if (window.google && window.google.maps) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const location = results[0].geometry.location;
                    const val = { lat: location.lat(), lng: location.lng() };
                    geocodeCache.set(key, val);
                    resolve(val);
                } else {
                    resolve(null);
                }
            });
        } else {
            resolve(null);
        }
    });

    pendingGeocode.set(key, p);
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
    const [userLocation, setUserLocation] = useState(null); // customer's pinned location from profile
    const [riderLocationState, setRiderLocationState] = useState(null); // latest rider location from backend
    const mapRef = useRef(null);
    const [map, setMap] = useState(null);
    const [marker, setMarker] = useState(null);
    const [riderMarker, setRiderMarker] = useState(null);
    const [routePolyline, setRoutePolyline] = useState(null);
    const [riderIdState, setRiderIdState] = useState(null);
    const [riderLastUpdated, setRiderLastUpdated] = useState(null);
    const [scriptLoaded, setScriptLoaded] = useState(!!(window.google && window.google.maps));

    // Load Google Maps API script if not already loaded
    useEffect(() => {
      if (!scriptLoaded) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`;
        script.async = true;
        script.defer = true;
        script.onload = () => setScriptLoaded(true);
        script.onerror = () => console.error('Failed to load Google Maps API');
        document.head.appendChild(script);
      }
    }, [scriptLoaded]);

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

    // Poll for user's pinned location from their profile based on address fields
    useEffect(() => {
        const fetchProfileLocation = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (token) {
                    const profileRes = await fetch('http://localhost:4000/users/profile', {
                        headers: { 'Authorization': `Bearer ${token}` },
                    });
                    if (profileRes.ok) {
                        const profileData = await profileRes.json();
                        const { region, province, city, streetName, barangay, postalCode, lat, lng } = profileData;

                        const geocodeAddress = () => {
                            // First, set to stored lat/lng if available
                            if (lat && lng && Number.isFinite(parseFloat(lat)) && Number.isFinite(parseFloat(lng))) {
                                setUserLocation([parseFloat(lat), parseFloat(lng)]);
                                console.log('TrackOrder: Set to stored user profile location:', [parseFloat(lat), parseFloat(lng)]);
                            }

                            // Then, try to geocode if address fields are complete
                            if (region && province && city && streetName && barangay) {
                                const address = `${streetName}, ${barangay}, ${city}, ${province}, ${region}, Philippines`;

                                // Geocode the address to get lat/lng
                                const geocoder = new window.google.maps.Geocoder();
                                geocoder.geocode({ address }, (results, status) => {
                                    if (status === 'OK' && results[0]) {
                                        const location = results[0].geometry.location;
                                        const newLat = location.lat();
                                        const newLng = location.lng();
                                        setUserLocation([newLat, newLng]);
                                        console.log('TrackOrder: Updated to geocoded user profile location:', [newLat, newLng]);
                                    }
                                });
                            }
                        };

                        if (window.google && window.google.maps) {
                            geocodeAddress();
                        } else {
                            // Load Google Maps API if not loaded
                            const script = document.createElement('script');
                            script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`;
                            script.async = true;
                            script.defer = true;
                            script.onload = geocodeAddress;
                            document.head.appendChild(script);
                        }
                    }
                }
            } catch (e) {
                console.warn('Failed to get profile location:', e);
            }
        };

        fetchProfileLocation(); // Initial fetch
        const profileInterval = setInterval(fetchProfileLocation, 10000); // Poll every 10 seconds

        return () => clearInterval(profileInterval);
    }, []);

    // Poll rider location from backend if we have a riderId and order is not completed
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
        if (riderIdState && order && order.status !== 'completed') {
            // initial fetch
            startPolling();
            interval = setInterval(startPolling, 5000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [riderIdState, order]);

    // Initialize and update Google Map
    useEffect(() => {
        if (!scriptLoaded || !mapRef.current || !order || order.orderType !== 'Delivery') {
            return;
        }

        const storeLocation = { lat: 14.5547, lng: 121.0244 }; // Default store location
        const customerLoc = userLocation ? { lat: userLocation[0], lng: userLocation[1] } : null;
        const riderLoc = riderLocationState ? { lat: riderLocationState[0], lng: riderLocationState[1] } : null;

        // Initialize map
        if (!map) {
            const newMap = new window.google.maps.Map(mapRef.current, {
                center: storeLocation,
                zoom: 12,
                mapTypeControl: false,
            });
            setMap(newMap);

            // Add store marker
            new window.google.maps.Marker({
                position: storeLocation,
                map: newMap,
                title: 'Store Location',
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#4285F4', // Blue for store
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: 'white',
                },
            });

            return; // Map is set, next render will handle updates
        }

        // --- Update map with markers and route ---

        // Update or create customer marker
        if (customerLoc) {
            if (marker) {
                marker.setPosition(customerLoc);
            } else {
                setMarker(new window.google.maps.Marker({
                    position: customerLoc,
                    map: map,
                    title: 'Your Location',
                }));
            }
        }

        // Update or create rider marker
        if (riderLoc) {
            if (riderMarker) {
                riderMarker.setPosition(riderLoc);
            } else {
                setRiderMarker(new window.google.maps.Marker({
                    position: riderLoc,
                    map: map,
                    title: 'Rider Location',
                    icon: {
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                            <svg width="24" height="24" viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg">
                                <path fill="#f44336" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z"/>
                            </svg>
                        `),
                        scaledSize: new window.google.maps.Size(30, 40),
                        anchor: new window.google.maps.Point(15, 40),
                    },
                }));
            }
        }

        // Draw route from rider to customer if both are available
        if (riderLoc && customerLoc && ['picked up', 'delivering'].includes(order.status)) {
            if (routePolyline) routePolyline.setMap(null); // Clear old route

            const directionsService = new window.google.maps.DirectionsService();
            const directionsRenderer = new window.google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: true,
                polylineOptions: { strokeColor: '#1d7fa6', strokeWeight: 5 },
            });

            directionsService.route({
                origin: riderLoc,
                destination: customerLoc,
                travelMode: 'DRIVING',
            }, (result, status) => {
                if (status === 'OK') directionsRenderer.setDirections(result);
            });
            setRoutePolyline(directionsRenderer);
        }

    }, [scriptLoaded, order, userLocation, riderLocationState, map, marker, riderMarker, routePolyline]);


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
        <div className="map-container mb-5 mt-n3">
            <div ref={mapRef} className="track-map-content" style={{ width: '100%', height: '450px', borderRadius: '8px', overflow: 'hidden' }} />
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
                        {/* Render map only for Delivery orders with status pending, processing, picked up, delivering, waiting for pickup, or completed */}
                        {order.orderType === 'Delivery' && ['pending', 'processing', 'picked up', 'delivering', 'waiting for pickup', 'completed'].includes(order.status) && (
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

{/* Rider Information (visible only when status is picked up or delivering) */}
{['picked up', 'delivering'].includes(order.status) && order.rider_name && (
  <>
    <hr className="my-4" />
    <h5 className="section-title">Rider Information</h5>
    <div className="rider-info-box p-3 rounded border bg-light">
      <div className="rider-info-item">
        <strong>Name:</strong> <span>{order.rider_name}</span>
      </div>
      <div className="rider-info-item">
        <strong>Phone:</strong> <span>{order.rider_phone || 'N/A'}</span>
      </div>
      <div className="rider-info-item">
        <strong>Plate Number:</strong> <span>{order.rider_plate || 'N/A'}</span>
      </div>
    </div>
  </>
)}

                    </Card.Body>
                </Card>
            </div>
        </div>
    );
};

export default TrackOrder;