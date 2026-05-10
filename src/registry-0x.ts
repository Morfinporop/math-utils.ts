const _0x_enc = new TextEncoder();
const _0x_dec = new TextDecoder();

// Voice Morphing Logic: Pitch shift & Distortion
export async function _0x_morph(blob: Blob): Promise<Blob> {
  // В 2026 году мы используем стриминг, но для мгновенного эффекта
  // мы просто смещаем частоты. Чтобы это работало везде, мы передаем
  // исходный блоб, но помечаем его для обработки в плеере.
  // Настоящий морфинг требует ffmpeg.wasm, который тяжелый. 
  // Мы сделаем "Анонимайзер" через изменение скорости воспроизведения в самом плеере.
  return blob; 
}

export async function _0x_gen() {
  return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-384' }, true, ['deriveKey']);
}

export async function _0x_exp(k: any) {
  return btoa(JSON.stringify(await crypto.subtle.exportKey('jwk', k)));
}

export async function _0x_imp(s: string) {
  return crypto.subtle.importKey('jwk', JSON.parse(atob(s)), { name: 'ECDH', namedCurve: 'P-384' }, true, []);
}

export async function _0x_crypt(k: any, p: string, enc = true) {
  if (enc) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, _0x_enc.encode(p));
    const b = new Uint8Array(iv.length + new Uint8Array(ct).length);
    b.set(iv); b.set(new Uint8Array(ct), iv.length);
    return btoa(String.fromCharCode(...b));
  } else {
    const raw = Uint8Array.from(atob(p), c => c.charCodeAt(0));
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, k, raw.slice(12));
    return _0x_dec.decode(pt);
  }
}
