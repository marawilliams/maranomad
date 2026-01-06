import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

// Save cart to Firebase
export const saveCartToFirebase = async (
  userId: string,
  cart: ProductInCart[]
) => {
  try {
    const cartRef = doc(db, "carts", userId);
    await setDoc(cartRef, {
      items: cart,
      updatedAt: new Date().toISOString(),
    });
    console.log("Cart saved to Firebase");
  } catch (error) {
    console.error("Error saving cart:", error);
  }
};

// Load cart from Firebase
export const loadCartFromFirebase = async (
  userId: string
): Promise<ProductInCart[]> => {
  try {
    const cartRef = doc(db, "carts", userId);
    const cartSnap = await getDoc(cartRef);

    if (cartSnap.exists()) {
      return cartSnap.data().items || [];
    }
    return [];
  } catch (error) {
    console.error("Error loading cart:", error);
    return [];
  }
};

// Clear cart from Firebase
export const clearCartFromFirebase = async (userId: string) => {
  try {
    const cartRef = doc(db, "carts", userId);
    await setDoc(cartRef, {
      items: [],
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error clearing cart:", error);
  }
};