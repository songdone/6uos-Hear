
import React, { useState, useEffect } from 'react';
import { GlassCard } from './ui/GlassCard';
import { Icon } from './Icons';
import { scrapeMetadata } from '../utils/scraper';
import { Book } from '../types';

interface Props {
    book: Book;
    isOpen: boolean;
    onClose: () => void;
    onApply: (metadata: Partial<Book>) => void;
}

export const MetadataSearchModal: React.FC<Props> = ({ book, isOpen, onClose, onApply }) => {
    const [query, setQuery] = useState(book.title);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // 优化 16: 打开时自动搜索
    useEffect(() => {
        if (isOpen) {
            setQuery(book.title);
            handleSearch(book.title);
        }
    }, [isOpen, book]);

    const handleSearch = async (term: string) => {
        if (!term.trim()) return;
        setLoading(true);
        const data = await scrapeMetadata(term);
        setResults(data);
        setLoading(false);
    };

    const handleSelect = (item: any) => {
        onApply({
            title: item.title,
            author: item.author,
            description: item.description,
            coverUrl: item.coverUrl,
            publisher: item.publisher,
            narrator: item.narrator
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[80vh] rounded-3xl p-6 shadow-2xl border border-white/10 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Icon.Search className="w-6 h-6 text-cyan-500" />
                        元数据刮削 (iTunes / Google Books)
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full"><Icon.X /></button>
                </div>

                <div className="flex gap-2 mb-6">
                    <input 
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                        className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-transparent focus:border-cyan-500 outline-none dark:text-white"
                        placeholder="输入书名、作者或 ISBN..."
                    />
                    <button 
                        onClick={() => handleSearch(query)}
                        className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? '搜索中...' : '搜索'}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                    {results.length === 0 && !loading && (
                        <div className="text-center text-slate-400 py-20">
                            未找到匹配结果，请尝试简化关键词。
                        </div>
                    )}
                    
                    {results.map((item, idx) => (
                        <GlassCard key={idx} className="flex gap-4 p-4 hover:bg-cyan-50/50 dark:hover:bg-cyan-900/10 cursor-pointer border border-transparent hover:border-cyan-500/30 transition-all group" onClick={() => handleSelect(item)}>
                            <div className="w-24 h-24 flex-shrink-0 bg-slate-200 rounded-lg overflow-hidden relative">
                                <img src={item.coverUrl} className="w-full h-full object-cover" alt="" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-xs font-bold px-2 py-1 border border-white rounded">选择</span>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h4 className="text-lg font-bold text-slate-800 dark:text-white truncate">{item.title}</h4>
                                    <span className={`text-[10px] px-2 py-0.5 rounded ${item.source === 'iTunes' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {item.source}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{item.author}</p>
                                {item.publisher && <p className="text-xs text-slate-400 mt-1">{item.publisher} · {item.publishedDate?.substring(0,4)}</p>}
                                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{item.description}</p>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            </div>
        </div>
    );
};
