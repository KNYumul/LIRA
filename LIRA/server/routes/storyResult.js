const express = require("express");
const mongoose = require("mongoose");
const Learner = require("../models/Learner");
const Story = require("../models/Story");
const StoryResult = require("../models/StoryResult");
const Section = require("../models/Section");
const Teacher = require("../models/Teacher");

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
      answers,
      selectedForAverage: true
    });
    await StoryResult.updateMany(
      { learnerId, storyId, _id: { $ne: result._id } },
      { $set: { selectedForAverage: false } }
    );
    res.status(201).json({ message: "Story test completed.", storyId: result.storyId, completedAt: result.createdAt });
  } catch (error) {
    console.error("Could not save story result:", error);
    res.status(500).json({ message: "Could not save your story score." });
  }
});

router.patch("/:id/select-for-average", async (req, res) => {
  try {
    const teacherId = req.get("X-Teacher-Id");
    if (!mongoose.isValidObjectId(teacherId) || !(await Teacher.exists({ _id: teacherId, active: true }))) {
      return res.status(401).json({ message: "Your teacher account could not be verified." });
    }

    const selectedResult = await StoryResult.findById(req.params.id);
    if (!selectedResult) return res.status(404).json({ message: "Story attempt not found." });

    const learner = await Learner.findById(selectedResult.learnerId).select("sectionId");
    const ownsSection = learner && await Section.exists({ _id: learner.sectionId, teacherId });
    if (!ownsSection) return res.status(403).json({ message: "You can only select scores for learners in your sections." });

    await StoryResult.updateMany(
      { learnerId: selectedResult.learnerId, storyId: selectedResult.storyId },
      { $set: { selectedForAverage: false } }
    );
    await StoryResult.updateOne(
      { _id: selectedResult._id },
      { $set: { selectedForAverage: true } }
    );
    res.json({ message: "Score selected for the learner's average.", resultId: selectedResult._id });
  } catch (error) {
    console.error("Could not select story result:", error);
    res.status(500).json({ message: "Could not update the score selection." });
  }
});

module.exports = router;
