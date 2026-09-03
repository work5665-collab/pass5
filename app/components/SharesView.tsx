'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase/client';
import {
  fetchMyShares,
  fetchSharesSharedWithMe,
  deleteShare,
  updateShare,
} from '../../lib/supabase/shares';
import type { ItemShare, DictType } from '../../lib/types';
import type { ShareTarget } from './ShareModal';

interface SharesViewProps {
  isDark: boolean;
  t: DictType;
  handleGoBack: () => void;
  // 공유 행에서 '관리' 클릭 시 해당 대상의 ShareModal 을 다시 염
  onManageShare?: (target: ShareTarget) => void;
  // 공유 행 클릭 시 해당 대상으로 이동
  onOpenTarget?: (share: ItemShare) => void;
}

// 공유 현황 페이지
// - 내가 공유한 항목 (생성·해지·삭제 가능)
// - 나에게 공유된 항목 (조회만 가능)
export default function SharesView({ isDark, t, handleGoBack, onManageShare, onOpenTarget }: SharesViewProps) {
  const [myShares, setMyShares] = useState<ItemShare[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<ItemShare[]>([]);
  const [folderNames, setFolderNames] = useState<Record<string, string>>({});
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleChangingId, setRoleChangingId] = useState<string | null>(null);

  const cardCls = (hover: boolean) =>
    `p-5 rounded-2xl border transition ${
      isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
    } ${hover ? (isDark ? 'hover:bg-zinc-800/60 hover:border-zinc-600' : 'hover:bg-zinc-50 hover:border-zinc-300') : ''}`;

  const roleLabel = (r: string) =>
    r === 'admin' ? '관리자 (Admin)' : r === 'editor' ? '편집자 (Editor)' : '뷰어 (Viewer)';

  const loadShares = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mine, forMe] = await Promise.all([fetchMyShares(), fetchSharesSharedWithMe()]);
      setMyShares(mine);
      setSharedWithMe(forMe);

      // 대상 이름 해석용 (RLS 범위 내에서 조회 가능한 항목 기준)
      const { data: f } = await supabase.from('folders').select('id, name');
      const { data: p } = await supabase.from('projects').select('id, name');
      setFolderNames(Object.fromEntries((f || []).map((x: any) => [x.id, x.name])));
      setProjectNames(Object.fromEntries((p || []).map((x: any) => [x.id, x.name])));
    } catch (e) {
      setError('공유 현황을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShares();
  }, [loadShares]);

  // 액션: 해지/복구 토글 (status: active ↔ revoked)
  const toggleStatus = async (share: ItemShare) => {
    const next = share.status === 'active' ? 'revoked' : 'active';
    const ok = await updateShare(share.id, { status: next });
    if (ok) {
      setMyShares(prev => prev.map(s => (s.id === share.id ? { ...s, status: next } : s)));
    }
  };

  // 액션: 공유 삭제
  const handleDelete = async (share: ItemShare) => {
    if (!confirm('이 공유를 삭제하시겠습니까?')) return;
    const ok = await deleteShare(share.id);
    if (ok) {
      setMyShares(prev => prev.filter(s => s.id !== share.id));
    }
  };

  // 액션: 역할 변경 (이메일 초대 건만 — API 경유로 오너-only-admin 규칙 준수)
  const handleRoleChange = async (share: ItemShare, newRole: 'admin' | 'editor' | 'viewer') => {
    setRoleChangingId(share.id);
    const token = (await supabase.auth.getSession()).data.session?.access_token ?? null;
    try {
      const res = await fetch(`/api/shares/${share.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setMyShares(prev => prev.map(s => (s.id === share.id ? { ...s, role: newRole } : s)));
      } else {
        const data = await res.json();
        alert(data.error || '권한 변경에 실패했습니다.');
      }
    } catch (e) {
      alert('권한 변경에 실패했습니다.');
    } finally {
      setRoleChangingId(null);
    }
  };

  const targetName = (share: ItemShare) => {
    const map = share.target_type === 'folder' ? folderNames : projectNames;
    return map[share.target_id] || '(삭제된 항목)';
  };

  const targetIcon = (share: ItemShare) => (share.target_type === 'folder' ? '📁' : '🗂️');

  // 행 렌더링 헬퍼 (컴포넌트 내부 정의 시 매 렌더 remount 되므로 함수로 처리)
  const renderRow = (share: ItemShare, mine = false) => (
    <div
      key={share.id}
      className={`${cardCls(!!onOpenTarget)} flex flex-col gap-2 ${onOpenTarget ? 'cursor-pointer' : ''}`}
      onClick={() => onOpenTarget?.(share)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{targetIcon(share)}</span>
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">{targetName(share)}</div>
            <div className={`text-[11px] opacity-50`}>
              {share.target_type === 'folder' ? '폴더' : '프로젝트'}
              {mine && share.email ? ` · ${share.email}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
            share.status === 'active'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-zinc-500/20 text-zinc-400'
          }`}>
            {share.status === 'active' ? '활성' : '해지됨'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] opacity-70">
          <span>{share.share_method === 'link' ? '🔗 링크 공유' : '✉️ 이메일 초대'}</span>
          <span>·</span>
          {mine && share.share_method === 'user' ? (
            <select
              value={share.role}
              onChange={(e) => {
                e.stopPropagation();
                handleRoleChange(share, e.target.value as 'admin' | 'editor' | 'viewer');
              }}
              onClick={(e) => e.stopPropagation()}
              disabled={roleChangingId === share.id}
              className={`text-[10px] px-1.5 py-0.5 rounded border bg-transparent outline-none cursor-pointer font-semibold ${
                isDark ? 'border-zinc-600 text-zinc-300' : 'border-zinc-300 text-zinc-600'
              } ${roleChangingId === share.id ? 'opacity-50' : ''}`}
            >
              <option value="admin">관리자</option>
              <option value="editor">편집자</option>
              <option value="viewer">뷰어</option>
            </select>
          ) : (
            <span className="font-semibold">{roleLabel(share.role)}</span>
          )}
          {share.expires_at && (
            <>
              <span>·</span>
              <span>만료 {new Date(share.expires_at).toLocaleDateString()}</span>
            </>
          )}
        </div>

        {mine && onManageShare && (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() =>
                onManageShare({
                  type: share.target_type === 'folder' ? 'folder' : 'project',
                  id: share.target_id,
                  name: targetName(share),
                })
              }
              className={`text-[10px] px-2 py-1 rounded font-medium transition ${
                isDark
                  ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white'
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white'
              }`}
              title="공유 설정 다시 열기"
            >
              관리
            </button>
            <button
              onClick={() => toggleStatus(share)}
              className={`text-[10px] px-2 py-1 rounded font-medium transition ${
                isDark
                  ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                  : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
              }`}
            >
              {share.status === 'active' ? '해지' : '복구'}
            </button>
            <button
              onClick={() => handleDelete(share)}
              className={`text-[10px] px-2 py-1 rounded font-medium transition ${
                isDark ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white' : 'bg-rose-100 text-rose-600 hover:bg-rose-500 hover:text-white'
              }`}
            >
              삭제
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // 섹션 렌더링 헬퍼
  const renderSection = (title: string, desc: string, shares: ItemShare[], mine = false) => (
    <section>
      <div className="mb-3">
        <h3 className="text-base font-black">{title}</h3>
        <p className={`text-[11px] opacity-50`}>{desc}</p>
      </div>
      {shares.length === 0 ? (
        <div className={`${cardCls(false)} text-xs opacity-50 italic`}>표시할 공유가 없습니다.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shares.map(s => renderRow(s, mine))}
        </div>
      )}
    </section>
  );

  return (
    <div className="max-w-4xl mx-auto pb-12 w-full flex flex-col gap-8">
      {/* 상단 네비게이션 */}
      <div className="flex justify-between items-center bg-zinc-500/10 p-3 rounded-xl text-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={handleGoBack}
            className={`font-semibold px-2.5 py-1 rounded-lg transition ${isDark ? 'text-zinc-300 hover:text-white bg-zinc-700/50' : 'text-zinc-700 hover:text-zinc-900 bg-zinc-200'}`}
          >
            {t.back}
          </button>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 font-bold uppercase tracking-wider">
          Shares
        </span>
      </div>

      {/* 제목 */}
      <div>
        <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Share Status</span>
        <h2 className="text-xl font-black mt-0.5">🔗 공유 현황</h2>
        <p className={`text-xs mt-1 opacity-60`}>
          로그인한 사용자(구글)만 접근 가능한 폴더/프로젝트 단위 공유 현황입니다.
        </p>
      </div>

      {error && (
        <div className={`p-3 rounded-lg text-xs ${isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-100 text-rose-600'}`}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="text-xs opacity-50">불러오는 중...</div>
      ) : (
        <>
          {renderSection(
            '내가 공유한 항목',
            '내가 생성한 이메일 초대 및 오픈 링크. 해지·복구·삭제할 수 있습니다.',
            myShares,
            true
          )}
          {renderSection(
            '나에게 공유된 항목',
            '다른 사용자가 나에게 초대한 항목.',
            sharedWithMe
          )}
        </>
      )}
    </div>
  );
}