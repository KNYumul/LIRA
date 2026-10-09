const express = require("express");
const Learner = require("../models/Learner");
const Section = require("../models/Section");
const Teacher = require("../models/Teacher");
const StoryResult = require("../models/StoryResult");
const { loginKey, cooldownStatus, failedLogin, clearFailedLogins, sendCooldown } = require("../utils/loginCooldown");
const { lrnLookup } = require("../utils/learnerEncryption");

const { issueSession } = require("../utils/recordingSession");
const router = express.Router();

// AI Recommended Actions
function responseText(response) {
  if (typeof response.output_text === "string") return response.output_text;
  return (response.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text)
    .join("");
}

function geminiSchema(schema) {
  if (Array.isArray(schema)) return schema.map(geminiSchema);
  if (!schema || typeof schema !== "object") return schema;
  return Object.fromEntries(
    Object.entries(schema)
      .filter(([key]) => key !== "additionalProperties")
      .map(([key, value]) => [key, geminiSchema(value)])
  );
}

async function generateRecommendationsWithOpenAI(prompt, schema) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured on the server.");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_RECOMMENDATION_MODEL || process.env.OPENAI_STORY_MODEL || "gpt-5.6-terra",
      input: prompt,
      text: { format: { type: "json_schema", name: "learner_recommendations", strict: true, schema } }
    })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || "OpenAI could not generate recommendations.");
  return responseText(result);
}

async function generateRecommendationsWithGemini(prompt, schema) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured on the server.");
  const model = process.env.GEMINI_RECOMMENDATION_MODEL || process.env.GEMINI_STORY_MODEL || "gemini-3.5-flash-lite";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: geminiSchema(schema) }
    })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || "Gemini could not generate recommendations.");
  const text = (result.candidates || []).flatMap((candidate) => candidate.content?.parts || []).map((part) => part.text || "").join("");
  if (!text) throw new Error("Gemini returned no recommendations.");
  return text;
}

async function currentTeacher(req, res) {
  const teacherId = req.get("X-Teacher-Id");
  if (!teacherId) {
    res.status(401).json({ message: "Please sign in as a teacher to manage learners." });
    return null;
  }
  const teacher = await Teacher.findById(teacherId).select("active");
  if (!teacher || !teacher.active) {
    res.status(401).json({ message: "Your teacher account could not be verified." });
    return null;
  }
  return teacher;
}

async function teacherSection(teacher, { sectionId, section }, createIfMissing = false) {
  if (sectionId) return Section.findOne({ _id: sectionId, teacherId: teacher._id });
  const name = String(section || "").trim();
  if (!name) return null;

  const scope = { name };
  const existing = await Section.findOne(scope).collation({ locale: "en", strength: 2 });
  if (existing) return existing.teacherId.equals(teacher._id) ? existing : null;
  if (!createIfMissing) return null;

  const claimed = await Section.findOneAndUpdate(
    scope,
    {
      $setOnInsert: {
        name,
        teacherId: teacher._id
      }
    },
    { upsert: true, new: true, runValidators: true, collation: { locale: "en", strength: 2 } }
  );
  return claimed.teacherId.equals(teacher._id) ? claimed : null;
}

async function ownedLearner(learnerId, teacherId) {
  const sectionIds = await Section.find({ teacherId }).distinct("_id");
  return Learner.findOne({ _id: learnerId, sectionId: { $in: sectionIds } });
}

