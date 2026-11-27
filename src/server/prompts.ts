/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const MAU_DE_HE_THONG_TABLE_PROMPT = `
- YÊU CẦU BẮT BUỘC VỀ ĐÁP ÁN & LỜI GIẢI (TUYỆT ĐỐI THEO MẪU HỆ THỐNG - mau_de_he_thong):
Sau khi kết thúc các câu hỏi của đề thi, BẮT BUỘC PHẢI CÓ DÒNG PHÂN CÁCH NÀY TRƯỚC TIÊN:
---------------------------HẾT------------------------

Sau đó, phần BẢNG ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT BẮT BUỘC TRÌNH BÀY CHÍNH XÁC 100% THEO CẤU TRÚC 3 PHẦN DƯỚI ĐÂY (KHÔNG ĐƯỢC THAY ĐỔI CẤU TRÚC BẢNG VÀ TIÊU ĐỀ):

PHẦN I. Câu trắc nghiệm một đáp án đúng 
| Câu   | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10   | 11   | 12   |
| Chọn   | D   | A   | ... |

Lời giải
Câu 1: A đúng vì….	
Câu 2: B đúng vì….	

PHẦN II. Câu trắc nghiệm đúng sai. 
| Câu 1   | Câu 2   | Câu 3   | Câu 4   |
| a) Đ   | a) Đ   | a) Đ   | a) Đ   |
| b) S   | b) S   | b) S   | b) S   |
| c) S   | c) S   | c) S   | c) S   |
| d) Đ   | d) S   | d) Đ   | d) Đ   |

Lời giải
Câu 1: A đúng vì….	
Câu 2: B đúng vì….	

PHẦN III. Câu trắc nghiệm trả lời ngắn. 
| Câu   | 1   | 2   | 3   | 4   | 5   | 6   |
| Chọn   | 10   | 31   | ... |

Lời giải
Câu 1: Ta có ….	
Câu 2: Ta có ….	
`;

export const MAU_DE_HE_THONG_INLINE_PROMPT = `
- YÊU CẦU BẮT BUỘC VỀ ĐÁP ÁN & LỜI GIẢI (THEO MẪU ĐỀ RÚT GỌN - GẠCH CHÂN ĐÁP ÁN ĐÚNG LIỀN CÂU):
Thay vì có bảng đáp án ở cuối, hãy trình bày đáp án và lời giải liền ngay sau mỗi câu hỏi:

1. PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn:
- Gạch chân đáp án đúng bằng thẻ <u>...</u> (Ví dụ: <u>A.</u> Số 2 là số nguyên.   B. Số 2 là số hữu tỉ.)
- Ngay dưới các phương án, ghi:
Lời giải:
Mệnh đề A đúng vì...

2. PHẦN II. Câu trắc nghiệm đúng sai:
- Gạch chân các ý ĐÚNG bằng thẻ <u>...</u> (Ví dụ nếu ý a và c đúng thì ghi: <u>a)</u> ..., b) ..., <u>c)</u> ..., d) ...)
- Ngay dưới 4 ý, ghi:
Lời giải
A đúng vì.... (hoặc a) Đúng vì...)

3. PHẦN III. Câu trắc nghiệm trả lời ngắn:
- Ngay dưới câu hỏi, ghi:
Lời giải
Đáp án: [Giá trị đáp án, ví dụ: 5 hoặc 31]
Giải thích:
Ta có như sau:....
`;

export function getAnswerPrompt(format: string = 'table'): string {
  return format === 'inline' ? MAU_DE_HE_THONG_INLINE_PROMPT : MAU_DE_HE_THONG_TABLE_PROMPT;
}

export interface DocumentPromptParams {
  sourceType: 'pdf' | 'word';
  parsingMode?: string;
  customPrompt?: string;
  includeShortSolution?: boolean;
  examCount?: number;
  contextSuggestion?: string;
  matrixConfig?: string;
  continueFromText?: string;
  textContent?: string;
  subject?: string;
  grade?: string;
  lesson?: string;
  keepOriginalDiagrams?: boolean;
  answerFormat?: string;
}

