import React, { useState, useRef } from 'react';
import { Loader2, AlertCircle, Play, MonitorPlay, Copy, Download, Sparkles, RotateCcw } from 'lucide-react';

interface Props {
  apiKey: string;
  model: string;
}

export default function SimulationGenerator({ apiKey, model }: Props) {
  const [lessonContent, setLessonContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState('');
  const [p5Code, setP5Code] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleEnhancePrompt = async () => {
    if (!lessonContent.trim()) {
      setError("Vui lòng nhập ý tưởng thô (ví dụ: Tổng hai vector lớp 10) trước.");
      return;
    }
    if (!apiKey) {
      setError('Vui lòng cấu hình API Key ở góc trên cùng bên phải trước khi sử dụng.');
      return;
    }

    setIsEnhancing(true);
    setError('');

    try {
      const prompt = `Bạn là một Chuyên gia thiết kế Công cụ Giáo dục Tương tác.
Người dùng có một ý tưởng thô về việc làm mô phỏng: "${lessonContent}"

Nhiệm vụ của bạn: Hãy viết ra một KỊCH BẢN YÊU CẦU MÔ PHỎNG chi tiết để lập trình viên p5.js có thể code được ngay.
Yêu cầu kịch bản phải có các ý sau (trình bày bằng gạch đầu dòng):
1. Đặt gốc tọa độ ở đâu, hệ trục thế nào.
2. Các yếu tố tương tác (Thanh trượt/Slider cho những đại lượng nào, giới hạn bao nhiêu).
3. Chi tiết hình vẽ (Màu sắc, nét đứt/nét liền, hình dạng mũi tên, vị trí...).
4. Các thông số cần tính toán và in ra màn hình.
5. (Quan trọng) Yêu cầu hiển thị công thức Toán học bằng ký hiệu LaTeX rõ ràng (ví dụ $\\vec{R} = \\vec{a} + \\vec{b}$).

CHỈ TRẢ VỀ ĐOẠN VĂN BẢN KỊCH BẢN ĐÓ. KHÔNG GIẢI THÍCH, KHÔNG CHÀO HỎI. Văn phong ngắn gọn, rõ ràng, dạng gạch đầu dòng giống một bản Requirement.`;

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          model: model || 'auto',
          apiKey: apiKey
        })
      });

      if (!res.ok) {
         throw new Error("Lỗi từ máy chủ API khi gọi mô hình.");
      }
      
      const data = await res.json();
      let text = data.text || '';
      
      setLessonContent(text.trim());
      
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi tạo kịch bản.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!lessonContent.trim()) {
      setError("Vui lòng nhập nội dung bài học.");
      return;
    }
    if (!apiKey) {
      setError('Vui lòng cấu hình API Key ở góc trên cùng bên phải trước khi sử dụng.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setP5Code('');

    try {
      const prompt = `Bạn là một Lập trình viên cấp cao chuyên sử dụng thư viện p5.js để xây dựng các Mô phỏng Tương tác Giáo dục (tương tự như PhET Simulations).

Nhiệm vụ của bạn là đọc nội dung bài học dưới đây, tìm ra một định luật, khái niệm hoặc hiện tượng vật lý/toán học có thể mô phỏng, và viết mã code p5.js (JavaScript) để biến nó thành một ứng dụng web tương tác.

[YÊU CẦU BẮT BUỘC KHẮT KHE VỀ CODE]
1. CHỈ TRẢ VỀ DUY NHẤT MÃ CODE JAVASCRIPT, bọc trong khối \`\`\`javascript ... \`\`\` hoặc trả thẳng raw text. KHÔNG giải thích.
2. Hàm \`setup()\` nên tạo \`createCanvas(windowWidth, windowHeight)\` hoặc sử dụng một khung có kích thước phù hợp (như 600x400) để vừa với container.
3. BẮT BUỘC PHẢI CÓ INTERACTIVITY (Tương tác): Bạn phải khởi tạo ít nhất 1 \`createSlider()\` hoặc \`createButton()\` để người dùng thay đổi thông số của mô phỏng (ví dụ: vận tốc, trọng lực, màu sắc, thời gian). Gắn chúng vào một vị trí cụ thể bằng \`.position()\`.
4. HIỂN THỊ CÔNG THỨC TOÁN HỌC (QUAN TRỌNG): Môi trường đã được tích hợp MathJax. Hàm \`text()\` của p5.js KHÔNG render được công thức Toán. Do đó:
   - Nếu muốn viết công thức Toán học đẹp mắt (LaTeX), hãy dùng hàm \`let eq = createDiv(\`\\\\[ công thức \\\\]\`)\` trong hàm \`setup()\`. TUYỆT ĐỐI CHỈ DÙNG BACKTICK (dấu \`) để bọc chuỗi văn bản/công thức. KHÔNG DÙNG dấu nháy đơn '...' hay ngoặc kép "..." vì sẽ bị lỗi cú pháp SyntaxError khi chuỗi có dấu đạo hàm f'(x) hoặc khi chuỗi bị xuống dòng (multiline). Ví dụ ĐÚNG: \`let eq = createDiv(\`\\\\[ f'(x) = x^2 \\\\]\`);\`
   - BẮT BUỘC: Đặt vị trí hợp lý bằng \`eq.position(x, y)\` và phải thêm nền bằng \`eq.style("background-color", "rgba(255, 255, 255, 0.8)")\`, \`eq.style("padding", "5px")\` để đảm bảo KHÔNG BỊ TRÙNG LẶP (overlap) với chữ hay hình vẽ trên canvas. Hãy căn chỉnh x, y để công thức nằm ở góc trống.
   - Bắt buộc gọi \`if (window.MathJax) { MathJax.typeset(); }\` để render.
   - Các giá trị ĐỘNG (thay đổi liên tục theo thanh trượt) thì KHÔNG DÙNG MathJax (vì render 60fps sẽ lag), mà hãy dùng hàm \`text()\` của p5.js bình thường để hiển thị số.
5. Mã code phải là code độc lập (standalone), không gọi các file assets bên ngoài nếu không khả dụng.

[NỘI DUNG BÀI HỌC CẦN XỬ LÝ]
${lessonContent}`;

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          model: model || 'auto',
          apiKey: apiKey
        })
      });

      if (!res.ok) {
         const errData = await res.json().catch(() => ({}));
         throw new Error(errData.error || "Lỗi từ máy chủ API khi gọi mô hình.");
      }
      
      const data = await res.json();
      
      if (data.isFinished === false || data.finishReason === 'MAX_TOKENS') {
         throw new Error("Mã code sinh ra quá dài và bị cắt ngang (đạt giới hạn token). Vui lòng thử lại với nội dung hoặc kịch bản ngắn hơn.");
      }

      let text = data.text || '';
      
      const match = text.match(/```(?:javascript|js)?\s*\n([\s\S]*?)(?:```|$)/i) || text.match(/```\s*\n([\s\S]*?)(?:```|$)/i);
      let finalCode = match ? match[1].trim() : text.trim();
      finalCode = finalCode.replace(/^```[^\n]*\n?/gm, '').replace(/```$/gm, '').trim();

      setP5Code(finalCode);
      
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadHtml = () => {
    if (!p5Code) return;
    const blob = new Blob([getIframeSrcdoc()], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "simulation.html";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getIframeSrcdoc = () => {
    if (!p5Code) return '';
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; overflow: hidden; background-color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; }
    canvas { box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border-radius: 8px; }
    div { font-family: sans-serif; }
  </style>
  <script>
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      let friendlyMsg = msg;
      if (msg.includes("Unexpected end of input") || msg.includes("missing ) after argument list")) {
         friendlyMsg += "<br><br><span style='font-size: 14px; font-weight: normal; color: #555'>💡 <b>Gợi ý:</b> Lỗi này thường do AI sinh ra mã code bị thiếu phần cuối (có thể do giới hạn độ dài hoặc lỗi định dạng).<br>👉 Vui lòng ấn nút <b>Tạo mô phỏng</b> lại một lần nữa, hoặc chia nhỏ/đơn giản hóa nội dung bài học.</span>";
      }
      document.body.innerHTML = '<div style="color:red; padding: 20px; font-family: sans-serif; background: white; z-index: 9999; position: absolute; top:0; left:0; right:0; bottom:0; overflow-y: auto;"><b>Lỗi Runtime p5.js:</b><br><br>' + friendlyMsg + '<br><br><b>Dòng:</b> ' + lineNo + '</div>';
      return false;
    };
  </script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
  <script>
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
        displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
        processEscapes: true
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
      }
    };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-svg.js" id="MathJax-script"></script>
