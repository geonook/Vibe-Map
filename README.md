# Vibe-Map-App 🗺️

A mobile navigation app that routes by "vibe" - optimizing your journey for greenery, quietness, culture, or scenery. Built with React Native/Expo and powered by Supabase.

## 🌟 Product Vision & Positioning

### 願景

打造一款「有氛圍、有情緒、有故事」的導航 App，不只是引導從 A → B，而是讓每一步路程都「值得走」。讓使用者能根據情緒與喜好選擇路線、體驗城市風景與文化。

### 核心差異化優勢

1. **情緒導向導航（Vibe Navigation）**：可依使用者偏好（綠蔭、安靜、文化、風景…）為路線加權，而不是只追求最短／最快。
2. **地理 + 向量資料庫整合**：使用 Supabase 提供的地理資料（PostGIS）與向量搜尋（pgvector / RAG）功能，支撐場域情境與路段故事檢索。
3. **即時共創 / 互動**：使用 Realtime 功能做即時位置分享、動態事件推播、使用者回饋機制。
4. **探索性體驗**：允許非最短路、繞景路線、主題路線等選擇。
5. **社群／內容驅動**：用戶可為路段打分、寫場景故事、分享特點；系統可用這些資料強化路線品質。

## 👥 目標使用者與需求分析

### Persona 範例

| 類型 | 特徵 | 對氛圍導航的需求 |
| --- | --- | --- |
| 城市散步愛好者 | 喜歡慢走、攝影、在城市裡體驗細節 | 希望途經小巷、公園、水岸、藝術巷弄 |
| 通勤 / 移動族 | 日常上班／返家路線固定 | 想偶爾走一條「心情好一些的路線」 |
| 旅遊者／文化探索者 | 對城市文化與景點有好奇 | 想在有限時間內走出有故事、有風景的路線 |
| 地方活動策劃者 / 城市行銷單位 | 想把特色街道、裝置藝術推給更多人 | 希望被 App 引導到他們希望展示的場域 |

### 使用者痛點與需求

* 現有導航只給最短、最快，缺乏「走起來舒服」的選擇
* 導航通常不會帶你到特色巷弄、壁畫、隱藏景點
* 中途若遇臨時活動／封路，導航再切換常常不靈活
* 想走有氛圍的路線，但缺乏直覺工具
* 希望在步行過程中得到故事／背景資訊提示

## 🧭 功能規劃與 MVP

### 功能模組總覽

| 模組 | 功能描述 | 額外備註 / 高階功能 |
| --- | --- | --- |
| 地圖與路網管理 | 載入地圖底圖、道路網路資料、地理圖層呈現 | 可支援多切片、動態圖磚 |
| 路徑搜尋 / Vibe 加權 | 計算最短路線 + 氛圍路線 + 折中路線 | 多目標優化、k-shortest 等 |
| Vibe 指標體系 | 綠蔭、安靜、文化、景觀、照明、路面品質等 | 可新增指標、權重可調 |
| 使用者偏好界面 | 滑桿 / 權重選擇、預設 Vibe 模式 | 可切換不同模式 |
| 路線選擇與比較 | 顯示多條候選路線，展示時間／距離／vibe 分數對比 | 圖形化比較 (雷達圖、條形圖) |
| 導航引導 | 畫路徑、提示轉彎、進度狀態 | 基本箭頭／地圖導航 |
| 回饋與評分 | 導航完成後讓使用者做主觀評分 | 多維評分 + 留言 |
| 即時共創 / 互動 | 即時位置分享、動態事件推播 | 不同房間 / 群組共享 |
| RAG / 向量檢索 | 自然語言查詢氛圍路線、途中顯示地標故事 | 向量相似度 + 全文檢索 |
| 權限 / 安全機制 | RLS、分房間等權限控制 | 社群共創時防止濫用 |

### MVP 功能範圍

1. 地圖 + 路網載入 + 最短路徑搜尋
2. 至少 2–3 個 Vibe 指標 + 權重設定滑桿
3. 加權路徑搜尋（最短 vs 氛圍優先 vs 折中）
4. 路線選擇與地圖渲染
5. 基本導航引導
6. 使用者回饋／評分機制
7. Realtime 即時位置繪製
8. 基礎 RAG 搜索

## 🏗️ 技術架構設計（Supabase 為核心）

### 核心元件與技術選型

