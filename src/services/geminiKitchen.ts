import { mergeIngredients, validateRecommendRequest } from '../utils/pantryLogic';
import type {
  AgentAnalysisResponse,
  CuisineFocus,
  DietaryPreference,
  FridgeImage,
  MealTime,
} from '../types/recipe';

interface SerializedImage {
  mimeType: string;
  data: string;
}

const FAST_VISION_MODELS = [
  'particle-ai/particle-1:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
];

const FAST_TEXT_MODELS = [
  'nvidia/nemotron-3.5-lightning:free',
  'particle-ai/particle-1:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
];

const sessionRateLimitedModels = new Set<string>();

class ApiRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to encode fridge image.'));
    reader.readAsDataURL(blob);
  });
}

async function serializeImagesForApi(images: FridgeImage[]): Promise<SerializedImage[]> {
  const parts: SerializedImage[] = [];

  for (const img of images.slice(0, 4)) {
    if (img.source === 'upload' && img.data) {
      const clean = img.data.includes(',') ? img.data.split(',')[1] : img.data;
      if (clean) {
        parts.push({
          mimeType: img.mimeType || 'image/jpeg',
          data: clean,
        });
      }
      continue;
    }

    if (img.previewUrl) {
      const response = await fetch(img.previewUrl);
      if (!response.ok) continue;
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      if (base64) {
        parts.push({
          mimeType: blob.type || 'image/jpeg',
          data: base64,
        });
      }
    }
  }

  return parts;
}

async function postKitchenApi<T>(endpoint: string, payload: Record<string, unknown>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiRequestError(
      503,
      'Unable to reach the recipe service from your browser. Please check your connection and try again.'
    );
  }

  const text = await response.text();
  let parsed: ({ error?: string } & T) | null = null;
  try {
    parsed = JSON.parse(text) as { error?: string } & T;
  } catch {
    throw new ApiRequestError(
      response.status || 502,
      response.status === 504 || response.status === 502
        ? 'The recipe model took too long on that attempt.'
        : `Unexpected response from recipe service (HTTP ${response.status}).`
    );
  }

  if (!response.ok || parsed?.error) {
    throw new ApiRequestError(
      response.status || 500,
      parsed?.error || `Request failed (HTTP ${response.status}).`
    );
  }

  return parsed;
}

function orderModels(models: string[]): string[] {
  const available = models.filter((m) => !sessionRateLimitedModels.has(m));
  return available.length > 0
    ? [...available, ...models.filter((m) => sessionRateLimitedModels.has(m))]
    : models;
}

async function runWithModelFallback<T>(
  models: string[],
  exec: (model: string) => Promise<T>
): Promise<T> {
  const ordered = orderModels(models);
  let lastError: unknown;

  for (let i = 0; i < ordered.length; i += 1) {
    const model = ordered[i];
    const hasNext = i < ordered.length - 1;
    try {
      return await exec(model);
    } catch (err) {
      lastError = err;
      if (err instanceof ApiRequestError) {
        if (err.status === 401 || err.status === 403 || err.status === 400) {
          throw err;
        }
        if (err.status === 429) {
          sessionRateLimitedModels.add(model);
        }
        if (hasNext && isRetryableHttpStatus(err.status)) {
          continue;
        }
      }
      if (hasNext) continue;
      throw err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Unable to generate recipes right now. Please try again.');
}

export async function detectIngredientsFromImages(
  images: FridgeImage[]
): Promise<{ ingredients: string[]; note?: string }> {
  if (images.length === 0) {
    throw new Error('Please attach at least one fridge image to scan.');
  }

  const serialized = await serializeImagesForApi(images);
  if (serialized.length === 0) {
    throw new Error('Could not read the uploaded image files.');
  }

  return runWithModelFallback(FAST_VISION_MODELS, (model) =>
    postKitchenApi<{ ingredients: string[]; note?: string }>('/api/kitchen/scan', {
      action: 'scan',
      model,
      images: serialized,
    })
  );
}

export async function recommendVegetarianRecipes(params: {
  images: FridgeImage[];
  ingredients: string[];
  cuisineFocus: CuisineFocus;
  mealTime?: MealTime;
  dietary: DietaryPreference[];
  mealNote: string;
}): Promise<AgentAnalysisResponse> {
  const { images, ingredients, cuisineFocus, mealTime = 'any', dietary, mealNote } = params;
  const check = validateRecommendRequest(images.length, ingredients);
  if (!check.valid) {
    throw new Error(check.error || 'Add a fridge photo or ingredient first.');
  }

  const serialized = await serializeImagesForApi(images);

  // If no images, run fast text models directly (~3.8s) with per-model retry on fresh requests
  if (serialized.length === 0) {
    return runWithModelFallback(FAST_TEXT_MODELS, (model) =>
      postKitchenApi<AgentAnalysisResponse>('/api/kitchen/recommend', {
        action: 'recommend',
        model,
        images: [],
        ingredients,
        cuisineFocus,
        mealTime,
        dietary,
        mealNote,
      })
    );
  }

  // With images: try fast single-call vision+recipes first (~5-6s);
  // if that times out/rate-limits, split into fast scan (~2-3s) + fast text recommend (~3.8s)
  try {
    return await postKitchenApi<AgentAnalysisResponse>('/api/kitchen/recommend', {
      action: 'recommend',
      model: FAST_VISION_MODELS[0],
      images: serialized,
      ingredients,
      cuisineFocus,
      mealTime,
      dietary,
      mealNote,
    });
  } catch (err) {
    if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403 || err.status === 400)) {
      throw err;
    }

    const scanResult = await runWithModelFallback(FAST_VISION_MODELS, (model) =>
      postKitchenApi<{ ingredients: string[] }>('/api/kitchen/scan', {
        action: 'scan',
        model,
        images: serialized,
      })
    );

    const combinedIngredients = mergeIngredients(ingredients, scanResult.ingredients ?? []);
    const recipeResult = await runWithModelFallback(FAST_TEXT_MODELS, (model) =>
      postKitchenApi<AgentAnalysisResponse>('/api/kitchen/recommend', {
        action: 'recommend',
        model,
        images: [],
        ingredients: combinedIngredients,
        cuisineFocus,
        mealTime,
        dietary,
        mealNote,
      })
    );

    return {
      ...recipeResult,
      detectedFromImages: mergeIngredients(
        recipeResult.detectedFromImages ?? [],
        scanResult.ingredients ?? []
      ),
    };
  }
}
