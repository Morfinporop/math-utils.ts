export interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  type: 'text' | 'voice';
}

export interface Contact {
  displayName: string;
  currentId: string;
  publicKey: string;
  lastSeen: number;
  blocked?: boolean;
  description?: string;
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
  private _ti: ReturnType<typeof setInterval>[] = [];
  private _isAdmin = false;

  constructor() {
    this._ti.push(setInterval(() => this._purge(), 60_000));
    this._ti.push(setInterval(() => this._rotate(), 24 * 3600_000));
    this.addContact('AnoAI_bot', { displayName: 'AnoAI_bot', currentId: 'AnoAI_bot', publicKey: '', lastSeen: Date.now(), description: 'AnoAI — нейросеть LLB мессенджера. Спроси что угодно!' });
  }

  subscribe(fn: Listener) { this._l.add(fn); return () => { this._l.delete(fn); }; }
  private _emit() { this._l.forEach(fn => fn()); }

  setProfile(p: UserProfile) { this._p = p; this._emit(); }
  getProfile() { return this._p; }
  updateProfile(updates: Partial<UserProfile>) { if (this._p) { this._p = { ...this._p, ...updates }; this._emit(); } }

  private async _rotate() {
    if (!this._p) return;
    const { generateRotatingId } = await import('./crypto');
    this._p = { ...this._p, currentId: await generateRotatingId(this._p.seed) };
    this._emit();
  }

  addContact(id: string, c: Contact) { this._c.set(id, c); this._emit(); }
  removeContact(id: string) { if (id === 'AnoAI_bot') return; this._c.delete(id); this._m.delete(id); this._emit(); }
  getContacts() { return new Map(this._c); }
  getContact(id: string) { return this._c.get(id); }
  updateContact(id: string, u: Partial<Contact>) { const c = this._c.get(id); if (c) { this._c.set(id, { ...c, ...u }); this._emit(); } }
  blockContact(id: string) { this.updateContact(id, { blocked: true }); }
  unblockContact(id: string) { this.updateContact(id, { blocked: false }); }

  addMessage(cid: string, msg: Message) { const arr = this._m.get(cid) || []; arr.push(msg); this._m.set(cid, arr); this._emit(); }
  getMessages(cid: string) { return [...(this._m.get(cid) || [])]; }
  getLastMessage(cid: string) { const a = this._m.get(cid); return a?.[a.length - 1]; }
  getMessageCount(cid: string) { return this._m.get(cid)?.length ?? 0; }
  clearMessages(cid: string) { this._m.delete(cid); this._emit(); }
  updateMessage(cid: string, msgId: string, content: string) { const msgs = this._m.get(cid); if (msgs) { const m = msgs.find(x => x.id === msgId); if (m) { m.content = content; this._emit(); } } }

  private _purge() {
    const cutoff = Date.now() - 10 * 3600_000;
    let changed = false;
    this._m.forEach((msgs, key) => {
      const f = msgs.filter(m => m.timestamp > cutoff);
      if (f.length !== msgs.length) { changed = true; f.length ? this._m.set(key, f) : this._m.delete(key); }
    });
    if (changed) this._emit();
  }

  setAdmin(v: boolean) { this._isAdmin = v; this._emit(); }
  isAdmin() { return this._isAdmin; }

  destroy() { this._m.clear(); this._c.clear(); this._p = null; this._isAdmin = false; this._ti.forEach(clearInterval); this._ti = []; this._emit(); }
}

export const store = new EphemeralStore();

export function panicDestroy() {
  store.destroy();
  try { for (let i = 0; i < 100; i++) localStorage.setItem('t'+Math.random(), Math.random().toString(36)); localStorage.clear(); sessionStorage.clear(); } catch {}
}
