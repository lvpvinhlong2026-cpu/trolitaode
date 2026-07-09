/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { FileSpreadsheet, TrendingUp, Users, Calendar, Trophy, AlertTriangle, BookOpen, Trash2 } from 'lucide-react';
import { Subject, Session, Progress, Exam } from '../types';

interface AnalyticsDashboardProps {
  exams: Exam[];
  sessions: Session[];
  subjects: Subject[];
  progress: Progress;
  onDeleteSession: (id: string) => void;
  onClearSessions: () => void;
  onDeleteExam?: (id: string) => void;
}

export default function AnalyticsDashboard({
  exams,
  sessions,
  subjects,
  progress,
  onDeleteSession,
  onClearSessions,
  onDeleteExam
}: AnalyticsDashboardProps) {
  const [filterClass, setFilterClass] = useState<string>('all');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // Filtered session list
  // Filtered session list
  const filteredSessions = sessions.filter((sess) => {
    if (filterClass !== 'all' && sess.studentClass !== filterClass) return false;
    if (selectedExamId && sess.examId !== selectedExamId) return false;
    return true;
  });

  const averageScore = filteredSessions.length > 0
    ? parseFloat((filteredSessions.reduce((acc, c) => acc + c.score, 0) / filteredSessions.length).toFixed(2))
    : 0;

  // Class selection list
  const classes = ['all', ...Array.from(new Set(sessions.map((s) => s.studentClass).filter(Boolean)))];

  // Grade categorization counts: Giỏi [8-10], Khá [6.5-8), Trung bình [5-6.5), Yếu [0-5)
  const statsBreakdown = { excellent: 0, good: 0, average: 0, weak: 0 };
  filteredSessions.forEach((s) => {
    if (s.score >= 8.0) statsBreakdown.excellent++;
    else if (s.score >= 6.5) statsBreakdown.good++;
    else if (s.score >= 5.0) statsBreakdown.average++;
    else statsBreakdown.weak++;
  });

  // Data for Recharts Bar Chart: distribution of scores
  const chartData = [
    { name: 'Yếu (< 5.0)', count: statsBreakdown.weak, fill: '#ef4444' },
    { name: 'Trung bình (5 - 6.5)', count: statsBreakdown.average, fill: '#f59e0b' },
    { name: 'Khá (6.5 - 8.0)', count: statsBreakdown.good, fill: '#3b82f6' },
    { name: 'Giỏi (8.0 - 10)', count: statsBreakdown.excellent, fill: '#10b981' }
  ];

  // Data for Recharts Area Chart: Score trends over time
  // Group score averages by dates
  const dateGroups: Record<string, { sum: number; count: number }> = {};
  filteredSessions.forEach((s) => {
    const d = s.date;
    if (!dateGroups[d]) dateGroups[d] = { sum: 0, count: 0 };
    dateGroups[d].sum += s.score;
    dateGroups[d].count += 1;
  });

  const trendsData = Object.keys(dateGroups)
    .sort()
    .map((date) => ({
      date: date.substring(5), // Show MM-DD or short date
      'Điểm số TB': parseFloat((dateGroups[date].sum / dateGroups[date].count).toFixed(2))
    }));

  // Trigger Excel download of deep student performance reports
  const handleExportToExcel = () => {
    if (sessions.length === 0) {
      alert('Không có dữ liệu bài thi để xuất báo cáo.');
      return;
    }

    // Sheet 1: Detailed historic results list
    const detailsSheetData = sessions.map((sess, index) => {
      const subName = subjects.find(s => s.id === sess.subjectId)?.name || 'Chuyên đề Tự do';
      return {
        'STT': index + 1,
        'Mã Số Lượt Chấm': sess.id,
        'Họ và Tên Học Sinh': sess.studentName || 'Giáo viên (Bản mẫu)',
        'Lớp học': sess.studentClass || '12A1',
        'Chuyên Đề Kiểm Tra': subName,
        'Điểm Số Hệ 10': sess.score,
        'Số Câu Trả Lời Đúng': `${sess.correctAnswers}/${sess.totalQuestions}`,
        'Khả Năng Đúng (%)': `${((sess.correctAnswers / sess.totalQuestions) * 100).toFixed(1)}%`,
        'Thời Gian Hoàn Thành': `${Math.floor(sess.timeSpent / 60)} phút ${sess.timeSpent % 60} giây`,
        'Ngày Thực Hiện': sess.date
      };
    });

    // Sheet 2: Weak analytics insights
    const weakTopicsData = progress.weakTopics.map((topic, index) => ({
      'STT': index + 1,
      'Chuyên Đề Cần Ôn Tập': topic,
      'Khuyến Nghị Sư Phạm': 'Cần bổ túc ngay thông qua Trợ lý Học tập Giáo sư Toán AI giúp lấp lỗ hổng kiến thức.'
    }));

    // Generate sheet objects matching SheetJS rules
    const wb = XLSX.utils.book_new();
    const wsDetails = XLSX.utils.json_to_sheet(detailsSheetData);
    const wsWeak = XLSX.utils.json_to_sheet(weakTopicsData);

    XLSX.utils.book_append_sheet(wb, wsDetails, "Bảng Điểm Học Sinh Chi Tiết");
    XLSX.utils.book_append_sheet(wb, wsWeak, "Phân Tích Chuyên Đề Còn Yếu");

    // Write file to teacher download workspace
    XLSX.writeFile(wb, `bao_cao_nang_luc_mon_toan_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in p-1">

      {/* GRAPH ACTIONS AND DATA CHARTS */}
      <div className="grid grid-cols-1 gap-6">
        {/* Chart plot A: Grade range counts */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Đồ thị Phân bộ Điểm số của Học sinh</h3>
            
            {/* Class filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Lớp:</span>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="p-1 border border-slate-200 bg-slate-50 rounded-md text-xs font-semibold"
              >
                {classes.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls === 'all' ? 'Tất cả lớp' : `Lớp ${cls}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-[220px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} />
                <Bar dataKey="count" fill="#4a90e2" radius={[4, 4, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Bar key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* CREATED EXAMS PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm md:col-span-1 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <BookOpen size={16} className="text-blue-500" />
            Các đề kiểm tra đã tạo
          </h3>

          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {exams.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Chưa có đề kiểm tra nào được tạo.
              </div>
            ) : (
              exams.slice().reverse().map((exam) => {
                const isSelected = selectedExamId === exam.id;
                return (
                  <div 
                    key={exam.id} 
                    onClick={() => setSelectedExamId(isSelected ? null : exam.id)}
                    className={`flex flex-col gap-1.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm text-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className={`font-semibold leading-tight text-xs ${isSelected ? 'text-white' : 'text-blue-800'}`}>
                        {exam.title}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDeleteExam) onDeleteExam(exam.id);
                        }}
                        className={`p-1 -mt-1 -mr-1 rounded-md transition-colors flex-shrink-0 ${
                          isSelected ? 'text-blue-200 hover:bg-blue-700 hover:text-white' : 'text-slate-300 hover:bg-red-50 hover:text-red-500'
                        }`}
                        title="Xóa đề kiểm tra"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className={`flex items-center justify-between text-[10px] mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                      <span className={`px-2 py-0.5 rounded shadow-xs border ${isSelected ? 'bg-blue-700 border-blue-500' : 'bg-slate-50 border-slate-100'}`}>
                        {exam.questions.length} câu hỏi
                      </span>
                      <span>{exam.createdAt ? new Date(exam.createdAt).toLocaleDateString('vi-VN') : 'Mới tạo'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* HISTORY LIST LOGS */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm md:col-span-2 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <i className="fa-solid fa-list-ol text-blue-500"></i>
                Lịch sử chấm thi học sinh ({filteredSessions.length} bản ghi)
              </h3>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportToExcel}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <FileSpreadsheet size={13} />
                  Xuất Excel Phân Tích Sâu
                </button>
                {sessions.length > 0 && (
                  <button
                    onClick={onClearSessions}
                    className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                    <th className="py-2">Học Sinh</th>
                    <th className="py-2">Lớp</th>
                    <th className="py-2">Điểm Số</th>
                    <th className="py-2">Số Câu Đúng</th>
                    <th className="py-2 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60 font-medium">
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        Chưa có học sinh nào nộp câu trả lời bài kiểm tra.
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map((sess) => (
                      <tr key={sess.id} className="text-slate-700 hover:bg-slate-50/50">
                        <td className="py-3 font-semibold text-slate-800">{sess.studentName || 'Giáo viên (Bản mẫu)'}</td>
                        <td className="py-3 text-slate-500">{sess.studentClass || 'N/A'}</td>
                        <td className="py-3 font-mono font-bold text-blue-600">{sess.score}/10</td>
                        <td className="py-3 text-emerald-600">{sess.correctAnswers}/{sess.totalQuestions} đúng</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => onDeleteSession(sess.id)}
                            className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                            title="Xóa học sinh này"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
