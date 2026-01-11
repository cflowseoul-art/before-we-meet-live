# Me Before You - Project Specification

> **Version**: 1.0.0
> **Last Updated**: 2026-01-11
> **Target Event**: 2026년 1월 25일 오프라인 행사

---

## 1. Project Overview

**미비포유 라이브(Me Before You Live)** 는 오프라인 행사 참가자들의 가치관 입찰 데이터와 피드 호감도를 분석하여 최적의 인연을 매칭하는 실시간 인터랙티브 웹앱입니다.

### 1.1 Core Concept
- 나를 알고(`Me`) 너를 아는(`You`) 데이터 기반 자아 탐색 및 인연 매칭
- 가치관 경매를 통한 참가자의 내면 가치 시각화
- 피드 호감도를 통한 외적 매력 데이터 수집
- 두 데이터를 결합한 하이브리드 매칭 알고리즘

### 1.2 Tech Stack
| Category | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime Subscriptions |
| Auth | Passcode-based Admin / Anonymous User Session |
| Styling | Tailwind CSS |

---

## 2. Data Model & Schema

### 2.1 Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA                                 │
│                         (RLS Disabled for Admin)                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐          ┌──────────────────────┐
│       users          │          │    auction_items     │
├──────────────────────┤          ├──────────────────────┤
│ id (uuid) PK         │          │ id (uuid) PK         │
│ nickname (text)      │          │ title (text)         │
│ gender (text)        │◄─────┐   │ status (text)        │
│ balance (int4)       │      │   │ current_bid (int4)   │
│ created_at (timestz) │      │   │ highest_bidder_id FK │──────┐
└──────────────────────┘      │   │ created_at (timestz) │      │
         │                    │   └──────────────────────┘      │
         │                    │              │                  │
         │ 1:N                │              │ 1:N              │ N:1
         │                    │              │                  │
         ▼                    │              ▼                  │
┌──────────────────────┐      │   ┌──────────────────────┐      │
│        bids          │      │   │   (bids 테이블과 동일)│      │
├──────────────────────┤      │   └──────────────────────┘      │
│ id (uuid) PK         │      │                                 │
│ user_id (uuid) FK    │──────┘                                 │
│ auction_item_id FK   │◄───────────────────────────────────────┘
│ amount (int4)        │
│ created_at (timestz) │
└──────────────────────┘

         │
         │ users 1:N feed_posts
         ▼
┌──────────────────────┐          ┌──────────────────────┐
│     feed_posts       │          │     feed_likes       │
├──────────────────────┤          ├──────────────────────┤
│ id (uuid) PK         │◄────────▶│ id (uuid) PK         │
│ user_id (uuid) FK    │          │ post_id (uuid) FK    │
│ image_url (text)     │          │ liker_id (uuid) FK   │
│ caption (text)       │          │ created_at (timestz) │
│ created_at (timestz) │          └──────────────────────┘
└──────────────────────┘                    │
                                            │
                                            ▼
                                   ┌──────────────────┐
                                   │ users (liker_id) │
                                   └──────────────────┘
```

### 2.2 Table Definitions

#### 2.2.1 `users` 테이블
참가자 정보를 저장하는 핵심 테이블.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default: gen_random_uuid() | 고유 식별자 |
| `nickname` | text | NOT NULL, UNIQUE | 페르소나 닉네임 (예: "눈웃음 사막여우") |
| `gender` | text | NOT NULL | 성별 ("남성" \| "여성") |
| `balance` | int4 | NOT NULL, default: 1000 | 경매 잔액 (단위: 만원) |
| `created_at` | timestamptz | default: now() | 가입 시각 |

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL UNIQUE,
  gender TEXT NOT NULL CHECK (gender IN ('남성', '여성')),
  balance INT4 NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2.2.2 `auction_items` 테이블
경매 가치관 아이템 목록.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default: gen_random_uuid() | 고유 식별자 |
| `title` | text | NOT NULL | 가치관 이름 (사랑, 돈, 명예 등) |
| `status` | text | NOT NULL, default: 'pending' | 상태 ('pending' \| 'active' \| 'finished') |
| `current_bid` | int4 | NOT NULL, default: 0 | 현재 최고 입찰가 |
| `highest_bidder_id` | uuid | FK → users.id | 현재 최고 입찰자 |
| `created_at` | timestamptz | default: now() | 생성 시각 |

```sql
CREATE TABLE auction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'finished')),
  current_bid INT4 NOT NULL DEFAULT 0,
  highest_bidder_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**가치관 목록 (VALUES):**
