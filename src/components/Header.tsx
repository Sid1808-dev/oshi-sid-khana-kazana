import chefAvatar from '../assets/images/oshi-sid-kitchen.jpg';

interface HeaderProps {
  savedCount: number;
  onOpenSaved: () => void;
  onQuickRecommend: () => void;
  isLoading: boolean;
}

export function Header({
  savedCount,
  onOpenSaved,
  onQuickRecommend,
  isLoading,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-md border-b border-white/45 shadow-[0_2px_14px_rgba(15,23,42,0.06)]">
      <div className="max-w-[1280px] mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 md:gap-8">
        <a
          href="#top"
          className="inline-flex items-center gap-2.5 font-display text-[15px] sm:text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap truncate min-w-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#15803D]"
        >
          <img
            src={chefAvatar}
            alt=""
            aria-hidden="true"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover object-[42%_22%] border border-white/80 shrink-0 shadow-xs"
          />
          <span className="truncate">Oshi n Sid&apos;s Khana Khazana</span>
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-800"
        >
          <a
            href="#pantry-workspace"
            className="px-2.5 py-1.5 rounded-lg hover:bg-white/55 hover:text-slate-950 transition-colors whitespace-nowrap shrink-0"
          >
            Kitchen Studio
          </a>
          <a
            href="#sample-fridges"
            className="px-2.5 py-1.5 rounded-lg hover:bg-white/55 hover:text-slate-950 transition-colors whitespace-nowrap shrink-0"
          >
            Sample Fridges
          </a>
          <a
            href="#how-it-works"
            className="px-2.5 py-1.5 rounded-lg hover:bg-white/55 hover:text-slate-950 transition-colors whitespace-nowrap shrink-0"
          >
            How It Works
          </a>
          <button
            type="button"
            onClick={onOpenSaved}
            className="px-3 py-1.5 rounded-xl bg-white/45 hover:bg-white/70 border border-white/60 backdrop-blur-sm text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
          >
            Saved Recipes ({savedCount})
          </button>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenSaved}
            className="md:hidden px-2.5 py-1.5 text-xs font-medium text-slate-900 border border-white/65 bg-white/55 hover:bg-white/80 backdrop-blur-sm rounded-xl whitespace-nowrap shrink-0 tabular-nums cursor-pointer"
          >
            Saved ({savedCount})
          </button>
          <button
            type="button"
            onClick={onQuickRecommend}
            disabled={isLoading}
            className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-[#15803D]/80 hover:bg-[#15803D]/95 backdrop-blur-md border border-emerald-400/35 disabled:opacity-60 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"
          >
            {isLoading ? 'Cooking up ideas...' : 'Find Recipes'}
          </button>
        </div>
      </div>
    </header>
  );
}
