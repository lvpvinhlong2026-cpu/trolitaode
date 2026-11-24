import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  FileText, Download, Copy, Check, ChevronDown, ChevronUp, Sparkles, 
  Settings, Eye, Edit3, Image as ImageIcon, Plus, Trash2, ArrowRight,
  Printer, CheckCircle2, AlertCircle, RefreshCw, Layers, Compass, HelpCircle,
  Type, Ruler, Hash, Filter, RotateCcw, BookOpen, CheckSquare, Sparkle,
  Sliders, ChevronRight as ChevronRightIcon, Lightbulb, SlidersHorizontal, Bookmark,
  TrendingUp, Table as TableIcon, Box, Shuffle
} from 'lucide-react';
import { MultiCodeExamModal } from './MultiCodeExamModal';
import { ExamCV7991 } from '../types/pedagogy';
import { 
  parseExamMarkdownToCV7991, 
  exportExamCV7991ToTableMarkdown, 
  exportExamCV7991ToInlineMarkdown, 
  toggleExamMarkdownFormat 
} from '../utils/examFormatConverter';
import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  WidthType, BorderStyle, AlignmentType, ImageRun, ShadingType 
} from 'docx';
import MathJaxRenderer from './MathJaxRenderer';
import { analyzeFunction, analyzeFromCoeffs, renderBBTToCanvas, BBTData, formatNum, addDpiToBlob } from '../utils/bbtEngine';
import { renderGraphToCanvas, GraphConfig, evalGraphFunction, formatNumDisplay, getIntervalMinMax } from '../utils/functionGraphEngine';
import { renderGeometry3DToCanvas, Geometry3DConfig } from '../utils/geometry3dEngine';
import { callGeminiAI } from '../utils/gemini';
import { KNTT_CURRICULUM } from '../utils/curriculumData';
import { parseTextAndMathRuns, generateAutoDiagramForPlaceholder, dataUrlToBytes } from '../utils/docxExamBuilder';
import { IntegratedDiagramModal, DiagramToolTab } from './IntegratedDiagramModal';
import { DiagramSuggestion } from '../utils/mathDiagramSuggester';

// =========================================================================
// INTERFACES & CẤU TRÚC DỮ LIỆU ĐỘNG THEO CV 7991
// =========================================================================

export type CognitiveLevel = 'NB' | 'TH' | 'VD' | 'VDC';

export interface Part2SubItemDetail {
  topic?: string;
  requirement?: string;
}

export interface Part2Question {
  id: string;
  stemType?: string;      // ID gợi ý ngữ cảnh từ danh mục STEM_PRESETS hoặc 'custom'
  stemPrompt?: string;    // Nội dung tóm tắt câu dẫn (VD: Cho bảng biến thiên hàm số bậc ba...)
  isMultiTopic?: boolean; // Cho phép phân hóa từng ý a, b, c, d theo các chủ đề / phân môn khác nhau
  a: CognitiveLevel;
  b: CognitiveLevel;
  c: CognitiveLevel;
  d: CognitiveLevel;
  subItems?: {
    a?: Part2SubItemDetail;
    b?: Part2SubItemDetail;
    c?: Part2SubItemDetail;
    d?: Part2SubItemDetail;
  };
}

export interface Part1Question {
  id: string;
  level: CognitiveLevel;
  prompt?: string;
  presetId?: string;
}

export interface Part3Question {
  id: string;
  level: CognitiveLevel;
  prompt?: string;
  presetId?: string;
}

export interface SingleQuestionPreset {
  id: string;
  grade: 10 | 12 | 'both';
  category: string;
  name: string;
  level: CognitiveLevel;
  prompt: string;
}

export interface StemPreset {
  id: string;
  grade: 10 | 12 | 'both';
  category: string;
  name: string;
  stemPrompt: string;
  isMultiTopic?: boolean;
  suggestedLevels: { a: CognitiveLevel; b: CognitiveLevel; c: CognitiveLevel; d: CognitiveLevel };
  items: {
    a: { topic: string; requirement: string };
    b: { topic: string; requirement: string };
    c: { topic: string; requirement: string };
    d: { topic: string; requirement: string };
  };
}

// =========================================================================
// DANH MỤC GỢI Ý CÂU DẪN MẪU CHUẨN GDPT 2018 (STEM PRESETS CATALOG)
// =========================================================================
export const STEM_PRESETS: StemPreset[] = [
  // --- TOÁN 12 ---
  {
    id: 'p2_12_bbt_bac3',
    grade: 12,
    category: 'Khảo sát hàm số & Đồ thị',
    name: 'Bảng biến thiên / Đồ thị hàm bậc ba $y = ax^3 + bx^2 + cx + d$',
    stemPrompt: 'Cho hàm số bậc ba $y = f(x) = ax^3 + bx^2 + cx + d$ có bảng biến thiên (hoặc đồ thị) như hình vẽ.',
    isMultiTopic: false,
    suggestedLevels: { a: 'NB', b: 'TH', c: 'VD', d: 'VDC' },
    items: {
      a: { topic: 'Đơn điệu & Cực trị hàm số', requirement: 'Lệnh hỏi a): Xác định tập xác định và các khoảng đồng biến, nghịch biến của hàm số.' },
      b: { topic: 'Cực trị hàm số & Điểm cực trị', requirement: 'Lệnh hỏi b): Tìm tọa độ điểm cực đại, điểm cực tiểu và tính giá trị biểu thức cực trị $y_{CĐ} + 2y_{CT}$.' },
      c: { topic: 'Tương giao & Tiếp tuyến đồ thị', requirement: 'Lệnh hỏi c): Viết phương trình tiếp tuyến của đồ thị hoặc biện luận số nghiệm phương trình $f(x) = m$.' },
      d: { topic: 'Hàm hợp & Tham số nâng cao', requirement: 'Lệnh hỏi d): Khảo sát số điểm cực trị của hàm hợp $g(x) = f(x^2 - 2x)$ hoặc tìm $m$ để phương trình có 4 nghiệm.' }
    }
  },
  {
    id: 'p2_12_phan_thuc',
    grade: 12,
    category: 'Khảo sát hàm số & Tiệm cận',
    name: 'Đồ thị hàm phân thức $y = \\frac{ax+b}{cx+d}$ & Tiệm cận',
    stemPrompt: 'Cho hàm số nhất biến $y = f(x) = \\frac{ax+b}{cx+d}$ $(ad - bc \\neq 0)$ có đồ thị $(C)$.',
    isMultiTopic: false,
    suggestedLevels: { a: 'NB', b: 'TH', c: 'VD', d: 'VDC' },
    items: {
      a: { topic: 'Đường tiệm cận', requirement: 'Lệnh hỏi a): Xác định phương trình đường tiệm cận đứng và tiệm cận ngang của đồ thị hàm số.' },
      b: { topic: 'Tâm đối xứng & Giao điểm', requirement: 'Lệnh hỏi b): Tìm tọa độ giao điểm của hai đường tiệm cận (tâm đối xứng) và giao điểm với trục tọa độ.' },
      c: { topic: 'Giá trị lớn nhất, nhỏ nhất', requirement: 'Lệnh hỏi c): Tìm GTLN và GTNN của hàm số trên một đoạn $[p; q]$ cho trước.' },
      d: { topic: 'Tiếp tuyến & Cực trị khoảng cách', requirement: 'Lệnh hỏi d): Tiếp tuyến tại điểm $M \\in (C)$ tạo với 2 tiệm cận một tam giác có chu vi nhỏ nhất hoặc diện tích không đổi.' }
    }
  },
  {
    id: 'p2_12_kinh_te_toi_uu',
    grade: 12,
    category: 'Ứng dụng thực tế & Đa chủ đề',
    name: 'Tối ưu hóa kinh tế (Chi phí - Doanh thu - Lợi nhuận) [Đa chủ đề]',
    stemPrompt: 'Một doanh nghiệp sản xuất một loại sản phẩm với hàm tổng chi phí $C(x)$ và hàm cầu $p(x)$ (đơn vị: triệu đồng), trong đó $x$ là số lượng sản phẩm.',
    isMultiTopic: true,
    suggestedLevels: { a: 'NB', b: 'TH', c: 'VD', d: 'VDC' },
    items: {
      a: { topic: 'Ứng dụng đạo hàm: Chi phí cố định', requirement: 'Lệnh hỏi a): Xác định chi phí cố định ban đầu khi xưởng chưa vận hành sản xuất ($x = 0$).' },
      b: { topic: 'Ứng dụng đạo hàm: Chi phí biên & Doanh thu biên', requirement: 'Lệnh hỏi b): Lập biểu thức hàm doanh thu $R(x) = x \\cdot p(x)$ và tính chi phí biên $C\'(x_0)$.' },
      c: { topic: 'Khảo sát hàm số: Tối ưu lợi nhuận', requirement: 'Lệnh hỏi c): Tìm quy mô sản lượng $x$ để hàm lợi nhuận $P(x) = R(x) - C(x)$ đạt giá trị lớn nhất.' },
      d: { topic: 'Tích phân / Xác suất: Tổng chi phí tích lũy hoặc Rủi ro', requirement: 'Lệnh hỏi d): Ứng dụng tích phân tính tổng chi phí sản xuất tích lũy $\\int_0^T C\'(t)dt$ hoặc thời điểm hòa vốn.' }
    }
  },
  {
    id: 'p2_12_chuyen_dong_vat_ly',
    grade: 12,
    category: 'Ứng dụng thực tế & Đa chủ đề',
    name: 'Chuyển động biến đổi & Quãng đường (Đạo hàm + Tích phân) [Đa chủ đề]',
    stemPrompt: 'Một ô tô đang chạy với vận tốc $v_0$ ($m/s$) thì người lái xe đạp phanh và chuyển động chậm dần đều với gia tốc $a(t)$ ($m/s^2$).',
    isMultiTopic: true,
    suggestedLevels: { a: 'NB', b: 'TH', c: 'VD', d: 'VDC' },
    items: {
      a: { topic: 'Đạo hàm: Vận tốc ban đầu & Thời điểm', requirement: 'Lệnh hỏi a): Xác định vận tốc ban đầu và tính chất biến thiên của vận tốc theo thời gian.' },
      b: { topic: 'Đạo hàm: Thời gian dừng lại & Gia tốc', requirement: 'Lệnh hỏi b): Xác định thời điểm $t_1$ xe dừng hẳn ($v(t_1) = 0$) và tính gia tốc tại thời điểm đó.' },
      c: { topic: 'Tích phân: Quãng đường hãm phanh', requirement: 'Lệnh hỏi c): Ứng dụng tích phân $S = \\int_0^{t_1} v(t)dt$ để tính quãng đường xe di chuyển từ lúc phanh đến khi dừng lại.' },
      d: { topic: 'Bài toán an toàn giao thông / Năng lượng', requirement: 'Lệnh hỏi d): Đánh giá điều kiện an toàn khi khoảng cách tới chướng ngại vật là $d$ mét hoặc công sinh ra của lực hãm.' }
    }
  },
  {
    id: 'p2_12_oxyz_tram_radar',
    grade: 12,
    category: 'Hình học & Tọa độ Oxyz',
    name: 'Mô hình không gian Oxyz: Trạm radar & Đường bay',
    stemPrompt: 'Trong không gian với hệ tọa độ $Oxyz$ (đơn vị km), một trạm radar đặt tại điểm $A(x_A; y_A; z_A)$ và đường bay của máy bay là đường thẳng $d$.',
    isMultiTopic: false,
    suggestedLevels: { a: 'NB', b: 'TH', c: 'VD', d: 'VDC' },
    items: {
      a: { topic: 'Tọa độ điểm & Vectơ chỉ phương', requirement: 'Lệnh hỏi a): Nhận biết tọa độ trạm radar và một vectơ chỉ phương của đường bay máy bay.' },
      b: { topic: 'Khoảng cách điểm đến đường thẳng', requirement: 'Lệnh hỏi b): Tính khoảng cách từ trạm radar $A$ đến đường bay của máy bay tại thời điểm ban đầu.' },
      c: { topic: 'Vị trí gần nhất & Tiếp xúc vùng phủ sóng', requirement: 'Lệnh hỏi c): Tìm tọa độ điểm trên đường bay mà tại đó máy bay ở vị trí gần trạm radar nhất.' },
      d: { topic: 'Mặt cầu / Hình nón phủ sóng & Vận tốc', requirement: 'Lệnh hỏi d): Giả sử radar quét trong vùng mặt cầu bán kính $R$, tính thời gian máy bay nằm trong vùng phát sóng.' }
    }
  },
  {
    id: 'p2_12_xac_suat_dieu_kien',
    grade: 12,
    category: 'Xác suất & Thống kê',
    name: 'Xác suất có điều kiện & Công thức Bayes (Xét nghiệm / KCS sản phẩm)',
    stemPrompt: 'Một nhà máy sản xuất linh kiện điện tử với tỉ lệ phế phẩm là $p\\%$. Hệ thống cảm biến kiểm tra tự động có độ chính xác $q_1\\%$ đối với sản phẩm lỗi và $q_2\\%$ đối với chuẩn phẩm.',
    isMultiTopic: false,
    suggestedLevels: { a: 'NB', b: 'TH', c: 'VD', d: 'VDC' },
    items: {
      a: { topic: 'Biến cố & Xác suất cơ bản', requirement: 'Lệnh hỏi a): Xác định không gian mẫu và tính xác suất lấy ngẫu nhiên 1 sản phẩm là phế phẩm.' },
      b: { topic: 'Xác suất toàn phần', requirement: 'Lệnh hỏi b): Áp dụng công thức xác suất toàn phần tính xác suất hệ thống cảm biến báo tín hiệu phế phẩm.' },
      c: { topic: 'Công thức Bayes', requirement: 'Lệnh hỏi c): Tính xác suất một sản phẩm thực sự bị hỏng biết rằng cảm biến đã báo phát hiện phế phẩm.' },
      d: { topic: 'Biến ngẫu nhiên rời rạc & Chi phí rủi ro', requirement: 'Lệnh hỏi d): Trong một lô hàng $N$ sản phẩm, tính số lượng sản phẩm lỗi kỳ vọng hoặc chi phí tổn thất trung bình.' }
    }
  },

  // --- TOÁN 10 ---
  {
    id: 'p2_10_parabol_thuc_te',
    grade: 10,
    category: 'Hàm số bậc hai & Parabol',
    name: 'Cổng vòm Parabol & Khảo sát hàm bậc hai',
    stemPrompt: 'Một cổng chào hình parabol có chiều rộng mặt đất $AB = 8$ m và chiều cao cực đại $h = 4$ m.',
    isMultiTopic: false,
    suggestedLevels: { a: 'NB', b: 'TH', c: 'VD', d: 'VDC' },
    items: {
      a: { topic: 'Hàm số bậc hai: Đỉnh & Trục đối xứng', requirement: 'Lệnh hỏi a): Thiết lập hệ trục tọa độ $Oxy$ và xác định tọa độ đỉnh $I$, trục đối xứng của parabol.' },
      b: { topic: 'Hàm số bậc hai: Phương trình Parabol', requirement: 'Lệnh hỏi b): Xác định công thức hàm số bậc hai $y = ax^2 + bx + c$ biểu diễn hình dáng cổng vòm.' },
      c: { topic: 'Tương giao & Bất đẳng thức thực tế', requirement: 'Lệnh hỏi c): Tính chiều cao của cổng tại vị trí cách chân cổng 2 m để kiểm tra phương tiện lưu thông an toàn.' },
      d: { topic: 'Tối ưu hóa diện tích khung quảng cáo', requirement: 'Lệnh hỏi d): Một tấm biển quảng cáo hình chữ nhật nội tiếp bên trong cổng, tìm kích thước để diện tích lớn nhất.' }
    }
  },
  {
    id: 'p2_10_quy_hoach_tuyen_tinh',
    grade: 10,
    category: 'Bất phương trình & Quy hoạch tuyến tính',
    name: 'Hệ bất phương trình bậc nhất hai ẩn & Kế hoạch sản xuất',
    stemPrompt: 'Một cơ sở sản xuất cần lập kế hoạch sản xuất hai loại bánh A và B với định mức nguyên liệu bột mì, đường và thời gian làm việc có giới hạn.',
    isMultiTopic: false,
    suggestedLevels: { a: 'NB', b: 'TH', c: 'VD', d: 'VDC' },
    items: {
      a: { topic: 'Hệ bất phương trình bậc nhất hai ẩn', requirement: 'Lệnh hỏi a): Lập hệ bất phương trình bậc nhất hai ẩn biểu diễn các điều kiện ràng buộc về nguyên liệu và thời gian.' },
      b: { topic: 'Miền nghiệm hình học', requirement: 'Lệnh hỏi b): Xác định miền nghiệm của hệ bất phương trình trên mặt phẳng tọa độ $Oxy$ (miền đa giác).' },
      c: { topic: 'Tọa độ đỉnh đa giác', requirement: 'Lệnh hỏi c): Tìm tọa độ các đỉnh của miền đa giác nghiệm.' },
      d: { topic: 'Tối ưu hóa lợi nhuận (GTLN hàm mục tiêu)', requirement: 'Lệnh hỏi d): Thiết lập hàm mục tiêu lợi nhuận $F(x, y) = ax + by$ và tìm cặp $(x; y)$ để lợi nhuận đạt mức tối đa.' }
    }
  },
  {
    id: 'p2_10_vecto_he_thuc_luong',
    grade: 10,
    category: 'Vectơ & Hệ thức lượng tam giác',
    name: 'Hợp lực kéo sà lan & Hệ thức lượng tam giác [Đa chủ đề]',
    stemPrompt: 'Hai tàu kéo cùng tác dụng lực $\\vec{F}_1$ và $\\vec{F}_2$ lên một sà lan, góc giữa hai lực kéo là $\\alpha = 60^\\circ$.',
    isMultiTopic: true,
    suggestedLevels: { a: 'NB', b: 'TH', c: 'VD', d: 'VDC' },
    items: {
      a: { topic: 'Vectơ: Quy tắc hình bình hành', requirement: 'Lệnh hỏi a): Nhận biết vectơ tổng hợp lực $\\vec{F} = \\vec{F}_1 + \\vec{F}_2$ theo quy tắc hình bình hành.' },
      b: { topic: 'Tích vô hướng & Độ lớn hợp lực', requirement: 'Lệnh hỏi b): Tính độ lớn hợp lực $|\\vec{F}|$ theo công thức $|\\vec{F}|^2 = F_1^2 + F_2^2 + 2F_1 F_2 \\cos \\alpha$.' },
      c: { topic: 'Hệ thức lượng trong tam giác: Góc lệch', requirement: 'Lệnh hỏi c): Áp dụng định lý sin hoặc côsin tính góc lệch giữa hướng chuyển động của sà lan so với hướng kéo của tàu thứ nhất.' },
      d: { topic: 'Vận dụng cao: Tối ưu công suất kéo', requirement: 'Lệnh hỏi d): Cho trước độ lớn lực $F_1$, tìm góc $\\alpha$ để lực kéo của tàu thứ hai là nhỏ nhất mà sà lan vẫn chuyển động thẳng.' }
    }
  }
];

// =========================================================================
// DANH MỤC GỢI Ý DẠNG BÀI PHẦN I (TRẮC NGHIỆM 4 LỰA CHỌN)
// =========================================================================
export const PART1_PRESETS: SingleQuestionPreset[] = [
  // TOÁN 12 - KHẢO SÁT HÀM SỐ
  {
    id: 'p1_12_dong_bien_bbt',
    grade: 12,
    category: 'Khảo sát hàm số & Đồ thị',
    name: 'Đơn điệu: Khoảng đồng biến, nghịch biến từ BBT/đồ thị',
    level: 'NB',
    prompt: 'Cho bảng biến thiên (hoặc đồ thị) của hàm số $y=f(x)$, xác định các khoảng đồng biến hoặc nghịch biến của hàm số.'
  },
  {
    id: 'p1_12_cuc_tri_diem',
    grade: 12,
    category: 'Khảo sát hàm số & Đồ thị',
    name: 'Cực trị: Điểm cực đại, cực tiểu của hàm số/đồ thị',
    level: 'NB',
    prompt: 'Tìm toạ độ điểm cực đại, điểm cực tiểu của đồ thị hàm số $y=f(x)$ thông qua bảng biến thiên hoặc đồ thị cho trước.'
  },
  {
    id: 'p1_12_tiem_can',
    grade: 12,
    category: 'Khảo sát hàm số & Đồ thị',
    name: 'Tiệm cận: Tiệm cận đứng và tiệm cận ngang',
    level: 'NB',
    prompt: 'Xác định phương trình đường tiệm cận đứng, tiệm cận ngang của đồ thị hàm số nhất biến $y=\\frac{ax+b}{cx+d}$.'
  },
  {
    id: 'p1_12_max_min_doan',
    grade: 12,
    category: 'Khảo sát hàm số & Đồ thị',
    name: 'GTLN - GTNN: Giá trị lớn nhất, nhỏ nhất trên đoạn',
    level: 'TH',
    prompt: 'Tìm giá trị lớn nhất ($M$) và giá trị nhỏ nhất ($m$) của hàm số trên một đoạn $[a; b]$ cho trước.'
  },
  {
    id: 'p1_12_tuong_giao_fx_m',
    grade: 12,
    category: 'Khảo sát hàm số & Đồ thị',
    name: 'Tương giao: Biện luận số nghiệm phương trình f(x) = m',
    level: 'TH',
    prompt: 'Dựa vào bảng biến thiên hoặc đồ thị của hàm số $y=f(x)$, biện luận số nghiệm của phương trình $f(x)=m$.'
  },
  {
    id: 'p1_12_tiep_tuyen',
    grade: 12,
    category: 'Khảo sát hàm số & Đồ thị',
    name: 'Tiếp tuyến: Phương trình tiếp tuyến tại một điểm',
    level: 'TH',
    prompt: 'Viết phương trình tiếp tuyến của đồ thị hàm số tại điểm có hoành độ $x_0$ cho trước.'
  },
  {
    id: 'p1_12_tham_so_don_dieu',
    grade: 12,
    category: 'Khảo sát hàm số & Đồ thị',
    name: 'Tham số m: Điều kiện hàm số đơn điệu trên khoảng',
    level: 'VD',
    prompt: 'Tìm tất cả các giá trị thực của tham số $m$ để hàm số bậc ba đồng biến (hoặc nghịch biến) trên khoảng xác định.'
  },
  // TOÁN 12 - TOẠ ĐỘ OXYZ
  {
    id: 'p1_12_oxyz_toa_do',
    grade: 12,
    category: 'Toạ độ Oxyz',
    name: 'Oxyz: Toạ độ điểm, vectơ, trung điểm, trọng tâm',
    level: 'NB',
    prompt: 'Trong không gian $Oxyz$, xác định toạ độ điểm, toạ độ trung điểm đoạn thẳng hoặc toạ độ vectơ $\\vec{u} = 2\\vec{i} - 3\\vec{j} + \\vec{k}$.'
  },
  {
    id: 'p1_12_oxyz_mat_cau_tam_bk',
    grade: 12,
    category: 'Toạ độ Oxyz',
    name: 'Oxyz: Toạ độ tâm và bán kính mặt cầu',
    level: 'NB',
    prompt: 'Trong không gian $Oxyz$, tìm toạ độ tâm $I$ và bán kính $R$ của mặt cầu $(S): (x-a)^2 + (y-b)^2 + (z-c)^2 = R^2$.'
  },
  {
    id: 'p1_12_oxyz_tich_vo_huong',
    grade: 12,
    category: 'Toạ độ Oxyz',
    name: 'Oxyz: Tích vô hướng và góc giữa hai vectơ',
    level: 'TH',
    prompt: 'Tính tích vô hướng $\\vec{a} \\cdot \\vec{b}$, cosin góc giữa hai vectơ hoặc điều kiện hai vectơ vuông góc trong $Oxyz$.'
  },
  {
    id: 'p1_12_oxyz_pt_mat_phang',
    grade: 12,
    category: 'Toạ độ Oxyz',
    name: 'Oxyz: Viết phương trình mặt phẳng cơ bản',
    level: 'TH',
    prompt: 'Viết phương trình mặt phẳng đi qua một điểm $M$ và có vectơ pháp tuyến $\\vec{n}$ hoặc đi qua 3 điểm toạ độ.'
  },
  {
    id: 'p1_12_oxyz_khoang_cach_diem_mp',
    grade: 12,
    category: 'Toạ độ Oxyz',
    name: 'Oxyz: Tính khoảng cách từ điểm đến mặt phẳng',
    level: 'VD',
    prompt: 'Tính khoảng cách từ điểm $M(x_0; y_0; z_0)$ đến mặt phẳng $(\\alpha): Ax + By + Cz + D = 0$.'
  },
  // TOÁN 12 - NGUYÊN HÀM & TÍCH PHÂN
  {
    id: 'p1_12_nguyen_ham_co_ban',
    grade: 12,
    category: 'Nguyên hàm & Tích phân',
    name: 'Nguyên hàm: Bảng nguyên hàm hàm số cơ bản',
    level: 'NB',
    prompt: 'Tìm họ nguyên hàm $\\int f(x) dx$ của các hàm số luỹ thừa, hàm lượng giác cơ bản hoặc hàm mũ.'
  },
  {
    id: 'p1_12_tich_phan_co_ban',
    grade: 12,
    category: 'Nguyên hàm & Tích phân',
    name: 'Tích phân: Áp dụng công thức Newton-Leibniz',
    level: 'TH',
    prompt: 'Tính giá trị tích phân xác định cơ bản $\\int_a^b f(x)dx$ hoặc sử dụng tính chất tích phân cơ bản.'
  },
  {
    id: 'p1_12_dien_tich_hinh_phang',
    grade: 12,
    category: 'Nguyên hàm & Tích phân',
    name: 'Ứng dụng: Diện tích hình phẳng giới hạn bởi đồ thị',
    level: 'VD',
    prompt: 'Tính diện tích hình phẳng giới hạn bởi đồ thị hàm số $y=f(x)$, trục hoành và hai đường thẳng $x=a, x=b$.'
  },
  // TOÁN 12 - XÁC SUẤT
  {
    id: 'p1_12_bien_co_doc_lap',
    grade: 12,
    category: 'Xác suất & Thống kê',
    name: 'Xác suất: Biến cố độc lập & Quy tắc nhân',
    level: 'NB',
    prompt: 'Cho hai biến cố độc lập $A$ và $B$ với xác suất $P(A), P(B)$, tính xác suất của biến cố giao $P(AB)$.'
  },
  {
    id: 'p1_12_xs_dieu_kien',
    grade: 12,
    category: 'Xác suất & Thống kê',
    name: 'Xác suất: Xác suất có điều kiện P(A|B)',
    level: 'TH',
    prompt: 'Tính xác suất có điều kiện $P(A|B) = \\frac{P(AB)}{P(B)}$ từ bảng thống kê hoặc dữ kiện bài toán.'
  }
];

