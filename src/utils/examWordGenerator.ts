import { Exam, Question } from '../types';
import JSZip from 'jszip';
import { 
    Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, 
    BorderStyle, WidthType, UnderlineType 
} from 'docx';

const fontName = "Times New Roman";
const fontSize = 28; // 14pt = 28 half-points

const noneBorder = { style: BorderStyle.NONE, size: 0, color: "auto" };
const noBorders = {
    top: noneBorder, bottom: noneBorder, left: noneBorder, right: noneBorder,
    insideHorizontal: noneBorder, insideVertical: noneBorder
};
const defaultBorder = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
const allBorders = {
    top: defaultBorder, bottom: defaultBorder, left: defaultBorder, right: defaultBorder,
    insideHorizontal: defaultBorder, insideVertical: defaultBorder
};

function createCell(children: Paragraph[], widthPercent: number, borders: any = noBorders) {
    return new TableCell({
        width: { size: widthPercent, type: WidthType.PERCENTAGE },
        borders,
        children,
        margins: { top: 100, bottom: 100, left: 100, right: 100 }
    });
}

function createTextRuns(text: string, bold = false, italic = false, underline = false, color?: string): TextRun[] {
    if (!text) return [];
    const lines = text.split('\n');
    return lines.map((line, index) => new TextRun({
        text: line,
        break: index > 0 ? 1 : 0,
        bold,
        italics: italic,
        underline: underline ? { type: UnderlineType.SINGLE } : undefined,
        font: fontName,
        size: fontSize,
        color
    }));
}

function createParagraph(runs: TextRun[], alignment: any = AlignmentType.LEFT, spacing: any = { after: 200 }) {
    return new Paragraph({ children: runs, alignment, spacing });
}

