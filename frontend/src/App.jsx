import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';

import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import TasksPage from './pages/TasksPage';
import JournalPage from './pages/JournalPage';
import MemoryPage from './pages/MemoryPage';
import ResearchPage from './pages/ResearchPage';
import ProfilePage from './pages/ProfilePage';
import AutomationsPage from './pages/AutomationsPage';
import SettingsPage from './pages/SettingsPage';

function PrivateLayout() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--bg-primary)' }}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/memory" element={<MemoryPage />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/automations" element={<AutomationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl animate-pulse-glow flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading JARVIS...</p>
        </div>
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { init } = useAuthStore();
  const initTheme = useThemeStore((s) => s.init);

  useEffect(() => {
    init();
    initTheme();
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: 'white' } },
          error: { iconTheme: { primary: '#ef4444', secondary: 'white' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
          <RequireAuth>
            <PrivateLayout />
          </RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
  );
}
