import test from 'node:test';
import assert from 'node:assert/strict';
import { matchedWordCount, readingProgress, assessedReadingProgress } from './readingTracking.js';

const assessmentJson = (entries) => JSON.stringify({ NBest: [{ Words: entries.map(([Word, ErrorType = 'None']) =>
  ({ Word, PronunciationAssessment: { ErrorType } })) }] });

test('flashcards advance through mispronunciations even when the transcript spells the target correctly', () => {
  assert.deepEqual(assessedReadingProgress('The little bird flew', 'The little bird flew', 'ENG',
    assessmentJson([['the'], ['little', 'Mispronunciation'], ['bird'], ['flew']])),
  { count: 4, incorrectWordIndices: [1] });
  assert.deepEqual(assessedReadingProgress('bird', 'bird', 'ENG',
    assessmentJson([['bird', 'Mispronunciation']])), { count: 1, incorrectWordIndices: [0] });
});

test('flashcard assessment aligns omissions and extra words without marking unread trailing words', () => {
  assert.deepEqual(assessedReadingProgress('The little bird flew home', 'the big bird flew', 'ENG',
    assessmentJson([['the'], ['little', 'Omission'], ['big', 'Insertion'], ['bird'], ['flew'], ['home', 'Omission']])),
  { count: 4, incorrectWordIndices: [1] });
  assert.deepEqual(assessedReadingProgress('The bird flew', 'the little bird', 'ENG',
    assessmentJson([['the'], ['little', 'Insertion'], ['bird', 'Mispronunciation']])),
  { count: 2, incorrectWordIndices: [1] });
});

test('flashcard reading keeps transcript error detection for partial results and Filipino', () => {
  for (const details of [undefined, 'invalid json', '{}', '{"NBest":[]}', assessmentJson([])]) {
    assert.deepEqual(assessedReadingProgress('The bird flew home', 'the boat flew', 'ENG', details),
      { count: 3, incorrectWordIndices: [1] });
  }
  assert.deepEqual(assessedReadingProgress('Isang bata ay masaya', '1 bato ay masaya', 'FIL'),
    { count: 4, incorrectWordIndices: [1] });
});

test('flashcard speech segments continue from committed progress after an error', () => {
  const words = ['The', 'little', 'bird', 'flew', 'home'];
  const first = assessedReadingProgress(words, 'the little', 'ENG',
    assessmentJson([['the'], ['little', 'Mispronunciation']]));
  const next = assessedReadingProgress(words.slice(first.count), 'bird flew home', 'ENG',
    assessmentJson([['bird'], ['flew'], ['home']]));
  assert.equal(first.count + next.count, words.length);
  assert.deepEqual([...first.incorrectWordIndices, ...next.incorrectWordIndices.map((index) => first.count + index)], [1]);
});

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

test('Filipino number words and linker forms match digit transcripts', () => {
  for (const spoken of ['isang', 'isa', '1']) {
    assert.equal(matchedWordCount('Isang araw may isang bata', spoken, 'FIL'), 1);
    assert.deepEqual(readingProgress('Isang araw may isang bata', `${spoken} araw may 1 bata`, 'FIL'),
      { count: 5, incorrectWordIndices: [] });
  }
  for (const [word, digit] of [
    ['sero', '0'], ['isa', '1'], ['isang', '1'], ['dalawa', '2'], ['dalawang', '2'],
    ['tatlo', '3'], ['tatlong', '3'], ['apat', '4'], ['lima', '5'], ['limang', '5'],
    ['anim', '6'], ['pito', '7'], ['pitong', '7'], ['walo', '8'], ['walong', '8'],
    ['siyam', '9'], ['sampu', '10'], ['sampung', '10'],
  ]) {
    assert.equal(matchedWordCount(word, digit, 'FIL'), 1);
    assert.equal(matchedWordCount(digit, word, 'FIL'), 1);
    assert.deepEqual(readingProgress([word], digit, 'FIL'), { count: 1, incorrectWordIndices: [] });
  }
  assert.equal(matchedWordCount('isáng bata', '1 bata', 'FIL'), 2);
  assert.equal(matchedWordCount('Isa-isang nakalaya', '1 1 nakalaya', 'FIL'), 2);
});

test('Filipino number normalization preserves incorrect numbers, gaps and language boundaries', () => {
  assert.equal(matchedWordCount('isang bata', '2 bata', 'FIL'), 0);
  assert.deepEqual(readingProgress('isang bata', '2 bata', 'FIL'), { count: 2, incorrectWordIndices: [0] });
  assert.equal(matchedWordCount('may isang bata', '1 bata', 'FIL'), 0);
  assert.equal(matchedWordCount('apat na bata', '4 bata', 'FIL'), 1);
  assert.equal(matchedWordCount('isang', '1', 'ENG'), 0);
  assert.equal(matchedWordCount('bata', 'batang', 'FIL'), 0);
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
