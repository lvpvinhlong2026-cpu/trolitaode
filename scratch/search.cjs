const fs = require('fs');
const files = ['src/App.tsx', 'src/components/ExamGenerator.tsx', 'index.html'];
files.forEach(file => {
  if (fs.existsSync(file)) {
    const code = fs.readFileSync(file, 'utf-8');
    if (code.includes('Trợ lý') || code.includes('thường xuyên') || code.includes('Thường xuyên')) {
      console.log(`Found in ${file}`);
    }
  }
});
