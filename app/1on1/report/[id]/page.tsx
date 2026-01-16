"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePhaseRedirect } from "@/lib/hooks/usePhaseRedirect";
import { MatchingCard } from "../../_components/MatchingCard";

export default function UserReportPage({ params }: { params: any }) {
  const [user, setUser] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [targetGender, setTargetGender] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch match data
  const fetchMatchData = useCallback(async (uid: string, sessionId: string) => {
    // Get user info
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", uid)
      .single();

    if (userData) {
      setUser(userData);
      const myGender = userData.gender?.trim() || "";
      const target = (myGender === "여성" || myGender === "여") ? "남성" : "여성";
      setTargetGender(target);

      // Get pre-calculated matches from RPC
      const { data: matchData } = await supabase
        .from("matches")
        .select(`
          match_rank,
          final_score,
          auction_similarity,
          feed_score,
          matched_user:matched_user_id (
            id,
            nickname,
            real_name,
            gender
          )
        `)
        .eq("user_id", uid)
        .eq("session_id", sessionId)
        .order("match_rank", { ascending: true })
        .limit(3);

      // Transform data
      const formattedMatches = matchData?.map(m => ({
        ...m.matched_user,
        final_score: m.final_score,
        auction_similarity: m.auction_similarity,
        feed_score: m.feed_score
      })) || [];

      setMatches(formattedMatches);
    }

    setIsLoading(false);
  }, []);

  // Use unified phase redirect hook
  usePhaseRedirect({
    currentPage: "report",
    onSettingsFetched: (settings) => {
      // Settings valid and on report page - load match data
      if (userId) {
        const session = String(settings.current_session) || "01";
        fetchMatchData(userId, session);
      }
    }
  });

  // Resolve params and set userId
  useEffect(() => {
    params.then((p: any) => {
      setUserId(p.id);
    });
  }, [params]);

  // Fetch data when userId is set
  useEffect(() => {
    if (userId) {
      // Fetch initial settings and match data
      const loadData = async () => {
        const { data: settings } = await supabase
          .from("system_settings")
          .select("key, value");

        const sessionSetting = settings?.find(s => s.key === "current_session");
        const session = String(sessionSetting?.value) || "01";

        fetchMatchData(userId, session);
      };

      loadData();
    }
  }, [userId, fetchMatchData]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center font-serif italic text-gray-400 animate-pulse">
        Analyzing your soul...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-serif p-6 pb-20 antialiased">
      <header className="text-center mb-10 pt-10">
        <p className="text-[10px] font-sans font-black tracking-[0.4em] text-[#A52A2A] uppercase mb-2">Soul Report</p>
        <h1 className="text-3xl italic tracking-tighter leading-tight">{user.nickname} 님의 영혼의 빛깔</h1>
      </header>

      <section className="max-w-xl mx-auto space-y-8">
        <div className="bg-white p-10 rounded-[3.5rem] border border-[#EEEBDE] shadow-[0_40px_100px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 font-sans font-black text-6xl italic">98%</div>
          <p className="text-sm leading-[1.8] text-gray-500 font-light break-keep text-center">
            "{user.nickname} 님은 따뜻한 온기를 가진 분이시군요. <br/>
            가장 결이 잘 맞는 <span className="text-[#A52A2A] font-bold underline">{targetGender}</span> 인연들을 찾아보았습니다."
          </p>
        </div>

        <div className="space-y-4 mt-10">
          <h3 className="text-[10px] font-sans font-black tracking-[0.3em] text-gray-300 uppercase text-center mb-6 italic">Destined Connections</h3>
          {matches.length > 0 ? (
            matches.map((match, idx) => (
              <MatchingCard
                key={match.id}
                index={idx + 1}
                nickname={match.nickname}
                matchType={`${targetGender} 매칭`}
                finalScore={match.final_score}
              />
            ))
          ) : (
            <div className="py-20 text-center border border-dashed border-[#EEEBDE] rounded-[2.5rem]">
              <p className="text-sm text-gray-400 italic px-10">아직 매칭 가능한 {targetGender} 유저가 없습니다.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
