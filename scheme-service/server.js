require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Scheme = require("./models/Scheme");
const verifyServiceToken = require("./middleware/verifyServiceToken");

const app = express();
const port = process.env.PORT || 5005;
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/civicshield";
const serviceName = "scheme-service";

app.use(cors());
app.use(express.json());
app.use((req, _res, next) => {
  console.log(`[${serviceName}] incoming ${req.method} ${req.originalUrl}`);
  next();
});

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log(`${serviceName} connected to MongoDB`);
  })
  .catch((error) => {
    console.error(`${serviceName} MongoDB connection error:`, error.message);
  });

app.get("/health", (_req, res) => {
  res.json({
    service: serviceName,
    status: "running"
  });
});

app.post("/api/schemes/create", verifyServiceToken, async (req, res) => {
  try {
    console.log(`[${serviceName}] processing scheme create request`);
    const { schemeName, description, conditions, benefit, active } = req.body;

    if (!schemeName || conditions === undefined) {
      return res.status(400).json({
        success: false,
        message: "schemeName and conditions are required"
      });
    }

    const scheme = await Scheme.create({
      schemeName: String(schemeName).trim(),
      description: description || "",
      conditions,
      benefit: benefit || "",
      active
    });

    console.log(`[${serviceName}] scheme created with id ${scheme._id}`);
    return res.status(201).json(scheme);
  } catch (error) {
    console.error(`[${serviceName}] create error:`, error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to create scheme",
      error: error.message
    });
  }
});

app.get("/api/schemes", verifyServiceToken, async (_req, res) => {
  try {
    console.log(`[${serviceName}] fetching schemes`);
    const schemes = await Scheme.find();
    return res.json(schemes);
  } catch (error) {
    console.error(`[${serviceName}] fetch error:`, error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch schemes",
      error: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`${serviceName} listening on port ${port}`);
});
app.get("/api/schemes", verifyServiceToken, async (_req, res) => {
  try {
    const schemes = await Scheme.find({ active: true });

    res.json({
      success: true,
      count: schemes.length,
      schemes
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch schemes"
    });
  }
});