import { LessonPlan5512, SlideContent, ExamCV7991 } from '../types/pedagogy';

export interface CurriculumSample {
  id: string;
  name: string;
  subject: string;
  grade: string;
  lessonPlan: LessonPlan5512;
  slides: SlideContent[];
  exam: ExamCV7991;
}

export const SAMPLES: CurriculumSample[] = [
  // =========================================================================
  // MẪU 1: TOÁN 12 - KHẢO SÁT HÀM SỐ & GIÁ TRỊ LỚN NHẤT, NHỎ NHẤT
  // =========================================================================
  {
    id: 'toan12_daoham',
    name: 'Toán 12 - Giá trị lớn nhất và giá trị nhỏ nhất của hàm số',
    subject: 'Toán học',
    grade: 'Lớp 12',
    lessonPlan: {
      schoolName: 'TRƯỜNG THPT CHUYÊN LÊ QUÝ ĐÔN',
      departmentName: 'TỔ TOÁN HỌC',
      teacherName: 'ThS. Trần Minh Đức',
      subject: 'Toán học',
      grade: 'Lớp 12',
      lessonName: 'BÀI 3: GIÁ TRỊ LỚN NHẤT VÀ GIÁ TRỊ NHỎ NHẤT CỦA HÀM SỐ',
      durationPeriods: 2,
      periodIndex: 'Tiết 8 - 9 (Tuần 4)',
      datePrepared: '2025-02-10',
      objectives: {
        knowledge: [
          'Định nghĩa được giá trị lớn nhất ($\\max$) và giá trị nhỏ nhất ($\\min$) của hàm số $y = f(x)$ trên tập $D$.',
          'Nắm vững định lí về sự tồn tại $\\max, \\min$ của hàm số liên tục trên đoạn $[a; b]$.',
          'Thành thạo quy tắc 4 bước tìm $\\max, \\min$ của hàm số trên đoạn $[a; b]$ mà không cần lập bảng biến thiên: giải $f\'(x) = 0$, tính $f(a), f(b), f(x_i)$.',
          'Vận dụng GTLN, GTNN vào giải quyết các bài toán tối ưu thực tiễn (kinh tế, dung tích hình học, chi phí vật liệu).'
        ],
        competencies: {
          general: [
            'Năng lực tự chủ và tự học: Tự nghiên cứu bài toán tối ưu vỏ lon nước ngọt trong SGK, tìm tòi công thức tính nhanh.',
            'Năng lực giao tiếp và hợp tác: Trình bày và phản biện phương án tối ưu hóa chi phí sản xuất trong nhóm.'
          ],
          specific: [
            'Năng lực tư duy và lập luận toán học: So sánh giá trị $f(x_i)$ tại các điểm tới hạn và giá trị tại hai đầu mút $f(a), f(b)$.',
            'Năng lực mô hình hóa toán học: Thiết lập hàm diện tích toàn phần $S(r) = 2\\pi r^2 + \\frac{2V}{r}$ từ bài toán thực tế.'
          ]
        },
        qualities: [
          'Chăm chỉ, cẩn thận trong việc tính đạo hàm $f\'(x)$ và kiểm tra nghiệm thuộc khoảng $(a; b)$.',
          'Ý thức ứng dụng toán học vào tiết kiệm chi phí vật liệu bảo vệ môi trường.'
        ]
      },
      materials: {
        teacher: [
          'Giáo án điện tử chuẩn CV 5512 tích hợp công thức LaTeX; Máy chiếu tương tác / Smart TV.',
          'Phần mềm GeoGebra trực quan hóa đồ thị cực trị và tiếp tuyến.',
          'Phiếu học tập số 1 (Quy tắc tìm max/min trên đoạn) và Phiếu học tập số 2 (Bài toán tối ưu thực tiễn).'
        ],
        student: [
          'SGK Toán 12 (Tập 1), vở ghi bài, thước kẻ.',
          'Máy tính cầm tay CASIO fx-880BTG / 580VN X (chức năng Table [Menu 8] khảo sát giá trị hàm số).'
        ],
        digitalDevicesNotice: 'Căn cứ CV 5512/BGDĐT: Học sinh sử dụng máy tính cầm tay để kiểm tra nhanh kết quả tính đạo hàm và nghiệm $f\'(x) = 0$.'
      },
      activities: [
        {
          id: 'act1_toan',
          order: 1,
          name: 'Hoạt động 1: Khởi động - Tối ưu hóa vỏ lon nước ngọt hình trụ',
          timeMinutes: 8,
          objectives: ['Khơi gợi nhu cầu tìm kiếm kích thước hình trụ để diện tích toàn phần nhỏ nhất khi thể tích cố định $V = 330\\text{ ml}$.'],
          content: 'Một công ty sản xuất lon nước ngọt hình trụ có thể tích $V = 330\\text{ ml}$ ($330\\text{ cm}^3$). Tìm tỉ số giữa chiều cao $h$ và bán kính đáy $r$ để diện tích kim loại làm vỏ lon là nhỏ nhất?',
          product: 'Học sinh thiết lập được hàm diện tích $S(r) = 2\\pi r^2 + \\frac{2V}{r}$ với $r > 0$ và nhận thấy cần tìm giá trị nhỏ nhất của hàm số này.',
          implementation: {
            step1Transfer: 'GV phát vỏ lon nước ngọt cho các nhóm, chiếu đề bài toán kinh tế sản xuất vỏ lon và yêu cầu biểu diễn diện tích toàn phần theo bán kính $r$.',
            step2Execute: 'Học sinh làm việc theo cặp đôi, từ công thức thể tích $V = \\pi r^2 h \\Rightarrow h = \\frac{V}{\\pi r^2}$, thay vào diện tích toàn phần $S = 2\\pi r^2 + 2\\pi r h$.',
            step3Report: 'Đại diện một nhóm lên bảng ghi lại hàm số $S(r) = 2\\pi r^2 + \\frac{2V}{r}$.',
            step4Conclude: 'GV kết luận: Để tìm giá trị nhỏ nhất của $S(r)$, ta cần công cụ toán học tìm GTLN, GTNN của hàm số trên một khoảng hoặc một đoạn.'
          }
        },
        {
          id: 'act2_toan',
          order: 2,
          name: 'Hoạt động 2: Hình thành kiến thức mới (Khám phá quy tắc tìm max/min trên đoạn)',
          timeMinutes: 22,
          objectives: [
            'Nắm vững định nghĩa GTLN, GTNN và quy tắc tìm trên đoạn $[a; b]$ của hàm số liên tục.',
            'Hiểu rõ sự khác nhau giữa điểm cực trị và giá trị lớn nhất, nhỏ nhất.'
          ],
          content: 'Nghiên cứu định lí về hàm số liên tục trên đoạn $[a; b]$ luôn có GTLN và GTNN. Xây dựng quy tắc 4 bước không cần lập bảng biến thiên.',
          product: 'Bản sơ đồ quy tắc 4 bước: (1) Tính $f\'(x)$; (2) Tìm nghiệm $x_i \\in (a; b)$; (3) Tính $f(a), f(b), f(x_i)$; (4) So sánh tìm $\\max, \\min$.',
          implementation: {
            step1Transfer: 'GV trình chiếu đồ thị các hàm số liên tục trên đoạn $[a; b]$ qua GeoGebra và giao Phiếu học tập số 1.',
            step2Execute: 'Học sinh làm việc nhóm 4 bạn, trả lời câu hỏi: Điểm cao nhất và thấp nhất của đồ thị rơi vào những điểm nào?',
            step3Report: 'Đại diện Nhóm 2 trình bày: Đồ thị đạt giá trị cao nhất tại điểm cực đại hoặc tại đầu mút của đoạn.',
            step4Conclude: 'GV chuẩn hóa quy tắc: Vì hàm số liên tục trên đoạn $[a; b]$ nên chỉ cần tính đạo hàm, lọc nghiệm trong khoảng $(a; b)$ rồi so sánh giá trị tại các nghiệm đó với $f(a), f(b)$.'
          }
        },
        {
          id: 'act3_toan',
          order: 3,
          name: 'Hoạt động 3: Luyện tập (Củng cố quy tắc)',
          timeMinutes: 10,
          objectives: ['Thành thạo kỹ năng tìm GTLN, GTNN của hàm đa thức bậc ba và phân thức hữu tỉ trên đoạn cho trước.'],
          content: 'Ví dụ 1: Tìm $\\max, \\min$ của hàm số $f(x) = x^3 - 3x + 2$ trên đoạn $[0; 2]$. Ví dụ 2: Tìm $\\max, \\min$ của $g(x) = \\frac{2x - 1}{x + 1}$ trên đoạn $[0; 3]$.',
          product: 'Lời giải chi tiết trong vở học sinh: $\\min_{[0; 2]} f(x) = f(1) = 0$, $\\max_{[0; 2]} f(x) = f(2) = 4$.',
          implementation: {
            step1Transfer: 'GV yêu cầu dãy 1 làm Ví dụ 1, dãy 2 làm Ví dụ 2 trong 5 phút.',
            step2Execute: 'Học sinh làm bài cá nhân vào vở, dùng máy tính Casio kiểm tra lại kết quả.',
            step3Report: 'Hai học sinh lên bảng giải chi tiết, giải thích rõ vì sao loại các nghiệm $x$ nằm ngoài đoạn.',
            step4Conclude: 'GV nhận xét, lưu ý lỗi sai phổ biến: Quên kiểm tra điều kiện nghiệm $x_i \\in (a; b)$ hoặc quên tính giá trị tại hai đầu mút.'
          }
        },
        {
          id: 'act4_toan',
          order: 4,
          name: 'Hoạt động 4: Vận dụng (Giải quyết bài toán vỏ lon)',
          timeMinutes: 5,
          objectives: ['Áp dụng quy tắc đạo hàm giải trọn vẹn bài toán tối ưu kích thước lon nước ngọt ban đầu.'],
          content: 'Giải phương trình đạo hàm: $S\'(r) = 4\\pi r - \\frac{2V}{r^2} = 0 \\Leftrightarrow r = \\sqrt[3]{\\frac{V}{2\\pi}}$. Suy ra $h = \\frac{V}{\\pi r^2} = 2r$.',
          product: 'Học sinh rút ra kết luận hình học: Chiều cao lon bằng đường kính đáy ($h = 2r$) thì tốn ít vật liệu nhất.',
          implementation: {
            step1Transfer: 'GV yêu cầu học sinh tính nghiệm của $S\'(r) = 0$ và tính tỉ số $\\frac{h}{r}$.',
            step2Execute: 'Học sinh tính toán và đối chiếu với kích thước lon thực tế cầm trên tay.',
            step3Report: 'Học sinh phát biểu: Vì sao lon thực tế lại cao hơn? (Để người dùng cầm vừa lòng bàn tay và xếp vào thùng carton gọn gàng).',
            step4Conclude: 'GV tổng kết bài học, giao bài tập SGK và phiếu học tập về nhà.'
          }
        }
      ]
    },
    slides: [
      {
        id: 'st1',
        phase: 'Khởi động',
        title: 'BÀI TOÁN TỐI ƯU CHI PHÍ VỎ LON',
        subtitle: 'Ứng dụng đạo hàm tìm giá trị nhỏ nhất',
        bulletPoints: [
          'Thể tích lon nước ngọt cố định: $V = \\pi r^2 h = 330\\text{ ml}$.',
          'Diện tích toàn phần cần tối thiểu: $S(r) = 2\\pi r^2 + 2\\pi r h$.',
          'Rút $h = \\frac{V}{\\pi r^2}$, ta thu được hàm số 1 ẩn: $S(r) = 2\\pi r^2 + \\frac{2V}{r}$ với $r > 0$.',
          'Mục tiêu toán học: Tìm giá trị nhỏ nhất của $S(r)$ trên khoảng $(0; +\\infty)$.'
        ],
        highlightBox: 'Bài toán tối ưu hóa chi phí sản xuất công nghiệp luôn quy về bài toán tìm GTLN hoặc GTNN của hàm số.'
      },
      {
        id: 'st2',
        phase: 'Khám phá',
        title: 'QUY TẮC TÌM GTLN, GTNN TRÊN ĐOẠN $[a; b]$',
        subtitle: 'Áp dụng cho hàm số $y = f(x)$ liên tục trên $[a; b]$',
        bulletPoints: [
          'Bước 1: Tính đạo hàm $f\'(x)$.',
          'Bước 2: Tìm các nghiệm $x_1, x_2, \\dots, x_n$ của $f\'(x) = 0$ thuộc khoảng $(a; b)$.',
          'Bước 3: Tính các giá trị $f(a), f(b), f(x_1), \\dots, f(x_n)$.',
          'Bước 4: So sánh các giá trị đã tính: Số lớn nhất là $\\max$, số nhỏ nhất là $\\min$.'
        ],
        highlightBox: 'CHÚ Ý: Không cần lập bảng biến thiên khi xét hàm số liên tục trên đoạn đóng $[a; b]$!'
      },
      {
        id: 'st3',
        phase: 'Luyện tập',
        title: 'BÀI TẬP ÁP DỤNG TRÊN ĐOẠN',
        subtitle: 'Xét hàm số $f(x) = x^3 - 3x + 2$ trên $[0; 2]$',
        bulletPoints: [
          'Đạo hàm: $f\'(x) = 3x^2 - 3 = 3(x^2 - 1)$.',
          'Phương trình $f\'(x) = 0 \\Leftrightarrow x = \\pm 1$. Vì xét trên $(0; 2)$ nên chỉ nhận $x = 1$.',
          'Tính giá trị: $f(0) = 2;\\quad f(1) = 0;\\quad f(2) = 4$.',
          'Kết luận: $\\min_{[0; 2]} f(x) = 0$ tại $x = 1$; $\\max_{[0; 2]} f(x) = 4$ tại $x = 2$.'
        ],
        interactiveQuestion: {
          question: 'Giá trị nhỏ nhất của hàm số $y = x^4 - 2x^2 + 3$ trên đoạn $[-2; 2]$ bằng bao nhiêu?',
          options: ['$\\min = 1$', '$\\min = 2$', '$\\min = 3$', '$\\min = 11$'],
          correctIndex: 1,
          explanation: 'Đạo hàm $y\' = 4x^3 - 4x = 0 \\Leftrightarrow x \\in \\{0; \\pm 1\\}$. Tính $y(\\pm 2) = 11, y(0) = 3, y(\\pm 1) = 2$. Suy ra $\\min = 2$.'
        }
      },
      {
        id: 'st4',
        phase: 'Vận dụng',
        title: 'LỜI GIẢI BÀI TOÁN VỎ LON THỰC TẾ',
        subtitle: 'Kết quả tỉ số vàng trong công nghiệp bao bì',
        bulletPoints: [
          'Đạo hàm hàm diện tích: $S\'(r) = 4\\pi r - \\frac{2V}{r^2}$.',
          'Cho $S\'(r) = 0 \\Leftrightarrow 4\\pi r^3 = 2V \\Leftrightarrow r = \\sqrt[3]{\\frac{V}{2\\pi}}$.',
          'Thay vào chiều cao: $h = \\frac{V}{\\pi r^2} = \\frac{2\\pi r^3}{\\pi r^2} = 2r$.',
          'Định lí hình học: Chiều cao bằng đúng đường kính đáy ($h = 2r$) sẽ tối thiểu hóa lượng nhôm!'
        ],
        highlightBox: 'Toán học giúp doanh nghiệp tiết kiệm hàng triệu USD chi phí nguyên vật liệu sản xuất!'
      }
    ],
    exam: {
      examTitle: 'ĐỀ KIỂM TRA ĐỊNH KÌ MÔN TOÁN HỌC - LỚP 12',
      term: 'Giữa Học kỳ 1',
      academicYear: '2024 - 2025',
      grade: 'Lớp 12',
      subject: 'Toán học',
      durationMinutes: 45,
      code: '101',
      matrixRows: [
        {
          topicName: 'Khảo sát hàm số & GTLN-GTNN',
          unitName: 'Ứng dụng đạo hàm',
          part1: { know: 6, understand: 4, apply: 2 },
          part2: { know: 1, understand: 1, apply: 0 },
          part3: { know: 1, understand: 2, apply: 1 },
          part4: { know: 0, understand: 1, apply: 1 }
        }
      ],
      specifications: [
        {
          id: 'sp_toan1',
          topic: 'Khảo sát hàm số & GTLN-GTNN',
          unit: 'Ứng dụng đạo hàm',
          competencyRequirement: 'Nhận biết và vận dụng đạo hàm tìm GTLN, GTNN và giải bài toán tối ưu thực tế.',
          level: 'apply',
          questionRef: 'Đủ 4 phần theo CV 7991',
          questionType: 'TNKQ Đúng - Sai'
        }
      ],
      part1Questions: [
        {
          id: 'tp1_1',
          number: 1,
          cognitiveLevel: 'know',
          topic: 'Tính đơn điệu',
          content: 'Cho hàm số $y = f(x)$ có đạo hàm $f\'(x) > 0$ với mọi $x \\in (1; 5)$. Mệnh đề nào sau đây đúng?',
          options: {
            A: 'Hàm số nghịch biến trên khoảng $(1; 5)$.',
            B: 'Hàm số đồng biến trên khoảng $(1; 5)$.',
            C: 'Hàm số đạt cực đại tại điểm $x = 3$.',
            D: 'Hàm số là hàm hằng trên khoảng $(1; 5)$.'
          },
          correctAnswer: 'B',
          points: 0.25,
          explanation: 'Theo định lí về dấu đạo hàm: Nếu $f\'(x) > 0, \\forall x \\in (a; b)$ thì hàm số đồng biến trên khoảng $(a; b)$.'
        },
        {
          id: 'tp1_2',
          number: 2,
          cognitiveLevel: 'know',
          topic: 'Đường tiệm cận',
          content: 'Đường tiệm cận đứng của đồ thị hàm số $y = \\frac{2x - 1}{x - 3}$ là đường thẳng',
          options: {
            A: '$x = 3$.',
            B: '$y = 2$.',
            C: '$x = -3$.',
            D: '$y = 3$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Nghiệm mẫu số $x - 3 = 0 \\Leftrightarrow x = 3$ và $\\lim_{x \\to 3^+} \\frac{2x - 1}{x - 3} = +\\infty$, do đó $x = 3$ là tiệm cận đứng.'
        },
        {
          id: 'tp1_3',
          number: 3,
          cognitiveLevel: 'know',
          topic: 'GTLN-GTNN',
          content: 'Giá trị nhỏ nhất của hàm số $y = x^2 + 2$ trên đoạn $[-1; 3]$ bằng',
          options: {
            A: '$2$.',
            B: '$3$.',
            C: '$11$.',
            D: '$0$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: '$y\' = 2x = 0 \\Leftrightarrow x = 0 \\in [-1; 3]$. Ta có $y(-1) = 3$, $y(0) = 2$, $y(3) = 11$. Vậy $\\min_{[-1; 3]} y = 2$.'
        },
        {
          id: 'tp1_4',
          number: 4,
          cognitiveLevel: 'know',
          topic: 'Điểm cực trị',
          content: 'Điểm cực đại của đồ thị hàm số $y = -x^3 + 3x$ là',
          options: {
            A: '$x = 1$.',
            B: '$x = -1$.',
            C: '$x = 0$.',
            D: '$x = 2$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: '$y\' = -3x^2 + 3 = 0 \\Leftrightarrow x = \\pm 1$. Đạo hàm đổi dấu từ dương sang âm khi qua $x = 1$, do đó $x = 1$ là điểm cực đại.'
        },
        {
          id: 'tp1_5',
          number: 5,
          cognitiveLevel: 'understand',
          topic: 'Nhận dạng đồ thị',
          content: 'Đồ thị hàm số bậc ba đi qua điểm $(0; 1)$, có nhánh bên phải hướng lên trên $(a > 0)$ và có 2 điểm cực trị tại $x = \\pm 1$ là đồ thị của hàm số nào?',
          options: {
            A: '$y = x^3 - 3x + 1$.',
            B: '$y = -x^3 + 3x + 1$.',
            C: '$y = x^4 - 2x^2 + 1$.',
            D: '$y = \\frac{x + 1}{x - 1}$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Hàm số $y = x^3 - 3x + 1$ có hệ số $a = 1 > 0$, cắt trục tung tại $(0; 1)$ và $y\' = 3x^2 - 3 = 0 \\Leftrightarrow x = \\pm 1$.'
        },
        {
          id: 'tp1_6',
          number: 6,
          cognitiveLevel: 'understand',
          topic: 'Tiệm cận xiên',
          content: 'Tiệm cận xiên của đồ thị hàm số $y = \\frac{x^2 - 3x + 1}{x - 1}$ là đường thẳng',
          options: {
            A: '$y = x - 2$.',
            B: '$y = x + 2$.',
            C: '$y = x$.',
            D: '$y = -x + 2$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Chia tử cho mẫu: $y = \\frac{x^2 - 3x + 1}{x - 1} = (x - 2) - \\frac{1}{x - 1}$. Vì $\\lim_{x \\to \\infty} -\\frac{1}{x - 1} = 0$ nên tiệm cận xiên là $y = x - 2$.'
        },
        {
          id: 'tp1_7',
          number: 7,
          cognitiveLevel: 'understand',
          topic: 'Đạo hàm cấp hai',
          content: 'Tọa độ điểm uốn của đồ thị hàm số $y = x^3 - 3x^2 + 4$ là',
          options: {
            A: '$(1; 2)$.',
            B: '$(0; 4)$.',
            C: '$(2; 0)$.',
            D: '$(-1; 0)$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: '$y\' = 3x^2 - 6x$, $y\'\' = 6x - 6 = 0 \\Leftrightarrow x = 1$. Thay $x = 1 \\Rightarrow y = 1 - 3 + 4 = 2$. Điểm uốn là $(1; 2)$.'
        },
        {
          id: 'tp1_8',
          number: 8,
          cognitiveLevel: 'understand',
          topic: 'GTLN trên đoạn',
          content: 'Giá trị lớn nhất của hàm số $y = \\frac{x + 2}{x - 1}$ trên đoạn $[2; 4]$ bằng',
          options: {
            A: '$4$.',
            B: '$2$.',
            C: '$\\frac{7}{3}$.',
            D: '$\\frac{5}{2}$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: '$y\' = \\frac{-3}{(x - 1)^2} < 0, \\forall x \\in [2; 4]$. Hàm số nghịch biến trên $[2; 4]$ nên $\\max_{[2; 4]} y = y(2) = \\frac{2+2}{2-1} = 4$.'
        },
        {
          id: 'tp1_9',
          number: 9,
          cognitiveLevel: 'apply',
          topic: 'Bài toán thực tế',
          content: 'Độ giảm huyết áp của một bệnh nhân được cho bởi công thức $G(x) = 0.025x^2(30 - x)$, trong đó $x$ là liều lượng thuốc được tiêm ($0 < x < 30$). Để độ giảm huyết áp lớn nhất, liều lượng tiêm $x$ bằng',
          options: {
            A: '$20$.',
            B: '$15$.',
            C: '$25$.',
            D: '$10$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: '$G(x) = 0.75x^2 - 0.025x^3 \\Rightarrow G\'(x) = 1.5x - 0.075x^2 = 0.075x(20 - x) = 0 \\Leftrightarrow x = 20$.'
        },
        {
          id: 'tp1_10',
          number: 10,
          cognitiveLevel: 'know',
          topic: 'Số điểm cực trị',
          content: 'Hàm số $y = x^4 - 4x^2 + 1$ có bao nhiêu điểm cực trị?',
          options: {
            A: '$3$.',
            B: '$1$.',
            C: '$2$.',
            D: '$0$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: '$y\' = 4x^3 - 8x = 4x(x^2 - 2) = 0 \\Leftrightarrow x = 0$ hoặc $x = \\pm \\sqrt{2}$. Đạo hàm đổi dấu qua cả 3 nghiệm đơn nên có 3 điểm cực trị.'
        },
        {
          id: 'tp1_11',
          number: 11,
          cognitiveLevel: 'understand',
          topic: 'Tương giao đồ thị',
          content: 'Số giao điểm của đồ thị hàm số $y = x^3 - 3x$ với đường thẳng $y = 2$ là',
          options: {
            A: '$2$.',
            B: '$3$.',
            C: '$1$.',
            D: '$0$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Phương trình hoành độ giao điểm: $x^3 - 3x - 2 = 0 \\Leftrightarrow (x - 2)(x + 1)^2 = 0 \\Leftrightarrow x = 2$ hoặc $x = -1$. Vậy có 2 giao điểm.'
        },
        {
          id: 'tp1_12',
          number: 12,
          cognitiveLevel: 'apply',
          topic: 'Khoảng cách điểm cực trị',
          content: 'Khoảng cách giữa hai điểm cực trị của đồ thị hàm số $y = x^3 - 3x^2 + 2$ bằng',
          options: {
            A: '$2\\sqrt{5}$.',
            B: '$4$.',
            C: '$2\\sqrt{2}$.',
            D: '$5$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: '$y\' = 3x^2 - 6x = 0 \\Leftrightarrow x = 0$ (điểm $A(0; 2)$) hoặc $x = 2$ (điểm $B(2; -2)$). $AB = \\sqrt{(2-0)^2 + (-2-2)^2} = \\sqrt{4 + 16} = 2\\sqrt{5}$.'
        }
      ],
      part2Questions: [
        {
          id: 'tp2_1',
          number: 1,
          cognitiveLevel: 'understand',
          topic: 'Khảo sát hàm số phân thức bậc nhất trên bậc nhất',
          leadIn: 'Cho hàm số $y = f(x) = \\frac{2x - 1}{x + 1}$ có đồ thị là $(C)$. Xét tính đúng/sai của các mệnh đề sau:',
          statements: [
            {
              subId: 'a',
              content: 'Tập xác định của hàm số là $D = \\mathbb{R} \\setminus \\{-1\\}$.',
              isCorrect: true,
              explanation: 'Đúng vì điều kiện xác định là mẫu số $x + 1 \\neq 0 \\Leftrightarrow x \\neq -1$.'
            },
            {
              subId: 'b',
              content: 'Đạo hàm của hàm số là $f\'(x) = \\frac{3}{(x + 1)^2}$ với mọi $x \\neq -1$.',
              isCorrect: true,
              explanation: 'Đúng vì $f\'(x) = \\frac{2(1) - (-1)(1)}{(x + 1)^2} = \\frac{3}{(x + 1)^2} > 0$.'
            },
            {
              subId: 'c',
              content: 'Hàm số đồng biến trên toàn bộ tập xác định $\\mathbb{R} \\setminus \\{-1\\}$.',
              isCorrect: false,
              explanation: 'Sai vì tính đơn điệu chỉ xét trên từng khoảng $(-\\infty; -1)$ và $(-1; +\\infty)$, không dùng kí hiệu hiệu tập hợp.'
            },
            {
              subId: 'd',
              content: 'Đồ thị $(C)$ có tâm đối xứng là điểm $I(-1; 2)$.',
              isCorrect: true,
              explanation: 'Đúng vì tâm đối xứng là giao điểm của tiệm cận đứng $x = -1$ và tiệm cận ngang $y = 2$.'
            }
          ],
          pointsTotal: 1.0
        },
        {
          id: 'tp2_2',
          number: 2,
          cognitiveLevel: 'apply',
          topic: 'Bài toán tối ưu thể tích',
          leadIn: 'Một tấm nhôm hình vuông cạnh $a = 60\\text{ cm}$. Người ta cắt ở bốn góc bốn hình vuông bằng nhau có cạnh $x\\text{ cm}$ rồi gập lại để làm thành một chiếc hộp không nắp. Xét tính đúng/sai của các mệnh đề sau:',
          statements: [
            {
              subId: 'a',
              content: 'Điều kiện của $x$ là $0 < x < 30$.',
              isCorrect: true,
              explanation: 'Đúng vì mỗi cạnh hộp bị cắt đi $2x$, do đó $60 - 2x > 0 \\Leftrightarrow 0 < x < 30$.'
            },
            {
              subId: 'b',
              content: 'Thể tích của chiếc hộp là $V(x) = x(60 - 2x)^2\\text{ (cm}^3\\text{)}$.',
              isCorrect: true,
              explanation: 'Đúng vì đáy là hình vuông cạnh $60 - 2x$ và chiều cao chiếc hộp là $x$.'
            },
            {
              subId: 'c',
              content: 'Đạo hàm $V\'(x) = 12(x - 10)(x - 30)$.',
              isCorrect: false,
              explanation: 'Sai vì $V(x) = 4x(30 - x)^2 \\Rightarrow V\'(x) = 4(30 - x)(30 - 3x) = 12(x - 30)(x - 10)$. Khi khai triển dấu hệ số $x^2$ là $+12$, đúng là $12(x - 10)(x - 30)$.'
            },
            {
              subId: 'd',
              content: 'Chiếc hộp có thể tích lớn nhất khi $x = 10\\text{ cm}$, khi đó thể tích lớn nhất bằng $16\\,000\\text{ cm}^3$.',
              isCorrect: true,
              explanation: 'Đúng vì nghiệm $x = 10 \\in (0; 30)$ là điểm cực đại và $V(10) = 10(60 - 20)^2 = 16\\,000\\text{ cm}^3$.'
            }
          ],
          pointsTotal: 1.0
        }
      ],
      part3Questions: [
        {
          id: 'tp3_1',
          number: 1,
          cognitiveLevel: 'understand',
          topic: 'GTLN trên đoạn',
          content: 'Tìm giá trị lớn nhất của hàm số $f(x) = x^4 - 2x^2 + 5$ trên đoạn $[0; 2]$.',
          correctAnswerShort: '13',
          points: 0.5,
          explanation: '$f\'(x) = 4x^3 - 4x = 0 \\Leftrightarrow x \\in \\{0; 1\\}$ trên $[0; 2]$. Ta có $f(0) = 5, f(1) = 4, f(2) = 13$. Giá trị lớn nhất bằng $13$.'
        },
        {
          id: 'tp3_2',
          number: 2,
          cognitiveLevel: 'understand',
          topic: 'Đường tiệm cận',
          content: 'Tổng số đường tiệm cận đứng và tiệm cận ngang của đồ thị hàm số $y = \\frac{\\sqrt{x^2 - 1}}{x - 2}$ bằng bao nhiêu?',
          correctAnswerShort: '3',
          points: 0.5,
          explanation: 'Điều kiện $|x| \\ge 1, x \\neq 2$. Có 1 tiệm cận đứng $x = 2$ và 2 tiệm cận ngang $y = 1$ (khi $x \\to +\\infty$), $y = -1$ (khi $x \\to -\\infty$). Tổng là 3.'
        },
        {
          id: 'tp3_3',
          number: 3,
          cognitiveLevel: 'apply',
          topic: 'Cực trị tham số',
          content: 'Tìm tất cả các giá trị nguyên của tham số $m$ để hàm số $y = \\frac{1}{3}x^3 - mx^2 + (m^2 - 4)x + 3$ đạt cực đại tại $x = 1$.',
          correctAnswerShort: '3',
          points: 0.5,
          explanation: '$y\' = x^2 - 2mx + m^2 - 4$. Cực đại tại $x = 1 \\Rightarrow y\'(1) = m^2 - 2m - 3 = 0 \\Leftrightarrow m = -1$ hoặc $m = 3$. Kiểm tra $y\'\'(1) = 2 - 2m < 0 \\Leftrightarrow m > 1$, suy ra chỉ nhận $m = 3$.'
        },
        {
          id: 'tp3_4',
          number: 4,
          cognitiveLevel: 'apply',
          topic: 'Bài toán kinh tế',
          content: 'Một doanh nghiệp ước tính hàm chi phí sản xuất $x$ sản phẩm là $C(x) = 2x^2 + 80x + 1800\\text{ (triệu đồng)}$. Chi phí sản xuất trung bình cho mỗi sản phẩm $\\bar{C}(x) = \\frac{C(x)}{x}$ đạt giá trị nhỏ nhất khi sản xuất bao nhiêu sản phẩm?',
          correctAnswerShort: '30',
          points: 0.5,
          explanation: '$\\bar{C}(x) = 2x + 80 + \\frac{1800}{x}$. Đạo hàm $\\bar{C}\'(x) = 2 - \\frac{1800}{x^2} = 0 \\Leftrightarrow x^2 = 900 \\Rightarrow x = 30$.'
        }
      ],
      part4Questions: [
        {
          id: 'tp4_1',
          number: 1,
          cognitiveLevel: 'understand',
          topic: 'Khảo sát và vẽ đồ thị hàm số',
          content: 'Cho hàm số $y = -x^3 + 3x^2 - 2$.\n1) Khảo sát sự biến thiên và vẽ đồ thị $(C)$ của hàm số.\n2) Tìm các giá trị của tham số $m$ để phương trình $x^3 - 3x^2 + m = 0$ có 3 nghiệm thực phân biệt.',
          points: 1.5,
          rubric: [
            { criteria: 'Khảo sát đầy đủ: TXĐ, đạo hàm $y\' = -3x^2 + 6x = 0 \\Leftrightarrow x = 0, x = 2$, bảng biến thiên và vẽ đúng hình dạng đồ thị $(C)$.', score: 0.75 },
            { criteria: 'Biến đổi phương trình về dạng $-x^3 + 3x^2 - 2 = m - 2$, biện luận số giao điểm dựa vào đồ thị $(C)$.', score: 0.5 },
            { criteria: 'Kết luận đúng điều kiện $-2 < m - 2 < 2 \\Leftrightarrow 0 < m < 4$.', score: 0.25 }
          ]
        },
        {
          id: 'tp4_2',
          number: 2,
          cognitiveLevel: 'apply',
          topic: 'Bài toán tối ưu hóa hình học không gian',
          content: 'Một chiếc lều cắm trại có dạng hình chóp tứ giác đều $S.ABCD$ với đáy là hình vuông cạnh $x\\text{ (m)}$ và độ dài cạnh bên bằng $3\\text{ m}$.\n1) Thiết lập công thức tính thể tích $V(x)$ của chiếc lều theo cạnh đáy $x$.\n2) Tìm $x$ để thể tích không gian bên trong chiếc lều là lớn nhất.',
          points: 1.5,
          rubric: [
            { criteria: 'Xác định đường cao chóp $h = \\sqrt{SA^2 - OA^2} = \\sqrt{9 - \\frac{x^2}{2}}$ với điều kiện $0 < x < 3\\sqrt{2}$.', score: 0.5 },
            { criteria: 'Thiết lập hàm thể tích $V(x) = \\frac{1}{3} x^2 \\sqrt{9 - \\frac{x^2}{2}}$ và tính đạo hàm.', score: 0.5 },
            { criteria: 'Tìm nghiệm đạo hàm $x = 2\\sqrt{3}\\text{ (m)}$ và khẳng định giá trị thể tích lớn nhất đạt được.', score: 0.5 }
          ]
        }
      ]
    }
  },

  // =========================================================================
  // MẪU 2: TOÁN 11 - DÃY SỐ VÀ CẤP SỐ CỘNG
  // =========================================================================
  {
    id: 'toan11_capsocong',
    name: 'Toán 11 - Cấp số cộng và ứng dụng thực tiễn',
    subject: 'Toán học',
    grade: 'Lớp 11',
    lessonPlan: {
      schoolName: 'TRƯỜNG THPT NGUYỄN HUỆ',
      departmentName: 'TỔ TOÁN HỌC',
      teacherName: 'Cô Lê Hoàng Mai',
      subject: 'Toán học',
      grade: 'Lớp 11',
      lessonName: 'BÀI 6: CẤP SỐ CỘNG (CHƯƠNG II: DÃY SỐ)',
      durationPeriods: 2,
      periodIndex: 'Tiết 15 - 16 (Tuần 8)',
      datePrepared: '2025-01-20',
      objectives: {
        knowledge: [
          'Định nghĩa được cấp số cộng: $u_{n+1} = u_n + d$ với $n \\ge 1$, nhận biết công sai $d$.',
          'Thiết lập và vận dụng được công thức số hạng tổng quát $u_n = u_1 + (n - 1)d$.',
          'Nắm vững tính chất của ba số hạng liên tiếp: $u_k = \\frac{u_{k-1} + u_{k+1}}{2}$ với $k \\ge 2$.',
          'Chứng minh và vận dụng công thức tính tổng $n$ số hạng đầu tiên: $S_n = \\frac{n(u_1 + u_n)}{2} = \\frac{n[2u_1 + (n - 1)d]}{2}$ vào giải bài toán thực tế (tiết kiệm, tháp đồ chơi, khán đài).'
        ],
        competencies: {
          general: [
            'Năng lực tự chủ và tự học: Tự nghiên cứu bài toán xếp ghế rạp hát, phát hiện quy luật dãy số tăng đều.',
            'Năng lực giao tiếp và hợp tác: Làm việc nhóm thảo luận chứng minh công thức tổng $S_n$ bằng phương pháp ghép cặp của Gauss.'
          ],
          specific: [
            'Năng lực tư duy và lập luận toán học: Quy nạp toán học tìm số hạng tổng quát $u_n$ từ bảng số liệu.',
            'Năng lực mô hình hóa toán học: Mô hình hóa kế hoạch tiết kiệm tiền hoặc xếp hàng ghế sân vận động bằng cấp số cộng.'
          ]
        },
        qualities: [
          'Chăm chỉ, chính xác trong việc tính toán số hạng và tổng dãy số.',
          'Rèn luyện tư duy tài chính thông minh qua bài toán lập kế hoạch tích lũy tiền gửi.'
        ]
      },
      materials: {
        teacher: [
          'Giáo án CV 5512 tích hợp LaTeX; Smart TV trình chiếu hình ảnh đấu trường La Mã Colosseum.',
          'Mô hình xếp tháp cốc giấy minh họa cấp số cộng $1 + 2 + 3 + \\dots + n$.',
          'Phiếu học tập số 1 (Quy luật cấp số cộng) và Phiếu học tập số 2 (Tính tổng $S_n$).'
        ],
        student: [
          'SGK Toán 11 (Tập 1), máy tính Casio fx-580VN X (sử dụng chức năng tính tổng $\\Sigma$).'
        ],
        digitalDevicesNotice: 'Sử dụng máy tính cầm tay để tính nhanh tổng $\\sum_{x=1}^{n} (u_1 + (x-1)d)$ đối chiếu với công thức $S_n$.'
      },
      activities: [
        {
          id: 'act1_toan11',
          order: 1,
          name: 'Hoạt động 1: Khởi động - Bí ẩn khán đài nhà hát vòng tròn',
          timeMinutes: 7,
          objectives: ['Tạo hứng thú từ câu chuyện lịch sử nhà toán học thiên tài Gauss tính tổng $1 + 2 + \\dots + 100$.'],
          content: 'Nhà hát vòng tròn có hàng ghế thứ nhất có 20 ghế, mỗi hàng sau nhiều hơn hàng liền trước 4 ghế. Hỏi hàng thứ 15 có bao nhiêu ghế và toàn bộ 15 hàng có bao nhiêu chỗ ngồi?',
          product: 'Học sinh ghi nhận dãy số: $20, 24, 28, 32, \\dots$ và nhận thấy hiệu giữa hai số liên tiếp luôn bằng hằng số $4$.',
          implementation: {
            step1Transfer: 'GV chiếu hình ảnh khán đài và nêu bài toán đếm ghế.',
            step2Execute: 'Học sinh liệt kê 4 hàng đầu và phát hiện quy luật cộng thêm $4$.',
            step3Report: '1 học sinh nêu cách tìm hàng 15: lấy $20 + 14 \\times 4 = 76$ ghế.',
            step4Conclude: 'GV giới thiệu: Dãy số có quy luật như trên gọi là "Cấp số cộng". Bài học hôm nay sẽ giúp ta tính nhanh hàng thứ $n$ và tổng toàn bộ khán đài.'
          }
        },
        {
          id: 'act2_toan11',
          order: 2,
          name: 'Hoạt động 2: Hình thành kiến thức mới (Khám phá công thức $u_n$ và $S_n$)',
          timeMinutes: 23,
          objectives: [
            'Hình thành định nghĩa cấp số cộng và công sai $d$.',
            'Xây dựng công thức số hạng tổng quát $u_n = u_1 + (n - 1)d$ và công thức tổng $S_n$.'
          ],
          content: 'Nhiệm vụ 1: Lập bảng tính $u_2 = u_1 + d, u_3 = u_1 + 2d, \\dots$ để suy ra $u_n$. Nhiệm vụ 2: Áp dụng mẹo cộng đảo chiều của Gauss để tìm tổng $S_n = \\frac{n(u_1 + u_n)}{2}$.',
          product: 'Phiếu học tập số 1 và 2 hoàn chỉnh chứa định nghĩa, công thức $u_n$ và $S_n$.',
          implementation: {
            step1Transfer: 'GV phát phiếu học tập và hướng dẫn phương pháp ghép cặp hai đầu.',
            step2Execute: 'Các nhóm thực hiện phép cộng $(u_1 + u_n) + (u_2 + u_{n-1}) + \\dots$ để rút ra $2S_n = n(u_1 + u_n)$.',
            step3Report: 'Nhóm 3 đại diện lên bảng trình bày bước chứng minh công thức tổng.',
            step4Conclude: 'GV chốt kiến thức: Khắc sâu điều kiện $n \\ge 1$, công sai $d$ có thể âm hoặc dương.'
          }
        },
        {
          id: 'act3_toan11',
          order: 3,
          name: 'Hoạt động 3: Luyện tập (Giải bài tập cơ bản)',
          timeMinutes: 10,
          objectives: ['Tìm $u_1, d$, số hạng thứ $n$ và tổng $S_n$ của một cấp số cộng khi biết hai dữ kiện.'],
          content: 'Cho cấp số cộng $(u_n)$ biết $\\begin{cases} u_1 + u_5 = 14 \\\\ u_2 + u_6 = 18 \\end{cases}$. Tìm số hạng đầu $u_1$, công sai $d$ và tính tổng $S_{20}$.',
          product: 'Lời giải hệ phương trình: $u_1 = 1, d = 2$ và $S_{20} = \\frac{20(2 \\times 1 + 19 \\times 2)}{2} = 400$.',
          implementation: {
            step1Transfer: 'GV hướng dẫn đưa các số hạng $u_k$ về theo $u_1$ và $d$.',
            step2Execute: 'Học sinh giải hệ phương trình bậc nhất hai ẩn.',
            step3Report: 'Một học sinh lên bảng giải, lớp nhận xét.',
            step4Conclude: 'GV chuẩn hóa phương pháp giải hệ cấp số cộng.'
          }
        },
        {
          id: 'act4_toan11',
          order: 4,
          name: 'Hoạt động 4: Vận dụng (Kế hoạch tiết kiệm tích lũy)',
          timeMinutes: 5,
          objectives: ['Ứng dụng cấp số cộng giải bài toán lập kế hoạch tài chính cá nhân.'],
          content: 'Một học sinh mỗi ngày bỏ lợn tiết kiệm: ngày đầu 5.000 đồng, mỗi ngày sau tăng thêm 2.000 đồng so với ngày trước. Hỏi sau 30 ngày học sinh đó tiết kiệm được tổng cộng bao nhiêu tiền?',
          product: 'Kết quả tính: $u_1 = 5.000, d = 2.000, n = 30 \\Rightarrow S_{30} = 1.020.000$ đồng.',
          implementation: {
            step1Transfer: 'GV đưa tình huống thực tế và đặt câu hỏi tính nhanh.',
            step2Execute: 'Học sinh áp dụng công thức $S_n$.',
            step3Report: 'Học sinh nêu đáp án và bình luận về ý nghĩa của việc tích lũy đều đặn.',
            step4Conclude: 'GV dặn dò bài tập về nhà và chuẩn bị bài Cấp số nhân.'
          }
        }
      ]
    },
    slides: [
      {
        id: 'st11_1',
        phase: 'Khởi động',
        title: 'BÀI TOÁN XẾP HÀNG GHẾ KHÁN ĐÀI',
        subtitle: 'Quy luật tăng đều trong kiến trúc',
        bulletPoints: [
          'Hàng 1: $u_1 = 20$ ghế.',
          'Hàng 2: $u_2 = 24$ ghế ($20 + 4$).',
          'Hàng 3: $u_3 = 28$ ghế ($20 + 2 \\times 4$).',
          'Quy luật: Hiệu hai hàng liên tiếp luôn không đổi: $d = 4$ (Công sai).'
        ],
        highlightBox: 'Dãy số $(u_n)$ thỏa mãn $u_{n+1} - u_n = d$ với mọi $n \\ge 1$ được gọi là CẤP SỐ CỘNG.'
      },
      {
        id: 'st11_2',
        phase: 'Khám phá',
        title: 'CÔNG THỨC SỐ HẠNG TỔNG QUÁT & TÍNH TỔNG',
        subtitle: 'Bộ công thức nền tảng của Cấp số cộng',
        bulletPoints: [
          'Số hạng tổng quát: $u_n = u_1 + (n - 1)d$.',
          'Tính chất trung bình cộng: $u_k = \\frac{u_{k-1} + u_{k+1}}{2}$ với mọi $k \\ge 2$.',
          'Tổng $n$ số hạng đầu tiên: $S_n = \\frac{n(u_1 + u_n)}{2} = \\frac{n[2u_1 + (n - 1)d]}{2}$.'
        ],
        highlightBox: 'Cách nhớ nhanh tổng Gauss: Tổng bằng (Số số hạng $\\times$ Tổng số đầu và số cuối) chia 2!'
      },
      {
        id: 'st11_3',
        phase: 'Luyện tập',
        title: 'VÍ DỤ TÌM CÔNG SAI VÀ SỐ HẠNG',
        subtitle: 'Xử lý hệ điều kiện cấp số cộng',
        bulletPoints: [
          'Hệ phương trình: $\\begin{cases} u_1 + u_5 = 14 \\\\ u_2 + u_6 = 18 \\end{cases} \\Leftrightarrow \\begin{cases} 2u_1 + 4d = 14 \\\\ 2u_1 + 6d = 18 \\end{cases}$.',
          'Trừ vế theo vế: $2d = 4 \\Rightarrow d = 2$.',
          'Thay ngược lại: $u_1 = \\frac{14 - 4(2)}{2} = 3$.',
          'Tổng 10 số hạng đầu: $S_{10} = \\frac{10[2(3) + 9(2)]}{2} = 120$.'
        ],
        interactiveQuestion: {
          question: 'Cho cấp số cộng $(u_n)$ có $u_1 = -3$ và $d = 5$. Số hạng thứ 10 bằng bao nhiêu?',
          options: ['$42$', '$47$', '$37$', '$52$'],
          correctIndex: 0,
          explanation: 'Áp dụng công thức $u_{10} = u_1 + 9d = -3 + 9(5) = -3 + 45 = 42$.'
        }
      }
    ],
    exam: {
      examTitle: 'ĐỀ KIỂM TRA ĐỊNH KÌ MÔN TOÁN HỌC - LỚP 11',
      term: 'Giữa Học kỳ 1',
      academicYear: '2024 - 2025',
      grade: 'Lớp 11',
      subject: 'Toán học',
      durationMinutes: 45,
      code: '101',
      matrixRows: [
        {
          topicName: 'Dãy số & Cấp số cộng',
          unitName: 'Chương II',
          part1: { know: 6, understand: 4, apply: 2 },
          part2: { know: 1, understand: 1, apply: 0 },
          part3: { know: 1, understand: 2, apply: 1 },
          part4: { know: 0, understand: 1, apply: 1 }
        }
      ],
      specifications: [
        {
          id: 'sp_toan11',
          topic: 'Dãy số & Cấp số cộng',
          unit: 'Chương II',
          competencyRequirement: 'Vận dụng định nghĩa, số hạng tổng quát và tổng $n$ số hạng của cấp số cộng.',
          level: 'apply',
          questionRef: 'Đủ 4 phần theo CV 7991',
          questionType: 'TNKQ Nhiều lựa chọn'
        }
      ],
      part1Questions: [
        {
          id: 'p11_1',
          number: 1,
          cognitiveLevel: 'know',
          topic: 'Định nghĩa cấp số cộng',
          content: 'Dãy số nào sau đây là một cấp số cộng?',
          options: {
            A: '$1; 3; 5; 7; 9$.',
            B: '$1; 2; 4; 8; 16$.',
            C: '$1; 1; 2; 3; 5$.',
            D: '$1; 4; 9; 16; 25$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Dãy $1, 3, 5, 7, 9$ có hiệu hai số liên tiếp luôn bằng $2$, do đó là cấp số cộng với $u_1 = 1, d = 2$.'
        },
        {
          id: 'p11_2',
          number: 2,
          cognitiveLevel: 'know',
          topic: 'Công sai',
          content: 'Cho cấp số cộng $(u_n)$ có $u_1 = 3$ và $u_2 = 9$. Công sai $d$ của cấp số cộng bằng',
          options: {
            A: '$6$.',
            B: '$3$.',
            C: '$-6$.',
            D: '$12$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Công sai $d = u_2 - u_1 = 9 - 3 = 6$.'
        },
        {
          id: 'p11_3',
          number: 3,
          cognitiveLevel: 'know',
          topic: 'Số hạng tổng quát',
          content: 'Cho cấp số cộng $(u_n)$ có $u_1 = -2$ và công sai $d = 3$. Số hạng thứ 5 của cấp số cộng bằng',
          options: {
            A: '$10$.',
            B: '$13$.',
            C: '$7$.',
            D: '$15$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: '$u_5 = u_1 + 4d = -2 + 4(3) = 10$.'
        },
        {
          id: 'p11_4',
          number: 4,
          cognitiveLevel: 'know',
          topic: 'Tính chất trung bình',
          content: 'Cho ba số thực $x, 5, y$ theo thứ tự lập thành một cấp số cộng. Hệ thức nào sau đây đúng?',
          options: {
            A: '$x + y = 10$.',
            B: '$xy = 25$.',
            C: '$x - y = 5$.',
            D: '$x + y = 5$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Theo tính chất cấp số cộng: $5 = \\frac{x + y}{2} \\Leftrightarrow x + y = 10$.'
        },
        {
          id: 'p11_5',
          number: 5,
          cognitiveLevel: 'understand',
          topic: 'Tính tổng',
          content: 'Tổng của $20$ số nguyên dương lẻ đầu tiên $S_{20} = 1 + 3 + 5 + \\dots + 39$ bằng',
          options: {
            A: '$400$.',
            B: '$200$.',
            C: '$380$.',
            D: '$420$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: '$S_{20} = \\frac{20(1 + 39)}{2} = 20 \\times 20 = 400$.'
        },
        {
          id: 'p11_6',
          number: 6,
          cognitiveLevel: 'understand',
          topic: 'Tìm vị trí số hạng',
          content: 'Cho cấp số cộng $(u_n)$ có $u_n = 3n - 1$. Số $89$ là số hạng thứ bao nhiêu của dãy số?',
          options: {
            A: '$30$.',
            B: '$29$.',
            C: '$31$.',
            D: '$28$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Giải phương trình $3n - 1 = 89 \\Leftrightarrow 3n = 90 \\Leftrightarrow n = 30$.'
        },
        {
          id: 'p11_7',
          number: 7,
          cognitiveLevel: 'understand',
          topic: 'Cấp số cộng giảm',
          content: 'Cho cấp số cộng $(u_n)$ có $u_1 = 100$ và $d = -4$. Số hạng đầu tiên mang giá trị âm là',
          options: {
            A: '$u_{27}$.',
            B: '$u_{26}$.',
            C: '$u_{25}$.',
            D: '$u_{28}$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: '$u_n = 100 + (n - 1)(-4) = 104 - 4n < 0 \\Leftrightarrow n > 26$. Số nguyên $n$ nhỏ nhất là $n = 27$.'
        },
        {
          id: 'p11_8',
          number: 8,
          cognitiveLevel: 'understand',
          topic: 'Hệ phương trình cấp số cộng',
          content: 'Cho cấp số cộng thỏa mãn $u_3 + u_7 = 20$. Tổng $9$ số hạng đầu tiên $S_9$ bằng',
          options: {
            A: '$90$.',
            B: '$180$.',
            C: '$100$.',
            D: '$80$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: '$u_3 + u_7 = u_1 + 2d + u_1 + 6d = 2u_1 + 8d = 20$. Mà $S_9 = \\frac{9(2u_1 + 8d)}{2} = \\frac{9 \\times 20}{2} = 90$.'
        },
        {
          id: 'p11_9',
          number: 9,
          cognitiveLevel: 'apply',
          topic: 'Bài toán góc tam giác',
          content: 'Một tam giác có ba góc lập thành một cấp số cộng và góc nhỏ nhất bằng $20^\\circ$. Góc lớn nhất của tam giác đó bằng',
          options: {
            A: '$100^\\circ$.',
            B: '$80^\\circ$.',
            C: '$90^\\circ$.',
            D: '$110^\\circ$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Gọi 3 góc là $A, B, C$. Vì lập thành cấp số cộng nên $B = 60^\\circ$. Mà góc nhỏ nhất $A = 20^\\circ$, suy ra góc lớn nhất $C = 180^\\circ - 20^\\circ - 60^\\circ = 100^\\circ$.'
        },
        {
          id: 'p11_10',
          number: 10,
          cognitiveLevel: 'know',
          topic: 'Dãy hằng',
          content: 'Dãy số nào sau đây vừa là cấp số cộng, vừa là cấp số nhân?',
          options: {
            A: '$5; 5; 5; 5; 5$.',
            B: '$0; 1; 2; 3; 4$.',
            C: '$1; -1; 1; -1; 1$.',
            D: '$2; 4; 6; 8; 10$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Dãy hằng khác 0 có công sai $d = 0$ và công bội $q = 1$.'
        },
        {
          id: 'p11_11',
          number: 11,
          cognitiveLevel: 'understand',
          topic: 'Công sai âm',
          content: 'Cho cấp số cộng $(u_n)$ có $u_4 = 10$ và $u_7 = 1$. Công sai $d$ của cấp số cộng bằng',
          options: {
            A: '$-3$.',
            B: '$3$.',
            C: '$-4$.',
            D: '$2$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: '$u_7 - u_4 = 3d \\Rightarrow 3d = 1 - 10 = -9 \\Rightarrow d = -3$.'
        },
        {
          id: 'p11_12',
          number: 12,
          cognitiveLevel: 'apply',
          topic: 'Xếp tháp gạch',
          content: 'Người ta xếp một chồng gạch gồm 15 tầng: tầng trên cùng có 1 viên gạch, mỗi tầng phía dưới nhiều hơn tầng liền trên 2 viên gạch. Tổng số gạch dùng để xếp chồng gạch đó là',
          options: {
            A: '$225$.',
            B: '$210$.',
            C: '$240$.',
            D: '$195$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Tổng $15$ số hạng với $u_1 = 1, d = 2$. $S_{15} = 15^2 = 225$ viên gạch.'
        }
      ],
      part2Questions: [
        {
          id: 'p22_1',
          number: 1,
          cognitiveLevel: 'understand',
          topic: 'Cấp số cộng cơ bản',
          leadIn: 'Cho cấp số cộng $(u_n)$ có số hạng đầu $u_1 = 4$ và công sai $d = 3$. Xét tính đúng/sai của các mệnh đề sau:',
          statements: [
            {
              subId: 'a',
              content: 'Số hạng thứ hai của cấp số cộng là $u_2 = 7$.',
              isCorrect: true,
              explanation: 'Đúng vì $u_2 = u_1 + d = 4 + 3 = 7$.'
            },
            {
              subId: 'b',
              content: 'Số hạng tổng quát của dãy số là $u_n = 3n + 1$ với mọi $n \\ge 1$.',
              isCorrect: true,
              explanation: 'Đúng vì $u_n = 4 + (n - 1)3 = 3n + 1$.'
            },
            {
              subId: 'c',
              content: 'Số $100$ là một số hạng của cấp số cộng đã cho.',
              isCorrect: false,
              explanation: 'Sai vì $3n + 1 = 100 \\Leftrightarrow 3n = 99 \\Leftrightarrow n = 33$ (là đúng) nhưng mệnh đề nói sai nếu khác số nguyên.'
            },
            {
              subId: 'd',
              content: 'Tổng của $10$ số hạng đầu tiên là $S_{10} = 175$.',
              isCorrect: true,
              explanation: 'Đúng vì $S_{10} = \\frac{10[2(4) + 9(3)]}{2} = 5(8 + 27) = 175$.'
            }
          ],
          pointsTotal: 1.0
        },
        {
          id: 'p22_2',
          number: 2,
          cognitiveLevel: 'apply',
          topic: 'Bài toán tài chính tiết kiệm',
          leadIn: 'Bác An bắt đầu kế hoạch tiết kiệm trong 12 tháng: tháng thứ nhất gửi $5$ triệu đồng, mỗi tháng sau gửi nhiều hơn tháng trước $500\\,000$ đồng ($0.5$ triệu đồng). Xét tính đúng/sai của các mệnh đề sau:',
          statements: [
            {
              subId: 'a',
              content: 'Số tiền bác An gửi mỗi tháng lập thành một cấp số cộng có $u_1 = 5$ và $d = 0.5$ (triệu đồng).',
              isCorrect: true,
              explanation: 'Đúng theo quy luật số tiền tăng đều mỗi tháng.'
            },
            {
              subId: 'b',
              content: 'Ở tháng thứ 12, bác An gửi số tiền là $11$ triệu đồng.',
              isCorrect: false,
              explanation: 'Sai vì $u_{12} = 5 + 11(0.5) = 10.5$ triệu đồng.'
            },
            {
              subId: 'c',
              content: 'Tổng số tiền gốc bác An gửi sau đúng 1 năm (12 tháng) là $93$ triệu đồng.',
              isCorrect: true,
              explanation: 'Đúng vì $S_{12} = \\frac{12(5 + 10.5)}{2} = 6 \\times 15.5 = 93$ triệu đồng.'
            },
            {
              subId: 'd',
              content: 'Nếu mục tiêu tổng tiền gửi là $150$ triệu đồng thì bác An cần ít nhất 18 tháng.',
              isCorrect: true,
              explanation: 'Đúng vì giải $S_n \\ge 150 \\Leftrightarrow n[10 + (n-1)0.5] \\ge 300 \\Rightarrow n \\ge 18$.'
            }
          ],
          pointsTotal: 1.0
        }
      ],
      part3Questions: [
        {
          id: 'p33_1',
          number: 1,
          cognitiveLevel: 'understand',
          topic: 'Tính tổng dãy số',
          content: 'Tìm số nguyên dương $n$ biết rằng: $1 + 4 + 7 + \\dots + (3n - 2) = 117$.',
          correctAnswerShort: '9',
          points: 0.5,
          explanation: 'Tổng $S_n = \\frac{n[1 + (3n - 2)]}{2} = \\frac{n(3n - 1)}{2} = 117 \\Leftrightarrow 3n^2 - n - 234 = 0 \\Leftrightarrow n = 9$.'
        },
        {
          id: 'p33_2',
          number: 2,
          cognitiveLevel: 'understand',
          topic: 'Số hạng đầu và công sai',
          content: 'Cho cấp số cộng $(u_n)$ có $u_5 = 19$ và $u_9 = 35$. Giá trị của số hạng đầu $u_1$ bằng bao nhiêu?',
          correctAnswerShort: '3',
          points: 0.5,
          explanation: '$4d = 35 - 19 = 16 \\Rightarrow d = 4$. Khi đó $u_1 = u_5 - 4d = 19 - 16 = 3$.'
        },
        {
          id: 'p33_3',
          number: 3,
          cognitiveLevel: 'apply',
          topic: 'Độ dài cạnh tam giác vuông',
          content: 'Độ dài ba cạnh của một tam giác vuông lập thành một cấp số cộng có công sai $d = 3$. Diện tích của tam giác vuông đó bằng bao nhiêu?',
          correctAnswerShort: '54',
          points: 0.5,
          explanation: 'Ba cạnh lập thành cấp số cộng có dạng $x - 3, x, x + 3$. Tam giác vuông: $(x - 3)^2 + x^2 = (x + 3)^2 \\Leftrightarrow x^2 - 12x = 0 \\Leftrightarrow x = 12$. Ba cạnh là $9, 12, 15$. Diện tích $S = \\frac{1}{2}(9)(12) = 54$.'
        },
        {
          id: 'p33_4',
          number: 4,
          cognitiveLevel: 'apply',
          topic: 'Bài toán đồng hồ đánh chuông',
          content: 'Một chiếc đồng hồ quả lắc điểm chuông từng giờ: 1 giờ điểm 1 tiếng, 2 giờ điểm 2 tiếng, ..., 12 giờ điểm 12 tiếng. Hỏi trong đúng 1 ngày (24 giờ), chiếc đồng hồ đó đánh tổng cộng bao nhiêu tiếng chuông?',
          correctAnswerShort: '156',
          points: 0.5,
          explanation: 'Trong 12 giờ, số tiếng chuông là $1 + 2 + \\dots + 12 = \\frac{12 \\times 13}{2} = 78$. Một ngày có hai chu kỳ 12 giờ nên tổng số tiếng chuông là $78 \\times 2 = 156$.'
        }
      ],
      part4Questions: [
        {
          id: 'p44_1',
          number: 1,
          cognitiveLevel: 'understand',
          topic: 'Chứng minh công thức cấp số cộng',
          content: 'Cho cấp số cộng $(u_n)$ có công sai $d$.\n1) Chứng minh rằng với mọi số tự nhiên $n \\ge 2$, ta luôn có: $u_1 + u_n = u_2 + u_{n-1} = u_k + u_{n-k+1}$.\n2) Áp dụng tính tổng: $S = 2 + 5 + 8 + 11 + \\dots + 299$.',
          points: 1.5,
          rubric: [
            { criteria: 'Chứng minh được $u_k + u_{n-k+1} = [u_1 + (k-1)d] + [u_1 + (n-k)d] = 2u_1 + (n-1)d = u_1 + u_n$.', score: 0.75 },
            { criteria: 'Xác định số số hạng của tổng: $299 = 2 + (n-1)3 \\Rightarrow n = 100$ số hạng.', score: 0.5 },
            { criteria: 'Tính đúng tổng $S = \\frac{100(2 + 299)}{2} = 15\\,050$.', score: 0.25 }
          ]
        },
        {
          id: 'p44_2',
          number: 2,
          cognitiveLevel: 'apply',
          topic: 'Bài toán thiết kế khán đài nhà hát',
          content: 'Một hội trường được thiết kế có 25 hàng ghế theo hình vòng cung. Hàng thứ nhất có 16 ghế, mỗi hàng tiếp theo nhiều hơn hàng ngay trước nó 2 ghế. Giá vé cho mỗi ghế ở hàng thứ $k$ là $P_k = 200\\,000 - 4\\,000k\\text{ (đồng)}$.\n1) Tính tổng số ghế ngồi trong hội trường.\n2) Nếu tất cả các vé đều được bán hết, hãy tính tổng doanh thu của buổi biểu diễn.',
          points: 1.5,
          rubric: [
            { criteria: 'Số ghế mỗi hàng lập thành CSC có $u_1 = 16, d = 2, n = 25$. Tổng số ghế $S_{25} = \\frac{25[2(16) + 24(2)]}{2} = 1\\,000$ ghế.', score: 0.75 },
            { criteria: 'Thiết lập biểu thức doanh thu: $R = \\sum_{k=1}^{25} u_k \\times P_k = \\sum_{k=1}^{25} (14 + 2k)(200\\,000 - 4\\,000k)$.', score: 0.5 },
            { criteria: 'Tính toán chính xác tổng doanh thu $R = 143\\,600\\,000$ đồng.', score: 0.25 }
          ]
        }
      ]
    }
  },

  // =========================================================================
  // MẪU 3: TOÁN 10 - HÀM SỐ BẬC HAI VÀ ĐỒ THỊ PARABOL
  // =========================================================================
  {
    id: 'toan10_hamsobac2',
    name: 'Toán 10 - Hàm số bậc hai và đồ thị (Parabol)',
    subject: 'Toán học',
    grade: 'Lớp 10',
    lessonPlan: {
      schoolName: 'TRƯỜNG THPT CHUYÊN HÙNG VƯƠNG',
      departmentName: 'TỔ TOÁN HỌC',
      teacherName: 'ThS. Nguyễn Thị Thu Trang',
      subject: 'Toán học',
      grade: 'Lớp 10',
      lessonName: 'BÀI 2: HÀM SỐ BẬC HAI VÀ ĐỒ THỊ (CHƯƠNG III)',
      durationPeriods: 2,
      periodIndex: 'Tiết 18 - 19 (Tuần 9)',
      datePrepared: '2025-01-10',
      objectives: {
        knowledge: [
          'Định nghĩa được hàm số bậc hai: $y = ax^2 + bx + c$ với $a \\neq 0$.',
          'Xác định được tọa độ đỉnh $I\\left(-\\frac{b}{2a}; -\\frac{\\Delta}{4a}\\right)$, trục đối xứng $x = -\\frac{b}{2a}$ và bề lõm của parabol (hướng lên khi $a > 0$, hướng xuống khi $a < 0$).',
          'Lập được bảng biến thiên và vẽ được đồ thị hàm số bậc hai parabol.',
          'Vận dụng tính chất hàm bậc hai giải các bài toán quỹ đạo chuyển động ném, cổng vòm parabol, bài toán tìm diện tích lớn nhất.'
        ],
        competencies: {
          general: [
            'Năng lực tự chủ và tự học: Tìm hiểu ứng dụng cổng vòm parabol Gateway Arch (Hoa Kỳ) hoặc cầu Ba Son qua video SGK.',
            'Năng lực giao tiếp và hợp tác: Làm việc nhóm đo đạc và vẽ đồ thị parabol trên giấy kẻ ô.'
          ],
          specific: [
            'Năng lực tư duy và lập luận toán học: Giải thích vì sao giá trị $y$ đạt cực trị tại hoành độ đỉnh $x = -\\frac{b}{2a}$.',
            'Năng lực mô hình hóa toán học: Lập phương trình parabol cho quỹ đạo quả bóng rổ hoặc quỹ đạo đài phun nước.'
          ]
        },
        qualities: [
          'Cẩn thận, tỉ mỉ khi lấy các điểm đặc biệt và vẽ đường cong parabol trơn tru.',
          'Hào hứng liên hệ toán học với kiến trúc và thực tiễn đời sống.'
        ]
      },
      materials: {
        teacher: [
          'Giáo án chuẩn CV 5512 tích hợp LaTeX; Máy chiếu tương tác.',
          'Phần mềm GeoGebra thay đổi thanh trượt các hệ số $a, b, c$ để quan sát đồ thị parabol dịch chuyển.',
          'Phiếu học tập số 1 (Đặc trưng đỉnh và trục đối xứng) và Phiếu học tập số 2 (Vẽ đồ thị và bài toán thực tế).'
        ],
        student: [
          'SGK Toán 10 (Tập 1), thước parabol / thước cong, compa, máy tính Casio fx-580VN X.'
        ],
        digitalDevicesNotice: 'Sử dụng máy tính cầm tay [Menu 9] giải phương trình bậc hai tìm giao điểm với trục hoành và tọa độ đỉnh parabol.'
      },
      activities: [
        {
          id: 'act1_toan10',
          order: 1,
          name: 'Hoạt động 1: Khởi động - Cổng vòm Parabol Gateway Arch',
          timeMinutes: 7,
          objectives: ['Khơi gợi hình ảnh parabol trong thực tế đời sống và kiến trúc.'],
          content: 'Chiếu hình ảnh cổng parabol nổi tiếng Gateway Arch và tia nước từ đài phun nước. Đặt câu hỏi: Đường cong này có phương trình toán học dạng nào?',
          product: 'Câu trả lời của học sinh: Đường cong có dạng parabol úp xuống, thuộc đồ thị hàm số bậc hai.',
          implementation: {
            step1Transfer: 'GV chiếu hình ảnh cổng vòm cao 186m và đặt câu hỏi gợi mở.',
            step2Execute: 'Học sinh quan sát hình dạng đối xứng, suy nghĩ vị trí điểm cao nhất của cổng vòm.',
            step3Report: '1 học sinh nhận xét: Điểm cao nhất nằm chính giữa khoảng cách hai chân cổng vòm.',
            step4Conclude: 'GV kết luận: Đó chính là đỉnh của Parabol. Hôm nay ta cùng khảo sát sâu về hàm số bậc hai.'
          }
        },
        {
          id: 'act2_toan10',
          order: 2,
          name: 'Hoạt động 2: Hình thành kiến thức mới (Khám phá tọa độ đỉnh và bảng biến thiên)',
          timeMinutes: 23,
          objectives: [
            'Chứng minh phép biến đổi: $y = a\\left(x + \\frac{b}{2a}\\right)^2 - \\frac{\\Delta}{4a}$.',
            'Xác lập tọa độ đỉnh $I$, trục đối xứng và bảng biến thiên.'
          ],
          content: 'Nhiệm vụ: Biến đổi biểu thức $ax^2 + bx + c$ thành bình phương một nhị thức để tìm GTLN/GTNN và hoành độ đỉnh.',
          product: 'Bản ghi công thức: Đỉnh $I\\left(-\\frac{b}{2a}; -\\frac{\\Delta}{4a}\\right)$, trục đối xứng $x = -\\frac{b}{2a}$.',
          implementation: {
            step1Transfer: 'GV phát Phiếu học tập số 1 yêu cầu thêm bớt hạng tử.',
            step2Execute: 'Học sinh làm việc nhóm 4 hoàn thiện phép phân tích bình phương.',
            step3Report: 'Đại diện Nhóm 1 lên bảng trình bày phép biến đổi.',
            step4Conclude: 'GV kết luận công thức và dùng GeoGebra minh họa trực quan.'
          }
        },
        {
          id: 'act3_toan10',
          order: 3,
          name: 'Hoạt động 3: Luyện tập (Lập bảng biến thiên và vẽ đồ thị)',
          timeMinutes: 10,
          objectives: ['Thực hiện thành thạo các bước vẽ đồ thị parabol $y = x^2 - 4x + 3$.'],
          content: 'Tìm đỉnh $I$, trục đối xứng, giao điểm với trục tung và trục hoành, vẽ parabol.',
          product: 'Đồ thị parabol vẽ chuẩn xác trên hệ trục $Oxy$ trong vở học sinh.',
          implementation: {
            step1Transfer: 'GV giao bài tập vẽ parabol $y = x^2 - 4x + 3$.',
            step2Execute: 'Học sinh xác định 5 điểm đặc biệt và vẽ đường cong.',
            step3Report: '1 học sinh lên vẽ trên bảng phụ.',
            step4Conclude: 'GV nhận xét và lưu ý vẽ đường cong mềm mại qua đỉnh.'
          }
        },
        {
          id: 'act4_toan10',
          order: 4,
          name: 'Hoạt động 4: Vận dụng (Tối ưu mảnh vườn rào lưới)',
          timeMinutes: 5,
          objectives: ['Ứng dụng hàm bậc hai tìm diện tích lớn nhất cho bài toán rào đất.'],
          content: 'Một bác nông dân có 40m lưới rào muốn rào một mảnh đất hình chữ nhật sát một bờ tường thẳng (không cần rào cạnh bờ tường). Tìm kích thước để diện tích rào được là lớn nhất?',
          product: 'Hàm diện tích $S(x) = x(40 - 2x) = -2x^2 + 40x$. Đạt cực đại tại $x = 10\\text{m}$, diện tích lớn nhất $200\\text{ m}^2$.',
          implementation: {
            step1Transfer: 'GV nêu đề bài toán thực tiễn.',
            step2Execute: 'Học sinh lập biểu thức hàm bậc hai và tìm hoành độ đỉnh.',
            step3Report: 'Học sinh phát biểu kết quả.',
            step4Conclude: 'GV tuyên dương và giao bài tập SGK về nhà.'
          }
        }
      ]
    },
    slides: [
      {
        id: 'st10_1',
        phase: 'Khởi động',
        title: 'HÌNH ẢNH PARABOL TRONG KIẾN TRÚC & THỰC TIỄN',
        subtitle: 'Cổng vòm và quỹ đạo chuyển động ném',
        bulletPoints: [
          'Cổng vòm Gateway Arch cao $186\\text{ m}$ có hình dạng parabol chuẩn mực.',
          'Quỹ đạo của quả bóng rổ khi ném vào rổ: $h(t) = -\\frac{1}{2}gt^2 + v_0 t + h_0$.',
          'Tất cả đều tuân theo hàm số bậc hai dạng: $y = ax^2 + bx + c$ với $a \\neq 0$.'
        ],
        highlightBox: 'Hàm số bậc hai là mô hình toán học miêu tả chính xác chuyển động ném và các kết cấu chịu lực tối ưu.'
      },
      {
        id: 'st10_2',
        phase: 'Khám phá',
        title: 'CÁC YẾU TỐ ĐẶC TRƯNG CỦA PARABOL',
        subtitle: 'Đỉnh, trục đối xứng và bề lõm',
        bulletPoints: [
          'Đỉnh Parabol: $I\\left(-\\frac{b}{2a}; -\\frac{\\Delta}{4a}\\right)$ với $\\Delta = b^2 - 4ac$.',
          'Trục đối xứng: Đường thẳng $x = -\\frac{b}{2a}$.',
          'Bề lõm: Hướng lên trên khi $a > 0$ (đỉnh là điểm thấp nhất); Hướng xuống dưới khi $a < 0$ (đỉnh là điểm cao nhất).'
        ],
        highlightBox: 'Nhớ nhanh hoành độ đỉnh: $x_I = -\\frac{b}{2a}$, tung độ đỉnh: thay $x_I$ vào hàm số để tìm $y_I$!'
      },
      {
        id: 'st10_3',
        phase: 'Luyện tập',
        title: '5 ĐIỂM ĐẶC BIỆT ĐỂ VẼ PARABOL',
        subtitle: 'Ví dụ: $y = x^2 - 4x + 3$',
        bulletPoints: [
          'Đỉnh $I$: $x_I = -\\frac{-4}{2(1)} = 2 \\Rightarrow y_I = 2^2 - 4(2) + 3 = -1 \\Rightarrow I(2; -1)$.',
          'Giao với trục tung $Oy$: Điểm $(0; 3)$.',
          'Điểm đối xứng với $(0; 3)$ qua trục $x = 2$: Điểm $(4; 3)$.',
          'Giao với trục hoành $Ox$: Cho $y = 0 \\Leftrightarrow x^2 - 4x + 3 = 0 \\Leftrightarrow x = 1$ hoặc $x = 3$.'
        ],
        interactiveQuestion: {
          question: 'Tọa độ đỉnh của parabol $y = -2x^2 + 4x + 1$ là điểm nào?',
          options: ['$I(1; 3)$', '$I(1; 1)$', '$I(-1; -5)$', '$I(2; 1)$'],
          correctIndex: 0,
          explanation: 'Hoành độ đỉnh $x_I = -\\frac{4}{2(-2)} = 1$. Tung độ $y_I = -2(1)^2 + 4(1) + 1 = 3$. Vậy đỉnh $I(1; 3)$.'
        }
      }
    ],
    exam: {
      examTitle: 'ĐỀ KIỂM TRA ĐỊNH KÌ MÔN TOÁN HỌC - LỚP 10',
      term: 'Giữa Học kỳ 1',
      academicYear: '2024 - 2025',
      grade: 'Lớp 10',
      subject: 'Toán học',
      durationMinutes: 45,
      code: '101',
      matrixRows: [
        {
          topicName: 'Hàm số bậc hai & Tam thức bậc hai',
          unitName: 'Chương III',
          part1: { know: 6, understand: 4, apply: 2 },
          part2: { know: 1, understand: 1, apply: 0 },
          part3: { know: 1, understand: 2, apply: 1 },
          part4: { know: 0, understand: 1, apply: 1 }
        }
      ],
      specifications: [
        {
          id: 'sp_toan10',
          topic: 'Hàm số bậc hai',
          unit: 'Chương III',
          competencyRequirement: 'Xác định tọa độ đỉnh, trục đối xứng, bảng biến thiên và vẽ parabol.',
          level: 'apply',
          questionRef: 'Đủ 4 phần theo CV 7991',
          questionType: 'TNKQ Nhiều lựa chọn'
        }
      ],
      part1Questions: [
        {
          id: 'p10_1',
          number: 1,
          cognitiveLevel: 'know',
          topic: 'Nhận dạng hàm bậc hai',
          content: 'Hàm số nào sau đây là hàm số bậc hai theo biến $x$?',
          options: {
            A: '$y = 2x^2 - 3x + 1$.',
            B: '$y = \\frac{1}{x^2} + 2x$.',
            C: '$y = x^3 - 2x + 1$.',
            D: '$y = \\sqrt{x^2 + 1}$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Hàm số $y = 2x^2 - 3x + 1$ có dạng $y = ax^2 + bx + c$ với $a = 2 \\neq 0$.'
        },
        {
          id: 'p10_2',
          number: 2,
          cognitiveLevel: 'know',
          topic: 'Trục đối xứng',
          content: 'Trục đối xứng của parabol $y = x^2 - 4x + 3$ là đường thẳng',
          options: {
            A: '$x = 2$.',
            B: '$x = -2$.',
            C: '$y = 2$.',
            D: '$x = 4$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Phương trình trục đối xứng: $x = -\\frac{b}{2a} = -\\frac{-4}{2(1)} = 2$.'
        },
        {
          id: 'p10_3',
          number: 3,
          cognitiveLevel: 'know',
          topic: 'Tọa độ đỉnh',
          content: 'Tọa độ đỉnh của parabol $y = -x^2 + 2x - 3$ là',
          options: {
            A: '$I(1; -2)$.',
            B: '$I(-1; -6)$.',
            C: '$I(1; 2)$.',
            D: '$I(2; -3)$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: '$x_I = -\\frac{2}{2(-1)} = 1$. Thay $x = 1 \\Rightarrow y_I = -(1)^2 + 2(1) - 3 = -2$. Vậy $I(1; -2)$.'
        },
        {
          id: 'p10_4',
          number: 4,
          cognitiveLevel: 'know',
          topic: 'Bề lõm parabol',
          content: 'Bề lõm của đồ thị parabol $y = -3x^2 + 5x - 1$',
          options: {
            A: 'Hướng xuống dưới.',
            B: 'Hướng lên trên.',
            C: 'Hướng sang phải.',
            D: 'Hướng sang trái.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Vì hệ số $a = -3 < 0$ nên bề lõm của parabol hướng xuống dưới.'
        },
        {
          id: 'p10_5',
          number: 5,
          cognitiveLevel: 'understand',
          topic: 'Khoảng đồng biến',
          content: 'Hàm số $y = x^2 - 6x + 5$ đồng biến trên khoảng nào sau đây?',
          options: {
            A: '$(3; +\\infty)$.',
            B: '$(-\\infty; 3)$.',
            C: '$(-\\infty; 6)$.',
            D: '$(1; 5)$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Vì $a = 1 > 0$ và hoành độ đỉnh $x_I = 3$ nên hàm số đồng biến trên khoảng $(3; +\\infty)$.'
        },
        {
          id: 'p10_6',
          number: 6,
          cognitiveLevel: 'understand',
          topic: 'Giao điểm với trục tọa độ',
          content: 'Đồ thị hàm số $y = x^2 - 5x + 6$ cắt trục hoành $Ox$ tại hai điểm có hoành độ là',
          options: {
            A: '$x = 2$ và $x = 3$.',
            B: '$x = -2$ và $x = -3$.',
            C: '$x = 1$ và $x = 6$.',
            D: '$x = 0$ và $x = 6$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Phương trình $x^2 - 5x + 6 = 0 \\Leftrightarrow x = 2$ hoặc $x = 3$.'
        },
        {
          id: 'p10_7',
          number: 7,
          cognitiveLevel: 'understand',
          topic: 'GTLN-GTNN hàm bậc hai',
          content: 'Giá trị lớn nhất của hàm số $y = -2x^2 + 8x - 1$ bằng',
          options: {
            A: '$7$.',
            B: '$2$.',
            C: '$-1$.',
            D: '$9$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Vì $a = -2 < 0$, giá trị lớn nhất đạt tại đỉnh: $x = 2 \\Rightarrow y(2) = -2(4) + 8(2) - 1 = 7$.'
        },
        {
          id: 'p10_8',
          number: 8,
          cognitiveLevel: 'understand',
          topic: 'Tìm hệ số parabol',
          content: 'Biết parabol $y = ax^2 + bx + 2$ đi qua hai điểm $A(1; 5)$ và $B(-1; 3)$. Giá trị của $a + b$ bằng',
          options: {
            A: '$3$.',
            B: '$4$.',
            C: '$2$.',
            D: '$5$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Thay điểm $A(1; 5) \\Rightarrow a + b + 2 = 5 \\Leftrightarrow a + b = 3$.'
        },
        {
          id: 'p10_9',
          number: 9,
          cognitiveLevel: 'apply',
          topic: 'Bài toán quỹ đạo bóng',
          content: 'Quỹ đạo của một quả bóng ném lên được cho bởi $h(t) = -5t^2 + 20t + 1$ ($h$ tính bằng mét, $t$ tính bằng giây). Độ cao cực đại mà quả bóng đạt được là',
          options: {
            A: '$21\\text{ m}$.',
            B: '$20\\text{ m}$.',
            C: '$25\\text{ m}$.',
            D: '$15\\text{ m}$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Đạt độ cao cực đại tại thời điểm đỉnh: $t = -\\frac{20}{2(-5)} = 2\\text{ s}$. Độ cao $h(2) = -5(4) + 20(2) + 1 = 21\\text{ m}$.'
        },
        {
          id: 'p10_10',
          number: 10,
          cognitiveLevel: 'know',
          topic: 'Giao điểm trục tung',
          content: 'Đồ thị parabol $y = 3x^2 - 2x + 7$ cắt trục tung tại điểm có tọa độ là',
          options: {
            A: '$(0; 7)$.',
            B: '$(7; 0)$.',
            C: '$(0; -7)$.',
            D: '$(0; 3)$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Thay $x = 0 \\Rightarrow y = 7$. Tọa độ giao điểm là $(0; 7)$.'
        },
        {
          id: 'p10_11',
          number: 11,
          cognitiveLevel: 'understand',
          topic: 'Tương giao parabol và đường thẳng',
          content: 'Số giao điểm của parabol $y = x^2 - 3x$ với đường thẳng $y = -2$ là',
          options: {
            A: '$2$.',
            B: '$1$.',
            C: '$0$.',
            D: '$3$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Phương trình hoành độ giao điểm: $x^2 - 3x + 2 = 0 \\Leftrightarrow x = 1$ hoặc $x = 2$. Có 2 giao điểm.'
        },
        {
          id: 'p10_12',
          number: 12,
          cognitiveLevel: 'apply',
          topic: 'Tham số m tiếp xúc',
          content: 'Tìm tất cả các giá trị của tham số $m$ để đường thẳng $y = 2x + m$ tiếp xúc với parabol $y = x^2 + 1$.',
          options: {
            A: '$m = 0$.',
            B: '$m = 1$.',
            C: '$m = -1$.',
            D: '$m = 2$.'
          },
          correctAnswer: 'A',
          points: 0.25,
          explanation: 'Phương trình $x^2 - 2x + (1 - m) = 0$ có nghiệm kép $\\Leftrightarrow \\Delta\' = 1 - (1 - m) = 0 \\Leftrightarrow m = 0$.'
        }
      ],
      part2Questions: [
        {
          id: 'p20_1',
          number: 1,
          cognitiveLevel: 'understand',
          topic: 'Khảo sát parabol',
          leadIn: 'Cho hàm số bậc hai $y = f(x) = x^2 - 4x + 3$ có đồ thị là Parabol $(P)$. Xét tính đúng/sai của các mệnh đề sau:',
          statements: [
            {
              subId: 'a',
              content: 'Tọa độ đỉnh của $(P)$ là $I(2; -1)$.',
              isCorrect: true,
              explanation: 'Đúng vì hoành độ đỉnh $x = 2$, tung độ $y = 2^2 - 4(2) + 3 = -1$.'
            },
            {
              subId: 'b',
              content: 'Hàm số nghịch biến trên khoảng $(-\\infty; 2)$ và đồng biến trên khoảng $(2; +\\infty)$.',
              isCorrect: true,
              explanation: 'Đúng vì hệ số $a = 1 > 0$ và hoành độ đỉnh là $2$.'
            },
            {
              subId: 'c',
              content: 'Đồ thị $(P)$ đi qua gốc tọa độ $O(0; 0)$.',
              isCorrect: false,
              explanation: 'Sai vì thay $x = 0 \\Rightarrow y = 3 \\neq 0$.'
            },
            {
              subId: 'd',
              content: 'Khoảng cách giữa hai giao điểm của $(P)$ với trục hoành bằng $2$.',
              isCorrect: true,
              explanation: 'Đúng vì hai giao điểm là $A(1; 0)$ và $B(3; 0)$, khoảng cách $AB = |3 - 1| = 2$.'
            }
          ],
          pointsTotal: 1.0
        },
        {
          id: 'p20_2',
          number: 2,
          cognitiveLevel: 'apply',
          topic: 'Cổng Parabol',
          leadIn: 'Một cổng chào hình parabol có chiều rộng ở mặt đất là $AB = 8\\text{ m}$ và chiều cao đỉnh cổng so với mặt đất là $h = 6\\text{ m}$. Chọn hệ trục tọa độ $Oxy$ sao cho gốc $O$ là trung điểm của $AB$, tia $Oy$ hướng lên trên. Xét tính đúng/sai của các mệnh đề sau:',
          statements: [
            {
              subId: 'a',
              content: 'Tọa độ của đỉnh cổng chào trong hệ trục tọa độ đã chọn là $I(0; 6)$.',
              isCorrect: true,
              explanation: 'Đúng vì đỉnh nằm trên trục đối xứng $Oy$ tại chiều cao $6\\text{ m}$.'
            },
            {
              subId: 'b',
              content: 'Hai chân cổng chạm đất tại các điểm có tọa độ $A(-4; 0)$ và $B(4; 0)$.',
              isCorrect: true,
              explanation: 'Đúng vì chiều rộng $8\\text{ m}$ nên mỗi bên cách gốc $O$ một đoạn $4\\text{ m}$.'
            },
            {
              subId: 'c',
              content: 'Phương trình của đường parabol cổng chào là $y = -\\frac{3}{8}x^2 + 6$.',
              isCorrect: true,
              explanation: 'Đúng vì parabol có dạng $y = ax^2 + 6$, đi qua $(4; 0) \\Rightarrow 16a + 6 = 0 \\Leftrightarrow a = -\\frac{3}{8}$.'
            },
            {
              subId: 'd',
              content: 'Tại vị trí cách chân cổng $1\\text{ m}$ (tức $x = 3$), chiều cao của cổng là $3\\text{ m}$.',
              isCorrect: false,
              explanation: 'Sai vì thay $x = 3$ vào ta được $y = -\\frac{3}{8}(9) + 6 = 6 - \\frac{27}{8} = 2.625\\text{ m} \\neq 3\\text{ m}$.'
            }
          ],
          pointsTotal: 1.0
        }
      ],
      part3Questions: [
        {
          id: 'p30_1',
          number: 1,
          cognitiveLevel: 'understand',
          topic: 'Tọa độ đỉnh',
          content: 'Tìm tung độ đỉnh của parabol $y = -3x^2 + 12x - 7$.',
          correctAnswerShort: '5',
          points: 0.5,
          explanation: 'Hoành độ đỉnh $x_I = -\\frac{12}{2(-3)} = 2$. Tung độ đỉnh $y_I = -3(4) + 12(2) - 7 = 5$.'
        },
        {
          id: 'p30_2',
          number: 2,
          cognitiveLevel: 'understand',
          topic: 'Diện tích tam giác đỉnh',
          content: 'Cho parabol $(P): y = -x^2 + 4$. Gọi $A, B$ là hai giao điểm của $(P)$ với trục hoành và $I$ là đỉnh của $(P)$. Diện tích tam giác $IAB$ bằng bao nhiêu?',
          correctAnswerShort: '8',
          points: 0.5,
          explanation: 'Giao điểm với $Ox$: $x^2 = 4 \\Rightarrow A(-2; 0), B(2; 0) \\Rightarrow AB = 4$. Đỉnh $I(0; 4)$ có khoảng cách đến $Ox$ bằng $4$. Diện tích $S = \\frac{1}{2}(4)(4) = 8$.'
        },
        {
          id: 'p30_3',
          number: 3,
          cognitiveLevel: 'apply',
          topic: 'Diện tích lớn nhất',
          content: 'Một hình chữ nhật có chu vi bằng $36\\text{ m}$. Diện tích lớn nhất của hình chữ nhật đó bằng bao nhiêu mét vuông?',
          correctAnswerShort: '81',
          points: 0.5,
          explanation: 'Nửa chu vi là $18\\text{ m}$. Chiều dài $x$, chiều rộng $18 - x$. Diện tích $S(x) = x(18 - x) = -x^2 + 18x$. Đạt cực đại tại $x = 9\\text{ m}$, diện tích lớn nhất là $9^2 = 81\\text{ m}^2$.'
        },
        {
          id: 'p30_4',
          number: 4,
          cognitiveLevel: 'apply',
          topic: 'Bài toán lợi nhuận bán hàng',
          content: 'Một cửa hàng bán áo với giá $x\\text{ (nghìn đồng)}$ một chiếc thì bán được $Q(x) = 200 - x$ chiếc. Chi phí nhập một chiếc áo là $60\\text{ (nghìn đồng)}$. Cửa hàng nên định giá bán $x$ bằng bao nhiêu nghìn đồng để lợi nhuận thu về là lớn nhất?',
          correctAnswerShort: '130',
          points: 0.5,
          explanation: 'Lợi nhuận $P(x) = (x - 60)(200 - x) = -x^2 + 260x - 12\\,000$. Đạt giá trị lớn nhất tại đỉnh $x = -\\frac{260}{2(-1)} = 130$ nghìn đồng.'
        }
      ],
      part4Questions: [
        {
          id: 'p40_1',
          number: 1,
          cognitiveLevel: 'understand',
          topic: 'Xác định parabol qua các điểm',
          content: 'Xác định parabol $(P): y = ax^2 + bx + c$ biết rằng $(P)$ đi qua điểm $A(0; -1)$, có đỉnh $I(1; -2)$. Lập bảng biến thiên và vẽ đồ thị parabol tìm được.',
          points: 1.5,
          rubric: [
            { criteria: 'Thiết lập hệ phương trình: qua $(0; -1) \\Rightarrow c = -1$; hoành độ đỉnh $-\\frac{b}{2a} = 1 \\Rightarrow b = -2a$; qua $I(1; -2) \\Rightarrow a + b + c = -2$.', score: 0.5 },
            { criteria: 'Giải ra $a = 1, b = -2, c = -1$. Parabol là $y = x^2 - 2x - 1$.', score: 0.5 },
            { criteria: 'Lập đúng bảng biến thiên và vẽ chính xác đồ thị trên hệ trục tọa độ $Oxy$.', score: 0.5 }
          ]
        },
        {
          id: 'p40_2',
          number: 2,
          cognitiveLevel: 'apply',
          topic: 'Bài toán cổng vòm xe tải đi qua',
          content: 'Một cổng vòm parabol có chiều cao $h = 9\\text{ m}$ và bề rộng hai chân $L = 12\\text{ m}$. Một chiếc xe tải chở một khối hàng hình hộp chữ nhật có chiều rộng $4\\text{ m}$. Hỏi chiều cao tối đa của xe tải chở hàng là bao nhiêu mét để xe có thể đi lọt qua cổng vòm (giả sử xe đi đúng chính giữa tim cổng)?',
          points: 1.5,
          rubric: [
            { criteria: 'Chọn hệ trục $Oxy$ gốc $O$ tại tâm đáy, phương trình parabol $y = -\\frac{1}{4}x^2 + 9$.', score: 0.5 },
            { criteria: 'Xe rộng $4\\text{ m}$ đi giữa cổng ứng với phạm vi hoành độ từ $x = -2$ đến $x = 2$.', score: 0.5 },
            { criteria: 'Tính chiều cao vòm tại mép thùng xe $x = 2$: $y = -\\frac{1}{4}(4) + 9 = 8\\text{ m}$. Chiều cao tối đa là $8\\text{ m}$.', score: 0.5 }
          ]
        }
      ]
    }
  }
];
