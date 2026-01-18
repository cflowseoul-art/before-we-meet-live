"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Activity, Trophy, History, Settings, Play, RotateCcw } from "lucide-react";

export default function AuctionDashboard() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);

  const fetchLive = useCallback(async () => {
    const [iRes, uRes, bRes] = await Promise.all([
      supabase.from("auction_items").select("*").order("id"),
      supabase.from("users").select("*"),
      supabase.from("bids").select("*").order("created_at", { ascending: false }).limit(20)
    ]);

    if (iRes.data) {
      const sorted = [...iRes.data].sort((a, b) => {
        const statusOrder: Record<string, number> = { active: 0, pending: 1, finished: 2 };
        return (statusOrder[a.status as string] ?? 3) - (statusOrder[b.status as string] ?? 3);
      });
      setItems(sorted);
    }
    
    if (uRes.data && iRes.data) {
      const ranked = uRes.data.map(user => ({
        ...user,
        wonItems: iRes.data!.filter(item => item.status === 'finished' && item.highest_bidder_id === user.id),
        leadingItems: iRes.data!.filter(item => item.status === 'active' && item.highest_bidder_id === user.id),
      })).sort((a, b) => (b.wonItems.length + b.leadingItems.length) - (a.wonItems.length + a.leadingItems.length));
      setUsers(ranked);
    }
    if (bRes.data) setBids(bRes.data);
  }, []);

  const handleStartAuction = async (itemId: number) => {
    const activeItem = items.find(i => i.status === 'active');
    if (activeItem && activeItem.id !== itemId) {
      await supabase.from("auction_items").update({ status: 'finished' }).eq('id', activeItem.id);
    }
    await supabase.from("auction_items").update({ status: 'active' }).eq('id', itemId);
    fetchLive();
  };

  const handleFinishAuction = async (itemId: number) => {
    await supabase.from("auction_items").update({ status: 'finished' }).eq('id', itemId);
    fetchLive();
  };

  const handleRevertToPending = async (itemId: number) => {
    await supabase.from("auction_items").update({ status: 'pending' }).eq('id', itemId);
    fetchLive();
  };

  useEffect(() => {
    fetchLive();
    const channel = supabase.channel("admin_auction_dashboard").on("postgres_changes", { event: "*", schema: "public" }, fetchLive).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLive]);

  const activeItem = items.find(i => i.status === 'active');
  const pendingItems = items.filter(i => i.status === 'pending');
  const finishedItems = items.filter(i => i.status === 'finished');

  return (
    <main className="h-screen w-full bg-[#FDFDFD] text-[#1A1A1A] antialiased flex flex-col overflow-hidden">
      {/* 1. Header Navigation */}
      <nav className="h-[70px] border-b border-[#EEEBDE] px-10 flex justify-between items-center bg-white shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-serif italic font-black cursor-pointer" onClick={() => router.push("/admin")}>Me Before You</h1>
          <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-[#A52A2A] bg-[#FDF8F8] px-3 py-1 rounded-full border border-[#A52A2A]/10">Admin Console</span>
        </div>
        <button onClick={() => router.push("/admin/settings")} className="p-2.5 rounded-full border border-[#EEEBDE] hover:bg-[#F0EDE4] transition-all"><Settings size={16} /></button>
      </nav>

      {/* 2. Main Content Grid (3-Tier Structure) */}
      <div className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
        
        {/* TOP: Active Now | Inventory Flow (Horizontal) */}
        <div className="h-[300px] grid grid-cols-2 gap-6 shrink-0">
          {/* Active Now */}
          <section className="flex flex-col min-h-0">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-[#A52A2A]">Active Now</h3>
            <div className="flex-1 bg-white rounded-[2.5rem] border border-[#EEEBDE] shadow-xl p-8 flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {activeItem ? (
                  <motion.div key={activeItem.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-between items-center">
                    <div>
                      <h2 className="text-3xl font-serif italic font-black">{activeItem.title}</h2>
                      <p className="text-4xl font-black mt-2">{activeItem.current_bid?.toLocaleString()}<span className="text-sm font-serif italic ml-1 opacity-40">만</span></p>
                    </div>
                    <button onClick={() => handleFinishAuction(activeItem.id)} className="px-8 py-4 bg-[#A52A2A] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Finish</button>
                  </motion.div>
                ) : (
                  <div className="text-center opacity-20 italic font-serif">Stage Empty</div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Inventory Flow */}
          <section className="flex flex-col min-h-0">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-gray-400">Inventory Flow</h3>
            <div className="flex-1 bg-[#F0EDE4]/50 rounded-[2.5rem] border border-[#EEEBDE] p-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                {pendingItems.map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded-xl flex justify-between items-center border border-transparent hover:border-[#A52A2A]/20 transition-all group">
                    <span className="font-serif italic text-md">{item.title}</span>
                    <button onClick={() => handleStartAuction(item.id)} className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all"><Play size={10} fill="currentColor" /> Start</button>
                  </div>
                ))}
                {finishedItems.map((item) => (
                  <div key={item.id} className="bg-white/40 p-4 rounded-xl border border-dashed border-[#EEEBDE] flex justify-between items-center group">
                    <span className="font-serif italic text-md text-gray-300">{item.title}</span>
                    <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleRevertToPending(item.id)} className="text-gray-400 hover:text-gray-600"><RotateCcw size={14} /></button>
                      <button onClick={() => handleStartAuction(item.id)} className="text-[9px] font-black uppercase text-[#A52A2A]">Re-Start</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* MIDDLE: Live Bid Stream (Dominant Section) */}
        <section className="flex-1 flex flex-col min-h-0">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-[#A52A2A]">Live Bid Stream</h3>
          <div className="flex-1 bg-[#1A1A1A] rounded-[3rem] shadow-2xl p-10 flex flex-col overflow-hidden relative">
            <div className="flex-1 overflow-y-auto custom-scrollbar-dark pr-4 space-y-6">
              <AnimatePresence mode="popLayout">
                {bids.map((bid, idx) => (
                  <motion.div key={bid.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: idx === 0 ? 1 : 0.2 }} className={`flex justify-between items-end pb-6 border-b border-white/5 ${idx === 0 ? 'text-white' : 'text-white/30'}`}>
                    <div className="space-y-1">
                      <p className="text-[8px] font-bold uppercase tracking-widest opacity-40">Bidder</p>
                      <p className="text-4xl font-serif italic font-bold leading-none">{users.find(u => u.id === bid.user_id)?.nickname || 'Guest'}</p>
                    </div>
                    <p className="text-6xl font-black tracking-tighter leading-none">{bid.amount.toLocaleString()}<span className="text-xl font-normal opacity-50 ml-2">만</span></p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="absolute bottom-6 right-10 text-[6rem] font-serif italic text-white/[0.03] pointer-events-none">History</div>
          </div>
        </section>

        {/* BOTTOM: Identity Ranking (Compact Footer) */}
        <section className="h-[100px] shrink-0 flex flex-col min-h-0">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-gray-400">Identity Ranking</h3>
          <div className="flex-1 bg-[#F0EDE4] rounded-full px-8 flex items-center gap-6 overflow-x-auto custom-scrollbar shadow-inner">
            {users.slice(0, 15).map((u, idx) => (
              <div key={u.id} className="flex-shrink-0 flex items-center gap-3">
                <span className="text-lg font-serif italic text-[#A52A2A]/40 font-bold">{(idx + 1)}</span>
                <span className="font-bold text-sm whitespace-nowrap">{u.nickname}</span>
                <span className="text-[10px] font-black opacity-30 whitespace-nowrap">{u.wonItems.length} Won</span>
              </div>
            ))}
          </div>
        </section>

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; height: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #EEEBDE; border-radius: 10px; }
        .custom-scrollbar-dark::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </main>
  );
}