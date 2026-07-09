const fs = require('fs');
const mammoth = require('mammoth');
const JSZip = require('jszip');

async function test() {
  const filePath = 'd:\\HOC_AI_lE_VINH_PHUC\\1_TAO_DE_KTTX\\public\\Maude.docx';
  let buffer = fs.readFileSync(filePath);
  
  try {
    const zip = new JSZip();
    await zip.loadAsync(buffer);
    // Don't even modify it, just re-generate
    buffer = await zip.generateAsync({ type: "nodebuffer" });

    const result = await mammoth.extractRawText({ buffer: buffer });
    const text = result.value;
    console.log("=== RAW TEXT ===");
    console.log(text.substring(0, 100));
    console.log("================");
    
    // Simulate the parser
    const questionSplitRegex = /((?:Câu|Bài|Question|Cầu|Cau|Câu số)\s*\d+)/i;
    const parts = text.split(questionSplitRegex);
    console.log(`Split parts count: ${parts.length}`);
  } catch (err) {
    console.error("MAMMOTH FAILED AFTER JSZIP RE-GENERATE", err);
  }
}

test();
