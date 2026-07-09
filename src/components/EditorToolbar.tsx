import React from 'react';
import { Copy, ClipboardPaste, Eraser, PlayCircle, Loader2 } from 'lucide-react';

interface Props {
  text: string;
  setText: React.Dispatch<React.SetStateAction<string>>;
  onContinue: () => void;
  isProcessing: boolean;
}

export default function EditorToolbar({ text, setText, onContinue, isProcessing }: Props) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Đã chép nội dung vào bộ nhớ tạm.');
    } catch (err) {
      alert('Trình duyệt không hỗ trợ chép trực tiếp, vui lòng bôi đen và ấn Ctrl+C.');
    }
  };

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      // Chèn văn bản vào cuối (phù hợp nhu cầu thêm nội dung bị thiếu trên ipad/mobile)
      setText(prev => prev + (prev.length > 0 && !prev.endsWith('\n') ? '\n' : '') + clipboardText);
    } catch (err) {
      alert('Không thể lấy dữ liệu từ Clipboard. Vui lòng ấn Ctrl+V.');
    }
  };

  const handleClear = () => {
    if (confirm('Bạn có chắc chắn muốn xoá toàn bộ nội dung soạn thảo?')) {
      setText('');
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center gap-2 overflow-x-auto">
      <button 
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-sm whitespace-nowrap"
        title="Sao chép toàn bộ văn bản"
      >
        <Copy size={14} /> Sao chép
      </button>
      
      <button 
        onClick={handlePaste}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-sm whitespace-nowrap"
        title="Dán từ bộ nhớ tạm"
      >
        <ClipboardPaste size={14} /> Dán (Thêm)
      </button>
      
      <button 
        onClick={handleClear}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm whitespace-nowrap"
        title="Xoá trắng văn bản"
      >
        <Eraser size={14} /> Xóa
      </button>

      <div className="flex-1 min-w-[20px]"></div>

      <button 
        onClick={onContinue}
        disabled={isProcessing || !text.trim()}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors shadow-sm whitespace-nowrap disabled:opacity-50"
        title="Tiếp tục sinh nội dung (nếu bị thiếu)"
      >
        {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
        Tiếp tục tạo phần thiếu
      </button>
    </div>
  );
}
