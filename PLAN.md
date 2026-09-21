# 📋 PLAN.md — Kami3D · 3D World Wildlife Encyclopedia

> **Trạng thái: 4/4 phase của plan gốc đã hoàn thành.** Tài liệu này là nguồn sự thật duy
> nhất về tiến độ: mỗi phase ghi rõ yêu cầu gốc, những gì đã giao, và bằng chứng đã kiểm
> chứng. Phần "Phase 5" ghi lại những việc phát sinh ngoài plan ban đầu.

Repo: <https://github.com/dangthevinh/Kami3D> · Chạy local: `npm run dev` → <http://localhost:9000>

---

## 📊 Tổng quan trạng thái

| Phase | Nội dung | Trạng thái |
| --- | --- | --- |
| **1** | Setup, Clerk, Supabase schema, UI layout | ✅ Hoàn thành |
| **2** | Trang chủ, quả địa cầu 3D, Animal grid/card | ✅ Hoàn thành |
| **3** | Trang chi tiết loài, ModelViewer, so sánh kích thước | ✅ Hoàn thành |
| **4** | Quiz 3D, quảng cáo, tối ưu hiệu năng/SEO/mobile | ✅ Hoàn thành |
| **5** | Phát sinh: CI/CD, model 3D thật, brand, auth, MCP | ✅ Hoàn thành (còn 1 việc chờ bạn) |
| **6** | Tăng tốc tải trang & SEO | ✅ Hoàn thành |
| **7** | Chế độ Sáng / Tối cho người dùng | ✅ Hoàn thành |
| **8** | Advanced 3D Features & Polish (bạn gọi là "Phase 5") | ✅ 5/6 mục xong — Mục 5 (âm thanh) chờ asset |
| **9** | Âm thanh loài: pipeline tải + kiểm licence | ✅ Hoàn thành — 6/24 loài có tiếng kêu, mode quiz sound đã bật |
| **10** | Review toàn diện & đề xuất cải tiến | ✅ Hoàn thành — báo cáo ở [docs/REVIEW.md](docs/REVIEW.md) |
| **11** | Hệ thống Settings hoàn chỉnh (`/settings` + `user_settings`) | ✅ Hoàn thành — 6 nhóm, mọi cột có tác dụng thật |
| **12** | Admin tự động tìm & tải model 3D | ✅ Hoàn thành (CLI) — xếp hạng chất lượng, DRACO, upload, `model_assets`; UI admin để phase riêng |
| **13** | Nền tảng Data-to-Map (BaseMap + PostGIS + `animal_geodata`) | 📝 Đã ghi prompt, chưa triển khai |
| **14** | Habitat & Species Distribution Maps (`/map`) | 📝 Đã ghi prompt, chưa triển khai |
| **15** | Conservation Threat & Risk Maps | 📝 Đã ghi prompt, chưa triển khai |
| **16** | Timeline & Story Maps | 📝 Đã ghi prompt, chưa triển khai |
| **17** | Admin Geospatial Pipeline & 3D-Map Hybrid | 📝 Đã ghi prompt, chưa triển khai |

**Số liệu hiện tại**

| Hạng mục | Giá trị |
| --- | --- |
| Loài trong bách khoa | **24** (8 vùng, 8 lớp, 4 loài tiền sử) |
| Model 3D thật | **24** file `.glb`, DRACO, tổng **10 MB** (nén từ 61 MB) |
| Route dựng sẵn | **37** (24 trang loài là SSG, `/explore` nay **tĩnh**) |
| Test tự động | **189** bài trong **17** suite (`npm run check:suites`) |
| Tiếng kêu động vật | **6/24 loài** (635 kB), CC0/CC-BY, đã credit + upload Storage + lưu `sound_assets` |
| Tuỳ chọn người dùng | **17 cột** trong `user_settings`, 6 nhóm ở `/settings`; khách chưa đăng nhập vẫn dùng được (lưu trong trình duyệt) |
| First Load JS | `/` 132 kB · `/explore` 133 kB · `/quiz` 126 kB · `/animal/[slug]` 129 kB |
| JS khởi đầu mỗi route (gzip, `npm run check:bundle`) | `/` 146.5 · `/explore` 151.8 · `/quiz` 156.7 · `/animal/[slug]` 142.6 · `/settings` ~133 kB (ngân sách 165) — SettingsProvider thêm ~3–5 kB mỗi route |
| Bundle 3D | tải **sau** khi trang đã dùng được (cổng CI chặn nếu quay lại first paint) |
| CI | GitHub Actions xanh — typecheck → checks → build → bundle budget mỗi lần push |
| **Rủi ro đang mở** | **R1** Clerk đi vòng qua RLS bằng service role (P0) · **R2** `/api/views` có thể bị bơm · **R3** thiếu `app/error.tsx`/`loading.tsx` · **R4** kiến trúc dữ liệu O(N) · **R5** không có giám sát lỗi · **R6** GLB không được `dispose` + chưa có KTX2 · **R7** chưa sẵn sàng i18n · **R8** egress chưa có trần. Chi tiết + SQL ở [docs/REVIEW.md](docs/REVIEW.md) |
| Bảo mật database | Supabase advisors: **0 phát hiện security**; 2 cảnh báo `anon_security_definer_function_executable` là **cố ý** và hẹp (`increment_animal_view`, `quiz_stats`) |

**Tech stack đang chạy**: Next.js `15.5.25` (App Router) · React `19.2.8` · Tailwind CSS `4` ·
React Three Fiber `9` + drei `10` + three `0.186` · Clerk `7` · Supabase `2.116` + `@supabase/ssr` ·
next-themes `0.4` · Lucide `1`. **Không còn thư viện animation nào** — mọi chuyển động là CSS
(`app/globals.css`).

---

## ✅ Phase 1 — Setup dự án & tích hợp khung cơ bản

**Yêu cầu gốc**: khởi tạo Next.js + Tailwind, tích hợp Clerk và Supabase, Shadcn UI / Lucide /
Framer Motion, middleware bảo vệ route, trang `/sign-in` `/sign-up` dark theme, schema SQL cho
`animals` / `user_favorites` / `quiz_scores`, `lib/supabase.ts`, Navbar (logo, tìm kiếm,
UserButton), theme Dark + Glassmorphism + hạt nền động.

| Yêu cầu | Đã giao | Trạng thái |
| --- | --- | --- |
| Next.js + TypeScript + Tailwind | Next 15, Tailwind 4 qua `@tailwindcss/postcss`, `app/globals.css` design system | ✅ |
| Clerk Authentication | `@clerk/nextjs`, provider bật có điều kiện, `middleware.ts` | ✅ |
| `@supabase/supabase-js` | `lib/supabase.ts` (anon) + `lib/supabase-admin.ts` (service role) | ✅ |
| Shadcn UI + Lucide + Framer Motion | `components/ui/*` (button/card/badge/input/skeleton) viết tay theo chuẩn shadcn, `components.json` để `npx shadcn add` về sau | ✅ |
| Middleware bảo vệ route | `middleware.ts` — không dùng path-matching (Clerk đã deprecate), chặn ở tầng resource | ✅ |
| `/sign-in`, `/sign-up` dark theme riêng | `app/sign-in/[[...sign-in]]`, `app/sign-up/[[...sign-up]]` | ✅ |
| Schema SQL 3 bảng | `supabase/schema.sql` — CHECK constraints, index, full-text search, trigger, RLS, storage bucket | ✅ |
| `lib/supabase.ts` | ✅ | ✅ |
| Navbar có logo / search / UserButton | `components/layout/Navbar.tsx` + `GuestMenu` / `UserMenu` | ✅ |
| Dark theme, glassmorphism, hạt động | `app/globals.css` + `components/layout/BackgroundParticles.tsx` | ✅ |

**Ngoài yêu cầu, đã bổ sung**: `supabase/seed.sql` sinh tự động từ dataset (không bao giờ lệch),
script seed chạy từ CLI (`npm run db:seed`), và bộ test kiểm tra SQL khớp với schema.

---

## ✅ Phase 2 — Trang chủ & quả địa cầu 3D

**Yêu cầu gốc**: cài `@react-three/fiber` + `@react-three/drei`; dựng quả địa cầu 3D tương tác
(xoay, zoom, bấm châu lục để lọc động vật); Animal Grid/Card phong cách Cool/Cute (bo tròn, hover
mượt, neon accent), hiển thị tên loài + phân loại + tình trạng bảo tồn, **lazy loading model 3D**.

| Yêu cầu | Đã giao | Trạng thái |
| --- | --- | --- |
| Cài & cấu hình R3F + drei | R3F 9 + drei 10, `components/3d/CanvasShell.tsx` bọc mọi canvas | ✅ |
| Quả địa cầu tương tác | `components/3d/InteractiveGlobe.tsx` | ✅ |
| Xoay & zoom | OrbitControls (kéo xoay, cuộn/pinch zoom, pan 2 ngón) | ✅ |
| Bấm châu lục để lọc | 8 hotspot + raycast toạ độ → snap về vùng gần nhất; HUD chip cho bàn phím/mobile | ✅ |
| Animal Grid & Card | `AnimalGrid.tsx`, `AnimalCard.tsx` — bo tròn, neon, hover nâng card | ✅ |
| Tên, phân loại, tình trạng bảo tồn | Badge IUCN theo màu + lớp sinh học + vùng | ✅ |
| **Lazy loading model 3D** | Card chỉ mount canvas 3D **khi hover** (chờ 220 ms) và **gỡ khi rời chuột**; không bao giờ mount trên thiết bị cảm ứng | ✅ |

**Quyết định thiết kế quan trọng**: không có file texture Trái Đất nào. Quả địa cầu được vẽ từ
lưới kinh/vĩ tuyến sinh bằng canvas + 8 hotspot phát sáng, nên app không phụ thuộc asset ngoài và
không vướng vấn đề bản quyền ảnh. Có thể truyền `textureUrl` để thay bằng bản đồ thật sau này.

---

## ✅ Phase 3 — Trang chi tiết động vật `/app/animal/[slug]`

**Yêu cầu gốc**: ModelViewer load `.glb/.gltf` bằng `useGLTF`, OrbitControls xoay 360°/zoom/pan,
bật/tắt Wireframe và chỉnh ánh sáng; SizeComparison đặt loài cạnh Người / Cá voi xanh / Khủng
long; Information Panel (Habitat, Diet, Status, Fun Facts), nút âm thanh, nút Yêu thích lưu vào
`user_favorites`.

| Yêu cầu | Đã giao | Trạng thái |
| --- | --- | --- |
| `ModelViewer.tsx` với `useGLTF` | `components/3d/ModelViewer.tsx` — load `.glb` DRACO từ Supabase Storage | ✅ |
| Xoay 360° / zoom / pan | OrbitControls + auto-spin + nút reset khung hình | ✅ |
| Wireframe & ánh sáng | 3 preset (Studio / Sunset / Noir) + toggle Wireframe + fullscreen | ✅ |
| `SizeComparison.tsx` | Người 1,75 m · Cá voi xanh 27 m · T. rex 12 m, bật/tắt từng mốc, có thước đo | ✅ |
| Information Panel | `InfoPanel.tsx` + `lib/animals.ts` — mọi số liệu server-render nên SEO đọc được | ✅ |
| Nút âm thanh | `SoundButton.tsx` — **disable kèm lý do rõ ràng** khi chưa có file (không giả vờ phát) | ✅ |
| Nút Yêu thích | `FavoriteButton.tsx` + `/api/favorites` | ✅ |

**Kiểm chứng độ chính xác kích thước**: `lib/size-comparison.ts` là toán thuần, được test tự động
— mọi loài render **đúng kích thước thật ở trục chính**, các hình không bao giờ chồng nhau, và
hàng được căn giữa. Đây là thứ dễ sai âm thầm nhất nên được test chứ không nhìn bằng mắt.

---

## ✅ Phase 4 — Game hóa, quảng cáo & tối ưu hóa

**Yêu cầu gốc**: Quiz đoán động vật qua bóng 3D / tiếng kêu, tính điểm và lưu vào `quiz_scores`,
mở khoá Badge; khung quảng cáo ở sidebar và dưới bài viết **tuyệt đối không che trình xem 3D**;
modal "xem video ngắn để mở khoá loài tuyệt chủng"; nén DRACO; SEO cho `/animal/[slug]`;
responsive mobile với chạm xoay 3D mượt.

| Yêu cầu | Đã giao | Trạng thái |
| --- | --- | --- |
| Quiz bóng 3D | `app/quiz/page.tsx` + `components/quiz/*` — 10 câu, 15 giây/câu, streak | ✅ |
| Đoán qua tiếng kêu | Nút **disable kèm lý do** — cần file ghi âm cho từng loài trước | ⏸️ chờ asset |
| Tính điểm & lưu `quiz_scores` | `/api/quiz` — **badge tính lại ở server**, không tin client | ✅ |
| Mở khoá Badge | 4 badge, hiển thị ở `/profile` | ✅ |
| Khung quảng cáo | `components/ads/AdSlot.tsx` — **giữ chỗ cố định** (không layout shift) và không bao giờ đè lên canvas | ✅ |
| Modal video mở khoá loài tiền sử | `components/premium/UnlockModal.tsx` — player mô phỏng, **không gọi mạng quảng cáo nào** | ✅ |
| Nén DRACO | 24 model: **61 MB → 10 MB (−84%)**, decoder vendor trong `public/draco/` (không phụ thuộc CDN) | ✅ |
| SEO `/animal/[slug]` | `generateStaticParams` + `generateMetadata` + OG image động 1200×630 + JSON-LD `Taxon` + sitemap + robots | ✅ |
| Responsive & chạm xoay 3D | `touch-action: none` trên canvas, thanh công cụ ngoài canvas, có `prefers-reduced-motion` | ✅ |

---

## ✅ Phase 5 — Phát sinh ngoài plan gốc

| Việc | Chi tiết | Trạng thái |
| --- | --- | --- |
| **CI/CD tự động** | `.github/workflows/ci.yml` (typecheck → 4 suite → build), `auto-merge.yml` (chỉ merge khi CI xanh + chỉ patch/minor), Dependabot, `scripts/publish.sh`, hook pre-push | ✅ |
| **Tải model 3D tự động** | `scripts/fetch-models.mjs` — 4 provider (Sketchfab / Smithsonian / Poly Pizza / URL trực tiếp), **bắt buộc qua allow-list license**, ghi attribution, tự nối `model_url` | ✅ |
| **24 model thật** | Sketchfab, **toàn bộ CC BY 4.0**, credit hiển thị trên trang loài | ✅ |
| **Brand mới** | Logo gradient + góc bo **squircle kiểu Apple** (toán cong liên tục), favicon + ảnh OG dùng chung một nguồn | ✅ |
| **Auth chạy thật** | Supabase Auth và Clerk đều hoạt động; **một nguồn quyết định duy nhất** ở `lib/auth-provider.ts` | ✅ |
| **Google sign-in** | Nút + route `/auth/callback`; với Clerk thì Google đã bật sẵn trên instance | ✅ |
| **Tự động hoá database** | `npm run db:status` / `db:seed` / `db:schema` — không cần mở SQL Editor | ✅ |
| **MCP Supabase ↔ DSH** | `~/.dsh/profiles/web/cordis.patch.yml` — 20 tool `mcp__supabase__*`, giới hạn vào đúng project | ✅ |

