"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Settings, LogOut, Lock, ImageIcon } from "lucide-react";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

const { colors, borderRadius, transitions } = DESIGN_TOKENS;

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

  const menuItems = [
    {
      label: "Dashboard",
      description: "Live Auction & Stats",
      icon: LayoutDashboard,
      path: "/admin/dashboard",
      accentColor: colors.accent
    },
    {
      label: "Feed Initializer",
      description: "Photo Sync & Session Control",
      icon: ImageIcon,
      path: "/admin/feed-init",
      accentColor: "#3B82F6"
    },
    {
      label: "Settings",
      description: "User & Phase Control",
      icon: Settings,
      path: "/admin/settings",
      accentColor: "#8B5CF6"
    }
  ];

  return (
    <main className="min-h-screen flex items-center justify-center p-6 text-white font-serif" style={{ backgroundColor: colors.primary }}>
      <motion.div
        className="max-w-md w-full space-y-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
      >
        <header>
          <motion.h1
            className="text-4xl italic mb-3 tracking-tighter"
            style={{ color: colors.accent }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            Admin Gateway
          </motion.h1>
          <motion.p
            className="text-[10px] font-sans font-black uppercase tracking-[0.5em] opacity-40 italic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 0.3 }}
          >
            Me Before You Control Center
          </motion.p>
        </header>

        <nav className="grid grid-cols-1 gap-4 pt-12">
          {menuItems.map((item, idx) => (
            <motion.button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="group p-6 border border-white/5 flex items-center gap-6 transition-all shadow-xl"
              style={{
                backgroundColor: "#161616",
                borderRadius: "2.5rem"
              }}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + idx * 0.1, duration: 0.5 }}
              whileHover={{
                borderColor: item.accentColor,
                backgroundColor: colors.primary
              }}
            >
              <motion.div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  backgroundColor: `${item.accentColor}20`,
                  color: item.accentColor
                }}
                whileHover={{ scale: 1.1 }}
              >
                <item.icon size={24} />
              </motion.div>
              <div className="text-left">
                <p className="text-lg font-bold">{item.label}</p>
                <p className="text-[9px] opacity-40 uppercase tracking-widest font-sans mt-0.5">{item.description}</p>
              </div>
            </motion.button>
          ))}
        </nav>

        <motion.button
          onClick={() => { sessionStorage.removeItem("admin_auth"); window.location.href = "/"; }}
          className="pt-10 text-[10px] text-white/20 hover:text-white uppercase tracking-[0.3em] font-sans font-bold flex items-center justify-center gap-2 mx-auto transition-colors"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
        >
          <LogOut size={12} /> Exit Admin Session
        </motion.button>
      </motion.div>
    </main>
  );
}
