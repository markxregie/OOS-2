import React, { useState, useEffect } from 'react';
import { FaChevronDown, FaBell, FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import { Form } from 'react-bootstrap';
import { FaSignOutAlt, FaUndo } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";
import './report.css';

import coffeeImage from "../../assets/coffee.jpg";
  
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faMoneyBillWave,
  faChartLine,
  faShoppingCart,
  faClock,
  faArrowTrendUp,
  faArrowTrendDown,
  faCog,
  faClipboardCheck,
  faDollarSign,
  faClipboardList,
  faChartPie,
  faCheckCircle,
  faSearch,
  faDownload
} from '@fortawesome/free-solid-svg-icons';

const data = [
  {
    title: "Total Revenue",
    current: 0,
    previous: 450000,
    format: "currency",
    icon: faDollarSign,
    type: "revenue"
  },
  {
    title: "Total Orders",
    current: 0,
    previous: 1100,
    format: "number",
    icon: faClipboardList,
    type: "orders"
  },
  {
    title: "Avg Order Value",
    current: 0,
    previous: 400,
    format: "currency",
    icon: faChartPie,
    type: "avgOrderValue"
  },
  {
    title: "Completion Rate",
    current: 0,
    previous: 92,
    format: "number",
    icon: faCheckCircle,
    type: "completionRate"
  }
];

const sampleTableData = [
  {
    date: "2023-10-01",
    orderId: "ORD001",
    customerName: "John Doe",
    orderStatus: "Completed",
    paymentMethod: "Credit Card",
    timeOrdered: "10:00 AM",
    totalAmount: 1500,
    itemsOrdered: 3,
    orderType: "Delivery",
    handledBy: "Admin"
  },
  {
    date: "2023-10-02",
    orderId: "ORD002",
    customerName: "Jane Smith",
    orderStatus: "Pending",
    paymentMethod: "Cash",
    timeOrdered: "11:30 AM",
    totalAmount: 1200,
    itemsOrdered: 2,
    orderType: "Pickup",
    handledBy: "Admin"
  }
];

const formatValue = (value, format) => {
  return format === "currency"
    ? `₱${value.toLocaleString()}`
    : value.toLocaleString();
};

