/**
 * BBT (Bảng Biến Thiên) Engine - Bộ phân tích và vẽ Bảng Biến Thiên chuẩn SGK Việt Nam (300 DPI)
 * Hỗ trợ các dạng hàm số theo chương trình GDPT:
 * 1. Hàm bậc 3: y = ax^3 + bx^2 + cx + d
 * 2. Hàm bậc 4 trùng phương: y = ax^4 + bx^2 + c
 * 3. Hàm phân thức bậc nhất / bậc nhất: y = (ax + b) / (cx + d)
 * 4. Hàm phân thức bậc hai / bậc nhất: y = (ax^2 + bx + c) / (dx + e)
 */

export type MathStrokeChoice = 'thin' | 'standard' | 'bold';

export interface BBTPoint {
  xLabel: string;
  yPrimeSymbol: string; // '0', '||', or ''
  yValue: string;       // e.g. '+∞', '-4', '2', '-∞'
  yPos: 'top' | 'mid' | 'bottom';
  isDoubleBar?: boolean; // vạch kép ||
  leftLimit?: string;
  rightLimit?: string;
}

export interface BBTData {
  fnDisplay: string;
  fnType: 'cubic' | 'quartic' | 'rational_1_1' | 'rational_2_1' | 'custom';
  points: BBTPoint[];
  intervals: {
    sign: '+' | '-';
  }[];
}

export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/**
 * Chuyển đổi một số thực thành phân số tối giản (num/den)
 * Hỗ trợ các phân số mẫu số lớn tới 2000 hoặc số thập phân như 0.48 -> 12/25
 */
export function toFraction(
  val: number,
  maxDenominator = 2000,
  tolerance = 1e-5
): { num: number; den: number } | null {
  if (isNaN(val) || !isFinite(val)) return null;
  const isNegative = val < 0;
  const x = Math.abs(val);

  if (Math.abs(x - Math.round(x)) < tolerance) {
    return { num: (isNegative ? -1 : 1) * Math.round(x), den: 1 };
  }

  // 1. Kiểm tra số thập phân hữu hạn (ví dụ: 0.48 -> 48/100 -> 12/25, 0.04 -> 1/25, 0.125 -> 1/8)
  for (let dec = 1; dec <= 6; dec++) {
    const scale = Math.pow(10, dec);
    const scaled = Math.round(x * scale);
    if (Math.abs(x - scaled / scale) < 1e-7) {
      const g = gcd(scaled, scale);
      const d = scale / g;
      if (d <= maxDenominator) {
        return { num: (isNegative ? -1 : 1) * (scaled / g), den: d };
      }
    }
  }

  // 2. Thuật toán Liên phân số (Continued Fractions) cho số thập phân tuần hoàn hoặc phép chia phân số thực tế
  let h1 = 1, h2 = 0;
  let k1 = 0, k2 = 1;
  let b = x;

  for (let i = 0; i < 25; i++) {
    const a = Math.floor(b);
    const h = a * h1 + h2;
    const k = a * k1 + k2;

    if (k > maxDenominator) break;

    h2 = h1;
    h1 = h;
    k2 = k1;
    k1 = k;

    const diff = Math.abs(x - h / k);
    if (diff < tolerance) {
      return { num: (isNegative ? -1 : 1) * h, den: k };
    }

    const rem = b - a;
    if (rem < 1e-9) break;
    b = 1 / rem;
  }

  if (k1 > 1 && Math.abs(x - h1 / k1) < 1e-4) {
    return { num: (isNegative ? -1 : 1) * h1, den: k1 };
  }

  return null;
}

export function simplifySquareRoot(k: number): string {
  if (k <= 0) return '';
  let coef = 1;
  let rem = k;
  for (let d = 2; d * d <= rem; d++) {
    while (rem % (d * d) === 0) {
      coef *= d;
      rem /= (d * d);
    }
  }
  if (rem === 1) return coef.toString();
  if (coef === 1) return `√${rem}`;
  return `${coef}√${rem}`;
}

export function checkSquareRoot(n: number): string | null {
  const sign = n < 0 ? '-' : '';
  const absN = Math.abs(n);
  const sq = absN * absN;

  // 1. Căn bậc 2 nguyên: √2, √3, 2√2...
  const roundSq = Math.round(sq);
  if (roundSq > 0 && roundSq <= 100 && Math.abs(sq - roundSq) < 1e-4) {
    const s = Math.round(Math.sqrt(roundSq));
    if (s * s !== roundSq) {
      return `${sign}${simplifySquareRoot(roundSq)}`;
    }
  }

  // 2. Căn bậc 2 dạng phân số: √2/2 (sq = 1/2), √3/2 (sq = 3/4), √3/3 (sq = 1/3)...
  const sqFrac = toFraction(sq, 16, 1e-5);
  if (sqFrac && sqFrac.den > 1 && [2, 3, 4, 5, 6].includes(sqFrac.den)) {
    let num = sqFrac.num;
    let den = sqFrac.den;
    let sDen = Math.round(Math.sqrt(den));
    if (sDen * sDen !== den) {
      num *= den;
      den *= den;
      sDen = Math.round(Math.sqrt(den));
    }
    const topStr = simplifySquareRoot(num);
    if (topStr.includes('√')) {
      return `${sign}${topStr}/${sDen}`;
    }
  }

  return null;
}

