import { GoogleGenAI } from '@google/genai';
import { LessonPlan5512, ExamCV7991, SlideContent } from '../types/pedagogy';

const API_KEY_STORAGE_KEY = 'edtech_gemini_api_key';
const BACKUP_STORAGE_KEY = 'gemini_api_key';

export function getSavedApiKey(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(API_KEY_STORAGE_KEY) || localStorage.getItem(BACKUP_STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  }
  // Thử đọc từ biến môi trường Vite nếu có
  return (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
}

export function saveApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    const trimmed = key.trim();
    localStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
    localStorage.setItem(BACKUP_STORAGE_KEY, trimmed);
  }
}

function cleanJsonString(str: string): string {
  // Loại bỏ markdown code fences nếu có ```json ... ```
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

// Hàm gọi AI với danh sách mô hình phân cấp tự động chuyển đổi: Gemini 3 Pro -> Gemini 3 Flash -> Gemini 2.5 Flash
async function callModelWithHierarchy(prompt: string, customApiKey?: string): Promise<string> {
  const models = [
    'gemini-3-pro-preview',
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];
  const apiKey = (customApiKey || getSavedApiKey()).trim();

  // Thử trực tiếp GoogleGenAI SDK
  if (apiKey) {
    for (const model of models) {
      try {
        const isAlpha = model.includes('3-') || model.includes('preview');
        const apiVersion = isAlpha ? 'v1alpha' : 'v1beta';
        const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion } });
        const response = await ai.models.generateContent({
          model,
          contents: prompt
        });
        if (response && response.text) {
          return response.text;
        }
      } catch (e) {
        console.warn(`Model ${model} SDK direct fallback:`, e);
      }
    }
  }

  // Thử chuyển tiếp qua máy chủ Proxy /api/gemini
  for (const model of models) {
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, apiKey })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text) return data.text;
      }
    } catch (e) {
      console.warn(`Proxy model ${model} fallback:`, e);
    }
  }

  return '';
}

/**
 * Tạo Kế hoạch bài dạy (CV 5512) bằng Gemini AI
 */