---

## ✅ Phase 6 — Tăng tốc tải trang & SEO

**Yêu cầu**: "tăng tốc độ tải trang và SEO google tốt nhất".

| Việc | Chi tiết | Trạng thái |
| --- | --- | --- |
| Bỏ `framer-motion` | 5 chỗ dùng chuyển sang CSS keyframes/transition trong `app/globals.css`; xoá hẳn dependency | ✅ **−42 kB mỗi route** |
| Không tải SDK auth cho khách | Layout gốc không import Clerk/Supabase nữa; `components/auth/AuthSlot.tsx` `import()` menu tài khoản khi có phiên | ✅ Supabase **−112 kB**, Clerk CDN **−239 kB** mỗi trang |
| Cookie gợi ý phiên | `middleware.ts` ghi `kami-auth=in/out` (5 phút) từ `x-clerk-auth-status` của Clerk hoặc cookie `sb-*-auth-token`; `lib/auth-hint.ts` đọc đồng bộ, "unknown" thì tải lúc rảnh | ✅ 8 bài test |
| `<ClerkProvider>` rời khỏi layout | Chỉ mount trong module menu tài khoản và ở `/sign-in` `/sign-up` | ✅ |
| 3D chờ tới lúc cần | `components/3d/MountWhenVisible.tsx`: canvas chỉ mount khi vào gần viewport **và** browser rảnh | ✅ bundle 3D tải sau `load` ~1.8 s |
| Font Sora biến thiên | Bỏ danh sách `weight`, chỉ còn 1 file thay vì 4 | ✅ |
| `/explore` thành trang tĩnh | Bộ lọc đọc từ URL bằng `ExploreUrlFilters` trong `<Suspense>` riêng → HTML có đủ 24 link loài | ✅ `ƒ` → `○` |
| Dữ liệu có cấu trúc | `lib/seo.ts` + `components/seo/JsonLd.tsx`: `WebSite`+`SearchAction`, `Organization`, `BreadcrumbList`, `Taxon`+`PropertyValue`, `CollectionPage`+`ItemList`, `Quiz` | ✅ 10 bài test |
| Canonical & OG | Canonical tuyệt đối cho mọi trang; OG image 1200×630 dùng chung cho toàn site (đã có bản riêng cho từng loài) | ✅ |
| Manifest & cache | `app/manifest.ts`; `Cache-Control` cho `/geo/*` (76 KB bản đồ Natural Earth) | ✅ |
| Đo lường thật | `scripts/audit-browser.mjs` (`npm run audit:perf`) điều khiển Chrome headless qua DevTools protocol | ✅ |

**Trước → sau** (đo bằng `npm run audit:perf`, cache lạnh):

| Trang | JS tổng trước | JS tổng sau | Ghi chú |
| --- | --- | --- | --- |
| `/` | 777 kB | **405 kB** | trong đó chỉ **142 kB** là trước `load` |
| `/about` | 596 kB | **153 kB** | Clerk CDN 239 kB → **0** |

Chi tiết đầy đủ và cách tự đo lại: [docs/PERFORMANCE.md](docs/PERFORMANCE.md).

---

## ✅ Phase 7 — Chế độ Sáng / Tối

**Yêu cầu**: "tạo chế độ tối sáng cho user", đặt trong mục **Settings**.

| Việc | Chi tiết | Trạng thái |
| --- | --- | --- |
| Menu **Settings** trên navbar | `components/layout/SettingsMenu.tsx` — nút bánh răng, mở panel *Settings → Appearance* với 2 lựa chọn **Light** / **Dark**; đóng khi bấm ra ngoài hoặc `Esc` | ✅ |
| Nhớ lựa chọn | `next-themes` (`components/theme/ThemeProvider.tsx`) ghi class lên `<html>` **trước lần paint đầu** nên không nháy sai theme; lưu ở `localStorage` khoá `kami-theme`; mặc định **Dark** | ✅ |
| Bảng màu sáng | Khối `.light` trong `app/globals.css` định nghĩa lại ~20 token. Toàn bộ UI viết dạng `text-white/60`, `bg-white/6`, `ring-white/12`, và Tailwind v4 biên dịch chúng thành `color-mix(in oklab, var(--color-white) …)` — nên đổi `--color-white` sang màu mực **lật toàn bộ ~220 utility cùng lúc** | ✅ |
| Accent đủ tương phản | Neon/glow/iris/solar/coral giữ hue nhưng tối đi; `--color-on-accent` (mực nằm *trên* nền accent) thành trắng ở theme sáng | ✅ |
| Chip tình trạng bảo tồn | Các sắc độ `-300` của Tailwind (vô hình trên nền trắng) được thay bằng mức 700 trong `.light` | ✅ |
| Sân khấu 3D | Vẫn **tối ở cả hai theme** (`.kami-canvas`): mọi scene được chiếu sáng cho phòng tối, đổi nền trắng sẽ mất viền sáng của model | ✅ |
| Đo bằng số, không bằng mắt | `npm run check:theme` (6 bài: đủ token + WCAG AA cả hai chiều) và `npm run audit:theme` (Chrome thật: chữ khó đọc và panel tối sót lại ở theme sáng) | ✅ 12/12 route × theme đạt |

---

## 🚀 Phase 8 — Advanced 3D Features & Polish

> **Bạn gọi nhóm việc này là "Phase 5".** Trong tài liệu này số 5 đã dùng cho phần *phát sinh* (CI/CD, model
> thật, brand, auth, MCP), 6–7 cho *tăng tốc + SEO* và *chế độ Sáng/Tối*, nên nó được đánh số tiếp là **8**.
> Nếu muốn đánh số lại toàn bộ tài liệu thì nói một câu, sửa một lượt.

**Yêu cầu**: nâng 5 phần 3D lên mức production — InteractiveGlobe, ModelViewer, SizeComparison, Quiz 3D, và
Performance/Loading states.

**Mốc đo không được phá** (đo lại sau mỗi mục):

| Chỉ số | Hiện tại | Ngưỡng |
| --- | --- | --- |
| JS **trước** `load` (Chrome, cache lạnh) | ~140–152 kB | **≤ 160 kB** |
| Bundle 3D | tải **sau** `load` | vẫn phải ở sau `load` |
| Test | 76 bài / 10 suite | chỉ tăng |
| Contrast sáng/tối | 12/12 route đạt AA | giữ nguyên |
| CI | xanh | xanh sau **mỗi** mục |

**Trạng thái từng mục**

| # | Mục | Trạng thái |
| --- | --- | --- |
| 0 | Nền tảng: chất lượng thiết bị + cổng chặn bundle trong CI | ✅ Hoàn thành |
| 1 | Production ModelViewer | ✅ Hoàn thành |
| 2 | SizeComparison với scale real-time | ✅ Hoàn thành |
| 3 | Quiz 3D hoàn chỉnh | ✅ Hoàn thành |
| 4 | Enhanced InteractiveGlobe | ✅ Hoàn thành |
| 5 | Âm thanh cho quiz "đoán qua tiếng kêu" | ⏸️ Chờ asset + quyết định |

### Mục 0 — Nền tảng: chất lượng thiết bị & cổng chặn bundle

| Việc | Chi tiết | Trạng thái |
| --- | --- | --- |
| `lib/quality.ts` | Từ `deviceMemory`, `hardwareConcurrency`, `devicePixelRatio`, `(pointer: coarse)`, `saveData` → `tier` (low/balanced/high) + `dpr`, bóng, contact shadow, số sao, số segment, cỡ shadow map | ✅ |
| `components/3d/useQuality.ts` | Hook **hai pha**: render đầu dùng profile giữa (server cũng render client component nên HTML phải hợp lệ), đo thật trong `useEffect` sau khi mount → không lệch hydration | ✅ |
| `CanvasShell` + các scene | dpr/bóng lấy từ tier; số sao và segment của cầu, contact shadow, cỡ shadow map đều theo tier. Tier hiện ra ở `data-quality` trên wrapper (đọc được trong devtools) | ✅ |
| `scripts/check-quality.mjs` | 10 bài: `saveData` thắng mọi tín hiệu, máy yếu → low, điện thoại → balanced (không bao giờ high), browser không khai báo gì → balanced, API lạ/giá trị rác không làm sập, các profile xếp đúng thứ tự | ✅ |
| `scripts/check-bundle.mjs` | Đọc **HTML do build sinh ra**, lấy đúng danh sách `<script src>` (bỏ `polyfills` vì là `nomodule`), gzip lại và chặn nếu: vượt ngân sách, hoặc có `three`/`Clerk`/`Supabase`/`framer-motion` trong first paint, hoặc three.js biến mất khỏi build | ✅ |
| Bước CI mới | `ci.yml` chạy `npm run check:bundle` **sau** bước build — từ nay lỗi "bundle phình" làm đỏ CI | ✅ |

**Số đo Mục 0** (`npm run check:bundle`, JS khởi đầu mỗi route, gzip -6, không tính polyfills):

| Route | JS khởi đầu | Số chunk | Ngân sách |
| --- | --- | --- | --- |
| `/quiz` | 147.7 kB | 13 | 165 |
| `/explore` | 143.7 kB | 13 | 165 |
| `/` | 140.7 kB | 12 | 165 |
| `/animal/[slug]` | 137.8 kB | 11 | 165 |
| `/leaderboard` | 127.6 kB | 9 | 165 |
| `/about` | 125.8 kB | 9 | 165 |

Số này khớp với phép đo bằng Chrome thật (`/about` 126.6 kB, `/` 142.3 kB — chênh lệch do mức nén). Tier đã kiểm chứng trong browser: máy 2 GB → `low` với dpr 1.25, `saveData` → `low`, desktop → `balanced` (máy đo chỉ có 4 core, đúng luật "không đoán high").

Ý nghĩa của cổng chặn: đúng hai lỗi đã xảy ra trong dự án (Clerk CDN 239 kB tải cho khách, bundle 3D chạy trước
first paint) đều **vô hình** trong báo cáo `next build`. Từ mục này, máy chặn thay vì mắt người.

### Mục 1 — Production ModelViewer

| Việc | Chi tiết | Trạng thái |
| --- | --- | --- |
| Camera preset | 3/4 · Trước · Bên · Trên, bay bằng damping theo hàm mũ; toán thuần ở `lib/camera-presets.ts` (10 bài test) | ✅ |
| Bàn phím | `←→↑↓` xoay, `+/-` zoom, `1-4` chọn góc, `R` reset, `F` fullscreen, `W` wireframe, `M` số đo; bỏ qua phím khi đang ở trong nút/ô nhập; `aria-keyshortcuts` + `aria-busy` khi đang bay | ✅ |
| Overlay số đo | Thước ngang + thước dọc vẽ theo bounding box **thật** của model (`Line` + `Html`), nhãn lấy từ `length_m`/`height_m` | ✅ |
| Tiến độ tải thật | `useProgress` → `role="progressbar"` với % xác định và pha ("Downloading model" / "Decoding DRACO"); rig procedural hiện trước | ✅ |
| Thử lại khi lỗi | Chip báo lỗi + nút **Try again**; thêm **watchdog 15 s** vì một request `.glb` bị chặn có thể không bao giờ trả lỗi, chỉ treo suspense | ✅ |
| Lưu ảnh | `gl.render()` + `toDataURL()` trong cùng một task (không cần `preserveDrawingBuffer`), đổi sang blob URL vì Chrome **chặn tải `data:` URL**; tên file + kiểm chữ ký PNG ở `lib/utils.ts` (4 bài test) | ✅ |
| Animation GLB | `useAnimations`: chọn clip + play/pause, **chỉ hiện khi asset có clip** | ✅ (chưa asset nào có clip) |
| Canvas không có WebGL | Phát hiện trước khi mount: máy tắt tăng tốc phần cứng nay thấy panel giải thích thay vì khung trắng (trước đây R3F chỉ log ra console) | ✅ |

**Bằng chứng Mục 1**: `check-camera` (10 bài: preset không đổi khoảng cách, bay luôn hội tụ và không vượt đích, xoay giữ nguyên bán kính và không chạm cực, dolly bị kẹp trong giới hạn) + 4 bài cho đường tải ảnh — tổng **100 bài test**.
Kiểm chứng trong Chrome thật: viewer mount, 4 nút góc máy đổi `aria-pressed` đúng, phím `M`/`W` bật tắt đúng, phím `2` chọn góc Front, `Try again` xuất hiện khi request `.glb` bị chặn, và nút **Save** tự vô hiệu hoá khi scene chưa sẵn sàng.
*Giới hạn của môi trường này*: Chrome headless ở đây **không có WebGL**, nên phần render (khung hình PNG, animation, bay camera thật) chỉ được xác nhận ở tầng DOM + unit test; trên máy có GPU thì cùng đường code đó chạy.

### Mục 2 — SizeComparison với scale real-time

| Việc | Chi tiết | Trạng thái |
| --- | --- | --- |
| "Chiều cao của bạn" | Slider 100–220 cm; hình người trong biểu đồ **là chính người xem** (bỏ hình 1.75 m cố định), lưu `localStorage` khoá `kami-height` | ✅ |
| Câu so sánh sống | `compareToViewer()` + `describeComparison()`: so theo **đúng chiều** mà biểu đồ render chính xác (cá voi theo dài, hươu theo cao), và "same" là một **khoảng** (0.95–1.05) chứ không phải bằng nhau tuyệt đối | ✅ |
| Đơn vị mét / feet-inch | `formatLength`/`formatHeight`/`formatBodyHeight` nhận `"metric" | "imperial"`; quy đổi chính xác rồi **làm tròn tới inch** ("8 ft 2 in", không phải "8.2 ft") | ✅ |
| Thêm mốc tham chiếu | Hươu cao cổ 5.5 m · voi châu Phi 3.2 m · mèo nhà 0.25 m (tổng 6 mốc), mọi mốc đều được test không chồng lên nhau | ✅ |
| Chuyển cảnh | Vị trí **và** tỉ lệ của từng hình được lerp theo hàm mũ trong `useFrame` — kéo slider không còn "giật" giữa hai layout | ✅ |

**Bằng chứng Mục 2** (`check-size` 11 bài + 4 bài đơn vị imperial): hình người đúng chiều cao người dùng, giá trị ngoài khoảng bị kẹp, chọn đúng chiều so sánh, ba khoảng taller/shorter/same, câu tiếng Anh đúng ở cả hai hướng ("1.4x your height" / "2.3x smaller than you"), và mọi mốc xếp không chồng.
Kiểm chứng trong Chrome thật: kéo slider 175 → 120 cm thì nhãn đổi "1.8 m" → "1.2 m" và câu đổi "1.4x" → "2.1x"; bật Imperial thì thành "3 ft 11 in" và "8 ft 2 in long — 2.1x"; **reload vẫn giữ** cả chiều cao lẫn đơn vị.

