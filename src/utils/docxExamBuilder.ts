import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  ImageRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  AlignmentType,
  Math as DocxMath,
  MathRun,
  MathFraction,
  MathSuperScript,
  MathSubScript,
  MathSubSuperScript,
  MathRadical,
  MathRoundBrackets,
  MathSquareBrackets,
  MathComponent,
  ParagraphChild
} from 'docx';
import { renderGraphToCanvas, GraphConfig } from './functionGraphEngine';
import { renderBBTToCanvas, analyzeFromCoeffs } from './bbtEngine';
import { renderGeometry3DToCanvas, Geometry3DConfig } from './geometry3dEngine';
import { cropCanvasToContent } from './dpiUtils';

// =========================================================================
// 1. BẢNG KÝ HIỆU TOÁN HỌC UNICODE CHUẨN OFFICE MATH
// =========================================================================
const LATEX_SYMBOLS_MAP: [RegExp, string][] = [
  [/\\infty/g, '∞'],
  [/\\pi/g, 'π'],
  [/\\alpha/g, 'α'],
  [/\\beta/g, 'β'],
  [/\\gamma/g, 'γ'],
  [/\\theta/g, 'θ'],
  [/\\lambda/g, 'λ'],
  [/\\Delta/g, 'Δ'],
  [/\\sum/g, '∑'],
  [/\\prod/g, '∏'],
  [/\\pm/g, '±'],
  [/\\mp/g, '∓'],
  [/\\times/g, '×'],
  [/\\cdot/g, '·'],
  [/\\div/g, '÷'],
  [/\\le(?:slant)?\b/g, '≤'],
  [/\\ge(?:slant)?\b/g, '≥'],
  [/\\neq\b/g, '≠'],
  [/\\approx\b/g, '≈'],
  [/\\equiv\b/g, '≡'],
  [/\\in\b/g, '∈'],
  [/\\notin\b/g, '∉'],
  [/\\subset\b/g, '⊂'],
  [/\\subseteq\b/g, '⊆'],
  [/\\cup\b/g, '∪'],
  [/\\cap\b/g, '∩'],
  [/\\emptyset\b/g, '∅'],
  [/\\mathbb\{R\}/g, 'ℝ'],
  [/\\mathbb\{N\}/g, 'ℕ'],
  [/\\mathbb\{Z\}/g, 'ℤ'],
  [/\\mathbb\{Q\}/g, 'ℚ'],
  [/\\mathbb\{C\}/g, 'ℂ'],
  [/\\to\b/g, '→'],
  [/\\rightarrow\b/g, '→'],
  [/\\Leftarrow\b/g, '⇐'],
  [/\\Rightarrow\b/g, '⇒'],
  [/\\Leftrightarrow\b/g, '⇔'],
  [/\\forall\b/g, '∀'],
  [/\\exists\b/g, '∃'],
  [/\\perp\b/g, '⊥'],
  [/\\parallel\b/g, '∥'],
  [/\\angle\b/g, '∠'],
  [/\\degree\b/g, '°'],
  [/\\prime\b/g, '′'],
  [/\\vec\{([a-zA-Z0-9]+)\}/g, '$1⃗'],
  [/\\overrightarrow\{([a-zA-Z0-9]+)\}/g, '$1⃗'],
  [/\\overline\{([a-zA-Z0-9]+)\}/g, '$1̅'],
  [/\\text\{([^}]+)\}/g, '$1'],
  [/\\mathrm\{([^}]+)\}/g, '$1'],
  [/\\mathbf\{([^}]+)\}/g, '$1'],
  [/\\left/g, ''],
  [/\\right/g, ''],
  [/\\,/g, ' '],
  [/\\;/g, ' '],
  [/\\quad/g, '  '],
];

/**
 * Chuẩn hóa ký hiệu LaTeX thành chuỗi ký tự toán học Unicode
 */
export function cleanMathSymbols(latex: string): string {
  let res = latex.trim();
  for (const [pattern, replacement] of LATEX_SYMBOLS_MAP) {
    res = res.replace(pattern, replacement);
  }
  return res;
}

// =========================================================================
// 2. PARSER CHUYỂN ĐỔI CÔNG THỨC LATEX SANG DOCX MATH COMPONENTS
// =========================================================================

/**
 * Trích xuất một khối ngoặc nhọn { ... } từ vị trí offset
 */
