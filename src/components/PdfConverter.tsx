import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, Download, AlertCircle, CheckCircle2, Edit3, Settings } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import JSZip from 'jszip';
import EditorToolbar from './EditorToolbar';

interface Props {
  apiKey: string;
  model: string;
}

export default function PdfConverter({ apiKey, model }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [parsingMode, setParsingMode] = useState<string>('normal');
  const [resultText, setResultText] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/jpg'];
      
      const filteredFiles = selectedFiles.filter(f => {
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
      
      const filteredFiles = selectedFiles.filter(f => {
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
        // Very basic parsing for bold text **text**
        const parts = line.split(/(\*\*.*?\*\*)/g);
        const textRuns = parts.map(part => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return new TextRun({ text: part.slice(2, -2), bold: true, font: "Times New Roman", size: 28 });
          }
          return new TextRun({ text: part, font: "Times New Roman", size: 28 });
        });

        return new Paragraph({
          children: textRuns,
          spacing: { after: 200 }
        });
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs
        }]
      });

      const buffer = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(buffer);
      const link = document.createElement('a');
      link.href = url;
      
      let baseName = originalFilename.replace(/\.(pdf|docx|png|jpg|jpeg)$/i, '');
      if (files.length > 1) baseName = 'Tai_lieu_gop';
      link.download = `${baseName}_converted.docx`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess('Lưu file Word thành công! Đã tự động tải file xuống.');
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

    try {
      let extractedText = '';

      // Check if all files are DOCX (currently we only support processing one docx at a time for simplicity, but let's handle if it is a docx)
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
        setStatus('Đang gửi dữ liệu đến AI để chuẩn hoá sang LaTeX...');
        
        const res = await fetch('/api/convert-word', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textContent: parsedText,
            parsingMode: parsingMode,
            model: model || 'gemini-1.5-pro',
            apiKey: apiKey
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Lỗi từ máy chủ API.');
        }

        const data = await res.json();
        extractedText = data.text;

      } else {
        // PDF or Images (Multiple support)
        setStatus('Đang đọc dữ liệu file...');
        
        const base64Files = [];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          if (f.name.toLowerCase().endsWith('.docx')) {
            throw new Error('Chế độ xử lý hàng loạt hiện tại chỉ hỗ trợ Ảnh và PDF, không hỗ trợ trộn file Word chung với Ảnh.');
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

        setProgress(30);
        setStatus('Đang gửi dữ liệu đến AI (có thể mất vài phút)...');

        const res = await fetch('/api/convert-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: base64Files,
            parsingMode: parsingMode,
            model: model || 'gemini-1.5-pro',
            apiKey: apiKey
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Lỗi từ máy chủ API.');
        }

        const data = await res.json();
        extractedText = data.text;
      }
      
      setProgress(70);
      setStatus('Hoàn thành trích xuất! Vui lòng kiểm tra lại kết quả.');
      setResultText(extractedText);
      setSuccess('Đã trích xuất xong nội dung. Bạn có thể chỉnh sửa trực tiếp bên dưới trước khi lưu thành file Word.');
      setProgress(100);

    } catch (err: any) {
      console.error('Conversion error:', err);
      setError(err.message || 'Có lỗi xảy ra trong quá trình chuyển đổi.');
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

    try {
      const base64Files = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f.name.toLowerCase().endsWith('.docx')) {
           // Fallback for docx continue is not fully supported in this simple mode, but we pass empty files or skip it
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

      // If it's docx, we just call word api
      if (files.length === 1 && files[0].name.toLowerCase().endsWith('.docx')) {
         // Re-extract text...
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
           body: JSON.stringify({ textContent: parsedText, parsingMode, model: model || 'gemini-1.5-pro', apiKey, continueFromText: resultText })
         });
         if (!res.ok) {
           const errData = await res.json().catch(() => ({}));
           throw new Error(errData.error || 'Lỗi từ máy chủ API.');
         }
         const data = await res.json();
         setResultText(prev => prev + '\n' + data.text);
      } else {
         const res = await fetch('/api/convert-pdf', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ files: base64Files, parsingMode, model: model || 'gemini-1.5-pro', apiKey, continueFromText: resultText })
         });
         if (!res.ok) {
           const errData = await res.json().catch(() => ({}));
           throw new Error(errData.error || 'Lỗi từ máy chủ API.');
         }
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
    const filename = files.length > 0 ? files[0].name : 'Tai_lieu_chuyen_doi';
    generateDocx(resultText, filename);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <FileText size={20} />
          </div>
          Chuyển Đổi Nâng Cao (PDF/Word/Ảnh) Sang LaTeX
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-2xl mx-auto">
          Hỗ trợ bóc tách đề thi, chuyển đổi ảnh chụp hàng loạt và giữ nguyên 100% công thức Toán học dưới dạng mã LaTeX, giúp dễ dàng chỉnh sửa trên MS Word.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2">
          <div 
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all h-full flex flex-col justify-center items-center ${
              files.length > 0 ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              multiple
              accept="application/pdf,.docx,image/png,image/jpeg,image/jpg" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center cursor-pointer w-full h-full" onClick={() => fileInputRef.current?.click()}>
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-500 rounded-full flex items-center justify-center mb-4">
                  <Upload size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Kéo thả các file PDF, Word hoặc Ảnh vào đây</h3>
                <p className="text-slate-400 text-sm mt-1">Hỗ trợ tải lên nhiều file ảnh cùng lúc</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full">
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  {files.slice(0, 3).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm shadow-sm">
                      <FileText size={14} className="text-blue-500" />
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
              <Settings size={18} className="text-blue-500" />
              Cấu Hình Xử Lý
            </h3>
            
            <div className="space-y-4">
              <label className={`block relative p-4 border rounded-2xl cursor-pointer transition-all ${parsingMode === 'normal' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}>
                <div className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    name="parsingMode" 
                    value="normal"
                    checked={parsingMode === 'normal'}
                    onChange={() => setParsingMode('normal')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">Chuyển đổi thông thường</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Giữ nguyên định dạng gốc của tài liệu, giáo án.</div>
                  </div>
                </div>
              </label>

              <label className={`block relative p-4 border rounded-2xl cursor-pointer transition-all ${parsingMode === 'exam' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}>
                <div className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    name="parsingMode" 
                    value="exam"
                    checked={parsingMode === 'exam'}
                    onChange={() => setParsingMode('exam')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">Bóc tách Đề thi Trắc nghiệm</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tự động cấu trúc lại các câu hỏi và 4 đáp án A B C D.</div>
                  </div>
                </div>
              </label>
            </div>
            
            <button
              onClick={handleConvert}
              disabled={files.length === 0 || isProcessing}
              className={`w-full mt-6 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20 ${
                files.length === 0 || isProcessing
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500 shadow-none'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/40 hover:-translate-y-0.5'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Bắt Đầu Trích Xuất'
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
          <div className="flex items-center justify-between text-sm font-semibold text-blue-700 dark:text-blue-400">
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              {status}
            </div>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* LIVE PREVIEW EDITOR - SIDE BY SIDE */}
      {resultText && (
        <div className="mt-8 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm bg-white dark:bg-slate-800">
          <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Edit3 size={18} className="text-blue-500" />
              Chế độ Đối chiếu (Side-by-Side Editor)
            </h3>
            <span className="text-xs font-medium px-2.5 py-1 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 rounded-lg">
              Sẵn sàng xuất file
            </span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-700">
            {/* Cột trái: Hiển thị ảnh/PDF gốc */}
            <div className="bg-slate-100 dark:bg-slate-900/50 h-[600px] overflow-y-auto p-4 flex flex-col items-center gap-4 relative">
              {files.map((file, idx) => {
                const url = URL.createObjectURL(file);
                if (file.type.startsWith('image/')) {
                  return <img key={idx} src={url} alt={`Trang ${idx + 1}`} className="w-full max-w-lg h-auto border border-slate-300 dark:border-slate-600 shadow-sm rounded-lg" />;
                } else if (file.type === 'application/pdf') {
                  return <iframe key={idx} src={`${url}#toolbar=0`} className="w-full h-[800px] border border-slate-300 dark:border-slate-600 shadow-sm rounded-lg bg-white" title={`PDF ${idx + 1}`} />;
                } else {
                  return <div key={idx} className="p-4 bg-white dark:bg-slate-800 text-slate-500 text-sm rounded-lg w-full text-center">Tệp gốc định dạng Word - Hãy sửa nội dung bên phải.</div>;
                }
              })}
            </div>

            {/* Cột phải: Khung soạn thảo */}
            <div className="p-0 h-[600px] flex flex-col bg-white dark:bg-slate-800">
              <EditorToolbar text={resultText} setText={setResultText} onContinue={handleContinueConvert} isProcessing={isProcessing} />
              <textarea
                value={resultText}
                onChange={(e) => setResultText(e.target.value)}
                className="w-full h-full p-5 bg-transparent text-slate-700 dark:text-slate-300 outline-none resize-none font-mono text-sm leading-relaxed"
                spellCheck={false}
                placeholder="Đang chờ kết quả từ AI..."
              />
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bạn có thể nhìn đề bài gốc ở cột bên trái để dò lỗi và sửa nội dung kết quả ở cột bên phải.
            </p>
            <button
              onClick={handleDownloadWord}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-green-500/20 hover:-translate-y-0.5 shrink-0"
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