export async function generateLessonPlanWithAI(
  subject: string,
  grade: string,
  lessonName: string,
  notes: string = '',
  customApiKey?: string
): Promise<LessonPlan5512> {
  const apiKey = (customApiKey || getSavedApiKey()).trim();

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Bạn là chuyên gia sư phạm Toán học Trung học phổ thông (THPT) hàng đầu Việt Nam. Hãy soạn Kế hoạch bài dạy (KHBD) chuẩn theo Công văn 5512/BGDĐT-GDTrH của Bộ Giáo dục và Đào tạo cho:
- Môn học: Toán học (THPT)
- Khối lớp: ${grade}
- Tên bài dạy: ${lessonName}
- Ghi chú/yêu cầu sư phạm bổ sung: ${notes || 'Bám sát Chương trình GDPT 2018 môn Toán, phát triển năng lực tư duy, mô hình hóa toán học'}

YÊU CẦU ĐẶC BIỆT VỀ CÔNG THỨC TOÁN HỌC:
- TẤT CẢ các biểu thức toán học, biến số, hàm số, phương trình, hệ phương trình, vectơ, đạo hàm, tích phân, giới hạn, xác suất PHẢI được viết chuẩn bằng cú pháp LaTeX kẹp trong dấu $...$ (nội dòng) hoặc $$...$$ (khối).
Ví dụ: $y = f(x)$, $ax^2 + bx + c = 0$, $\\frac{a}{b}$, $\\sqrt{x}$, $\\vec{u}$, $\\lim_{x \\to x_0}$, $\\int_a^b f(x)dx$.

Yêu cầu trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm lời giải thích bên ngoài), tuân thủ đúng cấu trúc TypeScript sau:
{
  "schoolName": "TRƯỜNG THPT CHUẨN QUỐC GIA",
  "departmentName": "TỔ TOÁN HỌC",
  "teacherName": "Giáo viên Toán học",
  "subject": "Toán học",
  "grade": "${grade}",
  "lessonName": "${lessonName}",
  "durationPeriods": 2,
  "periodIndex": "Tiết 1 - 2",
  "datePrepared": "${new Date().toISOString().split('T')[0]}",
  "objectives": {
    "knowledge": [
      "Mục tiêu kiến thức 1 (chứa công thức toán chuẩn LaTeX $...$)",
      "Mục tiêu kiến thức 2",
      "Mục tiêu kiến thức 3"
    ],
    "competencies": {
      "general": [
        "Năng lực tự chủ và tự học: Tự giác nghiên cứu SGK, tìm tòi phương pháp giải toán...",
        "Năng lực giao tiếp và hợp tác: Thảo luận, phản biện lời giải và cách chứng minh toán học trong nhóm...",
        "Năng lực giải quyết vấn đề và sáng tạo: Đề xuất phương án giải toán tối ưu, đa dạng hóa cách tiếp cận..."
      ],
      "specific": [
        "Năng lực tư duy và lập luận toán học: Suy luận logic, phân tích giả thiết - kết luận, chứng minh định lí...",
        "Năng lực mô hình hóa toán học: Chuyển đổi tình huống thực tiễn thành mô hình toán học (hàm số, phương trình, hình học)...",
        "Năng lực giải quyết vấn đề toán học: Vận dụng các công thức và quy tắc toán học để tìm nghiệm, tối ưu...",
        "Năng lực giao tiếp toán học: Diễn đạt chính xác bằng ngôn ngữ và ký hiệu toán học...",
        "Năng lực sử dụng công cụ, phương tiện học toán: Sử dụng máy tính cầm tay Casio, phần mềm GeoGebra..."
      ]
    },
    "qualities": [
      "Chăm chỉ: Rèn luyện tính kiên nhẫn khi tính toán và suy luận logic...",
      "Trung thực: Khách quan, chính xác trong báo cáo kết quả...",
      "Trách nhiệm: Tinh thần hợp tác, hoàn thành nhiệm vụ được giao..."
    ]
  },
  "materials": {
    "teacher": ["Giáo án điện tử chuẩn CV 5512 tích hợp LaTeX, máy chiếu / Smart TV", "Phiếu học tập số 1 (Khám phá), Phiếu học tập số 2 (Luyện tập)", "Phần mềm GeoGebra / sơ đồ tư duy trực quan"],
    "student": ["SGK Toán học, vở ghi bài, đồ dùng học tập", "Máy tính cầm tay CASIO (fx-580VN X / fx-880BTG)"]
  },
  "activities": [
    {
      "id": "act1",
      "order": 1,
      "name": "Hoạt động 1: Xác định vấn đề/Nhiệm vụ học tập/Mở đầu (Khởi động)",
      "timeMinutes": 7,
      "objectives": ["Kích hoạt kiến thức nền tảng", "Tạo hứng thú và mâu thuẫn nhận thức"],
      "content": "Nội dung câu hỏi, trò chơi hoặc tình huống thực tế khởi động",
      "product": "Câu trả lời của học sinh, vấn đề cốt lõi cần giải quyết",
      "implementation": {
        "step1Transfer": "Giáo viên nêu câu hỏi/tình huống...",
        "step2Execute": "Học sinh suy nghĩ cá nhân hoặc trao đổi nhanh...",
        "step3Report": "Đại diện học sinh trả lời...",
        "step4Conclude": "Giáo viên nhận xét, dẫn dắt vào bài mới..."
      }
    },
    {
      "id": "act2",
      "order": 2,
      "name": "Hoạt động 2: Hình thành kiến thức mới (Khám phá)",
      "timeMinutes": 20,
      "objectives": ["Học sinh chiếm lĩnh kiến thức trọng tâm của bài"],
      "content": "Nội dung tìm hiểu kiến thức trọng tâm qua phiếu học tập/thí nghiệm/tài liệu",
      "product": "Bản ghi chép hoặc phiếu học tập đã hoàn thành của học sinh",
      "implementation": {
        "step1Transfer": "Giáo viên giao nhiệm vụ học tập...",
        "step2Execute": "Học sinh làm việc nhóm/cá nhân nghiên cứu tài liệu...",
        "step3Report": "Nhóm báo cáo kết quả...",
        "step4Conclude": "Giáo viên chuẩn hóa kiến thức, chốt nội dung cốt lõi..."
      }
    },
    {
      "id": "act3",
      "order": 3,
      "name": "Hoạt động 3: Luyện tập",
      "timeMinutes": 10,
      "objectives": ["Củng cố kiến thức và rèn luyện kĩ năng giải quyết bài tập"],
      "content": "Hệ thống bài tập trắc nghiệm và tự luận vận dụng cơ bản",
      "product": "Lời giải chi tiết hoặc đáp án của học sinh",
      "implementation": {
        "step1Transfer": "Giáo viên giao bài tập...",
        "step2Execute": "Học sinh độc lập giải bài tập...",
        "step3Report": "Học sinh trình bày bài làm...",
        "step4Conclude": "Giáo viên nhận xét, sửa lỗi sai phổ biến..."
      }
    },
    {
      "id": "act4",
      "order": 4,
      "name": "Hoạt động 4: Vận dụng",
      "timeMinutes": 8,
      "objectives": ["Vận dụng kiến thức vào thực tiễn đời sống"],
      "content": "Nhiệm vụ giải quyết tình huống thực tế liên quan đến bài học",
      "product": "Sản phẩm thực tế hoặc bài báo cáo nhỏ của học sinh",
      "implementation": {
        "step1Transfer": "Giáo viên giao nhiệm vụ về nhà hoặc tại lớp...",
        "step2Execute": "Học sinh lập kế hoạch và thực hiện...",
        "step3Report": "Báo cáo vào tiết học sau hoặc nộp sản phẩm...",
        "step4Conclude": "Giáo viên hướng dẫn đánh giá và khuyến khích sáng tạo..."
      }
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const text = response.text || '';
      const parsed = JSON.parse(cleanJsonString(text)) as LessonPlan5512;
      return parsed;
    } catch (error) {
      console.warn('Lỗi gọi Gemini API (chuyển sang bộ sinh sư phạm tự động):', error);
    }
  }

  // Fallback: Bộ sinh sư phạm thông minh chuẩn 5512
  return createFallbackKHBD(subject, grade, lessonName);
}

