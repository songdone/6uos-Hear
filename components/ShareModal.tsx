
import React, { useRef, useState } from 'react';
import { Book } from '../types';
import { Icon } from './Icons';
import { GlassCard } from './ui/GlassCard';

interface Props {
    book: Book;
    currentTime: number;
    isOpen: boolean;
    onClose: () => void;
}

// Note: Requires adding html2canvas script to index.html or npm install
declare global {
    interface Window {
        html2canvas: any;
    }
}

export const ShareModal: React.FC<Props> = ({ book, currentTime, isOpen, onClose }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [generating, setGenerating] = useState(false);
    const [quote, setQuote] = useState("在此刻，听见世界的声音。");

    if (!isOpen) return null;

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return h > 0 ? `${h}小时${m}分` : `${m}分钟`;
    };

    const handleGenerate = async () => {
        if (!window.html2canvas) {
            alert("请在 index.html 中引入 html2canvas 库以使用此功能。");
            return;
        }
        
        if (!cardRef.current) return;
        setGenerating(true);
        
        try {
            const canvas = await window.html2canvas(cardRef.current, {
                useCORS: true,
                backgroundColor: null,
                scale: 2 // High Res
            });
            
            const link = document.createElement('a');
            link.download = `6uos-share-${book.title}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            console.error(e);
            alert("生成图片失败");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-[fadeIn_0.2s]">
            <div className="flex flex-col gap-6 max-w-md w-full">
                {/* Visual Card Area */}
                <div ref={cardRef} className="bg-gradient-to-br from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 p-6 rounded-3xl shadow-2xl border border-white/20 relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                    <div className="flex gap-4 items-start relative z-10">
                        <div className="w-24 h-24 rounded-xl overflow-hidden shadow-lg flex-shrink-0">
                            <img src={book.coverUrl} className="w-full h-full object-cover" crossOrigin="anonymous" alt="cover" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">{book.title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{book.author}</p>
                            <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-md text-xs font-bold font-mono">
                                <Icon.Play className="w-3 h-3" />
                                已听至 {formatTime(currentTime)}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-white/50 dark:bg-black/20 rounded-xl border border-white/10">
                        <p className="text-slate-700 dark:text-slate-200 text-sm italic font-serif leading-relaxed">
                            “{quote}”
                        </p>
                    </div>

                    <div className="mt-6 flex justify-between items-end border-t border-slate-200 dark:border-white/10 pt-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center text-white dark:text-black font-bold text-xs">
                                6uos
                            </div>
                            <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">留你听书</span>
                        </div>
                        <div className="w-12 h-12 bg-white p-1 rounded-md shadow-sm">
                            {/* Mock QR Code */}
                            <div className="w-full h-full bg-slate-900 pattern-dots" /> 
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl">
                    <input 
                        type="text" 
                        value={quote}
                        onChange={e => setQuote(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-black/40 px-4 py-2 rounded-xl text-sm outline-none border border-transparent focus:border-cyan-500 dark:text-white"
                        placeholder="输入你的感悟金句..."
                    />
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">取消</button>
                        <button 
                            onClick={handleGenerate} 
                            disabled={generating}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2"
                        >
                            {generating ? '生成中...' : <><Icon.Download className="w-4 h-4" /> 保存图片</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
