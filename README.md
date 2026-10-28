# Mèo Desktop

App mèo 2D nhỏ trên màn hình, hoàn toàn im lặng. Phiên bản **0.4.0**.

## Tính năng

- Đi dạo theo mép màn hình, rình/vồ con trỏ, phản ứng khi vuốt ve và cuộn tròn nghỉ.
- Tự nghe nhạc cùng bạn. Nhấp mèo để bật/tắt bảng có ảnh bìa, tên bài, tiến trình và nút phát/dừng/chuyển bài. Bấm ảnh bìa hoặc nút ↗ để mở trình phát, kéo thanh tiến trình để tua khi được hỗ trợ. Rê chuột lên tên bài dài để đọc hết; mèo gật đầu và thả vài nốt nhạc khi chuyển bài.
- Cuộn lên/xuống trên mèo để tăng/giảm âm lượng hệ thống, mỗi nấc 2%. Bấm nút loa trong ô âm lượng, card nhạc hoặc menu chuột phải để bật/tắt tiếng. Điều khiển âm lượng hiện hỗ trợ Windows và tạm nghỉ trong chế độ game.
- Thả file hoặc thư mục vào mèo để mở, mở thư mục chứa hoặc sao chép đường dẫn (tối đa 20 mục/lần). Thả ứng dụng .exe / lối tắt .lnk để ghim nhanh.
- Ghim tối đa 20 ứng dụng trong **Cài đặt → Ứng dụng & game**, mở từ đó hoặc **chuột phải mèo → Ứng dụng đã ghim**. Bỏ ghim không gỡ ứng dụng; danh sách lưu ở `pinned-apps.json` trong thư mục cấu hình.
- Nhận diện game để thu nhỏ và ngồi ở góc; quét Steam/Epic và hỗ trợ thêm game thủ công.
- Cài đặt kích thước, màn hình, chuyển động, chế độ tự động và tâm trạng.
- Giữ và kéo để đặt mèo ở vị trí bất kỳ; vị trí được lưu. Thả giữa màn hình thì mèo ở lại đó; kéo về mép hoặc chọn **Đưa mèo về mép dưới** trong Cài đặt để đi dạo tiếp. Chuột phải mở menu; `Ctrl + Alt + M` ẩn/hiện trên Windows.

## Cài và chạy

Cần **Node.js 24** có npm. Mở terminal trong thư mục dự án:

```powershell
npm ci
npm start
```

Mở app sẽ hiện Cài đặt. Đóng Cài đặt thì mèo vẫn chạy trong khay hệ thống. Dùng `npm start -- --background` để chỉ hiện mèo khi khởi động.

## Kiểm tra và đóng gói

```powershell
npm run check
npm test
npm run package:win
```

Bản Windows nằm ở `../outputs/Meo-Desktop-0.4-win-x64/Meo.exe`. Giữ cả thư mục đi kèm. Script tải Electron chính thức và kiểm tra SHA-256; không đóng gói đè vào thư mục đã có `Meo.exe`.

Các helper Windows đã có trong `src/native/` để chạy ngay. Sau khi sửa C#, build lại helper tương ứng và commit cả source/helper:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-media.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-game.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-audio.ps1
```

Unit test chạy bằng `npm test`; `npm run check` kiểm tra cú pháp và dấu conflict. Các bài kiểm tra giao diện/native trong `checks/` cần bản đóng gói Windows ở đường dẫn trên. Thử điều khiển nhạc bằng fixture im lặng:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File checks/build-native-media-fixture.ps1
node checks/native-player.test.cjs
```

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `src/` | Logic app, giao diện, hoạt ảnh và helper C# trong `native/` |
| `assets/` | Ảnh mèo và biểu tượng |
| `scripts/` | Kiểm tra source, build helper và đóng gói |
| `checks/` | Unit test, kiểm tra giao diện và native |
| `.github/workflows/` | CI kiểm tra code |
| `.githooks/` | Chốt chặn push nhầm vào main |

App dùng Electron, JavaScript/Node.js, HTML/CSS, Canvas 2D và C#/.NET Framework. Dữ liệu cấu hình lưu bằng JSON tại `%APPDATA%/MeoDesktop/`. Không cần server/database; thông tin bài hát dùng trong bộ nhớ, không lưu lịch sử nghe nhạc.

## Giới hạn

- Nhận diện game/điều khiển nhạc mới triển khai trên Windows. Bản Mac cần tích hợp native và kiểm tra riêng; `npm run package:mac` chỉ chạy trên Mac.
- Fullscreen độc quyền có thể che pet; dùng **Borderless / Windowed Fullscreen**. Trong chế độ game, mèo không chặn chuột.
- Ảnh bìa, thời lượng và nút nhạc phụ thuộc trình phát. Chỉ tua được khi trình phát cung cấp thời lượng và cho phép đổi vị trí; nếu không, thanh tiến trình chỉ để xem.
- Game không có trong nguồn quét cần thêm thủ công. Nhận diện theo tên file chạy có thể nhầm nếu tên trùng nhau.

Hướng dẫn cộng tác và push code: **[GIT-GUIDE.md](GIT-GUIDE.md)**.
