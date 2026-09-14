import test from "node:test";
import assert from "node:assert/strict";
import { splitScannedStory } from "./scannedStory.js";

test("separates a wrapped title and author, including repeated page headers", () => {
  const result = splitScannedStory([
    "The Little Girl\nin a Box\nStory by Jane Doe\n\nOnce there was a girl.",
    "The Little Girl\nin a Box\nStory by Jane Doe\nShe went outside.",
  ]);
  assert.equal(result.title, "The Little Girl in a Box");
  assert.deepEqual(result.pages.map((page) => page.text), ["Once there was a girl.", "She went outside."]);
});

test("handles labeled Filipino title and byline", () => {
  const result = splitScannedStory(["Pamagat: Ang Puno\nIsinulat ni Maria Cruz\n\nMay puno sa bakuran."]);
  assert.equal(result.title, "Ang Puno");
  assert.equal(result.pages[0].text, "May puno sa bakuran.");
});

test("recognizes a separated title without an author", () => {
  const result = splitScannedStory(["THE LITTLE GIRL\n\nOnce there was a girl."]);
  assert.equal(result.title, "THE LITTLE GIRL");
  assert.equal(result.pages[0].text, "Once there was a girl.");
});

test("preserves opening sentences and references to authors inside a story", () => {
  const text = "By the river, a girl sat.\nShe read a book.\nWritten by Jane Doe\nwas printed on its cover.";
  assert.equal(splitScannedStory([text]).pages[0].text, text);
});

test("combines ordered images and extracts questions and mixed choice punctuation", () => {
  const result = splitScannedStory([
    "Mia planted a tree.",
    "It grew tall.\n\nQuestions:\n1. What did Mia plant?\nA. A tree\nB. A flower\nC. Rice\nD. Corn",
    "2) What happened?\na) It grew\nb) It fell",
  ]);
  assert.deepEqual(result.pages.map((page) => page.text), ["Mia planted a tree.", "It grew tall."]);
  assert.deepEqual(result.questions, [
    { id: 1, question: "What did Mia plant?", options: ["A tree", "A flower", "Rice", "Corn"], correct: null },
    { id: 2, question: "What happened?", options: ["It grew", "It fell"], correct: null },
  ]);
});

test("recognizes Filipino heading, inline choices, and choices spanning images", () => {
  const result = splitScannedStory([
    "May puno sa bakuran.\n\nMGA TANONG\n1. Nasaan ang puno? A) Sa bakuran B) Sa bahay",
    "C) Sa paaralan D) Sa dagat",
  ]);
  assert.deepEqual(result.questions[0].options, ["Sa bakuran", "Sa bahay", "Sa paaralan", "Sa dagat"]);
  assert.equal(result.pages[0].text, "May puno sa bakuran.");
});

test("preserves ordinary numbered story text and questions with unreadable choices", () => {
  const original = "1. She asked questions.\n2. She went home.\n\nQuestions\n3. Where?\nA. Home\nC. School";
  const result = splitScannedStory([original]);
  assert.equal(result.questions.length, 0);
  assert.equal(result.pages.map((page) => page.text).join("\n\n"), original);
});

test("question-only images are supported and answer keys are retained for review", () => {
  const result = splitScannedStory(["Questions\n1. Which?\nA. One\nB. Two\n\nAnswer key: 1. B"]);
  assert.deepEqual(result.questions[0].options, ["One", "Two"]);
  assert.equal(result.questions[0].correct, null);
  assert.equal(result.pages[0].text, "Answer key: 1. B");
  assert.equal(splitScannedStory(["1. Which? A. One B. Two"]).pages.length, 0);
});
