const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateReadingAccuracy } = require('../utils/readingAccuracy');

test('English and Filipino marked words lower the saved accuracy', async () => {
  const { readingProgress, readingWords, normalizedWord } = await import('../../src/utils/readingTracking.js');
  for (const [language, text, spoken] of [
    ['ENG', 'The little bird flew home', 'the bird flew house'],
    ['FIL', 'Ang bata ay nagbasa ngayon', 'ang bato nagbasa ngayon'],
  ]) {
    const result = readingProgress(text, spoken, language);
    assert.equal(result.count, 5);
    const stats = new Map();
    readingWords(text).forEach((word, index) => {
      const key = normalizedWord(word);
      const stat = stats.get(key) || { word: key, attempts: 0, retries: 0 };
      stat.attempts += 1;
      if (result.incorrectWordIndices.includes(index)) stat.retries += 1;
      stats.set(key, stat);
    });
    assert.equal(calculateReadingAccuracy([{ text }], [...stats.values()]), 60);
  }
});

test('counts repeated occurrences across pages, not unique words', () => {
  const pages = [{ text: 'Go go.' }, { text: 'Go home.' }];
  assert.equal(calculateReadingAccuracy(pages, [
    { word: 'go', attempts: 3, retries: 1 },
    { word: 'home', attempts: 1, retries: 0 },
  ]), 75);
});

test('handles perfect, entirely incorrect, missing, and unavailable readings', () => {
  const pages = [{ text: 'Hello world' }];
  assert.equal(calculateReadingAccuracy(pages, [
    { word: 'hello', attempts: 1, retries: 0 }, { word: 'world', attempts: 1, retries: 0 },
  ]), 100);
  assert.equal(calculateReadingAccuracy(pages, [
    { word: 'hello', attempts: 1, retries: 1 }, { word: 'world', attempts: 1, retries: 1 },
  ]), 0);
  assert.equal(calculateReadingAccuracy(pages, [{ word: 'hello', attempts: 1, retries: 0 }]), 50);
  assert.equal(calculateReadingAccuracy(pages, []), null);
  assert.equal(calculateReadingAccuracy([], []), null);
});

test('caps credit at actual word occurrences and rounds percentages', () => {
  assert.equal(calculateReadingAccuracy([{ text: 'One two three' }], [
    { word: 'one', attempts: 10, retries: 0 },
  ]), 33);
});
