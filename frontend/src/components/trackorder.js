import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { ArrowLeft, Shop, HouseDoorFill, CheckCircleFill, XCircleFill, ArrowRightCircleFill } from 'react-bootstrap-icons';
import Swal from 'sweetalert2';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import './TrackOrder.css';
import 'leaflet/dist/leaflet.css';

// --- FIX for Leaflet default icon ---
// This manually sets the paths for the marker icons, which often get lost in the build process.
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const TrackOrder = () => {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    const orderStatusSteps = ['pending', 'processing', 'waiting for pickup', 'picked up', 'delivering', 'completed'];
    // Placeholder coordinates. In a real app, these would come from your order/user data.
    const storeLocation = [14.699660772061614, 121.08295563928553]; // Specific store location
    const deliveryLocation = [14.5800, 121.0000]; // Example: Malate, Manila

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
            <MapContainer center={storeLocation} zoom={13} scrollWheelZoom={false} className="leaflet-map-content">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={storeLocation}>
                    <Popup>
                        <Shop className="me-1" /> Store Location
                    </Popup>
                </Marker>
                {order.orderType === 'Delivery' && (
                    <Marker position={deliveryLocation}>
                        <Popup>
                            <HouseDoorFill className="me-1" /> Your Location
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );

    const renderProductList = () => (
        <ul className="product-list">
            {order.products.map((p, idx) => (
                <li key={idx} className="product-item">
                    <span className="product-name">{p.name}</span>
                    <span className="product-quantity">x{p.quantity}</span>
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