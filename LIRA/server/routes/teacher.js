const express = require("express");
const Teacher = require("../models/Teacher");
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
    role: "teacher"
  };
}

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
