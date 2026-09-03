'use client';

import React, { Fragment, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase/client';
import type { DictType } from '../../lib/types';

// 공유 행 (백엔드 그룹핑 응답의 단일 항목)
interface ShareEntry {
  id: string;
  target_type: 'folder' | 'project';
  target_id: string;
  target_name: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'revoked';
  expires_at: string | null;
  created_at: string;
  share_method: 'user' | 'link';
  link_token: string | null;
}

interface ShareGroup {
  email: string;
  name: string;
  department: string;
  shares: ShareEntry[];
}

interface SharesViewProps {
  isDark: boolean;
  t: DictType;
  handleGoBack: () => void;
  // 공유 항목(이름/아이콘) 클릭 시 해당 대상(프로젝트/폴더)으로 이동
  onOpenTarget?: (share: { target_type: 'folder' | 'project'; target_id: string }) => void;
}

type Role = 'admin' | 'editor' | 'viewer';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'admin', label: '관리자' },
  { value: 'editor', label: '편집자' },
  { value: 'viewer', label: '뷰어' },
];

// 컬럼 설정 키 목록
type ColumnKey = 'department' | 'name' | 'email' | 'items' | 'status';
const ALL_COLUMNS: { key: ColumnKey; label: string; defaultOn: boolean }[] = [
  { key: 'department', label: '소속', defaultOn: true },
  { key: 'name',      label: '이름',   defaultOn: true },
  { key: 'email',     label: '이메일', defaultOn: false },
  { key: 'items',     label: '부여 항목', defaultOn: true },
  { key: 'status',    label: '상태',   defaultOn: true },
];
const STORAGE_KEY = 'sharesView_columns';

