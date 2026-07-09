/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middleware
  app.use(express.json({ limit: "500mb" }));
  app.use(express.urlencoded({ limit: "500mb", extended: true }));

  // Global Error Handler cho Body Parser (tránh trả về HTML khi file quá lớn)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
      return res.status(400).json({ error: "Dữ liệu JSON không hợp lệ." });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: "Kích thước file quá lớn (vượt giới hạn). Vui lòng thử lại với file nhỏ hơn." });
    }
    next(err);
  });

  // Lazy initialization of Gemini client to prevent crashes if key is omitted on startup
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(clientKey?: string): GoogleGenAI {
    if (clientKey) {
      return new GoogleGenAI({ apiKey: clientKey });
    }
    if (!aiClient) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error("GEMINI_API_KEY environment variable is required but missing on the server.");
      }
      aiClient = new GoogleGenAI({ apiKey: key });
    }
    return aiClient;
  }

  // API endpoint proxy to call Gemini
  app.post("/api/gemini", async (req, res) => {
    try {
      const { prompt, model = "gemini-2.5-flash", apiKey, imageBase64 } = req.body;
      if (!prompt && !imageBase64) {
        return res.status(400).json({ error: "Vui lòng truyền dữ liệu đầu vào." });
      }

      let contents: any = prompt;
      if (imageBase64) {
        const match = imageBase64.match(/^data:(image\/[a-zA-Z]*);base64,/);
        const mimeType = match ? match[1] : "image/jpeg";
        const data = imageBase64.replace(/^data:image\/[a-zA-Z]*;base64,/, "");
        contents = [
          prompt,
          { inlineData: { mimeType, data } }
        ];
      }

      // Fallback model list as defined in client-side
      const MODELS_POOL = [model, "gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
      let lastError: any = null;

      for (const modelName of MODELS_POOL) {
        try {
          const client = getGeminiClient(apiKey);
          const response = await client.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
              temperature: 0.7,
              maxOutputTokens: 8192,
            }
          });

          if (response && response.text) {
            return res.json({ text: response.text });
          }
        } catch (err: any) {
          console.warn(`Lỗi khi gọi model ${modelName}:`, err.message || err);
          lastError = err;
          // Continue loop to try next fallback model
        }
      }

      throw lastError || new Error("Không thể thực hiện yêu cầu generateContent với bất kỳ mô hình nào.");
    } catch (error: any) {
      console.error("API Gemini Proxy Exception:", error);
      res.status(500).json({
        error: error.message || "Có lỗi bất ngờ xảy ra khi xử lý phản hồi từ AI."
      });
    }
  });

  // File (PDF/Image) to DOCX Convert Proxy
  app.post("/api/convert-pdf", async (req, res) => {
    try {
      const { pdfBase64, mimeType = "application/pdf", files, parsingMode = "normal", model = "gemini-1.5-pro", apiKey, includeSolution = true, examCount = 1, contextSuggestion = "", matrixConfig = "[]", continueFromText = "" } = req.body;
      
      let targetFiles = files;
      if (!targetFiles && pdfBase64) {
        targetFiles = [{ base64: pdfBase64, mimeType }];
      }

      if (!targetFiles || targetFiles.length === 0) {
        return res.status(400).json({ error: "Không tìm thấy dữ liệu file." });
      }

      const client = getGeminiClient(apiKey);
      
      let prompt = "";
      if (parsingMode === "normal") {
        prompt = `Bạn là một chuyên gia OCR Toán học. Nhiệm vụ của bạn là bóc tách toàn bộ nội dung văn bản và công thức từ hình ảnh/tài liệu được cung cấp.
BẮT BUỘC TUÂN THỦ CÁC QUY ĐỊNH SAU ĐỂ HỆ THỐNG XỬ LÝ (NẾU KHÔNG SẼ BỊ LỖI):
1. Về Công thức Toán học: Chuyển TẤT CẢ các biểu thức toán học sang mã LaTeX chuẩn. Công thức nội dòng bọc bằng $...$, công thức độc lập bọc bằng $$...$$. Tuyệt đối không dùng ký hiệu Unicode cho các công thức đặc biệt (ví dụ: dùng $\\sqrt{x}$ thay vì √x, $\\Delta$ thay vì Δ, v.v.).
2. Về Cấu trúc Đề thi (Nếu tài liệu là đề thi trắc nghiệm):
   - Mở đầu mỗi câu hỏi PHẢI là "Câu X:" (Ví dụ: Câu 1:, Câu 2:).
   - 4 đáp án bắt buộc phải bắt đầu bằng "A.", "B.", "C.", "D." và nằm trên các dòng riêng biệt.
   - Nếu có lời giải chi tiết, phải bắt đầu bằng cụm từ "Lời giải:" ở dòng mới.
3. Về Cấu trúc Văn bản: Giữ nguyên các đoạn văn. Không tự ý cắt bớt chữ.
4. Output "Sạch": KHÔNG thêm bất kỳ câu giao tiếp nào (ví dụ: "Dưới đây là kết quả...", "Đã hoàn thành..."). CHỈ trả về đúng nội dung đã bóc tách.`;
      } else if (parsingMode === "similar_exam") {
        prompt = `Bạn là một chuyên gia giáo dục. Nhiệm vụ của bạn là đọc nội dung đề thi/tài liệu được cung cấp (dưới dạng văn bản hoặc hình ảnh) và TẠO RA ${examCount} ĐỀ THI MỚI TƯƠNG TỰ hoàn toàn.
YÊU CẦU:
- Các đề thi mới phải giữ nguyên cấu trúc (số lượng câu hỏi, dạng bài, mức độ khó, chủ đề) của đề thi gốc.
- Thay đổi số liệu, thông số, ngữ cảnh hoặc cách hỏi sao cho tương đương nhưng không giống hệt đề gốc.
${contextSuggestion ? `- YÊU CẦU ĐẶC BIỆT TỪ GIÁO VIÊN: Hãy phân tích sâu về ngữ cảnh sau đây để tạo đề dễ hiểu, phù hợp tính sư phạm (áp dụng linh hoạt cho mọi bộ môn): "${contextSuggestion}"` : ''}
- Đảm bảo tính chính xác về mặt toán học/khoa học.
- Trình bày dưới dạng định dạng Markdown.
- Chuyển tất cả công thức toán học sang định dạng LaTeX chuẩn (inline dùng dấu đô la đơn $...$, block dùng dấu đô la kép $$...$$).
- Các câu hỏi phải theo định dạng "Câu X: ...".
- Trình bày rõ ràng 4 đáp án A, B, C, D cho mỗi câu hỏi.
${examCount > 1 ? `- Phân tách các đề bằng dấu gạch ngang (---) và tiêu đề rõ ràng (ví dụ: Đề 1, Đề 2...).` : ''}
${includeSolution ? `- Ở phần cuối của bài làm, cung cấp toàn bộ lời giải chi tiết cho các câu hỏi, dưới tiêu đề "Lời giải chi tiết:".` : '- KHÔNG cung cấp lời giải, chỉ xuất ra đề thi.'}
- KHÔNG giải thích lằng nhằng, chỉ xuất ra đề thi${includeSolution ? ' và lời giải' : ''}.`;
      } else if (parsingMode === "matrix_exam") {
        prompt = `Bạn là một chuyên gia giáo dục. Hãy tạo ra MỘT ĐỀ THI ĐÚNG CHUẨN FORMAT 2025 MỚI NHẤT bám sát cấu trúc Ma Trận Đặc Tả sau đây:
${matrixConfig}

YÊU CẦU BẮT BUỘC VỀ ĐỊNH DẠNG & MỨC ĐỘ:
1. Đề thi phải chia làm 3 phần (nếu trong ma trận có số lượng câu tương ứng):
   - PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (Mỗi câu có 4 đáp án A, B, C, D).
   - PHẦN II. Câu trắc nghiệm đúng sai. Mỗi câu phải có đúng 4 ý a), b), c), d).
   - PHẦN III. Câu trắc nghiệm trả lời ngắn (Học sinh chỉ cần điền một con số hoặc cụm từ ngắn gọn).

2. Cấu trúc câu hỏi Đúng/Sai (RẤT QUAN TRỌNG):
   - Cột "Cấu trúc ý ĐS (B-H-VD)" trong ma trận định nghĩa số lượng ý Nhận biết - Thông hiểu - Vận dụng cho từng câu hỏi Đúng/Sai thuộc chủ đề đó. 
   - Ví dụ: Cấu trúc "2-1-1" nghĩa là trong 4 ý a,b,c,d của câu hỏi đó, PHẢI CÓ đúng 2 ý ở mức Nhận biết, 1 ý ở mức Thông hiểu, và 1 ý ở mức Vận dụng.
   - Bạn phải gắn thẻ mức độ [B], [H], [VD] ngay sau mỗi ý a,b,c,d để chứng minh. Ví dụ: "a) [B] Nội dung ý a... b) [H] Nội dung ý b...".

3. Gắn thẻ trước mỗi câu hỏi:
   - Các câu phần I và III phải gắn thẻ mức độ: [B], [H], [VD], [VDC]. Ví dụ: "Câu 1 [B]:" hoặc "Câu 3 [VD]:"
   - Giữ nguyên định dạng Markdown và chuyển tất cả công thức sang LaTeX chuẩn ($...$, $$...$$).

YÊU CẦU VỀ NỘI DUNG:
- Hãy sử dụng tài liệu/văn bản/hình ảnh được đính kèm làm cơ sở dữ liệu phụ trợ. Tuy nhiên, bạn BẮT BUỘC phải tuân thủ nghiêm ngặt Ma Trận Đặc Tả (Môn học, Lớp học, Tên bài, Số lượng câu, Mức độ) làm bộ khung chính để tạo đề.
${contextSuggestion ? `- YÊU CẦU ĐẶC BIỆT TỪ GIÁO VIÊN: Hãy phân tích sâu về ngữ cảnh sau đây để tạo đề dễ hiểu, phù hợp tính sư phạm (áp dụng linh hoạt cho mọi bộ môn): "${contextSuggestion}"` : ''}
${includeSolution ? `- BẮT BUỘC: Ở phần cuối cùng của tài liệu, hãy cung cấp toàn bộ lời giải chi tiết cho các câu hỏi, dưới tiêu đề "Lời giải chi tiết:". Trình bày rõ ràng cách giải từng câu, từng ý.` : '- KHÔNG cung cấp lời giải, chỉ xuất ra đề thi.'}
- KHÔNG giải thích lằng nhằng, chỉ xuất ra nội dung đề thi${includeSolution ? ' và lời giải' : ''}.`;
      } else if (parsingMode === "standardize_exam") {
        prompt = `Bạn là một chuyên gia giáo dục. Nhiệm vụ của bạn là đọc nội dung đề thi/tài liệu được cung cấp (dưới dạng văn bản hoặc hình ảnh) và CHUẨN HÓA lại toàn bộ theo đúng chuẩn cấu trúc thi mới nhất.

YÊU CẦU BẮT BUỘC VỀ ĐỊNH DẠNG & MỨC ĐỘ:
1. Đề thi phải chia làm 3 phần chuẩn:
   - PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (Mỗi câu có 4 đáp án A, B, C, D).
   - PHẦN II. Câu trắc nghiệm đúng sai (Mỗi câu phải có đúng 4 ý a), b), c), d)).
   - PHẦN III. Câu trắc nghiệm trả lời ngắn.

2. Gắn thẻ mức độ nhận thức (RẤT QUAN TRỌNG):
   - BẠN BẮT BUỘC PHẢI TỰ ĐỘNG ĐÁNH GIÁ và gắn thẻ mức độ [B] (Nhận biết), [H] (Thông hiểu), [VD] (Vận dụng) hoặc [VDC] (Vận dụng cao) cho TỪNG CÂU HỎI.
   - Đối với PHẦN I và PHẦN III: Gắn thẻ ngay trước câu hỏi. Ví dụ: "Câu 1 [B]:" hoặc "Câu 3 [VD]:".
   - Đối với PHẦN II (Đúng/Sai): AI sẽ ĐÁNH GIÁ VÀ GẮN THẺ CHO TỪNG Ý NHỎ a, b, c, d để được kết quả như: "a) [B] Nội dung ý a... b) [H] Nội dung ý b...". BẮT BUỘC TỪNG Ý ĐỀU PHẢI CÓ THẺ.

3. Kỹ thuật hiển thị:
   - Giữ nguyên định dạng Markdown và chuyển tất cả công thức sang LaTeX chuẩn (dùng $...$ và $$...$$).
   - Không tự ý thay đổi số liệu đề gốc, chỉ chuẩn hóa format và đánh giá mức độ.

${includeSolution ? `- BẮT BUỘC: Ở phần cuối cùng của tài liệu, hãy cung cấp toàn bộ lời giải chi tiết cho các câu hỏi, dưới tiêu đề "Lời giải chi tiết:". Trình bày rõ ràng cách giải từng câu, từng ý.` : '- KHÔNG cung cấp lời giải, chỉ xuất ra đề thi.'}
- KHÔNG giải thích lằng nhằng, chỉ xuất ra đề thi${includeSolution ? ' và lời giải' : ''}.`;
      } else if (parsingMode === "solve_exam_tutor") {
        prompt = `Bạn là một gia sư AI tài năng, xuất sắc. Nhiệm vụ của bạn là đọc và hiểu tài liệu đề bài được cung cấp (dưới dạng văn bản hoặc hình ảnh).
Sau đó, hãy trình bày lời giải chi tiết, từng bước, khoa học và cực kỳ dễ hiểu cho học sinh trung học phổ thông.

YÊU CẦU BẮT BUỘC VỀ ĐỊNH DẠNG VÀ NỘI DUNG:
1. GIẢI QUYẾT TOÀN BỘ ĐỀ: Bạn BẮT BUỘC phải tìm và giải quyết TẤT CẢ các câu hỏi có trong tài liệu. Tuyệt đối không được bỏ sót câu nào, không được dừng lại giữa chừng hay chỉ giải 1 câu đầu tiên.
2. Trình bày dưới dạng Markdown rõ ràng, phân chia rõ "Câu 1:", "Câu 2:"... để người dùng dễ theo dõi.
3. Toàn bộ các công thức toán học BẮT BUỘC phải bọc trong các cặp thẻ LaTeX: $...$ cho công thức nội dòng và $$...$$ cho biểu thức dạng khối. Tuyệt đối không dùng ký hiệu Unicode (như √, Δ).
4. Sử dụng giọng văn sư phạm, lịch sự, thân thiện và giàu khích lệ.
5. Mọi câu trả lời và kiến thức BẮT BUỘC phải bám sát định hướng của bộ sách "Kết nối tri thức với cuộc sống".
6. PHÂN LOẠI LỜI GIẢI THEO MỨC ĐỘ: Bạn phải tự đánh giá mức độ của từng câu hỏi. Đối với các câu hỏi Nhận biết (dễ, lý thuyết cơ bản mức [B]), CHỈ CẦN đưa ra phương án đúng, KHÔNG giải thích chi tiết. CHỈ ĐƯỢC giải thích chi tiết (từng bước) đối với các câu hỏi Thông hiểu ([H]) và Vận dụng ([VD]).`;
      }
      
      prompt += `\n\n[YÊU CẦU BẮT BUỘC CHUNG]: Mọi nội dung, ngữ cảnh, thuật ngữ và dữ liệu bạn sinh ra PHẢI tuân thủ và bám sát tuyệt đối theo chuẩn của bộ sách "Kết nối tri thức với cuộc sống".\n`;

      if (continueFromText) {
        prompt += `\n[YÊU CẦU ĐẶC BIỆT]: Đoạn văn bản trước đó bạn sinh ra bị thiếu. Dưới đây là phần văn bản cuối cùng bạn đã viết:\n"""\n${continueFromText.length > 2000 ? continueFromText.substring(continueFromText.length - 2000) : continueFromText}\n"""\nHãy ĐỌC KỸ phần cuối này và TIẾP TỤC sinh ra nội dung CÒN THIẾU ngay nối tiếp phần đó. TUYỆT ĐỐI KHÔNG viết lại những phần đã sinh ra, chỉ viết tiếp.\n`;
      }

      const contentsArray: any[] = [prompt];
      for (const file of targetFiles) {
        contentsArray.push({
          inlineData: {
            data: file.base64,
            mimeType: file.mimeType
          }
        });
      }

      const MODELS_POOL = [model, "gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"];
      let lastError: any = null;
      const MAX_RETRIES = 3;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        for (const modelName of MODELS_POOL) {
          try {
            const response = await client.models.generateContent({
              model: modelName,
              contents: contentsArray,
              config: {
                temperature: 0.7, // Tăng lên 0.7 để AI linh hoạt giải thích dài, tránh bị cắt cụt do lặp từ
                maxOutputTokens: 8192,
              }
            });

            if (response && response.text) {
              return res.json({ text: response.text });
            }
          } catch (err: any) {
            console.warn(`Lỗi khi gọi model ${modelName} cho xử lý file (Lần thử ${attempt}):`, err.message || err);
            lastError = err;
            // Continue to next model if available
          }
        }
        
        // If all models failed in this attempt, wait before retrying
        if (attempt < MAX_RETRIES) {
          console.log(`Đang chờ nghiệm nghiệm lại (Lần ${attempt + 1})...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000)); // 2s, 4s, 6s...
        }
      }

      throw lastError || new Error("Hệ thống AI đang quá tải. Vui lòng thử lại sau vài phút.");
    } catch (error: any) {
      console.error("API File Convert Exception:", error);
      res.status(500).json({
        error: error.message || "Có lỗi bất ngờ xảy ra khi bóc tách file."
      });
    }
  });

  // Word (Text+MathML) to Markdown+LaTeX Convert Proxy
  app.post("/api/convert-word", async (req, res) => {
    try {
      const { textContent, parsingMode = "normal", model = "gemini-1.5-pro", apiKey, includeSolution = true, examCount = 1, contextSuggestion = "", matrixConfig = "[]", continueFromText = "" } = req.body;
      if (!textContent && parsingMode !== "matrix_exam") {
        return res.status(400).json({ error: "Không tìm thấy dữ liệu văn bản." });
      }

      const client = getGeminiClient(apiKey);
      
      let prompt = "";
      if (parsingMode === "normal") {
        prompt = `Bạn là một chuyên gia OCR Toán học. Nhiệm vụ của bạn là chuẩn hóa nội dung văn bản (đã được bóc tách từ file Word) sang Markdown và LaTeX chuẩn.
BẮT BUỘC TUÂN THỦ CÁC QUY ĐỊNH SAU ĐỂ HỆ THỐNG XỬ LÝ (NẾU KHÔNG SẼ BỊ LỖI):
1. Về Công thức Toán học: Văn bản đầu vào có thể chứa mã MathML thô hoặc công thức bị lỗi. Hãy chuyển TẤT CẢ chúng sang mã LaTeX chuẩn. Công thức nội dòng bọc bằng $...$, công thức độc lập bọc bằng $$...$$.
2. Về Cấu trúc Đề thi (Nếu tài liệu là đề thi trắc nghiệm):
   - Mở đầu mỗi câu hỏi PHẢI là "Câu X:" (Ví dụ: Câu 1:, Câu 2:).
   - 4 đáp án bắt buộc phải bắt đầu bằng "A.", "B.", "C.", "D." và nằm trên các dòng riêng biệt.
   - Nếu có lời giải chi tiết, phải bắt đầu bằng cụm từ "Lời giải:" ở dòng mới.
3. Về Cấu trúc Văn bản: Giữ nguyên các đoạn văn. Không tự ý cắt bớt chữ.
4. Output "Sạch": KHÔNG thêm bất kỳ câu giao tiếp nào (ví dụ: "Dưới đây là kết quả...", "Đã hoàn thành..."). CHỈ trả về đúng nội dung đã bóc tách.`;
      } else if (parsingMode === "similar_exam") {
        prompt = `Bạn là một chuyên gia giáo dục. Dựa vào nội dung đề thi/tài liệu gốc ở dưới, hãy TẠO RA ${examCount} ĐỀ THI MỚI TƯƠNG TỰ.
YÊU CẦU:
- Các đề mới giữ nguyên cấu trúc (số câu, dạng bài, độ khó) của đề gốc.
- Thay đổi số liệu, thông số, ngữ cảnh sao cho tương đương nhưng không giống hệt.
${contextSuggestion ? `- YÊU CẦU ĐẶC BIỆT TỪ GIÁO VIÊN: Hãy phân tích sâu về ngữ cảnh sau đây để tạo đề dễ hiểu, phù hợp tính sư phạm (áp dụng linh hoạt cho mọi bộ môn): "${contextSuggestion}"` : ''}
- Trình bày bằng định dạng Markdown.
- Tất cả công thức toán học/MathML phải chuyển sang LaTeX chuẩn (inline dùng $...$, block dùng $$...$$).
- Các câu theo định dạng "Câu X: ...".
- 4 đáp án A, B, C, D rõ ràng.
${examCount > 1 ? `- Phân tách các đề bằng dấu gạch ngang (---) và tiêu đề rõ ràng (ví dụ: Đề 1, Đề 2...).` : ''}
${includeSolution ? `- Cung cấp lời giải chi tiết cho toàn bộ các câu ở cuối đề dưới tiêu đề "Lời giải chi tiết:".` : '- KHÔNG cung cấp lời giải, chỉ xuất ra đề thi.'}
- KHÔNG thêm giải thích thừa.`;
      } else if (parsingMode === "matrix_exam") {
        prompt = `Bạn là một chuyên gia giáo dục. Hãy tạo ra MỘT ĐỀ THI ĐÚNG CHUẨN FORMAT 2025 MỚI NHẤT bám sát cấu trúc Ma Trận Đặc Tả sau đây:
${matrixConfig}

YÊU CẦU BẮT BUỘC VỀ ĐỊNH DẠNG & MỨC ĐỘ:
1. Đề thi phải chia làm 3 phần (nếu trong ma trận có số lượng câu tương ứng):
   - PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (Mỗi câu có 4 đáp án A, B, C, D).
   - PHẦN II. Câu trắc nghiệm đúng sai. Mỗi câu phải có đúng 4 ý a), b), c), d).
   - PHẦN III. Câu trắc nghiệm trả lời ngắn (Học sinh chỉ cần điền một con số hoặc cụm từ ngắn gọn).

2. Cấu trúc câu hỏi Đúng/Sai (RẤT QUAN TRỌNG):
   - Cột "Cấu trúc ý ĐS (B-H-VD)" trong ma trận định nghĩa số lượng ý Nhận biết - Thông hiểu - Vận dụng cho từng câu hỏi Đúng/Sai thuộc chủ đề đó. 
   - Ví dụ: Cấu trúc "2-1-1" nghĩa là trong 4 ý a,b,c,d của câu hỏi đó, PHẢI CÓ đúng 2 ý ở mức Nhận biết, 1 ý ở mức Thông hiểu, và 1 ý ở mức Vận dụng.
   - Bạn phải gắn thẻ mức độ [B], [H], [VD] ngay sau mỗi ý a,b,c,d để chứng minh. Ví dụ: "a) [B] Nội dung ý a... b) [H] Nội dung ý b...".

3. Gắn thẻ trước mỗi câu hỏi:
   - Các câu phần I và III phải gắn thẻ mức độ: [B], [H], [VD], [VDC]. Ví dụ: "Câu 1 [B]:" hoặc "Câu 3 [VD]:"
   - Giữ nguyên định dạng Markdown và chuyển tất cả công thức sang LaTeX chuẩn ($...$, $$...$$).

YÊU CẦU VỀ NỘI DUNG:
${textContent ? `- Hãy sử dụng tài liệu/văn bản được cung cấp làm cơ sở dữ liệu phụ trợ. Tuy nhiên, bạn BẮT BUỘC phải tuân thủ nghiêm ngặt Ma Trận Đặc Tả (Môn học, Lớp học, Tên bài, Số lượng câu, Mức độ) làm bộ khung chính để tạo đề.` : `- Bạn BẮT BUỘC phải tuân thủ nghiêm ngặt Ma Trận Đặc Tả (Môn học, Lớp học, Tên bài, Số lượng câu, Mức độ) làm bộ khung chính để tự biên soạn và tạo đề.`}
${contextSuggestion ? `- YÊU CẦU ĐẶC BIỆT TỪ GIÁO VIÊN: Hãy phân tích sâu về ngữ cảnh sau đây để tạo đề dễ hiểu, phù hợp tính sư phạm (áp dụng linh hoạt cho mọi bộ môn): "${contextSuggestion}"` : ''}
${includeSolution ? `- BẮT BUỘC: Ở phần cuối cùng của tài liệu, hãy cung cấp toàn bộ lời giải chi tiết cho các câu hỏi, dưới tiêu đề "Lời giải chi tiết:". Trình bày rõ ràng cách giải từng câu, từng ý.` : '- KHÔNG cung cấp lời giải, chỉ xuất ra đề thi.'}
- KHÔNG giải thích lằng nhằng, chỉ xuất ra nội dung đề thi${includeSolution ? ' và lời giải' : ''}.`;
      } else if (parsingMode === "standardize_exam") {
        prompt = `Bạn là một chuyên gia giáo dục. Nhiệm vụ của bạn là đọc nội dung đề thi/tài liệu được cung cấp (dưới dạng văn bản hoặc hình ảnh) và CHUẨN HÓA lại toàn bộ theo đúng chuẩn cấu trúc thi mới nhất.

YÊU CẦU BẮT BUỘC VỀ ĐỊNH DẠNG & MỨC ĐỘ:
1. Đề thi phải chia làm 3 phần chuẩn:
   - PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (Mỗi câu có 4 đáp án A, B, C, D).
   - PHẦN II. Câu trắc nghiệm đúng sai (Mỗi câu phải có đúng 4 ý a), b), c), d)).
   - PHẦN III. Câu trắc nghiệm trả lời ngắn.

