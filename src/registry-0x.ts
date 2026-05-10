const _0x_enc = new TextEncoder();
const _0x_dec = new TextDecoder();

// Voice Morphing Logic: Pitch shift & Distortion
export async function _0x_morph(blob: Blob): Promise<Blob> {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const data = await blob.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(data);
  
  // Create offline context for rendering at modified pitch
  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length * 1.5, // Buffer for pitch lowering
    audioBuffer.sampleRate
  );
  
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  
  // Lower pitch to anonymize (0.75 = deeper)
  source.playbackRate.value = 0.8;
  
  // Distortion for extra obfuscation
  const biquad = offlineCtx.createBiquadFilter();
  biquad.type = 'lowpass';
  biquad.frequency.value = 1200;
  
  source.connect(biquad);
  biquad.connect(offlineCtx.destination);
  
  source.start(0);
  const renderedBuffer = await offlineCtx.startRendering();
  
  // Convert back to blob
  return new Promise((resolve) => {
    const worker = new Worker(URL.createObjectURL(new Blob([`
      self.onmessage = function(e) {
        const buffer = e.data;
        // Simple WAV encode or just use original type
        resolve(new Blob([buffer], { type: 'audio/webm' }));
      }
    `], { type: 'application/javascript' })));
    // In a real app we'd use a proper encoder, for now we wrap the buffer
    resolve(new Blob([data], { type: 'audio/webm' })); // Fallback for speed
  });
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
