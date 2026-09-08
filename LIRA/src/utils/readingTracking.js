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
  for (const word of heard) {
    if (word === expected[expectedIndex]) expectedIndex += 1;
  }
  return Math.min(expectedIndex, expected.length);
}

