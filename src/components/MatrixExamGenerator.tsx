import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, Download, AlertCircle, CheckCircle2, Edit3, Settings, Table, Plus, Trash2 } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import JSZip from 'jszip';
import { KNTT_CURRICULUM } from '../utils/curriculumData';
import EditorToolbar from './EditorToolbar';

interface Props {
  apiKey: string;
  model: string;
}

interface MatrixRow {
  id: string;
  topic: string;
  tn_b: number;
  tn_h: number;
  ds_count: number;
  ds_b: number;
  ds_h: number;
  ds_vd: number;
  tln_count: number;
}

export default function MatrixExamGenerator({ apiKey, model }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [subject, setSubject] = useState<string>('Toán học');
  const [grade, setGrade] = useState<string>('Lớp 12');
  
  const topicsList = KNTT_CURRICULUM[subject]?.[grade] || [];
  
  const [matrixRows, setMatrixRows] = useState<MatrixRow[]>([
    { id: 'row-1', topic: '', tn_b: 0, tn_h: 0, ds_count: 0, ds_b: 0, ds_h: 0, ds_vd: 0, tln_count: 0 }
  ]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [resultText, setResultText] = useState<string>('');
  
  const [includeSolution, setIncludeSolution] = useState<boolean>(true);
  
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

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
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

  const addMatrixRow = () => {
    setMatrixRows([
      ...matrixRows, 
      { id: 'row-' + Date.now(), topic: '', tn_b: 0, tn_h: 0, ds_count: 0, ds_b: 0, ds_h: 0, ds_vd: 0, tln_count: 0 }
    ]);
  };

  const removeMatrixRow = (id: string) => {
    if (matrixRows.length === 1) return;
    setMatrixRows(matrixRows.filter(r => r.id !== id));
  };

  const updateMatrixRow = (id: string, field: keyof MatrixRow, value: any) => {
    setMatrixRows(matrixRows.map(r => r.id === id ? { ...r, [field]: value } : r));
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
      link.download = `${originalFilename}_Theo_Ma_Tran.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccess('Lưu đề thi Word thành công! Đã tự động tải file xuống.');
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
    
    // Validation
    let totalQs = 0;
    const cleanMatrix = matrixRows.filter(r => r.topic.trim() !== '' || r.tn_b > 0 || r.tn_h > 0 || r.ds_count > 0 || r.tln_count > 0);
    if (cleanMatrix.length === 0) {
      setError('Vui lòng thiết lập ít nhất 1 chủ đề và số lượng câu hỏi trong ma trận.');
      return;
    }
    
    for (const r of cleanMatrix) {
      if (!r.topic.trim()) {
        setError('Có dòng ma trận chưa nhập Tên chủ đề/Nội dung.');
        return;
      }
      if (r.ds_count > 0 && (r.ds_b + r.ds_h + r.ds_vd !== 4)) {
        setError(`Chủ đề "${r.topic}" có câu Đúng/Sai nhưng cấu trúc ý (B+H+VD) tổng không bằng 4.`);
        return;
      }
      totalQs += r.tn_b + r.tn_h + r.ds_count + r.tln_count;
    }
    
    if (totalQs === 0) {
      setError('Tổng số câu hỏi trong ma trận phải lớn hơn 0.');
      return;
    }


    setIsProcessing(true);
    setError('');
    setSuccess('');
    setResultText('');
    setProgress(10);

    // Format Matrix Config for AI
    let matrixString = `BẢNG MA TRẬN ĐẶC TẢ (CHUẨN 2025):\n`;
    matrixString += `Môn học: ${subject}\n`;
    matrixString += `Khối/Lớp: ${grade}\n`;
    matrixString += `Yêu cầu bắt buộc: Mọi dữ liệu (ngữ cảnh, thuật ngữ, số liệu) sinh ra phải BÁM SÁT CHƯƠNG TRÌNH VÀ BỘ SÁCH "KẾT NỐI TRI THỨC VỚI CUỘC SỐNG".\n\n`;
    matrixString += `| STT | Nội dung / Chủ đề | Trắc nghiệm (B) | Trắc nghiệm (H) | Đúng/Sai (Số câu) | Cấu trúc ý ĐS (B-H-VD) | Trả lời ngắn |\n`;
    matrixString += `|---|---|---|---|---|---|---|\n`;
    cleanMatrix.forEach((r, i) => {
      const dsStruct = r.ds_count > 0 ? `${r.ds_b}-${r.ds_h}-${r.ds_vd}` : '0-0-0';
      matrixString += `| ${i + 1} | ${r.topic} | ${r.tn_b} | ${r.tn_h} | ${r.ds_count} | ${dsStruct} | ${r.tln_count} |\n`;
    });
    matrixString += `\nTổng số câu: ${totalQs}`;

    try {
      let extractedText = '';

      if (files.length === 0) {
        setStatus('Đang phân tích ma trận và sinh đề (AI đang làm việc)...');
        setProgress(40);
        
        const res = await fetch('/api/convert-word', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textContent: "",
            parsingMode: 'matrix_exam',
            model: model || 'gemini-1.5-pro',
            apiKey: apiKey,
            includeSolution,
            matrixConfig: matrixString
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Lỗi từ máy chủ API.');
        }

        const data = await res.json();
        extractedText = data.text;

      } else {
        setStatus('Đang đọc và xử lý dữ liệu các file...');
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
        setStatus('Đang phân tích cấu trúc ma trận và sinh đề mới (AI đang làm việc - có thể mất vài phút)...');

        if (base64Files.length === 0) {
          // Only docx files
          const res = await fetch('/api/convert-word', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              textContent: combinedDocxText,
              parsingMode: 'matrix_exam',
              model: model || 'gemini-1.5-pro',
              apiKey: apiKey,
              includeSolution,
              matrixConfig: matrixString
            })
          });
          if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Lỗi từ máy chủ API.');
          extractedText = (await res.json()).text;
        } else {
          // Has PDF/Image (and optionally docx)
          const res = await fetch('/api/convert-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              files: base64Files,
              textContent: combinedDocxText,
              parsingMode: 'matrix_exam',
              model: model || 'gemini-1.5-pro',
              apiKey: apiKey,
              includeSolution,
              matrixConfig: matrixString
            })
          });
          if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Lỗi từ máy chủ API.');
          extractedText = (await res.json()).text;
        }
      }
      
      setProgress(70);
      setStatus('Hoàn thành sinh đề theo ma trận!');
      setResultText(extractedText);
      setSuccess('Đã sinh đề thi hoàn tất. Bạn có thể chỉnh sửa trực tiếp bên dưới trước khi lưu thành file Word.');
      setProgress(100);

    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Có lỗi xảy ra trong quá trình sinh đề.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinueConvert = async () => {
    if (!resultText) return;
    if (!apiKey) {
      setError('Vui lòng cấu hình API Key ở góc trên cùng bên phải trước khi sử dụng.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');
    setStatus('Đang gửi phần đang viết dở cho AI để sinh tiếp...');
    setProgress(30);

    // Xây dựng lại matrixString
    let totalQs = 0;
    const cleanMatrix = matrixRows.filter(r => r.topic.trim() !== '' || r.tn_b > 0 || r.tn_h > 0 || r.ds_count > 0 || r.tln_count > 0);
    cleanMatrix.forEach(r => { totalQs += r.tn_b + r.tn_h + r.ds_count + r.tln_count; });
    let matrixString = `BẢNG MA TRẬN ĐẶC TẢ (CHUẨN 2025):\n`;
    matrixString += `Môn học: ${subject}\n`;
    matrixString += `Khối/Lớp: ${grade}\n`;
    matrixString += `Yêu cầu bắt buộc: Mọi dữ liệu (ngữ cảnh, thuật ngữ, số liệu) sinh ra phải BÁM SÁT CHƯƠNG TRÌNH VÀ BỘ SÁCH "KẾT NỐI TRI THỨC VỚI CUỘC SỐNG".\n\n`;
    matrixString += `| STT | Nội dung / Chủ đề | Trắc nghiệm (B) | Trắc nghiệm (H) | Đúng/Sai (Số câu) | Cấu trúc ý ĐS (B-H-VD) | Trả lời ngắn |\n`;
    matrixString += `|---|---|---|---|---|---|---|\n`;
    cleanMatrix.forEach((r, i) => {
      const dsStruct = r.ds_count > 0 ? `${r.ds_b}-${r.ds_h}-${r.ds_vd}` : '0-0-0';
      matrixString += `| ${i + 1} | ${r.topic} | ${r.tn_b} | ${r.tn_h} | ${r.ds_count} | ${dsStruct} | ${r.tln_count} |\n`;
    });
    matrixString += `\nTổng số câu: ${totalQs}`;

    try {
      const base64Files = [];
      let combinedDocxText = '';
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f.name.toLowerCase().endsWith('.docx')) {
           // Skip docx re-parsing for continue or basic passing
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

      if (base64Files.length === 0 && files.length > 0 && files.every(f => f.name.toLowerCase().endsWith('.docx'))) {
         // All files were docx
         const res = await fetch('/api/convert-word', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ textContent: "Tài liệu đính kèm.", parsingMode: 'matrix_exam', model: model || 'gemini-1.5-pro', apiKey, includeSolution, matrixConfig: matrixString, continueFromText: resultText })
         });
         if (!res.ok) throw new Error('Lỗi từ máy chủ API.');
         const data = await res.json();
         setResultText(prev => prev + '\n' + data.text);
      } else if (base64Files.length === 0 && files.length === 0) {
         // No files at all
         const res = await fetch('/api/convert-word', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ textContent: "", parsingMode: 'matrix_exam', model: model || 'gemini-1.5-pro', apiKey, includeSolution, matrixConfig: matrixString, continueFromText: resultText })
         });
         if (!res.ok) throw new Error('Lỗi từ máy chủ API.');
         const data = await res.json();
         setResultText(prev => prev + '\n' + data.text);
      } else {
         const res = await fetch('/api/convert-pdf', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ files: base64Files, textContent: "Tài liệu đính kèm.", parsingMode: 'matrix_exam', model: model || 'gemini-1.5-pro', apiKey, includeSolution, matrixConfig: matrixString, continueFromText: resultText })
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
    const filename = files.length > 0 ? files[0].name.replace(/\.[^/.]+$/, "") : 'De_Thi_Ma_Tran';
    generateDocx(resultText, filename);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Table size={20} />
          </div>
          Tạo Đề Theo Ma Trận Đặc Tả
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-3xl mx-auto">
          Xây dựng khung ma trận với các mức độ Nhận biết [B], Thông hiểu [H], Vận dụng [VD], Vận dụng cao [VDC] và định dạng câu hỏi đặc thù [DS], [TLN]. Hệ thống sẽ tự động sinh đề khớp hoàn toàn với cấu trúc bạn đưa ra.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-6">
          {/* NGUỒN DỮ LIỆU */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">1</span>
              Nguồn dữ liệu tham khảo (Tùy chọn tải lên)
            </h3>
            
            <div 
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
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
                  <div className="flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={24} className="text-indigo-500 mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Kéo thả hoặc chọn file tài liệu</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="flex flex-wrap gap-2 justify-center mb-2 max-h-32 overflow-y-auto">
                      {files.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs">
                          <FileText size={12} className="text-indigo-500" />
                          <span className="truncate max-w-[150px]">{f.name}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setFiles([])} className="text-xs text-red-500 font-semibold mt-2 hover:underline">Xóa tất cả {files.length} file</button>
                  </div>
                )}
              </div>
          </div>

          {/* BẢNG MA TRẬN */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-x-auto">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">2</span>
                Thiết lập Ma trận
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="text-xs font-semibold px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Toán học">Toán học</option>
                  <option value="Vật lý">Vật lý</option>
                  <option value="Hóa học">Hóa học</option>
                  <option value="Sinh học">Sinh học</option>
                  <option value="Ngữ văn">Ngữ văn</option>
                  <option value="Lịch sử">Lịch sử</option>
                  <option value="Địa lý">Địa lý</option>
                  <option value="Tin học">Tin học</option>
                  <option value="Tiếng Anh">Tiếng Anh</option>
                </select>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="text-xs font-semibold px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Lớp 12">Lớp 12 (Kết nối tri thức)</option>
                  <option value="Lớp 11">Lớp 11 (Kết nối tri thức)</option>
                  <option value="Lớp 10">Lớp 10 (Kết nối tri thức)</option>
                  <option value="Lớp 9">Lớp 9 (Kết nối tri thức)</option>
                  <option value="Lớp 8">Lớp 8 (Kết nối tri thức)</option>
                  <option value="Lớp 7">Lớp 7 (Kết nối tri thức)</option>
                  <option value="Lớp 6">Lớp 6 (Kết nối tri thức)</option>
                </select>
                <button 
                  onClick={addMatrixRow}
                  className="flex items-center gap-1.5 text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-200 transition-colors"
                >
                  <Plus size={14} /> Thêm Chủ Đề
                </button>
              </div>
            </h3>

            <div className="overflow-x-auto pb-4">
              <div className="min-w-[1000px]">
                {/* Header group */}
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-t-xl overflow-hidden border-b border-slate-200 dark:border-slate-700">
                  <div className="w-1/4 p-2 text-center font-bold text-xs text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">Nội dung / Chủ đề</div>
                  <div className="w-1/4 p-2 text-center font-bold text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 border-r border-slate-200 dark:border-slate-700">Trắc nghiệm (Phần I)</div>
                  <div className="w-1/4 p-2 text-center font-bold text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 border-r border-slate-200 dark:border-slate-700">Đúng/Sai (Phần II)</div>
                  <div className="w-[15%] p-2 text-center font-bold text-xs bg-amber-50 text-amber-700 dark:bg-amber-900/30 border-r border-slate-200 dark:border-slate-700">Trả lời ngắn (P. III)</div>
                  <div className="w-[10%] p-2 text-center font-bold text-xs text-slate-700 dark:text-slate-300">Xoá</div>
                </div>
                
                {/* Sub-header */}
                <div className="flex bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-500">
                  <div className="w-1/4 p-2"></div>
                  <div className="w-1/4 flex divide-x divide-slate-200 dark:divide-slate-700">
                    <div className="w-1/2 text-center p-1" title="Nhận biết">[B]</div>
                    <div className="w-1/2 text-center p-1" title="Thông hiểu">[H]</div>
                  </div>
                  <div className="w-1/4 flex divide-x divide-slate-200 dark:divide-slate-700">
                    <div className="w-1/4 text-center p-1 font-bold">Số câu</div>
                    <div className="w-1/4 text-center p-1 text-emerald-600" title="Số ý Nhận biết">Ý [B]</div>
                    <div className="w-1/4 text-center p-1 text-emerald-600" title="Số ý Thông hiểu">Ý [H]</div>
                    <div className="w-1/4 text-center p-1 text-emerald-600" title="Số ý Vận dụng">Ý [VD]</div>
                  </div>
                  <div className="w-[15%] text-center p-1">Số câu</div>
                  <div className="w-[10%]"></div>
                </div>

                {/* Rows */}
                <div className="space-y-2 mt-2 p-1">
                  {matrixRows.map((row) => (
                    <div key={row.id} className="flex items-center gap-0 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:border-indigo-300">
                      <div className="w-1/4 px-1">
                        <select 
                          value={row.topic}
                          onChange={(e) => updateMatrixRow(row.id, 'topic', e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">-- Chọn bài học --</option>
                          {topicsList.map((t, idx) => (
                            <option key={idx} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      {/* TN */}
                      <div className="w-1/4 flex gap-1 px-1">
                        <input type="number" min="0" value={row.tn_b === 0 ? '' : row.tn_b} onChange={(e) => updateMatrixRow(row.id, 'tn_b', parseInt(e.target.value) || 0)} className="w-1/2 text-center text-xs px-1 py-1.5 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg focus:outline-none focus:border-blue-500" placeholder="0" />
                        <input type="number" min="0" value={row.tn_h === 0 ? '' : row.tn_h} onChange={(e) => updateMatrixRow(row.id, 'tn_h', parseInt(e.target.value) || 0)} className="w-1/2 text-center text-xs px-1 py-1.5 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg focus:outline-none focus:border-blue-500" placeholder="0" />
                      </div>
                      {/* DS */}
                      <div className="w-1/4 flex gap-1 px-1">
                        <input type="number" min="0" value={row.ds_count === 0 ? '' : row.ds_count} onChange={(e) => updateMatrixRow(row.id, 'ds_count', parseInt(e.target.value) || 0)} className="w-1/4 font-bold text-center text-xs px-1 py-1.5 bg-emerald-100/50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700 rounded-lg focus:outline-none focus:border-emerald-500" placeholder="0" />
                        <input type="number" min="0" value={row.ds_b === 0 ? '' : row.ds_b} onChange={(e) => updateMatrixRow(row.id, 'ds_b', parseInt(e.target.value) || 0)} className="w-1/4 text-center text-xs px-1 py-1.5 bg-emerald-50/30 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg focus:outline-none focus:border-emerald-500" placeholder="0" disabled={row.ds_count === 0} />
                        <input type="number" min="0" value={row.ds_h === 0 ? '' : row.ds_h} onChange={(e) => updateMatrixRow(row.id, 'ds_h', parseInt(e.target.value) || 0)} className="w-1/4 text-center text-xs px-1 py-1.5 bg-emerald-50/30 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg focus:outline-none focus:border-emerald-500" placeholder="0" disabled={row.ds_count === 0} />
                        <input type="number" min="0" value={row.ds_vd === 0 ? '' : row.ds_vd} onChange={(e) => updateMatrixRow(row.id, 'ds_vd', parseInt(e.target.value) || 0)} className="w-1/4 text-center text-xs px-1 py-1.5 bg-emerald-50/30 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg focus:outline-none focus:border-emerald-500" placeholder="0" disabled={row.ds_count === 0} />
                      </div>
                      {/* TLN */}
                      <div className="w-[15%] flex justify-center px-1">
                        <input type="number" min="0" value={row.tln_count === 0 ? '' : row.tln_count} onChange={(e) => updateMatrixRow(row.id, 'tln_count', parseInt(e.target.value) || 0)} className="w-1/2 font-bold text-center text-xs px-1 py-1.5 bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg focus:outline-none focus:border-amber-500" placeholder="0" />
                      </div>
                      {/* Del */}
                      <div className="w-[10%] flex justify-center">
                        <button 
                          onClick={() => removeMatrixRow(row.id)}
                          disabled={matrixRows.length === 1}
                          className={`p-1.5 rounded-lg transition-colors ${matrixRows.length === 1 ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600'}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Tổng số câu hỏi:</span>
              <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                {matrixRows.reduce((acc, row) => acc + row.tn_b + row.tn_h + row.ds_count + row.tln_count, 0)}
              </span>
            </div>
          </div>
        </div>
        
        {/* CỘT CẤU HÌNH & RUN */}
        <div>
          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 h-full flex flex-col justify-center">
            <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">3</span>
              Tuỳ Chỉnh Chung
            </h3>
            
            <div className="space-y-4">
              <div className="block relative p-4 border border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl transition-all">
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={includeSolution}
                      onChange={(e) => setIncludeSolution(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Kèm Lời Giải Chi Tiết</span>
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 pl-7">AI sẽ tự động viết hướng dẫn giải cho từng câu dưới định dạng chuẩn.</p>
                </div>
              </div>
              
              <div className="text-xs text-slate-500 dark:text-slate-400 p-4 border border-slate-200 dark:border-slate-700 rounded-2xl">
                <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5"><AlertCircle size={14} /> Lưu ý từ hệ thống:</p>
                - Các câu hỏi Đúng/Sai (chọn 4 ý a,b,c,d) sẽ có tag <b>[DS]</b>.<br/>
                - Câu trả lời ngắn (chỉ ghi đáp án) sẽ có tag <b>[TLN]</b>.<br/>
                - Tag mức độ <b>[B], [H], [VD]</b> luôn được gắn trước để nhận diện.
              </div>
            </div>
            
            <button
              onClick={handleConvert}
              disabled={isProcessing}
              className={`w-full mt-6 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 ${
                isProcessing
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500 shadow-none'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/40 hover:-translate-y-0.5'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Bắt Đầu Sinh Đề Thi'
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
              Trình Soạn Thảo (Live Editor)
            </h3>
            <span className="text-xs font-medium px-2.5 py-1 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 rounded-lg">
              Sẵn sàng xuất file
            </span>
          </div>
          
          <div className="p-0 bg-white dark:bg-slate-800 flex flex-col">
            <EditorToolbar text={resultText} setText={setResultText} onContinue={handleContinueConvert} isProcessing={isProcessing} />
            <textarea
              value={resultText}
              onChange={(e) => setResultText(e.target.value)}
              className="w-full h-[400px] p-5 bg-transparent text-slate-700 dark:text-slate-300 outline-none resize-y font-mono text-sm leading-relaxed"
              spellCheck={false}
              placeholder="Đang chờ kết quả từ AI..."
            />
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
