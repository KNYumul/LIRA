const mongoose = require("mongoose");

const storyResultSchema = new mongoose.Schema(
  {
    learnerId: { type: mongoose.Schema.Types.ObjectId, ref: "Learner", required: true, index: true },
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: "Story", required: true, index: true },
    storyTitle: { type: String, required: true, trim: true },
    language: { type: String, enum: ["ENG", "FIL"], required: true },
    score: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    readingDurationSeconds: { type: Number, min: 0, default: null },
    readingWordCount: { type: Number, min: 0, default: null },
    readingAccuracy: { type: Number, min: 0, max: 100, default: null },
    readingWpm: { type: Number, min: 0, default: null },
    readingWordStats: { type: [new mongoose.Schema({
      word: { type: String, required: true },
      attempts: { type: Number, min: 1, required: true },
      retries: { type: Number, min: 0, required: true }
    }, { _id: false })], default: [] },
    recording: { type: [new mongoose.Schema({
      mimeType: String,
      data: Buffer,
    }, { _id: false })], select: false, default: [] },
    recordingSegmentCount: { type: Number, default: 0 },
    answers: { type: [Number], default: [] },
    selectedForAverage: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("StoryResult", storyResultSchema, "StoryResults");