// =========================================================================
// DANH MỤC GỢI Ý DẠNG BÀI PHẦN III (TRẮC NGHIỆM TRẢ LỜI NGẮN)
// =========================================================================
export const PART3_PRESETS: SingleQuestionPreset[] = [
  {
    id: 'p3_12_khoang_cach_cuc_tri',
    grade: 12,
    category: 'Khảo sát hàm số & Đồ thị',
    name: 'Cực trị: Tính khoảng cách giữa hai điểm cực trị',
    level: 'TH',
    prompt: 'Cho hàm số bậc ba $y=ax^3+bx^2+cx+d$. Tính khoảng cách giữa hai điểm cực trị của đồ thị hàm số.'
  },
  {
    id: 'p3_12_max_min_ung_dung',
    grade: 12,
    category: 'Khảo sát hàm số & Đồ thị',
    name: 'GTLN - GTNN: Giá trị biểu thức cực trị hoặc GTLN',
    level: 'TH',
    prompt: 'Tìm giá trị lớn nhất $M$ của hàm số $y=f(x)$ trên đoạn $[a; b]$. Điền kết quả là một số.'
  },
  {
    id: 'p3_12_kinh_te_toi_uu_loi_nhuan',
    grade: 12,
    category: 'Ứng dụng thực tế',
    name: 'Thực tế: Tìm mức sản lượng tối ưu hóa lợi nhuận',
    level: 'VD',
    prompt: 'Bài toán kinh tế: Một doanh nghiệp có hàm tổng chi phí $C(x)$ và giá bán $p(x)$. Tìm số lượng sản phẩm $x$ để lợi nhuận đạt giá trị lớn nhất.'
  },
  {
    id: 'p3_12_the_tich_hop_toi_uu',
    grade: 12,
    category: 'Ứng dụng thực tế',
    name: 'Thực tế: Tìm thể tích lớn nhất của hình hộp/thùng chứa',
    level: 'VD',
    prompt: 'Một miếng tôn hình chữ nhật kích thước $a \\times b$ được cắt ở 4 góc để gập thành hộp không nắp. Tính thể tích lớn nhất của chiếc hộp.'
  },
  {
    id: 'p3_12_chuyen_dong_quang_duong',
    grade: 12,
    category: 'Ứng dụng thực tế',
    name: 'Thực tế: Tính quãng đường di chuyển bằng tích phân',
    level: 'VD',
    prompt: 'Một ô tô đang chạy với vận tốc $v_0$ thì hãm phanh với gia tốc $a(t)$. Tính quãng đường ô tô đi được từ lúc đạp phanh đến khi dừng hẳn.'
  },
  {
    id: 'p3_12_oxyz_khoang_cach_thuc_te',
    grade: 12,
    category: 'Toạ độ Oxyz',
    name: 'Oxyz: Khoảng cách ngắn nhất trong mô hình không gian',
    level: 'VD',
    prompt: 'Trong không gian $Oxyz$ mô phỏng toạ độ ngọn hải đăng và đường đi của tàu thuỷ. Tính khoảng cách ngắn nhất từ tàu đến hải đăng.'
  },
  {
    id: 'p3_12_oxyz_the_tich_khoi',
    grade: 12,
    category: 'Toạ độ Oxyz',
    name: 'Oxyz: Tính thể tích khối tứ diện trong không gian',
    level: 'TH',
    prompt: 'Trong không gian $Oxyz$, cho 4 điểm $A, B, C, D$. Tính thể tích của khối tứ diện $ABCD$.'
  },
  {
    id: 'p3_12_tich_phan_dien_tich_thuc_te',
    grade: 12,
    category: 'Nguyên hàm & Tích phân',
    name: 'Tích phân: Tính diện tích mặt cắt / bồn hoa hình elip-parabol',
    level: 'VD',
    prompt: 'Ứng dụng tích phân tính diện tích mảnh đất hình cong giới hạn bởi đường cong parabol và đường thẳng (kết quả làm tròn đến hàng phần mười).'
  },
  {
    id: 'p3_12_bayes_xac_suat_y_te',
    grade: 12,
    category: 'Xác suất & Thống kê',
    name: 'Xác suất: Tính xác suất bằng công thức Bayes trong y tế',
    level: 'VDC',
    prompt: 'Một xét nghiệm y tế có độ nhạy $98\\%$ và độ đặc hiệu $95\\%$, tỉ lệ người mắc bệnh trong cộng đồng là $1\\%$. Tính xác suất một người thực sự mắc bệnh khi có kết quả dương tính.'
  },
  {
    id: 'p3_12_tham_so_cuc_tri_khoang_cach',
    grade: 12,
    category: 'Vận dụng cao',
    name: 'Vận dụng cao: Tìm m để tam giác tạo bởi cực trị có diện tích S',
    level: 'VDC',
    prompt: 'Tìm tất cả giá trị thực của tham số $m$ để đồ thị hàm số có 3 điểm cực trị tạo thành một tam giác có diện tích bằng $S_0$.'
  }
];

export interface MatrixTopicRow {
  id: string;
  topic: string;
  // Phần I: Trắc nghiệm 4 lựa chọn (12 câu, mỗi câu 0.25đ = 3.0đ)
  p1_nb: number;
  p1_th: number;
  p1_vd: number;
  p1_vdc: number;
  p1_questions?: Part1Question[];
  // Phần II: Danh sách các câu Đúng / Sai (mỗi câu 1.0đ có 4 ý a, b, c, d với mức độ riêng)
  p2_questions: Part2Question[];
  // Phần III: Trả lời ngắn (6 câu, mỗi câu 0.5đ = 3.0đ)
  p3_nb: number;
  p3_th: number;
  p3_vd: number;
  p3_vdc: number;
  p3_questions?: Part3Question[];
}

export interface SpecItem {
  id: string;
  topic: string;
  unit: string;
  questionRef: string;
  level: CognitiveLevel;
  requirement: string;
  part?: 'P1' | 'P2' | 'P3';
}

interface Props {
  apiKey: string;
  model: string;
  grade?: 10 | 12;
}

// =========================================================================
// MẪU DỮ LIỆU MẶC ĐỊNH CHO TOÁN 12 THEO CHUẨN BGDĐT & CV 7991
// =========================================================================

function getDefaultMatrixRows12(): MatrixTopicRow[] {
  return [
    {
      id: 'm1',
      topic: 'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số',
      p1_nb: 3, p1_th: 2, p1_vd: 1, p1_vdc: 0,
      p1_questions: [
        { id: 'q12_p1_1', level: 'NB', prompt: 'Nhận biết khoảng đồng biến, nghịch biến của hàm số từ bảng biến thiên hoặc đồ thị' },
        { id: 'q12_p1_2', level: 'NB', prompt: 'Tìm toạ độ điểm cực đại, điểm cực tiểu của đồ thị hàm số $y=f(x)$' },
        { id: 'q12_p1_3', level: 'NB', prompt: 'Xác định phương trình đường tiệm cận đứng, tiệm cận ngang của đồ thị hàm phân thức $y=\\frac{ax+b}{cx+d}$' },
        { id: 'q12_p1_4', level: 'TH', prompt: 'Tìm giá trị lớn nhất, giá trị nhỏ nhất của hàm số trên một đoạn $[a; b]$ cho trước' },
        { id: 'q12_p1_5', level: 'TH', prompt: 'Biện luận số nghiệm của phương trình $f(x)=m$ dựa vào đồ thị hoặc bảng biến thiên' },
        { id: 'q12_p1_6', level: 'VD', prompt: 'Tìm tham số $m$ để hàm số bậc ba đồng biến hoặc nghịch biến trên khoảng xác định' }
      ],
      p2_questions: [
        {
          id: 'q12_1',
          stemType: 'p2_12_bbt_bac3',
          stemPrompt: 'Cho hàm số bậc ba $y = f(x) = ax^3 + bx^2 + cx + d$ có bảng biến thiên như hình vẽ.',
          isMultiTopic: false,
          a: 'NB', b: 'TH', c: 'TH', d: 'VD',
          subItems: {
            a: { topic: 'Đơn điệu & Cực trị hàm số', requirement: 'Lệnh hỏi a): Xác định tập xác định và khoảng đồng biến, nghịch biến của hàm số.' },
            b: { topic: 'Cực trị hàm số', requirement: 'Lệnh hỏi b): Tìm tọa độ điểm cực đại, điểm cực tiểu của đồ thị hàm số.' },
            c: { topic: 'Tương giao đồ thị', requirement: 'Lệnh hỏi c): Biện luận số nghiệm của phương trình $f(x) = m$.' },
            d: { topic: 'Tiếp tuyến đồ thị', requirement: 'Lệnh hỏi d): Viết phương trình tiếp tuyến của đồ thị hàm số tại điểm có hoành độ cho trước.' }
          }
        },
        {
          id: 'q12_2',
          stemType: 'p2_12_kinh_te_toi_uu',
          stemPrompt: 'Bài toán thực tế: Một doanh nghiệp sản xuất sản phẩm với hàm chi phí $C(x)$ và hàm doanh thu $R(x)$.',
          isMultiTopic: true,
          a: 'NB', b: 'TH', c: 'VD', d: 'VDC',
          subItems: {
            a: { topic: 'Ứng dụng đạo hàm: Chi phí cố định', requirement: 'Lệnh hỏi a): Xác định chi phí cố định ban đầu khi xưởng chưa vận hành sản xuất.' },
            b: { topic: 'Ứng dụng đạo hàm: Chi phí biên', requirement: 'Lệnh hỏi b): Tính chi phí biên $C\'(x)$ và doanh thu biên $R\'(x)$ tại mức sản lượng.' },
            c: { topic: 'Tối ưu hóa lợi nhuận', requirement: 'Lệnh hỏi c): Xác định mức sản lượng để hàm lợi nhuận đạt giá trị lớn nhất.' },
            d: { topic: 'Tích phân: Chi phí tích lũy', requirement: 'Lệnh hỏi d): Tính tổng chi phí tích lũy bằng tích phân hoặc thời điểm hòa vốn.' }
          }
        }
      ],
      p3_nb: 0, p3_th: 1, p3_vd: 1, p3_vdc: 0,
      p3_questions: [
        { id: 'q12_p3_1', level: 'TH', prompt: 'Tính khoảng cách giữa hai điểm cực trị của đồ thị hàm số bậc ba' },
        { id: 'q12_p3_2', level: 'VD', prompt: 'Bài toán kinh tế/thực tế: Tìm mức sản lượng tối ưu để lợi nhuận doanh nghiệp đạt cực đại' }
      ]
    },
    {
      id: 'm2',
      topic: 'Hình học không gian & Toạ độ trong không gian (Oxyz)',
      p1_nb: 2, p1_th: 2, p1_vd: 0, p1_vdc: 0,
      p1_questions: [
        { id: 'q12_p1_7', level: 'NB', prompt: 'Trong không gian $Oxyz$, xác định toạ độ điểm, toạ độ trung điểm hoặc toạ độ vectơ cơ bản' },
        { id: 'q12_p1_8', level: 'NB', prompt: 'Nhận biết vectơ pháp tuyến của mặt phẳng hoặc toạ độ tâm, bán kính mặt cầu $(S)$' },
        { id: 'q12_p1_9', level: 'TH', prompt: 'Tính tích vô hướng, độ dài vectơ hoặc cosin góc giữa hai vectơ trong không gian $Oxyz$' },
        { id: 'q12_p1_10', level: 'TH', prompt: 'Viết phương trình mặt phẳng đi qua một điểm và vuông góc với đường thẳng cho trước' }
      ],
      p2_questions: [
        {
          id: 'q12_3',
          stemType: 'p2_12_oxyz_tram_radar',
          stemPrompt: 'Trong không gian với hệ tọa độ $Oxyz$, trạm radar đặt tại điểm $A$ và máy bay bay theo đường thẳng $d$.',
          isMultiTopic: false,
          a: 'NB', b: 'TH', c: 'TH', d: 'VD',
          subItems: {
            a: { topic: 'Tọa độ điểm & Vectơ chỉ phương', requirement: 'Lệnh hỏi a): Xác định tọa độ trạm radar và vectơ chỉ phương của đường bay.' },
            b: { topic: 'Khoảng cách điểm đến đường thẳng', requirement: 'Lệnh hỏi b): Tính khoảng cách từ trạm radar $A$ đến đường bay của máy bay.' },
            c: { topic: 'Vị trí gần nhất', requirement: 'Lệnh hỏi c): Xác định vị trí máy bay ở gần trạm radar nhất.' },
            d: { topic: 'Mặt phẳng & Góc quét', requirement: 'Lệnh hỏi d): Viết phương trình mặt phẳng phủ sóng của radar.' }
          }
        }
      ],
      p3_nb: 0, p3_th: 0, p3_vd: 1, p3_vdc: 1,
      p3_questions: [
        { id: 'q12_p3_3', level: 'VD', prompt: 'Tính khoảng cách từ điểm đến mặt phẳng trong không gian $Oxyz$ gắn với mô hình thực tế' },
        { id: 'q12_p3_4', level: 'VDC', prompt: 'Mô hình không gian $Oxyz$: Tìm toạ độ vị trí trạm phát sóng hoặc camera để khoảng cách đạt giá trị tối ưu' }
      ]
    },
    {
      id: 'm3',
      topic: 'Nguyên hàm, Tích phân hoặc Xác suất thống kê',
      p1_nb: 1, p1_th: 1, p1_vd: 0, p1_vdc: 0,
      p1_questions: [
        { id: 'q12_p1_11', level: 'NB', prompt: 'Nhận biết công thức nguyên hàm hàm số luỹ thừa, hàm lượng giác cơ bản hoặc hai biến cố độc lập' },
        { id: 'q12_p1_12', level: 'TH', prompt: 'Tính giá trị tích phân xác định cơ bản $\\int_a^b f(x)dx$ hoặc xác suất có điều kiện $P(A|B)$' }
      ],
      p2_questions: [
        {
          id: 'q12_4',
          stemType: 'p2_12_xac_suat_dieu_kien',
          stemPrompt: 'Một nhà máy sản xuất sản phẩm với tỉ lệ lỗi và hệ thống cảm biến kiểm tra tự động.',
          isMultiTopic: false,
          a: 'NB', b: 'TH', c: 'VD', d: 'VDC',
          subItems: {
            a: { topic: 'Biến cố cơ bản', requirement: 'Lệnh hỏi a): Tính xác suất lấy ngẫu nhiên một sản phẩm là phế phẩm.' },
            b: { topic: 'Công thức xác suất toàn phần', requirement: 'Lệnh hỏi b): Tính xác suất cảm biến báo phế phẩm bằng công thức xác suất toàn phần.' },
            c: { topic: 'Công thức Bayes', requirement: 'Lệnh hỏi c): Tính xác suất sản phẩm thực sự lỗi khi cảm biến báo lỗi.' },
            d: { topic: 'Phân phối xác suất & Rủi ro', requirement: 'Lệnh hỏi d): Đánh giá số sản phẩm lỗi trong lô hàng hoặc chi phí bảo hành tối thiểu.' }
          }
        }
      ],
      p3_nb: 0, p3_th: 1, p3_vd: 0, p3_vdc: 1,
      p3_questions: [
        { id: 'q12_p3_5', level: 'TH', prompt: 'Ứng dụng tích phân tính diện tích hình phẳng giới hạn bởi đồ thị hàm số và trục hoành' },
        { id: 'q12_p3_6', level: 'VDC', prompt: 'Tính xác suất có điều kiện theo công thức Bayes trong bài toán y học / kiểm định chất lượng sản phẩm' }
      ]
    }
  ];
}

// Hàm sinh yêu cầu cần đạt chuẩn SGK GDPT 2018 cho Phần I
function getRequirementP1(topic: string, level: CognitiveLevel, qNum: number, grade: 10 | 12 = 12): string {
  if (grade === 10) {
    if (topic.includes('Hàm số bậc hai') || topic.includes('tam thức') || topic.includes('Parabol')) {
      if (level === 'NB') return 'Nhận biết toạ độ đỉnh, trục đối xứng, bề lõm của parabol thông qua đồ thị hoặc bảng biến thiên.';
      if (level === 'TH') return 'Xác định khoảng đồng biến, nghịch biến, giá trị lớn nhất, nhỏ nhất của hàm số bậc hai trên một đoạn.';
      if (level === 'VD') return 'Vận dụng dấu tam thức bậc hai giải bất phương trình và bài toán tương giao giữa parabol với đường thẳng.';
      return 'Vận dụng cao tìm tham số m để bất phương trình bậc hai nghiệm đúng hoặc bài toán parabol thực tế.';
    }
    if (topic.includes('Vectơ') || topic.includes('Hệ thức lượng')) {
      if (level === 'NB') return 'Nhận biết các hệ thức lượng trong tam giác (định lý cosin, định lý sin, công thức diện tích) và toạ độ vectơ.';
      if (level === 'TH') return 'Tính tích vô hướng, độ dài vectơ, tính góc và các cạnh trong tam giác.';
      if (level === 'VD') return 'Vận dụng hệ thức lượng giải tam giác trong các bài toán đo đạc thực tế.';
      return 'Vận dụng cực trị hình học hoặc bài toán tối ưu khoảng cách bằng vectơ.';
    }
    if (level === 'NB') return 'Nhận biết mệnh đề, mệnh đề phủ định, tập hợp con, các phép toán giao, hợp của hai tập hợp.';
    if (level === 'TH') return 'Xác định miền nghiệm của bất phương trình hoặc hệ bất phương trình bậc nhất hai ẩn trên mặt phẳng toạ độ.';
    if (level === 'VD') return 'Giải bài toán tối ưu hóa tuyến tính thực tế (tìm GTLN, GTNN của biểu thức F = ax + by trên miền đa giác).';
    return 'Vận dụng cao lý thuyết tập hợp, bài toán logic hoặc bài toán thực tế tham số phức hợp.';
  }

  // Grade 12
  if (topic.includes('đạo hàm') || topic.includes('khảo sát')) {
    if (level === 'NB') return 'Nhận biết tính đơn điệu, điểm cực trị của hàm số thông qua bảng biến thiên hoặc đồ thị hàm số.';
    if (level === 'TH') return 'Xác định đường tiệm cận đứng, ngang, giá trị lớn nhất, giá trị nhỏ nhất của hàm số trên một đoạn.';
    if (level === 'VD') return 'Vận dụng đạo hàm viết phương trình tiếp tuyến, tìm giao điểm và biện luận số nghiệm của phương trình.';
    return 'Vận dụng cao hàm số và đạo hàm giải quyết bài toán tham số nâng cao hoặc tối ưu chi phí thực tiễn.';
  }
  if (topic.includes('Hình học') || topic.includes('Oxyz')) {
    if (level === 'NB') return 'Nhận biết toạ độ của điểm, vectơ, góc và quan hệ vuông góc cơ bản trong không gian Oxyz.';
    if (level === 'TH') return 'Tính tích có hướng của hai vectơ, toạ độ trung điểm, trọng tâm tam giác và thể tích khối đa diện cơ bản.';
    if (level === 'VD') return 'Viết phương trình mặt phẳng, tính khoảng cách từ một điểm đến mặt phẳng trong không gian Oxyz.';
    return 'Vận dụng cao hình học không gian Oxyz để mô hình hoá và giải quyết bài toán tối ưu thực tế.';
  }
  if (level === 'NB') return 'Nhận biết bảng nguyên hàm của các hàm số cơ bản, định nghĩa tích phân hoặc quy tắc xác suất.';
  if (level === 'TH') return 'Tính nguyên hàm, tích phân bằng phương pháp đổi biến số đơn giản hoặc tích phân từng phần.';
  if (level === 'VD') return 'Ứng dụng tích phân để tính diện tích hình phẳng, thể tích khối tròn xoay hoặc bài toán xác suất thực tế.';
  return 'Vận dụng cao phương pháp tích phân giải bài toán thực tế nâng cao hoặc xác suất có điều kiện chuyên sâu.';
}

// Hàm sinh yêu cầu cần đạt chuẩn SGK cho từng ý a), b), c), d) của Phần II
function getRequirementP2(topic: string, letter: 'a' | 'b' | 'c' | 'd', level: CognitiveLevel, grade: 10 | 12 = 12): string {
  const prefix = `Lệnh hỏi ${letter}): `;
  if (grade === 10) {
    if (level === 'NB') return `${prefix}Xét tính đúng/sai của mệnh đề nhận biết trực tiếp toạ độ đỉnh, trục đối xứng hoặc tập xác định của hàm số.`;
    if (level === 'TH') return `${prefix}Xét tính đúng/sai của giá trị hàm số, khoảng đồng biến/nghịch biến hoặc dấu của tam thức bậc hai.`;
    if (level === 'VD') return `${prefix}Xét tính đúng/sai của bài toán tương giao, bất phương trình bậc hai hoặc hệ thức lượng tam giác.`;
    return `${prefix}Xét tính đúng/sai của bài toán tìm tham số m để phương trình có nghiệm hoặc bài toán thực tế tối ưu.`;
  }

  // Grade 12
  if (level === 'NB') return `${prefix}Xét tính đúng/sai của mệnh đề nhận biết trực tiếp tập xác định, tính đơn điệu hoặc toạ độ điểm/vectơ cơ bản.`;
  if (level === 'TH') return `${prefix}Xét tính đúng/sai của phép tính đạo hàm, giá trị cực trị, phương trình tiệm cận hoặc tích vô hướng vectơ.`;
  if (level === 'VD') return `${prefix}Xét tính đúng/sai của bài toán tiếp tuyến, thể tích khối đa diện, khoảng cách hoặc tương giao đồ thị.`;
  return `${prefix}Xét tính đúng/sai của bài toán chứa tham số nâng cao, cực trị hình học hoặc ứng dụng tối ưu hóa thực tế.`;
}

// Hàm sinh yêu cầu cần đạt cho Phần III
function getRequirementP3(topic: string, level: CognitiveLevel, qNum: number, grade: 10 | 12 = 12): string {
  if (grade === 10) {
    if (level === 'NB' || level === 'TH') return 'Tính giá trị biểu thức toạ độ, diện tích tam giác hoặc nghiệm của phương trình quy về bậc hai.';
    if (level === 'VD') return 'Giải quyết bài toán thực tế về đo đạc khoảng cách, chiều cao hoặc bài toán quỹ đạo parabol.';
    return 'Tìm giá trị lớn nhất, nhỏ nhất trong bài toán quy hoạch tuyến tính hoặc bài toán tham số phức hợp.';
  }

  // Grade 12
  if (level === 'NB' || level === 'TH') return 'Tính toán kết quả về cực trị, giá trị lớn nhất/nhỏ nhất, khoảng cách hoặc thể tích khối chóp cơ bản.';
  if (level === 'VD') return 'Vận dụng kiến thức để giải bài toán thực tế, tìm toạ độ vị trí hoặc tính diện tích/thể tích ứng dụng.';
  return 'Giải quyết bài toán mô hình hoá thực tiễn, tối ưu hoá chi phí sản xuất hoặc bài toán cực trị không gian nâng cao.';
}

/**
 * Tự động tạo Bản đặc tả ma trận đề thi tương ứng 100% với số câu ở Bước 2 Ma trận,
 * kể cả từng ý a, b, c, d của các câu trắc nghiệm Đúng/Sai (Phần II).
 */
