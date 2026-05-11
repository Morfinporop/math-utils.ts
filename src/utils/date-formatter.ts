export function formatLastSeen(ts: number, lang: 'ru' | 'en'): string {
  const now = new Date();
  const date = new Date(ts);
  
  const isToday = now.toDateString() === date.toDateString();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = yesterday.toDateString() === date.toDateString();
  
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (lang === 'ru') {
    if (isToday) return `был ${time} (Сегодня)`;
    if (isYesterday) return `был ${time} (Вчера)`;
    
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) return `был ${time} (${diffDays} дн. назад)`;
    if (diffDays < 30) return `был ${time} (Неделю назад)`;
    return `был ${time} (Месяц назад)`;
  } else {
    if (isToday) return `last seen ${time} (Today)`;
    if (isYesterday) return `last seen ${time} (Yesterday)`;
    
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) return `last seen ${time} (${diffDays} days ago)`;
    if (diffDays < 30) return `last seen ${time} (A week ago)`;
    return `last seen ${time} (A month ago)`;
  }
}
