export type Lang = 'ru' | 'en';

export interface Settings { lang: Lang; translate: boolean; }

const TR = {
  ru: { 
    settings: 'Настройки', language: 'Язык', close: 'Закрыть', send: 'Отправить', typeMessage: 'Сообщение...', 
    addContact: 'Добавить', enterId: 'ID пользователя', noMessages: 'Нет сообщений', clearChat: 'Очистить', 
    deleteChat: 'Удалить', enterName: 'Ваше имя', enterPassword: 'Пароль', register: 'Создать аккаунт', 
    llbFull: 'Личная Локальная Безопасность', admin: 'Админ панель', users: 'Пользователи', noContacts: 'Нет контактов', 
    yourId: 'Ваш ID', copied: 'Скопировано', profile: 'Профиль', logout: 'Выйти', deleteAccount: 'Удалить аккаунт', 
    dangerZone: 'Опасная зона', features: 'Функции', save: 'Сохранить', bio: 'Описание', avatar: 'Аватарка', banner: 'Баннер',
    translate: 'Перевести чат'
  },
  en: { 
    settings: 'Settings', language: 'Language', close: 'Close', send: 'Send', typeMessage: 'Message...', 
    addContact: 'Add', enterId: 'User ID', noMessages: 'No messages', clearChat: 'Clear', 
    deleteChat: 'Delete', enterName: 'Your name', enterPassword: 'Password', register: 'Create Account', 
    llbFull: 'Local Personal Security', admin: 'Admin Panel', users: 'Users', noContacts: 'No contacts', 
    yourId: 'Your ID', copied: 'Copied', profile: 'Profile', logout: 'Log out', deleteAccount: 'Delete account', 
    dangerZone: 'Danger zone', features: 'Features', save: 'Save', bio: 'Bio', avatar: 'Avatar', banner: 'Banner',
    translate: 'Translate chat'
  }
};

class SettingsStore {
  private s: Settings = { lang: 'ru', translate: false };
  private listeners = new Set<() => void>();
  subscribe(fn: () => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit() { this.listeners.forEach(fn => fn()); }
  get() { return { ...this.s }; }
  t(key: keyof typeof TR.ru): string { return TR[this.s.lang][key]; }
  setLang(l: Lang) { this.s.lang = l; this.emit(); }
  setTranslate(v: boolean) { this.s.translate = v; this.emit(); }
}

export const settingsStore = new SettingsStore();
