import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Notification.css';
const Notification = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState(() => {
    const stored = localStorage.getItem("userData");
    if (stored) {
      try {
        return JSON.parse(stored).username;
      } catch {
        return "";
      }
    }
    return "";
  });

  // --- Fetch from backend when component mounts ---
  useEffect(() => {
    if (!username) return;
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch(`http://localhost:7002/notifications/${username}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch notifications");
        const data = await res.json();

        if (Array.isArray(data)) {
          const normalized = data.map(n => ({
            ...n,
            createdAt: n.createdAt, // normalize field name
            order_id: n.orderId || n.order_id, // normalize order_id field
          }));
          normalized.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setNotifications(normalized);
        } else {
          console.error("Unexpected notification response:", data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [username]);

  // --- Connect WebSocket for live updates ---
  useEffect(() => {
    if (!username) return;

    const token = localStorage.getItem("authToken");
    const socket = new WebSocket(`ws://localhost:7002/ws/notifications/${username}?token=${token}`);

    socket.onopen = () => console.log("🔌 Connected to Notification WebSocket");

    socket.onmessage = (event) => {
      const notif = JSON.parse(event.data);
      console.log("📩 Live update from WebSocket:", notif);

      setNotifications((prev) => {
        // Check if a notification already exists for this order_id
        const existingIndex = prev.findIndex((n) => n.order_id === notif.order_id);

        const now = new Date().toISOString();

        if (existingIndex !== -1) {
          // 🔁 Update the existing one (new message, new time)
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            title: notif.title,
            message: notif.message,
            type: notif.type,
            isRead: false,
            createdAt: now,
          };

          // Move updated item to the top of the list
          const [updatedItem] = updated.splice(existingIndex, 1);
          return [updatedItem, ...updated];
        } else {
          // 🆕 If new order, prepend to list
          return [
            {
              id: Date.now(),
              order_id: notif.order_id,
              title: notif.title,
              message: notif.message,
              type: notif.type,
              createdAt: now,
              isRead: false,
            },
            ...prev,
          ];
        }
      });
    };

    socket.onclose = () => console.log("❌ Disconnected from Notification WebSocket");
    socket.onerror = (err) => console.error("⚠️ WebSocket error:", err);

    return () => socket.close();
  }, [username]);

  // --- Mark all notifications as read (DB + UI) ---
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("authToken");
      await Promise.all(
        notifications.map((n) =>
          fetch(`http://localhost:7002/notifications/${n.id}/read`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        )
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // --- Handle notification click ---
  const handleNotificationClick = async (notification) => {
    // Mark as read
    await markAsRead(notification.id);
    // Navigate to track order if it's an order-related notification
    if (notification.order_id) {
      navigate(`/profile/orderhistory/${notification.order_id}`);
    }
  };

  // --- Mark one as read ---
  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("authToken");
      await fetch(`http://localhost:7002/notifications/${id}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) return <div className="text-center mt-5">Loading notifications...</div>;

  return (
    <div className="notification-container container mt-5">
      <div className="notification-header d-flex justify-content-between align-items-center mb-3">
        <h2 className="notification-title mb-0">
          Notifications{" "}
          {unreadCount > 0 && (
            <span className="notification-badge badge bg-danger">{unreadCount}</span>
          )}
        </h2>
        <button
          className="notification-mark-all btn btn-sm btn-outline-primary"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
        >
          Mark All as Read
        </button>
      </div>

      <div className="notification-list list-group">
        {notifications.length === 0 ? (
          <div className="notification-empty text-center py-4 text-muted">
            No notifications available
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item list-group-item list-group-item-action ${
                !notification.isRead ? "notification-unread list-group-item-primary" : ""
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="d-flex w-100 justify-content-between">
                <h5 className="notification-item-title mb-1">
                  {notification.title}
                  {!notification.isRead && (
                    <span className="notification-dot ms-2">•</span>
                  )}
                </h5>
                <small className="notification-time text-muted">
                  {new Date(notification.createdAt).toLocaleString()}
                </small>
              </div>
              <p className="notification-message mb-1">{notification.message}</p>
              <small className="notification-type badge bg-secondary">
                {notification.type}
              </small>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notification;
