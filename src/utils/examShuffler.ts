import { ExamCV7991, Part1Question, Part2Question, Part3Question } from '../types/pedagogy';

export interface ShuffledExamPackage {
  originalExam: ExamCV7991;
  exams: ExamCV7991[];
  masterAnswerKey: {
    codes: string[];
    part1: {
      questionNumber: number;
      answers: Record<string, string>; // { "101": "A", "102": "C", ... }
    }[];
    part2: {
      questionNumber: number;
      subStatement: string; // 'a', 'b', 'c', 'd'
      answers: Record<string, 'Đ' | 'S'>;
    }[];
    part3: {
      questionNumber: number;
      answers: Record<string, string>;
    }[];
  };
}

export interface ShuffleOptions {
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  lockFixedOptions?: boolean; // Khóa phương án "Tất cả đều đúng / Cả A và B..." chuẩn McMIX
  shufflePart2SubItems?: boolean;
}

export const isFixedOption = (text: string): boolean => {
  const t = (text || '').toLowerCase().trim();
  return (
    t.includes('cả a và b') ||
    t.includes('cả a, b') ||
    t.includes('cả a,b') ||
    t.includes('cả 3') ||
    t.includes('tất cả đều') ||
    t.includes('tất cả các') ||
    t.includes('tất cả đáp án') ||
    t.includes('tất cả phương án') ||
    t.includes('không có đáp án nào') ||
    t.includes('không có câu nào') ||
    t.includes('không câu nào') ||
    t.includes('cả a, b, c') ||
    t.includes('a và b đều') ||
    t.includes('a, b đều')
  );
};

// Hàm hoán vị ngẫu nhiên có kiểm soát (Fisher-Yates)
function shuffleArray<T>(array: T[], seed: number): T[] {
  const arr = [...array];
  let m = arr.length;
  let s = seed;
  while (m) {
    s = (s * 9301 + 49297) % 233280;
    const i = Math.floor((s / 233280) * m--);
    [arr[m], arr[i]] = [arr[i], arr[m]];
  }
  return arr;
}

/**
 * Trộn một đề thi thành nhiều mã đề (mặc định: 101, 102, 103, 104)
 * Tích hợp công nghệ khóa phương án chuẩn McMIX
 */
