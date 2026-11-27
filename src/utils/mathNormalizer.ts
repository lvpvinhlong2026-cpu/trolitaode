/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Chuẩn hóa các biến thể của dấu khác (≠) trong biểu thức LaTeX/Math
 * sang `\neq ` chuẩn để KaTeX và MathML hiển thị đồng nhất.
 *
 * Hỗ trợ:
 * - `/=`, `/ =`, `/ \, =`, `/ \; =`, `\/=`
 * - Dấu gạch chéo Unicode: `∕=` (U+2215), `⁄=` (U+2044), `／=` (U+FF0F)
 * - Dạng tổ hợp Unicode: `=\u0338`
 * - `\not=`, `\not =`, `≠`
 */
export function normalizeMathFormula(formula: string): string {
  if (!formula) return '';
  return formula
    .replace(/=\u0338|\u0338=/g, '\\neq ')
    .replace(/≠/g, '\\neq ')
    .replace(/\\not(?:\s|\\[,;:! ])*=/g, '\\neq ')
    .replace(
      /(?:(?:\\(?:text|mathrm|mathord|mathrel|mathbin|mathbf)\s*)?\{\s*)?(?:\\\/|\\diagup\b|[/\u2215\u2044\uff0f])(?:\s*\})?(?:\\[,;:! ]|\\q?quad|\s|\{\})*(?:\{\s*)?=(?:\s*\})?/g,
      '\\neq '
    );
}

/**
 * Tiền xử lý chuỗi Markdown chứa công thức toán (`$...$`, `$$...$$`, `\(...\)`, `\[...\]`)
 * để chuẩn hóa dấu khác và dấu phân cách toán học trước khi đưa vào Markdown/KaTeX.
 */
export function normalizeMarkdownMathDelimitersAndOperators(raw: string): string {
  const text = (raw || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\\[/g, '$$$$')
    .replace(/\\\]/g, '$$$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$');

  return text.replace(
    /(\$\$[\s\S]*?\$\$|\$(?:\\\$|[^$\n]|\n(?!\n))+?\$)/g,
    (mathSeg) => normalizeMathFormula(mathSeg)
  );
}
