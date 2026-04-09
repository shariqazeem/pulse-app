"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Zap, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { useStarkZapContext } from "@/providers/StarkZapProvider";
import { Logo } from "@/components/Logo";
import { AmbientBackground } from "@/components/AmbientBackground";

type Step = "welcome" | "username" | "password" | "creating" | "card-reveal" | "choice" | "title";
type Mode = "signup" | "login";

const ease = [0.32, 0.72, 0, 1] as const;

export default function CreatePage() {
  const router = useRouter();
  const { username, isReconnecting, connectWithPrivy } = useStarkZapContext();
  const [step, setStep] = useState<Step>("welcome");
  const [mode, setMode] = useState<Mode>("signup");
  const [inputUsername, setInputUsername] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);

  // Skip to choice step if already authenticated
  useEffect(() => {
    if (!isReconnecting && username && step === "welcome") {
      setStep("choice");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReconnecting, username]);

  // Step 1: Submit username — check if exists
  const handleSubmitUsername = useCallback(async () => {
    const cleaned = inputUsername.trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,20}$/.test(cleaned)) {
      setError("3-20 chars, lowercase letters, numbers, hyphens");
      return;
    }

    setError(null);
    setIsCheckingUser(true);

    try {
      const res = await fetch(`/api/users/${cleaned}`);
      if (res.ok) {
        setMode("login");
      } else {
        setMode("signup");
      }
      setStep("password");
    } catch {
      setMode("signup");
      setStep("password");
    } finally {
      setIsCheckingUser(false);
    }
  }, [inputUsername]);

  // Step 2: Submit password — login or signup
  const handleSubmitPassword = useCallback(async () => {
    const cleaned = inputUsername.trim().toLowerCase();
    if (inputPassword.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setError(null);
    setStep("creating");

    try {
      if (mode === "login") {
        // Verify password against existing account
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: cleaned, password: inputPassword }),
        });
        if (!loginRes.ok) {
          if (loginRes.status === 401) {
            throw new Error("Wrong password");
          }
          const data = await loginRes.json();
          throw new Error(data.error ?? "Login failed");
        }
      } else {
        // Register new user
        const createRes = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: cleaned,
            address: "0x0",
            password: inputPassword,
          }),
        });
        if (!createRes.ok) {
          const data = await createRes.json();
          throw new Error(data.error ?? "Failed to create account");
        }
      }

      await connectWithPrivy(cleaned);

      // Show card reveal for new users, then go to choice
      if (mode === "signup") {
        setStep("card-reveal");
        setTimeout(() => setStep("choice"), 4000);
      } else {
        setStep("choice");
      }
    } catch (err) {
      console.error("Auth failed:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("password");
    }
  }, [inputUsername, inputPassword, mode, connectWithPrivy]);

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
      <div className="flex min-h-screen items-center justify-center bg-[#FDFDFD]">
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
      <AmbientBackground />

      <div className="relative flex min-h-screen flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {/* Welcome */}
          {step === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -30, filter: "blur(8px)" }}
              transition={{ duration: 0.7, ease }}
              className="flex w-full max-w-sm flex-col items-center text-center"
            >
              <motion.div
                initial={{ scale: 0.3 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 18 }}
                className="mb-12"
              >
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 8px 32px rgba(0,0,0,0.12), 0 0 0 0 rgba(245, 158, 11, 0)",
                      "0 8px 32px rgba(0,0,0,0.12), 0 0 60px 0 rgba(245, 158, 11, 0.2)",
                      "0 8px 32px rgba(0,0,0,0.12), 0 0 0 0 rgba(245, 158, 11, 0)",
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="flex h-24 w-24 items-center justify-center"
                >
                  <Logo size={80} />
                </motion.div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-[56px] font-semibold leading-none tracking-[-0.04em] text-zinc-900"
              >
                Hi.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="mt-4 text-[17px] text-zinc-500"
              >
                Let&apos;s create your tap card.
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep("username")}
                className="group mt-12 flex h-14 items-center gap-2.5 rounded-full bg-zinc-900 px-10 text-[15px] font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition-shadow hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)]"
              >
                Continue
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </motion.div>
          )}

          {/* Username step */}
          {step === "username" && (
            <motion.div
              key="username"
              initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -30, filter: "blur(8px)" }}
              transition={{ duration: 0.6, ease }}
              className="flex w-full max-w-sm flex-col items-center"
            >
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-[40px] font-semibold tracking-[-0.035em] text-zinc-900"
              >
                What&apos;s your name?
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-2 text-center text-[14px] text-zinc-500"
              >
                We&apos;ll find your card or create a new one
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-10 w-full"
              >
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
                    className="flex-1 border-0 bg-transparent py-4 text-[15px] font-medium text-zinc-900 placeholder:text-zinc-300 focus:outline-none"
                    autoFocus
                    maxLength={20}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && inputUsername.length >= 3) {
                        handleSubmitUsername();
                      }
                    }}
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5"
                  >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                    <p className="text-xs text-red-600">{error}</p>
                  </motion.div>
                )}
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmitUsername}
                disabled={inputUsername.length < 3 || isCheckingUser}
                className="group mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-zinc-900 text-[15px] font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                {isCheckingUser ? (
                  "Checking..."
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </motion.button>
            </motion.div>
          )}

          {/* Password step (signup or login) */}
          {step === "password" && (
            <motion.div
              key="password"
              initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -30, filter: "blur(8px)" }}
              transition={{ duration: 0.6, ease }}
              className="flex w-full max-w-sm flex-col items-center"
            >
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-[40px] font-semibold tracking-[-0.035em] text-zinc-900"
              >
                {mode === "login" ? "Welcome back" : "Set a password"}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-2 text-center text-[14px] text-zinc-500"
              >
                {mode === "login"
                  ? `Sign in to pulse/${inputUsername}`
                  : `Protect pulse/${inputUsername}`}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-10 w-full"
              >
                <input
                  type="password"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  placeholder={mode === "login" ? "Your password" : "Create password"}
                  className="card w-full !rounded-2xl px-5 py-4 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && inputPassword.length >= 4) {
                      handleSubmitPassword();
                    }
                  }}
                />

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5"
                  >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                    <p className="text-xs text-red-600">{error}</p>
                  </motion.div>
                )}
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmitPassword}
                disabled={inputPassword.length < 4}
                className="mt-4 flex h-14 w-full items-center justify-center rounded-full bg-zinc-900 text-[15px] font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                {mode === "login" ? "Sign in" : "Create account"}
              </motion.button>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={() => {
                  setStep("username");
                  setInputPassword("");
                  setError(null);
                }}
                className="mt-5 text-[12px] text-zinc-400 hover:text-zinc-600"
              >
                Use a different username
              </motion.button>
            </motion.div>
          )}

          {/* Creating — multi-stage sequence */}
          {step === "creating" && <CreatingSequence />}

          {/* Card reveal — the cinematic "unboxing" moment */}
          {step === "card-reveal" && (
            <CardReveal username={username || inputUsername} />
          )}

          {/* Choice — Dashboard or New Session */}
          {step === "choice" && (
            <motion.div
              key="choice"
              initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -30, filter: "blur(8px)" }}
              transition={{ duration: 0.6, ease }}
              className="flex w-full max-w-md flex-col items-center"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="mb-8 flex h-20 w-20 items-center justify-center"
              >
                <Logo size={72} />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center text-[40px] font-semibold tracking-[-0.035em] text-zinc-900"
              >
                {mode === "signup"
                  ? `Welcome, @${username}`
                  : `Welcome back, @${username}`}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-2 text-center text-[14px] text-zinc-500"
              >
                What would you like to do?
              </motion.p>

              <div className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                <motion.button
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep("title")}
                  className="card group flex flex-col items-start gap-3 !p-6 text-left transition-all hover:!shadow-[0_12px_32px_rgba(0,0,0,0.08)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center">
                    <Logo size={40} />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-zinc-900">
                      Start a session
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
                      Create a new live tipping session right now
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-zinc-900">
                    Get started
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </div>
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push("/dashboard")}
                  className="card group flex flex-col items-start gap-3 !p-6 text-left transition-all hover:!shadow-[0_12px_32px_rgba(0,0,0,0.08)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-zinc-100 transition-colors group-hover:bg-zinc-900">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-zinc-700 transition-colors group-hover:text-white"
                    >
                      <rect x="3" y="3" width="7" height="9" rx="1.5" />
                      <rect x="14" y="3" width="7" height="5" rx="1.5" />
                      <rect x="14" y="12" width="7" height="9" rx="1.5" />
                      <rect x="3" y="16" width="7" height="5" rx="1.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-zinc-900">
                      Open dashboard
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
                      Manage funds, view sessions, send tokens
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-zinc-900">
                    View funds
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Title */}
          {step === "title" && (
            <motion.div
              key="title"
              initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -30, filter: "blur(8px)" }}
              transition={{ duration: 0.6, ease }}
              className="flex w-full max-w-sm flex-col items-center"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="mb-8 flex h-20 w-20 items-center justify-center"
              >
                <Logo size={72} />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center text-[40px] font-semibold tracking-[-0.035em] text-zinc-900"
              >
                Name your session
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-2 text-center text-[14px] text-zinc-500"
              >
                What are you tipping for, @{username}?
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-10 w-full"
              >
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="e.g. Friday Night Stream"
                  className="card w-full !rounded-2xl px-5 py-4 text-[16px] font-medium text-zinc-900 placeholder:text-zinc-300 focus:outline-none"
                  autoFocus
                  maxLength={60}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && sessionTitle.trim().length > 0) {
                      handleStartSession();
                    }
                  }}
                />
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5"
                  >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                    <p className="text-xs text-red-600">{error}</p>
                  </motion.div>
                )}
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartSession}
                disabled={!sessionTitle.trim() || isCreatingSession}
                className="group mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-zinc-900 text-[15px] font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                {isCreatingSession ? (
                  "Starting..."
                ) : (
                  <>
                    Start Live Session
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-6 text-[10px] text-zinc-300"
        >
          Built with Starkzap v2 on Starknet
        </motion.p>
      </div>
    </div>
  );
}

