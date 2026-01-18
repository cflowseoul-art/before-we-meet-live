"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Heart, ChevronLeft, Trophy, Loader2, Users, Settings, AlertCircle } from "lucide-react";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

const { colors } = DESIGN_TOKENS;

const PASTEL_THEME = {
  blue: "#E0F2FE",      
  darkBlue: "#7DD3FC",  
  softBeige: "#F5F5F4", 
  border: "#EEEBDE",    
  text: "#44403C"       
};

interface MatchResult {
  id: string;
  user1_nickname: string;
  user1_name: string;
  user1_suffix: string;
  user2_nickname: string;
  user2_name: string;
  user2_suffix: string;
  user1_gender: string;
  user2_gender: string;
  compatibility_score: number;
  created_at: string;
}

export default function Admin1on1Dashboard() {
  const router = useRouter();
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchMatchResults = useCallback(async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      
      // matches 테이블 데이터 가져오기 (에러 방지를 위해 order 제거 후 수동 정렬 가능)
      const [matchesRes, usersRes] = await Promise.all([
        supabase.from("matches").select("*"),
        supabase.from("users").select("id, nickname, real_name, phone_suffix, gender")
      ]);

      if (matchesRes.error) {
        console.error("Matches Table Error:", matchesRes.error.message);
        if (matchesRes.error.message.includes("compatibility_score")) {
          throw new Error("DB에 'compatibility_score' 컬럼이 없습니다. SQL Editor에서 테이블 스키마를 확인해주세요.");
        }
        throw matchesRes.error;
      }
      
      if (usersRes.error) throw usersRes.error;

      const allMatches = matchesRes.data || [];
      const allUsers = usersRes.data || [];

      const formatted = allMatches.map((m: any) => {
        const u1 = allUsers.find(u => u.id === m.user1_id);
        const u2 = allUsers.find(u => u.id === m.user2_id);

        return {
          id: m.id,
          user1_nickname: u1?.nickname || "알 수 없음",
          user1_name: u1?.real_name || "미입력",
          user1_suffix: u1?.phone_suffix || "0000",
          user2_nickname: u2?.nickname || "알 수 없음",
          user2_name: u2?.real_name || "미입력",
          user2_suffix: u2?.phone_suffix || "0000",
          user1_gender: u1?.gender || "",
          user2_gender: u2?.gender || "",
          compatibility_score: m.compatibility_score || 0,
          created_at: m.created_at
        };
      }).sort((a, b) => b.compatibility_score - a.compatibility_score); // 수동 정렬

      setMatchResults(formatted);
    } catch (err: any) {
      setFetchError(err.message || "데이터를 불러오는 중 에러가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatchResults();
    const channel = supabase
      .channel("admin_1on1_dashboard_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        fetchMatchResults();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchMatchResults]);

  if (isLoading) {
    return (
      <main className="h-screen w-full bg-[#FAF9F6] flex items-center justify-center">
        <Loader2 className="text-[#7DD3FC] animate-spin" size={40} />
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-[#FAF9F6] text-[#44403C] antialiased flex flex-col font-serif pb-20 overflow-x-hidden">
      <nav className="h-[70px] border-b border-[#EEEBDE] px-6 md:px-10 flex justify-between items-center bg-white sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => router.push("/admin")}>
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <h1 className="text-xl italic font-black">Matching Result</h1>
          </div>
          <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-[0.4em] text-[#7DD3FC] bg-[#E0F2FE] px-3 py-1 rounded-full border border-[#7DD3FC]/20">Admin View</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-[#EEEBDE] px-4 py-2 rounded-full shadow-sm mr-2">
            <Users size={14} className="text-[#7DD3FC]" />
            <span className="text-[10px] font-black uppercase font-sans tracking-widest">{matchResults.length} Matched</span>
          </div>
          <button onClick={() => router.push("/admin/settings")} className="p-2.5 rounded-full border border-[#EEEBDE] hover:bg-[#F0EDE4] transition-all"><Settings size={18} /></button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto w-full px-6 pt-12">
        <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <motion.div className="inline-block p-4 bg-white border border-[#EEEBDE] rounded-[2rem] mb-6 shadow-sm">
            <Trophy className="text-[#B19470]" size={32} />
          </motion.div>
          <h2 className="text-4xl font-bold italic mb-4">Final Couples</h2>
          <p className="text-[10px] font-sans font-black uppercase tracking-[0.4em] opacity-40">최종 매칭된 인원들의 상세 정보 리스트입니다</p>
        </motion.div>

        {fetchError ? (
          <div className="bg-red-50 border border-red-100 p-10 rounded-[3rem] text-center max-w-2xl mx-auto">
            <AlertCircle className="mx-auto text-red-400 mb-4" size={40} />
            <p className="text-red-800 font-medium mb-4">{fetchError}</p>
            <button onClick={fetchMatchResults} className="px-8 py-3 bg-white border border-red-200 rounded-full text-xs font-bold text-red-600 hover:bg-red-50 transition-colors">다시 시도</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            <AnimatePresence mode="popLayout">
              {matchResults.map((match, idx) => (
                <motion.div
                  key={match.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-[#EEEBDE] rounded-[3rem] p-8 md:p-10 shadow-sm relative overflow-hidden group hover:shadow-md transition-all"
                >
                  <div className={`absolute top-0 right-0 px-8 py-3 rounded-bl-[2rem] font-sans text-[10px] font-black italic tracking-widest ${
                    idx === 0 ? 'bg-[#7DD3FC] text-white' : 'bg-[#FAF9F6] text-stone-300 border-l border-b border-[#EEEBDE]'
                  }`}>
                    RANK {idx + 1}
                  </div>

                  <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                    {/* User 1 */}
                    <div className="flex-1 flex flex-col items-center md:items-end text-center md:text-right">
                      <div className="flex items-center gap-2 mb-1 justify-center md:justify-end">
                        <span className="text-[10px] font-sans font-black px-2 py-0.5 rounded bg-stone-100 text-stone-400">NICKNAME</span>
                        <h4 className="text-xl font-bold">{match.user1_nickname}</h4>
                      </div>
                      <div className="flex items-center gap-2 justify-center md:justify-end">
                        <p className="text-2xl font-black italic text-[#44403C]">{match.user1_name}</p>
                        <p className="text-[11px] font-sans font-black opacity-20 tracking-widest">({match.user1_suffix})</p>
                      </div>
                    </div>

                    {/* Score Divider */}
                    <div className="relative flex flex-col items-center px-4">
                      <motion.div 
                        className="relative z-10 w-16 h-16 bg-white border border-[#EEEBDE] rounded-full flex items-center justify-center shadow-sm"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        <Heart size={24} fill="#7DD3FC" className="text-[#7DD3FC]" />
                      </motion.div>
                      <p className="mt-4 text-3xl font-black italic text-[#7DD3FC]">{match.compatibility_score}%</p>
                    </div>

                    {/* User 2 */}
                    <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
                      <div className="flex items-center gap-2 mb-1 justify-center md:justify-start">
                        <h4 className="text-xl font-bold">{match.user2_nickname}</h4>
                        <span className="text-[10px] font-sans font-black px-2 py-0.5 rounded bg-stone-100 text-stone-400">NICKNAME</span>
                      </div>
                      <div className="flex items-center gap-2 justify-center md:justify-start">
                        <p className="text-2xl font-black italic text-[#44403C]">{match.user2_name}</p>
                        <p className="text-[11px] font-sans font-black opacity-20 tracking-widest">({match.user2_suffix})</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-10 w-full bg-[#FAF9F6] h-1.5 rounded-full overflow-hidden border border-[#EEEBDE]/50">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: PASTEL_THEME.darkBlue }}
                      initial={{ width: 0 }}
                      animate={{ width: `${match.compatibility_score}%` }}
                      transition={{ delay: 0.5, duration: 1 }}
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {matchResults.length === 0 && (
              <div className="text-center py-20 opacity-30 italic">표시할 매칭 데이터가 없습니다.</div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}