import React from 'react';

export interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  inviteRole: string;
  setInviteRole: (v: string) => void;
  onSendInvite: () => Promise<void>;
  isDark?: boolean;
}

export default function InviteModal({ isOpen, onClose, inviteEmail, setInviteEmail, inviteRole, setInviteRole, onSendInvite, isDark }: InviteModalProps) {
  if (!isOpen) return null;
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isDark ? 'bg-black/60' : 'bg-black/40'}`}>
      <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl ${isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}>
        <h3 className="font-bold text-lg mb-4">초대하기</h3>
        <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="이메일" className="w-full px-3 py-2 rounded-xl border mb-3 text-sm" />
        <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full px-3 py-2 rounded-xl border mb-4 text-sm">
          <option value="member">멤버</option><option value="admin">관리자</option><option value="owner">소유자</option>
        </select>
        <div className="flex gap-2">
          <button onClick={onSendInvite} className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm">전송</button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl border text-sm">닫기</button>
        </div>
      </div>
    </div>
  );
}
