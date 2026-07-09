/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import * as mammoth from 'mammoth';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { Sparkles, FileText, Upload, Save, X, Plus, Download, Printer, QrCode, Copy, Trash, Check, AlertCircle, Database, Edit, Users } from 'lucide-react';
import { generateAITestBank } from '../utils/gemini';
import { Subject, Question, Exam, QuestionBank, StudentClass } from '../types';
import MathJaxRenderer from './MathJaxRenderer';
import QuestionEditor from './QuestionEditor';

import { downloadExamWordFile } from '../utils/examWordGenerator';
import { downloadExamPptxFile } from '../utils/pptxExport';

/**
 * Phân tích cú pháp thông minh trích xuất câu hỏi từ văn bản thô của file Word (.docx)
 * Hỗ trợ nhận dạng mức độ Dễ, Trung bình, Khó dựa các nhãn [Dễ], [Khó], (Trung bình),...
 * Nhận diện đáp án trắc nghiệm ghép dòng hoặc chia dòng.
 * Nhận diện lời giải, đáp án chính xác tự động.
 */
function parseQuestionsFromDocxText(text: string): Omit<Question, 'id' | 'subjectId'>[] {
  const parsedQuestions: Omit<Question, 'id' | 'subjectId'>[] = [];

  if (!text) return [];

  // Tách văn bản chuẩn theo từng Câu hỏi bắt đầu bằng "Câu [số]", "Bài [số]"
  const questionSplitRegex = /((?:Câu|Bài|Question|Cầu|Cau|Câu số)\s*\d+)/i;
  const parts = text.split(questionSplitRegex);

  // Vòng lặp duyệt qua các phần tử được tách ra:
  // index lẻ là nhãn "Câu X", index chẵn ngay sau là nội dung của câu hỏi đó
  for (let idx = 1; idx < parts.length; idx += 2) {
    const questionTitle = parts[idx];
    const questionBody = parts[idx + 1] || "";

    const fullBlockText = (questionTitle + questionBody).trim();
    if (!fullBlockText) continue;

    // 1. Phân hóa Độ khó tự động
    let difficulty: 'easy' | 'medium' | 'hard' = 'easy';
    const textLower = fullBlockText.toLowerCase();

    if (
      textLower.includes('[khó]') || textLower.includes('(khó)') ||
      textLower.includes('vận dụng cao') || textLower.includes('[hard]') ||
      textLower.includes('(hard)') || textLower.includes('mức độ 3') ||
      textLower.includes('mức độ khó') || textLower.includes('vdc') ||
      textLower.includes('khó:') || textLower.includes('mức 3') ||
      textLower.includes('[vd]') || textLower.includes('(vd)') || textLower.includes('vận dụng')
    ) {
      difficulty = 'hard';
    } else if (
      textLower.includes('[trung bình]') || textLower.includes('(trung bình)') ||
      textLower.includes('[tb]') || textLower.includes('(tb)') ||
      textLower.includes('[medium]') || textLower.includes('(medium)') ||
      textLower.includes('mức độ 2') || textLower.includes('mức độ trung bình') ||
      textLower.includes('trung bình:') || textLower.includes('mức 2') ||
      textLower.includes('[h]') || textLower.includes('(h)') ||
      textLower.includes('thông hiểu') || textLower.includes('hiểu')
    ) {
      difficulty = 'medium';
    } else {
      difficulty = 'easy'; // Mặc định là [B] (Dễ)
    }

    // 2. Tìm phần Lời giải / Hướng dẫn giải / Giải thích
    let questionAndOptionsPart = fullBlockText;
    let explanationPart = "";

    const explanationRegex = /(?:Lời giải|Hướng dẫn giải|Giải thích|Đáp án chi tiết|Lời giải|HDG|Lời giải chi tiết|Chọn\s+[A-D])[\s\S]*/i;
    const explanationMatch = fullBlockText.match(explanationRegex);
    if (explanationMatch) {
      explanationPart = explanationMatch[0].trim();
      questionAndOptionsPart = fullBlockText.substring(0, fullBlockText.indexOf(explanationMatch[0])).trim();
    }

    let isTrueFalse = false;
    let isShortAnswer = false;
    let isMultipleChoice = false;

    if (textLower.includes('[ds]') || textLower.includes('[đs]') || textLower.includes('[đúng sai]')) {
      isTrueFalse = true;
    } else if (textLower.includes('[tln]') || textLower.includes('[trả lời ngắn]')) {
      isShortAnswer = true;
    } else if (textLower.includes('[b]') || textLower.includes('[h]') || textLower.includes('[vd]')) {
      isMultipleChoice = true;
    }

    // 3. Tách nội dung và các lựa chọn
    const labelIndices: { label: string; index: number }[] = [];

    // Quét tìm vị trí xuất hiện của nhãn
    const formats = isTrueFalse ? [
      /\b(a)[\.\)]\s*/gi,
      /\b(b)[\.\)]\s*/gi,
      /\b(c)[\.\)]\s*/gi,
      /\b(d)[\.\)]\s*/gi
    ] : [
      /\b(A)[\.\)]\s*/g,
      /\b(B)[\.\)]\s*/g,
      /\b(C)[\.\)]\s*/g,
      /\b(D)[\.\)]\s*/g
    ];

    const labelNames = isTrueFalse ? ['a', 'b', 'c', 'd'] : ['A', 'B', 'C', 'D'];

    formats.forEach((regex, fIdx) => {
      const label = labelNames[fIdx];
      regex.lastIndex = 0;
      let m;
      while ((m = regex.exec(questionAndOptionsPart)) !== null) {
        // Ghi lại vị trí thực tế của chữ cái A, B, C, D hoặc a, b, c, d
        const charPos = m.index + m[0].toLowerCase().indexOf(label.toLowerCase());
        labelIndices.push({ label, index: charPos });
      }
    });

    // Sắp xếp các nhãn theo thứ tự xuất hiện trong văn bản
    labelIndices.sort((a, b) => a.index - b.index);

    let content = "";
    const options: string[] = ["", "", "", ""];

    if (labelIndices.length > 0) {
      // Nội dung câu hỏi từ đầu đến nhãn đáp án đầu tiên
      const firstLabelPos = labelIndices[0].index;
      const rawContent = questionAndOptionsPart.substring(0, firstLabelPos).trim();
      // Bỏ đi phần tiền đề "Câu X [Mức độ]:"
      content = rawContent.replace(/^(?:Câu|Bài|Question|Cầu|Cau|Câu số)\s*\d+\s*(?:\[[^\]]+\]|\([^\)]+\))?\s*[\:\.\-\s]*/i, '').trim();

      // Trích xuất các phương án đáp án
      for (let i = 0; i < labelIndices.length; i++) {
        const current = labelIndices[i];
        const next = labelIndices[i + 1];

        const endPos = next ? next.index : questionAndOptionsPart.length;
        let optionText = questionAndOptionsPart.substring(current.index, endPos).trim();

        // Cắt nhãn "A. ", "A) "
        optionText = optionText.replace(/^[A-H][\.\)]\s*/i, '').trim();

        const labelIndex = labelNames.indexOf(current.label);
        if (labelIndex !== -1) {
          options[labelIndex] = optionText;
        }
      }
    } else {
      // Không tìm thấy đáp án lựa chọn trắc nghiệm, coi như câu tự luận/essays hoặc text thường
      content = questionAndOptionsPart.replace(/^(?:Câu|Bài|Question|Cầu|Cau|Câu số)\s*\d+\s*(?:\[[^\]]+\]|\([^\)]+\))?\s*[\:\.\-\s]*/i, '').trim();
    }

    // 4. Phát hiện đáp án chính xác
    let correctAnswer = isTrueFalse ? 'F-F-F-F' : 'A';
    let matched = false;

    if (isTrueFalse && explanationPart) {
      let tfAnswer = ["F", "F", "F", "F"];
      ['a', 'b', 'c', 'd'].forEach((char, idx) => {
         const regex = new RegExp(`${char}[\\)\\.\\-\\s:]*(đúng|sai|đ|s|t|f)`, 'i');
         const match = explanationPart.match(regex);
         if (match) {
            const val = match[1].toLowerCase();
            if (val.startsWith('đ') || val.startsWith('t')) {
              tfAnswer[idx] = "T";
            }
         }
      });
      correctAnswer = tfAnswer.join("-");
      matched = true;
    } else if (!isTrueFalse && explanationPart) {
      const ansPatterns = [
        /(?:chọn|chon|chọn đáp án|chọn phương án)\s+([A-D])/i,
        /đáp\s*án\s*đúng\s*(?:là)?\s*([A-D])/i,
        /đáp\s*án\s*([A-D])/i,
        /phương\s*án\s*([A-D])/i,
        /đáp\s*án\s*chính\s*xác\s*(?:là)?\s*([A-D])/i,
        /đáp\s*án\s*đúng:\s*([A-D])/i,
        /hướng dẫn giải\s+([A-D])/i,
        /kết quả\s*(?:là)?\s*([A-D])/i,
        /answer:\s*([A-D])/i,
        /(?:=>|⇒)\s*([A-D])/i,
        /chọn\s+mệnh\s+đề\s+([A-D])/i
      ];

      for (const pat of ansPatterns) {
        const match = explanationPart.match(pat);
        if (match) {
          correctAnswer = match[1].toUpperCase().trim();
          matched = true;
          break;
        }
      }
    }

    if (!matched && !isTrueFalse) {
      // Quét trong toàn block
      const matchInFull = fullBlockText.match(/(?:Chọn|Đáp án|Chon)\s+([A-D])/i);
      if (matchInFull) {
        correctAnswer = matchInFull[1].toUpperCase().trim();
      }
    }

    // Làm gọn các đáp án, nếu để trống thì gán chuỗi tạm
    let finalOptions = options.every(o => o === "") ? undefined : options.map(o => o || "Chưa thiết lập");
    
    let finalType: Question['type'] = finalOptions ? 'multiple-choice' : 'essay';
    if (isTrueFalse) {
      finalType = 'true-false';
      if (!finalOptions) finalOptions = ["", "", "", ""];
    } else if (isShortAnswer) {
      finalType = 'essay';
      finalOptions = undefined;
    } else if (isMultipleChoice) {
      finalType = 'multiple-choice';
      if (!finalOptions) finalOptions = ["", "", "", ""];
    }

    parsedQuestions.push({
      content: content || "Câu hỏi không có nội dung",
      type: finalType,
      options: finalOptions,
      correctAnswer: correctAnswer,
      explanation: explanationPart || undefined,
      difficulty: difficulty
    });
  }

  return parsedQuestions;
}

