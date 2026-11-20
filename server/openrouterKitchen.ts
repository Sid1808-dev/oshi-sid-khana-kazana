import fs from 'node:fs';
import path from 'node:path';
import type {
  AgentAnalysisResponse,
  CuisineFocus,
  DietaryPreference,
  MealTime,
  RecipeRecommendation,
} from '../src/types/recipe.ts';
import {
  mergeIngredients,
  resolveTwoYouTubeLinks,
  validateRecommendRequest,
} from '../src/utils/pantryLogic.ts';

export interface ServerImageInput {
  mimeType: string;
  data: string;
}

export class KitchenHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const UPSTREAM_TIMEOUT_MS = 8200;

export const FAST_VISION_MODELS = [
  'particle-ai/particle-1:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
];

export const FAST_TEXT_MODELS = [
  'nvidia/nemotron-3.5-lightning:free',
  'particle-ai/particle-1:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
];

function loadEnvKeyFromDotEnv(): string {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return '';
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (key !== 'OPENROUTER_API_KEY') continue;
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      return val.trim();
    }
  } catch {
    // Ignore local file errors in serverless environments
  }
  return '';
}

function getOpenRouterApiKey(): string {
  const fromEnv = (process.env.OPENROUTER_API_KEY || loadEnvKeyFromDotEnv()).trim();
  if (!fromEnv || fromEnv === 'YOUR_OPENROUTER_API_KEY') {
    throw new KitchenHttpError(
      500,
      'OpenRouter API key is not configured. Add OPENROUTER_API_KEY to your Netlify Environment Variables (or local .env) and redeploy.'
    );
  }
  return fromEnv;
}

function parseJsonFromContent(rawText: string): Record<string, unknown> {
  const cleaned = rawText.trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
    }
    throw new KitchenHttpError(502, 'Model returned an unreadable response format.');
  }
}

function buildReasoningConfig(model: string): Record<string, unknown> {
  if (model.startsWith('nvidia/')) {
    return { reasoning: { enabled: false } };
  }
  if (model.startsWith('particle-ai/') || model.startsWith('inclusionai/')) {
    return { reasoning: { effort: 'none' } };
  }
  return {};
}

function buildCuisineInstruction(focus: CuisineFocus): string {
  if (focus === 'purely-indian') {
    return 'All 4 dishes MUST be authentic regional or home-style Indian vegetarian dishes (North Indian, South Indian, Gujarati, Maharashtrian, or Indo-Chinese).';
  }
  if (focus === 'global-veg') {
    return 'Diverse mix of global vegetarian cuisines (Mediterranean, Asian, Mexican, Italian, Middle Eastern) with at most 1 Indian option.';
  }
  return '4 vegetarian dishes: 3 Indian-inspired (curries, sabzis, dals, rice bowls, parathas, or breakfasts) and 1 global vegetarian dish.';
}

function buildMealTimeInstruction(mealTime: MealTime): string {
  if (mealTime === 'breakfast') {
    return 'BREAKFAST dishes (e.g., cheela, poha, upma, stuffed paratha, masala toast, or savory breakfast bowls).';
  }
  if (mealTime === 'lunch') {
    return 'LUNCH dishes (e.g., weekday/tiffin Indian sabzis, dals, rice bowls, wraps, or crisp midday plates).';
  }
  if (mealTime === 'dinner') {
    return 'DINNER dishes (e.g., comforting evening curries, dals, kadai dishes, stir-fries, or hearty mains).';
  }
  return 'Versatile vegetarian dishes suited across breakfast, lunch, and dinner.';
}

function buildDietaryInstruction(dietary: DietaryPreference[]): string {
  const rules = ['Strictly vegetarian (no meat, poultry, fish, seafood, or eggs).'];
  if (dietary.includes('vegan')) {
    rules.push('100% vegan (no paneer, yogurt, ghee, butter, cream, or honey).');
  }
  if (dietary.includes('quick-30')) {
    rules.push('Total prep + cook time <= 30 minutes per dish.');
  }
  if (dietary.includes('high-protein')) {
    rules.push('Prioritize high-protein ingredients (paneer, lentils, chickpeas, tofu, soy, yogurt).');
  }
  if (dietary.includes('no-onion-garlic')) {
    rules.push('Sattvic / Jain-friendly: completely avoid onion and garlic.');
  }
  return rules.join(' ');
}

