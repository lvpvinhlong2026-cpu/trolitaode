/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import LZString from 'lz-string';
import { 
  Sparkles, 
  Settings, 
  FileText, 
  QrCode, 
  BarChart4, 
  GraduationCap, 
  FileSignature, 
  Key, 
  Download, 
  Upload, 
  Moon, 
  Sun,
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle,
  Copy,
  Table,
  CheckCircle2
} from 'lucide-react';
import { AppData, LaTeXConversion, Question, Exam, Session, QuestionBank } from './types';
import { 
  getStoredData, 
  saveStoredData, 
  recalculateProgress, 
  exportBackup, 
  importBackup 
} from './utils/dataStore';

// Modules
import PdfConverter from './components/PdfConverter';
import SimilarExamGenerator from './components/SimilarExamGenerator';
import MatrixExamGenerator from './components/MatrixExamGenerator';
import StandardizeExamGenerator from './components/StandardizeExamGenerator';
import AITutor from './components/AITutor';
import SettingsForm from './components/SettingsForm';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [appData, setAppData] = useState<AppData | null>(null);
  const isStudentPortal = new URLSearchParams(window.location.search).has('examId') || new URLSearchParams(window.location.search).has('examData');
  const [activeTab, setActiveTab] = useState<'pdf' | 'similar' | 'standardize' | 'matrix' | 'tutor'>('pdf');
  const [qrTargetExam, setQrTargetExam] = useState<Exam | null>(null);

  // Backup and Restore states
  const [importError, setImportError] = useState<string>('');
  const [importSuccess, setImportSuccess] = useState<boolean>(false);

  // API Key & Model Settings states
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [preferredModel, setPreferredModel] = useState<string>(() => localStorage.getItem('gemini_preferred_model') || 'gemini-3-flash-preview');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showKeyRequiredModal, setShowKeyRequiredModal] = useState<boolean>(false);

  // Check key on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('examId') && !params.has('examData')) {
      const key = localStorage.getItem('gemini_api_key');
      if (!key || !key.trim()) {
        setShowKeyRequiredModal(true);
      }
    }
  }, []);

  // Load state on mount
  useEffect(() => {
    // Standard data
    const data = getStoredData();
    setAppData(data);

    // Dark mode classes synced
    if (data.settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Handle student deep link (Removed as system is now PDF Converter)
  }, []);

  // Sync state data trigger helper
  const updateAppDataState = (updated: AppData) => {
    setAppData(updated);
    saveStoredData(updated);
  };

  // State Callbacks

  const handleAddBank = (bankName: string): string => {
    if (!appData) return '';
    const newBank: QuestionBank = {
      id: 'bank-' + Math.random().toString(36).substring(2, 9),
      name: bankName,
      createdAt: new Date().toISOString()
    };
    updateAppDataState({
      ...appData,
      questionBanks: [newBank, ...appData.questionBanks]
    });
    return newBank.id;
  };

  const handleDeleteBank = (bankId: string) => {
    if (!appData) return;
    
    // Find questions to delete
    const questionsToDelete = appData.questions.filter(q => q.bankId === bankId);
    const newQuestions = appData.questions.filter(q => q.bankId !== bankId);
    
    // Update subjects questionsCount accordingly
    let newSubjects = [...appData.subjects];
    questionsToDelete.forEach(deletedQuestion => {
      newSubjects = newSubjects.map(sub => {
        if (sub.id === deletedQuestion.subjectId) {
          return { ...sub, questionsCount: Math.max(0, sub.questionsCount - 1) };
        }
        return sub;
      });
    });

    const newBanks = appData.questionBanks.filter(b => b.id !== bankId);

    updateAppDataState({ 
      ...appData, 
      questions: newQuestions, 
      subjects: newSubjects,
      questionBanks: newBanks
    });
  };

  const handleAddQuestions = (questions: Question[], bankId: string) => {
    if (!appData) return;
    
    const questionsWithBank = questions.map(q => ({ ...q, bankId }));
    const updatedQuestions = [...questionsWithBank, ...appData.questions];
    
    // Update question count for matching subjects
    const updatedSubjects = appData.subjects.map(sub => {
      const addedToSub = questions.filter(q => q.subjectId === sub.id).length;
      if (addedToSub > 0) {
        return { ...sub, questionsCount: sub.questionsCount + addedToSub };
      }
      return sub;
    });

    updateAppDataState({
      ...appData,
      subjects: updatedSubjects,
      questions: updatedQuestions
    });
  };


  const handleUpdateQuestion = (id: string, updatedFields: Partial<Question>) => {
    if (!appData) return;
    const newQuestions = appData.questions.map(q => q.id === id ? { ...q, ...updatedFields } : q);
    updateAppDataState({ ...appData, questions: newQuestions });
  };

  const handleDeleteQuestion = (id: string) => {
    if (!appData) return;
    const newQuestions = appData.questions.filter(q => q.id !== id);
    
    // Update subjects questionsCount accordingly
    const deletedQuestion = appData.questions.find(q => q.id === id);
    let newSubjects = appData.subjects;
    if (deletedQuestion) {
      newSubjects = appData.subjects.map(sub => {
        if (sub.id === deletedQuestion.subjectId) {
          return { ...sub, questionsCount: Math.max(0, sub.questionsCount - 1) };
        }
        return sub;
      });
    }

    updateAppDataState({ ...appData, questions: newQuestions, subjects: newSubjects });
  };

  const handleAddExam = (exam: Exam) => {
    if (!appData) return;
    updateAppDataState({
      ...appData,
      exams: [exam, ...appData.exams]
    });
    setQrTargetExam(exam);
  };

  const handleDeleteExam = (id: string) => {
    if (!appData) return;
    updateAppDataState({
      ...appData,
      exams: appData.exams.filter(ex => ex.id !== id)
    });
    if (qrTargetExam && qrTargetExam.id === id) {
      setQrTargetExam(null);
    }
  };

  const handleAddSession = (sess: Session) => {
    if (!appData) return;
    const list = [sess, ...appData.sessions];
    const computedProgress = recalculateProgress(list);
    updateAppDataState({
      ...appData,
      sessions: list,
      progress: computedProgress
    });
  };

  const handleDeleteSession = (id: string) => {
    if (!appData) return;
    const list = appData.sessions.filter(s => s.id !== id);
    const computedProgress = recalculateProgress(list);
    updateAppDataState({
      ...appData,
      sessions: list,
      progress: computedProgress
    });
  };

  const handleClearSessions = () => {
    if (!appData) return;
    const computedProgress = recalculateProgress([]);
    updateAppDataState({
      ...appData,
      sessions: [],
      progress: computedProgress
    });
  };

  const handleAddStudentClass = (newClass: any) => {
    if (!appData) return;
    updateAppDataState({
      ...appData,
      studentClasses: [newClass, ...appData.studentClasses]
    });
  };

  const handleDeleteStudentClass = (id: string) => {
    if (!appData) return;
    updateAppDataState({
      ...appData,
      studentClasses: appData.studentClasses.filter(c => c.id !== id)
    });
  };
  // Dark Scheme toggler
  const handleToggleTheme = () => {
    if (!appData) return;
    const isDark = appData.settings.theme === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';
    
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    updateAppDataState({
      ...appData,
      settings: {
        ...appData.settings,
        theme: nextTheme
      }
    });
  };

  // Exports Data backup file
  const triggerExportBackup = () => {
    if (!appData) return;
    const jsonStr = exportBackup(appData);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_toan_hoc_ai_studio_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Imports Data backup file
  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files[0]) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const restored = importBackup(content);
        setAppData(restored);
        setImportSuccess(true);
        setImportError('');
        setTimeout(() => setImportSuccess(false), 2500);
      } catch (err: any) {
        setImportError(err.message);
        setImportSuccess(false);
      }
    };
    reader.readAsText(file);
  };

  const navigateToQRForExam = (exam: Exam) => {
    setQrTargetExam(exam);
    // Since QR tab is removed, this function may not be needed anymore, but we keep the state update.
  };

  const handleSaveSettings = (key: string, model: string) => {
    localStorage.setItem('gemini_api_key', key);
    localStorage.setItem('gemini_preferred_model', model);
    setApiKey(key);
    setPreferredModel(model);
    setShowSettingsModal(false);
    setShowKeyRequiredModal(false);
  };

  if (!appData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f8fafc]">
        <div className="text-center space-y-3">
          <i className="fa-solid fa-spinner animate-spin text-3xl text-blue-500"></i>
          <p className="text-sm text-slate-500 font-medium">Đang khởi tạo Hệ thống Trợ lý Toán học AI...</p>
        </div>
      </div>
    );
  }

  const isDark = appData.settings.theme === 'dark';

  return (
    <div className={`min-h-screen pb-16 transition-colors duration-300 bg-mesh ${isDark ? 'dark bg-slate-900 text-slate-100' : 'bg-[#f8fafc] text-slate-800'}`}>
      
      {/* HEADER SECTION WITH GRADIENT DECORATION */}
      {!isStudentPortal && (
      <header className="bg-gradient-to-r from-blue-700 via-indigo-700 to-orange-500 text-white shadow-md relative overflow-hidden">
        {/* Ambient blurring background spheres */}
        <div className="absolute top-0 right-1/4 w-80 h-32 bg-white/5 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-md shadow-inner text-white">
              <i className="fa-solid fa-graduation-cap text-2xl"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">Trợ lí giáo dục</h1>
                <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full font-bold border border-white/10 uppercase">
                  v2.5 Premium
                </span>
              </div>
              <p className="text-xs text-blue-100/80 font-medium mt-0.5">
                Hệ thống được tạo bởi GV: Lê Vĩnh Phúc, SĐT 0944405124
              </p>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-2.5 whitespace-nowrap">

            {/* Settings & API Key Configuration */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                !apiKey.trim()
                  ? 'bg-red-500/20 border-red-500 hover:bg-red-500/30 text-red-200'
                  : 'bg-white/10 border-white/10 hover:bg-white/15 text-white'
              }`}
              title="Cấu hình Gemini API Key & Model"
            >
              <Settings size={13} />
              <span>Cấu hình AI</span>
              {!apiKey.trim() && (
                <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold ml-1 animate-pulse">
                  Lấy API key để sử dụng app
                </span>
              )}
            </button>

            {/* Dark Mode toggle icon */}
            <button
              onClick={handleToggleTheme}
              className="p-2.5 bg-white/10 border border-white/10 hover:bg-white/20 rounded-xl transition"
              title="Giao diện sáng/tối"
            >
              {isDark ? <Sun size={14} className="text-amber-300" /> : <Moon size={14} />}
            </button>
          </div>
        </div>
      </header>
      )}

      {/* CORE MODULAR NAVIGATION PANEL */}
      <main className="max-w-7xl mx-auto px-4 mt-8 space-y-6">
        {/* Error indicators for restored profiles */}
        {importError && (
          <div className="flex items-center gap-2 text-xs text-red-600 p-3 bg-red-ec text-red-600 dark:bg-slate-800 border border-red-200 dark:border-red-900 rounded-xl">
            <AlertCircle size={14} />
            <span>{importError}</span>
          </div>
        )}
        {importSuccess && (
          <div className="flex items-center gap-2 text-xs text-emerald-600 p-3 bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900 rounded-xl">
            <Check size={14} />
            <span>Khôi phục dữ liệu hồ sơ thành công! Ngân hàng và đề thi đã cập nhật.</span>
          </div>
        )}
        
        {/* Navigation Tabs Bar */}
        {(new URLSearchParams(window.location.search).has('examId') || new URLSearchParams(window.location.search).has('examData')) ? null : (
        <div className="flex border-b border-slate-200/60 dark:border-slate-800 p-1 bg-white/50 backdrop-blur-md rounded-2xl shadow-xs dark:bg-slate-900/40 divide-x divide-slate-100 dark:divide-slate-800">
          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'pdf'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400'
            }`}
          >
            <FileText size={15} />
            Chuyển PDF sang Word
          </button>

          <button
            onClick={() => setActiveTab('similar')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'similar'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400'
            }`}
          >
            <Copy size={15} />
            Tạo Đề Tương Tự
          </button>

          <button
            onClick={() => setActiveTab('standardize')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'standardize'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400'
            }`}
          >
            <CheckCircle2 size={15} />
            Chuẩn Hóa Đề
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'matrix'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400'
            }`}
          >
            <Table size={15} />
            Tạo Đề Ma Trận
          </button>

          <button
            onClick={() => setActiveTab('tutor')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'tutor'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400'
            }`}
          >
            <GraduationCap size={15} />
            Giao diện AI
          </button>
        </div>
        )}

        {/* ACTIVE PORT MODULE */}
        <div className="relative mt-6">
          <div className={activeTab === 'pdf' ? 'block animate-fade-in' : 'hidden'}>
            <PdfConverter apiKey={apiKey} model={preferredModel} />
          </div>

          <div className={activeTab === 'similar' ? 'block animate-fade-in' : 'hidden'}>
            <SimilarExamGenerator apiKey={apiKey} model={preferredModel} />
          </div>

          <div className={activeTab === 'standardize' ? 'block animate-fade-in' : 'hidden'}>
            <StandardizeExamGenerator apiKey={apiKey} model={preferredModel} />
          </div>

          <div className={activeTab === 'matrix' ? 'block animate-fade-in' : 'hidden'}>
            <MatrixExamGenerator apiKey={apiKey} model={preferredModel} />
          </div>

          <div className={activeTab === 'tutor' ? 'block animate-fade-in' : 'hidden'}>
            <AITutor
              sessions={appData.sessions}
              progress={appData.progress}
            />
          </div>
        </div>
      </main>

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Settings size={18} className="text-blue-500" />
                Cấu hình API Key & Model AI
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <SettingsForm
              initialKey={apiKey}
              initialModel={preferredModel}
              onSave={handleSaveSettings}
              onClose={() => setShowSettingsModal(false)}
              allowClose={true}
            />
          </div>
        </div>
      )}

      {/* MANDATORY API KEY REQUIRED MODAL */}
      {showKeyRequiredModal && !showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 max-w-md w-full p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <Sparkles size={32} className="animate-pulse" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                Chào mừng bạn đến với Trợ lý Toán học AI!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                Để sử dụng các tính năng trợ lý thông minh (sinh câu hỏi, lập lộ trình ôn tập cá nhân), vui lòng cấu hình khóa API Gemini của bạn.
              </p>
            </div>

            <SettingsForm
              initialKey={apiKey}
              initialModel={preferredModel}
              onSave={handleSaveSettings}
              onClose={() => {}}
              allowClose={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
