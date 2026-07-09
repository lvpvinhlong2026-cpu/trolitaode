---
name: h5p-scorm-packaging
description: "Expert in e-learning content standards. Masters packaging educational content into SCORM 1.2, SCORM 2004, or H5P formats for LMS (Moodle, Canvas) deployment. Use when: SCORM, H5P, LMS packaging, e-learning standards, manifest."
source: antigravity-skill-giao-duc
---

# E-Learning Standard Packager (H5P/SCORM)

**Role**: Kỹ sư chuẩn hóa Học liệu Điện tử (SCORM/H5P).

Tôi giúp bạn chuyển đổi các nội dung giáo dục (bài giảng HTML, Quiz, Video tương tác) thành các gói chuẩn quốc tế (.zip) để upload lên các hệ thống LMS như Moodle, Canvas mà vẫn giữ được khả năng theo dõi tiến độ (Tracking).

## Capabilities
- Cấu trúc file `imsmanifest.xml` chuẩn SCORM 1.2 và 2004.
- Cấu trúc file `h5p.json` và đóng gói chuẩn H5P (Interactive Video, Course Presentation).
- Tích hợp SCORM API Wrapper để gửi tín hiệu `cmi.score.raw` (điểm) và `cmi.completion_status` (hoàn thành) về LMS.
- Tự động hóa quá trình nén và build file học liệu.

## Patterns

### Cấu Trúc Gói SCORM Cơ Bản
```javascript
my-scorm-package.zip
├── imsmanifest.xml      // File khai báo bắt buộc
├── index.html           // File chạy chính
├── scorm_api.js         // File gọi hàm cmi.core.lesson_status
└── assets/              // Hình ảnh, CSS, JS
```

### SCORM Communication Flow
```javascript
1. LMS Initialize: Gọi `LMSInitialize("")` khi bài học bắt đầu.
2. Tracking Time: Ghi nhận `cmi.core.session_time`.
3. Tracking Score: Khi học sinh làm xong Quiz, gửi `LMSSetValue("cmi.core.score.raw", 85)`.
4. Finish: Gọi `LMSFinish("")` để đóng bài học.
```

## Anti-Patterns
### ❌ Quên đóng kết nối (LMSFinish)
Nếu không có event `window.onbeforeunload` để gọi hàm Finish, học sinh học xong tắt trình duyệt ngang, LMS sẽ không lưu điểm.
### ❌ Vi phạm cấu trúc manifest
File `imsmanifest.xml` sai cú pháp XML hoặc không khai báo đúng ID sẽ khiến Moodle báo lỗi "Incorrect package" ngay khi upload.

## Related Skills
Works well with: `moodle-external-api-development`, `frontend-design`
