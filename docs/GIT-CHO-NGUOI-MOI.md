# Git cho người mới — từ tải code đến merge

## 1. Hiểu sáu từ cần dùng

| Từ | Nghĩa trong dự án này |
| --- | --- |
| Repository / repo | Thư mục dự án và lịch sử thay đổi |
| Clone | Tải repo về máy lần đầu |
| Branch / nhánh | Khu vực làm một việc riêng, không ảnh hưởng `main` |
| Commit | Lưu một nhóm thay đổi vào lịch sử trên máy |
| Push | Đưa commit của nhánh lên GitHub |
| Pull Request / PR | Đề nghị đưa nhánh của mình vào `main` để người còn lại review |

Commit chưa phải push. Push nhánh chưa phải merge vào `main`.

## 2. Chuẩn bị một lần

Cài Git, Node.js 24 và trình soạn thảo như VS Code. Có tài khoản GitHub và nhận lời mời vào repo. Đăng nhập bằng trình duyệt khi Git yêu cầu; không đưa mật khẩu hoặc token vào code, lệnh mẫu hay tin nhắn.

Mở PowerShell và đặt danh tính commit của chính bạn:

```powershell
git config --global user.name "Ten cua ban"
git config --global user.email "email-ban-dung-tren-github"
git --version
node --version
npm --version
```

Có thể dùng địa chỉ `noreply` do GitHub cung cấp trong Settings → Emails nếu không muốn công khai email cá nhân. Đừng sao chép email của người khác.

Trên trang repo, bấm **Code → HTTPS**, sao chép URL. Thay URL mẫu sau bằng URL thật:

```powershell
git clone https://github.com/OWNER/REPO.git
cd REPO
npm ci
git config core.hooksPath .githooks
npm run check
npm test
npm start
```

`cd REPO` phải dùng tên thư mục Git vừa tải về. Chỉ clone một lần. Những lần sau mở đúng thư mục đó, không tải ZIP rồi chép đè code.

Hook là chốt chặn trên máy để tránh lỡ push vào `main`; mỗi người phải cài bằng lệnh trên. Nó không thay thế bảo vệ nhánh trên GitHub.

## 3. Bắt đầu một việc mới

Tạo/nhận một Issue, ghi mục tiêu và danh sách file định sửa. Báo người kia nếu có file đang được họ sửa.

Mở terminal trong thư mục repo:

```powershell
git status
git switch main
git pull --ff-only origin main
git switch -c feat/music-hover
```

Chỉ chuyển nhánh khi `git status` báo sạch. `feat/music-hover` là ví dụ; thay bằng tên ngắn không dấu mô tả việc bạn làm. Đừng dùng lại nhánh đã squash/merge.

## 4. Lưu và đưa code của mình lên

Sửa file, chạy app rồi kiểm tra:

```powershell
npm run check
npm test
git status
git diff
```

Đọc diff để chắc chỉ có file của việc này. Ví dụ khi sửa giao diện nhạc:

```powershell
git add src/player.html src/player.css src/player.js
git diff --cached
git commit -m "feat: improve music player layout"
git push -u origin feat/music-hover
```

Tên trong lệnh push phải đúng nhánh bạn đang dùng; xem bằng `git branch --show-current`. Các lần push sau trên chính nhánh đó chỉ cần `git push`.

Nếu sau đó sửa thêm theo review, chạy lại kiểm tra, `git add` các file liên quan, commit mới và push. PR cũ tự cập nhật, không cần mở PR thứ hai.

## 5. Tạo PR và nhờ review

1. Mở repo trên GitHub → **Pull requests → New pull request**.
2. Chọn **base: main**, **compare: nhánh của bạn**. Xem Files changed để tránh chọn nhầm nhánh.
3. Điền mẫu mô tả. Gắn Issue, nói rõ cách test, thêm ảnh/video nếu sửa UI. Chọn người còn lại làm reviewer.
4. Nếu chưa xong, dùng **Create draft pull request**. Khi xong chuyển sang **Ready for review**.
5. Đợi CI xanh và review. Nút xanh tự nó không có nghĩa là mọi chức năng đã được kiểm tra.
6. Người review mở **Files changed**, đọc diff, hỏi/suggest thay đổi, rồi **Review changes → Approve** nếu đạt.

Người viết PR không tự review/approve PR của mình. Có yêu cầu sửa thì sửa và push tiếp vào nhánh hiện tại.

## 6. Cập nhật nhánh và merge

Nếu `main` có code mới trong lúc bạn làm, hãy lưu/commit xong việc của mình rồi:

```powershell
git status
git fetch origin
git merge origin/main
npm run check
npm test
git push
```

Chạy các lệnh trong nhánh tính năng. Nếu merge hiện conflict, dừng ở bước đó và làm mục 7, không chạy tiếp máy móc.

