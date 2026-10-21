import { Link } from "react-router-dom";

export const NotFound = () => {
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "12px",
          backgroundColor: "#f1f5f9",
          display: "grid",
          placeItems: "center",
          marginBottom: "16px",
          fontSize: "20px",
          color: "#475569",
        }}
      >
        ?
      </div>
      <h1 style={{ fontSize: "24px", color: "#0f172a", marginBottom: "8px" }}>
        Page Not Found
      </h1>
      <p style={{ color: "#64748b", maxWidth: "400px", marginBottom: "24px", fontSize: "14px" }}>
        The page you are looking for does not exist or has been relocated within the payment mesh.
      </p>
      <Link to="/" className="primary-btn">
        Return to Overview
      </Link>
    </div>
  );
};

export default NotFound;