- 사랑, 돈, 명예, 건강, 가족, 자유, 성취, 안정, 도전

#### 2.2.3 `bids` 테이블
입찰 이력 로그.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default: gen_random_uuid() | 고유 식별자 |
| `user_id` | uuid | FK → users.id, NOT NULL | 입찰자 |
| `auction_item_id` | uuid | FK → auction_items.id, NOT NULL | 입찰 대상 가치관 |
| `amount` | int4 | NOT NULL | 입찰 금액 |
| `created_at` | timestamptz | default: now() | 입찰 시각 |

```sql
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  auction_item_id UUID NOT NULL REFERENCES auction_items(id) ON DELETE CASCADE,
  amount INT4 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2.2.4 `feed_posts` 테이블
참가자 피드 게시물.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default: gen_random_uuid() | 고유 식별자 |
| `user_id` | uuid | FK → users.id, NOT NULL | 작성자 |
| `image_url` | text | NOT NULL | 이미지 URL |
| `caption` | text | NULL | 캡션 (선택) |
| `created_at` | timestamptz | default: now() | 작성 시각 |

```sql
CREATE TABLE feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2.2.5 `feed_likes` 테이블
피드 호감도 (익명 좋아요).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default: gen_random_uuid() | 고유 식별자 |
| `post_id` | uuid | FK → feed_posts.id, NOT NULL | 좋아요 대상 게시물 |
| `liker_id` | uuid | FK → users.id, NOT NULL | 좋아요 누른 사람 |
| `created_at` | timestamptz | default: now() | 좋아요 시각 |

```sql
CREATE TABLE feed_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  liker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, liker_id)  -- 중복 좋아요 방지
);
```

### 2.3 RLS (Row Level Security) 정책

> **운영 결정사항**: 현장 관리 효율성을 위해 **모든 테이블의 RLS가 비활성화(Disabled)** 되어 있습니다.

```sql
-- 모든 테이블 RLS 비활성화
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE auction_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE bids DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes DISABLE ROW LEVEL SECURITY;
```

**이유:**
1. 단일 오프라인 이벤트 용도로 장기 운영 아님
2. 관리자가 모든 데이터에 즉시 접근하여 운영해야 함
3. Supabase Service Role Key를 통한 서버 측 제어로 보안 대체

---

## 3. Detailed User Flow

### 3.1 Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     ONBOARDING FLOW                              │
│                     (app/page.tsx)                               │
└─────────────────────────────────────────────────────────────────┘

    [시작]
       │
       ▼
┌──────────────────┐
│ Step 1: 성별 선택 │
│  "남성" | "여성"  │
└──────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Step 2: 외모 강점 선택     │
│ FEATURES 배열에서 택 1     │
│ - 눈웃음                  │
│ - 맑은 피부               │
│ - 직각 어깨               │
│ - 오똑한 코               │
│ - 보조개                  │
└──────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Step 3: 닉네임 자동 생성              │
│ 공식: "{선택 특징} {랜덤 동물}"        │
│ 예시: "눈웃음 사막여우"               │
│                                      │
│ ANIMALS 배열:                        │
│ 사막여우, 쿼카, 판다, 해파리,          │
│ 리트리버, 아기 고양이, 곰, 뽈락, 너구리 │
└──────────────────────────────────────┘
       │
       ├─── [재시도] → 동물만 재랜덤
       │
       ├─── [처음부터] → Step 1로
       │
       ▼
┌──────────────────────────────────────┐
│ Step 4: 확인 및 DB 저장               │
│                                      │
│ 1. Supabase users 테이블 INSERT:     │
│    { nickname, gender, balance:1000 }│
│                                      │
│ 2. localStorage 동기화:              │
│    auction_user = { id, nickname,    │
│                     balance, gender } │
│                                      │
│ 3. /auction 페이지로 리다이렉트       │
└──────────────────────────────────────┘
       │
       ▼
    [Auction 진입]
