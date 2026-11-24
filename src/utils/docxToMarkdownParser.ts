import JSZip from 'jszip';
import { parseMtefToLatex } from './mtefParser';

/**
 * Chuyển đổi phần tử OMML (Office Math Markup Language) trong Word OpenXML sang mã LaTeX
 */
export function ommlNodeToLatex(node: Element): string {
  const tag = node.localName || node.nodeName.split(':').pop() || '';

  // 1. Phân số: <m:f> -> \frac{num}{den}
  if (tag === 'f') {
    const numEl = getChildByLocalName(node, 'num');
    const denEl = getChildByLocalName(node, 'den');
    const num = numEl ? ommlChildrenToLatex(numEl) : '';
    const den = denEl ? ommlChildrenToLatex(denEl) : '';
    return `\\frac{${num.trim()}}{${den.trim()}}`;
  }

  // 2. Lũy thừa / Số mũ: <m:sSup> -> {base}^{sup}
  if (tag === 'sSup') {
    const baseEl = getChildByLocalName(node, 'e');
    const supEl = getChildByLocalName(node, 'sup');
    const base = baseEl ? ommlChildrenToLatex(baseEl) : '';
    const sup = supEl ? ommlChildrenToLatex(supEl) : '';
    return `{${base.trim()}}^{${sup.trim()}}`;
  }

  // 3. Chỉ số dưới: <m:sSub> -> {base}_{sub}
  if (tag === 'sSub') {
    const baseEl = getChildByLocalName(node, 'e');
    const subEl = getChildByLocalName(node, 'sub');
    const base = baseEl ? ommlChildrenToLatex(baseEl) : '';
    const sub = subEl ? ommlChildrenToLatex(subEl) : '';
    return `{${base.trim()}}_{${sub.trim()}}`;
  }

  // 4. Cả chỉ số trên và dưới: <m:sSubSup> -> {base}_{sub}^{sup}
  if (tag === 'sSubSup') {
    const baseEl = getChildByLocalName(node, 'e');
    const subEl = getChildByLocalName(node, 'sub');
    const supEl = getChildByLocalName(node, 'sup');
    const base = baseEl ? ommlChildrenToLatex(baseEl) : '';
    const sub = subEl ? ommlChildrenToLatex(subEl) : '';
    const sup = supEl ? ommlChildrenToLatex(supEl) : '';
    return `{${base.trim()}}_{${sub.trim()}}^{${sup.trim()}}`;
  }

  // 5. Căn thức: <m:rad> -> \sqrt[deg]{e}
  if (tag === 'rad') {
    const degEl = getChildByLocalName(node, 'deg');
    const eEl = getChildByLocalName(node, 'e');
    const deg = degEl ? ommlChildrenToLatex(degEl).trim() : '';
    const e = eEl ? ommlChildrenToLatex(eEl).trim() : '';
    return deg ? `\\sqrt[${deg}]{${e}}` : `\\sqrt{${e}}`;
  }

  // 6. Dấu ngoặc / Khung bao: <m:d>
  if (tag === 'd') {
    const dPr = getChildByLocalName(node, 'dPr');
    let begChr = '(';
    let endChr = ')';
    if (dPr) {
      const begEl = getChildByLocalName(dPr, 'begChr');
      const endEl = getChildByLocalName(dPr, 'endChr');
      if (begEl) begChr = begEl.getAttribute('m:val') || begEl.getAttribute('val') || '(';
      if (endEl) endChr = endEl.getAttribute('m:val') || endEl.getAttribute('val') || ')';
    }
    const eEl = getChildByLocalName(node, 'e');
    const content = eEl ? ommlChildrenToLatex(eEl) : '';
    
    // Ánh xạ ngoặc LaTeX
    const openP = begChr === '[' ? '\\left[' : begChr === '{' ? '\\left\\{' : '\\left(';
    const closeP = endChr === ']' ? '\\right]' : endChr === '}' ? '\\right\\}' : '\\right)';
    return `${openP} ${content.trim()} ${closeP}`;
  }

  // 7. Ký tự văn bản toán học: <m:t>
  if (tag === 't') {
    let t = node.textContent || '';
    t = t.replace(/∞/g, '\\infty ')
         .replace(/π/g, '\\pi ')
         .replace(/α/g, '\\alpha ')
         .replace(/β/g, '\\beta ')
         .replace(/±/g, '\\pm ')
         .replace(/≤/g, '\\le ')
         .replace(/≥/g, '\\ge ')
         .replace(/≠/g, '\\ne ')
         .replace(/×/g, '\\times ')
         .replace(/·/g, '\\cdot ')
         .replace(/∈/g, '\\in ')
         .replace(/∉/g, '\\notin ')
         .replace(/→/g, '\\to ')
         .replace(/⇒/g, '\\Rightarrow ')
         .replace(/ℝ/g, '\\mathbb{R}')
         .replace(/ℤ/g, '\\mathbb{Z}');
    return t;
  }

  return ommlChildrenToLatex(node);
}

