export async function _0x_morph(blob: Blob): Promise<Blob> {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const data = await blob.arrayBuffer();
  const ab = await ctx.decodeAudioData(data);
  
  // High quality standard processing
  const oc = new OfflineAudioContext(ab.numberOfChannels, ab.length, ab.sampleRate);
  const src = oc.createBufferSource();
  src.buffer = ab;
  
  // Slight enhancement for clarity
  const clarity = oc.createBiquadFilter();
  clarity.type = 'peaking';
  clarity.frequency.value = 2500;
  clarity.gain.value = 4;
  clarity.Q.value = 1;

  const compressor = oc.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 30;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  src.connect(clarity);
  clarity.connect(compressor);
  compressor.connect(oc.destination);
  
  src.start(0);
  const rendered = await oc.startRendering();
  
  // Encode to WAV
  const buf = rendered.getChannelData(0);
  const wav = new ArrayBuffer(44 + buf.length * 2);
  const v = new DataView(wav);
  const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  
  ws(0, 'RIFF'); v.setUint32(4, 32 + buf.length * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rendered.sampleRate, true); v.setUint32(28, rendered.sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, buf.length * 2, true);
  
  for (let i = 0; i < buf.length; i++) {
    const s = Math.max(-1, Math.min(1, buf[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  
  return new Blob([wav], { type: 'audio/wav' });
}

export async function _0x_gen() { return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-384' }, true, ['deriveKey']); }
export async function _0x_exp(k: any) { return btoa(JSON.stringify(await crypto.subtle.exportKey('jwk', k))); }
export async function _0x_imp(s: string) { return crypto.subtle.importKey('jwk', JSON.parse(atob(s)), { name: 'ECDH', namedCurve: 'P-384' }, true, []); }
export async function _0x_crypt(k: any, p: string, enc = true) {
  const encod = new TextEncoder();
  const decod = new TextDecoder();
  if (enc) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, encod.encode(p));
    const b = new Uint8Array(iv.length + new Uint8Array(ct).length);
    b.set(iv); b.set(new Uint8Array(ct), iv.length);
    return btoa(String.fromCharCode(...b));
  } else {
    const raw = Uint8Array.from(atob(p), c => c.charCodeAt(0));
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, k, raw.slice(12));
    return decod.decode(pt);
  }
}
