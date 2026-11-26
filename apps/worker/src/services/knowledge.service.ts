import type {
  AccidentCaseHazardType,
  AccidentCaseIndustry,
  AccidentCaseItem,
  AccidentCaseSearchResponse,
  HazardCatalogItem,
  HazardCatalogResponse,
  KnowledgeArticle,
  KnowledgeCategory,
  KnowledgeEntryType,
  KnowledgeSearchResponse,
} from '@safeagent/shared';
import accidentCasesRaw from '../../../../knowledge/accident-cases/cases.json';
import guidelinesRaw from '../../../../knowledge/guidelines/guidelines.json';
import hazardsRaw from '../../../../knowledge/hazards/hazards.json';
import regulationsRaw from '../../../../knowledge/regulations/regulations.json';

const ALL_CATEGORIES: KnowledgeCategory[] = [
  '職安基礎',
  '職業安全衛生法規',
  '危害辨識',
  '風險評估',
  '製程安全',
  '機械安全',
  '電氣安全',
  '高處作業',
  '化學品安全',
  '智慧工安',
];

const ALL_INDUSTRIES: AccidentCaseIndustry[] = [
  '製造業',
  '營造業',
  '化學工業',
  '倉儲與運輸業',
  '公用事業與設備維護',
];

const ALL_HAZARD_TYPES: AccidentCaseHazardType[] = [
  '墜落、滾落',
  '感電',
  '被夾、被捲',
  '物體飛落',
  '火災與爆炸',
  '有害物接觸',
  '缺氧窒息',
  '物體倒塌、崩塌',
];

const knowledgeArticles: KnowledgeArticle[] = [
  ...(regulationsRaw as KnowledgeArticle[]),
  ...(guidelinesRaw as KnowledgeArticle[]),
];

const accidentCases: AccidentCaseItem[] = accidentCasesRaw as AccidentCaseItem[];
const hazardCatalog: HazardCatalogItem[] = hazardsRaw as HazardCatalogItem[];

function normalizeQuery(value?: string): string {
  return value?.trim().toLowerCase() ?? '';
}

function tokenizeQuery(query: string): string[] {
  if (!query) return [];
  const rawTerms = query
    .split(/[\s,，、；;]+/)
    .map((term) => term.trim())
    .filter(Boolean);

  const expanded = new Set<string>(rawTerms);
  // Expand common compound safety terms so multi-word queries still match official phrasing.
  const synonymHints: Array<[string, string[]]> = [
    ['頂樓', ['屋頂', '高處']],
    ['屋頂作業', ['屋頂', '高處', '採光罩']],
    ['風車', ['排氣風車', '機械']],
    ['斷電', ['上鎖', 'LOTO', '感電', '停機']],
    ['隔離', ['上鎖', 'LOTO', '盲封']],
    ['皮帶', ['傳動', '被夾', '被捲']],
    ['軸承', ['機械', '維修']],
  ];
  for (const term of rawTerms) {
    for (const [key, extras] of synonymHints) {
      if (term.includes(key)) {
        for (const extra of extras) {
          expanded.add(extra.toLowerCase());
        }
      }
    }
  }
  return Array.from(expanded);
}

function scoreTextMatch(haystacks: Array<string | string[]>, query: string): number {
  if (!query) return 1;
  const rawTerms = query
    .split(/[\s,，、；;]+/)
    .map((term) => term.trim())
    .filter(Boolean);
  const combined = haystacks
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .join(' ')
    .toLowerCase();

  if (rawTerms.length > 0 && rawTerms.every((term) => combined.includes(term))) {
    return 100 + rawTerms.length;
  }

  const expandedTerms = tokenizeQuery(query);
  let hits = 0;
  for (const term of expandedTerms) {
    if (combined.includes(term)) {
      hits += 1;
    }
  }
  return hits;
}

export interface SearchKnowledgeParams {
  query?: string;
  category?: string;
  type?: string;
}

export function searchKnowledgeArticles(params: SearchKnowledgeParams = {}): KnowledgeSearchResponse {
  const query = normalizeQuery(params.query);
  const category = params.category?.trim();
  const type = params.type?.trim() as KnowledgeEntryType | undefined;

  const items = knowledgeArticles
    .filter((article) => {
      if (category && category !== '全部' && article.category !== category) {
        return false;
      }
      if (type && article.type !== type) {
        return false;
      }
      return true;
    })
    .map((article) => ({
      article,
      score: scoreTextMatch(
        [
          article.title,
          article.category,
          article.summary,
          article.keyPoints,
          article.applicableScenarios,
          article.keywords,
          article.source.title,
          article.source.publisher,
        ],
        query,
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.article);

  return {
    items,
    total: items.length,
    categories: ALL_CATEGORIES,
  };
}

export function getKnowledgeArticleById(id: string): KnowledgeArticle | null {
  return knowledgeArticles.find((article) => article.id === id) ?? null;
}

export interface SearchAccidentCasesParams {
  query?: string;
  industry?: string;
  hazardType?: string;
}

export function searchAccidentCases(
  params: SearchAccidentCasesParams = {},
): AccidentCaseSearchResponse {
  const query = normalizeQuery(params.query);
  const industry = params.industry?.trim();
  const hazardType = params.hazardType?.trim();

  const items = accidentCases
    .filter((item) => {
      if (industry && item.industry !== industry) {
        return false;
      }
      if (hazardType && item.hazardType !== hazardType) {
        return false;
      }
      return true;
    })
    .map((item) => ({
      item,
      score: scoreTextMatch(
        [
          item.title,
          item.industry,
          item.hazardType,
          item.medium,
          item.summary,
          item.incidentDescription,
          item.causes.direct,
          item.causes.indirect,
          item.causes.basic,
          item.preventiveMeasures,
          item.relatedRegulations,
          item.keywords,
        ],
        query,
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);

  return {
    items,
    total: items.length,
    industries: ALL_INDUSTRIES,
    hazardTypes: ALL_HAZARD_TYPES,
  };
}

export function getAccidentCaseById(id: string): AccidentCaseItem | null {
  return accidentCases.find((item) => item.id === id) ?? null;
}

export interface SearchHazardsParams {
  query?: string;
  category?: string;
}

export function searchHazards(params: SearchHazardsParams = {}): HazardCatalogResponse {
  const query = normalizeQuery(params.query);
  const category = params.category?.trim();

  const items = hazardCatalog
    .filter((item) => {
      if (category && category !== '全部' && item.category !== category) {
        return false;
      }
      return true;
    })
    .map((item) => ({
      item,
      score: scoreTextMatch(
        [
          item.hazardType,
          item.category,
          item.description,
          item.typicalScenarios,
          item.potentialConsequences,
          item.relatedLawRefs,
        ],
        query,
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);

  return {
    items,
    total: items.length,
  };
}
