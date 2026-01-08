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
  const [expiresAt, setExpiresAt] = useState<Date | null>(
    passedExpiresAt ? new Date(passedExpiresAt) : null
  );

  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [percentRemaining, setPercentRemaining] = useState<number>(100);

  const shouldRelease = useRef(true);
  const productIdsRef = useRef<string[]>(productsInCart.map((p) => p.id));
  const reservationActive = useRef(!!reservationMade);
  const shouldBlockNavigation = useRef(true);
  const beforeUnloadHandler = useRef<((e: BeforeUnloadEvent) => void) | null>(null);
  
  const TOTAL_TIME = 60 * 60 * 1000;

  // Calculate totals
  const shipping = subtotal > 0 ? 5.0 : 0;
  const tax = subtotal / 5;
  const total = subtotal + shipping + tax;

  // Release function
  const releaseItems = async (source: string) => {
    if (shouldRelease.current && reservationActive.current) {
      console.log(`🚀 [${source}] Releasing reservation`);
      reservationActive.current = false;

      try {
        await customFetch.post("/release-reservations", {
          productIds: productIdsRef.current,
          userId: auth.currentUser?.uid || "guest",
        });
        console.log(`✅ [${source}] Released successfully`);
      } catch (err) {
        console.error(`❌ [${source}] Release failed:`, err);
      }
    }
  };

  // Block navigation attempts (unless shouldBlockNavigation is false)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => {
      return shouldBlockNavigation.current && currentLocation.pathname !== nextLocation.pathname;
    }
  );

  // Handle browser refresh, back button, close tab
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!shouldBlockNavigation.current) {
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

  // Timer
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const remaining = expiresAt.getTime() - Date.now();
      if (remaining <= 0) {
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

  // ✅ DON'T disable these until redirect actually happens
  // Just remove the beforeunload listener
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
      // ✅ Disable these RIGHT before redirect
      shouldBlockNavigation.current = false;
      shouldRelease.current = false;
      reservationActive.current = false;
      
      // Redirect immediately
      window.location.href = data.url;
    }
  } catch (error: any) {
    // Re-add beforeunload listener if checkout fails
    if (beforeUnloadHandler.current) {
      window.addEventListener("beforeunload", beforeUnloadHandler.current);
    }
    
    toast.error(error.response?.data?.error || "Checkout failed. Please try again.");
    setLoading(false);
  }
};

  // Re-enable blocking if user comes back from Stripe
