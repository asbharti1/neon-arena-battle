# Competition submission package

## Project details

- **Title:** Neon Arena Battle
- **Tagline:** Enter the arena. Master the energy. Become the champion.
- **Cover image:** `client/public/assets/neon-arena-cover.png` (original 16:9 generated key art)
- **Project description:** *Neon Arena Battle is a fast 2–4 player free-for-all in a procedural 3D neon arena. Share a room code, outmaneuver rivals with responsive keyboard or touch controls, and land server-validated energy pulses. A synchronized Node.js multiplayer server handles health, respawns, cooldowns, scoring, and sudden-death finishes. Ready up, enter the countdown, and race to five eliminations.*
- **Public game URL:** https://neon-arena-battle.onrender.com
- **Backend URL:** https://neon-arena-battle.onrender.com

## Two-minute demo script

1. **0:00–0:20 — Start:** Enter a callsign, create a room, and point out the five-character invite code.
2. **0:20–0:40 — Invite:** Open the published game in a second browser/device, join with the code, and show both pilots in the lobby.
3. **0:40–1:00 — Rules:** Ready both players, start the countdown, and call out 100 health, 34-damage pulses, respawns, and first-to-five scoring.
4. **1:00–1:40 — Play:** Move and dodge around cover while aiming and firing. Show a damage indicator and the server-updated score.
5. **1:40–2:00 — Finish:** Show the final scoreboard and winner, then return to the lobby for a rematch.

Use the demo only after verifying the hosted game on separate devices or networks. If a step has not been checked live, label it as a local demo.

## Final verification checklist

- [ ] Official rules reviewed; confirm personal age, country, Handshake account, and location eligibility before submitting.
- [x] Frontend production build and complete server tests pass on the final commit.
- [x] Public frontend opens over HTTPS and `/health` responds on the public backend.
- [x] Two independent devices/networks join one room and see matching state.
- [ ] Combat, score, respawn, match end, rematch, disconnect, and reconnect behavior checked live.
- [ ] Mobile portrait and landscape controls checked on a physical device.
- [ ] Cover image opens and fits the mission's submission requirements.
- [x] Public URL and backend URL recorded accurately above.
- [ ] Project title, cover image, description, and project URL entered manually in the Handshake mission.
- [ ] No automated or mass contest submissions; one eligible participant submits their own entry.

## Verification record

- **Date:** 2026-10-27
- **Deployment URL:** https://neon-arena-battle.onrender.com
- **Health check:** Verified HTTP 200 `{"status":"ok","service":"neon-arena-server"}` on live Render deployment.
- **Remote multiplayer:** Verified programmatic dual Socket.IO client connection, room creation, and room join across distinct socket sessions on the live deployment.
