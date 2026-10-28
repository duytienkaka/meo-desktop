# Mèo Desktop

Một chú mèo hoạt hình 2D nhỏ sống trên màn hình: đi dạo, chơi với con trỏ, nghe nhạc cùng bạn và giữ hộ ảnh chụp. Hoàn toàn im lặng, hỗ trợ **Windows và macOS**.

## Tải và cài đặt — 0.7.1

**[Release 0.7.1](https://github.com/duytienkaka/meo-desktop/releases/tag/v0.7.1)** · [Tất cả phiên bản](https://github.com/duytienkaka/meo-desktop/releases)

Người dùng cài ứng dụng **không cần Node.js**. Các bộ cài được phân phối trực tiếp qua GitHub Releases.

| Máy của bạn | Bộ cài |
| --- | --- |
| Windows 64-bit | [Meo-Desktop-Setup-0.7.1-x64.exe](https://github.com/duytienkaka/meo-desktop/releases/download/v0.7.1/Meo-Desktop-Setup-0.7.1-x64.exe) |
| Mac Apple Silicon — M1 trở lên | [Meo-Desktop-0.7.1-mac-arm64.dmg](https://github.com/duytienkaka/meo-desktop/releases/download/v0.7.1/Meo-Desktop-0.7.1-mac-arm64.dmg) |
| Mac Intel | [Meo-Desktop-0.7.1-mac-x64.dmg](https://github.com/duytienkaka/meo-desktop/releases/download/v0.7.1/Meo-Desktop-0.7.1-mac-x64.dmg) |

- **Windows:** mở file `.exe` và làm theo trình cài đặt.
- **Mac:** cần **macOS 13 Ventura trở lên**. Mở `.dmg`, kéo **Meo.app** vào **Applications**, rồi mở app. Xem chip tại menu Apple → About This Mac nếu chưa biết chọn bản nào.
- Mỗi bộ cài có file `.sha256` đi kèm trong Assets của Release.

Đây là bản thử nghiệm. Windows chưa ký số; Mac ký ad-hoc, **chưa Developer ID / Apple notarization**, nên hệ điều hành có thể cảnh báo hoặc chặn mở. Xem lưu ý Mac bên dưới.

## Tính năng

- **Chụp ảnh gọn (Windows và Mac):** chuột phải mèo → **Chụp vùng màn hình…** hoặc `Ctrl + Alt + S` (Mac: `⌘ + ⌥ + S`). Kéo chọn vùng, Esc để hủy. Mèo tạm ẩn khi chụp và giữ tối đa **3 ảnh gần nhất**; ảnh thứ 4 thay ảnh cũ nhất.
- Mèo cầm một xấp ảnh nhỏ và chỉ hiện **một nút “Đưa N ảnh ↗”**. Bấm vào ô nhận ảnh trong app đích trước, rồi bấm nút để ném và dán cả bộ 1–3 ảnh vào bản nháp. Bạn tự bỏ ảnh không muốn trong app chat và tự bấm gửi; mèo không bấm Enter. Dùng menu chuột phải **Bỏ ảnh mèo đang giữ** để dọn xấp ảnh. Ảnh ở RAM và các PNG tạm phục vụ đính kèm được giữ đến khi thoát app để bản nháp còn đọc được file. Không tải ảnh lên server.
- Đi dạo theo mép màn hình, rình/vồ con trỏ, phản ứng khi vuốt ve và cuộn tròn nghỉ.
- Tự nghe nhạc cùng bạn. Nhấp mèo để bật/tắt bảng có ảnh bìa, tên bài, tiến trình và nút phát/dừng/chuyển bài. Bấm ảnh bìa hoặc nút ↗ để mở trình phát, kéo thanh tiến trình để tua khi được hỗ trợ. Rê chuột lên tên bài dài để đọc hết; mèo gật đầu và thả vài nốt nhạc khi chuyển bài.
- Cuộn lên/xuống trên mèo để tăng/giảm âm lượng hệ thống, mỗi nấc 2%. Bấm nút loa trong ô âm lượng, card nhạc hoặc menu chuột phải để bật/tắt tiếng. Điều khiển âm lượng hỗ trợ Windows và Mac, tạm nghỉ trong chế độ game.
- Thả file hoặc thư mục vào mèo để mở, mở thư mục chứa hoặc sao chép đường dẫn (tối đa 20 mục/lần). Thả ứng dụng .exe / lối tắt .lnk để ghim nhanh.
- Ghim tối đa 20 ứng dụng trong **Cài đặt → Ứng dụng & game**, mở từ đó hoặc **chuột phải mèo → Ứng dụng đã ghim**. Bỏ ghim không gỡ ứng dụng; danh sách lưu ở `pinned-apps.json` trong thư mục cấu hình.
- Nhận diện game để thu nhỏ và ngồi ở góc; Windows quét Steam/Epic, Mac quét game `.app` từ Steam. Hỗ trợ thêm game thủ công.
- Cài đặt kích thước, màn hình, chuyển động, chế độ tự động và tâm trạng.
- Giữ và kéo để đặt mèo ở vị trí bất kỳ; vị trí được lưu. Thả giữa màn hình thì mèo ở lại đó; kéo về mép hoặc chọn **Đưa mèo về mép dưới** trong Cài đặt để đi dạo tiếp. Chuột phải mở menu; `Ctrl + Alt + M` ẩn/hiện trên Windows.

## macOS

macOS 13 Ventura trở lên. Có hai bản: **Apple Silicon (arm64, M1 trở lên)** và **Intel (x64)**. Mở DMG rồi kéo **Meo.app** vào Applications. App nằm ở thanh menu; phím ẩn/hiện là **⌘ + ⌥ + M**.

- Kéo/thả file, ghim ứng dụng .app, di chuyển mèo và chỉnh âm lượng hệ thống.
- Chụp vùng màn hình bằng **⌘ + ⌥ + S**, giữ tối đa 3 ảnh và đưa vào bản nháp. Cho phép **Screen Recording** khi chụp và **Accessibility** khi đưa ảnh; có thể phải mở lại app sau khi cấp quyền. Chỉ dán bằng ⌘ + V, không tự gửi tin nhắn. Nếu app đích không nhận nhiều file từ clipboard, dùng ⌘ + V thủ công hoặc đính kèm theo cách của app đó.
- Apple Music / Spotify: bật “Nghe nhạc cùng bạn” và cấp quyền **Automation** khi macOS hỏi. Nhạc trong trình duyệt và ảnh bìa trên Mac chưa hỗ trợ; vẫn có tên bài, điều khiển phát/chuyển bài/tua. Mèo không tự mở trình phát đang đóng.
- Quét game .app từ Steam; thêm game .app thủ công nếu còn thiếu. Nhận diện game theo ứng dụng, không đọc bàn phím hoặc màn hình.
- Âm lượng không điều chỉnh được trên một số thiết bị xuất âm thanh có mức cố định; app sẽ báo không hỗ trợ.
- Bản thử nghiệm có chữ ký ad-hoc, **chưa Developer ID / notarization**. macOS có thể chặn mở; xem hướng dẫn của Apple tại System Settings → Privacy & Security và chỉ quyết định cho phép nếu tin tưởng nguồn tải. Không cần tắt Gatekeeper.

Build trên Mac: `npm ci`, `npm run setup:mac -- arm64` hoặc `npm run setup:mac -- x64`. GitHub Actions trong `.github/workflows/macos-release.yml` tạo DMG/ZIP, kiểm chữ ký và chạy smoke test trên cả hai kiến trúc. Chưa kiểm thử thủ công bằng Apple Music/Spotify thật.

## Phím tắt

| Thao tác | Windows | Mac |
| --- | --- | --- |
| Ẩn/hiện mèo | `Ctrl + Alt + M` | `⌘ + ⌥ + M` |
| Chụp vùng màn hình | `Ctrl + Alt + S` | `⌘ + ⌥ + S` |
| Hủy chọn vùng chụp | `Esc` | `Esc` |

## Phát triển từ mã nguồn

Cần **Node.js 24** có npm. [Tag v0.7.1](https://github.com/duytienkaka/meo-desktop/tree/v0.7.1) chứa mã nguồn tương ứng với bộ cài đã phát hành; các thay đổi trên nhánh phát triển có thể chưa được merge vào `main`.

Clone dự án rồi mở terminal trong thư mục source:

```sh
git clone https://github.com/duytienkaka/meo-desktop.git
cd meo-desktop
npm ci
npm start
```

Muốn xem đúng mã của bản phát hành, dùng `git switch --detach v0.7.1` sau khi clone. Khi phát triển tính năng mới, tạo nhánh theo **[GIT-GUIDE.md](GIT-GUIDE.md)**.

Mở app sẽ hiện Cài đặt. Đóng Cài đặt thì mèo vẫn chạy trong khay hệ thống. Dùng `npm start -- --background` để chỉ hiện mèo khi khởi động.

## Kiểm tra và đóng gói

```powershell
npm run check
npm test
npm run package:win
npm run setup:win
```

File cài đặt nằm ở `outputs/setup/Meo-Desktop-Setup-0.7.1-x64.exe`, kèm SHA-256. Trình cài tạo shortcut, hỗ trợ gỡ cài đặt và giữ cấu hình khi gỡ. Bản chưa ký số.

Bản portable Windows tạo bằng `npm run package:win` nằm ở `../outputs/Meo-Desktop-0.7-win-x64/Meo.exe`. Giữ cả thư mục đi kèm. Script tải Electron chính thức và kiểm tra SHA-256; không đóng gói đè vào thư mục đã có `Meo.exe`.

Build bộ cài Mac trên Mac bằng `npm run setup:mac -- arm64` hoặc `npm run setup:mac -- x64`; DMG/ZIP và SHA-256 nằm trong `outputs/mac/`. Script tự biên dịch helper Swift.

Các helper Windows đã có trong `src/native/` để chạy ngay. Sau khi sửa C#, build lại helper tương ứng và commit cả source/helper:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-media.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-game.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-audio.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-screenshot.ps1
```

Unit test chạy bằng `npm test`; `npm run check` kiểm tra cú pháp và dấu conflict. Bản 0.7.1 đã qua **42 unit test**, kiểm tra Windows dán đủ 3 PNG vào receiver riêng mà không nhấn Enter, và kiểm tra Mac khởi chạy/card nhạc/giao diện ba ảnh/chuẩn bị clipboard PNG native trên cả hai kiến trúc. Quyền chụp và thao tác dán trong ứng dụng Mac bên ngoài vẫn cần kiểm thử thủ công trên máy thực tế.

Các bài kiểm tra giao diện/native trong `checks/` cần bản đóng gói tương ứng. Thử điều khiển nhạc Windows bằng fixture im lặng:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File checks/build-native-media-fixture.ps1
node checks/native-player.test.cjs
```

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `src/` | Logic app, giao diện, hoạt ảnh |
| `src/native/` | Helper C# cho Windows, tích hợp JXA/Swift cho Mac trong `mac/` |
| `assets/` | Ảnh mèo và biểu tượng |
| `scripts/` | Kiểm tra source, build helper và đóng gói |
| `checks/` | Unit test, kiểm tra giao diện và native |
| `.github/workflows/` | CI, build Mac và đính kèm bộ cài vào Release |
| `.githooks/` | Chốt chặn push nhầm vào main |

App dùng **Electron 45, JavaScript/Node.js, HTML/CSS và Canvas 2D**. Windows dùng **C#/.NET Framework**; Mac dùng **JXA/AppKit và Swift**. Dữ liệu cấu hình lưu bằng JSON tại `%APPDATA%/MeoDesktop/` trên Windows và `~/Library/Application Support/MeoDesktop/` trên Mac. Không cần server/database; thông tin bài hát dùng trong bộ nhớ, không lưu lịch sử nghe nhạc.

## Giới hạn

- Windows dùng các helper C#; macOS dùng các API/script hệ thống, không chạy file .exe. `npm run setup:mac` chỉ chạy trên Mac.
- Fullscreen độc quyền có thể che pet; dùng **Borderless / Windowed Fullscreen**. Trong chế độ game, mèo không chặn chuột.
- Ảnh bìa, thời lượng và nút nhạc phụ thuộc trình phát. Chỉ tua được khi trình phát cung cấp thời lượng và cho phép đổi vị trí; nếu không, thanh tiến trình chỉ để xem.
- Game không có trong nguồn quét cần thêm thủ công. Nhận diện theo tên file chạy có thể nhầm nếu tên trùng nhau.

Hướng dẫn cộng tác và push code: **[GIT-GUIDE.md](GIT-GUIDE.md)**.
