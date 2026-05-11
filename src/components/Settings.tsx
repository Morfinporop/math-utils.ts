import { useState, useEffect } from 'react';
import { settingsStore } from '../settings-store';
import { IconX, IconLogout } from '../icons';

interface Props { onClose: () => void; onLogout: () => void; }

export function Settings({ onClose, onLogout }: Props) {
  const [s, setS] = useState(settingsStore.get());
  const t = (key: any) => settingsStore.t(key);
  useEffect(() => { const u = settingsStore.subscribe(() => setS(settingsStore.get())); return () => { u(); }; }, []);

  const btn = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{ flex: 1, padding: 12, borderRadius: 8, fontSize: 13, fontWeight: active ? 700 : 400, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: active ? 'var(--accent)' : 'var(--bg3)', color: active ? 'var(--bg)' : 'var(--text)' }}>{label}</button>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{t('settings')}</h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={onLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }} title={t('logout')}>
              <IconLogout size={22} />
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
              <IconX size={22} />
            </button>
          </div>
        </div>

        {/* Lang */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 8 }}>{t('language')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {btn('Русский', s.lang === 'ru', () => settingsStore.setLang('ru'))}
            {btn('English', s.lang === 'en', () => settingsStore.setLang('en'))}
          </div>
        </div>

        {/* Translation Toggle */}
        <div style={{ marginBottom: 24, padding: '16px 0', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: 'var(--text)' }}>{t('translate')}</span>
            <button 
              onClick={() => settingsStore.setTranslate(!s.translate)}
              style={{ width: 44, height: 24, borderRadius: 20, background: s.translate ? 'var(--accent)' : 'var(--bg3)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}
            >
              <div style={{ position: 'absolute', top: 3, left: s.translate ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: s.translate ? 'var(--bg)' : 'var(--text2)', transition: 'all 0.2s' }} />
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div style={{ padding: 16, border: '2px solid var(--danger)', borderRadius: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 700, marginBottom: 12 }}>{t('dangerZone')}</div>
          <button onClick={() => { if (confirm('?')) onLogout(); }} style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: 'var(--danger)', color: '#fff', fontSize: 13, cursor: 'pointer' }}>{t('deleteAccount')}</button>
        </div>
      </div>
    </div>
  );
}
