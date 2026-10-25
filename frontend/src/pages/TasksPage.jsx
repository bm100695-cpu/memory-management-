import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import {
  Plus, Search, Filter, CheckCircle2, Clock, Circle,
  Trash2, Edit3, ChevronDown, Calendar, X, Tag
} from 'lucide-react';

const CATEGORIES = ['dsa', 'college', 'project', 'internship', 'learning', 'career', 'personal', 'custom'];
const STATUSES = ['planned', 'in_progress', 'completed', 'pending', 'cancelled'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const STATUS_ICON = {
  completed: <CheckCircle2 size={16} className="text-emerald-400" />,
  in_progress: <Clock size={16} className="text-blue-400" />,
  pending: <Clock size={16} className="text-yellow-400" />,
  planned: <Circle size={16} style={{ color: 'var(--text-muted)' }} />,
  cancelled: <X size={16} className="text-red-400" />,
};

const STATUS_BADGE = {
  completed: 'badge-green',
  in_progress: 'badge-blue',
  pending: 'badge-yellow',
  planned: 'badge-gray',
  cancelled: 'badge-red',
};

const PRIORITY_BADGE = {
  low: 'badge-gray',
  medium: 'badge-blue',
  high: 'badge-yellow',
  urgent: 'badge-red',
};

function TaskModal({ task, onClose, onSave }) {
  const [form, setForm] = useState(task || {
    title: '', description: '', category: 'personal', status: 'planned',
    priority: 'medium', scheduledDate: new Date().toISOString().split('T')[0],
  });

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (task) {
        await api.put(`/tasks/${task._id}`, form);
        toast.success('Task updated');
      } else {
        await api.post('/tasks', form);
        toast.success('Task created');
      }
      onSave();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving task');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(32, 33, 35, 0.45)', backdropFilter: 'blur(3px)' }}>
      <div className="card w-full max-w-lg animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-lg">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="input-group">
            <label className="input-label">Title</label>
            <input className="input" placeholder="What do you need to do?" required
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">Description</label>
            <textarea className="input resize-none" rows={2} placeholder="Optional details"
              value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="input-group">
              <label className="input-label">Category</label>
              <select className="input" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Priority</label>
              <select className="input" value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="input-group">
              <label className="input-label">Status</label>
              <select className="input" value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Date</label>
              <input type="date" className="input" value={form.scheduledDate?.split('T')[0] || ''}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary">
              {task ? 'Update' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [filters, setFilters] = useState({ status: '', category: '', search: '' });
  const [stats, setStats] = useState(null);
  const today = new Date().toISOString().split('T')[0];

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.category) params.set('category', filters.category);
      if (filters.search) params.set('search', filters.search);
      const [tasksRes, statsRes] = await Promise.all([
        api.get(`/tasks?${params}`),
        api.get('/tasks/stats'),
      ]);
      setTasks(tasksRes.data.data.tasks);
      setStats(statsRes.data.data.stats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters.status, filters.category]);

  const handleSearch = (e) => {
    e.preventDefault();
    load();
  };

  const deleteTask = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      toast.success('Task deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const quickStatus = async (task, status) => {
    try {
      await api.put(`/tasks/${task._id}`, { status });
      toast.success('Status updated');
      load();
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="section-title">Daily Tasks</h1>
          <p className="section-subtitle">Track your work, progress, and achievements</p>
        </div>
        <button onClick={() => { setEditTask(null); setModalOpen(true); }} className="btn-primary">
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', val: stats.total },
            { label: 'Completed', val: stats.completed },
            { label: 'In Progress', val: stats.in_progress },
            { label: 'Pending', val: stats.pending || 0 + (stats.planned || 0) },
            { label: 'Done %', val: `${stats.completionPercentage}%` },
          ].map(({ label, val }) => (
            <div key={label} className="card-sm text-center">
              <div className="text-xl font-bold text-[#2563EB]">{val}</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6 flex flex-wrap gap-3 items-center">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-48">
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input className="input flex-1 py-2" placeholder="Search tasks..."
            value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <button type="submit" className="btn-primary py-2">Search</button>
        </form>
        <select className="input w-36 py-2" value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select className="input w-36 py-2" value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-2">
        {loading ? (
          Array(5).fill(0).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><CheckCircle2 size={28} /></div>
            <p className="font-medium">No tasks found</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Create a task to get started</p>
            <button onClick={() => { setEditTask(null); setModalOpen(true); }} className="btn-primary">
              <Plus size={16} /> Add Task
            </button>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task._id} className="card-sm flex items-center gap-3 hover:border-blue-400 transition-colors">
              <div className="flex-shrink-0">{STATUS_ICON[task.status]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}
                    style={{ color: 'var(--text-primary)' }}>
                    {task.title}
                  </span>
                  <span className={`badge ${STATUS_BADGE[task.status]}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                  <span className={`badge ${PRIORITY_BADGE[task.priority]}`}>{task.priority}</span>
                  <span className="badge badge-blue">{task.category}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {task.scheduledDate ? format(parseISO(task.scheduledDate), 'MMM d') : 'No date'}
                  </span>
                  {task.description && <span className="truncate max-w-40">{task.description}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {task.status !== 'completed' && (
                  <button onClick={() => quickStatus(task, 'completed')}
                    className="btn-icon text-emerald-400" title="Mark complete">
                    <CheckCircle2 size={16} />
                  </button>
                )}
                <button onClick={() => { setEditTask(task); setModalOpen(true); }}
                  className="btn-icon" title="Edit">
                  <Edit3 size={15} />
                </button>
                <button onClick={() => deleteTask(task._id)}
                  className="btn-icon text-red-400" title="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <TaskModal task={editTask} onClose={() => setModalOpen(false)} onSave={load} />
      )}
    </div>
  );
}
