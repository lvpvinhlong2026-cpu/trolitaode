/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppData, Subject, Question, Session, Exam, Progress, QuestionBank } from '../types';

const STORAGE_KEY = 'math_teacher_companion_data';

// Helper to generate IDs
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Complete rich mock database of Vietnamese High School Math topics
export const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'sub-calc', name: 'Giải Tích 12 - Khảo Sát Hàm Số', icon: 'fa-chart-line', questionsCount: 8 },
  { id: 'sub-integral', name: 'Nguyên Hàm & Tích Phân', icon: 'fa-calculator', questionsCount: 6 },
  { id: 'sub-geom', name: 'Hình Học Không Gian & Oxyz', icon: 'fa-cube', questionsCount: 6 },
  { id: 'sub-stats', name: 'Đại Số Tổ Hợp & Xác Suất', icon: 'fa-dice', questionsCount: 5 }
];

export const DEFAULT_BANKS: QuestionBank[] = [
  { id: 'bank-default', name: 'Ngân hàng mặc định gốc', createdAt: '2026-06-01T00:00:00.000Z' }
];

export const DEFAULT_QUESTIONS: Question[] = [
  // Giải Tích 12 - Khảo Sát Hàm Số
  {
    id: 'q-calc-1',
    subjectId: 'sub-calc',
    bankId: 'bank-default',
    content: 'Tìm tập xác định $D$ của hàm số $y = \\frac{\\sqrt{x+2}}{x-1}$.',
    type: 'multiple-choice',
    options: [
      '$D = [-2; \\infty) \\setminus \\{1\\}$',
      '$D = (-2; \\infty) \\setminus \\{1\\}$',
      '$D = [-2; \\infty)$',
      '$D = \\mathbb{R} \\setminus \\{1\\}$'
    ],
    correctAnswer: 'A',
    explanation: 'Hàm số xác định khi $\\begin{cases} x+2 \\ge 0 \\\\ x-1 \\ne 0 \\end{cases} \\Leftrightarrow \\begin{cases} x \\ge -2 \\\\ x \\ne 1 \\end{cases}$. Vậy $D = [-2; \\infty) \\setminus \\{1\\}$.',
    difficulty: 'easy'
  },
  {
    id: 'q-calc-2',
    subjectId: 'sub-calc',
    bankId: 'bank-default',
    content: 'Đường tiệm cận đứng của đồ thị hàm số $y = \\frac{2x-3}{x+1}$ là đường thẳng nào?',
    type: 'multiple-choice',
    options: [
      '$x = -1$',
      '$x = 2$',
      '$y = 2$',
      '$x = \\frac{3}{2}$'
    ],
    correctAnswer: 'A',
    explanation: 'Tiệm cận đứng là nghiệm của mẫu số $x + 1 = 0 \\Leftrightarrow x = -1$.',
    difficulty: 'easy'
  },
  {
    id: 'q-calc-3',
    subjectId: 'sub-calc',
    bankId: 'bank-default',
    content: 'Cho hàm số $y = x^3 - 3x^2 + 2$. Tìm các điểm cực trị của hàm số.',
    type: 'multiple-choice',
    options: [
      '$x = 0$ và $x = 2$',
      '$x = 0$ và $x = -2$',
      '$x = 1$ và $x = 2$',
      'Không có cực trị'
    ],
    correctAnswer: 'A',
    explanation: 'Ta có $y\' = 3x^2 - 6x = 3x(x-2)$. Cho $y\' = 0 \\Leftrightarrow x = 0$ hoặc $x = 2$. Đạo hàm đổi dấu qua hai điểm này nên hàm số đạt cực trị tại $x = 0, x = 2$.',
    difficulty: 'medium'
  },
  {
    id: 'q-calc-4',
    subjectId: 'sub-calc',
    bankId: 'bank-default',
    content: 'Tìm giá trị lớn nhất $M$ của hàm số $y = -x^4 + 2x^2 + 3$ trên đoạn $[0; 2]$.',
    type: 'multiple-choice',
    options: [
      '$M = 4$',
      '$M = 3$',
      '$M = -5$',
      '$M = 12$'
    ],
    correctAnswer: 'A',
    explanation: 'Xét $y\' = -4x^3 + 4x = -4x(x^2 - 1) = 0 \\Leftrightarrow x = 0; x = 1; x = -1$ (loại vì không thuộc đoạn $[0;2]$). Ta tính: $y(0) = 3$, $y(1) = 4$, $y(2) = -5$. Vậy GTLN trên $[0;2]$ là $M = 4$ tại $x = 1$.',
    difficulty: 'medium'
  },
  {
    id: 'q-calc-5',
    subjectId: 'sub-calc',
    bankId: 'bank-default',
    content: 'Tìm tất cả các giá trị thực của tham số $m$ để hàm số $y = x^3 - 3x^2 + mx - 1$ đồng biến trên khoảng $(-\\infty; \\infty)$.',
    type: 'multiple-choice',
    options: [
      '$m \\ge 3$',
      '$m > 3$',
      '$m \\le 3$',
      '$m < 3$'
    ],
    correctAnswer: 'A',
    explanation: 'Ta có $y\' = 3x^2 - 6x + m$. Hàm số đồng biến trên $\\mathbb{R} \\Leftrightarrow y\' \\ge 0 \\ \\forall x \\in \\mathbb{R} \\Leftrightarrow \\Delta\' = 9 - 3m \\le 0 \\Leftrightarrow m \\ge 3$.',
    difficulty: 'hard'
  },
  {
    id: 'q-calc-6',
    subjectId: 'sub-calc',
    bankId: 'bank-default',
    content: 'Cho hàm số $y = f(x)$ liên tục trên $\\mathbb{R}$ và có đồ thị đạo hàm như hình vẽ. Tìm số điểm cực trị của hàm số $g(x) = f(x^2 - 2x)$.',
    type: 'multiple-choice',
    options: [
      '3 điểm cực trị',
      '4 điểm cực trị',
      '5 điểm cực trị',
      '7 điểm cực trị'
    ],
    correctAnswer: 'C',
    explanation: 'Ta có $g\'(x) = (2x - 2)f\'(x^2 - 2x)$. Xét $g\'(x) = 0 \\Leftrightarrow x = 1$ hoặc $x^2 - 2x = t_i$ là các giao điểm của đồ thị $f\'$ với trục hoành. Sử dụng đồ thị đạo hàm để giải phương trình và lập bảng xét dấu ta tìm được 5 điểm cực trị.',
    difficulty: 'hard'
  },

  // Nguyên Hàm & Tích Phân
  {
    id: 'q-int-1',
    subjectId: 'sub-integral',
    bankId: 'bank-default',
    content: 'Tìm họ nguyên hàm $F(x)$ của hàm số $f(x) = 3x^2 + 2x + 1$ trên $\\mathbb{R}$.',
    type: 'multiple-choice',
    options: [
      '$F(x) = x^3 + x^2 + x + C$',
      '$F(x) = 6x + 2 + C$',
      '$F(x) = 3x^3 + 2x^2 + x + C$',
      '$F(x) = x^3 + x^2 + C$'
    ],
    correctAnswer: 'A',
    explanation: 'Áp dụng công thức nguyên hàm cơ bản: $\\int (3x^2 + 2x + 1) dx = 3 \\cdot \\frac{x^3}{3} + 2 \\cdot \\frac{x^2}{2} + x + C = x^3 + x^2 + x + C$.',
    difficulty: 'easy'
  },
  {
    id: 'q-int-2',
    subjectId: 'sub-integral',
    bankId: 'bank-default',
    content: 'Tính tích phân chính xác $I = \\int_{0}^{1} e^x \\, dx$.',
    type: 'multiple-choice',
    options: [
      '$e - 1$',
      '$e$',
      '$1 - e$',
      '$e + 1$'
    ],
    correctAnswer: 'A',
    explanation: 'Ta có $\\int_{0}^{1} e^x dx = \\left. e^x \\right|_0^1 = e^1 - e^0 = e - 1$.',
    difficulty: 'easy'
  },
  {
    id: 'q-int-3',
    subjectId: 'sub-integral',
    bankId: 'bank-default',
    content: 'Biết tích phân $\\int_{1}^{2} \\frac{\\ln x}{x^2} \\, dx = a + b\\ln 2$ với $a, b \\in \\mathbb{Q}$. Tính tích $ab$.',
    type: 'multiple-choice',
    options: [
      '$-1/4$',
      '$1/4$',
      '$-1/2$',
      '$1/2$'
    ],
    correctAnswer: 'A',
    explanation: 'Sử dụng phương pháp tích phân từng phần với $u = \\ln x \\Rightarrow du = \\frac{1}{x}dx$, $dv = \\frac{1}{x^2}dx \\Rightarrow v = -\\frac{1}{x}$. Từ đó ta tính được $I = \\frac{1}{2} - \\frac{1}{2}\\ln 2$. Suy ra $a = 1/2, b = -1/2$, vậy $ab = -1/4$.',
    difficulty: 'medium'
  },
  {
    id: 'q-int-4',
    subjectId: 'sub-integral',
    bankId: 'bank-default',
    content: 'Tìm nguyên hàm $F(x) = \\int \\sin^3 x \\cos x \\, dx$.',
    type: 'multiple-choice',
    options: [
      '$\\frac{\\sin^4 x}{4} + C$',
      '$\\frac{\\cos^4 x}{4} + C$',
      '$\\sin^4 x + C$',
      '$-\\frac{\\sin^4 x}{4} + C$'
    ],
    correctAnswer: 'A',
    explanation: 'Đặt $t = \\sin x \\Rightarrow dt = \\cos x dx$. Khi đó $\\int t^3 dt = \\frac{t^4}{4} + C = \\frac{\\sin^4 x}{4} + C$.',
    difficulty: 'medium'
  },
  {
    id: 'q-int-5',
    subjectId: 'sub-integral',
    bankId: 'bank-default',
    content: 'Tính thể tích $V$ của khối tròn xoay tạo thành khi quay hình phẳng giới hạn bởi đường cong $y = \\sqrt{x}\\ln x$, trục hoành và đường thẳng $x = e$ quanh trục hoành.',
    type: 'multiple-choice',
    options: [
      '$V = \\frac{\\pi(e^2 - 1)}{4}$',
      '$V = \\frac{\\pi(e^2 + 1)}{4}$',
      '$V = \\frac{\\pi e^2}{4}$',
      '$V = \\pi(e^2 - 2e)$'
    ],
    correctAnswer: 'B',
    explanation: 'Thể tích giới hạn là $V = \\pi \\int_{1}^{e} y^2 dx = \\pi \\int_{1}^{e} x(\\ln x)^2 dx$. Sử dụng tích phân từng phần 2 lần ta có kết quả là $V = \\frac{\\pi(e^2 + 1)}{4}$.',
    difficulty: 'hard'
  },

  // Hình Học Không Gian & Oxyz
  {
    id: 'q-geom-1',
    subjectId: 'sub-geom',
    bankId: 'bank-default',
    content: 'Trong không gian Oxyz, cho điểm $A(1; -2; 3)$. Hình chiếu vuông góc của $A$ lên mặt phẳng Oxy có tọa độ là bao nhiêu?',
    type: 'multiple-choice',
    options: [
      '$(1; -2; 0)$',
      '$(1; 0; 3)$',
      '$(0; -2; 3)$',
      '$(1; -2; 3)$'
    ],
    correctAnswer: 'A',
    explanation: 'Chiếu lên mặt phẳng Oxy thì thành phần cao độ $z$ triệt tiêu bằng 0. Vậy ảnh chiếu là $A\'(1; -2; 0)$.',
    difficulty: 'easy'
  },
  {
    id: 'q-geom-2',
    subjectId: 'sub-geom',
    bankId: 'bank-default',
    content: 'Trong không gian Oxyz, phương trình nào dưới đây là phương trình mặt cầu có tâm $I(1; -2; 3)$ và bán kính $R = 4$?',
    type: 'multiple-choice',
    options: [
      '$(x-1)^2 + (y+2)^2 + (z-3)^2 = 16$',
      '$(x+1)^2 + (y-2)^2 + (z+3)^2 = 16$',
      '$(x-1)^2 + (y+2)^2 + (z-3)^2 = 4$',
      '$(x-1)^2 + (y-2)^2 + (z-3)^2 = 16$'
    ],
    correctAnswer: 'A',
    explanation: 'Mặt cầu tâm $I(a, b, c)$ bán kính $R$ có phương trình là $(x-a)^2 + (y-b)^2 + (z-c)^2 = R^2 \\Leftrightarrow (x-1)^2 + (y+2)^2 + (z-3)^2 = 16$.',
    difficulty: 'easy'
  },
  {
    id: 'q-geom-3',
    subjectId: 'sub-geom',
    bankId: 'bank-default',
    content: 'Trong không gian Oxyz, viết phương trình mặt phẳng $(\\alpha)$ đi qua điểm $M(1; -1; 2)$ và song song với mặt phẳng $(\\beta): 2x - y + 3z - 5 = 0$.',
    type: 'multiple-choice',
    options: [
      '$2x - y + 3z - 9 = 0$',
      '$2x - y + 3z + 9 = 0$',
      '$2x + y + 3z - 9 = 0$',
      '$2x - y - 3z - 9 = 0$'
    ],
    correctAnswer: 'A',
    explanation: 'Vì $(\\alpha) \\parallel (\\beta)$ nên phương trình có dạng $2x - y + 3z + D = 0$. Thay điểm $M(1; -1; 2)$ ta có: $2(1) - (-1) + 3(2) + D = 0 \\Leftrightarrow 9 + D = 0 \\Leftrightarrow D = -9$. Vậy phương trình là $2x - y + 3z - 9 = 0$.',
    difficulty: 'medium'
  },

  // Đại Số Tổ Hợp & Xác Suất
  {
    id: 'q-stats-1',
    subjectId: 'sub-stats',
    bankId: 'bank-default',
    content: 'Một hộp chứa 5 quả cầu màu đỏ và 6 quả cầu màu xanh. Hỏi có bao nhiêu cách chọn ngẫu nhiên ra 3 quả cầu từ hộp đó?',
    type: 'multiple-choice',
    options: [
      '$C_{11}^3 = 165$ cách',
      '$A_{11}^3 = 990$ cách',
      '$5 \\times 6 = 30$ cách',
      '$5! + 6! = 840$ cách'
    ],
    correctAnswer: 'A',
    explanation: 'Tổng số quả cầu là $5 + 6 = 11$ quả cầu. Số cách chọn 3 quả cầu bất kì không phân biệt thứ tự là một tổ hợp chập 3 của 11 phần tử: $C_{11}^3 = \\frac{11!}{3!8!} = 165$ cách.',
    difficulty: 'easy'
  },
  {
    id: 'q-stats-2',
    subjectId: 'sub-stats',
    bankId: 'bank-default',
    content: 'Gieo ngẫu nhiên một con súc sắc cân đối và đồng chất. Tính xác suất $P$ để mặt xuất hiện là số lẻ.',
    type: 'multiple-choice',
    options: [
      '$1/2$',
      '$2/3$',
      '$1/3$',
      '$1/6$'
    ],
    correctAnswer: 'A',
    explanation: 'Không gian mẫu có 6 biến cố: $\\Omega = \\{1, 2, 3, 4, 5, 6\\}$. Các mặt lẻ là $A = \\{1, 3, 5\\}$. Số kết quả thuận lợi là $n(A) = 3$. Nên $P = 3/6 = 1/2$.',
    difficulty: 'easy'
  },
  {
    id: 'q-stats-3',
    subjectId: 'sub-stats',
    bankId: 'bank-default',
    content: 'Tìm số hạng không chứa $x$ trong khai triển nhị thức Newton của $\\left(x^2 + \\frac{2}{x}\\right)^{6}$ với $x \\ne 0$.',
    type: 'multiple-choice',
    options: [
      '$240$',
      '$160$',
      '$60$',
      '$15$'
    ],
    correctAnswer: 'A',
    explanation: 'Số hạng tổng quát trong khai triển là $T_{k+1} = C_6^k (x^2)^{6-k} (2x^{-1})^k = C_6^k 2^k x^{12-3k}$. Số hạng không chứa $x$ ứng với $12-3k = 0 \\Leftrightarrow k = 4$. Vậy số hạng đó là $C_6^4 \\cdot 2^4 = 15 \\cdot 16 = 240$.',
    difficulty: 'medium'
  }
];

