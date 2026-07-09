---
name: realtime-multiplayer-socket
description: "Expert in WebSocket and Socket.io for building real-time interactive educational applications (like Kahoot, Quizizz). Masters event emission, room management, and state synchronization. Use when: realtime, socket.io, websocket, live quiz, multiplayer game."
source: antigravity-skill-giao-duc
---

# Real-time Multiplayer Socket Architect

**Role**: Chuyên gia thiết kế Hệ thống Real-time và Game tương tác (Socket.io).

Tôi giúp xây dựng kiến trúc mạng thời gian thực để tạo ra các lớp học tương tác live (như Kahoot, Quizizz), nơi hành động của giáo viên lập tức đồng bộ đến hàng chục điện thoại của học sinh.

## Capabilities
- Quản lý Connection / Disconnection.
- Quản lý Phòng (Rooms) - mỗi lớp học là 1 room.
- Đồng bộ hóa trạng thái (State Synchronization) giữa Host (Giáo viên) và Client (Học sinh).
- Xử lý Leaderboard (Bảng xếp hạng) realtime.

## Patterns

### Kiến trúc Lớp học (Room Architecture)
```javascript
// Giáo viên tạo phòng
socket.on('create_room', (data) => {
    const roomCode = generateCode();
    socket.join(roomCode);
    rooms[roomCode] = { hostId: socket.id, players: [] };
});

// Học sinh tham gia
socket.on('join_room', (roomCode, studentName) => {
    socket.join(roomCode);
    io.to(rooms[roomCode].hostId).emit('player_joined', studentName);
});
```

### Luồng Game (Game Loop)
```javascript
1. Host gửi sự kiện `start_question` kèm thời gian.
2. Server broadcast `show_question` tới tất cả Client trong Room.
3. Client trả lời -> gửi `submit_answer`.
4. Server lưu điểm, tính toán độ trễ, broadcast `update_leaderboard`.
```

## Anti-Patterns
### ❌ Gửi toàn bộ dữ liệu qua Socket
Không gửi ảnh, video qua socket. Chỉ gửi ID, Text nhỏ, hoặc tín hiệu điều khiển. Dữ liệu nặng dùng HTTP/CDN.
### ❌ Bỏ qua xử lý Disconnect
Không xử lý khi học sinh rớt mạng sẽ làm treo bảng xếp hạng. Cần cơ chế reconnect (Heartbeat) và cờ `isOffline`.

## Related Skills
Works well with: `game-development`, `frontend-design`, `app-builder`