</head>
<body>
  <script>
    // Xóa try-catch để cho phép các biến toàn cục (let, const) và hàm setup() được khai báo ở mức toàn cục (global scope),
    // giúp p5.js có thể tìm thấy hàm setup() thay vì bị giam trong block scope của khối try {}.
    // Lỗi cú pháp hoặc runtime sẽ được window.onerror ở thẻ script phía trên bắt lại và hiển thị lên UI.
    ${p5Code.replace(/<\/script>/gi, '<\\/script>')}
  </script>
</body>
</html>
    `;
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
       <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 dark:text-orange-400">
            <MonitorPlay size={20} />
          </div>
          Tạo Mô Phỏng Tương Tác Tự Động
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-2xl mx-auto">
          Nhập nội dung bài học, định luật vật lý hoặc bài toán vào bên dưới, AI sẽ viết ứng dụng mô phỏng bằng p5.js cho phép học sinh tương tác thay đổi các thông số trực tiếp.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 h-full flex flex-col">
            <label className="font-bold text-slate-700 dark:text-slate-200 mb-2">Nội dung bài học/Định luật:</label>
            <textarea
              className="flex-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[300px] resize-y"
              placeholder="Ví dụ: Định luật bảo toàn động lượng, Con lắc đơn, Vẽ đồ thị hàm số bậc 2..."
              value={lessonContent}
              onChange={(e) => setLessonContent(e.target.value)}
            />
            <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full">
              <button
                onClick={() => { setLessonContent(''); setP5Code(''); setError(''); }}
                className="flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-2xl font-bold text-sm bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 shadow-sm shrink-0"
                title="Xóa làm lại - Bắt đầu lại từ đầu"
              >
                <RotateCcw size={18} />
                <span className="hidden sm:inline text-xs">Xóa làm lại</span>
              </button>
              <button
                onClick={handleEnhancePrompt}
                disabled={isProcessing || isEnhancing || !lessonContent.trim()}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-purple-500/20 ${
                  isProcessing || isEnhancing || !lessonContent.trim()
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500 shadow-none'
                    : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-purple-500/40 hover:-translate-y-0.5'
                }`}
              >
                {isEnhancing ? (
                  <><Loader2 size={18} className="animate-spin" /> Đang gợi ý...</>
                ) : (
                  <><Sparkles size={18} /> Gợi ý kịch bản chi tiết</>
                )}
              </button>
              <button
                onClick={handleGenerate}
                disabled={isProcessing || isEnhancing || !lessonContent.trim()}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-orange-500/20 ${
                  isProcessing || isEnhancing || !lessonContent.trim()
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500 shadow-none'
                    : 'bg-orange-600 text-white hover:bg-orange-700 hover:shadow-orange-500/40 hover:-translate-y-0.5'
                }`}
              >
                {isProcessing ? (
                  <><Loader2 size={18} className="animate-spin" /> Đang xây dựng...</>
                ) : (
                  <><Play size={18} fill="currentColor" /> Tạo mô phỏng</>
                )}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div className="font-medium">{error}</div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700 flex flex-col overflow-hidden min-h-[400px]">
          <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex justify-between items-center">
            <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Kết quả Mô phỏng (Interactive)</span>
            {p5Code && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setLessonContent(''); setP5Code(''); setError(''); }}
                  className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-1.5 shadow-2xs"
                  title="Xóa làm lại"
                >
                  <RotateCcw size={14} /> <span>Làm lại</span>
                </button>
                <button onClick={() => navigator.clipboard.writeText(p5Code)} className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-1.5">
                   <Copy size={14} /> Copy Source Code
                </button>
                <button onClick={downloadHtml} className="px-3 py-1.5 text-xs font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-1.5">
                   <Download size={14} /> Tải HTML
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 w-full relative bg-[#f8fafc] dark:bg-slate-950 flex items-center justify-center">
             {!p5Code && !isProcessing && (
               <div className="text-slate-400 dark:text-slate-500 text-sm text-center p-4">
                 Khung mô phỏng sẽ hiển thị ở đây
               </div>
             )}
             {isProcessing && (
               <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex flex-col items-center justify-center z-10 backdrop-blur-[2px]">
                 <Loader2 size={32} className="animate-spin text-orange-500 mb-2" />
                 <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">Đang nạp code p5.js...</span>
               </div>
             )}
             {p5Code && (
                <iframe
                  ref={iframeRef}
                  srcDoc={getIframeSrcdoc()}
                  title="Simulation Output"
                  className="w-full h-full border-0 absolute inset-0"
                  sandbox="allow-scripts allow-same-origin"
                />
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
