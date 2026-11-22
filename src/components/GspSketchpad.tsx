import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Compass, MousePointer, Dot, CircleDot, Minus, Circle, 
  Trash2, Undo2, Redo2, Copy, Download, RefreshCw, 
  Layers, CheckCircle2, AlertCircle, Sparkles, Grid, Eye, EyeOff,
  FileDown, FileUp, Edit3, X, Check, Type, ArrowRight, ArrowLeftRight,
  Box, FolderKanban, BarChart2, Crop
} from 'lucide-react';
import { addDpiToBlob } from '../utils/bbtEngine';
import { cropCanvasToContent } from '../utils/dpiUtils';
import Gsp3DViewerModal from './Gsp3DViewerModal';
import ThcsStatisticalChart, { StatisticalChartConfig } from './ThcsStatisticalChart';

export interface GspChartItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  svgString: string;
  config: StatisticalChartConfig;
}

export interface GspPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  color?: string;
  type?: 'free' | 'midpoint' | 'on_segment';
  parentIds?: [string, string]; // 2 điểm bố mẹ cho trung điểm hoặc điểm trên đoạn thẳng
  segmentId?: string;           // ID đoạn thẳng chứa điểm
  ratio?: number;               // Tỉ lệ t trên đoạn (0 <= t <= 1): P = P1 + t * (P2 - P1)
  hidden?: boolean;             // Ẩn hoàn toàn điểm này trên ảnh xuất
  hideDot?: boolean;            // Chỉ ẩn chấm tròn của điểm này
  hideLabel?: boolean;          // Chỉ ẩn chữ nhãn của điểm này
  labelOffsetX?: number;        // Độ lệch trục X của nhãn chữ so với toạ độ điểm (mặc định 9)
  labelOffsetY?: number;        // Độ lệch trục Y của nhãn chữ so với toạ độ điểm (mặc định -8)
}

export interface GspSegment {
  id: string;
  p1Id: string;
  p2Id: string;
  style: 'solid' | 'dashed';
  color: string;
  width?: number;
  isVector?: boolean;       // Là vectơ có mũi tên chỉ hướng
  vectorEnd?: 'p1' | 'p2';  // Đầu mũi tên (mặc định 'p2': p1 -> p2)
}

export interface GspCircle {
  id: string;
  centerId: string;
  radiusPointId?: string;
  radius?: number;
  style: 'solid' | 'dashed';
  color: string;
}

export interface GspEllipse {
  id: string;
  centerId: string;
  rxPointId?: string;
  rx: number;
  ry: number;
  style: 'half_dashed' | 'solid' | 'dashed'; // 'half_dashed': nửa trên đứt, nửa dưới liền
  color: string;
  width?: number;
}

export interface GspRightAngle {
  id: string;
  vertexId: string;
  p1Id: string;
  p2Id: string;
  size?: number;
  color?: string;
  hasDot?: boolean;
}

export interface GspText {
  id: string;
  x: number;
  y: number;
  content: string;
  fontSize?: number;
  isItalic?: boolean;
  isBold?: boolean;
  color?: string;
}

export interface GspState {
  points: GspPoint[];
  segments: GspSegment[];
  circles: GspCircle[];
  ellipses?: GspEllipse[];
  rightAngles: GspRightAngle[];
  texts?: GspText[];
  charts?: GspChartItem[];
}

export interface GspSketchpadProps {
  externalPreset?: string | null;
  onOpen3D?: (presetId?: string) => void;
  onOpenPresets?: () => void;
  isSplitView?: boolean;
  onInsertImage?: (dataUrl: string) => void;
}

