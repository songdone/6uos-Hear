
import React, { useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/Icons';

export const Stats: React.FC = () => {
  const { books, history, dailyGoal } = usePlayer();

  // --- Advanced Stats Logic (Source of Truth) ---
  const stats = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * oneDay;
    const thirtyDaysAgo = now - 30 * oneDay;

    // 1. Basic Counts
    const totalCount = books.length;
    const favoritesCount = books.filter(b => b.isLiked).length;
    const totalTime = books.reduce((acc, b) => acc + (b.duration || 0), 0);
    const totalProgress = books.reduce((acc, b) => acc + (b.progress || 0), 0);
    const completedCount = books.filter(b => b.duration > 0 && b.progress > b.duration * 0.9).length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // 2. History Analysis
    const totalListenedTime = history.reduce((acc, h) => acc + h.durationListened, 0); // Actual time spent
    
    // Weekly Data
    const thisWeekLogs = history.filter(h => h.timestamp > sevenDaysAgo);
    const thisWeekTime = thisWeekLogs.reduce((acc, h) => acc + h.durationListened, 0);
    
    // Monthly Data
    const thisMonthLogs = history.filter(h => h.timestamp > thirtyDaysAgo);
    const thisMonthTime = thisMonthLogs.reduce((acc, h) => acc + h.durationListened, 0);

    // 3. Authors Analysis (Weighted by Time Listened)
    const authorTimeMap: Record<string, number> = {};
    history.forEach(h => {
        const book = books.find(b => b.id === h.bookId);
        if (book) {
            authorTimeMap[book.author] = (authorTimeMap[book.author] || 0) + h.durationListened;
        }
    });
    const topAuthors = Object.entries(authorTimeMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, time]) => ({ name, time }));

    // 4. Streak Calculation
    // Sort unique days active
    const daysActive = Array.from(new Set(history.map(h => new Date(h.timestamp).toDateString()))).map(d => new Date(d as string).getTime()).sort((a,b) => b-a);
    let currentStreak = 0;
    if (daysActive.length > 0) {
        // Check if active today
        const todayStr = new Date().toDateString();
        const lastActiveStr = new Date(daysActive[0]).toDateString();
        
        if (todayStr === lastActiveStr) {
            currentStreak = 1;
            let checkDate = daysActive[0] - oneDay;
            for (let i = 1; i < daysActive.length; i++) {
                // Approximate day check
                if (Math.abs(daysActive[i] - checkDate) < 1000 * 60 * 60 * 2) { // Tolerance for timezone edge cases
                    currentStreak++;
                    checkDate -= oneDay;
                } else {
                    break;
                }
            }
        }
    }

    // 5. Hourly Distribution (When do you listen?)
    const hourlyCounts = new Array(24).fill(0);
    history.forEach(h => {
        const hour = new Date(h.timestamp).getHours();
        hourlyCounts[hour] += h.durationListened;
    });
    const maxHourVal = Math.max(...hourlyCounts, 1);

    // 6. Last Played Book
    const lastLog = history.sort((a,b) => b.timestamp - a.timestamp)[0];
    const lastBook = lastLog ? books.find(b => b.id === lastLog.bookId) : null;

    // 7. Heatmap Data (Last 365 Days for Github style)
    const heatmapData: Record<string, number> = {};
    const today = new Date();
    // Generate last 52 weeks (approx 365 days)
    for (let i = 364; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        heatmapData[key] = 0;
    }
    history.forEach(h => {
        const dateKey = new Date(h.timestamp).toISOString().split('T')[0];
        if (heatmapData[dateKey] !== undefined) {
            heatmapData[dateKey] += h.durationListened;
        }
    });

    return {
        totalCount,
        favoritesCount,
        totalTime,
        totalProgress,
        completedCount,
        completionRate,
        totalListenedTime,
        thisWeekTime,
        thisMonthTime,
        topAuthors,
        currentStreak,
        hourlyCounts,
        maxHourVal,
        lastBook,
        heatmapData
    };
  }, [books, history]);

  const formatTime = (sec: number) => {
      if (sec < 60) return `${Math.round(sec)}s`;
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return h > 0 ? `${h}h ${m}m` : `${m}min`;
  };

  const getLevelColor = (seconds: number) => {
      if (seconds === 0) return 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5';
      if (seconds < 15 * 60) return 'bg-emerald-200 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800'; 
      if (seconds < 45 * 60) return 'bg-emerald-400 dark:bg-emerald-700/60 border border-emerald-500 dark:border-emerald-600'; 
      if (seconds < 90 * 60) return 'bg-emerald-500 dark:bg-emerald-600 border border-emerald-600 dark:border-emerald-500'; 
      return 'bg-emerald-700 dark:bg-emerald-500 border border-emerald-800 dark:border-emerald-400'; 
  };

  return (
    <div className="p-6 pb-32 md:pb-6 space-y-6 animate-[fadeIn_0.5s_ease-out]">
        <header>
           <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">数据中心</h1>
           <p className="text-slate-500 dark:text-slate-400 font-medium">基于 {history.length} 条播放记录的智能分析</p>
        </header>

        {/* Top Row: Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard className="p-4 flex flex-col justify-between h-32">
                <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-bold uppercase">本周听书</span>
                    <Icon.BarChart className="w-4 h-4" />
                </div>
                <div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">{formatTime(stats.thisWeekTime)}</div>
                    <div className="text-xs text-emerald-500 mt-1 font-medium">
                        {(stats.thisWeekTime / 60) > (dailyGoal * 7) ? '已达成周目标' : `目标: ${dailyGoal*7}m`}
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="p-4 flex flex-col justify-between h-32">
                <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-bold uppercase">连续打卡</span>
                    <Icon.Zap className="w-4 h-4 text-yellow-500" />
                </div>
                <div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">{stats.currentStreak} 天</div>
                    <div className="text-xs text-slate-400 mt-1">保持这一势头！</div>
                </div>
            </GlassCard>

            <GlassCard className="p-4 flex flex-col justify-between h-32">
                <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-bold uppercase">完结书籍</span>
                    <Icon.Check className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">{stats.completedCount} <span className="text-sm font-normal text-slate-400">/ {stats.totalCount}</span></div>
                    <div className="text-xs text-slate-400 mt-1">完成率 {stats.completionRate}%</div>
                </div>
            </GlassCard>

            <GlassCard className="p-4 flex flex-col justify-between h-32">
                <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-bold uppercase">收藏喜爱</span>
                    <Icon.Heart className="w-4 h-4 text-red-500" />
                </div>
                <div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">{stats.favoritesCount} 本</div>
                    <div className="text-xs text-slate-400 mt-1">精选书单</div>
                </div>
            </GlassCard>
        </div>

        {/* Improved Heatmap Section (GitHub Style) */}
        <GlassCard className="p-6 overflow-x-auto">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">听书热力图 (过去一年)</h3>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span>少</span>
                    <div className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5" />
                    <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900/50" />
                    <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-700/60" />
                    <div className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
                    <span>多</span>
                </div>
            </div>
            
            <div className="flex gap-1 overflow-x-auto pb-2">
                {/* Organize into columns of 7 days (weeks) */}
                {Object.entries(stats.heatmapData).reduce((acc: any[][], [date, val], idx) => {
                    if (idx % 7 === 0) acc.push([]);
                    acc[acc.length - 1].push({ date, val });
                    return acc;
                }, []).map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-1">
                        {week.map((day) => (
                            <div 
                                key={day.date} 
                                className={`w-3 h-3 rounded-sm ${getLevelColor(day.val)} hover:scale-125 transition-transform cursor-pointer relative group`}
                                title={`${day.date}: ${formatTime(day.val)}`}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </GlassCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hourly Activity */}
            <GlassCard className="p-6">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-6">活跃时段 (24h)</h3>
                <div className="h-40 flex items-end gap-1">
                    {stats.hourlyCounts.map((val, h) => {
                        const height = (val / stats.maxHourVal) * 100;
                        return (
                            <div key={h} className="flex-1 flex flex-col items-center group relative">
                                <div 
                                    className="w-full bg-cyan-500/80 rounded-t-sm transition-all duration-500 hover:bg-cyan-400"
                                    style={{ height: `${height}%`, minHeight: '4px' }}
                                />
                                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-black text-white text-[10px] px-2 py-1 rounded pointer-events-none whitespace-nowrap z-10">
                                    {h}:00 - {formatTime(val)}
                                </div>
                                <span className="text-[8px] text-slate-400 mt-1 opacity-50">{h%6===0 ? h : ''}</span>
                            </div>
                        )
                    })}
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-2 px-1">
                    <span>0:00</span>
                    <span>12:00</span>
                    <span>23:00</span>
                </div>
            </GlassCard>

            {/* Top Authors & Last Played */}
            <div className="flex flex-col gap-6">
                {/* Authors */}
                <GlassCard className="p-6 flex-1">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">最爱作者 (按时长)</h3>
                    {stats.topAuthors.length === 0 ? (
                        <div className="text-slate-400 text-xs">听得还不够多，继续加油！</div>
                    ) : (
                        <div className="space-y-4">
                            {stats.topAuthors.map((author, i) => (
                                <div key={author.name} className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i===0?'bg-yellow-500':i===1?'bg-slate-400':'bg-amber-700'}`}>
                                        {i+1}
                                    </div>
                                    <div className="flex-1 font-medium text-slate-800 dark:text-white text-sm">{author.name}</div>
                                    <div className="text-xs text-slate-500">{formatTime(author.time)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </GlassCard>

                {/* Last Played */}
                <GlassCard className="p-6 flex-1 bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2">最近播放</h3>
                    {stats.lastBook ? (
                        <div className="flex gap-4 items-center">
                            <img src={stats.lastBook.coverUrl} className="w-12 h-12 rounded object-cover" alt="" />
                            <div>
                                <div className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[150px]">{stats.lastBook.title}</div>
                                <div className="text-xs text-slate-500">{Math.floor((stats.lastBook.progress/stats.lastBook.duration)*100)}% 完成度</div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs text-slate-400">暂无播放记录</div>
                    )}
                </GlassCard>
            </div>
        </div>

        {/* Detailed Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <GlassCard className="p-4 bg-slate-50 dark:bg-white/5">
                 <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">历史总时长</div>
                 <div className="text-lg font-bold text-slate-700 dark:text-slate-300">{formatTime(stats.totalListenedTime)}</div>
             </GlassCard>
             <GlassCard className="p-4 bg-slate-50 dark:bg-white/5">
                 <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">本月时长</div>
                 <div className="text-lg font-bold text-slate-700 dark:text-slate-300">{formatTime(stats.thisMonthTime)}</div>
             </GlassCard>
             <GlassCard className="p-4 bg-slate-50 dark:bg-white/5">
                 <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">媒体库总时长</div>
                 <div className="text-lg font-bold text-slate-700 dark:text-slate-300">{formatTime(stats.totalTime)}</div>
             </GlassCard>
             <GlassCard className="p-4 bg-slate-50 dark:bg-white/5">
                 <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">已听进度</div>
                 <div className="text-lg font-bold text-slate-700 dark:text-slate-300">{formatTime(stats.totalProgress)}</div>
             </GlassCard>
        </div>
    </div>
  );
};
