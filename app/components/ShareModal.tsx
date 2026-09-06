import React from 'react';
export type ShareTarget = { type: string; id: string; name?: string };


export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  target?: { type: string; id: string; name?: string } | null;
  isDark?: boolean;
}

export default function ShareModal({ isOpen, onClose, target, isDark }: ShareModalProps) {
  if (!isOpen) return null;
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isDark ? 'bg-black/60' : 'bg-black/40'}`}>
      <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl ${isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}>
        <h3 className="font-bold text-lg mb-2">공유</h3>
        <p className="text-sm mb-4">{target ? `${target.type} / ${target.name || target.id}` : '선택됨'}</p>
        <button onClick={onClose} className="w-full px-4 py-2 rounded-xl bg-blue-600 text-white font-bold">닫기</button>
      </div>
    </div>
  );
}
