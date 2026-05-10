import { useState, useRef, useEffect } from 'react';
import type { Message, Contact } from '../store';
import { settingsStore } from '../settings-store';
import { IconSend, IconMic, IconTrash, IconRobot, IconUser, IconX } from '../icons';

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
  const blocked = contact.blocked;
  const [showContactProfile, setShowContactProfile] = useState(false);
  const hasVerified = contactId === 'AnoAI_bot' || contact.displayName === 'LLB';

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  const send = () => { const v = text.trim(); if (v && !blocked) { onSendMessage(v); setText(''); } };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream); mrRef.current = mr; chunks.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = async () => { const raw = new Blob(chunks.current, { type: 'audio/webm' }); const { _0x_morph } = await import('../registry-0x'); onSendVoice(await _0x_morph(raw)); stream.getTracks().forEach(t => t.stop()); };
      mr.start(); setIsRec(true); setRecTime(0); timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
    } catch {}
  };
  const stopRec = () => { setTimeout(() => { mrRef.current?.stop(); setIsRec(false); if (timerRef.current) clearInterval(timerRef.current); }, 300); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => { if (onViewProfile) onViewProfile(); else setShowContactProfile(!showContactProfile); }} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: 0 }}>
          <div style={av}>{isBot ? <IconRobot size={18} /> : <IconUser size={18} />}</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{contact.displayName}</span>
              {hasVerified && <svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
            </div>
            {!isBot && <div style={{ fontSize: 10, color: blocked ? 'var(--danger)' : '#4caf50' }}>{blocked ? (settingsStore.get().lang === 'ru' ? 'был давно' : 'last seen long ago') : (settingsStore.get().lang === 'ru' ? 'в сети' : 'online')}</div>}
          </div>
        </button>
        <button onClick={onDeleteChat} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px' }}>
          {isBot ? <span style={{ fontSize: 12 }}>{t('clearChat')}</span> : <IconTrash size={16} />}
        </button>
      </div>

      {/* Contact Profile Popup */}
      {showContactProfile && (
        <div style={{ padding: 20, borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
              {isBot ? <IconRobot size={28} /> : <IconUser size={28} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18, fontWeight: 700 }}>{contact.displayName}</span>
                {hasVerified && <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace', marginTop: 2 }}>ID: {contactId}</div>
              {contact.description && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>{contact.description}</div>}
            </div>
          </div>
          <button onClick={() => setShowContactProfile(false)} style={{ fontSize: 11, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {settingsStore.get().lang === 'ru' ? 'Скрыть' : 'Hide'}
          </button>
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
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff4444' }} />
              <span style={{ fontSize: 14, fontFamily: 'monospace', color: 'var(--text)' }}>{Math.floor(recTime/60)}:{(recTime%60).toString().padStart(2,'0')}</span>
              <div style={{ flex: 1 }} />
              <button onClick={stopRec} style={{ ...circBtn('#ff4444', '#fff'), width: 36, height: 36 }}><IconX size={16} /></button>
            </div>
          ) : (
            <>
              <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder={t('typeMessage')}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
                style={{ flex: 1, padding: '12px 18px', borderRadius: 24, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 14, outline: 'none' }} />
              {!isBot && <button onClick={startRec} style={circBtn('var(--bg2)', 'var(--text)')}><IconMic size={18} /></button>}
              <button onClick={send} disabled={!text.trim()} style={{ ...circBtn('var(--accent)', 'var(--bg)'), opacity: text.trim() ? 1 : 0.3 }}><IconSend size={16} /></button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
