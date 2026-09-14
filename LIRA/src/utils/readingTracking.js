export function readingWords(text) {
  return String(text || '').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || [];
}

export function normalizedWord(word) {
  return String(word || '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

export function matchedWordCount(reference, spoken, language = 'ENG') {
  const normalize = (word) => {
    const value = normalizedWord(word);
    // Written stress marks are normally absent from speech transcripts. Keep ñ.
    return language === 'FIL' ? value.normalize('NFD').replace(/[\u0300\u0301\u0302]/g, '').normalize('NFC') : value;
  };
  const expectedWords = readingWords(reference);
  const heardWords = readingWords(spoken);
  const expected = expectedWords.map(normalize);
  const heard = heardWords.map(normalize);
  let expectedIndex = 0;
  // Process every word in a speech update immediately, but never award
  // progress for an expected word that is missing from the transcript.
  for (let index = 0; index < heard.length && expectedIndex < expected.length; index += 1) {
    const word = heard[index];
    if (word === expected[expectedIndex]) {
      expectedIndex += 1;
      continue;
    }
    if (language !== 'FIL') continue;
    // Match only explicit hyphenation/contractions, not arbitrary similar words.
    const parts = expectedWords[expectedIndex].split(/[-'’]/).map(normalize);
    if (parts.length > 1 && parts.every((part, offset) => part === heard[index + offset])) {
      expectedIndex += 1;
      index += parts.length - 1;
      continue;
    }
    const spokenParts = heardWords[index].split(/[-'’]/).map(normalize);
    if (spokenParts.length > 1 && spokenParts.every((part, offset) => part === expected[expectedIndex + offset])) {
      expectedIndex += spokenParts.length;
    }
  }
  return Math.min(expectedIndex, expected.length);
}

