const docx = require('docx');
const fs = require('fs');

const doc = new docx.Document({
    styles: {
        default: {
            document: {
                run: {
                    font: "Times New Roman",
                    size: 28, // 14pt
                },
            },
        },
    },
    sections: [{
        properties: {
            page: {
                margin: {
                    top: "2cm",
                    bottom: "2cm",
                    left: "3cm",
                    right: "1.5cm"
                }
            }
        },
        children: [
            new docx.Paragraph({ text: 'MẪU ĐỀ KIỂM TRA ĐỊNH DẠNG 2025', heading: docx.HeadingLevel.HEADING_1 }),
            new docx.Paragraph({ text: 'Hệ thống hỗ trợ tự động nhận diện câu hỏi từ file Word nếu làm đúng định dạng dưới đây. Hệ thống nhận diện các mức độ [B] (Biết/Dễ), [H] (Hiểu/TB), [VD] (Vận dụng/Khó) và tag [DS] cho câu hỏi Đúng/Sai, [TLN] cho câu Trả lời ngắn.' }),
            new docx.Paragraph({ text: '' }),
            
            new docx.Paragraph({ text: 'PHẦN I. CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN', heading: docx.HeadingLevel.HEADING_2 }),
            new docx.Paragraph({ text: '(Hệ thống nhận diện dựa trên các đáp án A., B., C., D. và tự động phân loại thành dạng câu hỏi Trắc nghiệm khách quan 4 lựa chọn)' }),
            new docx.Paragraph({ text: 'Câu 1 [B]: Thể tích khối lập phương cạnh a là bao nhiêu?' }),
            new docx.Paragraph({ text: 'A. a^3      B. 3a^3      C. a^2      D. a^3/3' }),
            new docx.Paragraph({ text: 'Lời giải: Đáp án A. Theo công thức tính thể tích khối lập phương.' }),
            new docx.Paragraph({ text: '' }),
            new docx.Paragraph({ text: 'Câu 2 [VD]: Tìm tập nghiệm của phương trình $2^{x+1} = 8$ (hỗ trợ công thức LaTeX)...' }),
            new docx.Paragraph({ text: 'A. $x = 1$   B. $x = 2$   C. $x = 3$   D. $x = 4$' }),
            new docx.Paragraph({ text: 'Lời giải: Đáp án B.' }),
            new docx.Paragraph({ text: '' }),
            
            new docx.Paragraph({ text: 'PHẦN II. CÂU TRẮC NGHIỆM ĐÚNG SAI', heading: docx.HeadingLevel.HEADING_2 }),
            new docx.Paragraph({ text: '(Lưu ý: Bắt buộc thêm tag [DS] hoặc [đs] bên cạnh câu hỏi. Học sinh sẽ chọn Đúng/Sai cho từng mệnh đề)' }),
            new docx.Paragraph({ text: 'Câu 3 [DS]: Cho hàm số $y = f(x)$. Các mệnh đề sau đúng hay sai?' }),
            new docx.Paragraph({ text: 'a) Hàm số đồng biến trên $\\mathbb{R}$.' }),
            new docx.Paragraph({ text: 'b) Hàm số có tập xác định $D = \\mathbb{R}$.' }),
            new docx.Paragraph({ text: 'c) Đồ thị hàm số đi qua điểm $M(1;2)$.' }),
            new docx.Paragraph({ text: 'd) Hàm số có đạo hàm $f\'(x) > 0$.' }),
            new docx.Paragraph({ text: 'Lời giải: Đáp án a) Đ, b) S, c) Đ, d) S.' }),
            new docx.Paragraph({ text: '' }),
            
            new docx.Paragraph({ text: 'PHẦN III. CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN', heading: docx.HeadingLevel.HEADING_2 }),
            new docx.Paragraph({ text: '(Lưu ý: Bắt buộc thêm tag [TLN] bên cạnh câu hỏi để hệ thống nhận diện đây là câu hỏi dạng Tự luận / Trả lời ngắn)' }),
            new docx.Paragraph({ text: 'Câu 4 [TLN]: Một quả bóng được ném lên với vận tốc $v_0 = 10m/s$. Tính độ cao tối đa (m).' }),
            new docx.Paragraph({ text: 'Lời giải: Đáp án 5. Áp dụng công thức vật lý $h = \\frac{v_0^2}{2g}$.' })
        ],
    }]
});

docx.Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync('public/Maude.docx', buffer);
    console.log('Template generated successfully!');
}).catch(console.error);
