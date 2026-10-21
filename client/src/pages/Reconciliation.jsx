import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import reconciliationService from "../services/reconciliationService";
import StatusBadge from "../components/common/StatusBadge";
import {
  IconReconcile,
  IconCheck,
  IconAlert,
  IconShield,
  IconCopy,
} from "../components/common/Icons";

export const Reconciliation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [packetId, setPacketId] = useState(searchParams.get("packetId") || "");
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [error, setError] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    const qPacketId = searchParams.get("packetId");
    if (!qPacketId) return;

    let isMounted = true;
    const fetchAudit = async () => {
      try {
        const res = await reconciliationService.reconcilePacket(qPacketId.trim());
        if (isMounted) {
          setAuditResult(res);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Reconciliation check failed.");
        }
      }
    };

    fetchAudit();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const runReconciliation = async (pId) => {
    const targetId = (pId || packetId).trim();
    if (!targetId) return;

    setLoading(true);
    setError(null);
    setAuditResult(null);

    try {
      const res = await reconciliationService.reconcilePacket(targetId);
      setAuditResult(res);
    } catch (err) {
      setError(err.message || "Reconciliation check failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="reconciliation-page">
      <header className="page-header">
        <div>
          <span className="page-kicker">FINANCIAL INTEGRITY</span>
          <h1 className="page-title">Ledger Reconciliation</h1>
          <p className="page-description">
            Audit offline packet records against destination settlement transactions to ensure decimal accuracy and cryptographic agreement.
          </p>
        </div>
      </header>

      {/* Input / Search */}
      <div className="content-card lookup-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runReconciliation();
          }}
          className="lookup-form"
        >
          <div className="lookup-input-group">
            <label htmlFor="reconcilePacketId" className="sr-only">Packet UUID</label>
            <input
              id="reconcilePacketId"
              type="text"
              value={packetId}
              onChange={(e) => setPacketId(e.target.value)}
              placeholder="Enter Packet UUID to audit..."
              className="text-input"
              required
            />
            <button
              type="submit"
              className="primary-btn"
              disabled={loading || !packetId.trim()}
            >
              {loading ? "Auditing..." : "Audit & Reconcile"}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="banner-alert error-banner" role="alert">
          <IconAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Auditing ledger records & idempotency consistency...</p>
        </div>
      ) : auditResult ? (
        <div className="audit-results-container">
          {/* Main Verdict Card */}
          <div
            className={`content-card verdict-card ${
              auditResult.reconciled ? "verdict-success" : "verdict-mismatch"
            }`}
          >
            <div className="verdict-header">
              <div
                className={`verdict-icon ${
                  auditResult.reconciled ? "icon-success" : "icon-mismatch"
                }`}
              >
                {auditResult.reconciled ? (
                  <IconCheck size={28} />
                ) : (
                  <IconAlert size={28} />
                )}
              </div>
              <div>
                <h2>
                  {auditResult.reconciled
                    ? "Reconciliation Verified"
                    : "Reconciliation Discrepancy Detected"}
                </h2>
                <p>
                  {auditResult.message ||
                    auditResult.reason ||
                    "Audit examination concluded."}
                </p>
              </div>
            </div>

            <div className="verdict-summary-pills">
              <span className="summary-pill">
                <strong>Packet Status:</strong>{" "}
                {auditResult.packet?.status || auditResult.packetStatus || "N/A"}
              </span>

              {auditResult.transaction ? (
                <span className="summary-pill">
                  <strong>Transaction Status:</strong>{" "}
                  {auditResult.transaction.status}
                </span>
              ) : (
                <span className="summary-pill">
                  <strong>Transaction:</strong> Not yet settled
                </span>
              )}

              <span className="summary-pill">
                <strong>Arithmetic Check:</strong> Decimal-Safe (2 Decimals)
              </span>
            </div>
          </div>

          {/* Side by Side Comparison Grid */}
          <div className="comparison-grid">
            {/* Packet Record Card */}
            <div className="content-card">
              <div className="card-header-simple">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <IconShield size={18} />
                  <h3>Offline Packet Record</h3>
                </div>
                <p>State as stored in offline mesh collection</p>
              </div>

              <div className="review-list">
                <div className="review-row">
                  <span>Packet ID</span>
                  <code>{auditResult.packet?.packetId || packetId}</code>
                </div>

                <div className="review-row">
                  <span>Recorded Amount</span>
                  <strong>
                    ₹{auditResult.packet?.amount || auditResult.packetAmount || "—"} INR
                  </strong>
                </div>

                <div className="review-row">
                  <span>Lifecycle Status</span>
                  <StatusBadge
                    status={
                      auditResult.packet?.status ||
                      auditResult.packetStatus ||
                      "pending"
                    }
                  />
                </div>

                {auditResult.packet?.idempotencyKey && (
                  <div className="review-row">
                    <span>Idempotency Key</span>
                    <div className="id-with-copy">
                      <code className="monospace-sm">
                        {auditResult.packet.idempotencyKey}
                      </code>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(auditResult.packet.idempotencyKey)
                        }
                        className="copy-btn-sm"
                      >
                        {copiedKey ? <IconCheck size={13} /> : <IconCopy size={13} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Transaction Ledger Card */}
            <div className="content-card">
              <div className="card-header-simple">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <IconCheck size={18} />
                  <h3>Settlement Transaction</h3>
                </div>
                <p>State as settled on core database ledger</p>
              </div>

              {auditResult.transaction ? (
                <div className="review-list">
                  <div className="review-row">
                    <span>Transaction ID</span>
                    <code>{auditResult.transaction.id}</code>
                  </div>

                  <div className="review-row">
                    <span>Settled Amount</span>
                    <strong>
                      ₹{auditResult.transaction.amount || auditResult.transactionAmount || "—"} INR
                    </strong>
                  </div>

                  <div className="review-row">
                    <span>Ledger Status</span>
                    <StatusBadge status={auditResult.transaction.status} />
                  </div>

                  <div className="review-row">
                    <span>Channel Type</span>
                    <span className="type-tag">{auditResult.transaction.type}</span>
                  </div>

                  {auditResult.transaction.idempotencyKey && (
                    <div className="review-row">
                      <span>Matched Key</span>
                      <div className="id-with-copy">
                        <code className="monospace-sm">
                          {auditResult.transaction.idempotencyKey}
                        </code>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(auditResult.transaction.idempotencyKey)
                          }
                          className="copy-btn-sm"
                        >
                          {copiedKey ? <IconCheck size={13} /> : <IconCopy size={13} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state-box" style={{ minHeight: "180px", padding: "20px" }}>
                  <h4>No Settlement Record Found</h4>
                  <p style={{ margin: "6px 0 16px", fontSize: "12px" }}>
                    {auditResult.packetStatus === "pending"
                      ? "This packet is currently pending in the mesh network and has not yet reached a bridge node for settlement."
                      : "The packet is marked non-delivered, which is consistent with having zero transactions."}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(`/mesh?packetId=${packetId}`)}
                    className="secondary-btn"
                  >
                    Open in Mesh Network →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state-box">
          <div className="empty-state-icon">
            <IconReconcile size={24} />
          </div>
          <h3>Ready to Audit</h3>
          <p>
            Enter a packet ID above to inspect whether the packet's cryptographic payload matches its ledger settlement transaction.
          </p>
        </div>
      )}
    </div>
  );
};

export default Reconciliation;
