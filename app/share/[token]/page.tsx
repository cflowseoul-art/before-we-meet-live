"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Zap, Brain, Users, Radio, Loader2,
  Heart, Crown, AlertCircle, MoreHorizontal, MessageCircle, Send, Bookmark
} from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

const TOTAL_SLIDES = 6;

const VIBE_INFO: Record<string, { emoji: string; label: string }> = {
  "spark": { emoji: "\u{1F525}", label: "불꽃이 튀었어요" },
  "calm": { emoji: "\u{1F60A}", label: "편안하고 좋았어요" },
  "cold": { emoji: "\u{1F9CA}", label: "아쉬웠어요" },
};

interface ShareData {
  user: { nickname: string; real_name: string };
  topValues: { itemName: string; keyword: string; amount: number }[];
  aura: { aura: string; description: string; gradient: string } | null;
  totalSpent: number;
  rareValues: { keyword: string; fullName: string; myAmount: number; bidderCount: number; totalUsers: number }[];
  feedbacks: { vibe: string; charms: string[]; round: number }[];
  charmRanking: { charm: string; count: number }[];
  vibeBreakdown: { vibe: string; count: number }[];
  selfIdentity: string;
  perceivedCharm: string;
  isParadoxFound: boolean;
  isPardoxFound?: boolean;
  likedUserValues: { keyword: string; count: number }[];
  totalLikes: number;
}

