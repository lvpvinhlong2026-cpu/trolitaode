import pptxgen from "pptxgenjs";
import { Exam } from "../types";
import { drawInlineTextWithMath } from "./pptxLayoutEngine";

/**
 * Creates a PowerPoint presentation from an Exam.
 * Each question is placed on a separate slide.
 */
export async function downloadExamPptxFile(
  exam: Exam, 
  mode: 'student' | 'teacher' = 'student',
  schoolName: string = "TRƯỜNG THPT CHUYÊN TOÁN HỌC",
  departmentName: string = "TỔ THI CỬ & KHẢO THÍ",
  examSubTitle: string = "ĐỀ THI ĐÁNH GIÁ NĂNG LỰC",
  schoolYear: string = "Năm học 2026 - 2027",
  logoUrl: string | null = null
) {
  // 1. Create a new Presentation
  let pres = new pptxgen();
  
  // Set Presentation metadata
  pres.title = exam.title;
  pres.author = "Hệ thống Trợ lý Toán học AI";
  pres.company = "Hệ thống Trợ lý Toán học AI";
  
  // Define a master slide for common layout elements
  const slideMasterObjects: any[] = [
    { rect: { x: 0, y: 0, w: "100%", h: 0.5, fill: { color: "2563EB" } } }, // Blue top banner
    { text: { text: exam.title, options: { x: 0.2, y: 0.1, w: "90%", h: 0.3, color: "FFFFFF", fontSize: 14, bold: true } } },
    { text: { text: "Hệ thống Trợ lý Toán học AI", options: { x: "70%", y: "92%", w: "30%", h: 0.3, color: "A0AABB", fontSize: 10, align: "right" } } }
  ];

  if (logoUrl) {
    slideMasterObjects.unshift({
      image: {
        data: logoUrl,
        x: 2.5,
        y: 1.0,
        w: 5,
        h: 5,
        sizing: { type: "contain" },
        transparency: 90
      }
    });
  }

  pres.defineSlideMaster({
    title: "MASTER_SLIDE",
    background: { color: "FFFFFF" },
    objects: slideMasterObjects,
  });

  // 2. Add Title Slide
  let titleSlide = pres.addSlide({ masterName: "MASTER_SLIDE" });
  titleSlide.addText(exam.title, { x: 1, y: 1.5, w: 8, h: 1, fontSize: 36, bold: true, color: "1E293B", align: "center" });
  titleSlide.addText(`Thời gian làm bài: ${exam.duration} phút`, { x: 1, y: 2.5, w: 8, h: 0.5, fontSize: 20, color: "64748B", align: "center" });
  titleSlide.addText(`Số lượng: ${exam.questions.length} câu hỏi`, { x: 1, y: 3.0, w: 8, h: 0.5, fontSize: 18, color: "64748B", align: "center" });
  
  if (mode === 'teacher') {
    titleSlide.addText(`(BẢN ĐÁP ÁN & HƯỚNG DẪN GIẢI)`, { x: 1, y: 3.5, w: 8, h: 0.5, fontSize: 18, color: "DC2626", bold: true, align: "center" });
  }

  // 3. Add a slide for each question
  for (let index = 0; index < exam.questions.length; index++) {
    const q = exam.questions[index];
    let slide = pres.addSlide({ masterName: "MASTER_SLIDE" });
    
    // Header for question
    slide.addText(`Câu ${index + 1} [Mức độ: ${q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'medium' ? 'TB' : 'Khó'}]`, {
      x: 0.5, y: 0.7, w: 9, h: 0.4,
      fontSize: 16, bold: true, color: "1E293B"
    });

    // Question content
    let currentY = await drawInlineTextWithMath(slide, q.content, 0.5, 1.2, 9, 20, "334155");

    // Add some padding after the question text
    currentY += 0.3;

    // Options
    if (q.options && q.options.length === 4) {
      const optionLabels = ["A", "B", "C", "D"];
      
      for (let optIndex = 0; optIndex < q.options.length; optIndex++) {
        const opt = q.options[optIndex];
        let optPrefix = `${optionLabels[optIndex]}. `;
        let textColor = "475569";
        let isBold = false;
        let suffix = "";

        // If teacher mode, highlight the correct answer
        if (mode === 'teacher' && q.correctAnswer === optionLabels[optIndex]) {
          textColor = "059669"; // Emerald 600
          isBold = true;
          suffix = " (ĐÁP ÁN ĐÚNG)";
        }

        const fullOptText = optPrefix + opt + suffix;
        currentY = await drawInlineTextWithMath(slide, fullOptText, 0.8, currentY, 8.5, 18, textColor, isBold);
        currentY += 0.1; // padding between options
      }
    } else {
      // Essay / Tự luận placeholder
      slide.addText("Phần trả lời tự luận:", {
        x: 0.5, y: currentY, w: 9, h: 0.4,
        fontSize: 16, color: "94A3B8", italic: true
      });
      // Draw lines for essay
      for(let i=0; i<3; i++) {
        slide.addShape(pres.ShapeType.line, { x: 0.5, y: currentY + 0.5 + (i * 0.5), w: 9, h: 0, line: { color: "CBD5E1", width: 1, dashType: "dash" } });
      }
      currentY += 2.0;
    }

    // Explanation for teacher mode
    if (mode === 'teacher' && q.explanation) {
      slide.addText(`Hướng dẫn giải:`, {
        x: 0.5, y: currentY, w: 9, h: 0.3,
        fontSize: 14, color: "0284C7", bold: true
      });
      await drawInlineTextWithMath(slide, q.explanation, 0.5, currentY + 0.4, 9, 14, "0284C7");
    }
  }

  // 4. Save the presentation
  const fileName = `Bài_Giảng_${exam.title.replace(/\s+/g, '_')}${mode === 'teacher' ? '_Dap_An' : ''}.pptx`;
  await pres.writeFile({ fileName });
}
