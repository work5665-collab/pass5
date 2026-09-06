import React from 'react';

export interface ContextMenuProps {
  x: number;
  y: number;
  isDark?: boolean;
  onClose: () => void;
  items: { label: string; icon?: string; onClick: () => void }[];
}

export default function ContextMenu({ x, y, isDark, onClose, items }: ContextMenuProps) {
  return (
    <div className="fixed z-50" style={{ top: y, left: x }}>
      <div className={`w-32 rounded-xl border shadow-2xl py-1 ${isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}>
        {items.map((it, i) => (
          <button key={i} onClick={() => { it.onClick(); onClose(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-600 hover:text-white">
            {it.icon} {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
