import type { Contact } from '../store';
import { settingsStore } from '../settings-store';
import { IconRobot, IconUser } from '../icons';

interface Props {
  contacts: Map<string, Contact>;
  selectedChat: string | null;
  onSelectChat: (id: string) => void;
  onPanic: () => void;
  msgCounts: (id: string) => number;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}

const av: React.CSSProperties = { width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', flexShrink: 0 };

export function ChatList({ contacts, selectedChat, onSelectChat, msgCounts, onContextMenu }: Props) {
  const t = (key: any) => settingsStore.t(key);

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {Array.from(contacts.entries()).length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>{t('noContacts')}</div>
      ) : (
        Array.from(contacts.entries()).map(([id, c]) => (
          <button key={id} onClick={() => onSelectChat(id)} onContextMenu={e => onContextMenu(e, id)}
            style={{ width: '100%', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: selectedChat === id ? 'var(--bg2)' : 'transparent', borderBottom: '1px solid var(--border)', cursor: 'pointer', border: 'none', borderLeft: selectedChat === id ? '3px solid var(--accent)' : '3px solid transparent', color: 'var(--text)', transition: 'all 0.15s', opacity: c.blocked ? 0.5 : 1 }}>
            <div style={{ ...av, overflow: 'hidden' }}>
              {id === 'AnoAI_bot' ? <IconRobot size={20} /> : c.avatar ? <img src={c.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <IconUser size={20} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.displayName}</span>
                {(id === 'AnoAI_bot' || c.displayName === 'LLB') && <svg width="12" height="12" viewBox="0 0 24 24" fill="#3b82f6"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
              </div>
              {id !== 'AnoAI_bot' && <div style={{ fontSize: 10, color: c.blocked ? 'var(--danger)' : c.online ? '#4caf50' : 'var(--text3)' }}>
                {c.blocked 
                  ? (settingsStore.get().lang === 'ru' ? 'был давно' : 'last seen long ago')
                  : c.online 
                    ? (settingsStore.get().lang === 'ru' ? 'в сети' : 'online')
                    : c.lastOnlineTime 
                      ? `${settingsStore.get().lang === 'ru' ? 'был' : 'last seen'} ${new Date(c.lastOnlineTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : (settingsStore.get().lang === 'ru' ? 'не в сети' : 'offline')
                }
              </div>}
            </div>
            {msgCounts(id) > 0 && <span style={{ fontSize: 10, background: 'var(--accent)', color: 'var(--bg)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{msgCounts(id)}</span>}
          </button>
        ))
      )}
    </div>
  );
}
