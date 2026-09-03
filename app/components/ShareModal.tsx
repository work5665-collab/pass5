'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase/client';
import type { ItemShare } from '../../lib/types';

// 공유 대상 (폴더/프로젝트 — 카드 단위 공유는 제거됨)
export interface ShareTarget {
  type: 'folder' | 'project';
  id: string;
  name: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: ShareTarget | null;
  isDark: boolean;
}

type Tab = 'invite' | 'link';

// 파일/폴더 단위 공유 설정 모달
// - 방식 A: 이메일 초대 (수신자 이메일 + 역할)
// - 방식 B: 오픈 링크 (비밀번호 없음. 토큰을 아는 로그인 사용자 = 접근 가능)
// - 기존 공유 목록 표시/삭제
export default function ShareModal({ isOpen, onClose, target, isDark }: ShareModalProps) {
  const [tab, setTab] = useState<Tab>('invite');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  // 현재 사용자의 해당 프로젝트 내 역할 (드롭다운 권한 제어용)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const [shares, setShares] = useState<ItemShare[]>([]);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // 역할 변경 로딩 상태
  const [roleChangingId, setRoleChangingId] = useState<string | null>(null);

  // 역할 부여 규칙: 오너만 admin 부여 가능, admin은 editor/viewer 만 가능
  const availableRoles: { value: 'admin' | 'editor' | 'viewer'; label: string }[] =
    currentUserRole === 'owner'
      ? [
          { value: 'admin', label: '관리자 (Admin) - 편집·공유 관리 및 보기 가능' },
          { value: 'editor', label: '편집자 (Editor) - 내용 편집 및 보기 가능' },
          { value: 'viewer', label: '뷰어 (Viewer) - 보기만 가능' },
        ]
      : [
          { value: 'editor', label: '편집자 (Editor) - 내용 편집 및 보기 가능' },
          { value: 'viewer', label: '뷰어 (Viewer) - 보기만 가능' },
        ];

  const inputCls = `w-full px-4 py-2.5 text-sm rounded-lg border outline-none ${
    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
  }`;

  // 세션 토큰 가져오기 (API Authorization 헤더용)
  const getToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    return fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  }, [getToken]);

  const loadShares = useCallback(async () => {
    if (!target) return;
    setError(null);
    try {
      const res = await authFetch(`/api/shares?targetType=${target.type}&targetId=${target.id}`);
      const data = await res.json();
      if (res.ok) {
        setShares(data.shares || []);
        setCurrentUserRole(data.currentUserRole || null);
      } else {
        setError(data.error || '공유 목록을 불러오지 못했습니다.');
      }
    } catch (e) {
      setError('공유 목록을 불러오지 못했습니다.');
    }
  }, [target, authFetch]);

  // 타겟이 바뀔 때마다 공유 목록 재조회
  useEffect(() => {
    if (isOpen && target) {
      setTab('invite');
      setEmail('');
      setRole('viewer');
      setGeneratedLink(null);
      setError(null);
      setNotice(null);
      setCurrentUserRole(null);
      loadShares();
    }
  }, [isOpen, target, loadShares]);

  if (!isOpen || !target) return null;

  // 방식 A: 이메일 초대
  const handleInvite = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await authFetch('/api/shares', {
        method: 'POST',
        body: JSON.stringify({
          targetType: target.type,
          targetId: target.id,
          shareMethod: 'user',
          email: email.trim(),
          role,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmail('');
        setNotice(`${email.trim()} 님을 ${role === 'editor' ? '편집자' : '뷰어'}로 초대했습니다.`);
        loadShares();
      } else {
        setError(data.error || '초대를 보내지 못했습니다.');
      }
    } catch (e) {
      setError('초대를 보내지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 방식 B: 오픈 링크 생성
  const handleCreateLink = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await authFetch('/api/shares', {
        method: 'POST',
        body: JSON.stringify({
          targetType: target.type,
          targetId: target.id,
          shareMethod: 'link',
          role: 'viewer',
        }),
      });
      const data = await res.json();
      if (res.ok && data.share?.link_token) {
        const link = `${window.location.origin}/share/${data.share.link_token}`;
        setGeneratedLink(link);
        setNotice('공유 링크가 생성되었습니다.');
        loadShares();
      } else {
        setError(data.error || '링크를 생성하지 못했습니다.');
      }
    } catch (e) {
      setError('링크를 생성하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setNotice('링크가 복사되었습니다.');
    } catch (e) {
      setError('링크 복사에 실패했습니다. 직접 복사해 주세요.');
    }
  };

  // 공유 삭제 (취소)
  const handleDelete = async (shareId: string) => {
    if (!confirm('이 공유를 삭제하시겠습니까?')) return;
    setError(null);
    try {
      const res = await authFetch(`/api/shares/${shareId}`, { method: 'DELETE' });
      if (res.ok) {
        setNotice('공유가 삭제되었습니다.');
        loadShares();
      } else {
        const data = await res.json();
        setError(data.error || '공유 삭제에 실패했습니다.');
      }
    } catch (e) {
      setError('공유 삭제에 실패했습니다.');
    }
  };

  // 공유 역할 변경 (이메일 초대 건만)
  const handleRoleChange = async (shareId: string, newRole: 'admin' | 'editor' | 'viewer') => {
    setRoleChangingId(shareId);
    setError(null);
    try {
      const res = await authFetch(`/api/shares/${shareId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setShares(prev => prev.map(s => (s.id === shareId ? { ...s, role: newRole } : s)));
        setNotice('권한이 변경되었습니다.');
      } else {
        setError(data.error || '권한 변경에 실패했습니다.');
      }
    } catch (e) {
      setError('권한 변경에 실패했습니다.');
    } finally {
      setRoleChangingId(null);
    }
  };

  const roleLabel = (r: string) =>
    r === 'admin' ? '관리자' : r === 'editor' ? '편집자' : '뷰어';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-bold">공유</h3>
            <button
              onClick={onClose}
              className={`text-sm ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'}`}
            >
              ✕
            </button>
          </div>
          <p className={`text-xs mb-4 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
            {target.type === 'folder' ? '📁' : '🗂️'} {target.name}
          </p>

          {/* 탭 */}
          <div className={`flex gap-1 mb-4 p-1 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
            <button
              onClick={() => setTab('invite')}
              className={`flex-1 px-3 py-1.5 text-sm rounded-md font-medium transition ${tab === 'invite' ? (isDark ? 'bg-zinc-700 text-white' : 'bg-white shadow-sm text-zinc-900') : 'opacity-60'}`}
            >
              이메일 초대
            </button>
            <button
              onClick={() => setTab('link')}
              className={`flex-1 px-3 py-1.5 text-sm rounded-md font-medium transition ${tab === 'link' ? (isDark ? 'bg-zinc-700 text-white' : 'bg-white shadow-sm text-zinc-900') : 'opacity-60'}`}
            >
              링크 공유
            </button>
          </div>

          {/* 에러/알림 */}
          {error && (
            <div className={`mb-3 p-3 rounded-lg text-xs ${isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-100 text-rose-600'}`}>
              ⚠️ {error}
            </div>
          )}
          {notice && (
            <div className={`mb-3 p-3 rounded-lg text-xs ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
              ✅ {notice}
            </div>
          )}

          {/* 방식 A: 이메일 초대 */}
          {tab === 'invite' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">이메일 주소</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">권한 선택</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'editor' | 'viewer')}
                  className={inputCls}
                >
                  {availableRoles.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleInvite}
                disabled={!email.trim() || loading}
                className={`w-full px-4 py-2.5 text-sm rounded-lg font-medium transition bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? '처리 중...' : '초대 보내기'}
              </button>
            </div>
          )}

          {/* 방식 B: 오픈 링크 */}
          {tab === 'link' && (
            <div className="space-y-3">
              <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                💡 링크를 알고 있고 구글 로그인을 마친 사용자라면 누구나 접근할 수 있습니다. (비밀번호 없음)
              </p>
              {generatedLink ? (
                <div className="space-y-2">
                  <input
                    readOnly
                    value={generatedLink}
                    className={inputCls}
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    onClick={copyLink}
                    className="w-full px-4 py-2.5 text-sm rounded-lg font-medium transition bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    링크 복사
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleCreateLink}
                  disabled={loading}
                  className={`w-full px-4 py-2.5 text-sm rounded-lg font-medium transition bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50`}
                >
                  {loading ? '생성 중...' : '공유 링크 생성'}
                </button>
              )}
            </div>
          )}

          {/* 기존 공유 목록 */}
          {shares.length > 0 && (
            <div className="mt-5">
              <div className={`text-xs font-bold opacity-60 uppercase tracking-wider mb-2`}>공유 목록</div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {shares.map(share => (
                  <div
                    key={share.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg text-xs ${isDark ? 'bg-zinc-800/60' : 'bg-zinc-50'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span>{share.share_method === 'link' ? '🔗' : '✉️'}</span>
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {share.share_method === 'link'
                            ? `링크 공유${share.status === 'revoked' ? ' (해지됨)' : ''}`
                            : share.email}
                        </div>
                        <div className={`opacity-50 flex items-center gap-1`}>
                          {share.share_method === 'user' ? (
                            <select
                              value={share.role}
                              onChange={(e) => handleRoleChange(share.id, e.target.value as 'admin' | 'editor' | 'viewer')}
                              disabled={roleChangingId === share.id}
                              className={`text-[10px] px-1.5 py-0.5 rounded border bg-transparent outline-none cursor-pointer ${
                                isDark ? 'border-zinc-600 text-zinc-300' : 'border-zinc-300 text-zinc-600'
                              } ${roleChangingId === share.id ? 'opacity-50' : ''}`}
                            >
                              {currentUserRole === 'owner' && <option value="admin">관리자</option>}
                              <option value="editor">편집자</option>
                              <option value="viewer">뷰어</option>
                              {currentUserRole !== 'owner' && share.role === 'admin' && <option value="admin">관리자</option>}
                            </select>
                          ) : (
                            <span>{roleLabel(share.role)}</span>
                          )}
                          {share.share_method === 'link' && share.expires_at
                            ? ` · 만료 ${new Date(share.expires_at).toLocaleDateString()}`
                            : ''}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(share.id)}
                      className={`shrink-0 ml-2 px-2 py-1 rounded ${isDark ? 'text-zinc-500 hover:text-rose-400 hover:bg-zinc-700' : 'text-zinc-400 hover:text-rose-600 hover:bg-zinc-200'}`}
                      title="공유 삭제"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
