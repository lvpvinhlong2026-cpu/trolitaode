const fs = require('fs');
const file = 'src/components/ExamGenerator.tsx';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(
  'sum + cfg.easy + cfg.medium + cfg.hard, 0)}',
  'sum + cfg.easy + cfg.medium + cfg.hard + (cfg.tf || 0) + (cfg.short || 0), 0)}'
);

fs.writeFileSync(file, code);
console.log('UI Total string updated!');
