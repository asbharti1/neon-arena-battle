import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { RoomManager } from './rooms.js';
import { startGameLoop } from './gameLoop.js';
import { clampInput, isRoomCode } from './validation.js';
import { dodge, fire, resetForRematch } from './combat.js';

export function createGameServer({ port = Number(process.env.PORT) || 3001, origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173', logger = console, startLoop = true } = {}) {
  const app = express();
  const allowedOrigins = new Set(origin.split(',').map((entry) => entry.trim()));
  app.use(cors({ origin: [...allowedOrigins], credentials: false }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'neon-arena-server' }));
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: [...allowedOrigins], methods: ['GET', 'POST'] }, allowRequest: (req, callback) => { const requestOrigin = req.headers.origin; callback(null, !requestOrigin || allowedOrigins.has(requestOrigin)); }, pingInterval: 10000, pingTimeout: 20000, maxHttpBufferSize: 1e5 });
  const manager = new RoomManager();
  const stopLoop = startLoop ? startGameLoop(manager, io) : () => {};
  const emitRoom = (room) => { if (room) io.to(room.code).emit('room:update', manager.publicRoom(room)); };
  const success = (ack, payload) => { if (typeof ack === 'function') ack({ ok: true, ...payload }); };
  const failure = (ack, message) => { if (typeof ack === 'function') ack({ ok: false, error: message }); };
  const asRecord = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

  io.on('connection', (socket) => {
    const lastSensitiveAt = new Map();
    const allowSensitive = (key) => {
      const now = Date.now();
      if (now - (lastSensitiveAt.get(key) ?? 0) < 30) return false;
      lastSensitiveAt.set(key, now);
      return true;
    };
    socket.on('room:create', (data, ack) => {
      if (!allowSensitive('room:create')) return failure(ack, 'Too many requests.');
      const { name } = asRecord(data);
      const result = manager.create(socket.id, name);
      if (result.error) return failure(ack, result.error);
      socket.join(result.room.code); success(ack, result); emitRoom(manager.roomFor(socket.id));
    });
    socket.on('room:join', (data, ack) => {
      if (!allowSensitive('room:join')) return failure(ack, 'Too many requests.');
      const { code, name } = asRecord(data);
      const result = manager.join(socket.id, code, name);
      if (result.error) return failure(ack, result.error);
      socket.join(result.room.code); success(ack, result); emitRoom(manager.roomFor(socket.id));
    });
    socket.on('room:ready', (data, ack) => {
      if (!allowSensitive('room:ready')) return failure(ack, 'Too many requests.');
      const { ready } = asRecord(data);
      const room = manager.roomFor(socket.id);
      const updated = manager.setReady(socket.id, ready);
      if (!updated) return failure(ack, 'Ready status is unavailable now.');
      success(ack, { room: updated }); emitRoom(room);
    });
    socket.on('room:start', (_data, ack) => {
      if (!allowSensitive('room:start')) return failure(ack, 'Too many requests.');
      const result = manager.start(socket.id);
      if (result.error) return failure(ack, result.error);
      success(ack, result); emitRoom(manager.roomFor(socket.id));
    });
    socket.on('room:rematch', (_data, ack) => {
      if (!allowSensitive('room:rematch')) return failure(ack, 'Too many requests.');
      const room = manager.roomFor(socket.id);
      if (!room || room.phase !== 'ended' || room.hostId !== socket.id) return failure(ack, 'Only the host can return this finished room to its lobby.');
      resetForRematch(room); success(ack, { room: manager.publicRoom(room) }); emitRoom(room);
    });
    socket.on('room:leave', (_data, ack) => {
      const left = manager.leave(socket.id);
      if (!left) return failure(ack, 'You are not in a room.');
      socket.leave(left.code); success(ack, { left: true }); if (left.room) io.to(left.code).emit('room:update', left.room);
    });
    socket.on('game:input', (data) => {
      const room = manager.roomFor(socket.id); const player = room?.players.get(socket.id);
      const input = clampInput(data);
      if (!input || !player || room.phase !== 'active' || !allowInput(player)) return;
      player.input = { x: input.x, z: input.z }; player.aimX = input.aimX; player.aimZ = input.aimZ; player.lastInputAt = Date.now();
    });
    socket.on('game:fire', (_data, ack) => {
      if (!allowSensitive('game:fire')) return failure(ack, 'Too many requests.');
      const room = manager.roomFor(socket.id); const player = room?.players.get(socket.id);
      if (!fire(room, player, Date.now())) return failure(ack, 'Weapon is cooling down or match is inactive.');
      success(ack, { fired: true });
    });
    socket.on('game:dodge', (data, ack) => {
      if (!allowSensitive('game:dodge')) return failure(ack, 'Too many requests.');
      const { x, z } = asRecord(data);
      const room = manager.roomFor(socket.id); const player = room?.players.get(socket.id);
      if (room?.phase !== 'active' || !dodge(player, { x, z }, Date.now())) return failure(ack, 'Dodge is cooling down or direction is invalid.');
      success(ack, { dodged: true });
    });
    socket.on('disconnect', () => { const left = manager.leave(socket.id); if (left?.room) io.to(left.code).emit('room:update', left.room); });
  });

  function allowInput(player) {
    const now = Date.now();
    if (now - player.lastInputAt < 28) return false;
    return true;
  }
  return { app, server, io, manager, port, stopLoop, listen: () => new Promise((resolve) => server.listen(port, '0.0.0.0', () => resolve(server.address().port))), close: async () => { stopLoop(); await new Promise((resolve) => io.close(resolve)); } };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const game = createGameServer();
  game.listen().then((port) => console.log(`Neon Arena server listening on ${port}`));
  const shutdown = async () => { await game.close(); process.exit(0); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}
