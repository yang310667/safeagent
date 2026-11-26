import { Hono } from 'hono';
import {
  buildRiskAssessmentRecord,
  formatPreliminaryReportMarkdown,
  isValidRiskScale,
  type ApiErrorResponse,
  type PreliminaryReportInput,
  type RiskAssessmentInput,
} from '@safeagent/shared';
import type { WorkerEnv } from '../types/env';

export const riskRoutes = new Hono<WorkerEnv>();

riskRoutes.post('/risk/calculate', async (c) => {
  const requestId = c.get('requestId');

  let body: Partial<RiskAssessmentInput>;
  try {
    body = await c.req.json<Partial<RiskAssessmentInput>>();
  } catch {
    const errPayload: ApiErrorResponse = {
      error: {
        code: 'INVALID_JSON',
        message: '請求內容必須為有效的 JSON 格式',
      },
      requestId,
    };
    return c.json(errPayload, 400);
  }

  if (body.userConfirmed !== true) {
    const errPayload: ApiErrorResponse = {
      error: {
        code: 'USER_CONFIRMATION_REQUIRED',
        message: '須由使用者確認現場作業條件後，方可計算正式 5×5 風險分數',
      },
      requestId,
    };
    return c.json(errPayload, 400);
  }

  if (
    typeof body.hazardName !== 'string' ||
    !body.hazardName.trim() ||
    typeof body.scenarioTitle !== 'string' ||
    !body.scenarioTitle.trim()
  ) {
    const errPayload: ApiErrorResponse = {
      error: {
        code: 'INVALID_REQUEST',
        message: 'hazardName 與 scenarioTitle 為必填欄位',
      },
      requestId,
    };
    return c.json(errPayload, 400);
  }

  if (!isValidRiskScale(body.initialProbability) || !isValidRiskScale(body.initialSeverity)) {
    const errPayload: ApiErrorResponse = {
      error: {
        code: 'INVALID_RISK_SCALE',
        message: 'initialProbability 與 initialSeverity 必須為 1 至 5 之整數',
      },
      requestId,
    };
    return c.json(errPayload, 400);
  }

  const hasResidualP = body.residualProbability !== undefined;
  const hasResidualS = body.residualSeverity !== undefined;
  if (
    (hasResidualP || hasResidualS) &&
    (!isValidRiskScale(body.residualProbability) || !isValidRiskScale(body.residualSeverity))
  ) {
    const errPayload: ApiErrorResponse = {
      error: {
        code: 'INVALID_RISK_SCALE',
        message: '剩餘風險之 residualProbability 與 residualSeverity 須同時為 1 至 5 之整數',
      },
      requestId,
    };
    return c.json(errPayload, 400);
  }

  const record = buildRiskAssessmentRecord({
    ...(typeof body.recordName === 'string' && body.recordName.trim()
      ? { recordName: body.recordName.trim() }
      : {}),
    hazardName: body.hazardName,
    scenarioTitle: body.scenarioTitle,
    initialProbability: body.initialProbability,
    initialSeverity: body.initialSeverity,
    controlsApplied: Array.isArray(body.controlsApplied)
      ? body.controlsApplied.filter((item): item is string => typeof item === 'string')
      : [],
    residualProbability: body.residualProbability,
    residualSeverity: body.residualSeverity,
    userConfirmed: true,
  });

  return c.json(record, 200);
});

riskRoutes.post('/risk/report', async (c) => {
  const requestId = c.get('requestId');

  let body: Partial<PreliminaryReportInput>;
  try {
    body = await c.req.json<Partial<PreliminaryReportInput>>();
  } catch {
    const errPayload: ApiErrorResponse = {
      error: {
        code: 'INVALID_JSON',
        message: '請求內容必須為有效的 JSON 格式',
      },
      requestId,
    };
    return c.json(errPayload, 400);
  }

  if (typeof body.scenarioTitle !== 'string' || !body.scenarioTitle.trim()) {
    const errPayload: ApiErrorResponse = {
      error: {
        code: 'INVALID_REQUEST',
        message: 'scenarioTitle 為必填欄位',
      },
      requestId,
    };
    return c.json(errPayload, 400);
  }

  const report = formatPreliminaryReportMarkdown({
    scenarioTitle: body.scenarioTitle.trim(),
    scenarioSummary: typeof body.scenarioSummary === 'string' ? body.scenarioSummary : '',
    hazards: Array.isArray(body.hazards) ? body.hazards : [],
    riskRecords: Array.isArray(body.riskRecords) ? body.riskRecords : [],
    clarificationQuestions: Array.isArray(body.clarificationQuestions)
      ? body.clarificationQuestions
      : [],
    recommendedActions: Array.isArray(body.recommendedActions) ? body.recommendedActions : [],
  });

  return c.json(report, 200);
});
