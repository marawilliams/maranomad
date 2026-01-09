import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import customFetch from "../axios/custom";
import { Link } from "react-router-dom";

interface Order {
  _id: string;
  userId?: string;              // ✅ Make optional for guest users
  customerEmail: string;        // ✅ Add this line
  products: Array<{
    productId: string;
    title: string;
    price: number;
    quantity: number;
    size?: string;
  }>;
  subtotal: number;
  status: 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  carrier?: string;
  trackingUrl?: string;
  shippedAt?: Date;
  createdAt: Date;
  shippingAddress: {
    firstName: string;
    lastName: string;
    address: string;
    apartment?: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  paymentIntentId?: string;
  paymentMethod?: {
    brand: string;
    last4: string;
  };
}

const AdminOrders = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);
  const [shippingInfo, setShippingInfo] = useState({
    trackingNumber: '',
    carrier: '',
    trackingUrl: ''
  });
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      try {
        const idTokenResult = await user.getIdTokenResult();
        const admin = idTokenResult.claims.admin === true;
        if (!admin) {
          navigate("/");
          return;
        }
        setIsAdmin(true);
      } catch {
        navigate("/");
      }
    });
    return unsubscribe;
  }, [navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchOrders();
  }, [isAdmin]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await customFetch.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsShipped = async (orderId: string) => {
    if (!shippingInfo.trackingNumber || !shippingInfo.carrier) {
      alert('Please enter tracking number and carrier');
      return;
    }

    try {
      await customFetch.post(`/orders/${orderId}/ship`, shippingInfo);
      alert('Order marked as shipped and tracking email sent via Mailgun!');
      setShippingOrderId(null);
      setShippingInfo({ trackingNumber: '', carrier: '', trackingUrl: '' });
      fetchOrders();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to mark order as shipped');
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await customFetch.put(`/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
    } catch (error) {
      alert('Failed to update order status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = filterStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === filterStatus);

  if (!isAdmin) return <div>Access Denied</div>;

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace" }} className=" max-w-screen-2xl mx-auto px-5 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Orders Management</h1>
        <button 
          onClick={fetchOrders}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Refresh Orders
        </button>
      </div>
      <div className="mb-9">
      <Link to="/admin" className=" bg-[#6a6c27] text-white/90 px-3 py-2 rounded hover:bg-[#6a6c27]/60 text-sm"  >
          back to admin
      </Link>
      </div>

      {/* Filter */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button 
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded ${filterStatus === 'all' ? 'bg-[#6a6c27] text-white' : 'bg-gray-200'}`}
        >
          All ({orders.length})
        </button>
        <button 
          onClick={() => setFilterStatus('paid')}
          className={`px-4 py-2 rounded ${filterStatus === 'paid' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
        >
          Paid ({orders.filter(o => o.status === 'paid').length})
        </button>
        <button 
          onClick={() => setFilterStatus('processing')}
          className={`px-4 py-2 rounded ${filterStatus === 'processing' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Processing ({orders.filter(o => o.status === 'processing').length})
        </button>
        <button 
          onClick={() => setFilterStatus('shipped')}
          className={`px-4 py-2 rounded ${filterStatus === 'shipped' ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}
        >
          Shipped ({orders.filter(o => o.status === 'shipped').length})
        </button>
        <button 
          onClick={() => setFilterStatus('delivered')}
          className={`px-4 py-2 rounded ${filterStatus === 'delivered' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
        >
          Delivered ({orders.filter(o => o.status === 'delivered').length})
        </button>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="text-center py-8">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No orders found</div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order._id} className="bg-white border rounded-lg p-6 shadow-sm">
              {/* Order Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold">Order #{order._id.slice(-8)}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  {order.paymentMethod && (
                    <p className="text-sm text-gray-600">
                      💳 {order.paymentMethod.brand?.toUpperCase()} •••• {order.paymentMethod.last4}
                    </p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {order.status.toUpperCase()}
                </span>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-gray-50 p-4 rounded">
                <div>
                  <h4 className="font-semibold mb-2">User ID</h4>
                  <p className="text-sm">{order.userId}</p>
                  <p className='text-sm'>Email: {order.customerEmail}</p>
                  {order.paymentIntentId && (
                    <p className="text-xs text-gray-500 mt-1">Payment: {order.paymentIntentId}</p>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Shipping Address</h4>
                  <p className="text-sm">
                    {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
                    {order.shippingAddress.address}
                    {order.shippingAddress.apartment && <>, {order.shippingAddress.apartment}</>}<br />
                    {order.shippingAddress.city}, {order.shippingAddress.region} {order.shippingAddress.postalCode}<br />
                    {order.shippingAddress.country}
                    {order.shippingAddress.phone && <><br />Phone: {order.shippingAddress.phone}</>}
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Products</h4>
                <div className="space-y-2">
                  {order.products?.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm py-2 border-b">
                      <div>
                        <span className="font-medium">{item.title}</span>
                        {item.size && <span className="text-gray-600"> - Size: {item.size}</span>}
                      </div>
                      <div className="text-right">
                        <span className="text-gray-600">Qty: {item.quantity}</span>
                        <span className="ml-4 font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {order.products && order.products.length > 0 && (
                  <div className="text-right font-bold text-lg mt-2">
                    Subtotal: ${order.subtotal.toFixed(2)}
                  </div>
                )}
              </div>

              {/* Tracking Info (if shipped) */}
              {order.status === 'shipped' && order.trackingNumber && (
                <div className="bg-purple-50 p-4 rounded mb-4">
                  <h4 className="font-semibold mb-2">Tracking Information</h4>
                  <p className="text-sm">
                    <strong>Carrier:</strong> {order.carrier}<br />
                    <strong>Tracking #:</strong> {order.trackingNumber}<br />
                    {order.trackingUrl && (
                      <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                        Track Package
                      </a>
                    )}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {/* Status Update Dropdown */}
                <select
                  value={order.status}
                  onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                  className="px-3 py-2 border rounded bg-white"
                >
                  <option value="paid">Paid</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                {/* Mark as Shipped Button */}
                {order.status !== 'shipped' && order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <button
                    onClick={() => setShippingOrderId(order._id)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Add Tracking Info
                  </button>
                )}
              </div>

              {/* Shipping Form */}
              {shippingOrderId === order._id && (
                <div className="mt-4 p-4 border-2 border-blue-300 rounded bg-blue-50">
                  <h4 className="font-bold mb-3">Add Shipping Information</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Carrier *</label>
                      <select
                        value={shippingInfo.carrier}
                        onChange={(e) => setShippingInfo({...shippingInfo, carrier: e.target.value})}
                        className="w-full p-2 border rounded"
                        required
                      >
                        <option value="">Select Carrier</option>
                        <option value="USPS">USPS</option>
                        <option value="UPS">UPS</option>
                        <option value="FedEx">FedEx</option>
                        <option value="DHL">DHL</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Tracking Number *</label>
                      <input
                        type="text"
                        placeholder="Enter tracking number"
                        value={shippingInfo.trackingNumber}
                        onChange={(e) => setShippingInfo({...shippingInfo, trackingNumber: e.target.value})}
                        className="w-full p-2 border rounded"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Tracking URL (optional)</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={shippingInfo.trackingUrl}
                        onChange={(e) => setShippingInfo({...shippingInfo, trackingUrl: e.target.value})}
                        className="w-full p-2 border rounded"
                      />
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleMarkAsShipped(order._id)}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 font-medium"
                      >
                        Mark as Shipped & Send Email
                      </button>
                      <button
                        onClick={() => {
                          setShippingOrderId(null);
                          setShippingInfo({ trackingNumber: '', carrier: '', trackingUrl: '' });
                        }}
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;