const express = require("express");
const Learner = require("../models/Learner");
const Section = require("../models/Section");
const Teacher = require("../models/Teacher");

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
      .select("lastName birthdate section sectionId")
      .sort({ lastName: 1 });
    res.json(learners);
  } catch (error) {
    res.status(500).json({ message: "Could not load your learners." });
  }
});

router.post("/", async (req, res) => {
  try {
    const teacher = await currentTeacher(req, res);
    if (!teacher) return;
    const section = await teacherSection(teacher, req.body, true);
    if (!section) return res.status(403).json({ message: "That section is already assigned to another teacher." });
    const learner = await Learner.create({
      lastName: req.body.lastName,
      birthdate: req.body.birthdate,
      section: section.name,
      sectionId: section._id
    });
    res.status(201).json(learner);
  } catch (error) {
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
    learner.lastName = req.body.lastName;
    learner.birthdate = req.body.birthdate;
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
    await learner.deleteOne();
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { lastName, birthdate } = req.body;
    const learner = await Learner.findOne({ lastName, birthdate });
    if (!learner) return res.status(401).json({ message: "Invalid last name or birthdate." });
    res.json({
      message: "Login successful!",
      learner: { id: learner._id, lastName: learner.lastName, birthdate: learner.birthdate, section: learner.section }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
