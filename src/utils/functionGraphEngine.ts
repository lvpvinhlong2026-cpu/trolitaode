import { drawMathText, formatNum } from './bbtEngine';

/**
 * Function Graph Engine - Vẽ Đồ thị hàm số trên hệ trục Oxy chuẩn SGK Toán (300 DPI)
 * Hỗ trợ các dạng đồ thị chuẩn thi THPT:
 * 1. Đồ thị hàm bậc 3: y = ax^3 + bx^2 + cx + d
 * 2. Đồ thị hàm bậc 4 trùng phương: y = ax^4 + bx^2 + c
 * 3. Đồ thị hàm phân thức bậc nhất / bậc nhất: y = (ax + b) / (cx + d)
 * 4. Đồ thị hàm phân thức bậc hai / bậc nhất: y = (ax^2 + bx + c) / (dx + e)
 * 5. Đồ thị hàm bậc hai Parabol: y = ax^2 + bx + c
 *
 * Tính năng chuẩn SGK Việt Nam:
 * - Thể hiện điểm cực trị kèm đường gióng nét đứt vuông góc tới 2 trục Ox, Oy và ghi tọa độ.
 * - Thể hiện giao điểm của đồ thị với trục hoành Ox và trục tung Oy.
 * - Vẽ đường tiệm cận đứng, tiệm cận ngang và tiệm cận xiên (nét đứt).
 */

export interface CustomPoint {
  x: number;
  y?: number;       // Nếu không truyền, tự tính y = f(x)
  label?: string;   // Tên nhãn điểm: e.g. 'M', 'A', 'B' hoặc để trống
}

/**
 * Text tùy biến được người dùng thêm vào đồ thị Oxy (ví dụ: (C), y = f(x), d, A(-1; 3)...)
 * Tọa độ (x, y) là tọa độ toán học trong mặt phẳng Oxy, tự động bám theo hệ trục khi thu phóng / dịch chuyển
 * Hỗ trợ kéo thả trực tiếp bằng chuột trên Canvas
 */
export interface CustomTextAnnotation {
  id: string;
  text: string;           // Ký hiệu / nội dung chữ, ví dụ: '(C)', 'y = f(x)', 'd', 'A', 'B'
  x: number;              // Tọa độ toán học x trên hệ Oxy
  y: number;              // Tọa độ toán học y trên hệ Oxy
  fontSize?: number;      // Cỡ chữ (mặc định ~22)
  color?: string;         // Màu chữ (mặc định '#000000')
  isBold?: boolean;       // In đậm (mặc định theo isBoldLabels)
  isItalic?: boolean;     // In nghiêng toán học (mặc định true)
}

export interface IntegralAreaConfig {
  enabled: boolean;
  a: number;                         // Cận dưới
  b: number;                         // Cận trên
  gType?: 'zero' | 'linear';         // Đường biên thứ 2: 'zero' (trục Ox: y = 0) hoặc 'linear' (đường thẳng y = mx + n)
  gLineM?: number;                   // Hệ số góc m của đường thẳng g(x) = mx + n
  gLineN?: number;                   // Tung độ gốc n của đường thẳng g(x) = mx + n
  style?: 'hatch' | 'fill' | 'both'; // 'hatch' (gạch sọc đen trắng chuẩn đề thi), 'fill' (tô màu mờ), 'both'
  hatchAngle?: number;               // Góc nghiêng gạch sọc (độ, mặc định 45)
  hatchSpacing?: number;             // Khoảng cách giữa các nét gạch sọc (pixels, mặc định 8)
  hatchColor?: string;               // Màu nét gạch sọc (mặc định '#000000')
  fillColor?: string;                // Màu phủ (mặc định 'rgba(13, 148, 136, 0.22)')
  showBoundLines?: boolean;          // Vẽ đường dóng cận x = a, x = b nét đứt vuông góc Ox
  showAreaLabel?: boolean;           // Hiển thị chữ ký hiệu diện tích S ở tâm miền
  areaLabelText?: string;            // Nhãn diện tích (mặc định 'S')
}

export interface GraphConfig {
  type: 'cubic' | 'quartic' | 'rational' | 'rational_2_1' | 'quadratic';
  a: number;
  b: number;
  c: number;
  d?: number;
  e?: number; // Hệ số cho phân thức bậc 2 / bậc 1: (ax^2 + bx + c) / (dx + e)
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  showGrid?: boolean;
  gridStep?: number;           // Bước lưới tọa độ ô vuông (mặc định 1 đơn vị chuẩn SGK)
  showTicks?: boolean;         // Vạch chia đơn vị trên trục (mặc định false chuẩn SGK)
  tickStep?: number;           // Bước chia đơn vị trên trục (mặc định 1)
  tickStepX?: number;          // Bước chia riêng trục Ox (nếu muốn khác)
  tickStepY?: number;          // Bước chia riêng trục Oy (nếu muốn khác)
  showTickLabels?: boolean;    // Đánh số tại các vạch chia đơn vị (1, 2, 3... -1, -2...)
  fontSizeScale?: number;      // Tùy chỉnh cỡ chữ hiển thị (mặc định 1.0)
  fontFamily?: string;         // Phông chữ hiển thị đồ thị (mặc định: Times New Roman chuẩn SGK)
  showExtrema?: boolean;       // Thể hiện tọa độ cực trị & đường gióng nét đứt
  showIntersections?: boolean; // Thể hiện giao điểm với trục Ox, Oy
  showAsymptotes?: boolean;    // Thể hiện tiệm cận (đứng, ngang, xiên) và ghi số cắt các trục
  showCustomPoint?: boolean;   // Thể hiện tọa độ điểm thuộc đồ thị & đường gióng
  customPoint?: CustomPoint;   // Điểm thuộc đồ thị (x, y, label)
  customPoints?: CustomPoint[];// Hỗ trợ thêm nhiều điểm nếu cần
  restrictInterval?: boolean;  // Giới hạn / khảo sát vẽ đồ thị trên đoạn [a; b]
  intervalA?: number;          // Đầu mút a
  intervalB?: number;          // Đầu mút b
  intervalMode?: 'highlight' | 'only'; // 'highlight': vẽ [a;b] đậm, ngoài mờ; 'only': chỉ vẽ trên [a;b]
  showIntervalEndpoints?: boolean;     // Hiển thị chấm tròn và đường gióng tọa độ 2 đầu mút A, B
  asymptoteIntersectionLabel?: string; // Tên nhãn giao điểm tiệm cận (I)

  // Ứng dụng tích phân tính diện tích hình phẳng (Toán 12)
  integralArea?: IntegralAreaConfig;

  // Tùy chỉnh vị trí gốc O
  originQuadrant?: 'auto' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  originOffset?: { x: number; y: number };

  // Tùy chỉnh nhãn trục
  axisLabelXOffset?: { x: number; y: number };
  axisLabelYOffset?: { x: number; y: number };

  // Tùy chỉnh vị trí các số trên trục Ox và Oy:
  oxLabelOffsets?: Record<string, { offsetX?: number; offsetY?: number; preferredAbove?: boolean }>;
  oyLabelOffsets?: Record<string, { offsetX?: number; offsetY?: number; preferredRight?: boolean }>;

  // Tùy chỉnh độ đậm nhạt & màu sắc nét vẽ đồ thị:
  curveWidth?: number;         // Độ dày nét vẽ đồ thị (mặc định 2.6px)
  curveColor?: string;         // Màu sắc đường cong đồ thị (mặc định '#000000')
  axisWidth?: number;          // Độ dày trục tọa độ Oxy (mặc định 2.0px)
  isBoldLabels?: boolean;      // In đậm chữ số và nhãn tọa độ (mặc định true)
  dotRadius?: number;          // Bán kính chấm tròn cực trị & giao điểm (mặc định 2.4px, nhỏ gọn chuẩn SGK)
  showExtremaDots?: boolean;   // Hiển thị chấm tròn đen tại các điểm cực trị (false cho chuẩn TikZ/LaTeX như hình)
  showIntersectionDots?: boolean; // Hiển thị chấm tròn đen tại các giao điểm trục (false cho chuẩn TikZ/LaTeX)

  // Danh sách các Text / Ký hiệu do người dùng thêm vào đồ thị:
  customTexts?: CustomTextAnnotation[];
}

export interface GraphLabelHitbox {
  id: string; // 'O', 'ox_2', 'oy_2', 'axis_x', 'axis_y', 'custom_text_<id>'
  text: string;
  type: 'origin' | 'ox' | 'oy' | 'axis_x' | 'axis_y' | 'custom_text';
  customTextId?: string;
  val?: number;
  x: number;      // CSS pixel x
  y: number;      // CSS pixel y
  width: number;  // CSS pixel width
  height: number; // CSS pixel height
}

export interface RenderGraphResult {
  hitboxes: GraphLabelHitbox[];
  unitScale: number;
}

export interface ExtremaPoint {
  x: number;
  y: number;
  type: 'max' | 'min' | 'inflection';
}

export interface IntersectionPoint {
  x: number;
  y: number;
  axis: 'Ox' | 'Oy';
}

/**
 * Định dạng số gọn gàng chuẩn SGK (ưu tiên số nguyên, phân số đơn giản hoặc 1-2 chữ số thập phân)
 */
export function formatNumDisplay(val: number): string {
  const str = formatNum(val);
  return str.replace(/-/g, '−');
}

export interface AsymptoteInfo {
  hasVertical: boolean;
  xTC?: number;
  hasHorizontal: boolean;
  yTC?: number;
  hasSlant: boolean;
  slantA?: number;
  slantB?: number;
  intersection?: { x: number; y: number; label: string };
}

/**
 * Trích xuất thông tin các đường tiệm cận và tọa độ giao điểm I (Tâm đối xứng của đồ thị)
 */
export function getAsymptoteInfo(config: GraphConfig): AsymptoteInfo | null {
  const label = config.asymptoteIntersectionLabel ?? 'I';

  if (config.type === 'rational') {
    if (Math.abs(config.c) < 1e-6) return null;
    const xTC = -(config.d ?? 0) / config.c;
    const yTC = config.a / config.c;
    return {
      hasVertical: true,
      xTC,
      hasHorizontal: true,
      yTC,
      hasSlant: false,
      intersection: { x: xTC, y: yTC, label }
    };
  }

  if (config.type === 'rational_2_1') {
    const d = config.d ?? 1;
    const e = config.e ?? 0;
    if (Math.abs(d) < 1e-6) return null;
    const xTC = -e / d;
    const A = config.a / d;
    const B = (config.b * d - config.a * e) / (d * d);
    const yTC = A * xTC + B;
    return {
      hasVertical: true,
      xTC,
      hasHorizontal: false,
      hasSlant: true,
      slantA: A,
      slantB: B,
      intersection: { x: xTC, y: yTC, label }
    };
  }

  return null;
}

