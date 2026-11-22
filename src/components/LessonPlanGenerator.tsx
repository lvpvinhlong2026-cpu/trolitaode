import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, Download, AlertCircle, CheckCircle2, Edit3, BookOpen } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import JSZip from 'jszip';
import { KNTT_CURRICULUM } from '../utils/curriculumData';
import EditorToolbar from './EditorToolbar';
import MarkdownEditor from './MarkdownEditor';

interface Props {
  apiKey: string;
  model: string;
}

export default function LessonPlanGenerator({ apiKey, model }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [subject, setSubject] = useState<string>('Toán học');
  const [grade, setGrade] = useState<string>('Lớp 12');
  const [lesson, setLesson] = useState<string>('');
  
  const topicsList = KNTT_CURRICULUM[subject]?.[grade] || [];
  
  const [contextSuggestion, setContextSuggestion] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [resultText, setResultText] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/jpg'];
      
      const filteredFiles = (selectedFiles as File[]).filter((f: File) => {
        const ext = f.name.toLowerCase();
        return validTypes.includes(f.type) || ext.endsWith('.docx') || ext.endsWith('.pdf') || ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg');
      });

      if (filteredFiles.length === 0) {
        setError('Vui lòng chọn file PDF, Word (.docx) hoặc Ảnh (PNG/JPG).');
        return;
      }
      setFiles(filteredFiles);
      setError('');
      setSuccess('');
      setResultText('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selectedFiles = Array.from(e.dataTransfer.files);
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/jpg'];
      
      const filteredFiles = (selectedFiles as File[]).filter((f: File) => {
        const ext = f.name.toLowerCase();
        return validTypes.includes(f.type) || ext.endsWith('.docx') || ext.endsWith('.pdf') || ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg');
      });

      if (filteredFiles.length === 0) {
        setError('Vui lòng chọn file PDF, Word (.docx) hoặc Ảnh (PNG/JPG).');
        return;
      }
      setFiles(filteredFiles);
      setError('');
      setSuccess('');
      setResultText('');
    }
  };

  const generateDocx = async (markdownText: string, originalFilename: string) => {
    setStatus('Đang tạo file Word...');
    setProgress(90);
    try {
      const lines = markdownText.split('\n');
      const paragraphs = lines.map(line => {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        const textRuns = parts.map(part => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return new TextRun({ text: part.slice(2, -2), bold: true, font: "Times New Roman", size: 28 });
          }
          return new TextRun({ text: part, font: "Times New Roman", size: 28 });
        });
        return new Paragraph({ children: textRuns, spacing: { after: 200 } });
      });

      const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
      const buffer = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(buffer);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${originalFilename}_Giao_An.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccess('Lưu Giáo án Word thành công! Đã tự động tải file xuống.');
      setProgress(100);
    } catch (err: any) {
      console.error('Error generating docx:', err);
      setError('Lỗi khi tạo file Word: ' + err.message);
    }
  };

  const handleConvert = async () => {
    if (!apiKey) {
      setError('Vui lòng cấu hình API Key ở góc trên cùng bên phải trước khi sử dụng.');
      return;
    }
    
    if (!lesson) {
      setError('Vui lòng chọn bài học cần soạn giáo án.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');
    setResultText('');
    setProgress(10);

    // Truyền tách biệt thông tin bài học và yêu cầu nâng cao để backend dễ dàng đặt trọng tâm vào Tên bài học
    const promptContext = contextSuggestion.trim();

    try {
      let extractedText = '';

      if (files.length === 0) {
        setStatus('Đang phân tích và sinh giáo án (AI đang làm việc)...');
        setProgress(40);
        
        const res = await fetch('/api/convert-word', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textContent: "",
            parsingMode: 'lesson_plan',
            model: 'gemini-1.5-flash',
            apiKey: apiKey,
            subject,
            grade,
            lesson,
            contextSuggestion: promptContext
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Lỗi từ máy chủ API.');
        }

        const data = await res.json();
        extractedText = data.text;

      } else {
        setStatus('Đang đọc tài liệu tham khảo/mẫu giáo án...');
        let combinedDocxText = '';
        const base64Files = [];

        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          if (f.name.toLowerCase().endsWith('.docx')) {
            try {
              const zip = await JSZip.loadAsync(f);
              const docXmlFile = zip.file('word/document.xml');
              if (docXmlFile) {
                const xmlString = await docXmlFile.async('string');
                const xsltResponse = await fetch('/OMML2MML.XSL');
                if (xsltResponse.ok) {
                  const xsltText = await xsltResponse.text();
                  const parser = new DOMParser();
                  const xmlDoc = parser.parseFromString(xmlString, "application/xml");
                  const xsltDoc = parser.parseFromString(xsltText, "application/xml");
                  const xsltProcessor = new XSLTProcessor();
                  xsltProcessor.importStylesheet(xsltDoc);
                  const resultDoc = xsltProcessor.transformToDocument(xmlDoc);
                  
                  const serializeNode = (node: Node): string => {
                    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
                    if (node.nodeType === Node.ELEMENT_NODE) {
                      const el = node as Element;
                      if (el.tagName.includes('mml:math') || el.tagName === 'math') {
                        return new XMLSerializer().serializeToString(el) + " ";
                      }
                      let childText = '';
                      for (let j = 0; j < el.childNodes.length; j++) childText += serializeNode(el.childNodes[j]);
                      if (el.tagName === 'w:p') return childText + '\n\n';
                      return childText;
                    }
                    return '';
                  };
                  combinedDocxText += `\n--- Tài liệu tham khảo từ ${f.name} ---\n` + serializeNode(resultDoc.documentElement) + '\n';
                }
              }
            } catch (err) {
              console.warn(`Lỗi khi đọc file DOCX ${f.name}`, err);
            }
          } else {
            const base64Data = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.readAsDataURL(f);
              reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
            });
            base64Files.push({
              base64: base64Data,
              mimeType: f.type || (f.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
            });
          }
        }

        setProgress(40);
        setStatus('Đang biên soạn giáo án dựa trên tài liệu (AI đang làm việc - có thể mất vài phút)...');

        if (base64Files.length === 0) {
          const res = await fetch('/api/convert-word', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              textContent: combinedDocxText,
              parsingMode: 'lesson_plan',
              model: 'gemini-1.5-flash',
              apiKey: apiKey,
              subject,
              grade,
              lesson,
              contextSuggestion: promptContext
            })
          });
          if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Lỗi từ máy chủ API.');
          extractedText = (await res.json()).text;
        } else {
          const res = await fetch('/api/convert-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              files: base64Files,
              textContent: combinedDocxText,
              parsingMode: 'lesson_plan',
              model: 'gemini-1.5-flash',
              apiKey: apiKey,
              subject,
              grade,
              lesson,
              contextSuggestion: promptContext
            })
          });
          if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Lỗi từ máy chủ API.');
          extractedText = (await res.json()).text;
        }
      }
      
      setProgress(70);
      setStatus('Hoàn thành biên soạn giáo án!');
      setResultText(extractedText);
      setSuccess('Đã sinh giáo án hoàn tất. Bạn có thể chỉnh sửa trực tiếp bên dưới trước khi lưu thành file Word.');
      setProgress(100);

    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Có lỗi xảy ra trong quá trình soạn giáo án.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinueConvert = async () => {
    if (!resultText) return;
    if (!apiKey) {
      setError('Vui lòng cấu hình API Key.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');
    setStatus('Đang gửi phần đang viết dở cho AI để sinh tiếp...');
    setProgress(30);

    const promptContext = contextSuggestion.trim();

    try {
      const base64Files = [];
      let combinedDocxText = '';
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f.name.toLowerCase().endsWith('.docx')) {
           continue; 
        }
        
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(f);
          reader.onload = () => {
            const result = reader.result?.toString().split(',')[1];
            if (result) resolve(result);
            else reject(new Error('Không thể đọc dữ liệu file.'));
          };
          reader.onerror = () => reject(new Error('Lỗi khi đọc file trên trình duyệt.'));
        });
        
        base64Files.push({
          base64: base64Data,
          mimeType: f.type || (f.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
        });
      }

      if (base64Files.length === 0) {
         const res = await fetch('/api/convert-word', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ textContent: "Tài liệu đính kèm.", parsingMode: 'lesson_plan', model: 'gemini-1.5-flash', apiKey, subject, grade, lesson, contextSuggestion: promptContext, continueFromText: resultText })
         });
         if (!res.ok) throw new Error('Lỗi từ máy chủ API.');
         const data = await res.json();
         setResultText(prev => prev + '\n' + data.text);
      } else {
         const res = await fetch('/api/convert-pdf', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ files: base64Files, textContent: "Tài liệu đính kèm.", parsingMode: 'lesson_plan', model: 'gemini-1.5-flash', apiKey, subject, grade, lesson, contextSuggestion: promptContext, continueFromText: resultText })
         });
         if (!res.ok) throw new Error('Lỗi từ máy chủ API.');
         const data = await res.json();
         setResultText(prev => prev + '\n' + data.text);
      }
      
      setProgress(100);
      setSuccess('Đã tạo tiếp phần nội dung bị thiếu!');
    } catch (err: any) {
      setError(err.message || 'Lỗi khi sinh tiếp nội dung.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadWord = () => {
    if (!resultText) return;
    const filename = lesson ? lesson.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'Giao_An';
    generateDocx(resultText, filename);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <BookOpen size={20} />
          </div>
          Tạo Giáo Án Chuẩn
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-3xl mx-auto">
          Tạo giáo án chi tiết phân bổ theo tiết dạy, tích hợp năng lực số dựa trên thông tin bài học và tài liệu bạn cung cấp.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* THÔNG TIN BÀI HỌC */}
        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">1</span>
              Thông tin Bài học
            </h3>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Môn học</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full text-sm font-semibold px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Toán học">Toán học</option>
                    <option value="Ngữ văn">Ngữ văn</option>
                    <option value="Tiếng Anh">Tiếng Anh</option>
                    <option value="Vật lí">Vật lí</option>
                    <option value="Hóa học">Hóa học</option>
                    <option value="Sinh học">Sinh học</option>
                    <option value="Lịch sử">Lịch sử</option>
                    <option value="Địa lí">Địa lí</option>
                    <option value="GDKT & PL">GDKT & PL</option>
                    <option value="Tin học">Tin học</option>
                    <option value="Công nghệ">Công nghệ</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Khối Lớp</label>
                  <select
                    value={grade}
                    onChange={(e) => { setGrade(e.target.value); setLesson(''); }}
                    className="w-full text-sm font-semibold px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Lớp 12">Lớp 12 (Kết nối tri thức)</option>
                    <option value="Lớp 11">Lớp 11 (Kết nối tri thức)</option>
                    <option value="Lớp 10">Lớp 10 (Kết nối tri thức)</option>
                    <option value="Lớp 9">Lớp 9 (Kết nối tri thức)</option>
                    <option value="Lớp 8">Lớp 8 (Kết nối tri thức)</option>
                    <option value="Lớp 7">Lớp 7 (Kết nối tri thức)</option>
                    <option value="Lớp 6">Lớp 6 (Kết nối tri thức)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tên Bài học</label>
                <select
                  value={lesson}
                  onChange={(e) => setLesson(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Chọn bài học cần soạn --</option>
                  {topicsList.map((t, idx) => (
                    <option key={idx} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">2</span>
              Yêu cầu nâng cao (Tùy chọn)
            </h3>
            
            <textarea
              value={contextSuggestion}
              onChange={(e) => setContextSuggestion(e.target.value)}
              placeholder="Ví dụ: Soạn theo mẫu Công văn 5512, ưu tiên các trò chơi học tập, nhấn mạnh vào năng lực tư duy máy tính..."
              className="w-full h-24 p-4 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl resize-none focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        
        {/* FILE UPLOAD & SUBMIT */}
        <div className="flex flex-col space-y-6">
          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 flex-1">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">3</span>
              Nguồn dữ liệu tham khảo (Tùy chọn)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Bạn có thể tải lên trang Sách giáo khoa, Sách giáo viên hoặc file Mẫu giáo án (.docx, .pdf, .png) để AI học theo cấu trúc và nội dung đó.
            </p>
            <div 
              className={`h-40 border-2 border-dashed rounded-xl flex items-center justify-center flex-col transition-all ${
                  files.length > 0 ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input 
                  type="file" multiple accept="application/pdf,.docx,image/png,image/jpeg,image/jpg" 
                  className="hidden" ref={fileInputRef} onChange={handleFileChange}
                />
                {files.length === 0 ? (
                  <div className="flex flex-col items-center cursor-pointer text-center px-4" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={24} className="text-indigo-500 mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Kéo thả hoặc nhấn để tải file</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center w-full px-4">
                    <div className="flex flex-wrap gap-2 justify-center mb-2 max-h-24 overflow-y-auto w-full">
                      {files.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs w-full max-w-[200px]">
                          <FileText size={12} className="text-indigo-500 shrink-0" />
                          <span className="truncate flex-1">{f.name}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setFiles([])} className="text-xs text-red-500 font-semibold hover:underline">Xóa tất cả {files.length} file</button>
                  </div>
                )}
            </div>
          </div>
          
          <button
            onClick={handleConvert}
            disabled={isProcessing}
            className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 ${
              isProcessing
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500 shadow-none'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/40 hover:-translate-y-0.5'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Đang biên soạn...
              </>
            ) : (
              'Bắt Đầu Tạo Giáo Án'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="font-medium">{error}</div>
        </div>
      )}

      {success && !resultText && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl flex items-start gap-3 text-green-700 dark:text-green-400 text-sm">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          <div className="font-medium">{success}</div>
        </div>
      )}

      {isProcessing && (
        <div className="mt-6 space-y-3 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between text-sm font-semibold text-indigo-700 dark:text-indigo-400">
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              {status}
            </div>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* LIVE PREVIEW EDITOR */}
      {resultText && (
        <div className="mt-8 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm bg-white dark:bg-slate-800">
          <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Edit3 size={18} className="text-indigo-500" />
              Trình soạn thảo (Live Editor)
            </h3>
            <span className="text-xs font-medium px-2.5 py-1 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 rounded-lg">
              Sẵn sàng xuất file
            </span>
          </div>
          
          <div className="p-0 bg-white dark:bg-slate-800 flex flex-col">
            <EditorToolbar text={resultText} setText={setResultText} onContinue={handleContinueConvert} isProcessing={isProcessing} />
            <MarkdownEditor text={resultText} setText={setResultText} />
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bạn có thể chỉnh sửa tự do trong ô trên. Khi thấy ưng ý, hãy nhấn lưu thành file Word.
            </p>
            <button
              onClick={handleDownloadWord}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-green-500/20 hover:-translate-y-0.5"
            >
              <Download size={18} />
              Lưu thành file Word (.docx)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
