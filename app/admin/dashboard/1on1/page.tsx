"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Heart, ChevronLeft, Sparkles, Loader2, UserCheck, Flame } from "lucide-react";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

const { colors, borderRadius, transitions } = DESIGN_TOKENS;

interface MatchResult {
  id: string;
  user1_nickname: string;
  user2_nickname: string;
  user1_gender: string;
  user2_gender: string;
  compatibility_score: number;
  created_at: string;
}

export default function AdminOneOnOnePage() {
  const router = useRouter();
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMatchResults = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("matches")
        .select(`
          id,
          compatibility_score,
          created_at,
          user1:users!user1_id(nickname, gender),
          user2:users!user2_id(nickname, gender)
        `)
        .order('compatibility_score', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatted = data.map((m: any) => ({
          id: m.id,
          user1_nickname: m.user1?.nickname || "알 수 없음",
          user2_nickname: m.user2?.nickname || "알 수 없음",
          user1_gender: m.user1?.gender || "",
          user2_gender: m.user2?.gender || "",
          compatibility_score: m.compatibility_score,
          created_at: m.created_at
        }));
        setMatchResults(formatted);
      }
    } catch (err) {
      console.error("Match Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatchResults();

    const channel = supabase
      .channel("admin_1on1_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        fetchMatchResults();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMatchResults]);

  if (isLoading) {
    return (
      <main className="h-screen w-full flex items-center justify-center" style={{ backgroundColor: "#050505" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring" }}
        >
          <Loader2 className="text-pink-500 animate-spin" size={40} />
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full antialiased font-sans pb-20" style={{ backgroundColor: "#050505", color: "#E0E0E0" }}>

      {/* Navigation */}
      <motion.nav
        className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center shadow-2xl"
        style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => router.push("/admin")}
          whileHover={{ x: -3 }}
        >
          <ChevronLeft size={20} className="text-white/30 group-hover:text-white transition-colors" />
          <h1 className="text-sm font-black uppercase tracking-[0.3em] text-white">1:1 Matching Report</h1>
        </motion.div>
        <div className="flex items-center gap-2 bg-pink-500/10 px-3 py-1.5 rounded-full border border-pink-500/20">
          <Flame size={14} className="text-pink-500 animate-pulse" />
          <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Live Results</span>
        </div>
      </motion.nav>

      <div className="max-w-5xl mx-auto px-6 pt-10">

        {/* Header Section */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <motion.div
            className="inline-block p-3 bg-pink-500/10 rounded-2xl mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <Sparkles className="text-pink-500" size={32} />
          </motion.div>
          <h2 className="text-3xl font-black text-white mb-2">Final Couples</h2>
          <p className="text-white/40 text-sm uppercase tracking-widest font-bold">Total {matchResults.length} Couples Matched</p>
        </motion.div>

        {/* Match List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matchResults.map((match, idx) => (
            <motion.div
              key={match.id}
              className="relative overflow-hidden border border-white/10 p-8 hover:border-pink-500/40 transition-all group"
              style={{
                background: "linear-gradient(to bottom, rgba(255,255,255,0.05), transparent)",
                borderRadius: "2.5rem"
              }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + idx * 0.08, duration: 0.5 }}
              whileHover={{ y: -4 }}
            >
              {/* Rank Badge */}
              <div className="absolute top-0 right-0 bg-pink-500/10 px-5 py-2 rounded-bl-3xl border-b border-l border-white/5">
                <span className="text-[10px] font-black text-pink-500 italic">TOP {idx + 1}</span>
              </div>

              <div className="flex items-center justify-between gap-4 mb-8">
                {/* User 1 */}
                <div className="flex flex-col items-center flex-1">
                  <motion.div
                    className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-3 border border-white/10 group-hover:border-pink-500/30 transition-colors"
                    whileHover={{ scale: 1.1 }}
                  >
                    <span className="text-xs font-black text-white/40 uppercase">{match.user1_gender.substring(0, 1)}</span>
                  </motion.div>
                  <p className="text-lg font-black text-white">{match.user1_nickname}</p>
                </div>

                {/* Heart Icon */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      <Heart size={32} fill="#ec4899" className="text-pink-500 relative z-10" />
                    </motion.div>
                    <div className="absolute inset-0 bg-pink-500 blur-xl opacity-20 animate-pulse" />
                  </div>
                </div>

                {/* User 2 */}
                <div className="flex flex-col items-center flex-1">
                  <motion.div
                    className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-3 border border-white/10 group-hover:border-pink-500/30 transition-colors"
                    whileHover={{ scale: 1.1 }}
                  >
                    <span className="text-xs font-black text-white/40 uppercase">{match.user2_gender.substring(0, 1)}</span>
                  </motion.div>
                  <p className="text-lg font-black text-white">{match.user2_nickname}</p>
                </div>
              </div>

              {/* Progress & Score */}
              <div className="space-y-3">
                <div className="flex justify-between items-end px-1">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Compatibility</span>
                  <span className="text-2xl font-black text-pink-500 italic">{match.compatibility_score}%</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                  <motion.div
                    className="h-full shadow-[0_0_15px_rgba(236,72,153,0.5)]"
                    style={{ background: "linear-gradient(to right, #db2777, #fb7185)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${match.compatibility_score}%` }}
                    transition={{ delay: 0.3 + idx * 0.1, duration: 0.8, ease: transitions.default.ease }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {!isLoading && matchResults.length === 0 && (
          <motion.div
            className="text-center py-40 border-2 border-dashed border-white/5"
            style={{ borderRadius: borderRadius.onboarding }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <UserCheck size={48} className="mx-auto text-white/10 mb-6" />
            <p className="text-white/20 font-black uppercase tracking-[0.3em]">No Matches Finalized Yet</p>
          </motion.div>
        )}

      </div>
    </main>
  );
}
