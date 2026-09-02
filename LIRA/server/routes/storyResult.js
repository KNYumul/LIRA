const express = require("express");
const mongoose = require("mongoose");
const Learner = require("../models/Learner");
const Story = require("../models/Story");
const StoryResult = require("../models/StoryResult");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const learnerId = req.get("X-Learner-Id");
    if (!mongoose.isValidObjectId(learnerId) || !(await Learner.exists({ _id: learnerId }))) {
      return res.status(401).json({ message: "Your learner account could not be verified." });
    }
    const storyIds = await StoryResult.find({ learnerId }).distinct("storyId");
    res.json({ storyIds });
  } catch (error) {
    console.error("Could not load completed stories:", error);
    res.status(500).json({ message: "Could not load your completed stories." });
  }
});

router.post("/", async (req, res) => {
  try {
    const learnerId = req.get("X-Learner-Id");
    const { storyId, language, answers } = req.body;
    if (!mongoose.isValidObjectId(learnerId) || !mongoose.isValidObjectId(storyId)) {
      return res.status(400).json({ message: "A valid learner and story are required." });
    }
    if (!Array.isArray(answers)) return res.status(400).json({ message: "Quiz answers are required." });

    const [learner, story] = await Promise.all([
      Learner.findById(learnerId).select("_id"),
      Story.findById(storyId).select("title lang questions")
    ]);
    if (!learner) return res.status(401).json({ message: "Your learner account could not be verified." });
    if (!story) return res.status(404).json({ message: "Story not found." });
    if (await StoryResult.exists({ learnerId, storyId })) {
      return res.status(409).json({ message: "You have already completed this story." });
    }

    const questions = story.questions.filter((question) =>
      question.question && Array.isArray(question.options) && question.options.length > 1 && Number.isInteger(question.correct)
    );
    if (!questions.length) return res.status(400).json({ message: "This story has no scored questions." });
    if (answers.length !== questions.length || answers.some((answer) => !Number.isInteger(answer))) {
      return res.status(400).json({ message: "Please answer every question before submitting." });
    }

    const score = questions.reduce((sum, question, index) => sum + (answers[index] === question.correct ? 1 : 0), 0);
    const result = await StoryResult.create({
      learnerId,
      storyId,
      storyTitle: story.title,
      language: language === "FIL" ? "FIL" : "ENG",
      score,
      total: questions.length,
      answers
    });
    res.status(201).json({ message: "Story test completed.", storyId: result.storyId, completedAt: result.createdAt });
  } catch (error) {
    console.error("Could not save story result:", error);
    res.status(500).json({ message: "Could not save your story score." });
  }
});

module.exports = router;
