import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Table as TableIcon, 
  Box, 
  Check, 
  Sliders, 
  Copy, 
  AlertCircle, 
  HelpCircle,
  Eye,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { 
  DiagramSuggestion, 
  analyzeQuestionForDiagram, 
  generateDataUrlFromSuggestion,
  suggestDiagramWithAI,
  DiagramType
} from '../utils/mathDiagramSuggester';

export interface DiagramPlaceholderWidgetProps {
  rawAlt?: string;
  questionText?: string;
  targetQuestion?: string;
  allQuestions?: string[];
  apiKey?: string;
  model?: string;
  onOpenDiagramTool?: (type: DiagramType, targetQuestion: string, suggestion?: DiagramSuggestion) => void;
  onInsertDiagram?: (dataUrl: string, targetQuestion: string, altText?: string) => void;
}

export const DiagramPlaceholderWidget: React.FC<DiagramPlaceholderWidgetProps> = ({
  rawAlt = 'Bảng biến thiên',
  questionText = '',
  targetQuestion: initialTargetQ,
  allQuestions = ['Câu 1', 'Câu 2', 'Câu 3', 'Câu 4', 'Câu 5', 'Câu 6', 'Câu 7', 'Câu 8', 'Câu 9', 'Câu 10', 'Câu 11', 'Câu 12'],
  apiKey = '',
  model = 'auto',
  onOpenDiagramTool,
  onInsertDiagram
}) => {
  // 1. Phân tích văn bản câu hỏi để lấy thông số gợi ý ban đầu
  const defaultSuggestion = useMemo(() => {
    return analyzeQuestionForDiagram(questionText || rawAlt, initialTargetQ || 'Câu 1');
  }, [questionText, rawAlt, initialTargetQ]);

  const [suggestion, setSuggestion] = useState<DiagramSuggestion>(defaultSuggestion);
  const [selectedQuestion, setSelectedQuestion] = useState<string>(initialTargetQ || defaultSuggestion.targetQuestion || 'Câu 1');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  // Cập nhật lại gợi ý khi prop thay đổi
  useEffect(() => {
    setSuggestion(defaultSuggestion);
    if (initialTargetQ) {
      setSelectedQuestion(initialTargetQ);
    } else if (defaultSuggestion.targetQuestion) {
      setSelectedQuestion(defaultSuggestion.targetQuestion);
    }
  }, [defaultSuggestion, initialTargetQ]);

  // Tự động sinh ảnh 300 DPI thu nhỏ cho bản xem trước
  useEffect(() => {
    try {
      const url = generateDataUrlFromSuggestion(suggestion);
      if (url) {
        setPreviewUrl(url);
      }
    } catch (e) {
      console.warn('Lỗi sinh ảnh xem trước gợi ý:', e);
    }
  }, [suggestion]);

  // Hành động: 1-Click Tự động chèn theo gợi ý
  const handleQuickInsert = () => {
    let urlToUse = previewUrl;
    if (!urlToUse) {
      urlToUse = generateDataUrlFromSuggestion(suggestion);
    }

    if (!urlToUse) {
      alert('Không thể tạo ảnh vẽ. Vui lòng bấm "Mở công cụ vẽ" để thao tác trực tiếp.');
      return;
    }

    const altLabel = suggestion.diagramType === 'bbt' 
      ? 'Bảng biến thiên' 
      : suggestion.diagramType === 'graph' 
        ? 'Đồ thị Oxy' 
        : 'Hình học 3D';

    if (onInsertDiagram) {
      onInsertDiagram(urlToUse, selectedQuestion, `${altLabel} ${selectedQuestion}`);
    }
  };

  // Hành động: Mở modal công cụ vẽ kèm thông số đã nạp sẵn
  const handleOpenTool = () => {
    if (onOpenDiagramTool) {
      onOpenDiagramTool(suggestion.diagramType, selectedQuestion, suggestion);
    }
  };

  // Hành động: AI Gemini phân tích nâng cao
  const handleAiSuggest = async () => {
    if (!questionText) {
      alert('Chưa có nội dung câu hỏi để AI phân tích.');
      return;
    }
    setIsAiLoading(true);
    try {
      const aiResult = await suggestDiagramWithAI(questionText, apiKey, model);
      if (aiResult) {
        aiResult.targetQuestion = selectedQuestion;
        setSuggestion(aiResult);
      } else {
        alert('AI không tìm thấy gợi ý đặc thù, đã giữ nguyên gợi ý toán học tiêu chuẩn.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Copy ảnh vào clipboard
  const handleCopy = async () => {
    if (!previewUrl) return;
    try {
      const res = await fetch(previewUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      alert('Trình duyệt không cho phép sao chép ảnh trực tiếp.');
    }
  };

  const isBBT = suggestion.diagramType === 'bbt';
  const isGraph = suggestion.diagramType === 'graph';

  return (
    <div className="my-4 mx-auto max-w-2xl rounded-2xl border-2 border-dashed border-teal-300 dark:border-teal-700/80 bg-gradient-to-br from-teal-50/70 via-white to-sky-50/60 dark:from-slate-900 dark:via-slate-900/90 dark:to-teal-950/30 p-4 sm:p-5 shadow-xs transition-all">
      
      {/* 1. THANH TIÊU ĐỀ WIDGET GỢI Ý */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-teal-100 dark:border-teal-900/40">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs ${
            isBBT ? 'bg-purple-600' : isGraph ? 'bg-teal-600' : 'bg-amber-600'
          }`}>
            {isBBT ? <TableIcon size={16} /> : isGraph ? <TrendingUp size={16} /> : <Box size={16} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">
                {isBBT ? 'Bảng biến thiên' : isGraph ? 'Đồ thị hàm số Oxy' : 'Hình học 3D'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Chưa có hình trong đề
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Vị trí cần vẽ: <strong className="text-teal-700 dark:text-teal-300">{selectedQuestion}</strong>
            </p>
          </div>
        </div>

        {/* Nút bấm AI Gemini phân tích */}
        {apiKey && (
          <button
            type="button"
            onClick={handleAiSuggest}
            disabled={isAiLoading}
            className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
            title="Dùng Gemini AI phân tích câu hỏi để đề xuất hàm số tối ưu"
          >
            {isAiLoading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
            <span>{isAiLoading ? 'AI đang phân tích...' : '✨ AI Gợi ý lại'}</span>
          </button>
        )}
      </div>

      {/* 2. KHỐI GỢI Ý HÀM SỐ & PHÂN TÍCH TOÁN HỌC */}
      <div className="py-3 space-y-2">
        <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-3 border border-teal-100 dark:border-teal-900/50 shadow-2xs">
          <div className="flex items-start gap-2">
            <div className="text-teal-600 dark:text-teal-400 shrink-0 mt-0.5">
              💡
            </div>
            <div className="space-y-1 text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-100 flex flex-wrap items-center gap-1.5">
                <span>Gợi ý hàm số phù hợp:</span>
                <span className="px-2 py-0.5 rounded-md bg-teal-100/80 dark:bg-teal-900/50 text-teal-900 dark:text-teal-200 font-mono font-bold">
                  {suggestion.title}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {suggestion.reason}
              </p>
              {suggestion.keyFeatures.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {suggestion.keyFeatures.map((feat, idx) => (
                    <span 
                      key={idx} 
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-medium"
                    >
                      ✓ {feat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. BẢN XEM TRƯỚC HÌNH VẼ THU NHỎ (THUMBNAIL 300 DPI) */}
        {previewUrl && (
          <div className="relative group bg-white dark:bg-slate-800/60 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 text-center flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
              Bản vẽ gợi ý (Độ nét 300 DPI chuẩn Word)
            </span>
            <div className="max-h-[140px] overflow-hidden flex items-center justify-center rounded-lg bg-white border border-slate-100 dark:border-slate-700 p-1">
              <img 
                src={previewUrl} 
                alt="Bản vẽ gợi ý" 
                className="max-h-[125px] w-auto object-contain cursor-zoom-in"
                onClick={() => setShowPreviewModal(true)}
                title="Bấm để phóng to xem chi tiết"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. KHỐI THAO TÁC: CHỌN CÂU MẤY CỦA ĐỀ & DÁN VÀO ĐỀ THI */}
      <div className="pt-3 border-t border-teal-100 dark:border-teal-900/40 flex flex-wrap items-center justify-between gap-3">
        
        {/* Bộ chọn câu trong đề */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
            Dán vào:
          </span>
          <select
            value={selectedQuestion}
            onChange={(e) => setSelectedQuestion(e.target.value)}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded-xl text-xs font-black text-teal-900 dark:text-teal-200 outline-none shadow-2xs focus:ring-2 focus:ring-teal-500/20"
          >
            {allQuestions.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </div>

        {/* Các nút hành động */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút 1: Chèn ngay theo gợi ý */}
          <button
            type="button"
            onClick={handleQuickInsert}
            className="px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs hover:shadow-md transition active:scale-95 cursor-pointer"
            title={`Tự động vẽ và dán hình ảnh 300 DPI vào ${selectedQuestion}`}
          >
            <Check size={14} />
            <span>⚡ Chèn vào {selectedQuestion}</span>
          </button>

          {/* Nút 2: Mở bộ vẽ để tùy chỉnh */}
          <button
            type="button"
            onClick={handleOpenTool}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            title="Mở bộ công cụ vẽ hoàn chỉnh để chỉnh sửa số liệu, font chữ"
          >
            <Sliders size={13} className="text-teal-600" />
            <span>Mở công cụ vẽ...</span>
          </button>

          {/* Nút 3: Sao chép ảnh 300 DPI */}
          {previewUrl && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Sao chép ảnh vào clipboard để dán sang Word"
            >
              {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* POPUP PHÓNG TO HÌNH XEM TRƯỚC NẾU CẦN */}
      {showPreviewModal && previewUrl && (
        <div 
          onClick={() => setShowPreviewModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs cursor-zoom-out"
        >
          <div className="bg-white rounded-2xl p-4 max-w-2xl max-h-[90vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 mb-2 border-b">
              <span className="font-bold text-xs text-slate-800">Bản vẽ độ phân giải cao 300 DPI</span>
              <button onClick={() => setShowPreviewModal(false)} className="text-xs font-bold text-slate-500 hover:text-slate-800">Đóng</button>
            </div>
            <img src={previewUrl} alt="Phóng to" className="w-full h-auto rounded-lg" />
          </div>
        </div>
      )}

    </div>
  );
};

export default DiagramPlaceholderWidget;
