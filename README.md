# Mèo Desktop · 0.4

Mở `Meo.exe` hoặc lối tắt **Meo Desktop** để mở cửa sổ Cài đặt. Nếu app đã chạy, thao tác này mở lại cửa sổ hiện có và không tạo thêm mèo. Giữ toàn bộ thư mục đi kèm với file chạy.

Cài đặt có ba phần: **Người bạn** (hiện/ẩn, kích thước, màn hình, chuyển động), **Tự động** (nhạc/game và chọn tâm trạng), **Ứng dụng & game** (đánh dấu/bỏ qua/gỡ quy tắc). Thay đổi được áp dụng và lưu ngay. Đóng cửa sổ Cài đặt hoặc nhấn **Xong, về với mèo** sẽ ẩn cửa sổ và giữ mèo chạy. Nhấp đúp biểu tượng khay mở lại Cài đặt.

Mèo xuất hiện ở mép dưới rồi tự đi dạo qua bốn mép. Phần trong suốt cho phép nhấp vào cửa sổ bên dưới; chỉ các điểm có hình mèo nhận chuột.

- Nhấp mèo để vuốt ve. Giữ và kéo để đổi chỗ dọc mép, hoặc chuyển sang màn hình khác.
- Chuột phải lên mèo hoặc biểu tượng khay chỉ còn bốn thao tác: **Cài đặt**, **Ẩn/hiện**, **Tạm dừng/tiếp tục**, **Thoát**. Các thiết lập chi tiết nằm trong cửa sổ riêng.
- `Ctrl+Alt+M` trên Windows / `Command+Option+M` trên Mac: ẩn hoặc hiện.
- Tinh nghịch: đi dạo, hạ người rình con trỏ khoảng 0,7 giây rồi vồ hơi quá đà và quay đi. Có thời gian nghỉ giữa các lần vồ; đưa con trỏ ra xa thì mèo ngừng rình. Sau khoảng 45 giây chơi, mèo có thể cuộn tròn nghỉ 8 giây. Vuốt ve làm mèo nheo mắt, nghiêng đầu và hiện tim. Tắt đi dạo thì mèo không tự vào hoạt cảnh nghỉ này.
- Nghe nhạc: đeo tai nghe và lắc lư. Chơi game: thu nhỏ 70 điểm, mặc trang bị, ngồi yên ở góc dưới. Tập trung: thở nhẹ/chớp mắt. Ngủ: cuộn tròn, thỉnh thoảng hé mắt.

Bật **Cài đặt → Tự động → Nghe nhạc cùng bạn** trên Windows: media đang phát thì mèo đeo tai nghe, khi dừng khoảng 2,2 giây thì trở về trạng thái trước đó. Khoảng chờ giữ tư thế ổn định khi chuyển bài. Chọn một tâm trạng bằng tay sẽ tắt tự động; bật lại bằng các công tắc trong Cài đặt. Thao tác tạm ẩn hoặc tạm dừng hoạt ảnh vẫn được giữ nguyên.

Bộ nhận diện đọc trạng thái phát do Windows công bố, không ghi âm. Điều khiển trình phát chỉ được gửi khi bạn nhấn nút trong bảng nhạc. Spotify, trình duyệt và những app khác cần công bố media session để được nhận diện; video đang phát cũng có thể kích hoạt trạng thái nghe nhạc. Tên bài hát, nghệ sĩ và khả năng điều khiển do Windows cung cấp được dùng trong bảng nhạc; không lưu lịch sử bài hát. Không phát âm thanh, không tự chạy lúc đăng nhập, không gửi dữ liệu ra mạng khi chạy.

Bật **Cài đặt → Tự động → Nhận diện game tự động**. Game được nhận ra từ danh sách tên phổ biến, thư viện đã quét/thêm thủ công, hoặc dấu hiệu full screen Direct3D / game được cài trong một số thư mục game khi đang ở full screen không viền. Full screen đơn thuần, desktop, trình duyệt, trình phát video và launcher không đủ để được coi là game. Khi game được nhận ra, mèo mặc trang bị, thu về góc và ưu tiên hơn nghe nhạc. Game thuộc danh sách hoặc bạn đã đánh dấu sẽ giữ trạng thái khi Alt+Tab, đến khi tiến trình kết thúc; nhận diện theo dấu hiệu full screen chỉ giữ trong lúc dấu hiệu vẫn còn. Có khoảng chờ ngắn khi thoát/chuyển cửa sổ để tránh nhấp nháy trạng thái.

