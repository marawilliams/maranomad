import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components";
import { useEffect, useState } from "react";
import customFetch from "../axios/custom";
import { formatDate } from "../utils/formatDate";
import { auth } from "../firebase/config";
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import toast from "react-hot-toast";
import { store } from "../store";
import { setLoginStatus } from "../features/auth/authSlice";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ email: string; uid: string } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<User | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', lastname: '', email: '' });

  // On mount, check localStorage for logged-in user
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      // fetch firestore user to attach stripeCustomerId if available
      (async () => {
        try {
          if (parsed.uid) {
            const res = await customFetch.get(`/users/${parsed.uid}`);
            const remote = res.data;
            if (remote?.stripeCustomerId) {
              const merged = { ...parsed, stripeCustomerId: remote.stripeCustomerId };
              localStorage.setItem('user', JSON.stringify(merged));
              setUser(merged);
            }
          }
        } catch (err) {
          // ignore
        }
      })();
      store.dispatch(setLoginStatus(true));
    }
  }, []);

  // Fetch profile and orders for logged in user and display inline
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.email) return;
      setLoadingOrders(true);
      try {
        // If we have a firebase uid, prefer Firestore-backed orders
        if ((user as any).uid) {
          try {
            // customFetch baseURL already contains `/api`
            const res = await customFetch.get(`/orders/${(user as any).uid}`);
            setOrders(res.data || []);
          } catch (e) {
            console.warn('Failed to fetch Firestore orders, falling back to local', e);
          }

          try {
            const profileRes = await customFetch.get(`/users/${(user as any).uid}`);
            setProfile(profileRes.data || null);
          } catch (e) {
            // ignore
          }
        } else {
          const [ordersRes, usersRes] = await Promise.all([
            customFetch.get("/orders"),
            customFetch.get("/users"),
          ]);

          const allOrders: Order[] = ordersRes.data || [];
          const filtered = allOrders.filter((o) => {
            const emailFromOrder = o.user?.email || o.data?.emailAddress || "";
            return emailFromOrder === user.email;
          });

          setOrders(filtered);

          const allUsers: User[] = usersRes.data || [];
          const found = allUsers.find((u) => u.email === user.email) || null;
          setProfile(found);
        }
      } catch (err) {
        console.error("Failed to load account data", err);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchData();
  }, [user]);

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

  const handleForgotPassword = async () => {
    const email = prompt("Enter your email address:");
    if (email) {
      try {
        await sendPasswordResetEmail(auth, email);
        toast.success("Password reset email sent!");
      } catch (error: any) {
        toast.error(error.message || "Failed to send reset email");
      }
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto pt-24 flex items-center justify-center">
      <div className="font-eskool text-[#3a3d1c] max-w-5xl mx-auto flex flex-col gap-5 max-sm:gap-3 items-center justify-center max-sm:px-5">
        <h2 className="text-5xl text-center mb-5 font-thin max-md:text-4xl max-sm:text-3xl max-[450px]:text-xl max-[450px]:font-normal">
          {user ? "You are already logged in!" : "Welcome Back! Login here:"}
        </h2>

        {user ? (
          <div className="w-full max-w-3xl">
            <div className="mb-6">
              <h3 className="text-2xl font-semibold">Account</h3>
              <p className="text-sm text-muted">Signed in as <span className="font-medium">{user.email}</span></p>
            </div>

            <section className="mb-6 bg-white/40 p-4 border rounded">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">Profile</h4>
                <button onClick={() => {
                  setIsEditing(!isEditing);
                  if (!isEditing && profile) {
                    setEditForm({ name: profile.name || '', lastname: profile.lastname || '', email: profile.email || '' });
                  }
                }} className="text-sm text-blue-600 hover:underline">
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>
              {isEditing ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await customFetch.put(`/users/${user!.uid}`, editForm);
                    setProfile({ ...profile!, ...editForm });
                    setIsEditing(false);
                    toast.success('Profile updated successfully');
                  } catch (err) {
                    toast.error('Failed to update profile');
                  }
                }} className="space-y-2">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={editForm.lastname}
                    onChange={(e) => setEditForm({ ...editForm, lastname: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                  <button type="submit" className="bg-brown text-white px-4 py-2 rounded">Save</button>
                </form>
              ) : profile ? (
                <div className="text-sm">
                  <div>{profile.name} {profile.lastname}</div>
                  <div>{profile.email}</div>
                </div>
              ) : (
                <div className="text-sm">No profile data found.</div>
              )}
            </section>

            <section className="mb-6 bg-white/40 p-4 border rounded">
              <h4 className="font-semibold mb-2">Order History</h4>
              {loadingOrders ? (
                <div>Loading orders…</div>
              ) : orders.length === 0 ? (
                <div className="text-sm">No orders found for this account.</div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="border p-3 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">Order #{order.id}</div>
                          <div className="text-sm text-muted">{formatDate(order.orderDate || order.data?.orderDate || new Date().toISOString())}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${(order.subtotal || 0) + 5 + ((order.subtotal || 0) / 5)}</div>
                          <div className="text-sm">{order.orderStatus || "Pending"}</div>
                          {order.orderStatus !== 'Refunded' && (
                            <button
                              onClick={async () => {
                                if (confirm('Are you sure you want to request a refund?')) {
                                  try {
                                    await customFetch.post(`/refund/${order.id}`);
                                    toast.success('Refund requested successfully');
                                    // Refresh orders
                                    const res = await customFetch.get(`/orders/${user!.uid}`);
                                    setOrders(res.data || []);
                                  } catch (err) {
                                    toast.error('Refund failed');
                                  }
                                }
                              }}
                              className="text-xs text-red-600 hover:underline mt-1"
                            >
                              Request Refund
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="text-sm font-semibold mb-1">Items</div>
                        <ul className="text-sm list-disc list-inside">
                          {order.products?.map((p) => (
                            <li key={p.id}>
                              {p.title} — {p.size} — qty {p.quantity} — ${p.price}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-3 text-sm">
                        <div className="font-semibold">Shipping Address</div>
                        <div>{order.data?.firstName} {order.data?.lastName}</div>
                        <div>{order.data?.address} {order.data?.apartment}</div>
                        <div>{order.data?.city}, {order.data?.region} {order.data?.postalCode}</div>
                        <div>{order.data?.country}</div>
                        <div>Phone: {order.data?.phone}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="flex justify-end">
              <Button text="Log Out" mode="brown" onClick={handleLogout} />
            </div>
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

              <div className="text-center mt-2">
                <button type="button" onClick={handleForgotPassword} className="text-secondaryBrown hover:underline">
                  Forgot Password?
                </button>
              </div>
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
