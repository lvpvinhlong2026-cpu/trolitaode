/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExamCV7991 } from '../types/pedagogy';

export interface ExamValidationReport {
  totalPoints: number;
  isTotalTen: boolean;
  matrixCounts: { part1: number; part2: number; part3: number; part4: number };
  examCounts: { part1: number; part2: number; part3: number; part4: number };
  warnings: string[];
}

export function validateExamAgainstMatrix(exam: ExamCV7991): ExamValidationReport {
  const p1Points = (exam.part1Questions || []).reduce((s, q) => s + (q.points ?? 0.25), 0);
  const p2Points = (exam.part2Questions || []).reduce((s, q) => s + (q.pointsTotal ?? 1.0), 0);
  const p3Points = (exam.part3Questions || []).reduce((s, q) => s + (q.points ?? 0.5), 0);
  const p4Points = (exam.part4Questions || []).reduce((s, q) => s + (q.points ?? 0), 0);

  const totalPoints = Math.round((p1Points + p2Points + p3Points + p4Points) * 100) / 100;
  const isTotalTen = Math.abs(totalPoints - 10) < 0.01;

  const matrixCounts = (exam.matrixRows || []).reduce(
    (acc, row) => ({
      part1: acc.part1 + (row.part1?.know || 0) + (row.part1?.understand || 0) + (row.part1?.apply || 0),
      part2: acc.part2 + (row.part2?.know || 0) + (row.part2?.understand || 0) + (row.part2?.apply || 0),
      part3: acc.part3 + (row.part3?.know || 0) + (row.part3?.understand || 0) + (row.part3?.apply || 0),
      part4: acc.part4 + (row.part4?.know || 0) + (row.part4?.understand || 0) + (row.part4?.apply || 0),
    }),
    { part1: 0, part2: 0, part3: 0, part4: 0 }
  );

  const examCounts = {
    part1: (exam.part1Questions || []).length,
    part2: (exam.part2Questions || []).length,
    part3: (exam.part3Questions || []).length,
    part4: (exam.part4Questions || []).length,
  };

  const warnings: string[] = [];

  if (!isTotalTen) {
    warnings.push(`Tổng điểm hiện tại là ${totalPoints.toFixed(2)}đ (chưa đạt chuẩn 10.00đ).`);
  }

  if (exam.matrixRows && exam.matrixRows.length > 0) {
    if (matrixCounts.part1 !== examCounts.part1) {
      warnings.push(`Phần I: Đề có ${examCounts.part1} câu, Ma trận khai báo ${matrixCounts.part1} câu.`);
    }
    if (matrixCounts.part2 !== examCounts.part2) {
      warnings.push(`Phần II: Đề có ${examCounts.part2} câu, Ma trận khai báo ${matrixCounts.part2} câu.`);
    }
    if (matrixCounts.part3 !== examCounts.part3) {
      warnings.push(`Phần III: Đề có ${examCounts.part3} câu, Ma trận khai báo ${matrixCounts.part3} câu.`);
    }
    if (matrixCounts.part4 !== examCounts.part4) {
      warnings.push(`Phần IV: Đề có ${examCounts.part4} câu, Ma trận khai báo ${matrixCounts.part4} câu.`);
    }
  }

  return {
    totalPoints,
    isTotalTen,
    matrixCounts,
    examCounts,
    warnings,
  };
}
