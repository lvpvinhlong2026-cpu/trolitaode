import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Box, 
  Play, 
  Pause, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Copy, 
  Download, 
  CheckCircle2, 
  Sparkles,
  Layers,
  Eye
} from 'lucide-react';
import { 
  renderGeometry3DToCanvas, 
  getDefaultAngles, 
  build3DModelFromGsp,
  Custom3DModel,
  Geometry3DConfig
} from '../utils/geometry3dEngine';
import { addDpiToBlob } from '../utils/dpiUtils';

export interface Gsp3DViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  points: Array<{ id: string; x: number; y: number; label: string; type?: string; parentIds?: [string, string]; ratio?: number; segmentId?: string }>;
  segments: Array<{ id: string; p1Id: string; p2Id: string; style: 'solid' | 'dashed'; color?: string; width?: number }>;
  ellipses?: Array<{ id: string; centerId: string; rx: number; ry: number; style: string }>;
  presetType?: string;
  onOpenFull3DTab?: () => void;
}

export default function Gsp3DViewerModal({
  isOpen,
  onClose,
  points,
  segments,
  ellipses,
  presetType,
  onOpenFull3DTab
}: Gsp3DViewerModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Model 3D được trích xuất từ dữ liệu vẽ GSP
  const [model3D, setModel3D] = useState<Custom3DModel | null>(null);

  // Góc xoay và thu phóng
  const [rotX, setRotX] = useState<number>(0.22);
  const [rotY, setRotY] = useState<number>(-0.32);
  const [zoom, setZoom] = useState<number>(1.0);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);

  // Tự động xoay 360 độ mượt mà
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Trạng thái kéo chuột xoay 3D
  const dragStateRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    startRotX: number;
    startRotY: number;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startRotX: 0.22,
    startRotY: -0.32
  });

  // Khi modal mở hoặc dữ liệu GSP thay đổi: nạp và phân tích mô hình 3D
  useEffect(() => {
    if (!isOpen) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const model = build3DModelFromGsp(points, segments, ellipses, presetType);
    setModel3D(model);

    const def = getDefaultAngles(presetType);
    setRotX(def.rotX);
    setRotY(def.rotY);
    setZoom(def.zoom);
    setPanX(def.panX);
    setPanY(def.panY);
    setIsAutoRotating(true);
  }, [isOpen, points, segments, ellipses, presetType]);

  // Vòng lặp xoay tự động 360 độ mượt mà 60 FPS
  useEffect(() => {
    if (!isOpen || !isAutoRotating) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const animate = () => {
      setRotY(prev => prev + 0.008);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, isAutoRotating]);

  // Render canvas mỗi khi góc xoay hoặc zoom thay đổi
  useEffect(() => {
    if (!isOpen || !canvasRef.current || !model3D) return;

    const config: Geometry3DConfig = {
      preset: presetType,
      customModel: model3D,
      rotX,
      rotY,
      zoom,
      panX,
      panY,
      showCenterO: true,
      showMidpointM: true,
      showDiagonals: false
    };

    renderGeometry3DToCanvas(config, canvasRef.current, 3);
  }, [isOpen, model3D, rotX, rotY, zoom, panX, panY, presetType]);

  // Đóng bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Bắt đầu kéo chuột để xoay 360 độ
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsAutoRotating(false);
    dragStateRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startRotX: rotX,
      startRotY: rotY
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragStateRef.current.isDragging) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;

    // Tốc độ xoay tự nhiên
    const speed = 0.008;
    let nextRotX = dragStateRef.current.startRotX - dy * speed;
    let nextRotY = dragStateRef.current.startRotY + dx * speed;

    // Giới hạn góc pitch không bị lộn ngược
    nextRotX = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, nextRotX));

    setRotX(nextRotX);
    setRotY(nextRotY);
  };

  const handleMouseUp = () => {
    dragStateRef.current.isDragging = false;
  };

  // Đặt lại góc nhìn chuẩn ban đầu
  const handleResetAngle = () => {
    const def = getDefaultAngles(presetType);
    setRotX(def.rotX);
    setRotY(def.rotY);
    setZoom(def.zoom);
    setPanX(0);
    setPanY(0);
    setIsAutoRotating(false);
  };

  // Phóng to / Thu nhỏ
  const handleZoom = (factor: number) => {
    setZoom(prev => Math.max(0.4, Math.min(2.8, prev * factor)));
  };

  // Xuất ảnh 300 DPI dán Word hoặc tải PNG
  const handleExport3D = async (action: 'copy' | 'download') => {
    if (!model3D) return;
    const expCanvas = document.createElement('canvas');
    expCanvas.style.width = '600px';
    expCanvas.style.height = '480px';

    const config: Geometry3DConfig = {
      preset: presetType,
      customModel: model3D,
      rotX,
      rotY,
      zoom,
      panX,
      panY,
      isExporting: true
    };

    renderGeometry3DToCanvas(config, expCanvas, 4); // 4x DPI xuất Word siêu sắc nét

    // Tự động cắt sát hình (auto-crop) loại bỏ viền trắng thừa để ảnh dán vào Word to lớn, nổi bật như BBT
    let targetCanvas = expCanvas;
    try {
      const expCtx = expCanvas.getContext('2d');
      if (expCtx) {
        const w = expCanvas.width;
        const h = expCanvas.height;
        const imgData = expCtx.getImageData(0, 0, w, h);
        const data = imgData.data;
        let minX = w;
        let minY = h;
        let maxX = 0;
        let maxY = 0;
        let found = false;

        // Quét bước nhảy 4px siêu tốc (< 2ms)
        for (let y = 0; y < h; y += 4) {
          for (let x = 0; x < w; x += 4) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            // Không phải màu trắng tinh nền
            if (r < 248 || g < 248 || b < 248) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              found = true;
            }
          }
        }

        if (found && maxX > minX && maxY > minY) {
          const pad = 48; // padding ở độ phân giải 4x (~12px logic)
          const cropX = Math.max(0, minX - pad);
          const cropY = Math.max(0, minY - pad);
          const cropW = Math.min(w - cropX, maxX - minX + 2 * pad);
          const cropH = Math.min(h - cropY, maxY - minY + 2 * pad);

          const croppedCanvas = document.createElement('canvas');
          croppedCanvas.width = cropW;
          croppedCanvas.height = cropH;
          const cCtx = croppedCanvas.getContext('2d');
          if (cCtx) {
            cCtx.fillStyle = '#FFFFFF';
            cCtx.fillRect(0, 0, cropW, cropH);
            cCtx.drawImage(expCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
            targetCanvas = croppedCanvas;
          }
        }
      }
    } catch (e) {
      console.warn('Auto crop 3d canvas failed, fallback to original', e);
    }

    targetCanvas.toBlob(async blob => {
      if (!blob) return;
      try {
        const dpiBlob = await addDpiToBlob(blob, 300);
        if (action === 'copy') {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': dpiBlob })
          ]);
          setCopySuccess('✅ Đã sao chép ảnh 3D 300 DPI! Nhấn Ctrl + V để dán ngay vào Word.');
          setTimeout(() => setCopySuccess(null), 4000);
        } else {
          const url = URL.createObjectURL(dpiBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Hinh_3D_360_${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
          setCopySuccess('✅ Đã tải file ảnh PNG 300 DPI sắc nét.');
          setTimeout(() => setCopySuccess(null), 3000);
        }
      } catch (err) {
        console.error('Lỗi xuất ảnh 3D:', err);
        setCopySuccess('❌ Không thể sao chép ảnh, vui lòng thử tải về.');
        setTimeout(() => setCopySuccess(null), 3000);
      }
    }, 'image/png');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-teal-100 dark:border-slate-800 flex flex-col overflow-hidden max-h-[95vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* THANH TIÊU ĐỀ MODAL */}
        <div className="p-4 px-5 bg-gradient-to-r from-teal-50 via-emerald-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border-b border-teal-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 via-emerald-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Box size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  Mô Hình 3D Tương Tác Xoay 360°
                </h3>
                <span className="text-[11px] bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-bold px-2.5 py-0.5 rounded-full">
                  Nét thấy & Nét khuất chuẩn SGK
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tự động đồng bộ từ hình vừa vẽ trên GSP • Đảo nét đứt/liền theo góc nhìn phối cảnh 360 độ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Đóng (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* THÔNG BÁO COPY THÀNH CÔNG */}
        {copySuccess && (
          <div className="p-2.5 px-5 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{copySuccess}</span>
          </div>
        )}

        {/* KHUNG CHÍNH CHỨA KHUNG CANVAS XOAY 3D */}
        <div className="flex-1 p-4 flex flex-col items-center justify-center bg-slate-50/60 dark:bg-slate-950/40 overflow-hidden relative">
          {/* Thanh chỉ dẫn & công cụ nổi góc trên canvas */}
          <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-none z-10">
            <div className="flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-teal-200 dark:border-teal-800/60 shadow-xs text-xs font-bold text-teal-800 dark:text-teal-200 pointer-events-auto">
              <Sparkles size={14} className="text-amber-500" />
              <span>
                {isAutoRotating ? '🔄 Đang tự xoay 360°' : '🖱️ Kéo chuột để xoay 3D theo mọi góc nhìn'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs pointer-events-auto">
              <button
                onClick={() => setIsAutoRotating(!isAutoRotating)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  isAutoRotating 
                    ? 'bg-teal-600 text-white shadow-xs' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-teal-50 hover:text-teal-700'
                }`}
                title={isAutoRotating ? 'Tạm dừng tự xoay' : 'Bật tự động xoay 360 độ'}
              >
                {isAutoRotating ? <Pause size={13} /> : <Play size={13} />}
                <span>{isAutoRotating ? 'Dừng' : 'Tự xoay'}</span>
              </button>

              <button
                onClick={handleResetAngle}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
                title="Đặt lại góc nhìn chuẩn SGK"
              >
                <RotateCcw size={14} />
              </button>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

              <button
                onClick={() => handleZoom(1.15)}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn size={14} />
              </button>

              <button
                onClick={() => handleZoom(0.87)}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut size={14} />
              </button>
            </div>
          </div>

          {/* Vùng Canvas hiển thị hình học 3D 300 DPI */}
          <div className="w-full flex items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 shadow-inner select-none overflow-hidden">
            <canvas
              ref={canvasRef}
              className={`w-full max-w-[620px] h-[440px] block transition-transform ${
                dragStateRef.current.isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>

          {/* Hộp gợi ý trực quan phía dưới */}
          <div className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-0.5 bg-black dark:bg-white rounded"></span>
              <strong>Nét liền:</strong> Cạnh hướng về mắt quan sát (thấy)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-0.5 border-t border-dashed border-black dark:border-white"></span>
              <strong>Nét đứt:</strong> Cạnh ở mặt sau hoặc trong khối (khuất)
            </span>
          </div>
        </div>

        {/* THANH ĐIỀU KHIỂN DƯỚI CÙNG (NÚT XUẤT ẢNH & ĐÓNG) */}
        <div className="p-3.5 px-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onOpenFull3DTab && (
              <button
                onClick={() => {
                  onClose();
                  onOpenFull3DTab();
                }}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Mở sang Tab Mô hình 3D toàn màn hình"
              >
                <Layers size={15} />
                <span>Mở trong Tab Mô hình 3D</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport3D('copy')}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="Sao chép ảnh độ phân giải cao 300 DPI dán trực tiếp vào Word (Ctrl+V)"
            >
              <Copy size={15} />
              <span>Sao chép ảnh (Dán Word)</span>
            </button>

            <button
              onClick={() => handleExport3D('download')}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Tải ảnh PNG 300 DPI về máy tính"
            >
              <Download size={15} />
              <span>Tải PNG (300 DPI)</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
