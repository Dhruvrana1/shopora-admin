
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  Search,
  RefreshCw,
  ArrowLeft,
  Eye,
  X,
  Mail,
  Phone,
  ShoppingBag,
  CircleDollarSign,
  UserCheck,
  UserX,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../services/api";
import "../App.css";
import "./Customers.css";

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const isVerified = (customer) =>
  customer.email_verified === true ||
  customer.email_verified === "true";

const isInactive = (customer) =>
  String(customer.status || "").toLowerCase() === "inactive";

function Customers() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi("/admin/customers");

      const data = Array.isArray(response)
        ? response
        : Array.isArray(response?.customers)
          ? response.customers
          : [];

      setCustomers(data);
    } catch (err) {
      setError(err.message || "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) => {
      const name = [
        customer.first_name,
        customer.last_name,
      ]
        .filter(Boolean)
        .join(" ");

      return [
        name,
        customer.email,
        customer.mobile,
        customer.status,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        );
    });
  }, [customers, search]);

  const totalSpent = customers.reduce(
    (sum, customer) =>
      sum + (Number(customer.total_spent) || 0),
    0
  );

  const verifiedCount = customers.filter(isVerified).length;

  const totalOrders = customers.reduce(
    (sum, customer) =>
      sum + (Number(customer.total_orders) || 0),
    0
  );

  async function viewCustomer(customer) {
    setSelectedCustomer(customer);
    setLoadingDetails(true);

    try {
      const response = await adminApi(
        `/admin/customers/${customer.id}`
      );

      const details = response.customer || response;

      setSelectedCustomer((current) =>
        current?.id === customer.id
          ? { ...customer, ...details }
          : current
      );
    } catch (err) {
      console.error("Unable to load customer details:", err.message);
    } finally {
      setLoadingDetails(false);
    }
  }

  async function deactivateCustomer(customer) {
    if (isInactive(customer)) {
      setError("This customer account is already inactive.");
      return;
    }

    const name = [
      customer.first_name,
      customer.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
      customer.email ||
      `Customer #${customer.id}`;

    const confirmed = window.confirm(
      `Deactivate ${name}?\n\nTheir account will be marked inactive, and their order history will be preserved.`
    );

    if (!confirmed) return;

    setDeactivatingId(customer.id);
    setError("");
    setSuccess("");

    try {
      await adminApi(
        `/admin/customers/${customer.id}/deactivate`,
        { method: "PATCH" }
      );

      const updatedCustomer = {
        ...customer,
        status: "inactive",
      };

      setCustomers((previous) =>
        previous.map((item) =>
          item.id === customer.id
            ? { ...item, status: "inactive" }
            : item
        )
      );

      setSelectedCustomer((current) =>
        current?.id === customer.id
          ? { ...current, ...updatedCustomer }
          : current
      );

      setSuccess(`${name} has been deactivated successfully.`);
    } catch (err) {
      setError(err.message || "Unable to deactivate customer.");
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
    <section className="dashboard-content customers-page">
      <button
        type="button"
        className="customers-back-button"
        onClick={() => navigate("/dashboard")}
      >
        <ArrowLeft size={18} />
        Back to Dashboard
      </button>

      <div className="customers-heading">
        <div>
          <p className="eyebrow">CUSTOMER MANAGEMENT</p>
          <h1>
            Customers<span>.</span>
          </h1>
          <p className="welcome-description">
            View registered customers and their shopping activity.
          </p>
        </div>

        <button
          type="button"
          className="customers-refresh-button"
          onClick={loadCustomers}
          disabled={loading}
        >
          <RefreshCw
            size={18}
            className={loading ? "customers-spin" : ""}
          />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="customers-stats-grid">
        <article className="customers-stat-card">
          <div className="customers-stat-icon purple">
            <Users size={22} />
          </div>
          <p>Total Customers</p>
          <h2>{customers.length}</h2>
          <span>Registered accounts</span>
        </article>

        <article className="customers-stat-card">
          <div className="customers-stat-icon green">
            <UserCheck size={22} />
          </div>
          <p>Verified Emails</p>
          <h2>{verifiedCount}</h2>
          <span>Email verification status</span>
        </article>

        <article className="customers-stat-card">
          <div className="customers-stat-icon orange">
            <ShoppingBag size={22} />
          </div>
          <p>Total Orders</p>
          <h2>{totalOrders}</h2>
          <span>Across all customers</span>
        </article>

        <article className="customers-stat-card">
          <div className="customers-stat-icon blue">
            <CircleDollarSign size={22} />
          </div>
          <p>Total Customer Spend</p>
          <h2>{money(totalSpent)}</h2>
          <span>Paid orders only</span>
        </article>
      </div>

      <section className="panel customers-table-panel">
        <div className="panel-heading customers-panel-heading">
          <div>
            <p className="eyebrow">YOUR CUSTOMER BASE</p>
            <h2>All Customers</h2>
          </div>

          <span className="customers-count">
            {filteredCustomers.length} customers
          </span>
        </div>

        <label className="search-box customers-search">
          <Search size={22} />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, mobile or status..."
          />

          {search && (
            <button
              type="button"
              className="customers-clear-search"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </label>

        {error && (
          <div className="customers-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={loadCustomers}>
              Try again
            </button>
          </div>
        )}

        {success && (
          <div className="customers-success" role="status">
            <UserCheck size={19} />
            <span>{success}</span>
            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss success message"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="customers-empty">
            <RefreshCw size={26} className="customers-spin" />
            <p>Loading customers...</p>
          </div>
        ) : (
          <div className="customers-table-wrap">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Mobile</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                  <th>Email Status</th>
                  <th>Account</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.map((customer) => {
                  const name = [
                    customer.first_name,
                    customer.last_name,
                  ]
                    .filter(Boolean)
                    .join(" ") || "Unnamed Customer";

                  const verified = isVerified(customer);
                  const inactive = isInactive(customer);

                  const initials = name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0].toUpperCase())
                    .join("");

                  return (
                    <tr key={customer.id}>
                      <td>
                        <div className="customers-identity">
                          <div className="customers-avatar">
                            {initials || "C"}
                          </div>

                          <div className="customers-identity-text">
                            <strong>{name}</strong>
                            <span>{customer.email || "No email"}</span>
                          </div>
                        </div>
                      </td>

                      <td>{customer.mobile || "—"}</td>

                      <td>
                        <span className="customers-order-count">
                          {Number(customer.total_orders) || 0}
                        </span>
                      </td>

                      <td className="customers-spend">
                        {money(customer.total_spent)}
                      </td>

                      <td>
                        <span
                          className={`customers-badge ${
                            verified ? "verified" : "unverified"
                          }`}
                        >
                          {verified ? "Verified" : "Unverified"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`customers-badge ${
                            inactive ? "inactive" : "active"
                          }`}
                        >
                          {inactive ? "Inactive" : "Active"}
                        </span>
                      </td>

                      <td>{formatDate(customer.created_at)}</td>

                      <td>
                        <div className="customers-row-actions">
                          <button
                            type="button"
                            className="customers-view-button"
                            title="View customer"
                            aria-label={`View ${name}`}
                            onClick={() => viewCustomer(customer)}
                          >
                            <Eye size={18} />
                          </button>

                          <button
                            type="button"
                            className="customers-delete-button"
                            title={
                              inactive
                                ? "Customer already inactive"
                                : "Deactivate customer"
                            }
                            aria-label={`Deactivate ${name}`}
                            disabled={
                              inactive ||
                              deactivatingId === customer.id
                            }
                            onClick={() => deactivateCustomer(customer)}
                          >
                            {deactivatingId === customer.id ? (
                              <RefreshCw
                                size={18}
                                className="customers-spin"
                              />
                            ) : (
                              <UserX size={18} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <div className="customers-empty">
                        <Users size={30} />
                        <strong>
                          {search
                            ? "No matching customers"
                            : "No customers found"}
                        </strong>
                        <p>
                          {search
                            ? "Try another search term."
                            : "Registered customers will appear here."}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedCustomer && (
        <div
          className="customers-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedCustomer(null);
            }
          }}
        >
          <section
            className="customers-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-modal-title"
          >
            <div className="customers-modal-header">
              <div>
                <p className="eyebrow">CUSTOMER PROFILE</p>
                <h2 id="customer-modal-title">Customer Details</h2>
              </div>

              <button
                type="button"
                className="customers-close-button"
                onClick={() => setSelectedCustomer(null)}
                aria-label="Close customer details"
              >
                <X size={21} />
              </button>
            </div>

            {loadingDetails && (
              <p className="customers-detail-loading">
                Refreshing customer details...
              </p>
            )}

            <div className="customers-modal-profile">
              <div className="customers-avatar large">
                {[
                  selectedCustomer.first_name,
                  selectedCustomer.last_name,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0].toUpperCase())
                  .join("") || "C"}
              </div>

              <div>
                <h3>
                  {[
                    selectedCustomer.first_name,
                    selectedCustomer.last_name,
                  ]
                    .filter(Boolean)
                    .join(" ") || "Unnamed Customer"}
                </h3>
                <span>Customer ID: {selectedCustomer.id}</span>
              </div>
            </div>

            <div className="customers-detail-grid">
              <div className="customers-detail-item">
                <Mail size={19} />
                <div>
                  <span>Email Address</span>
                  <strong>
                    {selectedCustomer.email || "Not provided"}
                  </strong>
                </div>
              </div>

              <div className="customers-detail-item">
                <Phone size={19} />
                <div>
                  <span>Mobile Number</span>
                  <strong>
                    {selectedCustomer.mobile || "Not provided"}
                  </strong>
                </div>
              </div>

              <div className="customers-detail-item">
                <ShoppingBag size={19} />
                <div>
                  <span>Total Orders</span>
                  <strong>
                    {Number(selectedCustomer.total_orders) || 0}
                  </strong>
                </div>
              </div>

              <div className="customers-detail-item">
                <CircleDollarSign size={19} />
                <div>
                  <span>Total Spent</span>
                  <strong>
                    {money(selectedCustomer.total_spent)}
                  </strong>
                </div>
              </div>

              <div className="customers-detail-item">
                <UserCheck size={19} />
                <div>
                  <span>Email Verification</span>
                  <strong>
                    {isVerified(selectedCustomer)
                      ? "Verified"
                      : "Unverified"}
                  </strong>
                </div>
              </div>

              <div className="customers-detail-item">
                <Users size={19} />
                <div>
                  <span>Account Status</span>
                  <strong>
                    {selectedCustomer.status || "Unknown"}
                  </strong>
                </div>
              </div>

              <div className="customers-detail-item">
                <ShoppingBag size={19} />
                <div>
                  <span>Joined On</span>
                  <strong>
                    {formatDate(selectedCustomer.created_at)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="customers-modal-actions">
              {!isInactive(selectedCustomer) && (
                <button
                  type="button"
                  className="customers-modal-delete"
                  disabled={deactivatingId === selectedCustomer.id}
                  onClick={() => deactivateCustomer(selectedCustomer)}
                >
                  <UserX size={17} />
                  {deactivatingId === selectedCustomer.id
                    ? "Deactivating..."
                    : "Deactivate Customer"}
                </button>
              )}

              <button
                type="button"
                className="primary-button customers-modal-done"
                onClick={() => setSelectedCustomer(null)}
              >
                Close Details
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default Customers;
