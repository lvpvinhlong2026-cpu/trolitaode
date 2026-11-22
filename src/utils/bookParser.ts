export interface ParsedLessonItem {
  id: string;
  lessonNumber: string; // e.g. "Bài 18", "Bài 3", "Bài I"
  lessonTitle: string; // e.g. "Động lượng và Định luật bảo toàn động lượng"
  fullLessonName: string; // e.g. "BÀI 18: ĐỘNG LƯỢNG VÀ ĐỊNH LUẬT BẢO TOÀN ĐỘNG LƯỢNG"
  chapterOrTopic?: string;
  estimatedPeriods?: number;
  subject?: string;
  grade?: string;
}

export interface BookParseResult {
  detectedSubject: string;
  detectedGrade: string;
  detectedSeries: 'Kết Nối Tri Thức' | 'Cánh Diều' | 'Chân Trời Sáng Tạo';
  bookTitle: string;
  lessons: ParsedLessonItem[];
  rawTextLength: number;
}

// Mẫu mục lục sách giáo khoa chuẩn chương trình GDPT 2018
export const PRESET_TEXTBOOKS: {
  id: string;
  title: string;
  subject: string;
  grade: string;
  series: 'Kết Nối Tri Thức' | 'Cánh Diều' | 'Chân Trời Sáng Tạo';
  sampleContent: string;
}[] = [
  {
    id: 'toan12_kntt',
    title: 'Sách giáo khoa Toán 12 (Tập 1) - Kết Nối Tri Thức Với Cuộc Sống',
    subject: 'Toán học',
    grade: 'Lớp 12',
    series: 'Kết Nối Tri Thức',
    sampleContent: `MỤC LỤC SÁCH GIÁO KHOA TOÁN 12 - TẬP 1 (KẾT NỐI TRI THỨC VỚI CUỘC SỐNG)
Chương I: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số
Bài 1: Tính đơn điệu và cực trị của hàm số (3 tiết)
Bài 2: Giá trị lớn nhất và giá trị nhỏ nhất của hàm số (2 tiết)
Bài 3: Đường tiệm cận của đồ thị hàm số (2 tiết)
Bài 4: Khảo sát sự biến thiên và vẽ đồ thị hàm số (3 tiết)
Bài 5: Ứng dụng đạo hàm để giải quyết một số bài toán thực tiễn (2 tiết)

Chương II: Vectơ và hệ tọa độ trong không gian
Bài 6: Vectơ trong không gian (3 tiết)
Bài 7: Hệ trục tọa độ trong không gian (3 tiết)
Bài 8: Biểu thức tọa độ của các phép toán vectơ (2 tiết)

Chương III: Các số đặc trưng đo mức độ phân tán cho mẫu số liệu ghép nhóm
Bài 9: Khoảng biến thiên và khoảng tứ phân vị (2 tiết)
Bài 10: Phương sai và độ lệch chuẩn (2 tiết)`
  },
  {
    id: 'toan11_kntt',
    title: 'Sách giáo khoa Toán 11 (Tập 1) - Kết Nối Tri Thức Với Cuộc Sống',
    subject: 'Toán học',
    grade: 'Lớp 11',
    series: 'Kết Nối Tri Thức',
    sampleContent: `MỤC LỤC SÁCH GIÁO KHOA TOÁN 11 - TẬP 1 (KẾT NỐI TRI THỨC VỚI CUỘC SỐNG)
Chương I: Hàm số lượng giác và phương trình lượng giác
Bài 1: Giá trị lượng giác của góc lượng giác (2 tiết)
Bài 2: Công thức lượng giác (2 tiết)
Bài 3: Hàm số lượng giác (3 tiết)
Bài 4: Phương trình lượng giác cơ bản (3 tiết)

Chương II: Dãy số. Cấp số cộng và cấp số nhân
Bài 5: Dãy số (2 tiết)
Bài 6: Cấp số cộng (2 tiết)
Bài 7: Cấp số nhân (2 tiết)

Chương III: Các số đặc trưng đo xu thế trung tâm của mẫu số liệu ghép nhóm
Bài 8: Mẫu số liệu ghép nhóm (2 tiết)
Bài 9: Các số đặc trưng đo xu thế trung tâm (2 tiết)

Chương IV: Quan hệ song song trong không gian
Bài 10: Đường thẳng và mặt phẳng trong không gian (2 tiết)
Bài 11: Hai đường thẳng song song (2 tiết)
Bài 12: Đường thẳng và mặt phẳng song song (2 tiết)
Bài 13: Hai mặt phẳng song song (2 tiết)`
  },
  {
    id: 'toan10_kntt',
    title: 'Sách giáo khoa Toán 10 (Tập 1) - Kết Nối Tri Thức Với Cuộc Sống',
    subject: 'Toán học',
    grade: 'Lớp 10',
    series: 'Kết Nối Tri Thức',
    sampleContent: `MỤC LỤC SÁCH GIÁO KHOA TOÁN 10 - TẬP 1 (KẾT NỐI TRI THỨC VỚI CUỘC SỐNG)
Chương I: Mệnh đề và tập hợp
Bài 1: Mệnh đề (2 tiết)
Bài 2: Tập hợp và các phép toán trên tập hợp (2 tiết)

Chương II: Bất phương trình và hệ bất phương trình bậc nhất hai ẩn
Bài 3: Bất phương trình bậc nhất hai ẩn (2 tiết)
Bài 4: Hệ bất phương trình bậc nhất hai ẩn (2 tiết)

Chương III: Hệ thức lượng trong tam giác
Bài 5: Giá trị lượng giác của một góc từ 0 đến 180 độ (2 tiết)
Bài 6: Hệ thức lượng trong tam giác (3 tiết)

Chương IV: Vectơ
Bài 7: Các khái niệm mở đầu về vectơ (2 tiết)
Bài 8: Tổng và hiệu của hai vectơ (2 tiết)
Bài 9: Tích của một số với một vectơ (2 tiết)
Bài 10: Vectơ trong mặt phẳng tọa độ (2 tiết)
Bài 11: Tích vô hướng của hai vectơ (2 tiết)

Chương V: Hàm số, đồ thị và ứng dụng
Bài 15: Hàm số và đồ thị (2 tiết)
Bài 16: Hàm số bậc hai (3 tiết)`
  }
];

