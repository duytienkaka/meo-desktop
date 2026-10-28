# Mèo Desktop — bắt đầu ở đây

Đây là thư mục mã nguồn làm việc chung của nhóm. Không chép đè nó bằng bản từ thư mục app đang chạy.

## Tài liệu dành cho hai người

- **Partner mới dùng Git:** đọc [Git cho người mới](docs/GIT-CHO-NGUOI-MOI.md), có lệnh clone, tạo nhánh, commit, push, mở PR, review, squash merge và xử lý conflict.
- **Cả hai:** đọc [quy tắc và chia khu vực code](CONTRIBUTING.md).
- **Chủ repo:** làm theo [thiết lập GitHub và bảo vệ main](docs/THIET-LAP-GITHUB.md).
- **Trợ lý viết code:** đọc [AGENTS.md](AGENTS.md).

## Chạy app

Cài Node.js 24 và Git. Sau khi clone, mở terminal trong repo:

```powershell
npm ci
git config core.hooksPath .githooks
npm run check
npm test
npm start
```

Hai helper Windows được kèm trong `src/native/`. Sau khi sửa C#, build lại helper tương ứng:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-media.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-game.ps1
```

`npm run package:win` tạo bản Windows trong thư mục `outputs` bên cạnh repo. Không đưa cache/bản đóng gói/dữ liệu riêng lên Git. Xem [README.md](README.md) để biết kiến trúc, các bài kiểm tra native/UI và giới hạn hỗ trợ macOS/fullscreen.

## Quy trình mỗi ngày

**Cập nhật main → tạo nhánh riêng → làm một việc → kiểm tra → commit → push nhánh → PR → người còn lại review → Squash and merge.**

Không tự push vào `main`, không force push và không sửa cùng file với người kia khi chưa thống nhất phạm vi. Bộ rule giảm conflict; không thể ngăn mọi conflict. Hook chỉ bảo vệ cục bộ, rule GitHub phải bật riêng sau khi có repo và quyền phù hợp.
