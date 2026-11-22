import React, { useState } from 'react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Loader2, 
  Download, 
  Copy, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Maximize2, 
  Compass, 
  Palette, 
  Layers, 
  Lightbulb, 
  BookOpen, 
  HelpCircle,
  Shapes,
  Eye,
  Sliders,
  CheckCircle2,
  Wand2
} from 'lucide-react';
import { callGeminiAI } from '../utils/gemini';
import { copyCroppedImageToClipboard, downloadCroppedImage } from '../utils/imageCropper';

interface Props {
  apiKey: string;
  model: string;
}

// 4 Chế độ tạo ảnh chuyên sâu cho môi trường giáo dục
export type EducationalImageMode = 
  | 'real_world_math'   // Mô hình & Bài toán Thực tế GDPT 2018 (Cổng parabol, bồn nước, hải đăng Oxyz...)
  | 'concept_pedagogy'  // Minh họa Khái niệm Sư phạm (Trang nhã, nền trắng, chuẩn slide/sách)
  | 'word_puzzle'       // Đố vui Nhìn hình đoán chữ Toán học (Ghép âm tiếng Việt khởi động tiết học)
  | 'custom_free';      // Tùy biến Sư phạm Tự do

// Phong cách hình ảnh sư phạm
export type PedagogicalStyle = 
  | 'clean_vector'      // Vector sư phạm trong sáng, tối giản (Chuẩn SGK & Slide)
  | 'real_3d'           // Mô hình 3D thực tế / Kỹ thuật chân thực
  | 'pixar_educational' // 3D hoạt hình Pixar giáo dục sinh động
  | 'print_sketch';     // Phác thảo đen trắng kỹ thuật (Tối ưu in ấn photocopy bài thi)

// Mẫu bài toán thực tế GDPT 2018 có sẵn 1-click
const EDUCATIONAL_PRESETS = [
  {
    mode: 'real_world_math' as EducationalImageMode,
    title: 'Cổng Parabol Kiến trúc',
    desc: 'Cổng vòm hình parabol trong khuôn viên trường học hoặc công viên',
    prompt: 'Một chiếc cổng chào trường học lớn hình parabol đối xứng chuẩn mực, kiến trúc bê tông hiện đại và thanh lịch, đặt giữa khuôn viên trường học Việt Nam sạch đẹp nhiều cây xanh.'
  },
  {
    mode: 'real_world_math' as EducationalImageMode,
    title: 'Cầu Treo Dây Văng (Toán 12)',
    desc: 'Cầu dây văng với dây cáp dạng cong parabol vắt qua hai trụ cầu lớn',
    prompt: 'Cây cầu treo dây văng bắc qua sông lớn với hai tháp trụ bê tông trắng sừng sững, các dây cáp thép căng vòm parabol đối xứng tuyệt đẹp, ánh nắng ban ngày trong trẻo.'
  },
  {
    mode: 'real_world_math' as EducationalImageMode,
    title: 'Bồn Nước Hình Trụ Tối Ưu',
    desc: 'Bài toán cực trị thể tích và diện tích toàn phần hình trụ',
    prompt: 'Một bồn chứa nước công nghiệp lớn bằng inox sáng bóng hình trụ tròn xoay đứng với hai đáy tròn, đặt trên bệ đỡ chắc chắn, mô phỏng bài toán tối ưu thể tích.'
  },
  {
    mode: 'real_world_math' as EducationalImageMode,
    title: 'Hải Đăng & Góc Chiếu (Oxyz)',
    desc: 'Ngọn hải đăng ven biển chiếu chùm sáng nón quét trên mặt biển',
    prompt: 'Một ngọn hải đăng màu trắng sọc đỏ cao vút đứng trên mỏm đá bên bờ biển, đèn chiếu một chùm sáng hình nón rộng quét ra mặt biển xanh phẳng lặng.'
  },
  {
    mode: 'concept_pedagogy' as EducationalImageMode,
    title: 'Khái niệm Véc-tơ trong Không gian',
    desc: 'Hệ trục tọa độ Oxyz với các mũi tên véc-tơ màu sắc tương phản rõ ràng',
    prompt: 'Hệ trục tọa độ không gian ba chiều Oxyz với ba trục vuông góc rõ nét, có các mũi tên véc-tơ chỉ phương 3D màu đỏ và xanh dương nổi bật trên nền trắng sạch.'
  },
  {
    mode: 'word_puzzle' as EducationalImageMode,
    title: 'Đố chữ: Đạo Hàm',
    desc: 'Hình ảnh đạo sĩ đứng cạnh mô hình chiếc hàm răng sạch đẹp',
    prompt: 'Đạo hàm'
  },
  {
    mode: 'word_puzzle' as EducationalImageMode,
    title: 'Đố chữ: Tích Phân',
    desc: 'Hình ảnh chiếc đồng hồ tích tắc bên cạnh bao phân bón cây trồng',
    prompt: 'Tích phân'
  },
  {
    mode: 'concept_pedagogy' as EducationalImageMode,
    title: 'Khối Tròn Xoay Cắt Lát',
    desc: 'Khối nón bị mặt phẳng cắt ngang tạo ra thiết diện đường tròn và elip',
    prompt: 'Một khối nón hình học màu lam nhạt trong suốt bị một mặt phẳng phẳng cắt ngang chéo, làm lộ rõ thiết diện hình elip viền đỏ nổi bật trên nền trắng tinh tế.'
  }
];

