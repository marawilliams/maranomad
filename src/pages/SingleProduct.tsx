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

  // Helper function to check if URL is a video
  const isVideo = (url: string): boolean => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  const handleAddToCart = () => {
    if (!singleProduct || (singleProduct.status !== "for-sale" && singleProduct.status !== "reserved")) return;

    dispatch(
      addProductToTheCart({
        id: singleProduct._id,
        title: singleProduct.title,
        category: singleProduct.category,
        price: singleProduct.price,
        quantity: 1,
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

  const isForSale = singleProduct.status === "for-sale" || singleProduct.status === "reserved";
  const currentMedia = singleProduct.images[currentImageIndex];
  const isCurrentMediaVideo = isVideo(currentMedia);

  return (
    <div className="max-w-screen-2xl mx-auto px-5 max-[400px]:px-3">
      <div className="grid grid-cols-3 gap-x-8 max-lg:grid-cols-1">
        {/* Media slider (images/videos) */}
        <div className="mt-[5vh] lg:col-span-2 relative w-full h-[80vh] aspect-square flex items-center justify-center ">
          {singleProduct.images.length > 0 && (
            <>
              {isCurrentMediaVideo ? (
                <video
                  key={currentMedia}
                  src={currentMedia}
                  className="w-full h-full object-contain"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={currentMedia}
                  alt={`${singleProduct.title} ${currentImageIndex + 1}`}
                  className="w-full h-full object-contain"
                />
              )}
              
              {/* Navigation buttons - only show if more than one media item */}
              {singleProduct.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="text-[#09140d] absolute left-2 top-1/2 -translate-y-1/2 p-2 hover:text-[#9e9f96] transition-colors duration-500"
                  >
                    ◀
                  </button>
                  <button
                    onClick={nextImage}
                    className="text-[#09140d] absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:text-[#9e9f96] transition-colors duration-500"
                  >
                    ▶
                  </button>
                </>
              )}

              {/* Media indicator dots */}
              {singleProduct.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {singleProduct.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? "bg-[#09140d] w-6"
                          : "bg-gray-400"
                      }`}
                      aria-label={`Go to media ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Details */}
        <div className="font-eskool w-full flex flex-col gap-5 mt-9">
          <h1 className="font-nightly font-light tracking-[2px] text-5xl lowercase">
            {singleProduct.title}
          </h1>
          <p className="text-base text-secondaryBrown lowercase">
            {formatCategoryName(singleProduct.category)}
          </p>
          <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-base font-bold lowercase">
            {singleProduct.status === "for-sale" && `$${singleProduct.price}`}
            {singleProduct.status === "reserved" && `$${singleProduct.price}`}
            {singleProduct.status === "sold" && "Sold"}
            {singleProduct.status === "not-for-sale" && "Not for sale"}
          </p>
          
          <p className="text-base text-gray-700">
            <span className="font-semibold">size:</span> {singleProduct.size}
          </p>
          
          <p className="text-base text-gray-700">
            <span className="font-semibold">brand:</span> {singleProduct.brand}
          </p>

          <Button
            mode="brown"
            text={
              singleProduct.status === "for-sale"
                ? "add to cart"
                : singleProduct.status === "sold"
                ? "sold"
                : singleProduct.status === "reserved"
                ? "add to cart"
                : "not for sale"
            }            
            onClick={handleAddToCart}
            disabled={!isForSale}
            style={
              singleProduct.status !== "for-sale" && singleProduct.status !== "reserved"
                ? { pointerEvents: "none" }
              
                : {}
            }
          />  
          
          <Dropdown dropdownTitle="Description">{singleProduct.description}</Dropdown>
        </div>
      </div>
    </div>
  );
};

export default SingleProduct;