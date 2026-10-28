# Làm việc và push code lên GitHub

Repo: **https://github.com/duytienkaka/meo-desktop**.

## 1. Tải code lần đầu

Cài Git và Node.js 24. Đặt danh tính commit của chính bạn, sau đó clone:

```powershell
git config --global user.name "Ten cua ban"
git config --global user.email "email-cua-ban-tren-github"
git clone https://github.com/duytienkaka/meo-desktop.git
cd meo-desktop
npm ci
git config core.hooksPath .githooks
npm start
```

Repo riêng tư cần được mời trước. Đăng nhập qua trình duyệt khi Git yêu cầu; không chia sẻ token. Chỉ clone một lần, không tải ZIP rồi chép đè code đang làm.

## 2. Bắt đầu một việc

Thống nhất ai làm gì và các file cần sửa. Khi `git status` báo sạch:

```powershell
git switch main
git pull --ff-only origin main
git switch -c feat/ten-tinh-nang
```

Tên nhánh không dấu, ví dụ `feat/music-layout`, `fix/cat-position`, `chore/tidy-source`. Mỗi người dùng nhánh riêng. Nếu lỡ sửa trên main nhưng chưa commit, `git switch -c fix/ten-viec` sẽ đưa thay đổi sang nhánh mới.

## 3. Kiểm tra, commit và push

```powershell
npm run check
npm test
git status
git diff
```

Đọc diff để chắc không có thay đổi ngoài việc của mình. Ví dụ sửa giao diện nhạc:

```powershell
git add src/player.html src/player.css src/player.js
git diff --cached
git commit -m "feat: improve music player layout"
git push -u origin feat/music-layout
```

Tên trong lệnh push phải đúng nhánh hiện tại; xem bằng `git branch --show-current`. Những lần sau trên nhánh đó chỉ cần `git push`.

Khi dọn nhiều file, có thể dùng `git add -A` sau khi kiểm tra `git status` và chắc tất cả thay đổi đều thuộc việc này. Không add dữ liệu cá nhân, cache hay file của người khác.

## 4. Tạo PR và merge

1. Mở GitHub → **Compare & pull request** hoặc **Pull requests → New pull request**.
2. Chọn **base: main**, **compare: nhánh của bạn**. Viết đã sửa gì, cách test và thêm ảnh nếu sửa UI.
3. Người còn lại xem **Files changed**, góp ý hoặc **Approve**. Không tự approve PR của mình.
4. Nếu main đã đổi, commit xong việc đang làm rồi đồng bộ trên nhánh tính năng:

```powershell
git fetch origin
git merge origin/main
npm run check
npm test
git push
```

5. Khi không còn conflict, CI xanh và người còn lại đồng ý, dùng **Squash and merge**, rồi xóa nhánh remote.
6. Về main để bắt đầu việc tiếp theo:

```powershell
git switch main
git pull --ff-only origin main
git fetch --prune
```

Tạo nhánh mới cho việc mới, không dùng tiếp nhánh đã squash. Có thể giữ nhánh cũ trên máy, không cần ép xóa bằng `-D`.

## 5. Conflict và lỗi push

- Chạy `git status`, mở từng file conflict. Hiểu thay đổi của cả hai bên, sửa thành nội dung cuối rồi xóa các dấu conflict. Không chọn hết Current/Incoming cho nhanh.
- `git add` file đã giải quyết, chạy lại kiểm tra, `git commit` và `git push` nhánh tính năng.
- Helper `.exe` bị conflict: merge C# trước rồi build lại. Lockfile bị conflict: thống nhất dependency và dùng npm tạo lại, không sửa thủ công theo cảm tính.
- Hủy lần merge đang conflict: `git merge --abort`. Nên bắt đầu merge khi working tree sạch.
- Push bị từ chối vì remote có commit mới: không force; fetch rồi merge `origin/ten-nhanh`, test và push lại. Nếu không rõ vì sao có code mới, hỏi người kia.
- Nếu `git pull --ff-only` từ chối trên main, dừng và kiểm tra lịch sử; không dùng `reset --hard`.

## 6. Quy tắc ngắn

- Một việc/một nhánh/một PR; PR nhỏ, không format lại cả dự án.
- Không commit/push trực tiếp main, không force push; người còn lại review trước merge.
- Tránh cùng sửa `main.cjs`, preload hoặc dependency khi chưa thống nhất.
- Thêm dependency thì commit cả `package.json` và `package-lock.json`; bình thường dùng `npm ci`.
- Sửa C# thì build helper, sửa UI thì mở app kiểm tra ngoài unit test.
- Hook trong `.githooks/` chỉ chặn nhầm trên máy sau khi cài. CI kiểm tra code, không tự merge.
- Bảo vệ main trên GitHub phải bật riêng trong Settings và có thể phụ thuộc gói: yêu cầu PR, 1 approval, CI `unit-tests`, nhánh cập nhật, chặn force push. File trong repo không tự bật các cài đặt máy chủ.
