import test from 'node:test';
import assert from 'node:assert/strict';
import { groupStoryAttempts, sortStoryAttempts } from './storyAttemptSort.js';

test('groups by story identity alphabetically and retains the selected sort within groups', () => {
  const attempts = [
    { id: 'b-low', storyId: 'b', storyTitle: 'Bee', readingWpm: 10 },
    { id: 'a', storyId: 'a', storyTitle: 'Ant', readingWpm: 20 },
    { id: 'b-high', storyId: 'b', storyTitle: 'Bee', readingWpm: 30 },
    { id: 'other-bee', storyId: 'c', storyTitle: 'Bee', readingWpm: null },
  ];
  for (const direction of ['asc', 'desc']) {
    const groups = groupStoryAttempts(sortStoryAttempts(attempts, 'readingWpm', direction));
    assert.deepEqual(groups.map((g) => g.key), ['a', 'b', 'c']);
    assert.deepEqual(groups[1].attempts.map((a) => a.id), direction === 'asc' ? ['b-low', 'b-high'] : ['b-high', 'b-low']);
    assert.equal(groups[2].attempts[0].id, 'other-bee');
  }
  assert.deepEqual(attempts.map((a) => a.id), ['b-low', 'a', 'b-high', 'other-bee']);
  assert.deepEqual(groupStoryAttempts([]), []);
});

test('sorts scores numerically in both directions without changing the source', () => {
  for (const key of ['readingWpm', 'percentage', 'readingAccuracy']) {
    const attempts = [100, null, 9, 0].map((value) => ({ [key]: value, total: 10 }));
    assert.deepEqual(sortStoryAttempts(attempts, key, 'asc').map((a) => a[key]), [0, 9, 100, null]);
    assert.deepEqual(sortStoryAttempts(attempts, key, 'desc').map((a) => a[key]), [100, 9, 0, null]);
    assert.deepEqual(attempts.map((a) => a[key]), [100, null, 9, 0]);
  }
});

test('sorts dates by timestamp and puts missing or invalid dates last', () => {
  const attempts = [
    { id: 'later', completedAt: '2026-09-19T01:00:00Z' },
    { id: 'missing', completedAt: null },
    { id: 'earlier', completedAt: '2026-09-19T08:00:00+08:00' },
    { id: 'invalid', completedAt: 'invalid' },
  ];
  assert.deepEqual(sortStoryAttempts(attempts, 'completedAt', 'asc').map((a) => a.id), ['earlier', 'later', 'missing', 'invalid']);
  assert.deepEqual(sortStoryAttempts(attempts, 'completedAt', 'desc').map((a) => a.id), ['later', 'earlier', 'missing', 'invalid']);
});

test('keeps no-quiz attempts last and preserves order for equal scores', () => {
  const attempts = [
    { id: 'no-quiz', total: 0, percentage: 0 },
    { id: 'first', total: 10, percentage: 50 },
    { id: 'second', total: 4, percentage: 50 },
    { id: 'zero', total: 10, percentage: 0 },
  ];
  assert.deepEqual(sortStoryAttempts(attempts, 'percentage', 'asc').map((a) => a.id), ['zero', 'first', 'second', 'no-quiz']);
  assert.deepEqual(sortStoryAttempts(attempts, 'percentage', 'desc').map((a) => a.id), ['first', 'second', 'zero', 'no-quiz']);
});
