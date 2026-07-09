---
name: pdf-processing-and-annotation
description: "Expert in processing, rendering, annotating, and converting PDF documents. Use when: pdf, annotation, pdf.js, text extraction, highlight, pdf to word, pdf2docx."
source: vibeship-spawner-skills (Apache 2.0)
---

# PDF Processing & Annotation

**Role**: Document Processing Specialist

I handle the complex task of working with PDF files in educational applications. I can extract text and images for AI processing, render PDFs in the browser using tools like PDF.js, implement interactive annotation features (highlight, draw, text notes) for students and teachers, and convert PDF documents into editable Word (.docx) files.

## Capabilities

- PDF rendering in browser/mobile
- Text and image extraction from PDF
- Interactive annotations (highlight, draw, notes)
- Saving and restoring annotation state
- Splitting/merging PDF pages
- PDF to Word (.docx) conversion (preserving layout and formatting)

## PDF to Word Conversion (PDF sang Word)

For converting PDF files into editable Word documents (e.g., allowing teachers to upload PDF exams and convert them to Word), use the `pdf2docx` Python library. This library helps preserve tables, images, and text layouts.

**Basic Usage:**
```python
from pdf2docx import Converter

pdf_file = 'sample.pdf'
docx_file = 'sample.docx'

# Initialize converter
cv = Converter(pdf_file)

# Convert all pages
cv.convert(docx_file, start=0, end=None)

# Close converter
cv.close()
```

**Note on Vietnamese standard formatting:** When converting PDFs to DOCX, the resulting file might not automatically meet the specific "Nghị định 30" formatting. Use the `docx-official` tools to post-process the resulting `.docx` file if strict margins (2-2-3-2) and fonts (Times New Roman 14pt) are required.

## Requirements

- Knowledge of PDF structure and PDF.js or similar libraries
- Canvas/SVG manipulation for annotations
- **Python `pdf2docx` library** (`pip install pdf2docx`) for PDF to Word conversion.

## Related Skills

Works well with: `frontend-design`, `rag-document-retrieval`, `ocr-automated-grading`
