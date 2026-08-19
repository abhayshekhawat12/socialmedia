"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../lib/authContext";
import { supabase } from "../../lib/supabase";
import { auth, hasFirebase } from "../../lib/firebase";
import { audioHaptics } from "../../lib/audioHaptics";
import { 
  Smartphone, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  KeyRound,
  ChevronDown,
  Search, 
  Sparkles,
  Check
} from "lucide-react";

interface CountryCode {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

const POPULAR_COUNTRIES: CountryCode[] = [
  { name: "India", code: "IN", dialCode: "+91", flag: "🇮🇳" },
  { name: "United States", code: "US", dialCode: "+1", flag: "🇺🇸" },
  { name: "United Kingdom", code: "GB", dialCode: "+44", flag: "🇬🇧" },
  { name: "Canada", code: "CA", dialCode: "+1", flag: "🇨🇦" },
  { name: "Australia", code: "AU", dialCode: "+61", flag: "🇦🇺" },
  { name: "Germany", code: "DE", dialCode: "+49", flag: "🇩🇪" },
  { name: "France", code: "FR", dialCode: "+33", flag: "🇫🇷" },
  { name: "United Arab Emirates", code: "AE", dialCode: "+971", flag: "🇦🇪" },
  { name: "Singapore", code: "SG", dialCode: "+65", flag: "🇸🇬" },
  { name: "Japan", code: "JP", dialCode: "+81", flag: "🇯🇵" },
  { name: "Brazil", code: "BR", dialCode: "+55", flag: "🇧🇷" },
  { name: "Nigeria", code: "NG", dialCode: "+234", flag: "🇳🇬" },
  { name: "South Africa", code: "ZA", dialCode: "+27", flag: "🇿🇦" },
  { name: "South Korea", code: "KR", dialCode: "+82", flag: "🇰🇷" },
  { name: "Spain", code: "ES", dialCode: "+34", flag: "🇪🇸" },
  { name: "Italy", code: "IT", dialCode: "+39", flag: "🇮🇹" },
  { name: "Netherlands", code: "NL", dialCode: "+31", flag: "🇳🇱" },
  { name: "Saudi Arabia", code: "SA", dialCode: "+966", flag: "🇸🇦" },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginStatus, errorNotice } = useAuth();

  // Navigation mode: main (email/password/social) | mobile_phone | mobile_otp | email_phone | email_otp | signup
  const [authMode, setAuthMode] = useState<"main" | "mobile_phone" | "mobile_otp" | "email_input" | "email_otp" | "signup">("main");

