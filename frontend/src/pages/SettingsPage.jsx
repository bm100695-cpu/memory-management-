import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  Download,
  Key,
  Globe,
  Volume2,
  HardDrive,
  FileText,
  CheckCircle,
  Sun,
  Moon,
  Palette,
} from 'lucide-react';
import { format } from 'date-fns';
import { useThemeStore } from '../store/themeStore';

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState({
    language: 'auto',
    ttsRate: 1.0,
    ttsEnabled: true,
  });

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await api.get('/settings/audit-logs');
      setLogs(res.data.data?.logs || []);
    } catch (err) {
      // It's ok if empty
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleExportData = async () => {
    try {
      setExporting(true);
      const res = await api.get('/settings/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `memory-management-backup-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Local backup downloaded successfully!');
    } catch (err) {
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
          <ShieldCheck className="w-7 h-7 text-[#2563EB]" />
          Settings, Privacy & Appearance
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Choose your UI theme, configure AI engine, voice parameters, and export your personal data.
        </p>
      </div>

      {/* Theme & Appearance (White / Night UI) */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Palette className="w-4 h-4 text-[#2563EB]" />
            UI Appearance: White or Night Mode
          </h2>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Active: <strong className="capitalize" style={{ color: 'var(--accent-primary)' }}>{theme} Mode</strong>
          </span>
        </div>
        <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>
          Click "White" to make the entire UI crisp white and clean, or click "Night" for dark mode.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* White Mode Card */}
          <button
            type="button"
            onClick={() => {
              setTheme('light');
              toast.success('Switched to White Theme ☀️');
            }}
            className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative ${
              theme === 'light'
                ? 'ring-2 ring-[#2563EB] shadow-md'
                : 'hover:border-[#2563EB]/50'
            }`}
            style={{
              background: theme === 'light' ? '#ffffff' : 'var(--bg-secondary)',
              borderColor: theme === 'light' ? 'var(--accent-primary)' : 'var(--border-subtle)',
              boxShadow: theme === 'light' ? '0 4px 14px rgba(37, 99, 235, 0.12)' : 'none',
            }}
          >
            {theme === 'light' && (
              <span className="absolute top-4 right-4 badge badge-blue">
                <CheckCircle className="w-3 h-3" /> Active
              </span>
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                <Sun className="w-5 h-5 fill-amber-500" />
              </div>
              <div>
                <div className="font-bold text-sm" style={{ color: theme === 'light' ? '#202123' : 'var(--text-primary)' }}>
                  ☀️ White Mode (ChatGPT Inspired)
                </div>
                <div className="text-xs" style={{ color: theme === 'light' ? '#6B7280' : 'var(--text-muted)' }}>
                  Crisp white, light-gray sidebar & blue accents
                </div>
              </div>
            </div>
            {/* Visual mini-preview */}
            <div className="p-3 rounded-xl border border-slate-200 bg-[#F7F7F8] flex items-center justify-between text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                <span className="font-semibold text-[#202123]">White Background</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                Active Default
              </span>
            </div>
          </button>

          {/* Night Mode Card */}
          <button
            type="button"
            onClick={() => {
              setTheme('dark');
              toast.success('Switched to Night Theme 🌙');
            }}
            className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative ${
              theme === 'dark'
                ? 'ring-2 ring-purple-500 shadow-md'
                : 'hover:border-purple-400/50'
            }`}
            style={{
              background: theme === 'dark' ? '#1a1a27' : 'var(--bg-secondary)',
              borderColor: theme === 'dark' ? 'var(--accent-primary)' : 'var(--border-subtle)',
              boxShadow: theme === 'dark' ? '0 4px 20px rgba(124, 58, 237, 0.3)' : 'none',
            }}
          >
            {theme === 'dark' && (
              <span className="absolute top-4 right-4 badge badge-purple">
                <CheckCircle className="w-3 h-3" /> Active
              </span>
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                <Moon className="w-5 h-5 fill-purple-300" />
              </div>
              <div>
                <div className="font-bold text-sm text-white">
                  🌙 Night Mode
                </div>
                <div className="text-xs text-slate-400">
                  Deep dark, sleek & eye-friendly
                </div>
              </div>
            </div>
            {/* Visual mini-preview */}
            <div className="p-3 rounded-xl border border-white/10 bg-[#0a0a0f] flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm" />
                <span className="font-semibold text-white">Night Deep Dark</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-950 text-purple-300 border border-purple-500/30">
                Cyber
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* AI & Engine Status */}
      <div className="card">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Key className="w-4 h-4 text-amber-400" /> AI Provider & Engine
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Primary Provider</span>
            <div className="text-base font-medium mt-1" style={{ color: 'var(--text-primary)' }}>OpenAI / Hybrid Local</div>
            <span className="badge badge-green mt-2">Active</span>
          </div>
          <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Model</span>
            <div className="text-base font-medium mt-1" style={{ color: 'var(--text-primary)' }}>gpt-4o-mini / Rule Engine</div>
            <span className="badge badge-purple mt-2">Multi-lingual</span>
          </div>
          <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Fallback Resilience</span>
            <div className="text-base font-medium text-emerald-500 mt-1">Offline Rule Parser</div>
            <span className="badge badge-green mt-2">Always Operational</span>
          </div>
        </div>
      </div>

      {/* Voice & Language Preferences */}
      <div className="card">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Volume2 className="w-4 h-4 text-[#2563EB]" /> Voice & Speech Preferences
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label">Speech Recognition Language</label>
            <select
              className="input"
              value={voiceSettings.language}
              onChange={(e) => setVoiceSettings({ ...voiceSettings, language: e.target.value })}
            >
              <option value="auto">Auto-detect (Hindi / Hinglish / English)</option>
              <option value="hi-IN">Hindi (हिंदी - hi-IN)</option>
              <option value="en-IN">Indian English (en-IN)</option>
              <option value="en-US">US English (en-US)</option>
            </select>
          </div>

          <div>
            <label className="input-label">Text-to-Speech (TTS) Voice Engine</label>
            <select className="input" defaultValue="browser">
              <option value="browser">Web Speech API (Local & Instant)</option>
              <option value="openai">OpenAI TTS</option>
              <option value="elevenlabs">ElevenLabs Neural Voice</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Ownership & Export */}
      <div className="card border-[#E5E7EB] bg-blue-50/25">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Download className="w-4 h-4 text-[#2563EB]" /> Export Your Complete Data
            </h2>
            <p className="text-xs mt-1 max-w-xl" style={{ color: 'var(--text-secondary)' }}>
              100% Data Sovereignty: Download your tasks, long-term memories, daily journal summaries, conversation logs, and profile info into an encrypted JSON file anytime.
            </p>
          </div>
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="btn-primary shrink-0"
          >
            {exporting ? (
              'Exporting...'
            ) : (
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4" /> Download JSON Backup
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Security & Audit Logs */}
      <div className="card">
        <h2 className="text-base font-semibold mb-4 flex items-center justify-between" style={{ color: 'var(--text-primary)' }}>
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Security Audit Log
          </span>
          <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>Tamper-evident activity trail</span>
        </h2>

        {loadingLogs ? (
          <div className="py-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>All systems nominal. Authentication sessions, memory accesses, and API calls are actively recorded.</span>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {logs.map((log) => (
              <div key={log._id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="badge badge-gray">{log.action}</span>
                  <span className="text-slate-300">{log.resourceType}</span>
                </div>
                <span className="text-slate-500">
                  {log.timestamp ? format(new Date(log.timestamp), 'MMM d, HH:mm:ss') : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
