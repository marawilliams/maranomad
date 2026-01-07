import { useState, useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "../hooks";
import { clearCart } from "../features/cart/cartSlice";
import { auth } from "../firebase/config";
import toast from "react-hot-toast";
import customFetch from "../axios/custom";
import { useNavigate, useLocation } from "react-router-dom";

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const { productsInCart, subtotal } = useAppSelector((state) => state.cart);

  const passedExpiresAt = location.state?.expiresAt;
  const reservationMade = location.state?.reservationMade;

  const [loading, setLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(
    passedExpiresAt ? new Date(passedExpiresAt) : null
  );
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [percentRemaining, setPercentRemaining] = useState<number>(100);

  // Refs to track state for cleanup without triggering re-renders
  const shouldRelease = useRef(true);
  const productIdsRef = useRef<string[]>(productsInCart.map((p) => p.id));
  const reservationActive = useRef(!!reservationMade);
  
  const TOTAL_TIME = 60 * 60 * 1000;

  useEffect(() => {
    if (!reservationMade || !passedExpiresAt || productsInCart.length === 0) {
      toast.error("Invalid session. Redirecting to cart...");
      navigate("/cart");
    }
  }, [reservationMade, passedExpiresAt, productsInCart.length, navigate]);


// ✅ 1. The Logic to fire the request
const releaseItems = async (source: string) => {
  if (shouldRelease.current && reservationActive.current && auth.currentUser) {
    console.log(`🚀 [${source}] Starting release for:`, productIdsRef.current);

    const body = JSON.stringify({
      productIds: productIdsRef.current,
      userId: auth.currentUser.uid,
    });

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // We use native fetch + keepalive: true
    // This is the "magic" that lets the request finish after the tab closes
    fetch(`${baseUrl}/release-reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true, 
    }).catch(err => console.error("Fetch Error:", err));
  }
};

// ✅ 2. The Listeners
useEffect(() => {
  const handleUnload = () => {
    releaseItems("BeforeUnload/TabClose");
  };

  // This catches browser-level events (Refresh/Close Tab)
  window.addEventListener("beforeunload", handleUnload);

  return () => {
    // This catches React-level events (Navigating back to Cart)
    releaseItems("ReactUnmount");
    window.removeEventListener("beforeunload", handleUnload);
  };
}, []);

  // ✅ 3. Timer Logic
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = expiresAt.getTime() - now;

      if (remaining <= 0) {
        setTimeRemaining(0);
        setPercentRemaining(0);
        reservationActive.current = false; 
        toast.error("Reservation expired!");
        navigate("/cart");
      } else {
        setTimeRemaining(remaining);
        const percent = (remaining / TOTAL_TIME) * 100;
        setPercentRemaining(Math.max(0, Math.min(100, percent)));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, navigate]);

  const handleCheckout = async () => {
    if (!auth.currentUser) {
      toast.error("Please log in");
      return;
    }

    setLoading(true);

    try {
      const { data } = await customFetch.post("/create-checkout-session", {
        items: productsInCart.map((item) => ({
          id: item.id,
          title: item.title,
          price: item.price,
          quantity: item.quantity ?? 1,
        })),
        userId: auth.currentUser.uid,
      });

      if (data.url) {
        // ✅ Stop the cleanup from firing because we are paying!
        shouldRelease.current = false;
        dispatch(clearCart());
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error("Checkout failed");
      setLoading(false);
    }
  };

  const formatTimeRemaining = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  if (productsInCart.length === 0) return null;

  return (
    <div className="max-w-screen-lg mx-auto px-5 py-24">
      <button onClick={() => navigate("/cart")} className="mb-4 text-gray-600 hover:underline">
        ← Back to Cart
      </button>

      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <h1 className="text-2xl font-bold mb-4">Checkout</h1>
        
        {/* Timer Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1 font-medium text-red-600">
            <span>Reservation expires in: {formatTimeRemaining(timeRemaining)}</span>
            <span>{Math.floor(percentRemaining)}%</span>
          </div>
          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-red-500 h-full transition-all duration-1000 ease-linear"
              style={{ width: `${percentRemaining}%` }}
            />
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4 border-t pt-4">
          {productsInCart.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>{item.title} x {item.quantity || 1}</span>
              <span className="font-bold">${(item.price * (item.quantity || 1)).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between text-xl font-bold border-t pt-4">
            <span>Total</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full mt-8 bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Loading..." : "Proceed to Payment"}
        </button>
      </div>
    </div>
  );
};

export default Checkout;