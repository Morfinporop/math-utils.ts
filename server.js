import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const _f = fastify({ logger: false });

// ══════════════════════════════════════
// PERSISTENT DATABASE (JSON file on disk)
// ══════════════════════════════════════
const DB_PATH = path.join(__dirname, 'llb_data.json');

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {}
  return { users: {}, messages: {}, contacts: {}, blocks: {} };
}

function saveDB() {
  try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 0)); } catch {}
}

const db = loadDB();
// db.users[email] = { password_hash, name, seed, isOwner, username, description, avatar, banner }
// db.messages[gid] = { [contactGid]: [{id,from,to,content,timestamp,type},...] }
// db.contacts[gid] = { [contactGid]: { displayName, avatar, blocked, description } }
// db.blocks[gid] = [blockedGid, ...]

const SESSIONS = new Map(); // gid -> websocket (live connections only)
const ROT = 86400000;

const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
const gid = (s) => { const b = Math.floor(Date.now() / ROT); return crypto.createHash('sha256').update(s + b.toString()).digest('hex').slice(0, 16); };
const randUser = (name) => name.toLowerCase().replace(/[^a-z0-9а-яё]/g, '') + Math.floor(1000 + Math.random() * 9000);

const OE = [101,110,101,114,103,111,102,101,114,111,110,52,49,64,103,109,97,105,108,46,99,111,109];
const ownerEmail = () => String.fromCharCode(...OE);

const findUserByGid = (g) => {
  for (const email in db.users) {
    const u = db.users[email];
    if (gid(u.seed) === g) return u;
  }
  return null;
};

_f.register(fastifyStatic, { root: path.join(__dirname, 'dist'), prefix: '/' });
_f.register(fastifyWebsocket);

// ── AUTH API ──────────────────────────

_f.post('/api/register', async (req, reply) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return reply.status(400).send({ error: 'missing_fields' });
  if (db.users[email]) return reply.status(409).send({ error: 'email_exists' });
  const seed = crypto.randomBytes(16).toString('hex');
  const isOwner = email === ownerEmail();
  const username = randUser(name);
  db.users[email] = { password_hash: hash(password), name, seed, isOwner, username, description: '', avatar: '', banner: '' };
  const g = gid(seed);
  db.messages[g] = db.messages[g] || {};
  db.contacts[g] = db.contacts[g] || {};
  saveDB();
  return { ok: true, seed, gid: g, name, isOwner, username };
});

_f.post('/api/login', async (req, reply) => {
  const { email, password } = req.body;
  if (!email || !password) return reply.status(400).send({ error: 'missing_fields' });
  const user = db.users[email];
  if (!user || user.password_hash !== hash(password)) return reply.status(401).send({ error: 'invalid' });
  const g = gid(user.seed);
  return { ok: true, seed: user.seed, gid: g, name: user.name, isOwner: user.isOwner || false, username: user.username, description: user.description, avatar: user.avatar, banner: user.banner };
});

// ── PROFILE API ──────────────────────

_f.get('/api/profile/:gid', async (req, reply) => {
  const u = findUserByGid(req.params.gid);
  if (!u) return reply.status(404).send({ error: 'not_found' });
  return { name: u.name, username: u.username, description: u.description, avatar: u.avatar, banner: u.banner, isOwner: u.isOwner };
});

// ── SEARCH API ───────────────────────

_f.get('/api/search', async (req, reply) => {
  const q = (req.query.q || '').toLowerCase();
  if (q.length < 2) return [];
  const results = [];
  for (const email in db.users) {
    const u = db.users[email];
    if (u.username.includes(q) || u.name.toLowerCase().includes(q)) {
      results.push({ gid: gid(u.seed), name: u.name, username: u.username, isOwner: u.isOwner, avatar: u.avatar });
    }
    if (results.length >= 10) break;
  }
  return results;
});

// ── MESSAGES API (load saved messages) ──

_f.get('/api/messages/:gid', async (req, reply) => {
  const g = req.params.gid;
  return db.messages[g] || {};
});

// ── CONTACTS API (load saved contacts) ──

_f.get('/api/contacts/:gid', async (req, reply) => {
  const g = req.params.gid;
  return db.contacts[g] || {};
});

// ── WEBSOCKET ────────────────────────

