import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch } from "../hooks";
import { addProductToTheCart } from "../features/cart/cartSlice";
import toast from "react-hot-toast";
import { Button, Dropdown } from "../components";
import { formatCategoryName } from "../utils/formatCategoryName";

const SingleProduct = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [singleProduct, setSingleProduct] = useState<Product | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const params = useParams<{ id: string }>();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:5000/api/products/${params.id}`);
        if (!response.ok) throw new Error("Product not found");
        const data = await response.json();
        setSingleProduct(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch product");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [params.id]);

  const handleAddToCart = () => {
    if (!singleProduct || singleProduct.status !== "for-sale") return;

    dispatch(
      addProductToTheCart({
        id: singleProduct._id,
        title: singleProduct.title,
        category: singleProduct.category,
        price: singleProduct.price,
        quantity: 1, // Always 1 for one-of-a-kind items
        size: singleProduct.size,
        brand: singleProduct.brand,
        stock: singleProduct.stock,
        images: singleProduct.images,
      })
    );
    toast.success("Product added to the cart");
  };

  const nextImage = () => {
    if (!singleProduct) return;
    setCurrentImageIndex((prev) => (prev + 1) % singleProduct.images.length);
  };

  const prevImage = () => {
    if (!singleProduct) return;
    setCurrentImageIndex(
      (prev) => (prev - 1 + singleProduct.images.length) % singleProduct.images.length
    );
  };

  if (loading) return <p className="text-center mt-12">Loading product...</p>;
  if (error || !singleProduct) return <p className="text-center mt-12">{error || "Product not found"}</p>;

  const isForSale = singleProduct.status === "for-sale";

  return (
    <div className="max-w-screen-2xl mx-auto px-5 max-[400px]:px-3">
      <div className="grid grid-cols-3 gap-x-8 max-lg:grid-cols-1">
        {/* Images slider */}
        <div className="lg:col-span-2 relative w-full aspect-square flex items-center justify-center ">
          {singleProduct.images.length > 0 && (
            <>
              <img
                src={singleProduct.images[currentImageIndex]}
                alt={`${singleProduct.title} ${currentImageIndex + 1}`}
                className="w-full h-full object-contain"
              />
              <button
                onClick={prevImage}
                className="text-[#09140d] absolute left-2 top-1/2 -translate-y-1/2  p-2 hover:text-[#9e9f96]  transition-colors duration-500"
              >
                ◀
              </button>
              <button
                onClick={nextImage}
                className="text-[#09140d] absolute right-2 top-1/2 -translate-y-1/2  p-2 hover:text-[#9e9f96] transition-colors duration-500"
              >
                ▶
              </button>
            </>
          )}
        </div>

        {/* Details */}
        <div className="w-full flex flex-col gap-5 mt-9">
          <h1 className="font-nightly font-light tracking-[2px] text-5xl lowercase">
            {singleProduct.title}
          </h1>
          <p className="text-base text-secondaryBrown lowercase">
            {formatCategoryName(singleProduct.category)}
          </p>
          <p className="text-base font-bold lowercase">
            {isForSale ? `$${singleProduct.price}` : "Not for sale"}
          </p>
          
          {/* Display size */}
          <p className="text-base text-gray-700">
            <span className="font-semibold">size:</span> {singleProduct.size}
          </p>
          
          {/* Display brand */}
          <p className="text-base text-gray-700">
            <span className="font-semibold">brand:</span> {singleProduct.brand}
          </p>

          <Button
            mode="brown"
            text={isForSale ? "Add to cart" : "Not for sale"}
            onClick={handleAddToCart}
            disabled={!isForSale}
          />
          
          {/* Dropdowns */}
          <Dropdown dropdownTitle="Description">{singleProduct.description}</Dropdown>
        </div>
      </div>
    </div>
  );
};

export default SingleProduct;