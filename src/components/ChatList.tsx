import { useState } from 'react';
import type { Contact } from '../store';
import { IconPlus, IconX, IconSearch, IconCopy, IconRefresh, IconShield } from '../icons';

interface Props {
  contacts: Map<string, Contact>;
  selectedChat: string | null;
  onSelectChat: (id: string) => void;
  onAddContact: (id: string, name: string) => void;
  myId: string;
  onPanic: () => void;
  msgCounts: (id: string) => number;
}

export function ChatList({ contacts, selectedChat, onSelectChat, onAddContact, myId, onPanic, msgCounts }: Props) {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [copied, setCopied] = useState(false);
  const [showFullId, setShowFullId] = useState(false);

  const filtered = Array.from(contacts.entries()).filter(
    ([id, c]) => c.displayName.toLowerCase().includes(search.toLowerCase()) || id.includes(search)
  );

  const handleAdd = () => {
    if (newId.trim() && newName.trim()) {
      onAddContact(newId.trim(), newName.trim());
      setNewId(''); setNewName(''); setShowAdd(false);
    }
  };

  const copyId = () => {
    navigator.clipboard?.writeText(myId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-abyss border-r border-border">

      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <IconShield size={16} className="text-text-muted" />
            <span className="text-xs font-bold text-text-secondary tracking-[0.25em] uppercase">LLB</span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="w-7 h-7 rounded border border-border bg-void flex items-center justify-center text-text-muted hover:text-text-secondary hover:border-border-light transition-colors"
              title="Add contact"
            >
              <IconPlus size={13} />
            </button>
            <button
              onClick={onPanic}
              className="w-7 h-7 rounded border border-border bg-void flex items-center justify-center text-danger hover:bg-danger/10 transition-colors"
              title="Destroy all data"
            >
              <IconX size={13} />
            </button>
          </div>
        </div>

        {/* My ID */}
        <div className="flex items-center gap-2 mb-3 group">
          <button
            onClick={() => setShowFullId(!showFullId)}
            className="flex-1 text-left text-[10px] text-text-ghost hover:text-text-muted transition-colors font-mono truncate"
          >
            {showFullId ? myId : `${myId.slice(0, 8)}····${myId.slice(-6)}`}
          </button>
          <button onClick={copyId} className="flex-shrink-0 text-text-ghost hover:text-text-muted transition-colors" title="Copy ID">
            <IconCopy size={12} />
          </button>
          <IconRefresh size={10} className="text-text-ghost animate-pulse-slow flex-shrink-0" />
        </div>
        {copied && (
          <div className="text-[9px] text-text-muted mb-2 animate-slide-up">copied to clipboard</div>
        )}

        {/* Search */}
        <div className="relative">
          <IconSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost" />
          <input
            type="text"
            placeholder="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-void border border-border rounded pl-8 pr-3 py-2 text-xs text-text-secondary placeholder-text-ghost focus:outline-none focus:border-border-light transition-colors"
          />
        </div>
      </div>

      {/* Add Contact */}
      {showAdd && (
        <div className="p-3 border-b border-border bg-surface space-y-2 animate-slide-up">
          <input
            type="text"
            placeholder="contact id"
            value={newId}
            onChange={e => setNewId(e.target.value)}
            className="w-full bg-void border border-border rounded px-3 py-1.5 text-xs text-text-secondary placeholder-text-ghost focus:outline-none focus:border-border-light font-mono"
            autoFocus
          />
          <input
            type="text"
            placeholder="alias"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full bg-void border border-border rounded px-3 py-1.5 text-xs text-text-secondary placeholder-text-ghost focus:outline-none focus:border-border-light"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            className="w-full border border-border bg-elevated text-text-muted rounded py-1.5 text-[10px] uppercase tracking-wider hover:text-text-secondary hover:border-border-light transition-colors"
          >
            Add
          </button>
        </div>
      )}

      {/* Contacts */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-text-ghost text-xs">
            {search ? 'no results' : 'no contacts'}
          </div>
        ) : (
          filtered.map(([id, contact]) => {
            const count = msgCounts(id);
            return (
              <button
                key={id}
                onClick={() => onSelectChat(id)}
                className={`w-full text-left p-3 border-b border-border/50 transition-all ${
                  selectedChat === id
                    ? 'bg-surface border-l-2 border-l-accent'
                    : 'hover:bg-surface/50 border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded border border-border bg-void flex items-center justify-center text-text-muted text-xs font-mono flex-shrink-0">
                    {contact.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary truncate">
                        {contact.displayName}
                      </span>
                      {count > 0 && (
                        <span className="text-[9px] text-text-ghost ml-2">{count}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-text-ghost font-mono truncate mt-0.5">
                      {contact.currentId.slice(0, 16)}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center justify-center gap-3 text-[8px] text-text-ghost uppercase tracking-widest">
          <span>E2E</span>
          <span className="w-0.5 h-0.5 rounded-full bg-text-ghost" />
          <span>AES-256</span>
          <span className="w-0.5 h-0.5 rounded-full bg-text-ghost" />
          <span>Ephemeral</span>
        </div>
      </div>
    </div>
  );
}
