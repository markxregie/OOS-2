import React from 'react';
import { FaHome, FaHistory, FaBell, FaSignOutAlt } from "react-icons/fa";

function RiderMobileNav({ navigateToDashboard, navigateToHistory, navigateToNotifications, handleLogout }) {
  return (
    <div className="mobile-bottom-nav">
      <ul className="bottom-nav-menu">
        <li className="active" onClick={navigateToDashboard} style={{ cursor: 'pointer' }}>
          <FaHome />
          <span>Dashboard</span>
        </li>
        <li onClick={navigateToHistory} style={{ cursor: 'pointer' }}>
          <FaHistory />
          <span>History</span>
        </li>
        <li onClick={navigateToNotifications} style={{ cursor: 'pointer' }}>
          <FaBell />
          <span>Notifications</span>
        </li>
        <li onClick={handleLogout} style={{ cursor: 'pointer' }}>
          <FaSignOutAlt />
          <span>Logout</span>
        </li>
      </ul>
    </div>
  );
}

export default RiderMobileNav;
