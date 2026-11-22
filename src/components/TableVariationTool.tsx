import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Table, 
  Copy, 
  Download, 
  Check, 
  Plus, 
  Trash2, 
  Sparkles, 
  Sliders, 
  RotateCcw,
  Code,
  Eye,
  CheckCircle2,
  Bookmark,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Crop
} from 'lucide-react';
import { addDpiToBlob, cropCanvasToContent } from '../utils/dpiUtils';
import { 
  analyzeFunction, 
  analyzeFromCoeffs, 
  analyzeFromCoeffsOnInterval, 
  analyzeFunctionOnInterval, 
  renderBBTToCanvas, 
  BBTData, 
  formatNum,
  IntervalMinMaxInfo
} from '../utils/bbtEngine';
import MathFontSelector, { MathFontChoice, MathStrokeChoice, MATH_FONT_FAMILIES } from './MathFontSelector';

export type BBTType = 'variation' | 'sign_chart';
export type MasterBBTMode = 'auto' | 'variation' | 'sign_chart';

export interface XPoint {
  id: string;
  xVal: string;
  derivType: '0' | 'double_bar' | 'single_bar' | 'blank';
  intervalSign: '+' | '-' | 'blank';
  yVal: string;
  yRightVal?: string;
  yPos: 'top' | 'bottom' | 'middle';
  yRightPos?: 'top' | 'bottom' | 'middle';
}

function formatDisplayMath(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\infty/g, '∞')
    .replace(/-\s*\\infty/g, '−∞')
    .replace(/\+\s*\\infty/g, '+∞')
    .replace(/^-/g, '−')
    .replace(/\\pm/g, '±')
    .replace(/_0/g, '₀')
    .replace(/_1/g, '₁')
    .replace(/_2/g, '₂')
    .replace(/_3/g, '₃');
}

function bbtDataToPoints(bbt: BBTData): XPoint[] {
  return bbt.points.map((pt, i) => {
    let derivType: XPoint['derivType'] = 'blank';
    if (pt.isDoubleBar || pt.yPrimeSymbol === '||') {
      derivType = 'double_bar';
    } else if (pt.yPrimeSymbol === '0') {
      derivType = '0';
    } else if (pt.yPrimeSymbol === '|') {
      derivType = 'single_bar';
    }

    const intervalSign = bbt.intervals[i]?.sign || 'blank';

    let yPos: XPoint['yPos'] = 'middle';
    if (pt.yPos === 'top') yPos = 'top';
    else if (pt.yPos === 'bottom') yPos = 'bottom';
    else if (pt.yValue === '+∞' || pt.yValue === '+\\infty') yPos = 'top';
    else if (pt.yValue === '-∞' || pt.yValue === '-\\infty') yPos = 'bottom';

    return {
      id: String(Date.now() + i),
      xVal: pt.xLabel,
      derivType,
      intervalSign,
      yVal: pt.isDoubleBar ? (pt.leftLimit || '-∞') : pt.yValue,
      yRightVal: pt.isDoubleBar ? (pt.rightLimit || '+∞') : undefined,
      yPos,
      yRightPos: pt.isDoubleBar ? (pt.rightLimit === '+∞' || pt.rightLimit === '+\\infty' ? 'top' : 'bottom') : undefined
    };
  });
}

