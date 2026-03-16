const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const SecurityLog = require("./models/SecurityLog");
const verifyServiceToken = require("./middleware/verifyServiceToken");

dotenv.config();

const app = express();
const port = process.env.PORT || 5003;
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/civicshield";
const serviceName = "security-service";

async function determineThreatLevel({ ipAddress, endpoint, method, status }) {
  const normalizedStatus = String(status).toUpperCase();
  const normalizedEndpoint = String(endpoint).trim();
  const normalizedMethod = String(method).toUpperCase();

  if (normalizedStatus !== "FAILED" || normalizedEndpoint !== "/api/auth/login") {
    return "LOW";
  }

  const failedAttempts = await SecurityLog.countDocuments({
    ipAddress,
    endpoint: normalizedEndpoint,
    method: normalizedMethod,
    status: "FAILED"
  });

  const currentAttempt = failedAttempts + 1;

  if (currentAttempt >= 3) {
    return "HIGH";
  }

  if (currentAttempt === 2) {
    return "MEDIUM";
  }

  return "LOW";
}

app.use(cors());
app.use(express.json());
app.use("/api/security", verifyServiceToken);

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log(`${serviceName} connected to MongoDB`);
  })
  .catch((error) => {
    console.error(`${serviceName} MongoDB connection error:`, error.message);
  });

app.post("/api/security/log", async (req, res) => {
  try {
    const { ipAddress, endpoint, method, status } = req.body;

    if (!ipAddress || !endpoint || !method || !status) {
      return res.status(400).json({
        success: false,
        message: "ipAddress, endpoint, method, and status are required"
      });
    }

    const normalizedMethod = method.toUpperCase().trim();
    const normalizedStatus = status.toUpperCase().trim();
    const threatLevel = await determineThreatLevel({
      ipAddress: ipAddress.trim(),
      endpoint: endpoint.trim(),
      method: normalizedMethod,
      status: normalizedStatus
    });

    const log = await SecurityLog.create({
      ipAddress: ipAddress.trim(),
      endpoint: endpoint.trim(),
      method: normalizedMethod,
      status: normalizedStatus,
      threatLevel
    });

    return res.status(201).json(log);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create security log",
      error: error.message
    });
  }
});

app.get("/api/security/logs", async (_req, res) => {
  try {
    const logs = await SecurityLog.find().sort({ timestamp: -1 }).limit(20);
    return res.json(logs);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch security logs",
      error: error.message
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({
    service: serviceName,
    status: "running"
  });
});

app.listen(port, () => {
  console.log(`${serviceName} listening on port ${port}`);
});
