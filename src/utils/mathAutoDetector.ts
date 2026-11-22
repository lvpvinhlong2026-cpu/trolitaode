/**
 * mathAutoDetector.ts
 * Tiện ích tự động nhận diện và chuyển đổi công thức Toán học khi copy/dán
 * Hỗ trợ chuyển đổi:
 * - Ký tự mũ/chỉ số Unicode (x², x³, x₁, x₂, uₙ, ...)
 * - Ký hiệu Toán học Unicode (√, ±, ≤, ≥, ≠, π, Δ, ∞, ∈, →, ⇒, °...)
 * - Lệnh LaTeX thô chưa bọc dấu $ (\frac{a}{b}, \sqrt{x}, \vec{u}, \int, ...)
 * - Biểu thức phân thức / hữu tỉ (y = (ax + b)/(cx + d), y = (ax^2 + bx + c)/(px + q), ...)
 * - Biểu thức phương trình / tiệm cận (x = -d/c, y = a/c, y = 2x^2 + 1, f(x) = ..., y' = ...)
 * - Hỗ trợ bóc tách MathML / Word OMML từ Clipboard HTML khi dán từ Microsoft Word / Web.
 * - Bảo vệ thông minh: KHÔNG làm hỏng ngày tháng (17/10/2026), giờ giấc (10h15), tiếng Việt thông thường (trang 16, vd2, vd3...).
 */

// Bảng ánh xạ chỉ số trên (Superscripts)
const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')',
  'ⁿ': 'n', 'ⁱ': 'i', 'ᵃ': 'a', 'ᵇ': 'b', 'ˣ': 'x', 'ʸ': 'y'
};

// Bảng ánh xạ chỉ số dưới (Subscripts)
const SUBSCRIPT_MAP: Record<string, string> = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  '₊': '+', '₋': '-', '₌': '=', '₍': '(', '₎': ')',
  'ₙ': 'n', 'ᵢ': 'i', 'ₘ': 'm', 'ₖ': 'k', 'ⱼ': 'j',
  'ₐ': 'a', 'ₑ': 'e', 'ₒ': 'o', 'ₓ': 'x'
};

// Bảng ký hiệu toán học Unicode phổ biến
const UNICODE_MATH_SYMBOLS: [RegExp, string][] = [
  [/±/g, '\\pm '],
  [/≤/g, '\\le '],
  [/≥/g, '\\ge '],
  [/≠/g, '\\ne '],
  [/≈/g, '\\approx '],
  [/≡/g, '\\equiv '],
  [/×/g, '\\times '],
  [/÷/g, '\\div '],
  [/·|•/g, '\\cdot '],
  [/∞/g, '\\infty '],
  [/∈/g, '\\in '],
  [/∉/g, '\\notin '],
  [/⊂/g, '\\subset '],
  [/⊆/g, '\\subseteq '],
  [/∪/g, '\\cup '],
  [/∩/g, '\\cap '],
  [/∅/g, '\\emptyset '],
  [/∀/g, '\\forall '],
  [/∃/g, '\\exists '],
  [/⇒/g, '\\Rightarrow '],
  [/⇔/g, '\\Leftrightarrow '],
  [/→/g, '\\to '],
  [/∫/g, '\\int '],
  [/∑/g, '\\sum '],
  [/∏/g, '\\prod '],
  [/∂/g, '\\partial '],
  [/∇/g, '\\nabla '],
  [/∠/g, '\\angle '],
  [/⊥/g, '\\perp '],
  [/∥/g, '\\parallel '],
  [/Δ/g, '\\Delta '],
  [/π/g, '\\pi '],
  [/α/g, '\\alpha '],
  [/β/g, '\\beta '],
  [/γ/g, '\\gamma '],
  [/δ/g, '\\delta '],
  [/ε/g, '\\varepsilon '],
  [/θ/g, '\\theta '],
  [/λ/g, '\\lambda '],
  [/μ/g, '\\mu '],
  [/σ/g, '\\sigma '],
  [/ω/g, '\\omega '],
  [/φ/g, '\\phi '],
  [/Ω/g, '\\Omega ']
];

// Danh sách các lệnh LaTeX nhận diện công thức toán thô
const LATEX_COMMAND_REGEX = /\\(frac|sqrt|int|sum|lim|vec|overrightarrow|mathbf|mathrm|text|left|right|begin|end|alpha|beta|gamma|Delta|delta|theta|lambda|pi|sigma|omega|pm|le|ge|ne|approx|times|div|cdot|infty|in|to|Rightarrow|Leftrightarrow|sin|cos|tan|cot|ln|log|cup|cap|subset|forall|exists|circ)\b/;

