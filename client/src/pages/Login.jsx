import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { IconShield } from "../components/common/Icons";

export const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("sender@paymesh.test");
  const [password, setPassword] = useState("Demo@12345");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const { login, register, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    clearError();
    setSubmitting(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          setFormError("Full name is required.");
          setSubmitting(false);
          return;
        }
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(err.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setFormError("");
    clearError();
  };

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
            Decentralized Mesh Settlement
          </span>

          <h1>{isRegister ? "Create account" : "Welcome back"}</h1>

          <p>
            {isRegister
              ? "Register to participate in the offline-first payment mesh."
              : "Sign in to access your wallet, transactions, and packet network."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <label>
              Full Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alice Sharma"
                required={isRegister}
                autoComplete="name"
              />
            </label>
          )}

          <label>
            Email Address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
          </label>

          {formError && (
            <div className="form-error" role="alert">
              {formError}
            </div>
          )}

          <button
            type="submit"
            className="button button-primary login-button"
            disabled={submitting}
          >
            {submitting
              ? isRegister
                ? "Creating account..."
                : "Signing in..."
              : isRegister
              ? "Create PayMesh Account"
              : "Sign in to Dashboard"}
          </button>
        </form>

        <div style={{ marginTop: "16px", textAlign: "center" }}>
          <button
            type="button"
            onClick={toggleMode}
            className="text-button"
            style={{ fontSize: "12px", color: "#475569", textDecoration: "underline" }}
          >
            {isRegister
              ? "Already have an account? Sign in"
              : "Need a PayMesh account? Register here"}
          </button>
        </div>

        <div className="auth-footer">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <IconShield size={14} />
            <span>End-to-end encrypted packet payloads (AES-256-GCM + HMAC-SHA256)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
