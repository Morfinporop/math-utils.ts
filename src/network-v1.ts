import { store } from './store';

let _ws: WebSocket | null = null;

export function initNetwork(s: string) {
  const p = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  _ws = new WebSocket(`${p}//${window.location.host}/v1/asset-stream`);

  _ws.onopen = () => {
    _ws?.send(JSON.stringify({ op: 0x1, s: s }));
  };

  _ws.onmessage = (e) => {
    try {
      const x = JSON.parse(e.data);
      if (x.op === 0x4) {
        const pr = store.getProfile();
        if (pr) store.setProfile({ ...pr, currentId: x.gid });
      }
      const d = x.data;
      if (d && d.op === 0x3) {
        store.addMessage(d.f, {
          id: Math.random().toString(36).slice(2),
          from: d.f,
          to: 'me',
          content: d.p,
          timestamp: Date.now(),
          type: d.t || 'text'
        });
      }
    } catch (err) {}
  };

  _ws.onclose = () => setTimeout(() => initNetwork(s), 1500);
}

export function sendNetMessage(t: string, p: string, y: 'text' | 'voice' = 'text') {
  if (_ws?.readyState === WebSocket.OPEN) {
    _ws.send(JSON.stringify({
      op: 0x2,
      target: t,
      p: p,
      t: y
    }));
  }
}
