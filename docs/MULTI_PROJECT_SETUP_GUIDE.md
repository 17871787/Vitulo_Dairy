# Vitulo Multi-Project Setup Guide

## Goal: 3 Separate Projects with Clear Demarcation

This guide sets up three completely separate Next.js projects that share a single database.

---

## Final Structure

```
C:\Users\jtowe\
├── vitulo-management\      ← Renamed from 'vitulo'
├── vitulo-finisher\        ← New project
└── vitulo-dairy\           ← New project

GitHub:
├── github.com/vitulo/vitulo-management
├── github.com/vitulo/vitulo-finisher
└── github.com/vitulo/vitulo-dairy

Vercel:
├── vitulo-management → vitulo.vercel.app
├── vitulo-finisher → vitulo-finisher.vercel.app
└── vitulo-dairy → vitulo-dairy.vercel.app
```

---

## Prerequisites

Before starting, make sure you have:
- [ ] Claude Code session closed (to release file locks)
- [ ] VS Code closed
- [ ] No terminals running in vitulo directory
- [ ] Git installed and configured
- [ ] GitHub account access
- [ ] Vercel CLI installed: `npm install -g vercel`

---

## Step 1: Rename Current Project (Management App)

### 1.1 Close All Applications

Close:
- Claude Code
- VS Code
- Any terminals in C:\Users\jtowe\vitulo
- File Explorer showing vitulo folder

### 1.2 Rename Directory

**Option A: Using File Explorer**
1. Open File Explorer
2. Navigate to `C:\Users\jtowe\`
3. Right-click `vitulo` folder
4. Select "Rename"
5. Rename to: `vitulo-management`

**Option B: Using PowerShell (Run as Admin)**
```powershell
cd C:\Users\jtowe
Rename-Item -Path "vitulo" -NewName "vitulo-management"
cd vitulo-management
```

### 1.3 Update Git Remote (if exists)

```bash
cd C:\Users\jtowe\vitulo-management

# Check current remote
git remote -v

# If no remote exists, create new GitHub repo and add it
# If remote exists but wrong name, update it:
git remote set-url origin https://github.com/YOUR_USERNAME/vitulo-management.git

# Update any references in package.json
# Edit package.json: change "name": "vitulo" to "name": "vitulo-management"
```

### 1.4 Update Vercel Project

```bash
cd C:\Users\jtowe\vitulo-management

# Check current Vercel project
vercel ls

# Link to existing or create new
vercel link
# When prompted, select "Link to existing project" or create new "vitulo-management"

# Deploy to verify
vercel --prod
```

### 1.5 Update Working Directory in Claude Code

When you restart Claude Code, update working directory to:
```
C:\Users\jtowe\vitulo-management
```

---

## Step 2: Create Finisher Portal Project

### 2.1 Create New Next.js App

```bash
cd C:\Users\jtowe

# Create new Next.js 15 app
npx create-next-app@latest vitulo-finisher

# When prompted:
# ✔ Would you like to use TypeScript? … Yes
# ✔ Would you like to use ESLint? … Yes
# ✔ Would you like to use Tailwind CSS? … Yes
# ✔ Would you like to use `src/` directory? … Yes
# ✔ Would you like to use App Router? … Yes
# ✔ Would you like to customize the default import alias? … No
```

### 2.2 Copy Shared Dependencies

```bash
cd vitulo-finisher

# Install shared packages (same versions as management app)
npm install @prisma/client prisma
npm install @auth/prisma-adapter next-auth
npm install bcryptjs
npm install xlsx
npm install -D @types/bcryptjs
```

### 2.3 Copy Prisma Schema

```bash
# Create prisma directory
mkdir prisma

# Copy schema from management app
copy C:\Users\jtowe\vitulo-management\prisma\schema.prisma C:\Users\jtowe\vitulo-finisher\prisma\schema.prisma
```

### 2.4 Setup Environment Variables

Create `.env.local`:
```bash
# Database (SAME as management app!)
DATABASE_URL="postgresql://..." # Copy from vitulo-management/.env.local

