/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Gọi API Gemini thông qua máy chủ Express proxy (/api/gemini)
 */
async function callGeminiDirect(prompt: string, modelName: string, apiKey: string, imageBase64?: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  const parts: any[] = [{ text: prompt }];
  if (imageBase64) {
    const match = imageBase64.match(/^data:(image\/[a-zA-Z]*);base64,/);
    const mimeType = match ? match[1] : "image/jpeg";
    const data = imageBase64.replace(/^data:image\/[a-zA-Z]*;base64,/, "");
    parts.push({ inlineData: { mimeType, data } });
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.7 }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Không có phản hồi từ mô hình AI.");
  }
  return text;
}

export async function callGeminiAI(prompt: string, model = 'gemini-3-pro-preview', imageBase64?: string): Promise<string> {
  const clientApiKey = localStorage.getItem('gemini_api_key');
  const preferredModel = localStorage.getItem('gemini_preferred_model') || model;

  // Build the fallback pool
  const rawPool = [
    preferredModel,
    'gemini-3-flash-preview',
    'gemini-3-pro-preview',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];
  const modelPool = Array.from(new Set(rawPool));

  let lastError: any = null;

  // Case A: User has client-side API Key - Call direct Google API
  if (clientApiKey && clientApiKey.trim()) {
    for (const modelName of modelPool) {
      try {
        const text = await callGeminiDirect(prompt, modelName, clientApiKey.trim(), imageBase64);
        return text;
      } catch (err: any) {
        console.warn(`Lỗi khi gọi model ${modelName} bằng Client API Key:`, err.message || err);
        lastError = err;
      }
    }
    // If all models failed, throw the error
    throw new Error(`Tất cả model đều thất bại. Lỗi cuối cùng: ${lastError?.message || lastError}`);
  }

  // Case B: No client-side API Key - Fallback to Express Proxy
  for (const modelName of modelPool) {
    try {
      const response = await fetch('/api/gemini', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, model: modelName, imageBase64 }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Proxy Error [HTTP ${response.status}]`);
      }

      const data = await response.json();
      if (!data.text) {
        throw new Error("Mô hình AI phản hồi rỗng.");
      }

      return data.text;
    } catch (err: any) {
      console.warn(`Lỗi khi gọi model ${modelName} qua Proxy:`, err.message || err);
      lastError = err;
    }
  }

  throw new Error(`Không thể kết nối với máy chủ AI hoặc API trực tiếp. Lỗi cuối cùng: ${lastError?.message || lastError}`);
}

/**
 * Biên soạn bộ câu hỏi Toán tự động theo phân cấu độ khó.
 */
export async function generateAITestBank(
  topicName: string,
  totalQuestions: number,
  ratios: { easy: number; medium: number; hard: number }
): Promise<any[]> {
  const prompt = `
Bạn là Chuyên gia Khảo thí và Thiết kế Đề thi môn Toán học.
Hãy biên soạn một bộ câu hỏi Toán chất lượng cao về chủ đề: "${topicName}".
Tổng số câu hỏi cần tạo: ${totalQuestions} câu.
Phân hóa câu hỏi cụ thể theo cơ cấu độ khó sau:
- Số câu [B]/[H] (Dễ): ${ratios.easy} câu
- Số câu [H]/[VD] (Trung bình): ${ratios.medium} câu
- Số câu [VD] cao (Khó): ${ratios.hard} câu

Yêu cầu định dạng định nghĩa câu hỏi:
Trả về dưới dạng cấu trúc mảng JSON thuần tuý, không bọc trong định dạng markdown \`\`\`json. Schema dạng:
[
  {
    "content": "Câu hỏi chứa LaTeX, ví dụ: Tính đạo hàm của hàm số $y = x^3 - 3x$.",
    "type": "multiple-choice",
    "options": [
      "$y' = 3x^2 - 3$",
      "$y' = x^2 - 3$",
      "$y' = 3x^2 + 3$",
      "$y' = 3x^2$"
    ],
    "correctAnswer": "A",
    "explanation": "Lời giải chi tiết: Ta có đạo hàm của $x^3$ là $3x^2$, đạo hàm của $3x$ là $3$. Do đó $y' = 3x^2 - 3$. Chọn đáp án A.",
    "difficulty": "easy" // hoặc "medium", "hard" tùy theo phân bổ tương ứng
  }
]

Đoán chắc rằng toàn bộ công thức toán đều được bọc trong cặp dấu $...$ đúng cú pháp để MathJax 3 hiển thị chuẩn xác. Các đáp án trắc nghiệm A, B, C, D tương ứng với thứ tự của list options (A là phần tử index 0, B-1, C-2, D-3).
`;

  const result = await callGeminiAI(prompt);
  if (!result) return [];

  // Robustly extract JSON block
  try {
    let cleanJson = result.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```json/i, "").replace(/```$/, "").trim();
    }
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error("Lỗi phân tích JSON câu hỏi từ Gemini:", err, result);
    // Secondary regex attempt
    try {
      const match = result.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (nestedErr) {
      console.error("Thử nghiệm regex JSON thất bại:", nestedErr);
    }
    throw new Error("Dữ liệu trả về từ AI không đúng định dạng JSON. Vui lòng bấm thử lại.");
  }
}

/**
 * Thiết lập kế hoạch lộ trình cá nhân hóa dựa trên học lực hiện tại.
 */
export async function getAIRecommendations(
  studentName: string,
  weakTopics: string[],
  averageScore: number,
  recentAttemptsCount: number
): Promise<string> {
  const prompt = `
Bạn là Trợ lý Giáo dục Toán học AI cá nhân hóa.
Hãy tạo một lộ trình ôn tập và lời khuyên phát triển năng lực toán học cho học sinh sau:
- Tên học sinh: ${studentName}
- Điểm trung bình hiện tại: ${averageScore.toFixed(1)}/10
- Chủ đề còn yếu: ${weakTopics.join(', ') || 'Chưa ghi nhận (học lực tốt/đồng đều)'}
- Số bài kiểm tra gần đây: ${recentAttemptsCount} bài.

Yêu cầu nội dung phản hồi:
1. Đưa ra đánh giá tổng quan, khích lệ thái độ học tập và chỉ rõ ưu nhược điểm.
2. Thiết lập lộ trình ôn tập cụ thể trong 2-4 tuần tới, hướng dẫn khắc phục các chủ đề còn yếu.
3. Cung cấp 2 ví dụ bài tập Toán tiêu biểu kèm LaTeX minh họa cho chủ đề yếu giúp học sinh tự rèn luyện.
4. Trình bày bằng markdown gọn gàng, có tiêu đề, gạch đầu dòng và công thức toán bằng dấu $...$ rõ ràng để học sinh hứng thú học tập.
`;

  return await callGeminiAI(prompt);
}
