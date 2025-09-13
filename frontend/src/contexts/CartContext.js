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
    return storedCart ? JSON.parse(storedCart) : [];
  });

  useEffect(() => {
    // Save cart items to localStorage whenever it changes
    localStorage.setItem(storageKey, JSON.stringify(cartItems));
  }, [cartItems, storageKey]);

  const addToCart = (product) => {
    setCartItems((prevItems) => {
      const productIdStr = String(product.product_id);
      const existingItemIndex = prevItems.findIndex(item => String(item.product_id) === productIdStr);
      if (existingItemIndex !== -1) {
        // If product already in cart, increment quantity immutably
        return prevItems.map((item, index) => {
          if (index === existingItemIndex) {
            return { ...item, quantity: item.quantity + 1 };
          }
          return item;
        });
      } else {
        // Add new product with quantity 1
        return [...prevItems, { ...product, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (productId) => {
    const productIdStr = String(productId);
    setCartItems((prevItems) => prevItems.filter(item => String(item.product_id) !== productIdStr));
  };

  const incrementQuantity = (productId) => {
    const productIdStr = String(productId);
    setCartItems((prevItems) => {
      return prevItems.map(item => {
        if (String(item.product_id) === productIdStr) {
          return { ...item, quantity: item.quantity + 1 };
        }
        return item;
      });
    });
  };

  const decrementQuantity = (productId) => {
    setCartItems((prevItems) => {
      return prevItems.map(item => {
        if (item.product_id === productId && item.quantity > 1) {
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