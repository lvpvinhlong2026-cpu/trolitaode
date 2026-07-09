import React, { useState } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';

export interface SettingsFormProps {
  initialKey: string;
  initialModel: string;
  onSave: (key: string, model: string) => void;
  onClose: () => void;
  allowClose: boolean;
}

export default function SettingsForm({ initialKey, initialModel, onSave, onClose, allowClose }: SettingsFormProps) {
  const [keyInput, setKeyInput] = useState(initialKey);
  const [modelInput, setModelInput] = useState(initialModel);
  const [showKey, setShowKey] = useState(false);

  const models = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Thử nghiệm)', desc: 'Tốc độ cực nhanh, tiết kiệm quota, phù hợp sinh đề nhanh.', default: false },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Thử nghiệm)', desc: 'Trí tuệ nhân tạo cao cấp nhất, lập luận toán học sâu sắc.', default: true },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Độ ổn định cao, tốc độ phản hồi tối ưu.', default: false }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(keyInput, modelInput);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs text-slate-705 dark:text-slate-300">
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
            className="w-full pl-3 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
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
          Chưa có khóa? Lấy miễn phí tại{' '}
          <a
            href="https://aistudio.google.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline inline-flex items-center gap-0.5 font-semibold"
          >
            Google AI Studio <i className="fa-solid fa-arrow-up-right-from-square text-[8px]"></i>
          </a>. Khóa được lưu trữ an toàn trên trình duyệt của bạn.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block font-semibold text-slate-700 dark:text-slate-300">
          Chọn dòng mô hình AI mặc định
        </label>
        <div className="grid grid-cols-1 gap-2">
          {models.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModelInput(m.id)}
              className={`p-3 text-left border rounded-2xl flex flex-col gap-1 transition-all ${
                modelInput === m.id
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  {m.name}
                  {m.default && (
                    <span className="text-[9px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-1.5 py-0.2 rounded-md font-extrabold uppercase">
                      Mặc định
                    </span>
                  )}
                </span>
                {modelInput === m.id && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">{m.desc}</span>
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
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center gap-1.5 transition shadow-sm"
        >
          <Check size={14} />
          Lưu cấu hình
        </button>
      </div>
    </form>
  );
}
