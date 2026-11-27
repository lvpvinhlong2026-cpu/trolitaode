/**
 * Bộ giải mã MathType Equation Format (MTEF v3, v5) từ tệp OLE nhúng (.bin) hoặc ảnh WMF (.wmf)
 * Chuyển đổi trực tiếp các công thức MathType thành mã chuẩn LaTeX ($...$)
 */

import { normalizeMathFormula } from './mathNormalizer';

export function parseMtefToLatex(input: ArrayBuffer | Uint8Array): string {
  if (!input) return '';
  const buf = input instanceof Uint8Array ? input : new Uint8Array(input);

  // Tìm chữ ký DSMT (Design Science MathType)
  const dsmtIdx = findSubarrayIndex(buf, [0x44, 0x53, 0x4d, 0x54]); // 'DSMT'
  if (dsmtIdx === -1) return '';

  let pos = dsmtIdx + 5;
  // Bỏ qua bảng font (kết thúc bằng "MT Extra\0" hoặc "Times New Roman\0")
  const mtExtraIdx = findSubarrayIndex(buf, [0x4d, 0x54, 0x20, 0x45, 0x78, 0x74, 0x72, 0x61, 0x00], dsmtIdx);
  if (mtExtraIdx !== -1) {
    pos = mtExtraIdx + 9;
  } else {
    const tnrIdx = findSubarrayIndex(buf, [0x54, 0x69, 0x6d, 0x65, 0x73, 0x20, 0x4e, 0x65, 0x77, 0x20, 0x52, 0x6f, 0x6d, 0x61, 0x6e, 0x00], dsmtIdx);
    if (tnrIdx !== -1) pos = tnrIdx + 16;
  }

  // Dò tìm vị trí bắt đầu bản ghi MTEF đầu tiên (0x01 LINE hoặc 0x0a SIZE)
  while (pos < buf.length - 2) {
    if (buf[pos] === 0x0a && buf[pos + 1] === 0x01) {
      pos += 1;
      break;
    }
    if (buf[pos] === 0x01 && (buf[pos + 1] === 0x00 || buf[pos + 1] === 0x02 || buf[pos + 1] === 0x03)) {
      break;
    }
    pos++;
  }

  function parseLine(): string {
    let res = '';
    if (pos >= buf.length) return res;

    // Nếu bắt đầu bằng 0x01 (LINE), bỏ qua thẻ và byte tùy chọn dòng
    if (buf[pos] === 0x01) {
      pos++; // skip tag 0x01
      pos++; // skip line options byte
    }

    while (pos < buf.length) {
      const tag = buf[pos++];
      if (tag === 0x00) {
        // END của dòng hoặc mẫu
        break;
      } else if (tag === 0x01) {
        // Dòng con lồng nhau
        pos--;
        res += parseLine();
      } else if (tag === 0x02) {
        // CHAR (Ký tự toán học)
        if (pos + 3 >= buf.length) break;
        const opt = buf[pos++];
        const font = buf[pos++];
        const b1 = buf[pos++];
        const b2 = buf[pos++];
        const charCode = b1 | (b2 << 8);
        res += decodeMtefChar(charCode, font);
      } else if (tag === 0x03) {
        // TMPL (Khuôn mẫu toán học: Phân số, Căn thức, Lũy thừa, Ngoặc...)
        if (pos + 3 >= buf.length) break;
        const _tmplOpt = buf[pos++];
        const selector = buf[pos++];
        const variation = buf[pos++];
        const _extraOpt = buf[pos++];
        res += parseTemplate(selector, variation);
      } else if (tag === 0x06) {
        // EMBEL (Dấu phụ: Phẩy đạo hàm ', Vectơ, Dấu chấm...)
        if (pos + 1 >= buf.length) break;
        const _embelOpt = buf[pos++];
        const embelType = buf[pos++];
        if (embelType === 0x02) res += "'";
        else if (embelType === 0x03) res += "''";
        else if (embelType === 0x01) res += "\\dot ";
        else if (embelType === 0x0b) res += "\\vec ";
      } else if (tag === 0x0a) {
        // SIZE
        pos += 2;
      } else {
        // Bản ghi không xác định
        break;
      }
    }
    return res;
  }

  function parseTemplate(selector: number, variation: number): string {
    // 1. Phân số: selector = 11 (0x0b)
    if (selector === 11 || selector === 0x0b) {
      const num = parseLine();
      const den = parseLine();
      if (buf[pos] === 0x00) pos++;
      return `\\frac{${cleanMathText(num)}}{${cleanMathText(den)}}`;
    } 
    // 2. Chỉ số trên / Chỉ số dưới: selector = 1
    else if (selector === 1 || selector === 0x01) {
      if (variation === 0) {
        const sub = parseLine();
        if (buf[pos] === 0x00) pos++;
        return `_{${cleanMathText(sub)}}`;
      } else if (variation === 1) {
        const sup = parseLine();
        if (buf[pos] === 0x00) pos++;
        return `^{${cleanMathText(sup)}}`;
      } else {
        const sub = parseLine();
        const sup = parseLine();
        if (buf[pos] === 0x00) pos++;
        return `_{${cleanMathText(sub)}}^{${cleanMathText(sup)}}`;
      }
    } 
    // 3. Căn thức: selector = 3
    else if (selector === 3 || selector === 0x03) {
      if (variation === 1) {
        const n = parseLine();
        const expr = parseLine();
        if (buf[pos] === 0x00) pos++;
        return `\\sqrt[${cleanMathText(n)}]{${cleanMathText(expr)}}`;
      } else {
        const expr = parseLine();
        if (buf[pos] === 0x00) pos++;
        return `\\sqrt{${cleanMathText(expr)}}`;
      }
    } 
    // 4. Dấu ngoặc đơn: selector = 14 (0x0e)
    else if (selector === 14 || selector === 0x0e) {
      const expr = parseLine();
      if (buf[pos] === 0x00) pos++;
      return `\\left(${cleanMathText(expr)}\\right)`;
    } 
    // 5. Dấu ngoặc vuông: selector = 16 (0x10)
    else if (selector === 16 || selector === 0x10) {
      const expr = parseLine();
      if (buf[pos] === 0x00) pos++;
      return `\\left[${cleanMathText(expr)}\\right]`;
    } 
    // 6. Giá trị tuyệt đối: selector = 15 (0x0f)
    else if (selector === 15 || selector === 0x0f) {
      const expr = parseLine();
      if (buf[pos] === 0x00) pos++;
      return `\\left|${cleanMathText(expr)}\\right|`;
    } 
    // Mặc định
    else {
      const expr = parseLine();
      if (buf[pos] === 0x00) pos++;
      return expr;
    }
  }

  function decodeMtefChar(code: number, font: number): string {
    if (code === 0x3d) return ' = ';
    if (code === 0x2b) return ' + ';
    if (code === 0x2d || code === 0x2212) return ' - ';
    if (code === 0x2f) return '/';
    if (code === 0x28) return '(';
    if (code === 0x29) return ')';
    if (code === 0x5b) return '[';
    if (code === 0x5d) return ']';
    if (code === 0x3b) return '; ';
    if (code === 0x2c) return ', ';
    if (code === 0x2e) return '.';
    if (code === 0x221e || code === 0xa5) return '\\infty ';
    if (code === 0x3c) return ' < ';
    if (code === 0x3e) return ' > ';
    if (code === 0x2264 || code === 0xa3) return ' \\le ';
    if (code === 0x2265 || code === 0xb3) return ' \\ge ';
    if (code === 0x2260 || code === 0xb9) return ' \\ne ';
    if (code === 0x2208 || code === 0xce) return ' \\in ';
    if (code === 0x2192 || code === 0xae) return ' \\to ';
    if (code === 0x222a) return ' \\cup ';
    if (code === 0x2229) return ' \\cap ';
    if (code === 0x3c0) return ' \\pi ';
    if (code >= 0x30 && code <= 0x39) return String.fromCharCode(code);
    if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) return String.fromCharCode(code);
    if (code === 0x20) return ' ';
    // Ký tự Hy Lạp (Symbol font)
    if (code === 0x61 && font === 2) return '\\alpha ';
    if (code === 0x62 && font === 2) return '\\beta ';
    if (code === 0x67 && font === 2) return '\\gamma ';
    if (code === 0x71 && font === 2) return '\\theta ';
    if (code === 0x64 && font === 2) return '\\delta ';
    if (code >= 32 && code <= 126) return String.fromCharCode(code);
    return '';
  }

  function cleanMathText(str: string): string {
    return normalizeMathFormula(str || '')
      .replace(/\s+/g, ' ')
      .replace(/_{}/g, '')
      .replace(/\^{}/g, '')
      .trim();
  }

  const raw = parseLine().trim();
  return cleanMathText(raw);
}

function findSubarrayIndex(arr: Uint8Array, sub: number[], startOffset: number = 0): number {
  const len = arr.length;
  const subLen = sub.length;
  if (subLen === 0 || len < subLen) return -1;

  for (let i = startOffset; i <= len - subLen; i++) {
    let match = true;
    for (let j = 0; j < subLen; j++) {
      if (arr[i + j] !== sub[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}
