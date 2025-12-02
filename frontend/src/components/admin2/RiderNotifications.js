import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { FaBell, FaCheckCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import './ridernotifications.css'; // We'll create this CSS file for styling
import RiderSidebar from "./RiderSidebar";

import Swal from 'sweetalert2';

const RiderNotifications = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 991);

  const [authToken, setAuthToken] = useState(localStorage.getItem("authToken"));
  const [riderId, setRiderId] = useState(localStorage.getItem("riderId") || "");
  const [riderName, setRiderName] = useState(localStorage.getItem("riderName") || "");
  const [riderPhone, setRiderPhone] = useState(localStorage.getItem("riderPhone") || "");
  const [userLoading, setUserLoading] = useState(true);

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
      setUserLoading(true);
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
          const fallbackName = (data.fullName && data.fullName.trim() !== "")
            ? data.fullName
            : (data.username && data.username.trim() !== "")
              ? data.username
              : "Rider";
          const fallbackPhone = data.phone || "";

          setRiderId(userId);
          localStorage.setItem("riderId", userId);

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
          setUserLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch user info:", err);
          setUserLoading(false);
        });
    }
  }, [authToken]);

  const navigateToDashboard = () => {
    navigate("/rider/home");
  };

  const navigateToHistory = () => {
    navigate("/rider/riderhistory");
  };

  const navigateToNotifications = () => {
    navigate("/rider/notifications");
  };

  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("riderId");
    localStorage.removeItem("riderName");
    localStorage.removeItem("riderPhone");
    window.location.href = "http://localhost:4002/";
  };
  // Temporary notification data
  const notifications = [
    {
      id: 1,
      type: 'info',
      title: 'New Order Assigned',
      message: 'You have been assigned a new delivery order #12345.',
      time: '2 minutes ago',
      read: false
    },
    {
      id: 2,
      type: 'success',
      title: 'Order Completed',
      message: 'Order #12344 has been successfully delivered.',
      time: '1 hour ago',
      read: true
    },
    {
      id: 3,
      type: 'warning',
      title: 'Delivery Delay',
      message: 'Order #12343 is experiencing a slight delay due to traffic.',
      time: '3 hours ago',
      read: false
    },
    {
      id: 4,
      type: 'info',
      title: 'Payment Received',
      message: 'Payment for order #12342 has been processed.',
      time: '1 day ago',
      read: true
    },
    {
      id: 5,
      type: 'success',
      title: 'Weekly Bonus Earned',
      message: 'Congratulations! You earned a weekly performance bonus.',
      time: '2 days ago',
      read: true
    }
  ];

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="notification-icon success" />;
      case 'warning':
        return <FaExclamationTriangle className="notification-icon warning" />;
      case 'info':
      default:
        return <FaInfoCircle className="notification-icon info" />;
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
        <div className="rider-notifications-container">
          <div className="notifications-header">
            <FaBell className="header-icon" />
            <h1>Notifications</h1>
          </div>

          <div className="notifications-content">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <FaBell size={48} color="#ccc" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="notifications-list">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  >
                    <div className="notification-icon-container">
                      {getIcon(notification.type)}
                    </div>
                    <div className="notification-content">
                      <div className="notification-header">
                        <h4 className="notification-title">{notification.title}</h4>
                        <span className="notification-time">{notification.time}</span>
                      </div>
                      <p className="notification-message">{notification.message}</p>
                    </div>
                    {!notification.read && <div className="unread-indicator"></div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiderNotifications;
