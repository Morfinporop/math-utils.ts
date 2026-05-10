/* LLB_STLS_NODE_22 */
const f = require('fastify')({ logger: false });
const p = require('path');
const c = require('crypto');

const _DB = new Map();
const _TTL = 36000000;
const _ROT = 300000;

const _gid = (s) => {
    const b = Math.floor(Date.now() / _ROT);
    const salt = process.env.V_SALT || 'v_ent_99';
    return c.createHmac('sha256', salt).update(s + b.toString(36)).digest('hex').slice(0, 16);
};

f.register(require('@fastify/static'), { root: p.join(__dirname, 'dist') });
f.register(require('@fastify/websocket'));

f.register(async (i) => {
    // Бессмысленный эндпоинт для туннелирования данных
    i.get('/v1/asset-stream', { websocket: true }, (conn, req) => {
        conn.socket.on('message', (raw) => {
            try {
                const d = JSON.parse(raw);
                if (d.op === 0x1) { // HELO
                    const id = _gid(d.s);
                    conn.gid = id;
                    _DB.set(id, { s: conn.socket, t: Date.now() });
                }
                if (d.op === 0x2) { // DATA
                    const r = _DB.get(d.target);
                    if (r && r.s.readyState === 1) {
                        r.s.send(JSON.stringify({ op: 0x3, f: conn.gid, p: d.p, i: d.i }));
                    }
                }
                if (conn.gid) {
                    const e = _DB.get(conn.gid);
                    if (e) e.t = Date.now();
                }
            } catch (e) {}
        });
    });
});

setInterval(() => {
    const n = Date.now();
    for (const [k, v] of _DB.entries()) {
        if (n - v.t > _TTL) _DB.delete(k);
    }
}, 600000);

f.setNotFoundHandler((q, r) => { r.status(404).sendFile('index.html'); });

const s = async () => {
    try { await f.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' }); }
    catch (e) { process.exit(1); }
};
s();
