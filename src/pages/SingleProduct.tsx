import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch } from "../hooks";
import { addProductToTheCart } from "../features/cart/cartSlice";
import toast from "react-hot-toast";
import WithSelectInputWrapper from "../utils/withSelectInputWrapper";
import WithNumberInputWrapper from "../utils/withNumberInputWrapper";
import { Button, Dropdown, QuantityInput, StandardSelectInput } from "../components";
import { formatCategoryName } from "../utils/formatCategoryName";
import InnerImageZoom from "react-inner-image-zoom";
import "react-inner-image-zoom/dist/InnerImageZoom/styles.min.css";

const SingleProduct = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [singleProduct, setSingleProduct] = useState<Product | null>(null);
  const [mainImageIndex, setMainImageIndex] = useState(0);

  const [size, setSize] = useState<string>("xs");
  const [color, setColor] = useState<string>("black");
  const [quantity, setQuantity] = useState<number>(1);

  const params = useParams<{ id: string }>();
  const dispatch = useAppDispatch();

  const SelectInputUpgrade = WithSelectInputWrapper(StandardSelectInput);
  const QuantityInputUpgrade = WithNumberInputWrapper(QuantityInput);

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
        id: singleProduct._id + size + color,
        title: singleProduct.title,
        category: singleProduct.category,
        price: singleProduct.price,
        quantity,
        size,
        color,
        stock: singleProduct.stock,
        images: singleProduct.images,
      })
    );
    toast.success("Product added to the cart");
  };

  if (loading) return <p className="text-center mt-12">Loading product...</p>;
  if (error || !singleProduct) return <p className="text-center mt-12">{error || "Product not found"}</p>;

  const isForSale = singleProduct.status === "for-sale";

  return (
    <div className="max-w-screen-2xl mx-auto px-5 max-[400px]:px-3">
      <div className="grid grid-cols-3 gap-x-8 max-lg:grid-cols-1">
        {/* Main Image with zoom */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <InnerImageZoom
            src={singleProduct.images[mainImageIndex]}
            zoomSrc={singleProduct.images[mainImageIndex]}
            zoomType="hover"
            zoomScale={1.5}
            imgAttributes={{ alt: singleProduct.title }}
            className="w-full max-h-[600px] object-contain rounded-lg"
          />

          {/* Thumbnails / buttons */}
          <div className="flex gap-2 mt-3">
            {singleProduct.images.map((img, index) => (
              <button
                key={index}
                onClick={() => setMainImageIndex(index)}
                className={`border rounded p-1 ${index === mainImageIndex ? "border-black" : "border-gray-300"}`}
              >
                <img src={img} alt={`thumbnail ${index}`} className="w-16 h-16 object-contain" />
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="w-full flex flex-col gap-5 mt-9">
          <h1 className="text-4xl">{singleProduct.title}</h1>
          <p className="text-base text-secondaryBrown">{formatCategoryName(singleProduct.category)}</p>
          <p className="text-base font-bold">{isForSale ? `$${singleProduct.price}` : "Not for sale"}</p>

          {/* Options */}
          <SelectInputUpgrade
            selectList={[
              { id: "xs", value: "XS" },
              { id: "sm", value: "SM" },
              { id: "m", value: "M" },
              { id: "lg", value: "LG" },
              { id: "xl", value: "XL" },
              { id: "2xl", value: "2XL" },
            ]}
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />
          <SelectInputUpgrade
            selectList={[
              { id: "black", value: "BLACK" },
              { id: "red", value: "RED" },
              { id: "blue", value: "BLUE" },
              { id: "white", value: "WHITE" },
              { id: "rose", value: "ROSE" },
              { id: "green", value: "GREEN" },
            ]}
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />

          <QuantityInputUpgrade
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value))}
          />

          <Button
            mode="brown"
            text={isForSale ? "Add to cart" : "Not for sale"}
            onClick={handleAddToCart}
            disabled={!isForSale}
          />

          <p className="text-secondaryBrown text-sm text-right">
            Delivery estimated on the Friday, July 26
          </p>

          {/* Dropdowns */}
          <Dropdown dropdownTitle="Description">{singleProduct.description}</Dropdown>
          <Dropdown dropdownTitle="Product Details">Product details here</Dropdown>
          <Dropdown dropdownTitle="Delivery Details">Delivery info here</Dropdown>
        </div>
      </div>
    </div>
  );
};

export default SingleProduct;
