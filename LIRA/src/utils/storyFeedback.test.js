import test from "node:test";
import assert from "node:assert/strict";
import { storyFeedbackIssues } from "./storyFeedback.js";

test("accepts current feedback and an explicit no-issues result", () => {
  assert.deepEqual(storyFeedbackIssues({ issues: [" Fix this typo. "] }), ["Fix this typo."]);
  assert.deepEqual(storyFeedbackIssues({ issues: [] }), []);
});

test("supports feedback from a server running the previous response format", () => {
  assert.deepEqual(storyFeedbackIssues({ feedback: " Paragraph 1: fix the spelling. " }),
    ["Paragraph 1: fix the spelling."]);
  assert.deepEqual(storyFeedbackIssues({ feedback: "No issues found." }), ["No issues found."]);
});

test("rejects malformed feedback without claiming the story has no issues", () => {
  for (const result of [null, {}, { feedback: " " }, { issues: null },
    { issues: [""] }, { issues: [123] }, { issues: [{}] },
    { issues: "invalid", feedback: "No issues found." }]) {
    assert.throws(() => storyFeedbackIssues(result), /invalid feedback/);
  }
});

test("starts a separate bullet at However in both response formats", () => {
  const opening = "The story is well-written, engaging, and age-appropriate with no spelling or grammar errors.";
  const correction = "However, there is a minor redundancy in paragraph 4: 'And there she stayed' is repeated twice. Consider removing one instance.";
  for (const result of [{ feedback: `${opening} ${correction}` }, { issues: [`${opening} ${correction}`] }]) {
    assert.deepEqual(storyFeedbackIssues(result), [opening,
      "However, there is a minor redundancy in paragraph 4: 'And there she stayed' is repeated twice.",
      "Consider removing one instance."]);
  }
});

test("gives each sentence its own bullet without requiring transition words", () => {
  assert.deepEqual(storyFeedbackIssues({ feedback: "Paragraph 4: Remove the repeated phrase. Additionally, paragraph 8 needs a verb. Add 'saw' before the list." }),
    ["Paragraph 4: Remove the repeated phrase.", "Additionally, paragraph 8 needs a verb.", "Add 'saw' before the list."]);
  assert.deepEqual(storyFeedbackIssues({ issues: ["Paragraph 2: However is misspelled. Replace 'Howver' with 'However'."] }),
    ["Paragraph 2: However is misspelled.", "Replace 'Howver' with 'However'."]);
});

test("preserves punctuation, decimal numbers, and a final sentence without punctuation", () => {
  const points = ["Change 1.5 to 2.5.", "Use 'Stop!'", "Remove the repeated word"];
  assert.deepEqual(storyFeedbackIssues({ feedback: points.join(" ") }), points);
});
