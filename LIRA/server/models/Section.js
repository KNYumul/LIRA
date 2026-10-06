const mongoose = require("mongoose");
const softDeleteSchema = require("./softDelete");

const sectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true, index: true }
  },
  { timestamps: true }
);

sectionSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

softDeleteSchema(sectionSchema);

module.exports = mongoose.model("Section", sectionSchema, "Sections");
