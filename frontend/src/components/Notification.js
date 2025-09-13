import React, { useState } from 'react';
import './Notification.css'; // Custom styles for Notification component

const Notification = () => {
  const [notifications, setNotifications] = useState([]);

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({
      ...notification,
      isRead: true
    })));
  };

  // Mark single notification as read
  const markAsRead = (id) => {
    setNotifications(notifications.map(notification => 
      notification.id === id ? { ...notification, isRead: true } : notification
    ));
  };

  // Filter unread notifications count
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="notification-container container mt-5">
      <div className="notification-header d-flex justify-content-between align-items-center mb-3">
        <h2 className="notification-title mb-0">
          Notifications {unreadCount > 0 && (
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
          notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-item list-group-item list-group-item-action ${
                !notification.isRead ? 'notification-unread list-group-item-primary' : ''
              }`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="d-flex w-100 justify-content-between">
                <h5 className="notification-item-title mb-1">
                  {notification.title}
                  {!notification.isRead && (
                    <span className="notification-dot ms-2">•</span>
                  )}
                </h5>
                <small className="notification-time text-muted">
                  {notification.time}
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