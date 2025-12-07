import React, { useEffect, useState } from 'react';
import { Book } from '../types';
import { GlassCard } from './ui/GlassCard';
import { Icon } from './Icons';

interface RenamePlanItem {
  fileId: string;
  from: string;
  to: string;
  conflict: boolean;
}

interface Props {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_TEMPLATE = '{Author} - {Title}/{TrackNumber} {SafeName}';

export const RenamePreviewModal: React.FC<Props> = ({ book, isOpen, onClose }) => {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [plan, setPlan] = useState<RenamePlanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{ total: number; conflicts: number }>({ total: 0, conflicts: 0 });
  const [applyResult, setApplyResult] = useState<string | null>(null);

  const fetchPlan = async (apply = false) => {
    setLoading(true);
    setApplyResult(null);
    try {
      const res = await fetch('/api/metadata/rename-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id, template, apply, cleanNames: true })
      });
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan || []);
        setSummary(data.summary || { total: 0, conflicts: 0 });
        if (apply && Array.isArray(data.applied)) {
          setApplyResult(`已重命名 ${data.applied.length} 个文件`);
        }
      } else {
        setApplyResult('重命名预览失败，请检查服务端日志');
      }
    } catch (e) {
      setApplyResult('请求失败，请稍后重试');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) fetchPlan(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[320] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s]">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl p-6 shadow-2xl border border-white/10 flex flex-col gap-4 max-h-[80vh]">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs uppercase text-slate-400 font-bold">整理 / 重命名</p>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{book.title}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10"><Icon.X /></button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase">命名模板</label>
          <input
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-transparent focus:border-cyan-500 outline-none dark:text-white"
            placeholder="{Author} - {Title}/{TrackNumber} {SafeName}"
          />
          <p className="text-[11px] text-slate-500">可用占位符: {'{Author} {Title} {Series} {SeriesIndex} {TrackNumber} {SafeName} {Ext}'}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPlan(false)}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-white font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition disabled:opacity-50"
          >
            {loading ? '计算中...' : '预览方案'}
          </button>
          <button
            onClick={() => fetchPlan(true)}
            disabled={loading || summary.conflicts > 0}
            className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-500/30 hover:bg-cyan-600 transition disabled:opacity-50"
          >
            应用重命名
          </button>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Icon.Info className="w-4 h-4" />
            {summary.conflicts > 0 ? `检测到 ${summary.conflicts} 个冲突，请调整模板` : '没有检测到命名冲突'}
          </div>
        </div>

        {applyResult && <div className="text-sm text-emerald-600 dark:text-emerald-400">{applyResult}</div>}

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
          {plan.length === 0 && (
            <div className="text-center text-slate-500 py-10">暂无可预览的文件</div>
          )}
          {plan.map((item) => (
            <GlassCard key={item.fileId} className="p-3 flex items-center justify-between">
              <div className="flex flex-col text-sm">
                <span className="text-slate-500 line-through">{item.from}</span>
                <span className="text-slate-800 dark:text-white font-bold">{item.to}</span>
              </div>
              <div className={`text-[11px] px-2 py-1 rounded-full ${item.conflict ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                {item.conflict ? '冲突' : '安全'}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
};
