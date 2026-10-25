import { stepRoom } from './combat.js';
import { CONFIG } from './config.js';

export function startGameLoop(manager, io, { now = () => Date.now(), intervalMs = CONFIG.tickMs } = {}) {
  let previous = now();
  const timer = setInterval(() => {
    const current = now();
    const delta = Math.min(100, Math.max(0, current - previous));
    previous = current;
    for (const room of manager.rooms.values()) {
      for (const event of stepRoom(room, delta, current)) io.to(room.code).emit('game:event', event);
      io.to(room.code).emit('game:state', { ...manager.publicRoom(room), projectiles: room.projectiles.map(({ id, ownerId, x, z, vx, vz }) => ({ id, ownerId, x, z, vx, vz })) });
    }
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
