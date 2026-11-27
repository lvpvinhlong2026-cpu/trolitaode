import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import DiagramPlaceholderWidget from './DiagramPlaceholderWidget';
import DiagramRenderedWidget from './DiagramRenderedWidget';
import { DiagramType, DiagramSuggestion } from '../utils/mathDiagramSuggester';
import { normalizeMarkdownMathDelimitersAndOperators, normalizeMathFormula } from '../utils/mathNormalizer';

/**
 * Plugin Remark chuẩn hóa trực tiếp các node AST `math` và `inlineMath`
 * trước khi `rehype-katex` render (tránh lệch cặp dấu $ trong văn bản dài).
 */
function remarkNormalizeMath() {
  return (tree: any) => {
    const visit = (node: any) => {
      if (!node || typeof node !== 'object') return;
      if ((node.type === 'math' || node.type === 'inlineMath') && typeof node.value === 'string') {
        node.value = normalizeMathFormula(node.value);
      }
      if (Array.isArray(node.children)) {
        for (const child of node.children) visit(child);
      }
    };
    visit(tree);
  };
}

export interface MathJaxRendererProps {
  content: string;
  inline?: boolean;
  className?: string;
  allQuestions?: string[];
  apiKey?: string;
  model?: string;
  onOpenDiagramTool?: (type: DiagramType, targetQuestion: string, suggestion?: DiagramSuggestion) => void;
  onInsertDiagram?: (dataUrl: string, targetQuestion: string, altText?: string) => void;
  onRemoveDiagram?: (targetQuestion: string) => void;
}

/**
 * Tiền xử lý nội dung Markdown để nhận diện câu hỏi và các vị trí cần vẽ hình (BBT, Đồ thị, Hình 3D)
 */
function preprocessMarkdownContent(raw: string): string {
  let text = normalizeMarkdownMathDelimitersAndOperators(raw);

  const lines = text.split('\n');
  const resultLines: string[] = [];
  let currentQ = 'Câu 1';
  let questionBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Phát hiện số thứ tự câu hỏi: <b>Câu 1.</b>, **Câu 1.**, Câu 1.
    const qMatch = line.match(/(?:<b>|\*\*|^|\s)(Câu\s+\d+)(?:\.|\:)/i);
    if (qMatch) {
      currentQ = qMatch[1];
      questionBuffer = [line];
    } else {
      if (questionBuffer.length < 6) {
        questionBuffer.push(line);
      }
    }

    // 1. Nhận diện placeholder dạng văn bản: [Bảng biến thiên], [Đồ thị...], (Hình vẽ...)
    const plainMatch = line.match(/^\s*(?:\[|\()(Bảng biến thiên|Đồ thị|Hình vẽ.*?)(?:\]|\))\s*$/i);
    if (plainMatch) {
      const altText = plainMatch[1];
      const snippet = questionBuffer.join(' ');
      resultLines.push(`\n\n![DIAGRAM_PLACEHOLDER::${currentQ}::${encodeURIComponent(altText)}::${encodeURIComponent(snippet)}]()\n\n`);
      continue;
    }

    // 2. Nhận diện cú pháp ảnh Markdown: ![alt](url)
    const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
    if (imgMatch) {
      const alt = imgMatch[1].trim();
      const url = imgMatch[2].trim();
      const snippet = questionBuffer.join(' ');

      // Kiểm tra nếu là placeholder rỗng hoặc ảnh lỗi chưa sinh data:
      const isPlaceholder = !url || url === '#' || url === 'bbt.png' || url === 'image.png' || 
                            url.includes('placeholder') || 
                            (!url.startsWith('data:') && !url.startsWith('http'));

      if (isPlaceholder) {
        resultLines.push(`![DIAGRAM_PLACEHOLDER::${currentQ}::${encodeURIComponent(alt || 'Bảng biến thiên')}::${encodeURIComponent(snippet)}]()`);
      } else {
        resultLines.push(`![DIAGRAM_RENDERED::${currentQ}::${encodeURIComponent(alt || 'Hình vẽ')}](${url})`);
      }
      continue;
    }

    resultLines.push(line);
  }

  return resultLines.join('\n');
}

/**
 * Component bọc ảnh phòng ngừa ảnh hỏng để tự động chuyển sang Widget gợi ý
 */
