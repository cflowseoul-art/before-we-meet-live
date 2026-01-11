# Feed System Specification

## 1. Overview
참가자들이 서로의 매력을 탐색하는 인스타그램 스타일 피드 시스템.

## 2. Data Architecture

### Tables
- **feed_likes**: 좋아요 데이터 저장
  - `id` (UUID)
  - `user_id` (UUID) - 좋아요 누른 사람
  - `target_user_id` (UUID) - 좋아요 받은 사람
  - `created_at` (timestamp)

### Photo Storage (Google Drive 공개 폴더)
- **폴더 설정**: "링크가 있는 모든 사용자에게 공개"
- **파일명 규칙**: `{회차}_{실명}_{뒷자리}_{성별}_{캡션}.jpg`
- **예시**: `1_김철수_1234_남성_유머감각.jpg`
- **환경변수**:
  - `NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY`
  - `NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID`
- **이미지 URL**: `https://drive.google.com/thumbnail?id={fileId}&sz=w800`

### Data Flow
1. Google Drive API로 폴더 내 파일 목록 조회
2. 파일명에서 `{회차}_{실명}_{뒷자리}_{성별}_{캡션}` 파싱
3. `users` 테이블과 `real_name` + `phone_suffix`로 매칭
4. 매칭된 user의 ID를 `target_user_id`로 사용
5. `feed_likes` 테이블에서 좋아요 수 집계

## 3. User Feed (/feed)

### Layout
- 가로 3열 그리드 (인스타그램 스타일)
- 정사각형 썸네일

### Interactions
- **터치**: 전체 화면 모달 (사진 + 닉네임 + 캡션)
- **좋아요**: 하트 버튼으로 토글
- **제한**: 유저당 최대 3회 좋아요

### Realtime
- `feed_likes` 테이블 구독
- 좋아요 수 실시간 반영

## 4. Admin Dashboard (/admin/dashboard/feed)

### Features
- 인기 사진 랭킹 (좋아요 순)
- 실시간 좋아요 현황 모니터링
- 참가자별 받은 좋아요 통계

### Data Flow
1. Google Drive에서 현재 회차 사진 목록 fetch
2. `users` 테이블과 파일명 매칭 (real_name + phone_suffix)
3. `feed_likes` 테이블에서 좋아요 count 집계
4. 좋아요 순으로 정렬하여 표시

## 5. Trigger Condition
- 경매 종료 시 자동 전환: `auction_items`가 모두 `finished`일 때 `/feed`로 리다이렉트
