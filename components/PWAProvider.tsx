"use client";

import React, { useEffect } from "react";
import { OfflineBanner } from "./OfflineBanner";
import { PWAInstallPrompt } from "./PWAInstallPrompt";

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Register Service Worker in production/supporting environments
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("[PWA] ServiceWorker active:", registration.scope);
          })
          .catch((err) => {
            console.warn("[PWA] ServiceWorker registration warning:", err);
          });
      });
    }
  }, []);

  return (
    <>
      <OfflineBanner />
      {children}
      <PWAInstallPrompt />
    </>
  );
};
