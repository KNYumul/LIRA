const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    school: { type: String, trim: true },
    gradeLevel: { type: String, trim: true },
    section: { type: String, trim: true },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Teacher", teacherSchema, "Teachers");
