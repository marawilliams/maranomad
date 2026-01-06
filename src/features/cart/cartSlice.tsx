import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type CartState = {
  productsInCart: ProductInCart[];
  subtotal: number;
  userId: string | null;
  loading: boolean;
};

const initialState: CartState = {
  productsInCart: [],
  subtotal: 0,
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
    },
    
    addProductToTheCart: (state, action: PayloadAction<ProductInCart>) => {
      const product = state.productsInCart.find(
        (product) => product.id === action.payload.id
      );
      
      if (product) {
        return; // Don't add duplicates for one-of-a-kind items
      } else {
        state.productsInCart.push(action.payload);
      }
      cartSlice.caseReducers.calculateTotalPrice(state);
    },
    
    removeProductFromTheCart: (
      state,
      action: PayloadAction<{ id: string }>
    ) => {
      state.productsInCart = state.productsInCart.filter(
        (product) => product.id !== action.payload.id
      );
      cartSlice.caseReducers.calculateTotalPrice(state);
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
    },
  },
});

// Export ALL actions
export const {
  setUserId,
  setCartLoading,
  loadCartFromFirebase,
  addProductToTheCart,
  removeProductFromTheCart,
  updateProductQuantity,  // Make sure this is here
  calculateTotalPrice,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;