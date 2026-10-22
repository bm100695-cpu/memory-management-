import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { format } from 'date-fns';
import {
  CheckCircle, Clock, AlertCircle, TrendingUp,
  Brain, MessageSquare, Zap, Plus, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

function StatCard({ icon: Icon, label, value, color, glow }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}22`, color }}>
        <Icon size={22} />
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</div>
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      </div>
    </div>
  );
}

function TaskRow({ task }) {
  const statusConfig = {
    completed: { dot: 'status-dot-green', badge: 'badge-green', label: 'Done' },
    in_progress: { dot: 'status-dot-blue', badge: 'badge-blue', label: 'In Progress' },
    pending: { dot: 'status-dot-yellow', badge: 'badge-yellow', label: 'Pending' },
    planned: { dot: 'status-dot-gray', badge: 'badge-gray', label: 'Planned' },
  };
  const cfg = statusConfig[task.status] || statusConfig.planned;

  return (
    <div className="flex items-center gap-3 py-3 border-b"
      style={{ borderColor: 'var(--border-subtle)' }}>
      <span className={`status-dot ${cfg.dot} flex-shrink-0`} />
      <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-primary)' }}>
        {task.title}
      </span>
      <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [todayTasks, setTodayTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), 'yyyy-MM-dd');
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, tasksRes] = await Promise.all([
          api.get('/tasks/stats'),
          api.get(`/tasks/by-date?date=${today}`),
        ]);
        setStats(statsRes.data.data.stats);
        setTodayTasks(tasksRes.data.data.tasks);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [today]);

  return (
    <div className="flex-1 p-8 overflow-y-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {greeting}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)
        ) : (
          <>
            <StatCard icon={CheckCircle} label="Completed Today" value={stats?.completedCount ?? 0} color="#10b981" />
            <StatCard icon={Clock} label="Pending" value={stats?.pendingCount ?? 0} color="#f59e0b" />
            <StatCard icon={TrendingUp} label="In Progress" value={stats?.inProgressCount ?? 0} color="#3b82f6" />
            <StatCard icon={Zap} label="Completion %" value={`${stats?.completionPercentage ?? 0}%`} color="#a78bfa" />
          </>
        )}
      </div>

      {/* Progress bar */}
      {stats && (
        <div className="card mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="font-medium text-sm">Today's Progress</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {stats.completedCount}/{stats.totalTasks} tasks
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${stats.completionPercentage}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Today's Tasks</h2>
            <Link to="/tasks" className="btn-ghost text-xs py-1.5">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          {loading ? (
            Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-10 mb-2 rounded-lg" />)
          ) : todayTasks.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon"><CheckCircle size={24} /></div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No tasks for today</p>
              <Link to="/tasks" className="btn-primary text-xs py-1.5">
                <Plus size={14} /> Add a task
              </Link>
            </div>
          ) : (
            todayTasks.map((t) => <TaskRow key={t._id} task={t} />)
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-col gap-2">
            {[
              { to: '/chat', icon: MessageSquare, label: 'Open AI Chat', desc: 'Chat or use voice' },
              { to: '/tasks', icon: Plus, label: 'Add New Task', desc: 'Add to today\'s list' },
              { to: '/memory', icon: Brain, label: 'Browse Memory', desc: 'View saved facts' },
              { to: '/journal', label: 'View Journal', icon: TrendingUp, desc: 'Daily summaries' },
            ].map(({ to, icon: Icon, label, desc }) => (
              <Link key={to} to={to}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
                  <Icon size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{desc}</div>
                </div>
                <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--text-muted)' }} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