/**
 * Kiểm tra nhanh xem văn bản có chứa ký hiệu toán học hoặc công thức không
 */
export function containsMath(text: string): boolean {
  if (!text) return false;
  if (text.includes('$')) return true;
  if (LATEX_COMMAND_REGEX.test(text)) return true;
  if (/[²³⁴⁵⁶⁷⁸⁹ⁿ¹₀₁₂₃₄₅₆₇₈₉ₙ√±≤≥≠πΔ∞∈⇒⇔]/.test(text)) return true;
  if (/\b(f\(x\)|y\s*=|g\(x\)|h\(x\)|P\(x\)|y'\s*=)\b/.test(text)) return true;
  if (/[a-zA-Z]\^[0-9a-zA-Z]/.test(text)) return true;
  if (/\([^()]+\)\s*\/\s*\([^()]+\)/.test(text)) return true;
  return false;
}

/**
 * Chuyển các ký tự số mũ và chỉ số dưới Unicode sang định dạng ^n và _n của LaTeX
 */
function convertUnicodeSubSuper(text: string): string {
  let result = text;

  // Nhóm chuỗi số mũ Unicode liên tiếp (ví dụ: x² hay x²³)
  result = result.replace(/([a-zA-Z0-9\)])([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿⁱᵃᵇˣʸ]+)/g, (_, base, supers) => {
    const converted = supers.split('').map((c: string) => SUPERSCRIPT_MAP[c] || c).join('');
    return converted.length > 1 ? `${base}^{${converted}}` : `${base}^${converted}`;
  });

  // Nhóm chuỗi chỉ số dưới Unicode liên tiếp (ví dụ: x₁ hay x₁₂)
  result = result.replace(/([a-zA-Z0-9\)])([₀₁₂₃₄₅₆₇₈₉₊₋ₙᵢₘₖⱼₐₑₒₓ]+)/g, (_, base, subs) => {
    const converted = subs.split('').map((c: string) => SUBSCRIPT_MAP[c] || c).join('');
    return converted.length > 1 ? `${base}_{${converted}}` : `${base}_${converted}`;
  });

  return result;
}

/**
 * Chuẩn hóa các ký hiệu căn bậc hai, phân số dạng đơn giản và vectơ
 */
function normalizeMathSymbols(text: string): string {
  let res = text;

  // Căn bậc hai: √(biểu_thức) hoặc √x hoặc √2
  res = res.replace(/√\s*\(([^)]+)\)/g, '\\sqrt{$1}');
  res = res.replace(/√\s*([a-zA-Z0-9]+)/g, '\\sqrt{$1}');
  res = res.replace(/∛\s*\(([^)]+)\)/g, '\\sqrt[3]{$1}');
  res = res.replace(/∛\s*([a-zA-Z0-9]+)/g, '\\sqrt[3]{$1}');

  // Độ: 60° -> 60^\circ, 90° -> 90^\circ
  res = res.replace(/(\d+)\s*°/g, '$1^\\circ');

  // Vectơ dạng: vecto(AB), vt(AB), vec(AB), vecto AB
  res = res.replace(/\b(?:vecto|vt)\s*\(([a-zA-Z]{1,2})\)/gi, '\\vec{$1}');
  res = res.replace(/\b(?:vecto|vt)\s+([A-Z]{1,2})\b/gi, '\\vec{$1}');
  res = res.replace(/\bvec\s*\(([a-zA-Z]{1,2})\)/gi, '\\vec{$1}');

  // Chuyển đổi các ký hiệu Unicode sang mã lệnh LaTeX
  for (const [pattern, replacement] of UNICODE_MATH_SYMBOLS) {
    res = res.replace(pattern, replacement);
  }

  // Phân số dạng (A)/(B) với A, B là biểu thức toán (ví dụ: (ax + b)/(cx + d), (ax^2 + bx + c)/(px + q))
  res = res.replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, (match, num, den) => {
    // Nếu num hoặc den là ngày tháng thì không đổi
    if (/^\d{1,2}$/.test(num.trim()) && /^\d{1,2}$/.test(den.trim())) return match;
    return `\\frac{${num.trim()}}{${den.trim()}}`;
  });

  return res;
}

