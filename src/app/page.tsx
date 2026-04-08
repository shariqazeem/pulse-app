"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FDFDFD]">
      {/* Subtle ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-200/30 blur-[120px]" />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-6">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
          className="mb-12"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-zinc-900 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <Zap className="h-8 w-8 text-white" strokeWidth={2.5} />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="text-center text-[56px] font-semibold leading-[1.05] tracking-[-0.04em] text-zinc-900 sm:text-[72px]"
        >
          Get tipped<br />live.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-6 max-w-md text-center text-base leading-relaxed text-zinc-500"
        >
          Real-time tipping for streamers, podcasters, and live events.
          Audience scans a QR, taps an amount, and pays with Google.
          Tips appear on your screen instantly.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          className="mt-10 flex flex-col items-center gap-3"
        >
          <Link href="/create">
            <button className="btn group">
              <span className="flex items-center gap-2">
                Create your card
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          </Link>
          <p className="text-[11px] text-zinc-400">
            Free. No app install. 30 seconds.
          </p>
        </motion.div>

        {/* Tags */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-2"
        >
          {["Gasless", "Social Login", "Onchain", "Zero Fees"].map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-medium text-zinc-500"
            >
              {tag}
            </span>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="absolute bottom-6 text-[10px] text-zinc-300"
        >
          Built with Starkzap v2 on Starknet
        </motion.p>
      </div>
    </div>
  );
}
