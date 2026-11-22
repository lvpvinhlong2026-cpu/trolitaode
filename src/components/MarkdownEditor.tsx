import React, { useState } from 'react';
import MathJaxRenderer from './MathJaxRenderer';
import { Eye, Edit3 } from 'lucide-react';

interface Props {
  text: string;
  setText: (t: string) => void;
  placeholder?: string;
  height?: string;
}

export default function MarkdownEditor({ text, setText, placeholder = "Đang chờ kết quả...", height = "h-[400px]" }: Props) {
  const [isPreview, setIsPreview] = useState(true);

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setIsPreview(false)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!isPreview ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
        >
          <Edit3 size={14} /> Soạn thảo
        </button>
        <button
          onClick={() => setIsPreview(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isPreview ? 'bg-white dark:bg-slate-700 shadow-sm text-green-600 dark:text-green-400' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
        >
          <Eye size={14} /> Xem trước (Chuẩn Toán Học)
        </button>
      </div>

      <div className={`w-full ${height} overflow-y-auto bg-white dark:bg-slate-800`}>
        {isPreview ? (
          <div className="p-5">
             <MathJaxRenderer content={text} inline={false} />
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-full p-5 bg-transparent text-slate-700 dark:text-slate-300 outline-none resize-none font-mono text-sm leading-relaxed"
            spellCheck={false}
            placeholder={placeholder}
          />
        )}
      </div>
    </div>
  );
}
