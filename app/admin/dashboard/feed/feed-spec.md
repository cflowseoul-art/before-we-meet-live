📸 Photo Feed Auto-Sync Specification (v1.0)1. Database Schema: feed_likes드라이브의 사진 파일과 데이터베이스의 좋아요 데이터를 매칭하기 위한 핵심 테이블 규격입니다.ColumnTypeDefaultDescriptionidUUIDuuid_generate_v4()레코드 고유 식별자 (PK)user_idUUID-사진 소유자의 고유 ID (FK -> users.id)target_user_idUUID-(기존 호환성 유지) 사진 소유자 IDphoto_numberInteger1파일명의 마지막 번호 (1, 2, 3... n)order_prefixText'00'파일명 접두사 (00, 01, 02 등)gender_codeText-파일명 내 성별 코드 (M / F)likes_countInteger0해당 사진이 받은 하트(좋아요) 총합created_atTimestampnow()레코드 생성 일시[Critical Constraint] > UNIQUE (user_id, photo_number)한 유저가 동일한 번호의 사진 슬롯을 중복 생성하는 것을 방지하여 데이터 무결성을 보장함.2. File Naming Convention구글 드라이브(또는 스토리지)에 업로드되는 사진은 반드시 아래 명명 규칙을 준수해야 합니다.{order_prefix}_{real_name}_{phone_suffix}_{gender_code}_{photo_number}.jpg예시 1: 00_김연서_1234_F_1.jpg (연서님의 1번 대표 사진)예시 2: 00_김연서_1234_F_2.jpg (연서님의 2번 추가 사진)특징: photo_number는 n개까지 확장 가능하며, 각 번호는 DB에서 개별 랭킹으로 관리됨.3. Auto-Discovery Logic (The "API" Flow)사용자나 관리자가 사진을 요청하는 시점에 DB 레코드를 자동으로 동기화합니다.Request: 클라이언트가 /api/photo?name=김연서&suffix=1234&num=2 호출.DB Lookup: users 테이블에서 이름/뒷자리로 user_id를 조회한 후, feed_likes에 해당 유저의 photo_number: 2 레코드가 있는지 확인.Auto-Insert: 레코드가 없다면, 그 즉시 likes_count: 0으로 새 행(Row)을 생성 (자율 주행 등록).Redirect: 조립된 파일명으로 실제 이미지 저장소(Storage) URL로 리다이렉트.4. Ranking & Display RulesRanking 기준: feed_likes 테이블의 likes_count 내림차순 정렬.Display 단위: 유저 단위가 아닌 사진 단위 개별 노출.Ex: '김연서'의 2번 사진이 1위, '김연서'의 1번 사진이 5위에 각각 랭킹될 수 있음.Real-time: Supabase의 실시간 구독(Realtime) 기능을 통해 하트 클릭 시 대시보드 순위가 즉시 변경됨.5. Required SQL for Initialization수파베이스 SQL Editor에서 아래 명령어를 실행하여 스펙을 적용합니다.SQL-- 1. 기존 테이블 구조 변경
ALTER TABLE feed_likes ADD COLUMN IF NOT EXISTS photo_number int DEFAULT 1;
ALTER TABLE feed_likes ADD COLUMN IF NOT EXISTS order_prefix text DEFAULT '00';
ALTER TABLE feed_likes ADD COLUMN IF NOT EXISTS gender_code text;
ALTER TABLE feed_likes ADD COLUMN IF NOT EXISTS likes_count int DEFAULT 0;

-- 2. 중복 방지 제약 조건 추가
ALTER TABLE feed_likes DROP CONSTRAINT IF EXISTS unique_user_photo_slot;
ALTER TABLE feed_likes ADD CONSTRAINT unique_user_photo_slot UNIQUE (user_id, photo_number);

-- 3. 빠른 랭킹 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_feed_likes_count ON feed_likes(likes_count DESC);