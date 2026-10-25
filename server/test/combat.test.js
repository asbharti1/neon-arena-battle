import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { dodge, eliminate, fire, movePlayer, resetForRematch, stepRoom } from '../src/combat.js';

function roomOf(phase = 'active') {
  const a = { id: 'a', name: 'A', x: 0, z: 0, hp: 100, score: 0, alive: true, ready: false, aimX: 1, aimZ: 0, input: { x: 0, z: 0 }, nextFireAt: 0, nextDodgeAt: 0, dodgeUntil: 0, dodgeX: 0, dodgeZ: 0, protectedUntil: 0, respawnAt: null, kills: 0, deaths: 0 };
  const b = { ...a, id: 'b', name: 'B', x: 2.1, z: 0, aimX: -1, aimZ: 0 };
  return { phase, players: new Map([['a', a], ['b', b]]), projectiles: [], endsAt: 100000, countdownEndsAt: null, suddenDeath: false, winnerId: null };
}

test('movement is delta-time based and stays inside arena boundaries', () => {
  const room = roomOf(); const player = room.players.get('a'); player.x = CONFIG.arenaRadius;
  player.input = { x: 1, z: 0 }; movePlayer(player, 1000, 0, room);
  assert.ok(player.x <= CONFIG.arenaRadius - CONFIG.playerRadius + 1e-9);
  assert.ok(player.x > 0);
});

test('fire has server cooldown and rejects inactive or invalid shooter state', () => {
  const room = roomOf(); const player = room.players.get('a');
  assert.equal(fire(room, player, 1000), true); assert.equal(room.projectiles.length, 1);
  assert.equal(fire(room, player, 1200), false); assert.equal(fire(room, player, 1500), true);
  room.phase = 'lobby'; assert.equal(fire(room, player, 2200), false);
  assert.equal(fire(room, null, 3000), false);
});

test('server projectiles deal fixed damage, cap health, award score, and end at five', () => {
  const room = roomOf(); const a = room.players.get('a'); const b = room.players.get('b'); a.score = 4;
  assert.equal(fire(room, a, 10), true);
  const events = stepRoom(room, 50, 60);
  assert.equal(b.hp, 66); assert.equal(b.alive, true); assert.ok(events.some((event) => event.type === 'hit'));
  b.x = 2.1; b.hp = 34; a.nextFireAt = 0; a.score = 4;
  fire(room, a, 1000); const lethal = stepRoom(room, 50, 1050);
  assert.equal(b.hp, 0); assert.equal(b.alive, false); assert.equal(a.score, 5);
  assert.equal(room.phase, 'ended'); assert.equal(room.winnerId, 'a'); assert.ok(lethal.some((event) => event.type === 'elimination'));
});

test('elimination prevents repeated scoring and schedules a full-health protected respawn', () => {
  const room = roomOf(); const victim = room.players.get('b'); const attacker = room.players.get('a');
  assert.ok(eliminate(room, victim, attacker, 200)); assert.equal(attacker.score, 1);
  assert.equal(eliminate(room, victim, attacker, 201), null); assert.equal(attacker.score, 1);
  room.phase = 'active'; const events = stepRoom(room, 50, 200 + CONFIG.respawnDelayMs);
  assert.equal(victim.alive, true); assert.equal(victim.hp, CONFIG.maxHealth); assert.ok(victim.protectedUntil > 0); assert.ok(events.some((event) => event.type === 'respawn'));
});

test('spawn protection prevents incoming damage and dodge is bounded by a cooldown', () => {
  const room = roomOf(); const a = room.players.get('a'); const b = room.players.get('b');
  b.protectedUntil = 5000; fire(room, a, 10); stepRoom(room, 100, 110); assert.equal(b.hp, 100);
  assert.equal(dodge(a, { x: 4, z: 0 }, 1000), false);
  assert.equal(dodge(a, { x: 1, z: 0 }, 1000), true); assert.equal(dodge(a, { x: 0, z: 1 }, 1100), false);
});

test('timer picks a sole leader and ties enter sudden death, resolved by the next elimination', () => {
  const room = roomOf(); const a = room.players.get('a'); const b = room.players.get('b'); room.endsAt = 1000; a.score = 2;
  stepRoom(room, 50, 1000); assert.equal(room.phase, 'ended'); assert.equal(room.winnerId, 'a');
  room.phase = 'active'; room.winnerId = null; room.endsAt = 2000; b.score = 2;
  const events = stepRoom(room, 50, 2000); assert.equal(room.suddenDeath, true); assert.ok(events.some((event) => event.type === 'sudden-death'));
  eliminate(room, b, a, 2100); assert.equal(room.phase, 'ended'); assert.equal(room.winnerId, 'a');
});

test('rematch resets scores, status, and projectiles for the same room', () => {
  const room = roomOf('ended'); room.players.get('a').score = 4; room.projectiles.push({ id: 'x' }); room.winnerId = 'a';
  resetForRematch(room); assert.equal(room.phase, 'lobby'); assert.equal(room.players.get('a').score, 0); assert.equal(room.projectiles.length, 0); assert.equal(room.winnerId, null);
});
