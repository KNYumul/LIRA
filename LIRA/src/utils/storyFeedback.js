const feedbackSentences = new Intl.Segmenter("en", { granularity: "sentence" });

function splitFeedbackPoints(text) {
  return Array.from(feedbackSentences.segment(text.trim()), ({ segment }) => segment.trim())
    .filter(Boolean);
}

export function storyFeedbackIssues(result) {
  if (result && Array.isArray(result.issues)) {
    if (result.issues.every((issue) => typeof issue === "string" && issue.trim())) {
      return result.issues.flatMap(splitFeedbackPoints);
    }
  } else if (result && !Object.hasOwn(result, "issues")
    && typeof result.feedback === "string" && result.feedback.trim()) {
    // Support servers still returning the previous feedback format.
    return splitFeedbackPoints(result.feedback);
  }
  throw new Error("The AI returned invalid feedback. Please try again.");
}
