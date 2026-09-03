-- 파일/폴더 단위 공유 테이블 (MVP)
-- - 비회원 익명 접속 미지원: 모든 접근은 auth.users 기반 (구글 로그인)
-- - 비밀번호 보호 링크 제외: 오픈 링크 방식 (토큰을 아는 로그인 사용자 = 접근 가능)
-- - 최고 권한 채택(Highest Privilege): project_members + item_shares 의 max()
CREATE TABLE IF NOT EXISTS item_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 공유 대상 (둘 중 하나만 설정)
  target_type TEXT NOT NULL CHECK (target_type IN ('card', 'folder')),
  target_id UUID NOT NULL,           -- cards.id 또는 folders.id

  -- 공유 방법
  share_method TEXT NOT NULL CHECK (share_method IN ('user', 'link')),

  -- 방법 A: 이메일/사용자 초대 (수신자)
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,               -- 수신자 이메일

  -- 역할 (오너는 project_members에서만 관리 → 파일/폴더 공유는 editor/viewer)
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('editor', 'viewer')),

  -- 방법 B: 오픈 링크 (비밀번호 없음)
  link_token TEXT UNIQUE,

  -- 유효기간 (선택. null = 무기한)
  expires_at TIMESTAMPTZ,

  -- 메타
  created_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_item_shares_target ON item_shares(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_item_shares_user ON item_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_item_shares_link ON item_shares(link_token) WHERE link_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_item_shares_status ON item_shares(status);

-- RLS 활성화 (anon 키 접근 시에만 적용. 서비스 롤 키는 우회)
ALTER TABLE item_shares ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신이 공유한(created_by) 항목 또는 자신에게 공유된(user_id) 항목만 조회
CREATE POLICY "Users can view their shares"
  ON item_shares FOR SELECT
  USING (
    created_by = auth.uid()
    OR user_id = auth.uid()
  );

-- RLS 정책: 사용자는 자신이 만든 공유만 수정/삭제 가능
CREATE POLICY "Users can manage their shares"
  ON item_shares FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- updated_at 자동 갱신 트리거 (cards 테이블 패턴 재사용)
DROP TRIGGER IF EXISTS update_item_shares_updated_at ON item_shares;
CREATE TRIGGER update_item_shares_updated_at
  BEFORE UPDATE ON item_shares
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
