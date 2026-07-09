const fs = require('fs');
const file = 'src/components/ExamGenerator.tsx';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(
  'Phân hóa: {exam.difficultyRatio.easyCount}-{exam.difficultyRatio.mediumCount}-{exam.difficultyRatio.hardCount}',
  'TN: {exam.difficultyRatio.easyCount}-{exam.difficultyRatio.mediumCount}-{exam.difficultyRatio.hardCount} | Đ/S: {exam.difficultyRatio.tfCount || 0} | Tự Luận: {exam.difficultyRatio.shortCount || 0}'
);

fs.writeFileSync(file, code);
console.log('UI Exam list difficulty string updated!');
