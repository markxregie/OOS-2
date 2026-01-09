import React, { useState, useEffect } from "react";
import { Container, Table, Form } from "react-bootstrap";
import { CartFill, BellFill, PersonFill, Search, EyeFill, PencilFill, TrashFill, PrinterFill } from "react-bootstrap-icons";
import { FaChevronDown, FaBell, FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight } from "react-icons/fa";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import "../admin2/manageorder.css";
import { FaSignOutAlt, FaUndo } from "react-icons/fa";
import adminImage from "../../assets/administrator.png";

// Initialize SweetAlert with React Content
const MySwal = withReactContent(Swal);

// Sample orders data for demonstration
const sampleOrders = [
  {
    id: 1001,
    customer: "John Doe",
    date: "2023-10-01 10:30:00",
    orderType: "Delivery",
    paymentMethod: "Cash on Delivery",
    total: 250.00,
    status: "Pending",
    emailAddress: "john.doe@example.com",
    phoneNumber: "+1234567890",
    deliveryAddress: "123 Main St, City, State",
    deliveryNotes: "Leave at door",
    adminNotes: "",
    statusHistory: [],
    items: [
      { quantity: 2, name: "Americano", price: 50.00 },
      { quantity: 1, name: "Croissant", price: 150.00 }
    ]
  },
  {
    id: 1002,
    customer: "Jane Smith",
    date: "2023-10-01 11:15:00",
    orderType: "Pickup",
    paymentMethod: "Credit Card",
    total: 180.00,
    status: "Processing",
    emailAddress: "jane.smith@example.com",
    phoneNumber: "+0987654321",
    deliveryAddress: "",
    deliveryNotes: "",
    adminNotes: "Customer requested extra napkins",
    statusHistory: [],
    items: [
      { quantity: 1, name: "Latte", price: 80.00 },
      { quantity: 1, name: "Muffin", price: 100.00 }
    ]
  },
  {
    id: 1003,
    customer: "Bob Johnson",
    date: "2023-10-01 12:00:00",
    orderType: "Delivery",
    paymentMethod: "GCash",
    total: 320.00,
    status: "Completed",
    emailAddress: "bob.johnson@example.com",
    phoneNumber: "+1122334455",
    deliveryAddress: "456 Oak Ave, City, State",
    deliveryNotes: "Ring doorbell twice",
    adminNotes: "",
    statusHistory: [],
    items: [
      { quantity: 3, name: "Espresso", price: 60.00 },
      { quantity: 1, name: "Sandwich", price: 200.00 }
    ]
  },
  {
    id: 1004,
    customer: "Alice Brown",
    date: "2023-10-01 13:45:00",
    orderType: "Pickup",
    paymentMethod: "Cash",
    total: 150.00,
    status: "Cancelled",
    emailAddress: "alice.brown@example.com",
    phoneNumber: "+5566778899",
    deliveryAddress: "",
    deliveryNotes: "",
    adminNotes: "Order cancelled by customer",
    statusHistory: [],
    items: [
      { quantity: 2, name: "Cappuccino", price: 75.00 }
    ]
  },
  {
    id: 1005,
    customer: "Charlie Wilson",
    date: "2023-10-01 14:20:00",
    orderType: "Delivery",
    paymentMethod: "PayMaya",
    total: 400.00,
    status: "Pending",
    emailAddress: "charlie.wilson@example.com",
    phoneNumber: "+6677889900",
    deliveryAddress: "789 Pine St, City, State",
    deliveryNotes: "Call upon arrival",
    adminNotes: "",
    statusHistory: [],
    items: [
      { quantity: 1, name: "Frappuccino", price: 120.00 },
      { quantity: 2, name: "Bagel", price: 140.00 }
    ]
  }
];

