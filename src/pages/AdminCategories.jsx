import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Layers,
  Pencil,
  Trash2,
  X,
  Search,
  RefreshCw,
  Save,
} from "lucide-react";
import { adminApi } from "../services/api";
import "../App.css";

const initialForm = {
  name: "",
  slug: "",
  description: "",
  image: "",
  meta_title: "",
  meta_description: "",
  status: "active",
  sort_order: "0",
  parent_id: "",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  border: "1px solid #d8dbe5",
  borderRadius: 10,
  fontSize: 14,
  background: "#fff",
  color: "#17171d",
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  minWidth: 0,
};

const buttonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "11px 16px",
  border: "2px solid #17171d",
  borderRadius: 10,
  background: "#293cff",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 800,
  boxShadow: "4px 4px 0 #17171d",
};

function AdminCategories() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  async function loadCategories() {
    setLoading(true);
    setError("");

    try {
      const data = await adminApi("/admin/categories");

      const possibleLists = [
        data,
        data?.Category,
        data?.categories,
        data?.category,
        data?.data?.Category,
        data?.data?.categories,
        data?.data,
      ];

      let list = possibleLists.find(Array.isArray);

      if (!list) {
        const possibleObjects = [
          data?.Category,
          data?.category,
          data?.data?.Category,
          data?.data?.category,
          data?.data,
          data,
        ];

        const singleCategory = possibleObjects.find(
          (item) =>
            item &&
            typeof item === "object" &&
            !Array.isArray(item) &&
            item.id !== undefined &&
            item.name !== undefined
        );

        if (singleCategory) {
          list = [singleCategory];
        }
      }

      if (!list) {
        throw new Error(
          "Unexpected categories response. Please check the backend API."
        );
      }

      setCategories(list);
    } catch (err) {
      setError(err.message || "Unable to load categories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
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

  function openCreateForm() {
    setForm(initialForm);
    setEditingId(null);
    setSlugManuallyEdited(false);
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function openEditForm(category) {
    setForm({
      ...initialForm,
      name: category.name || "",
      slug: category.slug || "",
      description: category.description || "",
      image: category.image || "",
      meta_title: category.meta_title || "",
      meta_description: category.meta_description || "",
      status: category.status || "active",
      sort_order: String(category.sort_order ?? 0),
      parent_id: category.parent_id ?? "",
    });

    setEditingId(category.id);
    setSlugManuallyEdited(true);
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving || imageUploading) return;

    setShowForm(false);
    setEditingId(null);
    setForm(initialForm);
    setSlugManuallyEdited(false);
    setError("");
    setMessage("");
  }

  // Upload the selected image to the backend.
  async function handleImageChange(event) {
    const file = event.target.files?.[0];

    // Allow selecting the same file again if an upload fails.
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    setError("");
    setMessage("");
    setImageUploading(true);

    try {
      const uploadData = new FormData();
      uploadData.append("image", file);

      const result = await adminApi("/admin/categories/image", {
        method: "POST",
        body: uploadData,
      });

      if (!result.image) {
        throw new Error(
          "The upload response did not contain an image URL."
        );
      }

      setForm((previous) => ({
        ...previous,
        image: result.image,
      }));

      setMessage(
        "Image uploaded successfully. Save the category to keep the image."
      );
    } catch (err) {
      setError(err.message || "Unable to upload category image.");
    } finally {
      setImageUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.name.trim() || !form.slug.trim()) {
      setError("Category name and slug are required.");
      return;
    }

    if (
      form.parent_id &&
      editingId !== null &&
      String(form.parent_id) === String(editingId)
    ) {
      setError("A category cannot be its own parent.");
      return;
    }

    if (imageUploading) {
      setError("Please wait for the image upload to finish.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description || null,
        image: form.image || null,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        status: form.status,
        sort_order: Number(form.sort_order || 0),
        parent_id: form.parent_id
          ? Number(form.parent_id)
          : null,
      };

      const endpoint =
        editingId !== null
          ? `/admin/categories/${editingId}`
          : "/admin/categories";

      const result = await adminApi(endpoint, {
        method: editingId !== null ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      setMessage(
        result.message ||
          (editingId !== null
            ? "Category updated successfully."
            : "Category created successfully.")
      );

      setShowForm(false);
      setEditingId(null);
      setForm(initialForm);
      setSlugManuallyEdited(false);

      await loadCategories();
    } catch (err) {
      setError(err.message || "Unable to save category.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${category.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const result = await adminApi(
        `/admin/categories/${category.id}`,
        { method: "DELETE" }
      );

      setMessage(
        result.message || "Category deleted successfully."
      );

      await loadCategories();
    } catch (err) {
      setError(err.message || "Unable to delete category.");
    }
  }

  const filteredCategories = categories.filter((category) => {
    const query = search.toLowerCase();

    return (
      (category.name || "").toLowerCase().includes(query) ||
      (category.slug || "").toLowerCase().includes(query)
    );
  });

  function renderInput(
    label,
    name,
    placeholder = "",
    type = "text"
  ) {
    return (
      <div style={fieldStyle}>
        <label
          htmlFor={name}
          style={{ fontSize: 13, fontWeight: 800 }}
        >
          {label}
        </label>

        <input
          id={name}
          name={name}
          type={type}
          value={form[name] ?? ""}
          onChange={(event) => {
            if (name === "slug") {
              setSlugManuallyEdited(true);
            }

            handleChange(event);
          }}
          placeholder={placeholder}
          required={name === "name" || name === "slug"}
          style={inputStyle}
        />
      </div>
    );
  }

  return (
    <section className="dashboard-content">
      <button
        type="button"
        onClick={() => {
          if (showForm) {
            closeForm();
          } else {
            navigate("/dashboard");
          }
        }}
        style={{ ...buttonStyle, marginBottom: 24 }}
      >
        <ArrowLeft size={18} />
        {showForm ? "Back to Categories" : "Back to Dashboard"}
      </button>

      <div className="welcome-row">
        <div>
          <p className="eyebrow">STORE ORGANIZATION</p>
          <h1>
            Categories<span>.</span>
          </h1>
          <p className="welcome-description">
            Organize your Shopora products into categories.
          </p>
        </div>

        {!showForm && (
          <button
            type="button"
            className="primary-button"
            onClick={openCreateForm}
          >
            <Plus size={18} />
            Add Category
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            margin: "18px 0",
            padding: 14,
            borderRadius: 10,
            background: "#fff0ef",
            color: "#b42318",
            border: "1px solid #ffd0cc",
          }}
        >
          {error}
        </div>
      )}

      {message && !showForm && (
        <div
          role="status"
          style={{
            margin: "18px 0",
            padding: 14,
            borderRadius: 10,
            background: "#eaf8ee",
            color: "#176b36",
          }}
        >
          {message}
        </div>
      )}

      {showForm ? (
        <div
          className="panel"
          style={{
            marginTop: 20,
            borderTop: "6px solid #293cff",
            maxWidth: 1100,
          }}
        >
          <div
            className="panel-heading"
            style={{ alignItems: "center", gap: 12 }}
          >
            <div>
              <p className="eyebrow">
                {editingId !== null
                  ? "UPDATE DETAILS"
                  : "NEW CATEGORY"}
              </p>

              <h2>
                {editingId !== null
                  ? "Edit Category"
                  : "Create Category"}
              </h2>

              <p style={{ color: "#777783", fontSize: 13 }}>
                Category name and slug are required.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              disabled={saving || imageUploading}
              aria-label="Close form"
              style={{
                display: "grid",
                placeItems: "center",
                width: 44,
                height: 44,
                border: "2px solid #17171d",
                borderRadius: 9,
                background: "#ffe66d",
                color: "#17171d",
                cursor: "pointer",
              }}
            >
              <X size={19} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 22,
                marginTop: 26,
              }}
            >
              {renderInput(
                "Category Name *",
                "name",
                "e.g. Electronics"
              )}

              {renderInput(
                "Slug *",
                "slug",
                "e.g. electronics"
              )}

              <div style={fieldStyle}>
                <label
                  htmlFor="parent_id"
                  style={{ fontSize: 13, fontWeight: 800 }}
                >
                  Parent Category
                </label>

                <select
                  id="parent_id"
                  name="parent_id"
                  value={form.parent_id}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="">No parent category</option>

                  {categories
                    .filter(
                      (category) =>
                        String(category.id) !== String(editingId)
                    )
                    .map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>

              <div style={fieldStyle}>
                <label
                  htmlFor="status"
                  style={{ fontSize: 13, fontWeight: 800 }}
                >
                  Status
                </label>

                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {renderInput(
                "Display Order",
                "sort_order",
                "0",
                "number"
              )}

              {/* Category image upload and preview */}
              <div style={fieldStyle}>
                <label
                  htmlFor="category-image-file"
                  style={{ fontSize: 13, fontWeight: 800 }}
                >
                  Category Image
                </label>

                <input
                  id="category-image-file"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={imageUploading || saving}
                  style={{
                    ...inputStyle,
                    padding: 9,
                    cursor:
                      imageUploading || saving
                        ? "not-allowed"
                        : "pointer",
                  }}
                />

                <p
                  style={{
                    margin: 0,
                    color: "#777783",
                    fontSize: 12,
                  }}
                >
                  Choose an image from your computer.
                </p>

                {imageUploading && (
                  <p
                    role="status"
                    style={{
                      margin: 0,
                      color: "#293cff",
                      fontSize: 13,
                    }}
                  >
                    Uploading image...
                  </p>
                )}

                {form.image && (
                  <div style={{ marginTop: 4 }}>
                    <img
                      src={form.image}
                      alt="Category preview"
                      style={{
                        display: "block",
                        width: 120,
                        height: 100,
                        objectFit: "cover",
                        borderRadius: 10,
                        border: "1px solid #d8dbe5",
                        background: "#f5f6fa",
                      }}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setForm((previous) => ({
                          ...previous,
                          image: "",
                        }))
                      }
                      disabled={imageUploading || saving}
                      style={{
                        marginTop: 8,
                        padding: "7px 10px",
                        border: "1px solid #ff5722",
                        borderRadius: 8,
                        background: "#fff0e9",
                        color: "#c2410c",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      Remove Image
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ ...fieldStyle, marginTop: 22 }}>
              <label
                htmlFor="description"
                style={{ fontSize: 13, fontWeight: 800 }}
              >
                Description
              </label>

              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Describe this category..."
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            <h3 style={{ marginTop: 28, marginBottom: 16 }}>
              SEO Details{" "}
              <span
                style={{ color: "#777783", fontWeight: 400 }}
              >
                (Optional)
              </span>
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 22,
              }}
            >
              {renderInput(
                "Meta Title",
                "meta_title",
                "Page title for search engines"
              )}

              <div style={fieldStyle}>
                <label
                  htmlFor="meta_description"
                  style={{ fontSize: 13, fontWeight: 800 }}
                >
                  Meta Description
                </label>

                <textarea
                  id="meta_description"
                  name="meta_description"
                  value={form.meta_description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Short search result description"
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 14,
                marginTop: 28,
                paddingTop: 22,
                borderTop: "1px solid #eeeeF4",
              }}
            >
              <button
                type="submit"
                className="primary-button"
                disabled={saving || imageUploading}
              >
                <Save size={18} />
                {saving
                  ? "Saving..."
                  : imageUploading
                    ? "Uploading image..."
                    : editingId !== null
                      ? "Update Category"
                      : "Save Category"}
              </button>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving || imageUploading}
                style={{
                  padding: "12px 18px",
                  border: "2px solid #17171d",
                  borderRadius: 10,
                  background: "#ffe66d",
                  color: "#17171d",
                  fontWeight: 800,
                  boxShadow: "3px 4px 0 #17171d",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="panel" style={{ marginTop: 20 }}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">YOUR STORE</p>
              <h2>All Categories</h2>
            </div>

            <span className="period-label">
              {categories.length} categories
            </span>
          </div>

          <label
            className="search-box"
            style={{ marginTop: 22, width: "100%" }}
          >
            <Search size={18} />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search categories..."
            />
          </label>

          {loading ? (
            <p style={{ padding: 30, textAlign: "center" }}>
              Loading categories...
            </p>
          ) : error ? (
            <div style={{ padding: 20, textAlign: "center" }}>
              <button
                type="button"
                className="primary-button"
                onClick={loadCategories}
              >
                <RefreshCw size={17} />
                Try Again
              </button>
            </div>
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
                  <tr
                    style={{
                      borderBottom: "1px solid #e5e5ed",
                    }}
                  >
                    <th style={{ padding: 14 }}>Category</th>
                    <th style={{ padding: 14 }}>Slug</th>
                    <th style={{ padding: 14 }}>Status</th>
                    <th style={{ padding: 14 }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCategories.map((category) => (
                    <tr
                      key={category.id}
                      style={{
                        borderBottom: "1px solid #eeeeF4",
                      }}
                    >
                      <td style={{ padding: 14, fontWeight: 700 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          {category.image ? (
                            <img
                              src={category.image}
                              alt={`${category.name} category`}
                              style={{
                                width: 38,
                                height: 38,
                                objectFit: "cover",
                                borderRadius: 8,
                                border: "1px solid #e5e5ed",
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <Layers size={20} color="#293cff" />
                          )}

                          {category.name}
                        </div>
                      </td>

                      <td
                        style={{
                          padding: 14,
                          color: "#777783",
                        }}
                      >
                        {category.slug || "—"}
                      </td>

                      <td style={{ padding: 14 }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "5px 10px",
                            borderRadius: 20,
                            background:
                              category.status === "inactive"
                                ? "#fff0e9"
                                : "#eaf8ee",
                            color:
                              category.status === "inactive"
                                ? "#c2410c"
                                : "#18753b",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {category.status || "active"}
                        </span>
                      </td>

                      <td
                        style={{
                          padding: 14,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <button
                          type="button"
                          title="Edit category"
                          aria-label={`Edit ${category.name}`}
                          onClick={() => openEditForm(category)}
                          style={{
                            border: "1px solid #293cff",
                            background: "#eef0ff",
                            color: "#293cff",
                            padding: 9,
                            borderRadius: 7,
                            marginRight: 8,
                            cursor: "pointer",
                          }}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          title="Delete category"
                          aria-label={`Delete ${category.name}`}
                          onClick={() => handleDelete(category)}
                          style={{
                            border: "1px solid #ff5722",
                            background: "#fff0e9",
                            color: "#ff5722",
                            padding: 9,
                            borderRadius: 7,
                            cursor: "pointer",
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredCategories.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          padding: "45px 15px",
                          textAlign: "center",
                        }}
                      >
                        <Layers size={35} color="#293cff" />

                        <p style={{ fontWeight: 800 }}>
                          {search
                            ? "No matching categories found."
                            : "No categories found."}
                        </p>

                        <p
                          style={{
                            color: "#858592",
                            fontSize: 13,
                          }}
                        >
                          {search
                            ? "Try a different search."
                            : "Create a category to get started."}
                        </p>

                        {!search && (
                          <button
                            type="button"
                            className="primary-button"
                            onClick={openCreateForm}
                            style={{ marginTop: 12 }}
                          >
                            <Plus size={18} />
                            Create Category
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default AdminCategories;