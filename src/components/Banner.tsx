import { Link } from "react-router-dom";

const Banner = () => {
  return (
    <div className="font-eskool banner w-full flex flex-col justify-end items-center max-sm:h-[550px] max-sm:gap-2 bg-[#d7d7d7]">
      <h2 className="text-center text-6xl font-normal tracking-[1.86px] leading-[60px] max-sm:text-4xl max-[400px]:text-3xl text-[#d7d7d7]">
        welcome to <br />
      </h2>
      <h3 className="text-center mb-8 text-6xl font-normal leading-[72px] tracking-[0.9px] max-sm:text-xl max-[400px]:text-lg text-[#d7d7d7]">
        upcycled and personalized.
      </h3>
      <div className=" font-nightly flex justify-center items-center gap-3 pb-8 max-[400px]:flex-col max-[400px]:gap-1 w-[420px] max-sm:w-[350px] max-[400px]:w-[300px]">
<Link to="/shop" className="mb-10 bg-[#d7d7d7] text-[#09140d] text-center text-3xl border-[#d7d7d7] border-2  font-normal tracking-[1.5px] w-full h-16 flex items-center justify-center hover:bg-[#9e9f96] hover:text-[#d7d7d7] transition-colors duration-500">
  clothes
</Link>

<Link to="/shop" className="mb-10 bg-[#d7d7d7] text-[#09140d] border-[#d7d7d7] border-2 text-center text-3xl font-normal tracking-[1.5px] w-full h-16 flex items-center justify-center hover:bg-[#9e9f96] hover:text-[#d7d7d7] transition-colors duration-500">
  about
</Link>
</div>
    </div>
  );
};
export default Banner;