export function generateSpecFromMatrix(
  rows: MatrixTopicRow[],
  prevItems: SpecItem[] = [],
  grade: 10 | 12 = 12
): SpecItem[] {
  const result: SpecItem[] = [];
  let qCountP1 = 1;
  let qCountP2 = 1;
  let qCountP3 = 1;

  // Bản đồ lưu trữ các requirement do người dùng đã chỉnh sửa trước đó để không bị mất nội dung tùy biến
  const customReqMap = new Map<string, string>();
  for (const item of prevItems) {
    if (item.questionRef && item.requirement) {
      customReqMap.set(item.questionRef, item.requirement);
    }
  }

  // 1. PHẦN I: TRẮC NGHIỆM 4 LỰA CHỌN (Mỗi câu tương ứng 1 dòng đặc tả)
  rows.forEach(row => {
    if (row.p1_questions && row.p1_questions.length > 0) {
      row.p1_questions.forEach(q => {
        const qRef = `Câu ${qCountP1++} (Phần I)`;
        const unitName = q.level === 'NB' ? 'Kiến thức cốt lõi (Trắc nghiệm 4 lựa chọn)' :
                         q.level === 'TH' ? 'Hiểu bản chất và nhận dạng toán học' :
                         q.level === 'VD' ? 'Vận dụng giải toán' : 'Vận dụng cao phối hợp kiến thức';
        result.push({
          id: `spec_p1_${row.id}_${q.id}`,
          topic: row.topic,
          unit: unitName,
          questionRef: qRef,
          level: q.level,
          part: 'P1',
          requirement: customReqMap.get(qRef) || q.prompt || getRequirementP1(row.topic, q.level, qCountP1 - 1, grade)
        });
      });
    } else {
      for (let i = 0; i < (row.p1_nb || 0); i++) {
        const qRef = `Câu ${qCountP1++} (Phần I)`;
        result.push({
          id: `spec_p1_nb_${row.id}_${i}`,
          topic: row.topic,
          unit: 'Kiến thức cốt lõi (Trắc nghiệm 4 lựa chọn)',
          questionRef: qRef,
          level: 'NB',
          part: 'P1',
          requirement: customReqMap.get(qRef) || getRequirementP1(row.topic, 'NB', qCountP1 - 1, grade)
        });
      }
      for (let i = 0; i < (row.p1_th || 0); i++) {
        const qRef = `Câu ${qCountP1++} (Phần I)`;
        result.push({
          id: `spec_p1_th_${row.id}_${i}`,
          topic: row.topic,
          unit: 'Hiểu bản chất và nhận dạng toán học',
          questionRef: qRef,
          level: 'TH',
          part: 'P1',
          requirement: customReqMap.get(qRef) || getRequirementP1(row.topic, 'TH', qCountP1 - 1, grade)
        });
      }
      for (let i = 0; i < (row.p1_vd || 0); i++) {
        const qRef = `Câu ${qCountP1++} (Phần I)`;
        result.push({
          id: `spec_p1_vd_${row.id}_${i}`,
          topic: row.topic,
          unit: 'Vận dụng giải toán',
          questionRef: qRef,
          level: 'VD',
          part: 'P1',
          requirement: customReqMap.get(qRef) || getRequirementP1(row.topic, 'VD', qCountP1 - 1, grade)
        });
      }
      for (let i = 0; i < (row.p1_vdc || 0); i++) {
        const qRef = `Câu ${qCountP1++} (Phần I)`;
        result.push({
          id: `spec_p1_vdc_${row.id}_${i}`,
          topic: row.topic,
          unit: 'Vận dụng cao phối hợp kiến thức',
          questionRef: qRef,
          level: 'VDC',
          part: 'P1',
          requirement: customReqMap.get(qRef) || getRequirementP1(row.topic, 'VDC', qCountP1 - 1, grade)
        });
      }
    }
  });

  // 2. PHẦN II: TRẮC NGHIỆM ĐÚNG / SAI (Từng ý a, b, c, d tương ứng 1 dòng đặc tả)
  rows.forEach(row => {
    (row.p2_questions || []).forEach(q => {
      const curQ = qCountP2++;
      const stemNote = q.stemPrompt ? ` [Ngữ cảnh: ${q.stemPrompt}]` : '';

      (['a', 'b', 'c', 'd'] as const).forEach(letter => {
        const itemLevel = q[letter];
        const qRef = `Câu ${curQ} - ý ${letter}) (Phần II)`;
        
        // Xác định chủ đề: nếu là đa chủ đề và có cấu hình topic riêng
        const subTopic = (q.isMultiTopic && q.subItems?.[letter]?.topic)
          ? q.subItems[letter]!.topic!
          : row.topic;

        // Xác định yêu cầu cần đạt: ưu tiên cấu hình chi tiết từ preset/người dùng
        let defaultReq = q.subItems?.[letter]?.requirement;
        if (!defaultReq) {
          defaultReq = getRequirementP2(subTopic, letter, itemLevel, grade);
        }
        if (q.stemPrompt && !defaultReq.includes(q.stemPrompt)) {
          defaultReq = `${defaultReq}${stemNote}`;
        }

        result.push({
          id: `spec_p2_${curQ}_${letter}_${q.id}`,
          topic: subTopic,
          unit: `Trắc nghiệm Đúng/Sai (Câu ${curQ} - ý ${letter})`,
          questionRef: qRef,
          level: itemLevel,
          part: 'P2',
          requirement: customReqMap.get(qRef) || defaultReq
        });
      });
    });
  });

  // 3. PHẦN III: TRẢ LỜI NGẮN (Mỗi câu tương ứng 1 dòng đặc tả)
  rows.forEach(row => {
    if (row.p3_questions && row.p3_questions.length > 0) {
      row.p3_questions.forEach(q => {
        const qRef = `Câu ${qCountP3++} (Phần III)`;
        const unitName = q.level === 'NB' ? 'Trả lời ngắn (Điền số kết quả)' :
                         q.level === 'TH' ? 'Trả lời ngắn (Tính toán kết quả)' :
                         q.level === 'VD' ? 'Trả lời ngắn (Vận dụng giải toán)' : 'Trả lời ngắn (Bài toán thực tế / tối ưu)';
        result.push({
          id: `spec_p3_${row.id}_${q.id}`,
          topic: row.topic,
          unit: unitName,
          questionRef: qRef,
          level: q.level,
          part: 'P3',
          requirement: customReqMap.get(qRef) || q.prompt || getRequirementP3(row.topic, q.level, qCountP3 - 1, grade)
        });
      });
    } else {
      for (let i = 0; i < (row.p3_nb || 0); i++) {
        const qRef = `Câu ${qCountP3++} (Phần III)`;
        result.push({
          id: `spec_p3_nb_${row.id}_${i}`,
          topic: row.topic,
          unit: 'Trả lời ngắn (Điền số kết quả)',
          questionRef: qRef,
          level: 'NB',
          part: 'P3',
          requirement: customReqMap.get(qRef) || getRequirementP3(row.topic, 'NB', qCountP3 - 1, grade)
        });
      }
      for (let i = 0; i < (row.p3_th || 0); i++) {
        const qRef = `Câu ${qCountP3++} (Phần III)`;
        result.push({
          id: `spec_p3_th_${row.id}_${i}`,
          topic: row.topic,
          unit: 'Trả lời ngắn (Tính toán kết quả)',
          questionRef: qRef,
          level: 'TH',
          part: 'P3',
          requirement: customReqMap.get(qRef) || getRequirementP3(row.topic, 'TH', qCountP3 - 1, grade)
        });
      }
      for (let i = 0; i < (row.p3_vd || 0); i++) {
        const qRef = `Câu ${qCountP3++} (Phần III)`;
        result.push({
          id: `spec_p3_vd_${row.id}_${i}`,
          topic: row.topic,
          unit: 'Trả lời ngắn (Vận dụng giải toán)',
          questionRef: qRef,
          level: 'VD',
          part: 'P3',
          requirement: customReqMap.get(qRef) || getRequirementP3(row.topic, 'VD', qCountP3 - 1, grade)
        });
      }
      for (let i = 0; i < (row.p3_vdc || 0); i++) {
        const qRef = `Câu ${qCountP3++} (Phần III)`;
        result.push({
          id: `spec_p3_vdc_${row.id}_${i}`,
          topic: row.topic,
          unit: 'Trả lời ngắn (Bài toán thực tế / tối ưu)',
          questionRef: qRef,
          level: 'VDC',
          part: 'P3',
          requirement: customReqMap.get(qRef) || getRequirementP3(row.topic, 'VDC', qCountP3 - 1, grade)
        });
      }
    }
  });

  return result;
}

function getDefaultSpecItems12(): SpecItem[] {
  return generateSpecFromMatrix(getDefaultMatrixRows12(), [], 12);
}

// =========================================================================
// HÀM TẠO SẴN ẢNH BẢNG BIẾN THIÊN, ĐỒ THỊ, HÌNH 3D (300 DPI) CHO ĐỀ THI
// =========================================================================

export function generateDefaultExamImages(): { bbtDataUrl: string; graphDataUrl: string } {
  let bbtDataUrl = '';
  let graphDataUrl = '';

  if (typeof document === 'undefined') {
    return { bbtDataUrl, graphDataUrl };
  }

  try {
    const c1 = document.createElement('canvas');
    const analyzed = analyzeFromCoeffs('cubic', 1, 0, -3, 0); // y = x^3 - 3x
    renderBBTToCanvas(analyzed, c1, 2.4, { fontSizeScale: 1.0 });
    bbtDataUrl = c1.toDataURL('image/png');
  } catch (e) {
    console.warn('Không thể sinh ảnh BBT mẫu:', e);
  }

  try {
    const c3 = document.createElement('canvas');
    const graphCfg: GraphConfig = {
      type: 'cubic',
      a: 1,
      b: 0,
      c: -3,
      d: 1,
      e: 0,
      xMin: -4.5,
      xMax: 4.5,
      yMin: -4.5,
      yMax: 5.5,
      showGrid: false,
      showTicks: true,
      tickStep: 1,
      showTickLabels: false,
      showExtrema: true,
      showIntersections: true,
      showAsymptotes: false,
    };
    renderGraphToCanvas(graphCfg, c3, 2.4, { fontSizeScale: 1.0 });
    graphDataUrl = c3.toDataURL('image/png');
  } catch (e) {
    console.warn('Không thể sinh ảnh Graph mẫu:', e);
  }

  return { bbtDataUrl, graphDataUrl };
}

/**
 * Đề thi mẫu chuẩn Công văn 7991 có sẵn hình Bảng biến thiên và Đồ thị thực tế
 */
export function getSampleExamContent(imgs?: { bbtDataUrl?: string; graphDataUrl?: string }): string {
  const bbtImg = imgs?.bbtDataUrl ? `\n\n![Bảng biến thiên](${imgs.bbtDataUrl})\n\n` : '\n\n';
  const graphImg = imgs?.graphDataUrl ? `\n\n![Đồ thị hàm số bậc ba](${imgs.graphDataUrl})\n\n` : '\n\n';

  return `### PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (Thí sinh trả lời từ Câu 1 đến Câu 12. Mỗi câu hỏi thí sinh chỉ chọn một phương án).

<b>Câu 1.</b> Cho hàm số $y = f(x)$ có bảng biến thiên như hình vẽ dưới đây:
${bbtImg}Hàm số đã cho đồng biến trên khoảng nào dưới đây?
A. $(-1; 1)$
B. $(1; +\\infty)$
C. $(-\\infty; 1)$
D. $(-1; +\\infty)$

<b>Câu 2.</b> Cho hàm số bậc ba $y = ax^3 + bx^2 + cx + d$ ($a \\neq 0$) có đồ thị như hình vẽ bên dưới. Mệnh đề nào sau đây là đúng?
${graphImg}A. $a > 0, d > 0$
B. $a < 0, d > 0$
C. $a > 0, d < 0$
D. $a < 0, d < 0$

<b>Câu 3.</b> Cho hàm số $y = f(x)$ liên tục trên $\\mathbb{R}$ và có bảng xét dấu đạo hàm $f'(x)$. Điểm cực tiểu của hàm số đã cho là điểm nào?
A. $x = 0$
B. $x = 1$
C. $x = -2$
D. $x = 3$

<b>Câu 4.</b> Đồ thị của hàm số $y = \\frac{2x + 1}{x - 1}$ có đường tiệm cận đứng là đường thẳng:
A. $x = 1$
B. $x = 2$
C. $y = 2$
D. $y = 1$

<b>Câu 5.</b> Cho hàm số $y = f(x)$ liên tục trên $\\mathbb{R}$ và có bảng xét dấu của đạo hàm $f'(x)$ như sau:

Số điểm cực trị của hàm số đã cho là:
A. $1$
B. $2$
C. $3$
D. $4$

<b>Câu 6.</b> Giá trị lớn nhất của hàm số $f(x) = x^4 - 2x^2 - 3$ trên đoạn $[0; 2]$ bằng:
A. $5$
B. $-3$
C. $-4$
D. $0$

---

### PHẦN II. Câu trắc nghiệm đúng sai (Thí sinh trả lời từ Câu 1 đến Câu 4. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai).

<b>Câu 1.</b> Cho hàm số $f(x) = \\frac{x^2 - 3x + 6}{x - 1}$.
a) Tập xác định của hàm số là $D = \\mathbb{R} \\setminus \\{1\\}$.
b) Đạo hàm của hàm số là $f'(x) = \\frac{x^2 - 2x - 3}{(x - 1)^2}$.
c) Hàm số đạt cực đại tại $x = -1$ và giá trị cực đại bằng $-5$.
d) Đường tiệm cận xiên của đồ thị hàm số đi qua điểm $M(2; 0)$.

<b>Câu 2.</b> Cho hình chóp tứ giác $S.ABCD$ có đáy $ABCD$ là hình vuông cạnh $a$, cạnh bên $SA$ vuông góc với mặt phẳng đáy và $SA = a\\sqrt{3}$.
a) Đường thẳng $SA$ vuông góc với đường thẳng $BC$.
b) Góc giữa đường thẳng $SC$ và mặt phẳng $(ABCD)$ bằng $60^\\circ$.
c) Thể tích của khối chóp $S.ABCD$ bằng $\\frac{a^3\\sqrt{3}}{3}$.
d) Khoảng cách từ điểm $A$ đến mặt phẳng $(SBC)$ bằng $\\frac{a\\sqrt{3}}{2}$.

---

### PHẦN III. Câu trắc nghiệm trả lời ngắn (Thí sinh trả lời từ Câu 1 đến Câu 6).

<b>Câu 1.</b> Cho hàm số $y = x^3 - 3x^2 + 2$. Tìm hoành độ điểm uốn của đồ thị hàm số đã cho.
*(Đáp số: 1)*

<b>Câu 2.</b> Một người thợ xây cần làm một bể chứa nước hình hộp chữ nhật không nắp có thể tích $V = 4\\text{ m}^3$, đáy có chiều dài gấp đôi chiều rộng. Chi phí vật liệu để xây đáy là $100.000\\text{ đ/m}^2$, chi phí xây thành bể là $60.000\\text{ đ/m}^2$. Tìm chiều cao của bể (đơn vị: mét) để chi phí xây dựng là thấp nhất.
*(Đáp số: 1.15)*

---------------------------HẾT------------------------

PHẦN I. Câu trắc nghiệm một đáp án đúng 
| Câu   | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10   | 11   | 12   |
| Chọn   | B   | A   | A   | A   | C   | A   | B   | C   | D   | A   | B   | C   |

Lời giải
Câu 1: B đúng vì từ bảng biến thiên ta thấy hàm số đồng biến trên khoảng $(1; +\infty)$ và $(-\infty; -1)$.
Câu 2: A đúng vì đồ thị có nhánh phải đi lên ($a > 0$) và cắt trục tung tại điểm có tung độ dương ($d > 0$).
Câu 3: A đúng vì đạo hàm đổi dấu từ âm sang dương khi qua $x = 0$.
Câu 4: A đúng vì nghiệm của mẫu số là $x - 1 = 0 \Leftrightarrow x = 1$.
Câu 5: C đúng vì đạo hàm $f'(x)$ đổi dấu 3 lần qua các nghiệm.
Câu 6: A đúng vì $f'(x) = 4x^3 - 4x = 0 \Leftrightarrow x = 0$ hoặc $x = 1$. Ta có $f(0) = -3, f(1) = -4, f(2) = 5 \Rightarrow \max = 5$.

PHẦN II. Câu trắc nghiệm đúng sai. 
| Câu 1   | Câu 2   |
| a) Đ   | a) Đ   |
| b) S   | b) S   |
| c) S   | c) S   |
| d) Đ   | d) S   |

Lời giải
Câu 1:
a) Đúng vì tập xác định là $D = \mathbb{R} \setminus \{1\}$.
b) Sai vì $f'(x) = \frac{x^2 - 2x - 3}{(x - 1)^2}$.
c) Sai vì tại $x = -1$ hàm số đạt cực đại và giá trị cực đại bằng $-5$ (cần kiểm tra bảng biến thiên).
d) Đúng vì đường tiệm cận xiên là $y = x - 2$, thay toạ độ $M(2; 0)$ vào thoả mãn $0 = 2 - 2$.

Câu 2:
a) Đúng vì $SA \perp (ABCD) \Rightarrow SA \perp BC$.
b) Sai vì góc giữa $SC$ và $(ABCD)$ là $\widehat{SCA} \neq 60^\circ$.
c) Sai vì thể tích là $V = \frac{1}{3} a^2 \cdot a\sqrt{3} = \frac{a^3\sqrt{3}}{3}$.
d) Sai vì khoảng cách từ điểm $A$ đến $(SBC)$ bằng $\frac{a\sqrt{3}}{2}$.

PHẦN III. Câu trắc nghiệm trả lời ngắn. 
| Câu   | 1   | 2   |
| Chọn   | 1   | 1.15   |

Lời giải
Câu 1: Ta có $y' = 3x^2 - 6x$, $y'' = 6x - 6 = 0 \Leftrightarrow x = 1$. Vậy hoành độ điểm uốn bằng 1.
Câu 2: Ta có thể tích $V = 2x^2 h = 4 \Rightarrow h = \frac{2}{x^2}$. Chi phí nhỏ nhất khi $x \approx 1.86 \Rightarrow h \approx 1.15$.
`;
}

// =========================================================================
// HELPER CLASS MÀU CHO CÁC MỨC ĐỘ
// =========================================================================

export function getLevelBadgeClass(level: CognitiveLevel): string {
  switch (level) {
    case 'NB':
      return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700';
    case 'TH':
      return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700';
    case 'VD':
      return 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700';
    case 'VDC':
      return 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700';
  }
}

export function countItemsByLevel(q: Part2Question, level: CognitiveLevel): number {
  return (q.a === level ? 1 : 0) + (q.b === level ? 1 : 0) + (q.c === level ? 1 : 0) + (q.d === level ? 1 : 0);
}

// =========================================================================
// MAIN COMPONENT
// =========================================================================

