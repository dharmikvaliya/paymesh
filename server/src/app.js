const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const walletRoutes = require("./routes/walletRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const packetRoutes = require("./routes/packetRoutes");
const meshRoutes = require("./routes/meshRoutes");
const bridgeRoutes = require("./routes/bridgeRoutes");
const reconciliationRoutes = require("./routes/reconciliationRoutes");

const app = express();

app.use(helmet());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "PayMesh API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/packets", packetRoutes);
app.use("/api/mesh", meshRoutes);
app.use("/api/bridge", bridgeRoutes);
app.use("/api/reconciliation", reconciliationRoutes);

module.exports = app;
