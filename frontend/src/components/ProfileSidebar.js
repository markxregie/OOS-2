import React from 'react';
import { NavLink } from 'react-router-dom';
import './ProfileSidebar.css';

function ProfileSidebar() {
  return (
    <div className="d-flex">
      {/* Left Navigation */}
      <div className="d-flex flex-column flex-shrink-0 p-3 bg-light profile-sidebar-container" style={{width: "280px", height: "calc(100vh - 56px)", marginTop: "56px"}}>
        <NavLink to="/" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto link-dark text-decoration-none" style={{ backgroundColor: 'transparent' }}>
          <span className="fs-4">Menu</span>
        </NavLink>
        <hr/>
        <ul className="nav nav-pills flex-column mb-auto">
          <li className="nav-item">
            <NavLink to="/profile" end className={({ isActive }) => "profilesidebar-nav-link" + (isActive ? " active" : "")} aria-current="page">
              Profile
            </NavLink>
          </li>
          <li>
            <NavLink to="/profile/orderhistory" className={({ isActive }) => "profilesidebar-nav-link" + (isActive ? " active" : "")}>
              Order History
            </NavLink>
          </li>
          <li>
            <NavLink to="/profile/notification" className={({ isActive }) => "profilesidebar-nav-link" + (isActive ? " active" : "")}>
              Notifications
            </NavLink>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default ProfileSidebar;
