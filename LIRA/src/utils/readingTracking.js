export function readingWords(text) {
  return String(text || '').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || [];
}

export function normalizedWord(word) {
  return String(word || '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

export function matchedWordCount(reference, spoken) {
  const expected = readingWords(reference).map(normalizedWord);
  const heard = readingWords(spoken).map(normalizedWord);
  let expectedIndex = 0;
  // Process every word in a speech update immediately, but never award
  // progress for an expected word that is missing from the transcript.
  for (const word of heard) {
    if (word === expected[expectedIndex]) expectedIndex += 1;
  }
  return Math.min(expectedIndex, expected.length);
}

