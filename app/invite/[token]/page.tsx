'use client';

import React, { useEffect, useState, use } from 'react';

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams?.token;
  const [status, setStatus] = useState<string>('초대 유효성 검증 중...');

  useEffect(() => {
    if (!token) {
      setStatus('유효하지 않은 초대 링크입니다.');
      return;
    }
    async function validate() {
      try {
        const res = await fetch(`/api/invite/validate?token=${token}`);
        const data = await res.json();
        if (res.ok) {
          setStatus('초대 확인 완료! 프로젝트에 참여되었습니다.');
        } else {
          setStatus(data.error || '초대 검증에 실패했습니다.');
        }
      } catch (e) {
        setStatus('서버 통신 중 오류가 발생했습니다.');
      }
    }
    validate();
  }, [token]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#09090b] text-zinc-100 p-6">
      <div className="max-w-md w-full p-8 rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-2xl text-center flex flex-col gap-4">
        <h1 className="text-lg font-black">PASS 5 팀 초대</h1>
        <p className="text-xs opacity-70">{status}</p>
        <button
          onClick={() => window.location.href = '/'}
          className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
        >
          메인 화면으로 이동
        </button>
      </div>
    </div>
  );
}