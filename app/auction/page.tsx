"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuctionPage() {
  const router = useRouter();
  const [activeItem, setActiveItem] = useState<any>(null);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // 데이터 통합 로드 및 초기 단계 체크
  const fetchAllData = async (userId: string) => {
    const [itemsRes, settingsRes] = await Promise.all([
      supabase.from("auction_items").select("*").order("id"),
      supabase.from("system_settings").select("*")
    ]);

    // [체크 1] 이미 리포트가 열려있다면 최우선 이동
    const isReportOpen = settingsRes.data?.find(s => s.key === "is_report_open")?.value === "true";
    if (isReportOpen) {
      router.push(`/1on1/loading/${userId}`);
      return;
    }

    // [체크 2] 피드(갤러리)가 열려있다면 이동
    const isFeedOpen = settingsRes.data?.find(s => s.key === "is_feed_open")?.value === "true";
    if (isFeedOpen) {
      router.push("/feed");
      return;
    }

    if (itemsRes.data) {
      setAllItems(itemsRes.data);
      const active = itemsRes.data.find(i => i.status === "active");
      setActiveItem(active || null);
    }

    const { data: userData } = await supabase.from("users").select("*").eq("id", userId).single();
    if (userData) {
      setUser(userData);
      localStorage.setItem("auction_user", JSON.stringify(userData));
    }
  };

  // app/auction/page.tsx 내의 기존 useEffect를 이 코드로 교체하세요

  useEffect(() => {
    const loadUser = () => {
      const stored = localStorage.getItem("auction_user");
      if (stored) {
        const parsedUser = JSON.parse(stored);
        fetchAllData(parsedUser.id);
        if (!sessionStorage.getItem("has_seen_modal")) setShowModal(true);
      }
    };
    loadUser();

    console.log("🔔 실시간 구독을 시작합니다...");

    const channel = supabase.channel("auction_to_anywhere_sync")
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "auction_items" 
      }, (payload) => {
        console.log("♻️ 경매 아이템 변경 감지:", payload);
        const stored = localStorage.getItem("auction_user");
        if (stored) fetchAllData(JSON.parse(stored).id);
      })
      .on("postgres_changes", { 
        event: "UPDATE", 
        schema: "public", 
        table: "system_settings" 
      }, (payload: any) => {
        console.log("⚙️ 시스템 설정 변경 감지:", payload.new.key, "->", payload.new.value);
        const { key, value } = payload.new;

        if (key === "is_report_open" && value === "true") {
          console.log("🏁 리포트 페이지로 이동합니다.");
          const stored = localStorage.getItem("auction_user");
          if (stored) {
            const userId = JSON.parse(stored).id;
            router.push(`/1on1/loading/${userId}`);
          }
        } 
        else if (key === "is_feed_open" && value === "true") {
          console.log("📸 피드 페이지로 이동합니다.");
          router.push("/feed");
        }
      })
      .subscribe((status) => {
        console.log("📡 구독 상태:", status); 
      });

    return () => { 
      console.log("🔌 구독을 해제합니다.");
      supabase.removeChannel(channel); 
    };
  }, [router]);

  const closeIntroModal = () => {
    setShowModal(false);
    sessionStorage.setItem("has_seen_modal", "true");
  };

  const handleBid = async () => {
    if (!activeItem?.id || !user?.id || loading) return;
    const nextBid = activeItem.current_bid + 100;
    if (user.balance < nextBid) {
      alert(`잔액이 부족합니다. 입찰하려면 ${nextBid}만원이 필요합니다.`);
      return;
    }
    setLoading(true);
    try {
      const { data: currentItem } = await supabase.from("auction_items").select("status, current_bid").eq("id", activeItem.id).single();
      if (!currentItem || currentItem.status !== 'active') {
        alert("이 경매는 이미 종료되었습니다.");
        fetchAllData(user.id);
        return;
      }
      if (currentItem.current_bid !== activeItem.current_bid) {
        alert("다른 참가자가 먼저 입찰했습니다. 다시 시도해주세요.");
        fetchAllData(user.id);
        return;
      }
      await supabase.from("auction_items").update({ current_bid: nextBid, highest_bidder_id: user.id }).eq("id", activeItem.id);
      await supabase.from("bids").insert({ auction_item_id: activeItem.id, user_id: user.id, amount: nextBid });
      const newBalance = user.balance - nextBid;
      await supabase.from("users").update({ balance: newBalance }).eq("id", user.id);
      alert(`${activeItem.title}에 입찰했습니다!`);
      fetchAllData(user.id);
    } catch (err: any) {
      alert("입찰 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-serif antialiased pb-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <header className="w-full flex justify-between items-center py-8 mb-12 border-b border-[#EEEBDE] sticky top-0 bg-[#FDFDFD]/80 backdrop-blur-md z-40">
          <div className="flex flex-col">
            <span className="text-[10px] font-sans font-black text-gray-300 uppercase tracking-widest">참가자</span>
            <span className="text-2xl italic font-medium tracking-tight text-[#1A1A1A]">{user.nickname}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-sans font-black text-[#A52A2A] uppercase tracking-widest">나의 잔액</span>
            <div className="text-3xl font-light italic text-[#1A1A1A]">
              {user.balance.toLocaleString()}<span className="text-sm not-italic ml-1 opacity-40">만원</span>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-12 items-start">
          <aside className="w-full lg:w-1/3 order-2 lg:order-1 lg:sticky lg:top-32">
            <div className="bg-[#FCF9F2]/50 rounded-[2.5rem] p-8 border border-[#EEEBDE]">
              <h3 className="text-[11px] font-sans font-black mb-6 text-gray-300 uppercase tracking-[0.2em] italic">가치관 경매 현황</h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {allItems.map((item) => (
                  <div key={item.id} className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${
                    item.status === 'active' ? 'bg-[#FDF8F8] border-[#A52A2A]/20 shadow-sm' : 
                    item.status === 'finished' ? 'bg-gray-50 border-transparent opacity-40' : 'bg-white border-[#F0EDE4]'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'active' ? 'bg-[#A52A2A] animate-pulse' : 'bg-gray-200'}`}></div>
                      <span className={`text-sm font-medium ${item.status === 'finished' ? 'text-gray-400 line-through' : 'text-[#1A1A1A]'}`}>{item.title}</span>
                    </div>
                    <span className="text-[11px] font-sans font-bold text-gray-400">{item.current_bid}만</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <main className="flex-1 w-full order-1 lg:order-2 flex flex-col items-center">
            {activeItem ? (
              <div className="w-full max-w-xl animate-in fade-in zoom-in duration-1000">
                <div className="bg-white p-12 rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.03)] border border-[#EEEBDE] text-center relative overflow-hidden">
                  <div className="h-[1px] w-20 bg-[#A52A2A] mx-auto mb-10 opacity-30"></div>
                  <p className="text-[10px] font-sans font-black tracking-[0.4em] text-[#A52A2A]/60 mb-4 uppercase italic">Auction Now</p>
                  <h1 className="text-5xl font-medium italic tracking-tighter mb-12 leading-none break-all py-2">{activeItem.title}</h1>
                  <div className="bg-[#FCF9F2]/50 py-10 rounded-[3rem] border border-[#F0EDE4] mb-12 shadow-inner">
                    <p className="text-[10px] font-sans font-black tracking-widest text-gray-300 mb-2 uppercase italic">현재 최고가</p>
                    <p className="text-5xl font-light text-[#A52A2A] tracking-tighter italic">
                      {activeItem.current_bid}<span className="text-sm not-italic ml-1 opacity-30 font-sans font-normal">만원</span>
                    </p>
                  </div>
                  <button onClick={handleBid} disabled={loading} className="w-full bg-[#1A1A1A] text-white py-7 rounded-[2.2rem] text-sm font-bold tracking-[0.3em] uppercase shadow-2xl active:scale-95 transition-all hover:bg-[#A52A2A] disabled:bg-gray-100">
                    {loading ? "처리 중..." : "+100만원 입찰하기"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-32 text-gray-300 italic tracking-widest text-sm text-center font-serif">
                현재 진행 중인 경매가 없습니다.<br/>잠시만 기다려주세요.
              </div>
            )}
          </main>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1A1A1A]/50 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-white text-[#1A1A1A] w-full max-w-md p-10 rounded-[3.5rem] shadow-2xl border-t-[10px] border-[#A52A2A] text-center">
            <h2 className="text-2xl italic tracking-tight mb-8">가치관 경매 안내</h2>
            <div className="space-y-5 text-sm font-light text-gray-500 mb-10 leading-loose text-left px-4 font-sans">
              <p>• 1인당 자산 <span className="text-[#A52A2A] font-bold">1,000만원</span>이 지급됩니다.</p>
              <p>• 모든 입찰은 <span className="text-[#A52A2A] font-bold">100만원 단위</span>로만 가능합니다.</p>
              <p>• 입찰 성공 시 자산이 <span className="text-gray-900 font-bold underline decoration-[#A52A2A]/30">즉시 차감</span>됩니다.</p>
              <p>• 이전 입찰자가 있을 경우 해당 금액은 즉시 환불됩니다.</p>
            </div>
            <button onClick={closeIntroModal} className="w-full bg-[#1A1A1A] text-white py-5 rounded-2xl text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#A52A2A] transition-all">확인했습니다</button>
          </div>
        </div>
      )}
    </div>
  );
}