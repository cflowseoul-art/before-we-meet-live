"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Settings, LogOut, Lock, ImageIcon, RefreshCw } from "lucide-react";

export default function AdminGate() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  useEffect(() => {
    const auth = sessionStorage.getItem("admin_auth");
    if (auth === "true") setIsAuthenticated(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "1234") { 
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_auth", "true");
    } else {
      alert("Passcode Incorrect");
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0A0A0A] p-6 font-serif">
        <form onSubmit={handleLogin} className="bg-[#1A1A1A] p-12 rounded-[3.5rem] border-t-[12px] border-[#A52A2A] text-center w-full max-w-sm shadow-2xl">
          <div className="w-16 h-16 bg-[#A52A2A]/20 rounded-full flex items-center justify-center mx-auto mb-8 text-[#A52A2A]">
            <Lock size={24} />
          </div>
          <h1 className="text-2xl italic mb-10 tracking-tighter text-white">Admin Access</h1>
          <input 
            type="password" 
            value={passwordInput} 
            onChange={(e) => setPasswordInput(e.target.value)} 
            className="w-full p-5 bg-black/50 border-2 border-white/5 rounded-2xl mb-6 text-center text-3xl text-white outline-none focus:border-[#A52A2A] transition-all" 
            placeholder="••••" 
            autoFocus 
          />
          <button type="submit" className="w-full bg-[#A52A2A] text-white py-5 rounded-2xl font-sans font-black tracking-widest text-xs uppercase shadow-lg active:scale-95 transition-all">Verify</button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6 text-white font-serif animate-in fade-in duration-700">
      <div className="max-w-md w-full space-y-8 text-center">
        <header>
          <h1 className="text-4xl italic mb-3 tracking-tighter text-[#FFD700]">Admin Gateway</h1>
          <p className="text-[10px] font-sans font-black uppercase tracking-[0.5em] opacity-40 italic">Me Before You Control Center</p>
        </header>

        <nav className="grid grid-cols-1 gap-4 pt-12">
          {/* 1. 대시보드 */}
          <button 
            onClick={() => router.push("/admin/dashboard")}
            className="group p-6 bg-[#161616] border border-white/5 rounded-[2.5rem] flex items-center gap-6 hover:border-[#A52A2A] hover:bg-[#1A1A1A] transition-all shadow-xl"
          >
            <div className="w-12 h-12 bg-[#A52A2A]/20 rounded-2xl flex items-center justify-center text-[#A52A2A] group-hover:scale-110 transition-transform">
              <LayoutDashboard size={24} />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold">Dashboard</p>
              <p className="text-[9px] opacity-40 uppercase tracking-widest font-sans mt-0.5">Live Auction & Stats</p>
            </div>
          </button>

          {/* 2. 피드 초기화 및 사진 관리 (추가된 부분) */}
          <button 
            onClick={() => router.push("/admin/feed-init")}
            className="group p-6 bg-[#161616] border border-white/5 rounded-[2.5rem] flex items-center gap-6 hover:border-blue-500 hover:bg-[#1A1A1A] transition-all shadow-xl"
          >
            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
              <ImageIcon size={24} />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold">Feed Initializer</p>
              <p className="text-[9px] opacity-40 uppercase tracking-widest font-sans mt-0.5">Photo Sync & Session Control</p>
            </div>
          </button>

          {/* 3. 시스템 설정 */}
          <button 
            onClick={() => router.push("/admin/settings")}
            className="group p-6 bg-[#161616] border border-white/5 rounded-[2.5rem] flex items-center gap-6 hover:border-purple-500 hover:bg-[#1A1A1A] transition-all shadow-xl"
          >
            <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
              <Settings size={24} />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold">Settings</p>
              <p className="text-[9px] opacity-40 uppercase tracking-widest font-sans mt-0.5">User & Phase Control</p>
            </div>
          </button>
        </nav>

        <button 
          onClick={() => { sessionStorage.removeItem("admin_auth"); window.location.href = "/"; }}
          className="pt-10 text-[10px] text-white/20 hover:text-white uppercase tracking-[0.3em] font-sans font-bold flex items-center justify-center gap-2 mx-auto transition-colors"
        >
          <LogOut size={12} /> Exit Admin Session
        </button>
      </div>
    </main>
  );
}