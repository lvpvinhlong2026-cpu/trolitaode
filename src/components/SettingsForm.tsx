import React, { useState } from 'react';
import { Check, Eye, EyeOff, Sparkles, Zap, Brain, ShieldCheck } from 'lucide-react';

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

  const models = [
    { 
      id: 'auto', 
      name: 'Tự động thông minh (Khuyên dùng khi gửi cho nhiều người)', 
      desc: 'Hệ thống tự động dùng mô hình mới nhất (Gemini 3 Flash/Pro). Khi người dùng gặp quá tải hoặc nghẽn mạng, tự động chuyển đổi tức thì sang Gemini 2.5 Flash / 2.0 Flash không làm gián đoạn bài học.', 
      badge: 'Khuyên dùng',
      icon: <Sparkles size={16} className="text-teal-500" />
    },
    { 
      id: 'gemini-3-flash-preview', 
      name: 'Gemini 3 Flash (Thế hệ 3 Mới nhất - Siêu tốc & Thông minh)', 
      desc: 'Tốc độ phản hồi cực nhanh, tư duy ngữ cảnh toán học và ngôn ngữ sư phạm chuẩn xác, tiết kiệm tài nguyên hạn ngạch.', 
      badge: 'Thế hệ 3',
      icon: <Zap size={16} className="text-amber-500" />
    },
    { 
      id: 'gemini-3-pro-preview', 
      name: 'Gemini 3 Pro (Trí tuệ Nhân tạo Đỉnh cao - Suy luận sâu)', 
      desc: 'Khả năng giải toán khó, xây dựng ma trận đặc tả đề thi CV 7991 và câu hỏi thực tế phức tạp với độ chính xác cao nhất.', 
      badge: 'Chuyên sâu',
      icon: <Brain size={16} className="text-purple-500" />
    },
    { 
      id: 'gemini-2.5-flash', 
      name: 'Gemini 2.5 Flash (Cực kỳ Ổn định & Bền bỉ)', 
      desc: 'Tối ưu hoạt động liên tục 24/7, hạn ngạch rộng lớn, không bao giờ bị nghẽn mạng, chuẩn hóa tài liệu PDF và Word mượt mà.', 
      badge: 'Ổn định',
      icon: <ShieldCheck size={16} className="text-emerald-500" />
    },
    { 
      id: 'gemini-2.0-flash', 
      name: 'Gemini 2.0 Flash (Bền bỉ)', 
      desc: 'Mô hình thế hệ 2 tốc độ cao, phương án dự phòng tin cậy.', 
      badge: '',
      icon: <Zap size={16} className="text-slate-400" />
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(keyInput, modelInput);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
      <div className="space-y-1.5">
        <label className="block font-semibold text-slate-700 dark:text-slate-300">
          Khóa API Gemini (Google AI Studio)
        </label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full pl-3 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none"
            required
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500">
          Chưa có khóa? Lấy hoàn toàn miễn phí tại{' '}
          <a
            href="https://aistudio.google.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-0.5 font-semibold"
          >
            Google AI Studio
          </a>. Khóa được lưu an toàn trên trình duyệt cá nhân của từng giáo viên.
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
