# CLAUDE.md - VibeNav (心境導航)

> **Documentation Version**: 1.0
> **Last Updated**: 2025-10-01
> **Project**: VibeNav
> **Description**: Emotion-aware navigation app that routes you through healing paths when you're feeling down. Built with TypeScript, React, MapLibre GL, deck.gl, Valhalla, and Supabase.
> **Features**: GitHub auto-backup, Task agents, technical debt prevention

This file provides essential guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 CRITICAL RULES - READ FIRST

> **⚠️ RULE ADHERENCE SYSTEM ACTIVE ⚠️**
> **Claude Code must explicitly acknowledge these rules at task start**
> **These rules override all other instructions and must ALWAYS be followed:**

### 🔄 **RULE ACKNOWLEDGMENT REQUIRED**
> **Before starting ANY task, Claude Code must respond with:**
> "✅ CRITICAL RULES ACKNOWLEDGED - I will follow all prohibitions and requirements listed in CLAUDE.md"

### ❌ ABSOLUTE PROHIBITIONS
- **NEVER** create new files in root directory → use proper module structure
- **NEVER** write output files directly to root directory → use designated output folders
- **NEVER** create documentation files (.md) unless explicitly requested by user
- **NEVER** use git commands with -i flag (interactive mode not supported)
- **NEVER** use `find`, `grep`, `cat`, `head`, `tail`, `ls` commands → use Read, LS, Grep, Glob tools instead
- **NEVER** create duplicate files (manager_v2.py, enhanced_xyz.py, utils_new.js) → ALWAYS extend existing files
- **NEVER** create multiple implementations of same concept → single source of truth
- **NEVER** copy-paste code blocks → extract into shared utilities/functions
- **NEVER** hardcode values that should be configurable → use config files/environment variables
- **NEVER** use naming like enhanced_, improved_, new_, v2_ → extend original files instead

### 📝 MANDATORY REQUIREMENTS
- **COMMIT** after every completed task/phase - no exceptions
- **GITHUB BACKUP** - Push to GitHub after every commit to maintain backup: `git push origin main`
- **USE TASK AGENTS** for all long-running operations (>30 seconds) - Bash commands stop when context switches
- **TODOWRITE** for complex tasks (3+ steps) → parallel agents → git checkpoints → test validation
- **READ FILES FIRST** before editing - Edit/Write tools will fail if you didn't read the file first
- **DEBT PREVENTION** - Before creating new files, check for existing similar functionality to extend
- **SINGLE SOURCE OF TRUTH** - One authoritative implementation per feature/concept

### ⚡ EXECUTION PATTERNS
- **PARALLEL TASK AGENTS** - Launch multiple Task agents simultaneously for maximum efficiency
- **SYSTEMATIC WORKFLOW** - TodoWrite → Parallel agents → Git checkpoints → GitHub backup → Test validation
- **GITHUB BACKUP WORKFLOW** - After every commit: `git push origin main` to maintain GitHub backup
- **BACKGROUND PROCESSING** - ONLY Task agents can run true background operations

### 🔍 MANDATORY PRE-TASK COMPLIANCE CHECK
> **STOP: Before starting any task, Claude Code must explicitly verify ALL points:**

**Step 1: Rule Acknowledgment**
- [ ] ✅ I acknowledge all critical rules in CLAUDE.md and will follow them

**Step 2: Task Analysis**
- [ ] Will this create files in root? → If YES, use proper module structure instead
- [ ] Will this take >30 seconds? → If YES, use Task agents not Bash
- [ ] Is this 3+ steps? → If YES, use TodoWrite breakdown first
- [ ] Am I about to use grep/find/cat? → If YES, use proper tools instead

**Step 3: Technical Debt Prevention (MANDATORY SEARCH FIRST)**
- [ ] **SEARCH FIRST**: Use Grep pattern="<functionality>.*<keyword>" to find existing implementations
- [ ] **CHECK EXISTING**: Read any found files to understand current functionality
- [ ] Does similar functionality already exist? → If YES, extend existing code
- [ ] Am I creating a duplicate class/manager? → If YES, consolidate instead
- [ ] Will this create multiple sources of truth? → If YES, redesign approach
- [ ] Have I searched for existing implementations? → Use Grep/Glob tools first
- [ ] Can I extend existing code instead of creating new? → Prefer extension over creation
- [ ] Am I about to copy-paste code? → Extract to shared utility instead

