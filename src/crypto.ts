/*
 * ╔══════════════════════════════════════════╗
 * ║  LLB :: Cryptographic Core              ║
 * ║  AES-256-GCM + ECDH P-384              ║
 * ║  Web Crypto API — No dependencies       ║
 * ╚══════════════════════════════════════════╝
 */

const _e = new TextEncoder();
const _d = new TextDecoder();

// ── Key Generation ──────────────────────────

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-384' },
    true,
    ['deriveKey', 'deriveBits']
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey('jwk', key);
  return JSON.stringify(jwk);
}

export async function importPublicKey(jwkStr: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    JSON.parse(jwkStr),
    { name: 'ECDH', namedCurve: 'P-384' },
    true,
    []
  );
}

// ── Key Derivation ──────────────────────────

export async function deriveSharedKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ── Encryption ──────────────────────────────

export async function encryptMessage(
  key: CryptoKey,
  plaintext: string
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    _e.encode(plaintext)
  );
  const buf = new Uint8Array(iv.length + new Uint8Array(ct).length);
  buf.set(iv);
  buf.set(new Uint8Array(ct), iv.length);
  return btoa(String.fromCharCode(...buf));
}

export async function decryptMessage(
  key: CryptoKey,
  encrypted: string
): Promise<string> {
  const raw = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const ct = raw.slice(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return _d.decode(pt);
}

// ── Ephemeral Identity ──────────────────────

export function generateEphemeralId(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashData(data: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', _e.encode(data));
  return Array.from(new Uint8Array(h), b => b.toString(16).padStart(2, '0')).join('');
}

export function getRotationEpoch(): number {
  return Math.floor(Date.now() / (5 * 60 * 1000));
}

export async function generateRotatingId(seed: string): Promise<string> {
  const epoch = getRotationEpoch();
  return hashData(seed + '::' + epoch.toString(36));
}

// ── HMAC Signing ────────────────────────────

export async function createHmacKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  );
}

export async function signData(key: CryptoKey, data: string): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', key, _e.encode(data));
  return Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, '0')).join('');
}
