export const DESIGN_TOKENS = {
  colors: {
    accent: "#A52A2A",      // 레드 드레스 컬러
    background: "#FDFDFD",  // 미색 배경
    primary: "#1A1A1A",     // 메인 텍스트
    paper: "#F0EDE4",       // 카드/베이지 배경
    soft: "#EEEBDE",        // 경계선
    muted: "#A1A1A1",       // 비활성화 텍스트
  },
  borderRadius: {
    onboarding: "3rem",
    card: "1.5rem",
  },
  spacing: {
    pagePadding: "1.5rem", // 모바일 좌우 여백
  },
  transitions: {
    default: { duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] },
  }
} as const;