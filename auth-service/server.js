require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("./models/User");
const verifyServiceToken = require("./middleware/verifyServiceToken");

const app = express();

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/civicshield";
const JWT_SECRET = process.env.JWT_SECRET || "civicshield_secret";

const SERVICE_NAME = "auth-service";
const SALT_ROUNDS = 10;

app.use(cors());
app.use(express.json());

/*
Zero Trust: Only gateway can call this service
*/
app.use(verifyServiceToken);

/*
MongoDB Connection
*/
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`${SERVICE_NAME} connected to MongoDB`);
  })
  .catch((error) => {
    console.error(`${SERVICE_NAME} MongoDB connection error:`, error.message);
  });

/*
Register User
*/
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password required"
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "citizen"
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      userId: newUser._id
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to register user",
      error: error.message
    });
  }
});

/*
Login User
*/
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required"
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid email"
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password"
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message
    });
  }
});

/*
Health Check
*/
app.get("/health", (_req, res) => {
  res.json({
    service: SERVICE_NAME,
    status: "running"
  });
});

/*
Start Server
*/
app.listen(PORT, () => {
  console.log(`${SERVICE_NAME} running on port ${PORT}`);
});