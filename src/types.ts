/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Subject {
  id: string;
  name: string;
  icon: string;
  questionsCount: number;
}

export interface QuestionBank {
  id: string;
  name: string;
  createdAt: string;
}

export interface Question {
  id: string;
  subjectId: string;
  bankId?: string;
  content: string; // supports LaTeX formatted text
  type: 'multiple-choice' | 'essay' | 'true-false';
  options?: string[]; // array of answers (A, B, C, D) OR 4 statements (a, b, c, d) for true-false
  correctAnswer: string; // e.g. "A", "B", "C", "D", or "T-F-T-F" for true-false, or sample text for essay
  explanation?: string; // Step-by-step LaTeX solution explanation
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Session {
  id: string;
  subjectId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // in seconds
  date: string; // ISO date string
  studentName?: string;
  studentClass?: string;
  examId?: string;
  examTitle?: string;
}

export interface Progress {
  totalAttempts: number;
  averageScore: number;
  streakDays: number;
  weakTopics: string[]; // List of subject names or subtopics needing improvement
}

export interface Settings {
  theme: 'light' | 'dark';
  soundEnabled: boolean;
  autoSave: boolean;
}

export interface LaTeXConversion {
  id: string;
  rawText: string;
  convertedLatex: string;
  date: string;
}

export interface Student {
  id: string; // SBD or unique string
  name: string;
  dob?: string;
  gender?: string;
  note?: string;
}

export interface StudentClass {
  id: string;
  name: string;
  students: Student[];
  createdAt: string;
}

export interface Exam {
  id: string;
  title: string;
  subjectId: string;
  questions: Question[];
  difficultyRatio: {
    easyCount: number;
    mediumCount: number;
    hardCount: number;
    tfCount?: number;
    shortCount?: number;
  };
  duration: number; // in minutes
  createdAt: string;
  isDynamic?: boolean; // If true, questions are randomly drawn for each student
  sourceBankId?: string; // The bank ID to draw questions from if dynamic
  maxAttempts?: number; // Maximum allowed attempts per student (0 or undefined = unlimited)
  assignedClassIds?: string[]; // Tùy chọn gán đề thi cho nhiều lớp cụ thể
  assignedClassesData?: StudentClass[]; // Dữ liệu lớp học được nhúng vào để HS chọn tên
}

export interface AppData {
  subjects: Subject[];
  questions: Question[];
  questionBanks: QuestionBank[];
  sessions: Session[];
  progress: Progress;
  settings: Settings;
  laTexConversions: LaTeXConversion[];
  exams: Exam[];
  studentClasses: StudentClass[];
}
