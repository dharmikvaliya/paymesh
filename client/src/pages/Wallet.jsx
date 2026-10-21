import { useState, useEffect } from "react";
import useAuth from "../hooks/useAuth";
import walletService from "../services/walletService";
import StatusBadge from "../components/common/StatusBadge";
import {
  IconPlus,
  IconCopy,
  IconCheck,
  IconRefresh,
  IconAlert,
  IconShield,
} from "../components/common/Icons";

export const Wallet = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [fundAmount, setFundAmount] = useState("");
  const [funding, setFunding] = useState(false);
  const [fundSuccessMsg, setFundSuccessMsg] = useState("");
  const [fundError, setFundError] = useState("");
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadWallet = async () => {
      try {
        const data = await walletService.getWallet();
        if (data?.wallet && isMounted) {
          setWallet(data.wallet);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to fetch wallet details");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadWallet();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const data = await walletService.getWallet();
      if (data?.wallet) {
        setWallet(data.wallet);
      }
    } catch (err) {
      setError(err.message || "Unable to fetch wallet details");
    } finally {
      setRefreshing(false);
    }
  };

  const handleFund = async (e) => {
    e.preventDefault();
    setFundError("");
    setFundSuccessMsg("");

    const num = Number(fundAmount);
    if (!Number.isFinite(num) || num <= 0) {
      setFundError("Please enter a valid amount greater than zero.");
      return;
    }

    setFunding(true);
    try {
      const res = await walletService.fundWallet(user?.id, num);
      setFundSuccessMsg(`Successfully credited ₹${num.toFixed(2)} to your wallet.`);
      setFundAmount("");
      if (res?.wallet) {
        setWallet(res.wallet);
      } else {
        await handleManualRefresh();
      }
    } catch (err) {
      setFundError(err.message || "Failed to fund wallet.");
    } finally {
      setFunding(false);
    }
  };

  const handleCopyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const setPresetAmount = (preset) => {
    setFundAmount(preset.toString());
  };

  return (
    <div className="wallet-page">
      <header className="page-header">
        <div>
          <span className="page-kicker">FINANCIAL ACCOUNT</span>
          <h1 className="page-title">Wallet & Balance</h1>
          <p className="page-description">
            Inspect your available liquidity, deposit funds, and share your receiving ID.
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          className="secondary-btn"
          disabled={loading || refreshing}
        >
          <IconRefresh size={15} className={refreshing ? "spin-icon" : ""} />
          <span>{refreshing ? "Updating..." : "Refresh"}</span>
        </button>
      </header>

      {error && (
        <div className="banner-alert error-banner" role="alert">
          <IconAlert size={16} />
          <span>{error}</span>
          <button onClick={handleManualRefresh} className="banner-retry-btn">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Retrieving wallet status...</p>
        </div>
      ) : (
        <div className="wallet-layout-grid">
          {/* Main Wallet Information Card */}
          <div className="wallet-main-col">
            <article className="balance-highlight-card large-card">
              <div className="card-top-row">
                <span className="card-badge-label">AVAILABLE LIQUIDITY</span>
                <StatusBadge status={wallet?.status || "active"} />
              </div>

              <div className="huge-balance-text">
                ₹{wallet ? Number(wallet.balance).toFixed(2) : "0.00"}
              </div>

              <div className="card-bottom-row">
                <span>Currency: {wallet?.currency || "INR"}</span>
                <span>Type: Decimal128 Ledger</span>
              </div>
            </article>

            {/* Wallet Details List */}
            <div className="content-card wallet-meta-card">
              <div className="card-header-simple">
                <h3>Account Identifiers</h3>
                <span className="card-hint">Share this user ID with counterparties to receive funds</span>
              </div>

              <div className="meta-list">
                <div className="meta-row">
                  <span className="meta-key">Your User / Receiver ID</span>
                  <div className="id-with-copy">
                    <code>{user?.id || "—"}</code>
                    <button
                      type="button"
                      onClick={handleCopyUserId}
                      className="copy-btn"
                      title="Copy User ID for receiving payments"
                    >
                      {copiedId ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      <span>{copiedId ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <div className="meta-row">
                  <span className="meta-key">Wallet Document ID</span>
                  <code>{wallet?.id || wallet?._id || "—"}</code>
                </div>

                <div className="meta-row">
                  <span className="meta-key">Account Holder</span>
                  <span>{user?.name} ({user?.email})</span>
                </div>

                <div className="meta-row">
                  <span className="meta-key">Ledger Security</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <IconShield size={14} />
                    Atomic MongoDB Transactions (session.withTransaction)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Funding Section */}
          <div className="wallet-side-col">
            <div className="content-card funding-card">
              <div className="card-header-simple">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <IconPlus size={18} />
                  <h3>Deposit Funds</h3>
                </div>
                <p>Simulate account funding via the backend test fixture.</p>
              </div>

              {fundSuccessMsg && (
                <div className="banner-alert success-banner" role="status">
                  <IconCheck size={15} />
                  <span>{fundSuccessMsg}</span>
                </div>
              )}

              {fundError && (
                <div className="banner-alert error-banner" role="alert">
                  <IconAlert size={15} />
                  <span>{fundError}</span>
                </div>
              )}

              <form onSubmit={handleFund} className="funding-form">
                <div className="form-field-group">
                  <label htmlFor="fundAmount">Deposit Amount (INR)</label>
                  <div className="input-prefix-wrapper">
                    <span className="input-prefix">₹</span>
                    <input
                      id="fundAmount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      placeholder="500.00"
                      required
                      className="text-input prefixed"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="presets-row">
                  <button
                    type="button"
                    onClick={() => setPresetAmount(250)}
                    className="preset-btn"
                  >
                    +₹250
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetAmount(500)}
                    className="preset-btn"
                  >
                    +₹500
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetAmount(1000)}
                    className="preset-btn"
                  >
                    +₹1,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetAmount(5000)}
                    className="preset-btn"
                  >
                    +₹5,000
                  </button>
                </div>

                <button
                  type="submit"
                  className="primary-btn submit-btn"
                  disabled={funding}
                >
                  {funding ? "Processing Deposit..." : "Deposit to Wallet"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
