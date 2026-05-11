export type Lang = 'ru' | 'en';
export type VoicePreset = 'normal' | 'deep' | 'child' | 'moriarty' | 'robot' | 'whisper';

export interface Settings { lang: Lang; voicePreset: VoicePreset; }

export const VOICE_PRESETS: Record<VoicePreset, { pitch: number; clarity: number; bass: number; distortion: boolean; label_ru: string; label_en: string }> = {
  normal:   { pitch: 1.0,  clarity: 2000, bass: 0,  distortion: false, label_ru: 'Обычный',   label_en: 'Normal' },
  deep:     { pitch: 0.55, clarity: 900,  bass: 15, distortion: false, label_ru: 'Грубый',    label_en: 'Deep' },
  child:    { pitch: 1.6,  clarity: 3500, bass: -5, distortion: false, label_ru: 'Детский',   label_en: 'Child' },
  moriarty: { pitch: 0.65, clarity: 2200, bass: 12, distortion: true,  label_ru: 'Мориарти',  label_en: 'Moriarty' },
  robot:    { pitch: 0.45, clarity: 600,  bass: 20, distortion: true,  label_ru: 'Робот',     label_en: 'Robot' },
  whisper:  { pitch: 1.1,  clarity: 3000, bass: -8, distortion: false, label_ru: 'Шёпот',     label_en: 'Whisper' },
};

const TR = {
  ru: { settings: 'Настройки', language: 'Язык', voicePreset: 'Режим голоса', close: 'Закрыть', send: 'Отправить', typeMessage: 'Сообщение...', addContact: 'Добавить', enterId: 'ID пользователя', noMessages: 'Нет сообщений', clearChat: 'Очистить', deleteChat: 'Удалить', enterName: 'Ваше имя', enterPassword: 'Пароль', register: 'Создать аккаунт', llbFull: 'Личная Локальная Безопасность', admin: 'Админ панель', users: 'Пользователи', noContacts: 'Нет контактов', yourId: 'Ваш ID', copied: 'Скопировано', profile: 'Профиль', logout: 'Выйти', deleteAccount: 'Удалить аккаунт', dangerZone: 'Опасная зона', features: 'Функции', save: 'Сохранить', bio: 'Описание', avatar: 'Аватарка', banner: 'Баннер' },
  en: { settings: 'Settings', language: 'Language', voicePreset: 'Voice Mode', close: 'Close', send: 'Send', typeMessage: 'Message...', addContact: 'Add', enterId: 'User ID', noMessages: 'No messages', clearChat: 'Clear', deleteChat: 'Delete', enterName: 'Your name', enterPassword: 'Password', register: 'Create Account', llbFull: 'Local Personal Security', admin: 'Admin Panel', users: 'Users', noContacts: 'No contacts', yourId: 'Your ID', copied: 'Copied', profile: 'Profile', logout: 'Log out', deleteAccount: 'Delete account', dangerZone: 'Danger zone', features: 'Features', save: 'Save', bio: 'Bio', avatar: 'Avatar', banner: 'Banner' }
};

class SettingsStore {
  private s: Settings = { lang: 'ru', voicePreset: 'moriarty' };
  private listeners = new Set<() => void>();
  subscribe(fn: () => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit() { this.listeners.forEach(fn => fn()); }
  get() { return { ...this.s }; }
  t(key: keyof typeof TR.ru): string { return TR[this.s.lang][key]; }
  getVoice() { return VOICE_PRESETS[this.s.voicePreset]; }
  setLang(l: Lang) { this.s.lang = l; this.emit(); }
  setVoicePreset(v: VoicePreset) { this.s.voicePreset = v; this.emit(); }
}

export const settingsStore = new SettingsStore();
