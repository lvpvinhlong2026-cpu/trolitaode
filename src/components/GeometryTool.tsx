import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, Copy, Download, CheckCircle2, Sparkles, Loader2, AlertCircle, 
  Play, Pause, RotateCcw, RotateCw, ZoomIn, ZoomOut, Eye, Layers, Compass
} from 'lucide-react';
import { 
  renderGeometry3DToCanvas, 
  getGeometry3DPoints, 
  getDefaultAngles, 
  Geometry3DConfig 
} from '../utils/geometry3dEngine';
import { addDpiToBlob } from '../utils/bbtEngine';
import { copyCroppedImageToClipboard, downloadCroppedImage } from '../utils/imageCropper';

interface Props {
  apiKey: string;
  model: string;
}

export default function GeometryTool({ apiKey, model }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<'quick3d' | 'geogebra' | 'revolution'>('quick3d');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // ==========================================
  // STATE CHO TAB 1: DỰNG HÌNH 3D NHANH (300 DPI)
  // ==========================================
  const [geoConfig, setGeoConfig] = useState<Geometry3DConfig>({
    preset: 'pyramid_s_abcd',
    showCenterO: true,
    showMidpointM: true,
    showDiagonals: false
  });
  const geoCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const animFrameRef = useRef<number | null>(null);

  const dragStateRef = useRef<{
    isDragging: boolean;
    targetPoint: string | null;
    startX: number;
    startY: number;
    startRotX: number;
    startRotY: number;
  }>({
    isDragging: false,
    targetPoint: null,
    startX: 0,
    startY: 0,
    startRotX: 0,
    startRotY: 0
  });

  // Vòng lặp tự động xoay 360 độ mượt mà khi bật nút Play
  useEffect(() => {
    if (!isAutoRotating) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }
    const animate = () => {
      setGeoConfig(prev => {
        const def = getDefaultAngles(prev.preset);
        const curY = prev.rotY ?? def.rotY;
        return {
          ...prev,
          rotY: curY + 0.007,
          pointOverrides: undefined
        };
      });
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAutoRotating]);

  useEffect(() => {
    if (geoCanvasRef.current && activeSubTab === 'quick3d') {
      try {
        renderGeometry3DToCanvas(geoConfig, geoCanvasRef.current, 3);
      } catch (err) {
        console.error('Lỗi render hình học 3D:', err);
      }
    }
  }, [geoConfig, activeSubTab]);

  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = geoCanvasRef.current;
    if (!canvas) return { x: 250, y: 200 };
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (500 / (rect.width || 500));
    const y = (clientY - rect.top) * (400 / (rect.height || 400));
    return { x, y };
  };

  const findNearestPointKey = (x: number, y: number): string | null => {
    const allPts = getGeometry3DPoints(geoConfig, 500, 400);
    let closestKey: string | null = null;
    let minDist = 18;
    for (const [key, pt] of Object.entries(allPts)) {
      if (key === 'O' && !geoConfig.showCenterO) continue;
      if (key === 'M' && !geoConfig.showMidpointM) continue;
      const d = Math.hypot(x - pt.x, y - pt.y);
      if (d < minDist) {
        minDist = d;
        closestKey = key;
      }
    }
    return closestKey;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    const hitKey = findNearestPointKey(x, y);
    const def = getDefaultAngles(geoConfig.preset);

    dragStateRef.current = {
      isDragging: true,
      targetPoint: hitKey,
      startX: e.clientX,
      startY: e.clientY,
      startRotX: geoConfig.rotX ?? def.rotX,
      startRotY: geoConfig.rotY ?? def.rotY
    };

    if (hitKey) {
      setGeoConfig(prev => ({ ...prev, draggedPoint: hitKey }));
    } else {
      setIsAutoRotating(false);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    const state = dragStateRef.current;

    if (!state.isDragging) {
      const hitKey = findNearestPointKey(x, y);
      if (hitKey !== geoConfig.hoveredPoint) {
        setGeoConfig(prev => ({ ...prev, hoveredPoint: hitKey }));
      }
      if (geoCanvasRef.current) {
        geoCanvasRef.current.style.cursor = hitKey ? 'grab' : 'crosshair';
      }
      return;
    }

    if (geoCanvasRef.current) {
      geoCanvasRef.current.style.cursor = 'grabbing';
    }

    if (state.targetPoint) {
      setGeoConfig(prev => ({
        ...prev,
        pointOverrides: {
          ...(prev.pointOverrides || {}),
          [state.targetPoint!]: { x: Math.round(x), y: Math.round(y) }
        }
      }));
    } else {
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      const sensitivity = 0.012;
      setGeoConfig(prev => ({
        ...prev,
        rotY: state.startRotY + dx * sensitivity,
        rotX: Math.max(-1.4, Math.min(1.4, state.startRotX + dy * sensitivity)),
        pointOverrides: undefined
      }));
    }
  };

  const handleCanvasMouseUp = () => {
    dragStateRef.current.isDragging = false;
    dragStateRef.current.targetPoint = null;
    setGeoConfig(prev => ({ ...prev, draggedPoint: null }));
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    setGeoConfig(prev => ({
      ...prev,
      zoom: Math.max(0.4, Math.min(3.0, (prev.zoom ?? 1.0) * factor))
    }));
  };

  const handleResetView = () => {
    const def = getDefaultAngles(geoConfig.preset);
    setIsAutoRotating(false);
    setGeoConfig(prev => ({
      ...prev,
      rotX: def.rotX,
      rotY: def.rotY,
      zoom: def.zoom,
      panX: def.panX,
      panY: def.panY,
      pointOverrides: undefined,
      hoveredPoint: null,
      draggedPoint: null
    }));
  };

  const handleZoom = (factor: number) => {
    setGeoConfig(prev => ({
      ...prev,
      zoom: Math.max(0.4, Math.min(3.0, (prev.zoom ?? 1.0) * factor))
    }));
  };

  const handleCopyImage = async (offscreenCanvas: HTMLCanvasElement) => {
    try {
      const ok = await copyCroppedImageToClipboard(offscreenCanvas, 300, 24);
      if (ok) {
        setCopySuccess('Đã copy hình học 3D (cắt sát viền 24px, 300 DPI)! Dán (Ctrl+V) ngay vào Word.');
      } else {
        setCopySuccess('Không thể copy trực tiếp. Vui lòng bấm "Tải PNG".');
      }
      setTimeout(() => setCopySuccess(null), 3500);
    } catch (err) {
      console.error('Lỗi copy ảnh:', err);
      setCopySuccess('Không thể copy trực tiếp. Vui lòng bấm "Tải PNG".');
      setTimeout(() => setCopySuccess(null), 4000);
    }
  };

  const handleExportQuick3D = (action: 'copy' | 'download') => {
    try {
      const offscreen = document.createElement('canvas');
      renderGeometry3DToCanvas({ ...geoConfig, isExporting: true }, offscreen, 3);
      if (action === 'copy') {
        handleCopyImage(offscreen);
      } else {
        downloadCroppedImage(offscreen, `Hinh_hoc_3D_${geoConfig.preset}_300dpi.png`, 300, 24);
      }
    } catch (err) {
      console.error('Lỗi xuất ảnh 3D:', err);
    }
  };

  // ==========================================
  // STATE CHO TAB 2 & 3: GEOGEBRA 3D & TRÒN XOAY
  // ==========================================
  const [lessonContent, setLessonContent] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [error, setError] = useState('');
  const [ggbCode, setGgbCode] = useState('');
  const [explanationText, setExplanationText] = useState('');

  // Tròn xoay Ox (Toán 12)
  const [revFx, setRevFx] = useState('sqrt(x)');
  const [revGx, setRevGx] = useState('0');
  const [revA, setRevA] = useState('0');
  const [revB, setRevB] = useState('4');
  const [focusedInput, setFocusedInput] = useState<'revFx' | 'revGx' | 'revA' | 'revB'>('revFx');

  const handleInsertSymbol = (symbol: string) => {
    if (focusedInput === 'revFx') setRevFx(prev => prev + symbol);
    else if (focusedInput === 'revGx') setRevGx(prev => prev + symbol);
    else if (focusedInput === 'revA') setRevA(prev => prev + symbol);
    else if (focusedInput === 'revB') setRevB(prev => prev + symbol);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target && typeof event.target.result === 'string') {
              setImageBase64(event.target.result);
            }
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  const handleGenerateOutline = async () => {
    if (activeSubTab === 'geogebra') {
      if (!lessonContent.trim() && !imageBase64) {
        setError("Vui lòng nhập bài toán hoặc dán ảnh cần dựng hình.");
        return;
      }
    } else {
      if (!revFx.trim() || !revA.trim() || !revB.trim()) {
        setError("Vui lòng nhập đầy đủ f(x), a, và b.");
        return;
      }
    }
    if (!apiKey) {
      setError('Vui lòng cấu hình API Key trước khi sử dụng.');
      return;
    }

    setIsGeneratingOutline(true);
    setError('');

    try {
      const prompt = `Bạn là một chuyên gia Hình học và GeoGebra. Dựa vào yêu cầu bài toán sau, hãy phân tích và viết ra một DÀN Ý CHI TIẾT (các bước dựng hình, xác định tọa độ các điểm quan trọng trong không gian 3D, các mặt phẳng, đường thẳng...) để chuẩn bị cho việc dựng hình bằng GeoGebra 3D.
CHỈ trả về phần dàn ý chi tiết bằng tiếng Việt, giải thích rõ ràng cách xác định tọa độ. KHÔNG TRẢ VỀ MÃ CODE GEOGEBRA.

YÊU CẦU:
${activeSubTab === 'revolution' ? `Vẽ khối tròn xoay tạo bởi hình phẳng giới hạn bởi: y = ${revFx}, y = ${revGx || '0'}, x = ${revA}, x = ${revB} quay quanh trục Ox.` : lessonContent}`;

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          model: model || 'gemini-2.5-flash',
          apiKey: apiKey,
          imageBase64: activeSubTab === 'geogebra' ? imageBase64 : undefined
        })
      });

      if (!res.ok) throw new Error("Lỗi từ máy chủ API khi gọi mô hình.");
      const data = await res.json();
      const text = data.text || '';
      
      if (text && activeSubTab === 'geogebra') {
        setLessonContent(prev => {
          const separator = '\n\n--- DÀN Ý CHI TIẾT DỰNG HÌNH ---\n';
          if (prev.includes('--- DÀN Ý CHI TIẾT DỰNG HÌNH ---')) {
            const parts = prev.split('--- DÀN Ý CHI TIẾT DỰNG HÌNH ---');
            return parts[0].trim() + separator + text.trim();
          }
          return prev.trim() + separator + text.trim();
        });
      }
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi soạn dàn ý.");
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleGenerateGeoGebra = async () => {
    if (activeSubTab === 'geogebra') {
      if (!lessonContent.trim() && !imageBase64) {
        setError("Vui lòng nhập bài toán hoặc dán ảnh cần vẽ.");
        return;
      }
    } else {
      if (!revFx.trim() || !revA.trim() || !revB.trim()) {
        setError("Vui lòng nhập đầy đủ f(x), a, và b.");
        return;
      }
    }

    if (activeSubTab === 'revolution') {
      const code = `// 1. Parameters
a_val = ${revA.replace(/^x\s*=\s*/i, '')}
b_val = ${revB.replace(/^x\s*=\s*/i, '')}
alpha = Slider(0, 2pi, 0.05)
SetValue(alpha, 0)

// 2. Functions
f_raw(x) = ${revFx}
g_raw(x) = ${revGx || '0'}
f = Function(f_raw, a_val, b_val)
g = Function(g_raw, a_val, b_val)

// 3. Static Flat Region
flatArea = Surface(u, v * f_raw(u) + (1 - v) * g_raw(u), 0, u, a_val, b_val, v, 0, 1)
SetColor(flatArea, "Blue")
SetFilling(flatArea, 0.25)
hatching = Sequence(Segment((k, f_raw(k), 0), (k, g_raw(k), 0)), k, a_val, b_val, (b_val-a_val)/21.1)
SetColor(hatching, "Blue")

// 4. Boundary Points
PtA1 = (a_val, f_raw(a_val), 0)
PtA2 = (a_val, g_raw(a_val), 0)
PtB1 = (b_val, f_raw(b_val), 0)
PtB2 = (b_val, g_raw(b_val), 0)

// 5. Solid Volume of Revolution
surfF = Surface(f, alpha, xAxis)
surfG = Surface(g, alpha, xAxis)
SetColor(surfF, "Orange")
SetColor(surfG, "Orange")

capA = Surface(a_val, r * cos(w), r * sin(w), r, Min(f_raw(a_val), g_raw(a_val)), Max(f_raw(a_val), g_raw(a_val)), w, 0, alpha)
capB = Surface(b_val, r * cos(w), r * sin(w), r, Min(f_raw(b_val), g_raw(b_val)), Max(f_raw(b_val), g_raw(b_val)), w, 0, alpha)
SetColor(capA, "Orange")
SetColor(capB, "Orange")

crossSection = Surface(u, (v*f_raw(u) + (1-v)*g_raw(u)) * cos(alpha), (v*f_raw(u) + (1-v)*g_raw(u)) * sin(alpha), u, a_val, b_val, v, 0, 1)
SetColor(crossSection, "Orange")
SetFilling(crossSection, 0.8)`;
      
      setGgbCode(code);
      setExplanationText('Đã dựng thành công Khối tròn xoay đặc hoàn chỉnh quay quanh trục Ox.');
      return;
    }

    if (!apiKey) {
      setError('Vui lòng cấu hình API Key trước khi sử dụng.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setGgbCode('');
    setExplanationText('');

    try {
      const prompt = `ROLE: You are a Geometry Algorithms Expert & GeoGebra Specialist. Convert Math Problems into precise GeoGebra constructions using 3D coordinates (x, y, z).
Output standard English GeoGebra commands inside \`\`\`geogebra ... \`\`\` block.
User request:
${lessonContent}`;

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          model: model || 'gemini-2.5-flash',
          apiKey: apiKey,
          imageBase64: imageBase64
        })
      });

      if (!res.ok) throw new Error("Lỗi từ máy chủ API khi gọi mô hình.");
      const data = await res.json();
      const text = data.text || '';
      
      const match = text.match(/```(?:geogebra)?\s*\n([\s\S]*?)(?:```|$)/i);
      const code = match ? match[1].trim() : text.trim();
      setGgbCode(code.replace(/^```[^\n]*\n?/gm, '').replace(/```$/gm, '').trim());
      setExplanationText(text.replace(/```geogebra[\s\S]*?```/i, '').trim());
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getIframeSrcdoc = () => {
    if (!ggbCode) return '';
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>GeoGebra 3D</title>
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #f8fafc; font-family: sans-serif; }
    #ggb-element { width: 100%; height: 100%; }
    .loading-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.85); z-index: 100; font-weight: bold; color: #0d9488; }
    .float-btn {
      position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 1000;
      padding: 10px 20px; font-family: sans-serif; font-size: 14px; font-weight: bold; 
      background: #0d9488; color: white; border: none; border-radius: 9999px; cursor: pointer; 
      box-shadow: 0 4px 12px rgba(13, 148, 136, 0.4); display: flex; align-items: center; gap: 8px;
    }
    .float-btn:hover { background: #0f766e; }
  </style>
  <script src="https://www.geogebra.org/apps/deployggb.js"></script>
</head>
<body>
  <div id="loading" class="loading-overlay">Đang khởi tạo ứng dụng GeoGebra 3D...</div>
  ${activeSubTab === 'revolution' ? `
  <button id="btnRotate" class="float-btn">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
    Quay quanh trục Ox
  </button>` : ''}
  <div id="ggb-element"></div>
  <script>
    var params = {
      "appName": "3d",
      "width": window.innerWidth,
      "height": window.innerHeight,
      "showToolBar": true,
      "showAlgebraInput": true,
      "showMenuBar": true,
      "language": "vi",
      "appletOnLoad": function(api) {
        document.getElementById('loading').style.display = 'none';
        api.setErrorDialogsActive(false);
        var script = ${JSON.stringify(ggbCode)};
        var lines = script.split('\\n');
        lines.forEach(function(line) {
          var execLine = line.trim().split('//')[0].trim();
          if(execLine !== '') {
            try { api.evalCommand(execLine); } catch(e) {}
          }
        });
        ${activeSubTab === 'revolution' ? `
        var isRotating = false;
        var btnRotate = document.getElementById('btnRotate');
        if (btnRotate) {
          btnRotate.addEventListener('click', function() {
            isRotating = !isRotating;
            api.setAnimating('alpha', isRotating);
            if(isRotating) { api.startAnimation(); btnRotate.innerText = 'Tạm dừng quay'; }
            else { api.stopAnimation(); btnRotate.innerText = 'Tiếp tục quay Ox'; }
          });
        }` : ''}
      }
    };
    var applet = new GGBApplet(params, true);
    window.addEventListener("load", function() {
      applet.inject('ggb-element');
    });
  </script>
</body>
</html>`;
  };

  return (
    <div className="space-y-6">
      {/* HEADER CÔNG CỤ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-500 text-white flex items-center justify-center font-bold text-xl shadow-xs">
            <Box size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">
                TRỢ LÝ VẼ HÌNH HỌC 3D & GEOGEBRA
              </h1>
              <span className="text-[10px] uppercase tracking-wider font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                Toán 12 • 300 DPI
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dựng hình 3D tương tác xoay 360° • Hệ tọa độ Oxyz • GeoGebra 3D AI • Mô phỏng Khối tròn xoay Ox
            </p>
          </div>
        </div>

        {/* 3 SUB-TABS */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold gap-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('quick3d')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'quick3d'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Box size={14} /> Dựng hình 3D (300 DPI)
          </button>
          <button
            onClick={() => setActiveSubTab('geogebra')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'geogebra'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles size={14} /> GeoGebra 3D AI
          </button>
          <button
            onClick={() => setActiveSubTab('revolution')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'revolution'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Compass size={14} /> Khối tròn xoay Ox
          </button>
        </div>
      </div>

      {copySuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{copySuccess}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: DỰNG HÌNH HỌC 3D (300 DPI) TƯƠNG TÁC TRỰC TIẾP */}
      {/* ======================================================== */}
      {activeSubTab === 'quick3d' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Cột trái chọn khối mẫu & tùy chọn */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider block">
              Chọn khối hình học mẫu:
            </span>

            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'pyramid_s_abcd', label: 'Hình chóp S.ABCD đáy bình hành', desc: 'Dạng chuẩn đề thi THPT Quốc gia' },
                { id: 'pyramid_s_abc', label: 'Hình chóp tam giác S.ABC', desc: 'Đáy tam giác bất kỳ' },
                { id: 'pyramid_sa_bottom', label: 'Hình chóp S.ABCD (SA ⊥ đáy)', desc: 'Cạnh bên vuông góc với đáy' },
                { id: 'prism_abc', label: 'Lăng trụ tam giác ABC.A\'B\'C\'', desc: 'Khối lăng trụ chuẩn' },
                { id: 'box_abcd', label: 'Hộp chữ nhật ABCD.A\'B\'C\'D\'', desc: 'Khối hộp chữ nhật / hình lập phương' },
                { id: 'coord_oxyz', label: 'Hệ tọa độ không gian Oxyz', desc: 'Trọng tâm phương pháp tọa độ Toán 12' },
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => {
                    const def = getDefaultAngles(g.id as any);
                    setIsAutoRotating(false);
                    setGeoConfig({
                      ...geoConfig,
                      preset: g.id as any,
                      rotX: def.rotX,
                      rotY: def.rotY,
                      zoom: def.zoom,
                      panX: def.panX,
                      panY: def.panY,
                      pointOverrides: undefined,
                      hoveredPoint: null,
                      draggedPoint: null
                    });
                  }}
                  className={`p-2.5 rounded-xl border text-left font-bold transition cursor-pointer ${
                    geoConfig.preset === g.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border-indigo-500 shadow-xs ring-1 ring-indigo-400'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs">{g.label}</div>
                  <div className="text-[10px] font-normal text-slate-400">{g.desc}</div>
                </button>
              ))}
            </div>

            {/* Checkboxes chi tiết hình học (cho các khối chóp/lăng trụ) */}
            {geoConfig.preset !== 'coord_oxyz' && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Tùy chọn vẽ điểm & đường đặc biệt:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={geoConfig.showCenterO}
                      onChange={e => setGeoConfig({ ...geoConfig, showCenterO: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    Tâm đáy O
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={geoConfig.showMidpointM}
                      onChange={e => setGeoConfig({ ...geoConfig, showMidpointM: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    Trung điểm M (cạnh SC)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={geoConfig.showDiagonals}
                      onChange={e => setGeoConfig({ ...geoConfig, showDiagonals: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    Đường chéo đáy (AC, BD)
                  </label>
                </div>
              </div>
            )}

            {/* Hàng nút tác vụ xuất ảnh */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <button
                onClick={() => handleExportQuick3D('copy')}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <Copy size={15} />
                Copy ảnh (Ctrl+V vào Word)
              </button>

              <button
                onClick={() => handleExportQuick3D('download')}
                className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Download size={15} />
                Tải PNG
              </button>
            </div>
          </div>

          {/* Khung Canvas 300 DPI tương tác trực tiếp */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center min-h-[460px]">
            <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Box size={14} className="text-indigo-600" />
                Không gian 3D tương tác (Kéo đỉnh / Chuột để xoay 360°)
              </span>

              {/* Toolbar điều khiển góc nhìn */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsAutoRotating(prev => !prev)}
                  title={isAutoRotating ? 'Tạm dừng tự xoay' : 'Bật tự động xoay 360°'}
                  className={`p-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    isAutoRotating
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {isAutoRotating ? <Pause size={13} /> : <Play size={13} />}
                  <span className="text-[10px]">{isAutoRotating ? 'Dừng' : 'Tự xoay'}</span>
                </button>

                <button
                  onClick={() => handleZoom(1.1)}
                  title="Phóng to"
                  className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition cursor-pointer"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  onClick={() => handleZoom(0.9)}
                  title="Thu nhỏ"
                  className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition cursor-pointer"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  onClick={handleResetView}
                  title="Đặt lại góc nhìn chuẩn SGK"
                  className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition cursor-pointer"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>

            {/* Khung vẽ Canvas */}
            <div className="relative border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs bg-white">
              <canvas
                ref={geoCanvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onWheel={handleCanvasWheel}
                className="select-none block"
                style={{ width: '500px', height: '400px' }}
              />
            </div>
            
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              💡 Mẹo: Rê chuột vào đỉnh để kéo di chuyển • Kéo chuột trên nền trắng để xoay 3D • Lăn chuột để phóng to/thu nhỏ
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: GEOGEBRA 3D AI (TỰ ĐỘNG DỰNG HÌNH TỪ ĐỀ BÀI) */}
      {/* ======================================================== */}
      {activeSubTab === 'geogebra' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Nhập đề bài hình học không gian:
            </h3>

            <div className="space-y-2">
              <textarea
                value={lessonContent}
                onChange={e => setLessonContent(e.target.value)}
                onPaste={handlePaste}
                rows={5}
                placeholder="Ví dụ: Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a. Cạnh bên SA vuông góc với mặt phẳng đáy và SA = a√2. Gọi M là trung điểm của cạnh SC... (Có thể Ctrl+V để dán ảnh bài toán)"
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed"
              />

              {imageBase64 && (
                <div className="relative inline-block border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-white dark:bg-slate-800">
                  <img src={imageBase64} alt="Đã dán" className="h-20 object-contain rounded" />
                  <button
                    onClick={() => setImageBase64(null)}
                    className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center cursor-pointer shadow-xs"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleGenerateOutline}
                disabled={isGeneratingOutline || isProcessing}
                className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingOutline ? <Loader2 size={14} className="animate-spin text-indigo-600" /> : <Eye size={14} />}
                Soạn dàn ý dựng hình
              </button>

              <button
                onClick={handleGenerateGeoGebra}
                disabled={isProcessing || isGeneratingOutline}
                className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Dựng GeoGebra 3D
              </button>
            </div>

            {ggbCode && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">Mã lệnh GeoGebra:</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(ggbCode);
                      setCopySuccess('Đã copy mã lệnh GeoGebra!');
                      setTimeout(() => setCopySuccess(null), 3000);
                    }}
                    className="text-[11px] text-indigo-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy size={12} /> Copy code
                  </button>
                </div>
                <pre className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl max-h-36 overflow-y-auto">
                  {ggbCode}
                </pre>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col min-h-[460px]">
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 pb-3 mb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Compass size={15} className="text-indigo-600" />
              Khung trực quan hóa GeoGebra 3D (Tương tác xoay 360°)
            </h3>

            {ggbCode ? (
              <div className="w-full h-[400px] border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <iframe
                  title="GeoGebra 3D View"
                  srcDoc={getIframeSrcdoc()}
                  className="w-full h-full border-none"
                />
              </div>
            ) : (
              <div className="w-full h-[400px] border border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-2">
                <Box size={36} className="text-slate-300 dark:text-slate-600" />
                <p className="text-xs">Nhập đề bài ở khung bên trái và bấm "Dựng GeoGebra 3D"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: MÔ PHỎNG KHỐI TRÒN XOAY OX (TOÁN 12) */}
      {/* ======================================================== */}
      {activeSubTab === 'revolution' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h3 className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Mô phỏng Khối tròn xoay Ox (Toán 12)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Ứng dụng tích phân tính thể tích: V = π ∫ [f(x)² - g(x)²] dx
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Đường phía trên y = f(x):
                </label>
                <input
                  type="text"
                  value={revFx}
                  onFocus={() => setFocusedInput('revFx')}
                  onChange={e => setRevFx(e.target.value)}
                  placeholder="sqrt(x)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Đường phía dưới y = g(x) (mặc định 0):
                </label>
                <input
                  type="text"
                  value={revGx}
                  onFocus={() => setFocusedInput('revGx')}
                  onChange={e => setRevGx(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Cận dưới x = a:
                  </label>
                  <input
                    type="text"
                    value={revA}
                    onFocus={() => setFocusedInput('revA')}
                    onChange={e => setRevA(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Cận trên x = b:
                  </label>
                  <input
                    type="text"
                    value={revB}
                    onFocus={() => setFocusedInput('revB')}
                    onChange={e => setRevB(e.target.value)}
                    placeholder="4"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Bàn phím ký hiệu nhanh */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Ký hiệu nhanh:
                </span>
                <div className="flex flex-wrap gap-1">
                  {['sqrt(x)', 'x^2', 'x^3', 'sin(x)', 'cos(x)', 'e^x', 'ln(x)', 'pi'].map(sym => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleInsertSymbol(sym)}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-mono font-bold cursor-pointer transition"
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateGeoGebra}
              className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles size={14} /> Dựng Mô hình Khối tròn xoay
            </button>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col min-h-[460px]">
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 pb-3 mb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Compass size={15} className="text-indigo-600" />
              Mô hình 3D Khối tròn xoay quanh trục Ox (GeoGebra)
            </h3>

            {ggbCode ? (
              <div className="w-full h-[400px] border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <iframe
                  title="Solid of Revolution View"
                  srcDoc={getIframeSrcdoc()}
                  className="w-full h-full border-none"
                />
              </div>
            ) : (
              <div className="w-full h-[400px] border border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-2">
                <Box size={36} className="text-slate-300 dark:text-slate-600" />
                <p className="text-xs">Bấm "Dựng Mô hình Khối tròn xoay" để xem mô hình 3D</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
