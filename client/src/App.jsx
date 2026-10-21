import { useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

function App() {
  const [page, setPage] = useState("login");
  const [email, setEmail] = useState("sender@paymesh.test");
  const [password, setPassword] = useState("Demo@12345");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Login failed");
      }

      setToken(data.accessToken);
      setUser(data.user);
      setPage("dashboard");
    } catch (err) {
      setError(err.message || "Unable to connect to PayMesh");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken("");
    setUser(null);
    setPage("login");
  };

  if (page === "login") {
    return (
      <div className="auth-page">
        <div className="auth-brand">
          <span className="brand-mark">P</span>
          <span>PayMesh</span>
        </div>

        <div className="auth-card">
          <div className="auth-heading">
            <span className="eyebrow">
              <span className="status-dot" />
              Secure payment network
            </span>

            <h1>Welcome back</h1>

            <p>
              Sign in to manage your wallet and offline payments.
            </p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </label>

            {error && <div className="form-error">{error}</div>}

            <button
              type="submit"
              className="button button-primary login-button"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="auth-footer">
            <span>Protected by PayMesh authentication</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">P</span>
          <span>PayMesh</span>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item active">
            <span>⌂</span>
            Overview
          </button>

          <button className="nav-item">
            <span>↗</span>
            Send payment
          </button>

          <button className="nav-item">
            <span>◫</span>
            Transactions
          </button>

          <button className="nav-item">
            <span>◇</span>
            Wallet
          </button>

          <button className="nav-item">
            <span>◎</span>
            Network
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="connection-status">
            <span className="status-dot" />
            Network connected
          </div>

          <button className="logout-button" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-kicker">OVERVIEW</span>
            <h1>Good to see you.</h1>
          </div>

          <div className="user-profile">
            <div className="avatar">
              {user?.name?.charAt(0) || "U"}
            </div>

            <div>
              <strong>{user?.name || "PayMesh User"}</strong>
              <span>{user?.email}</span>
            </div>
          </div>
        </header>

        <section className="dashboard-grid">
          <article className="balance-card">
            <div className="card-top">
              <span>AVAILABLE BALANCE</span>
              <span className="verified-badge">
                <span className="status-dot" />
                Active
              </span>
            </div>

            <div className="balance">
              ₹0.00
            </div>

            <div className="balance-meta">
              <span>Wallet connected</span>
              <span>•••• 0000</span>
            </div>
          </article>

          <article className="metric-card">
            <span className="metric-label">OFFLINE PAYMENTS</span>
            <strong>0</strong>
            <span className="metric-description">
              Payments created offline
            </span>
          </article>

          <article className="metric-card">
            <span className="metric-label">NETWORK STATUS</span>

            <div className="network-status">
              <span className="large-status-dot" />
              <strong>Connected</strong>
            </div>

            <span className="metric-description">
              Ready to send payments
            </span>
          </article>
        </section>

        <section className="dashboard-section">
          <div className="section-title-row">
            <div>
              <span className="dashboard-kicker">ACTIVITY</span>
              <h2>Recent transactions</h2>
            </div>

            <button className="text-button">
              View all →
            </button>
          </div>

          <div className="empty-state">
            <div className="empty-icon">↗</div>

            <h3>No transactions yet</h3>

            <p>
              Your completed payments will appear here.
            </p>

            <button className="button button-primary">
              Send your first payment
            </button>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-title-row">
            <div>
              <span className="dashboard-kicker">PAYMENT NETWORK</span>
              <h2>How PayMesh works</h2>
            </div>
          </div>

          <div className="steps-grid">
            <div className="step">
              <span>01</span>
              <strong>Create</strong>
              <p>
                Create a secure payment packet even without connectivity.
              </p>
            </div>

            <div className="step">
              <span>02</span>
              <strong>Forward</strong>
              <p>
                The packet moves through available trusted network nodes.
              </p>
            </div>

            <div className="step">
              <span>03</span>
              <strong>Settle</strong>
              <p>
                The destination receives and settles the payment safely.
              </p>
            </div>

            <div className="step">
              <span>04</span>
              <strong>Reconcile</strong>
              <p>
                PayMesh verifies the final transaction state.
              </p>
            </div>
          </div>
        </section>

        <footer className="dashboard-footer">
          <span>PayMesh</span>
          <span>Secure offline-first payments</span>
          <span>v1.0</span>
        </footer>
      </main>
    </div>
  );
}

export default App;