import "./globals.css";
import React from "react";
import type { Metadata } from "next";
import { ThemeProvider } from "../lib/themeContext";
import { AuthProvider } from "../lib/authContext";
import { SettingsProvider } from "../lib/settingsContext";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { AppShell } from "../components/AppShell";
import { PageTransition } from "../components/PageTransition";

export const metadata: Metadata = {
  title: "Aura - Modern Social Media Experience",
  description: "Next-generation social media platform with frosted glassmorphism, instant stories, pulse reels, feed, and vibrant creator communities.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light h-[100dvh] overflow-hidden">
      <body className="h-[100dvh] max-h-[100dvh] w-full bg-[#E8FAFC] dark:bg-[#070b12] text-[#101820] dark:text-slate-100 flex justify-center items-center overflow-hidden relative selection:bg-cyan-200">
        
        {/* Soft Atmospheric Background Ambient Light Blobs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          {/* Cyan Glow Top Left */}
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#CDEFF4] dark:bg-cyan-950/40 blur-[90px] opacity-70 animate-float-slow" />
          
          {/* Soft Pink Glow Top Right */}
          <div className="absolute top-12 -right-24 w-80 h-80 rounded-full bg-[#FFD6E8] dark:bg-pink-950/30 blur-[85px] opacity-60 animate-float-reverse" />
          
          {/* Subtle Purple / Orange Glow Bottom */}
          <div className="absolute -bottom-32 left-1/3 w-[32rem] h-[32rem] rounded-full bg-[#E2DBFF] dark:bg-purple-950/30 blur-[100px] opacity-60 animate-float-slow" />
          
          {/* Soft Orange Glow Accent */}
          <div className="absolute bottom-20 -left-20 w-72 h-72 rounded-full bg-[#FFE5D6] dark:bg-amber-950/20 blur-[80px] opacity-50 animate-float-reverse" />
        </div>

        <ThemeProvider>
          <AuthProvider>
            <SettingsProvider>
              {/* Floating Frosted Glass App Shell Container */}
              <div className="w-full max-w-[440px] h-[100dvh] sm:h-[94vh] sm:max-h-[900px] glass-panel sm:rounded-[36px] shadow-glass border border-white/60 dark:border-white/10 flex flex-col relative overflow-hidden z-10">
                <AppShell>
                  <Navbar />
                  <main className="flex-1 px-3.5 py-3 overflow-y-auto no-scrollbar relative min-h-0">
                    <PageTransition>
                      {children}
                    </PageTransition>
                  </main>
                  <BottomNavigation />
                </AppShell>
              </div>
            </SettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
