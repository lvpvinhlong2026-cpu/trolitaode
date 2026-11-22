import React, { useState } from 'react';
import { 
  FileText, 
  RefreshCw, 
  Sparkles, 
  TrendingUp, 
  Box, 
  HelpCircle, 
  CheckCircle2, 
  Key, 
  Sliders, 
  Download,
  Copy,
  MousePointer
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  badge?: string;
  content: React.ReactNode;
}

export default function UserGuide() {
  const [activeSection, setActiveSection] = useState<string>('intro');

  const GUIDES: GuideSection[] = [
    {
      id: 'intro',
      title: '1. Giới thiệu & Cấu hình AI',
      icon: <HelpCircle size={17} className="text-teal-600" />,
      content: (
        <div className="space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              Chào Mừng Đến Với TRỢ LÍ TẠO ĐỀ
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Hệ thống chuyên sâu khảo thí và biên soạn đề kiểm tra chuẩn cấu trúc mới của Bộ Giáo dục & Đào tạo.
            </p>
          </div>

          <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 rounded-2xl p-4 space-y-2 text-xs">
            <div className="font-bold text-teal-800 dark:text-teal-300 flex items-center gap-2">
              <Key size={15} />
              <span>Cấu hình khóa Gemini API (Gemini 3 Pro / 3 Flash / 2.5 Flash)</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Hệ thống tích hợp cơ chế <strong>Auto-Fallback tự động</strong>. Thứ tự ưu tiên mô hình:
              <br />
              <code>Gemini 3 Pro ➔ Gemini 3 Flash ➔ Gemini 2.5 Flash ➔ Local Fallback</code>.
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-slate-600 dark:text-slate-300 font-medium">
              <li>Nhấp vào nút <strong>"Cấu hình AI"</strong> trên thanh công cụ phía trên.</li>
              <li>Dán khóa API Gemini của bạn vào ô trống (lấy miễn phí từ Google AI Studio).</li>
              <li>Bấm <strong>"Lưu cài đặt"</strong>. Hệ thống tự động chuyển mô hình khi gặp giới hạn hạn mức mà không bao giờ báo lỗi ra màn hình.</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">⚡ Tự động phục hồi lỗi (Zero-Error UX)</span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Khi một mô hình AI quá tải, hệ thống tự động đổi sang mô hình tiếp theo trong chuỗi fallback, đảm bảo công việc của Quý Thầy/Cô không bao giờ bị gián đoạn.
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">📄 Xuất file Word 100% chuẩn Bộ GD&ĐT</span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Tất cả đề thi, bảng ma trận và bản đặc tả đều xuất ra file Word (.docx) chuẩn mực, công thức Toán rõ ràng và hình vẽ độ nét cao 300 DPI.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'cv7991',
      title: '2. Đề Thi Chuẩn Công Văn 7991',
      icon: <FileText size={17} className="text-teal-600" />,
      badge: 'Trọng tâm',
      content: (
        <div className="space-y-4 text-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              Tạo Đề Thi Chuẩn 4 Phần & Khóa Chặt 10.0 Điểm
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Bám sát quy định chuẩn Công văn 7991/BGDĐT-GDTrH với tỉ lệ 40% Nhận biết – 30% Thông hiểu – 30% Vận dụng.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">📋 Cấu trúc 4 phần của đề thi:</h4>
              <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-600 dark:text-slate-400">
                <li><strong>Phần I:</strong> 12 câu trắc nghiệm nhiều lựa chọn (A, B, C, D) – 3.0 điểm.</li>
                <li><strong>Phần II:</strong> 4 câu trắc nghiệm Đúng/Sai (mỗi câu gồm 4 ý a, b, c, d với barem bậc thang: 1 ý đúng 0.1đ, 2 ý 0.25đ, 3 ý 0.5đ, 4 ý 1.0đ) – 4.0 điểm.</li>
                <li><strong>Phần III:</strong> 6 câu trắc nghiệm trả lời ngắn (điền kết quả ngắn gọn) – 3.0 điểm.</li>
                <li><strong>Phần IV (Tùy chọn):</strong> Tự luận vận dụng thực tiễn kèm rubric barem điểm thành phần.</li>
              </ul>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">🔀 Trộn 4 mã đề & Thi thử trực tuyến:</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Hệ thống tự động đảo câu hỏi và đáp án ra 4 mã đề (101, 102, 103, 104) kèm phiếu soi đáp án tiện lợi. Học sinh có thể làm bài trực tuyến và hệ thống tự động chấm điểm ngay lập tức.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'matrix',
      title: '3. Ma Trận & Bản Đặc Tả 10.0đ',
      icon: <Sliders size={17} className="text-purple-600" />,
      content: (
        <div className="space-y-4 text-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              Ma Trận Đề Thi & Bản Đặc Tả YCCĐ
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Kiểm chuẩn khoa học theo từng chủ đề bài học và phân loại mức độ nhận thức.
            </p>
          </div>

          <div className="space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
            <p><strong>Tính năng cốt lõi:</strong></p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li><strong>Tự động cân bằng điểm số:</strong> Khóa chặt tổng điểm 10.0đ, tự động tính tổng số câu Nhận biết, Thông hiểu, Vận dụng.</li>
              <li><strong>Bản đặc tả chi tiết:</strong> Tự động sinh yêu cầu cần đạt (YCCĐ) theo Chương trình GDPT 2018 cho từng câu hỏi.</li>
              <li><strong>Xuất phụ lục Word:</strong> Tải riêng Phụ lục 1 (Ma trận) và Phụ lục 2 (Bản đặc tả) chuẩn quy cách Bộ GD&ĐT.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'math_tools',
      title: '4. Đồ Thị Oxy & Hình Học 3D (Cắt Sát Viền 24px)',
      icon: <TrendingUp size={17} className="text-blue-600" />,
      badge: '300 DPI',
      content: (
        <div className="space-y-4 text-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              Đồ Họa Toán Học 300 DPI – Tối Ưu Hóa Dán Word
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Tự động cắt sát bao hình với lề đệm ~24px, loại bỏ khoảng trắng thừa để khi dán vào Word hình vẽ luôn to lớn, đậm nét và sắc sảo.
            </p>
          </div>

          <div className="space-y-2 text-slate-600 dark:text-slate-300">
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Bảng biến thiên chuẩn SGK:</strong> Tự động phân tích chiều biến thiên, nghiệm cực trị và vẽ BBT nét chuẩn cho các dạng hàm bậc ba, trùng phương, phân thức bậc nhất/bậc nhất, bậc hai/bậc nhất.</li>
              <li><strong>Đồ thị hàm số Oxy:</strong> Đồ thị phân giải cao 300 DPI, hiển thị trục tọa độ, cực trị, giao điểm, tiệm cận.</li>
              <li><strong>Dựng hình học 3D & GeoGebra:</strong> Dựng hình chóp, hình lăng trụ, khối tròn xoay với khả năng xoay 3D trực quan và xuất mã lệnh GeoGebra.</li>
              <li><strong>Sao chép 1 chạm:</strong> Nhấn "Copy ảnh (Ctrl+V vào Word)" để dán trực tiếp vào đề thi Word không lo bị co nhỏ hình.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'actions',
      title: '5. Thao Tác Chuẩn: Thêm – Xóa – Làm Lại',
      icon: <MousePointer size={17} className="text-amber-600" />,
      content: (
        <div className="space-y-4 text-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              Đồng Bộ Thao Tác Bằng Nút Bấm & Bằng Chuột
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Mọi tab trong hệ thống đều hỗ trợ bộ 3 thao tác cơ bản theo quy định.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800/60">
              <span className="font-bold text-teal-800 dark:text-teal-300 block mb-1">➕ Thêm (Add)</span>
              <p className="text-slate-600 dark:text-slate-400">
                Bấm nút "Thêm" trên thanh Ribbon hoặc nhấn <code>Ctrl + Alt + N</code> để thêm câu hỏi/dòng ma trận.
              </p>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800/60">
              <span className="font-bold text-rose-800 dark:text-rose-300 block mb-1">🗑️ Xóa (Delete)</span>
              <p className="text-slate-600 dark:text-slate-400">
                Bấm nút "Xóa" trên Ribbon hoặc nhấn <code>Ctrl + Alt + Del</code> để xóa bớt mục hoặc làm sạch nội dung.
              </p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60">
              <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1">🔄 Làm lại (Reset)</span>
              <p className="text-slate-600 dark:text-slate-400">
                Bấm nút "Làm lại" hoặc nhấn <code>Ctrl + Alt + R</code> để khôi phục về đề mẫu chuẩn CV 7991 ban đầu.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              💡 <strong>Mẹo thao tác chuột:</strong> Quý Thầy/Cô chỉ cần <strong>nhấp chuột phải</strong> vào bất kỳ vị trí nào trên màn hình làm việc để mở menu thao tác nhanh Thêm, Xóa, Làm lại và Sao chép ảnh chuẩn Word 300 DPI.
            </p>
          </div>
        </div>
      )
    }
  ];

  const currentSection = GUIDES.find(g => g.id === activeSection) || GUIDES[0];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-6">
      <div>
        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <HelpCircle size={20} className="text-teal-600" />
          <span>Cẩm Nang Hướng Dẫn Sử Dụng TRỢ LÍ TẠO ĐỀ</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Tài liệu hướng dẫn chi tiết từng chức năng khảo thí, biên soạn đề kiểm tra chuẩn Công văn 7991 và đồ thị 300 DPI.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Navigation list bên trái */}
        <div className="md:col-span-4 space-y-1.5">
          {GUIDES.map(guide => {
            const isSelected = guide.id === activeSection;
            return (
              <button
                key={guide.id}
                onClick={() => setActiveSection(guide.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition text-left ${
                  isSelected
                    ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/70 dark:text-teal-200 border border-teal-300 dark:border-teal-700 shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span>{guide.icon}</span>
                  <span>{guide.title}</span>
                </div>
                {guide.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-teal-600 text-white shrink-0">
                    {guide.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Nội dung chi tiết bên phải */}
        <div className="md:col-span-8 p-5 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 min-h-[420px]">
          {currentSection.content}
        </div>
      </div>
    </div>
  );
}
