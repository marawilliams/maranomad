import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components";
import toast from "react-hot-toast";
import { auth } from "../firebase/config";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth"; // ✅ Added sendEmailVerification

const Register = () => {
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData) as {
      name: string;
      lastname: string;
      email: string;
      password: string;
      confirmPassword: string;
    };

    // Basic validation
    if (!data.email || !data.password || !data.name || !data.lastname) {
      toast.error("Please fill out all fields");
      return;
    }
    if (data.password !== data.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      // Register with Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      
      // ✅ Send verification email
      await sendEmailVerification(userCredential.user);

      // Create Stripe customer and Firestore user mapping via backend
      try {
        const uid = auth.currentUser?.uid;
        if (uid) {
          await fetch(`${import.meta.env.VITE_API_URL || ''}/api/create-customer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: data.email, name: `${data.name} ${data.lastname}`, uid }),
          });
        }
      } catch (e) {
        console.warn('Could not create Stripe customer:', e);
      }

      navigate("/login", { state: { showVerification: true, email: data.email } }); // ✅ Pass flag and email
    } catch (error: any) {
      // Firebase error messages
      switch (error.code) {
        case "auth/email-already-in-use":
          toast.error("This email is already in use");
          break;
        case "auth/invalid-email":
          toast.error("Invalid email address");
          break;
        case "auth/weak-password":
          toast.error("Password should be at least 6 characters");
          break;
        default:
          toast.error(error.message || "Registration failed");
      }
    }
  };

  return (
    <div className="font-eskool text-[#3a3d1c] max-w-screen-2xl mx-auto pt-24 flex items-center justify-center">
      <form
        onSubmit={handleRegister}
        className="max-w-5xl mx-auto flex flex-col gap-5 max-sm:gap-3 items-center justify-center max-sm:px-5"
      >
        <h2 className="text-5xl text-center mb-5 font-thin max-md:text-4xl max-sm:text-3xl max-[450px]:text-xl max-[450px]:font-normal">
          Welcome! Register here:
        </h2>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-1">
            <label htmlFor="name">Your name</label>
            <input
              type="text"
              className="bg-white border border-black text-xl py-2 px-3 w-full outline-none max-[450px]:text-base"
              placeholder="Enter name"
              id="name"
              name="name"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="lastname">Your lastname</label>
            <input
              type="text"
              className="bg-white border border-black text-xl py-2 px-3 w-full outline-none max-[450px]:text-base"
              placeholder="Enter lastname"
              id="lastname"
              name="lastname"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="email">Your email</label>
            <input
              type="email"
              className="bg-white border border-black text-xl py-2 px-3 w-full outline-none max-[450px]:text-base"
              placeholder="Enter email address"
              id="email"
              name="email"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password">Your password</label>
            <input
              type="password"
              className="bg-white border border-black text-xl py-2 px-3 w-full outline-none max-[450px]:text-base"
              placeholder="Enter password"
              id="password"
              name="password"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              type="password"
              className="bg-white border border-black text-xl py-2 px-3 w-full outline-none max-[450px]:text-base"
              placeholder="Confirm password"
              id="confirmPassword"
              name="confirmPassword"
            />
          </div>
        </div>

        <Button type="submit" text="Register" mode="brown" />
        <Link
          to="/login"
          className="text-xl max-md:text-lg max-[450px]:text-sm"
        >
          Already have an account?{" "}
          <span className="text-secondaryBrown">Login now</span>.
        </Link>
      </form>
    </div>
  );
};

export default Register;