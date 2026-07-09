const fs = require('fs');
const DOMParser = require('@xmldom/xmldom').DOMParser;
const XMLSerializer = require('@xmldom/xmldom').XMLSerializer;
const xsltProcess = require('xslt-processor').xsltProcess;
const xmlParse = require('xslt-processor').xmlParse;

const xsltText = fs.readFileSync('public/OMML2MML.XSL', 'utf8');
const xsltDom = xmlParse(xsltText);

const ommlStr = `
<m:oMathPara xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <m:oMath>
    <m:f>
      <m:num><m:r><m:t>1</m:t></m:r></m:num>
      <m:den><m:r><m:t>2</m:t></m:r></m:den>
    </m:f>
  </m:oMath>
</m:oMathPara>
`;

const ommlDom = xmlParse(ommlStr);

const result = xsltProcess(ommlDom, xsltDom);
console.log(result);
