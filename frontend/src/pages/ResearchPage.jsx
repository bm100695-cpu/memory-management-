import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { BookOpen, Plus, ExternalLink, Trash2, Search, Tag, Sparkles, X } from 'lucide-react';
import { format } from 'date-fns';

export default function ResearchPage() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    notes: '',
    tags: '',
  });

  useEffect(() => {
    fetchSources();
  }, [selectedTag]);

  const fetchSources = async (searchQuery = search) => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedTag) params.tag = selectedTag;

      const res = await api.get('/research', { params });
      setSources(res.data.data?.sources || []);
    } catch (err) {
      toast.error('Failed to load research items');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSources(search);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.url.trim()) {
      toast.error('URL is required');
      return;
    }

    try {
      const tagsArray = formData.tags
        ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      await api.post('/research', {
        ...formData,
        tags: tagsArray,
      });

      toast.success('Research item saved!');
      setModalOpen(false);
      setFormData({ url: '', title: '', notes: '', tags: '' });
      fetchSources();
    } catch (err) {
      toast.error('Failed to save item');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this research item?')) return;
    try {
      await api.delete(`/research/${id}`);
      toast.success('Deleted');
      setSources((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      toast.error('Failed to delete item');
    }
  };

  const allTags = Array.from(new Set(sources.flatMap((s) => s.tags || [])));

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <BookOpen className="w-7 h-7 text-indigo-400" />
            Research Library
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Store URLs, articles, excerpts, and research notes with AI summarization.
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="card mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search research by title, notes, or URL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
          <button type="submit" className="btn-ghost">
            Search
          </button>
        </form>

        {allTags.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1">
            <span className="text-xs text-slate-500 flex items-center gap-1 shrink-0">
              <Tag className="w-3 h-3" /> Filter:
            </span>
            <button
              onClick={() => setSelectedTag('')}
              className={`badge cursor-pointer ${
                selectedTag === '' ? 'badge-purple' : 'badge-gray'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? '' : tag)}
                className={`badge cursor-pointer ${
                  selectedTag === tag ? 'badge-purple' : 'badge-gray'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid of Sources */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sources.length === 0 ? (
        <div className="card py-16 text-center">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>No research saved yet</h3>
          <p className="text-sm max-w-sm mx-auto mt-1 mb-4" style={{ color: 'var(--text-secondary)' }}>
            Collect documentation, tech articles, or notes you want JARVIS to reference.
          </p>
          <button onClick={() => setModalOpen(true)} className="btn-primary mx-auto">
            <Plus className="w-4 h-4" /> Add First Research Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((item) => (
            <div key={item._id} className="card flex flex-col justify-between group">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-base font-semibold line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                    {item.title || item.url}
                  </h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-icon"
                      title="Open Link"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-400 hover:text-white" />
                    </a>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="btn-icon"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                    </button>
                  </div>
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:underline block truncate mb-3"
                >
                  {item.url}
                </a>

                {item.notes && (
                  <p className="text-sm text-slate-300 bg-black/20 p-3 rounded-lg mb-3 whitespace-pre-wrap">
                    {item.notes}
                  </p>
                )}

                {item.summary && (
                  <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-lg mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-purple-300 font-medium mb-1">
                      <Sparkles className="w-3.5 h-3.5" /> AI Summary
                    </div>
                    <p className="text-xs text-slate-300">{item.summary}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-slate-500">
                <div className="flex flex-wrap gap-1">
                  {(item.tags || []).map((t) => (
                    <span key={t} className="badge badge-purple">
                      #{t}
                    </span>
                  ))}
                </div>
                <span>{item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy') : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ background: 'var(--modal-overlay)' }}>
          <div className="card max-w-lg w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <BookOpen className="w-5 h-5 text-indigo-400" /> Save Research Item
              </h2>
              <button onClick={() => setModalOpen(false)} className="btn-icon">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="input-label">URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/article"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="input-label">Title</label>
                <input
                  type="text"
                  placeholder="Article or Tool title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="input-label">Notes & Highlights</label>
                <textarea
                  rows={4}
                  placeholder="Key takeaways, thoughts, or excerpts..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="input-label">Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="ai, architecture, react, database"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save to Library
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