function extractCurlyGroup(str: string, startIndex: number): { content: string; endIndex: number } | null {
  if (str[startIndex] !== '{') return null;
  let depth = 1;
  let i = startIndex + 1;
  while (i < str.length && depth > 0) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') depth--;
    i++;
  }
  if (depth === 0) {
    return {
      content: str.substring(startIndex + 1, i - 1),
      endIndex: i
    };
  }
  return null;
}

/**
 * Phân tích cú pháp LaTeX đệ quy thành danh sách MathComponent của docx
 */
export function parseLatexToDocxMath(latex: string): MathComponent[] {
  const components: MathComponent[] = [];
  let s = latex.trim();
  if (!s) return components;

  let pos = 0;
  let textBuffer = '';

  const flushTextBuffer = () => {
    if (textBuffer) {
      const cleaned = cleanMathSymbols(textBuffer);
      if (cleaned) {
        components.push(new MathRun(cleaned));
      }
      textBuffer = '';
    }
  };

  while (pos < s.length) {
    // 1. Phân số: \frac{num}{den}
    if (s.startsWith('\\frac', pos)) {
      flushTextBuffer();
      pos += 5;
      while (pos < s.length && /\s/.test(s[pos])) pos++;

      const numGroup = extractCurlyGroup(s, pos);
      if (numGroup) {
        pos = numGroup.endIndex;
        while (pos < s.length && /\s/.test(s[pos])) pos++;
        const denGroup = extractCurlyGroup(s, pos);
        if (denGroup) {
          pos = denGroup.endIndex;
          components.push(new MathFraction({
            numerator: parseLatexToDocxMath(numGroup.content),
            denominator: parseLatexToDocxMath(denGroup.content)
          }));
          continue;
        }
      }
    }

    // 2. Căn thức: \sqrt{radicand} hoặc \sqrt[degree]{radicand}
    if (s.startsWith('\\sqrt', pos)) {
      flushTextBuffer();
      pos += 5;
      while (pos < s.length && /\s/.test(s[pos])) pos++;

      let degreeComponents: MathComponent[] | undefined = undefined;
      if (s[pos] === '[') {
        const closeIdx = s.indexOf(']', pos);
        if (closeIdx !== -1) {
          const degreeStr = s.substring(pos + 1, closeIdx);
          degreeComponents = parseLatexToDocxMath(degreeStr);
          pos = closeIdx + 1;
        }
      }

      while (pos < s.length && /\s/.test(s[pos])) pos++;
      const radicandGroup = extractCurlyGroup(s, pos);
      if (radicandGroup) {
        pos = radicandGroup.endIndex;
        components.push(new MathRadical({
          children: parseLatexToDocxMath(radicandGroup.content),
          degree: degreeComponents
        }));
        continue;
      }
    }

    // 3. Số mũ / Chỉ số trên: ^2 hoặc ^{expression}
    if (s[pos] === '^') {
      flushTextBuffer();
      pos++;
      let expContent = '';
      if (s[pos] === '{') {
        const group = extractCurlyGroup(s, pos);
        if (group) {
          expContent = group.content;
          pos = group.endIndex;
        }
      } else if (pos < s.length) {
        expContent = s[pos];
        pos++;
      }

      const prevComp = components.pop();
      const baseChildren: MathComponent[] = prevComp ? [prevComp] : [new MathRun('')];
      components.push(new MathSuperScript({
        children: baseChildren,
        superScript: parseLatexToDocxMath(expContent)
      }));
      continue;
    }

    // 4. Chỉ số dưới: _1 hoặc _{expression}
    if (s[pos] === '_') {
      flushTextBuffer();
      pos++;
      let subContent = '';
      if (s[pos] === '{') {
        const group = extractCurlyGroup(s, pos);
        if (group) {
          subContent = group.content;
          pos = group.endIndex;
        }
      } else if (pos < s.length) {
        subContent = s[pos];
        pos++;
      }

      const prevComp = components.pop();
      const baseChildren: MathComponent[] = prevComp ? [prevComp] : [new MathRun('')];
      components.push(new MathSubScript({
        children: baseChildren,
        subScript: parseLatexToDocxMath(subContent)
      }));
      continue;
    }

    // Ký tự thông thường
    textBuffer += s[pos];
    pos++;
  }

  flushTextBuffer();
  return components;
}

// =========================================================================
// 3. TẠO ẢNH DỰ PHÒNG TỰ ĐỘNG CHO PLACEHOLDER HÌNH VẼ
// =========================================================================

/**
 * Tự động tạo ảnh Canvas 300 DPI khi phát hiện câu hỏi có placeholder đồ thị / BBT / hình không gian
 */
