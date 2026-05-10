/* LLB NETWORK BRIDGE */
import { store } from './store';

let ws: WebSocket | null = null;

export function initNetwork(seed: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  ws = new WebSocket(`${protocol}//${host}/v1/asset-stream`);

  ws.onopen = () => {
    ws?.send(JSON.stringify({ op: 0x1, s: seed }));
  };

  ws.onmessage = (e) => {
    try {
      const d = JSON.parse(e.data);
      if (d.op === 0x3) { // RECV
        store.addMessage(d.f, {
          id: Math.random().toString(36),
          from: d.f,
          to: 'me',
          content: d.p,
          timestamp: Date.now(),
          type: d.t || 'text'
        });
      }
    } catch (err) {}
  };

  ws.onclose = () => {
    setTimeout(() => initNetwork(seed), 3000); // Auto-reconnect
  };
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
