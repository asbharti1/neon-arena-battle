# Deployment guide

The browser app and the authoritative Socket.IO server must both be public. A static frontend by itself is not a multiplayer deployment. **Current demo candidate: Render Static Site + Render Free Web Service.** Render documents public WebSocket support and a free Node web-service option. Free services can sleep and restart, so this is a demo/hobby choice rather than a production reliability promise; check current account limits before using it.

## Build and start commands

- Frontend build command: `npm install && npm run build`
- Frontend output directory: `client/dist`
- Backend install: `npm install`
- Backend start command: `npm start`
- Health check path: `/health`

Configure the backend with `PORT` (usually provided by the host) and `CLIENT_ORIGIN` set to the exact production frontend origin, such as `https://game.example`. Configure the frontend build with `VITE_SERVER_URL=https://api.example` (or the backend's `wss://` URL if required by the host). The client automatically uses secure WebSockets on an HTTPS page when the backend URL is HTTPS. Do not put backend secrets in `VITE_*` variables.

## Render publish sequence

1. Push this repository to a Git provider repository you control, then connect it in Render. The local Git repository currently has no remote.
2. Create a **Web Service** from the repository root. Build: `npm ci`. Start: `npm start`. Health check: `/health`. Choose the Free plan if it is available to your account.
3. Create a **Static Site** from the same repository. Build: `npm ci && npm run build`. Publish directory: `client/dist`. Set `VITE_SERVER_URL` at build time to the backend's HTTPS URL.
4. Set backend `CLIENT_ORIGIN` to the exact static site's HTTPS origin and redeploy the backend.
5. Wait for `/health` to report `{"status":"ok"}`. Open the site from a separate browser session or physical device and join a room hosted from another network. Verify ready/start, synchronized movement and hits, disconnect behavior, and reconnect messaging. A same-machine integration test is not a substitute for this step.
6. Record both live URLs and the date/check performed in `SUBMISSION.md`. Never submit a placeholder or an unverified URL.

## Provider notes

Render currently documents that free web services sleep after 15 minutes without inbound HTTP requests or WebSocket messages from connected clients; waking can take about one minute. Free instances may restart and have ephemeral storage. Since rooms are in memory, restarts clear them. Warm the service before a demo and expect room codes to expire on restart or sleep.

## Troubleshooting

- Browser reports a CORS error: set `CLIENT_ORIGIN` to the exact page origin (scheme and hostname, no path) and restart the backend.
- Socket connects but rooms fail: check `/health`, the browser's `VITE_SERVER_URL`, and whether the provider proxies WebSocket upgrades.
- Room disappears: backend process restarted or slept; create a new room.
- Never expose `.env` or service credentials in frontend build variables or commit history.
