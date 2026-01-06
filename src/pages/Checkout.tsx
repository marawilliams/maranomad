import { useState } from "react";
import { useAppSelector } from "../hooks";
import { auth } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const Checkout = () => {
  const [loading, setLoading] = useState(false);
  const { productsInCart, subtotal } = useAppSelector((state) => state.cart);
  const navigate = useNavigate();

  const shipping = subtotal > 0 ? 5.0 : 0;
  const tax = subtotal / 5;
  const total = subtotal + shipping + tax;

  const handleCheckout = async () => {
    if (!auth.currentUser) {
      toast.error("Please log in to checkout");
      navigate("/login");
      return;
    }

    if (productsInCart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

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

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Checkout failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-5 py-8">
      <h1 className="font-eskool text-3xl font-bold mb-8">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div className="bg-white/50 p-6 rounded-lg">
          <h2 className="font-nightly text-3xl font-light mb-4">order summary</h2>
          
          <div className="font-eskool space-y-3">
            {productsInCart.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-[#3a3d1c]/20">
                <div className="flex items-center gap-3">
                  <img 
                    src={item.images[0]} 
                    alt={item.title}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                  </div>
                </div>
                <span className="text-">${item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="font-eskool mt-6 space-y-4">
            <div className="flex justify-between border-b border-[#3a3d1c]/20" >
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-[#3a3d1c]/20">
              <span>Shipping:</span>
              <span>${shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between ">
              <span>Tax:</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between  text-lg pt-2 border-t border-[#3a3d1c]/20">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Section */}
        <div className="font-eskool bg-white/50 p-6 rounded-lg ">
          <h2 className="text-xl font-semibold mb-4">Payment</h2>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              You will be redirected to Stripe's secure payment page to complete your purchase.
            </p>
            
            <div className="bg-blue-50 bg-white/50 p-4 rounded-lg mb-4">
              <p className="text-sm text-blue-800">
                🔒 Secure payment powered by Stripe
              </p>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading || productsInCart.length === 0}
            className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-lg transition-colors"
          >
            {loading ? 'Processing...' : `Pay $${total.toFixed(2)}`}
          </button>

          <p className="text-xs text-gray-500 mt-4 text-center">
            By completing this purchase, you agree to our terms and conditions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Checkout;