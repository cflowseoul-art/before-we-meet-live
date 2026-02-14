"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/lib/contexts/admin-session-context";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, CheckCircle2, RefreshCw, Gavel, Heart, Sparkles,
  Trash2, UserPlus, RotateCcw, AlertTriangle, Save
} from "lucide-react";
import { AUCTION_ITEMS } from "@/app/constants";

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

export default function UsersPage() {
  const ctx = useAdminSession();
  const sessionId = `${ctx.sessionDate}_${ctx.sessionNum}`;

  const [users, setUsers] = useState<any[]>([]);
  const [isSessionSaving, setIsSessionSaving] = useState(false);
  const [sessionSaveSuccess, setSessionSaveSuccess] = useState(false);
  const [isPhaseLoading, setIsPhaseLoading] = useState<string | null>(null);
  const [phaseSuccess, setPhaseSuccess] = useState<string | null>(null);
  const [isSyncLoading, setIsSyncLoading] = useState(false);
  const [isAuctionResetLoading, setIsAuctionResetLoading] = useState(false);
  const [isFeedResetLoading, setIsFeedResetLoading] = useState(false);
  const [isFeedInitLoading, setIsFeedInitLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [targetUser, setTargetUser] = useState<any>(null);

  const fetchUsers = useCallback(async () => {
    const sid = `${ctx.sessionDate}_${ctx.sessionNum}`;
    const { data } = await supabase.from("users").select("*").eq("session_id", sid).order("created_at", { ascending: false });
    if (data) setUsers(data);
  }, [ctx.sessionDate, ctx.sessionNum]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // --- Session Save ---
  const handleSaveSession = async () => {
    setIsSessionSaving(true);
    setSessionSaveSuccess(false);
    const ok = await ctx.saveSession();
    if (ok) {
      setSessionSaveSuccess(true);
      setTimeout(() => setSessionSaveSuccess(false), 3000);
      await fetchUsers();
    }
    setIsSessionSaving(false);
  };

  // --- Phase Change ---
  const handlePhaseChange = async (p: string) => {
    const names: Record<string, string> = {
      auction: "옥션 진행",
      feed: "갤러리(피드) 오픈",
      report: "최종 리포트 발행",
      completed: "세션 종료",
    };
    if (!confirm(`[${names[p]}] 단계로 전환하시겠습니까?`)) return;
    setIsPhaseLoading(p);
    setPhaseSuccess(null);
    const ok = await ctx.changePhase(p);
    if (ok) {
      setPhaseSuccess(p);
      setTimeout(() => setPhaseSuccess(null), 3000);
    }
    setIsPhaseLoading(null);
  };

  // --- Values Sync ---
  const syncInventory = async () => {
    if (!confirm(`${AUCTION_ITEMS.length}개의 가치관 목록으로 DB를 초기화하시겠습니까?`)) return;
    setIsSyncLoading(true);
    try {
      await supabase.from("bids").delete().filter("id", "not.is", null);
      await supabase.from("auction_items").delete().filter("id", "not.is", null);
      const items = AUCTION_ITEMS.map((val) => ({ title: val, current_bid: 0, status: "pending" }));
      const { error } = await supabase.from("auction_items").insert(items);
      if (error) throw error;
      alert("가치관 목록 동기화 완료!");
    } catch (err: any) {
      alert("동기화 오류: " + err.message);
    } finally {
      setIsSyncLoading(false);
    }
  };

  // --- Auction Reset ---
  const resetAuction = async () => {
    if (!confirm("경매를 초기화하시겠습니까?\n- 모든 입찰 삭제\n- 아이템 pending 상태\n- 잔액 5000 복구")) return;
    setIsAuctionResetLoading(true);
    try {
      await supabase.from("bids").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("auction_items").update({ status: "pending", current_bid: 0, highest_bidder_id: null }).neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("users").update({ balance: 5000 }).neq("id", "00000000-0000-0000-0000-000000000000");
      alert("경매가 초기화되었습니다.");
    } catch (err: any) {
      alert("초기화 오류: " + err.message);
    } finally {
      setIsAuctionResetLoading(false);
    }
  };

  // --- Feed Reset ---
  const resetFeed = async () => {
    if (!confirm("모든 좋아요(하트) 기록을 삭제하시겠습니까?")) return;
    setIsFeedResetLoading(true);
    try {
      await supabase.from("feed_likes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      alert("피드 좋아요가 초기화되었습니다.");
    } catch (err: any) {
      alert("초기화 오류: " + err.message);
    } finally {
      setIsFeedResetLoading(false);
    }
  };

  // --- Feed Init ---
  const generateFeedRecords = async () => {
    if (!confirm("모든 참가자의 사진 슬롯을 생성하시겠습니까?")) return;
    setIsFeedInitLoading(true);
    try {
      const { data: existing } = await supabase.from("feed_items").select("user_id, photo_number");
      const existingSet = new Set((existing || []).map((r: any) => `${r.user_id}_${r.photo_number}`));
      const newRecords: any[] = [];
      users.forEach((user) => {
        for (let i = 1; i <= 4; i++) {
          if (!existingSet.has(`${user.id}_${i}`)) {
            newRecords.push({ user_id: user.id, photo_number: i, order_prefix: "00", gender_code: user.gender || "F" });
          }
        }
      });
      if (newRecords.length === 0) { alert("모든 슬롯이 이미 존재합니다."); return; }
      const { error } = await supabase.from("feed_items").insert(newRecords);
      if (error) throw error;
      alert(`${newRecords.length}개 레코드 생성 완료.`);
    } catch (err: any) {
      alert("오류: " + err.message);
    } finally {
      setIsFeedInitLoading(false);
    }
  };

  // --- User Management ---
  const handleDeleteUser = async (user: any) => {
    if (!confirm(`[${user.nickname}] 참가자를 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch("/api/admin/delete-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id }) });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      fetchUsers();
      ctx.refreshSession();
    } catch (err: any) {
      alert("삭제 오류: " + err.message);
    }
  };

  const handleForceRename = async (user: any) => {
    const newSuffix = user.phone_suffix + "A";
    const { error } = await supabase.from("users").update({ phone_suffix: newSuffix }).eq("id", user.id);
    if (!error) {
      setTargetUser({ ...user, phone_suffix: newSuffix, newSuffix });
      setShowDriveModal(true);
      fetchUsers();
    }
  };

  const handleUndoRename = async (user: any) => {
    const cur = user.phone_suffix.toString();
    const orig = cur.endsWith("A") ? cur.slice(0, -1) : cur;
    const { error } = await supabase.from("users").update({ phone_suffix: orig }).eq("id", user.id);
    if (!error) { setShowDriveModal(false); setTargetUser(null); fetchUsers(); }
  };

  // --- Session Reset ---
  const handleSessionReset = async () => {
    if (resetConfirmText !== sessionId) { alert(`'${sessionId}'를 정확히 입력해주세요.`); return; }
    setIsResetLoading(true);
    try {
      const res = await fetch("/api/admin/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      alert(result.message);
      setShowResetConfirm(false);
      setResetConfirmText("");
      fetchUsers();
      ctx.refreshSession();
    } catch (err: any) {
      alert("초기화 오류: " + err.message);
    } finally {
      setIsResetLoading(false);
    }
  };

  // --- Counts ---
  const [expectedMale, expectedFemale] = ctx.ratio.split(":").map(Number);
  const mCount = users.filter((u) => u.gender === "남성").length;
  const fCount = users.filter((u) => u.gender === "여성").length;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-serif italic font-bold" style={{ color: C.text }}>유저 관리</h2>

      {/* Section 1: Session Config */}
      <section className="rounded-xl border p-6" style={{ backgroundColor: C.card, borderColor: C.border }}>
        <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.3em] mb-4" style={{ color: C.accent }}>
          Session Config
        </h3>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-[10px] font-sans font-bold uppercase tracking-widest block mb-1.5" style={{ color: C.muted }}>날짜</label>
            <input
              type="date"
              value={ctx.sessionDate}
              onChange={(e) => ctx.setSessionDate(e.target.value)}
              className="w-[150px] text-sm font-bold bg-transparent border rounded-lg py-2.5 px-3 outline-none transition-colors [color-scheme:dark]"
              style={{ borderColor: C.border, color: C.text }}
            />
          </div>
          <div>
            <label className="text-[10px] font-sans font-bold uppercase tracking-widest block mb-1.5" style={{ color: C.muted }}>회차</label>
            <input
              type="text"
              value={ctx.sessionNum}
              onChange={(e) => ctx.setSessionNum(e.target.value)}
              className="w-14 text-center text-xl font-bold bg-transparent border rounded-lg py-2 outline-none"
              style={{ borderColor: C.border, color: C.text }}
            />
          </div>
          <span className="text-xl pb-2" style={{ color: C.border }}>/</span>
          <div>
            <label className="text-[10px] font-sans font-bold uppercase tracking-widest block mb-1.5" style={{ color: C.muted }}>남:여</label>
            <input
              type="text"
              value={ctx.ratio}
              onChange={(e) => ctx.setRatio(e.target.value)}
              className="w-20 text-center text-xl font-bold bg-transparent border rounded-lg py-2 outline-none"
              style={{ borderColor: C.border, color: C.text }}
            />
          </div>
          <button
            onClick={handleSaveSession}
            disabled={isSessionSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            style={{ backgroundColor: sessionSaveSuccess ? C.success : C.accent, color: "#fff" }}
          >
            {isSessionSaving ? <Loader2 size={14} className="animate-spin" /> : sessionSaveSuccess ? <CheckCircle2 size={14} /> : <><Save size={14} /> 저장</>}
          </button>
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs font-sans" style={{ color: C.muted }}>
          <span>남 <span className="font-bold" style={{ color: mCount >= (expectedMale || 0) ? C.success : C.text }}>{mCount}</span>/{expectedMale || "?"}</span>
          <span>여 <span className="font-bold" style={{ color: fCount >= (expectedFemale || 0) ? C.success : C.text }}>{fCount}</span>/{expectedFemale || "?"}</span>
          <span style={{ color: C.border }}>|</span>
          <span>총 <span className="font-bold" style={{ color: (mCount + fCount) >= ((expectedMale || 0) + (expectedFemale || 0)) ? C.success : C.warning }}>{mCount + fCount}</span>/{(expectedMale || 0) + (expectedFemale || 0)}명</span>
        </div>
      </section>

      {/* Section 2: Phase Control */}
      <section className="rounded-xl border p-6" style={{ backgroundColor: C.card, borderColor: C.border }}>
        <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.3em] mb-4" style={{ color: C.accent }}>
          Phase Control
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {(["auction", "feed", "report", "completed"] as const).map((p) => (
            <button
              key={p}
              onClick={() => handlePhaseChange(p)}
              disabled={isPhaseLoading !== null}
              className="py-3 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all flex flex-col items-center gap-1"
              style={{
                backgroundColor: ctx.phase === p ? C.accent : "transparent",
                borderColor: ctx.phase === p ? C.accent : C.border,
                color: ctx.phase === p ? "#fff" : C.muted,
                opacity: ctx.phase === p ? 1 : 0.6,
              }}
            >
              {isPhaseLoading === p ? <Loader2 size={14} className="animate-spin" /> : phaseSuccess === p ? <CheckCircle2 size={14} /> : p}
            </button>
          ))}
        </div>
      </section>

      {/* Section 3: Attendee List */}
      <section className="rounded-xl border p-6" style={{ backgroundColor: C.card, borderColor: C.border }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.3em]" style={{ color: C.accent }}>
            Attendees ({users.length})
          </h3>
          <div className="flex items-center gap-3 text-xs font-sans" style={{ color: C.muted }}>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> 남 {mCount}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400 inline-block" /> 여 {fCount}</span>
          </div>
        </div>
        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: C.border }}>
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm" style={{ color: C.text }}>{user.real_name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${user.gender === "남성" ? "bg-blue-500/20 text-blue-400" : "bg-pink-500/20 text-pink-400"}`}>
                    {user.gender === "남성" ? "남" : "여"}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-sans ${user.phone_suffix?.toString().endsWith("A") ? "bg-amber-500/20 text-amber-400" : "text-gray-500"}`} style={{ borderColor: C.border }}>
                    {user.phone_suffix}
                  </span>
                </div>
                <p className="text-xs font-bold italic mt-0.5" style={{ color: C.accent }}>{user.nickname}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => user.phone_suffix?.toString().endsWith("A") ? handleUndoRename(user) : handleForceRename(user)}
                  className="w-8 h-8 rounded-lg border flex items-center justify-center transition-all hover:opacity-80"
                  style={{ borderColor: C.border, color: user.phone_suffix?.toString().endsWith("A") ? "#60A5FA" : C.warning }}
                >
                  {user.phone_suffix?.toString().endsWith("A") ? <RotateCcw size={14} /> : <UserPlus size={14} />}
                </button>
                <button
                  onClick={() => handleDeleteUser(user)}
                  className="w-8 h-8 rounded-lg border flex items-center justify-center transition-all hover:opacity-80"
                  style={{ borderColor: C.border, color: C.danger }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-center py-8 text-sm italic" style={{ color: C.muted }}>참가자가 없습니다.</p>
          )}
        </div>
      </section>

      {/* Section 4: Data Management */}
      <section className="rounded-xl border p-6" style={{ backgroundColor: C.card, borderColor: C.border }}>
        <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.3em] mb-4" style={{ color: C.accent }}>
          Data Management
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <ActionButton label="Values Sync" icon={RefreshCw} loading={isSyncLoading} onClick={syncInventory} color={C.text} />
          <ActionButton label="Auction Reset" icon={Gavel} loading={isAuctionResetLoading} onClick={resetAuction} color={C.danger} />
          <ActionButton label="Feed Reset" icon={Heart} loading={isFeedResetLoading} onClick={resetFeed} color="#EC4899" />
          <ActionButton label="Feed Init" icon={Sparkles} loading={isFeedInitLoading} onClick={generateFeedRecords} color={C.accent} />
        </div>
      </section>

      {/* Section 5: Danger Zone */}
      <section className="rounded-xl border-2 border-dashed p-6" style={{ borderColor: `${C.danger}40` }}>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} style={{ color: C.danger }} />
          <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.3em]" style={{ color: C.danger }}>
            Danger Zone
          </h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-sm" style={{ color: C.text }}>Session Reset</p>
            <p className="text-xs" style={{ color: C.muted }}>현재 세션의 유저 및 모든 관련 데이터를 삭제합니다.</p>
          </div>
          <button
            onClick={() => { setShowResetConfirm(true); setResetConfirmText(""); }}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider"
            style={{ backgroundColor: `${C.danger}20`, color: C.danger }}
          >
            초기화
          </button>
        </div>
      </section>

      {/* Reset Confirm Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl p-8 w-full max-w-md text-center"
              style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
            >
              <h3 className="text-xl font-bold mb-2" style={{ color: C.danger }}>회차 초기화</h3>
              <p className="text-sm mb-1" style={{ color: C.muted }}>삭제 대상: {sessionId}</p>
              <p className="text-xs mb-4" style={{ color: C.muted }}>유저, 입찰, 피드, 매칭, 리포트가 모두 삭제됩니다.</p>
              <p className="text-sm mb-2" style={{ color: C.text }}>확인을 위해 세션 ID를 입력하세요:</p>
              <p className="text-xs font-mono mb-2" style={{ color: C.muted }}>{sessionId}</p>
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder={sessionId}
                className="w-full text-center font-mono py-3 rounded-lg border bg-transparent outline-none mb-4"
                style={{ borderColor: C.border, color: C.text }}
              />
              <button
                onClick={handleSessionReset}
                disabled={isResetLoading || resetConfirmText !== sessionId}
                className="w-full py-3 rounded-lg font-bold text-sm disabled:opacity-30"
                style={{ backgroundColor: C.danger, color: "#fff" }}
              >
                {isResetLoading ? "처리 중..." : "초기화 실행"}
              </button>
              <button onClick={() => setShowResetConfirm(false)} className="mt-3 text-xs" style={{ color: C.muted }}>취소</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Drive Modal */}
      <AnimatePresence>
        {showDriveModal && targetUser && (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl p-8 w-full max-w-sm text-center"
              style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${C.warning}20`, color: C.warning }}>
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: C.text }}>Drive Sync Required</h3>
              <p className="text-sm mb-6" style={{ color: C.muted }}>
                구글 드라이브 파일명도 수정해야 합니다.<br />New Suffix: <b style={{ color: C.warning }}>{targetUser.newSuffix}</b>
              </p>
              <button
                onClick={() => setShowDriveModal(false)}
                className="w-full py-3 rounded-lg font-bold text-sm"
                style={{ backgroundColor: C.accent, color: "#fff" }}
              >
                확인 완료
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionButton({ label, icon: Icon, loading, onClick, color }: {
  label: string; icon: any; loading: boolean; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center justify-center gap-2 py-3 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 hover:opacity-80"
      style={{ borderColor: "#2A2A35", color }}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
      {label}
    </button>
  );
}
