const fs = require('fs');
const babelParser = require('./node_modules/@babel/parser');

function check(code) {
  try {
    babelParser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
    return true;
  } catch (e) {
    return e.message;
  }
}

const originalCode = fs.readFileSync('src/components/ExamGenerator.tsx', 'utf8');

function testBlock(name, startLine, endLine) {
  let lines = originalCode.split('\n');
  let newLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (i + 1 >= startLine && i + 1 <= endLine) {
      if (i + 1 === startLine) newLines.push('{null}');
      continue;
    }
    newLines.push(lines[i]);
  }
  let res = check(newLines.join('\n'));
  console.log(`Removing ${name} (${startLine}-${endLine}): ${res === true ? 'FIXED!' : 'Still error: ' + res}`);
}

// Bisecting 787 to 1117
// The generate tab contains 2 main cols:
// Col 1: 789 - 1017 (Generate Action)
// Col 2: 1018 - 1114 (AI Generation and Created List)

testBlock('Col 1: Generate Action', 789, 1017);
testBlock('Col 2: AI/List', 1018, 1114);
