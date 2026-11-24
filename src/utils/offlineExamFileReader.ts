import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { parseExamMarkdownToCV7991 } from './examFormatConverter';
import { ExamCV7991 } from '../types/pedagogy';
import { parseDocxWithFormulasAndImages } from './docxToMarkdownParser';

// Cấu hình Worker đọc PDF cục bộ (Offline 100% không cần Internet)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export interface ExamParseResult {
  fileName: string;
  fileType: 'docx' | 'doc' | 'pdf' | 'text';
  rawText: string;
  markdown: string;
  exam: ExamCV7991;
  stats: {
    part1Count: number;
    part2Count: number;
    part3Count: number;
    hasAnswers: boolean;
    formatType: 'table_answers' | 'inline_answers' | 'raw';
  };
}

/**
 * Trích xuất text từ tệp PDF ngoại tuyến (Offline) bằng pdfjs-dist
 */
export async function extractTextFromPdfOffline(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });
    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Ghép các dòng trong trang dựa trên toạ độ y
      let lastY: number | null = null;
      let pageStr = '';

      for (const item of textContent.items as any[]) {
        const str = item.str || '';
        const y = item.transform ? item.transform[5] : null;

        if (lastY !== null && y !== null && Math.abs(y - lastY) > 5) {
          pageStr += '\n' + str;
        } else {
          pageStr += (pageStr.endsWith(' ') || str.startsWith(' ') ? '' : ' ') + str;
        }
        lastY = y;
      }

      pageTexts.push(pageStr.trim());
    }

    return pageTexts.join('\n\n');
  } catch (err: any) {
    console.error('Lỗi trích xuất PDF offline:', err);
    throw new Error('Không thể đọc file PDF ngoại tuyến: ' + (err.message || 'Lỗi cấu trúc PDF'));
  }
}

/**
 * Trích xuất nội dung từ tệp Word .docx bảo toàn cấu trúc HTML (gạch chân <u>, bảng biểu, in đậm)
 */
export async function extractTextFromDocxOffline(arrayBuffer: ArrayBuffer): Promise<{ text: string; markdown: string }> {
  try {
    // 1. Thử trích xuất chuyên sâu: bóc tách công thức toán OMML sang LaTeX và nhúng ảnh word/media/
    try {
      const richMd = await parseDocxWithFormulasAndImages(arrayBuffer);
      if (richMd && richMd.length > 50) {
        return {
          text: richMd,
          markdown: richMd
        };
      }
    } catch (docxErr) {
      console.warn('Fallback sang mammoth parser:', docxErr);
    }

    // 2. Chuyển đổi sang HTML để bảo tồn thẻ gạch chân (underline) và bảng đáp án
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    const rawResult = await mammoth.extractRawText({ arrayBuffer });

    let html = htmlResult.value || '';
    
    // Chuẩn hóa HTML sang Markdown giữ lại thẻ gạch chân <u>A.</u> và <u>a)</u>
    html = html
      // Bảo tồn thẻ gạch chân
      .replace(/<u\b[^>]*>(.*?)<\/u>/gi, '<u>$1</u>')
      .replace(/<span style="text-decoration:\s*underline[^"]*"[^>]*>(.*?)<\/span>/gi, '<u>$1</u>')
      .replace(/<ins\b[^>]*>(.*?)<\/ins>/gi, '<u>$1</u>')
      // Đổi thẻ in đậm
      .replace(/<strong>(.*?)<\/strong>/gi, '<b>$1</b>')
      // Đổi đoạn văn
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n');

    // Chuyển bảng <table> sang Markdown table (| Câu | 1 | 2 |)
    html = html.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_match, tableContent) => {
      const rows: string[] = [];
      const trMatches = tableContent.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi);
      for (const tr of trMatches) {
        const cells: string[] = [];
        const cellMatches = tr[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi);
        for (const cell of cellMatches) {
          const text = cell[1].replace(/<[^>]+>/g, '').trim();
          cells.push(text || ' ');
        }
        if (cells.length > 0) {
          rows.push('| ' + cells.join(' | ') + ' |');
        }
      }
      return '\n\n' + rows.join('\n') + '\n\n';
    });

    // Lọc bỏ các thẻ HTML rác còn lại
    const cleanMd = html.replace(/<(?!b|\/b|u|\/u|sup|\/sup|sub|\/sub)[^>]+>/g, '').trim();

    return {
      text: rawResult.value || cleanMd,
      markdown: cleanMd || rawResult.value || ''
    };
  } catch (err: any) {
    console.error('Lỗi đọc .docx offline:', err);
    throw new Error('Không thể phân tích file Word .docx: ' + (err.message || ''));
  }
}

/**
 * Trích xuất text từ tệp Word .doc cũ (Word 97-2003 Binary) ngoại tuyến
 */
