import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import customFetch from "../axios/custom";
import { Product } from "../typings";

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    title: '', price: '', description: '', category: '', images: [] as string[], stock: '', size: '', brand: '', status: 'for-sale' as const
  });
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      // Check admin status from custom claims
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

  // Fetch data only if admin
  useEffect(() => {
    if (!isAdmin) return;
    const fetchData = async () => {
      setLoadingProducts(true);
      try {
        const prodRes = await customFetch.get('/products');
        setProducts(prodRes.data);
      } catch (err) {
        console.error('Failed to load admin data');
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchData();
  }, [isAdmin]);
  // Populate form when editing
  useEffect(() => {
    if (editingProduct) {
      setFormData({
        title: editingProduct.title || '',
        price: editingProduct.price || '',
        description: editingProduct.description || '',
        category: editingProduct.category || '',
        images: editingProduct.images || [],
        stock: editingProduct.stock || '',
        size: editingProduct.size || '',
        brand: editingProduct.brand || '',
        status: editingProduct.status || 'for-sale'
      });
    } else {
      setFormData({ title: '', price: '', description: '', category: '', images: [], stock: '', size: '', brand: '', status: 'for-sale' });
    }
  }, [editingProduct]);

  // Handle file upload to Cloudinary
  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return;
    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of files) {
        const formDataUpload = new FormData();
        formDataUpload.append('image', file);

        const response = await customFetch.post('/products/upload', formDataUpload, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        uploadedUrls.push(response.data.url);
      }

      // Add uploaded URLs to existing images
      setFormData(prev => ({
        ...prev,
        images: [...prev.images.filter(img => img.trim() !== ''), ...uploadedUrls]
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
      if (error.response?.status === 503) {
        alert('Image upload is not configured. Please set up Cloudinary credentials. You can still add products with manual image URLs.');
      } else {
        alert('Error uploading images. Please try again or use manual image URLs.');
      }
    } finally {
      setUploadingImages(false);
    }
  };
  if (!isAdmin) return <div>Access Denied</div>;

  return (
    <div className="font-eskool max-w-screen-2xl mx-auto px-5 py-8">
      <h1 className="text-3xl font-bold mb-8">admin panel</h1>

      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">products ({products.length})</h2>
          <div className="flex gap-2">
            <button 
              onClick={async () => {
                setLoadingProducts(true);
                try {
                  const res = await customFetch.get('/products');
                  setProducts(res.data);
                } catch (err) {
                  console.error('Error refreshing products:', err);
                } finally {
                  setLoadingProducts(false);
                }
              }}
              className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 text-sm"
            >
              refresh
            </button>
            <button 
              onClick={() => setEditingProduct(null)}
              className="bg-[#6a6c27] text-white px-3 py-2 rounded hover:bg-[#6a6c27]/60 text-sm"
            >
              + add product
            </button>
          </div>
        </div>
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">{editingProduct ? 'Edit Product' : 'add new product'}</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          
          // Filter out empty image URLs and ensure at least one image
          const filteredImages = formData.images.filter(img => img.trim() !== '');
          if (filteredImages.length === 0) {
            alert('Please add at least one image URL or upload an image.');
            return;
          }
          
          const productData = { ...formData, images: filteredImages };
          
          try {
            if (editingProduct) {
              await customFetch.put(`/products/${editingProduct._id}`, productData);
            } else {
              await customFetch.post('/products', productData);
            }
            setFormData({ title: '', price: '', description: '', category: '', images: [], stock: '', size: '', brand: '', status: 'for-sale' });
            setEditingProduct(null);
            // Refresh products
            const res = await customFetch.get('/products');
            setProducts(res.data);
          } catch (err) {
            console.error('Error saving product:', err);
            if (err.response?.data?.errors) {
              alert(`Validation Error: ${err.response.data.errors.join(', ')}`);
            } else if (err.response?.data?.message) {
              alert(`Error: ${err.response.data.message}`);
            } else {
              alert('Error saving product. Please check all required fields.');
            }
          }
        }} className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input type="text" placeholder="Product Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className="bg-white/60 w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price</label>
            <input type="number" step="0.01" placeholder="0.00" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required className="bg-white/60 w-full p-2 border rounded" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea placeholder="Product Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-white/60 w-full p-2 border rounded" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input type="text" placeholder="e.g., Clothing" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required className="bg-white/60 w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="bg-white/60 w-full p-2 border rounded">
              <option value="for-sale">For Sale</option>
              <option value="sold">Sold</option>
              <option value="not-for-sale">Not For Sale</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Stock</label>
            <input type="number" placeholder="Quantity" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} required className="bg-white/60 w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Size</label>
            <input type="text" placeholder="e.g., M" value={formData.size} onChange={(e) => setFormData({ ...formData, size: e.target.value })} required className="bg-white/60 w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Brand</label>
            <input type="text" placeholder="Brand Name" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="bg-white/60 w-full p-2 border rounded" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Images (URLs, comma separated)</label>
            <input type="text" placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg" value={formData.images.join(', ')} onChange={(e) => setFormData({ ...formData, images: e.target.value.split(', ').map(s => s.trim()).filter(s => s !== '') })} className="bg-white/60 w-full p-2 border rounded" />
            {formData.images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.images.map((url, index) => (
                  url && (
                    <div key={index} className="relative">
                      <img src={url} alt={`Preview ${index + 1}`} className="bg-white/60 w-16 h-16 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Upload Images</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) {
                  handleImageUpload(files);
                }
              }}
              disabled={uploadingImages}
              className="w-full p-2 border rounded file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {uploadingImages && <p className="text-sm text-blue-600 mt-1">Uploading images...</p>}
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="bg-[#727263]/80 text-white px-4 py-2 rounded hover:bg-[#727263]">{editingProduct ? 'Update Product' : 'add product'}</button>
            {!editingProduct && (
              <button 
                type="button" 
                onClick={() => setFormData({ title: '', price: '', description: '', category: '', images: [], stock: '', size: '', brand: '', status: 'for-sale' })}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Clear Form
              </button>
            )}
            {editingProduct && <button type="button" onClick={() => { setEditingProduct(null); setFormData({ title: '', price: '', description: '', category: '', images: [], stock: '', size: '', brand: '', status: 'for-sale' }); }} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancel Edit</button>}
          </div>
        </form>
        <div className="space-y-4">
          {loadingProducts ? (
            <div className="text-center py-8 text-gray-500">
              <p>Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No products found. Add your first product above!</p>
            </div>
          ) : (
            products.map((p: any) => (
              <div key={p._id} className="bg-white/60 border p-4 rounded-lg shadow-sm bg-white">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-nightly text-2xl text-gray-900">{p.title}</h3>
                    <p className="text-gray-600 text-sm mt-1">{p.description}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                      <span><strong>Price:</strong> ${p.price}</span>
                      <span><strong>Stock:</strong> {p.stock}</span>
                      <span><strong>Size:</strong> {p.size}</span>
                      <span><strong>Brand:</strong> {p.brand || 'N/A'}</span>
                      <span><strong>Category:</strong> {p.category}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      p.status === 'for-sale' ? 'bg-green-100 text-green-800' : 
                      p.status === 'sold' ? 'bg-red-100 text-red-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {p.status}
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEditingProduct(p)} 
                        className="bg-[#6c6c29] text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete "${p.title}"?`)) {
                            try {
                              await customFetch.delete(`/products/${p._id}`);
                              setProducts(products.filter(prod => prod._id !== p._id));
                            } catch (err) {
                              console.error('Error deleting product:', err);
                              alert('Error deleting product');
                            }
                          }
                        }} 
                        className="bg-red-700/80 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                {p.images && p.images.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2"><strong>Images ({p.images.length}):</strong></p>
                    <div className="flex flex-wrap gap-2">
                      {p.images.slice(0, 4).map((url: string, index: number) => (
                        <img 
                          key={index} 
                          src={url} 
                          alt={`${p.title} ${index + 1}`} 
                          className="w-16 h-16 object-cover rounded border" 
                        />
                      ))}
                      {p.images.length > 4 && (
                        <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-500">
                          +{p.images.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
      </section>
    </div>
  );
};

export default Admin;