// Seed initial analytical stats
export const DEFAULT_SESSIONS: Session[] = [
  { id: 's-1', subjectId: 'sub-calc', score: 8.5, totalQuestions: 10, correctAnswers: 8, timeSpent: 620, date: '2026-06-15', examId: 'ex-1' },
  { id: 's-2', subjectId: 'sub-stats', score: 6.0, totalQuestions: 10, correctAnswers: 6, timeSpent: 750, date: '2026-06-16' },
  { id: 's-3', subjectId: 'sub-integral', score: 9.0, totalQuestions: 10, correctAnswers: 9, timeSpent: 450, date: '2026-06-18' },
  { id: 's-4', subjectId: 'sub-calc', score: 4.0, totalQuestions: 5, correctAnswers: 2, timeSpent: 300, date: '2026-06-20', studentName: 'Nguyễn Văn Minh', studentClass: '12A1', examId: 'ex-1' },
  { id: 's-5', subjectId: 'sub-geom', score: 5.0, totalQuestions: 6, correctAnswers: 3, timeSpent: 400, date: '2026-06-21', studentName: 'Trần Thị Hoa', studentClass: '12A2' },
  { id: 's-6', subjectId: 'sub-calc', score: 10.0, totalQuestions: 10, correctAnswers: 10, timeSpent: 512, date: '2026-06-21', studentName: 'Phạm Đức Anh', studentClass: '12A1', examId: 'ex-1' }
];

