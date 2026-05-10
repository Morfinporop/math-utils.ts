const _f = require('fastify')({ logger: false });
const _p = require('path');
const _c = require('crypto');

// Хранилище сессий в памяти
const _M = new Map();
const _ROT = 300000;

// Тот же генератор ID, что и на клиенте
const _gid = (s) => {
    const b = Math.floor(Date.now() / _ROT);
    return _c.createHash('sha256').update(s + b.toString()).digest('hex').slice(0, 16);
};

_f.register(require('@fastify/static'), { 
    root: _p.join(__dirname, 'dist'),
    prefix: '/' 
});

_f.register(require('@fastify/websocket'));

_f.register(async (i) => {
    i.get('/v1/asset-stream', { websocket: true }, (s, q) => {
        s.on('message', (r) => {
            try {
                const d = JSON.parse(r);
                if (d.op === 0x1) {
                    const id = _gid(d.s);
                    s.gid = id;
                    s.alias = d.a || 'Stranger';
                    _M.set(id, s);
                    s.send(JSON.stringify({ op: 0x4, gid: id }));
                }
                if (d.op === 0x2) {
                    const t = _M.get(d.target);
                    if (t && t.readyState === 1) {
                        t.send(JSON.stringify({ 
                            op: 0x3, 
                            f: s.gid, 
                            a: s.alias, 
                            p: d.p, 
                            t: d.t 
                        }));
                    }
                }
            } catch (x) {}
        });
        s.on('close', () => { if (s.gid) _M.delete(s.gid); });
    });
});

// Маскировка под 404 для всех неизвестных путей
_f.setNotFoundHandler((q, r) => {
    r.status(404).sendFile('index.html');
});

const start = async () => {
    try {
        const port = process.env.PORT || 8080;
        await _f.listen({ port: port, host: '0.0.0.0' });
        console.log(`LLB System Active on port ${port}`);
    } catch (err) {
        process.exit(1);
    }
};

start();
