import React, { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, RotateCcw, Copy, Printer, Check, Sparkles } from 'lucide-react';

interface ContextMenuProps {
  onAdd: () => void;
  onDelete: () => void;
  onReset: () => void;
  onCopyWord?: () => void;
  activeTabLabel: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  onAdd,
  onDelete,
  onReset,
  onCopyWord,
  activeTabLabel
}) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [copiedNotification, setCopiedNotification] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Don't intercept if clicking inside standard text inputs or textareas unless user wants context
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return; // Allow native text selection/copy in inputs
      }

      e.preventDefault();
      const menuWidth = 230;
      const menuHeight = 220;

      let x = e.clientX;
      let y = e.clientY;

      // Adjust if overflowing viewport
      if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10;
      }
      if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 10;
      }

      setPosition({ x, y });
      setVisible(true);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setVisible(false);
      }
      // Global shortcut handlers per hd_phuc:
      if (e.ctrlKey && e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        onAdd();
      }
      if (e.ctrlKey && e.altKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        onDelete();
      }
      if (e.ctrlKey && e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        onReset();
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onAdd, onDelete, onReset]);

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      style={{ top: position.y, left: position.x }}
      className="fixed z-50 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="truncate">{activeTabLabel}</span>
        <span className="text-[9px] text-teal-600 dark:text-teal-400 font-bold">Thao tác nhanh</span>
      </div>

      {/* THÊM */}
      <button
        onClick={() => {
          onAdd();
          setVisible(false);
        }}
        className="w-full flex items-center justify-between px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 hover:text-teal-700 dark:hover:text-teal-300 transition text-left"
      >
        <span className="flex items-center gap-2 font-medium">
          <Plus size={14} className="text-teal-600" />
          <span>Thêm (Add)</span>
        </span>
        <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+Alt+N</kbd>
      </button>

      {/* XÓA */}
      <button
        onClick={() => {
          onDelete();
          setVisible(false);
        }}
        className="w-full flex items-center justify-between px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-700 dark:hover:text-rose-300 transition text-left"
      >
        <span className="flex items-center gap-2 font-medium">
          <Trash2 size={14} className="text-rose-600" />
          <span>Xóa (Delete)</span>
        </span>
        <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+Alt+Del</kbd>
      </button>

      {/* LÀM LẠI */}
      <button
        onClick={() => {
          onReset();
          setVisible(false);
        }}
        className="w-full flex items-center justify-between px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/60 hover:text-amber-700 dark:hover:text-amber-300 transition text-left"
      >
        <span className="flex items-center gap-2 font-medium">
          <RotateCcw size={14} className="text-amber-600" />
          <span>Làm lại (Reset)</span>
        </span>
        <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+Alt+R</kbd>
      </button>

      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

      {/* SAO CHÉP CHUẨN WORD (CẮT SÁT VIỀN 24PX) */}
      {onCopyWord && (
        <button
          onClick={() => {
            onCopyWord();
            setCopiedNotification(true);
            setTimeout(() => {
              setCopiedNotification(false);
              setVisible(false);
            }, 1000);
          }}
          className="w-full flex items-center justify-between px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
        >
          <span className="flex items-center gap-2 font-medium">
            {copiedNotification ? (
              <Check size={14} className="text-emerald-600" />
            ) : (
              <Copy size={14} className="text-blue-600" />
            )}
            <span>Sao chép ảnh sát viền 24px</span>
          </span>
          <span className="text-[9px] px-1 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
            300 DPI
          </span>
        </button>
      )}

      {/* IN / XUẤT */}
      <button
        onClick={() => {
          window.print();
          setVisible(false);
        }}
        className="w-full flex items-center justify-between px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
      >
        <span className="flex items-center gap-2 font-medium">
          <Printer size={14} className="text-slate-500" />
          <span>In trang này</span>
        </span>
        <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+P</kbd>
      </button>
    </div>
  );
};
