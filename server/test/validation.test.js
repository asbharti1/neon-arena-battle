import test from 'node:test';
import assert from 'node:assert/strict';
import { clampInput, cleanName, isRoomCode } from '../src/validation.js';

test('input validation rejects forged numbers and normalizes bounded movement and aim', () => {
  assert.equal(clampInput({ x: NaN, z: 0, aimX: 1, aimZ: 0 }), null);
  assert.equal(clampInput({ x: 9, z: 0, aimX: 1, aimZ: 0 }), null);
  assert.ok(Math.abs(clampInput({ x: 1, z: 1, aimX: 2, aimZ: 0 }).x - Math.SQRT1_2) < 1e-12);
  assert.equal(clampInput({ x: 0, z: 0, aimX: 0, aimZ: 0 }), null);
});

test('names and room codes are sanitized and bounded', () => {
  assert.equal(cleanName('<Neo>\u0000 Pilot'), 'Neo Pilot');
  assert.equal(cleanName('A'.repeat(30)).length, 18);
  assert.equal(isRoomCode('AB234'), true); assert.equal(isRoomCode('ABOIL'), false);
});
