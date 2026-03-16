const mongoose = require("mongoose");

const eligibilityProofSchema = new mongoose.Schema({
  citizenId: {
    type: String,
    required: true,
    trim: true
  },
  scheme: {
    type: String,
    required: true,
    trim: true
  },
  proofHash: {
    type: String,
    required: true
  },
  eligible: {
    type: Boolean,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("EligibilityProof", eligibilityProofSchema);
