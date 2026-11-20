import { Utensils } from 'lucide-react';
import type { CuisineFocus, DietaryPreference, MealTime } from '../types/recipe';

interface PreferencesBarProps {
  cuisineFocus: CuisineFocus;
  onChangeCuisine: (focus: CuisineFocus) => void;
  mealTime: MealTime;
  onChangeMealTime: (meal: MealTime) => void;
  dietary: DietaryPreference[];
  onToggleDietary: (pref: DietaryPreference) => void;
  mealNote: string;
  onChangeMealNote: (note: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  validationError: string | null;
}

const MEAL_TIME_OPTIONS: Array<{ value: MealTime; label: string }> = [
  { value: 'any', label: 'Any Meal' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
];

const CUISINE_OPTIONS: Array<{ value: CuisineFocus; label: string }> = [
  { value: 'mostly-indian', label: 'Mostly Indian' },
  { value: 'purely-indian', label: 'Purely Indian' },
  { value: 'global-veg', label: 'Global Veg' },
];

const DIETARY_OPTIONS: Array<{ value: DietaryPreference; label: string }> = [
  { value: 'quick-30', label: 'Under 30 min' },
  { value: 'high-protein', label: 'High Protein' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'no-onion-garlic', label: 'No Onion / Garlic' },
];

export function PreferencesBar({
  cuisineFocus,
  onChangeCuisine,
  mealTime,
  onChangeMealTime,
  dietary,
  onToggleDietary,
  mealNote,
  onChangeMealNote,
  onSubmit,
  isLoading,
  validationError,
}: PreferencesBarProps) {
  return (
    <section aria-labelledby="preferences-heading" className="space-y-4">
      <div>
        <h2 id="preferences-heading" className="font-display text-lg font-semibold tracking-tight text-slate-950">
          3. Culinary Style &amp; Preferences
        </h2>
        <p className="text-sm text-slate-700 mt-0.5">
          All suggestions are 100% vegetarian for breakfast, lunch, or dinner.
        </p>
      </div>

      <div className="space-y-3.5">
        <div>
          <span className="block text-xs font-semibold text-slate-800 mb-1.5">
            Meal Time
          </span>
          <div
            role="group"
            aria-label="Meal time"
            className="grid grid-cols-4 gap-1 p-1 bg-white/35 backdrop-blur-md border border-white/60 rounded-xl"
          >
            {MEAL_TIME_OPTIONS.map((opt) => {
              const active = mealTime === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChangeMealTime(opt.value)}
                  aria-pressed={active}
                  className={`px-2 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-white/75 backdrop-blur-md text-slate-950 shadow-xs border border-white/80'
                      : 'text-slate-800 hover:text-slate-950 hover:bg-white/40'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="block text-xs font-semibold text-slate-800 mb-1.5">
            Cuisine Emphasis
          </span>
          <div
            role="group"
            aria-label="Cuisine emphasis"
            className="grid grid-cols-3 gap-1 p-1 bg-white/35 backdrop-blur-md border border-white/60 rounded-xl"
          >
            {CUISINE_OPTIONS.map((opt) => {
              const active = cuisineFocus === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChangeCuisine(opt.value)}
                  aria-pressed={active}
                  className={`px-2.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-white/75 backdrop-blur-md text-slate-950 shadow-xs border border-white/80'
                      : 'text-slate-800 hover:text-slate-950 hover:bg-white/40'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="block text-xs font-semibold text-slate-800 mb-1.5">
            Optional Filters
          </span>
          <div className="flex flex-wrap gap-1.5">
            {DIETARY_OPTIONS.map((opt) => {
              const active = dietary.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onToggleDietary(opt.value)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border backdrop-blur-md transition-colors whitespace-nowrap cursor-pointer min-h-[34px] ${
                    active
                      ? 'bg-[#15803D]/80 border-emerald-300/50 text-white'
                      : 'bg-white/45 border-white/65 text-slate-900 hover:bg-white/75 hover:border-[#15803D] hover:text-[#15803D]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="meal-note-input" className="block text-xs font-semibold text-slate-800 mb-1.5">
            Craving or meal context (optional)
          </label>
          <input
            id="meal-note-input"
            type="text"
            value={mealNote}
            onChange={(e) => onChangeMealNote(e.target.value)}
            placeholder="e.g. crispy breakfast chilla, tiffin lunch, comforting dinner"
            className="w-full px-3.5 py-2 text-sm text-slate-950 placeholder:text-slate-600 bg-white/50 backdrop-blur-md border border-white/70 rounded-xl focus:outline-none focus:border-[#15803D] focus:ring-2 focus:ring-[#15803D]/15"
          />
        </div>
      </div>

      {validationError && (
        <p role="alert" className="text-sm text-red-800 bg-red-50/85 backdrop-blur-sm border border-red-200 rounded-xl px-3.5 py-2.5">
          {validationError}
        </p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={isLoading}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#15803D]/78 hover:bg-[#15803D]/92 backdrop-blur-md border border-white/30 disabled:opacity-60 rounded-xl transition-colors cursor-pointer min-h-[46px] shadow-sm"
      >
        <Utensils className="w-4 h-4" aria-hidden="true" />
        {isLoading ? 'Analyzing Fridge & Finding Videos...' : 'Recommend Vegetarian Dishes'}
      </button>
    </section>
  );
}