async function callSingleOpenRouterModel(
  model: string,
  messages: Array<{ role: 'system' | 'user'; content: unknown }>,
  maxTokens: number
): Promise<Record<string, unknown>> {
  const apiKey = getOpenRouterApiKey();

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': "Oshi n Sid's Khana Khazana",
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        max_tokens: maxTokens,
        ...buildReasoningConfig(model),
        messages,
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new KitchenHttpError(504, `Model ${model} timed out. Retrying with backup model.`);
    }
    throw new KitchenHttpError(
      502,
      err instanceof Error ? err.message : 'Network error reaching OpenRouter.'
    );
  }

  let payload: {
    error?: { message?: string; code?: number };
    choices?: Array<{ message?: { content?: string } }>;
  };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    throw new KitchenHttpError(
      response.status >= 500 ? response.status : 502,
      `Upstream returned non-JSON response (HTTP ${response.status}).`
    );
  }

  if (!response.ok || payload.error) {
    const errMsg = payload.error?.message || `OpenRouter HTTP ${response.status}`;
    if (response.status === 401 || response.status === 403) {
      throw new KitchenHttpError(
        response.status,
        'Your OpenRouter API key is invalid or expired. Update OPENROUTER_API_KEY in Netlify Environment Variables.'
      );
    }
    throw new KitchenHttpError(response.status || 502, errMsg);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new KitchenHttpError(502, `Empty response from ${model}.`);
  }

  return parseJsonFromContent(content);
}

function buildImageContentParts(images: ServerImageInput[]) {
  return images
    .slice(0, 4)
    .filter((img) => Boolean(img.data))
    .map((img) => {
      const cleanData = img.data.includes(',') ? img.data.split(',')[1] : img.data;
      const mime = img.mimeType || 'image/jpeg';
      return {
        type: 'image_url' as const,
        image_url: {
          url: `data:${mime};base64,${cleanData}`,
        },
      };
    });
}

export async function scanIngredientsWithOpenRouter(
  images: ServerImageInput[],
  modelOverride?: string
): Promise<{ ingredients: string[]; note?: string }> {
  if (!Array.isArray(images) || images.length === 0) {
    throw new KitchenHttpError(400, 'Please attach at least one fridge image to scan.');
  }

  const imageParts = buildImageContentParts(images);
  if (imageParts.length === 0) {
    throw new KitchenHttpError(400, 'Could not read the uploaded image files.');
  }

  const model = modelOverride || FAST_VISION_MODELS[0];
  const parsed = await callSingleOpenRouterModel(
    model,
    [
      {
        role: 'system',
        content: 'Ingredient detector. Output compact JSON only.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'List all visible vegetarian ingredients (vegetables, greens, fruits, herbs, paneer, yogurt, legumes, jars) in these fridge photos. Return ONLY JSON: {"ingredients":["Spinach","Paneer","Tomatoes"]}.',
          },
          ...imageParts,
        ],
      },
    ],
    450
  );

  const rawIngredients = Array.isArray(parsed.ingredients)
    ? parsed.ingredients.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    ingredients: mergeIngredients([], rawIngredients),
  };
}

