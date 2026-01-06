import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components";
import { useEffect, useState } from "react";
import { auth } from "../firebase/config";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import toast from "react-hot-toast";
import { store } from "../store";
import { setLoginStatus } from "../features/auth/authSlice";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ email: string; uid: string } | null>(null);

  // On mount, check localStorage for logged-in user
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      store.dispatch(setLoginStatus(true));
    }
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      toast.error("Please enter email and password");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;

      const userData = { email: loggedInUser.email!, uid: loggedInUser.uid };
      localStorage.setItem("user", JSON.stringify(userData));
      store.dispatch(setLoginStatus(true));
      setUser(userData);

      toast.success("Logged in successfully!");
      navigate("/");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("user");
      store.dispatch(setLoginStatus(false));
      setUser(null); // ✅ This immediately updates the state
      toast.success("Logged out successfully!");
    } catch (error: any) {
      toast.error("Logout failed");
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto pt-24 flex items-center justify-center">
      <div className="font-eskool text-[#3a3d1c] max-w-5xl mx-auto flex flex-col gap-5 max-sm:gap-3 items-center justify-center max-sm:px-5">
        <h2 className="text-5xl text-center mb-5 font-thin max-md:text-4xl max-sm:text-3xl max-[450px]:text-xl max-[450px]:font-normal">
          {user ? "You are already logged in!" : "Welcome Back! Login here:"}
        </h2>

        {user ? (
          <div className="flex flex-col gap-3 items-center">
            <p className="text-lg max-sm:text-base">
              Logged in as <span className="font-semibold">{user.email}</span>
            </p>
            <Button text="Log Out" mode="brown" onClick={handleLogout} />
          </div>
        ) : (
          <>
            <form onSubmit={handleLogin} className="flex flex-col gap-5 w-full">
              <div className="flex flex-col gap-2 w-full">
                <div className="flex flex-col gap-1">
                  <label htmlFor="email">Your email</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter email address"
                    className="bg-white border border-black text-xl py-2 px-3 w-full outline-none max-[450px]:text-base rounded-lg"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="password">Your password</label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Enter password"
                    className="bg-white border border-black text-xl py-2 px-3 w-full outline-none max-[450px]:text-base rounded-lg"
                    required
                  />
                </div>
              </div>

              <Button type="submit" text={loading ? "Logging in..." : "Login"} mode="brown" />
            </form>

            <div className="text-xl max-md:text-lg max-[450px]:text-sm mt-2">
              Don’t have an account?{" "}
              <Link to="/register" className="text-secondaryBrown">
                Register now
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
