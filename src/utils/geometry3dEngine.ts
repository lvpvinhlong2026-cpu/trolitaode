/**
 * Geometry 3D Engine - Vẽ và Tương tác Hình học không gian chuẩn SGK Toán (300 DPI)
 * Hỗ trợ xoay 3D trực tiếp 360 độ, kéo thả đỉnh hình học, phóng to/thu nhỏ, xuất Word sắc nét.
 * Tự động tính toán phân loại Nét Liền (thấy) & Nét Đứt (khuất) động theo góc nhìn thời gian thực.
 */

export interface Point3DData {
  x: number;
  y: number;
  z: number;
  label: string;
  isDependent?: boolean;
}

export interface Face3DData {
  keys: string[]; // Đỉnh đa giác theo thứ tự ngược chiều kim đồng hồ nhìn từ ngoài vào
  isSideFace?: boolean;
}

export interface Edge3DData {
  u: string;
  v: string;
  isAlwaysDashed?: boolean;
  faceIndices?: number[];
  color?: string;
  width?: number;
}

export interface Custom3DModel {
  name: string;
  points: Record<string, Point3DData>;
  faces: Face3DData[];
  edges: Edge3DData[];
  isCone?: boolean;
  coneData?: { apexKey: string; centerKey: string; radius: number };
  isCylinder?: boolean;
  cylinderData?: { topCenterKey: string; botCenterKey: string; radius: number };
}

export interface Geometry3DConfig {
  preset?: 'pyramid_s_abcd' | 'pyramid_s_abc' | 'pyramid_sa_bottom' | 'prism_abc' | 'box_abcd' | 'bat_dien_deu' | 'cone' | 'cylinder' | 'custom' | string;
  customModel?: Custom3DModel;
  showCenterO?: boolean;
  showMidpointM?: boolean;
  showDiagonals?: boolean;
  // Tùy chọn tương tác 3D trực tiếp
  rotX?: number; // Góc nghiêng (pitch)
  rotY?: number; // Góc xoay ngang (yaw)
  zoom?: number; // Tỉ lệ thu phóng (1.0 = mặc định)
  panX?: number; // Dịch chuyển ngang
  panY?: number; // Dịch chuyển dọc
  pointOverrides?: Record<string, { x: number; y: number }>; // Tọa độ 2D người dùng kéo đỉnh
  hoveredPoint?: string | null; // Tên đỉnh đang di chuột qua
  draggedPoint?: string | null; // Tên đỉnh đang được kéo thả
  isExporting?: boolean; // Tắt hiệu ứng UI tương tác khi xuất ảnh in Word
}

export interface ScreenPoint {
  x: number;
  y: number;
  label: string;
  isDependent?: boolean;
}

/**
 * Trả về góc nhìn chuẩn SGK ban đầu cho từng khối hình
 */
export function getDefaultAngles(preset?: string): { rotX: number; rotY: number; zoom: number; panX: number; panY: number } {
  switch (preset) {
    case 'pyramid_s_abcd':
    case 'pyramid_sa_bottom':
      return { rotX: 0.22, rotY: -0.32, zoom: 1.55, panX: 0, panY: 0 };
    case 'pyramid_s_abc':
      return { rotX: 0.20, rotY: -0.28, zoom: 1.55, panX: 0, panY: 0 };
    case 'prism_abc':
      return { rotX: 0.22, rotY: -0.28, zoom: 1.45, panX: 0, panY: 0 };
    case 'box_abcd':
      return { rotX: 0.24, rotY: -0.36, zoom: 1.45, panX: 0, panY: 0 };
    case 'cone':
      return { rotX: 0.20, rotY: -0.30, zoom: 1.55, panX: 0, panY: 0 };
    case 'cylinder':
      return { rotX: 0.22, rotY: -0.32, zoom: 1.45, panX: 0, panY: 0 };
    default:
      return { rotX: 0.22, rotY: -0.32, zoom: 1.5, panX: 0, panY: 0 };
  }
}

/**
 * Phép chiếu 3D sang 2D màn hình theo góc quay yaw, pitch và tỉ lệ zoom
 */
export function project3D(
  pt: { x: number; y: number; z: number },
  rotX: number,
  rotY: number,
  zoom: number,
  panX: number,
  panY: number,
  centerX = 250,
  centerY = 200
): { x: number; y: number; z: number } {
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const x1 = pt.x * cosY + pt.z * sinY;
  const y1 = pt.y;
  const z1 = -pt.x * sinY + pt.z * cosY;

  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const x2 = x1;
  const y2 = y1 * cosX - z1 * sinX;
  const z2 = y1 * sinX + z1 * cosX;

  const sx = centerX + x2 * zoom + panX;
  const sy = centerY - y2 * zoom + panY;

  return { x: sx, y: sy, z: z2 };
}

/**
 * Tính diện tích 2D có dấu của đa giác để xác định mặt hướng về người nhìn (nét liền) hay hướng ra sau (nét đứt)
 */
