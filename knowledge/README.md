# SafeAgent Knowledge Base

本目錄儲存經查證之官方職業安全衛生知識資料與公開職災案例（JSON 結構化資料 + Markdown 說明），所有條目均附帶發布機關、官方網址與查證／修正日期，供後端 API（`/api/knowledge`、`/api/hazards`、`/api/accident-cases`）與未來 Day 3 AI Agent Function Calling 檢索使用。

## 目錄結構

- `regulations/regulations.json`：全國法規資料庫查證之職業安全衛生法規重點（職業安全衛生法、職業安全衛生設施規則、高架作業勞工保護措施標準、職業安全衛生管理辦法、危害性化學品標示及通識規則）。
- `guidelines/guidelines.json`：勞動部職業安全衛生署公開指引與實務要點（風險評估指引、局限空間作業安全防護、斷電上鎖掛牌 LOTO、屋頂防墜實務）。
- `hazards/hazards.json`：危害類型分類與控制階層（消除／替代、工程控制、行政管理、PPE）結構化資料。
- `accident-cases/cases.json`：勞動部職業安全衛生署「職災案例宣導」公開重大職災案例摘要。

## 收錄與誠實原則

1. 嚴禁編造未存在之法條條文或虛構真實職災事件。
2. 每筆條目必須包含 `source`（`title`、`publisher`、`officialUrl`、`updatedAt`、`citationSummary`）確保可追溯性。
3. 僅呈現官方公開資訊所載內容，不推論或補寫未公開之事故時間與個資。
