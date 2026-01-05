import React, { useState, useEffect } from "react";
import coffeeImage from "../../assets/coffee.jpg";
import "../admin2/dashboard.css";
import adminImage from "../../assets/administrator.png";
import { FaSignOutAlt, FaUndo } from "react-icons/fa";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar,
  // ADDED PIECHART COMPONENTS
  PieChart, Pie, Cell
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
  faCheckCircle,
  faCog,
  faClipboardCheck,
  faXmark
} from '@fortawesome/free-solid-svg-icons';
import { FaChevronDown, FaBell } from "react-icons/fa";

library.add(faMoneyBillWave, faChartLine, faShoppingCart, faClock, faArrowTrendUp, faArrowTrendDown, faCheckCircle, faCog, faClipboardCheck, faXmark);

// --- Static data remains the same ---
const revenueData = [ { name: 'Jan', income: 5000, expense: 3000 }, { name: 'Feb', income: 14000, expense: 10000 }, { name: 'Mar', income: 15000, expense: 12000 }, { name: 'Apr', income: 11000, expense: 9000 }, { name: 'May', income: 13000, expense: 7000 }, { name: 'June', income: 18000, expense: 10000 }, { name: 'July', income: 18000, expense: 13000 }, ];

// Rider Earnings Data for the Bar Graph - will be fetched dynamically

const PIE_COLORS = ['#00b4d8', '#ffb703', '#48cae4', '#03045e', '#a9d6e5'];

// ✅ FIXED: Date.toLocaleString "second" property is now "numeric"
const currentDate = new Date().toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", });
const userRole = "Admin";
const initialData = [ { title: "Today's Sales", current: 0, previous: 45000, format: "currency", icon: faMoneyBillWave, type: "sales" }, { title: "Total Orders", current: 0, previous: 1100, format: "number", icon: faChartLine, type: "revenue" }, { title: "Today's Orders", current: 0, previous: 50, format: "number", icon: faShoppingCart, type: "orders" }, { title: "Pending Orders", current: 0, previous: 20, format: "number", icon: faClock, type: "pendings" }, { title: "Delivered Orders", current: 0, previous: 800, format: "number", icon: faCheckCircle, type: "deliveredOrders" }, { title: "Pick Up Orders", current: 0, previous: 300, format: "number", icon: faClipboardCheck, type: "confirmedOrders" }, { title: "Cancelled Orders", current: 0, previous: 50, format: "number", icon: faXmark, type: "cancelledOrders" } ];
const formatValue = (value, format) => { return format === "currency" ? `₱${value.toLocaleString()}` : value.toLocaleString(); };

// Define the custom label for the Pie chart
const renderCustomizedLabel = ({ name, percent }) => {
  if (percent > 0.05) { // Only show label for slices larger than 5%
    return `${name} (${(percent * 100).toFixed(0)}%)`;
  }
  return '';
};

// Custom Tooltip for Pie Chart
const CustomTooltip = ({ active, payload, label, popularItems }) => {
    if (active && payload && payload.length) {
        const item = payload[0].payload;
        const totalSold = popularItems.reduce((sum, entry) => sum + entry.value, 0);
        const percentage = ((item.value / totalSold) * 100).toFixed(1);
        return (
            <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{item.name}</p>
                <p style={{ margin: 0 }}>Units Sold: {item.value}</p>
                <p style={{ margin: 0 }}>Percentage: {percentage}%</p>
            </div>
        );
    }
    return null;
};


