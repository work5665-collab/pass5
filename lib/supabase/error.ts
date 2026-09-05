// Supabase 에러를 사람이 읽을 수 있는 문자열로 정규화하는 유틸
// - console.error('...', error) 로 객체를 찍으면 빈 '{}' 로 보이는 경우(prototype 기반 에러 클래스 등)가 있어,
//   주요 필드(message/code/details/hint)를 명시적으로 추출해 항상 실제 원인을 노출한다.
export function describeSupabaseError(err: any): string {
  if (err == null) return '알 수 없는 오류 (error가 null/undefined)';

  const message = err?.message;
  const code = err?.code;
  const details = err?.details;
  const hint = err?.hint;
  const statusText = err?.statusText;

  const parts = [
    code != null && String(code).trim() !== '' ? `code=${code}` : null,
    message != null && String(message).trim() !== '' ? `message=${message}` : null,
    details != null && String(details).trim() !== '' ? `details=${details}` : null,
    hint != null && String(hint).trim() !== '' ? `hint=${hint}` : null,
    statusText != null && String(statusText).trim() !== '' ? `status=${statusText}` : null,
  ].filter(Boolean);

  if (parts.length > 0) return parts.join(' | ');

  // 일반 객체라면 열거 가능한 own property를 직렬화 시도 (prototype 필드 포함)
  try {
    const keys = Object.getOwnPropertyNames(err);
    if (keys.length > 0) {
      const obj: Record<string, unknown> = {};
      for (const k of keys) {
        const v = (err as Record<string, unknown>)[k];
        obj[k] = typeof v === 'string' || typeof v === 'number' ? v : String(v);
      }
      const s = JSON.stringify(obj);
      if (s && s !== '{}') return s;
    }
  } catch {
    // 무시 — 아래 폴백으로
  }

  return `알 수 없는 오류 객체 (type=${typeof err}, name=${err?.name ?? 'unknown'})`;
}
