import { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../hooks";
import { clearCart } from "../features/cart/cartSlice";
import { auth } from "../firebase/config";
import toast from "react-hot-toast";

const Checkout = () => {
  const [loading, setLoading] = useState(false);
  const [reservedUntil, setReservedUntil] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>(""); // display countdown

  const { productsInCart, subtotal } = useAppSelector((state) => state.cart);
  const dispatch = useAppDispatch();

  // 🕒 Countdown timer logic
  useEffect(() => {
    if (!reservedUntil) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = reservedUntil.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("00:00");
        clearInterval(interval);
        releaseProducts(); // auto-release on timeout
        toast.error("Your hold on items expired.");
      } else {
        const minutes = Math.floor(diff / 1000 / 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft(
          `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reservedUntil]);

  // Release products on leaving page
  const releaseProducts = async () => {
    if (!auth.currentUser || productsInCart.length === 0) return;
    try {
      await fetch("http://localhost:5000/api/products/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: auth.currentUser.uid }),
      });
      console.log("Products released");
    } catch (err) {
      console.error("Failed to release products", err);
    }
  };

  useEffect(() => {
    window.addEventListener("beforeunload", releaseProducts);
    return () => window.removeEventListener("beforeunload", releaseProducts);
  }, [productsInCart]);

  const handleCheckout = async () => {
    if (!auth.currentUser) {
      toast.error("Please log in to checkout");
      return;
    }

    if (productsInCart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setLoading(true);
    try {
      const userId = auth.currentUser.uid;

      // 1️⃣ Reserve all products
      const reserveResponses = await Promise.all(
        productsInCart.map((product) =>
          fetch(`http://localhost:5000/api/products/${product.id}/reserve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid: userId }),
          }).then((res) => res.json())
        )
      );

      const failed = reserveResponses.find((r) => r.error);
      if (failed) {
        toast.error(failed.message || "Some items are unavailable");
        setLoading(false);
        return;
      }

      // Set the timer from the first product's reservedUntil
      const reservedTime = new Date(reserveResponses[0].reservedUntil);
      setReservedUntil(reservedTime);

      // 2️⃣ Create Stripe checkout session
      const response = await fetch(
        "http://localhost:5000/api/create-checkout-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: productsInCart,
            userId,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok || data.error) {
        toast.error(data.error || "Checkout failed");
        setLoading(false);
        return;
      }

      if (!data.url) {
        toast.error("Failed to create checkout session");
        setLoading(false);
        return;
      }

      // 3️⃣ Redirect to Stripe
      window.location.href = data.url;
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-5 pt-24">
      <h1 className="text-3xl font-bold mb-4">Checkout</h1>

      {reservedUntil && (
        <div className="mb-4 text-red-600 font-bold">
          ⏰ Hold expires in: {timeLeft}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

        {productsInCart.length === 0 ? (
          <p className="text-gray-500">Your cart is empty.</p>
        ) : (
          <>
            {productsInCart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between py-2 border-b last:border-b-0"
              >
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
              {loading ? "Processing..." : "Pay with Stripe"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Checkout;
