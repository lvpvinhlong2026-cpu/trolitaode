// =========================================================================
// BỘ TIỆN ÍCH TỐI ƯU HÓA ĐỘ PHÂN GIẢI 300 DPI CHUẨN IN ẤN VÀ WORD
// =========================================================================

let pngCrcTable: Uint32Array | null = null;
function getPngCrcTable(): Uint32Array {
  if (pngCrcTable) return pngCrcTable;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  pngCrcTable = table;
  return table;
}

function calcCrc32(buf: Uint8Array): number {
  const table = getPngCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPhysChunk(dpi: number): Uint8Array {
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk[4] = 0x70; chunk[5] = 0x48; chunk[6] = 0x59; chunk[7] = 0x73; // 'pHYs'
  view.setUint32(8, ppm);
  view.setUint32(12, ppm);
  chunk[16] = 1; // đơn vị mét
  const crc = calcCrc32(chunk.subarray(4, 17));
  view.setUint32(17, crc);
  return chunk;
}

export function insertDpiIntoPng(pngBytes: Uint8Array, dpi = 300): Uint8Array {
  if (pngBytes.length < 33 || pngBytes[0] !== 0x89 || pngBytes[1] !== 0x50) {
    return pngBytes;
  }
  const physChunk = createPhysChunk(dpi);
  let offset = 8;
  const view = new DataView(pngBytes.buffer, pngBytes.byteOffset, pngBytes.byteLength);

  while (offset < pngBytes.length) {
    const len = view.getUint32(offset);
    const type = String.fromCharCode(pngBytes[offset + 4], pngBytes[offset + 5], pngBytes[offset + 6], pngBytes[offset + 7]);
    if (type === 'pHYs') {
      const result = new Uint8Array(pngBytes.length);
      result.set(pngBytes.subarray(0, offset));
      result.set(physChunk, offset);
      result.set(pngBytes.subarray(offset + 12 + len), offset + physChunk.length);
      return result;
    }
    if (type === 'IHDR') {
      const afterIhdr = offset + 12 + len;
      const result = new Uint8Array(pngBytes.length + physChunk.length);
      result.set(pngBytes.subarray(0, afterIhdr), 0);
      result.set(physChunk, afterIhdr);
      result.set(pngBytes.subarray(afterIhdr), afterIhdr + physChunk.length);
      return result;
    }
    offset += 12 + len;
  }
  return pngBytes;
}

export async function addDpiToBlob(blob: Blob, dpi = 300): Promise<Blob> {
  try {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const withDpi = insertDpiIntoPng(bytes, dpi);
    return new Blob([withDpi], { type: 'image/png' });
  } catch (e) {
    console.error('Lỗi nhúng DPI vào Blob:', e);
    return blob;
  }
}

export async function copyCanvasToClipboard300Dpi(
  canvas: HTMLCanvasElement,
  dpi = 300,
  padding = 4
): Promise<boolean> {
  try {
    const cropped = cropCanvasToContent(canvas, padding);
    const blob = await new Promise<Blob | null>(resolve => cropped.toBlob(resolve, 'image/png'));
    if (!blob) return false;
    const blobWithDpi = await addDpiToBlob(blob, dpi);
    const dataUrl = cropped.toDataURL('image/png');

    const wordWidth = Math.round(cropped.width / 2.5);
    const wordHeight = Math.round(cropped.height / 2.5);
    const htmlSnippet = `<img src="${dataUrl}" alt="Do hoa toan hoc" width="${wordWidth}" height="${wordHeight}" style="display:inline-block; max-width:100%; height:auto;" />`;
    const htmlBlob = new Blob([htmlSnippet], { type: 'text/html' });

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blobWithDpi,
          'text/html': htmlBlob
        })
      ]);
    } catch {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blobWithDpi })
      ]);
    }
    return true;
  } catch (err) {
    console.error('Lỗi copy ảnh vào Clipboard:', err);
    return false;
  }
}

/**
 * Tự động cắt bỏ triệt để mọi khoảng trắng thừa xung quanh nội dung vẽ của canvas (Zero-Whitespace Auto-Crop).
 * Giúp hình vẽ (đồ thị, bảng biến thiên, hình học không gian, biểu đồ) khi dán vào Word luôn to lớn,
 * ôm sát mép viền ngoài cùng của hình vẽ, không lãng phí trang in Word.
 */
export function cropCanvasToContent(sourceCanvas: HTMLCanvasElement, padding = 4): HTMLCanvasElement {
  try {
    const ctx = sourceCanvas.getContext('2d');
    if (!ctx) return sourceCanvas;

    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    let found = false;

    // Quét chính xác từng bước 1-2px để bắt đúng mép nét vẽ
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        // Nếu pixel không phải là màu trắng (#FFFFFF) hoặc trong suốt
        if (a > 10 && (r < 248 || g < 248 || b < 248)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }

    if (!found || maxX <= minX || maxY <= minY) {
      return sourceCanvas;
    }

    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropW = Math.min(w - cropX, maxX - minX + 2 * padding);
    const cropH = Math.min(h - cropY, maxY - minY + 2 * padding);

    if (cropW <= 10 || cropH <= 10) {
      return sourceCanvas;
    }

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropW;
    croppedCanvas.height = cropH;
    const cCtx = croppedCanvas.getContext('2d');
    if (!cCtx) return sourceCanvas;

    cCtx.fillStyle = '#FFFFFF';
    cCtx.fillRect(0, 0, cropW, cropH);
    cCtx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    return croppedCanvas;
  } catch (e) {
    console.warn('cropCanvasToContent failed, returning original canvas:', e);
    return sourceCanvas;
  }
}

