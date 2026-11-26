import type { KnowledgeArticle, KnowledgeCategory, KnowledgeEntryType } from '@safeagent/shared';

export interface ParsedKnowledgeDraft {
  title: string;
  summary: string;
  keyPoints: string[];
  contentMarkdown: string;
  keywords: string[];
  suggestedType: KnowledgeEntryType;
  suggestedCategory: KnowledgeCategory;
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.(pdf|md|markdown|txt|json)$/i, '').trim() || '未命名文件';
}

function extractKeyPointsFromText(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const bullets = lines
    .filter((line) => /^([-*•]|\d+[.)、])\s*/.test(line))
    .map((line) => line.replace(/^([-*•]|\d+[.)、])\s*/, '').trim())
    .filter((line) => line.length >= 6);

  if (bullets.length >= 2) {
    return bullets.slice(0, 6);
  }

  return lines
    .filter((line) => !line.startsWith('#') && line.length >= 10)
    .slice(0, 4)
    .map((line) => line.slice(0, 180));
}

function detectSuggestedCategory(text: string): KnowledgeCategory {
  if (/高處|高架|屋頂|安全帶|墜落/.test(text)) return '高處作業';
  if (/感電|電氣|配電|漏電|接地/.test(text)) return '電氣安全';
  if (/機械|輸送帶|捲夾|護罩|上鎖|LOTO/.test(text)) return '機械安全';
  if (/化學|SDS|腐蝕|酸|氯氣|毒/.test(text)) return '化學品安全';
  if (/局限空間|缺氧|儲槽|製程/.test(text)) return '製程安全';
  if (/風險評估|矩陣|嚴重度|可能性/.test(text)) return '風險評估';
  if (/職業安全衛生法|設施規則|第\d+條/.test(text)) return '職業安全衛生法規';
  return '職安基礎';
}

export function parseMarkdownOrTextContent(rawText: string, fileName: string): ParsedKnowledgeDraft {
  const normalized = rawText.trim();
  const headingMatch = normalized.match(/^#\s+(.+)$/m);
  const title = headingMatch?.[1]?.trim() || stripExtension(fileName);

  const plainLines = normalized
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  const summary =
    plainLines[0]?.replace(/^[-*]\s*/, '').slice(0, 220) ||
    `自 ${fileName} 匯入之職業安全衛生補充文件。`;
  const keyPoints = extractKeyPointsFromText(normalized);
  const suggestedCategory = detectSuggestedCategory(normalized);
  const suggestedType: KnowledgeEntryType = /法|規則|標準|條/.test(title)
    ? 'regulation'
    : 'guideline';

  return {
    title,
    summary,
    keyPoints,
    contentMarkdown: normalized.slice(0, 6000),
    keywords: [title, suggestedCategory, stripExtension(fileName)].filter(Boolean),
    suggestedType,
    suggestedCategory,
  };
}

export async function extractTextFromPdfBuffer(buffer: ArrayBuffer): Promise<string> {
  const [pdfjs, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const maxPages = Math.min(pdf.numPages, 30);
  const pageTexts: string[] = [];

  for (let pageNo = 1; pageNo <= maxPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean);
    pageTexts.push(strings.join(' '));
  }

  return pageTexts.join('\n\n').replace(/[ \t]+/g, ' ').trim();
}

export async function parseUploadedKnowledgeFile(
  file: File,
): Promise<{ draft?: ParsedKnowledgeDraft; importedArticles?: KnowledgeArticle[] }> {
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.json')) {
    const raw = await file.text();
    const parsed = JSON.parse(raw) as unknown;
    const list = Array.isArray(parsed) ? parsed : [parsed];
    const valid = list.filter(
      (item): item is KnowledgeArticle =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as KnowledgeArticle).title === 'string' &&
        typeof (item as KnowledgeArticle).summary === 'string',
    );
    if (valid.length === 0) {
      throw new Error('JSON 檔案中未找到有效的知識庫條目結構');
    }
    return { importedArticles: valid };
  }

  if (lower.endsWith('.pdf')) {
    const buffer = await file.arrayBuffer();
    const text = await extractTextFromPdfBuffer(buffer);
    if (!text) {
      throw new Error('無法從此 PDF 擷取文字（可能為純掃描影像 PDF），請改用可選取文字之 PDF 或 Markdown');
    }
    return { draft: parseMarkdownOrTextContent(text, file.name) };
  }

  if (lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.txt')) {
    const text = await file.text();
    if (!text.trim()) {
      throw new Error('匯入的檔案內容為空');
    }
    return { draft: parseMarkdownOrTextContent(text, file.name) };
  }

  throw new Error('不支援的檔案格式，請選擇 .pdf、.md、.txt 或 .json');
}
