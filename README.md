# SumVerify

Vite + vanilla JS, đa ngôn ngữ (12 locale), build tĩnh ra `dist/`.

```bash
npm install
npm run dev        # http://localhost:5173  (/, /ja/, /vi/about/, /privacy/ ...)
npm run build      # kiểm tra i18n + build 38 trang + sitemap.xml vào dist/
npm run preview
npm run i18n:check # báo key thiếu / thừa / sai {placeholder} so với en.json
```

## Cấu trúc

```
i18n.config.js              # site (tên, email, github), danh sách locale, danh sách trang
i18n/locales/<code>.json    # toàn bộ chuỗi dịch của một ngôn ngữ (en.json là bản gốc)
src/templates/layout.html   # <head>, header, footer, script — dùng chung mọi trang
src/templates/partials/     # header.html, footer.html
src/templates/pages/        # home, about, contact (đa ngôn ngữ) + privacy, terms (chỉ English)
src/main.js, shell.js       # theme, đổi ngôn ngữ, menu mobile
src/checker/                # công cụ tính hash (chỉ nạp ở trang chủ, hash-wasm tách chunk riêng)
build/render.js             # engine template + i18n (thuần Node, không phụ thuộc Vite)
build/vite-plugin-i18n-pages.js  # sinh HTML cho dev server và build
```

Không có file HTML nào nằm sẵn trên đĩa: mỗi trang được sinh từ **1 template × 1 file JSON ngôn ngữ**.

## Cú pháp template

| Cú pháp | Ý nghĩa |
|---|---|
| `{{home.h1}}` | chuỗi trong JSON (cho phép HTML) |
| `{{home.cmpPlaceholder\|attr}}` | như trên, escape để dùng trong thuộc tính HTML |
| `{{@base}}` | biến lúc build: `/`, `/ja/`, … (`@canonical`, `@langOptions`, `@email`, `@repo`…) |
| `{{> header}}` | chèn `partials/header.html` |
| `{{#each home.faq}}{{.q}} {{.a}}{{/each}}` | lặp qua mảng trong JSON |

Trong chuỗi dịch có thể dùng `{githubLink}`, `{emailLink}`, `{author}`, `{email}`, `{repo}`, `{year}`.
Các `{token}` khác (`{n}`, `{name}`, …) giữ nguyên cho JS chạy trên trình duyệt (namespace `ui`).

## Thêm một ngôn ngữ

1. Thêm `{ code: 'it', label: 'Italiano' }` vào `locales` trong `i18n.config.js`.
2. Sao chép `i18n/locales/en.json` thành `it.json` rồi dịch.
3. `npm run i18n:check`. Key chưa dịch sẽ tự dùng bản English, không làm hỏng build.

## Thêm một trang

1. Tạo `src/templates/pages/<id>.html`.
2. Thêm `{ id, path: '<id>/', multilingual: true|false }` vào `pages` trong `i18n.config.js`
   (nếu đa ngôn ngữ thì thêm `meta.<id>.title/description` và nội dung vào các file JSON; nếu chỉ English thì đặt `title`/`description` ngay trong config như `privacy`/`terms`).

## Trang theo từng loại hash (21 trang × 12 ngôn ngữ)

- Dữ liệu trung tính ngôn ngữ của 21 loại hash (độ dài, họ thuật toán, năm, tác giả, tiêu chuẩn, mức bảo mật, lệnh terminal, giá trị của file rỗng, trang liên quan) nằm ở `i18n/hashes.js`, **xếp theo độ phổ biến**. Thứ tự này quyết định menu **Tools**, lưới "Công cụ theo loại hash" ở trang chủ và nhóm "Other hash types".
- Mỗi loại có URL `/<slug>-checksum/` ở mọi ngôn ngữ (ví dụ `/sha256-checksum/`, `/ja/md5-checksum/`, `/vi/sha3-256-checksum/`), dùng chung template `src/templates/pages/hash.html`.
- Nội dung dịch: `hashpage` (khung câu, có token `{name}`, `{bits}`, `{hexLen}`, `{successor}`, `{ext}`) và `hashes.<slug>` (đoạn giới thiệu riêng cho từng hash) trong JSON mỗi ngôn ngữ. Title, description, keywords, đoạn "Thông tin về …" (viết thành một đoạn văn từ các dữ kiện có thật của hash đó), JSON-LD và breadcrumb của từng trang đều sinh từ đó. Trang hash không có phần FAQ; FAQ chỉ còn ở trang chủ.
- Trang hash chỉ tính loại hash của chính nó trước; nút **Check other hash types** sẽ tính nốt 20 loại còn lại trong **một nhóm duy nhất**, xếp theo độ phổ biến.
- Khối "Known-file lookup – Coming soon" xuất hiện ở trang chủ và cả 21 trang hash (cờ `hasLookup` trong `build/render.js`; About/Contact/Privacy/Terms không có).
- Thêm loại hash mới: thêm hàm tính vào `src/checker/hashers.js` (`FACTORIES`, `SECURITY`, `MORE`), một dòng vào `i18n/hashes.js` và một dòng `hashes.<slug>` trong từng file ngôn ngữ.

