# VibeNav 部署指南

完整的生產環境部署文件

---

## 📋 部署檢查清單

### 前置準備
- [ ] Node.js 18+ 已安裝
- [ ] Docker 已安裝（Valhalla 用）
- [ ] Supabase 帳號已建立
- [ ] 網域已準備（可選）
- [ ] CDN 服務已設定（CloudFlare/Fastly）

---

## 🗂 部署架構

```
Production Setup:
├── Frontend (Vercel/Netlify/CloudFlare Pages)
├── Valhalla (自架 Docker / GraphHopper Cloud)
├── Supabase (Managed PostgreSQL + PostGIS + Edge Functions)
├── CDN (向量磚 + 靜態資源)
└── Monitoring (Sentry + PostHog)
```

---

## 1️⃣ Supabase 設定

### 1.1 建立專案

```bash
# 前往 https://supabase.com 建立新專案
# 記下：
# - Project URL: https://xxx.supabase.co
# - Anon Key: eyJhbGc...
# - Service Role Key: eyJhbGc... (私密！)
```

### 1.2 執行 Migrations

```bash
# 安裝 Supabase CLI
npm install -g supabase

# 連結專案
npx supabase link --project-ref <your-project-ref>

# 推送 schema
npx supabase db push

# 驗證
npx supabase db diff
```

### 1.3 啟用 PostGIS

```sql
-- 在 Supabase SQL Editor 執行
CREATE EXTENSION IF NOT EXISTS postgis;

-- 驗證
SELECT PostGIS_Version();
```

### 1.4 匯入 POI 資料

```bash
# 從 OSM 匯出台北 POI
ogr2ogr -f GeoJSON taipei-pois.geojson \
  "https://overpass-api.de/api/interpreter" \
  --config OSM_CONFIG_FILE ./overpass-query.ini

# 匯入 Supabase
psql $DATABASE_URL -c "
  COPY pois(location, type, name, green_score)
  FROM STDIN CSV HEADER
" < taipei-pois.csv
```

### 1.5 設定 RLS 政策

```sql
-- 已在 migrations 中定義，確認啟用：
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

---

## 2️⃣ Valhalla 路徑引擎

### 方案 A：自架 Docker（推薦開發/小規模）

```bash
# 1. 下載圖資（台灣為例）
wget https://download.geofabrik.de/asia/taiwan-latest.osm.pbf

# 2. 建立 Valhalla 資料目錄
mkdir -p valhalla_tiles

# 3. 啟動 Valhalla
docker run -d \
  --name valhalla \
  -p 8002:8002 \
  -v $(pwd)/valhalla_tiles:/data/valhalla \
  -v $(pwd)/taiwan-latest.osm.pbf:/data/osm/taiwan.pbf \
  -e tile_urls=/data/osm/taiwan.pbf \
  ghcr.io/gis-ops/docker-valhalla/valhalla:latest

# 4. 等待圖資處理（約 10-30 分鐘）
docker logs -f valhalla

# 5. 測試
curl -X POST http://localhost:8002/route \
  -H "Content-Type: application/json" \
  -d '{
    "locations": [
      {"lat": 25.0330, "lon": 121.5654},
      {"lat": 25.0430, "lon": 121.5754}
    ],
    "costing": "pedestrian"
  }'
```

### 方案 B：GraphHopper Cloud（推薦生產環境）

```bash
# 1. 註冊 https://www.graphhopper.com/
# 2. 取得 API Key

# 3. 設定環境變數
export VITE_GRAPHHOPPER_API_KEY=your-key
export VITE_GRAPHHOPPER_URL=https://graphhopper.com/api/1/route

# 4. 修改 routing.ts（使用 GraphHopper adapter）
```

---

## 3️⃣ 向量磚生成與部署

### 3.1 資料準備

```bash
# 匯出綠地
ogr2ogr -f GeoJSON green-spaces.geojson \
  PG:"host=db.xxx.supabase.co dbname=postgres user=postgres password=xxx" \
  -sql "SELECT location, name, green_score FROM pois WHERE type='green_space'"

# 匯出水域
ogr2ogr -f GeoJSON water.geojson \
  PG:"..." \
  -sql "SELECT location FROM pois WHERE type='water'"
```

### 3.2 使用 Tippecanoe 切磚

```bash
# 安裝 Tippecanoe
brew install tippecanoe

# 切磚（綠地）
tippecanoe -o green.mbtiles \
  -zg \
  -Z10 -z16 \
  --drop-densest-as-needed \
  --coalesce-densest-as-needed \
  --detect-shared-borders \
  green-spaces.geojson

# 解包成目錄結構
npm install -g @mapbox/mbutil
mb-util green.mbtiles public/tiles/green/

# 產生 tiles/{z}/{x}/{y}.pbf
```

### 3.3 部署到 CDN

#### CloudFlare R2（推薦）

```bash
# 安裝 Wrangler
npm install -g wrangler

# 登入 CloudFlare
wrangler login

# 建立 R2 bucket
wrangler r2 bucket create vibenav-tiles

# 上傳磚
wrangler r2 object put vibenav-tiles/green/10/0/0.pbf \
  --file=public/tiles/green/10/0/0.pbf

# 或使用 rclone 批次上傳
rclone sync public/tiles/ r2:vibenav-tiles/ \
  --progress \
  --checksum
