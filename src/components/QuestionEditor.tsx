import React from 'react';
import { Trash, Eye } from 'lucide-react';
import { Question } from '../types';
import MathJaxRenderer from './MathJaxRenderer';

interface QuestionEditorProps {
  question: Omit<Question, 'id' | 'subjectId'>;
  index: number;
  onUpdate: (updatedFields: Partial<Omit<Question, 'id' | 'subjectId'>>) => void;
  onDelete: () => void;
  key?: React.Key;
}

export default function QuestionEditor({ question, index, onUpdate, onDelete }: QuestionEditorProps) {
  return (
    <div className="bg-white dark:bg-slate-900/85 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 relative">
      
      {/* Delete button floating */}
      <button
        onClick={onDelete}
        className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/35 rounded-lg transition-colors"
        title="Xóa câu"
      >
        <Trash size={15} />
      </button>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Index & Selects */}
        <div className="md:col-span-4 space-y-3">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">CÂU HỎI {index + 1}</span>
            <div className="flex gap-2">
              {/* Difficulty Select */}
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 font-bold block mb-1">MỨC ĐỘ</label>
                <select
                  value={question.difficulty}
                  onChange={(e) => onUpdate({ difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg outline-none bg-slate-50 dark:bg-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="easy">🟢 [B] (Dễ)</option>
                  <option value="medium">🟡 [H] (Trung bình)</option>
                  <option value="hard">🔴 [VD] (Khó)</option>
                </select>
              </div>

              {/* Correct Answer Select */}
              <div className="w-[85px]">
                <label className="text-[10px] text-slate-400 font-bold block mb-1">ĐÁP ÁN ĐÚNG</label>
                {question.type === 'true-false' ? (
                  <div className="w-full text-[10px] p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-center font-bold bg-slate-50 dark:bg-slate-800 dark:text-slate-200 text-slate-400 cursor-not-allowed">
                    Đ/S (Bên dưới)
                  </div>
                ) : (
                  <select
                    value={question.correctAnswer}
                    onChange={(e) => onUpdate({ correctAnswer: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-center font-bold bg-slate-50 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Full LaTeX Preview Box */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-800 max-h-[350px] overflow-y-auto flex flex-col space-y-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700 pb-1.5">
              <Eye size={12} />
              Bản Xem Trước (Chuẩn Đề Thi)
            </div>
            
            <div className="text-xs dark:text-slate-200 leading-relaxed text-slate-800 antialiased font-sans">
              <div className="font-semibold flex items-start gap-1">
                <span className="shrink-0">Câu {index + 1}:</span>
                <div className="flex-1">
                  {question.content ? <MathJaxRenderer content={question.content} inline={true} /> : <span className="italic text-slate-400">Trống nội dung</span>}
                </div>
              </div>
              
              {question.options && question.options.length === 4 && (
                <div className="grid grid-cols-1 gap-2 mt-3 pl-5">
                  {(question.type === 'true-false' ? ['a', 'b', 'c', 'd'] : ['A', 'B', 'C', 'D']).map((letter, optIdx) => {
                    const isCorrect = question.type === 'true-false'
                      ? question.correctAnswer?.split('-')[optIdx] === 'T'
                      : question.correctAnswer === letter;
                    return (
                      <div key={letter} className="flex items-start gap-1.5">
                        <span className={`shrink-0 font-bold ${isCorrect ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {letter}{question.type === 'true-false' ? ')' : '.'}
                        </span>
                        <div className="flex-1">
                          {question.options && question.options[optIdx] ? (
                            <MathJaxRenderer content={question.options[optIdx]} inline={true} />
                          ) : (
                            <span className="italic text-slate-400">Trống</span>
                          )}
                          {question.type === 'true-false' && (
                            <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {isCorrect ? 'Đúng' : 'Sai'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {question.explanation && (
                <div className="mt-4 p-2 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg">
                  <div className="text-[10px] font-bold text-amber-600 dark:text-amber-500 mb-1">Lời giải:</div>
                  <MathJaxRenderer content={question.explanation} inline={false} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Question Content & Answers Fields */}
        <div className="md:col-span-8 space-y-3">
          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1">NỘI DUNG CÂU HỎI (HỖ TRỢ LATEX)</label>
            <textarea
              rows={3}
              value={question.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none select-text dark:bg-slate-900 dark:text-slate-200 font-mono leading-relaxed bg-slate-50/30 dark:bg-slate-900/50"
              placeholder="Ví dụ: Tập xác định của hàm số $y = \frac{1}{\sqrt{x - 1}}$ là"
            />
          </div>

          {/* Trắc nghiệm lựa chọn */}
          {question.options && question.options.length === 4 && (
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">
                {question.type === 'true-false' ? 'CÁC MỆNH ĐỀ ĐÚNG/SAI (a, b, c, d)' : 'CÁC PHƯƠNG ÁN TRẮC NGHIỆM (A, B, C, D)'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(question.type === 'true-false' ? ['a', 'b', 'c', 'd'] : ['A', 'B', 'C', 'D']).map((letter, optIdx) => {
                  const placeholderVal = question.options?.[optIdx] || '';
                  const isCorrect = question.type === 'true-false'
                      ? question.correctAnswer?.split('-')[optIdx] === 'T'
                      : question.correctAnswer === letter;

                  return (
                    <div key={letter} className="flex flex-col gap-1.5 p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="flex items-start gap-2">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border shrink-0 mt-0.5 ${
                          isCorrect
                            ? 'bg-blue-600 border-blue-600 text-white font-black shadow-sm' 
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}>
                          {letter}
                        </span>
                        <textarea
                          rows={2}
                          value={placeholderVal}
                          onChange={(e) => {
                            const newOpts = [...(question.options || [])];
                            newOpts[optIdx] = e.target.value;
                            onUpdate({ options: newOpts });
                          }}
                          className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-slate-200 font-mono resize-none"
                          placeholder={`Nhập ${question.type === 'true-false' ? 'mệnh đề' : 'đáp án'} ${letter} (LaTeX)...`}
                        />
                      </div>
                      
                      {question.type === 'true-false' && (
                        <div className="flex items-center justify-end gap-2 pr-1 mt-1">
                          <span className="text-[10px] font-bold text-slate-400 mr-1">ĐÁP ÁN:</span>
                          <button
                            type="button"
                            onClick={() => {
                              const parts = (question.correctAnswer || 'F-F-F-F').split('-');
                              parts[optIdx] = 'T';
                              onUpdate({ correctAnswer: parts.join('-') });
                            }}
                            className={`px-3 py-1 rounded text-[10px] font-bold transition-colors ${isCorrect ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                          >
                            ĐÚNG
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const parts = (question.correctAnswer || 'F-F-F-F').split('-');
                              parts[optIdx] = 'F';
                              onUpdate({ correctAnswer: parts.join('-') });
                            }}
                            className={`px-3 py-1 rounded text-[10px] font-bold transition-colors ${!isCorrect ? 'bg-rose-500 text-white shadow-sm' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                          >
                            SAI
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lời giải chi tiết */}
          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1">LỜI GIẢI CHI TIẾT (LỜI GIẢI HỖ TRỢ PHÂN PHỐI LATEX)</label>
            <textarea
              rows={3}
              value={question.explanation || ''}
              onChange={(e) => onUpdate({ explanation: e.target.value })}
              placeholder="Nhập hướng dẫn giải toán chi tiết (tùy chọn)..."
              className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50/30 dark:bg-slate-900/50 dark:text-slate-200 font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
