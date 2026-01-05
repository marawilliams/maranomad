import { Link } from "react-router-dom";

const ProductItem = ({
  id,
  image,
  imageback,
  title,
  price,
}: {
  id: string;
  image: string;
  imageback: string;
  title: string;
  category: string;
  price: number;
  popularity: number;
  stock: number;
}) => {
  return (
    <div className="w-[400px] flex flex-col justify-center max-md:w-[300px]">
      <Link
        to={`/product/${id}`}
        className="group relative w-full aspect-square rounded-xl overflow-hidden transition-transform duration-500 hover:scale-105"
      >
        {/* Front image */}
        <img
          src={`/assets/${image}`}
          alt={title}
          className="absolute inset-0 h-full w-full object-contain transition-opacity duration-500 group-hover:opacity-0"
        />

        {/* Back image */}
        <img
          src={`/assets/${imageback}`}
          alt={`${title} back`}
          className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
      </Link>

      <Link
        to={`/product/${id}`}
        className="font-eskool font-normal text-[#3a3d1c] text-center text-lg tracking-[2px] max-md:text-md lowercase"
      >
        <h2>{title}</h2>
      </Link>

      <p className="font-eskool text-[#9e9f96] text-md text-center max-md:text-md">
        ${price}
      </p>
    </div>
  );
};

export default ProductItem;
