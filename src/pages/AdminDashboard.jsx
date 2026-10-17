
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Users,
  ArrowUpRight,
  CircleDollarSign,
  Plus,
  TrendingUp,
  Menu,
  LogOut,
} from "lucide-react";

import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { adminApi } from "../services/api";
import "../App.css";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Products", icon: Package, path: "/products" },
  { label: "Categories", icon: Layers, path: "/categories" },
  { label: "Orders", icon: ShoppingBag, path: "/orders" },
  { label: "Customers", icon: Users, path: "/customers" },
];

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const getProducts = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.Product)) return result.Product;
  if (Array.isArray(result?.products)) return result.products;
  if (Array.isArray(result?.products?.rows)) return result.products.rows;
  if (Array.isArray(result?.rows)) return result.rows;
  return [];
};

const getOrders = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.orders)) return result.orders;
  return [];
};

const getCustomers = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.customers)) return result.customers;
  return [];
};

function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [admin, setAdmin] = useState(() => {
    try {
      return JSON.parse(
        sessionStorage.getItem("shopora_admin_user") || "null"
      );
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    products: 0,
    customers: 0,
    pending: 0,
    processing: 0,
    delivered: 0,
  });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [ordersResponse, productsResponse, customersResponse] =
        await Promise.allSettled([
          adminApi("/admin/orders"),
          adminApi("/products"),
          adminApi("/admin/customers"),
        ]);

      const failures = [];

      const orders =
        ordersResponse.status === "fulfilled"
          ? getOrders(ordersResponse.value)
          : (failures.push("orders"), []);

      const products =
        productsResponse.status === "fulfilled"
          ? getProducts(productsResponse.value)
          : (failures.push("products"), []);

      const customers =
        customersResponse.status === "fulfilled"
          ? getCustomers(customersResponse.value)
          : (failures.push("customers"), []);

      const revenue = orders.reduce((total, order) => {
        if (
          String(order.payment_status || "").toLowerCase() !== "paid"
        ) {
          return total;
        }

        return total + (Number(order.total_amount) || 0);
      }, 0);

      const pending = orders.filter(
        (order) =>
          String(order.order_status || "").toLowerCase() === "pending"
      ).length;

      const processing = orders.filter(
        (order) =>
          String(order.order_status || "").toLowerCase() === "processing"
      ).length;

      const delivered = orders.filter(
        (order) =>
          String(order.order_status || "").toLowerCase() === "delivered"
      ).length;

      setStats({
        revenue,
        orders: orders.length,
        products: products.length,
        customers: customers.length,
        pending,
        processing,
        delivered,
      });

      if (failures.length) {
        setError(
          `Some data could not be loaded: ${failures.join(", ")}. ` +
            "Check the corresponding API and try refreshing the page."
        );
      }
    } catch (err) {
      setError(err.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const data = await adminApi("/admin/auth/me");

        if (cancelled) return;

        const profile = data.admin || data.user || data;

        setAdmin(profile);
        sessionStorage.setItem(
          "shopora_admin_user",
          JSON.stringify(profile)
        );
        setProfileError("");
      } catch (err) {
        if (!cancelled) {
          setProfileError(
            err.message || "Could not refresh admin profile."
          );
        }
      }
    }

    loadDashboard();
    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [loadDashboard]);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await adminApi("/admin/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Admin logout request failed:", err.message);
    } finally {
      sessionStorage.removeItem("shopora_admin_access_token");
      sessionStorage.removeItem("shopora_admin_refresh_token");
      sessionStorage.removeItem("shopora_admin_user");

      setAdmin(null);
      navigate("/", { replace: true });
    }
  }

  const adminName =
    admin?.name ||
    admin?.full_name ||
    [admin?.first_name, admin?.last_name].filter(Boolean).join(" ") ||
    admin?.username ||
    admin?.email ||
    "Admin";

  const adminEmail = admin?.email || "Administrator";

  const adminInitials =
    adminName
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "AD";

  const dashboardStats = [
    {
      label: "Total Revenue",
      value: money(stats.revenue),
      description: "Paid orders only",
      icon: CircleDollarSign,
    },
    {
      label: "Total Orders",
      value: stats.orders,
      description: `${stats.pending} pending`,
      icon: ShoppingBag,
    },
    {
      label: "Total Products",
      value: stats.products,
      description: "From product API",
      icon: Package,
    },
    {
      label: "Total Customers",
      value: stats.customers,
      description: "Registered customers",
      icon: Users,
    },
  ];

  return (
    <div className="admin-layout">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 19,
            border: 0,
            background: "rgba(0,0,0,0.35)",
          }}
        />
      )}

      <aside
        className="sidebar"
        style={{
          zIndex: 20,
          transform: mobileNavOpen ? "translateX(0)" : undefined,
        }}
      >
        <div className="admin-brand">
          SHOPORA<span>.</span>
          <small>ADMIN PANEL</small>
        </div>

        <p className="menu-heading">WORKSPACE</p>

        <nav className="sidebar-nav">
          {menuItems.map(({ label, icon: Icon, path }) => {
            const isActive =
              location.pathname === path ||
              (path !== "/dashboard" &&
                location.pathname.startsWith(path + "/"));

            return (
              <button
                type="button"
                key={label}
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  navigate(path);
                  setMobileNavOpen(false);
                }}
              >
                <Icon size={19} />
                <span>{label}</span>
                {isActive && <span className="active-dot" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="admin-profile">
            <div className="profile-avatar">{adminInitials}</div>

            <div style={{ minWidth: 0 }}>
              <strong>{adminName}</strong>
              <small
                style={{
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 160,
                }}
              >
                {adminEmail}
              </small>

              {profileError && (
                <small style={{ color: "#d93025" }}>
                  Profile unavailable
                </small>
              )}
            </div>
          </div>

          <button
            type="button"
            className="nav-item"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{ marginTop: 8 }}
          >
            <LogOut size={19} />
            <span>{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            <Menu size={22} />
          </button>

          <div className="breadcrumb">
            Workspace <span>/</span> <strong>Dashboard</strong>
          </div>
        </header>

        <section className="dashboard-content">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">YOUR STORE AT A GLANCE</p>
              <h1>
                Dashboard<span>.</span>
              </h1>
              <p className="welcome-description">
                Welcome back, {adminName}! Here's what's happening with
                your store.
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

          {error && (
            <div
              role="alert"
              style={{
                padding: 14,
                marginBottom: 18,
                color: "#b42318",
                background: "#fff0ed",
                borderRadius: 8,
              }}
            >
              {error}
              <button
                type="button"
                onClick={loadDashboard}
                style={{
                  marginLeft: 12,
                  cursor: "pointer",
                  border: 0,
                  background: "transparent",
                  fontWeight: 700,
                }}
              >
                Retry
              </button>
            </div>
          )}

          {loading && (
            <p role="status" style={{ marginBottom: 16 }}>
              Loading your store data...
            </p>
          )}

          <div className="stats-grid">
            {dashboardStats.map(({ label, value, description, icon: Icon }) => (
              <article className="stat-card" key={label}>
                <div className="stat-card-top">
                  <span className="stat-icon">
                    <Icon size={21} />
                  </span>
                  <ArrowUpRight size={18} className="stat-arrow" />
                </div>

                <p className="stat-label">{label}</p>
                <h2>{value}</h2>
                <p className="stat-change">{description}</p>
              </article>
            ))}
          </div>

          <div className="dashboard-panels">
            <section className="panel sales-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">PERFORMANCE</p>
                  <h2>Orders Overview</h2>
                </div>

                <button
                  type="button"
                  className="period-label"
                  onClick={() => navigate("/orders")}
                >
                  View orders
                </button>
              </div>

              <div className="sales-empty">
                <div className="sales-graphic">
                  <TrendingUp size={35} />
                </div>

                <h3>Your store at a glance.</h3>
                <p>
                  Track order progress using the latest order data from
                  your backend.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                    margin: "20px 0",
                  }}
                >
                  <div>
                    <strong>{stats.pending}</strong>
                    <p className="stat-label">Pending</p>
                  </div>

                  <div>
                    <strong>{stats.processing}</strong>
                    <p className="stat-label">Processing</p>
                  </div>

                  <div>
                    <strong>{stats.delivered}</strong>
                    <p className="stat-label">Delivered</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => navigate("/orders")}
                >
                  <ShoppingBag size={18} />
                  Manage Orders
                </button>
              </div>
            </section>

            <section className="panel quick-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">SHORTCUTS</p>
                  <h2>Quick Actions</h2>
                </div>
              </div>

              <button
                type="button"
                className="quick-action"
                onClick={() => navigate("/products/new")}
              >
                <span className="quick-icon orange">
                  <Plus size={20} />
                </span>
                <span>
                  <strong>Add a product</strong>
                  <small>Create a new listing</small>
                </span>
                <ArrowUpRight size={18} />
              </button>

              <button
                type="button"
                className="quick-action"
                onClick={() => navigate("/categories")}
              >
                <span className="quick-icon blue">
                  <Layers size={20} />
                </span>
                <span>
                  <strong>Manage categories</strong>
                  <small>Organize your catalogue</small>
                </span>
                <ArrowUpRight size={18} />
              </button>

              <button
                type="button"
                className="quick-action"
                onClick={() => navigate("/orders")}
              >
                <span className="quick-icon yellow">
                  <ShoppingBag size={20} />
                </span>
                <span>
                  <strong>Manage orders</strong>
                  <small>Review customer purchases</small>
                </span>
                <ArrowUpRight size={18} />
              </button>

              <button
                type="button"
                className="quick-action"
                onClick={() => navigate("/customers")}
              >
                <span className="quick-icon blue">
                  <Users size={20} />
                </span>
                <span>
                  <strong>View customers</strong>
                  <small>Review registered customers</small>
                </span>
                <ArrowUpRight size={18} />
              </button>
            </section>
          </div>

          <footer className="dashboard-footer">
            <span>
              SHOPORA<span className="footer-dot">.</span> ADMIN
            </span>
            <span>Store management workspace</span>
          </footer>
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;
