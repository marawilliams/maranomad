import { Link } from "react-router-dom";

const Banner = () => {
  return (
    <div className="font-eskool banner w-full flex flex-col justify-end items-center bg-[#d7d7d7] pb-8">
      <h2 
        className="text-center font-normal tracking-[0.03em] leading-tight text-[#d7d7d7] mb-2"
        style={{ fontSize: 'clamp(2rem, 4vw, 7rem)' }}
      >
        welcome to <br />
      </h2>
      <h3 
        className="text-center mb-12 font-normal leading-tight tracking-[0.015em] text-[#d7d7d7]"
        style={{ fontSize: 'clamp(2rem, 4vw, 7rem)' }}
      >
        upcycled and personalized...
      </h3>
      <div 
        className="font-nightly flex justify-center items-center gap-3 max-[500px]:flex-col max-[500px]:gap-2"
        style={{ width: 'clamp(300px, 90vw, 480px)' }}
      >
        <Link 
          to="/shop" 
          className="bg-[#d7d7d7] text-[#09140d] text-center border-[#d7d7d7] border-2 font-normal tracking-[0.05em] w-full flex items-center justify-center hover:bg-[#9e9f96] hover:text-[#d7d7d7] transition-colors duration-500"
          style={{ 
            fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
            height: 'clamp(3rem, 4vw, 4rem)'
          }}
        >
          shop
        </Link>

        <Link 
          to="/about" 
          className="bg-[#d7d7d7] text-[#09140d] border-[#d7d7d7] border-2 text-center font-normal tracking-[0.05em] w-full flex items-center justify-center hover:bg-[#9e9f96] hover:text-[#d7d7d7] transition-colors duration-500"
          style={{ 
            fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
            height: 'clamp(3rem, 4vw, 4rem)'
          }}
        >
          about
        </Link>
      </div>
    </div>
  );
};
export default Banner;