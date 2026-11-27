/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GeminiCallMetaResult {
  text: string;
  isFallback: boolean;
  activeModel: string;
  errorReason?: string;
}

export function parseApiKeys(raw?: string | null): string[] {
  if (!raw || typeof raw !== 'string') return [];
  const parts = raw
    .split(/[\r\n,;]+/)
    .map(k => k.trim())
    .filter(k => k.length >= 10);
  return Array.from(new Set(parts));
}

async function discoverAvailableGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    if (!resp.ok) return [];
    const data = await resp.json();
    const models: string[] = (data.models || [])
      .filter((m: any) =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent') &&
        typeof m.name === 'string' &&
        m.name.includes('gemini') &&
        !/embedding|imagen|veo|tts|aqa|robotics|computer-use|audio|live/i.test(m.name)
      )
      .map((m: any) => m.name.replace(/^models\//, ''));
    models.sort((a, b) => {
      const aFlash = /flash/i.test(a) ? 0 : 1;
      const bFlash = /flash/i.test(b) ? 0 : 1;
      if (aFlash !== bFlash) return aFlash - bFlash;
      return b.localeCompare(a, undefined, { numeric: true });
    });
    return models;
  } catch {
    return [];
  }
}

const VALID_MODELS = [
  'auto',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3-pro-preview',
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
];

const PRIORITIZED_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
];

function isNonRetryableClientError(status: number, message: string): boolean {
  const m = message.toLowerCase();
  if (status === 400 || status === 401 || status === 403) return true;
  return (
    m.includes('api_key_invalid') ||
    m.includes('api key not valid') ||
    m.includes('permission_denied') ||
    m.includes('unauthenticated')
  );
}

/**
 * Gọi trực tiếp Google Gemini API qua REST Client (chỉ dùng khi không có backend proxy, ví dụ static deploy)
 */
async function callGeminiDirect(
  prompt: string,
  modelName: string,
  apiKey: string,
  imageBase64?: string
): Promise<string> {
  const isAlpha = modelName.includes('3-') || modelName.includes('preview');
  const apiVer = isAlpha ? 'v1alpha' : 'v1beta';
  const url = `https://generativelanguage.googleapis.com/${apiVer}/models/${modelName}:generateContent?key=${apiKey}`;

  const parts: any[] = [{ text: prompt }];
  if (imageBase64) {
    const match = imageBase64.match(/^data:([a-zA-Z0-9\/\-+.]+);base64,/);
    const mimeType = match ? match[1] : "image/jpeg";
    const data = imageBase64.replace(/^data:[a-zA-Z0-9\/\-+.]+;base64,/, "");
    parts.push({ inlineData: { mimeType, data } });
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.7 },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
    const err: any = new Error(errorMessage);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Không có phản hồi từ mô hình AI.");
  }
  return text;
}

