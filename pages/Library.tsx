
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Book } from '../types';
import { Icon } from '../components/Icons';
import { ImageUploader } from '../components/ui/ImageUploader';
import { MetadataSearchModal } from '../components/MetadataSearchModal';
import { RenamePreviewModal } from '../components/RenamePreviewModal';

// --- Long Press Hook for Mobile Context Menu ---
const useLongPress = (callback: () => void, ms = 500) => {
    const [startLongPress, setStartLongPress] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (startLongPress) {
            timerRef.current = setTimeout(callback, ms);
        } else {
            if (timerRef.current) clearTimeout(timerRef.current);
        }
        return () => { if(timerRef.current) clearTimeout(timerRef.current) };
    }, [startLongPress, callback, ms]);

    return {
        onMouseDown: () => setStartLongPress(true),
        onMouseUp: () => setStartLongPress(false),
        onMouseLeave: () => setStartLongPress(false),
        onTouchStart: () => setStartLongPress(true),
        onTouchEnd: () => setStartLongPress(false),
    };
};

// --- STABLE BOOK CARD COMPONENT ---
interface BookCardProps {
    book: Book;
    isCurrent: boolean;
    isPlaying: boolean;
    editMode: boolean;
    onClick: (book: Book) => void;
    onLike: (id: string) => void;
    onEdit: (book: Book) => void;
    onDelete: (id: string) => void;
    isRecent?: boolean;
    index: number;
}

