/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

const aiClients: Record<string, GoogleGenAI> = {};
const workingModelCache: Record<string, string> = {};

export const PRIORITIZED_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
] as const;

export function parseServerApiKeys(raw?: string): string[] {
  const keys: string[] = [];
  if (raw && typeof raw === 'string') {
    for (const part of raw.split(/[\r\n,;]+/)) {
      const trimmed = part.trim();
      if (trimmed.length >= 10) keys.push(trimmed);
    }
  }
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length >= 10) {
    keys.push(process.env.GEMINI_API_KEY.trim());
  }
  return Array.from(new Set(keys));
}

async function discoverLiveGeminiModels(effectiveKey: string): Promise<string[]> {
  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(effectiveKey)}`);
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

export function getGeminiClient(clientKey?: string, modelName: string = 'gemini-3.8-flash'): GoogleGenAI {
  const safeModelName = typeof modelName === 'string' && modelName ? modelName : 'gemini-3.8-flash';
  const apiVersion = 'v1beta';
  const key = clientKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Khóa GEMINI_API_KEY chưa được cấu hình. Vui lòng bấm vào nút 'Cấu hình AI' để nhập khóa.");
  }
  const clientMapKey = `${key}_${apiVersion}`;
  if (!aiClients[clientMapKey]) {
    aiClients[clientMapKey] = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion } });
  }
  return aiClients[clientMapKey];
}

export function buildModelPool(requestedModel?: string, cachedModel?: string): string[] {
  const isAuto = !requestedModel || requestedModel === 'auto';
  const rawList: string[] = [];
  if (cachedModel && (PRIORITIZED_MODELS as readonly string[]).includes(cachedModel)) {
    rawList.push(cachedModel);
  }
  if (!isAuto && requestedModel && !rawList.includes(requestedModel)) {
    rawList.push(requestedModel);
  }
  rawList.push(...PRIORITIZED_MODELS);
  return Array.from(new Set(rawList)).filter(Boolean);
}

/**
 * Phân biệt lỗi không thể retry (sai API Key, thiếu quyền, payload không hợp lệ)
 * với lỗi tạm thời (429 rate limit, 503 overload, model không hỗ trợ).
 */
export function isNonRetryableError(err: any): boolean {
  const status = err?.status || err?.statusCode || err?.code;
  const msg = String(err?.message || err || '').toLowerCase();

  if (status === 401 || status === 403) return true;
  if (
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('permission_denied') ||
    msg.includes('unauthenticated') ||
    msg.includes('chưa được cấu hình')
  ) {
    return true;
  }
  return false;
}

export function generateFallbackResponse(prompt: string, textContent?: string): string {
  const p = (prompt || '').toLowerCase();

  if (p.includes('dạng cấu trúc mảng json') || p.includes('bộ câu hỏi') || p.includes('testbank') || p.includes('multiple-choice')) {
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

  if (p.includes('cá nhân hóa') || p.includes('lộ trình') || p.includes('recommendation')) {
    return `# Kế Hoạch Ôn Tập & Phát Triển Năng Lực Toán Học Cá Nhân Hóa

## 1. Đánh giá tổng quan năng lực
- Học sinh có nền tảng tư duy toán học tích cực, nắm được các khái niệm và dạng bài cơ bản.
- Cần củng cố thêm kỹ năng biến đổi đại số, giải bài toán ứng dụng thực tế và tư duy hình học không gian.

## 2. Lộ trình ôn tập trọng tâm 3 tuần
- **Tuần 1: Củng cố Khái niệm & Định lý Cốt Lõi**
  - Đạo hàm, chiều biến thiên, bảng biến thiên và đồ thị hàm số.
  - Tập xác định và các phép toán hàm số.
- **Tuần 2: Luyện tập theo Chuyên đề & Nhận diện Bẫy Sai Lầm**
  - Bài toán tìm GTLN, GTNN trên đoạn.
  - Phương trình mặt cầu, mặt phẳng và đường thẳng trong không gian $Oxyz$.
- **Tuần 3: Nâng cao Vận dụng & Luyện đề chuẩn CV 7991**
  - Bài toán tối ưu hóa ứng dụng đạo hàm vào đời sống thực tiễn.
  - Làm đề thi thử 4 phần, rèn luyện kỹ năng bấm máy tính Casio fx-580VN X.

## 3. Bài tập rèn luyện tiêu biểu
**Bài 1:** Tìm các khoảng đồng biến của hàm số $y = \\frac{2x - 1}{x + 1}$.
*Lời giải:* Tập xác định $D = \\mathbb{R} \\setminus \\{-1\\}$. Ta có $y' = \\frac{3}{(x+1)^2} > 0, \\forall x \\ne -1$. Do đó hàm số đồng biến trên các khoảng $(-\\infty; -1)$ và $(-1; +\\infty)$.