Khi PR đủ approval, CI đạt và không còn yêu cầu sửa, dùng **Squash and merge → Confirm squash and merge** trên GitHub. Xem lại tiêu đề commit và bấm **Delete branch** sau khi merge.

Trên máy:

```powershell
git switch main
git pull --ff-only origin main
git fetch --prune
```

Giữ nhánh cũ trên máy cũng được. Vì squash tạo commit mới, `git branch -d` có thể từ chối xóa dù PR đã merge; người mới cứ giữ nhánh, không dùng `-D` cho hết báo lỗi. Việc tiếp theo tạo một nhánh mới từ `main` vừa cập nhật.

## 7. Xử lý conflict

Conflict nghĩa là Git không biết tự ghép hai thay đổi. File có thể hiện:

```text
  <<<<<<< HEAD
phần trong nhánh bạn đang làm
  =======
phần từ main vừa lấy về
  >>>>>>> origin/main
```

1. Chạy `git status` để xem file nào đang conflict.
2. Mở file bằng VS Code/Merge Editor. Đọc cả hai phần; trao đổi với người sửa phần kia nếu chưa hiểu.
3. Sửa thành nội dung cuối cùng cần giữ. Không chọn hết “Current”, “Incoming” hay “Both” cho nhanh; ba lựa chọn này đều có thể làm mất hoặc lặp logic.
4. Xóa các dấu `<<<<<<<`, `=======`, `>>>>>>>`. Với binary `.exe`, merge C# trước rồi chạy script build để tạo lại file đúng.
5. Đánh dấu file đã giải quyết, kiểm tra và hoàn tất merge:

```powershell
git add src/player.js
npm run check
npm test
git diff --cached
git commit -m "merge: sync main and resolve player conflict"
git push
```

Thay `src/player.js` bằng các file thực sự đã giải quyết. Nếu test chưa đạt thì sửa tiếp; không commit một bản đang hỏng.

Nếu chưa biết giải quyết và muốn trở lại trước lần merge đang dang dở:

```powershell
git merge --abort
```

Lệnh này dành cho merge đang conflict. Bắt đầu merge với working tree sạch giúp việc hủy an toàn. Commit cũ của nhánh vẫn còn. Không dùng `reset --hard` để xử lý conflict.

Nếu `package-lock.json` conflict, thống nhất dependency cuối trong `package.json`, chọn một bản lock làm nền rồi để người phụ trách dependency chạy `npm install` tạo lại. Không tự xóa các dấu conflict trong lockfile rồi giả định dependency vẫn đúng.

## 8. Những tình huống hay gặp

| Tình huống | Cách xử lý |
| --- | --- |
| `git push` bị từ chối vì remote có commit mới | Không force. Commit việc đang làm, `git fetch origin`, rồi merge `origin/ten-nhanh-cua-ban`, kiểm tra và push lại. Nếu không hiểu vì sao người khác push vào nhánh mình, hỏi trước. |
| `git pull --ff-only` từ chối trên `main` | Có thể bạn lỡ commit trên `main`. Dừng và nhờ chủ repo xem; không reset hoặc force. |
| Lỡ sửa trên `main` nhưng chưa commit | `git switch -c fix/ten-viec` để đưa thay đổi hiện tại sang nhánh mới; sau đó commit và tạo PR như thường. |
| Lệnh báo không phải Git repository | Bạn đang ở sai thư mục. Mở terminal tại thư mục đã clone. |
| Git mở trình soạn thảo khi merge | Có thể dùng `git merge --no-edit origin/main` khi không muốn sửa thông điệp merge mặc định. |
| Git yêu cầu đăng nhập | Làm qua trình duyệt/credential manager của Git. Không gửi token cho người khác. |
| Nhánh có thay đổi chưa xong, muốn nghỉ | Commit WIP và push nhánh riêng hoặc mở draft PR; chưa merge. Đừng chuyển nhánh/chép đè file khi chưa biết code của mình đã được lưu ở đâu. |
| CI đỏ nhưng trên máy chạy được | Mở Actions → job lỗi → đọc log. Xem có thiếu lockfile, file chưa add, đường dẫn khác hoa/thường hoặc dependency chưa khai báo không. |

## 9. Nếu dùng GitHub Desktop

Vẫn theo cùng quy tắc. Clone repo, chọn `main` → **Fetch origin / Pull origin** → **New branch**. Sau khi sửa, xem Changed files → nhập Summary → **Commit to nhánh** → **Publish branch / Push origin** → **Create Pull Request**. Khi cần đồng bộ, chọn **Branch → Merge into current branch** và ghép `main` đã cập nhật vào nhánh tính năng. Merge PR bằng **Squash and merge** trên trang GitHub sau review.

Đọc thêm: [GitHub — merge conflict](https://docs.github.com/en/pull-requests/reference/merge-conflicts), [GitHub — cách merge PR](https://docs.github.com/en/pull-requests/reference/pull-request-merges).