// ── Cinematic card reveal with hologram sheen + magnetic particles ──
function CardReveal({ username }: { username: string }) {
  return (
    <motion.div
      key="card-reveal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="flex w-full max-w-md flex-col items-center text-center"
    >
      {/* Magnetic particle field */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2">
        {[...Array(24)].map((_, i) => {
          const angle = (i / 24) * Math.PI * 2;
          const startDistance = 250;
          const endDistance = 60 + Math.random() * 40;
          const startX = Math.cos(angle) * startDistance;
          const startY = Math.sin(angle) * startDistance;
          const endX = Math.cos(angle) * endDistance;
          const endY = Math.sin(angle) * endDistance;
          return (
            <motion.div
              key={i}
              initial={{
                x: startX,
                y: startY,
                opacity: 0,
                scale: 0,
              }}
              animate={{
                x: [startX, endX, endX],
                y: [startY, endY, endY],
                opacity: [0, 1, 0],
                scale: [0, 1, 0.5],
              }}
              transition={{
                delay: 0.3 + (i % 8) * 0.05,
                duration: 1.6,
                ease: [0.32, 0.72, 0, 1],
              }}
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-amber-400"
              style={{
                boxShadow: "0 0 8px rgba(245, 158, 11, 0.8)",
              }}
            />
          );
        })}
      </div>

      {/* The card */}
      <motion.div
        initial={{ y: 220, opacity: 0, rotateX: 35, scale: 0.7 }}
        animate={{ y: 0, opacity: 1, rotateX: 0, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 90,
          damping: 14,
          delay: 0.3,
        }}
        className="relative mb-10"
        style={{ perspective: 1200 }}
      >
        {/* Glowing aura behind card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 1 }}
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, transparent 70%)",
            filter: "blur(40px)",
            transform: "scale(1.5)",
          }}
        />

        <motion.div
          animate={{
            boxShadow: [
              "0 25px 60px rgba(0,0,0,0.18), 0 0 0 0 rgba(245, 158, 11, 0)",
              "0 25px 60px rgba(0,0,0,0.18), 0 0 90px 0 rgba(245, 158, 11, 0.35)",
              "0 25px 60px rgba(0,0,0,0.18), 0 0 0 0 rgba(245, 158, 11, 0)",
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative flex h-52 w-80 flex-col justify-between overflow-hidden rounded-[24px] bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-700 p-7 text-white"
        >
          {/* Hologram sheen sweep */}
          <motion.div
            initial={{ x: "-150%" }}
            animate={{ x: "150%" }}
            transition={{
              delay: 1,
              duration: 1.4,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)",
            }}
          />

          {/* Subtle grid pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />

          {/* Top row */}
          <div className="relative flex items-center justify-between">
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                delay: 0.8,
                type: "spring",
                stiffness: 200,
                damping: 18,
              }}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-amber-500/20 ring-1 ring-amber-400/40"
            >
              <Logo size={18} />
            </motion.div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400"
            >
              Tap Card · Live
            </motion.span>
          </div>

          {/* Bottom row */}
          <div className="relative">
            <motion.p
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4, duration: 0.6 }}
              className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400"
            >
              Pulse
            </motion.p>
            <motion.p
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.7, duration: 0.6 }}
              className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-white"
            >
              @{username}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 2, duration: 0.5 }}
              className="mt-3 h-[1px] w-full origin-left bg-gradient-to-r from-amber-400/50 via-amber-400/20 to-transparent"
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.2 }}
              className="mt-2 text-[10px] text-zinc-500"
            >
              Built on Starknet
            </motion.p>
          </div>
        </motion.div>
      </motion.div>

      {/* Caption */}
      <motion.p
        initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ delay: 2.1, duration: 0.7 }}
        className="text-[20px] font-semibold tracking-[-0.02em] text-zinc-900"
      >
        Your tap card is ready
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.3, duration: 0.7 }}
        className="mt-1.5 text-[13px] text-zinc-500"
      >
        Forged on Starknet · Argent SNIP-9 · Gasless
      </motion.p>
    </motion.div>
  );
}

