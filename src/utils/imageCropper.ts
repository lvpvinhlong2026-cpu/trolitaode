/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { addDpiToBlob, insertDpiIntoPng } from './bbtEngine';

/**
 * Tự động cắt sát theo bao hình (Bounding Box) với lề đệm ~24px
 * Loại bỏ toàn bộ khoảng trống viền trắng/trong suốt thừa, giúp ảnh khi dán (Ctrl+V) vào Word
 * sẽ tự động dàn đều trang giấy, to lớn, đậm nét và sắc sảo.
 */
export function cropCanvasToBoundingBox(
  sourceCanvas: HTMLCanvasElement,
  padding: number = 24
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  if (width === 0 || height === 0) {
    return sourceCanvas;
  }

  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return sourceCanvas;

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(0, 0, width, height);
  } catch (e) {
    console.warn('Không thể đọc pixel từ canvas (có thể do taint CORS):', e);
    return sourceCanvas;
  }

  const data = imgData.data;

  // Lấy màu mẫu từ 4 góc để xác định màu nền (nền trắng hoặc nền trong suốt)
  const getPixel = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    return {
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2],
      a: data[idx + 3]
    };
  };

  const corners = [
    getPixel(0, 0),
    getPixel(width - 1, 0),
    getPixel(0, height - 1),
    getPixel(width - 1, height - 1)
  ];

  const transparentCorners = corners.filter(c => c.a < 25).length;
  const isTransparentBg = transparentCorners >= 2;

  let bgR = 255;
  let bgG = 255;
  let bgB = 255;

  if (!isTransparentBg) {
    const solidCorners = corners.filter(c => c.a >= 25);
    if (solidCorners.length > 0) {
      bgR = solidCorners.reduce((sum, c) => sum + c.r, 0) / solidCorners.length;
      bgG = solidCorners.reduce((sum, c) => sum + c.g, 0) / solidCorners.length;
      bgB = solidCorners.reduce((sum, c) => sum + c.b, 0) / solidCorners.length;
    }
  }

  // Quét tìm biên giới hạn bao quanh hình vẽ thực tế
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      let isContent = false;
      if (isTransparentBg) {
        if (a > 25) {
          isContent = true;
        }
      } else {
        if (a < 25) {
          isContent = false;
        } else {
          // So sánh độ lệch màu so với màu nền
          const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
          if (diff > 25) {
            isContent = true;
          }
        }
      }

      if (isContent) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Nếu không tìm thấy nội dung hoặc nội dung phủ kín toàn màn hình
  if (maxX < minX || maxY < minY) {
    return sourceCanvas;
  }

  // Thêm lề đệm ~24px quanh nội dung
  const x0 = Math.max(0, minX - padding);
  const y0 = Math.max(0, minY - padding);
  const x1 = Math.min(width, maxX + padding);
  const y1 = Math.min(height, maxY + padding);
  const cropW = Math.max(1, x1 - x0);
  const cropH = Math.max(1, y1 - y0);

  // Tạo canvas mới với kích thước đã cắt sát
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropW;
  croppedCanvas.height = cropH;

  const croppedCtx = croppedCanvas.getContext('2d');
  if (!croppedCtx) return sourceCanvas;

  if (!isTransparentBg) {
    croppedCtx.fillStyle = `rgb(${Math.round(bgR)}, ${Math.round(bgG)}, ${Math.round(bgB)})`;
    croppedCtx.fillRect(0, 0, cropW, cropH);
  }

  croppedCtx.drawImage(sourceCanvas, x0, y0, cropW, cropH, 0, 0, cropW, cropH);
  return croppedCanvas;
}

/**
 * Cắt sát theo bao hình từ DataURL (base64 image)
 */
export async function cropDataUrlToBoundingBox(
  dataUrl: string,
  padding: number = 24
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(dataUrl);
      }
      ctx.drawImage(img, 0, 0);
      const cropped = cropCanvasToBoundingBox(canvas, padding);
      resolve(cropped.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Tự động cắt sát hình (padding ~24px), nhúng chuẩn 300 DPI và sao chép vào Clipboard
 * Đảm bảo khi dán (Ctrl+V) vào Word hình vẽ sẽ to lớn, chiếm trọn trang giấy và không bị lề trắng rộng
 */
export async function copyCroppedImageToClipboard(
  source: HTMLCanvasElement | string,
  dpi: number = 300,
  padding: number = 24
): Promise<boolean> {
  try {
    let canvas: HTMLCanvasElement;
    if (typeof source === 'string') {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = 'anonymous';
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = source;
      });
      canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0);
    } else {
      canvas = source;
    }

    const croppedCanvas = cropCanvasToBoundingBox(canvas, padding);
    const rawBlob = await new Promise<Blob | null>((resolve) =>
      croppedCanvas.toBlob(resolve, 'image/png')
    );
    if (!rawBlob) return false;

    const blobWithDpi = await addDpiToBlob(rawBlob, dpi);
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blobWithDpi })
    ]);
    return true;
  } catch (err) {
    console.warn('Lỗi copy ảnh vào Clipboard:', err);
    return false;
  }
}

/**
 * Tự động cắt sát hình (padding ~24px), nhúng 300 DPI và tải file PNG
 */
export async function downloadCroppedImage(
  source: HTMLCanvasElement | string,
  filename: string,
  dpi: number = 300,
  padding: number = 24
): Promise<void> {
  try {
    let canvas: HTMLCanvasElement;
    if (typeof source === 'string') {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = 'anonymous';
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = source;
      });
      canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0);
    } else {
      canvas = source;
    }

    const croppedCanvas = cropCanvasToBoundingBox(canvas, padding);
    const rawBlob = await new Promise<Blob | null>((resolve) =>
      croppedCanvas.toBlob(resolve, 'image/png')
    );
    if (!rawBlob) return;

    const blobWithDpi = await addDpiToBlob(rawBlob, dpi);
    const url = URL.createObjectURL(blobWithDpi);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.warn('Lỗi tải ảnh:', err);
  }
}
