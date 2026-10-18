
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowLeft,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { adminApi } from "../services/api";
import "../App.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "https://shopora-backend-h3uj.onrender.com"
).replace(/\/+$/, "");

const initialForm = {
  category_id: "",
  name: "",
  slug: "",
  sku: "",
  description: "",
  price: "",
  sale_price: "",
  stock_quantity: "",
  status: "active",
  meta_title: "",
  meta_description: "",
};

function getProductImages(product) {
  if (Array.isArray(product?.images)) return product.images;
  if (Array.isArray(product?.product_images)) {
    return product.product_images;
  }
  return [];
}

function getImageUrl(image) {
  if (!image) return "";
  if (typeof image === "string") return image;
  return image.image_url || image.url || "";
}

function resolveImageUrl(value) {
  if (!value) return "";
  if (
    /^https?:\/\//i.test(value) ||
    value.startsWith("blob:") ||
    value.startsWith("data:")
  ) {
    return value;
  }

  return `${API_BASE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

function getProductImage(product) {
  const images = getProductImages(product);
  const imageUrl =
    getImageUrl(images[0]) ||
    product?.image_url ||
    product?.thumbnail ||
    (typeof product?.image === "string" ? product.image : "");

  return resolveImageUrl(imageUrl);
}

function getCategoryId(product) {
  return product?.category_id ?? product?.categoryId ?? "";
}

function getList(data, keys = []) {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.Product)) return data.Product;
  if (Array.isArray(data?.data?.products)) return data.data.products;

  return [];
}

function AdminProducts() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageDeleting, setImageDeleting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const busy = saving || imageUploading || imageDeleting;

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const data = await adminApi("/products");
      setProducts(getList(data, ["Product", "products"]));
    } catch (err) {
      setError(err.message || "Unable to load products.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const data = await adminApi("/admin/categories");
      setCategories(getList(data, ["Category", "categories", "category"]));
    } catch (err) {
      console.error("Unable to load categories:", err.message);
    }
  }

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  function openEditForm(product) {
    setActionError("");
    setActionMessage("");
    setSelectedImage(null);
    setSelectedImagePreview("");
    setEditingProduct(product);

    setForm({
      category_id: getCategoryId(product),
      name: product.name ?? "",
      slug: product.slug ?? "",
      sku: product.sku ?? "",
      description: product.description ?? "",
      price: product.price ?? "",
      sale_price: product.sale_price ?? "",
      stock_quantity: product.stock_quantity ?? "",
      status: product.status ?? "active",
      meta_title: product.meta_title ?? "",
      meta_description: product.meta_description ?? "",
    });
  }

  function closeEditForm() {
    if (busy) return;

    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }

    setEditingProduct(null);
    setForm(initialForm);
    setSelectedImage(null);
    setSelectedImagePreview("");
    setActionError("");
    setActionMessage("");
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleProductImageSelect(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setActionError("Please choose a valid image file.");
      return;
    }

    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }

    setActionError("");
    setActionMessage("");
    setSelectedImage(file);
    setSelectedImagePreview(URL.createObjectURL(file));
  }

  function cancelSelectedImage() {
    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }

    setSelectedImage(null);
    setSelectedImagePreview("");
    setActionError("");
    setActionMessage("Selected replacement image cancelled.");
  }

  async function handleRemoveImage(image) {
    if (!editingProduct || !image?.id) {
      setActionError(
        "The saved image ID is missing. Refresh the product list and try again."
      );
      return;
    }

    if (
      !window.confirm(
        "Remove this saved image from the product? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      setImageDeleting(true);
      setActionError("");
      setActionMessage("");

      await adminApi(`/admin/products/images/${image.id}`, {
        method: "DELETE",
      });

      const updatedImages = getProductImages(editingProduct).filter(
        (item) => String(item.id) !== String(image.id)
      );

      const updatedProduct = {
        ...editingProduct,
        images: updatedImages,
        product_images: updatedImages,
      };

      setEditingProduct(updatedProduct);

      setProducts((previous) =>
        previous.map((item) =>
          String(item.id) === String(editingProduct.id)
            ? {
                ...item,
                images: updatedImages,
                product_images: updatedImages,
              }
            : item
        )
      );

      setActionMessage("Product image removed successfully.");
    } catch (err) {
      setActionError(err.message || "Unable to remove the product image.");
    } finally {
      setImageDeleting(false);
    }
  }

  async function handleUpdate(event) {
    event.preventDefault();

    if (!editingProduct) return;

    if (!form.category_id) {
      setActionError("Please select a category.");
      return;
    }

    try {
      setSaving(true);
      setActionError("");
      setActionMessage("");

      const payload = {
        ...form,
        category_id: Number(form.category_id),
        price: Number(form.price),
        sale_price:
          form.sale_price === "" ? null : Number(form.sale_price),
        stock_quantity:
          form.stock_quantity === "" ? 0 : Number(form.stock_quantity),
      };

      await adminApi(`/admin/products/${editingProduct.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (selectedImage) {
        setImageUploading(true);

        const imageData = new FormData();
        imageData.append("image", selectedImage);
        imageData.append("product_id", String(editingProduct.id));
        imageData.append("alt_text", form.name);
        imageData.append("sort_order", "-1");

        try {
          await adminApi("/admin/products/images", {
            method: "POST",
            body: imageData,
          });
        } catch (imageError) {
          await loadProducts();
          setActionError(
            `Product details were saved, but image upload failed: ${imageError.message}`
          );
          return;
        } finally {
          setImageUploading(false);
        }
      }

      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview);
      }

      setEditingProduct(null);
      setForm(initialForm);
      setSelectedImage(null);
      setSelectedImagePreview("");
      setActionMessage("Product updated successfully.");

      await loadProducts();
    } catch (err) {
      setActionError(err.message || "Unable to update the product.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product) {
    if (
      !window.confirm(
        `Are you sure you want to delete "${product.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setError("");

      await adminApi(`/admin/products/${product.id}`, {
        method: "DELETE",
      });

      setProducts((previous) =>
        previous.filter(
          (item) => String(item.id) !== String(product.id)
        )
      );

      if (
        editingProduct &&
        String(editingProduct.id) === String(product.id)
      ) {
        closeEditForm();
      }
    } catch (err) {
      setError(err.message || "Unable to delete the product.");
    }
  }

  const filteredProducts = products.filter((product) =>
    (product.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const fieldStyle = {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #d8dbe5",
    borderRadius: 10,
    fontSize: 14,
    boxSizing: "border-box",
    background: "#fff",
    color: "#17171d",
  };

  const labelStyle = {
    display: "block",
    fontWeight: 800,
    fontSize: 14,
    marginBottom: 8,
  };

  return (
    <section className="dashboard-content">
      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 24,
          padding: "12px 18px",
          border: "2px solid #17171d",
          borderRadius: 10,
          background: "#293cff",
          color: "#fff",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 16,
          boxShadow: "4px 4px 0 #17171d",
        }}
      >
        <ArrowLeft size={18} />
        Back to Dashboard
      </button>

      <div className="welcome-row">
        <div>
          <p className="eyebrow">STORE INVENTORY</p>
          <h1>
            Products<span>.</span>
          </h1>
          <p className="welcome-description">
            Manage your products, prices, stock, and listings.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => navigate("/products/new")}
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {actionMessage && !editingProduct && (
        <div
          role="status"
          style={{
            margin: "18px 0",
            padding: 14,
            borderRadius: 10,
            background: "#eaf8ee",
            color: "#176b36",
            border: "1px solid #ccebd4",
          }}
        >
          {actionMessage}
        </div>
      )}

      <div className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">YOUR CATALOGUE</p>
            <h2>All Products</h2>
          </div>
          <span className="period-label">{products.length} products</span>
        </div>

        <label
          className="search-box"
          style={{ marginTop: 22, width: "100%" }}
        >
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products..."
          />
        </label>

        {error && (
          <div
            style={{
              padding: 14,
              marginTop: 16,
              color: "#b42318",
              background: "#fff0ed",
              borderRadius: 8,
            }}
          >
            {error}
            <button
              type="button"
              onClick={loadProducts}
              style={{ marginLeft: 12, cursor: "pointer" }}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <p style={{ padding: 30, textAlign: "center" }}>
            Loading products...
          </p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 24 }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e5ed" }}>
                  <th style={{ padding: 14 }}>Product</th>
                  <th style={{ padding: 14 }}>Slug</th>
                  <th style={{ padding: 14 }}>Price</th>
                  <th style={{ padding: 14 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const imageUrl = getProductImage(product);

                  return (
                    <tr
                      key={product.id}
                      style={{ borderBottom: "1px solid #eeeeF4" }}
                    >
                      <td style={{ padding: 14, fontWeight: 600 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            minWidth: 190,
                          }}
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={product.name || "Product"}
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                              style={{
                                width: 54,
                                height: 54,
                                objectFit: "contain",
                                borderRadius: 8,
                                border: "1px solid #eeeeF4",
                                background: "#fff",
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 54,
                                height: 54,
                                borderRadius: 8,
                                background: "#f1f2ff",
                                display: "grid",
                                placeItems: "center",
                                flexShrink: 0,
                              }}
                            >
                              <ImageIcon size={22} color="#293cff" />
                            </div>
                          )}
                          <span>{product.name}</span>
                        </div>
                      </td>

                      <td style={{ padding: 14, color: "#777783" }}>
                        {product.slug || "—"}
                      </td>

                      <td style={{ padding: 14, fontWeight: 700 }}>
                        ₹{Number(product.price || 0).toLocaleString("en-IN")}
                      </td>

                      <td style={{ padding: 14, whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          title="Edit product"
                          aria-label={`Edit ${product.name}`}
                          onClick={() => openEditForm(product)}
                          style={{
                            border: 0,
                            background: "#eef0ff",
                            color: "#293cff",
                            padding: 10,
                            borderRadius: 8,
                            marginRight: 8,
                            cursor: "pointer",
                          }}
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          title="Delete product"
                          aria-label={`Delete ${product.name}`}
                          onClick={() => handleDelete(product)}
                          style={{
                            border: 0,
                            background: "#fff0e9",
                            color: "#ff5722",
                            padding: 10,
                            borderRadius: 8,
                            cursor: "pointer",
                          }}
                        >
                          <Trash2 size={17} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ padding: "45px 15px", textAlign: "center" }}
                    >
                      <Package size={35} color="#293cff" />
                      <p style={{ fontWeight: 700 }}>
                        {search
                          ? "No matching products found."
                          : "No products found."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingProduct && (
        <div
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) {
              closeEditForm();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(15, 17, 35, 0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
            overflowY: "auto",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-product-title"
            style={{
              width: "100%",
              maxWidth: 1100,
              maxHeight: "92vh",
              overflowY: "auto",
              background: "#fff",
              borderTop: "6px solid #293cff",
              borderRight: "4px solid #17171d",
              borderRadius: 12,
              padding: 36,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 22,
              }}
            >
              <div>
                <p className="eyebrow">UPDATE DETAILS</p>
                <h2 id="edit-product-title" style={{ margin: "0 0 8px" }}>
                  Edit Product
                </h2>
                <p style={{ color: "#777783", fontSize: 14, margin: 0 }}>
                  Update product details and manage its images.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditForm}
                disabled={busy}
                aria-label="Close edit form"
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 44,
                  height: 44,
                  border: "2px solid #17171d",
                  background: "#ffe66d",
                  color: "#17171d",
                  borderRadius: 9,
                  padding: 9,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {actionMessage && (
              <p
                role="status"
                style={{
                  color: "#176b36",
                  background: "#eaf8ee",
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                {actionMessage}
              </p>
            )}

            {actionError && (
              <p
                role="alert"
                style={{
                  color: "#b42318",
                  background: "#fff0ed",
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                {actionError}
              </p>
            )}

            <form onSubmit={handleUpdate}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 22,
                  marginTop: 26,
                }}
              >
                <label>
                  <span style={labelStyle}>Product Name *</span>
                  <input
                    style={fieldStyle}
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  <span style={labelStyle}>Category *</span>
                  <select
                    style={fieldStyle}
                    name="category_id"
                    value={form.category_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <small style={{ color: "#b42318" }}>
                      Categories could not be loaded. Check the admin categories API.
                    </small>
                  )}
                </label>

                <label>
                  <span style={labelStyle}>Slug *</span>
                  <input
                    style={fieldStyle}
                    name="slug"
                    value={form.slug}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  <span style={labelStyle}>SKU *</span>
                  <input
                    style={fieldStyle}
                    name="sku"
                    value={form.sku}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  <span style={labelStyle}>Price (₹) *</span>
                  <input
                    style={fieldStyle}
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  <span style={labelStyle}>Sale Price (₹)</span>
                  <input
                    style={fieldStyle}
                    name="sale_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.sale_price}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  <span style={labelStyle}>Stock Quantity</span>
                  <input
                    style={fieldStyle}
                    name="stock_quantity"
                    type="number"
                    min="0"
                    value={form.stock_quantity}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  <span style={labelStyle}>Status</span>
                  <select
                    style={fieldStyle}
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </label>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    minWidth: 0,
                  }}
                >
                  <span style={labelStyle}>Product Images</span>

                  {getProductImages(editingProduct).length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 14,
                      }}
                    >
                      {getProductImages(editingProduct).map((image, index) => {
                        const url = getImageUrl(image);

                        return (
                          <div
                            key={image.id ?? `${url}-${index}`}
                            style={{
                              width: 170,
                              padding: 10,
                              border: "1px solid #d8dbe5",
                              borderRadius: 10,
                              background: "#fafaff",
                            }}
                          >
                            <img
                              src={resolveImageUrl(url)}
                              alt={image.alt_text || form.name}
                              style={{
                                width: "100%",
                                height: 120,
                                objectFit: "contain",
                                borderRadius: 8,
                                background: "#fff",
                              }}
                            />

                            <p
                              style={{
                                fontSize: 12,
                                color: "#777783",
                                margin: "8px 0",
                              }}
                            >
                              {index === 0 ? "Primary image" : `Image ${index + 1}`}
                            </p>

                            <button
                              type="button"
                              onClick={() => handleRemoveImage(image)}
                              disabled={busy || !image.id}
                              style={{
                                width: "100%",
                                padding: "8px 10px",
                                border: "1px solid #b42318",
                                borderRadius: 8,
                                background: "#fff0ed",
                                color: "#b42318",
                                fontWeight: 700,
                                cursor: busy || !image.id ? "not-allowed" : "pointer",
                              }}
                            >
                              <Trash2
                                size={14}
                                style={{ verticalAlign: "middle", marginRight: 5 }}
                              />
                              {imageDeleting ? "Removing..." : "Remove Image"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ color: "#777783", fontSize: 13 }}>
                      No saved product images.
                    </p>
                  )}

                  <label htmlFor="product-image-file" style={labelStyle}>
                    Add a replacement image
                  </label>

                  <input
                    id="product-image-file"
                    type="file"
                    accept="image/*"
                    onChange={handleProductImageSelect}
                    disabled={busy}
                    style={{
                      ...fieldStyle,
                      padding: 9,
                      cursor: busy ? "not-allowed" : "pointer",
                    }}
                  />

                  <p style={{ margin: 0, color: "#777783", fontSize: 12 }}>
                    The new image is uploaded when you click Update Product.
                  </p>

                  {selectedImagePreview && (
                    <div style={{ marginTop: 4 }}>
                      <img
                        src={selectedImagePreview}
                        alt="New product image preview"
                        style={{
                          display: "block",
                          width: 150,
                          height: 120,
                          objectFit: "contain",
                          borderRadius: 10,
                          border: "1px solid #d8dbe5",
                          background: "#f5f6fa",
                        }}
                      />

                      <p style={{ color: "#176b36", fontSize: 12 }}>
                        Selected: {selectedImage?.name}
                      </p>

                      <button
                        type="button"
                        onClick={cancelSelectedImage}
                        disabled={busy}
                        style={{
                          padding: "7px 10px",
                          borderRadius: 8,
                          border: "1px solid #17171d",
                          background: "#ffe66d",
                          cursor: "pointer",
                        }}
                      >
                        Cancel selected image
                      </button>
                    </div>
                  )}

                  {imageUploading && (
                    <p role="status" style={{ color: "#293cff", fontSize: 13 }}>
                      Uploading product image...
                    </p>
                  )}
                </div>

                <label style={{ gridColumn: "1 / -1" }}>
                  <span style={labelStyle}>Description</span>
                  <textarea
                    style={{ ...fieldStyle, minHeight: 90, resize: "vertical" }}
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  <span style={labelStyle}>Meta Title</span>
                  <input
                    style={fieldStyle}
                    name="meta_title"
                    value={form.meta_title}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  <span style={labelStyle}>Meta Description</span>
                  <textarea
                    style={{ ...fieldStyle, minHeight: 70, resize: "vertical" }}
                    name="meta_description"
                    value={form.meta_description}
                    onChange={handleChange}
                  />
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 24,
                }}
              >
                <button
                  type="button"
                  onClick={closeEditForm}
                  disabled={busy}
                  style={{
                    padding: "12px 18px",
                    border: "2px solid #17171d",
                    borderRadius: 10,
                    background: "#ffe66d",
                    color: "#17171d",
                    fontWeight: 800,
                    boxShadow: "3px 4px 0 #17171d",
                    cursor: busy ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    padding: "12px 18px",
                    border: "2px solid #17171d",
                    borderRadius: 10,
                    background: "#293cff",
                    color: "#fff",
                    fontWeight: 800,
                    boxShadow: "3px 4px 0 #17171d",
                    cursor: busy ? "wait" : "pointer",
                  }}
                >
                  {imageUploading
                    ? "Uploading image..."
                    : saving
                      ? "Saving..."
                      : "Update Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminProducts;