## Mức độ tin cậy khi khớp hash

`src/checker/hashers.js` → `SECURITY` chia mọi loại hash thành 3 cấp; banner xanh "Match" luôn hiện, nhưng lời nhắc phụ thuộc loại **mạnh nhất** trong các hash khớp:

| Cấp | Loại hash | Hiển thị |
|---|---|---|
| strong | SHA-256/512/384/224, SHA3-*, BLAKE2b/2s, BLAKE3 | khớp bình thường |
| medium | MD5, SHA-1 | thêm ghi chú nhẹ (`riskMedium`) |
| weak | MD4, CRC8/16/32/32C, Adler-32, Fletcher-16/32 | thêm cảnh báo rủi ro cao (`riskWeak`) |

Muốn đổi cấp của một loại hash, sửa một dòng trong `SECURITY`; muốn đổi lời nhắc, sửa `ui.riskMedium` / `ui.riskWeak` trong JSON ngôn ngữ.

## SEO (Google / Bing)

Mọi thứ sinh tự động từ `i18n.config.js` + JSON ngôn ngữ, không cần sửa tay từng trang:

- `sitemap.xml` (có `lastmod` + `xhtml:link hreflang` + x-default) và `robots.txt` (trỏ tới sitemap) được **tạo khi build** vào `dist/`, và cũng được phục vụ ở dev (`/sitemap.xml`, `/robots.txt`).
- Mỗi trang có: `<title>`, `description`, `keywords`, canonical, hreflang, robots (`max-image-preview:large`…), Open Graph (+ `og:locale` và `locale:alternate`), Twitter Card, theme-color.
- JSON-LD: trang chủ = `WebSite` + `WebApplication` (miễn phí, MIT) + `FAQPage` + `Person`; About = `AboutPage`; Contact = `ContactPage`; About/Contact/Privacy/Terms có thêm `BreadcrumbList`.
- Mô tả/từ khóa của từng trang nằm ở `meta.<home|about|contact>` trong mỗi file JSON (privacy/terms nằm trong `i18n.config.js`). `npm run i18n:check` cảnh báo khi title > 60 hoặc description > 160 ký tự (chữ CJK tính gấp đôi).
- **Ảnh chia sẻ:** đặt file PNG 1200×630 tại `public/og-image.png` (URL đã được chèn sẵn: `https://sumverify.com/og-image.png`). Thiếu file thì build sẽ cảnh báo.
- Xác minh Search Console / Bing Webmaster: điền `site.verification.google` / `site.verification.bing`. IndexNow: điền `site.indexNowKey` để tạo `/<key>.txt`.
- `lastmod` lấy theo thời gian sửa file template/JSON của trang đó; nếu CI clone mới mỗi lần thì ngày sẽ là ngày checkout.

## Ghi chú triển khai

- Server cần phục vụ `/about/` → `about/index.html` (mặc định của Netlify, Vercel, Cloudflare Pages, GitHub Pages, nginx `try_files $uri $uri/`).
- `privacy`, `terms` chỉ có bản English ở `/privacy/`, `/terms/`; footer của mọi ngôn ngữ đều trỏ tới đó. Nội dung hai trang là bản nháp, hãy rà soát lại trước khi công bố.
- Tailwind chạy qua PostCSS (không còn CDN) và quét cả `i18n/**/*.json`.
