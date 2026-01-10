import React, { useState, useEffect } from 'react';
import { Form, Button } from 'react-bootstrap';
import { EyeFill, XCircle, CameraFill } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

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

      // --- 1. Fetch all product/merchandise data to get images ---
      const [productsRes, merchRes] = await Promise.all([
        fetch(`http://localhost:8001/is_products/public/products/`),
        fetch(`http://localhost:8002/merchandise/public/menu`)
      ]);

      const productsList = productsRes.ok ? await productsRes.json() : [];
      const merchList = merchRes.ok ? await merchRes.json() : [];

      const imageMap = new Map();
      productsList.forEach(p => imageMap.set(p.ProductName, { image: p.ProductImage, type: p.ProductTypeName }));
      merchList.forEach(m => imageMap.set(m.MerchandiseName, { image: m.MerchandiseImage, type: 'Merchandise' }));

      // --- 2. Fetch order history ---

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
          const deliveryFee = order.deliveryFee;
          const discount = order.discount || 0;
          const total = order.totalAmount !== undefined ? order.totalAmount : (
            order.products.reduce((sum, p) => {
              const addonSum = p.addons ? p.addons.reduce((s, a) => s + (a.price || a.Price || 0), 0) : 0;
              return sum + (p.price + addonSum) * p.quantity;
            }, 0) + deliveryFee - discount
          );

          // --- 3. Map images to products in the order ---
          const productsWithImages = order.products.map(p => ({
            ...p,
            ...imageMap.get(p.name) // Gets { image, type }
          }));
          const originalStatus = order.status.toLowerCase();
          const isCompleted = originalStatus === 'delivered' || originalStatus === 'completed';
          let displayStatus = originalStatus;
          if (originalStatus === 'pickedup') displayStatus = 'picked up';
          const orderData = {
            id: order.id,
            orderType: order.orderType,
            products: productsWithImages, // Use products with image data
            status: isCompleted ? 'completed' : displayStatus,
            date: order.date,
            total,
            deliveryFee,
            discount,
            deliveryImage: order.deliveryImage || null, // Include delivery image
          };
          
          if (isCompleted) {
            completedOrders.push(orderData);
          } else if (originalStatus === 'cancelled') {
            cancelledOrders.push({ ...orderData, status: 'cancelled' });
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
    const capitalizedStatus = status.split(' ').map(word => word.toUpperCase()).join(' ');
    let className = "status-badge";
    if (status === 'pending') className += " status-pending";
    else if (status === 'preparing') className += " status-preparing";
    else if (status === 'waiting for pick up') className += " status-waiting";
    else if (status === 'picked up') className += " status-pickedup";
    else if (status === 'delivering') className += " status-delivering";
    else if (status === 'completed') className += " status-completed";
    else if (status === 'cancelled') className += " status-cancelled";
    return <span className={className}>{capitalizedStatus}</span>;
  };

  const handleShowInvoice = (order) => {
    const subtotal = order.products.reduce((sum, p) => {
      const addonSum = p.addons ? p.addons.reduce((s, a) => s + (a.price || a.Price || 0), 0) : 0;
      return sum + (p.price + addonSum) * p.quantity;
    }, 0);
    const deliveryFee = order.deliveryFee;
    const discount = order.discount || 0;

    const invoiceHtml = `
      <div class="receipt-container" style="font-family: 'Courier New', Courier, monospace; text-align: left; max-width: 450px; margin: auto; font-size: 1.05em;">
        <div class="receipt-header" style="text-align: center; margin-bottom: 20px;">
          <h4 style="margin: 0; font-weight: bold; ">Bleu Bean Cafe</h4>
          <p style="margin: 5px 0; color: #333;">#213 Don Fabian St., Quezon City</p>
          <p style="margin: 5px 0; color: #333;">Order #${order.id}</p>
          <p style="margin: 5px 0; font-size: 0.9em; color: #333;">${new Date(order.date).toLocaleString()}</p>
        </div>        ${order.deliveryImage ? `
        <div style="text-align: center; margin-bottom: 20px; padding: 15px; background-color: #e7f3ff; border-radius: 8px; border: 2px solid #4b929d;">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #2c3e50; font-size: 0.95em;">📸 PROOF OF DELIVERY</p>
          <img src="http://localhost:7004${order.deliveryImage}" alt="Delivery Proof" style="max-width: 100%; max-height: 200px; border-radius: 8px; cursor: pointer; border: 2px solid #4b929d;" onclick="window.open('http://localhost:7004${order.deliveryImage}', '_blank')"/>
          <p style="margin: 8px 0 0 0; font-size: 0.8em; color: #666;">Click image to view full size</p>
        </div>
        ` : ''}        <div class="receipt-body">
          <div class="receipt-items-header" style="display: flex; justify-content: space-between; font-weight: bold; border-bottom: 1px dashed #999; padding-bottom: 5px; margin-bottom: 10px;">
            <span>ITEM</span>
            <span>TOTAL</span>
          </div>
        ${order.products.map(p => {
          const addonsTotal = p.addons ? p.addons.reduce((s, a) => s + (a.price || a.Price || 0), 0) : 0;
          const itemTotal = (p.price + addonsTotal) * p.quantity;
          const hasPromo = p.applied_promo || p.promo_name || p.discount > 0;
          const promoName = p.applied_promo?.promotionName || p.promo_name || 'Promo Applied';
          const promoDiscount = p.discount || 0;
          
          return `
            <div class="receipt-item" style="margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="font-weight: bold;">${p.quantity}x ${p.name}</span>
                <span>₱${itemTotal.toFixed(2)}</span>
              </div>
              <div style="padding-left: 15px; font-size: 0.9em; color: #555;">
                <span> ₱${p.price.toFixed(2)} each</span>
              </div>
              ${p.addons && p.addons.length > 0 ? `
                <div class="receipt-addons" style="padding-left: 15px; font-size: 0.85em; color: #666;">
                  ${p.addons.map(ao => `
                    <div style="display: flex; justify-content: space-between; padding-left: 10px;"><span>+ ${ao.addon_name || ao.AddOnName || ao.name}</span><span>₱${(ao.price || ao.Price || 0).toFixed(2)}</span></div>
                  `).join('')}
                </div>
              ` : ""}
              ${hasPromo ? `
                <div style="padding-left: 15px; font-size: 0.85em; color: #28a745; font-style: italic; margin-top: 3px;">
                  <span>🎉 ${promoName} - ₱${promoDiscount.toFixed(2)} OFF</span>
              ` : ""}
            </div>
          `;
        }).join('')}
        </div>
        <div class="receipt-footer" style="margin-top: 20px; padding-top: 10px; border-top: 1px dashed #999;">
          <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span> <span>₱${subtotal.toFixed(2)}</span></div>
          ${deliveryFee > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Delivery Fee:</span> <span>₱${deliveryFee.toFixed(2)}</span></div>` : ''}
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1em; margin-top: 10px; border-top: 2px solid #333; padding-top: 5px;">
            <span>TOTAL:</span>
            <span>₱${order.total.toFixed(2)}</span>
          </div>
        </div>
        <div class="receipt-thank-you" style="text-align: center; margin-top: 30px; font-size: 0.9em;">
          <p>Thank you for your order!</p>
        </div>
      </div>
    `;
    Swal.fire({
      title: ``,
      html: invoiceHtml,
      showConfirmButton: true,
      confirmButtonText: 'Close',
      width: '500px',
      customClass: { popup: 'receipt-modal' }
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
    <ul style={{ margin: 0, paddingLeft: '15px', fontSize: '1.1em', listStyle: 'none' }}>
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
    <div className="order-card" key={order.id} data-id={order.id}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 'bold' }}>Order #{order.id}</span>
          {order.deliveryImage && (
            <CameraFill color="#28a745" size={16} title="Proof of delivery available" />
          )}
        </div>
        {getStatusBadge(order.status)}
      </div>
      <div className="card-body" style={{ textAlign: 'left' }}>
        <div className="order-card-detail"><strong>Type:</strong> {order.orderType}</div>
        <div className="order-card-detail" style={{ fontSize: '1.1em' }}><strong>Date:</strong> {new Date(order.date).toLocaleDateString()}</div>
        <div className="order-card-detail">
          <strong className="d-block mb-1">Products:</strong>
          {renderProductDetails(order.products)}
        </div>
        <div className="card-total"><strong>Total:</strong> ₱{order.total.toFixed(2)}</div>
      </div>
      <div className="card-actions">
        <button className="action-btn view" title="View Invoice" onClick={() => handleShowInvoice(order)}>
          <EyeFill /> <span className="action-text">View</span>
        </button>
        {order.status === 'pending' && (
          <button
            className="action-btn cancel"
            title="Cancel Order"
            onClick={() => handleCancelClick(order)}
          >
            <XCircle /> <span className="action-text">Cancel</span>
          </button>
        )}
      </div>
    </div>
  );

  const renderDesktopOrderCard = (order) => (
    <div className="order-card-desktop" key={order.id} onClick={() => handleRowClick(order)}>
      <div className="card-header-desktop">
        <div className="order-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="order-id">Order #{order.id}</span>
            {order.deliveryImage && (
              <CameraFill color="#28a745" size={16} title="Proof of delivery available" />
            )}
          </div>
          <span className="order-type">{order.orderType}</span>
        </div>
        {getStatusBadge(order.status)}
      </div>
      <div className="card-body-desktop">
        <div className="order-image-section">
          {order.products.length > 0 && order.products[0].image && (
            <div className="order-image-container">
              <img
                src={order.products[0].image.startsWith('http') ? order.products[0].image : `http://localhost:8001${order.products[0].image}`}
                alt={order.products[0].name}
                className="order-item-image"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}  
        </div>
        <div className="order-details">
          <div className="detail-item">
            <strong style={{ fontSize: '1.1em' }}>Date:</strong> <span style={{ fontSize: '1.1em' }}>{new Date(order.date).toLocaleDateString()}</span>
          </div>
          <div className="detail-item">
            <strong style={{ fontSize: '1.1em' }}>Products:</strong>
            {renderProductDetails(order.products)}
          </div>
        </div>
        <div className="order-total">
          <strong>Total: ₱{order.total.toFixed(2)}</strong>
        </div>
      </div>
      <div className="card-actions-desktop">
        <button className="action-btn view" title="View Invoice" onClick={(e) => {
          e.stopPropagation();
          handleShowInvoice(order);
        }}> 
          <EyeFill /> View Invoice
        </button>
        {order.status === 'pending' && (
          <button
            className="action-btn cancel"
            title="Cancel Order"
            onClick={(e) => {
              e.stopPropagation();
              handleCancelClick(order);
            }}
          >
            <XCircle /> Cancel
          </button>
        )}
      </div>
    </div>
  );

  const handleRowClick = (order) => {
    navigate(`/profile/orderhistory/${order.id}`);
  };

  const renderTable = (orders) => {
    const ordersToRender = filteredOrders(orders);

    if (ordersToRender.length === 0) {
      return <div className="orderhistory-no-orders">No orders found</div>;
    }

    // Render mobile/tablet card list if isMobileOrTablet is true
    if (isMobileOrTablet) {
      return (
        <div className="orders-mobile-list" onClick={(e) => e.target.closest('.order-card') && handleRowClick(ordersToRender.find(o => o.id.toString() === e.target.closest('.order-card').dataset.id))}>
          {ordersToRender.map(renderMobileOrderCard)}
        </div>
      );
    } else {
      // Desktop View: Render card list instead of table
      return (
        <div className="orders-desktop-list">
          {ordersToRender.map(renderDesktopOrderCard)}
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