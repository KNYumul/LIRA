import { normalizedWord } from './readingTracking.js';

export function wordHeatmap(students, storyId) {
  const words = new Map();
  for (const student of students) {
    const result = student.storyResults.find((result) => String(result.storyId) === String(storyId) && result.selectedForAverage);
    for (const stat of result?.readingWordStats || []) {
      const key = normalizedWord(stat.word);
      const entry = words.get(key) || { readers: 0, struggling: 0 };
      entry.readers += 1;
      entry.struggling += stat.retries > 0 ? 1 : 0;
      words.set(key, entry);
    }
  }
  return words;
}

export function heatLevel(stat) {
  if (!stat?.readers) return 'none';
  const rate = stat.struggling / stat.readers;
  return rate === 0 ? 'easy' : rate <= 0.25 ? 'low' : rate <= 0.5 ? 'medium' : 'high';
}
