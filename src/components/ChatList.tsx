import { useState } from 'react';
import type { Contact } from '../store';
import { settingsStore } from '../settings-store';
import { IconPlus, IconCopy, IconRobot, IconUser } from '../icons';

interface Props {
  contacts: Map<string, Contact>;
  selectedChat: string | null;
  onSelectChat: (id: string) => void;
  onAddContact: (id: string) => void;
  myId: string;
  onPanic: () => void;
  msgCounts: (id: string) => number;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}

const av: React.CSSProperties = { width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', flexShrink: 0 };

export function ChatList({ contacts, selectedChat, onSelectChat, onAddContact, myId, msgCounts, onContextMenu }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [newId, setNewId] = useState('');
  const [copied, setCopied] = useState(false);
  const t = (key: any) => settingsStore.t(key);

  const handleAdd = () => { if (newId.trim()) { onAddContact(newId.trim()); setNewId(''); setShowAdd(false); } };
  const copyId = () => { navigator.clipboard?.writeText(myId); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <button onClick={() => setShowAdd(!showAdd)} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconPlus size={15} />
          </button>
          <button onClick={copyId} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text3)', fontSize: 10, fontFamily: 'monospace', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
            <IconCopy size={11} /><span>{myId.slice(0, 14)}...</span>
            {copied && <span style={{ color: '#4caf50' }}>{t('copied')}</span>}
          </button>
        </div>
      </div>
      {showAdd && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
          <input type="text" value={newId} onChange={e => setNewId(e.target.value)} placeholder={t('enterId')} autoFocus
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {Array.from(contacts.entries()).length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>{t('noContacts')}</div>
        ) : (
          Array.from(contacts.entries()).map(([id, c]) => (
            <button key={id} onClick={() => onSelectChat(id)} onContextMenu={e => onContextMenu(e, id)}
              style={{ width: '100%', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: selectedChat === id ? 'var(--bg2)' : 'transparent', borderBottom: '1px solid var(--border)', cursor: 'pointer', border: 'none', borderLeft: selectedChat === id ? '3px solid var(--accent)' : '3px solid transparent', color: 'var(--text)', transition: 'all 0.15s' }}>
              <div style={av}>{id === 'AnoAI_bot' ? <IconRobot size={20} /> : <IconUser size={20} />}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.displayName}</span>
                  {c.blocked && <span style={{ fontSize: 9, color: 'var(--danger)' }}>blocked</span>}
                </div>
                {id !== 'AnoAI_bot' && <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace', marginTop: 2 }}>{c.blocked ? (settingsStore.get().lang === 'ru' ? 'был давно' : 'last seen long ago') : (settingsStore.get().lang === 'ru' ? 'в сети' : 'online')}</div>}
              </div>
              {msgCounts(id) > 0 && <span style={{ fontSize: 10, background: 'var(--accent)', color: 'var(--bg)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{msgCounts(id)}</span>}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
