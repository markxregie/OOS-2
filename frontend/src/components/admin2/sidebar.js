import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar, Menu, MenuItem } from 'react-pro-sidebar';
import './sidebar.css';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars, faHome, faUtensils, faUserFriends,
  faBox, faCarrot, faCoffee, faTshirt, faEnvelope, faTruck, faMotorcycle, faChartBar, faBullhorn
} from '@fortawesome/free-solid-svg-icons';

function SidebarComponent() {
  const [collapsed, setCollapsed] = useState(false);
  const toggleSidebar = () => setCollapsed(!collapsed);
  const location = useLocation();

  return (
    <div className="sidebar-wrapper">
      {/* Sidebar Panel */}
      <Sidebar collapsed={collapsed} className={`sidebar-container ${collapsed ? 'ps-collapsed' : ''}`}>
        <div className="side-container">
          <div className={`logo-wrapper ${collapsed ? 'collapsed' : ''}`}>
            <img src={logo} alt="Logo" className="logo" />
          </div>

          
          <Menu>
            <MenuItem
              icon={<FontAwesomeIcon icon={faHome} />}
              component={<Link to="/admin/dashboard" />}
              active={location.pathname === '/admin/dashboard'}
            >
              Dashboard
            </MenuItem>
            <MenuItem
              icon={<FontAwesomeIcon icon={faCoffee} />}
              component={<Link to="/admin/manageorders" />}
              active={location.pathname === '/admin/manageorders'}
            >
              Manage Orders
            </MenuItem>
            <MenuItem
              icon={<FontAwesomeIcon icon={faTruck} />}
              component={<Link to="/admin/delivery" />}
              active={location.pathname === '/admin/delivery'}
            >
              Delivery Management
            </MenuItem>
            <MenuItem
              icon={<FontAwesomeIcon icon={faMotorcycle} />}
              component={<Link to="/admin/riderdashboard" />}
              active={location.pathname === '/admin/riderdashboard'}
            >
              Rider Dashboard
            </MenuItem>
            <MenuItem
              icon={<FontAwesomeIcon icon={faEnvelope} />}
              component={<Link to="/admin/concerns" />}
              active={location.pathname === '/admin/concerns'}
            >
              Concerns
            </MenuItem>
            <MenuItem
              icon={<FontAwesomeIcon icon={faBullhorn} />}
              component={<Link to="/admin/promotions" />}
              active={location.pathname === '/admin/promotions'}
            >
              Promotions
            </MenuItem>
            <MenuItem
              icon={<FontAwesomeIcon icon={faChartBar} />}
              component={<Link to="/admin/report" />}
              active={location.pathname === '/admin/report'}
            >
              Reports
            </MenuItem>

            
 
          </Menu>
        </div>
      </Sidebar>

      {/* TOGGLE BUTTON ON THE RIGHT OF SIDEBAR */}
      <button className="toggle-btn-right" onClick={toggleSidebar}>
        <FontAwesomeIcon icon={faBars} />
      </button>
    </div>
  );
}

export default SidebarComponent;