export async function downloadExamWordFile(
  exams: Exam | Exam[], 
  viewMode: 'student' | 'teacher' = 'student',
  schoolName: string = "TRƯỜNG THPT CHUYÊN TOÁN HỌC",
  departmentName: string = "TỔ THI CỬ & KHẢO THÍ",
  examSubTitle: string = "ĐỀ THI ĐÁNH GIÁ NĂNG LỰC",
  schoolYear: string = "Năm học 2026 - 2027",
  logoUrl: string | null = null
) {
  const examArray = Array.isArray(exams) ? exams : [exams];
  const isZip = examArray.length > 1;
  const zip = new JSZip();
  const answerKeys: Record<string, string[]> = {};

  for (let i = 0; i < examArray.length; i++) {
    const exam = examArray[i];
    answerKeys[exam.title] = exam.questions.map(q => q.correctAnswer);

    const children: any[] = [];

    // Header Table
    children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders,
        rows: [
            new TableRow({
                children: [
                    createCell([
                        createParagraph([...createTextRuns(schoolName, true)], AlignmentType.CENTER, { after: 50 }),
                        createParagraph([...createTextRuns(departmentName, true, false, true)], AlignmentType.CENTER)
                    ], 50),
                    createCell([
                        createParagraph([...createTextRuns(examSubTitle, true)], AlignmentType.CENTER, { after: 50 }),
                        createParagraph([...createTextRuns(schoolYear, true)], AlignmentType.CENTER, { after: 50 }),
                        createParagraph([...createTextRuns(`Thời gian làm bài: ${exam.duration || 45} phút`, false, true)], AlignmentType.CENTER)
                    ], 50)
                ]
            })
        ]
    }));

    children.push(createParagraph([...createTextRuns("----------------------- * -----------------------")], AlignmentType.CENTER));
    children.push(createParagraph([...createTextRuns(exam.title.toUpperCase(), true)], AlignmentType.CENTER, { before: 200, after: 400 }));

    if (viewMode === 'student') {
        children.push(createParagraph([
            ...createTextRuns("Họ và tên học sinh: ", true),
            ...createTextRuns("....................................................................... "),
            ...createTextRuns("Lớp: ", true),
            ...createTextRuns("....................")
        ], AlignmentType.LEFT, { after: 400 }));
    }

    // Questions
    exam.questions.forEach((q, idx) => {
        let diffLabel = "B";
        if (q.difficulty === 'medium') diffLabel = "H";
        else if (q.difficulty === 'hard') diffLabel = "VD";

        children.push(createParagraph([
            ...createTextRuns(`Câu ${idx + 1} [${diffLabel}]: `, true),
            ...createTextRuns(q.content)
        ], AlignmentType.LEFT, { after: 100 }));

        if (q.options && q.options.length === 4) {
            const maxOptLen = Math.max(...q.options.map(opt => (opt || "").length));
            const labels = q.type === 'true-false' ? ["a)", "b)", "c)", "d)"] : ["A.", "B.", "C.", "D."];
            
            if (maxOptLen < 15) {
                // 4 cols
                children.push(new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    rows: [
                        new TableRow({
                            children: labels.map((l, j) => createCell([createParagraph([...createTextRuns(`${l} ${q.options![j]}`)])], 25))
                        })
                    ]
                }));
                children.push(createParagraph([], AlignmentType.LEFT, { after: 100 })); // spacing
            } else if (maxOptLen < 35) {
                // 2 cols
                children.push(new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    rows: [
                        new TableRow({
                            children: [0, 1].map(j => createCell([createParagraph([...createTextRuns(`${labels[j]} ${q.options![j]}`)])], 50))
                        }),
                        new TableRow({
                            children: [2, 3].map(j => createCell([createParagraph([...createTextRuns(`${labels[j]} ${q.options![j]}`)])], 50))
                        })
                    ]
                }));
                children.push(createParagraph([], AlignmentType.LEFT, { after: 100 }));
            } else {
                // 1 col
                labels.forEach((l, j) => {
                    children.push(createParagraph([...createTextRuns(`${l} ${q.options![j]}`)], AlignmentType.LEFT, { after: 100 }));
                });
            }
        }

        if (viewMode === 'teacher') {
            children.push(createParagraph([
                ...createTextRuns(`* Đáp án đúng: ${q.correctAnswer}`, true)
            ], AlignmentType.LEFT, { before: 100, after: 100 }));
            children.push(createParagraph([
                ...createTextRuns(`* Lời giải chi tiết:`, true)
            ], AlignmentType.LEFT, { after: 100 }));
            children.push(createParagraph([
                ...createTextRuns(q.explanation || "Chưa có lời giải chi tiết.", false, true)
            ], AlignmentType.LEFT, { after: 300 }));
        }
    });

    // Answer Grid
    children.push(createParagraph([...createTextRuns("PHẦN ĐÁP ÁN NHANH", true)], AlignmentType.CENTER, { before: 400, after: 200 }));
    
    const chunkSize = 10;
    for (let c = 0; c < exam.questions.length; c += chunkSize) {
        const chunk = exam.questions.slice(c, c + chunkSize);
        
        const headerRow = new TableRow({
            children: [createCell([createParagraph([...createTextRuns("Câu", true)], AlignmentType.CENTER)], 10, allBorders), ...chunk.map((_, j) => createCell([createParagraph([...createTextRuns(`${c + j + 1}`, true)], AlignmentType.CENTER)], 9, allBorders))]
        });
        
        const answerRow = new TableRow({
            children: [createCell([createParagraph([...createTextRuns("Chọn", true)], AlignmentType.CENTER)], 10, allBorders), ...chunk.map(q => createCell([createParagraph([...createTextRuns(viewMode === 'teacher' ? q.correctAnswer : "")], AlignmentType.CENTER)], 9, allBorders))]
        });

        children.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: allBorders,
            rows: [headerRow, answerRow]
        }));
        children.push(createParagraph([], AlignmentType.CENTER, { after: 200 }));
    }

    children.push(createParagraph([...createTextRuns("----------------------- HẾT -----------------------", true)], AlignmentType.CENTER, { before: 200 }));

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 },
                    size: { width: 11906, height: 16838 } // A4
                }
            },
            children
        }]
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `De_thi_${exam.title.replace(/\s+/g, '_')}_${viewMode === 'teacher' ? 'Dap_an' : 'Hoc_sinh'}.docx`;

    if (isZip) {
      zip.file(fileName, blob);
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  if (isZip) {
      // Master Answer Key
      const children: any[] = [];
      children.push(createParagraph([...createTextRuns("BẢNG ĐÁP ÁN TỔNG HỢP CÁC MÃ ĐỀ", true)], AlignmentType.CENTER, { after: 400 }));

      const keys = Object.keys(answerKeys);
      const questionCount = examArray[0].questions.length;

      const headerCells = [
          createCell([createParagraph([...createTextRuns("Câu / Mã đề", true)], AlignmentType.CENTER)], 15, allBorders),
          ...keys.map(k => createCell([createParagraph([...createTextRuns(k, true)], AlignmentType.CENTER)], 85 / keys.length, allBorders))
      ];

      const rows = [new TableRow({ children: headerCells })];

      for (let i = 0; i < questionCount; i++) {
          const rowCells = [
              createCell([createParagraph([...createTextRuns(`Câu ${i + 1}`, true)], AlignmentType.CENTER)], 15, allBorders),
              ...keys.map(k => createCell([createParagraph([...createTextRuns(answerKeys[k][i] || "")], AlignmentType.CENTER)], 85 / keys.length, allBorders))
          ];
          rows.push(new TableRow({ children: rowCells }));
      }

      children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: allBorders,
          rows
      }));

      const doc = new Document({
          sections: [{
              properties: {
                  page: {
                      margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 },
                      size: { width: 11906, height: 16838 } // A4
                  }
              },
              children
          }]
      });

      const masterBlob = await Packer.toBlob(doc);
      zip.file("Bang_Dap_An_Tong_Hop.docx", masterBlob);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Bo_De_Kiem_Tra_Kem_Dap_An.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  }
}