export function parseTextbookContent(rawText: string): BookParseResult {
  const text = rawText.trim();

  // 1. Cố định Môn học: Toán học THPT
  const detectedSubject = 'Toán học';

  // 2. Nhận diện Khối lớp THPT (Chỉ 10, 11, 12)
  let detectedGrade = 'Lớp 12';
  if (/lớp 12|12\s*tập|khối 12/i.test(text)) detectedGrade = 'Lớp 12';
  else if (/lớp 11|11\s*tập|khối 11/i.test(text)) detectedGrade = 'Lớp 11';
  else if (/lớp 10|10\s*tập|khối 10/i.test(text)) detectedGrade = 'Lớp 10';

  // 3. Bộ sách giáo khoa: Cố định chuẩn Kết Nối Tri Thức Với Cuộc Sống
  const detectedSeries = 'Kết Nối Tri Thức';

  // 4. Trích xuất danh sách "Bài số ... và Tên bài học"
  const lessons: ParsedLessonItem[] = [];
  const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let currentChapter = '';

  // Duyệt qua các dòng và xử lý cả trường hợp:
  // - Cùng 1 dòng: "Bài 18: Động lượng và Định luật bảo toàn động lượng (2 tiết)"
  // - 2 dòng kế tiếp nhau: Dòng 1 là "Bài 18" và Dòng 2 là "Động lượng và Định luật..."
  const singleLineRegex = /^(?:bài|bài học|lesson)\s*(\d+|[ivxldm]+)[\s.:\-]+([^\n\r(]+)(?:\(([^)]+)\))?/i;
  const multiLineHeaderRegex = /^(?:bài|bài học|lesson)\s*(\d+|[ivxldm]+)[:.\-]?$/i;
  const chapterRegex = /^(chương|chủ đề|phần|chuyên đề|unit)\s*[ivx\d]+/i;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];

    // Phát hiện Chương/Chủ đề
    if (chapterRegex.test(line)) {
      currentChapter = line;
      continue;
    }

    // Trường hợp 1: Dòng đơn chứa đầy đủ Bài số và Tên bài
    const singleMatch = line.match(singleLineRegex);
    if (singleMatch) {
      const numRaw = singleMatch[1].trim();
      const titleRaw = singleMatch[2].trim().replace(/[-–—.]+$/, '').trim();
      const periodsRaw = singleMatch[3]?.trim();

      let periods = 2;
      if (periodsRaw && /(\d+)\s*tiết/i.test(periodsRaw)) {
        const pMatch = periodsRaw.match(/(\d+)\s*tiết/i);
        if (pMatch) periods = parseInt(pMatch[1], 10);
      }

      const lessonNumber = `Bài ${numRaw}`;
      const lessonTitle = titleRaw;
      const fullLessonName = `BÀI ${numRaw.toUpperCase()}: ${titleRaw.toUpperCase()}`;

      lessons.push({
        id: `parsed_${numRaw}_${lessons.length}`,
        lessonNumber,
        lessonTitle,
        fullLessonName,
        chapterOrTopic: currentChapter || undefined,
        estimatedPeriods: periods,
        subject: detectedSubject,
        grade: detectedGrade
      });
      continue;
    }

    // Trường hợp 2: Dòng hiện tại là "Bài 18", dòng tiếp theo là tên bài
    const headerMatch = line.match(multiLineHeaderRegex);
    if (headerMatch && i + 1 < rawLines.length) {
      const nextLine = rawLines[i + 1];
      if (!chapterRegex.test(nextLine) && !multiLineHeaderRegex.test(nextLine) && nextLine.length > 2) {
        const numRaw = headerMatch[1].trim();
        let titleRaw = nextLine.trim();
        let periods = 2;

        const pMatch = titleRaw.match(/\((\d+)\s*tiết\)/i);
        if (pMatch) {
          periods = parseInt(pMatch[1], 10);
          titleRaw = titleRaw.replace(/\(\d+\s*tiết\)/i, '').trim();
        }

        const lessonNumber = `Bài ${numRaw}`;
        const lessonTitle = titleRaw;
        const fullLessonName = `BÀI ${numRaw.toUpperCase()}: ${titleRaw.toUpperCase()}`;

        lessons.push({
          id: `parsed_${numRaw}_${lessons.length}`,
          lessonNumber,
          lessonTitle,
          fullLessonName,
          chapterOrTopic: currentChapter || undefined,
          estimatedPeriods: periods,
          subject: detectedSubject,
          grade: detectedGrade
        });
        i++; // Bỏ qua dòng tên bài đã đọc
        continue;
      }
    }
  }

  // Fallback 1: Nhận diện dạng "18. Động lượng và..." hoặc "18 - Động lượng..."
  if (lessons.length === 0) {
    const fallbackRegex = /^(\d+)[\s.:\-]+([^\n\r(]+)(?:\(([^)]+)\))?/;
    for (const line of rawLines) {
      if (chapterRegex.test(line)) continue;
      const match = line.match(fallbackRegex);
      if (match && match[2].trim().length >= 3) {
        const numRaw = match[1].trim();
        const titleRaw = match[2].trim().replace(/[-–—.]+$/, '').trim();
        let periods = 2;
        if (match[3] && /(\d+)\s*tiết/i.test(match[3])) {
          const pMatch = match[3].match(/(\d+)\s*tiết/i);
          if (pMatch) periods = parseInt(pMatch[1], 10);
        }

        lessons.push({
          id: `fallback_${numRaw}_${lessons.length}`,
          lessonNumber: `Bài ${numRaw}`,
          lessonTitle: titleRaw,
          fullLessonName: `BÀI ${numRaw}: ${titleRaw.toUpperCase()}`,
          chapterOrTopic: currentChapter || undefined,
          estimatedPeriods: periods,
          subject: detectedSubject,
          grade: detectedGrade
        });
      }
    }
  }

  // Fallback 2: Nếu người dùng dán nguyên đoạn văn chỉ có 1 bài học (ví dụ: "Động lượng và định luật bảo toàn động lượng")
  if (lessons.length === 0 && text.length > 5) {
    const cleanFirstLine = rawLines[0].replace(/^bài\s*\d*[:.\-\s]*/i, '').trim();
    lessons.push({
      id: `single_lesson_1`,
      lessonNumber: 'Bài 1',
      lessonTitle: cleanFirstLine.slice(0, 100),
      fullLessonName: `BÀI 1: ${cleanFirstLine.slice(0, 100).toUpperCase()}`,
      estimatedPeriods: 2,
      subject: detectedSubject,
      grade: detectedGrade
    });
  }

  return {
    detectedSubject,
    detectedGrade,
    detectedSeries,
    bookTitle: `Sách giáo khoa ${detectedSubject} ${detectedGrade} (${detectedSeries})`,
    lessons,
    rawTextLength: text.length
  };
}
