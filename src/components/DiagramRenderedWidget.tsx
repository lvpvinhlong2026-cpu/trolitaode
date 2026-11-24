import React, { useState } from 'react';
import { Edit3, Copy, Check, Trash2, ArrowRightLeft, ZoomIn } from 'lucide-react';
import { DiagramType } from '../utils/mathDiagramSuggester';

export interface DiagramRenderedWidgetProps {
  src: string;
  alt?: string;
  targetQuestion?: string;
  allQuestions?: string[];
  onOpenDiagramTool?: (type: DiagramType, targetQuestion: string) => void;
  onMoveDiagram?: (dataUrl: string, newTargetQuestion: string) => void;
  onRemoveDiagram?: (targetQuestion: string) => void;
}

export const DiagramRenderedWidget: React.FC<DiagramRenderedWidgetProps> = ({
  src,
  alt = 'Hình vẽ minh họa',
  targetQuestion = 'Câu 1',
  allQuestions = ['Câu 1', 'Câu 2', 'Câu 3', 'Câu 4', 'Câu 5', 'Câu 6', 'Câu 7', 'Câu 8', 'Câu 9', 'Câu 10', 'Câu 11', 'Câu 12'],
  onOpenDiagramTool,
  onMoveDiagram,
  onRemoveDiagram
}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showMoveSelect, setShowMoveSelect] = useState<boolean>(false);
  const [selectedTarget, setSelectedTarget] = useState<string>(targetQuestion);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  // Nhận diện loại hình từ alt text
  const isBBT = alt.toLowerCase().includes('bảng biến thiên') || alt.toLowerCase().includes('bbt');
  const isGraph = alt.toLowerCase().includes('đồ thị') || alt.toLowerCase().includes('oxy');
  const diagramType: DiagramType = isBBT ? 'bbt' : isGraph ? 'graph' : 'geometry';

  const handleCopy = async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      alert('Không thể sao chép trực tiếp vào clipboard.');
    }
  };

  const handleApplyMove = () => {
    if (onMoveDiagram && selectedTarget !== targetQuestion) {
      onMoveDiagram(src, selectedTarget);
      setShowMoveSelect(false);
    }
  };

  return (
    <div className="relative group my-3 flex flex-col items-center justify-center">
      {/* VÙNG ẢNH VẼ 300 DPI */}
      <div className="relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-white p-2 shadow-xs group-hover:shadow-md transition-all">
        <img
          src={src}
          alt={alt}
          className="max-w-full sm:max-w-lg h-auto mx-auto rounded-xl object-contain cursor-zoom-in"
          onClick={() => setIsZoomed(true)}
          title="Bấm để phóng to xem chi tiết"
        />

        {/* THANH ĐIỀU KHIỂN NỔI KHI RÊ CHUỘT */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/85 backdrop-blur-md text-white px-2 py-1 rounded-xl flex items-center gap-1.5 shadow-lg text-[11px] font-bold">
          
          {/* Nút sửa */}
          {onOpenDiagramTool && (
            <button
              type="button"
              onClick={() => onOpenDiagramTool(diagramType, targetQuestion)}
              className="px-2 py-1 hover:bg-white/20 rounded-lg flex items-center gap-1 transition"
              title="Mở bộ công cụ vẽ để chỉnh sửa hình này"
            >
              <Edit3 size={12} className="text-teal-400" />
              <span>Sửa hình</span>
            </button>
          )}

          {/* Nút copy */}
          <button
            type="button"
            onClick={handleCopy}
            className="px-2 py-1 hover:bg-white/20 rounded-lg flex items-center gap-1 transition"
            title="Sao chép ảnh độ nét cao 300 DPI"
          >
            {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{isCopied ? 'Đã copy' : 'Copy'}</span>
          </button>

          {/* Nút dán sang câu khác */}
          {onMoveDiagram && (
            <button
              type="button"
              onClick={() => setShowMoveSelect(prev => !prev)}
              className="px-2 py-1 hover:bg-white/20 rounded-lg flex items-center gap-1 transition"
              title="Dán sang câu khác trong đề thi"
            >
              <ArrowRightLeft size={12} className="text-amber-400" />
              <span>Dán sang câu khác</span>
            </button>
          )}

          {/* Nút xóa / vẽ lại */}
          {onRemoveDiagram && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Bạn có chắc muốn xóa hình vẽ của ${targetQuestion} để vẽ lại không?`)) {
                  onRemoveDiagram(targetQuestion);
                }
              }}
              className="p-1 hover:bg-red-500/40 rounded-lg text-red-300 transition"
              title="Xóa hình vẽ này"
            >
              <Trash2 size={13} />
            </button>
          )}

        </div>

        {/* BẢNG CHỌN CÂU ĐỂ DÁN SANG */}
        {showMoveSelect && onMoveDiagram && (
          <div className="absolute top-10 right-2 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl shadow-xl space-y-2 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 block">
              Dán ảnh này sang câu:
            </span>
            <div className="flex items-center gap-1.5">
              <select
                value={selectedTarget}
                onChange={e => setSelectedTarget(e.target.value)}
                className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs font-bold"
              >
                {allQuestions.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleApplyMove}
                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
              >
                Dán
              </button>
            </div>
          </div>
        )}
      </div>

      {/* POPUP PHÓNG TO */}
      {isZoomed && (
        <div
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs cursor-zoom-out"
        >
          <div className="bg-white rounded-2xl p-4 max-w-3xl max-h-[90vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 mb-2 border-b">
              <span className="font-bold text-xs text-slate-800">{alt} ({targetQuestion})</span>
              <button onClick={() => setIsZoomed(false)} className="text-xs font-bold text-slate-500 hover:text-slate-800">Đóng</button>
            </div>
            <img src={src} alt={alt} className="w-full h-auto rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagramRenderedWidget;
