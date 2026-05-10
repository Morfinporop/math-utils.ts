import { store } from './store';

let _ws: WebSocket | null = null;

export function initNetwork(s: string, alias: string) {
  const p = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  _ws = new WebSocket(`${p}//${window.location.host}/v1/asset-stream`);

  _ws.onopen = () => { _ws?.send(JSON.stringify({ op: 0x1, s, a: alias })); };

  _ws.onmessage = (e) => {
    try {
      const x = JSON.parse(e.data);
      if (x.op === 0x4) { const pr = store.getProfile(); if (pr) store.setProfile({ ...pr, currentId: x.gid }); }
      if (x.op === 'REMOTE_WIPE') store.removeContact(x.target);
      if (x.op === 'STATUS') store.updateContact(x.gid, { lastSeen: Date.now() });
      if (x.op === 'BLOCKED_BY') store.updateContact(x.from, { blocked: true });
      if (x.op === 'UNBLOCKED_BY') store.updateContact(x.from, { blocked: false });
      if (x.op === 'CLEAR_CHAT') store.clearMessages(x.from);
      if (x.op === 'PROFILE_UPDATE') {
        const c = store.getContact(x.gid);
        if (c) store.updateContact(x.gid, { displayName: x.name || c.displayName });
      }
      if (x.op === 'ADMIN_ACCESS') {
        store.setAdmin(true);
        if (x.users && (window as any).__adminCallback) (window as any).__adminCallback(x.users);
      }
      if (x.op === 0x3) {
        const f = x.f; const a = x.a || 'U';
        if (!store.getContact(f)) store.addContact(f, { displayName: a, currentId: f, publicKey: '', lastSeen: Date.now() });
        store.addMessage(f, { id: Math.random().toString(36).slice(2), from: f, to: 'me', content: x.p, timestamp: Date.now(), type: x.t || 'text' });
      }
    } catch {}
  };

  _ws.onclose = () => setTimeout(() => initNetwork(s, alias), 2000);
}

export function sendNetMessage(t: string, p: string, y: 'text' | 'voice' = 'text') {
  if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0x2, target: t, p, t: y }));
}

export function sendBlock(target: string) {
  if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0x5, target }));
}

export function sendUnblock(target: string) {
  if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0x6, target }));
}

export function sendClearChat(target: string) {
  if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0x7, target }));
}

export function sendAsAI(target: string, text: string) {
  if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0xA, target, p: text }));
}

export function sendAsUser(target: string, asUser: string, asName: string, text: string) {
  if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0xB, target, asUser, asName, p: text }));
}

export function updateServerProfile(profile: any) {
  if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0x8, profile }));
}

export function triggerPanic() {
  if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0x9 }));
}

export function authAdmin() {
  if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0x777 }));
}
