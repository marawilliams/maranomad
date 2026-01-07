import {
  HiCheck as CheckIcon,
  HiXMark as XMarkIcon,
  HiQuestionMarkCircle as QuestionMarkCircleIcon,
  HiExclamationTriangle as ExclamationTriangleIcon,
} from "react-icons/hi2";
import { useAppDispatch, useAppSelector } from "../hooks";
import { Link, useNavigate } from "react-router-dom";
import {
  removeProductFromTheCart,
} from "../features/cart/cartSlice";
import toast from "react-hot-toast";
import { auth } from "../firebase/config";
import { useEffect, useState } from "react";

const Cart = () => {
  const { productsInCart, subtotal } = useAppSelector((state) => state.cart);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  // State to track which items are currently locked by other users
  const [unavailableItems, setUnavailableItems] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Check availability on mount
  useEffect(() => {
    checkAvailability();
  }, [productsInCart]);

// Inside Cart.tsx component

const checkAvailability = async () => {
  if (productsInCart.length === 0) return;
  setRefreshing(true);
  
  try {
    const ids = productsInCart.map(p => p.id).join(',');
    const userId = auth.currentUser?.uid || ""; // Get current User ID
    
    // Pass UID so the backend knows not to grey out items I reserved myself
    const response = await fetch(
      `http://localhost:5000/api/products/availability?ids=${ids}&uid=${userId}`
    );
    
    const data = await response.json();
    
    if (data.unavailableIds) {
      setUnavailableItems(data.unavailableIds);
    }
  } catch (error) {
    console.error("Failed to check availability", error);
  } finally {
    setRefreshing(false);
  }
};

  const handleCheckoutProcess = async () => {
    if (!auth.currentUser) {
      toast.error("Please log in to checkout");
      return;
    }

    if (productsInCart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // Block checkout if cart contains reserved items
    if (unavailableItems.length > 0) {
      toast.error("Please remove unavailable items before proceeding.");
      return;
    }

    try {
      const userId = auth.currentUser.uid;

      // Reserve all products first
      const reserveResponses = await Promise.all(
        productsInCart.map((product) =>
          fetch(`http://localhost:5000/api/products/${product.id}/reserve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // Send userId to lock the item for this specific user
            body: JSON.stringify({ uid: userId }), 
          }).then((res) => res.json())
        )
      );

      const failed = reserveResponses.find((r) => r.error);
      
      if (failed) {
        // Refresh visuals to show which one caused the error
        checkAvailability();
        toast.error(`Cannot reserve product: ${failed.message || "Item is held by another user"}`);
        return;
      }

      // If all products reserved successfully, go to checkout
      navigate("/checkout");
      
    } catch (err) {
      console.error("Reservation error:", err);
      toast.error("Failed to reserve products. Try again.");
    }
  };

  return (
    <div className="font-eskool text-[#3a3d1c] bg-white/50 mx-auto max-w-screen-2xl px-5 max-[400px]:px-3">
      <div className="pb-24 pt-16">
        <h1 className="text-3xl tracking-tight text-gray-900 sm:text-4xl">
          shopping cart
        </h1>

        {/* --- NEW WARNING BANNER --- */}
        <div className="mt-6 rounded-md bg-yellow-50 p-4 border border-yellow-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Items are not reserved yet
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Products in your cart are not protected. They are only reserved for 
                  <strong> 1 hour</strong> once you proceed to checkout.
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* ------------------------- */}

        <form className="mt-12 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12 xl:gap-x-16">
          <section aria-labelledby="cart-heading" className="lg:col-span-7">
            <h2 id="cart-heading" className="sr-only">
              items in your shopping cart
            </h2>

            <ul
              role="list"
              className="px-4 divide-y divide-gray-200 border-b border-t border-gray-200 hover:bg-[#3a3d1c]/10 transition-colors duration-100"
            >
              {productsInCart.map((product) => {
                const isUnavailable = unavailableItems.includes(product.id);

                return (
                  <li key={product.id} className={`flex py-6 sm:py-10 transition-opacity duration-300 ${isUnavailable ? 'opacity-50 bg-gray-100 grayscale' : ''}`}>
                    <div className="flex-shrink-0 relative">
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="h-24 w-24 object-cover object-center sm:h-48 sm:w-48 "
                      />
                      {/* Overlay for unavailable items */}
                      {isUnavailable && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-200/50">
                            <span className="bg-white px-2 py-1 text-xs font-bold text-red-600 border border-red-600 rounded">
                                HELD BY OTHER
                            </span>
                        </div>
                      )}
                    </div>

                    <div className="ml-4 flex flex-1 flex-col justify-between sm:ml-6 ">
                      <div className="relative pr-9 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:pr-0">
                        <div>
                          <div className="flex justify-between">
                            <h3 className="text-md hover:text-bold">
                              <Link
                                to={`/product/${product.id}`}
                                className=" text-gray-700 hover:text-[#3a3d1c] hover:font-semibold"
                              >
                                {product.title}
                              </Link>
                            </h3>
                          </div>
                          
                          {/* Availability Status Text */}
                          {isUnavailable ? (
                             <p className="mt-1 text-sm font-bold text-red-600">
                               Currently in checkout by another user.
                             </p>
                          ) : (
                            <div className="mt-1 flex text-sm">
                                <p className="text-gray-500">{product.color}</p>
                                {product.size ? (
                                <p className="ml-4 border-l border-gray-200 pl-4 text-gray-500">
                                    {product.size}
                                </p>
                                ) : null}
                            </div>
                          )}

                          <p className="mt-1 text-sm font-medium text-gray-900">
                            ${product.price}
                          </p>
                        </div>

                        <div className="mt-4 sm:mt-0 sm:pr-9">
                          <div className="absolute right-0 top-0">
                            <button
                              type="button"
                              className="-m-2 inline-flex p-2 text-gray-400 hover:text-gray-500"
                              onClick={() => {
                                dispatch(
                                  removeProductFromTheCart({ id: product?.id })
                                );
                                toast.error("Product removed from the cart");
                                // Update availability after removing an item
                                checkAvailability();
                              }}
                            >
                              <span className="sr-only">Remove</span>
                              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <p className="mt-4 flex space-x-2 text-sm text-gray-700">
                        {!isUnavailable && product?.stock ? (
                          <CheckIcon
                            className="h-5 w-5 flex-shrink-0 text-green-500"
                            aria-hidden="true"
                          />
                        ) : (
                          <XMarkIcon
                            className="h-5 w-5 flex-shrink-0 text-red-600"
                            aria-hidden="true"
                          />
                        )}

                        <span>
                          {isUnavailable 
                            ? "Unavailable at this time" 
                            : (product?.stock ? "In stock" : "Out of stock")
                          }
                        </span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Order summary */}
          <section
            aria-labelledby="summary-heading"
            className="mt-16 bg-gray-50 px-4 py-6 sm:p-6 lg:col-span-5 lg:mt-0 lg:p-8"
          >
            <h2
              id="summary-heading"
              className="text-lg font-medium text-gray-900"
            >
              Order summary
            </h2>

            <dl className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-600">Subtotal</dt>
                <dd className="text-sm font-medium text-gray-900">
                  ${subtotal}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                <dt className="flex items-center text-sm text-gray-600">
                  <span>Shipping estimate</span>
                  <a
                    href="#"
                    className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-500"
                  >
                    <QuestionMarkCircleIcon
                      className="h-5 w-5 text-[#3a3d1c]/70"
                      aria-hidden="true"
                    />
                  </a>
                </dt>
                <dd className="text-sm font-medium text-gray-900">
                  ${subtotal === 0 ? 0 : 5.0}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                <dt className="flex text-sm text-gray-600">
                  <span>Tax estimate</span>
                  <a
                    href="#"
                    className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-500"
                  >
                    <QuestionMarkCircleIcon
                      className="h-5 w-5 text-[#3a3d1c]/70"
                      aria-hidden="true"
                    />
                  </a>
                </dt>
                <dd className="text-sm font-medium text-gray-900">
                  ${subtotal / 5}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                <dt className="text-base font-medium text-gray-900">
                  Order total
                </dt>
                <dd className="text-base font-medium text-gray-900">
                  ${subtotal === 0 ? 0 : subtotal + subtotal / 5 + 5}
                </dd>
              </div>
            </dl>

            {productsInCart.length > 0 && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleCheckoutProcess}
                  disabled={unavailableItems.length > 0 || refreshing}
                  className={`rounded-full text-white/80 bg-[#3a3d1c]/90 text-center hover:bg-[#3a3d1c]/70 text-xl font-normal tracking-[0.6px] leading-[72px] w-full h-12 flex items-center justify-center max-md:text-base ${
                    (unavailableItems.length > 0 || refreshing) ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {unavailableItems.length > 0 ? "Remove Unavailable Items" : "Checkout"}
                </button>
              </div>
            )}
          </section>
        </form>
      </div>
    </div>
  );
};
export default Cart;