interface Product {
  _id: string;                 // MongoDB ID
  title: string;
  description?: string;
  category: string;
  price: number;
  stock: number;

  images: string[];            // unlimited images
  status: "for-sale" | "sold" | "not-for-sale";
  size: string;
  brand: string;
  createdAt?: string;
  updatedAt?: string;
}
interface ProductInCart extends Product {
  id: string;        // unique cart id (can combine product id + size + color)
  quantity: number;
  size: string;
  color?: string;
  stock: number;
  _id?: string;      // optional, optional because MongoDB provides it
  status?: "for-sale" | "not-for-sale" | "sold"; // optional, taken from Product
  images: string[];
}




interface User {
  id: string;
  name: string;
  lastname: string;
  email: string;
  role: string;
  password: string;
}

interface Order {
  id: string;                 // MongoDB _id
  orderStatus: string;
  orderDate: string;
  subtotal: number;

  products: ProductInCart[];

  // Shipping (what you already show as `data`)
  data: {
    firstName: string;
    lastName: string;
    address: string;
    apartment?: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
    phone?: string;
  };

  // ✅ NEW: Payment summary (safe)
  paymentMethod?: {
    brand: string;
    last4: string;
    expMonth?: number;
    expYear?: number;
  };
}