export const INITIAL_PROGRESS: Progress = {
  totalAttempts: 6,
  averageScore: 7.08,
  streakDays: 4,
  weakTopics: ['Đại Số Tổ Hợp & Xác Suất', 'Hình Học Không Gian & Oxyz']
};

export const INITIAL_DATA: AppData = {
  subjects: DEFAULT_SUBJECTS,
  questions: DEFAULT_QUESTIONS,
  questionBanks: DEFAULT_BANKS,
  sessions: DEFAULT_SESSIONS,
  progress: INITIAL_PROGRESS,
  settings: {
    theme: 'light',
    soundEnabled: true,
    autoSave: true
  },
  laTexConversions: [
    {
      id: 'conv-1',
      rawText: 'Tích phân chạy từ 0 đến pi/2 của sin(x) dx là bằng 1',
      convertedLatex: '$\\int_{0}^{\\frac{\\pi}{2}} \\sin x \\, dx = 1$',
      date: '22/06/2026 10:15'
    }
  ],
  exams: [
    {
      id: 'ex-1',
      title: 'Đề ôn tập Khảo sát Hàm số (Mẫu phân hóa 10-6-4)',
      subjectId: 'sub-calc',
      questions: [
        DEFAULT_QUESTIONS[0],
        DEFAULT_QUESTIONS[1],
        DEFAULT_QUESTIONS[2],
        DEFAULT_QUESTIONS[3],
        DEFAULT_QUESTIONS[4]
      ],
      difficultyRatio: { easyCount: 3, mediumCount: 2, hardCount: 1 },
      duration: 15,
      createdAt: '2026-06-20T14:30:00Z'
    }
  ],
  studentClasses: []
};

