import { store } from './store';

let ws: WebSocket | null = null;

export function initNetwork(seed: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}/v1/asset-stream`);

  ws.onopen = () => {
    ws?.send(JSON.stringify({ op: 0x1, s: seed }));
  };

  ws.onmessage = (e) => {
    try {
      const envelope = JSON.parse(e.data);
      
      // Обработка назначения ID сервером
      if (envelope.op === 0x4) {
        const p = store.getProfile();
        if (p) store.setProfile({ ...p, currentId: envelope.gid });
        return;
      }

      const d = envelope.data;
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

  ws.onclose = () => setTimeout(() => initNetwork(seed), 2000);
}

export function sendNetMessage(target: string, payload: string, type: 'text' | 'voice' = 'text') {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      op: 0x2,
      target: target,
      p: payload,
      t: type
    }));
  }
}