**Cài đặt → Ứng dụng & game** là thư viện game. App tự quét khi khởi động, đọc thư viện Steam (cả ổ phụ), manifest Epic và các vị trí game được Windows ghi nhận. Không quét toàn bộ ổ đĩa. Nút **Quét lại** cập nhật danh sách; **Thêm game** mở hộp chọn file `.exe` của game còn thiếu. Game thủ công được giữ khi quét lại. Gỡ một thẻ chỉ gỡ khỏi thư viện, không xóa game trên máy; các thẻ tự quét đã gỡ không tự xuất hiện lại. Thư viện và các game đã gỡ lưu tại `%APPDATA%/MeoDesktop/games.json`. Game trong thư viện được nhận diện theo tên file chạy và giữ trạng thái khi Alt+Tab. Các game có cùng tên file chạy có thể trùng nhận diện. Không đọc nội dung cửa sổ, không mở game, không can thiệp vào tiến trình và không gửi dữ liệu ra mạng. Nếu quét gặp lỗi, danh sách trước đó được giữ nguyên.

Quét tự động có giới hạn số thư mục và độ sâu để tránh đọc đĩa quá lâu; game ở vị trí lạ hoặc không có manifest có thể cần thêm thủ công. Chưa kiểm chứng bằng game thật trên máy hiện tại; kiểm thử Steam/Epic dùng thư viện mẫu và kiểm thử chuyển trạng thái dùng mẫu tiến trình.

Hai helper dừng khi khóa/cho máy ngủ và thoát cùng mèo. Bộ đọc game theo dõi tiến trình khi app đang chạy; danh sách ứng dụng vừa sử dụng không còn hiển thị trong Cài đặt. Nhạc/game tự động hiện dành cho Windows; bản Mac cần adapter riêng. Bộ sưu tập mở khóa và ngủ khi rời máy là các bước tiếp theo.

Thiết lập lưu tại `%APPDATA%/MeoDesktop/settings.json` trên Windows, hoặc thư mục Application Support/MeoDesktop trên Mac. Mở app lần nữa sẽ hiện lại mèo nếu đang ẩn. Mức phủ trên ứng dụng quản trị, một số game toàn màn hình độc quyền hoặc hệ thống bảo vệ của game có thể phụ thuộc hệ điều hành; cần kiểm tra trực tiếp từng trường hợp.

## Mã nguồn và chạy trên Mac

Giao diện Canvas, hoạt ảnh và đường đi dùng chung. Lớp desktop dùng Electron với cửa sổ trong suốt, không lấy tiêu điểm bàn phím, và chỉ bật nhận chuột khi con trỏ trúng alpha của hình mèo. Electron hỗ trợ Windows và macOS; bản phát hành hiện tại được build và kiểm tra trên Windows.

Trên Mac, cài Node.js, chạy `npm install` rồi `npm start` trong thư mục mã nguồn. Cần chạy và kiểm tra thực tế trên Mac trước khi phát hành. `node scripts/package.cjs darwin arm64` tạo app bundle trên máy Mac; việc ký và notarize để phân phối rộng rãi cần thực hiện riêng. Script sẽ từ chối build bundle Mac trên Windows để giữ đúng quyền file và symlink.

`node scripts/package.cjs win32 x64` tải Electron 45.0.0 từ bản phát hành GitHub chính thức, xác minh SHA-256 rồi tạo thư mục app Windows. Không chạy lại để ghi đè bản đang dùng; tăng phiên bản đầu ra khi đóng gói bản mới.

`npm test`: kiểm tra đường đi, nhạc, phân loại game, Alt+Tab, ưu tiên, khôi phục và tên ứng dụng. Test `settings.test.cjs` kiểm tra giao diện Cài đặt, lưu tức thì, tách quyền IPC, tên dễ đọc, mở app lần hai và đóng về khay. Các test `desktop.test.cjs`, `media-desktop.test.cjs`, `game-desktop.test.cjs` kiểm tra Electron, bộ đọc Windows thật và chuyển trạng thái bằng các tình huống kiểm soát được. Chưa khởi chạy game thật trong bài kiểm tra; khả năng phủ trên game độc quyền toàn màn hình/anti-cheat cần kiểm tra với game cụ thể.