const Dashboard = () => {
  const [authToken, setAuthToken] = useState(null);
  const [userName, setUserName] = useState("Loading...");

  const [revenueFilter, setRevenueFilter] = useState("Weekly");
  const [salesFilter, setSalesFilter] = useState("Weekly");
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    todaysOrders: 0,
    cancelledOrders: 0,
    deliveredOrders: 0,
    confirmedOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [riderEarningsData, setRiderEarningsData] = useState([]);
  const [earningsFilter, setEarningsFilter] = useState("Daily");
  const [allDeliveryOrders, setAllDeliveryOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [topRiders, setTopRiders] = useState([]);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);
  const [earningsCache, setEarningsCache] = useState({});
  // --- useEffects for Auth and Data Fetching ---
  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    const userData = localStorage.getItem("userData");
    if (storedToken) setAuthToken(storedToken);
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed?.username) setUserName(parsed.username);
      } catch {}
    } else {
      const storedUsername = localStorage.getItem("userName");
      if (storedUsername) setUserName(storedUsername);
    }

    const onStorage = () => {
      const t = localStorage.getItem("authToken");
      setAuthToken(t);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!authToken) { return; }
    fetch("http://localhost:7004/cart/admin/orders/total", { headers: { Authorization: `Bearer ${authToken}`, }, })
    .then((res) => { if (!res.ok) { throw new Error(`HTTP error! status: ${res.status}`); } return res.json(); })
    .then((data) => {
      console.log("Fetched total orders:", data);
      setDashboardData((prev) => ({ ...prev, totalOrders: data.total_orders, }));
    })
    .catch((err) => console.error("Failed to fetch total orders:", err));
  }, [authToken]);

  useEffect(() => {
    if (!authToken) { return; }
    fetch("http://localhost:7004/cart/admin/orders/pending", { headers: { Authorization: `Bearer ${authToken}`, }, })
      .then((res) => { if (!res.ok) { throw new Error(`HTTP error! status: ${res.status}`); } return res.json(); })
      .then((orders) => {
        const pendingCount = orders.filter(order => order.order_status === "Pending").length;
        setDashboardData(prev => ({ ...prev, pendingOrders: pendingCount, }));
      })
      .catch((err) => console.error("Failed to fetch pending orders:", err));
  }, [authToken]);

  useEffect(() => {
    if (!authToken) { return; }
    fetch("http://localhost:7004/cart/admin/orders/today_count", { headers: { Authorization: `Bearer ${authToken}`, }, })
      .then((res) => { if (!res.ok) { throw new Error(`HTTP error! status: ${res.status}`); } return res.json(); })
      .then((data) => {
        setDashboardData(prev => ({ ...prev, todaysOrders: data.todays_orders, }));
      })
      .catch((err) => console.error("Failed to fetch today's orders:", err));
  }, [authToken]);

  useEffect(() => {
    if (!authToken) { return; }
    fetch("http://localhost:7004/cart/admin/orders/manage", { headers: { Authorization: `Bearer ${authToken}`, }, })
      .then((res) => { if (!res.ok) { throw new Error(`HTTP error! status: ${res.status}`); } return res.json(); })
      .then((data) => {
        console.log("Fetched recent orders:", data);
        const transformedOrders = data.map(order => ({
          customer: order.customer_name,
          items: order.items,
          date: order.order_date,
          status: order.order_status,
          amount: order.total_amount,
          orderType: order.order_type,
        }));
        setAllOrders(transformedOrders);
        setRecentOrders(transformedOrders.slice(0, 10));
        const cancelledCount = transformedOrders.filter(order => order.status.toLowerCase() === "cancelled").length; 
        // Count pickup orders that are completed (handle both "pick up" and "pickup" variants)
        const confirmedCount = transformedOrders.filter(order => {
          const orderType = order.orderType ? order.orderType.toLowerCase().replace(/\s+/g, '') : '';
          const status = order.status ? order.status.toLowerCase() : '';
          return orderType === "pickup" && status === "completed";
        }).length;
        console.log("Pickup orders count:", confirmedCount, "Total orders:", transformedOrders.length);
        setDashboardData(prev => ({ ...prev, cancelledOrders: cancelledCount, confirmedOrders: confirmedCount }));
      })
      .catch((err) => console.error("Failed to fetch recent orders:", err));
  }, [authToken]);

  useEffect(() => {
    if (!authToken) { return; }
    // Fetch all riders
    fetch("http://localhost:7001/delivery/riders", { headers: { Authorization: `Bearer ${authToken}`, }, })
      .then((res) => { if (!res.ok) { throw new Error(`HTTP error! status: ${res.status}`); } return res.json(); })
      .then((riders) => {
        console.log("Fetched riders:", riders);
        setRiders(riders);
      })
      .catch((err) => console.error("Failed to fetch riders:", err));
  }, [authToken]);

  useEffect(() => {
    if (!authToken) { return; }
    // Fetch all delivery orders
    fetch("http://localhost:7004/delivery/admin/delivery/orders", { headers: { Authorization: `Bearer ${authToken}`, }, })
      .then((res) => { if (!res.ok) { throw new Error(`HTTP error! status: ${res.status}`); } return res.json(); })
      .then((data) => {
        console.log("Fetched delivery orders:", data);
        setAllDeliveryOrders(data);
        // Correctly count delivered orders from the delivery-specific endpoint
        const deliveredCount = data.filter(order => order.currentStatus && order.currentStatus.toLowerCase() === "delivered").length;
        setDashboardData(prev => ({ ...prev, deliveredOrders: deliveredCount }));
      })
      .catch((err) => console.error("Failed to fetch delivery orders:", err));
  }, [authToken]);

  // New useEffect for time-based rider earnings (optimized with caching and loading state)
  useEffect(() => {
    if (!authToken) {
      return;
    }

    const fetchEarnings = async () => {
      // Check cache first
      if (earningsCache[earningsFilter]) {
        setRiderEarningsData(earningsCache[earningsFilter].periods);
        setTopRiders(earningsCache[earningsFilter].topRiders);
        return;
      }

      setIsLoadingEarnings(true);
      try {
        const response = await fetch(`http://localhost:7004/delivery/admin/rider-earnings/aggregated/${earningsFilter}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        
        // Update state
        setRiderEarningsData(data.periods);
        setTopRiders(data.topRiders);
        
        // Cache the result
        setEarningsCache(prev => ({
          ...prev,
          [earningsFilter]: {
            periods: data.periods,
            topRiders: data.topRiders
          }
        }));
      } catch (e) {
        console.error('Failed to fetch aggregated rider earnings:', e);
        // Keep existing data on error instead of clearing
        if (!earningsCache[earningsFilter]) {
          setRiderEarningsData([]);
          setTopRiders([]);
        }
      } finally {
        setIsLoadingEarnings(false);
      }
    };

    fetchEarnings();
  }, [earningsFilter, authToken]);
  // --- End of useEffects ---

  const toggleDropdown = () => {
    setDropdownOpen(!isDropdownOpen);
  };

  // Logic for ordersData, salesData, todaysSales, and data (Unchanged)
  const dailyOrdersData = allOrders.reduce((acc, order) => {
    const date = order.date;
    if (!acc[date]) { acc[date] = 0; } acc[date]++; return acc;
  }, {});

  let ordersData = [];
  if (revenueFilter === "Weekly") {
    const now = new Date();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay());
    ordersData = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + i);
      const dayStr = day.toISOString().split('T')[0];
      const options = { month: 'short', day: 'numeric' };
      const formattedDate = day.toLocaleDateString('en-US', options);
      const count = allOrders.filter(order => new Date(order.date).toISOString().split('T')[0] === dayStr).length;
      ordersData.push({ name: formattedDate, orders: count });
    }
  } else if (revenueFilter === "Monthly") {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthOrders = {};
    months.forEach(m => monthOrders[m] = 0);
    allOrders.forEach(order => {
      const orderDate = new Date(order.date);
      const monthName = orderDate.toLocaleDateString('en-US', { month: 'short' });
      if (months.includes(monthName)) { monthOrders[monthName] = (monthOrders[monthName] || 0) + 1; }
    });
    ordersData = months.map(month => ({ name: month, orders: monthOrders[month] }));
  } else {
    ordersData = Object.entries(dailyOrdersData).map(([date, count]) => ({ name: date, orders: count }));
  }

  let salesData = [];
  if (salesFilter === "Weekly") {
    const now = new Date();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay());
    salesData = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + i);
      const dayStr = day.toISOString().split('T')[0];
      const options = { month: 'short', day: 'numeric' };
      let formattedDate = day.toLocaleDateString('en-US', options);
      if (day.toDateString() === new Date().toDateString()) { formattedDate = 'today ' + formattedDate; }
      const sum = allOrders.filter(order => new Date(order.date).toISOString().split('T')[0] === dayStr).reduce((acc, order) => acc + (order.amount || 0), 0);
      salesData.push({ name: formattedDate, sales: sum });
    }
  } else if (salesFilter === "Monthly") {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthSums = {};
    months.forEach(m => monthSums[m] = 0);
    allOrders.forEach(order => {
      const orderDate = new Date(order.date);
      const monthName = orderDate.toLocaleDateString('en-US', { month: 'short' });
      if (months.includes(monthName)) { monthSums[monthName] += order.amount || 0; }
    });
    salesData = months.map(month => ({ name: month, sales: monthSums[month] }));
  }

  const todaysSales = allOrders.filter(order => new Date(order.date).toDateString() === new Date().toDateString()).reduce((sum, order) => sum + (order.amount || 0), 0);

  const data = initialData.map((card) => {
    if (card.title === "Total Orders") { return { ...card, current: dashboardData.totalOrders, }; }
    if (card.title === "Pending Orders") { return { ...card, current: dashboardData.pendingOrders, }; }
    if (card.title === "Today's Orders") { return { ...card, current: dashboardData.todaysOrders, }; }
    if (card.title === "Today's Sales") { return { ...card, current: todaysSales, }; }
    if (card.title === "Cancelled Orders") { return { ...card, current: dashboardData.cancelledOrders, }; }
    if (card.title === "Delivered Orders") { return { ...card, current: dashboardData.deliveredOrders, }; }
    if (card.title === "Pick Up Orders") { return { ...card, current: dashboardData.confirmedOrders, }; }
    return card;
  });

  // Data preparation for Popular Items (Unchanged)
  const popularItems = React.useMemo(() => {
    const itemAgg = {};
    recentOrders.forEach(order => {
      const numItems = order.items.length;
      const amountPerItem = order.amount / numItems;
      order.items.forEach(item => {
        if (!itemAgg[item.name]) {
          itemAgg[item.name] = { sold: 0, revenue: 0 };
        }
        itemAgg[item.name].sold += item.quantity;
        itemAgg[item.name].revenue += amountPerItem * item.quantity;
      });
    });
    return Object.entries(itemAgg).map(([name, data]) => ({
      name,
      value: data.sold, 
      revenue: Math.round(data.revenue)
    })).sort((a, b) => b.value - a.value).slice(0, 5); // Limit to top 5
  }, [recentOrders]);

  return (
    <div className="dashboard">
      <main className="dashboard-main">
        <header className="header">
          <div className="header-left">
            <h2 className="page-title">Dashboard</h2>
          </div>
          <div className="header-right">
            <div className="header-date">{currentDate}</div>
             <div className="header-profile">
                 <img src={adminImage} alt="Admin" className="profile-pic" />
              <div className="profile-info">
                <div className="profile-role">Hi! I'm {userRole}</div>
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
                      onClick={() => {
                        try { localStorage.removeItem("access_token"); localStorage.removeItem("authToken"); localStorage.removeItem("expires_at"); localStorage.removeItem("userData"); } catch {}
                        window.location.replace("http://localhost:4002/");
                      }}
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

        {/* --- Card Section --- */}
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
                                {Math.abs(percent).toFixed(1)}%
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

          {/* --- Line and Area Charts --- */}
          <div className="dashboard-charts">
            <div className="chart-box">
              <div className="chart-header">
                <span>Total Orders</span>
                <select className="chart-dropdown" value={revenueFilter} onChange={(e) => setRevenueFilter(e.target.value)}>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={ordersData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke="#00b4d8" name="Orders" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-box">
              <div className="chart-header">
                <span>Sales</span>
                <select className="chart-dropdown" value={salesFilter} onChange={(e) => setSalesFilter(e.target.value)}>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={salesData}><defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00b4d8" stopOpacity={0.8} /><stop offset="95%" stopColor="#00b4d8" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" /><YAxis /><CartesianGrid strokeDasharray="3 3" /><Tooltip /><Area type="monotone" dataKey="sales" stroke="#00b4d8" fillOpacity={1} fill="url(#colorSales)" /></AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* --- Rider Earnings Chart --- */}
          <div className="dashboard-charts" style={{ marginTop: '20px', gridTemplateColumns: '2fr 1fr' }}>
            <div className="chart-box" style={{ position: 'relative' }}>
              <div className="chart-header">
                  <span>Rider Earnings - {earningsFilter}</span>
                  <select className="chart-dropdown" value={earningsFilter} onChange={(e) => setEarningsFilter(e.target.value)}>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                  </select>
              </div>
              {isLoadingEarnings && (
                <div style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)', 
                  zIndex: 10,
                  fontSize: '16px',
                  color: '#00b4d8',
                  fontWeight: '600'
                }}>
                  Loading...
                </div>
              )}
              <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={riderEarningsData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(value) => `₱${value.toLocaleString()}`} />
                      <Tooltip formatter={(value) => [`₱${value.toLocaleString()}`, 'Total Earnings']} />
                      <Bar dataKey="earnings" fill="#00b4d8" name="Total Rider Earnings" animationDuration={300} />
                  </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-box" style={{ position: 'relative' }}>
              <div className="chart-header" style={{ marginBottom: '15px' }}>
                <span>Top Earner Riders - {earningsFilter}</span>
              </div>
              {isLoadingEarnings && (
                <div style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)', 
                  zIndex: 10,
                  fontSize: '16px',
                  color: '#00b4d8',
                  fontWeight: '600'
                }}>
                  Loading...
                </div>
              )}
              <div style={{ maxHeight: '310px', overflowY: 'auto', opacity: isLoadingEarnings ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                {topRiders.length > 0 ? topRiders.map((rider, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 8px', borderBottom: '1px solid #eee' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', marginRight: '15px', color: '#4b929d', minWidth: '20px' }}>{index + 1}.</span>
                      <span style={{ fontSize: '15px' }}>{rider.name}</span>
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: '#007bff' }}>
                      ₱{rider.earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )) : (
                  !isLoadingEarnings && (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                      No data available
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* --- Recent Orders and Popular Items Chart Section --- */}
          <div className="dashboard-extra-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div className="chart-box" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', padding: '20px' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '5px' }}>Recent Orders</div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Latest orders from customers</div>
              <div style={{ width: '100%', maxHeight: '300px', overflowY: 'auto', marginBottom: '10px' }}>
                {recentOrders.map((order, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', flex: 1, textAlign: 'left' }}>{order.customer}</div>
                    <div style={{ fontSize: '12px', color: '#666', flex: 1, textAlign: 'center' }}>{order.items.map(i => `${i.name} x${i.quantity}`).join(', ')}</div>
                    <div style={{ fontSize: '12px', color: '#666', flex: 1, textAlign: 'center' }}>{order.date}</div>
                    <div style={{
                      padding: '2px 6px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      display: 'inline-block',
                      backgroundColor: order.status.toLowerCase() === 'pending' ? '#fff3cd' :
                                         order.status.toLowerCase() === 'processing' ? '#cce5ff' :
                                         order.status.toLowerCase() === 'waiting for pick up' ? '#9c27b0' :
                                         order.status.toLowerCase() === 'completed' ? '#d4edda' :
                                         order.status.toLowerCase() === 'cancelled' ? '#f8d7da' : '#e9ecef',
                      color: order.status.toLowerCase() === 'pending' ? '#856404' :
                             order.status.toLowerCase() === 'processing' ? '#004085' :
                             order.status.toLowerCase() === 'waiting for pick up' ? '#ffffff' :
                             order.status.toLowerCase() === 'completed' ? '#155724' :
                             order.status.toLowerCase() === 'cancelled' ? '#721c24' : '#495057',
                      flex: 1,
                      textAlign: 'center',
                      marginLeft: 'auto',
                      marginRight: 'auto',
                      width: 'fit-content',
                      minWidth: '80px',
                      lineHeight: '1.5',
                      verticalAlign: 'middle',
                    }}>
                      {order.status}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500', flex: 0, textAlign: 'left', marginLeft: '10px', minWidth: '90px' }}>₱{order.amount}</div>
                  </div>
                ))}
              </div>

            </div>
            {/* START: Popular Items PIE CHART */}
            <div className="chart-box" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', padding: '20px' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '5px' }}>Popular Items</div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Top 5 best selling menu items (Proportion by Units Sold)</div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={popularItems}
                    dataKey="value" // The key for the data value (Units Sold)
                    nameKey="name"  // The key for the name (Item Name)
                    cx="50%"        // Center X position
                    cy="50%"        // Center Y position
                    outerRadius={100} // Radius of the outer circle
                    fill="#8884d8"
                    labelLine={false} // Hide the line connecting the label
                    label={renderCustomizedLabel} // Use the custom label function
                  >
                    {popularItems.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  {/* Pass popularItems to CustomTooltip */}
                  <Tooltip content={<CustomTooltip popularItems={popularItems} />} /> 
                  
                  {/* ✅ FIXED: Legend is now horizontal and centered below the chart */}
                  <Legend 
                      layout="horizontal" 
                      verticalAlign="bottom" 
                      align="center" 
                      wrapperStyle={{ paddingTop: 20 }} 
                  />
                  
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* END: Popular Items PIE CHART */}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
