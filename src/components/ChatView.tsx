import { useState, useRef, useEffect } from 'react';
import type { Message, Contact } from '../store';
import { IconSend, IconMic, IconStop, IconTrash, IconClock, IconLock, IconWaveform } from '../icons';

interface Props {
  contact: Contact;
  contactId: string;
  messages: Message[];
  myId: string;
  onSendMessage: (text: string) => void;
  onSendVoice: (blob: Blob) => void;
  onDeleteChat: () => void;
}

export function ChatView({ contact, contactId, messages, myId, onSendMessage, onSendVoice, onDeleteChat }: Props) {
  const [text, setText] = useState('');
  const [isRec, setIsRec] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const t = text.trim();
    if (t) { onSendMessage(t); setText(''); }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm',
      });
      mrRef.current = mr;
      chunks.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = async () => {
        const rawBlob = new Blob(chunks.current, { type: 'audio/webm' });
        const { _0x_morph } = await import('../registry-0x');
        const morphedBlob = await _0x_morph(rawBlob);
        onSendVoice(morphedBlob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setIsRec(true); setRecTime(0);
      timer.current = setInterval(() => setRecTime(t => t + 1), 1000);
    } catch { /* mic unavailable */ }
  };

  const stopRec = () => {
    setTimeout(() => {
      mrRef.current?.stop(); setIsRec(false);
      if (timer.current) clearInterval(timer.current);
    }, 400); // Задержка для захвата хвоста звука
  };

  const fmtTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const fmtRec = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Time until purge
  const oldest = messages[0];
  const ttl = oldest ? Math.max(0, 10 * 3600_000 - (Date.now() - oldest.timestamp)) : 0;
  const ttlH = Math.floor(ttl / 3600_000);
  const ttlM = Math.floor((ttl % 3600_000) / 60_000);

  return (
    <div className="flex flex-col h-full bg-void">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-abyss">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-border bg-void flex items-center justify-center text-text-muted text-xs font-mono">
            {contact.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-xs text-text-secondary">{contact.displayName}</div>
            <div className="text-[9px] text-text-ghost font-mono">{contactId.slice(0, 20)}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {oldest && (
            <div className="flex items-center gap-1 text-text-ghost">
              <IconClock size={10} />
              <span className="text-[9px] font-mono">{ttlH}h{ttlM}m</span>
            </div>
          )}
          <button
            onClick={onDeleteChat}
            className="text-text-ghost hover:text-danger transition-colors"
            title="Delete chat"
          >
            <IconTrash size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <IconLock size={32} className="text-text-ghost mx-auto mb-3" />
              <div className="text-text-muted text-xs">E2E encrypted channel</div>
              <div className="text-text-ghost text-[10px] mt-1">Auto-purge: 10h</div>
            </div>
          </div>
        ) : (
          messages.map(msg => {
            const mine = msg.from === myId;
            return (
              <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                <div className={`max-w-[75%] rounded px-3 py-2 ${
                  mine
                    ? 'bg-elevated border border-border text-text-secondary'
                    : 'bg-surface border border-border text-text-secondary'
                }`}>
                  {msg.type === 'voice' ? (
                    <div className="flex items-center gap-2">
                      <IconWaveform size={14} className="text-text-muted flex-shrink-0" />
                      <audio 
                        controls 
                        className="h-7 max-w-[180px] opacity-80" 
                        style={{ filter: 'invert(1) contrast(200%)' }}
                        onPlay={(e) => { e.currentTarget.playbackRate = 0.85; }}
                      >
                        <source src={msg.content} />
                      </audio>
                    </div>
                  ) : (
                    <div className="text-xs whitespace-pre-wrap break-words leading-relaxed">{msg.content}</div>
                  )}
                  <div className={`text-[9px] mt-1 font-mono ${mine ? 'text-text-ghost text-right' : 'text-text-ghost'}`}>
                    {fmtTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-abyss">
        {isRec ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
              <span className="text-xs text-text-secondary font-mono">{fmtRec(recTime)}</span>
              <span className="text-[10px] text-text-ghost">recording</span>
            </div>
            <button
              onClick={stopRec}
              className="w-8 h-8 rounded border border-danger/30 bg-danger/5 flex items-center justify-center text-danger hover:bg-danger/10 transition-colors"
            >
              <IconStop size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={onKey}
              placeholder="..."
              rows={1}
              className="flex-1 bg-void border border-border rounded px-3 py-2 text-xs text-text-secondary placeholder-text-ghost focus:outline-none focus:border-border-light resize-none transition-colors"
            />
            <button
              onClick={startRec}
              className="w-8 h-8 rounded border border-border bg-void flex items-center justify-center text-text-muted hover:text-text-secondary hover:border-border-light transition-colors"
              title="Voice"
            >
              <IconMic size={14} />
            </button>
            <button
              onClick={send}
              disabled={!text.trim()}
              className="w-8 h-8 rounded border border-border bg-elevated flex items-center justify-center text-text-muted hover:text-text-secondary hover:border-border-light transition-colors disabled:opacity-15 disabled:cursor-not-allowed"
            >
              <IconSend size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
