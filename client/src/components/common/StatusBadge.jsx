export const StatusBadge = ({ status = "pending" }) => {
  const norm = String(status).toLowerCase();

  const getVariant = () => {
    switch (norm) {
      case "completed":
      case "delivered":
      case "active":
      case "reconciled":
        return {
          bg: "#ecfdf5",
          color: "#047857",
          border: "#a7f3d0",
          dot: "#10b981",
          label: norm.charAt(0).toUpperCase() + norm.slice(1),
        };
      case "pending":
      case "processing":
        return {
          bg: "#fffbeb",
          color: "#b45309",
          border: "#fde68a",
          dot: "#f59e0b",
          label: "Pending",
        };
      case "expired":
      case "failed":
      case "blocked":
      case "unreconciled":
        return {
          bg: "#fef2f2",
          color: "#b91c1c",
          border: "#fecaca",
          dot: "#ef4444",
          label: norm.charAt(0).toUpperCase() + norm.slice(1),
        };
      default:
        return {
          bg: "#f8fafc",
          color: "#475569",
          border: "#e2e8f0",
          dot: "#94a3b8",
          label: norm,
        };
    }
  };

  const v = getVariant();

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "3px 9px",
        borderRadius: "9999px",
        fontSize: "11px",
        fontWeight: "600",
        backgroundColor: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        letterSpacing: "0.02em",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: v.dot,
        }}
      />
      {v.label}
    </span>
  );
};

export default StatusBadge;
