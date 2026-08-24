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
  }
});

module.exports = mongoose.model("Learner", learnerSchema, "Learners");
