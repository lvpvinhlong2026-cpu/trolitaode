/**
 * Inequality Engine - Bộ vẽ Miền nghiệm Bất phương trình & Hệ bất phương trình bậc nhất hai ẩn trên hệ Oxy
 * Chuẩn SGK Toán 10 (Chương trình GDPT mới: Kết nối tri thức, Cánh Diều, Chân trời sáng tạo)
 * Độ phân giải cao 300 DPI - Tối ưu copy dán Word & in ấn
 */

import { addDpiToBlob } from './dpiUtils';
import { drawMathText, toFraction } from './bbtEngine';

export interface LinearInequality {
  id: string;
  a: number; // ax + by [op] c
  b: number;
  op: '<=' | '<' | '>=' | '>';
  c: number;
  label?: string; // Tên đường thẳng hoặc công thức: e.g. "x + 2y = 400" hoặc "d: 5x - 7y = 0"
  color?: string; // Màu nét vẽ (mặc định '#EF4444' đỏ hoặc '#2563EB' xanh)
  isDashed?: boolean; // Tự động nét đứt nếu op là '<' hoặc '>', nét liền nếu '<=' hoặc '>='
  lineWidth?: number; // Độ dày nét vẽ (mặc định 2.2px)
}

export interface TestPoint {
  x: number;
  y: number;
  label?: string; // e.g. 'M', 'M_0', 'A', 'B'
  color?: string; // Màu chấm tròn
  showProjection?: boolean; // Nét đứt gióng vuông góc tới 2 trục Ox, Oy
  labelPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'auto';
}

export interface InequalityConfig {
  inequalities: LinearInequality[];
  points?: TestPoint[];
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  tickStepX?: number;
  tickStepY?: number;
  hatchColor?: string; // Màu nét gạch sọc (mặc định '#94A3B8' xám chuẩn SGK)
  hatchSpacing?: number; // Khoảng cách giữa các nét gạch (mặc định 12px)
  hatchAngle?: number; // Góc nghiêng nét gạch (mặc định theo hướng vuông góc đường thẳng)
  hatchPerpendicular?: boolean; // Mặc định true: gạch sọc luôn vuông góc với đường thẳng biên theo chuẩn SGK
  hatchMode?: 'exclude' | 'feasible'; // 'exclude': gạch bỏ phần không phải nghiệm (chuẩn SGK), 'feasible': gạch phần nghiệm
  tintFeasibleRegion?: boolean; // Tô màu xanh nhạt miền nghiệm (mặc định true)
  feasibleColor?: string; // Màu nền miền nghiệm (mặc định 'rgba(186, 230, 253, 0.45)')
  fontFamily?: string;
  fontSizeScale?: number;
  isBoldLabels?: boolean;
  showTicks?: boolean;
  showTickLabels?: boolean;
  showAxisIntersections?: boolean; // Hiện giao điểm của đường thẳng với Ox, Oy (mặc định true)
  showGrid?: boolean;
  curveWidth?: number;
  axisWidth?: number;
  title?: string;
  // Offset điều chỉnh kéo thả (drag & drop) cho nhãn và số
  originOffset?: { x: number; y: number };
  axisLabelXOffset?: { x: number; y: number };
  axisLabelYOffset?: { x: number; y: number };
  oxLabelOffsets?: Record<string, { offsetX?: number; offsetY?: number }>;
  oyLabelOffsets?: Record<string, { offsetX?: number; offsetY?: number }>;
  lineLabelOffsets?: Record<string, { offsetX?: number; offsetY?: number }>;
  pointLabelOffsets?: Record<string, { offsetX?: number; offsetY?: number }>;
}

export interface InequalityLabelHitbox {
  id: string; // 'O', 'ox_<text>', 'oy_<text>', 'axis_x', 'axis_y', 'line_<id>', 'point_<index>'
  text: string;
  type: 'origin' | 'ox' | 'oy' | 'axis_x' | 'axis_y' | 'line_label' | 'point_label';
  val?: number;
  lineId?: string;
  pointIndex?: number;
  x: number;      // CSS pixel x
  y: number;      // CSS pixel y
  width: number;  // CSS pixel width
  height: number; // CSS pixel height
}

export interface RenderInequalityResult {
  hitboxes: InequalityLabelHitbox[];
  unitScale: number;
}

/**
 * Chuyển số thực thành chuỗi toán học chuẩn (phân số tối giản có dấu gạch ngang hoặc số nguyên)
 * Ví dụ: 150 -> "150", 1.5 -> "3/2", -0.5 -> "-1/2", 1.3333 -> "4/3"
 */
export function formatNumberMath(val: number): string {
  if (Math.abs(val) < 1e-6) return '0';
  const rounded = Math.round(val);
  if (Math.abs(val - rounded) < 1e-4) {
    return rounded.toString();
  }
  const frac = toFraction(val, 120, 1e-4);
  if (frac && frac.den > 1 && frac.den <= 60) {
    return `${frac.num}/${frac.den}`;
  }
  return (Math.round(val * 100) / 100).toString();
}

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Phân tích chuỗi bất phương trình tự nhiên do người dùng nhập vào
 * Hỗ trợ các dạng:
 * - "x + 2y <= 400"
 * - "5x - 7y <= 0"
 * - "2x + y >= 4"
 * - "x >= 0", "y >= 0"
 * - "3x - y < 6"
 * - "x <= 3"
 */
