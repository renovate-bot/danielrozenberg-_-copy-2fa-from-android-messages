import assert from 'node:assert/strict';
import { test } from 'node:test';

import { extractCode } from './extract-code.ts';

void test('extracts the code after a colon', () => {
  assert.equal(extractCode('Your code: 1234'), '1234');
  assert.equal(extractCode('Your code is: 12345678'), '12345678');
});

void test('takes the first number when there are several', () => {
  assert.equal(
    extractCode('Your code: 482910. Expires in 10 min. Ref 2025'),
    '482910',
  );
  assert.equal(
    extractCode('Your code is: 123456. Call 1-800-555-1234 if not you'),
    '123456',
  );
});

void test('ignores numbers that are too short or too long', () => {
  assert.equal(extractCode('Your code: 123'), undefined);
  assert.equal(extractCode('Your code: 123456789'), undefined);
});

void test('ignores messages without a colon', () => {
  assert.equal(extractCode('123456 is your code'), undefined);
});