/**
 * Recalculates statistics progress object based on state elements.
 */
export function recalculateProgress(sessions: Session[]): Progress {
  if (sessions.length === 0) {
    return { totalAttempts: 0, averageScore: 0, streakDays: 0, weakTopics: [] };
  }

  const totalAttempts = sessions.length;
  const sumScores = sessions.reduce((acc, curr) => acc + curr.score, 0);
  const averageScore = parseFloat((sumScores / totalAttempts).toFixed(2));

  // Determine weak topics: calculate subject performance
  const subjectScores: Record<string, { totalPoints: number; count: number; name: string }> = {};

  // Map sub-ids to names
  DEFAULT_SUBJECTS.forEach(sub => {
    subjectScores[sub.id] = { totalPoints: 0, count: 0, name: sub.name };
  });

  sessions.forEach(session => {
    if (subjectScores[session.subjectId]) {
      subjectScores[session.subjectId].totalPoints += session.score;
      subjectScores[session.subjectId].count += 1;
    }
  });

  const weakTopics: string[] = [];
  Object.values(subjectScores).forEach(stat => {
    if (stat.count > 0) {
      const avg = stat.totalPoints / stat.count;
      if (avg < 6.5) {
        weakTopics.push(stat.name);
      }
    }
  });

  return {
    totalAttempts,
    averageScore,
    streakDays: 4, // simulation
    weakTopics
  };
}

