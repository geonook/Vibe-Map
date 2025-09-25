# CLAUDE.md - Vibe-Map-App

> **Documentation Version**: 1.0
> **Last Updated**: 2025-01-25
> **Project**: Vibe-Map-App
> **Description**: A mobile navigation app that routes by "vibe" (greenery, quietness, culture, scenery), built on Supabase (Postgres + PostGIS + pgvector + Realtime) with MapLibre for maps
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

### 🎯 **GITHUB REPOSITORY**
- **Repository URL**: https://github.com/geonook/Vibe-Map.git
- **Default Branch**: main
- **Auto-backup**: Enabled after every commit

### 📋 **GITHUB BACKUP WORKFLOW** (MANDATORY)
```bash
# After every commit, always run:
git push origin main

# This ensures:
# ✅ Remote backup of all changes
# ✅ Collaboration readiness
# ✅ Version history preservation
# ✅ Disaster recovery protection
```

## 🏗️ PROJECT OVERVIEW

### 🎯 **VIBE-MAP-APP ARCHITECTURE**

**Mobile Navigation by Vibe** - Routes optimized for greenery, quietness, culture, and scenery

### 📱 **MOBILE APP (React Native/Expo)**
- **Framework**: Expo SDK with React Native
- **Language**: TypeScript
- **Maps**: MapLibre GL Native
- **State Management**: Zustand/Redux Toolkit
- **Navigation**: Expo Router

### 🗄️ **BACKEND (Supabase)**
- **Database**: PostgreSQL with PostGIS + pgvector extensions
- **Real-time**: Supabase Realtime for location sharing
- **Edge Functions**: TypeScript/Deno for serverless compute
- **RAG System**: Vector embeddings for POI stories
- **Auth**: Supabase Auth

### 🗺️ **VIBE ROUTING ENGINE**
- **Algorithm**: Weighted pathfinding with vibe scores
- **Vibe Dimensions**:
  - 🌳 Greenery (parks, trees, nature)
  - 🔇 Quietness (noise levels, traffic)
  - 🎨 Culture (museums, galleries, landmarks)
  - 🏞️ Scenery (views, architecture, aesthetics)
- **Data Sources**: OSM, user contributions, ML inference

### 📁 **PROJECT STRUCTURE**
```
vibe-map-app/
├── mobile/          # React Native/Expo app
├── supabase/        # Backend (migrations, functions)
├── src/main/typescript/  # Shared TypeScript code
└── docs/            # Documentation
```

### 🎯 **DEVELOPMENT STATUS**
- **Setup**: ✅ In Progress
- **Core Features**: ⏳ Pending
- **Testing**: ⏳ Pending
- **Documentation**: ⏳ Pending

## 📋 TECHNOLOGY STACK

### **Frontend**
- React Native 0.73+
- Expo SDK 50+
- TypeScript 5.3+
- MapLibre GL Native
- React Query for data fetching

### **Backend**
- Supabase Platform
- PostgreSQL 15+
- PostGIS 3.3+
- pgvector 0.5+
- Deno for Edge Functions

### **Development Tools**
- ESLint + Prettier
- Jest for testing
- GitHub Actions for CI/CD

## 🚀 COMMON COMMANDS

```bash
# Mobile Development
cd mobile && npm run start     # Start Expo dev server
cd mobile && npm run ios       # Run on iOS simulator
cd mobile && npm run android   # Run on Android emulator

# Supabase Development
supabase start                 # Start local Supabase
supabase db reset              # Reset and seed database
supabase functions serve       # Serve edge functions locally

# Testing
npm test                        # Run all tests
npm run test:unit              # Run unit tests
npm run test:integration       # Run integration tests

# Build & Deploy
npm run build:mobile           # Build mobile app
npm run deploy:functions       # Deploy edge functions
```

## 🚨 TECHNICAL DEBT PREVENTION

### ❌ WRONG APPROACH (Creates Technical Debt):
```bash
# Creating new file without searching first
Write(file_path="new_routing.ts", content="...")
```

### ✅ CORRECT APPROACH (Prevents Technical Debt):
```bash
# 1. SEARCH FIRST
Grep(pattern="routing.*algorithm", include="*.ts")
# 2. READ EXISTING FILES
Read(file_path="src/main/typescript/core/routing/index.ts")
# 3. EXTEND EXISTING FUNCTIONALITY
Edit(file_path="src/main/typescript/core/routing/index.ts", old_string="...", new_string="...")
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