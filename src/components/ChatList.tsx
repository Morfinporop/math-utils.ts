import { useState } from 'react';
import type { Contact } from '../store';
import { settingsStore } from '../settings-store';
import { IconCopy, IconRobot, IconUser, IconSearch } from '../icons';

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

interface SearchResult { gid: string; name: string; username: string; isOwner: boolean; }

export function ChatList({ contacts, selectedChat, onSelectChat, onAddContact, myId, msgCounts, onContextMenu }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const t = (key: any) => settingsStore.t(key);

  const copyId = () => { navigator.clipboard?.writeText(myId); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const doSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        // Filter out self and already added contacts
        setSearchResults(data.filter((r: SearchResult) => r.gid !== myId && !contacts.has(r.gid)));
      }
    } catch {} finally { setSearching(false); }
  };

  const addUser = (r: SearchResult) => {
    onAddContact(r.gid);
    setSearchQuery('');
    setSearchResults([]);
    onSelectChat(r.gid);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Search */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg2)', borderRadius: 10, padding: '0 12px', border: '1px solid var(--border)' }}>
          <IconSearch size={14} />
          <input type="text" value={searchQuery} onChange={e => doSearch(e.target.value)}
            placeholder={settingsStore.get().lang === 'ru' ? 'Найти пользователя...' : 'Find user...'}
            style={{ flex: 1, padding: '10px 0', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
        </div>
        <button onClick={copyId} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text3)', fontSize: 10, fontFamily: 'monospace', cursor: 'pointer', padding: '6px 0', width: '100%', textAlign: 'left' }}>
          <IconCopy size={10} />
          <span>ID: {myId.slice(0, 14)}...</span>
          {copied && <span style={{ color: '#4caf50' }}>{t('copied')}</span>}
        </button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          {searchResults.map(r => (
            <button key={r.gid} onClick={() => addUser(r)} style={{
              width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
              background: 'var(--bg2)', borderBottom: '1px solid var(--border)', cursor: 'pointer', border: 'none', color: 'var(--text)'
            }}>
              <div style={av}><IconUser size={18} /></div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</span>
                  {r.isOwner && <svg width="12" height="12" viewBox="0 0 24 24" fill="#3b82f6"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>@{r.username}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {searching && <div style={{ padding: 12, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>...</div>}

      {/* Contact List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {Array.from(contacts.entries()).length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>{t('noContacts')}</div>
        ) : (
          Array.from(contacts.entries()).map(([id, c]) => (
            <button key={id} onClick={() => onSelectChat(id)} onContextMenu={e => onContextMenu(e, id)}
              style={{ width: '100%', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: selectedChat === id ? 'var(--bg2)' : 'transparent', borderBottom: '1px solid var(--border)', cursor: 'pointer', border: 'none', borderLeft: selectedChat === id ? '3px solid var(--accent)' : '3px solid transparent', color: 'var(--text)', transition: 'all 0.15s', opacity: c.blocked ? 0.5 : 1 }}>
              <div style={av}>{id === 'AnoAI_bot' ? <IconRobot size={20} /> : <IconUser size={20} />}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.displayName}</span>
                  {(id === 'AnoAI_bot' || c.displayName === 'LLB') && <svg width="12" height="12" viewBox="0 0 24 24" fill="#3b82f6"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                </div>
                {id !== 'AnoAI_bot' && <div style={{ fontSize: 10, color: c.blocked ? 'var(--danger)' : 'var(--text3)' }}>{c.blocked ? (settingsStore.get().lang === 'ru' ? 'заблокирован' : 'blocked') : (settingsStore.get().lang === 'ru' ? 'в сети' : 'online')}</div>}
              </div>
              {msgCounts(id) > 0 && <span style={{ fontSize: 10, background: 'var(--accent)', color: 'var(--bg)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{msgCounts(id)}</span>}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