export function formatNum(n: number): string {
  if (n === null || n === undefined || isNaN(n)) return '';
  if (!isFinite(n)) return n > 0 ? '+∞' : '-∞';
  if (Math.abs(n) < 1e-5) return '0';
  if (Math.abs(n - Math.round(n)) < 1e-5) {
    return Math.round(n).toString();
  }

  // 1. Kiểm tra căn thức toán học (ví dụ: √2, -√3, √2/2)
  const sqrtStr = checkSquareRoot(n);
  if (sqrtStr) return sqrtStr;

  // 2. Chuyển đổi thành phân số toán học chuẩn SGK (chỉ dùng phân số nếu mẫu số nhỏ gọn <= 24)
  const frac = toFraction(n, 24, 1e-4);
  if (frac && frac.den > 1 && frac.den <= 24) {
    return `${frac.num}/${frac.den}`;
  }

  return n.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Phân tích trực tiếp từ các hệ số a, b, c, d, e
 */
export function analyzeFromCoeffs(
  type: 'cubic' | 'quartic' | 'rational_1_1' | 'rational_2_1',
  a: number,
  b: number,
  c: number,
  d: number = 0,
  e: number = 0
): BBTData {
  if (type === 'rational_2_1') {
    return analyzeRational21Coeffs(a, b, c, d, e);
  }
  if (type === 'rational_1_1') {
    return analyzeRational11Coeffs(a, b, c, d);
  }
  if (type === 'quartic') {
    return analyzeQuarticCoeffs(a, b, c);
  }
  return analyzeCubicCoeffs(a, b, c, d);
}

export function formatPolyExpr(type: string, a: number, b: number, c: number, d: number = 0, e: number = 0): string {
  if (type === 'cubic') {
    let s = (a === 1 ? '' : a === -1 ? '-' : a) + 'x^3';
    if (b !== 0) s += (b > 0 ? ' + ' : ' - ') + (Math.abs(b) === 1 ? '' : Math.abs(b)) + 'x^2';
    if (c !== 0) s += (c > 0 ? ' + ' : ' - ') + (Math.abs(c) === 1 ? '' : Math.abs(c)) + 'x';
    if (d !== 0) s += (d > 0 ? ' + ' : ' - ') + Math.abs(d);
    return s;
  }
  if (type === 'quartic') {
    let s = (a === 1 ? '' : a === -1 ? '-' : a) + 'x^4';
    if (b !== 0) s += (b > 0 ? ' + ' : ' - ') + (Math.abs(b) === 1 ? '' : Math.abs(b)) + 'x^2';
    if (c !== 0) s += (c > 0 ? ' + ' : ' - ') + Math.abs(c);
    return s;
  }
  if (type === 'rational_1_1') {
    let num = (a === 1 ? '' : a === -1 ? '-' : a) + 'x';
    if (b !== 0) num += (b > 0 ? ' + ' : ' - ') + Math.abs(b);
    let den = (c === 1 ? '' : c === -1 ? '-' : c) + 'x';
    if (d !== 0) den += (d > 0 ? ' + ' : ' - ') + Math.abs(d);
    return `(${num})/(${den})`;
  }
  if (type === 'rational_2_1') {
    let num = (a === 1 ? '' : a === -1 ? '-' : a) + 'x^2';
    if (b !== 0) num += (b > 0 ? ' + ' : ' - ') + (Math.abs(b) === 1 ? '' : Math.abs(b)) + 'x';
    if (c !== 0) num += (c > 0 ? ' + ' : ' - ') + Math.abs(c);
    let den = (d === 1 ? '' : d === -1 ? '-' : d) + 'x';
    if (e !== 0) den += (e > 0 ? ' + ' : ' - ') + Math.abs(e);
    return `(${num})/(${den})`;
  }
  return '';
}

/**
 * 1. Hàm bậc 3: y = ax^3 + bx^2 + cx + d
 */
export function analyzeCubicCoeffs(a: number, b: number, c: number, d: number): BBTData {
  if (a === 0) a = 1;
  const expr = formatPolyExpr('cubic', a, b, c, d);

  // y' = 3ax^2 + 2bx + c
  const A = 3 * a;
  const B = 2 * b;
  const C = c;
  const delta = B * B - 4 * A * C;
  const f = (x: number) => a * x * x * x + b * x * x + c * x + d;

  if (delta > 1e-7) {
    let x1 = (-B - Math.sqrt(delta)) / (2 * A);
    let x2 = (-B + Math.sqrt(delta)) / (2 * A);
    if (x1 > x2) { const t = x1; x1 = x2; x2 = t; }

    const y1 = f(x1);
    const y2 = f(x2);

    if (a > 0) {
      return {
        fnDisplay: expr,
        fnType: 'cubic',
        points: [
          { xLabel: '-∞', yPrimeSymbol: '', yValue: '-∞', yPos: 'bottom' },
          { xLabel: formatNum(x1), yPrimeSymbol: '0', yValue: formatNum(y1), yPos: 'top' },
          { xLabel: formatNum(x2), yPrimeSymbol: '0', yValue: formatNum(y2), yPos: 'bottom' },
          { xLabel: '+∞', yPrimeSymbol: '', yValue: '+∞', yPos: 'top' },
        ],
        intervals: [{ sign: '+' }, { sign: '-' }, { sign: '+' }]
      };
    } else {
      return {
        fnDisplay: expr,
        fnType: 'cubic',
        points: [
          { xLabel: '-∞', yPrimeSymbol: '', yValue: '+∞', yPos: 'top' },
          { xLabel: formatNum(x1), yPrimeSymbol: '0', yValue: formatNum(y1), yPos: 'bottom' },
          { xLabel: formatNum(x2), yPrimeSymbol: '0', yValue: formatNum(y2), yPos: 'top' },
          { xLabel: '+∞', yPrimeSymbol: '', yValue: '-∞', yPos: 'bottom' },
        ],
        intervals: [{ sign: '-' }, { sign: '+' }, { sign: '-' }]
      };
    }
  }

  // Đơn điệu không cực trị
  return {
    fnDisplay: expr,
    fnType: 'cubic',
    points: [
      { xLabel: '-∞', yPrimeSymbol: '', yValue: a > 0 ? '-∞' : '+∞', yPos: a > 0 ? 'bottom' : 'top' },
      { xLabel: '+∞', yPrimeSymbol: '', yValue: a > 0 ? '+∞' : '-∞', yPos: a > 0 ? 'top' : 'bottom' },
    ],
    intervals: [{ sign: a > 0 ? '+' : '-' }]
  };
}

/**
 * 2. Hàm bậc 4 trùng phương: y = ax^4 + bx^2 + c
 */
export function analyzeQuarticCoeffs(a: number, b: number, c: number): BBTData {
  if (a === 0) a = 1;
  const expr = `${a === 1 ? '' : a === -1 ? '-' : a}x^4 ${b > 0 ? '+ ' + b : b < 0 ? '- ' + Math.abs(b) : ''}x^2 ${c > 0 ? '+ ' + c : c < 0 ? '- ' + Math.abs(c) : ''}`.trim();
  const f = (x: number) => a * Math.pow(x, 4) + b * x * x + c;

  const negBover2A = -b / (2 * a);
  if (negBover2A > 1e-6) {
    const x0 = Math.sqrt(negBover2A);
    const x1 = -x0;
    const x2 = 0;
    const x3 = x0;
    const y1 = f(x1);
    const y2 = f(x2);
    const y3 = f(x3);

    if (a > 0) {
      return {
        fnDisplay: expr,
        fnType: 'quartic',
        points: [
          { xLabel: '-∞', yPrimeSymbol: '', yValue: '+∞', yPos: 'top' },
          { xLabel: formatNum(x1), yPrimeSymbol: '0', yValue: formatNum(y1), yPos: 'bottom' },
          { xLabel: '0', yPrimeSymbol: '0', yValue: formatNum(y2), yPos: 'top' },
          { xLabel: formatNum(x3), yPrimeSymbol: '0', yValue: formatNum(y3), yPos: 'bottom' },
          { xLabel: '+∞', yPrimeSymbol: '', yValue: '+∞', yPos: 'top' },
        ],
        intervals: [{ sign: '-' }, { sign: '+' }, { sign: '-' }, { sign: '+' }]
      };
    } else {
      return {
        fnDisplay: expr,
        fnType: 'quartic',
        points: [
          { xLabel: '-∞', yPrimeSymbol: '', yValue: '-∞', yPos: 'bottom' },
          { xLabel: formatNum(x1), yPrimeSymbol: '0', yValue: formatNum(y1), yPos: 'top' },
          { xLabel: '0', yPrimeSymbol: '0', yValue: formatNum(y2), yPos: 'bottom' },
          { xLabel: formatNum(x3), yPrimeSymbol: '0', yValue: formatNum(y3), yPos: 'top' },
          { xLabel: '+∞', yPrimeSymbol: '', yValue: '-∞', yPos: 'bottom' },
        ],
        intervals: [{ sign: '+' }, { sign: '-' }, { sign: '+' }, { sign: '-' }]
      };
    }
  }

  // 1 cực trị tại x = 0
  const y0 = f(0);
  return {
    fnDisplay: expr,
    fnType: 'quartic',
    points: [
      { xLabel: '-∞', yPrimeSymbol: '', yValue: a > 0 ? '+∞' : '-∞', yPos: a > 0 ? 'top' : 'bottom' },
      { xLabel: '0', yPrimeSymbol: '0', yValue: formatNum(y0), yPos: a > 0 ? 'bottom' : 'top' },
      { xLabel: '+∞', yPrimeSymbol: '', yValue: a > 0 ? '+∞' : '-∞', yPos: a > 0 ? 'top' : 'bottom' },
    ],
    intervals: [{ sign: a > 0 ? '-' : '+' }, { sign: a > 0 ? '+' : '-' }]
  };
}

/**
 * 3. Hàm phân thức bậc nhất / bậc nhất: y = (ax + b) / (cx + d)
 */
export function analyzeRational11Coeffs(a: number, b: number, c: number, d: number): BBTData {
  if (c === 0) c = 1;
  const xTC = -d / c;
  const yTC = a / c;
  const det = a * d - b * c;
  const sign: '+' | '-' = det > 0 ? '+' : '-';
  const expr = `(${a}x ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)})/(${c}x ${d >= 0 ? '+ ' + d : '- ' + Math.abs(d)})`;

  return {
    fnDisplay: expr,
    fnType: 'rational_1_1',
    points: [
      { xLabel: '-∞', yPrimeSymbol: '', yValue: formatNum(yTC), yPos: 'mid' },
      { 
        xLabel: formatNum(xTC), 
        yPrimeSymbol: '||', 
        yValue: '', 
        yPos: 'mid', 
        isDoubleBar: true,
        leftLimit: sign === '+' ? '+∞' : '-∞',
        rightLimit: sign === '+' ? '-∞' : '+∞'
      },
      { xLabel: '+∞', yPrimeSymbol: '', yValue: formatNum(yTC), yPos: 'mid' },
    ],
    intervals: [{ sign }, { sign }]
  };
}

/**
 * 4. Hàm phân thức bậc hai / bậc nhất: y = (ax^2 + bx + c) / (dx + e)
 */
export function analyzeRational21Coeffs(a: number, b: number, c: number, d: number, e: number): BBTData {
  if (d === 0) d = 1;
  if (a === 0) a = 1;

  const xTC = -e / d; // Điểm không xác định (tiệm cận đứng)
  const A = a * d;
  const B = 2 * a * e;
  const C = b * e - c * d;
  const deltaPrime = (a * e) * (a * e) - A * C;
  const f = (x: number) => (a * x * x + b * x + c) / (d * x + e);
  const expr = `(${a}x^2 ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}x ${c >= 0 ? '+ ' + c : '- ' + Math.abs(c)})/(${d}x ${e >= 0 ? '+ ' + e : '- ' + Math.abs(e)})`;

  // Giới hạn tại vô cực
  const limNegInf = (a / d > 0) ? '-∞' : '+∞';
  const limPosInf = (a / d > 0) ? '+∞' : '-∞';

  // Giới hạn 2 phía tại tiệm cận đứng xTC
  const N = a * xTC * xTC + b * xTC + c;
  const leftLimSign = (N / -d) > 0 ? '+∞' : '-∞';
  const rightLimSign = (N / d) > 0 ? '+∞' : '-∞';

  if (deltaPrime > 1e-6) {
    let r1 = (-a * e - Math.sqrt(deltaPrime)) / A;
    let r2 = (-a * e + Math.sqrt(deltaPrime)) / A;
    if (r1 > r2) { const t = r1; r1 = r2; r2 = t; }

    const y1 = f(r1);
    const y2 = f(r2);

    if (A > 0) {
      // ad > 0: -inf (bottom) -> r1 (top, cực đại) -> xTC^- (bottom, -inf) || xTC^+ (top, +inf) -> r2 (bottom, cực tiểu) -> +inf (top)
      return {
        fnDisplay: expr,
        fnType: 'rational_2_1',
        points: [
          { xLabel: '-∞', yPrimeSymbol: '', yValue: limNegInf, yPos: 'bottom' },
          { xLabel: formatNum(r1), yPrimeSymbol: '0', yValue: formatNum(y1), yPos: 'top' },
          { 
            xLabel: formatNum(xTC), 
            yPrimeSymbol: '||', 
            yValue: '', 
            yPos: 'mid', 
            isDoubleBar: true, 
            leftLimit: leftLimSign, 
            rightLimit: rightLimSign 
          },
          { xLabel: formatNum(r2), yPrimeSymbol: '0', yValue: formatNum(y2), yPos: 'bottom' },
          { xLabel: '+∞', yPrimeSymbol: '', yValue: limPosInf, yPos: 'top' },
        ],
        intervals: [{ sign: '+' }, { sign: '-' }, { sign: '-' }, { sign: '+' }]
      };
    } else {
      // ad < 0
      return {
        fnDisplay: expr,
        fnType: 'rational_2_1',
        points: [
          { xLabel: '-∞', yPrimeSymbol: '', yValue: limNegInf, yPos: 'top' },
          { xLabel: formatNum(r1), yPrimeSymbol: '0', yValue: formatNum(y1), yPos: 'bottom' },
          { 
            xLabel: formatNum(xTC), 
            yPrimeSymbol: '||', 
            yValue: '', 
            yPos: 'mid', 
            isDoubleBar: true, 
            leftLimit: leftLimSign, 
            rightLimit: rightLimSign 
          },
          { xLabel: formatNum(r2), yPrimeSymbol: '0', yValue: formatNum(y2), yPos: 'top' },
          { xLabel: '+∞', yPrimeSymbol: '', yValue: limPosInf, yPos: 'bottom' },
        ],
        intervals: [{ sign: '-' }, { sign: '+' }, { sign: '+' }, { sign: '-' }]
      };
    }
  }

  // deltaPrime <= 0: đơn điệu trên từng khoảng
  const sign: '+' | '-' = A > 0 ? '+' : '-';
  return {
    fnDisplay: expr,
    fnType: 'rational_2_1',
    points: [
      { xLabel: '-∞', yPrimeSymbol: '', yValue: limNegInf, yPos: sign === '+' ? 'bottom' : 'top' },
      { 
        xLabel: formatNum(xTC), 
        yPrimeSymbol: '||', 
        yValue: '', 
        yPos: 'mid', 
        isDoubleBar: true, 
        leftLimit: leftLimSign, 
        rightLimit: rightLimSign 
      },
      { xLabel: '+∞', yPrimeSymbol: '', yValue: limPosInf, yPos: sign === '+' ? 'top' : 'bottom' },
    ],
    intervals: [{ sign }, { sign }]
  };
}

/**
 * Phân tích hằng số tự do ở cuối biểu thức (hỗ trợ số nguyên, số thập phân 0.48 và phân số 12/25)
 */
export function parseConstant(expr: string): number {
  if (!expr) return 0;
  const m = expr.match(/([+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:\/\d+)?)$/);
  if (!m) return 0;
  const str = m[1];
  if (str.includes('/')) {
    const [num, den] = str.split('/');
    const n = parseFloat(num);
    const d = parseFloat(den);
    return (!isNaN(n) && !isNaN(d) && d !== 0) ? n / d : 0;
  }
  return parseFloat(str) || 0;
}

export interface IntervalMinMaxInfo {
  minVal: number | null;
  minAt: number[];
  maxVal: number | null;
  maxAt: number[];
  hasAsymptote: boolean;
}

export interface IntervalAnalysisResult {
  bbt: BBTData;
  minMax: IntervalMinMaxInfo;
}

/**
 * Trích xuất hệ số hàm số từ chuỗi biểu thức f(x)
 */
export function parseFunctionCoeffs(input: string): {
  type: 'cubic' | 'quartic' | 'rational_1_1' | 'rational_2_1';
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
} {
  const clean = input.replace(/\s+/g, '').replace(/\*/g, '').replace(/^y=/, '');

  // Kiểm tra nếu là hàm phân thức P(x)/Q(x) có chứa x ở mẫu số
  const parensMatch = clean.match(/^\((.+)\)\/\((.+)\)$/);
  const denParensMatch = !parensMatch ? clean.match(/^(.+)\/\((.+)\)$/) : null;
  const numParensMatch = (!parensMatch && !denParensMatch) ? clean.match(/^\((.+)\)\/([a-zA-Z0-9^]+)$/) : null;

  let numPart = '';
  let denPart = '';
  let isRational = false;

  if (parensMatch && parensMatch[2].includes('x')) {
    isRational = true;
    numPart = parensMatch[1];
    denPart = parensMatch[2];
  } else if (denParensMatch && denParensMatch[2].includes('x')) {
    isRational = true;
    numPart = denParensMatch[1].replace(/^\((.+)\)$/, '$1');
    denPart = denParensMatch[2];
  } else if (numParensMatch && numParensMatch[2].includes('x')) {
    isRational = true;
    numPart = numParensMatch[1];
    denPart = numParensMatch[2];
  }

  if (isRational) {
    if (numPart.includes('x^2') || numPart.includes('x2')) {
      // Phân thức bậc 2/1: (ax^2+bx+c)/(dx+e)
      let a = 1, b = 0, c = 0, d = 1, e = 0;
      const aM = numPart.match(/([+-]?(?:\(?\d+\.?\d*(?:\/\d+)?\)?|\(?\d*\.?\d+(?:\/\d+)?\)?)?)x\^?2/i);
      if (aM) a = parseCoeff(aM[0], 'x\\^?2');
      const bM = numPart.match(/([+-]?(?:\(?\d+\.?\d*(?:\/\d+)?\)?|\(?\d*\.?\d+(?:\/\d+)?\)?)?)x(?!\^)/i);
      if (bM) b = parseCoeff(bM[0], 'x');
      c = parseConstant(numPart.replace(/x\^?2.*$/, ''));
      if (numPart.match(/([+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:\/\d+)?)$/)) {
        c = parseConstant(numPart);
      }

      const dM = denPart.match(/([+-]?(?:\(?\d+\.?\d*(?:\/\d+)?\)?|\(?\d*\.?\d+(?:\/\d+)?\)?)?)x/i);
      if (dM) d = parseCoeff(dM[0], 'x');
      e = parseConstant(denPart);

      return { type: 'rational_2_1', a, b, c, d, e };
    } else {
      // Phân thức bậc 1/1: (ax+b)/(cx+d)
      let a = 1, b = 0, c = 1, d = 0;
      const aM = numPart.match(/([+-]?(?:\(?\d+\.?\d*(?:\/\d+)?\)?|\(?\d*\.?\d+(?:\/\d+)?\)?)?)x/i);
      if (aM) a = parseCoeff(aM[0], 'x');
      b = parseConstant(numPart);

      const cM = denPart.match(/([+-]?(?:\(?\d+\.?\d*(?:\/\d+)?\)?|\(?\d*\.?\d+(?:\/\d+)?\)?)?)x/i);
      if (cM) c = parseCoeff(cM[0], 'x');
      d = parseConstant(denPart);

      return { type: 'rational_1_1', a, b, c, d, e: 0 };
    }
  }

  // Hàm bậc 4 trùng phương: ax^4 + bx^2 + c
  if (clean.includes('x^4') || clean.includes('x4')) {
    let a = 1, b = -2, c = 0;
    const aM = clean.match(/([+-]?(?:\(?\d+\.?\d*(?:\/\d+)?\)?|\(?\d*\.?\d+(?:\/\d+)?\)?)?)x\^?4/i);
    if (aM) a = parseCoeff(aM[0], 'x\\^?4');
    const bM = clean.match(/([+-]?(?:\(?\d+\.?\d*(?:\/\d+)?\)?|\(?\d*\.?\d+(?:\/\d+)?\)?)?)x\^?2/i);
    if (bM) b = parseCoeff(bM[0], 'x\\^?2');
    c = parseConstant(clean);
    return { type: 'quartic', a, b, c, d: 0, e: 0 };
  }

  // Hàm bậc 3: ax^3 + bx^2 + cx + d
  let a = 1, b = 0, c = 0, d = 0;
  const aM = clean.match(/([+-]?(?:\(?\d+\.?\d*(?:\/\d+)?\)?|\(?\d*\.?\d+(?:\/\d+)?\)?)?)x\^?3/i);
  if (aM) a = parseCoeff(aM[0], 'x\\^?3');
  const bM = clean.match(/([+-]?(?:\(?\d+\.?\d*(?:\/\d+)?\)?|\(?\d*\.?\d+(?:\/\d+)?\)?)?)x\^?2/i);
  if (bM) b = parseCoeff(bM[0], 'x\\^?2');
  const cM = clean.match(/([+-]?(?:\(?\d+\.?\d*(?:\/\d+)?\)?|\(?\d*\.?\d+(?:\/\d+)?\)?)?)x(?!\^)/i);
  if (cM) c = parseCoeff(cM[0], 'x');
  d = parseConstant(clean);
  return { type: 'cubic', a, b, c, d, e: 0 };
}

/**
 * Phân tích từ chuỗi biểu thức toán học trên toàn miền xác định
 */
export function analyzeFunction(input: string): BBTData {
  const p = parseFunctionCoeffs(input);
  return analyzeFromCoeffs(p.type, p.a, p.b, p.c, p.d, p.e);
}

/**
 * Phân tích và tạo Bảng biến thiên của hàm số trên một đoạn [a; b]
 * Hỗ trợ tự động tính cực trị trong đoạn và tìm GTLN (Max), GTNN (Min) chuẩn SGK
 */
export function analyzeFromCoeffsOnInterval(
  type: 'cubic' | 'quartic' | 'rational_1_1' | 'rational_2_1',
  a: number,
  b: number,
  c: number,
  d: number = 0,
  e: number = 0,
  rawA: number = 0,
  rawB: number = 2
): IntervalAnalysisResult {
  let intA = Math.min(rawA, rawB);
  let intB = Math.max(rawA, rawB);
  if (Math.abs(intB - intA) < 1e-4) {
    intB = intA + 1;
  }

  // 1. Định nghĩa f(x), f'(x) và tìm nghiệm y' = 0
  let f: (x: number) => number | null;
  let fPrime: (x: number) => number | null;
  const roots: number[] = [];
  let asymptoteX: number | null = null;
  const expr = formatPolyExpr(type, a, b, c, d, e);

  if (type === 'cubic') {
    if (a === 0) a = 1;
    f = (x: number) => a * x * x * x + b * x * x + c * x + d;
    fPrime = (x: number) => 3 * a * x * x + 2 * b * x + c;

    const A = 3 * a;
    const B = 2 * b;
    const C = c;
    const delta = B * B - 4 * A * C;
    if (delta > 1e-7) {
      const r1 = (-B - Math.sqrt(delta)) / (2 * A);
      const r2 = (-B + Math.sqrt(delta)) / (2 * A);
      roots.push(r1, r2);
    }
  } else if (type === 'quartic') {
    if (a === 0) a = 1;
    f = (x: number) => a * Math.pow(x, 4) + b * x * x + c;
    fPrime = (x: number) => 4 * a * x * x * x + 2 * b * x;

    roots.push(0);
    const negBover2A = -b / (2 * a);
    if (negBover2A > 1e-6) {
      const x0 = Math.sqrt(negBover2A);
      roots.push(-x0, x0);
    }
  } else if (type === 'rational_1_1') {
    if (c === 0) c = 1;
    asymptoteX = -d / c;
    f = (x: number) => {
      const den = c * x + d;
      return Math.abs(den) < 1e-5 ? null : (a * x + b) / den;
    };
    const det = a * d - b * c;
    fPrime = (x: number) => {
      const den = c * x + d;
      return Math.abs(den) < 1e-5 ? null : det / (den * den);
    };
  } else {
    // rational_2_1
    if (d === 0) d = 1;
    if (a === 0) a = 1;
    asymptoteX = -e / d;
    f = (x: number) => {
      const den = d * x + e;
      return Math.abs(den) < 1e-5 ? null : (a * x * x + b * x + c) / den;
    };
    fPrime = (x: number) => {
      const den = d * x + e;
      if (Math.abs(den) < 1e-5) return null;
      return (a * d * x * x + 2 * a * e * x + (b * e - c * d)) / (den * den);
    };

    const A = a * d;
    const B = 2 * a * e;
    const C = b * e - c * d;
    const deltaPrime = (a * e) * (a * e) - A * C;
    if (deltaPrime > 1e-6 && Math.abs(A) > 1e-6) {
      const r1 = (-a * e - Math.sqrt(deltaPrime)) / A;
      const r2 = (-a * e + Math.sqrt(deltaPrime)) / A;
      roots.push(r1, r2);
    }
  }

  // 2. Lọc các điểm rơi vào khoảng (intA; intB)
  interface KeyPt {
    x: number;
    kind: 'start' | 'critical' | 'asymptote' | 'end';
  }
  const keyPts: KeyPt[] = [{ x: intA, kind: 'start' }];

  for (const r of roots) {
    if (r > intA + 1e-4 && r < intB - 1e-4 && (asymptoteX === null || Math.abs(r - asymptoteX) > 1e-4)) {
      if (!keyPts.some(p => Math.abs(p.x - r) < 1e-4)) {
        keyPts.push({ x: r, kind: 'critical' });
      }
    }
  }

  if (asymptoteX !== null && asymptoteX > intA + 1e-4 && asymptoteX < intB - 1e-4) {
    keyPts.push({ x: asymptoteX, kind: 'asymptote' });
  }

  keyPts.push({ x: intB, kind: 'end' });
  keyPts.sort((p1, p2) => p1.x - p2.x);

  // 3. Xét dấu y' trên các khoảng
  const intervals: { sign: '+' | '-' }[] = [];
  for (let i = 0; i < keyPts.length - 1; i++) {
    const mid = (keyPts[i].x + keyPts[i + 1].x) / 2;
    const fp = fPrime(mid);
    intervals.push({ sign: (fp !== null && fp >= 0) ? '+' : '-' });
  }

  // 4. Tạo các BBTPoint và gán yPos ('top' | 'bottom' | 'mid')
  const points: BBTPoint[] = [];
  const numPts = keyPts.length;

  for (let i = 0; i < numPts; i++) {
    const kp = keyPts[i];
    if (kp.kind === 'asymptote') {
      let leftLim = '-∞';
      let rightLim = '+∞';
      if (type === 'rational_1_1') {
        const det = a * d - b * c;
        leftLim = det > 0 ? '+∞' : '-∞';
        rightLim = det > 0 ? '-∞' : '+∞';
      } else if (type === 'rational_2_1') {
        const N = a * kp.x * kp.x + b * kp.x + c;
        leftLim = (N / -d) > 0 ? '+∞' : '-∞';
        rightLim = (N / d) > 0 ? '+∞' : '-∞';
      }
      points.push({
        xLabel: formatNum(kp.x),
        yPrimeSymbol: '||',
        yValue: '',
        yPos: 'mid',
        isDoubleBar: true,
        leftLimit: leftLim,
        rightLimit: rightLim
      });
      continue;
    }

    const yVal = f(kp.x);
    const yStr = yVal !== null ? formatNum(yVal) : 'K.X.Đ';

    let yPrimeSym = '';
    if (kp.kind === 'critical') {
      yPrimeSym = '0';
    }

    let yPos: 'top' | 'bottom' | 'mid' = 'mid';
    if (i === 0) {
      const nextSign = intervals[0]?.sign ?? '+';
      yPos = nextSign === '+' ? 'bottom' : 'top';
    } else if (i === numPts - 1) {
      const prevSign = intervals[intervals.length - 1]?.sign ?? '+';
      yPos = prevSign === '+' ? 'top' : 'bottom';
    } else {
      const prevSign = intervals[i - 1]?.sign ?? '+';
      const nextSign = intervals[i]?.sign ?? '+';
      if (prevSign === '+' && nextSign === '-') {
        yPos = 'top';
      } else if (prevSign === '-' && nextSign === '+') {
        yPos = 'bottom';
      } else {
        yPos = 'mid';
      }
    }

    points.push({
      xLabel: formatNum(kp.x),
      yPrimeSymbol: yPrimeSym,
      yValue: yStr,
      yPos
    });
  }

  // 5. Tính GTLN / GTNN trên đoạn [intA; intB]
  const hasAsymptoteInInterval = asymptoteX !== null && asymptoteX >= intA && asymptoteX <= intB;
  let minVal: number | null = null;
  let maxVal: number | null = null;
  const minAt: number[] = [];
  const maxAt: number[] = [];

  if (!hasAsymptoteInInterval) {
    const candidates: { x: number; y: number }[] = [];
    for (const kp of keyPts) {
      const y = f(kp.x);
      if (y !== null && !isNaN(y)) {
        candidates.push({ x: kp.x, y });
      }
    }
    if (candidates.length > 0) {
      candidates.sort((c1, c2) => c1.y - c2.y);
      minVal = candidates[0].y;
      maxVal = candidates[candidates.length - 1].y;

      for (const c of candidates) {
        if (Math.abs(c.y - minVal) < 1e-4 && !minAt.some(x => Math.abs(x - c.x) < 1e-4)) {
          minAt.push(c.x);
        }
        if (Math.abs(c.y - maxVal) < 1e-4 && !maxAt.some(x => Math.abs(x - c.x) < 1e-4)) {
          maxAt.push(c.x);
        }
      }
    }
  }

  return {
    bbt: {
      fnDisplay: `${expr} trên [${formatNum(intA)}; ${formatNum(intB)}]`,
      fnType: type,
      points,
      intervals
    },
    minMax: {
      minVal,
      minAt,
      maxVal,
      maxAt,
      hasAsymptote: hasAsymptoteInInterval
    }
  };
}

/**
 * Phân tích và tạo BBT từ chuỗi biểu thức trên đoạn [a; b]
 */
export function analyzeFunctionOnInterval(input: string, intervalA: number, intervalB: number): IntervalAnalysisResult {
  const p = parseFunctionCoeffs(input);
  return analyzeFromCoeffsOnInterval(p.type, p.a, p.b, p.c, p.d, p.e, intervalA, intervalB);
}

export function parseCoeff(term: string, varPattern: string): number {
  if (!term) return 0;
  let t = term.replace(new RegExp(varPattern, 'i'), '').trim();
  t = t.replace(/^\((.+)\)$/, '$1').trim();
  if (t === '' || t === '+') return 1;
  if (t === '-') return -1;
  if (t.includes('/')) {
    const parts = t.split('/');
    const n = parseFloat(parts[0]);
    const d = parseFloat(parts[1]);
    if (!isNaN(n) && !isNaN(d) && d !== 0) return n / d;
  }
  const num = parseFloat(t);
  return isNaN(num) ? 0 : num;
}

/**
 * Hàm vẽ chữ hoặc phân số toán học (dạng tử trên mẫu dưới có gạch ngang) lên Canvas
 * Tối ưu hóa phông chữ toán học to rõ, in đậm chuẩn in ấn Word & SGK
 */
export function drawMathText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options?: {
    fontSize?: number;
    fontFamily?: string;
    align?: 'center' | 'left' | 'right';
    isItalic?: boolean;
    color?: string;
    isBold?: boolean;
    withHalo?: boolean;
    haloColor?: string;
    haloWidth?: number;
    useRectHalo?: boolean;
  }
): void {
  if (!text) return;

  const fontSize = options?.fontSize ?? 21;
  const fontFamily = options?.fontFamily ?? '"Times New Roman", "STIX Two Text", "Cambria Math", serif';
  const align = options?.align ?? 'center';
  const isItalic = options?.isItalic ?? false;
  const color = options?.color ?? '#000000';
  const isBold = options?.isBold ?? true;
  const withHalo = options?.withHalo ?? true; // Mặc định luôn có Halo trắng bảo vệ không bị đường cong hay trục che
  const haloColor = options?.haloColor ?? '#FFFFFF';
  const haloWidth = options?.haloWidth ?? (isBold ? 3.5 : 2.0);

  ctx.save();

  const trimmed = text.trim();
  // Kiểm tra nếu là phân số (ví dụ: 1/3, -1/3, 2/5, -4/3, 12/25, 13/27)
  const fracMatch = trimmed.match(/^([-+−\u2212]?)\s*([^/]+)\/([^/]+)$/);

  if (fracMatch) {
    const isNegative = fracMatch[1] === '-' || fracMatch[1] === '−' || fracMatch[1] === '\u2212';
    const num = fracMatch[2].trim().replace(/^[-+−\u2212]/, '').replace(/-/g, '−');
    const den = fracMatch[3].trim().replace(/^[-+−\u2212]/, '').replace(/-/g, '−');

    // Cỡ chữ tử và mẫu to rõ, cân đối
    const fracFontSize = Math.max(14, Math.round(fontSize * 0.8));
    const fracFont = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : 'normal '}${fracFontSize}px ${fontFamily}`;

    ctx.font = fracFont;
    const numWidth = ctx.measureText(num).width;
    const denWidth = ctx.measureText(den).width;
    const barWidth = Math.max(numWidth, denWidth) + 8;

    // Dấu trừ to rõ phía trước phân số
    const minusWidth = isNegative ? Math.max(12, Math.round(fontSize * (isBold ? 0.55 : 0.48))) : 0;
    const minusGap = isNegative ? 5 : 0;
    const totalWidth = minusWidth + minusGap + barWidth;

    let startX = x;
    if (align === 'center') {
      startX = x - totalWidth / 2;
    } else if (align === 'right') {
      startX = x - totalWidth;
    }

    const barX = startX + (isNegative ? minusWidth + minusGap : 0);
    const barCenterX = barX + barWidth / 2;
    const numOffset = Math.round(fracFontSize * 0.54 + 2);
    const denOffset = Math.round(fracFontSize * 0.54 + 2);
    const fracTotalH = numOffset + denOffset + fracFontSize;

    // Viền Halo bảo vệ phân số không che khuất đồ thị
    if (withHalo) {
      if (options?.useRectHalo) {
        // Nền chữ nhật che phủ dùng cho BBT (bảng biến thiên)
        ctx.fillStyle = haloColor;
        const padX = 4;
        const padY = 3;
        ctx.fillRect(
          startX - padX,
          y - numOffset - fracFontSize * 0.5 - padY,
          totalWidth + padX * 2,
          fracTotalH + padY * 2
        );
      } else {
        // Halo dạng stroke contour mềm mại cho đồ thị Canvas (KHÔNG đục lỗ vuông che khuất đường cong đồ thị)
        const hW = haloWidth;
        ctx.save();
        ctx.strokeStyle = haloColor;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // Halo cho dấu trừ
        if (isNegative) {
          ctx.lineWidth = Math.max(2.4, Math.round(fontSize * 0.11)) + hW * 2;
          ctx.beginPath();
          ctx.moveTo(startX, y);
          ctx.lineTo(startX + minusWidth, y);
          ctx.stroke();
        }

        // Halo cho gạch ngang phân số
        ctx.lineWidth = Math.max(1.6, Math.round(fontSize * 0.08)) + hW * 2;
        ctx.beginPath();
        ctx.moveTo(barX, y);
        ctx.lineTo(barX + barWidth, y);
        ctx.stroke();

        // Halo cho tử số và mẫu số
        ctx.font = fracFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = hW * 2;
        ctx.strokeText(num, barCenterX, y - numOffset);
        ctx.strokeText(den, barCenterX, y + denOffset);
        ctx.restore();
      }
    }

    // Vẽ dấu trừ to rõ (dạng nét vẽ sắc nét, dày dặn)
    if (isNegative) {
      ctx.lineWidth = isBold ? Math.max(2.4, Math.round(fontSize * 0.11)) : Math.max(1.5, Math.round(fontSize * 0.075));
      ctx.lineCap = 'round';
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + minusWidth, y);
      ctx.stroke();
    }

    // Vẽ đường gạch ngang phân số sắc nét
    ctx.lineWidth = isBold ? Math.max(1.8, Math.round(fontSize * 0.08)) : Math.max(1.2, Math.round(fontSize * 0.055));
    ctx.lineCap = 'butt';
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(barX, y);
    ctx.lineTo(barX + barWidth, y);
    ctx.stroke();

    // Vẽ tử số phía trên gạch ngang
    ctx.font = fracFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(num, barCenterX, y - numOffset);

    // Vẽ mẫu số phía dưới gạch ngang
    ctx.fillText(den, barCenterX, y + denOffset);

    // Tăng cường nét chữ đậm (solid micro-stroke) nếu chọn Chữ đậm
    if (isBold) {
      ctx.lineWidth = Math.max(0.5, Math.round(fontSize * 0.035));
      ctx.strokeStyle = color;
      ctx.strokeText(num, barCenterX, y - numOffset);
      ctx.strokeText(den, barCenterX, y + denOffset);
    }

    ctx.restore();
    return;
  }

  // Chữ / số bình thường
  const mathFormatted = trimmed.replace(/-/g, '−');
  ctx.font = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : 'normal '}${fontSize}px ${fontFamily}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';

  // 1. Viền Halo trắng bao quanh chữ để chữ nổi bật, không che đồ thị
  if (withHalo) {
    ctx.strokeStyle = haloColor;
    ctx.lineWidth = haloWidth * 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.miterLimit = 2;
    ctx.strokeText(mathFormatted, x, y);
  }

  // 2. Chữ chính thức màu đen
  ctx.fillStyle = color;
  ctx.fillText(mathFormatted, x, y);

  // 3. Tăng cường nét chữ đậm rõ rệt (solid micro-stroke) nếu chọn Chữ đậm
  if (isBold) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.5, Math.round(fontSize * 0.035));
    ctx.lineJoin = 'round';
    ctx.strokeText(mathFormatted, x, y);
  }

  ctx.restore();
}

export function getTextHalfWidth(ctx: CanvasRenderingContext2D, val?: string, fontFam = '"Times New Roman", "STIX Two Text", "Cambria Math", serif'): number {
  if (!val) return 20;
  const trimmed = val.trim();
  const fracMatch = trimmed.match(/^([-+−\u2212]?)\s*([^/]+)\/([^/]+)$/);
  if (fracMatch) {
    const isNeg = fracMatch[1] === '-' || fracMatch[1] === '−' || fracMatch[1] === '\u2212';
    const num = fracMatch[2].trim();
    const den = fracMatch[3].trim();
    ctx.save();
    ctx.font = `bold 18px ${fontFam}`;
    const barWidth = Math.max(ctx.measureText(num).width, ctx.measureText(den).width) + 8;
    ctx.restore();
    const totalW = (isNeg ? 18 : 0) + barWidth;
    return Math.max(20, Math.round(totalW / 2 + 7));
  }
  ctx.save();
  ctx.font = `bold 22px ${fontFam}`;
  const w = ctx.measureText(trimmed).width;
  ctx.restore();
  return Math.max(18, Math.round(w / 2 + 6));
}

/**
 * Vẽ Bảng biến thiên lên HTML5 Canvas với độ nét cao (chuẩn SGK Việt Nam, tối ưu dán Word)
 * Kích thước vừa phải, phông chữ to rõ, không lãng phí diện tích
 */
export function renderBBTToCanvas(
  data: BBTData,
  canvas: HTMLCanvasElement,
  dpiScale = 2.4,
  options?: { 
    fontSizeScale?: number; 
    fontFamily?: string;
    strokeChoice?: MathStrokeChoice;
    isBold?: boolean;
  }
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const fontScale = options?.fontSizeScale ?? 1.0;
  const fontFamily = options?.fontFamily ?? '"Times New Roman", "STIX Two Text", "Cambria Math", serif';
  const strokeChoice = options?.strokeChoice ?? 'standard';
  const isBold = options?.isBold ?? true;
  const strokeMultiplier = strokeChoice === 'thin' ? 0.75 : strokeChoice === 'bold' ? 1.4 : 1.0;
  const numPoints = data.points.length;
  // Bảng biến thiên có kích thước vừa phải, gọn gàng chuẩn Word
  const logicalWidth = Math.min(680, Math.max(540, numPoints <= 4 ? 560 : numPoints === 5 ? 620 : 660));
  const logicalHeight = 245;

  canvas.width = Math.round(logicalWidth * dpiScale);
  canvas.height = Math.round(logicalHeight * dpiScale);
  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;

  ctx.save();
  ctx.scale(dpiScale, dpiScale);

  // Nền trắng tinh khiết
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  const padLeft = 14;
  const padRight = 14;
  const padTop = 12;
  const padBottom = 12;

  const tableX = padLeft;
  const tableY = padTop;
  const tableW = logicalWidth - padLeft - padRight;
  const tableH = logicalHeight - padTop - padBottom;

  const headerColWidth = 52;
  const row1H = 44;  // Hàng x
  const row2H = 42;  // Hàng y'
  const row3H = tableH - row1H - row2H; // Hàng y (~135px)

  const lineY1 = tableY + row1H;
  const lineY2 = lineY1 + row2H;
  const colDividerX = tableX + headerColWidth;

  // 1. Viền ngoài hình chữ nhật bao quanh
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.8 * strokeMultiplier;
  ctx.strokeRect(tableX, tableY, tableW, tableH);

  // 2. Kẻ đường ngang ngăn cách các hàng
  ctx.beginPath();
  ctx.lineWidth = 1.4 * strokeMultiplier;
  ctx.moveTo(tableX, lineY1);
  ctx.lineTo(tableX + tableW, lineY1);
  ctx.moveTo(tableX, lineY2);
  ctx.lineTo(tableX + tableW, lineY2);

  // 3. Kẻ đường dọc ngăn cột tiêu đề (x, y', y)
  ctx.moveTo(colDividerX, tableY);
  ctx.lineTo(colDividerX, tableY + tableH);
  ctx.stroke();

  // Tiêu đề cột (x, y', y) - Phông Times New Roman / Cambria Math đậm, to rõ đẹp mắt
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const headerFontSz = Math.round(25 * fontScale);
  ctx.font = `italic ${isBold ? 'bold ' : 'normal '}${headerFontSz}px ${fontFamily}`;
  ctx.fillText('x', tableX + headerColWidth / 2, tableY + row1H / 2);
  ctx.fillText("y'", tableX + headerColWidth / 2, lineY1 + row2H / 2);
  ctx.fillText('y', tableX + headerColWidth / 2, lineY2 + row3H / 2);

  const contentWidth = tableW - headerColWidth;
  
  // Tính tọa độ x cho từng điểm mốc (Cân xứng hoàn hảo chuẩn SGK)
  const xPositions: number[] = [];
  if (numPoints <= 1) {
    xPositions.push(colDividerX + contentWidth / 2);
  } else {
    const edgePad = Math.max(38, Math.min(50, 180 / numPoints));
    const firstX = colDividerX + edgePad;
    const lastX = tableX + tableW - edgePad;
    const stepX = (lastX - firstX) / (numPoints - 1);

    for (let i = 0; i < numPoints; i++) {
      xPositions.push(firstX + i * stepX);
    }
  }

  // A. Vẽ hàng x và y'
  for (let i = 0; i < numPoints; i++) {
    const pt = data.points[i];
    const px = xPositions[i];

    // Vẽ nhãn x (to rõ, đậm đẹp mắt)
    const isInf = pt.xLabel.includes('∞');
    const xFontSz = Math.round((isInf ? 25 : 22) * fontScale);
    drawMathText(ctx, pt.xLabel, px, tableY + row1H / 2, {
      fontSize: xFontSz,
      isItalic: isInf,
      isBold,
      align: 'center',
      fontFamily
    });

    // Vẽ vạch kép || hoặc số 0 ở hàng y'
    if (pt.isDoubleBar) {
      const barOffset = 3.5;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(px - barOffset - 0.5, lineY1 + 1, barOffset * 2 + 1, (tableY + tableH) - lineY1 - 2);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.4 * strokeMultiplier;
      ctx.beginPath();
      ctx.moveTo(px - barOffset, lineY1);
      ctx.lineTo(px - barOffset, tableY + tableH);
      ctx.moveTo(px + barOffset, lineY1);
      ctx.lineTo(px + barOffset, tableY + tableH);
      ctx.stroke();
    } else if (pt.yPrimeSymbol === '0') {
      ctx.fillStyle = '#000000';
      const zeroFontSz = Math.round(23 * fontScale);
      ctx.font = `${isBold ? 'bold ' : 'normal '}${zeroFontSz}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('0', px, lineY1 + row2H / 2);
    }
  }

  // B. Vẽ dấu +/- trên các khoảng của hàng y' (to rõ, sắc nét)
  for (let i = 0; i < data.intervals.length; i++) {
    const inter = data.intervals[i];
    if (i < numPoints - 1) {
      const midX = (xPositions[i] + xPositions[i + 1]) / 2;
      const midY = lineY1 + row2H / 2;
      if (inter.sign === '-') {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = (isBold ? 3.2 : 2.0) * strokeMultiplier;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(midX - 9, midY);
        ctx.lineTo(midX + 9, midY);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#000000';
        const plusFontSz = Math.round(28 * fontScale);
        ctx.font = `${isBold ? 'bold ' : 'normal '}${plusFontSz}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', midX, midY + 1);
      }
    }
  }

  // C. Vẽ hàng y (Chiều biến thiên mũi tên & Giá trị)
  const yTopY = lineY2 + 26;
  const yBottomY = tableY + tableH - 26;
  const yMidY = (yTopY + yBottomY) / 2;

  interface YPointRender {
    x: number;
    y: number;
    val: string;
    isDoubleBar?: boolean;
    leftLimit?: string;
    rightLimit?: string;
  }

  const yRenderList: YPointRender[] = [];
  for (let i = 0; i < numPoints; i++) {
    const pt = data.points[i];
    const px = xPositions[i];
    let py = yMidY;
    if (pt.yPos === 'top') py = yTopY;
    else if (pt.yPos === 'bottom') py = yBottomY;

    yRenderList.push({
      x: px,
      y: py,
      val: pt.yValue,
      isDoubleBar: pt.isDoubleBar,
      leftLimit: pt.leftLimit,
      rightLimit: pt.rightLimit
    });
  }

  // Vẽ các mũi tên nối các điểm (nét dày 2.0px, đầu mũi tên to rõ)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.0;

  for (let i = 0; i < yRenderList.length - 1; i++) {
    const p1 = yRenderList[i];
    const p2 = yRenderList[i + 1];

    if (p1.isDoubleBar) {
      const aX1 = p1.x + 32;
      const aY1 = p1.rightLimit === '+∞' ? yTopY : p1.rightLimit === '-∞' ? yBottomY : yMidY;
      const hw2 = getTextHalfWidth(ctx, p2.val, fontFamily);
      const R2 = hw2 + 8;
      const aX2 = p2.x;
      const aY2 = p2.y;
      const dx = aX2 - aX1;
      const dy = aY2 - aY1;
      if (dx > R2 + 10) {
        const m = dy / dx;
        const startX = aX1;
        const startY = aY1;
        const endX = aX2 - R2;
        const endY = aY2 - m * R2;
        drawArrow(ctx, startX, startY, endX, endY);
      }
    } else if (p2.isDoubleBar) {
      const hw1 = getTextHalfWidth(ctx, p1.val, fontFamily);
      const R1 = hw1 + 8;
      const aX1 = p1.x;
      const aY1 = p1.y;
      const aX2 = p2.x - 32;
      const aY2 = p2.leftLimit === '+∞' ? yTopY : p2.leftLimit === '-∞' ? yBottomY : yMidY;
      const dx = aX2 - aX1;
      const dy = aY2 - aY1;
      if (dx > R1 + 10) {
        const m = dy / dx;
        const startX = aX1 + R1;
        const startY = aY1 + m * R1;
        const endX = aX2;
        const endY = aY2;
        drawArrow(ctx, startX, startY, endX, endY);
      }
    } else {
      const hw1 = getTextHalfWidth(ctx, p1.val, fontFamily);
      const hw2 = getTextHalfWidth(ctx, p2.val, fontFamily);
      const R1 = hw1 + 8;
      const R2 = hw2 + 8;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      if (dx > R1 + R2 + 10) {
        const m = dy / dx;
        const startX = p1.x + R1;
        const startY = p1.y + m * R1;
        const endX = p2.x - R2;
        const endY = p2.y - m * R2;
        drawArrow(ctx, startX, startY, endX, endY);
      }
    }
  }

  // Vẽ các giá trị y tại các điểm & giới hạn 2 phía tại tiệm cận
  for (let i = 0; i < yRenderList.length; i++) {
    const pt = yRenderList[i];
    if (pt.isDoubleBar) {
      if (pt.leftLimit) {
        const leftY = pt.leftLimit === '+∞' ? yTopY : yBottomY;
        const limFontSz = Math.round(25 * fontScale);
        drawMathText(ctx, pt.leftLimit, pt.x - 10, leftY, {
          fontSize: limFontSz,
          isItalic: true,
          isBold,
          align: 'right',
          fontFamily
        });
      }
      if (pt.rightLimit) {
        const rightY = pt.rightLimit === '+∞' ? yTopY : yBottomY;
        const limFontSz = Math.round(25 * fontScale);
        drawMathText(ctx, pt.rightLimit, pt.x + 10, rightY, {
          fontSize: limFontSz,
          isItalic: true,
          isBold,
          align: 'left',
          fontFamily
        });
      }
    } else if (pt.val) {
      const isInf = pt.val.includes('∞');
      const valFontSz = Math.round((isInf ? 25 : 22) * fontScale);
      drawMathText(ctx, pt.val, pt.x, pt.y, {
        fontSize: valFontSz,
        isItalic: isInf,
        isBold,
        align: 'center',
        fontFamily,
        useRectHalo: true
      });
    }
  }

  ctx.restore();
}

function drawArrow(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number): void {
  const headLength = 12;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle - Math.PI / 7),
    toY - headLength * Math.sin(angle - Math.PI / 7)
  );
  ctx.lineTo(
    toX - headLength * Math.cos(angle + Math.PI / 7),
    toY - headLength * Math.sin(angle + Math.PI / 7)
  );
  ctx.closePath();
  ctx.fillStyle = '#000000';
  ctx.fill();
}

// =========================================================================
// BỘ TIỆN ÍCH TỐI ƯU HÓA ĐỘ PHÂN GIẢI & KÍCH THƯỚC ẢNH KHI DÁN QUA WORD
// =========================================================================

let pngCrcTable: Uint32Array | null = null;
function getPngCrcTable(): Uint32Array {
  if (pngCrcTable) return pngCrcTable;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  pngCrcTable = table;
  return table;
}

function calcCrc32(buf: Uint8Array): number {
  const table = getPngCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPhysChunk(dpi: number): Uint8Array {
  // 1 inch = 0.0254 m => pixels per meter (PPM)
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk[4] = 0x70; chunk[5] = 0x48; chunk[6] = 0x59; chunk[7] = 0x73; // 'pHYs'
  view.setUint32(8, ppm);
  view.setUint32(12, ppm);
  chunk[16] = 1; // đơn vị mét
  const crc = calcCrc32(chunk.subarray(4, 17));
  view.setUint32(17, crc);
  return chunk;
}

/**
 * Nhúng chunk pHYs vào file PNG để Microsoft Word nhận diện đúng DPI (mặc định 300 DPI)
 * Giúp ảnh tự động vừa vặn trang giấy Word và chữ to rõ nét, không bị phóng đại quá khổ
 */
export function insertDpiIntoPng(pngBytes: Uint8Array, dpi = 300): Uint8Array {
  if (pngBytes.length < 33 || pngBytes[0] !== 0x89 || pngBytes[1] !== 0x50) {
    return pngBytes;
  }
  const physChunk = createPhysChunk(dpi);
  let offset = 8;
  const view = new DataView(pngBytes.buffer, pngBytes.byteOffset, pngBytes.byteLength);

  while (offset < pngBytes.length) {
    const len = view.getUint32(offset);
    const type = String.fromCharCode(pngBytes[offset + 4], pngBytes[offset + 5], pngBytes[offset + 6], pngBytes[offset + 7]);
    if (type === 'pHYs') {
      const result = new Uint8Array(pngBytes.length);
      result.set(pngBytes.subarray(0, offset));
      result.set(physChunk, offset);
      result.set(pngBytes.subarray(offset + 12 + len), offset + physChunk.length);
      return result;
    }
    if (type === 'IHDR') {
      const afterIhdr = offset + 12 + len;
      const result = new Uint8Array(pngBytes.length + physChunk.length);
      result.set(pngBytes.subarray(0, afterIhdr), 0);
      result.set(physChunk, afterIhdr);
      result.set(pngBytes.subarray(afterIhdr), afterIhdr + physChunk.length);
      return result;
    }
    offset += 12 + len;
  }
  return pngBytes;
}

/**
 * Nhúng DPI vào Blob PNG để lưu file hoặc dán vào Word
 */
export async function addDpiToBlob(blob: Blob, dpi = 300): Promise<Blob> {
  try {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const withDpi = insertDpiIntoPng(bytes, dpi);
    return new Blob([withDpi], { type: 'image/png' });
  } catch (e) {
    console.error('Lỗi nhúng DPI vào Blob:', e);
    return blob;
  }
}

/**
 * Nhúng DPI vào dataUrl PNG
 */
export function addDpiToDataUrl(dataUrl: string, dpi = 300): string {
  try {
    const base64Index = dataUrl.indexOf(',');
    if (base64Index === -1) return dataUrl;
    const header = dataUrl.slice(0, base64Index + 1);
    const base64 = dataUrl.slice(base64Index + 1);
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const withDpi = insertDpiIntoPng(bytes, dpi);
    let binary = '';
    const len = withDpi.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(withDpi[i]);
    }
    return header + btoa(binary);
  } catch (e) {
    console.error('Lỗi nhúng DPI vào dataUrl:', e);
    return dataUrl;
  }
}

/**
 * Sao chép ảnh từ Canvas vào Clipboard có nhúng DPI chuẩn Word (300 DPI)
 */
export async function copyCanvasWithWordOptimization(
  canvas: HTMLCanvasElement,
  dpi = 300
): Promise<boolean> {
  try {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return false;
    const blobWithDpi = await addDpiToBlob(blob, dpi);
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blobWithDpi })
    ]);
    return true;
  } catch (err) {
    console.error('Lỗi copy ảnh vào Clipboard:', err);
    return false;
  }
}
