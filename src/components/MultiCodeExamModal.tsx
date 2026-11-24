import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ExamCV7991, Part1Question, Part2Question, Part3Question } from '../types/pedagogy';
import { MathRenderer } from './MathRenderer';
import { shuffleExamToMultipleCodes, ShuffledExamPackage, ShuffleOptions } from '../utils/examShuffler';
import { exportMultiCodeExamToWord } from '../utils/exportWord';
import { parseUploadedExamFileOffline, ExamParseResult } from '../utils/offlineExamFileReader';
import { 
  Shuffle, 
  Download, 
  X, 
  CheckCircle, 
  FileText, 
  Check, 
  Layers, 
  RefreshCw, 
  Printer, 
  Sliders, 
  Lock,
  Grid,
  Upload,
  FileUp,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  Save,
  ArrowRight
} from 'lucide-react';

interface MultiCodeExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: ExamCV7991;
  onSelectExamCode: (selectedExam: ExamCV7991) => void;
}

export const MultiCodeExamModal: React.FC<MultiCodeExamModalProps> = ({
  isOpen,
  onClose,
  exam,
  onSelectExamCode,
}) => {
  const [activeExam, setActiveExam] = useState<ExamCV7991>(exam);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [uploadStats, setUploadStats] = useState<ExamParseResult['stats'] | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activeTabCode, setActiveTabCode] = useState<string>('matrix');
  const [shuffleKey, setShuffleKey] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveExam(exam);
  }, [exam]);

  const [targetCodes, setTargetCodes] = useState<string[]>(['101', '102', '103', '104']);
  const [customCodesInput, setCustomCodesInput] = useState<string>('101, 102, 103, 104');
  const [showCustomCodes, setShowCustomCodes] = useState<boolean>(false);

  // Cấu hình trộn chuẩn McMIX
  const [shuffleOptions, setShuffleOptions] = useState<ShuffleOptions>({
    shuffleQuestions: true,
    shuffleOptions: true,
    lockFixedOptions: true, // Khóa phương án "Tất cả đều đúng / Cả A và B..." chuẩn McMIX
    shufflePart2SubItems: true
  });

  const printRef = useRef<HTMLDivElement>(null);

  const shuffledPackage: ShuffledExamPackage = useMemo(() => {
    return shuffleExamToMultipleCodes(activeExam, targetCodes, shuffleOptions);
  }, [activeExam, targetCodes, shuffleKey, shuffleOptions]);

  const handleProcessFile = async (file: File) => {
    try {
      setIsLoadingFile(true);
      setUploadError(null);
      const result = await parseUploadedExamFileOffline(file);
      setActiveExam(result.exam);
      setLoadedFileName(result.fileName);
      setUploadStats(result.stats);
      setShuffleKey(prev => prev + 1);

      // Chuyển ngay sang tab xem & soát đề gốc để người dùng kiểm tra câu hỏi
      setActiveTabCode('review');

      if (result.stats.part1Count === 0 && result.stats.part2Count === 0 && result.stats.part3Count === 0) {
        setUploadError('Chưa tìm thấy câu hỏi đúng định dạng trong tệp. Hãy đảm bảo đề thi có các câu hỏi bắt đầu bằng "Câu 1.", "Câu 2." hoặc có các phần PHẦN I, PHẦN II, PHẦN III.');
      }
    } catch (err: any) {
      console.error('Lỗi nạp file đề:', err);
      setUploadError('Lỗi đọc file offline: ' + (err.message || 'Không thể trích xuất nội dung'));
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  if (!isOpen) return null;

  const handleDownloadWordAll = () => {
    exportMultiCodeExamToWord({
      exams: shuffledPackage.exams,
      masterAnswerKey: shuffledPackage.masterAnswerKey
    });
  };

  const handleReShuffle = () => {
    setShuffleKey(prev => prev + 1);
  };

  // Áp dụng bộ mã đề mẫu
  const applyPresetCodes = (count: number) => {
    let codes: string[] = [];
    if (count === 4) codes = ['101', '102', '103', '104'];
    else if (count === 6) codes = ['101', '102', '103', '104', '105', '106'];
    else if (count === 8) codes = ['101', '102', '103', '104', '105', '106', '107', '108'];
    else if (count === 24) {
      codes = Array.from({ length: 24 }, (_, i) => String(101 + i));
    }
    setTargetCodes(codes);
    setCustomCodesInput(codes.join(', '));
    setShowCustomCodes(false);
  };

  const applyCustomCodes = () => {
    const raw = customCodesInput
      .split(/[,;\s]+/)
      .map(c => c.trim())
      .filter(c => c.length > 0);
    const unique = Array.from(new Set(raw));
    if (unique.length > 0) {
      setTargetCodes(unique);
      setShowCustomCodes(false);
    }
  };

  const handlePrintAnswerSheet = () => {
    window.print();
  };

  // Hàm chỉnh sửa đáp án đúng Phần I trực tiếp
  const handleUpdatePart1Answer = (qIndex: number, newAnswer: 'A' | 'B' | 'C' | 'D') => {
    const updatedP1 = [...activeExam.part1Questions];
    updatedP1[qIndex] = { ...updatedP1[qIndex], correctAnswer: newAnswer };
    setActiveExam({ ...activeExam, part1Questions: updatedP1 });
    setShuffleKey(prev => prev + 1);
  };

  // Hàm chỉnh sửa Đúng/Sai Phần II trực tiếp
  const handleTogglePart2Statement = (qIndex: number, subId: 'a' | 'b' | 'c' | 'd') => {
    const updatedP2 = [...activeExam.part2Questions];
    const targetQ = updatedP2[qIndex];
    if (targetQ) {
      const updatedStmts = targetQ.statements.map(st => 
        st.subId === subId ? { ...st, isCorrect: !st.isCorrect } : st
      );
      updatedP2[qIndex] = { ...targetQ, statements: updatedStmts };
      setActiveExam({ ...activeExam, part2Questions: updatedP2 });
      setShuffleKey(prev => prev + 1);
    }
  };

  // Hàm chỉnh sửa đáp án ngắn Phần III trực tiếp
  const handleUpdatePart3Answer = (qIndex: number, val: string) => {
    const updatedP3 = [...activeExam.part3Questions];
    updatedP3[qIndex] = { ...updatedP3[qIndex], correctAnswerShort: val };
    setActiveExam({ ...activeExam, part3Questions: updatedP3 });
    setShuffleKey(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-6xl w-full overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-xs">
              <Shuffle className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight">Trộn Đề Thi Hoán Vị (Chuẩn McMIX & CV 7991)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/30 border border-emerald-300/40 text-emerald-100">
                  {targetCodes.length} Mã Đề
                </span>
              </div>
              <p className="text-xs text-teal-100">
                Đảo ngẫu nhiên câu hỏi, hoán vị phương án, bảo toàn công thức MathType và hình vẽ 100% Offline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* THANH TẢI ĐỀ THI LÊN NGOẠI TUYẾN (.DOC, .DOCX, .PDF) */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`px-5 py-3 transition-all border-b ${
            isDragging 
              ? 'bg-blue-100 dark:bg-blue-950/70 border-blue-400 dark:border-blue-600 border-dashed border-2' 
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
          } flex flex-wrap items-center justify-between gap-3 text-xs`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              <FileUp size={16} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-slate-800 dark:text-slate-100">
                  Đề thi nguồn:
                </span>
                <span className="font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded-lg border border-teal-200 dark:border-teal-800 truncate max-w-xs">
                  {loadedFileName || activeExam.examTitle || 'Đề thi hiện tại'}
                </span>
                {uploadStats && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 size={11} />
                    {uploadStats.part1Count} câu P1, {uploadStats.part2Count} câu P2, {uploadStats.part3Count} câu P3 ({uploadStats.formatType === 'table_answers' ? 'Bảng đáp án hệ thống' : uploadStats.formatType === 'inline_answers' ? 'Mẫu rút gọn gạch chân' : 'Đề trắc nghiệm'})
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Kéo thả hoặc bấm tải lên file <strong className="text-slate-700 dark:text-slate-200 font-bold">.docx, .doc, .pdf</strong> có sẵn đáp án để hệ thống tự động bóc tách và giải mã công thức toán học
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelected}
              accept=".docx,.doc,.pdf,.txt,.md"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoadingFile}
              className="px-3.5 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Tải lên tệp .docx, .doc, .pdf để trộn đề offline"
            >
              {isLoadingFile ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
              <span>{isLoadingFile ? 'Đang đọc file...' : 'Tải Đề Lên (.doc, .docx, .pdf)'}</span>
            </button>
          </div>
        </div>

        {/* THÔNG BÁO LỖI NẾU CÓ */}
        {uploadError && (
          <div className="px-5 py-2.5 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-800 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0 text-rose-600" />
              <span>{uploadError}</span>
            </div>
            <button 
              onClick={() => setUploadError(null)}
              className="p-1 hover:bg-rose-100 rounded text-rose-500"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* CẤU HÌNH TRỘN ĐỀ KIỂU McMIX */}
        <div className="px-5 py-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Chọn số lượng mã đề */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-extrabold text-slate-700 dark:text-slate-300 mr-1">Số mã đề:</span>
            {[4, 6, 8, 24].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => applyPresetCodes(num)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                  targetCodes.length === num && !showCustomCodes
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {num} Mã
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowCustomCodes(prev => !prev)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                showCustomCodes
                  ? 'bg-teal-700 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              Tùy chỉnh mã...
            </button>
          </div>

          {/* Các tùy chọn hoán vị McMIX */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleOptions.shuffleQuestions}
                onChange={e => setShuffleOptions({ ...shuffleOptions, shuffleQuestions: e.target.checked })}
                className="rounded accent-emerald-600"
              />
              <span>Đảo câu hỏi</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleOptions.shuffleOptions}
                onChange={e => setShuffleOptions({ ...shuffleOptions, shuffleOptions: e.target.checked })}
                className="rounded accent-emerald-600"
              />
              <span>Đảo đáp án A, B, C, D</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer" title="Không đảo các phương án như 'Cả A và B', 'Tất cả đều đúng' để giữ tính chính xác">
              <input
                type="checkbox"
                checked={shuffleOptions.lockFixedOptions}
                onChange={e => setShuffleOptions({ ...shuffleOptions, lockFixedOptions: e.target.checked })}
                className="rounded accent-emerald-600"
              />
              <span className="flex items-center gap-0.5 text-emerald-800 dark:text-emerald-300 font-bold">
                <Lock size={11} /> Khóa phương án cố định
              </span>
            </label>
          </div>
        </div>

        {/* INPUT TÙY CHỈNH MÃ ĐỀ (NẾU MỞ) */}
        {showCustomCodes && (
          <div className="p-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">Danh sách mã đề (ngăn cách bởi dấu phẩy):</span>
            <input
              type="text"
              value={customCodesInput}
              onChange={e => setCustomCodesInput(e.target.value)}
              placeholder="Ví dụ: 101, 102, 103, 104, 201, 202"
              className="flex-1 px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 font-mono font-bold text-slate-800 dark:text-slate-200 outline-none"
            />
            <button
              onClick={applyCustomCodes}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
            >
              Áp dụng
            </button>
          </div>
        )}

        {/* CONTROLS BAR: TABS & ACTION BUTTONS */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* TAB SELECTION */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
            {/* TAB XEM & SOÁT ĐỀ GỐC */}
            <button
              onClick={() => setActiveTabCode('review')}
              className={`px-3 py-1.5 rounded-lg font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                activeTabCode === 'review' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-blue-700 dark:text-blue-300 hover:bg-white/50 dark:hover:bg-slate-700'
              }`}
            >
              <Eye size={13} />
              <span>👁️ Đề Gốc Đã Tải Lên (Xem & Soát Câu Hỏi)</span>
            </button>

            <button
              onClick={() => setActiveTabCode('matrix')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTabCode === 'matrix' ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-200 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              📊 Bảng Đáp Án Soi Đề
            </button>
            <button
              onClick={() => setActiveTabCode('bubble_sheet')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTabCode === 'bubble_sheet' ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-200 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              📝 Phiếu Tô Trắc Nghiệm
            </button>
            {targetCodes.slice(0, 8).map(code => (
              <button
                key={code}
                onClick={() => setActiveTabCode(code)}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  activeTabCode === code ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-200 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Mã {code}
              </button>
            ))}
            {targetCodes.length > 8 && (
              <span className="text-[11px] font-bold text-slate-400 px-2">+{targetCodes.length - 8} mã khác</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReShuffle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
              title="Xáo trộn lại toàn bộ các mã đề"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Trộn lại</span>
            </button>

            <button
              onClick={handleDownloadWordAll}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold transition shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải Word Trọn Gói {targetCodes.length} Mã Đề</span>
            </button>
          </div>
        </div>

        {/* CONTENT BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300 flex-1">
          {activeTabCode === 'review' ? (
            /* TAB: XEM & SOÁT ĐỀ GỐC ĐÃ TẢI LÊN */
            <div className="space-y-6">
              {/* THANH THỐNG KÊ VÀ HÀNH ĐỘNG CỦA ĐỀ GỐC */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 p-4 rounded-2xl border border-blue-200 dark:border-blue-800">
                <div>
                  <h4 className="font-extrabold text-blue-950 dark:text-blue-100 text-sm flex items-center gap-2">
                    <Eye size={16} className="text-blue-600" />
                    <span>Xem & Soát Câu Hỏi Đề Gốc Đã Nhận Diện</span>
                  </h4>
                  <p className="text-xs text-blue-800 dark:text-blue-300 mt-0.5">
                    Toàn bộ công thức toán học MathType/LaTeX và hình vẽ/bảng biến thiên đã được trích xuất. Bạn có thể kiểm tra hoặc điều chỉnh đáp án đúng trước khi xuất mã đề hoán vị.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onSelectExamCode(activeExam);
                      onClose();
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Áp dụng đề này ra màn hình chính</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* PHẦN I: TRẮC NGHIỆM NHIỀU LỰA CHỌN */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h5 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide text-blue-700 dark:text-blue-400">
                      PHẦN I: Câu trắc nghiệm nhiều phương án ({activeExam.part1Questions.length} câu)
                    </h5>
                    <p className="text-[11px] text-slate-500">Mỗi câu hỏi thí sinh chọn 1 phương án đúng</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                    {activeExam.part1Questions.length} câu hỏi
                  </span>
                </div>

                {activeExam.part1Questions.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-4">Chưa có câu hỏi Phần I</p>
                ) : (
                  <div className="space-y-4">
                    {activeExam.part1Questions.map((q, qIdx) => (
                      <div 
                        key={q.id || qIdx}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 space-y-3"
                      >
                        {/* HEADER CÂU HỎI */}
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-900 dark:text-slate-100 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2.5 py-1 rounded-lg text-xs">
                            Câu {q.number || (qIdx + 1)}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-500">Đáp án đúng đã nhận diện:</span>
                            <div className="flex items-center gap-1">
                              {(['A', 'B', 'C', 'D'] as const).map(letter => (
                                <button
                                  key={letter}
                                  type="button"
                                  onClick={() => handleUpdatePart1Answer(qIdx, letter)}
                                  className={`w-6 h-6 rounded-lg text-xs font-black transition cursor-pointer ${
                                    q.correctAnswer === letter
                                      ? 'bg-emerald-600 text-white shadow-xs scale-105'
                                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-100'
                                  }`}
                                  title={`Bấm để đặt đáp án đúng là ${letter}`}
                                >
                                  {letter}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* NỘI DUNG THÂN CÂU HỎI (STEM) */}
                        <div className="text-slate-900 dark:text-slate-100 text-xs font-medium pl-1">
                          <MathRenderer content={q.content} block />
                        </div>

                        {/* CÁC PHƯƠNG ÁN A, B, C, D */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {(['A', 'B', 'C', 'D'] as const).map(key => {
                            const isCorrect = q.correctAnswer === key;
                            return (
                              <div
                                key={key}
                                onClick={() => handleUpdatePart1Answer(qIdx, key)}
                                className={`p-2.5 rounded-xl border transition cursor-pointer flex items-start gap-2 ${
                                  isCorrect
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-700 shadow-2xs'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                }`}
                              >
                                <span className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-xs shrink-0 ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}>
                                  {key}
                                </span>
                                <div className="flex-1 text-xs text-slate-800 dark:text-slate-200">
                                  <MathRenderer content={q.options[key] || '(Trống)'} inline />
                                </div>
                                {isCorrect && (
                                  <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900 px-1.5 py-0.5 rounded">
                                    Đúng
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PHẦN II: TRẮC NGHIỆM ĐÚNG SAI */}
              {activeExam.part2Questions.length > 0 && (
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h5 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide text-teal-700 dark:text-teal-400">
                        PHẦN II: Câu hỏi trắc nghiệm Đúng - Sai ({activeExam.part2Questions.length} câu)
                      </h5>
                      <p className="text-[11px] text-slate-500">Mỗi câu có 4 lệnh hỏi a, b, c, d với lựa chọn Đúng hoặc Sai</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {activeExam.part2Questions.map((q, qIdx) => (
                      <div 
                        key={q.id || qIdx}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-900 dark:text-slate-100 bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 px-2.5 py-1 rounded-lg text-xs">
                            Câu {q.number || (qIdx + 1)}
                          </span>
                        </div>

                        {/* NỘI DUNG DẪN CÂU HỎI */}
                        <div className="text-slate-900 dark:text-slate-100 text-xs font-medium pl-1">
                          <MathRenderer content={q.leadIn} block />
                        </div>

                        {/* DANH SÁCH 4 MỆNH ĐỀ A, B, C, D */}
                        <div className="space-y-2 pt-1">
                          {q.statements.map(st => (
                            <div 
                              key={st.subId}
                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                                st.isCorrect 
                                  ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' 
                                  : 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <span className="font-black text-xs text-slate-700 dark:text-slate-200 w-6">
                                  {st.subId})
                                </span>
                                <div className="text-xs text-slate-800 dark:text-slate-200 flex-1">
                                  <MathRenderer content={st.content} inline />
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleTogglePart2Statement(qIdx, st.subId)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                                  st.isCorrect
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-rose-600 text-white shadow-2xs'
                                }`}
                                title="Bấm để chuyển đổi Đúng / Sai"
                              >
                                {st.isCorrect ? '✓ ĐÚNG' : '✗ SAI'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PHẦN III: TRẮC NGHIỆM TRẢ LỜI NGẮN */}
              {activeExam.part3Questions.length > 0 && (
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h5 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide text-purple-700 dark:text-purple-400">
                        PHẦN III: Câu hỏi trắc nghiệm trả lời ngắn ({activeExam.part3Questions.length} câu)
                      </h5>
                      <p className="text-[11px] text-slate-500">Thí sinh tự điền đáp số ngắn (số nguyên, phân số, số thập phân)</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {activeExam.part3Questions.map((q, qIdx) => (
                      <div 
                        key={q.id || qIdx}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-900 dark:text-slate-100 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 px-2.5 py-1 rounded-lg text-xs">
                            Câu {q.number || (qIdx + 1)}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-500">Đáp số:</span>
                            <input
                              type="text"
                              value={q.correctAnswerShort || ''}
                              onChange={e => handleUpdatePart3Answer(qIdx, e.target.value)}
                              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-lg font-mono font-bold text-xs text-purple-700 dark:text-purple-300 w-28 text-center outline-none focus:ring-1 focus:ring-purple-500"
                              placeholder="Nhập đáp số..."
                            />
                          </div>
                        </div>

                        <div className="text-slate-900 dark:text-slate-100 text-xs font-medium pl-1">
                          <MathRenderer content={q.content} block />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : activeTabCode === 'matrix' ? (
            /* TAB: BẢNG ĐÁP ÁN SOI ĐỀ TỔNG HỢP (MASTER KEY) */
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b pb-2">
                  <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                    1. Phần I: Bảng đáp án trắc nghiệm nhiều phương án ({shuffledPackage.masterAnswerKey.part1.length} câu)
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">Bảng ma trận đối chiếu chấm thi nhanh</span>
                </div>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                        <th className="p-2.5 text-center w-20">Câu</th>
                        {targetCodes.map(c => (
                          <th key={c} className="p-2.5 text-center text-emerald-700 dark:text-emerald-400">Mã {c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {shuffledPackage.masterAnswerKey.part1.map(row => (
                        <tr key={row.questionNumber} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="p-2 text-center font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30">
                            Câu {row.questionNumber}
                          </td>
                          {targetCodes.map(c => (
                            <td key={c} className="p-2 text-center font-black text-blue-700 dark:text-blue-400">
                              {row.answers[c]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {shuffledPackage.masterAnswerKey.part2.length > 0 && (
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                  <div className="flex items-center justify-between mb-3 border-b pb-2">
                    <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                      2. Phần II: Bảng đáp án Đúng - Sai ({exam.part2Questions.length} câu x 4 ý a,b,c,d)
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">Đ/S theo bậc thang điểm Công văn 7991</span>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                          <th className="p-2.5 text-center w-20">Câu</th>
                          <th className="p-2.5 text-center w-16">Ý</th>
                          {targetCodes.map(c => (
                            <th key={c} className="p-2.5 text-center text-emerald-700 dark:text-emerald-400">Mã {c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {shuffledPackage.masterAnswerKey.part2.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                            <td className="p-2 text-center font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30">
                              Câu {row.questionNumber}
                            </td>
                            <td className="p-2 text-center font-bold text-slate-700 dark:text-slate-300">
                              {row.subStatement})
                            </td>
                            {targetCodes.map(c => (
                              <td
                                key={c}
                                className={`p-2 text-center font-black ${
                                  row.answers[c] === 'Đ' ? 'text-emerald-600 bg-emerald-50/30' : 'text-rose-600 bg-rose-50/30'
                                }`}
                              >
                                {row.answers[c]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {shuffledPackage.masterAnswerKey.part3.length > 0 && (
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                  <div className="flex items-center justify-between mb-3 border-b pb-2">
                    <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                      3. Phần III: Bảng đáp án câu hỏi trả lời ngắn ({shuffledPackage.masterAnswerKey.part3.length} câu)
                    </h4>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                          <th className="p-2.5 text-center w-20">Câu</th>
                          {targetCodes.map(c => (
                            <th key={c} className="p-2.5 text-center text-emerald-700 dark:text-emerald-400">Mã {c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {shuffledPackage.masterAnswerKey.part3.map(row => (
                          <tr key={row.questionNumber} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                            <td className="p-2 text-center font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30">
                              Câu {row.questionNumber}
                            </td>
                            {targetCodes.map(c => (
                              <td key={c} className="p-2 text-center font-mono font-bold text-purple-700 dark:text-purple-400">
                                {row.answers[c]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : activeTabCode === 'bubble_sheet' ? (
            /* TAB: PHIẾU TRẢ LỜI TRẮC NGHIỆM TÔ TRÒN CHUẨN THI BỘ GD&ĐT */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-teal-50 dark:bg-teal-950/40 p-3 rounded-xl border border-teal-200 dark:border-teal-800">
                <span className="font-bold text-xs text-teal-900 dark:text-teal-200">
                  Mẫu Phiếu trả lời trắc nghiệm chuẩn Bộ GD&ĐT (Sẵn sàng in ấn phát cho thí sinh)
                </span>
                <button
                  type="button"
                  onClick={handlePrintAnswerSheet}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Printer size={13} /> In Phiếu A4
                </button>
              </div>

              {/* KHUNG MẪU PHIẾU IN */}
              <div ref={printRef} className="bg-white p-6 rounded-2xl border border-slate-300 max-w-2xl mx-auto text-slate-900 shadow-sm print:m-0 print:border-none print:shadow-none space-y-4">
                <div className="text-center border-b pb-3 space-y-1">
                  <h3 className="font-extrabold uppercase text-sm tracking-wider">BỘ GIÁO DỤC VÀ ĐÀO TẠO</h3>
                  <h2 className="font-black uppercase text-base text-teal-900">PHIẾU TRẢ LỜI TRẮC NGHIỆM</h2>
                  <p className="text-[11px] italic text-slate-600">Kỳ thi Đánh giá định kỳ - Môn: {exam.subject}</p>
                </div>

                {/* KHUNG THÔNG TIN THÍ SINH */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border rounded-xl text-xs">
                  <div className="space-y-1.5">
                    <div>Họ và tên thí sinh: .....................................................</div>
                    <div>Ngày sinh: ...../...../......... Lớp: ..................................</div>
                    <div>Phòng thi số: .............. Số báo danh: .....................</div>
                  </div>
                  <div className="border-l pl-3 space-y-1.5">
                    <div>Chữ ký giám thị 1: ................................................</div>
                    <div>Chữ ký giám thị 2: ................................................</div>
                    <div className="font-bold text-teal-800">MÃ ĐỀ THI: [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</div>
                  </div>
                </div>

                {/* VÙNG TÔ ĐÁP ÁN PHẦN I */}
                <div className="space-y-2">
                  <div className="font-extrabold text-xs uppercase bg-slate-100 p-1.5 rounded-lg">
                    PHẦN I: Trắc nghiệm 4 lựa chọn (Thí sinh tô đen 1 ô tròn tương ứng)
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-[11px]">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                      <div key={num} className="flex items-center gap-1 p-1 bg-slate-50 rounded border">
                        <span className="font-bold w-5">{num}.</span>
                        {['A', 'B', 'C', 'D'].map(letter => (
                          <span key={letter} className="w-5 h-5 rounded-full border border-slate-400 flex items-center justify-center font-bold text-[10px]">
                            {letter}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* VÙNG TÔ ĐÁP ÁN PHẦN II (ĐÚNG/SAI) */}
                <div className="space-y-2">
                  <div className="font-extrabold text-xs uppercase bg-slate-100 p-1.5 rounded-lg">
                    PHẦN II: Trắc nghiệm Đúng / Sai (Thí sinh tô ô Đ hoặc S)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {Array.from({ length: 4 }, (_, i) => i + 1).map(qNum => (
                      <div key={qNum} className="p-1.5 bg-slate-50 rounded border space-y-1">
                        <span className="font-bold">Câu {qNum}:</span>
                        <div className="flex gap-2">
                          {['a', 'b', 'c', 'd'].map(letter => (
                            <div key={letter} className="flex items-center gap-0.5">
                              <span>{letter})</span>
                              <span className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center text-[9px] font-bold">Đ</span>
                              <span className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center text-[9px] font-bold">S</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* VÙNG ĐIỀN ĐÁP ÁN PHẦN III */}
                <div className="space-y-2">
                  <div className="font-extrabold text-xs uppercase bg-slate-100 p-1.5 rounded-lg">
                    PHẦN III: Câu hỏi trả lời ngắn (Điền kết quả số vào ô)
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px]">
                    {Array.from({ length: 6 }, (_, i) => i + 1).map(num => (
                      <div key={num} className="p-1.5 bg-slate-50 rounded border text-center space-y-1">
                        <span className="font-bold">Câu {num}</span>
                        <div className="h-6 border border-dashed border-slate-400 rounded bg-white"></div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* TAB: XEM CHI TIẾT MÃ ĐỀ ĐƯỢC CHỌN (MÃ 101, 102...) */
            (() => {
              const currentExam = shuffledPackage.exams.find(e => e.code === activeTabCode);
              if (!currentExam) return null;
              return (
                <div className="space-y-5">
                  <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                    <div>
                      <span className="font-bold text-emerald-900 dark:text-emerald-200 text-sm block">Đang xem: Mã đề {currentExam.code}</span>
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-300">Đã đảo ngẫu nhiên câu hỏi và phương án A, B, C, D</span>
                    </div>
                    <button
                      onClick={() => {
                        onSelectExamCode(currentExam);
                        onClose();
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-sm text-xs cursor-pointer"
                    >
                      Áp dụng mã {currentExam.code} ra màn hình chính
                    </button>
                  </div>

                  {/* PHẦN I CỦA MÃ TRỘN */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 bg-white dark:bg-slate-900">
                    <h5 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-xs border-b pb-2 text-blue-700 dark:text-blue-400">
                      Phần I: Câu hỏi trắc nghiệm nhiều lựa chọn ({currentExam.part1Questions.length} câu)
                    </h5>
                    {currentExam.part1Questions.map(q => (
                      <div key={q.id} className="text-xs space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          <span className="font-bold text-blue-700 mr-1.5">Câu {q.number}.</span>
                          <MathRenderer content={q.content} block />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {(['A', 'B', 'C', 'D'] as const).map(letter => {
                            const isCorrect = q.correctAnswer === letter;
                            return (
                              <div 
                                key={letter}
                                className={`p-2 rounded-lg border text-xs flex items-start gap-1.5 ${
                                  isCorrect 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 font-bold text-emerald-800 dark:text-emerald-300' 
                                    : 'bg-white dark:bg-slate-900 border-slate-200 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span className="font-bold">{letter}.</span>
                                <MathRenderer content={q.options[letter]} inline />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* PHẦN II CỦA MÃ TRỘN */}
                  {currentExam.part2Questions.length > 0 && (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 bg-white dark:bg-slate-900">
                      <h5 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-xs border-b pb-2 text-teal-700 dark:text-teal-400">
                        Phần II: Câu hỏi trắc nghiệm Đúng - Sai ({currentExam.part2Questions.length} câu)
                      </h5>
                      {currentExam.part2Questions.map(q => (
                        <div key={q.id} className="text-xs space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            <span className="font-bold text-teal-700 mr-1.5">Câu {q.number}.</span>
                            <MathRenderer content={q.leadIn} block />
                          </div>
                          <div className="space-y-1.5 mt-2">
                            {q.statements.map(st => (
                              <div key={st.subId} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold">{st.subId})</span>
                                  <MathRenderer content={st.content} inline />
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  st.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {st.isCorrect ? 'ĐÚNG' : 'SAI'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* PHẦN III CỦA MÃ TRỘN */}
                  {currentExam.part3Questions.length > 0 && (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 bg-white dark:bg-slate-900">
                      <h5 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-xs border-b pb-2 text-purple-700 dark:text-purple-400">
                        Phần III: Câu hỏi trắc nghiệm trả lời ngắn ({currentExam.part3Questions.length} câu)
                      </h5>
                      {currentExam.part3Questions.map(q => (
                        <div key={q.id} className="text-xs space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-purple-700">Câu {q.number}</span>
                            <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 font-mono font-bold text-purple-800 dark:text-purple-300">
                              Đáp án: {q.correctAnswerShort}
                            </span>
                          </div>
                          <MathRenderer content={q.content} block />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 font-medium">
            * Thuật toán hoán vị Fisher-Yates có kiểm soát, khóa phương án cố định thông minh chuẩn McMIX.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-semibold text-slate-800 dark:text-slate-200 transition cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};

export default MultiCodeExamModal;
