# AGENTS.md — SafeAgent 長期 AI Coding Agent 開發規範

本文件定義 AI Coding Agent 在協作開發 **SafeAgent（AI 產業安全與風險評估助手）** 時必須遵守的長期規範。

## 1. 語言與命名規範

- 所有開發說明、文件、UI 文案與回應均使用**繁體中文（台灣）**。
- 程式碼中的變數、函式、類別、型別與檔案名稱使用**英文**，維持語意清晰。
- 維持嚴格的 TypeScript 型別安全（`strict: true`），前後端共用型別統一維護於 `packages/shared`。

## 2. 技術架構約束

- 不得自行更換主要技術架構：
  - **Frontend**：Vue 3 + TypeScript + Vite + Composition API (`<script setup>`) + Vue Router + Pinia + Tailwind CSS + Lucide Vue Next。
  - **Backend**：Cloudflare Workers + TypeScript + Hono + Wrangler。
  - **AI Agent（後續階段）**：OpenAI Responses API + Single Agent Architecture + Function Calling + Structured Outputs（第一版不使用 LangChain、LangGraph 或其他複雜 Agent Framework）。
  - **Knowledge Base（後續階段）**：JSON 與 Markdown（暫不使用關聯式資料庫與向量資料庫）。
- 避免加入不必要的第三方依賴與過度設計（Over-engineering）。
- 本專案以**桌面版**為主要展示環境（1440×900 為主，支援 1280×800 及 1920×1080），不需要開發手機版 RWD 或 Mobile Navigation Drawer。

## 3. 領域誠實與安全原則（Occupational Safety & Research Integrity）

- **不得編造職安法規、官方指引及職災案例**。
- 所有正式知識庫資料必須具備可追溯之官方資料來源（發布機關、官方網址與更新日期）。
- **不得使用假的 Agent 執行紀錄**（Execution Trace），僅可呈現真實工具執行摘要與公開來源。
- **不得將模擬資料或研究構想宣稱為真實研究結果或已完成現場設備驗證**。
- **不得讓 LLM 自行決定未經使用者確認的風險評估分數**；風險計算須由明確規則與工具輔助，並由使用者確認現場條件。
- **不得將 AI 建議視為正式作業安全許可**，所有頁面須清楚定位為自主學習與研究概念驗證（PoC）。

## 4. 資安與金鑰管理

- **絕對不得暴露 API Key 或 Secret**（包含程式碼、Git 歷史紀錄、Console Log、API Response、或前端 `VITE_*` 環境變數）。
- `OPENAI_API_KEY` 僅可透過 `.dev.vars`（本機且不進版控）或 Cloudflare Workers Secret 管理。
- 不得宣稱尚未實作的安全防護機制（例如 Rate Limiting）已經生效。

## 5. 開發流程與品質驗證

- 每次完成開發修改後，必須於根目錄執行並確認通過以下指令：
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
- 每個開發階段完成後，必須更新 `docs/ROADMAP.md` 反映實際進度。
- **未經使用者明確同意，不得擅自開通付費服務、建立遠端雲端資源或部署至正式環境**。
