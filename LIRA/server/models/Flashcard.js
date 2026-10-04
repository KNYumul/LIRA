const mongoose = require("mongoose");
const softDeleteSchema = require("./softDelete");

const flashcardSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", index: true },
    isLibrary: { type: Boolean, default: false, index: true },
    uploadedBy: { type: String, default: "Unknown teacher", trim: true },
    content: { type: String, required: true, trim: true },
    category: { type: String, enum: ["easy", "medium", "hard"], required: true, index: true },
    lang: { type: String, enum: ["ENG", "FIL"], default: "ENG", index: true },
    order: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

softDeleteSchema(flashcardSchema);

module.exports = mongoose.model("Flashcard", flashcardSchema, "Flashcards");