/**
 * Trích xuất và chuyển đổi MathML / Office Math sang LaTeX từ HTML của clipboard (khi copy từ Word / Web)
 */
export function extractMathFromHtml(html: string): string {
  if (!html || (!html.includes('<math') && !html.includes('<m:oMath') && !html.includes('<m:f>') && !html.includes('mso-element:math'))) {
    return '';
  }

  try {
    if (typeof DOMParser === 'undefined') return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const convertNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }
      const el = node as Element;
      const tag = el.localName.toLowerCase();

      switch (tag) {
        case 'math':
        case 'omath':
        case 'omathpara':
          return Array.from(el.childNodes).map(convertNode).join('');

        case 'mfrac':
        case 'f': {
          const numNode = el.querySelector('num') || el.children[0];
          const denNode = el.querySelector('den') || el.children[1];
          const num = numNode ? convertNode(numNode) : '';
          const den = denNode ? convertNode(denNode) : '';
          return `\\frac{${num.trim()}}{${den.trim()}}`;
        }

        case 'msup':
        case 'ssup': {
          const baseNode = el.querySelector('e') || el.children[0];
          const supNode = el.querySelector('sup') || el.children[1];
          const base = baseNode ? convertNode(baseNode) : '';
          const sup = supNode ? convertNode(supNode) : '';
          return `{${base}}^{${sup}}`;
        }

        case 'msub':
        case 'ssub': {
          const baseNode = el.querySelector('e') || el.children[0];
          const subNode = el.querySelector('sub') || el.children[1];
          const base = baseNode ? convertNode(baseNode) : '';
          const sub = subNode ? convertNode(subNode) : '';
          return `{${base}}_{${sub}}`;
        }

        case 'msubsup':
        case 'ssubsup': {
          const base = el.children[0] ? convertNode(el.children[0]) : '';
          const sub = el.children[1] ? convertNode(el.children[1]) : '';
          const sup = el.children[2] ? convertNode(el.children[2]) : '';
          return `{${base}}_{${sub}}^{${sup}}`;
        }

        case 'msqrt':
        case 'rad': {
          const degNode = el.querySelector('deg');
          const eNode = el.querySelector('e') || (degNode ? el.children[1] : el.children[0]);
          const deg = degNode ? convertNode(degNode).trim() : '';
          const content = eNode ? convertNode(eNode) : Array.from(el.childNodes).map(convertNode).join('');
          return deg ? `\\sqrt[${deg}]{${content}}` : `\\sqrt{${content}}`;
        }

        case 'mroot': {
          const base = el.children[0] ? convertNode(el.children[0]) : '';
          const index = el.children[1] ? convertNode(el.children[1]) : '';
          return `\\sqrt[${index}]{${base}}`;
        }

        case 'mo': {
          const op = el.textContent?.trim() || '';
          if (op === '±') return '\\pm ';
          if (op === '≤') return '\\le ';
          if (op === '≥') return '\\ge ';
          if (op === '≠') return '\\ne ';
          if (op === '×') return '\\times ';
          if (op === '÷') return '\\div ';
          if (op === '·') return '\\cdot ';
          if (op === '→') return '\\to ';
          return op;
        }

        case 'mi':
        case 'mn':
        case 't':
        case 'mtext':
          return el.textContent || '';

        default:
          return Array.from(el.childNodes).map(convertNode).join('');
      }
    };

    const allEls = doc.body.getElementsByTagName('*');
    const toReplace: { el: Element; latex: string }[] = [];

    for (let i = 0; i < allEls.length; i++) {
      const el = allEls[i];
      const name = el.localName.toLowerCase();
      if (name === 'math' || name === 'omath' || name === 'omathpara') {
        const latex = convertNode(el).trim();
        if (latex) {
          toReplace.push({ el, latex: `$${latex}$` });
        }
      }
    }

    toReplace.forEach(({ el, latex }) => {
      const textNode = doc.createTextNode(` ${latex} `);
      el.parentNode?.replaceChild(textNode, el);
    });

    if (toReplace.length > 0) {
      return (doc.body.textContent || '').trim();
    }
  } catch (e) {
    console.warn('Could not parse clipboard HTML for MathML:', e);
  }
  return '';
}

/**
 * Hàm chính: Tự động phát hiện và chuyển đổi công thức Toán khi copy/dán
 * Áp dụng mô hình Tokenizer cách ly các khối công thức, bảo đảm không bị lồng dấu $ sai cú pháp.
 * Giữ nguyên 100% văn bản thường, ngày tháng, giờ giấc, tham chiếu trang.
 */
