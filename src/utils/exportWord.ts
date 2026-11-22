import { LessonPlan5512, ExamCV7991 } from '../types/pedagogy';
import katex from 'katex';

/**
 * Chuyển đổi công thức LaTeX ($...$, $$...$$, \(...\), \[...\]) thành MathML chuẩn.
 * Microsoft Word khi mở file HTML/.doc sẽ tự động nhận diện thẻ <math xmlns="http://www.w3.org/1998/Math/MathML">
 * và chuyển đổi thành phương trình Office Math (OMML) chuẩn, sắc nét và có thể chỉnh sửa trực tiếp.
 */
export function formatMathForWord(text: string): string {
  if (!text) return '';

  // 1. Block math: $$ ... $$ hoặc \[ ... \]
  let res = text.replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g, (_, g1, g2) => {
    const formula = (g1 || g2 || '').trim();
    try {
      const mathml = katex.renderToString(formula, { displayMode: true, output: 'mathml', throwOnError: false });
      return `<div style="text-align: center; margin: 4pt 0;">${mathml}</div>`;
    } catch {
      return formula;
    }
  });

  // 2. Inline math: $ ... $ hoặc \( ... \)
  res = res.replace(/\$([^\$\n]+?)\$|\\\(([\s\S]+?)\\\)/g, (_, g1, g2) => {
    const formula = (g1 || g2 || '').trim();
    try {
      return katex.renderToString(formula, { displayMode: false, output: 'mathml', throwOnError: false });
    } catch {
      return formula;
    }
  });

  return res;
}

