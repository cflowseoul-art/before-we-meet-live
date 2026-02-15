"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/lib/contexts/admin-session-context";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Heart, Volume2, Play, RotateCcw, Timer,
  MessageCircle, Send, Check, Flag, AlertCircle, CheckCircle
} from "lucide-react";
import confetti from "canvas-confetti";

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

export default function ReportsPage() {
  const ctx = useAdminSession();
  const [hasCelebrated, setHasCelebrated] = useState(false);

  // ─── Timer ───
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [timeLeft, setTimeLeft] = useState(5 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerFinished, setIsTimerFinished] = useState(false);

  // ─── Feedback ───
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // ─── User Selection ───
  const [sessionUsers, setSessionUsers] = useState<{ id: string; nickname: string; gender: string }[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // ─── Session End ───
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [sessionEndResult, setSessionEndResult] = useState<{ success: boolean; message: string } | null>(null);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // ════════════════════════════════════════
  // Audio
  // ════════════════════════════════════════

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === "suspended") audioContextRef.current.resume();
    return audioContextRef.current;
  }, []);

  const playFanfareSound = useCallback(() => {
    try {
      const actx = getAudioContext();
      const now = actx.currentTime;
      [
        { freq: 523.25, start: 0, duration: 0.25 },
        { freq: 659.25, start: 0.12, duration: 0.25 },
        { freq: 783.99, start: 0.24, duration: 0.35 },
        { freq: 1046.50, start: 0.4, duration: 0.5 },
        { freq: 783.99, start: 0.7, duration: 0.25 },
        { freq: 1046.50, start: 0.85, duration: 0.7 },
      ].forEach((n) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(n.freq, now + n.start);
        gain.gain.setValueAtTime(0, now + n.start);
        gain.gain.linearRampToValueAtTime(0.3, now + n.start + 0.03);
        gain.gain.linearRampToValueAtTime(0, now + n.start + n.duration);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start(now + n.start);
        osc.stop(now + n.start + n.duration + 0.1);
      });
    } catch (e) { console.log("Fanfare failed:", e); }
  }, [getAudioContext]);

  const playBeepSound = useCallback(() => {
    try {
      const actx = getAudioContext();
      const now = actx.currentTime;
      [
        { freq: 880, start: 0, duration: 0.12 },
        { freq: 660, start: 0.18, duration: 0.12 },
        { freq: 880, start: 0.45, duration: 0.12 },
        { freq: 660, start: 0.63, duration: 0.12 },
        { freq: 880, start: 0.9, duration: 0.12 },
        { freq: 660, start: 1.08, duration: 0.25 },
      ].forEach((b) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(b.freq, now + b.start);
        gain.gain.setValueAtTime(0, now + b.start);
        gain.gain.linearRampToValueAtTime(0.2, now + b.start + 0.01);
        gain.gain.linearRampToValueAtTime(0, now + b.start + b.duration);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start(now + b.start);
        osc.stop(now + b.start + b.duration + 0.05);
      });
    } catch (e) { console.log("Beep failed:", e); }
  }, [getAudioContext]);

  const fireConfetti = useCallback(() => {
    const duration = 3500;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
    const interval = setInterval(() => {
      const tl = animationEnd - Date.now();
      if (tl <= 0) return clearInterval(interval);
      const pc = 40 * (tl / duration);
      confetti({ ...defaults, particleCount: pc, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }, colors: ["#A52A2A", "#F59E0B", "#EC4899", "#3B82F6", "#10B981"] });
      confetti({ ...defaults, particleCount: pc, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }, colors: ["#A52A2A", "#F59E0B", "#EC4899", "#3B82F6", "#10B981"] });
    }, 250);
  }, []);

  const celebrate = useCallback(() => {
    fireConfetti();
    playFanfareSound();
    setHasCelebrated(true);
  }, [fireConfetti, playFanfareSound]);

  // ════════════════════════════════════════
  // Timer
  // ════════════════════════════════════════

  const startTimer = useCallback(() => {
    if (isTimerRunning) return;
    getAudioContext();
    setIsTimerRunning(true);
    setIsTimerFinished(false);
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          setIsTimerRunning(false);
          setIsTimerFinished(true);
          playBeepSound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isTimerRunning, playBeepSound, getAudioContext]);

  const resetTimer = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsTimerRunning(false);
    setIsTimerFinished(false);
    setTimeLeft(timerMinutes * 60);
    setShowFeedbackModal(false);
    setSelectedRound(null);
    setIsSending(false);
    setFeedbackSent(false);
  }, [timerMinutes]);

  useEffect(() => {
    if (isTimerFinished) {
      setShowFeedbackModal(true);
      setFeedbackSent(false);
      setSelectedRound(null);
    }
  }, [isTimerFinished]);

  const handleSendFeedback = useCallback(async () => {
    if (selectedRound === null || isSending || selectedUserIds.size === 0) return;
    setIsSending(true);
    try {
      const allSelected = selectedUserIds.size === sessionUsers.length;
      const res = await fetch("/api/admin/feedback-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round: String(selectedRound),
          targetUserIds: allSelected ? [] : Array.from(selectedUserIds),
        }),
      });
      const data = await res.json();
      if (data.success) setFeedbackSent(true);
    } catch (e) {
      console.error("Feedback error:", e);
    } finally {
      setIsSending(false);
    }
  }, [selectedRound, isSending, selectedUserIds, sessionUsers.length]);

  const handleMinutesChange = useCallback((v: number) => {
    const nv = Math.max(1, Math.min(60, v));
    setTimerMinutes(nv);
    if (!isTimerRunning) setTimeLeft(nv * 60);
  }, [isTimerRunning]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // ════════════════════════════════════════
  // Session End
  // ════════════════════════════════════════

  const handleEndSession = useCallback(async () => {
    if (isEndingSession) return;
    if (!confirm("세션을 종료하시겠습니까?\n\n1. 모든 유저의 리포트 스냅샷이 생성됩니다.\n2. 유저들은 리포트 허브로 이동됩니다.\n3. 스냅샷은 24시간 후 자동 삭제됩니다.")) return;
    setIsEndingSession(true);
    setSessionEndResult(null);
    try {
      const snapRes = await fetch("/api/admin/snapshot", { method: "POST" });
      const snapData = await snapRes.json();
      if (!snapData.success) throw new Error(snapData.error || "스냅샷 생성 실패");
      const phaseRes = await fetch("/api/admin/phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "completed" }),
      });
      const phaseData = await phaseRes.json();
      if (!phaseData.success) throw new Error(phaseData.error || "Phase 변경 실패");
      setSessionEndResult({ success: true, message: `세션 종료 완료! ${snapData.count}개의 스냅샷 생성.` });
      ctx.refreshSession();
    } catch (err: any) {
      setSessionEndResult({ success: false, message: err.message || "오류 발생" });
    } finally {
      setIsEndingSession(false);
    }
  }, [isEndingSession, ctx]);

  // ════════════════════════════════════════
  // Fetch Session Users
  // ════════════════════════════════════════

  useEffect(() => {
    const sessionId = `${ctx.sessionDate}_${ctx.sessionNum}`;
    if (!sessionId || ctx.isLoading) return;
    const fetchUsers = async () => {
      const { data } = await supabase
        .from("users")
        .select("id, nickname, gender")
        .eq("session_id", sessionId)
        .order("gender")
        .order("nickname");
      if (data) {
        setSessionUsers(data);
        setSelectedUserIds(new Set(data.map(u => u.id)));
      }
    };
    fetchUsers();
  }, [ctx.sessionDate, ctx.sessionNum, ctx.isLoading]);

  // ════════════════════════════════════════
  // Init
  // ════════════════════════════════════════

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // ════════════════════════════════════════
  // Render
  // ════════════════════════════════════════

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-serif italic font-bold" style={{ color: C.text }}>리포트 발행</h2>

      {/* ─── MC Control — Celebration ─── */}
      <section className="rounded-xl border p-6" style={{ backgroundColor: C.card, borderColor: C.border }}>
        <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.3em] mb-4" style={{ color: C.accent }}>MC Control</h3>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 border" style={{ backgroundColor: `${C.accent}20`, borderColor: `${C.accent}40` }}>
            <Heart size={32} style={{ color: C.accent }} fill={C.accent} />
          </div>
          <h3 className="text-xl font-bold mb-1" style={{ color: C.text }}>매칭이 완료되었습니다</h3>
        </div>

        <button
          onClick={celebrate}
          className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-80"
          style={{ backgroundColor: hasCelebrated ? `${C.accent}20` : C.accent, color: hasCelebrated ? C.accent : "#fff" }}
        >
          <Volume2 size={18} />
          {hasCelebrated ? "다시 축하하기" : "축하 효과 재생"}
        </button>
      </section>

      {/* ─── Timer ─── */}
      <section className="rounded-xl border p-6" style={{ backgroundColor: C.card, borderColor: C.border, ...(isTimerFinished ? { borderColor: `${C.danger}60` } : {}) }}>
        <div className="flex items-center gap-3 mb-6">
          <Timer size={18} style={{ color: isTimerFinished ? C.danger : C.accent }} />
          <div>
            <h3 className="font-bold text-base" style={{ color: C.text }}>대화 타이머</h3>
            <p className="text-xs" style={{ color: C.muted }}>대화 시간을 설정하고 관리하세요</p>
          </div>
        </div>

        <div className="text-center mb-6">
          <p className="text-6xl md:text-7xl font-bold font-mono tracking-tight transition-all" style={{
            color: isTimerFinished ? C.danger : timeLeft <= 30 ? C.warning : C.text,
          }}>
            {formatTime(timeLeft)}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-6">
          <button onClick={() => handleMinutesChange(timerMinutes - 1)} disabled={isTimerRunning} className="w-10 h-10 rounded-lg border font-bold text-lg disabled:opacity-30" style={{ borderColor: C.border, color: C.text }}>-</button>
          <div className="flex items-center gap-2 px-4">
            <input type="number" value={timerMinutes} onChange={(e) => handleMinutesChange(parseInt(e.target.value) || 1)} disabled={isTimerRunning} className="w-14 text-center py-2 font-bold text-xl bg-transparent disabled:opacity-50" style={{ color: C.text }} min={1} max={60} />
            <span className="text-sm" style={{ color: C.muted }}>분</span>
          </div>
          <button onClick={() => handleMinutesChange(timerMinutes + 1)} disabled={isTimerRunning} className="w-10 h-10 rounded-lg border font-bold text-lg disabled:opacity-30" style={{ borderColor: C.border, color: C.text }}>+</button>
        </div>

        <div className="flex gap-3 justify-center">
          <button onClick={startTimer} disabled={isTimerRunning} className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all disabled:opacity-40" style={{ backgroundColor: isTimerRunning ? C.border : C.success, color: "#fff" }}>
            <Play size={18} /> Start
          </button>
          <button onClick={resetTimer} className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all" style={{ backgroundColor: `${C.text}15`, color: C.text }}>
            <RotateCcw size={18} /> Reset
          </button>
        </div>

        {isTimerFinished && (
          <div className="mt-4 p-4 rounded-lg flex items-center justify-center gap-2" style={{ backgroundColor: `${C.danger}20`, color: C.danger }}>
            <Volume2 size={18} className="animate-pulse" />
            <span className="font-bold text-sm">대화 시간이 종료되었습니다</span>
          </div>
        )}

        <button
          onClick={() => { setShowFeedbackModal(true); setFeedbackSent(false); setSelectedRound(null); }}
          className="mt-4 w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-80"
          style={{ backgroundColor: "#8B5CF6", color: "#fff" }}
        >
          <MessageCircle size={16} /> 인연의 잔상 수동 발송
        </button>
      </section>

      {/* ─── Session End ─── */}
      <section className="rounded-xl border-2 border-dashed p-6" style={{ borderColor: "#8B5CF640" }}>
        <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.3em] mb-4" style={{ color: "#8B5CF6" }}>Session End</h3>

        <button
          onClick={handleEndSession}
          disabled={isEndingSession}
          className="w-full py-5 rounded-xl flex items-center justify-center gap-3 transition-all hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: "#8B5CF620", color: "#8B5CF6" }}
        >
          {isEndingSession ? (
            <><Loader2 size={20} className="animate-spin" /><span className="font-bold">스냅샷 생성 중...</span></>
          ) : (
            <><Flag size={20} /><div className="text-left"><p className="font-bold">세션 종료 & 리포트 허브 오픈</p><p className="text-xs opacity-60">End Session & Open Report Hub</p></div></>
          )}
        </button>

        {sessionEndResult && (
          <div className="mt-3 p-3 rounded-lg flex items-center gap-2" style={{
            backgroundColor: sessionEndResult.success ? `${C.success}20` : `${C.danger}20`,
            color: sessionEndResult.success ? C.success : C.danger,
          }}>
            {sessionEndResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span className="text-sm">{sessionEndResult.message}</span>
          </div>
        )}
      </section>

      {/* ─── Feedback Modal ─── */}
      <AnimatePresence>
        {showFeedbackModal && (
          <>
            <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFeedbackModal(false)} />
            <motion.div
              className="fixed inset-x-4 bottom-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md z-[70] rounded-2xl p-8"
              style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
              initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style={{ backgroundColor: "#8B5CF620" }}>
                  <MessageCircle size={24} style={{ color: "#8B5CF6" }} />
                </div>
                <h3 className="text-lg font-bold mb-1" style={{ color: C.text }}>인연의 잔상</h3>
                <p className="text-sm mb-4" style={{ color: C.muted }}>몇 번째 인연인지, 누구에게 보낼지 선택하세요</p>

                {/* 라운드 선택 */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((round) => (
                    <button key={round} onClick={() => setSelectedRound(round)} className="py-3 rounded-lg font-bold text-lg transition-all" style={{
                      backgroundColor: selectedRound === round ? "#8B5CF6" : `${C.text}10`,
                      color: selectedRound === round ? "#fff" : C.text,
                    }}>
                      {round}
                    </button>
                  ))}
                </div>

                {/* 유저 선택 */}
                <div className="text-left mb-4">
                  <label className="flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all hover:opacity-80" style={{ backgroundColor: `${C.text}08` }}>
                    <input
                      type="checkbox"
                      checked={selectedUserIds.size === sessionUsers.length && sessionUsers.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedUserIds(new Set(sessionUsers.map(u => u.id)));
                        else setSelectedUserIds(new Set());
                      }}
                      className="w-4 h-4 accent-[#8B5CF6]"
                    />
                    <span className="text-sm font-bold" style={{ color: C.text }}>전체 선택</span>
                    <span className="text-xs ml-auto" style={{ color: C.muted }}>{selectedUserIds.size}/{sessionUsers.length}</span>
                  </label>
                  <div className="max-h-40 overflow-y-auto mt-2 space-y-1 px-1">
                    {sessionUsers.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-all hover:opacity-80" style={{ backgroundColor: selectedUserIds.has(u.id) ? `#8B5CF610` : "transparent" }}>
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(u.id)}
                          onChange={(e) => {
                            const next = new Set(selectedUserIds);
                            if (e.target.checked) next.add(u.id);
                            else next.delete(u.id);
                            setSelectedUserIds(next);
                          }}
                          className="w-3.5 h-3.5 accent-[#8B5CF6]"
                        />
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{
                          backgroundColor: u.gender === "남성" ? "#3B82F620" : "#EC489820",
                          color: u.gender === "남성" ? "#60A5FA" : "#F472B6",
                        }}>{u.gender === "남성" ? "♂" : "♀"}</span>
                        <span className="text-sm" style={{ color: C.text }}>{u.nickname}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {feedbackSent && (
                  <div className="w-full py-2 rounded-lg text-sm flex items-center justify-center gap-2 mb-2" style={{ backgroundColor: `${C.success}20`, color: C.success }}>
                    <Check size={14} /> {selectedRound}회차 발송 완료
                  </div>
                )}
                <button onClick={() => { setFeedbackSent(false); handleSendFeedback(); }} disabled={selectedRound === null || isSending || selectedUserIds.size === 0} className="w-full py-3.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-30" style={{ backgroundColor: selectedRound && selectedUserIds.size > 0 ? "#8B5CF6" : `${C.text}10`, color: selectedRound && selectedUserIds.size > 0 ? "#fff" : C.muted }}>
                  {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {isSending ? "발송 중..." : `${selectedRound ? selectedRound + "회차 " : ""}${feedbackSent ? "재발송" : "발송"} (${selectedUserIds.size}명)`}
                </button>

                <button onClick={() => setShowFeedbackModal(false)} className="mt-3 text-sm transition-all" style={{ color: C.muted }}>닫기</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
