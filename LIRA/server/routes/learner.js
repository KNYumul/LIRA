const express = require("express");
const Learner = require("../models/Learner");
const Section = require("../models/Section");
const Teacher = require("../models/Teacher");
const StoryResult = require("../models/StoryResult");
const { loginKey, cooldownStatus, failedLogin, clearFailedLogins, sendCooldown } = require("../utils/loginCooldown");
const { lrnLookup } = require("../utils/learnerEncryption");

const { issueSession } = require("../utils/recordingSession");
const router = express.Router();

async function currentTeacher(req, res) {
  const teacherId = req.get("X-Teacher-Id");
  if (!teacherId) {
    res.status(401).json({ message: "Please sign in as a teacher to manage learners." });
    return null;
  }
  const teacher = await Teacher.findById(teacherId).select("active");
  if (!teacher || !teacher.active) {
    res.status(401).json({ message: "Your teacher account could not be verified." });
    return null;
  }
  return teacher;
}

async function teacherSection(teacher, { sectionId, section }, createIfMissing = false) {
  if (sectionId) return Section.findOne({ _id: sectionId, teacherId: teacher._id });
  const name = String(section || "").trim();
  if (!name) return null;

  const scope = { name };
  const existing = await Section.findOne(scope).collation({ locale: "en", strength: 2 });
  if (existing) return existing.teacherId.equals(teacher._id) ? existing : null;
  if (!createIfMissing) return null;

  const claimed = await Section.findOneAndUpdate(
    scope,
    {
      $setOnInsert: {
        name,
        teacherId: teacher._id
      }
    },
    { upsert: true, new: true, runValidators: true, collation: { locale: "en", strength: 2 } }
  );
  return claimed.teacherId.equals(teacher._id) ? claimed : null;
}

async function ownedLearner(learnerId, teacherId) {
  const sectionIds = await Section.find({ teacherId }).distinct("_id");
  return Learner.findOne({ _id: learnerId, sectionId: { $in: sectionIds } });
}

router.get("/", async (req, res) => {
  try {
    const teacher = await currentTeacher(req, res);
    if (!teacher) return;
    const sectionIds = await Section.find({ teacherId: teacher._id }).distinct("_id");
    const learners = await Learner.find({ sectionId: { $in: sectionIds } })
      .select("lrn lastName section sectionId")
      .sort({ _id: 1 });
    learners.sort((a, b) => a.lastName.localeCompare(b.lastName));
    const learnerIds = learners.map((learner) => learner._id);
    const results = await StoryResult.find({ learnerId: { $in: learnerIds } })
      .sort({ createdAt: -1 })
      .select("learnerId storyId storyTitle score total readingAccuracy readingWpm readingWordStats readingWordCount readingDurationSeconds recordingSegmentCount selectedForAverage createdAt");
    const resultsByLearner = new Map();
    results.forEach((result) => {
      const key = result.learnerId.toString();
      if (!resultsByLearner.has(key)) resultsByLearner.set(key, []);
      resultsByLearner.get(key).push(result);
    });
    res.json(learners.map((learner) => {
      const storyResults = resultsByLearner.get(learner._id.toString()) || [];
      return {
        ...learner.toObject(),
        latestStoryResult: storyResults[0] || null,
        storyResults
      };
    }));
  } catch {
    res.status(500).json({ message: "Could not load your learners." });
  }
});

router.post("/", async (req, res) => {
  try {
    const teacher = await currentTeacher(req, res);
    if (!teacher) return;
    const section = await teacherSection(teacher, req.body, true);
    const lastName = String(req.body.lastName || "").trim();
    const lrn = String(req.body.lrn || "").trim();
    if (!lastName || !/^\d{12}$/.test(lrn)) return res.status(400).json({ message: "A last name and a 12-digit LRN are required." });
    if (!section) {
      const requestedSection = String(req.body.section || "").trim();
      const ownedSection = await Section.findOne({ name: requestedSection })
        .collation({ locale: "en", strength: 2 })
        .populate("teacherId", "firstName lastName");
      const ownerName = ownedSection?.teacherId
        ? [ownedSection.teacherId.firstName, ownedSection.teacherId.lastName].filter(Boolean).join(" ")
        : "another teacher";
      return res.status(403).json({
        message: `${lastName || "This learner"} belongs to Section ${ownedSection?.name || requestedSection}, which is managed by ${ownerName}.`,
        code: "SECTION_OWNED_BY_ANOTHER_TEACHER"
      });
    }
    const learner = await Learner.create({
      lastName,
      lrn,
      section: section.name,
      sectionId: section._id
    });
    res.status(201).json(learner);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "That LRN is already assigned to a learner." });
    res.status(400).json({ message: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const teacher = await currentTeacher(req, res);
    if (!teacher) return;
    const learner = await ownedLearner(req.params.id, teacher._id);
    if (!learner) return res.status(404).json({ message: "Learner not found in your sections." });
    const section = await teacherSection(teacher, req.body);
    if (!section) return res.status(403).json({ message: "That section is not assigned to you." });
    const lrn = String(req.body.lrn || "").trim();
    const lastName = String(req.body.lastName || "").trim();
    if (!lastName || !/^\d{12}$/.test(lrn)) return res.status(400).json({ message: "A last name and a 12-digit LRN are required." });
    learner.lastName = req.body.lastName;
    learner.lrn = lrn;
    learner.section = section.name;
    learner.sectionId = section._id;
    await learner.save();
    res.json(learner);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const teacher = await currentTeacher(req, res);
    if (!teacher) return;
    const learner = await ownedLearner(req.params.id, teacher._id);
    if (!learner) return res.status(404).json({ message: "Learner not found in your sections." });
    learner.deletedAt = new Date();
    await learner.save();
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const lrn = String(req.body.lrn || "").trim();
    const password = String(req.body.password || "").trim();
    if (!/^\d{12}$/.test(lrn) || !password) {
      return res.status(400).json({ message: "A 12-digit LRN and password are required." });
    }

    const key = loginKey(req, "learner");
    const status = cooldownStatus(key);
    if (status.locked) return sendCooldown(res, status.retryAfterSeconds);

    const learner = await Learner.findOne({
      lrnLookup: lrnLookup(lrn),
      dataEncryptionVersion: 1
    }).select("+lrnLookup +dataEncryptionVersion");
    const passwordMatches = learner && learner.lastName.localeCompare(password, undefined, { sensitivity: "accent" }) === 0;
    if (!passwordMatches) {
      const failure = failedLogin(key);
      if (failure.locked) return sendCooldown(res, failure.retryAfterSeconds);
      return res.status(401).json({ message: `Invalid LRN or password. ${failure.remainingAttempts} attempt${failure.remainingAttempts === 1 ? "" : "s"} remaining.` });
    }
    clearFailedLogins(key);
    res.json({
      message: "Login successful!",
      token: await issueSession(learner._id, "student"),
      learner: { id: learner._id, lrn: learner.lrn, lastName: learner.lastName, section: learner.section }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
