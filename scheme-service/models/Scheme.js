const mongoose = require("mongoose");

const schemeSchema = new mongoose.Schema({
  schemeName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ""
  },
  conditions: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  benefit: {
    type: String,
    default: ""
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Scheme", schemeSchema);