/**
 * Giải phương trình bậc 2: ax^2 + bx + c = 0
 */
function solveQuadratic(a: number, b: number, c: number): number[] {
  if (Math.abs(a) < 1e-8) {
    if (Math.abs(b) < 1e-8) return [];
    return [-c / b];
  }
  const delta = b * b - 4 * a * c;
  if (delta < -1e-7) return [];
  if (Math.abs(delta) <= 1e-7) return [-b / (2 * a)];
  const sqrtD = Math.sqrt(delta);
  return [(-b - sqrtD) / (2 * a), (-b + sqrtD) / (2 * a)];
}

/**
 * Giải phương trình bậc 3: ax^3 + bx^2 + cx + d = 0 (phương pháp Cardano)
 */
function solveCubic(a: number, b: number, c: number, d: number): number[] {
  if (Math.abs(a) < 1e-8) {
    return solveQuadratic(b, c, d);
  }
  const p = (3 * a * c - b * b) / (3 * a * a);
  const q = (2 * b * b * b - 9 * a * b * c + 27 * a * a * d) / (27 * a * a * a);
  const delta = (q * q) / 4 + (p * p * p) / 27;
  const shift = -b / (3 * a);
  const roots: number[] = [];

  if (delta > 1e-7) {
    const u = Math.cbrt(-q / 2 + Math.sqrt(delta));
    const v = Math.cbrt(-q / 2 - Math.sqrt(delta));
    roots.push(u + v + shift);
  } else if (Math.abs(delta) <= 1e-7) {
    if (Math.abs(p) < 1e-8) {
      roots.push(shift);
    } else {
      const u = Math.cbrt(-q / 2);
      roots.push(2 * u + shift);
      roots.push(-u + shift);
    }
  } else {
    const r = Math.sqrt(-p * p * p / 27);
    const phi = Math.acos(Math.max(-1, Math.min(1, -q / (2 * r))));
    const m = 2 * Math.sqrt(-p / 3);
    roots.push(m * Math.cos(phi / 3) + shift);
    roots.push(m * Math.cos((phi + 2 * Math.PI) / 3) + shift);
    roots.push(m * Math.cos((phi + 4 * Math.PI) / 3) + shift);
  }
  return roots.filter((val, idx, arr) => arr.findIndex(v => Math.abs(v - val) < 1e-3) === idx);
}

/**
 * Tính giá trị y = f(x) của đồ thị hàm số
 */
export function evalGraphFunction(config: GraphConfig, x: number): number | null {
  const { a, b, c, d = 0, e = 0, type } = config;
  if (type === 'cubic') return a * x * x * x + b * x * x + c * x + d;
  if (type === 'quartic') return a * Math.pow(x, 4) + b * x * x + c;
  if (type === 'quadratic') return a * x * x + b * x + c;
  if (type === 'rational') {
    const den = c * x + d;
    return Math.abs(den) < 1e-4 ? null : (a * x + b) / den;
  }
  if (type === 'rational_2_1') {
    const den = d * x + e;
    return Math.abs(den) < 1e-4 ? null : (a * x * x + b * x + c) / den;
  }
  return null;
}

/**
 * Tính toán các điểm cực trị của đồ thị hàm số
 */
export function getExtrema(config: GraphConfig): ExtremaPoint[] {
  const { type, a, b, c, d = 0, e = 0 } = config;
  const points: ExtremaPoint[] = [];

  const f = (x: number): number | null => evalGraphFunction(config, x);

  // 1. Hàm bậc 3: y' = 3ax^2 + 2bx + c
  if (type === 'cubic' && Math.abs(a) > 1e-6) {
    const deltaPrime = b * b - 3 * a * c;
    if (deltaPrime > 1e-6) {
      const x1 = (-b - Math.sqrt(deltaPrime)) / (3 * a);
      const x2 = (-b + Math.sqrt(deltaPrime)) / (3 * a);
      const y1 = f(x1);
      const y2 = f(x2);
      if (y1 !== null) points.push({ x: x1, y: y1, type: a > 0 ? 'max' : 'min' });
      if (y2 !== null) points.push({ x: x2, y: y2, type: a > 0 ? 'min' : 'max' });
    }
  }

  // 2. Hàm bậc 4 trùng phương: y' = 4ax^3 + 2bx = 2x(2ax^2 + b)
  if (type === 'quartic' && Math.abs(a) > 1e-6) {
    // x = 0 luôn là điểm cực trị
    const y0 = f(0);
    if (y0 !== null) {
      points.push({ x: 0, y: y0, type: b > 0 ? (a > 0 ? 'min' : 'max') : (a > 0 ? 'max' : 'min') });
    }
    const negBover2A = -b / (2 * a);
    if (negBover2A > 1e-6) {
      const x1 = -Math.sqrt(negBover2A);
      const x2 = Math.sqrt(negBover2A);
      const y1 = f(x1);
      const y2 = f(x2);
      if (y1 !== null) points.push({ x: x1, y: y1, type: a > 0 ? 'min' : 'max' });
      if (y2 !== null) points.push({ x: x2, y: y2, type: a > 0 ? 'min' : 'max' });
    }
  }

  // 3. Hàm phân thức bậc 2 / bậc 1: y = (ax^2 + bx + c) / (dx + e)
  // y' = [ad x^2 + 2ae x + (be - cd)] / (dx + e)^2
  if (type === 'rational_2_1' && Math.abs(d) > 1e-6) {
    const A = a * d;
    const B = 2 * a * e;
    const C = b * e - c * d;
    const deltaPrime = (a * e) * (a * e) - A * C;
    if (deltaPrime > 1e-6 && Math.abs(A) > 1e-6) {
      const x1 = (-a * e - Math.sqrt(deltaPrime)) / A;
      const x2 = (-a * e + Math.sqrt(deltaPrime)) / A;
      const xDiscontinuity = -e / d;

      if (Math.abs(x1 - xDiscontinuity) > 1e-4) {
        const y1 = f(x1);
        if (y1 !== null) points.push({ x: x1, y: y1, type: 'max' });
      }
      if (Math.abs(x2 - xDiscontinuity) > 1e-4) {
        const y2 = f(x2);
        if (y2 !== null) points.push({ x: x2, y: y2, type: 'min' });
      }
    }
  }

  // 4. Parabol bậc 2: y = ax^2 + bx + c
  if (type === 'quadratic' && Math.abs(a) > 1e-6) {
    const xVertex = -b / (2 * a);
    const yVertex = f(xVertex);
    if (yVertex !== null) {
      points.push({ x: xVertex, y: yVertex, type: a > 0 ? 'min' : 'max' });
    }
  }

  return points;
}

/**
 * Tính toán giao điểm của đồ thị với trục Ox và Oy
 */
export function getIntersections(config: GraphConfig): IntersectionPoint[] {
  const { type, a, b, c, d = 0, e = 0, xMin = -5.5, xMax = 5.5, yMin = -5.5, yMax = 5.5 } = config;
  const list: IntersectionPoint[] = [];

  const f = (x: number): number | null => {
    if (type === 'cubic') return a * x * x * x + b * x * x + c * x + d;
    if (type === 'quartic') return a * Math.pow(x, 4) + b * x * x + c;
    if (type === 'quadratic') return a * x * x + b * x + c;
    if (type === 'rational') {
      const den = c * x + d;
      return Math.abs(den) < 1e-5 ? null : (a * x + b) / den;
    }
    if (type === 'rational_2_1') {
      const den = d * x + e;
      return Math.abs(den) < 1e-5 ? null : (a * x * x + b * x + c) / den;
    }
    return null;
  };

  // 1. Giao điểm với trục tung Oy (x = 0)
  const yAt0 = f(0);
  if (yAt0 !== null && !isNaN(yAt0) && yAt0 >= yMin && yAt0 <= yMax) {
    list.push({ x: 0, y: yAt0, axis: 'Oy' });
  }

  // 2. Giao điểm với trục hoành Ox (y = 0)
  let oxRoots: number[] = [];

  if (type === 'cubic') {
    oxRoots = solveCubic(a, b, c, d);
  } else if (type === 'quartic') {
    // ax^4 + bx^2 + c = 0 -> đặt t = x^2 >= 0
    const tRoots = solveQuadratic(a, b, c);
    for (const t of tRoots) {
      if (Math.abs(t) < 1e-6) oxRoots.push(0);
      else if (t > 0) {
        oxRoots.push(-Math.sqrt(t));
        oxRoots.push(Math.sqrt(t));
      }
    }
  } else if (type === 'rational') {
    // ax + b = 0
    if (Math.abs(a) > 1e-6) {
      const x0 = -b / a;
      const den = c * x0 + d;
      if (Math.abs(den) > 1e-5) oxRoots.push(x0);
    }
  } else if (type === 'rational_2_1') {
    // ax^2 + bx + c = 0
    const quadRoots = solveQuadratic(a, b, c);
    for (const xr of quadRoots) {
      const den = d * xr + e;
      if (Math.abs(den) > 1e-5) oxRoots.push(xr);
    }
  } else if (type === 'quadratic') {
    oxRoots = solveQuadratic(a, b, c);
  }

  for (const xr of oxRoots) {
    if (xr >= xMin && xr <= xMax) {
      // Hiện tất cả các giao điểm thực của đồ thị với Ox
      const isInteger = Math.abs(xr - Math.round(xr)) < 1e-3;
      const roundedX = isInteger ? Math.round(xr) : Math.round(xr * 100) / 100;
      if (!list.some(p => p.axis === 'Ox' && Math.abs(p.x - roundedX) < 1e-3)) {
        list.push({ x: roundedX, y: 0, axis: 'Ox' });
      }
    }
  }

  return list;
}

/**
 * Tính GTLN / GTNN của đồ thị hàm số trên một đoạn [a; b]
 */
