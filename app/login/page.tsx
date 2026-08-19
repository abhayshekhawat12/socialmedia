"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../lib/authContext";
import { supabase } from "../../lib/supabase";
import { audioHaptics } from "../../lib/audioHaptics";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  User
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginStatus, errorNotice } = useAuth();

  // Mode: login or signup
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status & UI States
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Signing in...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [hasShakeError, setHasShakeError] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setErrorMessage(decodeURIComponent(errorParam));
      triggerShake();
    }
  }, [searchParams]);

  const triggerShake = () => {
    setHasShakeError(true);
    setTimeout(() => setHasShakeError(false), 500);
  };

  const resetMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleAuthSuccess = (data: { token: string; user: any }) => {
    audioHaptics.playLike();
    setSuccessMessage("Welcome to Pulse! Entering...");
    setIsExiting(true);

    try {
      const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
      document.cookie = `block_social_jwt=${data.token}; path=/; max-age=2592000; SameSite=Lax; ${isHttps ? "Secure" : ""}`;
    } catch (e) {
      console.warn("Cookie sync warning:", e);
    }

    setTimeout(() => {
      window.location.replace("/feed");
    }, 350);
  };

  // 1. Email + Password Submit (Login or Sign Up)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      triggerShake();
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      triggerShake();
      return;
    }

    setIsLoading(true);
    setLoadingText(isSigningUp ? "Creating account..." : "Signing in...");
    audioHaptics.playTap();

    try {
      const endpoint = isSigningUp ? "/api/auth/register" : "/api/auth/login";
      const payload: any = {
        identifier: email.trim().toLowerCase(),
        password,
      };
      if (isSigningUp && displayName.trim()) {
        payload.displayName = displayName.trim();
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Authentication failed. Please try again.");
      }

      handleAuthSuccess(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to authenticate.");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Google OAuth Flow
  const handleGoogleSignIn = async () => {
    resetMessages();
    setIsLoading(true);
    setLoadingText("Connecting to Google...");
    audioHaptics.playTap();

    try {
      const res = await fetch("/api/auth/google/url");
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }
    } catch (directErr) {
      console.warn("Direct Google OAuth warning:", directErr);
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (!error && data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch (supabaseErr: any) {
      console.warn("Supabase Google Auth warning:", supabaseErr);
    }

    setErrorMessage("Google Sign-In could not be initialized. Please check credentials.");
    triggerShake();
    setIsLoading(false);
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#eaf4ff] via-[#f4f9ff] to-[#ffffff] dark:from-[#070d18] dark:via-[#0c1424] dark:to-[#0f172a] text-slate-900 dark:text-white transition-colors duration-300">
      
      {/* Container Box with Sky-Blue Frosted Glass */}
      <div 
        className={`w-full max-w-md glass-card p-6 sm:p-8 rounded-[28px] border border-white/80 dark:border-white/10 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
          hasShakeError ? "animate-shake" : ""
        } ${isExiting ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
      >
        {/* Top App Branding */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#00B7FF] to-[#9B6CFF] text-white shadow-lg shadow-cyan-500/20 mb-1">
            <Sparkles className="w-7 h-7 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {isSigningUp ? "Create Account" : "Welcome to Pulse"}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
            {isSigningUp ? "Join the mobile creator network today" : "Sign in to connect, create, and explore"}
          </p>
        </div>

        {/* Global Error Notice */}
        {(errorMessage || errorNotice) && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs font-semibold animate-fadeIn">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="break-words flex-1">{errorMessage || errorNotice}</span>
          </div>
        )}

        {/* Global Success Notice */}
        {successMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Main Email Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Display Name Input (Only on Sign Up) */}
          {isSigningUp && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-1">
                Display Name
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-4 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Your Name (e.g. Alex Morgan)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-13 pl-11 pr-4 rounded-2xl glass-input text-slate-900 dark:text-white text-xs font-semibold outline-none border border-white/80 dark:border-white/10 focus:border-[#00B7FF] transition"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-1">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-4 w-4.5 h-4.5 text-slate-400" />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-13 pl-11 pr-4 rounded-2xl glass-input text-slate-900 dark:text-white text-xs font-semibold outline-none border border-white/80 dark:border-white/10 focus:border-[#00B7FF] transition"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-1">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 w-4.5 h-4.5 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-13 pl-11 pr-11 rounded-2xl glass-input text-slate-900 dark:text-white text-xs font-semibold outline-none border border-white/80 dark:border-white/10 focus:border-[#00B7FF] transition"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-13 mt-2 rounded-2xl bg-gradient-to-r from-[#00B7FF] via-[#7EDBE8] to-[#9B6CFF] text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-cyan-500/25 flex items-center justify-center gap-2 hover:opacity-95 transition-all btn-tactile cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin text-slate-950" />
                <span>{loginStatus || loadingText}</span>
              </>
            ) : (
              <span>{isSigningUp ? "Create Account 🚀" : "Sign In"}</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-[1px] bg-slate-200/80 dark:bg-white/10" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            or continue with
          </span>
          <div className="flex-1 h-[1px] bg-slate-200/80 dark:bg-white/10" />
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full h-13 rounded-2xl glass-pill hover:bg-white/90 dark:hover:bg-slate-800/90 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center gap-2.5 transition btn-tactile cursor-pointer border border-white/80 dark:border-white/10 shadow-sm disabled:opacity-50"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
            alt="Google"
            className="w-4.5 h-4.5"
          />
          <span>Continue with Google</span>
        </button>

        {/* Toggle between Sign In & Sign Up */}
        <div className="pt-5 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
          <span>{isSigningUp ? "Already have an account? " : "Don't have an account? "}</span>
          <button
            type="button"
            onClick={() => {
              audioHaptics.playTap();
              setIsSigningUp(!isSigningUp);
              resetMessages();
            }}
            className="bg-gradient-to-r from-[#00B7FF] to-[#F45AA8] bg-clip-text text-transparent font-black hover:underline cursor-pointer ml-1"
          >
            {isSigningUp ? "Sign In" : "Sign Up"}
          </button>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-xs text-slate-400">Loading Pulse...</div>}>
      <LoginForm />
    </Suspense>
  );
}
