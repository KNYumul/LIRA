const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    text: { type: String, default: "" }
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    question: { type: String, default: "" },
    options: { type: [String], default: [] },
    correct: { type: Number, default: 0 }
  },
  { _id: false }
);

const storySchema = new mongoose.Schema(
  {
    // Existing manually-added stories can omit this; uploads through the app always set it.
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", index: true },
    uploadedBy: { type: String, default: "Unknown teacher", trim: true },
    title: { type: String, required: true, trim: true },
    lang: { type: String, enum: ["ENG", "FIL"], required: true },
    badge: { type: String, default: "Custom Story", trim: true },
    cover: { type: String, default: "linear-gradient(160deg,#E7D8EE 0%,#B79AC7 100%)" },
    coverText: { type: String, default: "#3A2A47" },
    coverImage: { type: String, default: null },
    description: { type: String, default: "" },
    contentUnit: { type: String, enum: ["page", "paragraph"], default: "page" },
    pages: { type: [pageSchema], default: [] },
    questions: { type: [questionSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Story", storySchema, "Stories");