export async function recommendWithOpenRouter(params: {
  images?: ServerImageInput[];
  ingredients?: string[];
  cuisineFocus?: CuisineFocus;
  mealTime?: MealTime;
  dietary?: DietaryPreference[];
  mealNote?: string;
  model?: string;
}): Promise<AgentAnalysisResponse> {
  const images = Array.isArray(params.images) ? params.images : [];
  const ingredients = Array.isArray(params.ingredients) ? params.ingredients : [];
  const cuisineFocus: CuisineFocus = params.cuisineFocus ?? 'mostly-indian';
  const mealTime: MealTime = params.mealTime ?? 'any';
  const dietary = Array.isArray(params.dietary) ? params.dietary : [];
  const mealNote = typeof params.mealNote === 'string' ? params.mealNote : '';

  const check = validateRecommendRequest(images.length, ingredients);
  if (!check.valid) {
    throw new KitchenHttpError(400, check.error || 'Add a fridge photo or ingredient first.');
  }

  const imageParts = buildImageContentParts(images);
  const manualText =
    ingredients.length > 0
      ? `Ingredients on hand: ${ingredients.join(', ')}.`
      : 'Rely on the attached fridge photo(s).';

  const userPrompt = [
    manualText,
    mealNote.trim() ? `Craving/note: ${mealNote.trim()}` : '',
    `Meal time: ${buildMealTimeInstruction(mealTime)}`,
    `Cuisine: ${buildCuisineInstruction(cuisineFocus)}`,
    `Dietary: ${buildDietaryInstruction(dietary)}`,
    `Return compact JSON only matching:
{"detectedFromImages":["string"],"pantrySummary":"1 short sentence","recipes":[{"id":"slug","title":"Dish Name","cuisine":"e.g. North Indian","isIndianInspired":true,"prepMinutes":10,"cookMinutes":20,"servings":2,"spiceLevel":"Mild|Medium|Bold","summary":"<=15 words","fridgeIngredientsUsed":["item"],"pantryStaplesNeeded":["cumin","oil","salt"],"steps":["4 concise cooking steps (<=18 words each)"],"youtubeQueries":["Dish Name recipe Ranveer Brar","Dish Name recipe Hebbars Kitchen"]}]}
Return exactly 4 creative, practical vegetarian recipes maximizing ingredients on hand.`,
  ]
    .filter(Boolean)
    .join('\n');

  const model =
    params.model || (imageParts.length > 0 ? FAST_VISION_MODELS[0] : FAST_TEXT_MODELS[0]);

  const userContent =
    imageParts.length > 0
      ? [{ type: 'text' as const, text: userPrompt }, ...imageParts]
      : userPrompt;

  const rawJson = await callSingleOpenRouterModel(
    model,
    [
      {
        role: 'system',
        content:
          'Concise vegetarian chef specializing in Indian home cooking and global vegetarian dishes. Output compact valid JSON only.',
      },
      {
        role: 'user',
        content: userContent,
      },
    ],
    1300
  );

  const rawRecipes = Array.isArray(rawJson.recipes)
    ? (rawJson.recipes as Array<
        Omit<RecipeRecommendation, 'youtubeVideos' | 'spiceLevel'> & {
          spiceLevel?: string;
          youtubeQueries?: string[];
        }
      >)
    : [];

  if (rawRecipes.length === 0) {
    throw new KitchenHttpError(502, 'No recipes were returned by the AI model. Retrying.');
  }

  const enrichedRecipes: RecipeRecommendation[] = rawRecipes.map((item, idx) => {
    const spiceNorm =
      item.spiceLevel === 'Mild' || item.spiceLevel === 'Bold' ? item.spiceLevel : 'Medium';
    const youtubeVideos = resolveTwoYouTubeLinks(
      item.title || `Vegetarian Dish ${idx + 1}`,
      Array.isArray(item.youtubeQueries) ? item.youtubeQueries : [],
      [],
      '',
      []
    );
    return {
      id: item.id || `recipe-${idx + 1}`,
      title: item.title || `Vegetarian Dish ${idx + 1}`,
      cuisine: item.cuisine || 'Indian Home Style',
      isIndianInspired: Boolean(item.isIndianInspired),
      prepMinutes: Number(item.prepMinutes) || 10,
      cookMinutes: Number(item.cookMinutes) || 20,
      servings: Number(item.servings) || 2,
      spiceLevel: spiceNorm,
      summary: item.summary || 'Fresh home-cooked vegetarian recipe using your available ingredients.',
      fridgeIngredientsUsed: Array.isArray(item.fridgeIngredientsUsed)
        ? item.fridgeIngredientsUsed
        : [],
      pantryStaplesNeeded: Array.isArray(item.pantryStaplesNeeded)
        ? item.pantryStaplesNeeded
        : [],
      steps: Array.isArray(item.steps) ? item.steps : [],
      youtubeVideos,
    };
  });

  const detectedFromImages = Array.isArray(rawJson.detectedFromImages)
    ? mergeIngredients(
        [],
        rawJson.detectedFromImages.filter((s): s is string => typeof s === 'string')
      )
    : [];

  return {
    detectedFromImages,
    pantrySummary:
      typeof rawJson.pantrySummary === 'string' && rawJson.pantrySummary.trim()
        ? rawJson.pantrySummary
        : 'Fresh vegetarian dishes tailored to the produce and pantry items you shared.',
    recipes: enrichedRecipes,
  };
}
