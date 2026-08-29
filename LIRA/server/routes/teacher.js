const express = require("express");
const Teacher = require("../models/Teacher");
const Section = require("../models/Section");
const { hashPassword, verifyPassword } = require("../utils/password");
const { loginKey, cooldownStatus, failedLogin, clearFailedLogins, sendCooldown } = require("../utils/loginCooldown");

const router = express.Router();

function publicTeacher(teacher, sections = []) {
  const managedSections = sections.length > 0 ? sections : (teacher.section ? [teacher.section] : []);
  return {
    id: teacher._id,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    email: teacher.email,
    school: teacher.school,
    gradeLevel: teacher.gradeLevel,
    section: teacher.section,
    sections: managedSections,
    active: teacher.active,
    createdAt: teacher.createdAt || teacher._id.getTimestamp(),
    role: "teacher"
  };
}

// GET all teacher accounts for the admin dashboard.
router.get("/", async (_req, res) => {
  try {
    const teachers = await Teacher.find().sort({ createdAt: -1 });
    const teacherIds = teachers.map((teacher) => teacher._id);
    const sections = await Section.find({ teacherId: { $in: teacherIds } }).sort({ name: 1 });
    const sectionsByTeacher = sections.reduce((grouped, section) => {
      const teacherId = section.teacherId.toString();
      if (!grouped[teacherId]) grouped[teacherId] = [];
      grouped[teacherId].push(section.name);
      return grouped;
    }, {});
    res.json(teachers.map((teacher) => publicTeacher(teacher, sectionsByTeacher[teacher._id.toString()] || [])));
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

    const sections = await Section.find({ teacherId: teacher._id }).sort({ name: 1 }).select("name");
    res.json({ message: "Teacher account updated.", teacher: publicTeacher(teacher, sections.map((section) => section.name)) });
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
  } catch {
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

    const key = loginKey(req, "teacher");
    const status = cooldownStatus(key);
    if (status.locked) return sendCooldown(res, status.retryAfterSeconds);

    const teacher = await Teacher.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");
    if (!teacher || !teacher.active || !(await verifyPassword(password, teacher.passwordHash))) {
      const failure = failedLogin(key);
      if (failure.locked) return sendCooldown(res, failure.retryAfterSeconds);
      return res.status(401).json({ message: `Invalid email or password. ${failure.remainingAttempts} attempt${failure.remainingAttempts === 1 ? "" : "s"} remaining.` });
    }
    clearFailedLogins(key);
    res.json({ message: "Login successful.", teacher: publicTeacher(teacher) });
  } catch (error) {
    console.error("Teacher login failed:", error);
    res.status(500).json({ message: "Could not log in." });
  }
});

module.exports = router;
