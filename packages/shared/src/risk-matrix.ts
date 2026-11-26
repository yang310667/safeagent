import type { RiskLevel } from './index';

export type RiskScaleValue = 1 | 2 | 3 | 4 | 5;

export interface RiskMatrixLevelMeta {
  level: RiskScaleValue;
  label: string;
  description: string;
}

export interface RiskGradeResult {
  probability: RiskScaleValue;
  severity: RiskScaleValue;
  score: number;
  riskLevel: RiskLevel;
  gradeLabel: string;
  acceptability: 'acceptable' | 'tolerable_with_controls' | 'unacceptable';
  actionRequired: string;
}

export interface RiskAssessmentInput {
  recordName?: string;
  hazardName: string;
  scenarioTitle: string;
  initialProbability: RiskScaleValue;
  initialSeverity: RiskScaleValue;
  controlsApplied: string[];
  residualProbability?: RiskScaleValue;
  residualSeverity?: RiskScaleValue;
  userConfirmed: boolean;
}

export interface RiskAssessmentRecord {
  id: string;
  recordName?: string;
  hazardName: string;
  scenarioTitle: string;
  initialRisk: RiskGradeResult;
  residualRisk: RiskGradeResult | null;
  controlsApplied: string[];
  userConfirmed: boolean;
  evaluatedAt: string;
}

export interface PreliminarySafetyReport {
  title: string;
  generatedAt: string;
  scenarioTitle: string;
  scenarioSummary: string;
  markdownContent: string;
  disclaimer: string;
}

export const RISK_PROBABILITY_LEVELS: RiskMatrixLevelMeta[] = [
  { level: 1, label: '極不可能 (1)', description: '正常及異常狀況下幾乎不會發生（僅於極端罕見條件下出現）' },
  { level: 2, label: '較不可能 (2)', description: '有現有防護措施且歷史上極少發生' },
  { level: 3, label: '可能 (3)', description: '現場條件不穩定或人為疏失時偶爾可能發生' },
  { level: 4, label: '很可能 (4)', description: '缺乏可靠工程控制時容易在作業期間發生' },
  { level: 5, label: '極可能 (5)', description: '缺乏防護或違反規定時經常或幾乎必然發生' },
];

export const RISK_SEVERITY_LEVELS: RiskMatrixLevelMeta[] = [
  { level: 1, label: '輕微 (1)', description: '無需醫療處置或僅輕微擦傷、短暫不適' },
  { level: 2, label: '中度 (2)', description: '需簡易急救或門診醫療處理，未造成失能' },
  { level: 3, label: '嚴重 (3)', description: '可復原之傷害或需住院治療與休養' },
  { level: 4, label: '重大 (4)', description: '永久性部分失能、嚴重職業病或重傷' },
  { level: 5, label: '災難性 (5)', description: '造成單人或多人死亡、永久全失能或毀滅性災害' },
];

