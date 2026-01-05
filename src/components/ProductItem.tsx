import { Link } from "react-router-dom";

const ProductItem = ({
  id,
  image,
  imageback,
  title,
  category,
  price,
  stock,
  status, // new
}: {
  id: string;
  image: string;
  imageback: string;
  title: string;
  category: string;
  price: number;
  stock: number;
  status: "for-sale" | "not-for-sale" | "sold";
}) => {
  // Determine price display
  const priceDisplay =
    status === "for-sale"
      ? `$${price}`
      : status === "sold"
      ? "sold"
      : "not for sale";

  return (
    <div className="w-[400px] flex flex-col justify-center max-md:w-[300px]">
      {/* Clickable wrapper */}
      <Link
        to={`/product/${id}`}
        className="group relative w-full aspect-square rounded-xl overflow-hidden transition-transform duration-500 hover:scale-105"
      >
        {/* Front image */}
        <img
          src={image}
          alt={title}
          className="absolute inset-0 h-full w-full object-contain transition-opacity duration-500 group-hover:opacity-0"
        />

        {/* Back image */}
        {imageback && (
          <img
            src={imageback}
            alt={`${title} back`}
            className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}

        {/* Optional overlay for not-for-sale */}
        {status === "not-for-sale" && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-[#d7d7d7]  text-xl">
            not for sale
          </div>
        )}
      </Link>

      <Link
        to={`/product/${id}`}
        className="font-eskool font-normal text-[#3a3d1c] text-center text-lg tracking-[2px] max-md:text-md lowercase"
      >
        <h2>{title}</h2>
      </Link>

      <p className="font-eskool text-[#9e9f96] text-md text-center max-md:text-md">
        {priceDisplay}
      </p>
    </div>
  );
};

export default ProductItem;
