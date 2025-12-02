import React from 'react';
import { Form } from "react-bootstrap";
import { FaChevronDown, FaBell, FaBoxOpen, FaCheckCircle, FaBars, FaUndo, FaSignOutAlt, FaWallet } from "react-icons/fa";
import riderImage from "../../assets/rider.jpg";
import './RiderHeaderSummary.css'; 

const RiderHeaderSummary = ({
  currentDateFormatted,
  isSidebarOpen,
  setIsSidebarOpen,
  getGreeting,
  userRole,
  userName,
  dropdownOpen,
  setDropdownOpen,
  handleLogout,
  orders,
  earningsFilter,
  setEarningsFilter,
  calculateEarnings
}) => {

  const activeCount = orders.filter(order => !["delivered", "completed", "cancelled", "returned"].includes(order.currentStatus)).length;
  const completedCount = orders.filter(order => ["delivered", "completed"].includes(order.currentStatus)).length;

  return (
    <div className="rider-header-summary-container">
      <header className="manage-header rider-header">
        <div className="header-left">
          {window.innerWidth > 991 && (
            <button
              className="menu-toggle"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <FaBars />
            </button>
          )}
          <h2 className="page-title">Dashboard</h2>
        </div>
        
        <div className="header-right">
          <div className="header-date d-none d-lg-block">{currentDateFormatted}</div>
          
          {/* Desktop Profile Section */}
          <div className="header-profile d-none d-lg-flex">
            <div className="bell-icon"><FaBell className="bell-outline" /></div>
            <div className="profile-pic" style={{ backgroundImage: `url(${riderImage})` }}></div>
            <div className="profile-info">
              <div className="profile-role">{getGreeting()}! I'm {userRole}</div>
              <div className="profile-name">{userName}</div>
            </div>
            <div className="dropdown-icon" onClick={() => setDropdownOpen(!dropdownOpen)}>
              <FaChevronDown className={dropdownOpen ? "icon-rotated" : ""} />
              {dropdownOpen && (
                <div className="profile-dropdown">
                  <ul className="dropdown-menu-list">
                    <li onClick={() => window.location.reload()}><FaUndo /> Refresh</li>
                    <li onClick={handleLogout}><FaSignOutAlt /> Logout</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Profile Icon */}
          <div className="d-flex d-lg-none align-items-center gap-3">
             <div className="mobile-bell-icon"><FaBell /></div>
             <div className="mobile-profile-icon" onClick={() => setDropdownOpen(!dropdownOpen)}>
                <img src={riderImage} alt="Profile" className="mobile-avatar" />
             </div>
          </div>
        </div>
      </header>

      {/* --- UNIFIED STATS STRIP --- */}
      <div className="stats-summary-strip">
        {/* Active Orders */}
        <div className="stat-card">
          <div className="stat-icon-wrapper active-icon">
            <FaBoxOpen />
          </div>
          <div className="stat-content">
            <span className="stat-value">{activeCount}</span>
            <span className="stat-label">
                {/* Desktop Text */}
                <span className="d-none d-lg-inline">Active Orders</span>
                {/* Mobile Text */}
                <span className="d-lg-none">Active</span>
            </span>
          </div>
        </div>

        {/* Completed Orders */}
        <div className="stat-card">
          <div className="stat-icon-wrapper success-icon">
            <FaCheckCircle />
          </div>
          <div className="stat-content">
            <span className="stat-value">{completedCount}</span>
            <span className="stat-label">
                {/* Desktop Text */}
                <span className="d-none d-lg-inline">Completed</span>
                {/* Mobile Text */}
                <span className="d-lg-none">Done</span>
            </span>
          </div>
        </div>

        {/* Earnings */}
        <div className="stat-card earnings-card">
          <div className="stat-icon-wrapper warning-icon">
            <FaWallet />
          </div>
          <div className="stat-content">
            <div className="earnings-top">
                <span className="stat-value">₱{calculateEarnings()}</span>
                <select 
                    className="stats-filter-select" 
                    value={earningsFilter} 
                    onChange={(e) => setEarningsFilter(e.target.value)}
                >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                </select>
            </div>
            {/* Label hidden on mobile using d-none d-lg-inline */}
            <span className="stat-label d-none d-lg-inline">Total Earnings</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiderHeaderSummary;