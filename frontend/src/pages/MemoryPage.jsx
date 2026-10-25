import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import {
  Plus,
  Search,
  Tag,
  Trash2,
  Edit3,
  X,
  Brain,
  RefreshCw,
  FolderKanban,
  MessageSquare,
  Sparkles,
  Calendar,
  Clock,
  ExternalLink,
} from 'lucide-react';

const CATEGORIES = ['personal', 'preference', 'goal', 'project', 'decision', 'fact', 'contact', 'other'];

const CAT_COLORS = {
  personal: 'badge-blue',
  preference: 'badge-blue',
  goal: 'badge-green',
  project: 'badge-yellow',
  decision: 'badge-red',
  fact: 'badge-gray',
  contact: 'badge-blue',
  other: 'badge-gray',
};

function MemoryModal({ memory, onClose, onSave }) {
  const [form, setForm] = useState(
    memory || {
      title: '',
      content: '',
      category: 'other',
      topic: '',
      tags: [],
      importance: 3,
    }
  );
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
      if (memory?._id) {
        await api.put(`/memories/${memory._id}`, form);
        toast.success('Memory updated');
      } else {
        await api.post('/memories', form);
        toast.success('Memory saved');
      }
      onSave();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving memory');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(32, 33, 35, 0.45)', backdropFilter: 'blur(3px)' }}
    >
      <div className="card w-full max-w-lg shadow-2xl border" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center justify-between mb-5 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#2563EB]" />
            <h2 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
              {memory?._id ? 'Edit Memory' : 'Save New Memory'}
            </h2>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="input-group">
            <label className="input-label">Memory Title</label>
            <input
              className="input"
              placeholder="e.g. Browser Automation Architecture, Favorite Stack"
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Saved Information (Content)</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="What fact, decision, or preference should be remembered?"
              required
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="input-group">
              <label className="input-label">Category</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Related Project / Topic</label>
              <input
                className="input"
                placeholder="e.g. Memory System, Frontend"
                value={form.topic || ''}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="input-group">
              <label className="input-label">Importance (1–5)</label>
              <input
                type="number"
                min={1}
                max={5}
                className="input"
                value={form.importance}
                onChange={(e) => setForm({ ...form, importance: Number(e.target.value) })}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Tags</label>
              <div className="flex gap-2">
                <input
                  className="input flex-1 text-xs"
                  placeholder="Add tag & Enter..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <button type="button" onClick={addTag} className="btn-ghost px-3 text-xs">
                  Add
                </button>
              </div>
            </div>
          </div>

          {form.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {form.tags.map((t) => (
                <span key={t} className="badge badge-purple flex items-center gap-1 text-xs">
                  {t}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, tags: form.tags.filter((x) => x !== t) })}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {memory?._id ? 'Update Memory' : 'Save Memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MemoryPage() {
  const navigate = useNavigate();
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
      setMemories(res.data.data.memories || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load memories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters.category]);

  const deleteMemory = async (id) => {
    if (!confirm('Are you sure you want to delete this memory?')) return;
    try {
      await api.delete(`/memories/${id}`);
      toast.success('Memory deleted');
      load();
    } catch {
      toast.error('Failed to delete memory');
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto animate-fade-in" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="section-title">Personal Memory</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
              <Sparkles size={11} className="inline mr-1 text-[#2563EB]" />
              Connected to Voice & Chat
            </span>
          </div>
          <p className="section-subtitle">
            Saved facts, preferences, goals, and architectural decisions extracted automatically from your chats
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => load()}
            className="btn-ghost flex items-center gap-1.5 py-2 px-3 text-sm"
            title="Refresh memories"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              setEditMemory(null);
              setModalOpen(true);
            }}
            className="btn-primary"
          >
            <Plus size={16} /> Save Memory
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="card mb-6 flex flex-wrap gap-3 items-center" style={{ borderColor: 'var(--border-subtle)' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="flex items-center gap-2 flex-1 min-w-56"
        >
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            className="input flex-1 py-2"
            placeholder="Search by title, topic, content, or tag..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <button type="submit" className="btn-primary py-2 px-4 text-xs font-semibold">
            Search
          </button>
          {filters.search && (
            <button
              type="button"
              onClick={() => {
                setFilters({ ...filters, search: '' });
                setTimeout(load, 0);
              }}
              className="btn-ghost py-2 px-2 text-xs"
            >
              Clear
            </button>
          )}
        </form>

        <select
          className="input w-44 py-2 text-xs"
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">All Categories ({memories.length})</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Memory Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="skeleton h-40 rounded-2xl" />
            ))}
        </div>
      ) : memories.length === 0 ? (
        <div className="empty-state p-12 text-center border rounded-2xl" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="empty-state-icon mx-auto mb-3">
            <Brain size={32} className="text-[#2563EB]" />
          </div>
          <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
            No memories yet
          </h3>
          <p className="text-sm max-w-md mx-auto mb-6" style={{ color: 'var(--text-secondary)' }}>
            The system will automatically identify and save important facts, preferences, project decisions, and goals
            whenever you chat or use Voice mode. You can also manually add your first memory below.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setEditMemory(null);
                setModalOpen(true);
              }}
              className="btn-primary"
            >
              <Plus size={16} /> Save First Memory
            </button>
            <button onClick={() => navigate('/chat')} className="btn-ghost border px-4 py-2 rounded-xl text-sm">
              <MessageSquare size={15} className="mr-1.5" /> Start Chatting
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memories.map((mem) => {
            const conversationId = mem.conversation?._id || mem.conversation || mem.sourceRef;
            const conversationTitle = mem.conversation?.title;

            return (
              <div
                key={mem._id}
                className="card group animate-fade-in flex flex-col justify-between border transition-all hover:border-blue-400"
                style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
              >
                <div>
                  {/* Top Bar: Title, Category, Actions */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge ${CAT_COLORS[mem.category] || 'badge-gray'} text-xs font-semibold`}>
                          {mem.category}
                        </span>
                        {mem.topic && (
                          <span className="badge badge-blue text-xs flex items-center gap-1">
                            <FolderKanban size={11} /> {mem.topic}
                          </span>
                        )}
                        {mem.importance >= 4 && (
                          <span className="text-amber-500 text-xs font-bold" title={`Importance: ${mem.importance}/5`}>
                            {'★'.repeat(mem.importance)}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm mt-1" style={{ color: 'var(--text-primary)' }}>
                        {mem.title || mem.content.slice(0, 60)}
                      </h3>
                    </div>

                    <div className="flex gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => {
                          setEditMemory(mem);
                          setModalOpen(true);
                        }}
                        className="btn-icon p-1.5 hover:text-[#2563EB]"
                        title="Edit memory"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => deleteMemory(mem._id)}
                        className="btn-icon p-1.5 text-red-500 hover:text-red-700"
                        title="Delete memory"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Memory Content */}
                  <p
                    className="text-xs leading-relaxed mb-4 whitespace-pre-wrap line-clamp-4"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {mem.content}
                  </p>
                </div>

                {/* Footer: Tags, Dates, and Link to Original Conversation */}
                <div className="pt-3 border-t flex flex-col gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
                  {mem.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {mem.tags.map((t) => (
                        <span key={t} className="badge badge-gray text-[10px]">
                          <Tag size={9} className="mr-0.5 inline" /> {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] flex-wrap gap-2" style={{ color: 'var(--text-muted)' }}>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1" title="Created date">
                        <Calendar size={11} />
                        {format(parseISO(mem.createdAt), 'MMM d, yyyy')}
                      </span>
                      {mem.updatedAt && mem.updatedAt !== mem.createdAt && (
                        <span className="flex items-center gap-1 text-[10px]" title="Last updated">
                          <Clock size={10} />
                          Updated {format(parseISO(mem.updatedAt), 'MMM d')}
                        </span>
                      )}
                    </div>

                    {conversationId && (
                      <button
                        type="button"
                        onClick={() => navigate(`/chat?conversationId=${conversationId}`)}
                        className="text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 font-medium transition-colors cursor-pointer text-xs"
                        title={`View conversation: ${conversationTitle || 'View in Voice & Chat'}`}
                      >
                        <MessageSquare size={12} />
                        <span>{conversationTitle ? `In "${conversationTitle.slice(0, 18)}..."` : 'View in Chat'}</span>
                        <ExternalLink size={10} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && <MemoryModal memory={editMemory} onClose={() => setModalOpen(false)} onSave={load} />}
    </div>
  );
}
