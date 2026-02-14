"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Users, Sparkles, FileText, Mic, LogOut, Loader2 } from "lucide-react";
import { AdminSessionProvider, useAdminSession } from "@/lib/contexts/admin-session-context";

const NAV_ITEMS = [
  { href: "/admin/hub/users", label: "유저 관리", icon: Users },
  { href: "/admin/hub/matching", label: "매칭 엔진", icon: Sparkles },
  { href: "/admin/hub/mc", label: "MC 보드", icon: Mic },
  { href: "/admin/hub/reports", label: "리포트 발행", icon: FileText },
] as const;

// Colors
const C = {
  bg: "#0F0F12",
  sidebar: "#16161A",
  card: "#1C1C22",
  border: "#2A2A35",
  accent: "#A52A2A",
  text: "#E8E8ED",
  muted: "#6B6B7B",
} as const;

function SidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { sessionDate, sessionNum, maleCount, femaleCount, ratio, phase } = useAdminSession();

  const [expectedMale, expectedFemale] = ratio.split(":").map(Number);
  const totalUsers = maleCount + femaleCount;

  const handleLogout = () => {
    sessionStorage.removeItem("admin_auth");
    router.push("/admin");
  };

  const phaseLabel: Record<string, string> = {
    auction: "옥션",
    feed: "피드",
    report: "리포트",
    completed: "완료",
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 z-40 border-r"
        style={{ backgroundColor: C.sidebar, borderColor: C.border }}
      >
        {/* Logo */}
        <div className="px-6 py-6 border-b" style={{ borderColor: C.border }}>
          <h1 className="text-lg font-serif italic font-bold" style={{ color: C.text }}>
            Me Before You
          </h1>
          <p className="text-[10px] font-sans font-bold uppercase tracking-[0.3em] mt-0.5" style={{ color: C.muted }}>
            Admin Console
          </p>
        </div>

        {/* Session Badge */}
        <div className="mx-4 mt-4 p-4 rounded-xl border" style={{ backgroundColor: C.card, borderColor: C.border }}>
          <p className="text-sm font-bold font-sans" style={{ color: C.text }}>
            {sessionDate}
          </p>
          <p className="text-xs font-sans mt-1" style={{ color: C.muted }}>
            {sessionNum}회차 · {ratio}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs font-sans" style={{ color: C.muted }}>
            <span>
              남<span className="font-bold ml-0.5" style={{ color: maleCount >= (expectedMale || 0) ? "#10B981" : C.text }}>{maleCount}</span>
            </span>
            <span>
              여<span className="font-bold ml-0.5" style={{ color: femaleCount >= (expectedFemale || 0) ? "#10B981" : C.text }}>{femaleCount}</span>
            </span>
            <span>= {totalUsers}명</span>
          </div>
          {phase && (
            <div
              className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold font-sans uppercase tracking-wider"
              style={{ backgroundColor: `${C.accent}30`, color: C.accent }}
            >
              {phaseLabel[phase] || phase}
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 mt-6 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-sans font-medium transition-all"
                style={{
                  backgroundColor: isActive ? `${C.accent}20` : "transparent",
                  color: isActive ? C.accent : C.muted,
                }}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-sans font-medium transition-all hover:opacity-80"
            style={{ color: C.muted }}
          >
            <LogOut size={18} />
            로그아웃
          </button>
        </div>
      </aside>

      {/* Mobile Top Tab Bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 border-b"
        style={{ backgroundColor: C.sidebar, borderColor: C.border }}
      >
        <div className="flex items-center justify-between px-4 py-2">
          <div>
            <span className="text-sm font-serif italic font-bold" style={{ color: C.text }}>MBY</span>
            <span className="text-[10px] font-sans ml-2" style={{ color: C.muted }}>
              {sessionDate.slice(5)} {sessionNum}회
            </span>
            {phase && (
              <span
                className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold font-sans uppercase"
                style={{ backgroundColor: `${C.accent}30`, color: C.accent }}
              >
                {phaseLabel[phase] || phase}
              </span>
            )}
          </div>
          <button onClick={handleLogout} style={{ color: C.muted }}>
            <LogOut size={16} />
          </button>
        </div>
        <div className="flex">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-sans font-bold transition-all border-b-2"
                style={{
                  borderColor: isActive ? C.accent : "transparent",
                  color: isActive ? C.accent : C.muted,
                }}
              >
                <item.icon size={14} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default function AdminHubLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem("admin_auth");
    if (auth !== "true") {
      router.replace("/admin");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  if (!authChecked) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: C.bg }}>
        <Loader2 className="animate-spin" style={{ color: C.accent }} size={32} />
      </div>
    );
  }

  return (
    <AdminSessionProvider>
      <div className="min-h-screen" style={{ backgroundColor: C.bg, color: C.text }}>
        <SidebarContent />
        {/* Main content area */}
        <main className="md:ml-64 pt-[88px] md:pt-0 min-h-screen">
          {children}
        </main>
      </div>
    </AdminSessionProvider>
  );
}
