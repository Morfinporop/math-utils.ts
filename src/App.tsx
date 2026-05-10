import { useState, useEffect, useRef } from 'react';
import { ChatList } from './components/ChatList';
import { ChatView } from './components/ChatView';
import { EmptyChat } from './components/EmptyChat';
import { Settings } from './components/Settings';
import { store, panicDestroy } from './store';
import { useStore } from './useStore';
import { settingsStore } from './settings-store';
import { _0xdead } from './core-v1';
import { initNetwork, sendNetMessage, sendBlock, sendUnblock, sendClear, sendAsAI, updateProfile, panic } from './network-v1';
import { askAnoAI } from './ai-service';
import { IconSettings, IconUser, IconSearch } from './icons';

function App() {
  const { profile, contacts, getMessages, addMessage, removeContact, getUnreadCount, isAdmin } = useStore();
  const [screen, setScreen] = useState<'login' | 'chat'>('login');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{x:number;y:number;id:string}|null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [, tick] = useState(0);

  const doSearch = async (q: string) => {
    setSearchQ(q);
    const clean = q.replace(/^@/, '').trim();
    if (clean.length < 2) { setSearchResults([]); return; }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.filter((r: any) => r.gid !== profile?.currentId && !contacts.has(r.gid)));
      }
    } catch {}
  };

  const addFromSearch = async (r: any) => {
    try {
      const res = await fetch(`/api/profile/${r.gid}`);
      if (res.ok) {
        const p = await res.json();
        store.addContact(r.gid, { displayName: p.name || r.name, currentId: r.gid, publicKey: '', lastSeen: Date.now(), description: p.description });
      } else {
        store.addContact(r.gid, { displayName: r.name, currentId: r.gid, publicKey: '', lastSeen: Date.now() });
      }
    } catch {
      store.addContact(r.gid, { displayName: r.name, currentId: r.gid, publicKey: '', lastSeen: Date.now() });
    }
    setSearchQ(''); setSearchResults([]); setShowSearch(false);
    setSelectedChat(r.gid);
  };

  // Profile edit state (lifted out of render to avoid recreating)
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editBanner, setEditBanner] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const u = settingsStore.subscribe(() => tick(n => n + 1)); return () => { u(); }; }, []);
  const t = (key: any) => settingsStore.t(key);



  // ESC panic
  useEffect(() => {
    let timer: any = null;
    const d = (e: KeyboardEvent) => { if (e.key === 'Escape' && !timer) timer = setTimeout(() => { panic(); panicDestroy(); window.location.replace('about:blank'); }, 1500); };
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

  const handleLogout = () => { try { localStorage.removeItem('llb_auth'); } catch {} panicDestroy(); setScreen('login'); setName(''); setPassword(''); setEmail(''); setAdminMode(false); };

  const handlePanic = () => { panic(); panicDestroy(); window.location.reload(); };

  const openProfile = () => {
    if (!profile) return;
    setEditName(profile.displayName);
    setEditDesc(profile.description || '');
    setEditAvatar(profile.avatar || '');
    setEditBanner(profile.banner || '');
    setEditUsername(profile.username || '');
    setShowProfile(true);
  };



  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Compress image to max 150x150 for avatar, 400x150 for banner
    const img = new Image();
    const reader = new FileReader();
    reader.onloadend = () => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const isAvatar = setter === setEditAvatar;
        const maxW = isAvatar ? 150 : 800;
        const maxH = isAvatar ? 150 : 300;
        let w = img.width;
        let h = img.height;
        if (w > maxW) { h = h * maxW / w; w = maxW; }
        if (h > maxH) { w = w * maxH / h; h = maxH; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setter(canvas.toDataURL('image/jpeg', isAvatar ? 0.5 : 0.7));
        }
      };
      img.src = reader.result as string;
    };
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
    if (id === profile?.currentId) return;
    if (contacts.has(id)) {
      setSelectedChat(id);
      store.markRead(id);
    }
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
  const [authStep, setAuthStep] = useState(0);
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
      // isOwner flag stored in profile for blue checkmark
      setScreen('chat');
    } catch { setAuthError('Connection error'); }
  };

  // === LOGIN / REGISTER ===
  if (screen === 'login') {
    const inp: React.CSSProperties = { width: '100%', padding: '16px 20px', borderRadius: 14, border: '1px solid #e0e0e0', background: '#f5f5f5', color: '#111', fontSize: 16, outline: 'none', transition: 'all 0.2s' };
    const isReg = authMode === 'register';
    const regStep1 = isReg && authStep === 0;
    const regStep2 = isReg && authStep === 1;

    const nextStep = () => {
      if (regStep1 && name.trim()) setAuthStep(1);
      if (regStep2 || !isReg) doAuth();
    };

    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 400, padding: 24 }}>


          <div style={{ background: '#fff', borderRadius: 20, padding: 32, border: '1px solid #e0e0e0' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', marginBottom: 28, borderRadius: 12, overflow: 'hidden', background: '#f5f5f5' }}>
              <button onClick={() => { setAuthMode('register'); setAuthStep(0); }} style={{ flex: 1, padding: '12px', fontSize: 13, border: 'none', cursor: 'pointer', background: isReg ? '#111' : 'transparent', color: isReg ? '#fff' : '#999', fontWeight: 600, borderRadius: 10, transition: 'all 0.2s' }}>
                {settingsStore.get().lang === 'ru' ? 'Регистрация' : 'Register'}
              </button>
              <button onClick={() => setAuthMode('login')} style={{ flex: 1, padding: '12px', fontSize: 13, border: 'none', cursor: 'pointer', background: !isReg ? '#111' : 'transparent', color: !isReg ? '#fff' : '#999', fontWeight: 600, borderRadius: 10, transition: 'all 0.2s' }}>
                {settingsStore.get().lang === 'ru' ? 'Вход' : 'Login'}
              </button>
            </div>

            {/* Step indicator for register */}
            {isReg && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
                <div style={{ width: 32, height: 3, borderRadius: 2, background: '#111', opacity: authStep === 0 ? 1 : 0.15, transition: 'opacity 0.3s' }} />
                <div style={{ width: 32, height: 3, borderRadius: 2, background: '#111', opacity: authStep === 1 ? 1 : 0.15, transition: 'opacity 0.3s' }} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Register Step 1: Name */}
              {regStep1 && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#111', marginBottom: 4 }}>{settingsStore.get().lang === 'ru' ? 'Как вас зовут?' : 'What is your name?'}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>{settingsStore.get().lang === 'ru' ? 'Это имя увидят другие' : 'Others will see this name'}</div>
                  </div>
                  <input type="text" value={name} onChange={e => setName(e.target.value.slice(0, 16))} placeholder={t('enterName')} maxLength={16} style={inp} autoFocus
                    onKeyDown={e => e.key === 'Enter' && nextStep()} />
                </>
              )}

              {/* Register Step 2: Email + Password */}
              {regStep2 && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#111', marginBottom: 4 }}>{settingsStore.get().lang === 'ru' ? `Привет, ${name}!` : `Hello, ${name}!`}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>{settingsStore.get().lang === 'ru' ? 'Создайте аккаунт' : 'Create your account'}</div>
                  </div>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value.slice(0, 50))} placeholder="Email" maxLength={50} style={inp} autoFocus
                    onKeyDown={e => e.key === 'Enter' && nextStep()} />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value.slice(0, 32))} placeholder={t('enterPassword')} maxLength={32} style={inp}
                    onKeyDown={e => e.key === 'Enter' && nextStep()} />
                </>
              )}

              {/* Login */}
              {!isReg && (
                <>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value.slice(0, 50))} placeholder="Email" maxLength={50} style={inp} autoFocus
                    onKeyDown={e => e.key === 'Enter' && nextStep()} />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value.slice(0, 32))} placeholder={t('enterPassword')} maxLength={32} style={inp}
                    onKeyDown={e => e.key === 'Enter' && nextStep()} />
                </>
              )}

              {authError && <div style={{ color: '#ff4444', fontSize: 12, textAlign: 'center' }}>{authError}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                {regStep2 && (
                  <button onClick={() => setAuthStep(0)} style={{ padding: '16px 20px', borderRadius: 14, background: '#f5f5f5', color: '#666', fontSize: 14, border: '1px solid #e0e0e0', cursor: 'pointer' }}>
                    {settingsStore.get().lang === 'ru' ? 'Назад' : 'Back'}
                  </button>
                )}
                <button onClick={nextStep}
                  style={{ flex: 1, padding: 16, borderRadius: 14, background: '#111', color: '#fff', fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                  {regStep1 ? (settingsStore.get().lang === 'ru' ? 'Далее' : 'Next') : (isReg ? t('register') : (settingsStore.get().lang === 'ru' ? 'Войти' : 'Sign In'))}
                </button>
              </div>
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
  // Auto-save profile on close
  const closeProfile = () => {
    store.updateProfile({ displayName: editName || profile?.displayName, description: editDesc, avatar: editAvatar, banner: editBanner, username: editUsername || profile?.username });
    updateProfile({ name: editName, description: editDesc, avatar: editAvatar, banner: editBanner, username: editUsername });
    setShowProfile(false);
  };

  const profileModal = showProfile && (
    <div onClick={closeProfile} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div onClick={() => bannerInputRef.current?.click()} style={{
          height: 100, cursor: 'pointer',
          background: editBanner ? `url(${editBanner}) center/cover` : 'linear-gradient(135deg, #e0e0e0, #ccc)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ fontSize: 10, color: '#fff', background: 'rgba(0,0,0,0.3)', padding: '3px 10px', borderRadius: 20 }}>{t('banner')}</span>
        </div>
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
          <input type="text" value={editName} onChange={e => setEditName(e.target.value.slice(0, 16))} maxLength={16}
            style={{ fontSize: 18, fontWeight: 700, background: 'transparent', border: 'none', borderBottom: '1px dashed var(--border)', color: 'var(--text)', outline: 'none', width: '100%', padding: '4px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 4, marginBottom: 12 }}>
            <span style={{ color: 'var(--text3)', fontSize: 12 }}>@</span>
            <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value.replace(/[^a-z0-9_]/gi, '').slice(0, 20))} maxLength={20}
              style={{ fontSize: 12, background: 'transparent', border: 'none', borderBottom: '1px dashed var(--border)', color: 'var(--text2)', outline: 'none', width: '100%', padding: '2px 0' }} />
          </div>
          <textarea value={editDesc} onChange={e => setEditDesc(e.target.value.slice(0, 200))} maxLength={200} placeholder={t('bio')}
            style={{ width: '100%', padding: '8px 0', borderRadius: 0, border: 'none', borderBottom: '1px dashed var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 13, outline: 'none', resize: 'none', height: 50 }} />
        </div>
      </div>
    </div>
  );

  // === CONTEXT MENU ===
  const ctxMenuEl = contextMenu && (
    <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 2000, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
      {[
        { label: t('profile'), action: () => { openUserProfile(contextMenu.id); } },
        { label: t('clearChat'), action: () => { store.clearMessages(contextMenu.id); sendClear(contextMenu.id); } },
        ...(store.getContact(contextMenu.id)?.blockedByThem ? [] : [{
          label: store.getContact(contextMenu.id)?.blockedByMe
            ? (settingsStore.get().lang === 'ru' ? 'Разблокировать' : 'Unblock')
            : (settingsStore.get().lang === 'ru' ? 'Заблокировать' : 'Block'),
          action: () => { 
            const c = store.getContact(contextMenu.id); 
            if (c?.blockedByMe) { store.unblockContact(contextMenu.id); sendUnblock(contextMenu.id); } 
            else { store.blockContact(contextMenu.id); sendBlock(contextMenu.id); } 
          }
        }]),
        { label: t('deleteChat'), action: () => { sendClear(contextMenu.id); removeContact(contextMenu.id); if (selectedChat === contextMenu.id) setSelectedChat(null); }, danger: true },
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.12em' }}>LLB</span>
            {isOwner && <svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
            <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 4 }}>{t('llbFull')}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={openProfile} style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {profile.avatar ? <img src={profile.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <IconUser size={16} />}
            </button>
            <button onClick={() => setShowSearch(v => !v)} style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconSearch size={15} />
            </button>
            <button className="gear-btn" onClick={() => setShowSettings(true)} style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconSettings size={16} />
            </button>
          </div>
        </div>

        {/* Search dropdown */}
        {showSearch && (
          <div className="search-dropdown" style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
            <input type="text" value={searchQ} onChange={e => doSearch(e.target.value)}
              placeholder={settingsStore.get().lang === 'ru' ? 'Найти пользователя...' : 'Find user...'}
              autoFocus
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
            {searchResults.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {searchResults.map(r => (
                  <button key={r.gid} onClick={() => addFromSearch(r)} style={{
                    width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', marginBottom: 4,
                    background: 'var(--bg2)', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)', color: 'var(--text)'
                  }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', flexShrink: 0 }}>
                      <IconUser size={14} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</span>
                        {r.isOwner && <svg width="10" height="10" viewBox="0 0 24 24" fill="#3b82f6"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>@{r.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <ChatList contacts={contacts} selectedChat={selectedChat} onSelectChat={handleSelectChat}
          onPanic={handlePanic}
          msgCounts={getUnreadCount} onContextMenu={handleContextMenu} />
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
