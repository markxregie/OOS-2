import React, { useState, useEffect } from 'react';
import { FaSyncAlt, FaSignOutAlt, FaChevronDown } from "react-icons/fa";
import { FaBoxOpen, FaCheckCircle, FaDollarSign, FaBell, FaBars, FaClock, FaUser, FaPhone, FaMapMarkerAlt, FaBox } from "react-icons/fa";
import { Container, Card, Tabs, Tab, Form } from "react-bootstrap";
import riderImage from "../../assets/rider.jpg";
import "../admin2/manageorder.css";
import "./riderhome.css";

const riders = {
  rider1: {
    name: "Rider 1",
    phone: "+1-555-1111",
    activeOrders: 3,
    imageUrl: "https://via.placeholder.com/50"
  },
  rider2: {
    name: "Rider 2",
    phone: "+1-555-2222",
    activeOrders: 2,
    imageUrl: "https://via.placeholder.com/50"
  },
  rider3: {
    name: "Rider 3",
    phone: "+1-555-3333",
    activeOrders: 1,
    imageUrl: "https://via.placeholder.com/50"
  },
  rider4: {
    name: "Rider 4",
    phone: "+1-555-4444",
    activeOrders: 0,
    imageUrl: "https://via.placeholder.com/50"
  },
  rider5: {
    name: "Rider 5",
    phone: "+1-555-5555",
    activeOrders: 0,
    imageUrl: "https://via.placeholder.com/50"
  },
  rider6: {
    name: "Rider 6",
    phone: "+1-555-6666",
    activeOrders: 0,
    imageUrl: "https://via.placeholder.com/50"
  }
};

