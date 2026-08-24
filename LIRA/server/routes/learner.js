const express = require("express");
const Learner = require("../models/Learner");

const router = express.Router();

// GET all learners
router.get("/", async (req, res) => {
  try {
    const learners = await Learner.find().select("lastName birthdate section").sort({ lastName: 1 });

    res.json(learners);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});

// CREATE a learner
router.post("/", async (req, res) => {
  try {
    const learner = await Learner.create(req.body);
    res.status(201).json(learner);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// UPDATE a learner
router.put("/:id", async (req, res) => {
  try {
    const learner = await Learner.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!learner) return res.status(404).json({ message: "Learner not found." });
    res.json(learner);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE a learner
router.delete("/:id", async (req, res) => {
  try {
    const learner = await Learner.findByIdAndDelete(req.params.id);

    if (!learner) return res.status(404).json({ message: "Learner not found." });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message });
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
        lastName: learner.lastName,
        birthdate: learner.birthdate,
        section: learner.section
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
