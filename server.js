import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const _f = fastify({ logger: false, bodyLimit: 5 * 1024 * 1024 });

const DB_PATH = path.join(__dirname, 'llb_db.json');

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {}
  return { users: {}, messages: {}, contacts: {}, blocks: {} };
}

let _saveTimer = null;
function saveDB() {
  if (_saveTimer) return;
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 0)); } catch (e) { console.log('DB err:', e.message); }
  }, 500);
}
function saveDBNow() {
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
  try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 0)); } catch (e) { console.log('DB err:', e.message); }
}

const db = loadDB();
const SESSIONS = new Map();
const ROT = 86400000;

const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
const gid = (s) => { const b = Math.floor(Date.now() / ROT); return crypto.createHash('sha256').update(s + b.toString()).digest('hex').slice(0, 16); };
const randUser = (name) => name.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '') + Math.floor(1000 + Math.random() * 9000);

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

// ── AUTH ──────────────────────────────

_f.post('/api/register', async (req, reply) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return reply.status(400).send({ error: 'missing_fields' });
  if (name.length > 16 || password.length > 32 || email.length > 50) return reply.status(400).send({ error: 'too_long' });
  if (db.users[email]) return reply.status(409).send({ error: 'email_exists' });
  const seed = crypto.randomBytes(16).toString('hex');
  const isOwner = email === ownerEmail();
  const username = randUser(name);
  db.users[email] = { password_hash: hash(password), name, seed, isOwner, username, description: '', avatar: '', banner: '' };
  const g = gid(seed);
  db.messages[g] = {};
  db.contacts[g] = {};
  saveDBNow();
  return { ok: true, seed, gid: g, name, isOwner, username };
});

_f.post('/api/login', async (req, reply) => {
  const { email, password } = req.body;
  if (!email || !password) return reply.status(400).send({ error: 'missing_fields' });
  const user = db.users[email];
  if (!user || user.password_hash !== hash(password)) return reply.status(401).send({ error: 'invalid' });
  const g = gid(user.seed);
  return { ok: true, seed: user.seed, gid: g, name: user.name, isOwner: user.isOwner || false, username: user.username, description: user.description || '', avatar: user.avatar || '', banner: user.banner || '' };
});

// ── PROFILE ─────────────────────────

_f.get('/api/profile/:gid', async (req, reply) => {
  if (req.params.gid === 'AnoAI_bot') return { name: 'AnoAI', username: 'anoai', description: 'AI ассистент LLB', avatar: '', banner: '', isOwner: false };
  const u = findUserByGid(req.params.gid);
  if (!u) return reply.status(404).send({ error: 'not_found' });
  return { name: u.name, username: u.username, description: u.description || '', avatar: u.avatar || '', banner: u.banner || '', isOwner: u.isOwner || false };
});

// ── SEARCH ──────────────────────────

_f.get('/api/search', async (req, reply) => {
  const q = (req.query.q || '').toLowerCase();
  if (q.length < 2) return [];
  const results = [];
  for (const email in db.users) {
    const u = db.users[email];
    if (u.username.includes(q) || u.name.toLowerCase().includes(q)) {
      results.push({ gid: gid(u.seed), name: u.name, username: u.username, isOwner: u.isOwner, avatar: u.avatar || '' });
    }
    if (results.length >= 10) break;
  }
  return results;
});

// ── ONLINE CHECK ────────────────────

_f.get('/api/online/:gid', async (req, reply) => {
  return { online: SESSIONS.has(req.params.gid) };
});

// ── WEBSOCKET ───────────────────────

