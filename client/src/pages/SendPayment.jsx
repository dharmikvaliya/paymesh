import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import packetService from "../services/packetService";
import transactionService from "../services/transactionService";
import walletService from "../services/walletService";
import { IconPacket, IconCheck, IconCopy, IconAlert, IconShield, IconSend } from "../components/common/Icons";

export const SendPayment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mode: "offline_packet" (default) or "online_transfer"
  const [paymentMode, setPaymentMode] = useState("offline_packet");
  const [receiverId, setReceiverId] = useState("");
  const [amount, setAmount] = useState("");
  const [ttl, setTtl] = useState(5);
  const [description, setDescription] = useState("");

  const [walletBalance, setWalletBalance] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchBalance = async () => {
      try {
        const data = await walletService.getWallet();
        if (data?.wallet?.balance && isMounted) {
          setWalletBalance(Number(data.wallet.balance));
        }
      } catch (err) {
        console.error("Could not fetch balance:", err);
      }
    };

    fetchBalance();

    return () => {
      isMounted = false;
    };
  }, []);

  const validate = () => {
    setError(null);
    const cleanReceiver = receiverId.trim();
    if (!cleanReceiver) {
      setError("Recipient ID is required.");
      return false;
    }

    if (cleanReceiver === user?.id) {
      setError("You cannot send money to yourself.");
      return false;
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than 0.00.");
      return false;
    }

    if (walletBalance !== null && numAmount > walletBalance) {
      setError(`Insufficient balance. Your current balance is ₹${walletBalance.toFixed(2)}.`);
      return false;
    }

    if (paymentMode === "offline_packet") {
      const numTtl = Number(ttl);
      if (!Number.isInteger(numTtl) || numTtl < 1 || numTtl > 50) {
        setError("TTL must be an integer between 1 and 50 hops.");
        return false;
      }
    }

    return true;
  };

  const handleReview = (e) => {
    e.preventDefault();
    if (validate()) {
      setShowReview(true);
    }
  };

  const handleExecutePayment = async () => {
    setSubmitting(true);
    setError(null);

    try {
      if (paymentMode === "offline_packet") {
        const res = await packetService.createPacket({
          receiverId: receiverId.trim(),
          amount: Number(amount),
          ttl: Number(ttl),
        });

        setResult({
          type: "packet",
          title: "Offline Payment Packet Created",
          message: res.message || "Packet created successfully.",
          packet: res.packet,
        });
      } else {
        const res = await transactionService.sendMoney({
          receiverId: receiverId.trim(),
          amount: Number(amount),
          type: "online",
          description: description.trim(),
        });

        setResult({
          type: "transaction",
          title: "Online Transfer Completed",
          message: res.message || "Money transferred instantly.",
          transaction: res.transaction,
        });
      }

      setShowReview(false);
    } catch (err) {
      setError(err.message || "Failed to submit payment request.");
      setShowReview(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyId = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setReceiverId("");
    setAmount("");
    setDescription("");
    setTtl(5);
    setResult(null);
    setError(null);
    setShowReview(false);
  };

  return (
    <div className="form-page">
      <header className="page-header">
        <div>
          <span className="page-kicker">PAYMENTS</span>
          <h1 className="page-title">Send Payment</h1>
          <p className="page-description">
            Create an encrypted offline mesh packet or perform an instant ledger transfer.
          </p>
        </div>

        {walletBalance !== null && (
          <div className="header-balance-indicator">
            <span className="indicator-label">Available to send</span>
            <strong>₹{walletBalance.toFixed(2)} INR</strong>
          </div>
        )}
      </header>

      {error && (
        <div className="banner-alert error-banner" role="alert">
          <IconAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Result Card after successful submission */}
      {result ? (
        <div className="content-card result-card">
          <div className="card-header-simple" style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
            <div className="icon-success" style={{ width: "42px", height: "42px", borderRadius: "10px", display: "grid", placeItems: "center" }}>
              <IconCheck size={22} />
            </div>
            <div>
              <h2 style={{ margin: "0 0 4px 0", fontSize: "18px" }}>{result.title}</h2>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>{result.message}</p>
            </div>
          </div>

          {result.type === "packet" ? (
            <div className="result-details-box">
              <div className="banner-alert" style={{ backgroundColor: "#eff6ff", borderColor: "#bfdbfe", color: "#1e40af", marginBottom: "20px" }}>
                <IconAlert size={16} />
                <span>
                  <strong>Important:</strong> This packet is currently <strong>PENDING</strong> in the mesh network.
                  It travels through nodes and settles when reaching a bridge.
                </span>
              </div>

              <div className="review-list">
                <div className="review-row">
                  <span>Packet ID</span>
                  <div className="id-with-copy">
                    <code>{result.packet.packetId}</code>
                    <button
                      type="button"
                      onClick={() => handleCopyId(result.packet.packetId)}
                      className="copy-btn"
                      title="Copy Packet ID"
                    >
                      {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <div className="review-row">
                  <span>Amount</span>
                  <strong>₹{Number(result.packet.amount).toFixed(2)}</strong>
                </div>

                <div className="review-row">
                  <span>Time-to-Live (TTL)</span>
                  <span>{result.packet.ttl} hops remaining</span>
                </div>

                <div className="review-row">
                  <span>Initial Status</span>
                  <span className="type-tag">Pending Settlement</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "24px", flexWrap: "wrap" }}>
                <button
                  onClick={() => navigate(`/mesh?packetId=${result.packet.packetId}`)}
                  className="primary-btn"
                >
                  Forward in Mesh Network →
                </button>
                <button
                  onClick={() => navigate(`/reconciliation?packetId=${result.packet.packetId}`)}
                  className="secondary-btn"
                >
                  Verify Reconciliation
                </button>
                <button onClick={resetForm} className="text-button">
                  Send Another Payment
                </button>
              </div>
            </div>
          ) : (
            <div className="result-details-box">
              <div className="review-list">
                <div className="review-row">
                  <span>Transaction ID</span>
                  <code>{result.transaction._id}</code>
                </div>
                <div className="review-row">
                  <span>Amount</span>
                  <strong>₹{Number(result.transaction.amount).toFixed(2)}</strong>
                </div>
                <div className="review-row">
                  <span>Status</span>
                  <span className="type-tag">Completed</span>
                </div>
                <div className="review-row">
                  <span>Idempotency Key</span>
                  <code>{result.transaction.idempotencyKey}</code>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                <button onClick={() => navigate("/transactions")} className="primary-btn">
                  View Transactions
                </button>
                <button onClick={resetForm} className="secondary-btn">
                  Send Another
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="form-card-container">
          {/* Mode Switcher */}
          <div className="mode-tab-group" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={paymentMode === "offline_packet"}
              onClick={() => setPaymentMode("offline_packet")}
              className={`mode-tab-btn ${paymentMode === "offline_packet" ? "active" : ""}`}
            >
              <IconPacket size={16} />
              <span>Offline Mesh Packet (Standard)</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={paymentMode === "online_transfer"}
              onClick={() => setPaymentMode("online_transfer")}
              className={`mode-tab-btn ${paymentMode === "online_transfer" ? "active" : ""}`}
            >
              <IconSend size={16} />
              <span>Direct Online Transfer</span>
            </button>
          </div>

          <form onSubmit={handleReview} className="standard-form">
            <div className="form-field-group">
              <label htmlFor="receiverId">
                Recipient User ID <span className="required-star">*</span>
              </label>
              <input
                id="receiverId"
                type="text"
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                placeholder="e.g. 66cd1234567890abcdef1234"
                required
                className="text-input"
              />
              <span className="field-hint">
                Provide the MongoDB ObjectId of the destination user.
              </span>
            </div>

            <div className="form-field-group">
              <label htmlFor="amount">
                Transfer Amount (INR) <span className="required-star">*</span>
              </label>
              <div className="input-prefix-wrapper">
                <span className="input-prefix">₹</span>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="text-input prefixed"
                />
              </div>
            </div>

            {paymentMode === "offline_packet" ? (
              <div className="form-field-group">
                <label htmlFor="ttl">
                  Packet Time-to-Live (TTL Hops) <span className="required-star">*</span>
                </label>
                <input
                  id="ttl"
                  type="number"
                  min="1"
                  max="50"
                  value={ttl}
                  onChange={(e) => setTtl(e.target.value)}
                  required
                  className="text-input"
                />
                <span className="field-hint">
                  Specifies maximum hops through peer nodes before packet expiry. Default is 5.
                </span>
              </div>
            ) : (
              <div className="form-field-group">
                <label htmlFor="description">Payment Note (Optional)</label>
                <input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Consulting fees, lunch share"
                  className="text-input"
                />
              </div>
            )}

            <div className="form-security-notice">
              <IconShield size={16} />
              <span>
                {paymentMode === "offline_packet"
                  ? "Packet payload will be encrypted with AES-256-GCM and cryptographically signed."
                  : "Protected with unique client-side idempotency key to prevent accidental double-charge."}
              </span>
            </div>

            <div className="form-submit-row">
              <button
                type="submit"
                className="primary-btn submit-btn"
                disabled={submitting}
              >
                Review & Confirm Payment →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Modal */}
      {showReview && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-header">
              <h2>Confirm Payment Details</h2>
              <button
                type="button"
                onClick={() => setShowReview(false)}
                className="modal-close-btn"
                aria-label="Close review"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-lead">
                Please double check the details below. This will create a binding cryptographic payload.
              </p>

              <div className="review-list">
                <div className="review-row">
                  <span>Type</span>
                  <strong>{paymentMode === "offline_packet" ? "Offline Mesh Packet" : "Direct Online Transfer"}</strong>
                </div>
                <div className="review-row">
                  <span>Recipient ID</span>
                  <code className="review-code">{receiverId.trim()}</code>
                </div>
                <div className="review-row">
                  <span>Amount</span>
                  <strong className="review-amount">₹{Number(amount).toFixed(2)} INR</strong>
                </div>
                {paymentMode === "offline_packet" && (
                  <div className="review-row">
                    <span>Initial TTL</span>
                    <span>{ttl} hops</span>
                  </div>
                )}
                {paymentMode === "online_transfer" && description && (
                  <div className="review-row">
                    <span>Note</span>
                    <span>{description}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowReview(false)}
                className="secondary-btn"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePayment}
                className="primary-btn"
                disabled={submitting}
              >
                {submitting ? "Processing..." : "Confirm & Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SendPayment;
