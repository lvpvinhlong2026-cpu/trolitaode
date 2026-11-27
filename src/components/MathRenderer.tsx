import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { normalizeMathFormula } from '../utils/mathNormalizer';

interface MathRendererProps {
  content: string | number | undefined | null;
  className?: string;
  block?: boolean;
}

/**
 * Hàm phân tích và chuyển đổi chuỗi văn bản chứa LaTeX ($...$, $$...$$, \(...\), \[...\])
 * và hình ảnh Markdown (![Hình vẽ](data:image/...)) sang HTML an toàn có chứa KaTeX và hình vẽ rõ nét.
 */
export function renderMathHtml(rawText: string | number | undefined | null): string {
  if (rawText === undefined || rawText === null) return '';
  const text = String(rawText);
  if (!text) return '';

  // 1. Phân tách và xử lý ảnh Markdown: ![alt](url)
  // Thay thế bằng thẻ HTML <img> an toàn trước khi xử lý text/math
  let processedText = text.replace(/!\[(.*?)\]\((.*?)\)/g, (_match, alt, url) => {
    const cleanAlt = (alt || 'Hình vẽ').replace(/"/g, '&quot;');
    const cleanUrl = url.trim();
    if (!cleanUrl || cleanUrl === '#') return '';
    return `___IMG_TOKEN___<div class="my-3 text-center"><img src="${cleanUrl}" alt="${cleanAlt}" class="max-w-full sm:max-w-md h-auto mx-auto rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 bg-white inline-block" /></div>___IMG_TOKEN___`;
  });

  // 2. Tách và render các đoạn công thức Toán
  // Regex khớp display math $$...$$ hoặc \[...\]
  // Regex khớp inline math $...$ hoặc \(...\)
  const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?:\\\$|[^\$])+?\$|\\\([\s\S]*?\\\))/g;

  let lastIndex = 0;
  let htmlResult = '';
  let match: RegExpExecArray | null;

  while ((match = regex.exec(processedText)) !== null) {
    // Phần văn bản trước công thức
    const preText = processedText.slice(lastIndex, match.index);
    if (preText) {
      htmlResult += formatSafeText(preText);
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

    // Chuẩn hóa các biến thể dấu khác sang \neq để KaTeX hiển thị đúng ≠
    formula = normalizeMathFormula(formula);

    try {
      const renderedMath = katex.renderToString(formula, {
        displayMode: isDisplay,
        throwOnError: false,
        strict: false,
        output: 'htmlAndMathml',
      });
      htmlResult += renderedMath;
    } catch {
      htmlResult += `<span class="text-rose-600 font-mono font-bold">${escapeHtml(token)}</span>`;
    }

    lastIndex = match.index + match[0].length;
  }

  // Đoạn văn bản còn lại sau match cuối cùng
  const restText = processedText.slice(lastIndex);
  if (restText) {
    htmlResult += formatSafeText(restText);
  }

  // Khôi phục token hình ảnh
  htmlResult = htmlResult.replace(/___IMG_TOKEN___([\s\S]*?)___IMG_TOKEN___/g, '$1');

  return htmlResult;
}

/**
 * Định dạng văn bản an toàn:
 * - Bảo tồn các thẻ HTML định dạng chuẩn: <b>, </b>, <u>, </u>, <i>, </i>, <strong>, <em>, <sub>, <sup>, <br>, <br/>
 * - Escape các ký tự nguy hiểm khác (<, >, &...)
 * - Thay thế dấu xuống dòng bằng <br />
 */
function formatSafeText(str: string): string {
  if (!str) return '';

  // Tách theo token ảnh nếu có
  if (str.includes('___IMG_TOKEN___')) {
    const parts = str.split('___IMG_TOKEN___');
    return parts.map((part, idx) => {
      // Các phần số lẻ là thẻ img đã an toàn
      if (idx % 2 === 1) return `___IMG_TOKEN___${part}___IMG_TOKEN___`;
      return formatSafeTextOnly(part);
    }).join('');
  }

  return formatSafeTextOnly(str);
}

function formatSafeTextOnly(text: string): string {
  // Thay thế các thẻ HTML được phép thành placeholder tạm
  const allowedTags: { regex: RegExp; placeholder: string; replacement: string }[] = [
    { regex: /<b\b[^>]*>/gi, placeholder: '___B_OPEN___', replacement: '<b class="font-bold">' },
    { regex: /<\/b>/gi, placeholder: '___B_CLOSE___', replacement: '</b>' },
    { regex: /<strong\b[^>]*>/gi, placeholder: '___STRONG_OPEN___', replacement: '<strong class="font-bold">' },
    { regex: /<\/strong>/gi, placeholder: '___STRONG_CLOSE___', replacement: '</strong>' },
    { regex: /<u\b[^>]*>/gi, placeholder: '___U_OPEN___', replacement: '<u class="underline decoration-2 underline-offset-2">' },
    { regex: /<\/u>/gi, placeholder: '___U_CLOSE___', replacement: '</u>' },
    { regex: /<i\b[^>]*>/gi, placeholder: '___I_OPEN___', replacement: '<i class="italic">' },
    { regex: /<\/i>/gi, placeholder: '___I_CLOSE___', replacement: '</i>' },
    { regex: /<em\b[^>]*>/gi, placeholder: '___EM_OPEN___', replacement: '<em class="italic">' },
    { regex: /<\/em>/gi, placeholder: '___EM_CLOSE___', replacement: '</em>' },
    { regex: /<sub\b[^>]*>/gi, placeholder: '___SUB_OPEN___', replacement: '<sub>' },
    { regex: /<\/sub>/gi, placeholder: '___SUB_CLOSE___', replacement: '</sub>' },
    { regex: /<sup\b[^>]*>/gi, placeholder: '___SUP_OPEN___', replacement: '<sup>' },
    { regex: /<\/sup>/gi, placeholder: '___SUP_CLOSE___', replacement: '</sup>' },
    { regex: /<br\s*\/?>/gi, placeholder: '___BR___', replacement: '<br />' }
  ];

  let temp = text;
  allowedTags.forEach(tag => {
    temp = temp.replace(tag.regex, tag.placeholder);
  });

  // Escape các ký tự còn lại
  let safe = escapeHtml(temp).replace(/\n/g, '<br />');

  // Khôi phục các thẻ hợp lệ
  allowedTags.forEach(tag => {
    safe = safe.split(tag.placeholder).join(tag.replacement);
  });

  return safe;
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
 * Component React render mượt mà công thức Toán học chuẩn LaTeX / KaTeX và ảnh hình học
 */
export const MathRenderer: React.FC<MathRendererProps> = ({
  content,
  className = '',
  block = false
}) => {
  const renderedHtml = useMemo(() => renderMathHtml(content), [content]);

  if (block) {
    return (
      <div
        className={`math-rendered-block leading-relaxed select-text ${className}`}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    );
  }

  return (
    <span
      className={`math-rendered-inline inline align-baseline leading-relaxed select-text ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};