function ommlChildrenToLatex(node: Element): string {
  let result = '';
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (child.nodeType === Node.ELEMENT_NODE) {
      result += ommlNodeToLatex(child as Element);
    } else if (child.nodeType === Node.TEXT_NODE) {
      result += child.textContent || '';
    }
  }
  return result;
}

function getChildByLocalName(node: Element, localName: string): Element | null {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.localName || el.nodeName.split(':').pop() || '';
      if (tag === localName) return el;
    }
  }
  return null;
}

/**
 * Trích xuất toàn diện tệp Word .docx:
 * 1. Đọc và chuyển đổi công thức toán OMML (<m:oMath>) sang LaTeX $...$
 * 2. Đọc và chuyển đổi công thức MathType OLE DSMT (<w:object>) và .wmf sang LaTeX $...$
 * 3. Trích xuất tất cả ảnh thật (word/media/*.png, .jpg) thành base64 nhúng chuẩn Markdown ![...](data:image/...)
 * 4. Bảo tồn thẻ gạch chân (<u>A.</u>), in đậm (<b>...</b>) và bảng biểu
 */
export async function parseDocxWithFormulasAndImages(arrayBuffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 1. Phân loại tài nguyên tệp nhúng trong zip:
  // - Hình ảnh thật (PNG, JPG, GIF, WebP) -> Base64 data URL
  // - Công thức MathType (WMF, BIN OLE) -> Giải mã MTEF sang LaTeX
  const mediaMap: Record<string, string> = {};       // relKey -> data:image/png;base64,...
  const formulaRelMap: Record<string, string> = {};   // relKey -> LaTeX formula

  const allZipFiles = Object.keys(zip.files);
  for (const fPath of allZipFiles) {
    if (fPath.startsWith('word/media/') || fPath.startsWith('word/embeddings/')) {
      const file = zip.file(fPath);
      if (!file) continue;

      const lower = fPath.toLowerCase();
      const relKey = fPath.replace('word/', ''); // "media/image1.png" hoặc "embeddings/oleObject1.bin"

      if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif')) {
        const base64 = await file.async('base64');
        const ext = lower.split('.').pop() || 'png';
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : 'image/png';
        mediaMap[relKey] = `data:${mime};base64,${base64}`;
      } else if (lower.endsWith('.wmf') || lower.endsWith('.bin')) {
        const u8 = await file.async('uint8array');
        const latex = parseMtefToLatex(u8);
        if (latex && latex.trim()) {
          formulaRelMap[relKey] = latex.trim();
        }
      }
    }
  }

  // 2. Đọc bảng ánh xạ Relationships: word/_rels/document.xml.rels
  const rIdImageMap: Record<string, string> = {};   // "rId5" -> data:image/png;base64,...
  const rIdFormulaMap: Record<string, string> = {}; // "rId5" -> LaTeX string

  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (relsFile) {
    const relsXml = await relsFile.async('string');
    // Hỗ trợ cả môi trường trình duyệt và Node.js/Bun
    const ParserClass = typeof DOMParser !== 'undefined' ? DOMParser : (globalThis as any).DOMParser;
    const parser = new ParserClass();
    const relsDoc = parser.parseFromString(relsXml, 'application/xml');
    const relNodes = relsDoc.getElementsByTagName('Relationship');

    for (let i = 0; i < relNodes.length; i++) {
      const rel = relNodes[i];
      const id = rel.getAttribute('Id') || '';
      const target = rel.getAttribute('Target') || '';
      if (id && target) {
        const cleanTarget = target.replace(/^\//, '');
        if (mediaMap[cleanTarget]) {
          rIdImageMap[id] = mediaMap[cleanTarget];
        }
        if (formulaRelMap[cleanTarget]) {
          rIdFormulaMap[id] = formulaRelMap[cleanTarget];
        }
      }
    }
  }

  // 3. Đọc nội dung chính word/document.xml
  const docFile = zip.file('word/document.xml');
  if (!docFile) {
    throw new Error('Tệp Word không hợp lệ (thiếu word/document.xml).');
  }

  const docXml = await docFile.async('string');
  const ParserClass = typeof DOMParser !== 'undefined' ? DOMParser : (globalThis as any).DOMParser;
  const parser = new ParserClass();
  const xmlDoc = parser.parseFromString(docXml, 'application/xml');

  const bodyEl = xmlDoc.getElementsByTagName('w:body')[0] || xmlDoc.documentElement;
  const resultLines: string[] = [];

  for (let i = 0; i < bodyEl.childNodes.length; i++) {
    const child = bodyEl.childNodes[i];
    if (child.nodeType !== 1) continue; // Node.ELEMENT_NODE
    const el = child as Element;
    const tag = el.localName || el.nodeName.split(':').pop() || '';

    // XỬ LÝ ĐOẠN VĂN (<w:p>)
    if (tag === 'p') {
      const pText = parseParagraphElement(el, rIdImageMap, rIdFormulaMap);
      if (pText.trim()) {
        resultLines.push(pText.trim());
      }
    } 
    // XỬ LÝ BẢNG (<w:tbl>)
    else if (tag === 'tbl') {
      const tblMd = parseTableElement(el, rIdImageMap, rIdFormulaMap);
      if (tblMd.trim()) {
        resultLines.push(tblMd.trim());
      }
    }
  }

  return resultLines.join('\n\n');
}

