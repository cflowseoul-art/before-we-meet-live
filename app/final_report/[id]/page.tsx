"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { getAuth } from "@/lib/utils/auth-storage";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import {
  Sparkles, Fingerprint, Users, Zap, Brain, Radio, Loader2,
  Heart, Crown, Share2, Check, Download, Link, X, FileText,
  MoreHorizontal, MessageCircle, Send, Bookmark
} from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

const TOTAL_SLIDES = 6;

// ─── 다중 태그 매핑 (Subconscious Frequency 전용) ───
const VALUE_TO_TAGS: Record<string, string[]> = {
  "원하는 것을 살 수 있는 풍요": ["풍요", "성취"],
  "사랑하는 사람과 함께하는 시간": ["사랑", "관계"],
  "지금 당장 누리는 확실한 행복": ["현재", "감각"],
  "더 큰 미래를 위한 인내": ["미래", "의지"],
  "안정적이고 평온한 일상": ["안정", "평화"],
  "새로운 경험과 짜릿한 도전": ["도전", "열정"],
  "모두에게 인정받는 성공": ["성공", "인정"],
  "나만의 속도로 걷는 여유": ["여유", "자율"],
  "냉철하고 합리적인 판단": ["이성", "논리"],
  "깊이 공감하는 따뜻한 마음": ["공감", "감성"],
  "눈에 보이는 압도적 성과": ["성과", "실행"],
  "함께 걷는 과정의 유대감": ["과정", "유대"],
  "누구와도 차별화된 나만의 개성": ["개성", "독립"],
  "모두와 어우러지는 소속감": ["소속", "조화"],
  "오롯이 나에게 집중하는 자유": ["자유", "독립"],
  "소중한 사람을 위한 헌신": ["헌신", "관계"],
};

// ─── 가치관 키워드 매핑 ───
const VALUE_TO_KEYWORD: Record<string, string> = {
  "원하는 것을 살 수 있는 풍요": "풍요",
  "사랑하는 사람과 함께하는 시간": "사랑",
  "지금 당장 누리는 확실한 행복": "현재",
  "더 큰 미래를 위한 인내": "미래",
  "안정적이고 평온한 일상": "안정",
  "새로운 경험과 짜릿한 도전": "도전",
  "모두에게 인정받는 성공": "성공",
  "나만의 속도로 걷는 여유": "여유",
  "냉철하고 합리적인 판단": "이성",
  "깊이 공감하는 따뜻한 마음": "공감",
  "눈에 보이는 압도적 성과": "성과",
  "함께 걷는 과정의 유대감": "과정",
  "누구와도 차별화된 나만의 개성": "개성",
  "모두와 어우러지는 소속감": "소속",
  "오롯이 나에게 집중하는 자유": "자유",
  "소중한 사람을 위한 헌신": "헌신",
};

// ─── Aura 정의 (top value 기반) ───
const AURA_MAP: Record<string, { aura: string; description: string; gradient: string }> = {
  "풍요": { aura: "Golden Pulse", description: "풍요를 향한 본능이 세상을 움직이는 힘이 됩니다", gradient: "from-amber-400 to-yellow-500" },
  "사랑": { aura: "Warm Gravity", description: "사랑을 향한 중력이 모든 인연을 끌어당깁니다", gradient: "from-rose-400 to-pink-500" },
  "현재": { aura: "Present Flame", description: "지금 이 순간을 태우는 불꽃, 당신의 에너지입니다", gradient: "from-orange-400 to-red-500" },
  "미래": { aura: "Horizon Seeker", description: "먼 미래를 응시하는 눈, 인내가 곧 무기입니다", gradient: "from-blue-400 to-indigo-500" },
  "안정": { aura: "Still Water", description: "고요한 수면 아래 단단한 신념이 흐릅니다", gradient: "from-teal-400 to-cyan-500" },
  "도전": { aura: "Storm Rider", description: "폭풍 속에서 웃는 사람, 도전이 곧 산소입니다", gradient: "from-violet-400 to-purple-500" },
  "성공": { aura: "Crown Bearer", description: "정상을 향한 열망이 당신의 날개입니다", gradient: "from-amber-500 to-orange-500" },
  "여유": { aura: "Slow Orbit", description: "나만의 속도로 우주를 유영하는 자유로운 영혼", gradient: "from-emerald-400 to-teal-500" },
  "이성": { aura: "Crystal Mind", description: "냉철한 논리 속에 빛나는 다이아몬드 같은 판단력", gradient: "from-slate-400 to-zinc-500" },
  "공감": { aura: "Echo Heart", description: "타인의 마음을 비추는 거울, 공감의 주파수", gradient: "from-pink-400 to-rose-500" },
  "성과": { aura: "Impact Zone", description: "눈에 보이는 증거를 만드는 실행가의 힘", gradient: "from-red-400 to-orange-500" },
  "과정": { aura: "Bond Weaver", description: "함께 걷는 여정 속에서 유대를 짜는 장인", gradient: "from-sky-400 to-blue-500" },
  "개성": { aura: "Lone Star", description: "누구도 따라올 수 없는 나만의 빛을 발합니다", gradient: "from-fuchsia-400 to-pink-500" },
  "소속": { aura: "Magnetic Field", description: "사람들을 이어주는 보이지 않는 자기장", gradient: "from-blue-400 to-sky-500" },
  "자유": { aura: "Wild Wind", description: "어떤 것에도 묶이지 않는 바람 같은 존재", gradient: "from-cyan-400 to-teal-500" },
  "헌신": { aura: "Silent Guardian", description: "소중한 것을 지키는 조용하고 강한 빛", gradient: "from-amber-400 to-rose-500" },
};

// ─── 매력 키워드 → 인상 카테고리 매핑 ───
const CHARM_TO_IMPRESSION: Record<string, string> = {
  "다정다감": "따뜻한",
  "세심한 배려": "섬세한",
  "예쁜 말투": "부드러운",
  "매력적 외모": "시각적",
  "깊은 가치관": "깊이있는",
  "유머러스함": "유쾌한",
};

const VIBE_INFO: Record<string, { emoji: string; label: string }> = {
  "spark": { emoji: "\u{1F525}", label: "불꽃이 튀었어요" },
  "calm": { emoji: "\u{1F60A}", label: "편안하고 좋았어요" },
  "cold": { emoji: "\u{1F9CA}", label: "아쉬웠어요" },
};