export function generateLocalFallback(prompt: string): string {
  const p = (prompt || '').toLowerCase();
  if (p.includes('dạng cấu trúc mảng json') || p.includes('bộ câu hỏi') || p.includes('multiple-choice')) {
    return JSON.stringify([
      {
        "content": "Cho hàm số $y = x^3 - 3x + 2$. Điểm cực tiểu của đồ thị hàm số có tọa độ là:",
        "type": "multiple-choice",
        "options": ["$(1; 0)$", "$(-1; 4)$", "$(0; 2)$", "$(2; 4)$"],
        "correctAnswer": "A",
        "explanation": "Ta có $y' = 3x^2 - 3 = 0 \\Leftrightarrow x = \\pm 1$. Qua điểm $x = 1$, đạo hàm $y'$ đổi dấu từ âm sang dương nên $x = 1$ là điểm cực tiểu, $y(1) = 0$. Tọa độ điểm cực tiểu là $(1; 0)$.",
        "difficulty": "easy"
      },
      {
        "content": "Tìm tập xác định của hàm số $y = \\sqrt{x - 2} + \\frac{1}{x - 5}$:",
        "type": "multiple-choice",
        "options": ["$[2; +\\infty) \\setminus \\{5\\}$", "$(2; +\\infty)$", "$[2; 5)$", "$(5; +\\infty)$"],
        "correctAnswer": "A",
        "explanation": "Điều kiện xác định: $\\begin{cases} x - 2 \\ge 0 \\\\ x - 5 \\ne 0 \\end{cases} \\Leftrightarrow \\begin{cases} x \\ge 2 \\\\ x \\ne 5 \\end{cases}$. Tập xác định: $D = [2; +\\infty) \\setminus \\{5\\}$.",
        "difficulty": "easy"
      },
      {
        "content": "Giá trị lớn nhất của hàm số $f(x) = x^4 - 2x^2 + 3$ trên đoạn $[0; 2]$ bằng:",
        "type": "multiple-choice",
        "options": ["$11$", "$3$", "$2$", "$15$"],
        "correctAnswer": "A",
        "explanation": "Ta có $f'(x) = 4x^3 - 4x = 0 \\Leftrightarrow 4x(x^2 - 1) = 0 \\Leftrightarrow x = 0, x = 1$ (do xét trên $[0; 2]$). Ta tính: $f(0) = 3$, $f(1) = 2$, $f(2) = 11$. Vậy $\\max_{[0; 2]} f(x) = 11$.",
        "difficulty": "medium"
      },
      {
        "content": "Cho hình lăng trụ đứng $ABC.A'B'C'$ có đáy $ABC$ là tam giác vuông cân tại $B$, $AB = a$, $AA' = a\\sqrt{2}$. Thể tích khối lăng trụ bằng:",
        "type": "multiple-choice",
        "options": ["$\\frac{a^3\\sqrt{2}}{2}$", "$\\frac{a^3\\sqrt{2}}{6}$", "$a^3\\sqrt{2}$", "$\\frac{a^3}{2}$"],
        "correctAnswer": "A",
        "explanation": "Diện tích đáy $S_{\\Delta ABC} = \\frac{1}{2}AB \\cdot BC = \\frac{a^2}{2}$. Thể tích lăng trụ $V = S \\cdot h = \\frac{a^2}{2} \\cdot a\\sqrt{2} = \\frac{a^3\\sqrt{2}}{2}$.",
        "difficulty": "medium"
      },
      {
        "content": "Trong không gian $Oxyz$, cho mặt cầu $(S): (x-1)^2 + (y+2)^2 + (z-3)^2 = 25$. Bán kính của mặt cầu $(S)$ là:",
        "type": "multiple-choice",
        "options": ["$5$", "$25$", "$\\sqrt{5}$", "$10$"],
        "correctAnswer": "A",
        "explanation": "Phương trình mặt cầu có dạng $(x-a)^2 + (y-b)^2 + (z-c)^2 = R^2 \\Rightarrow R = \\sqrt{25} = 5$.",
        "difficulty": "easy"
      }
    ], null, 2);
  }

  return `# Nội Dung Đã Chuẩn Hóa GDPT 2018

Hệ thống đã tự động kích hoạt bộ xử lý dự phòng thông minh với công thức Toán chuẩn LaTeX:
- Hàm số: $y = f(x) = ax^3 + bx^2 + cx + d$
- Đạo hàm: $y' = 3ax^2 + 2bx + c$
- Tích phân: $\\int_a^b f(x) dx$
- Vectơ trong không gian: $\\vec{u} = (x; y; z)$`;
}

export function notifyFallbackIfNeeded(result: { isFallback?: boolean; activeModel?: string; errorReason?: string }) {
  if (result.isFallback && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('ai_fallback_triggered', {
        detail: {
          activeModel: result.activeModel || 'Gemini-Auto-Fallback',
          errorReason: result.errorReason || 'Kết nối AI bị gián đoạn hoặc hết hạn mức.',
        },
      })
    );
  }
}

/**
 * Gọi Gemini AI qua Backend Proxy (1 lần, không lặp 2 tầng),
 * chỉ fallback sang gọi trực tiếp nếu backend proxy không tồn tại (404/network),
 * và trả về đầy đủ metadata để UI cảnh báo nếu rơi vào Fallback.
 */
