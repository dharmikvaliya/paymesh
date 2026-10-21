import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import walletService from "../services/walletService";
import transactionService from "../services/transactionService";
import packetService from "../services/packetService";
import StatusBadge from "../components/common/StatusBadge";
import {
  IconSend,
  IconWallet,
  IconTransactions,
  IconPacket,
  IconRefresh,
} from "../components/common/Icons";

export const Dashboard = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [packets, setPackets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [walletRes, txRes, packetRes] = await Promise.allSettled([
          walletService.getWallet(),
          transactionService.getTransactions(),
          packetService.getPackets(),
        ]);

        if (!isMounted) return;

        if (walletRes.status === "fulfilled" && walletRes.value?.wallet) {
          setWallet(walletRes.value.wallet);
        }
        if (txRes.status === "fulfilled" && Array.isArray(txRes.value?.transactions)) {
          setTransactions(txRes.value.transactions);
        }
        if (packetRes.status === "fulfilled" && Array.isArray(packetRes.value?.packets)) {
          setPackets(packetRes.value.packets);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load dashboard data");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [walletRes, txRes, packetRes] = await Promise.allSettled([
        walletService.getWallet(),
        transactionService.getTransactions(),
        packetService.getPackets(),
      ]);

      if (walletRes.status === "fulfilled" && walletRes.value?.wallet) {
        setWallet(walletRes.value.wallet);
      }
      if (txRes.status === "fulfilled" && Array.isArray(txRes.value?.transactions)) {
        setTransactions(txRes.value.transactions);
      }
      if (packetRes.status === "fulfilled" && Array.isArray(packetRes.value?.packets)) {
        setPackets(packetRes.value.packets);
      }
    } catch (err) {
      setError(err.message || "Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  const recentTransactions = transactions.slice(0, 5);
  const pendingPacketsCount = packets.filter((p) => p.status === "pending").length;
  const deliveredPacketsCount = packets.filter((p) => p.status === "delivered").length;

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <span className="page-kicker">OVERVIEW</span>
          <h1 className="page-title">Welcome back, {user?.name || "Member"}</h1>
          <p className="page-description">
            Your real-time wallet balance, mesh network activity, and recent payments.
          </p>
        </div>

        <div className="header-actions">
          <button
            onClick={handleManualRefresh}
            className="secondary-btn"
            disabled={loading || refreshing}
            title="Refresh dashboard data"
          >
            <IconRefresh size={15} className={refreshing ? "spin-icon" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
          <Link to="/send" className="primary-btn">
            <IconSend size={15} />
            <span>Send Payment</span>
          </Link>
        </div>
      </header>

      {error && (
        <div className="banner-alert error-banner" role="alert">
          <span>{error}</span>
          <button onClick={handleManualRefresh} className="banner-retry-btn">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading real-time account data...</p>
        </div>
      ) : (
        <>
          {/* Main Financial Metrics */}
          <section className="metrics-grid">
            <article className="balance-highlight-card">
              <div className="card-top-row">
                <span className="card-badge-label">AVAILABLE BALANCE</span>
                <StatusBadge status={wallet?.status || "active"} />
              </div>
              <div className="huge-balance-text">
                ₹{wallet ? Number(wallet.balance).toFixed(2) : "0.00"}
              </div>
              <div className="card-bottom-row">
                <span>Currency: {wallet?.currency || "INR"}</span>
                <Link to="/wallet" className="card-action-link">
                  Manage Wallet →
                </Link>
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-header">
                <span className="stat-label">OFFLINE PACKETS</span>
                <span className="stat-icon-wrapper">
                  <IconPacket size={16} />
                </span>
              </div>
              <div className="stat-number">{packets.length}</div>
              <div className="stat-subtext">
                <span>{pendingPacketsCount} pending in mesh</span>
                {deliveredPacketsCount > 0 && (
                  <span> • {deliveredPacketsCount} delivered</span>
                )}
              </div>
              <Link to="/packets" className="stat-link">
                View packets →
              </Link>
            </article>

            <article className="stat-card">
              <div className="stat-header">
                <span className="stat-label">TRANSACTIONS</span>
                <span className="stat-icon-wrapper">
                  <IconTransactions size={16} />
                </span>
              </div>
              <div className="stat-number">{transactions.length}</div>
              <div className="stat-subtext">
                <span>{transactions.filter(t => t.type === "offline").length} offline settled</span>
                <span> • {transactions.filter(t => t.type === "online").length} online</span>
              </div>
              <Link to="/transactions" className="stat-link">
                Transaction history →
              </Link>
            </article>
          </section>

          {/* Quick Actions Bar */}
          <section className="quick-actions-section">
            <div className="quick-actions-grid">
              <Link to="/send" className="quick-action-tile">
                <div className="action-tile-icon">
                  <IconSend size={20} />
                </div>
                <div>
                  <strong>Send Payment</strong>
                  <p>Send instant online transfer or create an offline mesh packet.</p>
                </div>
              </Link>

              <Link to="/wallet" className="quick-action-tile">
                <div className="action-tile-icon">
                  <IconWallet size={20} />
                </div>
                <div>
                  <strong>Fund Wallet</strong>
                  <p>Add funds to your PayMesh balance to enable payments.</p>
                </div>
              </Link>

              <Link to="/packets" className="quick-action-tile">
                <div className="action-tile-icon">
                  <IconPacket size={20} />
                </div>
                <div>
                  <strong>Offline Packets</strong>
                  <p>Inspect encrypted packets, TTLs, and hop progression.</p>
                </div>
              </Link>

              <Link to="/reconciliation" className="quick-action-tile">
                <div className="action-tile-icon">
                  <IconRefresh size={20} />
                </div>
                <div>
                  <strong>Reconciliation</strong>
                  <p>Verify ledger settlement and audit idempotency matching.</p>
                </div>
              </Link>
            </div>
          </section>

          {/* Recent Activity Table */}
          <section className="content-section">
            <div className="section-title-bar">
              <div>
                <span className="section-kicker">ACTIVITY</span>
                <h2 className="section-heading">Recent Transactions</h2>
              </div>
              <Link to="/transactions" className="view-all-link">
                View all ({transactions.length}) →
              </Link>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="empty-state-box">
                <div className="empty-state-icon">↗</div>
                <h3>No transactions yet</h3>
                <p>When you send or receive money, transactions will appear here.</p>
                <Link to="/send" className="primary-btn">
                  Send your first payment
                </Link>
              </div>
            ) : (
              <div className="data-table-container">
                <table className="financial-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Type</th>
                      <th>Counterparty</th>
                      <th>Description</th>
                      <th>Date</th>
                      <th className="amount-col">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((tx) => {
                      const isSender = tx.sender?._id === user?.id || tx.sender === user?.id;
                      const amountNum = Number(tx.amount?.$numberDecimal || tx.amount || 0);
                      const counterparty = isSender
                        ? tx.receiver?.name || tx.receiver?.email || tx.receiver || "Unknown"
                        : tx.sender?.name || tx.sender?.email || tx.sender || "Unknown";

                      return (
                        <tr key={tx._id || tx.idempotencyKey}>
                          <td>
                            <StatusBadge status={tx.status} />
                          </td>
                          <td>
                            <span className="type-tag">{tx.type}</span>
                          </td>
                          <td className="user-col">
                            <strong>{isSender ? `To: ${counterparty}` : `From: ${counterparty}`}</strong>
                          </td>
                          <td className="desc-col">
                            {tx.description || (tx.type === "offline" ? "Offline mesh payment" : "Direct transfer")}
                          </td>
                          <td className="date-col">
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }) : "—"}
                          </td>
                          <td className={`amount-col ${isSender ? "debit" : "credit"}`}>
                            {isSender ? `- ₹${amountNum.toFixed(2)}` : `+ ₹${amountNum.toFixed(2)}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Workflow Guide */}
          <section className="content-section">
            <div className="section-title-bar">
              <div>
                <span className="section-kicker">ARCHITECTURE</span>
                <h2 className="section-heading">Offline Mesh Lifecycle</h2>
              </div>
            </div>

            <div className="workflow-steps-grid">
              <div className="workflow-step-card">
                <span className="step-counter">01</span>
                <h3>Packet Creation</h3>
                <p>Client creates an AES-256-GCM encrypted packet signed with HMAC-SHA256, initial TTL, and idempotency key.</p>
              </div>
              <div className="workflow-step-card">
                <span className="step-counter">02</span>
                <h3>Mesh Forwarding</h3>
                <p>Packet hops across peer nodes. Each hop decrements TTL and increments hop count until reaching the bridge.</p>
              </div>
              <div className="workflow-step-card">
                <span className="step-counter">03</span>
                <h3>Bridge Settlement</h3>
                <p>Bridge verifies signature, verifies sender balance, debits sender, credits recipient, and records idempotency key.</p>
              </div>
              <div className="workflow-step-card">
                <span className="step-counter">04</span>
                <h3>Reconciliation</h3>
                <p>Reconciliation engine checks packet status against settlement transaction for decimal-safe monetary consistency.</p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;
