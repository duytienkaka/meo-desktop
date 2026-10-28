# Thiết lập GitHub cho chủ repo

## 1. Đưa bản đầu lên

Tạo một repository GitHub trống. Không tạo README, license hay `.gitignore` trên web vì thư mục này đã có nội dung. Chọn visibility theo thỏa thuận của hai người. Chưa có file LICENSE thì chưa tự cấp phép mã nguồn theo một giấy phép mở nào.

Trong thư mục này, nếu chưa có Git:

```powershell
git init -b main
git add .
git commit -m "chore: initialize Meo Desktop collaboration workflow"
```

Nếu trợ lý đã khởi tạo và commit rồi thì bỏ qua ba lệnh trên; dùng `git status` và `git log -1` để xem. Thay URL mẫu bằng repo thật:

```powershell
git remote add origin https://github.com/OWNER/REPO.git
git push -u origin main
git config core.hooksPath .githooks
```

Đây là lần bootstrap duy nhất push trực tiếp vào `main`. Nếu repo đích đã có lịch sử, không force và không dùng `--allow-unrelated-histories` máy móc; kiểm tra trước để thống nhất cách nhập code.

## 2. Mời partner

Repo → **Settings → Collaborators / Manage access → Add people** → mời đúng GitHub username. Chọn quyền Write nếu giao diện có cấp quyền. Partner nhận lời mời rồi clone; gửi họ `START-HERE.md` và `docs/GIT-CHO-NGUOI-MOI.md`. Không chia sẻ một tài khoản hoặc một thư mục làm việc giữa hai máy.

## 3. Cấu hình merge

Settings → General → Pull Requests:

- Bật **Allow squash merging**.
- Tắt **Allow merge commits** và **Allow rebase merging** để cả đội dùng một cách merge.
- Bật tự động xóa nhánh sau merge.

Không dùng nhánh tính năng dài hạn sau squash; tạo nhánh mới từ `main` cho việc mới.

## 4. Bảo vệ main

Sau lần push đầu, đợi workflow **CI** chạy. Trong Settings → Rules → Rulesets hoặc Branches → Branch protection, tạo rule cho `main`:

- Yêu cầu Pull Request trước khi merge.
- Ít nhất **1 approval** từ người khác.
- Bỏ approval cũ khi có commit sửa code mới; yêu cầu giải quyết các cuộc thảo luận trước merge.
- Yêu cầu status check **unit-tests**. Chỉ chọn sau khi check này đã xuất hiện từ một lần chạy CI.
- Yêu cầu nhánh cập nhật với `main` trước merge.
- Chặn force push và xóa `main`. Nếu giao diện cho phép, áp dụng cả cho quản trị viên, hạn chế bypass.

Các file trong repo không tự bật những cài đặt trên máy chủ. `.githooks/pre-push` chỉ là chốt chặn cục bộ, không cài tự động sau clone và có thể bị bỏ qua; nó không phải quyền bảo vệ trên server.

**Giới hạn gói:** GitHub có hỗ trợ bảo vệ nhánh trên repo công khai ở gói Free; repo riêng tư cần gói phù hợp như Pro/Team. Nếu tài khoản hiện tại không cho bật, giữ repo riêng tư theo nhu cầu của nhóm, dùng PR + review + CI như quy ước và hook cục bộ; không tuyên bố đã chặn được push ở server. Cân nhắc nâng gói nếu muốn cưỡng chế. Xem [tài liệu chính thức](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches).

## 5. Phân công và review

Chốt tên hai người phụ trách các vùng trong `CONTRIBUTING.md`. Tạo Issue trước mỗi việc; người nhận ghi tên nhánh và file cần sửa. File cầu nối `main.cjs`/preload và dependency do một người phụ trách tại một thời điểm. Khi hai việc cần cùng file, chia PR nền trước, merge rồi mới tiếp tục PR phụ thuộc.

Chưa đặt CODEOWNERS vì chưa chốt GitHub username của cả hai. Khi bổ sung, dùng tài khoản thực sự có quyền Write và không nhầm rằng CODEOWNERS tự khóa file. Đội hai người chỉ cần yêu cầu một review của người còn lại; không ép một người tự duyệt code của mình.

## 6. CI kiểm tra những gì

Workflow `.github/workflows/ci.yml` chạy khi mở/cập nhật PR vào `main` và khi push vào `main`. Job `unit-tests` chạy Node 24, cài dependency theo lockfile nhưng bỏ script cài Electron trong CI, kiểm tra cú pháp/dấu conflict và chạy unit test. Không upload bản phát hành, không tự merge.

Các kiểm tra native Windows và giao diện vẫn chạy trên máy phát triển; CI unit không chứng minh pet hiện trong mọi game hay điều khiển được mọi player. C# thay đổi thì build lại helper và thử thật trước approval.

Nguồn: [GitHub — protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches), [GitHub — squash merge](https://docs.github.com/en/pull-requests/reference/pull-request-merges).
