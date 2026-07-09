const fs = require('fs');
const file = 'src/components/AITutor.tsx';
let code = fs.readFileSync(file, 'utf-8');

// 1. Add Icons and imports
code = code.replace(
  "import { Sparkles, GraduationCap, Send, User, RotateCcw, HelpCircle, ArrowRight, AlertCircle } from 'lucide-react';",
  "import { Sparkles, GraduationCap, Send, User, RotateCcw, HelpCircle, ArrowRight, AlertCircle, Download, FileText } from 'lucide-react';"
);

code = code.replace(
  "import { Session, Progress } from '../types';",
  "import { Session, Progress, Exam } from '../types';\nimport { downloadExamWordFile } from '../utils/examWordGenerator';"
);

// 2. Add parser helper
const parserHelper = `
  const tryParseExamJSON = (text: string): Exam | null => {
    try {
      const match = text.match(/\`\`\`json\\s*([\\s\\S]*?)\\s*\`\`\`/);
      if (match && match[1]) {
        const parsed = JSON.parse(match[1]);
        if (parsed._type === 'exam_generation' && parsed.exam) {
          return {
            ...parsed.exam,
            id: 'exam_' + Date.now(),
            subjectId: selectedSubject,
            difficultyRatio: parsed.exam.difficultyRatio || { easyCount: 0, mediumCount: 0, hardCount: 0 },
            createdAt: new Date().toISOString()
          } as Exam;
        }
      }
    } catch (e) {
      console.error("Failed to parse exam JSON from AI", e);
    }
    return null;
  };
`;
code = code.replace(
  "const [isChatLoading, setIsChatLoading] = useState<boolean>(false);",
  "const [isChatLoading, setIsChatLoading] = useState<boolean>(false);\n" + parserHelper
);

// 3. Update the prompt
const oldPrompt = "Bạn là Trợ Lý Gia Sư thông thái (AI Tutor) chuyên môn: ${selectedSubject} - ${selectedGrade}.";
const newPrompt = `Bạn là Trợ Lý Gia Sư thông thái (AI Tutor) chuyên môn: \${selectedSubject} - \${selectedGrade}.
NẾU NGƯỜI DÙNG YÊU CẦU "TẠO ĐỀ" HOẶC "SINH ĐỀ KIỂM TRA", bạn BẮT BUỘC phải trả về MỘT VÀ CHỈ MỘT đoạn mã JSON hợp lệ được bọc trong block code \`\`\`json và \`\`\`. Cấu trúc JSON phải đúng chuẩn sau:
{
  "_type": "exam_generation",
  "exam": {
    "title": "Tên Đề Bài Viết Hoa",
    "duration": 45,
    "questions": [
      {
        "id": "q1",
        "content": "Nội dung câu hỏi (hỗ trợ LaTeX $...$)",
        "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
        "correctAnswer": "A",
        "explanation": "Giải thích chi tiết (hỗ trợ LaTeX)",
        "difficulty": "easy",
        "type": "multiple-choice"
      }
    ]
  }
}
Lưu ý: options phải có chính xác 4 phần tử nếu là trắc nghiệm. difficulty chọn: 'easy' | 'medium' | 'hard'. type: 'multiple-choice' | 'true-false' | 'essay'.

Nếu người dùng hỏi bình thường, hãy trả lời bình thường.`;
code = code.replace(oldPrompt, newPrompt);

// 4. Update the render loop inside chatHistory
// We need to replace the content of the AI bubble text rendering
const oldRender = "<MathJaxRenderer content={msg.text.replace(/\\n/g, '<br/>')} inline={true} />";
const newRender = `
                  {(() => {
                    const exam = msg.sender === 'ai' ? tryParseExamJSON(msg.text) : null;
                    if (exam) {
                      return (
                        <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm space-y-3 mt-1">
                          <div className="flex items-center gap-2 text-blue-600 font-bold border-b border-blue-50 pb-2">
                            <FileText size={16} />
                            AI Đã Tạo Đề Thành Công
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 text-sm mb-1">{exam.title}</div>
                            <div className="text-slate-500 text-[11px] flex gap-2">
                              <span>• Số lượng: {exam.questions?.length || 0} câu</span>
                              <span>• Thời gian: {exam.duration} phút</span>
                            </div>
                          </div>
                          <button
                            onClick={() => downloadExamWordFile(exam)}
                            className="w-full py-2 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 font-semibold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
                          >
                            <Download size={14} />
                            Tải xuống Word (.docx)
                          </button>
                        </div>
                      );
                    }
                    
                    // If it contains a json block but is not an exam, strip the raw json block out of the display to avoid ugly text, or just show it if we want.
                    // To be safe, we just render the raw text via MathJax (it will show the raw markdown json which is fine).
                    const textToShow = msg.text.replace(/\\n/g, '<br/>');
                    return <MathJaxRenderer content={textToShow} inline={true} />;
                  })()}
`;
code = code.replace(oldRender, newRender);

fs.writeFileSync(file, code);
console.log('Exam generator integration complete');