```

**핵심 코드 로직:**
```typescript
// 닉네임 생성
const generateNickname = (selectedFeature: string) => {
  const randomAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${selectedFeature} ${randomAnimal}`;
};

// DB 저장 및 localStorage 동기화
const handleSaveNickname = async () => {
  const { data } = await supabase
    .from("users")
    .insert({ nickname, gender, balance: 1000 })
    .select()
    .single();

  localStorage.setItem("auction_user", JSON.stringify(data));
  router.push("/auction");
};
```

### 3.2 Auction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      AUCTION FLOW                                │
│                   (app/auction/page.tsx)                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│ 1. 페이지 진입                        │
│    - localStorage에서 user 정보 로드  │
│    - Supabase Realtime 구독 시작      │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│ 2. 최초 방문자 안내 모달              │
│    (sessionStorage: has_seen_modal)  │
│    - 1인당 자산: 1,000만원            │
│    - 입찰 단위: 100만원               │
│    - 입찰 시 즉시 차감                │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│ 3. 실시간 경매 대기                   │
│    - status='active'인 아이템 표시    │
│    - 없으면 "진행 중인 경매 없음"      │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────┐
│ 4. 입찰 로직 (handleBid)                              │
│                                                      │
│    ① 잔액 확인: user.balance >= nextBid              │
│       - nextBid = current_bid + 100                  │
│       - 부족 시 alert 후 종료                         │
│                                                      │
│    ② auction_items UPDATE:                           │
│       { current_bid: nextBid,                        │
│         highest_bidder_id: user.id }                 │
│                                                      │
│    ③ bids INSERT:                                    │
│       { auction_item_id, user_id, amount: nextBid }  │
│                                                      │
│    ④ users UPDATE:                                   │
│       { balance: balance - nextBid }                 │
│                                                      │
│    ⑤ 로컬 상태 갱신 (fetchAllData)                   │
└──────────────────────────────────────────────────────┘
```

**Realtime Subscription:**
```typescript
const channel = supabase.channel("auction_realtime_v10")
  .on("postgres_changes", { event: "*", schema: "public" }, () => {
    fetchAllData(user.id);  // 모든 변경사항에 반응
  })
  .subscribe();
```

### 3.3 Feed Flow (Session 2)

```
┌─────────────────────────────────────────────────────────────────┐
│                        FEED FLOW                                 │
│                      (app/feed/page.tsx)                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│ 1. 피드 목록 조회                     │
│    SELECT * FROM feed_posts          │
│    JOIN users ON user_id             │
│    ORDER BY created_at DESC          │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│ 2. 인스타그램 스타일 UI 렌더링        │
│    - 참가자 닉네임                    │
│    - 이미지 (Supabase Storage)       │
│    - 좋아요 버튼 (하트 아이콘)         │
│    - 좋아요 카운트                    │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────┐
│ 3. 좋아요 토글 로직                                   │
│                                                      │
│    IF (이미 좋아요 존재):                             │
│       DELETE FROM feed_likes                         │
│       WHERE post_id = ? AND liker_id = ?             │
│                                                      │
│    ELSE:                                             │
│       INSERT INTO feed_likes                         │
│       (post_id, liker_id)                            │
│       VALUES (?, current_user.id)                    │
│                                                      │
│    * 익명성: 누가 좋아요했는지 피드 주인은 모름        │
│    * 매칭 알고리즘에서만 활용                         │
└──────────────────────────────────────────────────────┘
```

### 3.4 Match Flow (Session 3)

```
┌─────────────────────────────────────────────────────────────────┐
│                       MATCH FLOW                                 │
│                     (app/1on1/page.tsx)                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│ 1. 리포트 생성 시작                   │
│    "당신의 가치관을 조심스럽게         │
│     분석 중입니다..."                 │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│ 2. 매칭 알고리즘 실행                 │
│    (상세: Section 4 참조)            │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│ 3. AI 감성 리포트 표시                │
│    - 확률 표현 (87%, 94% 등)         │
│    - 쿠션어 사용 (조심스럽게, 어쩌면)  │
│    - 따뜻한 톤앤매너                  │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│ 4. 매칭된 3인 표시                    │
│    - 순위별 카드 형태                 │
│    - 닉네임 + 매칭 확률               │
│    - "대화하기" CTA 버튼              │
└──────────────────────────────────────┘
```

---

## 4. Matching Logic (Hybrid Algorithm)

### 4.1 개요

두 가지 데이터 소스를 결합한 **하이브리드 매칭 알고리즘**:

| 데이터 소스 | 가중치 | 의미 |
|------------|-------|------|
| 가치관 경매 (Auction) | **70%** | 내면의 가치관 유사도 |
| 피드 호감도 (Feed Likes) | **30%** | 외적 매력에 대한 관심도 |

### 4.2 알고리즘 상세 설계

```
┌─────────────────────────────────────────────────────────────────┐
│              HYBRID MATCHING ALGORITHM                           │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ Step 1: 가치관 벡터 생성 (Auction Vector)                         │
│                                                                  │
│ 각 유저별로 9개 가치관에 대한 투자 벡터 생성:                        │
│ V_user = [사랑, 돈, 명예, 건강, 가족, 자유, 성취, 안정, 도전]        │
│                                                                  │
│ 예시:                                                            │
│ V_userA = [300, 0, 200, 0, 500, 0, 0, 0, 0]  (총 1000만원 투자)  │
│ V_userB = [400, 0, 0, 0, 600, 0, 0, 0, 0]                        │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 2: 코사인 유사도 계산 (Auction Similarity)                   │
│                                                                  │
│                    V_A · V_B                                     │
│ Sim_auction = ─────────────────────                              │
│                ║V_A║ × ║V_B║                                     │
│                                                                  │
│ 결과: 0 ~ 1 (1에 가까울수록 유사)                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 3: 피드 호감도 점수 (Feed Score)                             │
│                                                                  │
│ 상호 호감도를 고려한 점수 계산:                                     │
│                                                                  │
│ Feed_score = (A가 B에게 준 좋아요 수) + (B가 A에게 준 좋아요 수)     │
│              ───────────────────────────────────────────────      │
│                         최대 가능 좋아요 수                        │
│                                                                  │
│ 결과: 0 ~ 1 (정규화)                                              │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 4: 최종 매칭 점수 (Final Score)                              │
│                                                                  │
│ Final_score = (Sim_auction × 0.7) + (Feed_score × 0.3)           │
│                                                                  │
│ 예시:                                                            │
│ A-B 매칭 점수 = (0.95 × 0.7) + (0.6 × 0.3) = 0.665 + 0.18 = 0.845│
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 5: 이성 필터링 및 랭킹                                        │
│                                                                  │
│ 1. 현재 유저와 반대 성별만 필터링                                   │
│    WHERE other.gender != current_user.gender                     │
│                                                                  │
│ 2. Final_score 기준 내림차순 정렬                                  │
│                                                                  │
│ 3. 상위 3명 추출 → matches[] 반환                                 │
└──────────────────────────────────────────────────────────────────┘
```

### 4.3 구현 의사 코드

```typescript
interface MatchResult {
  user: User;
  score: number;
  auctionSimilarity: number;
  feedScore: number;
}

async function calculateMatches(currentUser: User): Promise<MatchResult[]> {
  // 1. 모든 유저의 입찰 데이터 로드
  const allBids = await supabase.from("bids").select("*");
  const allUsers = await supabase.from("users").select("*")
    .neq("id", currentUser.id)
    .neq("gender", currentUser.gender);  // 이성만

  // 2. 현재 유저의 가치관 벡터 생성
  const myVector = buildAuctionVector(currentUser.id, allBids);

  // 3. 각 후보자에 대해 점수 계산
  const results = allUsers.map(candidate => {
    const theirVector = buildAuctionVector(candidate.id, allBids);
    const auctionSim = cosineSimilarity(myVector, theirVector);
    const feedScore = calculateFeedScore(currentUser.id, candidate.id);

    return {
      user: candidate,
      auctionSimilarity: auctionSim,
      feedScore: feedScore,
      score: (auctionSim * 0.7) + (feedScore * 0.3)
    };
  });

  // 4. 점수 기준 정렬 후 상위 3명 반환
  return results.sort((a, b) => b.score - a.score).slice(0, 3);
}
```

---

## 5. Admin & Security

### 5.1 환경 변수 구성 (.env.local)

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # 클라이언트용 (제한된 권한)

# Server-side Only (절대 NEXT_PUBLIC_ 접두사 사용 금지)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # 서버 전용 (전체 권한)

# Admin Authentication
ADMIN_PASSCODE=1234  # 관리자 접근 비밀번호
```

### 5.2 관리자 인증 Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN AUTH FLOW                               │
│                   (app/admin/page.tsx)                           │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│ 1. 관리자 페이지 접근                 │
│    /admin                            │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│ 2. 인증 상태 확인                     │
│    sessionStorage.admin_auth === true?│
└──────────────────────────────────────┘
         │                    │
         │ No                 │ Yes
         ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│ 3a. 패스코드 입력 │  │ 3b. 대시보드 표시 │
│     화면 표시     │  │                  │
└──────────────────┘  └──────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 4. 패스코드 검증                      │
│    input === ADMIN_PASSCODE?         │
│    (현재: "1234")                    │
└──────────────────────────────────────┘
         │                    │
         │ 일치               │ 불일치
         ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│ 5a. 인증 성공     │  │ 5b. 에러 알림    │
│ sessionStorage   │  │ "Passcode        │
│ .admin_auth=true │  │  Incorrect"      │
└──────────────────┘  └──────────────────┘
         │
         ▼
    [대시보드 진입]
```

### 5.3 서버 측 DB 제어

관리자 전용 API Routes에서 Service Role Key 사용:

```typescript
// app/api/admin/reset/route.ts (예시)
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // 전체 권한
);

