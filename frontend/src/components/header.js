import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import navLogo from '../assets/nav.png';
import cartIcon from '../assets/cart.svg';
import bellIcon from '../assets/bell.svg';
import './header.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === '/';

  // Remove AuthContext usage, use local state for login detection
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Check URL query params for authorization token and store in localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('authorization');
    console.log('Token from URL:', tokenFromUrl);
    if (tokenFromUrl) {
      localStorage.setItem('authToken', tokenFromUrl);
      setIsLoggedIn(true);
      console.log('Set isLoggedIn to true');
      // Remove token from URL to clean up
      params.delete('authorization');
      const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState({}, document.title, newUrl);
    } else {
      const token = localStorage.getItem('authToken');
      console.log('Token from localStorage:', token);
      setIsLoggedIn(!!token);
      console.log('Set isLoggedIn to', !!token);
    }
  }, []);

  // New state for header visibility
  const [isVisible, setIsVisible] = useState(true);
  let lastScrollY = window.pageYOffset;

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.pageYOffset;
      if (window.innerWidth <= 576) { // mobile view only
        if (currentScrollY > lastScrollY) {
          // scrolling down
          setIsVisible(false);
        } else {
          // scrolling up
          setIsVisible(true);
        }
      } else {
        setIsVisible(true);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Notification state and functions (copied from Notification.js)
  const [notifications, setNotifications] = useState([]);

  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({
      ...notification,
      isRead: true
    })));
  };

  const markAsRead = (id) => {
    setNotifications(notifications.map(notification =>
      notification.id === id ? { ...notification, isRead: true } : notification
    ));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Scroll to a section by ID
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSectionNavigation = (e, section) => {
    if (!isHomePage) {
      e.preventDefault();
      window.scrollTo(0, 0);
      navigate('/', { state: { scrollTo: section } });
    } else {
      e.preventDefault();
      scrollToSection(section);
    }
  };

  useEffect(() => {
    if (location.state?.scrollTo) {
      const timer = setTimeout(() => {
        scrollToSection(location.state.scrollTo);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  useEffect(() => {
    if (!location.state?.scrollTo) {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    localStorage.removeItem('authToken');
    setIsLoggedIn(false);
    // Redirect to login page on frontend-auth at localhost:4002
    window.location.href = 'http://localhost:4002/';
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  // State to control notification dropdown visibility on hover
  const [showNotifications, setShowNotifications] = useState(false);
  let hideTimeout = null;

  const handleMouseEnter = () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    setShowNotifications(true);
  };

  const handleMouseLeave = () => {
    hideTimeout = setTimeout(() => {
      setShowNotifications(false);
    }, 200); // delay hiding by 200ms
  };

  return (
    <>
      <Navbar expand="lg" className={`bg-body-tertiary ${isVisible ? '' : 'header-hidden'}`}>
        <Container className="d-flex align-items-center justify-content-between">
          {/* Left - Logo */}
          <Navbar.Brand as={Link} to="/" className="me-lg-5 me-0">
            <img
              src={navLogo}
              alt="Bleu Bean Cafe"
              className="d-inline-block align-top logo-img"
            />
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="basic-navbar-nav" />

          <Navbar.Collapse id="basic-navbar-nav">
            <div className="d-flex flex-column flex-lg-row justify-content-between w-100">
              {/* Center - Nav Links */}
              <Nav className="mx-auto gap-3 nav-center">
                <Nav.Link
                  as={Link}
                  to="/"
                  onClick={(e) => {
                    if (isHomePage) {
                      e.preventDefault();
                      scrollToSection('home');
                    }
                  }}
                >
                  Home
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/menu"
                  onClick={() => window.scrollTo(0, 0)}
                >
                  Menu
                </Nav.Link>
                <Nav.Link
                  href="#about"
                  onClick={(e) => handleSectionNavigation(e, 'about')}
                >
                  About Us
                </Nav.Link>
                <Nav.Link
                  href="#services"
                  onClick={(e) => handleSectionNavigation(e, 'services')}
                >
                  Services
                </Nav.Link>
                <Nav.Link
                  href="#contact"
                  onClick={(e) => handleSectionNavigation(e, 'contact')}
                >
                  Contact Us
                </Nav.Link>
              </Nav>

              {/* Right - Cart, Notification Bell, and Auth Buttons */}
              <div className="d-flex align-items-center cart-and-buttons position-relative">
                {isLoggedIn && (
                  <Nav.Link as={Link} to="/cart" className="me-3">
                    <img src={cartIcon} alt="Cart" className="cart-img" style={{ width: '24px', height: '24px' }} />
                  </Nav.Link>
                )}

                {/* Notification Bell with hover dropdown */}
                {isLoggedIn && (
                  <div
                    className="notification-bell-container me-3 position-relative"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    style={{ cursor: 'pointer' }}
                  >
                    <img
                      src={bellIcon}
                      alt="Notifications"
                      className="notification-bell-icon"
                      style={{ width: '24px', height: '24px' }}
                    />
                    {unreadCount > 0 && (
                      <span className="notification-badge badge bg-danger position-absolute top-0 start-100 translate-middle">
                        {unreadCount}
                      </span>
                    )}

                    {showNotifications && (
                      <div
                        className="notification-dropdown position-absolute end-0 mt-2 p-3 bg-white border rounded shadow"
                        style={{ width: '320px', zIndex: 1050 }}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="mb-0" style={{ fontSize: '1rem', fontWeight: '600' }}>Notifications</h6>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={markAllAsRead}
                            disabled={unreadCount === 0}
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            Mark All as Read
                          </button>
                        </div>
                        <div
                          className="notification-list"
                          style={{ maxHeight: '300px', overflowY: 'auto' }}
                        >
                          {notifications.length === 0 ? (
                            <div className="text-center py-4 text-muted" style={{ fontSize: '0.875rem' }}>
                              No notifications available
                            </div>
                          ) : (
                            notifications.map((notification) => (
                              <div
                                key={notification.id}
                                className={`notification-item p-2 mb-2 border rounded ${
                                  !notification.isRead ? 'bg-primary bg-opacity-10' : ''
                                }`}
                                onClick={() => markAsRead(notification.id)}
                                style={{ cursor: 'pointer' }}
                              >
                                <div className="d-flex w-100 justify-content-between">
                                  <h6 className="mb-1" style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                                    {notification.title}
                                    {!notification.isRead && (
                                      <span className="notification-dot ms-2">•</span>
                                    )}
                                  </h6>
                                  <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                    {notification.time}
                                  </small>
                                </div>
                                <p className="mb-1" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>{notification.message}</p>
                                <small className="badge bg-secondary" style={{ fontSize: '0.75rem' }}>
                                  {notification.type}
                                </small>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="text-center mt-2">
                      <button
                        className="view-all-notifications-btn"
                        onClick={() => {
                          setShowNotifications(false);
                          navigate('/profile/notification');
                        }}
                      >
                        View All Notifications
                      </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!isLoggedIn ? (
                  <Nav.Link as={Link} to="http://localhost:4002">
                    <button className="btn btn-outline-primary">Sign In</button>
                  </Nav.Link>
                ) : (
                  <>
                    <Dropdown align="end" className="me-3">
                      <Dropdown.Toggle
                        variant="link"
                        id="dropdown-profile"
                        className="p-0 border-0 bg-transparent"
                      >
                        <img
                          src="https://cdn-icons-png.flaticon.com/512/149/149071.png"
                          alt="Profile"
                          className="profile-icon"
                          style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                        />
                      </Dropdown.Toggle>

                      <Dropdown.Menu>
                        <Dropdown.Item onClick={() => navigate('/profile')}>
                          Profile
                        </Dropdown.Item>
                        <Dropdown.Item onClick={handleLogoutClick}>
                          Logout
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  </>
                )}

                <Nav.Link
                  as={Link}
                  to="/menu"
                  onClick={() => window.scrollTo(0, 0)}
                >
                  <button className="btn btn-primary ms-2">Order Now</button>
                </Nav.Link>
              </div>
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Modal show={showLogoutModal} onHide={cancelLogout} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Logout</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to logout?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelLogout}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmLogout}>
            Logout
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
