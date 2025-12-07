
import React, { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Icon } from './Icons';
import { PlayPauseButton, ProgressBar, SpeedControl } from './PlayerControls';
import { ShareModal } from './ShareModal';
import { FALLBACK_COVER } from '../constants';

// Optimized Background
const DynamicBackground = ({ isPlaying, coverUrl }: { isPlaying: boolean, coverUrl: string }) => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-black">
        {/* Cover Blur Overlay */}
        <div 
            className="absolute inset-0 opacity-40 dark:opacity-20 bg-cover bg-center blur-3xl scale-125 transition-opacity duration-1000"
            style={{ backgroundImage: `url(${coverUrl})` }}
        />
        {/* Animated Gradient Orbs */}
        <div className={`absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-blue-500/20 blur-[100px] rounded-full mix-blend-screen ${isPlaying ? 'animate-spin-slow' : 'opacity-50'} will-change-transform`} />
        <div className={`absolute top-0 right-0 w-[80%] h-[80%] bg-gradient-to-bl from-emerald-500/10 via-transparent to-transparent blur-[80px] rounded-full mix-blend-overlay ${isPlaying ? 'animate-float' : ''} will-change-transform`} />
    </div>
);

export const FullScreenPlayer: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const {
    isFullScreen, closeFullScreen, currentBookId, getBook, seek, currentTime,
    setSleepTimer, sleepTimer, sleepEndOfChapter, playChapter, 
    isPlaying, toggleLike, zenMode, toggleZenMode, addBookmark,
    lastSeekPosition, undoSeek, ambience, setAmbience, ambienceVolume, setAmbienceVolume,
    abLoop, setABLoop, clearABLoop, vocalBoost, toggleVocalBoost, skipChapter, togglePlay, showToast
  } = usePlayer();

  const book = getBook(currentBookId);
  const [activeTab, setActiveTab] = useState<'chapters' | 'characters' | 'ambience' | null>(null);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [drivingMode, setDrivingMode] = useState(false);
  const [remainingSleepTime, setRemainingSleepTime] = useState<number | null>(null); // seconds


  const lastTapRef = useRef<number>(0);
  const [gestureFeedback, setGestureFeedback] = useState<'forward' | 'rewind' | null>(null);

  const seekSeconds = user?.preferences.seekInterval || 15;
  const progressPercent = book?.duration ? Math.min(100, (currentTime / book.duration) * 100) : 0;
  const remainingSeconds = book?.duration ? Math.max(0, Math.floor(book.duration - currentTime)) : 0;
  const activeChapter = book?.chapters?.find((c) => currentTime >= c.startTime && currentTime < c.startTime + c.duration);
  const chapterIndex = book?.chapters?.findIndex((c) => c === activeChapter) ?? -1;
  const currentChapterLabel = activeChapter ? `${chapterIndex + 1}/${book?.chapters?.length ?? 0}` : '—';

  const formatClock = (secs: number) => {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Reset tab when book changes to prevent stale UI
  useEffect(() => {
      setActiveTab(null);
      setDrivingMode(false);
  }, [currentBookId]);

  useEffect(() => {
      if (sleepTimer) {
          const i = setInterval(() => {
              const diffMs = Math.max(0, sleepTimer - Date.now());
              setRemainingSleepTime(Math.ceil(diffMs / 1000));
          }, 500);
          return () => clearInterval(i);
      } else {
          setRemainingSleepTime(null);
      }
  }, [sleepTimer]);

  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent, side: 'left' | 'right') => {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
          // Double Tap Detected
          if (side === 'left') {
              seek(currentTime - 10);
              setGestureFeedback('rewind');
          } else {
              seek(currentTime + 10);
              setGestureFeedback('forward');
          }
          if (navigator.vibrate) navigator.vibrate(20);
          setTimeout(() => setGestureFeedback(null), 600);
      }
      lastTapRef.current = now;
  };  

  const handleSleepSet = (minutes: number | null, endOfChapter: boolean = false) => {
      setSleepTimer(minutes, endOfChapter);
      setShowSleepMenu(false);
  };

  const toggleTab = (tab: 'chapters' | 'characters' | 'ambience') => {
      setActiveTab(current => current === tab ? null : tab);
  };

  const handleABClick = () => {
      if (abLoop.active) {
          clearABLoop();
          showToast("A-B 循环已关闭");
      } else if (abLoop.start !== null) {
          if (currentTime > abLoop.start) {
              setABLoop(abLoop.start, currentTime);
              showToast("A-B 循环已开启");
          } else {
              setABLoop(currentTime, null);
              showToast("A点已更新");
          }
      } else {
          setABLoop(currentTime, null);
          showToast("A点已设定");
      }
  };

  if (!book) return null;

  const safeCover = book.coverUrl || FALLBACK_COVER;
  const handleCoverError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = FALLBACK_COVER;
  };

  // --- Driving Mode UI ---
  if (drivingMode) {
      return (
          <div className="fixed inset-0 z-[200] bg-black text-white flex flex-col p-6 animate-fadeIn safe-area-pt safe-area-pb">
              <div className="flex justify-between items-center mb-8">
                  <button onClick={() => setDrivingMode(false)} className="px-6 py-4 bg-slate-800 rounded-2xl font-bold text-lg active:scale-95 transition">退出驾驶模式</button>
                  <div className="text-right">
                      <div className="text-2xl font-bold text-cyan-400">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-center items-center gap-4 text-center mb-10">
                  <div className="text-4xl font-bold line-clamp-2 leading-tight">{book.title}</div>
                  <div className="text-xl text-slate-400">{book.author}</div>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-4 h-full">
                  <button onClick={() => seek(currentTime - 30)} className="bg-slate-800 rounded-3xl flex items-center justify-center active:bg-slate-700 active:scale-95 transition">
                      <Icon.Rewind15 className="w-16 h-16" />
                  </button>
                  <button onClick={() => seek(currentTime + 30)} className="bg-slate-800 rounded-3xl flex items-center justify-center active:bg-slate-700 active:scale-95 transition">
                      <Icon.Forward15 className="w-16 h-16" />
                  </button>
                  <button onClick={togglePlay} className="col-span-2 bg-cyan-600 rounded-3xl flex items-center justify-center active:bg-cyan-700 shadow-xl shadow-cyan-900/50 active:scale-95 transition">
                      {isPlaying ? <Icon.Pause className="w-24 h-24" /> : <Icon.Play className="w-24 h-24 ml-2" />}
                  </button>
              </div>
          </div>
      )
  }

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isFullScreen ? 'translate-y-0' : 'translate-y-full'}`}>
      
      <DynamicBackground isPlaying={isPlaying} coverUrl={safeCover} />
      
      {/* Gesture Overlay */}
      <div className="absolute inset-x-0 top-20 bottom-40 md:bottom-52 z-0 flex">
          <div className="flex-1 h-full" onClick={(e) => handleDoubleTap(e, 'left')} />
          <div className="flex-1 h-full" onClick={(e) => handleDoubleTap(e, 'right')} />
      </div>

      {/* Feedback Animations */}
      {gestureFeedback && (
          <div className={`absolute top-1/2 -translate-y-1/2 z-50 flex flex-col items-center justify-center w-24 h-24 bg-black/40 backdrop-blur rounded-full animate-ping ${gestureFeedback === 'rewind' ? 'left-10' : 'right-10'}`}>
              {gestureFeedback === 'rewind' ? <Icon.Rewind15 className="w-10 h-10 text-white" /> : <Icon.Forward15 className="w-10 h-10 text-white" />}
              <span className="text-white text-xs font-bold">{gestureFeedback === 'rewind' ? '-10s' : '+10s'}</span>
          </div>
      )}
      
      {/* 1. Header (Fixed Height) */}
      {!zenMode && (
          <div className="relative z-10 flex items-center justify-between px-6 pt-12 pb-2 md:pt-6 safe-area-pt flex-shrink-0">
            <button onClick={closeFullScreen} className="p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition text-white active:scale-90">
              <Icon.ChevronDown />
            </button>
            <div className="flex flex-col items-center pointer-events-none opacity-80">
                 <span className="text-[10px] font-bold text-white tracking-widest uppercase">NOW PLAYING</span>
            </div>
            <div className="flex gap-3 relative">
                <button 
                  onClick={() => setShowShare(true)}
                  className="p-3 md:p-2 rounded-full backdrop-blur-md bg-white/10 text-white active:scale-90 transition"
                >
                    <Icon.Upload className="w-5 h-5" />
                </button>

                <button 
                  onClick={() => setDrivingMode(true)}
                  className="hidden md:flex p-2 rounded-full backdrop-blur-md bg-white/10 text-white active:scale-90 transition"
                >
                    <div className="w-5 h-5 flex items-center justify-center font-bold text-xs border-2 border-current rounded-full">D</div>
                </button>
                <button 
                  className={`p-3 md:p-2 rounded-full backdrop-blur-md transition active:scale-90 ${zenMode ? 'bg-cyan-500 text-white' : 'bg-white/10 text-white'}`}
                  onClick={toggleZenMode}
                >
                  <Icon.Sun className="w-5 h-5" />
                </button>
                <button
                  className={`p-3 md:p-2 rounded-full backdrop-blur-md transition flex items-center gap-1 active:scale-90 ${sleepTimer || sleepEndOfChapter ? 'bg-cyan-500 text-white' : 'bg-white/10 text-white'}`}
                  onClick={() => setShowSleepMenu(!showSleepMenu)}
                >
                  <Icon.Clock className="w-5 h-5" />
                  {remainingSleepTime !== null ? <span className="text-[10px] font-bold hidden md:inline">{formatClock(remainingSleepTime)}</span> : sleepEndOfChapter && <span className="text-[10px] font-bold hidden md:inline">CH</span>}
                </button>

                {/* Sleep Menu Popup */}
                {showSleepMenu && (
                    <div className="absolute top-14 right-0 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-2 z-50 border border-slate-100 dark:border-white/10 animate-[fadeIn_0.2s]">
                        <div className="text-xs font-bold text-slate-400 px-3 py-2 uppercase tracking-wider border-b border-slate-100 dark:border-white/5 mb-1">定时关闭</div>
                        {sleepTimer || sleepEndOfChapter ? (
                            <button onClick={() => handleSleepSet(null)} className="w-full text-left px-3 py-3 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl flex items-center justify-between">
                                <span>关闭定时</span>
                                <Icon.X className="w-4 h-4" />
                            </button>
                        ) : null}
                        {[15, 30, 45, 60].map(min => (
                            <button key={min} onClick={() => handleSleepSet(min)} className="w-full text-left px-3 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl font-medium">{min} 分钟后</button>
                        ))}
                        <button onClick={() => handleSleepSet(null, true)} className="w-full text-left px-3 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl font-medium flex items-center justify-between">本章结束时 <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 rounded">推荐</span></button>
                    </div>
                )}
            </div>
          </div>
      )}

      {/* 2. Visual Area (Flexible Height) */}
      <div className={`relative z-10 flex-1 flex flex-col items-center justify-center px-6 transition-all duration-500 min-h-0 ${activeTab ? 'scale-90 opacity-40 blur-[2px]' : 'scale-100 opacity-100'}`}>
        <div
            onClick={zenMode ? toggleZenMode : undefined}
            className={`
                relative transition-all duration-700 group aspect-square
                ${zenMode ? 'w-[70vw] max-w-[380px] cursor-pointer' : 'w-[62vw] max-w-[280px] md:w-[48vw] md:max-w-[420px] mb-3 md:mb-8'}
            `}
        >
           {/* Vinyl Record Effect */}
           <div className={`absolute inset-0 rounded-full bg-black shadow-2xl overflow-hidden border-[4px] md:border-[6px] border-black/80 ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : 'animate-[spin_2s_ease-out_forwards_paused]'}`}>
                <div className="absolute inset-[12%] bg-black/60 rounded-full shadow-inner"></div>
                <div className="absolute inset-[24%] bg-black/30 rounded-full"></div>
           </div>

           {/* Cover Art with slight inset to avoid stretching */}
           <div className="absolute inset-[18%] rounded-full overflow-hidden shadow-2xl shadow-black/50">
                <img src={safeCover} alt={book.title} className="w-full h-full object-cover scale-[1.02]" onError={handleCoverError} />
           </div>

           {/* Center Pin */}
           <div className="absolute inset-[45%] rounded-full bg-white shadow-lg"></div>

           {!zenMode && (
               <div className="absolute -bottom-10 left-0 right-0 flex justify-between items-center w-full px-4">
                   <button onClick={() => toggleLike(book.id)} className="p-3 bg-white/10 backdrop-blur-xl rounded-full text-white hover:bg-white/20 transition active:scale-90">
                      <Icon.Heart fill={book.isLiked} className={book.isLiked ? "text-red-500" : "text-white"} />
                   </button>
                   <button onClick={() => { const n = prompt("备注"); if(n) addBookmark(book.id, currentTime, n); }} className="p-3 bg-white/10 backdrop-blur-xl rounded-full text-white hover:bg-white/20 transition active:scale-90">
                      <Icon.Edit className="w-5 h-5 text-white" />
                   </button>
               </div>
           )}
        </div>
        
        {!zenMode && (
            <div className="w-full max-w-[420px] mt-2 md:mt-4 animate-[fadeIn_0.5s]">
                <div className="rounded-3xl bg-white/15 dark:bg-black/40 backdrop-blur-xl border border-white/20 px-5 py-4 shadow-xl text-center space-y-1">
                    <p className="text-lg md:text-2xl font-black text-white line-clamp-2 drop-shadow">{book.title}</p>
                    <p className="text-sm md:text-base text-white/80 font-medium">{book.author}</p>
                    <div className="flex items-center justify-center gap-3 text-[11px] text-white/70">
                        <span>{currentChapterLabel}</span>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span>{Math.round(progressPercent)}%</span>
                        {remainingSleepTime !== null && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-white/30" />
                              <span className="flex items-center gap-1"><Icon.Clock className="w-3 h-3" /> {formatClock(remainingSleepTime)}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>

      {!zenMode && (
          <div className="relative z-20 w-full max-w-4xl px-8 pb-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] uppercase tracking-wide">
                <div className="p-3 rounded-2xl bg-white/20 dark:bg-black/30 backdrop-blur-md text-white/80 border border-white/10 shadow-inner">
                    <div className="flex items-center justify-between font-bold"><span>进度</span><span>{progressPercent.toFixed(0)}%</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
                        <div className="h-full bg-cyan-400" style={{ width: `${progressPercent}%` }} />
                    </div>
                </div>
                <div className="p-3 rounded-2xl bg-white/20 dark:bg-black/30 backdrop-blur-md text-white/80 border border-white/10 shadow-inner">
                    <div className="font-bold flex items-center justify-between"><span>剩余</span><span>{formatClock(remainingSeconds)}</span></div>
                    <p className="text-[10px] opacity-70 mt-1">智能回退已启用</p>
                </div>
                <div className="p-3 rounded-2xl bg-white/20 dark:bg-black/30 backdrop-blur-md text-white/80 border border-white/10 shadow-inner hidden md:block">
                    <div className="font-bold flex items-center justify-between"><span>章节</span><span>{currentChapterLabel}</span></div>
                    <p className="text-[10px] opacity-70 mt-1 line-clamp-1">{activeChapter?.title || '自动章节定位'}</p>
                </div>
                <div className="p-3 rounded-2xl bg-white/20 dark:bg-black/30 backdrop-blur-md text-white/80 border border-white/10 shadow-inner">
                    <div className="font-bold flex items-center justify-between"><span>设备适配</span><span className="text-[10px] px-2 py-0.5 bg-white/10 rounded-full">多端</span></div>
                    <p className="text-[10px] opacity-70 mt-1">安全区留白 & 手势友好</p>
                </div>
            </div>
          </div>
      )}

      {/* Zen Mode Hint */}
      {zenMode && (
           <div className="absolute bottom-10 left-0 right-0 text-center text-white/30 animate-pulse text-xs pointer-events-none font-mono tracking-widest uppercase">Tap cover to exit</div>
      )}

      {/* 3. Bottom Controls (Fixed at bottom) */}
      {!zenMode && (
          <div className={`relative z-40 bg-white/90 dark:bg-black/80 backdrop-blur-2xl rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.3)] transition-transform duration-500 ${activeTab ? 'translate-y-full' : 'translate-y-0'} pb-safe flex-shrink-0`}>
            <div className="px-6 pt-6 pb-8 md:p-8 space-y-4 max-w-2xl mx-auto">

               {/* Tools Row */}
               <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                   <button onClick={handleABClick} className={`px-3 py-1.5 rounded-lg transition-all ${abLoop.active ? 'bg-cyan-500 text-white shadow-lg' : abLoop.start ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 dark:bg-white/5'}`}>
                       {abLoop.active ? 'A-B 循环' : abLoop.start ? '设定 B' : 'A-B 复读'}
                   </button>
                   <button onClick={toggleVocalBoost} className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${vocalBoost ? 'bg-purple-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-white/5'}`}>
                       <Icon.Volume className="w-3 h-3" /> 人声增强
                   </button>
               </div>

               <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                    <span className="flex items-center gap-1">智能回退 <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5">5m/1h/24h</span></span>
                    <span className="flex items-center gap-1">
                        <Icon.Clock className="w-3 h-3" />
                        {sleepEndOfChapter ? '本章结束暂停' : sleepTimer && remainingSleepTime !== null ? `剩余 ${formatClock(remainingSleepTime)}` : '未设置'}
                    </span>
               </div>

               {/* Progress */}
               <div className="relative pt-1">
                   <ProgressBar />
                   {lastSeekPosition !== null && (
                       <button onClick={undoSeek} className="absolute -top-4 right-0 text-[10px] font-bold text-cyan-500 flex items-center gap-1 hover:underline animate-fadeIn">
                           <Icon.Rewind15 className="w-3 h-3" /> 撤销
                       </button>
                   )}
                   {abLoop.start && (
                       <div className="absolute top-[1.1rem] h-1.5 bg-cyan-500/50 pointer-events-none rounded-full z-10" style={{ left: `${(abLoop.start / book.duration) * 100}%`, width: abLoop.end ? `${((abLoop.end - abLoop.start) / book.duration) * 100}%` : '4px' }} />
                   )}
               </div>

               {/* Main Controls */}
               <div className="flex items-center justify-between px-2 md:px-10 py-1">
                   <button onClick={() => skipChapter('prev')} className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition active:scale-90"><Icon.ChevronDown className="rotate-90 w-6 h-6" /></button>
                   <button onClick={() => seek(currentTime - seekSeconds)} className="text-slate-600 dark:text-slate-300 hover:text-cyan-500 transition p-2 active:scale-90"><Icon.Rewind15 className="w-8 h-8 md:w-10 md:h-10" /></button>
                   <PlayPauseButton size={16} /> {/* Slightly smaller on mobile to fit */}
                   <button onClick={() => seek(currentTime + seekSeconds)} className="text-slate-600 dark:text-slate-300 hover:text-cyan-500 transition p-2 active:scale-90"><Icon.Forward15 className="w-8 h-8 md:w-10 md:h-10" /></button>
                   <button onClick={() => skipChapter('next')} className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition active:scale-90"><Icon.ChevronDown className="-rotate-90 w-6 h-6" /></button>
               </div>

               {/* Tabs */}
               <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-200 dark:border-white/10">
                   <button onClick={() => toggleTab('chapters')} className="flex flex-col items-center gap-1 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition active:scale-95">
                       <Icon.List className="w-5 h-5 text-slate-500" />
                       <span className="text-[10px] font-bold text-slate-500">章节</span>
                   </button>
                   <button onClick={() => toggleTab('characters')} className="flex flex-col items-center gap-1 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition active:scale-95">
                       <Icon.User className="w-5 h-5 text-slate-500" />
                       <span className="text-[10px] font-bold text-slate-500">角色</span>
                   </button>
                   <button onClick={() => toggleTab('ambience')} className={`flex flex-col items-center gap-1 p-1 rounded-xl transition active:scale-95 ${ambience !== 'none' ? 'bg-cyan-500/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                       <Icon.Zap className={`w-5 h-5 ${ambience !== 'none' ? 'text-cyan-500' : 'text-slate-500'}`} />
                       <span className="text-[10px] font-bold text-slate-500">音效</span>
                   </button>
               </div>
            </div>
          </div>
      )}

      {/* Expanded Drawers (Overlay) */}
      {!zenMode && (
        <div className={`absolute inset-x-0 bottom-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl rounded-t-[2.5rem] shadow-2xl transition-transform duration-500 flex flex-col h-[65vh] md:h-[55vh] ${activeTab ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center flex-shrink-0">
                <span className="text-lg font-bold text-slate-800 dark:text-white ml-2">
                    {activeTab === 'chapters' && '章节列表'}
                    {activeTab === 'characters' && '角色档案'}
                    {activeTab === 'ambience' && '白噪音 (Ambience)'}
                </span>
                <button onClick={() => setActiveTab(null)} className="p-2 bg-slate-100 dark:bg-white/10 rounded-full text-slate-500 active:scale-90">
                    <Icon.ChevronDown className="w-6 h-6" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide pb-20">
                {activeTab === 'chapters' && (
                    <div className="space-y-2">
                        {book.chapters?.map((chapter, index) => {
                          const isActive = currentTime >= chapter.startTime && currentTime < (chapter.startTime + chapter.duration);
                          return (
                              <div key={index} onClick={() => { playChapter(chapter); setActiveTab(null); }} className={`p-4 rounded-2xl cursor-pointer flex justify-between items-center transition-all active:scale-[0.98] ${isActive ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'}`}>
                                  <div className="flex items-center gap-4 overflow-hidden">
                                      {isActive ? <div className="w-2 h-2 rounded-full bg-white animate-pulse" /> : <span className="text-sm opacity-50 font-mono w-4">{index+1}</span>}
                                      <span className="font-medium truncate text-sm md:text-base">{chapter.title}</span>
                                  </div>
                                  <span className="text-xs opacity-70 whitespace-nowrap font-mono">{Math.floor(chapter.duration / 60)} min</span>
                              </div>
                          )
                        })}
                    </div>
                )}

                {activeTab === 'characters' && (
                    <div className="space-y-4">
                        {book.characters?.length ? book.characters.map((char) => (
                            <div key={char.id} className="flex gap-4 p-4 bg-white/50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">{char.name[0]}</div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-slate-800 dark:text-white text-lg">{char.name}</h4>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold">{char.role}</span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{char.description}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-slate-400 mt-10 p-8 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl"><p>该书籍暂无角色档案</p></div>
                        )}
                    </div>
                )}

                {activeTab === 'ambience' && (
                    <div className="space-y-8">
                        <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                             <SpeedControl />
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">背景白噪音 (Real Audio)</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {['none', 'rain', 'fire', 'forest'].map((type) => (
                                    <button 
                                        key={type}
                                        onClick={() => setAmbience(type as any)}
                                        className={`p-4 rounded-2xl border-2 transition-all font-bold text-sm capitalize active:scale-95 ${ambience === type ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 shadow-lg shadow-cyan-500/10' : 'border-transparent bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                                    >
                                        {type === 'none' ? '关闭 (Off)' : type}
                                    </button>
                                ))}
                            </div>
                            {ambience !== 'none' && (
                                <div className="pt-2 animate-fadeIn bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
                                    <div className="flex justify-between text-xs text-slate-500 mb-4 font-bold">
                                        <span>环境音量 (Mix)</span>
                                        <span>{Math.round(ambienceVolume * 100)}%</span>
                                    </div>
                                    <input type="range" min="0" max="1" step="0.05" value={ambienceVolume} onChange={(e) => setAmbienceVolume(parseFloat(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500" />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      <ShareModal book={book} currentTime={currentTime} isOpen={showShare} onClose={() => setShowShare(false)} />
    </div>
  );
};
