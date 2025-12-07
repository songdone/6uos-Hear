
import React, { useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/Icons';
import { usePlayer } from '../context/PlayerContext';
import { Series, Book } from '../types';
import { ImageUploader } from '../components/ui/ImageUploader';

export const Collections: React.FC = () => {
  const { series, books, playBook, addSeries, updateSeries, deleteSeries } = usePlayer();
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  
  // UI State
  const [showModal, setShowModal] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Partial<Series>>({});
  const [isNew, setIsNew] = useState(false);

  // Manage Books in Series State
  const [showManageBooks, setShowManageBooks] = useState(false);
  const [manageSeriesId, setManageSeriesId] = useState<string | null>(null);

  const handleBack = () => setSelectedSeriesId(null);

  const handleCreate = () => {
      setEditingSeries({
          title: '',
          description: '',
          coverUrl: '',
          books: []
      });
      setIsNew(true);
      setShowModal(true);
  };

  const handleEdit = (s: Series) => {
      setEditingSeries({ ...s });
      setIsNew(false);
      setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingSeries.title) return;

      const coverToUse = editingSeries.coverUrl || 'https://picsum.photos/400/400?grayscale';

      if (isNew) {
          const newS: Series = {
              id: `series_${Date.now()}`,
              title: editingSeries.title!,
              description: editingSeries.description || '',
              coverUrl: coverToUse,
              books: []
          };
          addSeries(newS);
      } else {
          updateSeries({
              ...editingSeries,
              coverUrl: coverToUse
          } as Series);
      }
      setShowModal(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm("删除此合集？书籍不会被删除。")) {
          deleteSeries(id);
          if (selectedSeriesId === id) setSelectedSeriesId(null);
      }
  };

  // --- Manage Books Logic ---
  const openManageBooks = (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setManageSeriesId(id);
      setShowManageBooks(true);
  };

  const toggleBookInSeries = (bookId: string) => {
      if (!manageSeriesId) return;
      const targetSeries = series.find(s => s.id === manageSeriesId);
      if (!targetSeries) return;

      const currentBooks = targetSeries.books || [];
      let newBooks;
      if (currentBooks.includes(bookId)) {
          newBooks = currentBooks.filter(id => id !== bookId);
      } else {
          newBooks = [...currentBooks, bookId];
      }
      updateSeries({ ...targetSeries, books: newBooks });
  };

  // --- Detail View ---
  if (selectedSeriesId) {
    const s = series.find(s => s.id === selectedSeriesId);
    if (!s) return <div>Series not found</div>;

    const seriesBooks = books.filter(b => s.books.includes(b.id));

    return (
        <div className="p-6 pb-32 md:pb-6 space-y-6 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <button onClick={handleBack} className="p-2 rounded-full hover:bg-white/20 transition">
                        <Icon.ChevronDown className="rotate-90 text-slate-600 dark:text-slate-300" />
                    </button>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{s.title}</h1>
                </div>
                <div className="flex gap-2">
                     <button onClick={() => openManageBooks(s.id)} className="px-3 py-1.5 text-xs font-bold bg-slate-200 dark:bg-slate-700 rounded-lg">添加书籍</button>
                     <button onClick={() => handleEdit(s)} className="px-3 py-1.5 text-xs font-bold bg-blue-100 text-blue-600 rounded-lg">编辑信息</button>
                </div>
            </div>
            
            <GlassCard className="p-6 flex flex-col md:flex-row gap-6 items-start">
                 <div className="w-48 h-48 flex-shrink-0 rounded-lg overflow-hidden shadow-lg bg-slate-200">
                     <img src={s.coverUrl} className="w-full h-full object-cover" alt="cover" />
                 </div>
                 <div className="flex-1 w-full">
                     <p className="text-slate-600 dark:text-slate-300 mb-4">{s.description || '暂无描述'}</p>
                     
                     {seriesBooks.length === 0 ? (
                         <div className="text-slate-400 text-sm py-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl text-center">
                             合集内暂无书籍，请点击右上角“添加书籍”
                         </div>
                     ) : (
                         <div className="space-y-2">
                            {seriesBooks.map((book, idx) => (
                                <div 
                                    key={book.id}
                                    onClick={() => playBook(book.id)}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/40 dark:hover:bg-white/5 cursor-pointer transition border border-transparent hover:border-cyan-500/30 group"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-slate-400 font-mono text-sm w-6 text-center">{idx + 1}</span>
                                        <div className="w-10 h-10 rounded overflow-hidden">
                                            <img src={book.coverUrl} className="w-full h-full object-cover" alt="mini cover" />
                                        </div>
                                        <div className="font-medium text-slate-800 dark:text-white">{book.title}</div>
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-2">
                                        {Math.floor(book.duration / 60)} 分钟
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleBookInSeries(book.id); }}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition"
                                        >
                                            <Icon.X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                         </div>
                     )}
                 </div>
            </GlassCard>
        </div>
    );
  }

  // --- List View ---
  return (
    <div className="p-6 pb-32 md:pb-6 space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <header className="flex justify-between items-end">
           <div>
               <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">系列合集</h1>
               <p className="text-slate-500 dark:text-slate-400 font-medium">按系列整理的有声书库</p>
           </div>
           <button 
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 transition-all"
           >
               <Icon.Plus className="w-5 h-5" /> 新建合集
           </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {series.map((s) => (
            <GlassCard 
                key={s.id} 
                onClick={() => setSelectedSeriesId(s.id)}
                className="cursor-pointer group hover:scale-[1.01] transition-all relative"
            >
                <div className="flex p-4 gap-4">
                    <div className="relative w-28 h-28 flex-shrink-0">
                         {/* Stack effect */}
                         <div className="absolute top-0 right-0 w-full h-full bg-slate-200 dark:bg-slate-700 rounded-md translate-x-2 -translate-y-2" />
                         <div className="absolute top-0 right-0 w-full h-full bg-slate-300 dark:bg-slate-600 rounded-md translate-x-1 -translate-y-1" />
                         <img src={s.coverUrl} className="relative w-full h-full object-cover rounded-md shadow-md z-10" alt={s.title} onError={(e)=>(e.target as HTMLImageElement).src='https://placehold.co/400x400'} />
                    </div>
                    <div className="flex flex-col justify-center flex-1">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1 group-hover:text-cyan-500 transition-colors">{s.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{s.books?.length || 0} 本书</p>
                        <p className="text-xs text-slate-400 line-clamp-2">{s.description}</p>
                    </div>
                </div>
                {/* Quick Action Overlay */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(s); }}
                        className="p-1.5 bg-white/80 dark:bg-black/80 rounded-full hover:text-blue-500"
                    >
                        <Icon.Edit className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={(e) => handleDelete(s.id, e)}
                        className="p-1.5 bg-white/80 dark:bg-black/80 rounded-full hover:text-red-500"
                    >
                        <Icon.Trash className="w-4 h-4" />
                    </button>
                </div>
            </GlassCard>
        ))}
        
        {series.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
                还没有合集，点击右上角新建一个吧！
            </div>
        )}
      </div>

      {/* --- Modal: Create/Edit Series --- */}
      {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
              <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/10">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">{isNew ? '新建合集' : '编辑合集'}</h3>
                  <form onSubmit={handleSave} className="space-y-4">
                      <div className="flex gap-4">
                           {/* Image Upload Area */}
                           <div className="w-24 h-24 flex-shrink-0">
                               <ImageUploader 
                                   value={editingSeries.coverUrl || ''} 
                                   onChange={(val) => setEditingSeries({...editingSeries, coverUrl: val})} 
                               />
                           </div>
                           <div className="flex-1 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">合集名称</label>
                                    <input type="text" value={editingSeries.title} onChange={e => setEditingSeries({...editingSeries, title: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-transparent focus:border-cyan-500 outline-none dark:text-white" required />
                                </div>
                           </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">简介</label>
                          <textarea value={editingSeries.description} onChange={e => setEditingSeries({...editingSeries, description: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-transparent focus:border-cyan-500 outline-none dark:text-white resize-none h-24" />
                      </div>
                      
                      <div className="flex gap-3 pt-6">
                          <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">取消</button>
                          <button type="submit" className="flex-1 py-3 rounded-xl bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-500/30">保存</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* --- Modal: Manage Books (Unchanged) --- */}
      {showManageBooks && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
              <div className="bg-white dark:bg-slate-900 w-full max-w-lg h-[80vh] rounded-3xl p-6 shadow-2xl border border-white/10 flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white">选择书籍加入合集</h3>
                      <button onClick={() => setShowManageBooks(false)} className="p-1 text-slate-400"><Icon.X /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {books.map(book => {
                          const s = series.find(s => s.id === manageSeriesId);
                          const isSelected = s?.books?.includes(book.id);
                          return (
                              <div 
                                key={book.id} 
                                onClick={() => toggleBookInSeries(book.id)}
                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition border ${isSelected ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-500' : 'bg-slate-50 dark:bg-white/5 border-transparent hover:border-slate-300'}`}
                              >
                                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-slate-300'}`}>
                                      {isSelected && <Icon.Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <img src={book.coverUrl} className="w-10 h-10 rounded object-cover" alt="" />
                                  <div className="flex-1 min-w-0">
                                      <div className="font-bold text-sm truncate text-slate-800 dark:text-white">{book.title}</div>
                                      <div className="text-xs text-slate-500">{book.author}</div>
                                  </div>
                              </div>
                          )
                      })}
                  </div>
                  <div className="pt-4 border-t border-slate-100 dark:border-white/5 mt-4">
                      <button onClick={() => setShowManageBooks(false)} className="w-full py-3 rounded-xl bg-cyan-500 text-white font-bold">完成</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