export default function CV7991ExamGenerator({ apiKey, model, grade = 12 }: Props) {
  // 1. Quản lý Bước (1: Thông tin, 2: Ma trận, 3: Bảng đặc tả, 4: Đề thi)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(4);

  // Thông tin đề thi
  const [examInfo, setExamInfo] = useState({
    school: 'TRƯỜNG THPT CHUYÊN LÊ HOÀNG CHIẾU',
    department: 'TỔ TOÁN - TIN HỌC',
    examTitle: 'ĐỀ KIỂM TRA ĐÁNH GIÁ ĐỊNH KỲ - HỌC KỲ I',
    subject: grade === 10 ? 'MÔN: TOÁN - KHỐI 10' : 'MÔN: TOÁN - KHỐI 12',
    duration: '90 phút (Không kể thời gian phát đề)',
    examCode: '101',
    academicYear: 'Năm học 2025 - 2026'
  });

  // State quản lý Ma trận đề thi động (Bước 2)
  const [matrixRows, setMatrixRows] = useState<MatrixTopicRow[]>(() => getDefaultMatrixRows12());

  // State quản lý Bản đặc tả ma trận động (Bước 3)
  const [specItems, setSpecItems] = useState<SpecItem[]>(() => getDefaultSpecItems12());
  const [specFilter, setSpecFilter] = useState<'ALL' | CognitiveLevel>('ALL');

  // Chế độ xem ở Bước 4 (Soạn thảo vs Xem trước)
  const [viewMode, setViewMode] = useState<'source' | 'preview'>('preview');

  // Trạng thái công cụ vẽ (Collapsible)
  const [isToolCollapsed, setIsToolCollapsed] = useState(true);
  const [activeToolTab, setActiveToolTab] = useState<'bbt' | 'graph' | 'geo3d'>('bbt');

  // State cho Tab BBT (Bảng biến thiên)
  const [bbtMode, setBbtMode] = useState<'coeffs' | 'text'>('coeffs');
  const [bbtType, setBbtType] = useState<'cubic' | 'quartic' | 'rational_1_1' | 'rational_2_1'>('rational_2_1');
  const [bbtCoeffs, setBbtCoeffs] = useState({
    a: 1,
    b: -1,
    c: 1,
    d: 1,
    e: -1
  });
  const [bbtFnInput, setBbtFnInput] = useState('(x^2 - x + 1)/(x - 1)');
  const [bbtTargetQuestion, setBbtTargetQuestion] = useState('Câu 1');
  const bbtCanvasRef = useRef<HTMLCanvasElement>(null);
  const [bbtDataUrl, setBbtDataUrl] = useState<string>('');

  // State cho Tab Hình học 3D
  const [geoConfig, setGeoConfig] = useState<Geometry3DConfig>({
    preset: 'pyramid_s_abcd',
    showCenterO: true,
    showMidpointM: true,
    showDiagonals: false
  });
  const geoCanvasRef = useRef<HTMLCanvasElement>(null);
  const [geoDataUrl, setGeoDataUrl] = useState<string>('');

  // State cho Tab Đồ thị Oxy
  const [graphConfig, setGraphConfig] = useState<GraphConfig>({
    type: 'cubic',
    a: 1,
    b: 0,
    c: -3,
    d: 1,
    e: 0,
    xMin: -5.5,
    xMax: 5.5,
    yMin: -5.5,
    yMax: 5.5,
    showGrid: false,
    showTicks: false,
    tickStep: 1,
    showTickLabels: false,
    showExtrema: true,
    showIntersections: true,
    showAsymptotes: true,
    showCustomPoint: false,
    customPoint: { x: 2, label: 'M' },
    restrictInterval: false,
    intervalA: 0,
    intervalB: 2,
    intervalMode: 'highlight',
    showIntervalEndpoints: true
  });
  const [examFontScale, setExamFontScale] = useState<number>(1.0);
  const graphCanvasRef = useRef<HTMLCanvasElement>(null);
  const [graphDataUrl, setGraphDataUrl] = useState<string>('');

  // Thông báo Copy thành công
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // State điều khiển Modal tích hợp 3 công cụ vẽ ảnh 300 DPI
  const [diagramModalOpen, setDiagramModalOpen] = useState<boolean>(false);
  const [diagramInitialTab, setDiagramInitialTab] = useState<DiagramToolTab>('graph');
  const [targetQuestionForDiagram, setTargetQuestionForDiagram] = useState<number | string | undefined>(undefined);
  const [diagramModalInitialSuggestion, setDiagramModalInitialSuggestion] = useState<DiagramSuggestion | undefined>(undefined);

  const handleOpenDiagramModal = (tab: DiagramToolTab, questionNumber?: number | string, suggestion?: DiagramSuggestion) => {
    setDiagramInitialTab(tab);
    setTargetQuestionForDiagram(questionNumber);
    setDiagramModalInitialSuggestion(suggestion);
    setDiagramModalOpen(true);
  };

  const handleInsertDiagramToExam = (dataUrl: string, qNum?: number | string) => {
    const imgMarkdown = `\n\n![Hình vẽ ${qNum ? `Câu ${qNum}` : 'minh họa'}](${dataUrl})\n\n`;
    if (qNum) {
      const regex = new RegExp(`((?:\\*\\*|\\*|<b>)?Câu\\s+${qNum}\\..*?\\n)`, 'i');
      if (regex.test(examMarkdown)) {
        setExamMarkdown(examMarkdown.replace(regex, `$1${imgMarkdown}`));
      } else {
        setExamMarkdown(prev => prev + imgMarkdown);
      }
    } else {
      setExamMarkdown(prev => prev + imgMarkdown);
    }
    setCopySuccess(`Đã chèn ảnh đồ họa 300 DPI vào ${qNum ? `Câu ${qNum}` : 'đề thi'}!`);
    setTimeout(() => setCopySuccess(null), 3500);
  };

  // Khởi tạo Nội dung Đề thi hoàn chỉnh kèm sẵn ảnh BBT, Đồ thị
  const [examMarkdown, setExamMarkdown] = useState<string>(() => {
    const initialImgs = generateDefaultExamImages();
    return getSampleExamContent(initialImgs);
  });

  // State quản lý định dạng đáp án (table: Bảng đáp án cuối đề, inline: Mẫu rút gọn gạch chân)
  const [answerFormat, setAnswerFormat] = useState<'table' | 'inline'>('table');

  // State quản lý Modal Trộn Đề McMIX
  const [isMultiCodeModalOpen, setIsMultiCodeModalOpen] = useState(false);
  const [shufflableExam, setShufflableExam] = useState<ExamCV7991 | null>(null);

  const handleOpenShuffleModal = () => {
    const parsed = parseExamMarkdownToCV7991(examMarkdown, {
      examTitle: examInfo.examTitle,
      subject: examInfo.subject,
      academicYear: examInfo.academicYear,
      durationMinutes: parseInt(examInfo.duration || '90', 10) || 90,
      code: examInfo.examCode || '101'
    });
    setShufflableExam(parsed);
    setIsMultiCodeModalOpen(true);
  };

  // Danh sách các câu hỏi trích xuất động từ đề thi (để chọn dán vào câu bất kỳ)
  const allQuestionsList = useMemo(() => {
    const matches = examMarkdown.match(/(?:<b>|<\/b>|\*\*|^|\s)(Câu\s+\d+)/gi);
    if (!matches) {
      return ['Câu 1', 'Câu 2', 'Câu 3', 'Câu 4', 'Câu 5', 'Câu 6', 'Câu 7', 'Câu 8', 'Câu 9', 'Câu 10', 'Câu 11', 'Câu 12'];
    }
    const cleanList = Array.from(
      new Set(
        matches.map(m => m.replace(/<b>|<\/b>|\*\*|\s/g, '').trim())
      )
    );
    return cleanList.length > 0 ? cleanList : ['Câu 1', 'Câu 2', 'Câu 3', 'Câu 4', 'Câu 5', 'Câu 6', 'Câu 7', 'Câu 8', 'Câu 9', 'Câu 10', 'Câu 11', 'Câu 12'];
  }, [examMarkdown]);

  // Tự động kiểm tra và nhúng ảnh nếu đề thi ban đầu chưa có
  useEffect(() => {
    if (!examMarkdown.includes('data:image/png;base64')) {
      const imgs = generateDefaultExamImages();
      setExamMarkdown(getSampleExamContent(imgs));
    }
  }, []);

  // Cập nhật và render lại BBT
  useEffect(() => {
    if (bbtCanvasRef.current && (activeToolTab === 'bbt' || !bbtDataUrl)) {
      try {
        let analyzed: BBTData;
        if (bbtMode === 'coeffs') {
          analyzed = analyzeFromCoeffs(
            bbtType,
            bbtCoeffs.a,
            bbtCoeffs.b,
            bbtCoeffs.c,
            bbtCoeffs.d,
            bbtCoeffs.e
          );
        } else {
          analyzed = analyzeFunction(bbtFnInput);
        }
        renderBBTToCanvas(analyzed, bbtCanvasRef.current, 2.4, { fontSizeScale: examFontScale });
        const url = bbtCanvasRef.current.toDataURL('image/png');
        setBbtDataUrl(url);
      } catch (err) {
        console.error('Lỗi phân tích hàm số:', err);
      }
    }
  }, [bbtCoeffs, bbtType, bbtMode, bbtFnInput, activeToolTab, isToolCollapsed, examFontScale]);

  // Cập nhật và render Đồ thị Oxy
  useEffect(() => {
    if (graphCanvasRef.current && activeToolTab === 'graph') {
      try {
        renderGraphToCanvas(graphConfig, graphCanvasRef.current, 2.4, { fontSizeScale: examFontScale });
        const url = graphCanvasRef.current.toDataURL('image/png');
        setGraphDataUrl(url);
      } catch (err) {
        console.error('Lỗi render đồ thị:', err);
      }
    }
  }, [graphConfig, activeToolTab, isToolCollapsed, examFontScale]);

  // Cập nhật và render Hình học 3D (300 DPI)
  useEffect(() => {
    if (geoCanvasRef.current && activeToolTab === 'geo3d') {
      try {
        renderGeometry3DToCanvas(geoConfig, geoCanvasRef.current, 3);
        const url = geoCanvasRef.current.toDataURL('image/png');
        setGeoDataUrl(url);
      } catch (err) {
        console.error('Lỗi render hình học 3D:', err);
      }
    }
  }, [geoConfig, activeToolTab, isToolCollapsed]);

  // =========================================================================
  // LOGIC TÍNH TOÁN MA TRẬN & THỐNG KÊ MỨC ĐỘ (BƯỚC 2)
  // =========================================================================

  const getP1Total = (r: MatrixTopicRow) => (r.p1_nb || 0) + (r.p1_th || 0) + (r.p1_vd || 0) + (r.p1_vdc || 0);
  const getP2Count = (r: MatrixTopicRow) => (r.p2_questions || []).length;
  const getP2Score = (r: MatrixTopicRow) => getP2Count(r) * 1.0;
  const getP2NBCount = (r: MatrixTopicRow) => (r.p2_questions || []).reduce((sum, q) => sum + countItemsByLevel(q, 'NB'), 0);
  const getP2THCount = (r: MatrixTopicRow) => (r.p2_questions || []).reduce((sum, q) => sum + countItemsByLevel(q, 'TH'), 0);
  const getP2VDCount = (r: MatrixTopicRow) => (r.p2_questions || []).reduce((sum, q) => sum + countItemsByLevel(q, 'VD'), 0);
  const getP2VDCCount = (r: MatrixTopicRow) => (r.p2_questions || []).reduce((sum, q) => sum + countItemsByLevel(q, 'VDC'), 0);

  const getP3Total = (r: MatrixTopicRow) => (r.p3_nb || 0) + (r.p3_th || 0) + (r.p3_vd || 0) + (r.p3_vdc || 0);
  const getRowQuestions = (r: MatrixTopicRow) => getP1Total(r) + getP2Count(r) + getP3Total(r);
  const getRowScore = (r: MatrixTopicRow) => (getP1Total(r) * 0.25) + getP2Score(r) + (getP3Total(r) * 0.5);

  const totalP1 = matrixRows.reduce((sum, r) => sum + getP1Total(r), 0);
  const totalP2 = matrixRows.reduce((sum, r) => sum + getP2Count(r), 0);
  const totalP3 = matrixRows.reduce((sum, r) => sum + getP3Total(r), 0);
  const totalQuestions = totalP1 + totalP2 + totalP3;
  const totalScore = matrixRows.reduce((sum, r) => sum + getRowScore(r), 0);

  // Thống kê 4 mức độ: NB, TH, VD, VDC
  const totalP1NB = matrixRows.reduce((sum, r) => sum + (r.p1_nb || 0), 0);
  const totalP1TH = matrixRows.reduce((sum, r) => sum + (r.p1_th || 0), 0);
  const totalP1VD = matrixRows.reduce((sum, r) => sum + (r.p1_vd || 0), 0);
  const totalP1VDC = matrixRows.reduce((sum, r) => sum + (r.p1_vdc || 0), 0);

  const totalP2NB = matrixRows.reduce((sum, r) => sum + getP2NBCount(r), 0);
  const totalP2TH = matrixRows.reduce((sum, r) => sum + getP2THCount(r), 0);
  const totalP2VD = matrixRows.reduce((sum, r) => sum + getP2VDCount(r), 0);
  const totalP2VDC = matrixRows.reduce((sum, r) => sum + getP2VDCCount(r), 0);

  const totalP3NB = matrixRows.reduce((sum, r) => sum + (r.p3_nb || 0), 0);
  const totalP3TH = matrixRows.reduce((sum, r) => sum + (r.p3_th || 0), 0);
  const totalP3VD = matrixRows.reduce((sum, r) => sum + (r.p3_vd || 0), 0);
  const totalP3VDC = matrixRows.reduce((sum, r) => sum + (r.p3_vdc || 0), 0);

  const countNB = totalP1NB + totalP2NB + totalP3NB;
  const countTH = totalP1TH + totalP2TH + totalP3TH;
  const countVD = totalP1VD + totalP2VD + totalP3VD;
  const countVDC = totalP1VDC + totalP2VDC + totalP3VDC;

  const scoreNB = (totalP1NB * 0.25) + (totalP2NB * 0.25) + (totalP3NB * 0.5);
  const scoreTH = (totalP1TH * 0.25) + (totalP2TH * 0.25) + (totalP3TH * 0.5);
  const scoreVD = (totalP1VD * 0.25) + (totalP2VD * 0.25) + (totalP3VD * 0.5);
  const scoreVDC = (totalP1VDC * 0.25) + (totalP2VDC * 0.25) + (totalP3VDC * 0.5);

  const pctNB = totalScore > 0 ? Math.round((scoreNB / totalScore) * 100) : 0;
  const pctTH = totalScore > 0 ? Math.round((scoreTH / totalScore) * 100) : 0;
  const pctVD = totalScore > 0 ? Math.round((scoreVD / totalScore) * 100) : 0;
  const pctVDC = totalScore > 0 ? Math.round((scoreVDC / totalScore) * 100) : 0;

  // Helper lấy danh sách câu hỏi Phần I của dòng (tự động fallback nếu chưa có)
  const getRowP1Questions = (r: MatrixTopicRow): Part1Question[] => {
    if (r.p1_questions && r.p1_questions.length > 0) {
      return r.p1_questions;
    }
    const list: Part1Question[] = [];
    let cnt = 1;
    for (let i = 0; i < (r.p1_nb || 0); i++) {
      list.push({ id: `p1_${r.id}_nb_${i}`, level: 'NB', prompt: getRequirementP1(r.topic, 'NB', cnt++, grade || 12) });
    }
    for (let i = 0; i < (r.p1_th || 0); i++) {
      list.push({ id: `p1_${r.id}_th_${i}`, level: 'TH', prompt: getRequirementP1(r.topic, 'TH', cnt++, grade || 12) });
    }
    for (let i = 0; i < (r.p1_vd || 0); i++) {
      list.push({ id: `p1_${r.id}_vd_${i}`, level: 'VD', prompt: getRequirementP1(r.topic, 'VD', cnt++, grade || 12) });
    }
    for (let i = 0; i < (r.p1_vdc || 0); i++) {
      list.push({ id: `p1_${r.id}_vdc_${i}`, level: 'VDC', prompt: getRequirementP1(r.topic, 'VDC', cnt++, grade || 12) });
    }
    return list;
  };

  // Helper lấy danh sách câu hỏi Phần III của dòng (tự động fallback nếu chưa có)
  const getRowP3Questions = (r: MatrixTopicRow): Part3Question[] => {
    if (r.p3_questions && r.p3_questions.length > 0) {
      return r.p3_questions;
    }
    const list: Part3Question[] = [];
    let cnt = 1;
    for (let i = 0; i < (r.p3_nb || 0); i++) {
      list.push({ id: `p3_${r.id}_nb_${i}`, level: 'NB', prompt: getRequirementP3(r.topic, 'NB', cnt++, grade || 12) });
    }
    for (let i = 0; i < (r.p3_th || 0); i++) {
      list.push({ id: `p3_${r.id}_th_${i}`, level: 'TH', prompt: getRequirementP3(r.topic, 'TH', cnt++, grade || 12) });
    }
    for (let i = 0; i < (r.p3_vd || 0); i++) {
      list.push({ id: `p3_${r.id}_vd_${i}`, level: 'VD', prompt: getRequirementP3(r.topic, 'VD', cnt++, grade || 12) });
    }
    for (let i = 0; i < (r.p3_vdc || 0); i++) {
      list.push({ id: `p3_${r.id}_vdc_${i}`, level: 'VDC', prompt: getRequirementP3(r.topic, 'VDC', cnt++, grade || 12) });
    }
    return list;
  };

  // Tính số thứ tự câu hỏi Phần I liên tục trên toàn ma trận
  const getOverallP1Index = (targetRowId: string, qIdx: number): number => {
    let count = 0;
    for (const r of matrixRows) {
      if (r.id === targetRowId) {
        return count + qIdx + 1;
      }
      count += getRowP1Questions(r).length;
    }
    return count + 1;
  };

  // Tính số thứ tự câu hỏi Phần III liên tục trên toàn ma trận
  const getOverallP3Index = (targetRowId: string, qIdx: number): number => {
    let count = 0;
    for (const r of matrixRows) {
      if (r.id === targetRowId) {
        return count + qIdx + 1;
      }
      count += getRowP3Questions(r).length;
    }
    return count + 1;
  };

  // State mở rộng mô tả câu hỏi Phần I và Phần III
  const [expandedP1Rows, setExpandedP1Rows] = useState<Record<string, boolean>>({ m1: true, m2: true, m3: true });
  const [expandedP3Rows, setExpandedP3Rows] = useState<Record<string, boolean>>({ m1: true, m2: true, m3: true });

  const toggleExpandP1Row = (rowId: string) => {
    setExpandedP1Rows(prev => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  const toggleExpandP3Row = (rowId: string) => {
    setExpandedP3Rows(prev => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  const syncRowCountsFromP1 = (questions: Part1Question[]) => ({
    p1_nb: questions.filter(q => q.level === 'NB').length,
    p1_th: questions.filter(q => q.level === 'TH').length,
    p1_vd: questions.filter(q => q.level === 'VD').length,
    p1_vdc: questions.filter(q => q.level === 'VDC').length,
  });

  const syncRowCountsFromP3 = (questions: Part3Question[]) => ({
    p3_nb: questions.filter(q => q.level === 'NB').length,
    p3_th: questions.filter(q => q.level === 'TH').length,
    p3_vd: questions.filter(q => q.level === 'VD').length,
    p3_vdc: questions.filter(q => q.level === 'VDC').length,
  });

  const handleUpdateP1Count = (rowId: string, level: CognitiveLevel, newCount: number) => {
    setMatrixRows(matrixRows.map(r => {
      if (r.id !== rowId) return r;
      const current = [...getRowP1Questions(r)];
      const withLevel = current.filter(q => q.level === level);
      const diff = newCount - withLevel.length;
      let updated = [...current];
      if (diff > 0) {
        for (let i = 0; i < diff; i++) {
          updated.push({
            id: `p1_${r.id}_${level.toLowerCase()}_${Date.now()}_${i}`,
            level,
            prompt: getRequirementP1(r.topic, level, updated.length + 1, grade || 12)
          });
        }
      } else if (diff < 0) {
        let toRemove = Math.abs(diff);
        for (let i = updated.length - 1; i >= 0 && toRemove > 0; i--) {
          if (updated[i].level === level) {
            updated.splice(i, 1);
            toRemove--;
          }
        }
      }
      return {
        ...r,
        ...syncRowCountsFromP1(updated),
        p1_questions: updated
      };
    }));
  };

  const handleUpdateP1QuestionPrompt = (rowId: string, qIdx: number, prompt: string) => {
    setMatrixRows(matrixRows.map(r => {
      if (r.id !== rowId) return r;
      const questions = [...getRowP1Questions(r)];
      if (questions[qIdx]) {
        questions[qIdx] = { ...questions[qIdx], prompt };
      }
      return { ...r, p1_questions: questions };
    }));
  };

  const handleUpdateP1QuestionLevel = (rowId: string, qIdx: number, level: CognitiveLevel) => {
    setMatrixRows(matrixRows.map(r => {
      if (r.id !== rowId) return r;
      const questions = [...getRowP1Questions(r)];
      if (questions[qIdx]) {
        questions[qIdx] = { ...questions[qIdx], level };
      }
      return {
        ...r,
        ...syncRowCountsFromP1(questions),
        p1_questions: questions
      };
    }));
  };

  const handleApplyP1Preset = (rowId: string, qIdx: number, presetId: string) => {
    const preset = PART1_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setMatrixRows(matrixRows.map(r => {
      if (r.id !== rowId) return r;
      const questions = [...getRowP1Questions(r)];
      if (questions[qIdx]) {
        questions[qIdx] = {
          ...questions[qIdx],
          presetId: preset.id,
          prompt: preset.prompt,
          level: preset.level
        };
      }
      return {
        ...r,
        ...syncRowCountsFromP1(questions),
        p1_questions: questions
      };
    }));
  };

  const handleAddP1Question = (rowId: string, level: CognitiveLevel = 'NB') => {
    setMatrixRows(matrixRows.map(r => {
      if (r.id !== rowId) return r;
      const questions = [...getRowP1Questions(r)];
      questions.push({
        id: `p1_${r.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        level,
        prompt: getRequirementP1(r.topic, level, questions.length + 1, grade || 12)
      });
      return {
        ...r,
        ...syncRowCountsFromP1(questions),
        p1_questions: questions
      };
    }));
    setExpandedP1Rows(prev => ({ ...prev, [rowId]: true }));
  };

  const handleRemoveP1Question = (rowId: string, qIdx: number) => {
    setMatrixRows(matrixRows.map(r => {
      if (r.id !== rowId) return r;
      const questions = [...getRowP1Questions(r)].filter((_, idx) => idx !== qIdx);
      return {
        ...r,
        ...syncRowCountsFromP1(questions),
        p1_questions: questions
      };
    }));
  };

  const handleUpdateP3Count = (rowId: string, level: CognitiveLevel, newCount: number) => {
    setMatrixRows(matrixRows.map(r => {
      if (r.id !== rowId) return r;
      const current = [...getRowP3Questions(r)];
      const withLevel = current.filter(q => q.level === level);
      const diff = newCount - withLevel.length;
      let updated = [...current];
      if (diff > 0) {
        for (let i = 0; i < diff; i++) {
          updated.push({
            id: `p3_${r.id}_${level.toLowerCase()}_${Date.now()}_${i}`,
            level,
            prompt: getRequirementP3(r.topic, level, updated.length + 1, grade || 12)
          });
        }
      } else if (diff < 0) {
        let toRemove = Math.abs(diff);
        for (let i = updated.length - 1; i >= 0 && toRemove > 0; i--) {
          if (updated[i].level === level) {
            updated.splice(i, 1);
            toRemove--;
          }
        }
      }
      return {
        ...r,
        ...syncRowCountsFromP3(updated),
        p3_questions: updated
      };
    }));
  };

  const handleUpdateP3QuestionPrompt = (rowId: string, qIdx: number, prompt: string) => {
    setMatrixRows(matrixRows.map(r => {
      if (r.id !== rowId) return r;
      const questions = [...getRowP3Questions(r)];
      if (questions[qIdx]) {
        questions[qIdx] = { ...questions[qIdx], prompt };
      }
      return { ...r, p3_questions: questions };
    }));
  };

  const handleUpdateP3QuestionLevel = (rowId: string, qIdx: number, level: CognitiveLevel) => {
    setMatrixRows(matrixRows.map(r => {
      if (r.id !== rowId) return r;
      const questions = [...getRowP3Questions(r)];
      if (questions[qIdx]) {
        questions[qIdx] = { ...questions[qIdx], level };
      }
      return {
        ...r,
        ...syncRowCountsFromP3(questions),
        p3_questions: questions
      };
    }));
  };

  const handleApplyP3Preset = (rowId: string, qIdx: number, presetId: string) => {
    const preset = PART3_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setMatrixRows(matrixRows.map(r => {
      if (r.id !== rowId) return r;
      const questions = [...getRowP3Questions(r)];
      if (questions[qIdx]) {
        questions[qIdx] = {
          ...questions[qIdx],
          presetId: preset.id,
          prompt: preset.prompt,
          level: preset.level
        };
      }
      return {
        ...r,
        ...syncRowCountsFromP3(questions),
        p3_questions: questions
      };
    }));
  };

  const handleAddP3Question = (rowId: string, level: CognitiveLevel = 'TH') => {
    setMatrixRows(matrixRows.map(r => {
      if (r.id !== rowId) return r;
      const questions = [...getRowP3Questions(r)];
      questions.push({
        id: `p3_${r.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        level,
        prompt: getRequirementP3(r.topic, level, questions.length + 1, grade || 12)
      });
      return {
        ...r,
        ...syncRowCountsFromP3(questions),
        p3_questions: questions
      };
    }));
    setExpandedP3Rows(prev => ({ ...prev, [rowId]: true }));
  };

  const handleRemoveP3Question = (rowId: string, qIdx: number) => {
    setMatrixRows(matrixRows.map(r => {
      if (r.id !== rowId) return r;
      const questions = [...getRowP3Questions(r)].filter((_, idx) => idx !== qIdx);
      return {
        ...r,
        ...syncRowCountsFromP3(questions),
        p3_questions: questions
      };
    }));
  };

  // Tính số thứ tự câu hỏi Phần II liên tục trên toàn ma trận
  const getOverallP2Index = (targetRowId: string, qIdx: number): number => {
    let count = 0;
    for (const r of matrixRows) {
      if (r.id === targetRowId) {
        return count + qIdx + 1;
      }
      count += (r.p2_questions || []).length;
    }
    return count + 1;
  };

  // Thao tác với Ma trận
  const handleAddMatrixRow = () => {
    const newRow: MatrixTopicRow = {
      id: `m_${Date.now()}`,
      topic: 'Chủ đề kiến thức mới',
      p1_nb: 1, p1_th: 1, p1_vd: 0, p1_vdc: 0,
      p2_questions: [],
      p3_nb: 0, p3_th: 0, p3_vd: 0, p3_vdc: 0
    };
    setMatrixRows([...matrixRows, newRow]);
  };

  const handleUpdateMatrixCell = (id: string, field: keyof MatrixTopicRow, val: any) => {
    setMatrixRows(matrixRows.map(r => r.id === id ? { ...r, [field]: val } : r));
  };

  const handleDeleteMatrixRow = (id: string) => {
    if (matrixRows.length <= 1) {
      alert('Đề thi cần có ít nhất 1 chủ đề kiến thức.');
      return;
    }
    setMatrixRows(matrixRows.filter(r => r.id !== id));
  };

  // State quản lý việc mở rộng / thu gọn chi tiết của từng câu Phần II
  const [expandedP2Cards, setExpandedP2Cards] = useState<Record<string, boolean>>({});
  const toggleExpandP2Card = (cardId: string) => {
    setExpandedP2Cards(prev => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  // Thao tác với Phần II: Thêm câu, Xóa câu, Chọn mức độ từng ý a, b, c, d
  const handleAddP2Question = (rowId: string) => {
    setMatrixRows(matrixRows.map(r => {
      if (r.id !== rowId) return r;
      const newQId = `p2_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newQ: Part2Question = {
        id: newQId,
        stemType: 'custom',
        stemPrompt: '',
        isMultiTopic: false,
        a: 'NB',
        b: 'TH',
        c: 'VD',
        d: 'VDC',
        subItems: {
          a: { topic: r.topic, requirement: getRequirementP2(r.topic, 'a', 'NB', grade || 12) },
          b: { topic: r.topic, requirement: getRequirementP2(r.topic, 'b', 'TH', grade || 12) },
          c: { topic: r.topic, requirement: getRequirementP2(r.topic, 'c', 'VD', grade || 12) },
          d: { topic: r.topic, requirement: getRequirementP2(r.topic, 'd', 'VDC', grade || 12) }
        }
      };
      return {
        ...r,
        p2_questions: [...(r.p2_questions || []), newQ]
      };
    }));
  };

  const handleRemoveP2Question = (rowId: string, qIdx: number) => {
    setMatrixRows(matrixRows.map(r => {
      if (r.id !== rowId) return r;
      return {
        ...r,
        p2_questions: (r.p2_questions || []).filter((_, idx) => idx !== qIdx)
      };
    }));
  };

  const handleUpdateP2Item = (rowId: string, qIdx: number, letter: 'a' | 'b' | 'c' | 'd', level: CognitiveLevel) => {
    setMatrixRows(matrixRows.map(r => {
      if (r.id !== rowId) return r;
      const updatedQuestions = [...(r.p2_questions || [])];
      if (updatedQuestions[qIdx]) {
        const curQ = updatedQuestions[qIdx];
        const subTopic = (curQ.isMultiTopic && curQ.subItems?.[letter]?.topic) ? curQ.subItems[letter]!.topic! : r.topic;
        const newReq = getRequirementP2(subTopic, letter, level, grade || 12);
        updatedQuestions[qIdx] = {
          ...curQ,
          [letter]: level,
          subItems: {
            ...curQ.subItems,
            [letter]: {
              topic: subTopic,
              requirement: curQ.subItems?.[letter]?.requirement || newReq
            }
          }
        };
      }
      return {
        ...r,
        p2_questions: updatedQuestions
      };
    }));
  };

  const handleApplyP2Preset = (rowId: string, qIdx: number, preset: 'standard' | 'basic' | 'advanced') => {
    setMatrixRows(matrixRows.map(r => {
      if (r.id !== rowId) return r;
      const updatedQuestions = [...(r.p2_questions || [])];
      if (updatedQuestions[qIdx]) {
        let newLevels: { a: CognitiveLevel; b: CognitiveLevel; c: CognitiveLevel; d: CognitiveLevel };
        if (preset === 'standard') {
          newLevels = { a: 'NB', b: 'TH', c: 'VD', d: 'VDC' };
        } else if (preset === 'basic') {
          newLevels = { a: 'NB', b: 'NB', c: 'TH', d: 'VD' };
        } else {
          newLevels = { a: 'TH', b: 'TH', c: 'VD', d: 'VDC' };
        }
        updatedQuestions[qIdx] = { ...updatedQuestions[qIdx], ...newLevels };
      }
      return { ...r, p2_questions: updatedQuestions };
    }));
  };

  // Cập nhật nội dung câu dẫn của câu Phần II
  const handleUpdateP2Stem = (rowId: string, qIdx: number, stemPrompt: string) => {
    setMatrixRows(matrixRows.map(r => {
      if (r.id !== rowId) return r;
      const updatedQuestions = [...(r.p2_questions || [])];
      if (updatedQuestions[qIdx]) {
        updatedQuestions[qIdx] = {
          ...updatedQuestions[qIdx],
          stemPrompt,
          stemType: 'custom'
        };
      }
      return { ...r, p2_questions: updatedQuestions };
    }));
  };

  // Chuyển đổi chế độ Đơn chủ đề <-> Đa chủ đề cho câu Phần II
  const handleToggleP2MultiTopic = (rowId: string, qIdx: number) => {
    setMatrixRows(matrixRows.map(r => {
      if (r.id !== rowId) return r;
      const updatedQuestions = [...(r.p2_questions || [])];
      if (updatedQuestions[qIdx]) {
        const curQ = updatedQuestions[qIdx];
        const nextVal = !curQ.isMultiTopic;
        updatedQuestions[qIdx] = {
          ...curQ,
          isMultiTopic: nextVal,
          subItems: {
            a: { topic: curQ.subItems?.a?.topic || r.topic, requirement: curQ.subItems?.a?.requirement || getRequirementP2(r.topic, 'a', curQ.a, grade || 12) },
            b: { topic: curQ.subItems?.b?.topic || r.topic, requirement: curQ.subItems?.b?.requirement || getRequirementP2(r.topic, 'b', curQ.b, grade || 12) },
            c: { topic: curQ.subItems?.c?.topic || r.topic, requirement: curQ.subItems?.c?.requirement || getRequirementP2(r.topic, 'c', curQ.c, grade || 12) },
            d: { topic: curQ.subItems?.d?.topic || r.topic, requirement: curQ.subItems?.d?.requirement || getRequirementP2(r.topic, 'd', curQ.d, grade || 12) }
          }
        };
        if (nextVal) {
          setExpandedP2Cards(prev => ({ ...prev, [curQ.id]: true }));
        }
      }
      return { ...r, p2_questions: updatedQuestions };
    }));
  };

  // Áp dụng mẫu gợi ý câu dẫn từ thư viện STEM_PRESETS
  const handleApplyStemPreset = (rowId: string, qIdx: number, presetId: string) => {
    const preset = STEM_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setMatrixRows(matrixRows.map(r => {
      if (r.id !== rowId) return r;
      const updatedQuestions = [...(r.p2_questions || [])];
      if (updatedQuestions[qIdx]) {
        const curQ = updatedQuestions[qIdx];
        updatedQuestions[qIdx] = {
          ...curQ,
          stemType: preset.id,
          stemPrompt: preset.stemPrompt,
          isMultiTopic: !!preset.isMultiTopic,
          a: preset.suggestedLevels.a,
          b: preset.suggestedLevels.b,
          c: preset.suggestedLevels.c,
          d: preset.suggestedLevels.d,
          subItems: {
            a: { topic: preset.items.a.topic, requirement: preset.items.a.requirement },
            b: { topic: preset.items.b.topic, requirement: preset.items.b.requirement },
            c: { topic: preset.items.c.topic, requirement: preset.items.c.requirement },
            d: { topic: preset.items.d.topic, requirement: preset.items.d.requirement }
          }
        };
        setExpandedP2Cards(prev => ({ ...prev, [curQ.id]: true }));
      }
      return { ...r, p2_questions: updatedQuestions };
    }));
    setCopySuccess(`Đã áp dụng mẫu câu dẫn: "${preset.name}"!`);
    setTimeout(() => setCopySuccess(null), 3000);
  };

  // Cập nhật chủ đề hoặc yêu cầu cần đạt chi tiết cho từng ý a, b, c, d
  const handleUpdateP2SubItemDetail = (
    rowId: string, 
    qIdx: number, 
    letter: 'a' | 'b' | 'c' | 'd', 
    field: 'topic' | 'requirement', 
    val: string
  ) => {
    setMatrixRows(matrixRows.map(r => {
      if (r.id !== rowId) return r;
      const updatedQuestions = [...(r.p2_questions || [])];
      if (updatedQuestions[qIdx]) {
        const curQ = updatedQuestions[qIdx];
        const existingDetail = curQ.subItems?.[letter] || { topic: r.topic, requirement: '' };
        updatedQuestions[qIdx] = {
          ...curQ,
          subItems: {
            ...curQ.subItems,
            [letter]: {
              ...existingDetail,
              [field]: val
            }
          }
        };
      }
      return { ...r, p2_questions: updatedQuestions };
    }));
  };

  // Chọn mẫu Ma trận có sẵn
  const handleApplyPresetMatrix = (preset: 'gk1' | 'ck1' | 'thpt') => {
    if (preset === 'gk1') {
      setMatrixRows([
        {
          id: 'm_gk1_1',
          topic: 'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số',
          p1_nb: 6, p1_th: 4, p1_vd: 1, p1_vdc: 0,
          p2_questions: [
            { id: 'q_gk1_1', a: 'NB', b: 'TH', c: 'VD', d: 'VDC' },
            { id: 'q_gk1_2', a: 'NB', b: 'TH', c: 'TH', d: 'VD' }
          ],
          p3_nb: 0, p3_th: 1, p3_vd: 1, p3_vdc: 1
        },
        {
          id: 'm_gk1_2',
          topic: 'Toạ độ trong không gian Oxyz & Vectơ không gian',
          p1_nb: 1, p1_th: 0, p1_vd: 0, p1_vdc: 0,
          p2_questions: [
            { id: 'q_gk1_3', a: 'NB', b: 'TH', c: 'VD', d: 'VDC' },
            { id: 'q_gk1_4', a: 'TH', b: 'TH', c: 'VD', d: 'VDC' }
          ],
          p3_nb: 0, p3_th: 1, p3_vd: 1, p3_vdc: 1
        }
      ]);
    } else if (preset === 'ck1') {
      setMatrixRows([
        {
          id: 'm_ck1_1',
          topic: 'Ứng dụng đạo hàm khảo sát hàm số',
          p1_nb: 4, p1_th: 3, p1_vd: 1, p1_vdc: 0,
          p2_questions: [
            { id: 'q_ck1_1', a: 'NB', b: 'TH', c: 'VD', d: 'VDC' },
            { id: 'q_ck1_2', a: 'NB', b: 'TH', c: 'TH', d: 'VD' }
          ],
          p3_nb: 0, p3_th: 1, p3_vd: 1, p3_vdc: 0
        },
        {
          id: 'm_ck1_2',
          topic: 'Phương pháp toạ độ trong không gian Oxyz',
          p1_nb: 2, p1_th: 2, p1_vd: 0, p1_vdc: 0,
          p2_questions: [
            { id: 'q_ck1_3', a: 'NB', b: 'TH', c: 'VD', d: 'VDC' }
          ],
          p3_nb: 0, p3_th: 0, p3_vd: 1, p3_vdc: 1
        },
        {
          id: 'm_ck1_3',
          topic: 'Các số đặc trưng đo mức độ phân tán mẫu số liệu ghép nhóm',
          p1_nb: 0, p1_th: 0, p1_vd: 0, p1_vdc: 0,
          p2_questions: [
            { id: 'q_ck1_4', a: 'TH', b: 'TH', c: 'VD', d: 'VDC' }
          ],
          p3_nb: 0, p3_th: 1, p3_vd: 0, p3_vdc: 1
        }
      ]);
    } else {
      setMatrixRows(getDefaultMatrixRows12());
    }
    setCopySuccess('Đã áp dụng mẫu ma trận đề thi!');
    setTimeout(() => setCopySuccess(null), 3000);
  };

  // =========================================================================
  // LOGIC BẢN ĐẶC TẢ MA TRẬN (BƯỚC 3)
  // =========================================================================

  const handleAddSpecItem = () => {
    const newItem: SpecItem = {
      id: `s_${Date.now()}`,
      topic: matrixRows[0]?.topic || 'Chủ đề',
      unit: 'Đơn vị bài học mới',
      questionRef: 'Câu hỏi mới',
      level: 'TH',
      requirement: 'Mô tả yêu cầu cần đạt theo chuẩn chương trình GDPT 2018.'
    };
    setSpecItems([...specItems, newItem]);
  };

  const handleUpdateSpecItem = (id: string, field: keyof SpecItem, val: any) => {
    setSpecItems(specItems.map(item => item.id === id ? { ...item, [field]: val } : item));
  };

  const handleDeleteSpecItem = (id: string) => {
    if (specItems.length <= 1) {
      alert('Cần giữ lại ít nhất 1 mục đặc tả.');
      return;
    }
    setSpecItems(specItems.filter(item => item.id !== id));
  };

  // Tự động tạo bản đặc tả từ Ma trận Bước 2 (Bao gồm chi tiết từng ý a, b, c, d của Phần II)
  const handleSyncSpecFromMatrix = (showToast = true) => {
    const generated = generateSpecFromMatrix(matrixRows, specItems, grade);
    if (generated.length > 0) {
      setSpecItems(generated);
      if (showToast) {
        setCopySuccess(`Đã đồng bộ ${generated.length} mục đặc tả tương ứng chuẩn xác 100% với Ma trận Bước 2!`);
        setTimeout(() => setCopySuccess(null), 3500);
      }
    }
  };

  const filteredSpecItems = specFilter === 'ALL' 
    ? specItems 
    : specItems.filter(item => item.level === specFilter);

  // =========================================================================
  // DÁN ẢNH & COPY CLIPBOARD 300 DPI
  // =========================================================================

  const handleCopyImage = async (dataUrl: string, label: string) => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const blobWithDpi = await addDpiToBlob(blob, 300);
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blobWithDpi })
      ]);
      setCopySuccess(`Đã copy ảnh ${label} vào Clipboard! Dán (Ctrl+V) vào Word sẽ có kích thước vừa vặn và chữ to rõ nét.`);
      setTimeout(() => setCopySuccess(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Không thể sao chép ảnh trực tiếp vào Clipboard. Bạn có thể bấm chuột phải chọn "Sao chép hình ảnh" hoặc bấm Tải PNG.');
    }
  };

  const handleDownloadImage = async (dataUrl: string, filename: string) => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const blobWithDpi = await addDpiToBlob(blob, 300);
      const url = URL.createObjectURL(blobWithDpi);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.click();
    }
  };

  const handleInsertImageToQuestion = (targetQ: string, dataUrl: string, altText: string) => {
    const mdImage = `\n\n![${altText}](${dataUrl})\n\n`;
    const cleanQ = targetQ.trim();
    const qNumMatch = cleanQ.match(/\d+/);
    const qNum = qNumMatch ? qNumMatch[0] : '1';

    const targetPattern = new RegExp(`((?:<b>|\\*\\*|^|\\s)Câu\\s*${qNum}[\\.:\\b])`, 'i');
    const match = examMarkdown.match(targetPattern);

    if (match && match.index !== undefined) {
      const qStartIndex = match.index;
      const rest = examMarkdown.slice(qStartIndex + match[0].length);
      const nextQSearch = rest.search(/(?:<b>|\*\*|^)\s*(?:Câu\s+\d+|###\s*PHẦN|---|---------------------------HẾT)/i);
      const qBlockEnd = nextQSearch !== -1 ? qStartIndex + match[0].length + nextQSearch : examMarkdown.length;
      const qBlock = examMarkdown.slice(qStartIndex, qBlockEnd);

      const imgRegex = /(!\[.*?\]\(.*?\)|\[(?:Bảng biến thiên|Đồ thị|Hình vẽ).*?\]|\((?:Hình vẽ|Bảng biến thiên).*?\))/i;
      const imgInBlock = qBlock.match(imgRegex);

      if (imgInBlock && imgInBlock.index !== undefined) {
        const replaceStart = qStartIndex + imgInBlock.index;
        const replaceEnd = replaceStart + imgInBlock[0].length;
        const updated = examMarkdown.slice(0, replaceStart) + `\n\n![${altText}](${dataUrl})\n\n` + examMarkdown.slice(replaceEnd);
        setExamMarkdown(updated);
        setCopySuccess(`Đã thay thế và dán ảnh thành công vào ${cleanQ}!`);
      } else {
        const optionSearch = qBlock.search(/\n\s*(?:[A-D]\.|\([A-D]\)|[a-d]\))/);
        let insertPoint = qBlockEnd;
        if (optionSearch !== -1) {
          insertPoint = qStartIndex + optionSearch;
        }
        const updated = examMarkdown.slice(0, insertPoint) + mdImage + examMarkdown.slice(insertPoint);
        setExamMarkdown(updated);
        setCopySuccess(`Đã dán ảnh thành công vào ${cleanQ}!`);
      }
    } else {
      const hetIndex = examMarkdown.indexOf('---------------------------HẾT------------------------');
      if (hetIndex !== -1) {
        const updated = examMarkdown.slice(0, hetIndex) + `\n\n**${cleanQ}:**\n` + mdImage + '\n\n' + examMarkdown.slice(hetIndex);
        setExamMarkdown(updated);
      } else {
        setExamMarkdown(prev => prev + `\n\n**${cleanQ}:**\n` + mdImage);
      }
      setCopySuccess(`Đã chèn ảnh vào ${cleanQ}!`);
    }
    setTimeout(() => setCopySuccess(null), 3000);
  };

  const handleRemoveImageFromQuestion = (targetQ: string) => {
    const cleanQ = targetQ.trim();
    const qNumMatch = cleanQ.match(/\d+/);
    const qNum = qNumMatch ? qNumMatch[0] : '1';
    const targetPattern = new RegExp(`((?:<b>|\\*\\*|^|\\s)Câu\\s*${qNum}[\\.:\\b])`, 'i');
    const match = examMarkdown.match(targetPattern);

    if (match && match.index !== undefined) {
      const qStartIndex = match.index;
      const rest = examMarkdown.slice(qStartIndex + match[0].length);
      const nextQSearch = rest.search(/(?:<b>|\*\*|^)\s*(?:Câu\s+\d+|###\s*PHẦN|---|---------------------------HẾT)/i);
      const qBlockEnd = nextQSearch !== -1 ? qStartIndex + match[0].length + nextQSearch : examMarkdown.length;
      const qBlock = examMarkdown.slice(qStartIndex, qBlockEnd);

      const imgRegex = /(!\[.*?\]\(.*?\))/i;
      const imgInBlock = qBlock.match(imgRegex);

      if (imgInBlock && imgInBlock.index !== undefined) {
        const replaceStart = qStartIndex + imgInBlock.index;
        const replaceEnd = replaceStart + imgInBlock[0].length;
        const updated = examMarkdown.slice(0, replaceStart) + `\n\n![Bảng biến thiên]()\n\n` + examMarkdown.slice(replaceEnd);
        setExamMarkdown(updated);
        setCopySuccess(`Đã gỡ ảnh của ${cleanQ}. Bạn có thể vẽ lại theo gợi ý!`);
        setTimeout(() => setCopySuccess(null), 3000);
      }
    }
  };

  // =========================================================================
  // SINH ĐỀ AI GEMINI
  // =========================================================================

  const handleGenerateExamAI = async () => {
    if (!apiKey) {
      alert('Vui lòng nhập Gemini API Key ở góc trên bên phải để sử dụng tính năng sinh đề AI.');
      return;
    }
    setIsGeneratingAI(true);
    try {
      // 1. Tổng hợp cấu hình Phần I từ ma trận kèm mô tả chi tiết từng câu
      let p1TopicDetails = '';
      let p1Index = 1;
      matrixRows.forEach(row => {
        const qList = getRowP1Questions(row);
        if (qList.length > 0) {
          p1TopicDetails += `\n* Chủ đề: "${row.topic}" (${qList.length} câu):\n`;
          qList.forEach(q => {
            const desc = q.prompt ? `Mô tả yêu cầu: "${q.prompt}"` : `Yêu cầu: ${getRequirementP1(row.topic, q.level, p1Index, grade || 12)}`;
            p1TopicDetails += `  - Câu ${p1Index} [Mức độ ${q.level}]: ${desc}\n`;
            p1Index++;
          });
        }
      });

      // 2. Tổng hợp cấu hình Phần II (kèm ngữ cảnh câu dẫn, mức độ từng ý, đa chủ đề)
      let part2Description = '';
      let p2Index = 1;
      matrixRows.forEach(row => {
        (row.p2_questions || []).forEach(q => {
          const stemInfo = q.stemPrompt ? `Ngữ cảnh câu dẫn: "${q.stemPrompt}"` : `Ngữ cảnh: Theo chủ đề "${row.topic}"`;
          const multiTag = q.isMultiTopic ? ' [Đa chủ đề / Tích hợp thực tế]' : ' [Đơn chủ đề]';
          part2Description += `\n- Câu ${p2Index} (Đúng/Sai)${multiTag}:\n  * ${stemInfo}\n`;
          (['a', 'b', 'c', 'd'] as const).forEach(letter => {
            const subTopic = (q.isMultiTopic && q.subItems?.[letter]?.topic) ? q.subItems[letter]!.topic! : row.topic;
            const subReq = q.subItems?.[letter]?.requirement || getRequirementP2(subTopic, letter, q[letter], grade || 12);
            part2Description += `    + Ý ${letter}) [Mức độ ${q[letter]}] (Chủ đề: ${subTopic}): ${subReq}\n`;
          });
          p2Index++;
        });
      });

      // 3. Tổng hợp cấu hình Phần III từ ma trận kèm mô tả chi tiết từng câu
      let p3TopicDetails = '';
      let p3Index = 1;
      matrixRows.forEach(row => {
        const qList = getRowP3Questions(row);
        if (qList.length > 0) {
          p3TopicDetails += `\n* Chủ đề: "${row.topic}" (${qList.length} câu):\n`;
          qList.forEach(q => {
            const desc = q.prompt ? `Mô tả yêu cầu: "${q.prompt}"` : `Yêu cầu: ${getRequirementP3(row.topic, q.level, p3Index, grade || 12)}`;
            p3TopicDetails += `  - Câu ${p3Index} [Mức độ ${q.level}]: ${desc}\n`;
            p3Index++;
          });
        }
      });

      const answerPrompt = answerFormat === 'inline'
        ? `III. YÊU CẦU BẮT BUỘC VỀ ĐÁP ÁN & LỜI GIẢI (THEO MẪU ĐỀ RÚT GỌN - GẠCH CHÂN ĐÁP ÁN ĐÚNG LIỀN CÂU):
Thay vì có bảng đáp án ở cuối, hãy trình bày đáp án và lời giải liền ngay sau mỗi câu hỏi:

1. PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn:
- Gạch chân đáp án đúng bằng thẻ <u>...</u> (Ví dụ: <u>A.</u> Số 2 là số nguyên.   B. Số 2 là số hữu tỉ.)
- Ngay dưới các phương án, ghi:
Lời giải:
Mệnh đề A đúng vì...

2. PHẦN II. Câu trắc nghiệm đúng sai:
- Gạch chân các ý ĐÚNG bằng thẻ <u>...</u> (Ví dụ nếu ý a và c đúng thì ghi: <u>a)</u> ..., b) ..., <u>c)</u> ..., d) ...)
- Ngay dưới 4 ý, ghi:
Lời giải
A đúng vì.... (hoặc a) Đúng vì...)

3. PHẦN III. Câu trắc nghiệm trả lời ngắn:
- Ngay dưới câu hỏi, ghi:
Lời giải
Đáp án: [Giá trị đáp án, ví dụ: 5 hoặc 31]
Giải thích:
Ta có như sau:....`
        : `III. YÊU CẦU BẮT BUỘC VỀ ĐÁP ÁN & LỜI GIẢI (TUYỆT ĐỐI THEO MẪU HỆ THỐNG - mau_de_he_thong):
Sau khi kết thúc các câu hỏi của đề thi, BẮT BUỘC PHẢI CÓ DÒNG PHÂN CÁCH NÀY TRƯỚC TIÊN:
---------------------------HẾT------------------------

Sau đó, phần BẢNG ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT BẮT BUỘC TRÌNH BÀY CHÍNH XÁC 100% THEO CẤU TRÚC 3 PHẦN DƯỚI ĐÂY (KHÔNG ĐƯỢC THAY ĐỔI CẤU TRÚC BẢNG VÀ TIÊU ĐỀ):

PHẦN I. Câu trắc nghiệm một đáp án đúng 
| Câu   | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10   | 11   | 12   |
| Chọn   | D   | A   | ... |

Lời giải
Câu 1: A đúng vì….	
Câu 2: B đúng vì….	

PHẦN II. Câu trắc nghiệm đúng sai. 
| Câu 1   | Câu 2   | Câu 3   | Câu 4   |
| a) Đ   | a) Đ   | a) Đ   | a) Đ   |
| b) S   | b) S   | b) S   | b) S   |
| c) S   | c) S   | c) S   | c) S   |
| d) Đ   | d) S   | d) Đ   | d) Đ   |

