'use client';

import React from 'react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteEmail: string;
  setInviteEmail: (email: string) => void;
  inviteRole: string;
  setInviteRole: (role: string) => void;
  onSendInvite: () => void;
  isDark: boolean;
}

export default function InviteModal({
  isOpen,
  onClose,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  onSendInvite,
  isDark
}: InviteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">팀원 초대</h3>
            <button
              onClick={onClose}
              className={`text-sm ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'}`}
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">이메일 주소</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="example@email.com"
                className={`w-full px-4 py-2.5 text-sm rounded-lg border outline-none ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">권한 선택</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className={`w-full px-4 py-2.5 text-sm rounded-lg border outline-none ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'}`}
              >
                <option value="admin">관리자 (Admin) - 다른 사람 초대, 멤버 관리, 편집 및 보기 가능</option>
                <option value="member">멤버 (Member) - 내용 편집 및 보기 가능</option>
                <option value="viewer">뷰어 (Viewer) - 보기만 가능</option>
              </select>
            </div>

            <div className={`p-3 rounded-lg text-xs ${isDark ? 'bg-zinc-800/50 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}>
              <p>💡 초대를 보내면 상대방이 이메일로 초대 링크를 받게 됩니다. 또는 초대 링크를 복사해서 카카오톡이나 메신저로 공유할 수도 있습니다.</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-2.5 text-sm rounded-lg font-medium transition ${isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'}`}
            >
              취소
            </button>
            <button
              onClick={onSendInvite}
              disabled={!inviteEmail}
              className={`flex-1 px-4 py-2.5 text-sm rounded-lg font-medium transition bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              초대 보내기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}