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
  FileSpreadsheet,
  Table as TableIcon,
  Sun,
  Moon,
  GraduationCap,
  ShieldCheck,
  Shuffle
} from 'lucide-react';
import { ActiveTabType } from '../App';

export type MainRibbonCategory = 
  | 'khao_thi' 
  | 'do_thi' 
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
  onOpenShuffleModal?: () => void;
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
  onOpenShuffleModal,
  apiKey,
  preferredModel
}) => {
  // Determine which ribbon category corresponds to the activeTab
  const getCategoryFromTab = (tab: ActiveTabType): MainRibbonCategory => {
    switch (tab) {
      case 'exam_full':
      case 'matrix_full':
      case 'matrix_from_exam':
      case 'cv7991':
      case 'similar':
      case 'critique':
        return 'khao_thi';
      case 'bbt_tool':
      case 'function_graph':
      case 'geometry':
        return 'do_thi';
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
    { id: 'do_thi', label: 'Hình Vẽ & Đồ Thị', icon: <TrendingUp size={15} /> },
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
            icon: <FileCheck2 size={19} className="text-emerald-600 dark:text-emerald-400" />
          },
          {
            id: 'matrix_full',
            label: 'Ma Trận & Đặc Tả 10.0đ',
            icon: <Grid3X3 size={19} className="text-purple-600 dark:text-purple-400" />
          },
          {
            id: 'matrix_from_exam',
            label: 'Tạo Ma Trận Từ Đề',
            icon: <FileSpreadsheet size={19} className="text-indigo-600 dark:text-indigo-400" />
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
      },
      {
        groupTitle: 'Kiểm Định & Đánh Giá',
        tools: [
          {
            id: 'critique',
            label: 'Phản Biện Đề Thi',
            icon: <ShieldCheck size={19} className="text-amber-600 dark:text-amber-400" />,
            badge: 'Mới'
          }
        ]
      }
    ],
    do_thi: [
      {
        groupTitle: 'Đồ Họa Toán Học (300 DPI)',
        tools: [
          {
            id: 'bbt_tool',
            label: 'Bảng Biến Thiên 300 DPI',
            icon: <TableIcon size={19} className="text-purple-600 dark:text-purple-400" />,
            badge: 'Tự động'
          },
          {
            id: 'function_graph',
            label: 'Đồ Thị Hàm Số Oxy',
            icon: <TrendingUp size={19} className="text-teal-600 dark:text-teal-400" />,
            badge: '300 DPI'
          },
          {
            id: 'geometry',
            label: 'Thước Kẻ & GSP 3D',
            icon: <Box size={19} className="text-amber-600 dark:text-amber-400" />,
            badge: 'GSP 3D'
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
    <header className="bg-white dark:bg-slate-900 border-b border-[#E1DFDD] dark:border-slate-800 shrink-0 select-none shadow-xs z-30 transition-all">
      {/* 1. TOP QUICK ACCESS & TITLE BAR (OFFICE 365 FLUENT LIGHT THEME) */}
      <div className="h-10 px-3 sm:px-4 flex items-center justify-between border-b border-[#E1DFDD] dark:border-slate-800 bg-[#F3F2F1] dark:bg-slate-900 text-xs text-[#242424] dark:text-slate-100">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-[4px] bg-[#0F6CBD] text-white flex items-center justify-center shadow-xs">
            <GraduationCap size={15} />
          </div>
          <span className="font-bold tracking-tight text-[#242424] dark:text-slate-100 text-xs uppercase flex items-center gap-2">
            TRỢ LÍ TẠO ĐỀ
          </span>
        </div>

        {/* Quick Access Tools: Nạp SGK, Cấu hình AI, Đổi giao diện, Thu gọn Ribbon */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Nạp Sách SGK */}
          <button
            onClick={onOpenBookUpload}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[11px] font-semibold text-[#242424] dark:text-slate-200 bg-white dark:bg-slate-800 border border-[#E1DFDD] dark:border-slate-700 hover:bg-[#EDEBE9] dark:hover:bg-slate-700 transition cursor-pointer"
            title="Nạp mục lục Sách Giáo Khoa (KNTT, Cánh Diều, Chân Trời Sáng Tạo)"
          >
            <Upload size={13} className="text-[#0F6CBD]" />
            <span className="hidden sm:inline">Nạp Sách SGK</span>
          </button>

          {/* Cấu hình AI (Gemini 3 Pro / 3 Flash / 2.5 Flash Auto Fallback) */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[11px] font-semibold transition border cursor-pointer ${
              !apiKey.trim()
                ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 animate-pulse'
                : 'text-[#242424] dark:text-slate-200 bg-white dark:bg-slate-800 border-[#E1DFDD] dark:border-slate-700 hover:bg-[#EDEBE9] dark:hover:bg-slate-700'
            }`}
            title="Cấu hình Gemini AI (Gemini 3 Pro, 3 Flash, 2.5 Flash Auto-Fallback)"
          >
            <Sparkles size={13} className="text-amber-500" />
            <span className="hidden sm:inline">AI Fallback:</span>
            <span className="font-mono text-[10px] text-[#0F6CBD] dark:text-teal-300">
              {preferredModel === 'auto' ? 'Auto (3 Pro/Flash)' : preferredModel.replace('gemini-', '')}
            </span>
          </button>

          {/* Đổi giao diện Sáng / Tối */}
          <button
            onClick={onToggleTheme}
            className="p-1 rounded-[4px] text-[#605E5C] hover:text-[#201F1E] dark:text-slate-400 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-[#E1DFDD] dark:border-slate-700 hover:bg-[#EDEBE9] dark:hover:bg-slate-700 transition cursor-pointer"
            title="Chuyển chế độ Sáng / Tối"
          >
            {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
          </button>

          {/* Thu gọn / Mở rộng thanh Ribbon */}
          <button
            onClick={onToggleRibbon}
            className="w-[28px] h-[28px] flex items-center justify-center rounded-[4px] text-[#605E5C] hover:text-[#201F1E] dark:text-slate-400 dark:hover:text-slate-200 hover:bg-[#EDEBE9] dark:hover:bg-slate-700 transition cursor-pointer"
            title={isRibbonCollapsed ? "Mở rộng thanh Ribbon (Ctrl + F1)" : "Thu gọn thanh Ribbon (Ctrl + F1)"}
          >
            {isRibbonCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
        </div>
      </div>

      {/* 2. RIBBON TABS (Thanh danh mục phong cách Office 365 Light Theme) */}
      <div 
        role="tablist"
        aria-label="Thanh thẻ công cụ Ribbon"
        className="flex items-center justify-between px-2 sm:px-4 border-b border-[#E1DFDD] dark:border-slate-800 bg-[#F3F2F1] dark:bg-slate-900 overflow-x-auto scrollbar-none h-[36px]"
      >
        <div className="flex items-center h-full">
          {/* NÚT TỆP BACKSTAGE CHUẨN OFFICE 365 */}
          <button
            role="tab"
            aria-selected={false}
            onClick={() => onSelectTab('guide')}
            className="px-3.5 py-1 my-0.5 mr-1.5 rounded-[4px] text-xs font-bold tracking-wide uppercase transition bg-[#0F6CBD] hover:bg-[#115EA3] text-white shadow-xs cursor-pointer shrink-0"
          >
            Tệp
          </button>

          {RIBBON_TABS.map(tab => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleCategoryClick(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 h-[36px] text-xs transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'font-bold text-[#242424] dark:text-white bg-white dark:bg-slate-900 border-b-[3px] border-[#0F6CBD] dark:border-sky-400 -mb-[1px]'
                    : 'font-semibold text-[#424242] dark:text-slate-400 hover:text-[#201F1E] dark:hover:text-slate-200 hover:bg-[#EDEBE9] dark:hover:bg-slate-800/60 border-b-[3px] border-transparent'
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
            className="flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-[11px] font-semibold bg-white hover:bg-[#EDEBE9] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#242424] dark:text-slate-200 border border-[#E1DFDD] dark:border-slate-700 transition cursor-pointer shadow-2xs"
            title="Thêm mới (Ctrl+Alt+N)"
          >
            <Plus size={13} className="text-[#0F6CBD]" />
            <span>Thêm</span>
          </button>

          <button
            onClick={onDelete}
            className="flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-[11px] font-semibold bg-white hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950 text-rose-700 dark:text-rose-300 border border-[#E1DFDD] dark:border-slate-700 transition cursor-pointer shadow-2xs"
            title="Xóa nội dung (Ctrl+Alt+Del)"
          >
            <Trash2 size={13} className="text-rose-600" />
            <span>Xóa</span>
          </button>

          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-[11px] font-semibold bg-white hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950 text-amber-700 dark:text-amber-300 border border-[#E1DFDD] dark:border-slate-700 transition cursor-pointer shadow-2xs"
            title="Làm lại về mặc định (Ctrl+Alt+R)"
          >
            <RotateCcw size={13} className="text-amber-600" />
            <span>Làm lại</span>
          </button>

          {onOpenShuffleModal && (
            <button
              onClick={onOpenShuffleModal}
              className="flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-[11px] font-bold bg-[#0F6CBD] hover:bg-[#115EA3] text-white shadow-xs transition cursor-pointer ml-1.5"
              title="Mở công cụ Trộn Đề Thi Hoán Vị (McMIX) - Tải file .doc, .docx, .pdf lên để trộn hoàn toàn Offline"
            >
              <Shuffle size={13} className="text-sky-200" />
              <span>Trộn Đề McMIX</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. RIBBON COMMAND PANEL (Thanh công cụ chi tiết dưới tab - chuẩn Command Groups & Group Labels) */}
      {!isRibbonCollapsed && (
        <div className="px-2 sm:px-4 py-1.5 bg-white dark:bg-slate-900 border-b border-[#E1DFDD] dark:border-slate-800 overflow-x-auto flex items-stretch gap-2 min-h-[96px] shadow-[0_2px_4px_rgba(0,0,0,0.04)] animate-in fade-in slide-in-from-top-1 duration-150">
          {CATEGORY_GROUPS[activeCategory].map((group, gIdx) => (
            <div key={gIdx} className="flex flex-col justify-between px-2 shrink-0 border-r border-[#E1DFDD] dark:border-slate-800 last:border-r-0">
              <div className="flex items-center gap-1 flex-1">
                {group.tools.map(tool => {
                  const isToolActive = activeTab === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => onSelectTab(tool.id)}
                      className={`flex flex-col items-center justify-center p-1.5 rounded-[4px] text-center transition min-w-[76px] sm:min-w-[88px] h-[64px] cursor-pointer ${
                        isToolActive
                          ? 'bg-[#EFF6FC] dark:bg-slate-800 text-[#0F6CBD] dark:text-sky-300 shadow-2xs border border-[#0F6CBD] dark:border-sky-500 font-bold'
                          : 'text-[#242424] dark:text-slate-300 hover:bg-[#EDEBE9] dark:hover:bg-slate-800/60 font-semibold border border-transparent'
                      }`}
                      title={tool.label}
                    >
                      <div className="relative mb-1">
                        <span className="flex items-center justify-center">
                          {tool.icon}
                        </span>
                        {tool.badge && (
                          <span className="absolute -top-1.5 -right-3 text-[8px] font-bold px-1 rounded-[3px] bg-[#0F6CBD] text-white">
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
              <div className="text-[11px] font-normal text-[#605E5C] dark:text-slate-400 text-center pb-0.5 mt-auto select-none">
                {group.groupTitle}
              </div>
            </div>
          ))}
        </div>
      )}
    </header>
  );
};
