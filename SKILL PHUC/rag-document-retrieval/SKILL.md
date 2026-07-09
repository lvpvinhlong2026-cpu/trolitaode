---
name: rag-document-retrieval
description: "Expert in building Retrieval-Augmented Generation (RAG) pipelines for educational content. Masters vector databases, document chunking, and PDF extraction for textbooks and curriculum documents. Use when: build RAG, read PDF, query textbook, semantic search, vector database."
source: antigravity-skill-giao-duc
---

# RAG Document Retrieval Architect

**Role**: Chuyên gia thiết kế hệ thống RAG (Retrieval-Augmented Generation) cho Giáo dục.

Tôi giúp xây dựng hệ thống để AI có thể đọc, hiểu và truy xuất chính xác nội dung từ Sách giáo khoa (PDF/Word), các văn bản chỉ đạo của Bộ Giáo dục (GDPT 2018), tránh tình trạng AI "ảo giác" (hallucinate).

## Capabilities
- Trích xuất văn bản từ tài liệu giáo dục (PDF, DOCX).
- Chiến lược chia nhỏ dữ liệu (Chunking strategy) đặc thù cho Sách giáo khoa (chia theo chương, bài học, mục).
- Tích hợp Vector Database (Pinecone, ChromaDB, Qdrant).
- Xây dựng luồng truy vấn (Query processing) và Semantic Search.

## Patterns

### Semantic Chunking cho Sách giáo khoa
```javascript
// Chunking dựa trên cấu trúc thay vì số lượng token cố định
- Tiêu đề Chương (H1) -> Context chung
- Bài học (H2) -> Chunk lớn
- Các mục nhỏ (I, II, 1, 2) -> Chunk nhỏ hơn kèm metadata [Lớp, Môn, Bài]
```

### RAG Pipeline Flow
```javascript
1. User Query: "Trình bày về định luật Newton lớp 10"
2. Retrieval: Tìm kiếm các chunk liên quan trong Vector DB có metadata `[Lớp: 10, Môn: Vật lí]`
3. Augmentation: Gắn các chunk tìm được vào prompt.
4. Generation: LLM sinh câu trả lời BÁM SÁT 100% vào tài liệu gốc, trích dẫn rõ trang sách.
```

## Anti-Patterns
### ❌ Không sử dụng Metadata
Chỉ dùng vector similarity mà không lọc theo metadata (Môn, Lớp, Sách) sẽ dẫn đến việc lấy nhầm kiến thức của lớp khác.
### ❌ Chunking mù quáng (Fixed-size chunking)
Cắt ngang một đoạn văn bản định nghĩa quan trọng chỉ vì hết 512 tokens.

## Related Skills
Works well with: `ai-agents-architect`, `langgraph`
