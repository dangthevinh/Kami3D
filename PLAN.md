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
| **13** | Nền tảng Data-to-Map (BaseMap + PostGIS + `animal_geodata`) | ✅ Hoàn thành — `/map` + PostGIS + URL-as-state |
| **14** | Habitat & Species Distribution Maps (`/map`) | ✅ Hoàn thành — heatmap GBIF + bộ lọc + legend |
| **15** | Conservation Threat & Risk Maps | ✅ Hoàn thành — Natural Earth + risk index có test, WDPA bị từ chối |
| **16** | Timeline & Story Maps | ✅ Hoàn thành — 18 annotation có nguồn + seasonal path (kèm giới hạn đã đo) |
| **17** | Admin Geospatial Pipeline & 3D-Map Hybrid | 🟡 Pipeline + vai trò admin xong; chế độ hybrid 3D còn lại |
| **D1** | Data2Map Foundation (menu riêng + layout + bảng `data2map_*`) | ✅ Hoàn thành — landing 104.6 kB, không nạp MapLibre, 3 bảng + registry |
| **D2** | Real Estate & Zoning Overlay | ✅ Hoàn thành — 280 POI thật từ OSM + potential score có test |
| **D3** | Footfall & Trend Map (F&B/Retail) | ✅ Hoàn thành — mật độ dân số **thật** (WorldPop 2020) + POI F&B **thật** (OSM), footfall theo giờ mô phỏng **có nhãn** |
| **D4** | Logistics & Fleet Visualizer | ✅ Hoàn thành — isochrone Turf (nhãn "không phải thời gian lái xe"), cluster MapLibre, planner NN + 2-opt có test |
| **D5** | Cultural & Story Maps (kết hợp 3D) | ✅ Hoàn thành — 8 story + ảnh Commons có credit; chỗ 3D để trống có lý do |
| **D6** | Agri Geo-Analytics Dashboard | ✅ Hoàn thành — NDVI + mưa **thật** từ NASA GIBS (public domain, không cần tile pipeline), mẫu thửa mô phỏng có nhãn |

**Số liệu hiện tại**

| Hạng mục | Giá trị |
| --- | --- |
| Loài trong bách khoa | **24** (8 vùng, 8 lớp, 4 loài tiền sử) |
| Model 3D thật | **24** file `.glb`, DRACO, tổng **10 MB** (nén từ 61 MB) |
| Route dựng sẵn | **40** (24 trang loài là SSG, `/explore` nay **tĩnh**, **6** trang Data2Map tĩnh) |
| Test tự động | **357** bài trong **31** suite (`npm run check:suites`) — thêm 17 footfall · 9 trends · 7 overpass · 13 logistics · 7 ndvi · 6 agriculture |
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

## ✅ Phase 13 — Kết quả: nền tảng Data-to-Map

**Trạng thái: đã giao.** PostGIS + `animal_geodata` sống trên database thật, `/map` chạy được, và 7 ràng buộc
chung của nhóm Data-to-Map đều được giữ.

### 1. Database: PostGIS + `public.animal_geodata`

| Kiểm | Kết quả (truy vấn trực tiếp) |
| --- | --- |
| Extension | `postgis 3.3.7` trong schema `extensions` (đúng convention Supabase) |
| Bảng | `kind` (4 giá trị, CHECK), `year` (âm = TCN, NULL = hiện tại), `geometry extensions.geometry(Geometry, 4326)`, `source`, `source_url`, `license` (CC0/CC-BY), `attribution`, `properties` jsonb |
| Ràng buộc | chỉ 4 loại hình (POINT/MULTIPOINT/POLYGON/MULTIPOLYGON), **`ST_IsValid`** chặn polygon tự giao, `unique (animal_id, dedupe_key)` |
| Index | **GiST trên `geometry`** — `explain` cho thấy viewport query dùng `Index Scan using animal_geodata_geometry_idx` |
| RLS | bật, 1 policy `SELECT` công khai, **không có write policy**; `anon`/`authenticated` chỉ còn `SELECT` |
| Dữ liệu | 28 dòng (24 habitat hiện tại + 4 habitat lịch sử cho loài tiền sử), `ST_IsValid` = true cho tất cả |

`dedupe_key` là cột generated (`kind:year:source`) chứ không phải unique index trên `coalesce(year,…)`: PostgREST
chỉ upsert được theo cột có unique constraint thật, nên nếu viết index biểu thức thì `on_conflict=` sẽ không thấy nó.

### 2. Thứ tự toạ độ — cái bẫy số một

`lib/geo.ts` (thuần, không phụ thuộc gì) là **nơi duy nhất** biết `[lng, lat]` khác `{ lat, lng }`: 4 hàm chuyển
đổi, kiểm tra toạ độ hợp lệ, bounding box, đóng/mở ring, **phát hiện ring tự giao** (bản client của `ST_IsValid`),
diện tích cầu, và bộ sinh envelope tất định. 9 test mới trong `check-geo` khoá toàn bộ, gồm test khẳng định
điểm sai thứ tự **không** bằng điểm đúng.

### 3. `/map` và bundle

- `components/map/BaseMap.tsx` — MapLibre + **controls có sẵn** (`NavigationControl`, `GeolocateControl`,
  `FullscreenControl`, `ScaleControl`, `AttributionControl`), style tối, `fitBounds` khi vùng đổi.
- `lib/map-query.ts` — state của bản đồ là URL (`?layers=…&region=…&species=…`), parser chịu được rác và test
  được bằng Node; `lib/map-layers.ts` là store Zustand ghi lại bằng `history.replaceState`.
- Nạp lazy đúng khuôn three.js: `MapExperience → LazyMap → dynamic(ssr:false) → MapCanvas`; `check:bundle` có
  **2 marker mới** (`maplibre-gl`, `MaplibreMap`) chặn rò rỉ sang route khác.
- **`/map` là route server-render theo yêu cầu** (URL quyết định server vẽ gì), nên `bundle-budget.mjs` nay đọc
  danh sách chunk từ `app-build-manifest.json` cho route động — vẫn giữ nguyên trần ngân sách.

| Route | JS khởi đầu (gzip) | Ngân sách |
| --- | --- | --- |
| `/map` | **128.4 kB** | 140 kB (số đo + biên, không phải số dễ đạt) |
| các route cũ | 129–158 kB (không đổi) | 165 kB |

### 4. Đã kiểm chứng gì, và chưa kiểm chứng gì

Kiểm trong Chrome thật ở `/map?region=Africa&layers=habitat`: server render đúng vùng từ URL; client chuẩn hoá
lại thành `?layers=habitat&region=Africa`; 28 shape tới được panel; hydration **không có lỗi console**; và khi
không có WebGL thì trang hiện panel giải thích thay vì hình chữ nhật trắng.

> ⚠️ **Chưa kiểm chứng được: chính tấm bản đồ.** Chrome headless trong môi trường này không có WebGL nên MapLibre
> không vẽ. Mọi thứ *quanh* renderer đều có test; phần vẽ là MapLibre làm việc của MapLibre. Cần mở `/map` bằng
> trình duyệt thật để tin tấm hình.

### 5. Dữ liệu: nói rõ nó là gì

28 hình hiện có là **envelope tổng hợp** quanh anchor vùng của từng loài, và mỗi feature tự khai điều đó
(`"synthetic": true` + `note` được render nguyên văn trong panel). Chúng tồn tại để clone mới (Demo Mode, không
database) vẫn mở được bản đồ — đúng luật của `data/animals.ts`.

Range thật là câu hỏi về licence trước khi là câu hỏi về dữ liệu: **IUCN range map hạn chế dùng thương mại**,
**GBIF là CC BY 4.0 và phải cite DOI**. Đó là lý do Phase 14 sẽ đi qua `scripts/fetch-geodata.mjs` với cột
`license`/`attribution` (đã `NOT NULL` từ phase này).

### 6. Bằng chứng

- `npm run check:suites`: **230 test** (thêm 10 của `check-map` và 9 của `check-geo`); `npx tsc --noEmit` sạch.
- `npm run build` + `npm run check:bundle`: 7/7 route trong ngân sách, `three`/Clerk vẫn deferred.
- `npm run geo:seed` chạy 2 lần liên tiếp: vẫn 28 dòng (upsert theo `dedupe_key`, không nhân bản).
- PostGIS thực thi: `ST_IsValid` true, `ST_Area` cho ra 940 763 km² cho envelope voi châu Phi, GiST index được dùng.
- Tài liệu: [docs/MAP.md](docs/MAP.md) (kiến trúc, dữ liệu, chi phí bundle, điều chưa kiểm chứng),
  `npm run check:map`, `npm run check:geo`, `npm run geo:generate|seed|status`.

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

## ✅ Phase 14 — Kết quả: Habitat & Species Distribution Maps

**Trạng thái: đã giao.** `/map` nay có heatmap mật độ quan sát từ **dữ liệu GBIF thật**, bộ lọc châu lục + IUCN +
lớp, panel layer kèm opacity, và legend nói rõ lớp đang vẽ là gì.

### 1. Dữ liệu thật, và cái giá về licence

| Việc | Kết quả |
| --- | --- |
| Pipeline | `scripts/fetch-geodata.mjs` (GBIF search API, không cần key): match loài → lọc `license=CC0_1_0,CC_BY_4_0` → kiểm lại từng record → lưu **một MultiPoint mỗi loài** |
| Đã lưu | **4 323 điểm** cho **23/24 loài**, trải **1980–2026**, 4–5 dataset mỗi loài |
| Bị từ chối | **megalodon**: 188 record, không record nào dùng được (toàn NC/ND/unknown) — đúng luật licence, và pipeline nói thẳng ra |
| Tỉ lệ dùng được | Ví dụ sư tử: **3 096/15 971 (19%)**; voi châu Phi 6 450/24 901 (26%); đại bàng đầu trắng 7 627 146/7 777 517 (98%) |

Bài học Phase 9 áp cho địa lý: GBIF phần lớn là **CC BY-NC**, site này có quảng cáo, nên nếu tải ào ạt rồi tính sau
thì gần như toàn bộ dữ liệu sẽ phải vứt. Pipeline in ra tỉ lệ chấp nhận để con số đó không bị bỏ qua.

### 2. Lấy mẫu trải theo thời gian, không lấy mới nhất

GBIF trả record mới nhất trước, nên "400 record từ 1980" thực chất là 400 record của hai năm gần đây — heatmap
của người đi xem chim tuần này, không phải bản đồ nơi loài sống. `yearBuckets()` chia cửa sổ năm và lấy mẫu đều
từng khúc: khoảng năm lưu trong DB từ `2024–2026` (trước) thành **1980–2026** (sau), số dataset từ 2 lên 26 với
sư tử. Có test riêng cho hàm chia bucket.

### 3. Map: heatmap + bộ lọc + minh bạch dữ liệu

- **Heatmap** vẽ bằng **layer `heatmap` có sẵn của MapLibre**, không dùng `Deck.gl HeatmapLayer` như prompt gốc:
  deck.gl tốn vài trăm kB cho đúng thứ renderer đã có, trên route có ngân sách 140 kB. Ràng buộc chung #1 của nhóm
  nói thư viện nặng phải xứng đáng; cái này thì không. Nếu Phase 16 cần arc/trip layer (MapLibre thật sự không vẽ
  được) thì sẽ cân nhắc lại — đã ghi vào docs.
