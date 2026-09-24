const express = require("express");
const mongoose = require("mongoose");
const Learner = require("../models/Learner");
const Story = require("../models/Story");
const StoryResult = require("../models/StoryResult");
const Section = require("../models/Section");
const Teacher = require("../models/Teacher");

const { recordingSession } = require("../utils/recordingSession");
const { parseRecording } = require("../utils/recording");
const { calculateReadingAccuracy } = require("../utils/readingAccuracy");
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
    let recording;
    try { recording = parseRecording(req.body.recording); }
    catch (error) { return res.status(400).json({ message: error.message }); }
    if (recording.length) {
      const session = await recordingSession(req, 'student');
      if (!session || String(session.userId) !== learnerId) return res.status(401).json({ message: 'Please sign in again to submit your recording.' });
    }
    const { storyId, language, answers, readingDurationSeconds, readingWordStats = [] } = req.body;
    if (!mongoose.isValidObjectId(learnerId) || !mongoose.isValidObjectId(storyId)) {
      return res.status(400).json({ message: "A valid learner and story are required." });
    }
    if (!Array.isArray(answers)) return res.status(400).json({ message: "Quiz answers are required." });

    if (readingDurationSeconds != null && (typeof readingDurationSeconds !== "number" || !Number.isFinite(readingDurationSeconds) || readingDurationSeconds < 0.001)) {
      return res.status(400).json({ message: "Reading duration must be a positive number of seconds." });
    }
    const [learner, story] = await Promise.all([
      Learner.findById(learnerId).select("_id"),
      Story.findById(storyId).select("title lang questions pages")
    ]);
    if (!learner) return res.status(401).json({ message: "Your learner account could not be verified." });
    if (!story) return res.status(404).json({ message: "Story not found." });
    const storyWords = new Set(story.pages.flatMap((page) =>
      (String(page.text || '').match(/[\p{L}\p{N}]+(?:['\u2019-][\p{L}\p{N}]+)*/gu) || [])
        .map((word) => word.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, ''))));
    if (!Array.isArray(readingWordStats) || readingWordStats.length > storyWords.size
      || new Set(readingWordStats.map((stat) => stat?.word)).size !== readingWordStats.length
      || readingWordStats.some((stat) => !stat || !storyWords.has(stat.word)
        || !Number.isSafeInteger(stat.attempts) || stat.attempts < 1
        || !Number.isSafeInteger(stat.retries) || stat.retries < 0 || stat.retries > stat.attempts)) {
      return res.status(400).json({ message: "Invalid word reading data." });
    }
    const questions = story.questions.filter((question) =>
      question.question && Array.isArray(question.options) && question.options.length > 1 && Number.isInteger(question.correct)
    );
    if (!questions.length && readingDurationSeconds == null) return res.status(400).json({ message: "Reading duration is required for a story without questions." });
    if (answers.length !== questions.length || answers.some((answer) => !Number.isInteger(answer))) {
      return res.status(400).json({ message: "Please answer every question before submitting." });
    }

    const readingWordCount = readingDurationSeconds == null ? null : story.pages.reduce(
      (sum, page) => sum + (String(page.text || '').match(/[\p{L}\p{N}]+(?:['\u2019-][\p{L}\p{N}]+)*/gu) || []).length, 0
    );
    const readingWpm = readingDurationSeconds == null || !readingWordCount ? null : Math.round(readingWordCount * 60 / readingDurationSeconds);
    const score = questions.reduce((sum, question, index) => sum + (answers[index] === question.correct ? 1 : 0), 0);
    const result = await StoryResult.create({
      learnerId,
      storyId,
      storyTitle: story.title,
      language: language === "FIL" ? "FIL" : "ENG",
      score,
      total: questions.length,
      answers,
      readingDurationSeconds,
      readingWordCount,
      readingWordStats,
      readingWpm,
      readingAccuracy: calculateReadingAccuracy(story.pages, readingWordStats),
      recording,
      recordingSegmentCount: recording.length,
      selectedForAverage: true
    });
    await StoryResult.updateMany(
      { learnerId, storyId, _id: { $ne: result._id } },
      { $set: { selectedForAverage: false } }
    );
    res.status(201).json({ message: "Story test completed.", storyId: result.storyId, completedAt: result.createdAt, readingWpm: result.readingWpm });
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

router.get('/:id/recording/:segment', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const session = await recordingSession(req, 'teacher');
    if (!session || !(await Teacher.exists({ _id: session.userId, active: true }))) {
      return res.status(401).json({ message: 'Please sign in as a teacher to listen to recordings.' });
    }
    if (!mongoose.isValidObjectId(req.params.id) || !/^\d+$/.test(req.params.segment)) return res.sendStatus(404);
    const result = await StoryResult.findById(req.params.id);
    if (!result) return res.sendStatus(404);
    const learner = await Learner.findById(result.learnerId).select('sectionId');
    if (!learner || !(await Section.exists({ _id: learner.sectionId, teacherId: session.userId }))) {
      return res.status(403).json({ message: 'You can only listen to learners in your sections.' });
    }
    const index = Number(req.params.segment);
    if (index >= result.recordingSegmentCount) return res.sendStatus(404);
    const stored = await StoryResult.findById(result._id).select('+recording');
    const segment = stored?.recording[index];
    if (!segment) return res.sendStatus(404);
    res.set('Content-Type', segment.mimeType);
    res.set('X-Content-Type-Options', 'nosniff');
    res.send(Buffer.from(segment.data));
  } catch (error) {
    console.error('Could not load recording:', error);
    res.status(500).json({ message: 'Could not load the recording.' });
  }
});

router.delete('/:id/recording', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const session = await recordingSession(req, 'teacher');
    if (!session || !(await Teacher.exists({ _id: session.userId, active: true }))) {
      return res.status(401).json({ message: 'Please sign in as a teacher to delete recordings.' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Story attempt not found.' });
    const result = await StoryResult.findById(req.params.id);
    if (!result) return res.status(404).json({ message: 'Story attempt not found.' });
    const learner = await Learner.findById(result.learnerId).select('sectionId');
    if (!learner || !(await Section.exists({ _id: learner.sectionId, teacherId: session.userId }))) {
      return res.status(403).json({ message: 'You can only delete recordings for learners in your sections.' });
    }
    await StoryResult.updateOne({ _id: result._id }, { $set: { recording: [], recordingSegmentCount: 0 } });
    res.json({ message: 'Recording deleted.' });
  } catch (error) {
    console.error('Could not delete recording:', error);
    res.status(500).json({ message: 'Could not delete the recording.' });
  }
});

module.exports = router;
