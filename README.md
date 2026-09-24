# 台灣即時氣象地圖 (CWA Weather Monitor)

以中央氣象署 (CWA) 即時觀測資料繪製的全台氣象地圖，支援氣溫／雨量／濕度／風速圖層切換，並疊加風場粒子動畫。

這是 [AIot-HW1-CWA](https://github.com/BlueET1/AIot-HW1-CWA) 課程作業的延伸作品，該作業本身是另一個獨立的 Streamlit 專案。

## 功能

- **深色互動地圖**：MapLibre GL + OpenFreeMap 向量圖磚（免金鑰）
- **363 個即時測站**：CWA `O-A0003-001`（局屬氣象站 10 分鐘綜觀觀測），每 5 分鐘自動更新
- **四種圖層**：氣溫、雨量、濕度、風速，各有獨立色階與圖例
- **風場粒子動畫**：以 [Open-Meteo](https://open-meteo.com/) 的格點風場資料驅動的 canvas 粒子系統
- **颱風圖層**：解析 CWA `W-C0034-001` 颱風警報公報，無生效警報時顯示空狀態
- **測站詳細資訊**：點擊地圖標記或從選單挑選測站

## 技術棧

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · MapLibre GL JS

## 本機開發

```bash
npm install
```

建立 `.env.local`，填入你自己在[氣象資料開放平臺](https://opendata.cwa.gov.tw/)申請的授權碼：

```
CWA_API_KEY=CWA-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```

```bash
npm run dev
```

開啟 http://localhost:3000。

## 部署

部署於 Vercel。API 金鑰設定在專案的 Environment Variables（變數名稱 `CWA_API_KEY`，不加 `NEXT_PUBLIC_` 前綴），僅於伺服器端的 Route Handler 使用，不會被打包進前端。

## 實作備註

- `public/maplibre-gl-worker.mjs` 與 `public/maplibre-gl-shared.mjs` 是從 `node_modules/maplibre-gl/dist/` 原封不動複製出來的。MapLibre 透過 `new URL(..., import.meta.url)` 載入 Worker，Turbopack 與 webpack 都無法讓這組檔案在正式環境被正確取用，因此改為自行託管並以 `setWorkerUrl()` 指定。升級 maplibre-gl 時需一併更新這兩個檔案。
- 地圖容器使用行內樣式定位，而非 Tailwind 的 `absolute`。MapLibre 會在容器上加入 `.maplibregl-map`，其未分層的 `position: relative` 會蓋過 Tailwind v4 置於 `@layer utilities` 的 `.absolute`（未分層樣式優先權高於分層樣式），導致容器高度塌陷為 0。

## 授權

MIT
