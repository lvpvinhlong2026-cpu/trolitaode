/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Sparkles, GraduationCap, Send, User, RotateCcw, HelpCircle, ArrowRight, AlertCircle, Download, FileText, Upload, Loader2 } from 'lucide-react';
import { callGeminiAI } from '../utils/gemini';
import { Session, Progress, Exam } from '../types';
import { downloadExamWordFile } from '../utils/examWordGenerator';
import MathJaxRenderer from './MathJaxRenderer';
import { KNTT_CURRICULUM } from '../utils/curriculumData';

interface AITutorProps {
  sessions: Session[];
  progress: Progress;
}

export default function AITutor({
  sessions,
  progress
}: AITutorProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('Toán học');
  const [selectedGrade, setSelectedGrade] = useState<string>('Lớp 12');
  const [selectedChapter, setSelectedChapter] = useState<string>('Tất cả các bài');
  const [chatInput, setChatInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Array<{sender: 'user'|'ai', text: string}>>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Auto Generate State
  const [bCount, setBCount] = useState<number>(0);
  const [hCount, setHCount] = useState<number>(0);
  const [vdCount, setVdCount] = useState<number>(0);
  const [dsCount, setDsCount] = useState<number>(0);
  const [tlnCount, setTlnCount] = useState<number>(0);

  // File Solve State
  const [activePanelMode, setActivePanelMode] = useState<'generate' | 'solve'>('generate');
  const [solveFile, setSolveFile] = useState<File | null>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [solveError, setSolveError] = useState<string>('');
  const [pastedImage, setPastedImage] = useState<string | null>(null);

  const tryParseExamJSON = (text: string): { exam: Exam | null; error: string | null } => {
    const extractAndParse = (jsonStr: string) => {
      try {
        let sanitized = jsonStr.trim();
        // 1. Escape unescaped backslashes (e.g. \infty -> \\infty)
        sanitized = sanitized.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
        // 2. Remove trailing commas in arrays and objects
        sanitized = sanitized.replace(/,\s*([\]}])/g, '$1');
        // 3. Fix literal newlines and tabs inside strings
        sanitized = sanitized.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
          return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
        });
        
        const parsed = JSON.parse(sanitized);
        if (parsed._type === 'exam_generation' && parsed.exam) {
          return { exam: parsed.exam, error: null };
        }
        return { exam: null, error: 'JSON parsed but invalid structure.' };
      } catch (e: any) {
        return { exam: null, error: e.message };
      }
    };

    let lastError = null;

    try {
      // First try to match markdown code block
      const match = text.match(/```[a-zA-Z]*\s*([\s\S]*?)```/i);
      if (match) {
        const res = extractAndParse(match[1]);
        if (res.exam) return res;
        lastError = res.error;
      }
      
      // Fallback: search for outermost curly braces
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        const res = extractAndParse(text.substring(start, end + 1));
        if (res.exam) return res;
        lastError = res.error || lastError;
      }
    } catch (e) {
      // ignore
    }
    return { exam: null, error: lastError };
  };

  const handleAutoGenerate = () => {
    let parts = [];
    if (bCount > 0) parts.push(`${bCount} câu trắc nghiệm nhiều lựa chọn mức độ Nhận biết [B]`);
    if (hCount > 0) parts.push(`${hCount} câu trắc nghiệm nhiều lựa chọn mức độ Thông hiểu [H]`);
    if (vdCount > 0) parts.push(`${vdCount} câu trắc nghiệm nhiều lựa chọn mức độ Vận dụng [VD]`);
    if (dsCount > 0) parts.push(`${dsCount} câu trắc nghiệm Đúng/Sai [ĐS]`);
    if (tlnCount > 0) parts.push(`${tlnCount} câu Trả lời ngắn [TLN]`);
    
    if (parts.length === 0) return;
    
    const generatedPrompt = `Hãy tạo một đề kiểm tra chứa tổng cộng ${bCount + hCount + vdCount + dsCount + tlnCount} câu hỏi với ma trận phân bổ sau:\n- ` + parts.join('\n- ') + `\nYêu cầu cung cấp nội dung sắc bén, chuẩn xác và lời giải chi tiết.`;
    handleSendChatMessage(generatedPrompt);
  };

  const handleSolveFile = async () => {
    if (!solveFile) return;
    
    setChatHistory((p) => [...p, { sender: 'user', text: `[Đã gửi một tệp tài liệu: ${solveFile.name} để giải]` }]);
    setIsChatLoading(true);
    setIsSolving(true);
    setSolveError('');

    try {
      const isWord = solveFile.name.endsWith('.docx');
      const apiKey = localStorage.getItem('gemini_api_key') || '';
      
      let base64Files: { base64: string; mimeType: string }[] = [];
      let parsedText = "";

      if (isWord) {
        // We will just read it as array buffer and use mammoth if it was client side, but server handles it.
        // Wait, SimilarExamGenerator uses Mammoth on the client side, then sends text to server.
        // For simplicity, let's just use the server /api/convert-pdf for all or client Mammoth.
        // Wait, SimilarExamGenerator extracts text client-side for Word. Let's look at how SimilarExamGenerator does it.
        // To avoid bringing mammoth, let's just send the file to convert-pdf, which handles images/PDFs.
        // Wait, convert-pdf takes base64. convert-word takes textContent.
        // Let's implement reading base64.
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(solveFile);
        });

        base64Files.push({ base64: base64Data, mimeType: solveFile.type || 'application/octet-stream' });
      } else {
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(solveFile);
        });
        base64Files.push({ base64: base64Data, mimeType: solveFile.type });
      }

      // We just use /api/convert-pdf which accepts base64 files
      const res = await fetch('/api/convert-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: base64Files,
          parsingMode: 'solve_exam_tutor',
          model: 'gemini-1.5-pro',
          apiKey: apiKey
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Lỗi từ máy chủ API.');
      }

      const data = await res.json();
      setChatHistory((p) => [...p, { sender: 'ai', text: data.text || 'Hoàn tất giải đề.' }]);
    } catch (err: any) {
      setSolveError(err.message || 'Có lỗi xảy ra trong quá trình xử lý file.');
      setChatHistory((p) => [...p, { sender: 'ai', text: 'Tôi gặp sự cố khi đọc file: ' + err.message }]);
    } finally {
      setIsChatLoading(false);
      setIsSolving(false);
      setSolveFile(null); // Reset file
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setPastedImage(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSendChatMessage = async (overrideMessage?: string) => {
    const userMsg = overrideMessage || chatInput.trim();
    if (!userMsg && !pastedImage) return;

    setChatHistory((p) => [...p, { sender: 'user', text: userMsg + (pastedImage ? '\n\n[Đã đính kèm ảnh]' : '') }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const prompt = `
Bạn là một Trợ Lý Gia Sư (AI Tutor) đa năng. Tùy thuộc vào yêu cầu của người dùng, bạn hãy xử lý như sau:

NẾU NGƯỜI DÙNG YÊU CẦU "TẠO ĐỀ", "SINH ĐỀ KIỂM TRA" HOẶC TẠO BÀI TẬP:
- Đóng vai trò là chuyên gia môn: ${selectedSubject} - ${selectedGrade}${selectedChapter !== 'Tất cả các bài' ? ` (Nội dung tập trung vào: ${selectedChapter})` : ''}.
- Trình bày toàn bộ đề thi trực tiếp ra văn bản. Để người dùng dễ sao chép vào hệ thống, BẮT BUỘC tuân thủ ĐÚNG định dạng mẫu sau cho phần văn bản:
- Trắc nghiệm 4 lựa chọn (Mức độ dùng [B] cho Dễ, [H] cho TB, [VD] cho Khó):
  Câu 1 [B]: Nội dung câu hỏi...
  A. Phương án 1
  B. Phương án 2
  C. Phương án 3
  D. Phương án 4
  Lời giải: Giải thích... Đáp án A.
- Trắc nghiệm Đúng/Sai:
  Câu 2 [ĐS]: Nội dung câu hỏi...
  a) Mệnh đề 1
  b) Mệnh đề 2
  c) Mệnh đề 3
  d) Mệnh đề 4
  Lời giải: Giải thích... Đáp án: a) Đúng, b) Sai, c) Đúng, d) Sai.
- Trả lời ngắn:
  Câu 3 [TLN]: Nội dung câu hỏi...
  Lời giải: Giải thích... Đáp án: 12.5
2. NGAY BÊN DƯỚI phần trình bày, CUNG CẤP THÊM MỘT VÀ CHỈ MỘT đoạn mã JSON hợp lệ được bọc trong block code \`\`\`json và \`\`\` để hệ thống tạo file Word. KHÔNG viết bất kỳ câu dẫn nào (ví dụ: TUYỆT ĐỐI KHÔNG viết "Đây là mã JSON", "Bước 2", v.v.). Cấu trúc JSON phải đúng chuẩn sau:
{
  "_type": "exam_generation",
  "exam": {
    "title": "Tên Đề Bài Viết Hoa",
    "duration": 45,
    "questions": [
      {
        "id": "q1",
        "content": "Câu trắc nghiệm 4 lựa chọn",
        "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
        "correctAnswer": "A",
        "explanation": "Giải thích chi tiết (hỗ trợ LaTeX)",
        "difficulty": "easy",
        "type": "multiple-choice"
      },
      {
        "id": "q2",
        "content": "Câu trắc nghiệm ĐÚNG/SAI. Nội dung câu hỏi...",
        "options": ["Mệnh đề a", "Mệnh đề b", "Mệnh đề c", "Mệnh đề d"],
        "correctAnswer": "Đ-S-Đ-S",
        "explanation": "Giải thích chi tiết các mệnh đề",
        "difficulty": "medium",
        "type": "true-false"
      },
      {
        "id": "q3",
        "content": "Câu trắc nghiệm TRẢ LỜI NGẮN (không có options).",
        "correctAnswer": "12",
        "explanation": "Giải thích chi tiết",
        "difficulty": "hard",
        "type": "essay"
      }
    ]
  }
}
LƯU Ý RẤT QUAN TRỌNG VỀ JSON: Trong khối JSON ở Bước 2, bạn PHẢI nhân đôi tất cả các dấu gạch chéo \\ của công thức LaTeX (ví dụ: viết \\\\frac thay vì \\frac, \\\\infty thay vì \\infty). Nếu không, JSON.parse sẽ báo lỗi Bad escaped character!

NẾU NGƯỜI DÙNG HỎI BÌNH THƯỜNG HOẶC NHỜ GIẢI BÀI TẬP (không yêu cầu tạo đề):
Bạn hãy đóng vai trò là một CHUYÊN GIA ĐA MÔN am hiểu sâu rộng về vấn đề mà người dùng đang hỏi để trả lời. TUYỆT ĐỐI KHÔNG bị giới hạn bởi tùy chọn môn học (Toán/Lý/Hóa/v.v.) nếu câu hỏi/hình ảnh thuộc lĩnh vực khác. Hãy tự do phân tích và trả lời đúng trọng tâm.
Hãy phân tích và trả lời câu hỏi/yêu cầu sau một cách chuyên sâu, logic, súc tích và chính xác nhất.
Câu hỏi: "${userMsg}"

Yêu cầu định dạng:
1. Diễn giải lời giải từng bước một cách khoa học và dễ hiểu cho học sinh trung học phổ thông.
2. Mọi biểu thức hoặc ký hiệu toán học BẮT BUỘC phải bọc trong các cặp thẻ LaTeX: $...$ cho công thức nội dòng và $$...$$ cho biểu thức dạng khối.
3. Sử dụng tiếng Việt chuẩn sư phạm, lịch sự, thân thiện và giàu khích lệ.
4. Mọi câu trả lời và kiến thức BẮT BUỘC phải bám sát định hướng của bộ sách "Kết nối tri thức và cuộc sống" và định dạng SKILL PHUC (nếu liên quan đến trắc nghiệm).
`;
      const aiReply = await callGeminiAI(prompt, 'gemini-1.5-pro', pastedImage || undefined);
      setPastedImage(null);
      setChatHistory((p) => [...p, { sender: 'ai', text: aiReply || 'Rất tiếc tôi đang mất kết nối, hãy thử lại.' }]);
    } catch (err: any) {
      setChatHistory((p) => [
        ...p,
        { sender: 'ai', text: 'Thất bại khi liên hệ với trợ lý AI: ' + err.message }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="animate-fade-in p-1 max-w-4xl mx-auto w-full">
      {/* COLUMN B: AI Interactive Tutor Chat */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col h-[600px] justify-between">
        <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-dashed border-slate-100 shrink-0">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <i className="fa-solid fa-comments text-blue-500"></i>
              Gia Sư Đa Môn AI (Q&A)
            </h3>
            
            <button
              onClick={() => setChatHistory([chatHistory[0]])}
              className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold"
              title="Lịch sử chat"
            >
              Đặt lại
            </button>
          </div>

          
          {/* Quick Auto-Generate Panel */}
          <div className="mb-2 px-1">
             <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3 shadow-xs">
                {activePanelMode === 'generate' ? (
                  <>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <select
                        value={selectedSubject}
                        onChange={(e) => {
                          setSelectedSubject(e.target.value);
                          setSelectedChapter('Tất cả các bài');
                        }}
                        className="text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none font-medium text-slate-700 focus:ring-1 focus:ring-blue-500 shadow-sm"
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
                      <select
                        value={selectedGrade}
                        onChange={(e) => {
                          setSelectedGrade(e.target.value);
                          setSelectedChapter('Tất cả các bài');
                        }}
                        className="text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none font-medium text-slate-700 focus:ring-1 focus:ring-blue-500 shadow-sm"
                      >
                        <option value="Lớp 12">Lớp 12 (Kết nối tri thức)</option>
                        <option value="Lớp 11">Lớp 11 (Kết nối tri thức)</option>
                        <option value="Lớp 10">Lớp 10 (Kết nối tri thức)</option>
                        <option value="Lớp 9">Lớp 9 (Kết nối tri thức)</option>
                        <option value="Lớp 8">Lớp 8 (Kết nối tri thức)</option>
                        <option value="Lớp 7">Lớp 7 (Kết nối tri thức)</option>
                        <option value="Lớp 6">Lớp 6 (Kết nối tri thức)</option>
                      </select>
                      
                      {selectedSubject !== 'Tiếng Anh' && KNTT_CURRICULUM[selectedSubject] && KNTT_CURRICULUM[selectedSubject][selectedGrade] && (
                        <select
                          value={selectedChapter}
                          onChange={(e) => setSelectedChapter(e.target.value)}
                          className="text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none font-medium text-slate-700 focus:ring-1 focus:ring-blue-500 max-w-[200px] truncate shadow-sm"
                        >
                          <option value="Tất cả các bài">Tất cả các bài</option>
                          {KNTT_CURRICULUM[selectedSubject][selectedGrade].map((chap, idx) => (
                            <option key={idx} value={chap}>{chap}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                       <div className="flex items-center gap-1.5">
                          <label className="text-[11px] text-slate-600 font-semibold" title="Nhận biết">Số câu [B]:</label>
                          <input type="number" min="0" value={bCount === 0 ? '' : bCount} onChange={e => setBCount(Number(e.target.value))} placeholder="0" className="w-12 p-1.5 text-xs text-center border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white shadow-sm" />
                       </div>
                       <div className="flex items-center gap-1.5">
                          <label className="text-[11px] text-slate-600 font-semibold" title="Thông hiểu">Số câu [H]:</label>
                          <input type="number" min="0" value={hCount === 0 ? '' : hCount} onChange={e => setHCount(Number(e.target.value))} placeholder="0" className="w-12 p-1.5 text-xs text-center border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white shadow-sm" />
                       </div>
                       <div className="flex items-center gap-1.5">
                          <label className="text-[11px] text-slate-600 font-semibold" title="Vận dụng">Số câu [VD]:</label>
                          <input type="number" min="0" value={vdCount === 0 ? '' : vdCount} onChange={e => setVdCount(Number(e.target.value))} placeholder="0" className="w-12 p-1.5 text-xs text-center border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white shadow-sm" />
                       </div>
                       <div className="flex items-center gap-1.5">
                          <label className="text-[11px] text-slate-600 font-semibold" title="Đúng/Sai">Số câu [ĐS]:</label>
                          <input type="number" min="0" value={dsCount === 0 ? '' : dsCount} onChange={e => setDsCount(Number(e.target.value))} placeholder="0" className="w-12 p-1.5 text-xs text-center border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white shadow-sm" />
                       </div>
                       <div className="flex items-center gap-1.5">
                          <label className="text-[11px] text-slate-600 font-semibold" title="Trả lời ngắn">Số câu [TLN]:</label>
                          <input type="number" min="0" value={tlnCount === 0 ? '' : tlnCount} onChange={e => setTlnCount(Number(e.target.value))} placeholder="0" className="w-12 p-1.5 text-xs text-center border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white shadow-sm" />
                       </div>
                       <button 
                         onClick={handleAutoGenerate} 
                         disabled={bCount+hCount+vdCount+dsCount+tlnCount === 0 || isChatLoading}
                         className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                       >
                         Tạo Đề
                         <i className="fa-solid fa-paper-plane"></i>
                       </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept=".pdf,.docx,.png,.jpg,.jpeg"
                        onChange={(e) => setSolveFile(e.target.files ? e.target.files[0] : null)}
                        className="text-xs w-full text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 outline-none"
                      />
                      <button 
                        onClick={handleSolveFile}
                        disabled={!solveFile || isSolving || isChatLoading}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                      >
                        {isSolving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        {isSolving ? 'Đang giải...' : 'Gửi cho Gia sư'}
                      </button>
                    </div>
                    {solveError && <p className="text-red-500 text-[10px] mt-1">{solveError}</p>}
                    <p className="text-[10px] text-slate-500 italic">Hỗ trợ định dạng: PDF, Word (.docx), hoặc Ảnh (PNG, JPG). Cỡ file tối đa 10MB.</p>
                  </div>
                )}
             </div>
          </div>

          {/* Input area */}
          <div className="flex flex-col gap-2 shrink-0 px-1 mb-2">
            {pastedImage && (
              <div className="relative inline-block w-fit mt-1">
                <img src={pastedImage} alt="Pasted preview" className="h-20 w-auto rounded-lg border border-slate-200 shadow-sm" />
                <button 
                  onClick={() => setPastedImage(null)}
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow"
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChatMessage();
                    }
                  }}
                placeholder="Ví dụ: Phân tích nguyên nhân... (Hỗ trợ Ctrl+V dán ảnh)"
                className="flex-1 text-xs p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl outline-none transition-all"
              />
              <button
                onClick={() => handleSendChatMessage()}
                disabled={isChatLoading || (!chatInput.trim() && !pastedImage)}
                className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-sm"
              >
                <Send size={14} />
              </button>
            </div>
          </div>

          {/* Messages stream */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1 border-t border-slate-100 pt-3">
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-2.5 max-w-[90%] items-start ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {msg.sender === 'user' ? <User size={13} /> : <i className="fa-solid fa-brain text-[10px]"></i>}
                </div>

                <div className={`p-3 rounded-2xl text-xs leading-relaxed select-text ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/50'
                }`}>
                  
                  {(() => {
                    const parseResult = msg.sender === 'ai' ? tryParseExamJSON(msg.text) : { exam: null, error: null };
                    const exam = parseResult.exam;
                    
                    // Strip the JSON block out of the display to avoid ugly text, showing only markdown text
                    let textToShow = msg.text;
                    if (msg.sender === 'ai' && msg.text.includes('```')) {
                      // Remove markdown code blocks and optional trailing spaces
                      textToShow = msg.text.replace(/```[a-zA-Z]*\s*[\s\S]*?```/ig, '');
                      // Clean up stray transition artifacts (like '---' or 'Bước 2:')
                      textToShow = textToShow.replace(/(?:---|___|\*\*\*)\s*(?:#*\s*BƯỚC 2:.*?|#*\s*MÃ JSON:.*?)?$/im, '');
                      textToShow = textToShow.replace(/(?:#*\s*BƯỚC 2:.*?|#*\s*MÃ JSON:.*?)$/im, '');
                      textToShow = textToShow.trim();
                    }
                    
                    let finalExam = exam;
                    // Fallback: If no structured JSON was found, still allow downloading the text as a Word doc
                    // We also skip index 0 so the initial greeting message doesn't have a download button
                    if (msg.sender === 'ai' && !finalExam && textToShow.trim().length > 0 && index > 0) {
                      finalExam = {
                        id: 'fallback',
                        title: 'Tài Liệu Gia Sư AI',
                        subjectId: selectedSubject,
                        duration: 45,
                        createdAt: new Date().toISOString(),
                        difficultyRatio: { easyCount: 0, mediumCount: 0, hardCount: 0 },
                        questions: [
                          {
                            id: 'q-fallback',
                            content: "Nội dung trích xuất từ AI:",
                            explanation: textToShow,
                            type: 'essay',
                            correctAnswer: '',
                            difficulty: 'easy'
                          }
                        ]
                      };
                    }

                    textToShow = textToShow.replace(/\n/g, '<br/>');

                    return (
                      <div className="w-full space-y-2">
                        {textToShow && (
                          <MathJaxRenderer content={textToShow} inline={true} />
                        )}

                        {finalExam && msg.sender === 'ai' && (
                          <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                            <span className="text-xs text-blue-600 font-bold flex items-center gap-1.5">
                              <FileText size={14} /> Đã chuẩn bị xong file Word.
                            </span>
                            <div className="flex items-center gap-2">
                              {exam ? (
                                <>
                                  <button
                                    onClick={() => downloadExamWordFile(finalExam, 'student')}
                                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-blue-600 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm border border-blue-200"
                                  >
                                    <Download size={13} />
                                    Tải bản Học sinh
                                  </button>
                                  <button
                                    onClick={() => downloadExamWordFile(finalExam, 'teacher')}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                                  >
                                    <Download size={13} />
                                    Tải bản có Lời giải
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => downloadExamWordFile(finalExam, 'teacher')}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                                >
                                  <Download size={13} />
                                  Tải đoạn chat này (.docx)
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                </div>
              </div>
            ))}

            {isChatLoading && (
              <div className="flex gap-2.5 max-w-[90%]">
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                  <i className="fa-solid fa-brain text-[10px] animate-pulse"></i>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none text-xs text-slate-400 flex items-center gap-1.5 font-bold">
                  <i className="fa-solid fa-circle-notch animate-spin text-[10px]"></i>
                  AI đang tư duy giải pháp...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
