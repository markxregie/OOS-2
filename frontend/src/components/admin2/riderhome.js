import React, { useState, useEffect } from 'react';
import { FaChevronDown, FaBell, FaBoxOpen, FaCheckCircle, FaDollarSign, FaClock, FaUser, FaPhone, FaMapMarkerAlt, FaBox, FaTruckPickup, FaTruckMoving, FaUndo, FaSignOutAlt, FaTimesCircle, FaExchangeAlt, FaBars, FaHome, FaHistory, FaCog, FaCreditCard, FaUserTie } from "react-icons/fa";
import { Container, Card, Form, Button } from "react-bootstrap";
import riderImage from "../../assets/rider.jpg";
import logoImage from "../../assets/logo.png";
import "./riderhome.css";
import "./riderdashboard.css";
import Swal from 'sweetalert2';

function RiderDashboard() {
  const userRole = "Admin";
  const userName = "Lim Alcovendas";

  const [currentDate, setCurrentDate] = useState(new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 991);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentOrderToDeliver, setCurrentOrderToDeliver] = useState(null);

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

  const [toggle, setToggle] = useState("active");
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    setOrders(sampleOrders);
  }, []);



  const sampleOrders = [
    {
      id: 1,
      currentStatus: "inTransit",
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
      currentStatus: "pending",
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
      currentStatus: "inTransit",
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
      currentStatus: "cancelled",
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
      currentStatus: "preparing",
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

  const filteredOrders = orders
    .filter(order => {
      if (toggle === "active") {
        return !["delivered", "cancelled", "returned"].includes(order.currentStatus);
      } else if (toggle === "completed") {
        return order.currentStatus === "delivered";
      }
      return true;
    });



  const handleProgressiveStatusChange = (orderId, currentStatus) => {
    if (currentStatus === 'pickedUp' || currentStatus === 'inTransit') {
      // For 'Delivered' status, show the modal
      setCurrentOrderToDeliver(orderId);
      Swal.fire({
        title: 'Proof of Delivery',
        html: '<input type="file" id="delivery-photo" accept="image/*" class="swal2-file-input">',
        showCancelButton: true,
        confirmButtonText: 'Mark as Delivered',
        showLoaderOnConfirm: true,
        allowOutsideClick: () => !Swal.isLoading(),
        preConfirm: () => {
          const file = document.getElementById('delivery-photo').files[0];
          if (!file) {
            Swal.showValidationMessage('Please upload a photo.');
            return false;
          }
          // Simulate an API call for file upload
          return new Promise((resolve) => {
            setTimeout(() => {
              // Here you would handle the file upload to your server
              console.log('File uploaded:', file.name);
              resolve();
            }, 1000);
          });
        }
      }).then((result) => {
        if (result.isConfirmed) {
          // If a file was uploaded and confirmed, update the order status
          setOrders(prevOrders =>
            prevOrders.map(order =>
              order.id === orderId ? { ...order, currentStatus: 'delivered', proofOfDelivery: 'uploaded' } : order
            )
          );
          Swal.fire(
            'Delivered!',
            'The order has been marked as delivered.',
            'success'
          );
        }
      });
    } else {
      // For other statuses, use the existing confirmation dialog
      let newStatus = 'pickedUp';
      let confirmationText = 'Are you sure you want to mark this order as Picked Up?';

      Swal.fire({
        title: 'Confirm Status Change',
        text: confirmationText,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, change it!'
      }).then((result) => {
        if (result.isConfirmed) {
          setOrders(prevOrders =>
            prevOrders.map(order =>
              order.id === orderId ? { ...order, currentStatus: newStatus } : order
            )
          );
          Swal.fire(
            'Updated!',
            'The order status has been changed.',
            'success'
          );
        }
      });
    }
  };

  const statusIcons = {
    pending: <FaClock />,
    confirmed: <FaCheckCircle />,
    preparing: <FaBox />,
    readyToPickup: <FaTruckPickup />,
    pickedUp: <FaTruckMoving />,
    inTransit: <FaTruckMoving />,
    delivered: <FaCheckCircle />,
    cancelled: <FaTimesCircle />,
    returned: <FaUndo />,
  };



  // Helper function to render the correct button text
  const getButtonText = (currentStatus) => {
    if (["pending", "confirmed", "preparing", "readyToPickup"].includes(currentStatus)) {
      return 'Picked Up';
    } else if (["pickedUp", "inTransit"].includes(currentStatus)) {
      return 'Delivered';
    } else {
      return ''; // For other statuses like 'delivered' or 'cancelled'
    }
  };

  // Helper function to determine if the button should be rendered at all
  const shouldRenderButton = (currentStatus) => {
    return ["readyToPickup", "pickedUp", "inTransit", "preparing", "confirmed", "pending"].includes(currentStatus);
  };

  // Helper function to determine the button's class name
  const getButtonClass = (currentStatus) => {
    if (currentStatus === 'pickedUp' || currentStatus === 'inTransit') {
      return 'delivered';
    } else if (currentStatus === 'readyToPickup' || currentStatus === 'pending' || currentStatus === 'confirmed' || currentStatus === 'preparing') {
      return 'pickedUp';
    }
    return '';
  };

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
          <li onClick={navigateToHistory} style={{ cursor: 'pointer' }}>
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
            <h2 className="page-title">Rider Dashboard</h2>
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
                      <li onClick={() => { localStorage.removeItem("access_token"); window.location.href = "http://localhost:4002/"; }}>
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
            className={`toggle-button ${toggle === "active" ? "active" : ""}`}
            onClick={() => setToggle("active")}
          >
            Active Orders
          </button>
          <button
            className={`toggle-button ${toggle === "all" ? "active" : ""}`}
            onClick={() => setToggle("all")}
          >
            All Orders
          </button>
          <button
            className={`toggle-button ${toggle === "completed" ? "active" : ""}`}
            onClick={() => setToggle("completed")}
          >
            Completed
          </button>
        </div>

        <div className="order-list-heading">
          {toggle === "active" && <div>Showing Active Orders</div>}
          {toggle === "all" && <div>Showing All Orders</div>}
          {toggle === "completed" && <div>Showing Completed Orders</div>}
        </div>

        <div className="order-cards-container">
          {filteredOrders.length === 0 ? (
            <div className="no-orders-message">
              <FaBoxOpen size={50} color="#ccc" />
              <p>No orders to show.</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order.id} className="order-card">
                <div className="order-header">
                  <h5 className="order-id">Order #{order.id}</h5>
                  <div className="status-tag" style={{ color: getStatusStyle(order.currentStatus).color, backgroundColor: getStatusStyle(order.currentStatus).backgroundColor }}>
                    {statusIcons[order.currentStatus]} {getStatusStyle(order.currentStatus).text}
                  </div>
                </div>
                <div className="order-details">
                  <p className="detail-item"><FaClock color="#4b929d" /> Ordered at: <span className="detail-value">{order.orderedAt}</span></p>
                  <p className="detail-item"><FaUser color="#4b929d" /> Customer: <span className="detail-value">{order.customerName}</span></p>
                  <p className="detail-item"><FaPhone color="#4b929d" /> Phone: <span className="detail-value">{order.phone.replace(/^\+1-/, "+63 ")}</span></p>
                  <p className="detail-item"><FaMapMarkerAlt color="#4b929d" /> Address: <span className="detail-value">{order.address}</span></p>
                </div>
                <div className="order-items-section">
                  <h6><FaBox color="#4b929d" /> Items ({order.items?.length || 0})</h6>
                  <ul className="item-list">
                    {order.items?.map((item, i) => (
                      <li key={i} className="item-row">
                        <span>{item.quantity}x {item.name}</span>
                        <span>₱{item.price.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <hr className="divider" />
                <div className="order-total-section">
                  <span className="total-label">Total:</span>
                  <span className="total-value">₱{order.total?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="order-actions">
                  {shouldRenderButton(order.currentStatus) && (
                    <Button
                        variant="primary"
                        className={`status-change-button ${getButtonClass(order.currentStatus)}`}
                        onClick={() => handleProgressiveStatusChange(order.id, order.currentStatus)}
                    >
                        {getButtonText(order.currentStatus)}
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default RiderDashboard;
