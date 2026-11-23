import React, { useState } from 'react';
import { ExamCV7991, Part2Question, Part1Question, Part3Question, Part4EssayQuestion } from '../types/pedagogy';
import { exportExamToWord, exportMatrixSpecToWord } from '../utils/exportWord';
import { MultiCodeExamModal } from './MultiCodeExamModal';
import { StudentExamModal } from './StudentExamModal';
import { ExportToOnlineExamModal } from './ExportToOnlineExamModal';
import { MathRenderer } from './MathRenderer';
import { 
  CheckSquare, 
  Download, 
  Printer, 
  Award, 
  FileSpreadsheet, 
  Info, 
  CheckCircle2, 
  XCircle, 
  FileCheck,
  Shuffle,
  Lock,
  Sliders,
  HelpCircle,
  Eye,
  EyeOff,
  PlayCircle,
  Globe,
  QrCode
} from 'lucide-react';

interface ExamCV7991ViewProps {
  exam: ExamCV7991;
  onUpdateExam: (updated: ExamCV7991) => void;
  onNavigateToMatrix?: () => void;
}

export const ExamCV7991View: React.FC<ExamCV7991ViewProps> = ({
  exam,
  onUpdateExam,
  onNavigateToMatrix
}) => {
  // Ratio state: 40% Know, 30% Understand, 30% Apply
  const [knowRatio, setKnowRatio] = useState<number>(40);
  const [understandRatio, setUnderstandRatio] = useState<number>(30);
  const applyRatio = 100 - knowRatio - understandRatio; // Khóa chặt tổng 100% / 10.0 điểm!

  // Toggle answers
  const [showAnswerKeys, setShowAnswerKeys] = useState<boolean>(false);
  const [isMultiCodeModalOpen, setIsMultiCodeModalOpen] = useState<boolean>(false);
  const [isStudentExamModalOpen, setIsStudentExamModalOpen] = useState<boolean>(false);
  const [isExportOnlineModalOpen, setIsExportOnlineModalOpen] = useState<boolean>(false);
  const [onlineExamData, setOnlineExamData] = useState<{
    examId: string;
    title: string;
    questionsCount: number;
    duration: number;
    examOnlineUrl: string;
    tunnelUrl?: string;
  } | null>(null);
  const [isExportingOnline, setIsExportingOnline] = useState<boolean>(false);
  const [studentPart3Answers, setStudentPart3Answers] = useState<Record<string, string>>({});
  const [studentPart2Answers, setStudentPart2Answers] = useState<Record<string, Record<string, boolean | null>>>({});

  // Question counts
  const countPart1 = exam.part1Questions.length;
  const countPart2 = exam.part2Questions.length;
  const countPart3 = exam.part3Questions.length;
  const countPart4 = exam.part4Questions.length;

  const handleExportToKiemTraOnline = async () => {
    setIsExportingOnline(true);
    try {
      const res = await fetch('/api/export-to-kiem-tra-online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam, duration: 90 })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOnlineExamData(data);
        setIsExportOnlineModalOpen(true);
      } else {
        alert(data.error || 'Có lỗi khi xuất đề sang KIEM_TRA_ONLINE');
      }
    } catch (err: any) {
      alert('Không thể kết nối đến máy chủ: ' + err.message);
    } finally {
      setIsExportingOnline(false);
    }
  };

  const handleRatioChange = (type: 'know' | 'understand', val: number) => {
    if (type === 'know') {
      const newKnow = Math.min(60, Math.max(20, val));
      const remaining = 100 - newKnow;
      const newUnderstand = Math.min(Math.floor(remaining * 0.5), understandRatio);
      setKnowRatio(newKnow);
      setUnderstandRatio(newUnderstand);
    } else {
      const newUnder = Math.min(50, Math.max(10, val));
      if (knowRatio + newUnder <= 90) {
        setUnderstandRatio(newUnder);
      }
    }
  };

  const handleTogglePart2 = (qId: string, subId: string, val: boolean) => {
    setStudentPart2Answers(prev => ({
      ...prev,
      [qId]: {
        ...(prev[qId] || {}),
        [subId]: prev[qId]?.[subId] === val ? null : val
      }
    }));
  };

  const handleShuffleCode = () => {
    const codes = ['101', '102', '103', '104', '201', '202'];
    const nextCode = codes[(codes.indexOf(exam.code) + 1) % codes.length];
    onUpdateExam({ ...exam, code: nextCode });
  };

  return (
    <div className="space-y-6">
      {/* HEADER CONTROL BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Scope 2
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Đề Kiểm Tra Chuẩn Công Văn 7991/BGDĐT-GDTrH
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Đúng cấu trúc 4 phần độc lập • Barem bậc thang Đúng/Sai 4 lệnh • Tổng điểm khóa chặt 10.0đ.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* NÚT LÀM THỬ & DUYỆT ĐỀ (GIÁO VIÊN) */}
          <button
            onClick={() => setIsStudentExamModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 shadow-sm transition active:scale-95"
            title="Mở phòng thi thử nội bộ để giáo viên duyệt đề, kiểm tra đáp án và giải thử"
          >
            <Eye className="w-4 h-4 text-indigo-600" />
            <span>Làm Thử & Duyệt Đề (Giáo Viên)</span>
          </button>

          {/* NÚT GIAO THI ONLINE TOÀN LỚP (MÃ QR & LINK INTERNET) */}
          <button
            onClick={handleExportToKiemTraOnline}
            disabled={isExportingOnline}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition active:scale-95 disabled:opacity-50"
            title="1-Click xuất đề sang hệ thống KIEM_TRA_ONLINE, tạo mã QR và link làm bài trên điện thoại/máy tính cho học sinh"
          >
            <Globe className="w-4 h-4 text-emerald-300" />
            <span>{isExportingOnline ? 'Đang tạo QR thi...' : 'Giao Thi Online Toàn Lớp (Mã QR)'}</span>
          </button>

          {/* NÚT TRỘN ĐỀ 4 MÃ ĐỀ & BẢNG ĐÁP ÁN */}
          <button
            onClick={() => setIsMultiCodeModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs shadow-md transition active:scale-95"
            title="Tự động đảo câu hỏi và đáp án ra 4 mã đề (101, 102, 103, 104) kèm Bảng ma trận soi đề"
          >
            <Shuffle className="w-4 h-4 text-emerald-200" />
            <span>Trộn Đề (4 Mã Đề)</span>
          </button>

          <button
            onClick={() => setShowAnswerKeys(!showAnswerKeys)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition border ${
              showAnswerKeys ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-300 text-slate-700'
            }`}
          >
            {showAnswerKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showAnswerKeys ? 'Ẩn đáp án' : 'Xem key đáp án'}</span>
          </button>

          {/* NÚT XEM MA TRẬN */}
          {onNavigateToMatrix && (
            <button
              onClick={onNavigateToMatrix}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm transition"
              title="Chuyển sang Ma trận và Bản đặc tả đề thi chuẩn 10.0đ"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Ma Trận & Đặc Tả</span>
            </button>
          )}

          {/* NÚT TẢI FILE WORD CHUẨN BỘ GD&ĐT */}
          <button
            onClick={() => exportExamToWord(exam)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition"
            title="Tải đề kiểm tra và barem điểm đầy đủ"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải file Word</span>
          </button>

          {/* NÚT TẢI MA TRẬN ĐẶC TẢ */}
          <button
            onClick={() => exportMatrixSpecToWord(exam)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition"
            title="Tải phụ lục 1 (Ma trận) và phụ lục 2 (Bản đặc tả)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ma Trận Đặc Tả</span>
          </button>
        </div>
      </div>

      {/* SCOPE 2 MAIN WORKSPACE: BÊN TRÁI THIẾT LẬP MA TRẬN & BÊN PHẢI LIVE DOCUMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* BÊN TRÁI (4 COLS): BẢNG THIẾT LẬP MA TRẬN ĐỀ */}
        <div className="lg:col-span-4 space-y-4 no-print">
          
          {/* CARD TỈ LỆ 40-30-30 VÀ KHÓA CHẶT 10.0Đ */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-600" />
                Ma trận tỉ lệ nhận thức
              </span>
              <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                <Lock className="w-3 h-3 text-emerald-700" />
                10.0 / 10.0 ĐIỂM
              </span>
            </div>

            {/* SLIDERS TỈ LỆ */}
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-blue-700">1. Nhận biết (chuẩn 40%):</span>
                  <span className="font-bold font-mono text-slate-800">{knowRatio}% ({(knowRatio / 10).toFixed(1)}đ)</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="60"
                  step="5"
                  value={knowRatio}
                  onChange={(e) => handleRatioChange('know', Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-amber-700">2. Thông hiểu (chuẩn 30%):</span>
                  <span className="font-bold font-mono text-slate-800">{understandRatio}% ({(understandRatio / 10).toFixed(1)}đ)</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="45"
                  step="5"
                  value={understandRatio}
                  onChange={(e) => handleRatioChange('understand', Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-emerald-700">3. Vận dụng (tự khóa 30%):</span>
                  <span className="font-bold font-mono text-slate-800">{applyRatio}% ({(applyRatio / 10).toFixed(1)}đ)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${applyRatio}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 leading-relaxed">
              <strong>Khóa chặt 10.0 điểm: </strong>
              Tổng ba mức độ luôn đạt chính xác {knowRatio + understandRatio + applyRatio}% tương ứng 10.0 điểm barem kiểm tra theo đúng quy chế Bộ GD&ĐT.
            </div>
          </div>

          {/* CARD BỘ ĐẾM SỐ LƯỢNG CÂU HỎI TỪNG PHẦN */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block pb-1 border-b border-slate-100">
              Bộ đếm số lượng câu hỏi 4 phần
            </span>

            <div className="space-y-2 text-xs">
              {/* PHẦN I */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block">Phần I: TN nhiều lựa chọn</span>
                  <span className="text-[11px] text-slate-500">Mỗi câu 0.25đ • Chọn 1 trong 4</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-blue-700 text-sm">{countPart1} câu</span>
                  <span className="block text-[11px] text-slate-500 font-mono">3.0 điểm</span>
                </div>
              </div>

              {/* PHẦN II */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 border border-amber-200">
                <div>
                  <span className="font-bold text-amber-950 block">Phần II: TN Đúng / Sai</span>
                  <span className="text-[11px] text-amber-800">Mỗi câu 4 lệnh a-b-c-d • 1.0đ/câu</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-amber-900 text-sm">{countPart2} câu</span>
                  <span className="block text-[11px] text-amber-800 font-mono">2.0 điểm</span>
                </div>
              </div>

              {/* PHẦN III */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block">Phần III: TN trả lời ngắn</span>
                  <span className="text-[11px] text-slate-500">Mỗi câu 0.50đ • Điền đáp số</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-blue-700 text-sm">{countPart3} câu</span>
                  <span className="block text-[11px] text-slate-500 font-mono">2.0 điểm</span>
                </div>
              </div>

              {/* PHẦN IV */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <div>
                  <span className="font-bold text-emerald-950 block">Phần IV: Tự luận</span>
                  <span className="text-[11px] text-emerald-800">Kèm rubric chấm từng bước</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-emerald-900 text-sm">{countPart4} câu</span>
                  <span className="block text-[11px] text-emerald-800 font-mono">3.0 điểm</span>
                </div>
              </div>
            </div>

            {/* BAREM BẬC THANG BỘ GD&ĐT GHI NHỚ */}
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 block">Barem bậc thang Phần II:</span>
              <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                <span className="p-1 rounded bg-slate-100 text-center">1 ý = 0.10đ</span>
                <span className="p-1 rounded bg-slate-100 text-center">2 ý = 0.25đ</span>
                <span className="p-1 rounded bg-slate-100 text-center">3 ý = 0.50đ</span>
                <span className="p-1 rounded bg-slate-100 text-center font-bold text-emerald-800">4 ý = 1.00đ</span>
              </div>
            </div>
          </div>

        </div>

        {/* BÊN PHẢI (8 COLS): LIVE DOCUMENT HIỂN THỊ ĐÚNG 4 PHẦN */}
        <div className="lg:col-span-8 bg-white border border-slate-200 shadow-md rounded-2xl p-6 md:p-10 text-slate-900 leading-relaxed">
          
          {/* HEADER ĐỀ THI TRÊN LIVE DOCUMENT */}
          <div className="grid grid-cols-2 text-center text-xs pb-4 border-b border-slate-200 mb-6">
            <div className="space-y-0.5">
              <p className="uppercase font-semibold text-slate-600">BỘ GIÁO DỤC VÀ ĐÀO TẠO</p>
              <p className="uppercase font-bold text-slate-900 text-xs">TRƯỜNG THPT CHUYÊN THỰC HÀNH</p>
              <p className="text-slate-400 font-mono text-[10px]">(Đề kiểm tra định kì chuẩn 4 phần CV 7991)</p>
            </div>
            <div className="space-y-0.5">
              <p className="uppercase font-bold text-slate-900 text-xs">{exam.examTitle}</p>
              <p className="text-slate-700">Môn: <strong>{exam.subject} ({exam.grade})</strong></p>
              <p className="italic text-slate-500 text-[11px]">Thời gian làm bài: {exam.durationMinutes} phút</p>
              <p className="font-bold text-blue-700 font-mono text-xs">MÃ ĐỀ THI: {exam.code}</p>
            </div>
          </div>

          <div className="space-y-8">
            
            {/* PHẦN I: TRẮC NGHIỆM 4 LỰA CHỌN (3.0Đ) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between bg-blue-50/80 border border-blue-200 p-2.5 rounded-xl">
                <div>
                  <h3 className="font-bold text-xs uppercase text-blue-950 tracking-wide">
                    PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (3,0 điểm)
                  </h3>
                  <p className="text-[11px] text-blue-800 italic">
                    Thí sinh trả lời từ câu 1 đến câu {exam.part1Questions.length}. Mỗi câu hỏi chọn 1 phương án duy nhất.
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-blue-800 bg-white px-2.5 py-1 rounded-lg border border-blue-200">
                  3.0 đ
                </span>
              </div>

              <div className="space-y-4">
                {exam.part1Questions.map((q) => (
                  <div key={q.id} className="text-xs border-b border-slate-100 pb-3 space-y-2">
                    <p className="font-semibold text-slate-900 leading-relaxed">
                      <span>Câu {q.number}.</span> <MathRenderer content={q.content} />
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-700 pl-2">
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                        const isCorrect = q.correctAnswer === opt;
                        return (
                          <div
                            key={opt}
                            className={`p-2 rounded-lg border text-xs transition leading-relaxed ${
                              showAnswerKeys && isCorrect
                                ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-900'
                                : 'bg-slate-50/70 border-slate-200 text-slate-800'
                            }`}
                          >
                            <strong className="mr-1">{opt}.</strong> <MathRenderer content={q.options[opt]} />
                          </div>
                        );
                      })}
                    </div>
                    {showAnswerKeys && (
                      <div className="text-[11px] text-emerald-700 italic pt-1 pl-2">
                        ✓ Đáp án: <strong>{q.correctAnswer}</strong> • <MathRenderer content={q.explanation} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* PHẦN II: TRẮC NGHIỆM ĐÚNG/SAI 4 LỆNH A-B-C-D (2.0Đ) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                <div>
                  <h3 className="font-bold text-xs uppercase text-amber-950 tracking-wide">
                    PHẦN II. Câu trắc nghiệm Đúng / Sai (2,0 điểm)
                  </h3>
                  <p className="text-[11px] text-amber-800 italic">
                    Thí sinh trả lời từ câu 1 đến câu {exam.part2Questions.length}. Mỗi câu gồm 4 lệnh a, b, c, d độc lập.
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-amber-900 bg-white px-2.5 py-1 rounded-lg border border-amber-300">
                  2.0 đ
                </span>
              </div>

              <div className="space-y-6">
                {exam.part2Questions.map((q) => (
                  <div key={q.id} className="border border-slate-300 rounded-2xl p-4 bg-slate-50/40 text-xs space-y-3">
                    <p className="font-semibold text-slate-900 leading-relaxed">
                      <strong>Câu {q.number}.</strong> <MathRenderer content={q.leadIn} />
                    </p>

                    <div className="space-y-2">
                      {q.statements.map((stmt) => {
                        const userChoice = studentPart2Answers[q.id]?.[stmt.subId];
                        return (
                          <div
                            key={stmt.subId}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-2"
                          >
                            <div className="flex-1 min-w-[200px] leading-relaxed">
                              <span className="font-bold text-blue-900 mr-1.5">{stmt.subId})</span>
                              <span className="text-slate-800"><MathRenderer content={stmt.content} /></span>
                            </div>

                            {/* BADGES CHỌN ĐÚNG / SAI TRỰC QUAN */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleTogglePart2(q.id, stmt.subId, true)}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition ${
                                  userChoice === true
                                    ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>ĐÚNG</span>
                              </button>

                              <button
                                onClick={() => handleTogglePart2(q.id, stmt.subId, false)}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition ${
                                  userChoice === false
                                    ? 'bg-red-600 text-white shadow-sm ring-1 ring-red-500'
                                    : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'
                                }`}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>SAI</span>
                              </button>

                              {showAnswerKeys && (
                                <span className={`ml-2 text-[11px] font-bold px-2 py-0.5 rounded font-mono ${
                                  stmt.isCorrect ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
                                }`}>
                                  Chuẩn: {stmt.isCorrect ? 'Đ' : 'S'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {showAnswerKeys && (
                      <div className="mt-2 p-2.5 bg-blue-50/60 rounded-xl text-[11px] text-blue-900 space-y-1">
                        <strong>Giải thích mệnh đề chi tiết:</strong>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                          {q.statements.map(s => (
                            <li key={s.subId}>
                              <strong>{s.subId})</strong> ({s.isCorrect ? 'ĐÚNG' : 'SAI'}): <MathRenderer content={s.explanation} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* PHẦN III: TRẢ LỜI NGẮN (2.0Đ) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between bg-slate-100 border border-slate-200 p-2.5 rounded-xl">
                <div>
                  <h3 className="font-bold text-xs uppercase text-slate-900 tracking-wide">
                    PHẦN III. Câu trắc nghiệm trả lời ngắn (2,0 điểm)
                  </h3>
                  <p className="text-[11px] text-slate-600 italic">
                    Thí sinh trả lời từ câu 1 đến câu {exam.part3Questions.length}. Điền kết quả vào ô trống.
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-blue-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  2.0 đ
                </span>
              </div>

              <div className="space-y-4">
                {exam.part3Questions.map((q) => (
                  <div key={q.id} className="text-xs border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900 flex-1 min-w-[240px] leading-relaxed">
                      <span>Câu {q.number}.</span> <MathRenderer content={q.content} />
                    </p>

                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="text"
                        placeholder="Điền đáp số..."
                        value={studentPart3Answers[q.id] || ''}
                        onChange={(e) => setStudentPart3Answers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 w-32 bg-white"
                      />
                      {showAnswerKeys && (
                        <span className="bg-blue-100 text-blue-900 font-mono font-bold px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                          Key: <MathRenderer content={q.correctAnswerShort} />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* PHẦN IV: TỰ LUẬN (3.0Đ) KÈM BAREM TỪNG BƯỚC */}
            <section className="space-y-3">
              <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200 p-2.5 rounded-xl">
                <div>
                  <h3 className="font-bold text-xs uppercase text-emerald-950 tracking-wide">
                    PHẦN IV. Tự luận (3,0 điểm)
                  </h3>
                  <p className="text-[11px] text-emerald-800 italic">
                    Thí sinh trình bày chi tiết các bước giải bài toán thực tiễn.
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                  3.0 đ
                </span>
              </div>

              <div className="space-y-4">
                {exam.part4Questions.map((q) => (
                  <div key={q.id} className="text-xs border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                    <p className="font-semibold text-slate-900 leading-relaxed">
                      <strong>Câu {q.number} ({q.points} điểm).</strong> <MathRenderer content={q.content} />
                    </p>

                    {/* BAREM CHẤM TỪNG BƯỚC */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="bg-slate-100/80 px-3 py-1.5 font-bold text-[11px] uppercase tracking-wider text-slate-700 flex justify-between">
                        <span>Barem chấm điểm từng bước (Rubric)</span>
                        <span>Điểm thành phần</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {q.rubric.map((r, rIdx) => (
                          <div key={rIdx} className="p-2.5 flex items-start justify-between gap-3 text-slate-700 text-xs">
                            <span className="flex-1 leading-relaxed">● <MathRenderer content={r.criteria} /></span>
                            <span className="font-mono font-bold text-emerald-800 shrink-0 bg-emerald-50 px-2 py-0.5 rounded">
                              +{r.score.toFixed(2)}đ
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>

          <div className="text-center font-bold text-xs uppercase text-slate-400 mt-10 pt-4 border-t border-slate-200">
            ------------------- HẾT -------------------
          </div>
        </div>

      </div>

      {/* MODAL TRỘN ĐỀ 4 MÃ ĐỀ & BẢNG ĐÁP ÁN */}
      <MultiCodeExamModal
        isOpen={isMultiCodeModalOpen}
        onClose={() => setIsMultiCodeModalOpen(false)}
        exam={exam}
        onSelectExamCode={(selected) => onUpdateExam(selected)}
      />

      {/* MODAL PHÒNG THI THỬ TRỰC TUYẾN CHẤM ĐIỂM (LÀM THỬ & DUYỆT ĐỀ) */}
      <StudentExamModal
        isOpen={isStudentExamModalOpen}
        onClose={() => setIsStudentExamModalOpen(false)}
        exam={exam}
      />

      {/* MODAL GIAO THI ONLINE TOÀN LỚP (MÃ QR & LINK INTERNET) */}
      <ExportToOnlineExamModal
        isOpen={isExportOnlineModalOpen}
        onClose={() => setIsExportOnlineModalOpen(false)}
        examData={onlineExamData}
      />
    </div>
  );
};

