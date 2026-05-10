const _f = require('fastify')({ logger: false });
const _p = require('path');
const _c = require('crypto');

const _M = new Map();
const _R = 300000;

const _g = (s) => {
    const b = Math.floor(Date.now() / _R);
    return _c.createHash('sha256').update(s + b.toString()).digest('hex').slice(0, 16);
};

_f.register(require('@fastify/static'), { root: _p.join(__dirname, 'dist') });
_f.register(require('@fastify/websocket'));

_f.register(async (i) => {
    i.get('/v1/asset-stream', { websocket: true }, (s, q) => {
        s.on('message', (r) => {
            try {
                const e = JSON.parse(r);
                const d = e.data || e;

                if (d.op === 0x1) {
                    const id = _g(d.s);
                    s.gid = id;
                    _M.set(id, s);
                    s.send(JSON.stringify({ op: 0x4, gid: id }));
                }
                
                if (d.op === 0x2) {
                    const t = _M.get(d.target);
                    if (t && t.readyState === 1) {
                        t.send(JSON.stringify({
                            data: { op: 0x3, f: s.gid, p: d.p, t: d.t }
                        }));
                    }
                }
            } catch (x) {}
        });

        s.on('close', () => {
            if (s.gid) _M.delete(s.gid);
        });
    });
});

_f.setNotFoundHandler((q, r) => { r.status(404).sendFile('index.html'); });

const _port = process.env.PORT || 8080;
_f.listen({ port: _port, host: '0.0.0.0' });