### Mục 3 — Quiz 3D hoàn chỉnh

| Việc | Chi tiết | Trạng thái |
| --- | --- | --- |
| Bộ sinh câu hỏi thuần | `lib/quiz.ts`: 4 loại câu (loài / vùng / lớp / **so kích thước với thứ quen thuộc**), seed tất định → cùng seed dựng lại đúng vòng đó; 10 bài test | ✅ |
| Mở khoá model thật | Trả lời xong mới tráo sang `.glb` thật (có `Bounds` để cá voi 27 m và axolotl đều vừa khung); **không tải model nào trước khi trả lời** | ✅ |
| Điểm theo thời gian | `lib/quiz-scoring.ts`: 100 điểm + thưởng tốc độ (theo **tỉ lệ** thời gian còn lại, không ưu ái đồng hồ dài) + thưởng streak (tối đa 50); **số câu đúng vẫn là thứ lưu DB và tính badge** — 9 bài test | ✅ |
| Lưu vòng đang chơi | `localStorage` khoá `kami-quiz-round`; màn hình đầu hiện "Continue round (n/10)"; badge/điểm dựng lại từ seed | ✅ |
| Bàn phím + a11y | `1–4` chọn, `Enter` sang câu sau, `aria-live` cho phản hồi, tự focus khu vực chơi (nếu không thì phím im lặng), **đồng hồ dừng khi tab bị ẩn** | ✅ |
| Bảng xếp hạng quiz | `quiz_scores` là **owner-only theo RLS** và `anon` không có grant nào trên bảng, nên bảng xếp hạng theo từng người là bất khả thi về mặt thiết kế. Thay bằng `public.quiz_stats()` (SECURITY DEFINER, `search_path` rỗng, như `increment_animal_view`) trả **số liệu tổng hợp ẩn danh**: số vòng, số người, điểm cao nhất, trung bình %, số vòng tuyệt đối, theo mode — không có `user_id`, không có dòng nào của ai | ✅ (khác kế hoạch ban đầu, có lý do) |

**Bằng chứng Mục 3** — `check-quiz` (8 bài: cùng seed = cùng vòng, đủ 4 lựa chọn và đáp án nằm trong đó, không lặp loài, vùng/lớp chỉ ra đáp án hợp lệ, câu so kích thước phải so với **thứ gần nhất** và đáp án khớp `length_m`, fuzz 100 seed) + `check-scoring` (9 bài: thưởng tốc độ theo tỉ lệ, streak tăng rồi kẹp trần, điểm bị chặn hai đầu, chia 0 an toàn).
Trong Chrome thật: **chơi trọn 10 câu bằng bàn phím** → màn kết thúc hiện "1 / 10 · 10% accuracy · **147 points** · best streak 1 · saved (demo)", vòng đã lưu bị xoá khỏi `localStorage`; đang chơi mà **reload** → hiện "Continue round (2/10)" và vào đúng **câu 3**; giả lập tab bị ẩn → hiện chip *Paused* và **đồng hồ đứng yên 4 giây** rồi chạy lại khi quay về; `quiz_stats()` gọi được bằng **anon key** (thử với 1 dòng test: rounds 1, best 9, average 90%) rồi đã xoá dòng test.
*Chưa kiểm chứng được ở máy này*: hình ảnh model thật hiện ra sau khi trả lời (Chrome headless ở đây không có WebGL) — đường code nằm cùng chỗ với ModelScene đã kiểm chứng, và có `Suspense` fallback về rig.

*Không làm ở mục này*: thêm mode **mới** vào `QUIZ_MODES` sẽ cần migration + `check-sql.mjs`; đề xuất dùng biến
thể câu hỏi trong 2 mode sẵn có trước.

### Mục 4 — Enhanced InteractiveGlobe

| Việc | Chi tiết | Trạng thái |
| --- | --- | --- |
| Bay tới vùng | Chọn vùng (chip, pin, bàn phím hay deep link) → camera bay tới anchor bằng damping hàm mũ, **giữ nguyên mức zoom** (bay là *quay*, không phải cắt cảnh). Toán ở `lib/globe.ts#cameraTargetFor` + `regionFacingCamera` | ✅ |
| Pin theo loài | Mỗi pin vùng mở ra **3 loài được xem nhiều nhất** của vùng đó (kèm số lượt xem), bấm là vào thẳng trang loài — `topSpeciesByRegion()` thuần, có test | ✅ |
| Texture bậc thang | Hai tầng: lưới graticule (vẽ ngay, luôn có) và bản đồ thật; nút **Map/Grid** cho người xem chọn. Bản đồ thêm **bậc độ sâu đại dương** (thềm → sườn → vực, vẽ bằng chính đường bờ có sẵn) và **đổ bóng ven bờ** để đất nổi lên. Máy tier `low` vẽ 1024px và bỏ hai lượt blur | ✅ |
| Bàn phím & a11y | `←→↑↓` xoay/nghiêng, `+/-` zoom, **`Enter` chọn vùng đang quay mặt vào camera**, `R` reset; `aria-keyshortcuts`, `tabIndex`, `aria-busy` khi đang bay. Chip vùng vẫn là đường bàn phím đầy đủ | ✅ |
| Đồng bộ URL | `ExploreUrlFilters` là **nơi duy nhất** ghi URL: store → `/explore?region=…` bằng `router.replace`. (Bản đầu để cả globe lẫn island cùng ghi thì hai lệnh `replace` tranh nhau một history entry và một lệnh bị mất — đã sửa) | ✅ |
| Tiết kiệm pin | Tab bị ẩn → `frameloop="never"` (không vẽ gì); vòng quay tự động cũng dừng khi đang bay hoặc đang bị kéo | ✅ |
| Sửa kèm | `angularDistance` chuyển sang **haversine**: luật cosin cho ra "0.0000009°" cho một điểm *nằm ngay trên* anchor, còn haversine cho 0 — và đây đúng là khoảng cách nhỏ mà việc snap click cần | ✅ |

**Bằng chứng Mục 4** — `check-globe` (8 bài: round-trip toạ độ, camera đúng khoảng cách và đúng vùng, không bao giờ vượt cực, "nhìn vào vùng nào thì trả về vùng đó", giữa đại dương thì không chọn gì, xếp hạng pin theo lượt xem rồi tới độ phổ biến) + 2 bài mới trong `check-geo` (bậc độ sâu/ven bờ có chạy, và bậc rẻ tiền **không** chạy chúng).
Trong Chrome thật: deep link `/explore?region=Asia` → chip Asia đang bật; bấm chip Africa → URL thành `?region=Africa`; bấm Reset → vùng và URL cùng về mặc định; nút Map/Grid đổi nhãn; vùng chứa đủ `aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown + - Enter R"` và `tabIndex=0`.
*Chưa kiểm chứng được ở máy này*: chuyển động camera thật (bay tới vùng, phím mũi tên) vì Chrome headless ở đây không có WebGL — toán đã có test, phần nối scene nằm cùng chỗ với rig của ModelViewer đã kiểm chứng.

### Mục 5 — Âm thanh cho quiz "đoán qua tiếng kêu" (chờ asset)

| Việc | Chi tiết | Trạng thái |
| --- | --- | --- |
| `scripts/fetch-sounds.mjs` | Cùng khuôn với `fetch-models.mjs`: chỉ nhận CC0/CC-BY, ghi `data/sound-attribution.json`, từ chối licence không rõ | ⏸️ |
| Credit trên trang loài | Như credit model hiện có | ⏸️ |
| Dung lượng | ~24 file 10–30 s ≈ 2–6 MB, tải **theo yêu cầu** khi vào mode sound | ⏸️ |

Chặn bởi: cần quyết định có tải âm thanh có bản quyền phù hợp về hay không (xem *Việc còn lại*).

### Định nghĩa "xong" của Phase 8

5 mục chạy thật trên production build, **≥ 100 bài test**, JS trước `load` **≤ 160 kB**, 12/12 route đạt AA ở cả
hai theme, `check-bundle` xanh trong CI, và mỗi mục có số đo trước/sau ghi ngay trong bảng của nó.

---

## 🔊 Phase 9 — Âm thanh loài (pipeline tải + kiểm licence)

> **Đây chính là Mục 5 mà Phase 8 để ngỏ.** Phase 9 đã **chạy thật**: 6 loài có tiếng kêu CC0/CC-BY, đã
> upload lên bucket `animal-sounds`, ghi vào `sound_assets`, gắn vào `data/animals.ts` + `supabase/seed.sql`, và
> credit hiện trên trang loài. Mode quiz "đoán qua tiếng kêu" đã bật cho 6 loài đó.

**Yêu cầu**: tiếng kêu cho từng loài, có credit đầy đủ, chỉ dùng licence cho phép (CC0 / public domain / CC BY),
và mode quiz "đoán qua tiếng kêu" dùng chính kho âm thanh đó.

| Việc | Chi tiết | Trạng thái |
| --- | --- | --- |
| `lib/sound-licenses.ts` | Chính sách licence là **module thuần** chứ không nằm trong script: allowlist khớp đúng nhãn (`Creative Commons 0`, `Creative Commons Attribution`, `CC0`, `CC0 1.0`, `Public domain`, `CC BY 2.0/2.5/3.0/4.0`…), cộng regex cho mọi phiên bản CC BY chưa liệt kê. Denylist theo substring: **NC** (non-commercial — không hợp với trang có quảng cáo), **SA** (share-alike — sẽ ràng buộc cả site), **ND** (cấm sửa, mà pipeline có nén), `all rights reserved`/`©`, `sampling+`. **Từ chối được kiểm trước** regex dễ dãi, nên `CC BY-NC 4.0` không thể lọt qua thành CC BY thường. Nhãn rỗng → từ chối | ✅ |
| Cửa sổ kích thước & thời lượng | **12 kB – 900 kB**, 1–180 s. Đây là dải bản ghi thật: khảo sát Commons thấy từ 12 kB (tiếng chip 0.9 s) tới ~900 kB (bài cá voi lưng gù 93 s); file trên 1 MB trong cùng kết quả hầu hết là **bản ghi lời nói** (phát âm, sách nói) — vừa sai nội dung vừa nặng 2–6 MB. `sounds:report` in ra thứ bị cửa sổ này từ chối | ✅ |
| Kiểm tra **sau** khi tải | `looksLikeAudio()` soi magic bytes (OggS · RIFF…WAVE · fLaC · ID3 · MPEG frame sync · `ftyp`). Lý do: provider lỗi hoặc redirect sang trang HTML vẫn cho ra file **đúng kích thước** — file đó mà lọt thì sẽ được upload, gắn vào trang loài và phát ra im lặng | ✅ |
| `scripts/fetch-sounds.mjs` | Cùng khuôn với `fetch-models.mjs`. Hai provider: **freesound** (API v2, cần `FREESOUND_API_KEY`; thiếu thì **bỏ qua kèm hướng dẫn** chứ không scrape vòng), **wikimedia** (không cần key, chạy được trên clone mới). Cờ: `--report`, `--species=` (lặp được), `--all`, `--provider=auto\|freesound\|wikimedia`, `--min-bytes/--max-bytes/--max-seconds`, `--force`, và 3 cờ ghi: `--apply` (ghi `public/sounds/<slug>.<ext>` + `data/sound-attribution.json` → Demo Mode phát được **không cần key**), `--upload` (đẩy lên bucket `animal-sounds` + ghi `sound_assets`), `--wire` (trỏ `sound_url` trong `data/animals.ts`) | ✅ |
| Tên file an toàn | `soundFileName()` lấy **slug**, không lấy tên file của provider: `../../etc/passwd` → `etc-passwd.wav` | ✅ |
| Bảng `public.sound_assets` | Một bản ghi cho mỗi loài (`unique (animal_id)` — đúng thứ `animals.sound_url` biểu diễn được), `license` bị **CHECK** trong `('CC0','CC-BY')`, lưu `provider`, `license_label` (nhãn gốc, giữ nguyên để trích credit), `attribution` (credit render thẳng được), `file_size_bytes`, `duration_seconds`, `storage_path`, `public_url`; index theo `animal_id` và `created_at desc` | ✅ |
| RLS của `sound_assets` | `enable row level security` + **chỉ một policy SELECT** cho `anon, authenticated` với `using (true)` — credit là metadata công khai. **Không có write policy nào**, nên browser không thể tự chế một credit; dòng chỉ được ghi bằng service role từ script | ✅ |
| Bucket `animal-sounds` | Tách khỏi `animal-assets` vì khác ngân sách (6 MB so với 25 MB), khác câu chuyện licence và khác nguồn upload. Public read, whitelist MIME `audio/mpeg·ogg·wav·flac·mp4·webm` | ✅ |
| `SoundButton` trên trang loài | Play/pause, `preload="none"` (không tải gì cho tới khi bấm), `aria-live`. Khi `sound_url` là `null` thì nút **disabled kèm lý do hiện rõ** ("Call not recorded yet") chứ không im lặng không làm gì | ✅ |
| `check:sounds` | 11 bài: mọi nhánh licence, từ chối đứng trước cho phép, nhãn lẫn HTML, cửa sổ kích thước hai đầu, `NaN`/0, cửa sổ rộng tuỳ chỉnh, và tên file chống path traversal | ✅ |
| **Mode quiz "đoán qua tiếng kêu"** | Kind `call` trong `lib/quiz.ts` (cùng dạng 4 lựa chọn, prompt "Which animal makes this call?"), `CallPlayer` trong `QuizGame` với `preload="none"` — **không tải file nào cho tới khi khách bấm play**. Nút mở khi có ≥ 4 loài có bản ghi ("Sound round · 6 recorded species"); vòng thi dài bằng đúng số loài có tiếng kêu, và điểm/badge báo lên server với `mode: "sound"` | ✅ |
| **Tải asset thật** | `sounds:fetch -- --all --apply --wire --upload` đã chạy: **6 bản ghi**, 635 kB tổng (17 kB–249 kB), 5 CC0/public domain + 1 CC-BY | ✅ |
| Credit trên trang loài | Dòng "Call: <tên> by <tác giả> — <giấy phép> via <nguồn>" ngay dưới credit model; `lib/attribution.ts#getSoundAttribution` đọc `data/sound-attribution.json` lúc build | ✅ |
| Upload thật | 6/6 lên bucket `animal-sounds`; kiểm lại bằng HTTP: **200**, đúng `content-type` (`audio/ogg`/`audio/mpeg`) và đúng kích thước; 6 dòng trong `sound_assets`; `animals.sound_url` trỏ URL Storage | ✅ |

**Bằng chứng Phase 9** — `npm run check:suites`: **152 bài / 16 suite, 0 fail** (`check-sounds` nay 19 bài: thêm xếp hạng, validate sau khi tải, token giả, và **ràng buộc catalogue** — loài nào có `sound_url` thì phải có credit + file tồn tại + CC BY phải có tác giả).
Kết quả `npm run sounds:report` trên 24 loài (sau khi siết luật "file phải nêu tên loài"):

