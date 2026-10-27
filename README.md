# Neon Arena Battle

**Enter the arena. Master the energy. Become the champion.**

Neon Arena Battle is a fast free-for-all for two to four pilots. Create a room, share its five-character code, ready up, and fight in a procedural Three.js arena. The Node.js server owns movement limits, firing cadence, projectile hits, health, respawns, score, and match results.

## Play

- Create a room or enter a room code. A room holds at most four players.
- At least two players must be connected and ready. The host starts the three-second countdown.
- Each pilot has 100 health. Energy pulses deal 34 damage; three hits eliminate a rival.
- Eliminations award one point. The first pilot to five points wins. At three minutes, a unique score leader wins; a tie goes to sudden death.
- Eliminated pilots respawn after 2.4 seconds with 1.5 seconds of spawn protection.

Desktop controls: **WASD / arrows** move, **mouse** aims, **left click** fires, and **Space** dodges. On touch screens, use the left movement stick, drag the arena to aim, then use **PULSE** and **DODGE**. Press **Escape** for sound settings; the live match continues while settings are open.

## Prerequisites and local development

- Node.js 22 or a compatible current LTS release
- npm 10+

```sh
npm install
Copy-Item .env.example .env
npm run dev
```

The client runs at `http://localhost:5173`; the API and Socket.IO server run at `http://localhost:3001`. The server exposes `/health`. `VITE_SERVER_URL` sets the browser's Socket.IO origin; `PORT` sets the server port; `CLIENT_ORIGIN` is a comma-separated CORS allowlist. In production, set `VITE_SERVER_URL` to the public WebSocket backend and `CLIENT_ORIGIN` to the exact published frontend origin(s). Keep secrets server-side; this game needs no API keys.

## Checks

```sh
npm test
npm run build
```

The server tests use Node's built-in test runner and two independent Socket.IO clients. They cover room lifecycle/capacity, ready/start authorization, input validation, movement bounds, cooldowns, damage, elimination, respawn, scoring, match end/tie handling, rematch, synchronized room state, server-side firing, malicious input, and disconnect cleanup. A local two-client check verifies network communication on this machine; it does not establish that a public deployment is reachable from other networks or devices.

## Project layout

- `client/` React, Vite, responsive interface, Three.js world and synthesized sound effects
- `server/` Express health endpoint, Socket.IO room service, server simulation and tests
- `SUBMISSION.md` prepared title, description, demo script and readiness checklist
- `DEPLOYMENT.md` production configuration and publication steps
- `client/public/assets/neon-arena-cover.png` original 16:9 submission cover; `neon-arena-menu.webp` optimized in-game menu art

## Architecture and limitations

Room state is held in memory. Restarting the server closes all active rooms. The backend broadcasts authoritative snapshots at 20 Hz; clients render those snapshots in a lightweight Three.js scene. A room host is reassigned when they leave. The server validates movement vectors, rate limits actions, and never accepts client-declared hits or scores. This first version does not persist accounts, rankings, or room history. It does not include production DDoS protection or a matchmaking queue.

The 3D avatars and arena are generated from original procedural geometry; there are no third-party game models. Sound effects are synthesized locally and begin after player interaction. Google Fonts are an optional network-loaded typography enhancement; system sans-serif fallbacks remain available offline.

## Current publication status

The project has not been published yet. A single Node web service can host both the production frontend and authoritative WebSocket server; `render.yaml` and `DEPLOYMENT.md` describe the demo deployment. Record a public URL in `SUBMISSION.md` only after checking the site and a remote multiplayer session.