export function generateAutoDiagramForPlaceholder(description: string): Uint8Array | null {
  if (typeof document === 'undefined') return null;

  const descLower = description.toLowerCase();

  try {
    // 1. Bảng biến thiên
    if (descLower.includes('bảng biến thiên') || descLower.includes('bbt')) {
      const c = document.createElement('canvas');
      let analyzed;
      if (descLower.includes('nhất biến') || descLower.includes('tiệm cận') || descLower.includes('phân thức')) {
        analyzed = analyzeFromCoeffs('rational_1_1', 2, 1, 1, -1); // y = (2x+1)/(x-1)
      } else if (descLower.includes('bậc bốn') || descLower.includes('trùng phương')) {
        analyzed = analyzeFromCoeffs('quartic', 1, 0, -2, 0); // y = x^4 - 2x^2
      } else {
        analyzed = analyzeFromCoeffs('cubic', 1, 0, -3, 0); // y = x^3 - 3x
      }
      renderBBTToCanvas(analyzed, c, 2.4, { fontSizeScale: 1.0 });
      const cropped = cropCanvasToContent(c, 6);
      return dataUrlToBytes(cropped.toDataURL('image/png'));
    }

    // 2. Đồ thị hàm số Oxy
    if (descLower.includes('đồ thị') || descLower.includes('tiệm cận') || descLower.includes('parabol') || descLower.includes('hàm số')) {
      const c = document.createElement('canvas');
      let graphCfg: GraphConfig;

      if (descLower.includes('nhất biến') || descLower.includes('tiệm cận') || descLower.includes('phân thức') || descLower.includes('x=1')) {
        graphCfg = {
          type: 'rational',
          a: 2, b: 1, c: 1, d: -1, e: 0, // y = (2x+1)/(x-1)
          xMin: -5, xMax: 6, yMin: -5, yMax: 7,
          showGrid: false, showTicks: true, tickStep: 1,
          showTickLabels: true, showExtrema: true, showIntersections: true, showAsymptotes: true
        };
      } else if (descLower.includes('bậc bốn') || descLower.includes('trùng phương')) {
        graphCfg = {
          type: 'quartic',
          a: 1, b: 0, c: -2, d: 0, e: -1,
          xMin: -3.5, xMax: 3.5, yMin: -3.5, yMax: 4.5,
          showGrid: false, showTicks: true, tickStep: 1,
          showTickLabels: true, showExtrema: true, showIntersections: true, showAsymptotes: false
        };
      } else {
        graphCfg = {
          type: 'cubic',
          a: 1, b: 0, c: -3, d: 1, e: 0,
          xMin: -4.5, xMax: 4.5, yMin: -4.5, yMax: 5.5,
          showGrid: false, showTicks: true, tickStep: 1,
          showTickLabels: true, showExtrema: true, showIntersections: true, showAsymptotes: false
        };
      }

      renderGraphToCanvas(graphCfg, c, 2.4, { fontSizeScale: 1.0 });
      const cropped = cropCanvasToContent(c, 6);
      return dataUrlToBytes(cropped.toDataURL('image/png'));
    }

    // 3. Hình học không gian 3D
    if (descLower.includes('hình chóp') || descLower.includes('lăng trụ') || descLower.includes('không gian') || descLower.includes('3d') || descLower.includes('oxz')) {
      const c = document.createElement('canvas');
      const geoCfg: Geometry3DConfig = {
        preset: descLower.includes('lăng trụ') ? 'prism_abc' : 'pyramid_s_abcd',
        showCenterO: true,
        showMidpointM: true,
        showDiagonals: false
      };
      renderGeometry3DToCanvas(geoCfg, c, 2.4);
      const cropped = cropCanvasToContent(c, 6);
      return dataUrlToBytes(cropped.toDataURL('image/png'));
    }
  } catch (err) {
    console.warn('Lỗi tự động sinh hình mẫu cho placeholder:', err);
  }

  return null;
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64Index = dataUrl.indexOf('base64,');
  const base64 = base64Index !== -1 ? dataUrl.substring(base64Index + 7) : dataUrl;
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// =========================================================================
// 4. PHÂN TÍCH TỪNG DÒNG MARKDOWN THÀNH CÁC ĐỐI TƯỢNG DOCX PARAGRAPH
// =========================================================================

/**
 * Phân tích một dòng văn bản chứa cả chữ thường lẫn các công thức LaTeX ($...$, $$...$$, \(...\))
 * thành danh sách ParagraphChild gồm TextRun và DocxMath
 */
export function parseTextAndMathRuns(line: string, isQuestionHeader = false): ParagraphChild[] {
  const children: ParagraphChild[] = [];
  let remaining = line.replace(/<b>|<\/b>/gi, '').trim();

  // Regex nhận diện công thức LaTeX:
  // 1. $$ ... $$
  // 2. $ ... $
  // 3. \[ ... \]
  // 4. \( ... \)
  const mathRegex = /(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/;

  while (remaining.length > 0) {
    const match = remaining.match(mathRegex);
    if (!match || match.index === undefined) {
      // Phần còn lại chỉ là text thuần
      if (remaining) {
        children.push(new TextRun({
          text: remaining.replace(/\*\*/g, ''),
          bold: isQuestionHeader,
          font: 'Times New Roman',
          size: 24
        }));
      }
      break;
    }

    const beforeMath = remaining.substring(0, match.index);
    if (beforeMath) {
      // Xử lý in đậm markdown nếu có
      const parts = beforeMath.split(/(\*\*.*?\*\*)/g);
      parts.forEach(part => {
        if (!part) return;
        if (part.startsWith('**') && part.endsWith('**')) {
          children.push(new TextRun({
            text: part.slice(2, -2),
            bold: true,
            font: 'Times New Roman',
            size: 24
          }));
        } else {
          children.push(new TextRun({
            text: part,
            bold: isQuestionHeader,
            font: 'Times New Roman',
            size: 24
          }));
        }
      });
    }

    // Bóc tách nội dung công thức LaTeX
    const matchedStr = match[0];
    let formula = matchedStr;
    if (formula.startsWith('$$') && formula.endsWith('$$')) {
      formula = formula.slice(2, -2);
    } else if (formula.startsWith('$') && formula.endsWith('$')) {
      formula = formula.slice(1, -1);
    } else if (formula.startsWith('\\[') && formula.endsWith('\\]')) {
      formula = formula.slice(2, -2);
    } else if (formula.startsWith('\\(') && formula.endsWith('\\)')) {
      formula = formula.slice(2, -2);
    }

    formula = formula.trim();

    if (formula) {
      // Phân tích LaTeX thành các thành phần Office Math
      const mathComponents = parseLatexToDocxMath(formula);
      if (mathComponents.length > 0) {
        children.push(new DocxMath({
          children: mathComponents
        }));
      } else {
        // Fallback hiển thị chuỗi ký tự toán học Unicode
        children.push(new DocxMath({
          children: [new MathRun(cleanMathSymbols(formula))]
        }));
      }
    }

    remaining = remaining.substring(match.index + matchedStr.length);
  }

  return children;
}

// =========================================================================
// 5. HÀM TẠO TOÀN BỘ FILE WORD (.DOCX) CHUẨN CÔNG VĂN 7991
// =========================================================================

export interface ExportWordExamOptions {
  schoolName?: string;
  departmentName?: string;
  examTitle?: string;
  examCode?: string;
  subject?: string;
  academicYear?: string;
  duration?: string;
  specTable?: Table;
}

export async function buildExamDocxBlob(
  examMarkdown: string, 
  options: ExportWordExamOptions = {}
): Promise<Blob> {
  const docParagraphs: (Paragraph | Table)[] = [];

  const school = options.schoolName || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO';
  const department = options.departmentName || 'TRƯỜNG THPT CHUẨN QUỐC GIA';
  const title = options.examTitle || 'ĐỀ KIỂM TRA ĐÁNH GIÁ ĐỊNH KÌ THEO CÔNG VĂN 7991';
  const code = options.examCode || '101';
  const subject = options.subject || 'Toán học';
  const year = options.academicYear || '2024 - 2025';
  const duration = options.duration || '90 phút';

  // 1. Header hành chính chuẩn văn bản Nhà nước
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: school.toUpperCase(), bold: true, size: 22, font: 'Times New Roman' }),
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: department.toUpperCase(), bold: true, size: 22, font: 'Times New Roman' }),
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `Mã đề thi: ${code}`, italics: true, size: 22, font: 'Times New Roman' }),
                ]
              }),
            ]
          }),
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: title.toUpperCase(), bold: true, size: 24, font: 'Times New Roman' }),
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `${subject} - Năm học ${year}`, bold: true, size: 22, font: 'Times New Roman' }),
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `Thời gian làm bài: ${duration} (không kể thời gian phát đề)`, italics: true, size: 20, font: 'Times New Roman' }),
                ]
              }),
            ]
          }),
        ]
      })
    ]
  });

  docParagraphs.push(headerTable);
  docParagraphs.push(new Paragraph({ text: '', spacing: { after: 140 } }));

  // Nếu có bảng Ma trận & Đặc tả đính kèm
  if (options.specTable) {
    docParagraphs.push(options.specTable);
    docParagraphs.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Khung thông tin học sinh
  docParagraphs.push(
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: 'Họ và tên thí sinh: ............................................................................ Lớp: ................. SBD: ....................',
          italics: true,
          font: 'Times New Roman',
          size: 22
        })
      ]
    })
  );

  // 2. Phân tích nội dung đề thi Markdown
  const lines = examMarkdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) {
      docParagraphs.push(new Paragraph({ text: '', spacing: { after: 60 } }));
      continue;
    }

    // A. XỬ LÝ HÌNH ẢNH (Cả ảnh base64 lẫn ảnh placeholder)
    const imgMatch = rawLine.match(/!\[(.*?)\](?:\((.*?)\))?/);
    if (imgMatch) {
      const altText = (imgMatch[1] || '').trim();
      const imgUrl = (imgMatch[2] || '').trim();
      let imageBytes: Uint8Array | null = null;

      // 1. Nếu có dữ liệu base64 hợp lệ
      if (imgUrl.includes('base64,')) {
        try {
          imageBytes = dataUrlToBytes(imgUrl);
        } catch (e) {
          console.error('Lỗi chuyển base64 sang bytes:', e);
        }
      }

      // 2. Nếu là placeholder không có ảnh base64 -> TỰ ĐỘNG SINH ẢNH VẼ CHUẨN 300 DPI
      if (!imageBytes) {
        const autoBytes = generateAutoDiagramForPlaceholder(altText || rawLine);
        if (autoBytes) {
          imageBytes = autoBytes;
        }
      }

      if (imageBytes) {
        const isGraph = altText.toLowerCase().includes('đồ thị') || altText.toLowerCase().includes('oxy');
        const isGeo3D = altText.toLowerCase().includes('hình') || altText.toLowerCase().includes('3d') || altText.toLowerCase().includes('chóp');
        
        let imgWidth = 400;
        let imgHeight = 175;
        if (isGraph) {
          imgWidth = 280;
          imgHeight = 230;
        } else if (isGeo3D) {
          imgWidth = 300;
          imgHeight = 220;
        }

        docParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 140, after: 140 },
            children: [
              new ImageRun({
                data: imageBytes as any,
                transformation: {
                  width: imgWidth,
                  height: imgHeight
                }
              } as any)
            ]
          })
        );
        continue;
      }
    }

    // B. XỬ LÝ TIÊU ĐỀ PHẦN / BẢNG ĐÁP ÁN
    if (
      rawLine.startsWith('#') || 
      rawLine.toUpperCase().includes('PHẦN I') || 
      rawLine.toUpperCase().includes('PHẦN II') || 
      rawLine.toUpperCase().includes('PHẦN III') || 
      rawLine.toUpperCase().includes('PHẦN IV') || 
      rawLine.toUpperCase().includes('BẢNG ĐÁP ÁN') ||
      rawLine.toUpperCase().includes('HƯỚNG DẪN GIẢI')
    ) {
      docParagraphs.push(
        new Paragraph({
          spacing: { before: 180, after: 100 },
          children: [
            new TextRun({
              text: rawLine.replace(/^#+\s*/, '').replace(/\*\*/g, ''),
              bold: true,
              size: 26,
              font: 'Times New Roman',
              color: '000000'
            })
          ]
        })
      );
      continue;
    }

    // C. XỬ LÝ CÂU HỎI VÀ NỘI DUNG CÓ CÔNG THỨC TOÁN HỌC
    const isQuestionHeader = /^(\*\*|\*|<b>)?(Câu\s+\d+|Bài\s+\d+)/i.test(rawLine);
    const runs = parseTextAndMathRuns(rawLine, isQuestionHeader);

    docParagraphs.push(
      new Paragraph({
        spacing: { after: 100 },
        alignment: AlignmentType.LEFT,
        children: runs
      })
    );
  }

  // 3. Tạo tài liệu docx chuẩn A4
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1134,    // 2 cm
            bottom: 1134, // 2 cm
            left: 1418,   // 2.5 cm
            right: 1134   // 2 cm
          }
        }
      },
      children: docParagraphs
    }]
  });

  return await Packer.toBlob(doc);
}
