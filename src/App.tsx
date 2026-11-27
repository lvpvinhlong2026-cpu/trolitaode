/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Check, 
  Sparkles, 
  Settings,
  AlertTriangle,
  Undo2,
  Redo2,
  BookmarkPlus,
  FolderOpen,
  Trash2,
  X
} from 'lucide-react';
import { AppData } from './types';
import { getStoredData, saveStoredData } from './utils/dataStore';
import { ExamCV7991 } from './types/pedagogy';
import { SAMPLES } from './data/sampleCurriculum';
import {
  loadExamDraft,
  saveExamDraft,
  loadExamLibrary,
  saveExamToLibrary,
  deleteExamFromLibrary,
  SavedExamEntry,
} from './utils/examLibrary';

// Modules theo chuyên môn
import { WordRibbonBar } from './components/WordRibbonBar';
import { ContextMenu } from './components/ContextMenu';
import { ExamCV7991View } from './components/ExamCV7991View';
import { MatrixCV7991View } from './components/MatrixCV7991View';
import { QuickBookUploadBar } from './components/QuickBookUploadBar';
import { BookUploadModal } from './components/BookUploadModal';
import { ParsedLessonItem } from './utils/bookParser';
import CV7991ExamGenerator from './components/CV7991ExamGenerator';
import MatrixFromExamGenerator from './components/MatrixFromExamGenerator';
import SimilarExamGenerator from './components/SimilarExamGenerator';
import ExamCritiqueTool from './components/ExamCritiqueTool';
import FunctionGraphTool from './components/FunctionGraphTool';
import TableVariationTool from './components/TableVariationTool';
import GspSketchpad from './components/GspSketchpad';
import UserGuide from './components/UserGuide';
import SettingsForm from './components/SettingsForm';

export type ActiveTabType = 
  | 'exam_full'
  | 'matrix_full'
  | 'matrix_from_exam'
  | 'cv7991' 
  | 'similar' 
  | 'critique'
  | 'bbt_tool'
  | 'function_graph' 
  | 'geometry' 
  | 'guide';

