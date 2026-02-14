"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/lib/contexts/admin-session-context";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Loader2, Play, RotateCcw, Heart, Trophy, Users, StopCircle, FileText
} from "lucide-react";
import { parseDriveFileName } from "@/lib/utils/feed-parser";

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

// Value badge mapping
const VALUE_BADGE: Record<string, { keyword: string; opposite: string }> = {
  "원하는 것을 살 수 있는 풍요": { keyword: "풍요", opposite: "사랑" },
  "사랑하는 사람과 함께하는 시간": { keyword: "사랑", opposite: "풍요" },
  "지금 당장 누리는 확실한 행복": { keyword: "지금", opposite: "미래" },
  "더 큰 미래를 위한 인내": { keyword: "미래", opposite: "지금" },
  "안정적이고 평온한 일상": { keyword: "안정", opposite: "도전" },
  "새로운 경험과 짜릿한 도전": { keyword: "도전", opposite: "안정" },
  "모두에게 인정받는 성공": { keyword: "성공", opposite: "여유" },
  "나만의 속도로 걷는 여유": { keyword: "여유", opposite: "성공" },
  "냉철하고 합리적인 판단": { keyword: "이성", opposite: "공감" },
  "깊이 공감하는 따뜻한 마음": { keyword: "공감", opposite: "이성" },
  "눈에 보이는 압도적 성과": { keyword: "성과", opposite: "과정" },
  "함께 걷는 과정의 유대감": { keyword: "과정", opposite: "성과" },
  "누구와도 차별화된 나만의 개성": { keyword: "개성", opposite: "소속" },
  "모두와 어우러지는 소속감": { keyword: "소속", opposite: "개성" },
  "오롯이 나에게 집중하는 자유": { keyword: "자유", opposite: "헌신" },
  "소중한 사람을 위한 헌신": { keyword: "헌신", opposite: "자유" },
};

type Tab = "auction" | "feed";

