const fs = require('fs');
const files = ['src/App.tsx', 'src/components/ExamGenerator.tsx'];
files.forEach(file => {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf-8');
    // The exact text from the screenshot is "Trợ lý Kiểm tra thường xuyên"
    code = code.replace(/Trợ lý Kiểm tra thường xuyên/g, 'Trợ lí kiểm tra online');
    // Just in case it has slightly different casing
    code = code.replace(/Trợ lý kiểm tra thường xuyên/g, 'Trợ lí kiểm tra online');
    code = code.replace(/Trợ Lý Kiểm Tra Thường Xuyên/g, 'Trợ lí kiểm tra online');
    code = code.replace(/Trợ lí Kiểm tra thường xuyên/g, 'Trợ lí kiểm tra online');
    
    fs.writeFileSync(file, code);
    console.log(`Updated ${file}`);
  }
});
