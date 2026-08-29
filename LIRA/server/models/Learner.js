const mongoose = require("mongoose");

const learnerSchema = new mongoose.Schema({
  lastName: {
    type: String,
    required: true,
    trim: true
  },

  birthdate: {
    type: String,
    required: true
  },

  section: {
    type: String,
    required: true,
    trim: true
  },

  // section remains during migration/login compatibility; sectionId is authoritative for ownership.
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Section",
    index: true
  }
});

module.exports = mongoose.model("Learner", learnerSchema, "Learners");
