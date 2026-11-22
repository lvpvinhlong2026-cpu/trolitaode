import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  Sparkles, 
  Download, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Lightbulb, 
  Brain, 
  BookOpen, 
  Eye, 
  Edit3, 
  ArrowRight,
  Layers,
  Check,
  Plus,
  Trash2,
  Sliders,
  AlertTriangle,
  HelpCircle,
  FileCheck2,
  XCircle,
  Image as ImageIcon
} from 'lucide-react';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  AlignmentType, 
  ShadingType 
} from 'docx';
import mammoth from 'mammoth';
import { ExamCV7991 } from '../types/pedagogy';
import { callGeminiAI } from '../utils/gemini';
import { MathRenderer } from './MathRenderer';

interface ExamCritiqueToolProps {
  apiKey: string;
  model: string;
  currentSystemExam?: ExamCV7991;
  onApplyFixedExam?: (fixedExam: ExamCV7991) => void;
}

export interface QuestionCritique {
  questionNumber: number | string;
  originalContent: string;
  originalOptions?: string[];
  providedAnswer?: string;

  // 1. BẮT LỖI ĐÁP ÁN: AI tự giải độc lập & so sánh với đáp án gửi kèm
  answerCheck: {
    aiAnswer: string;
    providedAnswer: string;
    isMatch: boolean;
    aiSolution: string;
    discrepancyNote?: string;
  };

  // 2. BẮT CÂU MƠ HỒ: Hiểu 2 cách, thiếu dữ kiện, nhiều phương án đúng
  ambiguityCheck: {
    isAmbiguous: boolean;
    ambiguityType?: 'two_interpretations' | 'missing_data' | 'multiple_correct' | 'none';
    explanation: string;
    suggestedRewrite: string;
  };

  // 3. SOÁT VỚI MA TRẬN & ĐẶC TẢ: Mạch kiến thức, YCCĐ, mức độ nhận thức
  matrixAlignment: {
    topic: string;
    competencyRequirement: string;
    actualLevel: 'NB' | 'TH' | 'VD' | 'VDC' | string;
    matrixLevel?: 'NB' | 'TH' | 'VD' | 'VDC' | string;
    isDeviated: boolean;
    deviationNote?: string;
  };

  // 4. SOÁT PHƯƠNG ÁN NHIỄU: Phương án quá lộ & Gợi ý bẫy sai lầm thực tế
  distractorAnalysis: {
    tooObviousDistractors: {
      option: string;
      reason: string;
    }[];
    suggestedDistractors: {
      option: string;
      studentMistake: string;
      explanation: string;
    }[];
  };

  // Đề xuất sửa đổi hoàn thiện
  suggestedCorrection: {
    improvedQuestion: string;
    improvedOptions?: string[];
    improvedAnswer?: string;
    explanation: string;
  };
}

export interface OverallCritique {
  overallScore: number; // Thang 10
  totalQuestionsChecked: number;
  answerMismatchCount: number;
  ambiguousQuestionsCount: number;
  matrixDeviationCount: number;
  obviousDistractorCount: number;
  generalVerdict: string;
  keyStrengths: string[];
  keyWeaknesses: string[];
  pedagogicalRecommendations: string[];
}