const ManageOrders = () => {
  const userRole = "Admin";
  const [authToken, setAuthToken] = useState(null);
  const [userName, setUserName] = useState("Loading...");

  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  // Orders state to be fetched from backend
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!authToken) return;

    const fetchOrders = async () => {
      try {
        const response = await fetch("http://localhost:7004/cart/admin/orders/manage", {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Backend raw data:", data);

        const transformedOrders = data.map(order => {
          const firstName = order.first_name || order.firstName || "";
          const lastName = order.last_name || order.lastName || "";
          const orderType = order.order_type;
          const nameFromFields = (firstName && lastName) ? `${firstName} ${lastName}` : "";
          // Display rules: Delivery prefers DeliveryInfo names; Pickup prefers profile names; fallback to username/customer_name
          const displayCustomer = nameFromFields || order.customer_name;

          return {
            id: order.order_id,
            customer: displayCustomer,
            firstName,
            lastName,
            date: order.order_date,
            orderType: orderType,
            paymentMethod: order.payment_method,
            total: order.total_amount,
            status: order.order_status,
            emailAddress: order.emailAddress,
            phoneNumber: order.phoneNumber,
            deliveryAddress: order.deliveryAddress,
            deliveryNotes: order.deliveryNotes,
            adminNotes: order.adminNotes || "",
            statusHistory: order.statusHistory || [],
            items: order.items || [],
            discount: order.discount || 0,
            deliveryFee: order.deliveryFee || 0
          };
        });

        // Filter orders to only include those from today
        const today = new Date();
        const recentOrders = transformedOrders.filter(order => {
          const orderDate = new Date(order.date);
          return orderDate.toDateString() === today.toDateString();
        });

        setOrders(recentOrders);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
        setOrders(sampleOrders);
      }
    };

    fetchOrders();
  }, [authToken]);


  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      (order.customer || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toString().includes(searchTerm) ||
      order.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || order.status.toLowerCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

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

  const getStatusBadge = (status) => {
    const lowerStatus = status.toLowerCase();
    switch(lowerStatus) {
      case 'pending':
        return <span className="status-badge status-pending">Pending</span>;
      case 'processing':
        return <span className="status-badge status-processing">Processing</span>;
      case 'completed':
        return <span className="status-badge status-completed">Completed</span>;
      case 'delivered':
        return <span className="status-badge status-delivered">Delivered</span>;
      case 'cancelled':
        return <span className="status-badge status-cancelled">Cancelled</span>;
      case 'preparing':
        return <span className="status-badge status-preparing">Preparing</span>;
      case 'delivering':
        return <span className="status-badge status-delivering">Delivering</span>;
      case 'waiting for pick up':
        return <span className="status-badge status-waiting-for-pickup">Waiting for Pickup</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const handleShowItems = (items) => {
    MySwal.fire({
      title: <h5 className="mb-3">Order Items</h5>,
      html: (
        <div className="modern-modal-content">
          <ul className="list-unstyled mb-0 text-start">
            {items.map((item, index) => (
              <li key={index} className="mb-2">
                <span className="fw-bold">{item.quantity} x</span> {item.name}
                {item.addons && item.addons.length > 0 && (
                  <ul className="list-unstyled ms-3 mt-1" style={{ fontSize: '0.9em', color: '#666' }}>
                    {item.addons.map((addon, addonIdx) => (
                      <li key={addonIdx}>
                        + {addon.addon_name || addon.name} (₱{addon.price ? addon.price.toFixed(2) : '0.00'})
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      ),
      icon: 'info',
      confirmButtonText: 'Close',
      customClass: {
        container: 'modern-swal-container',
        popup: 'modern-swal-popup',
        title: 'modern-swal-title',
        htmlContainer: 'modern-swal-html-container',
        confirmButton: 'modern-swal-confirm-button',
      },
      showClass: {
        popup: 'animate__animated animate__fadeIn'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOut'
      }
    });
  };

  const handleViewOrder = (order) => {
    MySwal.fire({
      title: <h5 className="mb-3">Order Details - ID: {order.id}</h5>,
      html: (
        <div className="modern-modal-content text-start">
          <div className="invoice-header mb-4 border-bottom pb-2">
            <h6>Order Invoice</h6>
            <div className="text-muted">
              <strong>Order ID:</strong> #{order.id} <br />
              <strong>Date/Time Ordered:</strong> {order.date}
            </div>
          </div>
          <div className="invoice-section mb-4">
            <h6>Customer Details</h6>
            <div className="text-muted">
              <strong>Name:</strong> {order.customer}<br />
              {order.emailAddress && (
                <>
                  <strong>Email:</strong> {order.emailAddress}<br />
                </>
              )}
              {order.phoneNumber && (
                <>
                  <strong>Phone:</strong> {order.phoneNumber}
                </>
              )}
            </div>
          </div>
          <div className="invoice-section mb-4">
            <h6>Items Ordered</h6>
            <Table bordered className="items-table">
              <thead>
                <tr>
                  <th>Qty</th>
                  <th>Product</th>
                  <th>Price (₱)</th>
                  <th>Subtotal (₱)</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => {
                  const promoName = item.promo_name || item.applied_promo || "";
                  const promoDiscount = item.discount || 0;
                  const hasPromo = promoName || promoDiscount > 0;

                  return (
                    <React.Fragment key={index}>
                      <tr>
                        <td>{item.quantity}</td>
                        <td>{item.name}</td>
                        <td>{item.price ? item.price.toFixed(2) : "-"}</td>
                        <td>{item.price ? (item.price * item.quantity).toFixed(2) : "-"}</td>
                      </tr>
                      {item.addons && item.addons.length > 0 && item.addons.map((addon, addonIdx) => (
                        <tr key={`${index}-addon-${addonIdx}`} style={{ backgroundColor: '#f8f9fa' }}>
                          <td></td>
                          <td style={{ paddingLeft: '2rem', fontSize: '0.9em', color: '#666' }}>
                            + {addon.addon_name || addon.name}
                          </td>
                          <td style={{ fontSize: '0.9em' }}>{addon.price ? addon.price.toFixed(2) : "-"}</td>
                          <td style={{ fontSize: '0.9em' }}>{addon.price ? (addon.price * item.quantity).toFixed(2) : "-"}</td>
                        </tr>
                      ))}
                      {hasPromo && (
                        <tr style={{ backgroundColor: '#f0f9ff' }}>
                          <td></td>
                          <td colSpan="3" style={{ paddingLeft: '1rem', fontSize: '0.9em', color: '#28a745', fontWeight: '500' }}>
                            🎉 {promoName} - ₱{promoDiscount.toFixed(2)} OFF
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </Table>
            <div className="text-end mt-3">
              <div className="d-flex justify-content-end mb-2">
                <span className="me-4">Subtotal:</span>
                <span>₱{order.items.reduce((sum, item) => {
                  const itemTotal = (item.price || 0) * (item.quantity || 0);
                  const addonsTotal = (item.addons || []).reduce((addonSum, addon) => 
                    addonSum + ((addon.price || 0) * (item.quantity || 0)), 0);
                  return sum + itemTotal + addonsTotal;
                }, 0).toFixed(2)}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="d-flex justify-content-end mb-2">
                  <span className="me-4">Delivery Fee:</span>
                  <span>₱{order.deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="d-flex justify-content-end fw-bold pt-2 border-top">
                <span className="me-4">Total Amount:</span>
                <span>₱{order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="invoice-section mb-4">
            <h6>Order & Payment Info</h6>
            <div className="text-muted">
              <strong>Order Type:</strong> {order.orderType}<br />
              <strong>Payment Method:</strong> {order.paymentMethod}<br />
              {order.orderType === 'Delivery' && (
                <>
                  <strong>Delivery Address:</strong> {order.deliveryAddress}<br />
                  <strong>Delivery Notes:</strong> {order.deliveryNotes || "N/A"}
                </>
              )}
            </div>
          </div>
          {order.adminNotes && (
            <div className="invoice-section">
              <h6>Admin Notes</h6>
              <p className="text-muted mb-0">{order.adminNotes}</p>
            </div>
          )}
        </div>
      ),
      confirmButtonText: 'Close',
      customClass: {
        container: 'modern-swal-container',
        popup: 'modern-swal-popup',
        title: 'modern-swal-title',
        htmlContainer: 'modern-swal-html-container',
        confirmButton: 'modern-swal-confirm-button',
      },
      showClass: {
        popup: 'animate__animated animate__fadeIn'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOut'
      }
    });
  };

  const handleUpdateStatus = (orderId) => {
    alert(`Update status for order ID: ${orderId}`);
  };

  const handleCancelOrder = (orderId) => {
    alert(`Cancel order ID: ${orderId}`);
  };

  const handlePrintReceipt = (orderId) => {
    alert(`Print receipt for order ID: ${orderId}`);
  };

  return (
    <div className="d-flex" style={{ height: "100vh", backgroundColor: "#edf7f9" }}>
      <Container fluid className="p-4 main-content" style={{ marginLeft: "0px", width: "calc(100% - 0px)" }}>
        <header className="manage-header">
          <div className="header-left">
            <h2 className="page-title">Orders</h2>
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
                      onClick={() => { try { require('../AuthContext'); } catch {} ; try { /* dynamic import context not ideal */ } catch {} ; localStorage.removeItem("access_token"); localStorage.removeItem("authToken"); localStorage.removeItem("expires_at"); localStorage.removeItem("userData"); window.location.replace("http://localhost:4002/"); }}
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

        {/* Orders Table */}
        <div className="table-container" style={{ paddingLeft: 0 }}>
          <div className="table-header d-flex justify-content-between align-items-center">
            <h5 style={{ color: "#4a9ba5", margin: 0, marginLeft: "10" }}>Recent Orders</h5>
            <div className="d-flex align-items-center gap-3">
              <div className="position-relative" style={{ width: "300px" }}>
                <Search
                  className="position-absolute"
                  style={{ top: "50%", left: "12px", color: "#495057", transform: "translateY(-50%)", fontSize: "1.2rem" }}
                />
                <Form.Control
                  type="text"
                  placeholder="Search orders..."
                  className="search-input ps-5"
                  value={searchTerm}
                  style={{
                    borderRadius: "20px",
                    border: "1px solid #ced4da",
                    paddingLeft: "2.5rem",
                    paddingRight: "1rem",
                    height: "38px",
                    boxShadow: "none",
                    transition: "border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out",
                  }}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset to first page when searching
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#80bdff"}
                  onBlur={(e) => e.target.style.borderColor = "#ced4da"}
                />
              </div>
              <Form.Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1); // Reset to first page when filtering
                }}
                style={{ width: "150px", borderRadius: "20px" }}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>

                <option value="waiting for pickup">Waiting for Pickup</option>
              </Form.Select>
            </div>
          </div>

          <Table className="orders-table" responsive>
            <thead>
              <tr>
                
                <th>Customer Name</th>
                <th>Order Time/Date</th>
                <th>Items</th>
                <th>Total Amount (₱)</th>
                <th>Payment Method</th>
                <th>Order Type</th>
                <th>Order Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentOrders.length > 0 ? (
                currentOrders.map((order) => (
                  <tr key={order.id}>
                   
                    <td>{order.customer}</td>
                    <td>{order.date}</td>
                    <td>
                      <button
                        className="link-button"
                        onClick={() => handleShowItems(order.items)}
                        style={{ color: "#007bff", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                      >
                        {order.items.length} item{order.items.length > 1 ? "s" : ""}
                      </button>
                    </td>
                    <td>₱{order.total.toFixed(2)}</td>
                    <td>{order.paymentMethod}</td>
                    <td>{order.orderType}</td>
                    <td>{getStatusBadge(order.status)}</td>
                    <td>
                      <button className="action-btn view" title="View" onClick={() => handleViewOrder(order)}>
                        <EyeFill />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="text-center">No orders found</td>
                </tr>
              )}
            </tbody>
          </Table>

          {/* Pagination Controls */}
          {filteredOrders.length > itemsPerPage && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div>
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredOrders.length)} of {filteredOrders.length} entries
              </div>
              <div className="d-flex align-items-center">
                <button
                  className="pagination-btn"
                  onClick={handleFirstPage}
                  disabled={currentPage === 1}
                >
                  <FaAngleDoubleLeft />
                </button>
                <button
                  className="pagination-btn"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                >
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

                <button
                  className="pagination-btn"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  <FaAngleRight />
                </button>
                <button
                  className="pagination-btn"
                  onClick={handleLastPage}
                  disabled={currentPage === totalPages}
                >
                  <FaAngleDoubleRight />
                </button>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};

export default ManageOrders;