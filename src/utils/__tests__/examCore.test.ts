import { describe, it, expect } from 'vitest';
import { validateExamAgainstMatrix } from '../examValidator';
import { parseExamMarkdownToCV7991 } from '../examFormatConverter';
import { isNonRetryableError, buildModelPool } from '../../server/geminiService';
import { renderMathHtml } from '../../components/MathRenderer';
import { formatMathForWord } from '../exportWord';
import { cleanMathSymbols } from '../docxExamBuilder';
import { normalizeMathFormula, normalizeMarkdownMathDelimitersAndOperators } from '../mathNormalizer';
import { SAMPLES } from '../../data/sampleCurriculum';
import { ExamCV7991 } from '../../types/pedagogy';

describe('Exam Validator (CV 7991)', () => {
  it('validates a standard 10.0pt sample exam with matching matrix', () => {
    const sampleExam = SAMPLES[0].exam;
    const report = validateExamAgainstMatrix(sampleExam);
    expect(report.totalPoints).toBe(10);
    expect(report.isTotalTen).toBe(true);
    expect(report.warnings).toHaveLength(0);
  });

  it('detects total points mismatch and matrix count mismatch', () => {
    const brokenExam: ExamCV7991 = {
      ...SAMPLES[0].exam,
      part1Questions: SAMPLES[0].exam.part1Questions.slice(0, 2), // chỉ còn 2 câu thay vì 12
    };
    const report = validateExamAgainstMatrix(brokenExam);
    expect(report.isTotalTen).toBe(false);
    expect(report.warnings.length).toBeGreaterThanOrEqual(2);
    expect(report.warnings.some((w) => w.includes('Tổng điểm hiện tại'))).toBe(true);
    expect(report.warnings.some((w) => w.includes('Phần I'))).toBe(true);
  });
});

describe('Exam Format Converter', () => {
  it('parses markdown exam with table answer key into ExamCV7991', () => {
    const md = `
### PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn
<b>Câu 1.</b> Tính đạo hàm của $y = x^2$.
A. $2x$
B. $x$
C. $x^2$
D. $2$

### PHẦN II. Câu trắc nghiệm đúng sai
<b>Câu 1.</b> Cho hàm số $f(x) = x^2 - 1$.
a) $f(0) = -1$.
b) $f(1) = 0$.
c) $f'(x) = 2x$.
d) Hàm số đồng biến trên $\\mathbb{R}$.

### PHẦN III. Câu trắc nghiệm trả lời ngắn
<b>Câu 1.</b> Giá trị nhỏ nhất của $x^2 + 3$ là bao nhiêu?

---------------------------HẾT------------------------

PHẦN I. Câu trắc nghiệm một đáp án đúng
| Câu | 1 |
| Chọn | A |

PHẦN II. Câu trắc nghiệm đúng sai.
| Câu 1 |
| a) Đ |
| b) Đ |
| c) Đ |
| d) S |

PHẦN III. Câu trắc nghiệm trả lời ngắn.
| Câu | 1 |
| Chọn | 3 |
`;
    const parsed = parseExamMarkdownToCV7991(md, { examTitle: 'Đề Test' });
    expect(parsed.examTitle).toBe('Đề Test');
    expect(parsed.part1Questions).toHaveLength(1);
    expect(parsed.part1Questions[0].correctAnswer).toBe('A');
    expect(parsed.part2Questions).toHaveLength(1);
    expect(parsed.part2Questions[0].statements.map((s) => s.isCorrect)).toEqual([true, true, true, false]);
    expect(parsed.part3Questions).toHaveLength(1);
    expect(parsed.part3Questions[0].correctAnswerShort).toBe('3');
  });
});

describe('Gemini Service Helpers', () => {
  it('classifies 401/403/invalid key as non-retryable', () => {
    expect(isNonRetryableError({ status: 401, message: 'Unauthorized' })).toBe(true);
    expect(isNonRetryableError(new Error('API_KEY_INVALID'))).toBe(true);
    expect(isNonRetryableError({ status: 429, message: 'Rate limit exceeded' })).toBe(false);
  });

  it('builds deduplicated model pool with requested model first', () => {
    const pool = buildModelPool('gemini-2.5-flash', 'gemini-3-flash-preview');
    expect(pool[0]).toBe('gemini-3-flash-preview');
    expect(pool).toContain('gemini-2.5-flash');
    expect(new Set(pool).size).toBe(pool.length);
  });
});

describe('Not-Equal Sign Normalization (/= -> ≠)', () => {
  it('normalizes all slash-equals and Unicode variants to \\neq', () => {
    const variants = [
      'a /= 0',
      'a / = 0',
      'a / \\, = 0',
      'a \\;= 0', // control check below
      'a \\/= 0',
      'a \u2215= 0',
      'a \u2044= 0',
      'a =\u0338 0',
      'a \\not = 0',
      'a {/}= 0',
      'a \\text{/}= 0',
      'a \\mathrel{/}= 0',
    ];
    expect(normalizeMathFormula(variants[0])).toBe('a \\neq  0');
    expect(normalizeMathFormula(variants[1])).toBe('a \\neq  0');
    expect(normalizeMathFormula(variants[2])).toBe('a \\neq  0');
    expect(normalizeMathFormula(variants[4])).toBe('a \\neq  0');
    expect(normalizeMathFormula(variants[5])).toBe('a \\neq  0');
    expect(normalizeMathFormula(variants[6])).toBe('a \\neq  0');
    expect(normalizeMathFormula(variants[7])).toBe('a \\neq  0');
    expect(normalizeMathFormula(variants[8])).toBe('a \\neq  0');
    expect(normalizeMathFormula(variants[9])).toBe('a \\neq  0');
    expect(normalizeMathFormula(variants[10])).toBe('a \\neq  0');
    expect(normalizeMathFormula(variants[11])).toBe('a \\neq  0');
    expect(normalizeMathFormula('x/2 = 0')).toBe('x/2 = 0');

    const md = normalizeMarkdownMathDelimitersAndOperators('$y = ax^3 + bx^2 + cx + d (a \\; / \\, = 0)$');
    expect(md).toContain('\\neq');
    expect(md).not.toContain('/ =');
  });

  it('converts /= and / = to \\neq in renderMathHtml (KaTeX)', () => {
    const html = renderMathHtml('$(a /= 0)$');
    expect(html).toContain('≠');
    expect(html).not.toContain('/=');

    const htmlSpaced = renderMathHtml('$(a / = 0)$');
    expect(htmlSpaced).toContain('≠');
    expect(htmlSpaced).not.toContain('/ =');
  });

  it('converts /= to ≠ in formatMathForWord (MathML) and cleanMathSymbols', () => {
    const wordHtml = formatMathForWord('$(a /= 0)$');
    expect(wordHtml).toContain('≠');
    expect(wordHtml).not.toContain('/=');
    expect(cleanMathSymbols('a /= 0')).toBe('a ≠ 0');
    expect(cleanMathSymbols('a \\ne 0')).toBe('a ≠ 0');
  });
});
