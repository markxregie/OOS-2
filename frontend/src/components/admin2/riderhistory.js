import React, { useState, useEffect } from 'react';
import { useLocation } from "react-router-dom";
import { FaChevronDown, FaBell, FaBoxOpen, FaCheckCircle, FaDollarSign, FaClock, FaUser, FaPhone, FaMapMarkerAlt, FaBox, FaTruckPickup, FaTruckMoving, FaUndo, FaSignOutAlt, FaTimesCircle, FaExchangeAlt, FaBars, FaHome, FaHistory, FaCog, FaCreditCard, FaUserTie, FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight, FaEye } from "react-icons/fa";
import { Form, Container, Table, Card, Button } from "react-bootstrap";
import riderImage from "../../assets/rider.jpg";
import logoImage from "../../assets/logo.png";
import "./riderhome.css";

import Swal from 'sweetalert2';

function RiderHistory() {
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");

  const [currentDate, setCurrentDate] = useState(new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 991);
  const [sortConfig, setSortConfig] = useState({ key: 'orderedAt', direction: 'descending' });

  const [authToken, setAuthToken] = useState(localStorage.getItem("authToken"));
  const [riderId, setRiderId] = useState(localStorage.getItem("riderId") || "");
  const [riderName, setRiderName] = useState(localStorage.getItem("riderName") || "");
  const [riderPhone, setRiderPhone] = useState(localStorage.getItem("riderPhone") || "");
  const [userLoading, setUserLoading] = useState(true); 

  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tokenFromUrl = queryParams.get("authorization");
    const usernameFromUrl = queryParams.get("username");

    if (tokenFromUrl) {
      localStorage.setItem("authToken", tokenFromUrl);
      setAuthToken(tokenFromUrl);
    }
    if (usernameFromUrl) {
      localStorage.setItem("riderUsername", usernameFromUrl);
    }
  }, [location.search]);

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 991);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.querySelector('.dropdown-icon');
      if (dropdown && !dropdown.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [toggle, setToggle] = useState("completed");
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [earningsFilter, setEarningsFilter] = useState("Daily");
  const [earnings, setEarnings] = useState(null);

  const rowsPerPage = 10;

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:7004/delivery/rider/${riderId}/orders`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // ✅ no remapping needed, backend already normalized
        setOrders(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    if (riderId && authToken) {
      fetchOrders();
    }
  }, [riderId, authToken]);

  useEffect(() => {
    const fetchEarnings = async () => {
      if (!riderId || !authToken) {
        return;
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // JS months are 0-indexed
      const today = now.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

      let url = '';
      if (earningsFilter === 'Daily') {
        url = `http://localhost:7004/delivery/rider/${riderId}/earnings/daily?target_date=${today}`;
      } else if (earningsFilter === 'Weekly') {
        url = `http://localhost:7004/delivery/rider/${riderId}/earnings/weekly?target_date=${today}`;
      } else if (earningsFilter === 'Monthly') {
        url = `http://localhost:7004/delivery/rider/${riderId}/earnings/monthly?year=${year}&month=${month}`;
      }

      if (!url) return;

      try {
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        if (!response.ok) throw new Error(`Failed to fetch earnings: ${response.status}`);
        const data = await response.json();
        setEarnings(data);
      } catch (e) {
        console.error('Earnings fetch error:', e);
        setEarnings({ totalEarnings: 0.0 }); // Set a default on error
      }
    };

    fetchEarnings();
  }, [riderId, authToken, earningsFilter]);

  // Fetch user info with loading and debug logging
  useEffect(() => {
    if (authToken) {
      setUserLoading(true);
      console.log("Fetching user info");
      fetch("http://localhost:4000/auth/users/me", {
        headers: { "Authorization": `Bearer ${authToken}` }
      })
        .then(res => {
          if (res.status === 401) {
            handleLogout();
            return;
          }
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(async data => {
          console.log("User data:", data);
          if (!data) return;
          const userId = data.userId || "";
          const userRoleData = data.userRole || "";
          const fallbackName = (data.fullName && data.fullName.trim() !== "")
            ? data.fullName
            : (data.username && data.username.trim() !== "")
              ? data.username
              : "Rider";
          const fallbackPhone = data.phone || "";

          setRiderId(userId);
          localStorage.setItem("riderId", userId);
          setUserRole(userRoleData);
          setUserName(fallbackName);

          // Fetch rider details from riders endpoint
          if (userId) {
            try {
              const riderRes = await fetch(`http://localhost:4000/users/riders/${userId}`, {
                headers: { "Authorization": `Bearer ${authToken}` }
              });
              if (riderRes.ok) {
                const riderData = await riderRes.json();
                console.log("Rider data:", riderData);
                const riderFullName = riderData.FullName || fallbackName;
                const riderPhone = riderData.Phone || fallbackPhone;
                setRiderName(riderFullName);
                localStorage.setItem("riderName", riderFullName);
                setRiderPhone(riderPhone);
                localStorage.setItem("riderPhone", riderPhone);
                setUserName(riderFullName);
              } else {
                // Fallback to user data
                setRiderName(fallbackName);
                localStorage.setItem("riderName", fallbackName);
                setRiderPhone(fallbackPhone);
                localStorage.setItem("riderPhone", fallbackPhone);
              }
            } catch (err) {
              console.error("Failed to fetch rider info:", err);
              // Fallback to user data
              setRiderName(fallbackName);
              localStorage.setItem("riderName", fallbackName);
              setRiderPhone(fallbackPhone);
              localStorage.setItem("riderPhone", fallbackPhone);
            }
          } else {
            setRiderName(fallbackName);
            localStorage.setItem("riderName", fallbackName);
            setRiderPhone(fallbackPhone);
            localStorage.setItem("riderPhone", fallbackPhone);
          }
          setUserLoading(false); // Done loading
        })
        .catch(err => {
          console.error("Failed to fetch user info:", err);
          setUserLoading(false); // Done loading even on error
        });
    }
  }, [authToken]);





  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentDate.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const currentDateFormatted = currentDate.toLocaleString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "numeric",
  });

  const getStatusStyle = (status) => {
    switch (status) {
      case "pending":
        return { color: "#d39e00", backgroundColor: "#fff3cd", text: "Pending" };
      case "confirmed":
        return { color: "#198754", backgroundColor: "#d1e7dd", text: "Confirmed" };
      case "preparing":
        return { color: "#2980b9", backgroundColor: "#cfe2ff", text: "Preparing" };
      case "readyToPickup":
        return { color: "#8e44ad", backgroundColor: "#e5dbff", text: "Ready to Pickup" };
      case "pickedUp":
        return { color: "#0d6efd", backgroundColor: "#cfe2ff", text: "Picked Up" };
      case "inTransit":
        return { color: "#6610f2", backgroundColor: "#e5dbff", text: "In Transit" };
      case "delivering":
        return { color: "#6610f2", backgroundColor: "#e5dbff", text: "Delivering" };
      case "delivered":
        return { color: "#198754", backgroundColor: "#d1e7dd", text: "Delivered" };
      case "completed":
        return { color: "#198754", backgroundColor: "#d1e7dd", text: "Completed" };
      case "cancelled":
        return { color: "#dc3545", backgroundColor: "#f8d7da", text: "Cancelled" };
      case "returned":
        return { color: "#fd7e14", backgroundColor: "#ffe5d0", text: "Cancelled/Returned" };
      default:
        return { color: "black", backgroundColor: "transparent", text: status };
    }
  };

  const sortedOrders = [...orders]
    .filter(order => {
      if (toggle === "completed") {
        return ["delivered", "completed"].includes(order.currentStatus);
      } else if (toggle === "all") {
        return true;
      }
      return false;
    })
    .sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return '';
    }
    if (sortConfig.direction === 'ascending') {
      return '▲';
    }
    return '▼';
  };







  const navigateToDashboard = () => {
    window.location.href = "/rider/home";
  };

  const navigateToHistory = () => {
    window.location.href = "/rider/riderhistory";
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will be logged out of your account.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("riderId");
        localStorage.removeItem("riderName");
        localStorage.removeItem("riderPhone");
        localStorage.removeItem("riderUsername");
        window.location.href = "http://localhost:4002/";
      }
    });
  };

  // Pagination functions
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = sortedOrders.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(sortedOrders.length / rowsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleFirstPage = () => {
    setCurrentPage(1);
  };

  const handleLastPage = () => {
    setCurrentPage(totalPages);
  };



  return (
    <div className="rider-dashboard-container">
      {/* Desktop Sidebar - Conditionally rendered for desktop view (> 991px) and controlled by isSidebarOpen */}
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

      <div className="main-content">
        <header className="manage-header">
          <div className="header-left">
            {/* Menu toggle button */}
            {window.innerWidth > 991 && (
              <button
                className="menu-toggle"
                onClick={() => {
                  // Only allow sidebar toggle on desktop. On mobile, the sidebar is permanently hidden by CSS.
                  if (window.innerWidth > 991) {
                    setIsSidebarOpen(!isSidebarOpen);
                  }
                }}
              >
                <FaBars />
              </button>
            )}
            <h2 className="page-title">Rider History</h2>
          </div>
          <div className="header-right">
            <div className="header-date">{currentDateFormatted}</div>
            {window.innerWidth > 991 && (
              <div className="header-profile">
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
                        <li onClick={() => window.location.reload()}>
                          <FaUndo /> Refresh
                        </li>
                        <li onClick={handleLogout}>
                          <FaSignOutAlt /> Logout
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {window.innerWidth > 991 && (
          <Container fluid className="dashboard-summary-container" style={{ backgroundColor: "#a3d3d8" }}>
            <div className="rider-selector-group">
              <div className="rider-info-display">
                <img src={riderImage} alt={userName} className="rider-profile-pic" />
                <span className="rider-name-text">{userName}</span>
              </div>
            </div>
            <div className="summary-cards-container">
              <Card className="summary-card">
                <FaBoxOpen size={32} color="#964b00" />
                <span className="card-title">Active Orders</span>
                <span className="card-value">
                  {orders.filter(order => !["delivered", "completed", "cancelled", "returned"].includes(order.currentStatus)).length} orders
                </span>
              </Card>
              <Card className="summary-card">
                <FaCheckCircle size={32} color="#198754" />
                <span className="card-title">Completed</span>
                <span className="card-value">
                  {orders.filter(order => ["delivered", "completed"].includes(order.currentStatus)).length} orders
                </span>
              </Card>
              <Card className="summary-card" style={{ position: 'relative' }}>
                <Form.Select
                  size="sm"
                  value={earningsFilter}
                  onChange={(e) => setEarningsFilter(e.target.value)}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    width: '120px',
                    fontSize: '12px',
                    padding: '2px 6px'
                  }}
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </Form.Select>
                <FaDollarSign size={32} color="#fd7e14" />
                <span className="card-title">Earnings</span>
                <span className="card-value">₱{earnings?.totalEarnings || 0}</span>
              </Card>
            </div>
          </Container>
        )}

        <div className="toggle-buttons-container">
          <button
            className={`toggle-button ${toggle === "completed" ? "active" : ""}`}
            onClick={() => setToggle("completed")}
          >
            Completed Orders
          </button>
          <button
            className={`toggle-button ${toggle === "all" ? "active" : ""}`}
            onClick={() => setToggle("all")}
          >
            All Orders
          </button>
        </div>

        <div className="order-list-heading">
          {toggle === "completed" && <div>Showing Completed Orders</div>}
          {toggle === "all" && <div>Showing All Orders</div>}
        </div>

        <div className="table-responsive-container">
          {sortedOrders.length === 0 ? (
            <div className="no-orders-message">
              <FaBoxOpen size={50} color="#ccc" />
              <p>No orders to show.</p>
            </div>
          ) : (
            <>


              {/* Custom Table */}
              <div className="orders-table-container">
                <table className="orders-table">
                  <thead>
                    <tr>

                      <th onClick={() => requestSort('customerName')} style={{ cursor: 'pointer' }}>
                        Customer Name {getSortIcon('customerName')}
                      </th>
                      <th onClick={() => requestSort('referenceNumber')} style={{ cursor: 'pointer' }}>
                        Reference Number {getSortIcon('referenceNumber')}
                      </th>
                      <th onClick={() => requestSort('orderedAt')} style={{ cursor: 'pointer' }}>
                        Date/Time {getSortIcon('orderedAt')}
                      </th>
                      <th onClick={() => requestSort('total')} style={{ cursor: 'pointer' }}>
                        Total {getSortIcon('total')}
                      </th>
                      <th onClick={() => requestSort('currentStatus')} style={{ cursor: 'pointer' }}>
                        Status {getSortIcon('currentStatus')}
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRows.map((order) => (
                      <tr key={order.id}>

                        {/* ADDED data-label FOR MOBILE RESPONSIVENESS */}
                        <td data-label="Customer Name">{order.customerName}</td>
                        <td data-label="Reference Number">{order.referenceNumber}</td>
                        <td data-label="Date/Time">{order.orderedAt}</td>
                        <td data-label="Total">₱{order.total?.toFixed(2) || "0.00"}</td>
                        <td data-label="Status">
                          <span className={`status-badge status-${order.currentStatus.toLowerCase()}`}>
                            {getStatusStyle(order.currentStatus).text}
                          </span>
                        </td>
                        <td data-label="Actions">
                          <button
                            className="action-btn view"
                            onClick={() => {
                              const statusStyle = getStatusStyle(order.currentStatus);
                              Swal.fire({
                                title: `Order #${order.id} Details`,
                                html: `
                                  <div style="text-align: left; font-family: Arial, sans-serif; max-width: 500px;">
                                    <div style="margin-bottom: 15px;">
                                      <strong style="color: #333;">Order Date:</strong> ${new Date(order.orderedAt).toLocaleString()}
                                    </div>
                                    <div style="margin-bottom: 15px;">
                                      <strong style="color: #333;">Customer:</strong> ${order.customerName}
                                    </div>
                                    <div style="margin-bottom: 15px;">
                                      <strong style="color: #333;">Delivery Address:</strong> ${order.address}
                                    </div>
                                    <div style="margin-bottom: 15px;">
                                      <strong style="color: #333;">Items Ordered:</strong>
                                      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                                        <thead>
                                          <tr style="background-color: #f8f9fa;">
                                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item</th>
                                            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Qty</th>
                                            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Price</th>
                                            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Subtotal</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          ${order.items.map(item => `
                                            <tr>
                                              <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
                                              <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantity}</td>
                                              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₱${item.price.toFixed(2)}</td>
                                              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₱${(item.quantity * item.price).toFixed(2)}</td>
                                            </tr>
                                          `).join('')}
                                        </tbody>
                                      </table>
                                    </div>
                                    <div style="margin-bottom: 15px; text-align: right; font-size: 18px; font-weight: bold;">
                                      <strong style="color: #333;">Total Amount:</strong> ₱${order.total.toFixed(2)}
                                    </div>
                                    <div style="margin-bottom: 15px;">
                                      <strong style="color: #333;">Order Status:</strong>
                                      <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; color: ${statusStyle.color}; background-color: ${statusStyle.backgroundColor}; font-weight: bold;">
                                        ${statusStyle.text}
                                      </span>
                                    </div>
                                  </div>
                                `,
                                showCloseButton: true,
                                focusConfirm: false,
                                confirmButtonText: 'Close',
                                customClass: {
                                  popup: 'swal-wide'
                                }
                              });
                            }}
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pagination-container">
                  <div className="pagination-info">
                    Showing {indexOfFirstRow + 1} to {Math.min(indexOfLastRow, sortedOrders.length)} of {sortedOrders.length} entries
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="pagination-btn"
                      onClick={handleFirstPage}
                      disabled={currentPage === 1}
                      title="First Page"
                    >
                      <FaAngleDoubleLeft />
                    </button>
                    <button
                      className="pagination-btn"
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      title="Previous Page"
                    >
                      <FaAngleLeft />
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber;
                      if (totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNumber}
                          className={`pagination-btn ${currentPage === pageNumber ? 'active' : ''}`}
                          onClick={() => paginate(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}

                    <button
                      className="pagination-btn"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      title="Next Page"
                    >
                      <FaAngleRight />
                    </button>
                    <button
                      className="pagination-btn"
                      onClick={handleLastPage}
                      disabled={currentPage === totalPages}
                      title="Last Page"
                    >
                      <FaAngleDoubleRight />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Added for responsiveness) */}
      <div className="mobile-bottom-nav">
        <ul className="bottom-nav-menu">
          <li onClick={navigateToDashboard} style={{ cursor: 'pointer' }}>
            <FaHome />
            <span>Dashboard</span>
          </li>
          <li className="active" onClick={navigateToHistory} style={{ cursor: 'pointer' }}>
            <FaHistory />
            <span>History</span>
          </li>
          <li onClick={handleLogout} style={{ cursor: 'pointer' }}>
            <FaSignOutAlt />
            <span>Logout</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default RiderHistory;