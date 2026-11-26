import { Hono } from 'hono';
import type { ApiErrorResponse } from '@safeagent/shared';
import {
  getKnowledgeArticleById,
  searchHazards,
  searchKnowledgeArticles,
} from '../services/knowledge.service';
import type { WorkerEnv } from '../types/env';

export const knowledgeRoutes = new Hono<WorkerEnv>();

knowledgeRoutes.get('/knowledge', (c) => {
  const query = c.req.query('q');
  const category = c.req.query('category');
  const type = c.req.query('type');

  const result = searchKnowledgeArticles({ query, category, type });
  return c.json(result, 200);
});

knowledgeRoutes.get('/knowledge/:id', (c) => {
  const id = c.req.param('id');
  const article = getKnowledgeArticleById(id);

  if (!article) {
    const payload: ApiErrorResponse = {
      error: {
        code: 'KNOWLEDGE_NOT_FOUND',
        message: '找不到指定的職安知識條目',
      },
      requestId: c.get('requestId'),
    };
    return c.json(payload, 404);
  }

  return c.json(article, 200);
});

knowledgeRoutes.get('/hazards', (c) => {
  const query = c.req.query('q');
  const category = c.req.query('category');

  const result = searchHazards({ query, category });
  return c.json(result, 200);
});