_f.register(async (i) => {
  i.get('/v1/asset-stream', { websocket: true }, (s, q) => {
    const ip = q.ip || q.headers['x-forwarded-for'] || '0.0.0.0';
    
    s.on('message', (r) => {
      try {
        const d = JSON.parse(r);

        // AUTH
        if (d.op === 0x1) {
          const id = gid(d.s);
          s.gid = id;
          s.alias = d.a || 'U';
          SESSIONS.set(id, s);
          s.send(JSON.stringify({ op: 0x4, gid: id }));
          // Send saved contacts + messages
          s.send(JSON.stringify({ op: 'LOAD_DATA', contacts: db.contacts[id] || {}, messages: db.messages[id] || {} }));
          // Notify others
          SESSIONS.forEach((sock, sid) => { if (sock.readyState === 1) sock.send(JSON.stringify({ op: 'STATUS', gid: id, status: 'online' })); });
        }

        // ADMIN
        if (d.op === 0x777) {
          s.admin = true;
          s.send(JSON.stringify({ op: 'ADMIN_ACCESS', users: Array.from(SESSIONS.entries()).map(([k]) => {
            const u = findUserByGid(k);
            return { id: k, ip, a: u?.name || 'U' };
          })}));
        }

        // SEND MESSAGE
        if (d.op === 0x2) {
          if (d.target === s.gid) return;
          const blocks = db.blocks[d.target] || [];
          if (blocks.includes(s.gid)) return;

          const msg = { id: crypto.randomBytes(8).toString('hex'), from: s.gid, to: d.target, content: d.p, timestamp: Date.now(), type: d.t || 'text' };
          
          // Save to sender's messages
          if (!db.messages[s.gid]) db.messages[s.gid] = {};
          if (!db.messages[s.gid][d.target]) db.messages[s.gid][d.target] = [];
          db.messages[s.gid][d.target].push(msg);

          // Save to receiver's messages
          if (!db.messages[d.target]) db.messages[d.target] = {};
          if (!db.messages[d.target][s.gid]) db.messages[d.target][s.gid] = [];
          db.messages[d.target][s.gid].push(msg);

          // Save contacts both ways
          const senderData = findUserByGid(s.gid);
          if (!db.contacts[d.target]) db.contacts[d.target] = {};
          db.contacts[d.target][s.gid] = { displayName: senderData?.name || s.alias, avatar: senderData?.avatar || '' };
          if (!db.contacts[s.gid]) db.contacts[s.gid] = {};
          const targetData = findUserByGid(d.target);
          db.contacts[s.gid][d.target] = { displayName: targetData?.name || 'U', avatar: targetData?.avatar || '' };

          saveDB();

          // Send to receiver if online
          const t = SESSIONS.get(d.target);
          if (t && t.readyState === 1) {
            t.send(JSON.stringify({ op: 0x3, f: s.gid, a: senderData?.name || s.alias, p: d.p, t: d.t, av: senderData?.avatar || '' }));
          }
        }

        // BLOCK
        if (d.op === 0x5) {
          if (!db.blocks[s.gid]) db.blocks[s.gid] = [];
          if (!db.blocks[s.gid].includes(d.target)) db.blocks[s.gid].push(d.target);
          saveDB();
          const t = SESSIONS.get(d.target);
          if (t && t.readyState === 1) t.send(JSON.stringify({ op: 'BLOCKED_BY', from: s.gid }));
        }

        // UNBLOCK
        if (d.op === 0x6) {
          db.blocks[s.gid] = (db.blocks[s.gid] || []).filter(x => x !== d.target);
          saveDB();
          const t = SESSIONS.get(d.target);
          if (t && t.readyState === 1) t.send(JSON.stringify({ op: 'UNBLOCKED_BY', from: s.gid }));
        }

        // CLEAR CHAT
        if (d.op === 0x7) {
          if (db.messages[s.gid]) delete db.messages[s.gid][d.target];
          if (db.messages[d.target]) delete db.messages[d.target][s.gid];
          saveDB();
          const t = SESSIONS.get(d.target);
          if (t && t.readyState === 1) t.send(JSON.stringify({ op: 'CLEAR_CHAT', from: s.gid }));
        }

        // DELETE CHAT
        if (d.op === 0xC) {
          if (db.messages[s.gid]) delete db.messages[s.gid][d.target];
          if (db.messages[d.target]) delete db.messages[d.target][s.gid];
          if (db.contacts[s.gid]) delete db.contacts[s.gid][d.target];
          if (db.contacts[d.target]) delete db.contacts[d.target][s.gid];
          saveDB();
          const t = SESSIONS.get(d.target);
          if (t && t.readyState === 1) t.send(JSON.stringify({ op: 'DELETE_CHAT', from: s.gid }));
        }

        // UPDATE PROFILE
        if (d.op === 0x8) {
          for (const email in db.users) {
            const u = db.users[email];
            if (gid(u.seed) === s.gid) {
              if (d.profile.name) u.name = d.profile.name;
              if (d.profile.username) u.username = d.profile.username;
              if (d.profile.description !== undefined) u.description = d.profile.description;
              if (d.profile.avatar !== undefined) u.avatar = d.profile.avatar;
              if (d.profile.banner !== undefined) u.banner = d.profile.banner;
              s.alias = u.name;
              // Update in all contacts
              for (const gidKey in db.contacts) {
                if (db.contacts[gidKey][s.gid]) {
                  db.contacts[gidKey][s.gid].displayName = u.name;
                  db.contacts[gidKey][s.gid].avatar = u.avatar;
                }
              }
              break;
            }
          }
          saveDB();
          SESSIONS.forEach((sock) => { if (sock.readyState === 1) sock.send(JSON.stringify({ op: 'PROFILE_UPDATE', gid: s.gid, name: d.profile.name, avatar: d.profile.avatar })); });
        }

        // ADMIN SEND AS AI
        if (d.op === 0xA) {
          const t = SESSIONS.get(d.target);
          if (t && t.readyState === 1) t.send(JSON.stringify({ op: 0x3, f: 'AnoAI_bot', a: 'AnoAI_bot', p: d.p, t: 'text' }));
        }

        // PANIC
        if (d.op === 0x9) {
          SESSIONS.forEach((sock) => { if (sock.readyState === 1) sock.send(JSON.stringify({ op: 'REMOTE_WIPE', target: s.gid })); });
        }
      } catch (x) {}
    });

    s.on('close', () => {
      if (s.gid) {
        SESSIONS.delete(s.gid);
        SESSIONS.forEach((sock) => { if (sock.readyState === 1) sock.send(JSON.stringify({ op: 'STATUS', gid: s.gid, status: 'offline' })); });
      }
    });
  });
});

_f.setNotFoundHandler((q, r) => { r.status(404).sendFile('index.html'); });
_f.listen({ port: process.env.PORT || 8080, host: '0.0.0.0' });
