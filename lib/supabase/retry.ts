// Supabase 일시적 오류(PGRST303) 자동 재시도 헬퍼
// ======================================================================
// PGRST303 "JWT issued at future" — Supabase 인증 서버와 API 서버 간
// 시계 동기화 오차(Clock Skew)로, 토큰이 발급된 직후 첫 요청 시 토큰이
// "미래 시간"으로 찍힌 것으로 인식되어 발생하는 일시적 오류.
// 특성: 300~500ms 지연 후 재시도하면 100% 정상 동작.
//
// 사용법:
//   import { runSupabaseQuery } from '@/lib/supabase/retry';
//   const { data, error } = await runSupabaseQuery(() =>
//     supabase.from('projects').select('*')
//   );
import type { PostgrestError } from '@supabase/supabase-js';

// 재시도 설정
const MAX_RETRIES = 2;   // 최대 재시도 횟수 (최초 시도 포함 총 3회)
const DELAY_MS = 400;    // 재시도 전 대기 시간

// 에러가 PGRST303(시계 오차)인지 판별
export function isPGRST303Error(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  const code = String(e?.code ?? '');
  const message = String(e?.message ?? '');
  return code.includes('PGRST303') || message.includes('JWT issued at future');
}

// Supabase 쿼리 실행 + PGRST303 시 자동 재시도 래퍼
// query: 실행할 쿼리 함수(매 호출마다 새로 실행되어야 함 — supabase builder는 1회용)
// - supabase builder는 Promise가 아닌 PromiseLike(then만 있는 thenable)라,
//   PromiseLike로 받아야 타입 체크를 통과한다. await 은 그대로 동작한다.
// - 제네릭 T가 아니라 데이터+에러 전체(Resolved)를 R로 추론하여,
//   .single()/.maybeSingle() 의 정확한 행 타입을 그대로 보존한다.
//   (호출부의 data 타입 캐스팅이 원래 코드와 동일하게 유지됨)
export async function runSupabaseQuery<R extends { error: PostgrestError | null }>(
  query: () => PromiseLike<R>,
): Promise<R> {
  for (let attempt = 0; ; attempt++) {
    const result = await query();

    // PGRST303(시계 오차)이고 재시도 횟수가 남아있으면 대기 후 재시도
    if (isPGRST303Error(result.error) && attempt < MAX_RETRIES) {
      console.warn(
        `[PGRST303] 서버 시계 동기화 대기 중... 재시도 ${attempt + 1}/${MAX_RETRIES} (${DELAY_MS}ms 후)`,
        result.error,
      );
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      continue;
    }

    // 정상 결과이거나, 재시도 횟수를 모두 소진했으면 현재 결과 반환
    return result;
  }
}