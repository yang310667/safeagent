import {
  buildRiskAssessmentRecord,
  calculateRiskGrade,
  type AgentChatResponse,
  type EvaluationCaseBenchmark,
  type EvaluationCaseResult,
  type EvaluationCriterionMetric,
  type EvaluationReportResponse,
  type RiskScaleValue,
} from '@safeagent/shared';
import benchmarkCasesRaw from '../../../../knowledge/evaluation/benchmark-cases.json';
import latestResultsRaw from '../../../../knowledge/evaluation/latest-results.json';
import regulationsRaw from '../../../../knowledge/regulations/regulations.json';

interface StoredEvaluationRun {
  executedAt: string | null;
  model: string | null;
  caseResults: EvaluationCaseResult[];
}

const benchmarkCases = benchmarkCasesRaw as EvaluationCaseBenchmark[];
const storedRun = latestResultsRaw as StoredEvaluationRun;
const knownRegulationTitles = (regulationsRaw as Array<{ title: string }>).map((item) =>
  item.title.split('（')[0].trim(),
);

export function getBenchmarkCases(): EvaluationCaseBenchmark[] {
  return benchmarkCases;
}

export function getBenchmarkCaseById(caseId: string): EvaluationCaseBenchmark | null {
  return benchmarkCases.find((item) => item.id === caseId) ?? null;
}

export function evaluateAgentCaseResponse(
  benchmarkCase: EvaluationCaseBenchmark,
  response: AgentChatResponse,
  durationMs: number,
): EvaluationCaseResult {
  const notes: string[] = [];

  const hazardText = [
    response.reply,
    response.analysis.scenarioSummary,
    ...response.analysis.identifiedHazards.map(
      (h) => `${h.hazardType} ${h.description} ${h.potentialConsequence}`,
    ),
  ]
    .join(' ')
    .toLowerCase();

  const matchedHazardKeywords = benchmarkCase.expectedHazardKeywords.filter((kw) =>
    hazardText.includes(kw.toLowerCase()),
  );
  const hazardCompleteness =
    response.analysis.identifiedHazards.length > 0 && matchedHazardKeywords.length >= 1;
  if (!hazardCompleteness) {
    notes.push(`未涵蓋預期危害關鍵字（預期：${benchmarkCase.expectedHazardKeywords.join('、')}）`);
  }

  const regulationText = [
    response.reply,
    ...response.analysis.identifiedHazards.flatMap((h) => h.relatedRegulations),
  ].join(' ');
  const matchedKnownRegulations = knownRegulationTitles.filter((title) =>
    regulationText.includes(title),
  );
  const matchedExpectedHints = benchmarkCase.expectedRegulationHints.filter((hint) =>
    regulationText.includes(hint),
  );
  const regulationAccuracy =
    matchedKnownRegulations.length > 0 && matchedExpectedHints.length > 0;
  if (!regulationAccuracy) {
    notes.push(`未明確命中預期法規依據（預期：${benchmarkCase.expectedRegulationHints.join('、')}）`);
  }

  const sourceTraceability =
    response.referenceSources.length > 0 &&
    response.referenceSources.every(
      (src) =>
        Boolean(src.publisher?.trim()) &&
        src.officialUrl.startsWith('https://') &&
        Boolean(src.updatedAt?.trim()),
    );
  if (!sourceTraceability) {
    notes.push('缺少可追溯之官方資料來源或來源欄位不完整');
  }

  // Verify deterministic 5x5 rule engine + user confirmation guard.
  const rule = benchmarkCase.riskRuleCheck;
  const computed = calculateRiskGrade(
    rule.probability as RiskScaleValue,
    rule.severity as RiskScaleValue,
  );
  let guardWorked = false;
  try {
    buildRiskAssessmentRecord({
      hazardName: rule.hazardName,
      scenarioTitle: benchmarkCase.title,
      initialProbability: rule.probability as RiskScaleValue,
      initialSeverity: rule.severity as RiskScaleValue,
      controlsApplied: [],
      userConfirmed: false,
    });
  } catch {
    guardWorked = true;
  }
  const riskCalculationAccuracy =
    guardWorked &&
    computed.score === rule.expectedScore &&
    computed.riskLevel === rule.expectedLevel;

  const clarificationText = response.analysis.clarificationQuestions.join(' ');
  const matchedClarifications = benchmarkCase.expectedClarificationHints.filter((hint) =>
    clarificationText.toLowerCase().includes(hint.toLowerCase()),
  );
  const clarificationCapability =
    response.analysis.clarificationQuestions.length > 0 && matchedClarifications.length >= 1;
  if (!clarificationCapability) {
    notes.push(
      `待補充提問未涵蓋關鍵條件（預期包含：${benchmarkCase.expectedClarificationHints.join('、')}）`,
    );
  }

  const hallucinationControl =
    response.toolTraces.length > 0 &&
    response.toolTraces.some((t) => t.executionStatus === 'completed') &&
    sourceTraceability;
  if (!hallucinationControl) {
    notes.push('未透過工具檢索知識庫即作答，或缺乏可驗證引用來源');
  }

  if (notes.length === 0) {
    notes.push('六項評估指標皆通過實測檢核');
  }

  return {
    caseId: benchmarkCase.id,
    title: benchmarkCase.title,
    prompt: benchmarkCase.prompt,
    executedAt: new Date().toISOString(),
    model: response.model,
    durationMs,
    toolNamesUsed: Array.from(new Set(response.toolTraces.map((t) => t.toolName))),
    referenceSourceCount: response.referenceSources.length,
    replyExcerpt: response.reply.slice(0, 180),
    clarificationQuestionsCount: response.analysis.clarificationQuestions.length,
    checks: {
      hazardCompleteness,
      regulationAccuracy,
      sourceTraceability,
      riskCalculationAccuracy,
      clarificationCapability,
      hallucinationControl,
    },
    notes,
  };
}

export function aggregateEvaluationMetrics(
  caseResults: EvaluationCaseResult[],
): EvaluationCriterionMetric[] {
  const definitions: Array<{
    key: EvaluationCriterionMetric['key'];
    title: string;
  }> = [
    { key: 'hazardCompleteness', title: '危害辨識完整性' },
    { key: 'regulationAccuracy', title: '法規引用正確性' },
    { key: 'sourceTraceability', title: '資料來源可追溯性' },
    { key: 'riskCalculationAccuracy', title: '風險計算正確性' },
    { key: 'clarificationCapability', title: '資訊不足時的提問能力' },
    { key: 'hallucinationControl', title: '無依據內容抑制情況' },
  ];

  const totalCount = caseResults.length;
  return definitions.map((def) => {
    const passedCount = caseResults.filter((res) => res.checks[def.key]).length;
    const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
    return {
      key: def.key,
      title: def.title,
      passedCount,
      totalCount,
      passRate,
      summary:
        totalCount > 0
          ? `實測 ${passedCount}/${totalCount} 筆通過（${passRate}%）`
          : '待執行基準測試紀錄',
    };
  });
}

export function getEvaluationReport(): EvaluationReportResponse {
  const results = storedRun.caseResults ?? [];
  const hasExecutedRun = Boolean(storedRun.executedAt && results.length > 0);
  return {
    hasExecutedRun,
    executedAt: storedRun.executedAt,
    model: storedRun.model,
    benchmarkCases,
    criteriaMetrics: aggregateEvaluationMetrics(results),
    caseResults: results,
  };
}
