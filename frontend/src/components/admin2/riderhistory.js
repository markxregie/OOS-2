import React, { useState, useEffect } from 'react';
import { useLocation } from "react-router-dom";
import { FaChevronDown, FaBell, FaBoxOpen, FaCheckCircle, FaDollarSign, FaClock, FaUser, FaPhone, FaMapMarkerAlt, FaBox, FaTruckPickup, FaTruckMoving, FaUndo, FaSignOutAlt, FaTimesCircle, FaExchangeAlt, FaBars, FaHome, FaHistory, FaCog, FaCreditCard, FaUserTie, FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight } from "react-icons/fa";
import { Form, Container, Table, Card, Button } from "react-bootstrap";
import riderImage from "../../assets/rider.jpg";
import logoImage from "../../assets/logo.png";
import "./riderhome.css";
import "./riderdashboard.css";

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
  const [userLoading, setUserLoading] = useState(true); // New loading state for user info

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
  const [earningsFilter, setEarningsFilter] = useState("Monthly");

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
      case "delivered":
        return { color: "#198754", backgroundColor: "#d1e7dd", text: "Delivered" };
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
        return order.currentStatus === "delivered";
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

  const calculateEarnings = () => {
    const now = new Date();
    let startDate;

    if (earningsFilter === "Daily") {
      // Filter orders from today
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const activeStatuses = ["pending", "confirmed", "preparing", "readytopickup", "pickedup", "intransit"];
      return orders
        .filter(order => activeStatuses.includes(order.currentStatus) && new Date(order.orderedAt) >= startOfDay)
        .reduce((sum, order) => sum + (order.total || 0), 0)
        .toFixed(2);
    } else if (earningsFilter === "Weekly") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (earningsFilter === "Monthly") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // For All-Time, include both 'pending' and 'delivered' statuses
    if (earningsFilter === "All-Time") {
      const validStatuses = ["pending", "delivered"];
      return orders
        .filter(order => validStatuses.includes(order.currentStatus))
        .reduce((sum, order) => sum + (order.total || 0), 0)
        .toFixed(2);
    }

    // For Weekly and Monthly filters, include active statuses and filter by date
    const activeStatuses = ["pending", "confirmed", "preparing", "readytopickup", "pickedup", "intransit"];
    return orders
      .filter(order => activeStatuses.includes(order.currentStatus) && new Date(order.orderedAt) >= startDate)
      .reduce((sum, order) => sum + (order.total || 0), 0)
      .toFixed(2);
  };

  const earnings = calculateEarnings();





  const navigateToDashboard = () => {
    window.location.href = "/rider/home";
  };

  const navigateToHistory = () => {
    window.location.href = "/rider/riderhistory";
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    window.location.href = "http://localhost:4002/";
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
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src={logoImage} alt="Logo" className="logo" />
        </div>
        <ul className="sidebar-menu">
          <li onClick={navigateToDashboard} style={{ cursor: 'pointer' }}>
            <FaHome />
            {isSidebarOpen && <span>Dashboard</span>}
          </li>
          <li className="active" onClick={navigateToHistory} style={{ cursor: 'pointer' }}>
            <FaHistory />
            {isSidebarOpen && <span>History</span>}
          </li>
          <li onClick={handleLogout} style={{ cursor: 'pointer' }}>
             <FaSignOutAlt />
            {isSidebarOpen && <span>Logout</span>}
          </li>
        </ul>
      </div>

      <div className="main-content">
        <header className="manage-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <FaBars />
            </button>
            <h2 className="page-title">Rider History</h2>
          </div>
          <div className="header-right">
            <div className="header-date">{currentDateFormatted}</div>
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
          </div>
        </header>

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
                        {orders.filter(order => !["delivered", "cancelled", "returned"].includes(order.currentStatus)).length} orders
                      </span>
                    </Card>
                    <Card className="summary-card">
                      <FaCheckCircle size={32} color="#198754" />
                      <span className="card-title">Completed</span>
                      <span className="card-value">
                        {orders.filter(order => order.currentStatus === "delivered").length} orders
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
                      <span className="card-value">₱{earnings}</span>
                    </Card>
                  </div>
                </Container>

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
                        <td>#{order.id}</td>
                        <td>{order.customerName}</td>
                        <td>{order.orderedAt}</td>
                        <td>₱{order.total?.toFixed(2) || "0.00"}</td>
                        <td>
                          <span className={`status-badge status-${order.currentStatus.toLowerCase()}`}>
                            {getStatusStyle(order.currentStatus).text}
                          </span>
                        </td>
                        <td>
                          <button
                            className="action-btn view"
                            onClick={() => Swal.fire({
                              title: `Order #${order.id} Details`,
                              html: `
                                <p><strong>Customer:</strong> ${order.customerName}</p>
                                <p><strong>Address:</strong> ${order.address}</p>
                                <p><strong>Items:</strong></p>
                                <ul>
                                  ${order.items.map(item => `<li>${item.quantity}x ${item.name} (₱${item.price.toFixed(2)})</li>`).join('')}
                                </ul>
                                <p><strong>Total:</strong> ₱${order.total.toFixed(2)}</p>
                                <p><strong>Status:</strong> ${getStatusStyle(order.currentStatus).text}</p>
                              `,
                              showCloseButton: true,
                              focusConfirm: false,
                              confirmButtonText: 'OK',
                            })}
                            title="View Details"
                          >
                            View Details
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
    </div>
  );
}

export default RiderHistory;  