import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { HiXMark } from "react-icons/hi2";
import { Link, useNavigate } from "react-router-dom";
import { useAppSelector } from "../hooks";
import { setLoginStatus } from "../features/auth/authSlice";
import { store } from "../store";

const SidebarMenu = ({
  isSidebarOpen,
  setIsSidebarOpen,
}: {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (prev: boolean) => void;
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { loginStatus } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  const logout = () => {
    toast.error("Logged out successfully");
    localStorage.removeItem("user");
    store.dispatch(setLoginStatus(false));
    navigate("/login");
  };

  useEffect(() => {
    if (isSidebarOpen) {
      setShouldRender(true);
      // Small delay to ensure component is mounted before animation
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      // Wait for animation to finish before unmounting
      const timer = setTimeout(() => setShouldRender(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isSidebarOpen]);

  const linkClassName = "font-eskool py-2 border-secondaryBrown w-full block flex justify-center tracking-[3px] text-[#09140d] hover:text-[#9e9f96] transition-colors";

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-500 ${
          isVisible ? "opacity-50" : "opacity-0"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 w-64 z-50 h-full bg-[#e8e8e8] shadow-lg border-r border-black transition-transform duration-300 ease-in-out ${
          isVisible ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-end mr-1 mt-1">
          <HiXMark
            className="text-3xl cursor-pointer hover:text-[#9e9f96] transition-colors"
            onClick={() => setIsSidebarOpen(false)}
          />
        </div>
        <div className="flex justify-center mt-2">
          <Link
            to="/"
            className="font-eskool text-2xl font-light max-sm:text-2xl max-[400px]:text-xl tracking-[3px] hover:text-[#9e9f96] transition-colors"
            onClick={() => setIsSidebarOpen(false)}
          >
            maranomad
          </Link>
        </div>
        <div className="font-eskoolflex flex-col items-center gap-1 mt-7">
          <Link to="/" className={linkClassName} onClick={() => setIsSidebarOpen(false)}>
            home
          </Link>
          <Link to="/shop" className={linkClassName} onClick={() => setIsSidebarOpen(false)}>
            shop
          </Link>
          <Link to="/search" className={linkClassName} onClick={() => setIsSidebarOpen(false)}>
            search
          </Link>
          {loginStatus ? (
            <>
              <button onClick={logout} className={linkClassName}>
                logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={linkClassName} onClick={() => setIsSidebarOpen(false)}>
                sign in
              </Link>
              <Link to="/register" className={linkClassName} onClick={() => setIsSidebarOpen(false)}>
                sign up
              </Link>
            </>
          )}
          <Link to="/cart" className={linkClassName} onClick={() => setIsSidebarOpen(false)}>
            cart
          </Link>
        </div>
      </div>
    </>
  );
};
export default SidebarMenu;