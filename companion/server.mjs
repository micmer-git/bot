import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PORT = Number(process.env.PORT || 8787);
const BRIDGE_KEY = process.env.BRIDGE_KEY || '';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:3000';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || '';
const VAULT_ROOT = path.resolve(process.env.OBSIDIAN_VAULT || process.cwd());

function auth(req, res, next) {
  if (!BRIDGE_KEY) return next();
  const key = req.header('x-bridge-key') || '';
  if (key !== BRIDGE_KEY) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function safeJoin(root, rel = '') {
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(root)) throw new Error('path outside allowed root');
  return abs;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, vaultRoot: VAULT_ROOT, gateway: GATEWAY_URL });
});

app.post('/proxy/openclaw', auth, async (req, res) => {
  try {
    const { path: p, method = 'GET', body } = req.body || {};
    if (!p || typeof p !== 'string') return res.status(400).json({ error: 'path required' });
    const headers = { 'content-type': 'application/json' };
    const token = req.body?.gatewayToken || GATEWAY_TOKEN;
    if (token) headers.authorization = `Bearer ${token}`;
    const url = (req.body?.gatewayUrl || GATEWAY_URL).replace(/\/$/, '') + p;
    const r = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const txt = await r.text();
    let data = txt;
    try { data = JSON.parse(txt); } catch {}
    res.status(r.status).json({ ok: r.ok, status: r.status, data });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get('/obsidian/list', auth, async (req, res) => {
  try {
    const rel = String(req.query.path || '.');
    const dir = safeJoin(VAULT_ROOT, rel);
    const ents = await fs.readdir(dir, { withFileTypes: true });
    res.json({ path: rel, entries: ents.map(e => ({ name: e.name, type: e.isDirectory() ? 'dir' : 'file' })) });
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

app.get('/obsidian/read', auth, async (req, res) => {
  try {
    const rel = String(req.query.path || '');
    if (!rel) return res.status(400).json({ error: 'path required' });
    const fp = safeJoin(VAULT_ROOT, rel);
    const content = await fs.readFile(fp, 'utf8');
    res.json({ path: rel, content });
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

app.post('/obsidian/write', auth, async (req, res) => {
  try {
    const rel = String(req.body?.path || '');
    const content = String(req.body?.content ?? '');
    if (!rel) return res.status(400).json({ error: 'path required' });
    const fp = safeJoin(VAULT_ROOT, rel);
    await fs.mkdir(path.dirname(fp), { recursive: true });
    await fs.writeFile(fp, content, 'utf8');
    res.json({ ok: true, path: rel });
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

app.listen(PORT, () => {
  console.log(`[companion] listening on http://127.0.0.1:${PORT}`);
  console.log(`[companion] vault root: ${VAULT_ROOT}`);
});
