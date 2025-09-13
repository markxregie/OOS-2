import React, { useState, useEffect } from 'react';
import { FaChevronDown, FaBell, FaBoxOpen, FaCheckCircle, FaDollarSign, FaClock, FaUser, FaPhone, FaMapMarkerAlt, FaBox, FaTruckPickup, FaTruckMoving, FaUndo, FaSignOutAlt } from "react-icons/fa";
import { Container, Card, Form } from "react-bootstrap";
import riderImage from "../../assets/rider.jpg";
import "../admin2/manageorder.css";

function RiderDashboard() {
  const userRole = "Admin";
  const userName = "Lim Alcovendas";

  const [currentDate, setCurrentDate] = useState(new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Close dropdown when clicking outside
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

  const [statusFilter, setStatusFilter] = useState("all");
  const [riderFilter, setRiderFilter] = useState("all");

  const [selectedRider, setSelectedRider] = useState("rider1");

  const [orders, setOrders] = useState([]);

  useEffect(() => {
    setOrders(sampleOrders);
  }, []);

  const riders = {
    rider1: { name: "John Doe", phone: "09123456789", activeOrders: 2 },
    rider2: { name: "Jane Smith", phone: "09123456780", activeOrders: 1 },
  };

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
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const currentDateFormatted = currentDate.toLocaleString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric",
  });

  const handleRiderChange = (orderId, newRider) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, assignedRider: newRider } : order
      )
    );
  };

  const handleStatusChange = (orderId, newStatus) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, currentStatus: newStatus } : order
      )
    );
  };

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

  return (
    <div className="d-flex" style={{ height: "100vh", backgroundColor: "#edf7f9" }}>
      <div className="p-4 main-content" style={{ marginLeft: "0px", width: "100%" }}>
        <header className="manage-header">
          <div className="header-left">
            <h2 className="page-title">Rider Dashboard</h2>
          </div>
          <div className="header-right">
            <div className="header-date">{currentDateFormatted}</div>
            <div className="header-profile">
              <div className="profile-pic"></div>
              <div className="profile-info">
                <div className="profile-role">Hi! I'm {userRole}</div>
                <div className="profile-name">{userName}</div>
              </div>
              <div className="bell-icon"><FaBell className="bell-outline" /></div>
              <div className="dropdown-icon" style={{ cursor: "pointer", position: "relative" }} onClick={() => setDropdownOpen(!dropdownOpen)}>
                <FaChevronDown />
                {dropdownOpen && (
                  <div className="profile-dropdown" style={{ position: "absolute", top: "100%", right: 0, backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", zIndex: 1000, width: "150px" }}>
                    <ul style={{ listStyle: "none", margin: 0, padding: "8px 0" }}>
                      <li
                        onClick={() => window.location.reload()}
                        style={{ cursor: "pointer", padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px", color: "#4b929d" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f0f0f0"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <FaUndo /> Refresh
                      </li>
                      <li
                        onClick={() => { localStorage.removeItem("access_token"); window.location.href = "http://localhost:4002/"; }}
                        style={{ cursor: "pointer", padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px", color: "#dc3545" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f8d7da"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <FaSignOutAlt /> Logout
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <Container fluid style={{ backgroundColor: "#a3d3d8", borderRadius: "8px", padding: "20px", marginTop: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <img src={riders[selectedRider]?.imageUrl || riderImage} alt={riders[selectedRider]?.name || "Rider"} style={{ width: "60px", height: "60px", borderRadius: "50%" }} />
              <span style={{ color: "#4b929d", fontWeight: "600", fontSize: "1.2rem" }}>{riders[selectedRider]?.name || "Rider"}</span>
            </div>
            <select
              style={{ height: "30px", width: "200px", fontSize: "1rem", fontWeight: "600", color: "black", borderRadius: "4px", border: "none", backgroundColor: "white" }}
              value={selectedRider}
              onChange={(e) => {
                setSelectedRider(e.target.value);
                setRiderFilter(e.target.value);
              }}
            >
              <option value="rider1">Rider 1</option>
              <option value="rider2">Rider 2</option>
              <option value="rider3">Rider 3</option>
              <option value="rider4">Rider 4</option>
              <option value="rider5">Rider 5</option>
              <option value="rider6">Rider 6</option>
            </select>
          </div>
    <div style={{ display: "flex", justifyContent: "space-around", gap: "20px", flexWrap: "wrap" }}>
      <Card style={{ flex: "1", minWidth: "150px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", backgroundColor: "white", color: "#4b929d", borderRadius: "8px" }}>
        <FaBoxOpen size={32} color="#964b00" />
        <span style={{ fontSize: "1rem", fontWeight: "400" }}>Active Orders</span>
        <span style={{ fontSize: "1.2rem", fontWeight: "700", textAlign: "center" }}>
          {orders.filter(order => order.assignedRider === selectedRider && order.currentStatus !== "delivered" && order.currentStatus !== "cancelled" && order.currentStatus !== "returned").length} orders
        </span>
      </Card>
      <Card style={{ flex: "1", minWidth: "150px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", backgroundColor: "white", color: "#4b929d", borderRadius: "8px" }}>
        <FaCheckCircle size={32} color="#198754" />
        <span style={{ fontSize: "1rem", fontWeight: "400" }}>Completed</span>
        <span style={{ fontSize: "1.2rem", fontWeight: "700", textAlign: "center" }}>
          {orders.filter(order => order.assignedRider === selectedRider && order.currentStatus === "delivered").length} orders
        </span>
      </Card>
      <Card style={{ flex: "1", minWidth: "150px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", backgroundColor: "white", color: "#4b929d", borderRadius: "8px" }}>
        <FaDollarSign size={32} color="#fd7e14" />
        <span style={{ fontSize: "1rem", fontWeight: "400" }}>Earnings</span>
        <span style={{ fontSize: "1.2rem", fontWeight: "700", textAlign: "center" }}>
          ₱{orders.filter(order => order.assignedRider === selectedRider && order.currentStatus === "delivered").reduce((sum, order) => sum + order.total, 0).toFixed(2)}
        </span>
      </Card>
    </div>
        </Container>
        <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "20px" }}>
          <button
            style={{
              padding: "10px 20px",
              borderRadius: "20px 0 0 20px",
              border: "1px solid #4b929d",
              borderRight: "none",
              cursor: "pointer",
              backgroundColor: toggle === "active" ? "#4b929d" : "white",
              color: toggle === "active" ? "white" : "#4b929d"
            }}
            onClick={() => setToggle("active")}
            className={toggle === "active" ? "active-toggle" : ""}
          >
            Active Orders
          </button>
          <button
            style={{
              padding: "10px 20px",
              borderRadius: "0",
              border: "1px solid #4b929d",
              borderRight: "none",
              cursor: "pointer",
              backgroundColor: toggle === "all" ? "#4b929d" : "white",
              color: toggle === "all" ? "white" : "#4b929d"
            }}
            onClick={() => setToggle("all")}
            className={toggle === "all" ? "active-toggle" : ""}
          >
            All Orders
          </button>
          <button
            style={{
              padding: "10px 20px",
              borderRadius: "0 20px 20px 0",
              border: "1px solid #4b929d",
              cursor: "pointer",
              backgroundColor: toggle === "completed" ? "#4b929d" : "white",
              color: toggle === "completed" ? "white" : "#4b929d"
            }}
            onClick={() => setToggle("completed")}
            className={toggle === "completed" ? "active-toggle" : ""}
          >
            Completed
          </button>
        </div>
        <div style={{ marginTop: "20px", fontWeight: "600", color: "#4b929d" }}>
          {toggle === "active" && <div>Showing Active Orders</div>}
          {toggle === "all" && <div>Showing All Orders</div>}
          {toggle === "completed" && <div>Showing Completed Orders</div>}
        </div>
        {toggle === "active" && (
         <div style={{
  display: "flex",
  gap: "20px",
  marginTop: "20px",
  justifyContent: "flex-start",
  flexWrap: "wrap",
  alignItems: "flex-start",
  width: "100%"
}}>
  {orders
    .filter(order => order.assignedRider === selectedRider)
    .filter(order => {
      if (toggle === "active") {
        return !["delivered", "cancelled", "returned"].includes(order.currentStatus);
      } else if (toggle === "completed") {
        return order.currentStatus === "delivered";
      }
      return true; // "all" filter
    })
    .map((order, idx) => (
      <Card key={idx} style={{ padding: "20px", textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-start", width: "300px" }}>
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
        <p style={{ marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", color: "gray" }}>
          <FaClock color="#4b929d" /> Ordered at {order.orderedAt}
        </p>
        <p style={{ marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", color: "black" }}>
          <FaUser color="#4b929d" /> {order.customerName}
        </p>
        <p style={{ marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", color: "black" }}>
          <FaPhone color="#4b929d" /> {order.phone.replace(/^\+1-/, "63")}
        </p>
        <p style={{ marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", color: "black" }}>
          <FaMapMarkerAlt color="#4b929d" /> {order.address}
        </p>
        <p style={{ fontWeight: "600", marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", color: "black" }}>
          <FaBox color="#4b929d" /> Items ({order.items?.length || 0})
        </p>
        {order.items?.map((item, i) => (
          <p key={i} style={{ marginBottom: "3px", alignSelf: "flex-start", color: "black", display: "flex", justifyContent: "space-between", width: "100%" }}>
            <span>{item.quantity}x {item.name}</span>
            <span style={{ marginLeft: "auto" }}>₱{item.price.toFixed(2)}</span>
          </p>
        ))}
        <hr style={{ alignSelf: "stretch" }} />
        <p style={{ fontWeight: "600", marginBottom: "0", alignSelf: "flex-start", color: "black", display: "flex", justifyContent: "space-between", width: "100%" }}>
          <span>Total</span>
          <span style={{ marginLeft: "auto" }}>₱{order.total?.toFixed(2) || "0.00"}</span>
        </p>
        <div style={{ marginTop: "10px", width: "100%" }}>
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
    ))}

          </div>
        )}
      </div>
    </div>
  );
}

export default RiderDashboard;