```
Licence policy: CC0 / public domain / CC BY. Size window: 12–900 kB, 1–180 s.

  ✓ bald-eagle       24 candidates, 19 refused → Yellowstone sound library - Bald Eagle - 003 (243 kB, Public domain)
  ✓ blue-whale       51 candidates, 25 refused → Blue whale atlantic2.ogg (17 kB, Public domain)
  ✓ gray-wolf        40 candidates, 31 refused → Rallying.ogg (158 kB, Public domain)
  ✓ lion             59 candidates, 57 refused → Lion raring-sound1TamilNadu178.ogg (76 kB, Public domain)
  ✓ toco-toucan      23 candidates, 17 refused → Toco Toucan call (Ramphastos toco).ogg (94 kB, CC BY 4.0)
  ✗ common-octopus    0 candidates,  0 refused
  ✗ gooty-tarantula   0 candidates,  0 refused
  ✗ green-anaconda    0 candidates,  0 refused

8/24 species have a usable recording in the current window.
Run 'npm run sounds:fetch -- --all --apply' to download them.
```

**6 loài đã có tiếng kêu** (635 kB tổng): bald-eagle, blue-whale, giant-panda, gray-wolf, lion, toco-toucan.
18 loài còn lại bị từ chối và **lý do được in ra từng loài**: phần lớn là CC BY-SA / CC BY-NC (đa số bản ghi thực địa
trên Commons dùng share-alike), số khác là file nói/phiên âm, file quá lớn (bản tin 4,9 MB, bài phát biểu 27 MB) hoặc
chưa có bản ghi nào (bạch tuộc, tarantula, anaconda, hải cẩu Weddell). Đó là pipeline **từ chối đúng**, không phải lỗi.

**Muốn tăng độ phủ**: dán `FREESOUND_API_KEY` **thật** vào `.env.local` rồi chạy `npm run sounds:fetch -- --all`.
Hiện `.env.local` có `FREESOUND_API_KEY` nhưng giá trị chỉ **3 ký tự** (placeholder) nên API trả 401; pipeline phát
hiện token < 20 ký tự, in một dòng *"looks like a placeholder"* rồi chuyển sang Wikimedia — nên không có 24 lần 401
trong log. Token thật lấy ở <https://freesound.org/apiv2/apply>.

**Hai quyết định lệch đặc tả ban đầu, đều đo được**:
1. **Cửa sổ kích thước 12 kB–900 kB thay vì 2–6 MB.** Khảo sát Commons trước khi viết code: bản ghi *động vật* thật
   nằm trong 12 kB–900 kB, còn file 2–6 MB trong cùng kết quả tìm kiếm hầu hết là **file nói/phiên âm/sách nói** dài
   2–8 phút. Giữ 2–6 MB sẽ loại gần hết tiếng kêu thật, nhận đúng file không mong muốn, và đẩy tổng lên 50–150 MB.
   (Bạn đã chọn hướng này ở câu hỏi trước khi tôi viết code.)
2. **Luật "file phải nêu tên loài" siết lại sau khi thử nới.** Bản nới (khớp cả danh từ chính: "panda", "penguin")
   đã chọn *Red panda* cho gấu trúc lớn, *Little Penguin* cho chim cánh cụt hoàng đế, và một bài hát tiếng Pháp
   "Ah les crocodile" cho cá sấu nước mặn — nên nó bị bỏ. Đánh đổi: một bản ghi tên "Wolf howl.ogg" bị từ chối vì
   không nêu "Gray Wolf"; thà thiếu tiếng kêu còn hơn sai loài.

*Chưa làm ở phase này*: `scripts/check-sql.mjs` mới chỉ kiểm cột `sound_url` trong danh sách cột, **chưa** kiểm
bảng `sound_assets` / bucket `animal-sounds`; và `data/sound-queries.json` mới có từ khoá cho 20 loài.

---

## 🧪 Phase 10 — Review toàn diện & Đề xuất cải tiến

**Mục tiêu**: rà soát toàn bộ PLAN.md bằng ba con mắt — Kiến trúc, Hiệu năng 3D, và Bảo mật Supabase —
rồi trả về một bản đề xuất thực chiến (production-ready), kèm SQL và code copy-paste được.

**Prompt để chạy Phase 10** (dán nguyên khối dưới đây vào phiên làm việc mới):

```markdown
Bạn là Senior Full-stack Architect + 3D Web Performance Expert + Supabase Security Specialist.

Hãy thực hiện **Review toàn diện + Đề xuất cải tiến** cho toàn bộ PLAN.md của dự án **Kami3D – 3D World Wildlife Encyclopedia**.

### Phạm vi Review (bắt buộc cover hết các hạng mục sau):

1. **Kiến trúc tổng thể (Architecture)**
   - Đánh giá cấu trúc thư mục, separation of concerns
   - Client vs Server Components strategy
   - Data fetching pattern (Server Actions vs API Routes vs RSC)
   - State management (có cần Zustand/Jotai không?)
   - Error boundary & loading strategy
   - Khả năng scale khi có hàng nghìn mô hình 3D + âm thanh

2. **Bảo mật Supabase – RLS (Row Level Security) – Ưu tiên cao**
   - Viết đầy đủ các policy RLS cần thiết cho 3 bảng chính:
     - `animals`
     - `user_favorites`
     - `quiz_scores`
     - `sound_assets` (nếu đã có từ Phase 9)
   - Phân tích rủi ro hiện tại (nếu chưa có RLS)
   - Đề xuất policy cho:
     - Public read animals
     - User chỉ được thao tác dữ liệu của chính mình
     - Admin role (nếu có)
   - Bảo vệ Supabase Storage (animal-sounds bucket)
   - Cách xử lý Clerk user_id an toàn trong RLS

3. **Tối ưu 3D Performance**
   - DRACO / Meshopt compression strategy
   - Texture compression (KTX2 / Basis)
   - Progressive loading & LODs
   - Memory management (dispose geometry/material)
   - Adaptive quality theo device (mobile vs desktop)
   - Preload strategy vs Lazy load
   - Giảm draw call, tối ưu lights & shadows
   - Cách tránh re-render không cần thiết trong R3F

4. **SEO & Metadata**
   - Dynamic metadata cho `/animal/[slug]`
   - Open Graph + Twitter Card với ảnh 3D preview
   - Structured Data (JSON-LD) cho loài động vật
   - Sitemap động
   - robots.txt + canonical
   - Cách generate OG image từ model 3D (nếu khả thi)

5. **Các vấn đề khác cần cải thiện**
   - Accessibility (a11y) cho 3D controls
   - Internationalization (i18n) sẵn sàng
   - Caching strategy (Next.js cache, Supabase cache, CDN)
   - Monitoring & Error tracking (Sentry…)
   - CI/CD và environment management
   - Cost optimization (Supabase Storage + Bandwidth)
   - Mobile touch controls cho 3D
   - Offline / PWA khả năng

### Output Format bắt buộc:

Hãy trả lời theo cấu trúc rõ ràng sau:

### 1. Tổng quan đánh giá
- Điểm mạnh hiện tại của PLAN
- Điểm yếu / Rủi ro lớn nhất

### 2. Đề xuất cải tiến Kiến trúc
(Liệt kê cụ thể + lý do)

### 3. RLS Policies hoàn chỉnh (SQL)
Viết sẵn toàn bộ SQL policy có thể copy-paste

### 4. Đề xuất tối ưu 3D chi tiết
(Kèm ví dụ code nếu cần)

### 5. Cải tiến SEO
(Kèm ví dụ code metadata, JSON-LD…)

### 6. Roadmap cải tiến theo thứ tự ưu tiên
P0 (làm ngay) → P1 → P2

### 7. Các thay đổi nên cập nhật vào PLAN.md
Liệt kê rõ những section nào trong PLAN.md nên sửa/thêm

Hãy review thật sâu, thẳng thắn và mang tính thực chiến (production-ready). Không viết chung chung.
```

**Đầu ra kỳ vọng**: báo cáo 7 phần theo đúng format trên, trong đó phần 3 phải là SQL chạy được ngay,
và phần 7 phải chỉ ra chính xác section nào của PLAN.md cần sửa/thêm.

**Đã chạy** → [docs/REVIEW.md](docs/REVIEW.md) (435 dòng, 7 phần đúng format). Kết quả gọn:

| Phần | Kết luận chính |
| --- | --- |
| 1. Tổng quan | 7 điểm mạnh **có số đo**, 8 rủi ro xếp theo mức thiệt hại (R1–R8) |
| 2. Kiến trúc | 7 đề xuất; quan trọng nhất là Clerk Third-Party Auth để RLS thành hàng rào thật, và tách `getAnimalSummaries` khỏi `getAllAnimals` |
| 3. RLS SQL | Hàm `current_user_id()` hợp nhất Supabase + Clerk, policy đầy đủ cho 4 bảng + `app_admins` + `is_admin()` + storage — copy-paste chạy được |
| 4. 3D | Vòng đời bộ nhớ là lỗ hổng thật (GLB không dispose), KTX2 là món nặng nhất còn lại, kèm đoạn code dispose |
| 5. SEO | 7 việc còn thiếu, xếp theo giá trị (ảnh OG đang 375–624 kB, thiếu images trong sitemap…) |
| 6. Roadmap | P0 (4 việc, ~5 giờ) → P1 (6 việc) → P2 (5 việc khi lên hàng nghìn loài) |
| 7. PLAN.md | 7 section cần sửa — **đã áp dụng ngay trong commit này** |

---

## ⚙️ Phase 11 — Hệ thống Settings hoàn chỉnh

> **Điều kiện tiên quyết (từ review Phase 10)**: hoàn thành **P0.1** trước — bật Clerk làm Third-Party Auth trong
> Supabase và áp `public.current_user_id()` (`docs/REVIEW.md` §3.1). Bảng `user_settings` là bảng người dùng thứ
> tư; nếu làm trước P0.1 thì nó lại phải ghi bằng service role và lặp lại đúng vấn đề R1. Policy của nó nên là
> `user_id = public.current_user_id()` cho cả bốn lệnh SELECT/INSERT/UPDATE/DELETE.

**Mục tiêu**: một trang `/settings` (Dark + Glassmorphism) cho người dùng đã đăng nhập tuỳ chỉnh 6 nhóm
preference — Appearance, 3D Performance, Audio, Language & Region, Notifications, Account — và **lưu vào
database** qua bảng mới `public.user_settings`.

**Prompt để triển khai Phase 11**:

````markdown
Hãy triển khai Phase 11 cho dự án Kami3D – Tạo hệ thống Settings hoàn chỉnh.

### 1. Mục tiêu
Tạo trang `/settings` với giao diện đẹp (Dark + Glassmorphism), cho phép người dùng đã đăng nhập tùy chỉnh các preference sau và lưu vào database.

### 2. Các nhóm Settings cần có

**A. Appearance**
- Theme: System / Dark / Light (mặc định Dark)
- Accent Color (Cyan / Emerald / Violet / Amber…)
- Glassmorphism intensity (Low / Medium / High)
- Reduce motion (tắt animation Framer Motion)

**B. 3D Performance**
- Quality preset: Low / Medium / High / Ultra
- Auto-detect device performance
- Enable / Disable shadows
- Enable / Disable environment reflections
- Max DPR (1 / 1.5 / 2)
- Auto-rotate models by default

**C. Audio**
- Master volume (0–100)
- Animal sound volume
- UI sound effects on/off
- Auto-play animal sounds when opening detail page

**D. Language & Region**
- Interface language (Tiếng Việt / English) – chuẩn bị sẵn i18n
- Measurement unit (Metric / Imperial) – dùng cho Size Comparison

**E. Notifications**
- Email notifications (new animals, quiz results…)
- Browser push notifications (nếu có)

**F. Account**
- Hiển thị thông tin Clerk (avatar, email, name)
- Nút quản lý tài khoản Clerk
- Nút xóa dữ liệu cá nhân (favorites + quiz scores)

### 3. Database
Tạo bảng mới `user_settings`:

```sql
create table user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,           -- Clerk user.id
  theme text default 'dark',
  accent_color text default 'cyan',
  glass_intensity text default 'medium',
  reduce_motion boolean default false,
  quality_preset text default 'medium',
  enable_shadows boolean default true,
  enable_reflections boolean default true,
  max_dpr numeric default 1.5,
  auto_rotate boolean default true,
  master_volume integer default 80,
  animal_volume integer default 70,
  ui_sounds boolean default true,
  autoplay_sounds boolean default false,
  language text default 'vi',
  measurement_unit text default 'metric',
  email_notifications boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```
````

**Ràng buộc kỹ thuật phải giữ khi làm** (rút từ chính schema đang chạy, không phải đề xuất mới):