Lời giải
Câu 1: A đúng vì….	
Câu 2: B đúng vì….	

PHẦN III. Câu trắc nghiệm trả lời ngắn. 
| Câu   | 1   | 2   | 3   | 4   | 5   | 6   |
| Chọn   | 10   | 31   | ... |

Lời giải
Câu 1: Ta có ….	
Câu 2: Ta có ….	`;

      const prompt = `Bạn là chuyên gia khảo thí hàng đầu của Bộ GD&ĐT Việt Nam. Hãy soạn một ĐỀ THI TOÁN ${grade || 12} THEO ĐÚNG CẤU TRÚC CÔNG VĂN 7991 MỚI NHẤT VÀ BÁM SÁT 100% MA TRẬN & BẢN ĐẶC TẢ SAU:

I. CẤU TRÚC ĐỀ THI:
1. PHẦN I: Câu trắc nghiệm nhiều phương án lựa chọn (Gồm 12 câu, mỗi câu 4 phương án A, B, C, D; chọn 1 phương án đúng):
${p1TopicDetails}

2. PHẦN II: Câu trắc nghiệm đúng/sai (Gồm ${p2Index - 1} câu, mỗi câu có 4 ý a, b, c, d; học sinh xét tính đúng hoặc sai của từng ý):
${part2Description}

3. PHẦN III: Câu trắc nghiệm trả lời ngắn (Gồm 6 câu hỏi yêu cầu giải và điền kết quả số):
${p3TopicDetails}

II. YÊU CẶU ĐẶC BIỆT KHI SOẠN THẢO:
- BÁM SÁT 100% mô tả yêu cầu câu hỏi của Phần I, Phần II và Phần III như đã quy định ở trên.
- Soạn thảo chuẩn Markdown và ký hiệu Toán học LaTeX đặt trong cặp dấu $...$ (ví dụ: $y = ax^3 + bx^2 + cx + d$).
- Có ít nhất 2 câu khảo sát hàm số yêu cầu bảng biến thiên hoặc đồ thị (sử dụng placeholder ![Bảng biến thiên]() hoặc ![Đồ thị hàm số]() để hệ thống tự động sinh ảnh 300 DPI).
- Có ít nhất 1 câu hình học không gian (khối chóp, lăng trụ, Oxyz).

