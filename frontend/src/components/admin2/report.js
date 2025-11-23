import React, { useState, useEffect, useMemo } from 'react';
import { FaChevronDown, FaBell, FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import { Form, Table } from 'react-bootstrap';
import { FaSignOutAlt, FaUndo } from "react-icons/fa";
// removed URL token ingestion
import './report.css';

import coffeeImage from "../../assets/coffee.jpg";
import adminImage from "../../assets/administrator.png";
 
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

// Library initialization for FontAwesome
library.add(faMoneyBillWave, faChartLine, faShoppingCart, faClock, faArrowTrendUp, faArrowTrendDown, faCog, faClipboardCheck, faDollarSign, faClipboardList, faChartPie, faCheckCircle, faSearch, faDownload);


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
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

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
          // Expected: Pickup -> profile names; Delivery -> delivery info names; else fallback to username/customer_name
          const displayCustomer = nameFromFields || order.customer_name;

          return {
            id: order.order_id,
            firstName,
            lastName,
            customer: displayCustomer,
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
            referenceNo: order.reference_number
          };
        });

        setOrders(transformedOrders);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
        setOrders([]);
      }
    };

    fetchOrders();
  }, [authToken]);

  const dateFilteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date
      return orderDate >= start && orderDate <= end;
    });
  }, [orders, startDate, endDate]);

  const dashboardDataMemo = useMemo(() => {
    if (dateFilteredOrders.length === 0) return data;

    const totalRevenue = dateFilteredOrders.filter(order => order.status.toLowerCase() === 'completed').reduce((sum, order) => sum + order.total, 0);
    const totalOrders = dateFilteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const completedOrders = dateFilteredOrders.filter(order => order.status.toLowerCase() === 'completed').length;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    return [
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
  }, [dateFilteredOrders]);

  useEffect(() => {
    setDashboardData(dashboardDataMemo);
  }, [dashboardDataMemo]);

  const toggleDropdown = () => {
    setDropdownOpen(!isDropdownOpen);
  };

  // Filter data based on search term and status, restricting to Delivered and Completed only
  const filteredData = dateFilteredOrders.filter(order => {
    const statusLower = order.status.toLowerCase();
    // Only keep orders with status Delivered or Completed
    if (!['delivered', 'completed'].includes(statusLower)) return false;

    const matchesSearch = (
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      statusLower.includes(searchTerm.toLowerCase()) ||
      order.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderType.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesStatusFilter = (statusFilter === "" || statusLower === statusFilter.toLowerCase());
    return matchesSearch && matchesStatusFilter;
  });

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

  const handleExport = (option) => {
    if (option === 'csv') {
      // --- BEAUTIFIED CSV EXPORT LOGIC ---
      let csvLines = [];

      // 1. Report Title and Date Range
      csvLines.push("Sales and Orders Report");
      csvLines.push(`Report Period:,${startDate} to ${endDate}`);
      csvLines.push(""); // Blank line for separation

      // 2. Summary Metrics Section
      csvLines.push("--- Summary Metrics ---");
      const summaryHeaders = ['Metric', 'Value'];
      csvLines.push(summaryHeaders.join(','));
      
      const summaryRows = dashboardData.map(card => [
        card.title,
        card.format === 'currency' ? `PHP ${card.current.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : (card.type === 'completionRate' ? `${card.current.toFixed(2)}%` : card.current.toLocaleString())
      ]);
      csvLines.push(...summaryRows.map(e => e.join(',')));
      csvLines.push(""); // Blank line for separation
      csvLines.push(""); // Another blank line for separation

      // 3. Detailed Order List Section
      csvLines.push("--- Detailed Order List ---");
      const detailHeaders = ['Date', 'Order ID', 'Customer Name', 'Order Status', 'Payment Method', 'Time Ordered', 'Total Amount (PHP)', 'Items Ordered', 'Reference No.', 'Order Type', 'Handled By'];
      csvLines.push(detailHeaders.join(','));
      
      const detailRows = filteredData.map(order => {
        const dateTime = new Date(order.date);
        // Using ISO date and 12-hour time for consistent formatting in CSV
        const date = dateTime.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const time = dateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        // Ensure string values are wrapped in quotes if they might contain commas
        const wrapQuotes = (value) => `"${String(value).replace(/"/g, '""')}"`;

        return [
          wrapQuotes(date),
          wrapQuotes(order.id),
          wrapQuotes(order.customer),
          wrapQuotes(order.status),
          wrapQuotes(order.paymentMethod),
          wrapQuotes(time),
          order.total.toFixed(2), // Numeric values don't need quotes
          order.items.length,
          wrapQuotes(order.referenceNo),
          wrapQuotes(order.orderType),
          wrapQuotes('Admin')
        ].join(',');
      });
      csvLines.push(...detailRows);

      const csvContent = csvLines.join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders_report_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (option === 'pdf') {
      import('jspdf').then(jsPDFModule => {
        import('jspdf-autotable').then(autoTableModule => {
          const jsPDF = jsPDFModule.default;
          const autoTable = autoTableModule.autoTable;
          const doc = new jsPDF('p', 'mm', 'a4'); // 'p' for portrait, 'mm' for units, 'a4' for size

          const primaryColor = [74, 155, 165]; // Your theme color (a shade of teal/blue)
          const primaryTextColor = [255, 255, 255]; // White
          const secondaryTextColor = [50, 50, 50]; // Dark grey

          let finalY = 0;

          // --- Header and Footer Functions ---
          const addHeaderFooter = (doc, totalPages) => {
            const pageCount = doc.internal.getNumberOfPages();
            for(let i = 1; i <= pageCount; i++) {
                doc.setPage(i);

                // Header
                doc.setFontSize(10);
                doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
                doc.text(`Report Period: ${startDate} to ${endDate}`, doc.internal.pageSize.getWidth() - 10, 10, { align: 'right' });

                doc.setFontSize(18);
                doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                doc.text('Sales and Orders Report', 14, 10);
                doc.line(14, 12, doc.internal.pageSize.getWidth() - 14, 12); // Separator line

                // Footer
                doc.setFontSize(8);
                doc.text(`Page ${i} of ${totalPages}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
            }
          };

          // --- Summary Metrics Table ---
          doc.setFontSize(14);
          doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
          doc.text('Summary Metrics', 14, 25);

          const summaryHeaders = [['Metric', 'Value']];
          const summaryBody = dashboardData.map(card => [
              card.title,
              card.format === 'currency' ? `PHP ${card.current.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` :
              (card.type === 'completionRate' ? `${card.current.toFixed(2)}%` : card.current.toLocaleString())
          ]);

          autoTable(doc, {
              startY: 30,
              head: summaryHeaders,
              body: summaryBody,
              theme: 'striped',
              styles: { fontSize: 10, cellPadding: 3 },
              headStyles: { fillColor: primaryColor, textColor: primaryTextColor, fontStyle: 'bold' },
              alternateRowStyles: { fillColor: [240, 240, 240] },
              columnStyles: {
                  0: { cellWidth: 50 }, // Metric column width
                  1: { fontStyle: 'bold' } // Value column bold
              },
              didParseCell: (data) => {
                  // Center-align the value column
                  if (data.column.index === 1 && data.section === 'body') {
                      data.cell.styles.halign = 'center';
                  }
              }
          });

          finalY = doc.lastAutoTable.finalY;

          // --- Orders Table ---
          doc.setFontSize(14);
          doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
          doc.text('Detailed Order List', 14, finalY + 15);

          const tableHeaders = [['Date', 'Order ID', 'Customer', 'Status', 'Payment', 'Time', 'Total (₱)', 'Items', 'Reference']];

          const tableRows = filteredData.map(order => {
              const dateTime = new Date(order.date);
              const date = dateTime.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
              const time = dateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

              return [
                  date,
                  order.id,
                  order.customer,
                  order.status,
                  order.paymentMethod,
                  time,
                  order.total.toFixed(2),
                  order.items.length,
                  order.referenceNo
              ];
          });

          autoTable(doc, {
              head: tableHeaders,
              body: tableRows,
              startY: finalY + 20,
              theme: 'striped',
              styles: {
                  fontSize: 8,
                  cellPadding: 2,
                  textColor: secondaryTextColor,
                  valign: 'middle'
              },
              headStyles: {
                  fillColor: primaryColor,
                  textColor: primaryTextColor,
                  fontStyle: 'bold',
                  halign: 'center'
              },
              alternateRowStyles: {
                  fillColor: [240, 240, 240] // Light gray for alternate rows
              },
              columnStyles: {
                  0: { halign: 'center' }, // Date
                  1: { halign: 'center' }, // Order ID
                  3: { halign: 'center', cellWidth: 15 }, // Status
                  5: { halign: 'center', cellWidth: 15 }, // Time
                  6: { halign: 'right', fontStyle: 'bold' }, // Total Amount
                  7: { halign: 'center', cellWidth: 15 }, // Items Ordered
              },
              didParseCell: (data) => {
                  // Custom styling for Status column
                  if (data.column.index === 3 && data.section === 'body') {
                      let color = [150, 150, 150]; // Default
                      if (data.cell.raw === 'Completed') color = [39, 174, 96]; // Green
                      else if (data.cell.raw === 'Pending') color = [241, 196, 15]; // Yellow
                      else if (data.cell.raw === 'Cancelled') color = [192, 57, 43]; // Red

                      data.cell.styles.fillColor = color;
                      data.cell.styles.textColor = [255, 255, 255];
                      data.cell.styles.fontStyle = 'bold';
                  }
              }
          });

          addHeaderFooter(doc, doc.internal.getNumberOfPages());

          doc.save(`orders_report_${startDate}_to_${endDate}.pdf`);
        });
      });
    }
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
              <img src={adminImage} alt="Admin" className="profile-pic" />
              <div className="profile-info">
                <div className="profile-role">Hi! I'm Admin</div>
                <div className="profile-name">Admin OOS</div>
              </div>
              <div className="dropdown-icon" onClick={toggleDropdown}>
                <FaChevronDown />
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
                  <Form.Control 
                    type="date" 
                    id="startDate" 
                    name="startDate" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', cursor: 'pointer', marginRight: '10px', width: '150px' }} 
                  />
                  <label htmlFor="endDate" style={{ marginRight: '8px', fontWeight: 'bold' }}>To:</label>
                  <Form.Control 
                    type="date" 
                    id="endDate" 
                    name="endDate" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', cursor: 'pointer', width: '150px' }} 
                  />
                </div>
                <div className="filter-dropdown" style={{ display: 'flex', alignItems: 'center' }}>
                  <label htmlFor="filterStatus" style={{ marginRight: '8px', fontWeight: 'bold' }}>Filter by:</label>
                  <Form.Select id="filterStatus" name="filterStatus" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', cursor: 'pointer', width: '150px' }}>
                    <option value="">All Status</option>
                    <option value="Completed">Completed</option>
                    <option value="Delivered">Delivered</option>
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
                    onClick={() => handleExport(exportOption)}
                  />
                </div>
              </div>
            </div>
            <Table responsive className="orders-table">
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
                  <th>Reference No.</th>
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
                      <td>{order.referenceNo}</td>
                      <td>{order.orderType}</td>
                      <td>Admin</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>

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