/**
 * Load state database from localStorage with fallback to default structures.
 */
export function getStoredData(): AppData {
  const serialized = localStorage.getItem(STORAGE_KEY);
  if (!serialized) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
    return INITIAL_DATA;
  }
  try {
    const data = JSON.parse(serialized);
    // Backward compatibility checks
    if (!data.lessons && !data.subjects) data.subjects = DEFAULT_SUBJECTS;
    if (!data.questionBanks) data.questionBanks = DEFAULT_BANKS;
    
    // Assign default bankId to existing questions if missing
    data.questions = (data.questions || []).map((q: Question) => 
      q.bankId ? q : { ...q, bankId: 'bank-default' }
    );
    
    if (!data.laTexConversions) data.laTexConversions = INITIAL_DATA.laTexConversions;
    if (!data.exams) data.exams = INITIAL_DATA.exams;
    if (!data.studentClasses) data.studentClasses = [];
    
    // Retroactively patch old dummy sessions to match the dummy exam
    if (data.sessions) {
      data.sessions = data.sessions.map((sess: Session) => {
        if (!sess.examId && sess.subjectId === 'sub-calc') {
          return { ...sess, examId: 'ex-1', examTitle: 'Đề ôn tập Khảo sát Hàm số (Mẫu phân hóa 10-6-4)' };
        }
        return sess;
      });
    }
    return data;
  } catch (err) {
    console.error('Lỗi phân tích cú pháp cấu trúc cơ sở dữ liệu lưu trữ:', err);
    return INITIAL_DATA;
  }
}

/**
 * Save configuration state to LocalStorage.
 */
export function saveStoredData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Export full JSON backup of data
 */
export function exportBackup(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Import backup validation and restoration
 */
export function importBackup(fileContent: string): AppData {
  try {
    const parsed = JSON.parse(fileContent);
    if (!parsed.subjects || !parsed.questions || !parsed.sessions) {
      throw new Error('Dữ liệu không đúng cấu trúc AppData hợp lệ.');
    }
    
    if (!parsed.questionBanks) parsed.questionBanks = DEFAULT_BANKS;
    parsed.questions = parsed.questions.map((q: Question) => 
      q.bankId ? q : { ...q, bankId: 'bank-default' }
    );

    // Update question counts in subjects accurately
    parsed.subjects = parsed.subjects.map((sub: Subject) => ({
      ...sub,
      questionsCount: parsed.questions.filter((q: Question) => q.subjectId === sub.id).length
    }));
    parsed.progress = recalculateProgress(parsed.sessions);
    saveStoredData(parsed);
    return parsed;
  } catch (err: any) {
    throw new Error('Tập tin sao lưu không đúng cấu trúc hoặc đã bị hỏng: ' + err.message);
  }
}
