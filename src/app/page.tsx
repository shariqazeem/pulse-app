"use client";

import { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Logo } from "@/components/Logo";
import { useStarkZapContext } from "@/providers/StarkZapProvider";

const ease = [0.32, 0.72, 0, 1] as const;

const PREVIEW_TIPS = [
  { name: "alice", amount: 5, token: "STRK" },
  { name: "bob", amount: 10, token: "USDC" },
  { name: "carla", amount: 2, token: "STRK" },
  { name: "dev", amount: 25, token: "USDC" },
];

export default function LandingPage() {
  const { username, isReconnecting } = useStarkZapContext();
  const isLoggedIn = !isReconnecting && !!username;
  const [tipIndex, setTipIndex] = useState(0);
  const [showTip, setShowTip] = useState(false);

  // 3D card tilt effect (desktop)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 150, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 20 });
  const rotateY = useTransform(springX, [-300, 300], [-12, 12]);
  const rotateX = useTransform(springY, [-300, 300], [8, -8]);

  // Cycle preview tips
  useEffect(() => {
    const interval = setInterval(() => {
      setShowTip(true);
      setTimeout(() => {
        setShowTip(false);
        setTimeout(() => {
          setTipIndex((i) => (i + 1) % PREVIEW_TIPS.length);
        }, 400);
      }, 3000);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Initial trigger
  useEffect(() => {
    setTimeout(() => setShowTip(true), 2500);
  }, []);

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#FDFDFD]"
      onMouseMove={(e) => {
        if (window.innerWidth < 1024) return;
        mouseX.set(e.clientX - window.innerWidth / 2);
        mouseY.set(e.clientY - window.innerHeight / 2);
      }}
    >
      <AmbientBackground />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 lg:flex-row lg:gap-16">
        {/* Left: text content */}
        <div className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left">
          <motion.div
            initial={{ scale: 0.3, opacity: 0, filter: "blur(20px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 1, ease }}
            className="mb-10"
          >
            <motion.div
              animate={{
                filter: [
                  "drop-shadow(0 0 0px rgba(245, 158, 11, 0))",
                  "drop-shadow(0 0 20px rgba(245, 158, 11, 0.3))",
                  "drop-shadow(0 0 0px rgba(245, 158, 11, 0))",
                ],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-20 w-20 items-center justify-center"
            >
              <Logo size={72} />
            </motion.div>
          </motion.div>

          <div className="text-center lg:text-left">
            <motion.h1
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.3, duration: 0.8, ease }}
              className="text-[56px] font-semibold leading-[1.02] tracking-[-0.045em] text-zinc-900 sm:text-[80px]"
            >
              Get tipped
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.5, duration: 0.8, ease }}
              className="text-[56px] font-semibold leading-[1.02] tracking-[-0.045em] text-zinc-900 sm:text-[80px]"
            >
              <span className="shimmer-text">live.</span>
            </motion.h1>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8, ease }}
            className="mt-6 max-w-md text-[15px] leading-relaxed text-zinc-500"
          >
            Real-time tipping for streamers, podcasters, and live events.
            Audience scans a QR. Taps an amount. Pays with Google.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8, ease }}
            className="mt-10 flex flex-col items-center gap-3 lg:items-start"
          >
            <Link href={isLoggedIn ? "/dashboard" : "/create"}>
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="group flex h-14 items-center gap-2.5 rounded-full bg-zinc-900 px-10 text-[15px] font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition-shadow hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)]"
              >
                {isLoggedIn ? `Open dashboard` : "Create your card"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </Link>
            <p className="text-[11px] text-zinc-400">
              {isLoggedIn
                ? `Signed in as @${username}`
                : "Free · No app install · 30 seconds"}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 1 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-2 lg:justify-start"
          >
            {["Gasless", "Social Login", "Onchain", "Real-time"].map(
              (tag, i) => (
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 + i * 0.08 }}
                  className="rounded-full bg-zinc-100/80 px-3 py-1.5 text-[11px] font-medium text-zinc-500 backdrop-blur-sm"
                >
                  {tag}
                </motion.span>
              )
            )}
          </motion.div>
        </div>

        {/* Right: floating 3D preview card with live tip animation */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.7, duration: 1, ease }}
          className="relative mt-16 hidden flex-1 items-center justify-center lg:mt-0 lg:flex"
          style={{ perspective: 1500 }}
        >
          <motion.div
            style={{
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
            }}
            className="relative"
          >
            {/* Glow */}
            <div
              className="absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, transparent 70%)",
                filter: "blur(60px)",
                transform: "scale(1.4)",
              }}
            />

            {/* Live preview card */}
            <motion.div
              animate={{
                y: [0, -8, 0],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="card-elevated w-[340px] p-6"
            >
              {/* Mock header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
                    Live · @starknet
                  </span>
                </div>
                <Logo size={14} />
              </div>

              {/* Mock total */}
              <div className="text-center">
                <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-zinc-400">
                  Total Raised
                </p>
                <p className="mt-1 text-[44px] font-extralight leading-none tracking-[-0.04em] text-zinc-900 tabular">
                  142.50
                </p>
              </div>

              {/* Mock leaderboard */}
              <div className="mt-5 space-y-2">
                {["alice", "bob", "carla"].map((name, i) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold ${
                          i === 0
                            ? "bg-amber-100 text-amber-700"
                            : i === 1
                              ? "bg-zinc-100 text-zinc-700"
                              : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="text-[12px] font-medium text-zinc-900">
                        {name}
                      </span>
                    </div>
                    <span className="text-[12px] font-semibold text-zinc-900 tabular">
                      {[42, 28, 15][i]}.00
                    </span>
                  </div>
                ))}
              </div>

              {/* Animated incoming tip */}
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={
                  showTip
                    ? { opacity: 1, x: 0, scale: 1 }
                    : { opacity: 0, x: 20, scale: 0.95 }
                }
                transition={{ type: "spring", stiffness: 220, damping: 20 }}
                className="mt-4 flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-100"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-zinc-900">
                    {PREVIEW_TIPS[tipIndex].name}
                  </p>
                  <p className="text-[9px] text-amber-600">just tipped ✨</p>
                </div>
                <p className="text-[12px] font-semibold text-zinc-900 tabular">
                  +{PREVIEW_TIPS[tipIndex].amount}{" "}
                  {PREVIEW_TIPS[tipIndex].token}
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-zinc-300"
      >
        Built with Starkzap v2 on Starknet
      </motion.p>
    </div>
  );
}
