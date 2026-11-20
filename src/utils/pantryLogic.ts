import type { RecipeRecommendation, YouTubeVideoLink } from '../types/recipe.ts';

export interface GroundingChunkLike {
  web?: {
    uri?: string;
    title?: string;
  };
}

export function normalizeIngredientLabel(raw: string): string {
  return raw
    .replace(/^[\s\-*•]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseIngredientInput(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  const parts = raw.split(/[,;\n]+/);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of parts) {
    const cleaned = normalizeIngredientLabel(part);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(cleaned);
    }
  }
  return result;
}

function ingredientDedupeKey(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (lower.endsWith('ies') && lower.length > 4) {
    return lower.slice(0, -3) + 'y';
  }
  if (lower.endsWith('oes') && lower.length > 4) {
    return lower.slice(0, -2);
  }
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) {
    return lower.slice(0, -1);
  }
  return lower;
}

export function mergeIngredients(existing: string[], incoming: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const item of [...existing, ...incoming]) {
    const cleaned = normalizeIngredientLabel(item);
    if (!cleaned) continue;
    const key = ingredientDedupeKey(cleaned);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(cleaned);
    }
  }
  return merged;
}

export function removeIngredient(existing: string[], target: string): string[] {
  const targetKey = target.trim().toLowerCase();
  return existing.filter((item) => item.trim().toLowerCase() !== targetKey);
}

export function validateRecommendRequest(
  imageCount: number,
  ingredients: string[]
): { valid: boolean; error?: string } {
  if (imageCount === 0 && ingredients.length === 0) {
    return {
      valid: false,
      error: 'Upload at least one fridge photo or add an ingredient to get recipe recommendations.',
    };
  }
  return { valid: true };
}

export function extractYouTubeVideoId(rawUrl: string): string | null {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl.trim());
    const host = url.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = url.pathname.replace(/^\/+/, '').split('/')[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') {
        const v = url.searchParams.get('v') ?? '';
        return /^[a-zA-Z0-9_-]{11}$/.test(v) ? v : null;
      }
      const match = url.pathname.match(/^\/(shorts|embed)\/([a-zA-Z0-9_-]{11})/);
      if (match) return match[2];
    }
  } catch {
    return null;
  }
  return null;
}

export function buildYouTubeSearchUrl(dishTitle: string, queryHint?: string): string {
  const q = (queryHint && queryHint.trim()) || `${dishTitle} vegetarian recipe`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

function cleanVideoTitle(rawTitle: string | undefined, dishTitle: string, index: number): string {
  if (!rawTitle) return `${dishTitle} — Video Recipe ${index + 1}`;
  const stripped = rawTitle
    .replace(/\s*[-|]\s*YouTube\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped || `${dishTitle} — Video Recipe ${index + 1}`;
}

export function parseYouTubeSearchHtml(
  html: string,
  dishTitle: string,
  limit = 2
): YouTubeVideoLink[] {
  const results: YouTubeVideoLink[] = [];
  const seenIds = new Set<string>();

  const markerMatch = html.match(/var ytInitialData\s*=\s*(\{[\s\S]*?\});<\/script>/);
  if (markerMatch) {
    try {
      const data = JSON.parse(markerMatch[1]) as unknown;
      const walk = (node: unknown) => {
        if (results.length >= limit || !node || typeof node !== 'object') return;
        if (Array.isArray(node)) {
          for (const item of node) {
            if (results.length >= limit) break;
            walk(item);
          }
          return;
        }
        const obj = node as Record<string, unknown>;
        const vr = obj.videoRenderer as
          | {
              videoId?: string;
              title?: { runs?: Array<{ text?: string }>; simpleText?: string };
              ownerText?: { runs?: Array<{ text?: string }> };
              longBylineText?: { runs?: Array<{ text?: string }> };
            }
          | undefined;
        if (vr?.videoId && /^[a-zA-Z0-9_-]{11}$/.test(vr.videoId) && !seenIds.has(vr.videoId)) {
          seenIds.add(vr.videoId);
          const rawTitle =
            vr.title?.runs?.map((r) => r.text ?? '').join('') ||
            vr.title?.simpleText ||
            `${dishTitle} Video Recipe`;
          const channel =
            vr.ownerText?.runs?.[0]?.text ||
            vr.longBylineText?.runs?.[0]?.text ||
            'YouTube Recipe';
          results.push({
            title: rawTitle.trim(),
            channel: channel.trim(),
            url: `https://www.youtube.com/watch?v=${vr.videoId}`,
            kind: 'video',
          });
          return;
        }
        for (const val of Object.values(obj)) {
          if (results.length >= limit) break;
          walk(val);
        }
      };
      walk(data);
    } catch {
      // Fall through to regex extraction
    }
  }

  if (results.length < limit) {
    const idMatches = html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
    for (const m of idMatches) {
      const id = m[1];
      if (!seenIds.has(id)) {
        seenIds.add(id);
        results.push({
          title: `${dishTitle} — Video Recipe ${results.length + 1}`,
          channel: 'YouTube Recipe',
          url: `https://www.youtube.com/watch?v=${id}`,
          kind: 'video',
        });
        if (results.length >= limit) break;
      }
    }
  }

  return results;
}

export function parseGroundedVideoLines(
  modelText: string,
  dishTitle: string
): YouTubeVideoLink[] {
  const results: YouTubeVideoLink[] = [];
  const seenIds = new Set<string>();

  for (const rawLine of modelText.split(/\r?\n/)) {
    const line = rawLine.replace(/^[\s\-*\d.)]+/, '').trim();
    if (!line) continue;
    const urlMatch = line.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/[^\s|)]+|youtu\.be\/[^\s|)]+)/);
    if (!urlMatch) continue;
    const videoId = extractYouTubeVideoId(urlMatch[0]);
    if (!videoId || seenIds.has(videoId)) continue;
    seenIds.add(videoId);

    const segments = line.split('|').map((s) => s.trim()).filter(Boolean);
    const title = segments.length >= 2 && !segments[0].includes('http')
      ? segments[0]
      : `${dishTitle} — Video Recipe ${results.length + 1}`;
    const channel = segments.length >= 3 && !segments[1].includes('http')
      ? segments[1]
      : 'YouTube Recipe';

    results.push({
      title,
      channel,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      kind: 'video',
    });
    if (results.length === 2) break;
  }

  return results;
}

