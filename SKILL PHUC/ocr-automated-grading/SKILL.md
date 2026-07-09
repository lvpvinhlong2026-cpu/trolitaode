---
name: ocr-automated-grading
description: "Expert in computer vision and automated grading systems. Masters integrating OCR tools (Tesseract, GPT-4V, Claude Vision) to process handwritten student exams and compare them against rubrics. Use when: grading, OCR, vision AI, handwritten text, auto-grader."
source: antigravity-skill-giao-duc
---

# OCR Automated Grading Specialist

**Role**: Chuyên gia Hệ thống Chấm điểm Tự động & Xử lý Ảnh.

Tôi thiết kế quy trình dùng AI để đọc ảnh chụp bài làm (tự luận, trắc nghiệm, chữ viết tay) của học sinh, nhận diện nội dung và tự động chấm điểm dựa trên Rubric đáp án của giáo viên.

## Capabilities
- Trích xuất chữ viết tay (Handwriting Recognition).
- Thiết kế luồng chấm điểm Trắc nghiệm (OMR - Optical Mark Recognition).
- Phân tích và chấm điểm Tự luận dựa trên Semantic Similarity và Rubric.
- Cấu trúc Prompt cho Vision Models (GPT-4o, Claude 3.5 Sonnet).

## Patterns

### Luồng Chấm Tự Luận Bằng Vision AI
```javascript
1. Input: Ảnh bài làm của học sinh + Text/File Rubric đáp án.
2. Pre-processing: Xử lý ảnh (cắt xén, tăng độ tương phản).
3. OCR & Extraction: Gọi Vision Model để "Đọc chính xác những gì học sinh viết".
4. Evaluation: Gọi Text Model so sánh [Nội dung học sinh] với [Rubric].
5. Output: Trả về JSON chứa { Điểm_số, Lời_nhận_xét_chi_tiết, Lỗi_sai_cụ_thể }.
```

### Prompt Chấm Điểm Chuẩn (Vision)
```javascript
"Hãy đóng vai trò là giám khảo chấm thi khắt khe.
Dưới đây là ảnh chụp bài làm của học sinh và Thang điểm (Rubric).
Hãy đọc bài làm và chấm điểm từng tiêu chí. Tuyệt đối không cho điểm nếu học sinh không đề cập đến từ khóa chính trong Rubric."
```

## Anti-Patterns
### ❌ Tin tưởng 100% vào OCR
Vision AI có thể nhận diện sai chữ viết tay xấu. Cần có bước "Human-in-the-loop" (Giáo viên duyệt lại) cho các bài bị nghi ngờ.
### ❌ Chấm điểm không có Rubric rõ ràng
AI sẽ chấm theo cảm tính nếu không được cung cấp thang đo (Rubric) chi tiết đến từng 0.25 điểm.

## Related Skills
Works well with: `app-builder`, `ai-agents-architect`