${answerPrompt}`;

      const result = await callGeminiAI(prompt, model);
      if (result) {
        const imgs = generateDefaultExamImages();
        let formatted = result;
        if (!formatted.includes('data:image')) {
          if (imgs.bbtDataUrl) {
            formatted = formatted.replace(
              /(!\[(?:Bảng biến thiên|BBT)\]\(\s*\)|\[(?:Bảng biến thiên|BBT)\])/i,
              `![Bảng biến thiên](${imgs.bbtDataUrl})`
            );
          }
          if (imgs.graphDataUrl) {
            formatted = formatted.replace(
              /(!\[(?:Đồ thị|Đồ thị hàm số)\]\(\s*\)|\[(?:Đồ thị|Đồ thị hàm số)\])/i,
              `![Đồ thị hàm số](${imgs.graphDataUrl})`
            );
          }
        }
        setExamMarkdown(formatted);
        setCurrentStep(4);
      }
    } catch (err: any) {
      alert('Lỗi sinh đề AI: ' + (err.message || 'Không thể kết nối API'));
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // =========================================================================
  // XUẤT FILE WORD (.DOCX) CHUẨN CV 7991
  // =========================================================================

  const handleExportWord = async (mode: 'exam' | 'full' = 'exam') => {
    try {
      const docParagraphs: (Paragraph | Table)[] = [];

      // 1. Tiêu đề hành chính chuẩn văn bản
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
                      new TextRun({ text: examInfo.school.toUpperCase(), bold: true, size: 24, font: 'Times New Roman' }),
                    ]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: examInfo.department.toUpperCase(), bold: true, size: 24, font: 'Times New Roman' }),
                    ]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: `Mã đề thi: ${examInfo.examCode}`, italics: true, size: 22, font: 'Times New Roman' }),
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
                      new TextRun({ text: examInfo.examTitle.toUpperCase(), bold: true, size: 24, font: 'Times New Roman' }),
                    ]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: `${examInfo.subject} - ${examInfo.academicYear}`, bold: true, size: 24, font: 'Times New Roman' }),
                    ]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: `Thời gian làm bài: ${examInfo.duration}`, italics: true, size: 22, font: 'Times New Roman' }),
                    ]
                  }),
                ]
              }),
            ]
          })
        ]
      });

      docParagraphs.push(headerTable);
      docParagraphs.push(new Paragraph({ text: '', spacing: { after: 200 } }));

      // 2. NẾU XUẤT TRỌN BỘ: ĐÍNH KÈM MA TRẬN & BẢN ĐẶC TẢ
      if (mode === 'full') {
        docParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({ text: 'A. MA TRẬN ĐỀ KIỂM TRA ĐÁNH GIÁ ĐỊNH KỲ', bold: true, size: 28, font: 'Times New Roman' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            children: [
              new TextRun({ text: `(Chuẩn cấu trúc Công văn 7991/BGDĐT-GDTrH - Tổng điểm: 10,0 điểm)`, italics: true, size: 22, font: 'Times New Roman' })
            ]
          })
        );

        // Bảng Ma trận Docx
        const matrixDocxRows: TableRow[] = [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'TT', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 5, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Chủ đề / Mạch kiến thức', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Phần I (TN 4 lựa chọn)\nNB - TH - VD', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 20, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Phần II (Đúng/Sai theo từng ý a,b,c,d)\nNB - TH - VD - VDC', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 25, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Phần III (Trả lời ngắn)\nTH - VD - VDC', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 20, type: WidthType.PERCENTAGE } }),
            ]
          }),
          ...matrixRows.map((r, idx) => {
            const p2Text = (r.p2_questions || []).map((q, qIndex) => {
              const qNum = getOverallP2Index(r.id, qIndex);
              const stemNote = q.stemPrompt ? `\n   [Dẫn: ${q.stemPrompt}]` : '';
              return `Câu ${qNum}${stemNote}: a(${q.a}), b(${q.b}), c(${q.c}), d(${q.d})`;
            }).join('\n') || '0 câu';

            return new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${idx + 1}`, size: 22, font: 'Times New Roman' })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.topic, size: 22, font: 'Times New Roman' })] })] }),
                new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${getP1Total(r)} câu (${(getP1Total(r) * 0.25).toFixed(2)}đ)`, size: 22, font: 'Times New Roman' })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${getP2Count(r)} câu (${getP2Score(r).toFixed(1)}đ):\n${p2Text}`, size: 20, font: 'Times New Roman' })] })] }),
                new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${getP3Total(r)} câu (${(getP3Total(r) * 0.5).toFixed(1)}đ)`, size: 22, font: 'Times New Roman' })] })] }),
              ]
            });
          }),
          new TableRow({
            children: [
              new TableCell({ columnSpan: 2, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Tổng cộng:', bold: true, size: 22, font: 'Times New Roman' })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${totalP1} câu (3,0đ)`, bold: true, size: 22, font: 'Times New Roman' })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${totalP2} câu (4,0đ)\n(${totalP2NB} ý NB, ${totalP2TH} ý TH, ${totalP2VD} ý VD, ${totalP2VDC} ý VDC)`, bold: true, size: 20, font: 'Times New Roman' })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${totalP3} câu (3,0đ)`, bold: true, size: 22, font: 'Times New Roman' })] })] }),
            ]
          })
        ];

        docParagraphs.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: matrixDocxRows }));
        docParagraphs.push(new Paragraph({ text: '', spacing: { after: 300 } }));

        // Tiêu đề Bản đặc tả
        docParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({ text: 'B. BẢN ĐẶC TẢ MA TRẬN ĐỀ KIỂM TRA', bold: true, size: 28, font: 'Times New Roman' })
            ]
          })
        );

        const specDocxRows: TableRow[] = [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'TT', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 5, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Chủ đề & Đơn vị bài học', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Mức độ', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 12, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Yêu cầu cần đạt chuẩn SGK GDPT 2018', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 38, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Câu hỏi', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
            ]
          }),
          ...specItems.map((s, idx) => new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${idx + 1}`, size: 22, font: 'Times New Roman' })] })] }),
              new TableCell({ children: [
                new Paragraph({ children: [new TextRun({ text: s.topic, bold: true, size: 22, font: 'Times New Roman' })] }),
                new Paragraph({ children: [new TextRun({ text: s.unit, italics: true, size: 20, font: 'Times New Roman' })] }),
              ] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.level === 'NB' ? 'Nhận biết' : s.level === 'TH' ? 'Thông hiểu' : s.level === 'VD' ? 'Vận dụng' : 'Vận dụng cao', bold: true, size: 20, font: 'Times New Roman' })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: s.requirement, size: 22, font: 'Times New Roman' })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.questionRef, size: 22, font: 'Times New Roman' })] })] }),
            ]
          }))
        ];

        docParagraphs.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: specDocxRows }));
        docParagraphs.push(new Paragraph({ text: '', spacing: { after: 300 } }));

        docParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 140 },
            children: [
              new TextRun({ text: 'C. ĐỀ KIỂM TRA ĐÁNH GIÁ ĐỊNH KỲ', bold: true, size: 28, font: 'Times New Roman' })
            ]
          })
        );
      }

      // 3. Phân tích examMarkdown thành từng đoạn văn và nhúng ảnh
      const lines = examMarkdown.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          docParagraphs.push(new Paragraph({ text: '', spacing: { after: 80 } }));
          continue;
        }

        // Nhận diện cú pháp ảnh Markdown (Cả ảnh base64 lẫn placeholder mô tả)
        const imgMatch = line.match(/!\[(.*?)\](?:\((.*?)\))?/);
        if (imgMatch) {
          const altText = (imgMatch[1] || '').trim();
          const imgUrl = (imgMatch[2] || '').trim();
          let bytes: Uint8Array | null = null;

          if (imgUrl.includes('base64,')) {
            try {
              bytes = dataUrlToBytes(imgUrl);
            } catch (e) {
              console.error('Lỗi chuyển ảnh sang docx:', e);
            }
          }

          // Tự động sinh ảnh vẽ 300 DPI nếu là placeholder không kèm base64
          if (!bytes) {
            bytes = generateAutoDiagramForPlaceholder(altText || line);
          }

          if (bytes) {
            const isGraph = altText.toLowerCase().includes('đồ thị') || altText.toLowerCase().includes('graph') || altText.toLowerCase().includes('oxy');
            const isGeo3D = altText.toLowerCase().includes('hình') || altText.toLowerCase().includes('3d') || altText.toLowerCase().includes('không gian');
            let imgWidth = 400;
            let imgHeight = 168;

            if (isGraph) {
              imgWidth = 270;
              imgHeight = 229;
            } else if (isGeo3D) {
              imgWidth = 290;
              imgHeight = 218;
            }

            docParagraphs.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 140, after: 140 },
                children: [
                  new ImageRun({
                    data: bytes as any,
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

        // Phân tách HẾT đề thi
        if (/^-{3,}\s*HẾT\s*-{3,}$/i.test(line) || line.includes('---------------------------HẾT------------------------')) {
          docParagraphs.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 240, after: 200 },
              children: [
                new TextRun({
                  text: '---------------------------HẾT------------------------',
                  bold: true,
                  font: 'Times New Roman',
                  size: 24
                })
              ]
            })
          );
          continue;
        }

        // Bảng biểu Markdown (| Câu | 1 | 2 | ...)
        if (line.startsWith('|') && line.endsWith('|')) {
          const tableLines: string[] = [];
          let j = i;
          while (j < lines.length && lines[j].trim().startsWith('|') && lines[j].trim().endsWith('|')) {
            tableLines.push(lines[j].trim());
            j++;
          }
          i = j - 1;

          const validRows = tableLines.filter(l => !l.replace(/[|\s-:]/g, '') == false);
          if (validRows.length > 0) {
            const docxRows: TableRow[] = [];
            validRows.forEach((rowStr, rIdx) => {
              const cells = rowStr.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
              if (cells.length > 0) {
                const isHeaderRow = rIdx === 0;
                const tableCells: TableCell[] = cells.map(cellText => {
                  const isCellBold = isHeaderRow || cellText.toLowerCase().includes('câu') || cellText.toLowerCase().includes('chọn');
                  const cellRuns = parseTextAndMathRuns(cellText, isCellBold);
                  return new TableCell({
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                    },
                    margins: { top: 80, bottom: 80, left: 80, right: 80 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: cellRuns
                      })
                    ]
                  });
                });
                docxRows.push(new TableRow({ children: tableCells }));
              }
            });

            if (docxRows.length > 0) {
              docParagraphs.push(
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  alignment: AlignmentType.CENTER,
                  rows: docxRows
                })
              );
              docParagraphs.push(new Paragraph({ text: '', spacing: { after: 120 } }));
            }
          }
          continue;
        }

        if (line.startsWith('#') || line.toUpperCase().includes('PHẦN I') || line.toUpperCase().includes('PHẦN II') || line.toUpperCase().includes('PHẦN III') || line.toUpperCase().includes('ĐÁP ÁN') || line.toUpperCase().includes('HƯỚNG DẪN GIẢI') || line.toUpperCase().includes('BẢNG ĐÁP ÁN')) {
          docParagraphs.push(
            new Paragraph({
              spacing: { before: 180, after: 100 },
              children: [
                new TextRun({
                  text: line.replace(/^#+\s*/, ''),
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

        const isQuestionHeader = /^(\*\*|\*|<b>)?(Câu\s+\d+|Bài\s+\d+)/i.test(line);

        // PHÂN TÍCH TOÀN BỘ CÔNG THỨC TOÁN HỌC THÀNH OFFICE MATH:
        const runs = parseTextAndMathRuns(line, isQuestionHeader);

        docParagraphs.push(
          new Paragraph({
            spacing: { after: 100 },
            alignment: AlignmentType.LEFT,
            children: runs
          })
        );
      }

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1134,
                bottom: 1134,
                left: 1418,
                right: 1134
              }
            }
          },
          children: docParagraphs
        }]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileNameSuffix = mode === 'full' ? 'TronBo_HoSo_MaTran_DacTa_DeThi' : 'DeThi';
      a.download = `${fileNameSuffix}_Toan_CV7991_MaDe_${examInfo.examCode}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Lỗi xuất file Word: ' + err.message);
    }
  };

  // Hàm xuất HTML
  const handleExportHTML = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${examInfo.examTitle}</title>
  <style>
    body { font-family: "Times New Roman", Times, serif; font-size: 13pt; line-height: 1.5; margin: 30px auto; max-width: 850px; color: #111; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    .header-table td { text-align: center; vertical-align: top; }
    .title { font-weight: bold; font-size: 14pt; }
    h2, h3 { font-size: 13pt; margin-top: 20px; font-weight: bold; }
    img { max-width: 100%; height: auto; display: block; margin: 12px auto; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td style="width: 45%;">
        <div class="title">${examInfo.school}</div>
        <div class="title">${examInfo.department}</div>
        <div>Mã đề thi: <strong>${examInfo.examCode}</strong></div>
      </td>
      <td style="width: 55%;">
        <div class="title">${examInfo.examTitle}</div>
        <div class="title">${examInfo.subject}</div>
        <div><em>Thời gian làm bài: ${examInfo.duration}</em></div>
      </td>
    </tr>
  </table>
  <hr style="border: 0.5px solid #000; margin-bottom: 20px;" />
  <div class="content">
    ${examMarkdown
      .replace(/\n\n/g, '<p>')
      .replace(/\n/g, '<br/>')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" />')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    }
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `De_Thi_Toan_CV7991_MaDe_${examInfo.examCode}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#fafafa] dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      
      {/* THANH ĐIỀU HƯỚNG 4 BƯỚC & TÁC VỤ */}
      <div className="bg-white dark:bg-slate-900 border-b border-teal-100 dark:border-slate-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs sticky top-0 z-30">
        
        {/* STEPPER PROGRESS BAR (4 BƯỚC THEO CV 7991) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {[
            { step: 1, label: '1. Thông tin' },
            { step: 2, label: '2. Ma trận' },
            { step: 3, label: '3. Bản đặc tả' },
            { step: 4, label: '4. Đề thi & Soạn thảo' },
          ].map((item, index) => {
            const isCompleted = item.step < currentStep;
            const isCurrent = item.step === currentStep;

            return (
              <React.Fragment key={item.step}>
                <button
                  onClick={() => {
                    if (item.step === 3) {
                      handleSyncSpecFromMatrix(false);
                    }
                    setCurrentStep(item.step as any);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-700 shadow-xs'
                      : isCompleted
                      ? 'text-teal-700 dark:text-teal-400 hover:bg-teal-50/50'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCompleted 
                      ? 'bg-teal-600 text-white' 
                      : isCurrent 
                      ? 'bg-teal-600 text-white' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {isCompleted ? <Check size={11} /> : item.step}
                  </span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
                {index < 3 && (
                  <span className="text-slate-300 dark:text-slate-700 text-xs">/</span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Nút hành động chính */}
        <div className="flex items-center gap-2">
          {/* LỰA CHỌN MẪU ĐÁP ÁN: BẢNG HỆ THỐNG vs MẪU RÚT GỌN */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setAnswerFormat('table');
                if (examMarkdown && !examMarkdown.includes('---------------------------HẾT------------------------')) {
                  const res = toggleExamMarkdownFormat(examMarkdown);
                  if (res.format === 'table') setExamMarkdown(res.newMarkdown);
                }
              }}
              className={`px-2.5 py-1 rounded-lg transition ${answerFormat === 'table' ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-700'}`}
              title="Đáp án trình bày dưới dạng 3 Bảng ở cuối đề sau dòng HẾT (chuẩn mau_de_he_thong)"
            >
              📋 Bảng đáp án cuối đề
            </button>
            <button
              type="button"
              onClick={() => {
                setAnswerFormat('inline');
                if (examMarkdown && examMarkdown.includes('---------------------------HẾT------------------------')) {
                  const res = toggleExamMarkdownFormat(examMarkdown);
                  if (res.format === 'inline') setExamMarkdown(res.newMarkdown);
                }
              }}
              className={`px-2.5 py-1 rounded-lg transition ${answerFormat === 'inline' ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-700'}`}
              title="Đáp án gạch chân <u>A.</u>, <u>a)</u> và lời giải liền sau câu hỏi (Mẫu đề rút gọn)"
            >
              ⚡ Mẫu rút gọn (Gạch chân)
            </button>
          </div>

          <button
            onClick={handleGenerateExamAI}
            disabled={isGeneratingAI}
            className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
            title="Sử dụng trí tuệ nhân tạo Gemini để sinh đề thi hoàn chỉnh theo đúng mẫu đã chọn"
          >
            {isGeneratingAI ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {isGeneratingAI ? 'Đang soạn đề...' : 'AI Soạn đề tự động'}
          </button>

          <button
            onClick={() => handleExportWord('exam')}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition"
            title="Tải đề thi kèm đáp án và hình ảnh 300 DPI sang Word"
          >
            <FileText size={13} className="text-blue-600" />
            Tải Đề thi (.docx)
          </button>

          <button
            onClick={() => handleExportWord('full')}
            className="px-3 py-1.5 bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-700 hover:bg-teal-100 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition"
            title="Tải trọn bộ hồ sơ gồm Ma trận + Bản đặc tả + Đề thi + Đáp án sang Word"
          >
            <BookOpen size={13} className="text-teal-600" />
            Tải Trọn bộ Hồ sơ (.docx)
          </button>

          <button
            onClick={handleExportHTML}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition"
          >
            <Download size={13} className="text-emerald-600" />
            Tải HTML
          </button>
        </div>
      </div>

      {/* NỘI DUNG CHÍNH THEO TỪNG BƯỚC */}
      <div className="flex-1 p-3 sm:p-5 max-w-7xl mx-auto w-full space-y-4">

        {/* THÔNG BÁO COPY THÀNH CÔNG */}
        {copySuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{copySuccess}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* BƯỚC 1: THÔNG TIN ĐỀ THI */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-teal-100 dark:border-slate-800 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FileText size={18} className="text-teal-600" />
              1. Cấu hình thông tin hành chính của Đề thi
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Trường THPT:</label>
                <input
                  type="text"
                  value={examInfo.school}
                  onChange={e => setExamInfo({ ...examInfo, school: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Tổ bộ môn:</label>
                <input
                  type="text"
                  value={examInfo.department}
                  onChange={e => setExamInfo({ ...examInfo, department: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Tên kỳ thi:</label>
                <input
                  type="text"
                  value={examInfo.examTitle}
                  onChange={e => setExamInfo({ ...examInfo, examTitle: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Môn học & Khối lớp:</label>
                <input
                  type="text"
                  value={examInfo.subject}
                  onChange={e => setExamInfo({ ...examInfo, subject: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Thời gian làm bài:</label>
                <input
                  type="text"
                  value={examInfo.duration}
                  onChange={e => setExamInfo({ ...examInfo, duration: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Mã đề:</label>
                <input
                  type="text"
                  value={examInfo.examCode}
                  onChange={e => setExamInfo({ ...examInfo, examCode: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
              >
                Tiếp tục: Xem Ma trận đề thi <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* BƯỚC 2: MA TRẬN ĐỀ THI TƯƠNG TÁC (CHỌN MỨC ĐỘ TỪNG Ý a,b,c,d) */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-teal-100 dark:border-slate-800 shadow-xs space-y-4">
            
            {/* Header và Nút điều khiển nhanh */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Layers size={18} className="text-teal-600" />
                  2. Ma trận Đề thi môn Toán (Chuẩn CV 7991/BGDĐT-GDTrH)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ở <strong>Phần II (Đúng/Sai)</strong>, cho phép lựa chọn mức độ nhận thức chi tiết theo từng ý <strong>a), b), c), d)</strong> cho mỗi câu hỏi.
                </p>
              </div>

              {/* Nút Thêm chủ đề */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAddMatrixRow}
                  className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                >
                  <Plus size={14} /> Thêm chủ đề
                </button>
              </div>
            </div>

            {/* 4 THẺ THỐNG KÊ 4 MỨC ĐỘ ĐÁNH GIÁ (TRỰC QUAN, TỶ LỆ CHUẨN) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60">
                <div className="text-[11px] font-bold text-blue-800 dark:text-blue-300 flex items-center justify-between">
                  <span>Nhận biết (NB)</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-200/70 dark:bg-blue-900 text-[10px]">{pctNB}%</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-black text-blue-900 dark:text-blue-100">{countNB}</span>
                  <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold">lệnh hỏi / câu ({scoreNB.toFixed(2)}đ)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
                <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>Thông hiểu (TH)</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-200/70 dark:bg-emerald-900 text-[10px]">{pctTH}%</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-black text-emerald-900 dark:text-emerald-100">{countTH}</span>
                  <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">lệnh hỏi / câu ({scoreTH.toFixed(2)}đ)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
                <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                  <span>Vận dụng (VD)</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-200/70 dark:bg-amber-900 text-[10px]">{pctVD}%</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-black text-amber-900 dark:text-amber-100">{countVD}</span>
                  <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold">lệnh hỏi / câu ({scoreVD.toFixed(2)}đ)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60">
                <div className="text-[11px] font-bold text-purple-800 dark:text-purple-300 flex items-center justify-between">
                  <span>Vận dụng cao (VDC)</span>
                  <span className="px-1.5 py-0.5 rounded bg-purple-200/70 dark:bg-purple-900 text-[10px]">{pctVDC}%</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-black text-purple-900 dark:text-purple-100">{countVDC}</span>
                  <span className="text-xs text-purple-700 dark:text-purple-300 font-semibold">lệnh hỏi / câu ({scoreVDC.toFixed(2)}đ)</span>
                </div>
              </div>
            </div>

            {/* BẢNG MA TRẬN TƯƠNG TÁC ĐẦY ĐỦ CÁC CỘT */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-teal-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-2.5 text-center w-10">TT</th>
                    <th className="p-2.5 min-w-[180px]">Chủ đề / Mạch kiến thức</th>
                    
                    {/* Phần I */}
                    <th className="p-2 text-center bg-teal-100/50 dark:bg-slate-700/60 min-w-[280px]">
                      <div className="font-extrabold text-teal-950 dark:text-teal-200">
                        Phần I (Nhiều lựa chọn - 0,25đ)
                      </div>
                      <div className="text-[10px] text-teal-800 dark:text-teal-300 font-semibold mt-0.5">
                        Mô tả câu hỏi & mức độ nhận thức
                      </div>
                      <div className="flex justify-around text-[10px] font-normal text-slate-500 dark:text-slate-300 mt-0.5">
                        <span className="w-8 text-center font-bold text-blue-700 dark:text-blue-400">NB</span>
                        <span className="w-8 text-center font-bold text-emerald-700 dark:text-emerald-400">TH</span>
                        <span className="w-8 text-center font-bold text-amber-700 dark:text-amber-400">VD</span>
                      </div>
                    </th>

                    {/* Phần II: Cho phép lựa chọn mức độ từng ý a, b, c, d */}
                    <th className="p-2 text-center bg-emerald-100/60 dark:bg-emerald-950/50 min-w-[320px]">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-950 dark:text-emerald-200 font-extrabold">
                        <CheckSquare size={14} className="text-emerald-600" />
                        Phần II (Đúng / Sai - 1,0đ/câu)
                      </div>
                      <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold mt-0.5">
                        Lựa chọn mức độ theo từng ý a) b) c) d) tương ứng mỗi câu
                      </div>
                    </th>

                    {/* Phần III */}
                    <th className="p-2 text-center bg-amber-100/40 dark:bg-slate-700/30 min-w-[280px]">
                      <div className="font-extrabold text-amber-950 dark:text-amber-200">
                        Phần III (Trả lời ngắn - 0,5đ)
                      </div>
                      <div className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold mt-0.5">
                        Mô tả câu hỏi & mức độ nhận thức
                      </div>
                      <div className="flex justify-around text-[10px] font-normal text-slate-500 dark:text-slate-300 mt-0.5">
                        <span className="w-8 text-center font-bold text-emerald-700 dark:text-emerald-400">TH</span>
                        <span className="w-8 text-center font-bold text-amber-700 dark:text-amber-400">VD</span>
                        <span className="w-8 text-center font-bold text-purple-700 dark:text-purple-400">VDC</span>
                      </div>
                    </th>

                    <th className="p-2.5 text-center w-16">Tổng câu</th>
                    <th className="p-2.5 text-center w-16">Điểm</th>
                    <th className="p-2.5 text-center w-10">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {matrixRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-2 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-2 align-top">
                        <input
                          type="text"
                          value={row.topic}
                          onChange={e => handleUpdateMatrixCell(row.id, 'topic', e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500"
                        />
                      </td>

                      {/* Phần I: LỰA CHỌN MỨC ĐỘ & MÔ TẢ TỪNG CÂU */}
                      <td className="p-2 bg-teal-50/20 dark:bg-slate-800/20 align-top">
                        <div className="space-y-2">
                          {/* Thanh điều khiển số lượng & thu gọn/mở rộng */}
                          <div className="flex items-center justify-between gap-1 bg-teal-50/80 dark:bg-slate-800/80 p-1 rounded-lg border border-teal-200/60 dark:border-slate-700">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="12"
                                value={row.p1_nb}
                                onChange={e => handleUpdateP1Count(row.id, 'NB', parseInt(e.target.value) || 0)}
                                className="w-7 h-6 text-center text-[10px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-blue-700 dark:text-blue-400 outline-none"
                                title="Phần I: Số câu Nhận biết"
                              />
                              <input
                                type="number"
                                min="0"
                                max="12"
                                value={row.p1_th}
                                onChange={e => handleUpdateP1Count(row.id, 'TH', parseInt(e.target.value) || 0)}
                                className="w-7 h-6 text-center text-[10px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-emerald-700 dark:text-emerald-400 outline-none"
                                title="Phần I: Số câu Thông hiểu"
                              />
                              <input
                                type="number"
                                min="0"
                                max="12"
                                value={row.p1_vd}
                                onChange={e => handleUpdateP1Count(row.id, 'VD', parseInt(e.target.value) || 0)}
                                className="w-7 h-6 text-center text-[10px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-amber-700 dark:text-amber-400 outline-none"
                                title="Phần I: Số câu Vận dụng"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleExpandP1Row(row.id)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5 transition ${
                                expandedP1Rows[row.id]
                                  ? 'bg-teal-600 text-white shadow-2xs'
                                  : 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 hover:bg-teal-100 border border-teal-200 dark:border-teal-700'
                              }`}
                              title={expandedP1Rows[row.id] ? "Thu gọn mô tả" : "Mở rộng mô tả câu hỏi"}
                            >
                              <Edit3 size={10} />
                              <span>{getP1Total(row)} câu</span>
                              {expandedP1Rows[row.id] ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            </button>
                          </div>

                          {/* Danh sách các câu hỏi Phần I kèm mô tả */}
                          {expandedP1Rows[row.id] && (
                            <div className="space-y-1.5">
                              {getRowP1Questions(row).map((q, qIndex) => {
                                const qNumber = getOverallP1Index(row.id, qIndex);
                                return (
                                  <div
                                    key={q.id || qIndex}
                                    className="p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-teal-200 dark:border-teal-800/80 shadow-2xs space-y-1"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <div className="flex items-center gap-1">
                                        <span className="w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center text-[9px] font-black shrink-0">
                                          {qNumber}
                                        </span>
                                        <span className="text-[10px] font-extrabold text-slate-800 dark:text-slate-100">
                                          Câu {qNumber}
                                        </span>
                                        <select
                                          value={q.level}
                                          onChange={e => handleUpdateP1QuestionLevel(row.id, qIndex, e.target.value as CognitiveLevel)}
                                          className={`text-[9px] font-black py-0.2 px-1 text-center rounded border outline-none cursor-pointer ${getLevelBadgeClass(q.level)}`}
                                          title="Mức độ nhận thức"
                                        >
                                          <option value="NB">NB</option>
                                          <option value="TH">TH</option>
                                          <option value="VD">VD</option>
                                          <option value="VDC">VDC</option>
                                        </select>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <select
                                          value={q.presetId || ''}
                                          onChange={e => {
                                            if (e.target.value) handleApplyP1Preset(row.id, qIndex, e.target.value);
                                          }}
                                          className="text-[9px] bg-slate-50 dark:bg-slate-900 border border-teal-200 dark:border-teal-700 rounded px-1 py-0.5 text-slate-700 dark:text-slate-200 outline-none max-w-[125px] font-medium truncate"
                                          title="Chọn gợi ý dạng bài mẫu BGDĐT"
                                        >
                                          <option value="">-- Mẫu gợi ý --</option>
                                          {PART1_PRESETS.filter(p => p.grade === (grade || 12) || p.grade === 'both').map(preset => (
                                            <option key={preset.id} value={preset.id}>
                                              {preset.name}
                                            </option>
                                          ))}
                                        </select>

                                        <button
                                          type="button"
                                          onClick={() => handleRemoveP1Question(row.id, qIndex)}
                                          className="p-0.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                          title={`Xóa Câu ${qNumber}`}
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Ô mô tả câu hỏi */}
                                    <input
                                      type="text"
                                      value={q.prompt || ''}
                                      onChange={e => handleUpdateP1QuestionPrompt(row.id, qIndex, e.target.value)}
                                      placeholder="Mô tả câu hỏi để AI sinh đề (VD: Cho BBT tìm khoảng đồng biến...)"
                                      className="w-full px-2 py-0.5 text-[10px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-medium placeholder:text-slate-400"
                                    />
                                  </div>
                                );
                              })}

                              <button
                                type="button"
                                onClick={() => handleAddP1Question(row.id)}
                                className="w-full py-0.5 px-1 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800/80 rounded-md text-[9px] font-bold flex items-center justify-center gap-1 transition"
                              >
                                <Plus size={10} /> Thêm câu Phần I
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Phần II: LỰA CHỌN MỨC ĐỘ THEO TỪNG Ý a) b) c) d) TƯƠNG ỨNG MỖI CÂU */}
                      <td className="p-2 bg-emerald-50/20 dark:bg-emerald-950/20">
                        <div className="space-y-2">
                          {(row.p2_questions || []).map((q, qIndex) => {
                            const qNumber = getOverallP2Index(row.id, qIndex);
                            const isCardExpanded = !!expandedP2Cards[q.id];

                            return (
                              <div 
                                key={q.id || qIndex}
                                className={`p-2.5 bg-white dark:bg-slate-800 rounded-xl border transition-all duration-200 shadow-2xs space-y-2 ${
                                  q.isMultiTopic 
                                    ? 'border-purple-300 dark:border-purple-900/80 ring-1 ring-purple-100 dark:ring-purple-950/40' 
                                    : 'border-emerald-200 dark:border-emerald-800/80'
                                }`}
                              >
                                {/* 1. Header: Số câu, preset mức độ chuẩn/cơ bản, toggle chi tiết & nút xóa */}
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-black shrink-0">
                                      {qNumber}
                                    </span>
                                    <span className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100">
                                      Câu {qNumber}
                                    </span>
                                    {q.isMultiTopic ? (
                                      <span className="px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[9px] font-extrabold border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                                        <Layers size={9} /> Đa chủ đề
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-semibold">
                                        Đơn chủ đề
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {/* Nút chọn nhanh preset phân hóa */}
                                    <div className="flex bg-slate-100 dark:bg-slate-900 rounded p-0.5 text-[9px] font-bold">
                                      <button
                                        type="button"
                                        onClick={() => handleApplyP2Preset(row.id, qIndex, 'standard')}
                                        className="px-1 py-0.2 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                                        title="Chuẩn: a(NB) - b(TH) - c(VD) - d(VDC)"
                                      >
                                        Chuẩn
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleApplyP2Preset(row.id, qIndex, 'basic')}
                                        className="px-1 py-0.2 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                                        title="Cơ bản: a(NB) - b(NB) - c(TH) - d(VD)"
                                      >
                                        Cơ bản
                                      </button>
                                    </div>

                                    {/* Nút Toggle Mở rộng / Thu gọn cấu hình chi tiết */}
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandP2Card(q.id)}
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5 transition ${
                                        isCardExpanded 
                                          ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200' 
                                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                      }`}
                                      title={isCardExpanded ? "Thu gọn tùy biến" : "Mở rộng tùy biến câu dẫn & chủ đề từng ý"}
                                    >
                                      <Sliders size={10} />
                                      {isCardExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveP2Question(row.id, qIndex)}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                      title={`Xóa Câu ${qNumber}`}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>

                                {/* 2. Thanh Gợi ý Câu dẫn (Stem Presets Bar) */}
                                <div className="bg-slate-50 dark:bg-slate-900/70 p-2 rounded-lg border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                                  <div className="flex items-center justify-between gap-1 flex-wrap">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-teal-800 dark:text-teal-300">
                                      <Lightbulb size={12} className="text-amber-500" />
                                      <span>Gợi ý câu dẫn (Stem):</span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      {/* Dropdown chọn preset câu dẫn */}
                                      <select
                                        value={q.stemType || ''}
                                        onChange={e => {
                                          if (e.target.value) {
                                            handleApplyStemPreset(row.id, qIndex, e.target.value);
                                          }
                                        }}
                                        className="text-[10px] bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded px-1.5 py-0.5 text-slate-800 dark:text-slate-200 outline-none max-w-[200px] font-medium"
                                      >
                                        <option value="">-- Chọn câu dẫn mẫu BGDĐT --</option>
                                        {STEM_PRESETS.filter(p => p.grade === (grade || 12) || p.grade === 'both').map(preset => (
                                          <option key={preset.id} value={preset.id}>
                                            {preset.name}
                                          </option>
                                        ))}
                                      </select>

                                      {/* Nút Toggle Đa chủ đề */}
                                      <button
                                        type="button"
                                        onClick={() => handleToggleP2MultiTopic(row.id, qIndex)}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 transition ${
                                          q.isMultiTopic
                                            ? 'bg-purple-600 text-white shadow-2xs'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                                        }`}
                                        title="Bật/Tắt chế độ Đa chủ đề: Cho phép từng ý a, b, c, d liên quan đến các mạch kiến thức khác nhau"
                                      >
                                        <Layers size={9} />
                                        {q.isMultiTopic ? 'Đa chủ đề: BẬT' : 'Đa chủ đề: TẮT'}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Ô Input câu dẫn trực tiếp */}
                                  <input
                                    type="text"
                                    value={q.stemPrompt || ''}
                                    onChange={e => handleUpdateP2Stem(row.id, qIndex, e.target.value)}
                                    placeholder="Nhập hoặc chỉnh sửa câu dẫn (VD: Cho bảng biến thiên hàm bậc 3, Bài toán kinh tế tối ưu chi phí,...)"
                                    className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-medium placeholder:text-slate-400"
                                  />
                                </div>

                                {/* 3. 4 Ô LỰA CHỌN MỨC ĐỘ CHO 4 Ý a), b), c), d) */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                  {(['a', 'b', 'c', 'd'] as const).map(letter => {
                                    const level = q[letter];

                                    return (
                                      <div 
                                        key={letter}
                                        className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/60 p-1 rounded-lg border border-slate-200 dark:border-slate-700"
                                      >
                                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">
                                          {letter})
                                        </span>
                                        <select
                                          value={level}
                                          onChange={e => handleUpdateP2Item(row.id, qIndex, letter, e.target.value as CognitiveLevel)}
                                          className={`flex-1 text-[10px] font-black py-0.5 px-1 text-center rounded-md border outline-none cursor-pointer ${getLevelBadgeClass(level)}`}
                                          title={`Chọn mức độ nhận thức cho ý ${letter}) của Câu ${qNumber}`}
                                        >
                                          <option value="NB" title="Nhận biết">NB</option>
                                          <option value="TH" title="Thông hiểu">TH</option>
                                          <option value="VD" title="Vận dụng">VD</option>
                                          <option value="VDC" title="Vận dụng cao">VDC</option>
                                        </select>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* 4. Panel MỞ RỘNG CHI TIẾT TỪNG Ý (Khi mở rộng hoặc khi bật Đa chủ đề) */}
                                {isCardExpanded && (
                                  <div className="pt-1.5 pb-1 border-t border-slate-200 dark:border-slate-700/80 space-y-1.5">
                                    <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-700 dark:text-slate-300 px-0.5">
                                      <span className="flex items-center gap-1">
                                        <Bookmark size={11} className="text-teal-600" />
                                        Chi tiết dạng bài & yêu cầu cần đạt từng ý:
                                      </span>
                                      {q.isMultiTopic && (
                                        <span className="text-[9px] text-purple-600 dark:text-purple-300 font-bold">
                                          (Có thể chọn chủ đề riêng cho từng ý)
                                        </span>
                                      )}
                                    </div>

                                    <div className="space-y-1.5">
                                      {(['a', 'b', 'c', 'd'] as const).map(letter => {
                                        const detail = q.subItems?.[letter] || {};
                                        const currentTopic = detail.topic || row.topic;
                                        const currentReq = detail.requirement || getRequirementP2(currentTopic, letter, q[letter], grade || 12);
                                        const lessonsList = (KNTT_CURRICULUM?.['Toán học']?.[(grade || 12) === 10 ? 'Lớp 10' : 'Lớp 12']) || [];

                                        return (
                                          <div 
                                            key={letter}
                                            className="p-1.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700/80 text-[10px] space-y-1"
                                          >
                                            <div className="flex items-center justify-between gap-1">
                                              <div className="flex items-center gap-1.5">
                                                <span className="w-4 h-4 rounded bg-slate-700 text-white flex items-center justify-center font-black text-[9px]">
                                                  {letter}
                                                </span>
                                                <span className={`px-1 py-0.2 rounded text-[9px] font-black ${getLevelBadgeClass(q[letter])}`}>
                                                  {q[letter]}
                                                </span>
                                              </div>

                                              {/* Chọn chủ đề riêng cho từng ý nếu ở chế độ Đa chủ đề */}
                                              {q.isMultiTopic ? (
                                                <div className="flex items-center gap-1 flex-1 max-w-[340px]">
                                                  <span className="text-slate-500 font-medium shrink-0 text-[9px]">Chủ đề:</span>
                                                  <select
                                                    value={currentTopic}
                                                    onChange={e => handleUpdateP2SubItemDetail(row.id, qIndex, letter, 'topic', e.target.value)}
                                                    className="w-full text-[10px] bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded px-1 py-0.5 text-purple-900 dark:text-purple-200 font-semibold outline-none"
                                                  >
                                                    <option value={row.topic}>Mặc định: {row.topic}</option>
                                                    {lessonsList.map((ls, idx) => (
                                                      <option key={idx} value={ls}>{ls}</option>
                                                    ))}
                                                  </select>
                                                </div>
                                              ) : (
                                                <span className="text-[9px] text-slate-500 font-medium truncate max-w-[240px]">
                                                  {row.topic}
                                                </span>
                                              )}
                                            </div>

                                            {/* Ô chỉnh sửa yêu cầu cần đạt */}
                                            <input
                                              type="text"
                                              value={currentReq}
                                              onChange={e => handleUpdateP2SubItemDetail(row.id, qIndex, letter, 'requirement', e.target.value)}
                                              placeholder={`Yêu cầu cần đạt cho ý ${letter})...`}
                                              className="w-full px-2 py-0.5 text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 outline-none focus:border-teal-500"
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* 5. Tóm tắt số ý và trạng thái */}
                                <div className="text-[9px] text-slate-500 font-medium flex items-center justify-between pt-0.5 px-0.5">
                                  <span>Phân hóa:</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {countItemsByLevel(q, 'NB')} ý NB • {countItemsByLevel(q, 'TH')} ý TH • {countItemsByLevel(q, 'VD')} ý VD • {countItemsByLevel(q, 'VDC')} ý VDC
                                  </span>
                                </div>
                              </div>
                            );
                          })}

                          {/* Nút Thêm câu Phần II cho chủ đề này */}
                          <div className="flex items-center justify-between pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleAddP2Question(row.id)}
                              className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                            >
                              <Plus size={12} /> Thêm câu Phần II (4 ý a,b,c,d)
                            </button>

                            {(row.p2_questions || []).length > 0 && (
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                {getP2Count(row)} câu ({getP2Score(row).toFixed(1)}đ)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phần III: LỰA CHỌN MỨC ĐỘ & MÔ TẢ TỪNG CÂU */}
                      <td className="p-2 bg-amber-50/20 dark:bg-slate-800/10 align-top">
                        <div className="space-y-2">
                          {/* Thanh điều khiển số lượng & thu gọn/mở rộng */}
                          <div className="flex items-center justify-between gap-1 bg-amber-50/80 dark:bg-slate-800/80 p-1 rounded-lg border border-amber-200/60 dark:border-slate-700">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="6"
                                value={row.p3_th}
                                onChange={e => handleUpdateP3Count(row.id, 'TH', parseInt(e.target.value) || 0)}
                                className="w-7 h-6 text-center text-[10px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-emerald-700 dark:text-emerald-400 outline-none"
                                title="Phần III: Số câu Thông hiểu"
                              />
                              <input
                                type="number"
                                min="0"
                                max="6"
                                value={row.p3_vd}
                                onChange={e => handleUpdateP3Count(row.id, 'VD', parseInt(e.target.value) || 0)}
                                className="w-7 h-6 text-center text-[10px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-amber-700 dark:text-amber-400 outline-none"
                                title="Phần III: Số câu Vận dụng"
                              />
                              <input
                                type="number"
                                min="0"
                                max="6"
                                value={row.p3_vdc}
                                onChange={e => handleUpdateP3Count(row.id, 'VDC', parseInt(e.target.value) || 0)}
                                className="w-7 h-6 text-center text-[10px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-purple-700 dark:text-purple-400 outline-none"
                                title="Phần III: Số câu Vận dụng cao"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleExpandP3Row(row.id)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5 transition ${
                                expandedP3Rows[row.id]
                                  ? 'bg-amber-600 text-white shadow-2xs'
                                  : 'bg-white dark:bg-slate-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 border border-amber-200 dark:border-amber-700'
                              }`}
                              title={expandedP3Rows[row.id] ? "Thu gọn mô tả" : "Mở rộng mô tả câu hỏi"}
                            >
                              <Edit3 size={10} />
                              <span>{getP3Total(row)} câu</span>
                              {expandedP3Rows[row.id] ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            </button>
                          </div>

                          {/* Danh sách các câu hỏi Phần III kèm mô tả */}
                          {expandedP3Rows[row.id] && (
                            <div className="space-y-1.5">
                              {getRowP3Questions(row).map((q, qIndex) => {
                                const qNumber = getOverallP3Index(row.id, qIndex);
                                return (
                                  <div
                                    key={q.id || qIndex}
                                    className="p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-amber-800/80 shadow-2xs space-y-1"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <div className="flex items-center gap-1">
                                        <span className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center text-[9px] font-black shrink-0">
                                          {qNumber}
                                        </span>
                                        <span className="text-[10px] font-extrabold text-slate-800 dark:text-slate-100">
                                          Câu {qNumber}
                                        </span>
                                        <select
                                          value={q.level}
                                          onChange={e => handleUpdateP3QuestionLevel(row.id, qIndex, e.target.value as CognitiveLevel)}
                                          className={`text-[9px] font-black py-0.2 px-1 text-center rounded border outline-none cursor-pointer ${getLevelBadgeClass(q.level)}`}
                                          title="Mức độ nhận thức"
                                        >
                                          <option value="NB">NB</option>
                                          <option value="TH">TH</option>
                                          <option value="VD">VD</option>
                                          <option value="VDC">VDC</option>
                                        </select>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <select
                                          value={q.presetId || ''}
                                          onChange={e => {
                                            if (e.target.value) handleApplyP3Preset(row.id, qIndex, e.target.value);
                                          }}
                                          className="text-[9px] bg-slate-50 dark:bg-slate-900 border border-amber-200 dark:border-amber-700 rounded px-1 py-0.5 text-slate-700 dark:text-slate-200 outline-none max-w-[125px] font-medium truncate"
                                          title="Chọn gợi ý dạng bài mẫu trả lời ngắn"
                                        >
                                          <option value="">-- Mẫu gợi ý --</option>
                                          {PART3_PRESETS.filter(p => p.grade === (grade || 12) || p.grade === 'both').map(preset => (
                                            <option key={preset.id} value={preset.id}>
                                              {preset.name}
                                            </option>
                                          ))}
                                        </select>

                                        <button
                                          type="button"
                                          onClick={() => handleRemoveP3Question(row.id, qIndex)}
                                          className="p-0.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                          title={`Xóa Câu ${qNumber}`}
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Ô mô tả câu hỏi */}
                                    <input
                                      type="text"
                                      value={q.prompt || ''}
                                      onChange={e => handleUpdateP3QuestionPrompt(row.id, qIndex, e.target.value)}
                                      placeholder="Mô tả câu hỏi để AI sinh đề (VD: Tính khoảng cách giữa 2 điểm cực trị...)"
                                      className="w-full px-2 py-0.5 text-[10px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500 font-medium placeholder:text-slate-400"
                                    />
                                  </div>
                                );
                              })}

                              <button
                                type="button"
                                onClick={() => handleAddP3Question(row.id)}
                                className="w-full py-0.5 px-1 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80 rounded-md text-[9px] font-bold flex items-center justify-center gap-1 transition"
                              >
                                <Plus size={10} /> Thêm câu Phần III
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Tổng câu & Điểm hàng */}
                      <td className="p-2 text-center font-bold text-slate-700 dark:text-slate-300">
                        {getRowQuestions(row)}
                      </td>
                      <td className="p-2 text-center font-extrabold text-teal-700 dark:text-teal-400">
                        {getRowScore(row).toFixed(1)}đ
                      </td>

                      {/* Xóa dòng */}
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleDeleteMatrixRow(row.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Xóa chủ đề này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* DÒNG TỔNG CỘNG CHUẨN ĐỊNH LƯỢNG CV 7991 */}
                  <tr className="bg-slate-100/90 dark:bg-slate-800/80 font-bold text-slate-800 dark:text-slate-100">
                    <td colSpan={2} className="p-2.5 text-right font-extrabold">
                      Tổng số câu & Điểm số:
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold text-xs ${totalP1 === 12 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800'}`}>
                        P.I: {totalP1}/12 câu ({(totalP1 * 0.25).toFixed(2)}đ)
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-1 rounded-lg font-bold text-xs flex flex-wrap items-center justify-center gap-1.5 ${totalP2 === 4 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}`}>
                        <span>P.II: {totalP2}/4 câu ({(totalP2 * 1.0).toFixed(1)}đ)</span>
                        <span className="text-[10px] opacity-90">({totalP2NB} ý NB, {totalP2TH} ý TH, {totalP2VD} ý VD, {totalP2VDC} ý VDC)</span>
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold text-xs ${totalP3 === 6 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800'}`}>
                        P.III: {totalP3}/6 câu ({(totalP3 * 0.5).toFixed(1)}đ)
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-extrabold text-teal-800 dark:text-teal-200">
                      {totalQuestions}
                    </td>
                    <td className={`p-2.5 text-center font-black text-sm ${Math.abs(totalScore - 10) < 0.05 ? 'text-teal-700 dark:text-teal-300' : 'text-rose-600'}`}>
                      {totalScore.toFixed(1)}đ
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Chú thích định lượng và Nút điều hướng */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Chuẩn đề thi CV 7991: <strong>12 câu Phần I</strong> (3,0đ) + <strong>4 câu Phần II</strong> (4,0đ - 16 ý a, b, c, d) + <strong>6 câu Phần III</strong> (3,0đ) = <strong>Tổng 10,0 điểm</strong>.</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                >
                  Quay lại Bước 1
                </button>
                <button
                  onClick={() => {
                    handleSyncSpecFromMatrix(false);
                    setCurrentStep(3);
                  }}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
                >
                  Tiếp tục: Xem Bản đặc tả <ArrowRight size={14} />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* BƯỚC 3: BẢNG ĐẶC TẢ TƯƠNG TÁC (CHỈNH SỬA, THÊM, BỚT, LỌC) */}
        {/* ======================================================== */}
        {currentStep === 3 && (
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-teal-100 dark:border-slate-800 shadow-xs space-y-4">
            
            {/* Header và Nút tác vụ Bản đặc tả */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Compass size={18} className="text-teal-600" />
                  3. Bản đặc tả ma trận đề thi (Yêu cầu cần đạt chuẩn SGK GDPT 2018)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quy định chi tiết chuẩn kiến thức, kĩ năng và mức độ tư duy cần đánh giá theo từng ý a), b), c), d) của các câu hỏi.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSyncSpecFromMatrix}
                  className="px-3 py-1.5 bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-teal-100 transition shadow-2xs"
                  title="Tự động đồng bộ các mục đặc tả từ Ma trận Bước 2"
                >
                  <Sparkles size={13} className="text-teal-600" />
                  Đồng bộ từ Ma trận Bước 2
                </button>

                <button
                  onClick={() => {
                    const fresh = generateSpecFromMatrix(matrixRows, [], grade);
                    setSpecItems(fresh);
                    setCopySuccess('Đã khôi phục Bản đặc tả mẫu chuẩn khớp 100% Ma trận!');
                    setTimeout(() => setCopySuccess(null), 3000);
                  }}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-200 transition"
                  title="Khôi phục lại bản đặc tả mẫu chuẩn"
                >
                  <RotateCcw size={13} />
                  Mẫu chuẩn
                </button>

                <button
                  onClick={handleAddSpecItem}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                >
                  <Plus size={14} /> Thêm mục đặc tả
                </button>
              </div>
            </div>

            {/* BỘ LỌC THEO MỨC ĐỘ (ALL, NB, TH, VD, VDC) */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Filter size={13} /> Lọc mức độ:
              </span>
              {[
                { id: 'ALL', label: `Tất cả (${specItems.length})` },
                { id: 'NB', label: `Nhận biết (${specItems.filter(s => s.level === 'NB').length})` },
                { id: 'TH', label: `Thông hiểu (${specItems.filter(s => s.level === 'TH').length})` },
                { id: 'VD', label: `Vận dụng (${specItems.filter(s => s.level === 'VD').length})` },
                { id: 'VDC', label: `Vận dụng cao (${specItems.filter(s => s.level === 'VDC').length})` },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSpecFilter(f.id as any)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                    specFilter === f.id
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* BẢNG BẢN ĐẶC TẢ TƯƠNG TÁC */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-teal-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-2.5 text-center w-10">TT</th>
                    <th className="p-2.5 w-48">Chủ đề & Đơn vị bài học</th>
                    <th className="p-2.5 w-32 text-center">Mức độ</th>
                    <th className="p-2.5 min-w-[260px]">Yêu cầu cần đạt chuẩn SGK</th>
                    <th className="p-2.5 w-40 text-center">Câu hỏi / Phần</th>
                    <th className="p-2.5 text-center w-10">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSpecItems.map((item, idx) => {
                    const prevItem = idx > 0 ? filteredSpecItems[idx - 1] : null;
                    const showPartHeader = specFilter === 'ALL' && (!prevItem || item.part !== prevItem.part);

                    return (
                      <React.Fragment key={item.id}>
                        {showPartHeader && (
                          <tr className="bg-teal-50/90 dark:bg-slate-800/90 border-y-2 border-teal-200 dark:border-teal-800">
                            <td colSpan={6} className="px-3 py-2 text-xs font-black text-teal-900 dark:text-teal-200 uppercase tracking-wide">
                              {item.part === 'P1' && '📌 PHẦN I. CÂU HỎI TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN (12 CÂU)'}
                              {item.part === 'P2' && '📌 PHẦN II. CÂU HỎI TRẮC NGHIỆM ĐÚNG / SAI (4 CÂU - CHI TIẾT TỪNG Ý a, b, c, d)'}
                              {item.part === 'P3' && '📌 PHẦN III. CÂU HỎI TRẮC NGHIỆM TRẢ LỜI NGẮN (6 CÂU)'}
                            </td>
                          </tr>
                        )}
                        <tr className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${item.part === 'P2' ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}`}>
                          <td className="p-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-2.5 space-y-1">
                            <input
                              type="text"
                              value={item.topic}
                              onChange={e => handleUpdateSpecItem(item.id, 'topic', e.target.value)}
                              placeholder="Tên chủ đề..."
                              className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 font-bold text-teal-800 dark:text-teal-300 bg-white dark:bg-slate-800 text-xs outline-none"
                            />
                            <input
                              type="text"
                              value={item.unit}
                              onChange={e => handleUpdateSpecItem(item.id, 'unit', e.target.value)}
                              placeholder="Đơn vị bài học..."
                              className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 italic text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 text-[11px] outline-none"
                            />
                          </td>

                          {/* Dropdown Mức độ có màu sắc nhận diện */}
                          <td className="p-2.5 text-center">
                            <select
                              value={item.level}
                              onChange={e => handleUpdateSpecItem(item.id, 'level', e.target.value as CognitiveLevel)}
                              className={`px-2 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer ${getLevelBadgeClass(item.level)}`}
                            >
                              <option value="NB">Nhận biết (NB)</option>
                              <option value="TH">Thông hiểu (TH)</option>
                              <option value="VD">Vận dụng (VD)</option>
                              <option value="VDC">Vận dụng cao (VDC)</option>
                            </select>
                          </td>

                          {/* Yêu cầu cần đạt chuẩn SGK */}
                          <td className="p-2.5">
                            <textarea
                              rows={2}
                              value={item.requirement}
                              onChange={e => handleUpdateSpecItem(item.id, 'requirement', e.target.value)}
                              className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 resize-none leading-relaxed"
                            />
                          </td>

                          {/* Câu hỏi trong đề */}
                          <td className="p-2.5 text-center">
                            <input
                              type="text"
                              value={item.questionRef}
                              onChange={e => handleUpdateSpecItem(item.id, 'questionRef', e.target.value)}
                              placeholder="Câu 1 (Phần I)..."
                              className={`w-full text-center px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs outline-none ${item.part === 'P2' ? 'text-amber-800 dark:text-amber-300' : 'text-slate-700 dark:text-slate-200'}`}
                            />
                          </td>

                          {/* Nút Xóa */}
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => handleDeleteSpecItem(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Xóa mục đặc tả này"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Nút điều hướng Bước 3 */}
            <div className="flex justify-between items-center pt-3">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
              >
                Quay lại Ma trận
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
              >
                Tiếp tục: Xem Đề thi & Soạn thảo <ArrowRight size={14} />
              </button>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* BƯỚC 4: ĐỀ THI HOÀN CHỈNH & BỘ CÔNG CỤ VẼ ẢNH 300 DPI */}
        {/* ======================================================== */}
        {currentStep === 4 && (
          <div className="space-y-6">

            {/* CARD CÔNG CỤ VẼ BẢNG BIẾN THIÊN, ĐỒ THỊ, HÌNH HỌC 3D (300 DPI) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-teal-200 dark:border-teal-900/60 shadow-xs overflow-hidden transition-all">
              
              {/* Header của công cụ vẽ */}
              <div 
                onClick={() => setIsToolCollapsed(prev => !prev)}
                className="bg-teal-50/80 hover:bg-teal-100/70 dark:bg-teal-950/40 dark:hover:bg-teal-950/70 px-4 py-2.5 flex items-center justify-between cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    📐
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-extrabold text-teal-950 dark:text-teal-200">
                      Bộ vẽ hình 300 DPI & Dán vào câu hỏi (Bảng biến thiên, Đồ thị, Hình 3D)
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-300">
                      {isToolCollapsed ? 'Bấm để mở công cụ vẽ' : 'Bấm để thu gọn'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  {!isToolCollapsed && (
                    <div className="flex bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-teal-200 dark:border-slate-700 text-xs font-bold">
                      <button
                        onClick={() => setActiveToolTab('bbt')}
                        className={`px-2.5 py-1 rounded-md transition ${activeToolTab === 'bbt' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}
                      >
                        Bảng biến thiên
                      </button>
                      <button
                        onClick={() => setActiveToolTab('graph')}
                        className={`px-2.5 py-1 rounded-md transition ${activeToolTab === 'graph' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}
                      >
                        Đồ thị Oxy
                      </button>
                      <button
                        onClick={() => setActiveToolTab('geo3d')}
                        className={`px-2.5 py-1 rounded-md transition ${activeToolTab === 'geo3d' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}
                      >
                        Hình 3D
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setIsToolCollapsed(prev => !prev)}
                    className="p-1 rounded-lg text-teal-700 dark:text-teal-300 hover:bg-teal-200/50 dark:hover:bg-slate-800 transition"
                    title={isToolCollapsed ? 'Mở rộng công cụ' : 'Thu gọn công cụ'}
                  >
                    {isToolCollapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
                  </button>
                </div>
              </div>

              {/* Thân của công cụ vẽ */}
              {!isToolCollapsed && (
                <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">

                  {/* CỘT TRÁI: ĐIỀU KHIỂN & CHỌN MẪU */}
                  <div className="lg:col-span-5 space-y-4">
                    
                    {/* TAB BBT: NHẬP HÀM SỐ & HỆ SỐ */}
                    {activeToolTab === 'bbt' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                            Cấu hình hàm số lập Bảng biến thiên:
                          </label>
                          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                            <button
                              onClick={() => setBbtMode('coeffs')}
                              className={`px-2 py-0.5 rounded-md transition ${bbtMode === 'coeffs' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-500'}`}
                            >
                              Nhập hệ số (a,b,c,d,e)
                            </button>
                            <button
                              onClick={() => setBbtMode('text')}
                              className={`px-2 py-0.5 rounded-md transition ${bbtMode === 'text' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-500'}`}
                            >
                              Gõ biểu thức f(x)
                            </button>
                          </div>
                        </div>

                        {bbtMode === 'coeffs' ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { id: 'rational_2_1', label: 'Bậc 2 / Bậc 1: (ax²+bx+c)/(dx+e)' },
                                { id: 'rational_1_1', label: 'Phân thức: (ax+b)/(cx+d)' },
                                { id: 'cubic', label: 'Bậc 3: ax³+bx²+cx+d' },
                                { id: 'quartic', label: 'Bậc 4: ax⁴+bx²+c' },
                              ].map(t => (
                                <button
                                  key={t.id}
                                  onClick={() => {
                                    setBbtType(t.id as any);
                                    if (t.id === 'rational_2_1') setBbtCoeffs({ a: 1, b: -1, c: 1, d: 1, e: -1 });
                                    if (t.id === 'rational_1_1') setBbtCoeffs({ ...bbtCoeffs, a: 2, b: 1, c: 1, d: -1 });
                                    if (t.id === 'cubic') setBbtCoeffs({ ...bbtCoeffs, a: 1, b: 0, c: -3, d: 0 });
                                    if (t.id === 'quartic') setBbtCoeffs({ ...bbtCoeffs, a: 1, b: -2, c: -3, d: 0, e: 0 });
                                  }}
                                  className={`px-2.5 py-1 text-[11px] rounded-lg border font-bold transition ${
                                    bbtType === t.id
                                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-teal-50'
                                  }`}
                                >
                                  {t.label}
                                </button>
                              ))}
                            </div>

                            <div className={`grid gap-2 pt-1 ${bbtType === 'rational_2_1' ? 'grid-cols-5' : bbtType === 'quartic' ? 'grid-cols-3' : 'grid-cols-4'}`}>
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 block mb-0.5">a:</span>
                                <input
                                  type="number"
                                  step="any"
                                  value={bbtCoeffs.a}
                                  onChange={e => setBbtCoeffs({ ...bbtCoeffs, a: parseFloat(e.target.value) || 0 })}
                                  className="w-full px-2 py-1 text-xs text-center border-2 border-slate-700 dark:border-slate-500 rounded-xl bg-white dark:bg-slate-800 font-mono font-bold outline-none"
                                />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 block mb-0.5">b:</span>
                                <input
                                  type="number"
                                  step="any"
                                  value={bbtCoeffs.b}
                                  onChange={e => setBbtCoeffs({ ...bbtCoeffs, b: parseFloat(e.target.value) || 0 })}
                                  className="w-full px-2 py-1 text-xs text-center border-2 border-slate-700 dark:border-slate-500 rounded-xl bg-white dark:bg-slate-800 font-mono font-bold outline-none"
                                />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 block mb-0.5">c:</span>
                                <input
                                  type="number"
                                  step="any"
                                  value={bbtCoeffs.c}
                                  onChange={e => setBbtCoeffs({ ...bbtCoeffs, c: parseFloat(e.target.value) || 0 })}
                                  className="w-full px-2 py-1 text-xs text-center border-2 border-slate-700 dark:border-slate-500 rounded-xl bg-white dark:bg-slate-800 font-mono font-bold outline-none"
                                />
                              </div>
                              {bbtType !== 'quartic' && (
                                <div>
                                  <span className="text-[10px] font-bold text-slate-500 block mb-0.5">d:</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={bbtCoeffs.d}
                                    onChange={e => setBbtCoeffs({ ...bbtCoeffs, d: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-2 py-1 text-xs text-center border-2 border-slate-700 dark:border-slate-500 rounded-xl bg-white dark:bg-slate-800 font-mono font-bold outline-none"
                                  />
                                </div>
                              )}
                              {bbtType === 'rational_2_1' && (
                                <div>
                                  <span className="text-[10px] font-bold text-teal-600 block mb-0.5">e:</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={bbtCoeffs.e}
                                    onChange={e => setBbtCoeffs({ ...bbtCoeffs, e: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-2 py-1 text-xs text-center border-2 border-teal-600 rounded-xl bg-white dark:bg-slate-800 font-mono font-bold text-teal-700 dark:text-teal-300 outline-none"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={bbtFnInput}
                              onChange={e => setBbtFnInput(e.target.value)}
                              placeholder="(x^2 - x + 1)/(x - 1)"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-sm font-mono font-bold text-teal-900 dark:text-teal-100 outline-none focus:ring-2 focus:ring-teal-400"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB GRAPH: CẤU HÌNH ĐỒ THỊ OXY */}
                    {activeToolTab === 'graph' && (
                      <div className="space-y-3">
                        <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                          Chọn dạng đồ thị hàm số:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { id: 'cubic', label: 'Bậc 3 (y = x³ - 3x + 1)' },
                            { id: 'quartic', label: 'Bậc 4 (y = x⁴ - 2x² - 1)' },
                            { id: 'rational', label: 'Phân thức (2x+1)/(x-1)' },
                            { id: 'rational_2_1', label: 'Bậc 2 / Bậc 1: (x²-x+1)/(x-1)' },
                          ].map(t => (
                            <button
                              key={t.id}
                              onClick={() => {
                                if (t.id === 'cubic') setGraphConfig({ ...graphConfig, type: 'cubic', a: 1, b: 0, c: -3, d: 1 });
                                if (t.id === 'quartic') setGraphConfig({ ...graphConfig, type: 'quartic', a: 1, b: -2, c: -1 });
                                if (t.id === 'rational') setGraphConfig({ ...graphConfig, type: 'rational', a: 2, b: 1, c: 1, d: -1 });
                                if (t.id === 'rational_2_1') setGraphConfig({ ...graphConfig, type: 'rational_2_1', a: 1, b: -1, c: 1, d: 1, e: -1 });
                              }}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition ${
                                graphConfig.type === t.id
                                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-teal-50'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TAB GEO3D: CẤU HÌNH HÌNH HỌC 3D */}
                    {activeToolTab === 'geo3d' && (
                      <div className="space-y-3">
                        <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                          Chọn khối hình học 3D (300 DPI):
                        </label>
                        <div className="grid grid-cols-1 gap-1.5">
                          {[
                            { id: 'pyramid_s_abcd', label: 'Hình chóp S.ABCD (đáy bình hành)' },
                            { id: 'pyramid_s_abc', label: 'Hình chóp tam giác S.ABC' },
                            { id: 'pyramid_sa_bottom', label: 'Hình chóp S.ABCD (SA ⊥ đáy)' },
                            { id: 'prism_abc', label: 'Lăng trụ tam giác ABC.A\'B\'C\'' },
                            { id: 'box_abcd', label: 'Hộp chữ nhật ABCD.A\'B\'C\'D\'' },
                            { id: 'coord_oxyz', label: 'Hệ trục tọa độ Oxyz (Toán 12)' },
                          ].map(g => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => setGeoConfig({ ...geoConfig, preset: g.id as any })}
                              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold text-left transition ${
                                geoConfig.preset === g.id
                                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-teal-50'
                              }`}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>

                        {geoConfig.preset !== 'coord_oxyz' && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-3 text-xs font-medium text-slate-700 dark:text-slate-300">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={geoConfig.showCenterO}
                                onChange={e => setGeoConfig({ ...geoConfig, showCenterO: e.target.checked })}
                                className="rounded text-teal-600"
                              />
                              Tâm O
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={geoConfig.showMidpointM}
                                onChange={e => setGeoConfig({ ...geoConfig, showMidpointM: e.target.checked })}
                                className="rounded text-teal-600"
                              />
                              Trung điểm M
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={geoConfig.showDiagonals}
                                onChange={e => setGeoConfig({ ...geoConfig, showDiagonals: e.target.checked })}
                                className="rounded text-teal-600"
                              />
                              Đường chéo
                            </label>
                          </div>
                        )}
                      </div>
                    )}

                    {/* KHỐI NÚT DÁN ẢNH VÀO CÂU HỎI TRONG ĐỀ THI */}
                    <div className="p-3 bg-teal-50/70 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800/60 space-y-2">
                      <span className="text-[11px] font-bold text-teal-900 dark:text-teal-200 block">
                        Dán ảnh trực tiếp vào đề thi:
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={bbtTargetQuestion}
                          onChange={e => setBbtTargetQuestion(e.target.value)}
                          className="px-2.5 py-1.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                        >
                          {allQuestionsList.map(q => (
                            <option key={q} value={q}>{q}</option>
                          ))}
                        </select>

                        <button
                          onClick={() => {
                            const curUrl = activeToolTab === 'bbt' ? bbtDataUrl : activeToolTab === 'graph' ? graphDataUrl : geoDataUrl;
                            const alt = activeToolTab === 'bbt' ? 'Bảng biến thiên' : activeToolTab === 'graph' ? 'Đồ thị Oxy' : 'Hình học 3D';
                            if (curUrl) handleInsertImageToQuestion(bbtTargetQuestion, curUrl, alt);
                          }}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                        >
                          <ImageIcon size={13} /> Dán vào {bbtTargetQuestion}
                        </button>
                      </div>

                      {/* Nút Copy Clipboard & Tải PNG */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            const curUrl = activeToolTab === 'bbt' ? bbtDataUrl : activeToolTab === 'graph' ? graphDataUrl : geoDataUrl;
                            const label = activeToolTab === 'bbt' ? 'Bảng biến thiên' : activeToolTab === 'graph' ? 'Đồ thị' : 'Hình học 3D';
                            if (curUrl) handleCopyImage(curUrl, label);
                          }}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 border rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition flex items-center gap-1"
                        >
                          <Copy size={12} /> Copy ảnh (300 DPI)
                        </button>

                        <button
                          onClick={() => {
                            const curUrl = activeToolTab === 'bbt' ? bbtDataUrl : activeToolTab === 'graph' ? graphDataUrl : geoDataUrl;
                            const name = activeToolTab === 'bbt' ? 'bbt.png' : activeToolTab === 'graph' ? 'do_thi_oxy.png' : 'hinh_3d.png';
                            if (curUrl) handleDownloadImage(curUrl, name);
                          }}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 border rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition flex items-center gap-1"
                        >
                          <Download size={12} /> Tải PNG
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* CỘT PHẢI: KHUNG VẼ CANVAS TRỰC TIẾP (300 DPI) */}
                  <div className="lg:col-span-7 flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    
                    {/* Thanh chỉnh cỡ chữ & thanh trượt Oxy trực quan */}
                    <div className="w-full flex flex-col gap-2 pb-2 mb-2 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <Type size={13} className="text-teal-600" />
                          Cỡ chữ: <span className="font-mono text-teal-700 dark:text-teal-300 font-extrabold">{Math.round(examFontScale * 100)}%</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="range"
                            min="0.75"
                            max="1.6"
                            step="0.05"
                            value={examFontScale}
                            onChange={e => setExamFontScale(parseFloat(e.target.value))}
                            className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                          />
                          <div className="flex bg-white dark:bg-slate-800 p-0.5 rounded-lg border text-[10px] font-bold">
                            {[
                              { scale: 0.85, label: 'Nhỏ' },
                              { scale: 1.0, label: 'Chuẩn' },
                              { scale: 1.2, label: 'Lớn' },
                              { scale: 1.4, label: 'Rất lớn' },
                            ].map(item => (
                              <button
                                key={item.scale}
                                type="button"
                                onClick={() => setExamFontScale(item.scale)}
                                className={`px-1.5 py-0.5 rounded transition ${
                                  Math.abs(examFontScale - item.scale) < 0.04
                                    ? 'bg-teal-600 text-white'
                                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                                }`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Thanh trượt Hệ trục Oxy & Chia đơn vị */}
                      {activeToolTab === 'graph' && (
                        <div className="p-1.5 bg-teal-50/70 dark:bg-teal-950/40 rounded-lg border border-teal-200 dark:border-teal-800/70 flex flex-wrap items-center justify-between gap-2 text-xs animate-fade-in">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-extrabold text-teal-900 dark:text-teal-200 flex items-center gap-1">
                              <Ruler size={13} className="text-teal-600" />
                              Thu phóng Oxy: <span className="font-mono text-teal-700 dark:text-teal-300 font-extrabold">±{Math.abs(graphConfig.xMax ?? 5.5)}</span>
                            </span>
                            <input
                              type="range"
                              min="3"
                              max="10"
                              step="0.5"
                              value={Math.abs(graphConfig.xMax ?? 5.5)}
                              onChange={e => {
                                const val = parseFloat(e.target.value);
                                setGraphConfig({
                                  ...graphConfig,
                                  xMin: -val,
                                  xMax: val,
                                  yMin: -val,
                                  yMax: val
                                });
                              }}
                              className="w-24 sm:w-28 h-1.5 bg-teal-200 dark:bg-teal-800 rounded-lg appearance-none cursor-pointer accent-teal-600"
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-teal-950 dark:text-teal-200">Bước: {graphConfig.tickStep ?? 1}</span>
                              <input
                                type="range"
                                min="0.5"
                                max="2.5"
                                step="0.5"
                                value={graphConfig.tickStep ?? 1}
                                onChange={e => {
                                  const step = parseFloat(e.target.value);
                                  setGraphConfig({ ...graphConfig, tickStep: step, tickStepX: step, tickStepY: step, gridStep: step });
                                }}
                                className="w-14 sm:w-16 h-1.5 bg-teal-200 dark:bg-teal-800 rounded-lg appearance-none cursor-pointer accent-teal-600"
                              />
                            </div>
                            <label className="flex items-center gap-1 cursor-pointer text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={graphConfig.showTicks ?? false}
                                onChange={e => setGraphConfig({ ...graphConfig, showTicks: e.target.checked })}
                                className="rounded text-teal-600"
                              />
                              Vạch chia
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-teal-800 dark:text-teal-300 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-teal-200">
                              <input
                                type="checkbox"
                                checked={graphConfig.showTickLabels ?? false}
                                onChange={e => setGraphConfig({ 
                                  ...graphConfig, 
                                  showTickLabels: e.target.checked,
                                  showTicks: e.target.checked ? true : graphConfig.showTicks 
                                })}
                                className="rounded text-teal-600"
                              />
                              Số đơn vị
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-teal-200">
                              <input
                                type="checkbox"
                                checked={graphConfig.showGrid ?? false}
                                onChange={e => setGraphConfig({ ...graphConfig, showGrid: e.target.checked })}
                                className="rounded text-teal-600"
                              />
                              🌐 Lưới tọa độ
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Canvas BBT */}
                    <div className={activeToolTab === 'bbt' ? 'block' : 'hidden'}>
                      <canvas
                        ref={bbtCanvasRef}
                        className="max-w-full h-auto rounded-lg shadow-xs bg-white border border-slate-200"
                      />
                    </div>

                    {/* Canvas Đồ thị Oxy */}
                    <div className={activeToolTab === 'graph' ? 'block' : 'hidden'}>
                      <canvas
                        ref={graphCanvasRef}
                        className="max-w-full h-auto rounded-lg shadow-xs bg-white border border-slate-200"
                      />
                    </div>

                    {/* Canvas Hình học 3D */}
                    <div className={activeToolTab === 'geo3d' ? 'block' : 'hidden'}>
                      <canvas
                        ref={geoCanvasRef}
                        className="max-w-full h-auto rounded-lg shadow-xs bg-white border border-slate-200"
                      />
                    </div>

                  </div>

                </div>
              )}
            </div>

            {/* THANH CHUYỂN ĐỔI CHẾ ĐỘ XEM ĐỀ THI & MỞ BỘ CÔNG CỤ VẼ ẢNH 300 DPI */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setViewMode('source')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      viewMode === 'source'
                        ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Edit3 size={14} /> SOURCE CODE
                  </button>
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      viewMode === 'preview'
                        ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Eye size={14} /> XEM TRƯỚC
                  </button>
                </div>

                {/* 3 NÚT MỞ BỘ CÔNG CỤ VẼ ẢNH 300 DPI TRỰC TIẾP */}
                <button
                  type="button"
                  onClick={() => handleOpenDiagramModal('graph')}
                  className="px-3 py-1.5 bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                  title="Mở công cụ vẽ đồ thị hàm số Oxy độ nét cao 300 DPI"
                >
                  <TrendingUp size={13} className="text-teal-600" />
                  <span>Vẽ Đồ Thị Oxy</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenDiagramModal('bbt')}
                  className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                  title="Mở công cụ vẽ bảng biến thiên tự động độ nét cao 300 DPI"
                >
                  <TableIcon size={13} className="text-purple-600" />
                  <span>Vẽ Bảng Biến Thiên</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenDiagramModal('geometry')}
                  className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                  title="Mở thước kẻ và com-pa GSP vẽ hình học không gian 3D"
                >
                  <Box size={13} className="text-amber-600" />
                  <span>Vẽ Hình 3D (GSP)</span>
                </button>

                {/* NÚT TRỘN ĐỀ NHIỀU MÃ ĐỀ CHUẨN MCMIX */}
                <button
                  type="button"
                  onClick={handleOpenShuffleModal}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                  title="Trộn đề thành 4, 6, 8, 24 mã đề chuẩn McMIX (Khóa phương án cố định, Phiếu tô, Bảng ma trận soi đề)"
                >
                  <Shuffle size={13} className="text-emerald-200" />
                  <span>Trộn Đề (McMIX)</span>
                </button>

                {/* NÚT CHUYỂN ĐỔI NHANH GIỮA 2 ĐỊNH DẠNG MẪU ĐỀ */}
                <button
                  type="button"
                  onClick={() => {
                    const res = toggleExamMarkdownFormat(examMarkdown);
                    setExamMarkdown(res.newMarkdown);
                    setAnswerFormat(res.format);
                  }}
                  className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                  title="Chuyển đổi tức thì giữa 2 chuẩn đề: Bảng đáp án cuối đề (mau_de_he_thong) vs Mẫu đề rút gọn (Gạch chân đáp án đúng)"
                >
                  <RefreshCw size={13} className="text-indigo-600 dark:text-indigo-400" />
                  <span>{examMarkdown.includes('---------------------------HẾT------------------------') ? 'Sang Mẫu rút gọn' : 'Sang Bảng đáp án'}</span>
                </button>
              </div>

              <div className="text-xs text-slate-500 font-medium hidden md:block">
                Tối ưu công thức Toán Office Math & nhúng hình vẽ 300 DPI khi tải Word (.docx)
              </div>
            </div>

            {/* VÙNG SOẠN THẢO / XEM TRƯỚC ĐỀ THI */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden min-h-[500px]">
              {viewMode === 'source' ? (
                <div className="p-4">
                  <textarea
                    value={examMarkdown}
                    onChange={e => setExamMarkdown(e.target.value)}
                    className="w-full h-[650px] p-4 bg-slate-50 dark:bg-slate-950 rounded-xl font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 outline-none resize-none border border-slate-200 dark:border-slate-800"
                    spellCheck={false}
                  />
                </div>
              ) : (
                <div className="p-8 max-w-4xl mx-auto space-y-6">
                  
                  {/* TIÊU ĐỀ ĐỀ THI IN ẤN */}
                  <div className="border-b-2 border-slate-800 dark:border-slate-200 pb-4">
                    <div className="grid grid-cols-2 text-center text-xs sm:text-sm font-bold">
                      <div>
                        <div>{examInfo.school}</div>
                        <div>{examInfo.department}</div>
                        <div className="font-normal italic mt-1">Mã đề thi: {examInfo.examCode}</div>
                      </div>
                      <div>
                        <div>{examInfo.examTitle}</div>
                        <div>{examInfo.subject}</div>
                        <div className="font-normal italic mt-1">Thời gian làm bài: {examInfo.duration}</div>
                      </div>
                    </div>
                  </div>

                  {/* NỘI DUNG ĐỀ THI KÈM MATHJAX & HÌNH ẢNH */}
                  <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
                    <MathJaxRenderer 
                      content={examMarkdown} 
                      inline={false}
                      allQuestions={allQuestionsList}
                      apiKey={apiKey}
                      model={model}
                      onOpenDiagramTool={(type, targetQ, suggestion) => {
                        handleOpenDiagramModal(type, targetQ, suggestion);
                      }}
                      onInsertDiagram={(dataUrl, targetQ, alt) => {
                        handleInsertImageToQuestion(targetQ, dataUrl, alt || 'Hình vẽ');
                      }}
                      onRemoveDiagram={(targetQ) => {
                        handleRemoveImageFromQuestion(targetQ);
                      }}
                    />
                  </div>

                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* MODAL TÍCH HỢP 3 BỘ CÔNG CỤ VẼ HÌNH 300 DPI CHUẨN IN ẤN VÀ WORD */}
      <IntegratedDiagramModal
        isOpen={diagramModalOpen}
        onClose={() => setDiagramModalOpen(false)}
        onInsertImage={(dataUrl, qNum) => {
          handleInsertImageToQuestion(String(qNum || targetQuestionForDiagram || 'Câu 1'), dataUrl, 'Hình vẽ 300 DPI');
        }}
        initialTab={diagramInitialTab}
        targetQuestionNumber={targetQuestionForDiagram}
        allQuestions={allQuestionsList}
        initialSuggestion={diagramModalInitialSuggestion}
        apiKey={apiKey}
        model={model}
      />

      {/* MODAL TRỘN ĐỀ NHIỀU MÃ ĐỀ (MCMIX) KÈM MA TRẬN SOI ĐỀ VÀ PHIẾU TÔ */}
      {shufflableExam && (
        <MultiCodeExamModal
          isOpen={isMultiCodeModalOpen}
          onClose={() => setIsMultiCodeModalOpen(false)}
          exam={shufflableExam}
          onSelectExamCode={(selected) => {
            const newMd = answerFormat === 'inline'
              ? exportExamCV7991ToInlineMarkdown(selected)
              : exportExamCV7991ToTableMarkdown(selected);
            setExamMarkdown(newMd);
            setIsMultiCodeModalOpen(false);
          }}
        />
      )}

    </div>
  );
}
