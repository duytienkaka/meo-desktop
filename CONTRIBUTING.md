# Làm việc cùng nhau

Đọc [hướng dẫn Git cho người mới](docs/GIT-CHO-NGUOI-MOI.md) trước phiên làm việc đầu tiên. Chủ repo xem [thiết lập GitHub](docs/THIET-LAP-GITHUB.md).

## Quy trình thống nhất cho hai người

1. Một việc = một Issue, một người phụ trách, một nhánh và một Pull Request (PR).
2. `main` là bản dùng chung đã được kiểm tra. Sau lần đưa dự án lên đầu tiên, không code/commit/push trực tiếp vào `main`.
3. Trước khi code, ghi các file dự định sửa vào Issue. Nếu trùng file với việc đang làm, thống nhất thứ tự trước; đợi PR đầu merge rồi tạo nhánh từ `main` mới.
4. Tên nhánh: `feat/ten-tinh-nang`, `fix/ten-loi`, `docs/ten-tai-lieu` hoặc `chore/ten-viec`. Mỗi người dùng nhánh riêng, không cùng push một nhánh.
5. PR nhỏ, tập trung một mục tiêu. Không format lại toàn bộ file, đổi tên hàng loạt hoặc nâng dependency cùng với sửa tính năng.
6. Trước PR và sau khi cập nhật `main`: `npm run check` và `npm test`. Sửa giao diện phải chạy app và chụp ảnh; sửa helper C# phải build helper và kiểm tra Windows thật.
7. Người còn lại review. Chỉ merge khi đủ một approval, CI đạt, đã giải quyết bình luận và nhánh chứa `main` mới nhất. Sửa code sau review thì nhờ review lại.
8. Dùng **Squash and merge** trên GitHub. Xóa nhánh remote sau merge. Phiên làm việc sau bắt đầu từ `main` mới và nhánh mới.
9. Không `push --force`, `reset --hard`, bỏ qua hook hoặc tự chọn toàn bộ “ours/theirs” để hết conflict. Khi push bị từ chối, fetch/merge và kiểm tra; không ghi đè người khác.
10. Không đưa cache, `node_modules`, cấu hình cá nhân, dữ liệu app hay kết quả test vào Git. Khi thêm dependency, commit cả `package.json` và `package-lock.json`; không sửa lockfile bằng tay.

## Chia khu vực để giảm conflict

Đây là phân công khởi điểm, có thể đổi bằng thỏa thuận trong Issue; không phải khóa quyền sửa file.

| Khu vực | Người phụ trách mặc định | Ghi chú |
| --- | --- | --- |
| `src/settings.html`, `.css`, `.js`; `src/player.html`, `.css`, `.js` | Partner | Giao diện cài đặt và nhạc |
| `src/main.cjs`, `src/*-preload.cjs`, `src/preload.cjs` | Chủ repo | Điểm ghép chung, cửa sổ và IPC; tránh hai PR cùng sửa |
| `src/media.cjs`, `game.cjs`, `library.cjs`, `src/native/` | Chủ repo | Tích hợp Windows, game, nhạc |
| `src/pet.js`, `play.cjs`, `route.cjs`, `sprites.js`, `assets/` | Người nhận Issue | Mỗi thời điểm một người sửa nhóm này |
| `package.json`, `package-lock.json`, `scripts/`, `.github/` | Chủ repo | Gộp thay đổi dependency/build vào PR riêng |
| Test của tính năng | Người sửa tính năng | Viết test cạnh phần đang sửa; không tự xóa test lỗi |

Ví dụ: partner làm đẹp `player.css`, chủ repo làm nhận diện game. Nếu giao diện cần IPC mới, thống nhất tên kênh và dữ liệu trong Issue; chủ repo làm phần preload/main ở PR nhỏ trước, merge xong partner cập nhật nhánh rồi dùng API mới.

## Điều kiện được merge

- PR ghi rõ kết quả trước/sau, file chung đã sửa và cách kiểm tra.
- Không còn conflict; CI `unit-tests` đạt; một người khác đã approve.
- UI được kiểm tra ở cửa sổ bình thường và thu nhỏ. Native được thử trên Windows nếu có thay đổi.
- Helper `.exe` trong `src/native/` hiện được theo dõi để app chạy ngay. Người sửa C# build lại đúng helper, commit cả `.cs` và `.exe`; không cố merge hai bản binary. Nếu trùng, merge `.cs` trước rồi build lại.
- CI hiện kiểm tra cú pháp, dấu conflict và unit test; không thay thế việc mở app hoặc kiểm tra media/game trên desktop thật.

## Khi có conflict

Giữ nguyên nhánh tính năng. Chạy `git fetch origin`, rồi `git merge origin/main`. Sửa từng vùng conflict, giữ hành vi của cả hai thay đổi nếu cần, chạy lại kiểm tra, commit và push nhánh đó. Xem ví dụ đầy đủ và cách hủy merge an toàn trong [hướng dẫn](docs/GIT-CHO-NGUOI-MOI.md#7-xử-lý-conflict).

Không có quy tắc nào bảo đảm không xảy ra conflict. Phân chia file, PR nhỏ và tích hợp thường xuyên giúp giảm tần suất và độ khó của chúng.
