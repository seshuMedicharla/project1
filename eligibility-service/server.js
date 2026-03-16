const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const crypto = require("crypto");
const EligibilityProof = require("./models/EligibilityProof");
const verifyServiceToken = require("./middleware/verifyServiceToken");

dotenv.config();

const app = express();
const port = process.env.PORT || 5004;
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/civicshield";
const serviceName = "eligibility-service";
const INCOME_LIMIT = 300000;

function generateProofHash(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

app.use(cors());
app.use(express.json());
app.use("/api/eligibility", verifyServiceToken);

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log(`${serviceName} connected to MongoDB`);
  })
  .catch((error) => {
    console.error(`${serviceName} MongoDB connection error:`, error.message);
  });

app.post("/api/eligibility/check", async (req, res) => {
  try {
    const { citizenId, scheme, income } = req.body;

    if (!citizenId || !scheme || income === undefined) {
      return res.status(400).json({
        success: false,
        message: "citizenId, scheme, and income are required"
      });
    }

    const numericIncome = Number(income);

    if (Number.isNaN(numericIncome)) {
      return res.status(400).json({
        success: false,
        message: "income must be a valid number"
      });
    }

    const proofHash = generateProofHash(`${citizenId}${scheme}${numericIncome}`);
    const eligible = numericIncome < INCOME_LIMIT;

    await EligibilityProof.create({
      citizenId: String(citizenId).trim(),
      scheme: String(scheme).trim(),
      proofHash,
      eligible
    });

    return res.json({
      citizenId: String(citizenId).trim(),
      scheme: String(scheme).trim(),
      eligible
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to check eligibility",
      error: error.message
    });
  }
});

app.get("/api/eligibility/proofs", async (_req, res) => {
  try {
    const proofs = await EligibilityProof.find().sort({ timestamp: -1 }).limit(20);
    return res.json(proofs);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch eligibility proofs",
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
