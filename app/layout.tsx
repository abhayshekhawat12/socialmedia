import "./globals.css";
import React from "react";
import type { Metadata } from "next";
import { ThemeProvider } from "../lib/themeContext";
import { Web3Provider } from "../lib/web3Context";
import { SettingsProvider } from "../lib/settingsContext";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";

export const metadata: Metadata = {
  title: "Aura - Next-Gen Web3 Social Platform",
  description: "Next-generation social media platform with Aura UI, Web3 wallet identity, IPFS storage, NFT ownership, and cryptographic proof of creation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light h-[100dvh] overflow-hidden">
      <body className="h-[100dvh] max-h-[100dvh] w-full bg-[#F5F7FA] dark:bg-[#0b0f19] text-[#1E293B] dark:text-slate-100 flex justify-center items-center overflow-hidden">
        <ThemeProvider>
          <Web3Provider>
            <SettingsProvider>
              {/* Fixed App Shell matching TrustGraph & Aura specs */}
              <div className="w-full max-w-[440px] h-[100dvh] sm:h-[94vh] sm:max-h-[900px] bg-white dark:bg-[#131b2e] sm:rounded-[30px] shadow-container border border-slate-200/70 dark:border-slate-800 flex flex-col relative overflow-hidden">
                <Navbar />
                <main className="flex-1 px-3 py-3 overflow-y-auto no-scrollbar relative min-h-0">
                  {children}
                </main>
                <BottomNavigation />
              </div>
            </SettingsProvider>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}