export async function POST(request: Request) {
  // RLS 무시하고 전체 데이터 접근 가능
  await supabaseAdmin.from('bids').delete().neq('id', '...');
  await supabaseAdmin.from('auction_items').delete().neq('id', '...');
  // ...
}
```

### 5.4 관리자 기능 목록

| 기능 | 설명 | 위치 |
|------|------|------|
| 경매 상태 변경 | pending → active → finished | Admin Tab |
| 실시간 통계 | TOP 4 가치관 입찰 현황 Bar Chart | Stats Tab |
| 유저 랭킹 | 가치관 획득 개수 기준 순위 | Stats Tab |
| 입찰 로그 | 실시간 입찰 알림 전광판 | 상단 고정 |
| 시스템 초기화 | 전체 데이터 리셋 (Danger Zone) | Admin Tab 하단 |

---

## 6. UI/UX Principles

### 6.1 디자인 철학

**"우아함과 정적인 럭셔리 무드"**

영화 "Me Before You"의 감성을 웹으로 옮긴 듯한 세련되고 차분한 디자인.
화려함보다는 절제된 아름다움, 빠름보다는 우아한 여유를 추구합니다.

### 6.2 Color Palette

```
┌─────────────────────────────────────────────────────────────────┐
│                      COLOR SYSTEM                                │
└─────────────────────────────────────────────────────────────────┘

