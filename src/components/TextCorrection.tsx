import React, { useState } from 'react';
import { 
  Trash2, Copy, RefreshCw, ArrowLeftRight, Wand2, CheckCircle2, 
  AlertCircle, FileText, Check, Eye, Code, Sparkles, Clipboard, ArrowRight
} from 'lucide-react';
import { diffChars } from 'diff';
import MathJaxRenderer from './MathJaxRenderer';

interface TextCorrectionProps {
  apiKey: string;
  model: string;
}

export default function TextCorrection({ apiKey, model }: TextCorrectionProps) {
  const [mode, setMode] = useState<'text' | 'latex'>('text');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [viewTab, setViewTab] = useState<'diff' | 'raw' | 'preview'>('diff');

  const SAMPLE_TEXT = `Cho hàm số y=f(x) liên tuc trên đoạn [-1; 3] và có đồ thị như hình vẻ. Giá tri lớn nhât của hàm sô tren doan [-1; 3] băng bao nhiêu? biêt rằg f(0)=2, f(1)=4, f(3)=-1. Hãy tìm toạ độ diểm cưc đại.`;
  const SAMPLE_LATEX = `Cho phương trình \frac{x^2 - 4x + 3}{x - 1} = 0 và tích phân I = \int_{0}^{1} x \sqrt{1 - x^2 dx. Tìm tham số m sao cho \lim_{x \to 2} \frac{x^2 - m}{x - 2} = 4. Biểu thức P = \sqrt[3]{x^3 + 3x^2} - x có giới hạn khi x \to +\infty là bao nhiêu?`;

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setError('');
  };

  const handleSwap = () => {
    if (!outputText) return;
    setInputText(outputText);
    setOutputText('');
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInputText(text);
    } catch {
      // Fallback
    }
  };

  const handleCopy = async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleLoadSample = () => {
    setInputText(mode === 'text' ? SAMPLE_TEXT : SAMPLE_LATEX);
    setOutputText('');
    setError('');
  };

  const handleFixErrors = async () => {
    if (!inputText.trim()) {
      setError('Vui lòng nhập văn bản hoặc công thức cần xử lý.');
      return;
    }

    if (!apiKey) {
      setError('Vui lòng cấu hình API Key ở góc trên cùng bên phải trước khi sử dụng.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/convert-word', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          textContent: inputText,
          parsingMode: mode === 'text' ? 'normalize_text' : 'latex_correction',
          model: model || 'auto',
          apiKey: apiKey
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi xử lý.');
      }

      setOutputText(data.text || '');
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối API.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] w-full font-sans animate-fade-in relative space-y-4">
      
      {/* HEADER CONTROL BAR: CHỌN CHẾ ĐỘ XỬ LÝ */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Sparkles size={18} className="text-teal-600 dark:text-teal-400" />
            Sửa Lỗi Văn Bản & Cú Pháp LaTeX
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Tự động phát hiện lỗi chính tả tiếng Việt hoặc lỗi gõ sai mã công thức Toán học bằng AI.
          </p>
        </div>

        {/* Chuyển đổi 2 chế độ */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => { setMode('text'); setOutputText(''); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              mode === 'text'
                ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText size={14} />
            <span>Chuẩn Hóa Tiếng Việt</span>
          </button>
          <button
            onClick={() => { setMode('latex'); setOutputText(''); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              mode === 'latex'
                ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Code size={14} />
            <span>Sửa Cú Pháp LaTeX</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-xl border border-rose-200 dark:border-rose-900 text-xs font-medium">
          <AlertCircle size={16} className="shrink-0 text-rose-500" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 font-bold ml-2">✕</button>
        </div>
      )}

      {/* MAIN TWO PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        
        {/* PANEL TRÁI: VĂN BẢN / MÃ GỐC */}
        <div className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden h-[540px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              <span>{mode === 'text' ? 'Văn bản gốc cần chuẩn hóa' : 'Mã LaTeX cần kiểm tra sửa lỗi'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleLoadSample}
                className="text-[11px] text-teal-600 hover:text-teal-700 dark:text-teal-400 font-semibold hover:underline"
              >
                Mẫu thử
              </button>
              <button
                onClick={handlePaste}
                className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1 shadow-2xs"
                title="Dán nhanh từ Clipboard"
              >
                <Clipboard size={12} />
                <span>Dán</span>
              </button>
              {inputText && (
                <button
                  onClick={handleClear}
                  className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-lg flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  <span>Xóa</span>
                </button>
              )}
            </div>
          </div>

          {/* Text Area */}
          <div className="flex-1 p-3">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                mode === 'text'
                  ? 'Dán văn bản bài giảng, đề thi, câu hỏi trắc nghiệm tiếng Việt cần chuẩn hóa chính tả và câu từ vào đây...'
                  : 'Dán đoạn mã LaTeX hoặc biểu thức toán học cần sửa lỗi (ví dụ: thiếu ngoặc {}, thiếu dấu $, sai lệnh)...'
              }
              className={`w-full h-full resize-none border-0 focus:outline-hidden text-xs sm:text-sm text-slate-800 dark:text-slate-200 bg-transparent leading-relaxed ${
                mode === 'latex' ? 'font-mono' : ''
              }`}
            />
          </div>

          {/* Footer Panel Trái */}
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-[11px] text-slate-400">
            <span>{inputText.length} ký tự</span>
            <button
              onClick={handleFixErrors}
              disabled={isLoading || !inputText.trim()}
              className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 shadow-2xs disabled:opacity-50 transition"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Đang xử lý AI...</span>
                </>
              ) : (
                <>
                  <Wand2 size={14} />
                  <span>{mode === 'text' ? 'Chuẩn hóa tiếng Việt' : 'Sửa lỗi LaTeX'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* PANEL PHẢI: KẾT QUẢ ĐÃ SỬA LỖI */}
        <div className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden h-[540px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Kết quả sau khi sửa lỗi</span>
            </div>

            {/* View Mode Tabs */}
            {outputText && (
              <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800 p-0.5 rounded-lg text-[11px]">
                <button
                  onClick={() => setViewTab('diff')}
                  className={`px-2 py-0.5 rounded-md font-bold transition ${
                    viewTab === 'diff' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  So sánh (Diff)
                </button>
                <button
                  onClick={() => setViewTab('raw')}
                  className={`px-2 py-0.5 rounded-md font-bold transition ${
                    viewTab === 'raw' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Văn bản sạch
                </button>
                <button
                  onClick={() => setViewTab('preview')}
                  className={`px-2 py-0.5 rounded-md font-bold transition ${
                    viewTab === 'preview' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Xem trước công thức
                </button>
              </div>
            )}
          </div>

          {/* Result Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {!outputText && !isLoading && (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6 space-y-2">
                <Wand2 size={36} className="text-slate-300 dark:text-slate-600 mb-1" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Chưa có kết quả xử lý</p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  Nhập nội dung vào khung bên trái và bấm nút "Tiến hành sửa lỗi" để AI tự động tối ưu.
                </p>
              </div>
            )}

            {isLoading && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-500 font-medium">AI đang đối chiếu ngữ pháp và sửa lỗi...</p>
              </div>
            )}

            {outputText && !isLoading && (
              <>
                {viewTab === 'diff' && (
                  <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words font-sans">
                    {diffChars(inputText, outputText).map((part, index) => {
                      if (part.added) {
                        return (
                          <span
                            key={index}
                            className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-0.5 rounded-xs underline decoration-emerald-500"
                            title="Ký tự/từ ngữ đã được sửa hoặc thêm mới"
                          >
                            {part.value}
                          </span>
                        );
                      }
                      if (part.removed) {
                        return (
                          <span
                            key={index}
                            className="bg-rose-100 dark:bg-rose-950 text-rose-500 dark:text-rose-400 line-through px-0.5 rounded-xs opacity-70"
                            title="Nội dung sai đã được loại bỏ"
                          >
                            {part.value}
                          </span>
                        );
                      }
                      return <span key={index}>{part.value}</span>;
                    })}
                  </div>
                )}

                {viewTab === 'raw' && (
                  <textarea
                    readOnly
                    value={outputText}
                    className="w-full h-full resize-none border-0 focus:outline-hidden text-xs sm:text-sm text-slate-800 dark:text-slate-200 bg-transparent leading-relaxed"
                  />
                )}

                {viewTab === 'preview' && (
                  <div className="text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                    <MathJaxRenderer content={outputText} />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Panel Phải */}
          {outputText && (
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
              <button
                onClick={handleSwap}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1 shadow-2xs transition"
                title="Đưa kết quả này sang ô nhập liệu bên trái để tiếp tục xử lý"
              >
                <ArrowLeftRight size={12} />
                <span>Đổi làm đầu vào</span>
              </button>

              <button
                onClick={handleCopy}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Đã sao chép!' : 'Sao chép kết quả'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
