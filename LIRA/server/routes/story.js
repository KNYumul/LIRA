const express = require("express");
const Story = require("../models/Story");
const Teacher = require("../models/Teacher");

const router = express.Router();

async function currentTeacher(req, res) {
  const teacherId = req.get("X-Teacher-Id");
  if (!teacherId) {
    res.status(401).json({ message: "Please sign in as a teacher to manage stories." });
    return null;
  }

  const teacher = await Teacher.findById(teacherId).select("firstName lastName email active");
  if (!teacher || !teacher.active) {
    res.status(401).json({ message: "Your teacher account could not be verified." });
    return null;
  }
  return teacher;
}

async function ownedStory(req, res) {
  const teacher = await currentTeacher(req, res);
  if (!teacher) return null;

  const story = await Story.findById(req.params.id);
  if (!story) {
    res.status(404).json({ message: "Story not found." });
    return null;
  }
  if (!story.teacherId || !story.teacherId.equals(teacher._id)) {
    res.status(403).json({ message: "Only the teacher who uploaded this story can change or delete it." });
    return null;
  }
  return story;
}

router.get("/", async (req, res) => {
  try {
    const stories = await Story.find().sort({ createdAt: -1 });
    res.json(stories);
  } catch (error) {
    console.error("Could not load stories:", error);
    res.status(500).json({ message: "Could not load stories." });
  }
});

router.post("/", async (req, res) => {
  try {
    const teacher = await currentTeacher(req, res);
    if (!teacher) return;
    const story = await Story.create({
      ...req.body,
      teacherId: teacher._id,
      uploadedBy: [teacher.firstName, teacher.lastName].filter(Boolean).join(" ") || teacher.email
    });
    res.status(201).json(story);
  } catch (error) {
    console.error("Could not create story:", error);
    res.status(400).json({ message: "Could not create story." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const existingStory = await ownedStory(req, res);
    if (!existingStory) return;
    const updates = {};
    ["title", "lang", "badge", "cover", "coverText", "coverImage", "description", "pages", "questions"].forEach((field) => {
      if (Object.hasOwn(req.body, field)) updates[field] = req.body[field];
    });
    Object.assign(existingStory, updates);
    const story = await existingStory.save();
    res.json(story);
  } catch (error) {
    console.error("Could not update story:", error);
    res.status(400).json({ message: "Could not update story." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const story = await ownedStory(req, res);
    if (!story) return;
    await story.deleteOne();
    res.status(204).send();
  } catch (error) {
    console.error("Could not delete story:", error);
    res.status(400).json({ message: "Could not delete story." });
  }
});

module.exports = router;
