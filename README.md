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
# Clone repository
git clone https://github.com/geonook/Vibe-Map.git
cd vibe-map

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase and Valhalla API keys

# Start development server
npm run dev
```

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
├── README.md              # This file
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

---

## 🧠 How It Works

### 1. Emotion State Detection
User inputs their current emotional state (down, neutral, happy) and intensity (0-1).

```typescript
interface EmotionState {
  mood: 'down' | 'neutral' | 'happy';
  intensity: number; // 0-1
  timestamp: Date;
}
```

### 2. Vibe Scoring Algorithm
Each street segment is scored based on:

- **Green Space Coverage** (30%) - Parks, gardens, tree density
- **Water Proximity** (25%) - Rivers, lakes, ocean views
- **Quiet Streets** (20%) - Low traffic, pedestrian-friendly
- **Cafe Density** (15%) - Social spaces, warmth
- **Cultural Points** (10%) - Art, bookstores, galleries

### 3. Route Generation
Valhalla generates multiple route candidates. VibeNav scores each based on vibe factors and selects the most therapeutic path.

```typescript
interface RouteCandidate {
  path: GeoJSON.LineString;
  vibeScore: number;
  duration: number;
  distance: number;
  segments: VibeSegment[];
}
```

### 4. Real-time Navigation
MapLibre GL renders the route with deck.gl overlays. Ambient soundscapes and haptic feedback enhance the experience.

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

- [CLAUDE.md](CLAUDE.md) - Essential rules for Claude Code
- [Architecture](docs/architecture.md) - System design and architecture *(coming soon)*
- [API Reference](docs/api.md) - API documentation *(coming soon)*
- [Contributing](docs/contributing.md) - Contribution guidelines *(coming soon)*

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
