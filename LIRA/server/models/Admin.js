const mongoose = require("mongoose");
const softDeleteSchema = require("./softDelete");

const adminSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

softDeleteSchema(adminSchema);

module.exports = mongoose.model("Admin", adminSchema, "Admin");