# NextAuth
NEXTAUTH_SECRET="generate-new-secret-here"
NEXTAUTH_URL="http://localhost:3001"

# App Config
NEXT_PUBLIC_APP_NAME="Vitulo Finisher Portal"
NEXT_PUBLIC_APP_ROLE="FINISHER"
```

### 2.5 Update package.json

Edit `package.json`:
```json
{
  "name": "vitulo-finisher",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",  // ← Different port!
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint"
  }
}
```

### 2.6 Initialize Git & GitHub

```bash
cd C:\Users\jtowe\vitulo-finisher

git init
git add .
git commit -m "Initial commit: Finisher portal project setup"

# Create repo on GitHub (github.com/YOUR_USERNAME/vitulo-finisher)
# Then:
git remote add origin https://github.com/YOUR_USERNAME/vitulo-finisher.git
git branch -M main
git push -u origin main
```

### 2.7 Deploy to Vercel

```bash
cd C:\Users\jtowe\vitulo-finisher

vercel

# When prompted:
# - Link to new project
# - Project name: vitulo-finisher
# - Framework: Next.js
# - Root directory: ./

# Add environment variables in Vercel dashboard:
# Settings → Environment Variables → Add:
# - DATABASE_URL (same as management app)
# - NEXTAUTH_SECRET
# - NEXTAUTH_URL=https://vitulo-finisher.vercel.app

# Deploy to production
vercel --prod
```

---

## Step 3: Create Dairy Portal Project

### 3.1 Create New Next.js App

```bash
cd C:\Users\jtowe

npx create-next-app@latest vitulo-dairy

# Same prompts as Step 2.1 (all Yes)
```

### 3.2 Copy Shared Dependencies

```bash
cd vitulo-dairy

npm install @prisma/client prisma
npm install @auth/prisma-adapter next-auth
npm install bcryptjs
npm install xlsx
npm install -D @types/bcryptjs
```

### 3.3 Copy Prisma Schema

```bash
mkdir prisma
copy C:\Users\jtowe\vitulo-management\prisma\schema.prisma C:\Users\jtowe\vitulo-dairy\prisma\schema.prisma
```

### 3.4 Setup Environment Variables

Create `.env.local`:
```bash
# Database (SAME as management app!)
DATABASE_URL="postgresql://..." # Copy from vitulo-management/.env.local

# NextAuth
NEXTAUTH_SECRET="generate-another-new-secret"
NEXTAUTH_URL="http://localhost:3002"

# App Config
NEXT_PUBLIC_APP_NAME="Vitulo Dairy Portal"
NEXT_PUBLIC_APP_ROLE="DAIRY_SUPPLIER"
```

### 3.5 Update package.json

Edit `package.json`:
```json
{
  "name": "vitulo-dairy",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3002",  // ← Different port!
    "build": "next build",
    "start": "next start -p 3002",
    "lint": "next lint"
  }
}
```

### 3.6 Initialize Git & GitHub

```bash
cd C:\Users\jtowe\vitulo-dairy

git init
git add .
git commit -m "Initial commit: Dairy portal project setup"

# Create repo on GitHub (github.com/YOUR_USERNAME/vitulo-dairy)
git remote add origin https://github.com/YOUR_USERNAME/vitulo-dairy.git
git branch -M main
git push -u origin main
```

### 3.7 Deploy to Vercel

```bash
cd C:\Users\jtowe\vitulo-dairy

vercel

# Project name: vitulo-dairy
# Add environment variables in Vercel
# Deploy to production
vercel --prod
```

---

## Step 4: Shared Prisma Schema Management

### Problem: Schema Duplication

All 3 projects have a copy of `prisma/schema.prisma`. When you update the schema, you need to update all 3.

### Solution: Git Submodule (Recommended)

#### 4.1 Create Shared Schema Repository

```bash
cd C:\Users\jtowe
mkdir vitulo-shared
cd vitulo-shared

