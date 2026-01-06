import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import navLogo from '../assets/nav.png';
import shoppingIcon from '../assets/shopping.svg';
import bellIcon from '../assets/bell.svg';
import './header.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useContext } from 'react';
import Swal from 'sweetalert2';
import { CartContext } from '../contexts/CartContext';
import { AuthContext } from './AuthContext';
import { checkStoreStatus } from './storeUtils';

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === '/';
  const [isToggled, setIsToggled] = useState(false);

  const { isLoggedIn, login, logout } = useContext(AuthContext);
  const [profileImage, setProfileImage] = useState("https://cdn-icons-png.flaticon.com/512/149/149071.png");

  // Clean stray username param if not logged in & handle token from URL once
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('authorization');
    if (tokenFromUrl) {
      login({ authToken: tokenFromUrl });
      params.delete('authorization');
    }
    if (!isLoggedIn && params.has('username')) {
      params.delete('username');
    }
    const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({}, document.title, newUrl);
  }, [login, isLoggedIn]);

  // New state for header visibility
  const [isVisible, setIsVisible] = useState(true);
  let lastScrollY = window.pageYOffset;

  // State for mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 576);

  useEffect(() => {
    const handleScroll = () => {
      // Always keep header visible on scroll
      setIsVisible(true);
    };

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 576);
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Notification state and functions (copied from Notification.js)
  const [notifications, setNotifications] = useState([]);

  const markAllAsRead = async () => {
    const token = localStorage.getItem('authToken');
    const unreadNotifications = notifications.filter(n => !n.isRead);
    
    // Optimistic update - update UI immediately
    setNotifications(notifications.map(notification => ({
      ...notification,
      isRead: true
    })));
    
    // Then update backend in the background
    try {
      await Promise.all(
        unreadNotifications.map(notification =>
          fetch(`http://localhost:7002/notifications/${notification.id}/read`, {
            method: "PUT",
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })
        )
      );
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`http://localhost:7002/notifications/${id}/read`, {
        method: "PUT",
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setNotifications(notifications.map(notification =>
        notification.id === id ? { ...notification, isRead: true } : notification
      ));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
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

  // Fetch user profile image when logged in
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch('http://localhost:4000/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          console.error('Failed to fetch user profile:', response.statusText);
          return;
        }

        const data = await response.json();
        setProfileImage(data.profileImage || "https://cdn-icons-png.flaticon.com/512/149/149071.png");
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    if (isLoggedIn) {
      fetchUserProfile();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    let ws;
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("userData");
    const username = userData ? JSON.parse(userData).username : null;

    if (isLoggedIn && username && token) {
      // Fetch existing notifications from backend
      const fetchNotifications = async () => {
        const res = await fetch(`http://localhost:7002/notifications/${username}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();

        if (Array.isArray(data)) {
          data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setNotifications(data);
        } else {
          console.error("Unexpected notification response:", data);
        }
      };

      fetchNotifications();

      // Create WebSocket connection with token auth
      ws = new WebSocket(`ws://localhost:7002/ws/notifications/${username}?token=${token}`);

      ws.onopen = () => {
        console.log("✅ Connected to Notification WebSocket");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📩 Notification received:", data);

          setNotifications((prev) => [data, ...prev]);
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.onclose = (event) => {
        console.log("🔌 WebSocket closed:", event.reason);
      };

      ws.onerror = (error) => {
        console.error("⚠️ WebSocket error:", error);
      };
    }

    return () => {
      if (ws) ws.close();
    };
  }, [isLoggedIn]);

  const handleLogoutClick = () => {
    Swal.fire({
      title: 'Confirm Logout',
      text: 'Are you sure you want to logout?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Logout',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        logout();
        // Redirect to login page on frontend-auth at localhost:4002 and replace history
        window.location.replace('http://localhost:4002/');
      }
    });
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

  const { cartItems } = useContext(CartContext);
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const [isStoreOpen, setIsStoreOpen] = useState(checkStoreStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setIsStoreOpen(checkStoreStatus());
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return (
    // ADDED: d-flex and flex-column here to force vertical stacking
    <div className={`fixed-top d-flex flex-column app-header-container ${isVisible ? '' : 'header-hidden'}`} style={{ zIndex: 1030 }}>
      
      {!isStoreOpen && (
        <div className="w-100 text-center py-2 text-white d-lg-flex justify-content-lg-center align-items-lg-center" style={{ backgroundColor: '#dc3545', fontSize: '0.85rem' }}>
          <div className="me-lg-2"><strong>Store is Closed.</strong> View Only Mode.</div>
          <div>Mon-Fri: 7AM–9PM | Sat-Sun: 8AM–10PM</div>
        </div>
      )}

      <Navbar expand="lg" onToggle={(expanded) => setIsToggled(expanded)} className="bg-body-tertiary">
        <Container className="d-flex align-items-center justify-content-between">
          {/* Left - Logo */}
          <Navbar.Brand as={Link} to="/" className="me-lg-5 me-0">
            <img
              src={navLogo}
              alt="Bleu Bean Cafe"
              className="d-inline-block align-top logo-img"
            />
          </Navbar.Brand>

          {isLoggedIn && isMobile && (
            <Nav.Link as={Link} to="/cart" className="mobile-cart-icon position-relative">
              <img src={shoppingIcon} alt="Shopping Bag" className="cart-img" style={{ width: '24px', height: '24px' }} />
              {cartCount > 0 && (
                <span className="cart-badge badge bg-danger position-absolute top-0 start-100 translate-middle">
                  {cartCount}
                </span>
              )}
            </Nav.Link>
          )}

          <Navbar.Toggle
            aria-controls="basic-navbar-nav"
            className={isToggled ? 'toggled' : ''}
          />

          <Navbar.Collapse id="basic-navbar-nav">
            <div className="d-flex flex-column flex-lg-row justify-content-center justify-content-lg-between w-100 text-center">

              {/* Center - Nav Links */}
              <Nav className="gap-3 nav-center">
                {!isMobile && (
                  <>
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
                  </>
                )}
                <Nav.Link
                  as={Link}
                  to="/menu"
                  onClick={() => window.scrollTo(0, 0)}
                >
                  Menu
                </Nav.Link>

                {isLoggedIn && isMobile && (
                  <>
                    <Nav.Link onClick={() => navigate('/profile')}>Profile</Nav.Link>
                    <Nav.Link onClick={() => navigate('profile/orderhistory')}>Orders</Nav.Link>
                    <Nav.Link as={Link} to="/cart">Cart</Nav.Link>
                    <hr style={{ width: '100%', margin: '0.5rem 0' }} />
                    <Nav.Link onClick={handleLogoutClick}>Logout</Nav.Link>
                  </>
                )}

              </Nav>

              {/* Right - Auth Buttons */}
              <div className="d-flex align-items-center cart-and-buttons position-relative">

                {!isLoggedIn ? (
                  <Nav.Link as={Link} to="http://localhost:4002">
                    <button className="btn btn-outline-primary">Sign In</button>
                  </Nav.Link>
                ) : (
                  <>
                    {!isMobile && (
                      <>
                        <Nav.Item>
                          <div
                            className="notification-bell-container position-relative"
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
                                        onClick={() => {
                                          markAsRead(notification.id);
                                          navigate('/profile/notification');
                                        }}
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
                        </Nav.Item>

                        <Nav.Link
                          as={Link}
                          to="/cart"
                          className="position-relative"
                        >
                          <img src={shoppingIcon} alt="Shopping Bag" className="cart-img" style={{ width: '24px', height: '24px' }} />
                          {cartCount > 0 && (
                            <span className="cart-badge badge bg-danger position-absolute top-0 start-100 translate-middle">
                              {cartCount}
                            </span>
                          )}
                        </Nav.Link>

                        <Dropdown align="end">
                          <Dropdown.Toggle
                            variant="link"
                            id="dropdown-profile"
                            className="p-0 border-0 bg-transparent"
                          >
                            <img
                              src={profileImage}
                              alt="Profile"
                              className="profile-icon"
                              style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                              onError={(e) => { e.target.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png"; }}
                            />
                          </Dropdown.Toggle>

                          <Dropdown.Menu>
                            <Dropdown.Item onClick={() => navigate('/profile')}>
                              Profile
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => navigate('profile/orderhistory')}>
                              Orders
                            </Dropdown.Item>
                            <Dropdown.Item onClick={handleLogoutClick}>
                              Logout
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </>
                    )}
                  </>
                )}

                <Nav.Link
                  as={Link}
                  to="/menu"
                  onClick={() => window.scrollTo(0, 0)}
                >
                {/* Removed Order Now button as per request */}
                </Nav.Link>
              </div>
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </div>
  );
}