"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

interface AdminSessionState {
  sessionDate: string;
  sessionNum: string;
  ratio: string;
  phase: string;
  maleCount: number;
  femaleCount: number;
  isLoading: boolean;
}

interface AdminSessionActions {
  setSessionDate: (v: string) => void;
  setSessionNum: (v: string) => void;
  setRatio: (v: string) => void;
  refreshSession: () => Promise<void>;
  saveSession: () => Promise<boolean>;
  changePhase: (phase: string) => Promise<boolean>;
}

type AdminSessionContextType = AdminSessionState & AdminSessionActions;

const AdminSessionContext = createContext<AdminSessionContextType | null>(null);

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sessionNum, setSessionNum] = useState("01");
  const [ratio, setRatio] = useState("5:5");
  const [phase, setPhase] = useState("");
  const [maleCount, setMaleCount] = useState(0);
  const [femaleCount, setFemaleCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    let currentSession = "";
    try {
      const res = await fetch("/api/admin/phase");
      const data = await res.json();
      if (data.success && data.settings) {
        setPhase(data.settings.current_phase || "");
        const raw = data.settings.current_session || "";
        if (raw.includes("_")) {
          const [d, n] = raw.split("_");
          setSessionDate(d);
          setSessionNum(n);
        } else {
          setSessionDate(new Date().toISOString().slice(0, 10));
          setSessionNum(raw || "01");
        }
        setRatio(data.settings.session_ratio || "5:5");
        currentSession = raw;
      }
    } catch (e) {
      console.error("Failed to fetch settings:", e);
    }

    if (currentSession) {
      const { data: users } = await supabase
        .from("users")
        .select("gender")
        .eq("session_id", currentSession);
      if (users) {
        setMaleCount(users.filter((u) => u.gender === "남성").length);
        setFemaleCount(users.filter((u) => u.gender === "여성").length);
      }
    }
    setIsLoading(false);
  }, []);

  const saveSession = useCallback(async (): Promise<boolean> => {
    const composedSession = `${sessionDate}_${sessionNum}`;
    try {
      const sessionRes = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: composedSession, ratio }),
      });
      const sessionData = await sessionRes.json();
      if (!sessionData.success) throw new Error(sessionData.error);
      await refreshSession();
      return true;
    } catch (err: any) {
      alert("저장 중 오류: " + err.message);
      return false;
    }
  }, [sessionDate, sessionNum, ratio, refreshSession]);

  const changePhase = useCallback(async (newPhase: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/admin/phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: newPhase }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to update phase");
      setPhase(newPhase);
      return true;
    } catch (err: any) {
      alert("단계 전환 중 오류: " + err.message);
      return false;
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  return (
    <AdminSessionContext.Provider
      value={{
        sessionDate,
        sessionNum,
        ratio,
        phase,
        maleCount,
        femaleCount,
        isLoading,
        setSessionDate,
        setSessionNum,
        setRatio,
        refreshSession,
        saveSession,
        changePhase,
      }}
    >
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) throw new Error("useAdminSession must be used within AdminSessionProvider");
  return ctx;
}