const BookCard = React.memo<BookCardProps>(({ book, isCurrent, isPlaying, editMode, onClick, onLike, onEdit, onDelete, isRecent = false, index }) => {
    const progressPercent = book.duration > 0 ? (book.progress / book.duration) * 100 : 0;
    const isNew = (Date.now() - book.addedAt) < 24 * 60 * 60 * 1000; 

    const longPressHandlers = useLongPress(() => {
        if (!editMode) onEdit(book);
    }, 600);

    return (
        <div 
            className={`relative group ${isRecent ? 'flex-shrink-0 w-36 md:w-48' : ''} animate-[fadeIn_0.5s_ease-out_forwards]`}
            style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}
        >
            <GlassCard 
                onClick={(e) => { e.preventDefault(); onClick(book); }}
                className={`group relative overflow-hidden flex flex-col active:scale-95 transition-all duration-300 h-full bg-white/40 dark:bg-black/40 border-0 ${isCurrent ? 'ring-2 ring-cyan-500/50 shadow-cyan-500/20' : ''}`}
                {...(!editMode ? longPressHandlers : {})}
            >
                {/* Square Aspect Ratio */}
                <div className="relative aspect-square overflow-hidden rounded-xl shadow-md m-3 mb-0 bg-slate-200 dark:bg-slate-800 pointer-events-none">
                    <img 
                        src={book.coverUrl} 
                        alt={book.title} 
                        className={`w-full h-full object-cover transition-transform duration-700 ${editMode ? 'scale-100' : 'group-hover:scale-105'} ${isCurrent && isPlaying ? 'scale-110' : ''}`}
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=No+Cover' }}
                    />
                    
                    {isNew && !isCurrent && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg z-10">
                            NEW
                        </div>
                    )}

                    {book.progress > 0 && !editMode && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                            <div 
                                className="h-full bg-cyan-500 transition-all duration-1000 ease-linear shadow-[0_0_10px_cyan]" 
                                style={{ width: `${progressPercent}%` }} 
                            />
                        </div>
                    )}

                    {!editMode && (
                        <>
                            <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                                <button onClick={(e) => { e.stopPropagation(); onLike(book.id); }} className="p-1.5 rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-black/50 hover:scale-110 transition-all">
                                    <Icon.Heart className="w-4 h-4" fill={book.isLiked} />
                                </button>
                            </div>
                            
                            <div className={`absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-300 ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <div className={`w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-xl hover:bg-cyan-500/80 transition-all ${isCurrent ? 'scale-100' : 'scale-75 group-hover:scale-100'}`}>
                                    {isCurrent && isPlaying ? (
                                        <div className="flex gap-1 items-end h-5">
                                            <div className="w-1 h-3 bg-white animate-wave"></div>
                                            <div className="w-1 h-5 bg-white animate-wave" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-1 h-4 bg-white animate-wave" style={{ animationDelay: '0.2s' }}></div>
                                            <div className="w-1 h-3 bg-white animate-wave" style={{ animationDelay: '0.3s' }}></div>
                                        </div>
                                    ) : (
                                        <Icon.Play className="w-6 h-6 ml-1" />
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {editMode && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-[fadeIn_0.2s] pointer-events-auto">
                            <button onClick={(e) => { e.stopPropagation(); onEdit(book); }} className="p-3 bg-blue-500 rounded-full text-white shadow-lg hover:scale-110 transition">
                                <Icon.Edit className="w-6 h-6" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(book.id); }} className="p-3 bg-red-500 rounded-full text-white shadow-lg hover:scale-110 transition">
                                <Icon.Trash className="w-6 h-6" />
                            </button>
                        </div>
                    )}
                </div>
                <div className="p-3 pt-2">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white truncate" title={book.title}>{book.title}</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">{book.author}</p>
                </div>
            </GlassCard>
        </div>
    );
}, (prev, next) => {
    // Correct Comparison including onClick stability check
    return (
        prev.book.id === next.book.id &&
        prev.book.progress === next.book.progress && 
        prev.book.title === next.book.title &&
        prev.book.isLiked === next.book.isLiked &&
        prev.isCurrent === next.isCurrent &&
        prev.isPlaying === next.isPlaying &&
        prev.editMode === next.editMode &&
        prev.onClick === next.onClick // Ensure onClick hasn't changed (it shouldn't if useCallback works upstream)
    );
});


export const Library: React.FC = () => {
  const { playBook, currentBookId, isPlaying, books, updateBook, deleteBook, toggleLike, playRandom, openFullScreen, showToast } = usePlayer();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'progress' | 'short'>('all');
  
  const [editMode, setEditMode] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [showScraper, setShowScraper] = useState(false);
  const [showRename, setShowRename] = useState(false);

  const filteredBooks = useMemo(() => {
      let result = books.filter(b => 
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        b.author.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // --- New Preference: Hide Completed ---
      if (user?.preferences.hideCompleted) {
          result = result.filter(b => b.duration === 0 || (b.progress / b.duration) < 0.95);
      }

      if (filterType === 'unread') result = result.filter(b => b.progress === 0);
      else if (filterType === 'progress') result = result.filter(b => b.progress > 0 && b.progress < b.duration * 0.95);
      else if (filterType === 'short') result = result.filter(b => b.duration < 3600); 

      return result;
  }, [books, searchQuery, filterType, user?.preferences.hideCompleted]);

  const recentBooks = useMemo(() => {
      return [...books]
        .filter(b => b.progress > 10 && b.progress < (b.duration * 0.95)) 
        .sort((a, b) => b.addedAt - a.addedAt)
        .slice(0, 5);
  }, [books]);

  const handleSaveEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingBook) {
          updateBook(editingBook);
          setEditingBook(null);
          showToast("书籍信息已更新", "success");
      }
  };

  const handleApplyScrape = (meta: Partial<Book>) => {
      if (editingBook) {
          setEditingBook(prev => ({ ...prev, ...meta } as Book));
      }
  };

  const handleDelete = useCallback((id: string) => {
      if (window.confirm("确定要删除这本书吗？此操作无法撤销。")) {
          deleteBook(id);
      }
  }, [deleteBook]);

  // Stable callback for clicking
  const handleBookClick = useCallback((book: Book) => {
      if (editMode) return;
      playBook(book.id);
      openFullScreen(); 
  }, [editMode, playBook, openFullScreen]);

  const handleEditClick = useCallback((book: Book) => {
      setEditingBook(book);
  }, []);

  return (
    <div className="p-4 md:p-6 pb-40 md:pb-6 space-y-6 md:space-y-8 min-h-screen">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 sticky top-0 z-20 bg-gradient-to-b from-[#f0f9ff] to-transparent dark:from-[#020617] pt-2 pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex-1">
           <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white mb-1 tracking-tight">资源库</h1>
           <p className="text-sm text-slate-500 dark:text-slate-400 font-medium hidden md:block">发现你的下一本好书</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
            <div className="flex gap-2 overflow-x-auto pb-1 max-w-full hide-scrollbar">
                {[
                    {id: 'all', label: '全部'},
                    {id: 'unread', label: '未读'},
                    {id: 'progress', label: '进行中'},
                    {id: 'short', label: '短篇'},
                ].map(f => (
                    <button 
                        key={f.id}
                        onClick={() => setFilterType(f.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 ${filterType === f.id ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'bg-white/60 dark:bg-white/10 text-slate-500 dark:text-slate-400'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-48">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Icon.Search className="w-4 h-4" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="搜索书籍、作者..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/60 dark:bg-black/40 border border-white/20 focus:bg-white dark:focus:bg-black/60 outline-none text-slate-800 dark:text-white placeholder-slate-400 transition-all text-sm shadow-sm focus:shadow-md"
                    />
                </div>
                
                <button 
                    onClick={() => { playRandom(); openFullScreen(); }}
                    className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 active:scale-95 transition"
                    title="随机播放"
                >
                    <Icon.Zap className="w-5 h-5" />
                </button>

                <button 
                    onClick={() => setEditMode(!editMode)}
                    className={`p-2.5 rounded-xl transition-all active:scale-95 ${editMode ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'bg-white/60 dark:bg-white/10 text-slate-500 hover:text-cyan-600'}`}
                    title="管理模式"
                >
                    <Icon.Settings className="w-5 h-5" />
                </button>
            </div>
        </div>
      </header>

      {!searchQuery && recentBooks.length > 0 && filterType === 'all' && !user?.preferences.hideCompleted && (
          <section className="space-y-4">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">继续播放</h2>
              <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0">
                  {recentBooks.map((book, idx) => (
                      <div key={book.id} className="snap-start">
                          <BookCard 
                              book={book} 
                              isRecent={true} 
                              isCurrent={book.id === currentBookId}
                              isPlaying={isPlaying && book.id === currentBookId}
                              editMode={editMode}
                              onClick={handleBookClick}
                              onLike={toggleLike}
                              onEdit={handleEditClick}
                              onDelete={handleDelete}
                              index={idx}
                          />
                      </div>
                  ))}
              </div>
          </section>
      )}

      <section>
          {!searchQuery && <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-4">
              {filterType === 'all' ? '全部书籍' : filterType === 'unread' ? '未读书籍' : filterType === 'progress' ? '进行中' : '短篇读物'} 
              <span className="ml-2 px-1.5 py-0.5 bg-slate-200 dark:bg-white/10 rounded-md text-[10px] text-slate-500">{filteredBooks.length}</span>
              {user?.preferences.hideCompleted && <span className="ml-2 text-[10px] text-cyan-500 font-bold">(已隐藏已读)</span>}
          </h2>}
          
          {filteredBooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                <div className="p-6 bg-slate-100 dark:bg-white/5 rounded-full animate-pulse">
                    <Icon.Search className="w-8 h-8 opacity-50" />
                </div>
                <div className="text-center">
                    <p className="font-bold">没有找到相关内容</p>
                    <p className="text-xs mt-1 opacity-70">尝试调整筛选条件或搜索关键词</p>
                </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-20">
                {filteredBooks.map((book, idx) => (
                    <BookCard 
                        key={book.id} 
                        book={book} 
                        isCurrent={book.id === currentBookId}
                        isPlaying={isPlaying && book.id === currentBookId}
                        editMode={editMode}
                        onClick={handleBookClick}
                        onLike={toggleLike}
                        onEdit={handleEditClick}
                        onDelete={handleDelete}
                        index={idx}
                    />
                ))}
            </div>
          )}
      </section>

      {/* Edit Modal (Keeping as is, just ensuring it renders) */}
      {editingBook && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
              <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/10 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white">编辑书籍详情</h3>
                      <button onClick={() => setEditingBook(null)} className="p-2 bg-slate-100 dark:bg-white/10 rounded-full text-slate-500 hover:text-slate-700 transition"><Icon.X /></button>
                  </div>
                  <form onSubmit={handleSaveEdit} className="space-y-4">
                      <button
                        type="button"
                        onClick={() => setShowScraper(true)}
                        className="w-full py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold text-sm shadow-md hover:scale-[1.01] transition-transform flex items-center justify-center gap-2"
                      >
                          <Icon.Search className="w-4 h-4" />
                          自动刮削元数据
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowRename(true)}
                        className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md hover:scale-[1.01] transition-transform flex items-center justify-center gap-2"
                      >
                          <Icon.Sparkles className="w-4 h-4" />
                          整理 / 重命名预览
                      </button>

                      <div className="flex gap-4 items-start">
                           <div className="w-24 h-24 flex-shrink-0">
                               <ImageUploader 
                                   value={editingBook.coverUrl} 
                                   onChange={(val) => setEditingBook({...editingBook, coverUrl: val})} 
                               />
                           </div>
                           <div className="flex-1 space-y-3">
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">标题</label>
                                   <input type="text" value={editingBook.title} onChange={e => setEditingBook({...editingBook, title: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-transparent focus:border-cyan-500 outline-none dark:text-white transition-all" />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">作者</label>
                                   <input type="text" value={editingBook.author} onChange={e => setEditingBook({...editingBook, author: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-transparent focus:border-cyan-500 outline-none dark:text-white transition-all" />
                               </div>
                           </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">演播者</label>
                               <input type="text" value={editingBook.narrator || ''} onChange={e => setEditingBook({...editingBook, narrator: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-transparent focus:border-cyan-500 outline-none dark:text-white" />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">出版社</label>
                               <input type="text" value={editingBook.publisher || ''} onChange={e => setEditingBook({...editingBook, publisher: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-transparent focus:border-cyan-500 outline-none dark:text-white" />
                           </div>
                      </div>
                      <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">简介</label>
                           <textarea value={editingBook.description || ''} onChange={e => setEditingBook({...editingBook, description: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-transparent focus:border-cyan-500 outline-none dark:text-white resize-none h-24" />
                      </div>
                      <div className="flex gap-3 pt-6">
                          <button type="button" onClick={() => setEditingBook(null)} className="flex-1 py-3.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition">取消</button>
                          <button type="submit" className="flex-1 py-3.5 rounded-xl bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-500/30 hover:bg-cyan-600 transition hover:scale-[1.02]">保存修改</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {editingBook && showScraper && (
          <MetadataSearchModal
              book={editingBook}
              isOpen={showScraper}
              onClose={() => setShowScraper(false)}
              onApply={handleApplyScrape}
          />
      )}

      {editingBook && showRename && (
          <RenamePreviewModal
              book={editingBook}
              isOpen={showRename}
              onClose={() => setShowRename(false)}
          />
      )}
    </div>
  );
};
