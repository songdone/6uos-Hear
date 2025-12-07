
import React, { useMemo, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/Icons';
import { ImageUploader } from '../components/ui/ImageUploader';

export const Authors: React.FC = () => {
  const { books, authorImages, updateAuthorImage, playBook } = usePlayer();
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [editImageAuthor, setEditImageAuthor] = useState<string | null>(null);

  // Derive authors list from the actual Book library
  const authorsData = useMemo(() => {
      const map = new Map<string, number>();
      books.forEach(b => {
          map.set(b.author, (map.get(b.author) || 0) + 1);
      });
      return Array.from(map.entries()).sort((a,b) => b[1] - a[1]);
  }, [books]);

  // Filter books for the selected author
  const selectedAuthorBooks = useMemo(() => {
      if (!selectedAuthor) return [];
      return books.filter(b => b.author === selectedAuthor);
  }, [books, selectedAuthor]);

  const handleUpdateImage = (base64: string) => {
      if (editImageAuthor) {
          updateAuthorImage(editImageAuthor, base64);
          setEditImageAuthor(null);
      }
  };

  // --- Author Detail Overlay ---
  if (selectedAuthor) {
      const authorImg = authorImages[selectedAuthor] || books.find(b => b.author === selectedAuthor)?.coverUrl;
      
      return (
        <div className="p-6 pb-32 md:pb-6 space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedAuthor(null)} className="p-2 rounded-full hover:bg-white/20 transition">
                        <Icon.ChevronDown className="rotate-90 text-slate-600 dark:text-slate-300" />
                    </button>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{selectedAuthor}</h1>
                </div>
                <button 
                    onClick={() => setEditImageAuthor(selectedAuthor)}
                    className="px-4 py-2 text-xs font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 rounded-lg hover:bg-cyan-200 transition"
                >
                    修改头像
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
                 {/* Author Profile */}
                 <GlassCard className="p-6 flex flex-col items-center gap-4 w-full md:w-64 flex-shrink-0">
                     <div className="w-32 h-32 rounded-full overflow-hidden shadow-xl border-4 border-white/30">
                         <img src={authorImg} alt={selectedAuthor} className="w-full h-full object-cover" />
                     </div>
                     <div className="text-center">
                         <div className="text-3xl font-bold text-slate-800 dark:text-white">{selectedAuthorBooks.length}</div>
                         <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">作品数量</div>
                     </div>
                 </GlassCard>

                 {/* Book List */}
                 <div className="flex-1 w-full space-y-3">
                     <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1">该作者的作品</h2>
                     {selectedAuthorBooks.map((book, idx) => (
                         <GlassCard 
                            key={book.id} 
                            onClick={() => playBook(book.id)}
                            className="flex items-center gap-4 p-3 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer group transition-all"
                         >
                             <span className="text-slate-400 font-mono text-lg w-8 text-center">{idx + 1}</span>
                             <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200">
                                 <img src={book.coverUrl} className="w-full h-full object-cover" alt="" />
                             </div>
                             <div className="flex-1 min-w-0">
                                 <h3 className="font-bold text-slate-800 dark:text-white truncate group-hover:text-cyan-600 transition-colors">{book.title}</h3>
                                 <p className="text-xs text-slate-500">{Math.floor(book.duration / 60)} 分钟</p>
                             </div>
                             <div className="p-2 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Icon.Play className="w-6 h-6" />
                             </div>
                         </GlassCard>
                     ))}
                 </div>
            </div>

            {/* Edit Image Modal */}
            {editImageAuthor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-white/10">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">上传作者头像</h3>
                        <div className="aspect-square w-full mb-6">
                            <ImageUploader 
                                value={authorImages[editImageAuthor] || ''} 
                                onChange={handleUpdateImage} 
                            />
                        </div>
                        <button onClick={() => setEditImageAuthor(null)} className="w-full py-3 rounded-xl bg-slate-200 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">关闭</button>
                    </div>
                </div>
            )}
        </div>
      );
  }

  // --- Main List View ---
  return (
    <div className="p-6 pb-32 md:pb-6 space-y-8 animate-[fadeIn_0.5s_ease-out]">
        <header>
           <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">作者</h1>
           <p className="text-slate-500 dark:text-slate-400 font-medium">按创作者浏览 ({authorsData.length})</p>
        </header>

        {authorsData.length === 0 ? (
            <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
                媒体库为空，请先去设置页扫描或添加书籍。
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {authorsData.map(([name, count]) => {
                    // Priority: Custom Image -> First Book Cover -> Placeholder
                    const cover = authorImages[name] || books.find(b => b.author === name)?.coverUrl || 'https://placehold.co/400x400?text=Author';
                    
                    return (
                        <GlassCard 
                            key={name} 
                            onClick={() => setSelectedAuthor(name)}
                            className="flex items-center gap-4 p-4 hover:scale-[1.02] transition-transform cursor-pointer group"
                        >
                            <div className="w-16 h-16 rounded-full overflow-hidden shadow-md flex-shrink-0 border-2 border-white/50 group-hover:border-cyan-500 transition-colors">
                                <img src={cover} alt={name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg truncate">{name}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{count} 本有声书</p>
                            </div>
                            <Icon.ChevronDown className="text-slate-300 -rotate-90" />
                        </GlassCard>
                    )
                })}
            </div>
        )}
    </div>
  );
};
