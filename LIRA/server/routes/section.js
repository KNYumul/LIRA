const express = require("express");
const Teacher = require("../models/Teacher");
const Section = require("../models/Section");

const router = express.Router();

// Student login only needs section names; teacher and ownership details stay private.
router.get("/login-options", async (_req, res) => {
  try {
    const sections = await Section.find().select("name -_id").sort({ name: 1 });
    res.json(sections.map((section) => section.name));
  } catch (error) {
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
  } catch (error) {
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

module.exports = router;
