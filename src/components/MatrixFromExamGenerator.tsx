import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  FileText, 
  Sparkles, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  Check, 
  ArrowRight,
  Layers,
  FileCheck2,
  Image as ImageIcon,
  Scan,
  BookOpen,
  Filter,
  Sliders,
  Type,
  TrendingUp,
  Table as TableIcon,
  Box
} from 'lucide-react';
import mammoth from 'mammoth';
import { ExamCV7991, MatrixTopicRow, SpecificationDetail, CognitiveLevel } from '../types/pedagogy';
import { callGeminiAI } from '../utils/gemini';
import { exportMatrixSpecToWord } from '../utils/exportWord';
import { IntegratedDiagramModal, DiagramToolTab } from './IntegratedDiagramModal';

interface MatrixFromExamGeneratorProps {
  apiKey: string;
  model: string;
  onApplyExam?: (exam: ExamCV7991) => void;
  onNavigateToMatrix?: () => void;
}

export const MatrixFromExamGenerator: React.FC<MatrixFromExamGeneratorProps> = ({
  apiKey,
  model,
  onApplyExam,
  onNavigateToMatrix
}) => {
  // Input states
  const [examText, setExamText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<'docx' | 'doc' | 'pdf' | 'image' | 'scan' | 'text'>('text');
  const [base64File, setBase64File] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Metadata states
  const [subject, setSubject] = useState<string>('Toán học');
  const [grade, setGrade] = useState<string>('12');
  const [term, setTerm] = useState<'Giữa Học kỳ 1' | 'Cuối Học kỳ 1' | 'Giữa Học kỳ 2' | 'Cuối Học kỳ 2'>('Cuối Học kỳ 1');
  const [examTitle, setExamTitle] = useState<string>('ĐỀ KIỂM TRA ĐỊNH KÌ THEO CÔNG VĂN 7991');
  const [durationMinutes, setDurationMinutes] = useState<number>(90);

  // Processing states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [generatedExam, setGeneratedExam] = useState<ExamCV7991 | null>(null);
  const [activeTab, setActiveTab] = useState<'matrix' | 'specs' | 'questions'>('matrix');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // State điều khiển modal tích hợp 3 công cụ vẽ ảnh 300 DPI
  const [diagramModalOpen, setDiagramModalOpen] = useState<boolean>(false);
  const [diagramTab, setDiagramTab] = useState<DiagramToolTab>('graph');

  const handleOpenDiagramModal = (tab: DiagramToolTab) => {
    setDiagramTab(tab);
    setDiagramModalOpen(true);
  };

  const handleInsertDiagramToExam = (dataUrl: string) => {
    const imgMarkdown = `\n\n![Hình vẽ minh họa](${dataUrl})\n\n`;
    setExamText(prev => prev + imgMarkdown);
    showNotification('Đã chèn ảnh đồ họa 300 DPI vào nội dung đề thi!');
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Xử lý nạp file thuộc 1 trong 5 loại: PDF, .DOC, .DOCX, ẢNH, SCAN
  const handleFileUpload = async (file: File) => {
    try {
      const name = file.name.toLowerCase();
      setFileName(file.name);
      setImagePreview(null);
      setBase64File(null);

      // 1. File Word (.docx)
      if (name.endsWith('.docx')) {
        setFileType('docx');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setExamText(result.value || '');
        showNotification(`Đã trích xuất nội dung từ file Word: ${file.name}`);
      } 
      // 2. File Word cũ (.doc)
      else if (name.endsWith('.doc')) {
        setFileType('doc');
        const arrayBuffer = await file.arrayBuffer();
        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          if (result.value && result.value.trim().length > 20) {
            setExamText(result.value);
            showNotification(`Đã đọc file .doc: ${file.name}`);
          } else {
            throw new Error('Chuyển sang bộ đọc nhị phân text');
          }
        } catch {
          // Fallback trích xuất chuỗi ký tự text từ file nhị phân .doc
          const bytes = new Uint8Array(arrayBuffer);
          let rawStr = '';
          for (let i = 0; i < bytes.length; i++) {
            if (bytes[i] >= 32 && bytes[i] <= 126) {
              rawStr += String.fromCharCode(bytes[i]);
            } else if (bytes[i] === 10 || bytes[i] === 13) {
              rawStr += '\n';
            }
          }
          const cleanText = rawStr.replace(/[^\S\r\n]{4,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
          setExamText(cleanText);
          showNotification(`Đã trích xuất văn bản từ file Word .doc: ${file.name}`);
        }
      } 
      // 3. File PDF
      else if (name.endsWith('.pdf') || file.type === 'application/pdf') {
        setFileType('pdf');
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          setBase64File(base64);
          setExamText(`[Tệp PDF đã sẵn sàng gửi AI phân tích OCR và bóc tách cấu trúc: ${file.name} - Kích thước: ${(file.size / 1024).toFixed(1)} KB]`);
          showNotification(`Đã tải tệp PDF: ${file.name}. AI sẽ xử lý nhận diện toàn văn.`);
        };
        reader.readAsDataURL(file);
      } 
      // 4 & 5. File Ảnh hoặc Bản Scan (.png, .jpg, .jpeg, .webp, .bmp)
      else if (file.type.startsWith('image/') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.webp')) {
        const isScan = name.includes('scan') || file.size > 2 * 1024 * 1024;
        setFileType(isScan ? 'scan' : 'image');
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          setBase64File(base64);
          setImagePreview(base64);
          setExamText(`[Hình ảnh/Bản scan đề thi: ${file.name} - Sẵn sàng gửi AI nhận diện thị giác OCR và trích xuất ma trận]`);
          showNotification(`Đã tải hình ảnh/bản scan: ${file.name}. AI sẽ nhận diện trực quan.`);
        };
        reader.readAsDataURL(file);
      } 
      // File văn bản thuần
      else {
        setFileType('text');
        const reader = new FileReader();
        reader.onload = () => {
          setExamText(reader.result as string);
          showNotification(`Đã đọc nội dung văn bản: ${file.name}`);
        };
        reader.readAsText(file);
      }
    } catch (err: any) {
      console.error('Lỗi nạp file:', err);
      showNotification(`Lỗi khi mở file: ${err.message || 'Không thể đọc tệp'}`);
    }
  };

  const showNotification = (msg: string) => {
    setCopySuccess(msg);
    setTimeout(() => setCopySuccess(null), 3500);
  };

  // =========================================================================
  // GỌI AI PHÂN TÍCH ĐỀ & TẠO MA TRẬN ĐẶC TẢ CHUẨN CV 7991
  // =========================================================================
  const handleAnalyzeExamAndBuildMatrix = async () => {
    if (!examText.trim() && !base64File) {
      alert('Vui lòng tải file đề thi (PDF, Word, Ảnh, Scan) hoặc nhập nội dung đề thi trước khi tạo ma trận.');
      return;
    }

    if (!apiKey) {
      alert('Vui lòng nhập Gemini API Key ở góc trên để sử dụng tính năng AI phân tích đề thi.');
      return;
    }

    setIsAnalyzing(true);
    setStatusMessage('Chuyên gia AI đang đọc kỹ đề thi, phân loại từng câu hỏi và xây dựng Ma trận & Bản đặc tả CV 7991...');

    try {
      const prompt = `
Bạn là Chủ tịch Hội đồng Khảo thí & Chuyên gia xây dựng Ma trận - Bản đặc tả đề thi hàng đầu của Bộ GD&ĐT Việt Nam theo đúng chuẩn CÔNG VĂN 7991/BGDĐT-GDTrH.

Nhiệm vụ:
Phân tích toàn bộ đề thi đính kèm sau đây (có thể là văn bản, file PDF hoặc ảnh chụp/bản scan).
1. Bóc tách từng câu hỏi, xác định rõ câu đó thuộc phần nào:
   - Phần I: Trắc nghiệm 4 lựa chọn (Mỗi câu 0.25 điểm)
   - Phần II: Trắc nghiệm Đúng/Sai (Mỗi câu 1.0 điểm gồm 4 ý a, b, c, d)
   - Phần III: Trắc nghiệm Trả lời ngắn (Mỗi câu 0.5 điểm)
   - Phần IV: Tự luận (nếu có trong đề)
2. Với từng câu/ý hỏi, xác định:
   - Chủ đề / Chương kiến thức (topicName).
   - Nội dung / Đơn vị kiến thức cụ thể (unitName).
   - Mức độ nhận thức: "know" (Nhận biết - NB), "understand" (Thông hiểu - TH), hoặc "apply" (Vận dụng - VD).
   - Yêu cầu cần đạt (YCCĐ) chuẩn xác theo Chương trình GDPT 2018 môn ${subject} Lớp ${grade}.
3. Tổng hợp thành:
   - MA TRẬN ĐỀ KIỂM TRA (Trang 2 chuẩn CV 7991) gồm các dòng MatrixTopicRow tương ứng từng chủ đề/nội dung với số câu hỏi phân bố theo 3 mức độ (know, understand, apply) cho từng phần.
   - BẢN ĐẶC TẢ ĐỀ KIỂM TRA (Trang 3 chuẩn CV 7991) liệt kê chi tiết từng yêu cầu cần đạt, mức độ nhận thức, số câu hỏi tương ứng (câu 1, câu 2...).

THÔNG TIN ĐỀ THI:
- Môn học: ${subject}
- Khối lớp: Lớp ${grade}
- Kì kiểm tra: ${term}
- Thời gian làm bài: ${durationMinutes} phút

--- NỘI DUNG ĐỀ THI ĐÃ TRÍCH XUẤT ---
${examText}

--- YÊU CẦU ĐẦU RA BẮT BUỘC: TRẢ VỀ JSON THUẦN TÚY (KHÔNG BỌC TRONG BẤT KỲ VĂN BẢN NGOÀI LỀ) ---
{
  "examTitle": "${examTitle}",
  "term": "${term}",
  "academicYear": "2024 - 2025",
  "grade": "${grade}",
  "subject": "${subject}",
  "durationMinutes": ${durationMinutes},
  "code": "101",
  "matrixRows": [
    {
      "topicName": "Tên chủ đề / Chương",
      "unitName": "Nội dung kiến thức cốt lõi",
      "part1": { "know": 2, "understand": 1, "apply": 0 },
      "part2": { "know": 1, "understand": 1, "apply": 0 },
      "part3": { "know": 0, "understand": 1, "apply": 1 },
      "part4": { "know": 0, "understand": 0, "apply": 0 }
    }
  ],
  "specifications": [
    {
      "id": "spec_1",
      "topic": "Tên chủ đề",
      "unit": "Đơn vị kiến thức",
      "competencyRequirement": "Nhận biết toạ độ điểm, tính chất đơn điệu...",
      "level": "know",
      "questionRef": "Câu 1",
      "questionType": "TNKQ Nhiều lựa chọn"
    }
  ],
  "part1Questions": [],
  "part2Questions": [],
  "part3Questions": [],
  "part4Questions": []
}
`;

      const aiResponse = await callGeminiAI(prompt, model, base64File || undefined);
      
      // Parse JSON
      let cleaned = aiResponse.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
      }

      const parsed: ExamCV7991 = JSON.parse(cleaned);
      if (!parsed.matrixRows || !Array.isArray(parsed.matrixRows)) {
        throw new Error('Dữ liệu ma trận trả về không đúng định dạng mảng matrixRows.');
      }

      setGeneratedExam(parsed);
      setActiveTab('matrix');
      showNotification('Đã tạo thành công Ma trận & Bản đặc tả chuẩn CV 7991!');
    } catch (err: any) {
      console.error('Lỗi phân tích ma trận:', err);
      alert('Lỗi tạo ma trận: ' + (err.message || 'Không thể kết nối hoặc phân tích đề.'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Tải file Word (.docx) chứa Ma trận & Đặc tả
  const handleExportDocx = () => {
    if (!generatedExam) return;
    try {
      exportMatrixSpecToWord(generatedExam);
      showNotification('Đã tạo và tải file Word Ma trận & Bản đặc tả (.docx) thành công!');
    } catch (e: any) {
      alert('Lỗi xuất file Word: ' + e.message);
    }
  };

  // Áp dụng vào hệ thống
  const handleApplyToSystem = () => {
    if (!generatedExam) return;
    if (onApplyExam) {
      onApplyExam(generatedExam);
    }
    if (onNavigateToMatrix) {
      onNavigateToMatrix();
    }
    showNotification('Đã nạp Ma trận & Đề thi vào hệ thống thành công!');
  };

  // Tính tổng số câu và điểm ma trận
  const totalP1 = generatedExam?.matrixRows.reduce((s, r) => s + r.part1.know + r.part1.understand + r.part1.apply, 0) || 0;
  const totalP2 = generatedExam?.matrixRows.reduce((s, r) => s + r.part2.know + r.part2.understand + r.part2.apply, 0) || 0;
  const totalP3 = generatedExam?.matrixRows.reduce((s, r) => s + r.part3.know + r.part3.understand + r.part3.apply, 0) || 0;
  const totalP4 = generatedExam?.matrixRows.reduce((s, r) => s + r.part4.know + r.part4.understand + r.part4.apply, 0) || 0;

  const totalKnow = generatedExam?.matrixRows.reduce((s, r) => s + r.part1.know + r.part2.know + r.part3.know + r.part4.know, 0) || 0;
  const totalUnderstand = generatedExam?.matrixRows.reduce((s, r) => s + r.part1.understand + r.part2.understand + r.part3.understand + r.part4.understand, 0) || 0;
  const totalApply = generatedExam?.matrixRows.reduce((s, r) => s + r.part1.apply + r.part2.apply + r.part3.apply + r.part4.apply, 0) || 0;

  const scoreP1 = totalP1 * 0.25;
  const scoreP2 = totalP2 * 1.0;
  const scoreP3 = totalP3 * 0.5;
  const scoreP4 = totalP4 * 1.5;
  const totalScore = scoreP1 + scoreP2 + scoreP3 + scoreP4;

  const pctKnow = totalScore > 0 ? Math.round(((totalKnow * 0.25) / totalScore) * 100) : 0;
  const pctUnderstand = totalScore > 0 ? Math.round(((totalUnderstand * 0.25) / totalScore) * 100) : 0;
  const pctApply = totalScore > 0 ? Math.round(((totalApply * 0.25) / totalScore) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast thông báo */}
      {copySuccess && (
        <div className="fixed bottom-5 right-5 z-50 bg-teal-800 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-teal-300" />
          <span>{copySuccess}</span>
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-teal-800 text-white p-6 rounded-3xl shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-bold border border-indigo-400/30">
              <Sparkles size={14} className="text-amber-300 animate-pulse" />
              <span>AI Trích Xuất Đề Thi Thành Ma Trận & Bản Đặc Tả</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <FileSpreadsheet className="text-teal-300" size={28} />
              Tạo Ma Trận & Bản Đặc Tả Từ Đề Thi
            </h1>
            <p className="text-xs text-indigo-100/90 leading-relaxed">
              Tải lên đề thi dưới 1 trong 5 định dạng: <strong>PDF, .DOC, .DOCX, Ảnh chụp hoặc Bản scan</strong>. 
              AI chuyên gia sẽ tự động quét toàn văn, phân tích yêu cầu cần đạt (YCCĐ) theo CT GDPT 2018, 
              lập bảng Ma trận (Trang 2) & Bản đặc tả (Trang 3) chuẩn 100% Công văn 7991, xuất file Word <strong>.docx</strong> chuẩn thể thức.
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            {generatedExam && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportDocx}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-white text-indigo-900 hover:bg-indigo-50 shadow-md transition active:scale-95 cursor-pointer"
                  title="Tải về file Word (.docx) chứa cả Ma trận và Bản đặc tả"
                >
                  <Download size={16} className="text-teal-600" />
                  <span>Tải File Word (.docx)</span>
                </button>

                <button
                  onClick={handleApplyToSystem}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-teal-500 hover:bg-teal-400 text-white shadow-md transition active:scale-95 cursor-pointer"
                  title="Nạp trực tiếp vào hệ thống để đồng bộ chỉnh sửa"
                >
                  <Check size={16} />
                  <span>Áp Dụng Vào Hệ Thống</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KHU VỰC TẢI FILE & CẤU HÌNH THÔNG TIN ĐỀ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT 1 & 2: VÙNG TẢI FILE (5 LOẠI ĐỊNH DẠNG) & XEM TRƯỚC */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Upload size={15} className="text-indigo-600" />
                1. Tải lên tệp đề thi (Nhận 1 trong 5 loại)
              </span>
              <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                Hỗ trợ: PDF • DOC • DOCX • Ảnh • Scan
              </span>
            </div>

            {/* Drag & Drop Upload Box */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-500 dark:hover:border-indigo-400 bg-indigo-50/30 dark:bg-slate-800/40 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 group"
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.bmp,.txt"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
                className="hidden"
              />

              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 flex items-center justify-center group-hover:scale-110 transition shadow-xs">
                {fileType === 'pdf' ? (
                  <FileText size={24} className="text-rose-600" />
                ) : fileType === 'docx' || fileType === 'doc' ? (
                  <FileText size={24} className="text-blue-600" />
                ) : fileType === 'image' || fileType === 'scan' ? (
                  <ImageIcon size={24} className="text-emerald-600" />
                ) : (
                  <Upload size={24} />
                )}
              </div>

              <div>
                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  {fileName ? `Tệp đã chọn: ${fileName}` : 'Kéo thả hoặc bấm để chọn tệp đề thi'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Chấp nhận: <strong>PDF</strong> (file số & scan), <strong>Word</strong> (.docx, .doc), <strong>Hình ảnh</strong> (.png, .jpg), hoặc <strong>Bản scan đề</strong>
                </p>
              </div>

              {/* 5 Badges */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  📄 PDF
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  📘 DOCX
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  📑 DOC
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  🖼️ ẢNH CHỤP
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  📸 BẢN SCAN
                </span>
              </div>
            </div>

            {/* Image Preview nếu là ảnh hoặc scan */}
            {imagePreview && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Eye size={12} /> Xem trước hình ảnh đề thi:
                </span>
                <div className="max-h-56 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white">
                  <img src={imagePreview} alt="Đề thi scan" className="w-full object-contain" />
                </div>
              </div>
            )}

            {/* Ô xem trước hoặc chỉnh sửa văn bản đề thi */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Nội dung đề thi (Có thể dán hoặc bổ sung trực tiếp):</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenDiagramModal('graph')}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-1 hover:bg-teal-100 cursor-pointer"
                  >
                    <TrendingUp size={11} className="text-teal-600" /> Vẽ Đồ Thị
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDiagramModal('bbt')}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1 hover:bg-purple-100 cursor-pointer"
                  >
                    <TableIcon size={11} className="text-purple-600" /> Vẽ BBT
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDiagramModal('geometry')}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1 hover:bg-amber-100 cursor-pointer"
                  >
                    <Box size={11} className="text-amber-600" /> Vẽ Hình 3D
                  </button>
                  <button
                    type="button"
                    onClick={() => setExamText('')}
                    className="text-slate-400 hover:text-rose-600 text-[10px] font-semibold ml-1 cursor-pointer"
                  >
                    Xóa
                  </button>
                </div>
              </div>
              <textarea
                value={examText}
                onChange={e => setExamText(e.target.value)}
                placeholder="Dán nội dung đề thi vào đây nếu không tải tệp, hoặc nội dung trích xuất từ file Word/PDF sẽ hiển thị ở đây..."
                rows={7}
                className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-mono leading-relaxed resize-y"
              />
            </div>
          </div>
        </div>

        {/* CỘT 3: CẤU HÌNH THÔNG SỐ ĐỀ THI & NÚT BẤM SINH MA TRẬN */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <span className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Sliders size={15} className="text-teal-600" />
              2. Thiết lập thông số đề thi
            </span>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Tên đề thi / Tiêu đề:
                </label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={e => setExamTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Môn học:
                  </label>
                  <select
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold outline-none focus:border-indigo-500"
                  >
                    <option value="Toán học">Toán học</option>
                    <option value="Vật lí">Vật lí</option>
                    <option value="Hóa học">Hóa học</option>
                    <option value="Sinh học">Sinh học</option>
                    <option value="Ngữ văn">Ngữ văn</option>
                    <option value="Lịch sử">Lịch sử</option>
                    <option value="Địa lí">Địa lí</option>
                    <option value="Tin học">Tin học</option>
                    <option value="Tiếng Anh">Tiếng Anh</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Khối lớp:
                  </label>
                  <select
                    value={grade}
                    onChange={e => setGrade(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold outline-none focus:border-indigo-500"
                  >
                    <option value="10">Lớp 10</option>
                    <option value="11">Lớp 11</option>
                    <option value="12">Lớp 12</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Kì kiểm tra:
                  </label>
                  <select
                    value={term}
                    onChange={e => setTerm(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold outline-none focus:border-indigo-500"
                  >
                    <option value="Giữa Học kỳ 1">Giữa Học kỳ 1</option>
                    <option value="Cuối Học kỳ 1">Cuối Học kỳ 1</option>
                    <option value="Giữa Học kỳ 2">Giữa Học kỳ 2</option>
                    <option value="Cuối Học kỳ 2">Cuối Học kỳ 2</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Thời gian:
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(parseInt(e.target.value) || 90)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold outline-none focus:border-indigo-500"
                  >
                    <option value={45}>45 phút</option>
                    <option value={50}>50 phút</option>
                    <option value={60}>60 phút</option>
                    <option value={90}>90 phút</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Nút Kích hoạt AI phân tích */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAnalyzeExamAndBuildMatrix}
                disabled={isAnalyzing}
                className={`w-full py-3 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 text-white shadow-md transition active:scale-95 cursor-pointer ${
                  isAnalyzing 
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-teal-600 hover:from-indigo-700 hover:to-teal-700'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Đang phân tích & tạo ma trận...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="text-amber-300" />
                    <span>Phân Tích Đề & Tạo Ma Trận Chuẩn CV 7991</span>
                  </>
                )}
              </button>
            </div>

            {isAnalyzing && (
              <p className="text-[11px] text-center font-medium text-indigo-600 dark:text-indigo-400 animate-pulse">
                {statusMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* KẾT QUẢ: MA TRẬN & BẢN ĐẶC TẢ TẠO BỞI AI */}
      {generatedExam && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-6 animate-in fade-in duration-200">
          {/* Header tabs switch */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('matrix')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'matrix'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                1. Ma Trận Đề Kiểm Tra (Trang 2)
              </button>
              <button
                onClick={() => setActiveTab('specs')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'specs'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                2. Bản Đặc Tả Đề Kiểm Tra (Trang 3)
              </button>
            </div>

            {/* Quick Export Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportDocx}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition shadow-2xs"
              >
                <Download size={14} /> Tải file Word (.docx)
              </button>
              <button
                onClick={handleApplyToSystem}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-2xs"
              >
                <Check size={14} /> Áp Dụng Đề Này
              </button>
            </div>
          </div>

          {/* TAB 1: MA TRẬN ĐỀ KIỂM TRA CHUẨN CV 7991 */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Phụ lục 1 - Công văn 7991/BGDĐT-GDTrH
                </p>
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase">
                  MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Môn: <strong>{generatedExam.subject}</strong> | Khối: <strong>{generatedExam.grade}</strong> | {generatedExam.term}
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-xs text-left border-collapse min-w-[850px]">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-700">
                      <th rowSpan={2} className="p-2 text-center border-r border-slate-300 dark:border-slate-700 w-10">TT</th>
                      <th rowSpan={2} className="p-2 border-r border-slate-300 dark:border-slate-700 min-w-[160px]">Chủ đề/Chương</th>
                      <th rowSpan={2} className="p-2 border-r border-slate-300 dark:border-slate-700 min-w-[160px]">Nội dung kiến thức</th>
                      <th colSpan={3} className="p-1.5 text-center bg-teal-50 dark:bg-slate-800/80 border-r border-slate-300 dark:border-slate-700">Phần I (TNKQ)</th>
                      <th colSpan={3} className="p-1.5 text-center bg-emerald-50 dark:bg-slate-800/80 border-r border-slate-300 dark:border-slate-700">Phần II (Đúng - Sai)</th>
                      <th colSpan={3} className="p-1.5 text-center bg-amber-50 dark:bg-slate-800/80 border-r border-slate-300 dark:border-slate-700">Phần III (Trả lời ngắn)</th>
                      <th colSpan={3} className="p-1.5 text-center bg-indigo-50 dark:bg-slate-800/80 border-r border-slate-300 dark:border-slate-700">Tổng mức độ</th>
                      <th rowSpan={2} className="p-2 text-center w-16">Tỉ lệ</th>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-[10px] text-slate-600 dark:text-slate-300 font-bold border-b border-slate-300 dark:border-slate-700">
                      <th className="p-1 text-center border-r border-slate-200 dark:border-slate-700">Biết</th>
                      <th className="p-1 text-center border-r border-slate-200 dark:border-slate-700">Hiểu</th>
                      <th className="p-1 text-center border-r border-slate-300 dark:border-slate-700">VD</th>
                      <th className="p-1 text-center border-r border-slate-200 dark:border-slate-700">Biết</th>
                      <th className="p-1 text-center border-r border-slate-200 dark:border-slate-700">Hiểu</th>
                      <th className="p-1 text-center border-r border-slate-300 dark:border-slate-700">VD</th>
                      <th className="p-1 text-center border-r border-slate-200 dark:border-slate-700">Biết</th>
                      <th className="p-1 text-center border-r border-slate-200 dark:border-slate-700">Hiểu</th>
                      <th className="p-1 text-center border-r border-slate-300 dark:border-slate-700">VD</th>
                      <th className="p-1 text-center border-r border-slate-200 dark:border-slate-700 text-blue-700">Biết</th>
                      <th className="p-1 text-center border-r border-slate-200 dark:border-slate-700 text-emerald-700">Hiểu</th>
                      <th className="p-1 text-center border-r border-slate-300 dark:border-slate-700 text-amber-700">VD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {generatedExam.matrixRows.map((row, idx) => {
                      const rowKnow = row.part1.know + row.part2.know + row.part3.know + row.part4.know;
                      const rowUnderstand = row.part1.understand + row.part2.understand + row.part3.understand + row.part4.understand;
                      const rowApply = row.part1.apply + row.part2.apply + row.part3.apply + row.part4.apply;
                      const rowScore = (row.part1.know + row.part1.understand + row.part1.apply) * 0.25 +
                                       (row.part2.know + row.part2.understand + row.part2.apply) * 1.0 +
                                       (row.part3.know + row.part3.understand + row.part3.apply) * 0.5 +
                                       (row.part4.know + row.part4.understand + row.part4.apply) * 1.5;
                      const rowPct = totalScore > 0 ? Math.round((rowScore / totalScore) * 100) : 0;

                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2 text-center font-bold text-slate-500 border-r border-slate-200 dark:border-slate-700">{idx + 1}</td>
                          <td className="p-2 font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700">{row.topicName}</td>
                          <td className="p-2 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{row.unitName}</td>
                          
                          {/* Phần I */}
                          <td className="p-1 text-center border-r border-slate-200 dark:border-slate-700">{row.part1.know || ''}</td>
                          <td className="p-1 text-center border-r border-slate-200 dark:border-slate-700">{row.part1.understand || ''}</td>
                          <td className="p-1 text-center border-r border-slate-300 dark:border-slate-700">{row.part1.apply || ''}</td>

                          {/* Phần II */}
                          <td className="p-1 text-center border-r border-slate-200 dark:border-slate-700">{row.part2.know || ''}</td>
                          <td className="p-1 text-center border-r border-slate-200 dark:border-slate-700">{row.part2.understand || ''}</td>
                          <td className="p-1 text-center border-r border-slate-300 dark:border-slate-700">{row.part2.apply || ''}</td>

                          {/* Phần III */}
                          <td className="p-1 text-center border-r border-slate-200 dark:border-slate-700">{row.part3.know || ''}</td>
                          <td className="p-1 text-center border-r border-slate-200 dark:border-slate-700">{row.part3.understand || ''}</td>
                          <td className="p-1 text-center border-r border-slate-300 dark:border-slate-700">{row.part3.apply || ''}</td>

                          {/* Tổng mức độ */}
                          <td className="p-1 text-center font-bold text-blue-700 dark:text-blue-400 border-r border-slate-200 dark:border-slate-700">{rowKnow || ''}</td>
                          <td className="p-1 text-center font-bold text-emerald-700 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-700">{rowUnderstand || ''}</td>
                          <td className="p-1 text-center font-bold text-amber-700 dark:text-amber-400 border-r border-slate-300 dark:border-slate-700">{rowApply || ''}</td>

                          <td className="p-2 text-center font-black text-slate-800 dark:text-slate-100">{rowPct}%</td>
                        </tr>
                      );
                    })}

                    {/* Dòng Tổng cộng */}
                    <tr className="bg-slate-100/90 dark:bg-slate-800/90 font-black text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
                      <td colSpan={3} className="p-2.5 text-right uppercase border-r border-slate-300 dark:border-slate-700">
                        Tổng cộng:
                      </td>
                      <td colSpan={3} className="p-2 text-center border-r border-slate-300 dark:border-slate-700 text-teal-800 dark:text-teal-300 font-extrabold">
                        {totalP1} câu ({scoreP1.toFixed(2)}đ)
                      </td>
                      <td colSpan={3} className="p-2 text-center border-r border-slate-300 dark:border-slate-700 text-emerald-800 dark:text-emerald-300 font-extrabold">
                        {totalP2} câu ({scoreP2.toFixed(1)}đ)
                      </td>
                      <td colSpan={3} className="p-2 text-center border-r border-slate-300 dark:border-slate-700 text-amber-800 dark:text-amber-300 font-extrabold">
                        {totalP3} câu ({scoreP3.toFixed(1)}đ)
                      </td>
                      <td className="p-2 text-center text-blue-700 border-r border-slate-200 dark:border-slate-700">{totalKnow}</td>
                      <td className="p-2 text-center text-emerald-700 border-r border-slate-200 dark:border-slate-700">{totalUnderstand}</td>
                      <td className="p-2 text-center text-amber-700 border-r border-slate-300 dark:border-slate-700">{totalApply}</td>
                      <td className="p-2 text-center font-black text-indigo-700 dark:text-indigo-300">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tỉ lệ định lượng */}
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 gap-2">
                <span>Phân bố mức độ nhận thức:</span>
                <span className="font-bold text-blue-700 dark:text-blue-400">Nhận biết: {pctKnow}% ({totalKnow} câu)</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">Thông hiểu: {pctUnderstand}% ({totalUnderstand} câu)</span>
                <span className="font-bold text-amber-700 dark:text-amber-400">Vận dụng: {pctApply}% ({totalApply} câu)</span>
                <span className="font-black text-teal-700 dark:text-teal-300">Tổng điểm: {totalScore.toFixed(1)} / 10.0đ</span>
              </div>
            </div>
          )}

          {/* TAB 2: BẢN ĐẶC TẢ ĐỀ KIỂM TRA CHUẨN CV 7991 */}
          {activeTab === 'specs' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Phụ lục 2 - Công văn 7991/BGDĐT-GDTrH
                </p>
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase">
                  BẢN ĐẶC TẢ MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Môn: <strong>{generatedExam.subject}</strong> | Khối: <strong>{generatedExam.grade}</strong> | {generatedExam.term}
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-700">
                      <th className="p-2.5 text-center w-12 border-r border-slate-300 dark:border-slate-700">TT</th>
                      <th className="p-2.5 border-r border-slate-300 dark:border-slate-700 min-w-[140px]">Chủ đề</th>
                      <th className="p-2.5 border-r border-slate-300 dark:border-slate-700 min-w-[160px]">Đơn vị kiến thức</th>
                      <th className="p-2.5 border-r border-slate-300 dark:border-slate-700 min-w-[90px] text-center">Mức độ</th>
                      <th className="p-2.5 border-r border-slate-300 dark:border-slate-700 min-w-[280px]">Yêu cầu cần đạt</th>
                      <th className="p-2.5 text-center min-w-[120px]">Số câu / Vị trí</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {generatedExam.specifications.map((spec, sIdx) => {
                      const levelBadge = spec.level === 'know' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300' :
                                         spec.level === 'understand' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300' :
                                         'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300';
                      const levelText = spec.level === 'know' ? 'Nhận biết' : spec.level === 'understand' ? 'Thông hiểu' : 'Vận dụng';

                      return (
                        <tr key={spec.id || sIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2 text-center font-bold text-slate-500 border-r border-slate-200 dark:border-slate-700">{sIdx + 1}</td>
                          <td className="p-2 font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700">{spec.topic}</td>
                          <td className="p-2 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{spec.unit}</td>
                          <td className="p-2 text-center border-r border-slate-200 dark:border-slate-700">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${levelBadge}`}>
                              {levelText}
                            </span>
                          </td>
                          <td className="p-2 text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 leading-relaxed">
                            {spec.competencyRequirement}
                          </td>
                          <td className="p-2 text-center font-bold text-indigo-700 dark:text-indigo-400">
                            {spec.questionRef}
                            {spec.questionType && (
                              <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                                ({spec.questionType})
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL BỘ 3 CÔNG CỤ VẼ ẢNH 300 DPI */}
      <IntegratedDiagramModal
        isOpen={diagramModalOpen}
        onClose={() => setDiagramModalOpen(false)}
        onInsertImage={handleInsertDiagramToExam}
        initialTab={diagramTab}
        apiKey={apiKey}
        model={model}
      />
    </div>
  );
};
export default MatrixFromExamGenerator;
