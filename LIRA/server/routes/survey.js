const express = require('express');
const SurveyResponse = require('../models/SurveyResponse');
const Learner = require('../models/Learner');
const Admin = require('../models/Admin');
require('../models/Section');
const { recordingSession } = require('../utils/recordingSession');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const session = await recordingSession(req, 'student');
    if (!session || !await Learner.exists({ _id: session.userId })) return res.status(401).json({ message: 'Please sign in again to submit your survey.' });
    const answers = req.body?.answers;
    if (!Array.isArray(answers) || answers.length !== 10 || answers.some((v) => !Number.isInteger(v) || v < 1 || v > 5)) {
      return res.status(400).json({ message: 'Answer all 10 questions with a rating from 1 to 5.' });
    }
    // One response per learner; retries replace the response instead of inflating totals.
    await SurveyResponse.findOneAndUpdate({ learnerId: session.userId }, { $set: { answers } }, { upsert: true, runValidators: true });
    res.json({ message: 'Survey submitted.' });
  } catch (error) {
    console.error('Survey submission failed:', error);
    res.status(500).json({ message: 'Could not save your survey. Please try again.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const session = await recordingSession(req, 'admin');
    if (!session || !await Admin.exists({ _id: session.userId, active: true })) return res.status(401).json({ message: 'Please sign in as an administrator again to view survey results.' });
    const responses = await SurveyResponse.find().sort({ updatedAt: -1 }).populate({ path: 'learnerId', select: 'lastName firstName section sectionId', populate: { path: 'sectionId', select: 'name' } }).lean();
    res.json(responses.map((response) => ({
      id: response._id,
      name: [response.learnerId?.lastName, response.learnerId?.firstName].filter(Boolean).join(', ') || 'Deleted learner',
      section: response.learnerId?.sectionId?.name || response.learnerId?.section || 'Unavailable',
      answers: response.answers,
      score: response.answers.reduce((total, answer, index) => total + (index % 2 === 0 ? answer - 1 : 5 - answer), 0) * 2.5,
      submittedAt: response.updatedAt,
    })));
  } catch (error) {
    console.error('Survey results failed:', error);
    res.status(500).json({ message: 'Could not load survey results.' });
  }
});

module.exports = router;
