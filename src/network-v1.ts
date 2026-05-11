import { store } from './store';

let _ws: WebSocket | null = null;

export function initNetwork(s: string, alias: string) {
  const p = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  _ws = new WebSocket(`${p}//${window.location.host}/v1/asset-stream`);

  _ws.onopen = () => { _ws?.send(JSON.stringify({ op: 0x1, s, a: alias })); };

  _ws.onmessage = (e) => {
    try {
      const x = JSON.parse(e.data);

      if (x.op === 0x4) {
        const pr = store.getProfile();
        if (pr) store.setProfile({ ...pr, currentId: x.gid });
      }

      if (x.op === 'LOAD') {
        if (x.contacts) {
          for (const cid in x.contacts) {
            const c = x.contacts[cid];
            if (!store.getContact(cid)) {
              store.addContact(cid, { displayName: c.displayName || cid, currentId: cid, publicKey: '', lastSeen: Date.now(), avatar: c.avatar || '', online: false, lastRead: c.lastRead });
            }
          }
        }
        if (x.messages) {
          for (const cid in x.messages) {
            const msgs = x.messages[cid];
            const existingMsgs = store.getMessages(cid);
            const existingIds = new Set(existingMsgs.map(m => m.id));
            if (Array.isArray(msgs)) {
              msgs.forEach((m: any) => {
                if (!existingIds.has(m.id)) {
                  store.addMessage(cid, { id: m.id, from: m.from, to: m.to, content: m.content, timestamp: m.timestamp, type: m.type || 'text' });
                }
              });
            }
          }
        }
      }

      if (x.op === 'ONLINE') store.updateContact(x.gid, { online: true });
      if (x.op === 'OFFLINE') store.updateContact(x.gid, { online: false, lastOnlineTime: Date.now() });

      if (x.op === 'BLOCKED') store.updateContact(x.by, { blockedByThem: true });
      if (x.op === 'UNBLOCKED') store.updateContact(x.by, { blockedByThem: false });

      if (x.op === 'CLEARED') store.clearMessages(x.from);

      if (x.op === 'PROFILE') {
        const c = store.getContact(x.gid);
        if (c) store.updateContact(x.gid, { displayName: x.name || c.displayName, avatar: x.avatar || c.avatar });
      }

      if (x.op === 'WIPE') { store.removeContact(x.target); }

      if (x.op === 'MSG') {
        const msgId = x.id || crypto.randomUUID();
        const existingMsgs = store.getMessages(x.from);
        const exists = existingMsgs.some(m => m.id === msgId);
        if (!exists) {
          if (!store.getContact(x.from)) {
            store.addContact(x.from, { displayName: x.name, currentId: x.from, publicKey: '', lastSeen: Date.now(), online: true, avatar: x.avatar || '' });
          } else {
            store.updateContact(x.from, { online: true, lastSeen: x.ts });
          }
          store.addMessage(x.from, { id: msgId, from: x.from, to: 'me', content: x.content, timestamp: x.ts, type: x.type || 'text' });
        }
      }

      if (x.op === 'MSG_DELETED') {
        store.updateMessage(x.from, x.msgId, '[удалено]');
      }

      if (x.op === 'MSG_EDITED') {
        store.updateMessage(x.from, x.msgId, x.content);
      }
    } catch {}
  };

  _ws.onclose = () => setTimeout(() => initNetwork(s, alias), 2000);
}

export function sendNetMessage(t: string, p: string, y: 'text' | 'voice' = 'text') {
  if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0x2, target: t, p, t: y }));
}
export function sendMarkRead(target: string) {
  if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0xD, target }));
}
export function sendBlock(t: string) { if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0x5, target: t })); }
export function sendUnblock(t: string) { if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0x6, target: t })); }
export function sendClear(t: string) { if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0x7, target: t })); }
export function sendDeleteMsg(target: string, msgId: string) { if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0xE, target, msgId })); }
export function sendEditMsg(target: string, msgId: string, content: string) { if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0xF, target, msgId, content })); }
export function updateProfile(p: any) { if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0x8, profile: p })); }
export function panic() { if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0x9 })); }
export function disconnect() { _ws?.close(); _ws = null; }
export function sendAsAI(t: string, text: string) { if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 0xA, target: t, p: text })); }
