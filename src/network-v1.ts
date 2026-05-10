import { store } from './store';

let _ws: WebSocket | null = null;

export function initNetwork(s: string, alias: string) {
  const p = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  _ws = new WebSocket(`${p}//${window.location.host}/v1/asset-stream`);

  _ws.onopen = () => { _ws?.send(JSON.stringify({ op: 0x1, s, a: alias })); };

  _ws.onmessage = (e) => {
    try {
      const x = JSON.parse(e.data);

      // Got our GID from server
      if (x.op === 0x4) {
        const pr = store.getProfile();
        if (pr) store.setProfile({ ...pr, currentId: x.gid });
      }

      // Server sends saved contacts + messages on connect
      if (x.op === 'LOAD_DATA') {
        // Load contacts
        if (x.contacts) {
          for (const cid in x.contacts) {
            const c = x.contacts[cid];
            if (!store.getContact(cid)) {
              store.addContact(cid, { displayName: c.displayName || cid, currentId: cid, publicKey: '', lastSeen: Date.now(), avatar: c.avatar, blocked: c.blocked });
            }
          }
        }
        // Load messages
        if (x.messages) {
          for (const cid in x.messages) {
            const msgs = x.messages[cid];
            if (Array.isArray(msgs)) {
              msgs.forEach((m: any) => {
                store.addMessage(cid, { id: m.id, from: m.from, to: m.to, content: m.content, timestamp: m.timestamp, type: m.type || 'text' });
              });
            }
          }
        }
      }

      if (x.op === 'REMOTE_WIPE') store.removeContact(x.target);
      
      if (x.op === 'STATUS') {
        const c = store.getContact(x.gid);
        if (c) {
          if (x.status === 'online') store.updateContact(x.gid, { online: true });
          else store.updateContact(x.gid, { online: false, lastOnlineTime: Date.now() });
        }
      }

      if (x.op === 'BLOCKED_BY') store.updateContact(x.from, { blockedByThem: true });
      if (x.op === 'UNBLOCKED_BY') store.updateContact(x.from, { blockedByThem: false });
      if (x.op === 'CLEAR_CHAT') store.clearMessages(x.from);
      if (x.op === 'DELETE_CHAT') { store.clearMessages(x.from); store.removeContact(x.from); }
      
      if (x.op === 'PROFILE_UPDATE') {
        const c = store.getContact(x.gid);
        if (c) store.updateContact(x.gid, { displayName: x.name || c.displayName, avatar: x.avatar || c.avatar });
      }

      if (x.op === 'ADMIN_ACCESS') {
        store.setAdmin(true);
        if (x.users && (window as any).__adminCallback) (window as any).__adminCallback(x.users);
      }

      // Incoming message
      if (x.op === 0x3) {
        const f = x.f;
        const a = x.a || 'U';
        if (!store.getContact(f)) {
          store.addContact(f, { displayName: a, currentId: f, publicKey: '', lastSeen: Date.now(), online: true, avatar: x.av || '' });
        } else {
          store.updateContact(f, { online: true, lastSeen: Date.now() });
        }
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
export function sendDeleteChat(target: string) {
  if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0xC, target }));
}
export function sendAsAI(target: string, text: string) {
  if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0xA, target, p: text }));
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
