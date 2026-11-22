import React from 'react';
import { Type } from 'lucide-react';

export type MathFontChoice = 'latex' | 'times';
export type MathStrokeChoice = 'thin' | 'standard' | 'bold';

export const MATH_FONT_FAMILIES: Record<MathFontChoice, string> = {
  latex: '"KaTeX_Main", "KaTeX_Math", "Computer Modern", "Latin Modern Roman", serif',
  times: '"Times New Roman", "STIX Two Text", "Cambria Math", serif',
};

export interface MathFontSelectorProps {
  // Phông chữ (LaTeX / Times SGK)
  value?: MathFontChoice;
  onChange?: (font: MathFontChoice) => void;
  font?: MathFontChoice;
  onFontChange?: (font: MathFontChoice) => void;

  // Nét vẽ (Mảnh / Chuẩn / Đậm)
  stroke?: MathStrokeChoice;
  onStrokeChange?: (stroke: MathStrokeChoice) => void;

  // Độ đậm chữ (Chữ đậm / Thường)
  isBold?: boolean;
  onBoldChange?: (isBold: boolean) => void;

  showLabel?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  extraRow1Right?: React.ReactNode;
  layout?: 'stacked' | 'inline';
}

export default function MathFontSelector({
  value,
  onChange,
  font,
  onFontChange,
  stroke,
  onStrokeChange,
  isBold,
  onBoldChange,
  showLabel = true,
  className = '',
  size = 'md',
  extraRow1Right,
  layout = 'stacked'
}: MathFontSelectorProps) {
  const currentFont = font ?? value ?? 'times';
  const handleFontChange = (f: MathFontChoice) => {
    if (onFontChange) onFontChange(f);
    if (onChange) onChange(f);
  };

  const isSm = size === 'sm';
  const fontBtnPadding = isSm ? 'px-2.5 py-1 text-[11px] sm:text-xs' : 'px-3 py-1.5 text-xs';
  const subBtnPadding = isSm ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';

  const fontControl = (
    <div className="flex items-center gap-1.5 shrink-0">
      {showLabel && (
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Type size={13} className="text-teal-600" />
          Phông:
        </span>
      )}
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => handleFontChange('latex')}
          className={`${fontBtnPadding} font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
            currentFont === 'latex'
              ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-teal-50 dark:hover:bg-slate-700'
          }`}
          title="Phông chữ LaTeX / Computer Modern (Chuẩn đề thi & bài báo toán)"
        >
          LaTeX (Mẫu)
        </button>

        <button
          type="button"
          onClick={() => handleFontChange('times')}
          className={`${fontBtnPadding} font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
            currentFont === 'times'
              ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-teal-50 dark:hover:bg-slate-700'
          }`}
          title="Phông chữ Times New Roman (Chuẩn Sách giáo khoa & Bộ GD&ĐT)"
        >
          Times SGK
        </button>
      </div>
    </div>
  );

  const strokeControl = stroke !== undefined && onStrokeChange && (
    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg font-bold border border-slate-200/60 dark:border-slate-700">
      <span className="text-slate-400 dark:text-slate-400 px-1.5 text-[10px] sm:text-[11px]">Nét:</span>
      {(['thin', 'standard', 'bold'] as const).map(item => {
        const label = item === 'thin' ? 'Mảnh' : item === 'standard' ? 'Chuẩn' : 'Đậm';
        const isActive = stroke === item;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onStrokeChange(item)}
            className={`${subBtnPadding} rounded transition cursor-pointer whitespace-nowrap ${
              isActive
                ? 'bg-teal-600 text-white shadow-2xs font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  const boldControl = isBold !== undefined && onBoldChange && (
    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg font-bold border border-slate-200/60 dark:border-slate-700">
      <button
        type="button"
        onClick={() => onBoldChange(true)}
        className={`${subBtnPadding} rounded transition cursor-pointer whitespace-nowrap ${
          isBold
            ? 'bg-teal-600 text-white shadow-2xs font-extrabold'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
        title="Chữ in đậm nổi bật"
      >
        Chữ đậm
      </button>
      <button
        type="button"
        onClick={() => onBoldChange(false)}
        className={`${subBtnPadding} rounded transition cursor-pointer whitespace-nowrap ${
          !isBold
            ? 'bg-teal-600 text-white shadow-2xs font-medium'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
        title="Chữ nét thường chuẩn"
      >
        Thường
      </button>
    </div>
  );

  if (layout === 'inline') {
    return (
      <div className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
        {fontControl}
        {strokeControl}
        {boldControl}
        {extraRow1Right}
      </div>
    );
  }

  // Layout 'stacked': 2 dòng chuẩn mực theo yêu cầu giao diện media_1795178150229_b3b9ce50.png
  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {/* Dòng 1: Phông chữ (và phụ kiện bên phải như Cỡ chữ slider nếu có) */}
      <div className="flex items-center justify-between gap-2 w-full flex-wrap sm:flex-nowrap">
        {fontControl}
        {extraRow1Right && (
          <div className="shrink-0 ml-auto">
            {extraRow1Right}
          </div>
        )}
      </div>

      {/* Dòng 2: Nét vẽ & Độ đậm chữ ĐẶT CẠNH NHAU TRÊN CÙNG MỘT DÒNG */}
      {(strokeControl || boldControl) && (
        <div className="flex items-center gap-2 flex-wrap">
          {strokeControl}
          {boldControl}
        </div>
      )}
    </div>
  );
}
