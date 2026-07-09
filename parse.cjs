const fs = require('fs');
const babelParser = require('./node_modules/@babel/parser');

const code = fs.readFileSync('d:/HOC_AI_lE_VINH_PHUC/1_TAO_DE_KTTX/src/components/ExamGenerator.tsx', 'utf8');

try {
  babelParser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log("No syntax errors found!");
} catch (e) {
  console.error("Syntax Error:");
  console.error(e.message);
  console.error(`Line: ${e.loc?.line}, Column: ${e.loc?.column}`);
}
