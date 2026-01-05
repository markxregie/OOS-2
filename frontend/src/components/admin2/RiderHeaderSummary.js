import React, { useState } from 'react';
import { Form, Offcanvas, Button } from "react-bootstrap"; // Added Offcanvas, Button
import { FaChevronDown, FaBoxOpen, FaCheckCircle, FaBars, FaUndo, FaSignOutAlt, FaWallet, FaUser, FaPhone } from "react-icons/fa";
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
  pageTitle = "Dashboard",
  riderName, // Make sure riderName is passed/available
  earnings,
  riderPhone // Pass riderPhone as prop if available, or use placeholder
}) => {

  const activeCount = orders.filter(order => !["delivered", "completed", "cancelled", "returned"].includes(order.currentStatus)).length;
  const completedCount = orders.filter(order => ["delivered", "completed"].includes(order.currentStatus)).length;

  // --- NEW STATE FOR MOBILE DRAWER ---
  const [showMobileProfile, setShowMobileProfile] = useState(false);

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
          <h2 className="page-title">{pageTitle}</h2>
        </div>
        
        <div className="header-right">
          <div className="header-date d-none d-lg-block">{currentDateFormatted}</div>
          
          {/* Desktop Profile Section */}
          <div className="header-profile d-none d-lg-flex">
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
             {/* UPDATED: Click opens Drawer instead of Dropdown */}
             <div className="mobile-profile-icon" onClick={() => setShowMobileProfile(true)}>
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
                <span className="d-none d-lg-inline">Active Orders</span>
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
                <span className="d-none d-lg-inline">Completed</span>
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
                <span className="stat-value">₱{earnings?.totalEarnings?.toFixed(2) || "0.00"}</span>
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
            <span className="stat-label d-none d-lg-inline">Total Earnings</span>
          </div>
        </div>
      </div>

      {/* --- MOBILE PROFILE DRAWER (OFFCANVAS) --- */}
      <Offcanvas 
        show={showMobileProfile} 
        onHide={() => setShowMobileProfile(false)} 
        placement="end"
        className="mobile-profile-drawer d-lg-none" // Hide on desktop just in case
        style={{ width: '85%', borderTopLeftRadius: '20px', borderBottomLeftRadius: '20px' }}
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title style={{ fontWeight: 'bold', color: '#2c3e50' }}>My Profile</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column">
            <div className="text-center mb-4">
                <img 
                    src={riderImage} 
                    alt="Rider Profile" 
                    style={{ width: '100px', height: '100px', borderRadius: '50%', border: '4px solid #f0f0f0', marginBottom: '15px' }} 
                />
                <h4 style={{ fontWeight: '800', color: '#2c3e50', marginBottom: '5px' }}>{userName || riderName}</h4>
                <span className="badge bg-info text-dark">{userRole || "Rider"}</span>
            </div>

            <div className="profile-details p-3 mb-4" style={{ backgroundColor: '#f8f9fa', borderRadius: '12px' }}>
                <div className="d-flex align-items-center mb-3">
                    <FaUser className="text-secondary me-3" />
                    <div>
                        <div className="small text-muted">Full Name</div>
                        <div style={{ fontWeight: '600' }}>{userName || riderName}</div>
                    </div>
                </div>
                {/* You can pass riderPhone as a prop if you have it */}
                 <div className="d-flex align-items-center">
                    <FaPhone className="text-secondary me-3" />
                    <div>
                        <div className="small text-muted">Phone</div>
                        <div style={{ fontWeight: '600' }}>{riderPhone || "N/A"}</div> 
                    </div>
                </div>
            </div>

            <div className="mt-auto">
                <Button 
                    variant="outline-primary" 
                    className="w-100 mb-3 d-flex align-items-center justify-content-center gap-2"
                    onClick={() => window.location.reload()}
                    style={{ padding: '12px', borderRadius: '10px' }}
                >
                    <FaUndo /> Refresh App
                </Button>
                <Button 
                    variant="danger" 
                    className="w-100 d-flex align-items-center justify-content-center gap-2"
                    onClick={handleLogout}
                    style={{ padding: '12px', borderRadius: '10px', fontWeight: 'bold' }}
                >
                    <FaSignOutAlt /> Logout
                </Button>
            </div>
        </Offcanvas.Body>
      </Offcanvas>

    </div>
  );
};

export default RiderHeaderSummary;