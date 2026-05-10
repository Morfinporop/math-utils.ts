const f = require('fastify')({ logger: false });
const p = require('path');
const c = require('crypto');

const _DB = new Map();
const _ROT = 300000;

const _gid = (s) => {
    const b = Math.floor(Date.now() / _ROT);
    return c.createHash('sha256').update(s + b.toString()).digest('hex').slice(0, 16);
};

f.register(require('@fastify/static'), { root: p.join(__dirname, 'dist') });
f.register(require('@fastify/websocket'));

f.register(async (i) => {
    i.get('/v1/asset-stream', { websocket: true }, (conn, req) => {
        conn.on('message', (raw) => {
            try {
                const envelope = JSON.parse(raw);
                const d = envelope.data || envelope;

                if (d.op === 0x1) { // HELO
                    const id = _gid(d.s);
                    conn.gid = id;
                    _DB.set(id, conn);
                    // Отправляем клиенту его реальный сетевой ID
                    conn.send(JSON.stringify({ op: 0x4, gid: id }));
                }
                
                if (d.op === 0x2) { // SEND
                    const recipient = _DB.get(d.target);
                    if (recipient && recipient.readyState === 1) {
                        recipient.send(JSON.stringify({
                            data: { op: 0x3, f: conn.gid, p: d.p, t: d.t }
                        }));
                    }
                }
            } catch (e) {}
        });

        conn.on('close', () => {
            if (conn.gid) _DB.delete(conn.gid);
        });
    });
});

f.setNotFoundHandler((q, r) => { r.status(404).sendFile('index.html'); });
f.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
