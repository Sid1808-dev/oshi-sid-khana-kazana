import { useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { QUICK_ADD_INGREDIENTS } from '../data/presets';
import { parseIngredientInput } from '../utils/pantryLogic';

interface IngredientBasketProps {
  ingredients: string[];
  onAddIngredients: (items: string[]) => void;
  onRemoveIngredient: (item: string) => void;
  onClearAll: () => void;
}

export function IngredientBasket({
  ingredients,
  onAddIngredients,
  onRemoveIngredient,
  onClearAll,
}: IngredientBasketProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseIngredientInput(inputValue);
    if (parsed.length === 0) return;
    onAddIngredients(parsed);
    setInputValue('');
  };

  const existingSet = new Set(ingredients.map((i) => i.toLowerCase()));

  return (
    <section aria-labelledby="manual-ingredients-heading" className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 id="manual-ingredients-heading" className="font-display text-lg font-semibold tracking-tight text-slate-900">
            2. Vegetables &amp; Pantry Items
          </h2>
          <p className="text-sm text-slate-700 mt-0.5">
            Type ingredients separated by commas or tap staples below.
          </p>
        </div>
        <span className="text-xs font-mono font-medium text-slate-700 tabular-nums shrink-0">
          {ingredients.length} added
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor="ingredient-text-input" className="sr-only">
          Add vegetables or ingredients
        </label>
        <input
          id="ingredient-text-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="e.g. paneer, palak, tomato, methi, aloo"
          className="flex-1 min-w-0 px-3.5 py-2.5 text-sm text-slate-950 placeholder:text-slate-600 bg-white/50 backdrop-blur-md border border-white/70 rounded-xl focus:outline-none focus:border-[#15803D] focus:ring-2 focus:ring-[#15803D]/15"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900/75 hover:bg-slate-900/90 backdrop-blur-md border border-white/25 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[42px]"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add
        </button>
      </form>

      {ingredients.length > 0 ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Your active kitchen basket</span>
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs font-medium text-slate-500 hover:text-red-700 underline underline-offset-2 cursor-pointer"
            >
              Clear all
            </button>
          </div>
          <ul
            aria-label="Added ingredients"
            className="flex flex-wrap gap-1.5"
            data-testid="ingredient-list"
          >
            {ingredients.map((item) => (
              <li
                key={item}
                className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-sm font-medium text-slate-900 bg-white/65 backdrop-blur-sm border border-white/75 rounded-lg"
              >
                <span>{item}</span>
                <button
                  type="button"
                  onClick={() => onRemoveIngredient(item)}
                  aria-label={`Remove ${item}`}
                  className="w-6 h-6 rounded-md text-slate-500 hover:text-slate-900 hover:bg-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-slate-700 py-2.5 border-y border-white/45">
          No manual ingredients added yet. Type above or tap quick-add vegetables below.
        </p>
      )}

      <div>
        <p className="text-xs font-medium text-slate-800 mb-2">Quick-add common vegetables &amp; staples:</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ADD_INGREDIENTS.map((item) => {
            const cleanName = item.replace(/\s*\([^)]*\)/g, '');
            const alreadyAdded =
              existingSet.has(item.toLowerCase()) || existingSet.has(cleanName.toLowerCase());
            return (
              <button
                key={item}
                type="button"
                disabled={alreadyAdded}
                onClick={() => onAddIngredients([cleanName])}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border backdrop-blur-md transition-colors whitespace-nowrap cursor-pointer min-h-[34px] ${
                  alreadyAdded
                    ? 'bg-emerald-50/80 border-emerald-400/70 text-[#14532D] cursor-default'
                    : 'bg-white/45 border-white/65 text-slate-900 hover:bg-white/75 hover:border-[#15803D] hover:text-[#15803D]'
                }`}
              >
                {alreadyAdded ? `✓ ${item}` : `+ ${item}`}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
