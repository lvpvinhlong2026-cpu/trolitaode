/**
 * mathDiagramSuggester.ts
 * Module phân tích thông minh câu hỏi đề thi Toán để:
 * 1. Gợi ý hàm số phù hợp, bảng biến thiên, đồ thị Oxy hoặc hình học không gian 3D.
 * 2. Tự động sinh ảnh đồ họa 300 DPI siêu nét trong chớp mắt (Canvas thuần).
 * 3. Hỗ trợ gọi AI Gemini để phân tích sâu các bài toán tham số phức tạp.
 */

import { BBTData, analyzeFromCoeffs, renderBBTToCanvas } from './bbtEngine';
import { GraphConfig, renderGraphToCanvas } from './functionGraphEngine';
import { Geometry3DConfig, renderGeometry3DToCanvas } from './geometry3dEngine';
import { cropCanvasToContent } from './dpiUtils';
import { callGeminiAI } from './gemini';

export type DiagramType = 'bbt' | 'graph' | 'geometry';
export type MathFunctionType = 'cubic' | 'quartic' | 'rational_1_1' | 'rational_2_1';

export interface DiagramSuggestion {
  diagramType: DiagramType;
  targetQuestion: string; // ví dụ: "Câu 1"
  title: string;          // ví dụ: "Bảng biến thiên hàm số bậc ba y = x³ - 3x"
  functionFormula: string; // ví dụ: "y = x^3 - 3x"
  functionType: MathFunctionType | 'geometry';
  reason: string;         // Phân tích sư phạm giải thích vì sao chọn hàm số này
  coeffs: {
    a: number;
    b: number;
    c: number;
    d: number;
    e?: number;
  };
  keyFeatures: string[];  // Các đặc trưng chính (cực trị, khoảng đơn điệu, tiệm cận)
  bbtData?: BBTData;
  graphConfig?: GraphConfig;
  geoConfig?: Geometry3DConfig;
}

/**
 * Phân tích văn bản câu hỏi Toán học và các phương án A, B, C, D để gợi ý hình vẽ chuẩn xác
 */
