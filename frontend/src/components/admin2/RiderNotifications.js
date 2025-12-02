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

  const calculateEarnings = (filter) => {
    const now = new Date();
    let startDate;
    if (filter === 'Daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (filter === 'Weekly') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (filter === 'Monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    const completedOrders = orders.filter(order => {
      const orderDate = new Date(order.orderedAt);
      return ["delivered", "completed"].includes(order.currentStatus) && orderDate >= startDate;
    });
    const total = completedOrders.length * 50; // Assuming fixed delivery fee of ₱50 per completed order
    return total.toFixed(2);
  };

  // --- NOTIFICATION DATA (Grouped Logic) ---
  // Ideally, this comes from an API endpoint like /notifications
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'info',
      title: 'New Order Assigned',
      message: 'Order #105 has been assigned to you. Please proceed to pickup.',
      date: 'Today',
      time: '10:30 AM',
      read: false
    },
    {
      id: 2,
      type: 'success',
      title: 'Tip Received',
      message: 'Customer from Order #98 sent you a tip of ₱50.00!',
      date: 'Today',
      time: '09:15 AM',
      read: true
    },
    {
      id: 3,
      type: 'warning',
      title: 'Heavy Traffic Alert',
      message: 'High congestion reported near Quezon Ave. Expect delays.',
      date: 'Yesterday',
      time: '05:45 PM',
      read: true
    },
    {
      id: 4,
      type: 'success',
      title: 'Weekly Payout',
      message: 'Your earnings of ₱4,250.00 for last week have been processed.',
      date: 'Yesterday',
      time: '08:00 AM',
      read: true
    },
    {
        id: 5,
        type: 'info',
        title: 'System Update',
        message: 'The rider app will undergo maintenance on Sunday at 2 AM.',
        date: 'Dec 01, 2025',
        time: '12:00 PM',
        read: true
      }
  ]);

  // --- MARK AS READ LOGIC ---
  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
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
                calculateEarnings={calculateEarnings}
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
                        onClick={() => !notification.read && markAsRead(notification.id)} // Allow clicking card to read
                        style={{ cursor: !notification.read ? 'pointer' : 'default' }}
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