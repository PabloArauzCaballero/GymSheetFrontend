'use client';

import { useState } from 'react';
import type { CategoryTreeNode } from '@/shared/api/schemas';

interface CategoryTreeNavProps {
  categories: CategoryTreeNode[];
  activePath?: string;
  onSelectCategory: (path?: string) => void;
}

export function CategoryTreeNav({
  categories,
  activePath,
  onSelectCategory,
}: CategoryTreeNavProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const set = new Set<string>();
    // Autoexpandir si hay ruta activa
    if (activePath) {
      const parts = activePath.split('.');
      let current = '';
      for (const part of parts) {
        current = current ? `${current}.${part}` : part;
        set.add(current);
      }
    }
    return set;
  });

  const toggleExpand = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderNode = (node: CategoryTreeNode, level = 0) => {
    const isExpanded = expandedNodes.has(node.path);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = activePath === node.path;

    return (
      <div key={node.id} className="space-y-1">
        <div
          onClick={() => onSelectCategory(node.path)}
          role="button"
          tabIndex={0}
          className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all cursor-pointer select-none ${
            isSelected
              ? 'bg-[color-mix(in_srgb,var(--volt)_12%,transparent)] text-[var(--accent-ink)] font-semibold'
              : 'text-[var(--text-muted)] hover:bg-[var(--surface-high)]'
          }`}
          style={{ paddingLeft: `${Math.max(12, level * 16 + 12)}px` }}
        >
          <span className="truncate">{node.name}</span>

          {hasChildren && (
            <button
              type="button"
              onClick={(e) => toggleExpand(node.path, e)}
              className="p-1 hover:bg-[var(--surface-high)] rounded-lg transition-transform"
              aria-label={isExpanded ? 'Contraer subcategorías' : 'Expandir subcategorías'}
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isExpanded ? 'rotate-90' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5 border-l border-[var(--border-subtle)] ml-4 pl-1">
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="space-y-1 w-full" aria-label="Navegación de categorías del directorio">
      <div
        onClick={() => onSelectCategory(undefined)}
        role="button"
        tabIndex={0}
        className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all cursor-pointer ${
          !activePath
            ? 'bg-[color-mix(in_srgb,var(--volt)_12%,transparent)] text-[var(--accent-ink)] font-semibold'
            : 'text-[var(--text-muted)] hover:bg-[var(--surface-high)]'
        }`}
      >
        <span>Todos los oferentes</span>
        <span className="text-xs text-[var(--text-muted)]">Todo</span>
      </div>

      {categories.map((cat) => renderNode(cat))}
    </nav>
  );
}