Primary Colors:
┌──────────────┬───────────┬─────────────────────────────────────┐
│ Name         │ Hex       │ Usage                               │
├──────────────┼───────────┼─────────────────────────────────────┤
│ Off-White    │ #FDFDFD   │ 배경, 카드 기본 색상                  │
│ English Cream│ #FCF9F2   │ 섹션 구분, 서브 배경                  │
│ Louisa Red   │ #A52A2A   │ 포인트, CTA, 강조 텍스트              │
│ Ebony Black  │ #1A1A1A   │ 주요 텍스트, 버튼                    │
│ Gold         │ #FFD700   │ 하이라이트, 최고 입찰자               │
└──────────────┴───────────┴─────────────────────────────────────┘

Neutral Colors:
┌──────────────┬───────────┬─────────────────────────────────────┐
│ Border Light │ #EEEBDE   │ 카드 테두리, 구분선                   │
│ Border Soft  │ #F0EDE4   │ 입력 필드, 비활성 요소                │
│ Text Muted   │ #D1D1D1   │ 서브 텍스트, 레이블                   │
└──────────────┴───────────┴─────────────────────────────────────┘
```

### 6.3 Typography

```css
/* 기본 폰트 스택 */
font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;

/* 폰트 스타일 가이드 */
.heading-primary {
  font-size: 2.5rem;      /* 40px */
  font-style: italic;
  letter-spacing: -0.025em;
  font-weight: 500;
}

.heading-secondary {
  font-size: 1.25rem;     /* 20px */
  font-style: italic;
  letter-spacing: -0.015em;
}

.label {
  font-family: system-ui, sans-serif;
  font-size: 0.625rem;    /* 10px */
  font-weight: 900;
  letter-spacing: 0.4em;
  text-transform: uppercase;
}

.body-text {
  font-size: 0.875rem;    /* 14px */
  font-weight: 300;
  line-height: 1.8;
}
```

### 6.4 Animation Guidelines

**원칙: 정제되고 우아한 움직임**

```css
/* 기본 트랜지션 */
transition: all 0.5s ease;

/* 페이드 인 + 슬라이드 */
.animate-in {
  animation: fadeInSlide 1s ease-out;
}

