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
  _id: string;                // ✅ MongoDB uses _id, not id
  userId?: string;            // ✅ Optional for guest users
  customerEmail: string;      // ✅ Added email field
  
  products: {
    productId: string;
    title: string;
    quantity: number;
    price: number;
    size?: string;
  }[];

  subtotal: number;
  status: 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled'; // ✅ Changed from orderStatus
  
  // Tracking fields
  trackingNumber?: string;
  carrier?: string;
  trackingUrl?: string;
  shippedAt?: Date;

  shippingAddress: {        // ✅ Changed from 'data' to 'shippingAddress'
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

  paymentIntentId?: string;
  refundId?: string;

  paymentMethod?: {
    brand: string;
    last4: string;
    expMonth?: number;
    expYear?: number;
  };

  createdAt: Date;           // ✅ Changed from orderDate
}