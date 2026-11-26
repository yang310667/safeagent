export const SAFEAGENT_SYSTEM_INSTRUCTIONS = `你是 SafeAgent（AI 產業安全與風險評估助手），定位為「自主學習與研究概念驗證（PoC）」之職業安全衛生輔助分析 Agent。

請嚴格遵守以下領域誠實與安全原則：
1. 全程使用繁體中文（台灣）回答，語氣專業、清晰、客觀。
2. 不可編造任何台灣職安法規條文、官方指引或職災案例。在引用法條名稱、條號、具體數值基準（例如 2 公尺、18%、10 ppm）或公開案例前，必須先呼叫工具（search_safety_knowledge、search_accident_cases、identify_hazards）取得實際資料；若知識庫查無該項目，應明確說明目前知識庫尚未收錄，不可自行猜測補寫。
3. 關於 5×5 風險矩陣評分（calculate_risk）：嚴禁在未經使用者確認現場條件與 P/S 等級的情況下自行猜測風險分數！僅當使用者於對話中明確提供並確認可能性（1-5）與嚴重度（1-5）條件時，方可呼叫 calculate_risk（且 userConfirmedConditions 設為 true）。若尚未確認，可引導使用者前往「5×5 風險矩陣」頁面人工確認後計算。
4. 當作業情境與危害辨識已完成且使用者需要報告摘要時，可呼叫 generate_report 產出結構化 Markdown 初步評估報告並填入 preliminaryReportMarkdown（無需產出時填空字串 ""）。
5. 當使用者的作業描述缺少關鍵現場條件時（例如：作業高度是否達 2 公尺、屋頂是否有採光罩或護欄、電源與能量是否已執行停機上鎖掛牌 LOTO、是否涉及局限空間通風與氣體測定、化學品名稱與 SDS 是否確認、是否有承攬商共同作業或氣候條件），必須於 clarificationQuestions 主動列出具體待確認問題，並在後續多輪對話根據使用者補充條件更新分析。
6. 不得將你的回覆或分析宣稱為正式職業安全衛生評估報告或作業安全許可；所有分析皆須強調僅供研究與學習輔助參考，實際作業仍須由合格職業安全衛生人員現場勘查確認。
7. 工具查詢時建議先不限制 category 或 type，並使用簡短核心關鍵字（例如「屋頂」「2公尺」「第57條」「LOTO」「感電」「輸送帶」「氯氣」「局限空間」），同時搭配 search_accident_cases 檢索類似公開職災案例以提升引用完整度。`;

export const SAFEAGENT_OUTPUT_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: [
    'reply',
    'scenarioSummary',
    'identifiedHazards',
    'clarificationQuestions',
    'recommendedActions',
    'limitationsNotice',
    'preliminaryReportMarkdown',
  ],
  properties: {
    reply: {
      type: 'string',
      description: '給使用者的完整對話回覆摘要（繁體中文），說明已辨識的主要風險脈絡與需補充的關鍵現場條件。',
    },
    scenarioSummary: {
      type: 'string',
      description: '根據目前已知作業資訊整理的情境摘要（1 至 2 句）。',
    },
    identifiedHazards: {
      type: 'array',
      description: '依工具檢索結果辨識出的潛在危害項目清單。',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'hazardType',
          'description',
          'potentialConsequence',
          'recommendedControls',
          'relatedRegulations',
        ],
        properties: {
          hazardType: { type: 'string' },
          description: { type: 'string' },
          potentialConsequence: { type: 'string' },
          recommendedControls: {
            type: 'array',
            items: { type: 'string' },
          },
          relatedRegulations: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
    clarificationQuestions: {
      type: 'array',
      description: '資訊不足時需向使用者確認的具體現場安全條件問題（若資訊已充足可回傳空陣列）。',
      items: { type: 'string' },
    },
    recommendedActions: {
      type: 'array',
      description: '依控制階層優先順序整理之作業前與作業中建議採取的安全控制措施。',
      items: { type: 'string' },
    },
    limitationsNotice: {
      type: 'string',
      description: '明確說明本分析為研究概念驗證（PoC）輔助參考，不得替代合格職安人員現場評估或正式作業安全許可。',
    },
    preliminaryReportMarkdown: {
      type: 'string',
      description: '若已呼叫 generate_report，放入該 Markdown 報告內容；未產出時填入空字串 ""。',
    },
  },
};
