import { useEffect, useState } from "react";
import { Link, useLoaderData, useNavigate } from "react-router-dom";
import customFetch from "../axios/custom";
import { formatDate } from "../utils/formatDate";

export const loader = async () => {
  try {
    const response = await customFetch.get("/orders");
    
    return response.data;
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return [];
  }
};

const OrderHistory = () => {
  const [user] = useState(JSON.parse(localStorage.getItem("user") || "{}"));
  const orders = useLoaderData() as Order[];
  
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) {
      //toast.error("Please login to view this page");
      navigate("/login");
    }
  }, [user, navigate]);

  return (
    <div className="max-w-screen-2xl mx-auto pt-20 px-5">
      <h1 className="text-3xl font-bold mb-8">Order History</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr>
              <th className="py-3 px-4 border-b">Order ID</th>
              <th className="py-3 px-4 border-b">Date</th>
              <th className="py-3 px-4 border-b">Total</th>
              <th className="py-3 px-4 border-b">Status</th>
              <th className="py-3 px-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders
              .filter((order) => order.userId === user.id)
              .map((order) => (
                <tr key={order._id}>
                  <td className="py-3 px-4 border-b text-center">
                    {order._id}
                  </td>

                  <td className="py-3 px-4 border-b text-center">
                    {formatDate(order.createdAt)}
                  </td>

                  <td className="py-3 px-4 border-b text-center">
                    ${(order.subtotal + 5 + order.subtotal / 5).toFixed(2)}
                  </td>

                  <td className="py-3 px-4 border-b text-center">
                    {order.status}
                  </td>

                  <td className="py-3 px-4 border-b text-center">
                    <Link
                      to={`/order-history/${order._id}`}
                      className="text-blue-500 hover:underline"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderHistory;