export function buildDocumentPrompt(params: DocumentPromptParams): string {
  const {
    sourceType,
    parsingMode = 'normal',
    customPrompt = '',
    includeShortSolution = false,
    examCount = 1,
    contextSuggestion = '',
    matrixConfig = '[]',
    continueFromText = '',
    textContent = '',
    subject = '',
    grade = '',
    lesson = '',
    keepOriginalDiagrams = false,
    answerFormat = 'table',
  } = params;

  const isWord = sourceType === 'word';
  let prompt = '';

  if (customPrompt) {
    prompt = customPrompt;
  } else if (parsingMode === 'mindmap') {
    prompt = `Bạn là một Chuyên gia Trích xuất và Hệ thống hóa Kiến thức Giáo dục.
Nhiệm vụ: Hãy đọc kỹ toàn bộ tài liệu/file PDF đính kèm và trích xuất toàn bộ cấu trúc kiến thức thành Sơ đồ tư duy dạng Markmap (Markdown).

[QUY TẮC BẮT BUỘC KHẮT KHE - TUYỆT ĐỐI KHÔNG SÁNG TÁC]:
1. CHỈ TRÍCH XUẤT 100% THÔNG TIN CÓ TRONG TÀI LIỆU ĐƯỢC CUNG CẤP.
2. TUYỆT ĐỐI KHÔNG TỰ Ý SÁNG TÁC, KHÔNG ĐƯA THÊM KIẾN THỨC BÊN NGOÀI, KHÔNG SUY DIỄN HOẶC TỰ BỊA RA NỘI DUNG MÀ TÀI LIỆU KHÔNG ĐỀ CẬP.
3. Bám sát đúng các đề mục lớn, đề mục nhỏ, định nghĩa, định lý, công thức và phân loại có sẵn trong tài liệu.
4. Cấu trúc Markmap: Mã phải được đặt trong một khối code \`\`\`markdown ... \`\`\` duy nhất. Không thêm lời dẫn giải.
5. Bắt buộc có YAML frontmatter ở đầu:
---
markmap:
  colorScheme: default
  math: katex
---
6. Phân cấp chuẩn: \`#\` cho Tên bài học trong tài liệu, \`##\` cho các phần chính (I, II, III...), \`###\` cho các mục nhỏ (1, 2, 3...), và \`-\` cho các chi tiết/công thức.
7. Mọi công thức Toán học phải bọc trong $...$ hoặc $$...$$. Ký hiệu vectơ dùng \\overrightarrow{...}.`;
  } else if (parsingMode === 'video_prompt') {
    prompt = `Bạn là Chuyên gia Sư phạm và Kỹ thuật Prompt Engineering cho tính năng Video Overview của Google NotebookLM.
Hãy đọc kỹ toàn bộ nội dung tài liệu bài học (PDF/hình ảnh) được đính kèm.
Nhiệm vụ của bạn: Hãy phân tích các kiến thức cơ bản nhất, định nghĩa, định lý, công thức và CÁC HÌNH VẼ MINH HỌA LÝ THUYẾT (nếu có) trong tài liệu này và VIẾT RA MỘT BẢN CÂU LỆNH (PROMPT) CHỈ ĐẠO HOÀN CHỈNH để người dùng dán vào mục "Tuỳ chỉnh bản Tổng quan bằng video" của Google NotebookLM.
${contextSuggestion ? `YÊU CẦU ĐẶC BIỆT: ${contextSuggestion}` : ''}

QUY TẮC CỐT LÕI (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT):
- CHỈ TẬP TRUNG VÀO KIẾN THỨC CƠ BẢN NHẤT: Trình bày và làm rõ bản chất các khái niệm nền tảng, định nghĩa, định lý, tính chất và công thức cốt lõi nhất.
- TUYỆT ĐỐI KHÔNG ĐƯA VÍ DỤ: Không đưa ví dụ bài tập, không giải bài mẫu, không phân tích ví dụ áp dụng hay bài toán minh họa. Video chỉ thuần túy truyền tải lý thuyết kiến thức trọng tâm.
- HÌNH VẼ MINH HỌA LÝ THUYẾT (KHI TÀI LIỆU CÓ HÌNH ẢNH TƯƠNG ỨNG): Nếu tài liệu tải lên có hình vẽ, hình học, sơ đồ hoặc đồ thị minh họa cho lý thuyết, câu lệnh BẮT BUỘC phải chỉ đạo NotebookLM đưa và mô tả chi tiết hình vẽ minh họa tương ứng đó vào đúng phần lý thuyết (mô tả các yếu tố hình học, điểm, đường nét, góc, vectơ, đồ thị...) để minh họa trực quan cho định nghĩa/định lý.

CẤU TRÚC CÂU LỆNH YÊU CẦU CHO NOTEBOOKLM:
1. Định vị bài giảng và mục tiêu lý thuyết cốt lõi của video.
2. Cấu trúc kịch bản video phân đoạn:
   - Mở đầu: Gợi mở ngắn gọn dẫn dắt vào bài học.
   - Trọng tâm lý thuyết cơ bản nhất (Kèm hình vẽ minh họa tương ứng từ tài liệu nếu có): Giảng giải bản chất kiến thức cơ bản nhất dựa trên tài liệu đính kèm. Kết hợp hiển thị và mô tả hình vẽ minh họa tương ứng từ tài liệu để làm rõ lý thuyết.
   - Yêu cầu cấu trúc: Tập trung 100% vào lý thuyết cốt lõi; Tuyệt đối KHÔNG đưa ví dụ mẫu hay bài tập minh họa.
   - Cảnh báo bẫy sai lầm: Lưu ý 1-2 lỗi học sinh hay hiểu sai về mặt khái niệm, công thức hoặc hình vẽ.
   - Tóm tắt: Nhắc lại các công thức vàng, hình vẽ cốt lõi và kiến thức trọng tâm cần nhớ.
3. Hướng dẫn trực quan: Tận dụng tối đa hình vẽ minh họa trong tài liệu tương ứng với lý thuyết; hiển thị rõ ràng công thức Toán học/khoa học, sơ đồ bảng phấn trực quan.
4. Phong cách giọng điệu thân thiện, sư phạm, bằng Tiếng Việt chuẩn mực, cô đọng, dễ hiểu.

CHỈ TRẢ VỀ DUY NHẤT ĐOẠN CÂU LỆNH ĐỂ DÁN VÀO NOTEBOOKLM, KHÔNG THÊM LỜI DẪN.`;
  } else if (parsingMode === 'normal') {
    prompt = isWord
      ? `Bạn là một chuyên gia OCR Toán học. Nhiệm vụ của bạn là chuẩn hóa nội dung văn bản (đã được bóc tách từ file Word) sang Markdown và LaTeX chuẩn.
BẮT BUỘC TUÂN THỦ CÁC QUY ĐỊNH SAU ĐỂ HỆ THỐNG XỬ LÝ (NẾU KHÔNG SẼ BỊ LỖI):
1. Về Công thức Toán học: Văn bản đầu vào có thể chứa mã MathML thô hoặc công thức bị lỗi. Hãy chuyển TẤT CẢ chúng sang mã LaTeX chuẩn. Công thức nội dòng bọc bằng $...$, công thức độc lập bọc bằng $$...$$.
2. Về Cấu trúc Đề thi (Nếu tài liệu là đề thi trắc nghiệm):
   - Mở đầu mỗi câu hỏi PHẢI là "Câu X:" (Ví dụ: Câu 1:, Câu 2:).
   - 4 đáp án bắt buộc phải bắt đầu bằng "A.", "B.", "C.", "D." và nằm trên các dòng riêng biệt.
   - Nếu có lời giải chi tiết, phải bắt đầu bằng cụm từ "Lời giải:" ở dòng mới.
3. Về Cấu trúc Văn bản: Giữ nguyên các đoạn văn. Không tự ý cắt bớt chữ.
4. Output "Sạch": KHÔNG thêm bất kỳ câu giao tiếp nào (ví dụ: "Dưới đây là kết quả...", "Đã hoàn thành..."). CHỈ trả về đúng nội dung đã bóc tách.`
      : `Bạn là một chuyên gia OCR Toán học. Nhiệm vụ của bạn là bóc tách toàn bộ nội dung văn bản và công thức từ hình ảnh/tài liệu được cung cấp.
BẮT BUỘC TUÂN THỦ CÁC QUY ĐỊNH SAU ĐỂ HỆ THỐNG XỬ LÝ (NẾU KHÔNG SẼ BỊ LỖI):
1. Về Công thức Toán học: Chuyển TẤT CẢ các biểu thức toán học sang mã LaTeX chuẩn. Công thức nội dòng bọc bằng $...$, công thức độc lập bọc bằng $$...$$. Tuyệt đối không dùng ký hiệu Unicode cho các công thức đặc biệt (ví dụ: dùng $\\sqrt{x}$ thay vì √x, $\\Delta$ thay vì Δ, v.v.).
2. Về Cấu trúc Đề thi (Nếu tài liệu là đề thi trắc nghiệm):
   - Mở đầu mỗi câu hỏi PHẢI là "Câu X:" (Ví dụ: Câu 1:, Câu 2:).
   - 4 đáp án bắt buộc phải bắt đầu bằng "A.", "B.", "C.", "D." và nằm trên các dòng riêng biệt.
   - Nếu có lời giải chi tiết, phải bắt đầu bằng cụm từ "Lời giải:" ở dòng mới.
3. Về Cấu trúc Văn bản: Giữ nguyên các đoạn văn. Không tự ý cắt bớt chữ.
4. Output "Sạch": KHÔNG thêm bất kỳ câu giao tiếp nào (ví dụ: "Dưới đây là kết quả...", "Đã hoàn thành..."). CHỈ trả về đúng nội dung đã bóc tách.`;
  } else if (parsingMode === 'tag_questions') {
    prompt = `Bạn là một chuyên gia OCR và phân tích dữ liệu giáo dục. Nhiệm vụ của bạn là ${isWord ? 'chuẩn hóa nội dung văn bản (đã được bóc tách từ file Word) sang Markdown và LaTeX chuẩn, ĐỒNG THỜI' : 'bóc tách nội dung văn bản và'} TỰ ĐỘNG GẮN THẺ mức độ nhận thức ([B], [H], [VD]) cho các câu hỏi trắc nghiệm và câu đúng/sai${isWord ? '' : ' từ hình ảnh/tài liệu được cung cấp'}.
BẮT BUỘC TUÂN THỦ CÁC QUY ĐỊNH SAU ĐỂ HỆ THỐNG XỬ LÝ (NẾU KHÔNG SẼ BỊ LỖI):
1. Về Công thức Toán học: ${isWord ? 'Văn bản đầu vào có thể chứa mã MathML thô hoặc công thức bị lỗi. Hãy chuyển TẤT CẢ chúng sang mã LaTeX chuẩn.' : 'Chuyển TẤT CẢ các biểu thức toán học sang mã LaTeX chuẩn.'} Công thức nội dòng bọc bằng $...$, công thức độc lập bọc bằng $$...$$. Tuyệt đối không dùng ký hiệu Unicode.
2. Về Cấu trúc Đề thi (Nếu tài liệu là đề thi trắc nghiệm):
   - Mở đầu mỗi câu hỏi trắc nghiệm 4 lựa chọn PHẢI có thẻ tag, ví dụ: "Câu 1 [B]:", "Câu 2 [H]:", "Câu 3 [VD]:". Bạn hãy tự đánh giá độ khó để gắn thẻ phù hợp ([B] Nhận biết, [H] Thông hiểu, [VD] Vận dụng).
   - 4 đáp án bắt buộc phải bắt đầu bằng "A.", "B.", "C.", "D." và nằm trên các dòng riêng biệt.
   - Đối với câu hỏi trắc nghiệm Đúng/Sai (có 4 ý a, b, c, d), bạn phải gắn thẻ ngay trước hoặc sau ký tự a, b, c, d. Ví dụ: "a) [B] Nội dung...", "b) [H] Nội dung...".
   - Nếu có lời giải chi tiết, phải bắt đầu bằng cụm từ "Lời giải:" ở dòng mới.
3. Về Cấu trúc Văn bản: Giữ nguyên các đoạn văn. Không tự ý cắt bớt chữ.
4. Output "Sạch": KHÔNG thêm bất kỳ câu giao tiếp nào. CHỈ trả về đúng nội dung đã bóc tách.`;
  } else if (parsingMode === 'exam') {
    prompt = `Bạn là một chuyên gia bóc tách dữ liệu giáo dục. Nhiệm vụ của bạn là bóc tách toàn bộ nội dung đề thi trắc nghiệm từ ${isWord ? 'tài liệu' : 'hình ảnh/tài liệu'} được cung cấp.
BẮT BUỘC TUÂN THỦ CÁC QUY ĐỊNH SAU ĐỂ HỆ THỐNG XỬ LÝ (NẾU KHÔNG SẼ BỊ LỖI):
1. Về Công thức Toán học: Chuyển TẤT CẢ các biểu thức toán học sang mã LaTeX chuẩn. Công thức nội dòng bọc bằng $...$, công thức độc lập bọc bằng $$...$$. Tuyệt đối không dùng ký hiệu Unicode.
2. Về Cấu trúc Đề thi:
   - Mở đầu mỗi câu hỏi PHẢI là "Câu X:" (Ví dụ: Câu 1:, Câu 2:).
   - 4 đáp án bắt buộc phải bắt đầu bằng "A.", "B.", "C.", "D." và nằm trên các dòng riêng biệt.
3. TUYỆT ĐỐI KHÔNG GIẢI ĐỀ: Nhiệm vụ của bạn CHỈ LÀ TRÍCH XUẤT LẠI NỘI DUNG ĐỀ THI chính xác như bản gốc. KHÔNG tự ý giải bài, KHÔNG đưa ra đáp án đúng.
4. Output "Sạch": KHÔNG thêm bất kỳ câu giao tiếp nào. CHỈ trả về đúng nội dung đã bóc tách.`;
  } else if (parsingMode === 'similar_exam') {
    prompt = `Bạn là một chuyên gia giáo dục. Nhiệm vụ của bạn là đọc nội dung đề thi/tài liệu được cung cấp ${isWord ? 'ở dưới' : '(dưới dạng văn bản hoặc hình ảnh)'} và TẠO RA ${examCount} ĐỀ THI MỚI TƯƠNG TỰ hoàn toàn.
YÊU CẦU:
- Các đề thi mới phải giữ nguyên cấu trúc (số lượng câu hỏi, dạng bài, mức độ khó, chủ đề) của đề thi gốc. BẠN PHẢI SINH RA ĐẦY ĐỦ 100% SỐ LƯỢNG CÂU HỎI, KHÔNG ĐƯỢC RÚT GỌN HAY BỎ SÓT.
- Thay đổi số liệu, thông số, ngữ cảnh hoặc cách hỏi sao cho tương đương nhưng không giống hệt đề gốc.
${contextSuggestion ? `- YÊU CẦU ĐẶC BIỆT TỪ GIÁO VIÊN: Hãy phân tích sâu về ngữ cảnh sau đây để tạo đề dễ hiểu, phù hợp tính sư phạm (áp dụng linh hoạt cho mọi bộ môn): "${contextSuggestion}"` : ''}
${keepOriginalDiagrams ? `- BẮT BUỘC GIỮ NGUYÊN HÌNH ẢNH / BẢNG BIẾN THIÊN / ĐỒ THỊ: Đối với tất cả câu hỏi có chứa hình ảnh minh họa, bảng biến thiên, đồ thị hàm số (Oxy) hoặc hình không gian trong tài liệu gốc, BẠN BẮT BUỘC PHẢI GIỮ NGUYÊN 100% HÌNH VẼ ĐÓ (giữ nguyên thẻ ảnh ![...](...) hoặc mô tả chi tiết hình vẽ/bảng biến thiên). TUYỆT ĐỐI KHÔNG thay đổi hình vẽ. CHỈ THAY ĐỔI YÊU CẦU CÂU HỎI, LỆNH HỎI VÀ 4 PHƯƠNG ÁN A, B, C, D dựa trên chính hình ảnh gốc đó.` : ''}
- Đảm bảo tính chính xác về mặt toán học/khoa học.
- Trình bày dưới dạng định dạng Markdown.
- Chuyển tất cả công thức toán học${isWord ? '/MathML' : ''} sang định dạng LaTeX chuẩn (inline dùng dấu đô la đơn $...$, block dùng dấu đô la kép $$...$$).
- Các câu hỏi phải theo định dạng "Câu X: ...".
- Trình bày rõ ràng 4 đáp án A, B, C, D cho mỗi câu hỏi.
${examCount > 1 ? `- Phân tách các đề bằng dấu gạch ngang (---) và tiêu đề rõ ràng (ví dụ: Đề 1, Đề 2...).` : ''}
- LỆNH TỐI CẦN THIẾT: TUYỆT ĐỐI KHÔNG ĐƯỢC QUÊN PHẦN ĐÁP ÁN/LỜI GIẢI NẾU CÓ YÊU CẦU. KHÔNG giải thích lằng nhằng, chỉ xuất ra đề thi${includeShortSolution ? ' và ĐẦY ĐỦ đáp án/lời giải ở cuối' : ''}.
- YÊU CẦU VỀ LỜI GIẢI (QUAN TRỌNG):
${includeShortSolution ? getAnswerPrompt(answerFormat) : `  + BẮT BUỘC: KHÔNG cung cấp lời giải hay đáp án, chỉ sinh đề thi.`}`;
  } else if (parsingMode === 'matrix_exam') {
    prompt = `Bạn là một chuyên gia giáo dục. Hãy tạo ra MỘT ĐỀ THI ĐÚNG CHUẨN FORMAT 2025 MỚI NHẤT bám sát cấu trúc Ma Trận Đặc Tả sau đây:
${matrixConfig}

YÊU CẦU BẮT BUỘC VỀ ĐỊNH DẠNG & MỨC ĐỘ:
1. Đề thi phải chia làm 3 phần (nếu trong ma trận có số lượng câu tương ứng):
   - PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (Mỗi câu có 4 đáp án A, B, C, D).
   - PHẦN II. Câu trắc nghiệm đúng sai. Mỗi câu phải có đúng 4 ý a), b), c), d).
   - PHẦN III. Câu trắc nghiệm trả lời ngắn (Học sinh chỉ cần điền một con số hoặc cụm từ ngắn gọn).

2. Cấu trúc câu hỏi Đúng/Sai (RẤT QUAN TRỌNG):
   - Cột "Cấu trúc ý ĐS (B-H-VD)" trong ma trận định nghĩa số lượng ý Nhận biết - Thông hiểu - Vận dụng cho từng câu hỏi Đúng/Sai thuộc chủ đề đó. 
   - Ví dụ: Cấu trúc "2-1-1" nghĩa là trong 4 ý a,b,c,d của câu hỏi đó, PHẢI CÓ đúng 2 ý ở mức Nhận biết, 1 ý ở mức Thông hiểu, và 1 ý ở mức Vận dụng.
   - Bạn phải gắn thẻ mức độ [B], [H], [VD] ngay sau mỗi ý a,b,c,d để chứng minh. Ví dụ: "a) [B] Nội dung ý a... b) [H] Nội dung ý b...".

3. Gắn thẻ trước mỗi câu hỏi:
   - Các câu phần I và III phải gắn thẻ mức độ: [B], [H], [VD], [VDC]. Ví dụ: "Câu 1 [B]:" hoặc "Câu 3 [VD]:"
   - Giữ nguyên định dạng Markdown và chuyển tất cả công thức sang LaTeX chuẩn ($...$, $$...$$).

YÊU CẦU VỀ NỘI DUNG:
${isWord && textContent
  ? `- Hãy bám sát vào Bảng Ma Trận Đặc Tả được cung cấp ở trên. Nếu Bảng Ma Trận ghi chú rằng ma trận nằm trong tài liệu đính kèm, HÃY DỰA HOÀN TOÀN VÀO TÀI LIỆU ĐÍNH KÈM ĐÓ để làm bộ khung sinh đề. Nếu ma trận đã được điền sẵn, hãy coi tài liệu đính kèm là Dữ Liệu Tham Khảo bổ trợ.`
  : `- Hãy sử dụng tài liệu/văn bản/hình ảnh được đính kèm làm cơ sở dữ liệu phụ trợ. Tuy nhiên, bạn BẮT BUỘC phải tuân thủ nghiêm ngặt Ma Trận Đặc Tả (Môn học, Lớp học, Tên bài, Số lượng câu, Mức độ) làm bộ khung chính để tạo đề.`} TUYỆT ĐỐI KHÔNG ĐƯỢC LÀM TẮT, KHÔNG ĐƯỢC RÚT GỌN, PHẢI SINH ĐỦ 100% SỐ LƯỢNG CÂU HỎI THEO ĐÚNG YÊU CẦU TRONG MA TRẬN.
${contextSuggestion ? `- YÊU CẦU ĐẶC BIỆT TỪ GIÁO VIÊN: Hãy phân tích sâu về ngữ cảnh sau đây để tạo đề dễ hiểu, phù hợp tính sư phạm (áp dụng linh hoạt cho mọi bộ môn): "${contextSuggestion}"` : ''}
- LỆNH TỐI CẦN THIẾT: TUYỆT ĐỐI KHÔNG ĐƯỢC QUÊN PHẦN ĐÁP ÁN/LỜI GIẢI NẾU CÓ YÊU CẦU. KHÔNG giải thích lằng nhằng, chỉ xuất ra đề thi${includeShortSolution ? ' và ĐẦY ĐỦ đáp án/lời giải ở cuối' : ''}.
- YÊU CẦU VỀ LỜI GIẢI (QUAN TRỌNG):
${includeShortSolution ? getAnswerPrompt(answerFormat) : `  + BẮT BUỘC: KHÔNG cung cấp lời giải hay đáp án, chỉ sinh đề thi.`}`;
  } else if (parsingMode === 'standardize_exam') {
    prompt = `Bạn là một chuyên gia giáo dục. Nhiệm vụ của bạn là đọc nội dung đề thi/tài liệu được cung cấp (dưới dạng văn bản hoặc hình ảnh) và CHUẨN HÓA lại toàn bộ theo đúng chuẩn cấu trúc thi mới nhất. BẠN PHẢI CHUẨN HÓA TẤT CẢ CÁC CÂU HỎI TRONG ĐỀ GỐC, KHÔNG ĐƯỢC BỎ SÓT, RÚT GỌN HAY LÀM TẮT BẤT KỲ CÂU NÀO.

YÊU CẦU BẮT BUỘC VỀ ĐỊNH DẠNG & MỨC ĐỘ:
1. Đề thi phải chia làm 3 phần chuẩn:
   - PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (Mỗi câu có 4 đáp án A, B, C, D).
   - PHẦN II. Câu trắc nghiệm đúng sai (Mỗi câu phải có đúng 4 ý a), b), c), d)).
   - PHẦN III. Câu trắc nghiệm trả lời ngắn.

2. Gắn thẻ mức độ nhận thức (RẤT QUAN TRỌNG):
   - BẠN BẮT BUỘC PHẢI TỰ ĐỘNG ĐÁNH GIÁ và gắn thẻ mức độ [B] (Nhận biết), [H] (Thông hiểu), [VD] (Vận dụng) hoặc [VDC] (Vận dụng cao) cho TỪNG CÂU HỎI.
   - Đối với PHẦN I và PHẦN III: Gắn thẻ ngay trước câu hỏi. Ví dụ: "Câu 1 [B]:" hoặc "Câu 3 [VD]:".
   - Đối với PHẦN II (Đúng/Sai): AI sẽ ĐÁNH GIÁ VÀ GẮN THẺ CHO TỪNG Ý NHỎ a, b, c, d để được kết quả như: "a) [B] Nội dung ý a... b) [H] Nội dung ý b...". BẮT BUỘC TỪNG Ý ĐỀU PHẢI CÓ THẺ.

3. Kỹ thuật hiển thị:
   - Giữ nguyên định dạng Markdown và chuyển tất cả công thức sang LaTeX chuẩn (dùng $...$ và $$...$$).
   - Không tự ý thay đổi số liệu đề gốc, chỉ chuẩn hóa format và đánh giá mức độ.

4. Yêu cầu về Lời giải/Đáp án (QUAN TRỌNG):
${includeShortSolution ? getAnswerPrompt(answerFormat) : '   - KHÔNG cung cấp lời giải, chỉ xuất ra đề thi.'}

- KHÔNG giải thích lằng nhằng, chỉ xuất ra đề thi${includeShortSolution ? ' và đáp án/lời giải' : ''}.`;
  } else if (parsingMode === 'solve_exam_tutor') {
    prompt = `Bạn là một gia sư AI tài năng, xuất sắc. Nhiệm vụ của bạn là đọc và hiểu tài liệu đề bài được cung cấp (dưới dạng văn bản hoặc hình ảnh).
Sau đó, hãy trình bày lời giải chi tiết, từng bước, khoa học và cực kỳ dễ hiểu cho học sinh trung học phổ thông.

YÊU CẦU BẮT BUỘC VỀ ĐỊNH DẠNG VÀ NỘI DUNG:
1. GIẢI QUYẾT TOÀN BỘ ĐỀ: Bạn BẮT BUỘC phải tìm và giải quyết TẤT CẢ các câu hỏi có trong tài liệu. Tuyệt đối không được bỏ sót câu nào, không được dừng lại giữa chừng hay chỉ giải 1 câu đầu tiên.
2. Trình bày dưới dạng Markdown rõ ràng, phân chia rõ "Câu 1:", "Câu 2:"... để người dùng dễ theo dõi.
3. Toàn bộ các công thức toán học BẮT BUỘC phải bọc trong các cặp thẻ LaTeX: $...$ cho công thức nội dòng và $$...$$ cho biểu thức dạng khối. Tuyệt đối không dùng ký hiệu Unicode (như √, Δ).
4. Sử dụng giọng văn sư phạm, lịch sự, thân thiện và giàu khích lệ.
5. Mọi câu trả lời và kiến thức BẮT BUỘC phải bám sát định hướng của bộ sách "Kết nối tri thức với cuộc sống".
6. PHÂN LOẠI LỜI GIẢI THEO MỨC ĐỘ: Bạn phải tự đánh giá mức độ của từng câu hỏi. Đối với các câu hỏi Nhận biết (dễ, lý thuyết cơ bản mức [B]), CHỈ CẦN đưa ra phương án đúng, KHÔNG giải thích chi tiết. CHỈ ĐƯỢC giải thích chi tiết (từng bước) đối với các câu hỏi Thông hiểu ([H]) và Vận dụng ([VD]).`;
  } else if (parsingMode === 'normalize_text') {
    prompt = `Bạn là một trợ lý AI xử lý văn bản tiếng Việt. Nhiệm vụ của bạn là đọc văn bản gốc do người dùng cung cấp và TỰ ĐỘNG CHUẨN HÓA, SỬA LỖI CHÍNH TẢ, NGỮ PHÁP, CÚ PHÁP, VÀ CÁCH TRÌNH BÀY của văn bản đó.

YÊU CẦU BẮT BUỘC:
1. Sửa toàn bộ các lỗi chính tả, đánh máy, viết hoa sai quy tắc.
2. Cải thiện cách diễn đạt sao cho lưu loát, tự nhiên và đúng văn phong tiếng Việt nhưng vẫn BẢO TOÀN TỐI ĐA Ý NGHĨA VÀ NỘI DUNG GỐC của tác giả.
3. Nếu có công thức toán học, hãy chuyển sang định dạng LaTeX chuẩn (inline dùng $...$, block dùng $$...$$).
4. KHÔNG ĐƯỢC thêm bất kỳ lời bình luận, giải thích hay câu chào hỏi nào. BẠN CHỈ TRẢ VỀ ĐÚNG ĐOẠN VĂN BẢN ĐÃ ĐƯỢC CHUẨN HÓA VÀ KHÔNG CÓ GÌ THÊM.`;
  } else if (parsingMode === 'latex_correction') {
    prompt = `Bạn là một hệ thống máy tính tự động, CHỈ làm duy nhất một việc: PHÁT HIỆN VÀ SỬA LỖI CÚ PHÁP LATEX.

LỆNH TỐI CAO BẮT BUỘC TUÂN THỦ (NẾU VI PHẠM SẼ BỊ HỦY):
1. TUYỆT ĐỐI KHÔNG GIẢI TOÁN: Dù đầu vào là một bài toán, phương trình hay câu hỏi trắc nghiệm, BẠN KHÔNG ĐƯỢC PHÉP ĐƯA RA LỜI GIẢI, ĐÁP ÁN HAY GỢI Ý. BẠN CHỈ LÀ CÔNG CỤ SỬA LỖI GÕ (TYPO) CỦA CODE LATEX.
2. BẢO TOÀN NGỮ NGHĨA 100%: Tuyệt đối không thay đổi câu chữ, không viết lại văn phong, không dịch ngôn ngữ. CHỈ tìm mã Toán học bị sai cú pháp và sửa lại cho đúng.
3. SỬA LỖI CÚ PHÁP TOÁN: Phát hiện và sửa các lỗi thiếu dấu ngoặc nhọn '{}', thiếu hoặc thừa dấu '$', lệnh gõ sai (ví dụ: '\\frac' viết thành '\\farc'), khoảng trắng bất hợp lý trong code Toán.
4. Đảm bảo công thức nội dòng được bọc bằng $...$ và công thức khối bọc bằng $$...$$.
5. TRẢ VỀ KẾT QUẢ SẠCH: TRẢ VỀ ĐÚNG ĐOẠN VĂN BẢN (ĐÃ ĐƯỢC SỬA LỖI LATEX). KHÔNG xưng hô, KHÔNG giải thích bạn đã sửa gì, KHÔNG bao bọc bởi markdown block.`;
  } else if (parsingMode === 'lesson_plan') {
    prompt = `Bạn là một hệ thống tự động biên soạn tài liệu. Nhiệm vụ của bạn là XUẤT RA VĂN BẢN GIÁO ÁN CHI TIẾT.

THÔNG TIN BÀI HỌC CẦN SOẠN:
- Môn học: ${subject || 'Không xác định'}
- Khối lớp: ${grade || 'Không xác định'}
- Tên bài học: ${lesson || 'Không xác định'}

ĐIỀU KIỆN TIÊN QUYẾT:
- KHÔNG CÓ LỜI MỞ ĐẦU (ví dụ: CẤM các câu như "Dưới đây là...", "Kế hoạch bài dạy này...").
- KHÔNG CÓ LỜI KẾT LUẬN.
- Ký tự đầu tiên của kết quả trả về PHẢI là dấu "#" hoặc "**" (bắt đầu ngay vào tiêu đề Kế hoạch bài dạy).

YÊU CẦU BẮT BUỘC VỀ ĐỊNH DẠNG VÀ NỘI DUNG:
1. Bắt đầu từ Tiết 1: BẮT BUỘC phải soạn giáo án bắt đầu từ Tiết 1, sau đó đến Tiết 2... Tuyệt đối KHÔNG ĐƯỢC bỏ qua Tiết 1.
2. Tích hợp năng lực số: Đề xuất các công cụ AI, phần mềm mô phỏng, nền tảng trực tuyến trong các hoạt động.
3. Cấu trúc 4 bước: Khởi động, Hình thành kiến thức, Luyện tập, Vận dụng (Nếu không có mẫu sẵn). 
4. Trình bày Markdown và LaTeX: Bắt buộc dùng $...$ và $$...$$ cho công thức toán.
5. TUÂN THỦ TÀI LIỆU MẪU: Nếu có Mẫu giáo án đính kèm, BẮT BUỘC giữ nguyên cấu trúc các đề mục của mẫu đó và điền nội dung vào.
${contextSuggestion ? `6. YÊU CẦU ĐẶC BIỆT TỪ GIÁO VIÊN: ${contextSuggestion}` : ''}`;
  }

  const skipGeneralFooter =
    Boolean(customPrompt) ||
    parsingMode === 'video_prompt' ||
    parsingMode === 'mindmap' ||
    parsingMode === 'latex_correction' ||
    parsingMode === 'normalize_text';

  if (!skipGeneralFooter) {
    if (parsingMode !== 'lesson_plan') {
      prompt += `\n\n[YÊU CẦU BẮT BUỘC CHUNG]: Bạn PHẢI tuân thủ NGHIÊM NGẶT các cấu hình xử lý (bao gồm yêu cầu về lời giải, định dạng, độ khó, ma trận) đã được chỉ định ở trên. TUYỆT ĐỐI KHÔNG tự ý thay đổi, bỏ qua hay làm trái các chỉ thị cấu hình này. Mọi nội dung, ngữ cảnh, thuật ngữ và dữ liệu bạn sinh ra PHẢI tuân thủ và bám sát tuyệt đối theo chuẩn của bộ sách "Kết nối tri thức và cuộc sống", nội dung chuẩn kiến thức kĩ năng của chương trình GDPT 2018. TUYỆT ĐỐI KHÔNG giải thích, nhận xét hay bình luận về sự tuân thủ này. BẠN CHỈ LÀ MỘT HỆ THỐNG TỰ ĐỘNG XUẤT RAW TEXT.\n`;
    } else {
      prompt += `\n\n[HƯỚNG DẪN BIÊN SOẠN]: Nội dung giáo án cần tương thích với định hướng của bộ sách "Kết nối tri thức và cuộc sống", chương trình GDPT 2018 và các văn bản hướng dẫn mới nhất. TRÌNH BÀY GIÁO ÁN NGAY LẬP TỨC, KHÔNG CÓ BẤT KỲ LỜI BÌNH LUẬN NÀO. Bạn tuyệt đối không được tự ý thay đổi các quy định chung của hệ thống.\n`;
    }
  }

  if (continueFromText) {
    const tail =
      continueFromText.length > 2000
        ? continueFromText.substring(continueFromText.length - 2000)
        : continueFromText;
    prompt += `\n[YÊU CẦU ĐẶC BIỆT]: Đoạn văn bản trước đó bạn sinh ra bị thiếu. Dưới đây là phần văn bản cuối cùng bạn đã viết:\n"""\n${tail}\n"""\nHãy ĐỌC KỸ phần cuối này và TIẾP TỤC sinh ra nội dung CÒN THIẾU ngay nối tiếp phần đó. TUYỆT ĐỐI KHÔNG viết lại những phần đã sinh ra, chỉ viết tiếp.\n`;
  }

  if (parsingMode === 'lesson_plan') {
    if (textContent) {
      prompt += `\n\n[MẪU GIÁO ÁN / TÀI LIỆU THAM KHẢO TỪ GIÁO VIÊN]:\n${textContent}\n\n(LƯU Ý TỐI QUAN TRỌNG: Các tài liệu đính kèm bên trên CHỈ LÀ MẪU CẤU TRÚC hoặc TÀI LIỆU THAM KHẢO. Bạn BẮT BUỘC phải viết nội dung cho bài học "${lesson}" (Môn ${subject}, ${grade}). TUYỆT ĐỐI KHÔNG sao chép chủ đề của tài liệu mẫu. Bạn CHỈ ĐƯỢC lấy cấu trúc các đề mục từ mẫu này và BẮT BUỘC ĐIỀN KIẾN THỨC CỦA BÀI "${lesson}" VÀO ĐÓ!)`;
    }
  } else if (isWord && parsingMode === 'matrix_exam') {
    if (textContent) {
      prompt += `\n\n[TÀI LIỆU ĐÍNH KÈM TỪ GIÁO VIÊN]:\n${textContent}\n\n(LƯU Ý TỐI QUAN TRỌNG: Nếu bảng Ma trận yêu cầu đọc tài liệu đính kèm, hãy dùng nội dung này làm bộ khung chính để sinh đề. Nếu ma trận đã được điền sẵn, hãy dùng nội dung này làm dữ liệu tham khảo ngữ cảnh!)`;
    }
  } else if (textContent) {
    prompt += `\n\n${isWord ? 'Nội dung' : 'Nội dung văn bản phụ trợ'}:\n${textContent}`;
  }

  return prompt;
}
