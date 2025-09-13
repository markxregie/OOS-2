import React, { useState, useEffect } from 'react';
import { Table, Form, Modal, Button } from 'react-bootstrap';
import { EyeFill, XCircle } from 'react-bootstrap-icons';
import './OrderHistory.css'; 

const OrderHistory = () => {
  const [activeTab, setActiveTab] = useState('active'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [ordersData, setOrdersData] = useState({
    active: [], 
    completed: [],
    cancelled: [],
  });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [orderToView, setOrderToView] = useState(null);

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
          const total = order.products.reduce((sum, p) => sum + p.price * p.quantity, 0);
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

  const handleCancelClick = (order) => {
    setOrderToCancel(order);
    setShowCancelModal(true);
  };
  
  const handleConfirmCancel = async () => {
    if (!orderToCancel || !token) return;

    try {
      const response = await fetch(`http://localhost:7004/cart/admin/orders/${orderToCancel.id}/status`, {
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
        const newActive = prevData.active.filter((o) => o.id !== orderToCancel.id);
        const newCancelled = [...prevData.cancelled, { ...orderToCancel, status: 'cancelled' }];
        return { ...prevData, active: newActive, cancelled: newCancelled };
      });

    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('There was an error cancelling the order. Please try again.');
    } finally {
      setShowCancelModal(false);
      setOrderToCancel(null);
    }
  };

  const handleCloseModal = () => {
    setShowCancelModal(false);
    setOrderToCancel(null);
  };

  const renderTable = (orders) => {
    if (orders.length === 0) {
      return <div className="orderhistory-no-orders">No orders found</div>;
    }

    return (
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
          {filteredOrders(orders).map((order) => (
            <tr key={order.id}>
              <td>#{order.id}</td>
              <td>{order.orderType}</td>
              <td>
                {order.products.map(p => `${p.name} (x${p.quantity})`).join(', ')}
              </td>
              <td>₱{order.total.toFixed(2)}</td>
              <td>{new Date(order.date).toLocaleDateString()}</td>
              <td>{getStatusBadge(order.status)}</td>
              <td>
                <button className="action-btn view" title="View Invoice" onClick={() => {
                  setOrderToView(order);
                  setShowInvoiceModal(true);
                }}>
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
    );
  };

  return (
    <div className="ordertable-container">
      <div className="table-header">
        <h5 style={{ color: '#4a9ba5' }}>Order History</h5>
        <Form.Control
          type="text"
          placeholder="Search..."
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

      <Modal show={showCancelModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Cancel Order</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to cancel order #{orderToCancel ? orderToCancel.id : ''}? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            No
          </Button>
          <Button variant="danger" onClick={handleConfirmCancel}>
            Yes, Cancel Order
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showInvoiceModal} onHide={() => setShowInvoiceModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Invoice for Order #{orderToView ? orderToView.id : ''}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {orderToView ? (
            <div>
              <p><strong>Date:</strong> {new Date(orderToView.date).toLocaleString()}</p>
              <p><strong>Order Type:</strong> {orderToView.orderType}</p>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Price (₱)</th>
                    <th>Subtotal (₱)</th>
                  </tr>
                </thead>
                <tbody>
                  {orderToView.products.map((product, index) => (
                    <tr key={`${product.id}-${index}`}>
                      <td>{product.name}</td>
                      <td>{product.quantity}</td>
                      <td>{product.price.toFixed(2)}</td>
                      <td>{(product.price * product.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <h5 className="text-end">Total: ₱{orderToView.total.toFixed(2)}</h5>
            </div>
          ) : (
            <p>No order selected.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInvoiceModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default OrderHistory;