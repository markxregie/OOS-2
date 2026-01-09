import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Row, Col, Card } from 'react-bootstrap';
import { ArrowLeft, Shop, HouseDoorFill, CheckCircleFill, XCircleFill, ArrowRightCircleFill } from 'react-bootstrap-icons';
import Swal from 'sweetalert2';
import deliveryIcon from '../assets/delivery.png';
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

// Calculate bearing/heading from point A to B (degrees)
function calcHeading(lat1, lon1, lat2, lon2) {
        const toRad = (d) => d * Math.PI / 180;
        const toDeg = (d) => d * 180 / Math.PI;
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLon) * Math.cos(toRad(lat2));
        const b = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
        let brng = Math.atan2(a, b);
        brng = toDeg(brng);
        brng = (brng + 360) % 360;
        return brng;
}

// Haversine distance (km)
function getDistanceKm(lat1, lon1, lat2, lon2) {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
    const R = 6371; // Earth's radius km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function estimateDeliveryMinutes(distanceKm, avgSpeedKmh = 25) {
    if (distanceKm == null) return null;
    const mins = (distanceKm / avgSpeedKmh) * 60;
    // floor to 1-minute granularity and enforce a reasonable minimum
    return Math.max(3, Math.round(mins));
}

// Fetch estimated delivery time from backend
async function fetchEstimatedDeliveryTime(orderId, customerLat, customerLng) {
    if (!orderId || customerLat == null || customerLng == null) return null;
    
    try {
        const response = await fetch(
            `http://localhost:7001/delivery/estimate-delivery-time/${orderId}?customer_lat=${customerLat}&customer_lng=${customerLng}`
        );
        
        if (response.ok) {
            const data = await response.json();
            return data.total_estimated_minutes;
        }
    } catch (error) {
        console.error('Error fetching estimated delivery time:', error);
    }
    
    return null;
}

