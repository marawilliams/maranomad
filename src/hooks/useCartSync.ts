import { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "./index";
import { loadCartFromFirebase as loadCart, setCartLoading, setUserId } from "../features/cart/cartSlice";
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
        const firebaseCart = await loadCartFromFirebase(user.uid);

        // If firebase has no cart but localStorage does, push local to firebase
        try {
          const raw = localStorage.getItem("cart_items");
          const localCart: ProductInCart[] = raw ? JSON.parse(raw) : [];

          if ((firebaseCart?.length || 0) === 0 && localCart.length > 0) {
            await saveCartToFirebase(user.uid, localCart);
            dispatch(loadCart(localCart));
          } else {
            dispatch(loadCart(firebaseCart));
          }
        } catch (err) {
          dispatch(loadCart(firebaseCart));
        }

        dispatch(setUserId(user.uid));
        dispatch(setCartLoading(false));
      } else {
        dispatch(setUserId(null));
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