# VibeNav (心境導航)

**Navigate by feeling, not just destination**

VibeNav is an emotion-aware navigation app that routes you through healing paths when you're feeling down. Unlike traditional GPS that optimizes for speed, VibeNav uses geographic vibe scoring (green spaces, waterfront proximity, quiet streets, cafe density) to generate therapeutic walking routes with real-time turn-by-turn navigation, ambient soundscapes, and haptic feedback.

---

## 🌟 Core Features

- 🧠 **Emotion-driven routing** - Routes adapt to your emotional state
- 🌳 **Geographic vibe scoring** - Green spaces, waterfront, quiet streets, cafe density
- 🗺️ **60fps smooth map rendering** - MapLibre GL + deck.gl for silky performance
- 🎵 **Ambient soundscapes** - Therapeutic audio experiences for your journey
- 📳 **Haptic feedback** - Gentle navigation cues that feel natural
- 🔄 **Real-time turn-by-turn navigation** - Live route guidance
- 🌐 **Offline-capable** - Service Worker for offline map and route access
- 🔐 **Privacy-first** - Supabase RLS (Row Level Security) protects user data

---

## 🛠️ Tech Stack

### Frontend (TypeScript - 70%)
- **React 18** - UI framework
- **MapLibre GL JS** - Open-source map rendering
- **deck.gl** - GPU-accelerated data visualization (60fps)
- **Vite** - Lightning-fast build tool and dev server
- **TanStack Query** - Powerful data fetching and caching
- **Zustand** - Lightweight state management
- **Tailwind CSS** - Utility-first styling
- **Workbox** - Service Worker/PWA capabilities

### Backend / Data (SQL/TypeScript - 20%)
- **Supabase** - PostgreSQL + PostGIS + Edge Functions
- **PostGIS** - Spatial database for geographic queries
- **Valhalla** - Open-source routing engine (C++ via REST API)

### Tooling (JavaScript - 10%)
- **TypeScript** - Type safety across the stack
- **Vitest** - Blazing-fast unit testing
- **Playwright** - Reliable E2E testing
- **Tippecanoe** - Vector tile generation for maps

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or pnpm
- Supabase account (free tier available)
- Valhalla routing API (self-hosted or cloud)

### Installation

```bash
# 1. Clone repository
git clone https://github.com/geonook/Vibe-Map.git
cd vibe-map

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your actual values:
# - VITE_SUPABASE_URL=https://your-project.supabase.co
# - VITE_SUPABASE_ANON_KEY=your-anon-key
# - VITE_VALHALLA_URL=http://localhost:8002

# 4. Start Valhalla (Docker)
docker run -d -p 8002:8002 \
  --name valhalla \
  ghcr.io/gis-ops/docker-valhalla/valhalla:latest

# 5. Initialize Supabase
npx supabase init
npx supabase start

# 6. Run database migrations
npx supabase db push

# 7. Start development server
npm run dev
```

**Note:** The core backend system (vibe scoring, navigation engine, Supabase schema) is complete. UI components are pending implementation.

### Development

