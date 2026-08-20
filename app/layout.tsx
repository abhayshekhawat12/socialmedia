import "./globals.css";
import React from "react";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "../lib/themeContext";
import { AuthProvider } from "../lib/authContext";
import { Web3Provider } from "../lib/web3/web3Context";
import { SettingsProvider } from "../lib/settingsContext";
import { PWAProvider } from "../components/PWAProvider";
import { AuthGuard } from "../components/AuthGuard";
import { CallListenerProvider } from "../components/CallListenerProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#070b14",
};

export const metadata: Metadata = {
  title: "Pulse — Modern Mobile Social PWA",
  description: "Next-generation 2026 mobile creator social network with frosted glass cards, soft aurora gradients, instant stories, vertical reels, and realtime messaging.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pulse",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="bg-[#F3F7FA] dark:bg-[#070b14] text-[#0F172A] dark:text-slate-100 min-h-[100dvh] relative overflow-x-hidden selection:bg-cyan-200 antialiased">
        
        {/* Soft Atmospheric Background Ambient Light Blobs (Aurora UI) */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          {/* Luminous Cyan Glow Top Left */}
          <div className="absolute -top-28 -left-28 w-[30rem] h-[30rem] rounded-full bg-[#C8F2F8] dark:bg-cyan-950/40 blur-[100px] opacity-85 animate-float-slow" />
          
          {/* Pastel Pink Glow Top Right */}
          <div className="absolute top-8 -right-28 w-[28rem] h-[28rem] rounded-full bg-[#FFD6EA] dark:bg-pink-950/30 blur-[95px] opacity-75 animate-float-reverse" />
          
          {/* Soft Lavender / Purple Glow Bottom Center */}
          <div className="absolute -bottom-40 left-1/4 w-[36rem] h-[36rem] rounded-full bg-[#E4DEFF] dark:bg-purple-950/35 blur-[120px] opacity-75 animate-float-slow" />
          
          {/* Soft Peach / Orange Accent */}
          <div className="absolute top-1/2 -left-24 w-80 h-80 rounded-full bg-[#FFEBD8] dark:bg-amber-950/20 blur-[90px] opacity-65 animate-float-reverse" />
        </div>

        <ThemeProvider>
          <AuthProvider>
            <Web3Provider>
              <SettingsProvider>
                <PWAProvider>
                  <AuthGuard>
                    <CallListenerProvider>
                      {children}
                    </CallListenerProvider>
                  </AuthGuard>
                </PWAProvider>
              </SettingsProvider>
            </Web3Provider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
