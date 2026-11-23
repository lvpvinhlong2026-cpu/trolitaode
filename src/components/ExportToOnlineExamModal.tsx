import React, { useState } from 'react';
import { 
  X, 
  Globe, 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink, 
  Play, 
  Download, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

interface ExportToOnlineExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  examData: {
    examId: string;
    title: string;
    questionsCount: number;
    duration: number;
    examOnlineUrl: string;
    tunnelUrl?: string;
  } | null;
}

export const ExportToOnlineExamModal: React.FC<ExportToOnlineExamModalProps> = ({
  isOpen,
  onClose,
  examData
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [launching, setLaunching] = useState<boolean>(false);
  const [launchMsg, setLaunchMsg] = useState<string | null>(null);

  if (!isOpen || !examData) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(examData.examOnlineUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleDownloadQr = () => {
    const canvas = document.getElementById('online-exam-qrcode') as HTMLCanvasElement;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Ma_QR_Thi_Online_${examData.examId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleLaunchKiemTraOnline = async () => {
    setLaunching(true);
    setLaunchMsg(null);
    try {
      const res = await fetch('/api/launch-kiem-tra-online', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setLaunchMsg('Đã kích hoạt khởi chạy Máy chủ KIEM_TRA_ONLINE!');
      } else {
        setLaunchMsg(data.error || 'Chưa khởi chạy được máy chủ.');
      }
    } catch (e: any) {
      setLaunchMsg('Lỗi kết nối máy chủ: ' + e.message);
    } finally {
      setLaunching(false);
      setTimeout(() => setLaunchMsg(null), 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
        {/* HEADER BAR */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-teal-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-xs">
              <Globe size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight">
                Giao Thi Online Toàn Lớp (Hệ Thống KIEM_TRA_ONLINE)
              </h2>
              <p className="text-[11px] text-teal-100 font-medium">
                Đã nạp đề thành công vào thư mục máy chủ của hệ thống thi trực tuyến
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* THÔNG TIN BÀI THI */}
          <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider block">
                Tên bài thi:
              </span>
              <p className="font-extrabold text-slate-800 dark:text-slate-100 line-clamp-1">
                {examData.title}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                <FileText size={13} className="text-teal-600" />
                {examData.questionsCount} câu
              </span>
              <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                <Clock size={13} className="text-teal-600" />
                {examData.duration} phút
              </span>
            </div>
          </div>

          {/* KHUNG MÃ QR VÀ LINK TRỰC TIẾP */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Chiếu Mã QR này lên máy chiếu hoặc gửi link cho học sinh quét vào thi:
            </span>

            {/* Canvas QR Code */}
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 inline-block">
              <QRCodeCanvas
                id="online-exam-qrcode"
                value={examData.examOnlineUrl}
                size={180}
                level="M"
                marginSize={2}
              />
            </div>

            <button
              onClick={handleDownloadQr}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition shadow-2xs"
            >
              <Download size={13} />
              <span>Tải ảnh Mã QR (Để in hoặc dán slide)</span>
            </button>

            {/* Ô LINK ONLINE */}
            <div className="w-full space-y-1 text-left pt-2">
              <span className="text-[11px] font-bold text-slate-500 block">
                Đường link làm bài thi trực tuyến:
              </span>
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 pl-3">
                <input
                  type="text"
                  readOnly
                  value={examData.examOnlineUrl}
                  className="w-full text-xs font-mono bg-transparent outline-none text-teal-800 dark:text-teal-300 font-semibold truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 hover:bg-teal-100 border border-teal-200 dark:border-teal-800'
                  }`}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? 'Đã chép link' : 'Chép link'}</span>
                </button>
                <a
                  href={examData.examOnlineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 transition"
                  title="Mở bài thi trực tiếp trong tab mới"
                >
                  <ExternalLink size={15} />
                </a>
              </div>
            </div>
          </div>

          {/* KHU VỰC ĐIỀU KHIỂN & HƯỚNG DẪN */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-950 dark:text-amber-200 space-y-2">
            <span className="font-extrabold flex items-center gap-1.5">
              <AlertCircle size={15} className="text-amber-600" />
              Hướng dẫn tổ chức thi toàn trường / lớp:
            </span>
            <ul className="text-[11px] list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
              <li>Học sinh chỉ cần dùng Camera hoặc Zalo quét mã QR trên bảng để làm bài trực tiếp trên điện thoại.</li>
              <li>Hệ thống <strong>tự động chấm điểm</strong> và lưu toàn bộ bài làm về thư mục máy tính của Thầy: <code>KIEM_TRA_ONLINE/data/submissions</code>.</li>
              <li>Để phát link ra ngoài Internet toàn trường, Thầy bấm nút bên dưới để khởi chạy Cloudflare Tunnel.</li>
            </ul>

            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                onClick={handleLaunchKiemTraOnline}
                disabled={launching}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Play size={13} className="text-white fill-white" />
                <span>{launching ? 'Đang kích hoạt...' : 'Bật Máy Chủ Online Toàn Trường'}</span>
              </button>

              {launchMsg && (
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 animate-in fade-in">
                  {launchMsg}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/80 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