export function getIntervalMinMax(config: GraphConfig): {
  minVal: number | null;
  minAt: number[];
  maxVal: number | null;
  maxAt: number[];
  hasAsymptote: boolean;
} {
  const intA = Math.min(config.intervalA ?? 0, config.intervalB ?? 2);
  const intB = Math.max(config.intervalA ?? 0, config.intervalB ?? 2);

  // Kiểm tra tiệm cận đứng
  let hasAsymptote = false;
  if (config.type === 'rational' && Math.abs(config.c) > 1e-6) {
    const xtc = -config.d! / config.c;
    if (xtc >= intA && xtc <= intB) hasAsymptote = true;
  } else if (config.type === 'rational_2_1' && Math.abs(config.d ?? 0) > 1e-6) {
    const xtc = -(config.e ?? 0) / config.d!;
    if (xtc >= intA && xtc <= intB) hasAsymptote = true;
  }

  if (hasAsymptote) {
    return { minVal: null, minAt: [], maxVal: null, maxAt: [], hasAsymptote: true };
  }

  const f = (x: number) => evalGraphFunction(config, x);
  const candidates: { x: number; y: number }[] = [];

  const ya = f(intA);
  if (ya !== null && !isNaN(ya)) candidates.push({ x: intA, y: ya });

  const yb = f(intB);
  if (yb !== null && !isNaN(yb)) candidates.push({ x: intB, y: yb });

  const extrema = getExtrema(config);
  for (const e of extrema) {
    if (e.x > intA + 1e-4 && e.x < intB - 1e-4) {
      candidates.push({ x: e.x, y: e.y });
    }
  }

  if (candidates.length === 0) {
    return { minVal: null, minAt: [], maxVal: null, maxAt: [], hasAsymptote: false };
  }

  candidates.sort((c1, c2) => c1.y - c2.y);
  const minVal = candidates[0].y;
  const maxVal = candidates[candidates.length - 1].y;
  const minAt: number[] = [];
  const maxAt: number[] = [];

  for (const c of candidates) {
    if (Math.abs(c.y - minVal) < 1e-4 && !minAt.some(x => Math.abs(x - c.x) < 1e-4)) {
      minAt.push(c.x);
    }
    if (Math.abs(c.y - maxVal) < 1e-4 && !maxAt.some(x => Math.abs(x - c.x) < 1e-4)) {
      maxAt.push(c.x);
    }
  }

  return { minVal, minAt, maxVal, maxAt, hasAsymptote: false };
}

/**
 * Render đồ thị hoàn chỉnh lên HTML5 Canvas ở độ phân giải cao chuẩn SGK & tối ưu chèn Word
 */
