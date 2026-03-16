const mongoose = require("mongoose");

const recordSchema = new mongoose.Schema({
  citizenId: {
    type: String,
    required: true,
    trim: true
  },
  recordType: {
    type: String,
    required: true,
    trim: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  hash: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Record", recordSchema);
