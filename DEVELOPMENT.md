# Multi-Laptop Development Guide

This guide details the workflow to synchronize source code, database structures, and configuration details across multiple computers when working on the Aura Social Media platform.

---

## 1. Core Architectural Pillars

- **GitHub Repository** (`https://github.com/abhayshekhawat12/socialmedia.git`):
  Acts as the centralized source of truth for all source code files, React components, Next.js routing, and styling templates.
- **PostgreSQL Database** (e.g. Supabase DB / Cloud SQL):
  Holds persistent tables (Users, Profiles, Likes, Comments, Followers, settings, and analytics). Both laptops connect to this database directly so that accounts, videos, and follow actions survive laptop switches, server restarts, or page refreshes.
- **Cloud/Object Storage** (e.g. Supabase Storage):
  Hosts raw MP4 videos and images. The absolute URLs are saved inside the PostgreSQL records instead of storing large files directly inside the database columns.
- **Environment variables** (`.env`):
  Stores local secrets, database passwords, and chain configuration hashes. **Never commit `.env` to GitHub.**

---

## 2. Multi-Laptop Git Workflow

Use this synchronization loop to guarantee zero file overwrites or branch conflicts.

### Laptop 1 (First Session)
1. Pull the latest code updates:
   ```bash
   git pull origin main
   ```
2. Make your edits / additions.
3. Stage and check modified files:
   ```bash
   git status
   git add .
   ```
4. Commit your changes:
   ```bash
   git commit -m "feat: upgrade interface styling or database metrics"
   ```
5. Upload to GitHub:
   ```bash
   git push origin main
   ```

---

### Laptop 2 (Initial Setup)
1. Clone the repository to a clean local directory:
   ```bash
   git clone https://github.com/abhayshekhawat12/socialmedia.git
   ```
2. Create your local configuration file from template:
   ```bash
   cp .env.example .env
   ```
3. Populate database credentials in `.env` (pointing to the shared database).
4. Run setup commands:
   ```bash
   npm install
   npx prisma generate
   ```

### Laptop 2 (Subsequent Sessions)
Always execute this sequence before modifying code:
```bash
git pull origin main
```
*Write your features...*

When finished, push back to GitHub:
```bash
git add .
git commit -m "feat: added short video audio filters on laptop 2"
git push origin main
```

---

## 3. Safe Development Rules

- **Database Schema Sync**:
  If you modify the database models inside `prisma/schema.prisma` on one laptop, commit the schema to GitHub. On the other laptop, pull the code and run:
  ```bash
  npx prisma generate
  ```
  *(To sync your local development server types).*
- **Local Secret Safety**:
  Verify `.gitignore` is active and ignoring `.env` files. If you accidentally stage a secret, run `git reset HEAD .env` before committing.