export function isValidRiskScale(value: unknown): value is RiskScaleValue {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * Deterministic 5x5 risk matrix grading aligned with Taiwan OSHA Risk Assessment Guideline
 * (probability 1-5 x severity 1-5 = 1-25).
 */
export function calculateRiskGrade(
  probability: RiskScaleValue,
  severity: RiskScaleValue,
): RiskGradeResult {
  const score = probability * severity;

  if (score >= 15) {
    return {
      probability,
      severity,
      score,
      riskLevel: 'high',
      gradeLabel: '高風險（不可接受風險）',
      acceptability: 'unacceptable',
      actionRequired: '須立即採取消除、替代或工程控制等降災措施；在風險未降低前不應開始或繼續作業。',
    };
  }

  if (score >= 6) {
    return {
      probability,
      severity,
      score,
      riskLevel: 'medium',
      gradeLabel: '中風險（須積極降低風險）',
      acceptability: 'tolerable_with_controls',
      actionRequired: '應於作業前訂定具體改善與管理控制措施，並確認剩餘風險降至可接受範圍。',
    };
  }

  return {
    probability,
    severity,
    score,
    riskLevel: 'low',
    gradeLabel: '低風險（可接受風險）',
    acceptability: 'acceptable',
    actionRequired: '維持現有安全防護設施有效性並實施例行點檢與作業監督。',
  };
}

export function buildRiskAssessmentRecord(
  input: RiskAssessmentInput,
  id = `risk-${Date.now()}`,
): RiskAssessmentRecord {
  if (!input.userConfirmed) {
    throw new Error('必須先由使用者確認現場條件，方可產生風險評估紀錄。');
  }

  const initialRisk = calculateRiskGrade(input.initialProbability, input.initialSeverity);
  const hasResidual =
    isValidRiskScale(input.residualProbability) && isValidRiskScale(input.residualSeverity);
  const residualRisk = hasResidual
    ? calculateRiskGrade(input.residualProbability!, input.residualSeverity!)
    : null;

  const trimmedRecordName = input.recordName?.trim();

  return {
    id,
    ...(trimmedRecordName ? { recordName: trimmedRecordName } : {}),
    hazardName: input.hazardName.trim(),
    scenarioTitle: input.scenarioTitle.trim(),
    initialRisk,
    residualRisk,
    controlsApplied: input.controlsApplied.map((item) => item.trim()).filter(Boolean),
    userConfirmed: true,
    evaluatedAt: new Date().toISOString(),
  };
}

export interface PreliminaryReportInput {
  scenarioTitle: string;
  scenarioSummary: string;
  hazards: Array<{
    hazardType: string;
    description: string;
    potentialConsequence: string;
    recommendedControls: string[];
    relatedRegulations: string[];
  }>;
  riskRecords?: RiskAssessmentRecord[];
  clarificationQuestions?: string[];
  recommendedActions?: string[];
}

export function formatPreliminaryReportMarkdown(
  input: PreliminaryReportInput,
): PreliminarySafetyReport {
  const generatedAt = new Date().toISOString();
  const disclaimer =
    '本報告由 SafeAgent（AI 產業安全與風險評估助手）產出，定位為自主學習與研究概念驗證（PoC），僅供技術展示與學習輔助參考，不得取代合格職業安全衛生人員之現場勘查與法定風險評估或作業安全許可。';

  const lines: string[] = [
    `# SafeAgent 初步危害辨識與風險評估報告`,
    '',
    `- **作業情境名稱**：${input.scenarioTitle}`,
    `- **產出時間**：${generatedAt}`,
    `- **研究定位聲明**：${disclaimer}`,
    '',
    `## 1. 作業情境摘要`,
    input.scenarioSummary || '（未提供詳細摘要）',
    '',
    `## 2. 潛在危害辨識與控制對策`,
  ];

  if (input.hazards.length === 0) {
    lines.push('- 目前尚未記錄特定危害項目。');
  } else {
    input.hazards.forEach((h, idx) => {
      lines.push(`### 2.${idx + 1} ${h.hazardType}`);
      lines.push(`- **危害描述**：${h.description}`);
      lines.push(`- **可能後果**：${h.potentialConsequence}`);
      if (h.recommendedControls.length > 0) {
        lines.push(`- **建議控制措施**：${h.recommendedControls.join('；')}`);
      }
      if (h.relatedRegulations.length > 0) {
        lines.push(`- **參考法規／指引**：${h.relatedRegulations.join('、')}`);
      }
      lines.push('');
    });
  }

  lines.push(`## 3. 5×5 風險矩陣評估紀錄（須經人工現場確認）`);
  const records = input.riskRecords ?? [];
  if (records.length === 0) {
    lines.push('尚未有經使用者現場確認之 5×5 風險評分紀錄（待作業人員於現場條件確認後填寫）。');
  } else {
    lines.push('| 危害項目 | 改善前 (P×S) | 改善前等級 | 採行控制措施 | 剩餘風險 (P×S) | 剩餘等級 |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const rec of records) {
      const initText = `${rec.initialRisk.probability}×${rec.initialRisk.severity}=${rec.initialRisk.score}`;
      const resText = rec.residualRisk
        ? `${rec.residualRisk.probability}×${rec.residualRisk.severity}=${rec.residualRisk.score}`
        : '待評估';
      const resGrade = rec.residualRisk ? rec.residualRisk.gradeLabel : '待評估';
      const controls = rec.controlsApplied.length > 0 ? rec.controlsApplied.join('、') : '—';
      lines.push(
        `| ${rec.hazardName} | ${initText} | ${rec.initialRisk.gradeLabel} | ${controls} | ${resText} | ${resGrade} |`,
      );
    }
  }
  lines.push('');

  if (input.clarificationQuestions && input.clarificationQuestions.length > 0) {
    lines.push(`## 4. 待確認現場條件問題`);
    input.clarificationQuestions.forEach((q, idx) => {
      lines.push(`${idx + 1}. ${q}`);
    });
    lines.push('');
  }

  if (input.recommendedActions && input.recommendedActions.length > 0) {
    lines.push(`## 5. 建議優先執行事項`);
    input.recommendedActions.forEach((act, idx) => {
      lines.push(`${idx + 1}. ${act}`);
    });
    lines.push('');
  }

  lines.push(`---`);
  lines.push(`> **免責聲明**：${disclaimer}`);

  return {
    title: `${input.scenarioTitle}－初步安全評估報告`,
    generatedAt,
    scenarioTitle: input.scenarioTitle,
    scenarioSummary: input.scenarioSummary,
    markdownContent: lines.join('\n'),
    disclaimer,
  };
}
