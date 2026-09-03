-- Phase 3: item_shares 확장 + 카드 공유 제거
-- 1) role 에 'admin' 추가 (오너가 관리자 역할 부여 가능)
-- 2) target_type 에 'project' 추가 (개별 프로젝트 단위 공유)
-- 3) 'card' 단위 공유 제거 → target_type 은 ('folder', 'project') 만 허용

-- target_type CHECK: 카드 제거 후 folder/project 만 허용
ALTER TABLE item_shares DROP CONSTRAINT IF EXISTS item_shares_target_type_check;
ALTER TABLE item_shares
  ADD CONSTRAINT item_shares_target_type_check
  CHECK (target_type IN ('folder', 'project'));

-- role CHECK 확장 (admin 허용)
ALTER TABLE item_shares DROP CONSTRAINT IF EXISTS item_shares_role_check;
ALTER TABLE item_shares
  ADD CONSTRAINT item_shares_role_check
  CHECK (role IN ('admin', 'editor', 'viewer'));
