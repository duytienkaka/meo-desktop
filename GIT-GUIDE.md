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


## Phát hành và tự cập nhật từ 0.8.0

App đã cài không cập nhật theo từng commit. Cần phát hành phiên bản mới qua GitHub Releases.

1. Trên nhánh tính năng sạch, tăng phiên bản (ví dụ từ 0.8.0 lên 0.8.1):

```sh
npm version patch --no-git-tag-version
```

2. Cập nhật README nếu cần, chạy kiểm tra, commit `package.json`, `package-lock.json` cùng các thay đổi và tạo PR vào **main**. Chờ CI qua và merge PR.
3. Lấy main mới nhất, kiểm tra version rồi tạo tag khớp chính xác:

```sh
git switch main
git pull --ff-only origin main
node -p "require('./package.json').version"
git tag v0.8.1
git push origin v0.8.1
```

4. Xem **Actions → Build and publish release**. Workflow build Windows x64, Mac Apple Silicon/Intel; chỉ công bố Release sau khi các build/test và kiểm tra checksum đều qua. Người dùng từ 0.8.0 sẽ nhận thông báo sau lần kiểm tra tiếp theo, hoặc tự bấm Kiểm tra cập nhật.

Windows Release cần bộ cài `.exe`, `.exe.sha256`, `.exe.blockmap` và **latest.yml**. Mac cần hai DMG và hai SHA-256. Workflow đăng đủ các file này; không sửa/xóa metadata hoặc thay bộ cài của phiên bản đã công bố. Có lỗi ở bản đã phát hành thì tăng version và tạo tag mới. Dùng số version `X.Y.Z`; Release hiện đánh dấu preview.

Nếu workflow thất bại, xem log trước. Có thể Re-run jobs khi bản đó chưa được công bố; script chỉ thay file khác checksum trong Release nháp. Không tạo tag mới trỏ vào source khác với cùng một số version. Không commit hoặc chia sẻ token: workflow dùng GITHUB_TOKEN với quyền ghi Release.
