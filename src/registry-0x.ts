export async function _0x_morph(blob: Blob): Promise<Blob> {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const data = await blob.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(data);
  
  // Moriarty Effect: Deep, Clear, Resonant
  const offlineCtx = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length / 0.78, audioBuffer.sampleRate);
  
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.playbackRate.value = 0.78; // Глубокий тон
  
  // Clarity Filter (Presence)
  const clarity = offlineCtx.createBiquadFilter();
  clarity.type = 'peaking';
  clarity.frequency.value = 2500;
  clarity.Q.value = 1.5;
  clarity.gain.value = 8; // Усиливаем четкость согласных
  
  // Body Filter (Warmth)
  const body = offlineCtx.createBiquadFilter();
  body.type = 'peaking';
  body.frequency.value = 150;
  body.gain.value = 5; // Добавляем веса голосу
  
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.knee.value = 40;
  compressor.ratio.value = 12;
  
  source.connect(body);
  body.connect(clarity);
  clarity.connect(compressor);
  compressor.connect(offlineCtx.destination);
  
  source.start(0);
  const rendered = await offlineCtx.startRendering();
  
  const buffer = rendered.getChannelData(0);
  const wavBuf = new ArrayBuffer(44 + buffer.length * 2);
  const view = new DataView(wavBuf);
  const _s = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  _s(0, 'RIFF'); view.setUint32(4, 32 + buffer.length * 2, true); _s(8, 'WAVE'); _s(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rendered.sampleRate, true); view.setUint32(28, rendered.sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); _s(36, 'data'); view.setUint32(40, buffer.length * 2, true);
  for (let i = 0; i < buffer.length; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([wavBuf], { type: 'audio/wav' });
}

export async function _0x_gen() { return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-384' }, true, ['deriveKey']); }
export async function _0x_exp(k: any) { return btoa(JSON.stringify(await crypto.subtle.exportKey('jwk', k))); }
export async function _0x_imp(s: string) { return crypto.subtle.importKey('jwk', JSON.parse(atob(s)), { name: 'ECDH', namedCurve: 'P-384' }, true, []); }
export async function _0x_crypt(k: any, p: string, enc = true) {
  if (enc) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(p));
    const b = new Uint8Array(iv.length + new Uint8Array(ct).length);
    b.set(iv); b.set(new Uint8Array(ct), iv.length);
    return btoa(String.fromCharCode(...b));
  } else {
    const raw = Uint8Array.from(atob(p), c => c.charCodeAt(0));
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, k, raw.slice(12));
    return new TextDecoder().decode(pt);
  }
}