interface ExamGeneratorProps {
  subjects: Subject[];
  questions: Question[];
  questionBanks: QuestionBank[];
  exams: Exam[];
  onAddQuestions: (questions: Question[], bankId: string) => void;
  onAddBank: (name: string) => string;
  onDeleteBank: (id: string) => void;
  onAddExam: (exam: Exam) => void;
  onDeleteExam: (id: string) => void;
  onSelectExamForQR: (exam: Exam) => void;
  onUpdateQuestion: (id: string, updatedFields: Partial<Question>) => void;
  onDeleteQuestion: (id: string) => void;
  studentClasses: StudentClass[];
  onAddStudentClass: (sc: StudentClass) => void;
  onDeleteStudentClass: (id: string) => void;
}

export default function ExamGenerator({
  subjects,
  questions,
  questionBanks,
  exams,
  onAddQuestions,
  onAddBank,
  onDeleteBank,
  onAddExam,
  onDeleteExam,
  onSelectExamForQR,
  onUpdateQuestion,
  onDeleteQuestion,
  studentClasses,
  onAddStudentClass,
  onDeleteStudentClass
}: ExamGeneratorProps) {
  // Input states
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [selectedBankId, setSelectedBankId] = useState<string>('all');
  const [examTitle, setExamTitle] = useState<string>('Đề Kiểm Tra Thường Xuyên');
  const [examDuration, setExamDuration] = useState<number>(45);
  const [schoolName, setSchoolName] = useState<string>('TRƯỜNG THPT THẠNH PHƯỚC');
  const [departmentName, setDepartmentName] = useState<string>('TỔ THI CỬ & KHẢO THÍ');
  const [examSubTitle, setExamSubTitle] = useState<string>('ĐỀ THI ĐÁNH GIÁ NĂNG LỰC');
  const [schoolYear, setSchoolYear] = useState<string>('Năm học 2026 - 2027');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [examCodesCount, setExamCodesCount] = useState<number>(1);
  const [isDynamic, setIsDynamic] = useState<boolean>(false);
  const [maxAttempts, setMaxAttempts] = useState<number>(1);
  const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);
  const [activeGeneratorTab, setActiveGeneratorTab] = useState<'config' | 'generate' | 'bank'>('bank');


  // Multiple source configuration for Exam Generation
  interface ExamSourceConfig {
    id: string;
    bankId: string;
    easy: number;
    medium: number;
    hard: number;
    tf: number;
    short: number;
  }
  const [sourceConfigs, setSourceConfigs] = useState<ExamSourceConfig[]>([
    { id: 'default', bankId: 'all', easy: 10, medium: 6, hard: 4, tf: 0, short: 0 }
  ]);


  // Generated results
  const [generatedExam, setGeneratedExam] = useState<Exam | null>(null);
  const [viewMode, setViewMode] = useState<'student' | 'teacher'>('student');
  const [copiedLatex, setCopiedLatex] = useState<boolean>(false);

  const [isReadingWord, setIsReadingWord] = useState<boolean>(false);
  const [previewQuestions, setPreviewQuestions] = useState<Omit<Question, 'id' | 'subjectId'>[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const wordInputRef = useRef<HTMLInputElement>(null);
  const classListInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadClassTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Mã học sinh", "Họ và tên", "Giới tính (Nam/Nữ)"],
      ["HS001", "Nguyễn Minh Anh", "Nam"],
      ["HS002", "Huỳnh Võ Gia Bảo", "Nam"],
      ["HS003", "Huỳnh Thị Ngọc Cầm", "Nữ"],
      ["HS004", "Nguyễn Ngô Huyền Châu", "Nữ"],
      ["HS005", "Lê Nguyễn Hoàng Duy", "Nam"],
      ["HS006", "Phạm Cao Bảo Duy", "Nam"],
      ["HS007", "Trần Nhật Duy", "Nam"]
    ]);
    ws['!cols'] = [{wch: 15}, {wch: 30}, {wch: 20}];
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach");
    XLSX.writeFile(wb, "DanhSachLop_Mau.xlsx");
  };

  const handleImportClassList = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const list: any[] = XLSX.utils.sheet_to_json(ws);
        
        const students = list.map(item => ({
           id: String(item["Mã học sinh"] || item["Số Báo Danh"] || item["SBD"] || Math.random().toString(36).substring(2,8)),
           name: String(item["Họ và tên"] || item["Họ và Tên"] || item["Họ Tên"] || "Không tên"),
           dob: String(item["Ngày Sinh"] || ""),
           gender: String(item["Giới tính (Nam/Nữ)"] || item["Giới Tính"] || ""),
           note: String(item["Ghi Chú"] || "")
        }));
        
        let className = window.prompt("Nhập tên lớp cho danh sách này (ví dụ: 11A2):");
        if (!className || className.trim() === '') {
           className = file.name.replace('.xlsx', '').replace('.xls', '');
        }

        const newClass: StudentClass = {
           id: 'cls-' + Math.random().toString(36).substring(2, 9),
           name: className.trim(),
           students,
           createdAt: new Date().toISOString()
        };
        onAddStudentClass(newClass);
      } catch (err: any) {
        alert("Lỗi khi đọc file Excel: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
    if (classListInputRef.current) classListInputRef.current.value = '';
  };

  // Bank Manager Modal states
  const [showBankManagerModal, setShowBankManagerModal] = useState<boolean>(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  
  // Create Bank inline states
  const [newBankSubject, setNewBankSubject] = useState<string>('Toán học');
  const [newBankGrade, setNewBankGrade] = useState<string>('Lớp 12');
  const [newBankName, setNewBankName] = useState<string>('');

  const validateQuestion = (q: Question | Omit<Question, 'id' | 'subjectId'>) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!q.content || q.content.trim() === '') {
      errors.push('Nội dung câu hỏi trống');
    }

    if (q.type === 'multiple-choice') {
      if (!q.options || q.options.length < 4 || q.options.some(o => !o || o.trim() === '')) {
        errors.push('Thiếu phương án A, B, C, D');
      }
      if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
        errors.push('Chưa chọn đáp án đúng hợp lệ');
      }
    }

    if (!q.explanation || q.explanation.trim() === '') {
      warnings.push('Chưa có lời giải chi tiết');
    }

    return { errors, warnings };
  };


  // Helper to draw and shuffle questions from multiple banks
  const drawAndShuffleQuestions = (): Question[] => {
    let drawn: Question[] = [];
    const drawnIds = new Set<string>();

    for (const config of sourceConfigs) {
      const matchingQuestions = config.bankId === 'all'
        ? questions
        : questions.filter(q => q.bankId === config.bankId);
      
      const availableQuestions = matchingQuestions.filter(q => !drawnIds.has(q.id));

      const easyPool = availableQuestions.filter(q => q.difficulty === 'easy' && q.type === 'multiple-choice');
      const mediumPool = availableQuestions.filter(q => q.difficulty === 'medium' && q.type === 'multiple-choice');
      const hardPool = availableQuestions.filter(q => q.difficulty === 'hard' && q.type === 'multiple-choice');
      const tfPool = availableQuestions.filter(q => q.type === 'true-false');
      const shortPool = availableQuestions.filter(q => q.type === 'essay');

      const selectRandom = (arr: Question[], count: number): Question[] => {
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
      };

      const drawnForConfig = [
        ...selectRandom(easyPool, config.easy),
        ...selectRandom(mediumPool, config.medium),
        ...selectRandom(hardPool, config.hard),
        ...selectRandom(tfPool, config.tf),
        ...selectRandom(shortPool, config.short)
      ];

      drawnForConfig.forEach(q => drawnIds.add(q.id));
      drawn.push(...drawnForConfig);
    }

    // Shuffle the overall question order
    drawn.sort(() => 0.5 - Math.random());

    // Shuffle options and update correctAnswer for each question
    return drawn.map(q => {
      if (!q.options || q.options.length === 0) return q;

      const oldIndex = q.correctAnswer.charCodeAt(0) - 65; // 'A' -> 0
      if (oldIndex < 0 || oldIndex >= q.options.length) return q;

      const correctOptionContent = q.options[oldIndex];
      const shuffledOptions = [...q.options].sort(() => 0.5 - Math.random());
      const newIndex = shuffledOptions.findIndex(opt => opt === correctOptionContent);

      return {
        ...q,
        options: shuffledOptions,
        correctAnswer: String.fromCharCode(65 + newIndex)
      };
    });
  };

  // Automated Local Generation filtering existing questions
  const handleGenerateFromBank = () => {
    const finalQuestions = drawAndShuffleQuestions();

    const totalEasy = sourceConfigs.reduce((sum, cfg) => sum + cfg.easy, 0);
    const totalMedium = sourceConfigs.reduce((sum, cfg) => sum + cfg.medium, 0);
    const totalHard = sourceConfigs.reduce((sum, cfg) => sum + cfg.hard, 0);
    const totalTf = sourceConfigs.reduce((sum, cfg) => sum + (cfg.tf || 0), 0);
    const totalShort = sourceConfigs.reduce((sum, cfg) => sum + (cfg.short || 0), 0);
    const totalRequested = totalEasy + totalMedium + totalHard + totalTf + totalShort;

    if (finalQuestions.length === 0) {
      alert('Nguồn câu hỏi hiện tại không có đủ câu hỏi phù hợp. Vui lòng Tải lên file Word hoặc thêm câu hỏi vào nguồn này trước khi Tạo đề!');
      return;
    }

    if (finalQuestions.length < totalRequested) {
      alert(`Ngân hàng hiện tại không đủ số lượng bạn yêu cầu. Ứng dụng đã tự động lấy toàn bộ câu hỏi khả dụng.`);
    }

    const newExam: Exam = {
      id: 'ex-' + Math.random().toString(36).substring(2, 9),
      title: examTitle || 'Đề khảo sát năng lực học sinh',
      subjectId: selectedSubjectId,
      questions: finalQuestions,
      difficultyRatio: { easyCount: totalEasy, mediumCount: totalMedium, hardCount: totalHard, tfCount: totalTf, shortCount: totalShort },
      duration: examDuration,
      createdAt: new Date().toISOString(),
      isDynamic,
      sourceBankId: sourceConfigs.length === 1 ? sourceConfigs[0].bankId : 'multiple',
      maxAttempts,
      assignedClassIds: assignedClassIds.length > 0 ? assignedClassIds : undefined,
      assignedClassesData: assignedClassIds.length > 0 ? studentClasses.filter(c => assignedClassIds.includes(c.id)) : undefined
    };

    setGeneratedExam(newExam);
    onAddExam(newExam);
    
    // Automatically switch to the QR sharing tab for immediate student assignment
    onSelectExamForQR(newExam);
  };

  // Word (.docx) Parsing & Importing via Mammoth
  const handleImportWord = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files[0]) return;

    const file = files[0];
    setIsReadingWord(true);

    try {
      let arrayBuffer = await file.arrayBuffer();

      // Tiền xử lý (Pre-processing) OMML sang MathML để mammoth có thể đọc được
      try {
        const zip = await JSZip.loadAsync(arrayBuffer);
        const documentXmlFile = zip.file("word/document.xml");

        if (documentXmlFile) {
          const documentXml = await documentXmlFile.async("string");
          const parser = new DOMParser();
          const docDom = parser.parseFromString(documentXml, "application/xml");

          const mathNodes = docDom.getElementsByTagName("m:oMath");
          if (mathNodes.length > 0) {
            // Tải bộ chuyển đổi XSLT của Microsoft
            const xsltRes = await fetch('/OMML2MML.XSL');
            if (xsltRes.ok) {
              const xsltText = await xsltRes.text();
              const xsltDom = parser.parseFromString(xsltText, "application/xml");
              const xsltProcessor = new XSLTProcessor();
              xsltProcessor.importStylesheet(xsltDom);

              // Xử lý từng công thức toán học
              // Duyệt ngược vì chúng ta thay đổi cấu trúc DOM
              for (let i = mathNodes.length - 1; i >= 0; i--) {
                const mathNode = mathNodes[i];
                const mathmlFragment = xsltProcessor.transformToFragment(mathNode, docDom);
                if (mathmlFragment) {
                  const serializer = new XMLSerializer();
                  let mathmlString = serializer.serializeToString(mathmlFragment);

                  // Loại bỏ tiền tố mml: để tương thích tốt nhất với MathJax
                  mathmlString = mathmlString.replace(/mml:/g, '').replace(/xmlns:mml/g, 'xmlns');

                  // Tạo một thẻ w:t mới chứa chuỗi MathML
                  const wNs = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
                  const wRun = docDom.createElementNS(wNs, "w:r");
                  const wText = docDom.createElementNS(wNs, "w:t");

                  wText.textContent = mathmlString;
                  wRun.appendChild(wText);

                  // Thay thế node công thức OMML bằng thẻ text chứa MathML
                  if (mathNode.parentNode) {
                    mathNode.parentNode.replaceChild(wRun, mathNode);
                  }
                }
              }

              // Lưu lại thay đổi vào file zip
              const serializer = new XMLSerializer();
              const modifiedDocumentXml = serializer.serializeToString(docDom);
              zip.file("word/document.xml", modifiedDocumentXml);

              // Tạo ArrayBuffer mới từ zip đã sửa đổi
              arrayBuffer = await zip.generateAsync({ type: "arraybuffer" });
            } else {
              console.warn("Không thể tải OMML2MML.XSL. Bỏ qua pre-processing toán học.");
            }
          }
        }
      } catch (preprocessError) {
        console.error("Lỗi khi tiền xử lý file Word:", preprocessError);
        // Nếu lỗi, vẫn tiếp tục dùng arrayBuffer gốc
      }

      // Trích xuất văn bản từ Word (sử dụng convertToHtml để giữ lại hình ảnh dạng base64)
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          convertImage: mammoth.images.imgElement((image) => {
            return image.read("base64").then((imageBuffer) => {
              return {
                src: "data:" + image.contentType + ";base64," + imageBuffer
              };
            });
          })
        }
      );
      const html = result.value;

      // Phân tích HTML để chuyển lại thành text, nhưng giữ nguyên các thẻ <img>
      const parser = new DOMParser();
      const docDomHtml = parser.parseFromString(html, "text/html");

      let text = "";
      const traverseNodes = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent;
        } else if (node.nodeName === 'IMG') {
          text += (node as Element).outerHTML;
        } else if (node.nodeName === 'P' || node.nodeName === 'DIV' || node.nodeName === 'H1' || node.nodeName === 'H2' || node.nodeName === 'H3') {
          node.childNodes.forEach(traverseNodes);
          text += "\n\n";
        } else if (node.nodeName === 'BR') {
          text += "\n";
        } else if (node.nodeName === 'TR') {
          node.childNodes.forEach(traverseNodes);
          text += "\n";
        } else if (node.nodeName === 'TD' || node.nodeName === 'TH') {
          node.childNodes.forEach(traverseNodes);
          text += "\t";
        } else {
          node.childNodes.forEach(traverseNodes);
        }
      };

      traverseNodes(docDomHtml.body);

      if (!text || text.trim().length === 0) {
        alert('Tập tin Word rỗng hoặc không thể trích xuất văn bản thô.');
        setIsReadingWord(false);
        return;
      }

      // Tiến hành phân tích cú pháp thông minh câu hỏi từ text
      const parsed = parseQuestionsFromDocxText(text);

      if (parsed.length === 0) {
        alert('Không tìm thấy câu hỏi đúng mẫu nào trong tệp tin Word này. Vui lòng xem kỹ hướng dẫn cách đặt "Câu XX [Mức độ]:" của hệ thống.');
        setIsReadingWord(false);
        return;
      }

      // Auto-save directly to avoid the user missing the "Save" button in the Preview Modal
      const questionsToSave: Question[] = parsed.map(q => ({
        ...q,
        id: 'q-word-' + Math.random().toString(36).substring(2, 9),
        subjectId: selectedSubjectId
      } as Question));

      onAddQuestions(questionsToSave, selectedBankId);
      alert(`Đã tải lên thành công ${questionsToSave.length} câu hỏi vào nguồn đích! Bạn có thể xem và chỉnh sửa trong Quản lý Ngân hàng Câu hỏi.`);
      setShowBankManagerModal(true);
    } catch (err: any) {
      alert('Có lỗi xảy ra khi phân tích tệp tin Word. Vui lòng kiểm tra lại file của bạn. Chi tiết: ' + err.message);
    } finally {
      setIsReadingWord(false);
      e.target.value = ''; // Reset input để cho phép upload lại file cùng tên nếu chỉnh sửa
    }
  };

  const handleUpdatePreviewQuestion = (index: number, updatedFields: Partial<Omit<Question, 'id' | 'subjectId'>>) => {
    setPreviewQuestions(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updatedFields };
      return copy;
    });
  };

  const handleDeletePreviewQuestion = (index: number) => {
    if (confirm('Bạn chắc chắn muốn loại bỏ câu hỏi này khỏi danh sách tải lên?')) {
      setPreviewQuestions(prev => prev.filter((_, idx) => idx !== index));
    }
  };

  const handleSavePreviewQuestions = () => {
    if (previewQuestions.length === 0) {
      alert('Danh sách câu hỏi tải lên trống rỗng!');
      return;
    }

    const questionsToSave: Question[] = [];
    previewQuestions.forEach((q) => {
      questionsToSave.push({
        ...q,
        id: 'q-word-' + Math.random().toString(36).substring(2, 9),
        subjectId: selectedSubjectId
      } as Question);
    });

    onAddQuestions(questionsToSave, selectedBankId);

    alert(`Đã thêm thành công ${questionsToSave.length} câu hỏi từ file Word vào ngân hàng chủ đề hiện tại!`);
    setShowPreviewModal(false);
    setPreviewQuestions([]);
  };

  const handlePrint = () => {
    window.print();
  };

  const copyLatexExamCode = () => {
    if (!generatedExam) return;

    let latexStr = `\\documentclass{article}\n\\usepackage[utf8]{vietnam}\n\\usepackage{amsmath}\n\\usepackage{amssymb}\n\\begin{document}\n\n\\title{${generatedExam.title}}\n\\date{Thời gian làm bài: ${generatedExam.duration} phút}\n\\maketitle\n\n`;

    generatedExam.questions.forEach((q, idx) => {
      latexStr += `\\textbf{Câu ${idx + 1}}: ${q.content.replace(/\$/g, '')}\n`;
      if (q.options && q.options.length === 4) {
        latexStr += `\\\\ A. ${q.options[0].replace(/\$/g, '')} \\quad B. ${q.options[1].replace(/\$/g, '')} \\quad C. ${q.options[2].replace(/\$/g, '')} \\quad D. ${q.options[3].replace(/\$/g, '')}\n\n`;
      }
    });

    latexStr += `\\end{document}`;
    navigator.clipboard.writeText(latexStr);
    setCopiedLatex(true);
    setTimeout(() => setCopiedLatex(false), 2000);
  };

  return (
    <div className="space-y-6 p-1">
      {/* LOCAL TAB BAR */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit mb-4 mx-auto lg:mx-0 shadow-sm border border-slate-200/50">
        <button
          onClick={() => setActiveGeneratorTab('config')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
            activeGeneratorTab === 'config'
              ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          <i className="fa-solid fa-file-signature text-orange-500"></i>
          Cấu hình Tiêu đề
        </button>
        <button
          onClick={() => setActiveGeneratorTab('bank')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
            activeGeneratorTab === 'bank'
              ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          <Database size={16} className={activeGeneratorTab === 'bank' ? 'text-blue-500' : 'text-slate-400'} />
          Danh sách lớp & Kho câu hỏi
        </button>
        <button
          onClick={() => setActiveGeneratorTab('generate')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
            activeGeneratorTab === 'generate'
              ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          <i className="fa-solid fa-wand-magic-sparkles text-blue-500"></i>
          Quản lí & Tạo đề KTTX
        </button>
      </div>

      {/* EXAM CREATION PANEL */}
      {activeGeneratorTab === 'config' && (
        <div className="grid grid-cols-1 gap-6 items-start animate-fade-in">
          {/* TAB 2: Configuration */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 w-full max-w-2xl space-y-6 mx-auto">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-file-signature text-orange-500"></i>
            Thông Tin Tiêu Đề
          </h2>

          <div className="space-y-4">


            {/* Exam title */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Tiêu đề Đề Kiểm tra
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Thời gian làm bài (Phút)
              </label>
              <input
                type="number"
                value={examDuration}
                onChange={(e) => setExamDuration(Number(e.target.value))}
                min={5}
                max={180}
                className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
            </div>

            {/* School Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Tên trường
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="VD: TRƯỜNG THPT THẠNH PHƯỚC"
                className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
            </div>

            {/* Department Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Tên tổ / Bộ môn
              </label>
              <input
                type="text"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                placeholder="VD: TỔ TOÁN - TIN"
                className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
            </div>



            {/* School Year */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Năm học
              </label>
              <input
                type="text"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                placeholder="VD: Năm học 2026 - 2027"
                className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
            </div>



            {/* Logo Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Logo trường (Tùy chọn)
              </label>
              <div className="flex items-center gap-3">
                {logoUrl && (
                  <div className="relative w-12 h-12 bg-white rounded-lg overflow-hidden border border-slate-200 shrink-0">
                    <img src={logoUrl} alt="Logo preview" className="w-full h-full object-contain" />
                    <button
                      onClick={() => setLogoUrl(null)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) setLogoUrl(ev.target.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none transition-all file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>
            </div>


            {/* Settings block ends here */}
          </div>
        </div>
      </div>
      )}

      {activeGeneratorTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-fade-in">
          {/* TAB 1: Generate Action (The new leftmost column) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 w-full space-y-6">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-wand-magic-sparkles text-blue-500"></i>
              Khởi Tạo Đề Thi
            </h2>

            <div className="space-y-4">
              {/* ACTION TRIGGERS */}
              <div className="pt-2 space-y-3">
                <button
                  type="button"
                  onClick={handleGenerateFromBank}
                  className="w-full py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-medium shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <i className="fa-solid fa-server"></i>
                  Tạo Đề Kiểm Tra Mới
                </button>
              </div>

            {/* EXAM MODE SELECTION */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                  <span>Chế độ giao bài</span>
                </label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setIsDynamic(false)}
                    className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${!isDynamic ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                    Đề Tĩnh Xáo Trộn
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDynamic(true)}
                    className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${isDynamic ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                    Đề Động
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  {!isDynamic
                    ? "Tất cả học sinh làm chung một bộ câu hỏi (thứ tự câu và đáp án xáo trộn)."
                    : "Mỗi học sinh truy cập sẽ nhận được một bộ câu hỏi ngẫu nhiên khác nhau từ Nguồn đã chọn."}
                </p>
              </div>

              {/* MAX ATTEMPTS SELECTION */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                  <span>Số Lần Làm Bài Tối Đa</span>
                </label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setMaxAttempts(1)}
                    className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${maxAttempts === 1 ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                    1 Lần
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaxAttempts(2)}
                    className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${maxAttempts === 2 ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                    2 Lần
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaxAttempts(0)}
                    className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${maxAttempts === 0 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                    Không Giới Hạn
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Giới hạn số lần học sinh được phép làm và nộp bài trên cùng một thiết bị.
                </p>
              </div>

              {/* ASSIGNED CLASS SELECTION */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                  <span>Áp Dụng Cho Lớp (Tùy Chọn)</span>
                </label>
                
                {studentClasses.length === 0 ? (
                  <div className="text-[11px] text-slate-400 p-2 bg-slate-50 rounded-lg text-center border border-slate-100">
                    Bạn chưa tải lên danh sách lớp nào. (Học sinh sẽ tự điền tên)
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setAssignedClassIds([])}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        assignedClassIds.length === 0
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Không gán lớp
                    </button>
                    {studentClasses.map(cls => {
                      const isSelected = assignedClassIds.includes(cls.id);
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setAssignedClassIds(prev => prev.filter(id => id !== cls.id));
                            } else {
                              setAssignedClassIds(prev => [...prev, cls.id]);
                            }
                          }}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300 shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected && <Check size={12} />}
                          Lớp {cls.name} <span className="opacity-60 font-normal">({cls.students.length})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-[10px] text-slate-400 leading-tight">
                  Nếu chọn lớp, học sinh sẽ chỉ cần chọn tên của mình từ danh sách thay vì phải tự nhập tay.
                </p>
              </div>

              {/* SOURCE CONFIGURATIONS */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Cấu trúc đề (Chọn từ các nguồn)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Tổng: <strong className="text-slate-700">{sourceConfigs.reduce((sum, cfg) => sum + cfg.easy + cfg.medium + cfg.hard + (cfg.tf || 0) + (cfg.short || 0), 0)} câu</strong>
                  </span>
                </div>
                
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {sourceConfigs.map((config, index) => (
                    <div key={config.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative group">
                      {sourceConfigs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSourceConfigs(prev => prev.filter(c => c.id !== config.id))}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-200 z-10"
                        >
                          <X size={12} />
                        </button>
                      )}
                      
                      <select
                        value={config.bankId}
                        onChange={(e) => {
                          const newConfigs = [...sourceConfigs];
                          newConfigs[index].bankId = e.target.value;
                          setSourceConfigs(newConfigs);
                        }}
                        className="w-full text-sm p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700 truncate pr-6"
                      >
                        <option value="all">Tất cả các nguồn đã tải lên</option>
                        {questionBanks.map(bank => (
                          <option key={bank.id} value={bank.id}>
                            {bank.name}
                          </option>
                        ))}
                      </select>

                      <div className="flex gap-2">
                        <div className="flex-1 flex flex-col items-center">
                          <label className="block text-[10px] font-bold text-emerald-600/70 mb-1 tracking-wider whitespace-nowrap" title="Trắc nghiệm nhiều lựa chọn - Dễ">[B] DỄ</label>
                          <input
                            type="number"
                            value={config.easy}
                            onChange={(e) => {
                              const newConfigs = [...sourceConfigs];
                              newConfigs[index].easy = Math.max(0, Number(e.target.value));
                              setSourceConfigs(newConfigs);
                            }}
                            className="w-full text-center text-sm p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 transition-all text-emerald-600 font-bold"
                          />
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                          <label className="block text-[10px] font-bold text-amber-600/70 mb-1 tracking-wider whitespace-nowrap" title="Trắc nghiệm nhiều lựa chọn - Trung bình">[H] TB</label>
                          <input
                            type="number"
                            value={config.medium}
                            onChange={(e) => {
                              const newConfigs = [...sourceConfigs];
                              newConfigs[index].medium = Math.max(0, Number(e.target.value));
                              setSourceConfigs(newConfigs);
                            }}
                            className="w-full text-center text-sm p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100 transition-all text-amber-600 font-bold"
                          />
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                          <label className="block text-[10px] font-bold text-rose-600/70 mb-1 tracking-wider whitespace-nowrap" title="Trắc nghiệm nhiều lựa chọn - Khó">[VD] KHÓ</label>
                          <input
                            type="number"
                            value={config.hard}
                            onChange={(e) => {
                              const newConfigs = [...sourceConfigs];
                              newConfigs[index].hard = Math.max(0, Number(e.target.value));
                              setSourceConfigs(newConfigs);
                            }}
                            className="w-full text-center text-sm p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all text-rose-600 font-bold"
                          />
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                          <label className="block text-[10px] font-bold text-purple-600/70 mb-1 tracking-wider whitespace-nowrap" title="Trắc nghiệm Đúng/Sai">[DS] Đ/S</label>
                          <input
                            type="number"
                            value={config.tf || 0}
                            onChange={(e) => {
                              const newConfigs = [...sourceConfigs];
                              newConfigs[index].tf = Math.max(0, Number(e.target.value));
                              setSourceConfigs(newConfigs);
                            }}
                            className="w-full text-center text-sm p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 transition-all text-purple-600 font-bold"
                          />
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                          <label className="block text-[10px] font-bold text-blue-600/70 mb-1 tracking-wider whitespace-nowrap" title="Trắc nghiệm Trả lời ngắn">[TLN] T.LUẬN</label>
                          <input
                            type="number"
                            value={config.short || 0}
                            onChange={(e) => {
                              const newConfigs = [...sourceConfigs];
                              newConfigs[index].short = Math.max(0, Number(e.target.value));
                              setSourceConfigs(newConfigs);
                            }}
                            className="w-full text-center text-sm p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all text-blue-600 font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => {
                      setSourceConfigs(prev => [
                        ...prev,
                        { id: Math.random().toString(36).substring(2, 9), bankId: 'all', easy: 5, medium: 3, hard: 2, tf: 0, short: 0 }
                      ]);
                    }}
                    className="w-full py-2.5 mt-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 border-dashed rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors text-slate-500 hover:text-slate-700"
                  >
                    <Plus size={14} />
                    Thêm cấu hình nguồn
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* TAB 3: AI Generation and Created List */}

            <div className="space-y-6 animate-fade-in w-full">
              {/* ACTIVE EXAMS REGISTRY */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mb-4">
                  <i className="fa-solid fa-list-check text-slate-500"></i>
                  Danh sách đề đã tạo ({exams.length})
                </h3>

                {exams.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    Chưa có đề thi nào được tạo. Cấu hình bên trái hoặc dùng Trợ lý AI ở trên để thiết kế đề ngay!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto pr-1">
                    {exams.map((exam) => (
                      <div key={exam.id} className="py-3 flex items-center justify-between group">
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium text-slate-800 hover:text-blue-600 cursor-pointer" onClick={() => setGeneratedExam(exam)}>
                            {exam.title}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span>Độ dài: <strong className="text-slate-600">{exam.questions.length} câu</strong></span>
                            <span>•</span>
                            <span>Thời gian: <strong className="text-slate-600">{exam.duration} phút</strong></span>
                            <span>•</span>
                            <span className="text-emerald-500 font-medium">TN: {exam.difficultyRatio.easyCount}-{exam.difficultyRatio.mediumCount}-{exam.difficultyRatio.hardCount} | Đ/S: {exam.difficultyRatio.tfCount || 0} | Tự Luận: {exam.difficultyRatio.shortCount || 0}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectExamForQR(exam)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold"
                            title="Tạo QR giao bài"
                          >
                            <QrCode size={13} />
                            Giao QR
                          </button>

                          <button
                            onClick={() => onDeleteExam(exam.id)}
                            className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Xóa đề"
                          >
                            <Trash size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
        </div>
      )}            
      {activeGeneratorTab === 'bank' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="w-full space-y-6">
              {/* Source Bank Creation & Selection */}
              <div className="space-y-4">
                {/* Create New Bank Inline Form */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Database size={14} className="text-blue-500" />
                    Tạo nguồn lưu mới
                  </label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <select 
                      value={newBankSubject}
                      onChange={(e) => setNewBankSubject(e.target.value)}
                      className="w-full p-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="Toán học">Toán học</option>
                      <option value="Ngữ văn">Ngữ văn</option>
                      <option value="Tiếng Anh">Tiếng Anh</option>
                      <option value="Vật lí">Vật lí</option>
                      <option value="Hóa học">Hóa học</option>
                      <option value="Sinh học">Sinh học</option>
                      <option value="Lịch sử">Lịch sử</option>
                      <option value="Địa lí">Địa lí</option>
                      <option value="GDKT & PL">GDKT & PL</option>
                      <option value="Tin học">Tin học</option>
                      <option value="Công nghệ">Công nghệ</option>
                    </select>

                    <select 
                      value={newBankGrade}
                      onChange={(e) => setNewBankGrade(e.target.value)}
                      className="w-full p-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="Lớp 12">Lớp 12 (Kết nối tri thức)</option>
                      <option value="Lớp 11">Lớp 11 (Kết nối tri thức)</option>
                      <option value="Lớp 10">Lớp 10 (Kết nối tri thức)</option>
                      <option value="Lớp 9">Lớp 9 (Kết nối tri thức)</option>
                      <option value="Lớp 8">Lớp 8 (Kết nối tri thức)</option>
                      <option value="Lớp 7">Lớp 7 (Kết nối tri thức)</option>
                      <option value="Lớp 6">Lớp 6 (Kết nối tri thức)</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newBankName}
                      onChange={(e) => setNewBankName(e.target.value)}
                      placeholder="Đặt tên để lưu..."
                      className="w-full p-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newBankName.trim()) {
                          const formattedName = `[${newBankSubject} - ${newBankGrade}] ${newBankName.trim()}`;
                          const newId = onAddBank(formattedName);
                          setSelectedBankId(newId);
                          setNewBankName('');
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newBankName.trim()) {
                          const formattedName = `[${newBankSubject} - ${newBankGrade}] ${newBankName.trim()}`;
                          const newId = onAddBank(formattedName);
                          setSelectedBankId(newId);
                          setNewBankName('');
                        }
                      }}
                      disabled={!newBankName.trim()}
                      className="shrink-0 px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-400 rounded-lg font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Save size={14} />
                      Lưu
                    </button>
                  </div>
                </div>


            </div>



          </div>
          <div className="w-full space-y-6">
              {/* Word Import and Question Bank Management */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Database size={18} className="text-blue-500" />
                  Tải Lên Bằng Word & Quản Lý Ngân Hàng Câu Hỏi
                </h3>

                {/* Target Bank for Word Upload */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                  <span className="text-xs font-semibold text-slate-600 shrink-0">Nguồn đích:</span>
                  <select
                      value={selectedBankId}
                      onChange={(e) => setSelectedBankId(e.target.value)}
                      className="flex-1 text-sm bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 truncate"
                  >
                    <option value="all">-- Chọn nguồn (Bắt buộc) --</option>
                    {questionBanks.map(bank => (
                      <option key={bank.id} value={bank.id}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                  {selectedBankId !== 'all' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Bạn có chắc chắn muốn xoá nguồn này và toàn bộ câu hỏi trong đó?')) {
                          onDeleteBank(selectedBankId);
                          setSelectedBankId('all');
                        }
                      }}
                      className="shrink-0 p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                      title="Xoá nguồn này"
                    >
                      <Trash size={16} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Button 1: Tải file mẫu */}
                  <a
                    href={`/Maude.docx?v=${Date.now()}`}
                    download="Maude.docx"
                    className="flex flex-col items-center justify-center p-3.5 gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-100 transition-all text-center group"
                  >
                    <div className="p-2 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                      <Download size={18} className="text-indigo-600" />
                    </div>
                    <span className="text-xs font-bold">Tải Word mẫu</span>
                  </a>

                  {/* Button 2: Upload file */}
                  <div className="relative h-full">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedBankId === 'all') {
                          alert('Vui lòng tạo hoặc chọn một nguồn cụ thể (bên trên) trước khi tải file lên!');
                          return;
                        }
                        wordInputRef.current?.click();
                      }}
                      disabled={isReadingWord}
                      className={`w-full h-full flex flex-col items-center justify-center p-3.5 gap-2 rounded-xl transition-all text-center border group ${
                        selectedBankId === 'all'
                          ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                      }`}
                    >
                      <div className={`p-2 bg-white rounded-full shadow-sm ${selectedBankId !== 'all' && 'group-hover:scale-110'} transition-transform`}>
                        {isReadingWord ? (
                          <svg className="animate-spin h-4.5 w-4.5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <FileText size={18} className={selectedBankId === 'all' ? 'text-slate-400' : 'text-blue-600'} />
                        )}
                      </div>
                      <span className="text-xs font-bold">
                        {isReadingWord ? 'Đang đọc...' : 'Tải lên nguồn'}
                      </span>
                    </button>
                    <input
                      type="file"
                      ref={wordInputRef}
                      onChange={handleImportWord}
                      accept=".docx"
                      className="hidden"
                    />
                  </div>

                  {/* Button 3: Quản lý ngân hàng */}
                  <button
                    type="button"
                    onClick={() => setShowBankManagerModal(true)}
                    className="flex flex-col items-center justify-center p-3.5 gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl border border-amber-100 transition-all text-center group"
                  >
                    <div className="p-2 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                      <Database size={18} className="text-amber-600" />
                    </div>
                    <span className="text-xs font-bold">Quản lý kho câu hỏi</span>
                  </button>
                </div>
              </div>


            </div>
          </div>
          
          {/* Quản lý danh sách lớp */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <Users size={24} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Quản lý danh sách lớp học sinh ({studentClasses.length})</h3>
                  <p className="text-xs text-slate-500 mt-1">Tải lên danh sách học sinh để dễ dàng quản lý việc kiểm tra, đối chiếu kết quả.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadClassTemplate}
                  className="shrink-0 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-all flex items-center gap-2 group"
                >
                  <Download size={14} className="group-hover:scale-110 transition-transform" />
                  Tải Mẫu
                </button>
                <button
                  onClick={() => classListInputRef.current?.click()}
                  className="shrink-0 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-100 text-xs font-bold transition-all flex items-center gap-2 group"
                >
                  <Upload size={14} className="group-hover:scale-110 transition-transform" />
                  Tải Lên Excel
                </button>
                <input
                  type="file"
                  ref={classListInputRef}
                  onChange={handleImportClassList}
                  accept=".xlsx,.xls"
                  className="hidden"
                />
              </div>
            </div>

            {studentClasses.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {studentClasses.map(cls => (
                  <div key={cls.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between group">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-slate-700">Lớp {cls.name}</div>
                      <div className="text-xs text-slate-500">Sĩ số: <strong className="text-slate-700">{cls.students.length}</strong> học sinh</div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Bạn có chắc chắn muốn xóa lớp ${cls.name}?`)) {
                           onDeleteStudentClass(cls.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Xóa lớp"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* GENERATED EXAM PRINTING PREVIEW SECTION */}
            {generatedExam && (
              <div id="print-exam-card" className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden animate-fade-in">
                {/* Controls Header */}
                <div className="p-5 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">


                  <div className="flex items-center gap-2 whitespace-nowrap shrink-0">


                    <button
                      onClick={() => {
                        let examsToExport = [generatedExam];
                        if (examCodesCount > 1) {
                          examsToExport = [];
                          for (let i = 0; i < examCodesCount; i++) {
                            // Generate variant and assign exam code
                            const variantCode = 101 + i;
                            const variantQuestions = drawAndShuffleQuestions();
                            examsToExport.push({
                              ...generatedExam,
                              title: `${generatedExam.title} - Mã đề ${variantCode}`,
                              questions: variantQuestions
                            });
                          }
                        }
                        downloadExamWordFile(examsToExport, viewMode, schoolName, departmentName, examSubTitle, schoolYear, logoUrl);
                      }}
                      className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5"
                      title="Tải đề thi ở định dạng Microsoft Word (.docx/.zip)"
                    >
                      <Download size={14} />
                      Tải Word {examCodesCount > 1 ? '(.zip)' : '(.docx)'}
                    </button>

                    <button
                      onClick={() => downloadExamPptxFile(generatedExam, viewMode, schoolName, departmentName, examSubTitle, schoolYear, logoUrl)}
                      className="p-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5"
                      title="Tải bài giảng ở định dạng PowerPoint (.pptx)"
                    >
                      <Download size={14} />
                      Tải PowerPoint (.pptx)
                    </button>


                  </div>
                </div>

                {/* Exam Pages for printing */}
                <div className="p-8 sm:p-12 text-slate-900 select-text print:p-0 relative bg-white">
                  {/* Watermark overlay */}
                  {logoUrl && (
                    <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center opacity-[0.08]">
                      <img src={logoUrl} alt="Watermark" className="w-[60%] h-auto object-contain" />
                    </div>
                  )}

                  <div className="relative z-10">
                    {/* School Header */}
                    <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4 mb-8 text-xs font-medium uppercase tracking-wider">
                      <div className="flex items-center gap-4">
                        {logoUrl && (
                          <img src={logoUrl} alt="School Logo" className="w-[60px] h-[60px] object-contain" />
                        )}
                        <div className="space-y-0.5 text-center">
                          <div contentEditable suppressContentEditableWarning onBlur={(e) => setSchoolName(e.currentTarget.textContent || "TRƯỜNG THPT")} className="outline-none focus:bg-blue-50/50 hover:bg-slate-50 transition-colors rounded px-1 border border-transparent focus:border-blue-200 cursor-text min-w-[150px]">{schoolName}</div>
                          <div contentEditable suppressContentEditableWarning onBlur={(e) => setDepartmentName(e.currentTarget.textContent || "TỔ THI CỬ")} className="font-bold outline-none focus:bg-blue-50/50 hover:bg-slate-50 transition-colors rounded px-1 border border-transparent focus:border-blue-200 cursor-text min-w-[150px]">{departmentName}</div>
                        </div>
                      </div>

                    </div>

                    {/* Exam Details */}
                    <div className="text-center space-y-2 mb-10">
                      <h1
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => setGeneratedExam({ ...generatedExam, title: e.currentTarget.textContent || "ĐỀ KIỂM TRA" })}
                        className="text-xl font-bold uppercase tracking-tight text-slate-950 font-sans outline-none focus:bg-blue-50/50 hover:bg-slate-50 transition-colors rounded px-2 border border-transparent focus:border-blue-200 cursor-text inline-block min-w-[300px]"
                      >
                        {generatedExam.title}
                      </h1>
                      <div className="text-sm italic font-medium flex items-center justify-center gap-1">
                        Thời gian làm bài:
                        <span
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => setGeneratedExam({ ...generatedExam, duration: Number(e.currentTarget.textContent) || 45 })}
                          className="outline-none focus:bg-blue-50/50 hover:bg-slate-50 transition-colors rounded px-1 border border-transparent focus:border-blue-200 cursor-text inline-block min-w-[20px] text-center"
                        >
                          {generatedExam.duration}
                        </span>
                        phút (Không kể thời gian phát đề)
                      </div>

                      {viewMode === 'student' && (
                        <div className="max-w-md mx-auto pt-6 grid grid-cols-2 gap-4 border-t border-dashed border-slate-200 text-sm">
                          <div className="text-left">Họ và tên học sinh: ...............................................</div>
                          <div className="text-left">Số báo danh / Lớp: .........................</div>
                        </div>
                      )}
                    </div>

                    {/* Questions container */}
                    <div className="space-y-8">
                      {generatedExam.questions.map((q, qIdx) => (
                        <div key={q.id} className="space-y-3 break-inside-avoid">
                          <div className="font-medium text-[15px] flex items-start gap-1">
                            <span className="font-bold shrink-0">Câu {qIdx + 1}:</span>
                            <div className="flex-1 leading-relaxed">
                              <MathJaxRenderer content={q.content} inline={true} />
                              <span className="ml-1 text-[10px] font-bold text-slate-400 capitalize inline-block px-1.5 py-0.5 bg-slate-100 rounded-full select-none print:hidden">
                                [{q.difficulty}]
                              </span>
                            </div>
                          </div>

                          {/* Options */}
                          {q.options && q.options.length === 4 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                              {['A', 'B', 'C', 'D'].map((letter, optIdx) => {
                                const isCorrect = q.correctAnswer === letter && viewMode === 'teacher';
                                return (
                                  <div
                                    key={letter}
                                    className={`p-2.5 rounded-lg text-sm border transition-all flex items-center gap-1.5 ${isCorrect
                                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                                      : 'bg-slate-50/50 border-slate-100'
                                      }`}
                                  >
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${isCorrect
                                      ? 'bg-emerald-500 border-emerald-500 text-white'
                                      : 'bg-slate-100 border-slate-300 text-slate-600'
                                      }`}>
                                      {letter}
                                    </span>
                                    <div className="flex-1">
                                      <MathJaxRenderer content={q.options?.[optIdx] || ''} inline={true} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Solution display in Teacher Mode */}
                          {viewMode === 'teacher' && q.explanation && (
                            <div className="mt-3 ml-6 p-4 bg-amber-50/40 rounded-xl border border-amber-100/50 space-y-1.5 font-sans">
                              <div className="text-xs font-bold text-amber-700 flex items-center gap-1">
                                <i className="fa-solid fa-lightbulb text-xs"></i>
                                Giải thích chi tiết:
                              </div>
                              <div className="text-xs text-slate-700 antialiased leading-relaxed">
                                <MathJaxRenderer content={q.explanation} inline={false} />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Answer Key Grid on Bottom for Teacher */}
                    {viewMode === 'teacher' && (
                      <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1">
                          <i className="fa-solid fa-key text-yellow-500"></i>
                          Bảng Đáp Án Nhanh Đề Thi
                        </h4>
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                          {generatedExam.questions.map((q, idx) => (
                            <div key={idx} className="p-2 border border-slate-200 bg-white rounded-lg text-center font-mono">
                              <div className="text-[10px] text-slate-400 font-bold">Câu {idx + 1}</div>
                              <div className="text-sm font-bold text-blue-600">{q.correctAnswer}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* WORD PREVIEW & EDIT MODAL */}
            {showPreviewModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
                  {/* Header */}
                  <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="text-blue-400" size={20} />
                        <h3 className="text-base font-bold">Biên tập câu hỏi từ tệp tin Word</h3>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Phát hiện <strong className="text-blue-300">{previewQuestions.length} câu hỏi</strong>. Bạn có thể kiểm tra, sửa trực tiếp LaTeX, đổi mức độ khó hoặc xoá bớt trước khi thêm vào Ngân hàng.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowPreviewModal(false);
                        setPreviewQuestions([]);
                      }}
                      className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800/80 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Difficulty summaries */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/80 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-4 text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                        <span className="w-2 rounded-full h-2 bg-blue-500"></span>
                        🟢 Dễ: {previewQuestions.filter(q => q.difficulty === 'easy').length}
                      </span>
                      <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <span className="w-2 rounded-full h-2 bg-amber-500"></span>
                        🟡 Trung bình: {previewQuestions.filter(q => q.difficulty === 'medium').length}
                      </span>
                      <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                        <span className="w-2 rounded-full h-2 bg-red-500"></span>
                        🔴 Khó: {previewQuestions.filter(q => q.difficulty === 'hard').length}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      Nguồn đích: <strong className="text-blue-600 dark:text-blue-400">{questionBanks.find(b => b.id === selectedBankId)?.name}</strong>
                    </div>
                  </div>

                  {/* Scrollable Questions list */}
                  <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/40 dark:bg-slate-900/40">
                    {previewQuestions.map((q, idx) => (
                      <QuestionEditor
                        key={idx}
                        question={q}
                        index={idx}
                        onUpdate={(updatedFields) => handleUpdatePreviewQuestion(idx, updatedFields)}
                        onDelete={() => handleDeletePreviewQuestion(idx)}
                      />
                    ))}
                  </div>

                  {/* Footer triggers */}
                  <div className="p-5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3 shrink-0">
                    <button
                      onClick={() => {
                        if (confirm('Bỏ qua tất cả các câu hỏi đang chỉnh sửa?')) {
                          setShowPreviewModal(false);
                          setPreviewQuestions([]);
                        }
                      }}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-xs transition-colors"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      onClick={handleSavePreviewQuestions}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Save size={14} />
                      Lưu vào Ngân hàng câu hỏi ({previewQuestions.length} câu)
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* BANK MANAGER MODAL */}
            {showBankManagerModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
                  <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="text-amber-400" size={20} />
                      <h3 className="text-base font-bold">Quản lý Ngân hàng Câu hỏi</h3>
                    </div>
                    <button onClick={() => setShowBankManagerModal(false)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800/80 transition-colors"><X size={20} /></button>
                  </div>

                  {/* Bank Filter inside Modal */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Lọc theo nguồn:</span>
                    <select
                      value={selectedBankId}
                      onChange={(e) => setSelectedBankId(e.target.value)}
                      className="flex-1 max-w-sm text-sm p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    >
                      <option value="all">Tất cả các nguồn</option>
                      {questionBanks.map(bank => (
                        <option key={bank.id} value={bank.id}>
                          {bank.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/40 dark:bg-slate-900/40">
                    {questions.filter(q => selectedBankId === 'all' || q.bankId === selectedBankId).map((q, idx) => {
                      const { errors, warnings } = validateQuestion(q);
                      const isEditing = editingQuestionId === q.id;

                      if (isEditing) {
                        return (
                          <div key={q.id} className="relative">
                            <QuestionEditor
                              question={q}
                              index={idx}
                              onUpdate={(updatedFields) => onUpdateQuestion(q.id, updatedFields)}
                              onDelete={() => {
                                if (confirm('Xóa câu hỏi này khỏi ngân hàng?')) {
                                  onDeleteQuestion(q.id);
                                }
                              }}
                            />
                            <button
                              onClick={() => setEditingQuestionId(null)}
                              className="absolute bottom-4 right-14 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-1.5"
                            >
                              <Save size={14} />
                              Lưu & Đóng
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div key={q.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-sm shrink-0">Câu {idx + 1}:</span>
                              <div className="text-sm flex-1"><MathJaxRenderer content={q.content} inline={true} /></div>
                            </div>

                            {/* Bank Tag */}
                            <div className="mt-1 text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-700/50 inline-block px-2 py-1 rounded-md">
                              Nguồn: {questionBanks.find(b => b.id === q.bankId)?.name || 'Không xác định'}
                            </div>

                            {/* Errors and Warnings Tags */}
                            {(errors.length > 0 || warnings.length > 0) && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {errors.map((err, i) => (
                                  <span key={`err-${i}`} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold">
                                    <AlertCircle size={10} /> {err}
                                  </span>
                                ))}
                                {warnings.map((warn, i) => (
                                  <span key={`warn-${i}`} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-bold">
                                    <AlertCircle size={10} /> {warn}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 flex flex-col gap-2">
                            <button onClick={() => setEditingQuestionId(q.id)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center justify-center" title="Chỉnh sửa">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => { if (confirm('Xóa câu hỏi này khỏi ngân hàng?')) onDeleteQuestion(q.id); }} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg flex items-center justify-center" title="Xóa">
                              <Trash size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {questions.filter(q => selectedBankId === 'all' || q.bankId === selectedBankId).length === 0 && (
                      <div className="text-center p-8 text-slate-500 text-sm">Ngân hàng này chưa có câu hỏi nào.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
    </div>
  );
}
