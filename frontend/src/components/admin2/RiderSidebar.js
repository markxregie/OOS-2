import React, { useState, useEffect } from 'react';
import { FaHome, FaHistory, FaSignOutAlt, FaBell } from "react-icons/fa";
import logoImage from "../../assets/logo.png";
import RiderMobileNav from "./RiderMobileNav";

const RiderSidebar = ({
  isSidebarOpen,
  setIsSidebarOpen,
  navigateToDashboard,
  navigateToHistory,
  navigateToNotifications,
  handleLogout,
  userName,
  userRole,
  riderName, // Added riderName to receive from parent
  riderPhone
}) => {

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [ws, setWs] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem("authToken"));
  const [riderId, setRiderId] = useState(localStorage.getItem("riderId") || "");

  // Calculate unread notification count
  const unreadCount = notifications.filter(n => !n.read).length;

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
      console.log('WebSocket connected for notifications (sidebar)');
      setWs(websocket);
    };

    websocket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      console.log('Received notification (sidebar):', data);

      // Play notification sound and show browser notification
      try {
        // Try to play audio
        const audio = new Audio('/Sound/mixkit-bell-notification-933.wav');
        audio.volume = 0.5; // Set volume to 50%
        const playPromise = audio.play();

        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log('Audio autoplay blocked, trying browser notification');
            // Fallback to browser notification if audio is blocked
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Notification', {
                body: data.message || 'You have a new notification',
                icon: '/images/nav.png'
              });
            }
          });
        }
      } catch (e) {
        console.log('Audio setup failed:', e);
      }

      // Request notification permission if not already granted
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      // Refetch notifications to ensure UI updates with latest data
      await fetchNotifications();
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected (sidebar)');
      setWs(null);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error (sidebar):', error);
    };

    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [riderId, authToken]);
  return (
    <>
      {/* Desktop Sidebar - Conditionally rendered for desktop view */}
      {isSidebarOpen && window.innerWidth > 991 && (
        <div className="sidebar desktop-sidebar">
          <div className="sidebar-header">
            <img src={logoImage} alt="Logo" className="logo" />
          </div>
          <ul className="sidebar-menu">
            <li onClick={navigateToDashboard} style={{ cursor: 'pointer' }}>
              <FaHome />
              {isSidebarOpen && <span>Dashboard</span>}
            </li>
            <li onClick={navigateToHistory} style={{ cursor: 'pointer' }}>
              <FaHistory />
              {isSidebarOpen && <span>History</span>}
            </li>
            <li onClick={navigateToNotifications} style={{ cursor: 'pointer', position: 'relative' }}>
              <FaBell />
              {isSidebarOpen && <span>Notifications</span>}
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-5px',
                    right: isSidebarOpen ? '5px' : '10px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    border: '2px solid white',
                    zIndex: 10
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </li>
            <li onClick={handleLogout} style={{ cursor: 'pointer' }}>
              <FaSignOutAlt />
              {isSidebarOpen && <span>Logout</span>}
            </li>
          </ul>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar - Using RiderMobileNav component */}
      <RiderMobileNav
        navigateToDashboard={navigateToDashboard}
        navigateToHistory={navigateToHistory}
        navigateToNotifications={navigateToNotifications}
        handleLogout={handleLogout}
        userName={userName}
        userRole={userRole}
        riderName={riderName || userName} // Pass riderName, fallback to userName
        riderPhone={riderPhone}
      />
    </>
  );
};

export default RiderSidebar;
