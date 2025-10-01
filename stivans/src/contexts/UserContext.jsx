import React, { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);

  // Load user and cart from localStorage on initial render
  useEffect(() => {
    const storedUser = localStorage.getItem("stivans_user");
    const storedCart = localStorage.getItem("stivans_cart");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, []);

  // Save user and cart to localStorage whenever they change
  useEffect(() => {
    if (user) {
      localStorage.setItem("stivans_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("stivans_user");
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem("stivans_cart", JSON.stringify(cart));
  }, [cart]);

  const login = (userData) => setUser(userData);
  
  // This function no longer clears the cart
  const logout = () => {
    setUser(null);
  };

  const addToCart = (product, quantity) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (item) => item.product.id === product.id
      );

      if (existingItemIndex > -1) {
        const newCart = [...prevCart];
        const newQuantity = newCart[existingItemIndex].quantity + quantity;
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: newQuantity,
        };
        return newCart;
      } else {
        return [...prevCart, { product, quantity }];
      }
    });
  };

  return (
    <UserContext.Provider value={{ user, login, logout, cart, addToCart }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);