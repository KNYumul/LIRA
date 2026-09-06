const express = require("express");
const Teacher = require("../models/Teacher");
const Section = require("../models/Section");
const Learner = require("../models/Learner");

const router = express.Router();

// Student login only needs section names; teacher and ownership details stay private.
router.get("/login-options", async (_req, res) => {
  try {
    const sections = await Section.find().select("name -_id").sort({ name: 1 });
    res.json(sections.map((section) => section.name));
  } catch {
    res.status(500).json({ message: "Could not load the section list." });
  }
});

async function currentTeacher(req, res) {
  const teacherId = req.get("X-Teacher-Id");
  if (!teacherId) {
    res.status(401).json({ message: "Please sign in as a teacher." });
    return null;
  }
  const teacher = await Teacher.findById(teacherId).select("active");
  if (!teacher || !teacher.active) {
    res.status(401).json({ message: "Your teacher account could not be verified." });
    return null;
  }
  return teacher;
}

router.get("/", async (req, res) => {
  try {
    const teacher = await currentTeacher(req, res);
    if (!teacher) return;
    const sections = await Section.find({ teacherId: teacher._id }).sort({ name: 1 });
    res.json(sections);
  } catch {
    res.status(500).json({ message: "Could not load your sections." });
  }
});

router.post("/", async (req, res) => {
  try {
    const teacher = await currentTeacher(req, res);
    if (!teacher) return;
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Section name is required." });
    const section = await Section.create({
      name,
      teacherId: teacher._id
    });
    res.status(201).json(section);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "That section is already assigned to a teacher." });
    res.status(400).json({ message: "Could not create the section." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const teacher = await currentTeacher(req, res);
    if (!teacher) return;

    const section = await Section.findOne({ _id: req.params.id, teacherId: teacher._id });
    if (!section) return res.status(404).json({ message: "Section not found in your classes." });

    // Include the section-name check for learner records created before sectionId was introduced.
    const hasLearners = await Learner.exists({
      $or: [{ sectionId: section._id }, { section: section.name }]
    }).collation({ locale: "en", strength: 2 });
    if (hasLearners) {
      return res.status(409).json({
        message: "This section cannot be deleted while it still has learners. Remove or move all learners first.",
        code: "SECTION_NOT_EMPTY"
      });
    }

    await section.deleteOne();
    res.status(204).send();
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ message: "Section not found in your classes." });
    res.status(500).json({ message: "Could not delete the section." });
  }
});

module.exports = router;
