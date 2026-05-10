import { useState } from 'react';
import { IconShield, IconLock, IconKey, IconClock, IconRefresh, IconZap, IconTerminal } from '../icons';

interface Props {
  onStart: (name: string) => void;
}

export function WelcomeScreen({ onStart }: Props) {
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);

  const go = () => { if (name.trim() && agreed) onStart(name.trim()); };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl border border-white bg-black mb-5">
            <IconShield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-[0.4em] uppercase">
            LLB
          </h1>
          <p className="text-white text-[10px] mt-2 tracking-widest opacity-80">
            PERSONAL LOCAL SECURITY
          </p>
        </div>

        {/* Form */}
        <div className="bg-abyss border border-border rounded-lg p-6 space-y-5">
          <div>
            <label className="text-[10px] text-text-muted uppercase tracking-wider mb-2 block">
              Identifier
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="..."
              className="w-full bg-void border border-border rounded px-4 py-3 text-sm text-text-primary placeholder-text-ghost focus:outline-none focus:border-border-light transition-colors"
              onKeyDown={e => e.key === 'Enter' && go()}
              autoFocus
            />
          </div>

          {/* Protocol info */}
          <div className="border border-border rounded p-4 space-y-3">
            {[
              { icon: <IconLock size={13} />, text: 'AES-256-GCM + ECDH P-384 E2EE' },
              { icon: <IconRefresh size={13} />, text: 'ID rotation interval: 300s' },
              { icon: <IconClock size={13} />, text: 'Message TTL: 36000s (10h)' },
              { icon: <IconZap size={13} />, text: 'RAM-only storage, zero persistence' },
              { icon: <IconKey size={13} />, text: 'Panic: Ctrl+Shift+X — instant wipe' },
              { icon: <IconTerminal size={13} />, text: 'Web Crypto API, no external deps' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-text-muted flex-shrink-0">{item.icon}</span>
                <span className="text-[11px] text-text-secondary">{item.text}</span>
              </div>
            ))}
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="mt-0.5 flex-shrink-0">
              <div
                onClick={() => setAgreed(!agreed)}
                className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors cursor-pointer ${
                  agreed ? 'bg-accent-dim border-accent' : 'border-border-light bg-void'
                }`}
              >
                {agreed && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-text-secondary">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-[11px] text-text-muted leading-relaxed">
              All data is ephemeral. Session terminates on tab close. Messages are irrecoverably purged after 10 hours.
            </span>
          </label>

          <button
            onClick={go}
            disabled={!name.trim() || !agreed}
            className="w-full border border-border bg-elevated text-text-secondary rounded py-3 text-xs uppercase tracking-widest hover:bg-border-light hover:text-text-primary transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            Initialize Session
          </button>
        </div>

        <p className="text-center text-[9px] text-text-ghost mt-5 tracking-wider">
          CLIENT-SIDE CRYPTO / ZERO-KNOWLEDGE ARCHITECTURE
        </p>
      </div>
    </div>
  );
}