export function parseInequalityString(str: string): LinearInequality | null {
  const cleaned = str.trim().replace(/\s+/g, ' ');
  if (!cleaned) return null;

  // Nhận diện toán tử so sánh
  let op: '<=' | '<' | '>=' | '>' | null = null;
  let opStr = '';
  if (cleaned.includes('<=')) { op = '<='; opStr = '<='; }
  else if (cleaned.includes('≤')) { op = '<='; opStr = '≤'; }
  else if (cleaned.includes('>=')) { op = '>='; opStr = '>='; }
  else if (cleaned.includes('≥')) { op = '>='; opStr = '≥'; }
  else if (cleaned.includes('<')) { op = '<'; opStr = '<'; }
  else if (cleaned.includes('>')) { op = '>'; opStr = '>'; }
  else return null;

  const parts = cleaned.split(opStr);
  if (parts.length !== 2) return null;

  const leftPart = parts[0].trim();
  const rightPart = parts[1].trim();

  const cVal = parseFloat(rightPart);
  if (isNaN(cVal)) return null;

  // Phân tích vế trái: ax + by
  let a = 0;
  let b = 0;

  // Chuẩn hóa dấu
  let normalized = leftPart.replace(/-/g, '+-').replace(/\s+/g, '');
  if (normalized.startsWith('+')) normalized = normalized.substring(1);
  const terms = normalized.split('+').filter(t => t.length > 0);

  for (const term of terms) {
    if (term.includes('x')) {
      const coefStr = term.replace('x', '');
      if (coefStr === '' || coefStr === '+') a += 1;
      else if (coefStr === '-') a -= 1;
      else a += parseFloat(coefStr) || 0;
    } else if (term.includes('y')) {
      const coefStr = term.replace('y', '');
      if (coefStr === '' || coefStr === '+') b += 1;
      else if (coefStr === '-') b -= 1;
      else b += parseFloat(coefStr) || 0;
    } else {
      // Hằng số ở vế trái chuyển sang vế phải
      const constVal = parseFloat(term);
      if (!isNaN(constVal)) {
        // Chuyển sang vế phải: cVal - constVal
      }
    }
  }

  if (a === 0 && b === 0) return null;

  return {
    id: 'ineq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    a,
    b,
    op,
    c: cVal,
    label: formatLineEqLabel(a, b, cVal),
    color: '#DC2626',
    isDashed: op === '<' || op === '>'
  };
}

/**
 * Tạo nhãn phương trình đường thẳng biên: "ax + by = c"
 */
export function formatLineEqLabel(a: number, b: number, c: number): string {
  let res = '';
  if (Math.abs(a) > 1e-6) {
    if (a === 1) res += 'x';
    else if (a === -1) res += '-x';
    else res += `${a}x`;
  }

  if (Math.abs(b) > 1e-6) {
    const sign = b > 0 ? (res ? ' + ' : '') : ' - ';
    const absB = Math.abs(b);
    if (absB === 1) res += `${sign}y`;
    else res += `${sign}${absB}y`;
  }

  return `${res} = ${c}`;
}

/**
 * Thuật toán Sutherland-Hodgman cắt đa giác lồi bằng nửa mặt phẳng ax + by <= c (hoặc >= c)
 */
export function clipPolygonWithHalfPlane(
  polygon: Point2D[],
  a: number,
  b: number,
  c: number,
  keepInside: boolean = true // true: giữ ax + by <= c; false: giữ ax + by >= c
): Point2D[] {
  if (polygon.length === 0) return [];

  const isInside = (p: Point2D): boolean => {
    const val = a * p.x + b * p.y;
    return keepInside ? val <= c + 1e-7 : val >= c - 1e-7;
  };

  const lineIntersection = (p1: Point2D, p2: Point2D): Point2D => {
    const val1 = a * p1.x + b * p1.y - c;
    const val2 = a * p2.x + b * p2.y - c;
    const t = val1 / (val1 - val2);
    return {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y)
    };
  };

  const output: Point2D[] = [];
  let prev = polygon[polygon.length - 1];
  let prevInside = isInside(prev);

  for (let i = 0; i < polygon.length; i++) {
    const curr = polygon[i];
    const currInside = isInside(curr);

    if (currInside) {
      if (!prevInside) {
        output.push(lineIntersection(prev, curr));
      }
      output.push(curr);
    } else if (prevInside) {
      output.push(lineIntersection(prev, curr));
    }

    prev = curr;
    prevInside = currInside;
  }

  return output;
}

/**
 * Tìm giao điểm của đường thẳng ax + by = c với đường viền hình chữ nhật [xMin, xMax] x [yMin, yMax]
 */
export function getLineViewportIntersections(
  a: number,
  b: number,
  c: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): [Point2D, Point2D] | null {
  const points: Point2D[] = [];

  // Giao với x = xMin
  if (Math.abs(b) > 1e-6) {
    const y = (c - a * xMin) / b;
    if (y >= yMin - 1e-5 && y <= yMax + 1e-5) points.push({ x: xMin, y });
  }
  // Giao với x = xMax
  if (Math.abs(b) > 1e-6) {
    const y = (c - a * xMax) / b;
    if (y >= yMin - 1e-5 && y <= yMax + 1e-5) points.push({ x: xMax, y });
  }
  // Giao với y = yMin
  if (Math.abs(a) > 1e-6) {
    const x = (c - b * yMin) / a;
    if (x >= xMin - 1e-5 && x <= xMax + 1e-5) points.push({ x, y: yMin });
  }
  // Giao với y = yMax
  if (Math.abs(a) > 1e-6) {
    const x = (c - b * yMax) / a;
    if (x >= xMin - 1e-5 && x <= xMax + 1e-5) points.push({ x, y: yMax });
  }

  // Lọc các điểm trùng nhau
  const uniquePoints: Point2D[] = [];
  for (const p of points) {
    if (!uniquePoints.some(u => Math.hypot(u.x - p.x, u.y - p.y) < 1e-4)) {
      uniquePoints.push(p);
    }
  }

  if (uniquePoints.length >= 2) {
    return [uniquePoints[0], uniquePoints[1]];
  }
  return null;
}

/**
 * Tự động tính toán phạm vi hiển thị tối ưu cho hệ bất phương trình
 */
