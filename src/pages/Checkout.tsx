import { useState, useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "../hooks";
import { clearCart } from "../features/cart/cartSlice";
import { auth } from "../firebase/config";
import toast from "react-hot-toast";
import customFetch from "../axios/custom";
import { useNavigate, useLocation, useBlocker } from "react-router-dom";
import { Link } from "react-router-dom";

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { productsInCart, subtotal } = useAppSelector((state) => state.cart);
  const passedExpiresAt = location.state?.expiresAt;
  const reservationMade = location.state?.reservationMade;
  const [loading, setLoading] = useState(false);
  const [timerInitialized, setTimerInitialized] = useState(false);

  // ✅ FIX: Initialize expiresAt with fallback to sessionStorage
  const [expiresAt, setExpiresAt] = useState<Date | null>(() => {
    if (passedExpiresAt) {
      console.log("✅ Using passed expiresAt:", passedExpiresAt);
      return new Date(passedExpiresAt);
    }
    // Try to restore from sessionStorage
    const savedExpiresAt = sessionStorage.getItem('checkout_expiresAt');
    if (savedExpiresAt) {
      const restoredDate = new Date(savedExpiresAt);
      if (restoredDate > new Date()) {
        console.log("✅ Restored timer from sessionStorage:", savedExpiresAt);
        return restoredDate;
      } else {
        console.log("⚠️ Saved timer expired, clearing");
        sessionStorage.removeItem('checkout_expiresAt');
      }
    }
    console.log("❌ No valid timer found");
    return null;
  });

  // ✅ FIX: Initialize timeRemaining based on expiresAt
  const [timeRemaining, setTimeRemaining] = useState(() => {
    if (!expiresAt) return 0;
    const remaining = new Date(expiresAt).getTime() - Date.now();
    return remaining > 0 ? remaining : 0;
  });

  const [percentRemaining, setPercentRemaining] = useState(() => {
    if (!expiresAt) return 100;
    const remaining = new Date(expiresAt).getTime() - Date.now();
    const TOTAL_TIME = 60 * 60 * 1000;
    return remaining > 0 ? (remaining / TOTAL_TIME) * 100 : 0;
  });
  
  // ✅ NEW: Track if we're in the process of redirecting to Stripe
  const redirectingToStripe = useRef(false);
  
  // ✅ FIXED: These should always start as true if we have items
  const shouldRelease = useRef(true);
  const productIdsRef = useRef(productsInCart.map((p) => p.id));
  const reservationActive = useRef(!!reservationMade || !!expiresAt);
  const shouldBlockNavigation = useRef(true);
  const beforeUnloadHandler = useRef<((e: BeforeUnloadEvent) => void) | null>(null);

  const TOTAL_TIME = 60 * 60 * 1000;

  // Calculate totals
  const shipping = subtotal > 0 ? 5.0 : 0;
  const tax = subtotal / 5;
  const total = subtotal + shipping + tax;
  // Add at the top of your useEffect for beforeunload:
useEffect(() => {
  // Store page load time for refresh detection
  sessionStorage.setItem("checkoutPageLoadTime", Date.now().toString());

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (!redirectingToStripe.current && productsInCart.length > 0 && auth.currentUser) {
      const now = Date.now();
      const loadTime = Number(sessionStorage.getItem("checkoutPageLoadTime")) || now;

      if (now - loadTime > 2000) { // >2s => probably tab close
        // Use navigator.sendBeacon for reliable release
        const data = JSON.stringify({
          productIds: productIdsRef.current,
          userId: auth.currentUser.uid,
        });
        navigator.sendBeacon("/api/release-reservations", data);
        reservationActive.current = false;
        sessionStorage.removeItem("checkout_expiresAt");
        console.log("🚀 Released items via sendBeacon on tab close");
      } else {
        console.log("⏱ Likely refresh, not releasing items");
      }
    }

    // Optional: warning dialog
    if (!shouldBlockNavigation.current || redirectingToStripe.current) return;
    e.preventDefault();
    e.returnValue = "";
    return "";
  };

  beforeUnloadHandler.current = handleBeforeUnload;
  window.addEventListener("beforeunload", handleBeforeUnload);

  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload);

    // Keep your original unmount fetch (for navigation)
    if (!redirectingToStripe.current && productsInCart.length > 0 && auth.currentUser) {
      console.log("🧹 Component unmounting (navigation), releasing items");

      const releaseData = JSON.stringify({
        productIds: productIdsRef.current,
        userId: auth.currentUser.uid,
      });

      fetch("/api/release-reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: releaseData,
        keepalive: true,
      }).catch((err) => console.error("❌ Release failed:", err));

      sessionStorage.removeItem("checkout_expiresAt");
    }
  };
}, []);

  
  // ✅ Save expiresAt to sessionStorage whenever it changes
  useEffect(() => {
    if (expiresAt) {
      const isoString = expiresAt.toISOString();
      sessionStorage.setItem('checkout_expiresAt', isoString);
      console.log("💾 Saved timer to session:", isoString);
    }
  }, [expiresAt]);

  // ✅ NEW: Log when component mounts
  useEffect(() => {
    console.log("🏁 Checkout component mounted");
    console.log("🏁 Initial expiresAt state:", expiresAt);
  }, []);

  const releaseItemsBeacon = () => {
  if (!reservationActive.current) return;

  const data = JSON.stringify({
    productIds: productIdsRef.current,
    userId: auth.currentUser?.uid || "guest",
  });

  navigator.sendBeacon("/api/release-reservations", data);
  reservationActive.current = false;
  sessionStorage.removeItem("checkout_expiresAt");
  console.log("🚀 Released items via sendBeacon");
};

  // Release function
  const releaseItems = async (source: string) => {
    // ✅ FIXED: Don't release if we're redirecting to Stripe
    if (redirectingToStripe.current) {
      console.log(`⏭️ [${source}] Skipping release - redirecting to Stripe`);
      return;
    }

    if (shouldRelease.current && reservationActive.current) {
      console.log(`🚀 [${source}] Releasing reservation`);
      reservationActive.current = false;
      
      try {
        await customFetch.post("/release-reservations", {
          productIds: productIdsRef.current,
          userId: auth.currentUser?.uid || "guest",
        });
        console.log(`✅ [${source}] Released successfully`);
        sessionStorage.removeItem('checkout_expiresAt');
      } catch (err) {
        console.error(`❌ [${source}] Release failed:`, err);
      }
    }
  };

  // Block navigation attempts (unless shouldBlockNavigation is false)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => {
      return (
        shouldBlockNavigation.current &&
        currentLocation.pathname !== nextLocation.pathname
      );
    }
  );

  

  // ✅ FIXED: Check if we're returning from Stripe cancel
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromStripeCancel = urlParams.get('from') === 'stripe_cancel';
    
    if (fromStripeCancel) {
      console.log("🔙 Returned from Stripe cancel");
      
      // Clear the URL parameter
      window.history.replaceState({}, '', '/checkout');
      
      // Check if we have a valid timer
      const savedTimer = sessionStorage.getItem('checkout_expiresAt');
      
      if (savedTimer) {
        const restoredDate = new Date(savedTimer);
        const now = new Date();
        
        if (restoredDate > now) {
          console.log("✅ Timer still valid, keeping user on checkout");
          // Timer is already restored in useState initializer
          
          // Re-enable protections
          redirectingToStripe.current = false;
          shouldBlockNavigation.current = true;
          shouldRelease.current = true;
          reservationActive.current = true;
          
          setTimerInitialized(true);
        } else {
          console.log("⏰ Timer expired while at Stripe");
          toast.error("Your reservation expired. Please add items to cart again.");
          sessionStorage.removeItem('checkout_expiresAt');
          
          // Release items before redirecting
          if (productsInCart.length > 0 && auth.currentUser) {
            releaseItems("TimerExpired");
          }
          navigate("/cart");
          return;
        }
      } else {
        // ✅ NO TIMER: Release items and redirect to cart
        console.log("⚠️ No timer found, releasing items");
        
        if (productsInCart.length > 0 && auth.currentUser) {
          releaseItems("NoTimer").then(() => {
            toast.error("Session lost. Items have been released.");
            navigate("/cart");
          });
        } else {
          toast.error("Session lost. Please try again.");
          navigate("/cart");
        }
        return;
      }
    } else {
      // Normal load (not from Stripe)
      console.log("✅ Normal checkout load");
      setTimerInitialized(true);
    }
  }, [navigate]);

  // Timer effect
  useEffect(() => {
    if (!expiresAt) {
      console.log("⚠️ No expiresAt, timer not running");
      return;
    }

    console.log("⏰ Starting timer with expiresAt:", expiresAt);

    const updateTimer = () => {
      const now = Date.now();
      const expiresAtTime = expiresAt.getTime();
      const remaining = expiresAtTime - now;

      if (remaining <= 0) {
        console.log("⏰ Timer expired!");
        shouldBlockNavigation.current = false;
        shouldRelease.current = true;
        reservationActive.current = true;
        releaseItems("TimerExpired").then(() => {
          toast.error("Reservation expired!");
          navigate("/cart");
        });
      } else {
        setTimeRemaining(remaining);
        setPercentRemaining((remaining / TOTAL_TIME) * 100);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, navigate]);

  // Handle leaving - called when user confirms in blocker modal
  const handleConfirmLeave = async () => {
    shouldBlockNavigation.current = false;
    await releaseItems("UserConfirmed");
    if (blocker.proceed) {
      blocker.proceed();
    }
  };

  const handleCheckout = async () => {
    if (productsInCart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // ✅ IMPORTANT: Force save timer to sessionStorage before redirect
    if (expiresAt) {
      const timerValue = expiresAt.toISOString();
      sessionStorage.setItem('checkout_expiresAt', timerValue);
      console.log("🔒 FORCE SAVED timer before Stripe redirect:", timerValue);
      
      // Verify it was saved
      const verified = sessionStorage.getItem('checkout_expiresAt');
      console.log("🔍 VERIFIED timer in storage:", verified);
      
      if (!verified) {
        console.error("❌ CRITICAL: Timer failed to save to sessionStorage!");
        toast.error("Failed to save session. Please try again.");
        return;
      }
    } else {
      console.warn("⚠️ WARNING: No expiresAt to save before redirect!");
    }

    // ✅ Set the redirecting flag FIRST
    redirectingToStripe.current = true;
    
    // Remove the beforeunload listener
    if (beforeUnloadHandler.current) {
      window.removeEventListener("beforeunload", beforeUnloadHandler.current);
    }

    setLoading(true);

    try {
      const { data } = await customFetch.post("/create-checkout-session", {
        items: productsInCart.map((item) => ({
          id: item.id,
          title: item.title,
          price: item.price,
          images: item.images,
          quantity: item.quantity ?? 1,
          size: item.size ?? "",
          brand: item.brand ?? "",
        })),
        userId: auth.currentUser?.uid || null,
      });

      if (data.url) {
        // ✅ Disable blocking for navigation
        shouldBlockNavigation.current = false;
        
        // Double-check timer is still in storage
        const finalCheck = sessionStorage.getItem('checkout_expiresAt');
        console.log("🔄 Final check before redirect - Timer in storage:", finalCheck);
        
        console.log("🔄 Redirecting to Stripe now...");
        
        // Redirect immediately
        window.location.href = data.url;
      }
    } catch (error: any) {
      // ✅ Reset the flag if checkout fails
      redirectingToStripe.current = false;
      
      // Re-add beforeunload listener if checkout fails
      if (beforeUnloadHandler.current) {
        window.addEventListener("beforeunload", beforeUnloadHandler.current);
      }
      
      toast.error(
        "Checkout failed. Please try again."
      );
      setLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const getColor = () => {
    if (percentRemaining > 50)
      return { bar: "bg-[#13341E]/70", text: "text-[#13341E]" };
    if (percentRemaining > 25)
      return { bar: "bg-[#eb9c35]/70", text: "text-[#eb9c35]" };
    return { bar: "bg-[#8a2b13]/70", text: "text-[#8a2b13]" };
  };

  const colors = getColor();

  // If no reservation, return null or redirect
  if (productsInCart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
        <Link
          to="/shop"
          className="bg-[#13341E] text-white px-6 py-3 rounded-lg hover:bg-[#13341E]/80"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  // Show loading state while timer initializes
  if (!timerInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#13341E] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Navigation Blocker Modal */}
      {blocker.state === "blocked" && (
        <div className="font-eskool fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-[#8a2b13]">
              !!! Leaving Checkout?
            </h2>
            <p className="mb-4">
              Are you sure you want to leave? Your reservation will be released
              and these items will become available to other shoppers.
            </p>
            <p className="font-jetbrains mb-6 text-sm text-gray-600">
              ⏱ You have {formatTime(timeRemaining)} remaining
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => blocker.reset()}
                className="flex-1 bg-[#13341E]/70 text-white py-3 rounded-lg hover:bg-[#13341E]/50 transition-colors"
              >
                stay & complete purchase
              </button>
              <button
                onClick={handleConfirmLeave}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition-colors"
              >
                leave anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="font-eskool max-w-4xl mx-auto p-6">
        <div className="bg-[#757933]/10 border-l-4 border-[#757933] rounded-l rounded-lg p-4 mb-6">
          <p className="text-[#757933] font-semibold">
            don't leave this page!
          </p>
          <p className="text-[#757933]/90 text-sm">
            If you leave, refresh, or close this page, your reservation will be
            released.
          </p>
        </div>

        <div className=" flex justify-between items-center">
        <h1 className="text-3xl font-bold mb-6">Checkout</h1>

        {/* Timer */}
        {expiresAt && (
          <div className="mb-6 p-4 rounded-lg ">
            <p className="text-sm text-gray-600 tracking-wide">
              time remaining on your reservation
            </p>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full ${colors.bar} transition-all duration-1000`}
                  style={{ width: `${percentRemaining}%` }}
                />
              </div>
              <p className={`font-jetbrains text-md text-center font-bold ${colors.text} min-w-[80px]`}>
                {timeRemaining > 0 ? formatTime(timeRemaining) : "0:00"}
              </p>
            </div>
          </div>
        )}
        </div>


        <div className="text-[#454715] font-jetbrains bg-white/70 rounded-lg shadow p-6">
          {/* Order Summary */}
          <h2 className="text-xl font-semibold mb-4">order summary</h2>

          <div className="space-y-4 mb-6">
            {productsInCart.map((item) => (
              <div key={item.id} className="flex gap-4 pb-4 border-b">
                <img
                  src={item.images[0]}
                  alt={item.title}
                  className="w-20 h-20 object-cover rounded"
                />
                <div className="flex-1">
                   <h3>
                            <Link
                              to={`/product/${item.id}`}
                              className="hover:underline"
                            >
                              {item.title}
                            </Link>
                          </h3>
                  {item.size && (
                    <p className="text-sm text-gray-600">Size: {item.size}</p>
                  )}
                  <p className="text-sm text-gray-600">
                    Qty: {item.quantity || 1}
                  </p>
                </div>
                <p className="font-jetbrains text-[#13341E]/50">
                  ${(item.price * (item.quantity || 1)).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping:</span>
              <span>${shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex text-[#13341E]/40 justify-between text-lg pt-2 border-t">
              <span>Total:</span>
              <span className="font-jetbrains">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Section */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Payment</h2>
            <p className="text-sm text-gray-600 mb-4">
              You will be redirected to Stripe's secure payment page to complete
              your purchase.
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Secure payment powered by{" "}
              <span className="font-semibold">Stripe</span>
            </p>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-[#635bff] text-white py-4 rounded-lg hover:bg-[#0a2540]/90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-300"
            >
              {loading ? "Processing..." : `Pay $${total.toFixed(2)}`}
            </button>

            <p className="text-xs text-gray-500 mt-4 text-center">
              By completing this purchase, you agree to our terms and conditions.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Checkout;