const express = require("express");
const Learner = require("../models/Learner");

const router = express.Router();

// GET all learners
router.get("/", async (req, res) => {
  try {
    const learners = await Learner.find();

    res.json(learners);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});

// STUDENT LOGIN
router.post("/login", async (req, res) => {
  try {
    const { lastName, birthdate } = req.body;

    // console.log("LOGIN REQUEST:");
    // console.log("Last name:", lastName);
    // console.log("Birthdate:", birthdate);

    const learner = await Learner.findOne({
      lastName: lastName,
      birthdate: birthdate
    });

    if (!learner) {
      return res.status(401).json({
        message: "Invalid last name or birthdate."
      });
    }

    res.json({
      message: "Login successful!",
      learner: {
        id: learner._id,
        studentId: learner.studentId,
        firstName: learner.firstName,
        lastName: learner.lastName,
        birthdate: learner.birthdate,
        email: learner.email,
        course: learner.course,
        yearLevel: learner.yearLevel
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error."
    });
  }
});

module.exports = router;