// src/contexts/CartContext.js
import React, { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [username, setUsername] = useState(null);
  const [promos, setPromos] = useState([]);

  // --- Helper: Get token ---
  const getToken = () => {
    const direct = localStorage.getItem("authToken");
    if (direct) return direct;
    try {
      const userData = JSON.parse(localStorage.getItem("userData"));
      return userData?.authToken || null;
    } catch {
      return null;
    }
  };

  const token = getToken();
  const CART_API_URL = "http://localhost:7004/usercart";
  const AUTH_API_URL = "http://localhost:4000/auth/users/me";
  const PROMOS_API_URL = "http://localhost:7004/debug/promos";

  // --- Fetch promotions on mount ---
  useEffect(() => {
    const fetchPromos = async () => {
      if (!token) return;
      try {
        const res = await fetch(PROMOS_API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPromos(data.promos || []);
        }
      } catch (err) {
        console.error("Error fetching promos:", err);
      }
    };
    fetchPromos();
  }, [token]);

  // --- Normalize product data from PascalCase to snake_case ---
  const normalizeProductData = (product) => ({
    product_id: product.product_id,
    product_name: product.product_name || '',
    product_type: product.product_type || '',
    product_category: product.product_category || '',
    price: product.price || 0,
    product_image: product.product_image,
    max_quantity: parseInt(
      product.MerchandiseQuantity ||
      product.max_quantity ||
      product.stock ||
      0,
      10
    ),
  });

  // --- Fetch username from localStorage or auth service ---
  useEffect(() => {
    const fetchUsername = async () => {
      const storedUser = localStorage.getItem("userData");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.username) {
            setUsername(parsed.username);
            return;
          }
        } catch (err) {
          console.error("Error parsing userData:", err);
        }
      }

      // fallback: fetch from auth service if token is valid
      if (!token) return;
      try {
        const res = await fetch(AUTH_API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUsername(data.username);
          localStorage.setItem("userData", JSON.stringify({ ...data }));
        }
      } catch (err) {
        console.error("Error fetching username:", err);
      }
    };
    fetchUsername();
  }, [token]);

  // --- Load cart from backend on mount ---
  useEffect(() => {
    const loadCart = async () => {
      if (!username || !token) return;
      try {
        const res = await fetch(`${CART_API_URL}/${username}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load cart");
        const data = await res.json();
        // Sort addons for consistent display
        const processedData = data.map(item => ({
          ...item,
          addons: item.addons ? [...item.addons].sort((a, b) => {
            const nameA = (a.addon_name || a.AddOnName || a.name || '').toLowerCase();
            const nameB = (b.addon_name || b.AddOnName || b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
          }) : []
        }));
        setCartItems(processedData);
      } catch (err) {
        console.error("Error loading cart:", err);
      }
    };
    if (username) loadCart();
  }, [username, token]);


  // --- Add item to cart ---
  const addToCart = async (product, addons = [], quantity = 1, isBogoSelected = false) => {
    console.log('[BOGO FRONTEND 3] CartContext.addToCart called - isBogoSelected:', isBogoSelected);
    if (!token) {
      toast.error("Please log in to add to cart");
      return;
    }

    const normalized = normalizeProductData(product);

    // Sort and normalize addons for consistent comparison
    const sortedAddons = [...addons].sort((a, b) => {
      const nameA = (a.addon_name || a.AddOnName || a.name || '').toLowerCase();
      const nameB = (b.addon_name || b.AddOnName || b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Calculate total quantity of this product in cart (across all variants)
    const totalQuantity = cartItems.reduce((sum, item) => {
      return item.product_id === normalized.product_id ? sum + item.quantity : sum;
    }, 0);

    // Check maximum quantity (only if max_quantity > 0, else unlimited)
    if (normalized.max_quantity > 0 && totalQuantity + quantity > normalized.max_quantity) {
      toast.error(`Cannot add more. Max quantity is ${normalized.max_quantity}.`);
      return;
    }

    // Find if the exact same product with same addons AND same is_bogo_selected flag exists in cart
    const existingItem = cartItems.find(item => {
      if (item.product_id !== normalized.product_id) return false;
      if (item.addons?.length !== sortedAddons.length) return false;
      
      // Check if is_bogo_selected flag matches
      const itemIsBogoSelected = item.is_bogo_selected || false;
      if (itemIsBogoSelected !== isBogoSelected) return false;

      const itemAddons = [...(item.addons || [])].sort((a, b) => {
        const nameA = (a.addon_name || a.AddOnName || a.name || '').toLowerCase();
        const nameB = (b.addon_name || b.AddOnName || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      return itemAddons.every((addon, index) => {
        const normalizedAddon = sortedAddons[index];
        return (addon.addon_name || addon.AddOnName || addon.name).toLowerCase() ===
               (normalizedAddon.addon_name || normalizedAddon.AddOnName || normalizedAddon.name).toLowerCase();
      });
    });

    const payload = {
      product_id: parseInt(normalized.product_id, 10),
      product_name: normalized.product_name,
      product_type: normalized.product_type,
      product_category: normalized.product_category,
      quantity: quantity,
      price: parseFloat(normalized.price),
      product_image: normalized.product_image,
      max_quantity: normalized.max_quantity,
      is_bogo_selected: isBogoSelected,
      addons: sortedAddons.map((a) => ({
        addon_name: a.addon_name || a.AddOnName || a.name,
        price: parseFloat(a.price || a.Price || 0),
        addon_id: a.addon_id || a.AddOnID ? parseInt(a.addon_id || a.AddOnID, 10) : null,
      })),
    };
    console.log('[BOGO FRONTEND 4] Sending payload to backend:', JSON.stringify({ is_bogo_selected: payload.is_bogo_selected, product_name: payload.product_name }));

    try {
      if (existingItem) {
        // If the item exists, update its quantity instead
        const updatedQuantity = existingItem.quantity + quantity;
        const updateRes = await fetch(`${CART_API_URL}/update/${existingItem.cart_item_id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ quantity: updatedQuantity }),
        });
        
        if (!updateRes.ok) throw new Error("Failed to update item quantity");
        toast.success("Cart updated successfully!");
        await reloadCart();
      } else {
        // If it's a new item, add it to cart
        const res = await fetch(`${CART_API_URL}/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          // Show backend error message if available
          const message = data?.detail || "Failed to add to cart";
          toast.error(message);
          return;
        }
        toast.success("Item added to cart!");
        await reloadCart();
      }
    } catch (err) {
      console.error("Error adding to cart:", err);
      toast.error("Failed to add to cart");
    }
  };

  // --- Update quantity ---
  const updateQuantity = async (cartItemId, newQuantity) => {
    if (!token) return;
    
    // Optimistic update - update UI immediately
    setCartItems(prevItems => 
      prevItems.map(item => 
        item.cart_item_id === cartItemId 
          ? { ...item, quantity: newQuantity }
          : item
      )
    );

    // Update backend in background
    try {
      const res = await fetch(`${CART_API_URL}/update/${cartItemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity: parseInt(newQuantity, 10) }),
      });
      if (!res.ok) {
        throw new Error("Failed to update quantity");
      }
      // No need to reload cart since we already updated optimistically
    } catch (err) {
      console.error("Error updating quantity:", err);
      // Revert on error
      await reloadCart();
      throw err;
    }
  };

  // --- Remove item ---
  const removeFromCart = async (cartItemId) => {
    if (!token) return;
    try {
      const res = await fetch(`${CART_API_URL}/remove/${cartItemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to remove item");
      toast.info("Item removed from cart");
      await reloadCart();
    } catch (err) {
      console.error("Error removing from cart:", err);
    }
  };

  // --- Clear cart ---
  const clearCart = async () => {
    let currentUsername = username;
    if (!currentUsername) {
      const storedUser = localStorage.getItem("userData");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          currentUsername = parsed.username;
        } catch (err) {
          console.error("Error parsing userData for clear:", err);
        }
      }
      if (!currentUsername && token) {
        try {
          const res = await fetch(AUTH_API_URL, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            currentUsername = data.username;
            setUsername(data.username);
          }
        } catch (err) {
          console.error("Error fetching username for clear:", err);
        }
      }
    }
    if (!currentUsername || !token) return;
    try {
      const res = await fetch(`${CART_API_URL}/clear/${currentUsername}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to clear cart");
      setCartItems([]);
      toast.success("Cart cleared successfully");
    } catch (err) {
      console.error("Error clearing cart:", err);
      toast.error("Failed to clear cart");
    }
  };

  // --- Reload helper ---
  const reloadCart = async () => {
    if (!username || !token) return;
    try {
      const res = await fetch(`${CART_API_URL}/${username}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCartItems(data);
    } catch (err) {
      console.error("Error reloading cart:", err);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        setCartItems,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        reloadCart,
        promos,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