const Report = () => {
  const [searchParams] = useSearchParams();
  const [authToken, setAuthToken] = useState(null);
  const [userName, setUserName] = useState("Loading...");
  const [orders, setOrders] = useState([]);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dashboardData, setDashboardData] = useState(data);
  const [exportOption, setExportOption] = useState('csv');

  useEffect(() => {
    const tokenFromUrl = searchParams.get('authorization');
    const usernameFromUrl = searchParams.get('username');

    if (tokenFromUrl) {
      setAuthToken(tokenFromUrl);
      localStorage.setItem("authToken", tokenFromUrl);
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
      localStorage.setItem("userName", usernameFromUrl);
    } else {
      const storedUsername = localStorage.getItem("userName");
      if (storedUsername) {
        setUserName(storedUsername);
      }
    }
  }, [searchParams]);

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
          items: order.items || []
        }));

        setOrders(transformedOrders);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
        setOrders([]);
      }
    };

    fetchOrders();
  }, [authToken]);

  useEffect(() => {
    if (orders.length === 0) return;

    const totalRevenue = orders.filter(order => order.status.toLowerCase() === 'completed').reduce((sum, order) => sum + order.total, 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const completedOrders = orders.filter(order => order.status.toLowerCase() === 'completed').length;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    const updatedData = [
      {
        title: "Total Revenue",
        current: totalRevenue,
        previous: 450000,
        format: "currency",
        icon: faDollarSign,
        type: "revenue"
      },
      {
        title: "Total Orders",
        current: totalOrders,
        previous: 1100,
        format: "number",
        icon: faClipboardList,
        type: "orders"
      },
      {
        title: "Avg Order Value",
        current: avgOrderValue,
        previous: 400,
        format: "currency",
        icon: faChartPie,
        type: "avgOrderValue"
      },
      {
        title: "Completion Rate",
        current: completionRate,
        previous: 92,
        format: "number",
        icon: faCheckCircle,
        type: "completionRate"
      }
    ];

    setDashboardData(updatedData);
  }, [orders]);

  const toggleDropdown = () => {
    setDropdownOpen(!isDropdownOpen);
  };

  // Filter data based on search term and status
  const filteredData = orders.filter(order =>
    (order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.id.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.orderType.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (statusFilter === "" || order.status === statusFilter)
  );

  // Pagination calculations
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

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
    <div className="dashboard">
      <main className="dashboard-main">
        <header className="header">
          <div className="header-left">
            <h2 className="page-title">Reports</h2>
          </div>

          <div className="header-right">
            <div className="header-date">{new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })}</div>
            <div className="header-profile">
              <div className="profile-pic" />
              <div className="profile-info">
                <div className="profile-role">Hi! I'm Admin</div>
                <div className="profile-name">Lim Alcovendas</div>
              </div>
              <div className="dropdown-icon" onClick={toggleDropdown}>
                <FaChevronDown />
              </div>
              <div className="bell-icon">
                <FaBell className="bell-outline" />
              </div>
              {isDropdownOpen && (
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

        <div className="dashboard-contents">
          <div className="dashboard-cards" style={{ display: 'flex', gap: '20px', flexWrap: 'nowrap' }}>
            {dashboardData.map((card, index) => {
              const { current, previous } = card;
              const diff = current - previous;
              const percent = previous !== 0 ? (diff / previous) * 100 : 0;
              const isImproved = current > previous;
              const hasChange = current !== previous;

              return (
                <div key={index} className={`card ${card.type}`} style={{ flex: 1 }}>
                  <div className="card-text">
                    <div className="card-title">{card.title}</div>
                    <div className="card-details">
                      <div className="card-value">{formatValue(current, card.format)}</div>
                      {hasChange && (
                        <div className={`card-percent ${isImproved ? 'green' : 'red'}`}>
                          <FontAwesomeIcon icon={isImproved ? faArrowTrendUp : faArrowTrendDown} />
                          &nbsp;&nbsp;&nbsp;{Math.abs(percent).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="card-icon">
                    <FontAwesomeIcon icon={card.icon} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="table-container" style={{ marginTop: '30px' }}>
            <div className="table-header d-flex justify-content-between align-items-center">
              <h5 style={{ color: "#4a9ba5", margin: 0 }}>Reports</h5>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div className="filter-date-range" style={{ display: 'flex', alignItems: 'center' }}>
                  <label htmlFor="startDate" style={{ marginRight: '8px', fontWeight: 'bold' }}>From:</label>
                  <Form.Control type="date" id="startDate" name="startDate" style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', cursor: 'pointer', marginRight: '10px', width: '150px' }} />
                  <label htmlFor="endDate" style={{ marginRight: '8px', fontWeight: 'bold' }}>To:</label>
                  <Form.Control type="date" id="endDate" name="endDate" style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', cursor: 'pointer', width: '150px' }} />
                </div>
                <div className="filter-dropdown" style={{ display: 'flex', alignItems: 'center' }}>
                  <label htmlFor="filterStatus" style={{ marginRight: '8px', fontWeight: 'bold' }}>Filter by:</label>
                  <Form.Select id="filterStatus" name="filterStatus" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', cursor: 'pointer', width: '150px' }}>
                    <option value="">All Status</option>
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Cancelled">Cancelled</option>
                  </Form.Select>
                </div>
                <div className="export-dropdown" style={{ display: 'flex', alignItems: 'center' }}>
                  <Form.Select id="exportOptions" name="exportOptions" style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', cursor: 'pointer', width: '150px' }} value={exportOption} onChange={e => setExportOption(e.target.value)}>
                    <option value="csv">Export CSV</option>
                    <option value="pdf">Export PDF</option>
                  </Form.Select>
                  <FontAwesomeIcon
                    icon={faDownload}
                    style={{
                      marginLeft: '8px',
                      color: '#4a9ba5',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                    onClick={() => {
                      if (exportOption === 'csv') {
                        // Prepare CSV content from orders table data
                        const headers = ['Date', 'Order ID', 'Customer Name', 'Order Status', 'Payment Method', 'Time Ordered', 'Total Amount (₱)', 'Items Ordered', 'Order Type', 'Handled By'];
                        const rows = filteredData.map(order => {
                          const dateTime = new Date(order.date);
                          const date = dateTime.toLocaleDateString('en-US');
                          const time = dateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

                          return [
                            date,
                            order.id,
                            order.customer,
                            order.status,
                            order.paymentMethod,
                            time,
                            order.total.toFixed(2),
                            order.items.length,
                            order.orderType,
                            'Admin'
                          ];
                        });
                        const csvContent = [headers, ...rows]
                          .map(e => e.join(","))
                          .join("\n");
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', 'orders_report.csv');
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      } else if (exportOption === 'pdf') {
                        import('jspdf').then(jsPDFModule => {
                          import('jspdf-autotable').then(autoTableModule => {
                            const jsPDF = jsPDFModule.default;
                            const autoTable = autoTableModule.default;
                            const doc = new jsPDF();

                            const headers = [['Date', 'Order ID', 'Customer Name', 'Order Status', 'Payment Method', 'Time Ordered', 'Total Amount (₱)', 'Items Ordered', 'Order Type', 'Handled By']];
                            const rows = filteredData.map(order => {
                              const dateTime = new Date(order.date);
                              const date = dateTime.toLocaleDateString('en-US');
                              const time = dateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

                              return [
                                date,
                                order.id,
                                order.customer,
                                order.status,
                                order.paymentMethod,
                                time,
                                order.total.toFixed(2),
                                order.items.length,
                                order.orderType,
                                'Admin'
                              ];
                            });

                            autoTable(doc, {
                              head: headers,
                              body: rows,
                              startY: 10,
                              styles: { fontSize: 8 },
                              headStyles: { fillColor: [74, 155, 165] }
                            });

                            doc.save('orders_report.pdf');
                          });
                        });
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <table className="orders-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order ID</th>
                  <th>Customer Name</th>
                  <th>Order Status</th>
                  <th>Payment Method</th>
                  <th>Time Ordered</th>
                  <th >Total Amount (₱)</th>
                  <th>Items Ordered</th>
                  <th>Order Type</th>
                  <th>Handled By</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.map((order, index) => {
                  const dateTime = new Date(order.date);
                  const date = dateTime.toLocaleDateString('en-US');
                  const time = dateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

                  return (
                    <tr key={index}>
                      <td>{date}</td>
                      <td>{order.id}</td>
                      <td>{order.customer}</td>
                      <td>{order.status}</td>
                      <td>{order.paymentMethod}</td>
                      <td>{time}</td>
                      <td>₱{order.total.toFixed(2)}</td>
                      <td>{order.items.length}</td>
                      <td>{order.orderType}</td>
                      <td>Admin</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {filteredData.length > rowsPerPage && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div>
                  Showing {indexOfFirstRow + 1} to {Math.min(indexOfLastRow, filteredData.length)} of {filteredData.length} entries
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
        </div>
      </main>
    </div>
  );
};

export default Report;