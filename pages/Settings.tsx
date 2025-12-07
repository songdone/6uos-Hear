
import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/Icons';
import { Book } from '../types';
import { ImageUploader } from '../components/ui/ImageUploader';

export const Settings: React.FC = () => {
  const { user, updateProfile, updatePreferences, updateScraperSettings, logout } = useAuth();
  const { books, updateBook, deleteBook, showToast } = usePlayer();
  
  const [activeTab, setActiveTab] = useState<'preferences' | 'library' | 'account'>('preferences');
  
  const [serverScanning, setServerScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  
  // Account State
  const [passForm, setPassForm] = useState({ oldPass: '', newPass: '', confirmPass: '' });
  
  // Management Edit State
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const triggerServerScan = async () => {
      setServerScanning(true);
      try {
          // Pass current scraper settings to the backend for this scan
          const config = user?.preferences.scraper || {};
          
          await fetch('/api/library/scan', { 
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(config)
          });
          
          showToast("配置已下发，深度扫描任务已启动", "success");
          setTimeout(() => setServerScanning(false), 2000);
      } catch (e) {
          showToast("连接服务器失败", "error");
          setServerScanning(false);
      }
  };

  const handleBrowserUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setUploading(true);
      const formData = new FormData();
      
      let folderName = "Uploaded_Batch_" + Date.now();
      if (files[0].webkitRelativePath) {
          folderName = files[0].webkitRelativePath.split('/')[0];
      }
      formData.append('folderName', folderName);

      for (let i = 0; i < files.length; i++) {
          formData.append('files', files[i]);
      }

      try {
          const res = await fetch('/api/upload', {
              method: 'POST',
              body: formData
          });
          if (res.ok) {
              showToast("上传并入库成功！", "success");
          } else {
              showToast("上传失败", "error");
          }
      } catch (e) {
          showToast("网络错误", "error");
      } finally {
          setUploading(false);
          if (uploadInputRef.current) uploadInputRef.current.value = '';
      }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
      e.preventDefault();
      if (passForm.newPass !== passForm.confirmPass) {
          showToast("两次输入的新密码不一致", "error");
          return;
      }
      if (passForm.newPass.length < 6) {
          showToast("密码长度需大于6位", "error");
          return;
      }
      // Mock validation of old password (in a real app, backend would validate)
      updateProfile(user!.username, passForm.newPass);
      showToast("密码修改成功，请重新登录", "success");
      setTimeout(logout, 1500);
  };

  // UI Helpers
  const Toggle = ({ label, checked, onChange, desc, warning }: { label: string, checked: boolean, onChange: (v: boolean) => void, desc?: string, warning?: boolean }) => (
      <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${user?.preferences.oledMode ? 'bg-black border-white/20' : 'bg-white/40 dark:bg-white/5 border-white/20 hover:bg-white/50'}`}>
          <div className="pr-4">
              <div className={`font-bold text-sm ${warning ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>{label}</div>
              {desc && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{desc}</div>}
          </div>
          <button 
             onClick={() => onChange(!checked)}
             className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${checked ? (warning ? 'bg-red-500' : 'bg-cyan-500') : 'bg-slate-300 dark:bg-slate-600'}`}
          >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${checked ? 'left-6' : 'left-0.5'}`} />
          </button>
      </div>
  );

  const Select = ({ label, value, options, onChange }: { label: string, value: string | number, options: {label: string, value: any}[], onChange: (v: any) => void }) => (
      <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${user?.preferences.oledMode ? 'bg-black border-white/20' : 'bg-white/40 dark:bg-white/5 border-white/20 hover:bg-white/50'}`}>
          <div className="font-bold text-slate-800 dark:text-white text-sm">{label}</div>
          <select 
             value={value} 
             onChange={(e) => onChange(e.target.value)}
             className="bg-transparent text-right text-sm font-bold text-cyan-600 dark:text-cyan-400 outline-none cursor-pointer"
          >
              {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
      </div>
  );

  const Input = ({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) => (
      <div className={`p-4 rounded-xl border transition-colors ${user?.preferences.oledMode ? 'bg-black border-white/20' : 'bg-white/40 dark:bg-white/5 border-white/20'}`}>
          <div className="font-bold text-slate-800 dark:text-white text-sm mb-2">{label}</div>
          <input 
            type="text" 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-slate-100 dark:bg-white/10 px-3 py-2 rounded-lg text-sm outline-none border border-transparent focus:border-cyan-500 dark:text-white"
            placeholder={placeholder}
          />
      </div>
  );

  const handleSaveBookEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingBook) {
          updateBook(editingBook);
          setEditingBook(null);
          showToast("书籍元数据已更新", "success");
      }
  };

  if (!user) return null;

  return (
    <div className="p-6 pb-32 md:pb-6 max-w-5xl mx-auto space-y-6 animate-[fadeIn_0.5s_ease-out]">
       <header className="flex flex-col gap-2">
         <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">系统设置</h1>
         <div className="flex gap-4 border-b border-slate-200 dark:border-white/10 pb-1 overflow-x-auto">
             <button onClick={() => setActiveTab('preferences')} className={`pb-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'preferences' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-slate-400 hover:text-slate-600'}`}>偏好设置</button>
             <button onClick={() => setActiveTab('library')} className={`pb-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'library' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-slate-400 hover:text-slate-600'}`}>媒体库 & 刮削 (PRO)</button>
             <button onClick={() => setActiveTab('account')} className={`pb-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'account' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-slate-400 hover:text-slate-600'}`}>账户 & 安全</button>
         </div>
       </header>

       {/* --- TAB: PREFERENCES --- */}
       {activeTab === 'preferences' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-[fadeIn_0.3s_ease-out]">
                {/* 1. General & Visual */}
                <section className="space-y-3">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2">常规与视觉</h2>
                    <Select 
                        label="启动页 (Startup Page)" 
                        value={user.preferences.startupPage} 
                        options={[{label: '资源库 (Library)', value: 'library'}, {label: '数据统计 (Stats)', value: 'stats'}, {label: '继续播放 (Last Played)', value: 'last-played'}]}
                        onChange={(v) => updatePreferences({ startupPage: v })}
                    />
                    <Toggle 
                        label="OLED 纯黑模式" 
                        desc="彻底关闭背景模糊和渐变，使用 #000000 背景"
                        checked={user.preferences.oledMode} 
                        onChange={(v) => updatePreferences({ oledMode: v })}
                    />
                    <Select 
                        label="UI 缩放比例" 
                        value={user.preferences.uiScale} 
                        options={[{label: '标准 (Normal)', value: 'normal'}, {label: '大号 (Large)', value: 'large'}]}
                        onChange={(v) => updatePreferences({ uiScale: v })}
                    />
                    <Toggle 
                        label="高对比度 (High Contrast)" 
                        desc="增强文字和边框对比度，提升可读性"
                        checked={user.preferences.highContrast} 
                        onChange={(v) => updatePreferences({ highContrast: v })}
                    />
                    <Toggle 
                        label="减弱动态效果" 
                        desc="关闭部分复杂动画以提升性能"
                        checked={user.preferences.reduceMotion} 
                        onChange={(v) => updatePreferences({ reduceMotion: v })}
                    />
                    <Toggle 
                        label="封面旋转动画 (Vinyl Spin)" 
                        desc="播放时显示唱片旋转效果"
                        checked={user.preferences.coverRotation} 
                        onChange={(v) => updatePreferences({ coverRotation: v })}
                    />
                     <Toggle 
                        label="隐藏已读 (Hide Completed)" 
                        desc="在媒体库中隐藏进度超过 95% 的书籍"
                        checked={user.preferences.hideCompleted} 
                        onChange={(v) => updatePreferences({ hideCompleted: v })}
                    />
                </section>

                {/* 2. Playback Control */}
                <section className="space-y-3">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2">播放控制</h2>
                    <Toggle 
                        label="屏幕常亮 (Keep Screen On)" 
                        desc="播放期间阻止屏幕自动休眠 (Wake Lock)"
                        checked={user.preferences.keepScreenOn} 
                        onChange={(v) => updatePreferences({ keepScreenOn: v })}
                    />
                    <Select 
                        label="快进/快退间隔" 
                        value={user.preferences.seekInterval} 
                        options={[{label: '10秒', value: 10}, {label: '15秒', value: 15}, {label: '30秒', value: 30}, {label: '60秒', value: 60}]}
                        onChange={(v) => updatePreferences({ seekInterval: Number(v) })}
                    />
                    <Toggle 
                        label="智能回退 (Auto-Rewind)" 
                        desc="暂停后恢复播放时自动回退 2 秒"
                        checked={user.preferences.autoRewind} 
                        onChange={(v) => updatePreferences({ autoRewind: v })}
                    />
                    <Toggle 
                        label="变调补偿 (Pitch Correction)" 
                        desc="倍速播放时保持人声自然"
                        checked={user.preferences.keepPitch} 
                        onChange={(v) => updatePreferences({ keepPitch: v })}
                    />
                    <Toggle 
                        label="双击手势 (Double Tap)" 
                        desc="播放器两侧双击进行快进/快退"
                        checked={user.preferences.enableGestures} 
                        onChange={(v) => updatePreferences({ enableGestures: v })}
                    />
                    <Toggle 
                        label="摇一摇播放 (Shake Control)" 
                        desc="剧烈摇动手机以播放/暂停 (移动端)"
                        checked={user.preferences.shakeToPlay} 
                        onChange={(v) => updatePreferences({ shakeToPlay: v })}
                    />
                     <Toggle 
                        label="触感反馈 (Haptic Feedback)" 
                        desc="操作按钮时提供震动反馈"
                        checked={user.preferences.hapticFeedback} 
                        onChange={(v) => updatePreferences({ hapticFeedback: v })}
                    />
                </section>

                {/* 3. Audio & System */}
                <section className="space-y-3">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2">音频与系统</h2>
                    <Select 
                        label="均衡器预设 (Mock)" 
                        value={user.preferences.equalizerPreset} 
                        options={[{label: '原声 (Flat)', value: 'flat'}, {label: '人声 (Vocal)', value: 'vocal'}, {label: '重低音 (Bass)', value: 'bass'}]}
                        onChange={(v) => updatePreferences({ equalizerPreset: v })}
                    />
                    <Toggle 
                        label="智能音量 (Smart Volume)" 
                        desc="自动平衡不同书籍的音量大小"
                        checked={user.preferences.smartVolume} 
                        onChange={(v) => updatePreferences({ smartVolume: v })}
                    />
                    <Toggle 
                        label="跳过静音 (Skip Silence)" 
                        desc="智能加速空白片段 (模拟)"
                        checked={user.preferences.skipSilence} 
                        onChange={(v) => updatePreferences({ skipSilence: v })}
                    />
                    <Toggle 
                        label="自动书签 (Auto-Bookmark)" 
                        desc="暂停超过 5 分钟自动创建书签"
                        checked={user.preferences.autoBookmark} 
                        onChange={(v) => updatePreferences({ autoBookmark: v })}
                    />
                    <Toggle 
                        label="锁屏控制 (Lock Screen)" 
                        desc="允许在系统通知栏和锁屏界面控制播放"
                        checked={user.preferences.lockScreenControls} 
                        onChange={(v) => updatePreferences({ lockScreenControls: v })}
                    />
                    <Toggle 
                        label="仅 Wi-Fi 下载 (Data Saver)" 
                        desc="使用蜂窝网络时不自动缓存封面和音频"
                        checked={user.preferences.wifiOnlyDownload} 
                        onChange={(v) => updatePreferences({ wifiOnlyDownload: v })}
                    />
                    <Toggle 
                        label="操作确认" 
                        desc="删除书籍时弹出确认框"
                        checked={user.preferences.confirmDelete} 
                        onChange={(v) => updatePreferences({ confirmDelete: v })}
                    />
                </section>
           </div>
       )}

       {/* --- TAB: LIBRARY (Dual Ingestion & PRO Scraper) --- */}
       {activeTab === 'library' && (
           <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                
                {/* 1. Ingestion Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard className="p-6 border-l-4 border-l-cyan-500" noHover>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">服务端存储卷</h3>
                                <div className="inline-block px-2 py-0.5 mt-1 rounded bg-slate-200 dark:bg-white/10 text-xs font-mono text-slate-600 dark:text-slate-300">/mnt/library</div>
                            </div>
                            <Icon.Server className="w-8 h-8 text-cyan-500" />
                        </div>
                        <p className="text-sm text-slate-500 mb-6 min-h-[40px]">
                            后端会自动监控此目录。如果未自动识别，请确保下方配置正确后手动触发全量扫描。
                        </p>
                        <button 
                            onClick={triggerServerScan}
                            disabled={serverScanning}
                            className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${serverScanning ? 'bg-slate-400 cursor-not-allowed' : 'bg-cyan-500 hover:bg-cyan-600'}`}
                        >
                            {serverScanning ? (
                                <>
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/>
                                    <span>深度扫描进行中...</span>
                                </>
                            ) : (
                                <>
                                    <Icon.Refresh className="w-5 h-5" />
                                    <span>执行全量智能扫描</span>
                                </>
                            )}
                        </button>
                    </GlassCard>

                    <GlassCard className="p-6 border-l-4 border-l-purple-500" noHover>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">浏览器上传</h3>
                                <div className="inline-block px-2 py-0.5 mt-1 rounded bg-slate-200 dark:bg-white/10 text-xs font-mono text-slate-600 dark:text-slate-300">/mnt/library/uploads</div>
                            </div>
                            <Icon.Upload className="w-8 h-8 text-purple-500" />
                        </div>
                        <p className="text-sm text-slate-500 mb-6 min-h-[40px]">
                            从本机上传。大文件建议直接拷贝到服务器目录。
                        </p>
                        <input 
                            type="file" 
                            ref={uploadInputRef}
                            onChange={handleBrowserUpload}
                            className="hidden" 
                            multiple 
                            // @ts-ignore
                            webkitdirectory="" directory=""
                        />
                        <button 
                            onClick={() => uploadInputRef.current?.click()}
                            disabled={uploading}
                            className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${uploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-purple-500 hover:bg-purple-600'}`}
                        >
                            {uploading ? (
                                <>
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/>
                                    <span>上传处理中...</span>
                                </>
                            ) : (
                                <>
                                    <Icon.FolderOpen className="w-5 h-5" />
                                    <span>选择文件夹上传</span>
                                </>
                            )}
                        </button>
                    </GlassCard>
                </div>

                {/* 2. Scraper Sources Configuration */}
                <section className="space-y-4">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">刮削数据源 (Data Sources)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Toggle 
                            label="Apple iTunes API" 
                            desc="高质量封面 (600x600)，元数据标准"
                            checked={user.preferences.scraper.useItunes}
                            onChange={(v) => updateScraperSettings({ useItunes: v })}
                        />
                        <Toggle 
                            label="Google Books" 
                            desc="图书出版信息、ISBN、简介"
                            checked={user.preferences.scraper.useGoogleBooks}
                            onChange={(v) => updateScraperSettings({ useGoogleBooks: v })}
                        />
                        <Toggle 
                            label="喜马拉雅 (Ximalaya)" 
                            desc="中文有声书资源匹配"
                            checked={false} // Mock: Currently disabled in logic but UI needed
                            onChange={() => showToast("暂不支持该源", "info")}
                        />
                        <Toggle 
                            label="OpenLibrary" 
                            desc="开源图书数据库，适合英文书籍"
                            checked={user.preferences.scraper.useOpenLibrary}
                            onChange={(v) => updateScraperSettings({ useOpenLibrary: v })}
                        />
                        <div className="md:col-span-2">
                            <Input 
                                label="自定义数据源 (Custom JSON API)" 
                                placeholder="https://my-api.com/search?q="
                                value={user.preferences.scraper.customSourceUrl}
                                onChange={(v) => updateScraperSettings({ customSourceUrl: v })}
                            />
                        </div>
                    </div>
                </section>

                {/* 3. Advanced Scraper Configuration */}
                <section className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">智能整理逻辑 (Logic)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <Toggle 
                            label="优先读取本地元数据" 
                            desc="优先使用同目录下的 .nfo 或 .json 文件信息"
                            checked={user.preferences.scraper.priorityNfo}
                            onChange={(v) => updateScraperSettings({ priorityNfo: v })}
                        />
                        <Toggle 
                            label="提取内嵌封面" 
                            desc="从音频文件 ID3 标签中提取封面并保存为 cover.jpg"
                            checked={user.preferences.scraper.extractEmbeddedCover}
                            onChange={(v) => updateScraperSettings({ extractEmbeddedCover: v })}
                        />
                        <Toggle 
                            label="合并多碟目录" 
                            desc="自动将 CD1/CD2 子目录视为同一本书并展平"
                            checked={user.preferences.scraper.flattenMultiDisc}
                            onChange={(v) => updateScraperSettings({ flattenMultiDisc: v })}
                        />
                        <Input 
                            label="忽略列表 (逗号分隔)" 
                            placeholder="extras, sample, __MACOSX"
                            value={user.preferences.scraper.ignorePatterns}
                            onChange={(v) => updateScraperSettings({ ignorePatterns: v })}
                        />
                    </div>
                </section>

                {/* 4. Automatic Renaming */}
                <section className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
                    <h2 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 ml-1">自动识别与重命名 (危险操作)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Toggle 
                            label="启用物理文件重命名" 
                            desc="警告：这将修改服务器上的实际文件名，请谨慎操作！"
                            warning={true}
                            checked={user.preferences.scraper.enableRenaming}
                            onChange={(v) => updateScraperSettings({ enableRenaming: v })}
                        />
                        <Input 
                            label="重命名模板" 
                            placeholder="{Author}/{Series}/{Year} - {Title}"
                            value={user.preferences.scraper.renameTemplate}
                            onChange={(v) => updateScraperSettings({ renameTemplate: v })}
                        />
                        <Toggle 
                            label="净化文件名" 
                            desc="移除特殊字符和无意义的前缀"
                            checked={user.preferences.scraper.cleanFilename}
                            onChange={(v) => updateScraperSettings({ cleanFilename: v })}
                        />
                    </div>
                </section>

                {/* 5. Library List Management */}
                <section>
                   <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">当前媒体库</h2>
                   <GlassCard className="overflow-hidden" noHover>
                       <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                           <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                               <thead className={`text-xs text-slate-700 uppercase sticky top-0 z-10 ${user.preferences.oledMode ? 'bg-black text-slate-400' : 'bg-slate-50 dark:bg-slate-800'}`}>
                                   <tr>
                                       <th className="px-6 py-3">封面</th>
                                       <th className="px-6 py-3">标题</th>
                                       <th className="px-6 py-3">格式</th>
                                       <th className="px-6 py-3">时长</th>
                                       <th className="px-6 py-3">操作</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {books.map(book => (
                                       <tr key={book.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-white/5">
                                           <td className="px-6 py-2">
                                               <img src={book.coverUrl} className="w-8 h-8 rounded object-cover" alt="" onError={(e) => (e.target as HTMLImageElement).src='https://placehold.co/400x400?text=NA'} />
                                           </td>
                                           <td className="px-6 py-2 font-medium text-slate-900 dark:text-white max-w-[150px] truncate">{book.title}</td>
                                           <td className="px-6 py-2 text-xs font-mono uppercase">{book.tracks?.[0]?.format || 'UNKNOWN'}</td>
                                           <td className="px-6 py-2 text-xs font-mono">{Math.floor(book.duration/60)} min</td>
                                           <td className="px-6 py-2 whitespace-nowrap">
                                               <button onClick={() => setEditingBook(book)} className="text-blue-500 hover:text-blue-700 mr-3 px-2 py-1">编辑</button>
                                               <button onClick={() => deleteBook(book.id)} className="text-red-500 hover:text-red-700 px-2 py-1">删除</button>
                                           </td>
                                       </tr>
                                   ))}
                                   {books.length === 0 && (
                                       <tr>
                                           <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                               媒体库为空。请使用上方按钮扫描或上传文件。
                                           </td>
                                       </tr>
                                   )}
                               </tbody>
                           </table>
                       </div>
                   </GlassCard>
               </section>
           </div>
       )}

       {/* --- TAB: ACCOUNT & SECURITY --- */}
       {activeTab === 'account' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-[fadeIn_0.3s_ease-out]">
               <section className="space-y-4">
                   <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">个人资料</h2>
                   <GlassCard className="p-6 flex flex-col items-center gap-4">
                       <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-4xl text-white font-bold shadow-xl">
                           {user.username[0].toUpperCase()}
                       </div>
                       <div className="text-center">
                           <div className="text-xl font-bold text-slate-800 dark:text-white">{user.username}</div>
                           <div className="text-xs text-slate-500 mt-1">管理员权限</div>
                       </div>
                       <button onClick={logout} className="w-full py-3 mt-4 rounded-xl bg-slate-100 dark:bg-white/5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold transition-colors flex items-center justify-center gap-2">
                           <Icon.LogOut className="w-4 h-4" />
                           退出登录
                       </button>
                   </GlassCard>
               </section>

               <section className="space-y-4">
                   <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">安全设置</h2>
                   <GlassCard className="p-6">
                       <form onSubmit={handleUpdatePassword} className="space-y-4">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">当前密码</label>
                               <input 
                                   type="password" 
                                   value={passForm.oldPass} 
                                   onChange={e => setPassForm({...passForm, oldPass: e.target.value})} 
                                   className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-transparent focus:border-cyan-500 outline-none dark:text-white"
                               />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">新密码</label>
                               <input 
                                   type="password" 
                                   value={passForm.newPass} 
                                   onChange={e => setPassForm({...passForm, newPass: e.target.value})} 
                                   className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-transparent focus:border-cyan-500 outline-none dark:text-white"
                               />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">确认新密码</label>
                               <input 
                                   type="password" 
                                   value={passForm.confirmPass} 
                                   onChange={e => setPassForm({...passForm, confirmPass: e.target.value})} 
                                   className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-transparent focus:border-cyan-500 outline-none dark:text-white"
                               />
                           </div>
                           <button type="submit" className="w-full py-3 rounded-xl bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-500/30 hover:bg-cyan-600 transition-colors">
                               修改密码
                           </button>
                       </form>
                   </GlassCard>
               </section>
           </div>
       )}

       {/* Edit Book Modal (unchanged logic, just ensuring styling matches OLED) */}
       {editingBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
              <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border ${user.preferences.oledMode ? 'bg-black border-white/20' : 'bg-white dark:bg-slate-900 border-white/10'}`}>
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white">编辑书籍详情</h3>
                      <button onClick={() => setEditingBook(null)} className="p-1 text-slate-400"><Icon.X /></button>
                  </div>
                  <form onSubmit={handleSaveBookEdit} className="space-y-4">
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
                                   <input type="text" value={editingBook.title} onChange={e => setEditingBook({...editingBook, title: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 border border-transparent focus:border-cyan-500 outline-none dark:text-white" />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">作者</label>
                                   <input type="text" value={editingBook.author} onChange={e => setEditingBook({...editingBook, author: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 border border-transparent focus:border-cyan-500 outline-none dark:text-white" />
                               </div>
                           </div>
                      </div>
                      <div className="flex gap-3 pt-6">
                          <button type="button" onClick={() => setEditingBook(null)} className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">取消</button>
                          <button type="submit" className="flex-1 py-3 rounded-xl bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-500/30">保存修改</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
