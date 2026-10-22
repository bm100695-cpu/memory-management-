import React from 'react';
import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title, description, icon: Icon = Construction }) {
  return (
    <div className="flex-1 p-8 flex items-center justify-center animate-fade-in">
      <div className="text-center">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
          <Icon size={36} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>
          {description || 'This feature is being built in the next phase. Stay tuned!'}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 badge badge-yellow">
          <Construction size={12} /> Coming in next phase
        </div>
      </div>
    </div>
  );
}
