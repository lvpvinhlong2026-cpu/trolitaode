import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, Download, AlertCircle, CheckCircle2, Edit3, Settings, Copy, Play, TrendingUp, Table as TableIcon, Box, Sparkles } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import JSZip from 'jszip';
import EditorToolbar from './EditorToolbar';
import MarkdownEditor from './MarkdownEditor';
import { buildExamDocxBlob } from '../utils/docxExamBuilder';
import { IntegratedDiagramModal, DiagramToolTab } from './IntegratedDiagramModal';
import { notifyFallbackIfNeeded } from '../utils/gemini';
import { parseExamMarkdownToCV7991 } from '../utils/examFormatConverter';
import { ExamCV7991 } from '../types/pedagogy';
import { ArrowRight } from 'lucide-react';

interface Props {
  apiKey: string;
  model: string;
  onApplyExam?: (exam: ExamCV7991) => void;
  onNavigateToExam?: () => void;
}

export default function SimilarExamGenerator({ apiKey, model, onApplyExam, onNavigateToExam }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [resultText, setResultText] = useState<string>('');
  const [isAiFinished, setIsAiFinished] = useState<boolean>(true);
  
  const [includeShortSolution, setIncludeShortSolution] = useState<boolean>(false);
  const [useRealWorldData, setUseRealWorldData] = useState<boolean>(false);
  const [noParameterM, setNoParameterM] = useState<boolean>(false);
  const [keepOriginalDiagrams, setKeepOriginalDiagrams] = useState<boolean>(true);
  const [examCount, setExamCount] = useState<number>(1);
  const [contextSuggestion, setContextSuggestion] = useState<string>('');
  
  // State điều khiển Modal tích hợp 3 bộ công cụ vẽ ảnh 300 DPI
  const [diagramModalOpen, setDiagramModalOpen] = useState<boolean>(false);
  const [diagramInitialTab, setDiagramInitialTab] = useState<DiagramToolTab>('graph');

  const handleOpenDiagramModal = (tab: DiagramToolTab) => {
    setDiagramInitialTab(tab);
    setDiagramModalOpen(true);
  };

  const handleInsertDiagramToResult = (dataUrl: string) => {
    const imgMarkdown = `\n\n![Hình vẽ minh họa](${dataUrl})\n\n`;
    setResultText(prev => prev + imgMarkdown);
    setSuccess('Đã chèn ảnh đồ họa 300 DPI vào đề thi!');
    setTimeout(() => setSuccess(''), 3000);
  };
  
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

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
    setStatus('Đang tạo file Word chuẩn công thức Office Math & nhúng ảnh 300 DPI...');
    setProgress(90);
    
    try {
      const buffer = await buildExamDocxBlob(markdownText, {
        examTitle: 'ĐỀ THI TƯƠNG TỰ ĐÃ NHÂN BẢN',
        examCode: '102',
        duration: '90 phút'
      });
      const url = window.URL.createObjectURL(buffer);
      const link = document.createElement('a');
      link.href = url;
      
      let baseName = originalFilename.replace(/\.(pdf|docx|png|jpg|jpeg)$/i, '');
      if (files.length > 1) baseName = 'De_thi_tuong_tu';
      link.download = `${baseName}_De_Moi.docx`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess('Lưu đề thi Word (.docx) thành công! Công thức Toán đẹp rõ chuẩn Office Math và nhúng ảnh sắc nét.');
      setProgress(100);
    } catch (err: any) {
      console.error('Error generating docx:', err);
      setError('Lỗi khi tạo file Word: ' + err.message);
    }
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    if (!apiKey) {
      setError('Vui lòng cấu hình API Key ở góc trên cùng bên phải trước khi sử dụng.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');
    setResultText('');
    setProgress(10);

    const finalContextSuggestion = `${contextSuggestion}\n${noParameterM ? '- Yêu cầu các câu hỏi KHÔNG chứa tham số m.\n' : ''}${useRealWorldData ? '- Ưu tiên sử dụng nhiều dữ kiện thực tế, bối cảnh thực tiễn vào các câu hỏi.\n' : ''}${keepOriginalDiagrams ? '- BẮT BUỘC GIỮ NGUYÊN HÌNH ẢNH, BẢNG BIẾN THIÊN, ĐỒ THỊ GỐC: Đối với tất cả câu hỏi có hình ảnh minh họa, bảng biến thiên, đồ thị hàm số (Oxy) hoặc hình học không gian trong đề gốc, bạn PHẢI GIỮ NGUYÊN 100% HÌNH VẼ ĐÓ (giữ nguyên mô tả hình vẽ hoặc mã markdown ảnh ![...](...)). TUYỆT ĐỐI KHÔNG ĐƯỢC thay đổi hình vẽ hay vẽ hình mới. CHỈ ĐƯỢC THAY ĐỔI YÊU CẦU, LỆNH HỎI, CÁC ĐÁP ÁN A, B, C, D VÀ LỜI GIẢI dựa trên chính hình ảnh gốc đó (Ví dụ: câu gốc hỏi khoảng đồng biến thì đề mới hỏi điểm cực trị, số nghiệm phương trình, tiệm cận, GTLN/GTNN trên chính hình ảnh đó).\n' : ''}`;

    try {
      let extractedText = '';

      if (files.length === 1 && files[0].name.toLowerCase().endsWith('.docx')) {
        const file = files[0];
        setStatus('Đang giải nén file Word...');
        const zip = await JSZip.loadAsync(file);
        const docXmlFile = zip.file('word/document.xml');
        if (!docXmlFile) throw new Error('File Word không hợp lệ hoặc bị hỏng.');
        
        const xmlString = await docXmlFile.async('string');
        
        setProgress(20);
        setStatus('Đang chuyển đổi công thức nội tại (OMML -> MathML)...');
        
        const xsltResponse = await fetch('/OMML2MML.XSL');
        if (!xsltResponse.ok) throw new Error('Không tìm thấy tệp cấu hình XSLT.');
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
            for (let i = 0; i < el.childNodes.length; i++) childText += serializeNode(el.childNodes[i]);
            if (el.tagName === 'w:p') return childText + '\n\n';
            return childText;
          }
          return '';
        };

        const parsedText = serializeNode(resultDoc.documentElement);
        
        setProgress(40);
        setStatus('Đang phân tích cấu trúc đề và sinh đề mới (AI đang làm việc)...');
        
        const res = await fetch('/api/convert-word', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textContent: parsedText,
            parsingMode: 'similar_exam',
            model: model || 'gemini-1.5-pro',
            apiKey: apiKey,
            includeShortSolution,
            examCount,
            keepOriginalDiagrams,
            contextSuggestion: finalContextSuggestion
          })
        });

        if (!res.ok) {
          const rawText = await res.text().catch(() => '');
          let errData: any = {};
          try {
            errData = JSON.parse(rawText);
          } catch (parseErr) {
            console.error("Raw response:", rawText);
          }
          throw new Error(errData.error || (rawText ? `Lỗi HTTP ${res.status}: ${rawText.substring(0, 150)}...` : 'Lỗi từ máy chủ API.'));
        }

        const data = await res.json();
        notifyFallbackIfNeeded(data);
        extractedText = data.text;
        if (data.isFinished === false) setIsAiFinished(false);
        else setIsAiFinished(true);

      } else {
        setStatus('Đang chuẩn bị dữ liệu file (multipart)...');

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          if (f.name.toLowerCase().endsWith('.docx')) {
            throw new Error('Chế độ xử lý hàng loạt hiện tại chỉ hỗ trợ Ảnh và PDF, không hỗ trợ trộn file Word chung với Ảnh.');
          }
          formData.append('files', f);
        }
        formData.append('parsingMode', 'similar_exam');
        formData.append('model', model || 'auto');
        if (apiKey) formData.append('apiKey', apiKey);
        formData.append('includeShortSolution', String(includeShortSolution));
        formData.append('examCount', String(examCount));
        formData.append('keepOriginalDiagrams', String(keepOriginalDiagrams));
        formData.append('contextSuggestion', finalContextSuggestion);

        setProgress(30);
        setStatus('Đang phân tích cấu trúc đề và sinh đề mới (AI đang làm việc - có thể mất vài phút)...');

        const res = await fetch('/api/convert-pdf', {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          const rawText = await res.text().catch(() => '');
          let errData: any = {};
          try {
            errData = JSON.parse(rawText);
          } catch (parseErr) {
            console.error("Raw response:", rawText);
          }
          throw new Error(errData.error || (rawText ? `Lỗi HTTP ${res.status}: ${rawText.substring(0, 150)}...` : 'Lỗi từ máy chủ API.'));
        }

        const data = await res.json();
        notifyFallbackIfNeeded(data);
        extractedText = data.text;
        if (data.isFinished === false) setIsAiFinished(false);
        else setIsAiFinished(true);
      }
      
      setProgress(70);
      setStatus('Hoàn thành sinh đề! Vui lòng kiểm tra lại kết quả.');
      setResultText(extractedText);
      setSuccess('Đã sinh đề thi mới hoàn tất. Bạn có thể chỉnh sửa trực tiếp bên dưới trước khi lưu thành file Word.');
      setProgress(100);

    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Có lỗi xảy ra trong quá trình sinh đề.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinueConvert = async () => {
    if (files.length === 0 || !resultText) return;
    if (!apiKey) {
      setError('Vui lòng cấu hình API Key ở góc trên cùng bên phải trước khi sử dụng.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');
    setStatus('Đang gửi phần đang viết dở cho AI để sinh tiếp...');
    setProgress(30);

    const finalContextSuggestion = `${contextSuggestion}\n${noParameterM ? '- Yêu cầu các câu hỏi KHÔNG chứa tham số m.\n' : ''}${useRealWorldData ? '- Ưu tiên sử dụng nhiều dữ kiện thực tế, bối cảnh thực tiễn vào các câu hỏi.\n' : ''}`;

    try {
      if (files.length === 1 && files[0].name.toLowerCase().endsWith('.docx')) {
         const file = files[0];
         const zip = await JSZip.loadAsync(file);
         const docXmlFile = zip.file('word/document.xml');
         if (!docXmlFile) throw new Error('File Word không hợp lệ.');
         const xmlString = await docXmlFile.async('string');
         const parser = new DOMParser();
         const xsltResponse = await fetch('/OMML2MML.XSL');
         const xsltText = await xsltResponse.text();
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
             for (let i = 0; i < el.childNodes.length; i++) childText += serializeNode(el.childNodes[i]);
             if (el.tagName === 'w:p') return childText + '\n\n';
             return childText;
           }
           return '';
         };
         const parsedText = serializeNode(resultDoc.documentElement);

         const res = await fetch('/api/convert-word', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ textContent: parsedText, parsingMode: 'similar_exam', model: model || 'auto', apiKey, includeShortSolution, examCount, contextSuggestion: finalContextSuggestion, continueFromText: resultText })
         });
         if (!res.ok) throw new Error('Lỗi từ máy chủ API.');
         const data = await res.json();
         notifyFallbackIfNeeded(data);
         setResultText(prev => prev + '\n' + data.text);
         if (data.isFinished === false) setIsAiFinished(false);
         else setIsAiFinished(true);
      } else {
         const formData = new FormData();
         for (const f of files) {
           if (!f.name.toLowerCase().endsWith('.docx')) {
             formData.append('files', f);
           }
         }
         formData.append('parsingMode', 'similar_exam');
         formData.append('model', model || 'auto');
         if (apiKey) formData.append('apiKey', apiKey);
         formData.append('includeShortSolution', String(includeShortSolution));
         formData.append('examCount', String(examCount));
         formData.append('contextSuggestion', finalContextSuggestion);
         formData.append('continueFromText', resultText);

         const res = await fetch('/api/convert-pdf', {
           method: 'POST',
           body: formData
         });
         if (!res.ok) throw new Error('Lỗi từ máy chủ API.');
         const data = await res.json();
         notifyFallbackIfNeeded(data);
         setResultText(prev => prev + '\n' + data.text);
         if (data.isFinished === false) setIsAiFinished(false);
         else setIsAiFinished(true);
      }
      
      setSuccess('Đã tạo tiếp phần nội dung bị thiếu!');
      setProgress(100);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi sinh tiếp nội dung.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadWord = () => {
    if (!resultText) return;
    const filename = files.length > 0 ? files[0].name : 'De_thi_tuong_tu';
    generateDocx(resultText, filename);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Copy size={20} />
          </div>
          Tạo Đề Thi Tương Tự Bằng AI (Từ PDF/Word/Ảnh)
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-2xl mx-auto">
          Tải lên đề thi gốc của bạn, hệ thống AI sẽ tự động phân tích cấu trúc, độ khó và dạng bài để sinh ra một đề thi hoàn toàn mới nhưng tương đương, kèm theo lời giải (nếu có yêu cầu).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 items-stretch">
        <div className="h-full">
          <div 
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all h-full flex flex-col justify-center items-center ${
              files.length > 0 ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              multiple
              accept="application/pdf,.doc,.docx,image/png,image/jpeg,image/jpg,image/webp,image/bmp" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center cursor-pointer w-full h-full" onClick={() => fileInputRef.current?.click()}>
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/40 text-purple-500 rounded-full flex items-center justify-center mb-4">
                  <Upload size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Kéo thả các file đề gốc vào đây</h3>
                <p className="text-slate-400 text-sm mt-1">Hỗ trợ 5 định dạng: PDF, Word (.docx, .doc), Ảnh và Bản scan</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full">
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  {files.slice(0, 3).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm shadow-sm">
                      <FileText size={14} className="text-purple-500" />
                      <span className="truncate max-w-[120px] text-slate-700 dark:text-slate-300 font-medium">{f.name}</span>
                    </div>
                  ))}
                  {files.length > 3 && (
                    <div className="flex items-center justify-center px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 font-medium shadow-sm">
                      +{files.length - 3} file khác
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Đã chọn {files.length} file</h3>
                
                <button 
                  onClick={() => { setFiles([]); setSuccess(''); setError(''); setResultText(''); }}
                  className="mt-4 text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors"
                  disabled={isProcessing}
                >
                  Huỷ bỏ / Chọn file khác
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div>
          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 h-full flex flex-col justify-center">
            <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-4">
              <Settings size={18} className="text-purple-500" />
              Cấu hình xử lý
            </h3>
            
            <div className="space-y-4">
              <div className="block relative p-4 border border-purple-500 bg-purple-50/50 dark:bg-purple-900/20 rounded-2xl transition-all">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-800 dark:text-slate-200">Số lượng đề cần tạo:</label>
                    <select 
                      value={examCount}
                      onChange={(e) => setExamCount(Number(e.target.value))}
                      className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value={1}>1 đề</option>
                      <option value={2}>2 đề</option>
                      <option value={3}>3 đề</option>
                      <option value={4}>4 đề</option>
                      <option value={5}>5 đề</option>
                    </select>
                  </div>
                  
                  <label className="flex items-center gap-3 cursor-pointer mt-2">
                    <input 
                      type="checkbox"
                      checked={includeShortSolution}
                      onChange={(e) => setIncludeShortSolution(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Kèm đáp án ngắn gọn</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer mt-2">
                    <input 
                      type="checkbox"
                      checked={noParameterM}
                      onChange={(e) => setNoParameterM(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Câu hỏi không có tham số m</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer mt-2">
                    <input 
                      type="checkbox"
                      checked={useRealWorldData}
                      onChange={(e) => setUseRealWorldData(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Câu hỏi sử dụng nhiều dữ kiện thực tế</span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer mt-2 p-2.5 rounded-xl bg-purple-100/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 hover:bg-purple-100/90 dark:hover:bg-purple-900/50 transition">
                    <input 
                      type="checkbox"
                      checked={keepOriginalDiagrams}
                      onChange={(e) => setKeepOriginalDiagrams(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300 mt-0.5 shrink-0"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-purple-900 dark:text-purple-200 text-xs sm:text-sm">
                        Giữ nguyên hình ảnh, bảng biến thiên, đồ thị (chỉ đổi câu hỏi & yêu cầu)
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Giữ nguyên hình vẽ/bảng biến thiên của đề gốc, AI chỉ đổi yêu cầu bài toán và 4 phương án.
                      </span>
                    </div>
                  </label>

                  <div className="mt-2">
                    <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">Gợi ý thay đổi ngữ cảnh (Tùy chọn):</label>
                    <textarea 
                      value={contextSuggestion}
                      onChange={(e) => setContextSuggestion(e.target.value)}
                      placeholder="Ví dụ: Đổi tên nhân vật thành Nam, Hùng; đổi bối cảnh sang thực tế..."
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px]"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleConvert}
              disabled={files.length === 0 || isProcessing}
              className={`w-full mt-6 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-purple-500/20 ${
                files.length === 0 || isProcessing
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500 shadow-none'
                  : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-purple-500/40 hover:-translate-y-0.5'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Bắt Đầu Tạo Đề'
              )}
            </button>
          </div>
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
          <div className="flex items-center justify-between text-sm font-semibold text-purple-700 dark:text-purple-400">
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              {status}
            </div>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-purple-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* LIVE PREVIEW EDITOR */}
      {resultText && (
        <div className="mt-8 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm bg-white dark:bg-slate-800">
          <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Edit3 size={18} className="text-purple-500" />
              Trình soạn thảo đề thi nhân bản
            </h3>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenDiagramModal('graph')}
                className="px-2.5 py-1 bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-teal-100 cursor-pointer"
              >
                <TrendingUp size={13} className="text-teal-600" /> Vẽ Đồ Thị
              </button>
              <button
                type="button"
                onClick={() => handleOpenDiagramModal('bbt')}
                className="px-2.5 py-1 bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-purple-100 cursor-pointer"
              >
                <TableIcon size={13} className="text-purple-600" /> Vẽ Bảng Biến Thiên
              </button>
              <button
                type="button"
                onClick={() => handleOpenDiagramModal('geometry')}
                className="px-2.5 py-1 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-amber-100 cursor-pointer"
              >
                <Box size={13} className="text-amber-600" /> Vẽ Hình 3D (GSP)
              </button>
              <span className="text-xs font-medium px-2.5 py-1 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 rounded-lg">
                Office Math & 300 DPI
              </span>
            </div>
          </div>
          
          <div className="p-0 bg-white dark:bg-slate-800 flex flex-col">
            <EditorToolbar text={resultText} setText={setResultText} onContinue={handleContinueConvert} isProcessing={isProcessing} />
            <MarkdownEditor text={resultText} setText={setResultText} />
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
            {isAiFinished === false ? (
              <p className="text-sm font-bold text-orange-600 dark:text-orange-400 max-w-lg flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0" />
                AI bị ngắt giữa chừng do văn bản quá dài. Vui lòng nhấn nút "Tiếp tục sinh" để hoàn thành nốt phần bị thiếu!
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Bạn có thể chỉnh sửa tự do trong ô trên. Khi thấy ưng ý, hãy nhấn lưu thành file Word. Nếu AI bị ngắt giữa chừng, hãy nhấn Tiếp tục sinh.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleContinueConvert}
                disabled={isProcessing || !resultText.trim()}
                className={`flex items-center gap-2 px-6 py-2.5 font-bold text-sm rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 ${isAiFinished === false ? 'bg-orange-500 hover:bg-orange-600 text-white animate-pulse' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'}`}
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                {isAiFinished === false ? 'Tiếp Tục Sinh Phần Thiếu' : 'Tiếp tục sinh'}
              </button>
              {onApplyExam && (
                <button
                  onClick={() => {
                    const parsed = parseExamMarkdownToCV7991(resultText, {
                      examTitle: files.length > 0 ? `Đề tương tự (${files[0].name})` : 'Đề thi tương tự CV 7991',
                    });
                    onApplyExam(parsed);
                    onNavigateToExam?.();
                  }}
                  disabled={!resultText.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  <ArrowRight size={18} />
                  Đẩy sang Đề chuẩn CV 7991
                </button>
              )}
              <button
                onClick={handleDownloadWord}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-green-500/20 hover:-translate-y-0.5"
              >
                <Download size={18} />
                Lưu thành file Word (.docx)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BỘ 3 CÔNG CỤ VẼ HÌNH 300 DPI CHUẨN IN ẤN VÀ WORD */}
      <IntegratedDiagramModal
        isOpen={diagramModalOpen}
        onClose={() => setDiagramModalOpen(false)}
        onInsertImage={handleInsertDiagramToResult}
        initialTab={diagramInitialTab}
        apiKey={apiKey}
        model={model}
      />
    </div>
  );
}