```

#### 設定 CORS

```bash
# CloudFlare R2 CORS 設定
cat > cors.json <<EOF
[
  {
    "AllowedOrigins": ["https://vibenav.app"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
EOF

wrangler r2 bucket cors put vibenav-tiles --cors-config cors.json
```

---

## 4️⃣ 前端部署

### 4.1 Vercel 部署（推薦）

```bash
# 安裝 Vercel CLI
npm install -g vercel

# 登入
vercel login

# 部署
vercel --prod

# 設定環境變數（Vercel Dashboard）
# VITE_SUPABASE_URL=https://xxx.supabase.co
# VITE_SUPABASE_ANON_KEY=xxx
# VITE_VALHALLA_URL=https://valhalla.vibenav.app
```

### 4.2 CloudFlare Pages（替代方案）

```bash
# 建置
npm run build

# 上傳到 CloudFlare Pages
npx wrangler pages deploy dist \
  --project-name=vibenav \
  --branch=main
```

### 4.3 環境變數設定

```bash
# Vercel
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_VALHALLA_URL production

# CloudFlare Pages（在 Dashboard 設定）
```

---

## 5️⃣ Service Worker 設定

### 5.1 確認 PWA 設定

```typescript
// vite.config.ts 已設定
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.pbf$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'vector-tiles',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 天
              },
            },
          },
        ],
      },
    }),
  ],
});
```

### 5.2 驗證 Service Worker

```bash
# 建置後檢查
npm run build
npm run preview

# 開啟 Chrome DevTools > Application > Service Workers
# 確認已註冊且 Active
```

---

## 6️⃣ 監控與分析

### 6.1 Sentry 錯誤追蹤

```bash
# 安裝 Sentry
npm install @sentry/react @sentry/vite-plugin

# 設定
# src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://xxx@sentry.io/xxx",
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 0.1,
});
```

### 6.2 PostHog 分析

```bash
npm install posthog-js

# src/main.tsx
import posthog from 'posthog-js';

posthog.init('phc_xxx', {
  api_host: 'https://app.posthog.com',
  capture_pageview: false,
});
```

---

## 7️⃣ 網域與 SSL

### 7.1 設定自訂網域

```bash
# Vercel
vercel domains add vibenav.app

# CloudFlare
# Dashboard > Pages > Custom domains > Add domain
```

### 7.2 SSL 憑證

```
Vercel/CloudFlare 自動提供 Let's Encrypt SSL
無需手動設定
```

---

## 8️⃣ 效能優化

### 8.1 CDN 快取設定

```nginx
# CloudFlare Page Rules
# vibenav.app/tiles/*
# Cache Level: Cache Everything
# Edge Cache TTL: 1 month
# Browser Cache TTL: 1 week
```

### 8.2 Preload 關鍵資源

```html
<!-- index.html -->
<link rel="preload" href="/tiles/style.json" as="fetch" crossorigin>
<link rel="preload" href="/audio/birds.mp3" as="audio">
```

### 8.3 壓縮

```bash
# Vite 自動啟用 Gzip/Brotli
# 驗證：
curl -H "Accept-Encoding: br" https://vibenav.app -I | grep content-encoding
```

---

## 9️⃣ 備份與災難復原

### 9.1 Supabase 備份

```bash
# 每日自動備份（Supabase Pro）
# 或手動備份：
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# 上傳到 S3
aws s3 cp backup-*.sql s3://vibenav-backups/
```

### 9.2 Valhalla 圖資備份

```bash
# 備份 Valhalla tiles
tar -czf valhalla-tiles-$(date +%Y%m%d).tar.gz valhalla_tiles/

# 上傳到 R2
wrangler r2 object put vibenav-backups/valhalla-tiles.tar.gz \
  --file=valhalla-tiles-*.tar.gz
```

---

## 🔟 上線檢查清單

### 上線前

- [ ] 環境變數已設定（生產環境）
- [ ] Supabase migrations 已執行
- [ ] Valhalla 已部署且可訪問
- [ ] 向量磚已上傳 CDN
- [ ] Service Worker 已測試
- [ ] SSL 憑證已啟用
- [ ] 監控工具已設定（Sentry, PostHog）
- [ ] 備份機制已建立

### 上線後

- [ ] 效能測試（Lighthouse > 90）
- [ ] 壓力測試（k6/Artillery）
- [ ] 錯誤監控確認（Sentry Dashboard）
- [ ] 使用者追蹤確認（PostHog Dashboard）
- [ ] CDN 快取命中率 > 80%
- [ ] 資料庫查詢 < 100ms

---

## 📊 效能基準

| 指標 | 目標 | 測量工具 |
|------|------|---------|
| Lighthouse Performance | > 90 | Chrome DevTools |
| First Contentful Paint | < 1.5s | WebPageTest |
| Time to Interactive | < 3.5s | WebPageTest |
| Total Blocking Time | < 300ms | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |

---

## 🐛 故障排除

### Valhalla 無法連線
```bash
# 檢查服務狀態
docker ps | grep valhalla
docker logs valhalla

# 重啟
docker restart valhalla
```

### 向量磚 404
```bash
# 檢查 CORS
curl -H "Origin: https://vibenav.app" \
  https://cdn.vibenav.app/tiles/10/0/0.pbf -I

# 檢查檔案存在
aws s3 ls s3://vibenav-tiles/10/0/0.pbf
```

### Service Worker 未更新
```bash
# 強制更新
# Chrome DevTools > Application > Service Workers > Update
# 或清除快取
localStorage.clear();
caches.keys().then(keys => keys.forEach(key => caches.delete(key)));
```

---

**部署完成後，訪問 https://vibenav.app 驗證！** 🎉
