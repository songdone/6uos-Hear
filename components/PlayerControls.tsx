
import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { Icon } from './Icons';

export const PlayPauseButton: React.FC<{ size?: number }> = ({ size = 12 }) => {
  const { isPlaying, togglePlay } = usePlayer();
  return (
    <button 
      onClick={(e) => { e.stopPropagation(); togglePlay(); }}
      className={`rounded-full bg-cyan-500 text-white flex items-center justify-center hover:bg-cyan-600 transition-colors shadow-lg shadow-cyan-500/30 w-${size} h-${size}`}
    >
      {isPlaying ? <Icon.Pause /> : <Icon.Play className="ml-1" />}
    </button>
  );
};

export const ProgressBar: React.FC = () => {
  const { currentTime, duration, seek, currentBookId, getBook } = usePlayer();
  const [showChapterTime, setShowChapterTime] = useState(false);
  
  const book = getBook(currentBookId);

  // Calculate chapter remaining time
  const chapterTimeLeft = () => {
      if (!book || !book.chapters) return 0;
      const currentChap = book.chapters.find(c => currentTime >= c.startTime && currentTime < c.startTime + c.duration);
      if (!currentChap) return 0;
      const end = currentChap.startTime + currentChap.duration;
      return Math.max(0, end - currentTime);
  };
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span>{formatTime(currentTime)}</span>
        <input 
            type="range" 
            min={0} 
            max={duration || 100} 
            value={currentTime} 
            onChange={(e) => seek(Number(e.target.value))}
            className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500"
        />
        <span 
            onClick={() => setShowChapterTime(!showChapterTime)} 
            className="cursor-pointer min-w-[40px] text-right hover:text-cyan-500 transition-colors select-none"
            title="点击切换: 本章剩余 / 全书时长"
        >
            {showChapterTime ? `-${formatTime(chapterTimeLeft())}` : formatTime(duration)}
        </span>
        </div>
        {showChapterTime && (
            <div className="text-[10px] text-cyan-500 text-right pr-1">本章剩余</div>
        )}
    </div>
  );
};

export const SpeedControl: React.FC = () => {
  const { speed, setSpeed } = usePlayer();
  
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400">
         <span>播放速度</span>
         <span className="text-cyan-500">{speed.toFixed(1)}x</span>
      </div>
      <input 
          type="range" 
          min="0.5" 
          max="3.0" 
          step="0.1" 
          value={speed} 
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:shadow-lg"
      />
      <div className="flex justify-between text-[10px] text-slate-400">
          <span>0.5x</span>
          <span>1.0x</span>
          <span>2.0x</span>
          <span>3.0x</span>
      </div>
    </div>
  );
};