export default function GspSketchpad({
  externalPreset,
  onOpen3D,
  onOpenPresets,
  isSplitView = false,
  onInsertImage
}: GspSketchpadProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Danh sách các phần tử hình học
  const [points, setPoints] = useState<GspPoint[]>([]);
  const [segments, setSegments] = useState<GspSegment[]>([]);
  const [circles, setCircles] = useState<GspCircle[]>([]);
  const [ellipses, setEllipses] = useState<GspEllipse[]>([]);
  const [rightAngles, setRightAngles] = useState<GspRightAngle[]>([]);
  const [texts, setTexts] = useState<GspText[]>([]);
  const [charts, setCharts] = useState<GspChartItem[]>([]);
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
  const [hoveredChartId, setHoveredChartId] = useState<string | null>(null);
  const [showChartModal, setShowChartModal] = useState<boolean>(false);
  const [editingChart, setEditingChart] = useState<GspChartItem | null>(null);
  const [chartRenderTrigger, setChartRenderTrigger] = useState<number>(0);
  const chartImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [chartDragState, setChartDragState] = useState<{
    chartId: string;
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  // Lịch sử Undo / Redo
  const [history, setHistory] = useState<GspState[]>([]);
  const [redoStack, setRedoStack] = useState<GspState[]>([]);
  const dragStartSnapshotRef = useRef<GspState | null>(null);

  // Mô hình 3D tương tác xoay 360 độ
  const [show3DViewerModal, setShow3DViewerModal] = useState<boolean>(false);
  const [currentPresetType, setCurrentPresetType] = useState<string>('pyramid_regular_quad');

  // Công cụ đang chọn
  const [activeTool, setActiveTool] = useState<'select' | 'point' | 'point_on_segment' | 'segment' | 'vector' | 'circle' | 'ellipse' | 'right_angle' | 'text' | 'eraser'>('select');
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed'>('solid');
  const [ellipseStyle, setEllipseStyle] = useState<'half_dashed' | 'solid' | 'dashed'>('half_dashed');
  const [pointDisplayMode, setPointDisplayMode] = useState<'all' | 'labels_only' | 'hidden'>('all');
  const [pointSize, setPointSize] = useState<'small' | 'tiny' | 'medium'>('small');
  const [activeColor, setActiveColor] = useState<string>('#000000');
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // Menu chuột phải (Context Menu) tương tác nhanh
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    canvasX: number;
    canvasY: number;
    targetType: 'point' | 'segment' | 'ellipse' | 'right_angle' | 'text' | 'canvas';
    targetId?: string;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    canvasX: 0,
    canvasY: 0,
    targetType: 'canvas'
  });

  // Điểm đang được chọn hoặc hover
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [draggedPointId, setDraggedPointId] = useState<string | null>(null);

  // Đoạn thẳng đang chọn hoặc hover
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [hoveredSegmentId, setHoveredSegmentId] = useState<string | null>(null);

  // Điểm bắt dính trên đoạn thẳng khi dùng công cụ lấy điểm trên cạnh
  const [snappedSegmentPoint, setSnappedSegmentPoint] = useState<{ segId: string; x: number; y: number; t: number; p1Id: string; p2Id: string } | null>(null);

  // Ellipse hover
  const [hoveredEllipseId, setHoveredEllipseId] = useState<string | null>(null);

  // Text đang chọn, hover hoặc kéo thả
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [hoveredTextId, setHoveredTextId] = useState<string | null>(null);
  const [draggedTextId, setDraggedTextId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Modal thêm/sửa text chú thích
  const [isAddingText, setIsAddingText] = useState<boolean>(false);
  const [editingText, setEditingText] = useState<GspText | null>(null);
  const [textPos, setTextPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [textContentInput, setTextContentInput] = useState<string>('');
  const [textFontSize, setTextFontSize] = useState<number>(16);
  const [textIsItalic, setTextIsItalic] = useState<boolean>(true);
  const [textIsBold, setTextIsBold] = useState<boolean>(false);
  const [textColor, setTextColor] = useState<string>('#000000');

  // Trạng thái vẽ dở dang (ví dụ bấm điểm 1 đang chờ bấm điểm 2)
  const [drawingStartPointId, setDrawingStartPointId] = useState<string | null>(null);
  const [drawingCurrentMouse, setDrawingCurrentMouse] = useState<{ x: number; y: number } | null>(null);
  const [angleVertices, setAngleVertices] = useState<string[]>([]); // Lưu 3 điểm tạo góc vuông: [P1, Vertex, P2]

  // Tùy chọn góc vuông
  const [rightAngleSize, setRightAngleSize] = useState<number>(13);
  const [rightAngleStyle, setRightAngleStyle] = useState<'normal' | 'with_dot'>('normal');
  const [angleFirstSegmentId, setAngleFirstSegmentId] = useState<string | null>(null);

  // Đổi tên điểm & Ẩn hiện từng điểm
  const [editingPoint, setEditingPoint] = useState<GspPoint | null>(null);
  const [newLabelInput, setNewLabelInput] = useState<string>('');
  const [editingPointHideDot, setEditingPointHideDot] = useState<boolean>(false);
  const [editingPointHideLabel, setEditingPointHideLabel] = useState<boolean>(false);
  const [editingPointRatio, setEditingPointRatio] = useState<number>(0.5);
  const [editingPointLabelOffsetX, setEditingPointLabelOffsetX] = useState<number>(9);
  const [editingPointLabelOffsetY, setEditingPointLabelOffsetY] = useState<number>(-8);

  // Kéo dời nhãn chữ (Dời text)
  const [draggedLabelPointId, setDraggedLabelPointId] = useState<string | null>(null);
  const [hoveredLabelPointId, setHoveredLabelPointId] = useState<string | null>(null);
  const labelDragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [notice, setNotice] = useState<string | null>(null);

  // Kích thước chuẩn khung vẽ logic
  const LOGICAL_WIDTH = 750;
  const LOGICAL_HEIGHT = 480;

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  // Đóng Menu chuột phải khi nhấp chuột ra ngoài hoặc bấm Escape
  useEffect(() => {
    const handleCloseMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('#gsp-context-menu')) return;
      setContextMenu(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
      }
      // Phím tắt Xóa Biểu đồ khi đang chọn
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedChartId) {
        saveSnapshot();
        setCharts(prev => prev.filter(c => c.id !== selectedChartId));
        setSelectedChartId(null);
        showNotice('Đã xóa biểu đồ khỏi hình vẽ.');
      }
      // Phím tắt Hoàn tác: Ctrl + Z hoặc Command + Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } 
      // Phím tắt Làm lại: Ctrl + Y
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('mousedown', handleCloseMenu);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleCloseMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Lưu lại snapshot cho Undo
  const saveSnapshot = useCallback(() => {
    const currentState: GspState = {
      points: JSON.parse(JSON.stringify(points)),
      segments: JSON.parse(JSON.stringify(segments)),
      circles: JSON.parse(JSON.stringify(circles)),
      ellipses: JSON.parse(JSON.stringify(ellipses)),
      rightAngles: JSON.parse(JSON.stringify(rightAngles)),
      texts: JSON.parse(JSON.stringify(texts)),
      charts: JSON.parse(JSON.stringify(charts))
    };
    setHistory(prev => [...prev.slice(-25), currentState]);
    setRedoStack([]);
  }, [points, segments, circles, ellipses, rightAngles, texts, charts]);

  const handleUndo = () => {
    if (history.length === 0) {
      showNotice('Không có thao tác nào trước đó để hoàn tác.');
      return;
    }
    const currentState: GspState = { points, segments, circles, ellipses, rightAngles, texts, charts };
    const prev = history[history.length - 1];
    setRedoStack(r => [currentState, ...r]);
    setHistory(h => h.slice(0, -1));

    setPoints(prev.points || []);
    setSegments(prev.segments || []);
    setCircles(prev.circles || []);
    setEllipses(prev.ellipses || []);
    setRightAngles(prev.rightAngles || []);
    setTexts(prev.texts || []);
    setCharts(prev.charts || []);
    setSelectedPointId(null);
    setSelectedSegmentId(null);
    setSelectedTextId(null);
    setSelectedChartId(null);
    showNotice('↩️ Đã hoàn tác thao tác vừa rồi (Undo).');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) {
      showNotice('Không có thao tác nào để làm lại.');
      return;
    }
    const next = redoStack[0];
    const currentState: GspState = { points, segments, circles, ellipses, rightAngles, texts, charts };
    setHistory(h => [...h, currentState]);
    setRedoStack(r => r.slice(1));

    setPoints(next.points || []);
    setSegments(next.segments || []);
    setCircles(next.circles || []);
    setEllipses(next.ellipses || []);
    setRightAngles(next.rightAngles || []);
    setTexts(next.texts || []);
    setCharts(next.charts || []);
    showNotice('↪️ Đã làm lại thao tác (Redo).');
  };

  const handleClearAll = () => {
    if (points.length === 0 && texts.length === 0 && ellipses.length === 0 && charts.length === 0) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ bản vẽ và bắt đầu lại không?')) {
      saveSnapshot();
      setPoints([]);
      setSegments([]);
      setCircles([]);
      setEllipses([]);
      setRightAngles([]);
      setTexts([]);
      setCharts([]);
      setSelectedPointId(null);
      setSelectedSegmentId(null);
      setSelectedTextId(null);
      setSelectedChartId(null);
      setDrawingStartPointId(null);
      showNotice('Đã làm sạch bảng vẽ.');
    }
  };

  // Tự động sinh tên đỉnh chữ cái tiếp theo (A, B, C... Z, A', B'...)
  const getNextLabel = (existing: GspPoint[]): string => {
    const baseLabels = ['A', 'B', 'C', 'D', 'S', 'O', 'M', 'N', 'P', 'Q', 'H', 'K', 'E', 'F', 'I', 'J', 'R', 'T', 'U', 'V', 'X', 'Y', 'Z'];
    const used = new Set(existing.map(p => p.label));
    for (const l of baseLabels) {
      if (!used.has(l)) return l;
    }
    // Nếu hết, thêm dấu phẩy (A', B'...)
    for (const l of baseLabels) {
      if (!used.has(`${l}'`)) return `${l}'`;
    }
    return `P${existing.length + 1}`;
  };

  // Tọa độ chuột thực trên Canvas logic
  const getCanvasMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = LOGICAL_WIDTH / rect.width;
    const scaleY = LOGICAL_HEIGHT / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY)
    };
  };

  // Tìm điểm gần nhất trong bán kính hit-radius
  const findNearbyPoint = (x: number, y: number, radius = 14): GspPoint | null => {
    let nearest: GspPoint | null = null;
    let minDist = radius;
    for (const p of points) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < minDist) {
        minDist = d;
        nearest = p;
      }
    }
    return nearest;
  };

  // Tìm đoạn thẳng gần chuột nhất
  const findNearbySegment = (x: number, y: number, radius = 9): GspSegment | null => {
    const ptMap = new Map<string, GspPoint>(points.map(p => [p.id, p]));
    let nearest: GspSegment | null = null;
    let minDist = radius;
    for (const s of segments) {
      const p1 = ptMap.get(s.p1Id);
      const p2 = ptMap.get(s.p2Id);
      if (!p1 || !p2) continue;
      const d = distToSegment({ x, y }, p1, p2);
      if (d < minDist) {
        minDist = d;
        nearest = s;
      }
    }
    return nearest;
  };

  // Tìm text chú thích gần chuột nhất
  const findNearbyText = (x: number, y: number): GspText | null => {
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      const size = t.fontSize || 16;
      const approxW = Math.max(16, t.content.length * (size * 0.65));
      const approxH = size * 1.4;
      if (
        x >= t.x - 6 &&
        x <= t.x + approxW + 6 &&
        y >= t.y - approxH / 2 - 4 &&
        y <= t.y + approxH / 2 + 4
      ) {
        return t;
      }
    }
    return null;
  };

  // Tìm ký hiệu góc vuông gần chuột nhất để xóa hoặc tương tác
  const findNearbyRightAngle = (x: number, y: number, maxDist = 14): GspRightAngle | null => {
    const ptMap = new Map<string, GspPoint>(points.map(p => [p.id, p]));
    for (const ra of rightAngles) {
      const v = ptMap.get(ra.vertexId);
      const p1 = ptMap.get(ra.p1Id);
      const p2 = ptMap.get(ra.p2Id);
      if (!v || !p1 || !p2) continue;

      const size = ra.size || 13;
      const d1 = Math.hypot(p1.x - v.x, p1.y - v.y) || 1;
      const d2 = Math.hypot(p2.x - v.x, p2.y - v.y) || 1;
      const u1x = (p1.x - v.x) / d1;
      const u1y = (p1.y - v.y) / d1;
      const u2x = (p2.x - v.x) / d2;
      const u2y = (p2.y - v.y) / d2;

      // Tọa độ tâm ký hiệu góc vuông
      const cx = v.x + (u1x + u2x) * (size * 0.7);
      const cy = v.y + (u1y + u2y) * (size * 0.7);
      if (Math.hypot(x - cx, y - cy) < maxDist) {
        return ra;
      }
    }
    return null;
  };

  // Tìm hình elip gần chuột nhất để tương tác hoặc đổi kiểu nét
  const findNearbyEllipse = (x: number, y: number, radius = 10): GspEllipse | null => {
    const ptMap = new Map<string, GspPoint>(points.map(p => [p.id, p]));
    let nearest: GspEllipse | null = null;
    let minDist = radius;

    for (const el of ellipses) {
      const center = ptMap.get(el.centerId);
      if (!center) continue;

      let rx = el.rx;
      let ry = el.ry;
      if (el.rxPointId) {
        const rxPt = ptMap.get(el.rxPointId);
        if (rxPt) {
          rx = Math.hypot(rxPt.x - center.x, rxPt.y - center.y) || el.rx;
          const ratio = (el.ry && el.rx) ? (el.ry / el.rx) : 0.32;
          ry = Math.round(rx * ratio);
        }
      }

      const angle = Math.atan2(y - center.y, x - center.x);
      const ex = center.x + rx * Math.cos(angle);
      const ey = center.y + ry * Math.sin(angle);
      const d = Math.hypot(x - ex, y - ey);

      if (d < minDist) {
        minDist = d;
        nearest = el;
      }
    }
    return nearest;
  };

  // Kiểm tra chuột có trúng nhãn chữ của đỉnh để kéo dời không (Dời text nhãn đỉnh)
  const findNearbyPointLabel = (x: number, y: number): { point: GspPoint; lx: number; ly: number } | null => {
    if (pointDisplayMode === 'hidden') return null;
    for (let i = points.length - 1; i >= 0; i--) {
      const p = points[i];
      if (p.hidden || p.hideLabel || !p.label) continue;
      const lx = p.x + (p.labelOffsetX ?? 9);
      const ly = p.y + (p.labelOffsetY ?? -8);
      const w = Math.max(18, p.label.length * 15);
      const h = 24;
      if (x >= lx - 6 && x <= lx + w + 6 && y >= ly - h - 4 && y <= ly + 6) {
        return { point: p, lx, ly };
      }
    }
    return null;
  };

  // Kiểm tra chuột có đang nhấp sát ngay chấm tròn của điểm không
  const isStrictlyOnPointDot = (pt: GspPoint, x: number, y: number): boolean => {
    if (pt.hidden || pt.hideDot || pointDisplayMode === 'labels_only') return false;
    return Math.hypot(pt.x - x, pt.y - y) <= 8;
  };

  // Tạo điểm mới
  const createPoint = (x: number, y: number, customLabel?: string, labelOffsetX = 9, labelOffsetY = -8): GspPoint => {
    const pt: GspPoint = {
      id: 'pt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      x,
      y,
      label: customLabel || getNextLabel(points),
      color: activeColor,
      labelOffsetX,
      labelOffsetY
    };
    return pt;
  };

  // ==========================================
  // XỬ LÝ SỰ KIỆN MENU CHUỘT PHẢI (CONTEXT MENU)
  // ==========================================
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { x, y } = getCanvasMouse(e);

    const nearbyPt = findNearbyPoint(x, y);
    const nearbyTxt = findNearbyText(x, y);
    const nearbyLabel = (!nearbyPt && !nearbyTxt) ? findNearbyPointLabel(x, y) : null;
    const nearbySeg = (!nearbyPt && !nearbyTxt && !nearbyLabel) ? findNearbySegment(x, y) : null;
    const nearbyEl = (!nearbyPt && !nearbyTxt && !nearbyLabel && !nearbySeg) ? findNearbyEllipse(x, y) : null;
    const nearbyRa = (!nearbyPt && !nearbyTxt && !nearbyLabel && !nearbySeg && !nearbyEl) ? findNearbyRightAngle(x, y) : null;

    let targetType: 'point' | 'segment' | 'ellipse' | 'right_angle' | 'text' | 'canvas' = 'canvas';
    let targetId: string | undefined = undefined;

    if (nearbyPt) {
      targetType = 'point';
      targetId = nearbyPt.id;
      setSelectedPointId(nearbyPt.id);
      setSelectedSegmentId(null);
      setSelectedTextId(null);
    } else if (nearbyLabel) {
      targetType = 'point';
      targetId = nearbyLabel.point.id;
      setSelectedPointId(nearbyLabel.point.id);
      setSelectedSegmentId(null);
      setSelectedTextId(null);
    } else if (nearbyTxt) {
      targetType = 'text';
      targetId = nearbyTxt.id;
      setSelectedTextId(nearbyTxt.id);
      setSelectedPointId(null);
      setSelectedSegmentId(null);
    } else if (nearbySeg) {
      targetType = 'segment';
      targetId = nearbySeg.id;
      setSelectedSegmentId(nearbySeg.id);
      setSelectedPointId(null);
      setSelectedTextId(null);
    } else if (nearbyEl) {
      targetType = 'ellipse';
      targetId = nearbyEl.id;
    } else if (nearbyRa) {
      targetType = 'right_angle';
      targetId = nearbyRa.id;
    }

    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      canvasX: x,
      canvasY: y,
      targetType,
      targetId
    });
  };

  // ==========================================
  // XỬ LÝ SỰ KIỆN CHUỘT TRÊN CANVAS
  // ==========================================
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Chỉ xử lý chuột trái cho các công cụ tương tác & vẽ

    // Đóng context menu nếu đang mở
    if (contextMenu.isOpen) {
      setContextMenu(prev => ({ ...prev, isOpen: false }));
    }

    const { x, y } = getCanvasMouse(e);
    const nearbyPt = findNearbyPoint(x, y);
    const nearbyTxt = findNearbyText(x, y);
    const nearbySeg = (!nearbyPt && !nearbyTxt) ? findNearbySegment(x, y) : null;

    if (activeTool === 'select') {
      // 1. Kiểm tra nhấp vào góc co giãn của Biểu đồ đang chọn
      const clickedChartCorner = [...charts].reverse().find(c => {
        const rx = c.x + c.width;
        const ry = c.y + c.height;
        return Math.hypot(x - rx, y - ry) <= 14;
      });

      if (clickedChartCorner) {
        setSelectedChartId(clickedChartCorner.id);
        setChartDragState({
          chartId: clickedChartCorner.id,
          mode: 'resize',
          startX: x,
          startY: y,
          origX: clickedChartCorner.x,
          origY: clickedChartCorner.y,
          origW: clickedChartCorner.width,
          origH: clickedChartCorner.height
        });
        return;
      }

      // 2. Kiểm tra nhấp vào thân Biểu đồ để di chuyển
      const clickedChart = [...charts].reverse().find(c => x >= c.x && x <= c.x + c.width && y >= c.y && y <= c.y + c.height);
      if (clickedChart && !nearbyPt && !nearbyTxt) {
        setSelectedChartId(clickedChart.id);
        setSelectedPointId(null);
        setSelectedSegmentId(null);
        setSelectedTextId(null);
        setChartDragState({
          chartId: clickedChart.id,
          mode: 'move',
          startX: x,
          startY: y,
          origX: clickedChart.x,
          origY: clickedChart.y,
          origW: clickedChart.width,
          origH: clickedChart.height
        });
        return;
      } else if (!clickedChart && !nearbyPt && !nearbyTxt && !nearbySeg) {
        setSelectedChartId(null);
      }

      // 3. Kiểm tra nhấp vào Nhãn chữ của đỉnh để kéo dời vị trí nhãn (Dời text nhãn đỉnh)
      const nearbyLabel = findNearbyPointLabel(x, y);
      if (nearbyLabel && !isStrictlyOnPointDot(nearbyLabel.point, x, y)) {
        dragStartSnapshotRef.current = {
          points: JSON.parse(JSON.stringify(points)),
          segments: JSON.parse(JSON.stringify(segments)),
          circles: JSON.parse(JSON.stringify(circles)),
          ellipses: JSON.parse(JSON.stringify(ellipses)),
          rightAngles: JSON.parse(JSON.stringify(rightAngles)),
          texts: JSON.parse(JSON.stringify(texts)),
          charts: JSON.parse(JSON.stringify(charts))
        };
        setDraggedLabelPointId(nearbyLabel.point.id);
        setSelectedPointId(nearbyLabel.point.id);
        setSelectedTextId(null);
        setSelectedSegmentId(null);
        setSelectedChartId(null);
        labelDragOffsetRef.current = { dx: x - nearbyLabel.lx, dy: y - nearbyLabel.ly };
        return;
      }

      if (nearbyPt) {
        dragStartSnapshotRef.current = {
          points: JSON.parse(JSON.stringify(points)),
          segments: JSON.parse(JSON.stringify(segments)),
          circles: JSON.parse(JSON.stringify(circles)),
          ellipses: JSON.parse(JSON.stringify(ellipses)),
          rightAngles: JSON.parse(JSON.stringify(rightAngles)),
          texts: JSON.parse(JSON.stringify(texts))
        };
        setSelectedPointId(nearbyPt.id);
        setSelectedTextId(null);
        setSelectedSegmentId(null);
        setDraggedPointId(nearbyPt.id);
      } else if (nearbyTxt) {
        dragStartSnapshotRef.current = {
          points: JSON.parse(JSON.stringify(points)),
          segments: JSON.parse(JSON.stringify(segments)),
          circles: JSON.parse(JSON.stringify(circles)),
          ellipses: JSON.parse(JSON.stringify(ellipses)),
          rightAngles: JSON.parse(JSON.stringify(rightAngles)),
          texts: JSON.parse(JSON.stringify(texts))
        };
        setSelectedTextId(nearbyTxt.id);
        setSelectedPointId(null);
        setSelectedSegmentId(null);
        setDraggedTextId(nearbyTxt.id);
        dragOffsetRef.current = { dx: x - nearbyTxt.x, dy: y - nearbyTxt.y };
      } else if (nearbySeg) {
        // Nhấp vào đoạn thẳng -> Đảo nét liền ↔ nét đứt ngay lập tức
        saveSnapshot();
        const newStyle = nearbySeg.style === 'dashed' ? 'solid' : 'dashed';
        setSegments(prev => prev.map(s => s.id === nearbySeg.id ? { ...s, style: newStyle } : s));
        setSelectedSegmentId(nearbySeg.id);
        setSelectedPointId(null);
        setSelectedTextId(null);
        showNotice(`Đã chuyển đoạn thẳng sang ${newStyle === 'dashed' ? 'nét đứt (khuất)' : 'nét liền'}`);
      } else {
        const nearbyEl = findNearbyEllipse(x, y);
        if (nearbyEl) {
          saveSnapshot();
          const nextStyle = nearbyEl.style === 'half_dashed' ? 'solid' : nearbyEl.style === 'solid' ? 'dashed' : 'half_dashed';
          setEllipses(prev => prev.map(e => e.id === nearbyEl.id ? { ...e, style: nextStyle } : e));
          const label = nextStyle === 'half_dashed' ? 'Nửa đứt - Nửa liền (SGK)' : nextStyle === 'solid' ? 'Nét liền' : 'Nét đứt';
          showNotice(`Đã đổi kiểu hình elip: ${label}`);
          return;
        }
        setSelectedPointId(null);
        setSelectedTextId(null);
        setSelectedSegmentId(null);
      }
    } else if (activeTool === 'text') {
      if (nearbyTxt) {
        setEditingText(nearbyTxt);
        setTextContentInput(nearbyTxt.content);
        setTextFontSize(nearbyTxt.fontSize || 16);
        setTextIsItalic(nearbyTxt.isItalic !== false);
        setTextIsBold(!!nearbyTxt.isBold);
        setTextColor(nearbyTxt.color || '#000000');
        setIsAddingText(false);
      } else {
        setTextPos({ x, y });
        setEditingText(null);
        setTextContentInput('');
        setTextFontSize(16);
        setTextIsItalic(true);
        setTextIsBold(false);
        setTextColor(activeColor);
        setIsAddingText(true);
      }
    } else if (activeTool === 'point_on_segment') {
      const snap = snappedSegmentPoint;
      if (snap) {
        saveSnapshot();
        const p1 = points.find(p => p.id === snap.p1Id);
        const p2 = points.find(p => p.id === snap.p2Id);
        const newPt: GspPoint = {
          id: 'pt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          x: snap.x,
          y: snap.y,
          label: getNextLabel(points),
          color: activeColor,
          type: 'on_segment',
          segmentId: snap.segId,
          parentIds: [snap.p1Id, snap.p2Id],
          ratio: snap.t
        };
        setPoints(prev => [...prev, newPt]);
        setSelectedPointId(newPt.id);
        showNotice(`Đã lấy điểm ${newPt.label} trên cạnh ${p1?.label || ''}${p2?.label || ''} (có thể kéo trượt dọc theo cạnh).`);
      } else {
        const nearbySeg = findNearbySegment(x, y);
        if (nearbySeg) {
          const ptMap = new Map<string, GspPoint>(points.map(p => [p.id, p]));
          const p1 = ptMap.get(nearbySeg.p1Id);
          const p2 = ptMap.get(nearbySeg.p2Id);
          if (p1 && p2) {
            const proj = projectPointOnSegment({ x, y }, p1, p2);
            saveSnapshot();
            const newPt: GspPoint = {
              id: 'pt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
              x: proj.x,
              y: proj.y,
              label: getNextLabel(points),
              color: activeColor,
              type: 'on_segment',
              segmentId: nearbySeg.id,
              parentIds: [nearbySeg.p1Id, nearbySeg.p2Id],
              ratio: proj.t
            };
            setPoints(prev => [...prev, newPt]);
            setSelectedPointId(newPt.id);
            showNotice(`Đã lấy điểm ${newPt.label} trên cạnh ${p1.label}${p2.label} (có thể kéo trượt dọc theo cạnh).`);
          } else {
            showNotice('Hãy nhấp chuột vào một đoạn thẳng / cạnh để đặt điểm trên cạnh đó.');
          }
        } else {
          showNotice('Hãy nhấp chuột vào một đoạn thẳng / cạnh để đặt điểm trên cạnh đó.');
        }
      }
    } else if (activeTool === 'point') {
      saveSnapshot();
      if (snappedSegmentPoint) {
        const p1 = points.find(p => p.id === snappedSegmentPoint.p1Id);
        const p2 = points.find(p => p.id === snappedSegmentPoint.p2Id);
        const newPt: GspPoint = {
          id: 'pt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          x: snappedSegmentPoint.x,
          y: snappedSegmentPoint.y,
          label: getNextLabel(points),
          color: activeColor,
          type: 'on_segment',
          segmentId: snappedSegmentPoint.segId,
          parentIds: [snappedSegmentPoint.p1Id, snappedSegmentPoint.p2Id],
          ratio: snappedSegmentPoint.t
        };
        setPoints(prev => [...prev, newPt]);
        setSelectedPointId(newPt.id);
        showNotice(`Đã tạo điểm ${newPt.label} thuộc cạnh ${p1?.label || ''}${p2?.label || ''}`);
      } else {
        const newPt = createPoint(x, y);
        setPoints(prev => [...prev, newPt]);
        setSelectedPointId(newPt.id);
        showNotice(`Đã tạo điểm ${newPt.label}`);
      }
    } else if (activeTool === 'segment') {
      if (!drawingStartPointId) {
        // Điểm đầu
        if (nearbyPt) {
          setDrawingStartPointId(nearbyPt.id);
        } else {
          saveSnapshot();
          const p1 = createPoint(x, y);
          setPoints(prev => [...prev, p1]);
          setDrawingStartPointId(p1.id);
        }
      } else {
        // Điểm cuối -> Nối đoạn thẳng
        saveSnapshot();
        let endId = nearbyPt ? nearbyPt.id : null;
        if (!endId) {
          const p2 = createPoint(x, y);
          setPoints(prev => [...prev, p2]);
          endId = p2.id;
        }

        if (endId !== drawingStartPointId) {
          const newSeg: GspSegment = {
            id: 'seg_' + Date.now(),
            p1Id: drawingStartPointId,
            p2Id: endId,
            style: lineStyle,
            color: activeColor,
            width: 1.6
          };
          setSegments(prev => [...prev, newSeg]);
          showNotice(`Đã nối đoạn thẳng (${lineStyle === 'dashed' ? 'nét đứt' : 'nét liền'})`);
        }
        setDrawingStartPointId(null);
      }
    } else if (activeTool === 'vector') {
      if (!drawingStartPointId) {
        // Điểm đầu vectơ (Gốc)
        if (nearbyPt) {
          setDrawingStartPointId(nearbyPt.id);
        } else {
          saveSnapshot();
          const p1 = createPoint(x, y);
          setPoints(prev => [...prev, p1]);
          setDrawingStartPointId(p1.id);
        }
      } else {
        // Điểm cuối vectơ (Ngọn mũi tên)
        saveSnapshot();
        let endId = nearbyPt ? nearbyPt.id : null;
        if (!endId) {
          const p2 = createPoint(x, y);
          setPoints(prev => [...prev, p2]);
          endId = p2.id;
        }

        if (endId !== drawingStartPointId) {
          const newSeg: GspSegment = {
            id: 'vec_' + Date.now(),
            p1Id: drawingStartPointId,
            p2Id: endId,
            style: lineStyle,
            color: activeColor,
            width: 1.8,
            isVector: true,
            vectorEnd: 'p2'
          };
          setSegments(prev => [...prev, newSeg]);
          const pStart = points.find(p => p.id === drawingStartPointId);
          const pEnd = points.find(p => p.id === endId);
          showNotice(`Đã vẽ vectơ ${pStart?.label || ''}${pEnd?.label || ''} (→)`);
        }
        setDrawingStartPointId(null);
      }
    } else if (activeTool === 'circle') {
      if (!drawingStartPointId) {
        // Tâm đường tròn
        if (nearbyPt) {
          setDrawingStartPointId(nearbyPt.id);
        } else {
          saveSnapshot();
          const center = createPoint(x, y);
          setPoints(prev => [...prev, center]);
          setDrawingStartPointId(center.id);
        }
      } else {
        // Điểm bán kính -> Hoàn thành đường tròn
        saveSnapshot();
        let radPointId = nearbyPt ? nearbyPt.id : null;
        if (!radPointId) {
          const p2 = createPoint(x, y);
          setPoints(prev => [...prev, p2]);
          radPointId = p2.id;
        }

        if (radPointId !== drawingStartPointId) {
          const newCircle: GspCircle = {
            id: 'circ_' + Date.now(),
            centerId: drawingStartPointId,
            radiusPointId: radPointId,
            style: lineStyle,
            color: activeColor
          };
          setCircles(prev => [...prev, newCircle]);
          showNotice('Đã vẽ đường tròn');
        }
        setDrawingStartPointId(null);
      }
    } else if (activeTool === 'ellipse') {
      if (!drawingStartPointId) {
        // Tâm hình elip
        if (nearbyPt) {
          setDrawingStartPointId(nearbyPt.id);
          showNotice(`Đã chọn tâm O: ${nearbyPt.label}. Hãy nhấp điểm thứ hai để định bán kính elip.`);
        } else {
          saveSnapshot();
          const center = createPoint(x, y, 'O');
          setPoints(prev => [...prev, center]);
          setDrawingStartPointId(center.id);
          showNotice('Đã tạo tâm O. Hãy nhấp chuột để định bán kính trục elip.');
        }
      } else {
        // Điểm bán kính -> Hoàn thành hình elip
        saveSnapshot();
        const centerPt = points.find(p => p.id === drawingStartPointId);
        let radPointId = nearbyPt ? nearbyPt.id : null;
        if (!radPointId) {
          const p2 = createPoint(x, y);
          setPoints(prev => [...prev, p2]);
          radPointId = p2.id;
        }

        if (centerPt && radPointId !== drawingStartPointId) {
          const rx = Math.hypot(x - centerPt.x, y - centerPt.y) || 120;
          const ry = Math.max(16, Math.round(rx * 0.32));
          const newEl: GspEllipse = {
            id: 'el_' + Date.now(),
            centerId: drawingStartPointId,
            rxPointId: radPointId,
            rx,
            ry,
            style: ellipseStyle,
            color: activeColor,
            width: 1.6
          };
          setEllipses(prev => [...prev, newEl]);
          showNotice(
            ellipseStyle === 'half_dashed'
              ? 'Đã tạo hình Elip (nửa đứt nửa liền SGK - đáy nón/trụ)'
              : 'Đã tạo hình Elip'
          );
        }
        setDrawingStartPointId(null);
      }
    } else if (activeTool === 'right_angle') {
      // 1. Nhấp vào ký hiệu góc vuông đã có để xóa
      const nearbyRa = findNearbyRightAngle(x, y);
      if (nearbyRa) {
        saveSnapshot();
        setRightAngles(prev => prev.filter(r => r.id !== nearbyRa.id));
        showNotice('Đã xóa ký hiệu góc vuông.');
        return;
      }

      // 2. Nhấp vào đoạn thẳng (chọn 2 đoạn thẳng giao nhau)
      if (nearbySeg && !nearbyPt) {
        if (!angleFirstSegmentId) {
          setAngleFirstSegmentId(nearbySeg.id);
          showNotice('Đã chọn đoạn 1. Hãy nhấp đoạn thứ 2 có chung đỉnh để tạo góc vuông.');
          return;
        } else {
          if (angleFirstSegmentId === nearbySeg.id) {
            setAngleFirstSegmentId(null);
            showNotice('Đã hủy chọn đoạn thẳng.');
            return;
          }
          const seg1 = segments.find(s => s.id === angleFirstSegmentId);
          const seg2 = nearbySeg;
          if (seg1 && seg2) {
            // Tìm đỉnh chung
            const commonVertex = [seg1.p1Id, seg1.p2Id].find(id => id === seg2.p1Id || id === seg2.p2Id);
            if (commonVertex) {
              const p1 = seg1.p1Id === commonVertex ? seg1.p2Id : seg1.p1Id;
              const p2 = seg2.p1Id === commonVertex ? seg2.p2Id : seg2.p1Id;

              const existingRa = rightAngles.find(r => r.vertexId === commonVertex && ((r.p1Id === p1 && r.p2Id === p2) || (r.p1Id === p2 && r.p2Id === p1)));
              saveSnapshot();
              if (existingRa) {
                setRightAngles(prev => prev.filter(r => r.id !== existingRa.id));
                showNotice(`Đã xóa ký hiệu góc vuông tại đỉnh ${points.find(p => p.id === commonVertex)?.label || ''}`);
              } else {
                const newRa: GspRightAngle = {
                  id: 'ra_' + Date.now(),
                  p1Id: p1,
                  vertexId: commonVertex,
                  p2Id: p2,
                  size: rightAngleSize,
                  color: activeColor,
                  hasDot: rightAngleStyle === 'with_dot'
                };
                setRightAngles(prev => [...prev, newRa]);
                showNotice(`Đã đánh dấu góc vuông tại đỉnh ${points.find(p => p.id === commonVertex)?.label || ''}`);
              }
              setAngleFirstSegmentId(null);
              return;
            } else {
              showNotice('Hai đoạn thẳng không có đỉnh chung. Vui lòng chọn 2 đoạn thẳng nối với nhau.');
              setAngleFirstSegmentId(null);
              return;
            }
          }
        }
      }

      // 3. Nhấp vào điểm
      if (nearbyPt) {
        const connectedSegs = segments.filter(s => s.p1Id === nearbyPt.id || s.p2Id === nearbyPt.id);

        // Cách 1: 1-Click Vertex (nếu đỉnh này nối đúng 2 cạnh và chưa chọn điểm dở dang)
        if (angleVertices.length === 0 && !angleFirstSegmentId && connectedSegs.length === 2) {
          const p1 = connectedSegs[0].p1Id === nearbyPt.id ? connectedSegs[0].p2Id : connectedSegs[0].p1Id;
          const p2 = connectedSegs[1].p1Id === nearbyPt.id ? connectedSegs[1].p2Id : connectedSegs[1].p1Id;

          const existingRa = rightAngles.find(r => r.vertexId === nearbyPt.id && ((r.p1Id === p1 && r.p2Id === p2) || (r.p1Id === p2 && r.p2Id === p1)));
          saveSnapshot();
          if (existingRa) {
            setRightAngles(prev => prev.filter(r => r.id !== existingRa.id));
            showNotice(`Đã xóa ký hiệu góc vuông tại đỉnh ${nearbyPt.label}`);
          } else {
            const newRa: GspRightAngle = {
              id: 'ra_' + Date.now(),
              p1Id: p1,
              vertexId: nearbyPt.id,
              p2Id: p2,
              size: rightAngleSize,
              color: activeColor,
              hasDot: rightAngleStyle === 'with_dot'
            };
            setRightAngles(prev => [...prev, newRa]);
            showNotice(`Đã đánh dấu góc vuông 1-chạm tại đỉnh ${nearbyPt.label}`);
          }
          return;
        }

        // Cách 2: Chọn 3 điểm theo thứ tự [P1 -> Đỉnh góc -> P2]
        const newArr = [...angleVertices, nearbyPt.id];
        if (newArr.length === 1) {
          setAngleVertices(newArr);
          showNotice(`[1/3] Đã chọn ${nearbyPt.label}. Tiếp theo, hãy nhấp ĐỈNH của góc vuông.`);
        } else if (newArr.length === 2) {
          setAngleVertices(newArr);
          showNotice(`[2/3] Đã chọn đỉnh góc ${nearbyPt.label}. Tiếp theo, hãy nhấp điểm thứ 3 để hoàn thành.`);
        } else if (newArr.length === 3) {
          saveSnapshot();
          const newRa: GspRightAngle = {
            id: 'ra_' + Date.now(),
            p1Id: newArr[0],
            vertexId: newArr[1],
            p2Id: newArr[2],
            size: rightAngleSize,
            color: activeColor,
            hasDot: rightAngleStyle === 'with_dot'
          };
          setRightAngles(prev => [...prev, newRa]);
          setAngleVertices([]);
          const vertexLabel = points.find(p => p.id === newArr[1])?.label || '';
          showNotice(`Đã ký hiệu góc vuông tại đỉnh ${vertexLabel}`);
        }
      }
    } else if (activeTool === 'eraser') {
      saveSnapshot();
      const nearbyRa = findNearbyRightAngle(x, y);
      if (nearbyRa) {
        setRightAngles(ras => ras.filter(r => r.id !== nearbyRa.id));
        showNotice('Đã xóa ký hiệu góc vuông');
        return;
      }
      const nearbyEl = findNearbyEllipse(x, y);
      if (nearbyEl) {
        setEllipses(els => els.filter(e => e.id !== nearbyEl.id));
        showNotice('Đã xóa hình elip');
        return;
      }
      if (nearbyPt) {
        // Xóa điểm và các đối tượng nối với điểm này
        setPoints(pts => pts.filter(p => p.id !== nearbyPt.id));
        setSegments(segs => segs.filter(s => s.p1Id !== nearbyPt.id && s.p2Id !== nearbyPt.id));
        setCircles(circs => circs.filter(c => c.centerId !== nearbyPt.id && c.radiusPointId !== nearbyPt.id));
        setEllipses(els => els.filter(e => e.centerId !== nearbyPt.id && e.rxPointId !== nearbyPt.id));
        setRightAngles(ras => ras.filter(r => r.vertexId !== nearbyPt.id && r.p1Id !== nearbyPt.id && r.p2Id !== nearbyPt.id));
        showNotice(`Đã xóa điểm ${nearbyPt.label}`);
      } else if (nearbyTxt) {
        setTexts(pts => pts.filter(t => t.id !== nearbyTxt.id));
        showNotice(`Đã xóa chữ "${nearbyTxt.content}"`);
      } else if (nearbySeg) {
        // Xóa đoạn thẳng gần chuột nhất
        setSegments(segs => segs.filter(s => s.id !== nearbySeg.id));
        showNotice('Đã xóa đoạn thẳng');
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasMouse(e);
    setDrawingCurrentMouse({ x, y });

    // Kéo thả hoặc co giãn biểu đồ
    if (chartDragState) {
      const dx = x - chartDragState.startX;
      const dy = y - chartDragState.startY;
      if (chartDragState.mode === 'move') {
        setCharts(prev => prev.map(c => c.id === chartDragState.chartId ? {
          ...c,
          x: Math.round(chartDragState.origX + dx),
          y: Math.round(chartDragState.origY + dy)
        } : c));
      } else if (chartDragState.mode === 'resize') {
        setCharts(prev => prev.map(c => c.id === chartDragState.chartId ? {
          ...c,
          width: Math.max(140, Math.round(chartDragState.origW + dx)),
          height: Math.max(90, Math.round(chartDragState.origH + dy))
        } : c));
      }
      return;
    }

    // Hover trên biểu đồ
    const hoveredChart = [...charts].reverse().find(c => x >= c.x && x <= c.x + c.width && y >= c.y && y <= c.y + c.height);
    setHoveredChartId(hoveredChart ? hoveredChart.id : null);

    const nearbyPt = findNearbyPoint(x, y);
    const nearbyTxt = findNearbyText(x, y);
    const nearbyLabel = (!nearbyPt && !nearbyTxt) ? findNearbyPointLabel(x, y) : null;
    const nearbySeg = (!nearbyPt && !nearbyTxt && !nearbyLabel) ? findNearbySegment(x, y) : null;
    const nearbyEl = (!nearbyPt && !nearbyTxt && !nearbyLabel && !nearbySeg) ? findNearbyEllipse(x, y) : null;

    setHoveredPointId(nearbyPt ? nearbyPt.id : null);
    setHoveredTextId(nearbyTxt ? nearbyTxt.id : null);
    setHoveredLabelPointId(nearbyLabel ? nearbyLabel.point.id : null);
    setHoveredSegmentId(nearbySeg ? nearbySeg.id : null);
    setHoveredEllipseId(nearbyEl ? nearbyEl.id : null);

    // Kéo dời vị trí nhãn tên đỉnh (Dời text nhãn đỉnh)
    if (draggedLabelPointId) {
      const offset = labelDragOffsetRef.current;
      setPoints(prev => prev.map(p => {
        if (p.id === draggedLabelPointId) {
          const newLx = x - offset.dx;
          const newLy = y - offset.dy;
          return {
            ...p,
            labelOffsetX: Math.round(newLx - p.x),
            labelOffsetY: Math.round(newLy - p.y)
          };
        }
        return p;
      }));
      return;
    }

    // Bắt điểm trên đoạn thẳng khi đang dùng công cụ 'point_on_segment' hoặc 'point'
    let snapTarget: { segId: string; x: number; y: number; t: number; p1Id: string; p2Id: string } | null = null;
    if ((activeTool === 'point_on_segment' || activeTool === 'point') && !nearbyPt) {
      const ptMap = new Map<string, GspPoint>(points.map(p => [p.id, p]));
      for (const seg of segments) {
        const p1 = ptMap.get(seg.p1Id);
        const p2 = ptMap.get(seg.p2Id);
        if (!p1 || !p2) continue;
        const proj = projectPointOnSegment({ x, y }, p1, p2);
        if (proj.dist <= 14) {
          snapTarget = {
            segId: seg.id,
            x: proj.x,
            y: proj.y,
            t: proj.t,
            p1Id: seg.p1Id,
            p2Id: seg.p2Id
          };
          break;
        }
      }
    }
    setSnappedSegmentPoint(snapTarget);

    if (draggedPointId) {
      // Kéo thả di chuyển điểm: hỗ trợ điểm tự do và điểm phụ thuộc trượt trên cạnh
      setPoints(prev => {
        const ptMap = new Map<string, GspPoint>(prev.map(p => [p.id, p]));
        const targetPt = ptMap.get(draggedPointId);
        if (!targetPt) return prev;

        // 1. Cập nhật vị trí của điểm đang bị kéo trực tiếp
        let nextPoints = prev.map(p => {
          if (p.id !== draggedPointId) return p;

          if (p.type === 'on_segment' && p.parentIds) {
            const p1 = ptMap.get(p.parentIds[0]);
            const p2 = ptMap.get(p.parentIds[1]);
            if (p1 && p2) {
              const proj = projectPointOnSegment({ x, y }, p1, p2);
              return {
                ...p,
                x: proj.x,
                y: proj.y,
                ratio: proj.t
              };
            }
          } else if (p.type !== 'midpoint') {
            return { ...p, x, y };
          }
          return p;
        });

        // 2. Cập nhật lại vị trí các điểm phụ thuộc (on_segment và midpoint)
        // Lặp 2 lượt để tính đúng các phụ thuộc nhiều tầng
        for (let pass = 0; pass < 2; pass++) {
          const currentMap = new Map<string, GspPoint>(nextPoints.map(p => [p.id, p]));
          nextPoints = nextPoints.map(p => {
            if (p.id === draggedPointId) return p;

            if (p.type === 'on_segment' && p.parentIds) {
              const p1 = currentMap.get(p.parentIds[0]);
              const p2 = currentMap.get(p.parentIds[1]);
              if (p1 && p2) {
                const t = p.ratio ?? 0.5;
                return {
                  ...p,
                  x: Math.round(p1.x + t * (p2.x - p1.x)),
                  y: Math.round(p1.y + t * (p2.y - p1.y))
                };
              }
            } else if (p.type === 'midpoint' && p.parentIds) {
              const p1 = currentMap.get(p.parentIds[0]);
              const p2 = currentMap.get(p.parentIds[1]);
              if (p1 && p2) {
                return {
                  ...p,
                  x: Math.round((p1.x + p2.x) / 2),
                  y: Math.round((p1.y + p2.y) / 2)
                };
              }
            }
            return p;
          });
        }

        return nextPoints;
      });
    } else if (draggedTextId) {
      // Kéo thả di chuyển text chú thích
      const offset = dragOffsetRef.current;
      setTexts(prev => prev.map(t => {
        if (t.id === draggedTextId) {
          return { ...t, x: Math.round(x - offset.dx), y: Math.round(y - offset.dy) };
        }
        return t;
      }));
    }
  };

  const handleMouseUp = () => {
    if (chartDragState) {
      setChartDragState(null);
      saveSnapshot();
    }
    if (draggedPointId || draggedTextId || draggedLabelPointId) {
      if (dragStartSnapshotRef.current) {
        setHistory(prev => [...prev.slice(-25), dragStartSnapshotRef.current!]);
        setRedoStack([]);
        dragStartSnapshotRef.current = null;
      }
      setDraggedPointId(null);
      setDraggedTextId(null);
      setDraggedLabelPointId(null);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasMouse(e);

    // 0. Nhấp đúp vào Biểu đồ -> Mở trình chỉnh sửa biểu đồ
    const clickedChart = [...charts].reverse().find(c => x >= c.x && x <= c.x + c.width && y >= c.y && y <= c.y + c.height);
    if (clickedChart) {
      setEditingChart(clickedChart);
      setShowChartModal(true);
      return;
    }

    // 1. Nhấp đúp vào Text đã có -> Mở hộp thoại sửa text
    const nearbyTxt = findNearbyText(x, y);
    if (nearbyTxt) {
      setEditingText(nearbyTxt);
      setTextContentInput(nearbyTxt.content);
      setTextFontSize(nearbyTxt.fontSize || 16);
      setTextIsItalic(nearbyTxt.isItalic !== false);
      setTextIsBold(!!nearbyTxt.isBold);
      setTextColor(nearbyTxt.color || '#000000');
      setIsAddingText(false);
      return;
    }

    // 2. Nhấp đúp vào Điểm đã có hoặc Nhãn tên đỉnh -> Đổi tên đỉnh, vị trí nhãn, bật/tắt hiển thị và điều chỉnh vị trí trên cạnh
    const nearbyPt = findNearbyPoint(x, y);
    const nearbyLabel = (!nearbyPt) ? findNearbyPointLabel(x, y) : null;
    const targetPt = nearbyPt || nearbyLabel?.point;
    if (targetPt) {
      setEditingPoint(targetPt);
      setNewLabelInput(targetPt.label);
      setEditingPointHideDot(!!targetPt.hideDot);
      setEditingPointHideLabel(!!targetPt.hideLabel);
      setEditingPointRatio(targetPt.ratio ?? 0.5);
      setEditingPointLabelOffsetX(targetPt.labelOffsetX ?? 9);
      setEditingPointLabelOffsetY(targetPt.labelOffsetY ?? -8);
      return;
    }

    // 3. Nhấp đúp vào Đoạn thẳng -> Đảo nét đứt / nét liền
    const nearbySeg = findNearbySegment(x, y);
    if (nearbySeg) {
      saveSnapshot();
      const newStyle = nearbySeg.style === 'dashed' ? 'solid' : 'dashed';
      setSegments(prev => prev.map(s => s.id === nearbySeg.id ? { ...s, style: newStyle } : s));
      showNotice(`Đã chuyển đoạn thẳng sang ${newStyle === 'dashed' ? 'nét đứt (khuất)' : 'nét liền'}`);
      return;
    }

    // 4. Nhấp đúp vào Hình Elip -> Đảo kiểu nét (nửa đứt nửa liền -> nét liền -> nét đứt)
    const nearbyEl = findNearbyEllipse(x, y);
    if (nearbyEl) {
      saveSnapshot();
      const nextStyle = nearbyEl.style === 'half_dashed' ? 'solid' : nearbyEl.style === 'solid' ? 'dashed' : 'half_dashed';
      setEllipses(prev => prev.map(e => e.id === nearbyEl.id ? { ...e, style: nextStyle } : e));
      const label = nextStyle === 'half_dashed' ? 'Nửa đứt - Nửa liền (SGK)' : nextStyle === 'solid' ? 'Nét liền' : 'Nét đứt';
      showNotice(`Đã chuyển hình elip sang ${label}`);
      return;
    }

    // 5. Nhấp đúp vào khoảng trống trên hình vẽ -> Thêm Text mới tại đúng vị trí con trỏ chuột
    setTextPos({ x, y });
    setEditingText(null);
    setTextContentInput('');
    setTextFontSize(16);
    setTextIsItalic(true);
    setTextIsBold(false);
    setTextColor(activeColor);
    setIsAddingText(true);
  };

  const handleSaveText = () => {
    if (!textContentInput.trim()) {
      setIsAddingText(false);
      setEditingText(null);
      return;
    }

    saveSnapshot();
    if (editingText) {
      setTexts(prev => prev.map(t => t.id === editingText.id ? {
        ...t,
        content: textContentInput.trim(),
        fontSize: textFontSize,
        isItalic: textIsItalic,
        isBold: textIsBold,
        color: textColor
      } : t));
      showNotice(`Đã cập nhật chữ "${textContentInput.trim()}"`);
    } else {
      const newText: GspText = {
        id: 'txt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        x: textPos.x,
        y: textPos.y,
        content: textContentInput.trim(),
        fontSize: textFontSize,
        isItalic: textIsItalic,
        isBold: textIsBold,
        color: textColor
      };
      setTexts(prev => [...prev, newText]);
      showNotice(`Đã thêm chữ "${textContentInput.trim()}" vào hình`);
    }

    setIsAddingText(false);
    setEditingText(null);
  };

  // Dựng trung điểm của 2 điểm hoặc đoạn thẳng đang chọn
  const handleConstructMidpoint = () => {
    if (!selectedPointId) {
      showNotice('Vui lòng chọn 1 điểm trước, sau đó nhấp vào điểm thứ 2 để lấy trung điểm.');
      return;
    }
    // Nếu có 2 điểm hoặc chọn đoạn thẳng
    showNotice('Nhấp vào điểm thứ 2 để xác định trung điểm.');
  };

  // ==========================================
  // THƯ VIỆN MẪU HÌNH DỰNG SẴN 1-CLICK (PRESETS)
  // ==========================================
  const loadPreset = (presetType: string) => {
    saveSnapshot();
    setCurrentPresetType(presetType);

    if (presetType === 'cone' || presetType === 'hinh_non') {
      const pO = createPoint(375, 380, 'O');
      const pS = createPoint(375, 110, 'S');
      const pA = createPoint(225, 380, 'A');
      const pB = createPoint(525, 380, 'B');

      // Điểm M mẫu trên đường sinh SB (phụ thuộc và có thể kéo trượt dọc SB)
      const pM: GspPoint = {
        id: 'pt_M',
        x: Math.round(pS.x + 0.5 * (pB.x - pS.x)),
        y: Math.round(pS.y + 0.5 * (pB.y - pS.y)),
        label: 'M',
        type: 'on_segment',
        parentIds: [pS.id, pB.id],
        segmentId: 's_sb',
        ratio: 0.5
      };

      setPoints([pO, pS, pA, pB, pM]);
      setSegments([
        // Đường cao SO (nét đứt)
        { id: 's_so', p1Id: pS.id, p2Id: pO.id, style: 'dashed', color: '#000000', width: 1.4 },
        // Bán kính đáy OA (nét đứt)
        { id: 's_oa', p1Id: pO.id, p2Id: pA.id, style: 'dashed', color: '#000000', width: 1.4 },
        // 2 đường sinh SA, SB (nét liền)
        { id: 's_sa', p1Id: pS.id, p2Id: pA.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_sb', p1Id: pS.id, p2Id: pB.id, style: 'solid', color: '#000000', width: 1.6 }
      ]);
      setEllipses([
        {
          id: 'el_cone',
          centerId: pO.id,
          rxPointId: pB.id,
          rx: 150,
          ry: 48,
          style: 'half_dashed',
          color: '#000000',
          width: 1.6
        }
      ]);
      setCircles([]);
      setRightAngles([
        { id: 'ra_cone', vertexId: pO.id, p1Id: pS.id, p2Id: pA.id, size: 12, color: '#000000' }
      ]);
      setTexts([]);
      showNotice('Đã nạp mẫu: Hình nón (đáy elip nửa đứt - nửa liền chuẩn SGK, có điểm M trên đường sinh SB)');

    } else if (presetType === 'cylinder' || presetType === 'hinh_tru') {
      const pO1 = createPoint(375, 140, 'O');
      const pA1 = createPoint(235, 140, 'A');
      const pB1 = createPoint(515, 140, 'B');

      const pO2 = createPoint(375, 370, "O'");
      const pA2 = createPoint(235, 370, "A'");
      const pB2 = createPoint(515, 370, "B'");

      // Điểm M mẫu trên đường sinh BB' (phụ thuộc và có thể kéo trượt dọc BB')
      const pM: GspPoint = {
        id: 'pt_M',
        x: pB1.x,
        y: Math.round((pB1.y + pB2.y) / 2),
        label: 'M',
        type: 'on_segment',
        parentIds: [pB1.id, pB2.id],
        segmentId: 's_c2',
        ratio: 0.5
      };

      setPoints([pO1, pA1, pB1, pO2, pA2, pB2, pM]);
      setSegments([
        // 2 đường sinh bên ngoài (nét liền)
        { id: 's_c1', p1Id: pA1.id, p2Id: pA2.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_c2', p1Id: pB1.id, p2Id: pB2.id, style: 'solid', color: '#000000', width: 1.6 },
        // Trục OO' nét đứt
        { id: 's_c3', p1Id: pO1.id, p2Id: pO2.id, style: 'dashed', color: '#000000', width: 1.4 },
        // Bán kính đáy dưới O'A' nét đứt
        { id: 's_c4', p1Id: pO2.id, p2Id: pA2.id, style: 'dashed', color: '#000000', width: 1.4 }
      ]);
      setEllipses([
        // Đáy trên: toàn bộ nét liền
        {
          id: 'el_top',
          centerId: pO1.id,
          rxPointId: pB1.id,
          rx: 140,
          ry: 44,
          style: 'solid',
          color: '#000000',
          width: 1.6
        },
        // Đáy dưới: nửa trên nét đứt, nửa dưới nét liền
        {
          id: 'el_bot',
          centerId: pO2.id,
          rxPointId: pB2.id,
          rx: 140,
          ry: 44,
          style: 'half_dashed',
          color: '#000000',
          width: 1.6
        }
      ]);
      setCircles([]);
      setRightAngles([
        { id: 'ra_cyl', vertexId: pO2.id, p1Id: pO1.id, p2Id: pA2.id, size: 12, color: '#000000' }
      ]);
      setTexts([]);
      showNotice("Đã nạp mẫu: Hình trụ tròn xoay (đáy elip đứt/liền, có điểm M trên đường sinh)");

    } else if (presetType === 'ellipse_base') {
      const pO = createPoint(375, 270, 'O');
      const pA = createPoint(215, 270, 'A');
      const pB = createPoint(535, 270, 'B');

      setPoints([pO, pA, pB]);
      setSegments([
        { id: 's_oa', p1Id: pO.id, p2Id: pA.id, style: 'dashed', color: '#000000', width: 1.4 },
        { id: 's_ob', p1Id: pO.id, p2Id: pB.id, style: 'dashed', color: '#000000', width: 1.4 }
      ]);
      setEllipses([
        {
          id: 'el_base',
          centerId: pO.id,
          rxPointId: pB.id,
          rx: 160,
          ry: 52,
          style: 'half_dashed',
          color: '#000000',
          width: 1.6
        }
      ]);
      setCircles([]);
      setRightAngles([]);
      setTexts([]);
      showNotice('Đã nạp mẫu: Đáy Elip không gian (nửa đứt - nửa liền)');

    } else if (presetType === 'triangle_right') {
      const pA = createPoint(240, 360, 'A');
      const pB = createPoint(520, 360, 'B');
      const pC = createPoint(240, 160, 'C');
      setPoints([pA, pB, pC]);
      setSegments([
        { id: 's1', p1Id: pA.id, p2Id: pB.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's2', p1Id: pB.id, p2Id: pC.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's3', p1Id: pC.id, p2Id: pA.id, style: 'solid', color: '#000000', width: 1.6 }
      ]);
      setCircles([]);
      setEllipses([]);
      setRightAngles([{ id: 'ra1', vertexId: pA.id, p1Id: pB.id, p2Id: pC.id, size: 13, color: '#000000' }]);
      setTexts([]);
      showNotice('Đã nạp mẫu: Tam giác vuông tại A');

    } else if (presetType === 'triangle_equi') {
      const pA = createPoint(375, 140, 'A');
      const pB = createPoint(225, 380, 'B');
      const pC = createPoint(525, 380, 'C');
      setPoints([pA, pB, pC]);
      setSegments([
        { id: 's1', p1Id: pA.id, p2Id: pB.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's2', p1Id: pB.id, p2Id: pC.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's3', p1Id: pC.id, p2Id: pA.id, style: 'solid', color: '#000000', width: 1.6 }
      ]);
      setCircles([]);
      setEllipses([]);
      setRightAngles([]);
      setTexts([]);
      showNotice('Đã nạp mẫu: Tam giác đều ABC');

    } else if (presetType === 'parallelogram') {
      const pA = createPoint(200, 360, 'A');
      const pB = createPoint(480, 360, 'B');
      const pC = createPoint(570, 200, 'C');
      const pD = createPoint(290, 200, 'D');
      setPoints([pA, pB, pC, pD]);
      setSegments([
        { id: 's1', p1Id: pA.id, p2Id: pB.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's2', p1Id: pB.id, p2Id: pC.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's3', p1Id: pC.id, p2Id: pD.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's4', p1Id: pD.id, p2Id: pA.id, style: 'solid', color: '#000000', width: 1.6 }
      ]);
      setCircles([]);
      setEllipses([]);
      setRightAngles([]);
      setTexts([]);
      showNotice('Đã nạp mẫu: Hình bình hành ABCD');

    } else if (presetType === 'pyramid_regular_quad' || presetType === 'pyramid_s_abcd') {
      // Hình chóp tứ giác đều S.ABCD: Đáy ABCD hình vuông (vẽ phối cảnh bình hành), tâm O, SO vuông góc đáy
      const pA = createPoint(180, 370, 'A', -22, 4);
      const pB = createPoint(440, 370, 'B', 10, 14);
      const pC = createPoint(550, 290, 'C', 12, -4);
      const pD = createPoint(290, 290, 'D', 8, -12);

      // Tâm O giao 2 đường chéo đáy
      const oX = Math.round((pA.x + pC.x) / 2);
      const oY = Math.round((pA.y + pC.y) / 2);
      const pO: GspPoint = {
        id: 'pt_O',
        x: oX,
        y: oY,
        label: 'O',
        type: 'midpoint',
        parentIds: [pA.id, pC.id],
        labelOffsetX: 8,
        labelOffsetY: -8
      };

      // Đỉnh S nằm thẳng đứng ngay trên tâm đáy O
      const pS = createPoint(oX, 80, 'S', -6, -14);

      // Điểm M mẫu thuộc cạnh bên SB (phụ thuộc và có thể kéo trượt dọc SB)
      const pM: GspPoint = {
        id: 'pt_M',
        x: Math.round(pS.x + 0.55 * (pB.x - pS.x)),
        y: Math.round(pS.y + 0.55 * (pB.y - pS.y)),
        label: 'M',
        type: 'on_segment',
        parentIds: [pS.id, pB.id],
        segmentId: 's_sb',
        ratio: 0.55,
        labelOffsetX: -20,
        labelOffsetY: 0
      };

      // Điểm N thuộc cạnh bên SC (phụ thuộc và có thể kéo trượt dọc SC)
      const pN: GspPoint = {
        id: 'pt_N',
        x: Math.round(pS.x + 0.45 * (pC.x - pS.x)),
        y: Math.round(pS.y + 0.45 * (pC.y - pS.y)),
        label: 'N',
        type: 'on_segment',
        parentIds: [pS.id, pC.id],
        segmentId: 's_sc',
        ratio: 0.45,
        labelOffsetX: 12,
        labelOffsetY: -8
      };

      setPoints([pA, pB, pC, pD, pO, pS, pM, pN]);
      setSegments([
        // Đáy thấy: AB, BC (nét liền)
        { id: 's_ab', p1Id: pA.id, p2Id: pB.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_bc', p1Id: pB.id, p2Id: pC.id, style: 'solid', color: '#000000', width: 1.6 },
        // Đáy khuất: AD, CD (nét đứt)
        { id: 's_ad', p1Id: pA.id, p2Id: pD.id, style: 'dashed', color: '#000000', width: 1.4 },
        { id: 's_cd', p1Id: pD.id, p2Id: pC.id, style: 'dashed', color: '#000000', width: 1.4 },

        // Cạnh bên thấy: SA, SB, SC (nét liền)
        { id: 's_sa', p1Id: pS.id, p2Id: pA.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_sb', p1Id: pS.id, p2Id: pB.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_sc', p1Id: pS.id, p2Id: pC.id, style: 'solid', color: '#000000', width: 1.6 },
        // Cạnh bên khuất: SD (nét đứt)
        { id: 's_sd', p1Id: pS.id, p2Id: pD.id, style: 'dashed', color: '#000000', width: 1.4 },

        // Hai đường chéo đáy nét đứt
        { id: 's_ac', p1Id: pA.id, p2Id: pC.id, style: 'dashed', color: '#000000', width: 1.2 },
        { id: 's_bd', p1Id: pB.id, p2Id: pD.id, style: 'dashed', color: '#000000', width: 1.2 },

        // Đường cao SO nét đứt
        { id: 's_so', p1Id: pS.id, p2Id: pO.id, style: 'dashed', color: '#000000', width: 1.4 },

        // Các đoạn nối thiết diện / mặt phẳng (OM, ON, MN) nét đứt
        { id: 's_om', p1Id: pO.id, p2Id: pM.id, style: 'dashed', color: '#000000', width: 1.3 },
        { id: 's_on', p1Id: pO.id, p2Id: pN.id, style: 'dashed', color: '#000000', width: 1.3 },
        { id: 's_mn', p1Id: pM.id, p2Id: pN.id, style: 'dashed', color: '#000000', width: 1.3 }
      ]);
      setCircles([]);
      setEllipses([]);
      setRightAngles([
        { id: 'ra_so', vertexId: pO.id, p1Id: pS.id, p2Id: pA.id, size: 12, color: '#000000' }
      ]);
      setTexts([]);
      showNotice('Đã nạp mẫu: Hình chóp tứ giác đều S.ABCD (SO ⊥ đáy, điểm M, N trên SB, SC)');

    } else if (presetType === 'pyramid_regular_tri' || presetType === 'pyramid_s_abc') {
      // Hình chóp tam giác đều S.ABC: Đáy đều ABC, trọng tâm G, SG vuông góc đáy
      const pA = createPoint(190, 360, 'A');
      const pB = createPoint(370, 420, 'B');
      const pC = createPoint(540, 350, 'C');

      // Trung điểm M của cạnh BC
      const pM: GspPoint = {
        id: 'pt_M',
        x: Math.round((pB.x + pC.x) / 2),
        y: Math.round((pB.y + pC.y) / 2),
        label: 'M',
        type: 'midpoint',
        parentIds: [pB.id, pC.id]
      };

      // Trọng tâm G nằm trên AM: AG = 2/3 AM
      const gX = Math.round((pA.x + pB.x + pC.x) / 3);
      const gY = Math.round((pA.y + pB.y + pC.y) / 3);
      const pG: GspPoint = {
        id: 'pt_G',
        x: gX,
        y: gY,
        label: 'G',
        type: 'on_segment',
        parentIds: [pA.id, pM.id],
        ratio: 0.67
      };

      // Đỉnh S nằm thẳng đứng ngay trên trọng tâm G
      const pS = createPoint(gX, 95, 'S');

      // Điểm N mẫu thuộc cạnh bên SC (phụ thuộc và có thể kéo trượt dọc SC)
      const pN: GspPoint = {
        id: 'pt_N',
        x: Math.round(pS.x + 0.5 * (pC.x - pS.x)),
        y: Math.round(pS.y + 0.5 * (pC.y - pS.y)),
        label: 'N',
        type: 'on_segment',
        parentIds: [pS.id, pC.id],
        segmentId: 's_sc',
        ratio: 0.5
      };

      setPoints([pA, pB, pC, pM, pG, pS, pN]);
      setSegments([
        // Đáy: AB, BC thấy (nét liền), AC khuất (nét đứt)
        { id: 's_ab', p1Id: pA.id, p2Id: pB.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_bc', p1Id: pB.id, p2Id: pC.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_ac', p1Id: pA.id, p2Id: pC.id, style: 'dashed', color: '#000000', width: 1.4 },

        // Cạnh bên thấy: SA, SB, SC (nét liền)
        { id: 's_sa', p1Id: pS.id, p2Id: pA.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_sb', p1Id: pS.id, p2Id: pB.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_sc', p1Id: pS.id, p2Id: pC.id, style: 'solid', color: '#000000', width: 1.6 },

        // Trung tuyến đáy AM nét đứt
        { id: 's_am', p1Id: pA.id, p2Id: pM.id, style: 'dashed', color: '#000000', width: 1.3 },
        // Đường cao SG nét đứt
        { id: 's_sg', p1Id: pS.id, p2Id: pG.id, style: 'dashed', color: '#000000', width: 1.4 }
      ]);
      setCircles([]);
      setEllipses([]);
      setRightAngles([
        { id: 'ra_sg', vertexId: pG.id, p1Id: pS.id, p2Id: pA.id, size: 12, color: '#000000' }
      ]);
      setTexts([]);
      showNotice('Đã nạp mẫu: Hình chóp tam giác đều S.ABC (SG ⊥ đáy, có điểm N trên cạnh SC)');

    } else if (presetType === 'box_abcd' || presetType === 'hinh_hop_chu_nhat') {
      const pA = createPoint(180, 200, 'A');
      const pB = createPoint(420, 200, 'B');
      const pC = createPoint(520, 140, 'C');
      const pD = createPoint(280, 140, 'D');

      const dy = 200;
      const pA1 = createPoint(pA.x, pA.y + dy, "A'");
      const pB1 = createPoint(pB.x, pB.y + dy, "B'");
      const pC1 = createPoint(pC.x, pC.y + dy, "C'");
      const pD1 = createPoint(pD.x, pD.y + dy, "D'");

      setPoints([pA, pB, pC, pD, pA1, pB1, pC1, pD1]);
      setSegments([
        // Đáy trên thấy
        { id: 's1', p1Id: pA.id, p2Id: pB.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's2', p1Id: pB.id, p2Id: pC.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's3', p1Id: pC.id, p2Id: pD.id, style: 'dashed', color: '#000000', width: 1.4 },
        { id: 's4', p1Id: pD.id, p2Id: pA.id, style: 'dashed', color: '#000000', width: 1.4 },
        // Cạnh đứng
        { id: 's5', p1Id: pA.id, p2Id: pA1.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's6', p1Id: pB.id, p2Id: pB1.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's7', p1Id: pC.id, p2Id: pC1.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's8', p1Id: pD.id, p2Id: pD1.id, style: 'dashed', color: '#000000', width: 1.4 },
        // Đáy dưới
        { id: 's9', p1Id: pA1.id, p2Id: pB1.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's10', p1Id: pB1.id, p2Id: pC1.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's11', p1Id: pC1.id, p2Id: pD1.id, style: 'dashed', color: '#000000', width: 1.4 },
        { id: 's12', p1Id: pD1.id, p2Id: pA1.id, style: 'dashed', color: '#000000', width: 1.4 }
      ]);
      setCircles([]);
      setEllipses([]);
      setRightAngles([]);
      setTexts([]);
      showNotice("Đã nạp mẫu: Hình hộp ABCD.A'B'C'D'");

    } else if (presetType === 'chop_sa_vuong_day') {
      // Hình chóp có SA vuông góc đáy (S.ABCD)
      const pA = createPoint(200, 320, 'A');
      const pB = createPoint(140, 420, 'B');
      const pC = createPoint(450, 420, 'C');
      const pD = createPoint(510, 320, 'D');

      // Đỉnh S thẳng đứng ngay trên đỉnh A
      const pS = createPoint(200, 110, 'S');

      // Điểm M mẫu trên cạnh SC
      const pM: GspPoint = {
        id: 'pt_M',
        x: Math.round(pS.x + 0.5 * (pC.x - pS.x)),
        y: Math.round(pS.y + 0.5 * (pC.y - pS.y)),
        label: 'M',
        type: 'on_segment',
        parentIds: [pS.id, pC.id],
        segmentId: 's_sc',
        ratio: 0.5
      };

      setPoints([pA, pB, pC, pD, pS, pM]);
      setSegments([
        // Đáy khuất: AD, AB
        { id: 's_ad', p1Id: pA.id, p2Id: pD.id, style: 'dashed', color: '#000000', width: 1.4 },
        { id: 's_ab', p1Id: pA.id, p2Id: pB.id, style: 'dashed', color: '#000000', width: 1.4 },
        // Đáy thấy: BC, CD
        { id: 's_bc', p1Id: pB.id, p2Id: pC.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_cd', p1Id: pC.id, p2Id: pD.id, style: 'solid', color: '#000000', width: 1.6 },
        // Cạnh bên đường cao SA (khuất, vuông góc đáy)
        { id: 's_sa', p1Id: pS.id, p2Id: pA.id, style: 'dashed', color: '#0d9488', width: 1.6 },
        // Các cạnh bên thấy
        { id: 's_sb', p1Id: pS.id, p2Id: pB.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_sc', p1Id: pS.id, p2Id: pC.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_sd', p1Id: pS.id, p2Id: pD.id, style: 'solid', color: '#000000', width: 1.6 }
      ]);
      setCircles([]);
      setEllipses([]);
      setRightAngles([
        { id: 'ra_sa_ab', vertexId: pA.id, p1Id: pS.id, p2Id: pB.id, size: 12, color: '#0d9488' },
        { id: 'ra_sa_ad', vertexId: pA.id, p1Id: pS.id, p2Id: pD.id, size: 12, color: '#0d9488' }
      ]);
      setTexts([]);
      showNotice('Đã nạp mẫu: Hình chóp S.ABCD có SA ⊥ đáy (chuẩn SGK, ký hiệu góc vuông tại A)');

    } else if (presetType === 'chop_tam_giac') {
      // Hình chóp tam giác S.ABC có đường cao SH ⊥ đáy
      const pA = createPoint(180, 330, 'A');
      const pB = createPoint(310, 420, 'B');
      const pC = createPoint(520, 330, 'C');
      const pH = createPoint(300, 350, 'H');
      const pS = createPoint(300, 110, 'S');

      setPoints([pA, pB, pC, pH, pS]);
      setSegments([
        { id: 's_ac', p1Id: pA.id, p2Id: pC.id, style: 'dashed', color: '#000000', width: 1.4 },
        { id: 's_ab', p1Id: pA.id, p2Id: pB.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_bc', p1Id: pB.id, p2Id: pC.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_sa', p1Id: pS.id, p2Id: pA.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_sb', p1Id: pS.id, p2Id: pB.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_sc', p1Id: pS.id, p2Id: pC.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_sh', p1Id: pS.id, p2Id: pH.id, style: 'dashed', color: '#e11d48', width: 1.5 }
      ]);
      setCircles([]);
      setEllipses([]);
      setRightAngles([
        { id: 'ra_sh', vertexId: pH.id, p1Id: pS.id, p2Id: pA.id, size: 12, color: '#e11d48' }
      ]);
      setTexts([]);
      showNotice('Đã nạp mẫu: Hình chóp tam giác S.ABC có đường cao SH ⊥ đáy');

    } else if (presetType === 'lang_tru_tam_giac' || presetType === 'prism_abc') {
      // Lăng trụ tam giác ABC.A'B'C'
      const pA1 = createPoint(200, 170, "A'");
      const pB1 = createPoint(310, 240, "B'");
      const pC1 = createPoint(490, 170, "C'");

      const dy = 210;
      const pA = createPoint(pA1.x, pA1.y + dy, 'A');
      const pB = createPoint(pB1.x, pB1.y + dy, 'B');
      const pC = createPoint(pC1.x, pC1.y + dy, 'C');

      setPoints([pA1, pB1, pC1, pA, pB, pC]);
      setSegments([
        // Đáy trên thấy toàn bộ
        { id: 's_t1', p1Id: pA1.id, p2Id: pB1.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_t2', p1Id: pB1.id, p2Id: pC1.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_t3', p1Id: pA1.id, p2Id: pC1.id, style: 'solid', color: '#000000', width: 1.6 },
        // Đáy dưới: AB, BC thấy, AC khuất
        { id: 's_b1', p1Id: pA.id, p2Id: pB.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_b2', p1Id: pB.id, p2Id: pC.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_b3', p1Id: pA.id, p2Id: pC.id, style: 'dashed', color: '#000000', width: 1.4 },
        // Cạnh bên
        { id: 's_e1', p1Id: pA1.id, p2Id: pA.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_e2', p1Id: pB1.id, p2Id: pB.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_e3', p1Id: pC1.id, p2Id: pC.id, style: 'solid', color: '#000000', width: 1.6 }
      ]);
      setCircles([]);
      setEllipses([]);
      setRightAngles([]);
      setTexts([]);
      showNotice("Đã nạp mẫu: Lăng trụ tam giác ABC.A'B'C'");

    } else if (presetType === 'hinh_cau') {
      const pO = createPoint(375, 270, 'O');
      const pR = createPoint(375 + 140, 270, 'R');
      setPoints([pO, pR]);
      setSegments([
        { id: 's_or', p1Id: pO.id, p2Id: pR.id, style: 'dashed', color: '#000000', width: 1.4 }
      ]);
      setCircles([
        { id: 'c_sphere', centerId: pO.id, radius: 140, style: 'solid', color: '#000000' }
      ]);
      setEllipses([
        { id: 'el_sphere', centerId: pO.id, rxPointId: pR.id, rx: 140, ry: 45, style: 'half_dashed', color: '#000000', width: 1.4 }
      ]);
      setRightAngles([]);
      setTexts([]);
      showNotice('Đã nạp mẫu: Hình cầu (đường tròn bao quanh và xích đạo elip đứt-liền)');

    } else if (presetType === 'bat_dien_deu') {
      const pA = createPoint(190, 280, 'A');
      const pB = createPoint(320, 360, 'B');
      const pC = createPoint(540, 360, 'C');
      const pD = createPoint(410, 280, 'D');
      const pS = createPoint(365, 95, 'S');
      const pS1 = createPoint(365, 465, "S'");

      setPoints([pA, pB, pC, pD, pS, pS1]);
      setSegments([
        { id: 's_ad', p1Id: pA.id, p2Id: pD.id, style: 'dashed', color: '#000000', width: 1.4 },
        { id: 's_cd', p1Id: pC.id, p2Id: pD.id, style: 'dashed', color: '#000000', width: 1.4 },
        { id: 's_ab', p1Id: pA.id, p2Id: pB.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_bc', p1Id: pB.id, p2Id: pC.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_sa', p1Id: pS.id, p2Id: pA.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_sb', p1Id: pS.id, p2Id: pB.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_sc', p1Id: pS.id, p2Id: pC.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_sd', p1Id: pS.id, p2Id: pD.id, style: 'dashed', color: '#000000', width: 1.4 },
        { id: 's_s1a', p1Id: pS1.id, p2Id: pA.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_s1b', p1Id: pS1.id, p2Id: pB.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_s1c', p1Id: pS1.id, p2Id: pC.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_s1d', p1Id: pS1.id, p2Id: pD.id, style: 'dashed', color: '#000000', width: 1.4 }
      ]);
      setCircles([]);
      setEllipses([]);
      setRightAngles([]);
      setTexts([]);
      showNotice("Đã nạp mẫu: Bát diện đều (khối 8 mặt đều S.ABCD.S')");

    } else if (presetType === 'tam_giac_vuong_cao') {
      const pA = createPoint(220, 130, 'A');
      const pB = createPoint(120, 380, 'B');
      const pC = createPoint(520, 380, 'C');
      const pH = createPoint(220, 380, 'H');

      setPoints([pA, pB, pC, pH]);
      setSegments([
        { id: 's_ab', p1Id: pA.id, p2Id: pB.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_bc', p1Id: pB.id, p2Id: pC.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_ca', p1Id: pC.id, p2Id: pA.id, style: 'solid', color: '#000000', width: 1.6 },
        { id: 's_ah', p1Id: pA.id, p2Id: pH.id, style: 'solid', color: '#e11d48', width: 1.6 }
      ]);
      setCircles([]);
      setEllipses([]);
      setRightAngles([
        { id: 'ra_a', vertexId: pA.id, p1Id: pB.id, p2Id: pC.id, size: 13, color: '#000000' },
        { id: 'ra_h', vertexId: pH.id, p1Id: pA.id, p2Id: pC.id, size: 12, color: '#e11d48' }
      ]);
      setTexts([]);
      showNotice('Đã nạp mẫu: Tam giác ABC vuông tại A có đường cao AH');
    }
  };

  // ==========================================
  // XUẤT ẢNH 300 DPI CHÈN WORD HOẶC TẢI FILE (AUTO-CROP SÁT MÉP ĐẠT KÍCH THƯỚC LỚN NHƯ BBT)
  // ==========================================
  const renderToOffscreenCanvas = (dpiScale = 3): HTMLCanvasElement => {
    const offscreen = document.createElement('canvas');
    offscreen.width = LOGICAL_WIDTH * dpiScale;
    offscreen.height = LOGICAL_HEIGHT * dpiScale;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return offscreen;

    ctx.scale(dpiScale, dpiScale);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    renderGspScene(ctx, false);

    // Tính toán bounding box của toàn bộ nội dung vẽ để auto-crop sát mép (giống Bảng biến thiên)
    let minX = LOGICAL_WIDTH;
    let minY = LOGICAL_HEIGHT;
    let maxX = 0;
    let maxY = 0;
    let hasContent = false;

    for (const p of points) {
      if (p.hidden) continue;
      hasContent = true;
      const lx = p.x + (p.labelOffsetX ?? 9);
      const ly = p.y + (p.labelOffsetY ?? -8);
      const lw = p.label ? Math.max(20, p.label.length * 16) : 20;
      minX = Math.min(minX, p.x - 14, lx - 4);
      maxX = Math.max(maxX, p.x + 14, lx + lw + 4);
      minY = Math.min(minY, p.y - 14, ly - 22);
      maxY = Math.max(maxY, p.y + 14, ly + 6);
    }
    for (const c of circles) {
      const center = points.find(pt => pt.id === c.centerId);
      if (center) {
        hasContent = true;
        const r = c.radius || 50;
        minX = Math.min(minX, center.x - r);
        maxX = Math.max(maxX, center.x + r);
        minY = Math.min(minY, center.y - r);
        maxY = Math.max(maxY, center.y + r);
      }
    }
    for (const el of ellipses) {
      const center = points.find(pt => pt.id === el.centerId);
      if (center) {
        hasContent = true;
        minX = Math.min(minX, center.x - el.rx);
        maxX = Math.max(maxX, center.x + el.rx);
        minY = Math.min(minY, center.y - el.ry);
        maxY = Math.max(maxY, center.y + el.ry);
      }
    }
    for (const t of texts) {
      hasContent = true;
      minX = Math.min(minX, t.x - 8);
      maxX = Math.max(maxX, t.x + 130);
      minY = Math.min(minY, t.y - 28);
      maxY = Math.max(maxY, t.y + 14);
    }
    for (const ch of charts) {
      hasContent = true;
      minX = Math.min(minX, ch.x);
      maxX = Math.max(maxX, ch.x + ch.width);
      minY = Math.min(minY, ch.y);
      maxY = Math.max(maxY, ch.y + ch.height);
    }

    if (!hasContent) return offscreen;

    const pad = 4;
    const cropX = Math.max(0, Math.floor(minX - pad));
    const cropY = Math.max(0, Math.floor(minY - pad));
    const cropW = Math.min(LOGICAL_WIDTH - cropX, Math.ceil(maxX - minX + 2 * pad));
    const cropH = Math.min(LOGICAL_HEIGHT - cropY, Math.ceil(maxY - minY + 2 * pad));

    if (cropW <= 10 || cropH <= 10) return offscreen;

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = Math.round(cropW * dpiScale);
    croppedCanvas.height = Math.round(cropH * dpiScale);
    const cropCtx = croppedCanvas.getContext('2d');
    if (!cropCtx) return offscreen;

    cropCtx.fillStyle = '#FFFFFF';
    cropCtx.fillRect(0, 0, croppedCanvas.width, croppedCanvas.height);
    cropCtx.drawImage(
      offscreen,
      cropX * dpiScale,
      cropY * dpiScale,
      cropW * dpiScale,
      cropH * dpiScale,
      0,
      0,
      croppedCanvas.width,
      croppedCanvas.height
    );

    // Cắt tinh chỉnh bằng pixel quét thực tế để loại bỏ 100% khoảng trắng thừa
    return cropCanvasToContent(croppedCanvas, 4);
  };

  const handleCopyImage = async () => {
    try {
      const offscreen = renderToOffscreenCanvas(3);
      offscreen.toBlob(async blob => {
        if (!blob) return;
        const dpiBlob = await addDpiToBlob(blob, 300);
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': dpiBlob })
        ]);
        showNotice('✅ Đã sao chép ảnh 300 DPI vào Clipboard! Nhấn Ctrl+V để dán vào Word.');
      }, 'image/png');
    } catch (err) {
      console.error(err);
      showNotice('Không thể sao chép tự động. Hãy dùng nút Tải PNG.');
    }
  };

  const handleDownloadPng = () => {
    const offscreen = renderToOffscreenCanvas(3);
    const link = document.createElement('a');
    link.download = `GSP_Hinh_Hoc_${Date.now()}_300dpi.png`;
    link.href = offscreen.toDataURL('image/png');
    link.click();
    showNotice('Đang tải ảnh PNG 300 DPI...');
  };

  const handleSaveJson = () => {
    const data: GspState = { points, segments, circles, ellipses, rightAngles, texts };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `Ban_ve_GSP_${Date.now()}.gsp.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    showNotice('Đã lưu file dự án GSP.');
  };

  const handleOpenJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as GspState;
        if (parsed.points) {
          saveSnapshot();
          setPoints(parsed.points || []);
          setSegments(parsed.segments || []);
          setCircles(parsed.circles || []);
          setEllipses(parsed.ellipses || []);
          setRightAngles(parsed.rightAngles || []);
          setTexts(parsed.texts || []);
          showNotice('Đã nạp bản vẽ thành công.');
        }
      } catch (err) {
        alert('File không hợp lệ.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Đồng bộ trạng thái công cụ lên toàn hệ thống (Ribbon Bar)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('lvp_gsp_tool_changed', { detail: { tool: activeTool } }));
  }, [activeTool]);

  // Lắng nghe sự kiện từ Ribbon Bar (Chép Word, Tải PNG, Cắt nhanh, Chọn công cụ vẽ, Nạp mẫu SGK)
  useEffect(() => {
    const handleRibbonAction = (e: Event) => {
      const ce = e as CustomEvent;
      if (!ce.detail) return;
      const { type } = ce.detail;
      if (type === 'copy_word') {
        handleCopyImage();
      } else if (type === 'download_png') {
        handleDownloadPng();
      } else if (type === 'open_crop') {
        const offscreen = renderToOffscreenCanvas(3);
        const dataUrl = offscreen.toDataURL('image/png');
        window.dispatchEvent(new CustomEvent('lvp_open_crop_modal', {
          detail: { dataUrl, title: 'Hình học GSP' }
        }));
      } else if (type === 'gsp_select_tool') {
        const tool = ce.detail.tool;
        if (tool === 'clear') {
          handleClearAll();
        } else if (['select', 'point', 'point_on_segment', 'segment', 'vector', 'circle', 'ellipse', 'right_angle', 'text', 'eraser'].includes(tool)) {
          setActiveTool(tool as any);
          setDrawingStartPointId(null);
          setAngleVertices([]);
          showNotice(`Đã kích hoạt: ${
            tool === 'select' ? 'Chọn & Dời đối tượng' :
            tool === 'point' ? 'Chấm điểm tự do' :
            tool === 'point_on_segment' ? 'Điểm trên cạnh (phụ thuộc)' :
            tool === 'segment' ? 'Vẽ đoạn thẳng' :
            tool === 'vector' ? 'Vẽ véc-tơ' :
            tool === 'circle' ? 'Vẽ đường tròn' :
            tool === 'ellipse' ? 'Vẽ đáy Elip không gian' :
            tool === 'right_angle' ? 'Ký hiệu góc vuông' :
            tool === 'text' ? 'Thêm ký hiệu chữ / nhãn' : 'Tẩy xóa điểm / cạnh'
          }`);
        }
      } else if (type === 'gsp_load_sample') {
        const sample = ce.detail.sample;
        const sampleMap: Record<string, string> = {
          'Tam giác': 'tam_giac_vuong_cao',
          'triangle': 'tam_giac_vuong_cao',
          'triangle_right': 'triangle_right',
          'triangle_equi': 'triangle_equi',
          'tam_giac_vuong_cao': 'tam_giac_vuong_cao',
          'Tứ giác': 'parallelogram',
          'quad': 'parallelogram',
          'parallelogram': 'parallelogram',
          'Hình chóp': 'pyramid_regular_quad',
          'pyramid': 'pyramid_regular_quad',
          'pyramid_regular_quad': 'pyramid_regular_quad',
          'pyramid_regular_tri': 'pyramid_regular_tri',
          'chop_sa_vuong_day': 'chop_sa_vuong_day',
          'chop_tam_giac': 'chop_tam_giac',
          'Lăng trụ': 'lang_tru_tam_giac',
          'prism': 'lang_tru_tam_giac',
          'lang_tru_tam_giac': 'lang_tru_tam_giac',
          'box_abcd': 'box_abcd',
          'Nón - Trụ - Cầu': 'cone',
          'cone': 'cone',
          'cylinder': 'cylinder',
          'hinh_cau': 'hinh_cau',
        };
        const presetKey = sampleMap[sample] || sample;
        loadPreset(presetKey);
      } else if (type === 'gsp_toggle_grid') {
        setShowGrid(prev => !prev);
        showNotice('Đã đổi chế độ lưới toạ độ');
      } else if (type === 'gsp_set_line_style') {
        const style = ce.detail.style === 'dashed' ? 'dashed' : 'solid';
        setLineStyle(style);
        showNotice(`Nét vẽ chuyển sang: ${style === 'dashed' ? 'Nét đứt' : 'Nét liền'}`);
      } else if (type === 'gsp_toggle_point_mode') {
        const next = pointDisplayMode === 'all' ? 'labels_only' : pointDisplayMode === 'labels_only' ? 'hidden' : 'all';
        setPointDisplayMode(next);
        showNotice(
          next === 'all'
            ? 'Chấm điểm: Nhỏ SGK vừa đủ nhìn (2.0px)'
            : next === 'labels_only'
            ? 'Chấm điểm: Ẩn chấm tròn • (Chỉ hiện chữ nhãn A, B, C)'
            : 'Chấm điểm: Ẩn toàn bộ điểm'
        );
      } else if (type === 'gsp_set_point_size') {
        const sz = ce.detail.size;
        setPointSize(sz);
        showNotice(`Cỡ chấm điểm: ${sz === 'tiny' ? 'Siêu nhỏ (1.4px)' : sz === 'medium' ? 'Vừa (2.8px)' : 'Nhỏ SGK vừa đủ nhìn (2.0px)'}`);
      }
    };
    window.addEventListener('lvp_ribbon_action', handleRibbonAction);
    return () => window.removeEventListener('lvp_ribbon_action', handleRibbonAction);
  }, [points, segments, circles, ellipses, rightAngles, texts, activeTool]);

  // ==========================================
  // HÀM VẼ TOÀN BỘ BẢN VẼ GSP LÊN CANVAS
  // ==========================================
  const renderGspScene = (ctx: CanvasRenderingContext2D, isInteractive: boolean) => {
    const ptMap = new Map<string, GspPoint>(points.map(p => [p.id, p]));

    // 1. Vẽ lưới mờ
    if (showGrid && isInteractive) {
      ctx.save();
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      const step = 25;
      for (let x = 0; x <= LOGICAL_WIDTH; x += step) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, LOGICAL_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y <= LOGICAL_HEIGHT; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(LOGICAL_WIDTH, y + 0.5);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Vẽ các đường tròn
    for (const c of circles) {
      const center = ptMap.get(c.centerId);
      if (!center) continue;
      let r = c.radius || 50;
      if (c.radiusPointId) {
        const radPt = ptMap.get(c.radiusPointId);
        if (radPt) r = Math.hypot(radPt.x - center.x, radPt.y - center.y);
      }

      ctx.save();
      ctx.strokeStyle = c.color || '#000000';
      ctx.lineWidth = 2.2;
      if (c.style === 'dashed') ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 2.5. Vẽ các hình Elip (Đáy hình nón / hình trụ / elip học tập)
    for (const el of ellipses) {
      const center = ptMap.get(el.centerId);
      if (!center) continue;

      let rx = el.rx;
      let ry = el.ry;
      if (el.rxPointId) {
        const rxPt = ptMap.get(el.rxPointId);
        if (rxPt) {
          rx = Math.hypot(rxPt.x - center.x, rxPt.y - center.y) || el.rx;
          const ratio = (el.ry && el.rx) ? (el.ry / el.rx) : 0.32;
          ry = Math.round(rx * ratio);
        }
      }

      // Highlight khi hover trong chế độ tương tác
      if (isInteractive && hoveredEllipseId === el.id) {
        ctx.save();
        ctx.strokeStyle = 'rgba(13, 148, 136, 0.4)';
        ctx.lineWidth = (el.width || 1.6) + 6;
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.strokeStyle = el.color || '#000000';
      ctx.lineWidth = el.width || 2.2;

      if (el.style === 'half_dashed') {
        // Nửa trên (góc Math.PI -> 2*Math.PI): nét đứt (khuất trong phối cảnh 3D SGK)
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, rx, ry, 0, Math.PI, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();

        // Nửa dưới (góc 0 -> Math.PI): nét liền (thấy ở phía trước)
        ctx.save();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI);
        ctx.stroke();
        ctx.restore();
      } else if (el.style === 'dashed') {
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // solid
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Vẽ các đoạn thẳng
    for (const s of segments) {
      const p1 = ptMap.get(s.p1Id);
      const p2 = ptMap.get(s.p2Id);
      if (!p1 || !p2) continue;

      // Highlight segment khi hover hoặc select trong chế độ tương tác
      if (isInteractive && (hoveredSegmentId === s.id || selectedSegmentId === s.id)) {
        ctx.save();
        ctx.strokeStyle = 'rgba(13, 148, 136, 0.4)';
        ctx.lineWidth = (s.width || 1.6) + 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.strokeStyle = s.color || '#000000';
      ctx.lineWidth = s.width || (s.style === 'dashed' ? 1.8 : 2.2);
      ctx.lineCap = 'round';
      if (s.style === 'dashed') ctx.setLineDash([5, 4]);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();

      // Nếu là Vectơ, vẽ mũi tên sắc nét ở đầu ngọn
      if (s.isVector) {
        const tip = s.vectorEnd === 'p1' ? p1 : p2;
        const base = s.vectorEnd === 'p1' ? p2 : p1;
        const angle = Math.atan2(tip.y - base.y, tip.x - base.x);
        const arrowLen = 15;
        const arrowAngle = 0.42;

        const tipX = tip.x;
        const tipY = tip.y;
        const w1x = tipX - arrowLen * Math.cos(angle - arrowAngle);
        const w1y = tipY - arrowLen * Math.sin(angle - arrowAngle);
        const w2x = tipX - arrowLen * Math.cos(angle + arrowAngle);
        const w2y = tipY - arrowLen * Math.sin(angle + arrowAngle);
        const notchX = tipX - (arrowLen * 0.72) * Math.cos(angle);
        const notchY = tipY - (arrowLen * 0.72) * Math.sin(angle);

        ctx.save();
        ctx.fillStyle = s.color || '#000000';
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(w1x, w1y);
        ctx.lineTo(notchX, notchY);
        ctx.lineTo(w2x, w2y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // 4. Vẽ ký hiệu góc vuông
    for (const ra of rightAngles) {
      const v = ptMap.get(ra.vertexId);
      const p1 = ptMap.get(ra.p1Id);
      const p2 = ptMap.get(ra.p2Id);
      if (!v || !p1 || !p2) continue;

      const size = ra.size || 13;
      const d1 = Math.hypot(p1.x - v.x, p1.y - v.y) || 1;
      const d2 = Math.hypot(p2.x - v.x, p2.y - v.y) || 1;
      const u1x = (p1.x - v.x) / d1;
      const u1y = (p1.y - v.y) / d1;
      const u2x = (p2.x - v.x) / d2;
      const u2y = (p2.y - v.y) / d2;

      const k1x = v.x + u1x * size;
      const k1y = v.y + u1y * size;
      const k2x = v.x + u2x * size;
      const k2y = v.y + u2y * size;
      const kCornerX = k1x + u2x * size;
      const kCornerY = k1y + u2y * size;

      ctx.save();
      ctx.strokeStyle = ra.color || '#000000';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(k1x, k1y);
      ctx.lineTo(kCornerX, kCornerY);
      ctx.lineTo(k2x, k2y);
      ctx.stroke();

      // Nếu có chấm tròn ở giữa (style with_dot)
      if (ra.hasDot) {
        const dotX = v.x + (u1x + u2x) * (size * 0.45);
        const dotY = v.y + (u1y + u2y) * (size * 0.45);
        ctx.beginPath();
        ctx.arc(dotX, dotY, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = ra.color || '#000000';
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. Đường dự kiến khi đang vẽ dở dang
    if (isInteractive && drawingStartPointId && drawingCurrentMouse) {
      const p1 = ptMap.get(drawingStartPointId);
      if (p1) {
        ctx.save();
        ctx.strokeStyle = '#0d9488';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 3]);

        if (activeTool === 'segment') {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(drawingCurrentMouse.x, drawingCurrentMouse.y);
          ctx.stroke();
        } else if (activeTool === 'vector') {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(drawingCurrentMouse.x, drawingCurrentMouse.y);
          ctx.stroke();

          const angle = Math.atan2(drawingCurrentMouse.y - p1.y, drawingCurrentMouse.x - p1.x);
          const arrowLen = 13;
          const arrowAngle = 0.42;
          const tipX = drawingCurrentMouse.x;
          const tipY = drawingCurrentMouse.y;
          const w1x = tipX - arrowLen * Math.cos(angle - arrowAngle);
          const w1y = tipY - arrowLen * Math.sin(angle - arrowAngle);
          const w2x = tipX - arrowLen * Math.cos(angle + arrowAngle);
          const w2y = tipY - arrowLen * Math.sin(angle + arrowAngle);
          const notchX = tipX - (arrowLen * 0.72) * Math.cos(angle);
          const notchY = tipY - (arrowLen * 0.72) * Math.sin(angle);

          ctx.save();
          ctx.fillStyle = '#0d9488';
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(w1x, w1y);
          ctx.lineTo(notchX, notchY);
          ctx.lineTo(w2x, w2y);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (activeTool === 'circle') {
          const r = Math.hypot(drawingCurrentMouse.x - p1.x, drawingCurrentMouse.y - p1.y);
          ctx.beginPath();
          ctx.arc(p1.x, p1.y, r, 0, Math.PI * 2);
          ctx.stroke();
        } else if (activeTool === 'ellipse') {
          const rx = Math.hypot(drawingCurrentMouse.x - p1.x, drawingCurrentMouse.y - p1.y) || 60;
          const ry = Math.max(16, Math.round(rx * 0.32));
          if (ellipseStyle === 'half_dashed') {
            ctx.save();
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.ellipse(p1.x, p1.y, rx, ry, 0, Math.PI, 2 * Math.PI);
            ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.ellipse(p1.x, p1.y, rx, ry, 0, 0, Math.PI);
            ctx.stroke();
            ctx.restore();
          } else if (ellipseStyle === 'dashed') {
            ctx.save();
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.ellipse(p1.x, p1.y, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          } else {
            ctx.beginPath();
            ctx.ellipse(p1.x, p1.y, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }

    // 6. Vẽ các điểm (chấm tròn) và vòng sáng thao tác (có hỗ trợ chế độ Ẩn / Hiện điểm)
    for (const p of points) {
      if (p.hidden && !isInteractive) continue;

      const shouldDrawDot = (pointDisplayMode === 'all') && !p.hideDot && !p.hidden;
      const isSelected = isInteractive && selectedPointId === p.id;
      const isHovered = isInteractive && hoveredPointId === p.id;
      const isDrawingStart = isInteractive && drawingStartPointId === p.id;
      const angleStepIdx = isInteractive && activeTool === 'right_angle' ? angleVertices.indexOf(p.id) : -1;

      ctx.save();
      if (angleStepIdx >= 0) {
        // Điểm đang chọn tạo góc vuông (số 1, 2)
        ctx.beginPath();
        ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fill();

        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#b45309';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${angleStepIdx + 1}`, p.x, p.y - 18);
      } else if (isInteractive && (isSelected || isHovered || isDrawingStart)) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, isSelected ? 8 : 6, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? 'rgba(13, 148, 136, 0.35)' : 'rgba(13, 148, 136, 0.2)';
        ctx.fill();
      }

      if (shouldDrawDot) {
        ctx.beginPath();
        // Chấm tròn điểm nhỏ chuẩn SGK, vừa đủ nhìn (bán kính mặc định 2.0px)
        const baseR = pointSize === 'tiny' ? 1.4 : pointSize === 'medium' ? 2.8 : 2.0;
        const dotR = (isSelected || angleStepIdx >= 0) ? (baseR + 0.9) : (isHovered ? (baseR + 0.4) : baseR);
        ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
        ctx.fillStyle = angleStepIdx >= 0 ? '#f59e0b' : ((isSelected || isHovered) ? '#0d9488' : (p.color || '#000000'));
        ctx.fill();
      } else if (isInteractive) {
        // Nếu bị ẩn chấm, trong lúc sửa vẽ một viền mờ đứt đoạn nhỏ để người dùng vẫn biết vị trí kéo thả
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Nếu đang chọn đoạn thẳng 1 trong công cụ góc vuông
    if (isInteractive && activeTool === 'right_angle' && angleFirstSegmentId) {
      const s = segments.find(seg => seg.id === angleFirstSegmentId);
      if (s) {
        const p1 = ptMap.get(s.p1Id);
        const p2 = ptMap.get(s.p2Id);
        if (p1 && p2) {
          ctx.save();
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
          ctx.lineWidth = (s.width || 1.6) + 4;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // 6.5. Vẽ vòng tròn bắt điểm trên cạnh khi dùng công cụ lấy điểm trên cạnh
    if (isInteractive && snappedSegmentPoint && (activeTool === 'point_on_segment' || activeTool === 'point')) {
      const snap = snappedSegmentPoint;
      ctx.save();
      // Vòng tròn ngoài
      ctx.beginPath();
      ctx.arc(snap.x, snap.y, 6.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(13, 148, 136, 0.35)';
      ctx.fill();
      ctx.stroke();

      // Dấu chấm tâm
      ctx.beginPath();
      ctx.arc(snap.x, snap.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#0f766e';
      ctx.fill();

      // Nhãn gợi ý tỉ lệ vị trí
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#0f766e';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(snap.t * 100)}%`, snap.x, snap.y - 10);
      ctx.restore();
    }

    // 7. Ghi nhãn chữ tên đỉnh (Times New Roman in nghiêng, viền Halo trắng chống đè nét)
    if (pointDisplayMode !== 'hidden') {
      ctx.font = 'italic bold 21px "Times New Roman", serif';
      for (const p of points) {
        if ((p.hidden || p.hideLabel) && !isInteractive) continue;
        if (!p.label) continue;

        const isSelected = isInteractive && selectedPointId === p.id;
        const isLabelHovered = isInteractive && (hoveredLabelPointId === p.id || draggedLabelPointId === p.id);
        const lx = p.x + (p.labelOffsetX ?? 9);
        const ly = p.y + (p.labelOffsetY ?? -8);

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';

        if (p.hidden || p.hideLabel) {
          ctx.globalAlpha = 0.4; // hiển thị mờ trong khi chỉnh sửa
        }

        // Khung viền nét đứt khi hover hoặc kéo dời nhãn đỉnh (Dời text)
        if (isInteractive && isLabelHovered) {
          const m = ctx.measureText(p.label);
          const lw = Math.max(m.width, 16);
          const lh = 22;
          ctx.save();
          ctx.strokeStyle = '#0d9488';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([3, 2]);
          ctx.strokeRect(lx - 4, ly - lh - 2, lw + 8, lh + 6);
          ctx.restore();
        }

        // Viền trắng bảo vệ chữ không bị đường thẳng đè
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 5;
        ctx.lineJoin = 'round';
        ctx.strokeText(p.label, lx, ly);

        ctx.fillStyle = (isSelected || isLabelHovered) ? '#0d9488' : (p.color || '#000000');
        ctx.fillText(p.label, lx, ly);
        ctx.restore();
      }
    }

    // 8. Vẽ các đoạn text chú thích tự do (nhấp đúp chuột để chèn)
    for (const t of texts) {
      const isSelected = isInteractive && selectedTextId === t.id;
      const isHovered = isInteractive && hoveredTextId === t.id;
      const size = t.fontSize || 16;
      const italic = t.isItalic !== false ? 'italic ' : '';
      const bold = t.isBold ? 'bold ' : '';

      ctx.save();
      ctx.font = `${italic}${bold}${size}px "Times New Roman", serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      // Khung viền mờ khi select hoặc hover trong interactive mode
      if (isInteractive && (isSelected || isHovered)) {
        const textMetrics = ctx.measureText(t.content);
        const w = Math.max(textMetrics.width, 16);
        const h = size * 1.3;
        ctx.strokeStyle = isSelected ? '#0d9488' : 'rgba(13, 148, 136, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 2]);
        ctx.strokeRect(t.x - 3, t.y - h / 2, w + 6, h);
        ctx.setLineDash([]);
      }

      // Viền trắng Halo bảo vệ chữ không bị đường thẳng hay lưới đè
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.strokeText(t.content, t.x, t.y);

      ctx.fillStyle = isSelected ? '#0d9488' : (t.color || '#000000');
      ctx.fillText(t.content, t.x, t.y);
      ctx.restore();
    }

    // 9. Vẽ các biểu đồ thống kê đã chèn (kéo để dời, kéo góc để phóng to/thu nhỏ)
    for (const c of charts) {
      const img = chartImagesRef.current.get(c.id);
      if (img && img.complete) {
        ctx.drawImage(img, c.x, c.y, c.width, c.height);
      } else {
        ctx.save();
        ctx.strokeStyle = '#94a3b8';
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(c.x, c.y, c.width, c.height);
        ctx.fillStyle = '#64748b';
        ctx.font = '12px sans-serif';
        ctx.fillText('Đang nạp biểu đồ...', c.x + 10, c.y + 20);
        ctx.restore();
      }

      if (isInteractive && (selectedChartId === c.id || hoveredChartId === c.id)) {
        ctx.save();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(c.x, c.y, c.width, c.height);

        // Vẽ 4 góc điều chỉnh kích thước
        const hs = 8;
        ctx.fillStyle = '#0284c7';
        ctx.setLineDash([]);
        ctx.fillRect(c.x - hs / 2, c.y - hs / 2, hs, hs);
        ctx.fillRect(c.x + c.width - hs / 2, c.y - hs / 2, hs, hs);
        ctx.fillRect(c.x - hs / 2, c.y + c.height - hs / 2, hs, hs);
        ctx.fillRect(c.x + c.width - hs / 2, c.y + c.height - hs / 2, hs, hs);
        ctx.restore();
      }
    }
  };

  // Nạp hình ảnh biểu đồ vào cache Ref
  useEffect(() => {
    charts.forEach(c => {
      if (!chartImagesRef.current.has(c.id)) {
        const blob = new Blob([c.svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          chartImagesRef.current.set(c.id, img);
          setChartRenderTrigger(prev => prev + 1);
        };
        img.src = url;
      }
    });
  }, [charts]);

  // Render lại Canvas mỗi khi state thay đổi
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = LOGICAL_WIDTH;
    canvas.height = LOGICAL_HEIGHT;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    renderGspScene(ctx, true);
  }, [points, segments, circles, ellipses, rightAngles, texts, charts, selectedChartId, hoveredChartId, chartRenderTrigger, showGrid, pointDisplayMode, pointSize, selectedPointId, hoveredPointId, hoveredLabelPointId, draggedLabelPointId, selectedSegmentId, hoveredSegmentId, hoveredEllipseId, selectedTextId, hoveredTextId, drawingStartPointId, drawingCurrentMouse, angleVertices, angleFirstSegmentId, rightAngleSize, rightAngleStyle, ellipseStyle, activeTool, activeColor, lineStyle, snappedSegmentPoint]);

  // Nạp sẵn mẫu hình ban đầu nếu trống hoặc khi externalPreset thay đổi
  useEffect(() => {
    if (points.length === 0) {
      loadPreset(externalPreset || 'pyramid_regular_quad');
    }
  }, []);

  useEffect(() => {
    if (externalPreset) {
      loadPreset(externalPreset);
    }
  }, [externalPreset]);

  const getCanvasCursor = () => {
    if (activeTool === 'eraser') return 'not-allowed';
    if (activeTool === 'text') return 'text';
    if (activeTool === 'right_angle') return 'crosshair';
    if (activeTool === 'point_on_segment') return 'crosshair';
    if (activeTool === 'vector') return 'crosshair';
    if (hoveredPointId || hoveredTextId || hoveredLabelPointId || draggedLabelPointId) return 'move';
    if (activeTool === 'select') {
      if (selectedChartId) {
        const sc = charts.find(c => c.id === selectedChartId);
        if (sc && drawingCurrentMouse) {
          const rx = sc.x + sc.width;
          const ry = sc.y + sc.height;
          if (Math.hypot(drawingCurrentMouse.x - rx, drawingCurrentMouse.y - ry) <= 14) {
            return 'nwse-resize';
          }
        }
      }
      if (hoveredChartId) return 'move';
      if (hoveredSegmentId) return 'pointer';
      return 'default';
    }
    return 'crosshair';
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* THANH THÔNG BÁO HOẶC HƯỚNG DẪN */}
      {notice && (
        <div className="p-2.5 bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-800 rounded-xl text-teal-800 dark:text-teal-200 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 size={16} className="text-teal-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* KHUNG CHÍNH CHỨA THANH CÔNG CỤ & BẢNG VẼ */}
      <div className={`grid grid-cols-1 ${isSplitView ? 'lg:grid-cols-1' : 'lg:grid-cols-12'} gap-4 items-start`}>
        {/* CỘT TRÁI: HỘP CÔNG CỤ GSP ĐƠN GIẢN */}
        <div className={`${isSplitView ? 'w-full' : 'lg:col-span-3'} bg-white dark:bg-slate-900 p-4 rounded-2xl border border-teal-100 dark:border-slate-800 shadow-xs space-y-4`}>
          {/* Logo GSP & Tiêu đề */}
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-teal-500 to-sky-500 flex items-center justify-center text-white shadow-xs">
              <Compass size={18} />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">GSP Sketchpad Web</h3>
              <p className="text-[10px] text-slate-400">Hình học động chuẩn SGK</p>
            </div>
          </div>

          {/* NHÓM CÔNG CỤ DỰNG HÌNH CHÍNH */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Công cụ tương tác:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => { setActiveTool('select'); setDrawingStartPointId(null); }}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTool === 'select'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Chọn đối tượng, kéo thả đỉnh, kéo dời nhãn chữ (A, B, C...) tránh đè nét hoặc nhấp vào cạnh để đổi nét"
              >
                <MousePointer size={15} />
                <span>Chọn & Dời text</span>
              </button>

              <button
                onClick={() => { setActiveTool('point'); setDrawingStartPointId(null); }}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTool === 'point'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Nhấp vào bảng vẽ để chấm điểm tự do (A, B, C...)"
              >
                <CircleDot size={15} />
                <span>Chấm điểm</span>
              </button>

              <button
                onClick={() => { setActiveTool('point_on_segment'); setDrawingStartPointId(null); }}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTool === 'point_on_segment'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Lấy điểm nằm trên cạnh (có tính phụ thuộc động, có thể kéo di chuyển dọc theo cạnh)"
              >
                <Dot size={18} className="text-teal-500 bg-teal-100 dark:bg-teal-900 rounded-full shrink-0" />
                <span>Điểm trên cạnh</span>
              </button>

              <button
                onClick={() => { setActiveTool('segment'); setDrawingStartPointId(null); }}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTool === 'segment'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Nối đoạn thẳng giữa 2 điểm"
              >
                <Minus size={15} />
                <span>Đoạn thẳng</span>
              </button>

              <button
                onClick={() => { setActiveTool('vector'); setDrawingStartPointId(null); }}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTool === 'vector'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Vẽ vectơ có mũi tên định hướng (nhấp điểm gốc -> nhấp điểm ngọn)"
              >
                <ArrowRight size={15} />
                <span>Vectơ</span>
              </button>

              <button
                onClick={() => { setActiveTool('circle'); setDrawingStartPointId(null); }}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTool === 'circle'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Vẽ đường tròn (nhấp tâm, nhấp điểm bán kính)"
              >
                <Circle size={15} />
                <span>Đường tròn</span>
              </button>

              <button
                onClick={() => { setActiveTool('ellipse'); setDrawingStartPointId(null); }}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTool === 'ellipse'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Vẽ hình Elip (mặc định nửa đứt - nửa liền để vẽ hình nón, hình trụ SGK)"
              >
                <span className="text-sm font-black leading-none">⬭</span>
                <span>Hình Elip</span>
              </button>

              <button
                onClick={() => { setActiveTool('right_angle'); setDrawingStartPointId(null); setAngleVertices([]); }}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTool === 'right_angle'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Nhấp 3 điểm (P1, Đỉnh góc, P2) hoặc 1-chạm đỉnh để đánh dấu góc vuông"
              >
                <span className="font-mono text-xs font-bold">∟</span>
                <span>Góc vuông</span>
              </button>

              <button
                onClick={() => { setActiveTool('text'); setDrawingStartPointId(null); }}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTool === 'text'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Thêm chữ / Chú thích vào hình vẽ (hoặc nhấp đúp chuột bất kỳ lúc nào)"
              >
                <Type size={15} />
                <span>Thêm chữ</span>
              </button>

              <button
                onClick={() => {
                  const next = pointDisplayMode === 'all' ? 'labels_only' : pointDisplayMode === 'labels_only' ? 'hidden' : 'all';
                  setPointDisplayMode(next);
                  showNotice(
                    next === 'all'
                      ? 'Hiển thị điểm: Đầy đủ (chấm • và chữ)'
                      : next === 'labels_only'
                      ? 'Hiển thị điểm: Chỉ chữ nhãn (Ẩn chấm • - Chuẩn SGK)'
                      : 'Hiển thị điểm: Đã ẩn toàn bộ điểm'
                  );
                }}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  pointDisplayMode !== 'all'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Ẩn / Hiện điểm (Chuyển: Hiện đủ -> Chỉ hiện chữ -> Ẩn hết)"
              >
                {pointDisplayMode === 'all' ? <Eye size={15} /> : <EyeOff size={15} />}
                <span>{pointDisplayMode === 'all' ? 'Hiện điểm' : pointDisplayMode === 'labels_only' ? 'Ẩn chấm •' : 'Ẩn điểm'}</span>
              </button>

              <button
                onClick={() => { setActiveTool('eraser'); setDrawingStartPointId(null); }}
                className={`col-span-2 flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTool === 'eraser'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                }`}
                title="Nhấp vào đối tượng để xóa"
              >
                <Trash2 size={15} />
                <span>Tẩy / Xóa đối tượng</span>
              </button>
            </div>
          </div>

          {/* TÙY CHỈNH KHI ĐANG DÙNG CÔNG CỤ ĐIỂM TRÊN CẠNH */}
          {activeTool === 'point_on_segment' && (
            <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 space-y-2.5 animate-fade-in text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-teal-800 dark:text-teal-200 flex items-center gap-1.5">
                  <span className="text-sm font-black">⚬―</span> Điểm trên cạnh:
                </span>
                <button
                  onClick={() => { setActiveTool('select'); }}
                  className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold cursor-pointer"
                  title="Thoát công cụ"
                >
                  ✕ Đóng
                </button>
              </div>
              <div className="text-[10px] text-teal-800/80 dark:text-teal-300/80 bg-teal-100/60 dark:bg-teal-900/30 p-2 rounded-lg leading-relaxed">
                Rê chuột lên <b>đoạn thẳng / cạnh bất kỳ</b> rồi nhấp để gắn điểm. Điểm này có tính phụ thuộc hình học động và <b>có thể kéo trượt dọc theo cạnh</b>.
              </div>
            </div>
          )}

          {/* TÙY CHỈNH KHI ĐANG DÙNG CÔNG CỤ HÌNH ELIP */}
          {activeTool === 'ellipse' && (
            <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 space-y-2.5 animate-fade-in text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-teal-800 dark:text-teal-200 flex items-center gap-1.5">
                  <span className="text-sm font-black">⬭</span> Tùy chọn Elip:
                </span>
                <button
                  onClick={() => { setActiveTool('select'); setDrawingStartPointId(null); }}
                  className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold cursor-pointer"
                  title="Thoát công cụ elip"
                >
                  ✕ Đóng
                </button>
              </div>

              {/* Kiểu dáng elip */}
              <div className="space-y-1">
                <span className="text-[10px] text-teal-700 dark:text-teal-300 font-bold block">
                  Kiểu nét:
                </span>
                <div className="grid grid-cols-1 gap-1">
                  <button
                    onClick={() => setEllipseStyle('half_dashed')}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition cursor-pointer flex items-center justify-between ${
                      ellipseStyle === 'half_dashed'
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>⬭ Nửa đứt - Nửa liền</span>
                    <span className="text-[9px] opacity-80">(Đáy nón/trụ)</span>
                  </button>
                  <button
                    onClick={() => setEllipseStyle('solid')}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition cursor-pointer flex items-center justify-between ${
                      ellipseStyle === 'solid'
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>⬭ Nét liền toàn bộ</span>
                    <span className="text-[9px] opacity-80">(Đáy trên)</span>
                  </button>
                  <button
                    onClick={() => setEllipseStyle('dashed')}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition cursor-pointer flex items-center justify-between ${
                      ellipseStyle === 'dashed'
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>⬭ Nét đứt toàn bộ</span>
                    <span className="text-[9px] opacity-80">(Đáy khuất)</span>
                  </button>
                </div>
              </div>

              {/* Hướng dẫn nhanh */}
              <div className="text-[10px] text-teal-800/80 dark:text-teal-300/80 bg-teal-100/60 dark:bg-teal-900/30 p-2 rounded-lg leading-relaxed">
                Nhấp <b>tâm elip O</b>, sau đó nhấp chuột định <b>bán kính</b>. Nửa trên tự động nét đứt chuẩn SGK.
              </div>
            </div>
          )}

          {/* TÙY CHỈNH KHI ĐANG DÙNG CÔNG CỤ GÓC VUÔNG */}
          {activeTool === 'right_angle' && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 space-y-2.5 animate-fade-in text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                  <span className="text-sm font-black">∟</span> Tùy chọn góc vuông:
                </span>
                <button
                  onClick={() => { setActiveTool('select'); setAngleVertices([]); setAngleFirstSegmentId(null); }}
                  className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold cursor-pointer"
                  title="Thoát công cụ góc vuông"
                >
                  ✕ Đóng
                </button>
              </div>

              {/* Kích thước */}
              <div className="space-y-1">
                <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold block">
                  Kích thước:
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { size: 10, label: 'Nhỏ (10)' },
                    { size: 13, label: 'Chuẩn (13)' },
                    { size: 17, label: 'Lớn (17)' }
                  ].map(s => (
                    <button
                      key={s.size}
                      onClick={() => setRightAngleSize(s.size)}
                      className={`py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                        rightAngleSize === s.size
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kiểu dáng */}
              <div className="space-y-1">
                <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold block">
                  Kiểu ký hiệu:
                </span>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => setRightAngleStyle('normal')}
                    className={`py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                      rightAngleStyle === 'normal'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ∟ Hình vuông
                  </button>
                  <button
                    onClick={() => setRightAngleStyle('with_dot')}
                    className={`py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                      rightAngleStyle === 'with_dot'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ⊡ Có chấm
                  </button>
                </div>
              </div>

              {/* Hướng dẫn nhanh */}
              <div className="text-[10px] text-amber-700/90 dark:text-amber-300/90 bg-amber-100/60 dark:bg-amber-900/30 p-2 rounded-lg leading-relaxed space-y-1">
                <p>• <b>1-chạm:</b> Nhấp thẳng vào đỉnh (nối 2 cạnh) để đánh dấu tức thì.</p>
                <p>• <b>2 đoạn:</b> Nhấp lần lượt 2 đoạn thẳng nối nhau.</p>
                <p>• <b>Xóa:</b> Nhấp lại vào góc vuông để xóa.</p>
              </div>
            </div>
          )}

          {/* CHỌN KIỂU NÉT: LIỀN HAY ĐỨT (CỰC KỲ QUAN TRỌNG TRONG HÌNH HỌC KHÔNG GIAN) */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Kiểu nét vẽ:
              </span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                Click đoạn để đổi nét
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setLineStyle('solid')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer border flex items-center justify-center gap-1.5 ${
                  lineStyle === 'solid'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span className="font-mono font-black">──</span> Nét liền
              </button>

              <button
                onClick={() => setLineStyle('dashed')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer border flex items-center justify-center gap-1.5 ${
                  lineStyle === 'dashed'
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs ring-1 ring-teal-400'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span className="font-mono font-black">┅┅</span> Nét đứt (khuất)
              </button>
            </div>

            {/* Thao tác nhanh cho đoạn thẳng đang chọn */}
            {selectedSegmentId && (
              <div className="p-2 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 text-xs flex items-center justify-between gap-2 mt-1">
                <span className="text-[11px] font-bold text-teal-800 dark:text-teal-200 truncate">
                  Đoạn chọn: {segments.find(s => s.id === selectedSegmentId)?.style === 'dashed' ? 'Nét đứt' : 'Nét liền'}
                </span>
                <button
                  onClick={() => {
                    saveSnapshot();
                    setSegments(segs => segs.map(s => {
                      if (s.id === selectedSegmentId) {
                        const newStyle = s.style === 'dashed' ? 'solid' : 'dashed';
                        showNotice(`Đã đổi sang ${newStyle === 'dashed' ? 'nét đứt' : 'nét liền'}`);
                        return { ...s, style: newStyle };
                      }
                      return s;
                    }));
                  }}
                  className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer shrink-0"
                >
                  Đổi nét ⇄
                </button>
              </div>
            )}
          </div>

          {/* CHỌN MÀU SẮC */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Màu mực:
            </span>
            <div className="flex items-center gap-2">
              {[
                { color: '#000000', label: 'Đen SGK' },
                { color: '#2563eb', label: 'Xanh dương' },
                { color: '#dc2626', label: 'Đỏ' },
                { color: '#16a34a', label: 'Xanh lá' },
              ].map(c => (
                <button
                  key={c.color}
                  onClick={() => setActiveColor(c.color)}
                  style={{ backgroundColor: c.color }}
                  className={`w-6 h-6 rounded-full transition cursor-pointer ${
                    activeColor === c.color ? 'ring-2 ring-offset-2 ring-teal-500 scale-110 shadow-xs' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* THƯ VIỆN MẪU HÌNH DỰNG SẴN NHANH */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={12} className="text-amber-500" />
              Mẫu hình dựng sẵn (1-click):
            </span>
            <div className="grid grid-cols-1 gap-1 text-xs">
              <button
                onClick={() => loadPreset('cone')}
                className="p-1.5 rounded-lg text-left bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-800 dark:text-teal-200 font-bold transition cursor-pointer text-[11px] flex items-center justify-between"
              >
                <span>🍦 Hình nón (đáy elip đứt-liền)</span>
                <span className="text-[9px] bg-teal-200 dark:bg-teal-900 px-1 rounded">SGK</span>
              </button>
              <button
                onClick={() => loadPreset('cylinder')}
                className="p-1.5 rounded-lg text-left bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-800 dark:text-teal-200 font-bold transition cursor-pointer text-[11px] flex items-center justify-between"
              >
                <span>🥫 Hình trụ tròn xoay (2 đáy elip)</span>
                <span className="text-[9px] bg-teal-200 dark:bg-teal-900 px-1 rounded">SGK</span>
              </button>
              <button
                onClick={() => loadPreset('pyramid_regular_tri')}
                className="p-1.5 rounded-lg text-left bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-900 dark:text-indigo-200 font-bold transition cursor-pointer text-[11px] flex items-center justify-between"
              >
                <span>⛺ Chóp tam giác đều S.ABC</span>
                <span className="text-[9px] bg-indigo-200 dark:bg-indigo-900 px-1 rounded">SG ⊥ đáy</span>
              </button>
              <button
                onClick={() => loadPreset('pyramid_regular_quad')}
                className="p-1.5 rounded-lg text-left bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-900 dark:text-indigo-200 font-bold transition cursor-pointer text-[11px] flex items-center justify-between"
              >
                <span>⛺ Chóp tứ giác đều S.ABCD</span>
                <span className="text-[9px] bg-indigo-200 dark:bg-indigo-900 px-1 rounded">SO ⊥ đáy</span>
              </button>
              <button
                onClick={() => loadPreset('chop_sa_vuong_day')}
                className="p-1.5 rounded-lg text-left bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-900 dark:text-indigo-200 font-bold transition cursor-pointer text-[11px] flex items-center justify-between"
              >
                <span>⛺ Chóp S.ABCD (SA ⊥ đáy)</span>
                <span className="text-[9px] bg-indigo-200 dark:bg-indigo-900 px-1 rounded">SA ⊥</span>
              </button>
              <button
                onClick={() => loadPreset('chop_tam_giac')}
                className="p-1.5 rounded-lg text-left bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-900 dark:text-indigo-200 font-bold transition cursor-pointer text-[11px] flex items-center justify-between"
              >
                <span>⛺ Chóp tam giác (SH ⊥ đáy)</span>
                <span className="text-[9px] bg-indigo-200 dark:bg-indigo-900 px-1 rounded">SH ⊥</span>
              </button>
              <button
                onClick={() => loadPreset('box_abcd')}
                className="p-1.5 rounded-lg text-left bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 hover:text-teal-700 font-medium transition cursor-pointer text-[11px]"
              >
                📦 Hình hộp chữ nhật ABCD.A'B'C'D'
              </button>
              <button
                onClick={() => loadPreset('lang_tru_tam_giac')}
                className="p-1.5 rounded-lg text-left bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 hover:text-teal-700 font-medium transition cursor-pointer text-[11px]"
              >
                📦 Lăng trụ tam giác ABC.A'B'C'
              </button>
              <button
                onClick={() => loadPreset('bat_dien_deu')}
                className="p-1.5 rounded-lg text-left bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 hover:text-teal-700 font-medium transition cursor-pointer text-[11px]"
              >
                💎 Bát diện đều (khối 8 mặt)
              </button>
              <button
                onClick={() => loadPreset('hinh_cau')}
                className="p-1.5 rounded-lg text-left bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-800 dark:text-teal-200 font-bold transition cursor-pointer text-[11px]"
              >
                ⚽ Hình cầu (Bán kính R & elip)
              </button>
              <button
                onClick={() => loadPreset('parallelogram')}
                className="p-1.5 rounded-lg text-left bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 font-bold transition cursor-pointer text-[11px] flex items-center justify-between"
              >
                <span>▱ Hình bình hành ABCD</span>
                <span className="text-[9px] bg-amber-200 dark:bg-amber-900 px-1 rounded">Phẳng</span>
              </button>
              <button
                onClick={() => loadPreset('ellipse_base')}
                className="p-1.5 rounded-lg text-left bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 hover:text-teal-700 font-medium transition cursor-pointer text-[11px]"
              >
                ⬭ Đáy Elip (nửa đứt - nửa liền)
              </button>
              <button
                onClick={() => loadPreset('tam_giac_vuong_cao')}
                className="p-1.5 rounded-lg text-left bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 hover:text-teal-700 font-medium transition cursor-pointer text-[11px]"
              >
                📐 Tam giác vuông (đường cao AH)
              </button>
              <button
                onClick={() => loadPreset('triangle_right')}
                className="p-1.5 rounded-lg text-left bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 hover:text-teal-700 font-medium transition cursor-pointer text-[11px]"
              >
                📐 Tam giác vuông tại A
              </button>
              <button
                onClick={() => loadPreset('triangle_equi')}
                className="p-1.5 rounded-lg text-left bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 hover:text-teal-700 font-medium transition cursor-pointer text-[11px]"
              >
                📐 Tam giác đều ABC
              </button>

              {onOpenPresets && (
                <button
                  onClick={onOpenPresets}
                  className="w-full mt-1.5 py-1.5 px-2 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <FolderKanban size={13} />
                  <span>Mở Thư viện 12+ mẫu SGK...</span>
                </button>
              )}
            </div>
          </div>

          {/* LƯU & MỞ FILE DỰ ÁN */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <button
              onClick={handleSaveJson}
              className="flex-1 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
              title="Lưu bản vẽ về máy để tái sử dụng"
            >
              <FileDown size={13} /> Lưu (.json)
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
              title="Mở bản vẽ đã lưu từ máy"
            >
              <FileUp size={13} /> Mở file
            </button>
            <input type="file" ref={fileInputRef} onChange={handleOpenJson} accept=".json" className="hidden" />
          </div>
        </div>

        {/* CỘT PHẢI: BẢNG VẼ CANVAS VÀ THANH CÔNG CỤ XUẤT ẢNH */}
        <div className={`${isSplitView ? 'w-full' : 'lg:col-span-9'} bg-white dark:bg-slate-900 p-4 rounded-2xl border border-teal-100 dark:border-slate-800 shadow-xs space-y-3`}>
          {/* THANH ĐIỀU KHIỂN TRÊN ĐẦU CANVAS */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
            {/* Lịch sử Hoàn tác (Undo/Redo) & Thao tác nhanh */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs border ${
                  history.length > 0
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-100 hover:border-amber-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed'
                }`}
                title="Hoàn tác thao tác vẽ vừa rồi (Ctrl + Z)"
              >
                <Undo2 size={15} className={history.length > 0 ? 'text-amber-600' : ''} />
                <span>Hoàn tác (Undo)</span>
                {history.length > 0 && (
                  <span className="text-[10px] bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 px-1.5 py-0.2 rounded-full font-extrabold">
                    {history.length}
                  </span>
                )}
              </button>

              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs border ${
                  redoStack.length > 0
                    ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 border-sky-300 dark:border-sky-700 hover:bg-sky-100 hover:border-sky-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed'
                }`}
                title="Làm lại thao tác vừa hoàn tác (Ctrl + Y hoặc Ctrl + Shift + Z)"
              >
                <Redo2 size={15} className={redoStack.length > 0 ? 'text-sky-600' : ''} />
                <span>Làm lại (Redo)</span>
              </button>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  showGrid ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 border border-teal-300 dark:border-teal-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                }`}
                title="Bật/tắt lưới tọa độ ô vuông để căn gióng"
              >
                <Grid size={14} />
                Lưới
              </button>

              <button
                onClick={() => {
                  const next = pointDisplayMode === 'all' ? 'labels_only' : pointDisplayMode === 'labels_only' ? 'hidden' : 'all';
                  setPointDisplayMode(next);
                  showNotice(
                    next === 'all'
                      ? 'Hiển thị điểm: Đầy đủ (chấm • và chữ)'
                      : next === 'labels_only'
                      ? 'Hiển thị điểm: Chỉ chữ nhãn (Ẩn chấm • - Chuẩn SGK)'
                      : 'Hiển thị điểm: Đã ẩn toàn bộ điểm'
                  );
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  pointDisplayMode !== 'all'
                    ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
                title="Chuyển chế độ hiển thị điểm: Đầy đủ -> Chỉ chữ (Ẩn chấm •) -> Ẩn toàn bộ"
              >
                {pointDisplayMode === 'all' ? <Eye size={14} /> : <EyeOff size={14} />}
                <span>{pointDisplayMode === 'all' ? 'Điểm: Đủ' : pointDisplayMode === 'labels_only' ? 'Ẩn chấm •' : 'Ẩn điểm'}</span>
              </button>

              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-red-50 hover:text-red-600 text-slate-600 transition cursor-pointer"
                title="Xóa trắng bảng vẽ"
              >
                <Trash2 size={14} />
                Làm sạch
              </button>
            </div>

            {/* NÚT XUẤT WORD, TẢI ẢNH 300 DPI VÀ MÔ HÌNH 3D XOAY 360 ĐỘ */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* NÚT VẼ BIỂU ĐỒ THỐNG KÊ (THCS & THPT) */}
              <button
                onClick={() => {
                  setEditingChart(null);
                  setShowChartModal(true);
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                title="Vẽ biểu đồ thống kê (Cột, Cột kép, Đoạn thẳng, Hình quạt tròn) và chèn vào hình vẽ"
              >
                <BarChart2 size={15} />
                <span>Vẽ biểu đồ</span>
              </button>

              {/* NÚT MÔ HÌNH 3D TƯƠNG TÁC XOAY 360 ĐỘ (CÓ PHÂN LOẠI NÉT THẤY/KHUẤT) */}
              <button
                onClick={() => setShow3DViewerModal(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-teal-600 via-emerald-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                title="Mô hình 3D tương tác xoay 360 độ cho hình vừa vẽ (Tự động phân loại nét thấy và nét khuất chuẩn SGK)"
              >
                <Box size={15} />
                <span>Mô hình 3D xoay 360°</span>
              </button>

              {onInsertImage && (
                <button
                  onClick={() => {
                    const offscreen = renderToOffscreenCanvas(3);
                    onInsertImage(offscreen.toDataURL('image/png'));
                  }}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                  title="Chèn hình vẽ 300 DPI này trực tiếp vào đề thi"
                >
                  <CheckCircle2 size={15} />
                  <span>Chèn vào đề thi</span>
                </button>
              )}

              <button
                onClick={handleCopyImage}
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                title="Sao chép toàn bộ ảnh độ nét cao 300 DPI trực tiếp vào Clipboard để dán (Ctrl+V) vào Word"
              >
                <Copy size={14} />
                <span>Copy ảnh (Dán Word)</span>
              </button>


              <button
                onClick={handleDownloadPng}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Tải ảnh PNG chuẩn in ấn 300 DPI"
              >
                <Download size={14} />
                <span>PNG (300 DPI)</span>
              </button>
            </div>
          </div>

          {/* BANNER THÔNG BÁO TRẠNG THÁI KHI ĐANG CHỌN CÔNG CỤ ĐIỂM TRÊN CẠNH */}
          {activeTool === 'point_on_segment' && (
            <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-800 rounded-xl p-2.5 px-3.5 text-xs flex items-center justify-between text-teal-800 dark:text-teal-200 shadow-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm bg-teal-200 dark:bg-teal-900 px-2 py-0.5 rounded">⚬―</span>
                <span>
                  <b>Chế độ Lấy điểm trên cạnh:</b> Rê chuột lên cạnh bất kỳ và nhấp để gắn điểm phụ thuộc. Điểm sẽ trượt dọc theo cạnh khi kéo thả.
                </span>
              </div>
              <button
                onClick={() => { setActiveTool('select'); }}
                className="px-2.5 py-1 bg-teal-200 hover:bg-teal-300 dark:bg-teal-800 text-teal-900 dark:text-teal-100 rounded-lg font-bold text-[11px] transition cursor-pointer shrink-0"
              >
                Xong / Thoát
              </button>
            </div>
          )}

          {/* BANNER THÔNG BÁO TRẠNG THÁI KHI ĐANG CHỌN CÔNG CỤ GÓC VUÔNG */}
          {activeTool === 'right_angle' && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl p-2.5 px-3.5 text-xs flex items-center justify-between text-amber-800 dark:text-amber-200 shadow-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm bg-amber-200 dark:bg-amber-900 px-2 py-0.5 rounded">∟</span>
                <span>
                  <b>Chế độ Đánh dấu góc vuông:</b> Nhấp <b>1 chạm vào đỉnh góc</b> (nối 2 cạnh), hoặc nhấp <b>2 đoạn thẳng giao nhau</b>, hoặc nhấp <b>3 điểm</b> (Cạnh 1 → Đỉnh → Cạnh 2). Nhấp lại vào góc vuông để xóa.
                </span>
              </div>
              <button
                onClick={() => { setActiveTool('select'); setAngleVertices([]); setAngleFirstSegmentId(null); }}
                className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-lg font-bold text-[11px] transition cursor-pointer shrink-0"
              >
                Xong / Thoát
              </button>
            </div>
          )}

          {/* BANNER THÔNG BÁO TRẠNG THÁI KHI ĐANG CHỌN CÔNG CỤ VECTƠ */}
          {activeTool === 'vector' && (
            <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-800 rounded-xl p-2.5 px-3.5 text-xs flex items-center justify-between text-teal-800 dark:text-teal-200 shadow-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm bg-teal-200 dark:bg-teal-900 px-2 py-0.5 rounded">→</span>
                <span>
                  <b>Chế độ Vẽ Vectơ:</b> Nhấp <b>Điểm gốc</b>, sau đó nhấp <b>Điểm ngọn</b> để vẽ vectơ có mũi tên định hướng.
                </span>
              </div>
              <button
                onClick={() => { setActiveTool('select'); setDrawingStartPointId(null); }}
                className="px-2.5 py-1 bg-teal-200 hover:bg-teal-300 dark:bg-teal-800 text-teal-900 dark:text-teal-100 rounded-lg font-bold text-[11px] transition cursor-pointer shrink-0"
              >
                Xong / Thoát
              </button>
            </div>
          )}

          {/* BANNER THÔNG BÁO TRẠNG THÁI KHI ĐANG CHỌN CÔNG CỤ ELIP */}
          {activeTool === 'ellipse' && (
            <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-800 rounded-xl p-2.5 px-3.5 text-xs flex items-center justify-between text-teal-800 dark:text-teal-200 shadow-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm bg-teal-200 dark:bg-teal-900 px-2 py-0.5 rounded">⬭</span>
                <span>
                  <b>Chế độ Vẽ Hình Elip:</b> Nhấp chọn <b>Tâm O</b>, sau đó di chuột và nhấp để định <b>Bán kính</b>. Mặc định nửa trên nét đứt, nửa dưới nét liền để vẽ hình nón, hình trụ chuẩn SGK.
                </span>
              </div>
              <button
                onClick={() => { setActiveTool('select'); setDrawingStartPointId(null); }}
                className="px-2.5 py-1 bg-teal-200 hover:bg-teal-300 dark:bg-teal-800 text-teal-900 dark:text-teal-100 rounded-lg font-bold text-[11px] transition cursor-pointer shrink-0"
              >
                Xong / Thoát
              </button>
            </div>
          )}

          {/* KHUNG BẢNG VẼ CANVAS TƯƠNG TÁC */}
          <div className="space-y-2">
            <div className="relative w-full flex items-center justify-center p-2 bg-slate-50/70 dark:bg-slate-950/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 overflow-x-auto select-none">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onDoubleClick={handleDoubleClick}
                onContextMenu={handleContextMenu}
                style={{ cursor: getCanvasCursor() }}
                className="max-w-full h-auto bg-white rounded-lg shadow-xs border border-slate-200 touch-none"
              />
            </div>
            {/* HƯỚNG DẪN TƯƠNG TÁC NHANH VÀ DỜI TEXT */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-teal-500"></span>
                <b>Dời text nhãn đỉnh:</b> Bấm giữ chuột vào chữ tên đỉnh (<i>S, A, B, C, D, O, M, N...</i>) để kéo dời tự do tránh đè nét cạnh.
              </span>
              <span className="flex items-center gap-2 text-slate-400">
                <span>• Chuột phải để dời nhanh</span>
                <span>• Nhấp đúp vào điểm để tinh chỉnh 8 hướng</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MENU CHUỘT PHẢI (FLOATING CONTEXT MENU) */}
      {contextMenu.isOpen && (
        <div
          id="gsp-context-menu"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 250),
            top: Math.min(contextMenu.y, window.innerHeight - 350)
          }}
          className="fixed z-50 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 w-60 text-xs text-slate-700 dark:text-slate-200 space-y-0.5 animate-scale-in select-none"
        >
          {/* TIÊU ĐỀ MENU TÙY THEO ĐỐI TƯỢNG */}
          <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-teal-700 dark:text-teal-400 flex items-center gap-1.5 truncate">
              {contextMenu.targetType === 'segment' && (() => {
                const s = segments.find(seg => seg.id === contextMenu.targetId);
                const p1 = points.find(p => p.id === s?.p1Id)?.label || '';
                const p2 = points.find(p => p.id === s?.p2Id)?.label || '';
                return s?.isVector ? `Vectơ ${p1}${p2} (→)` : `Đoạn thẳng ${p1}${p2}`;
              })()}
              {contextMenu.targetType === 'point' && (() => {
                const p = points.find(pt => pt.id === contextMenu.targetId);
                return `Điểm ${p?.label || ''} ${p?.type === 'on_segment' ? '(trên cạnh)' : ''}`;
              })()}
              {contextMenu.targetType === 'ellipse' && 'Hình Elip (Đáy SGK)'}
              {contextMenu.targetType === 'right_angle' && 'Ký hiệu Góc vuông'}
              {contextMenu.targetType === 'text' && 'Chữ chú thích'}
              {contextMenu.targetType === 'canvas' && 'Thao tác bảng vẽ'}
            </span>
            <button
              onClick={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer rounded"
            >
              <X size={13} />
            </button>
          </div>

          {/* CÁC TÙY CHỌN CHO ĐOẠN THẲNG & VECTƠ */}
          {contextMenu.targetType === 'segment' && (() => {
            const seg = segments.find(s => s.id === contextMenu.targetId);
            if (!seg) return null;
            const p1 = points.find(p => p.id === seg.p1Id);
            const p2 = points.find(p => p.id === seg.p2Id);

            return (
              <div className="space-y-0.5">
                {/* 1. Đổi nét đứt / liền */}
                <button
                  onClick={() => {
                    saveSnapshot();
                    const newStyle = seg.style === 'dashed' ? 'solid' : 'dashed';
                    setSegments(prev => prev.map(s => s.id === seg.id ? { ...s, style: newStyle } : s));
                    setContextMenu(prev => ({ ...prev, isOpen: false }));
                    showNotice(`Đã chuyển sang ${newStyle === 'dashed' ? 'nét đứt (khuất)' : 'nét liền'}`);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Minus size={14} className={seg.style === 'dashed' ? 'stroke-dashed' : ''} />
                    {seg.style === 'dashed' ? 'Chuyển thành Nét liền' : 'Chuyển thành Nét đứt (khuất)'}
                  </span>
                  <span className="text-[10px] opacity-60">{seg.style === 'dashed' ? 'Liền' : 'Đứt'}</span>
                </button>

                {/* 2. Chuyển thành Vectơ hoặc Đoạn thường */}
                <button
                  onClick={() => {
                    saveSnapshot();
                    const nextIsVector = !seg.isVector;
                    setSegments(prev => prev.map(s => s.id === seg.id ? { ...s, isVector: nextIsVector, vectorEnd: 'p2' } : s));
                    setContextMenu(prev => ({ ...prev, isOpen: false }));
                    showNotice(nextIsVector ? 'Đã chuyển thành Vectơ có mũi tên' : 'Đã chuyển về đoạn thẳng thông thường');
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer font-medium"
                >
                  <span className="flex items-center gap-2">
                    <ArrowRight size={14} className="text-teal-600" />
                    {seg.isVector ? 'Bỏ mũi tên (về Đoạn thẳng)' : 'Biến thành Vectơ (mũi tên →)'}
                  </span>
                </button>

                {/* 3. Đảo chiều mũi tên vectơ (nếu là vectơ) */}
                {seg.isVector && (
                  <button
                    onClick={() => {
                      saveSnapshot();
                      const nextEnd = seg.vectorEnd === 'p1' ? 'p2' : 'p1';
                      setSegments(prev => prev.map(s => s.id === seg.id ? { ...s, vectorEnd: nextEnd } : s));
                      setContextMenu(prev => ({ ...prev, isOpen: false }));
                      showNotice('Đã đảo chiều mũi tên vectơ');
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <ArrowLeftRight size={14} className="text-teal-600" />
                      Đảo chiều mũi tên (← / →)
                    </span>
                  </button>
                )}

                {/* 4. Lấy trung điểm trên đoạn này */}
                <button
                  onClick={() => {
                    saveSnapshot();
                    if (p1 && p2) {
                      const midX = Math.round((p1.x + p2.x) / 2);
                      const midY = Math.round((p1.y + p2.y) / 2);
                      const newPt: GspPoint = {
                        id: 'pt_' + Date.now(),
                        x: midX,
                        y: midY,
                        label: getNextLabel(points),
                        color: activeColor,
                        type: 'midpoint',
                        parentIds: [p1.id, p2.id]
                      };
                      setPoints(prev => [...prev, newPt]);
                      setSelectedPointId(newPt.id);
                      showNotice(`Đã tạo trung điểm ${newPt.label} của đoạn ${p1.label}${p2.label}`);
                    }
                    setContextMenu(prev => ({ ...prev, isOpen: false }));
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer font-medium"
                >
                  <span className="flex items-center gap-2">
                    <CircleDot size={14} className="text-amber-500" />
                    Lấy trung điểm trên đoạn này
                  </span>
                </button>

                {/* 5. Đổi màu đoạn thẳng */}
                <div className="px-2.5 py-1.5 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">Đổi màu nét:</span>
                  <div className="flex gap-2 items-center">
                    {['#000000', '#dc2626', '#2563eb', '#16a34a', '#ea580c'].map(col => (
                      <button
                        key={col}
                        onClick={() => {
                          saveSnapshot();
                          setSegments(prev => prev.map(s => s.id === seg.id ? { ...s, color: col } : s));
                          setContextMenu(prev => ({ ...prev, isOpen: false }));
                        }}
                        style={{ backgroundColor: col }}
                        className={`w-5 h-5 rounded-full cursor-pointer transition ${seg.color === col ? 'ring-2 ring-teal-500 scale-110' : 'opacity-80 hover:opacity-100'}`}
                      />
                    ))}
                  </div>
                </div>

                {/* 6. Xóa đoạn thẳng */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                  <button
                    onClick={() => {
                      saveSnapshot();
                      setSegments(prev => prev.filter(s => s.id !== seg.id));
                      setContextMenu(prev => ({ ...prev, isOpen: false }));
                      showNotice('Đã xóa đoạn thẳng');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-50 text-red-600 dark:hover:bg-red-950/40 dark:text-red-400 font-bold transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                    Xóa đoạn thẳng / vectơ
                  </button>
                </div>
              </div>
            );
          })()}

          {/* CÁC TÙY CHỌN CHO ĐIỂM */}
          {contextMenu.targetType === 'point' && (() => {
            const pt = points.find(p => p.id === contextMenu.targetId);
            if (!pt) return null;

            return (
              <div className="space-y-0.5">
                {/* 1. Đổi tên đỉnh / sửa điểm */}
                <button
                  onClick={() => {
                    setEditingPoint(pt);
                    setNewLabelInput(pt.label);
                    setEditingPointHideDot(!!pt.hideDot);
                    setEditingPointHideLabel(!!pt.hideLabel);
                    setEditingPointRatio(pt.ratio ?? 0.5);
                    setEditingPointLabelOffsetX(pt.labelOffsetX ?? 9);
                    setEditingPointLabelOffsetY(pt.labelOffsetY ?? -8);
                    setContextMenu(prev => ({ ...prev, isOpen: false }));
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer font-medium"
                >
                  <Edit3 size={14} className="text-teal-600" />
                  Đổi tên / Vị trí nhãn đỉnh ({pt.label})
                </button>

                {/* 2. Đổi nhanh vị trí nhãn đỉnh (Dời text) */}
                <div className="px-2 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
                    <span>Dời nhãn ({pt.label}):</span>
                    <span className="text-[9px] text-teal-600 font-bold">Kéo rê trên hình</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { label: '↖ Trên', ox: -18, oy: -14 },
                      { label: '↗ Phải', ox: 12, oy: -12 },
                      { label: '↙ Trái', ox: -22, oy: 16 },
                      { label: '↘ Dưới', ox: 12, oy: 16 },
                      { label: '• Gốc', ox: 9, oy: -8 },
                    ].map(dir => (
                      <button
                        key={dir.label}
                        type="button"
                        onClick={() => {
                          saveSnapshot();
                          setPoints(prev => prev.map(p => p.id === pt.id ? { ...p, labelOffsetX: dir.ox, labelOffsetY: dir.oy } : p));
                          setContextMenu(prev => ({ ...prev, isOpen: false }));
                          showNotice(`Đã dời nhãn ${pt.label} (${dir.label})`);
                        }}
                        className="py-1 text-[9px] font-bold bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-teal-900/40 rounded border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 cursor-pointer text-center"
                      >
                        {dir.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Ẩn / Hiện chấm tròn đen (dot •) */}
                <button
                  onClick={() => {
                    saveSnapshot();
                    const nextHideDot = !pt.hideDot;
                    setPoints(prev => prev.map(p => p.id === pt.id ? { ...p, hideDot: nextHideDot } : p));
                    setContextMenu(prev => ({ ...prev, isOpen: false }));
                    showNotice(nextHideDot ? `Đã ẩn chấm tròn của đỉnh ${pt.label}` : `Đã hiện chấm tròn của đỉnh ${pt.label}`);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer font-medium"
                >
                  <span className="flex items-center gap-2">
                    {pt.hideDot ? <Eye size={14} className="text-teal-600" /> : <EyeOff size={14} className="text-amber-500" />}
                    {pt.hideDot ? 'Hiện chấm tròn (•)' : 'Ẩn chấm tròn (•)'}
                  </span>
                  <span className="text-[10px] opacity-60">{pt.hideDot ? 'Đang ẩn' : 'Đang hiện'}</span>
                </button>

                {/* 4. Ẩn / Hiện nhãn chữ tên đỉnh */}
                <button
                  onClick={() => {
                    saveSnapshot();
                    const nextHideLabel = !pt.hideLabel;
                    setPoints(prev => prev.map(p => p.id === pt.id ? { ...p, hideLabel: nextHideLabel } : p));
                    setContextMenu(prev => ({ ...prev, isOpen: false }));
                    showNotice(nextHideLabel ? `Đã ẩn chữ ${pt.label}` : `Đã hiện chữ ${pt.label}`);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Type size={14} />
                    {pt.hideLabel ? `Hiện tên đỉnh (${pt.label})` : `Ẩn tên đỉnh (${pt.label})`}
                  </span>
                </button>

                {/* 5. Ẩn toàn bộ điểm này */}
                <button
                  onClick={() => {
                    saveSnapshot();
                    const nextHidden = !pt.hidden;
                    setPoints(prev => prev.map(p => p.id === pt.id ? { ...p, hidden: nextHidden } : p));
                    setContextMenu(prev => ({ ...prev, isOpen: false }));
                    showNotice(nextHidden ? `Đã ẩn hoàn toàn điểm ${pt.label}` : `Đã hiện lại điểm ${pt.label}`);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer font-medium"
                >
                  <span className="flex items-center gap-2">
                    <EyeOff size={14} />
                    {pt.hidden ? 'Bỏ ẩn toàn bộ điểm này' : 'Ẩn toàn bộ điểm này'}
                  </span>
                </button>

                {/* 5. Xóa điểm */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                  <button
                    onClick={() => {
                      saveSnapshot();
                      setPoints(pts => pts.filter(p => p.id !== pt.id));
                      setSegments(segs => segs.filter(s => s.p1Id !== pt.id && s.p2Id !== pt.id));
                      setCircles(circs => circs.filter(c => c.centerId !== pt.id && c.radiusPointId !== pt.id));
                      setEllipses(els => els.filter(e => e.centerId !== pt.id && e.rxPointId !== pt.id));
                      setRightAngles(ras => ras.filter(r => r.vertexId !== pt.id && r.p1Id !== pt.id && r.p2Id !== pt.id));
                      setContextMenu(prev => ({ ...prev, isOpen: false }));
                      showNotice(`Đã xóa điểm ${pt.label}`);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-50 text-red-600 dark:hover:bg-red-950/40 dark:text-red-400 font-bold transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                    Xóa điểm {pt.label}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* CÁC TÙY CHỌN CHO HÌNH ELIP */}
          {contextMenu.targetType === 'ellipse' && (() => {
            const el = ellipses.find(e => e.id === contextMenu.targetId);
            if (!el) return null;

            return (
              <div className="space-y-0.5">
                <button
                  onClick={() => {
                    saveSnapshot();
                    setEllipses(prev => prev.map(e => e.id === el.id ? { ...e, style: 'half_dashed' } : e));
                    setContextMenu(prev => ({ ...prev, isOpen: false }));
                    showNotice('Đã đổi elip: Nửa đứt - Nửa liền (Đáy nón/trụ SGK)');
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-slate-800 transition cursor-pointer font-medium ${el.style === 'half_dashed' ? 'bg-teal-50 text-teal-700 font-bold' : ''}`}
                >
                  <span>⬭ Nửa đứt - Nửa liền</span>
                  <span className="text-[10px] opacity-60">SGK</span>
                </button>
                <button
                  onClick={() => {
                    saveSnapshot();
                    setEllipses(prev => prev.map(e => e.id === el.id ? { ...e, style: 'solid' } : e));
                    setContextMenu(prev => ({ ...prev, isOpen: false }));
                    showNotice('Đã đổi elip: Nét liền toàn bộ');
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-slate-800 transition cursor-pointer font-medium ${el.style === 'solid' ? 'bg-teal-50 text-teal-700 font-bold' : ''}`}
                >
                  <span>⬭ Nét liền toàn bộ</span>
                </button>
                <button
                  onClick={() => {
                    saveSnapshot();
                    setEllipses(prev => prev.map(e => e.id === el.id ? { ...e, style: 'dashed' } : e));
                    setContextMenu(prev => ({ ...prev, isOpen: false }));
                    showNotice('Đã đổi elip: Nét đứt toàn bộ');
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-slate-800 transition cursor-pointer font-medium ${el.style === 'dashed' ? 'bg-teal-50 text-teal-700 font-bold' : ''}`}
                >
                  <span>⬭ Nét đứt toàn bộ</span>
                </button>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                  <button
                    onClick={() => {
                      saveSnapshot();
                      setEllipses(prev => prev.filter(e => e.id !== el.id));
                      setContextMenu(prev => ({ ...prev, isOpen: false }));
                      showNotice('Đã xóa hình elip');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-50 text-red-600 dark:hover:bg-red-950/40 dark:text-red-400 font-bold transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                    Xóa hình elip
                  </button>
                </div>
              </div>
            );
          })()}

          {/* CÁC TÙY CHỌN CHO GÓC VUÔNG */}
          {contextMenu.targetType === 'right_angle' && (() => {
            const ra = rightAngles.find(r => r.id === contextMenu.targetId);
            if (!ra) return null;

            return (
              <div className="space-y-0.5">
                <button
                  onClick={() => {
                    saveSnapshot();
                    setRightAngles(prev => prev.map(r => r.id === ra.id ? { ...r, hasDot: !r.hasDot } : r));
                    setContextMenu(prev => ({ ...prev, isOpen: false }));
                    showNotice(ra.hasDot ? 'Đã bỏ dấu chấm tâm góc vuông' : 'Đã thêm dấu chấm tâm góc vuông');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer font-medium"
                >
                  <CircleDot size={14} />
                  {ra.hasDot ? 'Bỏ chấm ở giữa' : 'Thêm chấm ở giữa'}
                </button>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                  <button
                    onClick={() => {
                      saveSnapshot();
                      setRightAngles(prev => prev.filter(r => r.id !== ra.id));
                      setContextMenu(prev => ({ ...prev, isOpen: false }));
                      showNotice('Đã xóa ký hiệu góc vuông');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-50 text-red-600 dark:hover:bg-red-950/40 dark:text-red-400 font-bold transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                    Xóa ký hiệu góc vuông
                  </button>
                </div>
              </div>
            );
          })()}

          {/* CÁC TÙY CHỌN CHO TEXT CHÚ THÍCH */}
          {contextMenu.targetType === 'text' && (() => {
            const txt = texts.find(t => t.id === contextMenu.targetId);
            if (!txt) return null;

            return (
              <div className="space-y-0.5">
                <button
                  onClick={() => {
                    setEditingText(txt);
                    setTextContentInput(txt.content);
                    setTextFontSize(txt.fontSize || 16);
                    setTextIsItalic(txt.isItalic !== false);
                    setTextIsBold(!!txt.isBold);
                    setTextColor(txt.color || '#000000');
                    setIsAddingText(false);
                    setContextMenu(prev => ({ ...prev, isOpen: false }));
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer font-medium"
                >
                  <Edit3 size={14} className="text-teal-600" />
                  Chỉnh sửa chữ "{txt.content}"
                </button>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                  <button
                    onClick={() => {
                      saveSnapshot();
                      setTexts(prev => prev.filter(t => t.id !== txt.id));
                      setContextMenu(prev => ({ ...prev, isOpen: false }));
                      showNotice(`Đã xóa chữ "${txt.content}"`);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-50 text-red-600 dark:hover:bg-red-950/40 dark:text-red-400 font-bold transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                    Xóa chữ
                  </button>
                </div>
              </div>
            );
          })()}

          {/* CÁC TÙY CHỌN CHO CANVAS (VÙNG TRỐNG) */}
          {contextMenu.targetType === 'canvas' && (
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  saveSnapshot();
                  const newPt = createPoint(contextMenu.canvasX, contextMenu.canvasY);
                  setPoints(prev => [...prev, newPt]);
                  setSelectedPointId(newPt.id);
                  setContextMenu(prev => ({ ...prev, isOpen: false }));
                  showNotice(`Đã tạo điểm ${newPt.label}`);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer font-medium"
              >
                <CircleDot size={14} className="text-teal-600" />
                Chấm điểm tại đây
              </button>

              <button
                onClick={() => {
                  setTextPos({ x: contextMenu.canvasX, y: contextMenu.canvasY });
                  setEditingText(null);
                  setTextContentInput('');
                  setTextFontSize(16);
                  setTextIsItalic(true);
                  setTextIsBold(false);
                  setTextColor(activeColor);
                  setIsAddingText(true);
                  setContextMenu(prev => ({ ...prev, isOpen: false }));
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer font-medium"
              >
                <Type size={14} className="text-teal-600" />
                Thêm chữ chú thích tại đây
              </button>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                <button
                  onClick={() => {
                    handleUndo();
                    setContextMenu(prev => ({ ...prev, isOpen: false }));
                  }}
                  disabled={history.length === 0}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 transition cursor-pointer font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Undo2 size={14} />
                    Hoàn tác
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+Z</span>
                </button>
                <button
                  onClick={() => {
                    handleRedo();
                    setContextMenu(prev => ({ ...prev, isOpen: false }));
                  }}
                  disabled={redoStack.length === 0}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 transition cursor-pointer font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Redo2 size={14} />
                    Làm lại
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+Y</span>
                </button>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                <button
                  onClick={() => {
                    setShowGrid(!showGrid);
                    setContextMenu(prev => ({ ...prev, isOpen: false }));
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Grid size={14} />
                    {showGrid ? 'Ẩn lưới ô vuông' : 'Hiện lưới ô vuông'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    const next = pointDisplayMode === 'all' ? 'labels_only' : pointDisplayMode === 'labels_only' ? 'hidden' : 'all';
                    setPointDisplayMode(next);
                    setContextMenu(prev => ({ ...prev, isOpen: false }));
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer font-medium"
                >
                  <span className="flex items-center gap-2">
                    {pointDisplayMode === 'all' ? <EyeOff size={14} /> : <Eye size={14} />}
                    Ẩn/Hiện điểm ({pointDisplayMode === 'all' ? 'Hiện đủ' : pointDisplayMode === 'labels_only' ? 'Chỉ nhãn' : 'Ẩn hết'})
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* POPUP ĐỔI TÊN ĐIỂM KHI NHẤP ĐÚP CHUỘT VÀO ĐIỂM */}
      {editingPoint && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-teal-200 dark:border-slate-800 shadow-xl w-80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Edit3 size={15} className="text-teal-600" />
                Đổi tên điểm
              </span>
              <button onClick={() => setEditingPoint(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 block">
                Tên nhãn điểm mới:
              </label>
              <input
                type="text"
                autoFocus
                value={newLabelInput}
                onChange={e => setNewLabelInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    saveSnapshot();
                    setPoints(pts => {
                      const currentMap = new Map<string, GspPoint>(pts.map(p => [p.id, p]));
                      return pts.map(p => {
                        if (p.id === editingPoint.id) {
                          let updatedX = p.x;
                          let updatedY = p.y;
                          if (p.type === 'on_segment' && p.parentIds) {
                            const p1 = currentMap.get(p.parentIds[0]);
                            const p2 = currentMap.get(p.parentIds[1]);
                            if (p1 && p2) {
                              updatedX = Math.round(p1.x + editingPointRatio * (p2.x - p1.x));
                              updatedY = Math.round(p1.y + editingPointRatio * (p2.y - p1.y));
                            }
                          }
                          return {
                            ...p,
                            label: newLabelInput.trim() || p.label,
                            hideDot: editingPointHideDot,
                            hideLabel: editingPointHideLabel,
                            ratio: p.type === 'on_segment' ? editingPointRatio : p.ratio,
                            x: updatedX,
                            y: updatedY
                          };
                        }
                        return p;
                      });
                    });
                    setEditingPoint(null);
                    showNotice(`Đã cập nhật điểm ${newLabelInput.trim() || editingPoint.label}`);
                  } else if (e.key === 'Escape') {
                    setEditingPoint(null);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none focus:border-teal-500"
                placeholder="Ví dụ: S, H, M, O, A'..."
              />
            </div>

            {/* Các ký tự gợi ý nhanh */}
            <div className="flex flex-wrap gap-1">
              {['S', 'H', 'M', 'N', 'P', 'O', 'K', "A'", "B'", "C'"].map(k => (
                <button
                  key={k}
                  onClick={() => setNewLabelInput(k)}
                  className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 text-[10px] font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  {k}
                </button>
              ))}
            </div>

            {/* Tùy chỉnh vị trí tỉ lệ nếu điểm này phụ thuộc vào một cạnh */}
            {editingPoint.type === 'on_segment' && editingPoint.parentIds && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1">
                    <Dot size={18} className="text-teal-600 -ml-1 shrink-0" />
                    Cạnh {points.find(p => p.id === editingPoint.parentIds?.[0])?.label || ''}{points.find(p => p.id === editingPoint.parentIds?.[1])?.label || ''}
                  </span>
                  <span className="text-[11px] font-black text-teal-700 dark:text-teal-300">
                    Vị trí: {Math.round(editingPointRatio * 100)}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0.05"
                  max="0.95"
                  step="0.01"
                  value={editingPointRatio}
                  onChange={e => setEditingPointRatio(parseFloat(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />

                <div className="flex gap-1">
                  {[
                    { label: '1/3', val: 0.333 },
                    { label: '1/2 (Trung điểm)', val: 0.5 },
                    { label: '2/3', val: 0.667 },
                    { label: '1/4', val: 0.25 },
                    { label: '3/4', val: 0.75 }
                  ].map(item => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setEditingPointRatio(item.val)}
                      className={`flex-1 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                        Math.abs(editingPointRatio - item.val) < 0.02
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-teal-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tùy chỉnh vị trí nhãn chữ đỉnh (Dời text) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Vị trí nhãn chữ ({newLabelInput.trim() || editingPoint.label}):
                </span>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
                  {editingPointLabelOffsetX >= 0 ? `+${editingPointLabelOffsetX}` : editingPointLabelOffsetX}px, {editingPointLabelOffsetY >= 0 ? `+${editingPointLabelOffsetY}` : editingPointLabelOffsetY}px
                </span>
              </div>

              {/* Lưới 9 nút chọn hướng nhanh */}
              <div className="grid grid-cols-3 gap-1.5 w-48 mx-auto bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                {[
                  { label: '↖', ox: -22, oy: -14, title: 'Trên - Trái' },
                  { label: '⬆', ox: -6, oy: -14, title: 'Trên đỉnh' },
                  { label: '↗', ox: 12, oy: -14, title: 'Trên - Phải' },
                  { label: '⬅', ox: -24, oy: 4, title: 'Bên trái' },
                  { label: '•', ox: 9, oy: -8, title: 'Mặc định (Góc trên phải)' },
                  { label: '➡', ox: 14, oy: 4, title: 'Bên phải' },
                  { label: '↙', ox: -22, oy: 18, title: 'Dưới - Trái' },
                  { label: '⬇', ox: -6, oy: 20, title: 'Dưới đáy' },
                  { label: '↘', ox: 12, oy: 18, title: 'Dưới - Phải' },
                ].map(pos => {
                  const isCur = Math.abs(editingPointLabelOffsetX - pos.ox) <= 3 && Math.abs(editingPointLabelOffsetY - pos.oy) <= 3;
                  return (
                    <button
                      key={pos.title}
                      type="button"
                      title={pos.title}
                      onClick={() => {
                        setEditingPointLabelOffsetX(pos.ox);
                        setEditingPointLabelOffsetY(pos.oy);
                      }}
                      className={`h-7 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                        isCur
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-700 hover:bg-teal-50 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {pos.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500 text-center italic">
                Thầy Cô có thể bấm giữ trực tiếp vào chữ tên đỉnh trên hình để kéo dời tự do.
              </p>
            </div>

            {/* Tùy chọn ẩn hiện riêng điểm này */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Tùy chọn hiển thị:
              </span>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!editingPointHideDot}
                  onChange={e => setEditingPointHideDot(!e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Hiện chấm tròn đen (dot •)</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!editingPointHideLabel}
                  onChange={e => setEditingPointHideLabel(!e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Hiện chữ nhãn ({newLabelInput || editingPoint.label})</span>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setEditingPoint(null)}
                className="flex-1 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  saveSnapshot();
                  setPoints(pts => {
                    const currentMap = new Map<string, GspPoint>(pts.map(p => [p.id, p]));
                    return pts.map(p => {
                      if (p.id === editingPoint.id) {
                        let updatedX = p.x;
                        let updatedY = p.y;
                        if (p.type === 'on_segment' && p.parentIds) {
                          const p1 = currentMap.get(p.parentIds[0]);
                          const p2 = currentMap.get(p.parentIds[1]);
                          if (p1 && p2) {
                            updatedX = Math.round(p1.x + editingPointRatio * (p2.x - p1.x));
                            updatedY = Math.round(p1.y + editingPointRatio * (p2.y - p1.y));
                          }
                        }
                        return {
                          ...p,
                          label: newLabelInput.trim() || p.label,
                          hideDot: editingPointHideDot,
                          hideLabel: editingPointHideLabel,
                          ratio: p.type === 'on_segment' ? editingPointRatio : p.ratio,
                          labelOffsetX: editingPointLabelOffsetX,
                          labelOffsetY: editingPointLabelOffsetY,
                          x: updatedX,
                          y: updatedY
                        };
                      }
                      return p;
                    });
                  });
                  setEditingPoint(null);
                  showNotice(`Đã cập nhật điểm ${newLabelInput.trim() || editingPoint.label}`);
                }}
                className="flex-1 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer"
              >
                <Check size={14} />
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP THÊM / SỬA TEXT CHÚ THÍCH KHI NHẤP ĐÚP CHUỘT TRÁI VÀO HÌNH VẼ */}
      {(isAddingText || editingText) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-teal-200 dark:border-slate-800 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Type size={17} className="text-teal-600" />
                {editingText ? 'Chỉnh sửa chữ / Chú thích' : 'Thêm chữ / Chú thích vào hình vẽ'}
              </span>
              <button
                onClick={() => { setIsAddingText(false); setEditingText(null); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                Nội dung chữ / ký hiệu toán học:
              </label>
              <input
                type="text"
                autoFocus
                value={textContentInput}
                onChange={e => setTextContentInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleSaveText();
                  } else if (e.key === 'Escape') {
                    setIsAddingText(false);
                    setEditingText(null);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none focus:border-teal-500 text-slate-800 dark:text-slate-100"
                placeholder="Ví dụ: a, h, R, 60°, mp (P), α, x..."
              />
            </div>

            {/* Ký hiệu gợi ý nhanh */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Ký hiệu gợi ý 1-chạm:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'a', 'b', 'c', 'h', 'x', 'y', 'd',
                  'R', 'r', 'S', 'V',
                  '60°', '45°', '30°', '90°',
                  'α', 'β', 'φ', 'Δ',
                  '(P)', '(Q)', '(α)', '(β)'
                ].map(sym => (
                  <button
                    key={sym}
                    onClick={() => setTextContentInput(prev => prev ? `${prev} ${sym}` : sym)}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            {/* Tùy chọn định dạng: Cỡ chữ, Kiểu chữ */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Cỡ chữ:
                </span>
                <div className="flex items-center gap-1.5">
                  {[
                    { size: 13, label: 'Nhỏ' },
                    { size: 16, label: 'Chuẩn' },
                    { size: 20, label: 'Lớn' },
                    { size: 26, label: 'Đại' },
                  ].map(s => (
                    <button
                      key={s.size}
                      onClick={() => setTextFontSize(s.size)}
                      className={`flex-1 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                        textFontSize === s.size
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Kiểu dáng:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTextIsItalic(!textIsItalic)}
                    className={`flex-1 py-1 rounded-lg text-xs font-serif font-bold italic border transition cursor-pointer ${
                      textIsItalic
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    I (Nghiêng)
                  </button>
                  <button
                    onClick={() => setTextIsBold(!textIsBold)}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      textIsBold
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    B (Đậm)
                  </button>
                </div>
              </div>
            </div>

            {/* Màu mực */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Màu chữ:
              </span>
              <div className="flex items-center gap-2">
                {[
                  { color: '#000000', label: 'Đen SGK' },
                  { color: '#2563eb', label: 'Xanh dương' },
                  { color: '#dc2626', label: 'Đỏ' },
                  { color: '#16a34a', label: 'Xanh lá' },
                  { color: '#7c3aed', label: 'Tím' },
                ].map(c => (
                  <button
                    key={c.color}
                    onClick={() => setTextColor(c.color)}
                    style={{ backgroundColor: c.color }}
                    className={`w-5 h-5 rounded-full transition cursor-pointer ${
                      textColor === c.color ? 'ring-2 ring-offset-2 ring-teal-500 scale-110 shadow-xs' : 'opacity-80 hover:opacity-100'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Nút hành động */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {editingText && (
                <button
                  onClick={() => {
                    saveSnapshot();
                    setTexts(prev => prev.filter(t => t.id !== editingText.id));
                    setEditingText(null);
                    showNotice('Đã xóa chữ khỏi hình vẽ.');
                  }}
                  className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  title="Xóa chữ này"
                >
                  <Trash2 size={14} />
                  Xóa
                </button>
              )}
              <div className="flex-1" />
              <button
                onClick={() => { setIsAddingText(false); setEditingText(null); }}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveText}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Check size={15} />
                Lưu vào hình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MÔ HÌNH 3D TƯƠNG TÁC XOAY 360 ĐỘ TỰ ĐỘNG PHÂN LOẠI NÉT THẤY & KHUẤT */}
      <Gsp3DViewerModal
        isOpen={show3DViewerModal}
        onClose={() => setShow3DViewerModal(false)}
        points={points}
        segments={segments}
        ellipses={ellipses}
        presetType={currentPresetType}
        onOpenFull3DTab={onOpen3D}
      />

      {/* MODAL VẼ BIỂU ĐỒ THỐNG KÊ (THCS & THPT) */}
      {showChartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-fade-in">
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col">
            <ThcsStatisticalChart
              initialConfig={editingChart?.config}
              isModal={true}
              onCancel={() => {
                setShowChartModal(false);
                setEditingChart(null);
              }}
              onInsertToCanvas={(svgString, config) => {
                saveSnapshot();
                if (editingChart) {
                  setCharts(prev => prev.map(c => c.id === editingChart.id ? {
                    ...c,
                    svgString,
                    config
                  } : c));
                  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const img = new Image();
                  img.onload = () => {
                    chartImagesRef.current.set(editingChart.id, img);
                    setChartRenderTrigger(prev => prev + 1);
                  };
                  img.src = url;
                  showNotice('Đã cập nhật biểu đồ.');
                } else {
                  const newId = `chart_${Date.now()}`;
                  const newW = 440;
                  const newH = 280;
                  const newX = Math.round((LOGICAL_WIDTH - newW) / 2);
                  const newY = Math.round((LOGICAL_HEIGHT - newH) / 2);
                  const newChart: GspChartItem = {
                    id: newId,
                    x: newX,
                    y: newY,
                    width: newW,
                    height: newH,
                    svgString,
                    config
                  };
                  setCharts(prev => [...prev, newChart]);
                  setSelectedChartId(newId);
                  
                  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const img = new Image();
                  img.onload = () => {
                    chartImagesRef.current.set(newId, img);
                    setChartRenderTrigger(prev => prev + 1);
                  };
                  img.src = url;
                  showNotice('Đã chèn biểu đồ vào hình vẽ.');
                }
                setShowChartModal(false);
                setEditingChart(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Hàm tính khoảng cách từ điểm p tới đoạn thẳng nối p1 và p2
function distToSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
}

// Hàm chiếu điểm p lên đoạn thẳng ab, trả về tọa độ điểm chiếu, tỉ lệ t (0.02 - 0.98) và khoảng cách
function projectPointOnSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): { x: number; y: number; t: number; dist: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return { x: a.x, y: a.y, t: 0, dist: Math.hypot(p.x - a.x, p.y - a.y) };
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  // Giới hạn trong khoảng [0.02, 0.98] để điểm luôn trượt bên trong thân cạnh
  t = Math.max(0.02, Math.min(0.98, t));
  const projX = Math.round(a.x + t * dx);
  const projY = Math.round(a.y + t * dy);
  return { x: projX, y: projY, t, dist: Math.hypot(p.x - projX, p.y - projY) };
}
