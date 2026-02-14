"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/lib/contexts/admin-session-context";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Heart, Volume2, Sparkles, Crown, Star,
  MessageCircle, X, CheckCircle, AlertCircle
} from "lucide-react";

const C = {
  bg: "#0F0F12",
  card: "#1C1C22",
  border: "#2A2A35",
  accent: "#A52A2A",
  text: "#E8E8ED",
  muted: "#6B6B7B",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

export default function MCPage() {
  const ctx = useAdminSession();
  const sessionId = `${ctx.sessionDate}_${ctx.sessionNum}`;

  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeResult, setFinalizeResult] = useState<{ success: boolean; message: string } | null>(null);
  const [groupedMatches, setGroupedMatches] = useState<any[]>([]);
  const [isMatchLoading, setIsMatchLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  const fetchMatches = useCallback(async () => {
    setIsMatchLoading(true);
    const { data: usersData } = await supabase.from("users").select("*");
    const usersMap = new Map((usersData || []).map((u: any) => [u.id, u]));
    const { data: matchesData } = await supabase.from("matches").select("*").order("match_rank", { ascending: true });

    if (matchesData) {
      const females = (usersData || []).filter((u: any) => ["여성", "여", "F"].includes(u.gender));
      const grouped = females.map((f: any) => {
        const matches = matchesData
          .filter((m: any) => m.user1_id === f.id)
          .map((m: any) => ({ ...m, user2: usersMap.get(m.user2_id), rank: m.match_rank }))
          .sort((a: any, b: any) => (a.rank || 0) - (b.rank || 0));
        return { user: f, matches };
      }).filter((g: any) => g.matches.length > 0);
      setGroupedMatches(grouped);
    }
    setIsMatchLoading(false);
  }, []);

  const handleFinalize = async () => {
    if (!confirm("최종 매칭을 확정하시겠습니까?\n기존 매칭 데이터를 삭제하고 새로운 결과를 생성합니다.")) return;
    setIsFinalizing(true);
    setFinalizeResult(null);
    try {
      const res = await fetch("/api/admin/finalize-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.success) {
        setFinalizeResult({ success: true, message: `매칭 완료! ${data.matches_created}개 생성.` });
        fetchMatches();
      } else {
        setFinalizeResult({ success: false, message: data.error || "매칭 오류" });
      }
    } catch (err: any) {
      setFinalizeResult({ success: false, message: err.message });
    } finally {
      setIsFinalizing(false);
    }
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return { bg: `${C.warning}20`, border: `${C.warning}60`, color: C.warning };
    if (rank === 2) return { bg: "#94A3B820", border: "#94A3B860", color: "#94A3B8" };
    if (rank === 3) return { bg: "#FB923C20", border: "#FB923C60", color: "#FB923C" };
    return { bg: "#F4374720", border: "#F4374760", color: "#F43747" };
  };

  const generateMCGuide = (female: any, male: any, score: number, rank: number) => {
    if (!male) return { intro: "", talking_points: [], icebreaker: "" };
    const level = score >= 85 ? "최고" : score >= 75 ? "높은" : score >= 65 ? "좋은" : "흥미로운";
    const icebreakers = ["첫인상이랑 실제 성격이 다른 편이에요?", "요즘 가장 관심 있는 게 뭐예요?", "주말에 주로 뭐 하면서 보내요?", "최근에 가장 행복했던 순간이 있어요?", "여행 간다면 어디로 가고 싶어요?"];
    return {
      intro: `${female.nickname}님과 ${male.nickname}님! 두 분은 ${score}%의 ${level} 호환도를 보여주셨습니다.`,
      talking_points: [
        rank === 1 ? "알고리즘이 추천한 최적의 파트너입니다!" : `${rank}순위 매칭 상대입니다.`,
        score >= 80 ? "가치관과 시각적 호감 모두 높은 편이에요!" : score >= 70 ? "가치관이 잘 맞는 것으로 분석되었어요." : "대화를 통해 서로를 더 알아가보세요!",
        ...(score >= 85 ? ["오늘 가장 기대되는 매칭 중 하나입니다!"] : []),
      ],
      icebreaker: icebreakers[Math.floor(Math.random() * icebreakers.length)],
    };
  };

  useEffect(() => {
    fetchMatches();
    const ch = supabase.channel("hub_mc_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, fetchMatches)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchMatches]);

  const matchCount = groupedMatches.reduce((acc, g) => acc + g.matches.length, 0);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <h2 className="text-2xl font-serif italic font-bold" style={{ color: C.text }}>MC Master Board</h2>

      {/* ─── 매칭 확정 ─── */}
      <section className="rounded-xl border p-6" style={{ backgroundColor: C.card, borderColor: C.border }}>
        <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.3em] mb-4" style={{ color: C.success }}>
          매칭 확정
        </h3>

        <button
          onClick={handleFinalize}
          disabled={isFinalizing}
          className="w-full py-4 rounded-lg border-2 border-dashed flex items-center justify-center gap-3 transition-all hover:opacity-80 disabled:opacity-50"
          style={{ borderColor: `${C.success}40`, color: C.success }}
        >
          {isFinalizing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          <span className="font-bold text-sm">{isFinalizing ? "Gale-Shapley 알고리즘 실행 중..." : "최종 매칭 확정"}</span>
        </button>

        {finalizeResult && (
          <div className="mt-3 p-3 rounded-lg flex items-center gap-2" style={{
            backgroundColor: finalizeResult.success ? `${C.success}10` : `${C.danger}10`,
            color: finalizeResult.success ? C.success : C.danger,
          }}>
            {finalizeResult.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            <span className="text-sm">{finalizeResult.message}</span>
          </div>
        )}
      </section>

      {/* ─── 매칭 결과 테이블 ─── */}
      <section className="rounded-xl border p-6" style={{ backgroundColor: C.card, borderColor: C.border }}>
        <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.3em] mb-4" style={{ color: C.warning }}>
          매칭 결과
        </h3>

        {isMatchLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin" style={{ color: C.accent }} size={24} /></div>
        ) : groupedMatches.length === 0 ? (
          <p className="text-center py-8 italic text-sm" style={{ color: C.muted }}>매칭 결과가 없습니다. 위 버튼으로 매칭을 먼저 생성하세요.</p>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2">
              <Heart size={16} style={{ color: C.warning }} fill={C.warning} />
              <span className="text-sm font-bold" style={{ color: C.warning }}>{groupedMatches.length} Couples</span>
              <span className="text-xs" style={{ color: C.muted }}>· 셀을 클릭하면 MC 가이드 표시</span>
            </div>

            <div className="rounded-lg border overflow-x-auto" style={{ borderColor: C.border }}>
              {/* Header */}
              <div className="grid grid-cols-5 border-b min-w-[600px]" style={{ backgroundColor: `${C.warning}10`, borderColor: C.border }}>
                <div className="p-2.5 text-center text-[10px] font-bold uppercase tracking-wider" style={{ color: C.warning }}>여성</div>
                {[1, 2, 3, 4].map((r) => (
                  <div key={r} className="p-2.5 text-center border-l flex items-center justify-center gap-1" style={{ borderColor: C.border }}>
                    {r === 1 ? <Crown size={10} style={{ color: C.warning }} /> : <Star size={10} style={{ color: C.muted }} />}
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: r === 1 ? C.warning : C.muted }}>{r}순위</span>
                  </div>
                ))}
              </div>

              {/* Body */}
              {groupedMatches.map((group: any) => (
                <div key={group.user.id} className="grid grid-cols-5 border-b last:border-b-0 min-w-[600px]" style={{ borderColor: `${C.border}60` }}>
                  <div className="p-2.5 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px]" style={{ backgroundColor: "#EC489920" }}>👩</div>
                    <div>
                      <p className="font-bold text-xs" style={{ color: C.text }}>{group.user.nickname}</p>
                      <p className="text-[9px]" style={{ color: C.muted }}>{group.matches.length}명</p>
                    </div>
                  </div>
                  {[0, 1, 2, 3].map((idx) => {
                    const match = group.matches[idx];
                    const s = getRankStyle(idx + 1);
                    return (
                      <div key={idx} className="p-1.5 border-l" style={{ borderColor: `${C.border}60` }}>
                        {match ? (
                          <button
                            onClick={() => setSelectedMatch({ female: group.user, male: match.user2, score: match.compatibility_score, rank: idx + 1 })}
                            className="w-full p-2 rounded-lg border transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
                            style={{ backgroundColor: s.bg, borderColor: s.border }}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              {idx === 0 ? <Crown size={10} style={{ color: s.color }} /> : <Star size={9} style={{ color: s.color }} />}
                              <span className="text-sm font-bold" style={{ color: s.color }}>{match.compatibility_score}%</span>
                            </div>
                            <p className="text-[10px] font-bold truncate" style={{ color: C.text }}>{match.user2?.nickname || "-"}</p>
                          </button>
                        ) : (
                          <div className="w-full p-2 rounded-lg border border-dashed text-center text-[10px]" style={{ borderColor: `${C.border}40`, color: C.muted }}>없음</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ─── MC Guide Modal ─── */}
      <AnimatePresence>
        {selectedMatch && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedMatch(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b flex items-center justify-between sticky top-0 z-10" style={{ backgroundColor: C.card, borderColor: C.border }}>
                <div className="flex items-center gap-3">
                  <MessageCircle size={20} style={{ color: C.warning }} />
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: C.warning }}>사회자 멘트 가이드</h3>
                    <p className="text-xs" style={{ color: C.muted }}>{selectedMatch.rank}순위 매칭</p>
                  </div>
                </div>
                <button onClick={() => setSelectedMatch(null)} className="p-2 rounded-full transition-all hover:opacity-70" style={{ color: C.muted }}><X size={20} /></button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 border-2" style={{ backgroundColor: "#EC489920", borderColor: "#EC489950" }}><span className="text-2xl">👩</span></div>
                    <p className="text-xl font-bold" style={{ color: C.text }}>{selectedMatch.female.nickname}</p>
                  </div>
                  <div className="text-center">
                    <Heart size={28} style={{ color: C.warning }} fill={C.warning} />
                    <p className="text-3xl font-bold mt-1" style={{ color: C.warning }}>{selectedMatch.score}%</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 border-2" style={{ backgroundColor: "#3B82F620", borderColor: "#3B82F650" }}><span className="text-2xl">👨</span></div>
                    <p className="text-xl font-bold" style={{ color: C.text }}>{selectedMatch.male?.nickname || "?"}</p>
                  </div>
                </div>

                <div className="rounded-xl p-5 border" style={{ backgroundColor: `${C.warning}10`, borderColor: `${C.warning}30` }}>
                  <div className="flex items-center gap-2 mb-3"><Volume2 size={16} style={{ color: C.warning }} /><span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.warning }}>오프닝 멘트</span></div>
                  <p className="text-xl leading-relaxed" style={{ color: C.text }}>"{generateMCGuide(selectedMatch.female, selectedMatch.male, selectedMatch.score, selectedMatch.rank).intro}"</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3"><Sparkles size={16} style={{ color: C.warning }} /><span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.warning }}>토킹 포인트</span></div>
                  {generateMCGuide(selectedMatch.female, selectedMatch.male, selectedMatch.score, selectedMatch.rank).talking_points.map((pt: string, i: number) => (
                    <div key={i} className="p-4 rounded-lg border mb-2" style={{ borderColor: C.border }}>
                      <p className="text-lg" style={{ color: C.text }}>{pt}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl p-5 border" style={{ backgroundColor: "#3B82F610", borderColor: "#3B82F630" }}>
                  <div className="flex items-center gap-2 mb-3"><MessageCircle size={16} style={{ color: "#60A5FA" }} /><span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#60A5FA" }}>추천 첫 대화</span></div>
                  <p className="text-lg" style={{ color: C.text }}>"{generateMCGuide(selectedMatch.female, selectedMatch.male, selectedMatch.score, selectedMatch.rank).icebreaker}"</p>
                </div>

                <button onClick={() => setSelectedMatch(null)} className="w-full py-3 rounded-lg font-bold text-sm" style={{ backgroundColor: C.warning, color: "#000" }}>확인</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
