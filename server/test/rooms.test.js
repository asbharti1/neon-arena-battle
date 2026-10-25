import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomManager } from '../src/rooms.js';

const managerWithCodes = (...codes) => { let i = 0; return new RoomManager({ now: () => 1000, codeFactory: () => codes[i++] || `Z${String(i).padStart(4, '0')}` }); };

test('creates unique readable rooms and sanitizes player names', () => {
  const manager = managerWithCodes('ABCDE', 'FGHJK');
  const room = manager.create('p1', '<Pilot>   One');
  assert.equal(room.room.code, 'ABCDE');
  assert.equal(room.room.players[0].name, 'Pilot One');
  assert.equal(manager.create('p2', 'Pilot').room.code, 'FGHJK');
  assert.equal(manager.create('p3', ' < > ').error, 'Enter a name with at least one visible character.');
});

test('joins only valid lobby rooms, rejects duplicates and enforces the four pilot limit', () => {
  const manager = managerWithCodes('ABCDE'); manager.create('p1', 'One');
  assert.match(manager.join('p2', 'nope!', 'Two').error, /Room not found/);
  assert.equal(manager.join('p2', 'abcde', 'Two').room.players.length, 2);
  assert.match(manager.join('p2', 'ABCDE', 'Two').error, /already in a room/);
  manager.join('p3', 'ABCDE', 'Three'); manager.join('p4', 'ABCDE', 'Four');
  assert.match(manager.join('p5', 'ABCDE', 'Five').error, /full/);
});

test('one player cannot occupy multiple rooms and leaving cleans membership and reassigns host', () => {
  const manager = managerWithCodes('ABCDE', 'FGHJK'); manager.create('p1', 'One'); manager.create('p2', 'Two');
  assert.match(manager.join('p2', 'ABCDE', 'Two').error, /already in a room/);
  manager.join('p3', 'ABCDE', 'Three');
  const left = manager.leave('p1');
  assert.equal(left.room.hostId, 'p3'); assert.equal(manager.roomFor('p1'), null); assert.equal(manager.rooms.get('ABCDE').players.size, 1);
  manager.leave('p3'); assert.equal(manager.rooms.has('ABCDE'), false);
});

test('ready state and match start require a host, at least two players, and all players ready', () => {
  const manager = managerWithCodes('ABCDE'); manager.create('p1', 'One');
  assert.match(manager.start('p1').error, /two players/);
  manager.join('p2', 'ABCDE', 'Two');
  assert.match(manager.start('p2').error, /host/);
  manager.setReady('p1', true); assert.match(manager.start('p1').error, /Everyone/);
  manager.setReady('p2', true); assert.equal(manager.start('p1').room.phase, 'countdown');
});

test('disconnect during countdown returns a one-player room to lobby', () => {
  const manager = managerWithCodes('ABCDE'); manager.create('p1', 'One'); manager.join('p2', 'ABCDE', 'Two');
  manager.setReady('p1', true); manager.setReady('p2', true); manager.start('p1');
  const left = manager.leave('p2'); assert.equal(left.room.phase, 'lobby'); assert.equal(left.room.players.length, 1);
});