2. Gắn thẻ mức độ nhận thức (RẤT QUAN TRỌNG):
   - BẠN BẮT BUỘC PHẢI TỰ ĐỘNG ĐÁNH GIÁ và gắn thẻ mức độ [B] (Nhận biết), [H] (Thông hiểu), [VD] (Vận dụng) hoặc [VDC] (Vận dụng cao) cho TỪNG CÂU HỎI.
   - Đối với PHẦN I và PHẦN III: Gắn thẻ ngay trước câu hỏi. Ví dụ: "Câu 1 [B]:" hoặc "Câu 3 [VD]:".
   - Đối với PHẦN II (Đúng/Sai): AI sẽ ĐÁNH GIÁ VÀ GẮN THẺ CHO TỪNG Ý NHỎ a, b, c, d để được kết quả như: "a) [B] Nội dung ý a... b) [H] Nội dung ý b...". BẮT BUỘC TỪNG Ý ĐỀU PHẢI CÓ THẺ.

3. Kỹ thuật hiển thị:
   - Giữ nguyên định dạng Markdown và chuyển tất cả công thức sang LaTeX chuẩn (dùng $...$ và $$...$$).
   - Không tự ý thay đổi số liệu đề gốc, chỉ chuẩn hóa format và đánh giá mức độ.

