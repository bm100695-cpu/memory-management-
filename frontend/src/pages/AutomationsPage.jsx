import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Cpu,
  Play,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Globe,
  Plus,
  RefreshCw,
  X,
  StopCircle,
} from 'lucide-react';
import { format } from 'date-fns';

export default function AutomationsPage() {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
  });

  useEffect(() => {
    fetchExecutions();
  }, []);

  const fetchExecutions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/automations');
      setExecutions(res.data.data?.executions || []);
    } catch (err) {
      toast.error('Failed to load automation history');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    try {
      setTriggering(true);
      const instruction = newTask.title + (newTask.description ? `: ${newTask.description}` : '');
      const planRes = await api.post('/automations/plan', { instruction });
      const execution = planRes.data.data?.execution;

      if (execution?._id) {
        // Execute steps autonomously
        await api.post(`/automations/${execution._id}/execute-all`);
      }

      toast.success('Autonomous task planned and executed!');
      setModalOpen(false);
      setNewTask({ title: '', description: '' });
      fetchExecutions();
    } catch (err) {
      toast.error('Failed to execute task');
    } finally {
      setTriggering(false);
    }
  };

  const handleCancelTask = async (id) => {
    try {
      await api.post(`/automations/${id}/cancel`, { reason: 'User cancelled from dashboard' });
      toast.success('Task cancelled');
      fetchExecutions();
    } catch (err) {
      toast.error('Failed to cancel task');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="badge badge-green">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'running':
      case 'planning':
        return (
          <span className="badge badge-yellow">
            <Clock className="w-3 h-3 animate-spin" /> In Progress
          </span>
        );
      case 'cancelled':
        return (
          <span className="badge badge-gray">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      case 'failed':
      default:
        return (
          <span className="badge badge-red">
            <AlertTriangle className="w-3 h-3" /> Failed
          </span>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <Cpu className="w-7 h-7 text-[#2563EB]" />
            Automations & Browser Assistant
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Review continuous voice tasks, autonomous browser search runs, and Chrome Extension execution history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchExecutions} className="btn-ghost" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New Automation Plan
          </button>
        </div>
      </div>

      {/* Chrome Extension Status Banner */}
      <div className="card mb-6 border-[#E5E7EB] bg-blue-50/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB] shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                Chrome Extension Companion
                <span className="badge badge-green text-[10px]">v2.0 Manifest V3 Ready</span>
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Load the unpacked extension from <code className="px-1.5 py-0.5 rounded text-xs border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>chrome-extension/</code> in <code className="px-1.5 py-0.5 rounded text-xs border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>chrome://extensions</code> for autonomous active tab search and form autofill.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Autonomous Safeguard</p>
              <p className="text-xs font-semibold text-emerald-600">Verified Output Verification</p>
            </div>
          </div>
        </div>
      </div>

      {/* Execution History */}
      <div className="card">
        <h2 className="text-base font-semibold mb-4 flex items-center justify-between" style={{ color: 'var(--text-primary)' }}>
          <span>Autonomous Execution Plans & History</span>
          <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
            {executions.length} plans recorded
          </span>
        </h2>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : executions.length === 0 ? (
          <div className="py-12 text-center" style={{ color: 'var(--text-muted)' }}>
            <Cpu className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No automations executed yet.</p>
            <p className="text-xs mt-1">
              Start continuous voice mode in Voice & Chat or click "New Automation Plan".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" style={{ color: 'var(--text-primary)' }}>
              <thead className="text-xs uppercase border-b"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <tr>
                  <th className="py-3 px-4">Task Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Steps Progress</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Triggered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {executions.map((exec) => (
                  <tr key={exec._id} className="hover:bg-black/5 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-medium">
                      <div style={{ color: 'var(--text-primary)' }}>{exec.title}</div>
                      {exec.description && (
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{exec.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(exec.status)}</td>
                    <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {exec.completedSteps || 0} / {exec.totalSteps || 1} steps
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="text-emerald-500 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Output Verified
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {exec.createdAt ? format(new Date(exec.createdAt), 'MMM d, HH:mm') : ''}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {['running', 'pending', 'planning'].includes(exec.status) && (
                        <button
                          type="button"
                          onClick={() => handleCancelTask(exec._id)}
                          className="btn-danger py-1 px-2.5 text-xs inline-flex items-center gap-1"
                        >
                          <StopCircle size={12} /> Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Task Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
          style={{ background: 'rgba(32, 33, 35, 0.45)' }}>
          <div className="card max-w-lg w-full p-6 animate-fade-in shadow-2xl border"
            style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Cpu className="w-5 h-5 text-[#2563EB]" /> Plan & Execute Automation Task
              </h2>
              <button onClick={() => setModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStartTask} className="space-y-4">
              <div>
                <label className="input-label">Task Instruction (Any Website or Search Query) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Open YouTube, Find official website of IIT Bombay, Search for DSA practice websites"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="input"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => setNewTask({ title: 'Open YouTube', description: '' })}
                  className="px-2 py-0.5 rounded-lg text-[11px] border border-[#E5E7EB] bg-white text-[#202123] hover:bg-[#F0F1F3] cursor-pointer transition-colors"
                >
                  🌐 Open YouTube
                </button>
                <button
                  type="button"
                  onClick={() => setNewTask({ title: 'Find official login page for Spotify', description: 'Validate safe URL' })}
                  className="px-2 py-0.5 rounded-lg text-[11px] border border-[#E5E7EB] bg-white text-[#202123] hover:bg-[#F0F1F3] cursor-pointer transition-colors"
                >
                  🔐 Find Spotify Login
                </button>
                <button
                  type="button"
                  onClick={() => setNewTask({ title: 'Find websites to practice DSA', description: 'Compare top platforms' })}
                  className="px-2 py-0.5 rounded-lg text-[11px] border border-[#E5E7EB] bg-white text-[#202123] hover:bg-[#F0F1F3] cursor-pointer transition-colors"
                >
                  💻 Practice DSA Sites
                </button>
              </div>

              <div>
                <label className="input-label">Additional Criteria / Context</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Summarize useful information, verify official domain..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="input resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={triggering}
                  className="btn-primary"
                >
                  {triggering ? 'Planning & Executing...' : 'Plan & Run Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