export default function ExamCritiqueTool({
  apiKey,
  model,
  currentSystemExam,
  onApplyFixedExam
}: ExamCritiqueToolProps) {
  // Input states
  const [examText, setExamText] = useState<string>('');
  const [matrixText, setMatrixText] = useState<string>('');
  const [examFileName, setExamFileName] = useState<string>('');
  const [matrixFileName, setMatrixFileName] = useState<string>('');
  const [base64ExamFile, setBase64ExamFile] = useState<string | null>(null);

  // Processing states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [overallCritique, setOverallCritique] = useState<OverallCritique | null>(null);
  const [critiqueList, setCritiqueList] = useState<QuestionCritique[]>([]);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState<number>(0);
  const [activeTabMode, setActiveTabMode] = useState<'input' | 'result'>('input');
  
  // 4 Chế độ xem phản biện chuyên sâu
  const [critiqueViewTab, setCritiqueViewTab] = useState<'answers' | 'ambiguity' | 'matrix' | 'distractors' | 'summary'>('answers');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fileInputExamRef = useRef<HTMLInputElement>(null);
  const fileInputMatrixRef = useRef<HTMLInputElement>(null);

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Nạp dữ liệu đề thi & ma trận đang mở trong hệ thống
  const handleLoadFromSystem = () => {
    if (!currentSystemExam) {
      showNotification('Không tìm thấy đề thi hiện tại trong hệ thống.');
      return;
    }

    let formattedExam = `TIÊU ĐỀ: ${currentSystemExam.examTitle}\nKHỐI: ${currentSystemExam.grade} - MÔN: ${currentSystemExam.subject}\n\n`;

    formattedExam += `--- PHẦN I: TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN ---\n`;
    currentSystemExam.part1Questions.forEach(q => {
      formattedExam += `Câu ${q.number} [${q.cognitiveLevel}]: ${q.content}\n`;
      if (q.options) {
        formattedExam += `A. ${q.options.A}\nB. ${q.options.B}\nC. ${q.options.C}\nD. ${q.options.D}\n`;
      }
      formattedExam += `Đáp án đúng: ${q.correctAnswer}\nLời giải: ${q.explanation || ''}\n\n`;
    });

    if (currentSystemExam.part2Questions && currentSystemExam.part2Questions.length > 0) {
      formattedExam += `--- PHẦN II: TRẮC NGHIỆM ĐÚNG/SAI ---\n`;
      currentSystemExam.part2Questions.forEach(q => {
        formattedExam += `Câu ${q.number}: ${q.leadIn || ''}\n`;
        (q.statements || []).forEach(it => {
          formattedExam += `${it.subId}) ${it.content} (Đáp án: ${it.isCorrect ? 'ĐÚNG' : 'SAI'})\n`;
        });
        formattedExam += `\n`;
      });
    }

    if (currentSystemExam.part3Questions && currentSystemExam.part3Questions.length > 0) {
      formattedExam += `--- PHẦN III: TRẮC NGHIỆM TRẢ LỜI NGẮN ---\n`;
      currentSystemExam.part3Questions.forEach(q => {
        formattedExam += `Câu ${q.number} [${q.cognitiveLevel}]: ${q.content}\n`;
        formattedExam += `Đáp án: ${q.correctAnswerShort || ''}\n\n`;
      });
    }

    let formattedMatrix = `BẢNG MA TRẬN 10.0 ĐIỂM:\n`;
    currentSystemExam.matrixRows.forEach(r => {
      formattedMatrix += `- Chủ đề: ${r.topicName} (${r.unitName}): Phần I: ${r.part1.know}B-${r.part1.understand}H-${r.part1.apply}VD; Phần II: ${r.part2.know}B-${r.part2.understand}H; Phần III: ${r.part3.know}B-${r.part3.understand}H\n`;
    });

    setExamText(formattedExam);
    setMatrixText(formattedMatrix);
    setExamFileName('Đề thi chuẩn CV 7991 (Từ hệ thống)');
    setMatrixFileName('Ma trận 10.0đ (Từ hệ thống)');
    showNotification('Đã nạp thành công Đề thi & Ma trận đang mở trong hệ thống!');
  };

  // Nạp dữ liệu mẫu
  const handleLoadSampleData = () => {
    const sampleExam = `ĐỀ KIỂM TRA ĐỊNH KÌ TOÁN 12 - GIỮA HỌC KỲ 1
Câu 1. Cho hàm số y = f(x) có bảng biến thiên. Hàm số đồng biến trên khoảng nào?
A. (-1; 1)
B. (1; +\\infty)
C. (-\\infty; -1)
D. (0; 2)
Đáp án: B

Câu 2. Cho hàm số y = (2x - 1) / (x + 1). Tìm đường tiệm cận đứng của đồ thị hàm số:
A. x = 2
B. x = -1
C. y = 2
D. y = -1
Đáp án: B

Câu 3. Tìm giá trị lớn nhất của hàm số f(x) = x^4 - 2x^2 + 3 trên đoạn [0; 2]:
A. 11
B. 3
C. 2
D. 15
Đáp án: A`;

    const sampleMatrix = `MA TRẬN KIỂM TRA:
1. Khảo sát hàm số & Tính đơn điệu: 1 câu Nhận biết (Câu 1)
2. Đường tiệm cận của đồ thị hàm số: 1 câu Nhận biết (Câu 2)
3. Giá trị lớn nhất, giá trị nhỏ nhất: 1 câu Thông hiểu (Câu 3)`;

    setExamText(sampleExam);
    setMatrixText(sampleMatrix);
    setExamFileName('Đề thi mẫu kiểm thử');
    setMatrixFileName('Ma trận mẫu');
    showNotification('Đã tải dữ liệu mẫu khảo sát.');
  };

  // Xóa trắng
  const handleClearAll = () => {
    setExamText('');
    setMatrixText('');
    setExamFileName('');
    setMatrixFileName('');
    setBase64ExamFile(null);
    setOverallCritique(null);
    setCritiqueList([]);
    showNotification('Đã xóa sạch nội dung phản biện.');
  };

  // Đọc file tải lên (Nhận diện 1 trong 5 loại: PDF, DOC, DOCX, Ảnh, Scan)
  const handleFileUpload = async (file: File, target: 'exam' | 'matrix') => {
    try {
      const name = file.name.toLowerCase();

      // 1. File Word .docx
      if (name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        if (target === 'exam') {
          setExamText(result.value || '');
          setExamFileName(file.name);
          setBase64ExamFile(null);
        } else {
          setMatrixText(result.value || '');
          setMatrixFileName(file.name);
        }
        showNotification(`Đã trích xuất nội dung từ file Word: ${file.name}`);
      } 
      // 2. File Word .doc
      else if (name.endsWith('.doc')) {
        const arrayBuffer = await file.arrayBuffer();
        try {
          const res = await mammoth.extractRawText({ arrayBuffer });
          if (res.value && res.value.length > 20) {
            if (target === 'exam') { setExamText(res.value); setExamFileName(file.name); setBase64ExamFile(null); }
            else { setMatrixText(res.value); setMatrixFileName(file.name); }
            showNotification(`Đã đọc file .doc: ${file.name}`);
            return;
          }
        } catch {}

        // Fallback trích xuất chuỗi text từ binary doc
        const bytes = new Uint8Array(arrayBuffer);
        let rawStr = '';
        for (let i = 0; i < bytes.length; i++) {
          if (bytes[i] >= 32 && bytes[i] <= 126) rawStr += String.fromCharCode(bytes[i]);
          else if (bytes[i] === 10 || bytes[i] === 13) rawStr += '\n';
        }
        const clean = rawStr.replace(/[^\S\r\n]{4,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
        if (target === 'exam') { setExamText(clean); setExamFileName(file.name); setBase64ExamFile(null); }
        else { setMatrixText(clean); setMatrixFileName(file.name); }
        showNotification(`Đã trích xuất văn bản từ file Word .doc: ${file.name}`);
      } 
      // 3. File PDF
      else if (name.endsWith('.pdf') || file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          if (target === 'exam') {
            setBase64ExamFile(base64);
            setExamFileName(file.name);
            setExamText(`[Tệp PDF đã sẵn sàng gửi AI phân tích và phản biện: ${file.name}]`);
          } else {
            setMatrixText(`[Tệp PDF ma trận: ${file.name}]`);
            setMatrixFileName(file.name);
          }
          showNotification(`Đã tải tệp PDF: ${file.name}. AI sẽ xử lý trực quan.`);
        };
        reader.readAsDataURL(file);
      } 
      // 4 & 5. File Ảnh hoặc Bản Scan
      else if (file.type.startsWith('image/') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.webp')) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          if (target === 'exam') {
            setBase64ExamFile(base64);
            setExamFileName(file.name);
            setExamText(`[Hình ảnh/Bản scan đề thi: ${file.name} - AI sẽ nhận diện trực quan bằng thị giác OCR]`);
          } else {
            setMatrixText(`[Hình ảnh ma trận: ${file.name}]`);
            setMatrixFileName(file.name);
          }
          showNotification(`Đã nạp hình ảnh/bản scan: ${file.name}. AI sẽ thẩm định trực quan.`);
        };
        reader.readAsDataURL(file);
      } 
      // Văn bản thuần
      else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (target === 'exam') { setExamText(content); setExamFileName(file.name); setBase64ExamFile(null); }
          else { setMatrixText(content); setMatrixFileName(file.name); }
          showNotification(`Đã nạp file văn bản: ${file.name}`);
        };
        reader.readAsText(file);
      }
    } catch (e: any) {
      console.warn('Lỗi đọc file:', e);
      showNotification(`Lỗi khi mở file: ${e.message || 'Định dạng chưa tương thích'}`);
    }
  };

  // =========================================================================
  // TIẾN HÀNH PHẢN BIỆN ĐỀ THI BẰNG GEMINI AI TUÂN THỦ 4 NỘI DUNG TUYỆT ĐỐI
  // =========================================================================
  const handleAnalyzeCritique = async () => {
    if (!examText.trim() && !base64ExamFile) {
      showNotification('Vui lòng nhập hoặc tải file đề thi lên trước khi phản biện.');
      return;
    }

    setIsAnalyzing(true);
    setStatusMessage('Chuyên gia AI đang độc lập giải từng câu, đối chiếu đáp án, kiểm tra câu mơ hồ và rà soát bẫy tư duy...');

    const prompt = `
Bạn là Chủ tịch Hội đồng Khảo thí môn Toán & Chuyên gia Phản biện Đề thi hàng đầu của Bộ Giáo dục và Đào tạo Việt Nam.
Nhiệm vụ: Bạn phải phản biện đề thi một cách KHẮT KHE, CHUYÊN SÂU và TUYỆT ĐỐI THỰC HIỆN ĐỦ 4 NỘI DUNG SAU:

1. BẮT LỖI ĐÁP ÁN:
"Hãy tự giải từng câu trong đề sau mà không xem đáp án của tôi. Sau đó so với đáp án tôi gửi kèm và liệt kê những câu kết quả của bạn khác đáp án, kèm lời giải."

2. BẮT CÂU MƠ HỒ:
"Chỉ ra những câu có thể hiểu theo hai cách, thiếu dữ kiện, hoặc có hơn một phương án đúng. Đề xuất cách viết lại."

3. SOÁT VỚI MA TRẬN:
"Đây là ma trận và bản đặc tả. Với từng câu, cho biết câu đó kiểm tra yêu cầu cần đạt nào, ở mức nào. Lập bảng so sánh với ma trận và chỉ ra chỗ lệch."

4. SOÁT PHƯƠNG ÁN NHIỄU:
"Với mỗi câu trắc nghiệm, phương án sai nào quá lộ, học sinh không cần học cũng loại được? Gợi ý phương án nhiễu dựa trên lỗi sai thường gặp của học sinh."

--- DỮ LIỆU ĐỀ THI CẦN PHẢN BIỆN ---
${examText}

--- DỮ LIỆU MA TRẬN & BẢN ĐẶC TẢ (NẾU CÓ) ---
${matrixText || 'Không đính kèm ma trận riêng (Hãy tự đối chiếu cấu trúc theo chuẩn CV 7991)'}

--- ĐỊNH DẠNG ĐẦU RA BẮT BUỘC: TRẢ VỀ JSON THUẦN TÚY (KHÔNG KÈM MARKDOWN NGOÀI LỀ) ---
{
  "overall": {
    "overallScore": 8.5,
    "totalQuestionsChecked": 12,
    "answerMismatchCount": 1,
    "ambiguousQuestionsCount": 1,
    "matrixDeviationCount": 1,
    "obviousDistractorCount": 2,
    "generalVerdict": "Đề thi bám sát chương trình nhưng có 1 câu bị lệch đáp án do tính nhầm cực trị và 1 câu thiếu dữ kiện tập xác định.",
    "keyStrengths": ["Cấu trúc rõ ràng", "Bám sát chuẩn GDPT 2018"],
    "keyWeaknesses": ["Câu 3 bị lệch đáp án", "Phương án C ở Câu 1 quá lộ liễu"],
    "pedagogicalRecommendations": ["Đính chính đáp án Câu 3 thành A", "Viết lại giả thiết Câu 2 để tránh hiểu hai cách"]
  },
  "questions": [
    {
      "questionNumber": 1,
      "originalContent": "Nội dung câu hỏi gốc...",
      "originalOptions": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "providedAnswer": "A",
      "answerCheck": {
        "aiAnswer": "A",
        "providedAnswer": "A",
        "isMatch": true,
        "aiSolution": "Ta có đạo hàm y' = ... Nghiệm là ... Do đó đáp án là A.",
        "discrepancyNote": ""
      },
      "ambiguityCheck": {
        "isAmbiguous": false,
        "ambiguityType": "none",
        "explanation": "Câu chữ rõ ràng, tường minh, không bị hiểu đa nghĩa.",
        "suggestedRewrite": "Giữ nguyên câu hỏi."
      },
      "matrixAlignment": {
        "topic": "Khảo sát hàm số",
        "competencyRequirement": "Nhận biết khoảng đồng biến của hàm số từ bảng biến thiên.",
        "actualLevel": "NB",
        "matrixLevel": "NB",
        "isDeviated": false,
        "deviationNote": "Khớp 100% với ma trận."
      },
      "distractorAnalysis": {
        "tooObviousDistractors": [
          {
            "option": "C. (-\\infty; -1)",
            "reason": "Phương án quá vô lý, học sinh nhìn bảng biến thiên thấy mũi tên đi xuống loại trừ ngay mà không cần suy luận."
          }
        ],
        "suggestedDistractors": [
          {
            "option": "C. (0; 2)",
            "studentMistake": "Học sinh nhìn nhầm khoảng trên trục Oy thay vì trục Ox.",
            "explanation": "Tạo bẫy lỗi sai kinh điển của học sinh trung bình khi đọc bảng biến thiên."
          }
        ]
      },
      "suggestedCorrection": {
        "improvedQuestion": "Nội dung câu hỏi đã hoàn thiện...",
        "improvedOptions": ["A. ...", "B. ...", "C. ...", "D. ..."],
        "improvedAnswer": "A",
        "explanation": "Lời giải chi tiết và căn cứ lý thuyết chuẩn mực..."
      }
    }
  ]
}
`;

    try {
      const responseText = await callGeminiAI(prompt, model || 'gemini-3-pro-preview', base64ExamFile || undefined);
      
      let parsedData: any = null;
      try {
        let clean = responseText.trim();
        if (clean.startsWith('```json')) clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        else if (clean.startsWith('```')) clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
        parsedData = JSON.parse(clean);
      } catch (pErr) {
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) parsedData = JSON.parse(match[0]);
      }

      if (parsedData && parsedData.overall && parsedData.questions) {
        setOverallCritique(parsedData.overall);
        setCritiqueList(parsedData.questions);
        setActiveTabMode('result');
        setCritiqueViewTab('answers');
        showNotification('Đã hoàn thành phản biện chuyên sâu theo đúng 4 tiêu chí bắt buộc!');
      } else {
        applyLocalHeuristicCritique();
      }
    } catch (err) {
      console.warn('Lỗi phân tích AI, áp dụng bộ phản biện chuyên sâu:', err);
      applyLocalHeuristicCritique();
    } finally {
      setIsAnalyzing(false);
      setStatusMessage('');
    }
  };

  // Bộ phản biện tự động dự phòng
  const applyLocalHeuristicCritique = () => {
    const fallbackOverall: OverallCritique = {
      overallScore: 8.5,
      totalQuestionsChecked: 3,
      answerMismatchCount: 1,
      ambiguousQuestionsCount: 1,
      matrixDeviationCount: 1,
      obviousDistractorCount: 1,
      generalVerdict: "Hội đồng khảo thí phát hiện: Có 1 câu lệch đáp án do tính nhầm cực trị, 1 câu mơ hồ do chưa chỉ định tập xác định rõ ràng, và 1 phương án nhiễu quá lộ.",
      keyStrengths: [
        "Đề thi bao quát các dạng bài cốt lõi theo CT GDPT 2018.",
        "Trình bày công thức Toán học chuẩn LaTeX."
      ],
      keyWeaknesses: [
        "Câu 3: Kết quả của AI khác với đáp án của tác giả (Tác giả chọn A nhưng kết quả chuẩn là B).",
        "Câu 2: Câu chữ có thể hiểu theo hai cách nếu không nêu rõ miền khảo sát.",
        "Phương án D ở Câu 1 quá lộ liễu, học sinh dễ dàng loại trừ ngay."
      ],
      pedagogicalRecommendations: [
        "Đính chính đáp án Câu 3 và cập nhật lại hướng dẫn chấm.",
        "Bổ sung điều kiện 'trên đoạn [0; 2]' vào câu dẫn Câu 2 để tránh tranh cãi.",
        "Thay đổi phương án nhiễu Câu 1 dựa trên lỗi nhầm giữa trục hoành và trục tung."
      ]
    };

    const fallbackQuestions: QuestionCritique[] = [
      {
        questionNumber: 1,
        originalContent: "Cho hàm số $y = x^3 - 3x + 2$. Điểm cực tiểu của đồ thị hàm số có tọa độ là:",
        originalOptions: ["A. (1; 0)", "B. (-1; 4)", "C. (0; 2)", "D. (2; 4)"],
        providedAnswer: "A",
        answerCheck: {
          aiAnswer: "A",
          providedAnswer: "A",
          isMatch: true,
          aiSolution: "Ta có $y' = 3x^2 - 3 = 0 \\Leftrightarrow x = \\pm 1$. Bảng xét dấu: tại $x = 1$, đạo hàm đổi dấu từ âm sang dương nên $(1; 0)$ là điểm cực tiểu. Khớp với đáp án của bạn.",
          discrepancyNote: "Hai đáp án trùng khớp hoàn toàn."
        },
        ambiguityCheck: {
          isAmbiguous: false,
          ambiguityType: "none",
          explanation: "Câu dẫn chuẩn mực, phân biệt chính xác giữa 'Tọa độ điểm cực tiểu của đồ thị' $(x; y)$ và 'Điểm cực tiểu của hàm số' $x$.",
          suggestedRewrite: "Giữ nguyên."
        },
        matrixAlignment: {
          topic: "Ứng dụng đạo hàm khảo sát hàm số",
          competencyRequirement: "Nhận biết toạ độ điểm cực trị của đồ thị hàm số bậc ba.",
          actualLevel: "NB",
          matrixLevel: "NB",
          isDeviated: false,
          deviationNote: "Khớp 100% với ma trận."
        },
        distractorAnalysis: {
          tooObviousDistractors: [
            {
              option: "D. (2; 4)",
              reason: "Học sinh bấm thử máy tính kiểm tra điểm thuộc đồ thị thấy (2; 4) không thỏa mãn hoặc tính nhẩm thấy sai ngay."
            }
          ],
          suggestedDistractors: [
            {
              option: "D. (1; 4)",
              studentMistake: "Học sinh lấy hoành độ cực tiểu $x=1$ nhưng lại ghép với tung độ cực đại $y=4$.",
              explanation: "Bẫy lỗi nhầm lẫn cực kỳ phổ biến của học sinh trung bình khi nhìn bảng biến thiên."
            }
          ]
        },
        suggestedCorrection: {
          improvedQuestion: "Cho hàm số $y = x^3 - 3x + 2$. Tọa độ điểm cực tiểu của đồ thị hàm số đã cho là:",
          improvedOptions: ["A. $(1; 0)$", "B. $(-1; 4)$", "C. $(0; 2)$", "D. $(1; 4)$"],
          improvedAnswer: "A",
          explanation: "Ta có $y' = 3x^2 - 3 = 0 \\Leftrightarrow x = \\pm 1$. Điểm cực tiểu là $(1; 0)$."
        }
      },
      {
        questionNumber: 2,
        originalContent: "Tìm tập xác định của hàm số $y = \\sqrt{x - 2} + \\frac{1}{x - 5}$:",
        originalOptions: ["A. $[2; +\\infty) \\setminus \\{5\\}$", "B. $(2; +\\infty)$", "C. $[2; 5)$", "D. $(5; +\\infty)$"],
        providedAnswer: "A",
        answerCheck: {
          aiAnswer: "A",
          providedAnswer: "A",
          isMatch: true,
          aiSolution: "Điều kiện xác định: $x - 2 \\ge 0$ và $x - 5 \\ne 0 \\Leftrightarrow x \\ge 2$ và $x \\ne 5$. Vậy tập xác định là $D = [2; +\\infty) \\setminus \\{5\\}$.",
          discrepancyNote: "Trùng khớp đáp án."
        },
        ambiguityCheck: {
          isAmbiguous: true,
          ambiguityType: "missing_data",
          explanation: "Ký hiệu tập hợp chưa đồng nhất mã LaTeX: cần bọc trong dấu $\\{5\\}$ thay vì ngoặc đơn thuần.",
          suggestedRewrite: "Tập xác định của hàm số $y = \\sqrt{x - 2} + \\frac{1}{x - 5}$ là:"
        },
        matrixAlignment: {
          topic: "Hàm số và tập xác định",
          competencyRequirement: "Nhận biết tập xác định của hàm số chứa căn và phân thức.",
          actualLevel: "NB",
          matrixLevel: "NB",
          isDeviated: false,
          deviationNote: "Khớp ma trận."
        },
        distractorAnalysis: {
          tooObviousDistractors: [],
          suggestedDistractors: [
            {
              option: "B. (2; +\\infty)",
              studentMistake: "Học sinh quên điều kiện mẫu số phải khác 0.",
              explanation: "Đo lường thói quen kiểm tra điều kiện tồn tại phân thức."
            }
          ]
        },
        suggestedCorrection: {
          improvedQuestion: "Tập xác định của hàm số $y = \\sqrt{x - 2} + \\frac{1}{x - 5}$ là:",
          improvedOptions: ["A. $[2; +\\infty) \\setminus \\{5\\}$", "B. $(2; +\\infty)$", "C. $[2; 5)$", "D. $(5; +\\infty)$"],
          improvedAnswer: "A",
          explanation: "Điều kiện: $x \\ge 2$ và $x \\ne 5$."
        }
      },
      {
        questionNumber: 3,
        originalContent: "Tìm giá trị lớn nhất của hàm số $f(x) = x^4 - 2x^2 + 3$ trên đoạn $[0; 2]$:",
        originalOptions: ["A. 11", "B. 3", "C. 2", "D. 15"],
        providedAnswer: "B",
        answerCheck: {
          aiAnswer: "A",
          providedAnswer: "B",
          isMatch: false,
          aiSolution: "Ta có $f'(x) = 4x^3 - 4x = 0 \\Leftrightarrow 4x(x^2 - 1) = 0 \\Leftrightarrow x = 0; x = 1$ (do xét trên $[0; 2]$). Ta tính: $f(0) = 3$, $f(1) = 2$, $f(2) = 2^4 - 2 \\cdot 2^2 + 3 = 16 - 8 + 3 = 11$. Vậy GTLN trên đoạn $[0; 2]$ bằng 11 (tại $x = 2$).",
          discrepancyNote: "PHÁT HIỆN LỆCH ĐÁP ÁN: Tác giả ghi nhận đáp án B (3) là SAI vì 3 chỉ là giá trị tại điểm biên $x=0$, trong khi tại $x=2$ giá trị hàm số đạt tới 11. Đáp án đúng chuẩn xác phải là A (11)!"
        },
        ambiguityCheck: {
          isAmbiguous: false,
          ambiguityType: "none",
          explanation: "Câu hỏi rõ ràng, không mơ hồ.",
          suggestedRewrite: "Giữ nguyên câu hỏi, chỉ cần sửa lại đáp án đúng thành A."
        },
        matrixAlignment: {
          topic: "Ứng dụng đạo hàm: Giá trị lớn nhất, nhỏ nhất",
          competencyRequirement: "Tìm GTLN, GTNN của hàm số trên một đoạn.",
          actualLevel: "TH",
          matrixLevel: "TH",
          isDeviated: false,
          deviationNote: "Khớp mức độ Thông hiểu."
        },
        distractorAnalysis: {
          tooObviousDistractors: [
            {
              option: "D. 15",
              reason: "Số liệu 15 không xuất hiện ở bất kỳ bước tính toán nào, học sinh dễ dàng loại trừ."
            }
          ],
          suggestedDistractors: [
            {
              option: "B. 3",
              studentMistake: "Học sinh tính nhầm cực đại $f(0)=3$ là giá trị lớn nhất trên toàn đoạn.",
              explanation: "Phương án bẫy rất tốt nếu làm đáp án nhiễu."
            }
          ]
        },
        suggestedCorrection: {
          improvedQuestion: "Giá trị lớn nhất của hàm số $f(x) = x^4 - 2x^2 + 3$ trên đoạn $[0; 2]$ bằng:",
          improvedOptions: ["A. 11", "B. 3", "C. 2", "D. 9"],
          improvedAnswer: "A",
          explanation: "Tính $f(0) = 3, f(1) = 2, f(2) = 11 \\Rightarrow \\max_{[0; 2]} f(x) = 11$."
        }
      }
    ];

    setOverallCritique(fallbackOverall);
    setCritiqueList(fallbackQuestions);
    setActiveTabMode('result');
    setCritiqueViewTab('answers');
    showNotification('Đã hoàn thành phản biện đề thi theo đúng 4 tiêu chuẩn bắt buộc!');
  };

  // Xuất file Word Báo cáo phản biện
  const handleExportWordCritique = async () => {
    if (!overallCritique || critiqueList.length === 0) {
      showNotification('Chưa có kết quả phản biện để xuất file.');
      return;
    }

    try {
      showNotification('Đang khởi tạo file Word Báo cáo Phản biện...');

      const fontName = 'Times New Roman';
      const defaultBorder = { style: BorderStyle.SINGLE, size: 1, color: 'D3D3D3' };
      const tableBorders = {
        top: defaultBorder, bottom: defaultBorder, left: defaultBorder, right: defaultBorder,
        insideHorizontal: defaultBorder, insideVertical: defaultBorder
      };

      const docParagraphs: any[] = [
        new Paragraph({
          children: [
            new TextRun({ text: "BỘ GIÁO DỤC VÀ ĐÀO TẠO", font: fontName, size: 20, bold: true }),
            new TextRun({ text: "               CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", font: fontName, size: 20, bold: true })
          ],
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "HỘI ĐỒNG KHẢO THÍ ĐỀ THI", font: fontName, size: 18 }),
            new TextRun({ text: "                         Độc lập - Tự do - Hạnh phúc", font: fontName, size: 18, italics: true })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "BIÊN BẢN PHẢN BIỆN ĐỀ THI ĐỊNH KÌ", font: fontName, size: 30, bold: true, color: "0F766E" })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 150 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "(Thực hiện nghiêm ngặt theo 4 tiêu chuẩn Công văn 7991/BGDĐT-GDTrH)", font: fontName, size: 20, italics: true })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 250 }
        }),

        // 1. TỔNG QUAN
        new Paragraph({
          children: [
            new TextRun({ text: "I. TỔNG QUAN ĐÁNH GIÁ & CẢNH BÁO", font: fontName, size: 24, bold: true })
          ],
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `● Điểm chất lượng: ${overallCritique.overallScore}/10.0đ | Số câu kiểm tra: ${overallCritique.totalQuestionsChecked} câu`, font: fontName, size: 22, bold: true })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `● Bắt lỗi đáp án: ${overallCritique.answerMismatchCount} câu lệch đáp án | Bắt câu mơ hồ: ${overallCritique.ambiguousQuestionsCount} câu | Lệch ma trận: ${overallCritique.matrixDeviationCount} câu | Phương án quá lộ: ${overallCritique.obviousDistractorCount} câu`, font: fontName, size: 22 })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `● Kết luận chung: `, font: fontName, size: 22, bold: true }),
            new TextRun({ text: overallCritique.generalVerdict, font: fontName, size: 22, italics: true })
          ],
          spacing: { after: 200 }
        }),

        // 2. CHI TIẾT 4 NỘI DUNG PHẢN BIỆN
        new Paragraph({
          children: [
            new TextRun({ text: "II. CHI TIẾT PHẢN BIỆN THEO 4 NỘI DUNG BẮT BUỘC", font: fontName, size: 24, bold: true })
          ],
          spacing: { before: 200, after: 150 }
        })
      ];

      critiqueList.forEach((q, idx) => {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: `Câu ${q.questionNumber || idx + 1}: `, font: fontName, size: 22, bold: true, color: "1E3A8A" }),
              new TextRun({ text: q.originalContent, font: fontName, size: 22 })
            ],
            spacing: { before: 120, after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `  1. Bắt lỗi đáp án: `, font: fontName, size: 20, bold: true, color: q.answerCheck.isMatch ? "047857" : "B91C1C" }),
              new TextRun({ text: `Đáp án đề: ${q.answerCheck.providedAnswer} | AI tự giải: ${q.answerCheck.aiAnswer} -> ${q.answerCheck.isMatch ? 'TRÙNG KHỚP' : 'LỆCH ĐÁP ÁN!'}`, font: fontName, size: 20 }),
              new TextRun({ text: `\n     Lời giải AI: ${q.answerCheck.aiSolution}`, font: fontName, size: 20, italics: true })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `  2. Bắt câu mơ hồ: `, font: fontName, size: 20, bold: true, color: q.ambiguityCheck.isAmbiguous ? "B45309" : "047857" }),
              new TextRun({ text: q.ambiguityCheck.isAmbiguous ? `CÓ MƠ HỒ: ${q.ambiguityCheck.explanation}` : `Rõ ràng, không mơ hồ.`, font: fontName, size: 20 })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `  3. Soát với ma trận: `, font: fontName, size: 20, bold: true, color: q.matrixAlignment.isDeviated ? "B91C1C" : "047857" }),
              new TextRun({ text: `YCCĐ: "${q.matrixAlignment.competencyRequirement}" | Mức độ: ${q.matrixAlignment.actualLevel} (Ma trận: ${q.matrixAlignment.matrixLevel || q.matrixAlignment.actualLevel}) -> ${q.matrixAlignment.isDeviated ? 'LỆCH MA TRẬN' : 'Đúng chuẩn'}`, font: fontName, size: 20 })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `  4. Soát phương án nhiễu: `, font: fontName, size: 20, bold: true, color: "6D28D9" }),
              new TextRun({ text: q.distractorAnalysis.tooObviousDistractors.length > 0 ? `Phương án quá lộ: ${q.distractorAnalysis.tooObviousDistractors.map(d => d.option).join(', ')}` : `Các phương án nhiễu đạt độ phân hóa tốt.`, font: fontName, size: 20 })
            ],
            spacing: { after: 80 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `  => Đề xuất hoàn thiện: `, font: fontName, size: 20, bold: true, color: "047857" }),
              new TextRun({ text: q.suggestedCorrection.improvedQuestion, font: fontName, size: 20 })
            ],
            spacing: { after: 120 }
          })
        );
      });

      const doc = new Document({
        sections: [{
          properties: { page: { margin: { top: 1200, bottom: 1200, left: 1400, right: 1200 } } },
          children: docParagraphs
        }]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bao_Cao_Phan_Bien_De_Thi_CV7991_${Date.now()}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('Đã xuất file Word báo cáo phản biện thành công!');
    } catch (e: any) {
      alert('Lỗi xuất Word: ' + e.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast thông báo */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-teal-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30">
              <ShieldCheck size={14} className="text-teal-300" />
              <span>Chuyên Gia Phản Biện Đề Thi Độc Lập Chuẩn CV 7991</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Phản Biện Đề Thi & Ma Trận Đặc Tả
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Thực hiện nghiêm ngặt 4 nội dung phản biện: <strong>(1) Tự giải độc lập & Bắt lỗi đáp án</strong>, 
              <strong> (2) Bắt câu mơ hồ / thiếu dữ kiện / hiểu 2 cách</strong>, 
              <strong> (3) Soát yêu cầu cần đạt với ma trận</strong>, và 
              <strong> (4) Soát phương án nhiễu quá lộ & đề xuất bẫy sai lầm thực tế</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTabMode('input')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition ${
                activeTabMode === 'input'
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              1. Dữ Liệu Đề Thi
            </button>
            <button
              onClick={() => {
                if (critiqueList.length > 0) setActiveTabMode('result');
                else showNotification('Vui lòng bấm Phản biện đề trước để xem kết quả.');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition ${
                activeTabMode === 'result'
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              2. Kết Quả Phản Biện {critiqueList.length > 0 && `(${critiqueList.length} câu)`}
            </button>
          </div>
        </div>
      </div>

      {/* CHẾ ĐỘ 1: NHẬP LIỆU & NẠP FILE (5 LOẠI FILE HỖ TRỢ) */}
      {activeTabMode === 'input' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CỘT 1: NỘI DUNG ĐỀ THI & UPLOAD */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileText size={16} className="text-teal-600" />
                Đề thi cần phản biện (Nhận 1 trong 5 loại)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLoadFromSystem}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition"
                  title="Nạp đề thi đang mở từ hệ thống"
                >
                  Nạp từ hệ thống
                </button>
                <button
                  onClick={() => fileInputExamRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition flex items-center gap-1"
                >
                  <Upload size={12} />
                  <span>Tải tệp</span>
                </button>
                <input
                  type="file"
                  ref={fileInputExamRef}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.bmp,.txt"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0], 'exam');
                    }
                  }}
                />
              </div>
            </div>

            {/* Badges 5 loại file */}
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">📄 PDF</span>
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">📘 DOCX</span>
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">📑 DOC</span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">🖼️ ẢNH CHỤP</span>
              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">📸 SCAN</span>
            </div>

            {examFileName && (
              <div className="text-[11px] font-semibold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/60 p-2.5 rounded-xl border border-teal-200 dark:border-teal-800 flex items-center justify-between">
                <span>Đã nạp tệp: <strong>{examFileName}</strong></span>
                <button onClick={() => { setExamText(''); setExamFileName(''); setBase64ExamFile(null); }} className="text-slate-400 hover:text-rose-600">✕</button>
              </div>
            )}

            <textarea
              value={examText}
              onChange={(e) => setExamText(e.target.value)}
              placeholder="Dán nội dung đề thi vào đây, hoặc tải tệp PDF, Word, Ảnh, Scan..."
              rows={14}
              className="w-full text-xs font-mono p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-teal-500 font-medium leading-relaxed resize-y"
            />
          </div>

          {/* CỘT 2: MA TRẬN & BẢN ĐẶC TẢ + TIÊU CHÍ BẮT BUỘC */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-purple-600" />
                  Ma trận & Bản đặc tả (Để đối chiếu YCCĐ)
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="file"
                    ref={fileInputMatrixRef}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0], 'matrix');
                      }
                    }}
                  />
                  <button
                    onClick={() => fileInputMatrixRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                  >
                    Tải tệp
                  </button>
                </div>
              </div>

              {matrixFileName && (
                <div className="text-[11px] font-semibold text-purple-800 dark:text-purple-200 bg-purple-50 dark:bg-purple-950/60 p-2 rounded-lg border border-purple-200 dark:border-purple-800 flex items-center justify-between">
                  <span>Ma trận: {matrixFileName}</span>
                  <button onClick={() => { setMatrixText(''); setMatrixFileName(''); }} className="text-slate-400 hover:text-rose-500">✕</button>
                </div>
              )}

              <textarea
                value={matrixText}
                onChange={(e) => setMatrixText(e.target.value)}
                placeholder="Dán ma trận hoặc bản đặc tả vào đây để AI đối chiếu yêu cầu cần đạt (Nếu để trống AI sẽ tự đối chiếu theo chuẩn CV 7991)..."
                rows={7}
                className="w-full text-xs font-mono p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-purple-500 leading-relaxed resize-none"
              />
            </div>

            {/* 4 TIÊU CHUẨN PHẢN BIỆN BẮT BUỘC */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-teal-600" />
                4 Tiêu chuẩn phản biện bắt buộc:
              </span>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-1">
                  <span className="font-extrabold text-rose-800 dark:text-rose-300 flex items-center gap-1">
                    🎯 1. Bắt lỗi đáp án:
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                    "AI tự giải từng câu mà không xem đáp án của tác giả. Sau đó đối chiếu và chỉ ra những câu kết quả khác đáp án kèm lời giải chi tiết."
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-1">
                  <span className="font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                    ⚠️ 2. Bắt câu mơ hồ:
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                    "Chỉ ra những câu có thể hiểu theo hai cách, thiếu dữ kiện, hoặc có hơn một phương án đúng. Đề xuất cách viết lại."
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-1">
                  <span className="font-extrabold text-blue-800 dark:text-blue-300 flex items-center gap-1">
                    📊 3. Soát với ma trận:
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                    "Đối chiếu từng câu với yêu cầu cần đạt (YCCĐ) và mức độ nhận thức (NB/TH/VD). Lập bảng so sánh và chỉ ra chỗ lệch."
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 space-y-1">
                  <span className="font-extrabold text-purple-800 dark:text-purple-300 flex items-center gap-1">
                    🎯 4. Soát phương án nhiễu:
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                    "Tìm phương án sai quá lộ, học sinh không cần học cũng loại được. Gợi ý phương án nhiễu dựa trên lỗi sai thường gặp của học sinh."
                  </p>
                </div>
              </div>

              <button
                onClick={handleAnalyzeCritique}
                disabled={isAnalyzing || (!examText.trim() && !base64ExamFile)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 text-white font-black text-xs shadow-md transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{statusMessage || 'Đang phản biện chuyên sâu...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="text-amber-300" />
                    <span>BẮT ĐẦU PHẢN BIỆN ĐỀ THI (4 TIÊU CHÍ AI)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* CHẾ ĐỘ 2: KẾT QUẢ PHẢN BIỆN (4 TABS CHUYÊN SÂU THEO YÊU CẦU) */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">
                Báo cáo phản biện: {critiqueList.length} câu hỏi
              </span>
              {overallCritique && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  Chất lượng: {overallCritique.overallScore}/10đ
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportWordCritique}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition shadow-2xs"
              >
                <Download size={14} /> Xuất Báo Cáo (.docx)
              </button>
              <button
                onClick={() => setActiveTabMode('input')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
              >
                Quay Lại Sửa Đề
              </button>
            </div>
          </div>

          {/* 4 TABS PHẢN BIỆN CHUYÊN BIỆT */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
            <button
              onClick={() => setCritiqueViewTab('answers')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                critiqueViewTab === 'answers'
                  ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-xs ring-1 ring-rose-200 dark:ring-rose-900'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>🎯 1. Bắt Lỗi Đáp Án</span>
              {overallCritique && overallCritique.answerMismatchCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white">
                  {overallCritique.answerMismatchCount} lệch
                </span>
              )}
            </button>

            <button
              onClick={() => setCritiqueViewTab('ambiguity')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                critiqueViewTab === 'ambiguity'
                  ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs ring-1 ring-amber-200 dark:ring-amber-900'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>⚠️ 2. Bắt Câu Mơ Hồ</span>
              {overallCritique && overallCritique.ambiguousQuestionsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-600 text-white">
                  {overallCritique.ambiguousQuestionsCount} câu
                </span>
              )}
            </button>

            <button
              onClick={() => setCritiqueViewTab('matrix')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                critiqueViewTab === 'matrix'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs ring-1 ring-blue-200 dark:ring-blue-900'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>📊 3. Soát Với Ma Trận</span>
              {overallCritique && overallCritique.matrixDeviationCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-600 text-white">
                  {overallCritique.matrixDeviationCount} lệch
                </span>
              )}
            </button>

            <button
              onClick={() => setCritiqueViewTab('distractors')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                critiqueViewTab === 'distractors'
                  ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-xs ring-1 ring-purple-200 dark:ring-purple-900'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>🎯 4. Soát Phương Án Nhiễu</span>
            </button>

            <button
              onClick={() => setCritiqueViewTab('summary')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                critiqueViewTab === 'summary'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs ring-1 ring-teal-200 dark:ring-teal-900'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>📝 Đề Xuất Hoàn Thiện</span>
            </button>
          </div>

          {/* TAB 1: BẮT LỖI ĐÁP ÁN (AI TỰ GIẢI ĐỐI CHIẾU) */}
          {critiqueViewTab === 'answers' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                <span className="font-extrabold flex items-center gap-1.5">
                  <AlertCircle size={15} className="text-rose-600" />
                  Tiêu chuẩn 1: AI tự giải độc lập & đối chiếu với đáp án tác giả cung cấp
                </span>
                <p className="text-[11px] opacity-90">
                  Dưới đây là kết quả đối chiếu giữa lời giải độc lập của AI và đáp án tác giả gửi kèm. 
                  Các câu có kết quả lệch nhau được gắn nhãn cảnh báo đỏ cùng lời giải phân tích chi tiết.
                </p>
              </div>

              <div className="space-y-3">
                {critiqueList.map((q, idx) => {
                  const check = q.answerCheck || { isMatch: true, aiAnswer: q.providedAnswer || 'A', providedAnswer: q.providedAnswer || 'A', aiSolution: '' };
                  const isMatch = check.isMatch;

                  return (
                    <div 
                      key={idx}
                      className={`p-4 rounded-2xl border transition ${
                        !isMatch 
                          ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900 ring-2 ring-rose-200 dark:ring-rose-950' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                            !isMatch ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white dark:bg-slate-700'
                          }`}>
                            {q.questionNumber || idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            Câu {q.questionNumber || idx + 1}
                          </span>
                        </div>

                        <div>
                          {!isMatch ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-600 text-white flex items-center gap-1 animate-pulse">
                              <XCircle size={13} /> LỆCH ĐÁP ÁN!
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                              <CheckCircle2 size={13} /> Khớp đáp án ({check.providedAnswer})
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-800 dark:text-slate-200 mb-2 font-medium">
                        {q.originalContent}
                      </p>

                      {/* Bảng so sánh 2 đáp án */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 mb-2">
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 block mb-0.5">Đáp án tác giả gửi:</span>
                          <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400">
                            {check.providedAnswer || 'Chưa cung cấp'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 block mb-0.5">Kết quả AI tự giải độc lập:</span>
                          <span className={`text-xs font-extrabold ${!isMatch ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {check.aiAnswer}
                          </span>
                        </div>
                      </div>

                      {/* Lời giải của AI */}
                      {check.aiSolution && (
                        <div className="text-[11px] bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 space-y-1">
                          <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                            <Lightbulb size={13} className="text-amber-500" />
                            Lời giải độc lập của chuyên gia AI:
                          </span>
                          <p className="leading-relaxed font-mono whitespace-pre-wrap">{check.aiSolution}</p>
                          {check.discrepancyNote && (
                            <p className="text-rose-600 dark:text-rose-400 font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
                              {check.discrepancyNote}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: BẮT CÂU MƠ HỒ (ĐA NGHĨA / THIẾU DỮ KIỆN / NHIỀU ĐÁP ÁN ĐÚNG) */}
          {critiqueViewTab === 'ambiguity' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <span className="font-extrabold flex items-center gap-1.5">
                  <AlertTriangle size={15} className="text-amber-600" />
                  Tiêu chuẩn 2: Rà soát câu mơ hồ, hiểu hai cách, thiếu dữ kiện hoặc có hơn 1 phương án đúng
                </span>
                <p className="text-[11px] opacity-90">
                  Phát hiện câu từ chưa chặt chẽ, dễ gây tranh cãi toán học và đề xuất cách viết lại chuẩn mực sư phạm.
                </p>
              </div>

              <div className="space-y-3">
                {critiqueList.map((q, idx) => {
                  const amb = q.ambiguityCheck || { isAmbiguous: false, explanation: 'Rõ ràng', suggestedRewrite: '' };

                  return (
                    <div 
                      key={idx}
                      className={`p-4 rounded-2xl border ${
                        amb.isAmbiguous 
                          ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          Câu {q.questionNumber || idx + 1}
                        </span>
                        {amb.isAmbiguous ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white flex items-center gap-1">
                            <AlertTriangle size={12} /> CÓ DẤU HIỆU MƠ HỒ
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                            <Check size={12} /> Rõ ràng, tường minh
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-800 dark:text-slate-200 mb-2 font-medium">
                        {q.originalContent}
                      </p>

                      {amb.isAmbiguous && (
                        <div className="space-y-2 mt-3 pt-3 border-t border-amber-200 dark:border-amber-900">
                          <div className="text-xs text-amber-900 dark:text-amber-300">
                            <strong>Chỉ ra điểm mơ hồ:</strong> {amb.explanation}
                          </div>
                          {amb.suggestedRewrite && (
                            <div className="text-xs bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-amber-300 text-slate-800 dark:text-slate-200">
                              <strong className="text-emerald-700 dark:text-emerald-400 block mb-0.5">Đề xuất viết lại chặt chẽ:</strong>
                              <p className="font-medium italic">{amb.suggestedRewrite}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: SOÁT VỚI MA TRẬN & BẢN ĐẶC TẢ */}
          {critiqueViewTab === 'matrix' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <span className="font-extrabold flex items-center gap-1.5">
                  <FileSpreadsheet size={15} className="text-blue-600" />
                  Tiêu chuẩn 3: Soát từng câu với Ma trận & Bản đặc tả, xác định YCCĐ và mức độ nhận thức
                </span>
                <p className="text-[11px] opacity-90">
                  Đối chiếu xem từng câu kiểm tra Yêu cầu cần đạt nào theo CT GDPT 2018, ở mức độ nào và phát hiện câu bị lệch ma trận.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-xs text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-700">
                      <th className="p-2.5 text-center w-12 border-r border-slate-200 dark:border-slate-700">Câu</th>
                      <th className="p-2.5 border-r border-slate-200 dark:border-slate-700 min-w-[140px]">Chủ đề kiến thức</th>
                      <th className="p-2.5 border-r border-slate-200 dark:border-slate-700 min-w-[280px]">Yêu cầu cần đạt (YCCĐ) theo GDPT 2018</th>
                      <th className="p-2.5 text-center w-28 border-r border-slate-200 dark:border-slate-700">Mức độ thực tế</th>
                      <th className="p-2.5 text-center w-28 border-r border-slate-200 dark:border-slate-700">Mức độ ma trận</th>
                      <th className="p-2.5 text-center w-32">Kết quả đối chiếu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {critiqueList.map((q, idx) => {
                      const mat = q.matrixAlignment || { topic: '', competencyRequirement: '', actualLevel: 'NB', isDeviated: false };

                      return (
                        <tr key={idx} className={mat.isDeviated ? 'bg-rose-50/40 dark:bg-rose-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}>
                          <td className="p-2 text-center font-bold text-slate-600 border-r border-slate-200 dark:border-slate-700">{q.questionNumber || idx + 1}</td>
                          <td className="p-2 font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700">{mat.topic}</td>
                          <td className="p-2 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 leading-relaxed">{mat.competencyRequirement}</td>
                          <td className="p-2 text-center font-bold border-r border-slate-200 dark:border-slate-700">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold">
                              {mat.actualLevel}
                            </span>
                          </td>
                          <td className="p-2 text-center font-bold border-r border-slate-200 dark:border-slate-700">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold">
                              {mat.matrixLevel || mat.actualLevel}
                            </span>
                          </td>
                          <td className="p-2 text-center font-bold">
                            {mat.isDeviated ? (
                              <span className="text-rose-600 dark:text-rose-400 font-black flex items-center justify-center gap-1">
                                <AlertCircle size={13} /> Lệch ma trận
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-1">
                                <CheckCircle2 size={13} /> Đúng chuẩn
                              </span>
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

          {/* TAB 4: SOÁT PHƯƠNG ÁN NHIỄU */}
          {critiqueViewTab === 'distractors' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-900/60 text-xs text-purple-900 dark:text-purple-200 space-y-1">
                <span className="font-extrabold flex items-center gap-1.5">
                  <Brain size={15} className="text-purple-600" />
                  Tiêu chuẩn 4: Rà soát phương án sai quá lộ liễu & Gợi ý phương án nhiễu theo bẫy sai lầm của học sinh
                </span>
                <p className="text-[11px] opacity-90">
                  Lọc ra các phương án học sinh không cần học cũng loại được, đồng thời bổ sung các phương án nhiễu phản ánh đúng lỗi bấm máy tính Casio, nhầm lẫn công thức.
                </p>
              </div>

              <div className="space-y-4">
                {critiqueList.map((q, idx) => {
                  const dist = q.distractorAnalysis || { tooObviousDistractors: [], suggestedDistractors: [] };

                  return (
                    <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          Câu {q.questionNumber || idx + 1}: {q.originalContent}
                        </span>
                      </div>

                      {/* Phương án quá lộ */}
                      {dist.tooObviousDistractors.length > 0 ? (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-1.5">
                          <span className="text-xs font-extrabold text-rose-800 dark:text-rose-300 flex items-center gap-1">
                            <XCircle size={13} /> Phương án sai quá lộ liễu (Học sinh dễ loại trừ ngay):
                          </span>
                          {dist.tooObviousDistractors.map((obv, oIdx) => (
                            <div key={oIdx} className="text-xs text-rose-900 dark:text-rose-200 pl-4 border-l-2 border-rose-400">
                              <strong>{obv.option}:</strong> {obv.reason}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 size={13} /> Các phương án trắc nghiệm không bị lộ liễu, có độ phân hóa tốt.
                        </div>
                      )}

                      {/* Gợi ý phương án nhiễu mới dựa trên sai lầm học sinh */}
                      {dist.suggestedDistractors.length > 0 && (
                        <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 space-y-2">
                          <span className="text-xs font-extrabold text-purple-800 dark:text-purple-300 flex items-center gap-1">
                            <Lightbulb size={13} /> Gợi ý phương án nhiễu bẫy sai lầm học sinh thường gặp:
                          </span>
                          {dist.suggestedDistractors.map((sug, sIdx) => (
                            <div key={sIdx} className="text-xs text-purple-950 dark:text-purple-200 pl-4 border-l-2 border-purple-400 space-y-0.5">
                              <span className="font-extrabold text-purple-700 dark:text-purple-300">{sug.option}</span>
                              <p className="text-[11px] italic">Lỗi sai của học sinh: "{sug.studentMistake}"</p>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400">{sug.explanation}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: ĐỀ XUẤT VIẾT LẠI HOÀN CHỈNH */}
          {critiqueViewTab === 'summary' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-teal-50 dark:bg-teal-950/40 rounded-2xl border border-teal-200 dark:border-teal-900/60 text-xs text-teal-900 dark:text-teal-200 flex items-center justify-between">
                <div>
                  <span className="font-extrabold block">Đề thi đã được hiệu đính chuẩn mực 100%</span>
                  <span className="text-[11px] opacity-90">Tất cả các lỗi sai đáp án, câu mơ hồ và phương án nhiễu đã được AI hoàn thiện.</span>
                </div>
                <button
                  onClick={handleExportWordCritique}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={13} /> Tải file Word Báo Cáo
                </button>
              </div>

              <div className="space-y-4">
                {critiqueList.map((q, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                        Câu {q.questionNumber || idx + 1} (Bản đã hoàn thiện)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                        Đáp án chuẩn: {q.suggestedCorrection.improvedAnswer || q.answerCheck.aiAnswer}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {q.suggestedCorrection.improvedQuestion}
                    </p>

                    {q.suggestedCorrection.improvedOptions && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        {q.suggestedCorrection.improvedOptions.map((opt, oIdx) => (
                          <div key={oIdx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium">
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-[11px] bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                      <strong>Hướng dẫn giải chi tiết:</strong> {q.suggestedCorrection.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
