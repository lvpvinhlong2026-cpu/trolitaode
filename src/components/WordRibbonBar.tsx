import React from 'react';
import { 
  FileCheck2, 
  Grid3X3, 
  Sparkles, 
  RefreshCw, 
  FileSignature, 
  TrendingUp, 
  Box, 
  BookOpen, 
  Brain, 
  Image as ImageIcon, 
  FlaskConical, 
  HelpCircle, 
  Settings, 
  Plus, 
  Trash2, 
  RotateCcw, 
  ChevronUp, 
  ChevronDown,
  Upload,
  Sun,
  Moon,
  GraduationCap
} from 'lucide-react';
import { ActiveTabType } from '../App';

export type MainRibbonCategory = 
  | 'khao_thi' 
  | 'bien_tap' 
  | 'do_thi' 
  | 'giang_day' 
  | 'tro_giup';

interface RibbonTool {
  id: ActiveTabType;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  description?: string;
}

interface RibbonGroup {
  groupTitle: string;
  tools: RibbonTool[];
}

interface WordRibbonBarProps {
  activeTab: ActiveTabType;
  onSelectTab: (tab: ActiveTabType) => void;
  isRibbonCollapsed: boolean;
  onToggleRibbon: () => void;
  // Standard Actions per hd_phuc:
  onAdd: () => void;
  onDelete: () => void;
  onReset: () => void;
  // Top bar quick actions:
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenBookUpload: () => void;
  apiKey: string;
  preferredModel: string;
}

