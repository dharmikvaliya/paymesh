import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import transactionService from "../services/transactionService";
import StatusBadge from "../components/common/StatusBadge";
import {
  IconTransactions,
  IconRefresh,
  IconCopy,
  IconCheck,
  IconAlert,
  IconSend,
} from "../components/common/Icons";

export const Transactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTx, setSelectedTx] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTransactions = async () => {
      try {
        const data = await transactionService.getTransactions();
        if (Array.isArray(data?.transactions) && isMounted) {
          setTransactions(data.transactions);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to retrieve transaction records");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTransactions();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const data = await transactionService.getTransactions();
      if (Array.isArray(data?.transactions)) {
        setTransactions(data.transactions);
      }
    } catch (err) {
      setError(err.message || "Failed to retrieve transaction records");
    } finally {
      setRefreshing(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    const isSender = tx.sender?._id === user?.id || tx.sender === user?.id;

    if (activeFilter === "sent" && !isSender) return false;
    if (activeFilter === "received" && isSender) return false;
    if (activeFilter === "offline" && tx.type !== "offline") return false;
    if (activeFilter === "online" && tx.type !== "online") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const counterparty = isSender
        ? (tx.receiver?.name || tx.receiver?.email || tx.receiver || "").toLowerCase()
        : (tx.sender?.name || tx.sender?.email || tx.sender || "").toLowerCase();
      const idKey = (tx.idempotencyKey || "").toLowerCase();
      const txId = (tx._id || "").toLowerCase();

      return counterparty.includes(q) || idKey.includes(q) || txId.includes(q);
    }

    return true;
  });

  return (
    <div className="transactions-page">
      <header className="page-header">
        <div>
          <span className="page-kicker">FINANCIAL AUDIT</span>
          <h1 className="page-title">Transaction Ledger</h1>
          <p className="page-description">
            Complete cryptographic audit trail of online transfers and offline mesh settlements.
          </p>
        </div>

        <div className="header-actions">
          <button
            onClick={handleManualRefresh}
            className="secondary-btn"
            disabled={loading || refreshing}
          >
            <IconRefresh size={15} className={refreshing ? "spin-icon" : ""} />
            <span>{refreshing ? "Updating..." : "Refresh"}</span>
          </button>
          <Link to="/send" className="primary-btn">
            <IconSend size={15} />
            <span>New Transfer</span>
          </Link>
        </div>
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

      {/* Filter and Search Bar */}
      <div className="table-controls-bar">
        <div className="filter-pill-group" role="tablist">
          {[
            { id: "all", label: "All" },
            { id: "sent", label: "Sent (Debits)" },
            { id: "received", label: "Received (Credits)" },
            { id: "offline", label: "Offline Mesh" },
            { id: "online", label: "Online Direct" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeFilter === tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`filter-pill-btn ${activeFilter === tab.id ? "active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="search-input-wrapper">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by counterparty or key..."
            className="search-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading ledger entries...</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="empty-state-box">
          <div className="empty-state-icon">
            <IconTransactions size={24} />
          </div>
          <h3>No transactions match your criteria</h3>
          <p>
            {transactions.length === 0
              ? "Your completed online and offline payments will appear here."
              : "Try adjusting your filter or search query."}
          </p>
          {transactions.length === 0 && (
            <Link to="/send" className="primary-btn">
              Send your first payment
            </Link>
          )}
        </div>
      ) : (
        <div className="data-table-container">
          <table className="financial-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Channel</th>
                <th>Counterparty</th>
                <th>Description</th>
                <th>Date & Time</th>
                <th className="amount-col">Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => {
                const isSender = tx.sender?._id === user?.id || tx.sender === user?.id;
                const amountNum = Number(tx.amount?.$numberDecimal || tx.amount || 0);
                const counterparty = isSender
                  ? tx.receiver?.name || tx.receiver?.email || tx.receiver || "Unknown"
                  : tx.sender?.name || tx.sender?.email || tx.sender || "Unknown";

                return (
                  <tr
                    key={tx._id || tx.idempotencyKey}
                    onClick={() => setSelectedTx(tx)}
                    className="clickable-row"
                  >
                    <td>
                      <StatusBadge status={tx.status} />
                    </td>
                    <td>
                      <span className="type-tag">{tx.type}</span>
                    </td>
                    <td className="user-col">
                      <div className="counterparty-cell">
                        <span className="direction-badge">{isSender ? "OUT" : "IN"}</span>
                        <strong>{counterparty}</strong>
                      </div>
                    </td>
                    <td className="desc-col">
                      {tx.description || (tx.type === "offline" ? "Offline mesh payment" : "Direct transfer")}
                    </td>
                    <td className="date-col">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }) : "—"}
                    </td>
                    <td className={`amount-col ${isSender ? "debit" : "credit"}`}>
                      {isSender ? `- ₹${amountNum.toFixed(2)}` : `+ ₹${amountNum.toFixed(2)}`}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTx(tx);
                        }}
                        className="text-button"
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-header">
              <h2>Transaction Details</h2>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="modal-close-btn"
                aria-label="Close details"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="tx-summary-banner">
                <span className="tx-summary-label">Settlement Amount</span>
                <span className="tx-summary-amount">
                  ₹{Number(selectedTx.amount?.$numberDecimal || selectedTx.amount || 0).toFixed(2)} INR
                </span>
                <div style={{ marginTop: "8px" }}>
                  <StatusBadge status={selectedTx.status} />
                </div>
              </div>

              <div className="review-list">
                <div className="review-row">
                  <span>Transaction ID</span>
                  <code>{selectedTx._id}</code>
                </div>

                <div className="review-row">
                  <span>Channel Type</span>
                  <span className="type-tag">{selectedTx.type}</span>
                </div>

                <div className="review-row">
                  <span>Sender</span>
                  <span>
                    {selectedTx.sender?.name ? `${selectedTx.sender.name} (${selectedTx.sender.email})` : String(selectedTx.sender)}
                  </span>
                </div>

                <div className="review-row">
                  <span>Recipient</span>
                  <span>
                    {selectedTx.receiver?.name ? `${selectedTx.receiver.name} (${selectedTx.receiver.email})` : String(selectedTx.receiver)}
                  </span>
                </div>

                <div className="review-row">
                  <span>Idempotency Key</span>
                  <div className="id-with-copy">
                    <code className="review-code">{selectedTx.idempotencyKey}</code>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedTx.idempotencyKey)}
                      className="copy-btn"
                    >
                      {copiedKey ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="review-row">
                  <span>Timestamp</span>
                  <span>{new Date(selectedTx.createdAt).toLocaleString()}</span>
                </div>

                {selectedTx.description && (
                  <div className="review-row">
                    <span>Description</span>
                    <span>{selectedTx.description}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="secondary-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
