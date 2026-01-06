import { useState } from "react";
import { useAppSelector, useAppDispatch } from "../hooks";
import { clearCart } from "../features/cart/cartSlice";
import { clearCartFromFirebase } from "../utils/cartSync";
import { auth } from "../firebase/config";
import toast from "react-hot-toast";

const Checkout = () => {
  const [loading, setLoading] = useState(false);
  const { productsInCart, subtotal } = useAppSelector((state) => state.cart);
  const dispatch = useAppDispatch();

  const handleCheckout = async () => {
    if (!auth.currentUser) {
      toast.error("Please log in to checkout");
      return;
    }

    console.log('🛒 Starting checkout with items:', productsInCart);
    console.log('👤 User ID:', auth.currentUser.uid);

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: productsInCart,
          userId: auth.currentUser.uid,
        }),
      });

      console.log('📡 Response status:', response.status);

      const data = await response.json();
      console.log('📥 Response data:', data);

      // Check if there's an error in the response
      if (!response.ok || data.error) {
        console.error('❌ Backend error:', data.error);
        toast.error(data.error || 'Checkout failed');
        return;
      }

      if (!data.url) {
        console.error('❌ No checkout URL received');
        toast.error('Failed to create checkout session');
        return;
      }

      console.log('✅ Redirecting to:', data.url);
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('❌ Checkout error:', error);
      toast.error('Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-5">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      
      {/* Order Summary */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
        
        {productsInCart.map((item) => (
          <div key={item.id} className="flex justify-between py-2">
            <span>{item.title}</span>
            <span>${item.price}</span>
          </div>
        ))}
        
        <div className="border-t mt-4 pt-4">
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>${subtotal}</span>
          </div>
        </div>

        <button
          onClick={handleCheckout}
          disabled={loading || productsInCart.length === 0}
          className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Pay with Stripe'}
        </button>
      </div>
    </div>
  );
};

export default Checkout;
