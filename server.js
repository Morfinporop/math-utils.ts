const _f = require('fastify')({ logger: false });
const _p = require('path');
const _c = require('crypto');
const Redis = require('ioredis');

// Инициализация Redis (если есть в Railway) или локальный кеш
const _redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
const _M = new Map(); // Local fallback
const _ROT = 300000;

const _gid = (s) => {
    const b = Math.floor(Date.now() / _ROT);
    return _c.createHash('sha256').update(s + b.toString()).digest('hex').slice(0, 16);
};

_f.register(require('@fastify/static'), { root: _p.join(__dirname, 'dist') });
_f.register(require('@fastify/websocket'));

_f.register(async (i) => {
    i.get('/v1/asset-stream', { websocket: true }, (s, q) => {
        s.on('message', async (r) => {
            try {
                const d = JSON.parse(r);
                if (d.op === 0x1) {
                    const id = _gid(d.s);
                    s.gid = id;
                    s.alias = d.a || 'U';
                    _M.set(id, s);
                    if (_redis) await _redis.set(`u:${id}`, '1', 'EX', 3600);
                    s.send(JSON.stringify({ op: 0x4, gid: id }));
                }
                if (d.op === 0x2) {
                    const t = _M.get(d.target);
                    if (t && t.readyState === 1) {
                        // Мгновенная локальная доставка
                        t.send(JSON.stringify({ op: 0x3, f: s.gid, a: s.alias, p: d.p, t: d.t }));
                    } else if (_redis) {
                        // Если юзер на другом инстансе (горизонтальное масштабирование)
                        await _redis.publish('msg', JSON.stringify({ target: d.target, f: s.gid, a: s.alias, p: d.p, t: d.t }));
                    }
                }
            } catch (x) {}
        });
        s.on('close', () => { if (s.gid) _M.delete(s.gid); });
    });
});

// Pub/Sub для мгновенной доставки между инстансами
if (_redis) {
    const sub = new Redis(process.env.REDIS_URL);
    sub.subscribe('msg');
    sub.on('message', (chan, msg) => {
        const d = JSON.parse(msg);
        const t = _M.get(d.target);
        if (t && t.readyState === 1) {
            t.send(JSON.stringify({ op: 0x3, f: d.f, a: d.a, p: d.p, t: d.t }));
        }
    });
}

_f.setNotFoundHandler((q, r) => { r.status(404).sendFile('index.html'); });
_f.listen({ port: process.env.PORT || 8080, host: '0.0.0.0' });
