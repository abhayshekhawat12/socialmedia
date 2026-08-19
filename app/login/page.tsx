"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../lib/authContext";
import { auth, googleProvider, hasFirebase } from "../../lib/firebase";
import { FirebaseDiagnostics } from "../../components/FirebaseDiagnostics";
import { 
  Smartphone, 
  Mail, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  KeyRound,
  ChevronDown,
  Search, 
  ShieldCheck,
  Sparkles
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

  // Navigation / Modes: "options" | "mobile" | "mobile_otp" | "email" | "email_otp"
  const [authMode, setAuthMode] = useState<"options" | "mobile" | "mobile_otp" | "email" | "email_otp">("options");

  // Mobile Auth States
  const [mobileNumber, setMobileNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(POPULAR_COUNTRIES[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [mobileResendTimer, setMobileResendTimer] = useState(0);

  // Email Auth States
  const [emailAddress, setEmailAddress] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailResendTimer, setEmailResendTimer] = useState(0);

  // Common UI States
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Processing...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Firebase Ref (optional fallback)
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const recaptchaVerifierRef = useRef<any>(null);

  // URL Error notification (e.g. from Google OAuth callback)
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setErrorMessage(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  // Timers
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

  const resetMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleAuthSuccess = (data: { token: string; user: any }) => {
    try {
      localStorage.setItem("block_social_jwt", data.token);
      localStorage.setItem("block_social_account", data.user.walletAddress || data.user.id);
      if (data.user.profile) {
        localStorage.setItem("block_social_cached_profile", JSON.stringify(data.user.profile));
      }
    } catch (e) {}

    setSuccessMessage("Signed in successfully! Redirecting...");
    setTimeout(() => {
      window.location.href = "/feed";
    }, 400);
  };

  // ============================================================================
  // 1. GOOGLE OAUTH FLOW
  // ============================================================================
  const handleGoogleSignIn = async () => {
    resetMessages();
    setIsLoading(true);
    setLoadingText("Connecting to Google...");

    // Check Firebase Google popup if Firebase is active
    if (hasFirebase && auth && googleProvider) {
      try {
        const { signInWithPopup } = await import("firebase/auth");
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        if (!user || !user.email) {
          throw new Error("No verified email returned from Google authentication.");
        }

        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email.trim(),
            name: user.displayName || user.email.split("@")[0],
            picture: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.email)}`,
            googleId: user.uid,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to authenticate with Google.");

        handleAuthSuccess(data);
        return;
      } catch (err: any) {
        if (err.code === "auth/popup-closed-by-user") {
          setIsLoading(false);
          return;
        }
        // Fall back to server-side Google OAuth 2.0 flow
      }
    }

    // Official Server-Side Google OAuth 2.0 Redirect Flow
    try {
      const res = await fetch("/api/auth/google/url");
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Google Sign-In is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
      }

      window.location.href = data.url;
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to initiate Google sign-in.");
      setIsLoading(false);
    }
  };

  // ============================================================================
  // 2. MOBILE NUMBER + REAL SMS OTP FLOW
  // ============================================================================
  const handleSendMobileOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    resetMessages();

    const cleanDigits = mobileNumber.replace(/\D/g, "");
    if (cleanDigits.length < 7) {
      setErrorMessage("Please enter a valid phone number.");
      return;
    }

    const fullPhoneNumber = `${selectedCountry.dialCode}${cleanDigits}`;
    setIsLoading(true);
    setLoadingText("Sending SMS verification code...");

    // Try Firebase Phone Auth if enabled, otherwise backend SMS service (Twilio/MSG91/Fast2SMS)
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
        console.warn("Firebase Phone Auth error, falling back to server SMS service:", err);
      }
    }

    try {
      const res = await fetch("/api/auth/mobile/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNumber: fullPhoneNumber }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send SMS OTP.");
      }

      setSuccessMessage(`Verification code sent to ${fullPhoneNumber}`);
      setAuthMode("mobile_otp");
      setMobileResendTimer(60);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to deliver SMS verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!mobileOtp || mobileOtp.trim().length !== 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    const cleanDigits = mobileNumber.replace(/\D/g, "");
    const fullPhoneNumber = `${selectedCountry.dialCode}${cleanDigits}`;

    setIsLoading(true);
    setLoadingText("Verifying SMS code...");

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
        setErrorMessage(err.message || "Incorrect verification code. Please try again.");
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
      if (!res.ok) {
        throw new Error(data.error || "Invalid verification code.");
      }

      handleAuthSuccess(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // 3. EMAIL/GMAIL + REAL EMAIL OTP FLOW
  // ============================================================================
  const handleSendEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    resetMessages();

    const cleanEmail = emailAddress.toLowerCase().trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage("Please enter a valid email address (e.g. name@gmail.com).");
      return;
    }

    setIsLoading(true);
    setLoadingText("Sending verification email...");

    try {
      const res = await fetch("/api/auth/email/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send email verification code.");
      }

      setSuccessMessage(`Verification code sent to ${cleanEmail}`);
      setAuthMode("email_otp");
      setEmailResendTimer(60);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to deliver verification email.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!emailOtp || emailOtp.trim().length !== 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    const cleanEmail = emailAddress.toLowerCase().trim();
    setIsLoading(true);
    setLoadingText("Verifying email code...");

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
      if (!res.ok) {
        throw new Error(data.error || "Invalid verification code.");
      }

      handleAuthSuccess(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Verification failed.");
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
    <div className="max-w-md mx-auto py-10 px-4">
      {/* Invisible Recaptcha DOM Anchor for Firebase */}
      <div id="recaptcha-verifier-container"></div>

      {/* Header Branding */}
      <div className="text-center space-y-2 mb-6">
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-[#00B7FF] via-[#36C4FF] to-indigo-600 p-0.5 mx-auto shadow-xl shadow-[#00B7FF]/15 flex items-center justify-center">
          <div className="w-full h-full rounded-[22px] bg-slate-900 flex items-center justify-center text-white font-black text-2xl tracking-tighter">
            a
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Sign In to Aura</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">The modern social ecosystem</p>
        </div>
      </div>

      {/* Login Card */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-md shadow-2xl p-6 sm:p-8 space-y-6">
        
        {/* Error Notification */}
        {(errorMessage || errorNotice) && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1 leading-normal">{errorMessage || errorNotice}</span>
          </div>
        )}

        {/* Success Notification */}
        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 font-bold text-xs">
            <Loader2 className="w-7 h-7 animate-spin text-[#00B7FF]" />
            <span>{loginStatus || loadingText}</span>
          </div>
        )}

        {!isLoading && (
          <>
            {/* VIEW 1: AUTHENTICATION OPTIONS */}
            {authMode === "options" && (
              <div className="space-y-3">
                {/* 1. Continue with Google */}
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full py-3.5 px-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01] cursor-pointer shadow-sm"
                >
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
                    alt="Google" 
                    className="w-4.5 h-4.5"
                  />
                  <span>Continue with Google</span>
                </button>

                {/* 2. Continue with Mobile Number */}
                <button
                  onClick={() => { setAuthMode("mobile"); resetMessages(); }}
                  className="w-full py-3.5 px-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01] cursor-pointer shadow-sm"
                >
                  <Smartphone className="w-4.5 h-4.5 text-[#00B7FF]" />
                  <span>Continue with Mobile Number</span>
                </button>

                {/* 3. Continue with Email OTP */}
                <button
                  onClick={() => { setAuthMode("email"); resetMessages(); }}
                  className="w-full py-3.5 px-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01] cursor-pointer shadow-sm"
                >
                  <Mail className="w-4.5 h-4.5 text-indigo-400" />
                  <span>Continue with Email OTP</span>
                </button>
              </div>
            )}

            {/* VIEW 2: PHONE NUMBER INPUT */}
            {authMode === "mobile" && (
              <div className="space-y-4 animate-in fade-in text-left">
                <button 
                  onClick={() => { setAuthMode("options"); resetMessages(); }}
                  className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to options
                </button>

                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">Mobile Number Sign-In</h3>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Enter your phone number to receive a 6-digit SMS verification code.
                  </p>
                </div>

                <form onSubmit={handleSendMobileOtp} className="space-y-3">
                  <div className="relative">
                    <div className="flex rounded-2xl border border-slate-200 dark:border-slate-800 bg-transparent overflow-hidden focus-within:border-[#00B7FF] transition-colors">
                      <button
                        type="button"
                        onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                        className="px-3 py-3.5 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                      >
                        <span className="text-base">{selectedCountry.flag}</span>
                        <span>{selectedCountry.dialCode}</span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </button>

                      <input
                        type="tel"
                        placeholder="Mobile Number (e.g. 9876543210)"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        className="flex-1 px-4 py-3.5 bg-transparent text-slate-800 dark:text-slate-100 text-xs outline-none font-semibold"
                        required
                        autoFocus
                      />
                    </div>

                    {isCountryDropdownOpen && (
                      <div className="absolute left-0 top-full mt-2 w-full max-h-60 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col">
                        <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                          <Search className="w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search country or code..."
                            value={countrySearchQuery}
                            onChange={(e) => setCountrySearchQuery(e.target.value)}
                            className="w-full text-xs bg-transparent text-slate-800 dark:text-white outline-none font-semibold"
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
                              className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
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
                    className="w-full py-3.5 rounded-2xl bg-[#00B7FF] hover:bg-[#00B7FF]/90 text-slate-950 font-extrabold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Send SMS OTP
                  </button>
                </form>
              </div>
            )}

            {/* VIEW 3: PHONE OTP VERIFICATION */}
            {authMode === "mobile_otp" && (
              <div className="space-y-4 animate-in fade-in text-left">
                <button 
                  onClick={() => { setAuthMode("mobile"); resetMessages(); }}
                  className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Change phone number
                </button>

                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">Enter SMS Code</h3>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Enter the 6-digit code sent to <span className="font-bold text-[#00B7FF]">{selectedCountry.dialCode} {mobileNumber}</span>.
                  </p>
                </div>

                <form onSubmit={handleVerifyMobileOtp} className="space-y-3">
                  <div className="relative flex items-center">
                    <KeyRound className="absolute left-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="• • • • • •"
                      value={mobileOtp}
                      onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-sm outline-none focus:border-[#00B7FF] transition-colors font-mono tracking-[0.4em] font-black text-center"
                      maxLength={6}
                      required
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Verify & Sign In
                  </button>

                  <div className="pt-2 flex justify-between items-center text-[10px] text-slate-400 font-semibold uppercase">
                    <span>Resend in:</span>
                    {mobileResendTimer > 0 ? (
                      <span className="font-mono text-cyan-500 font-extrabold">{mobileResendTimer}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendMobileOtp()}
                        className="text-[#00B7FF] hover:underline font-extrabold cursor-pointer"
                      >
                        Resend SMS code
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* VIEW 4: EMAIL ADDRESS INPUT */}
            {authMode === "email" && (
              <div className="space-y-4 animate-in fade-in text-left">
                <button 
                  onClick={() => { setAuthMode("options"); resetMessages(); }}
                  className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to options
                </button>

                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">Email OTP Sign-In</h3>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Enter your Gmail or email address to receive a secure 6-digit login code.
                  </p>
                </div>

                <form onSubmit={handleSendEmailOtp} className="space-y-3">
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="Email address (e.g. alex@gmail.com)"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-xs outline-none focus:border-indigo-400 font-semibold transition-colors"
                      required
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Send Email OTP
                  </button>
                </form>
              </div>
            )}

            {/* VIEW 5: EMAIL OTP VERIFICATION */}
            {authMode === "email_otp" && (
              <div className="space-y-4 animate-in fade-in text-left">
                <button 
                  onClick={() => { setAuthMode("email"); resetMessages(); }}
                  className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Change email address
                </button>

                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">Enter Email Code</h3>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Enter the 6-digit code sent to <span className="font-bold text-indigo-400">{emailAddress}</span>.
                  </p>
                </div>

                <form onSubmit={handleVerifyEmailOtp} className="space-y-3">
                  <div className="relative flex items-center">
                    <KeyRound className="absolute left-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="• • • • • •"
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-sm outline-none focus:border-indigo-400 transition-colors font-mono tracking-[0.4em] font-black text-center"
                      maxLength={6}
                      required
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-400 hover:to-emerald-400 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Verify & Sign In
                  </button>

                  <div className="pt-2 flex justify-between items-center text-[10px] text-slate-400 font-semibold uppercase">
                    <span>Resend in:</span>
                    {emailResendTimer > 0 ? (
                      <span className="font-mono text-indigo-400 font-extrabold">{emailResendTimer}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendEmailOtp()}
                        className="text-indigo-400 hover:underline font-extrabold cursor-pointer"
                      >
                        Resend email code
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </>
        )}

        {/* Developer Diagnostics (Local development only) */}
        <FirebaseDiagnostics />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-xs text-slate-400">Loading Aura...</div>}>
      <LoginForm />
    </Suspense>
  );
}
