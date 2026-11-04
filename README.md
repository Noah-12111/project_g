# HobbyVerse AI

Website sưu tầm mô hình Gundam/Gunpla, figure anime và nhân vật game, tích hợp trợ lý tư vấn bằng Google Gemini.

## Tính năng

- Danh mục Gundam/Gunpla, Anime Figures và Game Collectibles.
- Tìm kiếm và lọc mô hình theo danh mục.
- Danh sách yêu thích được lưu trên trình duyệt.
- Chi tiết sản phẩm mẫu, hình ảnh tham khảo và mô tả.
- Trợ lý AI tiếng Việt gợi ý mô hình, so sánh kit/figure, tư vấn cho người mới bắt đầu.
- Chạy cục bộ trên Windows bằng `start.bat`; không cần VS Code.
- Backend giữ Gemini API key, không gửi khóa xuống trình duyệt.

> Giá và thông tin sản phẩm trong website là dữ liệu minh họa, không phải giá bán hoặc tồn kho đã xác minh. Ảnh minh họa được tải từ nguồn bên ngoài.

## Yêu cầu

- Windows 10/11.
- Node.js 20 trở lên: https://nodejs.org/
- Gemini API key từ Google AI Studio: https://aistudio.google.com/api-keys
- Kết nối Internet khi gọi Gemini và tải ảnh tham khảo.

Không cần cài VS Code. Dự án không sử dụng package npm bên ngoài nên không cần `npm install`.

## Chạy lần đầu

1. Tải repository về máy bằng **Code → Download ZIP**, sau đó giải nén.
2. Nhấp đúp `start.bat`.
3. Khi được yêu cầu, nhập Gemini API key. Ký tự nhập sẽ được ẩn; khóa được lưu trong file `.env` trên máy cá nhân.
4. Website tự mở tại http://127.0.0.1:3000.
5. Giữ cửa sổ máy chủ đang chạy khi sử dụng website.

Các lần sau, chỉ cần nhấp đúp `start.bat`. Để thay khóa, nhấp đúp `configure-ai.bat`.

Có thể chạy thủ công bằng lệnh `node server.js` trong thư mục dự án.

## Cấu trúc dự án

```text
project_g/
├── index.html          # Giao diện website
├── styles.css          # Giao diện và responsive
├── app.js              # Tìm kiếm, lọc, yêu thích và chat UI
├── logo.svg            # Logo HobbyVerse
├── server.js           # Backend cục bộ và Gemini API
├── start.bat           # Khởi chạy website trên Windows
├── configure-ai.bat    # Cấu hình/thay API key
├── setup-ai.ps1        # Nhập API key an toàn hơn trên console
├── package.json        # Lệnh start/dev/test
├── .env.example        # Mẫu biến môi trường, không chứa khóa thật
├── .gitignore          # Bỏ qua .env và file tạm
└── tests/
    └── ai.test.js      # Kiểm thử
```

## Cấu hình Gemini

Website dùng Google Gemini Interactions API ở backend. File `.env` được tạo tự động bởi `start.bat` trong lần cấu hình đầu tiên.

Nếu muốn tạo thủ công, sao chép `.env.example` thành `.env` rồi điền:

```env
PORT=3000
AI_PROVIDER=gemini
GEMINI_API_KEY=YOUR_NEW_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.8-flash
```

Không commit, chia sẻ hoặc đưa file `.env` lên GitHub. Nếu API key bị lộ, hãy thu hồi khóa cũ trong Google AI Studio và tạo khóa mới.

Kiểm tra trạng thái cấu hình tại http://127.0.0.1:3000/api/health. Khi API key đã được nạp, phản hồi sẽ có `"configured": true`.

## Kiểm thử

Trong thư mục dự án:

```powershell
npm test
```

## Bảo mật và giới hạn

- Máy chủ chỉ bind vào `127.0.0.1`, phù hợp sử dụng riêng trên máy tính cá nhân; không tự ý mở cổng ra Internet.
- Gemini API key chỉ được đọc ở backend từ `.env`.
- `.gitignore` loại trừ `.env`, `node_modules/`, log và coverage.
- Không đưa API key thật vào `index.html`, `app.js`, ảnh chụp màn hình hoặc commit Git.
- Nội dung do AI tạo có thể không chính xác; hãy kiểm tra thông tin sản phẩm và khả năng tương thích trước khi mua.
- Các hình ảnh tham khảo được tải từ URL bên ngoài; việc hiển thị phụ thuộc nhà cung cấp ảnh và kết nối Internet.

## Công nghệ

HTML, CSS, JavaScript, Node.js built-in modules và Google Gemini API.

## Giấy phép

Chưa chỉ định giấy phép phân phối. Hãy kiểm tra quyền sử dụng các hình ảnh và tài nguyên bên ngoài trước khi phát hành công khai.
