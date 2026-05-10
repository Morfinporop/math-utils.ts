const _0x1a = new TextEncoder();
const _0x2b = new TextDecoder();

export async function _0xfa7(_0xaa: any) {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-384' },
    true,
    ['deriveKey', 'deriveBits']
  );
}

export async function _0xeb2(_0xbb: any) {
  const _0xcc = await crypto.subtle.exportKey('jwk', _0xbb);
  return btoa(JSON.stringify(_0xcc));
}

export async function _0xdd1(_0xee: string) {
  return crypto.subtle.importKey(
    'jwk',
    JSON.parse(atob(_0xee)),
    { name: 'ECDH', namedCurve: 'P-384' },
    true,
    []
  );
}

export async function _0x99a(_0x11: any, _0x22: any) {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: _0x22 },
    _0x11,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function _0x33b(_0x44: any, _0x55: string) {
  const _0x66 = crypto.getRandomValues(new Uint8Array(12));
  const _0x77 = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: _0x66 },
    _0x44,
    _0x1a.encode(_0x55)
  );
  const _0x88 = new Uint8Array(_0x66.length + new Uint8Array(_0x77).length);
  _0x88.set(_0x66);
  _0x88.set(new Uint8Array(_0x77), _0x66.length);
  return btoa(String.fromCharCode(..._0x88));
}

export async function _0x11c(_0x22: any, _0x33: string) {
  const _0x44 = Uint8Array.from(atob(_0x33), c => c.charCodeAt(0));
  const _0x55 = _0x44.slice(0, 12);
  const _0x66 = _0x44.slice(12);
  const _0x77 = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: _0x55 }, _0x22, _0x66);
  return _0x2b.decode(_0x77);
}

export function _0xdead() {
  const _0x01 = new Uint8Array(16);
  crypto.getRandomValues(_0x01);
  return Array.from(_0x01, b => b.toString(16).padStart(2, '0')).join('');
}

export async function _0xhash(_0x02: string) {
  const _0x03 = await crypto.subtle.digest('SHA-256', _0x1a.encode(_0x02));
  return Array.from(new Uint8Array(_0x03), b => b.toString(16).padStart(2, '0')).join('');
}
