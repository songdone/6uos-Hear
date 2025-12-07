
import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from './Icons';
import { MiniPlayer } from './MiniPlayer';
import { FullScreenPlayer } from './FullScreenPlayer';
import { APP_SLOGAN } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { ToastContainer } from './ui/ToastContainer';

interface LayoutProps {
  children: React.ReactNode;
}

const NAV_GROUPS = [
  {
    title: '听书空间',
    items: [
      { to: '/library', label: '资源库', icon: Icon.Library },
      { to: '/favorites', label: '我的收藏', icon: Icon.Heart },
      { to: '/collections', label: '系列合集', icon: Icon.Collection },
      { to: '/authors', label: '作者', icon: Icon.User },
    ],
  },
  {
    title: '洞察 & 控制',
    items: [
      { to: '/stats', label: '数据洞察', icon: Icon.BarChart },
      { to: '/settings', label: '设置中心', icon: Icon.Settings },
    ],
  },
];

const MOBILE_NAV = [
  { to: '/library', label: '首页', icon: Icon.Library },
  { to: '/favorites', label: '收藏', icon: Icon.Heart },
  { to: '/collections', label: '合集', icon: Icon.Collection },
  { to: '/stats', label: '数据', icon: Icon.BarChart },
  { to: '/settings', label: '设置', icon: Icon.Settings },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { dailyProgress, dailyGoal, isPlaying } = usePlayer();
  const { logout, user } = useAuth();
  const location = useLocation();

  const navTitleMap: Record<string, string> = NAV_GROUPS.flatMap((group) => group.items).reduce(
    (acc, item) => ({ ...acc, [item.to]: item.label }),
    { '/': '6uos Hear' }
  );

  const getPageTitle = () => navTitleMap[location.pathname] || '6uos Hear';

  const goalPercent = Math.min((dailyProgress / (dailyGoal * 60)) * 100, 100);

  // --- Wake Lock Implementation ---
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      if (user?.preferences.keepScreenOn && isPlaying && 'wakeLock' in navigator) {
        try {
          // @ts-ignore
          wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
          console.error(`${err.name}, ${err.message}`);
        }
      }
    };
    
    requestWakeLock();
    
    return () => {
      if (wakeLock) wakeLock.release();
    };
  }, [isPlaying, user?.preferences.keepScreenOn]);

  // OLED Mode Logic: Pure black background if enabled, otherwise gradient
  const bgClass = user?.preferences.oledMode 
    ? 'bg-black text-white' 
    : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-blue-950';

  const sidebarClass = user?.preferences.oledMode
    ? 'bg-black border-r border-white/20'
    : 'bg-white/40 dark:bg-black/20 backdrop-blur-xl border-r border-white/20 dark:border-white/5';

  return (
    <div className={`flex h-screen w-screen transition-colors duration-500 overflow-hidden ${bgClass} ${user?.preferences.highContrast ? 'contrast-125' : ''}`}>
      <ToastContainer />

      {/* PC Sidebar */}
      <aside className={`hidden md:flex w-64 flex-col flex-shrink-0 z-30 relative ${sidebarClass}`}>
        <div className="p-6 pb-2">
           <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-3">
                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${user?.preferences.oledMode ? 'bg-white/10' : 'bg-white/20 dark:bg-black/20'}`}>
                   <img src="https://jpg.playsong.cn/i/2025/12/05/xws8jm.svg" alt="Logo" className="w-6 h-6 object-contain" />
                 </div>
                 <span className={`text-xl font-bold tracking-tight leading-none ${user?.preferences.oledMode ? 'text-white' : 'text-slate-800 dark:text-white'}`}>6uos Hear</span>
               </div>
               
               <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors">
                  {isDarkMode ? <Icon.Sun className="w-5 h-5" /> : <Icon.Moon className="w-5 h-5" />}
               </button>
           </div>
           
           <div className="px-1">
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase border-t border-slate-200 dark:border-white/5 pt-2">{APP_SLOGAN}</p>
           </div>
        </div>
        
        {/* Daily Goal Widget */}
        <div className="px-6 mb-4 mt-2">
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${user?.preferences.oledMode ? 'bg-black border-white/30' : 'bg-white/30 dark:bg-white/5 border-white/20'}`}>
                <div className="relative w-10 h-10 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                        <path className="text-cyan-500 transition-all duration-1000" strokeDasharray={`${goalPercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-cyan-500">{Math.round(goalPercent)}%</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-300">今日目标</span>
                    <span className="text-[10px] text-slate-400">{Math.floor(dailyProgress/60)} / {dailyGoal} min</span>
                </div>
            </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-4 overflow-y-auto scrollbar-hide">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4 flex items-center justify-between">
                <span>{group.title}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" />
              </div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                      isActive
                        ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 translate-x-1'
                        : 'text-slate-400 hover:bg-white/10 hover:translate-x-1'
                    }`
                  }
                >
                  <item.icon />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/20">
            <button 
                onClick={logout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-slate-500 hover:text-red-500 hover:bg-red-900/20 transition-colors"
            >
                <Icon.LogOut className="w-5 h-5" />
                <span className="font-bold">退出登录</span>
            </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className={`md:hidden fixed top-0 left-0 right-0 h-14 border-b border-white/10 z-20 flex items-center justify-between px-4 safe-area-pt ${user?.preferences.oledMode ? 'bg-black' : 'bg-white/80 dark:bg-black/80 backdrop-blur-md'}`}>
          <div className="flex items-center gap-2">
              <div className="w-6 h-6">
                <img src="https://jpg.playsong.cn/i/2025/12/05/xws8jm.svg" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className={`font-bold ${user?.preferences.oledMode ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{getPageTitle()}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-full text-slate-500 dark:text-slate-300 active:scale-90 transition">
                {isDarkMode ? <Icon.Sun className="w-5 h-5" /> : <Icon.Moon className="w-5 h-5" />}
            </button>
            <button onClick={logout} className="p-2 rounded-full text-slate-500 hover:text-red-500 active:scale-90 transition">
                <Icon.LogOut className="w-5 h-5" />
            </button>
          </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto relative z-0 scrollbar-hide md:scrollbar-default pt-14 md:pt-0 pb-[180px] md:pb-6">
        {!user?.preferences.oledMode && <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/40 to-transparent dark:from-black/20 pointer-events-none sticky top-0 z-10 hidden md:block" />}
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 h-[80px] border-t border-white/10 z-20 flex justify-around items-start pt-3 px-1 safe-area-pb ${user?.preferences.oledMode ? 'bg-black' : 'bg-white/90 dark:bg-black/90 backdrop-blur-2xl'}`}>
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-cyan-500' : 'text-slate-400'}`
            }
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Players - High Z-Index to cover bottom nav */}
      <div className="z-[100] relative">
          <MiniPlayer />
          <FullScreenPlayer />
      </div>
    </div>
  );
};
