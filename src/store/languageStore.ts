import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LanguageState {
  language: string;
  setLanguage: (lang: string) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: navigator.language.startsWith('pt') ? 'pt' : 'en',
      setLanguage: (language: string) => set({ language })
    }),
    {
      name: 'language-storage'
    }
  )
);