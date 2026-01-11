# 🐝 Me Before You Admin Specification

미비포유 서비스의 안정적인 현장 운영을 위한 어드민 시스템 명세서입니다.

## 1. 구조 설계 (Dual-Module)

# 🐝 Me Before You Admin Specification (Updated)

## 📊 [Dashboard] /admin/dashboard
**목적:** 현장 대형 스크린/노트북 관제용. 데이터 시각화 중심.
- **Value Heatmap:** 가치관 아이템별 누적 입찰액을 세로 막대그래프로 시각화 (어떤 가치가 핫한지 즉각 파악).
- **Identity Ranking:** 단순히 유저 목록이 아니라, 낙찰 수와 잔액을 합산한 '실시간 영향력 랭킹' 상위 10인 노출.
- **Bid Stream:** 최신 입찰 내역을 타임라인 형태로 노출하여 현장의 텐션을 체크.
- **Inventory Control:** 세션 리스트를 좌측에 배치하여 다음 경매 아이템을 1초 만에 'Start' 시킬 수 있도록 배치.

## ⚙️ [Settings] /admin/settings
**목적:** 스태프 스마트폰용. 운영 조치 중심.
- **Quick User Action:** 동명이인 식별자(A) 부여 버튼을 리스트 우측에 배치하여 현장 즉각 대응.
- **Phase Control:** 'Auction/Feed/Report' 전환 스위치를 상단에 크게 배치하여 오클릭 방지.
- **Emergency Clean:** 전체 유저 퇴장 및 데이터 초기화 기능 포함.

## 2. 현장 대응 매뉴얼 (Troubleshooting)

### Q1. "가입하려는데 이미 등록된 정보라고 떠요!"
### ⚠️ 동명이인 대응 프로세스 (Critical)
행사 현장에서 동명이인이 발생하여 유저가 가입에 실패할 경우:
1. **Settings** 메뉴에서 해당 유저의 [식별자A] 버튼을 누른다.
2. 시스템이 자동으로 유저의 `phone_suffix` 뒤에 'A'를 붙인다 (예: 1234 -> 1234A).
3. **[파일명 변경 알림] 모달**이 뜨면, 안내된 형식에 맞춰 구글 드라이브의 원본 사진 파일명을 수정한다.
   - 예: `1_김철수_1234_...` → `1_김철수_1234A_...`
4. 파일명 수정이 완료되어야 추후 리포트 생성 단계에서 사진이 정상적으로 매칭된다.

### Q2. "다음 세션을 시작해야 해요!"
1. **Dashboard** 접속.
2. Session Inventory에서 다음 진행할 아이템의 **[Start]** 버튼 클릭.
3. 유저 화면에 즉시 해당 아이템의 입찰 창 활성화.

### Q3. "경매를 다 마쳤습니다. 사진 구경 시키고 싶어요."
1. **Settings** 접속.
2. Phase Control에서 **[Open Feed]** 클릭.
3. 모든 유저 화면이 자동으로 인스타그램 스타일의 사진 피드로 전환됨.

## 3. 기술적 주의사항
- **Realtime:** 모든 관제 데이터는 Supabase Realtime 채널을 통해 동기화되므로, 새로고침 없이 운영 가능.
- **Auth:** `sessionStorage` 기반의 간이 인증이 적용되어 있어, 브라우저 종료 시 재로그인 필요 (Passcode: 1234).