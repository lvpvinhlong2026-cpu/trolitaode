import React, { useState, useRef, useEffect } from 'react';
import { 
  TrendingUp, Table, Copy, Download, CheckCircle2, RefreshCw, 
  Sparkles, Layers, Sliders, Eye, HelpCircle, Check, Compass,
  Type, Ruler, Hash
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
import { 
  renderGraphToCanvas, 
  GraphConfig, 
  evalGraphFunction, 
  formatNumDisplay,
  getIntervalMinMax
} from '../utils/functionGraphEngine';
import { copyCroppedImageToClipboard, downloadCroppedImage } from '../utils/imageCropper';

interface Props {
  apiKey?: string;
  model?: string;
}

export default function FunctionGraphTool({ apiKey, model }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<'bbt' | 'graph'>('bbt');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [fontScale, setFontScale] = useState<number>(1.0);
  const [graphFont, setGraphFont] = useState<string>('times');

  // Chuyển đổi tên font key thành chuỗi font-family chuẩn CSS/Canvas
  const getFontFamilyString = (fontKey: string) => {
    switch (fontKey) {
      case 'cambria':
        return '"Cambria Math", "Cambria", serif';
      case 'latex':
        return '"KaTeX_Math", "KaTeX_Main", "Latin Modern Roman", "Computer Modern", serif';
      case 'sans':
        return '"Be Vietnam Pro", system-ui, sans-serif';
      case 'times':
      default:
        return '"Times New Roman", "STIX Two Text", "Cambria Math", serif';
    }
  };

  // ==========================================
  // STATE CHO TAB BẢNG BIẾN THIÊN (BBT)
  // ==========================================
  const [bbtMode, setBbtMode] = useState<'coeffs' | 'text'>('coeffs');
  const [bbtType, setBbtType] = useState<'rational_2_1' | 'rational_1_1' | 'cubic' | 'quartic'>('rational_2_1');
  const [bbtCoeffs, setBbtCoeffs] = useState({
    a: 1,
    b: -1,
    c: 1,
    d: 1,
    e: -1
  });
  const [bbtFnInput, setBbtFnInput] = useState('(x^2 - x + 1)/(x - 1)');
  const [bbtUseInterval, setBbtUseInterval] = useState<boolean>(false);
  const [bbtInterval, setBbtInterval] = useState<{ a: number; b: number }>({ a: 0, b: 2 });
  const [bbtMinMax, setBbtMinMax] = useState<IntervalMinMaxInfo | null>(null);
  const bbtCanvasRef = useRef<HTMLCanvasElement>(null);
  const [bbtDataUrl, setBbtDataUrl] = useState<string>('');

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
    showIntervalEndpoints: true
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

  // Render BBT
  useEffect(() => {
    if (bbtCanvasRef.current && activeSubTab === 'bbt') {
      try {
        let analyzed: BBTData;
        if (bbtUseInterval) {
          const res = bbtMode === 'coeffs'
            ? analyzeFromCoeffsOnInterval(
                bbtType,
                bbtCoeffs.a,
                bbtCoeffs.b,
                bbtCoeffs.c,
                bbtCoeffs.d,
                bbtCoeffs.e,
                bbtInterval.a,
                bbtInterval.b
              )
            : analyzeFunctionOnInterval(bbtFnInput, bbtInterval.a, bbtInterval.b);
          analyzed = res.bbt;
          setBbtMinMax(res.minMax);
        } else {
          setBbtMinMax(null);
          if (bbtMode === 'coeffs') {
            analyzed = analyzeFromCoeffs(
              bbtType,
              bbtCoeffs.a,
              bbtCoeffs.b,
              bbtCoeffs.c,
              bbtCoeffs.d,
              bbtCoeffs.e
            );
          } else {
            analyzed = analyzeFunction(bbtFnInput);
          }
        }
        renderBBTToCanvas(analyzed, bbtCanvasRef.current, 2.4, { 
          fontSizeScale: fontScale,
          fontFamily: getFontFamilyString(graphFont)
        });
        setBbtDataUrl(bbtCanvasRef.current.toDataURL('image/png'));
      } catch (err) {
        console.error('Lỗi phân tích hàm số BBT:', err);
      }
    }
  }, [bbtCoeffs, bbtType, bbtMode, bbtFnInput, bbtUseInterval, bbtInterval, activeSubTab, fontScale, graphFont]);

  // Render Đồ thị Oxy
  useEffect(() => {
    if (graphCanvasRef.current && activeSubTab === 'graph') {
      try {
        renderGraphToCanvas(graphConfig, graphCanvasRef.current, 2.4, { 
          fontSizeScale: fontScale,
          fontFamily: getFontFamilyString(graphFont)
        });
        setGraphDataUrl(graphCanvasRef.current.toDataURL('image/png'));
      } catch (err) {
        console.error('Lỗi render đồ thị Oxy:', err);
      }
    }
  }, [graphConfig, activeSubTab, fontScale, graphFont]);

  // Sao chép ảnh vào Clipboard (Tự động cắt sát bao hình padding ~24px, nhúng 300 DPI tối ưu Word)
  const handleCopyImage = async (dataUrl: string, title: string) => {
    try {
      const ok = await copyCroppedImageToClipboard(dataUrl, 300, 24);
      if (ok) {
        setCopySuccess(`Đã copy ảnh "${title}" (cắt sát viền 24px, 300 DPI)! Dán (Ctrl+V) vào Word ảnh sẽ tự động tràn đều trang và đậm nét.`);
      } else {
        setCopySuccess('Không thể copy trực tiếp. Vui lòng bấm "Tải PNG" hoặc chuột phải vào ảnh chọn Copy Image.');
      }
      setTimeout(() => setCopySuccess(null), 4500);
    } catch (err) {
      console.error('Lỗi copy ảnh:', err);
      setCopySuccess('Vui lòng bấm "Tải PNG" hoặc chuột phải vào ảnh chọn Copy Image.');
      setTimeout(() => setCopySuccess(null), 4000);
    }
  };

  // Tải ảnh PNG có nhúng 300 DPI và cắt sát bao hình 24px
  const handleDownloadImage = async (dataUrl: string, filename: string) => {
    await downloadCroppedImage(dataUrl, filename, 300, 24);
  };

  return (
    <div className="flex flex-col w-full space-y-4">
      {/* HEADER CÔNG CỤ */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-teal-100 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <TrendingUp size={22} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              CÔNG CỤ ĐỒ THỊ HÀM SỐ & BẢNG BIẾN THIÊN (300 DPI)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tự động tính đạo hàm, cực trị, tiệm cận — Xuất ảnh độ nét cao chuẩn in ấn cho Microsoft Word & PowerPoint
            </p>
          </div>
        </div>

        {/* Chuyển tab giữa BBT và Đồ thị Oxy */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('bbt')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
              activeSubTab === 'bbt'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Table size={15} />
            Bảng biến thiên (BBT)
          </button>
          <button
            onClick={() => setActiveSubTab('graph')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
              activeSubTab === 'graph'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <TrendingUp size={15} />
            Đồ thị Oxy
          </button>
        </div>
      </div>

      {/* THÔNG BÁO COPY THÀNH CÔNG */}
      {copySuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{copySuccess}</span>
        </div>
      )}

      {/* GIAO DIỆN CHÍNH: 2 CỘT TỐI ƯU KHÔNG GIAN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================= */}
        {/* CỘT TRÁI: ĐIỀU KHIỂN & CẤU HÌNH (5 CỘT) */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-teal-100 dark:border-slate-800 shadow-xs space-y-4">
          {/* TAB 1: BẢNG BIẾN THIÊN */}
          {activeSubTab === 'bbt' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={14} className="text-teal-600" />
                  Cấu hình hàm số:
                </span>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    onClick={() => setBbtMode('coeffs')}
                    className={`px-2.5 py-1 rounded-md transition ${bbtMode === 'coeffs' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-500'}`}
                  >
                    Nhập hệ số (a,b,c,d,e)
                  </button>
                  <button
                    onClick={() => setBbtMode('text')}
                    className={`px-2.5 py-1 rounded-md transition ${bbtMode === 'text' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-500'}`}
                  >
                    Gõ biểu thức f(x)
                  </button>
                </div>
              </div>

              {bbtMode === 'coeffs' ? (
                <div className="space-y-3">
                  {/* Chọn dạng hàm */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'rational_2_1', label: 'Bậc 2 / 1: (ax²+bx+c)/(dx+e)', desc: 'Chương trình mới' },
                      { id: 'rational_1_1', label: 'Phân thức: (ax+b)/(cx+d)', desc: '1 tiệm cận đứng, 1 ngang' },
                      { id: 'cubic', label: 'Bậc 3: ax³+bx²+cx+d', desc: 'Có 2 hoặc 0 cực trị' },
                      { id: 'quartic', label: 'Bậc 4: ax⁴+bx²+c', desc: 'Trùng phương (1 hoặc 3 cực trị)' },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setBbtType(t.id as any);
                          if (t.id === 'rational_2_1') setBbtCoeffs({ a: 1, b: -1, c: 1, d: 1, e: -1 });
                          if (t.id === 'rational_1_1') setBbtCoeffs({ ...bbtCoeffs, a: 2, b: 1, c: 1, d: -1 });
                          if (t.id === 'cubic') setBbtCoeffs({ ...bbtCoeffs, a: 1, b: 0, c: -3, d: 0 });
                          if (t.id === 'quartic') setBbtCoeffs({ ...bbtCoeffs, a: 1, b: -2, c: -3, d: 0, e: 0 });
                        }}
                        className={`p-2 rounded-xl border text-left font-bold transition ${
                          bbtType === t.id
                            ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border-teal-500 shadow-xs ring-1 ring-teal-400'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-xs truncate">{t.label}</div>
                        <div className="text-[10px] font-normal text-slate-400 truncate">{t.desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* Presets mẫu chuẩn SGK */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Mẫu bài thi chuẩn SGK:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {bbtType === 'rational_2_1' && [
                        { label: '(x²-x+1)/(x-1)', a: 1, b: -1, c: 1, d: 1, e: -1 },
                        { label: '(x²+x+1)/(x-1)', a: 1, b: 1, c: 1, d: 1, e: -1 },
                        { label: '(x²-2x-3)/(x-1)', a: 1, b: -2, c: -3, d: 1, e: -1 },
                        { label: '(-x²+2x+1)/(x+1)', a: -1, b: 2, c: 1, d: 1, e: 1 },
                      ].map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => setBbtCoeffs({ a: p.a, b: p.b, c: p.c, d: p.d, e: p.e })}
                          className="px-2.5 py-1 text-[11px] rounded-lg border font-semibold bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-50 transition"
                        >
                          {p.label}
                        </button>
                      ))}

                      {bbtType === 'rational_1_1' && [
                        { label: '(2x+1)/(x-1)', a: 2, b: 1, c: 1, d: -1 },
                        { label: '(x-2)/(x+1)', a: 1, b: -2, c: 1, d: 1 },
                        { label: '(-x+1)/(2x-3)', a: -1, b: 1, c: 2, d: -3 },
                      ].map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => setBbtCoeffs({ ...bbtCoeffs, a: p.a, b: p.b, c: p.c, d: p.d })}
                          className="px-2.5 py-1 text-[11px] rounded-lg border font-semibold bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-50 transition"
                        >
                          {p.label}
                        </button>
                      ))}

                      {bbtType === 'cubic' && [
                        { label: 'x³ - 3x', a: 1, b: 0, c: -3, d: 0 },
                        { label: '-x³ + 3x² - 1', a: -1, b: 3, c: 0, d: -1 },
                        { label: 'x³ - 3x² + 2', a: 1, b: -3, c: 0, d: 2 },
                      ].map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => setBbtCoeffs({ ...bbtCoeffs, a: p.a, b: p.b, c: p.c, d: p.d })}
                          className="px-2.5 py-1 text-[11px] rounded-lg border font-semibold bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-50 transition"
                        >
                          {p.label}
                        </button>
                      ))}

                      {bbtType === 'quartic' && [
                        { label: 'x⁴ - 2x² - 3', a: 1, b: -2, c: -3 },
                        { label: '-x⁴ + 4x² + 1', a: -1, b: 4, c: 1 },
                        { label: 'x⁴ + 2x²', a: 1, b: 2, c: 0 },
                      ].map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => setBbtCoeffs({ ...bbtCoeffs, a: p.a, b: p.b, c: p.c })}
                          className="px-2.5 py-1 text-[11px] rounded-lg border font-semibold bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-50 transition"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nhập hệ số chi tiết */}
                  <div className={`grid gap-2 pt-1 ${bbtType === 'rational_2_1' ? 'grid-cols-5' : bbtType === 'quartic' ? 'grid-cols-3' : 'grid-cols-4'}`}>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">a:</span>
                      <input
                        type="number"
                        step="any"
                        value={bbtCoeffs.a}
                        onChange={e => setBbtCoeffs({ ...bbtCoeffs, a: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 text-xs text-center border-2 border-slate-700 dark:border-slate-500 rounded-xl bg-white dark:bg-slate-800 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">b:</span>
                      <input
                        type="number"
                        step="any"
                        value={bbtCoeffs.b}
                        onChange={e => setBbtCoeffs({ ...bbtCoeffs, b: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 text-xs text-center border-2 border-slate-700 dark:border-slate-500 rounded-xl bg-white dark:bg-slate-800 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">c:</span>
                      <input
                        type="number"
                        step="any"
                        value={bbtCoeffs.c}
                        onChange={e => setBbtCoeffs({ ...bbtCoeffs, c: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 text-xs text-center border-2 border-slate-700 dark:border-slate-500 rounded-xl bg-white dark:bg-slate-800 font-mono font-bold"
                      />
                    </div>
                    {bbtType !== 'quartic' && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block mb-0.5">d:</span>
                        <input
                          type="number"
                          step="any"
                          value={bbtCoeffs.d}
                          onChange={e => setBbtCoeffs({ ...bbtCoeffs, d: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 text-xs text-center border-2 border-slate-700 dark:border-slate-500 rounded-xl bg-white dark:bg-slate-800 font-mono font-bold"
                        />
                      </div>
                    )}
                    {bbtType === 'rational_2_1' && (
                      <div>
                        <span className="text-[10px] font-bold text-teal-600 block mb-0.5">e:</span>
                        <input
                          type="number"
                          step="any"
                          value={bbtCoeffs.e}
                          onChange={e => setBbtCoeffs({ ...bbtCoeffs, e: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 text-xs text-center border-2 border-teal-600 rounded-xl bg-white dark:bg-slate-800 font-mono font-bold text-teal-700 dark:text-teal-300"
                        />
                      </div>
                    )}
                  </div>

                  {/* Thông tin tiệm cận / không xác định */}
                  {(bbtType === 'rational_2_1' || bbtType === 'rational_1_1') && (
                    <div className="p-2.5 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-300 font-medium">
                      ⚡ Tiệm cận đứng:{' '}
                      <strong>
                        x = {bbtType === 'rational_2_1' ? formatNum(-bbtCoeffs.e / (bbtCoeffs.d || 1)) : formatNum(-bbtCoeffs.d / (bbtCoeffs.c || 1))}
                      </strong>{' '}
                      (thể hiện bằng vạch kép <strong className="font-mono">||</strong> và giới hạn <strong className="font-mono">±∞</strong>)
                    </div>
                  )}
                </div>
              ) : (
                /* Chế độ gõ biểu thức tự do */
                <div className="space-y-2">
                  <input
                    type="text"
                    value={bbtFnInput}
                    onChange={e => setBbtFnInput(e.target.value)}
                    placeholder="(x^2 - x + 1)/(x - 1)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-sm font-mono font-bold text-teal-900 dark:text-teal-100 outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Bậc 2/1: (x²-x+1)/(x-1)', val: '(x^2-x+1)/(x-1)' },
                      { label: 'Phân thức: (2x+1)/(x-1)', val: '(2x+1)/(x-1)' },
                      { label: 'Bậc 3: x³ - 3x', val: 'x^3 - 3*x' },
                      { label: 'Bậc 4: x⁴ - 2x² - 3', val: 'x^4 - 2*x^2 - 3' },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => setBbtFnInput(preset.val)}
                        className="px-2 py-0.5 text-[10px] rounded border font-semibold bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-teal-50"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* KHẢO SÁT BBT TRÊN ĐOẠN [a; b] */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-teal-800 dark:text-teal-300">
                    <input
                      type="checkbox"
                      checked={bbtUseInterval}
                      onChange={e => setBbtUseInterval(e.target.checked)}
                      className="rounded text-teal-600"
                    />
                    📊 Khảo sát BBT trên đoạn [a; b]
                  </label>
                  {bbtUseInterval && (
                    <span className="text-[10px] font-mono font-bold bg-teal-100 dark:bg-teal-900/80 text-teal-800 dark:text-teal-200 px-2 py-0.5 rounded">
                      [{bbtInterval.a}; {bbtInterval.b}]
                    </span>
                  )}
                </div>

                {bbtUseInterval && (
                  <div className="p-3 bg-teal-50/70 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800/60 space-y-2.5 animate-fade-in text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">Đầu mút a:</span>
                        <input
                          type="number"
                          step="any"
                          value={bbtInterval.a}
                          onChange={e => setBbtInterval({ ...bbtInterval, a: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1 text-xs text-center border rounded-lg bg-white dark:bg-slate-800 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">Đầu mút b:</span>
                        <input
                          type="number"
                          step="any"
                          value={bbtInterval.b}
                          onChange={e => setBbtInterval({ ...bbtInterval, b: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1 text-xs text-center border rounded-lg bg-white dark:bg-slate-800 font-mono font-bold"
                        />
                      </div>
                    </div>

                    {/* Presets đoạn thường gặp */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400">Chọn nhanh:</span>
                      {[
                        { a: 0, b: 2 },
                        { a: -1, b: 2 },
                        { a: -2, b: 2 },
                        { a: 0, b: 3 },
                        { a: 1, b: 3 },
                        { a: -3, b: 0 }
                      ].map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setBbtInterval({ a: p.a, b: p.b })}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                            bbtInterval.a === p.a && bbtInterval.b === p.b
                              ? 'bg-teal-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-teal-50'
                          }`}
                        >
                          [{p.a}; {p.b}]
                        </button>
                      ))}
                    </div>

                    {/* Kết quả GTLN / GTNN */}
                    {bbtMinMax && !bbtMinMax.hasAsymptote && bbtMinMax.maxVal !== null && bbtMinMax.minVal !== null && (
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-teal-200 dark:border-teal-800 space-y-1 text-[11px]">
                        <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                          <span>✨ GTLN (Max):</span>
                          <span>
                            max = {formatNum(bbtMinMax.maxVal)} (tại x = {bbtMinMax.maxAt.map(formatNum).join(', ')})
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 font-bold">
                          <span>✨ GTNN (Min):</span>
                          <span>
                            min = {formatNum(bbtMinMax.minVal)} (tại x = {bbtMinMax.minAt.map(formatNum).join(', ')})
                          </span>
                        </div>
                      </div>
                    )}

                    {bbtMinMax?.hasAsymptote && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                        ⚠️ Trong đoạn [{bbtInterval.a}; {bbtInterval.b}] có điểm gián đoạn (tiệm cận đứng), hàm số không đạt GTLN/GTNN hữu hạn.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ĐỒ THỊ OXY */}
          {activeSubTab === 'graph' && (
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

                  {/* Presets mẫu chuẩn SGK cho Đồ thị */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Mẫu bài thi chuẩn SGK:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {graphConfig.type === 'rational_2_1' && [
                        { label: '(x²-x+1)/(x-1)', a: 1, b: -1, c: 1, d: 1, e: -1 },
                        { label: '(x²+x+1)/(x-1)', a: 1, b: 1, c: 1, d: 1, e: -1 },
                        { label: '(x²-2x-3)/(x-1)', a: 1, b: -2, c: -3, d: 1, e: -1 },
                        { label: '(-x²+2x+1)/(x+1)', a: -1, b: 2, c: 1, d: 1, e: 1 },
                      ].map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setGraphConfig({ ...graphConfig, a: p.a, b: p.b, c: p.c, d: p.d, e: p.e })}
                          className="px-2 py-0.5 text-[10px] rounded-lg border font-semibold bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-50 transition"
                        >
                          {p.label}
                        </button>
                      ))}

                      {graphConfig.type === 'rational' && [
                        { label: '(2x+1)/(x-1)', a: 2, b: 1, c: 1, d: -1 },
                        { label: '(x-2)/(x+1)', a: 1, b: -2, c: 1, d: 1 },
                        { label: '(-x+1)/(2x-3)', a: -1, b: 1, c: 2, d: -3 },
                      ].map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setGraphConfig({ ...graphConfig, a: p.a, b: p.b, c: p.c, d: p.d, e: 0 })}
                          className="px-2 py-0.5 text-[10px] rounded-lg border font-semibold bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-50 transition"
                        >
                          {p.label}
                        </button>
                      ))}

                      {graphConfig.type === 'cubic' && [
                        { label: 'x³ - 3x + 1', a: 1, b: 0, c: -3, d: 1 },
                        { label: 'x³ - 3x', a: 1, b: 0, c: -3, d: 0 },
                        { label: '-x³ + 3x² - 1', a: -1, b: 3, c: 0, d: -1 },
                        { label: 'x³ - 3x² + 2', a: 1, b: -3, c: 0, d: 2 },
                      ].map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setGraphConfig({ ...graphConfig, a: p.a, b: p.b, c: p.c, d: p.d, e: 0 })}
                          className="px-2 py-0.5 text-[10px] rounded-lg border font-semibold bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-50 transition"
                        >
                          {p.label}
                        </button>
                      ))}

                      {graphConfig.type === 'quartic' && [
                        { label: 'x⁴ - 2x² - 1', a: 1, b: -2, c: -1 },
                        { label: 'x⁴ - 2x² - 3', a: 1, b: -2, c: -3 },
                        { label: '-x⁴ + 4x² + 1', a: -1, b: 4, c: 1 },
                        { label: 'x⁴ + 2x²', a: 1, b: 2, c: 0 },
                      ].map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setGraphConfig({ ...graphConfig, a: p.a, b: p.b, c: p.c, d: 0, e: 0 })}
                          className="px-2 py-0.5 text-[10px] rounded-lg border font-semibold bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-50 transition"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
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
                        className="w-full px-2 py-1.5 text-xs text-center border-2 border-slate-700 dark:border-slate-500 rounded-xl bg-white dark:bg-slate-800 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">b:</span>
                      <input
                        type="number"
                        step="any"
                        value={graphConfig.b}
                        onChange={e => setGraphConfig({ ...graphConfig, b: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 text-xs text-center border-2 border-slate-700 dark:border-slate-500 rounded-xl bg-white dark:bg-slate-800 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">c:</span>
                      <input
                        type="number"
                        step="any"
                        value={graphConfig.c}
                        onChange={e => setGraphConfig({ ...graphConfig, c: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 text-xs text-center border-2 border-slate-700 dark:border-slate-500 rounded-xl bg-white dark:bg-slate-800 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">d:</span>
                      <input
                        type="number"
                        step="any"
                        value={graphConfig.d ?? 0}
                        onChange={e => setGraphConfig({ ...graphConfig, d: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 text-xs text-center border-2 border-slate-700 dark:border-slate-500 rounded-xl bg-white dark:bg-slate-800 font-mono font-bold"
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
                          className="w-full px-2 py-1.5 text-xs text-center border-2 border-teal-600 rounded-xl bg-white dark:bg-slate-800 font-mono font-bold text-teal-700 dark:text-teal-300"
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

                  {/* Nút chọn nhanh biểu thức mẫu */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Gợi ý biểu thức mẫu:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'Bậc 2/1: (x²-x+1)/(x-1)', val: '(x^2 - x + 1)/(x - 1)' },
                        { label: 'Phân thức: (2x+1)/(x-1)', val: '(2x + 1)/(x - 1)' },
                        { label: 'Bậc 3: x³ - 3x + 1', val: 'x^3 - 3*x + 1' },
                        { label: 'Bậc 4: x⁴ - 2x² - 1', val: 'x^4 - 2*x^2 - 1' },
                        { label: 'Bậc 2: x² - 4x + 3', val: 'x^2 - 4*x + 3' },
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleGraphFnInputChange(preset.val)}
                          className="px-2 py-1 text-[11px] rounded-lg border font-semibold bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-50 transition"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
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

              {/* KHẢO SÁT & VẼ ĐỒ THỊ TRÊN ĐOẠN [a; b] */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-teal-800 dark:text-teal-300">
                    <input
                      type="checkbox"
                      checked={graphConfig.restrictInterval ?? false}
                      onChange={e => setGraphConfig({
                        ...graphConfig,
                        restrictInterval: e.target.checked,
                        intervalA: graphConfig.intervalA ?? 0,
                        intervalB: graphConfig.intervalB ?? 2,
                        intervalMode: 'only',
                        showIntervalEndpoints: graphConfig.showIntervalEndpoints ?? true
                      })}
                      className="rounded text-teal-600"
                    />
                    📐 Vẽ đồ thị trên đoạn [a; b]
                  </label>
                  {graphConfig.restrictInterval && (
                    <span className="text-[10px] font-mono font-bold bg-teal-100 dark:bg-teal-900/80 text-teal-800 dark:text-teal-200 px-2 py-0.5 rounded">
                      [{graphConfig.intervalA ?? 0}; {graphConfig.intervalB ?? 2}]
                    </span>
                  )}
                </div>

                {graphConfig.restrictInterval && (
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

                    {/* Tùy chọn gióng 2 đầu mút */}
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

                    {/* Presets đoạn thường gặp */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400">Chọn nhanh:</span>
                      {[
                        { a: 0, b: 2 },
                        { a: -1, b: 2 },
                        { a: -2, b: 2 },
                        { a: 0, b: 3 },
                        { a: 1, b: 3 },
                        { a: -3, b: 0 }
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

                      {/* Nút tự động căn chỉnh Oxy theo đoạn */}
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

                    {/* Thông tin GTLN/GTNN trên đoạn của đồ thị */}
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
              </div>

              {/* Checkbox bật/tắt hiển thị */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <label className="flex items-center gap-1.5 cursor-pointer text-teal-800 dark:text-teal-300">
                  <input
                    type="checkbox"
                    checked={graphConfig.showExtrema ?? true}
                    onChange={e => setGraphConfig({ ...graphConfig, showExtrema: e.target.checked })}
                    className="rounded text-teal-600"
                  />
                  🎯 Tọa độ cực trị & gióng
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-teal-800 dark:text-teal-300">
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
                    className="rounded text-teal-600"
                  />
                  🎯 Điểm thuộc đồ thị & gióng
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-blue-800 dark:text-blue-300">
                  <input
                    type="checkbox"
                    checked={graphConfig.showIntersections ?? true}
                    onChange={e => setGraphConfig({ ...graphConfig, showIntersections: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  📍 Giao điểm Ox, Oy
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={graphConfig.showAsymptotes ?? true}
                    onChange={e => setGraphConfig({ ...graphConfig, showAsymptotes: e.target.checked })}
                    className="rounded"
                  />
                  📐 Đường tiệm cận
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
            </div>
          )}

          {/* HÀNG NÚT TÁC VỤ SAO CHÉP & TẢI ẢNH */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <button
              onClick={() => {
                const currentUrl = activeSubTab === 'bbt' ? bbtDataUrl : graphDataUrl;
                const label = activeSubTab === 'bbt' ? 'Bảng biến thiên' : 'Đồ thị Oxy';
                handleCopyImage(currentUrl, label);
              }}
              className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition"
              title="Sao chép ảnh vào Clipboard (PNG) để dán trực tiếp Ctrl+V vào Word"
            >
              <Copy size={15} />
              Copy ảnh (Ctrl+V vào Word)
            </button>

            <button
              onClick={() => {
                const currentUrl = activeSubTab === 'bbt' ? bbtDataUrl : graphDataUrl;
                const fname = activeSubTab === 'bbt' ? 'Bang_bien_thien_300dpi.png' : 'Do_thi_Oxy_300dpi.png';
                handleDownloadImage(currentUrl, fname);
              }}
              className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
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
          <div className="w-full flex flex-col gap-2.5 pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
            {/* Dòng 1: Tiêu đề và Thanh trượt Cỡ chữ */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={15} className="text-teal-600" />
                Xem trước hình vẽ (Tối ưu chèn Word):
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {/* Bộ chọn Phông chữ chuẩn đề thi */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                    <Type size={13} className="text-teal-600" />
                    Phông:
                  </span>
                  <select
                    value={graphFont}
                    onChange={e => setGraphFont(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[11px] rounded px-1.5 py-0.5 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                    title="Lựa chọn phông chữ hiển thị trên đồ thị và bảng biến thiên"
                  >
                    <option value="times">🏛️ Times New Roman (Chuẩn SGK & Đề thi - Đẹp nhất)</option>
                    <option value="cambria">📐 Cambria Math (Toán học Office)</option>
                    <option value="latex">🖋️ LaTeX / TikZ (Computer Modern)</option>
                    <option value="sans">✨ Be Vietnam Pro (Hiện đại)</option>
                  </select>
                </div>

                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  Cỡ: <span className="font-mono text-teal-700 dark:text-teal-300 font-extrabold">{Math.round(fontScale * 100)}%</span>
                </span>

                {/* Slider kéo cỡ chữ */}
                <input
                  type="range"
                  min="0.75"
                  max="1.6"
                  step="0.05"
                  value={fontScale}
                  onChange={e => setFontScale(parseFloat(e.target.value))}
                  className="w-20 sm:w-28 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  title={`Kéo để chỉnh cỡ chữ (${Math.round(fontScale * 100)}%)`}
                />

                {/* Nút A- và A+ */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setFontScale(prev => Math.max(0.75, Math.round((prev - 0.1) * 10) / 10))}
                    className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-teal-50"
                    title="Giảm cỡ chữ (A-)"
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontScale(prev => Math.min(1.6, Math.round((prev + 0.1) * 10) / 10))}
                    className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-teal-50"
                    title="Tăng cỡ chữ (A+)"
                  >
                    A+
                  </button>
                </div>

                {/* Các mức chọn nhanh */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                  {[
                    { scale: 0.85, label: 'Nhỏ' },
                    { scale: 1.0, label: 'Chuẩn' },
                    { scale: 1.2, label: 'Lớn' },
                    { scale: 1.4, label: 'Rất lớn' },
                  ].map(item => (
                    <button
                      key={item.scale}
                      type="button"
                      onClick={() => setFontScale(item.scale)}
                      className={`px-2 py-0.5 rounded-md transition ${
                        Math.abs(fontScale - item.scale) < 0.04
                          ? 'bg-teal-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dòng 2 (Chỉ có ở Đồ thị Oxy): THANH TRƯỢT HỆ TRỤC OXY & CHIA ĐƠN VỊ */}
            {activeSubTab === 'graph' && (
              <div className="p-2 bg-teal-50/70 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800/70 flex flex-wrap items-center justify-between gap-3 text-xs animate-fade-in">
                {/* 1. Thanh trượt Thu phóng / Tỷ lệ đơn vị trục Oxy */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-extrabold text-teal-900 dark:text-teal-200 flex items-center gap-1">
                    <Ruler size={14} className="text-teal-600" />
                    Thu phóng Oxy: <span className="font-mono text-teal-700 dark:text-teal-300 font-extrabold">±{Math.abs(graphConfig.xMax ?? 5.5)}</span>
                  </span>

                  {/* Thanh trượt slider Oxy */}
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
                    className="w-24 sm:w-36 h-1.5 bg-teal-200 dark:bg-teal-800 rounded-lg appearance-none cursor-pointer accent-teal-600"
                    title={`Kéo để thu phóng tỷ lệ trục Oxy (±${Math.abs(graphConfig.xMax ?? 5.5)})`}
                  />

                  {/* Nút - và + */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const current = Math.abs(graphConfig.xMax ?? 5.5);
                        const next = Math.min(10, Math.round((current + 0.5) * 10) / 10);
                        setGraphConfig({ ...graphConfig, xMin: -next, xMax: next, yMin: -next, yMax: next });
                      }}
                      className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-700 hover:bg-teal-100"
                      title="Thu nhỏ đồ thị (Mở rộng phạm vi trục Oxy)"
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
                      className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-700 hover:bg-teal-100"
                      title="Phóng to đồ thị (Thu hẹp phạm vi trục Oxy)"
                    >
                      +
                    </button>
                  </div>

                  {/* Nút chọn nhanh */}
                  <div className="flex bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-teal-200 dark:border-teal-700 text-[10px] font-bold">
                    {[
                      { range: 4, label: '±4 (To)' },
                      { range: 5.5, label: '±5.5 (SGK)' },
                      { range: 7, label: '±7 (Bao quát)' },
                    ].map(item => (
                      <button
                        key={item.range}
                        type="button"
                        onClick={() => setGraphConfig({
                          ...graphConfig,
                          xMin: -item.range,
                          xMax: item.range,
                          yMin: -item.range,
                          yMax: item.range
                        })}
                        className={`px-2 py-0.5 rounded-md transition ${
                          Math.abs((graphConfig.xMax ?? 5.5) - item.range) < 0.1
                            ? 'bg-teal-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Thanh điều khiển Bước chia & Ô lưới tọa độ (ĐỒNG BỘ 100%, KHÔNG CÒN TÁCH RỜI) */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Hash size={13} className="text-teal-600" />
                      Bước chia & Ô lưới:
                    </span>
                    {/* Nút chọn nhanh 1 (chuẩn), 0.5, 2 */}
                    <div className="flex bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-teal-200 dark:border-teal-700 text-[10px] font-bold">
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
                          className={`px-1.5 py-0.5 rounded transition ${
                            (graphConfig.tickStep ?? 1) === item.step
                              ? 'bg-teal-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    {/* Slider kéo bước chia */}
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.5"
                      value={graphConfig.tickStep ?? 1}
                      onChange={e => {
                        const step = parseFloat(e.target.value);
                        setGraphConfig({
                          ...graphConfig,
                          tickStep: step,
                          tickStepX: step,
                          tickStepY: step,
                          gridStep: step
                        });
                      }}
                      className="w-14 sm:w-16 h-1.5 bg-teal-200 dark:bg-teal-800 rounded-lg appearance-none cursor-pointer accent-teal-600"
                      title={`Kéo chỉnh bước chia đơn vị và ô lưới (${graphConfig.tickStep ?? 1})`}
                    />
                  </div>

                  <label className="flex items-center gap-1 cursor-pointer text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={graphConfig.showTicks ?? false}
                      onChange={e => setGraphConfig({ ...graphConfig, showTicks: e.target.checked })}
                      className="rounded text-teal-600"
                    />
                    Vạch chia
                  </label>

                  <label className="flex items-center gap-1 cursor-pointer text-[11px] font-bold text-teal-800 dark:text-teal-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-700">
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
                    🔢 Đánh số (1, 2, 3...)
                  </label>

                  <label className="flex items-center gap-1 cursor-pointer text-[11px] font-bold text-teal-800 dark:text-teal-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-700">
                    <input
                      type="checkbox"
                      checked={graphConfig.showGrid ?? false}
                      onChange={e => setGraphConfig({ ...graphConfig, showGrid: e.target.checked })}
                      className="rounded text-teal-600"
                    />
                    🌐 Lưới tọa độ
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="w-full flex items-center justify-center p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 overflow-x-auto">
            {/* Canvas BBT */}
            <div className={activeSubTab === 'bbt' ? 'block' : 'hidden'}>
              <canvas
                ref={bbtCanvasRef}
                className="max-w-full h-auto rounded-lg shadow-xs bg-white border border-slate-200"
              />
            </div>

            {/* Canvas Đồ thị Oxy */}
            <div className={activeSubTab === 'graph' ? 'block' : 'hidden'}>
              <canvas
                ref={graphCanvasRef}
                className="max-w-full h-auto rounded-lg shadow-xs bg-white border border-slate-200"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 text-center leading-relaxed">
            💡 <strong>Tối ưu hóa Word:</strong> Khi nhấn <em>"Copy ảnh (Ctrl+V vào Word)"</em>, ảnh tự động nhúng 300 DPI — dán vào Word sẽ có <strong>kích thước vừa vặn (~8 - 11 cm)</strong> và <strong>chữ to đậm rõ nét</strong> đúng chuẩn trình bày đề thi!
          </p>
        </div>
      </div>
    </div>
  );
}