// Generate rider icon with rotation (using delivery.png)
function makeRiderIcon(angle = 0) {
    return {
        url: deliveryIcon,
        scaledSize: new window.google.maps.Size(40, 40),
        anchor: new window.google.maps.Point(20, 20),
        rotation: angle
    };
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
    const lastRiderPosRef = useRef(null);
    const [riderIdState, setRiderIdState] = useState(null);
    const [riderLastUpdated, setRiderLastUpdated] = useState(null);
    const [scriptLoaded, setScriptLoaded] = useState(!!(window.google && window.google.maps));
    const [estimatedDeliveryMinutes, setEstimatedDeliveryMinutes] = useState(null);

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
        // Track if component is mounted to prevent updates after unmount
        let isMounted = true;

        const fetchOrderDetails = async () => {
            // Skip if order is already completed - stops API calls
            if (order && order.status === 'completed') {
                return;
            }

            const token = localStorage.getItem('authToken');
            if (!token) {
                if (isMounted && loading) {
                    Swal.fire('Error', 'You must be logged in to view order details.', 'error');
                    setLoading(false);
                }
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

                if (!isMounted) return; // Don't update if unmounted

                // Normalize status for consistency to fix stepper
                let originalStatus = (orderData.status || '').toLowerCase().trim();
                
                // Map backend status to stepper status
                let status = originalStatus;
                if (originalStatus === 'delivered') status = 'completed';
                else if (originalStatus === 'preparing') status = 'processing';
                else if (originalStatus === 'waiting for pick up' || originalStatus === 'ready for pickup') status = 'waiting for pickup';
                else if (originalStatus === 'pickedup') status = 'picked up';
                else if (originalStatus === 'intransit') status = 'delivering';

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
                            if (fetched && isMounted) {
                                setRiderLocationState(fetched);
                                setRiderLastUpdated(Date.now());
                            }
                        }
                    } catch (e) {
                        // ignore
                    }
                }

                // Extract delivery fee from multiple possible field names
                let deliveryFee = null;
                if (orderData.delivery_fee) {
                    deliveryFee = parseFloat(orderData.delivery_fee);
                } else if (orderData.deliveryFee) {
                    deliveryFee = parseFloat(orderData.deliveryFee);
                } else if (orderData.delivery) {
                    deliveryFee = parseFloat(orderData.delivery);
                }

                setOrder({
                    ...orderData,
                    status, // Use the normalized status
                    total: orderData.total,
                    delivery_fee: deliveryFee // Ensure delivery_fee is set
                });
                
                if (loading) {
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error fetching order details:', error);
                // Avoid showing a popup on every interval failure
                if (isMounted && loading) {
                    Swal.fire('Error', error.message, 'error');
                    setLoading(false);
                }
            }
        };

        // Initial fetch
        fetchOrderDetails();
        
        // Set up interval - function checks status internally
        const interval = setInterval(fetchOrderDetails, 5000); // Refresh every 5 seconds

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [orderId]); // Only depend on orderId - NOT on order.status

    // Fetch user's pinned location from their profile (ONLY ONCE on mount)
    useEffect(() => {
        let mounted = true; // Prevent state updates after unmount
        
        const fetchProfileLocation = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (token && mounted) {
                    const profileRes = await fetch('http://localhost:4000/users/profile', {
                        headers: { 'Authorization': `Bearer ${token}` },
                    });
                    if (profileRes.ok && mounted) {
                        const profileData = await profileRes.json();
                        const { region, province, city, streetName, barangay, postalCode, lat, lng } = profileData;

                        const geocodeAddress = () => {
                            // First, set to stored lat/lng if available (priority)
                            if (lat && lng && Number.isFinite(parseFloat(lat)) && Number.isFinite(parseFloat(lng))) {
                                if (mounted) {
                                    setUserLocation([parseFloat(lat), parseFloat(lng)]);
                                    console.log('TrackOrder: Set to stored user profile location:', [parseFloat(lat), parseFloat(lng)]);
                                }
                                return; // Don't geocode if we already have coordinates
                            }

                            // Only geocode if address fields are complete AND we don't have lat/lng
                            if (region && province && city && streetName && barangay && window.google && window.google.maps) {
                                const address = `${streetName}, ${barangay}, ${city}, ${province}, ${region}, Philippines`;

                                // Use the geocodeAddress utility function that has built-in caching
                                geocodeAddress(address).then((result) => {
                                    if (result && mounted) {
                                        setUserLocation([result.lat, result.lng]);
                                        console.log('TrackOrder: Updated to geocoded user profile location:', [result.lat, result.lng]);
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
                            script.onload = () => {
                                if (mounted) geocodeAddress();
                            };
                            document.head.appendChild(script);
                        }
                    }
                }
            } catch (e) {
                console.warn('Failed to get profile location:', e);
            }
        };

        // Fetch only once on mount, not every 10 seconds
        fetchProfileLocation();

        return () => {
            mounted = false; // Cleanup
        };
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
        
        // Only start polling if order exists and is in transit (not yet completed or cancelled)
        if (riderIdState && order && ['picked up', 'delivering'].includes(order.status)) {
            // initial fetch
            startPolling();
            interval = setInterval(startPolling, 5000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [riderIdState, order?.status]);

    // Fetch estimated delivery time from backend (only once per order)
    useEffect(() => {
        const fetchDeliveryEstimate = async () => {
            // Only fetch if we don't already have an estimate for this order
            if (order && userLocation && order.orderType === 'Delivery' && !estimatedDeliveryMinutes) {
                const estimate = await fetchEstimatedDeliveryTime(
                    order.id,
                    userLocation[0],
                    userLocation[1]
                );
                if (estimate) {
                    setEstimatedDeliveryMinutes(estimate);
                }
            }
        };

        fetchDeliveryEstimate();
    }, [order?.id, userLocation]);

    // Initialize and update Google Map
    useEffect(() => {
        if (!scriptLoaded || !mapRef.current || !order || order.orderType !== 'Delivery') {
            return;
        }

        const storeLocation = { lat: 14.5547, lng: 121.0244 }; // Default store location (fallback)
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

            // Create an initial Rider marker (use rider location if available, otherwise place at fallback center)
            const initialPos = riderLoc || storeLocation;

            const initialRiderMarker = new window.google.maps.Marker({
                position: initialPos,
                map: newMap,
                title: 'Rider',
                icon: makeRiderIcon(0)
            });
            setRiderMarker(initialRiderMarker);
            lastRiderPosRef.current = [initialPos.lat, initialPos.lng];

            // If we already have both locations on init, draw the route immediately
            if (riderLoc && customerLoc) {
                const directionsService = new window.google.maps.DirectionsService();
                const directionsRenderer = new window.google.maps.DirectionsRenderer({
                    map: newMap,
                    suppressMarkers: true,
                    polylineOptions: { strokeColor: '#1d7fa6', strokeWeight: 5 },
                });

                directionsService.route({
                    origin: riderLoc,
                    destination: customerLoc,
                    travelMode: window.google.maps.TravelMode.DRIVING,
                }, (result, status) => {
                    if (status === window.google.maps.DirectionsStatus.OK) {
                        directionsRenderer.setDirections(result);
                        setRoutePolyline(directionsRenderer);
                    } else {
                        console.error('Directions request failed due to ' + status);
                    }
                });
            }

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
                // compute heading from last position to current
                const prev = lastRiderPosRef.current;
                let angle = 0;
                try {
                    if (prev && prev.length === 2) {
                        angle = calcHeading(prev[0], prev[1], riderLoc.lat, riderLoc.lng);
                    }
                } catch (e) {
                    angle = 0;
                }
                riderMarker.setIcon(makeRiderIcon(angle));
                riderMarker.setPosition(riderLoc);
            } else {
                setRiderMarker(new window.google.maps.Marker({
                    position: riderLoc,
                    map: map,
                    title: 'Rider',
                    icon: makeRiderIcon(0)
                }));
            }
            lastRiderPosRef.current = [riderLoc.lat, riderLoc.lng];
        }

        // Draw route from rider to customer if both are available
        if (riderLoc && customerLoc && map) {
            // Clear old route before drawing new one
            if (routePolyline) {
                routePolyline.setMap(null);
            }

            const directionsService = new window.google.maps.DirectionsService();
            const directionsRenderer = new window.google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: true,
                polylineOptions: {
                    strokeColor: '#1d7fa6',
                    strokeWeight: 5,
                },
            });

            const request = {
                origin: riderLoc,
                destination: customerLoc,
                travelMode: window.google.maps.TravelMode.DRIVING,
            };

            directionsService.route(request, (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK) {
                    directionsRenderer.setDirections(result);
                    setRoutePolyline(directionsRenderer);
                } else {
                    console.error('Directions request failed due to ' + status);
                }
            });
        }

    }, [scriptLoaded, order, userLocation, riderLocationState, map, marker, riderMarker]);


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
                                {order.orderType === 'Delivery' && estimatedDeliveryMinutes != null && (
                                    <div className="order-detail-item">
                                        <strong>Estimated Delivery:</strong>
                                        <span className="detail-value">{estimatedDeliveryMinutes} min</span>
                                    </div>
                                )}
                                <div className="order-detail-item">
                                    <strong>Date Placed:</strong>
                                    <span className="detail-value">{new Date(order.date).toLocaleString()}</span>
                                </div>
                                {order.orderType === 'Delivery' && (
                                    <div className="order-detail-item">
                                        <strong>Delivery Fee:</strong>
                                        <span className="detail-value">₱{Number(order.delivery_fee || 0).toFixed(2)}</span>
                                    </div>
                                )}
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