export function parseBatchedGroundedVideos(
  modelText: string,
  dishTitles: string[]
): Record<string, YouTubeVideoLink[]> {
  const map: Record<string, YouTubeVideoLink[]> = {};
  const sections = modelText.split(/(?=^DISH:\s*)/im);

  for (const dishTitle of dishTitles) {
    const normalized = dishTitle.trim().toLowerCase();
    const matchedSection = sections.find((sec) => {
      const firstLine = sec.split(/\r?\n/)[0]?.replace(/^DISH:\s*/i, '').trim().toLowerCase() ?? '';
      return firstLine === normalized || firstLine.includes(normalized) || normalized.includes(firstLine);
    });
    map[dishTitle] = matchedSection ? parseGroundedVideoLines(matchedSection, dishTitle) : [];
  }

  return map;
}

export function resolveTwoYouTubeLinks(
  dishTitle: string,
  queryHints: string[],
  groundingChunks: GroundingChunkLike[] = [],
  modelText = '',
  directVideos: YouTubeVideoLink[] = []
): YouTubeVideoLink[] {
  const links: YouTubeVideoLink[] = [];
  const seenIds = new Set<string>();

  for (const vid of directVideos) {
    const videoId = extractYouTubeVideoId(vid.url);
    if (!videoId || seenIds.has(videoId)) continue;
    seenIds.add(videoId);
    links.push({ ...vid, url: `https://www.youtube.com/watch?v=${videoId}`, kind: 'video' });
    if (links.length === 2) return links;
  }

  for (const chunk of groundingChunks) {
    const uri = chunk.web?.uri;
    if (!uri) continue;
    const videoId = extractYouTubeVideoId(uri);
    if (!videoId || seenIds.has(videoId)) continue;
    seenIds.add(videoId);
    links.push({
      title: cleanVideoTitle(chunk.web?.title, dishTitle, links.length),
      channel: 'YouTube Recipe',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      kind: 'video',
    });
    if (links.length === 2) return links;
  }

  const urlMatches = modelText.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/[^\s)"']+|youtu\.be\/[^\s)"']+)/g) ?? [];
  for (const rawUrl of urlMatches) {
    const videoId = extractYouTubeVideoId(rawUrl);
    if (!videoId || seenIds.has(videoId)) continue;
    seenIds.add(videoId);
    links.push({
      title: `${dishTitle} — Step-by-Step Video ${links.length + 1}`,
      channel: 'YouTube Recipe',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      kind: 'video',
    });
    if (links.length === 2) return links;
  }

  const fallbackQueries = [
    queryHints[0] || `${dishTitle} authentic Indian vegetarian recipe`,
    queryHints[1] || `${dishTitle} easy home style recipe`,
  ];

  let hintIndex = 0;
  while (links.length < 2) {
    const query = fallbackQueries[hintIndex] ?? `${dishTitle} recipe tutorial`;
    const label =
      hintIndex === 0
        ? `Watch ${dishTitle} tutorials on YouTube`
        : `Explore quick ${dishTitle} video recipes`;
    links.push({
      title: label,
      channel: 'YouTube Search',
      url: buildYouTubeSearchUrl(dishTitle, query),
      kind: 'search',
    });
    hintIndex += 1;
  }

  return links.slice(0, 2);
}

export function filterRecipes(
  recipes: RecipeRecommendation[],
  searchQuery: string,
  maxTotalMinutes: number | null,
  regionFilter: 'all' | 'indian' | 'global'
): RecipeRecommendation[] {
  const q = searchQuery.trim().toLowerCase();
  return recipes.filter((recipe) => {
    if (regionFilter === 'indian' && !recipe.isIndianInspired) return false;
    if (regionFilter === 'global' && recipe.isIndianInspired) return false;

    const totalMins = recipe.prepMinutes + recipe.cookMinutes;
    if (maxTotalMinutes !== null && totalMins > maxTotalMinutes) return false;

    if (!q) return true;
    const haystack = [
      recipe.title,
      recipe.cuisine,
      recipe.summary,
      ...recipe.fridgeIngredientsUsed,
      ...recipe.pantryStaplesNeeded,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function calculateRecipeStats(recipes: RecipeRecommendation[]): {
  count: number;
  indianCount: number;
  avgMinutes: number;
} {
  if (recipes.length === 0) {
    return { count: 0, indianCount: 0, avgMinutes: 0 };
  }
  const indianCount = recipes.filter((r) => r.isIndianInspired).length;
  const totalMins = recipes.reduce((acc, r) => acc + r.prepMinutes + r.cookMinutes, 0);
  return {
    count: recipes.length,
    indianCount,
    avgMinutes: Math.round(totalMins / recipes.length),
  };
}
