import React, { useState, useEffect } from 'react';
import { useLocation } from "react-router-dom";
import { FaChevronDown, FaBell, FaBoxOpen, FaCheckCircle, FaDollarSign, FaClock, FaUser, FaPhone, FaMapMarkerAlt, FaBox, FaTruckPickup, FaTruckMoving, FaUndo, FaSignOutAlt, FaTimesCircle, FaExchangeAlt, FaBars, FaHome, FaHistory, FaCog, FaCreditCard, FaUserTie } from "react-icons/fa";
import { Container, Card, Form, Button } from "react-bootstrap";
import riderImage from "../../assets/rider.jpg";
import logoImage from "../../assets/logo.png";
import "./riderhome.css";
import "./riderdashboard.css";
import Swal from 'sweetalert2';

function RiderDashboard() {
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");

  const [currentDate, setCurrentDate] = useState(new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 991);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentOrderToDeliver, setCurrentOrderToDeliver] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const [toggle, setToggle] = useState("active");
  const [earningsFilter, setEarningsFilter] = useState("Daily");
  const [orders, setOrders] = useState([]);

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
      case "waitingforpickup":
        return { color: "#ffffff", backgroundColor: "#9c27b0", text: "Waiting for Pickup" };
      case "pickedup":
        return { color: "#0d6efd", backgroundColor: "#cfe2ff", text: "Picked Up" };
      case "delivering":
        return { color: "#6610f2", backgroundColor: "#e5dbff", text: "Delivering" };
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

  const calculateEarnings = () => {
    const now = new Date();
    let startDate;

    if (earningsFilter === "Daily") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return orders
        .filter(order => ["pending", "confirmed", "preparing", "waitingforpickup", "pickedup", "delivering"].includes(order.currentStatus) && new Date(order.orderedAt) >= startDate)
        .reduce((sum, order) => sum + (order.total || 0), 0)
        .toFixed(2);
    } else if (earningsFilter === "Weekly") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (earningsFilter === "Monthly") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      // All-Time
      return orders
        .filter(order => ["pending", "confirmed", "preparing", "waitingforpickup", "pickedup", "delivering", "delivered"].includes(order.currentStatus))
        .reduce((sum, order) => sum + (order.total || 0), 0)
        .toFixed(2);
    }

    return orders
      .filter(order => ["pending", "confirmed", "preparing", "waitingforpickup", "pickedup", "delivering"].includes(order.currentStatus) && new Date(order.orderedAt) >= startDate)
      .reduce((sum, order) => sum + (order.total || 0), 0)
      .toFixed(2);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      // PATCH to cart/rider/orders
      const cartResponse = await fetch(`http://localhost:7004/cart/rider/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ new_status: newStatus.toUpperCase() })
      });
      if (!cartResponse.ok) {
        throw new Error(`Failed to update cart status: ${cartResponse.status}`);
      }

      // PUT to delivery/orders
      const deliveryResponse = await fetch(`http://localhost:7004/delivery/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!deliveryResponse.ok) {
        throw new Error(`Failed to update delivery status: ${deliveryResponse.status}`);
      }

      // If delivered, update POS
      if (newStatus === 'delivered') {
        const posResponse = await fetch(`http://127.0.0.1:9000/auth/purchase_orders/online/${orderId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ newStatus: "completed" })
        });
        if (!posResponse.ok) {
          throw new Error(`Failed to update POS status: ${posResponse.status}`);
        }
      }

      // Update local state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, currentStatus: newStatus } : o));

      // Success message
      Swal.fire("Success", "Order marked as " + newStatus, "success");
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    }
  };

  const handleProgressiveStatusChange = (orderId, currentStatus) => {
    let nextStatus;
    if (currentStatus === 'waitingforpickup') nextStatus = 'pickedup';
    else if (currentStatus === 'pickedup') nextStatus = 'delivering';
    else if (currentStatus === 'delivering') nextStatus = 'delivered';
    else return;

    if (nextStatus === 'delivered') {
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
          return new Promise((resolve) => {
            setTimeout(() => {
              console.log('File uploaded:', file.name);
              resolve();
            }, 1000);
          });
        }
      }).then((result) => {
        if (result.isConfirmed) {
          updateOrderStatus(orderId, 'delivered');
        }
      });
    } else {
      let confirmationText = `Are you sure you want to mark this order as ${nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}?`;
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
          updateOrderStatus(orderId, nextStatus);
        }
      });
    }
  };

  const statusIcons = {
    pending: <FaClock />,
    confirmed: <FaCheckCircle />,
    preparing: <FaBox />,
    waitingforpickup: <FaTruckPickup />,
    pickedup: <FaTruckMoving />,
    delivering: <FaTruckMoving />,
    delivered: <FaCheckCircle />,
    cancelled: <FaTimesCircle />,
    returned: <FaUndo />,
  };



  // Helper function to render the correct button text
  const getButtonText = (currentStatus) => {
    if (currentStatus === 'waitingforpickup') return 'Picked Up';
    else if (currentStatus === 'pickedup') return 'Delivering';
    else if (currentStatus === 'delivering') return 'Delivered';
    return '';
  };

  // Helper function to determine if the button should be rendered at all
  const shouldRenderButton = (currentStatus) => {
    return ['waitingforpickup', 'pickedup', 'delivering'].includes(currentStatus);
  };

  // Helper function to determine the button's class name
  const getButtonClass = (currentStatus) => {
    if (currentStatus === 'delivering') return 'delivered';
    else return 'pickedUp';
  };

  const navigateToDashboard = () => {
    window.location.href = "/rider/home";
  };

  const navigateToHistory = () => {
    window.location.href = "/rider/riderhistory";
  };

  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("riderId");
    localStorage.removeItem("riderName");
    localStorage.removeItem("riderPhone");
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
              <img src={riderImage} alt={riderName} className="rider-profile-pic" />
              <span className="rider-name-text">
  {riderName || "Rider"}
</span>

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
              <span className="card-value">₱{calculateEarnings()}</span>
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
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div>Error: {error}</div>
          ) : filteredOrders.length === 0 ? (
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
                  <p className="detail-item"><FaClock color="#4b929d" /> Ordered at: <span className="detail-value">{new Date(order.orderedAt).toLocaleString()}</span></p>
                  <p className="detail-item"><FaUser color="#4b929d" /> Customer: <span className="detail-value">{order.customerName}</span></p>
                  <p className="detail-item"><FaPhone color="#4b929d" /> Phone: <span className="detail-value">{order.phone}</span></p>
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