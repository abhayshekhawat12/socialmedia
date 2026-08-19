"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

function CallbackHandler() {
  const router = useRouter();
  const [status, setStatus] = useState("Verifying Google credentials...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let authProcessed = false;

    async function processUser(user: any) {
      if (authProcessed) return;
      authProcessed = true;

      if (isMounted) setStatus("Connecting account and setting up profile...");

      const email = user.email || "";
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Aura Member";
      const picture =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email || user.id)}`;
      const googleId =
        user.identities?.find((i: any) => i.provider === "google")?.id ||
        user.user_metadata?.provider_id ||
        user.user_metadata?.sub ||
        user.id;

      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name,
            picture,
            googleId,
            supabaseId: user.id,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to link user profile to database.");
        }

        // Store session cookie for server components & authContext
        try {
          const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
          document.cookie = `block_social_jwt=${data.token}; path=/; max-age=2592000; SameSite=Lax; ${isHttps ? "Secure" : ""}`;
        } catch {}

        if (isMounted) setStatus("Authentication successful! Redirecting to feed...");
        setTimeout(() => {
          window.location.replace("/feed");
        }, 250);
      } catch (postErr: any) {
        console.error("Backend auth sync error:", postErr);
        if (isMounted) {
          setError(postErr.message || "Failed to establish session on backend server.");
        }
      }
    }

    async function handleAuth() {
      try {
        // 1. Check URL parameters for OAuth errors
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

        const urlError =
          searchParams.get("error_description") ||
          searchParams.get("error") ||
          hashParams.get("error_description") ||
          hashParams.get("error");

        if (urlError) {
          throw new Error(decodeURIComponent(urlError));
        }

        // 2. Check for PKCE Authorization Code
        const code = searchParams.get("code");
        if (code) {
          setStatus("Exchanging authorization code with Supabase...");
          try {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              console.warn("PKCE code exchange notice:", exchangeError.message);
            } else if (data?.session?.user) {
              await processUser(data.session.user);
              return;
            }
          } catch (codeErr) {
            console.warn("Code exchange attempt:", codeErr);
          }
        }

        // 3. Check for existing Supabase session (e.g. from Hash tokens)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.warn("Session check notice:", sessionError.message);
        }

        if (session?.user) {
          await processUser(session.user);
          return;
        }

        // 4. Listen for auth state change
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          if (currentSession?.user && !authProcessed) {
            await processUser(currentSession.user);
          }
        });

        // 5. Safety timeout to prevent infinite hanging
        setTimeout(() => {
          if (!authProcessed && isMounted) {
            setError(
              "Authentication timed out. The session could not be verified automatically."
            );
          }
        }, 8000);

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (err: any) {
        console.error("Supabase Google Auth Callback error:", err);
        if (isMounted) {
          setError(err.message || "Failed to complete Google authentication.");
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
            <h2 className="text-xl font-bold text-white tracking-wide">Google Sign-In</h2>
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
