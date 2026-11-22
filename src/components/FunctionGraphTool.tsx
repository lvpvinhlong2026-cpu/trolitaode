import React, { useState, useRef, useEffect } from 'react';
import { 
  TrendingUp, Table, Copy, Download, CheckCircle2, RefreshCw, 
  Sparkles, Layers, Sliders, Eye, HelpCircle, Check, Compass,
  Type, Ruler, Hash, Move, Crosshair, RotateCcw, Plus, Trash2, Palette, Bold, X,
  Crop
} from 'lucide-react';
import { 
  analyzeFunction, 
  analyzeFromCoeffs, 
  analyzeFromCoeffsOnInterval, 
  analyzeFunctionOnInterval, 
  renderBBTToCanvas, 
  BBTData, 
  formatNum,
  IntervalMinMaxInfo,
  addDpiToBlob,
  parseFunctionCoeffs,
  formatPolyExpr
} from '../utils/bbtEngine';
import { cropCanvasToContent } from '../utils/dpiUtils';
import { 
  renderGraphToCanvas, 
  GraphConfig, 
  evalGraphFunction, 
  formatNumDisplay,
  getIntervalMinMax,
  GraphLabelHitbox,
  CustomTextAnnotation,
  calcDefiniteIntegral
} from '../utils/functionGraphEngine';
import InequalityGraphTool from './InequalityGraphTool';
import NumberLineTool from './NumberLineTool';
import MathFontSelector, { MathFontChoice, MATH_FONT_FAMILIES } from './MathFontSelector';

interface Props {
  apiKey?: string;
  model?: string;
  onNavigateToBBT?: () => void;
  onInsertImage?: (dataUrl: string) => void;
}

