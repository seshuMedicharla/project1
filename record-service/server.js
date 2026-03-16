const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const crypto = require("crypto");
const Record = require("./models/Record");
const verifyServiceToken = require("./middleware/verifyServiceToken");

dotenv.config();

const app = express();
const port = process.env.PORT || 5002;
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/civicshield";
const serviceName = "record-service";

function generateHash(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function buildRecordContent(citizenId, recordType, data) {
  return `${citizenId}${recordType}${JSON.stringify(data)}`;
}

app.use(cors());
app.use(express.json());
app.use("/api/records", verifyServiceToken);

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log(`${serviceName} connected to MongoDB`);
  })
  .catch((error) => {
    console.error(`${serviceName} MongoDB connection error:`, error.message);
  });

app.post("/api/records/create", async (req, res) => {
  try {
    const { citizenId, recordType, data } = req.body;

    if (!citizenId || !recordType || data === undefined) {
      return res.status(400).json({
        success: false,
        message: "citizenId, recordType, and data are required"
      });
    }

    const hash = generateHash(buildRecordContent(citizenId, recordType, data));

    const record = await Record.create({
      citizenId,
      recordType,
      data,
      hash
    });

    return res.status(201).json(record);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create record",
      error: error.message
    });
  }
});

app.get("/api/records/verify/:id", async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found"
      });
    }

    const recalculatedHash = generateHash(
      buildRecordContent(record.citizenId, record.recordType, record.data)
    );

    return res.json({
      recordId: record._id,
      valid: record.hash === recalculatedHash
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to verify record",
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
