import { analyzeFromCoeffs, renderBBTToCanvas } from '../utils/bbtEngine';
import { renderGraphToCanvas, GraphConfig } from '../utils/functionGraphEngine';

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

export function getDefaultMatrixRows12(): MatrixTopicRow[] {
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
export function getRequirementP1(topic: string, level: CognitiveLevel, qNum: number, grade: 10 | 12 = 12): string {
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
export function getRequirementP2(topic: string, letter: 'a' | 'b' | 'c' | 'd', level: CognitiveLevel, grade: 10 | 12 = 12): string {
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
export function getRequirementP3(topic: string, level: CognitiveLevel, qNum: number, grade: 10 | 12 = 12): string {
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

export function getDefaultSpecItems12(): SpecItem[] {
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