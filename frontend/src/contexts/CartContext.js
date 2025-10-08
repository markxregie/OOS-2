import React, { createContext, useState, useEffect } from 'react';

export const CartContext = createContext();

const getUsername = () => {
  // Try to get username from localStorage or other means
  return localStorage.getItem('username') || null;
};

export const CartProvider = ({ children }) => {
  const username = getUsername();

  const storageKey = username ? `cartItems_${username}` : 'cartItems_guest';

  const [cartItems, setCartItems] = useState(() => {
    // Load cart items from localStorage for the current user if available
    const storedCart = localStorage.getItem(storageKey);
    const parsed = storedCart ? JSON.parse(storedCart) : [];
    // Assign unique cartItemId to existing items if missing
    return parsed.map(item => item.cartItemId ? item : { ...item, cartItemId: Date.now() + Math.random() });
  });

  useEffect(() => {
    // Save cart items to localStorage whenever it changes
    localStorage.setItem(storageKey, JSON.stringify(cartItems));
  }, [cartItems, storageKey]);

  const addToCart = (product, addons = []) => {
  // Normalize product: if addOns exists, copy to addons (lowercase) and remove addOns
  const normalizedProduct = { ...product };
  if (normalizedProduct.addOns) {
    normalizedProduct.addons = normalizedProduct.addOns;
    delete normalizedProduct.addOns;
  }

  // Transform addons to correct shape for backend compatibility
  const normalizedAddons = (normalizedProduct.addons || addons || []).map((a, idx) => ({
    addon_id: a.AddOnID || a.addon_id || idx,
    addon_name: a.AddOnName || a.addon_name || a.name,
    price: a.Price || a.price || 0,
    status: a.Status || a.status || "Available"
  }));

  // Sort addons by addon_name for consistent comparison
  const sortedAddons = [...normalizedAddons].sort((a, b) => a.addon_name.localeCompare(b.addon_name));

  const productIdStr = String(normalizedProduct.product_id);
  const orderNotes = normalizedProduct.orderNotes || '';
  const itemKey = `${productIdStr}-${JSON.stringify(sortedAddons)}-${orderNotes}`;

  setCartItems((prevItems) => {
    const existingItemIndex = prevItems.findIndex(item => {
      const itemSortedAddons = [...(item.addons || [])].sort((a, b) => a.addon_name.localeCompare(b.addon_name));
      const itemKeyCheck = `${String(item.product_id)}-${JSON.stringify(itemSortedAddons)}-${item.orderNotes || ''}`;
      return itemKey === itemKeyCheck;
    });

    if (existingItemIndex !== -1) {
      // Increment quantity
      return prevItems.map((item, index) =>
        index === existingItemIndex ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      // Add new product with quantity 1 and normalized addons
      return [...prevItems, { ...normalizedProduct, quantity: 1, addons: normalizedAddons, cartItemId: Date.now() + Math.random() }];
    }
  });
};

  const removeFromCart = (cartItemId) => {
    setCartItems((prevItems) => prevItems.filter(item => item.cartItemId !== cartItemId));
  };

  const incrementQuantity = (cartItemId) => {
    setCartItems((prevItems) => {
      return prevItems.map(item => {
        if (item.cartItemId === cartItemId) {
          return { ...item, quantity: item.quantity + 1 };
        }
        return item;
      });
    });
  };

  const decrementQuantity = (cartItemId) => {
    setCartItems((prevItems) => {
      return prevItems.map(item => {
        if (item.cartItemId === cartItemId && item.quantity > 1) {
          return { ...item, quantity: item.quantity - 1 };
        }
        return item;
      });
    });
  };

  const clearCart = () => {
    setCartItems([]);
    if (username) {
      localStorage.removeItem(storageKey);
    }
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      incrementQuantity,
      decrementQuantity,
      setCartItems,
      clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
};