export default function IllustrationGenerator({ apiKey, model }: Props) {
  const [mode, setMode] = useState<EducationalImageMode>('real_world_math');
  const [style, setStyle] = useState<PedagogicalStyle>('clean_vector');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '4:3' | '3:4'>('1:1');
  
  const [inputContent, setInputContent] = useState<string>('Một chiếc cổng chào trường học hình parabol đối xứng, kiến trúc hiện đại thanh lịch.');
  const [pedagogicalDraft, setPedagogicalDraft] = useState<string>('');
  
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>('');
  const [finalAiPrompt, setFinalAiPrompt] = useState<string>('');
  const [engineUsed, setEngineUsed] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);

  // Chọn mẫu có sẵn 1-click
  const handleSelectPreset = (preset: typeof EDUCATIONAL_PRESETS[0]) => {
    setMode(preset.mode);
    setInputContent(preset.prompt);
    setPedagogicalDraft('');
    setError('');
  };

  // Bước 1: AI Phân tích & Tối ưu hóa Sư phạm (Tạo Prompt nghệ thuật tối ưu giáo dục)
  const handleAnalyzeAndEnhance = async () => {
    if (!inputContent.trim()) {
      setError('Vui lòng nhập nội dung hoặc chọn mẫu bài toán cần minh họa.');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      let systemPrompt = '';

      if (mode === 'real_world_math') {
        systemPrompt = `Bạn là Chuyên gia Đồ họa Giáo dục & Thiết kế Trực quan Toán học THPT (Chương trình mới GDPT 2018).
Người dùng muốn tạo hình ảnh mô phỏng bài toán thực tế: "${inputContent.trim()}".

NHIỆM VỤ CỦA BẠN:
Hãy viết một kịch bản mô tả hình ảnh TIẾNG ANH chuyên sâu để AI đồ họa (Google Imagen 3 / Flux) vẽ ra hình ảnh trực quan, thẩm mỹ, phù hợp nhất với môi trường giáo dục.
YÊU CẦU BẮT BUỘC (QUY TẮC SƯ PHẠM VÀNG):
1. ĐỐI TƯỢNG TOÁN HỌC TRỌNG TÂM: Tập trung rõ ràng vào vật thể toán học chính (như hình parabol, hình nón, bồn trụ, mặt phẳng Oxyz, hải đăng...).
2. BỐ CỤC SƯ PHẠM: Góc nhìn phối cảnh 3D trực quan (isometric hoặc 3/4 perspective), ánh sáng ban ngày tự nhiên, rõ ràng, không bị che khuất.
3. PHONG CÁCH TỐI GIẢN & SẠCH SẼ: Nền trắng tinh khôi hoặc nền trời sáng nhẹ nhàng (solid white or clean daylight background), không có chi tiết thừa thãi gây phân tâm học sinh.
4. KHÔNG VẼ CHỮ HOẶC KÝ HIỆU TOÁN DỄ BỊ LỖI CHÍNH TẢ: Tránh yêu cầu AI in các công thức toán dài dòng lên tranh vì AI hay viết sai chữ. Hãy tập trung vào mô hình vật lý/kiến trúc trực quan đẹp mắt.
5. AN TOÀN TUYỆT ĐỐI CHO MÔI TRƯỜNG HỌC ĐƯỜNG: Không bạo lực, tông màu tươi sáng, trang nhã.

CHỈ TRẢ VỀ DUY NHẤT 1 ĐOẠN PROMPT TIẾNG ANH (Không chào hỏi, không giải thích). Nối thêm các từ khóa: "high quality pedagogical educational illustration, clear mathematics model, clean white background, beautiful soft lighting, highly detailed 8k render".`;

      } else if (mode === 'concept_pedagogy') {
        systemPrompt = `Bạn là Chuyên gia Thiết kế Bài giảng Sách Giáo Khoa & Slide Thuyết Trình.
Người dùng muốn minh họa khái niệm học tập: "${inputContent.trim()}".

NHIỆM VỤ CỦA BẠN:
Viết 1 đoạn Prompt tiếng Anh ngắn gọn, súc tích để vẽ bức tranh minh họa khái niệm này.
YÊU CẦU:
1. Hình ảnh sư phạm, trong sáng, màu sắc nhã nhặn, hài hòa.
2. Nền trắng hoàn toàn (isolated on clean solid white background) để thầy cô dễ cắt dán vào đề thi Word hoặc bài trình chiếu PowerPoint.
3. Bố cục cân đối ở trung tâm.
4. Trả về DUY NHẤT đoạn mô tả bằng tiếng Anh, nối thêm: "pedagogical textbook illustration, clean flat design, elegant colors, isolated on solid pure white background, master quality".`;

      } else if (mode === 'word_puzzle') {
        systemPrompt = `Bạn là Chuyên gia Thiết kế Trò chơi Học đường "Đuổi hình bắt chữ" cho học sinh THPT.
Khái niệm học tập: "${inputContent.trim()}".

NHIỆM VỤ:
Nghĩ ra 2 đồ vật/biểu tượng độc lập trong TIẾNG VIỆT ĐỒNG ÂM ĐÚNG TỪNG ÂM TIẾT với khái niệm (Ví dụ: "Đạo hàm" -> Một vị đạo sĩ đứng cạnh một mô hình chiếc răng khổng lồ).
Sau đó chuyển thành 1 câu Prompt tiếng Anh miêu tả 2 đồ vật đó đặt cạnh nhau trên nền trắng.
YÊU CẦU:
1. Đặt 2 đối tượng cạnh nhau (side-by-side) trên nền trắng tinh khiết.
2. Không thêm chi tiết lộn xộn.
3. Trả về DUY NHẤT đoạn Prompt tiếng Anh nối thêm: "cute friendly educational 3d cartoon style, Pixar aesthetic, isolated on pure white background, masterpiece".`;

      } else {
        systemPrompt = `Bạn là Chuyên gia Prompt AI Đồ Họa Giáo Dục.
Yêu cầu của giáo viên: "${inputContent.trim()}".
Hãy chuyển thể yêu cầu trên thành 1 câu Prompt tiếng Anh hoàn hảo, chuẩn mực sư phạm, tông màu tươi sáng, chi tiết sắc nét, nền sạch sẽ.
Chỉ trả về duy nhất đoạn văn tiếng Anh.`;
      }

      const generatedDraft = await callGeminiAI(systemPrompt, model || 'auto');
      let cleaned = generatedDraft.trim();
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.substring(1, cleaned.length - 1);
      }
      setPedagogicalDraft(cleaned);

    } catch (err: any) {
      setError(err.message || 'Lỗi khi phân tích kịch bản sư phạm.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Bước 2: Tạo ảnh (Gọi Dual Engine: Google Imagen 3 + Pollinations Flux Fallback)
  const handleGenerateImage = async () => {
    const promptToUse = pedagogicalDraft.trim() || inputContent.trim();
    if (!promptToUse) {
      setError('Vui lòng nhập nội dung mô tả bức tranh.');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedImageUrl('');
    setCopied(false);

    // Bổ sung phong cách lựa chọn vào prompt
    let styleKeyword = '';
    if (style === 'clean_vector') {
      styleKeyword = ', clean modern pedagogical vector illustration, flat art, smooth lines, educational textbook style';
    } else if (style === 'real_3d') {
      styleKeyword = ', photorealistic 3D engineering render, realistic physical architecture model, cinema 4D, octane render, daylight';
    } else if (style === 'pixar_educational') {
      styleKeyword = ', high quality 3D Pixar Disney style, vibrant cheerful educational cartoon, friendly soft lighting';
    } else if (style === 'print_sketch') {
      styleKeyword = ', technical black and white architectural line sketch, blueprint drawing, clean contour lines, monochrome';
    }

    const fullPrompt = `${promptToUse}${styleKeyword}`;
    setFinalAiPrompt(fullPrompt);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          apiKey: apiKey || localStorage.getItem('gemini_api_key') || undefined,
          aspectRatio: aspectRatio
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}: Không thể tạo ảnh.`);
      }

      const data = await response.json();
      if (!data.imageUrl) {
        throw new Error('Máy chủ phản hồi nhưng không có dữ liệu hình ảnh.');
      }

      setGeneratedImageUrl(data.imageUrl);
      setEngineUsed(data.engine === 'google-imagen-3' ? 'Google Imagen 3 (Chính thức)' : 'Pollinations Flux HD (Tốc độ cao)');

    } catch (err: any) {
      console.warn("Lỗi tạo ảnh qua server, thử fallback trực tiếp:", err);
      // Fallback trực tiếp phía Client nếu server gặp sự cố mạng
      try {
        const [w, h] = aspectRatio === '16:9' ? [1280, 720] : aspectRatio === '4:3' ? [1024, 768] : aspectRatio === '3:4' ? [768, 1024] : [1024, 1024];
        const seed = Math.floor(Math.random() * 10000000);
        const encoded = encodeURIComponent(fullPrompt);
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encoded}?nologo=true&seed=${seed}&width=${w}&height=${h}&model=flux&enhance=true`;
        setGeneratedImageUrl(fallbackUrl);
        setEngineUsed('Pollinations Flux HD (Dự phòng)');
      } catch (fallbackErr: any) {
        setError(err.message || 'Không thể tạo hình ảnh lúc này. Vui lòng thử lại.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Sao chép ảnh vào Clipboard (Tự động cắt sát bao hình padding ~24px, nhúng 300 DPI tối ưu Word)
  const handleCopyImage = async () => {
    if (!generatedImageUrl) return;
    try {
      setCopied(false);
      const ok = await copyCroppedImageToClipboard(generatedImageUrl, 300, 24);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch (e) {
      console.warn("Lỗi sao chép ảnh:", e);
    }
  };

  // Tải ảnh về máy (cắt sát viền 24px, 300 DPI)
  const handleDownload = async () => {
    if (!generatedImageUrl) return;
    await downloadCroppedImage(generatedImageUrl, `Hinh_Anh_Giao_Duc_${Date.now()}.png`, 300, 24);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* BANNER GIỚI THIỆU CÔNG CỤ */}
      <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white tracking-wide uppercase">
              <Sparkles size={14} className="animate-spin" />
              Công nghệ AI Tạo Hình Ảnh Giáo Dục 2026
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              Tạo Hình Ảnh & Minh Họa Giáo Dục
            </h2>
            <p className="text-xs sm:text-sm text-pink-50 leading-relaxed font-medium">
              Tối ưu cho giáo viên THPT: Trực quan hóa bài toán thực tế (Cổng parabol, bồn nước, hải đăng Oxyz), minh họa bài giảng trên nền trắng chuẩn mực, và trò chơi đố chữ toán học.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-pink-100">Độ phân giải</div>
              <div className="text-base font-black">HD 1024+</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-pink-100">Động cơ kép</div>
              <div className="text-base font-black">Imagen 3 & Flux</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-pink-100">Xuất tài liệu</div>
              <div className="text-base font-black">Word / PPT 1-Click</div>
            </div>
          </div>
        </div>
      </div>

      {/* THÔNG BÁO LỖI NẾU CÓ */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3 text-rose-700 dark:text-rose-300 text-xs sm:text-sm animate-fade-in shadow-xs">
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-500" />
          <div className="font-medium flex-1">{error}</div>
        </div>
      )}

      {/* KHÔNG GIAN LÀM VIỆC CHÍNH (2 CỘT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* CỘT TRÁI: BẢNG ĐIỀU KHIỂN & SOẠN THẢO (7 CỘT) */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-5 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          
          {/* CHỌN CHẾ ĐỘ GIÁO DỤC */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Shapes size={14} className="text-pink-600 dark:text-pink-400" />
              1. Mục đích hình ảnh giáo dục
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'real_world_math', label: 'Bài toán thực tế', desc: 'Parabol, bồn trụ, Oxyz' },
                { id: 'concept_pedagogy', label: 'Khái niệm & Slide', desc: 'Nền trắng, chuẩn SGK' },
                { id: 'word_puzzle', label: 'Đố chữ khởi động', desc: 'Đuổi hình bắt chữ' },
                { id: 'custom_free', label: 'Tùy biến tự do', desc: 'Theo ý giáo viên' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setMode(m.id as EducationalImageMode); setPedagogicalDraft(''); }}
                  className={`p-2.5 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                    mode === m.id
                      ? 'border-pink-500 bg-pink-50/70 dark:bg-pink-950/40 ring-1 ring-pink-500'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className={`text-xs font-bold ${mode === m.id ? 'text-pink-900 dark:text-pink-100 font-extrabold' : 'text-slate-800 dark:text-slate-200'}`}>
                    {m.label}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">
                    {m.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* GỢI Ý MẪU BÀI TOÁN THỰC TẾ 1-CLICK */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Lightbulb size={14} className="text-amber-500" />
                Mẫu gợi ý giáo dục GDPT 2018 (Bấm để điền nhanh)
              </label>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {EDUCATIONAL_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-pink-50 hover:text-pink-600 dark:hover:bg-pink-950/50 dark:hover:text-pink-300 text-[11px] font-semibold whitespace-nowrap transition border border-transparent hover:border-pink-300 shrink-0"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* KHUNG NHẬP NỘI DUNG YÊU CẦU */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <BookOpen size={14} className="text-teal-600" />
              2. Mô tả bài toán hoặc ý tưởng (Tiếng Việt)
            </label>
            <textarea
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              placeholder="Ví dụ: Một cổng trường học hình parabol đối xứng cao 6m và rộng 8m..."
              rows={3}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none transition"
            />
            
            <button
              type="button"
              onClick={handleAnalyzeAndEnhance}
              disabled={isAnalyzing || isGenerating || !inputContent.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 dark:bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-xs"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={15} className="animate-spin text-pink-400" />
                  <span>AI đang phân tích chuẩn hóa sư phạm...</span>
                </>
              ) : (
                <>
                  <Wand2 size={15} className="text-pink-400" />
                  <span>Bước 1: Tối ưu kịch bản sư phạm bằng AI (Tự động)</span>
                </>
              )}
            </button>
          </div>

          {/* KHUNG KỊCH BẢN PROMPT NGHỆ THUẬT (CÓ THỂ CHỈNH SỬA) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Compass size={14} className="text-purple-500" />
                3. Kịch bản Prompt tiếng Anh (Đã tối ưu cho AI vẽ tranh)
              </label>
              <span className="text-[10px] text-slate-400">Có thể tinh chỉnh tự do</span>
            </div>
            <textarea
              value={pedagogicalDraft}
              onChange={(e) => setPedagogicalDraft(e.target.value)}
              placeholder="Bấm nút [Bước 1] ở trên để AI tự động chuyển hóa ý tưởng của bạn thành câu lệnh vẽ tranh chuẩn sư phạm..."
              rows={3}
              className="w-full bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 rounded-2xl p-3 text-xs font-mono text-purple-900 dark:text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none transition"
            />
          </div>

          {/* TÙY CHỌN TỶ LỆ & PHONG CÁCH */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-slate-100 dark:border-slate-800">
            {/* Tỷ lệ */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Sliders size={13} className="text-pink-500" />
                Tỷ lệ khung hình
              </label>
              <div className="grid grid-cols-4 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {[
                  { id: '1:1', label: '1:1', sub: 'Đề thi' },
                  { id: '16:9', label: '16:9', sub: 'Slide' },
                  { id: '4:3', label: '4:3', sub: 'Giáo án' },
                  { id: '3:4', label: '3:4', sub: 'Khổ dọc' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setAspectRatio(r.id as any)}
                    className={`py-1.5 rounded-lg text-center transition-all ${
                      aspectRatio === r.id
                        ? 'bg-white dark:bg-slate-900 text-pink-600 dark:text-pink-400 shadow-2xs font-extrabold text-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 text-xs font-medium'
                    }`}
                  >
                    <div>{r.label}</div>
                    <div className="text-[8px] text-slate-400">{r.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Phong cách */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Palette size={13} className="text-pink-500" />
                Phong cách đồ họa
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as PedagogicalStyle)}
                className="w-full py-2.5 px-3 bg-slate-100 dark:bg-slate-800 border border-transparent rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="clean_vector">Minh họa Sư phạm Vector (Chuẩn SGK & Slide)</option>
                <option value="real_3d">Mô hình 3D Thực tế / Kỹ thuật (Chân thực)</option>
                <option value="pixar_educational">Hoạt hình Giáo dục 3D Pixar (Sinh động)</option>
                <option value="print_sketch">Phác thảo Kỹ thuật Đen Trắng (In đề thi)</option>
              </select>
            </div>
          </div>

          {/* NÚT THỰC THI VẼ ẢNH */}
          <button
            type="button"
            onClick={handleGenerateImage}
            disabled={isGenerating || (!pedagogicalDraft.trim() && !inputContent.trim())}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 active:scale-98"
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Đang kết nối Động cơ AI và khởi tạo bức tranh HD...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Bước 2: Tiến Hành Tạo Hình Ảnh Giáo Dục Ngay!</span>
              </>
            )}
          </button>
        </div>

        {/* CỘT PHẢI: KHUNG XUẤT HÌNH ẢNH & THAO TÁC SƯ PHẠM (5 CỘT) */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col min-h-[460px] justify-between">
            
            {/* Header khung xem trước */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon size={16} className="text-pink-600" />
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                  Kết quả Hình ảnh AI
                </span>
              </div>

              {engineUsed && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-pink-50 dark:bg-pink-950 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
                  {engineUsed}
                </span>
              )}
            </div>

            {/* Vùng hiển thị ảnh chính */}
            <div className="flex-1 flex items-center justify-center py-4 relative group">
              {isGenerating ? (
                <div className="text-center space-y-3 py-12">
                  <div className="w-14 h-14 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto shadow-md" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Đang tạo hình ảnh...</p>
                    <p className="text-[11px] text-slate-400">Áp dụng chuẩn sư phạm & tối ưu hóa góc nhìn</p>
                  </div>
                </div>
              ) : generatedImageUrl ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <img
                    src={generatedImageUrl}
                    alt="Minh họa giáo dục"
                    className="max-h-[380px] w-auto max-w-full object-contain rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 bg-white"
                  />
                  
                  <button
                    type="button"
                    onClick={() => setPreviewModalOpen(true)}
                    className="absolute top-2 right-2 p-2 bg-slate-900/70 hover:bg-slate-900 text-white rounded-xl backdrop-blur-sm opacity-0 group-hover:opacity-100 transition shadow"
                    title="Phóng to toàn màn hình"
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-3 py-16 px-4">
                  <div className="w-16 h-16 rounded-3xl bg-pink-50 dark:bg-pink-950/50 text-pink-500 flex items-center justify-center mx-auto shadow-inner">
                    <ImageIcon size={32} className="opacity-60" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Bức tranh sẽ xuất hiện tại đây</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Chọn một mẫu bài toán thực tế bên trái hoặc nhập nội dung bài học rồi ấn nút tạo ảnh.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* CÁC NÚT THAO TÁC TIỆN ÍCH DÀNH CHO GIÁO VIÊN */}
            {generatedImageUrl && (
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  {/* Nút Sao chép vào Clipboard (Ctrl + V dán thẳng vào Word/PPT) */}
                  <button
                    type="button"
                    onClick={handleCopyImage}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-teal-600 hover:bg-teal-700 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check size={15} />
                        <span>Đã copy! Dán vào Word ngay</span>
                      </>
                    ) : (
                      <>
                        <Copy size={15} />
                        <span>Copy ảnh (Dán Word / PPT)</span>
                      </>
                    )}
                  </button>

                  {/* Nút Tải ảnh HD */}
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Download size={15} />
                    <span>Tải ảnh PNG (HD)</span>
                  </button>
                </div>

                {/* Nút Tạo lại biến thể khác */}
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={isGenerating}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <RefreshCw size={13} className={isGenerating ? "animate-spin" : ""} />
                  <span>Tạo lại góc nhìn khác (Đổi biến thể)</span>
                </button>
              </div>
            )}
          </div>

          {/* LỜI NHẮC HƯỚNG DẪN DÀNH CHO GIÁO VIÊN */}
          <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-4 text-[11px] text-amber-900 dark:text-amber-200 space-y-1.5 leading-relaxed">
            <div className="font-extrabold flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-amber-800 dark:text-amber-300">
              <CheckCircle2 size={13} className="text-amber-600" />
              Mẹo sư phạm khi sử dụng ảnh:
            </div>
            <ul className="list-disc pl-4 space-y-1 text-amber-800/90 dark:text-amber-300/90">
              <li>Bấm nút <strong>Copy ảnh</strong> rồi mở Word (hoặc PowerPoint) bấm <strong>Ctrl + V</strong> để chèn ngay vào đề thi hoặc bài thuyết trình.</li>
              <li>Đối với đề thi in đen trắng, hãy chọn phong cách <strong>Phác thảo Kỹ thuật Đen Trắng</strong> để khi photocopy bài kiểm tra hình vẽ sắc nét, không bị đen mực.</li>
              <li>Hệ thống tự động sử dụng <strong>Google Imagen 3</strong> chính hãng khi có API Key, và tự động dự phòng sang <strong>Flux HD</strong> nên không bao giờ bị nghẽn mạng.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* MODAL PHÓNG TO XEM ẢNH FULL MÀN HÌNH */}
      {previewModalOpen && generatedImageUrl && (
        <div 
          onClick={() => setPreviewModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in cursor-zoom-out"
        >
          <div className="relative max-w-5xl w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={generatedImageUrl}
              alt="Phóng to minh họa"
              className="max-h-[85vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl"
            />
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleCopyImage}
                className="py-2 px-4 rounded-xl bg-teal-600 text-white font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <Copy size={14} />
                <span>{copied ? 'Đã copy!' : 'Sao chép ảnh'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="py-2 px-4 rounded-xl bg-white text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <Download size={14} />
                <span>Tải ảnh PNG</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="py-2 px-4 rounded-xl bg-slate-800 text-white font-bold text-xs shadow"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
