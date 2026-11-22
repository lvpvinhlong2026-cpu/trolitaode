import React from 'react';
import { Trash, ClipboardPaste, PenLine, Play, Loader2 } from 'lucide-react';

interface Props {
  text: string;
  setText: React.Dispatch<React.SetStateAction<string>>;
  onContinue: () => void;
  isProcessing: boolean;
}

export default function EditorToolbar({ text, setText, onContinue, isProcessing }: Props) {
  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setText(prev => prev + (prev.length > 0 && !prev.endsWith('<br>') ? '<br>' : '') + clipboardText.replace(/\n/g, '<br>'));
    } catch (err) {
      alert('Không thể lấy dữ liệu từ Clipboard. Vui lòng ấn Ctrl+V.');
    }
  };

  const handleClear = () => {
    if (confirm('Bạn có chắc chắn muốn xoá toàn bộ nội dung?')) {
      setText('');
    }
  };

  const handleEdit = () => {
    // Sửa: Focus vào khung soạn thảo (đang sử dụng div contentEditable hoặc textarea)
    alert('Chức năng sửa đã được bật. Vui lòng bấm vào khung văn bản bên dưới để chỉnh sửa trực tiếp.');
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center gap-2 overflow-x-auto">
      <button 
        onClick={handleClear}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm whitespace-nowrap"
        title="Xóa nội dung"
      >
        <Trash size={14} /> Xóa
      </button>

      <button 
        onClick={handlePaste}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-sm whitespace-nowrap"
        title="Dán văn bản"
      >
        <ClipboardPaste size={14} /> Dán
      </button>

      <button 
        onClick={handleEdit}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 transition-colors shadow-sm whitespace-nowrap"
        title="Sửa nội dung"
      >
        <PenLine size={14} /> Sửa
      </button>

      <div className="flex-1 min-w-[20px]"></div>

      <button 
        onClick={onContinue}
        disabled={isProcessing || !text.trim()}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors shadow-sm whitespace-nowrap disabled:opacity-50"
        title="Tiếp tục sinh nội dung (nếu AI bị ngắt giữa chừng)"
      >
        {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
        Tiếp tục sinh
      </button>
    </div>
  );
}
