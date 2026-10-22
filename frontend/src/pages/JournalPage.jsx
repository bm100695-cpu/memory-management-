import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from 'lucide-react';

export default function JournalPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const loadSummary = async (d) => {
    setLoading(true);
    setSummary(null);
    try {
      const res = await api.get(`/journal/${d}`);
      setSummary(res.data.data.summary);
    } catch (err) {
      if (err.response?.status !== 404) toast.error('Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSummary(date); }, [date]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/journal/generate', { date });
      setSummary(res.data.data.summary);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  const shift = (days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="section-title">Daily Journal</h1>
          <p className="section-subtitle">Automated summaries of your daily work</p>
        </div>
        <button onClick={generate} disabled={generating} className="btn-primary">
          {generating ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : <Sparkles size={16} />}
          Generate Summary
        </button>
      </div>

      {/* Date navigator */}
      <div className="card mb-6 flex items-center justify-between">
        <button onClick={() => shift(-1)} className="btn-icon"><ChevronLeft size={20} /></button>
        <div className="flex items-center gap-3">
          <CalendarDays size={20} style={{ color: 'var(--accent-secondary)' }} />
          <input type="date" className="input py-1.5 w-44" value={date}
            onChange={(e) => setDate(e.target.value)} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
          </span>
        </div>
        <button onClick={() => shift(1)} disabled={date >= new Date().toISOString().split('T')[0]}
          className="btn-icon disabled:opacity-30"><ChevronRight size={20} /></button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      ) : !summary ? (
        <div className="empty-state">
          <div className="empty-state-icon"><CalendarDays size={28} /></div>
          <p className="font-medium">No summary for this date</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Generate a summary based on your tasks
          </p>
          <button onClick={generate} className="btn-primary">
            <Sparkles size={16} /> Generate Now
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5 animate-fade-in">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Tasks', val: summary.stats.totalTasks },
              { label: 'Completed', val: summary.stats.completedCount },
              { label: 'Pending', val: summary.stats.pendingCount },
              { label: 'Done %', val: `${summary.stats.completionPercentage}%` },
            ].map(({ label, val }) => (
              <div key={label} className="card-sm text-center">
                <div className="text-2xl font-bold gradient-text">{val}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Narrative */}
          {summary.narrativeSummary && (
            <div className="card">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles size={16} style={{ color: 'var(--accent-secondary)' }} />
                Summary
              </h2>
              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}>
                {summary.narrativeSummary}
              </pre>
            </div>
          )}

          {/* Task sections */}
          {[
            { title: '✅ Completed', tasks: summary.completedTasks, color: '#10b981' },
            { title: '🔄 In Progress', tasks: summary.inProgressTasks, color: '#3b82f6' },
            { title: '⏳ Pending', tasks: summary.pendingTasks, color: '#f59e0b' },
          ].map(({ title, tasks, color }) =>
            tasks?.length > 0 ? (
              <div key={title} className="card">
                <h2 className="font-semibold mb-3">{title}</h2>
                <div className="flex flex-col gap-2">
                  {tasks.map((t) => (
                    <div key={t._id || t} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {t.title || t}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}

          {/* Suggested tomorrow */}
          {summary.suggestedTomorrow?.length > 0 && (
            <div className="card" style={{ borderColor: 'var(--border-accent)' }}>
              <h2 className="font-semibold mb-3">💡 Suggested for Tomorrow</h2>
              <p className="text-xs mb-3 badge badge-yellow">AI suggestions — not confirmed tasks</p>
              <div className="flex flex-col gap-2">
                {summary.suggestedTomorrow.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#a78bfa' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>
            Generated: {format(parseISO(summary.generatedAt), 'MMM d, yyyy HH:mm')} · Source: {summary.generationSource}
          </div>
        </div>
      )}
    </div>
  );
}
