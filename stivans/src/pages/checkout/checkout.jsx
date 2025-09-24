import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import { useCart } from "../../contexts/cartContext";

function php(amount) {
  const numericAmount = Number(amount) || 0;
  return (
    "₱" +
    numericAmount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

const Checkout = () => {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();

  // State for form inputs
  const [shippingInfo, setShippingInfo] = useState({
    fullName: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
    id: null,
  });

  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    id: null,
  });

  // State for fetched user data
  const [userAddresses, setUserAddresses] = useState([]);
  const [userPaymentMethods, setUserPaymentMethods] = useState([]);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);

  // State for form submission status
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoadingUserData(true);
      try {
        // Simulate an API call with mock data
        setTimeout(() => {
          const mockAddresses = [
            {
              id: "addr_1",
              address_line1: "123 Main Street",
              city: "Quezon City",
              postal_code: "1100",
              country: "Philippines",
              is_default: true,
            },
            {
              id: "addr_2",
              address_line1: "456 Side Street",
              city: "Manila",
              postal_code: "1000",
              country: "Philippines",
              is_default: false,
            },
          ];

          const mockPaymentMethods = [
            {
              id: "pm_1",
              card_type: "Visa",
              last4: "4242",
              exp_month: 12,
              exp_year: 2025,
              is_default: true,
            },
            {
              id: "pm_2",
              card_type: "Mastercard",
              last4: "1234",
              exp_month: 10,
              exp_year: 2026,
              is_default: false,
            },
          ];

          setUserAddresses(mockAddresses);
          setUserPaymentMethods(mockPaymentMethods);

          // Pre-fill the form with the default address and payment method
          const defaultAddress = mockAddresses.find((addr) => addr.is_default);
          if (defaultAddress) {
            setShippingInfo({
              fullName: "John Doe", // You'd fetch this from the user's profile
              address: defaultAddress.address_line1,
              city: defaultAddress.city,
              postalCode: defaultAddress.postal_code,
              country: defaultAddress.country,
              id: defaultAddress.id,
            });
          }

          const defaultPaymentMethod = mockPaymentMethods.find((pm) => pm.is_default);
          if (defaultPaymentMethod) {
            setPaymentInfo({
              cardNumber: `************${defaultPaymentMethod.last4}`,
              expiryDate: `${defaultPaymentMethod.exp_month}/${defaultPaymentMethod.exp_year.toString().slice(-2)}`,
              cvv: "", // CVV is never stored, so it remains empty
              id: defaultPaymentMethod.id,
            });
          }
        }, 1500);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      } finally {
        setIsLoadingUserData(false);
      }
    };

    fetchUserData();
  }, []);

  // Calculate order details from cart
  const subtotal = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );
  const tax = subtotal * 0.12;
  const shipping = subtotal > 2000 ? 0 : 150;
  const total = subtotal + tax + shipping;

  const handleCheckout = (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setCheckoutMessage("");
    setIsSuccess(false);

    // Simulate a successful API call
    setTimeout(() => {
      console.log("Processing order...");
      console.log("Selected Address ID:", shippingInfo.id);
      console.log("Selected Payment Method ID:", paymentInfo.id);
      console.log("Order Details:", { subtotal, tax, shipping, total });

      // After a successful "API" call:
      setIsProcessing(false);
      setIsSuccess(true);
      setCheckoutMessage("Your order has been placed successfully!");

      // Clear the cart after a successful order
      clearCart();

      // Navigate to a confirmation page or home page after a delay
      setTimeout(() => {
        navigate("/");
      }, 3000);
    }, 2000); // Simulate network delay
  };

  return (
    <>
      <Header />
      <div className="checkout-page-container flex flex-col items-center p-6 bg-gray-100 min-h-screen">
        <div className="w-full max-w-5xl">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Checkout</h1>
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column: Forms */}
            <div className="flex-1 bg-white p-8 rounded-lg shadow-lg">
              <form onSubmit={handleCheckout}>
                <h2 className="text-2xl font-semibold mb-4 text-gray-700">Shipping Information</h2>
                <div className="mb-6">
                  <label className="block text-gray-600 mb-1">Select Saved Address</label>
                  {isLoadingUserData ? (
                    <div className="p-2 text-gray-500">Loading addresses...</div>
                  ) : userAddresses.length > 0 ? (
                    <select
                      name="address"
                      onChange={(e) => {
                        const selectedAddress = userAddresses.find(
                          (addr) => addr.id === e.target.value
                        );
                        if (selectedAddress) {
                          setShippingInfo({
                            ...shippingInfo,
                            address: selectedAddress.address_line1,
                            city: selectedAddress.city,
                            postalCode: selectedAddress.postal_code,
                            country: selectedAddress.country,
                            id: selectedAddress.id,
                          });
                        } else {
                          // Handle manual entry if "New Address" is selected
                          setShippingInfo({
                            fullName: "", address: "", city: "", postalCode: "", country: "", id: null,
                          });
                        }
                      }}
                      required
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-200"
                      value={shippingInfo.id || ""}
                    >
                      <option value="">Select an address or fill out a new one</option>
                      {userAddresses.map((addr) => (
                        <option key={addr.id} value={addr.id}>
                          {addr.address_line1}, {addr.city}
                        </option>
                      ))}
                      <option value="new">Add a New Address</option>
                    </select>
                  ) : (
                    <div className="p-2 text-gray-500">No saved addresses found. Please enter a new address below.</div>
                  )}
                </div>

                {/* Manual Address Inputs */}
                {(shippingInfo.id === null || shippingInfo.id === "new") && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
                    <div>
                      <label className="block text-gray-600 mb-1">Full Name</label>
                      <input
                        type="text"
                        name="fullName"
                        value={shippingInfo.fullName}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })}
                        required
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-200"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-gray-600 mb-1">Address</label>
                      <input
                        type="text"
                        name="address"
                        value={shippingInfo.address}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                        required
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-200"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">City</label>
                      <input
                        type="text"
                        name="city"
                        value={shippingInfo.city}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                        required
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-200"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">Postal Code</label>
                      <input
                        type="text"
                        name="postalCode"
                        value={shippingInfo.postalCode}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, postalCode: e.target.value })}
                        required
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-200"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-gray-600 mb-1">Country</label>
                      <input
                        type="text"
                        name="country"
                        value={shippingInfo.country}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, country: e.target.value })}
                        required
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-200"
                      />
                    </div>
                  </div>
                )}
                
                <h2 className="text-2xl font-semibold mb-4 text-gray-700">Payment Information</h2>
                <div className="mb-6">
                  <label className="block text-gray-600 mb-1">Select Saved Card</label>
                  {isLoadingUserData ? (
                    <div className="p-2 text-gray-500">Loading payment methods...</div>
                  ) : userPaymentMethods.length > 0 ? (
                    <select
                      name="paymentMethod"
                      onChange={(e) => {
                        const selectedMethod = userPaymentMethods.find(
                          (pm) => pm.id === e.target.value
                        );
                        if (selectedMethod) {
                          setPaymentInfo({
                            ...paymentInfo,
                            cardNumber: `************${selectedMethod.last4}`,
                            expiryDate: `${selectedMethod.exp_month}/${selectedMethod.exp_year.toString().slice(-2)}`,
                            cvv: "",
                            id: selectedMethod.id,
                          });
                        } else {
                          setPaymentInfo({ cardNumber: "", expiryDate: "", cvv: "", id: null });
                        }
                      }}
                      required
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-200"
                      value={paymentInfo.id || ""}
                    >
                      <option value="">Select a card or enter a new one</option>
                      {userPaymentMethods.map((pm) => (
                        <option key={pm.id} value={pm.id}>
                          {pm.card_type} ending in {pm.last4}
                        </option>
                      ))}
                      <option value="new">Add a New Card</option>
                    </select>
                  ) : (
                    <div className="p-2 text-gray-500">No saved cards found. Please enter a new card below.</div>
                  )}
                </div>

                {/* Manual Payment Inputs */}
                {(paymentInfo.id === null || paymentInfo.id === "new") && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-gray-600 mb-1">Card Number</label>
                      <input
                        type="text"
                        name="cardNumber"
                        value={paymentInfo.cardNumber}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, cardNumber: e.target.value })}
                        required
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-200"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">Expiry Date (MM/YY)</label>
                      <input
                        type="text"
                        name="expiryDate"
                        value={paymentInfo.expiryDate}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, expiryDate: e.target.value })}
                        placeholder="MM/YY"
                        required
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-200"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">CVV</label>
                      <input
                        type="text"
                        name="cvv"
                        value={paymentInfo.cvv}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, cvv: e.target.value })}
                        required
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-200"
                      />
                    </div>
                  </div>
                )}
                
                {checkoutMessage && (
                  <div className={`mt-4 p-4 rounded-md text-center ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {checkoutMessage}
                  </div>
                )}
                
                <button
                  type="submit"
                  className="w-full mt-6 py-3 px-6 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition duration-300"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : `Place Order - ${php(total)}`}
                </button>
              </form>
            </div>

            {/* Right Column: Order Summary */}
            <div className="w-full lg:w-1/3 bg-white p-8 rounded-lg shadow-lg">
              <h2 className="text-2xl font-semibold text-gray-700 mb-4">Order Summary</h2>
              <ul className="divide-y divide-gray-200">
                {cart.map((item) => (
                  <li key={item.product.id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg mr-4"
                      />
                      <div>
                        <h3 className="text-gray-800 font-semibold">{item.product.name}</h3>
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <span className="text-gray-800 font-semibold">
                      {php(item.product.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{php(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (12%)</span>
                  <span>{php(tax)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? "Free" : php(shipping)}</span>
                </div>
                <div className="flex justify-between text-gray-800 font-bold text-lg border-t border-gray-300 pt-2">
                  <span>Total</span>
                  <span>{php(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Checkout;