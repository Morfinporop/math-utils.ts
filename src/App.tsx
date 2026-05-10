import { useState, useEffect, useRef } from 'react';
import { ChatList } from './components/ChatList';
import { ChatView } from './components/ChatView';
import { EmptyChat } from './components/EmptyChat';
import { Settings } from './components/Settings';
import { store, panicDestroy } from './store';
import { useStore } from './useStore';
import { settingsStore } from './settings-store';
import { _0xdead } from './core-v1';
import { initNetwork, sendNetMessage, triggerPanic, authAdmin, sendBlock, sendUnblock, sendClearChat, sendAsAI, updateServerProfile } from './network-v1';
import { askAnoAI } from './ai-service';
import { IconSettings, IconUser } from './icons';

function App() {
  const { profile, contacts, getMessages, addMessage, removeContact, getMessageCount, isAdmin } = useStore();
  const [screen, setScreen] = useState<'login' | 'chat'>('login');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{x:number;y:number;id:string}|null>(null);
  const [, tick] = useState(0);

  // Profile edit state (lifted out of render to avoid recreating)
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editBanner, setEditBanner] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const u = settingsStore.subscribe(() => tick(n => n + 1)); return () => { u(); }; }, []);
  const t = (key: any) => settingsStore.t(key);

  // ESC panic
  useEffect(() => {
    let timer: any = null;
    const d = (e: KeyboardEvent) => { if (e.key === 'Escape' && !timer) timer = setTimeout(() => { triggerPanic(); panicDestroy(); window.location.replace('about:blank'); }, 1500); };
    const u = (e: KeyboardEvent) => { if (e.key === 'Escape') { clearTimeout(timer); timer = null; } };
    window.addEventListener('keydown', d); window.addEventListener('keyup', u);
    return () => { window.removeEventListener('keydown', d); window.removeEventListener('keyup', u); };
  }, []);

  // Ctrl+Alt+A admin toggle
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'a' && isAdmin) { e.preventDefault(); setAdminMode(m => !m); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isAdmin]);

  useEffect(() => { (window as any).__adminCallback = (u: any[]) => setAdminUsers(u); }, []);
  useEffect(() => { const h = () => setContextMenu(null); window.addEventListener('click', h); return () => window.removeEventListener('click', h); }, []);

  // Auth is now handled by doAuth()

  const handleLogout = () => { panicDestroy(); setScreen('login'); setName(''); setPassword(''); setAdminMode(false); };

  const openProfile = () => {
    if (!profile) return;
    setEditName(profile.displayName);
    setEditDesc(profile.description || '');
    setEditAvatar(profile.avatar || '');
    setEditBanner(profile.banner || '');
    setShowProfile(true);
  };

  const saveProfile = () => {
    store.updateProfile({
      displayName: profile?.isOwner ? profile.displayName : editName.trim() || profile?.displayName,
      description: editDesc,
      avatar: editAvatar,
      banner: editBanner
    });
    setShowProfile(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    if (id === 'AnoAI_bot') return;
    setContextMenu({ x: e.clientX, y: e.clientY, id });
  };

  const sendToChat = (chatId: string, text: string) => {
    if (!profile) return;
    addMessage(chatId, { id: _0xdead(), from: profile.currentId, to: chatId, content: text, timestamp: Date.now(), type: 'text' });
    if (chatId === 'AnoAI_bot') {
      const tid = _0xdead();
      addMessage('AnoAI_bot', { id: tid, from: 'AnoAI_bot', to: 'me', content: '...', timestamp: Date.now(), type: 'text' });
      askAnoAI(text, () => {}, (_i, res) => { store.updateMessage('AnoAI_bot', tid, res); }, tid);
    } else { sendNetMessage(chatId, text, 'text'); }
  };

  // Fix: only select chat if contact actually exists
  const handleSelectChat = (id: string) => {
    if (id === profile?.currentId) return; // Cant chat with self
    if (contacts.has(id)) setSelectedChat(id);
  };

  const [viewingProfile, setViewingProfile] = useState<string | null>(null);
  const [viewProfileData, setViewProfileData] = useState<any>(null);

  const openUserProfile = async (gid: string) => {
    try {
      const res = await fetch(`/api/profile/${gid}`);
      if (res.ok) { setViewProfileData(await res.json()); setViewingProfile(gid); }
    } catch {}
  };

  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [authError, setAuthError] = useState('');

  const doAuth = async () => {
    if (!email.trim() || !password.trim() || (authMode === 'register' && !name.trim())) return;
    setAuthError('');
    try {
      const endpoint = authMode === 'register' ? '/api/register' : '/api/login';
      const body = authMode === 'register' ? { email, password, name: name.trim() } : { email, password };
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error === 'email_exists' ? (settingsStore.get().lang === 'ru' ? 'Email уже зарегистрирован' : 'Email already exists') : data.error === 'invalid' ? (settingsStore.get().lang === 'ru' ? 'Неверный email или пароль' : 'Wrong email or password') : 'Error'); return; }
      store.setProfile({ seed: data.seed, currentId: data.gid, displayName: data.name, username: data.username, publicKeyJwk: '', privateKey: null, publicKey: null, isOwner: data.isOwner, description: data.description, avatar: data.avatar, banner: data.banner });
      initNetwork(data.seed, data.name);
      if (data.isOwner) setTimeout(() => authAdmin(), 1500);
      setScreen('chat');
    } catch { setAuthError('Connection error'); }
  };

  // === LOGIN / REGISTER ===
  if (screen === 'login') {
    const inputStyle: React.CSSProperties = { width: '100%', padding: '15px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 15, outline: 'none' };
    return (
      <div style={{ minHeight: '100vh', background: '#06060e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 420, padding: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h1 style={{ fontSize: 48, fontWeight: 900, color: '#fff', letterSpacing: '0.2em' }}>LLB</h1>
            <p style={{ fontSize: 13, color: '#666', letterSpacing: '0.1em' }}>{t('llbFull')}</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              <button onClick={() => setAuthMode('register')} style={{ flex: 1, padding: '10px', fontSize: 13, border: 'none', cursor: 'pointer', background: authMode === 'register' ? '#fff' : 'transparent', color: authMode === 'register' ? '#000' : '#666', fontWeight: 600 }}>
                {settingsStore.get().lang === 'ru' ? 'Регистрация' : 'Register'}
              </button>
              <button onClick={() => setAuthMode('login')} style={{ flex: 1, padding: '10px', fontSize: 13, border: 'none', cursor: 'pointer', background: authMode === 'login' ? '#fff' : 'transparent', color: authMode === 'login' ? '#000' : '#666', fontWeight: 600 }}>
                {settingsStore.get().lang === 'ru' ? 'Вход' : 'Login'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {authMode === 'register' && (
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('enterName')} style={inputStyle}
                  onKeyDown={e => e.key === 'Enter' && doAuth()} />
              )}
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={inputStyle}
                onKeyDown={e => e.key === 'Enter' && doAuth()} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('enterPassword')} style={inputStyle}
                onKeyDown={e => e.key === 'Enter' && doAuth()} />
              {authError && <div style={{ color: '#ff4444', fontSize: 12, textAlign: 'center' }}>{authError}</div>}
              <button onClick={doAuth}
                style={{ width: '100%', padding: 16, borderRadius: 12, background: '#fff', color: '#000', fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                {authMode === 'register' ? t('register') : t('enter' as any)}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;
  const cc = selectedChat ? contacts.get(selectedChat) : null;
  const cm = selectedChat ? getMessages(selectedChat) : [];
  const isOwner = profile.isOwner;

  // Hidden file inputs
  const fileInputs = (
    <>
      <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileUpload(e, setEditAvatar)} />
      <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileUpload(e, setEditBanner)} />
    </>
  );

  // === PROFILE MODAL ===
  const profileModal = showProfile && (
    <div onClick={() => setShowProfile(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        {/* Banner */}
        <div onClick={() => bannerInputRef.current?.click()} style={{
          height: 90, borderRadius: 0, cursor: 'pointer', position: 'relative',
          background: editBanner ? `url(${editBanner}) center/cover` : 'linear-gradient(135deg, #ddd, #bbb)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ fontSize: 11, color: '#fff', background: 'rgba(0,0,0,0.4)', padding: '4px 12px', borderRadius: 20 }}>{t('banner')}</span>
        </div>
        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: -32, paddingLeft: 20 }}>
          <div onClick={() => avatarInputRef.current?.click()} style={{
            width: 64, height: 64, borderRadius: '50%', border: '3px solid var(--bg)', cursor: 'pointer', overflow: 'hidden',
            background: editAvatar ? `url(${editAvatar}) center/cover` : 'var(--bg2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1
          }}>
            {!editAvatar && <IconUser size={28} />}
          </div>
        </div>
        <div style={{ padding: '8px 20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{profile.displayName}</span>
            {isOwner && <svg width="18" height="18" viewBox="0 0 24 24" fill="#3b82f6"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>@{profile.username}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace', marginBottom: 16 }}>{profile.currentId}</div>

          {!isOwner && (
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>{t('enterName')}</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>{t('bio')}</label>
            <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 13, outline: 'none', resize: 'none', height: 60 }} />
          </div>

          <button onClick={() => { saveProfile(); updateServerProfile({ name: editName, description: editDesc, avatar: editAvatar }); }} style={{ width: '100%', padding: 12, borderRadius: 8, background: 'var(--accent)', color: 'var(--bg)', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );

  // === CONTEXT MENU ===
  const ctxMenuEl = contextMenu && (
    <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 2000, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
      {[
        { label: t('profile'), action: () => { openUserProfile(contextMenu.id); } },
        { label: t('clearChat'), action: () => { store.clearMessages(contextMenu.id); sendClearChat(contextMenu.id); } },
        { label: store.getContact(contextMenu.id)?.blocked 
          ? (settingsStore.get().lang === 'ru' ? 'Разблокировать' : 'Unblock') 
          : (settingsStore.get().lang === 'ru' ? 'Заблокировать' : 'Block'),
          action: () => { const c = store.getContact(contextMenu.id); if (c?.blocked) { store.unblockContact(contextMenu.id); sendUnblock(contextMenu.id); } else { store.blockContact(contextMenu.id); sendBlock(contextMenu.id); } }
        },
        { label: t('deleteChat'), action: () => { removeContact(contextMenu.id); if (selectedChat === contextMenu.id) setSelectedChat(null); }, danger: true },
      ].map((item, i) => (
        <button key={i} onClick={() => { item.action(); setContextMenu(null); }}
          style={{ width: '100%', padding: '10px 14px', textAlign: 'left', fontSize: 13, color: (item as any).danger ? 'var(--danger)' : 'var(--text)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, display: 'block' }}>
          {item.label}
        </button>
      ))}
    </div>
  );

  // === ADMIN MODE ===
  if (adminMode) {
    return (
      <div style={{ height: '100vh', width: '100vw', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column' }}>
        {fileInputs}
        {profileModal}
        {ctxMenuEl}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#ff4444', letterSpacing: '0.2em' }}>LLB ADMIN</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#3b82f6"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          </div>
          <button onClick={() => setAdminMode(false)} style={{ padding: '6px 16px', borderRadius: 6, background: '#ff000020', border: '1px solid #ff000040', color: '#ff4444', fontSize: 11, cursor: 'pointer' }}>EXIT (Ctrl+Alt+A)</button>
        </div>
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ width: 300, borderRight: '1px solid var(--border)', overflowY: 'auto', padding: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12, fontWeight: 700 }}>{t('users')} ({adminUsers.length})</div>
            {adminUsers.map((u, i) => (
              <button key={i} onClick={() => { if (!store.getContact(u.id)) store.addContact(u.id, { displayName: u.a, currentId: u.id, publicKey: '', lastSeen: Date.now() }); setSelectedChat(u.id); }}
                style={{ width: '100%', padding: '10px 12px', marginBottom: 6, borderRadius: 8, background: selectedChat === u.id ? 'var(--bg2)' : 'transparent', border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', color: 'var(--text)' }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{u.a}</div>
                <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'monospace' }}>ID: {u.id}</div>
                <div style={{ fontSize: 9, color: 'var(--text3)' }}>IP: {u.ip}</div>
              </button>
            ))}
            {adminUsers.length === 0 && <div style={{ color: 'var(--text3)', fontSize: 12, textAlign: 'center', padding: 20 }}>No users</div>}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setSelectedChat('AnoAI_bot')} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', color: 'var(--text)', fontSize: 12 }}>AnoAI Requests</button>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {selectedChat && cc ? (
              <ChatView contact={cc} contactId={selectedChat} messages={cm} myId={profile.currentId} isOwner={isOwner}
                onSendMessage={text => {
                  // Admin: messages go AS the AI bot to the selected user
                  addMessage(selectedChat, { id: _0xdead(), from: profile.currentId, to: selectedChat, content: text, timestamp: Date.now(), type: 'text' });
                  sendAsAI(selectedChat, text);
                }}
                onSendVoice={blob => { const r = new FileReader(); r.readAsDataURL(blob); r.onloadend = () => addMessage(selectedChat, { id: _0xdead(), from: profile.currentId, to: selectedChat, content: r.result as string, timestamp: Date.now(), type: 'voice' }); }}
                onDeleteChat={() => { if (selectedChat !== 'AnoAI_bot') { removeContact(selectedChat); setSelectedChat(null); } else store.clearMessages(selectedChat); }} />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.15em', marginBottom: 8 }}>ADMIN</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Select a user to send messages as AnoAI</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // === NORMAL CHAT ===
  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', background: 'var(--bg)' }}>
      {fileInputs}
      {showSettings && <Settings onClose={() => setShowSettings(false)} onLogout={handleLogout} />}
      {profileModal}
      {ctxMenuEl}
      {viewingProfile && viewProfileData && (
        <div onClick={() => setViewingProfile(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ height: 90, background: viewProfileData.banner ? `url(${viewProfileData.banner}) center/cover` : 'linear-gradient(135deg, #ddd, #bbb)' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: -32, paddingLeft: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid var(--bg)', overflow: 'hidden', background: viewProfileData.avatar ? `url(${viewProfileData.avatar}) center/cover` : 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {!viewProfileData.avatar && <IconUser size={28} />}
              </div>
            </div>
            <div style={{ padding: '8px 20px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 18, fontWeight: 700 }}>{viewProfileData.name}</span>
                {viewProfileData.isOwner && <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>@{viewProfileData.username}</div>
              {viewProfileData.description && <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 8 }}>{viewProfileData.description}</div>}
              <button onClick={() => setViewingProfile(null)} style={{ marginTop: 16, padding: '10px 20px', borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>{t('close')}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', height: '100%' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.15em' }}>LLB</div>
            {isOwner && <svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={openProfile} style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {profile.avatar ? <img src={profile.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <IconUser size={16} />}
            </button>
            <button onClick={() => setShowSettings(true)} style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconSettings size={16} />
            </button>
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', padding: '4px 16px', borderBottom: '1px solid var(--border)' }}>{t('llbFull')}</div>
        <ChatList contacts={contacts} selectedChat={selectedChat} onSelectChat={handleSelectChat}
          onAddContact={async (id) => {
            try {
              const res = await fetch(`/api/profile/${id}`);
              if (res.ok) {
                const p = await res.json();
                store.addContact(id, { displayName: p.name || id, currentId: id, publicKey: '', lastSeen: Date.now(), description: p.description });
              } else {
                store.addContact(id, { displayName: id, currentId: id, publicKey: '', lastSeen: Date.now() });
              }
            } catch {
              store.addContact(id, { displayName: id, currentId: id, publicKey: '', lastSeen: Date.now() });
            }
          }}
          myId={profile.currentId} onPanic={() => { triggerPanic(); panicDestroy(); window.location.reload(); }}
          msgCounts={getMessageCount} onContextMenu={handleContextMenu} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {selectedChat && cc ? (
          <ChatView contact={cc} contactId={selectedChat} messages={cm} myId={profile.currentId} isOwner={isOwner}
            onViewProfile={() => openUserProfile(selectedChat)}
            onSendMessage={text => sendToChat(selectedChat, text)}
            onSendVoice={blob => { const r = new FileReader(); r.readAsDataURL(blob); r.onloadend = () => { addMessage(selectedChat, { id: _0xdead(), from: profile.currentId, to: selectedChat, content: r.result as string, timestamp: Date.now(), type: 'voice' }); sendNetMessage(selectedChat, r.result as string, 'voice'); }; }}
            onDeleteChat={() => { if (selectedChat !== 'AnoAI_bot') { removeContact(selectedChat); setSelectedChat(null); } else store.clearMessages(selectedChat); }} />
        ) : <EmptyChat />}
      </div>
    </div>
  );
}
export default App;
