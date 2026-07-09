import fs from 'fs';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';

const doc = new Document({
    sections: [
        {
            properties: {
                page: {
                    margin: {
                        top: 1134,    // 2cm in twips (2 * 567)
                        bottom: 1134, // 2cm
                        left: 1701,   // 3cm
                        right: 1134,  // 2cm
                    },
                    size: {
                        width: 11906, // A4
                        height: 16838,
                    },
                },
            },
            children: [
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: "MẪU CÂU HỎI TRẮC NGHIỆM TẢI LÊN HỆ THỐNG",
                            bold: true,
                            font: "Times New Roman",
                            size: 28, // 14pt (28 half-points)
                        }),
                    ],
                    spacing: { after: 400 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Hướng dẫn: Mỗi câu hỏi bắt đầu bằng 'Câu X' và nhãn độ khó [B], [H], [VD]. Các phương án bắt đầu bằng A. B. C. D. Lời giải bắt đầu bằng 'Lời giải:' hoặc 'Chọn X'.",
                            italic: true,
                            font: "Times New Roman",
                            size: 28,
                        }),
                    ],
                    spacing: { after: 400 },
                }),
                // Question 1
                new Paragraph({
                    children: [
                        new TextRun({ text: "Câu 1 [B]: ", bold: true, font: "Times New Roman", size: 28 }),
                        new TextRun({ text: "Thủ đô của Việt Nam là gì?", font: "Times New Roman", size: 28 }),
                    ],
                }),
                new Paragraph({ children: [new TextRun({ text: "A. Thành phố Hồ Chí Minh", font: "Times New Roman", size: 28 })] }),
                new Paragraph({ children: [new TextRun({ text: "B. Hà Nội", font: "Times New Roman", size: 28 })] }),
                new Paragraph({ children: [new TextRun({ text: "C. Đà Nẵng", font: "Times New Roman", size: 28 })] }),
                new Paragraph({ children: [new TextRun({ text: "D. Huế", font: "Times New Roman", size: 28 })] }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Lời giải: Chọn B. ", bold: true, font: "Times New Roman", size: 28 }),
                        new TextRun({ text: "Thủ đô của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam là Hà Nội.", font: "Times New Roman", size: 28 }),
                    ],
                    spacing: { after: 400 },
                }),
                // Question 2
                new Paragraph({
                    children: [
                        new TextRun({ text: "Câu 2 [H]: ", bold: true, font: "Times New Roman", size: 28 }),
                        new TextRun({ text: "Tập nghiệm của phương trình ", font: "Times New Roman", size: 28 }),
                        new TextRun({ text: "$x^2 - 4 = 0$", font: "Times New Roman", size: 28 }),
                        new TextRun({ text: " là?", font: "Times New Roman", size: 28 }),
                    ],
                }),
                new Paragraph({ children: [new TextRun({ text: "A. ${2}$", font: "Times New Roman", size: 28 })] }),
                new Paragraph({ children: [new TextRun({ text: "B. ${-2}$", font: "Times New Roman", size: 28 })] }),
                new Paragraph({ children: [new TextRun({ text: "C. ${-2; 2}$", font: "Times New Roman", size: 28 })] }),
                new Paragraph({ children: [new TextRun({ text: "D. $\\varnothing$", font: "Times New Roman", size: 28 })] }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Lời giải: Chọn C. ", bold: true, font: "Times New Roman", size: 28 }),
                        new TextRun({ text: "Ta có $x^2 - 4 = 0 \\Leftrightarrow x = \\pm 2$.", font: "Times New Roman", size: 28 }),
                    ],
                    spacing: { after: 400 },
                }),
            ],
        },
    ],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("public/Maude.docx", buffer);
    console.log("Created public/Maude.docx successfully.");
}).catch((err) => {
    console.error("Error creating doc:", err);
});
