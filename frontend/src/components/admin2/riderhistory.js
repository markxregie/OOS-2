import React, { useState, useEffect } from 'react';
import { FaChevronDown, FaBell, FaBoxOpen, FaCheckCircle, FaDollarSign, FaClock, FaUser, FaPhone, FaMapMarkerAlt, FaBox, FaTruckPickup, FaTruckMoving, FaUndo, FaSignOutAlt, FaTimesCircle, FaExchangeAlt, FaBars, FaHome, FaHistory, FaCog, FaCreditCard, FaUserTie, FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight } from "react-icons/fa";
import { Form, Container, Table, Card, Button } from "react-bootstrap";
import riderImage from "../../assets/rider.jpg";
import logoImage from "../../assets/logo.png";
import "./riderhome.css";
import "./riderdashboard.css";

import Swal from 'sweetalert2';

function RiderHistory() {
  const userRole = "Admin";
  const userName = "Lim Alcovendas";

  const [currentDate, setCurrentDate] = useState(new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 991);
  const [sortConfig, setSortConfig] = useState({ key: 'orderedAt', direction: 'descending' });

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

  const rowsPerPage = 10;

  useEffect(() => {
    setOrders(sampleOrders);
  }, []);



  const sampleOrders = [
    {
      id: 1,
      currentStatus: "delivered",
      orderedAt: "2023-10-01 10:00 AM",
      customerName: "Alice Johnson",
      phone: "+1-1234567890",
      address: "123 Main St, Springfield",
      items: [
        { quantity: 2, name: "Americano", price: 5.00 },
        { quantity: 1, name: "Croissant", price: 3.50 }
      ],
      total: 13.50,
      assignedRider: "rider1"
    },
    {
      id: 2,
      currentStatus: "delivered",
      orderedAt: "2023-10-01 10:30 AM",
      customerName: "Bob Smith",
      phone: "+1-1234567891",
      address: "456 Elm St, Springfield",
      items: [
        { quantity: 1, name: "Latte", price: 6.00 },
        { quantity: 2, name: "Muffin", price: 4.00 }
      ],
      total: 14.00,
      assignedRider: "rider1"
    },
    {
      id: 3,
      currentStatus: "delivered",
      orderedAt: "2023-10-01 11:00 AM",
      customerName: "Charlie Brown",
      phone: "+1-1234567892",
      address: "789 Oak Ave, Springfield",
      items: [
        { quantity: 3, name: "Espresso", price: 4.00 }
      ],
      total: 12.00,
      assignedRider: "rider2"
    },
    {
      id: 4,
      currentStatus: "delivered",
      orderedAt: "2023-10-01 11:30 AM",
      customerName: "Diana Prince",
      phone: "+1-1234567893",
      address: "101 Justice Ln, Metropolis",
      items: [
        { quantity: 1, name: "Cappuccino", price: 6.50 },
        { quantity: 1, name: "Danish", price: 4.50 }
      ],
      total: 11.00,
      assignedRider: "rider2"
    },
    {
      id: 5,
      currentStatus: "delivered",
      orderedAt: "2023-10-01 11:45 AM",
      customerName: "Clark Kent",
      phone: "+1-1234567894",
      address: "300 Krypton Dr, Smallville",
      items: [
        { quantity: 2, name: "Hot Chocolate", price: 5.50 }
      ],
      total: 11.00,
      assignedRider: "rider1"
    },
    {
      id: 6,
      currentStatus: "delivered",
      orderedAt: "2023-10-01 12:00 PM",
      customerName: "Bruce Wayne",
      phone: "+1-1234567895",
      address: "1007 Mountain Ln, Gotham",
      items: [
        { quantity: 1, name: "Americano", price: 5.00 },
        { quantity: 1, name: "Muffin", price: 4.00 }
      ],
      total: 9.00,
      assignedRider: "rider1"
    },
    {
      id: 7,
      currentStatus: "cancelled",
      orderedAt: "2023-10-01 12:15 PM",
      customerName: "Tony Stark",
      phone: "+1-1234567896",
      address: "10880 Malibu Point, Malibu",
      items: [
        { quantity: 1, name: "Iced Coffee", price: 7.00 }
      ],
      total: 7.00,
      assignedRider: "rider1"
    },
    {
      id: 8,
      currentStatus: "returned",
      orderedAt: "2023-10-01 12:30 PM",
      customerName: "Steve Rogers",
      phone: "+1-1234567897",
      address: "569 Leaman Place, Brooklyn",
      items: [
        { quantity: 1, name: "Hot Tea", price: 3.00 }
      ],
      total: 3.00,
      assignedRider: "rider2"
    }
  ];

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





  const navigateToDashboard = () => {
    window.location.href = "/rider/home";
  };

  const navigateToHistory = () => {
    window.location.href = "/rider/history";
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
            <FaCog />
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
                      <img src={riderImage} alt="John Doe" className="rider-profile-pic" />
                      <span className="rider-name-text">John Doe</span>
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
                    <Card className="summary-card">
                      <FaDollarSign size={32} color="#fd7e14" />
                      <span className="card-title">Earnings</span>
                      <span className="card-value">
                        ₱{orders.filter(order => order.currentStatus === "delivered").reduce((sum, order) => sum + order.total, 0).toFixed(2)}
                      </span>
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
                      <th onClick={() => requestSort('id')} style={{ cursor: 'pointer' }}>
                        Order ID {getSortIcon('id')}
                      </th>
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