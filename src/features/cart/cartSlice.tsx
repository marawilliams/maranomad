import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config"; // Import your Firebase config

// Async thunk to save cart to Firestore
export const saveCartToFirestore = createAsyncThunk(
  "cart/saveToFirestore",
  async ({ userId, productsInCart }: { userId: string; productsInCart: ProductInCart[] }) => {
    // Save the cart data to Firestore
    await setDoc(doc(db, "carts", userId), { productsInCart });
    return productsInCart; // Return the cart after it's saved
  }
);

// Async thunk to load cart from Firestore
export const loadCartFromFirestore = createAsyncThunk(
  "cart/loadFromFirestore",
  async (userId: string) => {
    // Get the cart from Firestore
    const docRef = doc(db, "carts", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data().productsInCart as ProductInCart[]; // Return the loaded cart
    } else {
      return []; // Return empty if no cart is found
    }
  }
);

type CartState = {
  productsInCart: ProductInCart[];
  subtotal: number;
  userId: string | null;
  loading: boolean;
};

// Local storage helpers to persist cart across reloads
const LOCAL_CART_KEY = "cart_items";

const loadCartFromLocalStorage = (): ProductInCart[] => {
  try {
    const raw = localStorage.getItem(LOCAL_CART_KEY);
    return raw ? (JSON.parse(raw) as ProductInCart[]) : [];
  } catch (err) {
    return [];
  }
};

const saveCartToLocalStorage = (cart: ProductInCart[]) => {
  try {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cart));
  } catch (err) {
    // ignore
  }
};

const _startingCart = loadCartFromLocalStorage();

const initialState: CartState = {
  productsInCart: _startingCart,
  subtotal: _startingCart.reduce(
    (acc, product) => acc + (product.price || 0) * (product.quantity || 0),
    0
  ),
  userId: null,
  loading: false,
};

export const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    setUserId: (state, action: PayloadAction<string | null>) => {
      state.userId = action.payload;
    },

    setCartLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    loadCartFromFirebase: (state, action: PayloadAction<ProductInCart[]>) => {
      state.productsInCart = action.payload;
      cartSlice.caseReducers.calculateTotalPrice(state);
      saveCartToLocalStorage(state.productsInCart);
    },

    addProductToTheCart: (state, action: PayloadAction<ProductInCart>) => {
      const incomingId = action.payload.id || (action.payload as any)._id;
      const productExists = state.productsInCart.find(
        (product) => product.id === incomingId
      );

      if (productExists) {
        return; // Don't add duplicates for one-of-a-kind items
      } else {
        state.productsInCart.push({
      ...action.payload,
      id: typeof incomingId === 'object' ? incomingId.$oid : incomingId
    });
      }
      cartSlice.caseReducers.calculateTotalPrice(state);
      saveCartToLocalStorage(state.productsInCart);
    },

    removeProductFromTheCart: (state, action: PayloadAction<{ id: string }>) => {
      state.productsInCart = state.productsInCart.filter(
        (product) => product.id !== action.payload.id
      );
      cartSlice.caseReducers.calculateTotalPrice(state);
      saveCartToLocalStorage(state.productsInCart);
    },

    updateProductQuantity: (
      state,
      action: PayloadAction<{ id: string; quantity: number }>
    ) => {
      state.productsInCart = state.productsInCart.map((product) => {
        if (product.id === action.payload.id) {
          return {
            ...product,
            quantity: action.payload.quantity,
          };
        }
        return product;
      });
      cartSlice.caseReducers.calculateTotalPrice(state);
      saveCartToLocalStorage(state.productsInCart);
    },

    calculateTotalPrice: (state) => {
      state.subtotal = state.productsInCart.reduce(
        (acc, product) => acc + product.price * product.quantity,
        0
      );
    },

    clearCart: (state) => {
      state.productsInCart = [];
      state.subtotal = 0;
      try {
        localStorage.removeItem(LOCAL_CART_KEY);
      } catch (err) {
        // ignore
      }
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(loadCartFromFirestore.fulfilled, (state, action) => {
        state.productsInCart = action.payload;
        cartSlice.caseReducers.calculateTotalPrice(state);
        saveCartToLocalStorage(state.productsInCart);
      })
      .addCase(saveCartToFirestore.fulfilled, (state, action) => {
        state.productsInCart = action.payload;
        cartSlice.caseReducers.calculateTotalPrice(state);
        saveCartToLocalStorage(state.productsInCart);
      });
  },
});

// Export all actions
export const {
  setUserId,
  setCartLoading,
  loadCartFromFirebase,
  addProductToTheCart,
  removeProductFromTheCart,
  updateProductQuantity,
  calculateTotalPrice,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
