import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { FaChevronDown, FaBell, FaBoxOpen, FaCheckCircle, FaDollarSign, FaClock, FaUser, FaPhone, FaMapMarkerAlt, FaBox, FaUndo, FaSignOutAlt, FaTimesCircle, FaBars, FaFilter, FaCalendarAlt, FaChevronRight, FaReceipt, FaMoneyBillWave } from "react-icons/fa";
import { Form, Container, Table, Card, Button, Offcanvas, Badge, Row, Col } from "react-bootstrap";
import riderImage from "../../assets/rider.jpg";
import "./riderhome.css"; 
import "./riderhistory.css"; 
import RiderSidebar from "./RiderSidebar";
import RiderMobileNav from "./RiderMobileNav";
import RiderHeaderSummary from "./RiderHeaderSummary";

import Swal from 'sweetalert2';

function RiderHistory() {
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState(localStorage.getItem("riderName") || "");

  const [currentDate, setCurrentDate] = useState(new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 991);
  
  const [authToken, setAuthToken] = useState(localStorage.getItem("authToken"));
  const [riderId, setRiderId] = useState(localStorage.getItem("riderId") || "");
  const [riderName, setRiderName] = useState(localStorage.getItem("riderName") || "");
  const [riderPhone, setRiderPhone] = useState(localStorage.getItem("riderPhone") || "");
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // FILTERS
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // EARNINGS STATS FOR HEADER
  const [earningsFilter, setEarningsFilter] = useState("Daily");
  const [earnings, setEarnings] = useState(null);

  // DETAILS DRAWER STATE
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tokenFromUrl = queryParams.get("authorization");
    const usernameFromUrl = queryParams.get("username");

    if (tokenFromUrl) {
      localStorage.setItem("authToken", tokenFromUrl);
      setAuthToken(tokenFromUrl);
    }
    if (usernameFromUrl) {
      localStorage.setItem("riderUsername", usernameFromUrl);
    }
  }, [location.search]);

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 991);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (authToken) {
      fetch("http://localhost:4000/auth/users/me", {
        headers: { "Authorization": `Bearer ${authToken}` }
      })
        .then(res => {
          if (res.status === 401) {
            handleLogout();
            return;
          }
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(async data => {
          if (!data) return;
          const userId = data.userId || "";
          const userRoleData = data.userRole || "";
          const fallbackName = (data.fullName && data.fullName.trim() !== "")
            ? data.fullName
            : (data.username && data.username.trim() !== "")
              ? data.username
              : "Rider";
          const fallbackPhone = data.phone || "";

          setRiderId(userId);
          localStorage.setItem("riderId", userId);
          setUserRole(userRoleData);
          setUserName(fallbackName);

          if (userId) {
            try {
              const riderRes = await fetch(`http://localhost:4000/users/riders/${userId}`, {
                headers: { "Authorization": `Bearer ${authToken}` }
              });
              if (riderRes.ok) {
                const riderData = await riderRes.json();
                const riderFullName = riderData.FullName || fallbackName;
                const riderPhone = riderData.Phone || fallbackPhone;
                setRiderName(riderFullName);
                localStorage.setItem("riderName", riderFullName);
                setRiderPhone(riderPhone);
                localStorage.setItem("riderPhone", riderPhone);
                setUserName(riderFullName);
              } else {
                setRiderName(fallbackName);
                localStorage.setItem("riderName", fallbackName);
                setRiderPhone(fallbackPhone);
                localStorage.setItem("riderPhone", fallbackPhone);
              }
            } catch (err) {
              console.error("Failed to fetch rider info:", err);
              setRiderName(fallbackName);
              localStorage.setItem("riderName", fallbackName);
              setRiderPhone(fallbackPhone);
              localStorage.setItem("riderPhone", fallbackPhone);
            }
          }
        })
        .catch(err => {
          console.error("Failed to fetch user info:", err);
        });
    }
  }, [authToken]);

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

  // --- FETCH ORDERS ---
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:7004/delivery/rider/${riderId}/orders`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        // Set all orders for header summary, filter for history display
        setOrders(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    if (riderId && authToken) {
      fetchOrders();
    }
  }, [riderId, authToken]);

  // --- FETCH EARNINGS (Reused Logic) ---
  useEffect(() => {
    const fetchEarnings = async () => {
      if (!riderId || !authToken) return;
      const now = new Date();
      const today = now.toLocaleDateString('en-CA'); 
      let url = '';
      if (earningsFilter === 'Daily') url = `http://localhost:7004/delivery/rider/${riderId}/earnings/daily?target_date=${today}`;
      else if (earningsFilter === 'Weekly') url = `http://localhost:7004/delivery/rider/${riderId}/earnings/weekly?target_date=${today}`;
      else if (earningsFilter === 'Monthly') url = `http://localhost:7004/delivery/rider/${riderId}/earnings/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`;

      if (!url) return;
      try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${authToken}` } });
        if (!response.ok) throw new Error('Failed');
        const data = await response.json();
        setEarnings(data);
      } catch (e) {
        setEarnings({ totalEarnings: 0.0 });
      }
    };
    fetchEarnings();
  }, [riderId, authToken, earningsFilter]);

  // --- GROUPING LOGIC ---
  const groupedOrders = useMemo(() => {
    let filtered = orders;

    // 1. Apply Status Filter
    if (statusFilter !== 'all') {
        filtered = filtered.filter(o => o.currentStatus.toLowerCase() === statusFilter);
    }

    // 2. Apply Date Filter
    if (dateFrom) {
        filtered = filtered.filter(o => new Date(o.orderedAt) >= new Date(dateFrom));
    }
    if (dateTo) {
        // Add one day to include end date fully
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        filtered = filtered.filter(o => new Date(o.orderedAt) < endDate);
    }

    // 3. Sort by Date Descending
    filtered.sort((a, b) => new Date(b.orderedAt) - new Date(a.orderedAt));

    // 4. Group by Date Header
    const groups = {};
    filtered.forEach(order => {
        const date = new Date(order.orderedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        if (!groups[date]) groups[date] = [];
        groups[date].push(order);
    });

    return groups;
  }, [orders, statusFilter, dateFrom, dateTo]);

  const handleOrderClick = (order) => {
      setSelectedOrder(order);
      setShowDrawer(true);
  };

  const getStatusBadge = (status) => {
      let variant = 'secondary';
      if (status === 'delivered' || status === 'completed') variant = 'success';
      else if (status === 'cancelled') variant = 'danger';
      else if (status === 'returned') variant = 'warning';
      
      return <Badge bg={variant} className="status-badge-history">{status}</Badge>;
  };

  // Navigation & Logout (Reused)
  const navigateToDashboard = () => navigate("/rider/home");
  const navigateToHistory = () => navigate("/rider/riderhistory");
  const navigateToNotifications = () => navigate("/rider/notifications");
  const handleLogout = () => {
    localStorage.clear();
    window.location.replace("http://localhost:4002/");
  };

  return (
    <div className="rider-dashboard-container">
      <RiderSidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        navigateToDashboard={navigateToDashboard}
        navigateToHistory={navigateToHistory}
        navigateToNotifications={navigateToNotifications}
        handleLogout={handleLogout}
        userName={userName}
        userRole={userRole}
        riderName={riderName}
        riderPhone={riderPhone}
      />

      <div className="main-content">
        {window.innerWidth > 991 && (
             <RiderHeaderSummary
             currentDateFormatted={currentDateFormatted}
             isSidebarOpen={isSidebarOpen}
             setIsSidebarOpen={setIsSidebarOpen}
             getGreeting={getGreeting}
             userRole={userRole || "Rider"}
             userName={userName || riderName}
             dropdownOpen={dropdownOpen}
             setDropdownOpen={setDropdownOpen}
             handleLogout={handleLogout}
             riderName={riderName}
             orders={orders}
             earningsFilter={earningsFilter}
             setEarningsFilter={setEarningsFilter}
             earnings={earnings}
             pageTitle="History"
           />
        )}

        {/* --- HISTORY PAGE CONTENT --- */}
        <div className="history-content-wrapper">
            
            {/* ADDED: Mobile Page Title (Visible only on mobile/tablet) */}
            <h2 className="mobile-page-title d-lg-none">History</h2>

            {/* Filters Header */}
            <div className="history-filters-card">
                <h5 className="history-title"><FaClock /> Delivery History</h5>
                <div className="filters-row">
                    <div className="filter-group">
                        <Form.Select size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="status-select">
                            <option value="all">All Status</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="returned">Returned</option>
                        </Form.Select>
                    </div>
                    <div className="filter-group date-group">
                        <Form.Control type="date" size="sm" placeholder="From" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                        <span className="to-text">to</span>
                        <Form.Control type="date" size="sm" placeholder="To" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Orders List */}
            <div className="history-list-container">
                {loading ? (
                    <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                ) : Object.keys(groupedOrders).length === 0 ? (
                    <div className="no-data-placeholder">
                        <FaBoxOpen className="no-data-icon" />
                        <p>No delivery history found.</p>
                    </div>
                ) : (
                    Object.keys(groupedOrders).map(dateKey => (
                        <div key={dateKey} className="history-date-group">
                            <div className="date-header">{dateKey}</div>
                            <div className="date-group-list">
                                {groupedOrders[dateKey].map(order => (
                                    <div key={order.id} className="history-item-card" onClick={() => handleOrderClick(order)}>
                                        <div className="history-item-left">
                                            <div className={`status-indicator ${order.currentStatus}`}>
                                                {order.currentStatus === 'delivered' ? <FaCheckCircle /> : <FaTimesCircle />}
                                            </div>
                                            <div className="history-info">
                                                <div className="customer-name">{order.customerName}</div>
                                                <div className="order-meta">
                                                    {new Date(order.orderedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • #{order.id}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="history-item-right">
                                            <div className="order-total">₱{order.total?.toFixed(2)}</div>
                                            <FaChevronRight className="arrow-icon" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>

      <RiderMobileNav
        navigateToDashboard={navigateToDashboard}
        navigateToHistory={navigateToHistory}
        navigateToNotifications={navigateToNotifications}
        handleLogout={handleLogout}
        userName={userName}
        userRole={userRole}
        riderName={riderName}
        riderPhone={riderPhone}
      />

      {/* --- ORDER DETAILS DRAWER (Offcanvas) --- */}
      <Offcanvas show={showDrawer} onHide={() => setShowDrawer(false)} placement="end" className="history-drawer">
        <Offcanvas.Header closeButton>
            <Offcanvas.Title>Order Details</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
            {selectedOrder && (
                <div className="drawer-content">
                    <div className="drawer-status-section text-center mb-4">
                        {getStatusBadge(selectedOrder.currentStatus)}
                        <h3 className="drawer-total mt-2">₱{selectedOrder.total?.toFixed(2)}</h3>
                        <div className="text-muted small">{new Date(selectedOrder.orderedAt).toLocaleString()}</div>
                    </div>

                    <div className="drawer-section">
                        <h6 className="drawer-label"><FaUser /> Customer</h6>
                        <div className="drawer-value">{selectedOrder.customerName}</div>
                        <div className="drawer-sub">{selectedOrder.phone}</div>
                    </div>

                    <div className="drawer-section">
                        <h6 className="drawer-label"><FaMapMarkerAlt /> Delivery Address</h6>
                        <div className="drawer-value">{selectedOrder.address}</div>
                    </div>

                    <div className="drawer-section">
                        <h6 className="drawer-label"><FaReceipt /> Order Summary</h6>
                        <div className="drawer-items-list">
                            {selectedOrder.items && selectedOrder.items.map((item, idx) => (
                                <div key={idx} className="drawer-item-row">
                                    <span className="item-qty">{item.quantity}x</span>
                                    <span className="item-name">{item.name}</span>
                                    <span className="item-price">₱{item.price.toFixed(2)}</span>
                                </div>
                            ))}
                             <div className="drawer-item-row fee-row">
                                    <span>Delivery Fee</span>
                                    <span>₱{Number(selectedOrder.deliveryFee || selectedOrder.delivery_fee || Math.max(0, (selectedOrder.total || 0) - (selectedOrder.items?.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0) || 0))).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                     <div className="drawer-section">
                        <h6 className="drawer-label"><FaMoneyBillWave /> Payment</h6>
                        <div className="drawer-value">{selectedOrder.paymentMethod || "Cash on Delivery"}</div>
                    </div>
                    
                    {selectedOrder.notes && (
                        <div className="drawer-note">
                            <strong>Note:</strong> {selectedOrder.notes}
                        </div>
                    )}
                </div>
            )}
        </Offcanvas.Body>
      </Offcanvas>

    </div>
  );
}

export default RiderHistory;