router.post("/recommendations", async (req, res) => {
  try {
    const teacher = await currentTeacher(req, res);
    if (!teacher) return;

    const learners = Array.isArray(req.body.learners) ? req.body.learners.slice(0, 100) : [];
    if (!learners.length) return res.status(400).json({ message: "Add at least one learner before generating recommendations." });

    const metrics = learners.map((learner) => ({
      id: String(learner.id || "").slice(0, 100),
      comprehension: Number.isFinite(learner.comprehension) ? learner.comprehension : null,
      readingAccuracy: Number.isFinite(learner.readingAccuracy) ? learner.readingAccuracy : null,
      wpm: Number.isFinite(learner.wpm) ? learner.wpm : null,
      riskLevel: String(learner.riskLevel || "No Data").slice(0, 50),
    })).filter((learner) => learner.id);
    if (!metrics.length) return res.status(400).json({ message: "Learner metrics are missing." });

    const schema = {
      type: "object",
      additionalProperties: false,
      required: ["recommendations"],
      properties: {
        recommendations: {
          type: "array",
          minItems: metrics.length,
          maxItems: metrics.length,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "recommendation"],
            properties: { id: { type: "string" }, recommendation: { type: "string" } }
          }
        }
      }
    };
    const prompt = [
      "Create one concise, practical literacy recommendation for each Grade 3 learner metric below.",
      "Use only the supplied metrics. Do not diagnose, make predictions, or mention AI. Address the teacher directly, in one sentence of at most 28 words.",
      "Use these CRLA benchmarks: Reading Accuracy—Grade Ready >=90%, Light Refresher 80-89%, Moderate Refresher 65-79%, Full Refresher <65%; Comprehension—Grade Ready >=80%, Light Refresher 70-79%, Moderate Refresher 60-69%, Full Refresher <60%; WPM—Grade Ready >=60, Light Refresher 45-59, Moderate Refresher 30-44, Full Refresher <30.",
      "Explicitly name every available metric below its Grade Ready benchmark and recommend practice for it, even when the overall risk level is Grade Ready because two other metrics are Grade Ready. If a score is missing, recommend collecting that assessment.",
      "Return exactly one recommendation for every id, retaining each id exactly as supplied.",
      "LEARNER METRICS (identifiers only; no names or LRN):",
      JSON.stringify(metrics)
    ].join("\n\n");
    const provider = String(process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? "gemini" : "openai")).toLowerCase();
    if (!new Set(["openai", "gemini"]).has(provider)) return res.status(503).json({ message: `Unsupported AI_PROVIDER: ${provider}.` });
    if (!(provider === "gemini" ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY)) {
      return res.status(503).json({ message: "AI recommendations are not configured on the server." });
    }
    const text = provider === "gemini"
      ? await generateRecommendationsWithGemini(prompt, schema)
      : await generateRecommendationsWithOpenAI(prompt, schema);
    const result = JSON.parse(text);
    const ids = new Set(metrics.map((learner) => learner.id));
    const recommendationIds = new Set((result.recommendations || []).map((item) => item?.id));
    if (!Array.isArray(result.recommendations) || result.recommendations.length !== metrics.length
      || recommendationIds.size !== ids.size || [...ids].some((id) => !recommendationIds.has(id))
      || result.recommendations.some((item) => !ids.has(item?.id) || typeof item.recommendation !== "string" || !item.recommendation.trim())) {
      return res.status(502).json({ message: "The AI returned invalid recommendations. Please try again." });
    }
    res.json({ recommendations: result.recommendations });
  } catch (error) {
    console.error("Could not generate learner recommendations:", error);
    res.status(502).json({ message: "Could not generate AI recommendations. Please try again." });
  }
});

router.get("/", async (req, res) => {
  try {
    const teacher = await currentTeacher(req, res);
    if (!teacher) return;
    const sectionIds = await Section.find({ teacherId: teacher._id }).distinct("_id");
    const learners = await Learner.find({ sectionId: { $in: sectionIds } })
      .select("lrn lastName section sectionId")
      .sort({ _id: 1 });
    learners.sort((a, b) => a.lastName.localeCompare(b.lastName));
    const learnerIds = learners.map((learner) => learner._id);
    const results = await StoryResult.find({ learnerId: { $in: learnerIds } })
      .sort({ createdAt: -1 })
      .select("learnerId storyId storyTitle score total readingAccuracy readingWpm readingWordStats readingWordCount readingDurationSeconds recordingSegmentCount selectedForAverage createdAt");
    const resultsByLearner = new Map();
    results.forEach((result) => {
      const key = result.learnerId.toString();
      if (!resultsByLearner.has(key)) resultsByLearner.set(key, []);
      resultsByLearner.get(key).push(result);
    });
    res.json(learners.map((learner) => {
      const storyResults = resultsByLearner.get(learner._id.toString()) || [];
      return {
        ...learner.toObject(),
        latestStoryResult: storyResults[0] || null,
        storyResults
      };
    }));
  } catch {
    res.status(500).json({ message: "Could not load your learners." });
  }
});