export async function callGeminiAIWithMeta(
  prompt: string,
  model = 'auto',
  imageBase64?: string
): Promise<GeminiCallMetaResult> {
  const clientApiKey = localStorage.getItem('gemini_api_key')?.trim() || '';
  let preferredModel = localStorage.getItem('gemini_preferred_model') || model;

  if (!VALID_MODELS.includes(preferredModel)) {
    preferredModel = 'auto';
    localStorage.setItem('gemini_preferred_model', preferredModel);
  }

  let lastErrorReason = '';
  let proxyUnavailable = false;

  // Lớp 1: Gọi qua Express Backend Proxy (backend đã quản lý MODELS_POOL, cache model & fail-fast)
  try {
    const response = await fetch('/api/gemini', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        model: preferredModel,
        imageBase64,
        apiKey: clientApiKey || undefined,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.text && data.text.trim()) {
        const result: GeminiCallMetaResult = {
          text: data.text,
          isFallback: Boolean(data.isFallback),
          activeModel: data.activeModel || preferredModel,
          errorReason: data.errorReason,
        };
        notifyFallbackIfNeeded(result);
        return result;
      }
    } else if (response.status === 404 || response.status === 405) {
      proxyUnavailable = true;
    } else {
      const errData = await response.json().catch(() => ({}));
      lastErrorReason = errData.error || `HTTP ${response.status}`;
    }
  } catch (err: any) {
    proxyUnavailable = true;
    lastErrorReason = err?.message || 'Không kết nối được tới máy chủ proxy.';
  }

  // Lớp 2: Chỉ gọi trực tiếp Google REST API nếu chạy static SPA (không có Express proxy) và có Client Key
  const apiKeys = parseApiKeys(clientApiKey);
  if (proxyUnavailable && apiKeys.length > 0) {
    const rawPool = preferredModel === 'auto' ? PRIORITIZED_MODELS : [preferredModel, ...PRIORITIZED_MODELS];
    const modelPool = Array.from(new Set(rawPool));

    for (const currentKey of apiKeys) {
      let keyInvalid = false;
      for (const modelName of modelPool) {
        try {
          const text = await callGeminiDirect(prompt, modelName, currentKey, imageBase64);
          if (text && text.trim()) {
            return { text, isFallback: false, activeModel: modelName };
          }
        } catch (err: any) {
          lastErrorReason = err?.message || String(err);
          if (isNonRetryableClientError(err?.status || 0, lastErrorReason)) {
            keyInvalid = true;
            break;
          }
        }
      }

      if (!keyInvalid) {
        const liveModels = await discoverAvailableGeminiModels(currentKey);
        const fallbackPool = liveModels.filter(m => !modelPool.includes(m)).slice(0, 5);
        for (const modelName of fallbackPool) {
          try {
            const text = await callGeminiDirect(prompt, modelName, currentKey, imageBase64);
            if (text && text.trim()) {
              return { text, isFallback: false, activeModel: modelName };
            }
          } catch (err: any) {
            lastErrorReason = err?.message || String(err);
          }
        }
      }
    }
  }

  // Lớp 3: Fallback nội dung mẫu + phát sự kiện cảnh báo rõ trên UI
  const fallbackResult: GeminiCallMetaResult = {
    text: generateLocalFallback(prompt),
    isFallback: true,
    activeModel: 'Gemini-Auto-Fallback',
    errorReason: lastErrorReason || 'Không thể kết nối tới Gemini API.',
  };
  notifyFallbackIfNeeded(fallbackResult);
  return fallbackResult;
}

/**
 * Hàm gọi AI Gemini tương thích ngược, tự động phát cảnh báo UI nếu kích hoạt Fallback
 */
export async function callGeminiAI(prompt: string, model = 'auto', imageBase64?: string): Promise<string> {
  const res = await callGeminiAIWithMeta(prompt, model, imageBase64);
  return res.text;
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
    "difficulty": "easy"
  }
]

Đoán chắc rằng toàn bộ công thức toán đều được bọc trong cặp dấu $...$ đúng cú pháp để MathJax hiển thị chuẩn xác. Các đáp án trắc nghiệm A, B, C, D tương ứng với thứ tự của list options (A là phần tử index 0, B-1, C-2, D-3).
`;

  const result = await callGeminiAI(prompt);
  if (!result) return [];

  try {
    let cleanJson = result.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```json/i, "").replace(/```$/, "").trim();
    }
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error("Lỗi phân tích JSON câu hỏi từ Gemini:", err, result);
    try {
      const match = result.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (nestedErr) {
      console.warn("Thử nghiệm regex JSON thất bại, trả về danh sách câu hỏi dự phòng:", nestedErr);
    }
    return JSON.parse(generateLocalFallback('dạng cấu trúc mảng json'));
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