export function exportLessonPlanToWord(plan: LessonPlan5512) {
  const htmlContent = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>${plan.lessonName}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
  @page Section1 {
    size: 595.3pt 841.9pt; /* A4 */
    margin: 56.7pt 56.7pt 56.7pt 70.8pt; /* top right bottom left */
    mso-header-margin: 36pt;
    mso-footer-margin: 36pt;
    mso-paper-source: 0;
  }
  div.Section1 { page: Section1; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 13pt;
    line-height: 1.35;
    color: #000;
  }
  h1 { font-size: 15pt; font-weight: bold; text-align: center; text-transform: uppercase; margin: 12pt 0 4pt 0; }
  h2 { font-size: 13pt; font-weight: bold; margin: 10pt 0 4pt 0; text-transform: uppercase; }
  h3 { font-size: 13pt; font-weight: bold; margin: 8pt 0 3pt 0; }
  h4 { font-size: 13pt; font-style: italic; font-weight: bold; margin: 6pt 0 2pt 0; }
  p, li { margin: 3pt 0; text-align: justify; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  th, td { border: 1pt solid #000; padding: 4.5pt 6pt; font-size: 12pt; vertical-align: top; }
  th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
  .header-table { width: 100%; border: none; margin-bottom: 15pt; }
  .header-table td { border: none; padding: 0; }
  .box-step { border: 1pt dashed #444; padding: 6pt; margin: 6pt 0; background: #fafafa; }
</style>
</head>
<body>
<div class="Section1">
  <table class="header-table">
    <tr>
      <td style="width: 45%; text-align: center;">
        <p style="text-transform: uppercase; font-size: 12pt; margin: 0;"><strong>${plan.schoolName}</strong></p>
        <p style="text-transform: uppercase; font-size: 12pt; margin: 0;"><strong>${plan.departmentName}</strong></p>
        <p style="margin: 0;">***</p>
      </td>
      <td style="width: 55%; text-align: center;">
        <p style="font-size: 12pt; margin: 0;"><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></p>
        <p style="font-size: 12pt; margin: 0;"><strong>Độc lập - Tự do - Hạnh phúc</strong></p>
        <p style="margin: 0;">------------------------</p>
      </td>
    </tr>
  </table>

  <h1>KẾ HOẠCH BÀI DẠY</h1>
  <p style="text-align: center; font-style: italic; margin-bottom: 2pt;">(Khung Kế hoạch bài dạy theo Công văn số 5512/BGDĐT-GDTrH ngày 18/12/2020 của Bộ GD&ĐT)</p>
  <p style="text-align: center; font-weight: bold; font-size: 14pt; margin-top: 4pt; text-transform: uppercase;">${plan.lessonName}</p>
  <p style="text-align: center; margin: 2pt 0 12pt 0;">
    Môn học: <strong>${plan.subject}</strong>; Khối: <strong>${plan.grade}</strong>; Thời lượng: <strong>${plan.durationPeriods} tiết</strong> (${plan.periodIndex})<br>
    Giáo viên thực hiện: <strong>${plan.teacherName}</strong>
  </p>

  <h2>I. MỤC TIÊU BÀI DẠY</h2>
  <h3>1. Kiến thức</h3>
  <ul>
    ${plan.objectives.knowledge.map(k => `<li>${formatMathForWord(k)}</li>`).join('')}
  </ul>

  <h3>2. Năng lực</h3>
  <p><strong>a) Năng lực chung:</strong></p>
  <ul>
    ${plan.objectives.competencies.general.map(g => `<li>${formatMathForWord(g)}</li>`).join('')}
  </ul>
  <p><strong>b) Năng lực đặc thù:</strong></p>
  <ul>
    ${plan.objectives.competencies.specific.map(s => `<li>${formatMathForWord(s)}</li>`).join('')}
  </ul>

  <h3>3. Phẩm chất</h3>
  <ul>
    ${plan.objectives.qualities.map(q => `<li>${formatMathForWord(q)}</li>`).join('')}
  </ul>

  <h2>II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU</h2>
  <p><strong>1. Giáo viên:</strong></p>
  <ul>
    ${plan.materials.teacher.map(t => `<li>${formatMathForWord(t)}</li>`).join('')}
  </ul>
  <p><strong>2. Học sinh:</strong></p>
  <ul>
    ${plan.materials.student.map(s => `<li>${formatMathForWord(s)}</li>`).join('')}
  </ul>
  ${plan.materials.digitalDevicesNotice ? `<p style="font-style: italic; color: #222;"><strong>* Lưu ý về thiết bị công nghệ:</strong> ${formatMathForWord(plan.materials.digitalDevicesNotice)}</p>` : ''}

  <h2>III. TIẾN TRÌNH DẠY HỌC</h2>
  <p style="font-style: italic;">Tiến trình bài dạy được tổ chức theo 4 hoạt động sư phạm chuẩn quy định tại Công văn 5512:</p>

  ${plan.activities.map(act => `
    <div style="margin-top: 12pt; border-bottom: 1pt solid #ccc; padding-bottom: 8pt;">
      <h3 style="color: #0b3d91;">${formatMathForWord(act.name)} (${act.timeMinutes} phút)</h3>
      <p><strong>a) Mục tiêu:</strong> ${act.objectives.map(o => formatMathForWord(o)).join('; ')}</p>
      <p><strong>b) Nội dung:</strong> ${formatMathForWord(act.content)}</p>
      <p><strong>c) Sản phẩm:</strong> ${formatMathForWord(act.product)}</p>
      <p><strong>d) Tổ chức thực hiện:</strong></p>
      <table style="width: 100%;">
        <tr>
          <th style="width: 30%;">Các bước tổ chức</th>
          <th style="width: 70%;">Hoạt động của Giáo viên và Học sinh</th>
        </tr>
        <tr>
          <td><strong>Bước 1: Chuyển giao nhiệm vụ</strong></td>
          <td>${formatMathForWord(act.implementation.step1Transfer)}</td>
        </tr>
        <tr>
          <td><strong>Bước 2: Thực hiện nhiệm vụ</strong></td>
          <td>${formatMathForWord(act.implementation.step2Execute)}</td>
        </tr>
        <tr>
          <td><strong>Bước 3: Báo cáo, thảo luận</strong></td>
          <td>${formatMathForWord(act.implementation.step3Report)}</td>
        </tr>
        <tr>
          <td><strong>Bước 4: Kết luận, nhận định</strong></td>
          <td>${formatMathForWord(act.implementation.step4Conclude)}</td>
        </tr>
      </table>
    </div>
  `).join('')}

  <table class="header-table" style="margin-top: 30pt;">
    <tr>
      <td style="width: 50%; text-align: center;">
        <p><strong>DUYỆT CỦA TỔ CHUYÊN MÔN</strong></p>
        <p style="font-style: italic;">(Ký và ghi rõ họ tên)</p>
        <br><br><br><br>
      </td>
      <td style="width: 50%; text-align: center;">
        <p style="font-style: italic;">Ngày ..... tháng ..... năm 20...</p>
        <p><strong>GIÁO VIÊN SOẠN BÀI</strong></p>
        <p style="font-style: italic;">(Ký và ghi rõ họ tên)</p>
        <br><br><br><br>
        <p><strong>${plan.teacherName}</strong></p>
      </td>
    </tr>
  </table>
</div>
</body>
</html>
  `;

  downloadBlob(htmlContent, `${plan.lessonName.replace(/[^a-zA-Z0-9_-]/g, '_')}_CV5512.doc`, 'application/msword');
}

export function exportExamToWord(exam: ExamCV7991) {
  const htmlContent = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>${exam.examTitle} - Mã đề ${exam.code}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
  @page Section1 {
    size: 595.3pt 841.9pt;
    margin: 45pt 45pt 45pt 55pt;
  }
  div.Section1 { page: Section1; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.3;
    color: #000;
  }
  h1 { font-size: 13pt; font-weight: bold; text-align: center; text-transform: uppercase; margin: 6pt 0; }
  h2 { font-size: 12pt; font-weight: bold; margin: 8pt 0 4pt 0; text-transform: uppercase; }
  p, li { margin: 2pt 0; text-align: justify; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0; }
  th, td { border: 1pt solid #000; padding: 4pt 5pt; font-size: 11pt; vertical-align: middle; }
  th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
  .header-table { width: 100%; border: none; margin-bottom: 10pt; }
  .header-table td { border: none; padding: 0; }
  .option-table { width: 100%; border: none; margin: 2pt 0; }
  .option-table td { border: none; padding: 1pt 4pt; }
  .page-break { page-break-after: always; }
</style>
</head>
<body>
<div class="Section1">
  <!-- PHẦN 1: MA TRẬN ĐỀ THEO CV 7991 -->
  <p style="text-align: right; font-style: italic; font-size: 10pt; margin: 0;">(Kèm theo Công văn số 7991/BGDĐT-GDTrH ngày 17/12/2024 của Bộ GDĐT)</p>
  <h1 style="margin-top: 2pt;">1. MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ</h1>
  <p style="text-align: center; margin: 2pt 0 6pt 0;">
    Môn: <strong>${exam.subject}</strong> | Khối: <strong>${exam.grade}</strong> | ${exam.term} - Năm học ${exam.academicYear}
  </p>

  <table>
    <thead>
      <tr>
        <th rowspan="3" style="width: 4%;">TT</th>
        <th rowspan="3" style="width: 20%;">Chủ đề / Chương</th>
        <th rowspan="3" style="width: 18%;">Nội dung / đơn vị kiến thức</th>
        <th colspan="9">Mức độ đánh giá</th>
        <th rowspan="2" colspan="3">Tổng</th>
        <th rowspan="3" style="width: 8%;">Tỉ lệ % điểm</th>
      </tr>
      <tr>
        <th colspan="3">Nhiều lựa chọn (Phần I)</th>
        <th colspan="3">Đúng - Sai (Phần II)</th>
        <th colspan="3">Trả lời ngắn (Phần III)</th>
      </tr>
      <tr>
        <th>Biết</th><th>Hiểu</th><th>VD</th>
        <th>Biết</th><th>Hiểu</th><th>VD</th>
        <th>Biết</th><th>Hiểu</th><th>VD</th>
        <th>Biết</th><th>Hiểu</th><th>VD</th>
      </tr>
    </thead>
    <tbody>
      ${exam.matrixRows.map((row, idx) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td><strong>${row.topicName}</strong></td>
          <td>${row.unitName}</td>
          <td style="text-align: center;">${row.part1.know || '-'}</td>
          <td style="text-align: center;">${row.part1.understand || '-'}</td>
          <td style="text-align: center;">${row.part1.apply || '-'}</td>
          <td style="text-align: center;">${row.part2.know || '-'}</td>
          <td style="text-align: center;">${row.part2.understand || '-'}</td>
          <td style="text-align: center;">${row.part2.apply || '-'}</td>
          <td style="text-align: center;">${row.part3.know || '-'}</td>
          <td style="text-align: center;">${row.part3.understand || '-'}</td>
          <td style="text-align: center;">${row.part3.apply || '-'}</td>
          <td style="text-align: center; font-weight: bold;">${(row.part1.know + row.part2.know + row.part3.know + row.part4.know)}</td>
          <td style="text-align: center; font-weight: bold;">${(row.part1.understand + row.part2.understand + row.part3.understand + row.part4.understand)}</td>
          <td style="text-align: center; font-weight: bold;">${(row.part1.apply + row.part2.apply + row.part3.apply + row.part4.apply)}</td>
          <td style="text-align: center; font-weight: bold;">50%</td>
        </tr>
      `).join('')}
      <tr style="background-color: #f8f8f8; font-weight: bold;">
        <td colspan="3" style="text-align: right;">Tổng số điểm:</td>
        <td colspan="3" style="text-align: center;">3,0 điểm</td>
        <td colspan="3" style="text-align: center;">2,0 điểm</td>
        <td colspan="3" style="text-align: center;">2,0 điểm</td>
        <td style="text-align: center;">4,0</td>
        <td style="text-align: center;">3,0</td>
        <td style="text-align: center;">3,0</td>
        <td style="text-align: center;">10.0 đ</td>
      </tr>
      <tr style="background-color: #f0f0f0; font-weight: bold;">
        <td colspan="3" style="text-align: right;">Tỉ lệ %:</td>
        <td colspan="3" style="text-align: center;">30%</td>
        <td colspan="3" style="text-align: center;">20%</td>
        <td colspan="3" style="text-align: center;">20%</td>
        <td style="text-align: center;">40%</td>
        <td style="text-align: center;">30%</td>
        <td style="text-align: center;">30%</td>
        <td style="text-align: center;">100%</td>
      </tr>
    </tbody>
  </table>

  <p style="font-size: 10pt; font-style: italic; margin-top: 4pt;">
    * Ghi chú theo CV 7991: Tỉ lệ phân bổ 40% Nhận biết - 30% Thông hiểu - 30% Vận dụng. Phần II gồm các câu 4 lệnh a-b-c-d với barem chuẩn bậc thang. Phần IV Tự luận chiếm 3,0 điểm (30%).
  </p>

  <div class="page-break"></div>

  <!-- PHẦN ĐỀ KIỂM TRA -->
  <table class="header-table">
    <tr>
      <td style="width: 45%; text-align: center;">
        <p style="margin: 0;">SỞ GD&ĐT ........................</p>
        <p style="margin: 0; font-weight: bold;">TRƯỜNG THPT ........................</p>
        <p style="margin: 0;">(Đề thi có ${exam.part1Questions.length + exam.part2Questions.length + exam.part3Questions.length + exam.part4Questions.length} câu)</p>
      </td>
      <td style="width: 55%; text-align: center;">
        <p style="margin: 0; font-weight: bold;">${exam.examTitle}</p>
        <p style="margin: 0;">Môn: <strong>${exam.subject} - ${exam.grade}</strong></p>
        <p style="margin: 0; font-style: italic;">Thời gian làm bài: ${exam.durationMinutes} phút (không kể thời gian phát đề)</p>
        <p style="margin: 0; font-weight: bold;">MÃ ĐỀ THI: ${exam.code}</p>
      </td>
    </tr>
  </table>

  <p style="border: 1pt solid #000; padding: 4pt; font-style: italic;">
    Họ và tên thí sinh: ............................................................................ Lớp: ................. SBD: ....................
  </p>

  <h2>PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (3,0 điểm)</h2>
  <p style="font-style: italic;">Thí sinh trả lời từ câu 1 đến câu ${exam.part1Questions.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.</p>
  ${exam.part1Questions.map(q => `
    <div style="margin: 6pt 0;">
      <p><strong>Câu ${q.number}.</strong> ${formatMathForWord(q.content)}</p>
      <table class="option-table">
        <tr>
          <td style="width: 50%;"><strong>A.</strong> ${formatMathForWord(q.options.A)}</td>
          <td style="width: 50%;"><strong>B.</strong> ${formatMathForWord(q.options.B)}</td>
        </tr>
        <tr>
          <td style="width: 50%;"><strong>C.</strong> ${formatMathForWord(q.options.C)}</td>
          <td style="width: 50%;"><strong>D.</strong> ${formatMathForWord(q.options.D)}</td>
        </tr>
      </table>
    </div>
  `).join('')}

  <h2>PHẦN II. Câu trắc nghiệm đúng sai (2,0 điểm)</h2>
  <p style="font-style: italic;">Thí sinh trả lời từ câu 1 đến câu ${exam.part2Questions.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn Đúng hoặc Sai.</p>
  <p style="font-size: 10pt; font-style: italic; color: #333;">* Barem chấm điểm chuẩn CV 7991: Đúng 1 ý: 0,10 điểm | Đúng 2 ý: 0,25 điểm | Đúng 3 ý: 0,50 điểm | Đúng 4 ý: 1,00 điểm.</p>
  
  ${exam.part2Questions.map(q => `
    <div style="margin: 8pt 0; border: 1pt solid #ddd; padding: 6pt; background: #fafafa;">
      <p><strong>Câu ${q.number}.</strong> ${formatMathForWord(q.leadIn)}</p>
      <table style="width: 100%; margin: 4pt 0;">
        <tr>
          <th style="width: 8%;">Lệnh</th>
          <th style="width: 76%;">Nội dung mệnh đề</th>
          <th style="width: 8%;">Đúng</th>
          <th style="width: 8%;">Sai</th>
        </tr>
        ${q.statements.map(s => `
          <tr>
            <td style="text-align: center; font-weight: bold;">${s.subId})</td>
            <td>${formatMathForWord(s.content)}</td>
            <td style="text-align: center;">[  ]</td>
            <td style="text-align: center;">[  ]</td>
          </tr>
        `).join('')}
      </table>
    </div>
  `).join('')}

  <h2>PHẦN III. Câu trắc nghiệm trả lời ngắn (2,0 điểm)</h2>
  <p style="font-style: italic;">Thí sinh trả lời từ câu 1 đến câu ${exam.part3Questions.length}. Thí sinh ghi đáp án vào phiếu trả lời trắc nghiệm.</p>
  ${exam.part3Questions.map(q => `
    <p style="margin: 6pt 0;">
      <strong>Câu ${q.number}.</strong> ${formatMathForWord(q.content)}
    </p>
  `).join('')}

  <h2>PHẦN IV. Tự luận (3,0 điểm)</h2>
  <p style="font-style: italic;">Thí sinh trình bày lời giải chi tiết cho các câu hỏi sau:</p>
  ${exam.part4Questions.map(q => `
    <div style="margin: 8pt 0;">
      <p><strong>Câu ${q.number} (${q.points} điểm).</strong> ${formatMathForWord(q.content)}</p>
    </div>
  `).join('')}

  <p style="text-align: center; margin-top: 15pt; font-weight: bold;">------------- HẾT -------------</p>

  <div class="page-break"></div>

  <!-- ĐÁP ÁN & HƯỚNG DẪN CHẤM BAREM -->
  <h1>HƯỚNG DẪN CHẤM VÀ THANG ĐIỂM CHI TIẾT (CV 7991)</h1>
  
  <h2>PHẦN I (12 câu x 0,25đ = 3,0 điểm)</h2>
  <table>
    <tr>
      ${exam.part1Questions.map(q => `<th style="width: 8%;">Câu ${q.number}</th>`).join('')}
    </tr>
    <tr>
      ${exam.part1Questions.map(q => `<td style="text-align: center; font-weight: bold; color: blue;">${q.correctAnswer}</td>`).join('')}
    </tr>
  </table>

  <h2>PHẦN II (2 câu x 1,0đ = 2,0 điểm)</h2>
  <p><em>Quy tắc tính điểm theo CV 7991: Chọn đúng 1 ý = 0,1đ; đúng 2 ý = 0,25đ; đúng 3 ý = 0,5đ; đúng 4 ý = 1,0đ.</em></p>
  ${exam.part2Questions.map(q => `
    <p><strong>Câu ${q.number}:</strong></p>
    <table style="width: 100%;">
      <tr>
        <th style="width: 10%;">Ý</th>
        <th style="width: 20%;">Đáp án</th>
        <th style="width: 70%;">Hướng dẫn giải thích chi tiết</th>
      </tr>
      ${q.statements.map(s => `
        <tr>
          <td style="text-align: center; font-weight: bold;">${s.subId}</td>
          <td style="text-align: center; font-weight: bold; color: ${s.isCorrect ? '#059669' : '#dc2626'};">${s.isCorrect ? 'ĐÚNG' : 'SAI'}</td>
          <td>${formatMathForWord(s.explanation)}</td>
        </tr>
      `).join('')}
    </table>
  `).join('')}

  <h2>PHẦN III (4 câu x 0,5đ = 2,0 điểm)</h2>
  <table>
    <tr>
      <th style="width: 15%;">Câu</th>
      <th style="width: 25%;">Đáp số chuẩn</th>
      <th style="width: 60%;">Hướng dẫn giải tóm tắt</th>
    </tr>
    ${exam.part3Questions.map(q => `
      <tr>
        <td style="text-align: center; font-weight: bold;">Câu ${q.number}</td>
        <td style="text-align: center; font-weight: bold; color: #2563eb;">${formatMathForWord(q.correctAnswerShort)}</td>
        <td>${formatMathForWord(q.explanation)}</td>
      </tr>
    `).join('')}
  </table>

  <h2>PHẦN IV. Tự luận (3,0 điểm)</h2>
  ${exam.part4Questions.map(q => `
    <div style="margin: 8pt 0;">
      <p><strong>Câu ${q.number} (${q.points} điểm):</strong></p>
      <table>
        <tr>
          <th style="width: 80%;">Nội dung yêu cầu / Các bước giải</th>
          <th style="width: 20%;">Điểm</th>
        </tr>
        ${q.rubric.map(r => `
          <tr>
            <td>${formatMathForWord(r.criteria)}</td>
            <td style="text-align: center; font-weight: bold;">${r.score.toFixed(2)} đ</td>
          </tr>
        `).join('')}
      </table>
    </div>
  `).join('')}
</div>
</body>
</html>
  `;

  downloadBlob(htmlContent, `${exam.examTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_CV7991.doc`, 'application/msword');
}

export function exportMatrixSpecToWord(exam: ExamCV7991) {
  const htmlContent = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>Ma trận & Bản đặc tả - ${exam.examTitle}</title>
<style>
  @page Section1 { size: 841.9pt 595.3pt; margin: 45pt; } /* Landscape */
  div.Section1 { page: Section1; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000; }
  h1 { font-size: 13pt; font-weight: bold; text-align: center; text-transform: uppercase; margin: 6pt 0; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0; }
  th, td { border: 1pt solid #000; padding: 4pt 5pt; font-size: 10.5pt; }
  th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
  .page-break { page-break-after: always; }
</style>
</head>
<body>
<div class="Section1">
  <p style="text-align: right; font-style: italic; font-size: 10pt;">PHỤ LỤC 1 & 2 - CV 7991/BGDĐT-GDTrH</p>
  <h1>MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ</h1>
  <p style="text-align: center;">Môn: <strong>${exam.subject}</strong> | Khối: <strong>${exam.grade}</strong> | ${exam.term} - Năm học ${exam.academicYear}</p>
  
  <table>
    <thead>
      <tr>
        <th rowspan="2">TT</th>
        <th rowspan="2">Chủ đề/Chương</th>
        <th rowspan="2">Nội dung kiến thức</th>
        <th colspan="3">Phần I (TNKQ)</th>
        <th colspan="3">Phần II (Đúng - Sai)</th>
        <th colspan="3">Phần III (Trả lời ngắn)</th>
        <th colspan="3">Tổng mức độ</th>
        <th rowspan="2">Tỉ lệ</th>
      </tr>
      <tr>
        <th>Biết</th><th>Hiểu</th><th>VD</th>
        <th>Biết</th><th>Hiểu</th><th>VD</th>
        <th>Biết</th><th>Hiểu</th><th>VD</th>
        <th>Biết</th><th>Hiểu</th><th>VD</th>
      </tr>
    </thead>
    <tbody>
      ${exam.matrixRows.map((r, i) => `
        <tr>
          <td style="text-align: center;">${i + 1}</td>
          <td><strong>${formatMathForWord(r.topicName)}</strong></td>
          <td>${formatMathForWord(r.unitName)}</td>
          <td style="text-align: center;">${r.part1.know}</td><td style="text-align: center;">${r.part1.understand}</td><td style="text-align: center;">${r.part1.apply}</td>
          <td style="text-align: center;">${r.part2.know}</td><td style="text-align: center;">${r.part2.understand}</td><td style="text-align: center;">${r.part2.apply}</td>
          <td style="text-align: center;">${r.part3.know}</td><td style="text-align: center;">${r.part3.understand}</td><td style="text-align: center;">${r.part3.apply}</td>
          <td style="text-align: center; font-weight: bold;">${r.part1.know + r.part2.know + r.part3.know + r.part4.know}</td>
          <td style="text-align: center; font-weight: bold;">${r.part1.understand + r.part2.understand + r.part3.understand + r.part4.understand}</td>
          <td style="text-align: center; font-weight: bold;">${r.part1.apply + r.part2.apply + r.part3.apply + r.part4.apply}</td>
          <td style="text-align: center;">50%</td>
        </tr>
      `).join('')}
      <tr style="font-weight: bold; background: #eef2ff;">
        <td colspan="3" style="text-align: right;">Tổng số điểm:</td>
        <td colspan="3" style="text-align: center;">3.0 điểm (30%)</td>
        <td colspan="3" style="text-align: center;">2.0 điểm (20%)</td>
        <td colspan="3" style="text-align: center;">2.0 điểm (20%)</td>
        <td style="text-align: center;">4.0đ</td><td style="text-align: center;">3.0đ</td><td style="text-align: center;">3.0đ</td>
        <td style="text-align: center;">10.0 điểm</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <h1>BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KÌ</h1>
  <table>
    <thead>
      <tr>
        <th>TT</th>
        <th>Chủ đề</th>
        <th>Đơn vị kiến thức</th>
        <th>Yêu cầu cần đạt</th>
        <th>Mức độ</th>
        <th>Câu hỏi tương ứng</th>
      </tr>
    </thead>
    <tbody>
      ${exam.specifications.map((s, i) => `
        <tr>
          <td style="text-align: center;">${i + 1}</td>
          <td><strong>${formatMathForWord(s.topic)}</strong></td>
          <td>${formatMathForWord(s.unit)}</td>
          <td>${formatMathForWord(s.competencyRequirement)}</td>
          <td style="text-align: center;">${s.level === 'know' ? 'Nhận biết (40%)' : s.level === 'understand' ? 'Thông hiểu (30%)' : 'Vận dụng (30%)'}</td>
          <td style="text-align: center; font-weight: bold;">${s.questionRef}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</div>
</body>
</html>
  `;
  downloadBlob(htmlContent, `${exam.examTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_MaTran_DacTa_7991.doc`, 'application/msword');
}

/**
 * Xuất trọn gói 4 mã đề thi kèm Bảng ma trận đáp án soi đề tổng hợp ra file Word (.doc)
 */
export function exportMultiCodeExamToWord(pkg: {
  exams: ExamCV7991[];
  masterAnswerKey: {
    codes: string[];
    part1: { questionNumber: number; answers: Record<string, string> }[];
    part2: { questionNumber: number; subStatement: string; answers: Record<string, 'Đ' | 'S'> }[];
    part3: { questionNumber: number; answers: Record<string, string> }[];
  };
}) {
  const base = pkg.exams[0];
  const codes = pkg.masterAnswerKey.codes;

  const htmlContent = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>TRỌN GÓI 4 MÃ ĐỀ & ĐÁP ÁN - ${base.examTitle}</title>
<style>
  @page Section1 {
    size: 595.3pt 841.9pt; /* A4 */
    margin: 45pt 45pt 45pt 50pt;
    mso-header-margin: 36pt;
    mso-footer-margin: 36pt;
  }
  div.Section1 { page: Section1; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12.5pt;
    line-height: 1.3;
    color: #000;
  }
  h1 { font-size: 15pt; font-weight: bold; text-align: center; text-transform: uppercase; margin: 10pt 0 4pt 0; }
  h2 { font-size: 13pt; font-weight: bold; margin: 10pt 0 4pt 0; text-transform: uppercase; color: #1e3a8a; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0; }
  th, td { border: 1pt solid #000; padding: 4pt 5pt; font-size: 11.5pt; vertical-align: middle; }
  th { background-color: #f1f5f9; font-weight: bold; text-align: center; }
  .header-table { width: 100%; border: none; margin-bottom: 8pt; }
  .header-table td { border: none; padding: 0; }
  .option-table { width: 100%; border: none; margin: 2pt 0; }
  .option-table td { border: none; padding: 1pt 3pt; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>
<div class="Section1">
  <!-- BẢNG MA TRẬN ĐÁP ÁN TỔNG HỢP (SOI ĐỀ) -->
  <h1>BẢNG ĐÁP ÁN SOI ĐỀ TỔNG HỢP (CÁC MÃ ĐỀ: ${codes.join(', ')})</h1>
  <p style="text-align: center; margin: 2pt 0 10pt 0;">
    Môn: <strong>${base.subject}</strong> | Khối: <strong>${base.grade}</strong> | ${base.term} - Năm học ${base.academicYear}
  </p>

  <h2>PHẦN I: ĐÁP ÁN TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN (0,25đ/câu)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Câu hỏi</th>
        ${codes.map(c => `<th style="width: ${85 / codes.length}%;">Mã ${c}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${pkg.masterAnswerKey.part1.map(row => `
        <tr>
          <td style="text-align: center; font-weight: bold;">Câu ${row.questionNumber}</td>
          ${codes.map(c => `<td style="text-align: center; font-weight: bold; color: #1e3a8a;">${row.answers[c] || '-'}</td>`).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>PHẦN II: ĐÁP ÁN ĐÚNG - SAI (TỐI ĐA 1,0đ/câu)</h2>
  <p style="font-size: 10pt; font-style: italic;">(Barem chuẩn: Đúng 1 ý: 0,1đ | Đúng 2 ý: 0,25đ | Đúng 3 ý: 0,5đ | Đúng 4 ý: 1,0đ)</p>
  <table>
    <thead>
      <tr>
        <th style="width: 12%;">Câu</th>
        <th style="width: 10%;">Ý</th>
        ${codes.map(c => `<th style="width: ${78 / codes.length}%;">Mã ${c}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${pkg.masterAnswerKey.part2.map(row => `
        <tr>
          <td style="text-align: center; font-weight: bold;">Câu ${row.questionNumber}</td>
          <td style="text-align: center; font-weight: bold;">${row.subStatement})</td>
          ${codes.map(c => `
            <td style="text-align: center; font-weight: bold; color: ${row.answers[c] === 'Đ' ? '#15803d' : '#b91c1c'};">
              ${row.answers[c] || '-'}
            </td>
          `).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>PHẦN III: ĐÁP ÁN TRẢ LỜI NGẮN (0,5đ/câu)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Câu hỏi</th>
        ${codes.map(c => `<th style="width: ${85 / codes.length}%;">Mã ${c}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${pkg.masterAnswerKey.part3.map(row => `
        <tr>
          <td style="text-align: center; font-weight: bold;">Câu ${row.questionNumber}</td>
          ${codes.map(c => `<td style="text-align: center; font-weight: bold; color: #1e3a8a;">${formatMathForWord(row.answers[c] || '-')}</td>`).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- CÁC ĐỀ THI TỪNG MÃ RIÊNG BIỆT -->
  ${pkg.exams.map((ex) => `
    <div class="page-break"></div>
    <table class="header-table">
      <tr>
        <td style="width: 45%; text-align: center;">
          <p style="margin: 0; font-weight: bold;">SỞ GIÁO DỤC VÀ ĐÀO TẠO</p>
          <p style="margin: 0; font-weight: bold;">TRƯỜNG THPT ........................</p>
          <p style="margin: 0; font-size: 10.5pt;">(Đề thi có ${ex.part1Questions.length + ex.part2Questions.length + ex.part3Questions.length + ex.part4Questions.length} câu)</p>
        </td>
        <td style="width: 55%; text-align: center;">
          <p style="margin: 0; font-weight: bold;">${ex.examTitle}</p>
          <p style="margin: 0;">Môn: <strong>${ex.subject} - ${ex.grade}</strong></p>
          <p style="margin: 0; font-style: italic;">Thời gian: ${ex.durationMinutes} phút</p>
          <p style="margin: 2pt 0 0 0; font-weight: bold; font-size: 13pt; color: #b91c1c;">MÃ ĐỀ THI: ${ex.code}</p>
        </td>
      </tr>
    </table>

    <p style="border: 1pt solid #000; padding: 4pt; font-style: italic; margin-bottom: 8pt;">
      Họ và tên thí sinh: ............................................................................ Lớp: ................. SBD: ....................
    </p>

    <h2>PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (3,0 điểm)</h2>
    <p style="font-style: italic; font-size: 10.5pt;">Thí sinh trả lời từ câu 1 đến câu ${ex.part1Questions.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.</p>
    ${ex.part1Questions.map(q => `
      <div style="margin: 5pt 0;">
        <p><strong>Câu ${q.number}.</strong> ${formatMathForWord(q.content)}</p>
        <table class="option-table">
          <tr>
            <td style="width: 50%;"><strong>A.</strong> ${formatMathForWord(q.options.A)}</td>
            <td style="width: 50%;"><strong>B.</strong> ${formatMathForWord(q.options.B)}</td>
          </tr>
          <tr>
            <td style="width: 50%;"><strong>C.</strong> ${formatMathForWord(q.options.C)}</td>
            <td style="width: 50%;"><strong>D.</strong> ${formatMathForWord(q.options.D)}</td>
          </tr>
        </table>
      </div>
    `).join('')}

    <h2>PHẦN II. Câu trắc nghiệm đúng sai (2,0 điểm)</h2>
    <p style="font-style: italic; font-size: 10.5pt;">Thí sinh trả lời từ câu 1 đến câu ${ex.part2Questions.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn Đúng hoặc Sai.</p>
    ${ex.part2Questions.map(q => `
      <div style="margin: 6pt 0; border: 1pt solid #cbd5e1; padding: 5pt; background: #fafafa;">
        <p><strong>Câu ${q.number}.</strong> ${formatMathForWord(q.leadIn)}</p>
        <table style="width: 100%; margin: 3pt 0;">
          <tr>
            <th style="width: 8%;">Ý</th>
            <th style="width: 76%;">Nội dung mệnh đề</th>
            <th style="width: 8%;">Đúng</th>
            <th style="width: 8%;">Sai</th>
          </tr>
          ${q.statements.map(s => `
            <tr>
              <td style="text-align: center; font-weight: bold;">${s.subId})</td>
              <td>${formatMathForWord(s.content)}</td>
              <td style="text-align: center;">[  ]</td>
              <td style="text-align: center;">[  ]</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `).join('')}

    <h2>PHẦN III. Câu trắc nghiệm trả lời ngắn (2,0 điểm)</h2>
    <p style="font-style: italic; font-size: 10.5pt;">Thí sinh trả lời từ câu 1 đến câu ${ex.part3Questions.length}. Viết câu trả lời hoặc số vào ô trống.</p>
    ${ex.part3Questions.map(q => `
      <div style="margin: 6pt 0;">
        <p><strong>Câu ${q.number}.</strong> ${formatMathForWord(q.content)}</p>
        <p style="margin-left: 20pt;"><em>Đáp số của thí sinh:</em> [.........................................................................]</p>
      </div>
    `).join('')}

    <h2>PHẦN IV. Tự luận (3,0 điểm)</h2>
    ${ex.part4Questions.map(q => `
      <div style="margin: 8pt 0;">
        <p><strong>Câu ${q.number} (${q.points} điểm).</strong> ${formatMathForWord(q.content)}</p>
        <div style="border: 1pt dashed #cbd5e1; height: 70pt; margin: 4pt 0;"></div>
      </div>
    `).join('')}
    
    <p style="text-align: center; margin-top: 15pt; font-weight: bold;">--- HẾT MÃ ĐỀ ${ex.code} ---</p>
  `).join('')}
</div>
</body>
</html>
  `;

  downloadBlob(htmlContent, `TronGoi_4_MaDe_Va_DapAn_${base.subject}_${base.grade}.doc`, 'application/msword');
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob(['\ufeff' + content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