// 공유 현황 페이지 (사용자 중심 관리 · Owner/Admin 전용) — 컴팩트 테이블
export default function SharesView({ isDark, t, handleGoBack, onOpenTarget }: SharesViewProps) {
  const [groups, setGroups] = useState<ShareGroup[]>([]);
  const [linkShares, setLinkShares] = useState<ShareEntry[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // 저장 전 대기 중인 역할 변경 (shareId -> newRole)
  const [draftRoles, setDraftRoles] = useState<Record<string, Role>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 라이브 검색
  const [search, setSearch] = useState('');

  // 컬럼 가시성 (localStorage — SSR 안전, lazy initializer 로 마운트 시 1회 읽기)
  const [visibleCols, setVisibleCols] = useState<Record<ColumnKey, boolean>>(() => {
    const defaults: Record<ColumnKey, boolean> = {
      department: true, name: true, email: false, items: true, status: true,
    };
    if (typeof window === 'undefined') return defaults;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<ColumnKey, boolean>;
        return { ...defaults, ...parsed };
      }
    } catch { /* ignore */ }
    return defaults;
  });
  const [showColMenu, setShowColMenu] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  // inline edit 상태 (그룹 단위 name/department 편집)
  const [editingGroup, setEditingGroup] = useState<string | null>(null); // editing email key
  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');

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
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/shares/users');
      const data = await res.json();
      if (res.ok) {
        setGroups(data.groups || []);
        setLinkShares(data.linkShares || []);
      } else {
        setError(data.error || '공유 현황을 불러오지 못했습니다.');
      }
    } catch {
      setError('공유 현황을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadShares();
  }, [loadShares]);

  // 컬럼 메뉴 외부 클릭시 닫기
  useEffect(() => {
    if (!showColMenu) return;
    const handler = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setShowColMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColMenu]);

  // localStorage 저장
  const toggleCol = (key: ColumnKey) => {
    setVisibleCols(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // 라이브 검색 필터
  const query = search.trim().toLowerCase();
  const filteredGroups = query
    ? groups.filter(g =>
        g.email.toLowerCase().includes(query) ||
        (g.name || '').toLowerCase().includes(query) ||
        (g.department || '').toLowerCase().includes(query)
      )
    : groups;

  const mutateEntry = (shareId: string, updater: (e: ShareEntry) => ShareEntry | null) => {
    const applyTo = (shares: ShareEntry[]) => {
      const out: ShareEntry[] = [];
      for (const e of shares) {
        if (e.id === shareId) {
          const next = updater(e);
          if (next) out.push(next);
        } else {
          out.push(e);
        }
      }
      return out;
    };
    setGroups(prev => prev
      .map(g => ({ ...g, shares: applyTo(g.shares) }))
      .filter(g => g.shares.length > 0));
    setLinkShares(prev => applyTo(prev));
  };

  // [저장] 권한 변경 반영 (이메일 초대 건만 — 오픈 링크는 viewer 고정)
  const handleSaveRole = async (share: ShareEntry) => {
    const newRole = draftRoles[share.id];
    if (!newRole || newRole === share.role) return;
    setBusyId(share.id);
    try {
      const res = await authFetch(`/api/shares/${share.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        mutateEntry(share.id, e => ({ ...e, role: newRole }));
        setDraftRoles(prev => {
          const next = { ...prev };
          delete next[share.id];
          return next;
        });
      } else {
        alert(data.error || '권한 저장에 실패했습니다.');
      }
    } catch {
      alert('권한 저장에 실패했습니다.');
    } finally {
      setBusyId(null);
    }
  };

  // [해지/복구] status 토글
  const handleToggleStatus = async (share: ShareEntry) => {
    const next = share.status === 'active' ? 'revoked' : 'active';
    setBusyId(share.id);
    try {
      const res = await authFetch(`/api/shares/${share.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (res.ok) {
        mutateEntry(share.id, e => ({ ...e, status: next }));
      } else {
        alert(data.error || '상태 변경에 실패했습니다.');
      }
    } catch {
      alert('상태 변경에 실패했습니다.');
    } finally {
      setBusyId(null);
    }
  };

  // [삭제] DB 레코드 완전 제거 + UI 즉시 반영
  const handleDelete = async (share: ShareEntry) => {
    if (!confirm(`${share.target_name} 공유를 삭제하시겠습니까?`)) return;
    setBusyId(share.id);
    try {
      const res = await authFetch(`/api/shares/${share.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        mutateEntry(share.id, () => null);
      } else {
        alert(data.error || '공유 삭제에 실패했습니다.');
      }
    } catch {
      alert('공유 삭제에 실패했습니다.');
    } finally {
      setBusyId(null);
    }
  };

  // inline edit 시작
  const startEditGroup = (group: ShareGroup) => {
    setEditingGroup(group.email);
    setEditName(group.name || '');
    setEditDepartment(group.department || '');
  };

  const cancelEditGroup = () => {
    setEditingGroup(null);
  };

  // inline edit 저장: 해당 이메일의 모든 공유 건에 name/department PATCH
  const saveEditGroup = async (group: ShareGroup) => {
    if (!editName.trim() || !editDepartment.trim()) {
      alert('이름과 소속을 모두 입력해 주세요.');
      return;
    }
    if (editName.trim().length > 15 || editDepartment.trim().length > 15) {
      alert('이름/소속은 각 15자 이내로 입력해 주세요.');
      return;
    }
    setBusyId(`group-${group.email}`);
    let ok = true;
    for (const share of group.shares) {
      try {
        const res = await authFetch(`/api/shares/${share.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: editName.trim(), department: editDepartment.trim() }),
        });
        if (!res.ok) { ok = false; }
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setGroups(prev => prev.map(g =>
        g.email === group.email
          ? { ...g, name: editName.trim(), department: editDepartment.trim() }
          : g
      ));
      setEditingGroup(null);
    } else {
      alert('일부 항목의 이름/소속 저장에 실패했습니다.');
    }
    setBusyId(null);
  };

  // [링크 복사] 오픈 링크 재복사 (새로 생성 없이 기존 링크 재사용)
  const handleCopyLink = async (share: ShareEntry) => {
    if (!share.link_token) {
      alert('링크 토큰이 없어 복사할 수 없습니다.');
      return;
    }
    const url = `${window.location.origin}/share/${share.link_token}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('공유 링크가 복사되었습니다.');
    } catch {
      alert('링크 복사에 실패했습니다. 직접 복사해 주세요.');
    }
  };

  const targetIcon = (share: ShareEntry) => (share.target_type === 'folder' ? '📁' : '🗂️');

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const statusBadge = (status: string) => (
    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
      status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-500/20 text-zinc-400'
    }`}>
      {status === 'active' ? '활성' : '해지됨'}
    </span>
  );

  const thCls = `text-left text-[10px] font-semibold opacity-50 uppercase tracking-wider px-3 py-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`;
  const tdCls = `px-3 py-1.5 align-middle`;

  // 그룹 행 (사용자/오픈링크) → 클릭 시 하위 권한 서브 테이블 펼침
  const renderGroupRow = (
    key: string,
    title: string,
    icon: string,
    shares: ShareEntry[],
    groupName: string,
    groupDepartment: string,
    group: ShareGroup,
  ) => {
    const isOpen = !!expanded[key];
    const activeCount = shares.filter(s => s.status === 'active').length;
    const isEditing = editingGroup === group.email;
    const isOwnerOrAdmin = true; // SharesView 는 owner/admin 전용 페이지

    return (
      <Fragment key={key}>
        <tr
          onClick={() => !isEditing && toggleExpand(key)}
          className={`cursor-pointer select-none ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100'} ${isEditing ? (isDark ? 'bg-zinc-800/40' : 'bg-blue-50/50') : ''}`}
        >
          {/* 소속 */}
          {visibleCols.department && (
            <td className={`${tdCls} font-medium whitespace-nowrap text-[11px] opacity-70`}>
              {isEditing ? (
                <input
                  value={editDepartment}
                  onChange={e => setEditDepartment(e.target.value.slice(0, 15))}
                  maxLength={15}
                  onClick={e => e.stopPropagation()}
                  className={`text-[11px] px-1.5 py-0.5 rounded border bg-transparent outline-none w-20 ${isDark ? 'border-zinc-600 text-zinc-200' : 'border-zinc-300 text-zinc-800'}`}
                />
              ) : (
                <span>{groupDepartment || '-'}</span>
              )}
            </td>
          )}
          {/* 이름 */}
          {visibleCols.name && (
            <td className={`${tdCls} font-medium whitespace-nowrap text-[11px]`}>
              {isEditing ? (
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value.slice(0, 15))}
                  maxLength={15}
                  onClick={e => e.stopPropagation()}
                  className={`text-[11px] px-1.5 py-0.5 rounded border bg-transparent outline-none w-20 ${isDark ? 'border-zinc-600 text-zinc-200' : 'border-zinc-300 text-zinc-800'}`}
                />
              ) : (
                <span>{groupName || '-'}</span>
              )}
            </td>
          )}
          {/* 이메일 */}
          {visibleCols.email && (
            <td className={`${tdCls} font-medium whitespace-nowrap`}>
              <span className="mr-1.5">{icon}</span>{title}
            </td>
          )}
          {/* 부여 항목 */}
          {visibleCols.items && (
            <td className={`${tdCls} text-[11px] opacity-70 whitespace-nowrap`}>{shares.length}개</td>
          )}
          {/* 상태 */}
          {visibleCols.status && (
            <td className={`${tdCls} text-[11px] whitespace-nowrap`}>
              <span className={activeCount === shares.length ? 'text-emerald-500' : 'opacity-70'}>
                활성 {activeCount}/{shares.length}
              </span>
            </td>
          )}
          {/* 관리 영역 (펼침/접기 + inline edit 버튼) */}
          <td className={`${tdCls} text-right whitespace-nowrap`}>
            <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
              {isOwnerOrAdmin && !isEditing && (
                <button
                  onClick={() => startEditGroup(group)}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition ${
                    isDark ? 'text-zinc-500 hover:text-blue-400 hover:bg-zinc-700' : 'text-zinc-400 hover:text-blue-600 hover:bg-zinc-200'
                  }`}
                  title="이름/소속 편집"
                >
                  ✏️
                </button>
              )}
              {isEditing && (
                <>
                  <button
                    onClick={() => saveEditGroup(group)}
                    disabled={busyId === `group-${group.email}`}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition ${
                      isDark ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white' : 'bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white'
                    } disabled:opacity-40`}
                  >
                    저장
                  </button>
                  <button
                    onClick={cancelEditGroup}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition ${
                      isDark ? 'text-zinc-500 hover:text-white hover:bg-zinc-700' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200'
                    }`}
                  >
                    취소
                  </button>
                </>
              )}
              <span className="text-[11px] opacity-60 ml-1">{isOpen ? '▲' : '▼'}</span>
            </div>
          </td>
        </tr>
        {isOpen && (
          <tr className={isDark ? 'bg-zinc-900/40' : 'bg-zinc-50'}>
            <td colSpan={5} className="px-3 py-1.5">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className={`${thCls} w-[38%]`}>대상</th>
                    <th className={`${thCls} w-[30%]`}>권한</th>
                    <th className={`${thCls} w-[12%]`}>상태</th>
                    <th className={`${thCls} w-[20%] text-right`}>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {shares.map(renderEntryRow)}
                </tbody>
              </table>
            </td>
          </tr>
        )}
      </Fragment>
    );
  };

  // 하위 항목 행 (대상 · 권한 · 상태 · 관리)
  const renderEntryRow = (share: ShareEntry) => {
    const draftRole = draftRoles[share.id];
    const currentRole = draftRole || share.role;
    const hasDraft = !!draftRole && draftRole !== share.role;
    const busy = busyId === share.id;
    const isLink = share.share_method === 'link';
    return (
      <tr key={share.id} className={`border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        {/* 대상 (클릭 시 해당 인덱스 뷰로 이동) */}
        <td className={tdCls}>
          <div
            className="flex items-center gap-1.5 cursor-pointer min-w-0"
            onClick={() => onOpenTarget?.(share)}
            title={`${share.target_type === 'folder' ? '폴더' : '프로젝트'} 열기`}
          >
            <span className="text-sm shrink-0">{targetIcon(share)}</span>
            <span className="truncate font-medium">{share.target_name}</span>
            <span className="text-[9px] opacity-40 shrink-0">{share.target_type === 'folder' ? '폴더' : '프로젝트'}</span>
          </div>
        </td>
        {/* 권한: 오픈 링크는 보기 전용 고정, 이메일 초대는 드롭다운+저장 */}
        <td className={tdCls}>
          {isLink ? (
            <span className={`text-[11px] px-1.5 py-0.5 rounded ${isDark ? 'bg-zinc-700/60 text-zinc-300' : 'bg-zinc-200 text-zinc-600'}`}>
              🔒 보기 전용
            </span>
          ) : (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <select
                value={currentRole}
                onChange={e => setDraftRoles(prev => ({ ...prev, [share.id]: e.target.value as Role }))}
                disabled={busy}
                onClick={e => e.stopPropagation()}
                className={`text-[11px] px-1.5 py-0.5 rounded border bg-transparent outline-none cursor-pointer font-medium ${
                  isDark ? 'border-zinc-600 text-zinc-300' : 'border-zinc-300 text-zinc-700'
                } ${hasDraft ? (isDark ? 'border-blue-500 text-blue-300' : 'border-blue-500 text-blue-600') : ''}`}
              >
                {ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={e => { e.stopPropagation(); handleSaveRole(share); }}
                disabled={!hasDraft || busy}
                className={`text-[10px] px-2 py-0.5 rounded font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDark ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white' : 'bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white'
                }`}
              >
                저장
              </button>
            </div>
          )}
        </td>
        {/* 상태 */}
        <td className={tdCls}>{statusBadge(share.status)}</td>
        {/* 관리: 해지/복구 + 삭제 */}
        <td className={`${tdCls} text-right`}>
          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
            {isLink && share.link_token && (
              <button
                onClick={e => { e.stopPropagation(); handleCopyLink(share); }}
                disabled={busy}
                className={`text-[10px] px-2 py-0.5 rounded font-medium transition disabled:opacity-40 ${
                  isDark ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                }`}
                title="공유 링크 복사"
              >
                📋 링크 복사
              </button>
            )}
            <button
              onClick={e => { e.stopPropagation(); handleToggleStatus(share); }}
              disabled={busy}
              className={`text-[10px] px-2 py-0.5 rounded font-medium transition disabled:opacity-40 ${
                isDark ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
              }`}
            >
              {share.status === 'active' ? '해지' : '복구'}
            </button>
            <button
              onClick={e => { e.stopPropagation(); handleDelete(share); }}
              disabled={busy}
              className={`text-[10px] px-2 py-0.5 rounded font-medium transition disabled:opacity-40 ${
                isDark ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white' : 'bg-rose-100 text-rose-600 hover:bg-rose-500 hover:text-white'
              }`}
            >
              삭제
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // 컬럼 설정 헤더 텍스트
  const visibleColLabels = ALL_COLUMNS.filter(c => visibleCols[c.key]).map(c => c.label);

  const renderGroupTable = (title: string, desc: string, groupsOrLinks: { key: string; title: string; icon: string; shares: ShareEntry[]; groupName: string; groupDepartment: string; group: ShareGroup }[]) => (
    <section>
      <div className="mb-2">
        <h3 className="text-base font-black">{title}</h3>
        <p className="text-[11px] opacity-50">{desc}</p>
      </div>
      {groupsOrLinks.length === 0 ? (
        <div className={`text-xs opacity-50 italic p-3 rounded-lg border ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          표시할 항목이 없습니다.
        </div>
      ) : (
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <table className="w-full text-xs">
            <thead>
              <tr className={isDark ? 'bg-zinc-900/60' : 'bg-zinc-100/80'}>
                {visibleCols.department && <th className={`${thCls} w-[12%]`}>소속</th>}
                {visibleCols.name      && <th className={`${thCls} w-[12%]`}>이름</th>}
                {visibleCols.email     && <th className={`${thCls} w-[22%]`}>이메일</th>}
                {visibleCols.items     && <th className={`${thCls} w-[12%]`}>항목</th>}
                {visibleCols.status    && <th className={`${thCls} w-[12%]`}>상태</th>}
                <th className={`${thCls} w-[16%] text-right`}></th>
              </tr>
            </thead>
            <tbody>
              {groupsOrLinks.map(g =>
                renderGroupRow(g.key, g.title, g.icon, g.shares, g.groupName, g.groupDepartment, g.group)
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  return (
    <div className="max-w-4xl mx-auto pb-12 w-full flex flex-col gap-6">
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

      {/* 제목 + 컬럼 설정 + 검색 */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Share Status</span>
          <h2 className="text-xl font-black mt-0.5">👥 공유 현황 · 사용자 관리</h2>
          <p className="text-xs mt-1 opacity-60">
            Owner/Admin 전용. 사용자(이메일)별로 부여된 프로젝트/폴더 권한을 한눈에 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* 컬럼 설정 드롭다운 */}
          <div className="relative" ref={colMenuRef}>
            <button
              onClick={() => setShowColMenu(prev => !prev)}
              className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-medium transition ${
                isDark ? 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white bg-zinc-800/50' : 'border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 bg-white'
              }`}
            >
              ⚙️ 컬럼 설정
            </button>
            {showColMenu && (
              <div className={`absolute right-0 top-full mt-1 z-50 w-44 p-2 rounded-xl border shadow-xl ${
                isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
              }`}>
                {ALL_COLUMNS.map(col => (
                  <label
                    key={col.key}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] cursor-pointer transition ${
                      isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={visibleCols[col.key]}
                      onChange={() => toggleCol(col.key)}
                      className="accent-blue-500"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          {/* 라이브 검색 */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 이름 · 소속 · 이메일 검색"
            className={`text-[11px] px-3 py-1.5 rounded-lg border outline-none w-44 transition ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
            }`}
          />
        </div>
      </div>

      {error && (
        <div className={`p-3 rounded-lg text-xs ${isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-100 text-rose-600'}`}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="text-xs opacity-50">불러오는 중...</div>
      ) : filteredGroups.length === 0 && linkShares.length === 0 ? (
        <div className={`text-xs opacity-50 italic p-5 rounded-2xl border ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          {query ? '검색 결과가 없습니다.' : '관리할 공유가 없습니다.'}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {renderGroupTable(
            '사용자별 권한',
            '행을 클릭하면 부여된 항목을 펼쳐 관리할 수 있습니다. ✏️ 버튼으로 이름/소속을 수정할 수 있습니다.',
            filteredGroups.map(g => ({
              key: `user-${g.email}`,
              title: g.email,
              icon: '✉️',
              shares: g.shares,
              groupName: g.name,
              groupDepartment: g.department,
              group: g,
            }))
          )}
          {linkShares.length > 0 && renderGroupTable(
            '오픈 링크',
            '링크를 아는 사용자 누구나 접근 가능 · 보기 전용입니다.',
            [{ key: 'link', title: '오픈 링크 공유', icon: '🔗', shares: linkShares, groupName: '', groupDepartment: '', group: { email: '', name: '', department: '', shares: linkShares } }]
          )}
        </div>
      )}
    </div>
  );
}
