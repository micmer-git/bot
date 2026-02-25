# Local companion (Obsidian + OpenClaw bridge)

Use this when the GitHub Pages dashboard needs local filesystem access or a CORS-safe proxy to OpenClaw.

## Setup

```bash
cd companion
npm install
cp .env.example .env
# edit .env
npm start
```

Then in the dashboard set:
- Bridge URL: `http://127.0.0.1:8787`
- Bridge Key: value of `BRIDGE_KEY`

## Endpoints
- `GET /health`
- `POST /proxy/openclaw` (proxy to OpenClaw API)
- `GET /obsidian/list?path=...`
- `GET /obsidian/read?path=...`
- `POST /obsidian/write`

## Security notes
- Keep `BRIDGE_KEY` set
- Runs on localhost by default
- Path access is restricted to `OBSIDIAN_VAULT`