// ── Multi-stage cinematic wallet creation sequence ──
function CreatingSequence() {
  const stages = [
    { label: "Connecting to Starknet", duration: 700 },
    { label: "Forging Argent wallet", duration: 1000 },
    { label: "Configuring AVNU paymaster", duration: 800 },
    { label: "Almost ready", duration: 500 },
  ];

  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let elapsed = 0;
    stages.forEach((s, i) => {
      elapsed += s.duration;
      setTimeout(() => {
        if (!cancelled) setActiveStage(Math.min(i + 1, stages.length - 1));
      }, elapsed);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      key="creating"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="flex w-full max-w-md flex-col items-center text-center"
    >
      {/* Animated logo with rotating ring */}
      <div className="relative mb-12 flex h-28 w-28 items-center justify-center">
        {/* Outer rotating ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <svg viewBox="0 0 112 112" className="h-full w-full">
            <circle
              cx="56"
              cy="56"
              r="52"
              fill="none"
              stroke="#E4E4E7"
              strokeWidth="2"
              strokeDasharray="4 8"
            />
          </svg>
        </motion.div>

        {/* Middle ring with progress */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2"
        >
          <svg viewBox="0 0 96 96" className="h-full w-full">
            <circle
              cx="48"
              cy="48"
              r="44"
              fill="none"
              stroke="url(#shimmer-grad)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="20 280"
            />
            <defs>
              <linearGradient id="shimmer-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0" />
                <stop offset="50%" stopColor="#F59E0B" stopOpacity="1" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>

        {/* Center logo with breathe */}
        <motion.div
          animate={{
            scale: [1, 1.06, 1],
            boxShadow: [
              "0 8px 32px rgba(0,0,0,0.12), 0 0 0 0 rgba(245, 158, 11, 0)",
              "0 8px 32px rgba(0,0,0,0.12), 0 0 60px 0 rgba(245, 158, 11, 0.3)",
              "0 8px 32px rgba(0,0,0,0.12), 0 0 0 0 rgba(245, 158, 11, 0)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="relative flex h-16 w-16 items-center justify-center"
        >
          <Logo size={56} />
        </motion.div>
      </div>

      {/* Stage list */}
      <div className="w-full space-y-2.5">
        {stages.map((stage, i) => {
          const isDone = i < activeStage;
          const isActive = i === activeStage;
          const isPending = i > activeStage;
          return (
            <motion.div
              key={stage.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{
                opacity: isPending ? 0.3 : 1,
                x: 0,
              }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                background: isActive ? "rgba(245, 158, 11, 0.06)" : "transparent",
              }}
            >
              {/* Status indicator */}
              <div className="relative h-5 w-5 shrink-0">
                {isDone && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3 w-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </motion.div>
                )}
                {isActive && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="h-5 w-5 rounded-full border-2 border-amber-200 border-t-amber-500"
                  />
                )}
                {isPending && (
                  <div className="h-5 w-5 rounded-full border border-zinc-200" />
                )}
              </div>

              {/* Label */}
              <p
                className={`text-[13px] font-medium ${
                  isActive
                    ? "text-zinc-900"
                    : isDone
                      ? "text-zinc-500"
                      : "text-zinc-400"
                }`}
              >
                {stage.label}
              </p>
            </motion.div>
          );
        })}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 text-center text-[11px] text-zinc-400"
      >
        Onchain · Gasless · Argent SNIP-9 · Powered by Starkzap
      </motion.p>
    </motion.div>
  );
}