- **Bộ lọc**: châu lục (dùng lại `REGIONS`), tình trạng bảo quản (IUCN), lớp. Lọc **thu hẹp cả hình trên bản đồ**,
  và loài đang chọn luôn được giữ lại dù có lọc — vừa bấm vào một hình mà nó biến mất là lỗi UX.
- **Legend nói đúng thứ đang vẽ**: "Observation density — 845 records across 6 species, 1980–2026 ·
  gbif-occurrence-search · CC-BY · where the species has been recorded, not how many there are" (ràng buộc #4).
- **`map_geodata()` RPC**: `security definer`, trả FeatureCollection đã `ST_SimplifyPreserveTopology` (đo được:
  456 điểm ở tolerance 0 → 268 ở 0.5° → 125 ở 2°) và chỉ gồm property mà map cần; điểm occurrence **không** bị
  simplify (làm vậy là dịch chuyển một lần quan sát).

### 4. Bằng chứng

- `npm run check:suites`: **231 test** (thêm 1 của `check-geo` cho bucket + các test Phase 13); `tsc` sạch, build xanh.
- `/map` **129.1 kB** JS khởi đầu (ngân sách 140) — heatmap, bộ lọc và legend thêm 0.7 kB; MapLibre vẫn deferred.
- Chrome thật ở `/map?region=Africa&layers=habitat,occurrence`: layer occurrence **bật đúng từ URL**, legend hiện
  ("845 records across 6 species"), bộ lọc IUCN render, 6 shape của châu Phi (lọc theo vùng thật sự thu hẹp hình),
  URL chuẩn hoá lại, **không lỗi console**.
- Vẫn **chưa** kiểm chứng được phần vẽ: Chrome headless không có WebGL. Ghi rõ trong docs/MAP.md.

### 5. Còn lại (chuyển sang Phase 15)

1. `protected_area` và `pressure` chưa có nguồn dữ liệu — panel hiện ghi "no data yet" thay vì giả vờ có.
2. Vector tiles (`ST_AsMVT`) chỉ nên làm khi vượt ~1 000 feature; hiện 51 feature nên GeoJSON là đúng.

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

## ✅ Phase 15 — Kết quả: Conservation Threat & Risk Maps

**Trạng thái: đã giao.** Bảng `threat_layers` + join không gian, lớp urban expansion thật từ Natural Earth,
risk index thuần có test, legend đạt contrast ở cả hai theme.

### 1. Nguồn dữ liệu: cái gì vẽ, cái gì bị từ chối

| Nguồn | Licence | Quyết định |
| --- | --- | --- |
| Natural Earth urban areas | Public domain | **nhập** — 1 662 polygon, severity 2–5 |
| WDPA / Protected Planet | Non-commercial | **từ chối** — site có quảng cáo |
| IUCN Red List | Restricted | **từ chối** |
| Hansen Global Forest Change | CC BY 4.0 | **chưa** — raster 30 m, cần pipeline tổng hợp |
| Poaching hotspots | Không có nguồn mở | **từ chối** — không vẽ bằng dữ liệu suy diễn |

Ràng buộc #5 nói thẳng: nguồn không có thì bỏ layer, và panel phải nói ra. Nên công tắc "Protected areas"
**vẫn hiện**, bị vô hiệu hoá, kèm lý do — thay vì biến mất im lặng. `npm run threats:report` in cả bảng từ chối.

### 2. Threat không thuộc về loài

Bảng riêng `threat_layers` (kind, severity 1–5, year, geometry, source, license, attribution, `dedupe_key`),
và quan hệ loài ↔ threat là **join không gian**: `species_threat_impact()` chạy `ST_Intersects` rồi
`ST_Intersection` để ra km² bị giao. Gán `animal_id` cho từng polygon sẽ nhân bản dữ liệu và lệch mỗi lần
habitat đổi — đúng như ràng buộc #1 cảnh báo. GiST index được dùng (`Index Scan using threat_layers_geometry_idx`).

Trên bản đồ, threat được vẽ bằng **centroid** (RPC `map_threats`): 1 662 đường viền thành phố là ~860 KB toạ độ
để cho thấy đúng thứ một điểm đã cho thấy. Lớp này chỉ được tải khi người dùng bật công tắc (`/api/threats`,
256 KB thô / **28 KB gzip**, cache `s-maxage`), nên trang `/map` không phải trả giá cho một lớp đa số khách không xem.

### 3. Risk index — hàm thuần, có test

`lib/risk.ts` + `npm run check:risk` (**14 test**): IUCN status 40 · kích thước vùng 20 · mức giao với threat 25
(nhân bởi severity) · xu hướng ghi nhận 15.

Hai luật khiến nó trung thực:

1. **Input thiếu là thiếu, không phải 0** — bị loại khỏi trung bình có trọng số và được liệt kê; panel hiện
   "built from 60% of the index weight". Có test khẳng định bỏ input không giống như chấm nó bằng 0.
2. **Nó nói rõ nó là gì** — "A Kami3D index, not an IUCN assessment", kèm trọng số hiển thị.

Test khoá cả chiều tác động: status xấu hơn / vùng nhỏ hơn / giao nhiều hơn / ghi nhận thưa đi đều làm điểm tăng,
và không gì khác; biên band; input vô lý vẫn cho điểm trong 0–100; `severityForUrbanArea` đơn điệu theo diện tích.

### 4. Contrast: đo chứ không nhìn

`audit:theme` **bắt được lỗi thật**: màu band dùng làm *chữ* (amber `#ffb738`, cyan `#38e0ff`) chỉ đạt **1.46–1.61:1**
trên nền sáng — dưới ngưỡng 4.5 rất xa. Sửa bằng cách tách vai trò: hex cho **fill** (swatch, thanh bar, paint của
MapLibre) và **Tailwind token** (`text-solar`/`text-glow`/`text-neon`/`text-coral`) cho **chữ**, vì `.light`
đã re-point các token đó. `audit:theme` nay đạt ở cả hai theme cho `/map`, và `check:risk` bắt buộc mỗi band phải
có `textClass` (không được dùng hex làm class).

Audit còn có một lỗi của chính nó được sửa trong phase này: tab của lượt chạy trước không được đóng nên app trong tab
cũ tiếp tục ghi `localStorage`, khiến lượt "light" thừa hưởng lựa chọn của lượt "dark" và audit báo lỗi do chính nó
gây ra. Nay mỗi lượt đóng tab (`/json/close/...`) và xoá cả hai khoá theme.

### 5. Bằng chứng

- `npm run check:suites`: **245 test** (thêm 14 của `check:risk`); `tsc` sạch; build xanh; `/map` **131.4 kB**
  (ngân sách 140), `three`/Clerk/MapLibre vẫn deferred.
- Dữ liệu: **3 262 → 1 662** dòng threat sau khi phát hiện và dọn dẹp bản trùng do lần chạy lỗi đầu tiên để lại
  (id feature trùng nhau trong cùng một batch — PostgREST từ chối, và tôi xoá sạch rồi chạy lại); 100% licence CC0.
- Join không gian: top impact hiện tại là woolly-mammoth 3.2%, gray-wolf 3.1% — tính trên **envelope demo**, nên
  đây là minh hoạ cơ chế, không phải kết luận bảo tồn (đã ghi rõ trong docs).
- Chrome thật ở `/map?region=Africa&layers=habitat,occurrence,pressure`: panel risk 8 loài, legend risk, nguồn
  "Natural Earth", lý do từ chối WDPA, lớp threat gọi `/api/threats` → **200**, không lỗi console.

### 6. Còn lại (chuyển sang Phase 16)

1. "Trước đây vs hiện tại" dùng cột `year` — Phase 16 làm slider, không tạo bảng lịch sử riêng.
2. `protected_area` vẫn chờ một nguồn dùng được (hoặc tự host WDPA với giấy phép phù hợp).
3. Risk index hiện tính ở client từ dữ liệu trang đã có; nếu số loài tăng lên hàng nghìn thì chuyển vào SQL.

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

## ✅ Phase 16 — Kết quả: Timeline & Story Maps

**Trạng thái: đã giao.** Timeline có annotation có nguồn, thanh trượt theo năm, và "seasonal path" suy ra từ dữ
liệu GBIF thật — kèm một phát hiện trung thực về giới hạn của phương pháp.

### 1. Annotation tách khỏi polygon theo năm

- Bảng `range_events`: **18 sự kiện có ngày + có nguồn** (CITES 1973, lệnh cấm săn cá voi 1982, Yellowstone 1995,
  gấu trúc được hạ mức 2021, monarch 2022, bushfire 2020…). Nội dung là **bản tóm tắt của chúng tôi** (CC0), nguồn
  là link — nên annotation tồn tại được ở chỗ mà range map số hoá không tồn tại.
- `lib/timeline.ts`: `yearsWithRanges`, `frameForYear`, `describeGap`, `eventsForYear`, `timelineTicks`, `formatYear`.
  Có test khoá đúng luật quan trọng nhất: **năm không có polygon thì phải nói ra** và chỉ ra năm gần nhất có dữ liệu;
  annotation không bao giờ bị trộn vào ranges.
- `year` của `range_events` được mở rộng về `-100000000` (T. rex ở -66 triệu năm) — có ghi lý do trong schema.

### 2. Seasonal path: suy ra, và nói rõ là suy ra

Không có dataset mở nào chứa đường di cư được theo dõi cho các loài này. Có dữ liệu quan sát có ngày: GBIF. Nên
`migration_routes` lưu **centroid theo từng tháng của các record hợp lệ**, nối theo thứ tự — "nơi người quan sát
đã ở, lấy trung bình theo tháng".

**Phát hiện quan trọng**: tôi thêm chỉ số `mean_spread_km` (độ tản của từng tháng) và tỉ lệ route/spread với kỳ
vọng nó phân biệt được loài di cư với loài phân bố toàn cầu. **Nó không phân biệt được**: emperor-penguin đứng đầu
(12.8x) vì cụm tháng rất chặt còn centroid đi vòng quanh lục địa, trong khi monarch — loài di cư nổi tiếng nhất
trong danh sách — chỉ 1.7x. Nên lớp này **không được gọi là migration**: UI gọi nó là seasonal path, in cả
`mean_spread_km` và tỉ lệ cạnh đường, và docs ghi rõ muốn khẳng định đúng thì cần dữ liệu tracking thật (Movebank,
giấy phép theo từng study).

### 3. Animation không thư viện, và tôn trọng người dùng

- `lib/migration.ts` (thuần, có test): `pointAlongLine` đi theo **khoảng cách** chứ không theo index đỉnh (đi theo
  index sẽ bò qua các điểm mùa hè và lao qua khoảng trống mùa đông), `routeLengthKm`, `advanceProgress` (có wrap,
  không chia cho 0 khi hai điểm trùng nhau).
