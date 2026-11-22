import React, { useState, useEffect } from 'react';
import { ExamCV7991 } from '../types/pedagogy';
import { MathRenderer } from './MathRenderer';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Award, 
  AlertTriangle, 
  RotateCcw, 
  Send, 
  X,
  Sparkles,
  HelpCircle,
  FileCheck2
} from 'lucide-react';

interface StudentExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: ExamCV7991;
}

export const StudentExamModal: React.FC<StudentExamModalProps> = ({
  isOpen,
  onClose,
  exam,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(exam.durationMinutes * 60 || 2700);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  // Câu trả lời của học sinh
  const [p1Answers, setP1Answers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [p2Answers, setP2Answers] = useState<Record<string, Record<string, boolean>>>({});
  const [p3Answers, setP3Answers] = useState<Record<string, string>>({});
  const [p4SelfScores, setP4SelfScores] = useState<Record<string, number>>({});

  // Kết quả sau khi nộp
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [scoreResult, setScoreResult] = useState<{
    total: number;
    part1Score: number;
    part2Score: number;
    part3Score: number;
    part4Score: number;
    rating: string;
  } | null>(null);

  // Đếm ngược thời gian
  useEffect(() => {
    if (!isOpen || isSubmitted || !isTimerRunning) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isSubmitted, isTimerRunning]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectP1 = (qId: string, opt: 'A' | 'B' | 'C' | 'D') => {
    if (isSubmitted) return;
    setP1Answers(prev => ({ ...prev, [qId]: opt }));
  };

  const handleToggleP2 = (qId: string, subId: string, val: boolean) => {
    if (isSubmitted) return;
    setP2Answers(prev => ({
      ...prev,
      [qId]: {
        ...(prev[qId] || {}),
        [subId]: val
      }
    }));
  };

  const handleChangeP3 = (qId: string, val: string) => {
    if (isSubmitted) return;
    setP3Answers(prev => ({ ...prev, [qId]: val }));
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    setIsTimerRunning(false);

    // 1. Chấm Phần I (0.25đ / câu)
    let p1Score = 0;
    exam.part1Questions.forEach(q => {
      if (p1Answers[q.id] === q.correctAnswer) {
        p1Score += 0.25;
      }
    });

    // 2. Chấm Phần II theo barem chuẩn CV 7991:
    // Đúng 1 ý: 0.1đ | Đúng 2 ý: 0.25đ | Đúng 3 ý: 0.5đ | Đúng 4 ý: 1.0đ
    let p2Score = 0;
    exam.part2Questions.forEach(q => {
      const studentStatements = p2Answers[q.id] || {};
      let correctSubCount = 0;
      q.statements.forEach(st => {
        if (studentStatements[st.subId] === st.isCorrect) {
          correctSubCount++;
        }
      });

      if (correctSubCount === 1) p2Score += 0.10;
      else if (correctSubCount === 2) p2Score += 0.25;
      else if (correctSubCount === 3) p2Score += 0.50;
      else if (correctSubCount === 4) p2Score += 1.00;
    });

    // 3. Chấm Phần III (0.5đ / câu)
    let p3Score = 0;
    exam.part3Questions.forEach(q => {
      const studentVal = (p3Answers[q.id] || '').trim().toLowerCase();
      const correctVal = q.correctAnswerShort.trim().toLowerCase();
      if (studentVal && (studentVal === correctVal || Math.abs(parseFloat(studentVal) - parseFloat(correctVal)) < 0.01)) {
        p3Score += 0.5;
      }
    });

    // 4. Phần IV: Điểm tự luận do học sinh/giáo viên chấm (mặc định lấy 80% điểm tự luận nếu chưa chấm)
    let p4Score = 0;
    exam.part4Questions.forEach(q => {
      p4Score += p4SelfScores[q.id] !== undefined ? p4SelfScores[q.id] : q.points * 0.8;
    });

    const total = Math.min(10, Math.round((p1Score + p2Score + p3Score + p4Score) * 100) / 100);

    let rating = 'Chưa đạt';
    if (total >= 9.0) rating = 'Xuất sắc';
    else if (total >= 8.0) rating = 'Giỏi';
    else if (total >= 6.5) rating = 'Khá';
    else if (total >= 5.0) rating = 'Đạt (Trung bình)';

    setScoreResult({
      total,
      part1Score: Math.round(p1Score * 100) / 100,
      part2Score: Math.round(p2Score * 100) / 100,
      part3Score: Math.round(p3Score * 100) / 100,
      part4Score: Math.round(p4Score * 100) / 100,
      rating
    });
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setScoreResult(null);
    setP1Answers({});
    setP2Answers({});
    setP3Answers({});
    setP4SelfScores({});
    setTimeLeft(exam.durationMinutes * 60 || 2700);
    setIsTimerRunning(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* HEADER */}
        <div className="p-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center font-bold">
              <FileCheck2 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight uppercase">
                Phòng Thi Trực Tuyến - Chấm Điểm Tự Động CV 7991
              </h3>
              <p className="text-[11px] text-blue-200">
                {exam.examTitle} | Mã đề: <span className="font-bold text-amber-300">{exam.code}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* ĐỒNG HỒ ĐẾM NGƯỢC */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
              timeLeft < 300 ? 'bg-rose-500/30 border-rose-400 text-rose-200 animate-pulse' : 'bg-white/10 border-white/20 text-white'
            }`}>
              <Clock className="w-4 h-4" />
              <span>{formatTime(timeLeft)}</span>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* KẾT QUẢ CHẤM ĐIỂM (NẾU ĐÃ NỘP BÀI) */}
        {scoreResult && (
          <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex flex-col items-center justify-center font-black shadow-md">
                <span className="text-lg leading-none">{scoreResult.total}</span>
                <span className="text-[9px] font-normal">/ 10.0đ</span>
              </div>
              <div>
                <span className="font-bold text-emerald-900 text-sm block">
                  Xếp loại: <strong className="text-emerald-700">{scoreResult.rating}</strong>
                </span>
                <div className="flex items-center gap-3 text-slate-600 text-[11px] mt-0.5">
                  <span>Phần I: <strong>{scoreResult.part1Score}/3.0đ</strong></span>
                  <span>Phần II: <strong>{scoreResult.part2Score}/2.0đ</strong></span>
                  <span>Phần III: <strong>{scoreResult.part3Score}/2.0đ</strong></span>
                  <span>Tự luận: <strong>{scoreResult.part4Score}/3.0đ</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 font-bold transition text-xs shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm Lại Đề Này</span>
            </button>
          </div>
        )}

        {/* CÂU HỎI THI */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-800 flex-1">
          {/* PHẦN I */}
          <div className="space-y-3">
            <div className="bg-blue-50/80 p-3 rounded-2xl border border-blue-200">
              <h4 className="font-extrabold text-blue-900 text-sm">
                PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (3,0 điểm)
              </h4>
              <p className="text-[11px] text-blue-700">Mỗi câu chọn đúng được 0,25 điểm.</p>
            </div>

            {exam.part1Questions.map(q => {
              const studentChoice = p1Answers[q.id];
              const isCorrect = isSubmitted && studentChoice === q.correctAnswer;
              const isWrong = isSubmitted && studentChoice && studentChoice !== q.correctAnswer;

              return (
                <div
                  key={q.id}
                  className={`p-3.5 rounded-2xl border transition ${
                    isSubmitted
                      ? isCorrect
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : isWrong
                        ? 'border-rose-300 bg-rose-50/40'
                        : 'border-slate-200 bg-white'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <p className="font-bold text-slate-900 mb-2">
                    Câu {q.number}. <MathRenderer content={q.content} />
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(['A', 'B', 'C', 'D'] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectP1(q.id, opt)}
                        disabled={isSubmitted}
                        className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition ${
                          studentChoice === opt
                            ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        } ${isSubmitted && q.correctAnswer === opt ? 'ring-2 ring-emerald-500 font-black text-emerald-800 bg-emerald-100/50' : ''}`}
                      >
                        <span className="w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center text-[10px] shrink-0 font-bold">
                          {opt}
                        </span>
                        <span className="text-xs">
                          <MathRenderer content={q.options[opt]} inline />
                        </span>
                      </button>
                    ))}
                  </div>

                  {isSubmitted && (
                    <div className="mt-2 text-[11px] text-slate-600 bg-white/80 p-2 rounded-xl border border-slate-200">
                      <strong>Đáp án đúng: {q.correctAnswer}</strong>. <MathRenderer content={q.explanation} inline />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* PHẦN II */}
          <div className="space-y-3">
            <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200">
              <h4 className="font-extrabold text-emerald-900 text-sm">
                PHẦN II. Câu trắc nghiệm Đúng - Sai (2,0 điểm)
              </h4>
              <p className="text-[11px] text-emerald-700">
                Thang điểm CV 7991: Đúng 1 ý: 0,10đ | Đúng 2 ý: 0,25đ | Đúng 3 ý: 0,50đ | Đúng 4 ý: 1,00đ.
              </p>
            </div>

            {exam.part2Questions.map(q => (
              <div key={q.id} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                <p className="font-bold text-slate-900">
                  Câu {q.number}. <MathRenderer content={q.leadIn} />
                </p>

                <div className="space-y-2">
                  {q.statements.map(st => {
                    const studentAns = p2Answers[q.id]?.[st.subId];
                    const isStCorrect = isSubmitted && studentAns === st.isCorrect;

                    return (
                      <div
                        key={st.subId}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                          isSubmitted
                            ? isStCorrect
                              ? 'border-emerald-300 bg-emerald-50/40'
                              : studentAns !== undefined
                              ? 'border-rose-300 bg-rose-50/40'
                              : 'border-slate-200'
                            : 'border-slate-200 bg-slate-50/50'
                        }`}
                      >
                        <span className="text-xs flex-1">
                          <strong>{st.subId})</strong> <MathRenderer content={st.content} inline />
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleP2(q.id, st.subId, true)}
                            disabled={isSubmitted}
                            className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                              studentAns === true
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            Đúng
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleP2(q.id, st.subId, false)}
                            disabled={isSubmitted}
                            className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                              studentAns === false
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            Sai
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* PHẦN III */}
          <div className="space-y-3">
            <div className="bg-purple-50/80 p-3 rounded-2xl border border-purple-200">
              <h4 className="font-extrabold text-purple-900 text-sm">
                PHẦN III. Câu trắc nghiệm trả lời ngắn (2,0 điểm)
              </h4>
              <p className="text-[11px] text-purple-700">Mỗi câu trả lời đúng được 0,5 điểm.</p>
            </div>

            {exam.part3Questions.map(q => (
              <div key={q.id} className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2">
                <p className="font-bold text-slate-900">
                  Câu {q.number}. <MathRenderer content={q.content} />
                </p>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-600">Đáp số của em:</span>
                  <input
                    type="text"
                    value={p3Answers[q.id] || ''}
                    onChange={(e) => handleChangeP3(q.id, e.target.value)}
                    disabled={isSubmitted}
                    placeholder="Nhập số hoặc từ khóa ngắn..."
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none w-64"
                  />
                  {isSubmitted && (
                    <span className="text-xs font-bold text-emerald-700">
                      Đáp án chuẩn: <MathRenderer content={q.correctAnswerShort} inline /> (<MathRenderer content={q.explanation} inline />)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* PHẦN IV */}
          <div className="space-y-3">
            <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200">
              <h4 className="font-extrabold text-amber-900 text-sm">
                PHẦN IV. Tự luận (3,0 điểm)
              </h4>
              <p className="text-[11px] text-amber-700">Đọc kĩ đề bài và tự đối chiếu theo Rubric chấm điểm.</p>
            </div>

            {exam.part4Questions.map(q => (
              <div key={q.id} className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2">
                <p className="font-bold text-slate-900">
                  Câu {q.number} ({q.points} điểm). <MathRenderer content={q.content} />
                </p>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
                  <span className="font-bold text-slate-700 block">Rubric chấm điểm:</span>
                  {q.rubric.map((r, rIdx) => (
                    <div key={rIdx} className="flex justify-between text-slate-600">
                      <span>• <MathRenderer content={r.criteria} inline /></span>
                      <strong className="text-amber-700">{r.score}đ</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            {isSubmitted ? 'Đã hoàn tất chấm bài theo barem CV 7991' : 'Kiểm tra kĩ các câu trả lời trước khi nộp bài.'}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 text-xs transition"
            >
              Đóng phòng thi
            </button>
            {!isSubmitted ? (
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Nộp Bài & Chấm Điểm Ngay</span>
              </button>
            ) : (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Thi Lại Từ Đầu</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
