import { CONFIG } from './config.js';

export function movePlayer(player, deltaMs, now, room) {
  if (!player.alive || room.phase !== 'active') return;
  let { x, z } = player.input;
  if (now < player.dodgeUntil) { x = player.dodgeX; z = player.dodgeZ; }
  const speed = now < player.dodgeUntil ? CONFIG.dodgeSpeed : CONFIG.playerSpeed;
  player.x += x * speed * (deltaMs / 1000);
  player.z += z * speed * (deltaMs / 1000);
  const limit = CONFIG.arenaRadius - CONFIG.playerRadius;
  const distance = Math.hypot(player.x, player.z);
  if (distance > limit) { player.x *= limit / distance; player.z *= limit / distance; }
}

export function fire(room, player, now) {
  if (!player || !player.alive || room.phase !== 'active' || now < player.nextFireAt || Math.hypot(player.aimX, player.aimZ) < 0.5) return false;
  player.nextFireAt = now + CONFIG.fireCooldownMs;
  room.projectiles.push({ id: `${player.id}:${now}:${room.projectiles.length}`, ownerId: player.id, x: player.x + player.aimX * 0.9, z: player.z + player.aimZ * 0.9, vx: player.aimX * CONFIG.projectileSpeed, vz: player.aimZ * CONFIG.projectileSpeed, expiresAt: now + 1100 });
  return true;
}

export function dodge(player, direction, now) {
  if (!player || !player.alive || now < player.nextDodgeAt || !direction || !Number.isFinite(direction.x) || !Number.isFinite(direction.z)) return false;
  const length = Math.hypot(direction.x, direction.z);
  if (length < 0.1 || length > 1.5) return false;
  player.dodgeX = direction.x / length;
  player.dodgeZ = direction.z / length;
  player.dodgeUntil = now + CONFIG.dodgeDurationMs;
  player.nextDodgeAt = now + CONFIG.dodgeCooldownMs;
  return true;
}

export function eliminate(room, victim, attacker, now) {
  if (!victim.alive || now < victim.protectedUntil) return null;
  victim.alive = false;
  victim.hp = 0;
  victim.deaths += 1;
  victim.respawnAt = now + CONFIG.respawnDelayMs;
  let event = { type: 'elimination', victimId: victim.id, attackerId: attacker?.id ?? null };
  if (attacker && attacker.id !== victim.id) {
    attacker.score += 1;
    attacker.kills += 1;
    event = { ...event, score: attacker.score };
    if (attacker.score >= CONFIG.scoreToWin) {
      room.phase = 'ended';
      room.winnerId = attacker.id;
      room.endedReason = 'score-limit';
    } else if (room.suddenDeath) {
      room.phase = 'ended';
      room.winnerId = attacker.id;
      room.endedReason = 'sudden-death';
    }
  }
  return event;
}

export function updateBots(room, deltaMs, now) {
  if (room.phase !== 'active') return;
  for (const bot of room.players.values()) {
    if (!bot.isBot || !bot.alive) continue;
    let nearest = null;
    let nearestDist = Infinity;
    for (const other of room.players.values()) {
      if (other.id === bot.id || !other.alive) continue;
      const d = Math.hypot(other.x - bot.x, other.z - bot.z);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = other;
      }
    }
    if (nearest) {
      const dx = nearest.x - bot.x;
      const dz = nearest.z - bot.z;
      const dist = nearestDist || 1;
      bot.aimX = dx / dist;
      bot.aimZ = dz / dist;

      let moveX = 0;
      let moveZ = 0;
      if (dist > 9) {
        moveX = dx / dist;
        moveZ = dz / dist;
      } else if (dist < 4.5) {
        moveX = -dx / dist;
        moveZ = -dz / dist;
      } else {
        // strafe
        moveX = -dz / dist;
        moveZ = dx / dist;
      }

      // Check incoming shots to dodge
      for (const shot of room.projectiles) {
        if (shot.ownerId !== bot.id) {
          const sDist = Math.hypot(bot.x - shot.x, bot.z - shot.z);
          if (sDist < 4.2 && now >= bot.nextDodgeAt) {
            dodge(bot, { x: -shot.vz, z: shot.vx }, now);
            break;
          }
        }
      }

      bot.input = { x: moveX, z: moveZ };
      if (dist <= 15 && now >= bot.nextFireAt) {
        fire(room, bot, now);
      }
    } else {
      bot.input = { x: 0, z: 0 };
    }
  }
}

export function stepRoom(room, deltaMs, now) {
  const events = [];
  if (room.phase === 'countdown' && now >= room.countdownEndsAt) {
    room.phase = 'active';
    room.endsAt = now + CONFIG.matchDurationMs;
    for (const player of room.players.values()) { player.hp = CONFIG.maxHealth; player.alive = true; player.protectedUntil = now + CONFIG.spawnProtectionMs; }
    events.push({ type: 'match-start' });
  }
  if (room.phase !== 'active') return events;
  updateBots(room, deltaMs, now);
  for (const player of room.players.values()) {
    movePlayer(player, deltaMs, now, room);
    if (!player.alive && player.respawnAt <= now) {
      player.alive = true; player.hp = CONFIG.maxHealth; player.respawnAt = null; player.protectedUntil = now + CONFIG.spawnProtectionMs;
      const a = Math.random() * Math.PI * 2;
      player.x = Math.cos(a) * 12; player.z = Math.sin(a) * 12;
      events.push({ type: 'respawn', playerId: player.id });
    }
  }
  const next = [];
  for (const shot of room.projectiles) {
    shot.x += shot.vx * (deltaMs / 1000);
    shot.z += shot.vz * (deltaMs / 1000);
    if (now >= shot.expiresAt || Math.hypot(shot.x, shot.z) > CONFIG.arenaRadius) continue;
    const target = [...room.players.values()].find((p) => p.id !== shot.ownerId && p.alive && now >= p.protectedUntil && Math.hypot(p.x - shot.x, p.z - shot.z) <= CONFIG.playerRadius + CONFIG.projectileRadius);
    if (!target) { next.push(shot); continue; }
    const shooter = room.players.get(shot.ownerId);
    target.hp = Math.max(0, target.hp - CONFIG.projectileDamage);
    events.push({ type: 'hit', victimId: target.id, attackerId: shooter?.id ?? null, damage: CONFIG.projectileDamage, hp: target.hp });
    if (target.hp <= 0) events.push(eliminate(room, target, shooter, now));
    if (room.phase !== 'active') { room.projectiles = []; break; }
  }
  room.projectiles = next;
  if (room.phase === 'active' && !room.suddenDeath && now >= room.endsAt) {
    const scores = [...room.players.values()];
    const maxScore = Math.max(...scores.map((p) => p.score));
    const leaders = scores.filter((p) => p.score === maxScore);
    if (leaders.length === 1) { room.phase = 'ended'; room.winnerId = leaders[0].id; room.endedReason = 'time'; }
    else { room.suddenDeath = true; room.endsAt = null; events.push({ type: 'sudden-death' }); }
  }
  return events.filter(Boolean);
}

export function resetForRematch(room) {
  room.phase = 'lobby'; room.winnerId = null; room.endedReason = null; room.endsAt = null; room.countdownEndsAt = null; room.suddenDeath = false; room.projectiles = [];
  for (const p of room.players.values()) { p.score = 0; p.hp = CONFIG.maxHealth; p.alive = true; p.ready = false; p.kills = 0; p.deaths = 0; p.respawnAt = null; }
}
