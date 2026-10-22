import { create } from 'zustand';

const THEME_KEY = 'jarvis_theme';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (e) {
    // ignore
  }
  return 'dark';
};

const applyThemeToDOM = (theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  if (theme === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
  }
};

export const useThemeStore = create((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (newTheme) => {
    const theme = newTheme === 'light' ? 'light' : 'dark';
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      console.error('Failed to save theme in localStorage', e);
    }
    applyThemeToDOM(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'light' ? 'dark' : 'light';
    get().setTheme(next);
  },
  init: () => {
    const current = get().theme;
    applyThemeToDOM(current);
  },
}));
