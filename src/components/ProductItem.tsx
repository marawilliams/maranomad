import { Link } from "react-router-dom";

const ProductItem = ({
  id,
  image,
  title,
  price,
  popularity: _popularity,
  stock: _stock,
}: {
  id: string;
  image: string;
  title: string;
  category: string;
  price: number;
  popularity: number;
  stock: number;
}) => {
  return (
    <div className="w-[400px] flex flex-col gap-2 justify-center max-md:w-[300px]">
      <Link
        to={`/product/${id}`}
        className="w-full aspect-square overflow-hidden hover:scale-105 transition-transform duration-500"
      >
        <img src={`/assets/${image}`} alt={title} />
      </Link>
      <Link
        to={`/product/${id}`}
        className="text-[#3a3d1c] text-center font-light text-xl tracking-[2px] max-md:text-xl lowercase"
      >
        <h2>{title}</h2>
      </Link>
      <p className="text-black text-2xl text-center max-md:text-xl">
        ${price}
      </p>
    </div>
  );
};
export default ProductItem;
