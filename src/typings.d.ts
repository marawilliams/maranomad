interface Product {
  _id: string;                 // MongoDB ID
  title: string;
  description?: string;
  category: string;
  price: number;
  stock: number;

  images: string[];            // unlimited images
  status: "for-sale" | "sold" | "not-for-sale";

  createdAt?: string;
  updatedAt?: string;
}

interface ProductInCart {
  id: string;
  title: string;
  category: string;
  price: number;
  quantity: number;
  size: string;
  color: string;
  stock: number;
  images: string[];       // keep full array
  image: string;          // first image
  imageback: string;      // second image or fallback
  status: "for-sale" | "not-for-sale" | "sold";
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
  id: number;
  orderStatus: string;
  orderDate: string;
  data: {
    email: string;
  };
  products: ProductInCart[];
  subtotal: number;
  user: {
    email: string;
    id: number;
  };
}
