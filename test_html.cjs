const fs = require('fs');
const mammoth = require('mammoth');

async function test() {
  const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:w="urn:schemas-microsoft-com:office:word" 
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Test</title>
      </head>
      <body>
        <div class="question-block">
          <div>
            <span class="font-bold color-green">Câu 1 [Nhận biết]: </span>
            <span>Test content</span>
          </div>
        </div>
      </body>
      </html>
    `;
  const buffer = Buffer.from(html, 'utf8');
  
  try {
    const result = await mammoth.extractRawText({ buffer: buffer });
    const text = result.value;
    console.log("=== RAW TEXT ===");
    console.log(text);
    console.log("================");
  } catch (err) {
    console.error("MAMMOTH FAILED", err.message);
  }
}

test();