export function analyzeQuestionForDiagram(
  rawQuestionText: string,
  targetQuestionDefault = 'Câu 1'
): DiagramSuggestion {
  const text = rawQuestionText || '';
  const lower = text.toLowerCase();

  // 1. Nhận diện số thứ tự câu hỏi (nếu có trong chuỗi)
  const qMatch = text.match(/(?:<b>|\*\*|^|\s)Câu\s*(\d+)/i);
  const targetQuestion = qMatch ? `Câu ${qMatch[1]}` : targetQuestionDefault;

  // 2. Xác định thể loại hình vẽ: Bảng biến thiên (BBT), Đồ thị Oxy hay Hình học 3D
  let diagramType: DiagramType = 'bbt';
  if (
    lower.includes('hình chóp') ||
    lower.includes('lăng trụ') ||
    lower.includes('hình hộp') ||
    lower.includes('lập phương') ||
    lower.includes('tứ diện') ||
    lower.includes('mặt cầu') ||
    lower.includes('hình nón') ||
    lower.includes('hình trụ')
  ) {
    diagramType = 'geometry';
  } else if (
    lower.includes('đồ thị') ||
    lower.includes('hình vẽ bên') ||
    lower.includes('parabol') ||
    lower.includes('trục toạ độ') ||
    lower.includes('hệ toạ độ oxy')
  ) {
    diagramType = 'graph';
  } else if (
    lower.includes('bảng biến thiên') ||
    lower.includes('bbt') ||
    lower.includes('bảng xét dấu') ||
    lower.includes('đạo hàm f\'(x)')
  ) {
    diagramType = 'bbt';
  }

  // 3. Phân loại hàm số & suy luận các hệ số phù hợp
  if (diagramType === 'geometry') {
    let preset: Geometry3DConfig['preset'] = 'pyramid_s_abcd';
    let title = 'Hình chóp tứ giác S.ABCD';
    let reason = 'Khối chóp tứ giác đáy hình vuông/chữ nhật, đường cao SA vuông góc đáy';

    if (lower.includes('lăng trụ') || lower.includes('lăng trụ đứng')) {
      preset = 'prism_abc';
      title = 'Hình lăng trụ tam giác ABC.A\'B\'C\'';
      reason = 'Khối lăng trụ tam giác đứng chuẩn sách giáo khoa';
    } else if (lower.includes('chóp tam giác') || lower.includes('s.abc') || lower.includes('tứ diện')) {
      preset = 'pyramid_s_abc';
      title = 'Hình chóp tam giác S.ABC';
      reason = 'Khối chóp tam giác với đỉnh S và đáy tam giác ABC';
    } else if (lower.includes('lập phương') || lower.includes('hình hộp')) {
      preset = 'cube';
      title = 'Hình lập phương ABCD.A\'B\'C\'D\'';
      reason = 'Khối lập phương 6 mặt vuông vức chuẩn không gian';
    }

    const geoConfig: Geometry3DConfig = {
      preset,
      showCenterO: true,
      showMidpointM: true,
      showDiagonals: false,
      rotX: 25,
      rotY: -35,
      zoom: 1.0,
      panX: 0,
      panY: 0
    };

    return {
      diagramType: 'geometry',
      targetQuestion,
      title,
      functionFormula: title,
      functionType: 'geometry',
      reason,
      coeffs: { a: 1, b: 0, c: 0, d: 0 },
      keyFeatures: [
        'Đường cao vuông góc đáy',
        'Nét đứt nét liền phân biệt rõ ràng chuẩn Word 300 DPI',
        'Có sẵn các đỉnh và tâm đáy'
      ],
      geoConfig
    };
  }

  // Nếu là Bảng biến thiên hoặc Đồ thị Oxy:
  // Kiểm tra loại hàm: Phân thức bậc 1/1, Bậc 2/1, Bậc 4 trùng phương, hay Bậc 3
  const isRational11 = lower.includes('tiệm cận đứng') || 
                       lower.includes('tiệm cận ngang') || 
                       lower.includes('nhất biến') || 
                       lower.includes('\\frac{ax+b}') ||
                       lower.includes('\\frac{2x+1}{x-1}') ||
                       lower.includes('r \\setminus') ||
                       lower.includes('r\\setminus');

  const isRational21 = lower.includes('tiệm cận xiên') || 
                       lower.includes('bậc hai trên bậc nhất') ||
                       lower.includes('\\frac{x^2');

  const isQuartic = lower.includes('bậc bốn') || 
                    lower.includes('trùng phương') || 
                    lower.includes('x^4');

  if (isRational11) {
    const a = 2, b = 1, c = 1, d = -1; // y = (2x + 1)/(x - 1)
    const bbtData = analyzeFromCoeffs('rational_1_1', a, b, c, d);
    const graphConfig: GraphConfig = {
      type: 'rational',
      a, b, c, d, e: 0,
      xMin: -5, xMax: 6, yMin: -5, yMax: 7,
      showGrid: false, showTicks: true, tickStep: 1,
      showTickLabels: true, showExtrema: true, showIntersections: true, showAsymptotes: true
    };

    return {
      diagramType,
      targetQuestion,
      title: 'Hàm số nhất biến y = \\frac{2x+1}{x-1}',
      functionFormula: 'y = \\frac{2x + 1}{x - 1}',
      functionType: 'rational_1_1',
      reason: 'Phù hợp với câu hỏi khảo sát tiệm cận đứng x = 1, tiệm cận ngang y = 2 và nghịch biến trên từng khoảng xác định',
      coeffs: { a, b, c, d },
      keyFeatures: [
        'Tập xác định: D = R \\ {1}',
        'Tiệm cận đứng x = 1, Tiệm cận ngang y = 2',
        'Đạo hàm y\' < 0 với mọi x != 1 (nghịch biến trên từng khoảng)'
      ],
      bbtData,
      graphConfig
    };
  }

  if (isRational21) {
    const a = 1, b = -1, c = 1, d = 1, e = -1; // y = (x^2 - x + 1)/(x - 1)
    const bbtData = analyzeFromCoeffs('rational_2_1', a, b, c, d, e);
    const graphConfig: GraphConfig = {
      type: 'rational_2_1',
      a, b, c, d, e,
      xMin: -6, xMax: 6, yMin: -6, yMax: 8,
      showGrid: false, showTicks: true, tickStep: 1,
      showTickLabels: true, showExtrema: true, showIntersections: true, showAsymptotes: true
    };

    return {
      diagramType,
      targetQuestion,
      title: 'Hàm số phân thức bậc hai/bậc nhất y = \\frac{x^2 - x + 1}{x - 1}',
      functionFormula: 'y = \\frac{x^2 - x + 1}{x - 1}',
      functionType: 'rational_2_1',
      reason: 'Phù hợp chương trình Toán 12 mới (tiệm cận xiên y = x và tiệm cận đứng x = 1)',
      coeffs: { a, b, c, d, e },
      keyFeatures: [
        'Tiệm cận đứng x = 1',
        'Tiệm cận xiên y = x',
        'Điểm cực đại và cực tiểu đối xứng qua tâm giao hai tiệm cận'
      ],
      bbtData,
      graphConfig
    };
  }

  if (isQuartic) {
    const a = 1, b = 0, c = -2, d = 0; // y = x^4 - 2x^2
    const bbtData = analyzeFromCoeffs('quartic', a, b, c);
    const graphConfig: GraphConfig = {
      type: 'quartic',
      a, b, c, d, e: 0,
      xMin: -3.5, xMax: 3.5, yMin: -3.5, yMax: 4.5,
      showGrid: false, showTicks: true, tickStep: 1,
      showTickLabels: true, showExtrema: true, showIntersections: true, showAsymptotes: false
    };

    return {
      diagramType,
      targetQuestion,
      title: 'Hàm số bậc bốn trùng phương y = x^4 - 2x^2',
      functionFormula: 'y = x^4 - 2x^2',
      functionType: 'quartic',
      reason: 'Hàm số có 3 điểm cực trị (1 cực đại tại x = 0, 2 cực tiểu tại x = +-1) dạng chữ W đối xứng qua trục Oy',
      coeffs: { a, b, c, d },
      keyFeatures: [
        'Cực đại tại (0; 0)',
        'Cực tiểu tại (-1; -1) và (1; -1)',
        'Đồng biến trên (-1; 0) và (1; +\\infty)'
      ],
      bbtData,
      graphConfig
    };
  }

  // Mặc định: HÀM SỐ BẬC BA y = ax^3 + bx^2 + cx + d
  // Trích xuất các điểm cực trị phổ biến từ đề bài nếu có (-1, 1, 0, 2, 3...)
  let a = 1, b = 0, c = -3, d = 0; // y = x^3 - 3x (Cực đại x = -1, cực tiểu x = 1)
  let reason = 'Hàm số bậc ba cơ bản y = x³ - 3x có 2 điểm cực trị x = -1 và x = 1';

  if (lower.includes('nghịch biến') || lower.includes('đồng biến') || lower.includes('cực trị')) {
    // Nếu trong đề có khoảng (-1; 1) hoặc (1; +\infty)
    if (lower.includes('-1') && lower.includes('1')) {
      a = 1; b = 0; c = -3; d = 0; // y = x^3 - 3x
      reason = 'Phù hợp với các khoảng (-1; 1) và (1; +\\infty): Hàm số đồng biến trên (-inf; -1) và (1; +inf), nghịch biến trên (-1; 1)';
    } else if (lower.includes('0') && lower.includes('2')) {
      a = 1; b = -3; c = 0; d = 2; // y' = 3x^2 - 6x = 0 <=> x = 0, x = 2
      reason = 'Phù hợp với các khoảng chứa điểm cực trị x = 0 và x = 2';
    }
  }

  // Kiểm tra chiều biến thiên (nếu nhánh phải đi xuống hoặc a < 0)
  if (lower.includes('a < 0') || lower.includes('nhánh phải đi xuống')) {
    a = -1;
    c = 3;
    reason += ' (hệ số a < 0, đồ thị nghịch biến ở vô cùng)';
  }

  const bbtData = analyzeFromCoeffs('cubic', a, b, c, d);
  const graphConfig: GraphConfig = {
    type: 'cubic',
    a, b, c, d, e: 0,
    xMin: -4.5, xMax: 4.5, yMin: -4.5, yMax: 5.5,
    showGrid: false, showTicks: true, tickStep: 1,
    showTickLabels: false, showExtrema: true, showIntersections: true, showAsymptotes: false
  };

  return {
    diagramType,
    targetQuestion,
    title: `Hàm số bậc ba y = ${a === 1 ? '' : a === -1 ? '-' : a}x^3 ${c !== 0 ? (c > 0 ? '+ ' + c : '- ' + Math.abs(c)) + 'x' : ''}`,
    functionFormula: `y = ${a === 1 ? '' : a === -1 ? '-' : a}x^3 ${c !== 0 ? (c > 0 ? '+ ' + c : '- ' + Math.abs(c)) + 'x' : ''}`,
    functionType: 'cubic',
    reason,
    coeffs: { a, b, c, d },
    keyFeatures: [
      'Điểm cực đại tại x = -1 (y = 2)',
      'Điểm cực tiểu tại x = 1 (y = -2)',
      'Đồng biến trên (-\u221E; -1) và (1; +\u221E)',
      'Nghịch biến trên (-1; 1)'
    ],
    bbtData,
    graphConfig
  };
}

