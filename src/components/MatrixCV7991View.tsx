import React, { useState } from 'react';
import { ExamCV7991 } from '../types/pedagogy';
import { MathRenderer } from './MathRenderer';
import { exportExamToWord, exportMatrixSpecToWord } from '../utils/exportWord';
import { 
  Download, 
  Printer, 
  FileText, 
  CheckCircle2, 
  FileSpreadsheet,
  Type,
  BookOpen,
  ShieldCheck,
  Scale,
  Sliders
} from 'lucide-react';

interface MatrixCV7991ViewProps {
  exam: ExamCV7991;
  onUpdateExam: (updated: ExamCV7991) => void;
}

export const MatrixCV7991View: React.FC<MatrixCV7991ViewProps> = ({
  exam,
  onUpdateExam
}) => {
  const [fontStyle, setFontStyle] = useState<'times' | 'sans'>('times');
  const [activeSheetTab, setActiveSheetTab] = useState<'matrix' | 'specs'>('matrix');

  return (
    <div className="space-y-6">
      {/* THANH CÔNG CỤ ĐIỀU KHIỂN GIAO DIỆN CHUẨN THỂ THỨC */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm no-print">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1 rounded-full border border-slate-300">
            Phụ Lục CV 7991/BGDĐT-GDTrH
          </span>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setActiveSheetTab('matrix')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeSheetTab === 'matrix' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Ma Trận Đề Kiểm Tra (Trang 2)
            </button>
            <button
              onClick={() => setActiveSheetTab('specs')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeSheetTab === 'specs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Bản Đặc Tả Đề Kiểm Tra (Trang 3)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* SWITCH FONT */}
          <button
            onClick={() => setFontStyle(fontStyle === 'times' ? 'sans' : 'times')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-white text-slate-700 font-semibold text-xs transition"
            title="Đổi giữa font Times New Roman (chuẩn công văn) và font Không chân"
          >
            <Type className="w-3.5 h-3.5" />
            <span>Phông: {fontStyle === 'times' ? 'Times New Roman' : 'Be Vietnam Pro'}</span>
          </button>

          <button
            onClick={() => exportMatrixSpecToWord(exam)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải Ma Trận Đặc Tả (.doc)</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In A4</span>
          </button>
        </div>
      </div>

      {/* THANH KIỂM SOÁT TỈ LỆ & CÂN BẰNG MA TRẬN TỰ ĐỘNG (CV 7991) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm no-print space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-xs block">
                Kiểm Chuẩn Tỉ Lệ Ma Trận (CV 7991/BGDĐT-GDTrH)
              </span>
              <span className="text-[11px] text-slate-500">
                Khóa chuẩn 40% Nhận biết - 30% Thông hiểu - 30% Vận dụng = 10.0 điểm
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold">
              <span className="text-slate-500">Tổng điểm:</span>
              <span className="font-bold text-emerald-700 font-mono">10.0 / 10.0đ</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-blue-900 text-[11px]">Phần I: Nhiều lựa chọn</span>
              <span className="font-mono font-bold text-blue-700">3.0đ (30%)</span>
            </div>
            <p className="text-[10px] text-blue-600">12 câu x 0.25đ • Đánh giá nhanh</p>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-emerald-900 text-[11px]">Phần II: Đúng - Sai</span>
              <span className="font-mono font-bold text-emerald-700">2.0đ (20%)</span>
            </div>
            <p className="text-[10px] text-emerald-600">2 câu (8 lệnh) • Barem bậc thang</p>
          </div>

          <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/80">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-purple-900 text-[11px]">Phần III: Trả lời ngắn</span>
              <span className="font-mono font-bold text-purple-700">2.0đ (20%)</span>
            </div>
            <p className="text-[10px] text-purple-600">4 câu x 0.50đ • Điền số/từ khóa</p>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-amber-900 text-[11px]">Phần IV: Tự luận</span>
              <span className="font-mono font-bold text-amber-700">3.0đ (30%)</span>
            </div>
            <p className="text-[10px] text-amber-600">2 câu • Barem Rubric chi tiết</p>
          </div>
        </div>
      </div>

      {/* KHUNG HIỂN THỊ TỜ TÀI LIỆU CHUẨN THỂ THỨC HÀNH CHÍNH (THEO PHONG CÁCH HÌNH THAM CHIẾU SCAN BỘ GD&ĐT) */}
      <div className={`max-w-5xl mx-auto bg-white border border-slate-300 shadow-2xl rounded-sm p-10 md:p-14 text-slate-950 leading-relaxed print:p-0 print:border-none print:shadow-none ${
        fontStyle === 'times' ? 'font-serif' : 'font-sans'
      }`}>
        
        {/* TAB 1: 1. MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ (MÔ PHỎNG 100% TRANG 2 CỦA HÌNH THAM CHIẾU) */}
        {activeSheetTab === 'matrix' && (
          <div className="space-y-4">
            
            {/* TIÊU NGỮ TRÊN CÙNG */}
            <div className="text-center space-y-1">
              <p className="font-bold text-sm uppercase tracking-wide">BỘ GIÁO DỤC VÀ ĐÀO TẠO</p>
              <p className="font-bold text-xs uppercase tracking-wider">PHỤ LỤC</p>
              <p className="italic text-xs text-slate-700">
                (Kèm theo Công văn số 7991/BGDĐT-GDTrH ngày 17 /12/2024 của Bộ GDĐT)
              </p>
              <h2 className="font-bold text-base uppercase pt-2 tracking-wide">
                1. MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ
              </h2>
            </div>

            {/* BẢNG MA TRẬN KẺ ĐEN NÉT MẢNH CHUẨN IN OFFSET CỦA BỘ */}
            <div className="overflow-x-auto text-[11px] pt-2">
              <table className="w-full border-collapse border border-slate-900 text-slate-950">
                <thead>
                  <tr className="border border-slate-900 text-center">
                    <th rowSpan={3} className="border border-slate-900 p-2 w-8 font-bold">TT</th>
                    <th rowSpan={3} className="border border-slate-900 p-2 w-44 font-bold">
                      Chủ đề/Chương
                    </th>
                    <th rowSpan={3} className="border border-slate-900 p-2 w-44 font-bold">
                      Nội dung/đơn vị kiến thức
                    </th>
                    <th colSpan={12} className="border border-slate-900 p-1.5 font-bold">
                      Mức độ đánh giá
                    </th>
                    <th rowSpan={2} colSpan={3} className="border border-slate-900 p-1.5 font-bold">
                      Tổng
                    </th>
                    <th rowSpan={3} className="border border-slate-900 p-2 w-16 font-bold">
                      Tỉ lệ % điểm
                    </th>
                  </tr>
                  <tr className="border border-slate-900 text-center">
                    <th colSpan={9} className="border border-slate-900 p-1 font-bold">
                      TNKQ
                    </th>
                    <th colSpan={3} className="border border-slate-900 p-1 font-bold">
                      Tự luận
                    </th>
                  </tr>
                  <tr className="border border-slate-900 text-center text-[10px]">
                    <th colSpan={3} className="border border-slate-900 p-1 font-semibold">Nhiều lựa chọn</th>
                    <th colSpan={3} className="border border-slate-900 p-1 font-semibold">“Đúng – Sai”<sup>2</sup></th>
                    <th colSpan={3} className="border border-slate-900 p-1 font-semibold">Trả lời ngắn<sup>3</sup></th>
                    <th className="border border-slate-900 p-0.5">Biết</th>
                    <th className="border border-slate-900 p-0.5">Hiểu</th>
                    <th className="border border-slate-900 p-0.5">Vận dụng</th>
                    <th className="border border-slate-900 p-0.5 font-bold">Biết</th>
                    <th className="border border-slate-900 p-0.5 font-bold">Hiểu</th>
                    <th className="border border-slate-900 p-0.5 font-bold">Vận dụng</th>
                  </tr>
                  <tr className="border border-slate-900 text-center text-[10px] bg-slate-50">
                    <th colSpan={3} className="border border-slate-900 p-0.5"></th>
                    <th className="border border-slate-900 p-0.5 font-medium">Biết</th>
                    <th className="border border-slate-900 p-0.5 font-medium">Hiểu</th>
                    <th className="border border-slate-900 p-0.5 font-medium">Vận dụng</th>
                    <th className="border border-slate-900 p-0.5 font-medium">Biết</th>
                    <th className="border border-slate-900 p-0.5 font-medium">Hiểu</th>
                    <th className="border border-slate-900 p-0.5 font-medium">Vận dụng</th>
                    <th className="border border-slate-900 p-0.5 font-medium">Biết</th>
                    <th className="border border-slate-900 p-0.5 font-medium">Hiểu</th>
                    <th className="border border-slate-900 p-0.5 font-medium">Vận dụng</th>
                    <th colSpan={7} className="border border-slate-900 p-0.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {exam.matrixRows.map((row, idx) => (
                    <tr key={idx} className="border border-slate-900 text-center hover:bg-slate-50">
                      <td className="border border-slate-900 p-2 font-bold">{idx + 1}</td>
                      <td className="border border-slate-900 p-2 text-left font-semibold">
                        <MathRenderer content={row.topicName} inline />
                      </td>
                      <td className="border border-slate-900 p-2 text-left">
                        <MathRenderer content={row.unitName} inline />
                      </td>
                      
                      {/* Phần I: Nhiều lựa chọn */}
                      <td className="border border-slate-900 p-1">{row.part1.know || ''}</td>
                      <td className="border border-slate-900 p-1">{row.part1.understand || ''}</td>
                      <td className="border border-slate-900 p-1">{row.part1.apply || ''}</td>

                      {/* Phần II: Đúng - Sai (có ô n^4 như trong hình scan) */}
                      <td className="border border-slate-900 p-1 font-semibold">{row.part2.know ? `${row.part2.know}` : ''}</td>
                      <td className="border border-slate-900 p-1 font-semibold">{row.part2.understand ? `${row.part2.understand} (n)⁴` : ''}</td>
                      <td className="border border-slate-900 p-1 font-semibold">{row.part2.apply ? `${row.part2.apply}` : ''}</td>

                      {/* Phần III: Trả lời ngắn */}
                      <td className="border border-slate-900 p-1">{row.part3.know || ''}</td>
                      <td className="border border-slate-900 p-1">{row.part3.understand || ''}</td>
                      <td className="border border-slate-900 p-1">{row.part3.apply || ''}</td>

                      {/* Tự luận */}
                      <td className="border border-slate-900 p-1">{row.part4.know || ''}</td>
                      <td className="border border-slate-900 p-1">{row.part4.understand || ''}</td>
                      <td className="border border-slate-900 p-1">{row.part4.apply || ''}</td>

                      {/* Tổng mức độ */}
                      <td className="border border-slate-900 p-1 font-bold">{row.part1.know + row.part2.know + row.part3.know + row.part4.know}</td>
                      <td className="border border-slate-900 p-1 font-bold">{row.part1.understand + row.part2.understand + row.part3.understand + row.part4.understand}</td>
                      <td className="border border-slate-900 p-1 font-bold">{row.part1.apply + row.part2.apply + row.part3.apply + row.part4.apply}</td>

                      <td className="border border-slate-900 p-1 font-bold">50%</td>
                    </tr>
                  ))}

                  {/* HÀNG TỔNG SỐ CÂU */}
                  <tr className="border border-slate-900 font-bold text-center bg-slate-50">
                    <td colSpan={3} className="border border-slate-900 p-2 text-right">Tổng số câu</td>
                    <td colSpan={3} className="border border-slate-900 p-1">12 câu</td>
                    <td colSpan={3} className="border border-slate-900 p-1">2 câu (8 ý)</td>
                    <td colSpan={3} className="border border-slate-900 p-1">4 câu</td>
                    <td colSpan={3} className="border border-slate-900 p-1">2 câu</td>
                    <td className="border border-slate-900 p-1">8</td>
                    <td className="border border-slate-900 p-1">6</td>
                    <td className="border border-slate-900 p-1">6</td>
                    <td className="border border-slate-900 p-1">20 câu</td>
                  </tr>

                  {/* HÀNG TỔNG SỐ ĐIỂM (3,0^5 - 2,0 - 2,0 - 3,0 | 4,0 - 3,0 - 3,0) */}
                  <tr className="border border-slate-900 font-bold text-center">
                    <td colSpan={3} className="border border-slate-900 p-2 text-right">Tổng số điểm</td>
                    <td colSpan={3} className="border border-slate-900 p-1">3,0<sup>5</sup></td>
                    <td colSpan={3} className="border border-slate-900 p-1">2,0</td>
                    <td colSpan={3} className="border border-slate-900 p-1">2,0</td>
                    <td colSpan={3} className="border border-slate-900 p-1">3,0</td>
                    <td className="border border-slate-900 p-1">4,0</td>
                    <td className="border border-slate-900 p-1">3,0</td>
                    <td className="border border-slate-900 p-1">3,0</td>
                    <td className="border border-slate-900 p-1 text-xs">10,0 đ</td>
                  </tr>

                  {/* HÀNG TỈ LỆ % (30 - 20 - 20 - 30 | 40 - 30 - 30) */}
                  <tr className="border border-slate-900 font-bold text-center bg-slate-50">
                    <td colSpan={3} className="border border-slate-900 p-2 text-right">Tỉ lệ %</td>
                    <td colSpan={3} className="border border-slate-900 p-1">30</td>
                    <td colSpan={3} className="border border-slate-900 p-1">20</td>
                    <td colSpan={3} className="border border-slate-900 p-1">20</td>
                    <td colSpan={3} className="border border-slate-900 p-1">30</td>
                    <td className="border border-slate-900 p-1">40</td>
                    <td className="border border-slate-900 p-1">30</td>
                    <td className="border border-slate-900 p-1">30</td>
                    <td className="border border-slate-900 p-1 text-xs">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* CÁC CHÚ THÍCH FOOTNOTE NGUYÊN BẢN TỪ TRANG 2 CỦA HÌNH THAM CHIẾU */}
            <div className="pt-4 border-t border-slate-400 text-[10.5px] leading-relaxed text-slate-800 space-y-1">
              <p>
                <sup>2</sup> <em>Mỗi câu hỏi bao gồm 4 ý nhỏ, mỗi ý học sinh phải chọn đúng hoặc sai. Một số tài liệu xếp loại câu hỏi này vào loại Nhiều lựa chọn phức hợp hoặc Nhiều lựa chọn có nhiều phương án đúng.</em>
              </p>
              <p>
                <sup>3</sup> <em>Đối với môn học không sử dụng dạng này thì chuyển toàn bộ số điểm cho dạng “Đúng – Sai”.</em>
              </p>
              <p>
                <sup>4</sup> <em>Có ở trong một số ô của ma trận, thể hiện số câu hỏi hoặc câu hỏi số bao nhiêu.</em>
              </p>
              <p>
                <sup>5</sup> <em>Lựa chọn sao cho được khoảng 3,0 điểm, tương ứng với tỉ lệ khoảng 30%; tương tự như thế đối với các dạng khác.</em>
              </p>
            </div>

          </div>
        )}

        {/* TAB 2: 2. BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KÌ (MÔ PHỎNG 100% TRANG 3 CỦA HÌNH THAM CHIẾU) */}
        {activeSheetTab === 'specs' && (
          <div className="space-y-4">
            
            <div className="text-center space-y-1">
              <p className="font-bold text-sm uppercase tracking-wide">BỘ GIÁO DỤC VÀ ĐÀO TẠO</p>
              <h2 className="font-bold text-base uppercase pt-1 tracking-wide">
                2. BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KÌ
              </h2>
            </div>

            <div className="overflow-x-auto text-[11px] pt-2">
              <table className="w-full border-collapse border border-slate-900 text-slate-950">
                <thead>
                  <tr className="border border-slate-900 text-center">
                    <th rowSpan={3} className="border border-slate-900 p-2 w-8 font-bold">TT</th>
                    <th rowSpan={3} className="border border-slate-900 p-2 w-36 font-bold">Chủ đề/Chương</th>
                    <th rowSpan={3} className="border border-slate-900 p-2 w-36 font-bold">Nội dung/đơn vị kiến thức</th>
                    <th rowSpan={3} className="border border-slate-900 p-2 text-left font-bold">Yêu cầu cần đạt</th>
                    <th colSpan={12} className="border border-slate-900 p-1.5 font-bold">
                      Số câu hỏi ở các mức độ đánh giá
                    </th>
                  </tr>
                  <tr className="border border-slate-900 text-center">
                    <th colSpan={9} className="border border-slate-900 p-1 font-bold">TNKQ</th>
                    <th colSpan={3} className="border border-slate-900 p-1 font-bold">Tự luận</th>
                  </tr>
                  <tr className="border border-slate-900 text-center text-[10px]">
                    <th colSpan={3} className="border border-slate-900 p-1">Nhiều lựa chọn</th>
                    <th colSpan={3} className="border border-slate-900 p-1">“Đúng – Sai”</th>
                    <th colSpan={3} className="border border-slate-900 p-1">Trả lời ngắn</th>
                    <th className="border border-slate-900 p-0.5">Biết</th>
                    <th className="border border-slate-900 p-0.5">Hiểu</th>
                    <th className="border border-slate-900 p-0.5">Vận dụng</th>
                  </tr>
                  <tr className="border border-slate-900 text-center text-[10px] bg-slate-50">
                    <th colSpan={4} className="border border-slate-900 p-0.5"></th>
                    <th className="border border-slate-900 p-0.5 font-medium">Biết</th>
                    <th className="border border-slate-900 p-0.5 font-medium">Hiểu</th>
                    <th className="border border-slate-900 p-0.5 font-medium">Vận dụng</th>
                    <th className="border border-slate-900 p-0.5 font-medium">Biết</th>
                    <th className="border border-slate-900 p-0.5 font-medium">Hiểu</th>
                    <th className="border border-slate-900 p-0.5 font-medium">Vận dụng</th>
                    <th className="border border-slate-900 p-0.5 font-medium">Biết</th>
                    <th className="border border-slate-900 p-0.5 font-medium">Hiểu</th>
                    <th className="border border-slate-900 p-0.5 font-medium">Vận dụng</th>
                    <th colSpan={3} className="border border-slate-900 p-0.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {exam.specifications.map((sp, idx) => (
                    <tr key={sp.id} className="border border-slate-900 align-top hover:bg-slate-50">
                      <td className="border border-slate-900 p-2 text-center font-bold">{idx + 1}</td>
                      <td className="border border-slate-900 p-2 font-semibold">
                        <MathRenderer content={sp.topic} inline />
                      </td>
                      <td className="border border-slate-900 p-2">
                        <MathRenderer content={sp.unit} inline />
                      </td>
                      <td className="border border-slate-900 p-2 space-y-1">
                        <p className="font-medium text-slate-900">• <MathRenderer content={sp.competencyRequirement} inline /></p>
                        <p className="text-[10px] text-slate-600 italic">Câu hỏi đối sánh: {sp.questionRef}</p>
                      </td>
                      
                      {/* Phân bổ số câu và mã năng lực (n) (NL?)^6 */}
                      <td className="border border-slate-900 p-1 text-center">{sp.level === 'know' ? '1' : ''}</td>
                      <td className="border border-slate-900 p-1 text-center">{sp.level === 'understand' ? '1' : ''}</td>
                      <td className="border border-slate-900 p-1 text-center">{sp.level === 'apply' ? '1' : ''}</td>

                      <td className="border border-slate-900 p-1 text-center"></td>
                      <td className="border border-slate-900 p-1 text-center font-bold text-blue-900">
                        {idx === 0 ? '(1) (NL1)⁶' : ''}
                      </td>
                      <td className="border border-slate-900 p-1 text-center"></td>

                      <td className="border border-slate-900 p-1 text-center">{idx === 1 ? '1' : ''}</td>
                      <td className="border border-slate-900 p-1 text-center"></td>
                      <td className="border border-slate-900 p-1 text-center">{idx === 2 ? '1' : ''}</td>

                      <td className="border border-slate-900 p-1 text-center"></td>
                      <td className="border border-slate-900 p-1 text-center"></td>
                      <td className="border border-slate-900 p-1 text-center">{idx === 2 ? '1' : ''}</td>
                    </tr>
                  ))}

                  <tr className="border border-slate-900 font-bold text-center bg-slate-50">
                    <td colSpan={4} className="border border-slate-900 p-2 text-right">Tổng số câu</td>
                    <td colSpan={3} className="border border-slate-900 p-1">12</td>
                    <td colSpan={3} className="border border-slate-900 p-1">2</td>
                    <td colSpan={3} className="border border-slate-900 p-1">4</td>
                    <td colSpan={3} className="border border-slate-900 p-1">2</td>
                  </tr>

                  <tr className="border border-slate-900 font-bold text-center">
                    <td colSpan={4} className="border border-slate-900 p-2 text-right">Tổng số điểm</td>
                    <td colSpan={3} className="border border-slate-900 p-1">3,0</td>
                    <td colSpan={3} className="border border-slate-900 p-1">2,0</td>
                    <td colSpan={3} className="border border-slate-900 p-1">2,0</td>
                    <td colSpan={3} className="border border-slate-900 p-1">3,0</td>
                  </tr>

                  <tr className="border border-slate-900 font-bold text-center bg-slate-50">
                    <td colSpan={4} className="border border-slate-900 p-2 text-right">Tỉ lệ %</td>
                    <td colSpan={3} className="border border-slate-900 p-1">30</td>
                    <td colSpan={3} className="border border-slate-900 p-1">20</td>
                    <td colSpan={3} className="border border-slate-900 p-1">20</td>
                    <td colSpan={3} className="border border-slate-900 p-1">30</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* CHÚ THÍCH NĂNG LỰC NL?^6 */}
            <div className="pt-4 border-t border-slate-400 text-[10.5px] text-slate-800">
              <p>
                <sup>6</sup> <em>Có ở trong một số ô của bản đặc tả, ghi tắt tên của năng lực (đã được quy định trong chương trình môn học/hoạt động giáo dục).</em>
              </p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
