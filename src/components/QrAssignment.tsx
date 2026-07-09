/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { QrCode, Clipboard, ExternalLink, GraduationCap, Clock, CheckCircle, AlertTriangle, Send, BookOpen, ChevronRight, ChevronLeft, User, Download, Printer, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import LZString from 'lz-string';
import { QRCodeCanvas } from 'qrcode.react';
import { Exam, Question, Session, StudentClass } from '../types';
import MathJaxRenderer from './MathJaxRenderer';

interface QRErrorBoundaryProps {
  children: ReactNode;
}

interface QRErrorBoundaryState {
  hasError: boolean;
}

class QRErrorBoundary extends Component<QRErrorBoundaryProps, QRErrorBoundaryState> {
  constructor(props: QRErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): QRErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("QRCode rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-[11px] text-red-500 font-medium px-4 text-center">
          <AlertTriangle size={24} className="mx-auto mb-2 text-red-400" />
          Đề thi quá dài, vượt giới hạn vật lý của mã QR. Vui lòng sử dụng Đường dẫn trực tiếp bên dưới.
        </div>
      );
    }

    return this.props.children;
  }
}


interface QrAssignmentProps {
  exams: Exam[];
  questions: Question[];
  sessions?: Session[];
  selectedExam: Exam | null;
  onAddSession: (session: Session) => void;
  onSelectExam: (exam: Exam) => void;
  onGoBack?: () => void;
  studentClasses?: StudentClass[];
}

