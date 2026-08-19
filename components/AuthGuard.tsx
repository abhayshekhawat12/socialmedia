"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { DesktopSidebar } from "./DesktopSidebar";
import { RightSidebar } from "./RightSidebar";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomNav } from "./MobileBottomNav";

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const isAuthRoute = pathname === "/login" || pathname.startsWith("/auth/callback");

  // 1. On /login or OAuth callback: Render clean full-screen form without sidebars
  if (isAuthRoute) {
    return <>{children}</>;
  }

  // 2. On all application screens: Render full responsive 3-column app shell immediately
  return (
    <>
      {/* Mobile Floating Glass Top Header */}
      <MobileHeader />

      {/* Responsive 3-Column Canvas Container */}
      <div className="relative z-10 w-full max-w-[1320px] mx-auto md:grid md:grid-cols-12 md:gap-6 px-3 md:px-8 pt-16 md:pt-6 pb-24 md:pb-10">
        {/* Left Desktop Glass Navigation Sidebar */}
        <DesktopSidebar />

        {/* Center Main Content Column */}
        <main className="col-span-12 md:col-span-6 lg:col-span-6 max-w-[680px] mx-auto w-full min-h-[calc(100dvh-120px)]">
          {children}
        </main>

        {/* Right Desktop Suggestions & Trending Sidebar */}
        <RightSidebar />
      </div>

      {/* Mobile Floating Glass Bottom Dock Bar */}
      <MobileBottomNav />
    </>
  );
};
