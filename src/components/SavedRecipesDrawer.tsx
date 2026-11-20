import { ExternalLink, Play, Trash2, X } from 'lucide-react';
import type { RecipeRecommendation } from '../types/recipe';

interface SavedRecipesDrawerProps {
  open: boolean;
  onClose: () => void;
  savedRecipes: RecipeRecommendation[];
  onRemoveSaved: (id: string) => void;
}

export function SavedRecipesDrawer({
  open,
  onClose,
  savedRecipes,
  onRemoveSaved,
}: SavedRecipesDrawerProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="saved-drawer-title"
    >
      <div className="w-full max-w-lg bg-[#F8FAFC] h-full shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 id="saved-drawer-title" className="font-display text-xl font-semibold tracking-tight text-slate-900">
              Saved Vegetarian Recipes
            </h2>
            <p className="text-xs text-slate-500 tabular-nums">
              {savedRecipes.length} {savedRecipes.length === 1 ? 'dish' : 'dishes'} stored in your browser
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close saved recipes drawer"
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {savedRecipes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
              <p className="font-display text-lg font-semibold text-slate-900">
                No saved recipes yet
              </p>
              <p className="text-sm text-slate-500 mt-1.5">
                Click Save on any recommended dish to keep its steps and YouTube links handy for breakfast, lunch, or dinner.
              </p>
            </div>
          ) : (
            savedRecipes.map((recipe) => (
              <article
                key={recipe.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="font-semibold text-[#15803D]">{recipe.cuisine}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {recipe.prepMinutes + recipe.cookMinutes} min
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-semibold tracking-tight text-slate-900 mt-0.5">
                      {recipe.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveSaved(recipe.id)}
                    aria-label={`Remove ${recipe.title} from saved`}
                    className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-red-700 hover:border-red-200 flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{recipe.summary}</p>

                <div className="space-y-1.5 pt-1">
                  {recipe.youtubeVideos.slice(0, 2).map((video, idx) => (
                    <a
                      key={`${recipe.id}-saved-yt-${idx}`}
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-[#15803D] text-xs font-medium text-slate-900"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Play className="w-3 h-3 text-[#DC2626] fill-current shrink-0" aria-hidden="true" />
                        <span className="truncate">{video.title}</span>
                      </span>
                      <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
