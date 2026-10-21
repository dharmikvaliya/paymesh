import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import packetService from "../services/packetService";
import StatusBadge from "../components/common/StatusBadge";
import {
  IconPacket,
  IconRefresh,
  IconCopy,
  IconCheck,
  IconAlert,
  IconMesh,
  IconReconcile,
  IconPlus,
} from "../components/common/Icons";

export const OfflinePackets = () => {
  const navigate = useNavigate();

  const [packets, setPackets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [lookupId, setLookupId] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  const [selectedPacket, setSelectedPacket] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPackets = async () => {
      try {
        const data = await packetService.getPackets();
        if (Array.isArray(data?.packets) && isMounted) {
          setPackets(data.packets);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load offline packets");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPackets();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const data = await packetService.getPackets();
      if (Array.isArray(data?.packets)) {
        setPackets(data.packets);
      }
    } catch (err) {
      setError(err.message || "Failed to load offline packets");
    } finally {
      setRefreshing(false);
    }
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!lookupId.trim()) return;

    setLookupLoading(true);
    setLookupError("");

    try {
      const data = await packetService.getPacketById(lookupId.trim());
      if (data?.packet) {
        setSelectedPacket(data.packet);
      }
    } catch (err) {
      setLookupError(err.message || "Packet not found with that identifier.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="packets-page">
      <header className="page-header">
        <div>
          <span className="page-kicker">DISTRIBUTED CACHE</span>
          <h1 className="page-title">Offline Payment Packets</h1>
          <p className="page-description">
            Cryptographic payment packets traversing the mesh network prior to settlement.
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
            <IconPlus size={15} />
            <span>Create Packet</span>
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

      {/* Packet Lookup Box */}
      <div className="content-card lookup-card">
        <form onSubmit={handleLookup} className="lookup-form">
          <div className="lookup-input-group">
            <label htmlFor="lookupId" className="sr-only">Look up Packet ID</label>
            <input
              id="lookupId"
              type="text"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="Paste Packet UUID (e.g. 1a2b3c4d-5678-90ab-cdef-1234567890ab)..."
              className="text-input"
            />
            <button
              type="submit"
              className="primary-btn"
              disabled={lookupLoading || !lookupId.trim()}
            >
              {lookupLoading ? "Looking up..." : "Inspect Packet"}
            </button>
          </div>
          {lookupError && <span className="field-error-msg">{lookupError}</span>}
        </form>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Scanning offline packet store...</p>
        </div>
      ) : packets.length === 0 ? (
        <div className="empty-state-box">
          <div className="empty-state-icon">
            <IconPacket size={24} />
          </div>
          <h3>No offline packets found</h3>
          <p>Packets you create or receive through the mesh network will show here.</p>
          <Link to="/send" className="primary-btn">
            Create an offline packet
          </Link>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="financial-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Packet ID</th>
                <th>Amount</th>
                <th>Remaining TTL</th>
                <th>Hops</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {packets.map((pkt) => (
                <tr
                  key={pkt.packetId}
                  onClick={() => setSelectedPacket(pkt)}
                  className="clickable-row"
                >
                  <td>
                    <StatusBadge status={pkt.status} />
                  </td>
                  <td>
                    <div className="id-with-copy" onClick={(e) => e.stopPropagation()}>
                      <code className="monospace-sm">
                        {pkt.packetId.substring(0, 13)}...
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(pkt.packetId)}
                        className="copy-btn-sm"
                        title="Copy Full Packet ID"
                      >
                        <IconCopy size={13} />
                      </button>
                    </div>
                  </td>
                  <td className="amount-col">
                    ₹{Number(pkt.amount).toFixed(2)}
                  </td>
                  <td>
                    <span className={`ttl-badge ${pkt.ttl <= 1 ? "ttl-critical" : ""}`}>
                      {pkt.ttl} hops
                    </span>
                  </td>
                  <td>
                    <span className="hop-counter">{pkt.hopCount || 0}</span>
                  </td>
                  <td className="date-col">
                    {pkt.createdAt ? new Date(pkt.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : "—"}
                  </td>
                  <td>
                    <div className="table-actions-cell" onClick={(e) => e.stopPropagation()}>
                      {pkt.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => navigate(`/mesh?packetId=${pkt.packetId}`)}
                          className="action-btn-sm"
                          title="Forward packet"
                        >
                          <IconMesh size={13} />
                          <span>Forward</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/reconciliation?packetId=${pkt.packetId}`)}
                        className="action-btn-sm secondary"
                        title="Verify Reconciliation"
                      >
                        <IconReconcile size={13} />
                        <span>Audit</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Packet Inspection Modal */}
      {selectedPacket && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-header">
              <h2>Offline Packet Details</h2>
              <button
                type="button"
                onClick={() => setSelectedPacket(null)}
                className="modal-close-btn"
                aria-label="Close packet details"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="tx-summary-banner">
                <span className="tx-summary-label">Encrypted Packet Amount</span>
                <span className="tx-summary-amount">
                  ₹{Number(selectedPacket.amount).toFixed(2)} INR
                </span>
                <div style={{ marginTop: "8px" }}>
                  <StatusBadge status={selectedPacket.status} />
                </div>
              </div>

              <div className="review-list">
                <div className="review-row">
                  <span>Packet ID</span>
                  <div className="id-with-copy">
                    <code className="review-code">{selectedPacket.packetId}</code>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedPacket.packetId)}
                      className="copy-btn"
                    >
                      {copiedId ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="review-row">
                  <span>Sender</span>
                  <span>
                    {selectedPacket.sender?.name
                      ? `${selectedPacket.sender.name} (${selectedPacket.sender.email})`
                      : String(selectedPacket.sender)}
                  </span>
                </div>

                <div className="review-row">
                  <span>Recipient</span>
                  <span>
                    {selectedPacket.receiver?.name
                      ? `${selectedPacket.receiver.name} (${selectedPacket.receiver.email})`
                      : String(selectedPacket.receiver)}
                  </span>
                </div>

                <div className="review-row">
                  <span>Remaining TTL</span>
                  <strong>{selectedPacket.ttl} hops</strong>
                </div>

                <div className="review-row">
                  <span>Hop Count</span>
                  <span>{selectedPacket.hopCount} traversals</span>
                </div>

                <div className="review-row">
                  <span>Idempotency Key</span>
                  <code className="monospace-sm">{selectedPacket.idempotencyKey}</code>
                </div>

                <div className="review-row">
                  <span>Created At</span>
                  <span>{new Date(selectedPacket.createdAt).toLocaleString()}</span>
                </div>

                {selectedPacket.deliveredAt && (
                  <div className="review-row">
                    <span>Delivered At</span>
                    <span>{new Date(selectedPacket.deliveredAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              {selectedPacket.status === "pending" && (
                <button
                  type="button"
                  onClick={() => navigate(`/mesh?packetId=${selectedPacket.packetId}`)}
                  className="primary-btn"
                >
                  Forward in Mesh
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(`/reconciliation?packetId=${selectedPacket.packetId}`)}
                className="secondary-btn"
              >
                Reconcile
              </button>
              <button
                type="button"
                onClick={() => setSelectedPacket(null)}
                className="text-button"
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

export default OfflinePackets;
