import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import customFetch from "../axios/custom";
import { Link } from "react-router-dom";

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    title: '', price: '', description: '', category: '', images: [] as string[], stock: '', size: '', brand: '', status: 'for-sale' as 'for-sale' | 'sold' | 'not-for-sale'
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const isVideo = (url: string): boolean => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newImages = [...formData.images];
    const draggedImage = newImages[draggedIndex];
    
    // Remove dragged item
    newImages.splice(draggedIndex, 1);
    // Insert at new position
    newImages.splice(dropIndex, 0, draggedImage);
    
    setFormData(prev => ({ ...prev, images: newImages }));
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Move media up/down with buttons
  const moveMedia = (index: number, direction: 'up' | 'down') => {
    const newImages = [...formData.images];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newImages.length) return;
    
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    setFormData(prev => ({ ...prev, images: newImages }));
  };

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

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        title: editingProduct.title || '',
        price: String(editingProduct.price) || '',
        description: editingProduct.description || '',
        category: editingProduct.category || '',
        images: editingProduct.images || [],
        stock: String(editingProduct.stock) || '',
        size: editingProduct.size || '',
        brand: editingProduct.brand || '',
        status: editingProduct.status || 'for-sale'
      });
    } else {
      setFormData({ 
        title: '', 
        price: '', 
        description: '', 
        category: '', 
        images: [], 
        stock: '', 
        size: '', 
        brand: '', 
        status: 'for-sale' 
      });
    }
  }, [editingProduct]);

  const handleMediaUpload = async (files: FileList | null) => {
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

      setFormData(prev => ({
        ...prev,
        images: [...prev.images.filter(img => img.trim() !== ''), ...uploadedUrls]
      }));
    } catch (error: any) {
      console.error('Error uploading media:', error);
      if (error.response?.status === 503) {
        alert('Media upload is not configured. Please set up Cloudinary credentials. You can still add products with manual URLs.');
      } else {
        alert('Error uploading media. Please try again or use manual URLs.');
      }
    } finally {
      setUploadingImages(false);
    }
  };

  if (!isAdmin) return <div>Access Denied</div>;

  return (
    <div className="font-eskool max-w-screen-2xl mx-auto px-5 py-8">
      <h1 className="text-3xl font-bold mb-8">admin panel</h1>
      <Link to="/admin/orders" className="bg-[#6a6c27] text-white px-3 py-2 rounded hover:bg-[#6a6c27]/60 text-sm"  >
          Manage Orders
      </Link>
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
            
            const filteredImages = formData.images.filter(img => img.trim() !== '');
            if (filteredImages.length === 0) {
              alert('Please add at least one image/video URL or upload a file.');
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
              const res = await customFetch.get('/products');
              setProducts(res.data);
            } catch (err: any) {
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
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as 'for-sale' | 'sold' | 'not-for-sale' })} className="bg-white/60 w-full p-2 border rounded">
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
              <label className="block text-sm font-medium mb-1">Media URLs (images/videos, comma separated)</label>
              <input type="text" placeholder="https://example.com/image1.jpg, https://example.com/video1.mp4" value={formData.images.join(', ')} onChange={(e) => setFormData({ ...formData, images: e.target.value.split(', ').map(s => s.trim()).filter(s => s !== '') })} className="bg-white/60 w-full p-2 border rounded" />
              {formData.images.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 mb-2">Drag to reorder, or use arrow buttons</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.images.map((url, index) => (
                      url && (
                        <div 
                          key={index} 
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDrop={(e) => handleDrop(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`relative cursor-move ${draggedIndex === index ? 'opacity-50' : ''}`}
                        >
                          {isVideo(url) ? (
                            <video src={url} className="w-20 h-20 object-cover rounded border" muted />
                          ) : (
                            <img src={url} alt={`Preview ${index + 1}`} className="bg-white/60 w-20 h-20 object-cover rounded border" />
                          )}
                          
                          {/* Order number badge */}
                          <div className="absolute top-0 left-0 bg-[#13341E]/80 text-white text-xs w-5 h-5 flex items-center justify-center rounded-tl">
                            {index + 1}
                          </div>
                          
                          {/* Media type badge */}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 text-center">
                            {isVideo(url) ? '📹' : '🖼️'}
                          </div>
                    
                          
                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))}
                            className="absolute bottom-0 right-0 bg-red-500 text-white rounded w-5 h-5 text-xs flex items-center justify-center hover:bg-red-600"
                            title="Delete"
                          >
                            ×
                          </button>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Upload Images/Videos</label>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    handleMediaUpload(files);
                  }
                }}
                disabled={uploadingImages}
                className="w-full p-2 border rounded file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploadingImages && <p className="text-sm text-blue-600 mt-1">Uploading media...</p>}
              <p className="text-xs text-gray-500 mt-1">Accepts images (JPG, PNG, GIF) and videos (MP4, WebM, MOV)</p>
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
                      <h3 className="text-md hover:text-bold">
                        <Link
                          to={`/product/${p._id}`}
                          className="text-gray-700 font-light text-2xl hover:text-[#3a3d1c] hover:font-semibold"
                        >
                          {p.title}
                        </Link>
                      </h3>
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
                      <p className="text-sm text-gray-600 mb-2"><strong>Media ({p.images.length}):</strong></p>
                      <div className="flex flex-wrap gap-2">
                        {p.images.slice(0, 4).map((url: string, index: number) => (
                          <div key={index} className="relative">
                            {isVideo(url) ? (
                              <video src={url} className="w-16 h-16 object-cover rounded border" muted />
                            ) : (
                              <img 
                                src={url} 
                                alt={`${p.title} ${index + 1}`} 
                                className="w-16 h-16 object-cover rounded border" 
                              />
                            )}
                            <div className="absolute bottom-0 right-0 bg-black/50 text-white text-[10px] px-1">
                              {isVideo(url) ? '📹' : '🖼️'}
                            </div>
                          </div>
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