1. **RLS là bắt buộc, và theo đúng khuôn `user_favorites`.** SQL ở trên chưa có RLS. `user_id` ở đây là
   **Clerk id dạng text**, nên policy phải là owner-only `to authenticated` với `using (user_id = ((select auth.uid())::text))`
   cho `select / insert / update / delete` — copy nguyên cách [schema.sql](file:///Users/macbookpro2015/Kami/Kami3D/supabase/schema.sql#L189-L205) đang làm. Update **phải có cả `WITH CHECK`**, nếu không người dùng
   có thể sửa `user_id` của dòng sang người khác.
2. **`updated_at` không tự chạy.** Trigger `public.set_updated_at()` đã tồn tại ([schema.sql](file:///Users/macbookpro2015/Kami/Kami3D/supabase/schema.sql#L117)) — gắn trigger đó vào bảng mới, đừng viết lại.
3. **CHECK constraint cho mọi cột enum/range** (đúng convention Phase 1 đã dùng): `theme in ('system','dark','light')`,
   `accent_color in (…)`, `glass_intensity in ('low','medium','high')`, `quality_preset in ('low','medium','high','ultra')`,
   `max_dpr in (1, 1.5, 2)`, `master_volume`/`animal_volume` trong `0–100`, `language in ('vi','en')`,
   `measurement_unit in ('metric','imperial')`. Không có CHECK thì một client lỗi ghi `master_volume = 5000` là im lặng.
4. **`check-sql.mjs` phải phủ bảng mới** — hiện nó chỉ kiểm `animals` / `user_favorites` / `quiz_scores`.
5. **Nút xoá dữ liệu cá nhân** phải xoá favourites + quiz scores (+ chính settings) **bằng quyền của người dùng**
   qua RLS, không được gọi service role từ browser.
6. **Notifications mới chỉ lưu preference**: chưa có hạ tầng email/push, nên phase này chỉ ghi cờ vào DB và
   nói rõ trong UI rằng chưa gửi gì — không được để công tắc trông như đang hoạt động.
7. **Các setting phải có tác dụng thật**, không chỉ nằm trong DB: theme/accent/glass/reduce-motion nối vào
   `next-themes` + token trong `app/globals.css`; quality/shadows/reflections/max-DPR/auto-rotate nối vào
   `lib/quality.ts` + `components/3d/useQuality.ts`; measurement unit nối vào `lib/size-comparison.ts`;
   volume nối vào `SoundButton`. Một cột không ai đọc là một cột gây hiểu nhầm.
8. **"Reduce motion" không được kéo Framer Motion trở lại.** Dự án đã bỏ hẳn thư viện animation — mọi chuyển
   động là CSS trong [globals.css](file:///Users/macbookpro2015/Kami/Kami3D/app/globals.css), và `check:bundle` **chặn** nếu
   `framer-motion` quay lại first paint. Nên công tắc này phải tác động lên CSS (media query / class trên `<html>`),
   song song với `prefers-reduced-motion` của hệ điều hành.

---

## ✅ Phase 11 — Kết quả: hệ thống Settings hoàn chỉnh

**Trạng thái: đã giao.** Trang `/settings`, bảng `user_settings` (đã áp lên project thật), 6 nhóm preference, và
**mọi cột đều có tác dụng thật** — không có cột nào chỉ nằm trong database (ràng buộc #7 của phase).

### 1. Database

| Việc | Chi tiết |
| --- | --- |
| Migration | `user_settings` và `user_settings_accent_default`, đã áp lên project `ztihljcpeylprcgblnpv` |
| Hàm dùng chung | `public.current_user_id()` = `coalesce(auth.uid()::text, jwt ->> 'sub')` — từ nay bảng per-user mới chỉ cần gọi hàm này thay vì lặp lại `auth.uid()` |
| RLS | owner-only cho **cả 4 lệnh** `select / insert / update / delete`; `update` có **cả** `USING` và `WITH CHECK` (thiếu `WITH CHECK` là người dùng sửa được `user_id` sang người khác) |
| Ràng buộc | CHECK cho mọi enum và range: `theme`, `accent_color`, `glass_intensity`, `quality_preset`, `max_dpr`, `master_volume`/`animal_volume` 0–100, `language`, `measurement_unit` |
| Trigger | dùng lại `public.set_updated_at()`, không viết trigger mới |
| Quyền | `revoke all … from anon`; `grant select, insert, update, delete … to authenticated` |

`supabase/schema.sql` đã được cập nhật đúng bằng migration đang chạy, và `scripts/check-sql.mjs` nay phủ luôn
bảng mới (+10 test): mọi cột `not null` và có default, **default của schema bằng default của app**, **CHECK của
từng enum bằng đúng danh sách option của app**, `max_dpr`/volume bằng đúng biên mà app clamp, và policy owner-only
của cả 4 lệnh. Đây là loại lệch mà nếu không có test thì sẽ lộ ra thành "UI cho chọn một giá trị mà database từ chối".

### 2. Những file đã thêm

| File | Vai trò |
| --- | --- |
| `lib/user-settings.ts` | Mô hình thuần: kiểu, default, danh sách option, `coerceUserSettings` (sửa giá trị hỏng thay vì ném lỗi), `patchToRow`, `volumeGain`, `settingsAttributes` |
| `lib/settings-store.ts` | Đọc/ghi/xoá dòng của chính người dùng qua `lib/personal-data.ts` (Supabase Auth → RLS; Clerk → service role + lọc `user_id`), và hàm xoá dữ liệu cá nhân |
| `app/api/settings/route.ts` | `GET` (kể cả khách chưa đăng nhập), `POST` patch từng phần, `DELETE` xoá dữ liệu cá nhân |
| `components/settings/SettingsProvider.tsx` | Nguồn sự thật phía client: đọc `localStorage` trước, chỉ hỏi server khi cookie phiên nói có phiên; ghi lạc quan + ghi lại vào `localStorage` |
| `components/settings/SettingsScreen.tsx` + `Controls.tsx` | 6 nhóm A–F; mọi control là form control thật (`input type=radio`, `button role=switch`, `input type=range`) |
| `app/settings/page.tsx` | Trang duy nhất render theo từng người dùng (đọc phiên ở server để thẻ Account đúng ngay từ first paint) |
| `lib/i18n.ts` | Dictionary `en`/`vi` + `translate()` — lớp i18n đầu tiên (R7) |
| `lib/ui-sound.ts` | Tiếng đúng/sai của quiz, tổng hợp bằng Web Audio (không tải file nào) |
| `components/animal/Measurement.tsx` | Lá client in số đo theo đơn vị người dùng chọn, để `InfoPanel` vẫn là server component |
| `scripts/check-settings.mjs` | 18 test mới (`npm run check:settings`) |

### 3. Sáu nhóm, và tác dụng thật của từng nhóm

| Nhóm | Cột | Nối vào đâu |
| --- | --- | --- |
| A. Appearance | `theme`, `accent_color`, `glass_intensity`, `reduce_motion` | `next-themes` + block "visitor's own preferences" trong `app/globals.css`: `html[data-accent]` đổi `--color-neon` (5 màu, có bản riêng cho light theme), `html[data-glass]` đổi blur/alpha của `.glass`, `html[data-motion=reduced]` tắt animation/transition |
| B. 3D Performance | `quality_preset`, `enable_shadows`, `enable_reflections`, `max_dpr`, `auto_rotate` | `lib/quality.ts` (`applyQualityOverrides` + tier mới `ultra`) → `components/3d/useQuality.ts` → `CanvasShell` (dpr, shadows), `ModelScene` (sàn gương `MeshReflectorMaterial`, `autoRotate`), `AnimalPreview` |
| C. Audio | `master_volume`, `animal_volume`, `ui_sounds`, `autoplay_sounds` | `volumeGain()` nhân master × kênh, áp vào `SoundButton` và `CallPlayer` của quiz; `uiSounds` bật tiếng đúng/sai trong quiz; `autoplaySounds` tự phát khi mở trang loài (và báo đúng khi trình duyệt chặn) |
| D. Language & Region | `language`, `measurement_unit` | `document.documentElement.lang` + dictionary của bảng này; đơn vị đo chảy vào `SizeComparison` (toggle trong chart nay ghi thẳng vào setting), `InfoPanel`, `AnimalCard`, `PremiumTeaser`, `formatWeight` (thêm pound/short ton) |
| E. Notifications | `email_notifications`, `push_notifications` | Chỉ lưu cờ, **và UI nói rõ chưa gửi gì** (ràng buộc #6) |
| F. Account | — | Thông tin người đăng nhập + nút xoá dữ liệu cá nhân (favourites + quiz scores + settings) bằng quyền của chính người dùng |

### 4. Khác biệt so với prompt (có lý do)

1. **`accent_color` mặc định `emerald`, không phải `cyan`.** `emerald` chính là màu mint `#35f0c0` mà sản phẩm
   đang dùng (`--color-neon`), nên một dòng chưa ai sửa vẫn trông y như trước; để `cyan` là tự ý đổi màu mọi bề
   mặt nhấn cho người chưa từng mở `/settings`. Cả schema lẫn app đều dùng `emerald`, và `check-sql.mjs` giữ hai
   bên khớp nhau.
2. **`quality_preset` mặc định `auto` và có thêm giá trị `auto`.** Đây là giá trị duy nhất giữ cho `lib/quality.ts`
   tiếp tục đo thiết bị — tức là hành vi đang chạy. Chọn một preset cố định nghĩa là người dùng tự quyết định
   thay vì app đoán. Tier `ultra` chỉ đến từ lựa chọn của người dùng, không bao giờ từ phép đo (có test).
3. **`/settings` có "System", menu nhanh trên navbar thì không.** Menu nhanh giữ đúng hai lựa chọn Sáng/Tối như
   bạn đã yêu cầu; ba lựa chọn nằm ở trang đầy đủ, nơi có chỗ để giải thích.
4. **Ngôn ngữ hiện phủ bảng Settings**, chưa phủ nội dung loài — và UI nói thẳng điều đó (`page.scope`) thay vì
   để nửa bản dịch trông như lỗi.

### 5. Bằng chứng

- `npm run check:suites`: **189 test** (thêm 18 của `check-settings`, 6 của `check-quality`, 10 của `check-sql`), và
  `npx tsc --noEmit` sạch.
- `npm run build` + `npm run check:bundle`: mọi route trong ngân sách, `three`/Clerk vẫn chỉ tải sau khi trang dùng được;
  SettingsProvider thêm ~3–5 kB vào JS khởi đầu mỗi route (bảng số liệu ở đầu tài liệu).
- **`npm run audit:settings` (mới)**: mở `/settings` bằng Chrome thật và đo — 19/19 đạt. Nó chứng minh bằng số đo
  chứ không bằng lời: đổi accent thì `--color-neon` và màu chữ của `.text-neon` đổi theo (`#35f0c0` → `#a97bff`,
  và `#6a4ad4` khi ở light theme); glass `low` làm blur của panel thành 6px; reduce-motion làm `animation-duration`
  của một phần tử có animation thành ≤ 0.001s; theme thì đổi class trên `<html>`; và cả bốn lựa chọn còn nguyên sau
  khi tải lại, đồng thời áp cho cả route khác. Audit còn bắt được một lỗi thật: người dùng cũ (đã chọn theme trước
  Phase 11, tức chỉ có key `kami-theme`) từng bị ghi đè về dark — nay được migrate đúng, và có test cho đúng ca đó.
- `npm run audit:theme` trên 10 cặp route × theme (thêm `/settings`): đạt hết — không có chữ nào dưới WCAG AA và
  không có panel tối nào sót lại ở light mode.
- `npm run audit:perf` (local, Chrome không throttle): `/explore` TTFB 1.7s, FCP 2.2s, CLS 0, JS trước `load` 156.6 kB.
  CLS bằng 0 là điểm đáng nói: các thuộc tính `data-*` được ghi **sau** hydration nên không gây nhảy layout.
- Database: `user_settings` tồn tại, 0 dòng, RLS bật, 4 policy, 1 trigger; advisors **0 phát hiện security**.
- Việc còn lại của phase này: **P0.1 (Clerk ↔ Supabase Third-Party Auth)** vẫn đang mở, nên khi chạy Clerk thì
  phần ghi `user_settings` đi qua service role kèm lọc `user_id` — đúng bằng đường đi hiện tại của
  `user_favorites`/`quiz_scores` (rủi ro R1 trong [docs/REVIEW.md](docs/REVIEW.md)). RLS đã sẵn sàng cho ngày
  bật P0.1, không phải sửa lại.

---

## 🦁 Phase 12 — Admin tự động tìm & tải model 3D thật

> **Bước 0 (từ review Phase 10)**: tạo bảng `public.app_admins` + hàm `public.is_admin()` và policy cho admin sửa
> `animals` / upload storage — SQL sẵn ở `docs/REVIEW.md` §3.6–3.7. Không có vai trò admin ở tầng dữ liệu thì
> không thể mở CMS một cách an toàn.

> ⚠️ **Đọc trước khi làm: phần lớn phase này đã có sẵn.** [fetch-models.mjs](file:///Users/macbookpro2015/Kami/Kami3D/scripts/fetch-models.mjs) đã là
> pipeline tải model thật (Sketchfab + Smithsonian + Poly Pizza + danh sách tự khai), có kiểm licence và ghi
> credit. Phase 12 vì thế là **mở rộng**, không phải viết mới — bảng đối chiếu ở dưới nói rõ chỗ nào còn trống.

**Mục tiêu**: cho Admin nhập **tên loài** (hoặc **số model muốn thêm cho loài đó**) và hệ thống tự tìm → lọc
licence → chọn model chất lượng → tải `.glb` → (tuỳ chọn) nén DRACO → upload Storage → cập nhật
`animals.model_url` và ghi metadata vào bảng mới `public.model_assets`. **Không dùng model demo/placeholder.**

**Đối chiếu với những gì đang chạy** (`npm run models:report` / `models:fetch`):

| Bước trong yêu cầu | Hiện trạng | Việc của Phase 12 |
| --- | --- | --- |
| 1. Tìm kiếm model | ✅ Đã có. Provider: **sketchfab** (API v3, `SKETCHFAB_API_TOKEN`, chỉ nhận model mà tác giả **đã bật download**), **smithsonian** (`SI_API_KEY`), **polypizza** (`POLY_PIZZA_API_KEY`), **direct** (`data/model-sources.json`, không cần key). Thiếu key thì bỏ qua kèm hướng dẫn, **không scrape vòng** | Thêm **MorphoSource** nếu muốn; thêm `--count=N` (số model mỗi loài) |
| 2. Chỉ CC0 / CC-BY | ✅ Đã có, và mạnh hơn yêu cầu: allow-list CC0 / public domain / CC BY, từ chối **SA / ND / NC / all-rights-reserved**, mỗi model nhận được đều ghi tác giả + nguồn + licence vào `data/model-attribution.json`, và trang loài **render credit đó** | Giữ nguyên — đây là ràng buộc cứng của dự án |
| 3. Lọc chất lượng (downloads, like, polygon, thumbnail) | ❌ **Chưa có**. Hiện chỉ lọc theo licence | **Việc chính của phase**: lấy `downloadCount` / `likeCount` / `faceCount` / thumbnail từ Sketchfab, tính `quality_score`, rồi xếp hạng thay vì lấy kết quả đầu tiên |
| 4. Tải `.glb` | ✅ Đã có → `public/models/<slug>.glb` | Giữ |
| 5. Nén DRACO (tuỳ chọn) | ❌ **Chưa tự động**. README để bước nén là *việc làm tay* (bước 1 của "Adding real 3D models"); repo không có `gltf-transform`. 24 model hiện tại đã nén 61 MB → 10 MB nhưng **ngoài** pipeline | Thêm bước nén (khuyến nghị `@gltf-transform/cli`, chạy như devDependency, không vào bundle) |
| 6. Upload Supabase Storage | ❌ **Chưa có** trong `fetch-models.mjs` — nó không có cờ `--upload` (trong khi `fetch-sounds.mjs` đã có). Model hiện được **commit vào `public/models/`** | Thêm `--upload`, theo đúng khuôn `fetch-sounds.mjs` |
| 7. `model_url` + bảng `model_assets` | 🟡 `--wire` đã sửa `data/animals.ts`; bảng `model_assets` **chưa tồn tại** | Tạo bảng + ghi metadata |

**Prompt để triển khai Phase 12**:

````markdown
Hãy triển khai Phase 12 cho dự án Kami3D – Hệ thống Admin tự động tìm & tải model 3D thật của động vật.

### 1. Yêu cầu cốt lõi
Tạo một pipeline hoàn chỉnh để Admin có thể:

- Nhập **tên loài** (ví dụ: "Bengal Tiger", "African Elephant", "Blue Whale")
- Hoặc nhập **số lượng model** muốn thêm cho một loài
- Hệ thống tự động:
  1. Tìm kiếm model 3D thật trên Sketchfab (ưu tiên) + nguồn phụ
  2. Chỉ lấy model có giấy phép **CC0** hoặc **CC-BY**
  3. Lọc chất lượng: ưu tiên model có nhiều lượt tải, like cao, số polygon hợp lý, thumbnail rõ
  4. Tải file .glb về
  5. (Tùy chọn) Nén DRACO / tối ưu
  6. Upload lên Supabase Storage (bucket `animal-models`)
  7. Cập nhật `animals.model_url` + lưu metadata vào bảng `model_assets`

Không dùng model demo / placeholder. Chỉ dùng model thật có sẵn công khai.

### 2. Nguồn dữ liệu ưu tiên
- **Chính:** Sketchfab API (`https://sketchfab.com/developers/oauth`)
  - Có thể filter theo license (CC0, CC-BY)
  - Có thông tin downloads, likeCount, faceCount, thumbnail
- **Phụ (fallback):**
  - Smithsonian 3D Open Access
  - MorphoSource (nếu phù hợp)
  - Các nguồn CC0 khác nếu cần

### 3. Database cần bổ sung

```sql
create table model_assets (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid references animals(id) on delete cascade,
  sketchfab_uid text,
  title text,
  license text check (license in ('CC0', 'CC-BY')),
  source_url text,
  attribution text,
  face_count integer,
  download_count integer,
  like_count integer,
  file_size_bytes bigint,
  storage_path text,
  public_url text,
  quality_score numeric,               -- điểm chất lượng tự tính
  is_primary boolean default false,    -- model chính của loài
  downloaded_at timestamptz default now(),
  created_at timestamptz default now()
);
```
````

**Ràng buộc kỹ thuật phải giữ khi làm** (rút từ schema và các pipeline đang chạy):

1. **Bucket: chốt một chỗ.** Dự án đang dùng **`animal-assets`** (public, 25 MB, whitelist MIME đã gồm
   `model/gltf-binary`), [lib/supabase.ts](file:///Users/macbookpro2015/Kami/Kami3D/lib/supabase.ts#L39-L40) export `ASSET_BUCKET = "animal-assets"`, và
   [docs/ASSETS.md](file:///Users/macbookpro2015/Kami/Kami3D/docs/ASSETS.md) ghi model nằm ở đó. Yêu cầu nói bucket `animal-models` — hoặc **dùng lại
   `animal-assets`** (khuyến nghị: một chỗ chứa, docs không lệch), hoặc tạo bucket mới thì phải sửa
   `ASSET_BUCKET`, `docs/ASSETS.md`, `schema.sql` và policy storage cùng lúc. **Không làm cả hai.**
2. **RLS bắt buộc, giống `sound_assets`.** `model_assets` là metadata công khai: `enable row level security` +
   **một** policy `SELECT to anon, authenticated using (true)` + `grant select`. **Không có write policy** —
   browser không được tự chế một credit; dòng chỉ ghi bằng service role từ script.
3. **`is_primary` phải có partial unique index**: `create unique index … on model_assets (animal_id) where is_primary;`
   Không có nó thì hai dòng cùng loài đều là primary, trong khi `animals.model_url` chỉ biểu diễn được **một**
   (đúng lý do bảng `sound_assets` có `unique (animal_id)`).
4. **CHECK cho mọi cột số**: `license in ('CC0','CC-BY')` khớp đúng hai giá trị pipeline chấp nhận;
   `face_count`, `download_count`, `like_count`, `file_size_bytes` **không âm**. Chốt thang của `quality_score`
   (0–100 hay 0–1) và ghi vào comment cột, nếu không mỗi người đọc hiểu một kiểu.
5. **`check-sql.mjs` phải phủ bảng mới** — hiện chỉ kiểm `animals` / `user_favorites` / `quiz_scores`.
6. **CLI trước, UI admin sau.** Mọi pipeline của dự án (model, âm thanh, seed) đều là CLI có test
   (`--report` dry run, `--apply`, `--wire`). Nếu làm UI admin thì cần thêm khái niệm **admin role** mà schema
   **chưa có** — đó là việc riêng, không nên trộn vào phase này.
7. **Không có model demo/placeholder** — khớp luật "licence là ràng buộc cứng": thà loài đó dùng rig procedural
   còn hơn gắn một model không rõ nguồn gốc.
8. **Nén DRACO phải chạy ngoài bundle.** `@gltf-transform/cli` là **devDependency**, chỉ gọi từ script Node —
   `check:bundle` sẽ chặn nếu three.js/gltf kéo vào first paint.

---

## ✅ Phase 12 — Kết quả: Admin tự động tìm & tải model 3D thật

**Trạng thái: đã giao phần code + test.** Phase này **mở rộng** pipeline đang chạy (`scripts/fetch-models.mjs`),
đúng như bảng đối chiếu ở trên: tìm kiếm và kiểm licence đã có sẵn, còn thiếu **lọc chất lượng**, **nén DRACO**,
**upload Storage** và **bảng `model_assets`**.

### 1. Việc chính: xếp hạng theo chất lượng, không lấy kết quả đầu tiên

`lib/model-quality.ts` (thuần, có test) cho điểm mỗi candidate 0–100:

| Tín hiệu | Trọng số | Ghi chú |
| --- | --- | --- |
| Khớp tên | 30 | đúng tên loài / tên khoa học > chứa tên > chứa ngược |
| Licence | 15 | CC0/Public Domain 15, CC BY 8.25 |
| Độ phổ biến | 25 | download (60%) + like (40%), thang log, có trần |
| Polygon | 20 | so với ngân sách mobile; **không biết faceCount = trung tính**, không phải 0 |
| Thumbnail | 10 | có ảnh xem trước rõ ràng |

Tổng được lưu nguyên vào `model_assets.quality_score` (CHECK 0–100, có comment ghi rõ thang). Báo cáo in cả
phần điểm, nên một thứ hạng có thể bị phản biện chứ không phải chỉ để tin:

```
🦁 Lion (lion)
   ✔     75  excellent CC-BY-4.0 Lion                                       sketchfab
        ↳ title 30 · licence 8.3 · popularity 6.7 · complexity 20 · thumbnail 10 · 42,710 faces
   ✔   74.8  good      CC-BY-4.0 Lion                                       sketchfab
        ↳ title 30 · licence 8.3 · popularity 6.5 · complexity 20 · thumbnail 10 · 5,497 faces
```

Đây là dữ liệu thật từ API công khai của Sketchfab (search không cần key), chạy ngay trong lúc làm phase.
Một model bị từ chối licence **không bao giờ** thắng, dù điểm cao — có test riêng cho đúng ca đó.

### 2. Các cờ mới của pipeline

| Cờ | Việc |
| --- | --- |
| `--count=N` | giữ tối đa N model mỗi loài: model đầu là **primary** (`<slug>.glb`), các model sau là `<slug>-alt2.glb`… |
| `--compress` | chạy DRACO qua `@gltf-transform/cli` (**devDependency** — `check:bundle` chặn nếu toolchain lọt vào bundle) |
| `--upload` | upload lên bucket `animal-assets` (một bucket duy nhất của dự án), ghi `model_assets`, và trỏ `animals.model_url` cho model primary |
| `--report` | nay in điểm chất lượng + face count + download, và đếm **toàn bộ** candidate (trước đây chỉ đếm 3 dòng in ra) |

`--upload` khi file đã có sẵn trong repo là chế độ **chỉ-upload**: 24 model đang commit được đưa lên Storage và ghi
dòng mà không cần tải lại. Model có licence không hợp lệ bị chặn ngay ở bước ghi — "không credit được thì không lưu".

### 3. Database: `public.model_assets`

- Cột theo đúng yêu cầu + `provider`, `attribution`, `public_url`, `quality_score` (0–100), `is_primary`.
- `license in ('CC0', 'CC-BY')` — đúng hai giá trị mà `lib/model-quality.ts` có thể sinh ra (có test đối chiếu).
- `face_count` / `download_count` / `like_count` / `file_size_bytes` đều có CHECK không âm (`bigint` cho file size).
- `unique (animal_id, source_url)`: chạy lại pipeline là **update**, không nhân bản dòng.
- **Partial unique index** `(animal_id) where is_primary`: `animals.model_url` chỉ biểu diễn được một model chính.
- RLS bật, **một** policy `SELECT to anon, authenticated using (true)` + `grant select`; **không có write policy** —
  browser không thể tự chế một credit. `check-sql.mjs` phủ bảng mới (+7 test), gồm cả test "mọi cột mà script ghi
  đều phải được script nhắc tên" để một lần đổi tên không lọt qua.

**Đã áp lên database đang chạy** bằng PAT mới (`npm run db:schema`). Kiểm chứng bằng truy vấn trực tiếp:

| Kiểm | Kết quả |
| --- | --- |
| Cột | 18 cột, `quality_score`/`license`/`title`/`attribution` NOT NULL, `file_size_bytes` là `bigint` |
| Ràng buộc | `license = ANY(CC0, CC-BY)`, mọi count `>= 0`, `file_size_bytes > 0`, `quality_score` 0–100, `unique (animal_id, source_url)`, FK `on delete cascade` |
| Index | `model_assets_primary_idx` là **partial unique** `(animal_id) where is_primary` |
| RLS | bật, **1** policy `SELECT` cho `anon, authenticated`, không có policy ghi |
| Quyền | `anon`/`authenticated` chỉ còn **SELECT**; `service_role` giữ toàn quyền |

> Ghi chú: Supabase cấp sẵn **toàn bộ** quyền trên mỗi bảng mới trong `public` cho `anon`/`authenticated`, nên
> `grant select` một mình là chưa đủ — schema nay đi kèm `revoke all … from anon, authenticated` trước khi cấp
> lại SELECT, và `check-sql.mjs` bắt buộc phải có dòng revoke đó. `animals` và `sound_assets` vẫn còn quyền mặc
> định của nền tảng (RLS mới là thứ chặn ghi) — đã ghi vào phần việc còn lại.

### 4. Bằng chứng

- `npm run check:suites`: **211 test** — thêm 15 của `check-models` và 7 của `check-sql`; `npx tsc --noEmit` sạch.
- Báo cáo thật từ Sketchfab cho `lion`: 24 candidate → **16 hợp lệ, 8 bị từ chối vì licence**, thứ hạng 75 / 74.8 /
  70.4 với đầy đủ phần điểm.
- `--count=2` chọn đúng hai model điểm cao nhất (75 và 74.8) rồi dừng.
- DRACO: `gltf-transform draco` chạy thật trên `public/models/lion.glb` → **341.08 KB → 341.23 KB**, tức là
  **to hơn**. Script phát hiện và giữ file gốc ("no gain") — nếu không có ngưỡng đó thì phase này đã commit một
  bản regression cho cả 24 file.
- **24/24 model đã lên Storage** (`animal-assets/models/<slug>.glb`, tổng 10.0 MB) và **24/24 tải lại đúng từng
  byte** với `content-type: model/gltf-binary`; `animals.model_url` của cả 24 loài trỏ vào Storage.
- **`--refresh-quality` (mới)**: đọc lại `faceCount`/`downloadCount`/`likeCount`/thumbnail theo uid Sketchfab cho
  các model tải từ trước phase này rồi tính lại điểm — **60.1–93.3, trung bình 82.4**, 24/24 dòng có đủ số đo
  (trước đó tất cả chỉ 32.3–50.3 vì manifest cũ không có dữ liệu phổ biến). Ví dụ: `african-bush-elephant`
  1531 download / 71 like / 4 806 tam giác → 90.4.
- Đã kiểm `model_assets`: 24 dòng, 24 primary, 24 loài, 100% licence hợp lệ, 0 dòng thiếu credit.

### 5. Còn lại

1. **Áp `model_assets`** — ✅ đã xong bằng token mới (`db:schema` → `models:fetch --all --upload` →
   `--refresh-quality --upload`).
2. **UI admin**: PLAN ghi rõ "CLI trước, UI admin sau" — cần vai trò admin ở tầng dữ liệu (`app_admins` +
   `is_admin()`, SQL ở [docs/REVIEW.md](docs/REVIEW.md) §3.6), nên nó là việc của phase riêng, không trộn vào đây.
3. `--count=N` hiện chỉ tải thêm model phụ cho loài; hiển thị chúng (bộ chọn model thay thế trong viewer) là việc UI.
4. `animals` và `sound_assets` vẫn mang quyền mặc định của Supabase cho `anon`/`authenticated` (RLS mới là thứ
   chặn ghi). Thu hẹp chúng về đúng `SELECT` như `model_assets` là việc nhỏ nhưng nên làm ở một lần riêng, có
   kiểm lại đường ghi của app.

---

## 🗺️ Phases 13–17 — Chương trình Data-to-Map

> Chương trình này lần đầu đưa **bản đồ thật** vào Kami3D: PostGIS + MapLibre/Mapbox + Deck.gl + Turf.
> Nó khác mọi phase trước ở một điểm: **lần đầu dự án phải tải thư viện nặng** (MapLibre ~250 kB gzip,
> deck.gl vài trăm kB), trong khi trần First Load JS của **mọi** route hiện tại là **165 kB**
> ([bundle-budget.mjs](file:///Users/macbookpro2015/Kami/Kami3D/scripts/bundle-budget.mjs#L44-L59)).
> Vì vậy 7 ràng buộc chung dưới đây phải đọc **trước** khi làm bất kỳ phase nào trong nhóm.

**Thứ tự phụ thuộc**: 13 (nền tảng) → 14 → 15 → 16 → 17. Phase 14–17 đều cần schema + BaseMap của 13;
15 và 16 dùng chung cột `year` của 13. Mỗi phase phải tự đứng được (không bắt phase sau mới chạy).

### Ràng buộc chung cho cả 5 phase

1. **Trần bundle phải được khai báo, không được lách.** Thêm route vào `ROUTES` trong
   [bundle-budget.mjs](file:///Users/macbookpro2015/Kami/Kami3D/scripts/bundle-budget.mjs#L44-L51) với budget riêng cho `/map` (đặt số thật, đo sau lần build đầu)
   **và** thêm marker của thư viện bản đồ vào danh sách `FORBIDDEN` để nó không rò sang `/`, `/explore`,
   `/animal/[slug]`. BaseMap **chỉ** được nạp qua `dynamic(..., { ssr: false })` sau khi vào viewport —
   đúng khuôn [LazyGlobe.tsx](file:///Users/macbookpro2015/Kami/Kami3D/components/3d/LazyGlobe.tsx#L38-L54) đang dùng cho three.js.
2. **Base map phải không cần key.** Dự án chạy được trên clone mới không có biến môi trường nào (Demo Mode).
   Mapbox GL cần access token → vi phạm. Nên chọn **MapLibre + style keyless** (OpenFreeMap / Protomaps self-host),
   và cho ghi đè bằng `NEXT_PUBLIC_MAP_STYLE_URL` theo đúng khuôn `NEXT_PUBLIC_DRACO_DECODER_PATH` trong
   [README.md](file:///Users/macbookpro2015/Kami/Kami3D/README.md#L79-L94).
3. **Licence dữ liệu địa lý là ràng buộc cứng, giống licence model và âm thanh.** GBIF: phần lớn dataset là
   **CC BY 4.0 / CC0 nhưng bắt buộc cite DOI** của lượt tải; IUCN Red List: cần token và Terms of Use
   **hạn chế dùng thương mại**. Nghĩa là IUCN range map có thể không dùng được cho site này — phải kiểm và ghi
   `license` + `attribution` vào bảng từ đầu, rồi render credit như `data/model-attribution.json` đang làm,
   **không** tải ào ạt rồi tính sau (bài học từ Phase 9: 57/59 ứng viên bị từ chối).
4. **Demo Mode vẫn phải có bản đồ để xem.** Dữ liệu GeoJSON mẫu nằm trong `data/` và được mirror sang PostGIS,
   đúng cách `data/animals.ts` đang là nguồn chuẩn còn Supabase chỉ là bản sao. Nếu để `/map` phụ thuộc 100%
   vào Supabase thì clone mới mở ra là trang trắng.
5. **Không kéo Framer Motion trở lại.** Phase 16 ghi "timeline mượt (Framer Motion)" — nhưng thư mục này đã bỏ
   hẳn thư viện đó và `check:bundle` **chặn** nếu nó xuất hiện trong first paint (marker `framer-motion`).
   TimelineSlider và animation migration phải làm bằng CSS + `requestAnimationFrame`.
6. **Một WebGL context tại một thời điểm.** three.js (R3F) và deck.gl đều tạo context; trình duyệt giới hạn số
   context và sẽ **mất context cũ** khi vượt ngưỡng. Chế độ hybrid ở Phase 17 phải dùng **đúng một** viewer 3D,
   chỉ load model khi người dùng bấm, và `dispose()` geometry/material — đây đúng là lỗi R6 mà
   [docs/REVIEW.md](file:///Users/macbookpro2015/Kami/Kami3D/docs/REVIEW.md) đã ghi (GLB hiện không được dispose).
7. **Enum châu lục không được tạo mới.** `REGIONS` và `REGION_ANCHORS` (`{lat, lng, label, blurb}`) đã có trong
   [types/animal.ts](file:///Users/macbookpro2015/Kami/Kami3D/types/animal.ts#L45-L58) và đang được globe + trang loài + `check:globe` dùng.
   Bộ lọc theo châu lục và việc đồng bộ Globe→Map phải dùng lại đúng hai hằng số này; mọi bảng/cột enum mới phải
   khớp SQL CHECK như `check:sql` đang ép.

---

## 🗺️ Phase 13 — Nền tảng Data-to-Map

**Mục tiêu**: dựng hạ tầng dùng chung cho cả nhóm: `BaseMap.tsx` tái sử dụng được, PostGIS + bảng
`animal_geodata`, hook/context bật-tắt layer, và cầu nối Globe → Map.

**Prompt để triển khai Phase 13**:

````markdown
Phase 13 cho Kami3D – Xây dựng nền tảng Data-to-Map.

Tech bắt buộc:
- Next.js 15 App Router + TypeScript
- Mapbox GL JS hoặc MapLibre GL (ưu tiên MapLibre nếu muốn miễn phí)
- react-map-gl
- Deck.gl (để xử lý heatmap, cluster, lớn dữ liệu)
- Supabase + PostGIS (bật extension postgis)
- Turf.js (xử lý không gian phía client khi cần)

Yêu cầu:
1. Tạo component `components/map/BaseMap.tsx` có thể tái sử dụng:
   - Hỗ trợ style tối (dark) phù hợp Kami3D
   - Có controls: zoom, compass, geolocate, fullscreen
   - Hỗ trợ nhiều layer (vector, heatmap, fill, line, symbol)
   - Responsive + touch-friendly

2. Thiết lập Supabase với PostGIS:
   - Bật extension postgis
   - Tạo bảng `animal_geodata` với cột geometry (Polygon / MultiPolygon / Point)
   - RLS cơ bản

3. Tạo hook `useMapLayers` và context để bật/tắt layer dễ dàng

4. Tích hợp sẵn với InteractiveGlobe hiện có (có thể chuyển từ Globe → Map view)

Output cần có:
- SQL setup PostGIS + bảng animal_geodata
- BaseMap.tsx hoàn chỉnh
- Ví dụ layer cơ bản (habitat polygon)
- Cách chuyển đổi tọa độ lat/lng ↔ Mapbox
````

**Ràng buộc riêng của Phase 13**:

1. **Thứ tự toạ độ là cái bẫy số một.** GeoJSON/MapLibre dùng `[lng, lat]`, còn `LatLng` của dự án
   ([lib/globe.ts](file:///Users/macbookpro2015/Kami/Kami3D/lib/globe.ts#L19-L22)) là `{ lat, lng }`. Mọi chỗ giao nhau phải đi qua
   helper chuyển đổi đặt cạnh `lib/globe.ts` (ví dụ `toLngLat`/`fromLngLat`), **không** truyền thẳng object,
   và phải có test trong một suite `check-geo` — đảo trục thì bản đồ vẫn render, chỉ sai chỗ, nên không có test
   là sẽ không ai phát hiện.
2. **`animal_geodata` nên gánh luôn `year` và `kind` ngay từ đầu.** Phase 15 cần threat layer, Phase 16 cần
   range theo năm — nếu Phase 13 chỉ có `animal_id + geometry` thì 15 và 16 sẽ phải `alter table` liên tục.
   Đề xuất: `kind text check in ('habitat_current','habitat_historic','protected_area','occurrence')`,
   `year int null`, `source text`, `license text`, `attribution text`, `geometry geometry(Geometry, 4326)`,
   index **GiST** trên `geometry` và index `(animal_id, kind, year)`.
3. **PostGIS theo convention Supabase**: `create extension if not exists postgis with schema extensions;`
   (đặt trong `schema.sql` để `npm run db:schema` áp được), và **cấm** để `geometry` rơi vào schema `public`
   mà không có RLS. Ràng buộc dữ liệu: chỉ nhận `ST_IsValid` — nạp polygon tự giao nhau vào PostGIS rồi
   `ST_Intersects` sẽ trả kết quả sai một cách im lặng.
4. **RLS giống `sound_assets`**: `enable row level security` + một policy `SELECT to anon, authenticated
   using (true)` + `grant select`. **Không có write policy** — upload địa lý đi qua Edge Function với service
   role (Phase 17), browser không được ghi.
5. **`useMapLayers` viết bằng Zustand, không phải Context mới.** `zustand@5` đã là dependency
   ([package.json](file:///Users/macbookpro2015/Kami/Kami3D/package.json#L58)). Yêu cầu thêm một điều mà prompt chưa nói: trạng thái layer
   phải **đồng bộ lên URL** (`?layers=habitat,density&species=lion`) để chia sẻ được link và để SSR biết
   render gì — nếu chỉ nằm trong memory thì mọi view bản đồ đều không share được.
6. **Đừng tự viết controls.** MapLibre đã có `NavigationControl` (zoom + compass), `GeolocateControl`,
   `FullscreenControl`, `ScaleControl`; tự viết lại vừa thừa vừa mất touch behavior.

---

## 🦓 Phase 14 — Habitat & Species Distribution Maps

**Mục tiêu**: trang `/map` (hoặc `/explore/map`) với habitat polygon click được, heatmap mật độ, panel bật/tắt
layer kèm opacity, và bộ lọc châu lục / IUCN / category.

**Prompt để triển khai Phase 14**:

````markdown
Tiếp tục Phase 14 – Habitat & Species Distribution Maps cho Kami3D.

Xây dựng trang `/map` hoặc `/explore/map` với các tính năng:

1. **Habitat Layer**:
   - Hiển thị vùng sinh sống thực tế của từng loài (Polygon từ IUCN / GBIF hoặc dữ liệu tự có)
   - Click vào polygon → hiện thông tin loài + nút xem 3D model

2. **Density Heatmap**:
   - Heatmap mật độ quan sát / mật độ quần thể (dùng Deck.gl HeatmapLayer)
   - Có thanh lọc theo loài hoặc nhóm loài

3. **Multi-layer Control**:
   - Panel bên phải cho phép bật/tắt:
     - Habitat range
     - Observation density
     - Protected areas
     - Human pressure / deforestation (nếu có dữ liệu)
   - Opacity slider cho từng layer

4. **Filter & Search**:
   - Lọc theo châu lục, IUCN status (Endangered, Vulnerable…), category
   - Search loài → bay đến vùng phân bố của loài đó

5. Tích hợp với hệ thống hiện có:
   - Click loài trên map → mở ModelViewer 3D hoặc trang chi tiết
   - Đồng bộ với InteractiveGlobe (chọn châu lục trên Globe → filter map)

Yêu cầu kỹ thuật:
- Dùng Deck.gl + react-map-gl
- Dữ liệu GeoJSON hoặc vector tiles
- Performance tốt khi có hàng trăm polygon
- UI Glassmorphism + Dark theme Kami3D

Trả về code đầy đủ các component chính + ví dụ dữ liệu GeoJSON mẫu.
````

**Ràng buộc riêng của Phase 14**:

1. **"Hàng trăm polygon" chưa cần vector tiles.** Ở quy mô này, một GeoJSON response + `ST_AsGeoJSON` là đủ và
   rẻ; vector tiles (`ST_AsMVT` qua RPC) chỉ nên làm khi vượt khoảng một nghìn feature hoặc khi payload vượt
   ~1 MB. Làm tiles sớm là tối ưu hoá sai chỗ, đúng loại việc đã bị loại ở Phase 10.
2. **Đơn giản hoá geometry trước khi trả về**: `ST_SimplifyPreserveTopology(geometry, 0.01)` + bỏ cột thừa.
   Range map gốc của IUCN rất chi tiết; gửi nguyên si là payload phình mà mắt người không thấy khác.
3. **Bộ lọc dùng lại enum có sẵn**: châu lục = `REGIONS`, tình trạng bảo tồn = `statusToTailwind`/IUCN status đã
   có trong [types/animal.ts](file:///Users/macbookpro2015/Kami/Kami3D/types/animal.ts) — không định nghĩa lại danh sách.
4. **Heatmap phải nói rõ dữ liệu là gì.** "Mật độ quần thể" gần như không có nguồn mở; "mật độ quan sát" thì có
   (GBIF occurrence). Nhãn UI phải ghi đúng cái đang vẽ, kèm số bản ghi và khoảng thời gian, nếu không người
   xem sẽ đọc heatmap quan sát thành bản đồ mật độ loài.
5. **Đồng bộ Globe → Map là một chiều và qua URL**: Globe đang gọi `onRegionSelect(region)`
   ([LazyGlobe.tsx](file:///Users/macbookpro2015/Kami/Kami3D/components/3d/LazyGlobe.tsx#L38-L54)). Chuyển chế độ thì ghi `region` vào cùng state layer
   đã đồng bộ URL ở Phase 13 — không dựng thêm store thứ hai cho cùng một khái niệm.

---

## 🔥 Phase 15 — Conservation Threat & Risk Maps

**Mục tiêu**: overlay các lớp mối đe dọa (mất rừng, human footprint, rủi ro khí hậu, poaching, khu bảo tồn)
với legend rõ ràng, click ra mức rủi ro + loài bị ảnh hưởng, và Risk Score tính được.

**Prompt để triển khai Phase 15**:

````markdown
Phase 15 – Conservation Threat & Risk Maps cho Kami3D.

Xây dựng hệ thống overlay mối đe dọa:

1. Các lớp dữ liệu chính:
   - Deforestation / Forest loss (heatmap hoặc polygon)
   - Human footprint / Urban expansion
   - Climate risk (nhiệt độ tăng, hạn hán, mực nước biển)
   - Poaching / Illegal trade hotspots (nếu có)
   - Protected area boundaries

2. Tính năng:
   - Layer control có legend màu sắc rõ ràng
   - Click vào vùng → hiện mức độ rủi ro + các loài bị ảnh hưởng
   - "Risk Score" tổng hợp cho từng khu vực
   - So sánh "Trước đây vs Hiện tại" (nếu có dữ liệu lịch sử)

3. Kết hợp với động vật:
   - Khi chọn 1 loài, map chỉ hiện các mối đe dọa liên quan đến loài đó
   - Highlight những phần habitat đang bị đe dọa nặng

4. Admin có thể upload / cập nhật dữ liệu đe dọa (GeoJSON hoặc shapefile → PostGIS)

Output cần có:
- Component ThreatLayerPanel
- Ví dụ tích hợp Deck.gl với nhiều layer
- Cách tính risk score đơn giản
- UI legend đẹp
````

**Ràng buộc riêng của Phase 15**:

1. **Threat layer không thuộc về một loài** → cần bảng riêng `threat_layers` (kind, severity, year, source,
   license, attribution, geometry), tách khỏi `animal_geodata`. Quan hệ "loài nào bị ảnh hưởng" là **join không
   gian** (`ST_Intersects`) chứ không phải cột `animal_id` — gán sẵn `animal_id` cho từng polygon đe dọa là
   nhân bản dữ liệu và sẽ lệch mỗi lần habitat cập nhật.
2. **Risk Score phải là hàm thuần, có test.** Đặt trong `lib/risk.ts` với input/output bằng số rõ ràng
   (ví dụ trung bình có trọng số của `severity × % habitat bị giao`), và thêm suite `check:risk`. Một con số
   hiển thị cho người dùng mà không test được thì không nên hiển thị.
3. **"Trước đây vs Hiện tại" dùng chính cột `year` của Phase 13** — không tạo bảng lịch sử riêng. Slider so sánh
   chính là Phase 16 thu gọn, nên để chung một cơ chế.
4. **Legend phải đạt contrast trên dark theme**: nền tối + màu severity nhạt là chỗ dễ mất chữ nhất; legend
   nằm trong panel glassmorphism nên phải kiểm bằng `audit:theme` (script đã có) chứ không chỉ nhìn mắt.
5. **Nguồn dữ liệu phải nói thẳng là có hay không.** "Poaching hotspots" và "human pressure" không có nguồn mở
   đáng tin ở độ phân giải loài; nếu không có thì **bỏ layer đó**, không vẽ bằng dữ liệu suy diễn. Mỗi layer
   trong panel phải kèm nguồn + năm + licence.

---

## ⏳ Phase 16 — Timeline & Story Maps

**Mục tiêu**: timeline range lịch sử (1900 → nay) có annotation sự kiện, và story map đường di cư có animation
play/stop, click điểm dừng chân ra thông tin + 3D.

**Prompt để triển khai Phase 16**:

````markdown
Phase 16 – Timeline & Story Maps cho Kami3D.

Xây dựng 2 tính năng chính:

1. **Historical Range Timeline**:
   - Thanh thời gian (ví dụ 1900 → 2026)
   - Khi kéo thanh, vùng phân bố của loài thay đổi theo năm
   - Có annotation sự kiện lịch sử (săn bắt hàng loạt, thành lập khu bảo tồn, tuyệt chủng cục bộ…)
   - Hỗ trợ nhiều loài cùng lúc để so sánh

2. **Migration Story Map**:
   - Hiển thị đường di cư theo mùa (LineString / Arc)
   - Animation đường bay / đường đi theo thời gian
   - Click vào điểm dừng chân → hiện thông tin + ảnh / 3D
   - Có chế độ "Play migration" tự động chạy animation

3. Kết hợp 3D:
   - Khi xem migration, có thể mở model 3D của loài đang di chuyển
   - Hoặc hiển thị model 3D nhỏ tại các điểm quan trọng trên map

Yêu cầu:
- Dùng Mapbox/MapLibre + Deck.gl TripsLayer hoặc ArcLayer cho animation
- Dữ liệu migration dạng timestamped GeoJSON
- UI thanh timeline mượt (Framer Motion)
- Mobile-friendly

Trả về code hoàn chỉnh cho TimelineSlider + MigrationLayer + trang demo.
````

**Ràng buộc riêng của Phase 16**:

1. **Bỏ Framer Motion khỏi yêu cầu** (xem ràng buộc chung #5). TimelineSlider dùng `<input type="range">`
   hoặc slider CSS với `requestAnimationFrame` khi autoplay — mượt hơn, và không đánh đổi bundle.
2. **Dữ liệu range lịch sử gần như không có nguồn mở.** IUCN có bản đồ hiện tại, không có chuỗi theo năm; dữ
   liệu lịch sử thường phải số hoá tay từ tài liệu. Nên định nghĩa rõ: **annotation sự kiện** (có nguồn, có
   trích dẫn) tách khỏi **polygon theo năm** (chỉ hiển thị khi thật sự có dữ liệu), và UI phải hiển thị
   "chưa có dữ liệu cho năm này" thay vì nội suy ra một vùng không có thật.
3. **Animation phải tôn trọng `prefers-reduced-motion`** — autoplay migration là chuyển động liên tục, đúng
   loại cần tắt theo cài đặt hệ điều hành (và theo setting Phase 11 `reduce_motion`). Không được autoplay khi
   người dùng đã xin giảm chuyển động.
4. **Migration cần bảng riêng** `migration_routes` (animal_id, season, geometry LineString, stops jsonb, source)
   vì nó là *đường*, không phải *vùng* — nhét vào `animal_geodata` sẽ làm hỏng mọi truy vấn habitat.
5. **Mobile**: timeline + panel layer cùng lúc chiếm gần hết màn hình điện thoại; phải có chế độ thu gọn
   (chỉ một panel mở tại một thời điểm) và `touch-action` đúng để kéo timeline không bị bản đồ nuốt gesture.

---

## 🛠️ Phase 17 — Admin Geospatial Pipeline & 3D-Map Hybrid

**Mục tiêu**: trang `/admin/geodata` upload + preview + version dữ liệu không gian, và chế độ xem hybrid
bản đồ phân bố ↔ ModelViewer 3D.

**Prompt để triển khai Phase 17**:

````markdown
Phase 17 – Admin Geospatial Pipeline & 3D-Map Hybrid cho Kami3D.

1. Admin Tools:
   - Trang `/admin/geodata`
   - Upload GeoJSON / Shapefile / CSV có tọa độ
   - Tự động nhận diện geometry và import vào PostGIS
   - Gán dữ liệu không gian cho từng loài (animal_id)
   - Xem trước trên map trước khi publish
   - Quản lý version dữ liệu (historical range theo năm)

2. 3D + Map Hybrid View:
   - Tạo chế độ xem kết hợp:
     - Bên trái / dưới: bản đồ phân bố
     - Bên phải / trên: ModelViewer 3D của loài
   - Click vùng trên map → model 3D tương ứng highlight hoặc load
   - Có thể đặt model 3D "neo" theo tọa độ thực (nếu muốn experiment)

3. Performance & Data Pipeline:
   - Dùng Python (hoặc Edge Function) để xử lý GeoPandas → tối ưu geometry
   - Hỗ trợ vector tiles nếu dữ liệu lớn
   - Caching layer thông minh

Output cần có:
- Trang Admin upload + preview
- Component HybridMap3DView
- Ví dụ pipeline xử lý dữ liệu đơn giản
- Hướng dẫn kết nối dữ liệu IUCN / GBIF (nếu public)
````

**Ràng buộc riêng của Phase 17**:

1. **Upload không được ghi DB trực tiếp từ browser.** `animal_geodata` không có write policy (Phase 13 #4),
   nên luồng đúng là: browser → **Edge Function** (giữ service role) → `ST_IsValid` + `ST_SimplifyPreserveTopology`
   → insert. Đẩy anon key kèm quyền ghi là mở đường cho bất kỳ ai ghi đè habitat.
2. **"Admin" chưa tồn tại trong schema.** Phase này cần một khái niệm role (ví dụ Clerk `app_metadata.role`)
   cộng với kiểm tra phía Edge Function; không có role thì đừng làm trang `/admin` — hoặc gating bằng biến môi
   trường cho môi trường local, và nói rõ đó không phải bảo mật thật.
3. **Shapefile không chạy được trong Edge Function** (Deno runtime, không có GDAL). Hai lựa chọn trung thực:
   convert ở client bằng `shpjs` rồi gửi GeoJSON, hoặc để pipeline Python ngoài repo (GeoPandas) — và pipeline
   đó phải theo đúng khuôn CLI của dự án: `--report` (dry run, in ra sẽ nhập gì) trước, `--apply` sau, có test.
4. **Version dữ liệu = append, không UPDATE đè.** Giữ `source_version` + `year` và chỉ chọn bản mới nhất khi
   truy vấn; ghi đè là mất khả năng so sánh "trước vs hiện tại" mà Phase 15/16 cần.
5. **Hybrid view chỉ một WebGL context** (ràng buộc chung #6): bản đồ là canvas WebGL của MapLibre, nên viewer
   3D phải là canvas **thứ hai duy nhất**, mount khi bấm, và `dispose()` GLB khi đổi loài — đây chính là lỗi R6
   trong [docs/REVIEW.md](file:///Users/macbookpro2015/Kami/Kami3D/docs/REVIEW.md) chưa được xử lý. "Neo model 3D theo tọa độ thực"
   trong prompt nên coi là **thí nghiệm tách riêng**, không nằm trong luồng chính: nó cần model đã ở toạ độ
   thật, trong khi 24 GLB hiện tại không có.
6. **Caching**: cache theo `(animal_id, kind, year)` với `revalidate` hợp lý thay vì "caching layer thông minh"
   chung chung; dữ liệu địa lý thay đổi rất chậm nên `force-cache` + revalidate theo ngày là đủ.

---

## 🚧 Việc còn lại

| # | Việc | Ghi chú |
| --- | --- | --- |
| 1 | **Cập nhật `CLERK_SECRET_KEY`** | Key hiện tại trả **403 / code 1010** (đã bị xoay). Lấy key mới ở Clerk Dashboard → API Keys rồi dán vào `.env.local`. **Đây là việc duy nhất đang chặn đăng nhập.** |
| 2 | Test đăng nhập trong trình duyệt | Cần bạn tự làm — mọi bước còn lại đã verify bằng session thật qua API. |
| 3 | 3 model là "đại diện" | `gooty-tarantula` (tarantula Mexican red-knee), `weddell-seal` (seal chung), `emperor-penguin` (chim non) — thay bằng `data/model-sources.json`. |
| 4 | **P0.1 — Clerk Third-Party Auth + RLS thật** (từ review Phase 10) | Hiện Clerk đi vòng qua RLS bằng service role; bật Clerk làm Third-Party Auth trong Supabase rồi áp SQL ở `docs/REVIEW.md` §3.1–3.3 |
| 5 | **P0.2 — chống bơm lượt xem** | `/api/views` chỉ có cookie 6 giờ; thêm rate limit + kiểm `Sec-Fetch-Site` |
| 6 | **P0.3 — `app/error.tsx` + `global-error.tsx` + `loading.tsx`** | Thiếu tầng lỗi/đang tải ở route: một lỗi server component hiện ra trang trắng mặc định |
| 7 | **P0.4 — `dispose()` geometry/material của GLB** | Đoạn code sẵn ở `docs/REVIEW.md` §4.2; kiểm bằng `renderer.info.memory` |
| 8 | Âm thanh loài (**Phase 9**) | **Đã tải 6 bản ghi** (635 kB, CC0/CC-BY, đã credit + upload Storage). 18 loài còn lại không có bản ghi hợp licence trên Wikimedia — phần lớn là CC BY-SA/NC. Muốn tăng độ phủ: dán `FREESOUND_API_KEY` **thật** vào `.env.local` (giá trị hiện tại chỉ 3 ký tự nên API trả 401) rồi chạy `npm run sounds:fetch -- --all`. |
| 5 | File `LICENSE` | Repo public nhưng chưa có license — quyết định của bạn. |
| 6 | Xoay service role key | Đang dùng cho chế độ Clerk; nên xoay định kỳ. |

---

## 🔍 Cách kiểm chứng

```bash
npm run check        # typecheck + 144 bài test trong 16 suite (rig, tỉ lệ, SQL, squircle, JSON-LD, session hint, theme, tier, camera, quiz, địa cầu, licence âm thanh)
npm run check:bundle # ngân sách JS mỗi route + luật "không 3D/auth ở first paint" (cần build trước)
npm run build        # build production 37 route
npm run db:status    # database đang có bao nhiêu loài
npm run models:report # model nào tải được, kèm license
npm run audit:perf   # Chrome thật: TTFB/FCP/LCP/CLS + byte tải trước và sau `load`
npm run check:theme  # bảng màu sáng/tối: đủ token + độ tương phản WCAG AA
npm run check:camera # toán camera của ModelViewer: preset, bay, xoay, zoom
npm run check:bundle  # sau khi build: ngân sách JS mỗi route + luật "không 3D/auth ở first paint"
npm run audit:theme  # Chrome thật: chữ khó đọc và panel tối sót lại ở theme sáng
npm run audit:perf   # Chrome thật: TTFB/FCP/LCP/CLS + byte tải trước và sau `load`
npm run check:bundle # sau khi build: ngân sách JS mỗi route + luật "không 3D/auth ở first paint"
npm run check:quiz   # bộ sinh câu hỏi + luật tính điểm của quiz
npm run check:globe  # toán địa cầu: camera bay tới vùng, xếp hạng pin theo vùng
npm run check:sounds # chính sách licence âm thanh, cửa sổ kích thước, tên file chống path traversal
npm run sounds:report # Chrome không cần: dò bản ghi từng loài, KHÔNG tải gì (cần mạng)
```

> ⚠️ **Đừng chạy `npm run build` khi `npm run dev` đang chạy** — hai tiến trình cùng ghi vào
> `.next` sẽ làm hỏng server dev. Lỗi này đã xảy ra 3 lần trong quá trình phát triển.

---

## 📌 Quyết định thiết kế đáng nhớ

0. **(Từ review Phase 10) Danh tính phải hợp nhất trước khi thêm bảng người dùng thứ tư.** Clerk sẽ được cấu hình
   làm Third-Party Auth của Supabase để `auth.jwt()->>'sub'` trả về đúng người dùng, nhờ đó policy dùng chung một
   hàm `public.current_user_id()` cho cả hai provider và **service role không còn cần** cho dữ liệu cá nhân. Bất kỳ
   bảng per-user mới nào (ví dụ `user_settings` ở Phase 11) đều dùng hàm đó, không lặp lại `auth.uid()`.
0b. **(Từ review) Asset ưu tiên Storage, repo chỉ là fallback.** Khi có Supabase, model và tiếng kêu được phát từ
   bucket; bản trong `public/` chỉ để Demo Mode và self-host chạy được mà không cần key. Hai đường này phải được
   ghi rõ ở một chỗ (`lib/animals.ts`) thay vì mỗi nơi tự quyết.
0c. **(Từ review) Chuỗi i18n tách khỏi JSX trước khi thêm ngôn ngữ thứ hai.** Khoảng 250 chuỗi tiếng Anh đang nằm
   rải trong component; gom vào `lib/i18n/en.ts` là việc rẻ, còn refactor sau khi đã có 3 ngôn ngữ là việc đắt.

1. **Mọi tích hợp đều tuỳ chọn và suy giảm mềm.** Không key Clerk, không Supabase, không model,
   không âm thanh — mỗi thứ đều lùi về một trạng thái vẫn dùng được, không bao giờ trắng trang.
   Ứng dụng chạy được **không cần cấu hình gì** (Demo Mode).
2. **Code 3D nặng không bao giờ chặn nội dung.** `three` + R3F + drei (~750 KB) luôn nằm sau
   `next/dynamic ssr:false`, và `MountWhenVisible` giữ cả việc **tải** cho tới khi canvas gần
   viewport và browser rảnh; chữ và metadata của loài là HTML tĩnh.
3. **Layout gốc không được biết gì về auth.** Đọc cookie trong layout sẽ biến cả 24 trang loài
   thành render động, còn import SDK auth vào layout thì mọi khách vãng lai phải tải Clerk/Supabase.
   Nên: server dựng sẵn trạng thái khách, `middleware.ts` ghi một cookie gợi ý ngắn hạn, client đọc
   cookie đó rồi mới `import()` menu tài khoản — và câu trả lời "không chắc" luôn được xử lý an toàn
   (tải lúc rảnh) chứ không bao giờ ẩn menu của người đã đăng nhập.
4. **Toán kiểm chứng được thì phải kiểm chứng.** Hình học rig, tỉ lệ kích thước, bo góc squircle,
   sự khớp giữa SQL ↔ dataset, graph JSON-LD và logic cookie phiên đều là module thuần có test —
   vì đó là những chỗ sai mà mắt thường không thấy.
5. **License model là ràng buộc cứng.** Pipeline chỉ tải CC0 / public domain / CC BY, từ chối
   share-alike / no-derivatives / non-commercial / all-rights-reserved, và luôn ghi credit — nên
   không thể vô tình đưa model có bản quyền lên site.
6. **Một nguồn sự thật cho mỗi thứ.** Logo (SVG sinh ra favicon + OG), nhà cung cấp auth
   (`lib/auth-provider.ts`), seed SQL (sinh từ `data/animals.ts`), và cả cách ghi dữ liệu cá nhân
   (`lib/personal-data.ts`).

---

## 🗂️ Bản đồ thư mục

```
app/                 route (mặc định là Server Component)
components/3d/       canvas, địa cầu, model viewer, size chart, rig procedural
components/animal/   grid, card, filter, info panel, nút yêu thích
components/auth/     form Supabase, panel Clerk, nút Google, slot navbar + island tài khoản tải trễ
components/seo/      thẻ JSON-LD (nội dung do lib/seo.ts sinh)
components/brand/    logo
lib/rigs.ts          hình học sinh vật + toán bounding box (thuần, có test)
lib/size-comparison.ts  toán tỉ lệ thật (thuần, có test)
lib/squircle.ts      góc bo cong liên tục kiểu Apple (thuần, có test)
lib/animals.ts       đường đọc dữ liệu loài duy nhất (Supabase → fallback dataset)
data/animals.ts      nguồn sự thật của catalogue
supabase/            schema.sql + seed.sql (sinh tự động)
scripts/             4 suite test + sinh seed + tải model + seed database
```
