import test from "node:test";
import assert from "node:assert/strict";
import { detectFlashcardLanguage, detectStoryLanguage } from "./storyLanguage.js";

test("detects single-word flashcards in both languages", () => {
  for (const text of ["Apple", "DOG!", "school", "beautiful"]) {
    assert.equal(detectFlashcardLanguage(text), "ENG");
  }
  for (const text of ["mansanas", "PUSA!", "paaralan", "mag-aaral"]) {
    assert.equal(detectFlashcardLanguage(text), "FIL");
  }
});

test("detects short flashcard phrases", () => {
  assert.equal(detectFlashcardLanguage("The dog is happy."), "ENG");
  assert.equal(detectFlashcardLanguage("Ang mga bata ay masaya."), "FIL");
});

test("leaves ambiguous, unknown, and balanced mixed flashcards undecided", () => {
  for (const text of ["", "123", "xyz", "ate", "may", "at", "pusa dog", "xyz qqq dog"]) {
    assert.equal(detectFlashcardLanguage(text), null);
  }
});

test("detects Filipino story text even with an English name", () => {
  assert.equal(detectStoryLanguage("Isang araw, si Jane ay nagpunta sa paaralan. Nakita niya ang kanyang mga kaibigan at sila ay naglaro sa ilalim ng puno."), "FIL");
});
test("detects English story text even with Filipino names", () => {
  assert.equal(detectStoryLanguage("The girl named Ligaya was in the garden with her friends. She saw a bird and they were happy because the bird could fly."), "ENG");
});
test("does not guess from short, mixed, or unreadable text", () => {
  for (const text of ["", "Ang mga bata ay masaya.", "abc xyz qqq vvv zzz ttt xxx ppp hhh jjj kkk lll mmm", "Ang mga bata ay nasa paaralan at sila ay masaya. The children were at the school and they were happy with their friends."]) {
    assert.equal(detectStoryLanguage(text), null);
  }
});
