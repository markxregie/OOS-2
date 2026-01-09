import React, { useState, useEffect, useContext, useMemo } from 'react';
// import { Button } from 'react-bootstrap'; // Unused here; remove to reduce bundle
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

  // Build a quick lookup map for promos to reduce per-item filtering
  const promoIndexByProduct = useMemo(() => {
    if (!Array.isArray(promos) || !promos.length) return new Map();
    const map = new Map();
    for (const promo of promos) {
      const type = promo.applicationType;
      if (type === 'all_products') {
        map.set('*', (map.get('*') || []).concat(promo));
      } else if (type === 'specific_products' && Array.isArray(promo.selectedProducts)) {
        for (const name of promo.selectedProducts) {
          if (!map.has(name)) map.set(name, []);
          map.get(name).push(promo);
        }
      } else if (type === 'specific_categories' && Array.isArray(promo.selectedCategories)) {
        for (const cat of promo.selectedCategories) {
          const key = `cat:${cat}`;
          if (!map.has(key)) map.set(key, []);
          map.get(key).push(promo);
        }
      }
    }
    return map;
  }, [promos]);

  useEffect(() => {
    // Fetch everything in parallel once, avoid duplicate promo requests
    const controller = new AbortController();
    const { signal } = controller;

    const run = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      try {
        if (token) {
          const headers = { Authorization: `Bearer ${token}` };
          const [typesRes, productsRes, detailsRes, addOnsRes, merchRes, promosRes] = await Promise.all([
            fetch(`${PRODUCTS_BASE_URL}/ProductType/`, { headers, signal }),
            fetch(`${PRODUCTS_BASE_URL}/is_products/products/`, { headers, signal }),
            fetch(`${PRODUCTS_BASE_URL}/is_products/products/details/`, { headers, signal }),
            fetch(`${PRODUCTS_BASE_URL}/is_products/products/all_addons`, { headers, signal }),
            fetch(`${MERCH_BASE_URL}/merchandise/menu`, { headers, signal }),
            fetch(`http://localhost:7004/debug/promos`, { headers, signal })
          ]);

          if (!(typesRes.ok && productsRes.ok && detailsRes.ok && addOnsRes.ok && merchRes.ok && promosRes.ok)) {
            throw new Error('Failed to fetch one or more resources');
          }

          const [apiTypes, apiProducts, apiProductsDetails, allAddOnsMap, apiMerchandise, promosData] = await Promise.all([
            typesRes.json(),
            productsRes.json(),
            detailsRes.json(),
            addOnsRes.json(),
            merchRes.json(),
            promosRes.json()
          ]);

          // Store promos
          setPromos(promosData.promos || []);

          // Build status map
          const productStatusMap = new Map(apiProductsDetails.map(d => [d.ProductName, d.Status]));

          // Keep only products that have details
          const transformedProducts = apiProducts
            .filter(p => productStatusMap.has(p.ProductName))
            .map(p => ({
              ...p,
              Status: productStatusMap.get(p.ProductName),
              AddOns: (allAddOnsMap && allAddOnsMap[p.ProductID]) || []
            }));

          // Group by type/category
          const grouped = {};
          for (const type of apiTypes) grouped[type.productTypeName] = {};
          for (const product of transformedProducts) {
            const typeName = product.ProductTypeName || 'Other';
            const category = product.ProductCategory || 'Other';
            grouped[typeName] = grouped[typeName] || {};
            grouped[typeName][category] = grouped[typeName][category] || [];
            grouped[typeName][category].push(product);
          }

          // Merchandise mapping
          const mappedMerchandise = (apiMerchandise || []).map((item) => ({
            ProductID: item.MerchandiseID,
            ProductName: item.MerchandiseName,
            ProductPrice: item.MerchandisePrice,
            ProductImage: item.MerchandiseImage,
            ProductTypeName: 'Merchandise',
            ProductCategory: 'All Items',
            Status: item.Status,
            MerchandiseQuantity: item.MerchandiseQuantity,
          }));
          grouped['Merchandise'] = grouped['Merchandise'] || {};
          grouped['Merchandise']['All Items'] = mappedMerchandise;

          // Reorder
          const orderedGrouped = {};
          for (const cat of CATEGORY_ORDER) if (grouped[cat]) orderedGrouped[cat] = grouped[cat];
          for (const cat of Object.keys(grouped)) if (!CATEGORY_ORDER.includes(cat)) orderedGrouped[cat] = grouped[cat];

          // Add Promotion category (BOGO only) efficiently
          const finalGrouped = createPromotionCategory(orderedGrouped, promosData.promos || []);
          setProducts(finalGrouped);

          // Set default subcategory
          if (finalGrouped['Drinks']) {
            const firstSubcat = Object.keys(finalGrouped['Drinks'])[0];
            setSelectedSubcategory(firstSubcat || '');
          } else {
            setSelectedSubcategory('');
          }
        } else {
          // Public (no auth)
          const [publicProductsRes, addOnsRes, merchRes] = await Promise.all([
            fetch(`${PRODUCTS_BASE_URL}/is_products/public/products/`, { signal }),
            fetch(`${PRODUCTS_BASE_URL}/is_products/public/products/all_addons`, { signal }),
            fetch(`${MERCH_BASE_URL}/merchandise/public/menu`, { signal })
          ]);

          if (!(publicProductsRes.ok && addOnsRes.ok && merchRes.ok)) {
            throw new Error('Failed to fetch public resources');
          }

          const [publicProducts, allAddOnsMap, apiMerchandise] = await Promise.all([
            publicProductsRes.json(),
            addOnsRes.json(),
            merchRes.json()
          ]);

          const grouped = {};
          for (const product of publicProducts) {
            const typeName = product.ProductTypeName || 'Other';
            const category = product.ProductCategory || 'Other';
            grouped[typeName] = grouped[typeName] || {};
            grouped[typeName][category] = grouped[typeName][category] || [];
            grouped[typeName][category].push({
              ...product,
              Status: product.Status || 'Available',
              AddOns: (allAddOnsMap && allAddOnsMap[product.ProductID]) || []
            });
          }

          const mappedMerchandise = (apiMerchandise || []).map((item) => ({
            ProductID: item.MerchandiseID,
            ProductName: item.MerchandiseName,
            ProductPrice: item.MerchandisePrice,
            ProductImage: item.MerchandiseImage,
            ProductTypeName: 'Merchandise',
            ProductCategory: 'All Items',
            Status: item.Status,
            MerchandiseQuantity: item.MerchandiseQuantity,
          }));
          grouped['Merchandise'] = grouped['Merchandise'] || {};
          grouped['Merchandise']['All Items'] = mappedMerchandise;

          // Reorder
          const orderedGrouped = {};
          for (const cat of CATEGORY_ORDER) if (grouped[cat]) orderedGrouped[cat] = grouped[cat];
          for (const cat of Object.keys(grouped)) if (!CATEGORY_ORDER.includes(cat)) orderedGrouped[cat] = grouped[cat];

          const finalGrouped = createPromotionCategory(orderedGrouped, []);
          setProducts(finalGrouped);
          if (finalGrouped['Drinks']) {
            const firstSubcat = Object.keys(finalGrouped['Drinks'])[0];
            setSelectedSubcategory(firstSubcat || '');
          } else {
            setSelectedSubcategory('');
          }
        }
      } catch (err) {
        if (!signal.aborted) {
          console.error('Error fetching products:', err);
          toast.error('Failed to load products');
        }
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, []);

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
    const bogoPromos = Array.isArray(promosData) ? promosData.filter(p => p.promotionType === 'bogo') : [];
    if (!bogoPromos.length) return orderedGrouped;

    // Prebuild lookup sets
    const allProductsBogo = bogoPromos.some(p => p.applicationType === 'all_products');
    const productSet = new Set();
    const categorySet = new Set();
    for (const p of bogoPromos) {
      if (p.applicationType === 'specific_products' && Array.isArray(p.selectedProducts)) {
        p.selectedProducts.forEach(name => productSet.add(name));
      } else if (p.applicationType === 'specific_categories' && Array.isArray(p.selectedCategories)) {
        p.selectedCategories.forEach(cat => categorySet.add(cat));
      }
    }

    const promotionItems = [];
    for (const categoryKey of Object.keys(orderedGrouped)) {
      for (const subcatKey of Object.keys(orderedGrouped[categoryKey])) {
        for (const product of orderedGrouped[categoryKey][subcatKey]) {
          if (product.Status !== 'Available') continue;
          const match = allProductsBogo || productSet.has(product.ProductName) || categorySet.has(product.ProductCategory);
          if (match) promotionItems.push({ ...product, isBogoPromotion: true });
        }
      }
    }
    if (!promotionItems.length) return orderedGrouped;
    return { ...orderedGrouped, Promotion: { 'BOGO Deals': promotionItems } };
  };

  // removed duplicate promos fetch (now fetched in the main parallel effect)

  const getPromoForProduct = (product) => {
    if (!promos.length) return [];
    const list = [];
    const star = promoIndexByProduct.get('*') || [];
    if (star.length) list.push(...star);
    const byName = promoIndexByProduct.get(product.product_name) || [];
    if (byName.length) list.push(...byName);
    const byCat = promoIndexByProduct.get(`cat:${product.product_category}`) || [];
    if (byCat.length) list.push(...byCat);
    return list;
  };

  const subcategories = useMemo(() => (
    products[selectedCategory] ? Object.keys(products[selectedCategory]) : []
  ), [products, selectedCategory]);

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
        // BOGO promo details used to set quantity hints
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

    // If this is a cross-product BOGO (multiple specific products), show a bundled modal
    if (bogoPromo && !isSameProductBogo) {
      // Find partner product objects from current `products` state
      const partnerNames = Array.isArray(bogoPromo.selectedProducts) ? bogoPromo.selectedProducts.filter(n => n !== item.ProductName) : [];
      const partnerProducts = [];
      for (const name of partnerNames) {
        let found = null;
        for (const typeKey of Object.keys(products || {})) {
          const subcats = products[typeKey] || {};
          for (const subcatKey of Object.keys(subcats)) {
            const arr = subcats[subcatKey] || [];
            const match = arr.find(p => p.ProductName === name);
            if (match) { found = match; break; }
          }
          if (found) break;
        }
        if (found) partnerProducts.push(found);
      }

      // Fallback to original modal if partner product details aren't available
      if (!partnerProducts.length) {
        // Let the rest of the function continue to show the normal modal
      } else {
        // Build add-ons html for primary
        const primaryAddOnsHtml = (item.AddOns || []).map((addon, index) => `
          <div class="form-check d-flex justify-content-between align-items-center mb-1">
            <div>
              <input class="form-check-input primary-addon-checkbox" type="checkbox" id="primary-addon-${index}" value="${addon.AddOnName}" data-price="${addon.Price}" ${addon.Status !== 'Available' ? 'disabled' : ''}>
              <label class="form-check-label" for="primary-addon-${index}">${addon.AddOnName} (${addon.Status})</label>
            </div>
            <span class="text-muted small">₱${addon.Price.toFixed(2)}</span>
          </div>
        `).join('');

        // Build partner sections (no sugar selectors — simplified for user)
        const partnerSections = partnerProducts.map((pp, pIdx) => {
          const addons = (pp.AddOns || []).map((addon, aIdx) => `
            <div class="form-check d-flex justify-content-between align-items-center mb-1">
              <div>
                <input class="form-check-input partner-addon-checkbox partner-${pIdx}-addon" type="checkbox" id="partner-${pIdx}-addon-${aIdx}" value="${addon.AddOnName}" data-price="${addon.Price}" ${addon.Status !== 'Available' ? 'disabled' : ''}>
                <label class="form-check-label" for="partner-${pIdx}-addon-${aIdx}">${addon.AddOnName} (${addon.Status})</label>
              </div>
              <span class="text-muted small">₱${addon.Price.toFixed(2)}</span>
            </div>
          `).join('');

          return `
            <div style="border:1px solid #eee; padding:10px; border-radius:8px; margin-top:12px; background:#fff;">
              <h5 style="color:#4b929d; margin-bottom:8px;">${pp.ProductName} <small class="text-muted">(Partner)</small></h5>
              
              <div class="mb-2">
               
              </div>
              <div>
                <h6 class="mb-1">Add-ons</h6>
                <div class="addons-list partner-addons" style="max-height:120px; overflow-y:auto;">${addons}</div>
              </div>
            </div>
          `;
        }).join('');

        const html = `
          <div style="text-align:left; max-height:520px; overflow:auto;">
            <h4 style="color:#4b929d; margin-bottom:8px;">${item.ProductName} (BOGO Deal)</h4>
            <div style="border:1px solid #eee; padding:10px; border-radius:8px; background:#fff;">
              <div>
                <h6 class="mb-1">Add-ons</h6>
                <div class="addons-list" style="max-height:120px; overflow-y:auto;">${primaryAddOnsHtml}</div>
              </div>
            </div>
            <div style="margin-top:12px;">
              <h5 style="color:#4b929d;">Your Free Item</h5>
              ${partnerSections}
            </div>
          </div>
        `;

        Swal.fire({
          title: 'Add BOGO Deal',
          html,
          width: 800,
          showCancelButton: true,
          confirmButtonText: 'Add Deal to Cart',
          cancelButtonText: 'Cancel',
          customClass: {
            confirmButton: 'btn btn-primary',
            cancelButton: 'btn btn-outline-secondary ms-2',
            popup: 'custom-sweetalert-popup'
          },
          buttonsStyling: false,
          preConfirm: () => {
            // Collect primary selections (no sugar level)
            const primaryAddOns = [];
            Swal.getPopup().querySelectorAll('.primary-addon-checkbox:checked').forEach(cb => {
              primaryAddOns.push({ name: cb.value, price: parseFloat(cb.dataset.price) });
            });

            // Collect partner selections (no sugar level)
            const partners = partnerProducts.map((pp, pIdx) => {
              const addons = [];
              Swal.getPopup().querySelectorAll(`.partner-${pIdx}-addon:checked`).forEach(cb => {
                addons.push({ name: cb.value, price: parseFloat(cb.dataset.price) });
              });
              return { product: pp, addons };
            });

            return { action: 'add-deal', primary: { product: item, addons: primaryAddOns }, partners };
          }
        }).then(async (result) => {
          if (result.isConfirmed && result.value && result.value.action === 'add-deal') {
            try {
              // Add primary as bogo-selected
              const p = result.value.primary;
              await handleAddToCart(p.product, '', p.addons, p.addons.reduce((s, a) => s + (a.price || 0), 0), true, 1);

              // Add partners
              for (const partner of result.value.partners) {
                await handleAddToCart(partner.product, '', partner.addons, partner.addons.reduce((s, a) => s + (a.price || 0), 0), true, 1);
              }
              toast.success('BOGO deal added to cart');
            } catch (err) {
              console.error('Error adding BOGO bundle to cart', err);
              toast.error('Failed to add deal to cart');
            }
          }
        });

        return; // We've handled the cross-product modal flow
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
        ${isSameProductBogo 
          ? `BUY ${buyQty} GET ${getQty} FREE!` 
          : `${bogoPromo.promotionName || 'BOGO PROMOTION'}`}
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

    // Check if this is a cross-product BOGO (requires multiple products)
    if (isBogoItem) {
      const applicablePromos = getPromoForProduct({
        product_name: item.ProductName,
        product_category: item.ProductCategory
      });
      const bogoPromo = applicablePromos.find(p => p.promotionType === 'bogo');
      
      if (bogoPromo && bogoPromo.applicationType === 'specific_products' && 
          Array.isArray(bogoPromo.selectedProducts) && 
          bogoPromo.selectedProducts.length > 1) {
        // Cross-product BOGO detected: guide user to add to cart
        Swal.fire({
          icon: 'info',
          title: 'Multi-Product BOGO',
          html: `
            <p>This promotion requires multiple products:</p>
            <p style="font-weight: bold; color: #667eea;">
              ${bogoPromo.selectedProducts.join(' + ')}
            </p>
            <p style="color: #666; margin-top: 10px;">
              Buy Now is for single-item purchases.
            </p>
            <p style="color: #666;">
              <strong>Use Add to Cart</strong> to redeem this multi-product promotion.
            </p>
          `,
          showCancelButton: true,
          confirmButtonText: 'Add to Cart',
          cancelButtonText: 'Cancel',
          buttonsStyling: false,
          customClass: {
            confirmButton: 'btn btn-primary',
            cancelButton: 'btn btn-outline-secondary ms-2'
          }
        }).then((res) => {
          if (res.isConfirmed) {
            handleAddToCart(item, notes, addOns, addOnsTotal, true, 1);
          }
        });
        return;
      }
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

    const initialQuantity = isBogoItem ? bogoQuantity : 1;
    const basePrice = (item.ProductPrice ?? 0) + addOnsTotal;

    // Use current state for delivery/payment methods as initial values
    Swal.fire({
      title: 'Complete your purchase',
      html: `
        <div style="text-align: left;">
          <h5 class="mb-2">Item: ${item.ProductName}</h5>
          <div class="mb-3">
            <label class="form-label">Quantity</label>
            <div class="input-group" style="max-width: 150px;">
              <button class="btn btn-outline-secondary" type="button" id="decreaseQty">-</button>
              <input type="number" class="form-control text-center" id="quantityInput" value="${initialQuantity}" min="1" ${isBogoItem ? 'readonly' : ''}>
              <button class="btn btn-outline-secondary" type="button" id="increaseQty">+</button>
            </div>
            ${isBogoItem ? '<small class="text-muted">Quantity fixed for BOGO promotion</small>' : ''}
          </div>
          <h5 class="mb-3">Total Payable: <span id="totalPayable">₱${(basePrice * initialQuantity).toFixed(2)}</span></h5>
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
        cancelButton: 'btn btn-outline-secondary ms-2', 
        popup: 'custom-sweetalert-popup',
      },
      buttonsStyling: false,
      didOpen: () => {
        const quantityInput = document.getElementById('quantityInput');
        const totalPayableEl = document.getElementById('totalPayable');
        const decreaseBtn = document.getElementById('decreaseQty');
        const increaseBtn = document.getElementById('increaseQty');

        const updateTotal = () => {
          const qty = parseInt(quantityInput.value) || 1;
          totalPayableEl.textContent = `₱${(basePrice * qty).toFixed(2)}`;
        };

        if (!isBogoItem) {
          decreaseBtn.addEventListener('click', () => {
            let currentQty = parseInt(quantityInput.value) || 1;
            if (currentQty > 1) {
              quantityInput.value = currentQty - 1;
              updateTotal();
            }
          });

          increaseBtn.addEventListener('click', () => {
            let currentQty = parseInt(quantityInput.value) || 1;
            quantityInput.value = currentQty + 1;
            updateTotal();
          });

          quantityInput.addEventListener('input', updateTotal);
        } else {
          decreaseBtn.disabled = true;
          increaseBtn.disabled = true;
        }
      },
      preConfirm: () => {
        const selectedDelivery = document.querySelector('input[name="deliveryMethodSwal"]:checked').value;
        const selectedPayment = document.querySelector('input[name="paymentMethodSwal"]:checked')?.value || 'E-Wallet';
        const quantity = parseInt(document.getElementById('quantityInput').value) || initialQuantity;
        return { delivery: selectedDelivery, payment: selectedPayment, quantity };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const finalQuantity = result.value.quantity;
        if (result.value.delivery === 'Delivery') {
          // Store item details and trigger location check
          setItemForLocationCheck(item);
          setNotesForLocationCheck(notes);
          setAddOnsForLocationCheck(addOns);
          setIsBogoForLocationCheck(isBogoItem);
          setBogoQuantityForLocationCheck(finalQuantity);
          setDeliveryMethod('Delivery'); // Update delivery method state
          setPaymentMethod(result.value.payment); // Update payment method state
          setIsCheckingLocation(true);
        } else {
          // For Pick-up, proceed directly to checkout
          setDeliveryMethod(result.value.delivery);
          setPaymentMethod(result.value.payment);
          handleConfirmBuyNow(item, notes, addOns, addOnsTotal, result.value.delivery, result.value.payment, isBogoItem, finalQuantity);
        }
      }
    });
  };

  // Updated handler to accept add-ons details
  const handleConfirmBuyNow = async (item, notes, addOns, addOnsTotal, delivery, payment, isBogoItem = false, bogoQuantity = 1) => {
    if (item) {
      // Check availability for Buy Now as well
      if (item.Status !== 'Available' || (item.ProductTypeName === 'Merchandise' && item.MerchandiseQuantity <= 0)) {
        toast.error(`${item.ProductName} is currently unavailable.`);
        return;
      }

      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("You must be logged in to use Buy Now.");
        return;
      }

      try {
        // Show loading state
        Swal.fire({
          title: 'Processing...',
          text: 'Creating temporary cart item...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // Create temporary server-side cart item
        const tempCartResponse = await fetch('http://localhost:7004/usercart/temp-add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            product_id: item.ProductID,
            product_name: item.ProductName,
            product_type: item.ProductTypeName,
            product_category: item.ProductCategory,
            price: item.ProductPrice,
            product_image: item.ProductImage,
            quantity: bogoQuantity,
            addons: addOns,
            orderNotes: notes,
            is_bogo_selected: isBogoItem
          })
        });

        if (!tempCartResponse.ok) {
          throw new Error('Failed to create temporary cart item');
        }

        const tempCartData = await tempCartResponse.json();
        Swal.close();

        // Navigate to checkout with temporary cart item that has a proper cart_item_id
        navigate('/checkout', {
          state: {
            cartItems: [tempCartData.cart_item],  // Now has cart_item_id from server
            orderType: delivery,
            paymentMethod: payment,
            deliveryFee: 0,  // For Pick-up, delivery fee is 0; for Delivery, LocationVerifyModal will handle it
            isTemporaryCart: true,  // Mark as temporary so checkout can clean up after
            tempCartId: tempCartData.cart_item_id  // Track temporary cart for cleanup
          }
        });

        // Reset temporary states
        setOrderNotes('');
        setSelectedAddOns([]);
        setAddOnsTotal(0);
        setDeliveryMethod('Pick-up');
        setPaymentMethod('E-Wallet');
      } catch (error) {
        console.error('Error creating temporary cart item:', error);
        Swal.close();
        toast.error('Failed to process Buy Now. Please try again.');
      }
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
                      {displayPromos.map((promo, idx) => {
                        let badgeContent = '';
                        let badgeClass = 'promo-badge';
                        
                        if (promo.promotionType === "fixed") {
                          badgeContent = `P${parseFloat(promo.promotionValue)} OFF`;
                          badgeClass += ' promo-badge-fixed';
                        } else if (promo.promotionType === "percentage") {
                          badgeContent = `${parseInt(promo.promotionValue)}% OFF`;
                          badgeClass += ' promo-badge-percentage';
                        } else if (promo.promotionType === "bogo") {
                          badgeContent = `BUY GET FREE`;
                          badgeClass += ' promo-badge-bogo';
                        }
                        
                        return (
                          <div key={idx} className={badgeClass}>
                            <span className="badge-text">{badgeContent}</span>
                          </div>
                        );
                      })}
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