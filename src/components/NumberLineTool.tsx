import React, { useState, useRef, useEffect } from 'react';
import { 
  Ruler, Copy, Download, CheckCircle2, RotateCcw, 
  Sparkles, Layers, Check
} from 'lucide-react';
import { 
  renderNumberLineToCanvas, 
  renderSetOperationsToCanvas,
  IntervalItem, 
  NumberLineConfig, 
  SUBSET_DEFINITIONS, 
  parseIntervalString 
} from '../utils/numberLineEngine';
import { addDpiToBlob, cropCanvasToContent } from '../utils/dpiUtils';
import { MATH_FONT_FAMILIES } from './MathFontSelector';

interface Props {
  fontScale?: number;
  graphFont?: string;
  isBold?: boolean;
}

export default function NumberLineTool({ fontScale = 1.0, graphFont = 'times', isBold = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Chế độ: 'single' (trục số đơn), 'operation' (phép toán tập hợp)
  const [mode, setMode] = useState<'single' | 'operation'>('single');

  // Chế độ trục số đơn
  const [interval, setInterval] = useState<IntervalItem>({
    start: -2,
    end: 3,
    startInclusive: false,
    endInclusive: false,
    startLabel: 'a',
    endLabel: 'b'
  });
  const [customInput, setCustomInput] = useState<string>('(a; b)');

  // Chế độ phép toán tập hợp
  const [setA, setSetA] = useState<IntervalItem>({
    start: -2,
    end: 3,
    startInclusive: true,
    endInclusive: true,
    startLabel: '-2',
    endLabel: '3'
  });
  const [setB, setSetB] = useState<IntervalItem>({
    start: 1,
    end: 5,
    startInclusive: false,
    endInclusive: false,
    startLabel: '1',
    endLabel: '5'
  });
  const [opType, setOpType] = useState<'intersection' | 'union' | 'difference' | 'difference_ba'>('intersection');

  const getFontFamily = (f: string) => {
    if (f === 'latex') return MATH_FONT_FAMILIES.latex;
    return MATH_FONT_FAMILIES.times;
  };

  // Render canvas
  useEffect(() => {
    if (canvasRef.current) {
      try {
        const fontFam = getFontFamily(graphFont);
        if (mode === 'single') {
          renderNumberLineToCanvas({ interval, fontFamily: fontFam, fontSizeScale: fontScale, isBold }, canvasRef.current, 2.4, {
            fontFamily: fontFam,
            fontSizeScale: fontScale,
            isBold,
            width: 640,
            height: 125
          });
        } else if (mode === 'operation') {
          renderSetOperationsToCanvas(setA, setB, opType, canvasRef.current, 2.4, {
            fontFamily: fontFam,
            fontSizeScale: fontScale,
            isBold,
            width: 580
          });
        }
        setDataUrl(canvasRef.current.toDataURL('image/png'));
      } catch (err) {
        console.error('Lỗi render trục số:', err);
      }
    }
  }, [mode, interval, setA, setB, opType, fontScale, graphFont, isBold]);

  // Copy ảnh 300 DPI (Auto-crop sát viền để hình luôn to lớn như BBT)
  const handleCopy = async () => {
    try {
      if (!canvasRef.current) return;
      const cropped = cropCanvasToContent(canvasRef.current, 24);
      const blob = await new Promise<Blob | null>(resolve => cropped.toBlob(resolve, 'image/png'));
      if (!blob) return;
      const blobWithDpi = await addDpiToBlob(blob, 300);
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blobWithDpi })
      ]);
      setCopySuccess('Đã copy ảnh Trục số (300 DPI)! Dán (Ctrl+V) vào Word sẽ to lớn, sắc nét chuẩn in ấn.');
      setTimeout(() => setCopySuccess(null), 4500);
    } catch {
      setCopySuccess('Không thể copy trực tiếp. Vui lòng bấm "Tải PNG".');
      setTimeout(() => setCopySuccess(null), 4000);
    }
  };

  // Tải ảnh PNG 300 DPI (Auto-crop)
  const handleDownload = async () => {
    try {
      if (!canvasRef.current) return;
      const cropped = cropCanvasToContent(canvasRef.current, 24);
      const blob = await new Promise<Blob | null>(resolve => cropped.toBlob(resolve, 'image/png'));
      if (!blob) return;
      const blobWithDpi = await addDpiToBlob(blob, 300);
      const url = URL.createObjectURL(blobWithDpi);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Truc_so_300dpi.png';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'Truc_so_300dpi.png';
      a.click();
    }
  };

  // Nhập chuỗi tập hợp
  const handleApplyCustomInput = (str?: string) => {
    const text = (str || customInput).trim();
    const parsed = parseIntervalString(text);
    if (parsed) {
      setInterval(parsed);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* THÔNG BÁO COPY */}
      {copySuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-xs animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{copySuccess}</span>
        </div>
      )}

      {/* CHUYỂN ĐỔI CHẾ ĐỘ VẼ TRỤC SỐ */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              mode === 'single'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            📏 Trục số đơn (Tập tùy biến)
          </button>
          <button
            type="button"
            onClick={() => setMode('operation')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              mode === 'operation'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            🔀 Phép toán tập hợp (Giao, Hợp, Hiệu)
          </button>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
          Chuẩn SGK Toán 10: Gạch chéo /////// phần bị loại bỏ
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================= */}
        {/* CỘT TRÁI: ĐIỀU KHIỂN & CHỌN MẪU (5 CỘT) */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          {mode === 'single' && (
            <>
              {/* CHỌN NHANH DẠNG TẬP CON SGK */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 block">
                  Chọn nhanh dạng tập con của ℝ:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {SUBSET_DEFINITIONS.map((def, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInterval(def.interval);
                        setCustomInput(def.symbol);
                      }}
                      className="px-2 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-center transition cursor-pointer"
                    >
                      <div className="font-mono font-bold text-xs text-teal-800 dark:text-teal-200">{def.symbol}</div>
                      <div className="text-[9px] text-slate-500 truncate">{def.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* NHẬP TẬP HỢP TÙY CHỌN */}
              <div className="p-3 bg-teal-50/70 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 space-y-2 text-xs">
                <span className="font-extrabold text-teal-900 dark:text-teal-200 block">
                  ✍️ Nhập tập hợp (ký hiệu hoặc số cụ thể):
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleApplyCustomInput();
                    }}
                    placeholder="Ví dụ: (a; b), [-2; 3], [0; 5), (-inf; 4]..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-950 dark:text-teal-100 font-mono font-bold text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyCustomInput()}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs transition cursor-pointer"
                  >
                    Vẽ trục
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="text-[10px] font-bold text-slate-400">Ví dụ:</span>
                  {['[-3; 2]', '(-1; 4]', '[0; +inf)', '(-inf; 3)', '(-2; 5)'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setCustomInput(s);
                        handleApplyCustomInput(s);
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-700 hover:bg-teal-100 transition cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* TÙY CHỈNH MỐC START VÀ END */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  ⚙️ Tùy chỉnh chi tiết 2 mốc đầu mút:
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {/* Mốc Start */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block">Mốc đầu (Start):</span>
                    <input
                      type="text"
                      value={interval.startLabel ?? (interval.start === '-inf' ? '-∞' : interval.start.toString())}
                      onChange={e => {
                        const val = e.target.value.trim();
                        setInterval(prev => ({
                          ...prev,
                          startLabel: val,
                          start: (val === '-inf' || val === '-∞') ? '-inf' : (parseFloat(val) || -2)
                        }));
                      }}
                      className="w-full px-2 py-1 text-center font-bold text-xs rounded border bg-white dark:bg-slate-800"
                    />
                    <div className="flex gap-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setInterval(prev => ({ ...prev, startInclusive: false }))}
                        className={`flex-1 py-0.5 rounded text-[10px] font-bold border transition ${
                          !interval.startInclusive ? 'bg-teal-600 text-white border-teal-600' : 'bg-white dark:bg-slate-800'
                        }`}
                      >
                        ( Ngoặc tròn
                      </button>
                      <button
                        type="button"
                        onClick={() => setInterval(prev => ({ ...prev, startInclusive: true }))}
                        className={`flex-1 py-0.5 rounded text-[10px] font-bold border transition ${
                          interval.startInclusive ? 'bg-teal-600 text-white border-teal-600' : 'bg-white dark:bg-slate-800'
                        }`}
                      >
                        [ Ngoặc vuông
                      </button>
                    </div>
                  </div>

                  {/* Mốc End */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block">Mốc cuối (End):</span>
                    <input
                      type="text"
                      value={interval.endLabel ?? (interval.end === '+inf' ? '+∞' : interval.end.toString())}
                      onChange={e => {
                        const val = e.target.value.trim();
                        setInterval(prev => ({
                          ...prev,
                          endLabel: val,
                          end: (val === '+inf' || val === '+∞') ? '+inf' : (parseFloat(val) || 3)
                        }));
                      }}
                      className="w-full px-2 py-1 text-center font-bold text-xs rounded border bg-white dark:bg-slate-800"
                    />
                    <div className="flex gap-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setInterval(prev => ({ ...prev, endInclusive: false }))}
                        className={`flex-1 py-0.5 rounded text-[10px] font-bold border transition ${
                          !interval.endInclusive ? 'bg-teal-600 text-white border-teal-600' : 'bg-white dark:bg-slate-800'
                        }`}
                      >
                        ) Ngoặc tròn
                      </button>
                      <button
                        type="button"
                        onClick={() => setInterval(prev => ({ ...prev, endInclusive: true }))}
                        className={`flex-1 py-0.5 rounded text-[10px] font-bold border transition ${
                          interval.endInclusive ? 'bg-teal-600 text-white border-teal-600' : 'bg-white dark:bg-slate-800'
                        }`}
                      >
                        ] Ngoặc vuông
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {mode === 'operation' && (
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">Chọn phép toán:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-bold">
                  {[
                    { type: 'intersection', label: 'Giao A ∩ B' },
                    { type: 'union', label: 'Hợp A ∪ B' },
                    { type: 'difference', label: 'Hiệu A \\ B' },
                    { type: 'difference_ba', label: 'Hiệu B \\ A' },
                  ].map(op => (
                    <button
                      key={op.type}
                      type="button"
                      onClick={() => setOpType(op.type as any)}
                      className={`py-1.5 px-1 rounded-lg border transition cursor-pointer text-center text-xs ${
                        opType === op.type ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-50 dark:bg-slate-800'
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nhập Tập A */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">
                    Tập A: {setA.startInclusive ? '[' : '('}{setA.start}; {setA.end}{setA.endInclusive ? ']' : ')'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSetA(prev => ({ ...prev, startInclusive: !prev.startInclusive }))}
                      className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold border bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Đổi dấu ngoặc đầu mút trái"
                    >
                      {setA.startInclusive ? '[' : '('}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSetA(prev => ({ ...prev, endInclusive: !prev.endInclusive }))}
                      className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold border bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Đổi dấu ngoặc đầu mút phải"
                    >
                      {setA.endInclusive ? ']' : ')'}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={setA.start as number}
                    onChange={e => setSetA({ ...setA, start: parseFloat(e.target.value) || 0, startLabel: e.target.value })}
                    className="w-1/2 p-1 text-center font-bold rounded border bg-white dark:bg-slate-900"
                    placeholder="Mốc đầu A"
                  />
                  <input
                    type="number"
                    value={setA.end as number}
                    onChange={e => setSetA({ ...setA, end: parseFloat(e.target.value) || 0, endLabel: e.target.value })}
                    className="w-1/2 p-1 text-center font-bold rounded border bg-white dark:bg-slate-900"
                    placeholder="Mốc cuối A"
                  />
                </div>
              </div>

              {/* Nhập Tập B */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">
                    Tập B: {setB.startInclusive ? '[' : '('}{setB.start}; {setB.end}{setB.endInclusive ? ']' : ')'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSetB(prev => ({ ...prev, startInclusive: !prev.startInclusive }))}
                      className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold border bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Đổi dấu ngoặc đầu mút trái"
                    >
                      {setB.startInclusive ? '[' : '('}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSetB(prev => ({ ...prev, endInclusive: !prev.endInclusive }))}
                      className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold border bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Đổi dấu ngoặc đầu mút phải"
                    >
                      {setB.endInclusive ? ']' : ')'}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={setB.start as number}
                    onChange={e => setSetB({ ...setB, start: parseFloat(e.target.value) || 0, startLabel: e.target.value })}
                    className="w-1/2 p-1 text-center font-bold rounded border bg-white dark:bg-slate-900"
                    placeholder="Mốc đầu B"
                  />
                  <input
                    type="number"
                    value={setB.end as number}
                    onChange={e => setSetB({ ...setB, end: parseFloat(e.target.value) || 0, endLabel: e.target.value })}
                    className="w-1/2 p-1 text-center font-bold rounded border bg-white dark:bg-slate-900"
                    placeholder="Mốc cuối B"
                  />
                </div>
              </div>
            </div>
          )}

          {/* HÀNG NÚT COPY & TẢI ẢNH */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Copy size={15} />
              Copy ảnh (Ctrl+V vào Word)
            </button>
            <button
              onClick={handleDownload}
              className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Download size={15} />
              Tải PNG
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CỘT PHẢI: KHUNG VẼ CANVAS TRỤC SỐ (7 CỘT) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-teal-100 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center min-h-[460px]">
          <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
            <span className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Ruler size={15} className="text-teal-600" />
              Hình vẽ Trục số các tập con của ℝ:
            </span>
          </div>

          <div className="w-full flex items-center justify-center p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 overflow-x-auto">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto rounded-lg shadow-xs bg-white border border-slate-200"
            />
          </div>

          <div className="w-full mt-3 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
            <div>💡 <strong>Quy ước dấu ngoặc:</strong> Ngoặc tròn <code>( )</code> khi không lấy dấu bằng (bất đẳng thức ngặt &lt;, &gt;); Ngoặc vuông <code>[ ]</code> khi có lấy dấu bằng (≤, ≥).</div>
            <div>💡 Các nét gạch chéo song song <code>///////</code> biểu diễn <strong>phần không thuộc tập hợp</strong> (bị loại bỏ).</div>
          </div>
        </div>
      </div>
    </div>
  );
}
