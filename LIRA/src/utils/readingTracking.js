export function readingWords(text) {
  return String(text || '').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || [];
}

export function normalizedWord(word) {
  return String(word || '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

const englishNumberWords = new Map([
  ...['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen'].map((word, number) => [word, String(number)]),
  ...['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
    .map((word, index) => [word, String((index + 2) * 10)]),
]);

const filipinoNumberWords = new Map([
  ['sero', '0'], ['zero', '0'],
  ['isa', '1'], ['isang', '1'],
  ['dalawa', '2'], ['dalawang', '2'],
  ['tatlo', '3'], ['tatlong', '3'],
  ['apat', '4'],
  ['lima', '5'], ['limang', '5'],
  ['anim', '6'],
  ['pito', '7'], ['pitong', '7'],
  ['walo', '8'], ['walong', '8'],
  ['siyam', '9'],
  ['sampu', '10'], ['sampung', '10'],
]);

function normalizeReadingWord(word, language) {
  const value = normalizedWord(word);
  // Match number words when speech transcripts format them as digits.
  if (language === 'ENG') return englishNumberWords.get(value) ?? value;
  // Written stress marks are normally absent from speech transcripts. Keep ñ.
  if (language === 'FIL') {
    const unaccented = value.normalize('NFD').replace(/[\u0300\u0301\u0302]/g, '').normalize('NFC');
    return filipinoNumberWords.get(unaccented) ?? unaccented;
  }
  return value;
}

export function matchedWordCount(reference, spoken, language = 'ENG') {
  const normalize = (word) => normalizeReadingWord(word, language);
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

// Align speech to a prefix of the remaining story. Unspoken trailing words are
// not errors; substitutions and omissions before later speech are errors.
export function readingProgress(reference, spoken, language = 'ENG', incorrectSpokenWordIndices = []) {
  const expected = Array.isArray(reference) ? reference : readingWords(reference);
  const heard = readingWords(spoken);
  const spokenErrors = new Set(incorrectSpokenWordIndices);
  if (!expected.length || !heard.length) return { count: 0, incorrectWordIndices: [] };
  // Normalize once per word, not once per cell of the alignment matrix.
  const expectedKeys = expected.map((word) => normalizeReadingWord(word, language));
  const heardKeys = heard.map((word) => normalizeReadingWord(word, language));
  const heardLiteralKeys = heard.map(normalizedWord);
  const expectedParts = language === 'FIL' ? expected.map((word) => readingWords(word.replace(/[-'’]/g, ' '))) : [];
  const heardParts = language === 'FIL' ? heard.map((word) => readingWords(word.replace(/[-'’]/g, ' '))) : [];
  const rows = Array.from({ length: expected.length + 1 }, () =>
    Array.from({ length: heard.length + 1 }, () => ({ cost: Infinity })));
  rows[0][0] = { cost: 0 };
  const update = (i, j, nextI, nextJ, cost, wrong = []) => {
    const total = rows[i][j].cost + cost;
    if (total < rows[nextI][nextJ].cost) {
      rows[nextI][nextJ] = { cost: total, previous: [i, j], wrong };
    }
  };
  for (let i = 0; i <= expected.length; i += 1) {
    for (let j = 0; j <= heard.length; j += 1) {
      if (i < expected.length && j < heard.length) {
        const matches = expectedKeys[i] === heardKeys[j];
        // Pronunciation errors affect feedback, not the transcript alignment.
        update(i, j, i + 1, j + 1, matches ? 0 : 1, matches && !spokenErrors.has(j) ? [] : [i]);
        if (language === 'FIL') {
          const expectedPartCount = expectedParts[i].length;
          const heardPartCount = heardParts[j].length;
          if (expectedPartCount > 1 && j + expectedPartCount <= heard.length
            && matchedWordCount(expected[i], heard.slice(j, j + expectedPartCount).join(' '), language) === 1) {
            update(i, j, i + 1, j + expectedPartCount, 0);
          }
          if (heardPartCount > 1 && i + heardPartCount <= expected.length
            && matchedWordCount(expected.slice(i, i + heardPartCount).join(' '), heard[j], language) === heardPartCount) {
            update(i, j, i + heardPartCount, j + 1, 0);
          }
        }
      }
      if (i < expected.length) update(i, j, i + 1, j, 1, [i]);
      if (j < heard.length) {
        const repeated = j > 0 && heardLiteralKeys[j] === heardLiteralKeys[j - 1];
        update(i, j, i, j + 1, repeated ? 0 : 1.1);
      }
    }
  }
  let count = 0;
  for (let i = 1; i <= expected.length; i += 1) {
    if (rows[i][heard.length].cost < rows[count][heard.length].cost) count = i;
  }
  const incorrectWordIndices = [];
  let i = count;
  let j = heard.length;
  while (rows[i][j].previous) {
    incorrectWordIndices.push(...rows[i][j].wrong);
    [i, j] = rows[i][j].previous;
  }
  return { count, incorrectWordIndices: incorrectWordIndices.sort((a, b) => a - b) };
}

export function assessedReadingProgress(reference, transcript, language, detailedJson) {
  let details;
  try {
    details = JSON.parse(detailedJson);
  } catch {
    return readingProgress(reference, transcript, language);
  }
  const assessedWords = details?.NBest?.[0]?.Words;
  if (language !== 'ENG' || !Array.isArray(assessedWords) || !assessedWords.length) {
    return readingProgress(reference, transcript, language);
  }
  const spoken = [];
  const incorrect = [];
  for (const entry of assessedWords) {
    // An omitted reference word is not speech. Alignment marks omissions only
    // when later spoken words establish that the reader has moved past them.
    const error = entry.PronunciationAssessment?.ErrorType;
    if (error === 'Omission') continue;
    const tokens = readingWords(entry.Word);
    if (error === 'Mispronunciation') {
      incorrect.push(...tokens.map((_, index) => spoken.length + index));
    }
    spoken.push(...tokens);
  }
  return spoken.length
    ? readingProgress(reference, spoken.join(' '), language, incorrect)
    : readingProgress(reference, transcript, language);
}

