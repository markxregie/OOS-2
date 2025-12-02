import React from 'react';
import { FaHome, FaHistory, FaSignOutAlt } from "react-icons/fa";
import logoImage from "../../assets/logo.png";

const RiderSidebar = ({ isSidebarOpen, setIsSidebarOpen, navigateToDashboard, navigateToHistory, handleLogout }) => {
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
            <li onClick={handleLogout} style={{ cursor: 'pointer' }}>
              <FaSignOutAlt />
              {isSidebarOpen && <span>Logout</span>}
            </li>
          </ul>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar - ONLY visible on mobile via CSS media query */}
      <div className="mobile-bottom-nav">
        <ul className="bottom-nav-menu">
          <li onClick={navigateToDashboard} style={{ cursor: 'pointer' }}>
            <FaHome />
            <span>Dashboard</span>
          </li>
          <li onClick={navigateToHistory} style={{ cursor: 'pointer' }}>
            <FaHistory />
            <span>History</span>
          </li>
          <li onClick={handleLogout} style={{ cursor: 'pointer' }}>
            <FaSignOutAlt />
            <span>Logout</span>
          </li>
        </ul>
      </div>
    </>
  );
};

export default RiderSidebar;
