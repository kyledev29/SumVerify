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

## Ghi chú triển khai

- Server cần phục vụ `/about/` → `about/index.html` (mặc định của Netlify, Vercel, Cloudflare Pages, GitHub Pages, nginx `try_files $uri $uri/`).
- `privacy`, `terms` chỉ có bản English ở `/privacy/`, `/terms/`; footer của mọi ngôn ngữ đều trỏ tới đó. Nội dung hai trang là bản nháp, hãy rà soát lại trước khi công bố.
- Tailwind chạy qua PostCSS (không còn CDN) và quét cả `i18n/**/*.json`.