// ─── 타입 ───
interface BidWithItem {
  itemName: string;
  keyword: string;
  amount: number;
}

interface FeedbackReceived {
  vibe: string;
  charms: string[];
  round: number;
}

interface ReportData {
  // Section 1: Aura Card
  topValues: BidWithItem[];
  aura: { aura: string; description: string; gradient: string } | null;
  totalSpent: number;

  // Section 2: Lone Pioneer
  rareValues: { keyword: string; fullName: string; myAmount: number; bidderCount: number; totalUsers: number }[];

  // Section 3: Feedback
  feedbacks: FeedbackReceived[];
  charmRanking: { charm: string; count: number }[];
  vibeBreakdown: { vibe: string; count: number }[];

  // Section 4: Paradox
  selfIdentity: string;   // 내가 가장 많이 투자한 가치 키워드
  perceivedCharm: string;  // 남들이 가장 많이 선택한 매력 키워드
  isPardoxFound: boolean;

  // Section 5: Instinct
  likedUserValues: { keyword: string; count: number }[];
  totalLikes: number;
}

export default function FinalReportPage({ params }: { params: any }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoadingShare, setIsLoadingShare] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (params) {
      params.then((p: any) => setUserId(p.id));
    }
  }, [params]);

  // 스냅샷에서 데이터 로드 시도
  const loadFromSnapshot = useCallback(async (uid: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/report/${uid}`);
      const data = await res.json();
      if (data.success && data.snapshots?.signature?.data) {
        const snap = data.snapshots.signature.data;
        if (snap.user) setUser(snap.user);
        setReportData({
          topValues: snap.topValues || [],
          aura: snap.aura || null,
          totalSpent: snap.totalSpent || 0,
          rareValues: snap.rareValues || [],
          feedbacks: snap.feedbacks || [],
          charmRanking: snap.charmRanking || [],
          vibeBreakdown: snap.vibeBreakdown || [],
          selfIdentity: snap.selfIdentity || "",
          perceivedCharm: snap.perceivedCharm || "",
          isPardoxFound: snap.isParadoxFound ?? snap.isPardoxFound ?? false,
          likedUserValues: snap.likedUserValues || [],
          totalLikes: snap.totalLikes || 0,
        });
        // 공유 토큰이 있으면 shareUrl도 설정
        if (data.snapshots.signature.share_token) {
          setShareUrl(`${window.location.origin}/share/${data.snapshots.signature.share_token}`);
        }
        return true;
      }
    } catch {}
    return false;
  }, []);

  const buildReport = useCallback(async (uid: string) => {
    // 모든 데이터 병렬 fetch
    const [usersRes, bidsRes, itemsRes, feedbackRes, feedLikesRes] = await Promise.all([
      supabase.from("users").select("id, nickname, gender"),
      supabase.from("bids").select("user_id, auction_item_id, amount"),
      supabase.from("auction_items").select("id, title"),
      supabase.from("conversation_feedback").select("vibe, feedback_text, self_identity, perceived_charm, charms, round").eq("partner_id", uid),
      supabase.from("feed_likes").select("user_id, target_user_id"),
    ]);

    const allUsers = usersRes.data || [];
    const allBids = bidsRes.data || [];
    const items = itemsRes.data || [];
    const feedbacks = feedbackRes.data || [];
    const allFeedLikes = feedLikesRes.data || [];

    const me = allUsers.find(u => String(u.id) === String(uid));
    if (me) setUser(me);

    // ─── Section 1: Aura Card - 내 bid 집계 ───
    const myBids = allBids.filter(b => String(b.user_id) === String(uid));
    const bidMap = new Map<string, number>();
    myBids.forEach(b => {
      const item = items.find(i => i.id === b.auction_item_id);
      const name = item?.title || "";
      if (name) bidMap.set(name, (bidMap.get(name) || 0) + (b.amount || 0));
    });

    const topValues: BidWithItem[] = Array.from(bidMap, ([itemName, amount]) => ({
      itemName,
      keyword: VALUE_TO_KEYWORD[itemName] || itemName,
      amount,
    })).sort((a, b) => b.amount - a.amount);

    const totalSpent = topValues.reduce((sum, v) => sum + v.amount, 0);
    const topKeyword = topValues[0]?.keyword || "";
    const aura = AURA_MAP[topKeyword] || null;

    // ─── Section 2: Lone Pioneer - 희소 가치관 ───
    // 각 아이템별 입찰자 수 계산
    const itemBidderMap = new Map<string, Set<string>>();
    allBids.forEach(b => {
      const item = items.find(i => i.id === b.auction_item_id);
      const name = item?.title || "";
      if (!name) return;
      if (!itemBidderMap.has(name)) itemBidderMap.set(name, new Set());
      itemBidderMap.get(name)!.add(String(b.user_id));
    });

    const rareValues = topValues
      .filter(v => {
        const bidders = itemBidderMap.get(v.itemName);
        return bidders && bidders.has(String(uid));
      })
      .map(v => ({
        keyword: v.keyword,
        fullName: v.itemName,
        myAmount: v.amount,
        bidderCount: itemBidderMap.get(v.itemName)?.size || 0,
        totalUsers: allUsers.length,
      }))
      .sort((a, b) => a.bidderCount - b.bidderCount)
      .slice(0, 3);

    // ─── Section 3: Feedback - 인연의 잔상 ───
    const feedbackData: FeedbackReceived[] = feedbacks.map(f => ({
      vibe: f.vibe,
      charms: f.charms || [],
      round: f.round,
    }));

    // 매력 키워드 집계
    const charmCount = new Map<string, number>();
    feedbackData.forEach(f => {
      f.charms.forEach(c => {
        charmCount.set(c, (charmCount.get(c) || 0) + 1);
      });
    });
    const charmRanking = Array.from(charmCount, ([charm, count]) => ({ charm, count }))
      .sort((a, b) => b.count - a.count);

    // 바이브 집계
    const vibeCount = new Map<string, number>();
    feedbackData.forEach(f => {
      vibeCount.set(f.vibe, (vibeCount.get(f.vibe) || 0) + 1);
    });
    const vibeBreakdown = Array.from(vibeCount, ([vibe, count]) => ({ vibe, count }))
      .sort((a, b) => b.count - a.count);

    // ─── Section 4: Paradox ───
    const selfIdentity = topKeyword;
    const perceivedCharm = charmRanking[0]?.charm || "";
    // 자기표현 vs 타인인식 불일치 판별
    const WARM_CHARMS = ["다정다감", "세심한 배려", "예쁜 말투"];
    const COOL_VALUES = ["이성", "성과", "성공", "자유", "개성"];
    const COOL_CHARMS = ["깊은 가치관", "매력적 외모"];
    const WARM_VALUES = ["사랑", "공감", "헌신", "과정", "소속"];

    const isPardoxFound = (
      (COOL_VALUES.includes(selfIdentity) && WARM_CHARMS.includes(perceivedCharm)) ||
      (WARM_VALUES.includes(selfIdentity) && COOL_CHARMS.includes(perceivedCharm))
    );

    // ─── Section 5: Instinct - 내가 좋아한 사람들의 가치관 분석 (가중 합산 + 다중 태그) ───
    const myLikes = allFeedLikes.filter(l => String(l.user_id) === String(uid));
    const likedUserIds = [...new Set(myLikes.map(l => String(l.target_user_id)))];

    const scoreMap = new Map<string, number>();
    likedUserIds.forEach(likedUid => {
      const theirBids = allBids.filter(b => String(b.user_id) === likedUid);
      const totalSpentByLiked = theirBids.reduce((s, b) => s + (b.amount || 0), 0);
      if (totalSpentByLiked === 0) return;

      theirBids.forEach(b => {
        const item = items.find(i => i.id === b.auction_item_id);
        const name = item?.title || "";
        const tags = VALUE_TO_TAGS[name];
        if (!tags) return;

        const weight = (b.amount || 0) / totalSpentByLiked;
        tags.forEach((tag, idx) => {
          const tagWeight = idx === 0 ? 1.0 : 0.5;
          const score = weight * tagWeight;
          scoreMap.set(tag, (scoreMap.get(tag) || 0) + score);
        });
      });
    });

    const likedUserValues = Array.from(scoreMap, ([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setReportData({
      topValues: topValues.slice(0, 5),
      aura,
      totalSpent,
      rareValues,
      feedbacks: feedbackData,
      charmRanking,
      vibeBreakdown,
      selfIdentity,
      perceivedCharm,
      isPardoxFound,
      likedUserValues,
      totalLikes: myLikes.length,
    });
  }, []);

  // Check access + build report
  useEffect(() => {
    if (!userId) return;

    const init = async () => {
      // API를 통해 phase 확인 (RLS 우회)
      let settings: any = null;
      try {
        const res = await fetch('/api/admin/phase', { cache: 'no-store' });
        const result = await res.json();
        if (result.success) settings = result.settings;
      } catch {}

      // 이전 회차 유저는 항상 접근 허용
      const auth = getAuth();
      const currentSession = settings?.current_session || "";
      const isPreviousSession = !!(auth?.session_id && currentSession && auth.session_id !== currentSession);

      if (!isPreviousSession) {
        const isOpen = settings?.is_final_report_open === 'true';
        const isCompleted = settings?.current_phase === 'completed';

        if (!isOpen && !isCompleted) {
          router.replace(`/1on1/report/${userId}`);
          return;
        }
      }

      // 스냅샷 우선 로드, 없으면 라이브 데이터
      const snapshotLoaded = await loadFromSnapshot(userId);
      if (!snapshotLoaded) {
        await buildReport(userId);
      }
      setIsLoading(false);
    };

    init();

    // Realtime: if admin closes and not in completed phase, redirect back
    const channel = supabase
      .channel('final_report_access')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'system_settings',
      }, async (payload) => {
        const row = payload.new as { key: string; value: string };
        if (row.key === 'is_final_report_open' && row.value !== 'true') {
          // completed phase 또는 이전 회차 유저이면 유지
          try {
            const res = await fetch('/api/admin/phase', { cache: 'no-store' });
            const result = await res.json();
            if (result.settings?.current_phase === 'completed') return;

            const currentAuth = getAuth();
            const currentSession = result.settings?.current_session || "";
            if (currentAuth?.session_id && currentAuth.session_id !== currentSession) return;
          } catch { return; }
          router.replace(`/1on1/report/${userId}`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router, buildReport, loadFromSnapshot]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <Loader2 className="text-indigo-400 animate-spin" size={40} />
      </div>
    );
  }

  const d = reportData;

  /* ── Slide-specific captions (Instagram style) ── */
  const captions: string[] = [
    // Slide 0: Aura
    d?.aura
      ? `✨ The Aura Card\n\n나의 아우라는 "${d.aura.aura}"\n${d.aura.description}\n\n오늘 경매에서 가장 많이 투자한 가치관이\n나만의 아우라를 만들어냈어요 🌙\n\n#시그니처 #아우라 #BeforeWeMeet`
      : `✨ The Aura Card\n\n당신만의 시그니처 아우라를 확인하세요 🌙\n\n#시그니처 #아우라 #BeforeWeMeet`,

    // Slide 1: Lone Pioneer
    d?.rareValues?.[0]
      ? `🔥 The Lone Pioneer\n\n"${d.rareValues[0].keyword}"\n전체 ${d.rareValues[0].totalUsers}명 중 ${d.rareValues[0].bidderCount}명만 선택한\n나만의 가치관 💎\n\n다수가 아닌, 나만의 신념을 따르는 사람.\n그게 바로 개척자의 자격이에요.\n\n#희소가치 #개척자 #나다움`
      : `🔥 The Lone Pioneer\n\n절대 포기할 수 없는 나만의 가치관 💎\n\n#희소가치 #개척자`,

    // Slide 2: Feedback
    d?.charmRanking?.[0]
      ? `💬 The Feedback\n\n대화 상대 ${d.feedbacks?.length || 0}명이 남긴 나의 온도 🌡️\n\n가장 많이 들은 매력 키워드\n👉 "${d.charmRanking[0].charm}"\n\n내가 모르던 나를, 오늘 처음 만난 사람들이\n알려주었네요 🫧\n\n#인연의잔상 #첫인상 #매력키워드`
      : `💬 The Feedback\n\n대화 상대가 남긴 나의 온도 🌡️\n\n#인연의잔상 #첫인상`,

    // Slide 3: Paradox
    d?.selfIdentity
      ? `🪞 Persona Paradox\n\n내가 표현한 나 → "${d.selfIdentity}"\n상대가 느낀 나 → "${d.perceivedCharm}"\n\n${d.isPardoxFound ? "의외의 반전이 발견되었어요 ⚡\n나도 몰랐던 매력이 대화 속에서\n자연스럽게 드러난 순간." : "내면과 외면이 하나로 통하는 사람 🤝\n꾸미지 않아도 전해지는 진정성,\n그게 가장 오래 남는 매력이에요."}\n\n#반전매력 #페르소나 #자아발견`
      : `🪞 Persona Paradox\n\n의도와 인상 사이,\n반전 매력의 증명 ⚡\n\n#반전매력 #페르소나`,

    // Slide 4: Instinct
    d?.likedUserValues?.[0]
      ? `💘 Subconscious Frequency\n\n피드에서 하트를 보낸 ${d.totalLikes}번의 선택을\n분석해 봤어요 🔍\n\n나의 본능이 가장 끌린 키워드\n👉 "${d.likedUserValues[0].keyword}"\n\n머리가 아닌 심장이 먼저 반응한 가치.\n그게 진짜 내 이상형의 단서일지도 🧭\n\n#무의식 #이상형분석 #본능의선택`
      : `💘 Subconscious Frequency\n\n나의 본능이 향한 이상형 분석 🧭\n\n#무의식 #이상형분석`,

    // Slide 5: Closing
    `🕊️ The Closing\n\n오늘 짧은 시간 동안 보여준\n반짝이는 조각들을 모아,\n당신만의 이야기를 적어보았어요 ✏️\n\n'나한테 이런 모습이 있었나?' 싶은\n낯선 발견이 있었나요?\n\n아니면 역시나 싶은 다정한 나를\n다시 한번 확인하셨나요? 🌿\n\n처음 보는 사람들과 낯선 공간에서 보낸 오늘이,\n부디 마음 한구석에 예쁜 색깔로\n칠해졌길 바라요 🎨\n\n#BeforeWeMeetLive #시그니처리포트`,
  ];

  return (
    <div className="min-h-dvh font-sans select-none bg-[#e8f4f8]">
      {/* ── Custom Swiper pagination style ── */}
      <style>{`
        .ig-swiper .swiper-pagination { position: static; margin-top: 12px; }
        .ig-swiper .swiper-pagination-bullet { width: 6px; height: 6px; background: #c7c7cc; opacity: 1; }
        .ig-swiper .swiper-pagination-bullet-active { background: #3897f0; }
      `}</style>

      {/* ══════ Centered Instagram Feed Frame ══════ */}
      <div className="flex items-start justify-center py-0 sm:py-6 px-0 sm:px-4">
        <div className="w-full max-w-[450px] bg-white rounded-none sm:rounded-sm overflow-hidden shadow-sm">

          {/* ── Instagram Header ── */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {/* Profile ring (gradient border) */}
              <div className="w-9 h-9 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                    <Sparkles size={14} className="text-white" />
                  </div>
                </div>
              </div>
              <div className="leading-tight">
                <p className="text-[13px] font-semibold text-gray-900">
                  {user?.name || user?.nickname || "User"}{user?.nickname && user?.name ? ` (${user.nickname})` : ""}
                </p>
                <p className="text-[11px] text-gray-400">Before We Meet Live</p>
              </div>
            </div>
            <button className="p-1 text-gray-900">
              <MoreHorizontal size={20} />
            </button>
          </div>

          {/* ── The Swiper (1:1 Square) ── */}
          <div className="ig-swiper">
            <Swiper
              modules={[Pagination]}
              pagination={{ clickable: true }}
              onSlideChange={(s) => setActiveSlide(s.activeIndex)}
              className="aspect-square"
            >
              {/* Slide 0: Intro + Aura */}
              <SwiperSlide>
                <div className="w-full h-full bg-gradient-to-b from-[#070714] via-[#0c0c2a] to-[#151538] relative flex flex-col items-center justify-center px-6 overflow-hidden">
                  {/* Stars */}
                  {[
                    { top: "10%", left: "8%", s: 2 }, { top: "18%", left: "82%", s: 1.5 },
                    { top: "30%", left: "15%", s: 1 }, { top: "22%", left: "70%", s: 2.5 },
                    { top: "65%", left: "88%", s: 1 }, { top: "75%", left: "6%", s: 1.5 },
                    { top: "50%", left: "25%", s: 1 }, { top: "40%", left: "60%", s: 2 },
                  ].map((st, i) => (
                    <motion.div key={i} className="absolute rounded-full bg-white" style={{ top: st.top, left: st.left, width: st.s, height: st.s }}
                      animate={{ opacity: [0, 0.8, 0.2, 0.9, 0] }}
                      transition={{ delay: i * 0.3, duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ))}
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: "spring" }}
                    className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full mb-4 shadow-[0_0_40px_rgba(129,140,248,0.3)]"
                  >
                    <Sparkles size={24} className="text-white" />
                  </motion.div>
                  <p className="text-[9px] font-black tracking-[0.4em] uppercase mb-2 text-indigo-300">The Signature</p>
                  <h2 className="text-xl italic font-bold tracking-tight text-white mb-3">{user?.nickname}님의 시그니처</h2>

                  {d?.aura && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                      className={`bg-gradient-to-r ${d.aura.gradient} rounded-2xl p-4 text-center shadow-lg w-full max-w-[280px] mt-2`}
                    >
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/70 mb-1">Your Aura</p>
                      <h4 className="text-lg font-black text-white mb-1">{d.aura.aura}</h4>
                      <p className="text-[11px] text-white/80 leading-relaxed break-keep">{d.aura.description}</p>
                    </motion.div>
                  )}

                  {d?.topValues && d.topValues.length > 0 && (
                    <div className="w-full max-w-[280px] mt-4 space-y-1.5">
                      {d.topValues.slice(0, 3).map((v, i) => {
                        const pct = d.totalSpent > 0 ? Math.round((v.amount / d.totalSpent) * 100) : 0;
                        return (
                          <motion.div key={v.itemName} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.08 }}
                            className="flex items-center gap-2"
                          >
                            <span className="text-indigo-400/60 text-[11px] font-bold w-4 text-right">{i + 1}</span>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[11px] font-bold text-white/90">{v.keyword}</span>
                                <span className="text-[10px] text-indigo-300/70">{pct}%</span>
                              </div>
                              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full"
                                  initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.6 + i * 0.08, duration: 0.5 }}
                                />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </SwiperSlide>

              {/* Slide 1: Lone Pioneer */}
              <SwiperSlide>
                <div className="w-full h-full bg-[#070714] flex items-center justify-center px-5">
                  <div className="w-full max-w-[360px] bg-white/95 backdrop-blur-xl rounded-3xl p-5 shadow-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap size={14} className="text-indigo-500" />
                      <span className="text-[8px] font-black uppercase tracking-[0.3em] text-indigo-400">SCARCITY</span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mb-0.5">The Lone Pioneer</h3>
                    <p className="text-[11px] text-gray-500 mb-3">절대 포기할 수 없는 내 가치관</p>
                    {d && d.rareValues.length > 0 ? (
                      <div className="space-y-2.5">
                        {d.rareValues.map((rv, i) => {
                          const ratio = Math.round((rv.bidderCount / rv.totalUsers) * 100);
                          return (
                            <motion.div key={rv.keyword} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                              className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-3"
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  {rv.bidderCount <= 2 && <Crown size={11} className="text-indigo-500" />}
                                  <span className="text-[13px] font-bold text-gray-900">{rv.keyword}</span>
                                </div>
                                <span className="text-[9px] font-bold text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded-full">{rv.bidderCount}/{rv.totalUsers}명</span>
                              </div>
                              <p className="text-[11px] text-gray-600 mb-1.5 break-keep">{rv.fullName}</p>
                              <div className="w-full h-1 bg-indigo-100 rounded-full overflow-hidden">
                                <motion.div className={`h-full rounded-full ${rv.bidderCount <= 2 ? 'bg-gradient-to-r from-indigo-400 to-purple-400' : 'bg-indigo-300'}`}
                                  initial={{ width: 0 }} animate={{ width: `${ratio}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                                />
                              </div>
                              <p className="text-[9px] text-indigo-400 mt-1.5">
                                {rv.bidderCount <= 2 ? `전체 ${rv.totalUsers}명 중 오직 ${rv.bidderCount}명만 선택` : `참가자의 ${ratio}%가 선택`}
                              </p>
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-6">데이터를 분석 중입니다</p>
                    )}
                  </div>
                </div>
              </SwiperSlide>

              {/* Slide 2: Feedback */}
              <SwiperSlide>
                <div className="w-full h-full bg-[#070714] flex items-center justify-center px-5">
                  <div className="w-full max-w-[360px] bg-white/95 backdrop-blur-xl rounded-3xl p-5 shadow-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Radio size={14} className="text-indigo-500" />
                      <span className="text-[8px] font-black uppercase tracking-[0.3em] text-indigo-400">THE ECHO</span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mb-0.5">The Feedback</h3>
                    <p className="text-[11px] text-gray-500 mb-3">대화 상대가 남긴 당신의 온도</p>
                    {d && d.feedbacks.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex gap-1.5">
                          {d.vibeBreakdown.map(v => {
                            const info = VIBE_INFO[v.vibe];
                            if (!info) return null;
                            return (
                              <div key={v.vibe} className="flex-1 bg-indigo-50/80 border border-indigo-100 rounded-lg p-2 text-center">
                                <span className="text-base">{info.emoji}</span>
                                <p className="text-sm font-black text-gray-900 mt-0.5">{v.count}</p>
                                <p className="text-[8px] text-gray-500 break-keep">{info.label}</p>
                              </div>
                            );
                          })}
                        </div>
                        {d.charmRanking.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {d.charmRanking.map((c, i) => (
                              <span key={c.charm}
                                className={`px-2.5 py-1.5 rounded-full font-bold text-[11px] ${
                                  i === 0 ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white' : 'bg-gray-100 text-gray-700 border border-gray-200'
                                }`}
                              >
                                {c.charm} x{c.count}
                              </span>
                            ))}
                          </div>
                        )}
                        {d.vibeBreakdown.some(v => v.vibe === "spark") ? (
                          <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-xl p-3 text-center">
                            <p className="text-[11px] text-gray-700 leading-relaxed break-keep">당신만의 아우라가 누군가의 마음 한구석에 기분 좋은 파동을 일으켰네요.</p>
                          </div>
                        ) : (
                          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-gray-600 leading-relaxed break-keep">짧은 시간 안에 서로의 결을 온전히 느끼긴 어려우니까요.</p>
                            <p className="text-[11px] font-bold text-indigo-600 mt-1 break-keep">더 좋은 타이밍에 다시 인연을 찾아봐요</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-6">아직 수집된 피드백이 없습니다</p>
                    )}
                  </div>
                </div>
              </SwiperSlide>

              {/* Slide 3: Paradox */}
              <SwiperSlide>
                <div className="w-full h-full bg-[#070714] flex items-center justify-center px-5">
                  <div className="w-full max-w-[360px] bg-white/95 backdrop-blur-xl rounded-3xl p-5 shadow-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain size={14} className="text-indigo-500" />
                      <span className="text-[8px] font-black uppercase tracking-[0.3em] text-indigo-400">PARADOX</span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mb-0.5">Persona Paradox</h3>
                    <p className="text-[11px] text-gray-500 mb-3">의도와 인상 사이, 반전 매력의 증명</p>
                    {d && d.selfIdentity && d.perceivedCharm ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
                          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-3 text-center flex flex-col justify-center">
                            <p className="text-[7px] font-black uppercase tracking-widest text-indigo-400 mb-1">내가 표현한 나</p>
                            <p className="text-lg font-black text-indigo-700">{d.selfIdentity}</p>
                            <p className="text-[8px] text-gray-500 mt-0.5">최고 입찰 가치관</p>
                          </div>
                          <div className="flex items-center text-gray-400 font-black text-[10px] shrink-0 px-0.5">VS</div>
                          <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 rounded-xl p-3 text-center flex flex-col justify-center">
                            <p className="text-[7px] font-black uppercase tracking-widest text-rose-400 mb-1">상대가 느낀 나</p>
                            <p className="text-lg font-black text-rose-600">{d.perceivedCharm}</p>
                            <p className="text-[8px] text-gray-500 mt-0.5">가장 많이 받은 매력</p>
                          </div>
                        </div>
                        <div className={`rounded-xl p-3 text-center ${d.isPardoxFound ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200' : 'bg-gray-50 border border-gray-100'}`}>
                          {d.isPardoxFound ? (
                            <>
                              <Sparkles size={14} className="text-indigo-500 mx-auto mb-1.5" />
                              <p className="text-[11px] font-bold text-indigo-700 mb-1.5">반전 매력 발견!</p>
                              <p className="text-[10px] text-gray-600 leading-relaxed break-keep">
                                당신의 세계는 &ldquo;{d.selfIdentity}&rdquo;이라는 명확한 방향을 향해 움직이고 있지만,
                                그 여정 속에서 타인이 발견한 당신의 실루엣은 &ldquo;{d.perceivedCharm}&rdquo;만큼이나 입체적이었네요.
                              </p>
                              <p className="text-[10px] text-gray-600 leading-relaxed break-keep mt-1.5">
                                이 두 가지 결이 만나 만드는 반전의 매력이
                                오늘 이곳의 공기를 당신의 색깔로 물들였습니다.
                              </p>
                            </>
                          ) : (
                            <>
                              <Heart size={14} className="text-gray-400 mx-auto mb-1.5" />
                              <p className="text-[11px] font-bold text-gray-700 mb-1.5">흔들리지 않는 매력</p>
                              <p className="text-[10px] text-gray-600 leading-relaxed break-keep">
                                당신의 세계는 &ldquo;{d.selfIdentity}&rdquo;이라는 명확한 방향을 향해 움직이고 있지만,
                                그 여정 속에서 타인이 발견한 당신의 실루엣은 &ldquo;{d.perceivedCharm}&rdquo;만큼이나 입체적이었네요.
                              </p>
                              <p className="text-[10px] text-gray-600 leading-relaxed break-keep mt-1.5">
                                이 두 가지 결이 만나 만드는 반전의 매력이
                                오늘 이곳의 공기를 당신의 색깔로 물들였습니다.
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-6">
                        {!d?.selfIdentity ? "경매 데이터가 필요합니다" : "피드백 데이터가 필요합니다"}
                      </p>
                    )}
                  </div>
                </div>
              </SwiperSlide>

              {/* Slide 4: Instinct */}
              <SwiperSlide>
                <div className="w-full h-full bg-[#070714] flex items-center justify-center px-5">
                  <div className="w-full max-w-[360px] bg-white/95 backdrop-blur-xl rounded-3xl p-5 shadow-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Users size={14} className="text-indigo-500" />
                      <span className="text-[8px] font-black uppercase tracking-[0.3em] text-indigo-400">INSTINCT</span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mb-0.5">Subconscious Frequency</h3>
                    <p className="text-[11px] text-gray-500 mb-3">당신의 본능이 향한 이상형 분석</p>
                    {d && d.likedUserValues.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-[11px] text-gray-600 leading-relaxed break-keep">
                          피드에서 하트를 보낸 <span className="text-indigo-500 font-bold">{d.totalLikes}번</span>의 선택을 분석한 결과입니다.
                        </p>
                        <div className="space-y-2">
                          {d.likedUserValues.map((lv, i) => {
                            const maxCount = d.likedUserValues[0]?.count || 1;
                            const pct = Math.round((lv.count / maxCount) * 100);
                            return (
                              <motion.div key={lv.keyword} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08 }}
                                className="flex items-center gap-2.5"
                              >
                                <span className={`text-[11px] font-bold w-4 text-right ${i === 0 ? 'text-rose-500' : 'text-gray-400'}`}>{i + 1}</span>
                                <div className="flex-1">
                                  <div className="flex justify-between items-center mb-0.5">
                                    <span className="text-[11px] font-bold text-gray-800 flex items-center gap-1">
                                      {i === 0 && <Heart size={10} className="text-rose-400" fill="#fb7185" />}
                                      {lv.keyword}
                                    </span>
                                  </div>
                                  <div className="w-full h-1 bg-rose-100 rounded-full overflow-hidden">
                                    <motion.div className={`h-full rounded-full ${i === 0 ? 'bg-gradient-to-r from-rose-400 to-pink-500' : 'bg-rose-200'}`}
                                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                        {d.likedUserValues[0] && (
                          <div className="bg-rose-50 border border-rose-100 rounded-xl p-2.5 text-center">
                            <p className="text-[10px] text-gray-600 break-keep">
                              당신의 본능은 <span className="text-rose-500 font-bold">&ldquo;{d.likedUserValues[0].keyword}&rdquo;</span>을 가진 사람에게 가장 강하게 반응합니다.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-6">피드 활동 데이터가 없습니다</p>
                    )}
                  </div>
                </div>
              </SwiperSlide>

              {/* Slide 5: Closing */}
              <SwiperSlide>
                <div className="w-full h-full bg-gradient-to-b from-[#1a0f0a] via-[#2a1810] to-[#1a0f0a] flex flex-col items-center justify-center px-6 relative overflow-hidden">
                  {[
                    { top: "15%", left: "10%", s: 3 }, { top: "25%", left: "80%", s: 2 },
                    { top: "60%", left: "15%", s: 2.5 }, { top: "70%", left: "85%", s: 2 },
                  ].map((st, i) => (
                    <motion.div key={i} className="absolute rounded-full bg-amber-300/30"
                      style={{ top: st.top, left: st.left, width: st.s, height: st.s }}
                      animate={{ opacity: [0, 0.6, 0.2, 0.7, 0] }}
                      transition={{ delay: i * 0.4, duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ))}
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: "spring" }}
                    className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full mb-5 shadow-[0_0_40px_rgba(251,191,36,0.2)]"
                  >
                    <Sparkles size={20} className="text-white" />
                  </motion.div>
                  <p className="text-[9px] font-black tracking-[0.4em] uppercase mb-3 text-amber-300/70">The Closing</p>
                  <h2 className="text-lg font-bold text-white mb-4 leading-relaxed text-center">
                    오늘 짧은 시간 동안 당신이 보여준 <br /> 반짝이는 조각들을 모아,<br /> 당신만의 이야기를 정성껏 적어보았어요.
                  </h2>
                  <div className="h-px w-10 bg-amber-400/30 mb-4" />
                  <p className="text-[13px] text-amber-100/70 leading-loose break-keep text-center mb-1">
                    '나한테 이런 모습이 있었나?' 싶은 낯선 발견이 있었나요? <br /> 아니면 역시나 싶은 다정한 나를 다시 한번 확인하셨나요?
                  </p>
                  <p className="text-[13px] text-amber-100/70 leading-loose break-keep text-center">
                    오늘 경매에서 조금 다른 마음을 얹었다면, <br /> 결과지도 평소와는 조금 다를 수 있어요. <br /> 그저 오늘의 특별한 여행이었다고 생각해주세요! <br /><br />
                    처음 보는 사람들과 낯선 공간에서 보낸 오늘이,<br /> 부디 당신의 마음 한구석에 예쁜 색깔로 칠해졌길 바라요.
                  </p>
                  <p className="text-[10px] text-amber-200/30 mt-6">Before We Meet</p>
                </div>
              </SwiperSlide>
            </Swiper>
          </div>

          {/* ── Instagram Interaction Icons ── */}
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsLiked(!isLiked)} className="p-0.5">
                <Heart size={24} className={isLiked ? "text-red-500 fill-red-500" : "text-gray-900"} strokeWidth={1.5} />
              </button>
              <button className="p-0.5 text-gray-900">
                <MessageCircle size={24} strokeWidth={1.5} />
              </button>
              <button onClick={() => setIsShareOpen(true)} className="p-0.5 text-gray-900">
                <Send size={24} strokeWidth={1.5} />
              </button>
            </div>
            <button className="p-0.5 text-gray-900">
              <Bookmark size={24} strokeWidth={1.5} />
            </button>
          </div>

          {/* ── Instagram Caption ── */}
          <div className="px-3.5 pb-6 pt-1">
            <div className="max-h-[40dvh] sm:max-h-[200px] overflow-y-auto">
              <p className="text-[13px] text-gray-900 leading-[1.7]">
                <span className="font-semibold">{user?.nickname || "user"}</span>{" "}
                <span className="text-gray-700 whitespace-pre-line">{captions[activeSlide]}</span>
              </p>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">{activeSlide + 1} / {TOTAL_SLIDES}</p>
          </div>

        </div>{/* end feed container */}
      </div>

      {/* ══════ Hidden Export Div (for PNG/PDF) ══════ */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }} aria-hidden="true">
        <div ref={reportRef} style={{ width: 420, background: "#FAF9F6", padding: "0 0 40px 0" }}>
          <div style={{ background: "#070714", borderRadius: "0 0 2rem 2rem", padding: "48px 24px 32px", textAlign: "center" }}>
            <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.4em", textTransform: "uppercase", color: "#a5b4fc", marginBottom: 8 }}>The Signature</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, fontStyle: "italic", color: "white", marginBottom: 8 }}>{user?.nickname}님의 시그니처</h1>
            <p style={{ fontSize: 11, color: "rgba(165,180,252,0.5)", lineHeight: 1.6 }}>오늘 이 공간에서 당신이 증명한 가치를<br />가장 아름다운 방식으로 복원했습니다.</p>
          </div>
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
            {d?.aura && (
              <div style={{ background: "white", borderRadius: "1.5rem", padding: 20, border: "1px solid #e5e7eb" }}>
                <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.3em", textTransform: "uppercase", color: "#818cf8", marginBottom: 8 }}>IDENTITY — The Aura Card</p>
                <div style={{ background: "linear-gradient(135deg, #818cf8, #a855f7)", borderRadius: "1rem", padding: 16, textAlign: "center", marginBottom: 16 }}>
                  <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.4em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>Your Aura</p>
                  <p style={{ fontSize: 18, fontWeight: 900, color: "white", marginBottom: 4 }}>{d.aura.aura}</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>{d.aura.description}</p>
                </div>
                {d.topValues.map((v, i) => {
                  const pct = d.totalSpent > 0 ? Math.round((v.amount / d.totalSpent) * 100) : 0;
                  return (
                    <div key={v.itemName} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", width: 16, textAlign: "right" }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#292524" }}>{v.keyword}</span>
                          <span style={{ fontSize: 10, color: "#57534e" }}>{pct}%</span>
                        </div>
                        <div style={{ width: "100%", height: 5, background: "#e0e7ff", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #818cf8, #a855f7)", borderRadius: 4 }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {d && d.rareValues.length > 0 && (
              <div style={{ background: "white", borderRadius: "1.5rem", padding: 20, border: "1px solid #e5e7eb" }}>
                <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.3em", textTransform: "uppercase", color: "#818cf8", marginBottom: 8 }}>SCARCITY — The Lone Pioneer</p>
                {d.rareValues.map((rv) => (
                  <div key={rv.keyword} style={{ background: "#eef2ff", borderRadius: "1rem", padding: 12, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{rv.keyword}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#6366f1", background: "#e0e7ff", padding: "2px 8px", borderRadius: 12 }}>{rv.bidderCount}/{rv.totalUsers}명</span>
                    </div>
                    <p style={{ fontSize: 11, color: "#1a1a1a", marginBottom: 4 }}>{rv.fullName}</p>
                  </div>
                ))}
              </div>
            )}
            {d && d.feedbacks.length > 0 && (
              <div style={{ background: "white", borderRadius: "1.5rem", padding: 20, border: "1px solid #e5e7eb" }}>
                <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.3em", textTransform: "uppercase", color: "#818cf8", marginBottom: 8 }}>THE ECHO — The Feedback</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {d.vibeBreakdown.map(v => {
                    const info = VIBE_INFO[v.vibe];
                    if (!info) return null;
                    return (
                      <div key={v.vibe} style={{ flex: 1, background: "#eef2ff", borderRadius: "0.75rem", padding: 10, textAlign: "center" }}>
                        <span style={{ fontSize: 16 }}>{info.emoji}</span>
                        <p style={{ fontSize: 14, fontWeight: 900, color: "#1a1a1a", marginTop: 4 }}>{v.count}</p>
                        <p style={{ fontSize: 9, color: "#1a1a1a" }}>{info.label}</p>
                      </div>
                    );
                  })}
                </div>
                {d.charmRanking.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {d.charmRanking.map((c, i) => (
                      <span key={c.charm} style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 16, background: i === 0 ? "linear-gradient(90deg, #8b5cf6, #9333ea)" : "#f5f5f4", color: i === 0 ? "white" : "#292524", border: i === 0 ? "none" : "1px solid #d6d3d1" }}>
                        {c.charm} x{c.count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {d && d.selfIdentity && d.perceivedCharm && (
              <div style={{ background: "white", borderRadius: "1.5rem", padding: 20, border: "1px solid #e5e7eb" }}>
                <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.3em", textTransform: "uppercase", color: "#818cf8", marginBottom: 8 }}>PARADOX — Persona Paradox</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1, background: "#eef2ff", borderRadius: "1rem", padding: 12, textAlign: "center" }}>
                    <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase", color: "#818cf8", marginBottom: 4 }}>내가 표현한 나</p>
                    <p style={{ fontSize: 18, fontWeight: 900, color: "#4338ca" }}>{d.selfIdentity}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", fontWeight: 900, fontSize: 10, color: "#1a1a1a" }}>VS</div>
                  <div style={{ flex: 1, background: "#fff1f2", borderRadius: "1rem", padding: 12, textAlign: "center" }}>
                    <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase", color: "#fb7185", marginBottom: 4 }}>상대가 느낀 나</p>
                    <p style={{ fontSize: 18, fontWeight: 900, color: "#e11d48" }}>{d.perceivedCharm}</p>
                  </div>
                </div>
              </div>
            )}
            {d && d.likedUserValues.length > 0 && (
              <div style={{ background: "white", borderRadius: "1.5rem", padding: 20, border: "1px solid #e5e7eb" }}>
                <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.3em", textTransform: "uppercase", color: "#818cf8", marginBottom: 8 }}>INSTINCT — Subconscious Frequency</p>
                {d.likedUserValues.map((lv, i) => {
                  const maxCount = d.likedUserValues[0]?.count || 1;
                  const pct = Math.round((lv.count / maxCount) * 100);
                  return (
                    <div key={lv.keyword} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? "#f43f5e" : "#1a1a1a", width: 16, textAlign: "right" }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#292524" }}>{lv.keyword}</span>
                          <span style={{ fontSize: 10, color: "#1a1a1a" }}>{lv.count}명</span>
                        </div>
                        <div style={{ width: "100%", height: 5, background: "#ffe4e6", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: i === 0 ? "linear-gradient(90deg, #fb7185, #ec4899)" : "#fecdd3", borderRadius: 4 }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ textAlign: "center", padding: "24px 16px" }}>
              <p style={{ fontSize: 12, color: "#57534e", lineHeight: 1.8 }}>오늘 짧은 시간 동안 당신이 보여준 반짝이는 조각들을 모아, 당신만의 이야기를 정성껏 적어보았어요.</p>
              <p style={{ fontSize: 10, color: "#a8a29e", marginTop: 8 }}>Before We Meet Live</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════ Share Bottom Sheet ══════ */}
      <AnimatePresence>
        {isShareOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50" onClick={() => setIsShareOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 rounded-t-3xl px-6 pt-5 pb-8"
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold text-gray-900">공유하기</h3>
                <button onClick={() => setIsShareOpen(false)} className="text-gray-500 p-1"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                {/* URL 복사 */}
                <motion.button
                  onClick={async () => {
                    setIsLoadingShare(true);
                    try {
                      const res = await fetch(`/api/report/${userId}`);
                      const data = await res.json();
                      let token = data.success && data.snapshots?.signature?.share_token;
                      if (!token && reportData) {
                        const postRes = await fetch(`/api/report/${userId}`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ snapshot_data: reportData, user }),
                        });
                        const postData = await postRes.json();
                        if (postData.success) token = postData.share_token;
                      }
                      if (token) {
                        const url = `${window.location.origin}/share/${token}`;
                        setShareUrl(url);
                        await navigator.clipboard.writeText(url);
                        setIsCopied(true);
                        setTimeout(() => { setIsCopied(false); setIsShareOpen(false); }, 1500);
                      } else { alert("공유 링크를 생성할 수 없습니다."); }
                    } catch { alert("공유 링크 생성 중 오류가 발생했습니다."); } finally { setIsLoadingShare(false); }
                  }}
                  disabled={isLoadingShare}
                  className="w-full flex items-center gap-4 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-left disabled:opacity-50"
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                    {isLoadingShare ? <Loader2 size={18} className="text-indigo-500 animate-spin" /> :
                     isCopied ? <Check size={18} className="text-emerald-500" /> :
                     <Link size={18} className="text-indigo-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{isCopied ? "링크가 복사되었습니다!" : "URL 복사하기"}</p>
                    <p className="text-xs text-gray-500 mt-0.5">링크를 통해 누구나 볼 수 있어요</p>
                  </div>
                </motion.button>
                {/* 이미지 저장 */}
                <motion.button
                  onClick={async () => {
                    if (!reportRef.current) return;
                    setIsSavingImage(true);
                    try {
                      const dataUrl = await toPng(reportRef.current, { backgroundColor: "#FAF9F6", pixelRatio: 2, filter: (node) => { if (node instanceof HTMLElement && node.getAttribute?.("aria-hidden") === "true") return false; return true; } });
                      const link = document.createElement("a");
                      link.download = `${user?.nickname || "signature"}_report.png`;
                      link.href = dataUrl; link.click();
                      setTimeout(() => setIsShareOpen(false), 500);
                    } catch { alert("이미지 저장 중 오류가 발생했습니다."); } finally { setIsSavingImage(false); }
                  }}
                  disabled={isSavingImage}
                  className="w-full flex items-center gap-4 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-left disabled:opacity-50"
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                    {isSavingImage ? <Loader2 size={18} className="text-indigo-500 animate-spin" /> : <Download size={18} className="text-indigo-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">사진으로 저장하기</p>
                    <p className="text-xs text-gray-500 mt-0.5">리포트를 이미지로 다운로드</p>
                  </div>
                </motion.button>
                {/* PDF 저장 */}
                <motion.button
                  onClick={async () => {
                    if (!reportRef.current) return;
                    setIsSavingPdf(true);
                    try {
                      const dataUrl = await toPng(reportRef.current, { backgroundColor: "#FAF9F6", pixelRatio: 2, filter: (node) => { if (node instanceof HTMLElement && node.getAttribute?.("aria-hidden") === "true") return false; return true; } });
                      const img = new Image(); img.src = dataUrl;
                      await new Promise<void>((resolve) => { img.onload = () => resolve(); });
                      const pdfWidth = 210; const pdfHeight = (img.height * pdfWidth) / img.width;
                      const pdf = new jsPDF({ orientation: pdfHeight > pdfWidth ? "portrait" : "landscape", unit: "mm", format: [pdfWidth, pdfHeight] });
                      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
                      pdf.save(`${user?.nickname || "signature"}_report.pdf`);
                      setTimeout(() => setIsShareOpen(false), 500);
                    } catch { alert("PDF 저장 중 오류가 발생했습니다."); } finally { setIsSavingPdf(false); }
                  }}
                  disabled={isSavingPdf}
                  className="w-full flex items-center gap-4 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-left disabled:opacity-50"
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                    {isSavingPdf ? <Loader2 size={18} className="text-indigo-500 animate-spin" /> : <FileText size={18} className="text-indigo-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">PDF로 저장하기</p>
                    <p className="text-xs text-gray-500 mt-0.5">리포트를 PDF 파일로 다운로드</p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
