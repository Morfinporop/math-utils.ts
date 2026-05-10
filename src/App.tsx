import { useState, useEffect, useCallback } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ChatList } from './components/ChatList';
import { ChatView } from './components/ChatView';
import { EmptyChat } from './components/EmptyChat';
import { store, panicDestroy } from './store';
import { useStore } from './useStore';
import { _0xfa7, _0xeb2, _0xdead, _0xhash } from './core-v1';

const _0x_v = "1.0.42-alpha";

function App() {
  const { profile, contacts, getMessages, addMessage, addContact, removeContact, getMessageCount } = useStore();
  const [ _0x_st, _0x_set ] = useState(0); // 0: 404, 1: Fake, 2: LLB
  const [ _0x_init, _0x_setI ] = useState(false);
  const [ _0x_mob, _0x_setM ] = useState(false);
  const [ _0x_sel, _0x_setS ] = useState<string | null>(null);

  // ── SEQUENCE HANDLER ────────────────────────
  useEffect(() => {
    let _0x_keys: Set<string> = new Set();
    let _0x_timer: any = null;

    const _0x_panic_now = () => {
      panicDestroy();
      _0x_set(0);
      _0x_setI(false);
      // No alert, just silent death
      window.location.replace("about:blank"); 
    };

    const h = (e: KeyboardEvent) => {
      _0x_keys.add(e.key.toUpperCase());
      
      // Ctrl + Alt + A -> AUTH
      if (_0x_keys.has('CONTROL') && _0x_keys.has('ALT') && _0x_keys.has('A')) {
        _0x_set(2);
      }
      // Ctrl + Alt + S -> STEALTH (Fake)
      if (_0x_keys.has('CONTROL') && _0x_keys.has('ALT') && _0x_keys.has('S')) {
        _0x_set(1);
      }

      // PANIC: LONG ESCAPE (1.5s)
      if (e.key === 'Escape') {
        if (!_0x_timer) {
          _0x_timer = setTimeout(_0x_panic_now, 1500);
        }
      }
    };

    const ku = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearTimeout(_0x_timer);
        _0x_timer = null;
      }
      _0x_keys.delete(e.key.toUpperCase());
    };

    window.addEventListener('keydown', h);
    window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', h); window.removeEventListener('keyup', ku); };
  }, []);

  const _0x_go = useCallback(async (n: string) => {
    const kp = await _0xfa7(null);
    const pub = await _0xeb2(kp.publicKey);
    const s = _0xdead();
    const cid = await _0xhash(s);

    store.setProfile({
      seed: s,
      currentId: cid,
      displayName: n,
      publicKeyJwk: pub,
      privateKey: kp.privateKey,
      publicKey: kp.publicKey,
    });
    _0x_setI(true);
  }, []);

  const _0x_R = (s: string) => atob(s); // Inline decoder for obfuscated strings

  if (_0x_st === 0) {
    return (
      <div className="min-h-screen bg-void flex flex-col items-center justify-start pt-[20vh] text-[#FFFFFF] font-mono px-10">
        <div className="w-full max-w-2xl border-b border-[#111] pb-4 mb-4">
          <h1 className="text-xl font-normal">{_0x_R("NDA0IE5vdCBGb3VuZA==")}</h1>
        </div>
        <div className="w-full max-w-2xl text-[10px] uppercase tracking-tighter opacity-30">
          nginx/1.22.1 (Ubuntu)
        </div>
      </div>
    );
  }

  if (_0x_st === 1) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#444] font-mono">
        <div className="border border-[#111] p-10 text-center">
          <div className="text-4xl mb-4">Σ</div>
          <div className="text-xs">SYSTEM_IDLE_MATRIX_READY</div>
          <div className="mt-4 text-[10px]">WAITING_FOR_INPUT...</div>
        </div>
      </div>
    );
  }

  if (!profile || !_0x_init) {
    return <WelcomeScreen onStart={_0x_go} />;
  }

  const selC = _0x_sel ? contacts.get(_0x_sel) : null;
  const selM = _0x_sel ? getMessages(_0x_sel) : [];

  return (
    <div className="h-screen w-screen flex bg-void overflow-hidden">
      <div className={`${_0x_mob ? 'hidden md:flex' : 'flex'} w-full md:w-72 lg:w-80 flex-shrink-0 flex-col`}>
        <ChatList
          contacts={contacts}
          selectedChat={_0x_sel}
          onSelectChat={(id) => { _0x_setS(id); _0x_setM(true); }}
          onAddContact={(id, n) => store.addContact(id, { displayName: n, currentId: id, publicKey: '', lastSeen: Date.now() })}
          myId={profile.currentId}
          onPanic={() => { panicDestroy(); window.location.reload(); }}
          msgCounts={getMessageCount}
        />
      </div>
      <div className={`${_0x_mob ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
        {_0x_sel && selC ? (
          <ChatView
            contact={selC}
            contactId={_0x_sel}
            messages={selM}
            myId={profile.currentId}
            onSendMessage={t => addMessage(_0x_sel, { id: _0xdead(), from: profile.currentId, to: _0x_sel, content: t, timestamp: Date.now(), type: 'text' })}
            onSendVoice={b => addMessage(_0x_sel, { id: _0xdead(), from: profile.currentId, to: _0x_sel, content: URL.createObjectURL(b), timestamp: Date.now(), type: 'voice' })}
            onDeleteChat={() => { removeContact(_0x_sel); _0x_setS(null); _0x_setM(false); }}
          />
        ) : (
          <EmptyChat />
        )}
      </div>
    </div>
  );
}

export default App;