git init
mkdir prisma

# Copy current schema
copy C:\Users\jtowe\vitulo-management\prisma\schema.prisma prisma\schema.prisma

git add .
git commit -m "Initial commit: Shared Prisma schema"

# Create GitHub repo: vitulo/vitulo-shared
git remote add origin https://github.com/YOUR_USERNAME/vitulo-shared.git
git branch -M main
git push -u origin main
```

#### 4.2 Add Submodule to Each Project

**Management App:**
```bash
cd C:\Users\jtowe\vitulo-management
rm -rf prisma  # Remove current prisma folder
git submodule add https://github.com/YOUR_USERNAME/vitulo-shared.git shared
mklink /D prisma shared\prisma  # Windows symbolic link

git add .
git commit -m "Add shared schema submodule"
git push
```

**Finisher Portal:**
```bash
cd C:\Users\jtowe\vitulo-finisher
rm -rf prisma
git submodule add https://github.com/YOUR_USERNAME/vitulo-shared.git shared
mklink /D prisma shared\prisma

git add .
git commit -m "Add shared schema submodule"
git push
```

**Dairy Portal:**
```bash
cd C:\Users\jtowe\vitulo-dairy
rm -rf prisma
git submodule add https://github.com/YOUR_USERNAME/vitulo-shared.git shared
mklink /D prisma shared\prisma

git add .
git commit -m "Add shared schema submodule"
git push
```

#### 4.3 Updating Shared Schema

When you need to update the Prisma schema:

```bash
# Make changes in ANY project
cd C:\Users\jtowe\vitulo-management\shared\prisma
# Edit schema.prisma

# Commit to shared repo
cd C:\Users\jtowe\vitulo-management\shared
git add .
git commit -m "Add User model for authentication"
git push

# Update other projects
cd C:\Users\jtowe\vitulo-finisher\shared
git pull

cd C:\Users\jtowe\vitulo-dairy\shared
git pull
```

---

## Step 5: Verify Setup

### 5.1 Check Directory Structure

```bash
cd C:\Users\jtowe
dir

# Should see:
# vitulo-management/
# vitulo-finisher/
# vitulo-dairy/
# vitulo-shared/
```

### 5.2 Test Local Development

Open 3 terminals:

**Terminal 1 (Management):**
```bash
cd C:\Users\jtowe\vitulo-management
npm run dev
# Should start on http://localhost:3000
```

**Terminal 2 (Finisher):**
```bash
cd C:\Users\jtowe\vitulo-finisher
npm run dev
# Should start on http://localhost:3001
```

**Terminal 3 (Dairy):**
```bash
cd C:\Users\jtowe\vitulo-dairy
npm run dev
# Should start on http://localhost:3002
```

All 3 should connect to the SAME database.

### 5.3 Verify Database Connection

In each project:
```bash
npx prisma db pull
# Should succeed with same schema for all 3
```

---

## Step 6: Claude Code Workflow

### 6.1 Working on Management App

```bash
# Open Claude Code in:
C:\Users\jtowe\vitulo-management

# Context will ONLY include management app files
# No bloat from other projects
```

### 6.2 Working on Finisher Portal

```bash
# Open Claude Code in:
C:\Users\jtowe\vitulo-finisher

# Context will ONLY include finisher portal files
# Clean, focused context
```

### 6.3 Working on Dairy Portal

```bash
# Open Claude Code in:
C:\Users\jtowe\vitulo-dairy

