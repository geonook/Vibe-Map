# Vibe-Map-App 🗺️

A mobile navigation app that routes by "vibe" - optimizing your journey for greenery, quietness, culture, or scenery. Built with React Native/Expo and powered by Supabase.

## 🌟 Features

### 🎯 Vibe-Based Routing
- **🌳 Greenery**: Routes through parks, tree-lined streets, and nature
- **🔇 Quietness**: Avoids noisy areas and heavy traffic
- **🎨 Culture**: Passes by museums, galleries, and cultural landmarks
- **🏞️ Scenery**: Optimizes for beautiful views and interesting architecture

### 🚀 Core Capabilities
- **Weighted Pathfinding**: Customize your route based on vibe preferences
- **Real-time Location Sharing**: Share your location with friends during navigation
- **RAG-Powered POI Stories**: AI-generated stories about points of interest
- **Offline Support**: Download maps and routes for offline use

## 🛠️ Tech Stack

### Mobile App
- **React Native** with **Expo SDK 50+**
- **TypeScript** for type safety
- **MapLibre GL Native** for maps
- **Zustand** for state management
- **React Query** for data fetching

### Backend
- **Supabase** (PostgreSQL + PostGIS + pgvector)
- **Edge Functions** for serverless compute
- **Real-time** subscriptions for live updates
- **Vector embeddings** for RAG system

## 📁 Project Structure

```
vibe-map-app/
├── mobile/              # React Native/Expo app
│   ├── app/            # Expo Router screens
│   ├── components/     # Reusable components
│   ├── hooks/          # Custom React hooks
│   └── stores/         # State management
├── supabase/           # Backend configuration
│   ├── migrations/     # Database schema
│   └── functions/      # Edge Functions
├── src/                # Shared TypeScript code
│   └── main/typescript/
│       ├── core/       # Core algorithms
│       ├── models/     # Data models
│       └── services/   # Service layer
└── docs/               # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- Supabase CLI
- iOS Simulator (Mac) or Android Emulator

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/geonook/Vibe-Map.git
   cd vibe-map-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd mobile && npm install
   ```

3. **Set up Supabase**
   ```bash
   # Start local Supabase
   supabase start

   # Run migrations
   supabase db reset
   ```

4. **Configure environment**
   Create `.env` file in mobile directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

5. **Start development**
   ```bash
   # Start Expo
   cd mobile && npm start

   # Run on iOS
   npm run ios

   # Run on Android
   npm run android
   ```

## 📱 Development

### Mobile Development
```bash
cd mobile
npm start           # Start Expo dev server
npm run ios         # Run on iOS simulator
npm run android     # Run on Android emulator
npm test           # Run tests
```

### Backend Development
```bash
supabase start              # Start local Supabase
supabase functions serve    # Serve Edge Functions
supabase db reset          # Reset database
```

### Testing
```bash
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
```

## 🏗️ Architecture

### Vibe Routing Algorithm
The routing engine uses a weighted pathfinding algorithm that considers:
1. Base route from traditional routing services
2. Vibe scores calculated from POI density and characteristics
3. User preferences for each vibe dimension
4. Real-time data (traffic, events, weather)

### Data Flow
```
User Input → Mobile App → Supabase Edge Function → PostGIS Queries
    ↓            ↑              ↓                      ↓
  Preferences  MapLibre     Vibe Algorithm       POI Database
```

## 🔑 Key Features Implementation

### Vibe Score Calculation
```typescript
vibeScore = Σ(weight_i × dimension_score_i)
```

### Real-time Location Sharing
- WebSocket connections via Supabase Realtime
- Ephemeral share codes
- Automatic expiration

### RAG System
- POI descriptions stored as vector embeddings
- Similarity search for relevant context
- LLM-generated stories based on location

## 📚 Development Guidelines

1. **Read CLAUDE.md first** - Contains essential rules for development
2. Follow the pre-task compliance checklist
3. Use proper module structure under `src/main/typescript/`
4. Commit after every completed task
5. Single source of truth for all functionality

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-vibe`)
3. Commit your changes (`git commit -m 'Add amazing vibe feature'`)
4. Push to the branch (`git push origin feature/amazing-vibe`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- OpenStreetMap for map data
- MapLibre for mapping library
- Supabase for backend infrastructure
- React Native community

## 📞 Support

- [GitHub Issues](https://github.com/geonook/Vibe-Map/issues)
- [Documentation](./docs)

---

**Built with ❤️ for better navigation experiences**