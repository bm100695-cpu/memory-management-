import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { Plus, Search, Tag, Trash2, Edit3, X, Brain } from 'lucide-react';

const CATEGORIES = ['personal', 'preference', 'goal', 'project', 'decision', 'fact', 'contact', 'other'];

const CAT_COLORS = {
  personal: 'badge-purple',
  preference: 'badge-blue',
  goal: 'badge-green',
  project: 'badge-yellow',
  decision: 'badge-red',
  fact: 'badge-gray',
  contact: 'badge-blue',
  other: 'badge-gray',
};

function MemoryModal({ memory, onClose, onSave }) {
  const [form, setForm] = useState(memory || { content: '', category: 'other', tags: [], importance: 3 });
  const [tagInput, setTagInput] = useState('');

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      setForm({ ...form, tags: [...form.tags, tag] });
    }
    setTagInput('');
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (memory) {
        await api.put(`/memories/${memory._id}`, form);
        toast.success('Memory updated');
      } else {
        await api.post('/memories', form);
        toast.success('Memory saved');
      }
      onSave();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="card w-full max-w-lg animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-lg">{memory ? 'Edit Memory' : 'Save Memory'}</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="input-group">
            <label className="input-label">Content</label>
            <textarea className="input resize-none" rows={3}
              placeholder="What should I remember? (e.g. I prefer chai over coffee)"
              required value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })} />
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
              <label className="input-label">Importance (1–5)</label>
              <input type="number" min={1} max={5} className="input"
                value={form.importance}
                onChange={(e) => setForm({ ...form, importance: Number(e.target.value) })} />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Tags</label>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Add tag..."
                value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
              <button type="button" onClick={addTag} className="btn-ghost px-3">Add</button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((t) => (
                  <span key={t} className="badge badge-purple flex items-center gap-1">
                    {t}
                    <button type="button" onClick={() => setForm({ ...form, tags: form.tags.filter((x) => x !== t) })}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary">
              {memory ? 'Update' : 'Save Memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MemoryPage() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMemory, setEditMemory] = useState(null);
  const [filters, setFilters] = useState({ search: '', category: '' });

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.category) params.set('category', filters.category);
      const res = await api.get(`/memories?${params}`);
      setMemories(res.data.data.memories);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters.category]);

  const deleteMemory = async (id) => {
    if (!confirm('Delete this memory?')) return;
    try {
      await api.delete(`/memories/${id}`);
      toast.success('Memory deleted');
      load();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="section-title">Personal Memory</h1>
          <p className="section-subtitle">Saved facts, preferences, goals, and more</p>
        </div>
        <button onClick={() => { setEditMemory(null); setModalOpen(true); }} className="btn-primary">
          <Plus size={16} /> Save Memory
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6 flex flex-wrap gap-3 items-center">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex items-center gap-2 flex-1 min-w-48">
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input className="input flex-1 py-2" placeholder="Search memories..."
            value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <button type="submit" className="btn-primary py-2">Search</button>
        </form>
        <select className="input w-36 py-2" value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Memory cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : memories.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Brain size={28} /></div>
          <p className="font-medium">No memories yet</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Save important facts, preferences, and goals
          </p>
          <button onClick={() => { setEditMemory(null); setModalOpen(true); }} className="btn-primary">
            <Plus size={16} /> Save First Memory
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memories.map((mem) => (
            <div key={mem._id} className="card group animate-fade-in">
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className={`badge ${CAT_COLORS[mem.category] || 'badge-gray'}`}>{mem.category}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditMemory(mem); setModalOpen(true); }} className="btn-icon">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => deleteMemory(mem._id)} className="btn-icon text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-primary)' }}>
                {mem.content}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {mem.tags?.map((t) => (
                    <span key={t} className="badge badge-gray text-xs">
                      <Tag size={9} /> {t}
                    </span>
                  ))}
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {format(parseISO(mem.createdAt), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <MemoryModal memory={editMemory} onClose={() => setModalOpen(false)} onSave={load} />
      )}
    </div>
  );
}