Bản Windows được đặt ProductName/FileDescription là **Mèo Desktop**, OriginalFilename là Meo.exe và có biểu tượng mèo. `scripts/package.cjs` dùng rcedit 2.0.0 từ kho electron/rcedit chính thức để đặt metadata. `--background` dùng khi muốn khởi động chỉ mèo mà không mở Cài đặt.

`scripts/build-media.ps1` và `scripts/build-game.ps1` biên dịch helper C# bằng .NET Framework có sẵn trên Windows. App mở các helper ẩn và quản lý vòng đời. Bản macOS không chạy helper Windows; hai mục tự động được vô hiệu hóa đến khi có adapter riêng.

Hình mèo là hai atlas image_gen đã được chọn trong `outputs/cat-motion-demo`; prompt gốc nằm trong `generation-prompts.md` của bản demo. Bản desktop sử dụng trực tiếp các hình này.

## Hiển thị khi chơi game

Khi ở chế độ game, cửa sổ mèo dùng mức screen-saver và định kỳ đưa lên trên bằng moveTop, không lấy tiêu điểm bàn phím. Mèo để toàn bộ chuột đi xuyên qua và không hiện bong bóng thông báo. Đã kiểm tra thứ tự cửa sổ trên một cửa sổ thử nghiệm toàn màn hình luôn ở trên; cửa sổ thử nghiệm giữ tiêu điểm bàn phím. Đây không phải kiểm chứng bằng game DirectX thật.

Fullscreen độc quyền có thể vượt qua lớp cửa sổ desktop nên không đảm bảo pet hiện trong mọi game. Chọn Borderless / Windowed Fullscreen trong game để dùng cùng pet. Hướng dẫn cũng có trong Cài đặt → Tự động. Không hook hay chèn mã vào tiến trình game. Tài liệu Microsoft: https://devblogs.microsoft.com/directx/demystifying-full-screen-optimizations/ ; Electron: https://www.electronjs.org/docs/latest/api/browser-window#winsetalwaysontopflag-level-relativelevel

## Điều khiển nhạc cùng mèo

Trên Windows, nhấp mèo khi đang nghe nhạc để bật/tắt bảng nền tối, bo góc, có ảnh bìa, tên bài, nghệ sĩ, thời gian đã phát/còn lại và ba nút bài trước, phát/tạm dừng, bài tiếp theo. Bảng trượt, phóng nhẹ và mờ dần khi mở/đóng; chuyển động giảm khi hệ điều hành yêu cầu giảm hoạt ảnh. Nhấp pet lần nữa đóng bảng, kể cả sau khi nhạc tạm dừng. Có thể mở qua Cài đặt → Tự động → Mở điều khiển nhạc kể cả khi không dùng tự đổi tâm trạng. Bảng đóng khi nhấn Escape, nút ×, nhấp ra ngoài, ẩn mèo, khóa máy hoặc vào chế độ game. Mèo đứng tại chỗ khi bảng đang mở; tạm dừng nhạc không tự đóng bảng.

Nút phụ thuộc khả năng của trình phát. Nút không được trình phát hỗ trợ sẽ bị vô hiệu hóa. App gửi lệnh cho nguồn đang hiển thị; nếu nguồn đổi trước khi gửi, lệnh cũ bị từ chối. Điều khiển dùng API Windows Media Control, không mở trang mạng, không thu âm, không lưu tiêu đề bài hát. Nhiều ứng dụng/trình duyệt có thể công bố video là một media session; bảng theo nguồn phát mà Windows cung cấp. Hiện chưa có adapter điều khiển cho macOS.

`checks/player.test.cjs` kiểm tra bảng nhạc, gửi lệnh, tạm dừng/phát lại, nguồn thay đổi, nút không hỗ trợ và không lưu metadata. `checks/build-native-media-fixture.ps1` biên dịch trình phát thử nghiệm tắt tiếng, rồi `node checks/native-player.test.cjs` kiểm tra thật bốn lệnh Windows chỉ tới phiên thử nghiệm. Các trình phát của người dùng không được điều khiển trong bài kiểm tra này.

Ảnh bìa lấy từ thumbnail do Windows media session cung cấp, thu gọn về 192×192 trong bộ nhớ, không tải ảnh qua mạng và không lưu ảnh vào thư viện app. Nếu trình phát không cung cấp ảnh hoặc thời lượng, bảng hiện hình nốt nhạc và thời gian trống. Thanh tiến trình chỉ hiển thị; chưa hỗ trợ tua. Native test xác nhận đọc cả thumbnail và timeline từ phiên thử nghiệm im lặng.