- Vẽ bằng `line-gradient` + `line-progress` của MapLibre và một điểm cập nhật mỗi frame — không Framer Motion,
  không Deck.gl TripsLayer (ràng buộc #1 và #5).
- **Autoplay tắt** khi `prefers-reduced-motion` hoặc setting `reduce_motion` của Phase 11 bật; nút play bị vô hiệu
  hoá kèm tooltip nói lý do, thay vì im lặng không làm gì.
- Mobile: panel thành tab (mở một cái một lúc), hai slider đặt `touch-action: pan-y` để bản đồ không nuốt gesture.

### 4. Bằng chứng

- `npm run check:suites`: **257 test** (thêm 12 của `check-timeline`); `tsc` sạch; build xanh; `/map` **134.9 kB**
  (ngân sách 140).
- Dữ liệu: 18 event (6 decline, 4 extinction, 4 protection, 3 recovery, 1 event); **7 seasonal path** với
  396–2 100 record mỗi path, 4 677–25 942 km.
- Chrome thật: bấm "Seasonal path" → select 7 loài, mặc định bald-eagle hiện **"6 monthly stops · 1,272 km ·
  2,100 records"** và **"Mean monthly spread 1,597 km"** cùng ghi chú "derived path"; không lỗi console.
- `audit:theme` vẫn đạt trên `/map` ở cả hai theme sau khi thêm panel mới.

### 5. Còn lại (chuyển sang Phase 17)

1. Chế độ xem (`ranges` / `path`) chưa nằm trong URL — mọi thứ khác của bản đồ thì có.
2. Muốn "migration" đúng nghĩa thì cần dữ liệu tracking (Movebank) với giấy phép theo study.
3. Slider so sánh "trước vs nay" nhiều loài cùng lúc: hiện timeline đổi một năm cho cả lớp habitat, chưa có
   chế độ so sánh hai năm cạnh nhau.

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

## 🟡 Phase 17 — Kết quả (một phần): Admin geospatial pipeline

**Trạng thái: đã giao phần pipeline + vai trò admin.** Phần "3D-Map Hybrid" chưa làm — lý do ghi ở mục 5.

### 1. Bước 0 của phase: vai trò admin có thật

Review Phase 10 nói thẳng: schema chưa có khái niệm admin, nên `/admin` mà không có role là trang ai cũng POST
được. Nên role làm trước:

- `public.app_admins` (user_id text, ghi chú) — **rỗng mặc định**, tức là clone mới không có admin nào và mọi
  policy đều từ chối.
- `public.is_admin()` — `security definer`, so `current_user_id()` với bảng đó, dùng chung một hàm nhận diện với
  mọi policy khác (Supabase Auth → `auth.uid()`, Clerk → JWT `sub`).
- Policy **write** cho admin trên `animal_geodata`, `threat_layers`, `range_events`, `migration_routes` — cộng với
  các policy đọc công khai đã có. Đã kiểm bằng truy vấn: `is_admin()` = **false** cho anon; 9 policy đúng như thiết
  kế (4 write cho authenticated + 5 read công khai).

> Lỗi thứ tự đã bị `npm run db:schema` bắt: policy gọi `is_admin()` được tạo trước khi hàm tồn tại → 42883.
> Toàn bộ file chạy như một câu lệnh nên không có gì bị áp dở dang.

### 2. Import: một cửa kiểm tra, dùng cho cả CLI và trang admin

`lib/geodata-import.ts` (thuần, **10 test** trong `check:import`): nhận GeoJSON (FeatureCollection, một Feature,
hoặc một geometry trần) hay CSV có cột toạ độ; tự tìm cột `decimalLatitude/latitude/lat/y` và
`decimalLongitude/longitude/lon/lng/long/x`; kiểm ring kín + **không tự giao** (đúng thứ PostGIS sẽ kiểm lại);
từ chối LineString kèm chỉ dẫn sang pipeline migration; và **bắt buộc có attribution + licence CC0/CC-BY** — không
có credit thì không nhập được.

Ba đường dùng chung một cửa:

| Đường | Việc |
| --- | --- |
| `npm run geodata:report -- --file=…` | in ra sẽ nhập gì, từ chối gì — không ghi gì |
| `npm run geodata:import -- … --apply` | ghi bằng service role |
| `POST /api/admin/geodata` | preview (`publish` thiếu) hoặc publish, sau khi `is_admin()` xác nhận |

Shapefile **không** được đọc ở đây (không có GDAL): script nói rõ phải `ogr2ogr -f GeoJSON` trước, thay vì
parse nửa vời một định dạng nhị phân.

### 3. Version = append, không ghi đè

Thêm cột `source_version` và đưa nó **vào `dedupe_key`**: nhập lại cùng nguồn tạo **phiên bản mới** thay vì đè, nên
câu hỏi "trước vs hiện tại" của Phase 15/16 vẫn trả lời được. `seed-geodata.mjs` không gửi version nên rơi vào `v1`
và vẫn idempotent. Kiểm trên DB: 51 dòng, 3 khoá duy nhất theo `(kind, year, source, version)` — đúng như thiết kế
(khoá duy nhất là `(animal_id, dedupe_key)`).

### 4. `dispose()` cho GLB — sửa P0.4/R6

Constraint 5 của phase nói `dispose()` là việc chưa làm từ review. Nay `GltfModel` giải phóng geometry, material và
texture của **bản clone** khi đổi loài hoặc đóng viewer; cache `useGLTF` vẫn giữ nên lần xem lại vẫn tức thì. Đây là
nửa đầu của yêu cầu "chỉ một WebGL context" — nửa còn lại là bản thân chế độ hybrid.

### 5. Chưa làm: chế độ 3D-Map Hybrid

Lý do là ràng buộc chứ không phải thiếu thời gian: bản đồ là một canvas WebGL của MapLibre, nên viewer 3D là canvas
**thứ hai duy nhất** được phép tồn tại, và trên điện thoại hai canvas cạnh nhau là quá nhiều. Cách làm đúng — đã
viết ra để lần sau không phải nghĩ lại:

1. Viewer mount **chỉ khi bấm**, `next/dynamic` + `ssr: false`, và `dispose()` khi đóng (đã có sẵn từ mục 4);
2. Trên màn hình nhỏ, mở viewer thì **unmount bản đồ** (không phải che bằng CSS) để không bao giờ có hai context;
3. Trên desktop thì cạnh nhau được, nhưng chỉ một viewer, và không tự mount theo hover.

Hiện `/map` đã có lối vào 3D đúng tinh thần đó: panel loài có nút mở trang chi tiết, nơi model 3D thật sự sống.

### 6. Bằng chứng

- `npm run check:suites`: **267 test** (thêm 10 của `check:import`); `tsc` sạch; build xanh.
- Route mới: `/admin/geodata` **132 kB** First Load (MapLibre vẫn lazy), `/api/admin/geodata` 103 kB.
- `/map` nay **139 kB** — ngân sách được nâng lên **150 kB** kèm ghi chú số đo, vì timeline + path player là phần
  thật sự được thêm vào.
- `POST /api/admin/geodata` trả **403** cho mọi tài khoản không nằm trong `app_admins`, kể cả khi đã đăng nhập —
  cùng một câu trả lời cho "chưa đăng nhập" và "đăng nhập nhưng không phải admin", để endpoint không thành chỗ
  liệt kê ai có quyền.

---

## 🧭 Module Data2Map (Phases D1–D6)

**Data2Map là gì**: module thứ hai của Kami3D — một bộ bản đồ dữ liệu tương tác, xuất hiện như **mục menu
độc lập**, để người dùng đi từ "thế giới 3D động vật" sang các bản đồ dữ liệu doanh nghiệp. Dùng chung hạ tầng
(auth Clerk, Supabase + PostGIS, UI Kami3D, ngăn xếp bản đồ đã dựng ở Phase 13–17) nhưng có bộ trang riêng.

**Cấu trúc menu**: `/data2map` (trang chủ module) + 5 sản phẩm con

| Sản phẩm con | Route | Phase |
| --- | --- | --- |
| Real Estate & Zoning | `/data2map/real-estate` | D2 |
| Footfall & Trend Map | `/data2map/trends` | D3 |
| Logistics & Fleet | `/data2map/logistics` | D4 |
| Cultural & Story Maps | `/data2map/stories` | D5 |
| Agri Geo-Analytics | `/data2map/agriculture` | D6 |

**Một điều nên nói thẳng**: người dùng mục tiêu của Data2Map (môi giới bất động sản, chủ F&B, đơn vị vận tải,
hợp tác xã) **không** phải người xem bách khoa động vật. Phần dùng chung thật sự chỉ là auth + DB + UI + ngăn xếp
bản đồ; phần dữ liệu, SEO và cách viết nội dung là của một sản phẩm khác. Vì vậy Data2Map nên **ở cùng repo
nhưng tách đường** (`/data2map/*`, `components/data2map/*`, `lib/data2map/*`, `docs/DATA2MAP.md`), không trộn
vào các trang động vật.

**Thứ tự đề xuất**: D1 → D2 → D5 → D3 → D4 → D6. D5 rẻ nhất vì tái dùng gần như toàn bộ 3D + timeline đã có;
D6 đắt nhất vì cần tile raster (NDVI) mà dự án chưa có hạ tầng tile nào.

### ⚠️ Đọc trước: hạ tầng D1 yêu cầu **đã có sẵn** — không được dựng lại

| D1 yêu cầu tạo | Thực tế trong repo | Kết luận |
| --- | --- | --- |
| `components/data2map/BaseMap.tsx` | [components/map/BaseMap.tsx](file:///Users/macbookpro2015/Kami/Kami3D/components/map/BaseMap.tsx) — MapLibre + react-map-gl, style keyless, controls native (zoom/compass/geolocate/fullscreen/scale/attribution), `children` là `<Source>/<Layer>` | **Không tạo file thứ hai.** Đây đúng là component D1 mô tả. Dùng lại nguyên trạng |
| `LayerControl.tsx` (bật/tắt + opacity) | [components/map/LayerPanel.tsx](file:///Users/macbookpro2015/Kami/Kami3D/components/map/LayerPanel.tsx) | Tham số hoá/thêm layer của Data2Map, không fork |
| `MapLegend.tsx` | Legend hiện nằm trong LayerPanel | Tách thành component dùng chung nếu cần, một chỗ |
| `MapSearch.tsx` | [lib/map-query.ts](file:///Users/macbookpro2015/Kami/Kami3D/lib/map-query.ts) (URL-as-state, có test `check:map`) + `components/animal/FilterBar.tsx` | Tái dùng cơ chế URL, không viết parser thứ hai |
| `useData2Map` + Context | [lib/map-layers.ts](file:///Users/macbookpro2015/Kami/Kami3D/lib/map-layers.ts) (Zustand) | Dùng chung store; Context mới = hai nguồn sự thật cho cùng "layer nào đang bật" |
| "Bật PostGIS" | `create extension postgis with schema extensions` đã có trong [schema.sql](file:///Users/macbookpro2015/Kami/Kami3D/supabase/schema.sql#L625) | Xong rồi |
| Turf.js | `@turf/turf@7` đã là dependency | Xong rồi |
| Shadcn UI | `components/ui/{badge,button,card,input,skeleton}` (Radix Slot + cva) | Dùng lại; **không** chạy `shadcn init` |
| Framer Motion | Đã gỡ khỏi dự án và bị `check:bundle` **chặn** (marker `framer-motion`) | **Không dùng.** Animation = CSS |
| Deck.gl | **Chưa cài**, và chưa chắc cần (xem ràng buộc #3) | Chỉ thêm khi có số đo biện minh |

### Ràng buộc chung cho D1–D6

1. **Một ngăn xếp bản đồ duy nhất.** Data2Map thêm **dữ liệu và trang**, không thêm renderer. Mọi thứ đi qua
   `components/map/*` + `lib/map-*.ts` hiện có; nếu buộc phải sửa chúng để dùng chung, sửa **một chỗ** rồi
   cả `/map` lẫn `/data2map/*` cùng hưởng.
2. **Mỗi route mới phải được khai budget.** `/map` đang là `{ route: "/map", manifest: "/map/page", budget: 150 }`
   với số đo thật **139 kB** ([bundle-budget.mjs](file:///Users/macbookpro2015/Kami/Kami3D/scripts/bundle-budget.mjs#L44-L60)) — route render theo yêu cầu thì
   khai bằng `manifest`, không phải `html`. Trang `/data2map` (chỉ có card) phải **không** nạp MapLibre và giữ
   budget thấp; 5 trang có bản đồ khai riêng theo cùng khuôn. Marker `maplibre-gl` / `MaplibreMap` đã có trong
   `FORBIDDEN` nên bản đồ không rò sang route khác — nhưng chỉ áp dụng cho route **đã có trong `ROUTES`**.
3. **Deck.gl là lựa chọn cuối, không phải mặc định.** MapLibre đã có layer `heatmap`, `cluster` (qua
   `cluster: true` trên GeoJSON source), `circle`, `fill`, `line`, `symbol`, `fill-extrusion`; Turf (đã cài) có
   `hexGrid` + `interpolate` nên hexagon làm được bằng `fill` layer. Nghĩa là Heatmap/Hexagon/Cluster của D2–D4
   **không cần** deck.gl. Chỉ cân nhắc deck.gl khi có số đo cho thấy cần (>~100k điểm, hoặc TripsLayer/ArcLayer
   animation), và khi đó: `dynamic(ssr:false)` trong route, budget riêng, thêm marker vào `FORBIDDEN`. Cửa sổ
   của `/map` là 150 kB — deck.gl một mình đã vượt.
4. **Licence dữ liệu vẫn là ràng buộc cứng** — và dự án đã có tiền lệ rõ ở [docs/MAP.md](file:///Users/macbookpro2015/Kami/Kami3D/docs/MAP.md#L37-L55):
   WDPA **bị từ chối** (phi thương mại, mà site có quảng cáo), IUCN range map **bị từ chối**, GBIF **được nhận**
   (CC BY 4.0 + phải cite DOI của lượt tải). Data2Map phải theo đúng kỷ luật đó:
   - **Google Places (D3): ToS cấm lưu trữ/cache dữ liệu địa điểm ngoài phạm vi cho phép** → **không được seed
     vào DB**. Prompt D3 ghi "mock dữ liệu từ Google Places", nhưng đường đó vừa vi phạm ToS vừa cần API key
     (phá luật "clone mới chạy được không cần key"). Dùng POI **OpenStreetMap qua Overpass** (ODbL, có thật,
     ghi attribution) hoặc dữ liệu mô phỏng có nhãn.
   - **Ảnh vệ tinh (D2)**: mỗi nhà cung cấp một ToS riêng. Phải thêm mục attribution riêng trong
     [lib/map-style.ts](file:///Users/macbookpro2015/Kami/Kami3D/lib/map-style.ts#L30-L36), **không** dùng chung `MAP_ATTRIBUTION` (đang là ODbL 1.0 của
     OpenFreeMap), và provider phải không cần key.
   - **NDVI (D6)**: nguồn thật **có** — Sentinel-2 (Copernicus, attribution "Contains modified Copernicus
     Sentinel data") và Landsat (USGS, public domain).
   - **Dân số (D3)**: WorldPop (CC BY 4.0) hoặc GHSL (JRC) — dùng được, kèm attribution.
5. **Dữ liệu mô phỏng phải tự khai là mô phỏng.** Phase 13 đã đặt khuôn: cờ `"synthetic": true` + `note` mà
   panel render nguyên văn. D3 (footfall theo giờ), D4 (GPS xe), D6 (sản lượng ước tính) **không có nguồn mở** →
   bắt buộc mang cờ đó. Đây là cùng một luật với "không dùng model demo/placeholder" ở Phase 12.
6. **Một WebGL context.** D5 mở ModelViewer 3D cạnh bản đồ; mỗi trang chỉ được có **một** canvas 3D phụ, mount
   theo yêu cầu người dùng, và `dispose()` GLB khi đổi (lỗi R6 trong [docs/REVIEW.md](file:///Users/macbookpro2015/Kami/Kami3D/docs/REVIEW.md) — Phase 17 hybrid vì
   thế vẫn đang 🟡). Dùng [lib/webgl.ts](file:///Users/macbookpro2015/Kami/Kami3D/lib/webgl.ts) đã có để xử lý mất context.
7. **Schema: khuyến nghị giữ `public`.** D1 cho hai lựa chọn (`schema data2map` **hoặc** bảng chung). Một schema
   mới phải được thêm vào **Exposed schemas** trong Supabase rồi mới gọi được qua `supabase.from(...)`, kèm
   grant + RLS + `check-sql` — trong khi cả 12 bảng hiện tại đều ở `public`. Nên chọn **bảng chung có tiền tố**:
   `data2map_layers`, `data2map_datasets`, `data2map_user_prefs`.
8. **RLS theo đúng hai khuôn đang có**: dữ liệu công khai (layers, datasets) = `enable row level security` +
   **một** policy `SELECT to anon, authenticated using (true)` + `grant select`, **không** write policy;
   dữ liệu của người dùng (`user_map_preferences`) = owner-only theo khuôn `user_settings` (đã có đủ
   select/insert/update/delete + `revoke all from anon`). Ghi dữ liệu đi qua `app/api/admin/geodata/route.ts` +
   `lib/supabase-admin.ts` + vai trò `app_admins`/`is_admin()` — **không** mở write policy cho browser.
   Bảng mới phải được thêm vào `check-sql.mjs`.
9. **i18n và SEO phải quyết trước, không sau.** Mọi chuỗi qua `lib/i18n.ts` (đã có); 6 route mới phải vào
   [app/sitemap.ts](file:///Users/macbookpro2015/Kami/Kami3D/app/sitemap.ts) + canonical qua `lib/seo.ts` + JSON-LD qua `components/seo/JsonLd.tsx`
   — hoặc chủ động `noindex` nếu Data2Map là B2B nội bộ. Không có trạng thái "quên".

---

### Phase D1 — Data2Map Foundation

**Mục tiêu**: mục menu mới, layout riêng, trang chủ module với 5 card, và bảng dữ liệu dùng chung cho các sản
phẩm con — **trên nền hạ tầng bản đồ đã có**, không dựng lại.

**Prompt để triển khai Phase D1**:

````markdown
Phase D1 – Data2Map Foundation cho Kami3D.

Tạo hạ tầng dùng chung cho module Data2Map:

1. Thêm mục menu "Data2Map" vào Navbar chính của Kami3D.
2. Tạo layout riêng: `app/data2map/layout.tsx`
3. Tech stack bắt buộc:
   - MapLibre GL JS hoặc Mapbox GL JS + react-map-gl
   - Deck.gl (Heatmap, Hexagon, Cluster, Isochrone…)
   - Supabase + PostGIS
   - Turf.js
   - Tailwind + Shadcn UI + Framer Motion (giữ style Kami3D)

4. Component cốt lõi cần có:
   - `components/data2map/BaseMap.tsx` (map tái sử dụng, dark theme)
   - `components/data2map/LayerControl.tsx` (bật/tắt layer + opacity)
   - `components/data2map/MapLegend.tsx`
   - `components/data2map/MapSearch.tsx`
   - Hook `useData2Map` và Context để quản lý layer state

5. Database:
   - Bật PostGIS
   - Tạo schema `data2map` hoặc các bảng chung: `map_layers`, `map_datasets`, `user_map_preferences`

6. Trang landing: `app/data2map/page.tsx` giới thiệu 5 sản phẩm con với card đẹp.

Yêu cầu: Code production-ready, TypeScript strict, UI đồng bộ Kami3D (Glassmorphism + Dark).
````

**Ràng buộc riêng của D1**:

1. **Không tạo `components/data2map/BaseMap.tsx`** (xem bảng đối chiếu phía trên). Nếu bạn muốn tên thư mục
   `data2map` cho rõ ràng, cách đúng là **di chuyển** `components/map/*` sang tên dùng chung rồi cập nhật import
   một lần — không phải copy thành hai bản.
2. **Menu**: `Navbar` hiện có `GuestMenu`, `UserMenu`, `SettingsMenu` ([components/layout](file:///Users/macbookpro2015/Kami/Kami3D/components/layout)) — thêm một
   mục + 5 link con mà không làm vỡ menu mobile đang chạy.
3. **`/data2map` không được nạp MapLibre.** Landing chỉ có card → budget giữ mức thấp; nạp bản đồ ở đây là tự
   phá cửa sổ 150 kB của chính mình.
4. **Ba bảng mới theo tiền tố `data2map_`** trong `public`, RLS theo ràng buộc chung #8, `data2map_user_prefs`
   owner-only. `map_layers` nên là **registry** (id, tên, kind, nguồn, licence, năm, bật/tắt mặc định) để
   LayerPanel render từ DB thay vì hard-code 5 lần ở 5 trang.
5. **Tái dùng `lib/map-query.ts`**: thêm layer mới cho Data2Map mà **không** sửa contract cũ đang bị
   `check:map` khoá — nếu cần namespace thì mở rộng danh sách layer hợp lệ, đừng viết parser mới.
6. **`docs/DATA2MAP.md`** là nơi ghi lại quyết định dữ liệu/licence, đúng khuôn [docs/MAP.md](file:///Users/macbookpro2015/Kami/Kami3D/docs/MAP.md) — module
   mới mà không có tài liệu thì sáu tháng sau sẽ có người thêm lại deck.gl.

---

### Phase D2 — Real Estate & Zoning Overlay

**Mục tiêu**: `/data2map/real-estate` — heatmap giá đất, overlay quy hoạch (kể cả trên nền vệ tinh), tiện ích
xung quanh, nguy cơ ngập, ô nhiễm, panel bật/tắt + opacity, click ra chi tiết và "điểm tiềm năng".

**Prompt để triển khai Phase D2**:

````markdown
Triển khai Phase D2 – Real Estate & Zoning Overlay trong module Data2Map của Kami3D.

Tạo trang: `/data2map/real-estate`

Tính năng bắt buộc:
1. Heatmap giá đất theo khu vực
2. Layer quy hoạch sử dụng đất (có thể overlay lên satellite)
3. Layer tiện ích xung quanh (trường học, bệnh viện, chợ, công viên…)
4. Layer nguy cơ ngập lụt theo mùa
5. Layer ô nhiễm tiếng ồn / không khí (nếu có dữ liệu)
6. Panel bật/tắt từng lớp + chỉnh độ mờ
7. Click vào thửa đất/khu vực → hiện thông tin chi tiết + điểm tiềm năng

Dữ liệu đầu vào giả định: GeoJSON giá đất, quy hoạch, tiện ích, ngập lụt.

Yêu cầu kỹ thuật:
- Dùng Deck.gl HeatmapLayer + GeoJsonLayer
- Hỗ trợ chuyển đổi giữa Map và Satellite
- Responsive, có legend rõ ràng
- Tích hợp với BaseMap ở Phase D1

Trả về đầy đủ: page, các component layer, ví dụ dữ liệu GeoJSON mẫu, và cách thêm dữ liệu thật sau này.
````

**Ràng buộc riêng của D2**:

1. **Giá đất và quy hoạch Việt Nam không có GeoJSON mở.** Bảng giá đất công bố dạng văn bản/quyết định, quy hoạch
   sử dụng đất hầu như không phát hành dạng máy đọc được. Nên thiết kế theo hướng **upload là đường chính**
   (dùng lại pipeline admin ở ràng buộc #8), còn dữ liệu mẫu thì phải mang cờ `synthetic`. Đừng dựng UI giả
   định rằng dữ liệu này sẽ "có sau".
2. **Nguồn thật khả thi duy nhất trong 6 lớp là tiện ích** — lấy từ **OpenStreetMap qua Overpass**
   (`amenity=school|hospital|marketplace`, `leisure=park`), licence **ODbL**, phải ghi attribution. Đây là lớp
   nên làm trước để trang có dữ liệu thật.
3. **Heatmap giá đất dùng layer `heatmap` native của MapLibre** (đúng cách `/map` đang vẽ mật độ GBIF). Không
   thêm deck.gl cho một heatmap.
4. **Satellite**: provider phải keyless + có attribution riêng (ràng buộc #4). Kiểm tra ToS trước khi mặc định —
   ảnh vệ tinh là loại dữ liệu dễ vi phạm nhất.
5. **"Điểm tiềm năng" phải là hàm thuần có test** trong `lib/data2map/score.ts` + một suite `check:` — đúng khuôn
   `lib/risk.ts` của Phase 15. Con số hiển thị cho người dùng quyết định mua thì càng phải test được.
6. **Ô nhiễm tiếng ồn/không khí**: Việt Nam có một số trạm quan trắc công khai nhưng không có lớp dạng
   polygon/LiDAR mở → nhiều khả năng phải **bỏ layer** hoặc chỉ hiển thị điểm trạm có nguồn + giờ đo.

---

### Phase D3 — Footfall & Trend Map

**Mục tiêu**: `/data2map/trends` — hotspot F&B đang lên, lọc theo loại hình, công cụ chọn vị trí ("khoảng trống
thị trường"), lớp mật độ dân cư + lưu lượng, thanh thời gian theo giờ/ngày.

**Prompt để triển khai Phase D3**:

````markdown
Triển khai Phase D3 – Footfall & Trend Map trong Data2Map.

Tạo trang: `/data2map/trends`

Tính năng chính:
1. Hotspot Map thời gian thực (hoặc gần thực) các quán F&B đang trendy
2. Lọc theo loại hình: Cafe, Trà sữa, Nhà hàng, Bakery…
3. Site Selection Tool:
   - Người dùng chọn loại hình kinh doanh
   - Map hiển thị "khoảng trống thị trường" (mật độ dân cao + ít đối thủ)
4. Density layer mật độ dân cư + lưu lượng giao thông
5. Click vào hotspot → hiện đánh giá, số check-in, xu hướng gần đây

Kỹ thuật:
- Deck.gl HeatmapLayer + ScatterplotLayer + HexagonLayer
- Có thể mock dữ liệu từ Google Places / giả lập
- Có thanh thời gian (theo giờ hoặc theo ngày) để xem xu hướng

UI phải đẹp, phù hợp với giới trẻ và chủ doanh nghiệp.
````

**Ràng buộc riêng của D3**:

1. **Không dùng Google Places để lưu dữ liệu** (ràng buộc #4) — vừa vi phạm ToS vừa cần key. Đường thật:
   POI F&B từ **OSM/Overpass** (ODbL) làm nền, phần "đang trendy / số check-in / đánh giá" thì **mô phỏng có
   nhãn** vì không có nguồn mở nào cho Việt Nam.
2. **"Thời gian thực" là lời hứa không giữ được** với dữ liệu mở. Đổi nhãn UI thành đúng bản chất (ví dụ "mật độ
   POI theo giờ trong ngày, dữ liệu mô phỏng") thay vì để người dùng tin đây là số liệu sống.
3. **Hexagon làm được bằng Turf + layer `fill`** (`turf.hexGrid` + `interpolate` gán giá trị) — không cần
   `HexagonLayer` của deck.gl.
4. **Site Selection là hàm thuần có test**: đầu vào = lưới mật độ dân + số đối thủ trong bán kính, đầu ra = điểm.
   Đặt ở `lib/data2map/` cùng test; tái dùng `turf.buffer`/`booleanPointInPolygon`.
5. **Mật độ dân dùng nguồn thật** (WorldPop CC BY 4.0 / GHSL) — nhưng đây là raster, cần tiền xử lý thành tile
   hoặc vector hoá theo ô lưới; chốt cách làm trước khi code UI.
6. **Lưu lượng giao thông**: không có nguồn mở cho Việt Nam → nếu đưa vào thì là lớp mô phỏng có nhãn, hoặc bỏ.

---

### Phase D4 — Logistics & Fleet Visualizer

**Mục tiêu**: `/data2map/logistics` — isochrone 15/30/45/60 phút từ kho, cụm điểm giao, vị trí xe (GPS mock),
gom đơn + gợi ý tuyến, lớp giao thông.

**Prompt để triển khai Phase D4**:

````markdown
Triển khai Phase D4 – Logistics & Fleet Visualizer trong Data2Map.

Tạo trang: `/data2map/logistics`

Tính năng bắt buộc:
1. Isochrone Map: từ một kho, hiển thị vùng phủ trong 15 / 30 / 45 / 60 phút
2. Density Clusters điểm giao hàng
3. Hiển thị vị trí xe (mock GPS)
4. Công cụ gom đơn (clustering) và gợi ý lộ trình tối ưu cơ bản
5. Layer tình trạng giao thông (nếu có)

Kỹ thuật:
- Dùng isochrone từ Mapbox Isochrone API hoặc tự tính bằng Turf + OSRM giả lập
- Deck.gl ClusterLayer + ArcLayer / TripsLayer
- Panel điều khiển thời gian và chọn kho

Tập trung vào giá trị giảm chi phí vận hành cho doanh nghiệp logistics.
````

**Ràng buộc riêng của D4**:

1. **Mapbox Isochrone API bị loại** vì cần access token — vi phạm luật "clone mới chạy được không cần key" đã
   ghi rõ trong [lib/map-style.ts](file:///Users/macbookpro2015/Kami/Kami3D/lib/map-style.ts#L1-L21). Ba đường còn lại, phải chọn và ghi rõ:
   **(a)** Turf `buffer` + `isobands` → xấp xỉ theo khoảng cách, **không** phản ánh đường bộ (phải ghi rõ trong UI);
   **(b)** tự dựng graph từ OSM + Dijkstra → đúng hơn, nặng hơn; **(c)** self-host OSRM/Valhalla → đúng nhất,
   nhưng là hạ tầng mới. Với D4, (a) là đủ nếu nhãn trung thực; nói "vùng phủ 30 phút" khi chỉ là bán kính
   30 phút sẽ khiến người dùng ra quyết định sai.
2. **Cluster bằng MapLibre native** (`cluster: true`, `clusterRadius`) — không cần `ClusterLayer`.
   Arc/Trips animation làm bằng `line` layer + `requestAnimationFrame` (Phase 16 đã làm đúng cách này cho
   seasonal path).
3. **Gom đơn + tuyến tối ưu là thuật toán trong `lib/`**: nearest-neighbour + 2-opt là đủ cho quy mô demo, viết
   hàm thuần + test. Không cần thư viện solver.
4. **GPS mock phải gắn cờ mô phỏng** và **không** lưu vết vị trí thật của bất kỳ ai — đây là dữ liệu cá nhân, khác
   hẳn loại dữ liệu công khai của các phase trước.
5. **Lớp giao thông**: không có nguồn mở cho Việt Nam → mô phỏng có nhãn, hoặc bỏ.

---

### Phase D5 — Cultural & Story Maps

**Mục tiêu**: `/data2map/stories` — timeline bản đồ (1800 → nay), điểm di tích kèm câu chuyện/ảnh/audio, mở
ModelViewer 3D hoặc ảnh 360, chế độ Story Mode tự chạy.

**Prompt để triển khai Phase D5**:

````markdown
Triển khai Phase D5 – Cultural & Story Maps trong Data2Map.

Tạo trang: `/data2map/stories`

Tính năng chính:
1. Timeline Map: thanh thời gian kéo được (ví dụ 1800 → 2026). Khi kéo, bản đồ thay đổi ranh giới, sự kiện, giao diện.
2. Các điểm di tích gắn câu chuyện, hình ảnh, audio.
3. 3D Virtual Tour: click vào di tích → mở ModelViewer 3D (tái sử dụng component 3D của Kami3D) hoặc ảnh 360.
4. Chế độ "Story Mode": tự động dẫn người dùng qua các điểm theo câu chuyện.

Yêu cầu đặc biệt:
- Kết hợp mạnh với hệ thống 3D hiện có của Kami3D
- Animation mượt khi chuyển năm
- Hỗ trợ cả desktop và mobile

Đây là phase thể hiện rõ nhất sự kết hợp giữa Data2Map và thế mạnh 3D gốc của Kami3D.
````

**Ràng buộc riêng của D5**:

1. **Timeline đã có, đừng viết lại.** [components/map/TimelinePanel.tsx](file:///Users/macbookpro2015/Kami/Kami3D/components/map/TimelinePanel.tsx) + [lib/timeline.ts](file:///Users/macbookpro2015/Kami/Kami3D/lib/timeline.ts) +
   `lib/timeline-data.ts` (Phase 16) đã xử lý thanh thời gian, annotation và phát animation. D5 chỉ đổi
   **nguồn dữ liệu** (di tích thay vì range động vật) — không dựng slider thứ hai.
2. **3D dùng lại `ModelViewer`/`LazyViewers`**, một WebGL context (ràng buộc #6), và `dispose()` GLB. Đây đúng
   là phần Phase 17 hybrid còn 🟡 — nên D5 thừa hưởng luôn việc còn lại đó thay vì làm hai lần.
3. **Ảnh và audio di tích: dùng Wikimedia Commons** (phần lớn CC BY-SA / CC0) → bắt buộc attribution + tôn trọng
   share-alike, dùng lại khuôn [lib/attribution.ts](file:///Users/macbookpro2015/Kami/Kami3D/lib/attribution.ts) và bucket Storage hiện có. Không nhúng ảnh
   "sưu tầm" không rõ nguồn.
4. **"Story Mode" autoplay phải tôn trọng `reduce_motion`** (setting Phase 11) và `prefers-reduced-motion` — đây
   là chuyển động liên tục tự chạy, đúng loại phải tắt theo yêu cầu người dùng.
5. **Ảnh 360**: cần thư viện riêng (`@photo-sphere-viewer` ~vài chục kB) — phải khai vào budget, và chỉ nạp khi
   người dùng bấm mở.

---

### Phase D6 — Agri Geo-Analytics Dashboard

**Mục tiêu**: `/data2map/agriculture` — bản đồ sức khỏe cây trồng (NDVI), lớp độ ẩm/nhiệt độ/mưa, phân bố nguồn
cung theo tỉnh + mùa thu hoạch, lọc theo cây trồng/thời gian, click ra sản lượng ước tính + khuyến nghị, dashboard
số liệu cạnh bản đồ.

**Prompt để triển khai Phase D6**:

````markdown
Triển khai Phase D6 – Agri Geo-Analytics trong Data2Map.

Tạo trang: `/data2map/agriculture`

Tính năng:
1. Bản đồ sức khỏe cây trồng (NDVI) theo màu sắc trên từng thửa/vùng
2. Layer độ ẩm đất, nhiệt độ, lượng mưa
3. Bản đồ phân bố nguồn cung nông sản theo tỉnh/huyện + mùa thu hoạch
4. Công cụ lọc theo loại cây trồng và thời gian
5. Click vào vùng → hiện sản lượng ước tính, thời điểm thu hoạch, khuyến nghị

Kỹ thuật:
- Hiển thị raster (NDVI) hoặc vector đã xử lý
- Legend màu chuẩn nông nghiệp
- Có thể dùng Deck.gl hoặc MapLibre raster source
- Dashboard bên cạnh map hiển thị số liệu tổng hợp

Hướng tới đối tượng: thương lái, hợp tác xã, nông dân công nghệ.
````

**Ràng buộc riêng của D6**:

1. **Đây là phase đắt nhất — và nên tách raster ra khỏi phần vector.** NDVI/độ ẩm/nhiệt độ/mưa là **raster**;
   MapLibre hiển thị raster qua `raster` source cần URL tile XYZ. Dự án **chưa có hạ tầng tile nào** (mọi thứ
   hiện tại là vector GeoJSON từ PostGIS). Nghĩa là D6 cần thêm: pipeline tiền xử lý (Sentinel-2 / Landsat /
   ERA5) → tiles → Storage/CDN, có chi phí lưu trữ và băng thông. Nếu chưa sẵn sàng, hãy làm phần **vector**
   trước (vùng trồng, nguồn cung theo tỉnh) và để raster thành phase riêng.
2. **Nguồn thật, dùng được**: Sentinel-2 (Copernicus — attribution "Contains modified Copernicus Sentinel data"),
   Landsat (USGS, public domain), ERA5/CHIRPS cho mưa. Không cần bịa, nhưng cần xử lý.
3. **Thang màu NDVI phải là hàm thuần + test** (`lib/data2map/ndvi.ts`): NDVI ∈ [-1, 1], dải màu chuẩn nông
   nghiệp, và phải trả `null` cho pixel mây/nước thay vì vẽ thành "cây trồng khỏe".
4. **"Sản lượng ước tính" và "khuyến nghị" phải nói rõ là ước tính**: ghi công thức + nguồn tham số ngay trong UI,
   và test công thức. Đây là con số người dùng dùng để mua bán — không được trình bày như số liệu chính thức.
5. **"Mùa thu hoạch theo tỉnh" không có nguồn mở chuẩn hoá** → phải ghi nguồn hoặc đánh dấu mô phỏng.
6. **Dashboard dùng lại `components/stats/*`** (`DailyBars`, `Sparkline`) đã có từ Phase 4 — không viết lại chart.

---

## ✅ Phase D1 — Kết quả: Data2Map Foundation

**Trạng thái: đã giao.** Mục menu riêng, layout riêng, trang chủ module, ba bảng dữ liệu và một registry mà các
phase sau sẽ đọc — **trên hạ tầng bản đồ đã có**, không dựng lại (đúng bảng đối chiếu ở đầu module).

### 1. Không tạo hạ tầng thứ hai

| Prompt D1 yêu cầu | Thực tế dùng |
| --- | --- |
| `components/data2map/BaseMap.tsx` | `components/map/BaseMap.tsx` (MapLibre, style keyless, controls native) |
| `LayerControl.tsx` | `components/map/LayerPanel.tsx`, nay đọc từ registry |
| `MapSearch.tsx` | `lib/map-query.ts` (URL là state, đã có `check:map` khoá) |
| `useData2Map` + Context | `lib/map-layers.ts` (zustand) — một store, một nguồn sự thật cho mỗi công tắc |
| Bật PostGIS | đã có từ Phase 13 |

Deck.gl **không được thêm** — MapLibre đã có heatmap/cluster/circle/fill/line/fill-extrusion, Turf đã là
dependency. Lý do và ngưỡng để cân nhắc lại đã ghi ở [docs/DATA2MAP.md](docs/DATA2MAP.md).

### 2. Ba bảng, và registry là bảng thật

- `data2map_datasets` — provenance: source, licence, năm, geometry kind, record count, `synthetic`, `note`, `status`.
- `data2map_layers` — registry mà panel render từ đó, `id` là token trên URL.
- `data2map_user_prefs` — công tắc của người dùng, owner-only đủ 4 lệnh, `revoke all from anon`.

Hai bảng đầu: RLS + **một** policy `SELECT to anon, authenticated using (true)` + `revoke`/`grant select`, không có
write policy — đúng khuôn chung #8. Đã áp lên DB và seed: **9 dataset, 10 layer**.

### 3. Licence: quyết trước khi ghi dữ liệu

`data2map_datasets.license` là bảng **duy nhất** chấp nhận `ODbL` — vì POI và đường của OpenStreetMap (ODbL) là
nguồn thật cho amenity/road, dùng kèm attribution và fetch theo view thay vì lưu thành CSDL dẫn xuất. Các bảng
động vật giữ nguyên luật hai giá trị. **Google Places bị từ chối** (ToS cấm cache + cần API key), đúng như prompt D3
đã cảnh báo. Bảng giá đất và quy hoạch Việt Nam không có dạng máy đọc được → đường chính là **upload** qua pipeline
admin Phase 17, còn dữ liệu mẫu mang cờ `synthetic`.

### 4. Dữ liệu mô phỏng tự khai

`synthetic: true` + `note` bắt buộc, và `check:data2map` **fail** nếu một dataset mô phỏng thiếu note. Landing page
in nhãn "simulated" trong bảng registry (8 chỗ trên trang) — cùng luật với envelope demo ở Phase 13.

### 5. Bằng chứng

- `npm run check:suites`: **276 test** (thêm 9 của `check:data2map`); `tsc` sạch; build xanh.
- **`/data2map` 104.6 kB** JS khởi đầu (ngân sách 115, đo rồi mới đặt) — và `check:bundle` xác nhận **không có**
  `maplibre-gl`/`MaplibreMap` trong chunk đầu của route này. Đây là route duy nhất của module không vẽ gì.
- `/map` 135.7 kB (ngân sách 150) — thêm `/data2map` vào `ROUTES` không làm phình route cũ.
- Chrome thật: tiêu đề, 5 card sản phẩm, 9 dòng registry, nhãn simulated, và mục **Data2Map** trong navbar.
- `check:data2map` khoá thêm ba thứ dễ hỏng: sản phẩm `live` **phải** có `app/data2map/<route>/page.tsx`; sản phẩm
  `planned` **không được** có sẵn page (nếu có thì phải đổi status); và `/data2map` + mọi sản phẩm live phải nằm
  trong `app/sitemap.ts` (phát hiện luôn: `/map` từ Phase 13 vẫn thiếu trong sitemap → đã thêm).

### 6. Tiếp theo

D2 (Real Estate & Zoning) — nơi registry bắt đầu có dữ liệu thật: `land_price` và `zoning` là mô phỏng có nhãn,
`amenity` lấy từ Overpass, và trạng thái dataset chuyển từ `planned` sang `live` khi pipeline chạy.

---

## ✅ Phase D2 — Kết quả: Real Estate & Zoning

**Trạng thái: đã giao.** `/data2map/real-estate` với heatmap giá đất, quy hoạch, ngập, **tiện ích thật từ OSM**, và
potential score in ra từng input. Đây là trang Data2Map đầu tiên vẽ bản đồ.

### 1. Cái gì thật, cái gì mô phỏng có nhãn

| Layer | Nguồn | Thật? |
| --- | --- | --- |
| Amenity | OpenStreetMap qua Overpass, ODbL | **thật — 280 POI** trong khung nhìn mẫu (đã gọi API thật) |
| Land price | `data/data2map-real-estate.json` (hex grid sinh bằng Turf) | mô phỏng, `synthetic: true` + note |
| Zoning | cùng file | mô phỏng |
| Flood | cùng file, có return period mỗi dải | mô phỏng |
| Ô nhiễm khí/tiếng ồn | — | **không vẽ**: VN có trạm quan trắc, không có polygon; suy diễn ra một lớp là nói dối có hình |

Đúng ràng buộc #1: giá đất và quy hoạch VN không có dạng máy đọc được, nên **upload là đường chính** (pipeline admin
Phase 17), dữ liệu mẫu mang cờ mô phỏng, và trang **không** giả định dữ liệu thật sẽ "có sau": panel "Not drawn"
nói rõ vì sao thiếu và cách thay bằng dữ liệu thật.

### 2. Amenity: lớp thật duy nhất, và vì sao không lưu

`app/api/data2map/amenities` hỏi Overpass theo khung nhìn, trả GeoJSON, **không lưu gì** (ODbL: hiển thị kèm
attribution thì được, tích thành CSDL riêng thì không). Lần chạy đầu tiên, Overpass chính trả **504** — endpoint đã
xử lý đúng (503 + giải thích, các lớp khác vẫn chạy), và tôi thêm **danh sách mirror** (`OVERPASS_URL` trước, cho
instance tự host): lần chạy lại trả **200, 280 feature, 51 KB**.

### 3. Heatmap và satellite

- Heatmap giá đất dùng **layer `heatmap`/`fill` native của MapLibre** với ramp nội suy theo `price_vnd_m2` (đúng
  ràng buộc #3) — không thêm deck.gl.
- Satellite là **raster layer của NASA EOSDIS GIBS** (public domain, không cần key) phủ lên style tối, kèm ghi chú
  trong panel rằng đó là ảnh daily từ một snapshot cố định, không phải ảnh khảo sát. Nhà cung cấp độ phân giải cao
  cần key → phá luật "clone mới không cần gì", nên không đặt mặc định (ràng buộc #4).

### 4. Potential score: hàm thuần, có test

`lib/data2map/score.ts` + `check:score` (**12 test**): giá so với median vùng 30 · tiện ích trong 1 km 30 · dải ngập
25 (đảo chiều: rủi ro thấp điểm cao) · quy hoạch + FAR 15.

Hai luật giống hệt risk index Phase 15: **input thiếu là thiếu** (bị loại khỏi trung bình, panel in % trọng số đã
dùng và tên input thiếu), và **nó nói rõ nó là gì** — "a Kami3D index, not an appraisal" đặt ngay cạnh trọng số.
Test khoá chiều tác động của từng input, cap tiện ích (4 trường không bằng 4× 1 trường), median, và input vô lý.

### 5. Chia sẻ, không fork

- `components/map/LayerPanel.tsx` nay **generic theo id** và nhận danh sách layer từ registry → `/map` giữ nguyên
  hành vi, Data2Map truyền 4 layer của mình. Đúng ràng buộc D1 #1.
- `components/data2map/RealEstateCanvas.tsx` chỉ dùng `BaseMap` dùng chung + Source/Layer của nó; `react-map-gl`
  vẫn chỉ nằm trong chunk lazy.
- `pointInRing`/`pointInPolygon` được thêm vào `lib/geo.ts` (**12 dòng ray casting, có test**) thay vì kéo Turf vào
  client chỉ để hỏi "điểm này nằm trong hex nào".

### 6. Bằng chứng

- `npm run check:suites`: **289 test** (thêm 12 của `check:score` và 1 của `check-geo`); `tsc` sạch; build xanh.
- **`/data2map/real-estate` 127.1 kB** (ngân sách 135, đặt sau khi đo); `/data2map` vẫn **104.6 kB** — landing không
  bị kéo theo bản đồ.
- Registry: 4 dataset của real_estate chuyển `live`, thêm `flood-demo`; tổng **10 dataset, 10 layer** trong DB.
- API amenity trả **280 POI thật** kèm attribution ODbL; trang trả 200 với đủ layer, ghi chú satellite và panel
  "Not drawn".

### 7. Tiếp theo

Thứ tự còn lại: **D5 → D3 → D4 → D6**. D5 (story maps) rẻ nhất vì tái dùng timeline Phase 16 + viewer 3D, nhưng
phải giữ ràng buộc "một WebGL context": mở viewer thì unmount bản đồ trên màn hình nhỏ.

---

## ✅ Phase D5 — Kết quả: Cultural & Story Maps

**Trạng thái: đã giao.** `/data2map/stories`: 8 địa danh Việt Nam, timeline tái dùng của Phase 16, ảnh thật từ
Wikimedia Commons kèm credit đầy đủ.

### 1. Không viết lại timeline

Đúng ràng buộc #1: `RangeTimeline` + `lib/timeline.ts` của Phase 16 được dùng nguyên trạng — D5 chỉ đổi **nguồn dữ
liệu**, qua `storyToTimelineEvent()` biến một story thành đúng shape `TimelineEvent` mà panel đang nhận. Có test
khoá contract đó (`check:stories`, 9 test).

**Story mode** chính là nút play đó, và nó **từ chối chạy** khi người dùng đã xin giảm chuyển động (`prefers-reduced-motion`
hoặc setting `reduce_motion` Phase 11) — nút bị vô hiệu hoá kèm tooltip nói lý do (ràng buộc #4).

### 2. Ảnh: Commons, có ghi licence

`scripts/fetch-stories.mjs` tìm ảnh theo từ khoá trên Commons, **chỉ nhận** CC0/public domain/CC BY/CC BY-SA, và ghi
lại file page + tác giả + **đúng nhãn licence**. Kết quả cho 8 địa danh: **2 public domain, 1 CC0, 2 CC BY, 3 CC BY-SA**
— đã kiểm một URL ảnh trả HTTP 200. Share-alike là điều kiện sử dụng nên credit được render ở cả panel lẫn lightbox.

Trường `artist` của Commons có trường hợp dài 300 ký tự toàn ghi chú licence → script rút thành credit đọc được.
Câu chuyện (8 đoạn) là **văn của chúng tôi**, mỗi đoạn dẫn nguồn — cùng luật với timeline động vật.

### 3. Chỗ 3D: để trống một cách trung thực

Prompt yêu cầu mở ModelViewer 3D hoặc ảnh 360. Dự án **có model động vật, không có model di tích**, và 360 thì cần
cả thư viện lẫn nguồn ảnh 360 — nên panel **nói ra điều đó** thay vì hiện nút mở không có gì, và route không mount
canvas thứ hai nào (thoả ràng buộc "một WebGL context" bằng cách không cần context). Khi có model di tích, nó vào
bằng pipeline admin và nút sẽ xuất hiện.

### 4. Một lỗi thật trong công cụ đo bundle

Khi build xong rồi `next start`, tôi phát hiện `check:bundle` báo **thiếu chunk list** cho `/map`: server production
**ghi đè** `.next/app-build-manifest.json` bằng vài entry nó cần. Tệ hơn: khi tôi thử fallback sang
`page_client-reference-manifest.js`, `/map` ra **62.9 kB** so với **136.9 kB** đo từ build manifest — tức là đo
đúng một nửa. Tôi **bỏ fallback** và để nó fail to và rõ ("run the build again with no server running"), vì một
trần ngân sách đo thiếu còn tệ hơn một trần không trả lời.

Đồng thời ba route Data2Map được chuyển sang đo bằng **HTML** như mọi route khác (chúng là static), và số thật hoá ra
**cao hơn** số cũ (131.2 / 144.2 / 141.2 thay vì 104.6 / 127.1 / 127.4) — vì danh sách trong manifest thiếu các chunk
dùng chung. Ngân sách đã đặt lại theo số đo đúng kèm ghi chú.

### 5. Bằng chứng

- `npm run check:suites`: **298 test** (thêm 9 của `check:stories`); `tsc` sạch; build xanh.
- `npm run check:bundle`: `/map` 136.9 (150) · `/data2map` 131.2 (140) · `/data2map/real-estate` 144.2 (155) ·
  `/data2map/stories` 141.2 (150) — không route nào nạp MapLibre sai chỗ.
- Trang trả 200 với tiêu đề, tên địa danh, timeline, khối "Story mode", credit Wikimedia và nhãn CC BY-SA.
- Registry: `stories-curated` chuyển `live`; sản phẩm D5 chuyển `live` trên landing (⇒ tự vào sitemap).

### 6. Tiếp theo

**D3 → D4 → D6.** D3 (footfall) phải nhớ ràng buộc: Google Places **bị cấm** (ToS) → dùng POI OpenStreetMap qua
Overpass hoặc dữ liệu mô phỏng có nhãn, và timeline theo giờ cũng phải tôn trọng `reduce_motion`.

---

## ✅ Phase D3 — Kết quả: Footfall & Trend Map

**Trạng thái: đã giao.** `/data2map/trends`: lưới hex 162 ô phủ TP.HCM, **mật độ dân số thật** (WorldPop
2020), **quán ăn/uống thật** (OpenStreetMap), lớp footfall theo giờ **mô phỏng có nhãn**, đồng hồ 24 giờ và
điểm "khoảng trống thị trường" nói rõ từng đầu vào.

### 1. Hai nửa thật/giả nằm trên **cùng một feature** — và không được lẫn vào nhau

Đây là rủi ro lớn nhất của phase: một con số thật (dân số) và một con số bịa (footfall) nằm cạnh nhau trong
cùng một dòng dữ liệu. Cách chặn:

- mỗi feature mang **hai bộ provenance riêng** (`population_source`/`population_license` = WorldPop/CC BY 4.0;
  `footfall_source`/`footfall_license` = Kami3D synthetic/CC0) + cờ `synthetic: true` + `note`;
- file ghi `properties.provenance` cho cả hai nửa, và `readTrendsSample()` **ném lỗi** nếu thiếu (có test);
- panel in nguồn + licence ngay dưới tên metric, và popup ghi "simulated" cạnh đúng con số mô phỏng.

### 2. Dân số thật **không cần raster, không cần GDAL**

WorldPop là raster — nhưng API `api.worldpop.org/v1/services/stats` trả **tổng dân số trong một polygon**,
không cần key. `scripts/fetch-trends.mjs` dựng lưới hex bằng Turf, hỏi từng ô, và commit con số vào
`data/data2map-trends.json`. Raster không hề vào repo, không thêm dependency nào.

Bài học vận hành (đã ghi vào script):

- đường **async** nhanh hơn hẳn đường đồng bộ: `runasync=false` trả lời tại chỗ nhưng ~100 giây/polygon khi
  có vài chục request bay cùng lúc (một run 4 tiếng); submit task rồi poll mất ~25 giây cho 4 ô;
- **16 worker là sai**: 22 kết quả và 48 lỗi trong 20 phút, vì task xếp hàng server-side và cửa sổ poll 3
  phút hết hạn trước khi task chạy xong. 4 worker + poll 5 phút thì chạy hết;
- run **resumable**: mỗi 10 ô ghi checkpoint kèm `partial: true`, lần chạy sau chỉ hỏi ô còn thiếu, và
  `--check` từ chối một file vẫn đang là checkpoint.

### 3. Lời hứa "real-time" bị **đổi nhãn**, Google Places bị từ chối lần nữa

Prompt yêu cầu "hotspot thời gian thực, mock từ Google Places". Không nửa nào giữ được: ToS của Google cấm
lưu dữ liệu địa điểm (ràng buộc #4 của module) và cần key (phá luật "clone mới chạy không cần key"), còn
footfall theo giờ thì không ai công bố. Nên: **địa điểm lấy từ OSM**, **độ sôi động là mô phỏng và tự khai**,
và trang ghi cả hai nguồn cạnh nhau thay vì trộn thành một con số nghe rất chắc.

### 4. Không cần deck.gl (đúng như quyết định ở [docs/DATA2MAP.md](docs/DATA2MAP.md))

Hexagon = `turf.hexGrid` + layer `fill` với `interpolate` neo theo **giá trị lớn nhất đang hiển thị**, nên một
giờ vắng vẫn đọc được thay vì tối đều. Heatmap/cluster của MapLibre không dùng tới. Marker `maplibre-gl` /
`MaplibreMap` trong `FORBIDDEN` vẫn chặn renderer rò sang route khác.

### 5. Đồng hồ là của Phase 16, không phải slider thứ hai

`RangeTimeline` được **tham số hoá** thêm 3 prop tuỳ chọn (`format`, `labels`, `stepMs`) thay vì viết bản sao:
bản đồ động vật bước theo **năm**, trang trends bước theo **giờ**, còn số liệu, hành vi bàn phím và luật
`reduce_motion` vẫn là một đoạn code duy nhất.

### 6. Chấm điểm "khoảng trống" — và chỗ nó nói ra điều mình thiếu

`lib/data2map/footfall.ts` (17 test) + `lib/data2map/trends.ts` (9 test) + `lib/overpass.ts` (7 test):

| Đầu vào | Trọng số | Nguồn |
| --- | --- | --- |
| Demand | 45 | **thật** — mật độ dân số WorldPop, thang log bão hoà ở 30.000/km²; chỉ rơi về footfall mô phỏng khi thiếu density, và panel in rõ nó đã dùng nguồn nào |
| Supply | 40 | **thật** — số đối thủ OSM trong 1 km quanh ô vừa click (truy vấn riêng, không phụ thuộc zoom) |
| Access | 15 | **thiếu**, và được báo là thiếu chứ không tính bằng 0 |

### 7. Bằng chứng

- `npm run check:suites`: bổ sung 33 test (17 footfall + 9 trends + 7 overpass).
- `npm run data2map:seed`: 11 dataset / 11 layer; `population-worldpop` và `footfall-demo` chuyển `live`,
  thêm dataset ODbL `fb-pois-osm`; sản phẩm D3 chuyển `live` trên landing (⇒ tự vào sitemap).
- `/api/data2map/pois` trả **800 POI thật** cho một khung 4×3 km (cafe 305 · trà sữa 8 · nhà hàng 453 ·
  bakery 34), có `counts`, `license: ODbL`, `truncated` và cache 1 giờ.
- Lưới hex: **162 ô** cạnh 1 km, dân số **302–170.927 người/ô**, mật độ **116–65.786 người/km²**
  (WorldPop 2020), tổng **6.444.826 người** trong khung 27×18 km — đo thật, không ước lượng.

### 8. Tiếp theo

**D4 → D6.** D4 phải nhớ: isochrone bằng `turf.buffer/isobands` (Mapbox Isochrone API cần token → bị cấm),
cluster bằng `cluster: true` của MapLibre, thuật toán gom đơn/2-opt là **hàm thuần có test**, và GPS phải là
mock có nhãn.

---

## ✅ Phase D4 — Kết quả: Logistics & Fleet Visualizer

**Trạng thái: đã giao.** `/data2map/logistics`: 3 kho, 180 điểm giao, 6 xe, dải phủ 15/30/45/60 phút, đồng hồ
theo giờ và một bộ kế hoạch chạy được ngay trên trình duyệt.

### 1. Dữ liệu mô phỏng ở đây là vì **quyền riêng tư**, không phải vì licence

Đây là điểm khác biệt so với mọi phase trước: địa chỉ giao hàng là **dữ liệu cá nhân**, còn vị trí xe là
**dữ liệu riêng của doanh nghiệp**. Không có bộ dữ liệu mở nào cho hai thứ đó — và kể cả có thì dự án này
cũng không nên phát hành. Vì vậy:

- mọi feature mang `synthetic: true` + `note` + licence CC0;
- `readLogisticsSample()` **ném lỗi** nếu một feature quên khai — mạnh hơn luật của các phase trước, và có test;
- panel nói thẳng: "a starting plan, not a dispatch system", không có traffic thật, không có đường một chiều,
  không có ca tài xế.

**Phương pháp thì thật**: trace của từng xe được sinh bằng đúng thuật toán mà trang chạy lại trong trình duyệt
(`lib/data2map/routing.ts`).

### 2. Mapbox Isochrone API bị từ chối — và cái thay thế tự khai mình là gì

Chọn đường (a) của prompt: Turf `circle` theo vận tốc giả định 22 km/h, dựng sẵn ở bước generate nên bundle
không phải mang Turf. Mỗi dải mang `method` **và** câu ghi chú *"straight-line coverage at an assumed average
speed, not drive time: the road bends, the river is in the way, and no routing engine was asked"* — trong chính
GeoJSON, trong registry, và trên panel. Gọi nó là "vùng giao 30 phút" sẽ là con số sai đắt nhất trên trang này.

### 3. Planner là hàm thuần, và phép so sánh mới là phần đáng giá

`lib/data2map/routing.ts`: nearest neighbour → 2-opt, cộng bước gom đơn theo tải trọng. 13 test
(`npm run check:logistics`) khoá đúng những tính chất quan trọng: 2-opt **không bao giờ** làm tour dài hơn, mỗi
điểm được ghé đúng một lần, xe không chở quá tải, và điểm không xếp được **được trả về trong `unassigned`**
chứ không bị bỏ im lặng.

Trang tính **ba** kế hoạch trên cùng tập điểm — thứ tự đơn đến, nearest-neighbour, và NN+2-opt — nên con số
tiết kiệm in ra là so với đúng cái đang được thay thế, không phải so với một hình nộm. `planCost` quy đổi
km + phút ra đồng theo 4 giả định in ngay cạnh kết quả (22 km/h · 6 phút/điểm · 12.000 ₫/km · 60.000 ₫/giờ).

### 4. Cluster và chuyển động: không cần deck.gl, không cần context WebGL thứ hai

Gom cụm bằng `cluster: true` của MapLibre (kèm layer `symbol` đếm số điểm), xe là layer `circle` với vị trí
tính từ giờ — hàm thuần `tracePositionAt` nội suy **theo quãng đường**, không theo chỉ số đỉnh. Dot được ease
750 ms giữa hai giờ, và `reduce_motion` tắt phần ease đó.

### 5. Một lỗi cache thật, và hai bug đằng sau nó

Sau khi đổi tên layer + seed lại + build lại, trang vẫn render **danh sách layer cũ**, kể cả một layer không
còn tồn tại ở đâu. Hai nguyên nhân riêng biệt:

1. `seed-data2map.mjs` chỉ **upsert** — dòng đã rời khỏi file registry vẫn nằm lại trong bảng. Nay seed **xoá**
   những dòng file không nhắc tới và in ra tên chúng;
2. Next **cache GET giữa các lần build** (`.next/cache/fetch-cache`): 4 trang tĩnh đọc registry lúc build nên
   chúng nhận lại response của lần build trước. Cách sửa: client Supabase thứ hai với `cache: "no-store"`
   (`getSupabaseUncached()`) **chỉ** cho registry, cộng `export const dynamic = "force-static"` để 4 trang vẫn
   tĩnh. Tắt cache cho **mọi** truy vấn Supabase là cách sửa hiển nhiên — và sai: nó biến các trang catalogue
   thành dynamic, trong khi dự án cố ý prerender chúng. `check:bundle` chính là lưới an toàn: nó fail nếu
   route tĩnh mất HTML.

### 6. Bằng chứng

- `npm run check:suites`: **344 test** (thêm 13 của `check:logistics`); `tsc` sạch.
- `npm run check:bundle`: `/data2map/logistics` **149.4 kB** (ngân sách 160) · `/data2map/trends` 150.5 (160) ·
  `/data2map/real-estate` 144.4 (155) · `/data2map/stories` 141.3 (150) · `/map` 137.2 (150) — mọi route trong ngân sách.
- Build sạch (`rm -rf .next`) rồi kiểm lại: 4 trang Data2Map vẫn **tĩnh** và hiển thị đúng layer hiện tại.
- Registry: `logistics-demo` + `isochrone-demo` mới, `fleet-demo` chuyển `live`; seed **xoá** layer `road` cũ;
  sản phẩm D4 chuyển `live` trên landing (⇒ tự vào sitemap).
- `/data2map/logistics` trả 200 với 186 stop id, 6 vehicle id và 14 dải phủ trong payload.

### 7. Tiếp theo

**D6 (Agri Geo-Analytics)** — phase cuối của Data2Map. Việc còn lại đã ghi rõ: NDVI cần một tile pipeline chưa
có (Copernicus Sentinel-2 CC BY 4.0 / Landsat USGS public domain đã chốt licence), nên phải quyết định cách làm
trước khi dựng UI; dashboard + legend + bộ lọc theo mùa là phần dễ.

---

## ✅ Phase D6 — Kết quả: Agri Geo-Analytics Dashboard

**Trạng thái: đã giao.** `/data2map/agriculture`: 28 ảnh tổ hợp MODIS NDVI **thật** trên đồng bằng sông Cửu Long,
lớp mưa IMERG **thật** cùng đồng hồ, mẫu 140 thửa **mô phỏng có nhãn**, và một mô hình năng suất in ra hệ số của
chính nó.

### 1. "Phase đắt nhất" hoá ra không cần tile pipeline

Kế hoạch lo D6 nhất vì NDVI/mưa là **raster**, mà dự án chưa có hạ tầng tile — lời khuyên trong PLAN là làm phần
vector trước. Cách ra là **tìm dịch vụ tile không cần key trước khi tự dựng**: **NASA EOSDIS GIBS** phục vụ cả
hai lớp dưới dạng WMTS public domain, không tài khoản, toàn cầu:

| Lớp | Layer GIBS | Licence | Độ phân giải |
| --- | --- | --- | --- |
| Sức khỏe cây trồng | `MODIS_Terra_NDVI_8Day` | Public domain (NASA) | 250 m, tổ hợp 8 ngày |
| Mưa | `IMERG_Precipitation_Rate` | Public domain (NASA) | 0,1°, sản phẩm nửa giờ |

Không tiền xử lý, không lưu trữ, không băng thông của mình. Nhưng GIBS **không cho số**: tile là một bức ảnh đã
render, đọc giá trị từng thửa ra từ đó là đoán pixel. Sentinel-2 10 m (đọc được một thửa thay vì một huyện) vì
thế vẫn nằm ở `planned` trong registry **kèm lý do**: licence đã chốt (Copernicus CC BY), pipeline thì chưa.

### 2. Bảng màu là của NASA, và luật "không có dữ liệu" mới là điểm chính

`lib/data2map/ndvi.ts` lấy các lớp từ chính colour map `MODIS_NDVI` v1.3 của GIBS — kể cả chỗ gãy ở 0,3 nơi
thang chuyển từ nâu sang xanh — và mang lớp `No Data` của NASA thành **`null`** của dự án: ô không có số liệu
được vẽ như **sự vắng mặt**, không bao giờ là xanh đậm. Đó đúng là kiểu sai mà dashboard nông nghiệp phải chống:
một tấm bản đồ xanh mướt trên cánh đồng ngập nước hoặc đầy mây. `check:ndvi` khoá cả luật biên (NDVI ∈ [-1,1],
ngoài khoảng → `null`).

### 3. Con số năng suất là **mô hình**, và nó nói rõ là mô hình nào

`estimateYield` tuyến tính theo "vigour" giữa sàn NDVI và mốc tham chiếu của từng cây, kẹp hai đầu nên chỉ số
bão hoà không thể thổi phồng sản lượng. Hệ số là **của chúng tôi**, chọn trong khoảng công bố của từng hệ thống,
và `YIELD_COEFFICIENT_SOURCE` được in nguyên văn trong panel — kể cả câu "Not from a specific study, not
calibrated to any province", vì bịa một trích dẫn còn tệ hơn thừa nhận đây là minh hoạ. Chuỗi khuyến nghị
**không bao giờ** nhắc tới thuốc: dự án không có phân tích đất, không có dự báo thời tiết, không có kỹ sư nông
nghiệp, và khuyến nghị là phần dễ gây hại nhất khi nói chắc.

### 4. Cái gì được vẽ, cái gì chỉ được mô tả

| Lớp | Nguồn | Thật? |
| --- | --- | --- |
| Sức khỏe cây trồng (NDVI) | NASA GIBS, 28 tổ hợp mùa 2025 | **thật**, public domain |
| Mưa | NASA GIBS (GPM IMERG), cùng đồng hồ | **thật**, public domain |
| Vùng tỉnh | vòng tròn quanh tâm tỉnh | mô phỏng, có nhãn "không phải ranh giới" |
| Mẫu thửa | `data/data2map-agriculture.json` | mô phỏng, CC0, **tắt mặc định** |
| Năng suất + khuyến nghị | mô hình ở trên | minh hoạ, có in hệ số |
| Sentinel-2 10 m | — | **planned**: cần pipeline tiền xử lý |

### 5. Dashboard không viết lại chart (ràng buộc #6)

Dùng lại `components/stats/DailyBars` và `Sparkline` của Phase 4. `Sparkline` được thêm **một prop tuỳ chọn**
`label`: mặc định của nó là "View trend" cho chuỗi lượt xem, và một biểu đồ NDVI bị trình đọc màn hình đọc là
"views" là đúng kiểu nói dối nhỏ mà dự án này đang loại bỏ dần.

### 6. Bằng chứng

- `npm run check:suites`: **357 test** trong **31** suite (thêm 7 ndvi + 6 agriculture); `tsc` sạch.
- `npm run check:bundle`: `/data2map/agriculture` **148,5 kB** (ngân sách 160) — mọi route trong ngân sách.
- Build sạch: `/data2map/agriculture` **tĩnh** (280 kB HTML) với đủ 4 nhãn layer, tên 2 layer GIBS, câu nguồn hệ
  số và 140 `field_id` trong payload; sitemap có đủ 6 mục Data2Map.
- Registry: 16 dataset / 16 layer; `ndvi-gibs-modis` + `imerg-rain` + `agri-demo` chuyển `live`,
  `ndvi-sentinel2` vẫn `planned` **kèm lý do**; sản phẩm D6 chuyển `live` (⇒ tự vào sitemap).

### 7. Data2Map đã xong 5/5 sản phẩm

D1 (nền tảng) · D2 (bất động sản) · D3 (footfall) · D4 (logistics) · D5 (story maps) · **D6 (nông nghiệp)** — tất
cả `live`, tất cả có registry ghi nguồn + licence + cờ mô phỏng, và mọi con số không đo được đều tự khai.

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
npm run check        # typecheck + 267 bài test trong 23 suite (rig, tỉ lệ, SQL, squircle, JSON-LD, session hint, theme, tier, camera, quiz, địa cầu, licence âm thanh, bản đồ, timeline, risk, nhập geodata)
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
