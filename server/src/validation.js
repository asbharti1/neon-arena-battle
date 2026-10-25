export const cleanName = (value) => typeof value === 'string'
  ? value.normalize('NFKC').replace(/[<>\u0000-\u001f\u007f]/g, '').trim().replace(/\s+/g, ' ').slice(0, 18)
  : '';

export const isRoomCode = (value) => typeof value === 'string' && /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(value);

export function clampInput(value) {
  if (!value || typeof value !== 'object') return null;
  const { x, z, aimX, aimZ } = value;
  if (![x, z, aimX, aimZ].every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  const moveLength = Math.hypot(x, z);
  const aimLength = Math.hypot(aimX, aimZ);
  if (Math.abs(x) > 1.1 || Math.abs(z) > 1.1 || aimLength < 0.01 || aimLength > 10000) return null;
  return {
    x: moveLength > 1 ? x / moveLength : x,
    z: moveLength > 1 ? z / moveLength : z,
    aimX: aimX / aimLength,
    aimZ: aimZ / aimLength,
  };
}
