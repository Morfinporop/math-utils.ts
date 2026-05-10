import { settingsStore } from '../settings-store';
import { IconX } from '../icons';

interface Props { users: any[]; onClose: () => void; onSelectUser: (id: string) => void; }

export function AdminPanel({ users, onClose, onSelectUser }: Props) {
  const t = (key: any) => settingsStore.t(key);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, background: 'var(--bg2)', border: '2px solid #ff4444', borderRadius: 14, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#ff4444' }}>{t('admin')}</h2>
          <button onClick={onClose} style={{ color: 'var(--text3)', cursor: 'pointer', background: 'none', border: 'none' }}><IconX size={20} /></button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>{t('users')}: {users.length}</div>
        <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.length === 0 ? <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>-</div> : users.map((u, i) => (
            <div key={i} style={{ padding: 14, background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{u.a}</div>
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text3)' }}>ID: {u.id}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>IP: {u.ip}</div>
              </div>
              <button onClick={() => { onSelectUser(u.id); onClose(); }} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer' }}>Chat</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
