import React, { useState, useEffect } from "react";
import { Container, Row, Col, Table, Form, Modal, Button } from "react-bootstrap";
import { CartFill, BellFill, PersonFill, Search, EyeFill, PencilFill, TrashFill, PrinterFill } from "react-bootstrap-icons";
import { FaChevronDown, FaBell, FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";
import "../admin2/manageorder.css";
import { FaSignOutAlt, FaUndo } from "react-icons/fa";

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
  const [searchParams] = useSearchParams();
  const [authToken, setAuthToken] = useState(null);
  const [userName, setUserName] = useState("Loading...");

  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const tokenFromUrl = searchParams.get('authorization');
    const usernameFromUrl = searchParams.get('username');

    if (tokenFromUrl) {
      setAuthToken(tokenFromUrl);
      localStorage.setItem("authToken", tokenFromUrl); // Save to localStorage
    } else {
      // If not in URL, try getting from localStorage
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

      const transformedOrders = data.map(order => ({
        id: order.order_id,
        customer: order.customer_name,
        date: order.order_date,
        orderType: order.order_type,
        paymentMethod: order.payment_method,
        total: order.total_amount,
        status: order.order_status,
        emailAddress: order.emailAddress,
        phoneNumber: order.phoneNumber,
        deliveryAddress: order.deliveryAddress,
        deliveryNotes: order.deliveryNotes,
        adminNotes: order.adminNotes || "",
        statusHistory: order.statusHistory || [],
        items: order.items || []  // ← DIRECTLY use the array
      }));

      setOrders(transformedOrders);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      setOrders(sampleOrders);
    }
  };

  fetchOrders();
}, [authToken]);


  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      case 'cancelled':
        return <span className="status-badge status-cancelled">Cancelled</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowOrderDetailsModal(true);
  };

  const handleCloseOrderDetails = () => {
    setShowOrderDetailsModal(false);
    setSelectedOrder(null);
  };

  const handleShowItems = (items) => {
    setSelectedItems(items);
    setShowItemsModal(true);
  };

  const handleCloseItems = () => {
    setShowItemsModal(false);
    setSelectedItems([]);
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
              <div className="profile-pic"></div>
              <div className="profile-info">
                <div className="profile-role">Hi! I'm {userRole}</div>
                <div className="profile-name">{userName}</div>
              </div>
              <div className="dropdown-icon" onClick={() => setDropdownOpen(!dropdownOpen)}><FaChevronDown /></div>
              <div className="bell-icon"><FaBell className="bell-outline" /></div>
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
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Form.Select>
            </div>
          </div>

          <Table className="orders-table" responsive>
            <thead>
              <tr>
                <th>Order ID</th>
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
                    <td>
                      <button
                        className="link-button"
                        onClick={() => handleViewOrder(order)}
                        style={{ color: "#007bff", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                      >
                        {order.id}
                      </button>
                    </td>
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

        {/* Items Modal */}
        <Modal show={showItemsModal} onHide={handleCloseItems}>
          <Modal.Header closeButton>
            <Modal.Title>Order Items</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ul>
              {selectedItems.map((item, index) => (
                <li key={index}>{item.quantity} x {item.name}</li>
              ))}
            </ul>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseItems}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Order Details Modal */}
        <Modal 
          show={showOrderDetailsModal} 
          onHide={handleCloseOrderDetails} 
          size="lg"
          dialogClassName="custom-modal-dialog"
          contentClassName="custom-modal-content"
        >
          <Modal.Header closeButton className="custom-modal-header">
            <Modal.Title className="custom-modal-title">Order Details - ID: {selectedOrder ? selectedOrder.id : ""}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="custom-modal-body invoice-modal-body">
            {selectedOrder && (
              <>
                <div className="invoice-header mb-3">
                  <h5>Order Invoice</h5>
                  <div><strong>Order ID:</strong> #{selectedOrder.id}</div>
                  <div><strong>Date/Time Ordered:</strong> {selectedOrder.date}</div>
                </div>

                <div className="invoice-section mb-3">
                  <h6>Customer Details</h6>
                  <div><strong>Name:</strong> {selectedOrder.customer}</div>
                </div>

                <div className="invoice-section mb-3">
                  <h6>Items Ordered</h6>
                  <Table bordered size="sm" responsive>
                    <thead>
                      <tr>
                        <th>Quantity</th>
                        <th>Product Name</th>
                        <th>Price (₱)</th>
                        <th>Subtotal (₱)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.quantity}</td>
                          <td>{item.name}</td>
                          <td>{item.price ? item.price.toFixed(2) : ""}</td>
                          <td>{item.price ? (item.price * item.quantity).toFixed(2) : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <div className="text-end fw-bold">Total Amount: ₱{selectedOrder.total.toFixed(2)}</div>
                </div>

                <div className="invoice-section mb-3">
                  <h6>Payment Info</h6>
                  <div><strong>Method:</strong> {selectedOrder.paymentMethod}</div>
                </div>

                <div className="invoice-section mb-3">
                </div>

                <div className="invoice-section mb-3">
                </div>

                <div className="invoice-section mb-3">
                </div>
              </>
            )}
          </Modal.Body>
          <Modal.Footer className="custom-modal-footer">
            <Button variant="secondary" onClick={handleCloseOrderDetails}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default ManageOrders;