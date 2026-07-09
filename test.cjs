const fs = require('fs');
const mammoth = require('mammoth');

async function test() {
  const filePath = 'd:\\HOC_AI_lE_VINH_PHUC\\1_TAO_DE_KTTX\\public\\Maude.docx';
  const buffer = fs.readFileSync(filePath);
  
  try {
    const result = await mammoth.extractRawText({ buffer: buffer });
    const text = result.value;
    console.log("=== RAW TEXT ===");
    console.log(text);
    console.log("================");
    
    // Simulate the parser
    const questionSplitRegex = /((?:Câu|Bài|Question|Cầu|Cau|Câu số)\s*\d+)/i;
    const parts = text.split(questionSplitRegex);
    console.log(`Split parts count: ${parts.length}`);
    let validBlocks = 0;
    
    for (let idx = 1; idx < parts.length; idx += 2) {
      const questionTitle = parts[idx];
      const questionBody = parts[idx + 1] || "";
      const fullBlockText = (questionTitle + questionBody).trim();
      if (!fullBlockText) continue;
      validBlocks++;
    }
    console.log(`Found valid question blocks: ${validBlocks}`);
  } catch (err) {
    console.error(err);
  }
}

test();
