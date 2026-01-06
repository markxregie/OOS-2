import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { FaBell, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaMoneyBillWave, FaBox, FaCheckDouble, FaEye } from 'react-icons/fa'; // Added FaCheckDouble, FaEye
import { Button } from 'react-bootstrap'; // Ensure Button is imported
import './ridernotifications.css'; 
import RiderSidebar from "./RiderSidebar";
import RiderMobileNav from "./RiderMobileNav";
import RiderHeaderSummary from "./RiderHeaderSummary";

const RiderNotifications = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 991);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [authToken, setAuthToken] = useState(localStorage.getItem("authToken"));
  const [riderId, setRiderId] = useState(localStorage.getItem("riderId") || "");
  const [riderName, setRiderName] = useState(localStorage.getItem("riderName") || "");
  const [riderPhone, setRiderPhone] = useState(localStorage.getItem("riderPhone") || "");

  const [orders, setOrders] = useState([]);
  const [earnings, setEarnings] = useState({ totalEarnings: 0.0 });
  const [earningsFilter, setEarningsFilter] = useState("Daily");

  const [notifications, setNotifications] = useState([]);
  const [ws, setWs] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 991);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // --- FETCH ORDERS ---
  useEffect(() => {
    const fetchOrders = async () => {
      if (!riderId || !authToken) return;
      try {
        const response = await fetch(`http://localhost:7004/delivery/rider/${riderId}/orders`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setOrders(data);
      } catch (e) {
        console.error('Failed to fetch orders:', e);
      }
    };
    fetchOrders();
  }, [riderId, authToken]);

  const currentDateFormatted = currentDate.toLocaleString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "numeric",
  });

  const getGreeting = () => {
    const hour = currentDate.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Navigation Handlers
  const navigateToDashboard = () => navigate("/rider/home");
  const navigateToHistory = () => navigate("/rider/riderhistory");
  const navigateToNotifications = () => navigate("/rider/notifications");
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "http://localhost:4002/";
  };

  // --- FETCH EARNINGS ---
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

  // --- FETCH NOTIFICATIONS ---
  const fetchNotifications = async () => {
    if (!riderId || !authToken) return;
    try {
      const response = await fetch(`http://localhost:7002/notifications/${riderId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      // Transform API data to match UI format
      const transformedNotifications = data.map(notif => ({
        id: notif.id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        date: new Date(notif.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        time: new Date(notif.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }),
        read: notif.isRead
      }));
      setNotifications(transformedNotifications);
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [riderId, authToken]);

  // --- WEBSOCKET CONNECTION ---
  useEffect(() => {
    if (!riderId || !authToken) return;

    const wsUrl = `ws://localhost:7002/ws/notifications/${riderId}?token=${encodeURIComponent(authToken)}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected for notifications');
      setWs(websocket);
    };

    websocket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      console.log('Received notification:', data);
      // Refetch notifications to ensure UI updates with latest data
      await fetchNotifications();
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setWs(null);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [riderId, authToken]);

  // --- MARK AS READ LOGIC ---
  const markAsRead = async (id) => {
    try {
      const response = await fetch(`http://localhost:7002/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        setNotifications(notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
        ));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length === 0) return;

      const promises = unreadIds.map(id =>
        fetch(`http://localhost:7002/notifications/${id}/read`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
      );

      await Promise.all(promises);
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Helper to group by date
  const groupedNotifications = notifications.reduce((groups, notif) => {
    const date = notif.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notif);
    return groups;
  }, {});

  // Calculate unread notification count
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <div className="notif-icon-bg success"><FaCheckCircle /></div>;
      case 'warning':
        return <div className="notif-icon-bg warning"><FaExclamationTriangle /></div>;
      case 'money':
         return <div className="notif-icon-bg success"><FaMoneyBillWave /></div>;
      case 'info':
      default:
        return <div className="notif-icon-bg info"><FaInfoCircle /></div>;
    }
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
      />

      <div className="main-content">
        {window.innerWidth > 991 && (
            <RiderHeaderSummary
                currentDateFormatted={currentDateFormatted}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                getGreeting={getGreeting}
                userRole="Rider"
                userName={riderName}
                dropdownOpen={dropdownOpen}
                setDropdownOpen={setDropdownOpen}
                handleLogout={handleLogout}
                riderName={riderName}
                orders={orders}
                earningsFilter={earningsFilter}
                setEarningsFilter={setEarningsFilter}
                earnings={earnings}
                pageTitle="Notifications"
            />
        )}

        <div className="rider-notifications-container">
           {/* Header Actions */}
           <div className="d-flex justify-content-between align-items-center mb-3">
                {/* Mobile Title */}
                <h2 className="mobile-page-title d-lg-none m-0">Notifications</h2>
                
                {/* Mark All Read Button (Visible on both) */}
                {notifications.some(n => !n.read) && (
                    <Button 
                        variant="link" 
                        className="mark-all-btn p-0 text-decoration-none" 
                        onClick={markAllAsRead}
                        style={{ fontSize: '0.9rem', color: '#4a9ba5', fontWeight: '600' }}
                    >
                        <FaCheckDouble className="me-1" /> Mark all read
                    </Button>
                )}
           </div>

          <div className="notifications-content-wrapper">
            {Object.keys(groupedNotifications).length === 0 ? (
              <div className="no-notifications">
                <div className="empty-icon-container">
                    <FaBell />
                </div>
                <h3>All Caught Up!</h3>
                <p>You have no new notifications at the moment.</p>
              </div>
            ) : (
              Object.keys(groupedNotifications).map((dateGroup) => (
                <div key={dateGroup} className="notification-date-group">
                  <h6 className="date-group-header">{dateGroup}</h6>
                  <div className="notification-list">
                    {groupedNotifications[dateGroup].map((notification) => (
                      <div
                        key={notification.id}
                        className={`notification-card ${!notification.read ? 'unread' : ''}`}
                        onClick={() => { if (!notification.read) markAsRead(notification.id); navigateToDashboard(); }} // Mark as read if unread and navigate to home
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="notification-left">
                            {getIcon(notification.type)}
                        </div>
                        <div className="notification-center">
                            <div className="notif-header-row">
                                <h5 className="notif-title">{notification.title}</h5>
                                <span className="notif-time">{notification.time}</span>
                            </div>
                            <p className="notif-message">{notification.message}</p>
                        </div>
                        
                        {/* Action / Indicator Area */}
                        <div className="notification-right d-flex flex-column align-items-end gap-2">
                            {!notification.read && <div className="unread-dot"></div>}
                            
                            {/* Mobile "Mark Read" Icon Button (Optional explicit action) */}
                            {!notification.read && (
                                <div 
                                    className="mark-read-icon d-lg-none" 
                                    onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                                    title="Mark as Read"
                                >
                                    <FaEye size={12} color="#4a9ba5" />
                                </div>
                            )}
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
        userName={riderName}
        riderName={riderName}
      />
    </div>
  );
};

export default RiderNotifications;