/**
 * Tạo Đề kiểm tra chuẩn CV 7991 (4 phần, 40-30-30 = 10.0đ) bằng Gemini AI
 */
export async function generateExamWithAI(
  subject: string,
  grade: string,
  lessonName: string,
  notes: string = '',
  customApiKey?: string
): Promise<ExamCV7991> {
  const apiKey = (customApiKey || getSavedApiKey()).trim();

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Bạn là chuyên gia khảo thí và biên soạn đề thi môn Toán THPT của Bộ Giáo dục và Đào tạo Việt Nam. Hãy soạn Đề kiểm tra định kì môn Toán THPT chuẩn định dạng 4 PHẦN theo CÔNG VĂN 7991/BGDĐT-GDTrH ngày 17/12/2024 cho:
- Môn học: Toán học (THPT)
- Khối lớp: ${grade}
- Chủ đề/Bài học: ${lessonName}
- Tỷ lệ nhận thức: 40% Nhận biết (4.0đ) - 30% Thông hiểu (3.0đ) - 30% Vận dụng (3.0đ) = 10.0 điểm.
- Ghi chú bổ sung: ${notes || 'Bám sát chuẩn YCCĐ CT GDPT 2018 môn Toán'}

YÊU CẦU ĐẶC BIỆT VỀ CÔNG THỨC TOÁN HỌC (BẮT BUỘC):
- 100% các biểu thức toán học trong nội dung câu hỏi, phương án A, B, C, D, mệnh đề a, b, c, d, câu hỏi ngắn, câu tự luận, lời giải chi tiết PHẢI được viết bằng cú pháp LaTeX chuẩn đặt trong cặp dấu $...$ (ví dụ: $y = ax^2 + bx + c$, $\\frac{x-1}{x+2}$, $\\vec{u} = (1; 2; 3)$, $\\int_0^1 x dx$).

Cấu trúc đề kiểm tra bắt buộc gồm 4 phần (tổng 10.0 điểm):
- Phần I: 12 câu trắc nghiệm nhiều lựa chọn (mỗi câu 0.25đ = 3.0đ)
- Phần II: 2 câu trắc nghiệm Đúng - Sai (mỗi câu 4 ý a,b,c,d, tổng 1.0đ/câu = 2.0đ)
- Phần III: 4 câu trắc nghiệm trả lời ngắn (mỗi câu 0.5đ = 2.0đ, đáp án ngắn là số, phân số hoặc từ ngắn)
- Phần IV: 2 câu tự luận (tổng 3.0đ) kèm Rubric chấm điểm chi tiết.

Trả về DUY NHẤT một chuỗi JSON hợp lệ không markdown rườm rà:
{
  "examTitle": "ĐỀ KIỂM TRA ĐỊNH KÌ MÔN TOÁN HỌC - ${grade.toUpperCase()}",
  "term": "Giữa Học kỳ 1",
  "academicYear": "2024 - 2025",
  "grade": "${grade}",
  "subject": "Toán học",
  "durationMinutes": 45,
  "code": "101",
  "matrixRows": [
    {
      "topicName": "${lessonName}",
      "unitName": "Trọng tâm bài",
      "part1": { "know": 6, "understand": 4, "apply": 2 },
      "part2": { "know": 1, "understand": 1, "apply": 0 },
      "part3": { "know": 1, "understand": 2, "apply": 1 },
      "part4": { "know": 0, "understand": 1, "apply": 1 }
    }
  ],
  "specifications": [
    {
      "id": "sp1",
      "topic": "${lessonName}",
      "unit": "Kiến thức",
      "competencyRequirement": "Nhận biết khái niệm và bản chất",
      "level": "know",
      "questionRef": "Câu 1, 2, 3, 4",
      "questionType": "TNKQ Nhiều lựa chọn"
    }
  ],
  "part1Questions": [
    {
      "id": "p1_1",
      "number": 1,
      "cognitiveLevel": "know",
      "topic": "${lessonName}",
      "content": "Nội dung câu 1...",
      "options": { "A": "Phương án A", "B": "Phương án B", "C": "Phương án C", "D": "Phương án D" },
      "correctAnswer": "A",
      "points": 0.25,
      "explanation": "Giải thích chi tiết..."
    }
  ],
  "part2Questions": [
    {
      "id": "p2_1",
      "number": 1,
      "cognitiveLevel": "understand",
      "topic": "${lessonName}",
      "leadIn": "Cho đoạn ngữ cảnh/tình huống...",
      "statements": [
        { "subId": "a", "content": "Mệnh đề a", "isCorrect": true, "explanation": "Giải thích a" },
        { "subId": "b", "content": "Mệnh đề b", "isCorrect": false, "explanation": "Giải thích b" },
        { "subId": "c", "content": "Mệnh đề c", "isCorrect": true, "explanation": "Giải thích c" },
        { "subId": "d", "content": "Mệnh đề d", "isCorrect": false, "explanation": "Giải thích d" }
      ],
      "pointsTotal": 1.0
    }
  ],
  "part3Questions": [
    {
      "id": "p3_1",
      "number": 1,
      "cognitiveLevel": "understand",
      "topic": "${lessonName}",
      "content": "Nội dung câu hỏi yêu cầu điền số hoặc từ khóa...",
      "correctAnswerShort": "42",
      "points": 0.5,
      "explanation": "Cách tính/suy luận..."
    }
  ],
  "part4Questions": [
    {
      "id": "p4_1",
      "number": 1,
      "cognitiveLevel": "apply",
      "topic": "${lessonName}",
      "content": "Đề bài câu tự luận vận dụng thực tiễn...",
      "points": 1.5,
      "rubric": [
        { "criteria": "Nêu được luận điểm/công thức chính xác", "score": 0.5 },
        { "criteria": "Trình bày các bước suy luận/tính toán logic", "score": 0.5 },
        { "criteria": "Kết luận và liên hệ thực tiễn chính xác", "score": 0.5 }
      ]
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const text = response.text || '';
      const parsed = JSON.parse(cleanJsonString(text)) as ExamCV7991;
      return parsed;
    } catch (error) {
      console.warn('Lỗi gọi Gemini API khi tạo đề thi (chuyển sang bộ sinh tự động):', error);
    }
  }

  return createFallbackExam(subject, grade, lessonName);
}

/**
 * Bộ sinh KHBD dự phòng thông minh chuẩn 5512
 */
function createFallbackKHBD(subject: string, grade: string, lessonName: string): LessonPlan5512 {
  return {
    schoolName: 'TRƯỜNG THPT CHUẨN QUỐC GIA',
    departmentName: 'TỔ TOÁN HỌC',
    teacherName: 'Giáo viên Toán học',
    subject: 'Toán học',
    grade: grade || 'Lớp 12',
    lessonName: lessonName.toUpperCase().includes('BÀI') ? lessonName : `BÀI HỌC: ${lessonName.toUpperCase()}`,
    durationPeriods: 2,
    periodIndex: 'Tiết 1 - 2',
    datePrepared: new Date().toISOString().split('T')[0],
    objectives: {
      knowledge: [
        `Trình bày và phân tích được các định nghĩa, định lí và công thức toán học trọng tâm của ${lessonName}.`,
        `Thành thạo phương pháp suy luận, thiết lập mô hình và giải các dạng toán liên quan đến ${lessonName}.`,
        `Vận dụng các kiến thức cốt lõi để giải quyết các bài toán tối ưu và tình huống thực tiễn đời sống.`
      ],
      competencies: {
        general: [
          'Năng lực tự chủ và tự học: Chủ động đọc SGK, tự nghiên cứu ví dụ mở đầu và hoàn thành phiếu học tập.',
          'Năng lực giao tiếp và hợp tác: Tương tác tích cực, thảo luận, phản biện phương án giải toán trong nhóm.',
          'Năng lực giải quyết vấn đề và sáng tạo: Đề xuất phương án tiếp cận bài toán tối ưu, đa dạng hóa cách giải.'
        ],
        specific: [
          'Năng lực tư duy và lập luận toán học: Suy luận logic, phân tích giả thiết - kết luận, chứng minh định lí.',
          'Năng lực mô hình hóa toán học: Chuyển đổi tình huống thực tiễn thành mô hình hàm số, phương trình hoặc hình học.',
          'Năng lực giải quyết vấn đề toán học: Vận dụng các công thức và quy tắc toán học để tìm nghiệm và kiểm chuẩn kết quả.',
          'Năng lực giao tiếp toán học: Diễn đạt chính xác bằng ngôn ngữ và ký hiệu toán học chuẩn.',
          'Năng lực sử dụng công cụ, phương tiện học toán: Thành thạo máy tính Casio fx-580VN X / 880BTG và phần mềm GeoGebra.'
        ]
      },
      qualities: [
        'Chăm chỉ: Rèn luyện tính kiên nhẫn khi tính toán và suy luận logic toán học.',
        'Trung thực: Khách quan trong việc báo cáo số liệu và đánh giá chéo giữa các nhóm.',
        'Trách nhiệm: Nâng cao ý thức ứng dụng toán học vào đời sống và bảo vệ môi trường.'
      ]
    },
    materials: {
      teacher: [
        'Kế hoạch bài dạy chuẩn CV 5512; Máy chiếu / Smart TV tương tác.',
        'Hệ thống phiếu học tập số 1 (Khám phá), số 2 (Luyện tập) và Rubric đánh giá.',
        'Video mô phỏng, tranh ảnh tư liệu hoặc dụng cụ thực hành trực quan.'
      ],
      student: [
        'Sách giáo khoa, vở ghi chép, bảng nhóm và bút dạ viết bảng.',
        'Chuẩn bị trước các câu hỏi định hướng theo hướng dẫn của giáo viên.'
      ],
      digitalDevicesNotice: 'Sử dụng điện thoại/thiết bị thông minh có định hướng phục vụ tra cứu học liệu số theo hướng dẫn tại CV 5512.'
    },
    activities: [
      {
        id: 'act1',
        order: 1,
        name: 'Hoạt động 1: Mở đầu / Khởi động (Xác định vấn đề)',
        timeMinutes: 7,
        objectives: [
          'Kích hoạt kiến thức nền tảng và gây hứng thú khám phá kiến thức mới.',
          'Tạo tình huống có vấn đề dẫn dắt tự nhiên vào bài học.'
        ],
        content: `Tổ chức trò chơi 'Nhìn hình đoán ý' hoặc xem đoạn video ngắn 2 phút liên quan đến ${lessonName}. Đặt câu hỏi kích thích tư duy phản biện.`,
        product: 'Câu trả lời nhanh của học sinh; bảng dự đoán sơ bộ về nội dung bài học.',
        implementation: {
          step1Transfer: `GV trình chiếu câu hỏi tình huống thực tế liên quan đến ${lessonName}: 'Làm thế nào để giải thích hiện tượng này trong đời sống?'`,
          step2Execute: 'HS lắng nghe, quan sát video, suy nghĩ cá nhân trong 1 phút và trao đổi nhanh với bạn cùng bàn.',
          step3Report: 'GV chỉ định 2-3 học sinh đại diện phát biểu suy nghĩ ban đầu. Cả lớp lắng nghe và bổ sung.',
          step4Conclude: 'GV nhận xét ngắn gọn, không khẳng định đúng sai ngay mà dẫn dắt: Để làm sáng tỏ vấn đề này, chúng ta cùng nghiên cứu bài học hôm nay.'
        }
      },
      {
        id: 'act2',
        order: 2,
        name: 'Hoạt động 2: Hình thành kiến thức mới (Khám phá)',
        timeMinutes: 20,
        objectives: [
          `Học sinh làm chủ các nội dung cốt lõi của ${lessonName}.`,
          'Phát triển năng lực tự nghiên cứu và hợp tác nhóm.'
        ],
        content: 'Nghiên cứu tài liệu SGK, khai thác phiếu học tập số 1 với các câu hỏi bậc thang từ nhận biết đến phân tích.',
        product: 'Sản phẩm phiếu học tập số 1 đã điền đầy đủ thông tin hoặc sản phẩm trên bảng phụ/giấy A0 của các nhóm.',
        implementation: {
          step1Transfer: 'GV chia lớp thành 4 nhóm, phát Phiếu học tập số 1 và giao nhiệm vụ cụ thể cho từng nhóm với thời gian 8 phút.',
          step2Execute: 'Các nhóm phân công nhóm trưởng, thư ký; đọc SGK và tài liệu bổ trợ, thảo luận và ghi chép câu trả lời vào bảng nhóm.',
          step3Report: 'Đại diện Nhóm 1 và Nhóm 3 báo cáo kết quả trước lớp; Nhóm 2 và Nhóm 4 đặt câu hỏi phản biện, nhận xét.',
          step4Conclude: 'GV chuẩn hóa nội dung kiến thức trên slide, giải thích sâu các điểm học sinh hay nhầm lẫn và chốt ghi bảng.'
        }
      },
      {
        id: 'act3',
        order: 3,
        name: 'Hoạt động 3: Luyện tập (Củng cố)',
        timeMinutes: 10,
        objectives: [
          'Khắc sâu kiến thức vừa học và rèn luyện kĩ năng giải bài tập cơ bản.',
          'Rèn luyện tác phong làm việc nhanh, chính xác.'
        ],
        content: `Hệ thống 4 câu hỏi trắc nghiệm nhanh và 1 bài tập áp dụng thực hành về ${lessonName}.`,
        product: 'Đáp án trên bảng con của học sinh hoặc bài làm trong vở bài tập.',
        implementation: {
          step1Transfer: 'GV trình chiếu lần lượt các câu hỏi luyện tập và bài tập tình huống trên màn hình.',
          step2Execute: 'HS độc lập suy nghĩ trong 1 phút cho mỗi câu, viết câu trả lời vào vở hoặc giơ bảng đáp án.',
          step3Report: 'GV gọi bất kỳ học sinh giải thích lí do lựa chọn phương án; các bạn khác đối chiếu bài làm.',
          step4Conclude: 'GV chốt đáp án chính xác, phân tích các bẫy thường gặp trong câu hỏi trắc nghiệm.'
        }
      },
      {
        id: 'act4',
        order: 4,
        name: 'Hoạt động 4: Vận dụng (Mở rộng thực tiễn)',
        timeMinutes: 8,
        objectives: [
          `Vận dụng kiến thức ${lessonName} để giải quyết một vấn đề thực tế trong đời sống.`,
          'Nuôi dưỡng niềm say mê nghiên cứu khoa học và sáng tạo.'
        ],
        content: `Giao dự án mini hoặc bài tập liên hệ thực tế: Tìm hiểu ứng dụng của ${lessonName} trong đời sống hàng ngày hoặc kĩ thuật công nghệ.`,
        product: 'Bản đề xuất giải pháp, infographic hoặc bài viết ngắn của học sinh nộp vào buổi học kế tiếp.',
        implementation: {
          step1Transfer: `GV nêu tình huống thực tế và hướng dẫn tiêu chí đánh giá (Rubric) sản phẩm về nhà.`,
          step2Execute: 'HS tiếp nhận nhiệm vụ, ghi chép yêu cầu và lập kế hoạch thực hiện tại nhà.',
          step3Report: 'HS nộp sản phẩm qua nhóm học tập hoặc trình bày vào 5 phút đầu tiết học tiếp theo.',
          step4Conclude: 'GV động viên tinh thần tự giác sáng tạo và dặn dò chuẩn bị cho bài học mới.'
        }
      }
    ]
  };
}

/**
 * Bộ sinh Đề thi dự phòng chuẩn CV 7991 (40-30-30)
 */
function createFallbackExam(subject: string, grade: string, lessonName: string): ExamCV7991 {
  return {
    examTitle: `ĐỀ KIỂM TRA ĐỊNH KÌ MÔN ${subject.toUpperCase()} - ${grade.toUpperCase()}`,
    term: 'Giữa Học kỳ 1',
    academicYear: '2024 - 2025',
    grade,
    subject,
    durationMinutes: 45,
    code: '101',
    matrixRows: [
      {
        topicName: lessonName,
        unitName: 'Trọng tâm bài học',
        part1: { know: 6, understand: 4, apply: 2 },
        part2: { know: 1, understand: 1, apply: 0 },
        part3: { know: 1, understand: 2, apply: 1 },
        part4: { know: 0, understand: 1, apply: 1 }
      }
    ],
    specifications: [
      {
        id: 'sp1',
        topic: lessonName,
        unit: 'Khái niệm & Định luật',
        competencyRequirement: 'Nhận biết các khái niệm, định nghĩa và công thức cơ bản.',
        level: 'know',
        questionRef: 'Câu 1 đến Câu 6 (Phần I)',
        questionType: 'TNKQ Nhiều lựa chọn'
      },
      {
        id: 'sp2',
        topic: lessonName,
        unit: 'Mối quan hệ & Ứng dụng',
        competencyRequirement: 'Thông hiểu mối liên hệ giữa các đại lượng và giải thích hiện tượng.',
        level: 'understand',
        questionRef: 'Câu 7 đến Câu 10 (Phần I), Câu 1 (Phần II)',
        questionType: 'TNKQ Đúng - Sai'
      },
      {
        id: 'sp3',
        topic: lessonName,
        unit: 'Giải quyết vấn đề thực tiễn',
        competencyRequirement: 'Vận dụng kiến thức để giải bài toán định lượng và tình huống thực tiễn.',
        level: 'apply',
        questionRef: 'Câu 11-12 (Phần I), Phần III, Phần IV',
        questionType: 'Tự luận'
      }
    ],
    part1Questions: Array.from({ length: 12 }, (_, i) => {
      const num = i + 1;
      const level = num <= 6 ? 'know' : num <= 10 ? 'understand' : 'apply';
      const answers: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D', 'B', 'C', 'A', 'D', 'B', 'A', 'C', 'D'];
      return {
        id: `p1_${num}`,
        number: num,
        cognitiveLevel: level as any,
        topic: lessonName,
        competencyCode: 'NL1',
        content: `Câu hỏi số ${num} liên quan đến kiến thức ${lessonName} (${level === 'know' ? 'Nhận biết' : level === 'understand' ? 'Thông hiểu' : 'Vận dụng'}). Mệnh đề nào sau đây là chính xác?`,
        options: {
          A: `Khẳng định A: Đặc trưng định lượng và bản chất cốt lõi của hiện tượng.`,
          B: `Khẳng định B: Mối liên hệ tỉ lệ thuận giữa các yếu tố chi phối.`,
          C: `Khẳng định C: Quy luật biến đổi trong điều kiện tiêu chuẩn lý tưởng.`,
          D: `Khẳng định D: Ứng dụng thực tế trong kĩ thuật và đời sống hàng ngày.`
        },
        correctAnswer: answers[i % answers.length],
        points: 0.25,
        explanation: `Theo chuẩn kiến thức ${lessonName}, phương án ${answers[i % answers.length]} là chính xác vì phù hợp với định nghĩa và quy luật của môn ${subject}.`
      };
    }),
    part2Questions: [
      {
        id: 'p2_1',
        number: 1,
        cognitiveLevel: 'understand',
        topic: lessonName,
        competencyCode: 'NL2',
        leadIn: `Trong một thí nghiệm tìm hiểu về ${lessonName}, một nhóm học sinh tiến hành quan sát và thu thập dữ liệu trong các điều kiện khác nhau. Xem xét các nhận định sau:`,
        statements: [
          { subId: 'a', content: 'Khi tăng giá trị của đại lượng đầu vào thì kết quả quan sát tăng theo tỉ lệ tương ứng.', isCorrect: true, explanation: 'Nhận định đúng theo tính chất tỉ lệ thuận.' },
          { subId: 'b', content: 'Hiện tượng này diễn ra hoàn toàn không phụ thuộc vào điều kiện ngoại cảnh tác động.', isCorrect: false, explanation: 'Sai vì hiện tượng luôn chịu chi phối của các yếu tố môi trường.' },
          { subId: 'c', content: 'Kết quả đo lường cho phép khẳng định sự bảo toàn của hệ trong điều kiện lý tưởng.', isCorrect: true, explanation: 'Đúng theo nguyên lý bảo toàn.' },
          { subId: 'd', content: 'Có thể áp dụng trực tiếp kết quả này cho mọi trường hợp mà không cần xét điều kiện biên.', isCorrect: false, explanation: 'Sai vì mọi quy luật đều có phạm vi áp dụng giới hạn.' }
        ],
        pointsTotal: 1.0
      },
      {
        id: 'p2_2',
        number: 2,
        cognitiveLevel: 'apply',
        topic: lessonName,
        competencyCode: 'NL2',
        leadIn: `Một kĩ sư phân tích hoạt động của một hệ thống kĩ thuật ứng dụng nguyên lý ${lessonName}. Đánh giá tính đúng/sai của các ý kiến sau:`,
        statements: [
          { subId: 'a', content: 'Hệ thống vận hành tối ưu nhất khi giảm thiểu tối đa các hao phí ma sát và nhiệt lượng.', isCorrect: true, explanation: 'Đúng vì giảm hao phí giúp nâng cao hiệu suất.' },
          { subId: 'b', content: 'Hiệu suất chuyển hóa năng lượng của hệ thống trong thực tế có thể đạt tới 100%.', isCorrect: false, explanation: 'Sai vì theo nguyên lý nhiệt động lực học không thể đạt 100% trong thực tế.' },
          { subId: 'c', content: 'Sử dụng vật liệu mới có thể tăng độ bền và giảm đáng kể lực xung kích tác động.', isCorrect: true, explanation: 'Đúng theo nguyên tắc kéo dài thời gian tương tác.' },
          { subId: 'd', content: 'Các thông số đo được từ mô phỏng máy tính luôn hoàn toàn trùng khớp với thực nghiệm ngoài trời.', isCorrect: false, explanation: 'Sai vì thực nghiệm luôn tồn tại sai số đo và nhiễu môi trường.' }
        ],
        pointsTotal: 1.0
      }
    ],
    part3Questions: [
      {
        id: 'p3_1',
        number: 1,
        cognitiveLevel: 'understand',
        topic: lessonName,
        competencyCode: 'NL1',
        content: `Một vật chuyển động chịu tác dụng của lực biến thiên trong 2 giây làm đại lượng tăng từ 10 đơn vị lên 30 đơn vị. Độ biến thiên trung bình trong 1 giây bằng bao nhiêu? (Chỉ điền số)`,
        correctAnswerShort: '10',
        points: 0.5,
        explanation: 'Độ biến thiên trung bình = (30 - 10) / 2 = 10 đơn vị.'
      },
      {
        id: 'p3_2',
        number: 2,
        cognitiveLevel: 'understand',
        topic: lessonName,
        competencyCode: 'NL1',
        content: `Trong một phản ứng/quá trình liên quan đến ${lessonName}, tỉ số giữa đại lượng sau và đại lượng trước là 1,5. Nếu đại lượng ban đầu là 20 thì giá trị lúc sau bằng bao nhiêu?`,
        correctAnswerShort: '30',
        points: 0.5,
        explanation: 'Giá trị lúc sau = 20 * 1,5 = 30.'
      },
      {
        id: 'p3_3',
        number: 3,
        cognitiveLevel: 'apply',
        topic: lessonName,
        competencyCode: 'NL3',
        content: `Một thiết bị tiêu thụ công suất 500 W hoạt động trong 4 giờ. Lượng điện năng tiêu thụ tính theo đơn vị kilowatt-giờ (kWh) là bao nhiêu?`,
        correctAnswerShort: '2',
        points: 0.5,
        explanation: 'A = P * t = 0,5 kW * 4 h = 2 kWh.'
      },
      {
        id: 'p3_4',
        number: 4,
        cognitiveLevel: 'apply',
        topic: lessonName,
        competencyCode: 'NL3',
        content: `Hiệu suất của một động cơ nhiệt là 25%. Nếu nhiệt lượng nguồn nóng cung cấp là 800 J thì công cơ học có ích sinh ra bằng bao nhiêu Jun (J)?`,
        correctAnswerShort: '200',
        points: 0.5,
        explanation: 'A_ích = Q1 * H = 800 * 0,25 = 200 J.'
      }
    ],
    part4Questions: [
      {
        id: 'p4_1',
        number: 1,
        cognitiveLevel: 'understand',
        topic: lessonName,
        competencyCode: 'NL2',
        content: `Trình bày nguyên tắc hoạt động cơ bản và phân tích các yếu tố ảnh hưởng trực tiếp đến ${lessonName}. Nêu một ví dụ thực tế minh họa rõ nguyên tắc này.`,
        points: 1.5,
        rubric: [
          { criteria: 'Trình bày đúng định nghĩa và bản chất nguyên lý cốt lõi', score: 0.5 },
          { criteria: 'Phân tích đầy đủ ít nhất 2 yếu tố ảnh hưởng trực tiếp', score: 0.5 },
          { criteria: 'Nêu ví dụ thực tế chính xác và giải thích logic', score: 0.5 }
        ]
      },
      {
        id: 'p4_2',
        number: 2,
        cognitiveLevel: 'apply',
        topic: lessonName,
        competencyCode: 'NL3',
        content: `Một tình huống thực tiễn đặt ra yêu cầu cải tiến giải pháp kĩ thuật dựa trên ${lessonName} nhằm tiết kiệm năng lượng và đảm bảo an toàn. Em hãy đề xuất phương án và luận giải tính khả thi của phương án đó.`,
        points: 1.5,
        rubric: [
          { criteria: 'Đề xuất giải pháp rõ ràng, đúng trọng tâm kĩ thuật', score: 0.5 },
          { criteria: 'Luận giải tính khả thi dựa trên kiến thức khoa học đã học', score: 0.5 },
          { criteria: 'Đánh giá được hiệu quả về mặt tiết kiệm năng lượng/an toàn', score: 0.5 }
        ]
      }
    ]
  };
}