function RiderHome() {
  const [orders, setOrders] = useState([]);
  const [tabKey, setTabKey] = useState('active');
  const [statusFilter, setStatusFilter] = useState("all");
  const [riderFilter, setRiderFilter] = useState("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // For testing: log orders to verify data
  useEffect(() => {
    console.log("Orders loaded:", orders);
  }, [orders]);

  const getStatusStyle = (status) => {
    switch (status) {
      case "pending":
        return { color: "#d39e00", backgroundColor: "#fff3cd" };
      case "confirmed":
        return { color: "#198754", backgroundColor: "#d1e7dd" };
      case "preparing":
        return { color: "#2980b9", backgroundColor: "#cfe2ff" };
      case "readyToPickup":
        return { color: "#8e44ad", backgroundColor: "#e5dbff" };
      case "pickedUp":
        return { color: "#0d6efd", backgroundColor: "#cfe2ff" };
      case "inTransit":
        return { color: "#6610f2", backgroundColor: "#e5dbff" };
      case "delivered":
        return { color: "#198754", backgroundColor: "#d1e7dd" };
      case "cancelled":
        return { color: "#dc3545", backgroundColor: "#f8d7da" };
      case "returned":
        return { color: "#fd7e14", backgroundColor: "#ffe5d0" };
      default:
        return { color: "black", backgroundColor: "transparent" };
    }
  };

  const handleStatusChange = (orderId, newStatus) => {
    const updatedOrders = orders.map(order =>
      order.id === orderId ? { ...order, currentStatus: newStatus } : order
    );
    setOrders(updatedOrders);
    localStorage.setItem('deliveryOrders', JSON.stringify(updatedOrders));
  };

  const handleRiderChange = (orderId, newRider) => {
    const updatedOrders = orders.map(order =>
      order.id === orderId ? { ...order, assignedRider: newRider } : order
    );
    setOrders(updatedOrders);
    localStorage.setItem('deliveryOrders', JSON.stringify(updatedOrders));
  };

  useEffect(() => {
    const loadOrdersFromStorage = () => {
      const savedOrders = localStorage.getItem('deliveryOrders');
      if (savedOrders) {
        setOrders(JSON.parse(savedOrders));
      } else {
        // Fallback sample orders for testing
        setOrders([
          {
            id: "ORD001",
            currentStatus: "pending",
            orderedAt: "10:22 PM",
            customerName: "John Smith",
            phone: "+1-555-1001",
            address: "123 Main St, Downtown, City 12345",
            items: [
              { name: "Cappuccino (Large)", quantity: 2, price: 11.00 },
              { name: "Blueberry Muffin", quantity: 1, price: 3.25 }
            ],
            total: 14.25,
            assignedRider: "rider1"
          },
          {
            id: "ORD002",
            currentStatus: "preparing",
            orderedAt: "11:15 AM",
            customerName: "Jane Doe",
            phone: "+1-555-2002",
            address: "456 Oak St, Uptown, City 67890",
            items: [
              { name: "Latte (Medium)", quantity: 1, price: 4.50 },
              { name: "Chocolate Croissant", quantity: 2, price: 5.00 }
            ],
            total: 9.50,
            assignedRider: "rider1"
          },
          {
            id: "ORD003",
            currentStatus: "delivered",
            orderedAt: "9:45 AM",
            customerName: "Alice Johnson",
            phone: "+1-555-3003",
            address: "789 Pine St, Midtown, City 54321",
            items: [
              { name: "Espresso", quantity: 3, price: 9.00 },
              { name: "Blueberry Scone", quantity: 1, price: 3.00 }
            ],
            total: 12.00,
            assignedRider: "rider1"
          }
        ]);
      }
    };

    loadOrdersFromStorage();

    const handleStorageChange = (e) => {
      if (e.key === 'deliveryOrders') {
        loadOrdersFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <>
      <Container fluid className="riderhome-container" style={{ backgroundColor: "#a3d3d8", borderRadius: "8px", padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <img src={riderImage} alt="Rider" style={{ width: "60px", height: "60px", borderRadius: "50%", marginTop: "1.5rem" }} />
            <span style={{ color: "#4b929d", fontWeight: "600", fontSize: "1.2rem", marginTop: "1.5rem" }}>Rider 1</span>
          </div>


          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "20px", fontSize: "24px", color: "white", cursor: "pointer" }}>
            <FaBell color="white" />
            <div style={{ position: "relative" }}>
              <div onClick={() => setDropdownOpen(!dropdownOpen)} style={{ color: "white", display: "flex", alignItems: "center", cursor: "pointer" }}>
                <FaBars color="white" />
                <FaChevronDown style={{ marginLeft: "4px" }} />
              </div>
{dropdownOpen && (
  <div style={{ position: "absolute", top: "100%", right: 0, backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", zIndex: 1000, minWidth: "90px" }}>
    <ul style={{ listStyle: "none", margin: 0, padding: "4px 0" }}>
      <li
        onClick={() => window.location.reload()}
        style={{ cursor: "pointer", padding: "4px 8px", display: "flex", alignItems: "center", gap: "4px", color: "#4b929d", fontSize: "1rem" }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f0f0f0"}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
      >
        <FaSyncAlt size={14} /> Refresh
      </li>
      <li
        onClick={() => alert('Logout clicked')}
        style={{ cursor: "pointer", padding: "2px 8px", display: "flex", alignItems: "center", gap: "4px", color: "#dc3545", fontSize: "1rem" }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f8d7da"}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
      >
        <FaSignOutAlt size={14} /> Logout
      </li>
    </ul>
  </div>
)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-around", gap: "20px", flexWrap: "wrap" }}>
          <Card style={{ flex: "1", minWidth: "150px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", backgroundColor: "white", color: "#4b929d", borderRadius: "8px" }}>
            <FaBoxOpen size={32} color="#964b00" />
            <span style={{ fontSize: "1rem", fontWeight: "400" }}>Active Orders</span>
            <span style={{ fontSize: "1.2rem", fontWeight: "700", textAlign: "center" }}>
              {orders.filter(order => order.assignedRider === "rider1" &&
                !["delivered", "cancelled", "returned"].includes(order.currentStatus)).length} orders
            </span>
          </Card>
          <Card style={{ flex: "1", minWidth: "150px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", backgroundColor: "white", color: "#4b929d", borderRadius: "8px" }}>
            <FaCheckCircle size={32} color="#198754" />
            <span style={{ fontSize: "1rem", fontWeight: "400" }}>Completed</span>
            <span style={{ fontSize: "1.2rem", fontWeight: "700", textAlign: "center" }}>
              {orders.filter(order => order.assignedRider === "rider1" && order.currentStatus === "delivered").length} orders
            </span>
          </Card>
          <Card style={{ flex: "1", minWidth: "150px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", backgroundColor: "white", color: "#4b929d", borderRadius: "8px" }}>
            <FaDollarSign size={32} color="#fd7e14" />
            <span style={{ fontSize: "1rem", fontWeight: "400" }}>Earnings</span>
            <span style={{ fontSize: "1.2rem", fontWeight: "700", textAlign: "center" }}>
              ₱{orders.filter(order => order.assignedRider === "rider1" && order.currentStatus === "delivered")
                .reduce((sum, order) => sum + (order.total || 0), 0).toFixed(2)}
            </span>
          </Card>
        </div>
      </Container>
      <div style={{ marginTop: "1px" }}>
        <Tabs
          id="order-tabs"
          activeKey={tabKey}
          onSelect={(k) => setTabKey(k)}
          className="mb-3"
          style={{ backgroundColor: "white", borderRadius: "8px", padding: "10px" }}
        >
          <Tab eventKey="active" title="Active Orders">
            <div className={`active-orders-container ${orders.filter(order => order.assignedRider === "rider1" && !["delivered", "cancelled", "returned"].includes(order.currentStatus)).length === 2 ? "two-cards" : ""}`}>
              {orders.filter(order => order.assignedRider === "rider1" &&
                !["delivered", "cancelled", "returned"].includes(order.currentStatus)).length === 0 ? (
                <p>No active orders.</p>
              ) : (
                orders.filter(order => order.assignedRider === "rider1" &&
                  !["delivered", "cancelled", "returned"].includes(order.currentStatus)).map(order => (
                  <Card key={order.id} className="active-order-card" style={{ padding: "20px", textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-start", width: "300px", marginBottom: "15px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                      <h5 style={{ color: "#4b929d" }}>Order #{order.id}</h5>
                      <p style={{
                        fontWeight: "600",
                        marginBottom: "5px",
                        color: getStatusStyle(order.currentStatus).color,
                        backgroundColor: getStatusStyle(order.currentStatus).backgroundColor,
                        padding: "4px 8px",
                        borderRadius: "4px",
                        minWidth: "110px",
                        textAlign: "center"
                      }}>
                        {{
                          pending: "Pending",
                          confirmed: "Confirmed",
                          preparing: "Preparing",
                          readyToPickup: "Ready to Pickup",
                          pickedUp: "Picked Up",
                          inTransit: "In transit",
                          delivered: "Delivered",
                          cancelled: "Cancelled",
                          returned: "Cancelled/Returned"
                        }[order.currentStatus] || order.currentStatus}
                      </p>
                    </div>
                    <p style={{ marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", color: "gray" }}><FaClock color="#4b929d" /> Ordered at {order.orderedAt}</p>
                    <p style={{ marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", color: "black" }}><FaUser color="#4b929d" /> {order.customerName}</p>
                    <p style={{ marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", color: "black" }}><FaPhone color="#4b929d" /> {order.phone.replace(/^\+1-/, "63")}</p>
                    <p style={{ marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", color: "black" }}><FaMapMarkerAlt color="#4b929d" /> {order.address}</p>
                    <p style={{ fontWeight: "600", marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", color: "black" }}><FaBox color="#4b929d" /> Items ({order.items.length})</p>
                    {order.items.map((item, i) => (
                      <p key={i} style={{ marginBottom: "3px", alignSelf: "flex-start", color: "black", display: "flex", justifyContent: "space-between", width: "100%" }}>
                        <span>{item.quantity}x {item.name}</span>
                        <span style={{ marginLeft: "auto" }}>₱{item.price.toFixed(2)}</span>
                      </p>
                    ))}
                    <hr style={{ alignSelf: "stretch" }} />
                    <p style={{ fontWeight: "600", marginBottom: "0", alignSelf: "flex-start", color: "black", display: "flex", justifyContent: "space-between", width: "100%" }}>
                      <span>Total</span>
                      <span style={{ marginLeft: "auto" }}>₱{order.total.toFixed(2)}</span>
                    </p>
                    {!order.assignedRider && (
                      <p style={{ backgroundColor: "#fff3cd", padding: "8px", borderRadius: "4px", marginTop: "10px", color: "#856404", width: "100%" }}>
                        Note: Please call when arrived
                      </p>
                    )}
                    {order.assignedRider && (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", width: "100%", backgroundColor: "#f0f0f0", padding: "10px", borderRadius: "6px" }}>
                        <img src={riderImage} alt={order.assignedRider} style={{ width: "50px", height: "50px", borderRadius: "50%" }} />
                        <div>
                          <div style={{ fontWeight: "600" }}>{order.assignedRider}</div>
                          <div>{riders[order.assignedRider]?.phone}</div>
                          <div>Active Orders: {riders[order.assignedRider]?.activeOrders}</div>
                        </div>
                      </div>
                    )}
                    <div style={{ marginTop: "10px", width: "100%" }}>
                      <label htmlFor={`assignRider-${order.id}`} style={{ fontWeight: "600", marginBottom: "5px", display: "block" }}>Assign Rider</label>
                      <Form.Select
                        id={`assignRider-${order.id}`}
                        value={order.assignedRider || ""}
                        onChange={(e) => handleRiderChange(order.id, e.target.value)}
                      >
                        <option value="">Select Rider</option>
                        <option value="rider1">Rider 1</option>
                        <option value="rider2">Rider 2</option>
                        <option value="rider3">Rider 3</option>
                        <option value="rider4">Rider 4</option>
                        <option value="rider5">Rider 5</option>
                        <option value="rider6">Rider 6</option>
                      </Form.Select>
                      <label htmlFor={`orderStatus-${order.id}`} style={{ fontWeight: "600", marginBottom: "5px", display: "block", marginTop: "10px" }}>Order Status</label>
                      <Form.Select
                        id={`orderStatus-${order.id}`}
                        value={order.currentStatus || ""}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="preparing">Preparing</option>
                        <option value="pickedUp">Picked Up</option>
                        <option value="inTransit">In transit</option>
                        <option value="delivered">Delivered</option>
                        <option value="returned">Cancelled/Returned</option>
                      </Form.Select>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Tab>
          <Tab eventKey="completed" title="Completed">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", justifyContent: "flex-start" }}>
              {orders.filter(order => order.assignedRider === "rider1" && order.currentStatus === "delivered").length === 0 ? (
                <p>No completed orders.</p>
              ) : (
                orders.filter(order => order.assignedRider === "rider1" && order.currentStatus === "delivered").map(order => (
                  <Card key={order.id} style={{ padding: "20px", textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-start", width: "300px", marginBottom: "15px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                      <h5 style={{ color: "#4b929d" }}>Order #{order.id}</h5>
                      <p style={{
                        fontWeight: "600",
                        marginBottom: "5px",
                        color: getStatusStyle(order.currentStatus).color,
                        backgroundColor: getStatusStyle(order.currentStatus).backgroundColor,
                        padding: "4px 8px",
                        borderRadius: "4px",
                        minWidth: "110px",
                        textAlign: "center"
                      }}>
                        {{
                          pending: "Pending",
                          confirmed: "Confirmed",
                          preparing: "Preparing",
                          readyToPickup: "Ready to Pickup",
                          pickedUp: "Picked Up",
                          inTransit: "In transit",
                          delivered: "Delivered",
                          cancelled: "Cancelled",
                          returned: "Cancelled/Returned"
                        }[order.currentStatus] || order.currentStatus}
                      </p>
                    </div>
                    <p style={{ marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", color: "gray" }}><FaClock color="#4b929d" /> Ordered at {order.orderedAt}</p>
                    <p style={{ marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", color: "black" }}><FaUser color="#4b929d" /> {order.customerName}</p>
                    <p style={{ marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", color: "black" }}><FaPhone color="#4b929d" /> {order.phone.replace(/^\+1-/, "63")}</p>
                    <p style={{ marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", color: "black" }}><FaMapMarkerAlt color="#4b929d" /> {order.address}</p>
                    <p style={{ fontWeight: "600", marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", color: "black" }}><FaBox color="#4b929d" /> Items ({order.items.length})</p>
                    {order.items.map((item, i) => (
                      <p key={i} style={{ marginBottom: "3px", alignSelf: "flex-start", color: "black", display: "flex", justifyContent: "space-between", width: "100%" }}>
                        <span>{item.quantity}x {item.name}</span>
                        <span style={{ marginLeft: "auto" }}>₱{item.price.toFixed(2)}</span>
                      </p>
                    ))}
                    <hr style={{ alignSelf: "stretch" }} />
                    <p style={{ fontWeight: "600", marginBottom: "0", alignSelf: "flex-start", color: "black", display: "flex", justifyContent: "space-between", width: "100%" }}>
                      <span>Total</span>
                      <span style={{ marginLeft: "auto" }}>₱{order.total.toFixed(2)}</span>
                    </p>
                    {!order.assignedRider && (
                      <p style={{ backgroundColor: "#fff3cd", padding: "8px", borderRadius: "4px", marginTop: "10px", color: "#856404", width: "100%" }}>
                        Note: Please call when arrived
                      </p>
                    )}
                    {order.assignedRider && (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", width: "100%", backgroundColor: "#f0f0f0", padding: "10px", borderRadius: "6px" }}>
                        <img src={riderImage} alt={order.assignedRider} style={{ width: "50px", height: "50px", borderRadius: "50%" }} />
                        <div>
                          <div style={{ fontWeight: "600" }}>{order.assignedRider}</div>
                          <div>{riders[order.assignedRider]?.phone}</div>
                          <div>Active Orders: {riders[order.assignedRider]?.activeOrders}</div>
                        </div>
                      </div>
                    )}
                    <div style={{ marginTop: "10px", width: "100%" }}>
                      <label htmlFor={`assignRider-${order.id}`} style={{ fontWeight: "600", marginBottom: "5px", display: "block" }}>Assign Rider</label>
                      <Form.Select
                        id={`assignRider-${order.id}`}
                        value={order.assignedRider || ""}
                        onChange={(e) => handleRiderChange(order.id, e.target.value)}
                      >
                        <option value="">Select Rider</option>
                        <option value="rider1">Rider 1</option>
                        <option value="rider2">Rider 2</option>
                        <option value="rider3">Rider 3</option>
                        <option value="rider4">Rider 4</option>
                        <option value="rider5">Rider 5</option>
                        <option value="rider6">Rider 6</option>
                      </Form.Select>
                      <label htmlFor={`orderStatus-${order.id}`} style={{ fontWeight: "600", marginBottom: "5px", display: "block", marginTop: "10px" }}>Order Status</label>
                      <Form.Select
                        id={`orderStatus-${order.id}`}
                        value={order.currentStatus || ""}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="preparing">Preparing</option>
                        <option value="pickedUp">Picked Up</option>
                        <option value="inTransit">In transit</option>
                        <option value="delivered">Delivered</option>
                        <option value="returned">Cancelled/Returned</option>
                      </Form.Select>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Tab>
        </Tabs>
      </div>
    </>
  );
}

export default RiderHome;