import React, { useState, useMemo } from 'react';
import { ExamCV7991 } from '../types/pedagogy';
import { MathRenderer } from './MathRenderer';
import { shuffleExamToMultipleCodes, ShuffledExamPackage } from '../utils/examShuffler';
import { exportMultiCodeExamToWord } from '../utils/exportWord';
import { Shuffle, Download, X, CheckCircle, FileText, Check, Layers, RefreshCw } from 'lucide-react';

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
  const [targetCodes, setTargetCodes] = useState<string[]>(['101', '102', '103', '104']);
  const [activeTabCode, setActiveTabCode] = useState<string>('matrix');
  const [shuffleKey, setShuffleKey] = useState<number>(1);

  const shuffledPackage: ShuffledExamPackage = useMemo(() => {
    return shuffleExamToMultipleCodes(exam, targetCodes);
  }, [exam, targetCodes, shuffleKey]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="p-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center">
              <Shuffle className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">Trộn Đề Thi Tự Động & Bảng Đáp Án Soi Đề</h3>
              <p className="text-xs text-teal-100">
                Tạo 4 mã đề chuẩn (101, 102, 103, 104) đảo ngẫu nhiên câu hỏi & phương án theo Công văn 7991
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* CONTROLS BAR */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* TAB SELECTION */}
          <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTabCode('matrix')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeTabCode === 'matrix' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bảng Đáp Án Soi Đề
            </button>
            {targetCodes.map(code => (
              <button
                key={code}
                onClick={() => setActiveTabCode(code)}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  activeTabCode === code ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mã {code}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReShuffle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold transition"
              title="Xáo trộn lại toàn bộ vị trí"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Trộn lại</span>
            </button>
            <button
              onClick={handleDownloadWordAll}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải Word Trọn Gói 4 Mã Đề</span>
            </button>
          </div>
        </div>

        {/* CONTENT BODY */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 flex-1">
          {activeTabCode === 'matrix' ? (
            /* TAB: BẢNG ĐÁP ÁN SOI ĐỀ */
            <div className="space-y-6">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm mb-1">
                  1. Phần I: Bảng đáp án trắc nghiệm nhiều phương án (12 câu x 0.25đ = 3.0đ)
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                        <th className="p-2.5 text-center w-20">Câu</th>
                        {targetCodes.map(c => (
                          <th key={c} className="p-2.5 text-center text-emerald-700">Mã {c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {shuffledPackage.masterAnswerKey.part1.map(row => (
                        <tr key={row.questionNumber} className="hover:bg-slate-50">
                          <td className="p-2 text-center font-bold text-slate-600 bg-slate-50/50">
                            Câu {row.questionNumber}
                          </td>
                          {targetCodes.map(c => (
                            <td key={c} className="p-2 text-center font-extrabold text-blue-700">
                              {row.answers[c]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 text-sm mb-1">
                  2. Phần II: Bảng đáp án Đúng - Sai (2 câu x 4 ý a,b,c,d = 2.0đ)
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                        <th className="p-2.5 text-center w-20">Câu</th>
                        <th className="p-2.5 text-center w-16">Ý</th>
                        {targetCodes.map(c => (
                          <th key={c} className="p-2.5 text-center text-emerald-700">Mã {c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {shuffledPackage.masterAnswerKey.part2.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 text-center font-bold text-slate-600 bg-slate-50/50">
                            Câu {row.questionNumber}
                          </td>
                          <td className="p-2 text-center font-bold text-slate-700">
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

              <div>
                <h4 className="font-extrabold text-slate-900 text-sm mb-1">
                  3. Phần III: Bảng đáp án câu hỏi trả lời ngắn (4 câu x 0.5đ = 2.0đ)
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                        <th className="p-2.5 text-center w-20">Câu</th>
                        {targetCodes.map(c => (
                          <th key={c} className="p-2.5 text-center text-emerald-700">Mã {c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {shuffledPackage.masterAnswerKey.part3.map(row => (
                        <tr key={row.questionNumber} className="hover:bg-slate-50">
                          <td className="p-2 text-center font-bold text-slate-600 bg-slate-50/50">
                            Câu {row.questionNumber}
                          </td>
                          {targetCodes.map(c => (
                            <td key={c} className="p-2 text-center font-bold text-slate-800">
                              <MathRenderer content={row.answers[c]} inline />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* TAB: XEM CHI TIẾT MÃ ĐỀ ĐƯỢC CHỌN */
            (() => {
              const currentExam = shuffledPackage.exams.find(e => e.code === activeTabCode);
              if (!currentExam) return null;
              return (
                <div className="space-y-5">
                  <div className="flex items-center justify-between bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200">
                    <div>
                      <span className="font-bold text-emerald-900 text-sm block">Đang xem: Mã đề {currentExam.code}</span>
                      <span className="text-[11px] text-emerald-700">Đã đảo ngẫu nhiên câu hỏi và phương án A, B, C, D</span>
                    </div>
                    <button
                      onClick={() => {
                        onSelectExamCode(currentExam);
                        onClose();
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-sm text-xs"
                    >
                      Áp dụng mã {currentExam.code} ra màn hình chính
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-2xl p-4 space-y-4 bg-white">
                    <h5 className="font-bold text-slate-800 uppercase tracking-wider text-xs border-b pb-2">
                      Phần I: Câu hỏi trắc nghiệm nhiều lựa chọn (3.0đ)
                    </h5>
                    {currentExam.part1Questions.map(q => (
                      <div key={q.id} className="text-xs space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <p className="font-semibold text-slate-900">
                          Câu {q.number}. <MathRenderer content={q.content} />
                        </p>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <span className={q.correctAnswer === 'A' ? 'font-bold text-emerald-700' : 'text-slate-600'}>
                            A. <MathRenderer content={q.options.A} inline />
                          </span>
                          <span className={q.correctAnswer === 'B' ? 'font-bold text-emerald-700' : 'text-slate-600'}>
                            B. <MathRenderer content={q.options.B} inline />
                          </span>
                          <span className={q.correctAnswer === 'C' ? 'font-bold text-emerald-700' : 'text-slate-600'}>
                            C. <MathRenderer content={q.options.C} inline />
                          </span>
                          <span className={q.correctAnswer === 'D' ? 'font-bold text-emerald-700' : 'text-slate-600'}>
                            D. <MathRenderer content={q.options.D} inline />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            * Mỗi mã đề đều tuân thủ chính xác tỷ lệ 40% Nhận biết - 30% Thông hiểu - 30% Vận dụng = 10.0 điểm.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 font-semibold text-slate-800 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
