import { initializeApp, getApps, getApp, FirebaseApp, deleteApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  PhoneAuthProvider, 
  Auth,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";

export interface FirebaseConfigStatus {
  isConfigured: boolean;
  missingKeys: string[];
  source: "env" | "local_storage" | "none";
  keysStatus: {
    apiKey: boolean;
    authDomain: boolean;
    projectId: boolean;
    storageBucket: boolean;
    messagingSenderId: boolean;
    appId: boolean;
    measurementId: boolean;
  };
}

export interface FirebaseConfigObject {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

// Helper to get configuration from env or localStorage
export function getEffectiveFirebaseConfig(): { config: FirebaseConfigObject; source: "env" | "local_storage" | "none" } {
  // 1. Check environment variables
  const envConfig: FirebaseConfigObject = {
    apiKey: (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim(),
    authDomain: (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim(),
    projectId: (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim(),
    storageBucket: (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "").trim(),
    messagingSenderId: (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "").trim(),
    appId: (process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "").trim(),
    measurementId: (process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "").trim(),
  };

  if (envConfig.apiKey && envConfig.authDomain && envConfig.projectId && envConfig.appId) {
    return { config: envConfig, source: "env" };
  }

  // 2. Check client-side localStorage fallback
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("aura_firebase_config");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.apiKey && parsed.authDomain && parsed.projectId && parsed.appId) {
          return { config: parsed, source: "local_storage" };
        }
      }
    } catch (e) {
      console.warn("Failed to parse runtime Firebase config:", e);
    }
  }

  return { config: envConfig, source: "none" };
}

// Validation helper (never prints secret values)
export function getFirebaseConfigStatus(): FirebaseConfigStatus {
  const { config, source } = getEffectiveFirebaseConfig();

  const keysStatus = {
    apiKey: Boolean(config.apiKey && config.apiKey.length > 0),
    authDomain: Boolean(config.authDomain && config.authDomain.length > 0),
    projectId: Boolean(config.projectId && config.projectId.length > 0),
    storageBucket: Boolean(config.storageBucket && config.storageBucket.length > 0),
    messagingSenderId: Boolean(config.messagingSenderId && config.messagingSenderId.length > 0),
    appId: Boolean(config.appId && config.appId.length > 0),
    measurementId: Boolean(config.measurementId && config.measurementId.length > 0),
  };

  const missingKeys: string[] = [];
  if (!keysStatus.apiKey) missingKeys.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!keysStatus.authDomain) missingKeys.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!keysStatus.projectId) missingKeys.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (!keysStatus.appId) missingKeys.push("NEXT_PUBLIC_FIREBASE_APP_ID");

  const isConfigured = missingKeys.length === 0;

  return {
    isConfigured,
    missingKeys,
    source,
    keysStatus,
  };
}

// Singleton Firebase App and Auth Instance
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

export function initializeFirebaseClient(): { app: FirebaseApp | null; auth: Auth | null; googleProvider: GoogleAuthProvider | null } {
  const { config, source } = getEffectiveFirebaseConfig();
  const isConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

  if (typeof window === "undefined" || !isConfigured) {
    return { app: null, auth: null, googleProvider: null };
  }

  try {
    if (getApps().length > 0) {
      app = getApp();
    } else {
      app = initializeApp(config);
    }
    
    auth = getAuth(app);
    
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn("Firebase persistence error:", err);
    });

    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });

    return { app, auth, googleProvider };
  } catch (err) {
    console.error("Firebase client initialization failed:", err);
    return { app: null, auth: null, googleProvider: null };
  }
}

// Initialize on load
const client = initializeFirebaseClient();
app = client.app;
auth = client.auth;
googleProvider = client.googleProvider;

export const firebaseStatus = getFirebaseConfigStatus();
export const hasFirebase = firebaseStatus.isConfigured;

// Save runtime config helper
export function saveRuntimeFirebaseConfig(config: FirebaseConfigObject): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem("aura_firebase_config", JSON.stringify(config));
    window.location.reload();
    return true;
  } catch (e) {
    console.error("Failed to save runtime Firebase config:", e);
    return false;
  }
}

// Clear runtime config helper
export function clearRuntimeFirebaseConfig(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("aura_firebase_config");
  window.location.reload();
}

export { app, auth, googleProvider, GoogleAuthProvider, PhoneAuthProvider };
