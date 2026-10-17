
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockKeyhole, Mail, ArrowRight, ShoppingBag } from "lucide-react";
import { adminApi } from "../services/api";
import "./AdminLogin.css";

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await adminApi("/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!data.accessToken || !data.refreshToken || !data.admin) {
        throw new Error("The login response is missing required information.");
      }

      sessionStorage.setItem("shopora_admin_access_token", data.accessToken);
      sessionStorage.setItem("shopora_admin_refresh_token", data.refreshToken);
      sessionStorage.setItem("shopora_admin_user", JSON.stringify(data.admin));

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <section className="login-brand-panel">
        <a className="login-brand" href="/">
          SHOPORA<span className="login-brand-dot" />
        </a>

        <div className="brand-message">
          <span className="brand-kicker">STORE CONTROL CENTER</span>
          <h1>
            RUN YOUR
            <br />
            WHOLE
            <br />
            STORE<span>.</span>
          </h1>
          <p>One place to manage your products, orders and customers.</p>
        </div>

        <div className="brand-stamp">
          <ShoppingBag size={35} strokeWidth={2.5} />
          <span>ADMIN<br />EDITION</span>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrap">
          <span className="form-kicker">WELCOME BACK</span>
          <h2>ADMIN LOGIN<span>.</span></h2>
          <p className="form-description">
            Sign in to manage your Shopora store.
          </p>

          {error && <div className="login-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <label htmlFor="admin-email">Email address</label>
            <div className="login-input-wrap">
              <Mail size={19} />
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@shopora.com"
                autoComplete="username"
                required
              />
            </div>

            <label htmlFor="admin-password">Password</label>
            <div className="login-input-wrap">
              <LockKeyhole size={19} />
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? "SIGNING IN..." : "SIGN IN TO SHOPORA"}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>

          <p className="login-security">
            <LockKeyhole size={15} />
            Restricted to authorized administrators.
          </p>
        </div>

        <footer className="login-footer">
          SHOPORA ADMIN <span>•</span> STORE MANAGEMENT
        </footer>
      </section>
    </main>
  );
}

export default AdminLogin;
