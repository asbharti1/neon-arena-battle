import { randomInt } from 'node:crypto';
import { CONFIG } from './config.js';
import { cleanName, isRoomCode } from './validation.js';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class RoomManager {
  constructor({ now = () => Date.now(), codeFactory } = {}) {
    this.rooms = new Map();
    this.playerRooms = new Map();
    this.now = now;
    this.codeFactory = codeFactory ?? (() => Array.from({ length: 5 }, () => alphabet[randomInt(alphabet.length)]).join(''));
  }

  create(socketId, rawName) {
    const name = cleanName(rawName);
    if (!name) return { error: 'Enter a name with at least one visible character.' };
    if (this.playerRooms.has(socketId)) return { error: 'You are already in a room.' };
    let code;
    for (let tries = 0; tries < 20; tries += 1) {
      const candidate = this.codeFactory();
      if (isRoomCode(candidate) && !this.rooms.has(candidate)) { code = candidate; break; }
    }
    if (!code) return { error: 'Could not create a room. Please try again.' };
    const room = { code, hostId: socketId, phase: 'lobby', countdownEndsAt: null, endsAt: null, suddenDeath: false, winnerId: null, players: new Map(), projectiles: [] };
    this.rooms.set(code, room);
    this._addPlayer(room, socketId, name);
    return { room: this.publicRoom(room), playerId: socketId };
  }

  join(socketId, rawCode, rawName) {
    const code = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';
    const name = cleanName(rawName);
    if (!name) return { error: 'Enter a name with at least one visible character.' };
    if (!isRoomCode(code) || !this.rooms.has(code)) return { error: 'Room not found. Check the five-character code.' };
    if (this.playerRooms.has(socketId)) return { error: 'You are already in a room.' };
    const room = this.rooms.get(code);
    if (room.phase !== 'lobby') return { error: 'This match has already started.' };
    if (room.players.size >= CONFIG.maxPlayers) return { error: 'This room is full (4 players maximum).' };
    this._addPlayer(room, socketId, name);
    return { room: this.publicRoom(room), playerId: socketId };
  }

  _addPlayer(room, id, name, isBot = false) {
    const idx = room.players.size;
    const angle = (Math.PI * 2 * idx) / CONFIG.maxPlayers;
    room.players.set(id, { id, name, isBot: Boolean(isBot), x: Math.cos(angle) * 9, z: Math.sin(angle) * 9, aimX: 0, aimZ: -1, hp: CONFIG.maxHealth, score: 0, ready: Boolean(isBot), alive: true, respawnAt: null, protectedUntil: 0, nextFireAt: 0, nextDodgeAt: 0, dodgeUntil: 0, dodgeX: 0, dodgeZ: 0, input: { x: 0, z: 0 }, lastInputAt: 0, kills: 0, deaths: 0 });
    this.playerRooms.set(id, room.code);
  }

  addBot(hostId) {
    const room = this.roomFor(hostId);
    if (!room) return { error: 'Room not found.' };
    if (room.hostId !== hostId) return { error: 'Only the host can add bots.' };
    if (room.phase !== 'lobby') return { error: 'Bots can only be added in the lobby.' };
    if (room.players.size >= CONFIG.maxPlayers) return { error: 'Room is full (4 players max).' };
    const botNames = ['NEXUS-AI', 'CYBER-BOT', 'VAPOR-99', 'APEX-UNIT'];
    const usedNames = new Set([...room.players.values()].map((p) => p.name));
    const name = botNames.find((n) => !usedNames.has(n)) || `BOT-${room.players.size + 1}`;
    const botId = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this._addPlayer(room, botId, name, true);
    return { room: this.publicRoom(room) };
  }

  removeBot(hostId, botId) {
    const room = this.roomFor(hostId);
    if (!room) return { error: 'Room not found.' };
    if (room.hostId !== hostId) return { error: 'Only the host can remove bots.' };
    if (room.phase !== 'lobby') return { error: 'Bots can only be removed in the lobby.' };
    const bot = room.players.get(botId);
    if (!bot || !bot.isBot) return { error: 'Bot not found.' };
    room.players.delete(botId);
    this.playerRooms.delete(botId);
    return { room: this.publicRoom(room) };
  }

  setReady(id, ready) {
    const room = this.roomFor(id);
    if (!room || room.phase !== 'lobby' || typeof ready !== 'boolean') return null;
    room.players.get(id).ready = ready;
    return this.publicRoom(room);
  }

  start(id) {
    const room = this.roomFor(id);
    if (!room) return { error: 'Join a room first.' };
    if (room.hostId !== id) return { error: 'Only the room host can start the match.' };
    if (room.phase !== 'lobby') return { error: 'The match is already underway.' };
    if (room.players.size < 2) return { error: 'At least two players are needed.' };
    if ([...room.players.values()].some((p) => !p.ready)) return { error: 'Everyone must be ready before the match starts.' };
    room.phase = 'countdown';
    room.countdownEndsAt = this.now() + CONFIG.countdownMs;
    for (const p of room.players.values()) p.ready = false;
    return { room: this.publicRoom(room) };
  }

  leave(id) {
    const code = this.playerRooms.get(id);
    const room = code ? this.rooms.get(code) : null;
    if (!room) return null;
    const player = room.players.get(id);
    room.players.delete(id);
    this.playerRooms.delete(id);
    if (!room.players.size) { this.rooms.delete(code); return { code, deleted: true, player }; }
    room.projectiles = room.projectiles.filter((p) => p.ownerId !== id);
    if (room.hostId === id) room.hostId = room.players.keys().next().value;
    if (room.phase === 'active' && room.players.size === 1) this.finish(room, room.players.keys().next().value, 'opponent-left');
    if (room.phase === 'countdown' && room.players.size < 2) { room.phase = 'lobby'; room.countdownEndsAt = null; }
    return { code, deleted: false, player, room: this.publicRoom(room) };
  }

  roomFor(id) { const code = this.playerRooms.get(id); return code ? this.rooms.get(code) ?? null : null; }

  finish(room, winnerId, reason) {
    room.phase = 'ended'; room.winnerId = winnerId; room.endedReason = reason;
  }

  publicRoom(room) {
    return { code: room.code, hostId: room.hostId, phase: room.phase, countdownEndsAt: room.countdownEndsAt, endsAt: room.endsAt, suddenDeath: room.suddenDeath, winnerId: room.winnerId, players: [...room.players.values()].map(({ id, name, isBot, ready, score, hp, alive, x, z, aimX, aimZ, protectedUntil, kills, deaths }) => ({ id, name, isBot: Boolean(isBot), ready, score, hp, alive, x, z, aimX, aimZ, protectedUntil, kills, deaths })) };
  }
}
