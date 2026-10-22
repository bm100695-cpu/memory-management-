import React from 'react';
import { useThemeStore } from '../store/themeStore';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ variant = 'segmented', className = '' }) {
  const { theme, setTheme, toggleTheme } = useThemeStore();

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`p-2 rounded-xl transition-all duration-200 border cursor-pointer ${className}`}
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
        title={theme === 'dark' ? 'Switch to White (Light) mode' : 'Switch to Night (Dark) mode'}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Sun size={18} className="text-amber-400 hover:rotate-45 transition-transform" />
        ) : (
          <Moon size={18} className="text-purple-600 hover:-rotate-12 transition-transform" />
        )}
      </button>
    );
  }

  return (
    <div
      className={`p-1 rounded-xl flex items-center gap-1 border transition-colors ${className}`}
      style={{
        background: 'var(--bg-primary)',
        borderColor: 'var(--border-subtle)',
      }}
      role="group"
      aria-label="Theme Selection"
    >
      {/* White Mode Button */}
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
          theme === 'light'
            ? 'shadow-sm font-bold scale-[1.02]'
            : 'hover:opacity-75'
        }`}
        style={
          theme === 'light'
            ? {
                background: '#ffffff',
                color: '#0f172a',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                border: '1px solid #cbd5e1',
              }
            : {
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid transparent',
              }
        }
        title="White / Light Mode"
      >
        <Sun
          size={15}
          className={`transition-transform duration-300 ${
            theme === 'light' ? 'text-amber-500 fill-amber-500 rotate-90' : 'text-slate-400'
          }`}
        />
        <span>White</span>
      </button>

      {/* Night Mode Button */}
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
          theme === 'dark'
            ? 'shadow-sm font-bold scale-[1.02]'
            : 'hover:opacity-75'
        }`}
        style={
          theme === 'dark'
            ? {
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                color: '#ffffff',
                boxShadow: '0 2px 12px var(--accent-glow)',
                border: '1px solid var(--border-accent)',
              }
            : {
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid transparent',
              }
        }
        title="Night / Dark Mode"
      >
        <Moon
          size={15}
          className={`transition-transform duration-300 ${
            theme === 'dark' ? 'text-purple-200 fill-purple-200 -rotate-12' : 'text-slate-500'
          }`}
        />
        <span>Night</span>
      </button>
    </div>
  );
}
