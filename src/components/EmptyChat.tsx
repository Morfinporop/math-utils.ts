import { settingsStore } from '../settings-store';
import { IconSend } from '../icons';

export function EmptyChat() {
  const t = (key: any) => settingsStore.t(key);
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 12 }}>
      <IconSend size={40} />
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>LLB</div>
      <div style={{ fontSize: 13, color: 'var(--text3)' }}>{t('llbFull')}</div>
    </div>
  );
}
