import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAppDispatch } from "../hooks";
import { clearCart } from "../features/cart/cartSlice";
import { clearCartFromFirebase } from "../utils/cartSync";
import { auth } from "../firebase/config";

const OrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);

  const dispatch = useAppDispatch();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setVerifying(false);
        return;
      }

      try {
        // 1️⃣ Verify payment status from backend
        const response = await fetch(`http://localhost:5000/api/verify-session/${sessionId}`);
        const data = await response.json();
        console.log("Payment verification:", data);

        if (data.payment_status === 'paid') {
          setVerified(true);
          setCustomerEmail(data.customer_email || null);

          // 2️⃣ Clear frontend Redux cart
          dispatch(clearCart());

          // 3️⃣ Clear Firebase cart for logged-in user
          if (auth.currentUser) {
            await clearCartFromFirebase(auth.currentUser.uid);
          }

          // Optional: fetch updated product info from backend if needed
          // await fetchUpdatedProducts(data.productIds);

        } else {
          console.warn("Payment not completed for session:", sessionId);
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, dispatch]);

  if (verifying) {
    return (
      <div className="max-w-screen-2xl mx-auto px-5 py-16 text-center">
        <p>Verifying your payment...</p>
      </div>
    );
  }

  if (!verified) {
    return (
      <div className="max-w-screen-2xl mx-auto px-5 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Payment not found</h1>
        <Link to="/cart" className="text-blue-600 hover:underline">
          Return to Cart
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-5 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-6xl">✓</span>
          </div>
        </div>

        <h1 className="text-4xl font-bold mb-4">Order Confirmed!</h1>
        <p className="text-xl text-gray-600 mb-4">
          Thank you for your purchase{customerEmail ? `, ${customerEmail}` : ""}.
        </p>
        <p className="text-gray-600 mb-8">
          Your order has been successfully processed and your cart has been cleared.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            to="/order-history"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Order History
          </Link>
          <Link
            to="/shop"
            className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
