import React, { useState, useEffect, useContext } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';

import './menu.css';
import { CartContext } from '../contexts/CartContext';

const MenuContent = () => {
  const [products, setProducts] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('Drinks');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');

  const { addToCart: addToContextCart } = useContext(CartContext);
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('authorization');
    const username = urlParams.get('username');

    if (token && username) {
      localStorage.setItem('authToken', token);
      localStorage.setItem('username', username);
    }
  }, []);

  useEffect(() => {
    const API_BASE_URL = "http://127.0.0.1:8001";

    const fetchAllData = async () => {
      const token = localStorage.getItem("authToken");

      try {
        if (token) {
          const headers = { Authorization: `Bearer ${token}` };

          const [typesResponse, productsResponse, productsDetailsResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/ProductType/`, { headers }),
            fetch(`${API_BASE_URL}/is_products/products/`, { headers }),
            fetch(`${API_BASE_URL}/is_products/products/details/`, { headers }),
          ]);

          if (!typesResponse.ok || !productsResponse.ok || !productsDetailsResponse.ok) {
            throw new Error("Failed to fetch all necessary data.");
          }

          const apiTypes = await typesResponse.json();
          const apiProducts = await productsResponse.json();
          const apiProductsDetails = await productsDetailsResponse.json();

          const productStatusMap = apiProductsDetails.reduce((acc, detail) => {
            acc[detail.ProductName] = detail.Status;
            return acc;
          }, {});

          const transformedProducts = apiProducts.map((product) => ({
            ...product,
            Status: productStatusMap[product.ProductName] || "Available",
          }));

          const grouped = {};
          apiTypes.forEach((type) => {
            grouped[type.productTypeName] = {};
          });

          transformedProducts.forEach((product) => {
            const typeName = product.ProductTypeName || "Other";
            const category = product.ProductCategory || "Other";
            if (!grouped[typeName]) grouped[typeName] = {};
            if (!grouped[typeName][category]) grouped[typeName][category] = [];
            grouped[typeName][category].push(product);
          });

          setProducts(grouped);

          if (grouped["Drinks"]) {
            const firstSubcat = Object.keys(grouped["Drinks"])[0];
            setSelectedSubcategory(firstSubcat || "");
          } else {
            setSelectedSubcategory("");
          }
        } else {
          const publicResponse = await fetch(`${API_BASE_URL}/is_products/public/products/`);
          if (!publicResponse.ok) throw new Error("Failed to fetch public product data.");
          const publicProducts = await publicResponse.json();

          const grouped = {};
          publicProducts.forEach((product) => {
            const typeName = product.ProductTypeName || "Other";
            const category = product.ProductCategory || "Other";
            if (!grouped[typeName]) grouped[typeName] = {};
            if (!grouped[typeName][category]) grouped[typeName][category] = [];
            grouped[typeName][category].push({
              ...product,
              Status: "Available",
            });
          });

          setProducts(grouped);

          if (grouped["Drinks"]) {
            const firstSubcat = Object.keys(grouped["Drinks"])[0];
            setSelectedSubcategory(firstSubcat || "");
          } else {
            setSelectedSubcategory("");
          }
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        toast.error("Failed to load products");
      }
    };

    fetchAllData();
  }, []);

  const handleCategoryClick = (category, subcategory) => {
    setSelectedCategory(category);
    setSelectedSubcategory(subcategory);
    setSelectedItem(null);
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;

    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("You must be logged in to add to cart.");
      return;
    }
 // or whatever your cart state is called
    console.log("🛒 Item added to cart:", selectedItem);
    addToContextCart({
    product_id: selectedItem.ProductID,
    ProductName: selectedItem.ProductName,
    ProductPrice: selectedItem.ProductPrice ?? 0,
    ProductImage: selectedItem.ProductImage,
    ProductType: selectedItem.ProductTypeName,    // ✅ lowercase
    ProductCategory: selectedItem.ProductCategory, // ✅ lowercase
    orderType: "Pick Up" 
    });

    toast.success(`${selectedItem.ProductName} added to cart!`);
    handleClose();
    setOrderNotes('');
  };

  const handleBuyNow = () => {
    if (selectedItem) {
      navigate('/checkout', { state: { cartItems: [{ ...selectedItem, quantity: 1 }], orderType: "Pick Up" } });
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setSelectedItem(null);
    setOrderNotes('');
  };

  const subcategories = products[selectedCategory] ? Object.keys(products[selectedCategory]) : [];

  useEffect(() => {
    if (selectedCategory && products[selectedCategory]) {
      if (!selectedSubcategory || !subcategories.includes(selectedSubcategory)) {
        setSelectedSubcategory(subcategories[0] || '');
      }
    }
  }, [selectedCategory, products, selectedSubcategory, subcategories]);

  const currentItems = (products[selectedCategory] && products[selectedCategory][selectedSubcategory]) || [];

  return (
    <section className="menu-content-section">
      <div className="menu-wrapper">
        {/* Sidebar */}
        <aside className="menu-sidebar">
          <h2 className="menu-title">Menu</h2>
          <div className="menu-category">
            {Object.keys(products).map((productType) => (
              <div key={productType}>
                <h3>{productType}</h3>
                <ul>
                  {products[productType] &&
                    Object.keys(products[productType]).map((subcat) => (
                      <li
                        key={subcat}
                        onClick={() => handleCategoryClick(productType, subcat)}
                        className={selectedCategory === productType && selectedSubcategory === subcat ? 'active' : ''}
                      >
                        {subcat}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Side */}
        <div className="menu-items">
          <div className="search-container w-100">
            <div className="input-group" style={{ maxWidth: '500px' }}>
              <input type="text" className="form-control" placeholder="Search Our Coffee, Merch" />
              <button className="btn btn-primary" type="button">🔍</button>
            </div>
          </div>

          <nav aria-label="breadcrumb" className="mt-3 mb-4">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">Menu</li>
              {selectedCategory && <li className="breadcrumb-item">{selectedCategory}</li>}
              {selectedSubcategory && <li className="breadcrumb-item">{selectedSubcategory}</li>}
            </ol>
          </nav>

          <div className="items-grid">
            {currentItems.map((item) => {
              const isAvailable = item.Status === 'Available';
              return (
                <div
                  className={`item-card ${!isAvailable ? 'unavailable' : ''}`}
                  key={item.ProductID}
                  onClick={() => isAvailable && handleItemClick(item)}
                  style={{ cursor: isAvailable ? 'pointer' : 'not-allowed' }}
                >
                  <div className="item-image-placeholder">
                    {item.ProductImage ?
                      <img src={item.ProductImage.startsWith('http') ? item.ProductImage : `http://localhost:8001${item.ProductImage}`} alt={item.ProductName} />
                      : 'Image'
                    }
                  </div>
                  <div className="item-name-placeholder">{item.ProductName}</div>
                  {!isAvailable && (
                    <div className="unavailable-overlay">
                      <span>Unavailable</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal */}
        <Modal show={showModal} onHide={handleClose} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title>{selectedItem ? selectedItem.ProductName : ''}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedItem && (
              <div className="container">
                <div className="row">
                  <div className="col-md-6">
                    <div className="modal-image-placeholder">
                      <div className="d-flex align-items-center justify-content-center h-100 bg-light">
                        {selectedItem.ProductImage ? (
                          <img src={selectedItem.ProductImage.startsWith('http') ? selectedItem.ProductImage : `http://localhost:8001${selectedItem.ProductImage}`} alt={selectedItem.ProductName} style={{ width: '100%', height: 'auto', maxHeight: '400px', objectFit: 'contain' }} />
                        ) : (
                          <span className="text-muted">Item Image</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <h4 style={{ color: '#4b929d' }}>{selectedItem.ProductName}</h4>
                    <p className="text-muted">{selectedItem.ProductDescription}</p>
                    <p className="h5" style={{ textAlign: 'left' }}>₱{selectedItem.ProductPrice}</p>
                    {/* <div className="mt-4">
                      <h6>Order method:</h6>
                      <div className="btn-group w-100" role="group">
                        <input type="radio" className="btn-check" name="order-method" id="method-pickup" autoComplete="off" defaultChecked />
                        <label className="btn btn-outline-secondary" htmlFor="method-pickup">Pickup</label>
                        <input type="radio" className="btn-check" name="order-method" id="method-delivery" autoComplete="off" />
                        <label className="btn btn-outline-secondary" htmlFor="method-delivery">Delivery</label>
                      </div>
                    </div> */}
                    <div className="mt-3">
                      <label htmlFor="order-notes" className="form-label">Add Notes:</label>
                      <textarea id="order-notes" className="form-control" rows="3" placeholder="Add any special instructions or notes here" value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="justify-content-between">
            <Button variant="outline-secondary" onClick={handleClose}>Close</Button>
            <div>
              <Button variant="outline-primary" className="me-2" onClick={handleAddToCart}>Add to cart</Button>
              <Button variant="primary" onClick={handleBuyNow}>Buy Now</Button>
            </div>
          </Modal.Footer>
        </Modal>
        <ToastContainer position="top-center" autoClose={2000} hideProgressBar />
      </div>
    </section>
  );
};

export default MenuContent;