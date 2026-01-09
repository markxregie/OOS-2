import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Container, Modal } from "react-bootstrap";
import { FaChevronDown, FaBell, FaSignOutAlt, FaBoxOpen, FaCheckCircle, FaSpinner, FaTruck, FaFilter, FaClock, FaUser, FaPhone, FaMapMarkerAlt, FaBox, FaTimesCircle, FaTruckPickup, FaTruckMoving, FaUndo, FaAngleDoubleLeft, FaAngleLeft, FaAngleRight, FaAngleDoubleRight, FaCog, FaTimes, FaExclamationTriangle, FaGift, FaCar, FaImage } from "react-icons/fa";
import { Card, Form } from "react-bootstrap";
import riderImage from "../../assets/rider.jpg";
import Swal from "sweetalert2";
import "./deliverymanagement.css";
import adminImage from "../../assets/administrator.png";
import { showPreparationTimeModal } from "./modals/PreparationTimeModal";

function DeliveryManagement() {
  const userRole = "Admin";
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

  // Modal state for order details
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [riders, setRiders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 12;

  const [localAssignments, setLocalAssignments] = useState(() => {
    const stored = localStorage.getItem("riderAssignments");
    return stored ? JSON.parse(stored) : {};
  });

  const [deliveryFees, setDeliveryFees] = useState({
    baseFee: 50.0,
    baseDistance: 3.0,
    surchargePerKm: 10.0,
    maxRadius: 8.0,
    surgePricing: false,
    surgeFlatFee: 20.0,
  });

  // Reference for last fetch time to avoid dependency issues
  const lastFetchTimeRef = useRef(0);
  const CACHE_DURATION = 5000; // 5 seconds cache

  // Optimized data fetching with parallel requests and caching
  const fetchInitialData = useCallback(async (forceRefresh = false, showLoading = true) => {
    if (!authToken) return;
    
    // Prevent fetching if cache is still valid
    const now = Date.now();
    if (!forceRefresh && (now - lastFetchTimeRef.current) < CACHE_DURATION) {
      return;
    }
    
    setError(null);
    if (showLoading) {
      setIsLoading(true);
    }

    // Helper function to fetch with timeout
    const fetchWithTimeout = (url, options = {}, timeoutMs = 10000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      return fetch(url, { ...options, signal: controller.signal })
        .then(response => {
          clearTimeout(timeoutId);
          return response;
        })
        .catch(error => {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            throw new Error(`Request timeout (${timeoutMs}ms) for ${url}`);
          }
          throw error;
        });
    };

    try {
      const [ordersResponse, ridersResponse, pendingResponse, settingsResponse] = await Promise.all([
        fetchWithTimeout("http://localhost:7004/delivery/admin/delivery/orders", {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetchWithTimeout("http://localhost:7001/delivery/riders", {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetchWithTimeout("http://localhost:7004/cart/admin/orders/pending", {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetchWithTimeout("http://localhost:7001/delivery/settings", {
          headers: { Authorization: `Bearer ${authToken}` },
        })
      ]);

      if (!ordersResponse.ok) {
        throw new Error(`Orders fetch failed: ${ordersResponse.status}`);
      }
      if (!ridersResponse.ok) {
        throw new Error(`Riders fetch failed: ${ridersResponse.status}`);
      }
      if (!pendingResponse.ok) {
        throw new Error(`Pending orders fetch failed: ${pendingResponse.status}`);
      }

      const [ordersData, ridersData, pendingData, settingsData] = await Promise.all([
        ordersResponse.json(),
        ridersResponse.json(),
        pendingResponse.json(),
        // settings may fail; handle gracefully by catching parse errors later
        settingsResponse.ok ? settingsResponse.json() : Promise.resolve(null)
      ]);
      
      // Map assignedRider to string format to match UI expectations
      const ordersWithAssignments = ordersData.map(order => ({
        ...order,
        assignedRider: order.assignedRider || null
      }));
      
      setOrders(ordersWithAssignments);
      setRiders(Array.isArray(ridersData) ? ridersData : []);
      setPendingOrdersCount(Array.isArray(pendingData) ? pendingData.length : 0);
      // If settings returned from backend, map them into local state
      if (settingsData) {
        try {
          setDeliveryFees({
            baseFee: parseFloat(settingsData.BaseFee) || deliveryFees.baseFee,
            baseDistance: parseFloat(settingsData.BaseDistanceKm) || deliveryFees.baseDistance,
            surchargePerKm: parseFloat(settingsData.ExtraFeePerKm) || deliveryFees.surchargePerKm,
            maxRadius: parseFloat(settingsData.MaxRadiusKm) || deliveryFees.maxRadius,
            surgePricing: !!settingsData.IsSurgePricingActive,
            surgeFlatFee: parseFloat(settingsData.SurgeFlatFee) || 20.0,
          });
        } catch (err) {
          console.warn('Failed to parse delivery settings:', err);
        }
      }
      lastFetchTimeRef.current = now;
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please check that all backend services are running and accessible.');
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;

    let interval;
    const initialize = async () => {
      await fetchInitialData(true, true); // Force refresh on mount with loading spinner
      // Background refresh every 30 seconds without loading spinner
      interval = setInterval(() => fetchInitialData(true, false), 30000);
    };

    initialize();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [authToken, fetchInitialData]);

  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    if (storedToken) setAuthToken(storedToken);
    const userData = localStorage.getItem("userData");
    if (userData) {
      try { const parsed = JSON.parse(userData); if (parsed?.username) setUserName(parsed.username); } catch {}
    } else {
      const storedUsername = localStorage.getItem("userName");
      if (storedUsername) setUserName(storedUsername);
    }
    const onStorage = () => { setAuthToken(localStorage.getItem("authToken")); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Removed redundant rider fetching - now handled in fetchInitialData

  // Removed redundant pending orders fetching - now handled in fetchInitialData

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

      // Update frontend state with selected rider
      handleRiderChange(orderId, riderId);
      
      // Update selectedOrder state immediately to reflect changes in modal
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({
          ...prev,
          assignedRider: riderId
        }));
      }

      // Refresh data silently in background to sync with backend
      fetchInitialData(true, false);

      // Send notification to the assigned rider
      try {
        const rider = riders.find(r => r.UserID.toString() === riderId);
        if (rider) {
          await fetch("http://localhost:7002/notifications/create?username=" + encodeURIComponent(rider.UserID) + "&title=New%20Order%20Assigned&message=Order%20%23" + orderId + "%20has%20been%20assigned%20to%20you.%20Please%20proceed%20to%20pickup.&type=info&order_id=" + orderId, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${authToken}`,
              "Content-Type": "application/json"
            }
          });
        }
      } catch (error) {
        console.error("Failed to send notification:", error);
        // Don't show error to user as assignment was successful
      }

      Swal.fire({
        title: "Rider Assigned Successfully!",
        text: "The rider has been assigned to this order.",
        icon: "success",
        confirmButtonColor: "#198754",
        confirmButtonText: "OK"
      });

      // Close the change rider dropdown after successful assignment
      setShowChangeRiderDropdown(prev => ({ ...prev, [orderId]: false }));

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
    Swal.fire({
      title: 'Confirm Change Rider',
      text: 'Are you sure you want to change the rider for this order?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4b929d',
      cancelButtonColor: '#dc3545',
      confirmButtonText: 'Yes, Change Rider',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'swal-wide'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        setShowChangeRiderDropdown(prev => ({
          ...prev,
          [orderId]: !prev[orderId]
        }));
      }
    });
  };

  const handleSetDeliveryFees = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Delivery Fee Configuration',
      html: `
        <div class="fee-config-form">
          <div class="form-group">
            <label for="swal-base-fee">Standard Base Fee (₱)</label>
            <input id="swal-base-fee" class="swal2-input" type="number" step="0.01" value="${deliveryFees.baseFee}">
            <small class="form-text text-muted">The minimum fee for the first X km.</small>
          </div>
          <div class="form-group">
            <label for="swal-base-distance">Base Distance Coverage (km)</label>
            <input id="swal-base-distance" class="swal2-input" type="number" step="0.1" value="${deliveryFees.baseDistance}">
            <small class="form-text text-muted">Distance covered by the base fee.</small>
          </div>
          <div class="form-group">
            <label for="swal-surcharge">Surcharge per Extra KM (₱)</label>
            <input id="swal-surcharge" class="swal2-input" type="number" step="0.01" value="${deliveryFees.surchargePerKm}">
            <small class="form-text text-muted">Added for every km beyond the base distance.</small>
          </div>
          <div class="form-group">
            <label for="swal-max-radius">Maximum Delivery Radius (km)</label>
            <input id="swal-max-radius" class="swal2-input" type="number" step="0.5" value="${deliveryFees.maxRadius}">
            <small class="form-text text-muted">Orders beyond this distance will be rejected or flagged.</small>
          </div>
          <div class="form-group form-check-group">
            <div class="swal2-checkbox" style="display: flex; align-items: center; justify-content: center; margin-top: 1rem;">
              <input type="checkbox" id="swal-surge-pricing" ${deliveryFees.surgePricing ? 'checked' : ''}>
              <label for="swal-surge-pricing" style="margin-left: 0.5rem;">Enable Surge Pricing</label>
            </div>
            <div id="surge-fee-container" style="display: ${deliveryFees.surgePricing ? 'block' : 'none'}; margin-top: 10px;">
               <label for="swal-surge-fee">Surge Fee Amount (₱)</label>
               <input id="swal-surge-fee" class="swal2-input" type="number" step="0.01" value="${deliveryFees.surgeFlatFee}">
            </div>
            <small class="form-text text-muted">Enable for rainy days/rush hour.</small>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Save Settings',
      confirmButtonColor: '#4b929d',
      cancelButtonColor: '#6c757d',
      didOpen: () => {
        const checkbox = document.getElementById('swal-surge-pricing');
        const container = document.getElementById('surge-fee-container');
        checkbox.addEventListener('change', (e) => {
          container.style.display = e.target.checked ? 'block' : 'none';
        });
      },
      preConfirm: () => {
        const baseFee = document.getElementById('swal-base-fee').value;
        const baseDistance = document.getElementById('swal-base-distance').value;
        const surchargePerKm = document.getElementById('swal-surcharge').value;
        const maxRadius = document.getElementById('swal-max-radius').value;
        const surgePricing = document.getElementById('swal-surge-pricing').checked;
        const surgeFlatFee = document.getElementById('swal-surge-fee').value;

        if (!baseFee || !baseDistance || !surchargePerKm || !maxRadius) {
          Swal.showValidationMessage(`Please fill out all fields`);
          return false;
        }

        if (surgePricing && !surgeFlatFee) {
          Swal.showValidationMessage(`Please enter a surge fee amount`);
          return false;
        }

        return {
          baseFee: parseFloat(baseFee),
          baseDistance: parseFloat(baseDistance),
          surchargePerKm: parseFloat(surchargePerKm),
          maxRadius: parseFloat(maxRadius),
          surgePricing: surgePricing,
          surgeFlatFee: parseFloat(surgeFlatFee) || 0
        };
      },
      customClass: {
        popup: 'fee-config-swal'
      }
    });

    if (formValues) {
      try {
        const response = await fetch('http://localhost:7001/delivery/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            BaseFee: formValues.baseFee,
            BaseDistanceKm: formValues.baseDistance,
            ExtraFeePerKm: formValues.surchargePerKm,
            MaxRadiusKm: formValues.maxRadius,
            IsSurgePricingActive: formValues.surgePricing,
            SurgeFlatFee: formValues.surgeFlatFee
          })
        });
        if (!response.ok) throw new Error('Failed to save settings');
        // Update local state
        setDeliveryFees(formValues);
        Swal.fire({
          title: 'Success!',
          text: 'Delivery fee settings have been updated.',
          icon: 'success',
          confirmButtonColor: '#4b929d'
        });
      } catch (err) {
        console.error('Error saving settings:', err);
        Swal.fire({
          title: 'Error',
          text: 'Failed to save delivery settings. Please try again.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    }
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
        <button onClick={() => fetchInitialData(true, true)} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
        <FaSpinner className="fa-spin" size={50} color="#4b929d" />
        <p style={{ marginLeft: "15px", fontSize: "1.2rem" }}>Loading delivery data...</p>
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
                      onClick={() => { 
                        fetchInitialData(true, true); // Force refresh with loading indicator
                      }}
                      style={{ cursor: "pointer", padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px", color: "#4b929d" }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f0f0f0"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <FaUndo /> Refresh
                    </li>
                    <li
                      onClick={() => { localStorage.removeItem("access_token"); localStorage.removeItem("authToken"); localStorage.removeItem("expires_at"); localStorage.removeItem("userData"); window.location.replace("http://localhost:4002/"); }}
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
            </Form.Select> {/* Closing tag for Form.Select */}
            <button
              onClick={handleSetDeliveryFees}
              className="fee-settings-btn"
              style={{
                backgroundColor: '#4b929d',
                color: 'white',
                border: 'none',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontWeight: '600',
                marginLeft: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
              <FaCog />
              Set Delivery Fees
            </button>
          <button
            onClick={showPreparationTimeModal}
            className="prep-time-btn"
            style={{
              backgroundColor: '#4b929d',
              color: 'white',
              border: 'none',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontWeight: '600',
              marginLeft: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
            <FaClock />
            Set Prep Time
          </button>
          </div>
        </div>
        {/* IMPROVED: Compact Order Cards with Modal Details */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "20px",
          marginTop: "20px",
          justifyContent: "flex-start",
          alignItems: "flex-start",
          width: "100%"
        }}>
          {currentOrders.map((order, idx) => (
            <Card 
              key={idx} 
              onClick={() => {
                setSelectedOrder(order);
                setShowOrderModal(true);
              }}
              style={{ 
                padding: "16px", 
                textAlign: "left", 
                display: "flex", 
                flexDirection: "column", 
                gap: "10px",
                cursor: "pointer",
                transition: "all 0.3s ease",
                border: "1px solid #ddd",
                borderRadius: "8px"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.15)";
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
              className="order-card-compact"
            >
              {/* Order Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h6 style={{ color: "#2c3e50", fontWeight: "700", margin: "0" }}>Order #{order.id}</h6>
                  {order.deliveryImage && (
                    <FaImage color="#28a745" size={16} title="Proof of delivery available" />
                  )}
                </div>
                <span style={{
                  fontWeight: "600",
                  fontSize: "0.75rem",
                  color: getStatusStyle(order.currentStatus).color,
                  backgroundColor: getStatusStyle(order.currentStatus).backgroundColor,
                  padding: "3px 6px",
                  borderRadius: "4px",
                  whiteSpace: "nowrap"
                }}>
                  {{
                    pending: "Pending",
                    confirmed: "Confirmed",
                    preparing: "Preparing",
                    waitingforpickup: "Waiting",
                    readytopickup: "Ready",
                    pickedup: "Picked Up",
                    intransit: "Delivering", 
                    delivering: "Delivering",
                    delivered: "Delivered",
                    completed: "Completed",
                    cancelled: "Cancelled",
                    returned: "Returned"
                  }[order.currentStatus ? order.currentStatus.toLowerCase() : ""] || order.currentStatus}
                </span>
              </div>

              {/* Customer Info */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#555", fontSize: "0.9rem" }}>
                <FaUser color="#4b929d" size={14} />
                <span>{(() => { const parts = order.customerName.split(' '); return parts.length > 0 && /\d/.test(parts[0]) ? parts.slice(1).join(' ') : order.customerName; })()}</span>
              </div>

              {/* Phone & Address */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#555", fontSize: "0.9rem" }}>
                <FaPhone color="#4b929d" size={14} />
                <span>{order.phone?.replace(/^\+1-/, "63") || "N/A"}</span>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", color: "#555", fontSize: "0.9rem" }}>
                <FaMapMarkerAlt color="#4b929d" size={14} style={{ marginTop: "2px", flexShrink: 0 }} />
                <span style={{ wordBreak: "break-word" }}>{order.address?.substring(0, 40)}...</span>
              </div>

              {/* Items Count */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#555", fontSize: "0.9rem" }}>
                <FaBox color="#4b929d" size={14} />
                <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Rider Assignment Status */}
              {order.assignedRider ? (
                (() => {
                  const assignedRider = riders.find(r => r.UserID.toString() === order.assignedRider);
                  return assignedRider ? (
                    <div style={{ 
                      backgroundColor: "#d1f5d1", 
                      padding: "8px", 
                      borderRadius: "6px", 
                      fontSize: "0.85rem",
                      borderLeft: "3px solid #28a745",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <img src={riderImage} alt={assignedRider.FullName} style={{ width: "40px", height: "40px", borderRadius: "50%", border: "2px solid #155724" }} />
                      <div style={{ fontWeight: "600", color: "#155724", flex: 1 }}>{assignedRider.FullName}</div>
                    </div>
                  ) : null;
                })()
              ) : (
                <div style={{ 
                  backgroundColor: "#fff3cd", 
                  padding: "8px", 
                  borderRadius: "6px", 
                  fontSize: "0.85rem",
                  color: "#856404",
                  borderLeft: "3px solid #ffc107",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <FaExclamationTriangle color="#856404" size={14} />
                  <strong>Unassigned</strong>
                </div>
              )}

              {/* Price Summary */}
              <div style={{ 
                paddingTop: "8px", 
                borderTop: "1px solid #eee",
                fontWeight: "600",
                display: "flex",
                justifyContent: "center",
                gap: "10px"
              }}>
                <span>Total:</span>
                <span style={{ color: "#4b929d", fontSize: "1.1rem" }}>₱{order.total.toFixed(2)}</span>
              </div>

              {/* Click to View Details */}
              <div style={{ 
                textAlign: "center", 
                fontSize: "0.8rem", 
                color: "#4b929d",
                marginTop: "4px",
                fontWeight: "500",
                fontStyle: "italic"
              }}>
                Click to view details & assign rider
              </div>
            </Card>
          ))}
        </div>

        {/* ORDER DETAILS MODAL */}
        <Modal 
          show={showOrderModal} 
          onHide={() => setShowOrderModal(false)}
          size="lg"
          scrollable
          centered
          className="order-details-modal"
        >
          <Modal.Header closeButton style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #4b929d" }}>
            <Modal.Title style={{ fontWeight: "700", color: "#2c3e50" }}>
              Order #{selectedOrder?.id}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: "24px" }}>
            {selectedOrder && (
              <div className="order-modal-content">
                {/* Status */}
                <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ fontSize: "0.85rem", color: "#666", fontWeight: "500" }}>STATUS</div>
                  <span style={{
                    fontWeight: "600",
                    fontSize: "0.95rem",
                    color: getStatusStyle(selectedOrder.currentStatus).color,
                    backgroundColor: getStatusStyle(selectedOrder.currentStatus).backgroundColor,
                    padding: "6px 12px",
                    borderRadius: "4px",
                    display: "inline-block"
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
                    }[selectedOrder.currentStatus ? selectedOrder.currentStatus.toLowerCase() : ""] || selectedOrder.currentStatus}
                  </span>
                </div>

                {/* Customer Information */}
                <div style={{ 
                  padding: "16px", 
                  backgroundColor: "#f0f8fa", 
                  borderRadius: "8px", 
                  marginBottom: "20px",
                  border: "1px solid #d4e8ed"
                }}>
                  <h6 style={{ color: "#2c3e50", marginBottom: "12px", fontWeight: "600" }}>CUSTOMER INFORMATION</h6>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                    <FaUser color="#4b929d" size={16} />
                    <span style={{ color: "#333" }}>{(() => { const parts = selectedOrder.customerName.split(' '); return parts.length > 0 && /\d/.test(parts[0]) ? parts.slice(1).join(' ') : selectedOrder.customerName; })()}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                    <FaPhone color="#4b929d" size={16} />
                    <span style={{ color: "#333" }}>{selectedOrder.phone?.replace(/^\+1-/, "63") || "N/A"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <FaMapMarkerAlt color="#4b929d" size={16} style={{ marginTop: "2px", flexShrink: 0 }} />
                    <span style={{ color: "#333" }}>{selectedOrder.address}</span>
                  </div>
                </div>

                {/* Delivery Image Section */}
                {selectedOrder.deliveryImage && (
                  <div style={{ 
                    padding: "16px", 
                    backgroundColor: "#e7f3ff", 
                    borderRadius: "8px", 
                    marginBottom: "20px",
                    border: "1px solid #b3d9ff"
                  }}>
                    <h6 style={{ color: "#2c3e50", marginBottom: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
                      <FaImage color="#4b929d" size={16} />
                      PROOF OF DELIVERY
                    </h6>
                    <div style={{ textAlign: "center" }}>
                      <img 
                        src={`http://localhost:7004${selectedOrder.deliveryImage}`} 
                        alt="Proof of Delivery" 
                        style={{ 
                          maxWidth: "100%", 
                          maxHeight: "300px", 
                          borderRadius: "8px", 
                          cursor: "pointer",
                          border: "2px solid #4b929d"
                        }}
                        onClick={() => window.open(`http://localhost:7004${selectedOrder.deliveryImage}`, '_blank')}
                      />
                      <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "8px" }}>
                        Click image to view full size
                      </p>
                    </div>
                  </div>
                )}

                {/* Order Time */}
                <div style={{ marginBottom: "20px", padding: "12px", backgroundColor: "#f9f9f9", borderRadius: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#555" }}>
                    <FaClock color="#4b929d" size={16} />
                    <span>Ordered at: <strong>{selectedOrder.orderedAt}</strong></span>
                  </div>
                </div>

                {/* Items Section */}
                <div style={{ marginBottom: "20px" }}>
                  <h6 style={{ color: "#2c3e50", marginBottom: "12px", fontWeight: "600" }}>ITEMS ({selectedOrder.items.length})</h6>
                  <div style={{ 
                    padding: "12px", 
                    backgroundColor: "#fafafa", 
                    borderRadius: "6px",
                    maxHeight: "300px",
                    overflowY: "auto"
                  }}>
                    {selectedOrder.items.map((item, i) => {
                      const promoName = item.promo_name || item.applied_promo || "";
                      const promoDiscount = item.discount || 0;
                      const hasPromo = promoName || promoDiscount > 0;

                      return (
                        <div key={i} style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: i < selectedOrder.items.length - 1 ? "1px solid #ddd" : "none" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ fontWeight: "500" }}>
                              {item.quantity}x {item.name}
                            </span>
                            <span style={{ fontWeight: "600", color: "#2c3e50" }}>₱{item.price.toFixed(2)}</span>
                          </div>
                          {item.addons && item.addons.length > 0 && (
                            <ul style={{ margin: "6px 0", paddingLeft: "20px", fontSize: "0.9em", color: "#666" }}>
                              {item.addons.map((addon, j) => (
                                <li key={j}>+ {addon.addon_name} (₱{addon.price.toFixed(2)})</li>
                              ))}
                            </ul>
                          )}
                          {hasPromo && (
                            <div style={{ paddingLeft: "10px", fontSize: "0.9em", color: "#28a745", fontWeight: "500", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                              <FaGift size={14} /> {promoName} - ₱{promoDiscount.toFixed(2)} OFF
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Price Summary */}
                <div style={{ 
                  padding: "12px", 
                  backgroundColor: "#f0f8fa", 
                  borderRadius: "6px", 
                  marginBottom: "20px",
                  border: "1px solid #d4e8ed"
                }}>
                  {selectedOrder.deliveryFee && selectedOrder.deliveryFee > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", color: "#555" }}>
                      <span>Delivery Fee:</span>
                      <span>₱{selectedOrder.deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    paddingTop: "8px",
                    borderTop: "1px solid #ddd",
                    fontWeight: "700",
                    fontSize: "1.1rem",
                    color: "#2c3e50"
                  }}>
                    <span>Total:</span>
                    <span style={{ color: "#4b929d" }}>₱{selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Rider Assignment Section */}
                <div style={{ 
                  padding: "16px", 
                  backgroundColor: selectedOrder.assignedRider ? "#d1f5d1" : "#fff3cd", 
                  borderRadius: "8px",
                  borderLeft: `3px solid ${selectedOrder.assignedRider ? "#28a745" : "#ffc107"}`
                }}>
                  <h6 style={{ color: "#2c3e50", marginBottom: "12px", fontWeight: "600" }}>RIDER ASSIGNMENT</h6>
                  
                  {selectedOrder.assignedRider ? (
                    (() => {
                      const assignedRider = riders.find(r => r.UserID.toString() === selectedOrder.assignedRider);
                      return assignedRider ? (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                            <img src={riderImage} alt={assignedRider.FullName} style={{ width: "60px", height: "60px", borderRadius: "50%", border: "2px solid #4b929d" }} />
                            <div>
                              <div style={{ fontWeight: "600", fontSize: "1rem", color: "#155724" }}>{assignedRider.FullName}</div>
                              <div style={{ color: "#333", fontSize: "0.9rem" }}>{assignedRider.Phone}</div>
                              {assignedRider.PlateNumber && (
                                <div style={{ color: "#4b929d", fontSize: "0.85rem", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                                  <FaCar size={14} /> Plate: {assignedRider.PlateNumber}
                                </div>
                              )}
                            </div>
                          </div>
                          {(() => {
                            const restrictedStatuses = ["pickedup", "delivered", "cancelled", "returned"];
                            const canChangeRider = !restrictedStatuses.includes(selectedOrder.currentStatus?.toLowerCase());
                            return canChangeRider ? (
                              <button
                                onClick={() => handleChangeRiderClick(selectedOrder.id)}
                                style={{
                                  backgroundColor: "#4b929d",
                                  color: "white",
                                  border: "none",
                                  padding: "8px 16px",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontWeight: "600",
                                  width: "100%",
                                  transition: "all 0.3s ease"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#3a7a84"}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#4b929d"}
                              >
                                Change Rider
                              </button>
                            ) : null;
                          })()}
                          {showChangeRiderDropdown[selectedOrder.id] && (
                            <div style={{ marginTop: "12px" }}>
                              <Form.Select
                                value={selectedOrder.assignedRider || ""}
                                onChange={(e) => handleRiderSelection(selectedOrder.id, e.target.value)}
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
                        </div>
                      ) : null;
                    })()
                  ) : (
                    <div>
                      {(() => {
                        const restrictedStatuses = ["pickedup", "delivered", "cancelled", "returned"];
                        const canChangeRider = !restrictedStatuses.includes(selectedOrder.currentStatus?.toLowerCase());
                        return canChangeRider ? (
                          <>
                            <label style={{ fontWeight: "600", marginBottom: "8px", display: "block", color: "#333" }}>Select a Rider</label>
                            <Form.Select
                              value={selectedOrder.assignedRider || ""}
                              onChange={(e) => handleRiderSelection(selectedOrder.id, e.target.value)}
                            >
                              <option value="">Choose Rider...</option>
                              {riders.map((rider) => (
                                <option key={rider.UserID} value={rider.UserID.toString()}>
                                  {rider.FullName} - {rider.Phone}
                                </option>
                              ))}
                            </Form.Select>
                          </>
                        ) : (
                          <div style={{ color: "#856404", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px" }}>
                            <FaExclamationTriangle size={16} /> This order cannot have a rider assigned due to its current status.
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Modal.Body>
        </Modal>
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
