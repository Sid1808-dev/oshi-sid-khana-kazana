import { useState } from 'react';
import { Bookmark, ChevronDown, ChevronUp, ExternalLink, Play } from 'lucide-react';
import type { RecipeRecommendation } from '../types/recipe';

interface RecipeCardProps {
  recipe: RecipeRecommendation;
  isSaved: boolean;
  onToggleSave: (recipe: RecipeRecommendation) => void;
}

export function RecipeCard({ recipe, isSaved, onToggleSave }: RecipeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;

  return (
    <article
      className="bg-white/68 backdrop-blur-md border border-white/55 rounded-2xl p-6 shadow-[0_8px_28px_rgba(15,23,42,0.10)] transition-colors hover:border-white/80"
      data-testid="recipe-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="font-semibold text-[#15803D]">{recipe.cuisine}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums font-mono">{totalMinutes} min total</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">Serves {recipe.servings}</span>
            <span aria-hidden="true">·</span>
            <span>{recipe.spiceLevel} Spice</span>
          </div>

          <h3 className="font-display text-xl font-semibold tracking-tight text-slate-900 mt-1.5 leading-snug">
            {recipe.title}
          </h3>
        </div>

        <button
          type="button"
          onClick={() => onToggleSave(recipe)}
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${recipe.title} from saved recipes` : `Save ${recipe.title}`}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border backdrop-blur-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[36px] ${
            isSaved
              ? 'bg-emerald-50/80 border-emerald-200/80 text-[#15803D]'
              : 'bg-white/55 border-white/70 text-slate-800 hover:bg-white/80 hover:border-[#15803D] hover:text-[#15803D]'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} aria-hidden="true" />
          {isSaved ? 'Saved' : 'Save'}
        </button>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed mt-3">
        {recipe.summary}
      </p>

      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <span className="block font-semibold text-slate-900 mb-1">
            From your fridge ({recipe.fridgeIngredientsUsed.length})
          </span>
          <p className="text-slate-600 leading-relaxed">
            {recipe.fridgeIngredientsUsed.join(', ') || 'Custom fridge selection'}
          </p>
        </div>
        <div>
          <span className="block font-semibold text-slate-900 mb-1">
            Pantry staples needed
          </span>
          <p className="text-slate-500 leading-relaxed">
            {recipe.pantryStaplesNeeded.join(', ') || 'Basic oil and salt'}
          </p>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold text-slate-900">
            YouTube Recipe Videos (2)
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {recipe.youtubeVideos.slice(0, 2).map((video, idx) => (
            <a
              key={`${recipe.id}-yt-${idx}`}
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-3 p-3 rounded-xl border border-white/70 bg-white/55 hover:bg-emerald-50/75 hover:border-[#15803D] backdrop-blur-sm hover:-translate-y-0.5 transition-all duration-150 min-h-[52px]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-[#DC2626] text-white flex items-center justify-center shrink-0">
                  <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <span className="block text-xs font-semibold text-slate-900 group-hover:text-[#15803D] truncate">
                    {video.title}
                  </span>
                  <span className="block text-[11px] text-slate-500 truncate">
                    {video.kind === 'video' ? `${video.channel} · YouTube` : 'YouTube Recipe Results'}
                  </span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#15803D] shrink-0" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D] hover:text-[#166534] cursor-pointer py-1"
        >
          {expanded ? (
            <>
              Hide cooking method
              <ChevronUp className="w-4 h-4" aria-hidden="true" />
            </>
          ) : (
            <>
              View cooking method ({recipe.steps.length} steps)
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </button>

        {expanded && (
          <ol className="mt-3 space-y-2 text-sm text-slate-700 list-decimal list-inside leading-relaxed">
            {recipe.steps.map((step, i) => (
              <li key={`${recipe.id}-step-${i}`}>{step}</li>
            ))}
          </ol>
        )}
      </div>
    </article>
  );
}
