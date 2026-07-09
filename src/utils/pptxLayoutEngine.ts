import { latexToPngBase64 } from './imageUtils';

function measureTextWidth(text: string, fontSize: number): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.font = `${fontSize}pt "Segoe UI", Arial, sans-serif`;
    return ctx.measureText(text).width;
  }
  return text.length * (fontSize * 0.5); // Fallback
}

function getImageProps(base64: string): Promise<{ width: number, height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => resolve({ width: 100, height: 50 });
    img.src = base64;
  });
}

/**
 * Draws text containing LaTeX inline into a PPTX slide by manually calculating X and Y.
 * Returns the final Y position after drawing, so subsequent blocks know where to start.
 */
export async function drawInlineTextWithMath(
  slide: any, 
  text: string, 
  startX: number, 
  startY: number, 
  maxWidth: number, 
  fontSize: number,
  color: string = "334155",
  isBold: boolean = false
): Promise<number> {
  // Split by $$...$$ and $...$
  const parts = text.split(/(\$\$.+?\$\$|\$.+?\$)/g);
  let currentX = startX;
  let currentY = startY;
  const fontHeightInches = (fontSize / 72);
  const lineHeightInches = fontHeightInches * 1.5;

  for (const part of parts) {
    if (!part) continue;
    
    if (part.startsWith('$')) {
      const isBlock = part.startsWith('$$');
      const latex = part.replace(/\$/g, '');
      
      try {
        const base64 = await latexToPngBase64(latex, isBlock);
        const imgProps = await getImageProps(base64);
        
        // Scale image based on font size
        // Usually, an inline formula's height is roughly 1.5x to 2x the font height
        // But we rely on the MathJax SVG aspect ratio.
        let h = fontHeightInches * (isBlock ? 2.5 : 1.5);
        let w = imgProps.width * (h / imgProps.height);
        
        // If image is too wide, wrap it
        if (currentX + w > startX + maxWidth && currentX > startX) {
          currentX = startX;
          currentY += lineHeightInches;
        }

        // Add small vertical offset to align inline math with text baseline
        const yOffset = isBlock ? 0 : (lineHeightInches - h) / 2;

        slide.addImage({ data: base64, x: currentX, y: currentY + yOffset, w: w, h: h });
        currentX += w + 0.05; // 0.05 inch padding
        
        if (isBlock) {
          currentX = startX;
          currentY += h + 0.1;
        }
      } catch (err) {
        console.error("Failed to render math image for pptx:", latex, err);
        // Fallback to text
        const wordW = measureTextWidth(latex, fontSize) / 96;
        if (currentX + wordW > startX + maxWidth) {
          currentX = startX;
          currentY += lineHeightInches;
        }
        slide.addText(latex, { x: currentX, y: currentY, w: wordW + 0.1, h: lineHeightInches, fontSize, color, bold: isBold, margin: 0 });
        currentX += wordW;
      }

    } else {
      // It's normal text. We split by spaces to wrap words properly.
      // But preserving exact spaces is tricky. Let's split by space but keep them.
      const words = part.split(/(\s+)/);
      for (const word of words) {
        if (!word) continue;
        
        // If it's just a newline
        if (word.includes('\n')) {
            currentX = startX;
            currentY += lineHeightInches;
            continue;
        }

        const wordPx = measureTextWidth(word, fontSize);
        const wordW = wordPx / 96; // 96 DPI
        
        if (currentX + wordW > startX + maxWidth && currentX > startX && word.trim().length > 0) {
          // Wrap to next line
          currentX = startX;
          currentY += lineHeightInches;
        }
        
        // Don't add text if it's just a wrap-around space
        if (word.trim().length > 0 || currentX > startX) {
            slide.addText(word, { 
                x: currentX, 
                y: currentY, 
                w: wordW + 0.05, // slight buffer 
                h: lineHeightInches, 
                fontSize, 
                color, 
                bold: isBold, 
                margin: 0,
                valign: 'middle'
            });
            currentX += wordW;
        }
      }
    }
  }

  return currentY + lineHeightInches;
}
