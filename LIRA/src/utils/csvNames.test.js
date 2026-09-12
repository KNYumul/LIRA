import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCsvLastName, findCsvNameColumn } from './csvNames.js';

test('prefers an explicit surname column over full and given names', () => {
  assert.deepEqual(findCsvNameColumn(['fullname', 'firstname', 'lastname', 'middlename']), { index: 2, fullName: false });
  assert.deepEqual(findCsvNameColumn(['firstname', 'middlename']), { index: -1, fullName: true });
  assert.deepEqual(findCsvNameColumn(['birthdate', 'name']), { index: 1, fullName: true });
});

test('extracts both full-name orders and preserves compound surnames', () => {
  assert.equal(extractCsvLastName('Dela Cruz, Juan Santos', true), 'Dela Cruz');
  assert.equal(extractCsvLastName('Juan Santos Reyes', true), 'Reyes');
  assert.equal(extractCsvLastName('Juan Santos De la Cruz', true), 'De la Cruz');
  assert.equal(extractCsvLastName('Juan Santos Dela Cruz Jr.', true), 'Dela Cruz');
  assert.equal(extractCsvLastName('  Juan   Santos Reyes  ', true), 'Reyes');
  assert.equal(extractCsvLastName('Reyes', true), 'Reyes');
  assert.equal(extractCsvLastName(undefined, true), '');
});

test('keeps explicit surnames intact but recognizes a comma-delimited full name', () => {
  assert.equal(extractCsvLastName('Santos Reyes'), 'Santos Reyes');
  assert.equal(extractCsvLastName('De la Cruz'), 'De la Cruz');
  assert.equal(extractCsvLastName('Reyes, Juan Santos'), 'Reyes');
});
