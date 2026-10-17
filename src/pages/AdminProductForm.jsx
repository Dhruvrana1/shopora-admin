
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ImagePlus, PackagePlus } from "lucide-react";
import { adminApi } from "../services/api";
import "../App.css";

const initialForm = {
  category_id: "",
  name: "",
  slug: "",
  sku: "",
  description: "",
  price: "",
  sale_price: "",
  stock_quantity: "0",
  status: "active",
  meta_title: "",
  meta_description: "",
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f6f7fb",
    padding: "32px",
    color: "#17171d",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
  },
  card: {
    maxWidth: "1200px",
    margin: "0 auto",
    background: "#fff",
    padding: "32px",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
    boxSizing: "border-box",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "20px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: 0,
  },
  label: {
    fontSize: "15px",
    fontWeight: 600,
  },
  input: {
    width: "100%",
    padding: "13px",
    border: "1px solid #d8dbe5",
    borderRadius: "9px",
    fontSize: "15px",
    boxSizing: "border-box",
    background: "#fff",
    color: "#17171d",
  },
  section: {
    marginTop: "30px",
    marginBottom: "18px",
    fontSize: "20px",
  },
  button: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "13px 20px",
    borderRadius: "9px",
    fontWeight: 700,
    fontSize: "15px",
    cursor: "pointer",
  },
};

function getCategoryArray(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.Category)) return data.Category;
  if (Array.isArray(data?.categories)) return data.categories;
  if (Array.isArray(data?.category)) return data.category;

  return [];
}

function AdminProductForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState([]);
  const [image, setImage] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setLoadingCategories(true);
      setError("");

      try {
        const data = await adminApi("/admin/categories");
        const categoryList = getCategoryArray(data);

        if (!cancelled) {
          setCategories(categoryList);

          if (categoryList.length === 0) {
            setError(
              "No categories were returned. Check your categories in the admin panel."
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(`Could not load categories: ${err.message}`);
        }
      } finally {
        if (!cancelled) {
          setLoadingCategories(false);
        }
      }
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => {
      const updated = { ...previous, [name]: value };

      if (name === "name" && !slugManuallyEdited) {
        updated.slug = value
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }

      return updated;
    });
  }

  function renderField(label, name, type = "text", required = false) {
    return (
      <div style={styles.field} key={name}>
        <label style={styles.label} htmlFor={name}>
          {label}{required ? " *" : ""}
        </label>

        <input
          id={name}
          name={name}
          type={type}
          value={form[name]}
          onChange={(event) => {
            if (name === "slug") {
              setSlugManuallyEdited(true);
            }
            handleChange(event);
          }}
          required={required}
          min={type === "number" ? "0" : undefined}
          step={
            name === "price" || name === "sale_price"
              ? "0.01"
              : type === "number"
                ? "1"
                : undefined
          }
          style={styles.input}
        />
      </div>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.category_id) {
      setError("Please select a category.");
      return;
    }

    if (Number(form.price) < 0) {
      setError("Price cannot be negative.");
      return;
    }

    if (
      form.sale_price !== "" &&
      Number(form.sale_price) > Number(form.price)
    ) {
      setError("Sale price cannot be greater than the regular price.");
      return;
    }

    setSaving(true);

    try {
      const productData = {
        ...form,
        category_id: Number(form.category_id),
        price: Number(form.price),
        sale_price: form.sale_price
          ? Number(form.sale_price)
          : null,
        stock_quantity: Number(form.stock_quantity || 0),
        description: form.description || null,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
      };

      const result = await adminApi("/admin/products", {
        method: "POST",
        body: JSON.stringify(productData),
      });

      const createdProduct = result.product;

      if (!createdProduct?.id) {
        setMessage(
          "The server response did not include the new product ID. Check the product list before submitting again."
        );
        return;
      }

      if (image) {
        const imageData = new FormData();
        imageData.append("image", image);
        imageData.append("product_id", String(createdProduct.id));
        imageData.append("alt_text", form.name);
        imageData.append("sort_order", "0");

        try {
          await adminApi("/admin/products/images", {
            method: "POST",
            body: imageData,
          });
        } catch (imageError) {
          setMessage(
            `Product created, but image upload failed: ${imageError.message}`
          );
          return;
        }
      }

      setMessage("Product created successfully!");

      setForm(initialForm);
      setImage(null);
      setSlugManuallyEdited(false);

      // Return to the product list after a short pause so the message is visible.
      setTimeout(() => {
        navigate("/products");
      }, 1000);
    } catch (err) {
      setError(err.message || "Unable to create product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <button
          type="button"
          onClick={() => navigate("/products")}
          style={{
            ...styles.button,
            background: "#ffe66d",
            color: "#17171d",
            border: "2px solid #17171d",
            boxShadow: "3px 3px 0 #17171d",
            marginBottom: "24px",
          }}
        >
          <ArrowLeft size={18} />
          Back to Products
        </button>

        <h1 style={{ fontSize: "clamp(30px, 4vw, 46px)", margin: "8px 0" }}>
          Add New Product
        </h1>

        <p style={{ color: "#666", fontSize: "18px", marginBottom: "28px" }}>
          Enter the product details below.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              background: "#fff0ef",
              color: "#c62828",
              padding: "14px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            style={{
              background: "#eefaf1",
              color: "#176b36",
              padding: "14px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <h3 style={styles.section}>Basic Information</h3>

          <div style={styles.grid}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="category_id">
                Category *
              </label>

              <select
                id="category_id"
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                required
                disabled={loadingCategories || categories.length === 0}
                style={styles.input}
              >
                <option value="">
                  {loadingCategories
                    ? "Loading categories..."
                    : "Select a category"}
                </option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {renderField("Product Name", "name", "text", true)}
            {renderField("Product Slug", "slug", "text", true)}
            {renderField("SKU", "sku", "text", true)}
            {renderField("Price", "price", "number", true)}
            {renderField("Sale Price", "sale_price", "number")}
            {renderField("Stock Quantity", "stock_quantity", "number")}

            <div style={styles.field}>
              <label style={styles.label} htmlFor="status">
                Status
              </label>

              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ ...styles.field, marginTop: "22px" }}>
            <label style={styles.label} htmlFor="description">
              Description
            </label>

            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              style={styles.input}
            />
          </div>

          <h3 style={styles.section}>
            <ImagePlus
              size={20}
              style={{ verticalAlign: "middle", marginRight: "8px" }}
            />
            Product Image
          </h3>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="image">
              Choose an image (optional)
            </label>

            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={(event) =>
                setImage(event.target.files?.[0] || null)
              }
              style={styles.input}
            />

            {image && (
              <small style={{ color: "#555" }}>
                Selected: {image.name}
              </small>
            )}
          </div>

          <h3 style={styles.section}>SEO Details (Optional)</h3>

          <div style={styles.grid}>
            {renderField("Meta Title", "meta_title")}

            <div style={styles.field}>
              <label style={styles.label} htmlFor="meta_description">
                Meta Description
              </label>

              <textarea
                id="meta_description"
                name="meta_description"
                value={form.meta_description}
                onChange={handleChange}
                rows={3}
                style={styles.input}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "32px",
            }}
          >
            <button
              type="submit"
              disabled={
                saving ||
                loadingCategories ||
                categories.length === 0
              }
              style={{
                ...styles.button,
                background: "#293cff",
                color: "#fff",
                border: "2px solid #17171d",
                boxShadow: "3px 3px 0 #17171d",
                opacity:
                  saving || loadingCategories || categories.length === 0
                    ? 0.6
                    : 1,
              }}
            >
              <PackagePlus size={18} />
              {saving ? "Saving Product..." : "Save Product"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/products")}
              style={{
                ...styles.button,
                background: "#fff",
                color: "#17171d",
                border: "1px solid #d8dbe5",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default AdminProductForm;
