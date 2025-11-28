import React, { useState, useEffect, useMemo } from 'react';
import { FaChevronDown, FaBell, FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import { Form, Table, Modal, Button, Spinner, Badge } from 'react-bootstrap';
import { FaSignOutAlt, FaUndo } from "react-icons/fa";
import Swal from 'sweetalert2';
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
  faCube,
  faLink,
  faLock,
  faClipboard
} from '@fortawesome/free-solid-svg-icons';

// Library initialization for FontAwesome
library.add(faMoneyBillWave, faChartLine, faShoppingCart, faClock, faArrowTrendUp, faArrowTrendDown, faCog, faClipboardCheck, faDollarSign, faClipboardList, faChartPie, faCheckCircle, faSearch, faCube, faLink, faLock, faClipboard);


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
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // --- BLOCKCHAIN & MODAL STATES ---
  const [showReportModal, setShowReportModal] = useState(false);
  const [modalData, setModalData] = useState(null); // Stores the snapshot of data for the modal
  const [isHashing, setIsHashing] = useState(false); // Loading state for blockchain
  const [reportHash, setReportHash] = useState(null); // The generated hash

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

        const transformedOrders = data.map(order => ({
          id: order.order_id,
          // Prefer explicit first/last name fields; fallback to customer_name/username
          firstName: order.first_name || order.firstName || "",
           lastName: order.last_name || order.lastName || "",
          customer: (order.first_name && order.last_name)
            ? `${order.first_name} ${order.last_name}`
            : (order.firstName && order.lastName)
              ? `${order.firstName} ${order.lastName}`
              : order.customer_name,
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
          items: order.items || [],
          referenceNo: order.reference_number
        }));

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

  // --- REPLACED SWAL WITH REACT MODAL LOGIC ---
  const handleGenerateReport = () => {
    // Calculate metrics for the specific report instance
    const totalRevenue = dateFilteredOrders.filter(order => order.status.toLowerCase() === 'completed').reduce((sum, order) => sum + order.total, 0);
    const totalOrders = dateFilteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const completedOrders = dateFilteredOrders.filter(order => order.status.toLowerCase() === 'completed').length;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    // Set the data snapshot for the modal
    setModalData({
        startDate,
        endDate,
        totalRevenue,
        totalOrders,
        avgOrderValue,
        completionRate,
        orders: filteredData // Pass the filtered orders to the modal
    });

    setReportHash(null); // Reset hash
    setShowReportModal(true); // Open Modal
  };

  // --- BLOCKCHAIN SIMULATION FUNCTION ---
  const secureReportOnBlockchain = () => {
      setIsHashing(true);
      
      // Simulate API call to Blockchain Node
      setTimeout(() => {
          // Generate a fake hash (In real app, this comes from the Smart Contract)
          const fakeHash = "0x" + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
          setReportHash(fakeHash);
          setIsHashing(false);
          
          Swal.fire({
            icon: 'success',
            title: 'Report Secured',
            text: 'This report has been permanently recorded on the blockchain.',
            confirmButtonColor: '#4a9ba5'
          });
      }, 3000); // 3 second simulated delay
  };

  const handleExport = (option) => {
    if (option === 'csv') {
      // --- BEAUTIFIED CSV EXPORT LOGIC ---
      let csvLines = [];

      // 1. Report Title and Date Range
      csvLines.push("Sales and Orders Report");
      csvLines.push(`Report Period:,${startDate} to ${endDate}`);
      // --- ADDED HASH TO CSV ---
      csvLines.push(`Blockchain Transaction Hash:,${reportHash || "Unsigned/Not Secured"}`);
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

          // --- COLORS ---
          const brandColor = [74, 155, 165]; // #4a9ba5
          const darkTextColor = [44, 62, 80]; // #2c3e50
          const secondaryTextColor = [108, 117, 125]; // #6c757d
          const successColor = [39, 174, 96]; // #27ae60
          const warningColor = [243, 156, 18]; // #f39c12

          let finalY = 0;

          // --- Header and Footer Functions ---
          const addHeaderFooter = (doc, totalPages) => {
            const pageCount = doc.internal.getNumberOfPages();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            for(let i = 1; i <= pageCount; i++) {
                doc.setPage(i);

                // --- HEADER ---
                // Brand Title
                doc.setFontSize(22);
                doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
                doc.setFont("helvetica", "bold");
                doc.text("Bleu Bean Cafe", 14, 20);

                // Report Type
                doc.setFontSize(12);
                doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
                doc.setFont("helvetica", "normal");
                doc.text("Sales & Orders Report", pageWidth - 14, 18, { align: 'right' });
                
                // Date Range
                doc.setFontSize(10);
                doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
                doc.text(`${startDate} to ${endDate}`, pageWidth - 14, 24, { align: 'right' });

                // Accent Line
                doc.setDrawColor(brandColor[0], brandColor[1], brandColor[2]);
                doc.setLineWidth(0.5);
                doc.line(14, 28, pageWidth - 14, 28);

                // --- FOOTER ---
                const timestamp = new Date().toLocaleString();
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Generated by Admin OOS on ${timestamp}`, 14, pageHeight - 10);
                doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
            }
          };

          // --- BLOCKCHAIN VERIFICATION SECTION (Styled Box) ---
          let startY = 35;
          if (reportHash) {
              // Verified State - Green Box
              doc.setFillColor(232, 245, 233); // Light green background
              doc.setDrawColor(200, 230, 201); // Green border
              doc.rect(14, startY, 182, 18, 'FD'); // Fill and Draw

              doc.setFontSize(10);
              doc.setTextColor(successColor[0], successColor[1], successColor[2]);
              doc.setFont("helvetica", "bold");
              doc.text("VERIFIED BLOCKCHAIN TRANSACTION", 16, startY + 6);

              doc.setFontSize(9);
              doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
              doc.setFont("courier", "normal"); // Monospace for Hash
              doc.text(reportHash, 16, startY + 12);
              
              startY += 25; // Move down for next section
          } else {
              // Unverified State - Gray Warning
              doc.setFillColor(248, 249, 250); // Light gray
              doc.setDrawColor(222, 226, 230);
              doc.rect(14, startY, 182, 12, 'FD');

              doc.setFontSize(10);
              doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
              doc.setFont("helvetica", "italic");
              doc.text("Report Status: Unsigned Draft (Not verified on Ledger)", 16, startY + 8);

              startY += 20;
          }


          // --- Summary Metrics Table ---
          doc.setFontSize(14);
          doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
          doc.setFont("helvetica", "bold");
          doc.text('Summary Metrics', 14, startY);

          const summaryHeaders = [['Metric', 'Value']];
          const summaryBody = dashboardData.map(card => [
              card.title,
              card.format === 'currency' ? `PHP ${card.current.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` :
              (card.type === 'completionRate' ? `${card.current.toFixed(2)}%` : card.current.toLocaleString())
          ]);

          autoTable(doc, {
              startY: startY + 5,
              head: summaryHeaders,
              body: summaryBody,
              theme: 'grid', // 'grid' looks cleaner for small summary tables
              styles: { fontSize: 10, cellPadding: 4, lineColor: [220, 220, 220] },
              headStyles: { fillColor: [245, 245, 245], textColor: darkTextColor, fontStyle: 'bold', lineWidth: 0.1 },
              columnStyles: {
                  0: { cellWidth: 80, fontStyle: 'bold', textColor: secondaryTextColor }, 
                  1: { fontStyle: 'bold', textColor: brandColor } 
              },
              didParseCell: (data) => {
                  if (data.column.index === 1 && data.section === 'body') {
                      data.cell.styles.halign = 'right';
                  }
              }
          });

          finalY = doc.lastAutoTable.finalY;

          // --- Orders Table ---
          doc.setFontSize(14);
          doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
          doc.text('Detailed Order List', 14, finalY + 15);

          const tableHeaders = [['Date', 'Order ID', 'Customer', 'Status', 'Payment', 'Total (PHP)', 'Items', 'Ref. No']];

          const tableRows = filteredData.map(order => {
              const dateTime = new Date(order.date);
              const date = dateTime.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }); // Compact date
              // Removed time to save horizontal space for PDF

              return [
                  date,
                  order.id,
                  order.customer,
                  order.status,
                  order.paymentMethod,
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
                  cellPadding: 3,
                  textColor: darkTextColor,
                  valign: 'middle'
              },
              headStyles: {
                  fillColor: brandColor,
                  textColor: [255, 255, 255],
                  fontStyle: 'bold',
                  halign: 'center'
              },
              alternateRowStyles: {
                  fillColor: [248, 252, 252] // Very light teal tint for alternating rows
              },
              columnStyles: {
                  0: { halign: 'center', cellWidth: 20 }, // Date
                  1: { halign: 'center', cellWidth: 15 }, // ID
                  3: { halign: 'center', cellWidth: 20 }, // Status
                  5: { halign: 'right', fontStyle: 'bold', cellWidth: 25 }, // Total
                  6: { halign: 'center', cellWidth: 10 }, // Items
              },
              didParseCell: (data) => {
                  // Custom styling for Status column
                  if (data.column.index === 3 && data.section === 'body') {
                      let color = [150, 150, 150]; // Default
                      if (data.cell.raw === 'Completed') color = successColor;
                      else if (data.cell.raw === 'Pending') color = warningColor;
                      else if (data.cell.raw === 'Cancelled') color = [192, 57, 43]; // Red
                      else if (data.cell.raw === 'delivered') color = [52, 152, 219]; // Blue

                      data.cell.styles.textColor = color;
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

                <button onClick={handleGenerateReport} style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#4a9ba5', color: 'white', cursor: 'pointer' }}>Generate report</button>
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

      {/* --- NEW REACT BOOTSTRAP MODAL FOR BLOCKCHAIN REPORT --- */}
      {modalData && (
        <Modal 
            show={showReportModal} 
            onHide={() => setShowReportModal(false)}
            size="xl"
            centered
        >
            <Modal.Header closeButton style={{ backgroundColor: '#f8f9fa' }}>
                <Modal.Title style={{ color: '#4a9ba5', display: 'flex', alignItems: 'center', gap: '10px' }}>
                   {reportHash ? <FontAwesomeIcon icon={faLock} /> : <FontAwesomeIcon icon={faClipboardList} />}
                   {reportHash ? "Verified Blockchain Report" : "Report Summary"}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {/* 1. Header Info */}
                <div className="alert alert-info d-flex justify-content-between align-items-center">
                    <div>
                        <strong>Report Period:</strong> {modalData.startDate} to {modalData.endDate}
                    </div>
                    {reportHash && (
                        <Badge bg="success" style={{ fontSize: '0.9rem' }}>
                            <FontAwesomeIcon icon={faCheckCircle} /> Verified on Ledger
                        </Badge>
                    )}
                </div>

                {/* 2. Metrics Grid (Reusing style from dashboard) */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '150px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>Total Revenue</div>
                        <div style={{ color: '#4a9ba5', fontSize: '1.5rem', fontWeight: 'bold' }}>₱{modalData.totalRevenue.toLocaleString()}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: '150px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                         <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>Total Orders</div>
                        <div style={{ color: '#2c3e50', fontSize: '1.5rem', fontWeight: 'bold' }}>{modalData.totalOrders}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: '150px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>Avg Order Value</div>
                        <div style={{ color: '#f39c12', fontSize: '1.5rem', fontWeight: 'bold' }}>₱{modalData.avgOrderValue.toFixed(2)}</div>
                    </div>
                     <div style={{ flex: 1, minWidth: '150px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>Completion Rate</div>
                        <div style={{ color: '#27ae60', fontSize: '1.5rem', fontWeight: 'bold' }}>{modalData.completionRate.toFixed(2)}%</div>
                    </div>
                </div>

                {/* 3. Blockchain Interaction Section - THIS IS THE NEW UX */}
                <div style={{ padding: '20px', border: '2px dashed #4a9ba5', borderRadius: '10px', backgroundColor: '#f0fbfc', marginBottom: '20px', textAlign: 'center' }}>
                    <h5 style={{color: '#2c3e50', marginBottom: '15px'}}><FontAwesomeIcon icon={faCube} /> Blockchain Ledger Status</h5>
                    
                    {!reportHash && !isHashing && (
                        <>
                            <p className="text-muted">This report is currently a draft. Secure it on the blockchain to create an immutable record of this date range.</p>
                            <Button 
                                variant="outline-primary" 
                                style={{ borderColor: '#4a9ba5', color: '#4a9ba5' }}
                                onMouseOver={(e) => {e.target.style.backgroundColor='#4a9ba5'; e.target.style.color='white'}}
                                onMouseOut={(e) => {e.target.style.backgroundColor='transparent'; e.target.style.color='#4a9ba5'}}
                                onClick={secureReportOnBlockchain}
                            >
                                <FontAwesomeIcon icon={faLink} /> Secure & Mint Report
                            </Button>
                        </>
                    )}

                    {isHashing && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <Spinner animation="border" variant="info" />
                            <span style={{ color: '#4a9ba5', fontWeight: 'bold' }}>Minting block... Verifying transactions...</span>
                        </div>
                    )}

                    {reportHash && (
                        <div className="animate__animated animate__fadeIn">
                            <p style={{ color: '#27ae60', fontWeight: 'bold' }}>Report successfully secured!</p>
                            <div style={{ background: '#e8f5e9', padding: '10px', borderRadius: '5px', wordBreak: 'break-all', fontFamily: 'monospace', color: '#2e7d32', border: '1px solid #c8e6c9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div><strong>Transaction Hash:</strong> {reportHash}</div>
                                <FontAwesomeIcon icon={faClipboard} style={{ cursor: 'pointer', color: '#4a9ba5' }} onClick={() => { navigator.clipboard.writeText(reportHash); Swal.fire('Copied!', 'Hash copied to clipboard.', 'success'); }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. Table Preview */}
                <h6>Report Data Preview</h6>
                <Table bordered hover size="sm" style={{ fontSize: '0.85rem' }}>
                    <thead style={{ backgroundColor: '#f8f9fa' }}>
                        <tr>
                            <th>Date</th>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Status</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {modalData.orders.slice(0, 5).map((ord, idx) => (
                            <tr key={idx}>
                                <td>{new Date(ord.date).toLocaleDateString()}</td>
                                <td>{ord.id}</td>
                                <td>{ord.customer}</td>
                                <td>{ord.status}</td>
                                <td>₱{ord.total.toFixed(2)}</td>
                            </tr>
                        ))}
                        {modalData.orders.length > 5 && (
                            <tr>
                                <td colSpan="5" className="text-center text-muted">
                                    ...and {modalData.orders.length - 5} more rows included in this report block.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>

            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowReportModal(false)}>
                    Close
                </Button>
                {/* ADDED CSV DOWNLOAD BUTTON */}
                <Button 
                    variant="outline-primary" 
                    onClick={() => handleExport('csv')} 
                    style={{ borderColor: '#4a9ba5', color: '#4a9ba5' }}
                    onMouseOver={(e) => {e.target.style.backgroundColor='#4a9ba5'; e.target.style.color='white'}}
                    onMouseOut={(e) => {e.target.style.backgroundColor='transparent'; e.target.style.color='#4a9ba5'}}
                >
                    Download CSV
                </Button>
                {/* EXISTING PDF BUTTON */}
                <Button variant="primary" onClick={() => handleExport('pdf')} style={{ backgroundColor: '#4a9ba5', border: 'none' }}>
                    Download PDF
                </Button>
            </Modal.Footer>
        </Modal>
      )}

    </div>
  );
};

export default Report;