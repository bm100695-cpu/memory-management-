import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import ThemeToggle from './ThemeToggle';
import MemoryManagementLogo from './MemoryManagementLogo';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  MessageSquare,
  CheckSquare,
  CalendarDays,
  Brain,
  BookOpen,
  User,
  Cpu,
  ShieldCheck,
  LogOut,
  Plus,
  Menu,
  X,
  Sparkles,
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
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const handleNewChat = () => {
    navigate('/chat');
    window.dispatchEvent(new CustomEvent('memory-management-new-chat'));
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between" style={{ background: 'var(--bg-sidebar)' }}>
      {/* Top Header & Navigation Area */}
      <div className="flex flex-col">
        {/* Brand Header */}
        <div
          className="flex items-center justify-between px-4 py-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <MemoryManagementLogo size={32} />
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-tight tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Memory Management
              </span>
              <span className="text-[11px] leading-tight" style={{ color: 'var(--text-secondary)' }}>
                Personal AI System
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-semibold transition-all shadow-sm cursor-pointer hover:bg-[#ececf1]"
            style={{
              background: '#ffffff',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <Plus size={16} className="text-[#202123]" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="px-3 flex flex-col gap-0.5 overflow-y-auto max-h-[calc(100vh-270px)]">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMobileOpen(false)}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                style={
                  isActive
                    ? {
                        background: 'var(--bg-hover)',
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                      }
                    : {
                        color: 'var(--text-secondary)',
                      }
                }
              >
                <Icon size={18} className={isActive ? 'text-[#202123]' : 'text-gray-500'} />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Profile Section (Fixed at bottom) */}
      <div className="p-3 border-t flex flex-col gap-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-sidebar)' }}>
        {/* User Card */}
        <div
          className="flex items-center gap-3 p-2 rounded-xl transition-colors"
          style={{ background: '#ffffff', border: '1px solid var(--border-subtle)' }}
        >
          {/* Teal Circular Avatar with "BM" and White Text */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 tracking-wider shadow-xs"
            style={{
              background: '#0F766E',
              color: '#FFFFFF',
            }}
          >
            BM
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.name || 'Brijesh Mishra'}
            </div>
            <div className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
              {user?.email || 'user@example.com'}
            </div>
          </div>
        </div>

        {/* Action Row: Theme switcher & Log out */}
        <div className="flex items-center justify-between pt-1 px-1">
          <ThemeToggle variant="segmented" />
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-gray-100 transition-colors cursor-pointer text-xs flex items-center gap-1 font-medium"
            title="Log out"
          >
            <LogOut size={15} />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar with Hamburger */}
      <div
        className="md:hidden flex items-center justify-between px-4 py-3 border-b fixed top-0 left-0 right-0 z-30"
        style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg border text-gray-600 hover:bg-gray-100 cursor-pointer"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <Menu size={18} />
          </button>
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            Memory Management
          </span>
        </div>
        <button
          onClick={handleNewChat}
          className="py-1 px-2.5 rounded-md border text-xs font-semibold flex items-center gap-1"
          style={{ background: '#ffffff', borderColor: 'var(--border-subtle)' }}
        >
          <Plus size={14} /> New Chat
        </button>
      </div>

      {/* Desktop Sidebar (Permanent) */}
      <aside
        className="hidden md:flex w-64 flex-col h-screen sticky top-0 border-r z-20 shrink-0"
        style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Overlay) */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl flex flex-col z-10 animate-fade-in">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