@keyframes fadeInSlide {
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 줌 인 (닉네임 확정 시) */
.zoom-in-95 {
  animation: zoomIn 0.7s ease-out;
}

/* 펄스 (활성 경매 표시) */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

**금지 사항:**
- 과도한 바운스 효과
- 빠른 깜빡임
- 3D 회전 효과
- 파티클 애니메이션

### 6.5 Component Styling Patterns

```css
/* 카드 컴포넌트 */
.card {
  background: #FFFFFF;
  border-radius: 3rem;      /* 48px - 대형 라운드 */
  border: 1px solid #EEEBDE;
  box-shadow: 0 40px 100px rgba(0,0,0,0.03);
  padding: 3rem;
}

/* 버튼 - Primary */
.btn-primary {
  background: #1A1A1A;
  color: white;
  border-radius: 1.375rem;  /* 22px */
  padding: 1.25rem 2rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  transition: background 0.3s ease;
}

.btn-primary:hover {
  background: #A52A2A;
}

/* 입력 필드 */
.input {
  background: white;
  border: 2px solid #EEEBDE;
  border-radius: 1rem;
  padding: 1.25rem;
  text-align: center;
  font-size: 2rem;
  transition: border-color 0.3s ease;
}

.input:focus {
  border-color: #A52A2A;
  outline: none;
}
```

### 6.6 Responsive Approach

```
모바일 퍼스트 (9:16 비율 최적화)

┌─────────────────┐
│ Mobile (기본)    │  max-width: 100%
│                 │  padding: 1.5rem
│                 │
│ 카드 full-width │
│                 │
└─────────────────┘

┌─────────────────────────────┐
│ Tablet / Desktop            │
│ max-width: 28rem (448px)    │
│                             │
│  ┌───────────────────┐      │
│  │  중앙 정렬 카드    │      │
│  └───────────────────┘      │
│                             │
└─────────────────────────────┘
```

---

## 7. File Structure

```
me-before-you-live/
├── app/
│   ├── page.tsx            # Onboarding (성별 → 외모 → 닉네임)
│   ├── auction/
│   │   └── page.tsx        # 실시간 경매 참여
│   ├── feed/
│   │   └── page.tsx        # 피드 열람 및 좋아요 (예정)
│   ├── 1on1/
│   │   └── page.tsx        # 매칭 리포트
│   ├── admin/
│   │   └── page.tsx        # 관리자 대시보드
│   ├── constants.ts        # FEATURES, ANIMALS, VALUES
│   └── layout.tsx          # 루트 레이아웃
├── lib/
│   └── supabase.ts         # Supabase 클라이언트
├── docs/
│   ├── PROJECT_SPEC.md     # 본 문서
│   └── WORK_LOG.md         # 개발 히스토리
├── public/
├── .env.local              # 환경 변수 (gitignore)
└── package.json
```

---

## 8. Future Enhancements

### 8.1 기술적 개선 사항
- [ ] Edge Function으로 매칭 알고리즘 이전 (클라이언트 부하 감소)
- [ ] OpenAI API 연동으로 실제 AI 감성 리포트 생성
- [ ] Supabase Storage 연동으로 피드 이미지 업로드
- [ ] place_bid RPC 함수로 입찰 트랜잭션 원자성 보장

### 8.2 RPC 함수 설계 (place_bid)

```sql
CREATE OR REPLACE FUNCTION place_bid(
  p_user_id UUID,
  p_item_id UUID,
  p_amount INT4
) RETURNS JSONB AS $$
DECLARE
  v_user_balance INT4;
  v_current_bid INT4;
  v_prev_bidder_id UUID;
BEGIN
  -- 1. 유저 잔액 확인
  SELECT balance INTO v_user_balance
  FROM users WHERE id = p_user_id FOR UPDATE;

  IF v_user_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE');
  END IF;

  -- 2. 현재 최고 입찰 정보 가져오기
  SELECT current_bid, highest_bidder_id
  INTO v_current_bid, v_prev_bidder_id
  FROM auction_items WHERE id = p_item_id FOR UPDATE;

  IF p_amount <= v_current_bid THEN
    RETURN jsonb_build_object('success', false, 'error', 'BID_TOO_LOW');
  END IF;

  -- 3. 이전 입찰자 환불
  IF v_prev_bidder_id IS NOT NULL THEN
    UPDATE users SET balance = balance + v_current_bid
    WHERE id = v_prev_bidder_id;
  END IF;

  -- 4. 새 입찰 적용
  UPDATE auction_items
  SET current_bid = p_amount, highest_bidder_id = p_user_id
  WHERE id = p_item_id;

  -- 5. 입찰자 잔액 차감
  UPDATE users SET balance = balance - p_amount
  WHERE id = p_user_id;

  -- 6. 입찰 로그 기록
  INSERT INTO bids (user_id, auction_item_id, amount)
  VALUES (p_user_id, p_item_id, p_amount);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

---

*작성: Claude Code Assistant*
*최종 수정: 2026-01-11*
