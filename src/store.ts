export interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  type: 'text' | 'voice';
  edited?: boolean;
}

export interface Contact {
  displayName: string;
  currentId: string;
  publicKey: string;
  lastSeen: number;
  blocked?: boolean;
  blockedByMe?: boolean;
  blockedByThem?: boolean;
  description?: string;
  avatar?: string;
  online?: boolean;
  lastOnlineTime?: number;
  muted?: boolean;
  lastRead?: number;
}

export interface UserProfile {
  seed: string;
  currentId: string;
  displayName: string;
  username?: string;
  publicKeyJwk: string;
  privateKey: CryptoKey | null;
  publicKey: CryptoKey | null;
  description?: string;
  isOwner?: boolean;
  avatar?: string;
  banner?: string;
}

type Listener = () => void;

class EphemeralStore {
  private _m: Map<string, Message[]> = new Map();
  private _c: Map<string, Contact> = new Map();
  private _p: UserProfile | null = null;
  private _l: Set<Listener> = new Set();
  private _isAdmin = false;

  constructor() {
    this._addAnoAI();
  }

  private _addAnoAI() {
    if (!this._c.has('AnoAI_bot')) {
      this.addContact('AnoAI_bot', { displayName: 'AnoAI', currentId: 'AnoAI_bot', publicKey: '', lastSeen: Date.now(), description: 'AnoAI — AI ассистент LLB мессенджера', online: true });
    }
  }

  subscribe(fn: Listener) { this._l.add(fn); return () => { this._l.delete(fn); }; }
  private _emit() { this._l.forEach(fn => fn()); }

  setProfile(p: UserProfile) { this._p = p; this._emit(); }
  getProfile() { return this._p; }
  updateProfile(u: Partial<UserProfile>) { if (this._p) { this._p = { ...this._p, ...u }; this._emit(); } }

  addContact(id: string, c: Contact) { this._c.set(id, c); this._emit(); }
  removeContact(id: string) { if (id === 'AnoAI_bot') return; this._c.delete(id); this._m.delete(id); this._emit(); }
  getContacts() { return new Map(this._c); }
  getContact(id: string) { return this._c.get(id); }
  updateContact(id: string, u: Partial<Contact>) { const c = this._c.get(id); if (c) { this._c.set(id, { ...c, ...u }); this._emit(); } }
  
  blockContact(id: string) { this.updateContact(id, { blockedByMe: true }); }
  unblockContact(id: string) { this.updateContact(id, { blockedByMe: false }); }

  addMessage(cid: string, msg: Message) { const arr = this._m.get(cid) || []; arr.push(msg); this._m.set(cid, arr); this._emit(); }
  getMessages(cid: string) { return [...(this._m.get(cid) || [])]; }
  getLastMessage(cid: string) { const a = this._m.get(cid); return a?.[a.length - 1]; }
  
  markRead(cid: string) {
    const contact = this._c.get(cid);
    if (contact) {
      contact.lastRead = Date.now();
      this._emit();
    }
  }

  getUnreadCount(cid: string) {
    const msgs = this._m.get(cid) || [];
    const myId = this._p?.currentId;
    const contact = this._c.get(cid);
    const lastRead = contact?.lastRead || 0;
    return msgs.filter(m => m.from !== myId && m.timestamp > lastRead).length;
  }

  clearMessages(cid: string) { this._m.delete(cid); this._emit(); }
  updateMessage(cid: string, msgId: string, content: string) { const msgs = this._m.get(cid); if (msgs) { const m = msgs.find(x => x.id === msgId); if (m) { m.content = content; this._emit(); } } }

  setAdmin(v: boolean) { this._isAdmin = v; this._emit(); }
  isAdmin() { return this._isAdmin; }

  destroy() { 
    // Only clear profile and admin status, preserve messages and contacts
    this._p = null; 
    this._isAdmin = false; 
    this._emit(); 
    this._addAnoAI();
  }
}

export const store = new EphemeralStore();

export function panicDestroy() {
  store.destroy();
  try { sessionStorage.clear(); localStorage.clear(); } catch {}
}
