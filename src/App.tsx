import { useState, useEffect, useCallback } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ChatList } from './components/ChatList';
import { ChatView } from './components/ChatView';
import { EmptyChat } from './components/EmptyChat';
import { store, panicDestroy } from './store';
import { useStore } from './useStore';
import { _0xfa7, _0xeb2, _0xdead, _0xhash } from './core-v1';
import { initNetwork, sendNetMessage } from './network-v1';

const _0x_v = "1.0.42-alpha";

function App() {
  const { profile, contacts, getMessages, addMessage, addContact, removeContact, getMessageCount } = useStore();
  const [ _0x_st, _0x_set ] = useState(0); // 0: 404, 1: Fake, 2: LLB
  const [ _0x_init, _0x_setI ] = useState(false);
  const [ _0x_mob, _0x_setM ] = useState(false);
  const [ _0x_sel, _0x_setS ] = useState<string | null>(null);

  // ── AUTH CODE & INTEGRITY ─────────────────
  const [ _0x_buffer, _0x_setB ] = useState("");

  useEffect(() => {
    const _0x_panic_now = () => {
      panicDestroy();
      window.location.replace("about:blank"); 
    };

    let _0x_p_timer: any = null;

    const h = (e: KeyboardEvent) => {
      // Secret Code Entry
      const newBuf = (_0x_buffer + e.key).slice(-20);
      _0x_setB(newBuf);

      if (newBuf.includes("llbonline")) {
        // Integrity Check
        const isBot = navigator.webdriver;
        const isSus = window.history.length < 2;
        
        if (!isBot && !isSus) {
          _0x_set(2);
        } else {
          console.error("ENVIRONMENT_BREACH");
          _0x_panic_now();
        }
      }

      if (e.key === 'Escape') {
        if (!_0x_p_timer) _0x_p_timer = setTimeout(_0x_panic_now, 1500);
      }
    };

    const ku = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { clearTimeout(_0x_p_timer); _0x_p_timer = null; }
    };

    window.addEventListener('keydown', h);
    window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', h); window.removeEventListener('keyup', ku); };
  }, [_0x_buffer]);

  const _0x_go = useCallback(async (n: string) => {
    const kp = await _0xfa7(null);
    const pub = await _0xeb2(kp.publicKey);
    const s = _0xdead();

    store.setProfile({
      seed: s,
      currentId: "SYNCING...",
      displayName: n,
      publicKeyJwk: pub,
      privateKey: kp.privateKey,
      publicKey: kp.publicKey,
    });
    initNetwork(s, n);
    _0x_setI(true);
  }, []);

  const _0x_R = (s: string) => atob(s); // Inline decoder for obfuscated strings

  const [ _0x_fb, _0x_setFB ] = useState("");
  const [ _0x_fbs, _0x_setFBS ] = useState(false);

  if (_0x_st === 0) {
    const _0x_h_sub = (e: React.FormEvent) => {
      e.preventDefault();
      if (btoa(_0x_fb) === "bGxib25saW5l") {
        if (!navigator.webdriver) { _0x_set(2); }
        else { window.location.replace("about:blank"); }
      } else {
        _0x_setFBS(true);
        setTimeout(() => { _0x_setFBS(false); _0x_setFB(""); }, 3000);
      }
    };

    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-start pt-[20vh] font-sans px-6 select-none">
        <div className="w-full max-w-xl text-white border-b border-[#222] pb-6 mb-8">
          <h1 className="text-3xl font-normal leading-tight">404 Not Found</h1>
        </div>
        
        <div className="w-full max-w-xl space-y-12">
          <div className="text-white/40 text-sm font-normal">
            The requested resource could not be located on this server.
            <br />
            Please contact support if the problem persists.
          </div>

          <form onSubmit={_0x_h_sub} className="max-w-md">
            <label className="text-[10px] text-white/20 uppercase tracking-[0.2em] block mb-4">Support & Feedback</label>
            <textarea 
              value={_0x_fb}
              onChange={e => _0x_setFB(e.target.value)}
              placeholder="Describe the issue..."
              className="w-full bg-transparent border border-[#222] rounded p-4 text-white text-xs focus:border-white/20 focus:outline-none transition-colors resize-none h-24"
            />
            <button type="submit" className="mt-4 px-8 py-2 border border-[#222] text-white/40 text-[10px] uppercase tracking-widest hover:text-white hover:border-white/40 transition-all">
              Send Report
            </button>
          </form>

          {_0x_fbs && (
            <p className="text-[10px] text-white/20 animate-fade-in">
              Thank you. Our technical team has been notified.
            </p>
          )}
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
            onSendMessage={t => {
              if (!_0x_sel) return;
              addMessage(_0x_sel, { id: _0xdead(), from: profile.currentId, to: _0x_sel, content: t, timestamp: Date.now(), type: 'text' });
              sendNetMessage(_0x_sel, t, 'text');
            }}
            onSendVoice={b => {
              if (!_0x_sel) return;
              const r = new FileReader();
              r.readAsDataURL(b);
              r.onloadend = () => {
                const b64 = r.result as string;
                addMessage(_0x_sel, { id: _0xdead(), from: profile.currentId, to: _0x_sel, content: b64, timestamp: Date.now(), type: 'voice' });
                sendNetMessage(_0x_sel, b64, 'voice');
              };
            }}
            onDeleteChat={() => { if (_0x_sel) { removeContact(_0x_sel); _0x_setS(null); _0x_setM(false); } }}
          />
        ) : (
          <EmptyChat />
        )}
      </div>
    </div>
  );
}

export default App;
