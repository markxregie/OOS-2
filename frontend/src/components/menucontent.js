import React, { useState, useEffect, useContext } from 'react';
import { Button } from 'react-bootstrap'; // Keep Button for general use outside of modals
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2'; // 1. Import SweetAlert2
import LocationVerifyModal from './LocationVerifyModal'; // Import LocationVerifyModal

import Lottie from "lottie-react";
import coffeeTime from "../assets/Coffee Time.json";
import './menu.css';
import { CartContext } from '../contexts/CartContext';
import { checkStoreStatus } from './storeUtils';

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
  const [paymentMethod, setPaymentMethod] = useState('E-Wallet');
  // 1. New state for selected add-ons and total
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [addOnsTotal, setAddOnsTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckingLocation, setIsCheckingLocation] = useState(false); // New state for modal visibility
  const [deliverySettings, setDeliverySettings] = useState({}); // New state for delivery settings
  const [isLoading, setIsLoading] = useState(true);
  const [promos, setPromos] = useState([]);
  const [isFromPromotionCategory, setIsFromPromotionCategory] = useState(false); // Track if item is from Promotion category

  // State to hold the item and its options temporarily for LocationVerifyModal
  const [itemForLocationCheck, setItemForLocationCheck] = useState(null);
  const [notesForLocationCheck, setNotesForLocationCheck] = useState('');
  const [addOnsForLocationCheck, setAddOnsForLocationCheck] = useState([]);
  const [isBogoForLocationCheck, setIsBogoForLocationCheck] = useState(false);
  const [bogoQuantityForLocationCheck, setBogoQuantityForLocationCheck] = useState(1);

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

  // Fetch promotions first
  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const res = await fetch("http://localhost:7004/debug/promos", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        console.log('✅ [AUTH] Fetched promos:', data.promos);
        setPromos(data.promos || []);
      } catch (err) {
        console.error("Failed to fetch promos", err);
      }
    };

    fetchPromos();
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
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

          // ✅ Fetch all add-ons in one request
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
            const details = apiProductsDetails.find(d => d.ProductID === product.ProductID);
            return {
              ...product,
              Status: productStatusMap[product.ProductName],
              AddOns: allAddOnsMap[product.ProductID] || []  // ✅ attach add-ons directly from map
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
            MerchandiseQuantity: item.MerchandiseQuantity,
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

          // After fetching promos, create Promotion category with BOGO items
          const finalGrouped = createPromotionCategory(orderedGrouped, promos);
          setProducts(finalGrouped);

          console.log("Grouped products:", finalGrouped);

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

          // ✅ Fetch all add-ons in one request for public
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
              Status: product.Status || "Available", // ✅ use backend Status, fallback to "Available"
              AddOns: allAddOnsMap[product.ProductID] || []  // ✅ attach add-ons directly from map
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
            MerchandiseQuantity: item.MerchandiseQuantity,
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

          // Create Promotion category with BOGO items
          const finalGrouped = createPromotionCategory(orderedGrouped, promos);
          setProducts(finalGrouped);

          if (finalGrouped["Drinks"]) {
            const firstSubcat = Object.keys(finalGrouped["Drinks"])[0];
            setSelectedSubcategory(firstSubcat || "");
          } else {
            setSelectedSubcategory("");
          }
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        toast.error("Failed to load products");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [promos]); // Re-run when promos are loaded

  // Fetch delivery settings, similar to cart.js
  useEffect(() => {
    const fetchDeliverySettings = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;
        const response = await fetch('http://localhost:7001/delivery/settings', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const settings = await response.json();
          setDeliverySettings(settings);
        } else {
          console.error('Failed to fetch delivery settings');
        }
      } catch (error) {
        console.error('Error fetching delivery settings:', error);
      }
    };
    fetchDeliverySettings();
  }, []);

  // Helper function to create Promotion category with BOGO items
  const createPromotionCategory = (orderedGrouped, promosData) => {
    console.log('createPromotionCategory called with promos:', promosData);
    const bogoPromos = promosData.filter(p => p.promotionType === 'bogo');
    console.log('BOGO promos found:', bogoPromos);
    if (bogoPromos.length === 0) {
      console.log('No BOGO promos, returning original grouped');
      return orderedGrouped;
    }
    
    const promotionItems = [];
    
    // Collect all products that match BOGO promotions
    Object.keys(orderedGrouped).forEach(categoryKey => {
      Object.keys(orderedGrouped[categoryKey]).forEach(subcatKey => {
        orderedGrouped[categoryKey][subcatKey].forEach(product => {
          const hasBogoPromo = bogoPromos.some(promo => {
            if (promo.applicationType === 'all_products') return true;
            if (promo.applicationType === 'specific_products' && promo.selectedProducts.includes(product.ProductName)) return true;
            if (promo.applicationType === 'specific_categories' && promo.selectedCategories.includes(product.ProductCategory)) return true;
            return false;
          });
          
          if (hasBogoPromo && product.Status === 'Available') {
            // Add product with BOGO flag
            promotionItems.push({
              ...product,
              isBogoPromotion: true
            });
          }
        });
      });
    });
    
    // Add Promotion category at the end
    if (promotionItems.length > 0) {
      console.log('Adding Promotion category with items:', promotionItems);
      return {
        ...orderedGrouped,
        'Promotion': {
          'BOGO Deals': promotionItems
        }
      };
    }
    
    console.log('No promotion items found, returning original grouped');
    return orderedGrouped;
  };

  // Fetch promotions first
  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const res = await fetch("http://localhost:7004/debug/promos", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        setPromos(data.promos || []);
      } catch (err) {
        console.error("Failed to fetch promos", err);
      }
    };

    fetchPromos();
  }, []);

  const getPromoForProduct = (product) => {
    if (!promos.length) return [];

    return promos.filter((promo) => {
      if (promo.applicationType === "all_products") {
        return true;
      }

      if (
        promo.applicationType === "specific_products" &&
        promo.selectedProducts.includes(product.product_name)
      ) {
        return true;
      }

      if (
        promo.applicationType === "specific_categories" &&
        promo.selectedCategories.includes(product.product_category)
      ) {
        return true;
      }

      return false;
    });
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

  if (isLoading) {
    return (
      <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: 'rgba(240, 249, 250, 0.85)', 
          backdropFilter: 'blur(5px)',
          zIndex: 9999 
        }}>
        <div>
          <div style={{ width: '250px', height: '250px' }}>
            <Lottie animationData={coffeeTime} loop={true} />
          </div>
          <div className="wavy-text">
            {'Brewing Your Menu...'.split('').map((char, index) => (
              <span key={index} style={{'--i': index + 1}}>{char === ' ' ? '\u00A0' : char}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }



  const handleCategoryClick = (category, subcategory) => {
    setSelectedCategory(category);
    setSelectedSubcategory(subcategory);
    setSelectedItem(null);
    setIsFromPromotionCategory(category === 'Promotion'); // Track if user clicked on Promotion category
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    // Reset add-ons and notes before showing the modal
    setSelectedAddOns([]);
    setAddOnsTotal(0);
    setOrderNotes('');
    
    // Check if this is a BOGO item from Promotion category
    const shouldAutoApplyBogo = isFromPromotionCategory && item.isBogoPromotion;
    console.log('[BOGO FRONTEND 1] Item clicked:', item.ProductName);
    console.log('[BOGO FRONTEND 1] isFromPromotionCategory:', isFromPromotionCategory);
    console.log('[BOGO FRONTEND 1] item.isBogoPromotion:', item.isBogoPromotion);
    console.log('[BOGO FRONTEND 1] shouldAutoApplyBogo:', shouldAutoApplyBogo);
    showSweetAlertItemDetails(item, shouldAutoApplyBogo);
  };

  const handleAddToCart = async (item, notes, addOns, addOnsTotal, isBogoItem = false, bogoQuantity = 1) => {
    if (!item) return;

    if (!checkStoreStatus()) {
      toast.error("Store is closed. Cannot add items to cart.");
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("You must be logged in to add to cart.");
      return;
    }

    // Check if the item is available before adding to cart
    if (item.Status !== 'Available' || (item.ProductTypeName === 'Merchandise' && item.MerchandiseQuantity <= 0)) {
      toast.error(`${item.ProductName} is currently unavailable.`);
      return;
    }

    // Determine quantity based on BOGO or default (1)
    const quantity = isBogoItem ? bogoQuantity : 1;

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

    // Get max quantity
    let maxQty;
    if (item.ProductTypeName === 'Merchandise') {
      maxQty = item.MerchandiseQuantity;
    } else {
      try {
        const res = await fetch(`${PRODUCTS_BASE_URL}/is_products/products/${item.ProductID}/max-quantity`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          maxQty = data.maxQuantity;
        } else {
          console.warn("Failed to fetch max quantity, proceeding without check.");
          maxQty = Infinity;
        }
      } catch (err) {
        console.error("Error fetching max quantity:", err);
        maxQty = Infinity;
      }
    }

    if (currentQty + quantity > maxQty) {
      toast.error(`Cannot add more. Max quantity is ${maxQty}.`);
      return;
    }

    console.log('[BOGO FRONTEND 2] Adding to cart - isBogoItem:', isBogoItem);
    await addToContextCart(
      {
        product_id: item.ProductID ?? 0,
        product_name: item.ProductName ?? '',
        product_type: item.ProductTypeName ?? '',
        product_category: item.ProductCategory ?? '',
        price: item.ProductPrice ?? 0,
        product_image: item.ProductImage ?? null,
        max_quantity: maxQty,
      },
      addOns,
      quantity,
      isBogoItem
    );

    // Clear temporary states after adding to cart
    setOrderNotes('');
    setSelectedAddOns([]);
    setAddOnsTotal(0);
  };

  const showSweetAlertItemDetails = (item, shouldAutoApplyBogo = false) => {
    if (!item) return;
    setSelectedItem(item);

    const isStoreOpen = checkStoreStatus();

    // Get BOGO promo details if applicable
    let bogoPromo = null;
    let bogoQuantity = 1;
    let buyQty = 1;
    let getQty = 1;
    let isSameProductBogo = false;
    if (shouldAutoApplyBogo) {
      const applicablePromos = getPromoForProduct({
        product_name: item.ProductName,
        product_category: item.ProductCategory
      });
      bogoPromo = applicablePromos.find(p => p.promotionType === 'bogo');
      if (bogoPromo) {
        console.log('BOGO Promo details:', bogoPromo);
        buyQty = parseInt(bogoPromo.buyQuantity) || 1;
        getQty = parseInt(bogoPromo.getQuantity) || 1;
        
        // Determine if it's same-product or cross-product BOGO
        // Same-product: Only 1 specific product OR all_products OR specific category
        // Cross-product: Multiple specific products listed
        if (bogoPromo.applicationType === 'specific_products' && 
            bogoPromo.selectedProducts && 
            bogoPromo.selectedProducts.length > 1) {
          // Cross-product BOGO: Multiple products involved
          isSameProductBogo = false;
          bogoQuantity = 1; // Add each product separately with qty 1
        } else {
          // Same-product BOGO: Buy X of this product, Get Y of this product
          isSameProductBogo = true;
          bogoQuantity = buyQty + getQty; // Add with combined quantity
        }
      }
    }

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
            ${addon.AddOnName} (${addon.Status})
          </label>
        </div>
        <span class="text-muted small">₱${addon.Price.toFixed(2)}</span>
      </div>
    `).join('');

    // BOGO banner HTML
    const bogoHtml = bogoPromo ? `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; 
                  padding: 12px; 
                  border-radius: 8px; 
                  margin-bottom: 15px; 
                  text-align: center;
                  font-weight: bold;
                  box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        🎉 ${isSameProductBogo 
          ? `BUY ${buyQty} GET ${getQty} FREE!` 
          : `${bogoPromo.promotionName || 'BOGO PROMOTION'}`} 🎉
        <div style="font-size: 0.9em; margin-top: 5px; opacity: 0.95;">
          ${isSameProductBogo 
            ? `Quantity set to ${bogoQuantity} items` 
            : `Required items: ${bogoPromo.selectedProducts ? bogoPromo.selectedProducts.filter(p => p !== item.ProductName).join(', ') : 'Multiple products'}`}
        </div>
      </div>
    ` : '';

    Swal.fire({
      title: item.ProductName,
      html: `
        <div class="container-fluid" style="text-align: left; padding: 0;">
          ${bogoHtml}
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
                    ${addOnsHtml}
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
      confirmButtonText: isStoreOpen ? 'Add to cart' : 'Store Closed',
      denyButtonText: isStoreOpen ? 'Buy Now' : 'Store Closed',
      footer: !isStoreOpen ? '<span style="color: red; font-weight: bold;">Store is currently closed. Ordering is disabled.</span>' : null,
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
        const confirmBtn = Swal.getConfirmButton();
        const denyBtn = Swal.getDenyButton();
        if (!isStoreOpen) {
          confirmBtn.disabled = true;
          denyBtn.disabled = true;
        }
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
        return { action: 'add-to-cart', notes, addOns, addOnsTotal: total, isBogoItem: shouldAutoApplyBogo, bogoQuantity };
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
        return { action: 'buy-now', notes, addOns, addOnsTotal: total, isBogoItem: shouldAutoApplyBogo, bogoQuantity };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        handleAddToCart(item, result.value.notes, result.value.addOns, result.value.addOnsTotal, result.value.isBogoItem, result.value.bogoQuantity);
      } else if (result.isDenied) {
        handleBuyNow(item, result.value.notes, result.value.addOns, result.value.addOnsTotal, result.value.isBogoItem, result.value.bogoQuantity);
      }
      // Reset temporary states if the modal is closed without confirmation (cancel/close)
      if (result.isDismissed) {
        setOrderNotes('');
        setSelectedAddOns([]);
        setAddOnsTotal(0);
      }
    });
  };


  const handleBuyNow = (item, notes, addOns, addOnsTotal, isBogoItem = false, bogoQuantity = 1) => {
    if (!checkStoreStatus()) {
      toast.error("Store is closed. Cannot place orders.");
      return;
    }
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("You must be logged in to buy now.");
      return;
    }
    showSweetAlertBuyNow(item, notes, addOns, addOnsTotal, isBogoItem, bogoQuantity);
  }; 

  // Helper to construct the single item array for LocationVerifyModal
  const createSingleItemArray = (item, notes, addOns, addOnsTotal, isBogoItem = false, bogoQuantity = 1) => [{
    product_id: item.ProductID,
    product_name: item.ProductName,
    price: item.ProductPrice,
    product_image: item.ProductImage,
    product_type: item.ProductTypeName,
    product_category: item.ProductCategory,
    quantity: isBogoItem ? bogoQuantity : 1,
    orderNotes: notes,
    addons: addOns,
    MerchandiseQuantity: item.MerchandiseQuantity,
    // Add a temporary total for this item, including add-ons, for the modal's display
    // The modal will recalculate delivery fee based on this subtotal
    total: (item.ProductPrice ?? 0) + addOnsTotal
  }];

  const showSweetAlertBuyNow = (item, notes, addOns, addOnsTotal, isBogoItem = false, bogoQuantity = 1) => {
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
                id="ewalletSwal"
                autocomplete="off"
                value="E-Wallet"
                checked
              />
              <label class="btn btn-outline-secondary w-100" for="ewalletSwal">E-Wallet</label>
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
        // 🚀 ADDED 'ms-2' (margin-start: 2) to push it away from the Confirm/Buy Now button
        cancelButton: 'btn btn-outline-secondary ms-2', 
        popup: 'custom-sweetalert-popup',
        // htmlContainer is intentionally omitted here to preserve default spacing
      },
      buttonsStyling: false,
      preConfirm: () => {
        const selectedDelivery = document.querySelector('input[name="deliveryMethodSwal"]:checked').value;
        const selectedPayment = document.querySelector('input[name="paymentMethodSwal"]:checked')?.value || 'E-Wallet'; // Default to E-Wallet if not found
        return { delivery: selectedDelivery, payment: selectedPayment };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        if (result.value.delivery === 'Delivery') {
          // Store item details and trigger location check
          setItemForLocationCheck(item);
          setNotesForLocationCheck(notes);
          setAddOnsForLocationCheck(addOns);
          setIsBogoForLocationCheck(isBogoItem);
          setBogoQuantityForLocationCheck(bogoQuantity);
          setDeliveryMethod('Delivery'); // Update delivery method state
          setPaymentMethod(result.value.payment); // Update payment method state
          setIsCheckingLocation(true);
        } else {
          // For Pick-up, proceed directly to checkout
          setDeliveryMethod(result.value.delivery);
          setPaymentMethod(result.value.payment);
          handleConfirmBuyNow(item, notes, addOns, addOnsTotal, result.value.delivery, result.value.payment, isBogoItem, bogoQuantity);
        }
      }
    });
  };

  // Updated handler to accept add-ons details
  const handleConfirmBuyNow = (item, notes, addOns, addOnsTotal, delivery, payment, isBogoItem = false, bogoQuantity = 1) => {
    if (item) {
      // No need for an 'if (item)' check here, as the function is only called when item exists.
      // Check availability for Buy Now as well
      if (item.Status !== 'Available' || (item.ProductTypeName === 'Merchandise' && item.MerchandiseQuantity <= 0)) {
        toast.error(`${item.ProductName} is currently unavailable.`);
        return;
      }

      const singleItemForCheckout = createSingleItemArray(item, notes, addOns, addOnsTotal, isBogoItem, bogoQuantity);

      navigate('/checkout', {
        state: {
          cartItems: singleItemForCheckout,
          orderType: delivery,
          paymentMethod: payment,
        }
      });

      // Reset temporary states
      setOrderNotes('');
      setSelectedAddOns([]);
      setAddOnsTotal(0);
      setDeliveryMethod('Pick-up');
      setPaymentMethod('E-Wallet');
    }
  };
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
                <h3 className={productType === 'Merchandise' ? 'merchandise-title' : ''}>{productType}</h3>
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
              const isAvailable = item.Status === 'Available' && (item.ProductTypeName !== 'Merchandise' || item.MerchandiseQuantity > 0);
              const applicablePromos = getPromoForProduct({
                product_name: item.ProductName,
                product_category: item.ProductCategory
              });

              // Filter badges based on category
              const displayPromos = isFromPromotionCategory 
                ? applicablePromos.filter(p => p.promotionType === 'bogo')
                : applicablePromos.filter(p => p.promotionType !== 'bogo');

              return (
                <div
                  className={`item-card ${!isAvailable ? 'unavailable' : ''}`}
                  key={item.ProductID}
                  onClick={() => isAvailable && handleItemClick(item)}
                  style={{ cursor: isAvailable ? 'pointer' : 'not-allowed' }}
                >
                  {displayPromos.length > 0 && (
                    <div className="promo-badges-container">
                      {displayPromos.map((promo, idx) => (
                        <div key={idx} className="promo-badge">
                          {promo.promotionType === "fixed" && `₱${promo.promotionValue} OFF`}
                          {promo.promotionType === "percentage" && `${promo.promotionValue}% OFF`}
                          {promo.promotionType === "bogo" && "BUY 1 GET 1"}
                        </div>
                      ))}
                    </div>
                  )}
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

        {/* Location Verification Modal */}
        {isCheckingLocation && itemForLocationCheck && (
          <LocationVerifyModal
            show={isCheckingLocation}
            onClose={() => setIsCheckingLocation(false)}
            deliverySettings={deliverySettings} // Pass deliverySettings here
            selectedCartItems={createSingleItemArray(itemForLocationCheck, notesForLocationCheck, addOnsForLocationCheck, addOnsTotal, isBogoForLocationCheck, bogoQuantityForLocationCheck)}
            orderTypeMain="Delivery"
            paymentMethodMain={paymentMethod}
          />
        )}
      </div>
    </section>
  );
};

export default MenuContent;