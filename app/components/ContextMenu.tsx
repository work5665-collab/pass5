'use client';

import React, { useEffect } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  isDark: boolean;
}

// 우클릭 시 커서 위치에 표시되는 공용 컨텍스트 메뉴
export default function ContextMenu({ x, y, items, onClose, isDark }: ContextMenuProps) {
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [onClose]);

  return (
    <div
      className={`fixed z-[60] min-w-[170px] rounded-lg border shadow-2xl py-1 ${
        isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'
      }`}
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            item.onClick();
            onClose();
          }}
          className={`w-full text-left px-3 py-2 text-sm transition ${
            item.danger
              ? isDark
                ? 'text-rose-400 hover:bg-zinc-700'
                : 'text-rose-600 hover:bg-zinc-100'
              : isDark
                ? 'text-zinc-200 hover:bg-zinc-700'
                : 'text-zinc-800 hover:bg-zinc-100'
          }`}
        >
          {item.icon && <span className="mr-2">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  );
}