export function calc2DSignedArea(pts: { x: number; y: number }[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return area;
}

/**
 * Tính bao lồi 2D (Convex Hull) theo thuật toán Monotone Chain
 * Xác định các cạnh Silhouette bao ngoài hình học không gian (luôn là nét liền / nét thấy)
 */
export function get2DConvexHull(pts: Record<string, { x: number; y: number }>): string[] {
  const keys = Object.keys(pts).filter(k => pts[k] && typeof pts[k].x === 'number' && typeof pts[k].y === 'number');
  if (keys.length <= 3) return keys;

  const sorted = [...keys].sort((a, b) => {
    if (pts[a].x !== pts[b].x) return pts[a].x - pts[b].x;
    return pts[a].y - pts[b].y;
  });

  const cross = (o: string, a: string, b: string) =>
    (pts[a].x - pts[o].x) * (pts[b].y - pts[o].y) - (pts[a].y - pts[o].y) * (pts[b].x - pts[o].x);

  const lower: string[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: string[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Lấy tọa độ 3D mặc định của các khối hình học chuẩn SGK
 */
export function getStandard3DPoints(preset?: string): Record<string, Point3DData> {
  const raw3D: Record<string, Point3DData> = {};

  if (preset === 'pyramid_sa_bottom') {
    raw3D['A'] = { x: -100, y: -80, z: 60, label: 'A' };
    raw3D['B'] = { x: 90, y: -80, z: 60, label: 'B' };
    raw3D['C'] = { x: 150, y: -80, z: -70, label: 'C' };
    raw3D['D'] = { x: -40, y: -80, z: -70, label: 'D' };
    raw3D['S'] = { x: -100, y: 130, z: 60, label: 'S' };
  } else if (preset === 'pyramid_s_abc') {
    raw3D['A'] = { x: -110, y: -70, z: 60, label: 'A' };
    raw3D['B'] = { x: 20, y: -70, z: 90, label: 'B' };
    raw3D['C'] = { x: 130, y: -70, z: -60, label: 'C' };
    raw3D['S'] = { x: 0, y: 130, z: 0, label: 'S' };
  } else if (preset === 'prism_abc') {
    raw3D['A'] = { x: -100, y: -80, z: 60, label: 'A' };
    raw3D['B'] = { x: 20, y: -80, z: 80, label: 'B' };
    raw3D['C'] = { x: 120, y: -80, z: -60, label: 'C' };
    raw3D['A1'] = { x: -100, y: 80, z: 60, label: "A'" };
    raw3D['B1'] = { x: 20, y: 80, z: 80, label: "B'" };
    raw3D['C1'] = { x: 120, y: 80, z: -60, label: "C'" };
  } else if (preset === 'box_abcd') {
    raw3D['A'] = { x: -100, y: -80, z: 70, label: 'A' };
    raw3D['B'] = { x: 80, y: -80, z: 70, label: 'B' };
    raw3D['C'] = { x: 140, y: -80, z: -60, label: 'C' };
    raw3D['D'] = { x: -40, y: -80, z: -60, label: 'D' };
    raw3D['A1'] = { x: -100, y: 80, z: 70, label: "A'" };
    raw3D['B1'] = { x: 80, y: 80, z: 70, label: "B'" };
    raw3D['C1'] = { x: 140, y: 80, z: -60, label: "C'" };
    raw3D['D1'] = { x: -40, y: 80, z: -60, label: "D'" };
  } else {
    // Mặc định: pyramid_s_abcd
    raw3D['A'] = { x: -110, y: -80, z: 70, label: 'A' };
    raw3D['B'] = { x: 90, y: -80, z: 70, label: 'B' };
    raw3D['C'] = { x: 150, y: -80, z: -70, label: 'C' };
    raw3D['D'] = { x: -50, y: -80, z: -70, label: 'D' };
    raw3D['S'] = { x: 10, y: 130, z: 0, label: 'S' };
  }

  return raw3D;
}

/**
 * Trích xuất tọa độ 2D của tất cả các đỉnh phục vụ tương tác chuột trực tiếp (Hit-test)
 */
export function getGeometry3DPoints(
  config: Geometry3DConfig,
  width = 500,
  height = 400
): Record<string, ScreenPoint> {
  const def = getDefaultAngles(config.preset);
  const rotX = config.rotX ?? def.rotX;
  const rotY = config.rotY ?? def.rotY;
  const zoom = config.zoom ?? def.zoom;
  const panX = config.panX ?? def.panX;
  const panY = config.panY ?? def.panY;
  const overrides = config.pointOverrides || {};

  const centerX = width / 2;
  const centerY = height / 2;

  const raw3D: Record<string, Point3DData> = config.customModel?.points 
    ? { ...config.customModel.points } 
    : getStandard3DPoints(config.preset);

  const result: Record<string, ScreenPoint> = {};

  for (const [key, p3] of Object.entries(raw3D)) {
    if (overrides[key]) {
      result[key] = { x: overrides[key].x, y: overrides[key].y, label: p3.label, isDependent: p3.isDependent };
    } else {
      const proj = project3D(p3, rotX, rotY, zoom, panX, panY, centerX, centerY);
      result[key] = { x: proj.x, y: proj.y, label: p3.label, isDependent: p3.isDependent };
    }
  }

  // Điểm phụ thuộc O và M chuẩn SGK nếu không dùng customModel
  if (!config.customModel) {
    if (config.preset === 'pyramid_s_abcd' || config.preset === 'pyramid_sa_bottom') {
      if (result['A'] && result['C']) {
        const oX = (result['A'].x + result['C'].x) / 2;
        const oY = (result['A'].y + result['C'].y) / 2;
        result['O'] = overrides['O']
          ? { x: overrides['O'].x, y: overrides['O'].y, label: 'O', isDependent: true }
          : { x: oX, y: oY, label: 'O', isDependent: true };
      }
      if (result['S'] && result['C']) {
        const mX = (result['S'].x + result['C'].x) / 2;
        const mY = (result['S'].y + result['C'].y) / 2;
        result['M'] = overrides['M']
          ? { x: overrides['M'].x, y: overrides['M'].y, label: 'M', isDependent: true }
          : { x: mX, y: mY, label: 'M', isDependent: true };
      }
    }
  }

  return result;
}

/**
 * Xây dựng mô hình 3D hoàn chỉnh từ dữ liệu hình vẽ hiện tại trên Bảng vẽ GSP (2D & Dựng tự do)
 */
export function build3DModelFromGsp(
  points: Array<{ id: string; x: number; y: number; label: string; type?: string; parentIds?: [string, string]; ratio?: number; segmentId?: string }>,
  segments: Array<{ id: string; p1Id: string; p2Id: string; style: 'solid' | 'dashed'; color?: string; width?: number }>,
  ellipses?: Array<{ id: string; centerId: string; rx: number; ry: number; style: string }>,
  presetType?: string
): Custom3DModel {
  const ptById = new Map<string, typeof points[0]>();
  const ptByLabel = new Map<string, typeof points[0]>();

  for (const p of points) {
    ptById.set(p.id, p);
    if (p.label) ptByLabel.set(p.label, p);
  }

  const raw3D: Record<string, Point3DData> = {};
  const faces: Face3DData[] = [];
  const edges: Edge3DData[] = [];

  // =======================================================================
  // 1. NHẬN DIỆN KHỐI HÌNH CỐT LÕI (PRESET HOẶC TẬP HỢP ĐỈNH ĐÃ VẼ TRÊN GSP)
  // =======================================================================
  const isCone = presetType === 'cone' || presetType === 'hinh_non' || (ellipses && ellipses.length === 1 && (ptByLabel.has('S') || ptByLabel.has('O')));
  const isCylinder = presetType === 'cylinder' || presetType === 'hinh_tru' || (ellipses && ellipses.length >= 2);
  const isOctahedron = presetType === 'bat_dien_deu' || (ptByLabel.has('S') && (ptByLabel.has("S'") || ptByLabel.has('S1')) && ptByLabel.has('D'));
  const isPrism = presetType === 'lang_tru_tam_giac' || presetType === 'prism_abc' || (ptByLabel.has("A'") && ptByLabel.has("B'") && ptByLabel.has("C'") && !ptByLabel.has('D'));
  const isBox = presetType === 'box_abcd' || presetType === 'hinh_hop_chu_nhat' || (ptByLabel.has("A'") && ptByLabel.has('D'));
  const isPyramidSA = presetType === 'chop_sa_vuong_day';
  const isPyramidTri = presetType === 'pyramid_regular_tri' || presetType === 'pyramid_s_abc' || presetType === 'chop_tam_giac' || (ptByLabel.has('S') && ptByLabel.has('A') && ptByLabel.has('B') && ptByLabel.has('C') && !ptByLabel.has('D'));

  if (isCone) {
    raw3D['S'] = { x: 0, y: 130, z: 0, label: 'S' };
    raw3D['O'] = { x: 0, y: -80, z: 0, label: 'O' };
    raw3D['A'] = { x: -110, y: -80, z: 0, label: 'A' };
    raw3D['B'] = { x: 110, y: -80, z: 0, label: 'B' };
  } else if (isCylinder) {
    raw3D['O'] = { x: 0, y: 90, z: 0, label: 'O' };
    raw3D['A'] = { x: -100, y: 90, z: 0, label: 'A' };
    raw3D['B'] = { x: 100, y: 90, z: 0, label: 'B' };
    raw3D["O'"] = { x: 0, y: -80, z: 0, label: "O'" };
    raw3D["A'"] = { x: -100, y: -80, z: 0, label: "A'" };
    raw3D["B'"] = { x: 100, y: -80, z: 0, label: "B'" };
  } else if (isOctahedron) {
    raw3D['A'] = { x: -100, y: 0, z: 60, label: 'A' };
    raw3D['B'] = { x: 90, y: 0, z: 60, label: 'B' };
    raw3D['C'] = { x: 140, y: 0, z: -60, label: 'C' };
    raw3D['D'] = { x: -50, y: 0, z: -60, label: 'D' };
    raw3D['S'] = { x: 20, y: 130, z: 0, label: 'S' };
    raw3D["S'"] = { x: 20, y: -130, z: 0, label: "S'" };

    faces.push({ keys: ['S', 'A', 'B'], isSideFace: true });
    faces.push({ keys: ['S', 'B', 'C'], isSideFace: true });
    faces.push({ keys: ['S', 'C', 'D'], isSideFace: true });
    faces.push({ keys: ['S', 'D', 'A'], isSideFace: true });
    faces.push({ keys: ["S'", 'B', 'A'], isSideFace: true });
    faces.push({ keys: ["S'", 'C', 'B'], isSideFace: true });
    faces.push({ keys: ["S'", 'D', 'C'], isSideFace: true });
    faces.push({ keys: ["S'", 'A', 'D'], isSideFace: true });
  } else if (isBox) {
    raw3D['A'] = { x: -100, y: -80, z: 70, label: 'A' };
    raw3D['B'] = { x: 80, y: -80, z: 70, label: 'B' };
    raw3D['C'] = { x: 140, y: -80, z: -60, label: 'C' };
    raw3D['D'] = { x: -40, y: -80, z: -60, label: 'D' };
    raw3D["A'"] = { x: -100, y: 80, z: 70, label: "A'" };
    raw3D["B'"] = { x: 80, y: 80, z: 70, label: "B'" };
    raw3D["C'"] = { x: 140, y: 80, z: -60, label: "C'" };
    raw3D["D'"] = { x: -40, y: 80, z: -60, label: "D'" };

    // Mặt đáy dưới (hướng ra ngoài -Y)
    faces.push({ keys: ['A', 'D', 'C', 'B'], isSideFace: false });
    // Mặt nắp trên (hướng ra ngoài +Y)
    faces.push({ keys: ["A'", "B'", "C'", "D'"], isSideFace: false });
    // 4 mặt bên
    faces.push({ keys: ['A', 'B', "B'", "A'"], isSideFace: true });
    faces.push({ keys: ['B', 'C', "C'", "B'"], isSideFace: true });
    faces.push({ keys: ['C', 'D', "D'", "C'"], isSideFace: true });
    faces.push({ keys: ['D', 'A', "A'", "D'"], isSideFace: true });
  } else if (isPrism) {
    raw3D['A'] = { x: -100, y: -80, z: 60, label: 'A' };
    raw3D['B'] = { x: 20, y: -80, z: 80, label: 'B' };
    raw3D['C'] = { x: 120, y: -80, z: -60, label: 'C' };
    raw3D["A'"] = { x: -100, y: 80, z: 60, label: "A'" };
    raw3D["B'"] = { x: 20, y: 80, z: 80, label: "B'" };
    raw3D["C'"] = { x: 120, y: 80, z: -60, label: "C'" };

    faces.push({ keys: ['A', 'C', 'B'], isSideFace: false });
    faces.push({ keys: ["A'", "B'", "C'"], isSideFace: false });
    faces.push({ keys: ['A', 'B', "B'", "A'"], isSideFace: true });
    faces.push({ keys: ['B', 'C', "C'", "B'"], isSideFace: true });
    faces.push({ keys: ['C', 'A', "A'", "C'"], isSideFace: true });
  } else if (isPyramidSA) {
    raw3D['A'] = { x: -100, y: -80, z: 60, label: 'A' };
    raw3D['B'] = { x: 90, y: -80, z: 60, label: 'B' };
    raw3D['C'] = { x: 150, y: -80, z: -70, label: 'C' };
    raw3D['D'] = { x: -40, y: -80, z: -70, label: 'D' };
    raw3D['S'] = { x: -100, y: 130, z: 60, label: 'S' };

    faces.push({ keys: ['A', 'D', 'C', 'B'], isSideFace: false });
    faces.push({ keys: ['S', 'A', 'B'], isSideFace: true });
    faces.push({ keys: ['S', 'B', 'C'], isSideFace: true });
    faces.push({ keys: ['S', 'C', 'D'], isSideFace: true });
    faces.push({ keys: ['S', 'D', 'A'], isSideFace: true });
  } else if (isPyramidTri) {
    raw3D['A'] = { x: -110, y: -70, z: 60, label: 'A' };
    raw3D['B'] = { x: 20, y: -70, z: 90, label: 'B' };
    raw3D['C'] = { x: 130, y: -70, z: -60, label: 'C' };
    raw3D['S'] = { x: 0, y: 130, z: 0, label: 'S' };
    if (ptByLabel.has('H')) {
      raw3D['H'] = { x: 13, y: -70, z: 30, label: 'H', isDependent: true };
    }

    faces.push({ keys: ['A', 'C', 'B'], isSideFace: false });
    faces.push({ keys: ['S', 'A', 'B'], isSideFace: true });
    faces.push({ keys: ['S', 'B', 'C'], isSideFace: true });
    faces.push({ keys: ['S', 'C', 'A'], isSideFace: true });
  } else {
    // Mặc định: Hình chóp S.ABCD đáy tứ giác
    raw3D['A'] = { x: -110, y: -80, z: 70, label: 'A' };
    raw3D['B'] = { x: 90, y: -80, z: 70, label: 'B' };
    raw3D['C'] = { x: 150, y: -80, z: -70, label: 'C' };
    raw3D['D'] = { x: -50, y: -80, z: -70, label: 'D' };
    raw3D['S'] = { x: 10, y: 130, z: 0, label: 'S' };
    raw3D['O'] = { x: 20, y: -80, z: 0, label: 'O', isDependent: true };

    faces.push({ keys: ['A', 'D', 'C', 'B'], isSideFace: false });
    faces.push({ keys: ['S', 'A', 'B'], isSideFace: true });
    faces.push({ keys: ['S', 'B', 'C'], isSideFace: true });
    faces.push({ keys: ['S', 'C', 'D'], isSideFace: true });
    faces.push({ keys: ['S', 'D', 'A'], isSideFace: true });
  }

  // =======================================================================
  // 2. TÍNH TOÁN TỌA ĐỘ 3D CHO CÁC ĐIỂM THÊM MỚI TRÊN GSP (M, N, P, O, H...)
  // =======================================================================
  for (const p of points) {
    const key = p.label || p.id;
    if (raw3D[key]) continue;

    // A. Điểm là trung điểm (midpoint) của 2 điểm cha
    if (p.type === 'midpoint' && p.parentIds && p.parentIds.length === 2) {
      const p1 = ptById.get(p.parentIds[0]);
      const p2 = ptById.get(p.parentIds[1]);
      const k1 = p1?.label || p1?.id;
      const k2 = p2?.label || p2?.id;
      if (k1 && k2 && raw3D[k1] && raw3D[k2]) {
        raw3D[key] = {
          x: Math.round((raw3D[k1].x + raw3D[k2].x) / 2),
          y: Math.round((raw3D[k1].y + raw3D[k2].y) / 2),
          z: Math.round((raw3D[k1].z + raw3D[k2].z) / 2),
          label: p.label || key,
          isDependent: true
        };
        continue;
      }
    }

    // B. Điểm nằm trên đoạn thẳng (point on segment) với tỉ lệ t
    if (p.type === 'on_segment' && p.parentIds && p.parentIds.length === 2) {
      const p1 = ptById.get(p.parentIds[0]);
      const p2 = ptById.get(p.parentIds[1]);
      const k1 = p1?.label || p1?.id;
      const k2 = p2?.label || p2?.id;
      const t = p.ratio ?? 0.5;
      if (k1 && k2 && raw3D[k1] && raw3D[k2]) {
        raw3D[key] = {
          x: Math.round(raw3D[k1].x + t * (raw3D[k2].x - raw3D[k1].x)),
          y: Math.round(raw3D[k1].y + t * (raw3D[k2].y - raw3D[k1].y)),
          z: Math.round(raw3D[k1].z + t * (raw3D[k2].z - raw3D[k1].z)),
          label: p.label || key,
          isDependent: true
        };
        continue;
      }
    }

    // C. Tâm O hoặc H nếu vẽ tự do
    if (key === 'O' && raw3D['A'] && raw3D['C']) {
      raw3D['O'] = {
        x: Math.round((raw3D['A'].x + raw3D['C'].x) / 2),
        y: raw3D['A'].y,
        z: Math.round((raw3D['A'].z + raw3D['C'].z) / 2),
        label: 'O',
        isDependent: true
      };
      continue;
    }

    // D. Điểm M tự do mặc định trên cạnh SB hoặc SC
    if (key === 'M' && raw3D['S'] && raw3D['B']) {
      raw3D['M'] = {
        x: Math.round((raw3D['S'].x + raw3D['B'].x) / 2),
        y: Math.round((raw3D['S'].y + raw3D['B'].y) / 2),
        z: Math.round((raw3D['S'].z + raw3D['B'].z) / 2),
        label: 'M',
        isDependent: true
      };
      continue;
    }

    // E. Điểm vẽ tự do: Ước lượng toạ độ 3D từ toạ độ màn hình 2D
    const avgX = 375, avgY = 280;
    raw3D[key] = {
      x: Math.round((p.x - avgX) * 0.7),
      y: Math.round((avgY - p.y) * 0.7),
      z: 0,
      label: p.label || key
    };
  }

  // =======================================================================
  // 3. THU THẬP TẤT CẢ CÁC ĐOẠN THẲNG TRÊN GSP VÀO MÔ HÌNH 3D
  // =======================================================================
  const edgeKeySet = new Set<string>();

  const addEdge = (u: string, v: string, isAlwaysDashed = false, faceIndices?: number[]) => {
    if (!raw3D[u] || !raw3D[v] || u === v) return;
    const key1 = `${u}_${v}`;
    const key2 = `${v}_${u}`;
    if (edgeKeySet.has(key1) || edgeKeySet.has(key2)) return;
    edgeKeySet.add(key1);
    edges.push({ u, v, isAlwaysDashed, faceIndices });
  };

  // Xác định tập hợp các cạnh viền đa diện (Boundary Edges) từ danh sách mặt (Faces)
  const faceBoundaryEdges = new Set<string>();
  if (faces.length > 0) {
    for (const f of faces) {
      for (let i = 0; i < f.keys.length; i++) {
        const u = f.keys[i];
        const v = f.keys[(i + 1) % f.keys.length];
        faceBoundaryEdges.add(`${u}_${v}`);
        faceBoundaryEdges.add(`${v}_${u}`);
      }
    }
  }

  // Lập bản đồ các mặt đa diện chứa từng đỉnh (point key -> face indices)
  const ptFaces = new Map<string, Set<number>>();
  for (let i = 0; i < faces.length; i++) {
    for (const k of faces[i].keys) {
      if (!ptFaces.has(k)) ptFaces.set(k, new Set());
      ptFaces.get(k)!.add(i);
    }
  }

  // Nhận diện mặt cho các điểm phụ thuộc (M, O, H...)
  for (const p of points) {
    const key = p.label || p.id;
    if (ptFaces.has(key)) continue;

    if (p.parentIds && p.parentIds.length === 2) {
      const p1 = ptById.get(p.parentIds[0]);
      const p2 = ptById.get(p.parentIds[1]);
      const k1 = p1?.label || p1?.id;
      const k2 = p2?.label || p2?.id;
      if (k1 && k2 && ptFaces.has(k1) && ptFaces.has(k2)) {
        const s1 = ptFaces.get(k1)!;
        const s2 = ptFaces.get(k2)!;
        const inter = new Set<number>();
        for (const idx of s1) {
          if (s2.has(idx)) inter.add(idx);
        }
        ptFaces.set(key, inter);
        continue;
      }
    }

    if (key === 'O' && ptFaces.has('A') && ptFaces.has('C')) {
      const s1 = ptFaces.get('A')!;
      const s2 = ptFaces.get('C')!;
      const inter = new Set<number>();
      for (const idx of s1) {
        if (s2.has(idx)) inter.add(idx);
      }
      ptFaces.set('O', inter);
      continue;
    }

    if (key === 'H' && ptFaces.has('A') && ptFaces.has('B')) {
      const s1 = ptFaces.get('A')!;
      const s2 = ptFaces.get('B')!;
      const inter = new Set<number>();
      for (const idx of s1) {
        if (s2.has(idx)) inter.add(idx);
      }
      ptFaces.set('H', inter);
      continue;
    }
  }

  // Nạp cạnh từ danh sách segments vẽ trên GSP
  for (const seg of segments) {
    const p1 = ptById.get(seg.p1Id);
    const p2 = ptById.get(seg.p2Id);
    if (!p1 || !p2) continue;
    const u = p1.label || p1.id;
    const v = p2.label || p2.id;
    if (!raw3D[u] || !raw3D[v] || u === v) continue;

    const edgeKey = `${u}_${v}`;
    const isBoundary = faceBoundaryEdges.has(edgeKey);

    let isInternal = false;
    let faceIndices: number[] = [];

    if (isBoundary) {
      // Cạnh viền đa diện (Boundary edge) -> KHÔNG BAO GIỜ gán cố định nét đứt!
      // Luôn tính toán động nét liền/đứt theo góc quay 3D và đa giác mặt
      isInternal = false;
      for (let i = 0; i < faces.length; i++) {
        const fKeys = faces[i].keys;
        if (fKeys.includes(u) && fKeys.includes(v)) {
          faceIndices.push(i);
        }
      }
    } else {
      // Cạnh không phải viền đa diện:
      const uF = ptFaces.get(u) || new Set<number>();
      const vF = ptFaces.get(v) || new Set<number>();
      const common: number[] = [];
      for (const fIdx of uF) {
        if (vF.has(fIdx)) common.push(fIdx);
      }

      if (common.length > 0) {
        faceIndices = common;
        // Các đường đặc thù bên trong khối: đường cao SO, SH hoặc đường chéo đáy
        const isAltitudeOrCenter = (u === 'O' || v === 'O' || u === 'H' || v === 'H');
        const isDiagonal = ((u === 'A' && v === 'C') || (u === 'B' && v === 'D'));
        isInternal = isAltitudeOrCenter || isDiagonal;
      } else {
        // Đoạn thẳng cắt qua thể tích bên trong khối (ví dụ SO, OM, ...) -> luôn nét đứt
        isInternal = true;
      }
    }

    addEdge(u, v, isInternal, faceIndices.length > 0 ? faceIndices : undefined);
  }

  // Bổ sung các cạnh viền chuẩn nếu GSP chưa có
  if (faces.length > 0) {
    for (let fIdx = 0; fIdx < faces.length; fIdx++) {
      const f = faces[fIdx];
      for (let i = 0; i < f.keys.length; i++) {
        const u = f.keys[i];
        const v = f.keys[(i + 1) % f.keys.length];
        addEdge(u, v, false, [fIdx]);
      }
    }
  }

  return {
    name: presetType || 'custom_model',
    points: raw3D,
    faces,
    edges,
    isCone,
    coneData: isCone ? { apexKey: 'S', centerKey: 'O', radius: 110 } : undefined,
    isCylinder,
    cylinderData: isCylinder ? { topCenterKey: 'O', botCenterKey: "O'", radius: 100 } : undefined
  };
}

/**
 * Render khối hình học không gian 3D hoàn chỉnh lên HTML5 Canvas với độ phân giải cao 300 DPI.
 * Đảm bảo phân loại Nét Liền (thấy) & Nét Đứt (khuất) động 100% chính xác khi xoay 360 độ.
 */
export function renderGeometry3DToCanvas(
  config: Geometry3DConfig,
  canvas: HTMLCanvasElement,
  dpiScale = 3
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.clientWidth || 500;
  const height = canvas.clientHeight || 400;

  canvas.width = Math.round(width * dpiScale);
  canvas.height = Math.round(height * dpiScale);

  ctx.save();
  ctx.scale(dpiScale, dpiScale);

  // Nền trắng tinh khiết
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const pts = getGeometry3DPoints(config, width, height);

  // Tính tâm hình học để canh hướng chữ nhãn không đè thân hình
  let sumX = 0, sumY = 0, count = 0;
  for (const p of Object.values(pts)) {
    sumX += p.x;
    sumY += p.y;
    count++;
  }
  const geoCenterX = count > 0 ? sumX / count : width / 2;
  const geoCenterY = count > 0 ? sumY / count : height / 2;

  // Lấy danh sách mặt và cạnh từ customModel hoặc từ preset mặc định
  interface FaceDef {
    keys: string[];
    isSideFace?: boolean;
  }
  interface EdgeDef {
    u: string;
    v: string;
    isAlwaysDashed?: boolean;
    faceIndices?: number[];
  }

  let faces: FaceDef[] = [];
  let edges: EdgeDef[] = [];
  const customModel = config.customModel;

  if (customModel) {
    faces = customModel.faces;
    edges = customModel.edges;
  } else {
    // Fallback preset cấu trúc
    if (config.preset === 'pyramid_sa_bottom') {
      faces.push({ keys: ['A', 'D', 'C', 'B'], isSideFace: false });
      faces.push({ keys: ['S', 'A', 'B'], isSideFace: true });
      faces.push({ keys: ['S', 'B', 'C'], isSideFace: true });
      faces.push({ keys: ['S', 'C', 'D'], isSideFace: true });
      faces.push({ keys: ['S', 'D', 'A'], isSideFace: true });

      edges.push({ u: 'A', v: 'B' }, { u: 'B', v: 'C' }, { u: 'C', v: 'D' }, { u: 'D', v: 'A' });
      edges.push({ u: 'S', v: 'A' }, { u: 'S', v: 'B' }, { u: 'S', v: 'C' }, { u: 'S', v: 'D' });
      if (config.showDiagonals) {
        edges.push({ u: 'A', v: 'C', isAlwaysDashed: true }, { u: 'B', v: 'D', isAlwaysDashed: true });
      }
    } else if (config.preset === 'pyramid_s_abc') {
      faces.push({ keys: ['A', 'C', 'B'], isSideFace: false });
      faces.push({ keys: ['S', 'A', 'B'], isSideFace: true });
      faces.push({ keys: ['S', 'B', 'C'], isSideFace: true });
      faces.push({ keys: ['S', 'C', 'A'], isSideFace: true });

      edges.push({ u: 'A', v: 'B' }, { u: 'B', v: 'C' }, { u: 'C', v: 'A' });
      edges.push({ u: 'S', v: 'A' }, { u: 'S', v: 'B' }, { u: 'S', v: 'C' });
    } else if (config.preset === 'prism_abc') {
      faces.push({ keys: ['A', 'C', 'B'], isSideFace: false });
      faces.push({ keys: ['A1', 'B1', 'C1'], isSideFace: false });
      faces.push({ keys: ['A', 'B', 'B1', 'A1'], isSideFace: true });
      faces.push({ keys: ['B', 'C', 'C1', 'B1'], isSideFace: true });
      faces.push({ keys: ['C', 'A', 'A1', 'C1'], isSideFace: true });

      edges.push({ u: 'A', v: 'B' }, { u: 'B', v: 'C' }, { u: 'C', v: 'A' });
      edges.push({ u: 'A1', v: 'B1' }, { u: 'B1', v: 'C1' }, { u: 'C1', v: 'A1' });
      edges.push({ u: 'A', v: 'A1' }, { u: 'B', v: 'B1' }, { u: 'C', v: 'C1' });
    } else if (config.preset === 'box_abcd') {
      faces.push({ keys: ['A', 'D', 'C', 'B'], isSideFace: false });
      faces.push({ keys: ['A1', 'B1', 'C1', 'D1'], isSideFace: false });
      faces.push({ keys: ['A', 'B', 'B1', 'A1'], isSideFace: true });
      faces.push({ keys: ['B', 'C', 'C1', 'B1'], isSideFace: true });
      faces.push({ keys: ['C', 'D', 'D1', 'C1'], isSideFace: true });
      faces.push({ keys: ['D', 'A', 'A1', 'D1'], isSideFace: true });

      edges.push({ u: 'A', v: 'B' }, { u: 'B', v: 'C' }, { u: 'C', v: 'D' }, { u: 'D', v: 'A' });
      edges.push({ u: 'A1', v: 'B1' }, { u: 'B1', v: 'C1' }, { u: 'C1', v: 'D1' }, { u: 'D1', v: 'A1' });
      edges.push({ u: 'A', v: 'A1' }, { u: 'B', v: 'B1' }, { u: 'C', v: 'C1' }, { u: 'D', v: 'D1' });
    } else {
      // pyramid_s_abcd
      faces.push({ keys: ['A', 'D', 'C', 'B'], isSideFace: false });
      faces.push({ keys: ['S', 'A', 'B'], isSideFace: true });
      faces.push({ keys: ['S', 'B', 'C'], isSideFace: true });
      faces.push({ keys: ['S', 'C', 'D'], isSideFace: true });
      faces.push({ keys: ['S', 'D', 'A'], isSideFace: true });

      edges.push({ u: 'A', v: 'B' }, { u: 'B', v: 'C' }, { u: 'C', v: 'D' }, { u: 'D', v: 'A' });
      edges.push({ u: 'S', v: 'A' }, { u: 'S', v: 'B' }, { u: 'S', v: 'C' }, { u: 'S', v: 'D' });
      if (config.showDiagonals) {
        edges.push({ u: 'A', v: 'C', isAlwaysDashed: true }, { u: 'B', v: 'D', isAlwaysDashed: true }, { u: 'S', v: 'O', isAlwaysDashed: true });
      }
      if (config.showMidpointM && config.showCenterO) {
        edges.push({ u: 'O', v: 'M', isAlwaysDashed: true });
      }
    }
  }

  // =======================================================================
  // 1. TÍNH TOÁN TÍNH HIỂN THỊ (FRONT / BACK) CỦA CÁC MẶT KHI XOAY 360 ĐỘ
  // =======================================================================
  const faceVisibility = faces.map(f => {
    const polygon = f.keys.map(k => pts[k]).filter(Boolean);
    if (polygon.length < 3) return false;
    const a = calc2DSignedArea(polygon);
    // Trong hệ toạ độ màn hình (Y hướng xuống), đa giác quay ngược chiều KĐH có diện tích âm là nhìn thấy
    return a < 0;
  });

  // Tính bao lồi 2D (Convex Hull) để nhận diện các cạnh Silhouette bao ngoài
  // Các cạnh trên đường viền bao ngoài 2D luôn luôn nhìn thấy (NÉT THẤY / SOLID)
  const hullKeys = get2DConvexHull(pts);
  const silhouetteEdgeSet = new Set<string>();
  if (hullKeys.length >= 3) {
    for (let i = 0; i < hullKeys.length; i++) {
      const u = hullKeys[i];
      const v = hullKeys[(i + 1) % hullKeys.length];
      silhouetteEdgeSet.add(`${u}_${v}`);
      silhouetteEdgeSet.add(`${v}_${u}`);
    }
  }

  // Lập bản đồ đỉnh -> mặt để phân loại cạnh nếu chưa có faceIndices
  const ptFaces = new Map<string, Set<number>>();
  for (let i = 0; i < faces.length; i++) {
    for (const k of faces[i].keys) {
      if (!ptFaces.has(k)) ptFaces.set(k, new Set());
      ptFaces.get(k)!.add(i);
    }
  }
  if (pts['O'] && ptFaces.has('A') && ptFaces.has('C')) {
    const s1 = ptFaces.get('A')!;
    const s2 = ptFaces.get('C')!;
    const inter = new Set<number>();
    for (const idx of s1) {
      if (s2.has(idx)) inter.add(idx);
    }
    ptFaces.set('O', inter);
  }
  if (pts['M'] && ptFaces.has('S') && ptFaces.has('B')) {
    const s1 = ptFaces.get('S')!;
    const s2 = ptFaces.get('B')!;
    const inter = new Set<number>();
    for (const idx of s1) {
      if (s2.has(idx)) inter.add(idx);
    }
    ptFaces.set('M', inter);
  }

  // Phân loại cạnh: Nét đứt (khuất phía sau) vs Nét liền (thấy phía trước)
  const dashedEdges: EdgeDef[] = [];
  const solidEdges: EdgeDef[] = [];

  for (const edge of edges) {
    if (!pts[edge.u] || !pts[edge.v]) continue;

    // A. Cạnh cố định nét đứt (đường cao SO bên trong, đường phụ khuất)
    if (edge.isAlwaysDashed) {
      dashedEdges.push(edge);
      continue;
    }

    // B. Nếu cạnh nằm trên đường bao ngoài (Silhouette) của hình chiếu 2D -> LUÔN NÉT LIỀN (THẤY)
    if (silhouetteEdgeSet.has(`${edge.u}_${edge.v}`)) {
      solidEdges.push(edge);
      continue;
    }

    // C. Kiểm tra các mặt chứa cạnh này
    const targetFaces: number[] = edge.faceIndices && edge.faceIndices.length > 0
      ? edge.faceIndices
      : (() => {
          const uF = ptFaces.get(edge.u);
          const vF = ptFaces.get(edge.v);
          if (!uF || !vF) {
            const res: number[] = [];
            for (let i = 0; i < faces.length; i++) {
              if (faces[i].keys.includes(edge.u) && faces[i].keys.includes(edge.v)) {
                res.push(i);
              }
            }
            return res;
          }
          const common: number[] = [];
          for (const idx of uF) {
            if (vF.has(idx)) common.push(idx);
          }
          return common;
        })();

    let frontFacesCount = 0;
    for (const fIdx of targetFaces) {
      if (faceVisibility[fIdx]) {
        frontFacesCount++;
      }
    }

    // Nếu cạnh thuộc ít nhất 1 mặt nhìn thấy ở phía trước -> NÉT LIỀN (thấy)
    // Nếu cạnh chỉ thuộc các mặt phía sau -> NÉT ĐỨT (khuất)
    if (frontFacesCount > 0) {
      solidEdges.push(edge);
    } else {
      dashedEdges.push(edge);
    }
  }

  // =======================================================================
  // 2. VẼ ĐẶC BIỆT CHO HÌNH NÓN (CONE) & HÌNH TRỤ (CYLINDER) NẾU CÓ
  // =======================================================================
  const def = getDefaultAngles(config.preset);
  const rotX = config.rotX ?? def.rotX;
  const rotY = config.rotY ?? def.rotY;
  const zoom = config.zoom ?? def.zoom;
  const panX = config.panX ?? def.panX;
  const panY = config.panY ?? def.panY;
  const centerX = width / 2;
  const centerY = height / 2;

  if (customModel?.isCone && pts['S'] && pts['O']) {
    const apexPt = pts['S'];
    const centerPt = pts['O'];
    const R = customModel.coneData?.radius || 110;
    const rawCenter = customModel.points['O'] || { x: 0, y: -80, z: 0 };
    const centerProj = project3D(rawCenter, rotX, rotY, zoom, panX, panY, centerX, centerY);
    const numSteps = 48;
    const circlePts: Array<{ x: number; y: number; z: number }> = [];

    for (let i = 0; i <= numSteps; i++) {
      const phi = (i * 2 * Math.PI) / numSteps;
      const pt3D = {
        x: rawCenter.x + R * Math.cos(phi),
        y: rawCenter.y,
        z: rawCenter.z + R * Math.sin(phi)
      };
      circlePts.push(project3D(pt3D, rotX, rotY, zoom, panX, panY, centerX, centerY));
    }

    // Tìm 2 điểm tiếp tuyến cực biên (đường sinh bao ngoài)
    let minIdx = 0, maxIdx = 0;
    let minDiff = Infinity, maxDiff = -Infinity;
    const baseAngle = Math.atan2(centerPt.y - apexPt.y, centerPt.x - apexPt.x);

    for (let i = 0; i < numSteps; i++) {
      const angle = Math.atan2(circlePts[i].y - apexPt.y, circlePts[i].x - apexPt.x);
      let diff = angle - baseAngle;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      if (diff < minDiff) { minDiff = diff; minIdx = i; }
      if (diff > maxDiff) { maxDiff = diff; maxIdx = i; }
    }

    ctx.save();
    // 2 đường sinh tiếp tuyến: nét liền
    ctx.setLineDash([]);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.2;
    drawLine(ctx, apexPt, circlePts[minIdx]);
    drawLine(ctx, apexPt, circlePts[maxIdx]);

    // Vẽ đáy elip: nửa hướng về người xem là nét liền, nửa sau là nét đứt
    for (let i = 0; i < numSteps; i++) {
      const pA = circlePts[i];
      const pB = circlePts[i + 1];
      const isFront = (pA.z + pB.z) / 2 > centerProj.z;
      ctx.beginPath();
      ctx.setLineDash(isFront ? [] : [6, 4.5]);
      ctx.lineWidth = isFront ? 2.2 : 1.7;
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();
    }

    // Trục SO & Bán kính OA nét đứt
    ctx.setLineDash([6, 4.5]);
    ctx.lineWidth = 1.7;
    drawLine(ctx, apexPt, centerPt);
    if (pts['A']) drawLine(ctx, centerPt, pts['A']);
    ctx.restore();
  }

  if (customModel?.isCylinder && pts['O'] && pts["O'"]) {
    const topPt = pts['O'];
    const botPt = pts["O'"];
    const R = customModel.cylinderData?.radius || 100;
    const rawTop = customModel.points['O'] || { x: 0, y: 80, z: 0 };
    const rawBot = customModel.points["O'"] || { x: 0, y: -80, z: 0 };
    const botProj = project3D(rawBot, rotX, rotY, zoom, panX, panY, centerX, centerY);
    const numSteps = 48;
    const topCirclePts: Array<{ x: number; y: number; z: number }> = [];
    const botCirclePts: Array<{ x: number; y: number; z: number }> = [];

    for (let i = 0; i <= numSteps; i++) {
      const phi = (i * 2 * Math.PI) / numSteps;
      topCirclePts.push(project3D({ x: rawTop.x + R * Math.cos(phi), y: rawTop.y, z: rawTop.z + R * Math.sin(phi) }, rotX, rotY, zoom, panX, panY, centerX, centerY));
      botCirclePts.push(project3D({ x: rawBot.x + R * Math.cos(phi), y: rawBot.y, z: rawBot.z + R * Math.sin(phi) }, rotX, rotY, zoom, panX, panY, centerX, centerY));
    }

    let minIdx = 0, maxIdx = 0;
    let minVal = Infinity, maxVal = -Infinity;
    for (let i = 0; i < numSteps; i++) {
      const val = topCirclePts[i].x - topPt.x;
      if (val < minVal) { minVal = val; minIdx = i; }
      if (val > maxVal) { maxVal = val; maxIdx = i; }
    }

    ctx.save();
    // 2 đường sinh bên ngoài
    ctx.setLineDash([]);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#000000';
    drawLine(ctx, topCirclePts[minIdx], botCirclePts[minIdx]);
    drawLine(ctx, topCirclePts[maxIdx], botCirclePts[maxIdx]);

    // Đáy trên: toàn bộ nét liền
    ctx.beginPath();
    ctx.lineWidth = 2.2;
    for (let i = 0; i <= numSteps; i++) {
      if (i === 0) ctx.moveTo(topCirclePts[i].x, topCirclePts[i].y);
      else ctx.lineTo(topCirclePts[i].x, topCirclePts[i].y);
    }
    ctx.stroke();

    // Đáy dưới: nửa trước nét liền, nửa sau nét đứt
    for (let i = 0; i < numSteps; i++) {
      const isFront = (botCirclePts[i].z + botCirclePts[i + 1].z) / 2 > botProj.z;
      ctx.beginPath();
      ctx.setLineDash(isFront ? [] : [6, 4.5]);
      ctx.lineWidth = isFront ? 2.2 : 1.7;
      ctx.moveTo(botCirclePts[i].x, botCirclePts[i].y);
      ctx.lineTo(botCirclePts[i + 1].x, botCirclePts[i + 1].y);
      ctx.stroke();
    }

    // Trục OO' nét đứt
    ctx.setLineDash([6, 4.5]);
    ctx.lineWidth = 1.7;
    drawLine(ctx, topPt, botPt);
    ctx.restore();
  }

  // =======================================================================
  // 3. VẼ CÁC CẠNH NÉT ĐỨT (Cạnh khuất phía sau hoặc bên trong khối)
  // =======================================================================
  ctx.save();
  ctx.setLineDash([6, 4.5]);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.8;
  for (const e of dashedEdges) {
    if (pts[e.u] && pts[e.v]) {
      drawLine(ctx, pts[e.u], pts[e.v]);
    }
  }
  ctx.restore();

  // =======================================================================
  // 4. VẼ CÁC CẠNH NÉT LIỀN (Cạnh nhìn thấy phía trước)
  // =======================================================================
  ctx.save();
  ctx.setLineDash([]);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.2;
  for (const e of solidEdges) {
    if (pts[e.u] && pts[e.v]) {
      drawLine(ctx, pts[e.u], pts[e.v]);
    }
  }
  ctx.restore();

  // =======================================================================
  // 5. VẼ CÁC ĐIỂM ĐẶC BIỆT & CHẤM TRÒN ĐỈNH
  // =======================================================================
  for (const [key, pt] of Object.entries(pts)) {
    if (key === 'O' && !config.showCenterO && !customModel) continue;
    if (key === 'M' && !config.showMidpointM && !customModel) continue;
    drawPoint(ctx, pt.x, pt.y);
  }

  // =======================================================================
  // 6. HIỆU ỨNG TƯƠNG TÁC KÉO THẢ TRÊN CANVAS (Ẩn khi xuất Word)
  // =======================================================================
  const isInteractive = !config.isExporting;
  if (isInteractive) {
    for (const [key, pt] of Object.entries(pts)) {
      const isHovered = config.hoveredPoint === key;
      const isDragged = config.draggedPoint === key;

      if (isHovered || isDragged) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isDragged ? 12 : 9, 0, Math.PI * 2);
        ctx.fillStyle = isDragged ? 'rgba(13, 148, 136, 0.35)' : 'rgba(13, 148, 136, 0.2)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isDragged ? 5.5 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0d9488';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // =======================================================================
  // 7. GHI NHÃN CHỮ CÁC ĐỈNH (Times New Roman in nghiêng, viền trắng chống đè nét)
  // =======================================================================
  ctx.font = 'italic bold 21px "Times New Roman", serif';

  for (const [key, pt] of Object.entries(pts)) {
    if (key === 'O' && !config.showCenterO && !customModel) continue;
    if (key === 'M' && !config.showMidpointM && !customModel) continue;

    // Tính hướng offset hướng ra phía ngoài tâm khối hình để chữ không bao giờ đè thân hình
    const vx = pt.x - geoCenterX;
    const vy = pt.y - geoCenterY;
    const len = Math.hypot(vx, vy) || 1;
    const dist = 18;
    const lx = pt.x + (vx / len) * dist;
    const ly = pt.y + (vy / len) * dist;

    ctx.textAlign = vx > 15 ? 'left' : vx < -15 ? 'right' : 'center';
    ctx.textBaseline = vy > 15 ? 'top' : vy < -15 ? 'bottom' : 'middle';

    // Viền trắng Halo bảo vệ chữ
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeText(pt.label, lx, ly);

    ctx.fillStyle = (isInteractive && (config.hoveredPoint === key || config.draggedPoint === key))
      ? '#0d9488'
      : '#000000';
    ctx.fillText(pt.label, lx, ly);
  }

  ctx.restore();
}

function drawLine(ctx: CanvasRenderingContext2D, p1: { x: number; y: number }, p2: { x: number; y: number }): void {
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

function drawPoint(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath();
  ctx.arc(x, y, 3.8, 0, Math.PI * 2);
  ctx.fillStyle = '#000000';
  ctx.fill();
}
