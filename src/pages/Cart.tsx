import {
  HiCheck as CheckIcon,
  HiXMark as XMarkIcon,
  HiQuestionMarkCircle as QuestionMarkCircleIcon,
  HiExclamationTriangle as ExclamationTriangleIcon,
} from "react-icons/hi2";
import { useAppDispatch, useAppSelector } from "../hooks";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { auth } from "../firebase/config";
import { useEffect, useState } from "react";
import { removeProductFromTheCart } from "../features/cart/cartSlice";
import customFetch from "../axios/custom";

const Cart = () => {
  const { productsInCart, subtotal } = useAppSelector((state) => state.cart);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [unavailableItems, setUnavailableItems] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [reserving, setReserving] = useState(false);

  // Check availability on cart change
  useEffect(() => {
    checkAvailability();
  }, [productsInCart]);

  const checkAvailability = async () => {
    if (productsInCart.length === 0) {
      setUnavailableItems([]);
      return;
    }

    setRefreshing(true);
    try {
      const ids = productsInCart.map(p => p.id).join(",");
      const uid = auth.currentUser?.uid || "guest";

      const response = await customFetch.get(
        `/products/availability?ids=${ids}&uid=${uid}`
      );

      setUnavailableItems(response.data.unavailableIds || []);
    } catch (err) {
      console.error("Availability check failed", err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCheckoutProcess = async () => {
    if (productsInCart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    const productIds = productsInCart.map(p => p.id);
    const userId = auth.currentUser?.uid || "guest";

    setReserving(true);
    toast.loading("Reserving items…", { id: "reserving" });

    try {
      const { data } = await customFetch.post("/reserve-products", {
        productIds,
        userId,
      });

      toast.dismiss("reserving");
      toast.success("Items reserved for 1 hour!");

      sessionStorage.setItem("checkout_expiresAt", data.expiresAt);

      navigate("/checkout", {
        state: {
          expiresAt: data.expiresAt,
          reservationMade: true,
        },
      });

    } catch (err: any) {
      toast.dismiss("reserving");

      if (err.response?.status === 409) {
        // Items that failed to reserve
        const unavailable = err.response.data?.unavailable || [];
        // Items that were successfully reserved and need rollback
        const reserved = err.response.data?.reserved || [];

        if (reserved.length > 0) {
          // Reverse partial reservations
          try {
            await customFetch.post("/reverse-reservation", {
              reserved,
              userId,
            });
            console.log(`↩️ Reversed ${reserved.length} partial reservations`);
          } catch (reverseErr) {
            console.error("❌ Failed to reverse reservations:", reverseErr);
          }
        }

        setUnavailableItems(unavailable);
        toast.error("Some items are no longer available. Reservations canceled for the rest.");

        // Recheck availability
        checkAvailability();
      } else {
        toast.error(err.response?.data?.error || "Failed to reserve items");
      }
    } finally {
      setReserving(false);
    }
  };

  return (
    <div className="font-eskool text-[#3a3d1c] bg-white/20 mx-auto max-w-screen-2xl px-5">
      <div className="pb-24 pt-16">
        <h1 className="text-3xl sm:text-4xl">Shopping Cart</h1>

        <div className="mt-6 rounded-md bg-[#757933]/10 p-4 border border-[#757933]/80">
          <div className="flex items-start items-center">
            <ExclamationTriangleIcon className="h-7 w-7 text-[#757933]" />
            <div className="ml-3 text-sm text-[#757933]">
              Items are not reserved until checkout. Once you proceed, items are reserved for <strong>1 hour</strong>. Only one person can reserve an item at a time.
            </div>
          </div>
        </div>

        <form className="mt-12 lg:grid lg:grid-cols-12 lg:gap-x-12">
          <section className="lg:col-span-7">
            <ul className="divide-y border-y">
              {productsInCart.length === 0 ? (
                <li className="py-10 text-center text-gray-500">Your cart is empty</li>
              ) : (
                productsInCart.map((product) => {
                  const isUnavailable = unavailableItems.includes(product.id);

                  return (
                    <li
                      key={product.id}
                      className={`flex py-6 transition ${isUnavailable ? "opacity-50 bg-red-50" : ""}`}
                    >
                      <img
                        src={product.images?.[0]}
                        className="h-24 w-24 sm:h-48 sm:w-48 rounded object-cover"
                        alt={product.title}
                      />

                      <div className="ml-4 flex flex-1 flex-col">
                        <div className="flex justify-between">
                          <h3>
                            <Link to={`/product/${product.id}`} className="hover:underline">
                              {product.title}
                            </Link>
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              dispatch(removeProductFromTheCart({ id: product.id }));
                              toast.error("Removed from cart");

                              setUnavailableItems((prev) => prev.filter(id => id !== product.id));
                              checkAvailability();
                            }}
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>

                        <p className="font-jetbrains text-sm">${product.price.toFixed(2)}</p>

                        <p className="mt-2 flex items-center text-sm">
                          {isUnavailable ? (
                            <>
                              <XMarkIcon className="h-4 w-4 text-red-600 mr-1" />
                              <span className="text-red-600 font-medium">Reserved by another user</span>
                            </>
                          ) : (
                            <>
                              <CheckIcon className="h-4 w-4 text-green-600 mr-1" />
                              Available
                            </>
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </section>

          <section className="font-jetbrains lg:col-span-5 bg-gray-50/40 p-6 rounded-lg mt-10 lg:mt-0">
            <h2 className="text-lg font-medium">Order Summary</h2>

            <dl className="mt-6 space-y-4">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>${subtotal.toFixed(2)}</dd>
              </div>

              <div className="flex justify-between border-t pt-4">
                <dt className="flex items-center">
                  Shipping
                  <a href="#" className="ml-2 text-gray-400">
                    <QuestionMarkCircleIcon className="h-5 w-5" />
                  </a>
                </dt>
                <dd>${subtotal === 0 ? "0.00" : "5.00"}</dd>
              </div>

              <div className="flex justify-between border-t pt-4 font-bold">
                <dt>Total</dt>
                <dd>${(subtotal === 0 ? 0 : subtotal + subtotal / 5 + 5).toFixed(2)}</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={handleCheckoutProcess}
              disabled={unavailableItems.length > 0 || refreshing || reserving || productsInCart.length === 0}
              className={`mt-6 w-full h-12 rounded-full text-white transition-all ${
                unavailableItems.length > 0 || reserving || productsInCart.length === 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#3a3d1c] hover:bg-[#3a3d1c]/80"
              }`}
            >
              {reserving ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Reserving...
                </span>
              ) : refreshing ? (
                "Checking availability..."
              ) : unavailableItems.length > 0 ? (
                "Remove reserved items first"
              ) : (
                "Proceed to Checkout"
              )}
            </button>

            {unavailableItems.length > 0 && (
              <p className="mt-2 text-sm text-red-600 text-center">
                {unavailableItems.length} item{unavailableItems.length > 1 ? "s are" : " is"} reserved by another user
              </p>
            )}
          </section>
        </form>
      </div>
    </div>
  );
};

export default Cart;
