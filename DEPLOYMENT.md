# Deployment guide

The browser app and authoritative Socket.IO server are served from one Render Web Service. This keeps the game and WebSocket endpoint on the same origin, avoiding separate frontend/backend URL configuration. The checked-in `render.yaml` defines the service. Render documents public WebSocket support; its free services can sleep and restart, so this is a demo/hobby choice rather than a production reliability promise.

GitHub repository: [asbharti1/neon-arena-battle](https://github.com/asbharti1/neon-arena-battle) (branch `main`, commit `5cc0cb5`).

## Build and start commands

- Frontend build command: `npm ci && npm run build`
- Frontend output directory: `client/dist`
- Backend install: `npm install`
- Backend start command: `npm start`
- Health check path: `/health`

The production client defaults to the current page origin for Socket.IO. The server serves `client/dist` and permits same-origin requests; set `CLIENT_ORIGIN` to a comma-separated exact-origin allowlist only when serving a separate frontend. `PORT` is provided by Render. Do not put backend secrets in `VITE_*` variables.

## Render publish sequence

1. Sign in to Render and choose **New → Blueprint**; select the GitHub repository above and branch `main`.
2. Review the Blueprint resources. It creates one Free Web Service (if that plan is available to the account): build `npm ci && npm run build`, start `npm start`, health check `/health`, region Singapore.
3. Wait for the service to deploy. Its public URL serves the game and `/health` should report `{"status":"ok"}`.
4. Open that URL in a separate browser session or physical device and join a room hosted from another network. Verify ready/start, synchronized movement and hits, disconnect behavior, and reconnect messaging. A same-machine integration test is not a substitute for this step.
5. Record the live URL and date/check performed in `SUBMISSION.md`. Never submit a placeholder or an unverified URL.

## Provider notes

Render currently documents that free web services sleep after 15 minutes without inbound HTTP requests or WebSocket messages from connected clients; waking can take about one minute. Free instances may restart and have ephemeral storage. Since rooms are in memory, restarts clear them. Warm the service before a demo and expect room codes to expire on restart or sleep.

## Troubleshooting

- Browser reports a CORS error: set `CLIENT_ORIGIN` to the exact page origin (scheme and hostname, no path) and restart the backend.
- Socket connects but rooms fail: check `/health`, the browser's `VITE_SERVER_URL`, and whether the provider proxies WebSocket upgrades.
- Room disappears: backend process restarted or slept; create a new room.
- Never expose `.env` or service credentials in frontend build variables or commit history.
