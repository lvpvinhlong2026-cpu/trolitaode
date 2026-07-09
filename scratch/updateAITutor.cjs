const fs = require('fs');
const file = 'src/components/AITutor.tsx';
let code = fs.readFileSync(file, 'utf-8');

// 1. Remove unused imports
code = code.replace(
  "import { getAIRecommendations, callGeminiAI } from '../utils/gemini';",
  "import { callGeminiAI } from '../utils/gemini';"
);

// 2. Remove unused state and functions
code = code.replace(
  /const \[selectedStudentName, setSelectedStudentName\] = useState<string>\(''\);[\s\S]*?const handleSuggestRoadmap = async \(\) => {[\s\S]*?};\n/m,
  `const [selectedSubject, setSelectedSubject] = useState<string>('Toán học');
  const [selectedGrade, setSelectedGrade] = useState<string>('Lớp 12');\n`
);

// 3. Update initial chat greeting
code = code.replace(
  "'Xin chào! Tôi là Trợ Lý Toán học AI chuyên sâu. Tôi có thể giúp bạn giải phương trình, phân tích đạo hàm, tích phân, hoặc thảo luận các vấn đề Toán học. Nhập câu hỏi bên dưới nhé!'",
  "'Xin chào! Tôi là Trợ Lý AI Đa môn. Tôi có thể giúp bạn giải đáp, phân tích hoặc thảo luận các vấn đề thuộc mọi môn học. Hãy chọn môn, lớp và nhập câu hỏi bên dưới nhé!'"
);

// 4. Update prompt
const oldPrompt = "Bạn là Trợ Lý Gia Sư Toán học thông thái (AI Math Tutor).";
const newPrompt = "Bạn là Trợ Lý Gia Sư thông thái (AI Tutor) chuyên môn: ${selectedSubject} - ${selectedGrade}.";
code = code.replace(oldPrompt, newPrompt);
code = code.replace("Câu hỏi toán học sau", "câu hỏi sau");

const oldRequire = "3. Sử dụng tiếng Việt chuẩn sư phạm, lịch sự, thân thiện và giàu khích lệ.";
const newRequire = `3. Sử dụng tiếng Việt chuẩn sư phạm, lịch sự, thân thiện và giàu khích lệ.
4. Mọi câu trả lời và kiến thức BẮT BUỘC phải bám sát định hướng của bộ sách "Kết nối tri thức và cuộc sống" và định dạng SKILL PHUC (nếu liên quan đến trắc nghiệm).`;
code = code.replace(oldRequire, newRequire);

// 5. Update UI (Title and add Selects)
code = code.replace("Gia Sư Toán Học AI (Q&A)", "Gia Sư Đa Môn AI (Q&A)");
code = code.replace(
  'placeholder="Ví dụ: Tính tích phân từ 0 đến 1 của x^2 dx..."',
  'placeholder="Ví dụ: Phân tích nguyên nhân bùng nổ chiến tranh thế giới thứ nhất..."'
);

const selectsHTML = `
          <div className="flex gap-3 mb-2 px-1">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium text-slate-700 focus:ring-1 focus:ring-blue-500"
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
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium text-slate-700 focus:ring-1 focus:ring-blue-500"
            >
              <option value="Lớp 10">Lớp 10</option>
              <option value="Lớp 11">Lớp 11</option>
              <option value="Lớp 12">Lớp 12</option>
            </select>
          </div>
`;

code = code.replace(
  '{/* Messages stream */}',
  selectsHTML + '\n          {/* Messages stream */}'
);


fs.writeFileSync(file, code);
console.log('AITutor updated successfully');