export default function SharePage({ params }: { params: any }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ShareData | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (params) {
      params.then((p: any) => setToken(p.token));
    }
  }, [params]);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/share/${token}`);
        const json = await res.json();
        if (!json.success) {
          setError(json.error || "리포트를 불러올 수 없습니다.");
          return;
        }
        setData(json.snapshot_data);
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <Loader2 className="text-indigo-400 animate-spin" size={40} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="text-indigo-400 mb-6" size={48} />
        <h2 className="text-xl italic font-bold mb-3">{error || "리포트를 찾을 수 없습니다"}</h2>
        <p className="text-sm text-gray-400">링크가 만료되었거나 유효하지 않습니다.</p>
      </div>
    );
  }

  const d = data;
  const isParadox = d.isParadoxFound ?? d.isPardoxFound ?? false;

  const captions: string[] = [
    d.aura
      ? `✨ The Aura Card\n\n나의 아우라는 "${d.aura.aura}"\n${d.aura.description}\n\n오늘 경매에서 가장 많이 투자한 가치관이\n나만의 아우라를 만들어냈어요 🌙\n\n#시그니처 #아우라 #BeforeWeMeet`
      : `✨ The Aura Card\n\n당신만의 시그니처 아우라를 확인하세요 🌙\n\n#시그니처 #아우라 #BeforeWeMeet`,
    d.rareValues?.[0]
      ? `🔥 The Lone Pioneer\n\n"${d.rareValues[0].keyword}"\n전체 ${d.rareValues[0].totalUsers}명 중 ${d.rareValues[0].bidderCount}명만 선택한\n나만의 가치관 💎\n\n다수가 아닌, 나만의 신념을 따르는 사람.\n그게 바로 개척자의 자격이에요.\n\n#희소가치 #개척자 #나다움`
      : `🔥 The Lone Pioneer\n\n절대 포기할 수 없는 나만의 가치관 💎\n\n#희소가치 #개척자`,
    d.charmRanking?.[0]
      ? `💬 The Feedback\n\n대화 상대 ${d.feedbacks?.length || 0}명이 남긴 나의 온도 🌡️\n\n가장 많이 들은 매력 키워드\n👉 "${d.charmRanking[0].charm}"\n\n내가 모르던 나를, 오늘 처음 만난 사람들이\n알려주었네요 🫧\n\n#인연의잔상 #첫인상 #매력키워드`
      : `💬 The Feedback\n\n대화 상대가 남긴 나의 온도 🌡️\n\n#인연의잔상 #첫인상`,
    d.selfIdentity
      ? `🪞 Persona Paradox\n\n내가 표현한 나 → "${d.selfIdentity}"\n상대가 느낀 나 → "${d.perceivedCharm}"\n\n${isParadox ? "의외의 반전이 발견되었어요 ⚡\n나도 몰랐던 매력이 대화 속에서\n자연스럽게 드러난 순간." : "내면과 외면이 하나로 통하는 사람 🤝\n꾸미지 않아도 전해지는 진정성,\n그게 가장 오래 남는 매력이에요."}\n\n#반전매력 #페르소나 #자아발견`
      : `🪞 Persona Paradox\n\n의도와 인상 사이,\n반전 매력의 증명 ⚡\n\n#반전매력 #페르소나`,
    d.likedUserValues?.[0]
      ? `💘 Subconscious Frequency\n\n피드에서 하트를 보낸 ${d.totalLikes}번의 선택을\n분석해 봤어요 🔍\n\n나의 본능이 가장 끌린 키워드\n👉 "${d.likedUserValues[0].keyword}"\n\n머리가 아닌 심장이 먼저 반응한 가치.\n그게 진짜 내 이상형의 단서일지도 🧭\n\n#무의식 #이상형분석 #본능의선택`
      : `💘 Subconscious Frequency\n\n나의 본능이 향한 이상형 분석 🧭\n\n#무의식 #이상형분석`,
    `🕊️ The Closing\n\n오늘 짧은 시간 동안 보여준\n반짝이는 조각들을 모아,\n당신만의 이야기를 적어보았어요 ✏️\n\n'나한테 이런 모습이 있었나?' 싶은\n낯선 발견이 있었나요?\n\n아니면 역시나 싶은 다정한 나를\n다시 한번 확인하셨나요? 🌿\n\n처음 보는 사람들과 낯선 공간에서 보낸 오늘이,\n부디 마음 한구석에 예쁜 색깔로\n칠해졌길 바라요 🎨\n\n#BeforeWeMeetLive #시그니처리포트`,
  ];

  return (
    <div className="min-h-dvh font-sans select-none bg-[#e8f4f8]">
      <style>{`
        .ig-swiper .swiper-pagination { position: static; margin-top: 12px; }
        .ig-swiper .swiper-pagination-bullet { width: 6px; height: 6px; background: #c7c7cc; opacity: 1; }
        .ig-swiper .swiper-pagination-bullet-active { background: #3897f0; }
      `}</style>

      <div className="flex items-start justify-center py-0 sm:py-6 px-0 sm:px-4">
        <div className="w-full max-w-[450px] bg-white rounded-none sm:rounded-sm overflow-hidden shadow-sm">

          {/* Instagram Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                    <Sparkles size={14} className="text-white" />
                  </div>
                </div>
              </div>
              <div className="leading-tight">
                <p className="text-[13px] font-semibold text-gray-900">
                  {d.user?.nickname || "User"}
                </p>
                <p className="text-[11px] text-gray-400">Before We Meet Live</p>
              </div>
            </div>
            <button className="p-1 text-gray-900">
              <MoreHorizontal size={20} />
            </button>
          </div>

          {/* Swiper (1:1 Square) */}
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
                  <h2 className="text-xl italic font-bold tracking-tight text-white mb-3">{d.user?.nickname}님의 시그니처</h2>

                  {d.aura && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                      className={`bg-gradient-to-r ${d.aura.gradient} rounded-2xl p-4 text-center shadow-lg w-full max-w-[280px] mt-2`}
                    >
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/70 mb-1">Your Aura</p>
                      <h4 className="text-lg font-black text-white mb-1">{d.aura.aura}</h4>
                      <p className="text-[11px] text-white/80 leading-relaxed break-keep">{d.aura.description}</p>
                    </motion.div>
                  )}

                  {d.topValues && d.topValues.length > 0 && (
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
                    {d.rareValues.length > 0 ? (
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
                    {d.feedbacks.length > 0 ? (
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
                            <p className="text-[11px] text-gray-700 leading-relaxed break-keep">이 공간에서 당신은 누군가의 심장을 뛰게 했어요.</p>
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
                    {d.selfIdentity && d.perceivedCharm ? (
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
                        <div className={`rounded-xl p-3 text-center ${isParadox ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200' : 'bg-gray-50 border border-gray-100'}`}>
                          {isParadox ? (
                            <>
                              <Sparkles size={14} className="text-indigo-500 mx-auto mb-1.5" />
                              <p className="text-[11px] font-bold text-indigo-700 mb-1.5">반전 매력 발견!</p>
                              <p className="text-[10px] text-gray-600 leading-relaxed break-keep">
                                스스로 의식하지 못한 매력이 대화 속에서 자연스럽게 드러난 거예요.
                                이 의외의 갭이야말로 사람을 끌어당기는 가장 강력한 무기입니다.
                              </p>
                            </>
                          ) : (
                            <>
                              <Heart size={14} className="text-gray-400 mx-auto mb-1.5" />
                              <p className="text-[11px] font-bold text-gray-700 mb-1.5">흔들리지 않는 매력</p>
                              <p className="text-[10px] text-gray-600 leading-relaxed break-keep">
                                꾸미지 않아도 자연스럽게 전해지는 진정성 —
                                그게 가장 오래 기억에 남는 매력이에요.
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-6">
                        {!d.selfIdentity ? "경매 데이터가 필요합니다" : "피드백 데이터가 필요합니다"}
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
                    {d.likedUserValues.length > 0 ? (
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
                    &apos;나한테 이런 모습이 있었나?&apos; 싶은 낯선 발견이 있었나요? <br /> 아니면 역시나 싶은 다정한 나를 다시 한번 확인하셨나요?
                  </p>
                  <p className="text-[13px] text-amber-100/70 leading-loose break-keep text-center">
                    처음 보는 사람들과 낯선 공간에서 보낸 오늘이,<br /> 부디 당신의 마음 한구석에 예쁜 색깔로 칠해졌길 바라요.
                  </p>
                  <p className="text-[10px] text-amber-200/30 mt-6">Before We Meet</p>
                </div>
              </SwiperSlide>
            </Swiper>
          </div>

          {/* Instagram Interaction Icons */}
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsLiked(!isLiked)} className="p-0.5">
                <Heart size={24} className={isLiked ? "text-red-500 fill-red-500" : "text-gray-900"} strokeWidth={1.5} />
              </button>
              <button className="p-0.5 text-gray-900">
                <MessageCircle size={24} strokeWidth={1.5} />
              </button>
              <button className="p-0.5 text-gray-900">
                <Send size={24} strokeWidth={1.5} />
              </button>
            </div>
            <button className="p-0.5 text-gray-900">
              <Bookmark size={24} strokeWidth={1.5} />
            </button>
          </div>

          {/* Instagram Caption */}
          <div className="px-3.5 pb-6 pt-1">
            <div className="max-h-[40dvh] sm:max-h-[200px] overflow-y-auto">
              <p className="text-[13px] text-gray-900 leading-[1.7]">
                <span className="font-semibold">{d.user?.nickname || "user"}</span>{" "}
                <span className="text-gray-700 whitespace-pre-line">{captions[activeSlide]}</span>
              </p>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">{activeSlide + 1} / {TOTAL_SLIDES}</p>
          </div>

        </div>
      </div>
    </div>
  );
}
