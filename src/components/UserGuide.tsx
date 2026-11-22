import React, { useState } from 'react';
import { 
  BookOpen, FileText, RefreshCw, FileSignature, Sparkles, TrendingUp, 
  Box, Brain, FlaskConical, HelpCircle, CheckCircle2, ChevronRight,
  ExternalLink, Key, Sliders, Lightbulb, ShieldCheck, Download
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
              Chào Mừng Đến Với Hệ Thống Trợ Lý Toán Học AI
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Phần mềm đồng hành toàn diện dành cho Quý Thầy/Cô giảng dạy môn Toán và các môn Khoa học.
            </p>
          </div>

          <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 rounded-2xl p-4 space-y-2 text-xs">
            <div className="font-bold text-teal-800 dark:text-teal-300 flex items-center gap-2">
              <Key size={15} />
              <span>Bước đầu tiên: Cấu hình khóa Gemini API</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Hệ thống sử dụng các mô hình AI tiên tiến nhất của Google (<strong>Gemini 3 Flash, Gemini 3 Pro, Gemini 2.5 Flash</strong>). Để bắt đầu sử dụng, Quý Thầy/Cô chỉ cần:
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-slate-600 dark:text-slate-300 font-medium">
              <li>Nhấp vào nút <strong>"Cấu hình AI"</strong> ở góc trên bên phải màn hình.</li>
              <li>Dán khóa API Gemini của bạn vào ô trống. Nếu chưa có, nhấp vào liên kết để lấy khóa miễn phí từ Google AI Studio.</li>
              <li>Bấm <strong>"Lưu cài đặt"</strong>. Khóa sẽ được lưu an toàn trực tiếp trên trình duyệt của bạn.</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">⚡ Tự động phục hồi lỗi (Auto-Fallback)</span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Khi một mô hình AI gặp sự cố hoặc quá tải lượt yêu cầu (15 RPM), hệ thống tự động chuyển sang mô hình dự phòng mà không làm gián đoạn công việc của bạn.
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">📄 Xuất file Word 100% chuẩn định dạng</span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Tất cả đề thi, bảng ma trận và đặc tả đều xuất ra file Word (.docx) kèm bảng biểu chuẩn mực của Bộ GD&ĐT, công thức Toán rõ ràng và hình vẽ độ nét cao.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'cv7991',
      title: '2. Soạn Đề Chuẩn Công Văn 7991',
      icon: <FileText size={17} className="text-teal-600" />,
      badge: 'Trọng tâm',
      content: (
        <div className="space-y-4 text-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              Tạo Đề Thi Theo Cấu Trúc Mới Nhất Của Bộ GD&ĐT (CV 7991)
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Hỗ trợ đầy đủ 4 bước chuyên nghiệp: Khai báo thông tin đề - Lập ma trận động - Lập bản đặc tả - Sinh đề thi 3 phần.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">📋 Bước 1: Khai báo thông tin đề thi</h4>
              <p className="text-slate-600 dark:text-slate-400">
                Nhập tên trường, tổ chuyên môn, tiêu đề đợt kiểm tra, mã đề thi, thời gian làm bài và năm học.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">📊 Bước 2: Thiết lập Ma trận đề thi động</h4>
              <p className="text-slate-600 dark:text-slate-400">
                Phân bổ số lượng câu hỏi theo 4 mức độ nhận thức (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao) cho 3 phần thi:
              </p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5 text-slate-500">
                <li><strong>Phần I:</strong> Trắc nghiệm nhiều lựa chọn (4 phương án A, B, C, D).</li>
                <li><strong>Phần II:</strong> Trắc nghiệm Đúng/Sai (Mỗi câu gồm 4 lệnh hỏi a, b, c, d với độ khó riêng biệt).</li>
                <li><strong>Phần III:</strong> Trắc nghiệm trả lời ngắn (Điền số hoặc phân số/số thập phân ngắn gọn).</li>
              </ul>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">📝 Bước 3: Lập Bản đặc tả ma trận & Ngữ cảnh gợi ý</h4>
              <p className="text-slate-600 dark:text-slate-400">
                Hệ thống tích hợp sẵn danh mục hàng chục ngữ cảnh đề thi chuẩn SGK Kết nối tri thức (Bảng biến thiên, đồ thị, tiệm cận, bài toán thực tế tối ưu kinh tế, chuyển động vật lý, hình không gian Oxyz...).
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">🚀 Bước 4: Tạo đề thi bằng AI & Xuất Word</h4>
              <p className="text-slate-600 dark:text-slate-400">
                AI sẽ tự động biên soạn toàn bộ đề thi kèm bảng đáp án và hướng dẫn giải chi tiết. Bạn có thể xuất file Word chứa đầy đủ cả <strong>Ma trận + Bản đặc tả + Đề thi + Đáp án</strong> chỉ với 1 cú nhấp chuột.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'similar',
      title: '3. Tạo Đề Tương Tự Từ File Sẵn',
      icon: <RefreshCw size={17} className="text-emerald-600" />,
      content: (
        <div className="space-y-4 text-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              Nhân Bản Đề Thi Tương Đương Bằng AI
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Tạo ra các bộ đề mới có cùng cấu trúc, dạng bài và mức độ khó nhưng thay đổi số liệu và ngữ cảnh hỏi.
            </p>
          </div>

          <div className="space-y-2 text-slate-600 dark:text-slate-300">
            <p><strong>Cách thực hiện:</strong></p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Tải lên file đề thi gốc (hỗ trợ file Word <strong>.docx</strong>, file <strong>PDF</strong> hoặc <strong>ảnh chụp đề</strong>).</li>
              <li>Chọn số lượng đề cần tạo (1, 2 hoặc nhiều đề).</li>
              <li>Cấu hình các tùy chọn thông minh:
                <ul className="list-disc pl-5 mt-1 text-slate-500 space-y-0.5">
                  <li><strong>Kèm đáp án ngắn gọn:</strong> Tự động bổ sung bảng đáp án ở cuối tài liệu.</li>
                  <li><strong>Ưu tiên bài toán thực tế:</strong> Lồng ghép bối cảnh đời sống vào các câu hỏi.</li>
                  <li><strong>Không chứa tham số m:</strong> Phù hợp cho kiểm tra định kỳ không thiên về biến đổi đại số dài.</li>
                </ul>
              </li>
              <li>Bấm <strong>"Tiến hành tạo đề tương tự"</strong> và tải file Word hoàn chỉnh về máy.</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'standardize',
      title: '4. Chuẩn Hóa Đề Thi & OCR',
      icon: <FileSignature size={17} className="text-sky-600" />,
      content: (
        <div className="space-y-4 text-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              Chuyển Đổi Mọi Định Dạng Đề Thi Sang Chuẩn LaTeX & 3 Phần
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Bóc tách thông minh từ file PDF, ảnh scan hoặc tài liệu Word cũ (chứa MathType, MathML) sang đề thi chuẩn mực.
            </p>
          </div>

          <div className="space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
            <p><strong>Điểm nổi bật:</strong></p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li><strong>OCR Toán học chính xác:</strong> Nhận diện công thức phức tạp (tích phân, căn thức, ma trận, phân số, giới hạn) và chuyển sang mã LaTeX chuẩn ($...$).</li>
              <li><strong>Tự động phân loại 3 phần:</strong> Chuyển các câu hỏi rời rạc vào đúng 3 phần: Trắc nghiệm 4 lựa chọn, Trắc nghiệm Đúng/Sai và Trả lời ngắn.</li>
              <li><strong>Tự động gắn thẻ nhận thức:</strong> AI đánh giá độ khó và gắn thẻ [B] Nhận biết, [H] Thông hiểu, [VD] Vận dụng cho từng câu hỏi.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'correction',
      title: '5. Sửa Lỗi Văn Bản & Cú Pháp LaTeX',
      icon: <Sparkles size={17} className="text-amber-600" />,
      content: (
        <div className="space-y-4 text-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              Công Cụ Sửa Lỗi Chuyên Sâu Cho Giáo Viên
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Gộp chung 2 chế độ xử lý văn bản tiếng Việt và công thức toán học với bảng đối chiếu trực quan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-teal-700 dark:text-teal-300 block mb-1">📝 Chế độ Chuẩn hóa Tiếng Việt</span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Tự động tìm và sửa lỗi chính tả, đánh máy sai, viết hoa không đúng quy tắc, diễn đạt lủng củng nhưng bảo toàn 100% nội dung bài toán.
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-1">🔢 Chế độ Sửa Cú Pháp LaTeX</span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Phát hiện lỗi thiếu ngoặc {'{}'}, thiếu dấu $, gõ sai lệnh \frac, lỗi khoảng trắng... AI chỉ sửa lỗi cú pháp code, tuyệt đối không giải toán.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'math_tools',
      title: '6. Bảng Biến Thiên & Hình Học 3D (300 DPI)',
      icon: <TrendingUp size={17} className="text-indigo-600" />,
      badge: '300 DPI',
      content: (
        <div className="space-y-4 text-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              Đồ Họa Toán Học Chuẩn Sư Phạm Độ Nét Cao
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Xuất ảnh độ phân giải 300 DPI, in ấn sắc nét trên giấy kiểm tra, không bị nhòe hay vỡ hình.
            </p>
          </div>

          <div className="space-y-2 text-slate-600 dark:text-slate-300">
            <p><strong>Các công cụ mạnh mẽ:</strong></p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Bảng biến thiên tự động:</strong> Chỉ cần nhập hệ số của hàm số (bậc ba, trùng phương, nhất biến, phân thức), hệ thống tự tính đạo hàm, nghiệm, dấu và vẽ BBT chuẩn SGK.</li>
              <li><strong>Đồ thị hàm số Oxy:</strong> Vẽ đồ thị trực quan, hiển thị trục tọa độ, các điểm cực trị, giao điểm và tiệm cận.</li>
              <li><strong>Dựng hình không gian 3D:</strong> Chóp tam giác, chóp tứ giác, hình lăng trụ, hình hộp với tính năng xoay 360 độ và điều chỉnh góc nhìn trước khi xuất ảnh.</li>
              <li><strong>Khối tròn xoay Ox & GeoGebra AI:</strong> Tự động tính thể tích tròn xoay và mô phỏng 3D trực quan.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'utilities',
      title: '7. Tiện Ích Dạy Học (Giáo Án, Mindmap, Mô Phỏng)',
      icon: <FlaskConical size={17} className="text-pink-600" />,
      content: (
        <div className="space-y-4 text-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              Kho Tiện Ích Đổi Mới Phương Pháp Giảng Dạy
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Hỗ trợ giáo viên trong mọi khâu chuẩn bị bài giảng hiện đại và hấp dẫn.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">📚 Soạn Giáo Án GDPT 2018 (CV 5512)</span>
              <p className="text-slate-500 dark:text-slate-400">
                Tự động lập kế hoạch bài dạy chi tiết từng tiết học theo tiến trình 4 hoạt động: Khởi động - Hình thành kiến thức - Luyện tập - Vận dụng, tích hợp ứng dụng công nghệ và năng lực số.
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">🧠 Sơ Đồ Tư Duy (Mindmap)</span>
              <p className="text-slate-500 dark:text-slate-400">
                Tóm tắt cấu trúc lý thuyết của toàn bài học thành sơ đồ tư duy phân nhánh trực quan, hỗ trợ trình chiếu và xuất ảnh sắc nét.
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">🎨 Tạo Ảnh Giáo Dục Bằng AI</span>
              <p className="text-slate-500 dark:text-slate-400">
                Tạo hình ảnh minh họa cho các bài toán thực tế (bài toán cây cầu parabol, ngọn hải đăng, trò chơi học tập) bằng Google Imagen 3 và Flux.
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">🔬 Mô Phỏng Tương Tác HTML5</span>
              <p className="text-slate-500 dark:text-slate-400">
                Mô phỏng thí nghiệm toán học có thanh trượt điều khiển tham số, trực quan hóa chuyển động và quy luật toán học.
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentGuide = GUIDES.find(g => g.id === activeSection) || GUIDES[0];

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-120px)] animate-fade-in font-sans">
      
      {/* SIDEBAR MỤC LỤC HƯỚNG DẪN */}
      <div className="w-full lg:w-72 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-3 flex flex-col shrink-0">
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-2 flex items-center gap-2">
          <BookOpen size={17} className="text-teal-600 dark:text-teal-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Cẩm Nang Hướng Dẫn
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
          {GUIDES.map(guide => {
            const isActive = guide.id === activeSection;
            return (
              <button
                key={guide.id}
                onClick={() => setActiveSection(guide.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all ${
                  isActive
                    ? 'bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/70 dark:text-teal-200 dark:border-teal-800 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="shrink-0">{guide.icon}</span>
                  <span className="truncate">{guide.title}</span>
                </div>
                {guide.badge && (
                  <span className="ml-1 text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-teal-600 text-white shrink-0">
                    {guide.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-slate-100 dark:border-slate-800 mt-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center">
          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Cần hỗ trợ trực tiếp?</p>
          <p className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold mt-0.5">
            GV Lê Vĩnh Phúc • 0944405124
          </p>
        </div>
      </div>

      {/* KHUNG NỘI DUNG CHI TIẾT */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-4 sm:p-6 overflow-y-auto custom-scrollbar">
        {currentGuide.content}
      </div>

    </div>
  );
}