/**
 * Tự động phát hiện hộp bao (bounding box) quanh nội dung vẽ của ảnh hoặc canvas.
 * Trả về toạ độ x, y, width, height tính theo kích thước gốc (native).
 */
export function detectContentBoundingBox(
  source: HTMLCanvasElement | HTMLImageElement,
  padding = 24
): { x: number; y: number; width: number; height: number } | null {
  try {
    let canvas: HTMLCanvasElement;
    let w: number;
    let h: number;

    if (source instanceof HTMLCanvasElement) {
      canvas = source;
      w = canvas.width;
      h = canvas.height;
    } else {
      w = source.naturalWidth || source.width;
      h = source.naturalHeight || source.height;
      canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(source, 0, 0);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    let found = false;

    // Quét với bước nhảy 3px để siêu nhanh
    for (let y = 0; y < h; y += 3) {
      for (let x = 0; x < w; x += 3) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        if (a > 15 && (r < 246 || g < 246 || b < 246)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }

    if (!found || maxX <= minX || maxY <= minY) {
      return { x: 0, y: 0, width: w, height: h };
    }

    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropW = Math.min(w - cropX, maxX - minX + 2 * padding);
    const cropH = Math.min(h - cropY, maxY - minY + 2 * padding);

    return { x: cropX, y: cropY, width: cropW, height: cropH };
  } catch (e) {
    console.warn('detectContentBoundingBox failed:', e);
    return null;
  }
}

export interface CropExportOptions {
  fillWhiteBg?: boolean;
  borderStyle?: 'none' | 'solid_black' | 'solid_gray' | 'dashed';
  borderWidth?: number;
  dpi?: number;
}

/**
 * Cắt một vùng hình chữ nhật từ Canvas hoặc ImageElement sang một Canvas mới.
 */
export function cropRegionToCanvas(
  source: HTMLCanvasElement | HTMLImageElement,
  rect: { x: number; y: number; width: number; height: number },
  options: CropExportOptions = {}
): HTMLCanvasElement {
  const {
    fillWhiteBg = true,
    borderStyle = 'none',
    borderWidth = 1,
  } = options;

  const cropped = document.createElement('canvas');
  const cropW = Math.max(1, Math.round(rect.width));
  const cropH = Math.max(1, Math.round(rect.height));
  cropped.width = cropW;
  cropped.height = cropH;

  const ctx = cropped.getContext('2d');
  if (!ctx) return cropped;

  if (fillWhiteBg) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, cropW, cropH);
  }

  ctx.drawImage(
    source,
    Math.round(rect.x),
    Math.round(rect.y),
    cropW,
    cropH,
    0,
    0,
    cropW,
    cropH
  );

  if (borderStyle !== 'none') {
    ctx.save();
    ctx.lineWidth = borderWidth;
    if (borderStyle === 'solid_black') {
      ctx.strokeStyle = '#1e293b';
    } else if (borderStyle === 'solid_gray') {
      ctx.strokeStyle = '#94a3b8';
    } else if (borderStyle === 'dashed') {
      ctx.strokeStyle = '#64748b';
      ctx.setLineDash([6, 4]);
    }
    // Vẽ viền lùi vào 0.5px để không bị cắt xén
    ctx.strokeRect(0.5, 0.5, cropW - 1, cropH - 1);
    ctx.restore();
  }

  return cropped;
}

/**
 * Cắt 1 phần hình ảnh khung chữ nhật và chép trực tiếp vào Clipboard với 300 DPI & HTML Tag chuẩn Word.
 */
export async function copyCroppedRegionToClipboard(
  source: HTMLCanvasElement | HTMLImageElement,
  rect: { x: number; y: number; width: number; height: number },
  options: CropExportOptions = {}
): Promise<boolean> {
  try {
    const rawCroppedCanvas = cropRegionToCanvas(source, rect, options);
    // Tự động cắt bỏ triệt để khoảng trắng thừa xung quanh vùng chọn (padding = 4px)
    const croppedCanvas = cropCanvasToContent(rawCroppedCanvas, 4);
    const dpi = options.dpi || 300;

    const blob = await new Promise<Blob | null>(resolve => croppedCanvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Không tạo được PNG blob');

    const blobWithDpi = await addDpiToBlob(blob, dpi);
    const dataUrl = croppedCanvas.toDataURL('image/png');

    // Tỉ lệ scale vào Word: 300 DPI / 96 DPI = ~3.125 hoặc 2.5
    // Đảm bảo hình vẽ có kích thước vừa vặn như in ấn thực tế
    const wordWidth = Math.round(croppedCanvas.width / 2.5);
    const wordHeight = Math.round(croppedCanvas.height / 2.5);
    const htmlSnippet = `<img src="${dataUrl}" alt="Hinh toan hoc cat tu Tro ly Do hoa" width="${wordWidth}" height="${wordHeight}" style="display:inline-block; max-width:100%; height:auto;" />`;
    const htmlBlob = new Blob([htmlSnippet], { type: 'text/html' });

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blobWithDpi,
          'text/html': htmlBlob,
        })
      ]);
    } catch {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blobWithDpi })
      ]);
    }

    return true;
  } catch (err) {
    console.error('Lỗi khi chép vùng ảnh cắt vào Clipboard:', err);
    return false;
  }
}

