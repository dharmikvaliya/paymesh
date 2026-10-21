import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import meshService from "../services/meshService";
import bridgeService from "../services/bridgeService";
import packetService from "../services/packetService";
import StatusBadge from "../components/common/StatusBadge";
import {
  IconMesh,
  IconCheck,
  IconAlert,
  IconShield,
  IconReconcile,
} from "../components/common/Icons";

export const MeshNetwork = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [packetIdInput, setPacketIdInput] = useState(searchParams.get("packetId") || "");
  const [currentPacket, setCurrentPacket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const [settling, setSettling] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [settlementResult, setSettlementResult] = useState(null);

  // Auto-fetch if packetId query param present
  useEffect(() => {
    const qPacketId = searchParams.get("packetId");
    if (!qPacketId) return;

    let isMounted = true;
    const fetchInitial = async () => {
      try {
        const data = await packetService.getPacketById(qPacketId.trim());
        if (data?.packet && isMounted) {
          setCurrentPacket(data.packet);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to locate packet in mesh store.");
          setCurrentPacket(null);
        }
      }
    };

    fetchInitial();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const inspectPacket = async (pId) => {
    const cleanId = (pId || packetIdInput).trim();
    if (!cleanId) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const data = await packetService.getPacketById(cleanId);
      if (data?.packet) {
        setCurrentPacket(data.packet);
      }
    } catch (err) {
      setError(err.message || "Unable to locate packet in mesh store.");
      setCurrentPacket(null);
    } finally {
      setLoading(false);
    }
  };

  const handleForward = async () => {
    if (!currentPacket?.packetId) return;

    setForwarding(true);
    setError(null);
    setMessage(null);

    try {
      const res = await meshService.forwardPacket(currentPacket.packetId);
      if (res.packet) {
        setCurrentPacket(res.packet);
        setMessage(res.message || "Packet successfully forwarded to next mesh hop.");
      } else {
        setMessage(res.message);
      }
    } catch (err) {
      setError(err.message || "Mesh forwarding failed.");
    } finally {
      setForwarding(false);
    }
  };

  const handleDeliver = async () => {
    if (!currentPacket?.packetId) return;

    setSettling(true);
    setError(null);
    setMessage(null);

    try {
      const res = await bridgeService.deliverPacket(currentPacket.packetId);
      setSettlementResult(res);
      if (res.packet) {
        setCurrentPacket(res.packet);
      } else {
        inspectPacket(currentPacket.packetId);
      }
      setMessage(res.message || "Packet settled by destination bridge.");
    } catch (err) {
      setError(err.message || "Bridge settlement failed.");
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="mesh-page">
      <header className="page-header">
        <div>
          <span className="page-kicker">MESH PROTOCOL</span>
          <h1 className="page-title">Mesh Network & Bridge</h1>
          <p className="page-description">
            Simulate peer-to-peer packet forwarding hops and destination bridge settlement.
          </p>
        </div>
      </header>

      {/* Packet Selection / Input */}
      <div className="content-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            inspectPacket();
          }}
          className="lookup-form"
        >
          <div className="lookup-input-group">
            <label htmlFor="packetIdInput" className="sr-only">Packet UUID</label>
            <input
              id="packetIdInput"
              type="text"
              value={packetIdInput}
              onChange={(e) => setPacketIdInput(e.target.value)}
              placeholder="Enter Packet UUID to load into node simulator..."
              className="text-input"
              required
            />
            <button
              type="submit"
              className="primary-btn"
              disabled={loading || !packetIdInput.trim()}
            >
              {loading ? "Loading..." : "Load Packet"}
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

      {message && (
        <div className="banner-alert success-banner" role="status">
          <IconCheck size={16} />
          <span>{message}</span>
        </div>
      )}

      {currentPacket ? (
        <div className="mesh-interactive-container">
          {/* Packet Hop & TTL Visualizer */}
          <div className="content-card visualizer-card">
            <div className="visualizer-header">
              <div>
                <span className="visualizer-kicker">PROPAGATION STATUS</span>
                <h3>Packet: {currentPacket.packetId.substring(0, 18)}...</h3>
              </div>
              <StatusBadge status={currentPacket.status} />
            </div>

            <div className="hop-progress-track">
              <div className="hop-node-step origin">
                <div className="step-circle active">0</div>
                <span>Origin</span>
              </div>

              <div className="hop-line-connector">
                <div
                  className="hop-line-fill"
                  style={{
                    width: `${Math.min(100, (currentPacket.hopCount || 0) * 25)}%`,
                  }}
                />
              </div>

              <div className="hop-node-step current">
                <div className="step-circle active">
                  {currentPacket.hopCount || 0}
                </div>
                <span>Hops Done</span>
              </div>

              <div className="hop-line-connector" />

              <div className="hop-node-step bridge">
                <div
                  className={`step-circle ${
                    currentPacket.status === "delivered" ? "active" : ""
                  }`}
                >
                  ✓
                </div>
                <span>Bridge</span>
              </div>
            </div>

            <div className="mesh-metrics-row">
              <div className="mesh-metric-item">
                <span className="mesh-metric-label">Remaining TTL</span>
                <strong
                  className={`mesh-metric-value ${
                    currentPacket.ttl <= 1 ? "value-warning" : ""
                  }`}
                >
                  {currentPacket.ttl} hops
                </strong>
              </div>

              <div className="mesh-metric-item">
                <span className="mesh-metric-label">Hops Traversed</span>
                <strong className="mesh-metric-value">
                  {currentPacket.hopCount || 0}
                </strong>
              </div>

              <div className="mesh-metric-item">
                <span className="mesh-metric-label">Amount</span>
                <strong className="mesh-metric-value">
                  ₹{Number(currentPacket.amount).toFixed(2)}
                </strong>
              </div>

              <div className="mesh-metric-item">
                <span className="mesh-metric-label">Integrity</span>
                <span className="verified-mesh-badge">
                  <IconShield size={14} /> Signed
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mesh-controls-row">
              <button
                type="button"
                onClick={handleForward}
                className="primary-btn"
                disabled={
                  forwarding ||
                  settling ||
                  currentPacket.status !== "pending" ||
                  currentPacket.ttl <= 0
                }
              >
                <IconMesh size={16} />
                <span>
                  {forwarding
                    ? "Forwarding Hop..."
                    : currentPacket.status === "pending"
                    ? "Forward Packet (Next Hop)"
                    : `Cannot Forward (${currentPacket.status})`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleDeliver}
                className="secondary-btn"
                disabled={
                  settling ||
                  forwarding ||
                  currentPacket.status === "delivered" ||
                  currentPacket.status === "expired" ||
                  currentPacket.ttl <= 0
                }
              >
                <IconCheck size={16} />
                <span>
                  {settling
                    ? "Settling at Bridge..."
                    : currentPacket.status === "delivered"
                    ? "Already Settled"
                    : "Deliver & Settle at Bridge"}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(`/reconciliation?packetId=${currentPacket.packetId}`)
                }
                className="text-button"
              >
                <IconReconcile size={16} />
                <span>Check Reconciliation →</span>
              </button>
            </div>
          </div>

          {/* Settlement Result if available */}
          {settlementResult && (
            <div className="content-card settlement-card">
              <div className="card-header-simple">
                <h3>Bridge Settlement Details</h3>
                <p>Outcome of HMAC verification and atomic wallet transfer.</p>
              </div>

              <div className="review-list">
                <div className="review-row">
                  <span>Settlement Status</span>
                  <StatusBadge
                    status={settlementResult.success ? "completed" : "failed"}
                  />
                </div>

                <div className="review-row">
                  <span>Message</span>
                  <span>{settlementResult.message}</span>
                </div>

                {settlementResult.transaction && (
                  <>
                    <div className="review-row">
                      <span>Transaction ID</span>
                      <code>{settlementResult.transaction._id}</code>
                    </div>

                    <div className="review-row">
                      <span>Settled Idempotency Key</span>
                      <code>{settlementResult.transaction.idempotencyKey}</code>
                    </div>
                  </>
                )}
              </div>

              <div style={{ marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/reconciliation?packetId=${currentPacket.packetId}`)
                  }
                  className="primary-btn"
                >
                  Run Full Reconciliation Audit →
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state-box">
          <div className="empty-state-icon">
            <IconMesh size={24} />
          </div>
          <h3>No Packet Loaded</h3>
          <p>
            Enter a packet ID above or choose an offline packet from your store to test hop progression.
          </p>
        </div>
      )}
    </div>
  );
};

export default MeshNetwork;