router.post("/", async (req, res) => {
  try {
    const teacher = await currentTeacher(req, res);
    if (!teacher) return;
    const section = await teacherSection(teacher, req.body, true);
    const lastName = String(req.body.lastName || "").trim();
    const lrn = String(req.body.lrn || "").trim();
    if (!lastName || !/^\d{12}$/.test(lrn)) return res.status(400).json({ message: "A last name and a 12-digit LRN are required." });
    if (!section) {
      const requestedSection = String(req.body.section || "").trim();
      const ownedSection = await Section.findOne({ name: requestedSection })
        .collation({ locale: "en", strength: 2 })
        .populate("teacherId", "firstName lastName");
      const ownerName = ownedSection?.teacherId
        ? [ownedSection.teacherId.firstName, ownedSection.teacherId.lastName].filter(Boolean).join(" ")
        : "another teacher";
      return res.status(403).json({
        message: `${lastName || "This learner"} belongs to Section ${ownedSection?.name || requestedSection}, which is managed by ${ownerName}.`,
        code: "SECTION_OWNED_BY_ANOTHER_TEACHER"
      });
    }
    const learner = await Learner.create({
      lastName,
      lrn,
      section: section.name,
      sectionId: section._id
    });
    res.status(201).json(learner);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "That LRN is already assigned to a learner." });
    res.status(400).json({ message: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const teacher = await currentTeacher(req, res);
    if (!teacher) return;
    const learner = await ownedLearner(req.params.id, teacher._id);
    if (!learner) return res.status(404).json({ message: "Learner not found in your sections." });
    const section = await teacherSection(teacher, req.body);
    if (!section) return res.status(403).json({ message: "That section is not assigned to you." });
    const lrn = String(req.body.lrn || "").trim();
    const lastName = String(req.body.lastName || "").trim();
    if (!lastName || !/^\d{12}$/.test(lrn)) return res.status(400).json({ message: "A last name and a 12-digit LRN are required." });
    learner.lastName = req.body.lastName;
    learner.lrn = lrn;
    learner.section = section.name;
    learner.sectionId = section._id;
    await learner.save();
    res.json(learner);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const teacher = await currentTeacher(req, res);
    if (!teacher) return;
    const learner = await ownedLearner(req.params.id, teacher._id);
    if (!learner) return res.status(404).json({ message: "Learner not found in your sections." });
    learner.deletedAt = new Date();
    await learner.save();
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const lrn = String(req.body.lrn || "").trim();
    const password = String(req.body.password || "").trim();
    if (!/^\d{12}$/.test(lrn) || !password) {
      return res.status(400).json({ message: "A 12-digit LRN and password are required." });
    }

    const key = loginKey(req, "learner");
    const status = cooldownStatus(key);
    if (status.locked) return sendCooldown(res, status.retryAfterSeconds);

    const learner = await Learner.findOne({
      lrnLookup: lrnLookup(lrn),
      dataEncryptionVersion: 1
    }).select("+lrnLookup +dataEncryptionVersion");
    const passwordMatches = learner && learner.lastName.localeCompare(password, undefined, { sensitivity: "accent" }) === 0;
    if (!passwordMatches) {
      const failure = failedLogin(key);
      if (failure.locked) return sendCooldown(res, failure.retryAfterSeconds);
      return res.status(401).json({ message: `Invalid LRN or password. ${failure.remainingAttempts} attempt${failure.remainingAttempts === 1 ? "" : "s"} remaining.` });
    }
    clearFailedLogins(key);
    res.json({
      message: "Login successful!",
      token: await issueSession(learner._id, "student"),
      learner: { id: learner._id, lrn: learner.lrn, lastName: learner.lastName, section: learner.section }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
