import { io } from 'socket.io-client';

export const socket = io(import.meta.env.VITE_SERVER_URL || window.location.origin, { autoConnect: false, reconnection: true, reconnectionAttempts: Infinity, timeout: 8000, transports: ['websocket', 'polling'] });

export function request(event, payload = {}) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('The arena server did not respond. Check your connection and try again.')), 6000);
    socket.emit(event, payload, (result) => {
      window.clearTimeout(timer);
      if (!result?.ok) reject(new Error(result?.error || 'That action could not be completed.'));
      else resolve(result);
    });
  });
}
