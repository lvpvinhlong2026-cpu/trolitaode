const fs = require('fs');
let code = fs.readFileSync('src/components/ExamGenerator.tsx', 'utf-8');

const createBankStart = `              {/* Source Bank Creation & Selection */}`;
const createBankEnd = `              {/* ACTION TRIGGERS */}`;
const block1 = code.substring(code.indexOf(createBankStart), code.indexOf(createBankEnd));

code = code.replace(block1, '');

const importStart = `              {/* Word Import and Question Bank Management */}`;
const importEnd = `              {/* ACTIVE EXAMS REGISTRY */}`;
const block2 = code.substring(code.indexOf(importStart), code.indexOf(importEnd));

code = code.replace(block2, '');

const bankTabContent = `
      {activeGeneratorTab === 'bank' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-fade-in">
          <div className="w-full space-y-6">
` + block1.replace(/class/g, 'className').replace(/classNameName/g, 'className') /* strip extra tags just in case */ + `
          </div>
          <div className="w-full space-y-6">
` + block2 + `
          </div>
        </div>
      )}
`;

// Insert it right before GENERATED EXAM PRINTING PREVIEW SECTION
code = code.replace('{/* GENERATED EXAM PRINTING PREVIEW SECTION */}', bankTabContent + '\n      {/* GENERATED EXAM PRINTING PREVIEW SECTION */}');

fs.writeFileSync('src/components/ExamGenerator.tsx', code);
console.log("Refactoring complete");
