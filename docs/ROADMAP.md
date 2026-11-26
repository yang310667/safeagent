# SafeAgent 開發路線圖（Roadmap）

本專案採分階段漸進式開發，共規劃七個主要階段：

| 階段 | 主題 | 核心交付項目 | 目前狀態 |
| --- | --- | --- | --- |
| **Day 1** | **專案初始化與基礎架構** | Monorepo 建置、Vue 3 桌面版 Layout 與頁面骨架、Cloudflare Workers + Hono 基礎 API（`/api/health`、`/api/config`、`/api/agent/chat` 501）、前後端連線檢查、GitHub Pages CI/CD 設定與基礎測試 | **已完成** |
| **Day 2** | **官方職安資料蒐集與知識庫** | 查證官方來源並建置結構化 JSON / Markdown 知識庫與公開職災案例、實作知識庫與案例查詢 API 及前端檢索介面 | **已完成** |
| **Day 3** | **OpenAI Live Agent 與 Function Calling** | 整合 OpenAI Responses API（Single Agent）、實作知識檢索與危害辨識工具呼叫、啟用 Workspace Live Agent 對話分析 | **已完成** |
| **Day 4** | **風險矩陣與結構化報告** | 確認官方風險評估指引後實作 5×5 風險矩陣計算規則、改善前與剩餘風險紀錄、結構化初步評估報告與 ECharts 視覺化 | **已完成** |
| **Day 5** | **SSE Streaming 與 Agent Execution Trace** | 實作後端 SSE 即時串流輸出、前端逐步顯示工具呼叫狀態、耗時與可追溯參考資料來源 | **已完成** |
| **Day 6** | **Agent 測試與評估** | 建立測試案例集，針對危害辨識完整性、法規引用正確性、來源可追溯性、風險計算與無依據內容率進行實測與紀錄 | **已完成** |
| **Day 7** | **正式部署與備審展示優化** | Cloudflare Workers 正式部署、GitHub Pages 發布驗證、文件統整與陽明交通大學碩士在職專班備審展示準備 | **已完成** |