export function shuffleExamToMultipleCodes(
  baseExam: ExamCV7991,
  targetCodes: string[] = ['101', '102', '103', '104'],
  options: ShuffleOptions = {}
): ShuffledExamPackage {
  const {
    shuffleQuestions = true,
    shuffleOptions = true,
    lockFixedOptions = true,
    shufflePart2SubItems = true
  } = options;

  const resultExams: ExamCV7991[] = [];

  targetCodes.forEach((code, codeIdx) => {
    // Mã đầu tiên (thường là 101) giữ nguyên vị trí gốc để đối chiếu, các mã sau trộn ngẫu nhiên
    const seed = (codeIdx + 1) * 7919 + parseInt(code.replace(/\D/g, '') || '1', 10);

    // 1. Trộn Phần I (Trắc nghiệm nhiều lựa chọn)
    let shuffledP1: Part1Question[] = [];
    if (codeIdx === 0) {
      // Giữ nguyên câu gốc cho mã đầu tiên
      shuffledP1 = baseExam.part1Questions.map((q, idx) => ({ ...q, number: idx + 1 }));
    } else {
      // Đảo thứ tự câu hỏi
      const questionsShuffled = shuffleQuestions 
        ? shuffleArray(baseExam.part1Questions, seed) 
        : [...baseExam.part1Questions];

      shuffledP1 = questionsShuffled.map((q, qIndex) => {
        if (!shuffleOptions) {
          return {
            ...q,
            id: `${code}_p1_${qIndex + 1}`,
            number: qIndex + 1
          };
        }

        // Đảo thứ tự 4 đáp án A, B, C, D
        const originalEntries: { key: 'A' | 'B' | 'C' | 'D'; text: string; isCorrect: boolean }[] = [
          { key: 'A', text: q.options.A, isCorrect: q.correctAnswer === 'A' },
          { key: 'B', text: q.options.B, isCorrect: q.correctAnswer === 'B' },
          { key: 'C', text: q.options.C, isCorrect: q.correctAnswer === 'C' },
          { key: 'D', text: q.options.D, isCorrect: q.correctAnswer === 'D' },
        ];

        // Chuẩn McMIX: Nếu phương án D là phương án cố định, không đảo D
        const isDFixed = lockFixedOptions && isFixedOption(q.options.D);
        let shuffledEntries: typeof originalEntries;

        if (isDFixed) {
          const abcEntries = originalEntries.slice(0, 3);
          const shuffledAbc = shuffleArray(abcEntries, seed + qIndex * 37);
          shuffledEntries = [...shuffledAbc, originalEntries[3]];
        } else {
          shuffledEntries = shuffleArray(originalEntries, seed + qIndex * 37);
        }

        const keys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
        
        let newCorrectAnswer: 'A' | 'B' | 'C' | 'D' = 'A';
        const newOptions: Record<'A' | 'B' | 'C' | 'D', string> = { A: '', B: '', C: '', D: '' };

        keys.forEach((k, idx) => {
          newOptions[k] = shuffledEntries[idx].text;
          if (shuffledEntries[idx].isCorrect) {
            newCorrectAnswer = k;
          }
        });

        return {
          ...q,
          id: `${code}_p1_${qIndex + 1}`,
          number: qIndex + 1,
          options: newOptions,
          correctAnswer: newCorrectAnswer,
        };
      });
    }

    // 2. Trộn Phần II (Trắc nghiệm Đúng - Sai)
    let shuffledP2: Part2Question[] = [];
    if (codeIdx === 0) {
      shuffledP2 = baseExam.part2Questions.map((q, idx) => ({ ...q, number: idx + 1 }));
    } else {
      const p2Shuffled = shuffleQuestions 
        ? shuffleArray(baseExam.part2Questions, seed + 101) 
        : [...baseExam.part2Questions];

      shuffledP2 = p2Shuffled.map((q, qIndex) => {
        // Đảo thứ tự các mệnh đề con a, b, c, d
        const stShuffled = shufflePart2SubItems 
          ? shuffleArray(q.statements, seed + qIndex * 53) 
          : [...q.statements];
        const subIds: ('a' | 'b' | 'c' | 'd')[] = ['a', 'b', 'c', 'd'];
        const newStatements = stShuffled.map((st, sIdx) => ({
          ...st,
          subId: subIds[sIdx]
        }));

        return {
          ...q,
          id: `${code}_p2_${qIndex + 1}`,
          number: qIndex + 1,
          statements: newStatements
        };
      });
    }

    // 3. Trộn Phần III (Trả lời ngắn)
    let shuffledP3: Part3Question[] = [];
    if (codeIdx === 0) {
      shuffledP3 = baseExam.part3Questions.map((q, idx) => ({ ...q, number: idx + 1 }));
    } else {
      const p3Shuffled = shuffleQuestions 
        ? shuffleArray(baseExam.part3Questions, seed + 203) 
        : [...baseExam.part3Questions];

      shuffledP3 = p3Shuffled.map((q, qIndex) => ({
        ...q,
        id: `${code}_p3_${qIndex + 1}`,
        number: qIndex + 1
      }));
    }

    // 4. Phần IV (Tự luận): Giữ nguyên thứ tự và điểm
    const examCopy: ExamCV7991 = {
      ...baseExam,
      code,
      part1Questions: shuffledP1,
      part2Questions: shuffledP2,
      part3Questions: shuffledP3,
      part4Questions: baseExam.part4Questions.map((q, idx) => ({ ...q, number: idx + 1 }))
    };

    resultExams.push(examCopy);
  });

  // TỔNG HỢP MA TRẬN ĐÁP ÁN SOI ĐỀ
  const maxP1 = Math.max(...resultExams.map(e => e.part1Questions.length), 0);
  const part1Matrix = Array.from({ length: maxP1 }, (_, i) => {
    const qNum = i + 1;
    const answers: Record<string, string> = {};
    resultExams.forEach(e => {
      answers[e.code] = e.part1Questions[i]?.correctAnswer || '-';
    });
    return { questionNumber: qNum, answers };
  });

  const part2Matrix: { questionNumber: number; subStatement: string; answers: Record<string, 'Đ' | 'S'> }[] = [];
  const maxP2 = Math.max(...resultExams.map(e => e.part2Questions.length), 0);
  for (let qIdx = 0; qIdx < maxP2; qIdx++) {
    const subKeys = ['a', 'b', 'c', 'd'];
    subKeys.forEach((subKey, sIdx) => {
      const answers: Record<string, 'Đ' | 'S'> = {};
      resultExams.forEach(e => {
        const isCorr = e.part2Questions[qIdx]?.statements[sIdx]?.isCorrect;
        answers[e.code] = isCorr ? 'Đ' : 'S';
      });
      part2Matrix.push({
        questionNumber: qIdx + 1,
        subStatement: subKey,
        answers
      });
    });
  }

  const maxP3 = Math.max(...resultExams.map(e => e.part3Questions.length), 0);
  const part3Matrix = Array.from({ length: maxP3 }, (_, i) => {
    const qNum = i + 1;
    const answers: Record<string, string> = {};
    resultExams.forEach(e => {
      answers[e.code] = e.part3Questions[i]?.correctAnswerShort || '-';
    });
    return { questionNumber: qNum, answers };
  });

  return {
    originalExam: baseExam,
    exams: resultExams,
    masterAnswerKey: {
      codes: targetCodes,
      part1: part1Matrix,
      part2: part2Matrix,
      part3: part3Matrix
    }
  };
}
