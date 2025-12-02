import React from 'react';
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
            <li onClick={navigateToNotifications} style={{ cursor: 'pointer' }}>
              <FaBell />
              {isSidebarOpen && <span>Notifications</span>}
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
