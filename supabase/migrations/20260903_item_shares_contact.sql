-- 초대 시 이름/소속 라벨 저장 (사용자 중심 현황판 inline edit + 검색용)
-- - 이메일 초대 시 이름(name)과 소속(department)을 함께 기록
-- - 오픈 링크 공유는 사용자가 없으므로 NULL 유지
ALTER TABLE item_shares
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT;