useEffect(() => {
  // Check if we're returning from Stripe (no location state but cart has items)
  const isReturningFromStripe = !location.state?.reservationMade && productsInCart.length > 0;
  
  if (isReturningFromStripe) {
    console.log("👈 User returned from Stripe, re-enabling page protections");
    shouldBlockNavigation.current = true;
    shouldRelease.current = true;
    reservationActive.current = true;
    
    // Re-add beforeunload handler
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!shouldBlockNavigation.current) {
        return;
      }
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    
    beforeUnloadHandler.current = handleBeforeUnload;
    window.addEventListener("beforeunload", handleBeforeUnload);
  }
}, [location.state, productsInCart.length]);

  const formatTime = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const getColor = () => {
    if (percentRemaining > 50) return {bar: "bg-[#13341E]/70", text: "text-[#13341E]" };
    if (percentRemaining > 25) return {bar: "bg-[#eb9c35]/70", text: "text-[#eb9c35]" };
    return {bar: "bg-[#8a2b13]/70", text: "text-[#8a2b13]" };
  };

  const colors = getColor();

  // If no reservation, return null or redirect
  if (productsInCart.length === 0) {
    return (
      <div className="max-w-screen-2xl mx-auto px-5 py-24 text-center">
        <div className="font-eskool text-[#3a3d1c]">
          <h2 className="text-3xl mb-4">Your cart is empty</h2>
        
        </div>
      </div>
    );
  }
  return (
    <>
      {/* Navigation Blocker Modal */}
      {blocker.state === 'blocked' && (
        <div className="font-eskool fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">!!! Leave Checkout?</h2>
            </div>
            
            <p className="text-gray-700 mb-6">
              Are you sure you want to leave? Your reservation will be released and these items will become available to other shoppers.
            </p>

            <div className="bg-red-50 border border-red-200 rounded p-3 mb-6">
              <p className="text-sm text-red-800 font-semibold">
                ⏱ You have {formatTime(timeRemaining)} remaining
              </p>
            </div>

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

      <div className="max-w-screen-2xl mx-auto px-5 py-8">
        <div className="text-sm font-eskool p-2 bg-[#13341E]/20 rounded-md p-4 mb-6 border border-[#13341E]/60">
          <div className="flex items-start">
            <svg 
            className="inline-block w-[3em] h-[3em] mx-1 fill-current text-[#13341E]/70 align-middle -translate-x-[0.5em] -translate-y-[0.2em]"
            viewBox="0 0 600 579"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path transform="translate(0,579) scale(0.1,-0.1)" d="M2846 5755 c-11 -8 -27 -15 -36 -15 -20 0 -80 -55 -80 -73 0 -8 -12 -36 -26 -61 -15 -26 -24 -50 -21 -53 3 -3 -2 -28 -13 -57 -30 -82 -70 -218 -70 -236 0 -9 -4 -20 -8 -26 -5 -5 -14 -34 -21 -64 -7 -30 -19 -65 -27 -77 -8 -12 -14 -32 -14 -43 0 -11 -4 -28 -10 -38 -5 -9 -16 -48 -26 -87 -9 -38 -20 -75 -25 -81 -5 -6 -10 -30 -12 -52 -1 -23 -6 -44 -10 -48 -4 -4 -7 -15 -7 -25 0 -16 -24 -104 -40 -144 -4 -11 -14 -47 -21 -80 -7 -33 -18 -71 -25 -85 -6 -14 -17 -52 -24 -85 -6 -33 -16 -68 -21 -77 -5 -10 -9 -29 -9 -42 0 -13 -7 -37 -15 -52 -8 -16 -15 -39 -15 -51 0 -12 -6 -37 -14 -55 -8 -18 -27 -76 -41 -128 -14 -52 -31 -100 -37 -108 -21 -25 -89 -53 -141 -58 -29 -3 -63 -10 -77 -14 -14 -5 -43 -12 -65 -15 -22 -3 -56 -10 -75 -15 -87 -22 -337 -47 -565 -56 -71 -3 -148 -9 -170 -15 -22 -6 -112 -19 -200 -29 -88 -10 -180 -23 -205 -29 -93 -20 -207 -43 -257 -51 -28 -4 -57 -11 -63 -15 -6 -4 -60 -7 -119 -6 l-108 1 -51 -48 c-44 -40 -53 -54 -60 -99 -8 -46 -6 -71 14 -180 6 -32 70 -69 131 -78 61 -8 203 -92 289 -170 55 -50 67 -59 124 -93 30 -18 69 -47 85 -63 32 -32 129 -99 143 -99 5 0 21 -11 35 -24 14 -13 71 -47 126 -74 54 -27 114 -61 132 -75 19 -13 54 -35 79 -47 25 -12 74 -43 109 -67 36 -25 75 -49 88 -54 13 -5 23 -13 23 -18 0 -5 25 -22 56 -37 32 -15 69 -37 83 -49 14 -11 43 -29 64 -40 51 -26 117 -83 117 -100 0 -8 12 -26 26 -42 24 -26 25 -32 19 -98 -3 -38 -10 -93 -16 -120 -5 -28 -11 -66 -13 -85 -7 -55 -56 -283 -66 -305 -6 -11 -9 -29 -9 -40 0 -11 -6 -60 -15 -110 -8 -49 -18 -114 -21 -143 -4 -29 -13 -76 -21 -105 -8 -29 -19 -89 -24 -134 -4 -45 -13 -97 -18 -115 -6 -18 -13 -69 -17 -113 -3 -44 -15 -136 -26 -205 -11 -69 -23 -145 -26 -170 -3 -25 -14 -57 -24 -72 -11 -14 -19 -39 -19 -54 0 -42 37 -109 77 -140 30 -23 45 -27 102 -27 86 -1 134 18 191 74 26 26 58 50 71 54 24 8 169 145 169 162 1 4 43 42 94 83 52 41 98 82 102 91 11 19 163 154 220 195 91 64 140 101 190 144 29 25 76 63 105 85 29 22 92 75 140 118 48 42 92 77 97 77 5 0 15 13 22 30 17 41 55 63 94 56 17 -4 43 -6 57 -6 15 0 32 -7 39 -15 7 -8 17 -15 22 -15 5 0 35 -18 65 -40 31 -22 61 -40 67 -40 7 0 26 -13 44 -29 17 -16 40 -32 51 -36 11 -3 25 -12 31 -20 7 -8 22 -15 34 -15 12 0 35 -13 51 -30 16 -16 33 -30 38 -30 5 0 26 -13 46 -28 20 -16 43 -31 52 -35 10 -3 48 -28 86 -55 38 -27 91 -62 118 -77 27 -15 54 -33 60 -40 5 -8 24 -22 42 -32 17 -10 57 -34 89 -53 31 -19 65 -40 75 -46 11 -6 27 -17 36 -25 16 -13 39 -25 83 -43 50 -21 177 -106 186 -125 7 -13 41 -39 75 -59 53 -29 74 -35 124 -35 38 -1 69 5 85 15 14 9 37 18 52 22 48 11 85 61 91 125 3 31 9 72 12 91 5 28 1 43 -19 73 -14 21 -26 45 -26 54 0 9 -7 24 -16 34 -8 9 -22 47 -29 84 -8 37 -18 72 -23 79 -5 6 -12 25 -15 41 -15 77 -39 171 -57 223 -11 31 -22 71 -24 87 -6 41 -53 235 -76 315 -22 75 -43 172 -60 280 -7 41 -17 90 -22 109 -6 18 -11 80 -11 137 0 82 3 108 16 122 10 10 13 23 8 31 -9 13 20 85 39 96 6 4 21 23 34 43 13 21 61 75 107 120 373 371 651 642 658 642 6 0 13 9 16 21 4 11 22 27 41 35 19 8 34 19 34 24 0 6 7 10 15 10 9 0 27 11 40 24 12 13 39 33 59 45 20 12 44 33 55 47 10 13 23 24 27 24 5 1 27 19 49 40 22 22 55 47 75 57 35 19 66 50 104 106 18 26 22 45 20 92 -4 82 -9 102 -41 147 -33 48 -48 57 -124 69 -53 8 -66 7 -122 -15 -34 -14 -80 -25 -102 -25 -22 0 -310 -2 -640 -4 -330 -2 -640 -7 -690 -11 -121 -9 -278 19 -283 51 -2 11 -14 31 -28 44 -13 12 -24 28 -24 35 0 6 -7 18 -16 25 -9 7 -20 22 -25 34 -14 29 -33 61 -48 78 -7 9 -10 21 -7 26 4 6 -2 15 -12 20 -11 6 -22 23 -25 39 -3 16 -21 49 -40 74 -19 25 -40 61 -46 80 -6 20 -21 44 -31 53 -11 10 -20 24 -20 30 0 7 -20 49 -45 94 -25 45 -45 84 -45 87 0 6 -70 156 -102 219 -98 193 -128 253 -128 258 0 3 -18 45 -41 94 -23 48 -55 117 -71 153 -16 36 -47 100 -69 142 -48 96 -73 165 -70 201 1 15 -3 27 -9 27 -5 0 -10 15 -10 34 0 41 -31 83 -68 90 -80 15 -108 15 -126 1z"/>
          </svg>
            <div>
              <p className="font-bold text-[#13341E]/70 ">don't leave this page!</p>
              <p className="text-sm text-[#13341E]/50">
                If you leave, refresh, or close this page, your reservation will be released.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start items-center justify-between gap-6">
        <h1 className="font-eskool text-3xl text-[#13341E]font-bold mb-8">Checkout</h1>

        {/* Timer */}
        {expiresAt && timeRemaining > 0 && (
          <div className={`font-eskool px-4 py-4 rounded-lg mb-6`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div>
                  <p className={`text-sm text-[#13341E]`}>
                    time remaining on your reservation
                  </p>
                  <div className="flex items-start items-center justify-between gap-6 ">
                  <div className="w-full bg-black/10 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full ${colors.bar}`}
                    style={{ 
                      width: `${percentRemaining}%`,
                      transition: 'width 0.3s ease-out'
                    }}
                  />
                  </div>
                  <p className={` text-md text-right  ${colors.text} tabular-nums`} style={{ width: "5ch" }}>
                    {formatTime(timeRemaining)} 
                  </p>
                  </div>
                </div>
              </div>
              <div className={`text-right ${colors.text}`}>
              </div>
            </div>
          </div>
        )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white/50 p-6 rounded-lg">
            <h2 className="font-nightly text-3xl font-light mb-4">order summary</h2>
            
            <div className="font-eskool space-y-3">
              {productsInCart.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b border-[#3a3d1c]/20">
                  <div className="flex items-center gap-3">
                    <img 
                      src={item.images?.[0]} 
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div>
                        <Link
                          to={`/product/${item.id}`}
                          className="hover:underline hover:text-[#13341E]/60"
                        >
                          {item.title}
                        </Link>
                      {item.size && <p className="text-sm text-gray-600">Size: {item.size}</p>}
                      <p className="text-sm text-gray-600">Qty: {item.quantity || 1}</p>
                    </div>
                  </div>
                  <span className="text-[#13341E]/50">${(item.price * (item.quantity || 1)).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="font-eskool mt-6 space-y-4">
              <div className="flex justify-between border-b border-[#3a3d1c]/20 pb-2">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-[#3a3d1c]/20 pb-2">
                <span>Shipping:</span>
                <span>${shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-[#3a3d1c]/20 pb-2">
                <span>Tax:</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg text-[#3a3d1c]/80 pt-2 border-t-2 border-[#3a3d1c]">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="font-eskool bg-white/50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Payment</h2>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                You will be redirected to Stripe's secure payment page to complete your purchase.
              </p>

              <div className="bg-[#635BFF]/5 p-4 rounded-lg mb-4">
                <div className="flex items-center gap-3">
                    <p className="text-sm text-[#635BFF]">
                      Secure payment powered by{" "}
                      <a
                        href="https://stripe.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline hover:text-blue-600"
                      >
                        Stripe
                      </a>
                    </p>

                    <img
                      src="../../src/assets/stripe.jpeg"
                      alt="Stripe"
                      className="w-10"
                    />
                  </div>

              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading || productsInCart.length === 0}
              className="w-full bg-[#635BFF] text-white py-4 rounded-lg hover:bg-[#0A2540] disabled:bg-gray-400 disabled:opacity-50 text-lg  transition-colors shadow-lg"
            >
              {loading ? 'Processing...' : `Pay $${total.toFixed(2)}`}
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