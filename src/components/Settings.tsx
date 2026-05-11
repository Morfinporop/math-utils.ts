import { useState, useEffect } from 'react';
import { settingsStore, VOICE_PRESETS, type VoicePreset } from '../settings-store';
import { IconX } from '../icons';

interface Props { onClose: () => void; onLogout: () => void; }

export function Settings({ onClose, onLogout }: Props) {
  const [s, setS] = useState(settingsStore.get());
  const t = (key: any) => settingsStore.t(key);
  useEffect(() => { const u = settingsStore.subscribe(() => setS(settingsStore.get())); return () => { u(); }; }, []);

  const btn = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{ flex: 1, padding: 12, borderRadius: 8, fontSize: 13, fontWeight: active ? 700 : 400, border: 'none', cursor: 'pointer', background: active ? 'var(--accent)' : 'var(--bg3)', color: active ? 'var(--bg)' : 'var(--text)' }}>{label}</button>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{t('settings')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}><IconX size={22} /></button>
        </div>

        {/* Lang */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 8 }}>{t('language')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {btn('Русский', s.lang === 'ru', () => settingsStore.setLang('ru'))}
            {btn('English', s.lang === 'en', () => settingsStore.setLang('en'))}
          </div>
        </div>

        {/* Voice Presets */}
        <div style={{ marginBottom: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 12 }}>{t('voicePreset')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {(Object.entries(VOICE_PRESETS) as [VoicePreset, typeof VOICE_PRESETS.normal][]).map(([key, preset]) => (
              <button key={key} onClick={() => settingsStore.setVoicePreset(key)} style={{
                padding: '12px 8px', borderRadius: 10, fontSize: 12, border: 'none', cursor: 'pointer',
                background: s.voicePreset === key ? 'var(--accent)' : 'var(--bg3)',
                color: s.voicePreset === key ? 'var(--bg)' : 'var(--text)',
                fontWeight: s.voicePreset === key ? 700 : 400
              }}>
                {s.lang === 'ru' ? preset.label_ru : preset.label_en}
              </button>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div style={{ padding: 16, border: '2px solid var(--danger)', borderRadius: 12, marginTop: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 700, marginBottom: 12 }}>{t('dangerZone')}</div>
          <button onClick={() => { if (confirm('?')) onLogout(); }} style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: 'var(--danger)', color: '#fff', fontSize: 13, cursor: 'pointer' }}>{t('deleteAccount')}</button>
        </div>
      </div>
    </div>
  );
}