_f.register(async (i) => {
  i.get('/v1/asset-stream', { websocket: true }, (s, q) => {
    const ip = q.ip || q.headers['x-forwarded-for'] || '0.0.0.0';
    
    s.on('message', (r) => {
      try {
        const d = JSON.parse(r);

        if (d.op === 0x1) {
          const id = gid(d.s);
          s.gid = id;
          s.alias = d.a || 'U';
          SESSIONS.set(id, s);
          s.send(JSON.stringify({ op: 0x4, gid: id }));
          s.send(JSON.stringify({ op: 'LOAD', contacts: db.contacts[id] || {}, messages: db.messages[id] || {} }));
          // Tell new user who is currently online
          SESSIONS.forEach((sock, sid) => {
            if (sid !== id) {
              // Tell new user about existing online user
              s.send(JSON.stringify({ op: 'ONLINE', gid: sid }));
              // Tell existing user about new user
              if (sock.readyState === 1) sock.send(JSON.stringify({ op: 'ONLINE', gid: id }));
            }
          });
        }

        if (d.op === 0x2) { // SEND MESSAGE
          if (d.target === s.gid) return;
          const blocks = db.blocks[d.target] || [];
          if (blocks.includes(s.gid)) return;
          
          let content = d.p;
          if (d.t !== 'voice') {
            if (content.length > 2000) content = content.slice(0, 2000);
            // Block spam characters
            if (/(.)\1{10,}/.test(content) || /[^\w\sа-яёА-ЯЁ.,!?;:'"()\-@#$%&+=]{20,}/.test(content)) return;
          }

          const msg = { id: crypto.randomBytes(4).toString('hex'), from: s.gid, to: d.target, content, timestamp: Date.now(), type: d.t || 'text' };
          
          // Only save text messages to DB (voice is too large)
          if (d.t !== 'voice') {
            if (!db.messages[s.gid]) db.messages[s.gid] = {};
            if (!db.messages[s.gid][d.target]) db.messages[s.gid][d.target] = [];
            db.messages[s.gid][d.target].push(msg);
            // Keep max 200 messages per chat
            if (db.messages[s.gid][d.target].length > 200) db.messages[s.gid][d.target] = db.messages[s.gid][d.target].slice(-200);

            if (!db.messages[d.target]) db.messages[d.target] = {};
            if (!db.messages[d.target][s.gid]) db.messages[d.target][s.gid] = [];
            db.messages[d.target][s.gid].push(msg);
            if (db.messages[d.target][s.gid].length > 200) db.messages[d.target][s.gid] = db.messages[d.target][s.gid].slice(-200);
          }

          const senderData = findUserByGid(s.gid);
          if (!db.contacts[d.target]) db.contacts[d.target] = {};
          db.contacts[d.target][s.gid] = { displayName: senderData?.name || s.alias, avatar: senderData?.avatar || '' };
          if (!db.contacts[s.gid]) db.contacts[s.gid] = {};
          const targetData = findUserByGid(d.target);
          db.contacts[s.gid][d.target] = { displayName: targetData?.name || 'U', avatar: targetData?.avatar || '' };

          saveDB();

          const t = SESSIONS.get(d.target);
          if (t && t.readyState === 1) {
            t.send(JSON.stringify({ op: 'MSG', from: s.gid, name: senderData?.name || s.alias, content: d.p, type: d.t, avatar: senderData?.avatar || '', ts: Date.now() }));
          }
        }

        if (d.op === 0x5) { // BLOCK
          if (!db.blocks[s.gid]) db.blocks[s.gid] = [];
          if (!db.blocks[s.gid].includes(d.target)) db.blocks[s.gid].push(d.target);
          saveDB();
          const t = SESSIONS.get(d.target);
          if (t && t.readyState === 1) t.send(JSON.stringify({ op: 'BLOCKED', by: s.gid }));
        }

        if (d.op === 0x6) { // UNBLOCK
          db.blocks[s.gid] = (db.blocks[s.gid] || []).filter(x => x !== d.target);
          saveDB();
          const t = SESSIONS.get(d.target);
          if (t && t.readyState === 1) t.send(JSON.stringify({ op: 'UNBLOCKED', by: s.gid }));
        }

        if (d.op === 0x7) { // CLEAR
          if (db.messages[s.gid]) delete db.messages[s.gid][d.target];
          if (db.messages[d.target]) delete db.messages[d.target][s.gid];
          saveDB();
          const t = SESSIONS.get(d.target);
          if (t && t.readyState === 1) t.send(JSON.stringify({ op: 'CLEARED', from: s.gid }));
        }

        if (d.op === 0x8) { // UPDATE PROFILE
          for (const email in db.users) {
            const u = db.users[email];
            if (gid(u.seed) === s.gid) {
              if (d.profile.name) u.name = d.profile.name;
              if (d.profile.description !== undefined) u.description = d.profile.description;
              if (d.profile.avatar !== undefined) u.avatar = d.profile.avatar;
              if (d.profile.banner !== undefined) u.banner = d.profile.banner;
              s.alias = u.name;
              for (const gk in db.contacts) {
                if (db.contacts[gk][s.gid]) {
                  db.contacts[gk][s.gid].displayName = u.name;
                  db.contacts[gk][s.gid].avatar = u.avatar;
                }
              }
              break;
            }
          }
          saveDB();
          SESSIONS.forEach((sock) => { if (sock.readyState === 1) sock.send(JSON.stringify({ op: 'PROFILE', gid: s.gid, name: d.profile.name, avatar: d.profile.avatar })); });
        }

        if (d.op === 0x9) { // PANIC
          SESSIONS.forEach((sock) => { if (sock.readyState === 1) sock.send(JSON.stringify({ op: 'WIPE', target: s.gid })); });
        }

        if (d.op === 0xA) { // ADMIN SEND AS AI
          const t = SESSIONS.get(d.target);
          if (t && t.readyState === 1) t.send(JSON.stringify({ op: 'MSG', from: 'AnoAI_bot', name: 'AnoAI', content: d.p, type: 'text', avatar: '', ts: Date.now() }));
        }
      } catch (e) {}
    });

    s.on('close', () => {
      if (s.gid) {
        SESSIONS.delete(s.gid);
        SESSIONS.forEach((sock) => { if (sock.readyState === 1) sock.send(JSON.stringify({ op: 'OFFLINE', gid: s.gid })); });
      }
    });
  });
});

_f.setNotFoundHandler((q, r) => { r.status(404).sendFile('index.html'); });
_f.listen({ port: process.env.PORT || 8080, host: '0.0.0.0' });
