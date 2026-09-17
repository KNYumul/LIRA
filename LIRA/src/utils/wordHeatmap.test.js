import test from 'node:test';
import assert from 'node:assert/strict';
import { heatLevel, wordHeatmap } from './wordHeatmap.js';

test('counts students once using only the selected attempt and story', () => {
  const attempt = (storyId, selectedForAverage, retries) => ({ storyId, selectedForAverage, readingWordStats: [{ word: 'Tree', attempts: 12, retries }] });
  const stats = wordHeatmap([
    { storyResults: [attempt('a', false, 0), attempt('a', true, 10), attempt('b', true, 0)] },
    { storyResults: [attempt('a', true, 0)] },
    { storyResults: [{ storyId: 'a', selectedForAverage: true }] },
  ], 'a');
  assert.deepEqual(stats.get('tree'), { readers: 2, struggling: 1 });
  assert.equal(heatLevel(stats.get('tree')), 'medium');
});

test('distinguishes unassessed words from successful readings and heat thresholds', () => {
  assert.equal(heatLevel(undefined), 'none');
  assert.equal(heatLevel({ readers: 4, struggling: 0 }), 'easy');
  assert.equal(heatLevel({ readers: 4, struggling: 1 }), 'low');
  assert.equal(heatLevel({ readers: 4, struggling: 2 }), 'medium');
  assert.equal(heatLevel({ readers: 4, struggling: 3 }), 'high');
});