export function getAutoBounds(config: InequalityConfig): {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  stepX: number;
  stepY: number;
} {
  if (config.xMin !== undefined && config.xMax !== undefined && config.yMin !== undefined && config.yMax !== undefined) {
    const spanX = config.xMax - config.xMin;
    const spanY = config.yMax - config.yMin;
    return {
      xMin: config.xMin,
      xMax: config.xMax,
      yMin: config.yMin,
      yMax: config.yMax,
      stepX: config.tickStepX ?? (spanX > 50 ? 50 : spanX > 15 ? 2 : 1),
      stepY: config.tickStepY ?? (spanY > 50 ? 50 : spanY > 15 ? 2 : 1)
    };
  }

  // Thu thập các mốc tọa độ đặc biệt (giao trục, điểm kiểm tra)
  const xValues: number[] = [0];
  const yValues: number[] = [0];

  for (const ineq of config.inequalities) {
    const { a, b, c } = ineq;
    if (Math.abs(a) > 1e-6) xValues.push(c / a);
    if (Math.abs(b) > 1e-6) yValues.push(c / b);
  }

  if (config.points) {
    for (const pt of config.points) {
      xValues.push(pt.x);
      yValues.push(pt.y);
    }
  }

  const validX = xValues.filter(x => isFinite(x) && Math.abs(x) < 100000);
  const validY = yValues.filter(y => isFinite(y) && Math.abs(y) < 100000);

  const minXVal = Math.min(...validX);
  const maxXVal = Math.max(...validX);
  const minYVal = Math.min(...validY);
  const maxYVal = Math.max(...validY);

  const maxAbsX = Math.max(Math.abs(minXVal), Math.abs(maxXVal), 4);
  const maxAbsY = Math.max(Math.abs(minYVal), Math.abs(maxYVal), 4);

  // Xác định bước nhảy tick chuẩn (1, 2, 5, 10, 20, 50, 100, 200, 500)
  const pickStep = (maxVal: number) => {
    if (maxVal > 300) return 100;
    if (maxVal > 150) return 50;
    if (maxVal > 60) return 20;
    if (maxVal > 25) return 10;
    if (maxVal > 12) return 5;
    if (maxVal > 6) return 2;
    return 1;
  };

  const stepX = pickStep(maxAbsX);
  const stepY = pickStep(maxAbsY);
  const commonStep = Math.max(stepX, stepY);

  // Mở rộng margin ~20-30%
  const boundX = Math.ceil((maxAbsX * 1.3) / commonStep) * commonStep;
  const boundY = Math.ceil((maxAbsY * 1.3) / commonStep) * commonStep;

  // Nếu bài toán chủ yếu ở góc phần tư thứ nhất (x >= 0, y >= 0)
  const isFirstQuadrantOnly = minXVal >= -1e-4 && minYVal >= -1e-4;
  const autoXMin = isFirstQuadrantOnly ? -commonStep * 0.8 : -boundX;
  const autoXMax = boundX;
  const autoYMin = isFirstQuadrantOnly ? -commonStep * 0.8 : -boundY;
  const autoYMax = boundY;

  return {
    xMin: config.xMin ?? autoXMin,
    xMax: config.xMax ?? autoXMax,
    yMin: config.yMin ?? autoYMin,
    yMax: config.yMax ?? autoYMax,
    stepX: config.tickStepX ?? commonStep,
    stepY: config.tickStepY ?? commonStep
  };
}

/**
 * Render Miền nghiệm BPT / Hệ BPT bậc nhất hai ẩn hoàn chỉnh lên Canvas (300 DPI)
 */
