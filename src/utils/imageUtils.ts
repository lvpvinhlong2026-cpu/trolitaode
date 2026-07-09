/**
 * Converts a LaTeX string to a Base64 PNG image using MathJax SVG and HTML5 Canvas.
 */
export async function latexToPngBase64(latex: string, isDisplay: boolean = false): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const mj = (window as any).MathJax;
      if (!mj || !mj.tex2svg) {
        return reject("MathJax SVG component not loaded.");
      }

      // Generate SVG element
      const node = mj.tex2svg(latex, { display: isDisplay });
      const svg = node.querySelector('svg');
      if (!svg) {
        return reject("Failed to generate SVG from MathJax");
      }

      // Serialize SVG
      const svgString = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      // Draw SVG to Canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Scale for high DPI
        const scale = 3; 
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject("Canvas context not available");

        // Transparent background
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        // Export as base64 png
        const dataUrl = canvas.toDataURL('image/png');
        URL.revokeObjectURL(url);
        
        // Remove the data:image/png;base64, prefix for raw base64 if needed, but pptxgenjs accepts full dataURI
        resolve(dataUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject("Error loading SVG into Image element");
      };
      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
}
