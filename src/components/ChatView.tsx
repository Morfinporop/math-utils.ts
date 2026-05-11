import { useState, useRef, useEffect } from 'react';
import type { Message, Contact } from '../store';
import { settingsStore } from '../settings-store';
import { IconMic, IconTrash, IconRobot, IconUser, IconX, IconPaperPlane } from '../icons';

interface Props {
  contact: Contact;
  contactId: string;
  messages: Message[];
  myId: string;
  isOwner?: boolean;
  onSendMessage: (text: string) => void;
  onSendVoice: (blob: Blob) => void;
  onDeleteChat: () => void;
  onViewProfile?: () => void;
}

const av: React.CSSProperties = { width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', flexShrink: 0 };
const circBtn = (bg: string, col: string): React.CSSProperties => ({ width: 42, height: 42, borderRadius: '50%', border: '1px solid var(--border)', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: col, cursor: 'pointer', flexShrink: 0 });

export function ChatView({ contact, contactId, messages, myId, onSendMessage, onSendVoice, onDeleteChat, onViewProfile }: Props) {
  const [text, setText] = useState('');
  const [isRec, setIsRec] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const t = (key: any) => settingsStore.t(key);
  const isBot = contactId === 'AnoAI_bot';
  const blocked = contact.blockedByMe || contact.blockedByThem;
  const [showContactProfile, setShowContactProfile] = useState(false);
  const hasVerified = contactId === 'AnoAI_bot' || contact.displayName === 'LLB';

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  const send = () => { const v = text.trim(); if (v && !blocked) { onSendMessage(v); setText(''); } };

  const streamRef = useRef<MediaStream | null>(null);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream); mrRef.current = mr; chunks.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.start(); setIsRec(true); setRecTime(0);
      const start = Date.now();
      timerRef.current = setInterval(() => setRecTime(Math.floor((Date.now() - start) / 1000)), 100);
    } catch {}
  };

  const cancelRec = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mrRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    chunks.current = [];
    setIsRec(false);
  };

  const sendRec = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mrRef.current && mrRef.current.state !== 'inactive') {
      mrRef.current.onstop = async () => {
        const raw = new Blob(chunks.current, { type: 'audio/webm' });
        const { _0x_morph } = await import('../registry-0x');
        onSendVoice(await _0x_morph(raw));
        streamRef.current?.getTracks().forEach(t => t.stop());
      };
      mrRef.current.stop();
    }
    setIsRec(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => { if (onViewProfile) onViewProfile(); else setShowContactProfile(!showContactProfile); }} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: 0 }}>
          <div style={{ ...av, overflow: 'hidden' }}>
            {isBot ? <IconRobot size={18} /> : contact.avatar ? <img src={contact.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <IconUser size={18} />}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{contact.displayName}</span>
              {hasVerified && <svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
            </div>
            {!isBot && <div style={{ fontSize: 10, color: blocked ? 'var(--danger)' : contact.online ? '#4caf50' : 'var(--text3)' }}>
              {blocked 
                ? (settingsStore.get().lang === 'ru' ? 'заблокирован' : 'blocked')
                : contact.online 
                  ? (settingsStore.get().lang === 'ru' ? 'в сети' : 'online')
                  : contact.lastOnlineTime 
                    ? `${settingsStore.get().lang === 'ru' ? 'был' : 'last seen'} ${new Date(contact.lastOnlineTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : (settingsStore.get().lang === 'ru' ? 'не в сети' : 'offline')
              }
            </div>}
          </div>
        </button>
        <button onClick={onDeleteChat} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px' }}>
          {isBot ? <span style={{ fontSize: 12 }}>{t('clearChat')}</span> : <IconTrash size={16} />}
        </button>
      </div>

      {/* Contact Profile Modal */}
      {showContactProfile && (
        <div onClick={() => setShowContactProfile(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ height: 90, background: isBot ? 'linear-gradient(135deg, #111, #333)' : 'linear-gradient(135deg, #ddd, #bbb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isBot && <span style={{ color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: '0.1em' }}>Я КРУТАЯ ЧЕ ПОДЕЛАТЬ</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: -32, paddingLeft: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid var(--bg)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', position: 'relative', zIndex: 1 }}>
                {isBot ? <IconRobot size={28} /> : <IconUser size={28} />}
              </div>
            </div>
            <div style={{ padding: '8px 20px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 20, fontWeight: 700 }}>{contact.displayName}</span>
                {hasVerified && <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
              </div>
              {contact.description && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8, lineHeight: 1.5 }}>{contact.description}</div>}
              <button onClick={() => setShowContactProfile(false)} style={{ marginTop: 16, padding: '10px 20px', borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
                {settingsStore.get().lang === 'ru' ? 'Закрыть' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>{t('noMessages')}</div>
        ) : messages.map(msg => {
          const mine = msg.from === myId;
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '75%', padding: '10px 14px', fontSize: 14, lineHeight: 1.5, borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: mine ? 'var(--accent)' : 'var(--bg2)', color: mine ? 'var(--bg)' : 'var(--text)', border: mine ? 'none' : '1px solid var(--border)' }}>
                {msg.type === 'voice' ? <audio controls src={msg.content} style={{ height: 32, maxWidth: 200 }} /> : <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>}
                <div style={{ fontSize: 9, opacity: 0.5, marginTop: 4, textAlign: mine ? 'right' : 'left' }}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {blocked ? (
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 13, borderTop: '1px solid var(--border)' }}>
          {settingsStore.get().lang === 'ru' ? 'Пользователь заблокирован' : 'User is blocked'}
        </div>
      ) : (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          {isRec ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={cancelRec} style={{ ...circBtn('#ff4444', '#fff'), width: 40, height: 40 }}><IconX size={18} /></button>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4444', animation: 'pulse 1s infinite' }} />
              <span style={{ fontSize: 14, fontFamily: 'monospace', color: 'var(--text)' }}>{Math.floor(recTime/60)}:{(recTime%60).toString().padStart(2,'0')}</span>
              <div style={{ flex: 1 }} />
              <button onClick={sendRec} style={{ ...circBtn('#111', '#fff'), width: 40, height: 40 }}><IconPaperPlane size={18} /></button>
            </div>
          ) : (
            <>
              <input type="text" value={text} onChange={e => setText(e.target.value.slice(0, 2000))} maxLength={2000} placeholder={t('typeMessage')}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
                style={{ flex: 1, padding: '12px 18px', borderRadius: 24, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 14, outline: 'none' }} />
              {!isBot && <button onClick={startRec} style={circBtn('var(--bg2)', 'var(--text)')}><IconMic size={18} /></button>}
              <button onClick={send} disabled={!text.trim()} style={{ ...circBtn('var(--accent)', 'var(--bg)'), opacity: text.trim() ? 1 : 0.3 }}><IconPaperPlane size={16} /></button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
