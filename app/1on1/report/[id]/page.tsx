"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { usePhaseRedirect } from "@/lib/hooks/usePhaseRedirect";
import { Sparkles, Activity, Search, Heart, ShieldCheck, AlertCircle, RefreshCcw, Quote, User } from "lucide-react";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

const { colors, transitions } = DESIGN_TOKENS;

// 다른 페이지와 통일된 파스텔 테마
const PASTEL_THEME = {
  blue: "#E0F2FE",      
  darkBlue: "#7DD3FC",  
  softBeige: "#F5F5F4", 
  border: "#EEEBDE",    
  text: "#44403C"       
};

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
    { icon: <Search size={20} />, text: "경매 데이터를 정밀 분석 중..." },
    { icon: <Heart size={20} />, text: "피드 시그널 교차 검증 중..." },
    { icon: <Activity size={20} />, text: "가중치 매칭 알고리즘 적용 중..." },
    { icon: <ShieldCheck size={20} />, text: "맞춤형 리포트 생성 완료..." }
  ];

  const calculateMatches = useCallback(async (uid: string) => {
    if (isCalculating.current || hasFinished.current) return;
    isCalculating.current = true;

    try {
      setIsLoading(true);
      setError(null);

      for (let i = 0; i < loadingMessages.length; i++) {
        setLoadingStep(i);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // 1. 데이터 호출 (auction_bids 대신 bids 사용)
      const [usersRes, bidsRes, likesRes] = await Promise.all([
        supabase.from("users").select("*"),
        supabase.from("bids").select("*"),
        supabase.from("feed_likes").select("*")
      ]);

      if (usersRes.error) throw new Error("데이터를 연동할 수 없습니다.");

      const allUsers = usersRes.data || [];
      const allBids = bidsRes.data || [];
      const allLikes = likesRes.data || [];

      const me = allUsers.find(u => String(u.id) === String(uid));
      if (!me) throw new Error("회원 정보를 찾을 수 없습니다.");
      setUser(me);

      const myGender = me.gender?.trim() || "";
      const target = (myGender === "여성" || myGender === "여" || myGender === "F") ? "남성" : "여성";
      setTargetGender(target);

      const myBids = allBids.filter(b => String(b.user_id) === String(uid));
      const myLikes = allLikes.filter(l => String(l.user_id) === String(uid));

      // 2. 매칭 알고리즘 계산
      const scoredMatches = allUsers
        .filter(u => String(u.id) !== String(uid) && (u.gender?.includes(target.charAt(0)) || u.gender === target))
        .map(other => {
          let auctionScore = 0;
          const otherBids = allBids.filter(b => String(b.user_id) === String(other.id));

          if (myBids.length > 0) {
            let matchRatioSum = 0;
            let overlapCount = 0;
            myBids.forEach(myBid => {
              const partnerBid = otherBids.find(ob => ob.item_id === myBid.item_id);
              if (partnerBid) {
                const ratio = Math.min(myBid.amount, partnerBid.amount) / Math.max(myBid.amount, partnerBid.amount);
                matchRatioSum += ratio;
                overlapCount++;
              }
            });
            if (overlapCount > 0) {
              auctionScore = (matchRatioSum / overlapCount) * 70;
            }
          }

          const heartsCount = myLikes.filter(l => String(l.target_user_id) === String(other.id)).length;
          const feedScore = (Math.min(heartsCount, 3) / 3) * 30;

          const receivedLike = allLikes.some(l => String(l.user_id) === String(other.id) && String(l.target_user_id) === String(uid));
          let finalScore = auctionScore + feedScore;

          const isMutual = heartsCount > 0 && receivedLike;
          if (isMutual) finalScore *= 1.2;

          return {
            id: other.id,
            nickname: other.nickname, // 닉네임 노출
            final_score: Math.round(Math.min(finalScore, 100)),
            auctionScore: Math.round(auctionScore),
            feedScore: Math.round(feedScore),
            isMutual: isMutual
          };
        })
        .sort((a, b) => b.final_score - a.final_score)
        .slice(0, 3);

      setMatches(scoredMatches);
      hasFinished.current = true;
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setIsLoading(false);
      isCalculating.current = false;
    }
  }, []);

  useEffect(() => {
    if (params) {
      params.then((p: any) => setUserId(p.id));
    }
  }, [params]);

  usePhaseRedirect({
    currentPage: "report",
    onSettingsFetched: () => {
      if (userId && matches.length === 0 && !isCalculating.current && !hasFinished.current) {
        calculateMatches(userId);
      }
    }
  });

  if (isLoading) return <LoadingScreen step={loadingStep} messages={loadingMessages} />;

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center" style={{ backgroundColor: "#FAF9F6" }}>
      <AlertCircle style={{ color: PASTEL_THEME.darkBlue }} size={48} className="mb-6" />
      <h2 className="text-xl italic font-bold mb-6">{error}</h2>
      <button onClick={() => window.location.reload()} className="px-8 py-3 bg-[#7DD3FC] text-white rounded-full text-xs font-black uppercase tracking-widest shadow-sm">
        <RefreshCcw size={14} className="inline mr-2" /> 다시 시도
      </button>
    </div>
  );

  return (
    <div className="min-h-screen font-serif pb-24 antialiased select-none" style={{ backgroundColor: "#FAF9F6", color: PASTEL_THEME.text }}>
      <motion.header
        className="text-center pt-20 pb-12 px-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-[10px] font-sans font-black tracking-[0.4em] uppercase mb-3 text-[#7DD3FC]">Matching Report</p>
        <h1 className="text-3xl italic font-bold tracking-tight mb-2">{user?.nickname}님의 인연 리포트</h1>
        <div className="h-px w-12 mx-auto bg-[#EEEBDE] mt-6" />
      </motion.header>

      <section className="max-w-xl mx-auto px-6 space-y-12">
        <motion.div
          className="bg-white p-10 border shadow-sm relative overflow-hidden"
          style={{ borderRadius: "3rem", borderColor: "#EEEBDE" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Quote className="absolute -top-2 -left-2 opacity-5" size={100} />
          <div className="relative z-10 text-center">
            <p className="text-sm leading-[1.8] text-stone-500 font-medium break-keep">
              가치관 데이터와 시그널을 교차 분석한 결과, <br />
              가장 깊은 공명을 보인 <span className="font-bold text-[#7DD3FC]">{targetGender}</span> 세 분을 찾았습니다.
            </p>
          </div>
        </motion.div>

        <div className="space-y-8">
          <h3 className="text-[10px] font-sans font-black tracking-[0.3em] uppercase text-center italic opacity-30">Top 3 Destined Connections</h3>

          {matches.map((match, idx) => (
            <motion.div
              key={match.id}
              className="bg-white border border-[#EEEBDE] rounded-[3rem] p-8 md:p-10 shadow-sm relative overflow-hidden group"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.15 }}
            >
              {/* 순위 표시 */}
              <div className={`absolute top-0 right-0 px-8 py-3 rounded-bl-[2rem] font-sans text-[10px] font-black italic tracking-widest ${
                idx === 0 ? 'bg-[#7DD3FC] text-white' : 'bg-[#FAF9F6] text-stone-300 border-l border-b border-[#EEEBDE]'
              }`}>
                RANK {idx + 1}
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <User size={14} className="text-[#7DD3FC]" />
                      <span className="text-[10px] font-sans font-black uppercase tracking-widest opacity-30">Identity</span>
                    </div>
                    {/* 닉네임 노출 */}
                    <h4 className="text-3xl font-bold tracking-tight">{match.nickname}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-sans font-black uppercase tracking-widest opacity-30">Match Score</span>
                    <p className="text-4xl font-black italic text-[#7DD3FC]">{match.final_score}%</p>
                  </div>
                </div>

                {/* 상세 분석 지표 */}
                <div className="space-y-4 pt-6 border-t border-[#FAF9F6]">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-sans font-black uppercase tracking-widest opacity-30">
                      <span>Values Compatibility (경매)</span>
                      <span>{match.auctionScore}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#FAF9F6] rounded-full overflow-hidden border border-[#EEEBDE]/30">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: PASTEL_THEME.darkBlue }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(match.auctionScore / 70) * 100}%` }}
                        transition={{ delay: 0.6, duration: 1 }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-sans font-black uppercase tracking-widest opacity-30">
                      <span>Visual Signal (피드)</span>
                      <span>{match.feedScore}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#FAF9F6] rounded-full overflow-hidden border border-[#EEEBDE]/30">
                      <motion.div
                        className="h-full rounded-full bg-stone-300"
                        initial={{ width: 0 }}
                        animate={{ width: `${(match.feedScore / 30) * 100}%` }}
                        transition={{ delay: 0.8, duration: 1 }}
                      />
                    </div>
                  </div>
                </div>

                {/* 상호 호감 시그널 */}
                {match.isMutual && (
                  <div className="py-3 rounded-2xl flex items-center justify-center gap-2 border border-[#EEEBDE] bg-[#FAF9F6]">
                    <Heart size={12} fill="#7DD3FC" className="text-[#7DD3FC]" />
                    <span className="text-[9px] font-sans font-black uppercase tracking-widest text-[#7DD3FC]">Mutual Signal Detected</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

// 로딩 화면도 동일한 파스텔 톤으로 수정
function LoadingScreen({ step, messages }: any) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-12" style={{ backgroundColor: "#FAF9F6" }}>
      <div className="relative w-24 h-24">
        <motion.div
          className="absolute inset-0 border-2 rounded-full"
          style={{ borderColor: "#EEEBDE" }}
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
        <motion.div
          className="absolute inset-0 border-t-2 rounded-full flex items-center justify-center"
          style={{ borderColor: "#7DD3FC" }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        >
          <Sparkles className="text-[#7DD3FC]" size={32} />
        </motion.div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 text-[#7DD3FC]">
          {messages[step].icon}
          <span className="text-[10px] font-sans font-black uppercase tracking-[0.4em]">Phase {step + 1}</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.h2
            key={step}
            className="text-xl font-serif italic text-stone-600"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {messages[step].text}
          </motion.h2>
        </AnimatePresence>
      </div>
    </div>
  );
}