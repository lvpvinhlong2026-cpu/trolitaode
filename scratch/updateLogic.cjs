const fs = require('fs');
const file = 'src/components/ExamGenerator.tsx';
let code = fs.readFileSync(file, 'utf-8');

// Replace total count sum
code = code.replace(
    'const totalRequested = totalEasy + totalMedium + totalHard;',
    `const totalTf = sourceConfigs.reduce((sum, cfg) => sum + (cfg.tf || 0), 0);
    const totalShort = sourceConfigs.reduce((sum, cfg) => sum + (cfg.short || 0), 0);
    const totalRequested = totalEasy + totalMedium + totalHard + totalTf + totalShort;`
);

// Replace difficultyRatio
code = code.replace(
    'difficultyRatio: { easyCount: totalEasy, mediumCount: totalMedium, hardCount: totalHard },',
    'difficultyRatio: { easyCount: totalEasy, mediumCount: totalMedium, hardCount: totalHard, tfCount: totalTf, shortCount: totalShort },'
);

fs.writeFileSync(file, code);
console.log('Update applied');