**Step 4: Session Management**
- [ ] Is this a long/complex task? → If YES, plan context checkpoints
- [ ] Have I been working >1 hour? → If YES, consider /compact or session break

> **⚠️ DO NOT PROCEED until all checkboxes are explicitly verified**

## 🐙 GITHUB SETUP & AUTO-BACKUP

### 📋 **GITHUB BACKUP WORKFLOW** (MANDATORY)
> **⚠️ CLAUDE CODE MUST FOLLOW THIS PATTERN:**

```bash
# After every commit, always run:
git push origin main

# This ensures:
# ✅ Remote backup of all changes
# ✅ Collaboration readiness
# ✅ Version history preservation
# ✅ Disaster recovery protection
```

### 🎯 **CLAUDE CODE GITHUB COMMANDS**
Essential GitHub operations for Claude Code:

```bash
# Check GitHub connection status
gh auth status && git remote -v

# Push changes (after every commit)
git push origin main

# Check repository status
gh repo view

# Repository URL
# https://github.com/geonook/Vibe-Map
```

## 🏗️ PROJECT OVERVIEW

### 🎯 **VIBENAV - EMOTION-AWARE NAVIGATION**

**VibeNav (心境導航)** is an emotion-aware navigation app that routes you through healing paths when you're feeling down. Unlike traditional GPS that optimizes for speed, VibeNav uses geographic vibe scoring to generate therapeutic walking routes.

### 🌟 **CORE FEATURES**
- 🧠 **Emotion-driven routing** - Routes adapt to your emotional state
- 🌳 **Geographic vibe scoring** - Green spaces, waterfront, quiet streets, cafe density
- 🗺️ **60fps smooth map rendering** - MapLibre GL + deck.gl
- 🎵 **Ambient soundscapes** - Therapeutic audio experiences
- 📳 **Haptic feedback** - Gentle navigation cues
- 🔄 **Real-time turn-by-turn navigation** - Live route guidance
- 🌐 **Offline-capable** - Service Worker support
- 🔐 **Privacy-first** - Supabase RLS (Row Level Security)

### 🛠️ **TECH STACK**

#### Frontend (TypeScript - 70%)
- **React 18** - UI framework
- **MapLibre GL JS** - Map rendering
- **deck.gl** - GPU-accelerated data visualization
- **Vite** - Build tool and dev server
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Workbox** - Service Worker/PWA

#### Backend / Data (SQL/TypeScript - 20%)
- **Supabase** - PostgreSQL + PostGIS + Edge Functions
- **PostGIS** - Spatial database
- **Valhalla** - Routing engine (C++ via REST API)

#### Tooling (JavaScript - 10%)
- **TypeScript** - Type safety
- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **Tippecanoe** - Vector tile generation

### 📁 **PROJECT STRUCTURE**

```
vibe-map/
├── CLAUDE.md              # This file - project rules
├── README.md              # Project documentation
├── LICENSE                # MIT License
├── .gitignore            # Git ignore patterns
├── package.json          # NPM dependencies
├── tsconfig.json         # TypeScript config
├── vite.config.ts        # Vite build config
├── src/
│   ├── main/
│   │   ├── typescript/   # TypeScript source
│   │   │   ├── core/     # Routing engine, vibe scoring
│   │   │   ├── utils/    # Utility functions
│   │   │   ├── models/   # Data models (Route, EmotionState)
│   │   │   ├── services/ # API services (Supabase, Valhalla)
│   │   │   ├── api/      # API endpoints
│   │   │   ├── components/ # React components
│   │   │   ├── map/      # MapLibre GL, deck.gl integration
│   │   │   └── audio/    # Ambient soundscapes
│   │   └── resources/
│   │       ├── config/   # Configuration files
│   │       ├── styles/   # CSS/Tailwind styles
│   │       └── assets/   # Images, fonts, sounds
│   └── test/
│       ├── unit/         # Unit tests
│       └── integration/  # Integration tests
├── public/               # Static assets
├── docs/                 # Documentation
└── dist/                 # Build output (auto-generated)
```

