/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExamCV7991 } from '../types/pedagogy';

const DRAFT_STORAGE_KEY = 'tro_li_tao_de_exam_draft_v1';
const LIBRARY_STORAGE_KEY = 'tro_li_tao_de_exam_library_v1';

export interface SavedExamEntry {
  id: string;
  title: string;
  subject: string;
  grade: string;
  savedAt: string;
  exam: ExamCV7991;
}

export function loadExamDraft(): ExamCV7991 | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.part1Questions) && Array.isArray(parsed.matrixRows)) {
      return parsed as ExamCV7991;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveExamDraft(exam: ExamCV7991): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(exam));
  } catch (e) {
    console.warn('Không thể lưu bản nháp đề thi vào localStorage:', e);
  }
}

export function loadExamLibrary(): SavedExamEntry[] {
  try {
    const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveExamToLibrary(exam: ExamCV7991, customTitle?: string): SavedExamEntry[] {
  const list = loadExamLibrary();
  const entry: SavedExamEntry = {
    id: `exam_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: (customTitle || exam.examTitle || 'Đề kiểm tra chưa đặt tên').trim(),
    subject: exam.subject || 'Toán học',
    grade: exam.grade || '12',
    savedAt: new Date().toISOString(),
    exam: JSON.parse(JSON.stringify(exam)),
  };
  const updated = [entry, ...list].slice(0, 30); // Giữ tối đa 30 đề gần nhất
  try {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Không thể lưu vào thư viện đề:', e);
  }
  return updated;
}

export function deleteExamFromLibrary(id: string): SavedExamEntry[] {
  const updated = loadExamLibrary().filter((item) => item.id !== id);
  try {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Không thể xóa đề khỏi thư viện:', e);
  }
  return updated;
}