export default function QrAssignment({
  exams,
  questions,
  sessions = [],
  selectedExam,
  onAddSession,
  onSelectExam,
  onGoBack,
  studentClasses = []
}: QrAssignmentProps) {
  // Portal Flow states: 'assignment-setup' | 'student-entry' | 'testing' | 'results'
  const [flowState, setFlowState] = useState<'setup' | 'entry' | 'testing' | 'results'>(() => {
    return (new URLSearchParams(window.location.search).has('examId') || new URLSearchParams(window.location.search).has('examData')) ? 'entry' : 'setup';
  });
  const [showResults, setShowResults] = useState<boolean>(false);

  // Student portal credentials
  const [studentName, setStudentName] = useState<string>('');
  const [studentClass, setStudentClass] = useState<string>('');

  // Exam taking states
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [studentExam, setStudentExam] = useState<Exam | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({}); // maps questionId -> 'A' | 'B' | 'C' | 'D'
  const [timeRemaining, setTimeRemaining] = useState<number>(0); // in seconds
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(0);

  // Results state
  const [finalScore, setFinalScore] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [displayUrl, setDisplayUrl] = useState<string>('');
  const [isGeneratingLink, setIsGeneratingLink] = useState<boolean>(false);

  // Support both single (legacy) and multiple classes
  const assignedClassesList = activeExam?.assignedClassesData || (
    activeExam?.assignedClassData ? [activeExam.assignedClassData] : (
      activeExam?.assignedClassIds 
        ? studentClasses.filter(c => activeExam.assignedClassIds!.includes(c.id))
        : (activeExam?.assignedClassId ? studentClasses.filter(c => c.id === activeExam.assignedClassId) : [])
    )
  );

  useEffect(() => {
    if (selectedExam) {
      setActiveExam(selectedExam);
      // If there's exactly one class, pre-select it to save time
      const classesList = selectedExam.assignedClassesData || (
        selectedExam.assignedClassData ? [selectedExam.assignedClassData] : (
          selectedExam.assignedClassIds 
            ? studentClasses.filter(c => selectedExam.assignedClassIds!.includes(c.id))
            : (selectedExam.assignedClassId ? studentClasses.filter(c => c.id === selectedExam.assignedClassId) : [])
        )
      );
      if (classesList.length === 1) {
        setStudentClass(classesList[0].name);
      } else {
        setStudentClass(''); // Reset to ensure they pick one if there are multiple
      }
      setStudentName('');
    }
  }, [selectedExam, studentClasses]);

  // Handle countdown timer
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && timerActive) {
      // Auto-submit on timeout
      setTimerActive(false);
      handleExamSubmit();
    }
    return () => clearInterval(interval);
  }, [timerActive, timeRemaining]);

  const handleStartExamSimulation = () => {
    if (!activeExam) return;
    setFlowState('entry');
  };

  const handleEnterExam = () => {
    if (!studentName.trim() || !studentClass.trim()) {
      alert('Vui lòng nhập đầy đủ Họ tên và Lớp Học sinh!');
      return;
    }

    if (activeExam?.maxAttempts && activeExam.maxAttempts > 0) {
      const attemptKey = `exam_attempts_${activeExam.id}_${studentName.trim().toLowerCase()}_${studentClass.trim().toLowerCase()}`;
      const currentAttempts = parseInt(localStorage.getItem(attemptKey) || '0', 10);
      if (currentAttempts >= activeExam.maxAttempts) {
        alert(`Tài khoản của bạn đã hết số lần làm bài (Tối đa ${activeExam.maxAttempts} lần).`);
        return;
      }
    }

    setViewToTest();
  };

  const setViewToTest = () => {
    if (!activeExam) return;

    let randomizedQuestions: Question[] = [];

    if (activeExam.isDynamic && activeExam.difficultyRatio) {
      // Dynamic mode: draw randomly from the selected bank
      const matchingQuestions = (!activeExam.sourceBankId || activeExam.sourceBankId === 'all')
        ? questions 
        : questions.filter(q => q.bankId === activeExam.sourceBankId);
      
      const subjectQs = matchingQuestions.filter(q => q.subjectId === activeExam.subjectId);
      
      const easys = subjectQs.filter(q => q.difficulty === 'easy').sort(() => 0.5 - Math.random());
      const mediums = subjectQs.filter(q => q.difficulty === 'medium').sort(() => 0.5 - Math.random());
      const hards = subjectQs.filter(q => q.difficulty === 'hard').sort(() => 0.5 - Math.random());

      const { easyCount, mediumCount, hardCount } = activeExam.difficultyRatio;
      let selectedEasys = easys.slice(0, easyCount);
      let selectedMediums = mediums.slice(0, mediumCount);
      let selectedHards = hards.slice(0, hardCount);

      if (selectedEasys.length < easyCount || selectedMediums.length < mediumCount || selectedHards.length < hardCount) {
        // Fallback if not enough questions in bank
        randomizedQuestions = [...activeExam.questions].sort(() => 0.5 - Math.random());
      } else {
        randomizedQuestions = [...selectedEasys, ...selectedMediums, ...selectedHards].sort(() => 0.5 - Math.random());
      }
    } else {
      // Static mode: Use the exact questions from the generated exam, just shuffle their order
      randomizedQuestions = [...activeExam.questions].sort(() => 0.5 - Math.random());
    }

    // Shuffle options and update correctAnswer for each question
    const shuffledOptionsQuestions = randomizedQuestions.map(q => {
      if (!q.options || q.options.length === 0) return q;

      const oldIndex = q.correctAnswer.charCodeAt(0) - 65; // 'A' -> 0
      if (oldIndex < 0 || oldIndex >= q.options.length) return q;

      const correctOptionContent = q.options[oldIndex];
      const shuffledOptions = [...q.options].sort(() => 0.5 - Math.random());
      const newIndex = shuffledOptions.findIndex(opt => opt === correctOptionContent);

      return {
        ...q,
        options: shuffledOptions,
        correctAnswer: String.fromCharCode(65 + newIndex)
      };
    });

    setStudentExam({
      ...activeExam,
      questions: shuffledOptionsQuestions
    });

    // Set timer based on duration in minutes converted to seconds
    setTimeRemaining(activeExam.duration * 60);
    setTimerActive(true);
    setStartTime(Date.now());
    setCurrentQuestionIdx(0);
    setSelectedAnswers({});
    setFlowState('testing');
  };

  const handleSelectAnswer = (questionId: string, answer: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSelectAnswerTrueFalse = (questionId: string, optIdx: number, val: 'T' | 'F') => {
    setSelectedAnswers((prev) => {
      const current = prev[questionId] || 'N-N-N-N';
      const parts = current.split('-');
      if (parts.length !== 4) { parts.length = 0; while (parts.length < 4) parts.push('N'); }
      parts[optIdx] = val;
      return { ...prev, [questionId]: parts.join('-') };
    });
  };

  const handleExamSubmit = () => {
    if (!studentExam) return;
    setTimerActive(false);

    // Grade exam
    let rawScore = 0;
    studentExam.questions.forEach((q) => {
      if (q.type === 'true-false') {
        const studentAns = selectedAnswers[q.id] || 'N-N-N-N';
        const correctAns = q.correctAnswer || 'F-F-F-F';
        const sParts = studentAns.split('-');
        const cParts = correctAns.split('-');
        let matchCount = 0;
        for(let i=0; i<4; i++) {
           if (sParts[i] === cParts[i]) matchCount++;
        }
        if (matchCount === 1) rawScore += 0.1;
        else if (matchCount === 2) rawScore += 0.25;
        else if (matchCount === 3) rawScore += 0.5;
        else if (matchCount === 4) rawScore += 1.0;
      } else if (q.type === 'essay') {
        const studentAnsStr = (selectedAnswers[q.id] || '').trim().toLowerCase();
        const correctAnsStr = (q.correctAnswer || '').trim().toLowerCase();
        if (studentAnsStr !== '' && studentAnsStr === correctAnsStr) {
          rawScore++;
        }
      } else {
        if (selectedAnswers[q.id] === q.correctAnswer) {
          rawScore++;
        }
      }
    });

    const totalQuestions = studentExam.questions.length;
    // Compute score out of 10
    const calculatedScore = parseFloat(((rawScore / totalQuestions) * 10).toFixed(2));
    const secondsUsed = Math.floor((Date.now() - startTime) / 1000);

    if (activeExam?.maxAttempts && activeExam.maxAttempts > 0) {
      const attemptKey = `exam_attempts_${activeExam.id}_${studentName.trim().toLowerCase()}_${studentClass.trim().toLowerCase()}`;
      const currentAttempts = parseInt(localStorage.getItem(attemptKey) || '0', 10);
      localStorage.setItem(attemptKey, (currentAttempts + 1).toString());
    }

    setCorrectCount(rawScore);
    setFinalScore(calculatedScore);
    setTimeSpent(secondsUsed);

    // Save session to global state
    const newSession: Session = {
      id: 'sess-' + Math.random().toString(36).substring(2, 9),
      subjectId: studentExam.subjectId,
      score: calculatedScore,
      totalQuestions,
      correctAnswers: rawScore,
      timeSpent: secondsUsed,
      date: new Date().toISOString().split('T')[0],
      studentName,
      studentClass,
      examId: studentExam.id,
      examTitle: studentExam.title
    };

    onAddSession(newSession);
    setFlowState('results');
  };

  const formatTime = (secs: number) => {
    const min = Math.floor(secs / 60);
    const sec = secs % 60;
    return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const baseUrl = window.location.href.split('?')[0].replace(/\/$/, '');

  // Cập nhật đường dẫn hiển thị khi activeExam thay đổi
  useEffect(() => {
    if (!activeExam || flowState !== 'setup') return;

    // Tối ưu hóa kích thước dữ liệu: loại bỏ explanation và các trường không cần thiết của học sinh để QR không quá dày
    const optimizedExam: Exam = {
      ...activeExam,
      questions: activeExam.questions.map(q => ({
        ...q,
        explanation: undefined
      })),
      assignedClassesData: activeExam.assignedClassesData?.map(cls => ({
        ...cls,
        students: cls.students.map(s => ({
          id: s.id,
          name: s.name
        }))
      }))
    };

    const longUrl = `${baseUrl}/?examData=${LZString.compressToEncodedURIComponent(JSON.stringify(optimizedExam))}`;
    setDisplayUrl(longUrl);
    setIsGeneratingLink(true);

    fetch('https://tinyurl.com/api-create.php?url=' + encodeURIComponent(longUrl))
      .then(res => res.text())
      .then(shortUrl => {
        if (shortUrl && shortUrl.startsWith('http')) {
          setDisplayUrl(shortUrl);
        }
      })
      .catch(err => console.error('Failed to generate short URL:', err))
      .finally(() => setIsGeneratingLink(false));
  }, [activeExam, baseUrl, flowState]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(displayUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleExportResult = () => {
    if (!studentExam) return;

    let content = `KẾT QUẢ BÀI KIỂM TRA: ${studentExam.title}\n`;
    content += `Học sinh: ${studentName}\n`;
    content += `Lớp: ${studentClass}\n`;
    content += `Điểm số: ${finalScore}/10\n`;
    content += `Số câu đúng: ${correctCount}/${studentExam.questions.length}\n`;
    content += `Thời gian làm bài: ${formatTime(timeSpent)}\n\n`;
    content += `CHI TIẾT LÀM BÀI:\n`;

    studentExam.questions.forEach((q, idx) => {
      const studentAns = selectedAnswers[q.id] || 'Chưa chọn';
      const isCorrect = studentAns === q.correctAnswer;
      content += `Câu ${idx + 1}: Chọn ${studentAns} - ${isCorrect ? 'Đúng' : `Sai (Đáp án đúng: ${q.correctAnswer})`}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ket_Qua_${studentName.replace(/\s+/g, '_')}_${studentClass}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAllResults = () => {
    if (!activeExam) return;
    
    const examSessions = sessions.filter(s => s.examId === activeExam.id);
    if (examSessions.length === 0) {
      alert('Chưa có kết quả nào để xuất.');
      return;
    }

    const data = examSessions.map(session => ({
      'Học Sinh': session.studentName || '',
      'Lớp': session.studentClass || '',
      'Điểm': session.score,
      'Số Câu Đúng': session.correctAnswers,
      'Tổng Câu': session.totalQuestions,
      'Thời Gian': formatTime(session.timeSpent),
      'Ngày': session.date
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ket_Qua');
    
    // Auto-size columns slightly
    worksheet['!cols'] = [
      { wch: 25 }, // Học Sinh
      { wch: 15 }, // Lớp
      { wch: 10 }, // Điểm
      { wch: 15 }, // Số Câu Đúng
      { wch: 15 }, // Tổng Câu
      { wch: 15 }, // Thời Gian
      { wch: 20 }, // Ngày
    ];

    XLSX.writeFile(workbook, `Danh_Sach_Diem_${activeExam.title.replace(/\s+/g, '_')}.xlsx`);
  };


  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-fade-in">
      {/* FLOW 1: TEACHER CONFIG & QR GENERATION */}
      {flowState === 'setup' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {onGoBack && (
                <button
                  onClick={onGoBack}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center"
                  title="Quay lại danh sách đề thi"
                >
                  <ChevronLeft size={20} />
                  <span className="ml-1 text-sm font-semibold hidden sm:inline-block">Quay lại</span>
                </button>
              )}
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <QrCode className="text-blue-500" />
                Giao Bài Bằng Mã QR & Cổng Học Sinh
              </h2>
            </div>
          </div>

          {exams.length === 0 ? (
            <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
              <i className="fa-solid fa-qrcode text-4xl mb-4 text-slate-200"></i>
              <p className="text-xs">Không có bài thi nào được đăng ký trong danh sách.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Hãy tạo đề kiểm tra phân hóa trước ở tab "Thiết Kế Đề Thi" để nhận Mã QR giao bài.
              </p>
            </div>
          ) : activeExam ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-slate-50/50 p-6 sm:p-8 rounded-2xl border border-slate-100">
              {/* QR display card */}
              <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-slate-200 shadow-xs max-w-xs mx-auto text-center space-y-4">
                <div className="font-bold text-xs text-slate-400 tracking-wider uppercase">MÃ QR BÀI KIỂM TRA</div>
                <div className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-center min-h-[190px]">
                  <QRErrorBoundary>
                    <QRCodeCanvas
                      id="qr-code-canvas"
                      value={displayUrl || baseUrl}
                      size={176}
                      level="L"
                    />
                  </QRErrorBoundary>
                </div>
                <div className="text-[11px] text-slate-400 leading-tight">
                  Quét bằng điện thoại thông minh, Zalo, hoặc Camera để truy cập làm bài ngay lập tức.
                </div>
                <button
                  onClick={() => {
                    const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
                    if (canvas) {
                      const pngUrl = canvas.toDataURL('image/png');
                      const downloadLink = document.createElement('a');
                      downloadLink.href = pngUrl;
                      downloadLink.download = `QR_Code_${activeExam.title}.png`;
                      document.body.appendChild(downloadLink);
                      downloadLink.click();
                      document.body.removeChild(downloadLink);
                    }
                  }}
                  className="mt-2 p-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex justify-center items-center gap-1.5"
                >
                  <Download size={13} />
                  Lưu ảnh QR Code
                </button>
              </div>

              {/* URL configurations and simulation actions */}
              <div className="space-y-4">
                <h3 className="text-md font-bold text-slate-800">Quản ly giao bài thông minh</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Lớp học liên kết trực tiếp bằng liên kết tĩnh URL hoặc mã QR. Các kết quả của học sinh sẽ tự động định lượng, chấm điểm và trực quan hóa lên biểu đồ báo cáo ở tab "Thống Kê Học Tập".
                </p>

                {/* Stat badges */}
                <div className="grid grid-cols-3 gap-2 py-2">
                  <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-center font-mono">
                    <div className="text-[10px] text-slate-400 font-bold">CÂU HỎI</div>
                    <div className="text-xs font-bold text-slate-700">{activeExam.questions.length}</div>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-center font-mono">
                    <div className="text-[10px] text-slate-400 font-bold">THỜI GIAN</div>
                    <div className="text-xs font-bold text-slate-700">{activeExam.duration}p</div>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-center font-mono text-emerald-600">
                    <div className="text-[10px] text-slate-400 font-bold">DỄ-TB-KHÓ</div>
                    <div className="text-xs font-bold">{activeExam.difficultyRatio.easyCount}-{activeExam.difficultyRatio.mediumCount}-{activeExam.difficultyRatio.hardCount}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-400">Đường dẫn làm bài:</div>
                  <div className="flex gap-2 relative">
                    {isGeneratingLink && (
                      <div className="absolute inset-y-0 right-14 flex items-center pr-2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    <input
                      type="text"
                      readOnly
                      value={displayUrl || baseUrl}
                      className="flex-1 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      {copiedLink ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleStartExamSimulation}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <GraduationCap size={15} />
                    Mô Phỏng Cổng Học Sinh
                  </button>
                  <button
                    onClick={() => setShowResults(!showResults)}
                    className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Clipboard size={15} />
                    {showResults ? 'Ẩn kết quả học sinh' : 'Xem kết quả học sinh'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400 p-6">Vui lòng chọn hoặc tạo đề thi.</div>
          )}

          {/* RESULTS TABLE */}
          {activeExam && showResults && (
            <div className="mt-8 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                  <Clipboard size={18} className="text-blue-500" />
                  Kết Quả Làm Bài: <span className="text-slate-500 font-medium">{activeExam.title}</span>
                </h3>
                <button
                  onClick={handleExportAllResults}
                  disabled={sessions.filter(s => s.examId === activeExam?.id).length === 0}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-[13px] font-semibold transition-colors flex items-center gap-1.5"
                  title="Xuất bảng điểm ra file Excel"
                >
                  <Download size={14} />
                  Xuất bảng điểm (.xlsx)
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 border-b border-slate-100">Học Sinh</th>
                      <th className="px-4 py-3 border-b border-slate-100">Lớp</th>
                      <th className="px-4 py-3 border-b border-slate-100">Điểm</th>
                      <th className="px-4 py-3 border-b border-slate-100">Đúng/Tổng</th>
                      <th className="px-4 py-3 border-b border-slate-100">Thời Gian</th>
                      <th className="px-4 py-3 border-b border-slate-100">Ngày</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sessions.filter(s => s.examId === activeExam.id).length > 0 ? (
                      sessions.filter(s => s.examId === activeExam.id).map(session => (
                        <tr key={session.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800">{session.studentName}</td>
                          <td className="px-4 py-3">{session.studentClass}</td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${session.score >= 8 ? 'text-emerald-600' : session.score >= 5 ? 'text-amber-600' : 'text-rose-600'}`}>
                              {session.score}/10
                            </span>
                          </td>
                          <td className="px-4 py-3">{session.correctAnswers}/{session.totalQuestions}</td>
                          <td className="px-4 py-3">{formatTime(session.timeSpent)}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{session.date}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
                          Chưa có kết quả làm bài nào cho đề thi này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FLOW 2: STUDENT REGISTRATION ENTRY SCREEN */}
      {flowState === 'entry' && !activeExam && (
        <div className="max-w-md mx-auto space-y-6 py-12 text-center animate-fade-in">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Không tìm thấy đề thi</h2>
          <p className="text-sm text-slate-500 bg-white p-4 rounded-xl border border-slate-200">
            Đường dẫn bài kiểm tra không hợp lệ hoặc đề thi chưa được tải lên thiết bị này. <br/><br/>
            <strong>Học sinh:</strong> Vui lòng quét mã QR hoặc truy cập đường dẫn mới nhất từ giáo viên.<br/>
            <strong>Giáo viên:</strong> Xin lưu ý trang web trên Vercel cần được cập nhật bản code mới nhất (có hỗ trợ lưu đề thi vào đường dẫn) để chức năng giao bài hoạt động hoàn hảo.
          </p>
        </div>
      )}

      {flowState === 'entry' && activeExam && (
        <div className="max-w-md mx-auto space-y-6 py-6 animate-fade-in">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
              <GraduationCap size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Cổng Kiểm Tra Năng Lực Học Sinh</h3>
            <p className="text-xs text-slate-400">Đề kiểm tra: <strong className="text-slate-600">{activeExam.title}</strong></p>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-4 shadow-xs">
            {/* Student Info entry */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Lớp học / Khối lớp
              </label>
              <div className="relative">
                <GraduationCap size={16} className="absolute left-3 top-3.5 text-slate-400" />
                {assignedClassesList && assignedClassesList.length > 0 ? (
                  <select
                    value={studentClass}
                    onChange={(e) => {
                      setStudentClass(e.target.value);
                      setStudentName(''); // Reset name when class changes
                    }}
                    disabled={assignedClassesList.length === 1}
                    className={`w-full text-sm p-3 pl-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none ${
                      assignedClassesList.length === 1 ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-800'
                    }`}
                  >
                    <option value="">-- Chọn lớp của bạn --</option>
                    {assignedClassesList.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    placeholder="Ví dụ: 12A1"
                    className="w-full text-sm p-3 pl-10 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-800"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Họ và Tên Học sinh
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-3.5 text-slate-400" />
                {assignedClassesList && assignedClassesList.length > 0 ? (
                  <select
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    disabled={!studentClass}
                    className={`w-full text-sm p-3 pl-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none ${
                      !studentClass ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800'
                    }`}
                  >
                    <option value="">{studentClass ? "-- Chọn tên của bạn --" : "-- Vui lòng chọn lớp trước --"}</option>
                    {studentClass && assignedClassesList.find(c => c.name === studentClass)?.students.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn Hải"
                    className="w-full text-sm p-3 pl-10 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-800"
                  />
                )}
              </div>
            </div>

            <div className="p-3 bg-blue-50/50 rounded-xl text-[11px] text-blue-700 flex items-start gap-1.5 border border-blue-100/30">
              <Clock size={14} className="mt-0.5 shrink-0" />
              <span>Bài thi có tổng thời gian làm bài giới hạn {activeExam.duration} phút. Điểm số sẽ tự động phân tích ngay sau khi nộp bài.</span>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={handleEnterExam}
                disabled={!studentName.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-xs shadow-xs transition-colors disabled:opacity-50"
              >
                Bắt đầu làm đề
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOW 3: ACTIVE LIVE ONLINE TESTING FOR PORTAL ACTIVE */}
      {flowState === 'testing' && studentExam && (
        <div className="space-y-6 py-2 animate-fade-in select-none">
          {/* Top Test Header */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs text-blue-300 font-bold uppercase tracking-wider">BÀI THI PHÂN HÓA</div>
              <h2 className="text-sm font-bold truncate max-w-sm sm:max-w-md">{studentExam.title}</h2>
            </div>

            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl">
              <Clock size={16} className="text-amber-200 shrink-0" />
              <span className="font-mono text-xs font-bold tracking-tight text-amber-200">
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between shadow-sm">
             <div className="font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider"><Info size={14} className="text-blue-500"/> Ghi chú dạng câu hỏi:</div>
             <div className="flex flex-wrap gap-4 font-semibold">
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Trắc nghiệm</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Đúng/Sai</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Trả lời ngắn</span>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Col: Primary Active Question */}
            <div className="lg:col-span-3 space-y-4">
              {studentExam.questions.length > 0 && (
                <div className={`bg-white rounded-2xl p-6 sm:p-8 space-y-6 border-2 shadow-xs transition-colors ${
                  studentExam.questions[currentQuestionIdx].type === 'true-false' ? 'border-amber-200' :
                  studentExam.questions[currentQuestionIdx].type === 'essay' ? 'border-emerald-200' :
                  'border-blue-200'
                }`}>
                  {/* Subject and question level indicator */}
                  <div className="flex justify-between items-center pb-4 border-b border-dashed border-slate-100 text-xs">
                    <span className="font-bold text-slate-400 uppercase">CÂU HỎI SỐ {currentQuestionIdx + 1} / {studentExam.questions.length}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 font-bold rounded-full text-[10px] uppercase border ${
                          studentExam.questions[currentQuestionIdx].type === 'true-false' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                          studentExam.questions[currentQuestionIdx].type === 'essay' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                          'bg-blue-50 text-blue-600 border-blue-200'
                      }`}>
                        {studentExam.questions[currentQuestionIdx].type === 'true-false' ? 'ĐÚNG/SAI' : studentExam.questions[currentQuestionIdx].type === 'essay' ? 'TRẢ LỜI NGẮN' : 'TRẮC NGHIỆM'}
                      </span>
                      <span className={`px-2.5 py-0.5 font-bold rounded-full text-[10px] capitalize ${studentExam.questions[currentQuestionIdx].difficulty === 'easy'
                          ? 'bg-slate-100 text-slate-600'
                          : studentExam.questions[currentQuestionIdx].difficulty === 'medium'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-slate-300 text-slate-800'
                        }`}>
                        Mức độ: {studentExam.questions[currentQuestionIdx].difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Question content */}
                  <div className="text-base font-medium leading-relaxed font-sans text-slate-900 py-2">
                    <MathJaxRenderer content={studentExam.questions[currentQuestionIdx].content} inline={false} />
                  </div>

                  {/* Options selection grid */}
                  {studentExam.questions[currentQuestionIdx].type === 'essay' ? (
                    <div className="mt-4">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Nhập Câu Trả Lời:
                      </label>
                      <input 
                        type="text"
                        placeholder="Nhập kết quả..."
                        value={selectedAnswers[studentExam.questions[currentQuestionIdx].id] || ''}
                        onChange={(e) => handleSelectAnswer(studentExam.questions[currentQuestionIdx].id, e.target.value)}
                        className="w-full sm:max-w-xs p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 font-semibold transition shadow-sm"
                      />
                    </div>
                  ) : studentExam.questions[currentQuestionIdx].options && (
                    <div className={studentExam.questions[currentQuestionIdx].type === 'true-false' ? "space-y-3" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
                      {(studentExam.questions[currentQuestionIdx].type === 'true-false' ? ['a', 'b', 'c', 'd'] : ['A', 'B', 'C', 'D']).map((letter, letterIdx) => {
                        const qId = studentExam.questions[currentQuestionIdx].id;
                        const isTrueFalse = studentExam.questions[currentQuestionIdx].type === 'true-false';
                        
                        if (isTrueFalse) {
                          const studentAnsParts = (selectedAnswers[qId] || 'N-N-N-N').split('-');
                          const currentChoice = studentAnsParts[letterIdx];
                          
                          return (
                            <div key={letter} className="p-4 border border-slate-200 bg-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                              <div className="flex items-start gap-3 flex-1">
                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 bg-slate-100 border-slate-300 text-slate-600">
                                  {letter})
                                </span>
                                <div className="flex-1 text-sm antialiased">
                                  <MathJaxRenderer content={studentExam.questions[currentQuestionIdx].options?.[letterIdx] || ''} inline={true} />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => handleSelectAnswerTrueFalse(qId, letterIdx, 'T')}
                                  className={`px-5 py-2 rounded-lg text-xs font-bold transition-colors ${currentChoice === 'T' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                  ĐÚNG
                                </button>
                                <button
                                  onClick={() => handleSelectAnswerTrueFalse(qId, letterIdx, 'F')}
                                  className={`px-5 py-2 rounded-lg text-xs font-bold transition-colors ${currentChoice === 'F' ? 'bg-rose-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                  SAI
                                </button>
                              </div>
                            </div>
                          );
                        } else {
                          const isSelected = selectedAnswers[qId] === letter;
                          return (
                            <button
                              key={letter}
                              onClick={() => handleSelectAnswer(qId, letter)}
                              className={`p-4 text-left border rounded-xl flex items-center gap-3 transition-all ${isSelected
                                  ? 'border-blue-500 bg-blue-50/50 text-blue-950 font-semibold ring-1 ring-blue-500'
                                  : 'border-slate-200 hover:bg-slate-50 bg-white text-slate-700'
                                }`}
                            >
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition ${isSelected
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'bg-slate-100 border-slate-300 text-slate-600'
                                }`}>
                                {letter}
                              </span>
                              <div className="flex-1 text-sm antialiased">
                                <MathJaxRenderer content={studentExam.questions[currentQuestionIdx].options?.[letterIdx] || ''} inline={true} />
                              </div>
                            </button>
                          );
                        }
                      })}
                    </div>
                  )}

                  {/* Navigation Footer */}
                  <div className="flex justify-between items-center pt-4">
                    <button
                      disabled={currentQuestionIdx === 0}
                      onClick={() => setCurrentQuestionIdx((p) => p - 1)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-40"
                    >
                      Câu Trước
                    </button>
                    <button
                      disabled={currentQuestionIdx === studentExam.questions.length - 1}
                      onClick={() => setCurrentQuestionIdx((p) => p + 1)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-40"
                    >
                      Câu Tiếp Theo
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Navigation Grid of all questions */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 lg:col-span-1 flex flex-col justify-between h-[380px]">
              <div className="space-y-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Danh sách câu hỏi</div>
                <div className="grid grid-cols-5 gap-2">
                  {studentExam.questions.map((q, idx) => {
                    const answered = selectedAnswers[q.id] !== undefined;
                    const isActive = currentQuestionIdx === idx;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestionIdx(idx)}
                        className={`py-2 text-xs font-mono font-bold rounded-lg transition-all border ${
                          isActive
                            ? q.type === 'true-false' ? 'border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-500' :
                              q.type === 'essay' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' :
                              'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                            : answered
                              ? q.type === 'true-false' ? 'bg-amber-500 text-white border-amber-600' :
                                q.type === 'essay' ? 'bg-emerald-600 text-white border-emerald-700' :
                                'bg-blue-600 text-white border-blue-700'
                              : q.type === 'true-false' ? 'bg-amber-50/50 hover:bg-amber-100 text-amber-600/70 border-amber-200' :
                                q.type === 'essay' ? 'bg-emerald-50/50 hover:bg-emerald-100 text-emerald-600/70 border-emerald-200' :
                                'bg-blue-50/50 hover:bg-blue-100 text-blue-600/70 border-blue-200'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit trigger block */}
              <div className="pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleExamSubmit(false)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-xs shadow-sm"
                >
                  <Send size={14} />
                  Nộp Bài Kiểm Tra
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOW 4: TEST RESULTS SCREEN */}
      {flowState === 'results' && studentExam && (
        <div className="max-w-2xl mx-auto py-4 space-y-6 animate-fade-in select-text">
          <div className="text-center p-8 bg-blue-50/30 border border-blue-100/40 rounded-3xl space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-10 right-10 w-24 h-24 bg-blue-400/5 rounded-full blur-xl"></div>

            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle size={26} />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-800">Cảm ơn {studentName}! Bạn đã hoàn thành bài thi.</h2>
              <p className="text-xs text-slate-400">Kết quả được tính toán chuẩn xác và tự động hóa.</p>
            </div>

            {/* Large score representation */}
            <div className="py-4 inline-block">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-1">ĐIỂM SỐ CỦA BẠN</div>
              <div className="text-4xl font-extrabold text-blue-600 font-mono tracking-tight">{finalScore}/10</div>
              <div className="text-xs text-slate-500 mt-2 font-medium">Số câu đúng: <strong className="text-slate-800">{correctCount}/{studentExam.questions.length} câu</strong> • Thời gian làm: <strong className="text-slate-800">{formatTime(timeSpent)}</strong></div>
            </div>

            <div className="pt-2 flex flex-wrap justify-center gap-3 max-w-lg mx-auto print:hidden">
              <button
                onClick={setViewToTest}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 font-semibold text-xs transition"
              >
                Làm lại
              </button>
            </div>
          </div>

          {/* Detailed Question Review with MathJax Solutions */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-dashed border-slate-100 flex items-center gap-1.5">
              <BookOpen size={16} className="text-slate-500" />
              Xem lại lời giải chi tiết của các câu hỏi
            </h3>

            <div className="space-y-8">
              {studentExam.questions.map((q, idx) => {
                const studentAns = selectedAnswers[q.id];
                return (
                  <div key={q.id} className="space-y-3 pb-6 border-b border-dashed border-slate-100/50 last:border-0">
                    <div className="font-medium text-sm flex items-start gap-1">
                      <span className="font-bold">Câu {idx + 1}:</span>
                      <div className="flex-1 leading-relaxed">
                        <MathJaxRenderer content={q.content} inline={true} />
                      </div>
                    </div>

                    {q.type === 'essay' ? (
                      <div className="mt-3 pl-6">
                        <div className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 border-slate-200">
                          <div className="flex-1 space-y-1">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Câu trả lời của bạn:</div>
                            <div className={`text-sm font-semibold ${studentAns?.trim().toLowerCase() === q.correctAnswer?.trim().toLowerCase() ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {studentAns || 'Chưa trả lời'}
                            </div>
                          </div>
                          {studentAns?.trim().toLowerCase() !== q.correctAnswer?.trim().toLowerCase() && (
                            <div className="flex-1 space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
                              <div className="text-[10px] uppercase font-bold text-slate-400">Đáp án đúng:</div>
                              <div className="text-sm font-semibold text-blue-600">
                                {q.correctAnswer}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className={q.type === 'true-false' ? "space-y-3 pl-6" : "grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6"}>
                        {(q.type === 'true-false' ? ['a', 'b', 'c', 'd'] : ['A', 'B', 'C', 'D']).map((letter, optIdx) => {
                          const isTrueFalse = q.type === 'true-false';
                          
                          if (isTrueFalse) {
                            const correctChoiceForTrueFalse = (q.correctAnswer || 'F-F-F-F').split('-')[optIdx] as 'T'|'F';
                            const studentChoiceForTrueFalse = (studentAns || 'N-N-N-N').split('-')[optIdx] as 'T'|'F'|'N';
                            const correct = correctChoiceForTrueFalse === studentChoiceForTrueFalse;
                            
                            return (
                              <div key={letter} className={`flex items-start gap-2 p-2 border rounded-lg ${correct ? 'bg-emerald-50/50 border-emerald-200' : studentChoiceForTrueFalse !== 'N' ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border bg-slate-100 border-slate-300 text-slate-500 shrink-0">
                                  {letter}
                                </span>
                                <div className="flex-1 text-sm">
                                  <MathJaxRenderer content={q.options?.[optIdx] || ''} inline={true} />
                                </div>
                                <div className="shrink-0 flex items-center gap-1.5 ml-2 text-[10px] font-bold">
                                  {studentChoiceForTrueFalse !== 'N' ? (
                                    <span className={`px-2 py-1 rounded ${correct ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                      Chọn: {studentChoiceForTrueFalse === 'T' ? 'Đúng' : 'Sai'}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-500">Bỏ qua</span>
                                  )}
                                  {!correct && (
                                    <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 border border-blue-200">
                                      Đáp án: {correctChoiceForTrueFalse === 'T' ? 'Đúng' : 'Sai'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          } else {
                            const correct = q.correctAnswer === letter;
                            const studentChoice = studentAns === letter;
                            return (
                              <div
                                key={letter}
                                className={`p-2.5 rounded-lg text-xs border flex items-center gap-1.5 ${correct
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                                    : studentChoice && !correct
                                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                                      : 'bg-slate-50/50 border-slate-100'
                                  }`}
                              >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${correct
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : studentChoice
                                      ? 'bg-rose-500 border-rose-500 text-white'
                                      : 'bg-slate-100 border-slate-300 text-slate-500'
                                  }`}>
                                  {letter}
                                </span>
                                <div className="flex-1">
                                  <MathJaxRenderer content={q.options?.[optIdx] || ''} inline={true} />
                                </div>
                              </div>
                            );
                          }
                        })}
                      </div>
                    )}
                    {/* Explanations block */}
                    {q.explanation && (
                      <div className="mt-3 ml-6 p-4 bg-amber-50/30 rounded-xl border border-amber-100/30 text-xs text-slate-700 leading-relaxed font-sans">
                        <div className="font-bold text-amber-700 flex items-center gap-1 mb-1.5">
                          <i className="fa-solid fa-graduation-cap"></i>
                          Hướng dẫn giải chi tiết:
                        </div>
                        <MathJaxRenderer content={q.explanation} inline={false} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
