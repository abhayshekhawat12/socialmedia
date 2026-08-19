"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

// Primary Navigation Hierarchy Indices
const TAB_ORDER: Record<string, number> = {
  "/": 0,
  "/feed": 0,
  "/snap": 1,
  "/pulse": 2,
  "/trending": 3,
  "/chats": 4,
  "/profile": 5,
};

function getTabIndex(path: string): number {
  if (path.startsWith("/profile")) return 5;
  if (path.startsWith("/chats")) return 4;
  if (path.startsWith("/trending")) return 3;
  if (path.startsWith("/pulse")) return 2;
  if (path.startsWith("/snap")) return 1;
  if (path.startsWith("/feed") || path === "/") return 0;
  return 6;
}

export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const prevPathRef = useRef<string>(pathname);
  const [animationClass, setAnimationClass] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setAnimationClass("aura-page-fade");
      return;
    }

    const prevPath = prevPathRef.current;
    if (prevPath !== pathname) {
      const prevIdx = getTabIndex(prevPath);
      const currIdx = getTabIndex(pathname);

      if (currIdx > prevIdx) {
        // Forward navigation: screen enters from right
        setAnimationClass("aura-swipe-forward");
      } else if (currIdx < prevIdx) {
        // Backward navigation: screen enters from left
        setAnimationClass("aura-swipe-backward");
      } else {
        // Same index / subroute: subtle fast fade & scale
        setAnimationClass("aura-page-fade");
      }

      prevPathRef.current = pathname;
    }
  }, [pathname]);

  return (
    <div
      key={pathname}
      className={`w-full h-full min-h-0 flex-1 flex flex-col will-change-transform ${animationClass}`}
    >
      {children}
    </div>
  );
};
