const mongoose = require("mongoose");

const storyResultSchema = new mongoose.Schema(
  {
    learnerId: { type: mongoose.Schema.Types.ObjectId, ref: "Learner", required: true, index: true },
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: "Story", required: true, index: true },
    storyTitle: { type: String, required: true, trim: true },
    language: { type: String, enum: ["ENG", "FIL"], required: true },
    score: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 1 },
    answers: { type: [Number], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("StoryResult", storyResultSchema, "StoryResults");
