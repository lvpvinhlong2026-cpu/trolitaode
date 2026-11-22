import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Clipboard, 
  Sparkles, 
  Check, 
  X, 
  BookOpen, 
  ListChecks, 
  ChevronRight,
  Layers,
  ArrowRight,
  Search,
  CheckCircle2
} from 'lucide-react';
import { 
  parseTextbookContent, 
  BookParseResult, 
  ParsedLessonItem, 
  PRESET_TEXTBOOKS 
} from '../utils/bookParser';

interface BookUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLesson: (lesson: ParsedLessonItem, parseMeta: { subject: string; grade: string; series: string }) => void;
}

export const BookUploadModal: React.FC<BookUploadModalProps> = ({
  isOpen,
  onClose,
  onSelectLesson
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'presets'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [parseResult, setParseResult] = useState<BookParseResult | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Khởi tạo sẵn một mẫu khi mở modal nếu chưa có
  useEffect(() => {
    if (isOpen && !parseResult) {
      const defaultPreset = PRESET_TEXTBOOKS[0];
      const result = parseTextbookContent(defaultPreset.sampleContent);
      setParseResult(result);
      if (result.lessons.length > 0) {
        setSelectedLessonId(result.lessons[result.lessons.length > 13 ? 13 : 0].id); // mặc định Bài 18
      }
    }
  }, [isOpen, parseResult]);

  if (!isOpen) return null;

  // Xử lý đọc file (Text, Docx, PDF text, TXT, JSON)
  const handleProcessFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      const result = parseTextbookContent(content);
      setParseResult(result);
      if (result.lessons.length > 0) {
        setSelectedLessonId(result.lessons[0].id);
      }
      setIsProcessing(false);
    };

    reader.onerror = () => {
      alert('Không thể đọc file. Vui lòng thử lại với file định dạng .txt hoặc dán nội dung.');
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  // Drag and drop handlers
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
      const file = e.dataTransfer.files[0];
      handleProcessFile(file);
    }
  };

  // Paste from clipboard
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPastedText(text);
        handleAnalyzeText(text);
      }
    } catch {
      alert('Vui lòng nhấn phím tắt Ctrl+V / Command+V vào ô nhập bên dưới.');
    }
  };

  const handleAnalyzeText = (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    const result = parseTextbookContent(text);
    setParseResult(result);
    if (result.lessons.length > 0) {
      setSelectedLessonId(result.lessons[0].id);
    }
    setIsProcessing(false);
  };

  const handleSelectPreset = (preset: typeof PRESET_TEXTBOOKS[0]) => {
    setPastedText(preset.sampleContent);
    const result = parseTextbookContent(preset.sampleContent);
    setParseResult(result);
    // Chọn bài học phù hợp
    const target = result.lessons.find(l => l.lessonNumber.includes('18') || l.lessonNumber.includes('3')) || result.lessons[0];
    if (target) setSelectedLessonId(target.id);
  };

  const handleConfirmSelection = () => {
    if (!parseResult) return;
    const chosen = parseResult.lessons.find(l => l.id === selectedLessonId) || parseResult.lessons[0];
    if (chosen) {
      onSelectLesson(chosen, {
        subject: parseResult.detectedSubject,
        grade: parseResult.detectedGrade,
        series: parseResult.detectedSeries
      });
      onClose();
    }
  };

  const filteredLessons = parseResult?.lessons.filter(l =>
    !searchFilter ||
    l.lessonNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
    l.lessonTitle.toLowerCase().includes(searchFilter.toLowerCase())
  ) || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[92vh] border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
      >
        
        {/* HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">
                  Tải Sách Lên & Tự Động Lọc Bài Số ... Và Tên Bài Học
                </h3>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Chuẩn GDPT 2018
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Kéo thả file sách, duyệt tệp máy tính hoặc copy/paste văn bản mục lục sách giáo khoa.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 PHƯƠNG THỨC TẢI LÊN (TABS) */}
        <div className="flex items-center gap-2 pt-3 pb-2 border-b border-slate-100 text-xs">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
              activeTab === 'upload' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>1. Kéo Thả & Tải File</span>
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
              activeTab === 'paste' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>2. Dán / Copy-Paste Mục Lục</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
              activeTab === 'presets' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>3. Mẫu Mục Lục SGK Có Sẵn</span>
          </button>
        </div>

        {/* VÙNG NHẬP LIỆU THEO TAB */}
        <div className="py-3">
          {activeTab === 'upload' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[150px] ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/50 bg-slate-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.docx,.doc,.json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleProcessFile(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2 shadow-inner">
                <Upload className="w-6 h-6" />
              </div>
              <p className="font-bold text-sm text-slate-800">
                Kéo thả file sách giáo khoa / tài liệu vào đây
              </p>
              <p className="text-xs text-slate-500 mt-1">
                hoặc <span className="text-blue-600 underline font-semibold">bấm vào đây để chọn file</span> từ máy tính (.txt, .pdf, .docx, .json)
              </p>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Dán danh sách mục lục sách giáo khoa:</span>
                <button
                  onClick={handlePasteClipboard}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Dán nhanh từ Clipboard</span>
                </button>
              </div>
              <textarea
                rows={4}
                value={pastedText}
                onChange={(e) => {
                  setPastedText(e.target.value);
                  handleAnalyzeText(e.target.value);
                }}
                placeholder="Dán nội dung mục lục vào đây (ví dụ: Bài 3: Giá trị lớn nhất và giá trị nhỏ nhất của hàm số (2 tiết)...)"
                className="w-full text-xs p-3 border border-slate-300 rounded-xl font-mono leading-relaxed focus:ring-1 focus:ring-blue-500 bg-slate-50/30"
              />
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {PRESET_TEXTBOOKS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  className="text-left p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50/60 hover:border-blue-300 transition"
                >
                  <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    {p.subject} • {p.grade}
                  </span>
                  <h4 className="font-bold text-xs text-slate-900 mt-1.5 leading-snug line-clamp-2">
                    {p.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 italic">
                    Bộ sách: {p.series}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* KẾT QUẢ TỰ ĐỘNG LỌC: BÀI SỐ ... VÀ TÊN BÀI HỌC */}
        <div className="flex-1 overflow-hidden flex flex-col border-t border-slate-200 pt-3 min-h-[220px]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
              <ListChecks className="w-4 h-4 text-emerald-600" />
              <span>Kết quả nhận diện tự động ({filteredLessons.length} bài học)</span>
            </span>

            {/* Ô TÌM KIẾM NHANH BÀI SỐ */}
            <div className="flex items-center gap-2">
              <div className="relative w-44">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                <input
                  type="text"
                  placeholder="Lọc bài số / tên..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {parseResult && (
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
                    {parseResult.detectedSubject} ({parseResult.detectedGrade})
                  </span>
                  <span className="bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                    {parseResult.detectedSeries}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-xl p-2 bg-slate-50/40">
            {isProcessing ? (
              <div className="text-center py-8 text-xs text-slate-500">
                Đang quét và lọc tự động Bài số và Tên bài học...
              </div>
            ) : filteredLessons.length > 0 ? (
              filteredLessons.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedLessonId(item.id)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between gap-3 ${
                    selectedLessonId === item.id
                      ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-semibold shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono font-bold px-2 py-1 rounded bg-slate-100 text-blue-700 shrink-0 border border-slate-200">
                      {item.lessonNumber}
                    </span>
                    <div className="truncate">
                      <span className="block truncate font-bold text-slate-900">{item.lessonTitle}</span>
                      {item.chapterOrTopic && (
                        <span className="text-[10px] text-slate-500 truncate block">
                          Thuộc: {item.chapterOrTopic}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.estimatedPeriods && (
                      <span className="text-[10px] font-mono text-slate-500">
                        {item.estimatedPeriods} tiết
                      </span>
                    )}
                    {selectedLessonId === item.id && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-xs text-slate-400 italic">
                Không tìm thấy bài học phù hợp. Vui lòng thử từ khóa khác hoặc tải lên mục lục mới.
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3 text-xs">
          <p className="text-slate-500 text-[11px] truncate">
            {selectedLessonId && parseResult ? (
              <span>Đã chọn: <strong className="text-slate-900">{parseResult.lessons.find(l => l.id === selectedLessonId)?.fullLessonName}</strong></span>
            ) : (
              <span>Chọn bài học để cập nhật tự động vào toàn bộ KHBD 5512, Slide và Đề thi 7991.</span>
            )}
          </p>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmSelection}
              disabled={!selectedLessonId}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold shadow transition flex items-center gap-1.5"
            >
              <span>Áp Dụng Bài Học Này</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
