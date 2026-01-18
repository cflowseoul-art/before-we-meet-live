"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

const { colors, transitions } = DESIGN_TOKENS;

export default function ReportLoading({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const userId = resolvedParams.id;

  const router = useRouter();
  const [nickname, setNickname] = useState("당신");
  const [step, setStep] = useState(0);

  const messages = [
    "당신의 가치관을 조심스럽게 분석 중입니다...",
    "데이터 속에서 따뜻한 연결고리를 찾는 중입니다.",
    "영혼의 빛깔이 닮은 인연을 매칭하고 있어요."
  ];

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", userId)
        .single();
      if (data?.nickname) setNickname(data.nickname);
    };
    fetchUser();

    const timer = setInterval(() => setStep(s => (s < 2 ? s + 1 : s)), 2000);

    const redirect = setTimeout(() => {
      router.push(`/1on1/report/${userId}`);
    }, 6000);

    return () => { clearInterval(timer); clearTimeout(redirect); };
  }, [userId, router]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center font-serif italic p-6 text-center"
      style={{ backgroundColor: colors.background, color: colors.muted }}
    >
      <motion.div
        className="w-12 h-[1px] mx-auto mb-8 opacity-30"
        style={{ backgroundColor: colors.accent }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, ease: transitions.default.ease }}
      />

      <motion.div
        className="mb-6 relative"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <motion.div
          className="w-12 h-12 border-2 rounded-full"
          style={{ borderColor: colors.soft, borderTopColor: colors.accent }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        />
      </motion.div>

      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <motion.p
          key={step}
          className="text-lg tracking-tighter leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
        >
          {nickname} 님의<br />{messages[step]}
        </motion.p>
      </motion.div>

      {/* Step Indicator */}
      <motion.div
        className="flex gap-2 mt-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: step >= i ? colors.accent : colors.soft }}
            animate={{ scale: step === i ? 1.3 : 1 }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </motion.div>
    </div>
  );
}