function parseParagraphElement(
  pEl: Element, 
  rIdImageMap: Record<string, string>,
  rIdFormulaMap: Record<string, string>
): string {
  let text = '';

  for (let i = 0; i < pEl.childNodes.length; i++) {
    const node = pEl.childNodes[i];
    if (node.nodeType !== 1) continue; // Node.ELEMENT_NODE
    const el = node as Element;
    const tag = el.localName || el.nodeName.split(':').pop() || '';

    // 1. Run văn bản: <w:r>
    if (tag === 'r') {
      const rPr = getChildByLocalName(el, 'rPr');
      let isBold = false;
      let isUnderline = false;
      if (rPr) {
        if (getChildByLocalName(rPr, 'b')) isBold = true;
        if (getChildByLocalName(rPr, 'u')) isUnderline = true;
      }

      // Kiểm tra có hình vẽ trong run này: <w:drawing>
      const drawing = getChildByLocalName(el, 'drawing');
      if (drawing) {
        const dContent = extractContentFromDrawing(drawing, rIdImageMap, rIdFormulaMap);
        if (dContent) text += dContent;
      }

      // Kiểm tra có OLE MathType trong run này: <w:object>
      const objectEl = getChildByLocalName(el, 'object');
      if (objectEl) {
        const objFormula = extractFormulaFromObject(objectEl, rIdFormulaMap, rIdImageMap);
        if (objFormula) text += objFormula;
      }

      // Đọc các ký tự text trong run: <w:t>
      const tEls = el.getElementsByTagName('w:t');
      let runText = '';
      for (let j = 0; j < tEls.length; j++) {
        runText += tEls[j].textContent || '';
      }

      if (runText) {
        if (isUnderline) {
          runText = `<u>${runText}</u>`;
        }
        if (isBold) {
          runText = `<b>${runText}</b>`;
        }
        text += runText;
      }
    }

    // 2. Công thức toán học OMML chuẩn Word: <m:oMath> hoặc <m:oMathPara>
    else if (tag === 'oMath' || tag === 'oMathPara') {
      const latex = ommlNodeToLatex(el).trim();
      if (latex) {
        text += ` $${latex}$ `;
      }
    }

    // 3. Hình vẽ độc lập trong paragraph: <w:drawing>
    else if (tag === 'drawing') {
      const dContent = extractContentFromDrawing(el, rIdImageMap, rIdFormulaMap);
      if (dContent) text += dContent;
    }

    // 4. Đối tượng OLE MathType độc lập: <w:object>
    else if (tag === 'object') {
      const objFormula = extractFormulaFromObject(el, rIdFormulaMap, rIdImageMap);
      if (objFormula) text += objFormula;
    }
  }

  return text;
}

