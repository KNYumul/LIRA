import test from 'node:test';
import assert from 'node:assert/strict';
import { matchedWordCount, readingProgress } from './readingTracking.js';

test('story reading continues past wrong and skipped words', () => {
  assert.deepEqual(readingProgress('The little bird flew home', 'the brittle bird flew home'), { count: 5, incorrectWordIndices: [1] });
  assert.deepEqual(readingProgress('The little bird flew home', 'the bird flew'), { count: 4, incorrectWordIndices: [1] });
  assert.deepEqual(readingProgress('The bird flew home', 'the bird flew house'), { count: 4, incorrectWordIndices: [3] });
  assert.deepEqual(readingProgress('The little bird flew home', 'the big dog flew home'), { count: 5, incorrectWordIndices: [1, 2] });
});

test('story reading leaves unread words alone and tolerates repeats and extra words', () => {
  assert.deepEqual(readingProgress('The bird flew home', ''), { count: 0, incorrectWordIndices: [] });
  assert.deepEqual(readingProgress('The bird flew home', 'the bird'), { count: 2, incorrectWordIndices: [] });
  assert.deepEqual(readingProgress('The bird flew home', 'the the bird bird flew'), { count: 3, incorrectWordIndices: [] });
  assert.deepEqual(readingProgress('The bird flew home', 'the little bird flew home'), { count: 4, incorrectWordIndices: [] });
});

test('story reading preserves number and Filipino matching while advancing past errors', () => {
  assert.deepEqual(readingProgress('I have fifty coins', 'I have 50 coins'), { count: 4, incorrectWordIndices: [] });
  assert.deepEqual(readingProgress('Araw-araw ay masayá ang bata', 'araw araw ay masaya ang bato', 'FIL'), { count: 5, incorrectWordIndices: [4] });
  assert.deepEqual(readingProgress('Siya ay nag aaral', 'siya ay nag-aaral', 'FIL'), { count: 4, incorrectWordIndices: [] });
});

test('a revised interim transcript can clear a provisional error', () => {
  assert.deepEqual(readingProgress('The bird flew', 'the boat'), { count: 2, incorrectWordIndices: [1] });
  assert.deepEqual(readingProgress('The bird flew', 'the bird flew'), { count: 3, incorrectWordIndices: [] });
});

test('pre-tokenized remaining words preserve errors, compounds and unread trailing words', () => {
  const words = ['Araw-araw', 'ay', 'masayá', 'ang', 'bata'];
  assert.deepEqual(readingProgress(words, 'araw araw ay masaya', 'FIL'), { count: 3, incorrectWordIndices: [] });
  assert.deepEqual(readingProgress(words.slice(3), 'ang bato', 'FIL'), { count: 2, incorrectWordIndices: [1] });
  assert.deepEqual(readingProgress(['I', 'have', 'fifty', 'coins'], 'I have 50'), { count: 3, incorrectWordIndices: [] });
  assert.deepEqual(readingProgress(words, '', 'FIL'), { count: 0, incorrectWordIndices: [] });
  assert.deepEqual(readingProgress([], 'hello'), { count: 0, incorrectWordIndices: [] });
  assert.deepEqual(words, ['Araw-araw', 'ay', 'masayá', 'ang', 'bata']);
});

test('accepts fifty as a word or digits in partial and complete transcripts', () => {
  assert.equal(matchedWordCount('I have fifty coins.', 'I have 50'), 3);
  assert.equal(matchedWordCount('I have fifty coins.', 'I have 50 coins'), 4);
  assert.equal(matchedWordCount('I have fifty coins.', 'I have fifty coins'), 4);
  assert.equal(matchedWordCount('I have 50 coins.', 'I have fifty coins'), 4);
});

test('normalizes other simple English numbers without accepting incorrect numbers or gaps', () => {
  assert.equal(matchedWordCount('zero five fifteen twenty forty ninety', '0 5 15 20 40 90'), 6);
  assert.equal(matchedWordCount('fifty coins', 'fifteen coins'), 0);
  assert.equal(matchedWordCount('fifty coins', '15 coins'), 0);
  assert.equal(matchedWordCount('I have fifty coins', 'I 50 coins'), 1);
  assert.equal(matchedWordCount('fifty', '50', 'FIL'), 0);
});

test('Filipino accepts split hyphens and written stress marks', () => {
  assert.equal(matchedWordCount('Araw-araw ay masayá ang bata.', 'araw araw ay masaya ang bata', 'FIL'), 5);
  assert.equal(matchedWordCount('Siya ay nag aaral.', 'siya ay nag-aaral', 'FIL'), 4);
  assert.equal(matchedWordCount('Ang pag-ibig ay mahalaga.', 'ang pag ibig ay mahalaga', 'FIL'), 4);
});

test('Filipino still requires missing words and every part of a compound', () => {
  assert.equal(matchedWordCount('Ang bata ay nagbasa ng libro.', 'ang bata nagbasa ng libro', 'FIL'), 2);
  assert.equal(matchedWordCount('Araw-araw ay masaya.', 'araw ay masaya', 'FIL'), 0);
  assert.equal(matchedWordCount('Ang bata ay masaya.', 'ang bato ay masaya', 'FIL'), 1);
  assert.equal(matchedWordCount('Araw-araw ay masaya.', 'araw araw ay masaya'), 0);
});

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
