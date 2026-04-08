"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Zap, ArrowRight, AlertCircle } from "lucide-react";
import { useStarkZapContext } from "@/providers/StarkZapProvider";

type Step = "welcome" | "username" | "creating" | "title" | "card-reveal";

export default function CreatePage() {
  const router = useRouter();
  const { username, isReconnecting, connectWithPrivy } = useStarkZapContext();
  const [step, setStep] = useState<Step>("welcome");
  const [inputUsername, setInputUsername] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Skip welcome if already authenticated
  useEffect(() => {
    if (!isReconnecting && username) {
      setStep("title");
    }
  }, [isReconnecting, username]);

  const handleCreateAccount = useCallback(async () => {
    const cleaned = inputUsername.trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,20}$/.test(cleaned)) {
      setError("3-20 chars, lowercase letters, numbers, hyphens");
      return;
    }
    if (inputPassword.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setError(null);
    setStep("creating");

    try {
      // Try to create the user (might already exist)
      const createRes = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleaned,
          address: "0x0",
          password: inputPassword,
        }),
      });

      // 409 = already exists, that's fine — try to log in
      if (!createRes.ok && createRes.status !== 409) {
        const data = await createRes.json();
        throw new Error(data.error ?? "Failed to create account");
      }

      // Connect wallet (creates Privy wallet if needed)
      await connectWithPrivy(cleaned);
      setStep("title");
    } catch (err) {
      console.error("Create failed:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("username");
    }
  }, [inputUsername, inputPassword, connectWithPrivy]);

  const handleStartSession = useCallback(async () => {
    if (!username || !sessionTitle.trim()) return;
    setIsCreatingSession(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostUsername: username,
          title: sessionTitle.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      const session = await res.json();
      router.push(`/live/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      setIsCreatingSession(false);
    }
  }, [username, sessionTitle, router]);

  if (isReconnecting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-zinc-200 border-t-zinc-900"
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FDFDFD]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-200/30 blur-[100px]" />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {/* Welcome */}
          {step === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
              transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              className="flex w-full max-w-sm flex-col items-center text-center"
            >
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
                className="mb-10 flex h-16 w-16 items-center justify-center rounded-[20px] bg-zinc-900 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
              >
                <Zap className="h-8 w-8 text-white" strokeWidth={2.5} />
              </motion.div>

              <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-zinc-900">
                Hi.
              </h1>
              <p className="mt-3 text-base text-zinc-500">
                Let&apos;s create your tap card.
              </p>

              <button
                onClick={() => setStep("username")}
                className="btn mt-10"
              >
                <span className="flex items-center gap-2">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            </motion.div>
          )}

          {/* Username + Password */}
          {step === "username" && (
            <motion.div
              key="username"
              initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
              transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              className="flex w-full max-w-sm flex-col items-center"
            >
              <h1 className="text-center text-[32px] font-semibold tracking-[-0.03em] text-zinc-900">
                Pick a name
              </h1>
              <p className="mt-2 text-center text-sm text-zinc-500">
                This becomes your tip card identity
              </p>

              <div className="mt-8 w-full space-y-3">
                <div className="card flex items-center !rounded-2xl px-5 !p-0">
                  <span className="text-sm text-zinc-400">pulse/</span>
                  <input
                    type="text"
                    value={inputUsername}
                    onChange={(e) =>
                      setInputUsername(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_-]/g, "")
                      )
                    }
                    placeholder="yourname"
                    className="flex-1 border-0 bg-transparent py-4 text-sm font-medium text-zinc-900 placeholder:text-zinc-300 focus:outline-none"
                    autoFocus
                    maxLength={20}
                  />
                </div>

                <input
                  type="password"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  placeholder="Set a password (4+ chars)"
                  className="card w-full !rounded-2xl px-5 py-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none !p-0 !pl-5 !pr-5 !py-4"
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      inputUsername.length >= 3 &&
                      inputPassword.length >= 4
                    ) {
                      handleCreateAccount();
                    }
                  }}
                />

                {error && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                )}
              </div>

              <button
                onClick={handleCreateAccount}
                disabled={inputUsername.length < 3 || inputPassword.length < 4}
                className="btn mt-4 w-full"
              >
                Continue
              </button>
              <p className="mt-3 text-[11px] text-zinc-400">
                If you already have a Pulse / StarkPay account, just enter the same credentials.
              </p>
            </motion.div>
          )}

          {/* Creating */}
          {step === "creating" && (
            <motion.div
              key="creating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex w-full max-w-sm flex-col items-center text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="mb-8 h-10 w-10 rounded-full border-2 border-zinc-200 border-t-zinc-900"
              />
              <p className="text-base font-medium text-zinc-900">
                Creating your wallet
              </p>
              <p className="mt-1.5 text-sm text-zinc-500">
                This takes a few seconds
              </p>
            </motion.div>
          )}

          {/* Title (after auth) */}
          {step === "title" && (
            <motion.div
              key="title"
              initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
              transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              className="flex w-full max-w-sm flex-col items-center"
            >
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="mb-8 flex h-14 w-14 items-center justify-center rounded-[18px] bg-zinc-900"
              >
                <Zap className="h-7 w-7 text-white" strokeWidth={2.5} />
              </motion.div>

              <h1 className="text-center text-[32px] font-semibold tracking-[-0.03em] text-zinc-900">
                Name your session
              </h1>
              <p className="mt-2 text-center text-sm text-zinc-500">
                What are you tipping for, @{username}?
              </p>

              <div className="mt-8 w-full">
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="e.g. Friday Night Stream"
                  className="card w-full !rounded-2xl px-5 py-4 text-base font-medium text-zinc-900 placeholder:text-zinc-300 focus:outline-none"
                  autoFocus
                  maxLength={60}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && sessionTitle.trim().length > 0) {
                      handleStartSession();
                    }
                  }}
                />
                {error && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                )}
              </div>

              <button
                onClick={handleStartSession}
                disabled={!sessionTitle.trim() || isCreatingSession}
                className="btn mt-4 w-full"
              >
                {isCreatingSession ? "Starting..." : "Start Live Session"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-6 text-[10px] text-zinc-300"
        >
          Built with Starkzap v2 on Starknet
        </motion.p>
      </div>
    </div>
  );
}
