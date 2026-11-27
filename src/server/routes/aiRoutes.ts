/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { buildDocumentPrompt } from "../prompts";
import { callGeminiWithFallback, generateFallbackResponse } from "../geminiService";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB mỗi file
    files: 20,
  },
});

function toBoolean(val: any): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
  return false;
}

export function createAiRouter(): express.Router {
  const router = express.Router();

  // API endpoint proxy to call Gemini
  router.post("/gemini", async (req, res) => {
    try {
      const { prompt, model = "auto", apiKey, imageBase64, textContent } = req.body;
      if (!prompt && !imageBase64) {
        return res.status(400).json({ error: "Vui lòng truyền dữ liệu đầu vào." });
      }

      let contents: any = prompt;
      if (imageBase64) {
        const match = imageBase64.match(/^data:([^;]+);base64,/);
        const mimeType = match ? match[1] : "image/jpeg";
        const data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
        contents = [
          { text: prompt || "Phân tích hình ảnh này:" },
          { inlineData: { mimeType, data } },
        ];
      }

      const result = await callGeminiWithFallback({
        contents,
        requestedModel: model,
        apiKey,
        maxRetries: 1,
        delayBetweenModelsMs: 400,
        promptForFallback: prompt || '',
        textContentForFallback: textContent,
      });

      return res.json(result);
    } catch (error: any) {
      console.error("API Gemini Proxy Exception (Đã kích hoạt Fallback):", error);
      const fallbackText = generateFallbackResponse(req.body?.prompt || '', req.body?.textContent);
      return res.json({
        text: fallbackText,
        finishReason: 'STOP',
        isFinished: true,
        activeModel: 'Gemini-Auto-Fallback',
        isFallback: true,
        errorReason: error?.message || 'Lỗi máy chủ proxy Gemini.',
      });
    }
  });

  // API endpoint tạo hình ảnh giáo dục sư phạm (Google Imagen 3 + Pollinations Flux Fallback)
  router.post("/generate-image", async (req, res) => {
    try {
      const { prompt, apiKey, aspectRatio = "1:1" } = req.body;
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: "Vui lòng nhập mô tả hoặc yêu cầu tạo hình ảnh." });
      }

      const key = apiKey || process.env.GEMINI_API_KEY;
      const validAspectRatios = ["1:1", "16:9", "4:3", "3:4", "9:16"];
      const targetAspect = validAspectRatios.includes(aspectRatio) ? aspectRatio : "1:1";

      if (key && key.trim()) {
        try {
          const client = new GoogleGenAI({ apiKey: key.trim(), httpOptions: { apiVersion: 'v1beta' } });
          const imagenResponse = await client.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: prompt.trim(),
            config: {
              numberOfImages: 1,
              aspectRatio: targetAspect as any,
              outputMimeType: 'image/jpeg',
            },
          });

          const imageBytes = imagenResponse?.generatedImages?.[0]?.image?.imageBytes;
          if (imageBytes) {
            return res.json({
              success: true,
              engine: 'google-imagen-3',
              imageUrl: `data:image/jpeg;base64,${imageBytes}`,
              prompt: prompt.trim(),
            });
          }
        } catch (imgErr: any) {
          console.warn("Imagen 3 không khả dụng trên API Key này, chuyển sang Fallback Engine:", imgErr.message || imgErr);
        }
      }

      let width = 1024;
      let height = 1024;
      if (targetAspect === "16:9") {
        width = 1280;
        height = 720;
      } else if (targetAspect === "4:3") {
        width = 1024;
        height = 768;
      } else if (targetAspect === "3:4") {
        width = 768;
        height = 1024;
      }

      const seed = Math.floor(Math.random() * 10000000);
      const encodedPrompt = encodeURIComponent(prompt.trim());
      const fallbackUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&seed=${seed}&width=${width}&height=${height}&model=flux&enhance=true`;

      return res.json({
        success: true,
        engine: 'pollinations-flux',
        imageUrl: fallbackUrl,
        prompt: prompt.trim(),
      });
    } catch (error: any) {
      console.error("Lỗi khi tạo ảnh giáo dục:", error);
      return res.status(500).json({ error: error.message || "Không thể tạo hình ảnh lúc này." });
    }
  });

  // File (PDF/Image) to DOCX/Markdown Convert Proxy (hỗ trợ cả multipart/form-data và JSON base64)
  router.post("/convert-pdf", upload.array("files", 20), async (req, res) => {
    try {
      const uploadedFiles = (req.files as Express.Multer.File[] | undefined) || [];
      const {
        pdfBase64,
        mimeType = "application/pdf",
        files,
        parsingMode = "normal",
        customPrompt = "",
        model = "auto",
        apiKey,
        includeShortSolution = false,
        examCount = 1,
        contextSuggestion = "",
        matrixConfig = "[]",
        continueFromText = "",
        textContent = "",
        subject = "",
        grade = "",
        lesson = "",
        keepOriginalDiagrams = false,
        answerFormat = "table",
      } = req.body;

      let targetFiles: Array<{ base64: string; mimeType: string }> = [];

      if (uploadedFiles.length > 0) {
        targetFiles = uploadedFiles.map((f) => ({
          base64: f.buffer.toString("base64"),
          mimeType: f.mimetype || (f.originalname.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
        }));
      } else if (Array.isArray(files) && files.length > 0) {
        targetFiles = files;
      } else if (pdfBase64) {
        targetFiles = [{ base64: pdfBase64, mimeType }];
      }

      if (targetFiles.length === 0) {
        return res.status(400).json({ error: "Không tìm thấy dữ liệu file." });
      }

      const prompt = buildDocumentPrompt({
        sourceType: "pdf",
        parsingMode,
        customPrompt,
        includeShortSolution: toBoolean(includeShortSolution),
        examCount: Number(examCount) || 1,
        contextSuggestion,
        matrixConfig,
        continueFromText,
        textContent,
        subject,
        grade,
        lesson,
        keepOriginalDiagrams: toBoolean(keepOriginalDiagrams),
        answerFormat,
      });

      const contentsArray: any[] = [prompt];
      for (const file of targetFiles) {
        contentsArray.push({
          inlineData: {
            data: file.base64,
            mimeType: file.mimeType,
          },
        });
      }

      const result = await callGeminiWithFallback({
        contents: contentsArray,
        requestedModel: model,
        apiKey,
        maxRetries: 2,
        delayBetweenModelsMs: 400,
        promptForFallback: prompt,
        textContentForFallback: textContent || "Nội dung tài liệu đã được bóc tách.",
      });

      return res.json(result);
    } catch (error: any) {
      console.error("API File Convert Exception (Fallback kích hoạt):", error);
      const fallbackText = generateFallbackResponse(
        req.body?.prompt || '',
        req.body?.textContent || "Nội dung tài liệu đã được bóc tách."
      );
      return res.json({
        text: fallbackText,
        finishReason: 'STOP',
        isFinished: true,
        activeModel: 'Gemini-Auto-Fallback',
        isFallback: true,
        errorReason: error?.message || 'Lỗi chuyển đổi tài liệu.',
      });
    }
  });

  // Word (Text+MathML) to Markdown+LaTeX Convert Proxy
  router.post("/convert-word", async (req, res) => {
    try {
      const {
        textContent,
        parsingMode = "normal",
        model = "auto",
        apiKey,
        includeShortSolution = false,
        examCount = 1,
        contextSuggestion = "",
        matrixConfig = "[]",
        continueFromText = "",
        subject = "",
        grade = "",
        lesson = "",
        keepOriginalDiagrams = false,
        answerFormat = "table",
      } = req.body;

      if (!textContent && parsingMode !== "matrix_exam") {
        return res.status(400).json({ error: "Không tìm thấy dữ liệu văn bản." });
      }

      const prompt = buildDocumentPrompt({
        sourceType: "word",
        parsingMode,
        includeShortSolution: toBoolean(includeShortSolution),
        examCount: Number(examCount) || 1,
        contextSuggestion,
        matrixConfig,
        continueFromText,
        textContent,
        subject,
        grade,
        lesson,
        keepOriginalDiagrams: toBoolean(keepOriginalDiagrams),
        answerFormat,
      });

      const result = await callGeminiWithFallback({
        contents: prompt,
        requestedModel: model,
        apiKey,
        maxRetries: 2,
        delayBetweenModelsMs: 400,
        promptForFallback: prompt,
        textContentForFallback: textContent,
      });

      return res.json(result);
    } catch (error: any) {
      console.error("API Word Convert Exception (Fallback kích hoạt):", error);
      const fallbackText = generateFallbackResponse(req.body?.prompt || '', req.body?.textContent);
      return res.json({
        text: fallbackText,
        finishReason: 'STOP',
        isFinished: true,
        activeModel: 'Gemini-Auto-Fallback',
        isFallback: true,
        errorReason: error?.message || 'Lỗi chuyển đổi Word.',
      });
    }
  });

  return router;
}
