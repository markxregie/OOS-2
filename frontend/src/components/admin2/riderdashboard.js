import React, { useState, useEffect } from 'react';
import { FaBell, FaBoxOpen, FaCheckCircle, FaDollarSign, FaClock, FaUser, FaPhone, FaMapMarkerAlt, FaBox, FaTruckPickup, FaTruckMoving, FaTimesCircle, FaExchangeAlt, FaBars, FaHome, FaHistory, FaCog, FaCreditCard, FaUserTie } from "react-icons/fa";
import { Container, Card, Form } from "react-bootstrap";
import riderImage from "../../assets/rider.jpg";
import "./riderdashboard.css";

function RiderDashboard() {
  const userRole = "Admin";
  const userName = "Lim Alcovendas";

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toggle, setToggle] = useState("active");
  const [earningsFilter, setEarningsFilter] = useState("All-Time");

  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState({});

  const authToken = localStorage.getItem('authToken');

  useEffect(() => {
    fetchRiders();
  }, []);

  useEffect(() => {
    if (selectedRider) {
      console.log(`🔄 Fetching orders for rider ID: ${selectedRider}`);
      fetchOrders(selectedRider);
    }
  }, [selectedRider]);

  const fetchRiders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:7001/delivery/riders', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch riders');
      }
      const data = await response.json();
      const normalizedRiders = data.map(r => ({
        id: r.UserID,
        name: r.FullName,
        phone: r.Phone
      }));
      setRiders(normalizedRiders);
      if (normalizedRiders.length > 0) {
        setSelectedRider(normalizedRiders[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async (riderId) => {
    setLoading(true);
    setError(null);
    try {
      console.log(`📡 Making request to: http://localhost:7004/delivery/rider/${riderId}/orders`);
      const response = await fetch(`http://localhost:7004/delivery/rider/${riderId}/orders`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      const data = await response.json();
      console.log('✅ Orders fetched successfully! Total orders:', data.length);
      console.log('═══════════════════════════════════════════');
      console.log('COMPLETE ORDERS DATA:');
      console.log('═══════════════════════════════════════════');
      data.forEach((order, index) => {
        console.log(`\n📦 ORDER ${index + 1}:`);
        console.log('  id:', order.id);
        console.log('  referenceNumber:', order.referenceNumber);
        console.log('  customerName:', order.customerName);
        console.log('  phone:', order.phone);
        console.log('  address:', order.address);
        console.log('  orderedAt:', order.orderedAt);
        console.log('  currentStatus:', order.currentStatus);
        console.log('  paymentMethod:', order.paymentMethod);
        console.log('  total:', order.total);
        console.log('  notes:', order.notes);
        console.log('  items:', order.items);
        console.log('  ─ Full object:', order);
      });
      console.log('\n═══════════════════════════════════════════');
      console.log('FULL ARRAY:', data);
      console.log('═══════════════════════════════════════════\n');
      setOrders(data);
    } catch (err) {
      console.error('❌ Error fetching orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  // Send status update to POS service
  const sendStatusToPOS = async (referenceNumber, newStatus) => {
    try {
      const response = await fetch(`http://127.0.0.1:9000/auth/purchase_orders/online/${referenceNumber}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newStatus: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update POS status');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error sending status to POS:', err);
      throw err;
    }
  };

  // Main function: Update order status and sync with POS
  const updateOrderStatusWithPOS = async (orderId, newStatus) => {
    setStatusUpdating(prev => ({ ...prev, [orderId]: true }));
    try {
      // Step 1: Find the order and get its reference number from the order data
      console.log(`\n========== POS SYNC START ==========`);
      console.log(`Step 1: Finding order ${orderId}...`);
      console.log('Current orders state:', orders);
      
      const order = orders.find(o => o.id === orderId);
      
      if (!order) {
        console.error(`❌ Order ${orderId} not found in orders array`);
        throw new Error(`Order ${orderId} not found`);
      }

      console.log('✅ Order found:', order);
      console.log('Order ID:', order.id);
      console.log('Order referenceNumber:', order.referenceNumber);

      const referenceNumber = order.referenceNumber;
      
      if (!referenceNumber) {
        console.error('❌ Reference number is missing from order');
        throw new Error('Reference number not found in order data');
      }
      
      console.log(`✅ Reference number extracted: ${referenceNumber}`);

      // Step 2: Send status update to POS service
      console.log(`\nStep 2: Sending status update to POS...`);
      console.log(`Endpoint: http://127.0.0.1:9000/auth/purchase_orders/online/${referenceNumber}/status`);
      console.log(`Payload: { newStatus: "${newStatus}" }`);
      
      let posResponse;
      try {
        posResponse = await sendStatusToPOS(referenceNumber, newStatus);
        console.log('✅ POS status update successful:', posResponse);
      } catch (err) {
        console.error('❌ POS update failed:', err);
        throw new Error(`POS sync failed: ${err.message}`);
      }

      // Step 3: Update local orders state
      console.log(`\nStep 3: Updating local order state...`);
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, currentStatus: newStatus } : order
        )
      );
      console.log(`✅ Order status updated locally`);

      // Show success message
      console.log(`\n✅ SUCCESS: Order #${orderId} synced with POS`);
      console.log(`========== POS SYNC END ==========\n`);
      alert(`✅ Order #${orderId} status updated to "${newStatus}" and synced with POS\nReference: ${referenceNumber}`);

    } catch (err) {
      console.error('❌ Error updating order status:', err);
      console.log(`========== POS SYNC END (ERROR) ==========\n`);
      alert(`❌ Failed to update order status:\n${err.message}`);
    } finally {
      setStatusUpdating(prev => ({ ...prev, [orderId]: false }));
    }
  };

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

  const filteredOrders = orders.filter(order => {
    if (toggle === "active") {
      return !["delivered", "cancelled", "returned"].includes(order.currentStatus);
    } else if (toggle === "completed") {
      return order.currentStatus === "delivered";
    }
    return true;
  });

  const selectedRiderObj = riders.find(r => r.id === selectedRider);

  const activeOrdersCount = orders.filter(order => !["delivered", "cancelled", "returned"].includes(order.currentStatus)).length;
  const completedOrdersCount = orders.filter(order => order.currentStatus === "delivered").length;

  const calculateEarnings = () => {
    const now = new Date();
    let startDate;

    if (earningsFilter === "Daily") {
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

    if (earningsFilter === "All-Time") {
      const validStatuses = ["pending", "delivered"];
      return orders
        .filter(order => validStatuses.includes(order.currentStatus))
        .reduce((sum, order) => sum + (order.total || 0), 0)
        .toFixed(2);
    }

    const activeStatuses = ["pending", "confirmed", "preparing", "readytopickup", "pickedup", "intransit"];
    return orders
      .filter(order => activeStatuses.includes(order.currentStatus) && new Date(order.orderedAt) >= startDate)
      .reduce((sum, order) => sum + (order.total || 0), 0)
      .toFixed(2);
  };

  const earnings = calculateEarnings();

  const statusIcons = {
    pending: <FaClock />,
    confirmed: <FaCheckCircle />,
    preparing: <FaBox />,
    waitingforpickup: <FaClock />,
    readyToPickup: <FaTruckPickup />,
    pickedUp: <FaTruckMoving />,
    pickedup: <FaTruckMoving />,
    inTransit: <FaTruckMoving />,
    delivered: <FaCheckCircle />,
    cancelled: <FaTimesCircle />,
  };

  const cardColors = "#a3d3d8";

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="rider-dashboard-container">
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
            </div>
          </div>
        </header>

        <Container fluid className="dashboard-summary-container" style={{ backgroundColor: cardColors }}>
          <div className="rider-selector-group">
            <div className="rider-info-display">
              <img src={riderImage} alt={selectedRiderObj?.name || "Rider"} className="rider-profile-pic" />
              <span className="rider-name-text">{selectedRiderObj?.name || "Rider"}</span>
            </div>
            <Form.Select
              className="rider-select"
              value={selectedRider || ""}
              onChange={(e) => setSelectedRider(Number(e.target.value))}
            >
              {riders.map((rider) => (
                <option key={rider.id} value={rider.id}>{rider.name}</option>
              ))}
            </Form.Select>
          </div>
          <div className="summary-cards-container">
            <Card className="summary-card">
              <FaBoxOpen size={32} color="#964b00" />
              <span className="card-title">Active Orders</span>
              <span className="card-value">{activeOrdersCount} orders</span>
            </Card>
            <Card className="summary-card">
              <FaCheckCircle size={32} color="#198754" />
              <span className="card-title">Completed</span>
              <span className="card-value">{completedOrdersCount} orders</span>
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
              <p>No orders to show for this rider.</p>
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
                  <p className="detail-item"><FaPhone color="#4b929d" /> Phone: <span className="detail-value">{order.phone}</span></p>
                  <p className="detail-item"><FaMapMarkerAlt color="#4b929d" /> Address: <span className="detail-value">{order.address}</span></p>
                </div>
                <div className="order-items-section">
                  <p className="detail-item"><FaBox color="#4b929d" /> Items ({order.items?.length || 0})</p>
                  <ul className="item-list">
                    {order.items?.map((item, i) => (
                      <li key={i} className="item-row">
                        <span className="detail-value">{item.quantity}x {item.name} - ₱{item.price?.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="order-total-section">
                  <hr className="divider"/>
                  <span className="total-label">Total:   </span>
                  <span className="total-value">₱{order.total?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="order-actions">
                  <button
                    className="status-button delivered"
                    onClick={() => {
                      console.log('');
                      console.log('═══════════════════════════════════════════');
                      console.log('📦 FULL ORDER DATA:');
                      console.log('═══════════════════════════════════════════');
                      console.log('ID:', order.id);
                      console.log('Reference Number:', order.referenceNumber);
                      console.log('Customer Name:', order.customerName);
                      console.log('Phone:', order.phone);
                      console.log('Address:', order.address);
                      console.log('Ordered At:', order.orderedAt);
                      console.log('Current Status:', order.currentStatus);
                      console.log('Payment Method:', order.paymentMethod);
                      console.log('Total:', order.total);
                      console.log('Notes:', order.notes);
                      console.log('Items:', order.items);
                      console.log('─────────────────────────────────────────');
                      console.log('Full Order Object:', order);
                      console.log('═══════════════════════════════════════════');
                      console.log('');
                      updateOrderStatusWithPOS(order.id, "delivered");
                    }}
                    disabled={statusUpdating[order.id]}
                  >
                    {statusUpdating[order.id] ? "Updating..." : "Mark Delivered"}
                  </button>
                  <button
                    className="status-button cancelled"
                    onClick={() => {
                      updateOrderStatusWithPOS(order.id, "cancelled");
                    }}
                    disabled={statusUpdating[order.id]}
                  >
                    {statusUpdating[order.id] ? "Updating..." : "Cancel Order"}
                  </button>
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