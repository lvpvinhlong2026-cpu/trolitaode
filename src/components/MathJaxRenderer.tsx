import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

interface MathJaxRendererProps {
  content: string;
  inline?: boolean;
  className?: string;
}

export default function MathJaxRenderer({ content, inline = true, className = '' }: MathJaxRendererProps) {
  // Chuẩn hóa nội dung: 
  // 1. Chuyển <br/> thành \n để react-markdown hiểu là xuống dòng
  // 2. Chuyển \[ và \] thành $$ vì remark-math chuộng $ và $$
  // 3. Chuyển \( và \) thành $
  let processedContent = (content || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\\[/g, '$$$$')
    .replace(/\\\]/g, '$$$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$');

  const ContainerTag = inline ? 'span' : 'div';
  const containerClass = inline 
    ? `inline-math-container leading-relaxed break-words inline align-baseline ${className}`.trim()
    : `block-math-container my-3 overflow-x-auto p-4 bg-slate-50 rounded-lg border border-slate-100 dark:bg-slate-800 dark:border-slate-700 font-sans ${className}`.trim();

  return (
    <ContainerTag className={containerClass}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
           // Nếu là inline, tránh thẻ <p> tự động bao bọc gây xuống dòng
           p: ({node, ...props}) => inline ? <span {...props} /> : <p className="mb-2" {...props} />,
           // Tùy chỉnh bảng để đẹp hơn khi hiển thị ma trận/đáp án
           table: ({node, ...props}) => <table className="border-collapse border border-slate-300 dark:border-slate-600 my-2 text-sm w-full" {...props} />,
           th: ({node, ...props}) => <th className="border border-slate-300 dark:border-slate-600 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 font-bold text-left" {...props} />,
           td: ({node, ...props}) => <td className="border border-slate-300 dark:border-slate-600 px-3 py-1.5" {...props} />,
           // Định dạng danh sách
           ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2" {...props} />,
           ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2" {...props} />,
           // Định dạng hình ảnh (Đồ thị, Bảng biến thiên, Hình 3D) căn giữa, sắc nét, đẹp mắt
           img: ({node, ...props}) => (
             <span className="block my-3 text-center">
               <img className="max-w-full sm:max-w-md h-auto mx-auto rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 bg-white" {...props} />
             </span>
           ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </ContainerTag>
  );
}
