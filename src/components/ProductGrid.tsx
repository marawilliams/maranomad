import React from "react";
import ProductItem from "./ProductItem";
import { nanoid } from "nanoid";

const ProductGrid = ({ products }: { products?: Product[] }) => {
  return (
    <div
      id="gridTop"
className="max-w-screen-2xl flex flex-wrap justify-center items-center gap-5 mx-auto mt-12 px-5 max-[400px]:px-3"    >
      {products &&
        products.map((product: Product) => (
          <ProductItem
            key={nanoid()}
            id={product.id}
            image={product.image}
            imageback={product.imageback}
            title={product.title}
            category={product.category}
            price={product.price}
            popularity={product.popularity}
            stock={product.stock}
          />
        ))}
    </div>
  );
};
// Memoize the component to prevent unnecessary re-renders because of React.cloneElement
export default React.memo(ProductGrid);
