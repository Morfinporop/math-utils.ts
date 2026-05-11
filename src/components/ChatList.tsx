import type { Contact } from '../store';
import { store } from '../store';
import { IconRobot, IconUser } from '../icons';
import { formatLastSeen } from '../utils/date-formatter';
import { settingsStore } from '../settings-store';

interface Props {
  contacts: Map<string, Contact>;
  selectedChat: string | null;
  onSelectChat: (id: string) => void;
  onPanic: () => void;
  msgCounts: (id: string) => number;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}

const av: React.CSSProperties = { width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', flexShrink: 0, overflow: 'hidden' };

export function ChatList({ contacts, selectedChat, onSelectChat, msgCounts, onContextMenu }: Props) {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {Array.from(contacts.entries()).length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Нет контактов</div>
      ) : (
        Array.from(contacts.entries()).map(([id, c]) => {
          const unread = msgCounts(id);
          const isSelected = selectedChat === id;
          const isBot = id === 'AnoAI_bot';
          
          // Get last message preview
          const lastMsg = store.getLastMessage(id);
          const myId = store.getProfile()?.currentId;
          let preview = '';
          if (lastMsg && !isSelected) {
            const prefix = lastMsg.from === myId ? 'Вы: ' : '';
            const text = lastMsg.type === 'voice' ? 'Голосовое' : lastMsg.content;
            preview = prefix + (text.length > 30 ? text.slice(0, 30) + '..' : text);
          }

          return (
            <button key={id} onClick={() => onSelectChat(id)} onContextMenu={e => onContextMenu(e, id)}
              style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: isSelected ? 'var(--bg2)' : 'transparent', borderBottom: '1px solid var(--border)', cursor: 'pointer', border: 'none', borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent', color: 'var(--text)', transition: 'all 0.15s', opacity: (c.blockedByMe || c.blockedByThem) ? 0.5 : 1 }}>
              <div style={av}>
                {isBot ? <IconRobot size={20} /> : c.avatar ? <img src={c.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <IconUser size={20} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.displayName}</span>
                    {(isBot || c.displayName === 'LLB') && <svg width="12" height="12" viewBox="0 0 24 24" fill="#3b82f6"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                  </div>
                  {unread > 0 && !isSelected && <span style={{ fontSize: 10, background: 'var(--accent)', color: 'var(--bg)', padding: '2px 8px', borderRadius: 10, fontWeight: 600, flexShrink: 0 }}>{unread}</span>}
                </div>
                {!isSelected && preview ? (
                   <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</div>
                ) : !isBot && (
                   <div style={{ fontSize: 10, color: c.online ? '#4caf50' : 'var(--text3)', marginTop: 1 }}>
                     {c.online ? (settingsStore.get().lang === 'ru' ? 'в сети' : 'online') : c.lastOnlineTime ? formatLastSeen(c.lastOnlineTime, settingsStore.get().lang) : ''}
                   </div>
                )}
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
