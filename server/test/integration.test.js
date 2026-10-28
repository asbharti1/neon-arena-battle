import test from 'node:test';
import assert from 'node:assert/strict';
import { io as createClient } from 'socket.io-client';
import { createGameServer } from '../src/index.js';

const connect = (url) => new Promise((resolve, reject) => {
  const client = createClient(url, { transports: ['polling', 'websocket'], reconnection: false, timeout: 3000 });
  client.once('connect', () => resolve(client)); client.once('connect_error', reject);
});
const once = (client, event, timeout = 2500) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { client.off(event, handler); reject(new Error(`Timed out waiting for ${event}`)); }, timeout);
  const handler = (value) => { clearTimeout(timer); resolve(value); }; client.once(event, handler);
});
const act = (client, event, payload = {}) => new Promise((resolve) => client.emit(event, payload, resolve));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('two independent Socket.IO clients share room state, server actions, and disconnect cleanup', async (t) => {
  const game = createGameServer({ port: 0, origin: 'http://localhost:5173', startLoop: true, logger: { error() {} } });
  let one; let two;
  t.after(async () => { one?.disconnect(); two?.disconnect(); await game.close(); });
  const port = await game.listen(); const url = `http://127.0.0.1:${port}`; one = await connect(url); two = await connect(url);
  const health = await fetch(`${url}/health`); assert.equal(health.status, 200); assert.equal((await health.json()).status, 'ok');

  const malformed = await act(one, 'room:create', null); assert.equal(malformed.ok, false, 'null payload is rejected without crashing the socket handler'); await wait(35);
  const p1 = await act(one, 'room:create', { name: 'Pilot One' }); assert.equal(p1.ok, true);
  const p2Update = once(two, 'room:update'); const p2 = await act(two, 'room:join', { code: p1.room.code, name: 'Pilot Two' }); assert.equal(p2.ok, true);
  const membership = await p2Update; assert.equal(membership.players.length, 2); assert.equal(p1.room.code, p2.room.code);
  await act(one, 'room:ready', { ready: true }); await act(two, 'room:ready', { ready: true });
  const started = await act(one, 'room:start'); assert.equal(started.ok, true);
  const firstState = once(one, 'game:state'); const secondState = once(two, 'game:state');
  const [state1, state2] = await Promise.all([firstState, secondState]); assert.deepEqual(state1.players.map((p) => p.id), state2.players.map((p) => p.id));

  await wait(3200); const invalidMove = { x: 99, z: 0, aimX: 1, aimZ: 0 };
  one.emit('game:input', invalidMove); one.emit('game:hit', { victimId: two.id, damage: 1000, score: 99 });
  const before = game.manager.roomFor(one.id).players.get(one.id).x; await wait(180);
  assert.equal(game.manager.roomFor(one.id).players.get(one.id).x, before, 'forged movement has no effect');
  assert.equal(game.manager.roomFor(two.id).players.get(two.id).hp, 100, 'forged hit has no effect');
  const moveSnapshotOne = once(one, 'game:state'); const moveSnapshotTwo = once(two, 'game:state');
  one.emit('game:input', { x: 1, z: 0, aimX: 1, aimZ: 0 });
  await wait(120);
  const movedX = game.manager.roomFor(one.id).players.get(one.id).x; assert.ok(movedX > before, 'valid movement advances on the server');
  const [moveStateOne, moveStateTwo] = await Promise.all([moveSnapshotOne, moveSnapshotTwo]);
  assert.equal(moveStateOne.players.find((p) => p.id === one.id).x, moveStateTwo.players.find((p) => p.id === one.id).x, 'both clients see the same authoritative position');

  const shooter = game.manager.roomFor(one.id).players.get(one.id); const target = game.manager.roomFor(two.id).players.get(two.id);
  shooter.x = 0; shooter.z = 0; shooter.input = { x: 0, z: 0 }; shooter.aimX = 1; shooter.aimZ = 0;
  target.x = 2.1; target.z = 0; target.input = { x: 0, z: 0 }; target.protectedUntil = 0;
  const hitOne = once(one, 'game:event'); const hitTwo = once(two, 'game:event');
  const stateAfterShotOne = once(one, 'game:state'); const stateAfterShotTwo = once(two, 'game:state');
  const fired = await act(one, 'game:fire'); assert.equal(fired.ok, true);
  assert.equal(game.manager.roomFor(one.id).projectiles.length, 1, 'accepted shot creates a server projectile');
  const [eventOne, eventTwo] = await Promise.all([hitOne, hitTwo]); assert.equal(eventOne.type, 'hit'); assert.deepEqual(eventOne, eventTwo);
  const [stateShotOne, stateShotTwo] = await Promise.all([stateAfterShotOne, stateAfterShotTwo]);
  assert.equal(stateShotOne.players.find((p) => p.id === two.id).hp, 66); assert.equal(stateShotTwo.players.find((p) => p.id === two.id).hp, 66);
  const tooFast = await act(one, 'game:fire'); assert.equal(tooFast.ok, false, 'cooldown rejects an immediate second shot');
  two.disconnect(); await wait(120);
  const remaining = game.manager.roomFor(one.id); assert.equal(remaining.players.size, 1); assert.equal(remaining.phase, 'ended');
});