| 層 / 元件 | 技術 / 套件 | 作用 / 責任 |
| --- | --- | --- |
| 資料庫 | Supabase Postgres + PostGIS + pgRouting + pgvector | 儲存地理／邏輯資料、路徑搜尋、向量檢索 |
| 實時 / 訂閱 | Supabase Realtime / Broadcast / Presence | 即時位置分享、動態事件推播 |
| 邏輯 / API | Supabase Edge Functions 或後端服務 | 處理路徑計算、Cost 函式、RAG 檢索 |
| 地圖前端 | MapLibre GL JS / React Native | 地圖渲染、圖層控制、互動 |
| 客戶端 | React Native / Expo | 使用者介面、導航體驗 |
| 身份與權限 | Supabase Auth + RLS | 登入、行級資料存取控管 |
| 向量搜尋 / RAG | pgvector + Embedding Pipeline | 地標 / 路段描述檢索、自然語言偏好 |
| 緩存 / 加速 | Materialized Views、索引、預計算切片 | 提升查詢效能與回應速度 |

### 資料表草圖（關鍵）

```text
locations (id, user_id, lat, lon, geom, updated_at)
road_nodes (id, geom)
road_edges (id, source, target, geom, length_m, speed_kph, base_cost)
edge_vibes (edge_id, greenery, quietness, culture, scenic, lighting, updated_at)
user_feedback (id, user_id, edge_id, ratings…, comment, created_at)
pois (id, name, category, geom, meta)
poi_docs (id, poi_id, content, embedding vector)
live_events (id, kind, geom, starts_at, ends_at, payload JSONB)
```

`geom` 欄位採 GiST 索引，向量欄位使用 pgvector 索引，常查欄位使用 B-tree / GIN。並以 `edge_cost_view` 或函式將 Vibe 欄位、動態事件與偏好轉換為路徑成本。

## 🗓️ 開發路線圖

| 週數 | 重點目標 / Deliverable |
| --- | --- |
| 1–2 | Persona、使用流程、UI 原型完成 |
| 3–4 | Supabase 專案、PostGIS/pgvector/pgRouting 啟用、核心資料表與 RLS |
| 5–6 | 匯入測試城市 OSM 路網，建立 `road_nodes` / `road_edges` 拓樸 |
| 7–8 | 最短路徑搜尋模組 + 基本 API |
| 9–10 | Vibe 指標 + 權重邏輯 + 加權路徑模型 |
| 11–12 | 前端地圖 UI + 路線比較介面 + 權重滑桿 |
| 13–14 | 即時位置共享 (Realtime) + 地圖呈現 |
| 15–16 | 回饋 / 評分模組 |
| 17–18 | 基礎 RAG 搜索整合 |
| 19–20 | 測試、效能優化、壓測 |
| 21–22 | Beta 釋出與使用者測試 |
| 23–26 | 收集回饋、修正、擴充次要功能 |
| 27–30 | 正式上線準備 |

每個里程碑應包含 Demo、測試與回饋迴圈。

## ⚠️ 風險與對策

| 風險 / 假設 | 可能影響 | 對策 |
| --- | --- | --- |
| 使用者不願多走路 | 氛圍路線被忽略 | 標示時間差與距離差、提供折衷選擇 |
| Vibe 資料不精確 | 路段評分失真 | 初期用估算 + 回饋，後期導入感測 / 影像資料 |
| 加權後效能下降 | 大城市運算變慢 | 索引、預計算、圖分割與剪枝策略 |
| Realtime 擴充困難 | 即時位置壅塞 | 節流、分房間頻道、Broadcast/Presence 切換 |
| 權限 / 隱私問題 | 位置濫用 | RLS、授權、匿名化、群組共享機制 |
| 使用者回饋不足 | 難以形成社群資料 | 提供激勵機制、簡化評分流程 |

## 🎯 KPI / 成功指標

### 目標 1：打造被使用者認可的氛圍導航產品
- Beta 版 30 天內累積 ≥ 1,000 次導航
- 氛圍路線滿意度 ≥ 4.0 / 5.0
- 導航成功率 ≥ 95%

### 目標 2：建立穩健資料與社群回饋機制
- 每條邊具備最低回饋量門檻
- 地標搜尋 RAG 準確率 ≥ 80%
- 第 7 天留存率 ≥ 30%

### 監控指標
- DAU / MAU
- 平均導航時間差（最短 vs 氛圍）
- 評分率與處理時間
- 系統效能：API 延遲、查詢時間、地圖渲染時間

## 🔭 未來進階功能方向

* AR 導覽提示
* 更多 Vibe 指標（聲音、空氣品質、燈光等）
* 主題路線包與場景策展
* 突發事件自動 reroute
* 群體導航 / 互動導覽
* 跨城支援、多語系化
* 本地化最佳化與資料擴充

---

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