export function autoConvertMathToLatex(text: string): string {
  if (!text || typeof text !== 'string') return text;

  // BƯỚC 1: BẢO VỆ NỘI DUNG NHẠY CẢM & CÔNG THỨC ĐÃ CHUẨN
  const placeholders: string[] = [];
  const pushMath = (mathContent: string) => {
    const trimmed = mathContent.trim();
    const clean = trimmed.replace(/^\$+|\$+$/g, '').trim();
    if (!clean) return mathContent;
    const token = `___MATH_TOKEN_${placeholders.length}___`;
    placeholders.push(`$${clean}$`);
    return token;
  };

  const protectedNonMath: string[] = [];
  const pushProtected = (content: string) => {
    const token = `___PROT_TOKEN_${protectedNonMath.length}___`;
    protectedNonMath.push(content);
    return token;
  };

  let working = text;

  // 1.1 Bảo vệ khối mã code Markdown
  working = working.replace(/```[\s\S]*?```/g, pushProtected);
  working = working.replace(/`[^`]+`/g, pushProtected);

  // 1.2 Bảo vệ các công thức $$...$$ và $...$ đã có sẵn
  working = working.replace(/\$\$[\s\S]*?\$\$/g, (m) => {
    const token = `___MATH_TOKEN_${placeholders.length}___`;
    placeholders.push(m);
    return token;
  });
  working = working.replace(/\$[^$\n]+\$/g, (m) => {
    const token = `___MATH_TOKEN_${placeholders.length}___`;
    placeholders.push(m);
    return token;
  });

  // 1.3 Bảo vệ URL / Link web
  working = working.replace(/https?:\/\/[^\s)]+/g, pushProtected);

  // 1.4 Bảo vệ ngày tháng (ví dụ: 17/10/2026, 24/10/2026) và giờ giấc (10h15, 08h00)
  working = working.replace(/\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/g, pushProtected);
  working = working.replace(/\b\d{1,2}[hH:]\d{2}\b/g, pushProtected);

  // 1.5 Bảo vệ các tham chiếu trang, câu, ví dụ tiếng Việt (trang 16, trang 17, vd2, vd3, vd4, câu 3, bài 1...)
  working = working.replace(/\b(?:trang|vd|ví dụ|bài|câu)\s*\d+\b/gi, pushProtected);

  // BƯỚC 2: CHUYỂN ĐỔI CHỈ SỐ MŨ & DƯỚI UNICODE
  working = convertUnicodeSubSuper(working);

  // BƯỚC 3: CHUẨN HÓA KÝ HIỆU TOÁN HỌC UNICODE & PHÂN SỐ (A)/(B)
  working = normalizeMathSymbols(working);

  // BƯỚC 4: NHẬN DIỆN VÀ BỌC TỪNG CÔNG THỨC TOÁN HỌC VÀO $...$ VÀ THAY BẰNG TOKEN CÁCH LY
  
  // 4.1 Cụm công thức chứa lệnh LaTeX (\frac, \sqrt, \int...) kèm vế trái y =, f(x) =
  // Ví dụ: y = \frac{ax + b}{cx + d} ; y = \frac{ax^2 + bx + c}{px + q}
  const latexClusterRegex = /(?:(?:\b[a-zA-Z]\([a-zA-Z0-9]\)|\b[a-zA-Z0-9_']+|\([a-zA-Z0-9_]+\))\s*=\s*)?(?:\\(?:frac|sqrt|int|sum|lim|vec|alpha|beta|gamma|Delta|delta|theta|lambda|pi|sigma|omega|pm|le|ge|ne|approx|times|div|cdot|infty|in|to|Rightarrow|Leftrightarrow|sin|cos|tan|cot|ln|log|circ)\b[^{}()\s,;:?!]*(\{.*?\}|\(.*?\)|\[.*?\])*[0-9a-zA-Z_+\-*/^\\()=[\]\s]*(?:\{.*?\}|\(.*?\)|\[.*?\])*)/g;
  working = working.replace(latexClusterRegex, (match) => {
    const trimmed = match.trim();
    if (trimmed.length < 2) return match;
    return pushMath(trimmed);
  });

  // 4.2 Phương trình phân số đơn giản dạng tiệm cận / giá trị: x = -d/c, y = a/c, y = 1/2x + 1
  const simpleFractionEquation = /\b([a-zA-Z]\([a-zA-Z0-9]\)|[a-zA-Z])\s*=\s*([+\-]?(?:[a-zA-Z0-9]+|[0-9]+)\/[a-zA-Z0-9]+)(?=[,;.?!]|\s|$)/g;
  working = working.replace(simpleFractionEquation, (match, lhs, rhs) => {
    const parts = rhs.split('/');
    if (parts.length === 2) {
      return pushMath(`${lhs} = \\frac{${parts[0].trim()}}{${parts[1].trim()}}`);
    }
    return match;
  });

  // 4.3 Nhận diện phương trình đa thức: y = 2x^2 + 3x - 1, f(x) = x^3 - 3x, y' = 3x^2 - 3, ax^2 + bx + c = 0
  const polyEquationRegex = /\b([a-zA-Z]\([a-zA-Z0-9]\)|[a-zA-Z]'*)\s*=\s*([a-zA-Z0-9_+\-*/^() ]*[a-zA-Z0-9^][a-zA-Z0-9_+\-*/^() ]*)(?=[,;.?!]|\s|$)/g;
  working = working.replace(polyEquationRegex, (match, lhs, rhs) => {
    if (/[+\-*/^]/.test(rhs) || (/[a-zA-Z]/.test(rhs) && /[0-9]/.test(rhs))) {
      return pushMath(match);
    }
    return match;
  });

  // 4.4 Nhận diện lũy thừa độc lập: x^2, x^3, (x-1)^2, 2^x, a^n
  const powerRegex = /\b(\([a-zA-Z0-9_+\- ]+\)|[a-zA-Z0-9_]+)\^(\{?[0-9a-zA-Z+\-_]+\}?)/g;
  working = working.replace(powerRegex, (match) => {
    return pushMath(match);
  });

  // 4.5 Nhận diện biến chỉ số toán học: x_1, x_2, u_n, x_0, y_0
  const indexedVarRegex = /\b([a-zA-Z]_[0-9a-zA-Z{}]+(?:\s*,\s*[a-zA-Z]_[0-9a-zA-Z{}]+)*)\b/g;
  working = working.replace(indexedVarRegex, (match) => {
    return pushMath(match);
  });

  // 4.6 Nhận diện đường cong đồ thị hình học: (C), (P), (d), (d1), (d2)
  const geoCurveRegex = /\b\(([CPd]|\\[a-zA-Z]+|[dD]\d+)\)\b/g;
  working = working.replace(geoCurveRegex, (match) => {
    return pushMath(match);
  });

  // 4.7 Nhận diện tọa độ điểm: A(1; 2), B(-1; 0; 3), M(x; y)
  const pointCoordRegex = /\b([A-Z]\([-+]?\d+(?:\.\d+)?;\s*[-+]?\d+(?:\.\d+)?(?:;\s*[-+]?\d+(?:\.\d+)?)?\))\b/g;
  working = working.replace(pointCoordRegex, (match) => {
    return pushMath(match);
  });

  // BƯỚC 5: KHÔI PHỤC TOKENS
  // 5.1 Khôi phục Math tokens
  for (let i = placeholders.length - 1; i >= 0; i--) {
    const token = `___MATH_TOKEN_${i}___`;
    working = working.replace(token, placeholders[i]);
  }

  // 5.2 Khôi phục Protected non-math tokens
  for (let i = protectedNonMath.length - 1; i >= 0; i--) {
    const token = `___PROT_TOKEN_${i}___`;
    working = working.replace(token, protectedNonMath[i]);
  }

  // 5.3 Dọn dẹp khoảng trắng trước các dấu câu
  working = working.replace(/\s+([,;.?!])/g, '$1');

  return working;
}

/**
 * Xử lý văn bản được dán từ Clipboard:
 * Trả về chuỗi kết quả và số lượng công thức toán học phát hiện được
 */
export function formatPastedMath(text: string): {
  convertedText: string;
  mathCount: number;
  changed: boolean;
} {
  if (!text) {
    return { convertedText: text, mathCount: 0, changed: false };
  }

  const convertedText = autoConvertMathToLatex(text);
  const changed = convertedText !== text;

  // Đếm số lượng công thức $...$ trong văn bản
  const matches = convertedText.match(/\$[^$\n]+\$/g) || [];
  const mathCount = matches.length;

  return {
    convertedText,
    mathCount,
    changed
  };
}
