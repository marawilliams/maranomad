import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components";
import { useState } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import toast from "react-hot-toast";
import customFetch from "../axios/custom";

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const lastname = formData.get("lastname") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Validation
    if (!name || !lastname || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      // Create Firebase auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send email verification
      await sendEmailVerification(user);
      console.log("✅ Verification email sent to:", email);

      // Create user profile in MongoDB
      try {
        await customFetch.post("/users", {
          uid: user.uid,
          email: email,
          name: name,
          lastname: lastname,
        });
        console.log("✅ User profile created in MongoDB");
      } catch (dbError) {
        console.error("Failed to create user profile:", dbError);
        // Don't fail registration if MongoDB fails
      }

      toast.success("Account created! Please check your email to verify your account before logging in.");
      
      // Sign them out so they can't use the account until verified
      await signOut(auth);
      
      // Redirect to login
      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (error: any) {
      console.error("Registration error:", error);
      
      if (error.code === "auth/email-already-in-use") {
        toast.error("Email already in use. Please login or use a different email.");
      } else if (error.code === "auth/invalid-email") {
        toast.error("Invalid email address");
      } else if (error.code === "auth/weak-password") {
        toast.error("Password is too weak");
      } else {
        toast.error(error.message || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto pt-24 flex items-center justify-center">
      <div className="font-eskool text-[#3a3d1c] max-w-xl mx-auto flex flex-col gap-5 max-sm:gap-3 items-center justify-center max-sm:px-5">
        <h2 className="text-5xl text-center mb-5 font-thin max-md:text-4xl max-sm:text-3xl max-[450px]:text-xl max-[450px]:font-normal">
          Create Your Account
        </h2>

        <form onSubmit={handleRegister} className="flex flex-col gap-5 w-full">
          <div className="flex flex-col gap-2 w-full">
            <div className="flex flex-col gap-1">
              <label htmlFor="name">First Name</label>
              <input
                type="text"
                name="name"
                placeholder="Enter your first name"
                className="bg-white border border-black text-xl py-2 px-3 w-full outline-none max-[450px]:text-base rounded-lg"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="lastname">Last Name</label>
              <input
                type="text"
                name="lastname"
                placeholder="Enter your last name"
                className="bg-white border border-black text-xl py-2 px-3 w-full outline-none max-[450px]:text-base rounded-lg"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email address"
                className="bg-white border border-black text-xl py-2 px-3 w-full outline-none max-[450px]:text-base rounded-lg"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                name="password"
                placeholder="Enter password (min 6 characters)"
                className="bg-white border border-black text-xl py-2 px-3 w-full outline-none max-[450px]:text-base rounded-lg"
                required
                minLength={6}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm your password"
                className="bg-white border border-black text-xl py-2 px-3 w-full outline-none max-[450px]:text-base rounded-lg"
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
            <p>After registering, you'll receive a verification email. Please verify your email before logging in.</p>
          </div>

          <Button 
            type="submit" 
            text={loading ? "Creating account..." : "Register"} 
            mode="brown"
            disabled={loading}
          />
        </form>

        <div className="text-xl max-md:text-lg max-[450px]:text-sm mt-2">
          already have an account?{" "}
          <Link to="/login" className="text-secondaryBrown hover:underline">
            login here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;