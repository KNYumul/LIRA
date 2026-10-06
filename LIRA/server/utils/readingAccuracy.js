// Word statistics count story-word occurrences, including incorrect/skipped
// occurrences in `retries`. Repeated words must count separately in the score.
function calculateReadingAccuracy(pages, wordStats) {
  const occurrences = new Map();
  let total = 0;
  for (const page of pages) {
    for (const word of String(page.text || '').match(/[\p{L}\p{N}]+(?:['\u2019-][\p{L}\p{N}]+)*/gu) || []) {
      const key = word.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
      occurrences.set(key, (occurrences.get(key) || 0) + 1);
      total += 1;
    }
  }
  if (!total || !wordStats.length) return null;
  const correct = wordStats.reduce((sum, stat) =>
    sum + Math.min(occurrences.get(stat.word) || 0, Math.max(0, stat.attempts - stat.retries)), 0);
  return Math.round(correct / total * 100);
}

module.exports = { calculateReadingAccuracy };
