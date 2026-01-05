import React from "react";
import ProductItem from "./ProductItem";

const ProductGrid = ({ products }: { products?: Product[] }) => {
  return (
    <div
      id="gridTop"
      className="max-w-screen-2xl flex flex-wrap justify-center items-center gap-5 mx-auto mt-12 px-5 max-[400px]:px-3"
    >
      {products &&
        products.map((product: Product) => {
          const image = product.images[0];
          const imageback = product.images[1] ?? product.images[0];

          return (
            <ProductItem
              key={product._id}
              id={product._id}
              image={image}
              imageback={imageback}
              title={product.title}
              category={product.category}
              price={product.price}
              status={product.status}
              stock={product.stock}
            />
          );
        })}
    </div>
  );
};

export default React.memo(ProductGrid);
