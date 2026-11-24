import { ExamCV7991, Part1Question, Part2Question, Part3Question, Part2Statement } from '../types/pedagogy';

/**
 * Phân tích đề thi Markdown (hỗ trợ cả 2 định dạng:
 * 1. Mẫu chuẩn hệ thống: Bảng đáp án tách biệt sau dòng ---------------------------HẾT------------------------
 * 2. Mẫu rút gọn: Gạch chân đáp án đúng <u>A.</u>, <u>a)</u> và lời giải liền sau câu hỏi)
 * sang đối tượng dữ liệu cấu trúc ExamCV7991.
 */
export function parseExamMarkdownToCV7991(
  markdown: string,
  meta?: Partial<ExamCV7991>
): ExamCV7991 {
  // 1. Chuẩn hóa tiêu đề câu hỏi từ các thẻ Word rải rác:
  // Ví dụ: <b>Câu</b><b> </b><b>1.</b> hoặc <b>Câu </b><b>1</b><b>. </b> -> <b>Câu 1.</b>
  const normalizedText = normalizeExamHeadings(markdown || '');

  // Kiểm tra vị trí phân tách HẾT nếu có
  const hetMatch = normalizedText.match(/-{3,}\s*HẾT\s*-{3,}/i);
  let examBody = normalizedText;
  let answerSection = '';

  if (hetMatch && hetMatch.index !== undefined) {
    examBody = normalizedText.slice(0, hetMatch.index);
    answerSection = normalizedText.slice(hetMatch.index + hetMatch[0].length);
  }

  // Tách các phần PHẦN I, PHẦN II, PHẦN III
  const p1Index = examBody.search(/(?:#+|\*\*|<b>)?\s*PHẦN\s+I\b/i);
  const p2Index = examBody.search(/(?:#+|\*\*|<b>)?\s*PHẦN\s+II\b/i);
  const p3Index = examBody.search(/(?:#+|\*\*|<b>)?\s*PHẦN\s+III\b/i);

  const p1Text = p1Index !== -1 
    ? examBody.slice(p1Index, p2Index !== -1 ? p2Index : (p3Index !== -1 ? p3Index : undefined))
    : (p2Index === -1 && p3Index === -1 ? examBody : '');
  const p2Text = p2Index !== -1 
    ? examBody.slice(p2Index, p3Index !== -1 ? p3Index : undefined)
    : '';
  const p3Text = p3Index !== -1 
    ? examBody.slice(p3Index)
    : '';

  // 1. Phân tích Bảng đáp án ở cuối đề nếu có (Format 1 - Mẫu chuẩn hệ thống)
  const tableAnswersP1: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
  const tableAnswersP2: Record<number, Record<'a' | 'b' | 'c' | 'd', boolean>> = {};
  const tableAnswersP3: Record<number, string> = {};

  if (answerSection) {
    // Phân tích bảng Phần I: | Câu | 1 | 2 | ... | và | Chọn | D | A | ... |
    const p1TableSection = answerSection.split(/(?:PHẦN\s+II|PHẦN\s+2)/i)[0] || '';
    const p1Rows = p1TableSection.split('\n').filter(l => l.trim().startsWith('|'));
    if (p1Rows.length >= 2) {
      let qNums: number[] = [];
      let ansList: string[] = [];
      p1Rows.forEach(row => {
        const cells = row.split('|').map(c => c.trim()).filter(c => c && !c.includes('---'));
        if (cells.length > 0) {
          const first = cells[0].toLowerCase();
          if (first.includes('câu')) {
            qNums = cells.slice(1).map(c => parseInt(c.replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
          } else if (first.includes('chọn') || first.includes('đáp án')) {
            ansList = cells.slice(1);
          }
        }
      });
      qNums.forEach((qNum, idx) => {
        const a = (ansList[idx] || '').trim().toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(a)) {
          tableAnswersP1[qNum] = a as 'A' | 'B' | 'C' | 'D';
        }
      });
    }

    // Phân tích bảng Phần II: Cột Câu 1, Câu 2... và các hàng a) Đ, b) S...
    const p2TableSection = answerSection.search(/PHẦN\s+II/i) !== -1
      ? (answerSection.split(/PHẦN\s+II/i)[1] || '').split(/PHẦN\s+III/i)[0]
      : '';
    const p2Rows = p2TableSection.split('\n').filter(l => l.trim().startsWith('|'));
    if (p2Rows.length >= 2) {
      let qCols: number[] = [];
      p2Rows.forEach(row => {
        const cells = row.split('|').map(c => c.trim()).filter(c => c && !c.includes('---'));
        if (cells.length > 0) {
          const isHeader = cells.some(c => c.toLowerCase().includes('câu'));
          if (isHeader) {
            qCols = cells.map(c => parseInt(c.replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
            qCols.forEach(q => {
              if (!tableAnswersP2[q]) tableAnswersP2[q] = { a: false, b: false, c: false, d: false };
            });
          } else {
            // Hàng mệnh đề: a) Đ | a) Đ hoặc Đ | S
            cells.forEach((val, idx) => {
              const qNum = qCols[idx];
              if (!qNum) return;
              if (!tableAnswersP2[qNum]) tableAnswersP2[qNum] = { a: false, b: false, c: false, d: false };
              
              const matchSub = val.match(/([a-d])\)?\s*([ĐS])/i);
              if (matchSub) {
                const subKey = matchSub[1].toLowerCase() as 'a' | 'b' | 'c' | 'd';
                const isTrue = matchSub[2].toUpperCase() === 'Đ';
                tableAnswersP2[qNum][subKey] = isTrue;
              }
            });
          }
        }
      });
    }

    // Phân tích bảng Phần III: | Câu | 1 | 2 | ... | và | Chọn | 10 | 31 | ... |
    const p3TableSection = answerSection.search(/PHẦN\s+III/i) !== -1
      ? answerSection.split(/PHẦN\s+III/i)[1] || ''
      : '';
    const p3Rows = p3TableSection.split('\n').filter(l => l.trim().startsWith('|'));
    if (p3Rows.length >= 2) {
      let qNums: number[] = [];
      let ansList: string[] = [];
      p3Rows.forEach(row => {
        const cells = row.split('|').map(c => c.trim()).filter(c => c && !c.includes('---'));
        if (cells.length > 0) {
          const first = cells[0].toLowerCase();
          if (first.includes('câu')) {
            qNums = cells.slice(1).map(c => parseInt(c.replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
          } else if (first.includes('chọn') || first.includes('đáp số') || first.includes('đáp án')) {
            ansList = cells.slice(1);
          }
        }
      });
      qNums.forEach((qNum, idx) => {
        const a = (ansList[idx] || '').trim();
        if (a) {
          tableAnswersP3[qNum] = a;
        }
      });
    }
  }

  // 2. PARSE PHẦN I
  const part1Questions: Part1Question[] = [];
  const p1Blocks = splitIntoQuestionBlocks(p1Text);
  p1Blocks.forEach((block, idx) => {
    const qNum = block.number || (idx + 1);
    
    // Tách phương án và làm sạch stem để KHÔNG bao giờ bị trùng lặp phương án trong thân câu hỏi
    const parsedOpt = extractOptionsAndCleanStem(block.raw);

    // Lời giải nếu có
    const explanation = block.solution || (answerSection ? extractSolutionForQuestion(answerSection, 1, qNum) : '');

    const finalAnswer = parsedOpt.detectedAnswer || tableAnswersP1[qNum] || 'A';

    part1Questions.push({
      id: `p1_${qNum}`,
      number: qNum,
      cognitiveLevel: 'know',
      topic: meta?.subject || 'Toán học',
      content: parsedOpt.stem,
      options: parsedOpt.options,
      correctAnswer: finalAnswer,
      points: 0.25,
      explanation: explanation || `Chọn đáp án ${finalAnswer}.`
    });
  });

  // 3. PARSE PHẦN II
  const part2Questions: Part2Question[] = [];
  const p2Blocks = splitIntoQuestionBlocks(p2Text);
  p2Blocks.forEach((block, idx) => {
    const qNum = block.number || (idx + 1);
    const subResult = extractSubStatements(block.raw);

    const tableQ2 = tableAnswersP2[qNum] || { a: true, b: false, c: false, d: false };

    const statements: Part2Statement[] = subResult.statements.map(sub => {
      let isCorrect = sub.isCorrect;
      if (tableAnswersP2[qNum] && tableAnswersP2[qNum][sub.subId] !== undefined) {
        isCorrect = tableQ2[sub.subId];
      }
      return {
        subId: sub.subId,
        content: sub.content,
        isCorrect: isCorrect ?? false,
        explanation: sub.explanation || `Ý ${sub.subId}) là ${isCorrect ? 'Đúng' : 'Sai'}.`
      };
    });

    part2Questions.push({
      id: `p2_${qNum}`,
      number: qNum,
      cognitiveLevel: 'understand',
      topic: meta?.subject || 'Toán học',
      leadIn: subResult.leadIn,
      statements: statements.length === 4 ? statements : defaultStatements(),
      pointsTotal: 1.0
    });
  });

  // 4. PARSE PHẦN III
  const part3Questions: Part3Question[] = [];
  const p3Blocks = splitIntoQuestionBlocks(p3Text);
  p3Blocks.forEach((block, idx) => {
    const qNum = block.number || (idx + 1);

    // Tìm đáp án ngắn từ Format 2 "Đáp án: 5" hoặc Format 1 "*(Đáp số: 5)*" hoặc bảng tableAnswersP3
    let shortAns = '';
    const dapanMatch = block.raw.match(/(?:Đáp án|Đáp số)\s*:\s*([^\n\r*]+)/i);
    if (dapanMatch) {
      shortAns = dapanMatch[1].replace(/<[^>]+>/g, '').trim();
    } else if (tableAnswersP3[qNum]) {
      shortAns = tableAnswersP3[qNum];
    } else {
      shortAns = '0';
    }

    const explanation = block.solution || (answerSection ? extractSolutionForQuestion(answerSection, 3, qNum) : '');

    // Làm sạch thân câu hỏi phần 3: loại bỏ dòng Đáp án và Lời giải
    let cleanStem = cleanQuestionContent(block.content)
      .replace(/(?:Lời giải|Hướng dẫn giải)[\s\S]*$/i, '')
      .replace(/(?:Đáp án|Đáp số)\s*:\s*[^\n\r*]+/i, '')
      .trim();

    part3Questions.push({
      id: `p3_${qNum}`,
      number: qNum,
      cognitiveLevel: 'understand',
      topic: meta?.subject || 'Toán học',
      content: cleanStem,
      correctAnswerShort: shortAns,
      points: 0.5,
      explanation: explanation || `Đáp số là ${shortAns}.`
    });
  });

  return {
    examTitle: meta?.examTitle || 'ĐỀ KIỂM TRA ĐÁNH GIÁ ĐỊNH KÌ',
    term: meta?.term || 'Giữa Học kỳ 1',
    academicYear: meta?.academicYear || '2024 - 2025',
    grade: meta?.grade || '12',
    subject: meta?.subject || 'Toán học',
    durationMinutes: meta?.durationMinutes || 90,
    code: meta?.code || '101',
    matrixRows: meta?.matrixRows || [],
    specifications: meta?.specifications || [],
    part1Questions: part1Questions.length > 0 ? part1Questions : [],
    part2Questions: part2Questions.length > 0 ? part2Questions : [],
    part3Questions: part3Questions.length > 0 ? part3Questions : [],
    part4Questions: meta?.part4Questions || []
  };
}

/**
 * Xuất đề thi ra định dạng Mẫu chuẩn hệ thống (Bảng đáp án tách rời cuối đề sau dòng HẾT)
 */
export function exportExamCV7991ToTableMarkdown(exam: ExamCV7991): string {
  const lines: string[] = [];

  // PHẦN I
  lines.push('PHẦN I. Câu trắc nghiệm một đáp án đúng (Thí sinh trả lời từ Câu 1 đến Câu 12. Mỗi câu hỏi thí sinh chỉ chọn một phương án).');
  lines.push('');
  exam.part1Questions.forEach(q => {
    lines.push(`<b>Câu ${q.number}.</b> ${q.content}`);
    lines.push('');
    lines.push(`\tA. ${cleanUnderline(q.options.A)}\tB. ${cleanUnderline(q.options.B)}`);
    lines.push(`\tC. ${cleanUnderline(q.options.C)}\tD. ${cleanUnderline(q.options.D)}`);
    lines.push('');
  });

  // PHẦN II
  lines.push('PHẦN II. Câu trắc nghiệm đúng sai. (Thí sinh trả lời từ Câu 1 đến Câu 4. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai).');
  lines.push('');
  exam.part2Questions.forEach(q => {
    lines.push(`<b>Câu ${q.number}.</b> ${q.leadIn}`);
    q.statements.forEach(st => {
      lines.push(`${st.subId}) ${cleanUnderline(st.content)}`);
    });
    lines.push('');
  });

  // PHẦN III
  lines.push('PHẦN III. Câu trắc nghiệm trả lời ngắn. (Thí sinh trả lời từ Câu 1 đến Câu 6).');
  lines.push('');
  exam.part3Questions.forEach(q => {
    lines.push(`<b>Câu ${q.number}.</b> ${q.content}`);
    lines.push('');
  });

  // DÒNG PHÂN CÁCH BẮT BUỘC
  lines.push('---------------------------HẾT------------------------');
  lines.push('');

  // BẢNG ĐÁP ÁN & LỜI GIẢI PHẦN I
  lines.push('PHẦN I. Câu trắc nghiệm một đáp án đúng');
  const p1Header = ['| Câu  ', ...exam.part1Questions.map(q => `| ${q.number}  `), '|'].join('');
  const p1Divider = ['|:---:', ...exam.part1Questions.map(() => '|:---:'), '|'].join('');
  const p1Row = ['| Chọn ', ...exam.part1Questions.map(q => `| ${q.correctAnswer}  `), '|'].join('');
  lines.push(p1Header);
  lines.push(p1Divider);
  lines.push(p1Row);
  lines.push('');
  lines.push('Lời giải');
  exam.part1Questions.forEach(q => {
    lines.push(`Câu ${q.number}: ${q.correctAnswer} đúng vì ${q.explanation || 'theo lý thuyết'}.`);
  });
  lines.push('');

  // BẢNG ĐÁP ÁN & LỜI GIẢI PHẦN II
  lines.push('PHẦN II. Câu trắc nghiệm đúng sai.');
  const p2Header = ['| Ý    ', ...exam.part2Questions.map(q => `| Câu ${q.number} `), '|'].join('');
  const p2Divider = ['|:---:', ...exam.part2Questions.map(() => '|:---:'), '|'].join('');
  lines.push(p2Header);
  lines.push(p2Divider);

  ['a', 'b', 'c', 'd'].forEach(subId => {
    const rowVals = exam.part2Questions.map(q => {
      const st = q.statements.find(s => s.subId === subId);
      return st?.isCorrect ? `${subId}) Đ` : `${subId}) S`;
    });
    lines.push([`| ${subId})  `, ...rowVals.map(v => `| ${v}   `), '|'].join(''));
  });
  lines.push('');
  lines.push('Lời giải');
  exam.part2Questions.forEach(q => {
    lines.push(`Câu ${q.number}:`);
    q.statements.forEach(st => {
      lines.push(`${st.subId}) ${st.isCorrect ? 'Đúng' : 'Sai'} vì ${st.explanation || 'theo lý thuyết'}.`);
    });
  });
  lines.push('');

  // BẢNG ĐÁP ÁN & LỜI GIẢI PHẦN III
  lines.push('PHẦN III. Câu trắc nghiệm trả lời ngắn.');
  const p3Header = ['| Câu  ', ...exam.part3Questions.map(q => `| ${q.number}  `), '|'].join('');
  const p3Divider = ['|:---:', ...exam.part3Questions.map(() => '|:---:'), '|'].join('');
  const p3Row = ['| Chọn ', ...exam.part3Questions.map(q => `| ${q.correctAnswerShort}  `), '|'].join('');
  lines.push(p3Header);
  lines.push(p3Divider);
  lines.push(p3Row);
  lines.push('');
  lines.push('Lời giải');
  exam.part3Questions.forEach(q => {
    lines.push(`Câu ${q.number}: Ta có ${q.explanation || `đáp số là ${q.correctAnswerShort}`}.`);
  });
  lines.push('');

  return lines.join('\n');
}

/**
 * Xuất đề thi ra định dạng Mẫu đề rút gọn (Gạch chân đáp án đúng <u>A.</u>, <u>a)</u> và Lời giải liền câu)
 */
export function exportExamCV7991ToInlineMarkdown(exam: ExamCV7991): string {
  const lines: string[] = [];

  // PHẦN I
  lines.push('PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn. Thí sinh trả lời từ câu 1 đến câu 12. Mỗi câu hỏi thí sinh chỉ chọn một phương án.');
  lines.push('');
  exam.part1Questions.forEach(q => {
    lines.push(`<b>Câu ${q.number}.</b> ${q.content}`);
    lines.push('');

    const optA = q.correctAnswer === 'A' ? `<u>A.</u> ${q.options.A}` : `A. ${q.options.A}`;
    const optB = q.correctAnswer === 'B' ? `<u>B.</u> ${q.options.B}` : `B. ${q.options.B}`;
    const optC = q.correctAnswer === 'C' ? `<u>C.</u> ${q.options.C}` : `C. ${q.options.C}`;
    const optD = q.correctAnswer === 'D' ? `<u>D.</u> ${q.options.D}` : `D. ${q.options.D}`;

    lines.push(`\t${optA}\t${optB}`);
    lines.push(`\t${optC}\t${optD}`);
    lines.push('');
    lines.push('Lời giải:');
    lines.push(`Mệnh đề ${q.correctAnswer} đúng vì ${q.explanation || 'theo kiến thức cơ bản'}.`);
    lines.push('');
  });

  // PHẦN II
  lines.push('PHẦN II. Câu trắc nghiệm đúng sai. Thí sinh trả lời từ câu 1 đến câu 4. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.');
  lines.push('');
  exam.part2Questions.forEach(q => {
    lines.push(`<b>Câu ${q.number}.</b> ${q.leadIn}`);
    q.statements.forEach(st => {
      const prefix = st.isCorrect ? `<u>${st.subId})</u>` : `${st.subId})`;
      lines.push(`${prefix} ${st.content}`);
    });
    lines.push('');
    lines.push('Lời giải:');
    q.statements.forEach(st => {
      lines.push(`${st.subId.toUpperCase()} ${st.isCorrect ? 'đúng' : 'sai'} vì ${st.explanation || 'theo lý thuyết'}.`);
    });
    lines.push('');
  });

  // PHẦN III
  lines.push('PHẦN III. Câu trắc nghiệm trả lời ngắn. Thí sinh trả lời từ câu 1 đến câu 6.');
  lines.push('');
  exam.part3Questions.forEach(q => {
    lines.push(`<b>Câu ${q.number}.</b> ${q.content}`);
    lines.push('');
    lines.push('Lời giải');
    lines.push(`Đáp án: ${q.correctAnswerShort}`);
    lines.push('Giải thích:');
    lines.push(`Ta có như sau: ${q.explanation || 'kết quả tính toán'}.`);
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Chuyển đổi qua lại linh hoạt giữa 2 định dạng
 */
export function toggleExamMarkdownFormat(currentMarkdown: string): {
  newMarkdown: string;
  format: 'table' | 'inline';
} {
  const isTable = currentMarkdown.includes('---------------------------HẾT------------------------') ||
                  currentMarkdown.includes('PHẦN I. Câu trắc nghiệm một đáp án đúng \n| Câu');

  const parsed = parseExamMarkdownToCV7991(currentMarkdown);
  if (isTable) {
    return {
      newMarkdown: exportExamCV7991ToInlineMarkdown(parsed),
      format: 'inline'
    };
  } else {
    return {
      newMarkdown: exportExamCV7991ToTableMarkdown(parsed),
      format: 'table'
    };
  }
}

// ======================= HELPER FUNCTIONS =======================

export function cleanUnderline(text: string): string {
  return (text || '').replace(/<\/?u>/gi, '').trim();
}

export function cleanQuestionContent(content: string): string {
  return (content || '')
    .replace(/^(?:#+|\*\*|<b>)?\s*(?:Câu|Bài)\s+\d+[\.:]?\s*(?:<\/b>|\*\*)?/i, '')
    .trim();
}

/**
 * Chuẩn hóa các thẻ HTML chia rẽ trong đề thi Word:
 * Ví dụ: <b>Câu</b><b> </b><b>1.</b> -> <b>Câu 1.</b>
 */
export function normalizeExamHeadings(text: string): string {
  return (text || '')
    .replace(/<b\b[^>]*>\s*(?:Câu|Bài)\s*<\/b>(?:\s*<b\b[^>]*>\s*<\/b>)*\s*<b\b[^>]*>\s*(\d+)[\.:]?\s*<\/b>/gi, '\n\n<b>Câu $1.</b> ')
    .replace(/(?:^|\n)\s*(?:<[^>]+>)*\s*(?:Câu|Bài)\s+(\d+)[\.:]\s*(?:<\/[^>]+>)*/gi, '\n\n<b>Câu $1.</b> ');
}

export interface QuestionBlock {
  number: number;
  content: string;
  solution?: string;
  raw: string;
}

export function splitIntoQuestionBlocks(partText: string): QuestionBlock[] {
  const normalized = normalizeExamHeadings(partText);
  const regex = /<b>Câu\s+(\d+)\.<\/b>/gi;
  const blocks: QuestionBlock[] = [];

  let match: RegExpExecArray | null;
  let lastNum: number | null = null;
  let lastContentStart = 0;

  while ((match = regex.exec(normalized)) !== null) {
    if (lastNum !== null) {
      const rawBlock = normalized.substring(lastContentStart, match.index).trim();
      if (rawBlock) {
        blocks.push(buildQuestionBlock(lastNum, rawBlock));
      }
    }
    lastNum = parseInt(match[1], 10);
    lastContentStart = match.index + match[0].length;
  }

  if (lastNum !== null) {
    const rawBlock = normalized.substring(lastContentStart).trim();
    if (rawBlock) {
      blocks.push(buildQuestionBlock(lastNum, rawBlock));
    }
  }

  return blocks;
}

function buildQuestionBlock(num: number, raw: string): QuestionBlock {
  const solMatch = raw.search(/(?:Lời giải|Hướng dẫn giải)\s*[\:\.]?/i);
  if (solMatch !== -1) {
    const contentPart = raw.slice(0, solMatch).trim();
    const solPart = raw.slice(solMatch).replace(/(?:Lời giải|Hướng dẫn giải)\s*[\:\.]?/i, '').trim();
    return {
      number: num,
      content: contentPart,
      solution: solPart,
      raw
    };
  }
  return {
    number: num,
    content: raw,
    raw
  };
}

/**
 * Trích xuất 4 phương án A, B, C, D và làm sạch thân câu hỏi (Stem),
 * đảm bảo không bao giờ bị lặp lại các phương án trong thân câu hỏi.
 */
export function extractOptionsAndCleanStem(rawText: string): {
  stem: string;
  options: { A: string; B: string; C: string; D: string };
  detectedAnswer: 'A' | 'B' | 'C' | 'D' | null;
} {
  const text = (rawText || '').trim();

  // 1. Dò tìm xem phương án nào có gạch chân <u>A</u> hoặc <u>A.</u>
  let detectedAnswer: 'A' | 'B' | 'C' | 'D' | null = null;
  const underMatch = text.match(/<u\b[^>]*>\s*([A-D])(?:\.|\:|\))?\s*<\/u>/i);
  if (underMatch) {
    detectedAnswer = underMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
  }

  // 2. Tìm tất cả các nhãn phương án A, B, C, D độc lập
  const markerRegex = /(?:<[^>]+>|\s)*(<u>)?\b([A-D])\b(?:<\/u>)?(?:<[^>]+>|\s)*[\.:\)](?:<[^>]+>|\s)*/g;
  const matches: { key: 'A' | 'B' | 'C' | 'D'; start: number; end: number; isUnderlined: boolean }[] = [];
  let m: RegExpExecArray | null;

  while ((m = markerRegex.exec(text)) !== null) {
    const before = m.index > 0 ? text[m.index - 1] : '\n';
    if (/[a-zA-Z0-9_\$]/.test(before)) continue;

    matches.push({
      key: m[2].toUpperCase() as 'A' | 'B' | 'C' | 'D',
      start: m.index,
      end: m.index + m[0].length,
      isUnderlined: !!m[1] || m[0].includes('<u>')
    });
  }

  const aMatch = matches.find(x => x.key === 'A');
  const bMatch = matches.find(x => x.key === 'B' && (!aMatch || x.start > aMatch.start));
  const cMatch = matches.find(x => x.key === 'C' && (!bMatch || x.start > bMatch.start));
  const dMatch = matches.find(x => x.key === 'D' && (!cMatch || x.start > cMatch.start));

  if (aMatch && bMatch && cMatch && dMatch) {
    let stem = text.substring(0, aMatch.start).trim();
    stem = cleanQuestionContent(stem);

    const cleanOpt = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const optA = cleanOpt(text.substring(aMatch.end, bMatch.start));
    const optB = cleanOpt(text.substring(bMatch.end, cMatch.start));
    const optC = cleanOpt(text.substring(cMatch.end, dMatch.start));
    const optD = cleanOpt(text.substring(dMatch.end));

    if (!detectedAnswer) {
      const uMatchInOpts = [aMatch, bMatch, cMatch, dMatch].find(x => x.isUnderlined);
      if (uMatchInOpts) {
        detectedAnswer = uMatchInOpts.key;
      }
    }

    return {
      stem,
      options: { A: optA, B: optB, C: optC, D: optD },
      detectedAnswer
    };
  }

  // Dự phòng nếu không đủ 4 phương án chuẩn
  return {
    stem: cleanQuestionContent(text),
    options: { A: '', B: '', C: '', D: '' },
    detectedAnswer: detectedAnswer || 'A'
  };
}

export function extractSubStatements(text: string): {
  leadIn: string;
  statements: Part2Statement[];
} {
  const stmtRegex = /(?:<[^>]+>|\s)*(<u>)?\b([a-d])\b(?:<\/u>)?(?:<[^>]+>|\s)*\)(?:<[^>]+>|\s)*/gi;
  const matches: { subId: 'a' | 'b' | 'c' | 'd'; start: number; end: number; isUnderlined: boolean }[] = [];
  let m: RegExpExecArray | null;

  while ((m = stmtRegex.exec(text)) !== null) {
    matches.push({
      subId: m[2].toLowerCase() as 'a' | 'b' | 'c' | 'd',
      start: m.index,
      end: m.index + m[0].length,
      isUnderlined: !!m[1] || m[0].includes('<u>')
    });
  }

  const aM = matches.find(x => x.subId === 'a');
  const bM = matches.find(x => x.subId === 'b');
  const cM = matches.find(x => x.subId === 'c');
  const dM = matches.find(x => x.subId === 'd');

  if (aM && bM && cM && dM) {
    const leadIn = cleanQuestionContent(text.substring(0, aM.start)).trim();
    const cleanStmt = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    return {
      leadIn,
      statements: [
        { subId: 'a', content: cleanStmt(text.substring(aM.end, bM.start)), isCorrect: aM.isUnderlined, explanation: '' },
        { subId: 'b', content: cleanStmt(text.substring(bM.end, cM.start)), isCorrect: bM.isUnderlined, explanation: '' },
        { subId: 'c', content: cleanStmt(text.substring(cM.end, dM.start)), isCorrect: cM.isUnderlined, explanation: '' },
        { subId: 'd', content: cleanStmt(text.substring(dM.end)), isCorrect: dM.isUnderlined, explanation: '' }
      ]
    };
  }

  return {
    leadIn: cleanQuestionContent(text),
    statements: defaultStatements()
  };
}

function extractSolutionForQuestion(answerSection: string, part: number, qNum: number): string {
  const reg = new RegExp(`(?:Câu|Bài)\\s+${qNum}\\s*[\:\.]([^\\n\\r]+(?:\\n(?!Câu|Bài|PHẦN|\\|)[^\\n\\r]+)*)`, 'i');
  const match = answerSection.match(reg);
  return match ? match[1].trim() : '';
}

function defaultStatements(): Part2Statement[] {
  return [
    { subId: 'a', content: 'Mệnh đề a', isCorrect: true, explanation: 'Đúng theo lý thuyết' },
    { subId: 'b', content: 'Mệnh đề b', isCorrect: false, explanation: 'Sai theo lý thuyết' },
    { subId: 'c', content: 'Mệnh đề c', isCorrect: true, explanation: 'Đúng theo lý thuyết' },
    { subId: 'd', content: 'Mệnh đề d', isCorrect: false, explanation: 'Sai theo lý thuyết' }
  ];
}
