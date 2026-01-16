"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { usePhaseRedirect } from "@/lib/hooks/usePhaseRedirect";
import { MatchingCard } from "@/app/1on1/_components/MatchingCard";
import { Sparkles, Activity, Search, Heart, ShieldCheck, AlertCircle, RefreshCcw, Quote } from "lucide-react";

export default function UserReportPage({ params }: { params: any }) {
  const [user, setUser] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [targetGender, setTargetGender] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const isCalculating = useRef(false);
  const hasFinished = useRef(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingMessages = [
    { icon: <Search size={20}/>, text: "경매 데이터를 정밀 분석 중..." },
    { icon: <Heart size={20}/>, text: "피드 시그널 교차 검증 중..." },
    { icon: <Activity size={20}/>, text: "7:3 가중치 알고리즘 적용 중..." },
    { icon: <ShieldCheck size={20}/>, text: "맞춤형 리포트 생성 완료..." }
  ];

  const calculateMatches = useCallback(async (uid: string) => {
    if (isCalculating.current || hasFinished.current) return;
    isCalculating.current = true;

    try {
      setIsLoading(true);
      setError(null);

      // 시각적 로딩 연출
      for (let i = 0; i < loadingMessages.length; i++) {
        setLoadingStep(i);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      const [usersRes, bidsRes, likesRes] = await Promise.all([
        supabase.from("users").select("*"),
        supabase.from("auction_bids").select("*"),
        supabase.from("feed_likes").select("*")
      ]);

      if (usersRes.error) throw new Error("데이터 연결 실패");
      
      const allUsers = usersRes.data || [];
      const allBids = bidsRes.data || [];
      const allLikes = likesRes.data || [];

      const me = allUsers.find(u => String(u.id) === String(uid));
      if (!me) throw new Error("내 정보를 찾을 수 없습니다.");
      setUser(me);

      const myGender = me.gender?.trim() || "";
      const target = (myGender === "여성" || myGender === "여") ? "남성" : "여성";
      setTargetGender(target);

      const myBids = allBids.filter(b => String(b.user_id) === String(uid));
      const myLikes = allLikes.filter(l => String(l.user_id) === String(uid));

      const scoredMatches = allUsers
        .filter(u => String(u.id) !== String(uid) && (u.gender === target || u.gender === target.charAt(0)))
        .map(other => {
          // --- [1] 가치관 점수 (70점 만점) 정규화 ---
          let auctionScore = 0;
          const otherBids = allBids.filter(b => String(b.user_id) === String(other.id));
          
          if (myBids.length > 0) {
            let matchRatioSum = 0;
            myBids.forEach(myBid => {
              const partnerBid = otherBids.find(ob => ob.item_id === myBid.item_id);
              if (partnerBid) {
                // 입찰가 차이 기반 유사도 (오차 적을수록 고점)
                const ratio = Math.min(myBid.amount, partnerBid.amount) / Math.max(myBid.amount, partnerBid.amount);
                matchRatioSum += ratio;
              }
            });
            // (일치율 합산 / 내 입찰 항목 수) * 70점
            auctionScore = (matchRatioSum / myBids.length) * 70;
          }

          // --- [2] 피드 점수 (30점 만점) ---
          const heartsToOther = myLikes.filter(l => String(l.target_user_id) === String(other.id)).length;
          // 3장 중 선택 비율로 계산
          const feedScore = (Math.min(heartsToOther, 3) / 3) * 30;

          // --- [3] 최종 합산 및 시너지 보너스 ---
          let finalScore = auctionScore + feedScore;
          
          // 상호 호감 시너지 (나도 누르고 상대도 나를 눌렀을 때 15% 보너스)
          const receivedLike = allLikes.some(l => String(l.user_id) === String(other.id) && String(l.target_user_id) === String(uid));
          if (heartsToOther > 0 && receivedLike) {
            finalScore *= 1.15;
          }

          return {
            id: other.id,
            nickname: other.nickname,
            final_score: Math.round(Math.min(finalScore, 100)),
            auction_detail: Math.round(auctionScore),
            feed_detail: Math.round(feedScore),
            isMutual: heartsToOther > 0 && receivedLike
          };
        })
        .sort((a, b) => b.final_score - a.final_score)
        .slice(0, 3);

      setMatches(scoredMatches);
      hasFinished.current = true;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
      isCalculating.current = false;
    }
  }, []);

  useEffect(() => {
    params.then((p: any) => setUserId(p.id));
  }, [params]);

  usePhaseRedirect({
    currentPage: "report",
    onSettingsFetched: (settings) => {
      if (userId && matches.length === 0 && !isCalculating.current && !hasFinished.current) {
        calculateMatches(userId);
      }
    }
  });

  if (isLoading) return <LoadingScreen step={loadingStep} messages={loadingMessages} />;

  if (error) return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="text-[#A52A2A] mb-4" size={48} />
      <h2 className="text-white font-serif italic mb-6">{error}</h2>
      <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white/10 text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
        <RefreshCcw size={14} /> Retry
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-serif pb-24 antialiased select-none">
      <header className="text-center pt-16 pb-12 px-6">
        <p className="text-[10px] font-sans font-black tracking-[0.4em] text-[#A52A2A] uppercase mb-3">Matching Intelligence</p>
        <h1 className="text-4xl italic tracking-tighter leading-tight mb-2">{user?.nickname}님의 인연 리포트</h1>
        <div className="h-px w-12 bg-[#A52A2A] mx-auto opacity-30" />
      </header>

      <section className="max-w-xl mx-auto px-6 space-y-12">
        {/* 인트로 스토리 카드 */}
        <div className="bg-white p-10 rounded-[3rem] border border-[#EEEBDE] shadow-[0_20px_60px_rgba(0,0,0,0.02)] relative overflow-hidden">
          <Quote className="absolute -top-2 -left-2 text-[#EEEBDE] opacity-40" size={60} />
          <p className="text-sm leading-[1.9] text-gray-500 font-light break-keep text-center relative z-10">
            가치관 경매의 데이터와 사진 피드의 시그널을 교차 분석한 결과, <br/>
            {user?.nickname}님과 가장 깊은 영혼의 울림을 보인 <span className="text-[#A52A2A] font-bold underline">{targetGender}</span> 세 분을 찾았습니다.
          </p>
        </div>

        {/* 매칭 상세 리스트 */}
        <div className="space-y-8">
          <h3 className="text-[10px] font-sans font-black tracking-[0.3em] text-gray-300 uppercase text-center italic">Top 3 Destined Connections</h3>
          
          {matches.map((match, idx) => (
            <div key={match.id} className="bg-white rounded-[2.5rem] border border-[#EEEBDE] shadow-xl overflow-hidden transition-all hover:translate-y-[-4px] p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: `${idx * 200}ms` }}>
              <div className="flex justify-between items-end">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-sans font-black text-[#A52A2A] uppercase tracking-widest">Rank {idx + 1}</span>
                    {match.isMutual && (
                      <span className="bg-[#FDF8F8] text-[#A52A2A] text-[8px] font-black px-2 py-0.5 rounded-full border border-[#A52A2A]/10 uppercase tracking-tighter flex items-center gap-1">
                        <Heart size={8} fill="#A52A2A"/> Mutual
                      </span>
                    )}
                  </div>
                  <h4 className="text-3xl font-bold tracking-tighter">{match.nickname}</h4>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-300 font-sans font-black uppercase tracking-widest">Match Rate</p>
                  <p className="text-4xl font-black italic text-[#A52A2A]">{match.final_score}%</p>
                </div>
              </div>

              {/* 스코어 분석 게이지 */}
              <div className="space-y-4 pt-4 border-t border-gray-50">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-sans font-bold uppercase tracking-wider text-gray-400">
                    <span>Values Fit (Auction)</span>
                    <span>{match.auction_detail} / 70</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                    <div className="h-full bg-[#1A1A1A] transition-all duration-1000" style={{ width: `${(match.auction_detail / 70) * 100}%` }} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-sans font-bold uppercase tracking-wider text-gray-400">
                    <span>Visual Harmony (Feed)</span>
                    <span>{match.feed_detail} / 30</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                    <div className="h-full bg-[#A52A2A] transition-all duration-1000" style={{ width: `${(match.feed_detail / 30) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// 로딩 화면 컴포넌트
function LoadingScreen({ step, messages }: any) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-8 text-center space-y-12">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 border-2 border-[#A52A2A]/20 rounded-full animate-ping" />
        <div className="absolute inset-0 border-t-2 border-[#A52A2A] rounded-full animate-spin flex items-center justify-center">
          <Sparkles className="text-[#A52A2A] animate-pulse" size={32} />
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 text-[#A52A2A]">
          {messages[step].icon}
          <span className="text-[10px] font-sans font-black uppercase tracking-[0.4em]">Phase {step + 1}</span>
        </div>
        <h2 className="text-xl text-white italic font-serif leading-relaxed h-8">{messages[step].text}</h2>
      </div>
    </div>
  );
}