export function renderInequalityToCanvas(
  config: InequalityConfig,
  canvas: HTMLCanvasElement,
  dpiScale = 2.4,
  options?: { width?: number; height?: number; fontFamily?: string; fontSizeScale?: number }
): RenderInequalityResult {
  const hitboxes: InequalityLabelHitbox[] = [];
  const ctx = canvas.getContext('2d');
  if (!ctx) return { hitboxes, unitScale: 36 };

  const width = options?.width ?? 540;
  const height = options?.height ?? 460;

  canvas.width = Math.round(width * dpiScale);
  canvas.height = Math.round(height * dpiScale);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.save();
  ctx.scale(dpiScale, dpiScale);

  // 0. Nền trắng
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  const fontScale = options?.fontSizeScale ?? config.fontSizeScale ?? 1.0;
  const fontFam = options?.fontFamily ?? config.fontFamily ?? '"Times New Roman", "STIX Two Text", "Cambria Math", serif';
  const isBold = config.isBoldLabels !== false;

  // 1. Tính toán hệ trục tọa độ trực chuẩn
  const bounds = getAutoBounds(config);
  const { xMin, xMax, yMin, yMax, stepX, stepY } = bounds;

  const margin = 32;
  const availW = width - 2 * margin;
  const availH = height - 2 * margin;
  const spanX = xMax - xMin;
  const spanY = yMax - yMin;

  const unitScale = Math.min(availW / spanX, availH / spanY);

  const xCenter = (xMin + xMax) / 2;
  const yCenter = (yMin + yMax) / 2;
  const screenCenterX = width / 2;
  const screenCenterY = height / 2;

  const toScreenX = (x: number) => screenCenterX + (x - xCenter) * unitScale;
  const toScreenY = (y: number) => screenCenterY - (y - yCenter) * unitScale;
  const toMathX = (sx: number) => xCenter + (sx - screenCenterX) / unitScale;
  const toMathY = (sy: number) => yCenter - (sy - screenCenterY) / unitScale;

  const axX = Math.round(toScreenX(0));
  const axY = Math.round(toScreenY(0));

  // Giới hạn bao phủ toàn bộ diện tích hiển thị của hệ trục Oxy trên canvas (có tràn nhẹ 12px ra mép)
  // Loại bỏ hoàn toàn vết cắt cụt ngang/dọc lơ lửng, giúp phần gạch bỏ ăn khớp hoàn hảo với hệ trục Oxy
  const padScreen = 12;
  const cMathMinX = toMathX(-padScreen);
  const cMathMaxX = toMathX(width + padScreen);
  const cMathMinY = toMathY(height + padScreen);
  const cMathMaxY = toMathY(-padScreen);

  // Đa giác bao phủ toàn bộ không gian hệ trục Oxy trên canvas
  const canvasViewportPoly: Point2D[] = [
    { x: cMathMinX, y: cMathMinY },
    { x: cMathMaxX, y: cMathMinY },
    { x: cMathMaxX, y: cMathMaxY },
    { x: cMathMinX, y: cMathMaxY },
  ];

  // =========================================================================
  // 2. TÔ MÀU MIỀN NGHIỆM ĐA GIÁC (FEASIBLE REGION TINT)
  // Tính giao của tất cả các nửa mặt phẳng nghiệm
  // =========================================================================
  if (config.tintFeasibleRegion !== false && config.inequalities.length > 0) {
    let feasiblePoly = [...canvasViewportPoly];

    for (const ineq of config.inequalities) {
      const keepInside = ineq.op === '<=' || ineq.op === '<';
      feasiblePoly = clipPolygonWithHalfPlane(feasiblePoly, ineq.a, ineq.b, ineq.c, keepInside);
    }

    if (feasiblePoly.length >= 3) {
      ctx.save();
      ctx.fillStyle = config.feasibleColor ?? 'rgba(186, 230, 253, 0.5)'; // Sky-200 nhạt thanh nhã
      ctx.beginPath();
      ctx.moveTo(toScreenX(feasiblePoly[0].x), toScreenY(feasiblePoly[0].y));
      for (let i = 1; i < feasiblePoly.length; i++) {
        ctx.lineTo(toScreenX(feasiblePoly[i].x), toScreenY(feasiblePoly[i].y));
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // =========================================================================
  // 3. GẠCH SỌC (HATCHING //////) NỬA MẶT PHẢNG KHÔNG PHẢI MIỀN NGHIỆM
  // CHUẨN SGK TOÁN 10: Nét gạch sọc LUÔN VUÔNG GÓC VỚI ĐƯỜNG THẲNG BIÊN ax + by = c
  // và bao phủ liền mạch toàn bộ hệ trục Oxy, không bị cắt cụt ngang/dọc
  // =========================================================================
  const hatchColor = config.hatchColor ?? '#94A3B8'; // Slate-400
  const hatchSpacing = config.hatchSpacing ?? 12;

  for (const ineq of config.inequalities) {
    // Nửa mặt phẳng cần gạch bỏ:
    // Nếu ineq là '<=' hoặc '<', phần gạch bỏ là ax + by >= c (keepInside = false)
    // Nếu ineq là '>=' hoặc '>', phần gạch bỏ là ax + by <= c (keepInside = true)
    const keepInside = ineq.op === '>=' || ineq.op === '>';
    const excludedPoly = clipPolygonWithHalfPlane(canvasViewportPoly, ineq.a, ineq.b, ineq.c, keepInside);

    if (excludedPoly.length >= 3) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(toScreenX(excludedPoly[0].x), toScreenY(excludedPoly[0].y));
      for (let i = 1; i < excludedPoly.length; i++) {
        ctx.lineTo(toScreenX(excludedPoly[i].x), toScreenY(excludedPoly[i].y));
      }
      ctx.closePath();
      ctx.clip(); // Giới hạn chỉ vẽ các đường gạch sọc trong phần đa giác bị loại của BPT này

      // Hướng góc nét gạch sọc:
      // Mặc định chuẩn SGK Toán 10: LUÔN VUÔNG GÓC VỚI ĐƯỜNG THẲNG BIÊN ax + by = c
      // Vectơ pháp tuyến trong hệ tọa độ màn hình là (a, -b) do trục Y màn hình ngược chiều toán học
      let hatchAngleRad: number;
      if (config.hatchPerpendicular !== false) {
        hatchAngleRad = Math.atan2(-ineq.b, ineq.a);
      } else {
        hatchAngleRad = ((config.hatchAngle ?? 45) * Math.PI) / 180;
      }

      ctx.strokeStyle = hatchColor;
      ctx.lineWidth = 1.1;

      const cosA = Math.cos(hatchAngleRad);
      const sinA = Math.sin(hatchAngleRad);
      const diag = Math.hypot(width, height) * 1.5;

      // Tâm phân bố đường kẻ là tâm màn hình
      const cx0 = width / 2;
      const cy0 = height / 2;

      for (let offset = -diag; offset <= diag; offset += hatchSpacing) {
        // Điểm trên trục phân bố vuông góc với hướng gạch
        const cx = cx0 + offset * (-sinA);
        const cy = cy0 + offset * cosA;

        ctx.beginPath();
        ctx.moveTo(cx - diag * cosA, cy - diag * sinA);
        ctx.lineTo(cx + diag * cosA, cy + diag * sinA);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // =========================================================================
  // 4. VẼ LƯỚI Ô VUÔNG TỌA ĐỘ MỜ (NẾU BẬT)
  // =========================================================================
  if (config.showGrid) {
    ctx.save();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.0;

    const kMinX = Math.ceil(xMin / stepX);
    const kMaxX = Math.floor(xMax / stepX);
    for (let k = kMinX; k <= kMaxX; k++) {
      const sx = toScreenX(k * stepX);
      ctx.beginPath();
      ctx.moveTo(sx, 12);
      ctx.lineTo(sx, height - 12);
      ctx.stroke();
    }

    const kMinY = Math.ceil(yMin / stepY);
    const kMaxY = Math.floor(yMax / stepY);
    for (let k = kMinY; k <= kMaxY; k++) {
      const sy = toScreenY(k * stepY);
      ctx.beginPath();
      ctx.moveTo(12, sy);
      ctx.lineTo(width - 12, sy);
      ctx.stroke();
    }
    ctx.restore();
  }

  // =========================================================================
  // 5. VẼ CÁC ĐƯỜNG THẲNG BIÊN CỦA BẤT PHƯƠNG TRÌNH (ax + by = c)
  // Nét đứt nếu bất đẳng thức ngặt (<, >), Nét liền nếu có dấu bằng (<=, >=)
  // =========================================================================
  for (const ineq of config.inequalities) {
    // Không vẽ đường trùng với 2 trục tọa độ vì trục Oxy đã được vẽ sắc nét riêng ở lớp trên
    const isAxisY = Math.abs(ineq.a - 1) < 1e-4 && Math.abs(ineq.b) < 1e-4 && Math.abs(ineq.c) < 1e-4; // x = 0
    const isAxisX = Math.abs(ineq.a) < 1e-4 && Math.abs(ineq.b - 1) < 1e-4 && Math.abs(ineq.c) < 1e-4; // y = 0
    if (isAxisX || isAxisY) {
      continue;
    }

    const inters = getLineViewportIntersections(ineq.a, ineq.b, ineq.c, cMathMinX, cMathMaxX, cMathMinY, cMathMaxY);
    if (!inters) continue;

    const [p1, p2] = inters;
    const sx1 = toScreenX(p1.x);
    const sy1 = toScreenY(p1.y);
    const sx2 = toScreenX(p2.x);
    const sy2 = toScreenY(p2.y);

    ctx.save();
    ctx.strokeStyle = ineq.color ?? '#DC2626'; // Đỏ nổi bật chuẩn SGK
    ctx.lineWidth = config.curveWidth ?? ineq.lineWidth ?? 2.2;

    if (ineq.isDashed ?? (ineq.op === '<' || ineq.op === '>')) {
      ctx.setLineDash([7, 5]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();

    // Ghi nhãn phương trình đường thẳng xoay nghiêng theo hướng đường thẳng
    if (ineq.label && ineq.label.trim()) {
      const lbl = ineq.label.trim();
      const midSX = (sx1 + sx2) / 2;
      const midSY = (sy1 + sy2) / 2;

      // Góc nghiêng của đường thẳng
      let angle = Math.atan2(sy2 - sy1, sx2 - sx1);
      if (angle > Math.PI / 2) angle -= Math.PI;
      else if (angle < -Math.PI / 2) angle += Math.PI;

      const customOff = config.lineLabelOffsets?.[ineq.id];
      const posX = midSX + (customOff?.offsetX ?? 0);
      const posY = midSY + (customOff?.offsetY ?? 0);

      ctx.save();
      ctx.translate(posX, posY);
      ctx.rotate(angle);

      const fSize = Math.round(18 * fontScale);
      ctx.font = `italic ${isBold ? 'bold ' : 'normal '}${fSize}px ${fontFam}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      // Halo trắng chống đè vạch gạch sọc
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = isBold ? 4.5 : 2.8;
      ctx.lineJoin = 'round';
      ctx.strokeText(lbl, 0, -4);

      ctx.fillStyle = ineq.color ?? '#DC2626';
      ctx.fillText(lbl, 0, -4);
      if (isBold) {
        ctx.strokeStyle = ineq.color ?? '#DC2626';
        ctx.lineWidth = 0.6;
        ctx.strokeText(lbl, 0, -4);
      }

      ctx.restore();

      const textW = Math.max(30, lbl.length * fSize * 0.65);
      const textH = fSize * 1.4;
      const cosA = Math.abs(Math.cos(angle));
      const sinA = Math.abs(Math.sin(angle));
      const boxW = textW * cosA + textH * sinA + 12;
      const boxH = textW * sinA + textH * cosA + 12;

      hitboxes.push({
        id: `line_${ineq.id}`,
        text: lbl,
        type: 'line_label',
        lineId: ineq.id,
        x: posX - boxW / 2,
        y: posY - boxH / 2,
        width: boxW,
        height: boxH
      });
    }

    ctx.restore();
  }

  // =========================================================================
  // 6. VẼ ĐIỂM KIỂM TRA & ĐƯỜNG GIÓNG NÉT ĐỨT (TEST POINTS)
  // Ví dụ: điểm M(200, 100) trong Hình 1, điểm M_0(7, 5) trong Hình 2
  // =========================================================================
  if (config.points && config.points.length > 0) {
    ctx.save();
    for (let ptIdx = 0; ptIdx < config.points.length; ptIdx++) {
      const pt = config.points[ptIdx];
      const sx = toScreenX(pt.x);
      const sy = toScreenY(pt.y);

      // Đường gióng nét đứt tới hai trục Ox và Oy
      if (pt.showProjection !== false) {
        ctx.save();
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
        ctx.restore();
      }

      // Chấm tròn điểm (màu đỏ hoặc đen)
      ctx.fillStyle = pt.color ?? '#DC2626';
      ctx.beginPath();
      ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Nhãn tên điểm (ví dụ 'A', 'B', 'M_0')
      if (pt.label && pt.label.trim()) {
        const pLabel = pt.label.trim();
        const fSize = Math.round(19 * fontScale);
        ctx.font = `italic ${isBold ? 'bold ' : 'normal '}${fSize}px ${fontFam}`;
        ctx.fillStyle = '#0284C7'; // Màu xanh cyan chuẩn SGK Kết nối tri thức
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = isBold ? 3.5 : 2.4;
        ctx.lineJoin = 'round';

        let lx = sx + 8;
        let ly = sy - 6;
        let align: CanvasTextAlign = 'left';
        let baseline: CanvasTextBaseline = 'bottom';

        if (pt.labelPosition === 'top-left') {
          lx = sx - 8;
          align = 'right';
        } else if (pt.labelPosition === 'bottom-right') {
          ly = sy + 16;
          baseline = 'top';
        } else if (pt.labelPosition === 'bottom-left') {
          lx = sx - 8;
          ly = sy + 16;
          align = 'right';
          baseline = 'top';
        }

        const ptKey = pt.label || `pt_${ptIdx}`;
        const customOff = config.pointLabelOffsets?.[ptKey] || config.pointLabelOffsets?.[`pt_${ptIdx}`];
        if (customOff) {
          lx += customOff.offsetX ?? 0;
          ly += customOff.offsetY ?? 0;
        }

        ctx.textAlign = align;
        ctx.textBaseline = baseline;
        ctx.strokeText(pLabel, lx, ly);
        ctx.fillText(pLabel, lx, ly);
        if (isBold) {
          ctx.strokeStyle = '#0284C7';
          ctx.lineWidth = 0.6;
          ctx.strokeText(pLabel, lx, ly);
        }

        const pW = Math.max(18, pLabel.length * fSize * 0.65);
        const pH = fSize * 1.3;
        hitboxes.push({
          id: `point_${ptIdx}`,
          text: pLabel,
          type: 'point_label',
          pointIndex: ptIdx,
          x: (align === 'right' ? lx - pW : lx) - 4,
          y: (baseline === 'top' ? ly : ly - pH) - 4,
          width: pW + 8,
          height: pH + 8
        });
      }
    }
    ctx.restore();
  }

  // =========================================================================
  // 7. VẼ HỆ TRỤC TỌA ĐỘ Oxy (NÉT ĐẬM, MŨI TÊN, SỐ ĐƠN VỊ VÀ GỐC O)
  // Vẽ lớp trên cùng để không bao giờ bị gạch sọc che khuất
  // =========================================================================
  const axisW = config.axisWidth ?? (config.curveWidth ? config.curveWidth * 0.75 : 2.0);
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = axisW;

  // Trục Ox
  ctx.beginPath();
  ctx.moveTo(12, axY);
  ctx.lineTo(width - 10, axY);
  ctx.stroke();
  drawArrowHead(ctx, width - 10, axY, 0);

  // Trục Oy
  ctx.beginPath();
  ctx.moveTo(axX, height - 10);
  ctx.lineTo(axX, 10);
  ctx.stroke();
  drawArrowHead(ctx, axX, 10, -Math.PI / 2);

  // Vạch chia đơn vị (ticks) trên 2 trục
  const showTicks = config.showTicks !== false;
  const tickLen = 3.5;
  if (showTicks) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.3;

    // Ticks Ox
    const kMinX = Math.ceil(xMin / stepX);
    const kMaxX = Math.floor(xMax / stepX);
    for (let k = kMinX; k <= kMaxX; k++) {
      if (k === 0) continue;
      const sx = toScreenX(k * stepX);
      if (sx >= 16 && sx <= width - 20) {
        ctx.beginPath();
        ctx.moveTo(sx, axY - tickLen);
        ctx.lineTo(sx, axY + tickLen);
        ctx.stroke();
      }
    }

    // Ticks Oy
    const kMinY = Math.ceil(yMin / stepY);
    const kMaxY = Math.floor(yMax / stepY);
    for (let k = kMinY; k <= kMaxY; k++) {
      if (k === 0) continue;
      const sy = toScreenY(k * stepY);
      if (sy >= 20 && sy <= height - 16) {
        ctx.beginPath();
        ctx.moveTo(axX - tickLen, sy);
        ctx.lineTo(axX + tickLen, sy);
        ctx.stroke();
      }
    }
  }

  // =========================================================================
  // 8. VẼ CÁC SỐ TỌA ĐỘ VÀ GIAO ĐIỂM TRÊN TRỤC Ox VÀ Oy (DẠNG TOÁN HỌC & DRAG)
  // =========================================================================
  interface AxisItem {
    val: number;
    text: string;
    screenX: number;
    screenY: number;
    axis: 'ox' | 'oy';
    isIntersection?: boolean;
    lineId?: string;
  }

  const oxItems: AxisItem[] = [];
  const oyItems: AxisItem[] = [];

  const showIntersects = config.showAxisIntersections !== false; // Mặc định true

  // 1. Tự động tính toán các giao điểm của các đường thẳng với Ox và Oy
  if (showIntersects) {
    for (const ineq of config.inequalities) {
      const isAxisY = Math.abs(ineq.a - 1) < 1e-4 && Math.abs(ineq.b) < 1e-4 && Math.abs(ineq.c) < 1e-4; // x = 0
      const isAxisX = Math.abs(ineq.a) < 1e-4 && Math.abs(ineq.b - 1) < 1e-4 && Math.abs(ineq.c) < 1e-4; // y = 0
      if (isAxisX || isAxisY) continue;

      const { a, b, c } = ineq;

      // Giao điểm Ox: y = 0 => x = c / a
      if (Math.abs(a) > 1e-6) {
        const xVal = c / a;
        if (xVal >= xMin - 0.05 && xVal <= xMax + 0.05 && Math.abs(xVal) > 1e-4) {
          if (!oxItems.some(item => Math.abs(item.val - xVal) < 1e-4)) {
            oxItems.push({
              val: xVal,
              text: formatNumberMath(xVal),
              screenX: toScreenX(xVal),
              screenY: axY,
              axis: 'ox',
              isIntersection: true,
              lineId: ineq.id
            });
          }
        }
      }

      // Giao điểm Oy: x = 0 => y = c / b
      if (Math.abs(b) > 1e-6) {
        const yVal = c / b;
        if (yVal >= yMin - 0.05 && yVal <= yMax + 0.05 && Math.abs(yVal) > 1e-4) {
          if (!oyItems.some(item => Math.abs(item.val - yVal) < 1e-4)) {
            oyItems.push({
              val: yVal,
              text: formatNumberMath(yVal),
              screenX: axX,
              screenY: toScreenY(yVal),
              axis: 'oy',
              isIntersection: true,
              lineId: ineq.id
            });
          }
        }
      }
    }
  }

  // 2. Điểm kiểm tra / Tọa độ gióng
  if (config.points) {
    for (const pt of config.points) {
      if (pt.showProjection !== false) {
        if (Math.abs(pt.x) > 1e-4 && pt.x >= xMin && pt.x <= xMax) {
          if (!oxItems.some(item => Math.abs(item.val - pt.x) < 1e-4)) {
            oxItems.push({
              val: pt.x,
              text: formatNumberMath(pt.x),
              screenX: toScreenX(pt.x),
              screenY: axY,
              axis: 'ox'
            });
          }
        }
        if (Math.abs(pt.y) > 1e-4 && pt.y >= yMin && pt.y <= yMax) {
          if (!oyItems.some(item => Math.abs(item.val - pt.y) < 1e-4)) {
            oyItems.push({
              val: pt.y,
              text: formatNumberMath(pt.y),
              screenX: axX,
              screenY: toScreenY(pt.y),
              axis: 'oy'
            });
          }
        }
      }
    }
  }

  // 3. Nếu bật "Đánh số" (showTickLabels), thêm các mốc stepX, stepY
  if (config.showTickLabels) {
    const kMinX = Math.ceil(xMin / stepX);
    const kMaxX = Math.floor(xMax / stepX);
    for (let k = kMinX; k <= kMaxX; k++) {
      if (k === 0) continue;
      const v = k * stepX;
      if (!oxItems.some(item => Math.abs(item.val - v) < 1e-4)) {
        oxItems.push({
          val: v,
          text: formatNumberMath(v),
          screenX: toScreenX(v),
          screenY: axY,
          axis: 'ox'
        });
      }
    }

    const kMinY = Math.ceil(yMin / stepY);
    const kMaxY = Math.floor(yMax / stepY);
    for (let k = kMinY; k <= kMaxY; k++) {
      if (k === 0) continue;
      const v = k * stepY;
      if (!oyItems.some(item => Math.abs(item.val - v) < 1e-4)) {
        oyItems.push({
          val: v,
          text: formatNumberMath(v),
          screenX: axX,
          screenY: toScreenY(v),
          axis: 'oy'
        });
      }
    }
  }

  // Ghi số tọa độ và vạch trên Ox và Oy (Halo trắng sắc nét)
  const numFontSz = Math.round(21 * fontScale);

  // Vẽ các vạch và số trên Ox
  for (const item of oxItems) {
    if (item.screenX < 14 || item.screenX > width - 18) continue;

    // Vạch tick trên trục Ox
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(item.screenX, axY - 4);
    ctx.lineTo(item.screenX, axY + 4);
    ctx.stroke();

    // Điểm số dạng toán học
    const customOff = config.oxLabelOffsets?.[item.text] || config.oxLabelOffsets?.[String(item.val)];
    const isFrac = item.text.includes('/');
    const defaultOffsetY = isFrac ? 19 : 14;
    const drawX = item.screenX + (customOff?.offsetX ?? 0);
    const drawY = axY + defaultOffsetY + (customOff?.offsetY ?? 0);

    drawMathText(ctx, item.text, drawX, drawY, {
      fontSize: numFontSz,
      fontFamily: fontFam,
      align: 'center',
      color: '#0284C7', // Xanh cyan chuẩn SGK
      isBold,
      withHalo: true,
      haloColor: '#FFFFFF',
      haloWidth: isBold ? 3.5 : 2.4
    });

    const estW = Math.max(16, item.text.length * numFontSz * 0.65);
    const estH = isFrac ? numFontSz * 1.6 : numFontSz * 1.1;
    hitboxes.push({
      id: `ox_${item.text}`,
      text: item.text,
      type: 'ox',
      val: item.val,
      x: drawX - estW / 2 - 4,
      y: drawY - estH / 2 - 4,
      width: estW + 8,
      height: estH + 8
    });
  }

  // Vẽ các vạch và số trên Oy
  for (const item of oyItems) {
    if (item.screenY < 18 || item.screenY > height - 14) continue;

    // Vạch tick trên trục Oy
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(axX - 4, item.screenY);
    ctx.lineTo(axX + 4, item.screenY);
    ctx.stroke();

    // Điểm số dạng toán học
    const customOff = config.oyLabelOffsets?.[item.text] || config.oyLabelOffsets?.[String(item.val)];
    const isFrac = item.text.includes('/');
    const defaultOffsetX = -10;
    const drawX = axX + defaultOffsetX + (customOff?.offsetX ?? 0);
    const drawY = item.screenY + (customOff?.offsetY ?? 0);

    drawMathText(ctx, item.text, drawX, drawY, {
      fontSize: numFontSz,
      fontFamily: fontFam,
      align: 'right',
      color: '#0284C7',
      isBold,
      withHalo: true,
      haloColor: '#FFFFFF',
      haloWidth: isBold ? 3.5 : 2.4
    });

    const estW = Math.max(16, item.text.length * numFontSz * 0.65);
    const estH = isFrac ? numFontSz * 1.6 : numFontSz * 1.1;
    hitboxes.push({
      id: `oy_${item.text}`,
      text: item.text,
      type: 'oy',
      val: item.val,
      x: drawX - estW - 4,
      y: drawY - estH / 2 - 4,
      width: estW + 8,
      height: estH + 8
    });
  }

  // Nhãn trục x và y
  const axisLabelFontSz = Math.round(25 * fontScale);
  ctx.font = `italic ${isBold ? 'bold ' : 'normal '}${axisLabelFontSz}px ${fontFam}`;

  // Chữ x
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const drawX_x = (width - 8) + (config.axisLabelXOffset?.x ?? 0);
  const drawX_y = (axY + 12) + (config.axisLabelXOffset?.y ?? 0);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = isBold ? 4.0 : 2.6;
  ctx.lineJoin = 'round';
  ctx.strokeText('x', drawX_x, drawX_y);
  ctx.fillStyle = '#0284C7';
  ctx.fillText('x', drawX_x, drawX_y);
  if (isBold) {
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 0.6;
    ctx.strokeText('x', drawX_x, drawX_y);
  }
  hitboxes.push({
    id: 'axis_x',
    text: 'x',
    type: 'axis_x',
    x: drawX_x - 4,
    y: drawX_y - 14,
    width: 24,
    height: 24
  });

  // Chữ y
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const drawY_x = (axX - 14) + (config.axisLabelYOffset?.x ?? 0);
  const drawY_y = 14 + (config.axisLabelYOffset?.y ?? 0);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = isBold ? 4.0 : 2.6;
  ctx.lineJoin = 'round';
  ctx.strokeText('y', drawY_x, drawY_y);
  ctx.fillStyle = '#0284C7';
  ctx.fillText('y', drawY_x, drawY_y);
  if (isBold) {
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 0.6;
    ctx.strokeText('y', drawY_x, drawY_y);
  }
  hitboxes.push({
    id: 'axis_y',
    text: 'y',
    type: 'axis_y',
    x: drawY_x - 12,
    y: drawY_y - 20,
    width: 24,
    height: 24
  });

  // Gốc O
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  const drawOX = (axX - 5) + (config.originOffset?.x ?? 0);
  const drawOY = (axY + 4) + (config.originOffset?.y ?? 0);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = isBold ? 4.0 : 2.6;
  ctx.lineJoin = 'round';
  ctx.strokeText('O', drawOX, drawOY);
  ctx.fillStyle = '#0284C7';
  ctx.fillText('O', drawOX, drawOY);
  if (isBold) {
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 0.6;
    ctx.strokeText('O', drawOX, drawOY);
  }
  hitboxes.push({
    id: 'O',
    text: 'O',
    type: 'origin',
    x: drawOX - 22,
    y: drawOY - 4,
    width: 26,
    height: 26
  });

  ctx.restore();

  return { hitboxes, unitScale };
}

function drawArrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  const headLen = 11;
  const headHalfW = 4.2;
  const notch = 2.0;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-headLen, -headHalfW);
  ctx.lineTo(-headLen + notch, 0);
  ctx.lineTo(-headLen, headHalfW);
  ctx.closePath();
  ctx.fillStyle = '#000000';
  ctx.fill();
  ctx.restore();
}

/**
 * Danh sách các bài tập mẫu chuẩn SGK Toán 10
 */
export const INEQUALITY_PRESETS: {
  id: string;
  name: string;
  desc: string;
  config: InequalityConfig;
}[] = [
  {
    id: 'sample_1_triangle',
    name: 'Mẫu 1: x + 2y ≤ 400 (Hình SGK mẫu 1)',
    desc: 'Bài toán lập kế hoạch sản xuất: x + 2y ≤ 400, x ≥ 0, y ≥ 0, điểm kiểm tra (200; 100)',
    config: {
      inequalities: [
        { id: '1', a: 1, b: 2, op: '<=', c: 400, label: 'x + 2y = 400', color: '#DC2626' },
        { id: '2', a: 1, b: 0, op: '>=', c: 0, label: 'x = 0', color: '#000000' },
        { id: '3', a: 0, b: 1, op: '>=', c: 0, label: 'y = 0', color: '#000000' }
      ],
      points: [
        { x: 0, y: 200, label: 'A', color: '#0284C7', showProjection: false, labelPosition: 'top-left' },
        { x: 400, y: 0, label: 'B', color: '#0284C7', showProjection: false, labelPosition: 'bottom-right' },
        { x: 200, y: 100, label: '', color: '#DC2626', showProjection: true }
      ],
      xMin: -50,
      xMax: 500,
      yMin: -40,
      yMax: 350,
      tickStepX: 100,
      tickStepY: 100,
      tintFeasibleRegion: true
    }
  },
  {
    id: 'sample_2_origin',
    name: 'Mẫu 2: d: 5x − 7y ≤ 0 (Hình SGK mẫu 2)',
    desc: 'Đường thẳng đi qua gốc tọa độ d: 5x − 7y = 0, điểm kiểm tra M_0(7; 5)',
    config: {
      inequalities: [
        { id: '1', a: 5, b: -7, op: '<=', c: 0, label: 'd: 5x − 7y = 0', color: '#DC2626' }
      ],
      points: [
        { x: 7, y: 5, label: '', color: '#DC2626', showProjection: true },
        { x: 0, y: 1, label: 'M_0', color: '#0284C7', showProjection: false, labelPosition: 'top-left' }
      ],
      xMin: -1.5,
      xMax: 9.5,
      yMin: -1.5,
      yMax: 7.5,
      tickStepX: 1,
      tickStepY: 1,
      tintFeasibleRegion: true
    }
  },
  {
    id: 'sample_3_system_quad',
    name: 'Mẫu 3: Hệ 3 BPT miền tam giác',
    desc: 'x + y ≤ 4, x − y ≤ 2, y ≥ 0',
    config: {
      inequalities: [
        { id: '1', a: 1, b: 1, op: '<=', c: 4, label: 'x + y = 4', color: '#DC2626' },
        { id: '2', a: 1, b: -1, op: '<=', c: 2, label: 'x − y = 2', color: '#2563EB' },
        { id: '3', a: 0, b: 1, op: '>=', c: 0, label: 'y = 0', color: '#000000' }
      ],
      points: [
        { x: 3, y: 1, label: 'A(3; 1)', color: '#16A34A', showProjection: true },
        { x: 2, y: 0, label: 'B', color: '#0284C7', showProjection: false },
        { x: 4, y: 0, label: 'C', color: '#0284C7', showProjection: false }
      ],
      xMin: -1,
      xMax: 6,
      yMin: -1,
      yMax: 5,
      tickStepX: 1,
      tickStepY: 1,
      tintFeasibleRegion: true
    }
  },
  {
    id: 'sample_4_linear_programming',
    name: 'Mẫu 4: Bài toán tối ưu quy hoạch tuyến tính',
    desc: '2x + y ≥ 4, x + y ≥ 3, x ≥ 0, y ≥ 0',
    config: {
      inequalities: [
        { id: '1', a: 2, b: 1, op: '>=', c: 4, label: '2x + y = 4', color: '#DC2626' },
        { id: '2', a: 1, b: 1, op: '>=', c: 3, label: 'x + y = 3', color: '#2563EB' },
        { id: '3', a: 1, b: 0, op: '>=', c: 0, label: 'x = 0', color: '#000000' },
        { id: '4', a: 0, b: 1, op: '>=', c: 0, label: 'y = 0', color: '#000000' }
      ],
      points: [
        { x: 1, y: 2, label: 'I(1; 2)', color: '#DC2626', showProjection: true }
      ],
      xMin: -1,
      xMax: 6,
      yMin: -1,
      yMax: 5.5,
      tickStepX: 1,
      tickStepY: 1,
      tintFeasibleRegion: true
    }
  }
];
