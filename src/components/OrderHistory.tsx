import { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";

type Order = {
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: any;
  items: any[];
  receiptUrl?: string;
};

const OrderHistory = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      toast.loading("Loading your orders...", { id: "loading-orders" });
      if (user) {
        try {
          const ordersRef = collection(db, "orders");
          const q = query(
            ordersRef,
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
          );

          const querySnapshot = await getDocs(q);
          const ordersData: Order[] = [];
          
          querySnapshot.forEach((doc) => {
            ordersData.push(doc.data() as Order);
          });

          setOrders(ordersData);
        } catch (error) {
          console.error("Error loading orders:", error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="max-w-screen-2xl mx-auto px-5 py-8">
        <p className="text-center">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-5 py-8">
      <h1 className="text-3xl font-bold mb-8">Order History</h1>

      {orders.length === 0 ? (
        <p className="text-gray-600">No orders yet</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.orderId} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-semibold">Order #{order.orderId.slice(0, 8)}</p>
                  <p className="text-sm text-gray-600">
                    {order.createdAt?.toDate().toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    ${order.amount.toFixed(2)}
                  </p>
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                    {order.status}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Items:</h3>
                {order.items.map((item, idx) => (
                  <p key={idx} className="text-sm text-gray-700">
                    {item.title} - ${item.price}
                  </p>
                ))}
              </div>

{order.receiptUrl && (
                  <a href={order.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-4 text-blue-600 hover:underline"
                >
                  View Receipt
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;