const express = require("express");
const Teacher = require("../models/Teacher");
const Section = require("../models/Section");
const { hashPassword, verifyPassword } = require("../utils/password");

const router = express.Router();

function publicTeacher(teacher) {
  return {
    id: teacher._id,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    email: teacher.email,
    school: teacher.school,
    gradeLevel: teacher.gradeLevel,
    section: teacher.section,
    active: teacher.active,
    createdAt: teacher.createdAt,
    role: "teacher"
  };
}

// GET all teacher accounts for the admin dashboard.
router.get("/", async (_req, res) => {
  try {
    const teachers = await Teacher.find().sort({ createdAt: -1 });
    res.json(teachers.map(publicTeacher));
  } catch (error) {
    console.error("Could not load teachers:", error);
    res.status(500).json({ message: "Could not load teacher accounts." });
  }
});

// UPDATE a teacher account from the admin dashboard.
router.put("/:id", async (req, res) => {
  try {
    const { firstName, lastName, email, active } = req.body;
    if (!firstName || !lastName || !email || typeof active !== "boolean") {
      return res.status(400).json({ message: "First name, last name, email, and account status are required." });
    }

    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, email: email.trim().toLowerCase(), active },
      { new: true, runValidators: true }
    );
    if (!teacher) return res.status(404).json({ message: "Teacher not found." });

    res.json({ message: "Teacher account updated.", teacher: publicTeacher(teacher) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "A teacher account already uses this email." });
    res.status(400).json({ message: "Could not update teacher account." });
  }
});

// DELETE a teacher account from the admin dashboard.
router.delete("/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) return res.status(404).json({ message: "Teacher not found." });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: "Could not delete teacher account." });
  }
});

router.post("/signup", async (req, res) => {
  try {
    const { firstName, lastName, email, password, school, gradeLevel, section } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "First name, last name, email, and password are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must contain at least 8 characters." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (await Teacher.exists({ email: normalizedEmail })) {
      return res.status(409).json({ message: "A teacher account already uses this email." });
    }

    const teacher = await Teacher.create({
      firstName, lastName, email: normalizedEmail, passwordHash: await hashPassword(password), school, gradeLevel, section
    });
    if (section?.trim()) {
      await Section.findOneAndUpdate(
        { name: section.trim() },
        { $setOnInsert: { name: section.trim(), teacherId: teacher._id } },
        { upsert: true, new: true, runValidators: true }
      );
    }
    res.status(201).json({ message: "Teacher account created.", teacher: publicTeacher(teacher) });
  } catch (error) {
    console.error("Teacher signup failed:", error);
    res.status(500).json({ message: "Could not create the teacher account." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

    const teacher = await Teacher.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");
    if (!teacher || !teacher.active || !(await verifyPassword(password, teacher.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    res.json({ message: "Login successful.", teacher: publicTeacher(teacher) });
  } catch (error) {
    console.error("Teacher login failed:", error);
    res.status(500).json({ message: "Could not log in." });
  }
});

module.exports = router;
