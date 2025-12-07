
import React, { useRef } from 'react';
import { Icon } from '../Icons';

interface ImageUploaderProps {
  value: string;
  onChange: (base64: string) => void;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ value, onChange, className = '' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit size to prevent localStorage explosion (approx 1MB limit check)
    if (file.size > 1024 * 1024) {
        alert("图片太大，请选择 1MB 以下的图片（模拟环境限制）");
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      onChange(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`relative group ${className}`}>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
      
      {value ? (
        <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 group-hover:border-cyan-500 transition-colors">
           <img src={value} alt="Preview" className="w-full h-full object-cover" />
           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
               <Icon.Upload className="w-6 h-6 text-white" />
               <span className="text-xs text-white font-bold">更换图片</span>
           </div>
        </div>
      ) : (
        <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full min-h-[120px] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-cyan-500 hover:bg-cyan-50/50 dark:hover:bg-cyan-900/20 transition-all flex flex-col items-center justify-center cursor-pointer gap-2 text-slate-400 hover:text-cyan-600"
        >
            <Icon.Upload className="w-8 h-8" />
            <span className="text-xs font-bold">点击上传封面</span>
        </div>
      )}
    </div>
  );
};
