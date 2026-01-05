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
  className="font-nightly text-3xl tracking-[3px] max-sm:text-3xl max-[400px]:text-2xl text-[#09140d] hover:text-[#9e9f96] transition-colors"
>
  maran
<svg 
  className="inline-block w-[0.8em] h-[0.8em] mx-1 fill-current align-middle -translate-x-[0.08em] -translate-y-[0.05em]" 
  viewBox="0 0 600 579"
  xmlns="http://www.w3.org/2000/svg"
>
  <path transform="translate(0,579) scale(0.1,-0.1)" d="M2846 5755 c-11 -8 -27 -15 -36 -15 -20 0 -80 -55 -80 -73 0 -8 -12 -36 -26 -61 -15 -26 -24 -50 -21 -53 3 -3 -2 -28 -13 -57 -30 -82 -70 -218 -70 -236 0 -9 -4 -20 -8 -26 -5 -5 -14 -34 -21 -64 -7 -30 -19 -65 -27 -77 -8 -12 -14 -32 -14 -43 0 -11 -4 -28 -10 -38 -5 -9 -16 -48 -26 -87 -9 -38 -20 -75 -25 -81 -5 -6 -10 -30 -12 -52 -1 -23 -6 -44 -10 -48 -4 -4 -7 -15 -7 -25 0 -16 -24 -104 -40 -144 -4 -11 -14 -47 -21 -80 -7 -33 -18 -71 -25 -85 -6 -14 -17 -52 -24 -85 -6 -33 -16 -68 -21 -77 -5 -10 -9 -29 -9 -42 0 -13 -7 -37 -15 -52 -8 -16 -15 -39 -15 -51 0 -12 -6 -37 -14 -55 -8 -18 -27 -76 -41 -128 -14 -52 -31 -100 -37 -108 -21 -25 -89 -53 -141 -58 -29 -3 -63 -10 -77 -14 -14 -5 -43 -12 -65 -15 -22 -3 -56 -10 -75 -15 -87 -22 -337 -47 -565 -56 -71 -3 -148 -9 -170 -15 -22 -6 -112 -19 -200 -29 -88 -10 -180 -23 -205 -29 -93 -20 -207 -43 -257 -51 -28 -4 -57 -11 -63 -15 -6 -4 -60 -7 -119 -6 l-108 1 -51 -48 c-44 -40 -53 -54 -60 -99 -8 -46 -6 -71 14 -180 6 -32 70 -69 131 -78 61 -8 203 -92 289 -170 55 -50 67 -59 124 -93 30 -18 69 -47 85 -63 32 -32 129 -99 143 -99 5 0 21 -11 35 -24 14 -13 71 -47 126 -74 54 -27 114 -61 132 -75 19 -13 54 -35 79 -47 25 -12 74 -43 109 -67 36 -25 75 -49 88 -54 13 -5 23 -13 23 -18 0 -5 25 -22 56 -37 32 -15 69 -37 83 -49 14 -11 43 -29 64 -40 51 -26 117 -83 117 -100 0 -8 12 -26 26 -42 24 -26 25 -32 19 -98 -3 -38 -10 -93 -16 -120 -5 -28 -11 -66 -13 -85 -7 -55 -56 -283 -66 -305 -6 -11 -9 -29 -9 -40 0 -11 -6 -60 -15 -110 -8 -49 -18 -114 -21 -143 -4 -29 -13 -76 -21 -105 -8 -29 -19 -89 -24 -134 -4 -45 -13 -97 -18 -115 -6 -18 -13 -69 -17 -113 -3 -44 -15 -136 -26 -205 -11 -69 -23 -145 -26 -170 -3 -25 -14 -57 -24 -72 -11 -14 -19 -39 -19 -54 0 -42 37 -109 77 -140 30 -23 45 -27 102 -27 86 -1 134 18 191 74 26 26 58 50 71 54 24 8 169 145 169 162 1 4 43 42 94 83 52 41 98 82 102 91 11 19 163 154 220 195 91 64 140 101 190 144 29 25 76 63 105 85 29 22 92 75 140 118 48 42 92 77 97 77 5 0 15 13 22 30 17 41 55 63 94 56 17 -4 43 -6 57 -6 15 0 32 -7 39 -15 7 -8 17 -15 22 -15 5 0 35 -18 65 -40 31 -22 61 -40 67 -40 7 0 26 -13 44 -29 17 -16 40 -32 51 -36 11 -3 25 -12 31 -20 7 -8 22 -15 34 -15 12 0 35 -13 51 -30 16 -16 33 -30 38 -30 5 0 26 -13 46 -28 20 -16 43 -31 52 -35 10 -3 48 -28 86 -55 38 -27 91 -62 118 -77 27 -15 54 -33 60 -40 5 -8 24 -22 42 -32 17 -10 57 -34 89 -53 31 -19 65 -40 75 -46 11 -6 27 -17 36 -25 16 -13 39 -25 83 -43 50 -21 177 -106 186 -125 7 -13 41 -39 75 -59 53 -29 74 -35 124 -35 38 -1 69 5 85 15 14 9 37 18 52 22 48 11 85 61 91 125 3 31 9 72 12 91 5 28 1 43 -19 73 -14 21 -26 45 -26 54 0 9 -7 24 -16 34 -8 9 -22 47 -29 84 -8 37 -18 72 -23 79 -5 6 -12 25 -15 41 -15 77 -39 171 -57 223 -11 31 -22 71 -24 87 -6 41 -53 235 -76 315 -22 75 -43 172 -60 280 -7 41 -17 90 -22 109 -6 18 -11 80 -11 137 0 82 3 108 16 122 10 10 13 23 8 31 -9 13 20 85 39 96 6 4 21 23 34 43 13 21 61 75 107 120 373 371 651 642 658 642 6 0 13 9 16 21 4 11 22 27 41 35 19 8 34 19 34 24 0 6 7 10 15 10 9 0 27 11 40 24 12 13 39 33 59 45 20 12 44 33 55 47 10 13 23 24 27 24 5 1 27 19 49 40 22 22 55 47 75 57 35 19 66 50 104 106 18 26 22 45 20 92 -4 82 -9 102 -41 147 -33 48 -48 57 -124 69 -53 8 -66 7 -122 -15 -34 -14 -80 -25 -102 -25 -22 0 -310 -2 -640 -4 -330 -2 -640 -7 -690 -11 -121 -9 -278 19 -283 51 -2 11 -14 31 -28 44 -13 12 -24 28 -24 35 0 6 -7 18 -16 25 -9 7 -20 22 -25 34 -14 29 -33 61 -48 78 -7 9 -10 21 -7 26 4 6 -2 15 -12 20 -11 6 -22 23 -25 39 -3 16 -21 49 -40 74 -19 25 -40 61 -46 80 -6 20 -21 44 -31 53 -11 10 -20 24 -20 30 0 7 -20 49 -45 94 -25 45 -45 84 -45 87 0 6 -70 156 -102 219 -98 193 -128 253 -128 258 0 3 -18 45 -41 94 -23 48 -55 117 -71 153 -16 36 -47 100 -69 142 -48 96 -73 165 -70 201 1 15 -3 27 -9 27 -5 0 -10 15 -10 34 0 41 -31 83 -68 90 -80 15 -108 15 -126 1z"/>
</svg>
    mad
</Link>
        </div>
        <div className="font-eskoolflex flex-col items-center gap-1 mt-7">
          <Link to="/" className={linkClassName} onClick={() => setIsSidebarOpen(false)}>
            home
          </Link>
          <Link to="/shop" className={linkClassName} onClick={() => setIsSidebarOpen(false)}>
            shop
          </Link>
          <Link to="/about" className={linkClassName} onClick={() => setIsSidebarOpen(false)}>
            about
          </Link>
          <Link to="/contact" className={linkClassName} onClick={() => setIsSidebarOpen(false)}>
            contact
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