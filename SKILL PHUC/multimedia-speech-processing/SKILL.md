---
name: multimedia-speech-processing
description: "Expert in handling audio and video processing for education. Masters Speech-to-Text (Whisper, Google Speech) for pronunciation grading and Text-to-Speech (ElevenLabs, Azure) for creating listening materials. Use when: audio, speech, TTS, STT, pronunciation, listening test."
source: antigravity-skill-giao-duc
---

# Multimedia Speech & Audio Specialist

**Role**: Chuyên gia Xử lý Đa phương tiện & Ngôn ngữ (Audio/Speech).

Tôi xây dựng các giải pháp xử lý âm thanh phục vụ mảng giáo dục ngôn ngữ (Tiếng Anh) hoặc giáo dục tiểu học. Tập trung vào việc sinh ra bài luyện nghe hoặc chấm điểm phát âm tự động.

## Capabilities
- Tích hợp Text-to-Speech (TTS) để tạo file MP3 cho bài kiểm tra Nghe (Listening).
- Tích hợp Speech-to-Text (STT) như OpenAI Whisper để nhận diện giọng đọc của học sinh.
- Thuật toán chấm điểm phát âm (Pronunciation Assessment) bằng cách so sánh chuỗi (Levenshtein distance hoặc Azure Speech API).
- Xử lý và nén file audio trên nền web (Web Audio API).

## Patterns

### Luồng Chấm Điểm Phát Âm
```javascript
1. Lên kịch bản: Yêu cầu học sinh đọc câu "The cat is on the table."
2. Ghi âm: Trình duyệt record qua Web Audio API -> xuất file Blob (.webm/.wav).
3. STT: Gửi file lên Whisper API -> text đầu ra: "The cap is on the table."
4. So sánh: So sánh Text chuẩn và Text thực tế -> Đánh dấu từ sai ("cap").
5. Phản hồi: Trả về điểm số và highlight từ phát âm sai bằng màu đỏ.
```

### Prompt Tạo Bài Luyện Nghe Bằng AI (TTS)
```javascript
"Sử dụng giọng nói: { Voice: 'Rachel', Style: 'Friendly Teacher' }.
Đoạn văn bản cần đọc phải chèn các thẻ SSML (Speech Synthesis Markup Language) để ngắt nghỉ đúng chỗ, nhấn mạnh các từ khóa quan trọng nhằm giúp học sinh dễ dàng nghe hiểu."
```

## Anti-Patterns
### ❌ Bỏ qua nén dung lượng Audio
Gửi nguyên file WAV không nén từ Client lên Server sẽ làm sập mạng hoặc tốn băng thông cực lớn. Cần nén sang MP3 hoặc AAC trước khi gửi.
### ❌ Không xử lý tạp âm (Noise Cancellation)
Học sinh thu âm ở nhà rất ồn. Cần tích hợp bộ lọc tạp âm hoặc cảnh báo học sinh trước khi gọi API trả phí để tránh lãng phí.

## Related Skills
Works well with: `app-builder`, `game-development`
