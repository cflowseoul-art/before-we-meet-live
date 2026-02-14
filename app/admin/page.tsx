"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

const { colors, borderRadius, transitions } = DESIGN_TOKENS;

export default function AdminGate() {
  const router = useRouter();
  const [passwordInput, setPasswordInput] = useState("");

  // Already authenticated → redirect to hub
  useEffect(() => {
    const auth = sessionStorage.getItem("admin_auth");
    if (auth === "true") {
      router.replace("/admin/hub/users");
    }
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "1234") {
      sessionStorage.setItem("admin_auth", "true");
      router.push("/admin/hub/users");
    } else {
      alert("Passcode Incorrect");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 font-serif" style={{ backgroundColor: colors.primary }}>
      <motion.form
        onSubmit={handleLogin}
        className="p-12 text-center w-full max-w-sm shadow-2xl"
        style={{
          backgroundColor: "#111111",
          borderRadius: borderRadius.onboarding,
          borderTop: `12px solid ${colors.accent}`
        }}
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: transitions.default.duration, ease: transitions.default.ease }}
      >
        <motion.div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-8"
          style={{ backgroundColor: `${colors.accent}20`, color: colors.accent }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <Lock size={24} />
        </motion.div>
        <h1 className="text-2xl italic mb-10 tracking-tighter text-white">Admin Access</h1>
        <input
          type="password"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          className="w-full p-5 bg-black/50 border-2 border-white/5 rounded-2xl mb-6 text-center text-3xl text-white outline-none transition-all"
          style={{
            borderColor: passwordInput ? colors.accent : "rgba(255,255,255,0.05)"
          }}
          placeholder="••••"
          autoFocus
        />
        <motion.button
          type="submit"
          className="w-full text-white py-5 rounded-2xl font-sans font-black tracking-widest text-xs uppercase shadow-lg"
          style={{ backgroundColor: colors.accent }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Verify
        </motion.button>
      </motion.form>
    </main>
  );
}
