import { IconChat, IconLock, IconClock, IconRefresh, IconZap } from '../icons';

export function EmptyChat() {
  return (
    <div className="flex items-center justify-center h-full bg-void">
      <div className="text-center max-w-xs">
        <IconChat size={36} className="text-text-ghost mx-auto mb-4" />
        <h2 className="text-text-muted text-sm mb-2">
          Select a channel
        </h2>
        <p className="text-text-ghost text-[11px] leading-relaxed mb-6">
          Add a contact to initialize an encrypted session
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { icon: <IconLock size={9} />, label: 'E2E' },
            { icon: <IconClock size={9} />, label: '10h TTL' },
            { icon: <IconRefresh size={9} />, label: '5m ID' },
            { icon: <IconZap size={9} />, label: 'RAM' },
          ].map((tag, i) => (
            <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border bg-abyss text-text-ghost text-[9px] tracking-wider">
              {tag.icon}
              {tag.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
