export type ActiveModule = 'khbd' | 'slide' | 'exam' | 'matrix' | 'tools_visual' | 'tools_doc' | 'guide';

export type CognitiveLevel = 'know' | 'understand' | 'apply'; // Nhận biết (40%), Thông hiểu (30%), Vận dụng (30%)

export interface ActivityStep {
  title: string;
  teacherAction: string;
  studentAction: string;
  expectedOutcome: string;
}

export interface TeachingActivity {
  id: string;
  order: number;
  name: string; // Khởi động, Hình thành kiến thức, Luyện tập, Vận dụng
  timeMinutes: number;
  objectives: string[];
  content: string;
  product: string;
  implementation: {
    step1Transfer: string; // Chuyển giao nhiệm vụ
    step2Execute: string; // Thực hiện nhiệm vụ
    step3Report: string; // Báo cáo, thảo luận
    step4Conclude: string; // Kết luận, nhận định
  };
}

export interface LessonPlan5512 {
  schoolName: string;
  departmentName: string;
  teacherName: string;
  subject: string;
  grade: string;
  lessonName: string;
  durationPeriods: number;
  periodIndex: string;
  datePrepared: string;

  // I. Mục tiêu
  objectives: {
    knowledge: string[];
    competencies: {
      general: string[]; // Tự chủ & tự học, Giao tiếp & hợp tác, Giải quyết vấn đề & sáng tạo
      specific: string[]; // Năng lực đặc thù môn học
    };
    qualities: string[]; // Yêu nước, Nhân ái, Chăm chỉ, Trung thực, Trách nhiệm
  };

  // II. Thiết bị và học liệu
  materials: {
    teacher: string[];
    student: string[];
    digitalDevicesNotice?: string; // Ghi chú về việc sử dụng điện thoại di động theo CV 5512
  };

  // III. Tiến trình dạy học
  activities: TeachingActivity[];
}

export interface SlideContent {
  id: string;
  phase: 'Khởi động' | 'Khám phá' | 'Luyện tập' | 'Vận dụng' | 'Tổng kết';
  title: string;
  subtitle?: string;
  bulletPoints: string[];
  highlightBox?: string;
  interactiveQuestion?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  timerMinutes?: number;
  groupTask?: {
    taskName: string;
    deliverable: string;
    criteria: string;
  };
}

// CV 7991 Question Structures
export interface Part1Question {
  id: string;
  number: number;
  cognitiveLevel: CognitiveLevel;
  topic: string;
  competencyCode?: string; // Ví dụ: NL1, NL2
  content: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  points: number; // Thường 0.25đ
  explanation: string;
}

export interface Part2Statement {
  subId: 'a' | 'b' | 'c' | 'd';
  content: string;
  isCorrect: boolean; // Đúng hoặc Sai
  explanation: string;
}

export interface Part2Question {
  id: string;
  number: number;
  cognitiveLevel: CognitiveLevel;
  topic: string;
  competencyCode?: string;
  leadIn: string; // Đoạn ngữ cảnh/đề bài
  statements: Part2Statement[]; // 4 ý a, b, c, d
  pointsTotal: number; // 1.0 điểm cho cả câu
}

export interface Part3Question {
  id: string;
  number: number;
  cognitiveLevel: CognitiveLevel;
  topic: string;
  competencyCode?: string;
  content: string;
  correctAnswerShort: string; // Số hoặc từ khóa ngắn
  points: number; // Thường 0.5đ
  explanation: string;
}

export interface Part4EssayQuestion {
  id: string;
  number: number;
  cognitiveLevel: CognitiveLevel;
  topic: string;
  competencyCode?: string;
  content: string;
  points: number; // Thường 1.5đ - 2.0đ
  rubric: {
    criteria: string;
    score: number;
  }[];
}

export interface MatrixTopicRow {
  topicName: string;
  unitName: string;
  // Phần I: Nhiều lựa chọn (3.0đ)
  part1: { know: number; understand: number; apply: number };
  // Phần II: Đúng - Sai (2.0đ)
  part2: { know: number; understand: number; apply: number };
  // Phần III: Trả lời ngắn (2.0đ)
  part3: { know: number; understand: number; apply: number };
  // Phần IV: Tự luận (3.0đ)
  part4: { know: number; understand: number; apply: number };
}

export interface SpecificationDetail {
  id: string;
  topic: string;
  unit: string;
  competencyRequirement: string; // YCCĐ
  level: CognitiveLevel;
  questionRef: string; // Câu 1, Câu 2a,...
  questionType: 'TNKQ Nhiều lựa chọn' | 'TNKQ Đúng - Sai' | 'TNKQ Trả lời ngắn' | 'Tự luận';
}

export interface ExamCV7991 {
  examTitle: string;
  term: 'Giữa Học kỳ 1' | 'Cuối Học kỳ 1' | 'Giữa Học kỳ 2' | 'Cuối Học kỳ 2';
  academicYear: string;
  grade: string;
  subject: string;
  durationMinutes: number;
  code: string; // Mã đề: 101, 102,...
  
  matrixRows: MatrixTopicRow[];
  specifications: SpecificationDetail[];

  part1Questions: Part1Question[]; // 12 câu x 0.25 = 3.0đ
  part2Questions: Part2Question[]; // 2 câu x 1.0 = 2.0đ (4 ý a,b,c,d)
  part3Questions: Part3Question[]; // 4 câu x 0.5 = 2.0đ
  part4Questions: Part4EssayQuestion[]; // 2 câu = 3.0đ
}

export interface SystemWorkSessionState {
  version: string;
  timestamp: string;
  activeModule: ActiveModule;
  lessonPlan: LessonPlan5512;
  slides: SlideContent[];
  exam: ExamCV7991;
  metadata: {
    compliance: {
      lessonPlanLegal: 'Công văn 5512/BGDĐT-GDTrH';
      examLegal: 'Công văn 7991/BGDĐT-GDTrH ngày 17/12/2024';
      targetRatio: '40% Nhận biết - 30% Thông hiểu - 30% Vận dụng = 10.0 điểm';
    };
    author: string;
  };
}
