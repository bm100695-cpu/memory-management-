import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import ThemeToggle from './ThemeToggle';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, MessageSquare, CheckSquare, CalendarDays,
  Brain, BookOpen, User, Cpu, ShieldCheck, LogOut, Bot
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat', icon: MessageSquare, label: 'Voice & Chat' },
  { to: '/tasks', icon: CheckSquare, label: 'Daily Tasks' },
  { to: '/journal', icon: CalendarDays, label: 'Journal' },
  { to: '/memory', icon: Brain, label: 'Memory' },
  { to: '/research', icon: BookOpen, label: 'Research' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/automations', icon: Cpu, label: 'Automations' },
  { to: '/settings', icon: ShieldCheck, label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <aside className="w-64 flex flex-col h-screen sticky top-0 border-r"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center animate-pulse-glow"
          style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
          <Bot size={20} className="text-white" />
        </div>
        <div>
          <div className="font-bold text-sm gradient-text">JARVIS</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Personal AI Agent</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Theme Switcher: White & Night Mode */}
      <div className="px-3 pt-2 pb-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="text-[11px] font-medium uppercase tracking-wider mb-1.5 px-1 flex items-center justify-between"
          style={{ color: 'var(--text-muted)' }}>
          <span>Appearance</span>
          <span className="text-[10px] opacity-80">White / Night</span>
        </div>
        <ThemeToggle variant="segmented" />
      </div>

      {/* User */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl mb-1"
          style={{ background: 'var(--bg-card)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.name}
            </div>
            <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {user?.email}
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="sidebar-link w-full">
          <LogOut size={16} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
