require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/civicshield";
const INTERNAL_SERVICE_TOKEN =
  process.env.INTERNAL_SERVICE_TOKEN || "civicshield_internal_secure_token";

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests. Possible DDoS attempt detected."
  }
});

function createServiceProxy(targetLabel, pathRewrite) {
  return createProxyMiddleware({
    target: targetLabel,
    changeOrigin: true,
    pathRewrite,
    headers: {
      "x-service-token": INTERNAL_SERVICE_TOKEN
    },
    onProxyReq: (proxyReq, req) => {
      console.log(
        `[gateway] forwarding ${req.method} ${req.originalUrl} -> ${targetLabel}${req.url}`
      );
    },
    onError: (error, req, res) => {
      console.error(
        `[gateway] proxy error for ${req.method} ${req.originalUrl}:`,
        error.message
      );

      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          message: "Gateway proxy error"
        });
      }
    }
  });
}

app.use(cors());
app.use(limiter);
app.use((req, _res, next) => {
  console.log(`[gateway] incoming ${req.method} ${req.originalUrl}`);
  next();
});

app.get("/health", (_req, res) => {
  res.json({ service: "gateway", status: "running" });
});

app.use(
  "/api/auth",
  createServiceProxy("http://localhost:5001", (path) => path)
);
app.use(
  "/api/records",
  createServiceProxy("http://localhost:5002", (path) => `/api/records${path}`)
);
app.use(
  "/api/security",
  createServiceProxy("http://localhost:5003", (path) => `/api/security${path}`)
);
app.use(
  "/api/eligibility",
  createServiceProxy("http://localhost:5004", (path) => `/api/eligibility${path}`)
);
app.use(
  "/api/schemes",
  createServiceProxy("http://localhost:5005", (path) => `/api/schemes${path}`)
);

app.use(express.json());

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Gateway connected to MongoDB"))
  .catch((err) => console.error("Mongo error:", err.message));

app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});
