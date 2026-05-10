import { useState, useEffect, useCallback } from 'react';
import { store, type Contact, type Message } from './store';

export function useStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = store.subscribe(() => setTick(t => t + 1));
    return () => { unsub(); };
  }, []);

  return {
    profile: store.getProfile(),
    contacts: store.getContacts(),
    getMessages: useCallback((id: string): Message[] => store.getMessages(id), []),
    addMessage: useCallback((id: string, m: Message) => store.addMessage(id, m), []),
    addContact: useCallback((id: string, c: Contact) => store.addContact(id, c), []),
    removeContact: useCallback((id: string) => store.removeContact(id), []),
    getLastMessage: useCallback((id: string) => store.getLastMessage(id), []),
    getUnreadCount: useCallback((id: string) => store.getUnreadCount(id), []),
    isAdmin: store.isAdmin(),
  };
}