export const WordRibbonBar: React.FC<WordRibbonBarProps> = ({
  activeTab,
  onSelectTab,
  isRibbonCollapsed,
  onToggleRibbon,
  onAdd,
  onDelete,
  onReset,
  isDark,
  onToggleTheme,
  onOpenSettings,
  onOpenBookUpload,
  apiKey,
  preferredModel
}) => {
  // Determine which ribbon category corresponds to the activeTab
  const getCategoryFromTab = (tab: ActiveTabType): MainRibbonCategory => {
    switch (tab) {
      case 'exam_full':
      case 'matrix_full':
      case 'cv7991':
      case 'similar':
        return 'khao_thi';
      case 'standardize':
      case 'correction':
        return 'bien_tap';
      case 'function_graph':
      case 'geometry':
        return 'do_thi';
      case 'lesson_plan':
      case 'mindmap':
      case 'illustration':
      case 'simulation':
        return 'giang_day';
      case 'guide':
      default:
        return 'tro_giup';
    }
  };

  const [activeCategory, setActiveCategory] = React.useState<MainRibbonCategory>(() =>
    getCategoryFromTab(activeTab)
  );

  React.useEffect(() => {
    setActiveCategory(getCategoryFromTab(activeTab));
  }, [activeTab]);

  // Ribbon Categories and their tools according to MS Word style
  const RIBBON_TABS: { id: MainRibbonCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'khao_thi', label: 'Khảo Thí & Tạo Đề', icon: <FileCheck2 size={15} /> },
    { id: 'bien_tap', label: 'Biên Tập & OCR', icon: <FileSignature size={15} /> },
    { id: 'do_thi', label: 'Hình Vẽ & Đồ Thị', icon: <TrendingUp size={15} /> },
    { id: 'giang_day', label: 'Giảng Dạy & Trực Quan', icon: <BookOpen size={15} /> },
    { id: 'tro_giup', label: 'Trợ Giúp', icon: <HelpCircle size={15} /> },
  ];

  const CATEGORY_GROUPS: Record<MainRibbonCategory, RibbonGroup[]> = {
    khao_thi: [
      {
        groupTitle: 'Đề Thi CV 7991',
        tools: [
          {
            id: 'exam_full',
            label: 'Đề Thi Chuẩn 4 Phần',
            icon: <FileCheck2 size={19} className="text-emerald-600 dark:text-emerald-400" />,
            badge: 'CV 7991'
          },
          {
            id: 'matrix_full',
            label: 'Ma Trận & Đặc Tả 10.0đ',
            icon: <Grid3X3 size={19} className="text-purple-600 dark:text-purple-400" />
          }
        ]
      },
      {
        groupTitle: 'Sinh Đề AI',
        tools: [
          {
            id: 'cv7991',
            label: 'Sinh Đề Theo Ma Trận',
            icon: <Sparkles size={19} className="text-teal-600 dark:text-teal-400" />
          },
          {
            id: 'similar',
            label: 'Nhân Bản Đề Tương Tự',
            icon: <RefreshCw size={19} className="text-blue-600 dark:text-blue-400" />
          }
        ]
      }
    ],
    bien_tap: [
      {
        groupTitle: 'Bóc Tách & Chuyển Đổi',
        tools: [
          {
            id: 'standardize',
            label: 'Bóc Tách OCR Sang LaTeX',
            icon: <FileSignature size={19} className="text-sky-600 dark:text-sky-400" />,
            badge: 'OCR AI'
          }
        ]
      },
      {
        groupTitle: 'Hiệu Đính',
        tools: [
          {
            id: 'correction',
            label: 'Sửa Lỗi Văn Bản & LaTeX',
            icon: <Sparkles size={19} className="text-amber-600 dark:text-amber-400" />
          }
        ]
      }
    ],
    do_thi: [
      {
        groupTitle: 'Giải Tích (300 DPI)',
        tools: [
          {
            id: 'function_graph',
            label: 'Bảng Biến Thiên & Đồ Thị Oxy',
            icon: <TrendingUp size={19} className="text-blue-600 dark:text-blue-400" />,
            badge: '300 DPI'
          }
        ]
      },
      {
        groupTitle: 'Hình Học Không Gian',
        tools: [
          {
            id: 'geometry',
            label: 'Hình Học 3D & GeoGebra',
            icon: <Box size={19} className="text-indigo-600 dark:text-indigo-400" />,
            badge: '3D'
          }
        ]
      }
    ],
    giang_day: [
      {
        groupTitle: 'Soạn Bài GDPT 2018',
        tools: [
          {
            id: 'lesson_plan',
            label: 'Kế Hoạch Bài Dạy (CV 5512)',
            icon: <BookOpen size={19} className="text-violet-600 dark:text-violet-400" />
          },
          {
            id: 'mindmap',
            label: 'Sơ Đồ Tư Duy (Mindmap)',
            icon: <Brain size={19} className="text-orange-600 dark:text-orange-400" />
          }
        ]
      },
      {
        groupTitle: 'Trực Quan Hóa',
        tools: [
          {
            id: 'illustration',
            label: 'Tạo Ảnh Minh Họa Sư Phạm',
            icon: <ImageIcon size={19} className="text-pink-600 dark:text-pink-400" />
          },
          {
            id: 'simulation',
            label: 'Mô Phỏng Tương Tác',
            icon: <FlaskConical size={19} className="text-rose-600 dark:text-rose-400" />
          }
        ]
      }
    ],
    tro_giup: [
      {
        groupTitle: 'Trợ Giúp & Thiết Lập',
        tools: [
          {
            id: 'guide',
            label: 'Hướng Dẫn Sử Dụng',
            icon: <HelpCircle size={19} className="text-emerald-600 dark:text-emerald-400" />
          }
        ]
      }
    ]
  };

  const handleCategoryClick = (cat: MainRibbonCategory) => {
    setActiveCategory(cat);
    // If the ribbon was collapsed and user clicks a category tab, expand it
    if (isRibbonCollapsed) {
      onToggleRibbon();
    }
    // Auto-select the first tool of that category if current active tab isn't in it
    const groups = CATEGORY_GROUPS[cat];
    if (groups.length > 0 && groups[0].tools.length > 0) {
      const toolsInCat = groups.flatMap(g => g.tools.map(t => t.id));
      if (!toolsInCat.includes(activeTab)) {
        onSelectTab(groups[0].tools[0].id);
      }
    }
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 shrink-0 select-none shadow-2xs z-30 transition-all">
      {/* 1. TOP QUICK ACCESS & TITLE BAR */}
      <div className="h-10 px-3 sm:px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/90 text-xs">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <GraduationCap size={15} />
          </div>
          <span className="font-extrabold tracking-tight text-slate-800 dark:text-slate-100 text-xs uppercase flex items-center gap-2">
            Trợ Lý Khảo Thí & Tạo Đề CV 7991
            <span className="hidden md:inline-block text-[10px] px-1.5 py-0.2 rounded font-semibold bg-teal-100/70 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              Bộ GD&ĐT
            </span>
          </span>
        </div>

        {/* Quick Access Tools: Nạp SGK, Cấu hình AI, Đổi giao diện, Thu gọn Ribbon */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Nạp Sách SGK */}
          <button
            onClick={onOpenBookUpload}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition"
            title="Nạp mục lục Sách Giáo Khoa (KNTT, Cánh Diều, Chân Trời Sáng Tạo)"
          >
            <Upload size={13} className="text-teal-600" />
            <span className="hidden sm:inline">Nạp Sách SGK</span>
          </button>

          {/* Cấu hình AI (Gemini 3 Pro / 3 Flash / 2.5 Flash Auto Fallback) */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
              !apiKey.trim()
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 animate-pulse'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            }`}
            title="Cấu hình Gemini AI (Gemini 3 Pro, 3 Flash, 2.5 Flash Auto-Fallback)"
          >
            <Sparkles size={13} className="text-amber-500" />
            <span className="hidden sm:inline">AI Fallback:</span>
            <span className="font-mono text-[10px] text-teal-700 dark:text-teal-300">
              {preferredModel === 'auto' ? 'Auto (3 Pro/Flash)' : preferredModel.replace('gemini-', '')}
            </span>
          </button>

          {/* Đổi giao diện Sáng / Tối */}
          <button
            onClick={onToggleTheme}
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition"
            title="Chuyển chế độ Sáng / Tối"
          >
            {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
          </button>

          {/* Thu gọn / Mở rộng thanh Ribbon */}
          <button
            onClick={onToggleRibbon}
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition"
            title={isRibbonCollapsed ? "Mở rộng thanh Ribbon" : "Thu gọn thanh Ribbon (Tối đa vùng làm việc)"}
          >
            {isRibbonCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
        </div>
      </div>

      {/* 2. RIBBON TABS (Thanh danh mục phong cách MS Word) */}
      <div className="flex items-center justify-between px-2 sm:px-4 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto scrollbar-none">
        <div className="flex items-center space-x-0.5 sm:space-x-1">
          {RIBBON_TABS.map(tab => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleCategoryClick(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold transition-all relative rounded-t-lg ${
                  isActive
                    ? 'text-teal-700 dark:text-teal-300 bg-slate-100/90 dark:bg-slate-800/90 border-t-2 border-teal-600'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* BỘ BA THAO TÁC BẮT BUỘC TRÊN TẤT CẢ CÁC TAB: THÊM - XÓA - LÀM LẠI (HD_PHUC) */}
        <div className="flex items-center gap-1 py-1 pl-3 shrink-0">
          <button
            onClick={onAdd}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900 border border-teal-200 dark:border-teal-800 transition active:scale-95 shadow-2xs"
            title="Thêm mới (Ctrl+Alt+N)"
          >
            <Plus size={13} className="text-teal-600" />
            <span>Thêm</span>
          </button>

          <button
            onClick={onDelete}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 transition active:scale-95 shadow-2xs"
            title="Xóa nội dung (Ctrl+Alt+Del)"
          >
            <Trash2 size={13} className="text-rose-600" />
            <span>Xóa</span>
          </button>

          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-200 dark:border-amber-800 transition active:scale-95 shadow-2xs"
            title="Làm lại về mặc định (Ctrl+Alt+R)"
          >
            <RotateCcw size={13} className="text-amber-600" />
            <span>Làm lại</span>
          </button>
        </div>
      </div>

      {/* 3. RIBBON COMMAND PANEL (Thanh công cụ chi tiết dưới tab - có thể thu gọn) */}
      {!isRibbonCollapsed && (
        <div className="px-2 sm:px-4 py-2 bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 overflow-x-auto flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
          {CATEGORY_GROUPS[activeCategory].map((group, gIdx) => (
            <div key={gIdx} className="flex items-center gap-1.5 shrink-0 border-r border-slate-200 dark:border-slate-800 pr-3 last:border-r-0">
              <div className="flex items-center gap-1">
                {group.tools.map(tool => {
                  const isToolActive = activeTab === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => onSelectTab(tool.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all min-w-[76px] sm:min-w-[88px] ${
                        isToolActive
                          ? 'bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-200 shadow-xs border border-teal-300 dark:border-teal-700 ring-1 ring-teal-200 dark:ring-teal-900 font-extrabold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/60 font-semibold border border-transparent'
                      }`}
                      title={tool.label}
                    >
                      <div className="relative mb-1">
                        <span className="flex items-center justify-center">
                          {tool.icon}
                        </span>
                        {tool.badge && (
                          <span className="absolute -top-1.5 -right-3 text-[8px] font-bold px-1 rounded-full bg-teal-600 text-white">
                            {tool.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] leading-tight text-center line-clamp-1 max-w-[100px]">
                        {tool.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block text-center mt-auto self-end pt-1">
                {group.groupTitle}
              </span>
            </div>
          ))}
        </div>
      )}
    </header>
  );
};
