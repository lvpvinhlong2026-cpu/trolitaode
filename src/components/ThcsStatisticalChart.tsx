import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  BarChart, 
  BarChart2, 
  TrendingUp, 
  PieChart, 
  Plus, 
  Trash2, 
  Copy, 
  Download, 
  Check, 
  RotateCcw, 
  FileSpreadsheet, 
  X,
  Palette,
  Eye,
  Settings2,
  Sparkles
} from 'lucide-react';
import { addDpiToBlob, cropCanvasToContent } from '../utils/dpiUtils';
import MathFontSelector, { MathFontChoice, MathStrokeChoice, MATH_FONT_FAMILIES } from './MathFontSelector';

export type ChartType = 'bar' | 'grouped_bar' | 'line' | 'pie';

export interface DataSeries {
  id: string;
  name: string;
  values: number[];
  color: string;
  pattern?: string;
}

export interface StatisticalChartConfig {
  chartType: ChartType;
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  categories: string[];
  series: DataSeries[];
  showValues: boolean;
  showGrid: boolean;
  isBlackAndWhite: boolean;
  showLegend: boolean;
  showFrame: boolean;
  individualBarColors: boolean;
  individualColors: string[];
  individualPatterns: string[];
  fontFamily: MathFontChoice;
}

interface ThcsStatisticalChartProps {
  initialConfig?: StatisticalChartConfig;
  onInsertToCanvas?: (svgString: string, config: StatisticalChartConfig) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

const PRESET_COLORS = [
  '#2563eb', // Blue
  '#f97316', // Orange
  '#059669', // Emerald
  '#7c3aed', // Violet
  '#e11d48', // Rose
  '#d97706', // Amber
  '#0891b2', // Cyan
  '#475569', // Slate
];

const HATCH_PATTERNS = [
  { id: 'none', label: 'Màu trơn' },
  { id: 'diag-right', label: 'Gạch xiên phải (/)' },
  { id: 'diag-left', label: 'Gạch xiên trái (\\)' },
  { id: 'cross', label: 'Lưới ô chéo (X)' },
  { id: 'dots', label: 'Chấm bi' },
  { id: 'vertical', label: 'Sọc đứng (|)' },
  { id: 'horizontal', label: 'Sọc ngang (-)' },
];

export const PRESET_SAMPLES = [
  {
    id: 'sample_damsen',
    title: 'Doanh thu bán hàng và dịch vụ công viên nước Đầm Sen',
    type: 'bar' as ChartType,
    xAxisLabel: 'Năm',
    yAxisLabel: 'Tỷ đồng',
    categories: ['2018', '2019', '2020', '2021'],
    series: [
      { id: 's1', name: 'Doanh thu', values: [216.7, 219.5, 84.3, 26.2], color: '#3b82f6', pattern: 'diag-right' }
    ],
    showValues: true,
    showGrid: true,
    showLegend: false,
    isBlackAndWhite: false,
    showFrame: false,
    individualBarColors: false,
    individualColors: ['#3b82f6', '#3b82f6', '#3b82f6', '#3b82f6'],
    individualPatterns: ['diag-right', 'diag-right', 'diag-right', 'diag-right']
  },
  {
    id: 'sample_two_classes',
    title: 'Số học sinh đạt điểm giỏi, khá của hai lớp',
    type: 'grouped_bar' as ChartType,
    xAxisLabel: 'Loại',
    yAxisLabel: 'Số học sinh',
    categories: ['Giỏi', 'Khá', 'Đạt', 'Chưa đạt'],
    series: [
      { id: 's1', name: 'Lớp 7A', values: [12, 18, 8, 2], color: '#3b82f6', pattern: 'diag-right' },
      { id: 's2', name: 'Lớp 7B', values: [10, 20, 7, 3], color: '#f97316', pattern: 'diag-left' }
    ],
    showValues: true,
    showGrid: true,
    showLegend: true,
    isBlackAndWhite: false,
    showFrame: false,
    individualBarColors: false,
    individualColors: PRESET_COLORS.slice(0, 4),
    individualPatterns: ['diag-right', 'diag-left', 'cross', 'dots']
  },
  {
    id: 'sample_temperature',
    title: 'Nhiệt độ trung bình các tháng tại Hà Nội',
    type: 'line' as ChartType,
    xAxisLabel: 'Tháng',
    yAxisLabel: '°C',
    categories: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
    series: [
      { id: 's1', name: 'Nhiệt độ', values: [16.4, 17.0, 20.2, 23.7, 27.3, 28.8, 28.9, 28.2, 27.2, 24.6, 21.4, 18.2], color: '#ef4444' }
    ],
    showValues: true,
    showGrid: true,
    showLegend: false,
    isBlackAndWhite: false,
    showFrame: false,
    individualBarColors: false,
    individualColors: [],
    individualPatterns: []
  },
  {
    id: 'sample_academic',
    title: 'Tỉ lệ học sinh theo kết quả học tập HK1',
    type: 'pie' as ChartType,
    xAxisLabel: 'Xếp loại',
    yAxisLabel: 'Tỉ lệ (%)',
    categories: ['Tốt', 'Khá', 'Đạt', 'Chưa đạt'],
    series: [
      { id: 's1', name: 'Tỉ lệ', values: [25, 45, 20, 10], color: '#0d9488' }
    ],
    showValues: true,
    showGrid: false,
    showLegend: true,
    isBlackAndWhite: false,
    showFrame: false,
    individualBarColors: true,
    individualColors: ['#059669', '#3b82f6', '#f59e0b', '#ef4444'],
    individualPatterns: ['diag-right', 'diag-left', 'cross', 'dots']
  },
  {
    id: 'sample_export_import',
    title: 'Kim ngạch xuất nhập khẩu hàng hóa Việt Nam',
    type: 'grouped_bar' as ChartType,
    xAxisLabel: 'Năm',
    yAxisLabel: 'Tỷ USD',
    categories: ['2019', '2020', '2021', '2022'],
    series: [
      { id: 's1', name: 'Xuất khẩu', values: [264.3, 282.6, 336.3, 371.8], color: '#0284c7', pattern: 'diag-right' },
      { id: 's2', name: 'Nhập khẩu', values: [253.4, 262.7, 332.2, 360.6], color: '#ea580c', pattern: 'diag-left' }
    ],
    showValues: true,
    showGrid: true,
    showLegend: true,
    isBlackAndWhite: false,
    showFrame: false,
    individualBarColors: false,
    individualColors: PRESET_COLORS.slice(0, 4),
    individualPatterns: ['diag-right', 'diag-left', 'cross', 'dots']
  }
];

export default function ThcsStatisticalChart({
  initialConfig,
  onInsertToCanvas,
  onCancel,
  isModal = false
}: ThcsStatisticalChartProps) {
  // 1. Cấu hình biểu đồ
  const defaultConfig = PRESET_SAMPLES[0];
  const [chartType, setChartType] = useState<ChartType>(initialConfig?.chartType || defaultConfig.type);
  const [title, setTitle] = useState<string>(initialConfig?.title || defaultConfig.title);
  const [xAxisLabel, setXAxisLabel] = useState<string>(initialConfig?.xAxisLabel || defaultConfig.xAxisLabel);
  const [yAxisLabel, setYAxisLabel] = useState<string>(initialConfig?.yAxisLabel || defaultConfig.yAxisLabel);
  const [categories, setCategories] = useState<string[]>(initialConfig?.categories || defaultConfig.categories);
  const [series, setSeries] = useState<DataSeries[]>(initialConfig?.series || defaultConfig.series);
  
  // Tùy chọn hiển thị
  const [showValues, setShowValues] = useState<boolean>(initialConfig?.showValues ?? true);
  const [showGrid, setShowGrid] = useState<boolean>(initialConfig?.showGrid ?? true);
  const [isBlackAndWhite, setIsBlackAndWhite] = useState<boolean>(initialConfig?.isBlackAndWhite ?? false);
  const [showLegend, setShowLegend] = useState<boolean>(initialConfig?.showLegend ?? (defaultConfig.type === 'grouped_bar'));
  const [showFrame, setShowFrame] = useState<boolean>(initialConfig?.showFrame ?? false);
  const [individualBarColors, setIndividualBarColors] = useState<boolean>(initialConfig?.individualBarColors ?? false);
  const [individualColors, setIndividualColors] = useState<string[]>(initialConfig?.individualColors || PRESET_COLORS);
  const [individualPatterns, setIndividualPatterns] = useState<string[]>(initialConfig?.individualPatterns || ['diag-right', 'diag-left', 'cross', 'dots']);
  const [fontFamily, setFontFamily] = useState<MathFontChoice>(initialConfig?.fontFamily || 'times');
  const [strokeChoice, setStrokeChoice] = useState<MathStrokeChoice>('standard');
  const [isBold, setIsBold] = useState<boolean>(true);

  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Chọn loại biểu đồ
  const handleSelectChartType = (type: ChartType) => {
    setChartType(type);
    if (type === 'grouped_bar' && series.length < 2) {
      // Tự động thêm dãy thứ 2 cho cột kép nếu chưa có
      handleAddSeries('Dãy số liệu 2');
      setShowLegend(true);
    } else if (type === 'pie') {
      setShowLegend(true);
    }
  };



  // Chọn mẫu có sẵn
  const handleSelectPreset = (sampleId: string) => {
    const found = PRESET_SAMPLES.find(s => s.id === sampleId);
    if (!found) return;
    setChartType(found.type);
    setTitle(found.title);
    setXAxisLabel(found.xAxisLabel);
    setYAxisLabel(found.yAxisLabel);
    setCategories([...found.categories]);
    setSeries(JSON.parse(JSON.stringify(found.series)));
    setShowValues(found.showValues);
    setShowGrid(found.showGrid);
    setShowLegend(found.showLegend);
    setIsBlackAndWhite(found.isBlackAndWhite);
    setShowFrame(found.showFrame);
    setIndividualBarColors(found.individualBarColors);
    if (found.individualColors.length) setIndividualColors([...found.individualColors]);
    if (found.individualPatterns.length) setIndividualPatterns([...found.individualPatterns]);
  };

  // Lắng nghe sự kiện từ thanh Ribbon Word
  useEffect(() => {
    const handleThcsType = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce.detail?.type) {
        handleSelectChartType(ce.detail.type);
      }
    };
    const handleRibbonAction = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce.detail?.type === 'copy_word') {
        handleCopy300Dpi();
      } else if (ce.detail?.type === 'download_png') {
        handleDownloadPng();
      }
    };
    window.addEventListener('lvp_stat_thcs_type', handleThcsType);
    window.addEventListener('lvp_ribbon_action', handleRibbonAction);
    return () => {
      window.removeEventListener('lvp_stat_thcs_type', handleThcsType);
      window.removeEventListener('lvp_ribbon_action', handleRibbonAction);
    };
  }, []);

  // Thêm dòng dữ liệu mới
  const handleAddRow = () => {
    const nextIdx = categories.length + 1;
    const newCat = `Mục ${nextIdx}`;
    setCategories(prev => [...prev, newCat]);
    setSeries(prev => prev.map(s => ({
      ...s,
      values: [...s.values, 0]
    })));
  };



  // Thêm dãy số liệu (cột số liệu mới)
  const handleAddSeries = (customName?: string) => {
    const nextIdx = series.length + 1;
    const name = customName || `Dãy ${nextIdx}`;
    const color = PRESET_COLORS[(series.length) % PRESET_COLORS.length];
    const patterns = ['diag-right', 'diag-left', 'cross', 'dots', 'vertical', 'horizontal'];
    const pattern = patterns[(series.length) % patterns.length];

    const newSeries: DataSeries = {
      id: Date.now().toString(),
      name,
      values: categories.map(() => 0),
      color,
      pattern
    };


    setSeries(prev => [...prev, newSeries]);
    if (series.length >= 1) {
      setShowLegend(true);
    }
  };



  // Xóa dãy số liệu
  const handleDeleteSeries = (seriesId: string) => {
    if (series.length <= 1) return;
    setSeries(prev => prev.filter(s => s.id !== seriesId));
  };



  // Xóa dòng dữ liệu
  const handleDeleteRow = (index: number) => {
    if (categories.length <= 1) return;
    setCategories(prev => prev.filter((_, i) => i !== index));
    setSeries(prev => prev.map(s => ({
      ...s,
      values: s.values.filter((_, i) => i !== index)
    })));
  };



  // Cập nhật tên mục category
  const handleUpdateCategory = (index: number, val: string) => {
    setCategories(prev => prev.map((c, i) => i === index ? val : c));
  };



  // Cập nhật giá trị một ô
  const handleUpdateValue = (seriesIndex: number, rowIndex: number, rawVal: string) => {
    // Cho phép nhập cả dấu phẩy 216,7 lẫn dấu chấm 216.7
    const normalized = rawVal.replace(',', '.');
    const num = parseFloat(normalized);
    const finalVal = isNaN(num) ? 0 : num;
    setSeries(prev => prev.map((s, sIdx) => {
      if (sIdx !== seriesIndex) return s;
      const newVals = [...s.values];
      newVals[rowIndex] = finalVal;
      return { ...s, values: newVals };
    }));
  };



  // Xóa trắng bảng số liệu
  const handleClearAll = () => {
    setCategories(['Mục 1', 'Mục 2']);
    setSeries(prev => prev.map(s => ({ ...s, values: [0, 0] })));
  };



  // Hỗ trợ Paste từ Word / Excel / TSV
  const handlePasteTable = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (!text || (!text.includes('\t') && !text.includes('\n'))) return;
    
    // Phân tích các dòng
    const lines = text.trim().split(/\r?\n/).map(l => l.split('\t').map(c => c.trim()));
    if (lines.length === 0) return;

    e.preventDefault();

    // Giả sử dòng đầu hoặc cột đầu là nhãn
    // Kiểm tra hàng đầu tiên có chứa số hay toàn chữ
    const firstRowHasNum = lines[0].slice(1).some(c => !isNaN(parseFloat(c.replace(',', '.'))));
    let parsedCategories: string[] = [];
    let parsedSeriesNames: string[] = [];
    let startRow = 0;

    if (!firstRowHasNum && lines.length > 1) {
      // Dòng đầu tiên là tiêu đề cột
      parsedSeriesNames = lines[0].slice(1);
      startRow = 1;
    }

    const dataRows = lines.slice(startRow);
    parsedCategories = dataRows.map((r, i) => r[0] || `Mục ${i + 1}`);

    const colCount = Math.max(...dataRows.map(r => r.length - 1), 1);
    const newSeriesList: DataSeries[] = [];

    for (let col = 0; col < colCount; col++) {
      const name = parsedSeriesNames[col] || (series[col]?.name || `Dãy ${col + 1}`);
      const color = PRESET_COLORS[col % PRESET_COLORS.length];
      const patterns = ['diag-right', 'diag-left', 'cross', 'dots'];
      const vals = dataRows.map(r => {
        const raw = r[col + 1] || '0';
        const num = parseFloat(raw.replace(',', '.'));
        return isNaN(num) ? 0 : num;
      });
      newSeriesList.push({
        id: `s_${col}_${Date.now()}`,
        name,
        values: vals,
        color,
        pattern: patterns[col % patterns.length]
      });
    }

    setCategories(parsedCategories);
    setSeries(newSeriesList);
    if (newSeriesList.length > 1) {
      setShowLegend(true);
    }
  };



  // =========================================================================
  // TÍNH TOÁN TOẠ ĐỘ & BỐ CỤC SVG
  // =========================================================================
  const svgWidth = 680;
  const svgHeight = 440;
  const padding = { top: 50, right: 40, bottom: 65, left: 60 };

  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Tính toán Max Y và các vạch chia đẹp
  const { maxY, yTicks } = useMemo(() => {
    let max = 0;
    series.forEach(s => {
      s.values.forEach(v => {
        if (v > max) max = v;
      });
    });

    if (max <= 0) max = 10;

    // Làm tròn max Y đẹp theo SGK (ví dụ 219.5 -> 250 với 5 vạch chia)
    const getNiceMaxAndStep = (val: number) => {
      const roughStep = val / 5;
      const pow10 = Math.pow(10, Math.floor(Math.log10(roughStep)));
      const normalized = roughStep / pow10;
      let step: number;
      if (normalized <= 1) step = 1 * pow10;
      else if (normalized <= 2) step = 2 * pow10;
      else if (normalized <= 5) step = 5 * pow10;
      else step = 10 * pow10;

      const niceMax = Math.ceil((val * 1.08) / step) * step;
      const ticks: number[] = [];
      for (let t = 0; t <= niceMax + 0.0001; t += step) {
        ticks.push(Number(t.toFixed(4)));
      }
      return { maxY: niceMax, yTicks: ticks };
    };



    return getNiceMaxAndStep(max);
  }, [series]);

  // Hàm chuyển đổi giá trị Y sang toạ độ SVG Y
  const getY = (val: number) => {
    const clamped = Math.max(0, val);
    return padding.top + plotHeight - (clamped / maxY) * plotHeight;
  };



  // Dữ liệu cho biểu đồ Quạt tròn (Pie Chart)
  const pieData = useMemo(() => {
    if (chartType !== 'pie' || series.length === 0) return [];
    const vals = series[0].values;
    const total = vals.reduce((a, b) => a + Math.max(0, b), 0);
    if (total === 0) return [];

    let currentAngle = -Math.PI / 2; // Bắt đầu ở đỉnh 12 giờ
    return categories.map((cat, i) => {
      const v = Math.max(0, vals[i] || 0);
      const fraction = v / total;
      const angle = fraction * 2 * Math.PI;
      const startA = currentAngle;
      const endA = currentAngle + angle;
      currentAngle = endA;

      const midA = (startA + endA) / 2;
      return {
        category: cat,
        value: v,
        percentage: (fraction * 100).toFixed(1),
        startAngle: startA,
        endAngle: endA,
        midAngle: midA,
        color: individualColors[i % individualColors.length] || PRESET_COLORS[i % PRESET_COLORS.length],
        pattern: individualPatterns[i % individualPatterns.length] || 'diag-right'
      };


    });
  }, [chartType, series, categories, individualColors, individualPatterns]);

  // =========================================================================
  // XUẤT ẢNH & SAO CHÉP 300 DPI
  // =========================================================================
  const getSvgElement = (): SVGSVGElement | null => svgRef.current;

  // Lấy chuỗi mã SVG hoàn chỉnh
  const getFullSvgString = (): string => {
    const el = svgRef.current;
    if (!el) return '';
    const serializer = new XMLSerializer();
    let str = serializer.serializeToString(el);
    if (!str.includes('xmlns=')) {
      str = str.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    }
    return str;
  };



  // Sao chép ảnh 300 DPI vào Clipboard
  const handleCopy300Dpi = async () => {
    try {
      const svgEl = svgRef.current;
      if (!svgEl) return;

      setCopyStatus('copying');
      const svgStr = getFullSvgString();
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = async () => {
        const scale = 3; // 3x scale cho 300 DPI sắc nét
        const canvas = document.createElement('canvas');
        canvas.width = svgWidth * scale;
        canvas.height = svgHeight * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        const croppedCanvas = cropCanvasToContent(canvas, 6);
        croppedCanvas.toBlob(async (blob) => {
          if (!blob) return;
          const blobWithDpi = await addDpiToBlob(blob, 300);
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blobWithDpi })
          ]);
          setCopyStatus('copied');
          setTimeout(() => setCopyStatus(null), 2500);
          URL.revokeObjectURL(url);
        }, 'image/png');
      };


      img.src = url;
    } catch (err) {
      console.error('Lỗi sao chép ảnh:', err);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus(null), 3000);
    }
  };



  // Tải ảnh PNG 300 DPI
  const handleDownloadPng = async () => {
    try {
      const svgStr = getFullSvgString();
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const scale = 3;
        const canvas = document.createElement('canvas');
        canvas.width = svgWidth * scale;
        canvas.height = svgHeight * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const blobWithDpi = await addDpiToBlob(blob, 300);
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blobWithDpi);
          a.download = `Bieu_do_thong_ke_${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }, 'image/png');
      };


      img.src = url;
    } catch (e) {
      console.error('Lỗi tải ảnh:', e);
    }
  };



  // Tải file SVG Vector
  const handleDownloadSvg = () => {
    const svgStr = getFullSvgString();
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Bieu_do_vector_${Date.now()}.svg`;
    a.click();
  };



  // Chèn vào hình GSP
  const handleInsertToCanvas = () => {
    if (!onInsertToCanvas) return;
    const config: StatisticalChartConfig = {
      chartType,
      title,
      xAxisLabel,
      yAxisLabel,
      categories,
      series,
      showValues,
      showGrid,
      isBlackAndWhite,
      showLegend,
      showFrame,
      individualBarColors,
      individualColors,
      individualPatterns,
      fontFamily
    };


    onInsertToCanvas(getFullSvgString(), config);
  };



  return (
    <div className={`flex flex-col h-full bg-slate-50 dark:bg-slate-900 ${isModal ? 'p-1' : 'p-3 sm:p-5'}`}>
      
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 flex-wrap bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
            📊
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              Vẽ biểu đồ thống kê
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                THCS & THPT 300 DPI
              </span>
            </h2>
          </div>
        </div>

        {/* Dropdown lấy mẫu có sẵn */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium hidden sm:inline">Lấy mẫu có sẵn:</label>
          <select
            onChange={(e) => handleSelectPreset(e.target.value)}
            className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-teal-500 cursor-pointer"
            defaultValue=""
          >
            <option value="" disabled>-- Chọn mẫu SGK --</option>
            {PRESET_SAMPLES.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>

          {isModal && onCancel && (
            <button
              onClick={onCancel}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Đóng cửa sổ"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Content: Grid 2 cột (Cột Trái: Cấu hình; Cột Phải: Trực quan SVG) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-3 flex-1 overflow-y-auto">
        
        {/* ========================================================
            CỘT TRÁI: CẤU HÌNH & NHẬP BẢNG SỐ LIỆU (5/12)
            ======================================================== */}
        <div className="lg:col-span-5 space-y-3.5 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-y-auto max-h-[78vh] custom-scrollbar">
          
          {/* 4 Nút chọn Loại Biểu Đồ */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 uppercase tracking-wider">
              Loại Biểu Đồ
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={() => handleSelectChartType('bar')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  chartType === 'bar'
                    ? 'bg-teal-50 border-teal-500 text-teal-700 dark:bg-teal-950/40 dark:border-teal-400 dark:text-teal-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <BarChart size={18} className="mb-1 text-teal-600" />
                <span>Cột</span>
              </button>

              <button
                onClick={() => handleSelectChartType('grouped_bar')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  chartType === 'grouped_bar'
                    ? 'bg-teal-50 border-teal-500 text-teal-700 dark:bg-teal-950/40 dark:border-teal-400 dark:text-teal-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <BarChart2 size={18} className="mb-1 text-blue-600" />
                <span>Cột kép</span>
              </button>

              <button
                onClick={() => handleSelectChartType('line')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  chartType === 'line'
                    ? 'bg-teal-50 border-teal-500 text-teal-700 dark:bg-teal-950/40 dark:border-teal-400 dark:text-teal-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <TrendingUp size={18} className="mb-1 text-rose-500" />
                <span>Đoạn thẳng</span>
              </button>

              <button
                onClick={() => handleSelectChartType('pie')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  chartType === 'pie'
                    ? 'bg-teal-50 border-teal-500 text-teal-700 dark:bg-teal-950/40 dark:border-teal-400 dark:text-teal-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <PieChart size={18} className="mb-1 text-amber-500" />
                <span>Hình quạt tròn</span>
              </button>
            </div>
          </div>

          {/* Tiêu đề & Trục */}
          <div className="space-y-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Tiêu đề biểu đồ:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề biểu đồ..."
                className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            {chartType !== 'pie' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Tên trục ngang (Ox):
                  </label>
                  <input
                    type="text"
                    value={xAxisLabel}
                    onChange={(e) => setXAxisLabel(e.target.value)}
                    placeholder="Ví dụ: Năm, Lớp..."
                    className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Tên trục đứng & Đơn vị (Oy):
                  </label>
                  <input
                    type="text"
                    value={yAxisLabel}
                    onChange={(e) => setYAxisLabel(e.target.value)}
                    placeholder="Ví dụ: Tỷ đồng, Số HS..."
                    className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bảng số liệu */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Bảng số liệu
                </label>
                <p className="text-[10px] text-slate-400">
                  Enter: xuống dòng • Ctrl+V: dán từ Word/Excel
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearAll}
                  className="text-[11px] px-2 py-0.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                >
                  Xoá hết
                </button>
              </div>
            </div>

            {/* Bảng nhập liệu tương tác */}
            <div 
              onPaste={handlePasteTable}
              className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto max-h-56 scrollbar-thin"
            >
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    <th className="p-1.5 font-bold text-[11px] min-w-[90px]">
                      {xAxisLabel || (chartType === 'pie' ? 'Mục' : 'Tên trục ngang')}
                    </th>
                    {series.map((s, sIdx) => (
                      <th key={s.id} className="p-1.5 font-bold text-[11px] min-w-[90px]">
                        <div className="flex items-center justify-between gap-1">
                          <input
                            type="text"
                            value={s.name}
                            onChange={(e) => {
                              const v = e.target.value;
                              setSeries(prev => prev.map((item, idx) => idx === sIdx ? { ...item, name: v } : item));
                            }}
                            className="w-full bg-transparent border-none font-bold text-[11px] focus:outline-teal-500 text-slate-800 dark:text-slate-200"
                          />
                          {series.length > 1 && (
                            <button
                              onClick={() => handleDeleteSeries(s.id)}
                              className="text-slate-400 hover:text-rose-500 p-0.5"
                              title="Xóa dãy này"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="w-6 p-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, rowIdx) => (
                    <tr 
                      key={rowIdx}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    >
                      <td className="p-1">
                        <input
                          type="text"
                          value={cat}
                          onChange={(e) => handleUpdateCategory(rowIdx, e.target.value)}
                          className="w-full px-1.5 py-1 text-xs rounded bg-transparent border border-transparent hover:border-slate-200 focus:border-teal-500 outline-none text-slate-800 dark:text-slate-200"
                        />
                      </td>
                      {series.map((s, sIdx) => (
                        <td key={s.id} className="p-1">
                          <input
                            type="text"
                            value={s.values[rowIdx] !== undefined ? s.values[rowIdx] : ''}
                            onChange={(e) => handleUpdateValue(sIdx, rowIdx, e.target.value)}
                            className="w-full px-1.5 py-1 text-xs rounded bg-transparent border border-transparent hover:border-slate-200 focus:border-teal-500 outline-none text-slate-800 dark:text-slate-200 font-mono text-right"
                          />
                        </td>
                      ))}
                      <td className="p-1 text-center">
                        <button
                          onClick={() => handleDeleteRow(rowIdx)}
                          className="text-slate-300 hover:text-rose-500 transition p-0.5"
                          title="Xóa dòng"
                        >
                          <X size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Các nút thêm hàng, thêm cột */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleAddRow}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800 cursor-pointer transition"
              >
                <Plus size={13} />
                <span>+ Thêm dòng</span>
              </button>
              {chartType !== 'pie' && (
                <button
                  onClick={() => handleAddSeries()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition"
                >
                  <Plus size={13} />
                  <span>+ Thêm dãy số liệu</span>
                </button>
              )}
            </div>
          </div>

          {/* Tùy chọn Hiển thị */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1 uppercase tracking-wider">
              Hiển thị
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showValues}
                  onChange={(e) => setShowValues(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Ghi số liệu</span>
              </label>

              {chartType !== 'pie' && (
                <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>Đường lưới</span>
                </label>
              )}

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBlackAndWhite}
                  onChange={(e) => setIsBlackAndWhite(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="font-semibold text-slate-900 dark:text-white">
                  Đen trắng (tự gán hoa văn)
                </span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLegend}
                  onChange={(e) => setShowLegend(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Chú thích</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFrame}
                  onChange={(e) => setShowFrame(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Khung viền</span>
              </label>

              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <MathFontSelector
                  font={fontFamily}
                  onFontChange={setFontFamily}
                  stroke={strokeChoice}
                  onStrokeChange={setStrokeChoice}
                  isBold={isBold}
                  onBoldChange={setIsBold}
                  size="sm"
                />
              </div>
            </div>
          </div>

          {/* Màu & Hoa văn */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Màu & Hoa văn
              </label>
              {chartType === 'bar' && (
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={individualBarColors}
                    onChange={(e) => setIndividualBarColors(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>Mỗi cột một màu / hoa văn</span>
                </label>
              )}
            </div>

            {/* Bảng chọn màu cho các dãy */}
            <div className="space-y-1.5">
              {series.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-2 text-xs">
                  <span className="w-20 truncate text-slate-600 dark:text-slate-400 font-medium">
                    {s.name}:
                  </span>
                  
                  {/* Color input */}
                  <input
                    type="color"
                    value={s.color}
                    disabled={isBlackAndWhite}
                    onChange={(e) => {
                      const c = e.target.value;
                      setSeries(prev => prev.map((item, i) => i === idx ? { ...item, color: c } : item));
                    }}
                    className="w-7 h-7 rounded border border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-40"
                    title="Chọn màu"
                  />

                  {/* Pattern select */}
                  <select
                    value={s.pattern || 'diag-right'}
                    onChange={(e) => {
                      const p = e.target.value;
                      setSeries(prev => prev.map((item, i) => i === idx ? { ...item, pattern: p } : item));
                    }}
                    className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-700 dark:text-slate-300"
                  >
                    {HATCH_PATTERNS.map(hp => (
                      <option key={hp.id} value={hp.id}>{hp.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================
            CỘT PHẢI: KHUNG XEM TRƯỚC TRỰC QUAN SVG (7/12)
            ======================================================== */}
        <div className="lg:col-span-7 flex flex-col space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          
          {/* Action buttons (Sao chép 300 DPI, Tải PNG, Tải SVG) */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Khung xem trước biểu đồ SGK
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Nút Sao chép 300 DPI */}
              <button
                onClick={handleCopy300Dpi}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                  copyStatus === 'copied'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                }`}
                title="Sao chép ảnh độ phân giải cao 300 DPI dán trực tiếp vào Word (Ctrl + V)"
              >
                {copyStatus === 'copied' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copyStatus === 'copied' ? 'Đã sao chép 300 DPI' : 'Sao chép ảnh (300 DPI)'}</span>
              </button>

              {/* Nút Tải ảnh PNG */}
              <button
                onClick={handleDownloadPng}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                title="Tải ảnh PNG chuẩn 300 DPI"
              >
                <Download size={13} />
                <span className="hidden sm:inline">Tải PNG</span>
              </button>

              {/* Nút Tải file SVG */}
              <button
                onClick={handleDownloadSvg}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                title="Tải vector SVG"
              >
                <span>SVG</span>
              </button>
            </div>
          </div>

          {/* KHUNG HIỂN THỊ SVG TRỰC QUAN */}
          <div className="flex-1 flex items-center justify-center p-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 overflow-auto min-h-[380px]">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              width="100%"
              height="100%"
              className="max-h-[460px] select-none"
              style={{
                fontFamily: MATH_FONT_FAMILIES[fontFamily],
                background: '#FFFFFF'
              }}
            >
              {/* DEFINITIONS CHO HOA VĂN BLACK & WHITE */}
              <defs>
                <pattern id="pattern-diag-right" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#000000" strokeWidth="1.6" />
                </pattern>
                <pattern id="pattern-diag-left" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#000000" strokeWidth="1.6" />
                </pattern>
                <pattern id="pattern-cross" width="8" height="8" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="8" y2="8" stroke="#000000" strokeWidth="1.4" />
                  <line x1="8" y1="0" x2="0" y2="8" stroke="#000000" strokeWidth="1.4" />
                </pattern>
                <pattern id="pattern-dots" width="8" height="8" patternUnits="userSpaceOnUse">
                  <circle cx="4" cy="4" r="1.6" fill="#000000" />
                </pattern>
                <pattern id="pattern-vertical" width="6" height="6" patternUnits="userSpaceOnUse">
                  <line x1="3" y1="0" x2="3" y2="6" stroke="#000000" strokeWidth="1.5" />
                </pattern>
                <pattern id="pattern-horizontal" width="6" height="6" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="3" x2="6" y2="3" stroke="#000000" strokeWidth="1.5" />
                </pattern>
                
                {/* Mũi tên trục toạ độ */}
                <marker id="arrow-axis-x" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M 0 1.5 L 6 4 L 0 6.5 Z" fill="#000000" />
                </marker>
                <marker id="arrow-axis-y" markerWidth="8" markerHeight="8" refX="4" refY="2" orient="auto">
                  <path d="M 1.5 6 L 4 0 L 6.5 6 Z" fill="#000000" />
                </marker>
              </defs>

              {/* NỀN TRẮNG */}
              <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="#FFFFFF" />

              {/* KHUNG VIỀN NẾU ĐƯỢC BẬT */}
              {showFrame && (
                <rect 
                  x="4" 
                  y="4" 
                  width={svgWidth - 8} 
                  height={svgHeight - 8} 
                  fill="none" 
                  stroke="#cbd5e1" 
                  strokeWidth="1.2" 
                  rx="6"
                />
              )}

              {/* TIÊU ĐỀ BIỂU ĐỒ (IN ĐẬM, CĂN GIỮA) */}
              {title && (
                <text
                  x={svgWidth / 2}
                  y={26}
                  textAnchor="middle"
                  fontSize="15"
                  fontWeight={isBold ? 'bold' : 'normal'}
                  fill="#0f172a"
                >
                  {title}
                </text>
              )}

              {/* CHÚ THÍCH (LEGEND) CHO CỘT KÉP HOẶC HÌNH QUẠT TRÒN */}
              {showLegend && (
                <g transform={`translate(${svgWidth / 2}, 42)`}>
                  {chartType === 'pie' ? (
                    // Legend cho Pie Chart
                    <g>
                      {pieData.map((item, i) => {
                        const totalItems = pieData.length;
                        const spacing = 110;
                        const startX = -((totalItems - 1) * spacing) / 2;
                        const x = startX + i * spacing;
                        const fill = isBlackAndWhite ? `url(#pattern-${item.pattern})` : item.color;
                        return (
                          <g key={i} transform={`translate(${x}, 0)`}>
                            <rect 
                              x="-6" 
                              y="-6" 
                              width="12" 
                              height="12" 
                              fill={fill} 
                              stroke="#000000" 
                              strokeWidth="1"
                            />
                            <text x="10" y="3" fontSize="12" fill="#334155">
                              {item.category}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  ) : (
                    // Legend cho Biểu đồ Cột hoặc Đoạn thẳng
                    <g>
                      {series.map((s, i) => {
                        const totalSeries = series.length;
                        const spacing = 120;
                        const startX = -((totalSeries - 1) * spacing) / 2;
                        const x = startX + i * spacing;
                        const pat = s.pattern || (i % 2 === 0 ? 'diag-right' : 'diag-left');
                        const fill = isBlackAndWhite ? `url(#pattern-${pat})` : s.color;

                        return (
                          <g key={s.id} transform={`translate(${x}, 0)`}>
                            <rect 
                              x="-6" 
                              y="-6" 
                              width="12" 
                              height="12" 
                              fill={fill} 
                              stroke="#000000" 
                              strokeWidth="1"
                            />
                            <text x="10" y="3" fontSize="12" fill="#334155">
                              {s.name}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  )}
                </g>
              )}

              {/* =======================================================
                  NỘI DUNG VẼ THEO LOẠI BIỂU ĐỒ
                  ======================================================= */}
              {chartType === 'pie' ? (
                // 1. BIỂU ĐỒ HÌNH QUẠT TRÒN (PIE CHART)
                <g transform={`translate(${svgWidth / 2}, ${svgHeight / 2 + 18})`}>
                  {pieData.map((slice, i) => {
                    const r = 135;
                    const x1 = r * Math.cos(slice.startAngle);
                    const y1 = r * Math.sin(slice.startAngle);
                    const x2 = r * Math.cos(slice.endAngle);
                    const y2 = r * Math.sin(slice.endAngle);
                    const largeArc = (slice.endAngle - slice.startAngle) > Math.PI ? 1 : 0;
                    const d = `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

                    // Toạ độ ghi nhãn số liệu (% hoặc giá trị)
                    const labelR = r * 0.65;
                    const lx = labelR * Math.cos(slice.midAngle);
                    const ly = labelR * Math.sin(slice.midAngle);

                    const fill = isBlackAndWhite ? `url(#pattern-${slice.pattern})` : slice.color;

                    return (
                      <g key={i}>
                        <path
                          d={d}
                          fill={fill}
                          stroke="#000000"
                          strokeWidth="1.4"
                        />
                        {showValues && (
                          <text
                            x={lx}
                            y={ly}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="12"
                            fontWeight={isBold ? 'bold' : 'normal'}
                            fill={isBlackAndWhite ? '#000000' : '#FFFFFF'}
                            stroke={isBlackAndWhite ? '#FFFFFF' : 'none'}
                            strokeWidth={isBlackAndWhite ? 3 : 0}
                            paintOrder="stroke"
                          >
                            {slice.percentage}%
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              ) : (
                // 2. BIỂU ĐỒ CỘT, CỘT KÉP & ĐOẠN THẲNG
                <g>
                  {/* ĐƯỜNG LƯỚI NGANG (GRID LINES) */}
                  {showGrid && yTicks.map((tick, i) => {
                    if (tick === 0) return null;
                    const y = getY(tick);
                    return (
                      <g key={i}>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={padding.left + plotWidth + 8}
                          y2={y}
                          stroke="#e2e8f0"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                        />
                      </g>
                    );
                  })}

                  {/* VẠCH CHIA & SỐ TRỤC OY */}
                  {yTicks.map((tick, i) => {
                    const y = getY(tick);
                    return (
                      <g key={i}>
                        {/* Vạch chia */}
                        <line
                          x1={padding.left - 4}
                          y1={y}
                          x2={padding.left}
                          y2={y}
                          stroke="#000000"
                          strokeWidth="1.2"
                        />
                        {/* Số vạch chia */}
                        <text
                          x={padding.left - 8}
                          y={y + 4}
                          textAnchor="end"
                          fontSize="11.5"
                          fill="#1e293b"
                        >
                          {tick}
                        </text>
                      </g>
                    );
                  })}

                  {/* TRỤC TOẠ ĐỘ OX & OY VỚI MŨI TÊN CHUẨN SGK */}
                  {/* Trục Oy */}
                  <line
                    x1={padding.left}
                    y1={padding.top + plotHeight}
                    x2={padding.left}
                    y2={padding.top - 12}
                    stroke="#000000"
                    strokeWidth="1.4"
                    markerEnd="url(#arrow-axis-y)"
                  />
                  {/* Tên trục Oy (Đơn vị) */}
                  {yAxisLabel && (
                    <text
                      x={padding.left - 6}
                      y={padding.top - 20}
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight={isBold ? 'bold' : 'normal'}
                      fill="#0f172a"
                    >
                      {yAxisLabel}
                    </text>
                  )}

                  {/* Trục Ox */}
                  <line
                    x1={padding.left}
                    y1={padding.top + plotHeight}
                    x2={padding.left + plotWidth + 24}
                    y2={padding.top + plotHeight}
                    stroke="#000000"
                    strokeWidth="1.4"
                    markerEnd="url(#arrow-axis-x)"
                  />
                  {/* Tên trục Ox */}
                  {xAxisLabel && (
                    <text
                      x={padding.left + plotWidth + 30}
                      y={padding.top + plotHeight + 4}
                      textAnchor="start"
                      fontSize="12"
                      fontWeight={isBold ? 'bold' : 'normal'}
                      fill="#0f172a"
                    >
                      {xAxisLabel}
                    </text>
                  )}

                  {/* VẼ DỮ LIỆU CỘT / CỘT KÉP */}
                  {(chartType === 'bar' || chartType === 'grouped_bar') && (
                    <g>
                      {categories.map((cat, catIdx) => {
                        const groupWidth = plotWidth / categories.length;
                        const groupStartX = padding.left + catIdx * groupWidth;
                        const numSeries = series.length;

                        // Chiều rộng mỗi cột
                        const totalBarsWidth = groupWidth * 0.65;
                        const barWidth = Math.min(totalBarsWidth / numSeries, 46);
                        const startBarsX = groupStartX + (groupWidth - barWidth * numSeries) / 2;

                        return (
                          <g key={catIdx}>
                            {/* Tên danh mục dưới trục Ox */}
                            <text
                              x={groupStartX + groupWidth / 2}
                              y={padding.top + plotHeight + 18}
                              textAnchor="middle"
                              fontSize="12"
                              fill="#1e293b"
                              fontWeight="500"
                            >
                              {cat}
                            </text>

                            {/* Các cột trong nhóm */}
                            {series.map((s, sIdx) => {
                              const val = s.values[catIdx] || 0;
                              const barX = startBarsX + sIdx * barWidth;
                              const barY = getY(val);
                              const barH = padding.top + plotHeight - barY;

                              // Chọn màu hoặc hoa văn
                              let fill = s.color;
                              let stroke = '#000000';

                              if (isBlackAndWhite) {
                                const patId = (individualBarColors && chartType === 'bar')
                                  ? individualPatterns[catIdx % individualPatterns.length]
                                  : (s.pattern || 'diag-right');
                                fill = `url(#pattern-${patId})`;
                              } else if (individualBarColors && chartType === 'bar') {
                                fill = individualColors[catIdx % individualColors.length] || s.color;
                              }

                              return (
                                <g key={s.id}>
                                  <rect
                                    x={barX}
                                    y={barY}
                                    width={barWidth}
                                    height={barH}
                                    fill={fill}
                                    stroke={stroke}
                                    strokeWidth="1.3"
                                  />

                                  {/* Số liệu trên đỉnh cột */}
                                  {showValues && val > 0 && (
                                    <text
                                      x={barX + barWidth / 2}
                                      y={barY - 5}
                                      textAnchor="middle"
                                      fontSize="11"
                                      fontWeight={isBold ? 'bold' : 'normal'}
                                      fill="#1e293b"
                                    >
                                      {val}
                                    </text>
                                  )}
                                </g>
                              );
                            })}
                          </g>
                        );
                      })}
                    </g>
                  )}

                  {/* VẼ DỮ LIỆU ĐOẠN THẲNG (LINE CHART) */}
                  {chartType === 'line' && (
                    <g>
                      {/* Tên danh mục dưới trục Ox và vạch chia */}
                      {categories.map((cat, catIdx) => {
                        const stepX = plotWidth / (categories.length > 1 ? categories.length - 1 : 1);
                        const x = categories.length === 1 
                          ? padding.left + plotWidth / 2 
                          : padding.left + catIdx * stepX;

                        return (
                          <g key={catIdx}>
                            <line
                              x1={x}
                              y1={padding.top + plotHeight}
                              x2={x}
                              y2={padding.top + plotHeight + 4}
                              stroke="#000000"
                              strokeWidth="1"
                            />
                            <text
                              x={x}
                              y={padding.top + plotHeight + 18}
                              textAnchor="middle"
                              fontSize="11.5"
                              fill="#1e293b"
                            >
                              {cat}
                            </text>
                          </g>
                        );
                      })}

                      {/* Các đường và điểm dữ liệu */}
                      {series.map((s, sIdx) => {
                        const stepX = plotWidth / (categories.length > 1 ? categories.length - 1 : 1);
                        const points = s.values.map((v, i) => {
                          const x = categories.length === 1 
                            ? padding.left + plotWidth / 2 
                            : padding.left + i * stepX;
                          const y = getY(v);
                          return { x, y, val: v };
                        });

                        const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

                        return (
                          <g key={s.id}>
                            {/* Đường gấp khúc */}
                            <polyline
                              points={polylinePoints}
                              fill="none"
                              stroke={isBlackAndWhite ? '#000000' : s.color}
                              strokeWidth="2.2"
                              strokeDasharray={isBlackAndWhite && sIdx > 0 ? '5 3' : 'none'}
                            />

                            {/* Điểm tròn và số liệu */}
                            {points.map((pt, pIdx) => (
                              <g key={pIdx}>
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r="4"
                                  fill="#FFFFFF"
                                  stroke={isBlackAndWhite ? '#000000' : s.color}
                                  strokeWidth="2"
                                />
                                {showValues && (
                                  <text
                                    x={pt.x}
                                    y={pt.y - 7}
                                    textAnchor="middle"
                                    fontSize="11"
                                    fontWeight={isBold ? 'bold' : 'normal'}
                                    fill="#1e293b"
                                  >
                                    {pt.val}
                                  </text>
                                )}
                              </g>
                            ))}
                          </g>
                        );
                      })}
                    </g>
                  )}
                </g>
              )}
            </svg>
          </div>

          {/* Dòng ghi chú chân trang & nút Chèn vào hình (khi dùng trong Modal) */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
            <span className="text-[11px] text-slate-400 italic">
              Biểu đồ chèn vào hình như một khung; kéo để dời, kéo góc để phóng to/thu nhỏ, nháy đúp để sửa lại.
            </span>

            {isModal && onInsertToCanvas && (
              <div className="flex items-center gap-2">
                {onCancel && (
                  <button
                    onClick={onCancel}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Hủy
                  </button>
                )}
                <button
                  onClick={handleInsertToCanvas}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm cursor-pointer"
                >
                  Chèn vào hình
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
