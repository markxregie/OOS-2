import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Container } from "react-bootstrap";
import { FaChevronDown, FaBell, FaSignOutAlt, FaBoxOpen, FaCheckCircle, FaSpinner, FaTruck, FaFilter, FaClock, FaUser, FaPhone, FaMapMarkerAlt, FaBox, FaTimesCircle, FaTruckPickup, FaTruckMoving, FaUndo, FaAngleDoubleLeft, FaAngleLeft, FaAngleRight, FaAngleDoubleRight } from "react-icons/fa";
import { Card, Form } from "react-bootstrap";
import riderImage from "../../assets/rider.jpg";
import Swal from "sweetalert2";
import "./deliverymanagement.css";
import adminImage from "../../assets/administrator.png";

function DeliveryManagement() {
  const userRole = "Admin";
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const [authToken, setAuthToken] = useState(null);
  const [userName, setUserName] = useState("Loading...");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");
  const [riderFilter, setRiderFilter] = useState("all");

  const [orders, setOrders] = useState([]);
  const [showRiderDropdown, setShowRiderDropdown] = useState({});
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [showChangeRiderDropdown, setShowChangeRiderDropdown] = useState({});

  const [riders, setRiders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 12;

  const [localAssignments, setLocalAssignments] = useState(() => {
    const stored = localStorage.getItem("riderAssignments");
    return stored ? JSON.parse(stored) : {};
  });

  // Optimized data fetching with parallel requests
  const fetchInitialData = useCallback(async () => {
    if (!authToken) return;
    setError(null);
    setIsLoading(true);

    try {
      const [ordersResponse, ridersResponse, pendingResponse] = await Promise.all([
        fetch("http://localhost:7004/delivery/admin/delivery/orders", {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch("http://localhost:7001/delivery/riders", {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch("http://localhost:7004/cart/admin/orders/pending", {
          headers: { Authorization: `Bearer ${authToken}` },
        })
      ]);

      if (!ordersResponse.ok || !ridersResponse.ok || !pendingResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const [ordersData, ridersData, pendingData] = await Promise.all([
        ordersResponse.json(),
        ridersResponse.json(),
        pendingResponse.json()
      ]);
      const ordersWithAssignments = ordersData.map(order => ({
        ...order,
        assignedRider: localAssignments[order.id] ?? order.assignedRider ?? null
      }));
      setOrders(ordersWithAssignments);
      setRiders(Array.isArray(ridersData) ? ridersData : []);
      setPendingOrdersCount(Array.isArray(pendingData) ? pendingData.length : 0);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;

    let interval;
    const initialize = async () => {
      await fetchInitialData();
      // Start refresh loop
      interval = setInterval(fetchInitialData, 10000);
    };

    initialize();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [authToken]);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('authorization');
    const usernameFromUrl = searchParams.get('username');

    if (tokenFromUrl) {
      setAuthToken(tokenFromUrl);
      localStorage.setItem("authToken", tokenFromUrl); // Save to localStorage
    } else {
      const storedToken = localStorage.getItem("authToken");
      if (storedToken) {
        setAuthToken(storedToken);
      } else {
        console.error("Authorization token not found in URL or localStorage.");
      }
    }

    if (usernameFromUrl) {
      setUserName(usernameFromUrl);
      localStorage.setItem("userName", usernameFromUrl); // Save to localStorage
    } else {
      const storedUsername = localStorage.getItem("userName");
      if (storedUsername) {
        setUserName(storedUsername);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authToken) return;

    const fetchRiders = async () => {
      try {
        const response = await fetch("http://localhost:7001/delivery/riders", {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Fetched riders:", data);
        setRiders(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch riders:", error);
        setRiders([]);
      }
    };

    fetchRiders();
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;

    const fetchPendingOrdersCount = async () => {
      try {
        const response = await fetch("http://localhost:7004/cart/admin/orders/pending", {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // The backend endpoint returns list of pending orders, so count length
        if (Array.isArray(data)) {
          setPendingOrdersCount(data.length);
        } else if (data.pending_orders_count !== undefined) {
          setPendingOrdersCount(data.pending_orders_count);
        } else {
          setPendingOrdersCount(0);
        }
      } catch (error) {
        console.error("Failed to fetch pending orders count:", error);
      }
    };

    fetchPendingOrdersCount();
  }, [authToken]);

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

  const handleRiderSelection = (orderId, riderId) => {
    if (!riderId) return; // Don't show modal if no rider selected

    const rider = riders.find(r => r.UserID.toString() === riderId);
    if (!rider) return;

    Swal.fire({
      title: 'Confirm Rider Assignment',
      html: `
        <div style="text-align: left;">
          <p><strong>Rider:</strong> ${rider.FullName}</p>
          <p><strong>Phone:</strong> ${rider.Phone}</p>
          <p><strong>Plate No:</strong> ${rider.PlateNumber || 'N/A'}</p>
        </div>
        <p style="margin-top: 15px; font-size: 14px; color: #666;">
          Are you sure you want to assign this rider to this order?
        </p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4b929d',
      cancelButtonColor: '#dc3545',
      confirmButtonText: 'Yes, Assign Rider',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'swal-wide'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        handleRiderAssignment(orderId, riderId);
      }
    });
  };

  const handleRiderAssignment = async (orderId, riderId) => {
    try {
      const response = await fetch(
        `http://localhost:7004/delivery/orders/${orderId}/assign-rider?rider_id=${riderId}`,
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${authToken}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Assign rider response:", result);

      // ✅ Update frontend state with selected rider
      handleRiderChange(orderId, riderId);

      // 💡 NEW: Update local assignments and persist to localStorage
      setLocalAssignments(prev => {
        const updated = { ...prev, [orderId]: riderId };
        localStorage.setItem("riderAssignments", JSON.stringify(updated));
        return updated;
      });

      // Hide dropdown after assignment
      setShowChangeRiderDropdown(prev => ({
        ...prev,
        [orderId]: false
      }));

      Swal.fire({
        title: "Rider Assigned Successfully!",
        text: "The rider has been assigned to this order.",
        icon: "success",
        confirmButtonColor: "#198754",
        confirmButtonText: "OK"
      });

    } catch (error) {
      console.error("Failed to assign rider:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to assign rider. Please try again.",
        icon: "error",
        confirmButtonColor: "#dc3545"
      });
    }
  };

  const handleChangeRiderClick = (orderId) => {
    setShowChangeRiderDropdown(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const handleStatusChange = (orderId, newStatus) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, currentStatus: newStatus } : order
      )
    );
  };
  

  const getStatusStyle = (status) => {
    const normalizedStatus = status ? status.toLowerCase() : "";
    switch (normalizedStatus) {
      case "pending":
        return { color: "#d39e00", backgroundColor: "#fff3cd" };
      case "confirmed":
        return { color: "#198754", backgroundColor: "#d1e7dd" };
      case "preparing":
        return { color: "#2980b9", backgroundColor: "#cfe2ff" };
      case "waitingforpickup":
        return { color: "#ffffff", backgroundColor: "#9c27b0" };
      case "readytopickup":
        return { color: "#8e44ad", backgroundColor: "#e5dbff" };
      case "pickedup":
        return { color: "#0d6efd", backgroundColor: "#cfe2ff" };
      case "intransit":
      case "delivering":
        return { color: "#3f51b5", backgroundColor: "#e5dbff" };
      case "delivered":
        return { color: "#198754", backgroundColor: "#d1e7dd" };
      case "completed":
        return { color: "#198754", backgroundColor: "#d1e7dd" };
      case "cancelled":
        return { color: "#dc3545", backgroundColor: "#f8d7da" };
      case "returned":
        return { color: "#fd7e14", backgroundColor: "#ffe5d0" };
      default:
        return { color: "black", backgroundColor: "transparent" };
    }
  };

  
  // Memoized filtered orders and pagination calculations
  const { filteredOrders, totalPages, currentOrders, indexOfFirstOrder, indexOfLastOrder } = useMemo(() => {
    const filtered = orders
      .filter(order => (statusFilter === "all" || order.currentStatus === statusFilter))
      .filter(order => (riderFilter === "all" || order.assignedRider === riderFilter));

    const total = Math.ceil(filtered.length / ordersPerPage);
    const lastOrderIndex = currentPage * ordersPerPage;
    const firstOrderIndex = lastOrderIndex - ordersPerPage;
    const current = filtered.slice(firstOrderIndex, lastOrderIndex);

    return {
      filteredOrders: filtered,
      totalPages: total,
      currentOrders: current,
      indexOfFirstOrder: firstOrderIndex,
      indexOfLastOrder: lastOrderIndex
    };
  }, [orders, statusFilter, riderFilter, currentPage, ordersPerPage]);

  // Optimized pagination handlers with useCallback
  const paginate = useCallback((pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  }, [totalPages]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  }, [currentPage, totalPages]);

  const handleFirstPage = useCallback(() => setCurrentPage(1), []);
  const handleLastPage = useCallback(() => setCurrentPage(totalPages), [totalPages]);

  if (error) {
    return (
      <div className="error-message">
        <FaTimesCircle size={40} color="#dc3545" />
        <p>{error}</p>
        <button onClick={fetchInitialData} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="d-flex" style={{ height: "100vh", backgroundColor: "#edf7f9" }}>
      <Container fluid className="p-4 main-content" style={{ marginLeft: "0px", width: "calc(100% - 0px)" }}>
            <header className="manage-header">
          <div className="header-left">
            <h2 className="page-title">Delivery Management</h2>
          </div>
          <div className="header-right">
            <div className="header-date">{currentDateFormatted}</div>
             <div className="header-profile">
                 <img src={adminImage} alt="Admin" className="profile-pic" />
              <div className="profile-info">
                <div className="profile-role">Hi! I'm {userRole}</div>
                <div className="profile-name">Admin OOS</div>
              </div>
              <div className="dropdown-icon" onClick={() => setDropdownOpen(!dropdownOpen)}><FaChevronDown /></div>
              
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
        </header>
        <div className="status-labels" style={{ display: "flex", justifyContent: "space-around", marginTop: "10px", marginBottom: "20px", gap: "15px", flexWrap: "wrap" }}>
          {(() => {
            const statusCounts = {
              pending: 0,
              preparing: 0,
              inTransit: 0,
              delivered: 0,
              cancelled: 0,
              returned: 0,
            };
            orders.forEach(order => {
              // Normalize status for counting
              const status = order.currentStatus ? order.currentStatus.toLowerCase() : "";
              // Handle 'delivering' if it's a distinct status or maps to inTransit
              if (status === "delivering") {
                statusCounts.inTransit++;
              } else if (statusCounts.hasOwnProperty(status)) {
                statusCounts[status]++;
              }
            });
            return (
              <>
                <Card style={{ flex: "1", minWidth: "150px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <FaClock color="#d39e00" size={32} />
                  <span style={{ fontSize: "1rem", fontWeight: "400" }}>Pending</span>
                  <span style={{ fontSize: "1.2rem", fontWeight: "700", textAlign: "center" }}>{pendingOrdersCount}</span>
                </Card>
                <Card style={{ flex: "1", minWidth: "150px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <FaSpinner color="#2980b9" size={32} />
                  <span style={{ fontSize: "1rem", fontWeight: "400" }}>Preparing</span>
                  <span style={{ fontSize: "1.2rem", fontWeight: "700", textAlign: "center" }}>{statusCounts.preparing}</span>
                </Card>
                <Card style={{ flex: "1", minWidth: "150px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <FaTruckMoving color="#6610f2" size={32} />
                  <span style={{ fontSize: "1rem", fontWeight: "400" }}>Delivering</span>
                  <span style={{ fontSize: "1.2rem", fontWeight: "700", textAlign: "center" }}>{statusCounts.inTransit}</span>
                </Card>
                <Card style={{ flex: "1", minWidth: "150px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <FaTruck color="#198754" size={32} />
                  <span style={{ fontSize: "1rem", fontWeight: "400" }}>Delivered</span>
                  <span style={{ fontSize: "1.2rem", fontWeight: "700", textAlign: "center" }}>{statusCounts.delivered}</span>
                </Card>
                <Card style={{ flex: "1", minWidth: "150px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <FaUndo color="#fd7e14" size={32} />
                  <span style={{ fontSize: "1rem", fontWeight: "400" }}>Cancelled/Returned</span>
                  <span style={{ fontSize: "1.2rem", fontWeight: "700", textAlign: "center" }}>{statusCounts.cancelled + statusCounts.returned}</span>
                </Card>
              </>
            );
          })()}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "15px", marginTop: "20px", backgroundColor: "transparent", padding: "10px", borderRadius: "8px" }}>
          <div style={{ fontWeight: "600", fontSize: "1rem" }}>
            Orders {indexOfFirstOrder + 1} to {Math.min(indexOfLastOrder, filteredOrders.length)} of {filteredOrders.length}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <FaFilter size={20} />
            <span>Filter:</span>
            <Form.Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} // 💡 NEW: Reset page on filter change
              style={{ width: "300px", marginLeft: "8px" }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="preparing">Preparing</option>
              <option value="inTransit">Delivering</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="returned">Cancelled/Returned</option>
            </Form.Select>
            <Form.Select
              value={riderFilter}
              onChange={(e) => { setRiderFilter(e.target.value); setCurrentPage(1); }} // 💡 NEW: Reset page on filter change
              style={{ width: "300px", marginLeft: "8px" }}
            >
              <option value="all">All Riders</option>
              {riders.map((rider) => (
                <option key={rider.UserID} value={rider.UserID.toString()}>
                  {rider.FullName}
                </option>
              ))}
            </Form.Select>
          </div>
        </div>
        {/*UPDATED: Use currentOrders which is the paginated slice */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "20px",
          marginTop: "20px",
          justifyContent: "flex-start",
          alignItems: "flex-start",
          width: "100%"
        }}>
          {currentOrders.map((order, idx) => {
            const restrictedStatuses = ["pickedup", "delivered", "cancelled", "returned"];
            const canChangeRider = !restrictedStatuses.includes(order.currentStatus?.toLowerCase());
            return (
              <Card key={idx} style={{ padding: "20px", textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-start", width: "350px", height: "500px", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <h5 style={{ color: "#2c3e50", fontWeight: "700" }}>Order #{order.id}</h5>
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
                    waitingforpickup: "Waiting for Pickup",
                    readytopickup: "Ready to Pickup",
                    pickedup: "Picked Up",
                    intransit: "Delivering", 
                    delivering: "Delivering",
                    delivered: "Delivered",
                    completed: "Completed",
                    cancelled: "Cancelled",
                    returned: "Cancelled/Returned"
                  }[order.currentStatus ? order.currentStatus.toLowerCase() : ""] || order.currentStatus}
                </p>
              </div>
              <p style={{ marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", color: "gray" }}><FaClock color="#4b929d" /> Ordered at <span style={{ fontWeight: "500", color: "#2c3e50" }}>{order.orderedAt}</span></p>
              <p style={{ marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", color: "gray" }}><FaUser color="#4b929d" /> Customer: <span style={{ fontWeight: "500", color: "#2c3e50" }}>{order.customerName}</span></p>
              <p style={{ marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", color: "gray" }}><FaPhone color="#4b929d" /> Phone: <span style={{ fontWeight: "500", color: "#2c3e50" }}>{order.phone?.replace(/^\+1-/, "63") || "N/A"}</span></p>
              <p style={{ marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", color: "gray" }}><FaMapMarkerAlt color="#4b929d" /> Address: <span style={{ fontWeight: "500", color: "#2c3e50" }}>{order.address}</span></p>
              <p style={{ fontWeight: "600", marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", color: "gray" }}><FaBox color="#4b929d" /> Items ({order.items.length})</p>
              {order.items.map((item, i) => (
                <div key={i} style={{ marginBottom: "3px", alignSelf: "flex-start", color: "black", width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <span>{item.quantity}x {item.name}</span>
                    <span style={{ marginLeft: "auto" }}>₱{item.price.toFixed(2)}</span>
                  </div>
                  {item.addons && item.addons.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.85em", color: "#666" }}>
                      {item.addons.map((addon, j) => (
                        <li key={j}>+ {addon.addon_name} (₱{addon.price.toFixed(2)})</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              <hr style={{ alignSelf: "stretch" }} />
              <p style={{ fontWeight: "600", marginBottom: "0", alignSelf: "flex-start", color: "black", display: "flex", justifyContent: "space-between", width: "100%" }}>
                <span>Total</span>
                <span style={{ marginLeft: "auto" }}>₱{order.total.toFixed(2)}</span>
              </p>
              {!order.assignedRider && (
                <p style={{ backgroundColor: "#fff3cd", padding: "8px", borderRadius: "4px", marginTop: "10px", color: "#856404", width: "100%" }}>
                  {order.notes ? `Note: ${order.notes}` : "Note: Awaiting rider assignment"}
                </p>
              )}
              {order.assignedRider && (
                (() => {
                  const assignedRider = riders.find(r => r.UserID.toString() === order.assignedRider);
                  return assignedRider ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", width: "100%", backgroundColor: "#f0f0f0", padding: "10px", borderRadius: "6px" }}>
                      <img src={riderImage} alt={assignedRider.FullName} style={{ width: "50px", height: "50px", borderRadius: "50%" }} />
                      <div>
                        <div style={{ fontWeight: "600" }}>{assignedRider.FullName}</div>
                        <div>{assignedRider.Phone}</div>
                        {assignedRider.PlateNumber && (
                          <div style={{ fontStyle: "italic", color: "#4b929d", fontSize: "0.9rem" }}>
                            Plate No: {assignedRider.PlateNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null;
                })()
              )}
              <div style={{ marginTop: "10px", width: "100%" }}>
                {!order.assignedRider && canChangeRider ? (
                  <>
                    <label htmlFor={`assignRider-${order.id}`} style={{ fontWeight: "600", marginBottom: "5px", display: "block" }}>Assign Rider</label>
                    <Form.Select
                      id={`assignRider-${order.id}`}
                      value={order.assignedRider || ""}
                      onChange={(e) => handleRiderSelection(order.id, e.target.value)}
                    >
                      <option value="">Select Rider</option>
                      {riders.map((rider) => (
                        <option key={rider.UserID} value={rider.UserID.toString()}>
                          {rider.FullName}
                        </option>
                      ))}
                    </Form.Select>
                  </>
                ) : order.assignedRider && canChangeRider ? (
                  <>
                    <button
                      onClick={() => handleChangeRiderClick(order.id)}
                      style={{
                        backgroundColor: "#4b929d",
                        color: "white",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: "600",
                        width: "100%"
                      }}
                    >
                      Change Rider
                    </button>
                    {showChangeRiderDropdown[order.id] && (
                      <div style={{ marginTop: "10px", width: "100%" }}>
                        <Form.Select
                          id={`changeRider-${order.id}`}
                          value={order.assignedRider || ""}
                          onChange={(e) => handleRiderSelection(order.id, e.target.value)}
                        >
                          <option value="">Select Rider</option>
                          {riders.map((rider) => (
                            <option key={rider.UserID} value={rider.UserID.toString()}>
                              {rider.FullName}
                            </option>
                          ))}
                        </Form.Select>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
              </Card>
            );
          })}
        </div>
        {/* 💡 NEW: Pagination Controls */}
        {filteredOrders.length > ordersPerPage && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div>
              Showing {indexOfFirstOrder + 1} to {Math.min(indexOfLastOrder, filteredOrders.length)} of {filteredOrders.length} entries
            </div>
            <div className="d-flex align-items-center">
              <button className="pagination-btn" onClick={handleFirstPage} disabled={currentPage === 1}>
                <FaAngleDoubleLeft />
              </button>
              <button className="pagination-btn" onClick={handlePrevPage} disabled={currentPage === 1}>
                <FaAngleLeft />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                <button
                  key={number}
                  className={`pagination-btn ${currentPage === number ? 'active' : ''}`}
                  onClick={() => paginate(number)}
                >
                  {number}
                </button>
              ))}
              <button className="pagination-btn" onClick={handleNextPage} disabled={currentPage === totalPages}>
                <FaAngleRight />
              </button>
              <button className="pagination-btn" onClick={handleLastPage} disabled={currentPage === totalPages}>
                <FaAngleDoubleRight />
              </button>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}

export default DeliveryManagement;