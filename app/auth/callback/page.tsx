"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

function decodeJwtPayload(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function CallbackHandler() {
  const router = useRouter();
  const [status, setStatus] = useState("Verifying credentials...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let authProcessed = false;

    async function syncBackendUser(userData: {
      supabaseId?: string;
      email?: string;
      name?: string;
      picture?: string;
      googleId?: string;
      token?: string;
    }) {
      if (authProcessed) return;
      authProcessed = true;

      if (isMounted) setStatus("Creating user profile and setting up session...");

      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to register account profile.");
        }

        const sessionToken = data.token || userData.token;
        if (sessionToken) {
          const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
          document.cookie = `block_social_jwt=${sessionToken}; path=/; max-age=2592000; SameSite=Lax; ${isHttps ? "Secure" : ""}`;
        }

        if (isMounted) setStatus("Welcome to Pulse! Redirecting...");
        setTimeout(() => {
          window.location.replace("/feed");
        }, 150);
      } catch (err: any) {
        console.error("Backend auth sync error:", err);
        if (isMounted) {
          setError(err.message || "Failed to finalize user registration.");
        }
      }
    }

    async function handleAuth() {
      try {
        const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
        const search = typeof window !== "undefined" ? window.location.search : "";

        const hashParams = new URLSearchParams(hash);
        const searchParams = new URLSearchParams(search);

        // 1. Check for URL errors from OAuth provider
        const urlError =
          searchParams.get("error_description") ||
          searchParams.get("error") ||
          hashParams.get("error_description") ||
          hashParams.get("error");

        if (urlError) {
          throw new Error(decodeURIComponent(urlError));
        }

        // 2. Immediate Hash Token extraction (Implicit Flow) - 0ms execution
        const hashAccessToken = hashParams.get("access_token");
        const hashRefreshToken = hashParams.get("refresh_token");

        if (hashAccessToken) {
          const payload = decodeJwtPayload(hashAccessToken);
          if (payload) {
            const userMeta = payload.user_metadata || {};
            await syncBackendUser({
              supabaseId: payload.sub,
              email: payload.email,
              name: userMeta.full_name || userMeta.name || payload.email?.split("@")[0] || "Pulse Member",
              picture: userMeta.avatar_url || userMeta.picture || "",
              googleId: payload.sub,
              token: hashAccessToken,
            });

            if (hashRefreshToken) {
              supabase.auth.setSession({
                access_token: hashAccessToken,
                refresh_token: hashRefreshToken,
              }).catch(() => {});
            }
            return;
          }
        }

        // 3. PKCE Authorization Code Exchange
        const code = searchParams.get("code");
        if (code) {
          setStatus("Exchanging authorization code...");
          try {
            const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
            if (!exchangeErr && data?.session?.user) {
              const u = data.session.user;
              await syncBackendUser({
                supabaseId: u.id,
                email: u.email,
                name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "Pulse Member",
                picture: u.user_metadata?.avatar_url || u.user_metadata?.picture || "",
                googleId: u.id,
                token: data.session.access_token,
              });
              return;
            }
          } catch (codeErr) {
            console.warn("PKCE exchange notice:", codeErr);
          }
        }

        // 4. Check existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const u = session.user;
          await syncBackendUser({
            supabaseId: u.id,
            email: u.email,
            name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "Pulse Member",
            picture: u.user_metadata?.avatar_url || u.user_metadata?.picture || "",
            googleId: u.id,
            token: session.access_token,
          });
          return;
        }

        // 5. Realtime Auth State Listener
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          if (currentSession?.user && !authProcessed) {
            const u = currentSession.user;
            await syncBackendUser({
              supabaseId: u.id,
              email: u.email,
              name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "Pulse Member",
              picture: u.user_metadata?.avatar_url || u.user_metadata?.picture || "",
              googleId: u.id,
              token: currentSession.access_token,
            });
          }
        });

        // 6. Safety fallback redirect to login if no auth params present
        setTimeout(() => {
          if (!authProcessed && isMounted) {
            if (!hashAccessToken && !code) {
              window.location.replace("/login");
            } else {
              setError("Authentication verification timed out. Please try signing in again.");
            }
          }
        }, 6000);

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (err: any) {
        console.error("Auth callback exception:", err);
        if (isMounted) {
          setError(err.message || "Failed to complete authentication.");
        }
      }
    }

    handleAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#070b14] text-white px-4">
      <div className="glass p-8 max-w-md w-full text-center space-y-6">
        {error ? (
          <div className="space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-red-400">Authentication Error</h2>
            <p className="text-sm text-gray-300 bg-red-950/40 p-3 rounded-lg border border-red-900/50 text-left font-mono break-words">
              {error}
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition border border-white/10"
              >
                <ArrowLeft className="w-4 h-4" /> Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-white tracking-wide">Signing You In</h2>
            <p className="text-sm text-slate-300">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#070b14] text-white">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