/**
 * Tự động tạo ảnh độ nét cao 300 DPI (Base64 PNG Data URL) trực tiếp từ thông số gợi ý
 * Chạy siêu nhanh trong DOM mà không cần chờ đợi mạng
 */
export function generateDataUrlFromSuggestion(suggestion: DiagramSuggestion): string {
  if (typeof document === 'undefined') return '';

  try {
    const canvas = document.createElement('canvas');

    if (suggestion.diagramType === 'bbt' && suggestion.bbtData) {
      renderBBTToCanvas(suggestion.bbtData, canvas, 2.4, { fontSizeScale: 1.0 });
      const cropped = cropCanvasToContent(canvas, 6);
      return cropped.toDataURL('image/png');
    }

    if (suggestion.diagramType === 'graph' && suggestion.graphConfig) {
      renderGraphToCanvas(suggestion.graphConfig, canvas, 2.4, { fontSizeScale: 1.0 });
      const cropped = cropCanvasToContent(canvas, 6);
      return cropped.toDataURL('image/png');
    }

    if (suggestion.diagramType === 'geometry' && suggestion.geoConfig) {
      renderGeometry3DToCanvas(suggestion.geoConfig, canvas, 2.4);
      const cropped = cropCanvasToContent(canvas, 6);
      return cropped.toDataURL('image/png');
    }
  } catch (err) {
    console.warn('Lỗi khi vẽ ảnh gợi ý Canvas 300 DPI:', err);
  }

  return '';
}

