const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    title: { type: String, enum: ["Teacher", "Ms.", "Mrs.", "Mr."], default: "Teacher" },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    school: { type: String, trim: true },
    gradeLevel: { type: String, trim: true },
    section: { type: String, trim: true },
    active: { type: Boolean, default: false },
    activationPending: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date, default: null },
    verificationTokenHash: { type: String, select: false, index: true, sparse: true },
    verificationExpiresAt: { type: Date, select: false },
    verificationUsedTokenHash: { type: String, select: false, index: true, sparse: true },
    verificationLastSentAt: { type: Date, select: false },
    verificationWindowStart: { type: Date, select: false },
    verificationSendCount: { type: Number, default: 0, select: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Teacher", teacherSchema, "Teachers");