function drawBBTToCanvas(
  canvas: HTMLCanvasElement,
  points: XPoint[],
  bbtMode: BBTType,
  fontChoice: MathFontChoice,
  colorStyle: 'monochrome' | 'colored',
  scale: number = 3.0,
  fontSizeMode: 'standard' | 'large' | 'extra' = 'large',
  tableWidthMode: 'auto' | 'compact' | 'wide' = 'auto',
  strokeChoice: MathStrokeChoice = 'standard',
  isBold: boolean = true
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const fontMultiplier = fontSizeMode === 'extra' ? 1.55 : fontSizeMode === 'standard' ? 1.1 : 1.35;
  const strokeMultiplier = strokeChoice === 'thin' ? 0.75 : strokeChoice === 'bold' ? 1.4 : 1.0;
  const numPts = points.length;

  const svgW = tableWidthMode === 'wide' 
    ? 740 
    : tableWidthMode === 'compact' 
      ? 580 
      : Math.min(740, Math.max(560, numPts <= 3 ? 540 : numPts === 4 ? 614 : numPts === 5 ? 660 : 720));

  const paddingX = 15;
  const tableX = paddingX;
  const tableW = svgW - 2 * paddingX;
  const colLabelW = 58;
  const dataAreaX = tableX + colLabelW;
  const dataAreaW = tableW - colLabelW;

  const hRowX = Math.round(45 * (fontMultiplier > 1.3 ? 1.05 : 1));
  const hRowDeriv = Math.round(43 * (fontMultiplier > 1.3 ? 1.05 : 1));
  const hRowY = bbtMode === 'variation' ? 148 : 0;
  const tableH = hRowX + hRowDeriv + hRowY;
  const tableY = 20;

  const yRow1 = tableY;
  const yRow2 = yRow1 + hRowX;
  const yRow3 = yRow2 + hRowDeriv;
  const yBottom = yRow3 + hRowY;
  const svgH = yBottom + 25;

  canvas.width = Math.round(svgW * scale);
  canvas.height = Math.round(svgH * scale);

  ctx.save();
  ctx.scale(scale, scale);

  // 1. Tô nền trắng
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, svgW, svgH);

  const fontFamily = MATH_FONT_FAMILIES[fontChoice];

  const strokeColor = '#000000';
  const textColor = '#000000';
  const isMono = colorStyle === 'monochrome';
  const plusColor = isMono ? '#000000' : '#0d9488';
  const minusColor = isMono ? '#000000' : '#e11d48';

  // 2. Viền ngoài
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2.2 * strokeMultiplier;
  ctx.strokeRect(tableX, tableY, tableW, tableH);

  // 3. Đường dọc phân cách cột nhãn
  ctx.lineWidth = 2.0 * strokeMultiplier;
  ctx.beginPath();
  ctx.moveTo(dataAreaX, tableY);
  ctx.lineTo(dataAreaX, yBottom);
  ctx.stroke();

  // 4. Đường ngang
  ctx.lineWidth = 1.8 * strokeMultiplier;
  ctx.beginPath();
  ctx.moveTo(tableX, yRow2);
  ctx.lineTo(tableX + tableW, yRow2);
  ctx.stroke();

  if (bbtMode === 'variation') {
    ctx.beginPath();
    ctx.moveTo(tableX, yRow3);
    ctx.lineTo(tableX + tableW, yRow3);
    ctx.stroke();
  }

  // 5. Cột nhãn
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const labelX = tableX + colLabelW / 2;

  const headerFontSz = Math.round(18 * fontMultiplier);
  ctx.font = `italic ${isBold ? 'bold ' : 'normal '}${headerFontSz}px ${fontFamily}`;
  ctx.fillText('x', labelX, yRow1 + hRowX / 2);

  ctx.fillText(bbtMode === 'variation' ? "y'" : "f'(x)", labelX, yRow2 + hRowDeriv / 2);

  if (bbtMode === 'variation') {
    ctx.fillText('y', labelX, yRow3 + hRowY / 2);
  }

  // 6. Tính tọa độ x cho từng điểm
  const colStep = dataAreaW / Math.max(1, numPts - 1);
  const getColX = (index: number) => {
    if (index === 0) return dataAreaX + 35;
    if (index === numPts - 1) return dataAreaX + dataAreaW - 35;
    return dataAreaX + index * colStep;
  };

  const xFontSz = Math.round(16 * fontMultiplier);
  ctx.font = `${isBold ? 'bold ' : 'normal '}${xFontSz}px ${fontFamily}`;

  points.forEach((pt, i) => {
    const px = getColX(i);
    ctx.fillStyle = textColor;
    ctx.fillText(formatDisplayMath(pt.xVal), px, yRow1 + hRowX / 2);

    const zeroFontSz = Math.round(16 * fontMultiplier);
    if (pt.derivType === '0') {
      ctx.font = `${isBold ? 'bold ' : 'normal '}${zeroFontSz}px ${fontFamily}`;
      ctx.fillStyle = textColor;
      ctx.fillText('0', px, yRow2 + hRowDeriv / 2);
    } else if (pt.derivType === 'double_bar') {
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = strokeColor;
      const barH = bbtMode === 'variation' ? (yBottom - yRow2) : hRowDeriv;
      ctx.beginPath();
      ctx.moveTo(px - 2.5, yRow2);
      ctx.lineTo(px - 2.5, yRow2 + barH);
      ctx.moveTo(px + 2.5, yRow2);
      ctx.lineTo(px + 2.5, yRow2 + barH);
      ctx.stroke();
    } else if (pt.derivType === 'single_bar') {
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = strokeColor;
      const barH = bbtMode === 'variation' ? (yBottom - yRow2) : hRowDeriv;
      ctx.beginPath();
      ctx.moveTo(px, yRow2);
      ctx.lineTo(px, yRow2 + barH);
      ctx.stroke();
    }
  });

  // 7. Dấu khoảng
  points.forEach((pt, i) => {
    if (i < numPts - 1 && pt.intervalSign && pt.intervalSign !== 'blank') {
      const xLeft = getColX(i);
      const xRight = getColX(i + 1);
      const midX = (xLeft + xRight) / 2;
      const midY = yRow2 + hRowDeriv / 2;

      const signFontSz = Math.round(18 * fontMultiplier);
      ctx.font = `${isBold ? 'bold ' : 'normal '}${signFontSz}px ${fontFamily}`;

      if (pt.intervalSign === '+') {
        ctx.fillStyle = plusColor;
        ctx.fillText('+', midX, midY);
      } else if (pt.intervalSign === '-') {
        ctx.fillStyle = minusColor;
        ctx.fillText('−', midX, midY);
      }
    }
  });

  // 8. Dòng biến thiên y
  if (bbtMode === 'variation') {
    const padY = 22;
    const yTop = yRow3 + padY;
    const yMid = yRow3 + hRowY / 2;
    const yBot = yBottom - padY;

    const getYCoord = (pos: 'top' | 'bottom' | 'middle') => {
      if (pos === 'top') return yTop;
      if (pos === 'bottom') return yBot;
      return yMid;
    };

    const getValHalfW = (text?: string) => {
      if (!text) return 10;
      const str = formatDisplayMath(text).trim();
      if (str.includes('∞')) return Math.round(22 * (fontMultiplier > 1.2 ? 1.15 : 1));
      if (str.includes('/')) return Math.round(20 * (fontMultiplier > 1.2 ? 1.15 : 1));
      ctx.save();
      ctx.font = `${isBold ? 'bold ' : ''}${Math.round(16 * fontMultiplier)}px ${fontFamily}`;
      const m = ctx.measureText(str).width;
      ctx.restore();
      return Math.max(12, Math.round(m / 2));
    };

    // Vẽ mũi tên biến thiên
    ctx.lineWidth = 2.2 * strokeMultiplier;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;

    for (let i = 0; i < numPts - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      const x1 = getColX(i);
      const x2 = getColX(i + 1);

      const isDb1 = p1.derivType === 'double_bar';
      const isDb2 = p2.derivType === 'double_bar';

      const aX1 = isDb1 ? x1 + 28 : x1;
      const aY1 = getYCoord(isDb1 ? (p1.yRightPos || 'top') : p1.yPos);
      const val1 = isDb1 ? p1.yRightVal : p1.yVal;

      const aX2 = isDb2 ? x2 - 28 : x2;
      const aY2 = getYCoord(p2.yPos);
      const val2 = p2.yVal;

      const w1 = getValHalfW(val1);
      const w2 = getValHalfW(val2);
      const R1 = w1 + 8;
      const R2 = w2 + 8;

      const dx = aX2 - aX1;
      const dy = aY2 - aY1;

      if (dx > R1 + R2 + 10) {
        const m = dy / dx;
        const startX = aX1 + R1;
        const startY = aY1 + m * R1;
        const endX = aX2 - R2;
        const endY = aY2 - m * R2;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        const angle = Math.atan2(endY - startY, endX - startX);
        const arrowLength = 10 * strokeMultiplier;
        const arrowWidth = Math.PI / 6;

        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowLength * Math.cos(angle - arrowWidth),
          endY - arrowLength * Math.sin(angle - arrowWidth)
        );
        ctx.lineTo(
          endX - arrowLength * Math.cos(angle + arrowWidth),
          endY - arrowLength * Math.sin(angle + arrowWidth)
        );
        ctx.closePath();
        ctx.fill();
      }
    }

    // Giá trị y
    const yFontSz = Math.round(16 * fontMultiplier);
    ctx.font = `${isBold ? 'bold ' : ''}${Math.round(16 * fontMultiplier)}px ${fontFamily}`;

    for (let i = 0; i < numPts; i++) {
      const pt = points[i];
      const px = getColX(i);

      const renderValWithHalo = (text: string, posX: number, posY: number) => {
        if (!text) return;
        const textStr = formatDisplayMath(text);
        const metrics = ctx.measureText(textStr);
        const bgW = metrics.width + 4;
        const bgH = yFontSz + 4;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(posX - bgW / 2, posY - bgH / 2, bgW, bgH);

        ctx.fillStyle = textColor;
        ctx.fillText(textStr, posX, posY);
      };

      if (pt.derivType !== 'double_bar') {
        renderValWithHalo(pt.yVal, px, getYCoord(pt.yPos));
      } else {
        renderValWithHalo(pt.yVal, px - 28, getYCoord(pt.yPos));
        renderValWithHalo(pt.yRightVal || '', px + 28, getYCoord(pt.yRightPos || 'top'));
      }
    }
  }

  ctx.restore();
}

export interface TableVariationToolProps {
  onInsertImage?: (dataUrl: string) => void;
}