export function renderGraphToCanvas(
  config: GraphConfig,
  canvas: HTMLCanvasElement,
  dpiScale = 2.4,
  options?: {
    fontSizeScale?: number;
    width?: number;
    height?: number;
    fontFamily?: string;
    selectedCustomTextId?: string | null;
  }
): RenderGraphResult {
  const hitboxes: GraphLabelHitbox[] = [];
  const ctx = canvas.getContext('2d');
  if (!ctx) return { hitboxes, unitScale: 36 };

  const fontScale = options?.fontSizeScale ?? config.fontSizeScale ?? 1.0;
  // Phông chữ chuẩn đề thi Toán học & SGK Việt Nam (Times New Roman ưu tiên số 1, Cambria Math số 2)
  const fontFam = options?.fontFamily ?? config.fontFamily ?? '"Times New Roman", "STIX Two Text", "Cambria Math", serif';
  const isLatex = fontFam.includes('KaTeX') || fontFam.includes('Computer Modern');
  const mathFontFam = isLatex
    ? '"KaTeX_Math", "KaTeX_Main", "Latin Modern Math", serif'
    : fontFam;
  const numFontFam = isLatex
    ? '"KaTeX_Main", "Latin Modern Roman", "Computer Modern", serif'
    : fontFam;
  // Kích thước chuẩn đề thi Word và SGK (hệ trục trực chuẩn 1:1)
  const width = options?.width ?? 440;
  const height = options?.height ?? 400;
  const isBoldLabels = config.isBoldLabels ?? true;

  canvas.width = Math.round(width * dpiScale);
  canvas.height = Math.round(height * dpiScale);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.save();
  ctx.scale(dpiScale, dpiScale);

  // Nền trắng tinh khiết
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  const xMin = config.xMin ?? -5.5;
  const xMax = config.xMax ?? 5.5;
  const yMin = config.yMin ?? -5.5;
  const yMax = config.yMax ?? 5.5;

  const margin = 26;
  const spanX = xMax - xMin;
  const spanY = yMax - yMin;
  const availW = width - 2 * margin;
  const availH = height - 2 * margin;

  // Tỉ lệ trực chuẩn 1:1 (Orthonormal isometric Cartesian system): 1 đơn vị Ox = 1 đơn vị Oy (ô lưới vuông tuyệt đối)
  const unitScale = Math.min(availW / spanX, availH / spanY);

  const xCenter = (xMin + xMax) / 2;
  const yCenter = (yMin + yMax) / 2;
  const screenCenterX = width / 2;
  const screenCenterY = height / 2;

  const toScreenX = (x: number) => screenCenterX + (x - xCenter) * unitScale;
  const toScreenY = (y: number) => screenCenterY - (y - yCenter) * unitScale;
  const toMathX = (sx: number) => xCenter + (sx - screenCenterX) / unitScale;
  const toMathY = (sy: number) => yCenter - (sy - screenCenterY) / unitScale;

  // Bán kính chấm tròn cực trị & giao điểm: mặc định 2.4px (thanh mảnh, tinh tế chuẩn SGK)
  const dotRadius = config.dotRadius ?? 2.4;

  const originX = toScreenX(0);
  const originY = toScreenY(0);

  // Tọa độ nguyên của 2 trục tọa độ Ox và Oy
  const axX = Math.round(originX);
  const axY = Math.round(originY);

  // Giới hạn miền toán học thực tế trên khung vẽ
  const plotMinX = toMathX(14);
  const plotMaxX = toMathX(width - 14);
  const plotMinY = toMathY(height - 14);
  const plotMaxY = toMathY(14);

  // Hàm tính toán f(x)
  const f = (x: number): number | null => evalGraphFunction(config, x);

  // =========================================================================
  // BỘ THU THẬP & QUẢN LÝ CHỐNG ĐÈ / TRÙNG SỐ TRÊN TRỤC Ox VÀ Oy
  // Tự động kiểm tra vị trí đường cong f(x), đường gióng, tiệm cận
  // để các chữ và số hiển thị KHÔNG BAO GIỜ che khuất đồ thị
  // =========================================================================
  const numFontSz = Math.round(22 * fontScale);
  const minSafeDistOx = Math.round(24 * Math.max(0.85, fontScale));
  const minSafeDistOy = Math.round(22 * Math.max(0.85, fontScale));
  const minCollisionDistOx = Math.round(30 * Math.max(0.85, fontScale));
  const minCollisionDistOy = Math.round(26 * Math.max(0.85, fontScale));

  const restrictInterval = Boolean(config.restrictInterval && config.intervalA !== undefined && config.intervalB !== undefined);
  const intA = restrictInterval ? Math.min(config.intervalA!, config.intervalB!) : plotMinX;
  const intB = restrictInterval ? Math.max(config.intervalA!, config.intervalB!) : plotMaxX;

  interface LineSegment {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }
  const projectionSegments: LineSegment[] = [];

  // Thu thập trước đường gióng đầu mút trên đoạn [a, b]
  if (restrictInterval && (config.showIntervalEndpoints ?? true)) {
    const endpoints = [{ x: intA }, { x: intB }];
    for (const ep of endpoints) {
      if (ep.x >= plotMinX && ep.x <= plotMaxX) {
        const py = f(ep.x);
        if (py !== null && !isNaN(py) && py >= plotMinY && py <= plotMaxY) {
          const sx = toScreenX(ep.x);
          const sy = toScreenY(py);
          projectionSegments.push({ x1: sx, y1: sy, x2: sx, y2: axY });
          projectionSegments.push({ x1: sx, y1: sy, x2: axX, y2: sy });
        }
      }
    }
  }

  // Thu thập trước đường gióng cực trị
  if (config.showExtrema ?? true) {
    const allExtrema = getExtrema(config);
    const extrema = restrictInterval
      ? allExtrema.filter(pt => pt.x >= intA - 1e-4 && pt.x <= intB + 1e-4)
      : allExtrema;
    for (const pt of extrema) {
      if (pt.x >= plotMinX && pt.x <= plotMaxX && pt.y >= plotMinY && pt.y <= plotMaxY) {
        const sx = toScreenX(pt.x);
        const sy = toScreenY(pt.y);
        projectionSegments.push({ x1: sx, y1: sy, x2: sx, y2: axY });
        projectionSegments.push({ x1: sx, y1: sy, x2: axX, y2: sy });
      }
    }
  }

  // Thu thập trước đường gióng điểm tự chọn
  if (config.showCustomPoint ?? false) {
    const customPointsList: CustomPoint[] = [];
    if (config.customPoints && config.customPoints.length > 0) {
      customPointsList.push(...config.customPoints);
    } else if (config.customPoint) {
      customPointsList.push(config.customPoint);
    }
    for (const cp of customPointsList) {
      const px = cp.x;
      const py = cp.y ?? f(px);
      if (py !== null && py !== undefined && !isNaN(py) && px >= plotMinX && px <= plotMaxX && py >= plotMinY && py <= plotMaxY) {
        const sx = toScreenX(px);
        const sy = toScreenY(py);
        projectionSegments.push({ x1: sx, y1: sy, x2: sx, y2: axY });
        projectionSegments.push({ x1: sx, y1: sy, x2: axX, y2: sy });
      }
    }
  }

  // Thu thập trước đường tiệm cận
  if (config.showAsymptotes ?? true) {
    if (config.type === 'rational' && Math.abs(config.c) > 1e-6) {
      const xTC = -(config.d ?? 0) / config.c;
      const yTC = config.a / config.c;
      if (xTC >= plotMinX && xTC <= plotMaxX) {
        projectionSegments.push({ x1: toScreenX(xTC), y1: 14, x2: toScreenX(xTC), y2: height - 14 });
      }
      if (yTC >= plotMinY && yTC <= plotMaxY) {
        projectionSegments.push({ x1: 14, y1: toScreenY(yTC), x2: width - 14, y2: toScreenY(yTC) });
      }
    } else if (config.type === 'rational_2_1' && Math.abs(config.d ?? 0) > 1e-6) {
      const d = config.d!;
      const e = config.e ?? 0;
      const xTC = -e / d;
      if (xTC >= plotMinX && xTC <= plotMaxX) {
        projectionSegments.push({ x1: toScreenX(xTC), y1: 14, x2: toScreenX(xTC), y2: height - 14 });
      }
      const A = config.a / d;
      const B = (config.b * d - config.a * e) / (d * d);
      projectionSegments.push({
        x1: toScreenX(plotMinX),
        y1: toScreenY(A * plotMinX + B),
        x2: toScreenX(plotMaxX),
        y2: toScreenY(A * plotMaxX + B)
      });
    }
  }

  // Hàm kiểm tra va chạm của hộp chữ nhật với đường cong hàm số f(x)
  function checkCurveCollision(x1: number, y1: number, x2: number, y2: number, padding = 3): number {
    const minX = Math.min(x1, x2) - padding;
    const maxX = Math.max(x1, x2) + padding;
    const minY = Math.min(y1, y2) - padding;
    const maxY = Math.max(y1, y2) + padding;

    const mX1 = toMathX(minX);
    const mX2 = toMathX(maxX);
    const numSamples = 22;
    const dx = (mX2 - mX1) / numSamples;
    let hits = 0;
    let prevSY: number | null = null;

    for (let i = 0; i <= numSamples; i++) {
      const mx = mX1 + i * dx;
      if (restrictInterval && (mx < intA - 0.02 || mx > intB + 0.02)) {
        prevSY = null;
        continue;
      }
      const my = f(mx);
      if (my === null || isNaN(my)) {
        prevSY = null;
        continue;
      }
      const csy = toScreenY(my);
      if (csy >= minY && csy <= maxY) {
        hits++;
      } else if (prevSY !== null) {
        const segMinY = Math.min(prevSY, csy);
        const segMaxY = Math.max(prevSY, csy);
        if (segMinY <= maxY && segMaxY >= minY && Math.abs(csy - prevSY) < height) {
          hits++;
        }
      }
      prevSY = csy;
    }
    return hits;
  }

  // Hàm kiểm tra va chạm của hộp chữ nhật với các đoạn nét đứt (đường gióng, tiệm cận)
  function checkSegmentCollision(x1: number, y1: number, x2: number, y2: number, padding = 2): number {
    const minBx = Math.min(x1, x2) - padding;
    const maxBx = Math.max(x1, x2) + padding;
    const minBy = Math.min(y1, y2) - padding;
    const maxBy = Math.max(y1, y2) + padding;

    let hits = 0;
    for (const seg of projectionSegments) {
      const segMinX = Math.min(seg.x1, seg.x2);
      const segMaxX = Math.max(seg.x1, seg.x2);
      const segMinY = Math.min(seg.y1, seg.y2);
      const segMaxY = Math.max(seg.y1, seg.y2);

      if (segMaxX < minBx || segMinX > maxBx || segMaxY < minBy || segMinY > maxBy) {
        continue;
      }
      hits++;
    }
    return hits;
  }

  // Đo độ rộng chữ chính xác
  function getTextWidthEst(txt: string, fSize: number): number {
    const trimmed = txt.trim();
    const fracMatch = trimmed.match(/^([-+−\u2212]?)\s*([^/]+)\/([^/]+)$/);
    if (fracMatch) {
      const isNeg = fracMatch[1] === '-' || fracMatch[1] === '−' || fracMatch[1] === '\u2212';
      const fracFSize = Math.max(14, Math.round(fSize * 0.8));
      ctx.save();
      ctx.font = `${isBoldLabels ? 'bold ' : 'normal '}${fracFSize}px ${numFontFam}`;
      const numW = ctx.measureText(fracMatch[2].trim()).width;
      const denW = ctx.measureText(fracMatch[3].trim()).width;
      ctx.restore();
      const barW = Math.max(numW, denW) + 8;
      const minusW = isNeg ? Math.max(12, Math.round(fSize * 0.55)) + 5 : 0;
      return minusW + barW;
    }
    ctx.save();
    ctx.font = `${isBoldLabels ? 'bold ' : 'normal '}${fSize}px ${numFontFam}`;
    const w = ctx.measureText(trimmed.replace(/-/g, '−')).width;
    ctx.restore();
    return Math.max(14, w);
  }

  // Tìm vị trí tối ưu cho nhãn điểm (A, B, M) để không đè lên đường cong đồ thị
  function getBestPointLabelPos(
    sx: number,
    sy: number,
    lblText: string,
    fontSz: number
  ): { x: number; y: number; align: 'left' | 'right' | 'center'; baseline: 'middle' | 'bottom' | 'top' } {
    const textW = Math.max(14, lblText.length * fontSz * 0.65);
    const halfH = fontSz * 0.5;
    const dist = 13;

    const candidates: {
      dx: number;
      dy: number;
      align: 'left' | 'right' | 'center';
      baseline: 'middle' | 'bottom' | 'top';
      prefPenalty: number;
    }[] = [
      { dx: dist, dy: -dist, align: 'left', baseline: 'middle', prefPenalty: 0 },    // Góc trên bên phải
      { dx: -dist, dy: -dist, align: 'right', baseline: 'middle', prefPenalty: 2 },  // Góc trên bên trái
      { dx: dist, dy: dist, align: 'left', baseline: 'middle', prefPenalty: 4 },     // Góc dưới bên phải
      { dx: -dist, dy: dist, align: 'right', baseline: 'middle', prefPenalty: 6 },   // Góc dưới bên trái
      { dx: 0, dy: -dist - 4, align: 'center', baseline: 'bottom', prefPenalty: 8 }, // Ngay trên đầu
      { dx: 0, dy: dist + 4, align: 'center', baseline: 'top', prefPenalty: 10 },    // Ngay dưới chân
    ];

    let best = candidates[0];
    let bestScore = Infinity;

    for (const cand of candidates) {
      const lx = sx + cand.dx;
      const ly = sy + cand.dy;
      let bX1 = lx;
      let bX2 = lx + textW;
      if (cand.align === 'right') {
        bX2 = lx;
        bX1 = lx - textW;
      } else if (cand.align === 'center') {
        bX1 = lx - textW / 2;
        bX2 = lx + textW / 2;
      }
      const bY1 = ly - halfH;
      const bY2 = ly + halfH;

      if (bX1 < 8 || bX2 > width - 8 || bY1 < 8 || bY2 > height - 8) continue;

      const curveHits = checkCurveCollision(bX1, bY1, bX2, bY2, 2);
      let axisPenalty = 0;
      if (bX1 <= axX + 2 && bX2 >= axX - 2) axisPenalty += 300;
      if (bY1 <= axY + 2 && bY2 >= axY - 2) axisPenalty += 300;

      const score = cand.prefPenalty + curveHits * 2000 + axisPenalty;
      if (score < bestScore) {
        bestScore = score;
        best = cand;
      }
    }

    return { x: sx + best.dx, y: sy + best.dy, align: best.align, baseline: best.baseline };
  }

  interface OxLabelItem {
    val: number;
    text: string;
    sx: number;
    offsetY: number;
    offsetX?: number;
    priority: number; // 3: cực trị / đầu mút, 2: điểm tự chọn, 1: giao điểm trục, 0: vạch chia đơn vị
  }

  interface OyLabelItem {
    val: number;
    text: string;
    sy: number;
    offsetX: number;
    offsetY?: number;
    align: 'left' | 'right';
    priority: number;
  }

  const oxLabelsList: OxLabelItem[] = [];
  const oyLabelsList: OyLabelItem[] = [];

  function registerOxLabel(val: number, preferredAbove?: boolean, priority = 1) {
    // 1. Không vẽ số nếu quá gần gốc O (tránh đè lên chữ O tại gốc tọa độ)
    if (Math.abs(val) < 0.25) return;
    const sx = toScreenX(val);
    if (sx < 16 || sx > width - 16) return;
    if (Math.abs(sx - axX) < minSafeDistOx) return;

    const text = formatNumDisplay(val);
    const isFrac = text.includes('/');
    const textW = getTextWidthEst(text, numFontSz);
    const halfW = textW / 2;
    const halfH = isFrac ? numFontSz * 0.9 : numFontSz * 0.55;
    const baseOffset = (isFrac ? 19 : 15) * Math.max(0.9, fontScale);
    const shiftX = Math.round((halfW + 4) * Math.max(0.9, fontScale));

    const userCustom = config.oxLabelOffsets?.[text] || (val !== undefined ? config.oxLabelOffsets?.[String(val)] : undefined);
    if (userCustom?.preferredAbove !== undefined) {
      preferredAbove = userCustom.preferredAbove;
    }

    const candidates = [
      { offsetY: baseOffset, offsetX: 0, prefPenalty: preferredAbove ? 18 : 0 },
      { offsetY: -baseOffset, offsetX: 0, prefPenalty: preferredAbove ? 0 : 5 },
      { offsetY: baseOffset, offsetX: shiftX, prefPenalty: (preferredAbove ? 18 : 0) + 25 },
      { offsetY: baseOffset, offsetX: -shiftX, prefPenalty: (preferredAbove ? 18 : 0) + 25 },
      { offsetY: -baseOffset, offsetX: shiftX, prefPenalty: (preferredAbove ? 0 : 5) + 30 },
      { offsetY: -baseOffset, offsetX: -shiftX, prefPenalty: (preferredAbove ? 0 : 5) + 30 },
    ];

    let bestCand = candidates[0];
    let bestScore = Infinity;

    for (const cand of candidates) {
      const cx = sx + cand.offsetX;
      const cy = axY + cand.offsetY;
      const bX1 = cx - halfW;
      const bX2 = cx + halfW;
      const bY1 = cy - halfH;
      const bY2 = cy + halfH;

      if (bX1 < 8 || bX2 > width - 8 || bY1 < 8 || bY2 > height - 8) continue;

      let oPenalty = 0;
      if (Math.hypot(cx - (axX - 6), cy - (axY - 4)) < 22) {
        oPenalty = 900;
      }

      const curveHits = checkCurveCollision(bX1, bY1, bX2, bY2, 3);
      const segHits = checkSegmentCollision(bX1, bY1, bX2, bY2, 2);

      const totalScore = cand.prefPenalty + oPenalty + curveHits * 2000 + segHits * 400;
      if (totalScore < bestScore) {
        bestScore = totalScore;
        bestCand = cand;
      }
    }

    let finalOffsetY = (userCustom?.preferredAbove !== undefined) ? (userCustom.preferredAbove ? -baseOffset : baseOffset) : bestCand.offsetY;
    let finalOffsetX = bestCand.offsetX;
    if (userCustom?.offsetY !== undefined) finalOffsetY += userCustom.offsetY;
    if (userCustom?.offsetX !== undefined) finalOffsetX += userCustom.offsetX;

    // 2. Kiểm tra khoảng cách với các số đã có trên Ox để tránh đè chữ
    const collisionIdx = oxLabelsList.findIndex(l => {
      const sameSide = (l.offsetY > 0 && finalOffsetY > 0) || (l.offsetY < 0 && finalOffsetY < 0);
      const distThreshold = sameSide ? minCollisionDistOx : 14;
      return Math.abs((l.sx + (l.offsetX || 0)) - (sx + finalOffsetX)) < distThreshold;
    });

    if (collisionIdx !== -1) {
      const existing = oxLabelsList[collisionIdx];
      if (existing.text === text || Math.abs(existing.val - val) < 0.1) {
        if (priority > existing.priority) {
          oxLabelsList[collisionIdx] = { val, text, sx, offsetY: finalOffsetY, offsetX: finalOffsetX, priority };
        }
        return;
      }

      // Nếu đang cùng phía và va chạm, thử lật sang phía đối diện của trục Ox để hiển thị cả 2 số
      const sameSide = (existing.offsetY > 0 && finalOffsetY > 0) || (existing.offsetY < 0 && finalOffsetY < 0);
      if (sameSide && (userCustom?.preferredAbove === undefined)) {
        const flippedOffsetY = -finalOffsetY;
        const flippedCollision = oxLabelsList.some(l => {
          const lSameSide = (l.offsetY > 0 && flippedOffsetY > 0) || (l.offsetY < 0 && flippedOffsetY < 0);
          const dThresh = lSameSide ? minCollisionDistOx : 14;
          return Math.abs((l.sx + (l.offsetX || 0)) - (sx + finalOffsetX)) < dThresh;
        });
        if (!flippedCollision) {
          oxLabelsList.push({ val, text, sx, offsetY: flippedOffsetY, offsetX: finalOffsetX, priority });
          return;
        }
      }

      if (priority > existing.priority) {
        oxLabelsList[collisionIdx] = { val, text, sx, offsetY: finalOffsetY, offsetX: finalOffsetX, priority };
      } else if (priority < existing.priority) {
        return;
      } else {
        const isCurrentInt = Math.abs(val - Math.round(val)) < 1e-3;
        const isExistingInt = Math.abs(existing.val - Math.round(existing.val)) < 1e-3;
        if (isCurrentInt && !isExistingInt) {
          oxLabelsList[collisionIdx] = { val, text, sx, offsetY: finalOffsetY, offsetX: finalOffsetX, priority };
        }
        return;
      }
      return;
    }

    oxLabelsList.push({ val, text, sx, offsetY: finalOffsetY, offsetX: finalOffsetX, priority });
  }

  function registerOyLabel(val: number, preferredRight?: boolean, priority = 1) {
    // 1. Không vẽ số nếu quá gần gốc O
    if (Math.abs(val) < 0.25) return;
    const sy = toScreenY(val);
    if (sy < 16 || sy > height - 16) return;
    if (Math.abs(sy - axY) < minSafeDistOy) return;

    const text = formatNumDisplay(val);
    const isFrac = text.includes('/');
    const textW = getTextWidthEst(text, numFontSz);
    const halfH = isFrac ? numFontSz * 0.9 : numFontSz * 0.55;
    const baseOffset = Math.round(8 * Math.max(0.9, fontScale));
    const vertShift = Math.round((isFrac ? 13 : 11) * Math.max(0.9, fontScale));

    const userCustom = config.oyLabelOffsets?.[text] || (val !== undefined ? config.oyLabelOffsets?.[String(val)] : undefined);
    if (userCustom?.preferredRight !== undefined) {
      preferredRight = userCustom.preferredRight;
    }

    const candidates: {
      offsetX: number;
      offsetY: number;
      align: 'left' | 'right';
      prefPenalty: number;
    }[] = [
      { offsetX: -baseOffset, offsetY: 0, align: 'right', prefPenalty: preferredRight ? 16 : 0 },
      { offsetX: baseOffset, offsetY: 0, align: 'left', prefPenalty: preferredRight ? 0 : 5 },
      { offsetX: -baseOffset, offsetY: -vertShift, align: 'right', prefPenalty: (preferredRight ? 16 : 0) + 12 },
      { offsetX: -baseOffset, offsetY: vertShift, align: 'right', prefPenalty: (preferredRight ? 16 : 0) + 16 },
      { offsetX: baseOffset, offsetY: -vertShift, align: 'left', prefPenalty: (preferredRight ? 0 : 5) + 18 },
      { offsetX: baseOffset, offsetY: vertShift, align: 'left', prefPenalty: (preferredRight ? 0 : 5) + 22 },
    ];

    let bestCand = candidates[0];
    let bestScore = Infinity;

    for (const cand of candidates) {
      const cy = sy + cand.offsetY;
      let bX1: number;
      let bX2: number;
      if (cand.align === 'right') {
        bX2 = axX + cand.offsetX;
        bX1 = bX2 - textW;
      } else {
        bX1 = axX + cand.offsetX;
        bX2 = bX1 + textW;
      }
      const bY1 = cy - halfH;
      const bY2 = cy + halfH;

      if (bX1 < 8 || bX2 > width - 8 || bY1 < 8 || bY2 > height - 8) continue;

      let oPenalty = 0;
      if (Math.hypot((bX1 + bX2) / 2 - (axX - 6), cy - (axY - 4)) < 20) {
        oPenalty = 900;
      }

      const curveHits = checkCurveCollision(bX1, bY1, bX2, bY2, 3);
      const segHits = checkSegmentCollision(bX1, bY1, bX2, bY2, 2);

      const totalScore = cand.prefPenalty + oPenalty + curveHits * 2000 + segHits * 400;
      if (totalScore < bestScore) {
        bestScore = totalScore;
        bestCand = cand;
      }
    }

    let finalOffsetX = (userCustom?.preferredRight !== undefined) ? (userCustom.preferredRight ? baseOffset : -baseOffset) : bestCand.offsetX;
    let finalOffsetY = bestCand.offsetY;
    let finalAlign = (userCustom?.preferredRight !== undefined) ? (userCustom.preferredRight ? 'left' : 'right') : bestCand.align;
    if (userCustom?.offsetX !== undefined) finalOffsetX += userCustom.offsetX;
    if (userCustom?.offsetY !== undefined) finalOffsetY += userCustom.offsetY;

    // 2. Kiểm tra va chạm với số đã có trên Oy
    const collisionIdx = oyLabelsList.findIndex(l => Math.abs(l.sy - sy) < minCollisionDistOy);
    if (collisionIdx !== -1) {
      const existing = oyLabelsList[collisionIdx];
      if (existing.text === text || Math.abs(existing.val - val) < 0.1) {
        if (priority > existing.priority) {
          oyLabelsList[collisionIdx] = {
            val,
            text,
            sy,
            offsetX: finalOffsetX,
            offsetY: finalOffsetY,
            align: finalAlign,
            priority
          };
        }
        return;
      }
      if (priority > existing.priority) {
        oyLabelsList[collisionIdx] = {
          val,
          text,
          sy,
          offsetX: finalOffsetX,
          offsetY: finalOffsetY,
          align: finalAlign,
          priority
        };
      } else if (priority < existing.priority) {
        return;
      } else {
        const isCurrentInt = Math.abs(val - Math.round(val)) < 1e-3;
        const isExistingInt = Math.abs(existing.val - Math.round(existing.val)) < 1e-3;
        if (isCurrentInt && !isExistingInt) {
          oyLabelsList[collisionIdx] = {
            val,
            text,
            sy,
            offsetX: finalOffsetX,
            offsetY: finalOffsetY,
            align: finalAlign,
            priority
          };
        }
        return;
      }
      return;
    }

    oyLabelsList.push({
      val,
      text,
      sy,
      offsetX: finalOffsetX,
      offsetY: finalOffsetY,
      align: finalAlign,
      priority
    });
  }

  // 1. Vẽ lưới mờ ô vuông trực chuẩn (nếu bật)
  if (config.showGrid) {
    ctx.save();
    ctx.strokeStyle = '#E2E8F0'; // Màu lưới Slate-200 thanh nhã, rõ ràng chuẩn SGK
    ctx.lineWidth = 1;

    // Bước lưới tọa độ: mặc định 1 đơn vị chuẩn SGK (mỗi ô vuông = 1 đơn vị)
    const defaultGridStep = spanX > 20 || spanY > 20 ? 2 : 1;
    const gridStep = config.gridStep ?? config.tickStep ?? defaultGridStep;

    const gridLeft = 14;
    const gridRight = width - 14;
    const gridTop = 14;
    const gridBottom = height - 14;

    const kMinX = Math.ceil(toMathX(gridLeft) / gridStep);
    const kMaxX = Math.floor(toMathX(gridRight) / gridStep);
    for (let k = kMinX; k <= kMaxX; k++) {
      const x = k * gridStep;
      const sx = Math.round(toScreenX(x)) + 0.5;
      if (sx >= gridLeft && sx <= gridRight) {
        ctx.beginPath();
        ctx.moveTo(sx, gridTop);
        ctx.lineTo(sx, gridBottom);
        ctx.stroke();
      }
    }

    const kMinY = Math.ceil(toMathY(gridBottom) / gridStep);
    const kMaxY = Math.floor(toMathY(gridTop) / gridStep);
    for (let k = kMinY; k <= kMaxY; k++) {
      const y = k * gridStep;
      const sy = Math.round(toScreenY(y)) + 0.5;
      if (sy >= gridTop && sy <= gridBottom) {
        ctx.beginPath();
        ctx.moveTo(gridLeft, sy);
        ctx.lineTo(gridRight, sy);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 1.5. VẼ MIỀN DIỆN TÍCH TÍCH PHÂN GẠCH SỌC (TOÁN 12 - ỨNG DỤNG HÌNH HỌC TÍCH PHÂN)
  if (config.integralArea && config.integralArea.enabled) {
    const intCfg = config.integralArea;
    const a = Math.min(intCfg.a, intCfg.b);
    const b = Math.max(intCfg.a, intCfg.b);

    if (b > a) {
      const g = (x: number): number => {
        if (intCfg.gType === 'linear') {
          const m = intCfg.gLineM ?? 1;
          const n = intCfg.gLineN ?? 0;
          return m * x + n;
        }
        return 0; // Trục hoành Ox: y = 0
      };

      // Xây dựng đường viền khép kín của miền diện tích từ a đến b
      const areaSteps = Math.max(120, Math.round((b - a) * unitScale * 2));
      const areaDx = (b - a) / areaSteps;

      ctx.save();
      ctx.beginPath();

      // Đi dọc theo đường f(x) từ a -> b
      let first = true;
      for (let i = 0; i <= areaSteps; i++) {
        const x = a + i * areaDx;
        const y = f(x);
        if (y !== null && !isNaN(y)) {
          const sx = toScreenX(x);
          const sy = Math.max(-100, Math.min(height + 100, toScreenY(y)));
          if (first) {
            ctx.moveTo(sx, sy);
            first = false;
          } else {
            ctx.lineTo(sx, sy);
          }
        }
      }

      // Đi ngược theo đường g(x) từ b -> a
      for (let i = areaSteps; i >= 0; i--) {
        const x = a + i * areaDx;
        const gy = g(x);
        const sx = toScreenX(x);
        const sy = toScreenY(gy);
        ctx.lineTo(sx, sy);
      }

      ctx.closePath();

      // 1. Tô màu mờ nền nếu có
      const doFill = intCfg.style === 'fill' || intCfg.style === 'both';
      if (doFill) {
        ctx.fillStyle = intCfg.fillColor || 'rgba(13, 148, 136, 0.22)';
        ctx.fill();
      }

      // 2. Gạch sọc xiên (Hatch pattern) chuẩn đề thi nếu có
      const doHatch = intCfg.style === 'hatch' || intCfg.style === 'both' || !intCfg.style;
      if (doHatch) {
        ctx.save();
        ctx.clip(); // Giới hạn chỉ vẽ nét gạch trong miền khép kín

        const angleDeg = intCfg.hatchAngle ?? 45;
        const angleRad = (angleDeg * Math.PI) / 180;
        const spacing = Math.max(5, intCfg.hatchSpacing ?? 8);

        ctx.strokeStyle = intCfg.hatchColor || (intCfg.style === 'both' ? '#0d9488' : '#000000');
        ctx.lineWidth = 1.1;

        // Bounding box của miền trên màn hình
        const screenA = toScreenX(a);
        const screenB = toScreenX(b);
        const minScreenX = Math.min(screenA, screenB) - 10;
        const maxScreenX = Math.max(screenA, screenB) + 10;
        const minScreenY = 0;
        const maxScreenY = height;

        // Chiều dài đường chéo bao phủ
        const diag = Math.hypot(maxScreenX - minScreenX, maxScreenY - minScreenY);
        const cosA = Math.cos(angleRad);
        const sinA = Math.sin(angleRad);

        // Vector vuông góc với đường gạch
        const perpX = -sinA;
        const perpY = cosA;

        // Tâm của bounding box
        const cx = (minScreenX + maxScreenX) / 2;
        const cy = (minScreenY + maxScreenY) / 2;

        const numLines = Math.ceil(diag / spacing);
        ctx.beginPath();
        for (let k = -numLines; k <= numLines; k++) {
          const px = cx + k * spacing * perpX;
          const py = cy + k * spacing * perpY;

          // Điểm đầu và cuối của đường gạch dài vượt ngoài clip
          const x1 = px - diag * cosA;
          const y1 = py - diag * sinA;
          const x2 = px + diag * cosA;
          const y2 = py + diag * sinA;

          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();

      // 3. Nếu g(x) là đường thẳng (gType === 'linear'), vẽ luôn đường thẳng g(x)
      if (intCfg.gType === 'linear') {
        const m = intCfg.gLineM ?? 1;
        const n = intCfg.gLineN ?? 0;
        const yL = m * plotMinX + n;
        const yR = m * plotMaxX + n;
        ctx.save();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(toScreenX(plotMinX), toScreenY(yL));
        ctx.lineTo(toScreenX(plotMaxX), toScreenY(yR));
        ctx.stroke();
        ctx.restore();
      }

      // 4. Vẽ 2 đường dóng cận thẳng đứng tại x = a và x = b
      if (intCfg.showBoundLines ?? true) {
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.3;

        // Dóng cận a
        const ya1 = f(a) ?? 0;
        const ya2 = g(a);
        ctx.beginPath();
        ctx.moveTo(toScreenX(a), toScreenY(Math.min(0, Math.min(ya1, ya2))));
        ctx.lineTo(toScreenX(a), toScreenY(Math.max(0, Math.max(ya1, ya2))));
        ctx.stroke();

        // Dóng cận b
        const yb1 = f(b) ?? 0;
        const yb2 = g(b);
        ctx.beginPath();
        ctx.moveTo(toScreenX(b), toScreenY(Math.min(0, Math.min(yb1, yb2))));
        ctx.lineTo(toScreenX(b), toScreenY(Math.max(0, Math.max(yb1, yb2))));
        ctx.stroke();
        ctx.restore();

        // Đăng ký số cận a, b trên trục hoành Ox
        registerOxLabel(a, false, 4);
        registerOxLabel(b, false, 4);
      }

      // 5. Hiển thị chữ nhãn diện tích "S" ở tâm miền
      if (intCfg.showAreaLabel ?? true) {
        const midX = (a + b) / 2;
        const midY = ((f(midX) ?? 0) + g(midX)) / 2;
        const sX = toScreenX(midX);
        const sY = toScreenY(midY);
        const sText = intCfg.areaLabelText || 'S';

        ctx.save();
        const sFontSz = Math.round(24 * fontScale);
        ctx.font = `italic ${isBoldLabels ? 'bold ' : 'normal '}${sFontSz}px ${mathFontFam}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Viền trắng bảo vệ chữ không bị gạch sọc đè
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = isBoldLabels ? 5 : 3.2;
        ctx.lineJoin = 'round';
        ctx.strokeText(sText, sX, sY);

        ctx.fillStyle = doHatch ? '#000000' : '#0d9488';
        ctx.fillText(sText, sX, sY);
        if (isBoldLabels) {
          ctx.strokeStyle = doHatch ? '#000000' : '#0d9488';
          ctx.lineWidth = 0.6;
          ctx.strokeText(sText, sX, sY);
        }
        ctx.restore();
      }
    }
  }

  // 2. Vẽ Hệ trục tọa độ Oxy chuẩn mực SGK (nét đậm, mũi tên sắc sảo)
  const axisWidth = config.axisWidth ?? 1.8;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = axisWidth;

  // Trục Ox
  ctx.beginPath();
  ctx.moveTo(12, axY);
  ctx.lineTo(width - 10, axY);
  ctx.stroke();
  drawArrowHead(ctx, width - 10, axY, 0, isLatex);

  // Trục Oy
  ctx.beginPath();
  ctx.moveTo(axX, height - 10);
  ctx.lineTo(axX, 10);
  ctx.stroke();
  drawArrowHead(ctx, axX, 10, -Math.PI / 2, isLatex);

  // 3. Vẽ các vạch chia đơn vị và ghi số đơn vị trên 2 trục Ox, Oy (nếu được bật)
  const showTicks = config.showTicks ?? false;
  const showTickLabels = config.showTickLabels ?? false;
  const defaultTickStep = spanX > 16 || spanY > 16 ? 2 : 1;
  const tickStepX = config.tickStepX ?? config.tickStep ?? defaultTickStep;
  const tickStepY = config.tickStepY ?? config.tickStep ?? defaultTickStep;

  if (showTicks || showTickLabels) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.3;
    const tickLen = 4;

    // Vạch chia trục Ox
    const kTickMinX = Math.ceil(plotMinX / tickStepX);
    const kTickMaxX = Math.floor(plotMaxX / tickStepX);
    for (let k = kTickMinX; k <= kTickMaxX; k++) {
      const rx = Math.round(k * tickStepX * 1000) / 1000;
      if (Math.abs(rx) < 1e-4) continue;
      const sx = toScreenX(rx);
      if (sx >= 18 && sx <= width - 24) {
        if (showTicks) {
          ctx.beginPath();
          ctx.moveTo(sx, axY - tickLen);
          ctx.lineTo(sx, axY + tickLen);
          ctx.stroke();
        }
        if (showTickLabels) {
          registerOxLabel(rx, false, 0); // priority = 0 (vạch chia đơn vị)
        }
      }
    }

    // Vạch chia trục Oy
    const kTickMinY = Math.ceil(plotMinY / tickStepY);
    const kTickMaxY = Math.floor(plotMaxY / tickStepY);
    for (let k = kTickMinY; k <= kTickMaxY; k++) {
      const ry = Math.round(k * tickStepY * 1000) / 1000;
      if (Math.abs(ry) < 1e-4) continue;
      const sy = toScreenY(ry);
      if (sy >= 24 && sy <= height - 18) {
        if (showTicks) {
          ctx.beginPath();
          ctx.moveTo(axX - tickLen, sy);
          ctx.lineTo(axX + tickLen, sy);
          ctx.stroke();
        }
        if (showTickLabels) {
          registerOyLabel(ry, false, 0); // priority = 0 (vạch chia đơn vị)
        }
      }
    }
  }

  // 4. Nhãn trục Ox, Oy, gốc O (Font to rõ, chuẩn in ấn SGK & Word có viền Halo trắng)
  const axisLabelFontSz = Math.round(25 * fontScale);
  ctx.font = `italic ${isBoldLabels ? 'bold ' : 'normal '}${axisLabelFontSz}px ${mathFontFam}`;

  // Nhãn x nằm ngay phía trên mũi tên trục Ox
  if (axY >= 10 && axY <= height - 10) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    const labelX_x = (width - 10) + (config.axisLabelXOffset?.x ?? 0);
    const labelX_y = Math.max(16, Math.min(height - 10, axY - 5)) + (config.axisLabelXOffset?.y ?? 0);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = isBoldLabels ? 5.5 : 3.0;
    ctx.lineJoin = 'round';
    ctx.strokeText('x', labelX_x, labelX_y);
    ctx.fillStyle = '#000000';
    ctx.fillText('x', labelX_x, labelX_y);
    if (isBoldLabels) {
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = '#000000';
      ctx.strokeText('x', labelX_x, labelX_y);
    }

    hitboxes.push({
      id: 'axis_x',
      text: 'x',
      type: 'axis_x',
      x: labelX_x - 22,
      y: labelX_y - 22,
      width: 26,
      height: 26
    });
  }

  // Nhãn y nằm ngay bên phải mũi tên trục Oy
  if (axX >= 10 && axX <= width - 10) {
    ctx.font = `italic ${isBoldLabels ? 'bold ' : 'normal '}${axisLabelFontSz}px ${mathFontFam}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const labelY_x = Math.min(width - 14, Math.max(14, axX + 8)) + (config.axisLabelYOffset?.x ?? 0);
    const labelY_y = 14 + (config.axisLabelYOffset?.y ?? 0);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = isBoldLabels ? 5.5 : 3.0;
    ctx.lineJoin = 'round';
    ctx.strokeText('y', labelY_x, labelY_y);
    ctx.fillStyle = '#000000';
    ctx.fillText('y', labelY_x, labelY_y);
    if (isBoldLabels) {
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = '#000000';
      ctx.strokeText('y', labelY_x, labelY_y);
    }

    hitboxes.push({
      id: 'axis_y',
      text: 'y',
      type: 'axis_y',
      x: labelY_x - 4,
      y: labelY_y - 12,
      width: 26,
      height: 26
    });
  }

  // Gốc O nằm ở góc phần tư thứ II (mặc định) hoặc góc phần tư thoáng nhất không đè đồ thị
  if (axX >= 14 && axX <= width - 14 && axY >= 14 && axY <= height - 14) {
    const oCandidates = [
      { x: axX - 6, y: axY - 4, align: 'right' as const, baseline: 'bottom' as const, bX1: axX - 22, bX2: axX - 2, bY1: axY - 22, bY2: axY - 2, pref: 0, key: 'top-left' as const },
      { x: axX + 6, y: axY + 16, align: 'left' as const, baseline: 'bottom' as const, bX1: axX + 2, bX2: axX + 22, bY1: axY + 2, bY2: axY + 22, pref: 5, key: 'bottom-right' as const },
      { x: axX - 6, y: axY + 16, align: 'right' as const, baseline: 'bottom' as const, bX1: axX - 22, bX2: axX - 2, bY1: axY + 2, bY2: axY + 22, pref: 10, key: 'bottom-left' as const },
      { x: axX + 6, y: axY - 4, align: 'left' as const, baseline: 'bottom' as const, bX1: axX + 2, bX2: axX + 22, bY1: axY - 22, bY2: axY - 2, pref: 15, key: 'top-right' as const },
    ];
    let bestO = oCandidates[0];
    if (config.originQuadrant && config.originQuadrant !== 'auto') {
      const found = oCandidates.find(c => c.key === config.originQuadrant);
      if (found) bestO = found;
    } else {
      let bestOScore = Infinity;
      for (const cand of oCandidates) {
        const curveHits = checkCurveCollision(cand.bX1, cand.bY1, cand.bX2, cand.bY2, 2);
        const score = cand.pref + curveHits * 2000;
        if (score < bestOScore) {
          bestOScore = score;
          bestO = cand;
        }
      }
    }

    const drawOX = bestO.x + (config.originOffset?.x ?? 0);
    const drawOY = bestO.y + (config.originOffset?.y ?? 0);

    ctx.font = `italic ${isBoldLabels ? 'bold ' : 'normal '}${axisLabelFontSz}px ${mathFontFam}`;
    ctx.textAlign = bestO.align;
    ctx.textBaseline = bestO.baseline;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = isBoldLabels ? Math.max(3, Math.round(3.5 * fontScale)) : Math.max(2.0, Math.round(2.2 * fontScale));
    ctx.lineJoin = 'round';
    ctx.strokeText('O', drawOX, drawOY);
    ctx.fillStyle = '#000000';
    ctx.fillText('O', drawOX, drawOY);
    if (isBoldLabels) {
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = '#000000';
      ctx.strokeText('O', drawOX, drawOY);
    }

    hitboxes.push({
      id: 'O',
      text: 'O',
      type: 'origin',
      x: (bestO.align === 'right' ? drawOX - 22 : drawOX) - 4,
      y: (bestO.baseline === 'bottom' ? drawOY - 22 : drawOY) - 4,
      width: 28,
      height: 28
    });
  }

  // 3. Vẽ Tiệm cận nếu có (Chuẩn nét đứt đen sắc nét SGK, hiện số tại các trục tọa độ)
  const showAsymptotes = config.showAsymptotes ?? true;

  if (showAsymptotes) {
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.3;

    // Phân thức bậc 1/1: y = (ax+b)/(cx+d)
    if (config.type === 'rational' && Math.abs(config.c) > 1e-6) {
      const xTC = -(config.d ?? 0) / config.c;
      const yTC = config.a / config.c;

      // Tiệm cận đứng x = -d/c
      if (xTC >= plotMinX && xTC <= plotMaxX) {
        ctx.beginPath();
        ctx.moveTo(toScreenX(xTC), 14);
        ctx.lineTo(toScreenX(xTC), height - 14);
        ctx.stroke();

        // Hiện số mà tiệm cận đứng cắt trục hoành Ox
        registerOxLabel(xTC, yTC < -0.1, 3);
      }
      // Tiệm cận ngang y = a/c
      if (yTC >= plotMinY && yTC <= plotMaxY) {
        ctx.beginPath();
        ctx.moveTo(14, toScreenY(yTC));
        ctx.lineTo(width - 14, toScreenY(yTC));
        ctx.stroke();

        // Hiện số mà tiệm cận ngang cắt trục tung Oy
        registerOyLabel(yTC, xTC < -0.18, 3);
      }
    }

    // Phân thức bậc 2/1: y = (ax^2+bx+c)/(dx+e)
    if (config.type === 'rational_2_1' && Math.abs(config.d ?? 0) > 1e-6) {
      const d = config.d!;
      const e = config.e ?? 0;
      const a = config.a;
      const b = config.b;

      // Tiệm cận đứng x = -e/d
      const xTC = -e / d;
      if (xTC >= plotMinX && xTC <= plotMaxX) {
        ctx.beginPath();
        ctx.moveTo(toScreenX(xTC), 14);
        ctx.lineTo(toScreenX(xTC), height - 14);
        ctx.stroke();

        // Hiện số mà tiệm cận đứng cắt trục hoành Ox
        registerOxLabel(xTC, false, 3);
      }

      // Tiệm cận xiên: y = Ax + B với A = a/d, B = (b*d - a*e)/(d*d)
      const A = a / d;
      const B = (b * d - a * e) / (d * d);

      const yLeft = A * plotMinX + B;
      const yRight = A * plotMaxX + B;

      ctx.beginPath();
      ctx.moveTo(toScreenX(plotMinX), toScreenY(yLeft));
      ctx.lineTo(toScreenX(plotMaxX), toScreenY(yRight));
      ctx.stroke();

      // Hiện số nơi tiệm cận xiên cắt trục tung Oy (nếu trong miền vẽ)
      if (B >= plotMinY && B <= plotMaxY && Math.abs(B) > 0.25) {
        registerOyLabel(B, false, 2);
      }
    }
    ctx.restore();
  }

  // 4. Vẽ đường cong đồ thị (độ dày 2.4px rõ nét, không bị chìm khi in)
  const drawStart = restrictInterval ? Math.max(plotMinX, intA) : plotMinX;
  const drawEnd = restrictInterval ? Math.min(plotMaxX, intB) : plotMaxX;

  const numSteps = Math.max(450, Math.round((drawEnd - drawStart) * unitScale * 2));
  const step = (drawEnd - drawStart) / numSteps;

  const curveColor = config.curveColor ?? '#000000';
  const curveWidth = config.curveWidth ?? (restrictInterval ? 2.8 : 2.4);
  ctx.strokeStyle = curveColor;
  ctx.lineWidth = curveWidth;
  ctx.beginPath();
  let isDrawing = false;

  for (let x = drawStart; x <= drawEnd; x += step) {
    const y = f(x);
    if (y === null || isNaN(y) || y < plotMinY - 6 || y > plotMaxY + 6) {
      isDrawing = false;
      continue;
    }

    const sx = toScreenX(x);
    const sy = toScreenY(y);

    if (!isDrawing) {
      ctx.moveTo(sx, sy);
      isDrawing = true;
    } else {
      ctx.lineTo(sx, sy);
    }
  }

  if (isDrawing && drawEnd > drawStart) {
    const yEnd = f(drawEnd);
    if (yEnd !== null && !isNaN(yEnd) && yEnd >= plotMinY - 6 && yEnd <= plotMaxY + 6) {
      ctx.lineTo(toScreenX(drawEnd), toScreenY(yEnd));
    }
  }
  ctx.stroke();

  // 4.1. Thể hiện 2 ĐẦU MÚT TRÊN ĐOẠN [a; b] (Đường gióng & Chấm tròn)
  if (restrictInterval && (config.showIntervalEndpoints ?? true)) {
    const endpoints = [
      { x: intA, label: 'A' },
      { x: intB, label: 'B' }
    ];

    ctx.save();
    for (const ep of endpoints) {
      if (ep.x < plotMinX || ep.x > plotMaxX) continue;
      const py = f(ep.x);
      if (py === null || isNaN(py) || py < plotMinY || py > plotMaxY) continue;

      const sx = toScreenX(ep.x);
      const sy = toScreenY(py);

      // Đường gióng nét đứt tới Ox, Oy
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.3;

      // Gióng xuống Ox
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, axY);
      ctx.stroke();

      // Gióng sang Oy
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(axX, sy);
      ctx.stroke();

      // Chấm tròn đầu mút (bán kính nhỏ gọn thanh mảnh)
      ctx.setLineDash([]);
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(2.2, dotRadius + 0.2), 0, Math.PI * 2);
      ctx.fill();

      // Đăng ký số tọa độ đầu mút
      registerOxLabel(ep.x, py < -0.1, 3);
      registerOyLabel(py, ep.x < -0.18, 3);

      // Ghi nhãn chữ A, B cạnh đầu mút (vị trí tối ưu không bao giờ đè đồ thị)
      const pointLabelFontSz = Math.round(21 * fontScale);
      ctx.font = `italic ${isBoldLabels ? 'bold ' : 'normal '}${pointLabelFontSz}px ${mathFontFam}`;
      const bestPos = getBestPointLabelPos(sx, sy, ep.label, pointLabelFontSz);
      ctx.textAlign = bestPos.align;
      ctx.textBaseline = bestPos.baseline;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = isBoldLabels ? Math.max(3, Math.round(3.5 * fontScale)) : Math.max(2.0, Math.round(2.2 * fontScale));
      ctx.lineJoin = 'round';
      ctx.strokeText(ep.label, bestPos.x, bestPos.y);
      ctx.fillStyle = '#000000';
      ctx.fillText(ep.label, bestPos.x, bestPos.y);
      if (isBoldLabels) {
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = '#000000';
        ctx.strokeText(ep.label, bestPos.x, bestPos.y);
      }
    }
    ctx.restore();
  }

  // 5. Thể hiện ĐIỂM CỰC TRỊ (Đường gióng đứt nét & Chấm tròn)
  const showExtrema = config.showExtrema ?? true;
  if (showExtrema) {
    const allExtrema = getExtrema(config);
    const extrema = restrictInterval
      ? allExtrema.filter(pt => pt.x >= intA - 1e-4 && pt.x <= intB + 1e-4)
      : allExtrema;

    ctx.save();
    for (const pt of extrema) {
      if (pt.x < plotMinX || pt.x > plotMaxX || pt.y < plotMinY || pt.y > plotMaxY) continue;

      const sx = toScreenX(pt.x);
      const sy = toScreenY(pt.y);

      // Đường gióng nét đứt
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.3;

      // Gióng xuống trục Ox
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, axY);
      ctx.stroke();

      // Gióng sang trục Oy
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(axX, sy);
      ctx.stroke();

      // Chấm tròn cực trị (bán kính nhỏ gọn thanh mảnh chuẩn SGK)
      const showExtremaDots = config.showExtremaDots ?? (!isLatex);
      if (showExtremaDots) {
        ctx.setLineDash([]);
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(sx, sy, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Đăng ký số tọa độ cực trị (mức ưu tiên cao nhất = 3)
      registerOxLabel(pt.x, pt.y < -0.1, 3);
      registerOyLabel(pt.y, pt.x < -0.18, 3);
    }
    ctx.restore();
  }

  // 5.1. Thể hiện ĐIỂM THUỘC ĐỒ THỊ DO NGƯỜI DÙNG TẠO
  const showCustomPoint = config.showCustomPoint ?? false;
  if (showCustomPoint) {
    const customPointsList: CustomPoint[] = [];
    if (config.customPoints && config.customPoints.length > 0) {
      customPointsList.push(...config.customPoints);
    } else if (config.customPoint) {
      customPointsList.push(config.customPoint);
    }

    ctx.save();
    for (const cp of customPointsList) {
      const px = cp.x;
      let py = cp.y;
      if (py === undefined || py === null || isNaN(py)) {
        py = f(px);
      }

      if (py === null || isNaN(py)) continue;
      if (px < plotMinX || px > plotMaxX || py < plotMinY || py > plotMaxY) continue;

      const sx = toScreenX(px);
      const sy = toScreenY(py);

      // Đường gióng nét đứt tới 2 trục
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.3;

      // Gióng xuống trục Ox
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, axY);
      ctx.stroke();

      // Gióng sang trục Oy
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(axX, sy);
      ctx.stroke();

      // Chấm tròn điểm (bán kính nhỏ gọn thanh mảnh)
      ctx.setLineDash([]);
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(2.2, dotRadius + 0.2), 0, Math.PI * 2);
      ctx.fill();

      // Đăng ký số tọa độ điểm người dùng (mức ưu tiên = 2)
      registerOxLabel(px, py < -0.1, 2);
      registerOyLabel(py, px < -0.18, 2);

      // Ghi nhãn tên điểm nếu có (ví dụ "M", "A") vị trí tối ưu không đè đồ thị
      if (cp.label && cp.label.trim()) {
        const lbl = cp.label.trim();
        const pointLabelFontSz = Math.round(21 * fontScale);
        ctx.font = `italic ${isBoldLabels ? 'bold ' : 'normal '}${pointLabelFontSz}px ${mathFontFam}`;
        const bestPos = getBestPointLabelPos(sx, sy, lbl, pointLabelFontSz);
        ctx.textAlign = bestPos.align;
        ctx.textBaseline = bestPos.baseline;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = isBoldLabels ? Math.max(3, Math.round(3.5 * fontScale)) : Math.max(2.0, Math.round(2.2 * fontScale));
        ctx.lineJoin = 'round';
        ctx.strokeText(lbl, bestPos.x, bestPos.y);
        ctx.fillStyle = '#000000';
        ctx.fillText(lbl, bestPos.x, bestPos.y);
        if (isBoldLabels) {
          ctx.lineWidth = 0.6;
          ctx.strokeStyle = '#000000';
          ctx.strokeText(lbl, bestPos.x, bestPos.y);
        }
      }
    }
    ctx.restore();
  }

  // 6. Thể hiện GIAO ĐIỂM VỚI TRỤC HOÀNH (Ox) VÀ TRỤC TUNG (Oy)
  const showIntersections = (config.showIntersections ?? true) && !restrictInterval;
  if (showIntersections) {
    const intersections = getIntersections(config);

    ctx.save();
    for (const pt of intersections) {
      if (Math.abs(pt.x) < 0.2 && Math.abs(pt.y) < 0.2) continue;
      if (pt.x < plotMinX || pt.x > plotMaxX || pt.y < plotMinY || pt.y > plotMaxY) continue;

      const sx = toScreenX(pt.x);
      const sy = toScreenY(pt.y);

      // Chấm tròn tại giao điểm (bán kính nhỏ gọn thanh mảnh chuẩn SGK)
      const showIntersectionDots = config.showIntersectionDots ?? (!isLatex);
      if (showIntersectionDots) {
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(sx, sy, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Đăng ký số giao điểm (mức ưu tiên = 1)
      if (pt.axis === 'Ox') {
        // Kiểm tra đường cong lân cận để không bao giờ đè lên đồ thị
        const yL = f(pt.x - 0.2) ?? 0;
        const yR = f(pt.x + 0.2) ?? 0;
        const isCurveBelow = yL < -0.05 || yR < -0.05;
        registerOxLabel(pt.x, isCurveBelow, 1);
      } else {
        registerOyLabel(pt.y, false, 1);
      }
    }
    ctx.restore();
  }

  // =========================================================================
  // 7. VẼ CÁC SỐ TỌA ĐỘ TRÊN TRỤC Ox VÀ Oy (LỚP TRÊN CÙNG, HALO TRẮNG TUYỆT ĐỐI)
  // Các số được vẽ sau cùng nên không bao giờ bị đường cong, nét đứt, trục che khuất
  // =========================================================================

  // Vẽ các số trên trục Ox
  for (const item of oxLabelsList) {
    const drawX = item.sx + (item.offsetX ?? 0);
    const drawY = axY + item.offsetY;
    drawMathText(ctx, item.text, drawX, drawY, {
      fontSize: numFontSz,
      isBold: isBoldLabels,
      fontFamily: numFontFam,
      align: 'center',
      withHalo: true,
      haloWidth: isBoldLabels ? Math.max(3, Math.round(3.5 * fontScale)) : Math.max(2.0, Math.round(2.5 * fontScale)),
      haloColor: '#FFFFFF',
      useRectHalo: false
    });

    const isFrac = item.text.includes('/');
    const tW = getTextWidthEst(item.text, numFontSz);
    const tH = isFrac ? numFontSz * 0.9 : numFontSz * 0.55;
    hitboxes.push({
      id: `ox_${item.text}`,
      text: item.text,
      type: 'ox',
      val: item.val,
      x: drawX - tW / 2 - 4,
      y: drawY - tH - 4,
      width: tW + 8,
      height: tH * 2 + 8
    });
  }

  // Vẽ các số trên trục Oy
  for (const item of oyLabelsList) {
    const drawX = axX + item.offsetX;
    const drawY = item.sy + (item.offsetY ?? 0);
    drawMathText(ctx, item.text, drawX, drawY, {
      fontSize: numFontSz,
      isBold: isBoldLabels,
      fontFamily: numFontFam,
      align: item.align,
      withHalo: true,
      haloWidth: isBoldLabels ? Math.max(3, Math.round(3.5 * fontScale)) : Math.max(2.0, Math.round(2.5 * fontScale)),
      haloColor: '#FFFFFF',
      useRectHalo: false
    });

    const isFrac = item.text.includes('/');
    const tW = getTextWidthEst(item.text, numFontSz);
    const tH = isFrac ? numFontSz * 0.9 : numFontSz * 0.55;
    hitboxes.push({
      id: `oy_${item.text}`,
      text: item.text,
      type: 'oy',
      val: item.val,
      x: (item.align === 'right' ? drawX - tW - 4 : drawX - 4),
      y: drawY - tH - 4,
      width: tW + 8,
      height: tH * 2 + 8
    });
  }

  // =========================================================================
  // 8. VẼ CÁC TEXT / KÝ HIỆU TÙY BIẾN DO NGƯỜI DÙNG THÊM VÀO ĐỒ THỊ (CUSTOM TEXTS)
  // Có hỗ trợ kéo thả trực tiếp bằng chuột, viền Halo trắng để không bị đồ thị che
  // =========================================================================
  if (config.customTexts && config.customTexts.length > 0) {
    for (const item of config.customTexts) {
      if (!item.text || !item.text.trim()) continue;
      const sx = toScreenX(item.x);
      const sy = toScreenY(item.y);

      // Nếu nằm quá xa ngoài khung vẽ, bỏ qua
      if (sx < -120 || sx > width + 120 || sy < -120 || sy > height + 120) continue;

      const tFontSize = Math.round((item.fontSize ?? 22) * fontScale);
      const tBold = item.isBold ?? isBoldLabels;
      const tItalic = item.isItalic ?? true;
      const tColor = item.color ?? '#000000';

      drawMathText(ctx, item.text, sx, sy, {
        fontSize: tFontSize,
        isBold: tBold,
        isItalic: tItalic,
        color: tColor,
        fontFamily: isLatex ? mathFontFam : fontFam,
        align: 'center',
        withHalo: true,
        haloWidth: tBold ? Math.max(3, Math.round(3.5 * fontScale)) : Math.max(2.2, Math.round(2.6 * fontScale)),
        haloColor: '#FFFFFF',
        useRectHalo: false
      });

      const tW = getTextWidthEst(item.text, tFontSize);
      const tH = tFontSize;

      // Khung viền nét đứt khi text đang được chọn trực tiếp trên đồ thị
      if (options?.selectedCustomTextId === item.id) {
        ctx.save();
        ctx.strokeStyle = '#0D9488'; // Teal-600
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(sx - tW / 2 - 4, sy - tH / 2 - 2, tW + 8, tH + 4);
        ctx.restore();
      }

      hitboxes.push({
        id: `custom_text_${item.id}`,
        text: item.text,
        type: 'custom_text',
        customTextId: item.id,
        x: sx - tW / 2 - 6,
        y: sy - tH / 2 - 6,
        width: tW + 12,
        height: tH + 12
      });
    }
  }

  ctx.restore();
  return { hitboxes, unitScale };
}

function drawArrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, isStealth = true) {
  const headLen = isStealth ? 10.5 : 12;
  const headHalfW = isStealth ? 3.8 : 4.5;
  const notch = isStealth ? 2.2 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-headLen, -headHalfW);
  if (notch > 0) {
    ctx.lineTo(-headLen + notch, 0);
  }
  ctx.lineTo(-headLen, headHalfW);
  ctx.closePath();
  ctx.fillStyle = '#000000';
  ctx.fill();
  ctx.restore();
}

/**
 * Tính giá trị xấp xỉ diện tích hình phẳng giới hạn bởi f(x) và g(x) trên [a; b]
 * theo công thức tích phân số Simpson: S = \int_a^b |f(x) - g(x)| dx
 */
export function calcDefiniteIntegral(
  f: (x: number) => number | null,
  g: (x: number) => number,
  a: number,
  b: number,
  n = 200
): number {
  const minX = Math.min(a, b);
  const maxX = Math.max(a, b);
  if (maxX - minX < 1e-9) return 0;

  const steps = n % 2 === 0 ? n : n + 1;
  const h = (maxX - minX) / steps;
  let sum = 0;

  for (let i = 0; i <= steps; i++) {
    const x = minX + i * h;
    const yF = f(x) ?? 0;
    const yG = g(x);
    const diff = Math.abs(yF - yG);
    const weight = (i === 0 || i === steps) ? 1 : (i % 2 === 1 ? 4 : 2);
    sum += weight * diff;
  }
  return (h / 3) * sum;
}
