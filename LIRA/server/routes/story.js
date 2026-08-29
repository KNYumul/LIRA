const express = require("express");
const Story = require("../models/Story");
const Teacher = require("../models/Teacher");
const Learner = require("../models/Learner");
const Section = require("../models/Section");

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

const clampInteger = (value, minimum, maximum, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
};

function responseText(response) {
  if (typeof response.output_text === "string") return response.output_text;
  return (response.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text)
    .join("");
}

function geminiResponseText(response) {
  return (response.candidates || [])
    .flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => part.text || "")
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

async function generateWithOpenAI(prompt, schema) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured on the server.");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_STORY_MODEL || "gpt-5.6-terra",
      input: prompt,
      text: {
        format: { type: "json_schema", name: "literacy_story", strict: true, schema }
      }
    })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || "OpenAI could not generate a story.");
  return responseText(result);
}

async function generateWithGemini(prompt, schema) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured on the server.");
  const model = process.env.GEMINI_STORY_MODEL || "gemini-3.5-flash-lite";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: geminiSchema(schema)
        }
      })
    }
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || "Gemini could not generate a story.");
  const text = geminiResponseText(result);
  if (!text && result.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the request: ${result.promptFeedback.blockReason}.`);
  }
  return text;
}

router.post("/generate", async (req, res) => {
  try {
    const teacher = await currentTeacher(req, res);
    if (!teacher) return;
    const language = req.body.language === "FIL" ? "Filipino" : "English";
    // const readingLevel = String(req.body.readingLevel || "Grade 2").trim().slice(0, 40);
    const readingLevel = "Grade 3";
    const topic = String(req.body.topic || "friendship and curiosity").trim().slice(0, 180);
    const moral = String(req.body.moral || "").trim().slice(0, 180);
    const paragraphCount = clampInteger(req.body.paragraphCount, 3, 15, 6);
    const questionCount = clampInteger(req.body.questionCount, 3, 10, 5);

    const schema = {
      type: "object",
      additionalProperties: false,
      required: ["title", "description", "paragraphs", "questions"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        paragraphs: {
          type: "array",
          minItems: paragraphCount,
          maxItems: paragraphCount,
          items: { type: "string" }
        },
        questions: {
          type: "array",
          minItems: questionCount,
          maxItems: questionCount,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["question", "options", "correct"],
            properties: {
              question: { type: "string" },
              options: {
                type: "array",
                minItems: 4,
                maxItems: 4,
                items: { type: "string" }
              },
              correct: { type: "integer", minimum: 0, maximum: 3 }
            }
          }
        }
      }
    };

    const prompt = [
      `Write an original, child-appropriate literacy story in ${language} for ${readingLevel} learners.`,
      `Topic or theme: ${topic}.`,
      moral ? `Lesson or moral: ${moral}.` : "Include a positive, age-appropriate lesson.",
      `Write exactly ${paragraphCount} coherent paragraphs using vocabulary suitable for the reading level.`,
      `Create exactly ${questionCount} multiple-choice comprehension questions with four plausible choices each.`,
      "Questions must be answerable only from the story. Avoid frightening, discriminatory, sexual, violent, or otherwise age-inappropriate content."
    ].join(" ");

    const provider = String(process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? "gemini" : "openai")).toLowerCase();
    if (!new Set(["openai", "gemini"]).has(provider)) {
      return res.status(503).json({ message: `Unsupported AI_PROVIDER: ${provider}.` });
    }
    if (provider === "gemini" && !process.env.GEMINI_API_KEY) {
      return res.status(503).json({ message: "GEMINI_API_KEY is not configured on the server." });
    }
    if (provider === "openai" && !process.env.OPENAI_API_KEY) {
      return res.status(503).json({ message: "OPENAI_API_KEY is not configured on the server." });
    }
    let text;
    try {
      text = provider === "gemini"
        ? await generateWithGemini(prompt, schema)
        : await generateWithOpenAI(prompt, schema);
    } catch (providerError) {
      console.error(`${provider} story generation failed:`, providerError.message);
      return res.status(502).json({ message: providerError.message });
    }
    if (!text) return res.status(502).json({ message: "The AI returned an empty story." });
    const generated = JSON.parse(text);
    res.json({
      title: generated.title,
      description: generated.description,
      pages: generated.paragraphs.map((paragraph, index) => ({ id: index + 1, text: paragraph })),
      questions: generated.questions.map((question, index) => ({ id: index + 1, ...question }))
    });
  } catch (error) {
    console.error("Could not generate story:", error);
    res.status(500).json({ message: "Could not generate the story. Please try again." });
  }
});

router.post("/generate-questions", async (req, res) => {
  try {
    const teacher = await currentTeacher(req, res);
    if (!teacher) return;

    const storyText = (Array.isArray(req.body.pages) ? req.body.pages : [])
      .map((page) => String(page?.text || "").trim())
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 50000);
    if (!storyText) return res.status(400).json({ message: "Add story text before generating questions." });

    const questionCount = clampInteger(req.body.questionCount, 3, 10, 5);
    const language = req.body.language === "FIL" ? "Filipino" : "English";
    const schema = {
      type: "object",
      additionalProperties: false,
      required: ["questions"],
      properties: {
        questions: {
          type: "array",
          minItems: questionCount,
          maxItems: questionCount,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["question", "options", "correct"],
            properties: {
              question: { type: "string" },
              options: {
                type: "array",
                minItems: 4,
                maxItems: 4,
                items: { type: "string" }
              },
              correct: { type: "integer", minimum: 0, maximum: 3 }
            }
          }
        }
      }
    };
    const prompt = [
      `Create exactly ${questionCount} child-appropriate multiple-choice comprehension questions in ${language} for the story below.`,
      "Each question must have exactly four plausible options and one correct answer.",
      "Questions and answers must be supported directly by the story. Mix literal understanding with age-appropriate inference.",
      "STORY:",
      storyText
    ].join("\n\n");

    const provider = String(process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? "gemini" : "openai")).toLowerCase();
    if (!new Set(["openai", "gemini"]).has(provider)) {
      return res.status(503).json({ message: `Unsupported AI_PROVIDER: ${provider}.` });
    }
    if (provider === "gemini" && !process.env.GEMINI_API_KEY) {
      return res.status(503).json({ message: "GEMINI_API_KEY is not configured on the server." });
    }
    if (provider === "openai" && !process.env.OPENAI_API_KEY) {
      return res.status(503).json({ message: "OPENAI_API_KEY is not configured on the server." });
    }

    let text;
    try {
      text = provider === "gemini"
        ? await generateWithGemini(prompt, schema)
        : await generateWithOpenAI(prompt, schema);
    } catch (providerError) {
      console.error(`${provider} question generation failed:`, providerError.message);
      return res.status(502).json({ message: providerError.message });
    }
    if (!text) return res.status(502).json({ message: "The AI returned no questions." });

    const generated = JSON.parse(text);
    res.json({
      questions: generated.questions.map((question, index) => ({ id: index + 1, ...question }))
    });
  } catch (error) {
    console.error("Could not regenerate questions:", error);
    res.status(500).json({ message: "Could not regenerate the questions. Please try again." });
  }
});

router.get("/", async (req, res) => {
  try {
    let ownerTeacherId;
    const teacherId = req.get("X-Teacher-Id");
    const learnerId = req.get("X-Learner-Id");

    if (teacherId) {
      const teacher = await currentTeacher(req, res);
      if (!teacher) return;
      ownerTeacherId = teacher._id;
    } else if (learnerId) {
      const learner = await Learner.findById(learnerId).select("section sectionId");
      if (!learner) return res.status(401).json({ message: "Your learner account could not be verified." });

      const section = learner.sectionId
        ? await Section.findById(learner.sectionId).select("teacherId")
        : await Section.findOne({ name: learner.section }).collation({ locale: "en", strength: 2 }).select("teacherId");
      if (!section) return res.status(404).json({ message: "Your section could not be found." });
      ownerTeacherId = section.teacherId;
    } else {
      return res.status(401).json({ message: "Please sign in to view stories." });
    }

    const stories = await Story.find({
      $or: [
        { badge: "Library Story" },
        { teacherId: ownerTeacherId }
      ]
    })
      .populate("teacherId", "firstName lastName")
      .sort({ createdAt: -1 });
    res.json(stories.map((story) => {
      const result = story.toObject();
      const teacher = result.teacherId;
      if (teacher && typeof teacher === "object" && teacher._id) {
        result.teacherId = teacher._id;
        if (!result.uploadedBy || result.uploadedBy === "Unknown teacher") {
          result.uploadedBy = [teacher.firstName, teacher.lastName].filter(Boolean).join(" ") || "Unknown teacher";
        }
      }
      return result;
    }));
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
    ["title", "lang", "badge", "cover", "coverText", "coverImage", "description", "contentUnit", "pages", "questions"].forEach((field) => {
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