export default function FunctionGraphTool({ apiKey, model, onNavigateToBBT, onInsertImage }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<'graph' | 'inequality' | 'number_line'>('graph');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [fontScale, setFontScale] = useState<number>(1.0);
  const [graphFont, setGraphFont] = useState<MathFontChoice>('times');

  // Chuyển đổi tên font key thành chuỗi font-family chuẩn CSS/Canvas
  const getFontFamilyString = (fontKey: string) => {
    if (fontKey === 'latex') return MATH_FONT_FAMILIES.latex;
    return MATH_FONT_FAMILIES.times;
  };

  // Preload KaTeX và các phông toán học để Canvas vẽ chuẩn xác 100% không bị fallback
  const [fontsReady, setFontsReady] = useState<boolean>(false);

  useEffect(() => {
    if (typeof document !== 'undefined' && document.fonts) {
      Promise.all([
        document.fonts.load('20px KaTeX_Main'),
        document.fonts.load('bold 20px KaTeX_Main'),
        document.fonts.load('italic 20px KaTeX_Math'),
        document.fonts.load('italic bold 20px KaTeX_Math'),
        document.fonts.load('italic 23px KaTeX_Math'),
        document.fonts.load('20px "Times New Roman"'),
        document.fonts.load('20px "Cambria Math"')
      ]).then(() => {
        setFontsReady(true);
      }).catch(() => {
        setFontsReady(true);
      });
    } else {
      setFontsReady(true);
    }
  }, []);

  // ==========================================
  // STATE CHO TAB ĐỒ THỊ OXY
  // ==========================================
  const [graphConfig, setGraphConfig] = useState<GraphConfig>({
    type: 'rational_2_1',
    a: 1,
    b: -1,
    c: 1,
    d: 1,
    e: -1,
    xMin: -5.5,
    xMax: 5.5,
    yMin: -5.5,
    yMax: 5.5,
    showGrid: false,
    showTicks: false,
    tickStep: 1,
    showTickLabels: false,
    showExtrema: true,
    showIntersections: true,
    showAsymptotes: true,
    showCustomPoint: false,
    customPoint: { x: 2, label: 'M' },
    restrictInterval: false,
    intervalA: 0,
    intervalB: 2,
    intervalMode: 'highlight',
    showIntervalEndpoints: true,
    curveWidth: 2.4,
    curveColor: '#000000',
    axisWidth: 1.8,
    isBoldLabels: true,
    customTexts: []
  });
  const [graphMode, setGraphMode] = useState<'coeffs' | 'text'>('coeffs');
  const [graphFnInput, setGraphFnInput] = useState<string>('(x^2 - x + 1)/(x - 1)');

  // Xử lý khi người dùng gõ biểu thức tự do cho Đồ thị Oxy
  const handleGraphFnInputChange = (val: string) => {
    setGraphFnInput(val);
    if (!val.trim()) return;
    try {
      const p = parseFunctionCoeffs(val);
      const mappedType: GraphConfig['type'] = p.type === 'rational_1_1' ? 'rational' : p.type;
      setGraphConfig(prev => ({
        ...prev,
        type: mappedType,
        a: p.a,
        b: p.b,
        c: p.c,
        d: p.d,
        e: p.e,
      }));
    } catch (e) {
      // Bỏ qua lỗi cú pháp khi người dùng đang nhập dở
    }
  };
  const graphCanvasRef = useRef<HTMLCanvasElement>(null);
  const [graphDataUrl, setGraphDataUrl] = useState<string>('');
  const currentUnitScaleRef = useRef<number>(36);

  // STATE KÉO THẢ NHÃN & HỆ TRỤC (Origin O & Axis Numbers Dragging / Panning)
  const [labelHitboxes, setLabelHitboxes] = useState<GraphLabelHitbox[]>([]);
  const [hoveredLabelId, setHoveredLabelId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    active: boolean;
    type: 'label' | 'pan';
    hitbox?: GraphLabelHitbox;
    startMouseX: number;
    startMouseY: number;
    initialOffset?: { x: number; y: number };
    initialViewport?: { xMin: number; xMax: number; yMin: number; yMax: number };
  } | null>(null);

  // STATE THÊM TEXT / KÝ HIỆU TÙY BIẾN VÀO ĐỒ THỊ
  const [newTextContent, setNewTextContent] = useState<string>('(C)');
  const [newTextColor, setNewTextColor] = useState<string>('#000000');
  const [newTextSize, setNewTextSize] = useState<number>(22);
  const [selectedCustomTextId, setSelectedCustomTextId] = useState<string | null>(null);

  const handleAddCustomText = (textToAdd?: string) => {
    const text = (textToAdd !== undefined ? textToAdd : newTextContent).trim();
    if (!text) return;
    const existing = graphConfig.customTexts ?? [];
    const count = existing.length;
    const defX = Math.round(((graphConfig.xMax ?? 5.5) * 0.45 + (count % 3) * 0.7) * 10) / 10;
    const defY = Math.round(((graphConfig.yMax ?? 5.5) * 0.55 - Math.floor(count / 3) * 0.8) * 10) / 10;
    const newAnnotation: CustomTextAnnotation = {
      id: 'txt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      text,
      x: defX,
      y: defY,
      fontSize: newTextSize,
      color: newTextColor,
      isBold: graphConfig.isBoldLabels ?? true,
      isItalic: true
    };
    setGraphConfig(prev => ({
      ...prev,
      customTexts: [...(prev.customTexts ?? []), newAnnotation]
    }));
    setSelectedCustomTextId(newAnnotation.id);
  };

  const handleRemoveCustomText = (id: string) => {
    setGraphConfig(prev => ({
      ...prev,
      customTexts: (prev.customTexts ?? []).filter(t => t.id !== id)
    }));
    if (selectedCustomTextId === id) {
      setSelectedCustomTextId(null);
    }
  };

  // Phím tắt xóa text tùy biến trực tiếp trên đồ thị (Delete / Backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCustomTextId) {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        handleRemoveCustomText(selectedCustomTextId);
        setSelectedCustomTextId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCustomTextId]);

  // Render Đồ thị Oxy
  useEffect(() => {
    if (graphCanvasRef.current && activeSubTab === 'graph') {
      try {
        const result = renderGraphToCanvas(graphConfig, graphCanvasRef.current, 2.4, { 
          fontSizeScale: fontScale,
          fontFamily: getFontFamilyString(graphFont),
          selectedCustomTextId
        });
        if (result && result.hitboxes) {
          setLabelHitboxes(result.hitboxes);
        }
        if (result && result.unitScale) {
          currentUnitScaleRef.current = result.unitScale;
        }
        if (graphCanvasRef.current) {
          const cropped = cropCanvasToContent(graphCanvasRef.current, 6);
          setGraphDataUrl(cropped.toDataURL('image/png'));
        }
      } catch (err) {
        console.error('Lỗi render đồ thị Oxy:', err);
      }
    }
  }, [graphConfig, activeSubTab, fontScale, graphFont, fontsReady, selectedCustomTextId]);

  // Tọa độ chuột trong hệ tọa độ canvas CSS (440 x 400)
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = 440 / (rect.width || 440);
    const scaleY = 400 / (rect.height || 400);
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    // Tìm hitbox gần nhất được click (với padding 6px cho dễ click)
    const hit = labelHitboxes.find(h => 
      x >= h.x - 6 && x <= h.x + h.width + 6 && 
      y >= h.y - 6 && y <= h.y + h.height + 6
    );

    if (hit && hit.type === 'custom_text' && hit.customTextId) {
      setSelectedCustomTextId(hit.customTextId);
    } else if (!hit) {
      setSelectedCustomTextId(null);
    }

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    if (hit) {
      let initialOffset = { x: 0, y: 0 };
      if (hit.type === 'origin') {
        initialOffset = { x: graphConfig.originOffset?.x ?? 0, y: graphConfig.originOffset?.y ?? 0 };
      } else if (hit.type === 'ox') {
        const custom = graphConfig.oxLabelOffsets?.[hit.text];
        initialOffset = { x: custom?.offsetX ?? 0, y: custom?.offsetY ?? 0 };
      } else if (hit.type === 'oy') {
        const custom = graphConfig.oyLabelOffsets?.[hit.text];
        initialOffset = { x: custom?.offsetX ?? 0, y: custom?.offsetY ?? 0 };
      } else if (hit.type === 'axis_x') {
        initialOffset = { x: graphConfig.axisLabelXOffset?.x ?? 0, y: graphConfig.axisLabelXOffset?.y ?? 0 };
      } else if (hit.type === 'axis_y') {
        initialOffset = { x: graphConfig.axisLabelYOffset?.x ?? 0, y: graphConfig.axisLabelYOffset?.y ?? 0 };
      } else if (hit.type === 'custom_text' && hit.customTextId) {
        const target = graphConfig.customTexts?.find(t => t.id === hit.customTextId);
        if (target) {
          initialOffset = { x: target.x, y: target.y };
        }
      }

      setDragState({
        active: true,
        type: 'label',
        hitbox: hit,
        startMouseX: x,
        startMouseY: y,
        initialOffset
      });
    } else {
      setDragState({
        active: true,
        type: 'pan',
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        initialViewport: {
          xMin: graphConfig.xMin ?? -5.5,
          xMax: graphConfig.xMax ?? 5.5,
          yMin: graphConfig.yMin ?? -5.5,
          yMax: graphConfig.yMax ?? 5.5
        }
      });
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);

    if (!dragState?.active) {
      const hit = labelHitboxes.find(h => 
        x >= h.x - 6 && x <= h.x + h.width + 6 && 
        y >= h.y - 6 && y <= h.y + h.height + 6
      );
      setHoveredLabelId(hit ? hit.id : null);
      return;
    }

    if (dragState.type === 'label' && dragState.hitbox) {
      const dx = Math.round(x - dragState.startMouseX);
      const dy = Math.round(y - dragState.startMouseY);
      const hit = dragState.hitbox;

      if (hit.type === 'origin') {
        setGraphConfig(prev => ({
          ...prev,
          originOffset: {
            x: (dragState.initialOffset?.x ?? 0) + dx,
            y: (dragState.initialOffset?.y ?? 0) + dy
          }
        }));
      } else if (hit.type === 'ox') {
        setGraphConfig(prev => ({
          ...prev,
          oxLabelOffsets: {
            ...prev.oxLabelOffsets,
            [hit.text]: {
              ...prev.oxLabelOffsets?.[hit.text],
              offsetX: (dragState.initialOffset?.x ?? 0) + dx,
              offsetY: (dragState.initialOffset?.y ?? 0) + dy
            }
          }
        }));
      } else if (hit.type === 'oy') {
        setGraphConfig(prev => ({
          ...prev,
          oyLabelOffsets: {
            ...prev.oyLabelOffsets,
            [hit.text]: {
              ...prev.oyLabelOffsets?.[hit.text],
              offsetX: (dragState.initialOffset?.x ?? 0) + dx,
              offsetY: (dragState.initialOffset?.y ?? 0) + dy
            }
          }
        }));
      } else if (hit.type === 'axis_x') {
        setGraphConfig(prev => ({
          ...prev,
          axisLabelXOffset: {
            x: (dragState.initialOffset?.x ?? 0) + dx,
            y: (dragState.initialOffset?.y ?? 0) + dy
          }
        }));
      } else if (hit.type === 'axis_y') {
        setGraphConfig(prev => ({
          ...prev,
          axisLabelYOffset: {
            x: (dragState.initialOffset?.x ?? 0) + dx,
            y: (dragState.initialOffset?.y ?? 0) + dy
          }
        }));
      } else if (hit.type === 'custom_text' && hit.customTextId) {
        const unitScale = currentUnitScaleRef.current || 36;
        const mathDx = dx / unitScale;
        const mathDy = -dy / unitScale;
        setGraphConfig(prev => ({
          ...prev,
          customTexts: (prev.customTexts ?? []).map(t =>
            t.id === hit.customTextId
              ? {
                  ...t,
                  x: Math.round(((dragState.initialOffset?.x ?? 0) + mathDx) * 100) / 100,
                  y: Math.round(((dragState.initialOffset?.y ?? 0) + mathDy) * 100) / 100
                }
              : t
          )
        }));
      }
    } else if (dragState.type === 'pan' && dragState.initialViewport) {
      const canvas = graphCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const deltaScreenX = e.clientX - dragState.startMouseX;
      const deltaScreenY = e.clientY - dragState.startMouseY;

      const spanX = dragState.initialViewport.xMax - dragState.initialViewport.xMin;
      const spanY = dragState.initialViewport.yMax - dragState.initialViewport.yMin;

      const mathDx = -(deltaScreenX / (rect.width || 440)) * spanX;
      const mathDy = (deltaScreenY / (rect.height || 400)) * spanY;

      setGraphConfig(prev => ({
        ...prev,
        xMin: Math.round((dragState.initialViewport!.xMin + mathDx) * 100) / 100,
        xMax: Math.round((dragState.initialViewport!.xMax + mathDx) * 100) / 100,
        yMin: Math.round((dragState.initialViewport!.yMin + mathDy) * 100) / 100,
        yMax: Math.round((dragState.initialViewport!.yMax + mathDy) * 100) / 100
      }));
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragState?.active) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setDragState(null);
    }
  };

  // Click chuột phải trên text để xóa ngay lập tức
  const handleCanvasContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 440 / (rect.width || 440);
    const scaleY = 400 / (rect.height || 400);
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const hit = labelHitboxes.find(h => 
      h.type === 'custom_text' &&
      x >= h.x - 6 && x <= h.x + h.width + 6 && 
      y >= h.y - 6 && y <= h.y + h.height + 6
    );
    if (hit && hit.customTextId) {
      e.preventDefault();
      handleRemoveCustomText(hit.customTextId);
      setSelectedCustomTextId(null);
    }
  };

  const handleResetLabels = () => {
    setGraphConfig(prev => ({
      ...prev,
      originQuadrant: 'auto',
      originOffset: undefined,
      oxLabelOffsets: undefined,
      oyLabelOffsets: undefined,
      axisLabelXOffset: undefined,
      axisLabelYOffset: undefined
    }));
  };

  const handleRecenterOxy = () => {
    const range = Math.abs(graphConfig.xMax ?? 5.5);
    setGraphConfig(prev => ({
      ...prev,
      xMin: -range,
      xMax: range,
      yMin: -range,
      yMax: range
    }));
  };

  const getCanvasCursor = () => {
    if (dragState?.active) {
      return dragState.type === 'label' ? 'cursor-grabbing' : 'cursor-move';
    }
    if (hoveredLabelId) {
      return 'cursor-grab';
    }
    return 'cursor-crosshair';
  };

  // Sao chép ảnh vào Clipboard (Tự động cắt sạch khoảng trắng thừa, nhúng 300 DPI tối ưu Word)
  const handleCopyImage = async (dataUrl: string, title: string) => {
    try {
      let canvasToUse: HTMLCanvasElement | null = null;
      if (graphCanvasRef.current) {
        canvasToUse = cropCanvasToContent(graphCanvasRef.current, 6);
      }

      if (canvasToUse) {
        const blob = await new Promise<Blob | null>(resolve => canvasToUse!.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Không tạo được blob');
        const blobWithDpi = await addDpiToBlob(blob, 300);
        const croppedDataUrl = canvasToUse.toDataURL('image/png');
        const wordW = Math.round(canvasToUse.width / 2.5);
        const wordH = Math.round(canvasToUse.height / 2.5);
        const htmlSnippet = `<img src="${croppedDataUrl}" alt="${title}" width="${wordW}" height="${wordH}" style="display:inline-block; max-width:100%; height:auto;" />`;
        const htmlBlob = new Blob([htmlSnippet], { type: 'text/html' });

        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blobWithDpi, 'text/html': htmlBlob })
          ]);
        } catch {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blobWithDpi })
          ]);
        }
      } else {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const blobWithDpi = await addDpiToBlob(blob, 300);
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blobWithDpi })
        ]);
      }

      setCopySuccess(`✅ Đã copy ảnh "${title}" (cắt sát viền, không chừa khoảng trắng)! Dán (Ctrl+V) vào Word ảnh sẽ to rõ chuẩn in ấn.`);
      setTimeout(() => setCopySuccess(null), 4500);
    } catch (err) {
      console.error('Lỗi copy ảnh:', err);
      setCopySuccess('Không thể copy trực tiếp. Vui lòng bấm "Tải PNG" hoặc chuột phải vào ảnh chọn Copy Image.');
      setTimeout(() => setCopySuccess(null), 4000);
    }
  };

  // Tải ảnh PNG có nhúng 300 DPI (Cắt sạch khoảng trắng thừa)
  const handleDownloadImage = async (dataUrl: string, filename: string) => {
    try {
      if (graphCanvasRef.current) {
        const croppedCanvas = cropCanvasToContent(graphCanvasRef.current, 6);
        const blob = await new Promise<Blob | null>(resolve => croppedCanvas.toBlob(resolve, 'image/png'));
        if (blob) {
          const blobWithDpi = await addDpiToBlob(blob, 300);
          const url = URL.createObjectURL(blobWithDpi);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
          return;
        }
      }

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const blobWithDpi = await addDpiToBlob(blob, 300);
      const url = URL.createObjectURL(blobWithDpi);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      a.click();
    }
  };

  // Lắng nghe sự kiện từ Ribbon Bar (kiểu Microsoft Word)
  useEffect(() => {
    const handleRibbonAction = (e: Event) => {
      const ce = e as CustomEvent;
      if (!ce.detail) return;
      const { type, subtab, config, textExpr, fnType, inputMode } = ce.detail;
      if (type === 'switch_subtab' && subtab) {
        if (['graph', 'inequality', 'number_line'].includes(subtab)) {
          setActiveSubTab(subtab);
        }
      } else if (type === 'select_fn_type' && fnType) {
        const mappedType: GraphConfig['type'] = fnType === 'rational_1_1' ? 'rational' : fnType;
        if (fnType === 'cubic') setGraphConfig(prev => ({ ...prev, type: 'cubic', a: 1, b: 0, c: -3, d: 1, e: 0 }));
        else if (fnType === 'quartic') setGraphConfig(prev => ({ ...prev, type: 'quartic', a: 1, b: -2, c: -1, d: 0, e: 0 }));
        else if (fnType === 'rational' || fnType === 'rational_1_1') setGraphConfig(prev => ({ ...prev, type: 'rational', a: 2, b: 1, c: 1, d: -1, e: 0 }));
        else if (fnType === 'rational_2_1') setGraphConfig(prev => ({ ...prev, type: 'rational_2_1', a: 1, b: -1, c: 1, d: 1, e: -1 }));
        else setGraphConfig(prev => ({ ...prev, type: mappedType }));
      } else if (type === 'switch_input_mode' && inputMode) {
        setGraphMode(inputMode);
      } else if (type === 'copy_word') {
        if (activeSubTab === 'graph' && graphDataUrl) {
          handleCopyImage(graphDataUrl, 'Đồ thị Oxy');
        }
      } else if (type === 'open_crop') {
        let urlToUse = graphDataUrl;
        if (graphCanvasRef.current) {
          const cropped = cropCanvasToContent(graphCanvasRef.current, 6);
          urlToUse = cropped.toDataURL('image/png');
        }
        if (urlToUse) {
          window.dispatchEvent(new CustomEvent('lvp_open_crop_modal', {
            detail: {
              dataUrl: urlToUse,
              title: activeSubTab === 'graph' ? 'Đồ thị Oxy' : activeSubTab === 'inequality' ? 'Miền nghiệm BPT' : 'Trục số thực R'
            }
          }));
        }
      } else if (type === 'download_png') {
        if (activeSubTab === 'graph' && graphDataUrl) {
          handleDownloadImage(graphDataUrl, 'do_thi_oxy.png');
        }
      } else if (type === 'select_graph_preset' && config) {
        setGraphConfig(prev => ({ ...prev, ...config }));
        if (textExpr) setGraphFnInput(textExpr);
      }
    };
    window.addEventListener('lvp_ribbon_action', handleRibbonAction);
    return () => window.removeEventListener('lvp_ribbon_action', handleRibbonAction);
  }, [activeSubTab, graphDataUrl]);

  // Báo trạng thái lên Ribbon
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('lvp_graph_state_change', {
      detail: { activeSubTab, graphConfigType: graphConfig.type, graphMode }
    }));
  }, [activeSubTab, graphConfig.type, graphMode]);

  return (
    <div className="flex flex-col w-full space-y-4">
      {/* THÔNG BÁO COPY THÀNH CÔNG */}
      {copySuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{copySuccess}</span>
        </div>
      )}

      {/* RENDER TAB 3: MIỀN NGHIỆM BPT BẬC NHẤT HAI ẨN (OXY) */}
      {activeSubTab === 'inequality' && (
        <InequalityGraphTool fontScale={fontScale} graphFont={graphFont} />
      )}

      {/* RENDER TAB 4: TRỤC SỐ & TẬP CON CỦA R (KHOẢNG, ĐOẠN, NỬA KHOẢNG) */}
      {activeSubTab === 'number_line' && (
        <NumberLineTool fontScale={fontScale} graphFont={graphFont} isBold={graphConfig.isBoldLabels !== false} />
      )}

      {/* RENDER TAB 1: ĐỒ THỊ OXY */}
      {activeSubTab === 'graph' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================= */}
        {/* CỘT TRÁI: ĐIỀU KHIỂN & CẤU HÌNH (5 CỘT) */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-teal-100 dark:border-slate-800 shadow-xs space-y-4">
          <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={14} className="text-teal-600" />
                  Cấu hình hàm số:
                </span>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setGraphMode('coeffs')}
                    className={`px-2.5 py-1 rounded-md transition ${graphMode === 'coeffs' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Nhập hệ số (a,b,c,d,e)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGraphMode('text');
                      const bbtEquivalentType = graphConfig.type === 'rational' ? 'rational_1_1' : graphConfig.type;
                      const expr = formatPolyExpr(bbtEquivalentType, graphConfig.a, graphConfig.b, graphConfig.c, graphConfig.d ?? 0, graphConfig.e ?? 0);
                      if (expr) setGraphFnInput(expr);
                    }}
                    className={`px-2.5 py-1 rounded-md transition ${graphMode === 'text' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Gõ biểu thức f(x)
                  </button>
                </div>
              </div>

              {graphMode === 'coeffs' ? (
                <div className="space-y-3">
                  {/* Chọn dạng hàm */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'rational_2_1', label: 'Bậc 2 / 1: (ax²+bx+c)/(dx+e)', desc: 'Chương trình mới' },
                      { id: 'rational', label: 'Phân thức: (ax+b)/(cx+d)', desc: '1 tiệm cận đứng, 1 ngang' },
                      { id: 'cubic', label: 'Bậc 3: ax³+bx²+cx+d', desc: 'Có 2 hoặc 0 cực trị' },
                      { id: 'quartic', label: 'Bậc 4: ax⁴+bx²+c', desc: 'Trùng phương (1 hoặc 3 cực trị)' },
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          if (t.id === 'cubic') setGraphConfig({ ...graphConfig, type: 'cubic', a: 1, b: 0, c: -3, d: 1, e: 0 });
                          if (t.id === 'quartic') setGraphConfig({ ...graphConfig, type: 'quartic', a: 1, b: -2, c: -1, d: 0, e: 0 });
                          if (t.id === 'rational') setGraphConfig({ ...graphConfig, type: 'rational', a: 2, b: 1, c: 1, d: -1, e: 0 });
                          if (t.id === 'rational_2_1') setGraphConfig({ ...graphConfig, type: 'rational_2_1', a: 1, b: -1, c: 1, d: 1, e: -1 });
                        }}
                        className={`p-2 rounded-xl border text-left font-bold transition text-xs ${
                          graphConfig.type === t.id
                            ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border-teal-500 shadow-xs ring-1 ring-teal-400'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-xs truncate">{t.label}</div>
                        <div className="text-[10px] font-normal text-slate-400 truncate">{t.desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* Mẫu bài thi chuẩn SGK cho Đồ thị */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                      Mẫu SGK:
                    </span>
                    <select
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        if (graphConfig.type === 'rational_2_1') {
                          const presets = [
                            { id: 'model', a: 1, b: 1, c: 4, d: 1, e: 1, isModel: true },
                            { id: '1', a: 1, b: -1, c: 1, d: 1, e: -1 },
                            { id: '2', a: 1, b: 1, c: 1, d: 1, e: -1 },
                            { id: '3', a: 1, b: -2, c: -3, d: 1, e: -1 },
                            { id: '4', a: -1, b: 2, c: 1, d: 1, e: 1 },
                          ];
                          const p = presets.find(x => x.id === val);
                          if (p) {
                            setGraphConfig(prev => ({
                              ...prev,
                              a: p.a, b: p.b, c: p.c, d: p.d, e: p.e,
                              ...(p.isModel ? {
                                isBoldLabels: false,
                                curveWidth: 2.0,
                                axisWidth: 1.4,
                                showExtremaDots: false,
                                showIntersectionDots: false,
                                xMin: -6.5,
                                xMax: 6.5,
                                yMin: -7.5,
                                yMax: 7.5,
                                originQuadrant: 'top-left'
                              } : {})
                            }));
                            if (p.isModel) setGraphFont('latex');
                          }
                        } else if (graphConfig.type === 'rational') {
                          const presets = [
                            { id: '1', a: 2, b: 1, c: 1, d: -1 },
                            { id: '2', a: 1, b: -2, c: 1, d: 1 },
                            { id: '3', a: -1, b: 1, c: 2, d: -3 },
                          ];
                          const p = presets.find(x => x.id === val);
                          if (p) setGraphConfig(prev => ({ ...prev, a: p.a, b: p.b, c: p.c, d: p.d, e: 0 }));
                        } else if (graphConfig.type === 'cubic') {
                          const presets = [
                            { id: '1', a: 1, b: 0, c: -3, d: 1 },
                            { id: '2', a: 1, b: 0, c: -3, d: 0 },
                            { id: '3', a: -1, b: 3, c: 0, d: -1 },
                            { id: '4', a: 1, b: -3, c: 0, d: 2 },
                          ];
                          const p = presets.find(x => x.id === val);
                          if (p) setGraphConfig(prev => ({ ...prev, a: p.a, b: p.b, c: p.c, d: p.d, e: 0 }));
                        } else if (graphConfig.type === 'quartic') {
                          const presets = [
                            { id: '1', a: 1, b: -2, c: -1 },
                            { id: '2', a: 1, b: -2, c: -3 },
                            { id: '3', a: -1, b: 4, c: 1 },
                            { id: '4', a: 1, b: 2, c: 0 },
                          ];
                          const p = presets.find(x => x.id === val);
                          if (p) setGraphConfig(prev => ({ ...prev, a: p.a, b: p.b, c: p.c, d: 0, e: 0 }));
                        }
                      }}
                      className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-teal-500 cursor-pointer"
                    >
                      <option value="">-- Chọn bài mẫu SGK nhanh --</option>
                      {graphConfig.type === 'rational_2_1' && (
                        <>
                          <option value="model">⭐ (x²+x+4)/(x+1) [Hình mẫu LaTeX]</option>
                          <option value="1">(x²-x+1)/(x-1)</option>
                          <option value="2">(x²+x+1)/(x-1)</option>
                          <option value="3">(x²-2x-3)/(x-1)</option>
                          <option value="4">(-x²+2x+1)/(x+1)</option>
                        </>
                      )}
                      {graphConfig.type === 'rational' && (
                        <>
                          <option value="1">(2x+1)/(x-1)</option>
                          <option value="2">(x-2)/(x+1)</option>
                          <option value="3">(-x+1)/(2x-3)</option>
                        </>
                      )}
                      {graphConfig.type === 'cubic' && (
                        <>
                          <option value="1">x³ - 3x + 1</option>
                          <option value="2">x³ - 3x</option>
                          <option value="3">-x³ + 3x² - 1</option>
                          <option value="4">x³ - 3x² + 2</option>
                        </>
                      )}
                      {graphConfig.type === 'quartic' && (
                        <>
                          <option value="1">x⁴ - 2x² - 1</option>
                          <option value="2">x⁴ - 2x² - 3</option>
                          <option value="3">-x⁴ + 4x² + 1</option>
                          <option value="4">x⁴ + 2x²</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Ô nhập hệ số chi tiết */}
                  <div className={`grid gap-2 pt-1 ${graphConfig.type === 'rational_2_1' ? 'grid-cols-5' : 'grid-cols-4'}`}>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">a:</span>
                      <input
                        type="number"
                        step="any"
                        value={graphConfig.a}
                        onChange={e => setGraphConfig({ ...graphConfig, a: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 text-xs text-center border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 font-mono font-bold focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">b:</span>
                      <input
                        type="number"
                        step="any"
                        value={graphConfig.b}
                        onChange={e => setGraphConfig({ ...graphConfig, b: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 text-xs text-center border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 font-mono font-bold focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">c:</span>
                      <input
                        type="number"
                        step="any"
                        value={graphConfig.c}
                        onChange={e => setGraphConfig({ ...graphConfig, c: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 text-xs text-center border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 font-mono font-bold focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">d:</span>
                      <input
                        type="number"
                        step="any"
                        value={graphConfig.d ?? 0}
                        onChange={e => setGraphConfig({ ...graphConfig, d: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 text-xs text-center border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 font-mono font-bold focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 outline-none"
                      />
                    </div>
                    {graphConfig.type === 'rational_2_1' && (
                      <div>
                        <span className="text-[10px] font-bold text-teal-600 block mb-0.5">e:</span>
                        <input
                          type="number"
                          step="any"
                          value={graphConfig.e ?? 0}
                          onChange={e => setGraphConfig({ ...graphConfig, e: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 text-xs text-center border border-teal-500 rounded-lg bg-white dark:bg-slate-800 font-mono font-bold text-teal-700 dark:text-teal-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-500/20 outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Chế độ Gõ biểu thức f(x) tự do */
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                      <span>Nhập biểu thức hàm số f(x):</span>
                      <span className="text-[10px] text-teal-600 dark:text-teal-400 font-normal">
                        (Tự động nhận diện hàm bậc 3, bậc 4, phân thức 1/1, phân thức 2/1)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={graphFnInput}
                      onChange={e => handleGraphFnInputChange(e.target.value)}
                      placeholder="(x^2 - x + 1)/(x - 1)"
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-teal-500 dark:border-teal-600 bg-white dark:bg-slate-800 text-sm font-mono font-bold text-teal-900 dark:text-teal-100 outline-none shadow-xs focus:ring-2 focus:ring-teal-400/40"
                    />
                  </div>

                  {/* Gợi ý biểu thức mẫu */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                      Gợi ý mẫu:
                    </span>
                    <select
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        handleGraphFnInputChange(val);
                        if (val === '(x^2 + x + 4)/(x + 1)') {
                          setGraphFont('latex');
                          setGraphConfig(prev => ({
                            ...prev,
                            isBoldLabels: false,
                            curveWidth: 2.0,
                            axisWidth: 1.4,
                            showExtremaDots: false,
                            showIntersectionDots: false,
                            xMin: -6.5,
                            xMax: 6.5,
                            yMin: -7.5,
                            yMax: 7.5,
                            originQuadrant: 'top-left'
                          }));
                        }
                      }}
                      className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-teal-500 cursor-pointer"
                    >
                      <option value="">-- Chọn biểu thức mẫu SGK --</option>
                      <option value="(x^2 + x + 4)/(x + 1)">⭐ (x²+x+4)/(x+1) [Hình mẫu LaTeX]</option>
                      <option value="(x^2 - x + 1)/(x - 1)">Bậc 2/1: (x²-x+1)/(x-1)</option>
                      <option value="(2*x + 1)/(x - 1)">Phân thức: (2x+1)/(x-1)</option>
                      <option value="x^3 - 3*x + 1">Bậc 3: x³ - 3x + 1</option>
                      <option value="x^4 - 2*x^2 - 1">Bậc 4: x⁴ - 2x² - 1</option>
                      <option value="x^2 - 4*x + 3">Bậc 2: x² - 4x + 3</option>
                    </select>
                  </div>

                  {/* Thông tin dạng hàm đã nhận diện */}
                  <div className="p-2.5 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200 flex flex-wrap items-center justify-between gap-1.5">
                    <span>
                      Dạng hàm: <strong>{
                        graphConfig.type === 'rational_2_1' ? 'Phân thức bậc 2/1' :
                        graphConfig.type === 'rational' ? 'Phân thức bậc 1/1' :
                        graphConfig.type === 'cubic' ? 'Hàm bậc 3' :
                        graphConfig.type === 'quartic' ? 'Hàm bậc 4 trùng phương' : 'Hàm bậc 2'
                      }</strong>
                    </span>
                    <span className="font-mono text-[11px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-700 text-teal-800 dark:text-teal-300 font-bold">
                      y = {formatPolyExpr(graphConfig.type === 'rational' ? 'rational_1_1' : graphConfig.type, graphConfig.a, graphConfig.b, graphConfig.c, graphConfig.d ?? 0, graphConfig.e ?? 0) || graphFnInput}
                    </span>
                  </div>
                </div>
              )}

              {/* PHẠM VI & MIỀN VẼ (OXY) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={13} className="text-teal-600" />
                    Phạm vi & Miền vẽ:
                  </span>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setGraphConfig(prev => ({
                        ...prev,
                        restrictInterval: false,
                        integralArea: prev.integralArea ? { ...prev.integralArea, enabled: false } : undefined
                      }))}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        !graphConfig.restrictInterval && !graphConfig.integralArea?.enabled
                          ? 'bg-teal-600 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      Toàn miền ℝ
                    </button>
                    <button
                      type="button"
                      onClick={() => setGraphConfig(prev => ({
                        ...prev,
                        restrictInterval: true,
                        intervalA: prev.intervalA ?? prev.integralArea?.a ?? 0,
                        intervalB: prev.intervalB ?? prev.integralArea?.b ?? 2,
                        intervalMode: 'only',
                        showIntervalEndpoints: prev.showIntervalEndpoints ?? true,
                        integralArea: prev.integralArea ? { ...prev.integralArea, enabled: false } : undefined
                      }))}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        graphConfig.restrictInterval && !graphConfig.integralArea?.enabled
                          ? 'bg-teal-600 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      Đoạn [a; b]
                    </button>
                    <button
                      type="button"
                      onClick={() => setGraphConfig(prev => ({
                        ...prev,
                        restrictInterval: false,
                        integralArea: {
                          enabled: true,
                          a: prev.integralArea?.a ?? prev.intervalA ?? -1,
                          b: prev.integralArea?.b ?? prev.intervalB ?? 2,
                          gType: prev.integralArea?.gType ?? 'zero',
                          gLineM: prev.integralArea?.gLineM ?? 1,
                          gLineN: prev.integralArea?.gLineN ?? 0,
                          style: prev.integralArea?.style ?? 'hatch',
                          hatchAngle: prev.integralArea?.hatchAngle ?? 45,
                          hatchSpacing: prev.integralArea?.hatchSpacing ?? 8,
                          showBoundLines: prev.integralArea?.showBoundLines ?? true,
                          showAreaLabel: prev.integralArea?.showAreaLabel ?? true,
                          areaLabelText: prev.integralArea?.areaLabelText ?? 'S'
                        }
                      }))}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        graphConfig.integralArea?.enabled
                          ? 'bg-teal-600 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      Tô tích phân (S)
                    </button>
                  </div>
                </div>

                {/* NỘI DUNG CHẾ ĐỘ ĐOẠN [a; b] */}
                {graphConfig.restrictInterval && !graphConfig.integralArea?.enabled && (
                  <div className="p-3 bg-teal-50/70 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800/60 space-y-2.5 animate-fade-in text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">Đầu mút a:</span>
                        <input
                          type="number"
                          step="any"
                          value={graphConfig.intervalA ?? 0}
                          onChange={e => setGraphConfig({
                            ...graphConfig,
                            intervalA: parseFloat(e.target.value) || 0
                          })}
                          className="w-full px-2 py-1 text-xs text-center border rounded-lg bg-white dark:bg-slate-800 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">Đầu mút b:</span>
                        <input
                          type="number"
                          step="any"
                          value={graphConfig.intervalB ?? 2}
                          onChange={e => setGraphConfig({
                            ...graphConfig,
                            intervalB: parseFloat(e.target.value) || 0
                          })}
                          className="w-full px-2 py-1 text-xs text-center border rounded-lg bg-white dark:bg-slate-800 font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                        <input
                          type="checkbox"
                          checked={graphConfig.showIntervalEndpoints ?? true}
                          onChange={e => setGraphConfig({
                            ...graphConfig,
                            showIntervalEndpoints: e.target.checked
                          })}
                          className="rounded text-teal-600"
                        />
                        Gióng tọa độ 2 đầu mút A, B (Ox, Oy)
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400">Chọn nhanh:</span>
                      {[
                        { a: 0, b: 2 },
                        { a: -1, b: 2 },
                        { a: -2, b: 2 },
                        { a: 1, b: 3 },
                      ].map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setGraphConfig({
                            ...graphConfig,
                            intervalA: p.a,
                            intervalB: p.b
                          })}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                            (graphConfig.intervalA ?? 0) === p.a && (graphConfig.intervalB ?? 2) === p.b
                              ? 'bg-teal-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-teal-50'
                          }`}
                        >
                          [{p.a}; {p.b}]
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          const a = Math.min(graphConfig.intervalA ?? 0, graphConfig.intervalB ?? 2);
                          const b = Math.max(graphConfig.intervalA ?? 0, graphConfig.intervalB ?? 2);
                          const pad = Math.max(1.5, (b - a) * 0.35);
                          setGraphConfig({
                            ...graphConfig,
                            xMin: Math.floor(a - pad),
                            xMax: Math.ceil(b + pad),
                            yMin: Math.floor(a - pad),
                            yMax: Math.ceil(b + pad)
                          });
                        }}
                        className="ml-auto px-2 py-0.5 rounded text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 hover:bg-teal-200 transition flex items-center gap-1"
                        title="Tự động thu phóng tỷ lệ Oxy vừa vặn với đoạn [a; b]"
                      >
                        🔍 Căn vừa Oxy
                      </button>
                    </div>

                    {(() => {
                      const mm = getIntervalMinMax(graphConfig);
                      if (mm.hasAsymptote) {
                        return (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                            ⚠️ Có tiệm cận đứng cắt qua đoạn [{graphConfig.intervalA}; {graphConfig.intervalB}].
                          </p>
                        );
                      }
                      if (mm.maxVal !== null && mm.minVal !== null) {
                        return (
                          <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-teal-200 dark:border-teal-800 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                              <span>✨ GTLN (Max):</span>
                              <span>
                                max = {formatNumDisplay(mm.maxVal)} (tại x = {mm.maxAt.map(formatNumDisplay).join(', ')})
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 font-bold">
                              <span>✨ GTNN (Min):</span>
                              <span>
                                min = {formatNumDisplay(mm.minVal)} (tại x = {mm.minAt.map(formatNumDisplay).join(', ')})
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}

                {/* NỘI DUNG CHẾ ĐỘ TÔ MIỀN DIỆN TÍCH TÍCH PHÂN */}
                {graphConfig.integralArea?.enabled && (
                  <div className="p-3 bg-teal-50/70 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-800/60 space-y-2.5 text-xs animate-fade-in">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block">Cận dưới (a):</span>
                        <input
                          type="number"
                          step="0.5"
                          value={graphConfig.integralArea?.a ?? -1}
                          onChange={e => setGraphConfig({
                            ...graphConfig,
                            integralArea: { ...graphConfig.integralArea!, a: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full mt-1 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block">Cận trên (b):</span>
                        <input
                          type="number"
                          step="0.5"
                          value={graphConfig.integralArea?.b ?? 2}
                          onChange={e => setGraphConfig({
                            ...graphConfig,
                            integralArea: { ...graphConfig.integralArea!, b: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full mt-1 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">Đường biên dưới g(x):</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setGraphConfig({
                            ...graphConfig,
                            integralArea: { ...graphConfig.integralArea!, gType: 'zero' }
                          })}
                          className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                            (graphConfig.integralArea?.gType ?? 'zero') === 'zero'
                              ? 'bg-teal-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          Trục hoành Ox (y = 0)
                        </button>
                        <button
                          type="button"
                          onClick={() => setGraphConfig({
                            ...graphConfig,
                            integralArea: { ...graphConfig.integralArea!, gType: 'linear' }
                          })}
                          className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                            graphConfig.integralArea?.gType === 'linear'
                              ? 'bg-teal-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          Đường thẳng y = mx + n
                        </button>
                      </div>
                      {graphConfig.integralArea?.gType === 'linear' && (
                        <div className="grid grid-cols-2 gap-2 mt-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div>
                            <span className="text-[10px] text-slate-400">Hệ số góc m:</span>
                            <input
                              type="number"
                              step="0.5"
                              value={graphConfig.integralArea?.gLineM ?? 1}
                              onChange={e => setGraphConfig({
                                ...graphConfig,
                                integralArea: { ...graphConfig.integralArea!, gLineM: parseFloat(e.target.value) || 0 }
                              })}
                              className="w-full mt-0.5 p-1 text-xs border rounded font-semibold"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400">Tung độ gốc n:</span>
                            <input
                              type="number"
                              step="0.5"
                              value={graphConfig.integralArea?.gLineN ?? 0}
                              onChange={e => setGraphConfig({
                                ...graphConfig,
                                integralArea: { ...graphConfig.integralArea!, gLineN: parseFloat(e.target.value) || 0 }
                              })}
                              className="w-full mt-0.5 p-1 text-xs border rounded font-semibold"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'hatch', label: 'Gạch sọc xiên' },
                        { id: 'fill', label: 'Màu mờ' },
                        { id: 'both', label: 'Gạch + Màu' }
                      ].map(st => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setGraphConfig({
                            ...graphConfig,
                            integralArea: { ...graphConfig.integralArea!, style: st.id as any }
                          })}
                          className={`py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                            (graphConfig.integralArea?.style ?? 'hatch') === st.id
                              ? 'bg-teal-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">Mật độ:</span>
                      {[
                        { label: 'Thưa', sp: 11 },
                        { label: 'Vừa', sp: 8 },
                        { label: 'Dày', sp: 5 }
                      ].map(d => (
                        <button
                          key={d.label}
                          type="button"
                          onClick={() => setGraphConfig({
                            ...graphConfig,
                            integralArea: { ...graphConfig.integralArea!, hatchSpacing: d.sp }
                          })}
                          className={`flex-1 py-0.5 text-[10px] font-semibold rounded ${
                            (graphConfig.integralArea?.hatchSpacing ?? 8) === d.sp
                              ? 'bg-teal-200 dark:bg-teal-800 text-teal-900 dark:text-teal-100 font-bold'
                              : 'bg-white dark:bg-slate-800 border'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setGraphConfig({
                          ...graphConfig,
                          integralArea: {
                            ...graphConfig.integralArea!,
                            hatchAngle: (graphConfig.integralArea?.hatchAngle ?? 45) === 45 ? -45 : 45
                          }
                        })}
                        className="px-2 py-0.5 text-[10px] font-bold bg-white dark:bg-slate-800 border rounded hover:bg-slate-100 cursor-pointer"
                        title="Đổi hướng nghiêng gạch sọc (45° hoặc -45°)"
                      >
                        Góc: {(graphConfig.integralArea?.hatchAngle ?? 45)}°
                      </button>
                    </div>

                    {/* Mẫu nhanh tích phân chuẩn SGK */}
                    <div className="pt-1.5 border-t border-teal-200/60 dark:border-teal-800/60">
                      <span className="text-[10px] font-bold text-teal-800 dark:text-teal-300 block mb-1">
                        Mẫu nhanh đề thi THPT:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {[
                          {
                            label: 'Parabol y = 4 - x² trên [-2; 2]',
                            apply: () => {
                              setGraphConfig(prev => ({
                                ...prev,
                                type: 'quadratic',
                                a: -1, b: 0, c: 4,
                                xMin: -3.5, xMax: 3.5, yMin: -2, yMax: 5.5,
                                integralArea: {
                                  enabled: true, a: -2, b: 2, gType: 'zero', style: 'hatch',
                                  hatchAngle: 45, hatchSpacing: 8, showBoundLines: true, showAreaLabel: true, areaLabelText: 'S'
                                }
                              }));
                            }
                          },
                          {
                            label: 'Parabol & Đường thẳng y = x + 2',
                            apply: () => {
                              setGraphConfig(prev => ({
                                ...prev,
                                type: 'quadratic',
                                a: 1, b: 0, c: 0,
                                xMin: -2.5, xMax: 3.5, yMin: -1.5, yMax: 5.5,
                                integralArea: {
                                  enabled: true, a: -1, b: 2, gType: 'linear', gLineM: 1, gLineN: 2, style: 'hatch',
                                  hatchAngle: 45, hatchSpacing: 8, showBoundLines: true, showAreaLabel: true, areaLabelText: 'S'
                                }
                              }));
                            }
                          },
                          {
                            label: 'Hàm bậc 3 y = x³ - 3x trên [0; √3]',
                            apply: () => {
                              setGraphConfig(prev => ({
                                ...prev,
                                type: 'cubic',
                                a: 1, b: 0, c: -3, d: 0,
                                xMin: -2.5, xMax: 2.5, yMin: -3, yMax: 3,
                                integralArea: {
                                  enabled: true, a: 0, b: 1.73, gType: 'zero', style: 'hatch',
                                  hatchAngle: -45, hatchSpacing: 7, showBoundLines: true, showAreaLabel: true, areaLabelText: 'S'
                                }
                              }));
                            }
                          }
                        ].map((m, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={m.apply}
                            className="px-2 py-0.5 text-[10px] font-semibold bg-white dark:bg-slate-800 hover:bg-teal-100 rounded border border-teal-200 dark:border-teal-800 cursor-pointer text-teal-800 dark:text-teal-200 transition"
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hiển thị giá trị tích phân tính được */}
                    {(() => {
                      const f = (x: number) => evalGraphFunction(graphConfig, x);
                      const g = (x: number) => graphConfig.integralArea?.gType === 'linear'
                        ? ((graphConfig.integralArea?.gLineM ?? 1) * x + (graphConfig.integralArea?.gLineN ?? 0))
                        : 0;
                      const a = graphConfig.integralArea?.a ?? -1;
                      const b = graphConfig.integralArea?.b ?? 2;
                      const areaVal = calcDefiniteIntegral(f, g, a, b);
                      return (
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-teal-300 dark:border-teal-700 flex items-center justify-between text-teal-900 dark:text-teal-200 font-bold text-[11px]">
                          <span>Diện tích S = ∫ₐᵇ |f(x) - g(x)| dx:</span>
                          <span className="text-sm text-teal-600 dark:text-teal-400">≈ {formatNumDisplay(areaVal)}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Checkbox bật/tắt hiển thị gọn gàng */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer hover:text-teal-700 dark:hover:text-teal-300 transition">
                  <input
                    type="checkbox"
                    checked={graphConfig.showExtrema ?? true}
                    onChange={e => setGraphConfig({
                      ...graphConfig,
                      showExtrema: e.target.checked,
                      showExtremaDots: e.target.checked
                    })}
                    className="rounded text-teal-600 focus:ring-teal-500/20"
                  />
                  <span>Tọa độ & điểm cực trị</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-teal-700 dark:hover:text-teal-300 transition">
                  <input
                    type="checkbox"
                    checked={graphConfig.showIntersections ?? true}
                    onChange={e => setGraphConfig({ ...graphConfig, showIntersections: e.target.checked })}
                    className="rounded text-teal-600 focus:ring-teal-500/20"
                  />
                  <span>Giao điểm trục Ox, Oy</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-teal-700 dark:hover:text-teal-300 transition">
                  <input
                    type="checkbox"
                    checked={graphConfig.showAsymptotes ?? true}
                    onChange={e => setGraphConfig({ ...graphConfig, showAsymptotes: e.target.checked })}
                    className="rounded text-teal-600 focus:ring-teal-500/20"
                  />
                  <span>Đường tiệm cận</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-teal-700 dark:hover:text-teal-300 transition">
                  <input
                    type="checkbox"
                    checked={graphConfig.showCustomPoint ?? false}
                    onChange={e => {
                      const checked = e.target.checked;
                      setGraphConfig({
                        ...graphConfig,
                        showCustomPoint: checked,
                        customPoint: graphConfig.customPoint ?? { x: 2, label: 'M' }
                      });
                    }}
                    className="rounded text-teal-600 focus:ring-teal-500/20"
                  />
                  <span>Thêm điểm M trên đồ thị</span>
                </label>
              </div>

              {/* KHU VỰC CẤU HÌNH ĐIỂM THUỘC ĐỒ THỊ */}
              {graphConfig.showCustomPoint && (() => {
                const customX = graphConfig.customPoint?.x ?? 2;
                const customY = evalGraphFunction(graphConfig, customX);
                const customLabel = graphConfig.customPoint?.label ?? 'M';
                return (
                  <div className="p-3 bg-teal-50/70 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800/60 space-y-2.5 animate-fade-in text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                        <span>🎯</span>
                        Cấu hình điểm thuộc đồ thị:
                      </span>
                      <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800">
                        {customLabel ? `${customLabel}(${formatNumDisplay(customX)}; ${customY !== null ? formatNumDisplay(customY) : '?'})` : `(${formatNumDisplay(customX)}; ${customY !== null ? formatNumDisplay(customY) : '?'})`}
                      </span>
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-center">
                      {/* Hoành độ x */}
                      <div className="col-span-4">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                          Hoành độ (x₀):
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={customX}
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            setGraphConfig({
                              ...graphConfig,
                              customPoint: {
                                ...graphConfig.customPoint,
                                x: isNaN(val) ? 0 : val,
                                label: customLabel
                              }
                            });
                          }}
                          className="w-full px-2 py-1.5 text-center font-mono font-bold text-xs rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-100"
                        />
                      </div>

                      {/* Tung độ y = f(x) (tự động tính) */}
                      <div className="col-span-4">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                          Tung độ y = f(x₀):
                        </label>
                        <div className={`w-full px-2 py-1.5 text-center font-mono font-bold text-xs rounded-lg border ${
                          customY !== null 
                            ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200' 
                            : 'border-rose-300 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                        } truncate`}>
                          {customY !== null ? formatNumDisplay(customY) : 'K.X.Đ'}
                        </div>
                      </div>

                      {/* Tên nhãn điểm */}
                      <div className="col-span-4">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                          Tên điểm:
                        </label>
                        <input
                          type="text"
                          maxLength={8}
                          value={customLabel}
                          onChange={e => {
                            setGraphConfig({
                              ...graphConfig,
                              customPoint: {
                                ...graphConfig.customPoint,
                                x: customX,
                                label: e.target.value
                              }
                            });
                          }}
                          placeholder="M"
                          className="w-full px-2 py-1.5 text-center font-mono font-bold text-xs rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-100"
                        />
                      </div>
                    </div>

                    {/* Nút chọn nhanh hoành độ x */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400">Chọn nhanh x:</span>
                      {[-3, -2, -1, 1, 2, 3].map(qx => (
                        <button
                          key={qx}
                          type="button"
                          onClick={() => {
                            setGraphConfig({
                              ...graphConfig,
                              customPoint: {
                                ...graphConfig.customPoint,
                                x: qx,
                                label: customLabel
                              }
                            });
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                            customX === qx
                              ? 'bg-teal-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-teal-50'
                          }`}
                        >
                          x = {qx}
                        </button>
                      ))}

                      <span className="text-[10px] font-bold text-slate-400 ml-1.5">Tên:</span>
                      {['M', 'A', 'B', ''].map((name, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setGraphConfig({
                              ...graphConfig,
                              customPoint: {
                                ...graphConfig.customPoint,
                                x: customX,
                                label: name
                              }
                            });
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                            customLabel === name
                              ? 'bg-teal-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-teal-50'
                          }`}
                        >
                          {name ? name : '(Trống)'}
                        </button>
                      ))}
                    </div>

                    {customY === null && (
                      <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                        ⚠️ x = {customX} trùng với tiệm cận đứng nên hàm số không xác định! Hãy chọn giá trị x khác.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* KHU VỰC CẤU HÌNH ĐỘ ĐẬM NHẠT NÉT VẼ ĐỒ THỊ & CHỮ SỐ */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sliders size={14} className="text-teal-600" />
                    Độ đậm nhạt nét vẽ & chữ số:
                  </span>
                  <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 border border-slate-200 dark:border-slate-700">
                    Nét: {graphConfig.curveWidth ?? 2.4}px · {graphConfig.isBoldLabels !== false ? 'Chữ Đậm' : 'Chữ Thường'}
                  </span>
                </div>

                {/* 1. Độ dày nét vẽ đồ thị */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Độ dày nét cong đồ thị:</span>
                    <span className="font-mono font-bold text-teal-700 dark:text-teal-300">{graphConfig.curveWidth ?? 2.4}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1.2"
                      max="4.5"
                      step="0.2"
                      value={graphConfig.curveWidth ?? 2.4}
                      onChange={e => setGraphConfig({ ...graphConfig, curveWidth: parseFloat(e.target.value) })}
                      className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                      title="Kéo chỉnh độ dày nét vẽ đồ thị"
                    />
                    <div className="flex bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                      {[
                        { width: 1.6, label: 'Mảnh' },
                        { width: 2.2, label: 'Vừa' },
                        { width: 2.8, label: 'Chuẩn SGK' },
                        { width: 3.6, label: 'Đậm' },
                      ].map(item => (
                        <button
                          key={item.width}
                          type="button"
                          onClick={() => setGraphConfig({ ...graphConfig, curveWidth: item.width })}
                          className={`px-1.5 py-0.5 rounded transition ${
                            Math.abs((graphConfig.curveWidth ?? 2.4) - item.width) < 0.15
                              ? 'bg-teal-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Màu sắc nét vẽ đồ thị & Độ đậm chữ số */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                  {/* Màu nét vẽ */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      Màu nét vẽ đồ thị:
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[
                        { color: '#000000', title: 'Đen (Chuẩn SGK & Thi)' },
                        { color: '#2563eb', title: 'Xanh dương' },
                        { color: '#dc2626', title: 'Đỏ' },
                        { color: '#0d9488', title: 'Xanh ngọc' },
                        { color: '#7c3aed', title: 'Tím' },
                      ].map(c => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => setGraphConfig({ ...graphConfig, curveColor: c.color })}
                          title={c.title}
                          className={`w-5 h-5 rounded-full border-2 transition ${
                            (graphConfig.curveColor ?? '#000000') === c.color
                              ? 'border-teal-500 scale-110 shadow-xs'
                              : 'border-transparent opacity-80 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Độ đậm chữ số */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      Chữ số & nhãn Oxy:
                    </label>
                    <div className="flex bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setGraphConfig({ ...graphConfig, isBoldLabels: true })}
                        className={`flex-1 py-1 rounded text-center transition ${
                          graphConfig.isBoldLabels !== false
                            ? 'bg-teal-600 text-white shadow-2xs font-extrabold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                        title="Chữ và số in đậm chuẩn in ấn SGK, rõ nét khi chèn Word"
                      >
                        In đậm (Bold)
                      </button>
                      <button
                        type="button"
                        onClick={() => setGraphConfig({ ...graphConfig, isBoldLabels: false })}
                        className={`flex-1 py-1 rounded text-center transition ${
                          graphConfig.isBoldLabels === false
                            ? 'bg-teal-600 text-white shadow-2xs font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                        title="Chữ và số nét thường thanh mảnh"
                      >
                        Nét thường
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Kích thước chấm tròn cực trị & giao điểm */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-semibold text-slate-600 dark:text-slate-400 text-[11px]">
                    Chấm tròn cực trị & giao điểm:
                  </span>
                  <div className="flex bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                    {[
                      { r: 1.8, label: 'Nhỏ (1.8px)' },
                      { r: 2.4, label: 'Chuẩn SGK (2.4px)' },
                      { r: 3.2, label: 'Vừa (3.2px)' }
                    ].map(item => (
                      <button
                        key={item.r}
                        type="button"
                        onClick={() => setGraphConfig({ ...graphConfig, dotRadius: item.r })}
                        className={`px-2 py-0.5 rounded transition cursor-pointer ${
                          Math.abs((graphConfig.dotRadius ?? 2.4) - item.r) < 0.2
                            ? 'bg-teal-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* KHU VỰC THÊM TEXT / KÝ HIỆU VÀO ĐỒ THỊ (CUSTOM TEXT ANNOTATIONS) */}
              <div className="p-3 bg-teal-50/70 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800/70 space-y-2.5 text-xs animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                    <Type size={14} className="text-teal-600" />
                    Thêm Text / Ký hiệu vào đồ thị:
                  </span>
                  <span className="text-[10px] text-teal-700 dark:text-teal-300 font-bold">
                    {(graphConfig.customTexts?.length ?? 0)} nhãn trên hình
                  </span>
                </div>

                {/* Input text + Nút thêm */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={newTextContent}
                      onChange={e => setNewTextContent(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleAddCustomText();
                        }
                      }}
                      placeholder="Nhập: (C), y = f(x), d, A(-1;3)..."
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-950 dark:text-teal-100 placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddCustomText()}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs transition shrink-0"
                    title="Thêm text vào đồ thị (sau đó có thể kéo rê chuột trực tiếp)"
                  >
                    <Plus size={13} />
                    Thêm Text
                  </button>
                </div>

                {/* Nút bấm mẫu nhanh các ký hiệu đề thi chuẩn */}
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 mr-0.5">Mẫu nhanh:</span>
                  {[
                    '(C)',
                    'y = f(x)',
                    '(C\')',
                    '(d)',
                    '(P)',
                    'A',
                    'B',
                    'I',
                    'M',
                    'Δ',
                  ].map(sample => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => {
                        setNewTextContent(sample);
                        handleAddCustomText(sample);
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-700 hover:bg-teal-100 transition"
                      title={`Bấm để thêm ngay ${sample} vào đồ thị`}
                    >
                      +{sample}
                    </button>
                  ))}
                </div>

                {/* Danh sách các Text đã thêm */}
                {graphConfig.customTexts && graphConfig.customTexts.length > 0 && (
                  <div className="pt-2 border-t border-teal-200/60 dark:border-teal-800 space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                    {graphConfig.customTexts.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-2 py-1 bg-white dark:bg-slate-800 rounded-lg border border-teal-200/80 dark:border-teal-800 text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-teal-900 dark:text-teal-200 font-mono">
                            {item.text}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            ({item.x}; {item.y})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomText(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Xóa text này khỏi đồ thị"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-[10px] text-teal-800/80 dark:text-teal-300/80 leading-relaxed bg-white/70 dark:bg-slate-800/70 p-2 rounded-lg border border-teal-200/50 dark:border-teal-800/50 space-y-1">
                  <div>💡 <strong>Di chuyển:</strong> Bấm trực tiếp vào chữ trên đồ thị để kéo rê đến vị trí mong muốn.</div>
                  <div>🗑️ <strong>Xóa nhanh:</strong> Click vào chữ để hiện nút <strong>[Xóa]</strong>, hoặc nhấn phím <strong>Delete / Backspace</strong>, hoặc <strong>nhấp chuột phải</strong> vào chữ trên đồ thị.</div>
                </div>
              </div>
            </div>

            {/* HÀNG NÚT TÁC VỤ SAO CHÉP & TẢI ẢNH */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
            {onInsertImage && (
              <button
                onClick={() => {
                  if (graphCanvasRef.current) {
                    const cropped = cropCanvasToContent(graphCanvasRef.current, 6);
                    onInsertImage(cropped.toDataURL('image/png'));
                  } else if (graphDataUrl) {
                    onInsertImage(graphDataUrl);
                  }
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                title="Chèn ảnh đồ thị 300 DPI vào đề thi"
              >
                <CheckCircle2 size={16} />
                <span>Chèn vào đề thi</span>
              </button>
            )}

            <button
              onClick={() => {
                const currentUrl = graphDataUrl;
                const label = 'Đồ thị Oxy';
                handleCopyImage(currentUrl, label);
              }}
              className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              title="Sao chép toàn bộ ảnh vào Clipboard (PNG) để dán trực tiếp Ctrl+V vào Word"
            >
              <Copy size={15} />
              Copy ảnh (Ctrl+V vào Word)
            </button>

            <button
              onClick={() => {
                const currentUrl = graphDataUrl;
                const fname = 'Do_thi_Oxy_300dpi.png';
                handleDownloadImage(currentUrl, fname);
              }}
              className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              title="Tải ảnh PNG độ phân giải 300 DPI"
            >
              <Download size={15} />
              Tải PNG
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CỘT PHẢI: KHUNG VẼ CANVAS TRỰC TIẾP (7 CỘT) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-teal-100 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center min-h-[460px]">
          <div className="w-full flex flex-col gap-2 pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
            {/* Cụm Phông chữ, Nét vẽ, Độ đậm chữ & Cỡ chữ (Layout 2 dòng chuẩn mẫu) */}
            <MathFontSelector
              font={graphFont}
              onFontChange={val => {
                setGraphFont(val);
                if (val === 'latex') {
                  setGraphConfig(prev => ({
                    ...prev,
                    isBoldLabels: false,
                    showExtremaDots: false,
                    curveWidth: 2.0,
                    axisWidth: 1.4
                  }));
                } else {
                  setGraphConfig(prev => ({
                    ...prev,
                    isBoldLabels: true,
                    curveWidth: 2.6,
                    axisWidth: 1.8
                  }));
                }
              }}
              stroke={(graphConfig.curveWidth ?? 2.4) <= 1.8 ? 'thin' : (graphConfig.curveWidth ?? 2.4) >= 3.2 ? 'bold' : 'standard'}
              onStrokeChange={s => {
                const w = s === 'thin' ? 1.6 : s === 'bold' ? 3.6 : 2.4;
                setGraphConfig(prev => ({ ...prev, curveWidth: w }));
              }}
              isBold={graphConfig.isBoldLabels !== false}
              onBoldChange={b => setGraphConfig(prev => ({ ...prev, isBoldLabels: b }))}
              size="sm"
              extraRow1Right={
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-500">
                    Cỡ: <span className="font-mono text-teal-700 dark:text-teal-300 font-bold">{Math.round(fontScale * 100)}%</span>
                  </span>
                  <input
                    type="range"
                    min="0.75"
                    max="1.6"
                    step="0.05"
                    value={fontScale}
                    onChange={e => setFontScale(parseFloat(e.target.value))}
                    className="w-16 sm:w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => setFontScale(prev => Math.max(0.75, Math.round((prev - 0.1) * 10) / 10))}
                      className="px-1 py-0.2 text-[10px] font-bold rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-teal-100 cursor-pointer"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontScale(prev => Math.min(1.6, Math.round((prev + 0.1) * 10) / 10))}
                      className="px-1 py-0.2 text-[10px] font-bold rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-teal-100 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              }
            />

            {/* Dòng 2 (Chỉ có ở Đồ thị Oxy): Thu phóng Oxy & Lưới tọa độ */}
            {activeSubTab === 'graph' && (
              <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                {/* Thu phóng phạm vi Oxy */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Ruler size={13} className="text-teal-600" />
                    Thu phóng: <span className="font-mono font-bold text-teal-700 dark:text-teal-300">±{Math.abs(graphConfig.xMax ?? 5.5)}</span>
                  </span>
                  <input
                    type="range"
                    min="3"
                    max="10"
                    step="0.5"
                    value={Math.abs(graphConfig.xMax ?? 5.5)}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      setGraphConfig({
                        ...graphConfig,
                        xMin: -val,
                        xMax: val,
                        yMin: -val,
                        yMax: val
                      });
                    }}
                    className="w-20 sm:w-28 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const current = Math.abs(graphConfig.xMax ?? 5.5);
                        const next = Math.min(10, Math.round((current + 0.5) * 10) / 10);
                        setGraphConfig({ ...graphConfig, xMin: -next, xMax: next, yMin: -next, yMax: next });
                      }}
                      className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 cursor-pointer"
                      title="Mở rộng trục Oxy (-)"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const current = Math.abs(graphConfig.xMax ?? 5.5);
                        const next = Math.max(3, Math.round((current - 0.5) * 10) / 10);
                        setGraphConfig({ ...graphConfig, xMin: -next, xMax: next, yMin: -next, yMax: next });
                      }}
                      className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 cursor-pointer"
                      title="Thu hẹp trục Oxy (+)"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Bước chia & Lưới */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-500">Bước:</span>
                    <div className="flex bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                      {[
                        { step: 1, label: '1 (chuẩn)' },
                        { step: 0.5, label: '0.5' },
                        { step: 2, label: '2' },
                      ].map(item => (
                        <button
                          key={item.step}
                          type="button"
                          onClick={() => setGraphConfig({
                            ...graphConfig,
                            tickStep: item.step,
                            tickStepX: item.step,
                            tickStepY: item.step,
                            gridStep: item.step
                          })}
                          className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                            (graphConfig.tickStep ?? 1) === item.step
                              ? 'bg-teal-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={graphConfig.showTicks ?? false}
                      onChange={e => setGraphConfig({ ...graphConfig, showTicks: e.target.checked })}
                      className="rounded text-teal-600"
                    />
                    <span>Vạch chia</span>
                  </label>

                  <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={graphConfig.showTickLabels ?? false}
                      onChange={e => setGraphConfig({ 
                        ...graphConfig, 
                        showTickLabels: e.target.checked,
                        showTicks: e.target.checked ? true : graphConfig.showTicks 
                      })}
                      className="rounded text-teal-600"
                    />
                    <span>Đánh số</span>
                  </label>

                  <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={graphConfig.showGrid ?? false}
                      onChange={e => setGraphConfig({ ...graphConfig, showGrid: e.target.checked })}
                      className="rounded text-teal-600"
                    />
                    <span>Lưới ô</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="w-full flex items-center justify-center p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 overflow-x-auto">


            {/* Canvas Đồ thị Oxy */}
            <div className={`relative ${activeSubTab === 'graph' ? 'block' : 'hidden'}`}>
              <canvas
                ref={graphCanvasRef}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerLeave={handleCanvasPointerUp}
                onContextMenu={handleCanvasContextMenu}
                className={`max-w-full h-auto rounded-lg shadow-xs bg-white border border-slate-200 select-none touch-none ${getCanvasCursor()}`}
                title="Click & kéo trực tiếp chữ O, số trên trục hoặc Text. Nhấp chuột phải vào Text để xóa nhanh!"
              />

              {/* Lớp phủ tương tác nhanh cho Custom Text trên đồ thị */}
              {(() => {
                if (!selectedCustomTextId) return null;
                const selectedText = graphConfig.customTexts?.find(t => t.id === selectedCustomTextId);
                const selectedHitbox = labelHitboxes.find(h => h.type === 'custom_text' && h.customTextId === selectedCustomTextId);
                if (!selectedText || !selectedHitbox) return null;

                const leftPercent = ((selectedHitbox.x + selectedHitbox.width / 2) / 440) * 100;
                const topPercent = (selectedHitbox.y / 400) * 100;

                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${leftPercent}%`,
                      top: `${Math.max(2, topPercent - 5)}%`,
                      transform: 'translate(-50%, -100%)',
                      zIndex: 30
                    }}
                    className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/95 text-white px-2.5 py-1 rounded-full shadow-xl border border-teal-500/50 backdrop-blur-md animate-fade-in text-xs whitespace-nowrap"
                  >
                    <span className="font-mono font-bold text-amber-300">
                      {selectedText.text}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveCustomText(selectedText.id);
                        setSelectedCustomTextId(null);
                      }}
                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-full font-bold flex items-center gap-1 text-[11px] transition shadow-xs cursor-pointer"
                      title="Xóa text này khỏi đồ thị (Phím tắt: Delete hoặc Backspace)"
                    >
                      <Trash2 size={12} />
                      <span>Xóa</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomTextId(null);
                      }}
                      className="p-0.5 text-slate-400 hover:text-white rounded-full transition cursor-pointer"
                      title="Bỏ chọn"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
