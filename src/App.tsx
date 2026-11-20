import { useEffect, useMemo, useState } from 'react';
import { Clock, Search, Sparkles, Video } from 'lucide-react';
import type {
  AgentAnalysisResponse,
  CuisineFocus,
  DietaryPreference,
  FridgeImage,
  MealTime,
  RecipeRecommendation,
  SampleFridgePreset,
} from './types/recipe';
import {
  calculateRecipeStats,
  filterRecipes,
  mergeIngredients,
  removeIngredient,
  validateRecommendRequest,
} from './utils/pantryLogic';
import {
  detectIngredientsFromImages,
  recommendVegetarianRecipes,
} from './services/geminiKitchen';
import { Header } from './components/Header';
import { FridgeUploader } from './components/FridgeUploader';
import { IngredientBasket } from './components/IngredientBasket';
import { PreferencesBar } from './components/PreferencesBar';
import { RecipeCard } from './components/RecipeCard';
import { SavedRecipesDrawer } from './components/SavedRecipesDrawer';
import chefKitchenBg from './assets/images/oshi-sid-kitchen.jpg';

const SAVED_STORAGE_KEY = 'tadka_pantry_saved_recipes_v1';

export default function App() {
  const [images, setImages] = useState<FridgeImage[]>([]);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [cuisineFocus, setCuisineFocus] = useState<CuisineFocus>('mostly-indian');
  const [mealTime, setMealTime] = useState<MealTime>('any');
  const [dietary, setDietary] = useState<DietaryPreference[]>([]);
  const [mealNote, setMealNote] = useState('');

  const [isScanning, setIsScanning] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);

  const [result, setResult] = useState<AgentAnalysisResponse | null>(null);

  const [resultSearch, setResultSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<'all' | 'indian' | 'global'>('all');
  const [quickOnly, setQuickOnly] = useState(false);

  const [savedDrawerOpen, setSavedDrawerOpen] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<RecipeRecommendation[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as RecipeRecommendation[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(savedRecipes));
    } catch {
      // Ignore storage quota errors
    }
  }, [savedRecipes]);

  const savedIds = useMemo(() => new Set(savedRecipes.map((r) => r.id)), [savedRecipes]);

  const filteredRecipes = useMemo(() => {
    if (!result) return [];
    return filterRecipes(
      result.recipes,
      resultSearch,
      quickOnly ? 30 : null,
      regionFilter
    );
  }, [result, resultSearch, quickOnly, regionFilter]);

  const stats = useMemo(
    () => calculateRecipeStats(result?.recipes ?? []),
    [result]
  );

  const handleAddImages = (newImages: FridgeImage[]) => {
    setImages((prev) => [...prev, ...newImages].slice(0, 4));
    setValidationError(null);
    setApiError(null);
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleLoadSample = (preset: SampleFridgePreset) => {
    const sampleImage: FridgeImage = {
      id: `sample-${preset.id}-${Date.now()}`,
      name: preset.label,
      mimeType: 'image/jpeg',
      data: '',
      previewUrl: preset.imagePath,
      source: 'sample',
    };
    setImages([sampleImage]);
    setIngredients((prev) => mergeIngredients(prev, preset.suggestedIngredients));
    setValidationError(null);
    setApiError(null);
    setScanNotice(`Loaded "${preset.label}" and added ${preset.suggestedIngredients.length} visible ingredients to your basket.`);
  };

  const handleAddIngredients = (items: string[]) => {
    setIngredients((prev) => mergeIngredients(prev, items));
    setValidationError(null);
  };

  const handleRemoveIngredient = (target: string) => {
    setIngredients((prev) => removeIngredient(prev, target));
  };

  const handleToggleDietary = (pref: DietaryPreference) => {
    setDietary((prev) =>
      prev.includes(pref) ? prev.filter((item) => item !== pref) : [...prev, pref]
    );
  };

  const handleScanPhotos = async () => {
    if (images.length === 0) return;
    setIsScanning(true);
    setApiError(null);
    setScanNotice(null);

    try {
      const data = await detectIngredientsFromImages(images);
      const detected = data.ingredients ?? [];
      setIngredients((prev) => mergeIngredients(prev, detected));
      setScanNotice(
        data.note
          ? data.note
          : detected.length > 0
            ? `Spotted ${detected.length} ingredients from your fridge photo and added them below.`
            : 'No additional produce detected; try adding items manually below.'
      );
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Unable to scan photos.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRecommend = async () => {
    const check = validateRecommendRequest(images.length, ingredients);
    if (!check.valid) {
      setValidationError(check.error ?? 'Add a fridge photo or ingredient first.');
      return;
    }

    setValidationError(null);
    setApiError(null);
    setScanNotice(null);
    setIsRecommending(true);
    setResultSearch('');
    setRegionFilter('all');
    setQuickOnly(false);

    try {
      const data = await recommendVegetarianRecipes({
        images,
        ingredients,
        cuisineFocus,
        mealTime,
        dietary,
        mealNote,
      });

      if (data.detectedFromImages?.length > 0) {
        setIngredients((prev) => mergeIngredients(prev, data.detectedFromImages));
      }
      setResult(data);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong while fetching recipes.');
    } finally {
      setIsRecommending(false);
    }
  };

  const handleToggleSave = (recipe: RecipeRecommendation) => {
    setSavedRecipes((prev) =>
      prev.some((r) => r.id === recipe.id)
        ? prev.filter((r) => r.id !== recipe.id)
        : [recipe, ...prev]
    );
  };

  return (
    <div id="top" className="relative isolate min-h-screen flex flex-col text-slate-900">
      {/* Full-viewport vivid Ghiblified illustration background (non-transparent) */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-20 bg-cover bg-[48%_20%] sm:bg-[center_22%] opacity-100 pointer-events-none"
        style={{
          backgroundImage: `url('${chefKitchenBg}')`,
        }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-slate-950/10 pointer-events-none"
      />

      <Header
        savedCount={savedRecipes.length}
        onOpenSaved={() => setSavedDrawerOpen(true)}
        onQuickRecommend={() => {
          document.getElementById('pantry-workspace')?.scrollIntoView({ behavior: 'smooth' });
          void handleRecommend();
        }}
        isLoading={isRecommending}
      />

      <main className="flex-1">
        <section className="relative">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5 pb-2">
            <div className="max-w-3xl bg-white/58 backdrop-blur-md border border-white/60 rounded-2xl px-5 py-4 sm:px-6 sm:py-4.5 shadow-[0_8px_28px_rgba(15,23,42,0.12)]">
              <p className="text-xs font-semibold text-[#14532D] tracking-wide">
                Vegetarian Kitchen Agent · Breakfast, Lunch &amp; Dinner
              </p>
              <h1 className="font-display text-xl sm:text-2xl lg:text-[28px] font-bold tracking-[-0.02em] leading-[1.16] text-slate-950 mt-1 text-balance">
                Turn whatever is in your fridge into breakfast, lunch, or dinner
              </h1>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed mt-1.5">
                Snap your fridge shelves or type vegetables on hand for tailored vegetarian dishes—rooted in Indian home cooking plus global options—each with two YouTube recipe videos.
              </p>
            </div>
          </div>
        </section>

        <section
          id="pantry-workspace"
          className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-40 sm:pt-52 lg:pt-56 pb-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-8 items-start">
            {/* Left Column: Fridge Upload + Manual Basket + Preferences */}
            <div className="bg-white/62 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-[0_8px_32px_rgba(15,23,42,0.14)] space-y-6">
              <FridgeUploader
                images={images}
                onAddImages={handleAddImages}
                onRemoveImage={handleRemoveImage}
                onLoadSample={handleLoadSample}
                onScanPhotos={() => void handleScanPhotos()}
                isScanning={isScanning}
              />

              {scanNotice && (
                <p
                  role="status"
                  className="text-xs text-[#15803D] bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5"
                >
                  {scanNotice}
                </p>
              )}

              <hr className="border-slate-100" />

              <IngredientBasket
                ingredients={ingredients}
                onAddIngredients={handleAddIngredients}
                onRemoveIngredient={handleRemoveIngredient}
                onClearAll={() => setIngredients([])}
              />

              <hr className="border-slate-100" />

              <PreferencesBar
                cuisineFocus={cuisineFocus}
                onChangeCuisine={setCuisineFocus}
                mealTime={mealTime}
                onChangeMealTime={setMealTime}
                dietary={dietary}
                onToggleDietary={handleToggleDietary}
                mealNote={mealNote}
                onChangeMealNote={setMealNote}
                onSubmit={() => void handleRecommend()}
                isLoading={isRecommending}
                validationError={validationError}
              />
            </div>

            {/* Right Column: Recipe Recommendations Canvas */}
            <div className="space-y-5 min-w-0">
              {apiError && (
                <div
                  role="alert"
                  className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-800"
                >
                  <p className="font-semibold">Unable to fetch recipes</p>
                  <p className="mt-1 text-red-700">{apiError}</p>
                </div>
              )}

              {isRecommending ? (
                <div className="space-y-4" aria-label="Loading recipe recommendations">
                  <div className="bg-white/65 backdrop-blur-md border border-white/55 rounded-2xl p-6 shadow-[0_8px_32px_rgba(15,23,42,0.12)]">
                    <p className="font-display text-lg font-semibold text-slate-900">
                      Inspecting your ingredients and matching YouTube recipe videos...
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      Finding 4 vegetarian dishes with 2 video tutorials per recipe.
                    </p>
                  </div>
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl p-6 space-y-3 animate-pulse"
                    >
                      <div className="h-3 w-48 bg-slate-300/70 rounded" />
                      <div className="h-6 w-72 bg-slate-300/70 rounded" />
                      <div className="h-4 w-full bg-slate-200/70 rounded" />
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="h-12 bg-white/50 rounded-xl" />
                        <div className="h-12 bg-white/50 rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : result ? (
                <div className="space-y-5" data-testid="recommendations-results">
                  <div className="bg-white/65 backdrop-blur-md border border-white/55 rounded-2xl p-6 shadow-[0_8px_32px_rgba(15,23,42,0.12)] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                          Recommended Vegetarian Dishes
                        </h2>
                        <p className="text-sm text-slate-700 mt-1">
                          {result.pantrySummary}
                        </p>
                      </div>
                      <div className="text-xs font-mono text-slate-600 tabular-nums whitespace-nowrap shrink-0">
                        {stats.count} dishes · {stats.indianCount} Indian · ~{stats.avgMinutes} min avg
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="relative flex-1 min-w-0">
                        <label htmlFor="recipe-filter-search" className="sr-only">
                          Filter recommended recipes
                        </label>
                        <Search
                          className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                          aria-hidden="true"
                        />
                        <input
                          id="recipe-filter-search"
                          type="text"
                          value={resultSearch}
                          onChange={(e) => setResultSearch(e.target.value)}
                          placeholder="Filter by dish or ingredient..."
                          className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 bg-white/55 backdrop-blur-sm border border-white/70 rounded-xl focus:outline-none focus:border-[#15803D] focus:ring-2 focus:ring-[#15803D]/15"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div
                          role="group"
                          aria-label="Filter by cuisine region"
                          className="flex items-center gap-1 p-1 bg-white/35 backdrop-blur-md border border-white/60 rounded-xl"
                        >
                          {(
                            [
                              ['all', 'All'],
                              ['indian', 'Indian'],
                              ['global', 'Global'],
                            ] as const
                          ).map(([val, label]) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setRegionFilter(val)}
                              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                                regionFilter === val
                                  ? 'bg-white/80 text-slate-950 shadow-xs'
                                  : 'text-slate-800 hover:text-slate-950 hover:bg-white/40'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => setQuickOnly((prev) => !prev)}
                          aria-pressed={quickOnly}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border backdrop-blur-md transition-colors cursor-pointer min-h-[34px] ${
                            quickOnly
                              ? 'bg-[#15803D]/80 border-emerald-300/50 text-white'
                              : 'bg-white/45 border-white/65 text-slate-900 hover:bg-white/70 hover:border-[#15803D]'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                          &le; 30 min
                        </button>
                      </div>
                    </div>
                  </div>

                  {filteredRecipes.length === 0 ? (
                    <div className="bg-white/62 backdrop-blur-md border border-white/60 rounded-2xl p-8 text-center shadow-[0_8px_32px_rgba(15,23,42,0.12)]">
                      <p className="font-display text-lg font-semibold text-slate-900">
                        No recipes match your current filter
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setResultSearch('');
                          setRegionFilter('all');
                          setQuickOnly(false);
                        }}
                        className="mt-3 px-4 py-2 text-xs font-semibold text-[#15803D] bg-emerald-50/75 backdrop-blur-sm border border-emerald-200/80 rounded-xl cursor-pointer hover:bg-emerald-100/80"
                      >
                        Reset recipe filters
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredRecipes.map((recipe) => (
                        <RecipeCard
                          key={recipe.id}
                          recipe={recipe}
                          isSaved={savedIds.has(recipe.id)}
                          onToggleSave={handleToggleSave}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/62 backdrop-blur-md border border-white/60 rounded-2xl p-8 sm:p-10 shadow-[0_8px_32px_rgba(15,23,42,0.14)] space-y-6">
                  <div className="max-w-xl space-y-2">
                    <h2 className="font-display text-2xl font-bold tracking-tight text-slate-950">
                      Ready when your fridge is
                    </h2>
                    <p className="text-sm text-slate-800 leading-relaxed">
                      Upload a photo of your refrigerator on the left, add extra vegetables manually, or click one of the sample fridge presets to see how Oshi n Sid&apos;s Khana Khazana builds a menu for breakfast, lunch, or dinner.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-white/50">
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-[#14532D] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Multimodal Scan</span>
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed">
                        Spots vegetables, paneer, herbs, and jars right from your fridge shelves.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-[#14532D] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>All-Day Veg Menu</span>
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed">
                        Covers breakfast, lunch, and dinner—rooted in Indian cooking plus global options.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-[#14532D] flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>2 Video Guides Each</span>
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed">
                        Every recommended dish includes two direct YouTube recipe video links.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10"
        >
          <div className="inline-block bg-white/65 backdrop-blur-md border border-white/55 rounded-xl px-4 py-2 shadow-xs">
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              How Oshi n Sid&apos;s Khana Khazana Works
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-5">
            <div className="bg-white/65 backdrop-blur-md border border-white/55 rounded-2xl p-6 shadow-[0_8px_28px_rgba(15,23,42,0.10)]">
              <span className="text-xs font-mono font-medium text-[#15803D]">01</span>
              <h3 className="font-display text-base font-semibold text-slate-900 mt-1.5">
                Show your fridge or list items
              </h3>
              <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">
                Upload up to four fridge photos, type extra vegetables by name, or combine both in one kitchen basket.
              </p>
            </div>
            <div className="bg-white/65 backdrop-blur-md border border-white/55 rounded-2xl p-6 shadow-[0_8px_28px_rgba(15,23,42,0.10)]">
              <span className="text-xs font-mono font-medium text-[#15803D]">02</span>
              <h3 className="font-display text-base font-semibold text-slate-900 mt-1.5">
                Pick breakfast, lunch, or dinner
              </h3>
              <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">
                Choose your meal time and preferences—recipes span Indian breakfasts, tiffin lunches, comforting dals, sabzis, and global bowls.
              </p>
            </div>
            <div className="bg-white/65 backdrop-blur-md border border-white/55 rounded-2xl p-6 shadow-[0_8px_28px_rgba(15,23,42,0.10)]">
              <span className="text-xs font-mono font-medium text-[#15803D]">03</span>
              <h3 className="font-display text-base font-semibold text-slate-900 mt-1.5">
                Cook along with YouTube
              </h3>
              <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">
                Read the step-by-step method or open either of the two linked YouTube recipe videos for visual guidance.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/45 bg-white/60 backdrop-blur-md">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-700">
          <span>Oshi n Sid&apos;s Khana Khazana · Vegetarian Kitchen Assistant for Breakfast, Lunch &amp; Dinner</span>
          <button
            type="button"
            onClick={() => setSavedDrawerOpen(true)}
            className="font-medium text-[#15803D] hover:underline cursor-pointer tabular-nums"
          >
            View Saved Recipes ({savedRecipes.length})
          </button>
        </div>
      </footer>

      <SavedRecipesDrawer
        open={savedDrawerOpen}
        onClose={() => setSavedDrawerOpen(false)}
        savedRecipes={savedRecipes}
        onRemoveSaved={(id) =>
          setSavedRecipes((prev) => prev.filter((r) => r.id !== id))
        }
      />
    </div>
  );
}