  // Direct Credential States
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupDisplayName, setSignupDisplayName] = useState("");

  // Mobile Auth States
  const [mobileNumber, setMobileNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(POPULAR_COUNTRIES[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [mobileResendTimer, setMobileResendTimer] = useState(0);

  // Email OTP States
  const [emailAddress, setEmailAddress] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailResendTimer, setEmailResendTimer] = useState(0);

  // Status & Transition States
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Signing in...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [hasShakeError, setHasShakeError] = useState(false);

  // Firebase Phone Auth confirmation
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const recaptchaVerifierRef = useRef<any>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setErrorMessage(decodeURIComponent(errorParam));
      triggerShake();
    }
  }, [searchParams]);

  useEffect(() => {
    if (mobileResendTimer > 0) {
      const timer = setTimeout(() => setMobileResendTimer(mobileResendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [mobileResendTimer]);

  useEffect(() => {
    if (emailResendTimer > 0) {
      const timer = setTimeout(() => setEmailResendTimer(emailResendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailResendTimer]);

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
    setSuccessMessage("Welcome back! Entering Pulse...");
    setIsExiting(true);

    try {
      const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
      document.cookie = `block_social_jwt=${data.token}; path=/; max-age=2592000; SameSite=Lax; ${isHttps ? "Secure" : ""}`;
    } catch (e) {
      console.warn("Cookie sync warning:", e);
    }

    setTimeout(() => {
      window.location.replace("/feed");
    }, 450);
  };

  // 1. Direct Email/Mobile + Password Login / Signup
  const handleDirectCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!identifier.trim()) {
      setErrorMessage("Please enter your email or phone number.");
      triggerShake();
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      triggerShake();
      return;
    }

    setIsLoading(true);
    setLoadingText(isSigningUp ? "Creating your account..." : "Authenticating...");
    audioHaptics.playTap();

    try {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim());
      const cleanIdent = identifier.trim().toLowerCase();

      // If Supabase Auth is active, attempt Supabase sign-in
      if (supabase && isEmail) {
        if (isSigningUp) {
          const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
            email: cleanIdent,
            password,
            options: {
              data: {
                display_name: signupDisplayName || cleanIdent.split("@")[0],
              },
            },
          });
          if (signUpErr) throw signUpErr;
        } else {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: cleanIdent,
            password,
          });
          if (signInErr) {
            console.warn("Supabase auth fallback to database user verification:", signInErr.message);
          }
        }
      }

      // Check / Register in database
      const endpoint = isSigningUp ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: cleanIdent,
          password,
          displayName: signupDisplayName || cleanIdent.split("@")[0],
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || (isSigningUp ? "Account registration failed." : "Invalid credentials. Please try again."));
      }

      const authData = await res.json();
      handleAuthSuccess(authData);
    } catch (err: any) {
      console.error("Authentication error:", err);
      setErrorMessage(err.message || "Unable to sign in. Please verify your details.");
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

  // 3. Mobile SMS OTP Flow
  const handleSendMobileOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    resetMessages();

    const cleanDigits = mobileNumber.replace(/\D/g, "");
    if (cleanDigits.length < 7) {
      setErrorMessage("Please enter a valid mobile number.");
      triggerShake();
      return;
    }

    const fullPhoneNumber = `${selectedCountry.dialCode}${cleanDigits}`;
    setIsLoading(true);
    setLoadingText("Sending SMS code...");
    audioHaptics.playTap();

    if (hasFirebase && auth) {
      try {
        const { signInWithPhoneNumber, RecaptchaVerifier } = await import("firebase/auth");
        if (!recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-verifier-container", {
            size: "invisible",
          });
        }

        const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, recaptchaVerifierRef.current);
        setConfirmationResult(confirmation);
        setSuccessMessage(`SMS OTP sent to ${fullPhoneNumber}`);
        setAuthMode("mobile_otp");
        setMobileResendTimer(60);
        setIsLoading(false);
        return;
      } catch (err: any) {
        console.warn("Firebase Phone Auth fallback:", err);
      }
    }

    try {
      const res = await fetch("/api/auth/mobile/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNumber: fullPhoneNumber }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send SMS OTP.");

      setSuccessMessage(`Verification code sent to ${fullPhoneNumber}`);
      setAuthMode("mobile_otp");
      setMobileResendTimer(60);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to deliver SMS verification code.");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!mobileOtp || mobileOtp.trim().length !== 6) {
      setErrorMessage("Please enter the complete 6-digit code.");
      triggerShake();
      return;
    }

    const cleanDigits = mobileNumber.replace(/\D/g, "");
    const fullPhoneNumber = `${selectedCountry.dialCode}${cleanDigits}`;

    setIsLoading(true);
    setLoadingText("Verifying code...");
    audioHaptics.playTap();

    if (hasFirebase && confirmationResult) {
      try {
        const result = await confirmationResult.confirm(mobileOtp.trim());
        const user = result.user;

        const res = await fetch("/api/auth/mobile/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mobileNumber: user.phoneNumber || fullPhoneNumber,
            otp: "firebase_verified",
            isFirebase: true,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Verification failed.");

        handleAuthSuccess(data);
        return;
      } catch (err: any) {
        setErrorMessage(err.message || "Incorrect verification code.");
        triggerShake();
        setIsLoading(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/auth/mobile/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobileNumber: fullPhoneNumber,
          otp: mobileOtp.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid verification code.");

      handleAuthSuccess(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Verification failed.");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Email OTP Flow
  const handleSendEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    resetMessages();

    const cleanEmail = emailAddress.toLowerCase().trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage("Please enter a valid email address.");
      triggerShake();
      return;
    }

    setIsLoading(true);
    setLoadingText("Sending email code...");
    audioHaptics.playTap();

    try {
      const res = await fetch("/api/auth/email/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send email verification.");

      setSuccessMessage(`Verification code sent to ${cleanEmail}`);
      setAuthMode("email_otp");
      setEmailResendTimer(60);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send email code.");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!emailOtp || emailOtp.trim().length !== 6) {
      setErrorMessage("Please enter the 6-digit code.");
      triggerShake();
      return;
    }

    const cleanEmail = emailAddress.toLowerCase().trim();
    setIsLoading(true);
    setLoadingText("Verifying code...");
    audioHaptics.playTap();

    try {
      const res = await fetch("/api/auth/email/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          otp: emailOtp.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid verification code.");

      handleAuthSuccess(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Verification failed.");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCountries = POPULAR_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
      c.dialCode.includes(countrySearchQuery) ||
      c.code.toLowerCase().includes(countrySearchQuery.toLowerCase())
  );

  return (
    <div className={`w-full min-h-[100dvh] flex flex-col justify-between relative overflow-hidden select-none pb-safe pt-safe transition-all duration-500 ${
      isExiting ? "scale-95 opacity-0" : "scale-100 opacity-100"
    }`}>
      <div id="recaptcha-verifier-container"></div>

      {/* TOP BRAND AREA */}
      <div className="pt-6 sm:pt-8 pb-3 px-6 flex items-center justify-between z-20 animate-fadeIn">
        {/* Floating Minimal Glass Brand Capsule */}
        <div className="glass-dock px-3.5 py-1.5 rounded-full flex items-center gap-2 border border-white/80 dark:border-white/15 shadow-glass">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#00B7FF] via-[#7EDBE8] to-[#F45AA8] p-0.5 shadow-sm">
            <div className="w-full h-full rounded-full bg-white dark:bg-[#131b2e] flex items-center justify-center text-[#00B7FF]">
              <Sparkles className="w-3 h-3 fill-current" />
            </div>
          </div>
          <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white">
            Pulse
          </span>
        </div>

        <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 font-mono">
          2026 Mobile v3.2
        </span>
      </div>

      {/* MAIN FLOATING FROSTED-GLASS BOTTOM SHEET (78%–88% Viewport Height) */}
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col justify-end z-20 px-3 sm:px-4">
        
        <div
          className={`w-full rounded-t-[36px] rounded-b-[28px] sm:rounded-[36px] glass-card border border-white/90 dark:border-white/15 shadow-glass p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
            hasShakeError ? "animate-shake" : ""
          }`}
          style={{
            backdropFilter: "blur(35px)",
            WebkitBackdropFilter: "blur(35px)",
          }}
        >
          {/* Top Sheet Inner Highlight Rim */}
          <div className="absolute top-0 inset-x-8 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

          {/* Swipe / Grab Pill Indicator (Mobile Sheet Native Cue) */}
          <div className="w-12 h-1 rounded-full bg-slate-300/80 dark:bg-slate-700/80 mx-auto mb-4" />

          {/* Toast / Error Alert */}
          {(errorMessage || errorNotice) && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-bold flex items-start gap-2.5 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-tight">
                <span className="font-black block">Unable to proceed</span>
                <span className="text-[11px] opacity-90">{errorMessage || errorNotice}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* SCREEN 1: PRIMARY EMAIL/MOBILE + PASSWORD VIEW */}
          {authMode === "main" && (
            <div className="space-y-5 animate-fadeIn">
              {/* Header Title */}
              <div className="space-y-1 text-left">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  {isSigningUp ? "Create Account" : "Welcome Back"}
                </h1>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {isSigningUp ? "Join the future of social creator network" : "Sign in to continue your journey"}
                </p>
              </div>

              {/* Form Inputs */}
              <form onSubmit={handleDirectCredentialSubmit} className="space-y-3.5">
                {isSigningUp && (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Your Name (e.g. Alex Rivera)"
                      value={signupDisplayName}
                      onChange={(e) => setSignupDisplayName(e.target.value)}
                      className="w-full h-14 rounded-2xl glass-input px-4 text-xs font-semibold text-slate-900 dark:text-white outline-none border border-white/80 dark:border-white/10"
                      required
                    />
                  </div>
                )}

                {/* Email or Mobile Number Input */}
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-400">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type="text"
                    inputMode="email"
                    placeholder="Email or Mobile Number"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full h-14 rounded-2xl glass-input pl-12 pr-4 text-xs font-semibold text-slate-900 dark:text-white outline-none border border-white/80 dark:border-white/10 focus:border-[#00B7FF]"
                    required
                  />
                </div>

                {/* Password Input with Eye Toggle */}
                <div className="space-y-1.5">
                  <div className="relative flex items-center">
                    <div className="absolute left-4 text-slate-400">
                      <Lock className="w-4.5 h-4.5" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-14 rounded-2xl glass-input pl-12 pr-12 text-xs font-semibold text-slate-900 dark:text-white outline-none border border-white/80 dark:border-white/10 focus:border-[#00B7FF]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        audioHaptics.playTap();
                        setShowPassword(!showPassword);
                      }}
                      className="absolute right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>

                  {/* Forgot Password Link */}
                  {!isSigningUp && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          audioHaptics.playTap();
                          setAuthMode("email_input");
                        }}
                        className="text-[11px] font-bold text-[#00B7FF] hover:underline btn-tactile cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>

                {/* Primary CTA Sign In Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#00B7FF] via-[#7EDBE8] to-[#9B6CFF] text-slate-950 font-black text-sm shadow-md shadow-cyan-500/25 flex items-center justify-center gap-2 hover:opacity-95 transition-all btn-tactile cursor-pointer disabled:opacity-50"
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
              <div className="flex items-center gap-3">
                <div className="flex-1 h-[1px] bg-slate-200/80 dark:bg-white/10" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  or continue with
                </span>
                <div className="flex-1 h-[1px] bg-slate-200/80 dark:bg-white/10" />
              </div>

              {/* Alternative Auth Buttons */}
              <div className="space-y-2.5">
                {/* Google Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full h-13 rounded-2xl glass-pill hover:bg-white/90 dark:hover:bg-slate-800/90 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center gap-2.5 transition btn-tactile cursor-pointer border border-white/80 dark:border-white/10 shadow-sm"
                >
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                    alt="Google"
                    className="w-4.5 h-4.5"
                  />
                  <span>Continue with Google</span>
                </button>
              </div>

              {/* Bottom Toggle Sign In / Sign Up */}
              <div className="pt-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>{isSigningUp ? "Already have an account? " : "Don't have an account? "}</span>
                <button
                  type="button"
                  onClick={() => {
                    audioHaptics.playTap();
                    setIsSigningUp(!isSigningUp);
                    resetMessages();
                  }}
                  className="bg-gradient-to-r from-[#00B7FF] to-[#F45AA8] bg-clip-text text-transparent font-black hover:underline cursor-pointer"
                >
                  {isSigningUp ? "Sign In" : "Sign Up"}
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 2: MOBILE NUMBER INPUT */}
          {authMode === "mobile_phone" && (
            <div className="space-y-5 animate-slideUp text-left">
              <button
                type="button"
                onClick={() => {
                  audioHaptics.playTap();
                  setAuthMode("main");
                  resetMessages();
                }}
                className="flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer btn-tactile"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Mobile Number
                </h2>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Enter your number to receive a 6-digit SMS verification code.
                </p>
              </div>

              <form onSubmit={handleSendMobileOtp} className="space-y-4">
                <div className="relative">
                  <div className="flex h-14 rounded-2xl glass-input overflow-hidden border border-white/80 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                      className="px-3.5 bg-slate-100/60 dark:bg-slate-800/60 border-r border-slate-200/80 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <span className="text-base">{selectedCountry.flag}</span>
                      <span>{selectedCountry.dialCode}</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="Mobile Number"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="flex-1 px-4 bg-transparent text-slate-900 dark:text-white text-xs outline-none font-semibold"
                      required
                      autoFocus
                    />
                  </div>

                  {isCountryDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-full max-h-60 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden flex flex-col">
                      <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search country..."
                          value={countrySearchQuery}
                          onChange={(e) => setCountrySearchQuery(e.target.value)}
                          className="w-full text-xs bg-transparent text-slate-900 dark:text-white outline-none font-semibold"
                        />
                      </div>

                      <div className="overflow-y-auto max-h-48 divide-y divide-slate-100 dark:divide-slate-800/40">
                        {filteredCountries.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(c);
                              setIsCountryDropdownOpen(false);
                              setCountrySearchQuery("");
                            }}
                            className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-white/80 dark:hover:bg-slate-800/60 transition cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span>{c.flag}</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{c.name}</span>
                            </div>
                            <span className="font-mono font-bold text-cyan-500">{c.dialCode}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black text-xs shadow-md btn-tactile cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>{loadingText}</span>
                    </>
                  ) : (
                    <span>Send SMS Code</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* SCREEN 3: MOBILE OTP VERIFICATION */}
          {authMode === "mobile_otp" && (
            <div className="space-y-5 animate-slideUp text-left">
              <button
                type="button"
                onClick={() => {
                  audioHaptics.playTap();
                  setAuthMode("mobile_phone");
                  resetMessages();
                }}
                className="flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer btn-tactile"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Change phone number</span>
              </button>

              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Enter SMS Code
                </h2>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Sent to <span className="text-[#00B7FF]">{selectedCountry.dialCode} {mobileNumber}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyMobileOtp} className="space-y-4">
                <div className="relative flex items-center">
                  <KeyRound className="absolute left-4 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="• • • • • •"
                    value={mobileOtp}
                    onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full h-14 pl-12 pr-4 rounded-2xl glass-input text-slate-900 dark:text-white text-base font-mono tracking-[0.4em] font-black text-center outline-none border border-white/80 dark:border-white/10 focus:border-emerald-500"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xs shadow-md btn-tactile cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{loadingText}</span>
                    </>
                  ) : (
                    <span>Verify & Continue</span>
                  )}
                </button>

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-black uppercase">
                  <span>Resend in:</span>
                  {mobileResendTimer > 0 ? (
                    <span className="font-mono text-cyan-500 font-extrabold">{mobileResendTimer}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendMobileOtp()}
                      className="text-[#00B7FF] hover:underline font-black cursor-pointer"
                    >
                      Resend SMS code
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* SCREEN 4: EMAIL OTP INPUT */}
          {authMode === "email_input" && (
            <div className="space-y-5 animate-slideUp text-left">
              <button
                type="button"
                onClick={() => {
                  audioHaptics.playTap();
                  setAuthMode("main");
                  resetMessages();
                }}
                className="flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer btn-tactile"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Email Verification
                </h2>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Enter your email address to receive a secure 6-digit login code.
                </p>
              </div>

              <form onSubmit={handleSendEmailOtp} className="space-y-4">
                <div className="relative flex items-center">
                  <Mail className="absolute left-4 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="email"
                    inputMode="email"
                    placeholder="Email address (e.g. name@gmail.com)"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 rounded-2xl glass-input text-slate-900 dark:text-white text-xs font-semibold outline-none border border-white/80 dark:border-white/10 focus:border-purple-500"
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-black text-xs shadow-md btn-tactile cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{loadingText}</span>
                    </>
                  ) : (
                    <span>Send Email OTP</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* SCREEN 5: EMAIL OTP VERIFICATION */}
          {authMode === "email_otp" && (
            <div className="space-y-5 animate-slideUp text-left">
              <button
                type="button"
                onClick={() => {
                  audioHaptics.playTap();
                  setAuthMode("email_input");
                  resetMessages();
                }}
                className="flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer btn-tactile"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Change email address</span>
              </button>

              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Enter Email Code
                </h2>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Sent to <span className="text-purple-400 font-bold">{emailAddress}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
                <div className="relative flex items-center">
                  <KeyRound className="absolute left-4 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="• • • • • •"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full h-14 pl-12 pr-4 rounded-2xl glass-input text-slate-900 dark:text-white text-base font-mono tracking-[0.4em] font-black text-center outline-none border border-white/80 dark:border-white/10 focus:border-purple-500"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-purple-500 to-emerald-500 text-white font-black text-xs shadow-md btn-tactile cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{loadingText}</span>
                    </>
                  ) : (
                    <span>Verify & Continue</span>
                  )}
                </button>

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-black uppercase">
                  <span>Resend in:</span>
                  {emailResendTimer > 0 ? (
                    <span className="font-mono text-purple-400 font-extrabold">{emailResendTimer}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendEmailOtp()}
                      className="text-purple-400 hover:underline font-black cursor-pointer"
                    >
                      Resend email code
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-xs text-slate-400">Loading Pulse Mobile...</div>}>
      <LoginForm />
    </Suspense>
  );
}
