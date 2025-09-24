import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient"; // Assuming you have a supabase client file

const CartContext = createContext();

export const useCart = () => {
  return useContext(CartContext);
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cartId, setCartId] = useState(null);
  const [userId, setUserId] = useState(null);

  // Function to fetch the user's cart from Supabase
  const fetchCart = async (currentUserId) => {
    setIsLoading(true);
    if (!currentUserId) {
      setCart([]);
      setCartId(null);
      setIsLoading(false);
      return;
    }
    
    try {
      // Find the user's cart or create a new one
      let { data: cartData, error: cartError } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', currentUserId)
        .single();
        
      if (cartError && cartError.code === 'PGRST116') {
          // If no cart is found, create a new one
          const { data: newCart, error: newCartError } = await supabase
            .from('carts')
            .insert([{ user_id: currentUserId }])
            .select('id')
            .single();

          if (newCartError) throw newCartError;
          cartData = newCart;
      } else if (cartError) {
          throw cartError;
      }

      setCartId(cartData.id);

      // Fetch the items in the cart, joining with the products table
      const { data: cartItems, error: itemsError } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          products (
            id,
            name,
            price,
            stock_quantity,
            image_url
          )
        `)
        .eq('cart_id', cartData.id);

      if (itemsError) throw itemsError;

      // Transform the data to match your current cart structure
      const formattedCart = cartItems.map(item => ({
        id: item.id,
        product: item.products,
        quantity: item.quantity,
      }));
      
      setCart(formattedCart);
    } catch (error) {
      console.error("Error fetching cart:", error);
      setCart([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for user authentication state changes
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user;
      setUserId(currentUser?.id || null);
      fetchCart(currentUser?.id || null);
    });
    
    // Cleanup the listener on component unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Function to add a product to the cart or update its quantity
  const addToCart = async (product, quantity) => {
    if (!userId || !cartId) {
      console.error("User or cart not found.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('cart_items')
        .upsert({
          cart_id: cartId,
          product_id: product.id,
          quantity: quantity,
        }, {
          onConflict: ['cart_id', 'product_id']
        });

      if (error) throw error;
      
      // Re-fetch the cart to update the local state with the latest data
      await fetchCart(userId);
    } catch (error) {
      console.error("Error adding to cart:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to update the quantity of a product in the cart
  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }

    if (!userId || !cartId) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('cart_id', cartId)
        .eq('product_id', productId);

      if (error) throw error;
      await fetchCart(userId);
    } catch (error) {
      console.error("Error updating quantity:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to remove a product from the cart
  const removeFromCart = async (productId) => {
    if (!userId || !cartId) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cartId)
        .eq('product_id', productId);

      if (error) throw error;
      await fetchCart(userId);
    } catch (error) {
      console.error("Error removing from cart:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to clear the entire cart
  const clearCart = async () => {
    if (!userId || !cartId) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cartId);

      if (error) throw error;
      await fetchCart(userId);
    } catch (error) {
      console.error("Error clearing cart:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    cart,
    isLoading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};