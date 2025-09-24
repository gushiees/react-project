import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    // Load cart from localStorage on initial render
    try {
      const storedCart = localStorage.getItem("stivans_cart");
      return storedCart ? JSON.parse(storedCart) : [];
    } catch (e) {
      console.error("Failed to load cart from localStorage", e);
      return [];
    }
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("stivans_cart", JSON.stringify(cart));
    } catch (e) {
      console.error("Failed to save cart to localStorage", e);
    }
  }, [cart]);

  const addToCart = (product, quantity) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (item) => item.product.id === product.id
      );

      // Check if product is already in the cart
      if (existingItemIndex > -1) {
        const existingItem = prevCart[existingItemIndex];
        const newQuantity = existingItem.quantity + quantity;

        // **Prevent adding more than available stock**
        if (newQuantity > existingItem.product.stock_quantity) {
          alert(`You can't add more than the available stock. Only ${existingItem.product.stock_quantity} left.`);
          return prevCart;
        }

        const newCart = [...prevCart];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: newQuantity,
        };
        return newCart;
      } else {
        // **Prevent adding a product with zero stock**
        if (product.stock_quantity === 0) {
          alert("This product is currently out of stock.");
          return prevCart;
        }
        return [...prevCart, { product, quantity }];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    setCart((prevCart) => {
      const itemToUpdate = prevCart.find((item) => item.product.id === productId);

      if (itemToUpdate) {
        // **Ensure new quantity doesn't exceed available stock**
        const effectiveQuantity = Math.min(newQuantity, itemToUpdate.product.stock_quantity);

        if (effectiveQuantity <= 0) {
          return prevCart.filter((item) => item.product.id !== productId);
        }

        return prevCart.map((item) =>
          item.product.id === productId ? { ...item, quantity: effectiveQuantity } : item
        );
      }
      return prevCart;
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};