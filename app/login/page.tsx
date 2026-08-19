"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/authContext";
import { auth, googleProvider, hasFirebase } from "../../lib/firebase";
import { FirebaseDiagnostics } from "../../components/FirebaseDiagnostics";
import { 
  Smartphone, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  KeyRound,
  ShieldCheck, 
  ChevronDown,
  Search, 
  Mail,
  User,
  Sparkles
} from "lucide-react";

interface CountryCode {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

const POPULAR_COUNTRIES: CountryCode[] = [
  { name: "United States", code: "US", dialCode: "+1", flag: "🇺🇸" },
  { name: "India", code: "IN", dialCode: "+91", flag: "🇮🇳" },
  { name: "United Kingdom", code: "GB", dialCode: "+44", flag: "🇬🇧" },
  { name: "Canada", code: "CA", dialCode: "+1", flag: "🇨🇦" },
  { name: "Australia", code: "AU", dialCode: "+61", flag: "🇦🇺" },
  { name: "Germany", code: "DE", dialCode: "+49", flag: "🇩🇪" },
  { name: "France", code: "FR", dialCode: "+33", flag: "🇫🇷" },
  { name: "Japan", code: "JP", dialCode: "+81", flag: "🇯🇵" },
  { name: "United Arab Emirates", code: "AE", dialCode: "+971", flag: "🇦🇪" },
  { name: "Singapore", code: "SG", dialCode: "+65", flag: "🇸🇬" },
  { name: "Brazil", code: "BR", dialCode: "+55", flag: "🇧🇷" },
  { name: "Nigeria", code: "NG", dialCode: "+234", flag: "🇳🇬" },
  { name: "South Africa", code: "ZA", dialCode: "+27", flag: "🇿🇦" },
  { name: "South Korea", code: "KR", dialCode: "+82", flag: "🇰🇷" },
  { name: "Spain", code: "ES", dialCode: "+34", flag: "🇪🇸" },
  { name: "Italy", code: "IT", dialCode: "+39", flag: "🇮🇹" },
  { name: "Netherlands", code: "NL", dialCode: "+31", flag: "🇳🇱" },
  { name: "Mexico", code: "MX", dialCode: "+52", flag: "🇲🇽" },
  { name: "Indonesia", code: "ID", dialCode: "+62", flag: "🇮🇩" },
  { name: "Saudi Arabia", code: "SA", dialCode: "+966", flag: "🇸🇦" },
];

export default function LoginPage() {
  const router = useRouter();
  const { loginStatus, errorNotice } = useAuth();

  // State management
  const [authMode, setAuthMode] = useState<"options" | "google_modal" | "mobile" | "otp">("options");
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(POPULAR_COUNTRIES[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Firebase verification states
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const recaptchaVerifierRef = useRef<any>(null);
  const isDev = process.env.NODE_ENV !== "production";

  // Cleanup ReCAPTCHA on component unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        } catch (e) {
          console.warn("ReCAPTCHA cleanup warning:", e);
        }
      }
    };
  }, []);

  // Handle mobile countdown timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const resetMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // 1. GOOGLE AUTHENTICATION FLOW
  const handleGoogleClick = async () => {
    resetMessages();

    // If Firebase is active and configured, use official Firebase Google popup
    if (hasFirebase && auth && googleProvider) {
      setIsLoading(true);
      try {
        const { signInWithPopup } = await import("firebase/auth");
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        if (!user || !user.email) {
          throw new Error("No verified email returned from Google authentication.");
        }

        await completeBackendGoogleLogin({
          email: user.email,
          name: user.displayName || user.email.split("@")[0],
          picture: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.email)}`,
          googleId: user.uid,
        });
      } catch (err: any) {
        if (isDev) console.error("Google OAuth error:", err);
        if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
          setErrorMessage("Google Sign-In window was closed before completing.");
        } else if (err.code === "auth/unauthorized-domain") {
          setErrorMessage("This domain is not authorized in Firebase Console.");
        } else {
          setErrorMessage(err.message || "Google authentication failed.");
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      // Direct Google Account Dialog
      setAuthMode("google_modal");
    }
  };

  const completeBackendGoogleLogin = async (payload: { email: string; name: string; picture?: string; googleId?: string }) => {
    setIsLoading(true);
    resetMessages();
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payload.email.trim(),
          name: payload.name.trim(),
          picture: payload.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(payload.email)}`,
          googleId: payload.googleId || `g_uid_${Math.abs(payload.email.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0))}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to establish user session.");
      }

      setSuccessMessage("Signed in successfully!");
      localStorage.setItem("block_social_jwt", data.token);
      localStorage.setItem("block_social_account", data.user.walletAddress || data.user.id);

      setTimeout(() => {
        window.location.href = "/feed";
      }, 400);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to authenticate Google account.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail || !googleName) {
      setErrorMessage("Please enter your Google email and name.");
      return;
    }
    completeBackendGoogleLogin({
      email: googleEmail,
      name: googleName,
    });
  };

  // 2. PHONE SMS OTP FLOW
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanNumber = mobileNumber.replace(/\D/g, "");
    if (cleanNumber.length < 6) {
      setErrorMessage("Please enter a valid phone number.");
      return;
    }

    const fullPhoneNumber = `${selectedCountry.dialCode}${cleanNumber}`;
    setIsLoading(true);

    if (hasFirebase && auth) {
      try {
        const { signInWithPhoneNumber, RecaptchaVerifier } = await import("firebase/auth");
        if (!recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-verifier-container", {
            size: "invisible",
            callback: () => {
              if (isDev) console.log("ReCAPTCHA verified");
            }
          });
        }

        const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, recaptchaVerifierRef.current);
        setConfirmationResult(confirmation);
        setSuccessMessage(`Verification SMS sent to ${fullPhoneNumber}`);
        setAuthMode("otp");
        setResendTimer(60);
      } catch (err: any) {
        if (isDev) console.error("Firebase SMS Send error:", err);
        setErrorMessage(err.message || "Failed to send SMS OTP.");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Backend Database OTP Service
      try {
        const res = await fetch("/api/auth/mobile/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobileNumber: fullPhoneNumber }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to send OTP code.");

        setSuccessMessage(`Verification code sent to ${fullPhoneNumber}`);
        setAuthMode("otp");
        setResendTimer(60);
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to generate mobile OTP.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMessage("Please enter the 6-digit verification code.");
      return;
    }

    const cleanNumber = mobileNumber.replace(/\D/g, "");
    const fullPhoneNumber = `${selectedCountry.dialCode}${cleanNumber}`;

    setIsLoading(true);

    if (hasFirebase && confirmationResult) {
      try {
        const result = await confirmationResult.confirm(otpCode.trim());
        const user = result.user;

        if (!user || !user.phoneNumber) {
          throw new Error("No phone number returned by authentication provider.");
        }

        const res = await fetch("/api/auth/mobile/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mobileNumber: user.phoneNumber,
            otp: "firebase_provider_verified",
            isFirebase: true
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to synchronize profile.");

        setSuccessMessage("Phone verified successfully!");
        localStorage.setItem("block_social_jwt", data.token);
        localStorage.setItem("block_social_account", data.user.walletAddress || data.user.id);

        setTimeout(() => {
          window.location.href = "/feed";
        }, 400);
      } catch (err: any) {
        setErrorMessage(err.message || "Incorrect OTP code. Please try again.");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Backend Database OTP Verification
      try {
        const res = await fetch("/api/auth/mobile/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mobileNumber: fullPhoneNumber,
            otp: otpCode.trim()
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "OTP verification failed.");

        setSuccessMessage("Phone verified successfully!");
        localStorage.setItem("block_social_jwt", data.token);
        localStorage.setItem("block_social_account", data.user.walletAddress || data.user.id);

        setTimeout(() => {
          window.location.href = "/feed";
        }, 400);
      } catch (err: any) {
        setErrorMessage(err.message || "Invalid OTP code entered.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const filteredCountries = POPULAR_COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) || 
    c.dialCode.includes(countrySearchQuery) ||
    c.code.toLowerCase().includes(countrySearchQuery.toLowerCase())
  );

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      {/* Invisible Recaptcha DOM Anchor */}
      <div id="recaptcha-verifier-container"></div>

      {/* Header Aura Branding */}
      <div className="text-center space-y-2 mb-6">
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-[#00B7FF] via-[#36C4FF] to-indigo-600 p-0.5 mx-auto shadow-xl shadow-[#00B7FF]/15 flex items-center justify-center">
          <div className="w-full h-full rounded-[22px] bg-slate-900 flex items-center justify-center text-white font-black text-2xl tracking-tighter">
            a
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Sign In to Aura</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Welcome back to the modern social experience</p>
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

        {isLoading && (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 font-bold text-xs">
            <Loader2 className="w-7 h-7 animate-spin text-[#00B7FF]" />
            <span>{loginStatus || "Verifying credentials..."}</span>
          </div>
        )}

        {!isLoading && (
          <>
            {/* VIEW 1: AUTHENTICATION OPTIONS */}
            {authMode === "options" && (
              <div className="space-y-3">
                
                {/* 1. Continue with Google */}
                <button
                  onClick={handleGoogleClick}
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

              </div>
            )}

            {/* VIEW 2: DIRECT GOOGLE ACCOUNT DIALOG */}
            {authMode === "google_modal" && (
              <div className="space-y-4 animate-in fade-in text-left">
                <button 
                  onClick={() => { setAuthMode("options"); resetMessages(); }}
                  className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to options
                </button>

                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <img 
                      src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
                      alt="Google" 
                      className="w-4 h-4"
                    />
                    <span>Google Account Sign-In</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Enter your Google Account details to link your profile.
                  </p>
                </div>

                <form onSubmit={handleManualGoogleSubmit} className="space-y-3">
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Display Name (e.g. Alex Rivera)"
                      value={googleName}
                      onChange={(e) => setGoogleName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-xs outline-none focus:border-[#00B7FF] font-semibold transition-colors"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="Google Email (e.g. alex@gmail.com)"
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-xs outline-none focus:border-[#00B7FF] font-semibold transition-colors"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-2xl bg-[#00B7FF] hover:bg-[#00B7FF]/90 text-slate-950 font-extrabold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Continue with Google
                  </button>
                </form>
              </div>
            )}

            {/* VIEW 3: PHONE NUMBER & COUNTRY CODE PICKER */}
            {authMode === "mobile" && (
              <div className="space-y-4 animate-in fade-in text-left">
                <button 
                  onClick={() => { setAuthMode("options"); resetMessages(); }}
                  className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to options
                </button>

                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">Phone Authentication</h3>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Enter your mobile number to receive a verification code.
                  </p>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-3">
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
                        placeholder="Phone Number (e.g. 9876543210)"
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
                    Send Verification Code
                  </button>
                </form>
              </div>
            )}

            {/* VIEW 4: OTP VERIFICATION */}
            {authMode === "otp" && (
              <div className="space-y-4 animate-in fade-in text-left">
                <button 
                  onClick={() => { setAuthMode("mobile"); resetMessages(); }}
                  className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Change phone number
                </button>

                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">Enter Verification Code</h3>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Enter the 6-digit code sent to <span className="font-bold text-[#00B7FF]">{selectedCountry.dialCode} {mobileNumber}</span>.
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-3">
                  <div className="relative flex items-center">
                    <KeyRound className="absolute left-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="• • • • • •"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
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
                    Verify & Continue
                  </button>

                  <div className="pt-2 flex justify-between items-center text-[10px] text-slate-400 font-semibold uppercase">
                    <span>Resend in:</span>
                    {resendTimer > 0 ? (
                      <span className="font-mono text-cyan-500 font-extrabold">{resendTimer}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-[#00B7FF] hover:underline font-extrabold cursor-pointer"
                      >
                        Resend code
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </>
        )}

        {/* Developer Diagnostics Panel (Local development only) */}
        <FirebaseDiagnostics />

      </div>

    </div>
  );
}
