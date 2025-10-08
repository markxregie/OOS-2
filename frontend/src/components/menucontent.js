import React, { useState, useEffect, useContext } from 'react';
import { Button } from 'react-bootstrap'; // Keep Button for general use outside of modals
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2'; // 1. Import SweetAlert2

import './menu.css';
import { CartContext } from '../contexts/CartContext';

// Define API base URLs
const PRODUCTS_BASE_URL = "http://127.0.0.1:8001";
const MERCH_BASE_URL = "http://127.0.0.1:8002";


// Define category order
const CATEGORY_ORDER = ["Drinks", "Foods", "Merchandise", "Other"];

const MenuContent = () => {
  const [products, setProducts] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [orderNotes, setOrderNotes] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('Pick-up');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  // 1. New state for selected add-ons and total
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [addOnsTotal, setAddOnsTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');


  const { cartItems, addToCart: addToContextCart } = useContext(CartContext);
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
    const fetchAllData = async () => {
      toast.info("Loading menu, please wait...", { autoClose: 1500 });
      const token = localStorage.getItem("authToken");

      try {
        if (token) {
          const headers = { Authorization: `Bearer ${token}` };

          const [typesResponse, productsResponse, productsDetailsResponse] = await Promise.all([
            fetch(`${PRODUCTS_BASE_URL}/ProductType/`, { headers }),
            fetch(`${PRODUCTS_BASE_URL}/is_products/products/`, { headers }),
            fetch(`${PRODUCTS_BASE_URL}/is_products/products/details/`, { headers }),
          ]);

          if (!typesResponse.ok || !productsResponse.ok || !productsDetailsResponse.ok) {
            throw new Error("Failed to fetch all necessary data.");
          }

          const apiTypes = await typesResponse.json();
          const apiProducts = await productsResponse.json();
          const apiProductsDetails = await productsDetailsResponse.json();

          // Fetch all add-ons in one request
          const allAddOnsResponse = await fetch(`${PRODUCTS_BASE_URL}/is_products/products/all_addons`, { headers });
          const allAddOnsMap = allAddOnsResponse.ok ? await allAddOnsResponse.json() : {};

          // Fetch merchandise after other API calls
          const merchandiseResponse = await fetch(`${MERCH_BASE_URL}/merchandise/menu`, { headers });
          let apiMerchandise = [];
          if (merchandiseResponse.ok) {
            apiMerchandise = await merchandiseResponse.json();
          }

          const productStatusMap = apiProductsDetails.reduce((acc, detail) => {
            acc[detail.ProductName] = detail.Status;
            return acc;
          }, {});

          // Filter products to only include those with ingredients (present in details)
          const filteredProducts = apiProducts.filter((product) =>
            productStatusMap.hasOwnProperty(product.ProductName)
          );

          const transformedProducts = filteredProducts.map((product) => {
            // const details = apiProductsDetails.find(d => d.ProductID === product.ProductID); // unused
            return {
              ...product,
              Status: productStatusMap[product.ProductName],
              AddOns: allAddOnsMap[product.ProductID] || []  // attach add-ons directly from map
            };
          });

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

          // Map merchandise fields to product format
          const mappedMerchandise = apiMerchandise.map((item) => ({
            ProductID: item.MerchandiseID,
            ProductName: item.MerchandiseName,
            ProductPrice: item.MerchandisePrice,
            ProductImage: item.MerchandiseImage,
            ProductTypeName: "Merchandise",
            ProductCategory: "All Items",
            Status: item.Status,
          }));

          // Add to grouped
          if (!grouped["Merchandise"]) grouped["Merchandise"] = {};
          grouped["Merchandise"]["All Items"] = mappedMerchandise;

          // Reorder categories
          const orderedGrouped = {};
          CATEGORY_ORDER.forEach(cat => {
            if (grouped[cat]) {
              orderedGrouped[cat] = grouped[cat];
            }
          });
          Object.keys(grouped).forEach(cat => {
            if (!CATEGORY_ORDER.includes(cat)) {
              orderedGrouped[cat] = grouped[cat];
            }
          });

          setProducts(orderedGrouped);
          console.log("Grouped products:", orderedGrouped);

          if (grouped["Drinks"]) {
            const firstSubcat = Object.keys(grouped["Drinks"])[0];
            setSelectedSubcategory(firstSubcat || "");
          } else {
            setSelectedSubcategory("");
          }
        } else {
          const publicResponse = await fetch(`${PRODUCTS_BASE_URL}/is_products/public/products/`);
          if (!publicResponse.ok) throw new Error("Failed to fetch public product data.");
          const publicProducts = await publicResponse.json();

          // Fetch all add-ons in one request for public
          const allAddOnsResponse = await fetch(`${PRODUCTS_BASE_URL}/is_products/public/products/all_addons`);
          const allAddOnsMap = allAddOnsResponse.ok ? await allAddOnsResponse.json() : {};

          // Fetch merchandise after other API calls
          const merchandiseResponse = await fetch(`${MERCH_BASE_URL}/merchandise/public/menu`);
          let apiMerchandise = [];
          if (merchandiseResponse.ok) {
            apiMerchandise = await merchandiseResponse.json();
          }

          const grouped = {};
          publicProducts.forEach((product) => {
            const typeName = product.ProductTypeName || "Other";
            const category = product.ProductCategory || "Other";
            if (!grouped[typeName]) grouped[typeName] = {};
            if (!grouped[typeName][category]) grouped[typeName][category] = [];
            grouped[typeName][category].push({
              ...product,
              Status: product.Status || "Available", // use backend Status, fallback to "Available"
              AddOns: allAddOnsMap[product.ProductID] || []  // attach add-ons directly from map
            });
          });

          // Map merchandise fields to product format
          const mappedMerchandise = apiMerchandise.map((item) => ({
            ProductID: item.MerchandiseID,
            ProductName: item.MerchandiseName,
            ProductPrice: item.MerchandisePrice,
            ProductImage: item.MerchandiseImage,
            ProductTypeName: "Merchandise",
            ProductCategory: "All Items",
            Status: item.Status,
          }));

          // Add to grouped
          if (!grouped["Merchandise"]) grouped["Merchandise"] = {};
          grouped["Merchandise"]["All Items"] = mappedMerchandise;

          // Reorder categories
          const orderedGrouped = {};
          CATEGORY_ORDER.forEach(cat => {
            if (grouped[cat]) {
              orderedGrouped[cat] = grouped[cat];
            }
          });
          Object.keys(grouped).forEach(cat => {
            if (!CATEGORY_ORDER.includes(cat)) {
              orderedGrouped[cat] = grouped[cat];
            }
          });

          setProducts(orderedGrouped);

          if (orderedGrouped["Drinks"]) {
            const firstSubcat = Object.keys(orderedGrouped["Drinks"])[0];
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
    // Reset add-ons and notes before showing the modal
    setSelectedAddOns([]);
    setAddOnsTotal(0);
    setOrderNotes('');
    showSweetAlertItemDetails(item);
  };

  const handleAddToCart = async (item, notes, addOns, addOnsTotal) => {
    if (!item) return;

    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("You must be logged in to add to cart.");
      return;
    }

    // Check if the item is available before adding to cart
    if (item.Status !== 'Available') {
      toast.error(`${item.ProductName} is currently unavailable.`);
      return;
    }

    // Normalize addOns for comparison
    const normalizedAddOns = (addOns || []).map(a => ({ addon_name: a.name, price: a.price })).sort((a, b) => a.addon_name.localeCompare(b.addon_name));

    // Find existing item in cart
    const existingItemIndex = cartItems.findIndex(ci => {
      const itemNormalizedAddOns = (ci.addons || []).sort((a, b) => a.addon_name.localeCompare(b.addon_name));
      return ci.product_id === item.ProductID && JSON.stringify(normalizedAddOns) === JSON.stringify(itemNormalizedAddOns) && (ci.orderNotes || '') === (notes || '');
    });

    let currentQty = 0;
    if (existingItemIndex !== -1) {
      currentQty = cartItems[existingItemIndex].quantity;
    }

    // Fetch max quantity
    try {
      const res = await fetch(`${PRODUCTS_BASE_URL}/is_products/products/${item.ProductID}/max-quantity`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const maxQty = data.maxQuantity;
        if (currentQty + 1 > maxQty) {
          toast.error(`Cannot add more. Max quantity is ${maxQty}.`);
          return;
        }
      } else {
        // If fetch fails, proceed (optional: could show warning)
        console.warn("Failed to fetch max quantity, proceeding without check.");
      }
    } catch (err) {
      console.error("Error fetching max quantity:", err);
      // Proceed without check
    }

    addToContextCart({
      product_id: item.ProductID,
      ProductName: item.ProductName,
      ProductPrice: item.ProductPrice,
      ProductImage: item.ProductImage,
      ProductType: item.ProductTypeName,
      ProductCategory: item.ProductCategory,
      orderType: "Pick Up",
      // Include notes and add-ons in the cart item
      orderNotes: notes,
      addons: addOns.map(a => ({ addon_name: a.name, price: a.price })), // Correct structure for cart context
    });

    const finalPrice = (item.ProductPrice ?? 0) + addOnsTotal;
    toast.success(`${item.ProductName} added to cart! Total: ₱${finalPrice.toFixed(2)}`);
    // Clear temporary states after adding to cart
    setOrderNotes('');
    setSelectedAddOns([]);
    setAddOnsTotal(0);
  };

  const showSweetAlertItemDetails = (item) => {
    if (!item) return;
    setSelectedItem(item);

    const imageUrl = item.ProductImage
      ? item.ProductImage.startsWith('http')
        ? item.ProductImage
        : `${item.ProductTypeName === "Merchandise" ? "http://127.0.0.1:8002" : "http://127.0.0.1:8001"}${item.ProductImage}`
      : 'URL_TO_DEFAULT_IMAGE_OR_BLANK';

    // HTML for add-ons section
    const addOnsHtml = (item.AddOns || []).map((addon, index) => `
      <div class="form-check d-flex justify-content-between align-items-center mb-1">
        <div>
          <input class="form-check-input addon-checkbox" type="checkbox"
            id="addon-${index}"
            value="${addon.AddOnName}"
            data-price="${addon.Price}"
            ${addon.Status !== 'Available' ? 'disabled' : ''}>
          <label class="form-check-label" for="addon-${index}">
            ${addon.AddOnName} ${addon.Status !== 'Available' ? `(${addon.Status})` : ''}
          </label>
        </div>
        <span class="text-muted small">₱${addon.Price.toFixed(2)}</span>
      </div>
    `).join('');


    Swal.fire({
      title: item.ProductName,
      html: `
        <div class="container-fluid" style="text-align: left; padding: 0;">
          <div class="row">
            <div class="col-md-6 mb-3">
              <div class="modal-image-placeholder">
                <img src="${imageUrl}" alt="${item.ProductName}" style="width: 100%; height: auto; max-height: 400px; object-fit: contain;">
              </div>
            </div>
            <div class="col-md-6">
              <h4 style="color: #4b929d;">${item.ProductName}</h4>
              <p class="text-muted">${item.ProductDescription || 'No description available.'}</p>
              <p class="h5" style="text-align: left;">Base Price: ₱${(item.ProductPrice ?? 0).toFixed(2)}</p>
              
              <div class="mt-3">
                <h5 class="mb-2">Add-ons</h5>
                <div class="addons-list" style="border: 1px solid #eee; padding: 10px; border-radius: 5px; max-height: 150px; overflow-y: auto;">
                    ${addOnsHtml || '<p class="text-muted small">No add-ons available.</p>'}
                </div>
              </div>

              <div class="mt-3">
                <label for="order-notes" class="form-label">Add Notes:</label>
                <textarea id="order-notes" class="form-control" rows="2" placeholder="You can request for less sugar here">${orderNotes}</textarea>
              </div>
              <h5 class="mt-3" style="text-align: left;">Total: <span id="final-price-display">₱${(item.ProductPrice ?? 0).toFixed(2)}</span></h5>
            </div>
          </div>
        </div>
      `,
      width: 800,
      showCloseButton: true,
      showCancelButton: false,
      showDenyButton: true,
      confirmButtonText: 'Add to cart',
      denyButtonText: 'Buy Now',
      cancelButtonText: 'Close',
      customClass: {
        confirmButton: 'btn btn-outline-primary me-2',
        denyButton: 'btn btn-primary',
        
        cancelButton: 'btn btn-outline-secondary ms-2',
        popup: 'custom-sweetalert-popup',
        htmlContainer: 'swal2-html-container-tight'
      },
      didOpen: () => {
        const checkboxes = Swal.getPopup().querySelectorAll('.addon-checkbox');
        const priceDisplay = document.getElementById('final-price-display');
        const basePrice = parseFloat(item.ProductPrice ?? 0);

        const updatePrice = () => {
          let currentAddOnsTotal = 0;
          checkboxes.forEach(cb => {
            if (cb.checked) {
              currentAddOnsTotal += parseFloat(cb.dataset.price);
            }
          });
          priceDisplay.textContent = `₱${(basePrice + currentAddOnsTotal).toFixed(2)}`;
          // Note: State update happens in preConfirm/preDeny
        };

        checkboxes.forEach(cb => cb.addEventListener('change', updatePrice));
        // Initial price display
        updatePrice();
      },
      buttonsStyling: false,
      preConfirm: () => {
        // Handle 'Add to cart'
        const notes = document.getElementById('order-notes').value;
        const addOns = [];
        let total = 0;
        Swal.getPopup().querySelectorAll('.addon-checkbox:checked').forEach(cb => {
          const price = parseFloat(cb.dataset.price);
          addOns.push({ name: cb.value, price: price });
          total += price;
        });
        setOrderNotes(notes);
        setSelectedAddOns(addOns);
        setAddOnsTotal(total);
        return { action: 'add-to-cart', notes, addOns, addOnsTotal: total };
      },
      preDeny: () => {
        // Handle 'Buy Now'
        const notes = document.getElementById('order-notes').value;
        const addOns = [];
        let total = 0;
        Swal.getPopup().querySelectorAll('.addon-checkbox:checked').forEach(cb => {
          const price = parseFloat(cb.dataset.price);
          addOns.push({ name: cb.value, price: price });
          total += price;
        });
        setOrderNotes(notes);
        setSelectedAddOns(addOns);
        setAddOnsTotal(total);
        return { action: 'buy-now', notes, addOns, addOnsTotal: total };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        handleAddToCart(item, result.value.notes, result.value.addOns, result.value.addOnsTotal);
      } else if (result.isDenied) {
        handleBuyNow(item, result.value.notes, result.value.addOns, result.value.addOnsTotal);
      }
      // Reset temporary states if the modal is closed without confirmation (cancel/close)
      if (result.isDismissed) {
        setOrderNotes('');
        setSelectedAddOns([]);
        setAddOnsTotal(0);
      }
    });
  };


  const handleBuyNow = (item, notes, addOns, addOnsTotal) => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("You must be logged in to buy now.");
      return;
    }
    showSweetAlertBuyNow(item, notes, addOns, addOnsTotal);
  };

  const showSweetAlertBuyNow = (item, notes, addOns, addOnsTotal) => {
    if (!item) return;

    // Use current state for delivery/payment methods as initial values
    Swal.fire({
      title: 'Complete your purchase',
      html: `
        <div style="text-align: left;">
          <h5 class="mb-2">Item: ${item.ProductName}</h5>
          <h5 class="mb-3">Total Payable: ₱${((item.ProductPrice ?? 0) + addOnsTotal).toFixed(2)}</h5>
          <div class="mb-3">
            <label class="form-label">Delivery Method</label>
            <div class="btn-group w-100" role="group">
              <input
                type="radio"
                class="btn-check"
                name="deliveryMethodSwal"
                id="pickupSwal"
                autocomplete="off"
                value="Pick-up"
                ${deliveryMethod === 'Pick-up' ? 'checked' : ''}
              />
              <label class="btn btn-outline-secondary rounded-start-pill" for="pickupSwal">Pick-up</label>

              <input
                type="radio"
                class="btn-check"
                name="deliveryMethodSwal"
                id="deliverySwal"
                autocomplete="off"
                value="Delivery"
                ${deliveryMethod === 'Delivery' ? 'checked' : ''}
              />
              <label class="btn btn-outline-secondary rounded-end-pill" for="deliverySwal">Delivery</label>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label">Payment Method</label>
            <div class="btn-group w-100" role="group">
              <input
                type="radio"
                class="btn-check"
                name="paymentMethodSwal"
                id="cashSwal"
                autocomplete="off"
                value="Cash"
                ${paymentMethod === 'Cash' ? 'checked' : ''}
              />
              <label class="btn btn-outline-secondary rounded-start-pill" for="cashSwal">Cash</label>

              <input
                type="radio"
                class="btn-check"
                name="paymentMethodSwal"
                id="gcashSwal"
                autocomplete="off"
                value="Gcash"
                ${paymentMethod === 'Gcash' ? 'checked' : ''}
              />
              <label class="btn btn-outline-secondary rounded-end-pill" for="gcashSwal">Gcash</label>
            </div>
          </div>
        </div>
      `,
      showCloseButton: true,
      showCancelButton: true,
      confirmButtonText: 'Confirm Buy Now',
      cancelButtonText: 'Cancel',
      focusConfirm: false,
      customClass: {
        confirmButton: 'btn btn-primary',
        cancelButton: 'btn btn-outline-secondary ms-2',
        popup: 'custom-sweetalert-popup',
      },
      buttonsStyling: false,
      preConfirm: () => {
        const selectedDelivery = document.querySelector('input[name="deliveryMethodSwal"]:checked').value;
        const selectedPayment = document.querySelector('input[name="paymentMethodSwal"]:checked').value;
        return { delivery: selectedDelivery, payment: selectedPayment };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        setDeliveryMethod(result.value.delivery);
        setPaymentMethod(result.value.payment);
        handleConfirmBuyNow(item, notes, addOns, addOnsTotal, result.value.delivery, result.value.payment);
      }
    });
  };

  // Updated handler to accept add-ons details
  const handleConfirmBuyNow = (item, notes, addOns, addOnsTotal, delivery, payment) => {
    if (item) {
      navigate('/checkout', {
        state: {
          cartItems: [{
            product_id: item.ProductID,
            ProductName: item.ProductName,
            ProductPrice: item.ProductPrice,
            ProductImage: item.ProductImage,
            ProductType: item.ProductTypeName,
            ProductCategory: item.ProductCategory,
            quantity: 1,
            orderNotes: notes,
            // FIX: Changed 'addOns' to 'addons' (lowercase) to match state structure
            addons: addOns.map(a => ({ addon_name: a.name, price: a.price })), // Ensure correct structure for checkout
            // -----------------------
          }],
          orderType: delivery,
          paymentMethod: payment,
          orderNotes: notes
        }
      });
      // Reset temporary states
      setOrderNotes('');
      setSelectedAddOns([]);
      setAddOnsTotal(0);
      setDeliveryMethod('Pick-up');
      setPaymentMethod('Cash');
    }
  };
  const subcategories = products[selectedCategory] ? Object.keys(products[selectedCategory]) : [];

  useEffect(() => {
    if (!selectedCategory && Object.keys(products).length > 0) {
      const firstCategory = Object.keys(products)[0];
      setSelectedCategory(firstCategory);
    }
  }, [products, selectedCategory]);

  useEffect(() => {
    if (selectedCategory && products[selectedCategory]) {
      if (!selectedSubcategory || !subcategories.includes(selectedSubcategory)) {
        setSelectedSubcategory(subcategories[0] || '');
      }
    }
  }, [selectedCategory, products, selectedSubcategory, subcategories]);

  const currentItems = (products[selectedCategory] && products[selectedCategory][selectedSubcategory]) || [];
  const filteredItems = currentItems.filter(item => item.ProductName.toLowerCase().includes(searchQuery.toLowerCase()));

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
              <input type="text" className="form-control" placeholder="Search Our Coffee, Merch" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
            {filteredItems.map((item) => {
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
                  <div className="item-price-placeholder">₱{item.ProductPrice?.toFixed(2)}</div>
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

        <ToastContainer position="top-center" autoClose={2000} hideProgressBar />
      </div>
    </section>
  );
};

export default MenuContent;