import React, { useState, useMemo } from 'react';
import { Check, Eye, EyeOff, Sparkles, Zap, Brain, ShieldCheck, KeyRound } from 'lucide-react';
import { parseApiKeys } from '../utils/gemini';

export interface SettingsFormProps {
  initialKey: string;
  initialModel: string;
  onSave: (key: string, model: string) => void;
  onClose: () => void;
  allowClose: boolean;
}

export default function SettingsForm({ initialKey, initialModel, onSave, onClose, allowClose }: SettingsFormProps) {
  const [keyInput, setKeyInput] = useState(initialKey);
  const [modelInput, setModelInput] = useState(initialModel || 'auto');
  const [showKey, setShowKey] = useState(false);
  const detectedKeys = useMemo(() => parseApiKeys(keyInput), [keyInput]);

  const models = [
    { 
      id: 'auto', 
      name: 'Tự động thông minh (Khuyên dùng khi gửi cho nhiều người)', 
      desc: 'Hệ thống tự động dùng mô hình mới nhất (Gemini 3.8 Flash / 3.5 Flash) và tự dò model khả dụng nếu có lỗi, kết hợp xoay vòng nhiều API Key.', 
      badge: 'Khuyên dùng',
      icon: <Sparkles size={16} className="text-teal-500" />
    },
    { 
      id: 'gemini-3.8-flash', 
      name: 'Gemini 3.8 Flash (Mới nhất - Siêu tốc & Chuẩn xác)', 
      desc: 'Tốc độ phản hồi cực nhanh, tư duy ngữ cảnh toán học và ngôn ngữ sư phạm chuẩn xác, tiết kiệm tài nguyên hạn ngạch.', 
      badge: 'Mới nhất',
      icon: <Zap size={16} className="text-amber-500" />
    },
    { 
      id: 'gemini-3.5-flash', 
      name: 'Gemini 3.5 Flash (Ổn định)', 
      desc: 'Phù hợp xây dựng ma trận đặc tả đề thi CV 7991 và câu hỏi thực tế phức tạp.', 
      badge: 'Ổn định',
      icon: <Brain size={16} className="text-purple-500" />
    },
    { 
      id: 'gemini-3-flash-preview', 
      name: 'Gemini 3 Flash Preview', 
      desc: 'Mô hình thế hệ 3 tốc độ cao.', 
      badge: 'Thế hệ 3',
      icon: <Zap size={16} className="text-sky-500" />
    },
    { 
      id: 'gemini-2.5-flash', 
      name: 'Gemini 2.5 Flash (Dự phòng)', 
      desc: 'Phương án dự phòng tin cậy, hoạt động ổn định.', 
      badge: 'Dự phòng',
      icon: <ShieldCheck size={16} className="text-emerald-500" />
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = detectedKeys.join('\n');
    onSave(normalized || keyInput.trim(), modelInput);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <KeyRound size={14} className="text-teal-600 dark:text-teal-400" />
            <span>Danh sách API Key Gemini (Hỗ trợ nhiều Key xoay vòng)</span>
          </label>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
            detectedKeys.length > 1
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : detectedKeys.length === 1
                ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          }`}>
            <ShieldCheck size={11} />
            {detectedKeys.length > 0 ? `Đã nhận ${detectedKeys.length} Key` : 'Chưa có Key hợp lệ'}
          </span>
        </div>
        <div className="relative">
          <textarea
            rows={4}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder={"Dán 1 hoặc nhiều API Key (mỗi dòng 1 Key hoặc cách nhau bởi dấu phẩy):\nAIzaSy...\nAIzaSy..."}
            style={showKey ? undefined : ({ WebkitTextSecurity: 'disc' } as React.CSSProperties)}
            className="w-full pl-3 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none resize-y leading-relaxed"
            required
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            title={showKey ? 'Ẩn API Key' : 'Hiện API Key'}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
          Nhập <strong>nhiều Key (mỗi dòng 1 Key)</strong> để tự động xoay vòng khi gặp lỗi hết hạn mức (429) hoặc Key lỗi. Chưa có khóa? Lấy hoàn toàn miễn phí tại{' '}
          <a
            href="https://aistudio.google.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-0.5 font-semibold"
          >
            Google AI Studio
          </a>.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block font-semibold text-slate-700 dark:text-slate-300">
          Chọn dòng mô hình AI mặc định
        </label>
        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {models.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModelInput(m.id)}
              className={`p-3 text-left border rounded-2xl flex flex-col gap-1 transition-all ${
                modelInput === m.id
                  ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 ring-1 ring-teal-500'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-xs">
                  {m.icon}
                  {m.name}
                  {m.badge && (
                    <span className="text-[9px] bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 px-1.5 py-0.2 rounded-md font-extrabold uppercase shrink-0">
                      {m.badge}
                    </span>
                  )}
                </span>
                {modelInput === m.id && <Check size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />}
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal pl-5">{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 justify-end">
        {allowClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition"
          >
            Hủy bỏ
          </button>
        )}
        <button
          type="submit"
          className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold flex items-center gap-1.5 transition shadow-sm"
        >
          <Check size={14} />
          Lưu cấu hình
        </button>
      </div>
    </form>
  );
}
