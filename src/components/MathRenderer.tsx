import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string | number | undefined | null;
  className?: string;
  block?: boolean;
}

/**
 * Hàm phân tích và chuyển đổi chuỗi văn bản chứa LaTeX ($...$, $$...$$, \(...\), \[...\])
 * sang HTML an toàn có chứa KaTeX và MathML chuẩn.
 */
export function renderMathHtml(rawText: string | number | undefined | null): string {
  if (rawText === undefined || rawText === null) return '';
  const text = String(rawText);
  if (!text) return '';

  // 1. Tự động bao bọc các lệnh LaTeX độc lập nếu giáo viên quên gõ dấu $
  // Ví dụ: \frac{a}{b}, \sqrt{x}, \vec{u}, \int_{a}^{b}, \lim_{...}
  let normalizedText = text;

  // 2. Tách và render các đoạn công thức
  // Regex khớp display math $$...$$ hoặc \[...\]
  // Regex khớp inline math $...$ hoặc \(...\)
  const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?:\\\$|[^\$])+?\$|\\\([\s\S]*?\\\))/g;

  let lastIndex = 0;
  let htmlResult = '';
  let match: RegExpExecArray | null;

  while ((match = regex.exec(normalizedText)) !== null) {
    // Phần văn bản thường trước công thức
    const preText = normalizedText.slice(lastIndex, match.index);
    if (preText) {
      // Escape HTML văn bản thường và giữ nguyên xuống dòng
      htmlResult += escapeHtml(preText).replace(/\n/g, '<br />');
    }

    const token = match[0];
    let formula = '';
    let isDisplay = false;

    if (token.startsWith('$$') && token.endsWith('$$')) {
      formula = token.slice(2, -2).trim();
      isDisplay = true;
    } else if (token.startsWith('\\[') && token.endsWith('\\]')) {
      formula = token.slice(2, -2).trim();
      isDisplay = true;
    } else if (token.startsWith('$') && token.endsWith('$')) {
      formula = token.slice(1, -1).trim();
      isDisplay = false;
    } else if (token.startsWith('\\(') && token.endsWith('\\)')) {
      formula = token.slice(2, -2).trim();
      isDisplay = false;
    }

    try {
      const renderedMath = katex.renderToString(formula, {
        displayMode: isDisplay,
        throwOnError: false,
        strict: false,
        output: 'htmlAndMathml',
      });
      htmlResult += renderedMath;
    } catch {
      // Dự phòng nếu lỗi cú pháp cực đoan
      htmlResult += `<span class="text-rose-600 font-mono font-bold">${escapeHtml(token)}</span>`;
    }

    lastIndex = match.index + match[0].length;
  }

  // Đoạn văn bản còn lại sau match cuối cùng
  const restText = normalizedText.slice(lastIndex);
  if (restText) {
    htmlResult += escapeHtml(restText).replace(/\n/g, '<br />');
  }

  return htmlResult;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Component React render mượt mà công thức Toán học chuẩn LaTeX / KaTeX
 */
export const MathRenderer: React.FC<MathRendererProps> = ({
  content,
  className = '',
  block = false
}) => {
  const renderedHtml = useMemo(() => renderMathHtml(content), [content]);

  if (!content && content !== 0) {
    return null;
  }

  if (block) {
    return (
      <div 
        className={`math-rendered-block leading-relaxed ${className}`} 
        dangerouslySetInnerHTML={{ __html: renderedHtml }} 
      />
    );
  }

  return (
    <span 
      className={`math-rendered-inline ${className}`} 
      dangerouslySetInnerHTML={{ __html: renderedHtml }} 
    />
  );
};

export default MathRenderer;
