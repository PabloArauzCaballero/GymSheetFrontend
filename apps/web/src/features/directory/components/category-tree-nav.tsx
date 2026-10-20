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
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
              : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
          }`}
          style={{ paddingLeft: `${Math.max(12, level * 16 + 12)}px` }}
        >
          <span className="truncate">{node.name}</span>

          {hasChildren && (
            <button
              type="button"
              onClick={(e) => toggleExpand(node.path, e)}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-transform"
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
          <div className="space-y-0.5 border-l border-neutral-200 dark:border-neutral-800 ml-4 pl-1">
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
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
        }`}
      >
        <span>Todos los oferentes</span>
        <span className="text-xs text-neutral-400">Todo</span>
      </div>

      {categories.map((cat) => renderNode(cat))}
    </nav>
  );
}
