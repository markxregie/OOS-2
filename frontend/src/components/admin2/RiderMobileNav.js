import React, { useState } from 'react';
import { FaHome, FaHistory, FaBell, FaUser, FaSignOutAlt, FaUndo, FaPhone } from "react-icons/fa";
import { Offcanvas, Button } from "react-bootstrap";
import riderImage from "../../assets/rider.jpg";
import './RiderHeaderSummary.css'; // Import this to reuse the exact same drawer styles

function RiderMobileNav({ 
    navigateToDashboard, 
    navigateToHistory, 
    navigateToNotifications, 
    handleLogout,
    // Added these props to populate the drawer data
    userName,
    userRole,
    riderName,
    riderPhone
}) {
  
  // State to control the drawer
  const [showMobileProfile, setShowMobileProfile] = useState(false);

  return (
    <>
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
                <li onClick={navigateToNotifications} style={{ cursor: 'pointer' }}>
                    <FaBell />
                    <span>Notifications</span>
                </li>
                <li onClick={() => setShowMobileProfile(true)} style={{ cursor: 'pointer' }}>
                    <FaUser />
                    <span>Profile</span>
                </li>
            </ul>
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

    </>
  );
}

export default RiderMobileNav;