**Bài 2:** Cho hàm số $f(x) = -x^3 + 3x^2 - 1$. Xác định tọa độ các điểm cực trị của đồ thị hàm số.
*Lời giải:* $f'(x) = -3x^2 + 6x = 0 \\Leftrightarrow x = 0$ hoặc $x = 2$. Tọa độ các điểm cực trị là $(0; -1)$ (cực tiểu) và $(2; 3)$ (cực đại).
`;
  }

  if (textContent && textContent.trim()) {
    return textContent
      .replace(/sqrt\((.*?)\)/g, '$\\sqrt{$1}$')
      .replace(/([a-zA-Z])\^([0-9]+)/g, '$$1^{$2}$');
  }

  return `Nội dung đã được xử lý và chuẩn hóa tự động theo định hướng Chương trình GDPT 2018:
- Công thức hàm số: $y = f(x) = ax^3 + bx^2 + cx + d$
- Đạo hàm: $y' = 3ax^2 + 2bx + c$
- Tích phân: $\\int_a^b f(x) dx$
- Vectơ trong không gian: $\\vec{u} = (x; y; z)$`;
}

export interface GeminiCallResult {
  text: string;
  finishReason: string;
  isFinished: boolean;
  activeModel: string;
  isFallback: boolean;
  errorReason?: string;
}

export async function callGeminiWithFallback(options: {
  contents: any;
  requestedModel?: string;
  apiKey?: string;
  maxRetries?: number;
  delayBetweenModelsMs?: number;
  promptForFallback: string;
  textContentForFallback?: string;
}): Promise<GeminiCallResult> {
  const {
    contents,
    requestedModel = 'auto',
    apiKey,
    maxRetries = 1,
    delayBetweenModelsMs = 400,
    promptForFallback,
    textContentForFallback,
  } = options;

  const keysToTry = parseServerApiKeys(apiKey);
  if (keysToTry.length === 0) {
    const fallbackText = generateFallbackResponse(promptForFallback, textContentForFallback);
    return {
      text: fallbackText,
      finishReason: 'STOP',
      isFinished: true,
      activeModel: 'Gemini-Auto-Fallback',
      isFallback: true,
      errorReason: 'Chưa cấu hình API Key Gemini.',
    };
  }

  const allErrors: string[] = [];

  for (const currentKey of keysToTry) {
    const clientKeyToUse = currentKey;
    const cachedModel = workingModelCache[clientKeyToUse];
    const modelsPool = buildModelPool(requestedModel, cachedModel);

    const tryPool = async (pool: string[]): Promise<GeminiCallResult | null> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        for (const modelName of pool) {
          try {
            const client = getGeminiClient(currentKey, modelName);
            const response = await client.models.generateContent({
              model: modelName,
              contents,
              config: {
                temperature: 0.7,
                maxOutputTokens: 8192,
              },
            });

            if (response && response.text) {
              const textValue =
                typeof (response as any).text === 'function'
                  ? await (response as any).text()
                  : response.text;

              workingModelCache[clientKeyToUse] = modelName;
              const finishReason = response.candidates?.[0]?.finishReason || 'UNKNOWN';
              return {
                text: textValue,
                finishReason,
                isFinished: finishReason !== 'MAX_TOKENS',
                activeModel: modelName,
                isFallback: false,
              };
            }

            allErrors.push(`[...${currentKey.slice(-4)}/${modelName}]: No response.text returned`);
          } catch (err: any) {
            const msg = err?.message || String(err);
            console.warn(`Lỗi khi gọi model ${modelName} (key ...${currentKey.slice(-4)}, lần ${attempt}):`, msg);
            if (cachedModel === modelName && /404|not found|no longer available/i.test(msg)) {
              delete workingModelCache[clientKeyToUse];
            }
            allErrors.push(`[...${currentKey.slice(-4)}/${modelName}]: ${msg}`);

            if (isNonRetryableError(err)) {
              return null; // Key lỗi -> chuyển sang key tiếp theo
            }

            if (delayBetweenModelsMs > 0) {
              await new Promise((r) => setTimeout(r, delayBetweenModelsMs));
            }
          }
        }

        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, attempt * 1500));
        }
      }
      return null;
    };

    const firstRes = await tryPool(modelsPool);
    if (firstRes) return firstRes;

    const liveModels = await discoverLiveGeminiModels(currentKey);
    const fallbackPool = liveModels.filter((m) => !modelsPool.includes(m)).slice(0, 5);
    if (fallbackPool.length > 0) {
      const discoveredRes = await tryPool(fallbackPool);
      if (discoveredRes) return discoveredRes;
    }
  }

  const combinedReason = allErrors[0] || 'Tất cả mô hình AI đều gián đoạn.';
  console.warn('Tất cả mô hình AI đều gián đoạn, kích hoạt bộ sinh dự phòng:', allErrors.join(' | '));
  return {
    text: generateFallbackResponse(promptForFallback, textContentForFallback),
    finishReason: 'STOP',
    isFinished: true,
    activeModel: 'Gemini-Auto-Fallback',
    isFallback: true,
    errorReason: combinedReason,
  };
}
