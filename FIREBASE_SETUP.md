# Firebase Authentication Setup Guide

This guide explains how to configure Firebase Authentication for **Aura Social** (Google OAuth + Phone SMS OTP).

---

## 1. Create or Select a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or select your existing project).
3. Name your project (e.g. `aura-social-web3`).

---

## 2. Register a Web App

1. In Project Overview, click the **Web icon** (`</>`) to add a Web App.
2. App nickname: `Aura Web App`.
3. Click **Register app**.
4. Firebase will display your `firebaseConfig` object containing:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
   - `measurementId`

---

## 3. Copy Values into `.env.local`

In your project root, open `.env.local` and paste the values into the respective environment variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyYourActualApiKeyHere"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789012"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789012:web:abcdef123456"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-ABCDEF1234"
```

---

## 4. Enable Authentication Providers in Firebase Console

1. In the left sidebar, navigate to **Build** &rarr; **Authentication**.
2. Click **Get Started** (if not already enabled).
3. Under the **Sign-in method** tab:

### A. Google Sign-In
- Click **Google**.
- Toggle **Enable**.
- Set the **Project support email** (your email).
- Click **Save**.

### B. Phone (SMS) Sign-In
- Click **Phone**.
- Toggle **Enable**.
- *(Optional for testing)*: Under **Phone numbers for testing**, add test numbers (e.g. `+1 555-555-0100` with verification code `123456`) to test phone login without consuming SMS quotas during development.
- Click **Save**.

---

## 5. Configure Authorized Domains

1. Under **Authentication** &rarr; **Settings** &rarr; **Authorized domains**.
2. Ensure the following domains are listed:
   - `localhost`
   - `127.0.0.1`
   - *Your production domain (e.g. `aura.social` when deploying)*

---

## 6. Restart Next.js Development Server

After updating `.env.local`, restart your local Next.js server so the environment variables are loaded into the client bundle:

```bash
# Stop any running process (Ctrl + C), then run:
npm run dev
```

---

## 7. Security Notes

- **Never commit `.env.local` to Git repository.**
- All client-side Firebase variables start with `NEXT_PUBLIC_` as required by Next.js.
- Private Firebase Admin SDK keys should only ever be stored server-side if backend admin operations are needed.
