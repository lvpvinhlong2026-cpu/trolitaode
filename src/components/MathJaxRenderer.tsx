/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

let mathJaxQueue: (HTMLSpanElement | HTMLDivElement)[] = [];
let mathJaxTimeout: any = null;
let typesetChain: Promise<any> = Promise.resolve();

const queueMathJax = (el: HTMLSpanElement | HTMLDivElement) => {
  if (!mathJaxQueue.includes(el)) {
    mathJaxQueue.push(el);
  }
  
  if (mathJaxTimeout) clearTimeout(mathJaxTimeout);
  
  mathJaxTimeout = setTimeout(() => {
    const mathJax = (window as any).MathJax;
    
    if (!mathJax || !mathJax.typesetPromise) {
      // MathJax not fully initialized yet, poll again
      mathJaxTimeout = setTimeout(() => {
         if (mathJaxQueue.length > 0) queueMathJax(mathJaxQueue[0]);
      }, 150);
      return;
    }

    // Safely extract elements that are still in the DOM
    const elementsToTypeset = mathJaxQueue.filter(e => e.isConnected || document.body.contains(e));
    mathJaxQueue = [];
    
    if (elementsToTypeset.length === 0) return;

    // Maintain an independent promise chain to prevent MathJax deadlocks
    typesetChain = typesetChain
      .then(() => {
        if (mathJax.typesetClear) {
          mathJax.typesetClear(elementsToTypeset);
        }
        return mathJax.typesetPromise(elementsToTypeset);
      })
      .catch((err: any) => {
        console.error('MathJax typeset error:', err);
      });
  }, 150);
};

export const dequeueMathJax = (el: HTMLSpanElement | HTMLDivElement) => {
  mathJaxQueue = mathJaxQueue.filter(item => item !== el);
};

interface MathJaxRendererProps {
  content: string;
  inline?: boolean;
}

export default function MathJaxRenderer({ content, inline = true }: MathJaxRendererProps) {
  const containerRef = useRef<HTMLSpanElement | HTMLDivElement>(null);

  useEffect(() => {
    let processedContent = content || '';
    if (processedContent) {
      if (inline) {
        // Force display math \[ \] to render as inline math $ $
        processedContent = processedContent.replace(/\\\[/g, '$').replace(/\\\]/g, '$');
        processedContent = processedContent.replace(/\\\(/g, '$').replace(/\\\)/g, '$');
        processedContent = processedContent.replace(/\$\$/g, '$');
      } else {
        // For block math, just ensure \[ \] and \( \) work by standardizing to MathJax default $ or $$
        processedContent = processedContent.replace(/\\\[/g, '$$').replace(/\\\]/g, '$$');
        processedContent = processedContent.replace(/\\\(/g, '$').replace(/\\\)/g, '$');
      }
    }

    const currentEl = containerRef.current;
    if (currentEl) {
      currentEl.innerHTML = processedContent;
      queueMathJax(currentEl);
    }
  }, [content, inline]);

  useEffect(() => {
    const currentEl = containerRef.current;
    return () => {
      if (currentEl) {
        dequeueMathJax(currentEl);
      }
    };
  }, []);

  if (inline) {
    return (
      <span 
        ref={containerRef as React.RefObject<HTMLSpanElement>} 
        className="inline-math-container font-sans leading-relaxed break-words max-w-full overflow-x-auto inline-block align-bottom"
      />
    );
  }

  return (
    <div 
      ref={containerRef as React.RefObject<HTMLDivElement>} 
      className="block-math-container my-3 overflow-x-auto p-4 bg-slate-50 rounded-lg border border-slate-100 dark:bg-slate-800 dark:border-slate-700"
    />
  );
}