const FallbackImgWithWidget: React.FC<{
  src: string;
  alt: string;
  allQuestions?: string[];
  apiKey?: string;
  model?: string;
  onOpenDiagramTool?: (type: DiagramType, targetQuestion: string, suggestion?: DiagramSuggestion) => void;
  onInsertDiagram?: (dataUrl: string, targetQuestion: string, altText?: string) => void;
  onRemoveDiagram?: (targetQuestion: string) => void;
}> = ({ src, alt, allQuestions, apiKey, model, onOpenDiagramTool, onInsertDiagram, onRemoveDiagram }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <DiagramPlaceholderWidget
        rawAlt={alt || 'Bảng biến thiên'}
        targetQuestion="Câu 1"
        allQuestions={allQuestions}
        apiKey={apiKey}
        model={model}
        onOpenDiagramTool={onOpenDiagramTool}
        onInsertDiagram={onInsertDiagram}
      />
    );
  }

  if (src.startsWith('data:image')) {
    return (
      <DiagramRenderedWidget
        src={src}
        alt={alt}
        targetQuestion="Câu 1"
        allQuestions={allQuestions}
        onOpenDiagramTool={onOpenDiagramTool}
        onMoveDiagram={(dataUrl, newQ) => {
          if (onInsertDiagram) onInsertDiagram(dataUrl, newQ, `${alt} ${newQ}`);
        }}
        onRemoveDiagram={onRemoveDiagram}
      />
    );
  }

  return (
    <span className="block my-3 text-center">
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className="max-w-full sm:max-w-md h-auto mx-auto rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 bg-white"
      />
    </span>
  );
};

export default function MathJaxRenderer({
  content,
  inline = true,
  className = '',
  allQuestions = ['Câu 1', 'Câu 2', 'Câu 3', 'Câu 4', 'Câu 5', 'Câu 6', 'Câu 7', 'Câu 8', 'Câu 9', 'Câu 10', 'Câu 11', 'Câu 12'],
  apiKey = '',
  model = 'auto',
  onOpenDiagramTool,
  onInsertDiagram,
  onRemoveDiagram
}: MathJaxRendererProps) {
  const processedContent = preprocessMarkdownContent(content);

  const ContainerTag = inline ? 'span' : 'div';
  const containerClass = inline
    ? `inline-math-container leading-relaxed break-words inline align-baseline ${className}`.trim()
    : `block-math-container my-3 overflow-x-auto p-4 bg-slate-50 rounded-lg border border-slate-100 dark:bg-slate-800 dark:border-slate-700 font-sans ${className}`.trim();

  return (
    <ContainerTag className={containerClass}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkNormalizeMath, remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          p: ({ node, ...props }) => (inline ? <span {...props} /> : <p className="mb-2" {...props} />),
          u: ({ node, ...props }) => (
            <u className="font-extrabold text-blue-700 dark:text-blue-400 underline decoration-2 underline-offset-4 decoration-blue-500 bg-blue-50/80 dark:bg-blue-950/60 px-1 py-0.5 rounded" {...props} />
          ),
          table: ({ node, ...props }) => (
            <table className="border-collapse border border-slate-300 dark:border-slate-600 my-2 text-sm w-full" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 font-bold text-left" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5" {...props} />
          ),
          ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2" {...props} />,
          img: ({ node, ...props }) => {
            const alt = String(props.alt || '');
            const src = String(props.src || '');

            // 1. Khớp Placeholder thông minh kèm gợi ý hàm số
            if (alt.startsWith('DIAGRAM_PLACEHOLDER::')) {
              const parts = alt.split('::');
              const qNum = parts[1] || 'Câu 1';
              const altText = decodeURIComponent(parts[2] || 'Bảng biến thiên');
              const snippet = decodeURIComponent(parts[3] || '');

              return (
                <DiagramPlaceholderWidget
                  rawAlt={altText}
                  questionText={snippet}
                  targetQuestion={qNum}
                  allQuestions={allQuestions}
                  apiKey={apiKey}
                  model={model}
                  onOpenDiagramTool={onOpenDiagramTool}
                  onInsertDiagram={onInsertDiagram}
                />
              );
            }

            // 2. Khớp ảnh đã render hoàn thiện 300 DPI kèm công cụ sửa/chuyển câu
            if (alt.startsWith('DIAGRAM_RENDERED::')) {
              const parts = alt.split('::');
              const qNum = parts[1] || 'Câu 1';
              const altText = decodeURIComponent(parts[2] || 'Hình vẽ');

              return (
                <DiagramRenderedWidget
                  src={src}
                  alt={altText}
                  targetQuestion={qNum}
                  allQuestions={allQuestions}
                  onOpenDiagramTool={onOpenDiagramTool}
                  onMoveDiagram={(dataUrl, newQ) => {
                    if (onInsertDiagram) onInsertDiagram(dataUrl, newQ, `${altText} ${newQ}`);
                  }}
                  onRemoveDiagram={onRemoveDiagram}
                />
              );
            }

            // 3. Fallback cho các ảnh thông thường
            return (
              <FallbackImgWithWidget
                src={src}
                alt={alt}
                allQuestions={allQuestions}
                apiKey={apiKey}
                model={model}
                onOpenDiagramTool={onOpenDiagramTool}
                onInsertDiagram={onInsertDiagram}
                onRemoveDiagram={onRemoveDiagram}
              />
            );
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </ContainerTag>
  );
}
