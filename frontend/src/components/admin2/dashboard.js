import React, { useState, useEffect } from "react";
// 1. Import useSearchParams to read URL query parameters
import { useSearchParams } from "react-router-dom"; 
import coffeeImage from "../../assets/coffee.jpg";
import "../admin2/dashboard.css";
import { FaSignOutAlt, FaUndo } from "react-icons/fa";
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
  faCheckCircle,
  faCog,
  faClipboardCheck
} from '@fortawesome/free-solid-svg-icons';
import { FaChevronDown, FaBell } from "react-icons/fa";

library.add(faMoneyBillWave, faChartLine, faShoppingCart, faClock, faArrowTrendUp, faArrowTrendDown, faCheckCircle, faCog, faClipboardCheck);

// --- Static data remains the same ---
const revenueData = [ { name: 'Jan', income: 5000, expense: 3000 }, { name: 'Feb', income: 14000, expense: 10000 }, { name: 'Mar', income: 15000, expense: 12000 }, { name: 'Apr', income: 11000, expense: 9000 }, { name: 'May', income: 13000, expense: 7000 }, { name: 'June', income: 18000, expense: 10000 }, { name: 'July', income: 18000, expense: 13000 }, ];
const salesData = [ { name: 'Mon', sales: 60 }, { name: 'Tue', sales: 95 }, { name: 'Wed', sales: 70 }, { name: 'Thu', sales: 25 }, { name: 'Fri', sales: 60 }, { name: 'Sat', sales: 68 }, { name: 'Sun', sales: 63 }, ];
const currentDate = new Date().toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", });
const userRole = "Admin";
const initialData = [ { title: "Today's Sales", current: 0, previous: 0, format: "currency", icon: faMoneyBillWave, type: "sales" }, { title: "Total Orders", current: 0, previous: 0, format: "number", icon: faChartLine, type: "revenue" }, { title: "Today's Orders", current: 0, previous: 0, format: "number", icon: faShoppingCart, type: "orders" }, { title: "Pending Orders", current: 0, previous: 0, format: "number", icon: faClock, type: "pendings" }, { title: "Delivered Orders", current: 0, previous: 0, format: "number", icon: faCheckCircle, type: "deliveredOrders" }, { title: "In Preparation", current: 0, previous: 0, format: "number", icon: faCog, type: "inPreparation" }, { title: "Confirmed Orders", current: 0, previous: 0, format: "number", icon: faClipboardCheck, type: "confirmedOrders" } ];
const formatValue = (value, format) => { return format === "currency" ? `₱${value.toLocaleString()}` : value.toLocaleString(); };

// Sample data for Recent Orders
const recentOrders = [
  { id: 'ORD001', customer: 'John Doe', date: '2023-10-01', status: 'Delivered', amount: 150 },
  { id: 'ORD002', customer: 'Jane Smith', date: '2023-10-02', status: 'Pending', amount: 200 },
  { id: 'ORD003', customer: 'Alice Johnson', date: '2023-10-03', status: 'In Preparation', amount: 120 },
  { id: 'ORD004', customer: 'Bob Brown', date: '2023-10-04', status: 'Confirmed', amount: 180 },
  { id: 'ORD005', customer: 'Charlie Wilson', date: '2023-10-05', status: 'Delivered', amount: 250 },
];

// Sample data for Popular Items
const popularItems = [
  { name: 'Americano', sold: 120, revenue: 2400 },
  { name: 'Latte', sold: 95, revenue: 2850 },
  { name: 'Cappuccino', sold: 80, revenue: 2400 },
  { name: 'Espresso', sold: 70, revenue: 1400 },
  { name: 'Mocha', sold: 60, revenue: 2100 },
];
// --- End of static data ---

