export async function _0x_morph(blob: Blob): Promise<Blob> {
  const { settingsStore } = await import('./settings-store');
  const v = settingsStore.getVoice();
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const data = await blob.arrayBuffer();
  const ab = await ctx.decodeAudioData(data);
  const oc = new OfflineAudioContext(ab.numberOfChannels, Math.floor(ab.length / v.pitch), ab.sampleRate);
  
  const src = oc.createBufferSource();
  src.buffer = ab;
  src.playbackRate.value = v.pitch;
  
  // Clarity filter
  const f1 = oc.createBiquadFilter();
  f1.type = 'peaking';
  f1.frequency.value = v.clarity;
  f1.gain.value = 10;
  f1.Q.value = 2;

  // Bass
  const f2 = oc.createBiquadFilter();
  f2.type = 'lowshelf';
  f2.frequency.value = 200;
  f2.gain.value = v.bass;

  // Compressor
  const comp = oc.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.ratio.value = 8;
  
  src.connect(f2);
  f2.connect(f1);

  // Distortion for Moriarty/Robot
  if (v.distortion) {
    const shaper = oc.createWaveShaper();
    const curve = new Float32Array(44100);
    for (let i = 0; i < 44100; i++) {
      const x = (i * 2) / 44100 - 1;
      curve[i] = (Math.PI + 6) * x / (Math.PI + 6 * Math.abs(x));
    }
    shaper.curve = curve;
    f1.connect(shaper);
    shaper.connect(comp);
  } else {
    f1.connect(comp);
  }
  
  comp.connect(oc.destination);
  src.start(0);
  const rendered = await oc.startRendering();
  
  const buf = rendered.getChannelData(0);
  const wav = new ArrayBuffer(44 + buf.length * 2);
  const dv = new DataView(wav);
  const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); dv.setUint32(4, 32 + buf.length * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, rendered.sampleRate, true); dv.setUint32(28, rendered.sampleRate * 2, true);
  dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); ws(36, 'data'); dv.setUint32(40, buf.length * 2, true);
  for (let i = 0; i < buf.length; i++) {
    const s = Math.max(-1, Math.min(1, buf[i]));
    dv.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([wav], { type: 'audio/wav' });
}
