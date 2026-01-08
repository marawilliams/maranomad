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

  // ✅ Save expiresAt to sessionStorage whenever it changes
  useEffect(() => {
    if (expiresAt) {
      const isoString = expiresAt.toISOString();
      sessionStorage.setItem('checkout_expiresAt', isoString);
      console.log("💾 Saved timer to session:", isoString);
      console.log("💾 All sessionStorage keys:", Object.keys(sessionStorage));
      
      // Immediately verify it was saved
      const check = sessionStorage.getItem('checkout_expiresAt');
      if (check !== isoString) {
        console.error("❌ CRITICAL: Timer save verification failed!");
        console.error("Expected:", isoString);
        console.error("Got:", check);
      } else {
        console.log("✅ Timer save verified successfully");
      }
    } else {
      console.warn("⚠️ expiresAt is null, not saving to sessionStorage");
    }
  }, [expiresAt]);

  // ✅ NEW: Monitor sessionStorage for unexpected clears
  useEffect(() => {
    const checkTimer = setInterval(() => {
      if (expiresAt && !redirectingToStripe.current) {
        const stored = sessionStorage.getItem('checkout_expiresAt');
        if (!stored) {
          console.error("🚨 ALERT: Timer was removed from sessionStorage!");
          console.error("🚨 Current expiresAt state:", expiresAt);
          console.error("🚨 All sessionStorage keys:", Object.keys(sessionStorage));
          // Try to restore it
          sessionStorage.setItem('checkout_expiresAt', expiresAt.toISOString());
          console.log("🔧 Attempted to restore timer");
        }
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(checkTimer);
  }, [expiresAt]);

  // ✅ NEW: Log when component mounts
  useEffect(() => {
    console.log("🏁 Checkout component mounted");
    console.log("🏁 location.state:", location.state);
    console.log("🏁 passedExpiresAt:", passedExpiresAt);
    console.log("🏁 reservationMade:", reservationMade);
    console.log("🏁 Initial expiresAt state:", expiresAt);
    console.log("🏁 All sessionStorage on mount:", Object.keys(sessionStorage));
    console.log("🏁 checkout_expiresAt on mount:", sessionStorage.getItem('checkout_expiresAt'));
  }, []);

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

  // Handle browser refresh, back button, close tab
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!shouldBlockNavigation.current || redirectingToStripe.current) {
        return;
      }
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    beforeUnloadHandler.current = handleBeforeUnload;
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // ✅ NEW: Check if we're returning from Stripe cancel
  useEffect(() => {
    console.log("🔍 Checking for Stripe return...");
    console.log("🔍 All sessionStorage keys:", Object.keys(sessionStorage));
    console.log("🔍 checkout_expiresAt value:", sessionStorage.getItem('checkout_expiresAt'));
    
    const urlParams = new URLSearchParams(window.location.search);
    const fromStripeCancel = urlParams.get('from') === 'stripe_cancel';
    
    console.log("🔍 URL params:", window.location.search);
    console.log("🔍 fromStripeCancel:", fromStripeCancel);
    
    if (fromStripeCancel) {
      console.log("🔙 Returned from Stripe cancel");
      
      // Check if we have a valid timer
      const savedTimer = sessionStorage.getItem('checkout_expiresAt');
      console.log("🔍 savedTimer from sessionStorage:", savedTimer);
      
      if (savedTimer) {
        const restoredDate = new Date(savedTimer);
        const now = new Date();
        console.log("🔍 restoredDate:", restoredDate);
        console.log("🔍 now:", now);
        console.log("🔍 isValid:", restoredDate > now);
        
        if (restoredDate > now) {
          console.log("✅ Timer still valid, restoring:", savedTimer);
          setExpiresAt(restoredDate);
          
          // Calculate initial time remaining
          const remaining = restoredDate.getTime() - Date.now();
          setTimeRemaining(remaining);
          setPercentRemaining((remaining / TOTAL_TIME) * 100);
        } else {
          console.log("⚠️ Timer expired while at Stripe");
          toast.error("Your reservation expired. Please add items again.");
          sessionStorage.removeItem('checkout_expiresAt');
          navigate("/cart");
          return;
        }
      } else {
        console.log("⚠️ No timer found after returning from Stripe");
        console.log("⚠️ This means sessionStorage was cleared or timer wasn't saved");
        toast.error("Session lost. Please try again.");
        navigate("/cart");
        return;
      }
      
      // Clear the URL parameter
      window.history.replaceState({}, '', '/checkout');
      
      // Reset the redirecting flag
      redirectingToStripe.current = false;
      
      // Re-enable all protections
      shouldBlockNavigation.current = true;
      shouldRelease.current = true;
      reservationActive.current = true;
      
      // Re-add beforeunload handler
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (!shouldBlockNavigation.current || redirectingToStripe.current) {
          return;
        }
        e.preventDefault();
        e.returnValue = "";
        return "";
      };
      beforeUnloadHandler.current = handleBeforeUnload;
      window.addEventListener("beforeunload", handleBeforeUnload);
      
      setTimerInitialized(true);
    } else {
      // Normal load (not from Stripe)
      console.log("✅ Normal checkout load (not from Stripe)");
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
      
      console.log("⏱ Timer tick - Remaining:", remaining, "ms");

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
        error.response?.data?.error || "Checkout failed. Please try again."
      );
      setLoading(false);
    }
  };

  // ✅ NEW: Handle component unmount (when leaving checkout page)
  useEffect(() => {
    return () => {
      // Only release if NOT redirecting to Stripe
      if (!redirectingToStripe.current && reservationActive.current) {
        console.log("🚪 Component unmounting - releasing items");
        releaseItems("ComponentUnmount");
      }
    };
  }, []);

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-[#8a2b13]">
              ⚠️ Leave Checkout?
            </h2>
            <p className="mb-4">
              Are you sure you want to leave? Your reservation will be released
              and these items will become available to other shoppers.
            </p>
            <p className="mb-6 text-sm text-gray-600">
              ⏱ You have {formatTime(timeRemaining)} remaining
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => blocker.reset()}
                className="flex-1 bg-[#13341E]/70 text-white py-3 rounded-lg hover:bg-[#13341E]/50 transition-colors"
              >
                Stay & Complete Purchase
              </button>
              <button
                onClick={handleConfirmLeave}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Leave Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-yellow-800 font-semibold">
            ⚠️ don't leave this page!
          </p>
          <p className="text-yellow-700 text-sm">
            If you leave, refresh, or close this page, your reservation will be
            released.
          </p>
        </div>

        <h1 className="text-3xl font-bold mb-6">Checkout</h1>

        {/* Timer */}
        {expiresAt && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow">
            <p className="text-sm text-gray-600 mb-2 uppercase tracking-wide">
              time remaining on your reservation
            </p>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full ${colors.bar} transition-all duration-1000`}
                  style={{ width: `${percentRemaining}%` }}
                />
              </div>
              <p className={`text-2xl font-bold ${colors.text} min-w-[80px]`}>
                {timeRemaining > 0 ? formatTime(timeRemaining) : "0:00"}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
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
                  <h3 className="font-semibold">{item.title}</h3>
                  {item.size && (
                    <p className="text-sm text-gray-600">Size: {item.size}</p>
                  )}
                  <p className="text-sm text-gray-600">
                    Qty: {item.quantity || 1}
                  </p>
                </div>
                <p className="font-semibold">
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
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
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
              className="w-full bg-[#13341E] text-white py-4 rounded-lg font-semibold hover:bg-[#13341E]/90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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