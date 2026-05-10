export async function _0x_morph(blob: Blob): Promise<Blob> {
  const { settingsStore } = await import('./settings-store');
  const voice = settingsStore.getVoice();
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const data = await blob.arrayBuffer();
  const ab = await ctx.decodeAudioData(data);
  const oc = new OfflineAudioContext(ab.numberOfChannels, Math.floor(ab.length / voice.pitch), ab.sampleRate);
  const src = oc.createBufferSource(); src.buffer = ab; src.playbackRate.value = voice.pitch;
  const f1 = oc.createBiquadFilter(); f1.type = 'peaking'; f1.frequency.value = voice.clarity; f1.gain.value = 12; f1.Q.value = 2;
  const f2 = oc.createBiquadFilter(); f2.type = 'lowshelf'; f2.frequency.value = 200; f2.gain.value = 8;
  const comp = oc.createDynamicsCompressor(); comp.threshold.value = -15; comp.ratio.value = 8;
  src.connect(f2); f2.connect(f1); f1.connect(comp); comp.connect(oc.destination);
  src.start(0);
  const rendered = await oc.startRendering();
  const buf = rendered.getChannelData(0);
  const wav = new ArrayBuffer(44 + buf.length * 2); const v = new DataView(wav);
  const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0,'RIFF'); v.setUint32(4,32+buf.length*2,true); ws(8,'WAVE'); ws(12,'fmt ');
  v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
  v.setUint32(24,rendered.sampleRate,true); v.setUint32(28,rendered.sampleRate*2,true);
  v.setUint16(32,2,true); v.setUint16(34,16,true); ws(36,'data'); v.setUint32(40,buf.length*2,true);
  for (let i = 0; i < buf.length; i++) { const s = Math.max(-1,Math.min(1,buf[i])); v.setInt16(44+i*2, s<0?s*0x8000:s*0x7FFF, true); }
  return new Blob([wav], { type: 'audio/wav' });
}
