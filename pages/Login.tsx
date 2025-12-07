import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';
import { APP_SLOGAN } from '../constants';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('6uos666');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    
    // Simulate network delay
    setTimeout(() => {
      const success = login(username, password);
      if (!success) {
        // Only reset loading if login FAILED (staying on page)
        setError(true);
        setLoading(false);
        // Shake animation reset
        setTimeout(() => setError(false), 500);
      } else {
        // If success, App.tsx will redirect immediately. 
        // We do NOT set loading false here to prevent unmount state warnings.
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-cyan-100 via-purple-50 to-white dark:from-slate-900 dark:via-blue-900 dark:to-black relative overflow-hidden">
      {/* Background Animated Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-300/30 blur-[120px] animate-float" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-300/30 blur-[120px] animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <GlassCard className={`w-full max-w-sm p-8 relative z-10 ${error ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 mb-4 animate-breathe drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <img 
              src="https://jpg.playsong.cn/i/2025/12/05/xws8jm.svg" 
              alt="6uos Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">6uos Hear</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{APP_SLOGAN}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1 uppercase tracking-wider">用户名</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/50 border border-transparent focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all dark:text-white placeholder-slate-400"
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1 uppercase tracking-wider">密码</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/50 border border-transparent focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all dark:text-white placeholder-slate-400"
              placeholder="Enter password"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 mt-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 hover:scale-[1.02] hover:shadow-cyan-500/40 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>登录中...</span>
              </div>
            ) : "登录"}
          </button>
        </form>
        
        <div className="mt-8 text-center">
           <p className="text-xs text-slate-400 mb-1">测试账号</p>
           <div className="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 font-mono border border-slate-200 dark:border-slate-700">
             admin / 6uos666
           </div>
        </div>
      </GlassCard>
    </div>
  );
};