```bash
# Run dev server (Vite)
npm run dev

# Run tests
npm run test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📁 Project Structure

```
vibe-map/
├── CLAUDE.md              # Project rules and guidelines
├── README.md              # This file (you are here)
├── .env.example           # Environment variable template
├── .gitignore             # Git ignore patterns
├── package.json           # NPM dependencies (17 core + 25 dev)
├── tsconfig.json          # TypeScript config with path aliases
├── vite.config.ts         # Vite + PWA config
├── src/
│   ├── main/
│   │   ├── typescript/    # ✅ TypeScript source (7 files)
│   │   │   ├── core/      # ✅ vibe-scoring.ts, navigation-engine.ts
│   │   │   ├── models/    # ✅ index.ts (all type definitions)
│   │   │   ├── services/  # ✅ routing.ts, supabase.ts
│   │   │   ├── stores/    # ✅ navigation.ts (Zustand)
│   │   │   ├── audio/     # ✅ ambience-controller.ts
│   │   │   ├── components/ # 📋 Pending (MapContainer, RoutePanel, etc.)
│   │   │   ├── map/       # 📋 Pending (deck.gl overlays)
│   │   │   ├── api/       # 📋 Pending
│   │   │   └── utils/     # 📋 Pending
│   │   └── resources/
│   │       ├── config/    # ✅ vibe-weights.json
│   │       ├── styles/    # 📋 Pending (Tailwind CSS)
│   │       └── assets/    # 📋 Pending (audio files, images)
│   └── test/
│       ├── unit/          # 📋 Pending
│       └── integration/   # 📋 Pending
├── supabase/
│   └── migrations/        # ✅ 001_init_schema.sql
├── public/                # 📋 Pending (static assets)
├── docs/                  # ✅ 4 complete documentation files
│   ├── IMPLEMENTATION.md  # Complete implementation guide
│   ├── DEPLOYMENT.md      # Production deployment guide
│   ├── SUMMARY.md         # Implementation summary
│   └── DOUBLE_CHECK.md    # Technical verification report
└── dist/                  # Build output (auto-generated)

Legend:
✅ Implemented and verified
📋 Pending implementation
```

---

## ⚙️ Technical Corrections Applied

This implementation includes **10 critical technical corrections** based on production best practices:

| # | Issue | Original Approach | ✅ Corrected Approach | File |
|---|-------|-------------------|---------------------|------|
| 1 | **Valhalla Routing** | Direct costing injection | Post-ranking with feature enrichment | `routing.ts` |
| 2 | **PostGIS Query** | Direct geography scan | bbox pre-filter + geography | `001_init_schema.sql` |
| 3 | **Vibe Scoring** | No null checks | Null-safe with confidence weighting | `vibe-scoring.ts` |
| 4 | **Off-route Detection** | Distance only | Distance + bearing + continuity | `navigation-engine.ts` |
| 5 | **Audio Transitions** | Abrupt switching | Smooth fade in/out (1.5-2s) | `ambience-controller.ts` |
| 6 | **Privacy Protection** | Raw timestamps | Anonymized to hour granularity | `001_init_schema.sql` |
| 7 | **Service Worker** | Runtime cache only | Precache + runtime strategies | `vite.config.ts` |
| 8 | **Vector Tiles** | Direct .mbtiles | Unpacked directory structure | DEPLOYMENT.md |
| 9 | **deck.gl Memory** | No cleanup | Proper disposal on unmount | IMPLEMENTATION.md |
| 10 | **Edge Functions** | Cold start issue | Warmup mechanism | IMPLEMENTATION.md |

**All corrections are documented in [DOUBLE_CHECK.md](docs/DOUBLE_CHECK.md)**

---

## 🧠 How It Works

### 1. Emotion State Detection
User inputs their current emotional state and intensity.

```typescript
enum EmotionState {
  SAD_LOW_ENERGY = 'sad_low_energy',
  ANXIOUS = 'anxious',
  LONELY = 'lonely',
  BURNT_OUT = 'burnt_out',
  NEUTRAL = 'neutral'
}
```

### 2. Vibe Scoring Algorithm (Corrected - Null-Safe)
Each street segment is scored with confidence weighting:

```typescript
// ✅ Null-safe scoring with confidence metrics
function scoreSegment(features, weights): { score, confidence } {
  let validCount = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (value !== undefined && value !== null && !isNaN(value)) {
      score += value * weight;
      validCount++;
    }
  }
  const confidence = validCount / totalWeights;
  return { score: score * confidence, confidence };
}
```

**Vibe Factors:**
- Green Space Coverage (30%)
- Water Proximity (25%)
- Quiet Streets (20%)
- Cafe Density (15%)
- Cultural Points (10%)

### 3. Route Generation (Corrected - Post-Ranking)
**✅ Modified approach:** Valhalla generates 3 base routes → Enrich with spatial features from PostGIS → Re-rank by vibe score.

```typescript
// 1. Get 3 base routes from Valhalla
const baseRoutes = await valhalla.getRoutes(origin, destination);