export default function MatchingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("auction");

  const tabs: { id: Tab; label: string }[] = [
    { id: "auction", label: "옥션 현황" },
    { id: "feed", label: "피드 현황" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h2 className="text-2xl font-serif italic font-bold mb-6" style={{ color: C.text }}>매칭 엔진</h2>

      {/* Tab Bar */}
      <div className="flex border-b mb-6" style={{ borderColor: C.border }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-5 py-3 text-sm font-sans font-bold transition-all border-b-2"
            style={{
              borderColor: activeTab === tab.id ? C.accent : "transparent",
              color: activeTab === tab.id ? C.accent : C.muted,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "auction" && <AuctionTab onComplete={() => setActiveTab("feed")} />}
      {activeTab === "feed" && <FeedTab />}
    </div>
  );
}

/* ─── AUCTION TAB ─── */
function AuctionTab({ onComplete }: { onComplete: () => void }) {
  const ctx = useAdminSession();
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [isEnding, setIsEnding] = useState(false);

  const sessionId = `${ctx.sessionDate}_${ctx.sessionNum}`;

  const fetchLive = useCallback(async () => {
    const [iRes, uRes, bRes] = await Promise.all([
      supabase.from("auction_items").select("id, title, status, current_bid, highest_bidder_id").order("id"),
      supabase.from("users").select("id, nickname, gender, balance").eq("session_id", sessionId),
      supabase.from("bids").select("id, user_id, auction_item_id, amount, created_at").eq("session_id", sessionId).order("created_at", { ascending: false }).limit(20),
    ]);
    if (iRes.data) {
      const sorted = [...iRes.data].sort((a, b) => {
        const o: Record<string, number> = { active: 0, pending: 1, finished: 2 };
        return (o[a.status] ?? 3) - (o[b.status] ?? 3);
      });
      setItems(sorted);
    }
    if (uRes.data && iRes.data) {
      const ranked = uRes.data.map((u) => ({
        ...u,
        wonItems: iRes.data!.filter((i) => i.status === "finished" && i.highest_bidder_id === u.id),
        leadingItems: iRes.data!.filter((i) => i.status === "active" && i.highest_bidder_id === u.id),
      })).sort((a, b) => (b.wonItems.length + b.leadingItems.length) - (a.wonItems.length + a.leadingItems.length));
      setUsers(ranked);
    }
    if (bRes.data) setBids(bRes.data);
  }, [sessionId]);

  const handleStartAuction = async (itemId: number) => {
    const currentActive = items.find((i) => i.status === "active");
    if (currentActive && currentActive.id !== itemId) {
      await supabase.from("auction_items").update({ status: "finished" }).eq("id", currentActive.id);
    }
    await supabase.from("auction_items").update({ status: "active" }).eq("id", itemId);
    fetchLive();
  };

  const handleFinishAuction = async (itemId: number) => {
    await supabase.from("auction_items").update({ status: "finished" }).eq("id", itemId);
    fetchLive();
  };

  const handleRevertToPending = async (itemId: number) => {
    await supabase.from("auction_items").update({ status: "pending" }).eq("id", itemId);
    fetchLive();
  };

  useEffect(() => {
    fetchLive();
    const channel = supabase.channel("hub_auction_dash").on("postgres_changes", { event: "*", schema: "public" }, fetchLive).subscribe();
    const poll = setInterval(fetchLive, 2000);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [fetchLive]);

  const activeItem = items.find((i) => i.status === "active");
  const pendingItems = items.filter((i) => i.status === "pending");
  const finishedItems = items.filter((i) => i.status === "finished");

  const handleEndAuction = async () => {
    if (!confirm("옥션을 종료하고 피드 단계로 전환하시겠습니까?")) return;
    setIsEnding(true);
    const ok = await ctx.changePhase("feed");
    setIsEnding(false);
    if (ok) onComplete();
  };

  return (
    <div className="space-y-6">
      {/* 옥션 종료 */}
      <div className="rounded-xl border p-4 flex items-center justify-between" style={{ backgroundColor: C.card, borderColor: C.border }}>
        <div>
          <h4 className="text-sm font-bold" style={{ color: C.text }}>옥션 종료</h4>
          <p className="text-xs" style={{ color: C.muted }}>옥션을 마감하고 피드 단계로 전환합니다</p>
        </div>
        <button
          onClick={handleEndAuction}
          disabled={isEnding || ctx.phase !== "auction"}
          className="px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all hover:opacity-80 disabled:opacity-40"
          style={{ backgroundColor: C.danger, color: "#fff" }}
        >
          {isEnding ? <Loader2 size={14} className="animate-spin" /> : <StopCircle size={14} />}
          {isEnding ? "전환 중..." : "옥션 종료 → 피드"}
        </button>
      </div>

      {/* Active Now + Inventory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active */}
        <div className="rounded-xl border p-5" style={{ backgroundColor: C.card, borderColor: C.border }}>
          <h4 className="text-[10px] font-sans font-bold uppercase tracking-[0.3em] mb-3" style={{ color: C.success }}>Active Now</h4>
          {activeItem ? (
            <div className="space-y-2">
              {VALUE_BADGE[activeItem.title] && (
                <div className="flex gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${C.accent}20`, color: C.accent }}>
                    {VALUE_BADGE[activeItem.title].keyword}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: C.muted }}>
                    ↔ {VALUE_BADGE[activeItem.title].opposite}
                  </span>
                </div>
              )}
              <h3 className="text-lg font-serif italic font-bold" style={{ color: C.text }}>{activeItem.title}</h3>
              <p className="text-2xl font-bold" style={{ color: C.text }}>
                {activeItem.current_bid?.toLocaleString()}<span className="text-xs ml-0.5" style={{ color: C.muted }}>만</span>
              </p>
              <button onClick={() => handleFinishAuction(activeItem.id)} className="px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: C.success, color: "#fff" }}>Finish</button>
            </div>
          ) : (
            <p className="text-center py-8 italic" style={{ color: C.muted }}>Stage Empty</p>
          )}
        </div>

        {/* Inventory */}
        <div className="rounded-xl border p-4 max-h-[400px] overflow-y-auto" style={{ backgroundColor: C.card, borderColor: C.border }}>
          <h4 className="text-[10px] font-sans font-bold uppercase tracking-[0.3em] mb-3" style={{ color: C.muted }}>Inventory</h4>
          <div className="space-y-1.5">
            {pendingItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg border" style={{ borderColor: C.border }}>
                <span className="text-sm font-serif italic truncate flex-1 pr-2" style={{ color: C.text }}>{item.title}</span>
                <button onClick={() => handleStartAuction(item.id)} className="px-2.5 py-1 rounded text-[9px] font-bold uppercase flex items-center gap-1" style={{ backgroundColor: C.text, color: C.bg }}>
                  <Play size={8} fill="currentColor" /> Start
                </button>
              </div>
            ))}
            {finishedItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg border border-dashed opacity-40" style={{ borderColor: C.border }}>
                <span className="text-sm font-serif italic truncate flex-1 pr-2" style={{ color: C.muted }}>{item.title}</span>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => handleRevertToPending(item.id)} style={{ color: C.muted }}><RotateCcw size={12} /></button>
                  <button onClick={() => handleStartAuction(item.id)} className="text-[9px] font-bold uppercase" style={{ color: C.accent }}>Re</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Bids */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "#0D0D12", borderColor: C.border }}>
        <h4 className="text-[10px] font-sans font-bold uppercase tracking-[0.3em] mb-3" style={{ color: C.accent }}>Live Bids</h4>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {bids.slice(0, 10).map((bid, idx) => (
            <div key={bid.id} className="flex justify-between items-center pb-2 border-b" style={{ borderColor: `${C.border}60`, opacity: idx === 0 ? 1 : 0.35 }}>
              <span className="text-sm font-serif italic font-bold" style={{ color: C.text }}>{users.find((u) => u.id === bid.user_id)?.nickname || "Guest"}</span>
              <span className="text-lg font-bold" style={{ color: C.text }}>{bid.amount.toLocaleString()}<span className="text-xs ml-0.5" style={{ color: C.muted }}>만</span></span>
            </div>
          ))}
          {bids.length === 0 && <p className="text-center py-4 italic" style={{ color: C.muted }}>아직 입찰이 없습니다.</p>}
        </div>
      </div>

      {/* Ranking */}
      <div className="rounded-xl border p-4" style={{ backgroundColor: C.card, borderColor: C.border }}>
        <h4 className="text-[10px] font-sans font-bold uppercase tracking-[0.3em] mb-3" style={{ color: C.muted }}>Ranking</h4>
        <div className="flex flex-wrap gap-2">
          {users.slice(0, 10).map((u, idx) => (
            <div key={u.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: C.bg }}>
              <span className="text-sm font-serif italic font-bold" style={{ color: C.muted }}>{idx + 1}</span>
              <span className="text-xs font-bold" style={{ color: C.text }}>{u.nickname}</span>
              <span className="text-[9px] font-bold" style={{ color: C.muted }}>{u.wonItems.length}W</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── FEED TAB ─── */
function FeedTab() {
  const ctx = useAdminSession();
  const router = useRouter();
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [genderFilter, setGenderFilter] = useState<"all" | "F" | "M">("all");
  const [isEnding, setIsEnding] = useState(false);
  const sessionRef = useRef(`${ctx.sessionDate}_${ctx.sessionNum}`);

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
  const FOLDER_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID;

  const isFemaleGender = (g: string) => ["F", "FEMALE", "여", "여성"].includes(g?.toUpperCase?.() || "");
  const isMaleGender = (g: string) => ["M", "MALE", "남", "남성"].includes(g?.toUpperCase?.() || "");

  const filteredItems = genderFilter === "all" ? feedItems : genderFilter === "F" ? feedItems.filter((i) => isFemaleGender(i.gender)) : feedItems.filter((i) => isMaleGender(i.gender));

  const fetchFeedData = useCallback(async (session: string) => {
    if (!FOLDER_ID || !API_KEY) { setIsLoading(false); return; }
    const sessionDate = session.includes("_") ? session.split("_")[0] : "";
    const sessionNum = session.includes("_") ? session.split("_").pop()!.padStart(2, "0") : session.padStart(2, "0");

    try {
      const [usersRes, likesRes] = await Promise.all([
        supabase.from("users").select("id, real_name, phone_suffix, gender").eq("session_id", session),
        supabase.from("feed_likes").select("photo_id, user_id").eq("session_id", session),
      ]);

      let targetFolderId = FOLDER_ID;
      if (sessionDate) {
        const rootRes = await fetch(`https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents&fields=files(id,name,mimeType)&pageSize=1000&key=${API_KEY}`);
        const rootData = await rootRes.json();
        const dateFolder = (rootData.files || []).find((f: any) => f.mimeType === "application/vnd.google-apps.folder" && f.name === sessionDate);
        if (dateFolder) targetFolderId = dateFolder.id;
      }

      const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files?q='${targetFolderId}'+in+parents+and+mimeType+contains+'image/'&fields=files(id,name)&pageSize=1000&key=${API_KEY}`);
      const driveData = await driveRes.json();
      const allFiles = driveData.files || [];
      const likes = likesRes.data || [];
      const users = usersRes.data || [];

      const likeCounts: Record<string, number> = {};
      likes.forEach((l: any) => { const pid = String(l.photo_id); likeCounts[pid] = (likeCounts[pid] || 0) + 1; });

      const matched = allFiles.map((file: any) => {
        const parsed = parseDriveFileName(file.name);
        if (!parsed || parsed.session !== sessionNum) return null;
        const mu = users.find((u: any) => String(u.real_name).trim() === parsed.realName && String(u.phone_suffix).trim() === parsed.phoneSuffix);
        if (!mu) return null;
        return { id: file.id, photo_url: `https://lh3.googleusercontent.com/d/${file.id}=w800`, gender: mu.gender || "Unknown", target_user_id: String(mu.id), like_count: likeCounts[file.id] || 0 };
      }).filter(Boolean).sort((a: any, b: any) => b.like_count - a.like_count);

      setFeedItems(matched);
      setTotalLikes(likes.length);
    } catch (e) {
      console.error("Feed error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [API_KEY, FOLDER_ID]);

  useEffect(() => {
    const session = `${ctx.sessionDate}_${ctx.sessionNum}`;
    sessionRef.current = session;
    fetchFeedData(session);
    const ch = supabase.channel(`hub_feed_${Date.now()}`).on("postgres_changes", { event: "*", schema: "public", table: "feed_likes" }, () => fetchFeedData(sessionRef.current)).subscribe();
    const poll = setInterval(() => fetchFeedData(sessionRef.current), 3000);
    return () => { supabase.removeChannel(ch); clearInterval(poll); };
  }, [fetchFeedData, ctx.sessionDate, ctx.sessionNum]);

  const handleEndFeed = async () => {
    if (!confirm("피드를 종료하고 리포트 단계로 전환하시겠습니까?")) return;
    setIsEnding(true);
    const ok = await ctx.changePhase("report");
    setIsEnding(false);
    if (ok) router.push("/admin/hub/reports");
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" style={{ color: C.accent }} size={24} /></div>;

  return (
    <div className="space-y-6">
      {/* 피드 종료 + 리포트 발행 */}
      <div className="rounded-xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ backgroundColor: C.card, borderColor: C.border }}>
        <div>
          <h4 className="text-sm font-bold" style={{ color: C.text }}>피드 종료</h4>
          <p className="text-xs" style={{ color: C.muted }}>피드를 마감하고 리포트 단계로 전환합니다</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEndFeed}
            disabled={isEnding || ctx.phase !== "feed"}
            className="px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: C.danger, color: "#fff" }}
          >
            {isEnding ? <Loader2 size={14} className="animate-spin" /> : <StopCircle size={14} />}
            {isEnding ? "전환 중..." : "피드 종료 → 리포트"}
          </button>
          <button
            onClick={() => router.push("/admin/hub/reports")}
            className="px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all hover:opacity-80"
            style={{ backgroundColor: C.accent, color: "#fff" }}
          >
            <FileText size={14} />
            1on1 리포트 발행
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Photos", value: filteredItems.length, icon: Users },
          { label: "Hearts", value: totalLikes, icon: Heart },
          { label: "Top Score", value: filteredItems[0]?.like_count || 0, icon: Trophy },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border p-4 flex items-center gap-3" style={{ backgroundColor: C.card, borderColor: C.border }}>
            <s.icon size={18} style={{ color: C.accent }} />
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold font-sans" style={{ color: C.muted }}>{s.label}</p>
              <p className="text-xl font-bold" style={{ color: C.text }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: C.card }}>
        {[
          { id: "all", label: "All" },
          { id: "F", label: "Female" },
          { id: "M", label: "Male" },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setGenderFilter(btn.id as any)}
            className="flex-1 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{
              backgroundColor: genderFilter === btn.id ? C.accent : "transparent",
              color: genderFilter === btn.id ? "#fff" : C.muted,
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.map((item: any, idx: number) => {
          const isFem = isFemaleGender(item.gender);
          return (
            <div key={item.id} className="relative group">
              <div className="absolute -top-2 -left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold font-sans" style={{
                backgroundColor: idx === 0 ? C.accent : idx === 1 ? C.warning : C.card,
                color: idx < 2 ? "#fff" : C.muted,
                border: idx >= 2 ? `1px solid ${C.border}` : "none",
              }}>
                {idx + 1}
              </div>
              <div className="aspect-[3/4] rounded-xl overflow-hidden border" style={{ borderColor: C.border }}>
                <img src={item.photo_url} alt="" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[8px] font-bold" style={{ backgroundColor: isFem ? "#EC489960" : "#3B82F660", color: "#fff" }}>
                  {isFem ? "F" : "M"}
                </div>
                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center gap-1.5">
                    <Heart size={20} fill="#FF3B30" className="text-[#FF3B30]" />
                    <span className="text-lg font-black text-white drop-shadow-md">{item.like_count}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {filteredItems.length === 0 && <p className="text-center py-10 italic" style={{ color: C.muted }}>No records found.</p>}
    </div>
  );
}
