import React, { useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { GlassCard } from '../components/ui/GlassCard';
import { DEFAULT_BOOKS, STORAGE_KEYS } from '../constants';
import { Book } from '../types';
import { Icon } from '../components/Icons';

export const Favorites: React.FC = () => {
  const { playBook, currentBookId, isPlaying } = usePlayer();

  const favoriteBooks = useMemo(() => {
    const localLibrary = localStorage.getItem(STORAGE_KEYS.LIBRARY);
    let allBooks = [...DEFAULT_BOOKS];
    if (localLibrary) {
        const local = JSON.parse(localLibrary);
        const ids = new Set(allBooks.map(b => b.id));
        local.forEach((b: Book) => {
            const idx = allBooks.findIndex(existing => existing.id === b.id);
            if (idx !== -1) {
                allBooks[idx] = b;
            } else {
                allBooks.push(b);
            }
        });
    }
    return allBooks.filter(b => b.isLiked);
  }, [currentBookId]); // Re-eval on play state change might be overkill but ensures freshness

  return (
    <div className="p-6 pb-32 md:pb-6 space-y-8 animate-[fadeIn_0.5s_ease-out]">
        <header>
           <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">我的收藏</h1>
           <p className="text-slate-500 dark:text-slate-400 font-medium">你最喜爱的有声书</p>
        </header>

        {favoriteBooks.length === 0 ? (
            <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-4">
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <Icon.Heart className="w-8 h-8 opacity-50" />
                </div>
                <p>暂无收藏内容，快去资源库添加吧！</p>
            </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {favoriteBooks.map((book) => {
                    const isCurrent = book.id === currentBookId;
                    return (
                        <div key={book.id} className="relative group">
                            <GlassCard 
                                onClick={() => playBook(book.id)}
                                className="group relative overflow-hidden flex flex-col hover:-translate-y-1 transition-all duration-300 h-full bg-white/20 dark:bg-black/40 border-0"
                            >
                                <div className="relative aspect-square overflow-hidden rounded-lg shadow-md m-3 mb-0">
                                    <img 
                                        src={book.coverUrl} 
                                        alt={book.title} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                    />
                                    
                                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-xl hover:bg-cyan-500/80 transition-colors">
                                            {isCurrent && isPlaying ? (
                                                <div className="flex gap-1">
                                                    <div className="w-1 h-3 bg-white animate-wave"></div>
                                                    <div className="w-1 h-3 bg-white animate-wave" style={{ animationDelay: '0.2s' }}></div>
                                                    <div className="w-1 h-3 bg-white animate-wave" style={{ animationDelay: '0.4s' }}></div>
                                                </div>
                                            ) : (
                                                <Icon.Play className="w-5 h-5 ml-1" />
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="absolute top-2 right-2 text-red-500 bg-white/80 dark:bg-black/50 backdrop-blur rounded-full p-1 shadow-sm">
                                        <Icon.Heart fill className="w-3 h-3" />
                                    </div>
                                </div>
                                <div className="p-3">
                                    <h3 className="font-bold text-sm text-slate-800 dark:text-white truncate">{book.title}</h3>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-1">{book.author}</p>
                                </div>
                            </GlassCard>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
  );
};