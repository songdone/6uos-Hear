
import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { GlassCard } from './ui/GlassCard';
import { Icon } from './Icons';
import { PlayPauseButton } from './PlayerControls';
import { FALLBACK_COVER } from '../constants';

export const MiniPlayer: React.FC = () => {
  const { currentBookId, getBook, openFullScreen, isPlaying } = usePlayer();
  const book = getBook(currentBookId);

  if (!book) return null;

  const handleCoverError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = FALLBACK_COVER;
  };

  return (
    <div className="fixed bottom-[80px] md:bottom-6 left-4 right-4 md:left-64 md:right-8 z-40 transition-all duration-300">
      <GlassCard 
        className="p-3 flex items-center justify-between shadow-2xl border-cyan-200/50 dark:border-cyan-900/30 bg-white/90 dark:bg-black/80 backdrop-blur-xl"
        onClick={openFullScreen}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-10 h-10 rounded-md object-cover animate-[spin_10s_linear_infinite]"
            style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
            onError={handleCoverError}
          />
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold truncate text-slate-800 dark:text-white">{book.title}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{book.author}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <PlayPauseButton size={10} />
          <button className="text-slate-500 dark:text-slate-400" onClick={(e) => {e.stopPropagation(); openFullScreen();}}>
             <Icon.ChevronDown className="rotate-180" />
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