${includeSolution ? `- BẮT BUỘC: Ở phần cuối cùng của tài liệu, hãy cung cấp toàn bộ lời giải chi tiết cho các câu hỏi, dưới tiêu đề "Lời giải chi tiết:". Trình bày rõ ràng cách giải từng câu, từng ý.` : '- KHÔNG cung cấp lời giải, chỉ xuất ra đề thi.'}
- KHÔNG giải thích lằng nhằng, chỉ xuất ra đề thi${includeSolution ? ' và lời giải' : ''}.`;
      } else if (parsingMode === "solve_exam_tutor") {
        prompt = `Bạn là một gia sư AI tài năng, xuất sắc. Nhiệm vụ của bạn là đọc và hiểu tài liệu đề bài được cung cấp (dưới dạng văn bản hoặc hình ảnh).
Sau đó, hãy trình bày lời giải chi tiết, từng bước, khoa học và cực kỳ dễ hiểu cho học sinh trung học phổ thông.

YÊU CẦU BẮT BUỘC VỀ ĐỊNH DẠNG VÀ NỘI DUNG:
1. GIẢI QUYẾT TOÀN BỘ ĐỀ: Bạn BẮT BUỘC phải tìm và giải quyết TẤT CẢ các câu hỏi có trong tài liệu. Tuyệt đối không được bỏ sót câu nào, không được dừng lại giữa chừng hay chỉ giải 1 câu đầu tiên.
2. Trình bày dưới dạng Markdown rõ ràng, phân chia rõ "Câu 1:", "Câu 2:"... để người dùng dễ theo dõi.
3. Toàn bộ các công thức toán học BẮT BUỘC phải bọc trong các cặp thẻ LaTeX: $...$ cho công thức nội dòng và $$...$$ cho biểu thức dạng khối. Tuyệt đối không dùng ký hiệu Unicode (như √, Δ).
4. Sử dụng giọng văn sư phạm, lịch sự, thân thiện và giàu khích lệ.
5. Mọi câu trả lời và kiến thức BẮT BUỘC phải bám sát định hướng của bộ sách "Kết nối tri thức với cuộc sống".
6. PHÂN LOẠI LỜI GIẢI THEO MỨC ĐỘ: Bạn phải tự đánh giá mức độ của từng câu hỏi. Đối với các câu hỏi Nhận biết (dễ, lý thuyết cơ bản mức [B]), CHỈ CẦN đưa ra phương án đúng, KHÔNG giải thích chi tiết. CHỈ ĐƯỢC giải thích chi tiết (từng bước) đối với các câu hỏi Thông hiểu ([H]) và Vận dụng ([VD]).`;
      }
      
      prompt += `\n\n[YÊU CẦU BẮT BUỘC CHUNG]: Mọi nội dung, ngữ cảnh, thuật ngữ và dữ liệu bạn sinh ra PHẢI tuân thủ và bám sát tuyệt đối theo chuẩn của bộ sách "Kết nối tri thức với cuộc sống".\n`;

      if (continueFromText) {
        prompt += `\n[YÊU CẦU ĐẶC BIỆT]: Đoạn văn bản trước đó bạn sinh ra bị thiếu. Dưới đây là phần văn bản cuối cùng bạn đã viết:\n"""\n${continueFromText.length > 2000 ? continueFromText.substring(continueFromText.length - 2000) : continueFromText}\n"""\nHãy ĐỌC KỸ phần cuối này và TIẾP TỤC sinh ra nội dung CÒN THIẾU ngay nối tiếp phần đó. TUYỆT ĐỐI KHÔNG viết lại những phần đã sinh ra, chỉ viết tiếp.\n`;
      }

      if (parsingMode === "matrix_exam") {
        if (textContent) {
          prompt += `\n\n[TÀI LIỆU THAM KHẢO TỪ GIÁO VIÊN]:\n${textContent}\n\n(LƯU Ý TỐI QUAN TRỌNG: Nhiệm vụ CHÍNH của bạn là TẠO RA ĐỀ THI dựa vào bảng "Thiết lập Ma trận" ở trên. Bạn CHỈ ĐƯỢC sử dụng các tài liệu tham khảo này làm ý tưởng/ngữ cảnh để soạn câu hỏi. Tuyệt đối KHÔNG được chỉ tóm tắt hay in lại tài liệu tham khảo này!)`;
        }
      } else {
        prompt += `\n\nNội dung:\n${textContent}`;
      }

      const MODELS_POOL = [model, "gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"];
      let lastError: any = null;
      const MAX_RETRIES = 3;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        for (const modelName of MODELS_POOL) {
          try {
            const response = await client.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                temperature: 0.7, // Tăng lên 0.7 để AI linh hoạt giải thích dài, tránh bị cắt cụt do lặp từ
                maxOutputTokens: 8192,
              }
            });

            if (response && response.text) {
              return res.json({ text: response.text });
            }
          } catch (err: any) {
            console.warn(`Lỗi khi gọi model ${modelName} cho xử lý Word (Lần thử ${attempt}):`, err.message || err);
            lastError = err;
            // Continue to next model if available
          }
        }
        
        // If all models failed in this attempt, wait before retrying
        if (attempt < MAX_RETRIES) {
          console.log(`Đang chờ nghiệm nghiệm lại (Lần ${attempt + 1})...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        }
      }

      throw lastError || new Error("Hệ thống AI đang quá tải. Vui lòng thử lại sau vài phút.");
    } catch (error: any) {
      console.error("API Word Convert Exception:", error);
      res.status(500).json({
        error: error.message || "Có lỗi bất ngờ xảy ra khi xử lý file Word."
      });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite dev middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode with static file assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical: Failed to start server:", err);
});