export default function TableVariationTool({ onInsertImage }: TableVariationToolProps = {}) {
  const [masterMode, setMasterMode] = useState<MasterBBTMode>('auto');
  const [bbtMode, setBbtMode] = useState<BBTType>('variation');
  const [fontChoice, setFontChoice] = useState<MathFontChoice>('times');
  const [colorStyle, setColorStyle] = useState<'monochrome' | 'colored'>('monochrome');
  const [fontSizeMode, setFontSizeMode] = useState<'standard' | 'large' | 'extra'>('large');
  const [tableWidthMode, setTableWidthMode] = useState<'auto' | 'compact' | 'wide'>('auto');
  const [strokeChoice, setStrokeChoice] = useState<MathStrokeChoice>('standard');
  const [isBoldLabels, setIsBoldLabels] = useState<boolean>(true);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('cubic_image1');

  // STATE CHO CHẾ ĐỘ TỰ ĐỘNG (AI / TÍNH TOÁN TOÁN HỌC)
  const [autoInputMode, setAutoInputMode] = useState<'coeffs' | 'text'>('coeffs');
  const [autoFnType, setAutoFnType] = useState<'rational_2_1' | 'rational_1_1' | 'cubic' | 'quartic'>('rational_2_1');
  const [autoCoeffs, setAutoCoeffs] = useState({ a: 1, b: -1, c: 1, d: 1, e: -1 });
  const [autoFnInput, setAutoFnInput] = useState<string>('x^3 - 3*x + 1');
  const [autoUseInterval, setAutoUseInterval] = useState<boolean>(false);
  const [autoInterval, setAutoInterval] = useState({ min: -3, max: 2, minInclusive: true, maxInclusive: true });
  const [rawIntervalMin, setRawIntervalMin] = useState<string>('-3');
  const [rawIntervalMax, setRawIntervalMax] = useState<string>('2');
  const [minMaxResult, setMinMaxResult] = useState<IntervalMinMaxInfo | null>(null);
  const [analyzedData, setAnalyzedData] = useState<BBTData | null>(null);

  const autoCanvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // MẶC ĐỊNH: BẬC 3
  const [points, setPoints] = useState<XPoint[]>([
    { id: '1', xVal: '-\\infty', derivType: 'blank', intervalSign: '+', yVal: '-\\infty', yPos: 'bottom' },
    { id: '2', xVal: '-1', derivType: '0', intervalSign: '-', yVal: '2', yPos: 'top' },
    { id: '3', xVal: '3', derivType: '0', intervalSign: '+', yVal: '-2', yPos: 'bottom' },
    { id: '4', xVal: '+\\infty', derivType: 'blank', intervalSign: 'blank', yVal: '+\\infty', yPos: 'top' },
  ]);

  // PHÂN TÍCH VÀ RENDER CHẾ ĐỘ TỰ ĐỘNG
  useEffect(() => {
    let result: BBTData | null = null;
    try {
      if (autoUseInterval) {
        if (autoInputMode === 'coeffs') {
          const res = analyzeFromCoeffsOnInterval(
            autoFnType,
            autoCoeffs.a,
            autoCoeffs.b,
            autoCoeffs.c,
            autoCoeffs.d,
            autoCoeffs.e,
            autoInterval.min,
            autoInterval.max
          );
          result = res.bbt;
          setMinMaxResult(res.minMax);
        } else {
          const res = analyzeFunctionOnInterval(
            autoFnInput,
            autoInterval.min,
            autoInterval.max
          );
          result = res.bbt;
          setMinMaxResult(res.minMax);
        }
      } else {
        setMinMaxResult(null);
        if (autoInputMode === 'coeffs') {
          result = analyzeFromCoeffs(
            autoFnType,
            autoCoeffs.a,
            autoCoeffs.b,
            autoCoeffs.c,
            autoCoeffs.d,
            autoCoeffs.e
          );
        } else {
          result = analyzeFunction(autoFnInput);
        }
      }
      setAnalyzedData(result);

      if (autoCanvasRef.current && result) {
        renderBBTToCanvas(result, autoCanvasRef.current, 2.4, {
          fontSizeScale: fontSizeMode === 'extra' ? 1.25 : fontSizeMode === 'large' ? 1.15 : 1.0,
          fontFamily: MATH_FONT_FAMILIES[fontChoice],
          strokeChoice,
          isBold: isBoldLabels
        });
      }
    } catch (err) {
      console.error('Lỗi phân tích hàm số tự động:', err);
    }
  }, [autoInputMode, autoFnType, autoCoeffs, autoFnInput, autoUseInterval, autoInterval, fontChoice, strokeChoice, isBoldLabels, fontSizeMode, masterMode]);

  // CHUYỂN DỮ LIỆU TỰ ĐỘNG SANG CHẾ ĐỘ TÙY BIẾN THỦ CÔNG
  const handleTransferToManual = () => {
    if (!analyzedData) return;
    const newPoints = bbtDataToPoints(analyzedData);
    setPoints(newPoints);
    setBbtMode('variation');
    setMasterMode('variation');
    setCopyStatus('transferred');
    setTimeout(() => setCopyStatus(null), 3000);
  };

  const loadPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);
    switch (presetKey) {
      case 'cubic_image1':
        setBbtMode('variation');
        setPoints([
          { id: '1', xVal: '-\\infty', derivType: 'blank', intervalSign: '+', yVal: '-\\infty', yPos: 'bottom' },
          { id: '2', xVal: '-1', derivType: '0', intervalSign: '-', yVal: '2', yPos: 'top' },
          { id: '3', xVal: '3', derivType: '0', intervalSign: '+', yVal: '-2', yPos: 'bottom' },
          { id: '4', xVal: '+\\infty', derivType: 'blank', intervalSign: 'blank', yVal: '+\\infty', yPos: 'top' },
        ]);
        break;
      case 'rational_2_1':
        setBbtMode('variation');
        setPoints([
          { id: '1', xVal: '-\\infty', derivType: 'blank', intervalSign: '+', yVal: '-\\infty', yPos: 'bottom' },
          { id: '2', xVal: '0', derivType: '0', intervalSign: '-', yVal: '-1', yPos: 'top' },
          { 
            id: '3', 
            xVal: '1', 
            derivType: 'double_bar', 
            intervalSign: '-', 
            yVal: '-\\infty', 
            yPos: 'bottom',
            yRightVal: '+\\infty',
            yRightPos: 'top'
          },
          { id: '4', xVal: '2', derivType: '0', intervalSign: '+', yVal: '3', yPos: 'bottom' },
          { id: '5', xVal: '+\\infty', derivType: 'blank', intervalSign: 'blank', yVal: '+\\infty', yPos: 'top' },
        ]);
        break;
      case 'cubic_2_extrema':
        setBbtMode('variation');
        setPoints([
          { id: '1', xVal: '-\\infty', derivType: 'blank', intervalSign: '+', yVal: '-\\infty', yPos: 'bottom' },
          { id: '2', xVal: '0', derivType: '0', intervalSign: '-', yVal: '2', yPos: 'top' },
          { id: '3', xVal: '2', derivType: '0', intervalSign: '+', yVal: '-2', yPos: 'bottom' },
          { id: '4', xVal: '+\\infty', derivType: 'blank', intervalSign: 'blank', yVal: '+\\infty', yPos: 'top' },
        ]);
        break;
      case 'cubic_negative_a':
        setBbtMode('variation');
        setPoints([
          { id: '1', xVal: '-\\infty', derivType: 'blank', intervalSign: '-', yVal: '+\\infty', yPos: 'top' },
          { id: '2', xVal: '-1', derivType: '0', intervalSign: '+', yVal: '-3', yPos: 'bottom' },
          { id: '3', xVal: '1', derivType: '0', intervalSign: '-', yVal: '1', yPos: 'top' },
          { id: '4', xVal: '+\\infty', derivType: 'blank', intervalSign: 'blank', yVal: '-\\infty', yPos: 'bottom' },
        ]);
        break;
      case 'quartic_3_extrema':
        setBbtMode('variation');
        setPoints([
          { id: '1', xVal: '-\\infty', derivType: 'blank', intervalSign: '-', yVal: '+\\infty', yPos: 'top' },
          { id: '2', xVal: '-1', derivType: '0', intervalSign: '+', yVal: '-1', yPos: 'bottom' },
          { id: '3', xVal: '0', derivType: '0', intervalSign: '-', yVal: '3', yPos: 'top' },
          { id: '4', xVal: '1', derivType: '0', intervalSign: '+', yVal: '-1', yPos: 'bottom' },
          { id: '5', xVal: '+\\infty', derivType: 'blank', intervalSign: 'blank', yVal: '+\\infty', yPos: 'top' },
        ]);
        break;
      case 'rational_1_1':
        setBbtMode('variation');
        setPoints([
          { id: '1', xVal: '-\\infty', derivType: 'blank', intervalSign: '-', yVal: '2', yPos: 'top' },
          { 
            id: '2', 
            xVal: '1', 
            derivType: 'double_bar', 
            intervalSign: '-', 
            yVal: '-\\infty', 
            yPos: 'bottom',
            yRightVal: '+\\infty',
            yRightPos: 'top'
          },
          { id: '3', xVal: '+\\infty', derivType: 'blank', intervalSign: 'blank', yVal: '2', yPos: 'bottom' },
        ]);
        break;
      case 'sign_quadratic':
        setBbtMode('sign_chart');
        setPoints([
          { id: '1', xVal: '-\\infty', derivType: 'blank', intervalSign: '+', yVal: '', yPos: 'middle' },
          { id: '2', xVal: 'x_1', derivType: '0', intervalSign: '-', yVal: '', yPos: 'middle' },
          { id: '3', xVal: 'x_2', derivType: '0', intervalSign: '+', yVal: '', yPos: 'middle' },
          { id: '4', xVal: '+\\infty', derivType: 'blank', intervalSign: 'blank', yVal: '', yPos: 'middle' },
        ]);
        break;
    }
  };

  const handleAddPoint = () => {
    const newId = String(Date.now());
    const lastIndex = points.length - 1;
    const newPt: XPoint = {
      id: newId,
      xVal: '0',
      derivType: '0',
      intervalSign: '+',
      yVal: '0',
      yPos: 'middle',
    };
    const updated = [...points];
    updated.splice(lastIndex, 0, newPt);
    setPoints(updated);
  };

  const handleDeletePoint = (id: string) => {
    if (points.length <= 2) return;
    setPoints(points.filter(p => p.id !== id));
  };

  const handleUpdatePoint = (id: string, updates: Partial<XPoint>) => {
    setPoints(points.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  // SAO CHÉP ẢNH TỰ ĐỘNG (CẮT KHÔNG CHỪA KHOẢNG TRẮNG)
  const handleCopyAutoImage = async () => {
    if (!autoCanvasRef.current) return;
    try {
      const croppedCanvas = cropCanvasToContent(autoCanvasRef.current, 4);
      const blob = await new Promise<Blob | null>(resolve => croppedCanvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Không tạo được blob');
      const blobWithDpi = await addDpiToBlob(blob, 300);
      const dataUrl = croppedCanvas.toDataURL('image/png');
      const htmlSnippet = `<img src="${dataUrl}" alt="Bang bien thien" width="${croppedCanvas.width / 2.4}" height="${croppedCanvas.height / 2.4}" style="display:inline-block; max-width:100%; height:auto;" />`;
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
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus(null), 3500);
    } catch (err) {
      console.warn('Clipboard write thất bại, tải trực tiếp:', err);
      handleDownloadAutoPng();
    }
  };

  const handleDownloadAutoPng = async () => {
    if (!autoCanvasRef.current) return;
    try {
      const croppedCanvas = cropCanvasToContent(autoCanvasRef.current, 4);
      const blob = await new Promise<Blob | null>(resolve => croppedCanvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const blobWithDpi = await addDpiToBlob(blob, 300);
        const url = URL.createObjectURL(blobWithDpi);
        const a = document.createElement('a');
        a.download = `Bang_bien_thien_300DPI_${Date.now()}.png`;
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('Lỗi khi tải PNG:', e);
    }
  };

  // SAO CHÉP ẢNH TÙY BIẾN (CẮT KHÔNG CHỪA KHOẢNG TRẮNG)
  const handleCopyImage = async () => {
    try {
      const canvas = document.createElement('canvas');
      drawBBTToCanvas(canvas, points, bbtMode, fontChoice, colorStyle, 3.0, fontSizeMode, tableWidthMode, strokeChoice, isBoldLabels);
      const croppedCanvas = cropCanvasToContent(canvas, 4);

      const blob = await new Promise<Blob | null>(resolve => croppedCanvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Không thể tạo blob PNG');

      const blobWithDpi = await addDpiToBlob(blob, 300);
      const dataUrl = croppedCanvas.toDataURL('image/png');
      const htmlSnippet = `<img src="${dataUrl}" alt="Bang bien thien" width="${croppedCanvas.width / 3}" height="${croppedCanvas.height / 3}" style="display:inline-block; max-width:100%; height:auto;" />`;
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

      setCopyStatus('copied');
      setTimeout(() => setCopyStatus(null), 3500);
    } catch (err) {
      console.warn('Lỗi copy clipboard:', err);
      handleDownloadPng();
    }
  };

  const handleDownloadPng = async () => {
    try {
      const canvas = document.createElement('canvas');
      drawBBTToCanvas(canvas, points, bbtMode, fontChoice, colorStyle, 3.0, fontSizeMode, tableWidthMode, strokeChoice, isBoldLabels);
      const croppedCanvas = cropCanvasToContent(canvas, 4);
      const blob = await new Promise<Blob | null>(resolve => croppedCanvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const blobWithDpi = await addDpiToBlob(blob, 300);
        const url = URL.createObjectURL(blobWithDpi);
        const a = document.createElement('a');
        a.download = `Bang_bien_thien_300DPI_${Date.now()}.png`;
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('Lỗi khi tải PNG:', e);
    }
  };

  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    let svgData = new XMLSerializer().serializeToString(svgRef.current);
    if (!svgData.includes('xmlns=')) {
      svgData = svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `Bang_bien_thien_${Date.now()}.svg`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Lắng nghe sự kiện từ Ribbon Bar (kiểu Microsoft Word)
  useEffect(() => {
    const handleRibbonAction = (e: Event) => {
      const ce = e as CustomEvent;
      if (!ce.detail) return;
      const { type, mode, presetKey, font, stroke, bold, fnType, inputMode, size } = ce.detail;
      if (type === 'switch_bbt_mode' && mode) {
        if (['auto', 'variation', 'sign_chart'].includes(mode)) {
          setMasterMode(mode);
          if (mode === 'sign_chart') setBbtMode('sign_chart');
          else if (mode === 'variation') setBbtMode('variation');
        }
      } else if (type === 'select_fn_type' && fnType) {
        setAutoFnType(fnType);
        if (fnType === 'rational_2_1') setAutoCoeffs({ a: 1, b: -1, c: 1, d: 1, e: -1 });
        if (fnType === 'rational_1_1') setAutoCoeffs({ a: 2, b: 1, c: 1, d: -1, e: 0 });
        if (fnType === 'cubic') setAutoCoeffs({ a: 1, b: 0, c: -3, d: 0, e: 0 });
        if (fnType === 'quartic') setAutoCoeffs({ a: 1, b: -2, c: -3, d: 0, e: 0 });
      } else if (type === 'switch_input_mode' && inputMode) {
        setAutoInputMode(inputMode);
      } else if (type === 'set_font_size' && size) {
        setFontSizeMode(size);
      } else if (type === 'copy_word') {
        if (masterMode === 'auto') {
          handleCopyAutoImage();
        } else {
          handleCopyImage();
        }
      } else if (type === 'open_crop') {
        let dataUrl: string | null = null;
        if (masterMode === 'auto') {
          if (autoCanvasRef.current) {
            const cropped = cropCanvasToContent(autoCanvasRef.current, 4);
            dataUrl = cropped.toDataURL('image/png');
          }
        } else {
          const canvas = document.createElement('canvas');
          drawBBTToCanvas(canvas, points, bbtMode, fontChoice, colorStyle, 3.0, fontSizeMode, tableWidthMode, strokeChoice, isBoldLabels);
          const cropped = cropCanvasToContent(canvas, 4);
          dataUrl = cropped.toDataURL('image/png');
        }
        if (dataUrl) {
          window.dispatchEvent(new CustomEvent('lvp_open_crop_modal', {
            detail: {
              dataUrl,
              title: masterMode === 'auto' ? 'Bảng biến thiên tự động' : 'Bảng biến thiên tùy biến',
            }
          }));
        }
      } else if (type === 'download_png') {
        if (masterMode === 'auto') {
          handleDownloadAutoPng();
        } else {
          handleDownloadPng();
        }
      } else if (type === 'download_svg') {
        handleDownloadSvg();
      } else if (type === 'set_font' && font) {
        setFontChoice(font);
      } else if (type === 'set_stroke' && stroke) {
        setStrokeChoice(stroke);
      } else if (type === 'set_bold' !== undefined && bold !== undefined) {
        setIsBoldLabels(bold);
      } else if (type === 'select_bbt_preset' && presetKey) {
        loadPreset(presetKey);
      }
    };
    window.addEventListener('lvp_ribbon_action', handleRibbonAction);
    return () => window.removeEventListener('lvp_ribbon_action', handleRibbonAction);
  }, [masterMode, autoInputMode, autoFnType, autoCoeffs, autoFnInput, fontChoice, strokeChoice, isBoldLabels, fontSizeMode]);

  // Báo trạng thái lên Ribbon
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('lvp_bbt_state_change', {
      detail: {
        masterMode,
        autoFnType,
        autoInputMode,
        fontChoice,
        strokeChoice,
        isBoldLabels,
        fontSizeMode,
      }
    }));
  }, [masterMode, autoFnType, autoInputMode, fontChoice, strokeChoice, isBoldLabels, fontSizeMode]);

  const fontFamilyStyle = MATH_FONT_FAMILIES[fontChoice];
  const isMono = colorStyle === 'monochrome';
  const strokeColor = '#000000';
  const textColor = '#000000';
  const plusColor = isMono ? '#000000' : '#0d9488';
  const minusColor = isMono ? '#000000' : '#e11d48';

  return (
    <div className="w-full max-w-[1600px] mx-auto p-2 sm:p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 animate-fade-in">
      
      {/* THÔNG BÁO COPY & STATUS */}
      {copyStatus && (
        <div className={`p-3 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-fade-in ${
          copyStatus === 'copied' || copyStatus === 'transferred'
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>
              {copyStatus === 'copied'
                ? 'Đã sao chép ảnh Bảng biến thiên (300 DPI)! Mở Microsoft Word và nhấn phím Ctrl + V để dán ngay.'
                : copyStatus === 'transferred'
                  ? 'Đã nạp toàn bộ dữ liệu tự động sang Bảng tùy biến chi tiết! Thầy/Cô có thể tùy ý chỉnh sửa từng điểm.'
                  : 'Đã tải tệp ảnh độ nét cao về máy tính.'}
            </span>
          </div>
          <button onClick={() => setCopyStatus(null)} className="text-xs opacity-70 hover:opacity-100 cursor-pointer">✕</button>
        </div>
      )}

      {/* =========================================================================
          CHẾ ĐỘ 1: TỰ ĐỘNG PHÂN TÍCH TỪ HÀM SỐ (AI / ENGINE TOÁN HỌC)
          ========================================================================= */}
      {masterMode === 'auto' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* CỘT TRÁI: CẤU HÌNH HÀM SỐ TỰ ĐỘNG (5 CỘT) */}
          <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders size={14} className="text-teal-600" />
                Cấu hình hàm số:
              </span>
              <div className="flex bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                <button
                  onClick={() => setAutoInputMode('coeffs')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${autoInputMode === 'coeffs' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-500'}`}
                >
                  Nhập hệ số (a,b,c...)
                </button>
                <button
                  onClick={() => setAutoInputMode('text')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${autoInputMode === 'text' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-500'}`}
                >
                  Gõ biểu thức f(x)
                </button>
              </div>
            </div>

            {autoInputMode === 'coeffs' ? (
              <div className="space-y-3">
                {/* Dạng hàm hiện tại (Đổi dạng tại thanh Ribbon Word ở trên) */}
                <div className="flex items-center justify-between p-2.5 bg-teal-50/70 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 text-xs font-bold text-teal-800 dark:text-teal-200">
                  <span className="truncate">
                    Dạng: {autoFnType === 'rational_2_1' ? 'Bậc 2 / 1: (ax²+bx+c)/(dx+e)' : autoFnType === 'rational_1_1' ? 'Phân thức: (ax+b)/(cx+d)' : autoFnType === 'cubic' ? 'Bậc 3: ax³+bx²+cx+d' : 'Bậc 4: ax⁴+bx²+c'}
                  </span>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-normal shrink-0 ml-2">Đổi trên Ribbon</span>
                </div>

                {/* Mẫu bài thi chuẩn SGK (1-Click) */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                    Mẫu SGK:
                  </span>
                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      if (autoFnType === 'rational_2_1') {
                        const presets = [
                          { id: '1', a: 1, b: -1, c: 1, d: 1, e: -1 },
                          { id: '2', a: 1, b: 1, c: 1, d: 1, e: -1 },
                          { id: '3', a: 1, b: -2, c: -3, d: 1, e: -1 },
                          { id: '4', a: -1, b: 2, c: 1, d: 1, e: 1 },
                        ];
                        const p = presets.find(x => x.id === val);
                        if (p) setAutoCoeffs({ a: p.a, b: p.b, c: p.c, d: p.d, e: p.e });
                      } else if (autoFnType === 'rational_1_1') {
                        const presets = [
                          { id: '1', a: 2, b: 1, c: 1, d: -1 },
                          { id: '2', a: 1, b: -2, c: 1, d: 1 },
                          { id: '3', a: -1, b: 1, c: 2, d: -3 },
                        ];
                        const p = presets.find(x => x.id === val);
                        if (p) setAutoCoeffs({ ...autoCoeffs, a: p.a, b: p.b, c: p.c, d: p.d });
                      } else if (autoFnType === 'cubic') {
                        const presets = [
                          { id: '1', a: 1, b: 0, c: -3, d: 0 },
                          { id: '2', a: -1, b: 3, c: 0, d: -1 },
                          { id: '3', a: 1, b: -3, c: 0, d: 2 },
                        ];
                        const p = presets.find(x => x.id === val);
                        if (p) setAutoCoeffs({ ...autoCoeffs, a: p.a, b: p.b, c: p.c, d: p.d });
                      } else if (autoFnType === 'quartic') {
                        const presets = [
                          { id: '1', a: 1, b: -2, c: -3 },
                          { id: '2', a: -1, b: 4, c: 1 },
                          { id: '3', a: 1, b: 2, c: 0 },
                        ];
                        const p = presets.find(x => x.id === val);
                        if (p) setAutoCoeffs({ ...autoCoeffs, a: p.a, b: p.b, c: p.c });
                      }
                    }}
                    className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-teal-500 cursor-pointer"
                  >
                    <option value="">-- Chọn hàm mẫu SGK nhanh --</option>
                    {autoFnType === 'rational_2_1' && (
                      <>
                        <option value="1">(x²-x+1)/(x-1)</option>
                        <option value="2">(x²+x+1)/(x-1)</option>
                        <option value="3">(x²-2x-3)/(x-1)</option>
                        <option value="4">(-x²+2x+1)/(x+1)</option>
                      </>
                    )}
                    {autoFnType === 'rational_1_1' && (
                      <>
                        <option value="1">(2x+1)/(x-1)</option>
                        <option value="2">(x-2)/(x+1)</option>
                        <option value="3">(-x+1)/(2x-3)</option>
                      </>
                    )}
                    {autoFnType === 'cubic' && (
                      <>
                        <option value="1">x³ - 3x</option>
                        <option value="2">-x³ + 3x² - 1</option>
                        <option value="3">x³ - 3x² + 2</option>
                      </>
                    )}
                    {autoFnType === 'quartic' && (
                      <>
                        <option value="1">x⁴ - 2x² - 3</option>
                        <option value="2">-x⁴ + 4x² + 1</option>
                        <option value="3">x⁴ + 2x²</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Nhập hệ số */}
                <div className={`grid gap-2 pt-1 ${autoFnType === 'rational_2_1' ? 'grid-cols-5' : autoFnType === 'quartic' ? 'grid-cols-3' : 'grid-cols-4'}`}>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block mb-0.5">a:</span>
                    <input
                      type="number"
                      step="any"
                      value={autoCoeffs.a}
                      onChange={e => setAutoCoeffs({ ...autoCoeffs, a: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 text-center font-bold text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block mb-0.5">b:</span>
                    <input
                      type="number"
                      step="any"
                      value={autoCoeffs.b}
                      onChange={e => setAutoCoeffs({ ...autoCoeffs, b: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 text-center font-bold text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block mb-0.5">c:</span>
                    <input
                      type="number"
                      step="any"
                      value={autoCoeffs.c}
                      onChange={e => setAutoCoeffs({ ...autoCoeffs, c: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 text-center font-bold text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  {(autoFnType === 'cubic' || autoFnType === 'rational_1_1' || autoFnType === 'rational_2_1') && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">d:</span>
                      <input
                        type="number"
                        step="any"
                        value={autoCoeffs.d}
                        onChange={e => setAutoCoeffs({ ...autoCoeffs, d: parseFloat(e.target.value) || 0 })}
                        className="w-full p-1.5 text-center font-bold text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  )}
                  {autoFnType === 'rational_2_1' && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">e:</span>
                      <input
                        type="number"
                        step="any"
                        value={autoCoeffs.e}
                        onChange={e => setAutoCoeffs({ ...autoCoeffs, e: parseFloat(e.target.value) || 0 })}
                        className="w-full p-1.5 text-center font-bold text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">Nhập biểu thức f(x):</span>
                  <input
                    type="text"
                    value={autoFnInput}
                    onChange={e => setAutoFnInput(e.target.value)}
                    placeholder="Ví dụ: x^3 - 3*x + 1, (2*x+1)/(x-1)..."
                    className="w-full p-2.5 font-mono text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-teal-800 dark:text-teal-200"
                  />
                </div>
                <div className="text-[11px] text-slate-400">
                  Hỗ trợ: đa thức bậc 2, 3, 4, phân thức hữu tỉ, căn thức, luỹ thừa...
                </div>
              </div>
            )}

            {/* Khảo sát trên đoạn [a; b] */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={autoUseInterval}
                  onChange={e => setAutoUseInterval(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Khảo sát BBT trên đoạn/khoảng [a; b] (Tìm GTLN/GTNN):</span>
              </label>

              {autoUseInterval && (
                <div className="space-y-2 pt-1 animate-fade-in">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">Mút trái a:</span>
                      <input
                        type="text"
                        value={rawIntervalMin}
                        onChange={e => {
                          setRawIntervalMin(e.target.value);
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            setAutoInterval(prev => ({ ...prev, min: val }));
                          }
                        }}
                        className="w-full p-1.5 text-center font-bold bg-slate-50 dark:bg-slate-800 border rounded"
                        placeholder="-3"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">Mút phải b:</span>
                      <input
                        type="text"
                        value={rawIntervalMax}
                        onChange={e => {
                          setRawIntervalMax(e.target.value);
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            setAutoInterval(prev => ({ ...prev, max: val }));
                          }
                        }}
                        className="w-full p-1.5 text-center font-bold bg-slate-50 dark:bg-slate-800 border rounded"
                        placeholder="2"
                      />
                    </div>
                  </div>

                  {minMaxResult && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                      {minMaxResult.hasAsymptote ? (
                        <div className="text-amber-600 dark:text-amber-400 font-semibold">
                          ⚠️ Hàm số có tiệm cận đứng trên đoạn/khoảng khảo sát.
                        </div>
                      ) : (
                        <div className="bg-teal-50/80 dark:bg-teal-950/40 p-2 rounded-lg border border-teal-200 dark:border-teal-800 space-y-1">
                          {minMaxResult.maxVal !== null && (
                            <div className="text-teal-900 dark:text-teal-100">
                              <strong>GTLN (max y):</strong>{' '}
                              <span className="font-bold text-teal-700 dark:text-teal-300">{formatNum(minMaxResult.maxVal)}</span>{' '}
                              tại <span className="font-mono">x = {minMaxResult.maxAt.map(x => formatNum(x)).join('; ')}</span>
                            </div>
                          )}
                          {minMaxResult.minVal !== null && (
                            <div className="text-teal-900 dark:text-teal-100">
                              <strong>GTNN (min y):</strong>{' '}
                              <span className="font-bold text-teal-700 dark:text-teal-300">{formatNum(minMaxResult.minVal)}</span>{' '}
                              tại <span className="font-mono">x = {minMaxResult.minAt.map(x => formatNum(x)).join('; ')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* NÚT CHUYỂN SANG CHẾ ĐỘ CHỈNH SỬA THỦ CÔNG */}
            <button
              type="button"
              onClick={handleTransferToManual}
              className="w-full py-2.5 px-3 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              title="Chuyển bảng biến thiên tự động này sang chế độ chỉnh sửa từng điểm"
            >
              <ArrowRight size={15} />
              <span>Chuyển sang chế độ Tùy biến chi tiết (Từng mốc điểm)</span>
            </button>
          </div>

          {/* CỘT PHẢI: KHUNG VẼ CANVAS TỰ ĐỘNG & THANH CÔNG CỤ (7 CỘT) */}
          <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center min-h-[460px] space-y-4">
            
            {/* TIÊU ĐỀ KHUNG VẼ (ĐIỀU KHIỂN XUẤT ẢNH & ĐỊNH DẠNG TẠI THANH RIBBON WORD Ở TRÊN) */}
            <div className="w-full flex items-center justify-between pb-1 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
                <Sparkles size={15} />
                <span>Bản vẽ Bảng biến thiên tự động (Độ nét cao 300 DPI)</span>
              </span>
              <div className="flex items-center gap-2">
                {onInsertImage && (
                  <button
                    onClick={() => {
                      if (autoCanvasRef.current) {
                        const cropped = cropCanvasToContent(autoCanvasRef.current, 4);
                        onInsertImage(cropped.toDataURL('image/png'));
                      }
                    }}
                    className="px-3 py-1 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    <span>Chèn ảnh vào đề thi</span>
                  </button>
                )}
                <button
                  onClick={handleCopyAutoImage}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 rounded-xl hover:bg-teal-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Sao chép ảnh (Ctrl+V để dán Word)"
                >
                  <Copy size={13} />
                  <span>Chép Word</span>
                </button>
              </div>
            </div>

            {/* VÙNG HIỂN THỊ CANVAS */}
            <div className="w-full overflow-x-auto p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-center min-h-[280px]">
              <canvas ref={autoCanvasRef} className="max-w-full h-auto" />
            </div>

            {/* CHÚ THÍCH PHÂN TÍCH */}
            {analyzedData && (
              <div className="w-full text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Hàm số: <strong className="font-mono text-teal-700 dark:text-teal-300">{analyzedData.fnDisplay}</strong></span>
                <span className="text-[11px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full font-semibold">Chuẩn in ấn 300 DPI</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          CHẾ ĐỘ 2 & 3: TÙY BIẾN CHI TIẾT & BẢNG XÉT DẤU (MỐC ĐIỂM + TEMPLATES)
          ========================================================================= */}
      {(masterMode === 'variation' || masterMode === 'sign_chart') && (
        <div className="space-y-4 animate-fade-in">
          {/* MẪU SGK NHANH */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-thin">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0">
              <Bookmark size={14} className="text-teal-600" />
              <span>Mẫu SGK:</span>
            </span>
            {[
              { key: 'cubic_image1', label: 'Bậc 3 (x = -1, 3)' },
              { key: 'rational_2_1', label: 'Bậc 2/1 (TCĐ x = 1)' },
              { key: 'cubic_2_extrema', label: 'Bậc 3 (2 cực trị, a > 0)' },
              { key: 'cubic_negative_a', label: 'Bậc 3 (a < 0)' },
              { key: 'quartic_3_extrema', label: 'Trùng phương (3 cực trị)' },
              { key: 'rational_1_1', label: 'Phân thức (ax+b)/(cx+d)' },
              { key: 'sign_quadratic', label: 'Bảng xét dấu tam thức' },
            ].map((item) => {
              const isSelected = selectedPreset === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => loadPreset(item.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs shrink-0 cursor-pointer transition flex items-center gap-1 ${
                    isSelected
                      ? 'bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-xs'
                      : 'bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* GRID CỘT TRÁI (ĐIỂM MỐC) & CỘT PHẢI (BẢN VẼ) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* CỘT TRÁI (5 CỘT): DANH SÁCH CÁC ĐIỂM MỐC */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">
                    Thiết lập từng cột mốc tọa độ:
                  </span>
                  <button
                    onClick={handleAddPoint}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-xs whitespace-nowrap shrink-0"
                  >
                    <Plus size={13} />
                    <span>Thêm mốc x</span>
                  </button>
                </div>

                {/* DANH SÁCH CÁC ĐIỂM MỐC */}
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
                  {points.map((pt, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === points.length - 1;

                    return (
                      <div 
                        key={pt.id} 
                        className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2.5"
                      >
                        {/* HÀNG 1: MỐC THỨ TỰ & HOÀNH ĐỘ X */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-500">x:</span>
                              <input
                                type="text"
                                value={pt.xVal}
                                onChange={(e) => handleUpdatePoint(pt.id, { xVal: e.target.value })}
                                className="w-20 px-2 py-0.5 text-center font-bold text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-teal-900 dark:text-teal-100"
                                placeholder="x"
                              />
                            </div>
                          </div>

                          {!isFirst && !isLast && (
                            <button
                              onClick={() => handleDeletePoint(pt.id)}
                              className="text-slate-400 hover:text-red-500 cursor-pointer p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Xóa mốc này"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        {/* HÀNG 2: TRẠNG THÁI TẠI ĐIỂM & DẤU KHOẢNG BÊN PHẢI (THEO HÀNG NGANG) */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Tại mốc y':</span>
                            <select
                              value={pt.derivType}
                              onChange={(e) => handleUpdatePoint(pt.id, { derivType: e.target.value as any })}
                              className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              <option value="0">0 (Nghiệm)</option>
                              <option value="double_bar">|| (Vạch đôi K.X.Đ)</option>
                              <option value="single_bar">| (Vạch đơn)</option>
                              <option value="blank">Để trống</option>
                            </select>
                          </div>

                          {!isLast ? (
                            <div>
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Dấu khoảng sau:</span>
                              <select
                                value={pt.intervalSign}
                                onChange={(e) => handleUpdatePoint(pt.id, { intervalSign: e.target.value as any })}
                                className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-teal-700 dark:text-teal-300 cursor-pointer"
                              >
                                <option value="+">+ (Dương)</option>
                                <option value="-">- (Âm)</option>
                                <option value="blank">Để trống</option>
                              </select>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 flex items-center pt-5">
                              (Điểm mút cuối)
                            </div>
                          )}
                        </div>

                        {/* HÀNG 3: GIÁ TRỊ Y VÀ VỊ TRÍ MŨI TÊN (THEO HÀNG NGANG) */}
                        {bbtMode === 'variation' && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                            {pt.derivType !== 'double_bar' ? (
                              <div className="grid grid-cols-2 gap-2 items-center">
                                <div>
                                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                    Giá trị y:
                                  </span>
                                  <input
                                    type="text"
                                    value={pt.yVal}
                                    onChange={(e) => handleUpdatePoint(pt.id, { yVal: e.target.value })}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center"
                                    placeholder="y"
                                  />
                                </div>
                                <div>
                                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                    Vị trí mũi tên:
                                  </span>
                                  <select
                                    value={pt.yPos}
                                    onChange={(e) => handleUpdatePoint(pt.id, { yPos: e.target.value as any })}
                                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                                  >
                                    <option value="top">Ở trên cao (Cực đại)</option>
                                    <option value="bottom">Ở dưới thấp (Cực tiểu)</option>
                                    <option value="middle">Ở giữa</option>
                                  </select>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                    y (Trái vạch ||):
                                  </span>
                                  <div className="flex gap-1.5 items-center">
                                    <input
                                      type="text"
                                      value={pt.yVal}
                                      onChange={(e) => handleUpdatePoint(pt.id, { yVal: e.target.value })}
                                      className="w-14 px-1.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center shrink-0"
                                      placeholder="-inf"
                                    />
                                    <select
                                      value={pt.yPos}
                                      onChange={(e) => handleUpdatePoint(pt.id, { yPos: e.target.value as any })}
                                      className="flex-1 min-w-0 px-1 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] cursor-pointer"
                                    >
                                      <option value="top">Trên</option>
                                      <option value="bottom">Dưới</option>
                                      <option value="middle">Giữa</option>
                                    </select>
                                  </div>
                                </div>

                                <div>
                                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                    y (Phải vạch ||):
                                  </span>
                                  <div className="flex gap-1.5 items-center">
                                    <input
                                      type="text"
                                      value={pt.yRightVal || ''}
                                      onChange={(e) => handleUpdatePoint(pt.id, { yRightVal: e.target.value })}
                                      className="w-14 px-1.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center shrink-0"
                                      placeholder="+inf"
                                    />
                                    <select
                                      value={pt.yRightPos || 'top'}
                                      onChange={(e) => handleUpdatePoint(pt.id, { yRightPos: e.target.value as any })}
                                      className="flex-1 min-w-0 px-1 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] cursor-pointer"
                                    >
                                      <option value="top">Trên</option>
                                      <option value="bottom">Dưới</option>
                                      <option value="middle">Giữa</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* CỘT PHẢI (7 CỘT): KHUNG VẼ BẢNG BIẾN THIÊN & NÚT XUẤT */}
            <div className="lg:col-span-7 space-y-4">
              {/* TIÊU ĐỀ KHUNG VẼ (ĐIỀU KHIỂN XUẤT ẢNH & ĐỊNH DẠNG TẠI THANH RIBBON WORD Ở TRÊN) */}
              <div className="w-full flex items-center justify-between pb-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
                  <Table size={15} />
                  <span>Bản vẽ Bảng biến thiên tùy biến (Độ nét cao 300 DPI)</span>
                </span>
                <div className="flex items-center gap-2">
                  {onInsertImage && (
                    <button
                      onClick={() => {
                        const canvas = document.createElement('canvas');
                        drawBBTToCanvas(canvas, points, bbtMode, fontChoice, colorStyle, 3.0, fontSizeMode, tableWidthMode, strokeChoice, isBoldLabels);
                        const cropped = cropCanvasToContent(canvas, 4);
                        onInsertImage(cropped.toDataURL('image/png'));
                      }}
                      className="px-3 py-1 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                    >
                      <CheckCircle2 size={14} />
                      <span>Chèn ảnh vào đề thi</span>
                    </button>
                  )}
                  <button
                    onClick={handleCopyImage}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 rounded-xl hover:bg-teal-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Sao chép ảnh (Ctrl+V để dán Word)"
                  >
                    <Copy size={13} />
                    <span>Chép Word</span>
                  </button>
                </div>
              </div>

              {/* VÙNG VẼ SVG BẢNG BIẾN THIÊN */}
              {(() => {
                const fontMultiplier = fontSizeMode === 'extra' ? 1.55 : fontSizeMode === 'standard' ? 1.1 : 1.35;
                const numPts = points.length;

                const svgW = tableWidthMode === 'wide' 
                  ? 740 
                  : tableWidthMode === 'compact' 
                    ? 580 
                    : Math.min(740, Math.max(560, numPts <= 3 ? 540 : numPts === 4 ? 614 : numPts === 5 ? 660 : 720));

                const paddingX = 15;
                const tableX = paddingX;
                const tableW = svgW - 2 * paddingX;
                const colLabelW = 58;
                const dataAreaX = tableX + colLabelW;
                const dataAreaW = tableW - colLabelW;

                const hRowX = Math.round(45 * (fontMultiplier > 1.3 ? 1.05 : 1));
                const hRowDeriv = Math.round(43 * (fontMultiplier > 1.3 ? 1.05 : 1));
                const hRowY = bbtMode === 'variation' ? 148 : 0;
                const tableH = hRowX + hRowDeriv + hRowY;
                const tableY = 20;

                const yRow1 = tableY;
                const yRow2 = yRow1 + hRowX;
                const yRow3 = yRow2 + hRowDeriv;
                const yBottom = yRow3 + hRowY;
                const svgH = yBottom + 25;

                const colStep = dataAreaW / Math.max(1, numPts - 1);
                const getColX = (index: number) => {
                  if (index === 0) return dataAreaX + 35;
                  if (index === numPts - 1) return dataAreaX + dataAreaW - 35;
                  return dataAreaX + index * colStep;
                };

                const padY = 22;
                const yTop = yRow3 + padY;
                const yMid = yRow3 + hRowY / 2;
                const yBot = yBottom - padY;

                const getYCoord = (pos: 'top' | 'bottom' | 'middle') => {
                  if (pos === 'top') return yTop;
                  if (pos === 'bottom') return yBot;
                  return yMid;
                };

                return (
                  <div className="w-full overflow-x-auto p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-center">
                    <svg
                      ref={svgRef}
                      viewBox={`0 0 ${svgW} ${svgH}`}
                      className="w-full max-w-[740px] h-auto select-none"
                      style={{ fontFamily: fontFamilyStyle }}
                    >
                      <rect width={svgW} height={svgH} fill="#FFFFFF" />

                      {/* Khung viền ngoài */}
                      <rect
                        x={tableX}
                        y={tableY}
                        width={tableW}
                        height={tableH}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="2.2"
                      />

                      {/* Đường dọc nhãn */}
                      <line
                        x1={dataAreaX}
                        y1={tableY}
                        x2={dataAreaX}
                        y2={yBottom}
                        stroke={strokeColor}
                        strokeWidth="2.0"
                      />

                      {/* Đường ngang x - y' */}
                      <line
                        x1={tableX}
                        y1={yRow2}
                        x2={tableX + tableW}
                        y2={yRow2}
                        stroke={strokeColor}
                        strokeWidth="1.8"
                      />

                      {/* Đường ngang y' - y */}
                      {bbtMode === 'variation' && (
                        <line
                          x1={tableX}
                          y1={yRow3}
                          x2={tableX + tableW}
                          y2={yRow3}
                          stroke={strokeColor}
                          strokeWidth="1.8"
                        />
                      )}

                      {/* Cột nhãn */}
                      <text
                        x={tableX + colLabelW / 2}
                        y={yRow1 + hRowX / 2}
                        dominantBaseline="central"
                        textAnchor="middle"
                        fill={textColor}
                        fontStyle="italic"
                        fontWeight={isBoldLabels ? 'bold' : 'normal'}
                        fontSize={Math.round(18 * fontMultiplier)}
                      >
                        x
                      </text>

                      <text
                        x={tableX + colLabelW / 2}
                        y={yRow2 + hRowDeriv / 2}
                        dominantBaseline="central"
                        textAnchor="middle"
                        fill={textColor}
                        fontStyle="italic"
                        fontWeight={isBoldLabels ? 'bold' : 'normal'}
                        fontSize={Math.round(18 * fontMultiplier)}
                      >
                        {bbtMode === 'variation' ? "y'" : "f'(x)"}
                      </text>

                      {bbtMode === 'variation' && (
                        <text
                          x={tableX + colLabelW / 2}
                          y={yRow3 + hRowY / 2}
                          dominantBaseline="central"
                          textAnchor="middle"
                          fill={textColor}
                          fontStyle="italic"
                          fontWeight={isBoldLabels ? 'bold' : 'normal'}
                          fontSize={Math.round(18 * fontMultiplier)}
                        >
                          y
                        </text>
                      )}

                      {/* Các điểm x & vạch tại điểm */}
                      {points.map((pt, i) => {
                        const px = getColX(i);
                        const barH = bbtMode === 'variation' ? (yBottom - yRow2) : hRowDeriv;

                        return (
                          <g key={pt.id}>
                            <text
                              x={px}
                              y={yRow1 + hRowX / 2}
                              dominantBaseline="central"
                              textAnchor="middle"
                              fill={textColor}
                              fontWeight={isBoldLabels ? 'bold' : 'normal'}
                              fontSize={Math.round(16 * fontMultiplier)}
                            >
                              {formatDisplayMath(pt.xVal)}
                            </text>

                            {pt.derivType === '0' && (
                              <text
                                x={px}
                                y={yRow2 + hRowDeriv / 2}
                                dominantBaseline="central"
                                textAnchor="middle"
                                fill={textColor}
                                fontWeight={isBoldLabels ? 'bold' : 'normal'}
                                fontSize={Math.round(16 * fontMultiplier)}
                              >
                                0
                              </text>
                            )}

                            {pt.derivType === 'double_bar' && (
                              <g>
                                <line
                                  x1={px - 2.5}
                                  y1={yRow2}
                                  x2={px - 2.5}
                                  y2={yRow2 + barH}
                                  stroke={strokeColor}
                                  strokeWidth="2.0"
                                />
                                <line
                                  x1={px + 2.5}
                                  y1={yRow2}
                                  x2={px + 2.5}
                                  y2={yRow2 + barH}
                                  stroke={strokeColor}
                                  strokeWidth="2.0"
                                />
                              </g>
                            )}

                            {pt.derivType === 'single_bar' && (
                              <line
                                x1={px}
                                y1={yRow2}
                                x2={px}
                                y2={yRow2 + barH}
                                stroke={strokeColor}
                                strokeWidth="1.6"
                              />
                            )}
                          </g>
                        );
                      })}

                      {/* Dấu khoảng sau */}
                      {points.map((pt, i) => {
                        if (i >= numPts - 1 || !pt.intervalSign || pt.intervalSign === 'blank') return null;
                        const xLeft = getColX(i);
                        const xRight = getColX(i + 1);
                        const midX = (xLeft + xRight) / 2;
                        const midY = yRow2 + hRowDeriv / 2;

                        return (
                          <text
                            key={`sign-${pt.id}`}
                            x={midX}
                            y={midY}
                            dominantBaseline="central"
                            textAnchor="middle"
                            fill={pt.intervalSign === '+' ? plusColor : minusColor}
                            fontWeight={isBoldLabels ? 'bold' : 'normal'}
                            fontSize={Math.round(18 * fontMultiplier)}
                          >
                            {pt.intervalSign === '+' ? '+' : '−'}
                          </text>
                        );
                      })}

                      {/* Mũi tên biến thiên */}
                      {bbtMode === 'variation' && (
                        <g>
                          {points.map((p1, i) => {
                            if (i >= numPts - 1) return null;
                            const p2 = points[i + 1];
                            const x1 = getColX(i);
                            const x2 = getColX(i + 1);

                            const isDb1 = p1.derivType === 'double_bar';
                            const isDb2 = p2.derivType === 'double_bar';

                            const aX1 = isDb1 ? x1 + 28 : x1;
                            const aY1 = getYCoord(isDb1 ? (p1.yRightPos || 'top') : p1.yPos);
                            const val1 = isDb1 ? p1.yRightVal : p1.yVal;

                            const aX2 = isDb2 ? x2 - 28 : x2;
                            const aY2 = getYCoord(p2.yPos);
                            const val2 = p2.yVal;

                            const getSvgValHalfW = (text?: string) => {
                              if (!text) return 10;
                              const str = formatDisplayMath(text).trim();
                              if (str.includes('∞')) return Math.round(22 * (fontMultiplier > 1.2 ? 1.15 : 1));
                              if (str.includes('/')) return Math.round(20 * (fontMultiplier > 1.2 ? 1.15 : 1));
                              return Math.max(12, Math.round((str.length * 7 + 8) * (fontMultiplier > 1.2 ? 1.1 : 1)));
                            };

                            const w1 = getSvgValHalfW(val1);
                            const w2 = getSvgValHalfW(val2);
                            const R1 = w1 + 8;
                            const R2 = w2 + 8;

                            const dx = aX2 - aX1;
                            const dy = aY2 - aY1;

                            if (dx <= R1 + R2 + 10) return null;

                            const m = dy / dx;
                            const startX = aX1 + R1;
                            const startY = aY1 + m * R1;
                            const endX = aX2 - R2;
                            const endY = aY2 - m * R2;

                            const angle = Math.atan2(endY - startY, endX - startX);
                            const arrowLength = 10 * (strokeChoice === 'thin' ? 0.8 : strokeChoice === 'bold' ? 1.3 : 1.0);
                            const arrowWidth = Math.PI / 6;

                            const pArrow1X = endX - arrowLength * Math.cos(angle - arrowWidth);
                            const pArrow1Y = endY - arrowLength * Math.sin(angle - arrowWidth);
                            const pArrow2X = endX - arrowLength * Math.cos(angle + arrowWidth);
                            const pArrow2Y = endY - arrowLength * Math.sin(angle + arrowWidth);

                            const arrowStrokeW = 2.2 * (strokeChoice === 'thin' ? 0.75 : strokeChoice === 'bold' ? 1.4 : 1.0);

                            return (
                              <g key={`arrow-${p1.id}`}>
                                <line
                                  x1={startX}
                                  y1={startY}
                                  x2={endX}
                                  y2={endY}
                                  stroke={strokeColor}
                                  strokeWidth={arrowStrokeW}
                                />
                                <polygon
                                  points={`${endX},${endY} ${pArrow1X},${pArrow1Y} ${pArrow2X},${pArrow2Y}`}
                                  fill={strokeColor}
                                />
                              </g>
                            );
                          })}

                          {/* Giá trị y */}
                          {points.map((pt, i) => {
                            const px = getColX(i);
                            const yFontSz = Math.round(16 * fontMultiplier);

                            if (pt.derivType !== 'double_bar') {
                              return (
                                <g key={`yval-${pt.id}`}>
                                  <text
                                    x={px}
                                    y={getYCoord(pt.yPos)}
                                    dominantBaseline="central"
                                    textAnchor="middle"
                                    fill={textColor}
                                    fontWeight={isBoldLabels ? 'bold' : 'normal'}
                                    fontSize={yFontSz}
                                    paintOrder="stroke"
                                    stroke="#FFFFFF"
                                    strokeWidth="5"
                                    strokeLinejoin="round"
                                  >
                                    {formatDisplayMath(pt.yVal)}
                                  </text>
                                </g>
                              );
                            } else {
                              return (
                                <g key={`yval-db-${pt.id}`}>
                                  <text
                                    x={px - 28}
                                    y={getYCoord(pt.yPos)}
                                    dominantBaseline="central"
                                    textAnchor="middle"
                                    fill={textColor}
                                    fontWeight={isBoldLabels ? 'bold' : 'normal'}
                                    fontSize={yFontSz}
                                    paintOrder="stroke"
                                    stroke="#FFFFFF"
                                    strokeWidth="5"
                                    strokeLinejoin="round"
                                  >
                                    {formatDisplayMath(pt.yVal)}
                                  </text>
                                  <text
                                    x={px + 28}
                                    y={getYCoord(pt.yRightPos || 'top')}
                                    dominantBaseline="central"
                                    textAnchor="middle"
                                    fill={textColor}
                                    fontWeight={isBoldLabels ? 'bold' : 'normal'}
                                    fontSize={yFontSz}
                                    paintOrder="stroke"
                                    stroke="#FFFFFF"
                                    strokeWidth="5"
                                    strokeLinejoin="round"
                                  >
                                    {formatDisplayMath(pt.yRightVal)}
                                  </text>
                                </g>
                              );
                            }
                          })}
                        </g>
                      )}
                    </svg>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
