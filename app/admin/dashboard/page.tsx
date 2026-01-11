"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRoot() {
  const router = useRouter();

  useEffect(() => {
    // 접속 즉시 경매 대시보드로 리다이렉션
    router.replace("/admin/dashboard/auction");
  }, [router]);

  return (
    <main className="min-h-screen bg-[#050505] flex items-center justify-center">
      {/* 이동 중 잠시 보일 로딩 화면 (럭셔리 무드 유지) */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-t-2 border-[#A52A2A] rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 animate-pulse">
          Entering Command Center...
        </p>
      </div>
    </main>
  );
}