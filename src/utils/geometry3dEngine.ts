/**
 * Geometry 3D Engine - Vẽ và Tương tác Hình học không gian chuẩn SGK Toán 12 & THPT (300 DPI)
 * Hỗ trợ xoay 3D trực tiếp, kéo thả đỉnh hình học, phóng to/thu nhỏ, xuất Word sắc nét.
 *
 * Các khối hình chuẩn thi THPT Quốc gia & SGK GDPT 2018:
 * 1. Hình chóp S.ABCD đáy hình bình hành (Dạng chuẩn thi THPT)
 * 2. Hình chóp tam giác S.ABC
 * 3. Hình chóp S.ABCD có SA vuông góc đáy
 * 4. Lăng trụ tam giác ABC.A'B'C'
 * 5. Hình hộp chữ nhật / lập phương ABCD.A'B'C'D'
 * 6. Hệ trục tọa độ Oxyz trong không gian (Trọng tâm Toán 12)
 */

export interface Geometry3DConfig {
  preset: 'pyramid_s_abcd' | 'pyramid_s_abc' | 'pyramid_sa_bottom' | 'prism_abc' | 'box_abcd' | 'coord_oxyz';
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

interface Point3D {
  x: number;
  y: number;
  z: number;
  label: string;
}

/**
 * Trả về góc nhìn chuẩn SGK ban đầu cho từng khối hình
 */
export function getDefaultAngles(preset: Geometry3DConfig['preset']): { rotX: number; rotY: number; zoom: number; panX: number; panY: number } {
  switch (preset) {
    case 'pyramid_s_abcd':
    case 'pyramid_sa_bottom':
      return { rotX: 0.22, rotY: -0.32, zoom: 1.0, panX: 0, panY: 0 };
    case 'pyramid_s_abc':
      return { rotX: 0.20, rotY: -0.28, zoom: 1.0, panX: 0, panY: 0 };
    case 'prism_abc':
      return { rotX: 0.22, rotY: -0.28, zoom: 0.95, panX: 0, panY: 0 };
    case 'box_abcd':
      return { rotX: 0.24, rotY: -0.36, zoom: 0.95, panX: 0, panY: 0 };
    case 'coord_oxyz':
      return { rotX: 0.28, rotY: -0.45, zoom: 1.05, panX: 0, panY: 10 };
    default:
      return { rotX: 0.22, rotY: -0.32, zoom: 1.0, panX: 0, panY: 0 };
  }
}

/**
 * Phép chiếu 3D sang 2D màn hình theo góc quay yaw, pitch và tỉ lệ zoom
 */
function project3D(
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
function calc2DSignedArea(pts: { x: number; y: number }[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return area;
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

  const raw3D: Record<string, Point3D> = {};

  if (config.preset === 'pyramid_s_abcd') {
    raw3D['A'] = { x: -110, y: -80, z: 70, label: 'A' };
    raw3D['B'] = { x: 90, y: -80, z: 70, label: 'B' };
    raw3D['C'] = { x: 150, y: -80, z: -70, label: 'C' };
    raw3D['D'] = { x: -50, y: -80, z: -70, label: 'D' };
    raw3D['S'] = { x: 10, y: 130, z: 0, label: 'S' };
  } else if (config.preset === 'pyramid_sa_bottom') {
    raw3D['A'] = { x: -100, y: -80, z: 60, label: 'A' };
    raw3D['B'] = { x: 90, y: -80, z: 60, label: 'B' };
    raw3D['C'] = { x: 150, y: -80, z: -70, label: 'C' };
    raw3D['D'] = { x: -40, y: -80, z: -70, label: 'D' };
    raw3D['S'] = { x: -100, y: 130, z: 60, label: 'S' };
  } else if (config.preset === 'pyramid_s_abc') {
    raw3D['A'] = { x: -110, y: -70, z: 60, label: 'A' };
    raw3D['B'] = { x: 20, y: -70, z: 90, label: 'B' };
    raw3D['C'] = { x: 130, y: -70, z: -60, label: 'C' };
    raw3D['S'] = { x: 0, y: 130, z: 0, label: 'S' };
  } else if (config.preset === 'prism_abc') {
    raw3D['A'] = { x: -100, y: -80, z: 60, label: 'A' };
    raw3D['B'] = { x: 20, y: -80, z: 80, label: 'B' };
    raw3D['C'] = { x: 120, y: -80, z: -60, label: 'C' };
    raw3D['A1'] = { x: -100, y: 80, z: 60, label: "A'" };
    raw3D['B1'] = { x: 20, y: 80, z: 80, label: "B'" };
    raw3D['C1'] = { x: 120, y: 80, z: -60, label: "C'" };
  } else if (config.preset === 'box_abcd') {
    raw3D['A'] = { x: -100, y: -80, z: 70, label: 'A' };
    raw3D['B'] = { x: 80, y: -80, z: 70, label: 'B' };
    raw3D['C'] = { x: 140, y: -80, z: -60, label: 'C' };
    raw3D['D'] = { x: -40, y: -80, z: -60, label: 'D' };
    raw3D['A1'] = { x: -100, y: 80, z: 70, label: "A'" };
    raw3D['B1'] = { x: 80, y: 80, z: 70, label: "B'" };
    raw3D['C1'] = { x: 140, y: 80, z: -60, label: "C'" };
    raw3D['D1'] = { x: -40, y: 80, z: -60, label: "D'" };
  } else if (config.preset === 'coord_oxyz') {
    raw3D['O'] = { x: 0, y: -30, z: 0, label: 'O' };
    raw3D['X'] = { x: 0, y: -30, z: 150, label: 'x' };
    raw3D['Y'] = { x: 160, y: -30, z: 0, label: 'y' };
    raw3D['Z'] = { x: 0, y: 130, z: 0, label: 'z' };
    // Điểm đơn vị i, j, k
    raw3D['I'] = { x: 0, y: -30, z: 70, label: 'i' };
    raw3D['J'] = { x: 70, y: -30, z: 0, label: 'j' };
    raw3D['K'] = { x: 0, y: 50, z: 0, label: 'k' };
  }

  const result: Record<string, ScreenPoint> = {};

  for (const [key, p3] of Object.entries(raw3D)) {
    if (overrides[key]) {
      result[key] = { x: overrides[key].x, y: overrides[key].y, label: p3.label };
    } else {
      const proj = project3D(p3, rotX, rotY, zoom, panX, panY, centerX, centerY);
      result[key] = { x: proj.x, y: proj.y, label: p3.label };
    }
  }

  // Điểm phụ thuộc O và M cho các khối chóp
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

  return result;
}

/**
 * Render khối hình học không gian 3D hoàn chỉnh lên HTML5 Canvas với độ phân giải cao 300 DPI
 */
export function renderGeometry3DToCanvas(
  config: Geometry3DConfig,
  canvas: HTMLCanvasElement,
  dpiScale = 3
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = 500;
  const height = 400;

  canvas.width = Math.round(width * dpiScale);
  canvas.height = Math.round(height * dpiScale);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

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

  // Xử lý riêng cho Hệ tọa độ không gian Oxyz (Toán 12)
  if (config.preset === 'coord_oxyz') {
    renderCoordOxyz(ctx, pts, config);
    ctx.restore();
    return;
  }

  // Tâm hình học để tính hướng véc tơ nhãn chữ hướng ra ngoài
  let sumX = 0, sumY = 0, count = 0;
  for (const p of Object.values(pts)) {
    sumX += p.x;
    sumY += p.y;
    count++;
  }
  const geoCenterX = count > 0 ? sumX / count : width / 2;
  const geoCenterY = count > 0 ? sumY / count : height / 2;

  // Cấu trúc mặt đa diện theo từng preset để tự động tính nét khuất (đứt) và nét thấy (liền)
  interface FaceDef {
    keys: string[];
    isSideFace?: boolean;
  }
  interface EdgeDef {
    u: string;
    v: string;
    isAlwaysDashed?: boolean;
  }

  const faces: FaceDef[] = [];
  const edges: EdgeDef[] = [];

  if (config.preset === 'pyramid_s_abcd' || config.preset === 'pyramid_sa_bottom') {
    faces.push({ keys: ['A', 'B', 'C', 'D'], isSideFace: false });
    faces.push({ keys: ['S', 'A', 'B'], isSideFace: true });
    faces.push({ keys: ['S', 'B', 'C'], isSideFace: true });
    faces.push({ keys: ['S', 'C', 'D'], isSideFace: true });
    faces.push({ keys: ['S', 'D', 'A'], isSideFace: true });

    edges.push({ u: 'A', v: 'B' });
    edges.push({ u: 'B', v: 'C' });
    edges.push({ u: 'C', v: 'D' });
    edges.push({ u: 'D', v: 'A' });
    edges.push({ u: 'S', v: 'A' });
    edges.push({ u: 'S', v: 'B' });
    edges.push({ u: 'S', v: 'C' });
    edges.push({ u: 'S', v: 'D' });

    if (config.showDiagonals) {
      edges.push({ u: 'A', v: 'C', isAlwaysDashed: true });
      edges.push({ u: 'B', v: 'D', isAlwaysDashed: true });
      edges.push({ u: 'S', v: 'O', isAlwaysDashed: true });
    }
    if (config.showMidpointM && config.showCenterO) {
      edges.push({ u: 'O', v: 'M', isAlwaysDashed: true });
    }
  } else if (config.preset === 'pyramid_s_abc') {
    faces.push({ keys: ['A', 'B', 'C'], isSideFace: false });
    faces.push({ keys: ['S', 'A', 'B'], isSideFace: true });
    faces.push({ keys: ['S', 'B', 'C'], isSideFace: true });
    faces.push({ keys: ['S', 'C', 'A'], isSideFace: true });

    edges.push({ u: 'A', v: 'B' });
    edges.push({ u: 'B', v: 'C' });
    edges.push({ u: 'C', v: 'A' });
    edges.push({ u: 'S', v: 'A' });
    edges.push({ u: 'S', v: 'B' });
    edges.push({ u: 'S', v: 'C' });
  } else if (config.preset === 'prism_abc') {
    faces.push({ keys: ['A', 'B', 'C'], isSideFace: false });
    faces.push({ keys: ['A1', 'C1', 'B1'], isSideFace: false });
    faces.push({ keys: ['A', 'B', 'B1', 'A1'], isSideFace: true });
    faces.push({ keys: ['B', 'C', 'C1', 'B1'], isSideFace: true });
    faces.push({ keys: ['C', 'A', 'A1', 'C1'], isSideFace: true });

    edges.push({ u: 'A', v: 'B' });
    edges.push({ u: 'B', v: 'C' });
    edges.push({ u: 'C', v: 'A' });
    edges.push({ u: 'A1', v: 'B1' });
    edges.push({ u: 'B1', v: 'C1' });
    edges.push({ u: 'C1', v: 'A1' });
    edges.push({ u: 'A', v: 'A1' });
    edges.push({ u: 'B', v: 'B1' });
    edges.push({ u: 'C', v: 'C1' });
  } else if (config.preset === 'box_abcd') {
    faces.push({ keys: ['A', 'B', 'C', 'D'], isSideFace: false });
    faces.push({ keys: ['A1', 'D1', 'C1', 'B1'], isSideFace: false });
    faces.push({ keys: ['A', 'B', 'B1', 'A1'], isSideFace: true });
    faces.push({ keys: ['B', 'C', 'C1', 'B1'], isSideFace: true });
    faces.push({ keys: ['C', 'D', 'D1', 'C1'], isSideFace: true });
    faces.push({ keys: ['D', 'A', 'A1', 'D1'], isSideFace: true });

    edges.push({ u: 'A', v: 'B' });
    edges.push({ u: 'B', v: 'C' });
    edges.push({ u: 'C', v: 'D' });
    edges.push({ u: 'D', v: 'A' });
    edges.push({ u: 'A1', v: 'B1' });
    edges.push({ u: 'B1', v: 'C1' });
    edges.push({ u: 'C1', v: 'D1' });
    edges.push({ u: 'D1', v: 'A1' });
    edges.push({ u: 'A', v: 'A1' });
    edges.push({ u: 'B', v: 'B1' });
    edges.push({ u: 'C', v: 'C1' });
    edges.push({ u: 'D', v: 'D1' });
  }

  // Đánh giá tính hiển thị (front/back) của từng mặt
  const faceVisibility = faces.map(f => {
    const polygon = f.keys.map(k => pts[k]).filter(Boolean);
    if (polygon.length < 3) return false;
    const a = calc2DSignedArea(polygon);
    // Trong hệ tọa độ màn hình (Y hướng xuống), đa giác hướng ra ngoài có diện tích âm là nhìn thấy
    return a < 0;
  });

  // Phân loại cạnh: Nét đứt (khuất) vs Nét liền (thấy)
  const dashedEdges: EdgeDef[] = [];
  const solidEdges: EdgeDef[] = [];

  for (const edge of edges) {
    if (!pts[edge.u] || !pts[edge.v]) continue;

    if (edge.isAlwaysDashed) {
      dashedEdges.push(edge);
      continue;
    }

    // Tìm các mặt chứa cạnh này
    let frontFacesCount = 0;
    for (let i = 0; i < faces.length; i++) {
      const fKeys = faces[i].keys;
      const hasU = fKeys.includes(edge.u);
      const hasV = fKeys.includes(edge.v);
      if (hasU && hasV) {
        if (faceVisibility[i]) {
          frontFacesCount++;
        }
      }
    }

    // Nếu cạnh thuộc ít nhất 1 mặt nhìn thấy ở phía trước -> Nét liền
    // Nếu cạnh nằm hoàn toàn ở các mặt phía sau -> Nét đứt
    if (frontFacesCount > 0) {
      solidEdges.push(edge);
    } else {
      dashedEdges.push(edge);
    }
  }

  // 1. VẼ CÁC CẠNH NÉT ĐỨT (Cạnh khuất phía sau)
  ctx.save();
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.35;
  for (const e of dashedEdges) {
    drawLine(ctx, pts[e.u], pts[e.v]);
  }
  ctx.restore();

  // 2. VẼ CÁC CẠNH NÉT LIỀN (Cạnh nhìn thấy phía trước)
  ctx.save();
  ctx.setLineDash([]);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.6;
  for (const e of solidEdges) {
    drawLine(ctx, pts[e.u], pts[e.v]);
  }
  ctx.restore();

  // 3. VẼ CÁC ĐIỂM ĐẶC BIỆT (Tâm O, Trung điểm M)
  if (config.showCenterO && pts['O']) {
    drawPoint(ctx, pts['O'].x, pts['O'].y);
  }
  if (config.showMidpointM && pts['M']) {
    drawPoint(ctx, pts['M'].x, pts['M'].y);
  }

  // 4. HIỆU ỨNG TƯƠNG TÁC KÉO THẢ TRÊN CANVAS (Chỉ hiện khi tương tác, ẩn khi xuất Word)
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

  // 5. GHI NHÃN CHỮ CÁC ĐỈNH (Times New Roman in nghiêng, viền trắng chống đè nét)
  ctx.font = 'italic bold 17px "Times New Roman", serif';

  for (const [key, pt] of Object.entries(pts)) {
    if (key === 'O' && !config.showCenterO) continue;
    if (key === 'M' && !config.showMidpointM) continue;

    const vx = pt.x - geoCenterX;
    const vy = pt.y - geoCenterY;
    const len = Math.hypot(vx, vy) || 1;
    const dist = 16;
    const lx = pt.x + (vx / len) * dist;
    const ly = pt.y + (vy / len) * dist;

    ctx.textAlign = vx > 15 ? 'left' : vx < -15 ? 'right' : 'center';
    ctx.textBaseline = vy > 15 ? 'top' : vy < -15 ? 'bottom' : 'middle';

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeText(pt.label, lx, ly);

    ctx.fillStyle = (isInteractive && (config.hoveredPoint === key || config.draggedPoint === key))
      ? '#0d9488'
      : '#000000';
    ctx.fillText(pt.label, lx, ly);
  }

  ctx.restore();
}

/**
 * Vẽ Hệ trục tọa độ không gian Oxyz chuyên dụng cho Toán 12
 */
function renderCoordOxyz(
  ctx: CanvasRenderingContext2D,
  pts: Record<string, ScreenPoint>,
  config: Geometry3DConfig
): void {
  const O = pts['O'];
  const X = pts['X'];
  const Y = pts['Y'];
  const Z = pts['Z'];
  const I = pts['I'];
  const J = pts['J'];
  const K = pts['K'];

  if (!O || !X || !Y || !Z) return;

  // Vẽ các trục Ox, Oy, Oz với mũi tên
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.7;

  drawArrow(ctx, O.x, O.y, X.x, X.y);
  drawArrow(ctx, O.x, O.y, Y.x, Y.y);
  drawArrow(ctx, O.x, O.y, Z.x, Z.y);

  // Vẽ các véc tơ đơn vị i, j, k nổi bật
  if (I && J && K) {
    ctx.strokeStyle = '#0d9488';
    ctx.fillStyle = '#0d9488';
    ctx.lineWidth = 2.4;
    drawArrow(ctx, O.x, O.y, I.x, I.y, 8);
    drawArrow(ctx, O.x, O.y, J.x, J.y, 8);
    drawArrow(ctx, O.x, O.y, K.x, K.y, 8);
  }

  ctx.restore();

  // Vẽ gốc tọa độ O
  drawPoint(ctx, O.x, O.y);

  // Nhãn chữ
  ctx.save();
  ctx.font = 'italic bold 17px "Times New Roman", serif';
  ctx.fillStyle = '#000000';

  // Gốc O
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.strokeText('O', O.x - 14, O.y + 14);
  ctx.fillText('O', O.x - 14, O.y + 14);

  // Trục x
  ctx.strokeText('x', X.x - 14, X.y + 14);
  ctx.fillText('x', X.x - 14, X.y + 14);

  // Trục y
  ctx.strokeText('y', Y.x + 12, Y.y + 4);
  ctx.fillText('y', Y.x + 12, Y.y + 4);

  // Trục z
  ctx.strokeText('z', Z.x + 10, Z.y - 6);
  ctx.fillText('z', Z.x + 10, Z.y - 6);

  // Nhãn véc tơ đơn vị (i, j, k)
  if (I && J && K) {
    ctx.fillStyle = '#0d9488';
    ctx.font = 'italic bold 15px "Times New Roman", serif';
    ctx.strokeText('i', I.x - 14, I.y + 10);
    ctx.fillText('i', I.x - 14, I.y + 10);

    ctx.strokeText('j', J.x + 4, J.y + 16);
    ctx.fillText('j', J.x + 4, J.y + 16);

    ctx.strokeText('k', K.x - 16, K.y);
    ctx.fillText('k', K.x - 16, K.y);
  }

  ctx.restore();
}

function drawArrow(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, headLen = 10): void {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
}

function drawLine(ctx: CanvasRenderingContext2D, p1: { x: number; y: number }, p2: { x: number; y: number }): void {
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

function drawPoint(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath();
  ctx.arc(x, y, 2.8, 0, Math.PI * 2);
  ctx.fillStyle = '#000000';
  ctx.fill();
}
