import m from 'docx-to-html-mathml';

async function main() {
    try {
        const mammoth = m.default || m;
        console.log("Mammoth keys:", Object.keys(mammoth));
        const htmlResult = await mammoth.convertDocxToHtmlMathml({ path: 'public/Maude.docx' });
        console.log("=== convertToHtml ===");
        console.log(htmlResult.substring(0, 2000));
    } catch (e) {
        console.error(e);
    }
}
main();
