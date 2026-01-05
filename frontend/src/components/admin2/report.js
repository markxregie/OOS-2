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
  faClipboard,
  faList,
  faReceipt,
  faDownload // Added back
} from '@fortawesome/free-solid-svg-icons';

// Library initialization for FontAwesome
library.add(faMoneyBillWave, faChartLine, faShoppingCart, faClock, faArrowTrendUp, faArrowTrendDown, faCog, faClipboardCheck, faDollarSign, faClipboardList, faChartPie, faCheckCircle, faSearch, faCube, faLink, faLock, faClipboard, faList, faReceipt, faDownload);


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
  const [exportOption, setExportOption] = useState('csv'); // Added back
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
  const [explorerUrl, setExplorerUrl] = useState(null); // Explorer URL from backend

  // Fetch stored hash on modal open for the selected date range
  useEffect(() => {
    const loadStoredHash = async () => {
      if (!showReportModal || !modalData) return;
      try {
        const resp = await fetch('http://127.0.0.1:7006/blockchain/report-hash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate: modalData.startDate, endDate: modalData.endDate })
        });
        const res = await resp.json();
        if (res.success && res.transactionHash) {
          setReportHash(res.transactionHash);
          setExplorerUrl(res.explorerUrl || null);
        }
      } catch (e) {
        console.warn('No stored hash found for date range');
      }
    };
    loadStoredHash();
  }, [showReportModal, modalData]);

  // --- ORDER DETAILS MODAL STATE ---
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

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
          status: order.order_status.toUpperCase(),
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

  const handleViewDetails = (order) => {
      setSelectedOrder(order);
      setShowDetailsModal(true);
  };

  // --- REAL BLOCKCHAIN API CALL FUNCTION ---
  const secureReportOnBlockchain = async () => {
      setIsHashing(true);
      
      try {
          // Call the actual blockchain service
          const response = await fetch('http://127.0.0.1:7006/blockchain/mint-report', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                  startDate: modalData.startDate,
                  endDate: modalData.endDate,
                  totalRevenue: modalData.totalRevenue,
                  totalOrders: modalData.totalOrders,
                  avgOrderValue: modalData.avgOrderValue,
                  completionRate: modalData.completionRate,
                  orders: modalData.orders.map(order => ({
                      id: order.id,
                      date: order.date,
                      customer: order.customer,
                      status: order.status,
                      total: order.total,
                      paymentMethod: order.paymentMethod
                  }))
              })
          });

          const result = await response.json();
          
          if (result.success && result.transactionHash) {
              setReportHash(result.transactionHash);
              setExplorerUrl(result.explorerUrl || null);
              setIsHashing(false);

              // Persist report + hash snapshot in backend
              try {
                await fetch('http://127.0.0.1:7006/blockchain/report-hash', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ startDate: modalData.startDate, endDate: modalData.endDate })
                });
              } catch {}
              
              Swal.fire({
                  icon: 'success',
                  title: 'Report Secured on Blockchain!',
                  html: `
                      <p>This report has been permanently recorded on the BuildBear blockchain.</p>
                      <p style="font-family: monospace; font-size: 0.9em; word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px;">
                          <strong>TX Hash:</strong> ${result.transactionHash}
                      </p>
                      ${result.explorerUrl ? `<a href="${result.explorerUrl}" target="_blank" rel="noopener noreferrer" style="color: #4a9ba5;">View on BuildBear Explorer</a>` : ''}
                  `,
                  confirmButtonColor: '#4a9ba5'
              });
          } else {
              throw new Error(result.error || 'Failed to mint report');
          }
      } catch (error) {
          console.error('Blockchain minting error:', error);
          setIsHashing(false);
          
          Swal.fire({
              icon: 'error',
              title: 'Blockchain Minting Failed',
              text: `Error: ${error.message || 'Unable to connect to blockchain service'}`,
              confirmButtonColor: '#dc3545'
          });
      }
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
      // Updated Headers to include Items Details
      const detailHeaders = ['Date', 'Order ID', 'Customer Name', 'Order Status', 'Payment Method', 'Time Ordered', 'Total Amount (PHP)', 'Items Count', 'Items Details', 'Reference No.', 'Order Type', 'Handled By'];
      csvLines.push(detailHeaders.join(','));
      
      const detailRows = filteredData.map(order => {
        const dateTime = new Date(order.date);
        // Using ISO date and 12-hour time for consistent formatting in CSV
        const date = dateTime.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const time = dateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        // Build Item String
        const itemsString = order.items.map(item => {
            const itemName = item.product_name || item.name || 'Item';
            const qty = item.quantity || 1;
            const addons = Array.isArray(item.addons) && item.addons.length > 0
              ? `(${item.addons.map(a => a.addon_name).join(', ')})`
              : '';
            const instructions = item.instructions ? `[${item.instructions}]` : '';
            return `${qty}x ${itemName} ${addons} ${instructions}`;
        }).join('; ');

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
          wrapQuotes(itemsString), // New Column
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
          const doc = new jsPDF('l', 'mm', 'a4'); // CHANGED TO LANDSCAPE ('l') to fit more columns

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
          const pageWidth = doc.internal.pageSize.getWidth(); // FIXED: Defined here for use below
          let startY = 35;
          if (reportHash) {
              // Verified State - Green Box
              doc.setFillColor(232, 245, 233); // Light green background
              doc.setDrawColor(200, 230, 201); // Green border
              doc.rect(14, startY, pageWidth - 28, 18, 'FD'); // Fill and Draw

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
              doc.rect(14, startY, pageWidth - 28, 12, 'FD');

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

          // UPDATED HEADERS FOR PDF
          const tableHeaders = [['Date', 'Order ID', 'Ref No.', 'Customer', 'Status', 'Payment', 'Type', 'Total (PHP)', 'Items', 'Details']];

          const tableRows = filteredData.map(order => {
              const dateTime = new Date(order.date);
              const date = dateTime.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });

              // Build Item String for PDF
              const itemsString = order.items.map(item => {
                const itemName = item.product_name || item.name || 'Item';
                const qty = item.quantity || 1;
                const addons = Array.isArray(item.addons) && item.addons.length > 0
                    ? `(${item.addons.map(a => a.addon_name).join(', ')})` : '';
                return `${qty}x ${itemName} ${addons}`;
              }).join(', ');

              return [
                  date,
                  order.id,
                  order.referenceNo,
                  order.customer,
                  order.status,
                  order.paymentMethod,
                  order.orderType,
                  order.total.toFixed(2),
                  order.items.length,
                  itemsString // Included items in PDF
              ];
          });

          autoTable(doc, {
              head: tableHeaders,
              body: tableRows,
              startY: finalY + 20,
              margin: { top: 35, left: 14, right: 14 }, // ADDED: Top margin prevents header overlap on page 2+
              theme: 'striped',
              styles: {
                  fontSize: 8,
                  cellPadding: 3,
                  textColor: darkTextColor,
                  valign: 'top', // Top align for wrapping text
                  overflow: 'linebreak'
              },
              headStyles: {
                  fillColor: brandColor,
                  textColor: [255, 255, 255],
                  fontStyle: 'bold',
                  halign: 'center'
              },
              alternateRowStyles: {
                  fillColor: [248, 252, 252]
              },
              columnStyles: {
                  0: { halign: 'center', cellWidth: 20 }, // Date
                  1: { halign: 'center', cellWidth: 15 }, // ID
                  2: { halign: 'center', cellWidth: 25 }, // Ref
                  // 3: Customer (removed fixed width to allow expansion)
                  4: { halign: 'center', cellWidth: 20 }, // Status
                  5: { halign: 'center', cellWidth: 20 }, // Payment
                  6: { halign: 'center', cellWidth: 20 }, // Type
                  7: { halign: 'right', fontStyle: 'bold', cellWidth: 25 }, // Total
                  8: { halign: 'center', cellWidth: 15 }, // Item Count
                  // 9: Details (removed fixed width to allow expansion)
              },
              didParseCell: (data) => {
                  if (data.column.index === 4 && data.section === 'body') {
                      let color = [150, 150, 150]; 
                      if (data.cell.raw === 'Completed') color = successColor;
                      else if (data.cell.raw === 'Pending') color = warningColor;
                      else if (data.cell.raw === 'Cancelled') color = [192, 57, 43];
                      else if (data.cell.raw === 'delivered') color = [52, 152, 219];

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
                      {/* CLICKABLE ITEMS ORDERED */}
                      <td 
                        style={{ cursor: 'pointer', color: '#4a9ba5', textDecoration: 'underline', fontWeight: 'bold' }}
                        onClick={() => handleViewDetails(order)}
                        title="View Full Order Details"
                      >
                        {order.items.length}
                      </td>
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
                            <p style={{ color: '#27ae60', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                <FontAwesomeIcon icon={faCheckCircle} /> Report successfully secured on blockchain!
                            </p>
                            
                            {/* Transaction Hash Display */}
                            <div style={{ 
                                background: '#e8f5e9', 
                                padding: '15px', 
                                borderRadius: '8px', 
                                wordBreak: 'break-all', 
                                fontFamily: 'monospace', 
                                color: '#2e7d32', 
                                border: '1px solid #c8e6c9', 
                                marginBottom: '15px' 
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <div style={{ flex: 1 }}>
                                        <strong>Transaction Hash:</strong>
                                        <div style={{ fontSize: '0.9em', marginTop: '5px' }}>{reportHash}</div>
                                    </div>
                                    <FontAwesomeIcon 
                                        icon={faClipboard} 
                                        style={{ cursor: 'pointer', color: '#4a9ba5', fontSize: '1.2rem', marginLeft: '10px' }} 
                                        onClick={() => { 
                                            navigator.clipboard.writeText(reportHash); 
                                            Swal.fire({
                                                icon: 'success',
                                                title: 'Copied!',
                                                text: 'Transaction hash copied to clipboard.',
                                                timer: 2000,
                                                showConfirmButton: false
                                            }); 
                                        }} 
                                        title="Copy to clipboard"
                                    />
                                </div>
                                
                                {/* BuildBear Explorer Link */}
                                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #c8e6c9' }}>
                                  <a 
                                    href={explorerUrl || `https://explorer.buildbear.io/selfish-gilgamesh-91962214/tx/${reportHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ 
                                            color: '#4a9ba5', 
                                            textDecoration: 'none',
                                            fontWeight: 'bold',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <FontAwesomeIcon icon={faLink} />
                                        View Transaction on BuildBear Explorer
                                        <span style={{ fontSize: '1.2rem' }}>↗</span>
                                    </a>
                                </div>
                            </div>
                            
                            {/* Additional Info */}
                            <div style={{ fontSize: '0.85rem', color: '#6c757d', textAlign: 'left' }}>
                                <p style={{ marginBottom: '5px' }}>
                                    <FontAwesomeIcon icon={faLock} /> This report is now permanently recorded on the BuildBear blockchain.
                                </p>
                                <p style={{ marginBottom: '0' }}>
                                    The transaction hash serves as cryptographic proof of the report's authenticity and timestamp.
                                </p>
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

      {/* --- NEW ORDER DETAILS MODAL --- */}
      {selectedOrder && (
        <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} centered size="lg">
            <Modal.Header closeButton style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                <Modal.Title style={{ color: '#4a9ba5' }}>
                    <FontAwesomeIcon icon={faReceipt} className="me-2" />
                    Order Details #{selectedOrder.id}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ padding: '20px' }}>
                <div className="d-flex justify-content-between mb-4">
                    <div>
                        <h6 className="text-muted">Customer</h6>
                        <strong>{selectedOrder.customer}</strong>
                        <div className="small text-muted">{selectedOrder.emailAddress}</div>
                        <div className="small text-muted">{selectedOrder.phoneNumber}</div>
                    </div>
                    <div className="text-end">
                        <h6 className="text-muted">Order Date</h6>
                        <strong>{new Date(selectedOrder.date).toLocaleString()}</strong>
                        <div className="mt-1">
                            <Badge bg={
                                selectedOrder.status === 'Completed' ? 'success' : 
                                selectedOrder.status === 'Pending' ? 'warning' : 'secondary'
                            }>
                                {selectedOrder.status}
                            </Badge>
                        </div>
                    </div>
                </div>

                <h6 style={{ color: '#4a9ba5', borderBottom: '2px solid #4a9ba5', paddingBottom: '5px', marginBottom: '15px' }}>
                    <FontAwesomeIcon icon={faList} className="me-2" />
                    Items Ordered
                </h6>

                <Table bordered hover>
                    <thead className="table-light">
                        <tr>
                            <th style={{ width: '50%' }}>Item Name</th>
                            <th style={{ width: '15%', textAlign: 'center' }}>Qty</th>
                            <th style={{ width: '35%' }}>Add-ons / Instructions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedOrder.items.length > 0 ? (
                            selectedOrder.items.map((item, idx) => (
                                <tr key={idx}>
                                    <td>
                                        <strong>{item.product_name || item.name}</strong>
                                        <div className="small text-muted">Variant: {item.size || 'Standard'}</div>
                                    </td>
                                    <td className="text-center">{item.quantity}</td>
                                    <td>
                                        {item.addons && (
                                            <div className="text-success small" style={{ display: 'flex', flexDirection: 'column' }}>
                                                {Array.isArray(item.addons) ? item.addons.map((addon, addonIdx) => (
                                                    <span key={addonIdx}>+ {addon.addon_name} (₱{addon.price.toFixed(2)})</span>
                                                )) : (
                                                    <span>+ {String(item.addons)}</span>
                                                )}
                                            </div>
                                        )}
                                        {item.instructions && (
                                            <div className="text-muted small fst-italic">
                                                Note: {item.instructions}
                                            </div>
                                        )}
                                        {!item.addons && !item.instructions && <span className="text-muted">-</span>}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" className="text-center text-muted">No items found for this order.</td>
                            </tr>
                        )}
                    </tbody>
                </Table>

                <div className="d-flex justify-content-end mt-3">
                    <div style={{ textAlign: 'right' }}>
                        <h5 style={{ color: '#2c3e50' }}>Total: ₱{selectedOrder.total.toFixed(2)}</h5>
                        <div className="small text-muted">Paid via {selectedOrder.paymentMethod}</div>
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
                    Close Details
                </Button>
            </Modal.Footer>
        </Modal>
      )}

    </div>
  );
};

export default Report;