const Dashboard = () => {
  // 2. Initialize useSearchParams to access the URL
  const [searchParams] = useSearchParams();

  // 3. Create state to hold the token and username from the URL
  const [authToken, setAuthToken] = useState(null);
  const [userName, setUserName] = useState("Loading...");

  const [revenueFilter, setRevenueFilter] = useState("Monthly");
  const [salesFilter, setSalesFilter] = useState("Monthly");
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    todaysOrders: 0,
  });

  // 4. This useEffect runs once to read the parameters from the URL
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
    if (!authToken) {
      return; 
    }

    fetch("http://localhost:7004/cart/admin/orders/total", {
      headers: {
        // Use the token from the state
        Authorization: `Bearer ${authToken}`,
      },
    })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      console.log("Fetched total orders:", data);
      const totalOrders = data.total_orders;
      setDashboardData((prev) => ({
        ...prev,
        totalOrders: totalOrders,
      }));
    })
    .catch((err) =>
      console.error("Failed to fetch total orders:", err)
    );
  }, [authToken]); // This effect depends on authToken. It will run when authToken is set.

  useEffect(() => {
    if (!authToken) {
      return;
    }

    fetch("http://localhost:7004/cart/admin/orders/pending", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((orders) => {
        const pendingCount = orders.filter(order => order.order_status === "Pending").length;
        setDashboardData(prev => ({
          ...prev,
          pendingOrders: pendingCount,
        }));
      })
      .catch((err) => console.error("Failed to fetch pending orders:", err));
  }, [authToken]);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    fetch("http://localhost:7004/cart/admin/orders/today_count", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setDashboardData(prev => ({
          ...prev,
          todaysOrders: data.todays_orders,
        }));
      })
      .catch((err) => console.error("Failed to fetch today's orders:", err));
  }, [authToken]);

  const toggleDropdown = () => {
    setDropdownOpen(!isDropdownOpen);
  };

  const data = initialData.map((card) => {
    if (card.title === "Total Orders") {
      return {
        ...card,
        current: dashboardData.totalOrders,
      };
    }
    if (card.title === "Pending Orders") {
      return {
        ...card,
        current: dashboardData.pendingOrders,
      };
    }
    if (card.title === "Today's Orders") {
      return {
        ...card,
        current: dashboardData.todaysOrders,
      };
    }
    return card;
  });

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
              <div className="profile-pic" />
              <div className="profile-info">
                <div className="profile-role">Hi! I'm {userRole}</div>
                {/* 6. Display the username read from the URL */}
                <div className="profile-name">{userName}</div>
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
                      onClick={() => {
                        // 7. Logout now simply redirects, as there's no localStorage to clear.
                        window.location.href = "http://localhost:4002/"; 
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

        {/* ... The rest of your component's JSX remains exactly the same ... */}
        
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

          <div className="dashboard-charts">
            <div className="chart-box">
              <div className="chart-header">
                <span>Total Orders</span>
                <select className="chart-dropdown" value={revenueFilter} onChange={(e) => setRevenueFilter(e.target.value)}>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={revenueData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="income" stroke="#00b4d8" /><Line type="monotone" dataKey="expense" stroke="#ff4d6d" /></LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-box">
              <div className="chart-header">
                <span>Sales</span>
                <select className="chart-dropdown" value={salesFilter} onChange={(e) => setSalesFilter(e.target.value)}>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={salesData}><defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00b4d8" stopOpacity={0.8} /><stop offset="95%" stopColor="#00b4d8" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="name" /><YAxis /><CartesianGrid strokeDasharray="3 3" /><Tooltip /><Area type="monotone" dataKey="sales" stroke="#00b4d8" fillOpacity={1} fill="url(#colorSales)" /></AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="dashboard-extra-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div className="chart-box" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', padding: '20px' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '5px' }}>Recent Orders</div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Latest orders from customers</div>
              <div style={{ width: '100%', maxHeight: '200px', overflowY: 'auto', marginBottom: '10px' }}>
                {recentOrders.map((order, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', flex: 1, textAlign: 'left' }}>{order.id}</div>
                    <div style={{ fontSize: '12px', color: '#666', flex: 1, textAlign: 'center' }}>{order.customer}</div>
                    <div style={{ fontSize: '12px', color: '#666', flex: 1, textAlign: 'center' }}>{order.date}</div>
                    <div style={{ fontSize: '12px', color: order.status === 'Delivered' ? 'green' : order.status === 'Pending' ? 'orange' : 'blue', flex: 1, textAlign: 'center' }}>{order.status}</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', flex: 1, textAlign: 'right' }}>₱{order.amount}</div>
                  </div>
                ))}
              </div>
              <button style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>View More</button>
            </div>
            <div className="chart-box" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', padding: '20px' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '5px' }}>Popular Items</div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Best selling menu items</div>
              <div style={{ width: '100%', maxHeight: '200px', overflowY: 'auto', marginBottom: '10px' }}>
                {popularItems.map((item, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', flex: 1 }}>{item.name}</div>
                    <div style={{ fontSize: '12px', color: '#666', flex: 1, textAlign: 'center' }}>{item.sold}</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', flex: 1, textAlign: 'right' }}>₱{item.revenue.toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <button style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>View More</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;