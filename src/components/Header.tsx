import { HiBars3 } from "react-icons/hi2";
import { HiOutlineUser } from "react-icons/hi2";
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";
import { HiOutlineShoppingBag } from "react-icons/hi2";
import { Link } from "react-router-dom";
import SidebarMenu from "./SidebarMenu";
import { useState } from "react";

const Header = () => {
  const [ isSidebarOpen, setIsSidebarOpen ] = useState(false);
  return (
    <>
    <header className="max-w-screen-2xl flex text-center justify-between items-center py-4 px-5 text-black mx-auto max-sm:px-5 max-[400px]:px-3 bg-[#d7d7d7]">
      <HiBars3 className="text-2xl max-sm:text-xl mr-20 max-lg:mr-0 cursor-pointer  hover:text-[#9e9f96] transition-colors" onClick={() => setIsSidebarOpen(true)} />
      <Link
        to="/"
        className="font-nightly text-3xl tracking-[10px] max-sm:text-2xl max-[400px]:text-xl text-[#09140d] hover:text-[#9e9f96] transition-colors"
      >
        maranomad
      </Link>
      <div className="flex gap-4 items-center max-sm:gap-2">
        <Link to="/search">
          <HiOutlineMagnifyingGlass className="text-2xl max-sm:text-xl hover:text-[#9e9f96] transition-colors" />
        </Link>
        <Link to="/login">
          <HiOutlineUser className="text-2xl max-sm:text-xl  hover:text-[#9e9f96] transition-colors" />
        </Link>
        <Link to="/cart">
          <HiOutlineShoppingBag className="text-2xl max-sm:text-xl  hover:text-[#9e9f96] transition-colors" />
        </Link>
      </div>
    </header>
    <SidebarMenu isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
    </>
  );
};
export default Header;