/**
 * Dùng Gemini AI để phân tích nâng cao những câu hỏi có hàm số ẩn hoặc tham số m
 */
export async function suggestDiagramWithAI(
  questionText: string,
  apiKey: string,
  model = 'auto'
): Promise<DiagramSuggestion | null> {
  if (!apiKey && !localStorage.getItem('gemini_api_key')) {
    return null;
  }

  const prompt = `Bạn là chuyên gia Toán học THPT. Hãy phân tích câu hỏi sau để xác định hình vẽ cần vẽ (Bảng biến thiên hoặc Đồ thị hàm số hoặc Hình học không gian):
---
${questionText}
---
Hãy trả về DUY NHẤT một chuỗi JSON chuẩn (không dùng markdown code blocks) có cấu trúc sau:
{
  "diagramType": "bbt" | "graph" | "geometry",
  "functionType": "cubic" | "quartic" | "rational_1_1" | "rational_2_1" | "geometry",
  "title": "Tên hàm số ngắn gọn",
  "functionFormula": "Công thức dạng LaTeX",
  "reason": "Giải thích ngắn gọn vì sao chọn hàm số này (phù hợp với các phương án của câu)",
  "coeffs": { "a": 1, "b": 0, "c": -3, "d": 0, "e": 0 },
  "keyFeatures": ["đặc trưng 1", "đặc trưng 2"]
}`;

  try {
    const result = await callGeminiAI(prompt, model);
    if (!result) return null;

    // Trích xuất JSON an toàn
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const diagramType: DiagramType = parsed.diagramType || 'bbt';
    const functionType: MathFunctionType | 'geometry' = parsed.functionType || 'cubic';
    const coeffs = parsed.coeffs || { a: 1, b: 0, c: -3, d: 0, e: 0 };

    let bbtData: BBTData | undefined;
    let graphConfig: GraphConfig | undefined;
    let geoConfig: Geometry3DConfig | undefined;

    if (diagramType === 'bbt' && functionType !== 'geometry') {
      bbtData = analyzeFromCoeffs(
        functionType as MathFunctionType,
        coeffs.a,
        coeffs.b || 0,
        coeffs.c || 0,
        coeffs.d || 0,
        coeffs.e || 0
      );
    } else if (diagramType === 'graph' && functionType !== 'geometry') {
      graphConfig = {
        type: functionType === 'rational_1_1' ? 'rational' : (functionType as any),
        a: coeffs.a,
        b: coeffs.b || 0,
        c: coeffs.c || 0,
        d: coeffs.d || 0,
        e: coeffs.e || 0,
        xMin: -5, xMax: 5, yMin: -5, yMax: 5,
        showGrid: false, showTicks: true, tickStep: 1,
        showTickLabels: true, showExtrema: true, showIntersections: true, showAsymptotes: true
      };
    } else if (diagramType === 'geometry') {
      geoConfig = {
        preset: 'pyramid_s_abcd',
        showCenterO: true,
        showMidpointM: true,
        showDiagonals: false,
        rotX: 25, rotY: -35, zoom: 1.0, panX: 0, panY: 0
      };
    }

    return {
      diagramType,
      targetQuestion: 'Câu 1',
      title: parsed.title || 'Hàm số gợi ý',
      functionFormula: parsed.functionFormula || '',
      functionType,
      reason: parsed.reason || 'AI phân tích phù hợp',
      coeffs,
      keyFeatures: parsed.keyFeatures || [],
      bbtData,
      graphConfig,
      geoConfig
    };
  } catch (e) {
    console.warn('Lỗi AI gợi ý hình vẽ:', e);
    return null;
  }
}
