export function groupStoryAttempts(attempts) {
  const groups = new Map();
  for (const attempt of attempts) {
    const key = String(attempt.storyId ?? attempt.storyTitle);
    if (!groups.has(key)) {
      groups.set(key, { key, title: attempt.storyTitle, attempts: [] });
    }
    groups.get(key).attempts.push(attempt);
  }
  return [...groups.values()].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
}

export function sortStoryAttempts(attempts, key, direction) {
  const valueOf = (attempt) => {
    if (key === 'percentage' && !(attempt.total > 0)) return null;
    const raw = attempt[key];
    if (raw == null || raw === '') return null;
    const value = key === 'completedAt' ? new Date(raw).getTime() : Number(raw);
    return Number.isFinite(value) ? value : null;
  };

  return [...attempts].sort((a, b) => {
    const left = valueOf(a);
    const right = valueOf(b);
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    return (left - right) * (direction === 'asc' ? 1 : -1);
  });
}
