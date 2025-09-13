import React, { useState, useEffect } from 'react';
import { FaChevronDown, FaBell, FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import { Form } from 'react-bootstrap';
import { FaSignOutAlt, FaUndo } from "react-icons/fa";
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
  faSearch
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
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;
  const [searchTerm, setSearchTerm] = useState("");

  const toggleDropdown = () => {
    setDropdownOpen(!isDropdownOpen);
  };

  // Filter data based on search term
  const filteredData = sampleTableData.filter(row => 
    row.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.orderStatus.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.orderType.toLowerCase().includes(searchTerm.toLowerCase())
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
            {data.map((card, index) => {
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
                  <Form.Select id="filterStatus" name="filterStatus" style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', cursor: 'pointer', width: '150px' }}>
                    <option value="">All Status</option>
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Cancelled">Cancelled</option>
                  </Form.Select>
                </div>
                <div className="export-dropdown" style={{ display: 'flex', alignItems: 'center' }}>
                  <Form.Select id="exportOptions" name="exportOptions" style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', cursor: 'pointer', width: '150px' }}>
                    <option value="csv">Export CSV</option>
                    <option value="pdf">Export PDF</option>
                  </Form.Select>
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
                {currentRows.map((row, index) => (
                  <tr key={index}>
                    <td>{row.date}</td>
                    <td>{row.orderId}</td>
                    <td>{row.customerName}</td>
                    <td>{row.orderStatus}</td>
                    <td>{row.paymentMethod}</td>
                    <td>{row.timeOrdered}</td>
                    <td>{row.totalAmount}</td>
                    <td>{row.itemsOrdered}</td>
                    <td>{row.orderType}</td>
                    <td>{row.handledBy}</td>
                  </tr>
                ))}
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