const express = require("express");
const mongoose = require("mongoose");
const Learner = require("../models/Learner");

const router = express.Router();

router.post("/token", async (req, res) => {
  try {
    const learnerId = req.get("X-Learner-Id");
    if (!mongoose.isValidObjectId(learnerId) || !(await Learner.exists({ _id: learnerId }))) {
      return res.status(401).json({ message: "Your learner account could not be verified." });
    }

    const key = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;
    if (!key || !region) {
      return res.status(503).json({ message: "Azure Speech is not configured on the server." });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const tokenResponse = await fetch(
      `https://${encodeURIComponent(region)}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      { method: "POST", headers: { "Ocp-Apim-Subscription-Key": key }, signal: controller.signal }
    ).finally(() => clearTimeout(timeout));

    if (!tokenResponse.ok) {
      console.error("Azure Speech token request failed:", tokenResponse.status);
      return res.status(502).json({ message: "Azure Speech is temporarily unavailable." });
    }

    res.json({ token: await tokenResponse.text(), region });
  } catch (error) {
    console.error("Could not create Azure Speech token:", error.message);
    res.status(502).json({ message: "Could not connect to Azure Speech." });
  }
});

module.exports = router;
