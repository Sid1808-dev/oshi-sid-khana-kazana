export type CuisineFocus = 'mostly-indian' | 'purely-indian' | 'global-veg';

export type MealTime = 'any' | 'breakfast' | 'lunch' | 'dinner';

export type DietaryPreference =
  | 'quick-30'
  | 'high-protein'
  | 'vegan'
  | 'no-onion-garlic';

export interface FridgeImage {
  id: string;
  name: string;
  mimeType: string;
  /** Base64 data without data-URL prefix when uploaded, or previewUrl for display */
  data: string;
  previewUrl: string;
  source: 'upload' | 'sample';
}

export interface YouTubeVideoLink {
  title: string;
  channel: string;
  url: string;
  kind: 'video' | 'search';
}

export interface RecipeRecommendation {
  id: string;
  title: string;
  cuisine: string;
  isIndianInspired: boolean;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  spiceLevel: 'Mild' | 'Medium' | 'Bold';
  summary: string;
  fridgeIngredientsUsed: string[];
  pantryStaplesNeeded: string[];
  steps: string[];
  youtubeVideos: YouTubeVideoLink[];
}

export interface AgentAnalysisResponse {
  detectedFromImages: string[];
  pantrySummary: string;
  recipes: RecipeRecommendation[];
}

export interface SampleFridgePreset {
  id: string;
  label: string;
  subtitle: string;
  imagePath: string;
  suggestedIngredients: string[];
}