// 2. Enrich with spatial features from Supabase PostGIS
const enriched = await Promise.all(
  baseRoutes.map(route => enrichWithFeatures(route, supabase))
);

// 3. Re-rank by vibe score
const reranked = rerankRoutes(enriched, emotion, { nightMode });
```

### 4. Real-time Navigation (Corrected - Bearing Detection)
**✅ Improved off-route detection:** Distance + bearing angle + continuity check.

```typescript
// Off-route: distance > 30m AND bearing diff > 45°
isOffRoute(position, heading) {
  const perpDistance = this.perpendicularDistance(position, nearest);
  const bearingDiff = Math.abs(heading - nearest.bearing);
  return (perpDistance > 30 && bearingDiff > 45) || perpDistance > 50;
}
```

**Features:**
- MapLibre GL + deck.gl rendering
- Smooth ambient soundscapes (fade in/out)
- Haptic feedback (light/medium/heavy)
- Web Speech API voice guidance

---

## 🎯 Development Guidelines

### Before Starting ANY Task
1. **Read [CLAUDE.md](CLAUDE.md) first** - Contains essential rules for Claude Code
2. Follow the pre-task compliance checklist
3. Use proper module structure under `src/main/typescript/`
4. Commit after every completed task
5. Push to GitHub after every commit

### Technical Debt Prevention
- **Always search first** before creating new files
- **Extend existing** functionality rather than duplicating
- **Use Task agents** for operations >30 seconds
- **Single source of truth** for all functionality

---

## 📚 Documentation

### Essential Docs
- **[CLAUDE.md](CLAUDE.md)** - Development rules and guidelines
- **[IMPLEMENTATION.md](docs/IMPLEMENTATION.md)** - Complete implementation guide with all technical corrections
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Production deployment guide (Supabase/Valhalla/CDN)
- **[SUMMARY.md](docs/SUMMARY.md)** - Implementation summary and roadmap
- **[DOUBLE_CHECK.md](docs/DOUBLE_CHECK.md)** - Technical verification report

### Implementation Status
- ✅ **Core Type System** - EmotionState, SegmentFeatures, RouteCandidate
- ✅ **Vibe Scoring Engine** - Null-safe scoring with confidence metrics
- ✅ **Valhalla Integration** - Post-ranking approach (corrected)
- ✅ **Navigation Engine** - Bearing-based off-route detection (corrected)
- ✅ **Audio Controller** - Smooth fade in/out transitions (corrected)
- ✅ **Supabase Schema** - Optimized PostGIS queries with bbox pre-filter
- ✅ **State Management** - Zustand stores for navigation/emotion/map
- 📋 **UI Components** - Pending (MapContainer, RoutePanel, NavigationHUD, EmotionPicker)

---

## 🧪 Testing

```bash
# Unit tests (Vitest)
npm run test

# E2E tests (Playwright)
npm run test:e2e

# Coverage report
npm run test:coverage
```

---

## 📦 Deployment

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy to Vercel/Netlify/Cloudflare Pages
# (configure in respective platform dashboard)
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Read [CLAUDE.md](CLAUDE.md) for development rules
4. Commit your changes (`git commit -m 'feat: add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Template by**: Chang Ho Chien | HC AI 說人話channel
- **Tutorial**: https://youtu.be/8Q1bRZaHH24
- **MapLibre GL**: Open-source mapping
- **deck.gl**: GPU-accelerated visualization
- **Valhalla**: Open-source routing
- **Supabase**: Open-source Firebase alternative

---

## 📞 Contact

- **Repository**: https://github.com/geonook/Vibe-Map
- **Issues**: https://github.com/geonook/Vibe-Map/issues

---

**Navigate by feeling, not just destination** 🧭💙
