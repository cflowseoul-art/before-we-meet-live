"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ImageIcon, RefreshCw, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseDriveFileName } from "@/lib/utils/feed-parser";

export default function FeedInitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState("01");

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
  const FOLDER_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: uData }, { data: sData }] = await Promise.all([
        supabase.from("users").select("*").order("real_name"),
        supabase.from("system_settings").select("key, value")
      ]);
      setUsers(uData || []);
      const sess = sData?.find(s => s.key === "current_session")?.value || "01";
      setCurrentSession(String(sess).padStart(2, '0'));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSync = async () => {
    if (!API_KEY || !FOLDER_ID) return alert("환경변수 설정 누락");
    setLoading(true);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents&fields=files(id,name)&key=${API_KEY}`);
      const data = await res.json();
      setDriveFiles(data.files || []);
      alert("스캔 완료");
    } catch (e) { alert("스캔 실패"); } finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] p-8 text-white font-serif antialiased">
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="flex justify-between items-end">
          <div className="space-y-4">
            <button onClick={() => router.push("/admin")} className="flex items-center gap-2 text-[10px] text-white/40 uppercase font-black tracking-widest hover:text-white transition-colors">
              <ArrowLeft size={12} /> Back to Gateway
            </button>
            <h1 className="text-4xl italic tracking-tighter text-[#FFD700]">Feed Initializer</h1>
            <p className="text-[10px] font-sans font-black uppercase tracking-[0.3em] opacity-40 italic">Me Before You Control Center</p>
          </div>
          <button onClick={handleSync} disabled={loading} className="bg-[#A52A2A] px-10 py-5 rounded-[2rem] font-sans font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 shadow-2xl active:scale-95 transition-all disabled:opacity-30">
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <ImageIcon size={16} />} Scan & Sync Drive
          </button>
        </header>

        <div className="bg-[#161616] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5 text-[9px] font-sans font-black uppercase tracking-[0.3em] text-white/40">
                <th className="p-8">Participant</th>
                <th className="p-8 text-center">S 01</th>
                <th className="p-8 text-center">S 02</th>
                <th className="p-8 text-center">S 03</th>
                <th className="p-8 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(u => {
                const userFiles = driveFiles.filter(f => {
                  const info = parseDriveFileName(f.name);
                  return info && info.realName === String(u.real_name).trim() && info.phoneSuffix === String(u.phone_suffix).trim();
                });
                return (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-8">
                      <p className="text-lg font-bold">{u.nickname}</p>
                      <p className="text-[10px] opacity-30 font-sans font-medium uppercase tracking-widest mt-1">{u.real_name} · {u.phone_suffix}</p>
                    </td>
                    {[1, 2, 3].map(num => {
                      const sessStr = String(num).padStart(2, '0');
                      const exists = userFiles.some(f => parseDriveFileName(f.name)?.session === sessStr);
                      return (
                        <td key={num} className="p-8 text-center">
                          {exists ? <CheckCircle size={20} className="text-green-500 mx-auto opacity-80 shadow-[0_0_15px_rgba(34,197,94,0.3)]" /> : <AlertCircle size={20} className="text-white/10 mx-auto" />}
                        </td>
                      );
                    })}
                    <td className="p-8 text-right">
                      <span className={`text-[9px] font-sans font-black uppercase tracking-widest ${userFiles.length >= 3 ? 'text-green-500' : 'text-[#A52A2A]'}`}>
                        {userFiles.length} / 3 Found
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}