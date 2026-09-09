import test from 'node:test';
import assert from 'node:assert/strict';
import { matchedWordCount } from './readingTracking.js';

test('advances immediately through a fast multiword partial result', () => {
  assert.equal(matchedWordCount('The little bird flew over the tree.', 'the little bird flew over'), 5);
});

test('waits for missing or misrecognized words even when following words match', () => {
  assert.equal(matchedWordCount('The little bird flew over the tree.', 'the bird flew over'), 1);
  assert.equal(matchedWordCount('The little bird flew over the tree.', 'the brittle bird flew over'), 1);
  assert.equal(matchedWordCount('Ang bata ay nagbasa ng libro.', 'ang bata nagbasa ng libro'), 2);
});

test('cannot jump over the opening words or gaps of two to four words', () => {
  const sentence = 'The little girl could see the woman was tired';
  assert.equal(matchedWordCount(sentence, 'could see'), 0);
  for (let skipped = 2; skipped <= 4; skipped += 1) {
    const words = sentence.split(' ');
    assert.equal(matchedWordCount(sentence, words.slice(skipped).join(' ')), 1);
    assert.equal(matchedWordCount(sentence, ['The', ...words.slice(1 + skipped)].join(' ')), 1);
  }
});

test('resumes when the reader retries the missing word and continues in order', () => {
  assert.equal(matchedWordCount('The little girl could see', 'the could see little girl could see'), 5);
});

test('does not skip for an isolated match or a distant phrase', () => {
  assert.equal(matchedWordCount('The little bird flew over the tree.', 'the bird'), 1);
  assert.equal(matchedWordCount('one two three four five six seven', 'six seven'), 0);
});

test('handles revisions, repetitions, punctuation and empty input', () => {
  assert.equal(matchedWordCount('The bird flew.', 'the the bird bird flew'), 3);
  assert.equal(matchedWordCount('The bird flew.', 'the boat'), 1);
  assert.equal(matchedWordCount('Hello, world!', 'hello world'), 2);
  assert.equal(matchedWordCount('', 'hello'), 0);
  assert.equal(matchedWordCount('Hello world', ''), 0);
});