# Context will ONLY include dairy portal files
```

### 6.4 Cross-Project Work

If you need to reference another project:
```bash
# Copy the architecture docs to all 3 projects:
copy C:\Users\jtowe\vitulo-management\docs\*.md C:\Users\jtowe\vitulo-finisher\docs\
copy C:\Users\jtowe\vitulo-management\docs\*.md C:\Users\jtowe\vitulo-dairy\docs\
```

---

## Step 7: Deployment Checklist

### Before First Deploy

- [ ] All 3 projects created locally
- [ ] All 3 GitHub repos created and pushed
- [ ] All 3 Vercel projects created
- [ ] Environment variables set in Vercel for each project
- [ ] Database URL is IDENTICAL in all 3 `.env.local` and Vercel
- [ ] Different ports configured (3000, 3001, 3002)
- [ ] Git submodule working for shared schema

### Test Deployments

```bash
# Management
cd C:\Users\jtowe\vitulo-management
vercel --prod
# Visit: https://vitulo.vercel.app

# Finisher
cd C:\Users\jtowe\vitulo-finisher
vercel --prod
# Visit: https://vitulo-finisher.vercel.app

# Dairy
cd C:\Users\jtowe\vitulo-dairy
vercel --prod
# Visit: https://vitulo-dairy.vercel.app
```

---

## Common Issues & Solutions

### Issue: Port already in use

**Solution:**
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
npm run dev -- -p 3003
```

### Issue: Prisma client out of sync

**Solution:**
```bash
# Regenerate Prisma client in each project
cd C:\Users\jtowe\vitulo-management
npx prisma generate

cd C:\Users\jtowe\vitulo-finisher
npx prisma generate

cd C:\Users\jtowe\vitulo-dairy
npx prisma generate
```

### Issue: Environment variable not found

**Solution:**
Check `.env.local` exists in project root and Vercel dashboard has matching variables.

### Issue: Git submodule not updating

**Solution:**
```bash
cd project-name
git submodule update --remote --merge
```

---

## Maintenance Workflow

### Weekly Tasks

1. **Update Shared Schema:**
   ```bash
   cd vitulo-shared
   git pull
   ```

2. **Update Dependencies:**
   ```bash
   # In each project
   npm update
   ```

3. **Sync Documentation:**
   ```bash
   # Copy updated docs to all projects
   xcopy /E /Y vitulo-management\docs\*.md vitulo-finisher\docs\
   xcopy /E /Y vitulo-management\docs\*.md vitulo-dairy\docs\
   ```

### When Adding New Database Model

1. Edit schema in `vitulo-shared/prisma/schema.prisma`
2. Commit and push to vitulo-shared
3. Pull in all 3 projects
4. Run `npx prisma generate` in all 3 projects
5. Run `npx prisma db push` once (from any project)
6. Test in all 3 apps

---

## Project Boundaries

### What's Shared:
- ✅ Database (PostgreSQL)
- ✅ Prisma schema (via git submodule)
- ✅ Documentation (copied)
- ✅ Environment variable values (DATABASE_URL)

### What's Separate:
- ✅ Source code
- ✅ Git repositories
- ✅ Vercel projects
- ✅ npm dependencies
- ✅ Claude Code context
- ✅ Port numbers (3000, 3001, 3002)
- ✅ NextAuth secrets

---

## Success Criteria

✅ Setup is complete when:

1. Three separate directories exist
2. Three separate Git repos with commits
3. Three separate Vercel deployments
4. All three connect to same database
5. Each runs on different port locally
6. Schema updates propagate to all three
7. Claude Code can work on each independently

---

## Next Steps After Setup

1. Build finisher portal using `FINISHER_PORTAL_MVP_PROMPT.md`
2. Build dairy portal using `DAIRY_PORTAL_MVP_PROMPT.md`
3. Add User model to shared schema
4. Implement NextAuth in management app
5. Test authentication across all three apps

---

**Estimated Setup Time:** 1-2 hours

**Difficulty:** Intermediate

**Support:** If stuck, check GitHub Issues or Vercel logs

---

**Last Updated:** November 17, 2025
**Version:** 1.0
