import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "docx";

export async function downloadSampleWordFile() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: "NGÂN HÀNG CÂU HỎI MẪU - TOÁN HỌC PHÂN HÓA",
                bold: true,
                color: "1E3A8A", // Deep blue
                size: 28,
                font: "Segoe UI",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Tài liệu mẫu nhập liệu tự động vào Phần mềm Quản lý & Tạo Đề thi Phân hóa",
                italics: true,
                color: "4B5563", // Gray 600
                size: 20,
                font: "Segoe UI",
              }),
            ],
          }),

          // Instructions Box
          new Paragraph({
            spacing: { before: 100, after: 100 },
            children: [
              new TextRun({
                text: "HƯỚNG DẪN ĐỊNH DẠNG QUAN TRỌNG:",
                bold: true,
                color: "B45309", // Amber 700
                size: 22,
                font: "Segoe UI",
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: "Tên câu hỏi phải bắt đầu bằng từ khóa: ",
                font: "Segoe UI",
              }),
              new TextRun({
                text: "Câu [Số] [Mức độ]: ",
                bold: true,
                color: "DC2626", // Red 600
                font: "Segoe UI",
              }),
              new TextRun({
                text: "với mức độ tương ứng là [B], [H], hoặc [VD].",
                font: "Segoe UI",
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: "Bốn đáp án trắc nghiệm bắt đầu bằng các chữ cái in hoa: ",
                font: "Segoe UI",
              }),
              new TextRun({
                text: "A. , B. , C. , D. ",
                bold: true,
                color: "2563EB", // Blue 600
                font: "Segoe UI",
              }),
              new TextRun({
                text: "(để trống sau dấu chấm hoặc dấu ngoặc đơn).",
                font: "Segoe UI",
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: "Phần lời giải tự động phân tách bằng từ khóa: ",
                font: "Segoe UI",
              }),
              new TextRun({
                text: "Lời giải: ",
                bold: true,
                color: "059669", // Emerald 600
                font: "Segoe UI",
              }),
              new TextRun({
                text: "hoặc ",
                font: "Segoe UI",
              }),
              new TextRun({
                text: "Hướng dẫn giải: ",
                bold: true,
                color: "059669",
                font: "Segoe UI",
              }),
              new TextRun({
                text: ". Hệ thống sẽ tự tìm và gán đáp án đúng từ từ khóa này (ví dụ: 'Chọn A').",
                font: "Segoe UI",
              }),
            ],
          }),

          // Questions header
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 150 },
            children: [
              new TextRun({
                text: "DANH SÁCH CÂU HỎI MẪU",
                bold: true,
                color: "111827",
                size: 24,
                font: "Segoe UI",
              }),
            ],
          }),

          // Question 1 (Easy)
          new Paragraph({
            spacing: { before: 150, after: 100 },
            children: [
              new TextRun({
                text: "Câu 1 [B]: ",
                bold: true,
                color: "059669", // Emerald 600 (Easy)
                font: "Segoe UI",
              }),
              new TextRun({
                text: "Tìm tập xác định $D$ của hàm số lũy thừa $y = x^{\\sqrt{3}}$.",
                font: "Segoe UI",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: "A. $D = \\mathbb{R}$\t\tB. $D = (0; \\infty)$\nC. $D = \\mathbb{R} \\setminus \\{0\\}$\t\tD. $D = [0; \\infty)$",
                font: "Segoe UI",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: "Lời giải:\nVì hàm số có số mũ $\\sqrt{3}$ không nguyên nên điều kiện xác định là cơ số $x > 0$. Vậy tập xác định của hàm số là $D = (0; \\infty)$. Chọn B.",
                italics: true,
                color: "4B5563",
                font: "Segoe UI",
              }),
            ],
          }),

          // Question 2 (Medium)
          new Paragraph({
            spacing: { before: 150, after: 100 },
            children: [
              new TextRun({
                text: "Câu 2 [H]: ",
                bold: true,
                color: "D97706", // Amber 600 (Medium)
                font: "Segoe UI",
              }),
              new TextRun({
                text: "Cho hàm số $y = x^3 - 3x^2 + 2$. Điểm cực tiểu của đồ thị hàm số là điểm nào sau đây?",
                font: "Segoe UI",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: "A. $M(0; 2)$\t\tB. $N(2; -2)$\nC. $P(1; 0)$\t\tD. $Q(-1; -2)$",
                font: "Segoe UI",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: "Lời giải:\nTa có đạo hàm $y' = 3x^2 - 6x = 0 \\Leftrightarrow x = 0$ hoặc $x = 2$. Bảng biến thiên cho thấy hàm số đạt cực tiểu tại $x = 2$, khi đó giá trị cực tiểu tương ứng là $y(2) = 2^3 - 3.2^2 + 2 = -2$. Do đó điểm cực tiểu của đồ thị là $N(2; -2)$. Chọn B.",
                italics: true,
                color: "4B5563",
                font: "Segoe UI",
              }),
            ],
          }),

          // Question 3 (Hard)
          new Paragraph({
            spacing: { before: 150, after: 100 },
            children: [
              new TextRun({
                text: "Câu 3 [VD]: ",
                bold: true,
                color: "DC2626", // Red 600 (Hard)
                font: "Segoe UI",
              }),
              new TextRun({
                text: "Một hộp đựng 9 thẻ được đánh số từ 1 đến 9. Rút ngẫu nhiên đồng thời hai thẻ từ hộp. Tính xác suất để tích hai số ghi trên hai thẻ rút ra là một số chẵn.",
                font: "Segoe UI",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: "A. $\\frac{5}{18}$\t\tB. $\\frac{13}{18}$\nC. $\\frac{25}{36}$\t\tD. $\\frac{11}{36}$",
                font: "Segoe UI",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: "Lời giải:\nKhông gian mẫu có $n(\\Omega) = C_9^2 = 36$ phần tử. Biến cố đối $A'$ là 'tích hai số ghi trên hai thẻ rút ra là một số lẻ', tức là cả hai số đều lẻ. Trong tập từ 1 đến 9 có 5 số lẻ {1,3,5,7,9}. Do đó $n(A') = C_5^2 = 10$ phần tử. Xác suất của biến cố đối là $P(A') = 10/36 = 5/18$. Vậy xác suất để tích hai số ghi trên thẻ rút ra là một số chẵn bằng $P(A) = 1 - 5/18 = 13/18$. Chọn B.",
                italics: true,
                color: "4B5563",
                font: "Segoe UI",
              }),
            ],
          }),
        ],
      },
    ],
  });

  // Pack the document into a blob
  const blob = await Packer.toBlob(doc);
  
  // Create object URL and download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "De_thi_mau_phan_hoa_Word.docx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
