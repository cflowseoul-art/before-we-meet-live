# 🐝 Me Before You (Live Web-App)
나를 알고 너를 아는 데이터 기반 자아 탐색 및 인연 매칭 서비스 : **미비포유 라이브**

## 🚀 프로젝트 개요
1월 25일 오프라인 행사를 위한 실시간 인터랙티브 웹앱입니다. 참가자들의 가치관 입찰 데이터와 피드 호감도를 분석하여 최적의 인연을 매칭합니다.

## 🛠 Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database/Realtime**: Supabase (PostgreSQL)
- **Auth**: Passcode-based Admin Auth / Anonymous User Session
- **Styling**: Tailwind CSS

## 🔄 User Flow (주요 여정)
1. **Onboarding**: 성별 선택 → 외모 강점 선택 → 페르소나 닉네임 자동 생성 및 DB 등록
2. **Session 1 (Auction)**: 실시간 가치관 경매 참여 (1,000포인트 한도 내 입찰)
3. **Session 2 (Feed)**: 참가자 피드 열람 및 익명 좋아요(호감) 표현
4. **Session 3 (Match)**: 경매 낙찰 결과(70%) + 피드 호감도(30%) 기반 AI 매칭 리포트 확인

## 🗄️ Database Architecture
- **Core Tables**: `users`, `feed_posts`, `auction_items`
- **Interaction Tables**: `feed_likes` (User ↔ Post), `bids` (User ↔ Item)
- **Admin**: RLS 비활성화를 통해 현장 운영 생산성 극대화

## ⚙️ 시작하기
1. 환경 변수(`.env.local`) 설정: Supabase URL, Keys, Admin Passcode
2. 의존성 설치: `npm install`
3. 개발 서버 가동: `npm run dev`
4. 관리자 설정: `/admin/setup` 접속 후 데이터 동기화