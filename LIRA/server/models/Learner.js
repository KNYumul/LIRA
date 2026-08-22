const mongoose = require("mongoose");

const learnerSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true
  },

  firstName: {
    type: String,
    required: true
  },

  lastName: {
    type: String,
    required: true
  },

  birthdate: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true
  },

  course: {
    type: String,
    required: true
  },

  yearLevel: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model("Learner", learnerSchema, "Learners");