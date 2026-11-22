import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Sparkles, 
  FileText, 
  Clipboard, 
  Check, 
  ChevronRight, 
  BookOpen, 
  ArrowRight,
  ListFilter,
  CheckCircle2,
  FileCheck,
  Search
} from 'lucide-react';
import { 
  parseTextbookContent, 
  BookParseResult, 
  ParsedLessonItem, 
  PRESET_TEXTBOOKS 
} from '../utils/bookParser';

interface QuickBookUploadBarProps {
  currentLessonName: string;
  currentSubject: string;
  currentGrade: string;
  onSelectLesson: (lesson: ParsedLessonItem, meta: { subject: string; grade: string; series: any }) => void;
  onOpenFullModal: () => void;
}

export const QuickBookUploadBar: React.FC<QuickBookUploadBarProps> = ({
  currentLessonName,
  currentSubject,
  currentGrade,
  onSelectLesson,
  onOpenFullModal
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [recentParseResult, setRecentParseResult] = useState<BookParseResult | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [showQuickList, setShowQuickList] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Xử lý đọc file kéo thả hoặc chọn qua input
  const processFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      const result = parseTextbookContent(content);
      setRecentParseResult(result);
      setShowQuickList(true);
      setIsProcessing(false);

      if (result.lessons.length > 0) {
        showToast(`Đã tự động lọc thành công ${result.lessons.length} bài học từ ${file.name}!`);
      } else {
        showToast('Không tìm thấy mục lục bài học rõ ràng. Bạn có thể dán trực tiếp tên bài.');
      }
    };

    reader.onerror = () => {
      setIsProcessing(false);
      alert('Không thể đọc file. Vui lòng chọn file văn bản (.txt, .docx, .json) hoặc dán mục lục.');
    };

    reader.readAsText(file);
  };

  // Drag and Drop
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Paste from clipboard
  const handleQuickPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || text.trim().length === 0) {
        onOpenFullModal();
        return;
      }
      setIsProcessing(true);
      const result = parseTextbookContent(text);
      setRecentParseResult(result);
      setShowQuickList(true);
      setIsProcessing(false);

      if (result.lessons.length > 0) {
        showToast(`Đã tự động lọc thành công ${result.lessons.length} bài học từ Clipboard!`);
      } else {
        onOpenFullModal();
      }
    } catch {
      onOpenFullModal();
    }
  };

  const handleSelectLessonItem = (lesson: ParsedLessonItem) => {
    const meta = {
      subject: recentParseResult?.detectedSubject || currentSubject,
      grade: recentParseResult?.detectedGrade || currentGrade,
      series: recentParseResult?.detectedSeries || 'Kết Nối Tri Thức'
    };
    onSelectLesson(lesson, meta);
    showToast(`Đã áp dụng: ${lesson.fullLessonName}`);
  };

  const filteredLessons = recentParseResult?.lessons.filter(l => 
    !searchFilter || 
    l.lessonNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
    l.lessonTitle.toLowerCase().includes(searchFilter.toLowerCase())
  ) || [];

  if (isCollapsed) {
    return (
      <div className="bg-white/90 backdrop-blur-xs rounded-2xl border border-slate-200/90 shadow-xs px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs no-print hover:border-slate-300 transition">
        <div className="flex items-center gap-2.5 text-slate-700 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <span className="truncate">
            Bài đang soạn: <strong className="text-slate-900">{currentLessonName || 'Chưa chọn bài'}</strong> 
            <span className="text-slate-400 mx-1.5">•</span> 
            <span className="text-slate-500 font-medium">{currentSubject} ({currentGrade})</span>
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsCollapsed(false)}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold px-2.5 py-1 rounded-lg hover:bg-blue-50 transition text-[11px]"
          >
            <Upload className="w-3 h-3" />
            <span>Đổi bài / Tải sách</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 space-y-3 no-print relative">
      
      {/* TOAST THÔNG BÁO TỰ ĐỘNG LỌC */}
      {toastMessage && (
        <div className="absolute top-2 right-4 z-40 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER BAR CỦA QUICK UPLOAD CÓ NÚT THU GỌN */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          <span className="text-xs font-bold text-slate-800">Khu Vực Nạp Sách Giáo Khoa & Tự Động Lọc Bài Học</span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-[11px] text-slate-500 hover:text-slate-800 font-medium px-2 py-0.5 rounded hover:bg-slate-100 transition"
          title="Thu gọn khu vực này để tăng diện tích hiển thị bài soạn"
        >
          Thu gọn ✕
        </button>
      </div>

      {/* KHU VỰC KÉO THẢ TÀI LIỆU & NÚT TẢI LÊN MŨI TÊN */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* DROPZONE KÉO THẢ FILE TRỰC TIẾP */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition cursor-pointer ${
            isDragging 
              ? 'border-blue-500 bg-blue-50/80 scale-[0.99]' 
              : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 bg-slate-50/50'
          }`}
          title="Kéo thả file sách giáo khoa vào đây, hoặc click để chọn tệp từ máy tính"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,.docx,.doc,.json"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                processFile(e.target.files[0]);
              }
            }}
          />

          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm hover:scale-105 transition">
            <Upload className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                Kéo thả file sách / tài liệu vào đây
              </span>
              <span className="text-[10px] font-mono uppercase bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-semibold">
                Auto-Filter
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              hoặc bấm vào mũi tên tải lên (.pdf, .txt, .docx, .json) để hệ thống tự động lọc ra <strong className="text-blue-700">Bài số ...</strong> và <strong className="text-blue-700">Tên bài học</strong>
            </p>
          </div>
        </div>

        {/* CÁC PHƯƠNG THỨC NHẬP NHANH BỔ SUNG */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* NÚT PASTE / DÁN MỤC LỤC TỪ CLIPBOARD */}
          <button
            onClick={handleQuickPaste}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition"
            title="Dán nhanh nội dung mục lục đã copy từ clipboard"
          >
            <Clipboard className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Dán Mục Lục</span>
            <span className="text-[10px] font-mono text-slate-400">(Ctrl+V)</span>
          </button>

          {/* MỞ MODAL ĐẦY ĐỦ */}
          <button
            onClick={onOpenFullModal}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition"
            title="Mở bảng điều khiển tải sách & chọn mẫu có sẵn"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Mục Lục & Mẫu SGK</span>
          </button>
        </div>

      </div>

      {/* TRẠNG THÁI BÀI HỌC HIỆN TẠI & KẾT QUẢ ĐÃ LỌC TỰ ĐỘNG */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
        
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-slate-500 font-medium">Đang áp dụng:</span>
          <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 truncate max-w-md">
            {currentLessonName}
          </span>
          <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
            ({currentSubject} • {currentGrade})
          </span>
        </div>

        {/* NẾU ĐÃ CÓ KẾT QUẢ LỌC TỰ ĐỘNG */}
        {recentParseResult && recentParseResult.lessons.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>Đã lọc {recentParseResult.lessons.length} bài học</span>
            </span>

            <button
              onClick={() => setShowQuickList(!showQuickList)}
              className="text-blue-600 hover:text-blue-800 font-bold text-xs underline flex items-center gap-1"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>{showQuickList ? 'Ẩn danh sách bài' : 'Xem danh sách bài'}</span>
            </button>
          </div>
        )}
      </div>

      {/* DANH SÁCH BÀI HỌC ĐÃ TỰ ĐỘNG LỌC RA (CHO PHÉP CHỌN NGAY) */}
      {showQuickList && recentParseResult && (
        <div className="pt-2 border-t border-slate-100 space-y-2">
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-slate-700">
                Danh sách bài học tự động lọc từ {recentParseResult.bookTitle}:
              </span>
            </div>

            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Tìm bài số hoặc tên..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {filteredLessons.map((l) => {
              const isSelected = currentLessonName.toLowerCase().includes(l.lessonTitle.toLowerCase()) ||
                                 currentLessonName.toLowerCase().includes(l.lessonNumber.toLowerCase());
              return (
                <button
                  key={l.id}
                  onClick={() => handleSelectLessonItem(l)}
                  className={`text-left p-2 rounded-xl border text-xs transition flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 font-bold text-blue-900 ring-1 ring-blue-400'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-white text-blue-700 border border-slate-200 shrink-0 text-[11px]">
                      {l.lessonNumber}
                    </span>
                    <span className="truncate">{l.lessonTitle}</span>
                  </div>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
};