export default function App() {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTabType>('exam_full');
  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quản lý đề thi chuẩn CV 7991 (auto-save vào localStorage + Undo/Redo + Thư viện đề)
  const [examData, setExamDataState] = useState<ExamCV7991>(() => loadExamDraft() || SAMPLES[0].exam);
  const [undoStack, setUndoStack] = useState<ExamCV7991[]>([]);
  const [redoStack, setRedoStack] = useState<ExamCV7991[]>([]);
  const [examLibrary, setExamLibrary] = useState<SavedExamEntry[]>(() => loadExamLibrary());
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [fallbackWarning, setFallbackWarning] = useState<{ activeModel: string; errorReason: string } | null>(null);
  const [isBookUploadModalOpen, setIsBookUploadModalOpen] = useState(false);

  const setExamData = useCallback((updater: ExamCV7991 | ((prev: ExamCV7991) => ExamCV7991)) => {
    setExamDataState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next !== prev) {
        setUndoStack(u => [...u.slice(-29), prev]);
        setRedoStack([]);
        saveExamDraft(next);
      }
      return next;
    });
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack(u => {
      if (u.length === 0) return u;
      const previous = u[u.length - 1];
      setExamDataState(current => {
        setRedoStack(r => [...r.slice(-29), current]);
        saveExamDraft(previous);
        return previous;
      });
      return u.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack(r => {
      if (r.length === 0) return r;
      const next = r[r.length - 1];
      setExamDataState(current => {
        setUndoStack(u => [...u.slice(-29), current]);
        saveExamDraft(next);
        return next;
      });
      return r.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const onFallback = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setFallbackWarning({
          activeModel: detail.activeModel || 'Gemini-Auto-Fallback',
          errorReason: detail.errorReason || 'Kết nối AI bị gián đoạn.',
        });
      }
    };
    window.addEventListener('ai_fallback_triggered', onFallback);
    return () => window.removeEventListener('ai_fallback_triggered', onFallback);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  // API Key & Model Settings states (Gemini 3 Pro -> Gemini 3 Flash -> Gemini 2.5 Flash Auto Fallback)
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [preferredModel, setPreferredModel] = useState<string>(() => {
    const saved = localStorage.getItem('gemini_preferred_model');
    const validModels = [
      'auto', 
      'gemini-3-pro-preview', 
      'gemini-3-flash-preview', 
      'gemini-2.5-flash', 
      'gemini-2.5-pro',
      'gemini-2.0-flash'
    ];
    if (saved && validModels.includes(saved)) {
      return saved;
    }
    localStorage.setItem('gemini_preferred_model', 'auto');
    return 'auto';
  });
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showKeyRequiredModal, setShowKeyRequiredModal] = useState<boolean>(false);

  // Load state on mount
  useEffect(() => {
    const data = getStoredData();
    setAppData(data);

    if (data.settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleTheme = () => {
    if (!appData) return;
    const isDark = appData.settings.theme === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';
    
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const updated = {
      ...appData,
      settings: {
        ...appData.settings,
        theme: nextTheme as 'light' | 'dark'
      }
    };
    setAppData(updated);
    saveStoredData(updated);
  };

  const handleSaveSettings = (key: string, model: string) => {
    const trimmed = key.trim();
    localStorage.setItem('gemini_api_key', trimmed);
    localStorage.setItem('edtech_gemini_api_key', trimmed);
    localStorage.setItem('gemini_preferred_model', model);
    setApiKey(trimmed);
    setPreferredModel(model);
    setShowSettingsModal(false);
    setShowKeyRequiredModal(false);
    showToast("Đã lưu cấu hình AI thành công (Gemini Auto-Fallback)");
  };

  const handleSelectLessonFromBook = (lesson: ParsedLessonItem, meta: { subject: string; grade: string; series: any }) => {
    setExamData(prev => ({
      ...prev,
      subject: meta.subject,
      grade: meta.grade,
      examTitle: `ĐỀ KIỂM TRA ĐỊNH KÌ MÔN ${meta.subject.toUpperCase()} - ${meta.grade.toUpperCase()} (${lesson.fullLessonName})`
    }));
    showToast(`Đã nạp bài: ${lesson.fullLessonName}`);
  };

  // =========================================================================
  // BỘ 3 THAO TÁC BẮT BUỘC: THÊM (ADD), XÓA (DELETE), LÀM LẠI (RESET) (HD_PHUC)
  // Thực hiện bằng Nút trên Ribbon và bằng Chuột (Context Menu) trên mọi tab
  // =========================================================================

  const handleAdd = useCallback(() => {
    window.dispatchEvent(new CustomEvent('app_action', { detail: { action: 'add', tab: activeTab } }));

    if (activeTab === 'exam_full') {
      const newQuestionNumber = examData.part1Questions.length + 1;
      const newQuestion = {
        id: `p1_new_${Date.now()}`,
        number: newQuestionNumber,
        cognitiveLevel: 'know' as const,
        topic: examData.examTitle || 'Chủ đề mới',
        content: `Câu hỏi ${newQuestionNumber}: Tính giá trị của biểu thức $P = \\lim_{x \\to 0} \\frac{\\sin x}{x}$.`,
        options: {
          A: "$P = 1$",
          B: "$P = 0$",
          C: "$P = +\\infty$",
          D: "$P = -1$"
        },
        correctAnswer: 'A' as const,
        explanation: 'Ta có giới hạn cơ bản: $\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$. Chọn đáp án A.'
      };
      setExamData(prev => ({
        ...prev,
        part1Questions: [...prev.part1Questions, newQuestion]
      }));
      showToast(`Đã thêm Câu hỏi ${newQuestionNumber} vào Phần I`);
    } else if (activeTab === 'matrix_full') {
      const newRow = {
        topicName: `Chủ đề ${examData.matrixRows.length + 1}`,
        unitName: `Bài học mới`,
        part1: { know: 2, understand: 1, apply: 0 },
        part2: { know: 1, understand: 0, apply: 0 },
        part3: { know: 0, understand: 1, apply: 0 },
        part4: { know: 0, understand: 0, apply: 1 }
      };
      setExamData(prev => ({
        ...prev,
        matrixRows: [...prev.matrixRows, newRow]
      }));
      showToast('Đã thêm 1 dòng chủ đề mới vào Ma trận');
    } else {
      showToast('Đã kích hoạt chức năng Thêm mới trên module');
    }
  }, [activeTab, examData]);

  const handleDelete = useCallback(() => {
    window.dispatchEvent(new CustomEvent('app_action', { detail: { action: 'delete', tab: activeTab } }));

    if (activeTab === 'exam_full') {
      if (examData.part1Questions.length > 0) {
        if (!window.confirm('Bạn có chắc muốn xóa câu hỏi cuối cùng của Phần I? (Có thể hoàn tác bằng Ctrl+Z)')) return;
        setExamData(prev => ({
          ...prev,
          part1Questions: prev.part1Questions.slice(0, -1)
        }));
        showToast('Đã xóa câu hỏi cuối cùng của Phần I');
      } else {
        showToast('Danh sách câu hỏi đang trống');
      }
    } else if (activeTab === 'matrix_full') {
      if (examData.matrixRows.length > 1) {
        if (!window.confirm('Bạn có chắc muốn xóa dòng cuối cùng của Ma trận?')) return;
        setExamData(prev => ({
          ...prev,
          matrixRows: prev.matrixRows.slice(0, -1)
        }));
        showToast('Đã xóa dòng cuối cùng của Ma trận');
      } else {
        showToast('Tối thiểu phải giữ lại 1 dòng ma trận');
      }
    } else {
      showToast('Đã kích hoạt chức năng Xóa nội dung trên module');
    }
  }, [activeTab, examData, setExamData]);

  const handleReset = useCallback(() => {
    if (activeTab === 'exam_full' || activeTab === 'matrix_full') {
      if (!window.confirm('Khôi phục về đề thi và ma trận mẫu CV 7991 ban đầu? Thay đổi hiện tại vẫn có thể hoàn tác bằng nút Undo.')) return;
      window.dispatchEvent(new CustomEvent('app_action', { detail: { action: 'reset', tab: activeTab } }));
      setExamData(SAMPLES[0].exam);
      showToast('Đã khôi phục đề thi và ma trận chuẩn CV 7991 ban đầu');
    } else {
      window.dispatchEvent(new CustomEvent('app_action', { detail: { action: 'reset', tab: activeTab } }));
      showToast('Đã làm lại và khôi phục trạng thái chuẩn');
    }
  }, [activeTab, setExamData]);

  // Tab label for Context Menu
  const getTabLabel = (tab: ActiveTabType): string => {
    switch (tab) {
      case 'exam_full': return 'Đề Thi Chuẩn CV 7991';
      case 'matrix_full': return 'Ma Trận & Đặc Tả 10.0đ';
      case 'matrix_from_exam': return 'Tạo Ma Trận Từ Đề';
      case 'cv7991': return 'Sinh Đề Theo Ma Trận';
      case 'similar': return 'Nhân Bản Đề Tương Tự';
      case 'critique': return 'Phản Biện Đề Thi';
      case 'bbt_tool': return 'Bảng Biến Thiên Tự Động (300 DPI)';
      case 'function_graph': return 'Đồ Thị Hàm Số Oxy (300 DPI)';
      case 'geometry': return 'Hình Học Không Gian & GSP';
      case 'guide': default: return 'Hướng Dẫn Sử Dụng';
    }
  };

  if (!appData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#fafafa] dark:bg-slate-900">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Đang khởi tạo TRỢ LÍ TẠO ĐỀ...</p>
        </div>
      </div>
    );
  }

  const isDark = appData.settings.theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-[#fafafa] text-slate-800'}`}>
      
      {/* 1. THANH ĐIỀU HƯỚNG RIBBON PHONG CÁCH MICROSOFT WORD */}
      <WordRibbonBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isRibbonCollapsed={isRibbonCollapsed}
        onToggleRibbon={() => setIsRibbonCollapsed(prev => !prev)}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onReset={handleReset}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenBookUpload={() => setIsBookUploadModalOpen(true)}
        apiKey={apiKey}
        preferredModel={preferredModel}
      />

      {/* 2. MENU CHUỘT PHẢI (CONTEXT MENU) TƯƠNG TÁC THÊM - XÓA - LÀM LẠI & SAO CHÉP WORD (HD_PHUC) */}
      <ContextMenu
        onAdd={handleAdd}
        onDelete={handleDelete}
        onReset={handleReset}
        activeTabLabel={getTabLabel(activeTab)}
      />

      {/* 3. THÔNG BÁO TOAST TINH GỌN (TỰ BIẾN MẤT) */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-slate-900/90 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Check size={14} className="text-teal-400 dark:text-teal-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 4. VÙNG LÀM VIỆC CHÍNH (DOCUMENT WORKSPACE - NỀN XÁM NHẠT #E8E8E8 + TRANG GIẤY TRẮNG ĐỔ BÓNG A4) */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-6 transition-all bg-[#E8E8E8] dark:bg-slate-950">
        
        {/* CẢNH BÁO KHI HỆ THỐNG FALLBACK AI ĐƯỢC KÍCH HOẠT */}
        {fallbackWarning && (
          <div className="mb-3 max-w-[1500px] mx-auto bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Đang dùng dữ liệu mẫu dự phòng ({fallbackWarning.activeModel}):</strong> Không gọi được Gemini API ({fallbackWarning.errorReason}). Kết quả hiển thị là nội dung mẫu, không phải nội dung AI sinh từ tài liệu của bạn.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition"
              >
                Kiểm tra API Key
              </button>
              <button
                type="button"
                onClick={() => setFallbackWarning(null)}
                className="p-1 text-amber-700 dark:text-amber-300 hover:bg-amber-200/50 rounded-lg"
                title="Đóng cảnh báo"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Nạp nhanh SGK + Undo/Redo + Thư viện đề chỉ hiển thị gọn khi ở tab Đề thi hoặc Ma trận */}
        {(activeTab === 'exam_full' || activeTab === 'matrix_full') && (
          <div className="mb-3 max-w-[1500px] mx-auto space-y-2">
            <QuickBookUploadBar
              currentLessonName={examData.examTitle}
              currentSubject={examData.subject}
              currentGrade={examData.grade}
              onSelectLesson={handleSelectLessonFromBook}
              onOpenFullModal={() => setIsBookUploadModalOpen(true)}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  Tự động lưu nháp
                </span>
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 disabled:opacity-40 font-semibold transition"
                  title="Hoàn tác (Ctrl+Z)"
                >
                  <Undo2 size={13} /> Hoàn tác ({undoStack.length})
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 disabled:opacity-40 font-semibold transition"
                  title="Làm lại (Ctrl+Y)"
                >
                  <Redo2 size={13} /> Làm lại ({redoStack.length})
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const updated = saveExamToLibrary(examData);
                    setExamLibrary(updated);
                    showToast('Đã lưu đề thi vào Thư viện cá nhân!');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold transition shadow-2xs"
                >
                  <BookmarkPlus size={13} /> Lưu vào Thư viện
                </button>
                <button
                  type="button"
                  onClick={() => setIsLibraryModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold transition"
                >
                  <FolderOpen size={13} /> Thư viện đề ({examLibrary.length})
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-[1500px] mx-auto w-full bg-white dark:bg-slate-900 border border-[#E1DFDD] dark:border-slate-800 rounded-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.10),0_1px_3px_rgba(0,0,0,0.06)] p-4 sm:p-6 min-h-[calc(100vh-165px)]">
          {/* TAB 1: ĐỀ THI CHUẨN 4 PHẦN (CV 7991) */}
          <div className={activeTab === 'exam_full' ? 'block animate-fade-in' : 'hidden'}>
            <ExamCV7991View 
              exam={examData} 
              onUpdateExam={setExamData}
              onNavigateToMatrix={() => setActiveTab('matrix_full')}
            />
          </div>

          {/* TAB 2: MA TRẬN & BẢN ĐẶC TẢ ĐỀ THI 10.0Đ */}
          <div className={activeTab === 'matrix_full' ? 'block animate-fade-in' : 'hidden'}>
            <MatrixCV7991View 
              exam={examData} 
              onUpdateExam={setExamData}
            />
          </div>

          {/* TAB TẠO MA TRẬN ĐẶC TẢ TỪ ĐỀ */}
          <div className={activeTab === 'matrix_from_exam' ? 'block animate-fade-in' : 'hidden'}>
            <MatrixFromExamGenerator 
              apiKey={apiKey} 
              model={preferredModel}
              onApplyExam={(newExam) => {
                setExamData(newExam);
                showToast('Đã nạp Ma trận & Đặc tả vào hệ thống!');
              }}
              onNavigateToMatrix={() => setActiveTab('matrix_full')}
            />
          </div>

          {/* TAB 3: SINH ĐỀ AI THEO MA TRẬN (KÈM BBT VÀ ĐỒ THỊ) */}
          <div className={activeTab === 'cv7991' ? 'block animate-fade-in' : 'hidden'}>
            <CV7991ExamGenerator
              apiKey={apiKey}
              model={preferredModel}
              onApplyExam={(newExam) => {
                setExamData(newExam);
                showToast('Đã đẩy đề từ Sinh đề AI sang Đề chuẩn CV 7991!');
              }}
              onNavigateToExam={() => setActiveTab('exam_full')}
            />
          </div>

          {/* TAB 4: TẠO ĐỀ TƯƠNG TỰ */}
          <div className={activeTab === 'similar' ? 'block animate-fade-in' : 'hidden'}>
            <SimilarExamGenerator
              apiKey={apiKey}
              model={preferredModel}
              onApplyExam={(newExam) => {
                setExamData(newExam);
                showToast('Đã đẩy đề tương tự sang Đề chuẩn CV 7991!');
              }}
              onNavigateToExam={() => setActiveTab('exam_full')}
            />
          </div>

          {/* TAB 5: PHẢN BIỆN ĐỀ THI & MA TRẬN ĐẶC TẢ */}
          <div className={activeTab === 'critique' ? 'block animate-fade-in' : 'hidden'}>
            <ExamCritiqueTool 
              apiKey={apiKey} 
              model={preferredModel}
              currentSystemExam={examData}
              onApplyFixedExam={setExamData}
            />
          </div>

          {/* TAB: BẢNG BIẾN THIÊN TỰ ĐỘNG 300 DPI */}
          <div className={activeTab === 'bbt_tool' ? 'block animate-fade-in' : 'hidden'}>
            <TableVariationTool />
          </div>

          {/* TAB: ĐỒ THỊ HÀM SỐ OXY 300 DPI */}
          <div className={activeTab === 'function_graph' ? 'block animate-fade-in' : 'hidden'}>
            <FunctionGraphTool apiKey={apiKey} model={preferredModel} />
          </div>

          {/* TAB: HÌNH HỌC KHÔNG GIAN 3D & THƯỚC KẺ COM-PA GSP */}
          <div className={activeTab === 'geometry' ? 'block animate-fade-in' : 'hidden'}>
            <GspSketchpad />
          </div>

          {/* TAB 7: HƯỚNG DẪN SỬ DỤNG */}
          <div className={activeTab === 'guide' ? 'block animate-fade-in' : 'hidden'}>
            <UserGuide />
          </div>
        </div>

      </main>

      {/* MODAL NẠP SÁCH GIÁO KHOA TOÀN DIỆN */}
      <BookUploadModal
        isOpen={isBookUploadModalOpen}
        onClose={() => setIsBookUploadModalOpen(false)}
        onSelectLesson={handleSelectLessonFromBook}
      />

      {/* MODAL THƯ VIỆN ĐỀ THI ĐÃ LƯU */}
      {isLibraryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FolderOpen size={16} className="text-indigo-600" />
                Thư viện Đề thi đã lưu ({examLibrary.length})
              </h3>
              <button
                onClick={() => setIsLibraryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-semibold"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto space-y-2 pr-1 flex-1">
              {examLibrary.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">
                  Chưa có đề thi nào được lưu. Bấm "Lưu vào Thư viện" để lưu trữ đề hiện tại.
                </p>
              ) : (
                examLibrary.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {entry.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {entry.subject} • Lớp {entry.grade} • Lưu lúc {new Date(entry.savedAt).toLocaleString('vi-VN')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setExamData(entry.exam);
                          setIsLibraryModalOpen(false);
                          setActiveTab('exam_full');
                          showToast(`Đã nạp đề: ${entry.title}`);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition"
                      >
                        Mở đề
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm(`Xóa đề "${entry.title}" khỏi thư viện?`)) return;
                          setExamLibrary(deleteExamFromLibrary(entry.id));
                          showToast('Đã xóa đề khỏi thư viện');
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition"
                        title="Xóa đề"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CẤU HÌNH API KEY (GEMINI 3 PRO / 3 FLASH / 2.5 FLASH AUTO-FALLBACK) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Settings size={16} className="text-teal-600" />
                Cấu hình Gemini AI & Mô hình Tự Động Fallback
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <SettingsForm
              initialKey={apiKey}
              initialModel={preferredModel}
              onSave={handleSaveSettings}
              onClose={() => setShowSettingsModal(false)}
              allowClose={true}
            />
          </div>
        </div>
      )}

      {/* MODAL YÊU CẦU NHẬP API KEY KHI MỚI MỞ */}
      {showKeyRequiredModal && !showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 max-w-md w-full p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <Sparkles size={28} className="animate-pulse" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                Chào mừng Quý Thầy/Cô đến với TRỢ LÍ TẠO ĐỀ!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                Hệ thống hỗ trợ cơ chế Auto-Fallback tự động chuyển đổi thông minh giữa Gemini 3 Pro, Gemini 3 Flash và Gemini 2.5 Flash, đảm bảo luôn vận hành mượt mà.
              </p>
            </div>

            <SettingsForm
              initialKey={apiKey}
              initialModel={preferredModel}
              onSave={handleSaveSettings}
              onClose={() => {}}
              allowClose={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
