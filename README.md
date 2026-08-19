# Aura - Modern Social Media Platform

Aura is a modern, responsive **Social Media Platform** featuring frosted glassmorphism aesthetics, rich creator feeds, stories, pulse reels, audio overlays, visual filters, direct messaging, real-time notifications, and full profile customization.

---

## 🌟 Core Features

1. **Authentication & Session Management**
   - Seamless sign-in via Google Account, Mobile Phone SMS OTP, or Instant Demo profile.
   - Secure JWT token session handling with persistent profile state.

2. **Feed & Content Creation**
   - Post photos and videos with visual filters (Cinematic Glow, Cyberpunk, Vintage, Noir).
   - Audio selector and text overlay stickers.
   - Double-tap heart animations, comments drawer, link sharing, and bookmarking.

3. **Stories & Pulse Reels**
   - 24-hour stories bar with progress auto-advance, text stories with colorful backgrounds, and media stories.
   - Vertical full-screen short video feed with sound control and creator engagement.

4. **Community & Discovery**
   - Interactive topic and connection network graphs.
   - Trending hashtags, trending sounds, and creator leaderboards.

5. **Creator Analytics Dashboard**
   - Interactive engagement charts tracking views, likes, comments, and follower growth.

---

## 🚀 Quickstart Guide

### 1. Installation
```bash
npm install
```

### 2. Database Initialization
```bash
npx prisma db push
```

### 3. Launch Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
/prisma
  └── schema.prisma          # Database models (User, Profile, Post, Comment, Like, Follow, Story, Pulse, etc.)
/app
  ├── login/page.tsx         # Google & Mobile Phone OTP login
  ├── feed/page.tsx          # Home Feed with Stories bar & post cards
  ├── pulse/page.tsx         # Fullscreen short video reels
  ├── explore/page.tsx       # Search and discover creators and hashtags
  ├── trending/page.tsx      # Trending reels, audio tracks, and creators
  ├── chats/page.tsx         # Direct messaging, voice notes, and AI memory
  ├── profile/page.tsx       # Profile header, grid/saved tabs, and bio editor
  ├── dashboard/page.tsx     # Creator analytics charts
  ├── settings/page.tsx      # Comprehensive account, privacy, and theme preferences
/components
  ├── PostCard.tsx           # Feed post card with double-tap like & comments
  ├── CreatePostModal.tsx    # Modal for photo/video upload, filters, audio, & caption
  ├── StoryBar.tsx           # Stories tray and creation modal
  ├── StoryViewerModal.tsx   # Auto-advancing story viewer
  ├── Sidebar.tsx            # Desktop sidebar navigation
  └── BottomNavigation.tsx   # Mobile floating navigation bar
/lib
  ├── authContext.tsx        # React Context for user authentication & profiles
  └── prisma.ts              # Global Prisma client instance
```
