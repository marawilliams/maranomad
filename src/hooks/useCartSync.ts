import { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "./index";
import { loadCartFromFirebase as loadCart, setCartLoading } from "../features/cart/cartSlice";
import { saveCartToFirebase, loadCartFromFirebase } from "../utils/cartSync";
import { auth } from "../firebase/config";
import { onAuthStateChanged } from "firebase/auth";

export const useCartSync = () => {
  const dispatch = useAppDispatch();
  const { productsInCart, userId } = useAppSelector((state) => state.cart);

  // Listen to auth state and load cart when user logs in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        dispatch(setCartLoading(true));
        const cartItems = await loadCartFromFirebase(user.uid);
        dispatch(loadCart(cartItems));
        dispatch(setCartLoading(false));
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  // Save cart to Firebase whenever it changes
  useEffect(() => {
    if (userId) {
      saveCartToFirebase(userId, productsInCart);
    }
  }, [productsInCart, userId]);
};