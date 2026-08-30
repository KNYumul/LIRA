const express = require("express");
const Flashcard = require("../models/Flashcard");
const Teacher = require("../models/Teacher");
const Learner = require("../models/Learner");
const Section = require("../models/Section");

const router = express.Router();
const wordCount = (value) => String(value || "").trim().split(/\s+/).filter(Boolean).length;

async function currentTeacher(req, res) {
  const teacherId = req.get("X-Teacher-Id");
  if (!teacherId) {
    res.status(401).json({ message: "Please sign in as a teacher to manage flashcards." });
    return null;
  }
  const teacher = await Teacher.findById(teacherId).select("firstName lastName email active");
  if (!teacher || !teacher.active) {
    res.status(401).json({ message: "Your teacher account could not be verified." });
    return null;
  }
  return teacher;
}

async function ownerTeacherId(req, res) {
  if (req.get("X-Teacher-Id")) return (await currentTeacher(req, res))?._id;
  const learnerId = req.get("X-Learner-Id");
  if (!learnerId) {
    res.status(401).json({ message: "Please sign in to view flashcards." });
    return null;
  }
  const learner = await Learner.findById(learnerId).select("section sectionId");
  if (!learner) {
    res.status(401).json({ message: "Your learner account could not be verified." });
    return null;
  }
  const section = learner.sectionId
    ? await Section.findById(learner.sectionId).select("teacherId")
    : await Section.findOne({ name: learner.section }).collation({ locale: "en", strength: 2 }).select("teacherId");
  if (!section) {
    res.status(404).json({ message: "Your section could not be found." });
    return null;
  }
  return section.teacherId;
}

async function ownedFlashcard(req, res) {
  const teacher = await currentTeacher(req, res);
  if (!teacher) return null;
  const flashcard = await Flashcard.findById(req.params.id);
  if (!flashcard) {
    res.status(404).json({ message: "Flashcard not found." });
    return null;
  }
  if (!flashcard.teacherId.equals(teacher._id)) {
    res.status(403).json({ message: "Only the teacher who uploaded this flashcard can change or delete it." });
    return null;
  }
  return flashcard;
}

function validated(body, partial = false) {
  const result = {};
  if (!partial || Object.hasOwn(body, "content")) {
    result.content = String(body.content || "").trim();
    if (!result.content) throw new Error("Flashcard text is required.");
    if (wordCount(result.content) > 250) throw new Error("Flashcards cannot exceed 250 words.");
  }
  if (!partial || Object.hasOwn(body, "category")) {
    if (!["easy", "medium", "hard"].includes(body.category)) throw new Error("Choose a valid difficulty.");
    result.category = body.category;
  }
  if (!partial || Object.hasOwn(body, "lang")) result.lang = body.lang === "FIL" ? "FIL" : "ENG";
  if (Object.hasOwn(body, "order")) result.order = Number.isFinite(Number(body.order)) ? Number(body.order) : 0;
  return result;
}

router.get("/", async (req, res) => {
  try {
    const teacherId = await ownerTeacherId(req, res);
    if (!teacherId) return;
    const query = { teacherId };
    if (["easy", "medium", "hard"].includes(req.query.category)) query.category = req.query.category;
    if (["ENG", "FIL"].includes(req.query.lang)) query.lang = req.query.lang;
    res.json(await Flashcard.find(query).sort({ category: 1, order: 1, createdAt: 1 }));
  } catch (error) {
    console.error("Could not load flashcards:", error);
    res.status(500).json({ message: "Could not load flashcards." });
  }
});

router.post("/", async (req, res) => {
  try {
    const teacher = await currentTeacher(req, res);
    if (!teacher) return;
    const data = validated(req.body);
    if (!Object.hasOwn(req.body, "order")) data.order = await Flashcard.countDocuments({ teacherId: teacher._id, category: data.category });
    const flashcard = await Flashcard.create({
      ...data,
      teacherId: teacher._id,
      uploadedBy: [teacher.firstName, teacher.lastName].filter(Boolean).join(" ") || teacher.email
    });
    res.status(201).json(flashcard);
  } catch (error) {
    res.status(400).json({ message: error.message || "Could not create flashcard." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const flashcard = await ownedFlashcard(req, res);
    if (!flashcard) return;
    Object.assign(flashcard, validated(req.body, true));
    res.json(await flashcard.save());
  } catch (error) {
    res.status(400).json({ message: error.message || "Could not update flashcard." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const flashcard = await ownedFlashcard(req, res);
    if (!flashcard) return;
    await flashcard.deleteOne();
    res.status(204).send();
  } catch {
    res.status(400).json({ message: "Could not delete flashcard." });
  }
});

module.exports = router;
