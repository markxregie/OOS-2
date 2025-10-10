import React, { useState, useEffect } from 'react';
import { Table, Form, Button } from 'react-bootstrap';
import { EyeFill, XCircle } from 'react-bootstrap-icons';
import Swal from 'sweetalert2';
import './OrderHistory.css';

// Define the breakpoint for switching to the mobile/card view
const MOBILE_BREAKPOINT = 992; 

const OrderHistory = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [ordersData, setOrdersData] = useState({
    active: [],
    completed: [],
    cancelled: [],
  });
  // Use the new breakpoint for mobile detection
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(window.innerWidth <= MOBILE_BREAKPOINT); 

  // Function to update the isMobileOrTablet state on resize
  const handleResize = () => {
    setIsMobileOrTablet(window.innerWidth <= MOBILE_BREAKPOINT);
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const token = localStorage.getItem('authToken');

  useEffect(() => {
    const getUsernameFromToken = (jwtToken) => {
      if (!jwtToken) return null;
      try {
        const base64Url = jwtToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const { sub, username } = JSON.parse(jsonPayload);
        return sub || username || null;
      } catch (e) {
        console.error('Failed to parse token', e);
        return null;
      }
    };

    const username = getUsernameFromToken(token);

    const fetchOrders = async () => {
      if (!token || !username) return;

      try {
        const response = await fetch(`http://localhost:7004/cart/orders/history`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch orders: ${response.statusText}`);
        }

        const data = await response.json();

        const activeOrders = [];
        const completedOrders = [];
        const cancelledOrders = [];

        data.forEach(order => {
          const total = order.products.reduce((sum, p) => {
            const addonSum = p.addons ? p.addons.reduce((s, a) => s + (a.price || a.Price || 0), 0) : 0;
            return sum + (p.price + addonSum) * p.quantity;
          }, 0) + (order.orderType === 'Delivery' ? 50 : 0);
          const orderData = {
            id: order.id,
            orderType: order.orderType,
            products: order.products,
            status: order.status.toLowerCase(),
            date: order.date,
            total,
          };

          const status = order.status.toLowerCase();
          if (status === 'completed') {
            completedOrders.push(orderData);
          } else if (status === 'cancelled') {
            cancelledOrders.push(orderData);
          } else {
            // Group all other statuses (pending, preparing, delivering, etc.) as active
            activeOrders.push(orderData);
          }
        });

        setOrdersData({
          active: activeOrders,
          completed: completedOrders,
          cancelled: cancelledOrders,
        });

      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 5000); // Refresh orders every 5 seconds
    return () => clearInterval(interval);

  }, [token]);

  const filteredOrders = (orders) => {
    return orders.filter(
      (order) =>
        order.id.toString().includes(searchTerm) ||
        order.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getStatusBadge = (status) => {
    const capitalizedStatus = status.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    let className = "status-badge";
    if (status === 'pending') className += " status-pending";
    else if (status === 'preparing') className += " status-preparing";
    else if (status === 'waiting for pick up') className += " status-waiting";
    else if (status === 'delivering') className += " status-delivering";
    else if (status === 'completed') className += " status-completed";
    else if (status === 'cancelled') className += " status-cancelled";
    return <span className={className}>{capitalizedStatus}</span>;
  };

  const handleShowInvoice = (order) => {
    const invoiceHtml = `
      <div>
        <p><strong>Date:</strong> ${new Date(order.date).toLocaleString()}</p>
        <p><strong>Order Type:</strong> ${order.orderType}</p>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="border: 1px solid #ddd; padding: 8px;">Product</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Quantity</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Price (₱)</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Subtotal (₱)</th>
            </tr>
          </thead>
          <tbody>
            ${order.products.map(p => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">
                  ${p.name}
                  ${p.addons && p.addons.length > 0 ? `
                    <ul style="margin:0; padding-left:15px; font-size:0.85em; color:#666;">
                      ${p.addons.map(ao => `<li>+ ${ao.addon_name || ao.AddOnName || ao.name} (₱${(ao.price || ao.Price || 0).toFixed(2)})</li>`).join('')}
                    </ul>
                  ` : ""}
                </td>
                <td style="border: 1px solid #ddd; padding: 8px;">${p.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${p.price.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">
                  ${((p.price + (p.addons ? p.addons.reduce((s, ao) => s + (ao.price || ao.Price || 0), 0) : 0)) * p.quantity).toFixed(2)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <h5 style="text-align: right; margin-top: 10px;">Total: ₱${order.total.toFixed(2)}</h5>
      </div>
    `;
    Swal.fire({
      title: `Invoice for Order #${order.id}`,
      html: invoiceHtml,
      showConfirmButton: true,
      confirmButtonText: 'Close',
      width: '90%', 
    });
  };

  const handleCancelClick = async (order) => {
    const result = await Swal.fire({
      title: 'Confirm Cancel Order',
      text: `Are you sure you want to cancel order #${order.id}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Cancel Order',
      cancelButtonText: 'No',
    });

    if (result.isConfirmed) {
      await handleConfirmCancel(order);
    }
  };

  const handleConfirmCancel = async (order) => {
    if (!order || !token) return;

    try {
      const response = await fetch(`http://localhost:7004/cart/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ new_status: 'CANCELLED' }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel the order.');
      }

      // Refresh data locally for immediate UI update
      setOrdersData((prevData) => {
        const newActive = prevData.active.filter((o) => o.id !== order.id);
        const newCancelled = [...prevData.cancelled, { ...order, status: 'cancelled' }];
        return { ...prevData, active: newActive, cancelled: newCancelled };
      });

      Swal.fire('Success', 'Order cancelled successfully!', 'success');

    } catch (error) {
      console.error('Error cancelling order:', error);
      Swal.fire('Error', 'There was an error cancelling the order. Please try again.', 'error');
    }
  };

  const renderProductDetails = (products) => (
    <ul style={{ margin: 0, paddingLeft: '15px', fontSize: '0.9em', listStyle: 'none' }}>
      {products.map((p, idx) => (
        <li key={idx} style={{ marginBottom: '5px', fontWeight: 'bold' }}>
          {p.name} (x{p.quantity})
          {p.addons && p.addons.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: "15px", fontSize: "0.85em", color: "#666", fontWeight: 'normal' }}>
              {p.addons.map((addon, i) => (
                <li key={i}>+ {addon.addon_name || addon.AddOnName || addon.name} (₱{(addon.price || addon.Price || 0).toFixed(2)})</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );

  const renderMobileOrderCard = (order) => (
    <div className="order-card" key={order.id}>
      <div className="card-header">
        <span style={{ fontWeight: 'bold' }}>Order #{order.id}</span>
        {getStatusBadge(order.status)}
      </div>
      <div className="card-body">
        <p><strong>Type:</strong> {order.orderType}</p>
        <p><strong>Date:</strong> {new Date(order.date).toLocaleDateString()}</p>
        <p>
          <strong>Products:</strong>
          {renderProductDetails(order.products)}
        </p>
        <p className="card-total"><strong>Total:</strong> ₱{order.total.toFixed(2)}</p>
      </div>
      <div className="card-actions">
        <button className="action-btn view" title="View Invoice" onClick={() => handleShowInvoice(order)}>
          <EyeFill /> View
        </button>
        {order.status === 'pending' && (
          <button
            className="action-btn cancel"
            title="Cancel Order"
            onClick={() => handleCancelClick(order)}
          >
            <XCircle /> Cancel
          </button>
        )}
      </div>
    </div>
  );

  const renderTable = (orders) => {
    const ordersToRender = filteredOrders(orders);

    if (ordersToRender.length === 0) {
      return <div className="orderhistory-no-orders">No orders found</div>;
    }

    // Render mobile/tablet card list if isMobileOrTablet is true
    if (isMobileOrTablet) {
      return (
        <div className="orders-mobile-list">
          {ordersToRender.map(renderMobileOrderCard)}
        </div>
      );
    } else {
      // Desktop View: Render a full table
      return (
        <div className="table-responsive">
          <Table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Order Type</th>
                <th>Products</th>
                <th>Total</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ordersToRender.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{order.orderType}</td>
                  <td>
                    {order.products.map((p, idx) => (
                      <div key={idx}>
                        {p.name} (x{p.quantity})
                        {p.addons && p.addons.length > 0 && (
                          <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.85em", color: "#666" }}>
                            {p.addons.map((addon, i) => (
                              <li key={i}>+ {addon.addon_name || addon.AddOnName || addon.name} (₱{(addon.price || addon.Price || 0).toFixed(2)})</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </td>
                  <td>₱{order.total.toFixed(2)}</td>
                  <td>{new Date(order.date).toLocaleDateString()}</td>
                  <td>{getStatusBadge(order.status)}</td>
                  <td>
                    <button className="action-btn view" title="View Invoice" onClick={() => handleShowInvoice(order)}>
                      <EyeFill />
                    </button>
                    {order.status === 'pending' && (
                      <button
                        className="action-btn cancel"
                        title="Cancel Order"
                        onClick={() => handleCancelClick(order)}
                      >
                        <XCircle />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      );
    }
  };

  return (
    <div className="ordertable-container">
      <div className="table-header">
        <h5 style={{ color: '#4a9ba5' }}>Order History</h5>
        <Form.Control
          type="text"
          placeholder="Search Order ID or Status..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <ul className="orderhistory-tabs nav nav-tabs">
        <li className="nav-item">
          <button
            className={`orderhistory-tab nav-link ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
            style={activeTab === 'active' ? { backgroundColor: '#4B929D', color: 'white' } : { color: 'black' }}
          >
            Active Orders
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`orderhistory-tab nav-link ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
            style={activeTab === 'completed' ? { backgroundColor: '#4B929D', color: 'white' } : { color: 'black' }}
          >
            Completed
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`orderhistory-tab nav-link ${activeTab === 'cancelled' ? 'active' : ''}`}
            onClick={() => setActiveTab('cancelled')}
            style={activeTab === 'cancelled' ? { backgroundColor: '#4B929D', color: 'white' } : { color: 'black' }}
          >
            Cancelled
          </button>
        </li>
      </ul>

      <div className="orderhistory-tab-content tab-content p-3 border border-top-0 rounded-bottom">
        {activeTab === 'active' && renderTable(ordersData.active)}
        {activeTab === 'completed' && renderTable(ordersData.completed)}
        {activeTab === 'cancelled' && renderTable(ordersData.cancelled)}
      </div>
    </div>
  );
};

export default OrderHistory;