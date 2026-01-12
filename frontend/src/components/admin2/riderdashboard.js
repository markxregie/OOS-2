import React, { useState, useEffect } from 'react';
import { FaBell, FaBoxOpen, FaCheckCircle, FaDollarSign, FaClock, FaUser, FaPhone, FaMapMarkerAlt, FaBox, FaTruckPickup, FaTruckMoving, FaTimesCircle, FaExchangeAlt, FaBars, FaHome, FaHistory, FaCog, FaCreditCard, FaUserTie, FaChevronDown, FaUndo, FaSignOutAlt, FaSpinner } from "react-icons/fa";
import { Container, Card, Form, Modal } from "react-bootstrap";
import riderImage from "../../assets/rider.jpg";
import "./riderdashboard.css"; 
import adminImage from "../../assets/administrator.png";

function RiderDashboard() {
  const userRole = "Admin";
  const userName = "Lim Alcovendas";

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toggle, setToggle] = useState("active");
  const [earningsFilter, setEarningsFilter] = useState("Daily");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [earnings, setEarnings] = useState({ totalEarnings: 0.0 });
  const [dailyResetTimer, setDailyResetTimer] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const authToken = localStorage.getItem('authToken');

  useEffect(() => {
    fetchRiders();
  }, []);

  useEffect(() => {
    if (selectedRider) {
      fetchOrders(selectedRider);
      fetchEarnings(selectedRider);
    }
  }, [selectedRider]);

  useEffect(() => {
    if (selectedRider) {
      fetchEarnings(selectedRider);
    }
  }, [earningsFilter]);

  // Poll earnings every 30 seconds to update in real-time
  useEffect(() => {
    if (selectedRider) {
      const interval = setInterval(() => {
        fetchEarnings(selectedRider);
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [selectedRider, earningsFilter]);



  const fetchRiders = async () => {
    setLoading(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('http://localhost:7001/delivery/riders', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch riders: ${response.status}`);
      }
      const data = await response.json();
      const normalizedRiders = data.map(r => ({
        id: r.UserID,
        name: r.FullName,
        phone: r.Phone
      }));
      setRiders(normalizedRiders);
      if (normalizedRiders.length > 0) {
        setSelectedRider(normalizedRiders[0].id);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Request timeout: Delivery service is not responding');
      } else {
        setError(err.message);
      }
      console.error('Fetch riders error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async (riderId) => {
    setLoading(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`http://localhost:7004/delivery/rider/${riderId}/orders`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Request timeout: Orders service is not responding');
      } else {
        setError(err.message);
      }
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEarnings = async (riderId) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JS months are 0-indexed
    const today = now.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

    let url = '';
    if (earningsFilter === 'Daily') {
      url = `http://localhost:7004/delivery/rider/${riderId}/earnings/daily?target_date=${today}`;
    } else if (earningsFilter === 'Weekly') {
      url = `http://localhost:7004/delivery/rider/${riderId}/earnings/weekly?target_date=${today}`;
    } else if (earningsFilter === 'Monthly') {
      url = `http://localhost:7004/delivery/rider/${riderId}/earnings/monthly?year=${year}&month=${month}`;
    }

    if (!url) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`Failed to fetch earnings: ${response.status}`);
      const data = await response.json();
      setEarnings(data);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error('Earnings fetch timeout');
      } else {
        console.error('Earnings fetch error:', err);
      }
      setEarnings({ totalEarnings: 0.0 }); // Set a default on error
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentDate.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const currentDateFormatted = currentDate.toLocaleString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "numeric",
  });

  const getStatusStyle = (status) => {
    switch (status) {
      case "pending":
        return { color: "#d39e00", backgroundColor: "#fff3cd", text: "Pending" };
      case "confirmed":
        return { color: "#198754", backgroundColor: "#d1e7dd", text: "Confirmed" };
      case "preparing":
        return { color: "#2980b9", backgroundColor: "#cfe2ff", text: "Preparing" };
      case "waitingforpickup":
        return { color: "#ffffff", backgroundColor: "#9c27b0", text: "Waiting for Pickup" };
      case "readyToPickup":
        return { color: "#8e44ad", backgroundColor: "#e5dbff", text: "Ready to Pickup" };
      case "pickedUp":
        return { color: "#0d6efd", backgroundColor: "#cfe2ff", text: "Picked Up" };
         case "delivering":
           return { color: "#ffffff", backgroundColor: "rgb(63, 81, 181)", text: "DELIVERING" };
      case "completed":
      return { color: "rgb(25, 135, 84)", backgroundColor: "rgb(209, 231, 221)", text: "COMPLETED"};
      case "inTransit":
        return { color: "#6610f2", backgroundColor: "#e5dbff", text: "In Transit" };
      case "delivered":
        return { color: "#198754", backgroundColor: "#d1e7dd", text: "Delivered" };
      case "cancelled":
        return { color: "#dc3545", backgroundColor: "#f8d7da", text: "Cancelled" };
      case "returned":
        return { color: "#fd7e14", backgroundColor: "#ffe5d0", text: "Cancelled/Returned" };
      default:
        return { color: "black", backgroundColor: "transparent", text: status };
    }
  };

  const filteredOrders = orders.filter(order => {
    if (toggle === "active") {
      return !["delivered", "cancelled", "returned"].includes(order.currentStatus);
    } else if (toggle === "completed") {
      return order.currentStatus === "delivered";
    }
    return true;
  });

  const selectedRiderObj = riders.find(r => r.id === selectedRider);

  const activeOrdersCount = orders.filter(order => !["delivered", "cancelled", "returned"].includes(order.currentStatus)).length;
  const completedOrdersCount = orders.filter(order => order.currentStatus === "delivered").length;



  const statusIcons = {
    pending: <FaClock />,
    confirmed: <FaCheckCircle />,
    preparing: <FaBox />,
    waitingforpickup: <FaClock />,
    readyToPickup: <FaTruckPickup />,
    pickedUp: <FaTruckMoving />,
    pickedup: <FaTruckMoving />,
    delivering: <FaTruckMoving />,
    completed: <FaCheckCircle />,
    inTransit: <FaTruckMoving />,
    delivered: <FaCheckCircle />,
    cancelled: <FaTimesCircle />,
  };

  const cardColors = "#a3d3d8"; // Fixed color since riders are dynamic

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <FaSpinner className="fa-spin" style={{ fontSize: '3rem', color: '#4b929d' }} />
        <p style={{ color: '#4b929d', fontSize: '1.2rem' }}>Loading data...</p>
      </div>
    );
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="rider-dashboard-container">
      <div className="main-content">
        <header className="manage-header">
          <div className="header-left">
            
            <h2 className="page-title">Rider Dashboard</h2>
          </div>
          <div className="header-right">
                      <div className="header-date">{currentDateFormatted}</div>
                     <div className="header-profile">
                                               <img src={adminImage} alt="Admin" className="profile-pic" />
                        <div className="profile-info">
                          <div className="profile-role">Hi! I'm {userRole}</div>
                          <div className="profile-name">Admin OOS</div>
                        </div>
                        <div className="dropdown-icon" onClick={() => setDropdownOpen(!dropdownOpen)}><FaChevronDown /></div>
                        
                        {dropdownOpen && (
                          <div className="profile-dropdown" style={{ position: "absolute", top: "100%", right: 0, backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", zIndex: 1000, width: "150px" }}>
                            <ul style={{ listStyle: "none", margin: 0, padding: "8px 0" }}>
                              <li
                                onClick={() => window.location.reload()}
                                style={{ cursor: "pointer", padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px", color: "#4b929d" }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f0f0f0"}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                              >
                                <FaUndo /> Refresh
                              </li>
                              <li
                                onClick={() => { localStorage.removeItem("access_token"); localStorage.removeItem("authToken"); localStorage.removeItem("expires_at"); localStorage.removeItem("userData"); window.location.replace("http://localhost:4002/"); }}
                                style={{ cursor: "pointer", padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px", color: "#dc3545" }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f8d7da"}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                              >
                                <FaSignOutAlt /> Logout
                              </li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
        </header>

        <Container fluid className="dashboard-summary-container" style={{ backgroundColor: cardColors }}>
          <div className="rider-selector-group">
            <div className="rider-info-display">
              <img src={riderImage} alt={selectedRiderObj?.name || "Rider"} className="rider-profile-pic" />
              <span className="rider-name-text">{selectedRiderObj?.name || "Rider"}</span>
            </div>
            <Form.Select
              className="rider-select"
              value={selectedRider || ""}
              onChange={(e) => setSelectedRider(Number(e.target.value))}
            >
              {riders.map((rider) => (
                <option key={rider.id} value={rider.id}>{rider.name}</option>
              ))}
            </Form.Select>
          </div>
          <div className="summary-cards-container">
            <Card className="summary-card">
              <FaBoxOpen size={32} color="#964b00" />
              <span className="card-title">Active Orders</span>
              <span className="card-value">{activeOrdersCount} orders</span>
            </Card>
            <Card className="summary-card">
              <FaCheckCircle size={32} color="#198754" />
              <span className="card-title">Completed</span>
              <span className="card-value">{completedOrdersCount} orders</span>
            </Card>
            <Card className="summary-card" style={{ position: 'relative' }}>
              <Form.Select
                size="sm"
                value={earningsFilter}
                onChange={(e) => setEarningsFilter(e.target.value)}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  width: '120px',
                  fontSize: '12px',
                  padding: '2px 6px'
                }}
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </Form.Select>
              <FaDollarSign size={32} color="#fd7e14" />
              <span className="card-title">Earnings</span>
              <span className="card-value">₱{earnings?.totalEarnings?.toFixed(2) || "0.00"}</span>
            </Card>
          </div>
        </Container>

        <div className="toggle-buttons-container">
          <button
            className={`toggle-button ${toggle === "active" ? "active" : ""}`}
            onClick={() => setToggle("active")}
          >
            Active Orders
          </button>
          <button
            className={`toggle-button ${toggle === "all" ? "active" : ""}`}
            onClick={() => setToggle("all")}
          >
            All Orders
          </button>
          <button
            className={`toggle-button ${toggle === "completed" ? "active" : ""}`}
            onClick={() => setToggle("completed")}
          >
            Completed
          </button>
        </div>

        <div className="order-list-heading">
          {toggle === "active" && <div>Showing Active Orders</div>}
          {toggle === "all" && <div>Showing All Orders</div>}
          {toggle === "completed" && <div>Showing Completed Orders</div>}
        </div>

        <div className="order-cards-container">
          {filteredOrders.length === 0 ? (
            <div className="no-orders-message">
              <FaBoxOpen size={50} color="#ccc" />
              <p>No orders to show for this rider.</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <Card 
                key={order.id} 
                className="order-card-compact rider-order-card"
                onClick={() => {
                  setSelectedOrder(order);
                  setShowOrderModal(true);
                }}
                style={{
                  padding: "16px",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  border: "1px solid #ddd",
                  borderRadius: "8px"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.15)";
                  e.currentTarget.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Order Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                  <h6 style={{ color: "#2c3e50", fontWeight: "700", margin: "0" }}>Order #{order.id}</h6>
                  <span style={{
                    fontWeight: "600",
                    fontSize: "0.75rem",
                    color: getStatusStyle(order.currentStatus).color,
                    backgroundColor: getStatusStyle(order.currentStatus).backgroundColor,
                    padding: "3px 6px",
                    borderRadius: "4px",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    {statusIcons[order.currentStatus]} {getStatusStyle(order.currentStatus).text}
                  </span>
                </div>

                {/* Customer Info */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#555", fontSize: "0.9rem" }}>
                  <FaUser color="#4b929d" size={14} />
                  <span>{order.customerName}</span>
                </div>

                {/* Phone & Address */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#555", fontSize: "0.9rem" }}>
                  <FaPhone color="#4b929d" size={14} />
                  <span>{order.phone}</span>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", color: "#555", fontSize: "0.9rem" }}>
                  <FaMapMarkerAlt color="#4b929d" size={14} style={{ marginTop: "2px", flexShrink: 0 }} />
                  <span style={{ wordBreak: "break-word" }}>{order.address?.substring(0, 45)}...</span>
                </div>

                {/* Items Count */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#555", fontSize: "0.9rem" }}>
                  <FaBox color="#4b929d" size={14} />
                  <span>{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Ordered Time */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#555", fontSize: "0.85rem" }}>
                  <FaClock color="#4b929d" size={14} />
                  <span>{order.orderedAt}</span>
                </div>

                {/* Price Summary */}
                <div style={{
                  paddingTop: "8px",
                  borderTop: "1px solid #eee",
                  fontWeight: "600",
                  display: "flex",
                  justifyContent: "space-between"
                }}>
                  <span>Total:</span>
                  <span style={{ color: "#4b929d", fontSize: "1.1rem" }}>₱{order.total?.toFixed(2) || "0.00"}</span>
                </div>

                {/* Click to View Details */}
                <div style={{
                  textAlign: "center",
                  fontSize: "0.8rem",
                  color: "#4b929d",
                  marginTop: "4px",
                  fontWeight: "500",
                  fontStyle: "italic"
                }}>
                  Click to view full details
                </div>
              </Card>
            ))
          )}
        </div>

        {/* ORDER DETAILS MODAL */}
        <Modal 
          show={showOrderModal} 
          onHide={() => setShowOrderModal(false)}
          size="lg"
          scrollable
          centered
          className="order-details-modal"
        >
          <Modal.Header closeButton style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #4b929d" }}>
            <Modal.Title style={{ fontWeight: "700", color: "#2c3e50" }}>
              Order #{selectedOrder?.id}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: "24px" }}>
            {selectedOrder && (
              <div className="order-modal-content">
                {/* Status */}
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "0.85rem", color: "#666", fontWeight: "500", marginBottom: "4px" }}>STATUS</div>
                  <span style={{
                    fontWeight: "600",
                    fontSize: "0.95rem",
                    color: getStatusStyle(selectedOrder.currentStatus).color,
                    backgroundColor: getStatusStyle(selectedOrder.currentStatus).backgroundColor,
                    padding: "6px 12px",
                    borderRadius: "4px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    {statusIcons[selectedOrder.currentStatus]} {getStatusStyle(selectedOrder.currentStatus).text}
                  </span>
                </div>

                {/* Customer Information */}
                <div style={{ 
                  padding: "16px", 
                  backgroundColor: "#f0f8fa", 
                  borderRadius: "8px", 
                  marginBottom: "20px",
                  border: "1px solid #d4e8ed"
                }}>
                  <h6 style={{ color: "#2c3e50", marginBottom: "12px", fontWeight: "600" }}>CUSTOMER INFORMATION</h6>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                    <FaUser color="#4b929d" size={16} />
                    <span style={{ color: "#333" }}>{selectedOrder.customerName}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                    <FaPhone color="#4b929d" size={16} />
                    <span style={{ color: "#333" }}>{selectedOrder.phone || "N/A"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <FaMapMarkerAlt color="#4b929d" size={16} style={{ marginTop: "2px", flexShrink: 0 }} />
                    <span style={{ color: "#333" }}>{selectedOrder.address}</span>
                  </div>
                </div>

                {/* Order Time */}
                <div style={{ marginBottom: "20px", padding: "12px", backgroundColor: "#f9f9f9", borderRadius: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#555" }}>
                    <FaClock color="#4b929d" size={16} />
                    <span>Ordered at: <strong>{selectedOrder.orderedAt}</strong></span>
                  </div>
                </div>

                {/* Items Section */}
                <div style={{ marginBottom: "20px" }}>
                  <h6 style={{ color: "#2c3e50", marginBottom: "12px", fontWeight: "600" }}>ITEMS ({selectedOrder.items?.length || 0})</h6>
                  <div style={{ 
                    padding: "12px", 
                    backgroundColor: "#fafafa", 
                    borderRadius: "6px",
                    maxHeight: "300px",
                    overflowY: "auto"
                  }}>
                    {selectedOrder.items?.map((item, i) => {
                      const promoName = item.promo_name || item.applied_promo || "";
                      const promoDiscount = item.discount || 0;
                      const hasPromo = promoName || promoDiscount > 0;

                      return (
                        <div key={i} style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: i < (selectedOrder.items?.length || 0) - 1 ? "1px solid #ddd" : "none" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ fontWeight: "500" }}>
                              {item.quantity}x {item.name}
                            </span>
                            <span style={{ fontWeight: "600", color: "#2c3e50" }}>₱{item.price?.toFixed(2)}</span>
                          </div>
                          {item.addons && item.addons.length > 0 && (
                            <ul style={{ margin: "6px 0", paddingLeft: "20px", fontSize: "0.9em", color: "#666" }}>
                              {item.addons.map((addon, j) => (
                                <li key={j}>+ {addon.addon_name} (₱{addon.price.toFixed(2)})</li>
                              ))}
                            </ul>
                          )}
                          {hasPromo && (
                            <div style={{ paddingLeft: "10px", fontSize: "0.9em", color: "#28a745", fontWeight: "500", marginTop: "4px" }}>
                              🎉 {promoName} - ₱{promoDiscount.toFixed(2)} OFF
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Price Summary */}
                <div style={{ 
                  padding: "12px", 
                  backgroundColor: "#f0f8fa", 
                  borderRadius: "6px", 
                  marginBottom: "20px",
                  border: "1px solid #d4e8ed"
                }}>
                  {selectedOrder.deliveryFee && selectedOrder.deliveryFee > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", color: "#555" }}>
                      <span>Delivery Fee:</span>
                      <span>₱{selectedOrder.deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    paddingTop: "8px",
                    borderTop: "1px solid #ddd",
                    fontWeight: "700",
                    fontSize: "1.1rem",
                    color: "#2c3e50"
                  }}>
                    <span>Total:</span>
                    <span style={{ color: "#4b929d" }}>₱{selectedOrder.total?.toFixed(2) || "0.00"}</span>
                  </div>
                </div>
              </div>
            )}
          </Modal.Body>
        </Modal>
      </div>
    </div>
  );
}

export default RiderDashboard;