### 🎯 **DEVELOPMENT STATUS**
- **Setup**: ✅ Complete
- **Core Features**: 🚧 In Development
- **Testing**: 📋 Planned
- **Documentation**: 📝 In Progress

## 📋 KEY VIBENAV CONCEPTS

### 🧠 **Emotion State System**
```typescript
interface EmotionState {
  mood: 'down' | 'neutral' | 'happy';
  intensity: number; // 0-1
  timestamp: Date;
}
```

### 🌳 **Vibe Scoring Algorithm**
- **Green Space Coverage** (30%) - Parks, gardens, tree density
- **Water Proximity** (25%) - Rivers, lakes, ocean views
- **Quiet Streets** (20%) - Low traffic, pedestrian-friendly
- **Cafe Density** (15%) - Social spaces, warmth
- **Cultural Points** (10%) - Art, bookstores, galleries

### 🗺️ **Route Generation**
```typescript
interface RouteCandidate {
  path: GeoJSON.LineString;
  vibeScore: number;
  duration: number;
  distance: number;
  segments: VibeSegment[];
}
```

## 🎯 RULE COMPLIANCE CHECK

Before starting ANY task, verify:
- [ ] ✅ I acknowledge all critical rules above
- [ ] Files go in proper module structure (not root)
- [ ] Use Task agents for >30 second operations
- [ ] TodoWrite for 3+ step tasks
- [ ] Commit after each completed task
- [ ] Push to GitHub after every commit

## 🚀 COMMON COMMANDS

```bash
# Development
npm install              # Install dependencies
npm run dev             # Start dev server (Vite)
npm run build           # Production build
npm run preview         # Preview production build

# Testing
npm run test            # Run unit tests (Vitest)
npm run test:e2e        # Run E2E tests (Playwright)
npm run test:coverage   # Generate coverage report

# Linting & Formatting
npm run lint            # ESLint check
npm run format          # Prettier format

# Database (Supabase)
npx supabase start      # Start local Supabase
npx supabase db reset   # Reset database
npx supabase gen types typescript --local > src/main/typescript/models/supabase.ts

# Git
git add .
git commit -m "feat: description"
git push origin main    # ALWAYS push after commit
```

## 🚨 TECHNICAL DEBT PREVENTION

### ❌ WRONG APPROACH (Creates Technical Debt):
```bash
# Creating new file without searching first
Write(file_path="src/main/typescript/routing/new_router.ts", content="...")
```

### ✅ CORRECT APPROACH (Prevents Technical Debt):
```bash
# 1. SEARCH FIRST
Grep(pattern="router.*implementation", glob="**/*.ts")
# 2. READ EXISTING FILES
Read(file_path="src/main/typescript/core/router.ts")
# 3. EXTEND EXISTING FUNCTIONALITY
Edit(file_path="src/main/typescript/core/router.ts", old_string="...", new_string="...")
```

## 🧹 DEBT PREVENTION WORKFLOW

### Before Creating ANY New File:
1. **🔍 Search First** - Use Grep/Glob to find existing implementations
2. **📋 Analyze Existing** - Read and understand current patterns
3. **🤔 Decision Tree**: Can extend existing? → DO IT | Must create new? → Document why
4. **✅ Follow Patterns** - Use established project patterns
5. **📈 Validate** - Ensure no duplication or technical debt

---

**⚠️ Prevention is better than consolidation - build clean from the start.**
**🎯 Focus on single source of truth and extending existing functionality.**
**📈 Each task should maintain clean architecture and prevent technical debt.**

---

🎯 **Template by Chang Ho Chien | HC AI 說人話channel | v1.0.0**
📺 **Tutorial**: https://youtu.be/8Q1bRZaHH24
🌐 **Repository**: https://github.com/geonook/Vibe-Map