export async function extractTextFromDocOffline(arrayBuffer: ArrayBuffer): Promise<string> {
  // Thử mammoth trước
  try {
    const res = await mammoth.extractRawText({ arrayBuffer });
    if (res.value && res.value.length > 50) {
      return res.value;
    }
  } catch {}

  // Trích xuất binary stream hỗ trợ UTF-16LE và Latin-1 cho Word .doc
  const bytes = new Uint8Array(arrayBuffer);
  let str = '';
  
  // Quét các chuỗi ký tự UTF-16LE
  for (let i = 0; i < bytes.length - 1; i += 2) {
    const code = bytes[i] | (bytes[i + 1] << 8);
    // Ký tự in được hoặc tiếng Việt Unicode
    if (
      (code >= 32 && code <= 126) || // ASCII
      (code >= 160 && code <= 0x1ef9) || // Latin-1 & Tiếng Việt mở rộng
      code === 10 || code === 13 || code === 9 // Xuống dòng, tab
    ) {
      str += String.fromCharCode(code);
    }
  }

  // Nếu chuỗi UTF-16 ngắn, quét ASCII/UTF-8 thuần
  if (str.length < 50) {
    let asciiStr = '';
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] >= 32 && bytes[i] <= 126) {
        asciiStr += String.fromCharCode(bytes[i]);
      } else if (bytes[i] === 10 || bytes[i] === 13) {
        asciiStr += '\n';
      }
    }
    str = asciiStr;
  }

  const clean = str
    .replace(/[^\S\r\n]{4,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (clean.length < 20) {
    throw new Error('File .doc không chứa văn bản hợp lệ hoặc được mã hóa.');
  }

  return clean;
}

/**
 * HÀM CHÍNH: Đọc và phân tích file đề thi ngoại tuyến (.docx, .doc, .pdf)
 * Tự động nhận diện cấu trúc đáp án chuẩn hệ thống (Bảng đáp án hoặc Mẫu rút gọn gạch chân)
 */
export async function parseUploadedExamFileOffline(file: File): Promise<ExamParseResult> {
  const fileName = file.name;
  const lowerName = fileName.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  let rawText = '';
  let markdown = '';
  let fileType: 'docx' | 'doc' | 'pdf' | 'text' = 'text';

  if (lowerName.endsWith('.docx')) {
    fileType = 'docx';
    const extracted = await extractTextFromDocxOffline(arrayBuffer);
    rawText = extracted.text;
    markdown = extracted.markdown;
  } else if (lowerName.endsWith('.doc')) {
    fileType = 'doc';
    rawText = await extractTextFromDocOffline(arrayBuffer);
    markdown = rawText;
  } else if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
    fileType = 'pdf';
    rawText = await extractTextFromPdfOffline(arrayBuffer);
    markdown = rawText;
  } else {
    fileType = 'text';
    rawText = new TextDecoder('utf-8').decode(arrayBuffer);
    markdown = rawText;
  }

  // Trích xuất tiêu đề đề thi nếu có trong file
  const titleMatch = markdown.match(/(?:ĐỀ\s+KIỂM\s+TRA|ĐỀ\s+THI|BÀI\s+KIỂM\s+TRA)[^\n\r]+/i);
  const detectedTitle = titleMatch ? titleMatch[0].trim() : fileName.replace(/\.[^/.]+$/, '');

  // Phân tích sang đối tượng ExamCV7991 bằng engine examFormatConverter
  const exam = parseExamMarkdownToCV7991(markdown, {
    examTitle: detectedTitle,
    subject: 'Toán học'
  });

  // Đánh giá thống kê
  const p1Count = exam.part1Questions.length;
  const p2Count = exam.part2Questions.length;
  const p3Count = exam.part3Questions.length;

  const hasHetDivider = markdown.includes('---------------------------HẾT------------------------') || /-{3,}\s*HẾT\s*-{3,}/i.test(markdown);
  const hasTableAnswers = hasHetDivider && /\|\s*Câu\s*\|\s*1\s*\|/i.test(markdown);
  const hasUnderlineAnswers = /<u>\s*[A-D]\b/i.test(markdown) || /<u>\s*[a-d]\)/i.test(markdown);

  let formatType: 'table_answers' | 'inline_answers' | 'raw' = 'raw';
  if (hasTableAnswers) formatType = 'table_answers';
  else if (hasUnderlineAnswers) formatType = 'inline_answers';

  const hasAnswers = p1Count > 0 && exam.part1Questions.some(q => q.correctAnswer);

  return {
    fileName,
    fileType,
    rawText,
    markdown,
    exam,
    stats: {
      part1Count: p1Count,
      part2Count: p2Count,
      part3Count: p3Count,
      hasAnswers,
      formatType
    }
  };
}
