/*
 * ╔══════════════════════════════════════════╗
 * ║  LLB :: Ephemeral Memory Store          ║
 * ║  RAM-only — Zero persistence            ║
 * ║  Auto-purge: 10h messages, 5m IDs       ║
 * ╚══════════════════════════════════════════╝
 */

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
}

export interface UserProfile {
  seed: string;
  currentId: string;
  displayName: string;
  publicKeyJwk: string;
  privateKey: CryptoKey | null;
  publicKey: CryptoKey | null;
}

type Listener = () => void;

class EphemeralStore {
  private _m: Map<string, Message[]> = new Map();
  private _c: Map<string, Contact> = new Map();
  private _p: UserProfile | null = null;
  private _l: Set<Listener> = new Set();
  private _ti: ReturnType<typeof setInterval>[] = [];

  constructor() {
    // purge old messages every 60s
    this._ti.push(setInterval(() => this._purge(), 60_000));
    // rotate ID every 5min
    this._ti.push(setInterval(() => this._rotate(), 5 * 60_000));
  }

  subscribe(fn: Listener): () => void {
    this._l.add(fn);
    return () => { this._l.delete(fn); };
  }

  private _emit() {
    this._l.forEach(fn => fn());
  }

  // ── Profile ──

  setProfile(p: UserProfile) { this._p = p; this._emit(); }
  getProfile(): UserProfile | null { return this._p; }

  private async _rotate() {
    if (!this._p) return;
    const { generateRotatingId } = await import('./crypto');
    this._p = { ...this._p, currentId: await generateRotatingId(this._p.seed) };
    this._emit();
  }

  // ── Contacts ──

  addContact(id: string, c: Contact) { this._c.set(id, c); this._emit(); }
  removeContact(id: string) { this._c.delete(id); this._m.delete(id); this._emit(); }
  getContacts(): Map<string, Contact> { return new Map(this._c); }
  getContact(id: string): Contact | undefined { return this._c.get(id); }

  // ── Messages ──

  addMessage(cid: string, msg: Message) {
    const arr = this._m.get(cid) || [];
    arr.push(msg);
    this._m.set(cid, arr);
    this._emit();
  }

  getMessages(cid: string): Message[] {
    return [...(this._m.get(cid) || [])];
  }

  getLastMessage(cid: string): Message | undefined {
    const arr = this._m.get(cid);
    return arr?.[arr.length - 1];
  }

  getMessageCount(cid: string): number {
    return this._m.get(cid)?.length ?? 0;
  }

  // ── Purge (10h TTL) ──

  private _purge() {
    const cutoff = Date.now() - 10 * 3600_000;
    let changed = false;
    this._m.forEach((msgs, key) => {
      const filtered = msgs.filter(m => m.timestamp > cutoff);
      if (filtered.length !== msgs.length) {
        changed = true;
        filtered.length ? this._m.set(key, filtered) : this._m.delete(key);
      }
    });
    if (changed) this._emit();
  }

  // ── Nuclear ──

  destroy() {
    this._m.clear();
    this._c.clear();
    this._p = null;
    this._ti.forEach(clearInterval);
    this._ti = [];
    this._emit();
  }
}

export const store = new EphemeralStore();

export function panicDestroy() {
  store.destroy();
  try { 
    // Fill with noise before clearing to overwrite flash cells
    for(let i=0; i<100; i++) {
      localStorage.setItem('temp_'+Math.random(), Math.random().toString(36));
    }
    localStorage.clear(); 
    sessionStorage.clear(); 
    // Final nuke
    window.indexedDB.databases().then(dbs => {
      dbs.forEach(db => window.indexedDB.deleteDatabase(db.name || ''));
    });
  } catch {}
}
