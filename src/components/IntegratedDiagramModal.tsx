import React, { useState } from 'react';
import { X, TrendingUp, Table, Box, Sparkles, CheckCircle2 } from 'lucide-react';
import FunctionGraphTool from './FunctionGraphTool';
import TableVariationTool from './TableVariationTool';
import GspSketchpad from './GspSketchpad';

export type DiagramToolTab = 'graph' | 'bbt' | 'geometry';

export interface IntegratedDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertImage: (dataUrl: string, targetQuestionNumber?: number | string) => void;
  initialTab?: DiagramToolTab;
  targetQuestionNumber?: number | string;
  apiKey?: string;
  model?: string;
}

export const IntegratedDiagramModal: React.FC<IntegratedDiagramModalProps> = ({
  isOpen,
  onClose,
  onInsertImage,
  initialTab = 'graph',
  targetQuestionNumber,
  apiKey = '',
  model = 'auto'
}) => {
  const [activeTab, setActiveTab] = useState<DiagramToolTab>(initialTab);

  if (!isOpen) return null;

  const handleInsert = (dataUrl: string) => {
    onInsertImage(dataUrl, targetQuestionNumber);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-[1440px] max-h-[96vh] flex flex-col overflow-hidden">
        
        {/* HEADER BAR CỦA MODAL TÍCH HỢP */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles size={17} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                  Bộ Công Cụ Vẽ Đồ Thị, Bảng Biến Thiên & Hình Học Không Gian (300 DPI)
                </span>
                {targetQuestionNumber && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                    Câu {targetQuestionNumber}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Vẽ và chèn trực tiếp vào đề thi để tự động xuất ra file Word (.docx) chuẩn sắc nét
              </p>
            </div>
          </div>

          {/* 3 TABS CHUYỂN ĐỔI CÔNG CỤ */}
          <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('graph')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'graph'
                  ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <TrendingUp size={14} className="text-teal-600" />
              <span>1. Đồ Thị Oxy</span>
            </button>

            <button
              onClick={() => setActiveTab('bbt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'bbt'
                  ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Table size={14} className="text-purple-600" />
              <span>2. Bảng Biến Thiên</span>
            </button>

            <button
              onClick={() => setActiveTab('geometry')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'geometry'
                  ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Box size={14} className="text-amber-600" />
              <span>3. Hình Không Gian (GSP)</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            title="Đóng modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* NỘI DUNG CÔNG CỤ VẼ TƯƠNG ỨNG */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {activeTab === 'graph' && (
            <FunctionGraphTool 
              apiKey={apiKey} 
              model={model} 
              onInsertImage={handleInsert} 
            />
          )}

          {activeTab === 'bbt' && (
            <TableVariationTool 
              onInsertImage={handleInsert} 
            />
          )}

          {activeTab === 'geometry' && (
            <GspSketchpad 
              onInsertImage={handleInsert} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default IntegratedDiagramModal;
