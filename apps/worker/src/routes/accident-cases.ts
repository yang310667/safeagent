import { Hono } from 'hono';
import type { ApiErrorResponse } from '@safeagent/shared';
import { getAccidentCaseById, searchAccidentCases } from '../services/knowledge.service';
import type { WorkerEnv } from '../types/env';

export const accidentCaseRoutes = new Hono<WorkerEnv>();

accidentCaseRoutes.get('/accident-cases', (c) => {
  const query = c.req.query('q');
  const industry = c.req.query('industry');
  const hazardType = c.req.query('hazardType');

  const result = searchAccidentCases({ query, industry, hazardType });
  return c.json(result, 200);
});

accidentCaseRoutes.get('/accident-cases/:id', (c) => {
  const id = c.req.param('id');
  const accidentCase = getAccidentCaseById(id);

  if (!accidentCase) {
    const payload: ApiErrorResponse = {
      error: {
        code: 'ACCIDENT_CASE_NOT_FOUND',
        message: '找不到指定的職災案例',
      },
      requestId: c.get('requestId'),
    };
    return c.json(payload, 404);
  }

  return c.json(accidentCase, 200);
});
