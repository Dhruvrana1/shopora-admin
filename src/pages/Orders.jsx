
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Eye,
  X,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { adminApi } from "../services/api";
import "./Orders.css";

const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

function formatMoney(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function formatDate(date) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCustomerName(order) {
  const firstName =
    order?.first_name ??
    order?.firstName ??
    order?.customer_first_name ??
    "";

  const lastName =
    order?.last_name ??
    order?.lastName ??
    order?.customer_last_name ??
    "";

  const fullName = [firstName, lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    order?.customer_name ||
    order?.customerName ||
    order?.name ||
    ""
  );
}

function getCustomerEmail(order) {
  return (
    order?.email ??
    order?.customer_email ??
    order?.customerEmail ??
    ""
  );
}

function Orders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [notice, setNotice] = useState("");

  // Load orders from the backend.
  async function loadOrders() {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const data = await adminApi("/admin/orders");

      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err) {
      setError(err.message || "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  // Search by order number, ID, customer name or email.
  const filteredOrders = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return orders.filter((order) => {
      const customerName = getCustomerName(order).toLowerCase();
      const email = String(getCustomerEmail(order)).toLowerCase();

      const orderNumber = String(
        order?.order_number ?? ""
      ).toLowerCase();

      const orderId = String(order?.id ?? "").toLowerCase();

      const matchesSearch =
        !searchText ||
        orderNumber.includes(searchText) ||
        orderId.includes(searchText) ||
        customerName.includes(searchText) ||
        email.includes(searchText);

      const currentStatus = String(
        order?.order_status ?? ""
      ).toLowerCase();

      const matchesStatus =
        statusFilter === "all" ||
        currentStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  // Load full details for one order.
  async function openOrder(id) {
    setDetailsLoading(true);
    setError("");
    setSelectedOrder(null);

    try {
      const data = await adminApi(`/admin/orders/${id}`);
      setSelectedOrder(data.order || data);
    } catch (err) {
      setError(err.message || "Unable to load order details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  // Save an order status change.
  async function updateStatus(id, newStatus) {
    const previousOrders = orders;
    const previousSelectedOrder = selectedOrder;

    setUpdatingId(id);
    setError("");
    setNotice("");

    // Update the display immediately.
    setOrders((current) =>
      current.map((order) =>
        order.id === id
          ? { ...order, order_status: newStatus }
          : order
      )
    );

    if (selectedOrder?.id === id) {
      setSelectedOrder((current) =>
        current
          ? { ...current, order_status: newStatus }
          : current
      );
    }

    try {
      const data = await adminApi(
        `/admin/orders/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            order_status: newStatus,
          }),
        }
      );

      if (data.order) {
        setOrders((current) =>
          current.map((order) =>
            order.id === id
              ? { ...order, ...data.order }
              : order
          )
        );

        setSelectedOrder((current) =>
          current?.id === id
            ? { ...current, ...data.order }
            : current
        );
      }

      setNotice(`Order status updated to ${newStatus}.`);
    } catch (err) {
      setOrders(previousOrders);
      setSelectedOrder(previousSelectedOrder);
      setError(err.message || "Unable to update order status.");
    } finally {
      setUpdatingId(null);
    }
  }

  // Cancel an order without deleting it.
  async function handleCancelOrder(order) {
    if (
      order.order_status === "cancelled" ||
      order.order_status === "delivered"
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to cancel order ${
        order.order_number || order.id
      }? The order will remain in the database.`
    );

    if (confirmed) {
      await updateStatus(order.id, "cancelled");
    }
  }

  const pendingCount = orders.filter(
    (order) => order.order_status === "pending"
  ).length;

  const processingCount = orders.filter(
    (order) => order.order_status === "processing"
  ).length;

  const deliveredCount = orders.filter(
    (order) => order.order_status === "delivered"
  ).length;

  return (
    <div className="orders-page">
      <div className="orders-header">
        <div>
          <button
            type="button"
            className="orders-back-button"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={17} />
            Dashboard
          </button>

          <h1>Orders</h1>
          <p>Manage and track your Shopora customer orders.</p>
        </div>

        <button
          type="button"
          className="orders-refresh-button"
          onClick={loadOrders}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={loading ? "orders-spinning" : ""}
          />
          {loading ? "Refreshing..." : "Refresh Orders"}
        </button>
      </div>

      {notice && (
        <div className="orders-notice">{notice}</div>
      )}

      {error && (
        <div className="orders-error">{error}</div>
      )}

      <div className="orders-stats">
        <div className="orders-stat-card">
          <span>Total Orders</span>
          <strong>{orders.length}</strong>
        </div>

        <div className="orders-stat-card">
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </div>

        <div className="orders-stat-card">
          <span>Processing</span>
          <strong>{processingCount}</strong>
        </div>

        <div className="orders-stat-card">
          <span>Delivered</span>
          <strong>{deliveredCount}</strong>
        </div>
      </div>

      <div className="orders-toolbar">
        <div className="orders-search">
          <Search size={20} />

          <input
            type="text"
            placeholder="Search order number, customer or email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {search && (
            <button
              type="button"
              className="orders-clear-search"
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <X size={17} />
            </button>
          )}
        </div>

        <select
          className="orders-status-filter"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
          aria-label="Filter orders by status"
        >
          <option value="all">All statuses</option>

          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="orders-results-count">
        Showing {filteredOrders.length} of {orders.length} orders
      </div>

      <div className="orders-table-container">
        {loading ? (
          <div className="orders-empty">
            <RefreshCw size={26} className="orders-spinning" />
            <p>Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="orders-empty">
            <ShoppingBag size={34} />
            <h3>
              {orders.length === 0
                ? "No orders yet"
                : "No matching orders"}
            </h3>
            <p>
              {orders.length === 0
                ? "Customer orders will appear here."
                : "Try another search term or status filter."}
            </p>

            {(search || statusFilter !== "all") && (
              <button
                type="button"
                className="orders-reset-button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>
                      {order.order_number || `#${order.id}`}
                    </strong>
                  </td>

                  <td>
                    <div className="orders-customer">
                      <strong>
                        {getCustomerName(order) || "Customer"}
                      </strong>
                      <span>{getCustomerEmail(order) || "—"}</span>
                    </div>
                  </td>

                  <td>{formatDate(order.created_at)}</td>

                  <td>
                    <strong>
                      {formatMoney(order.total_amount)}
                    </strong>
                  </td>

                  <td>
                    <span
                      className={`orders-payment-status ${
                        String(order.payment_status || "pending")
                          .toLowerCase()
                          .replace(/\s+/g, "-")
                      }`}
                    >
                      {order.payment_status || "pending"}
                    </span>
                  </td>

                  <td>
                    <select
                      className={`orders-status-select ${
                        String(order.order_status || "pending").toLowerCase()
                      }`}
                      value={order.order_status || "pending"}
                      disabled={updatingId === order.id}
                      onChange={(event) =>
                        updateStatus(order.id, event.target.value)
                      }
                      aria-label={`Change status for order ${
                        order.order_number || order.id
                      }`}
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <div className="orders-row-actions">
                      <button
                        type="button"
                        className="orders-view-button"
                        onClick={() => openOrder(order.id)}
                      >
                        <Eye size={15} />
                        View
                      </button>

                      {order.order_status !== "cancelled" &&
                        order.order_status !== "delivered" && (
                          <button
                            type="button"
                            className="orders-cancel-button"
                            disabled={updatingId === order.id}
                            onClick={() => handleCancelOrder(order)}
                          >
                            <XCircle size={15} />
                            Cancel
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detailsLoading && (
        <div className="orders-modal-overlay">
          <div className="orders-modal">
            <p>Loading order details...</p>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div
          className="orders-modal-overlay"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="orders-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="orders-modal-header">
              <div>
                <h2>Order Details</h2>
                <p>
                  {selectedOrder.order_number ||
                    `#${selectedOrder.id}`}
                </p>
              </div>

              <button
                type="button"
                className="orders-modal-close"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
              >
                <X size={21} />
              </button>
            </div>

            <div className="orders-modal-body">
              <div className="orders-detail-grid">
                <div>
                  <span>Customer</span>
                  <strong>
                    {getCustomerName(selectedOrder) || "Customer"}
                  </strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>
                    {getCustomerEmail(selectedOrder) || "—"}
                  </strong>
                </div>

                <div>
                  <span>Mobile</span>
                  <strong>{selectedOrder.mobile || "—"}</strong>
                </div>

                <div>
                  <span>Order Date</span>
                  <strong>{formatDate(selectedOrder.created_at)}</strong>
                </div>

                <div>
                  <span>Payment Status</span>
                  <strong>
                    {selectedOrder.payment_status || "pending"}
                  </strong>
                </div>

                <div>
                  <span>Order Status</span>
                  <strong>
                    {selectedOrder.order_status || "pending"}
                  </strong>
                </div>
              </div>

              {selectedOrder.shipping_address && (
                <div className="orders-shipping">
                  <h3>Shipping Address</h3>
                  <p>
                    {typeof selectedOrder.shipping_address === "string"
                      ? selectedOrder.shipping_address
                      : JSON.stringify(selectedOrder.shipping_address)}
                  </p>
                </div>
              )}

              <div className="orders-items-section">
                <h3>Order Items</h3>

                {Array.isArray(selectedOrder.items) &&
                selectedOrder.items.length > 0 ? (
                  <div className="orders-items-list">
                    {selectedOrder.items.map((item, index) => (
                      <div
                        className="orders-item"
                        key={item.id || `${item.product_id}-${index}`}
                      >
                        <div>
                          <strong>
                            {item.product_name ||
                              item.name ||
                              `Product ${item.product_id || ""}`}
                          </strong>

                          {item.sku && <span>SKU: {item.sku}</span>}

                          <span>
                            Quantity: {item.quantity ?? item.qty ?? 1}
                          </span>
                        </div>

                        <strong>
                          {formatMoney(
                            item.total ??
                              item.total_price ??
                              Number(item.price || item.unit_price || 0) *
                                Number(item.quantity ?? item.qty ?? 1)
                          )}
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No item details available.</p>
                )}
              </div>

              <div className="orders-totals">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatMoney(selectedOrder.subtotal)}</strong>
                </div>

                <div>
                  <span>Shipping</span>
                  <strong>
                    {formatMoney(selectedOrder.shipping_charge)}
                  </strong>
                </div>

                <div>
                  <span>Tax</span>
                  <strong>{formatMoney(selectedOrder.tax)}</strong>
                </div>

                <div className="orders-grand-total">
                  <span>Total</span>
                  <strong>
                    {formatMoney(selectedOrder.total_amount)}
                  </strong>
                </div>
              </div>

              <div className="orders-modal-status">
                <label htmlFor="detail-order-status">
                  Update Order Status
                </label>

                <select
                  id="detail-order-status"
                  className="orders-status-select"
                  value={selectedOrder.order_status || "pending"}
                  disabled={updatingId === selectedOrder.id}
                  onChange={(event) =>
                    updateStatus(selectedOrder.id, event.target.value)
                  }
                >
                  {ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedOrder.order_status !== "cancelled" &&
                selectedOrder.order_status !== "delivered" && (
                  <button
                    type="button"
                    className="orders-cancel-button orders-modal-cancel"
                    disabled={updatingId === selectedOrder.id}
                    onClick={() => handleCancelOrder(selectedOrder)}
                  >
                    <XCircle size={16} />
                    Cancel This Order
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;
