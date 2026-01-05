import ProductGrid from "./ProductGrid";
import ProductGridWrapper from "./ProductGridWrapper";

const HomeCollectionSection = () => {
  return (
    <div className="bg-[#d7d7d7]">
      <div className="max-w-screen-2xl flex items-center justify-between mx-auto mt-24 px-5 max-[400px]:px-3 bg-[#d7d7d7]">
      </div>
      <ProductGridWrapper limit={6}>
        <ProductGrid />
      </ProductGridWrapper>
    </div>
  );
};
export default HomeCollectionSection;