function extractContentFromDrawing(
  drawingEl: Element, 
  rIdImageMap: Record<string, string>,
  rIdFormulaMap: Record<string, string>
): string {
  // Tìm blip: <a:blip r:embed="rIdX" />
  const blipEls = drawingEl.getElementsByTagName('a:blip');
  for (let i = 0; i < blipEls.length; i++) {
    const blip = blipEls[i];
    const embedId = blip.getAttribute('r:embed') || blip.getAttribute('embed') || '';
    if (embedId) {
      if (rIdImageMap[embedId]) {
        return `\n\n![Hình vẽ](${rIdImageMap[embedId]})\n\n`;
      }
      if (rIdFormulaMap[embedId]) {
        return ` $${rIdFormulaMap[embedId]}$ `;
      }
    }
  }
  return '';
}

function extractFormulaFromObject(
  objectEl: Element,
  rIdFormulaMap: Record<string, string>,
  rIdImageMap: Record<string, string>
): string {
  // 1. Tìm OLEObject: <o:OLEObject r:id="rIdX" ...>
  const oleEls = objectEl.getElementsByTagName('o:OLEObject');
  for (let i = 0; i < oleEls.length; i++) {
    const ole = oleEls[i];
    const id = ole.getAttribute('r:id') || ole.getAttribute('id') || '';
    if (id && rIdFormulaMap[id]) {
      return ` $${rIdFormulaMap[id]}$ `;
    }
  }

  // 2. Tìm VML imagedata: <v:imagedata r:id="rIdY" ...>
  const imgEls = objectEl.getElementsByTagName('v:imagedata');
  for (let i = 0; i < imgEls.length; i++) {
    const img = imgEls[i];
    const id = img.getAttribute('r:id') || img.getAttribute('id') || '';
    if (id) {
      if (rIdFormulaMap[id]) {
        return ` $${rIdFormulaMap[id]}$ `;
      }
      if (rIdImageMap[id]) {
        return `\n\n![Hình vẽ](${rIdImageMap[id]})\n\n`;
      }
    }
  }

  return '';
}

function parseTableElement(
  tblEl: Element, 
  rIdImageMap: Record<string, string>,
  rIdFormulaMap: Record<string, string>
): string {
  const rows: string[] = [];
  const trEls = tblEl.getElementsByTagName('w:tr');

  for (let i = 0; i < trEls.length; i++) {
    const tr = trEls[i];
    const cells: string[] = [];
    const tcEls = tr.getElementsByTagName('w:tc');

    for (let j = 0; j < tcEls.length; j++) {
      const tc = tcEls[j];
      const pEls = tc.getElementsByTagName('w:p');
      let cellText = '';
      for (let k = 0; k < pEls.length; k++) {
        const pt = parseParagraphElement(pEls[k], rIdImageMap, rIdFormulaMap).trim();
        if (pt) cellText += (cellText ? ' ' : '') + pt;
      }
      cells.push(cellText || ' ');
    }

    if (cells.length > 0) {
      rows.push('| ' + cells.join(' | ') + ' |');
    }
  }

  if (rows.length === 0) return '';
  return rows.join('\n');
}
