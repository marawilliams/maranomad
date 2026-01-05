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
interface ProductInCart extends Product {
  id: string;        // unique cart id (can combine product id + size + color)
  quantity: number;
  size: string;
  color: string;
  stock: number;
  _id?: string;      // optional, optional because MongoDB provides it
  status?: "for-sale" | "not-for-sale" | "sold"; // optional, taken from Product
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
