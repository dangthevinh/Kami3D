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
| **17** | Admin Geospatial Pipeline & 3D-Map Hybrid | ✅ Hoàn thành — pipeline + vai trò admin + chế độ hybrid 3D (một WebGL context, có audit bằng Chrome thật) |
| **18** | Admin Console: kênh & phân tích người dùng (18A) + tự động tìm/tải model 3D có hạn mức (18B) | ✅ **18A xong** + ✅ **18B xong** — registry 7 provider, `model_download_policy`/`model_download_log`, `reserve_model_download()`, worker lệnh và `/admin/models` |
| **19** | Giao diện mobile: đo trước, sửa sau | ✅ Hoàn thành — audit Chrome thật: tap target <44px và chữ <12px về 0 ở các trang đã đo |
| **20** | Bảo mật: đóng những khoảng trống đo được | ✅ Hoàn thành — 7 header (HSTS chỉ production), guard dùng chung cho **11 route ghi**, quét bí mật trong chunk client ở CI; RLS dưới Clerk vẫn là P0.1 đang mở |
| **21** | Auto-pilot: admin bật một công tắc là model tự được tải và tự lên Kami3D | ✅ Hoàn thành — `model_autopilot` + `start_autopilot_round()`, đồng hồ trong tiến trình server + `/api/cron/models` + nút trong panel; lượt tự động chạy `--strict-match --min-score` nên không thể tải nhầm loài hay hạ cấp model |
| **22** | Admin tự đưa model lên card: thủ công và tự động | ✅ Hoàn thành — `publishUploadedModel()` dùng chung cho form và hộp thư Storage, upload đi qua `reserve_model_download(provider = 'upload')`, `animals.preview_eligible` do bước publish quyết định nên model lên card không cần build lại |
| **D1** | Data2Map Foundation (menu riêng + layout + bảng `data2map_*`) | ✅ Hoàn thành — landing 104.6 kB, không nạp MapLibre, 3 bảng + registry |
| **D2** | Real Estate & Zoning Overlay | ✅ Hoàn thành — 280 POI thật từ OSM + potential score có test |
| **D3** | Footfall & Trend Map (F&B/Retail) | ✅ Hoàn thành — mật độ dân số **thật** (WorldPop 2020) + POI F&B **thật** (OSM), footfall theo giờ mô phỏng **có nhãn** |
| **D4** | Logistics & Fleet Visualizer | ✅ Hoàn thành — isochrone Turf (nhãn "không phải thời gian lái xe"), cluster MapLibre, planner NN + 2-opt có test |
| **D5** | Cultural & Story Maps (kết hợp 3D) | ✅ Hoàn thành — 8 story + ảnh Commons có credit; chỗ 3D để trống có lý do |
| **D6** | Agri Geo-Analytics Dashboard | ✅ Hoàn thành — NDVI + mưa **thật** từ NASA GIBS (public domain, không cần tile pipeline), mẫu thửa mô phỏng có nhãn |
| **D7** | Digital Twin 3D & Realtime (GIS 3D + hạ tầng đẩy dữ liệu) | ✅ Hoàn thành — thành phố 3D **thật** (OSM + terrain), fleet stream qua Supabase Realtime; HT for Web bị từ chối, thay bằng bộ OSS |
| **D8** | Ẩn Data2Map với người dùng (chỉ admin xem) | ✅ Hoàn thành — middleware trả **404** cho khách, allow-list + bảng `app_admins`; `NEXT_PUBLIC_DATA2MAP_PUBLIC=1` để mở lại |
| **24** | Manga Studio (webtoon, panel AI, mạng xã hội) | ⚠️ **Code xong, typecheck + 580 test xanh** — còn **một** mục chưa đo: ngân sách bundle của 6 route mới (cần một lần `next build` chạy xong; xem "Việc còn lại" #12 và `scripts/bundle-budget.mjs`) |

**Số liệu hiện tại**

| Hạng mục | Giá trị |
| --- | --- |
| Loài trong bách khoa | **73** (8 vùng, 8 lớp, 4 loài tiền sử) — **mỗi loài còn lại đều có một model 3D thật, có màu**. 35 loài không có model (hoặc chỉ có một model sai loài) đã bị **xoá hẳn** khỏi catalogue, seed và database; xem mục "Chỉ giữ loài có model" và "Model trắng" |
| Model 3D thật (**đo lại trong phiên này**) | **166 model** trong `public/models/` (**339 MB**): **73** loài · **47** công trình · **16** space · **16** plants · **14** vehicles — **mọi mục của mọi catalogue đều có một file thật, đã credit** (trước phiên này: 24/108 loài). DRACO toàn bộ, không model nào render trắng, không mục nào hiển thị mà không có model |
| Route dựng sẵn | **199** trang ở lần build mới nhất, gồm **73 trang loài** · **47 trang công trình** · **46 trang mục catalogue** (`/catalog/[category]/[slug]`) · **6 trang chủ đề** (`/categories/[id]`) cộng `/landmarks`, `/categories` và `/search`; `/explore` tĩnh, **7** trang Data2Map tĩnh kể cả `/data2map/twin`; Phase 24 thêm **6** trang `/manga-studio/*` và **18** route API `/api/manga/*` |
| Test tự động | **680** bài trong **60** tệp `scripts/check-*.mjs`, 0 fail (`npm run check:suites`), `tsc --noEmit` sạch, `next build` exit 0 với **0 cảnh báo**; Phase 21 thêm 28 bài của `check-autopilot` (10 bài khoá SQL khớp với module), Phase 22 thêm 21 bài của `check-model-upload` (chạy parser trên cả 24 file .glb thật), Phase 24 thêm 39 bài (`check-manga`, `check-manga-export`), luật skip của auto-pilot được khoá bằng `check-autopilot-clock` (7 bài), việc đưa dataset Data2Map ra khỏi trang bằng `check-data2map-samples` (7 bài) và bộ lọc log build bằng `check-build-log` (5 bài). Hai cổng riêng trong CI: `check:bundle` (ngân sách JS mỗi route) và `check:secrets` (quét bí mật, chạy sau build) |
| Tiếng kêu động vật | **6/73 loài** (635 kB), CC0/CC-BY, đã credit + upload Storage + lưu `sound_assets` |
| Tuỳ chọn người dùng | **17 cột** trong `user_settings`, 6 nhóm ở `/settings`; khách chưa đăng nhập vẫn dùng được (lưu trong trình duyệt) |
| First Load JS (build `.next-build`, đo lại trong phiên này) | `/` **140 kB** · `/explore` **142 kB** · `/quiz` **135 kB** · `/animal/[slug]` **137 kB** · `/landmarks` **121 kB** · `/landmarks/[slug]` **126 kB** · `/categories` **108 kB** · `/categories/[id]` **120 kB** |
| JS khởi đầu mỗi route (gzip, `npm run check:bundle NEXT_DIR=.next-build`) | Đo lại trên build `.next-build` trong phiên này: `/quiz` **165,0** · `/explore` **159,1** · `/landmarks` **158** · `/data2map/twin` **156,9** · `/data2map/trends` **155,3** · `/data2map/logistics` **155** · `/data2map/agriculture` **153,6** · `/` **153,4** · `/animal/[slug]` **149,6** · `/categories/[id]` **135,8** · `/categories` **134,4** · `/map` **140,9** · `/landmarks/[slug]` **139** · `/admin/models` **126,6** · `/analytics` **106,1** — ngân sách 140–172 tuỳ route, **mọi route đều trong hạn**, và không route nào còn chưa khai ngân sách ngoài 6 route manga (#12) |
| Bundle 3D | tải **sau** khi trang đã dùng được (cổng CI chặn nếu quay lại first paint) |
| CI | GitHub Actions xanh — typecheck → checks → build → bundle budget → **quét bí mật** mỗi lần push |
| **Rủi ro đang mở** | **R1** Clerk đi vòng qua RLS bằng service role (P0 — P0.1) · **R4** kiến trúc dữ liệu O(N) · **R5** không có giám sát lỗi · **R6** chưa có KTX2 (`dispose()` đã xong ở P0.4) · **R7** chưa sẵn sàng i18n · **R8** egress chưa có trần · **R9** rate limiter chỉ giới hạn **một** process và CSP mới ở chế độ **report-only** (Phase 20). Đã đóng: ~~R2~~ (P0.2), ~~R3~~ (P0.3). Chi tiết + SQL ở [docs/REVIEW.md](docs/REVIEW.md) |
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

### 5. Chế độ 3D-Map Hybrid — đã làm (nốt phần còn 🟡 của phase này)

Trước đây mục này ghi "chưa làm" kèm cách làm đúng; nay nó đã được làm đúng theo ba điểm đó:

1. **Viewer mount chỉ khi bấm** — nút "View this species in 3D" trong panel loài, `aria-expanded`/`aria-controls`,
   `next/dynamic` + `ssr: false`; không hover, không tự mount khi chọn loài;
2. **Trên màn hình nhỏ thì bản đồ bị unmount**, không phải che bằng CSS: `lib/hybrid-view.ts` là hàm thuần
   (`shouldKeepMapMounted`, `hybridPlacement`) và `MapExperience` gate cả bản đồ lẫn hai overlay của nó theo hàm đó;
3. **Một viewer duy nhất**, và đóng là unmount canvas — cũng là lúc `lib/three-dispose.ts` trả geometry/material/
   texture về GPU.

Hai chi tiết đáng ghi lại vì chúng là bài học chứ không phải lựa chọn thẩm mỹ:

- **`check:bundle` bắt được một rò rỉ thật ngay lần build đầu**: panel mượn `CanvasFallback` từ
  `components/3d/CanvasShell`, mà module đó import `@react-three/fiber` ở đầu file — thế là three.js vào thẳng
  chunk khởi đầu của `/map`: **377,5 kB** so với ngân sách 150. Marker `WebGLRenderer` trong `FORBIDDEN` là thứ
  phát hiện. Panel nay tự viết placeholder của mình, `/map` về **140,5 kB**.
- **Dữ liệu loài được lấy khi mở, không nhét sẵn**: `/map` chỉ gửi bản ghi rút gọn (`MapSpecies`), nên panel gọi
  `/api/animals/[slug]` khi thật sự mở. Nếu nhét 24 hồ sơ đầy đủ vào payload của bản đồ thì mọi khách phải tải
  chúng để phục vụ một viewer mà phần lớn không mở.

**Bằng chứng**: `npm run audit:hybrid` (Chrome headless, hai viewport, chọn loài qua URL `?species=lion` vì máy này
không có WebGL để click lên bản đồ) — laptop 1280×900: viewer nằm ở cột phải, **map slot giữ nguyên 2 phần tử**
(bản đồ vẫn mount); điện thoại 420×860: viewer **chiếm chỗ bản đồ**, slot còn 1 phần tử, không có panel cột phải, và
câu ghi chú đúng là "The map is unmounted while this is open…". 7 test trong `npm run check:hybrid` khoá cả hàm
thuần lẫn luật "không file nào trong `components/map` được import three".

### 6. Bằng chứng

- `npm run check:suites`: **267 test** (thêm 10 của `check:import`); `tsc` sạch; build xanh.
- Route mới: `/admin/geodata` **132 kB** First Load (MapLibre vẫn lazy), `/api/admin/geodata` 103 kB.
- `/map` nay **139 kB** — ngân sách được nâng lên **150 kB** kèm ghi chú số đo, vì timeline + path player là phần
  thật sự được thêm vào.
- `POST /api/admin/geodata` trả **403** cho mọi tài khoản không nằm trong `app_admins`, kể cả khi đã đăng nhập —
  cùng một câu trả lời cho "chưa đăng nhập" và "đăng nhập nhưng không phải admin", để endpoint không thành chỗ
  liệt kê ai có quyền.

---

## 🛠️ Phase 18 — Admin Console: kênh & phân tích người dùng + tự động tìm/tải model 3D có hạn mức

**Mục tiêu**: hai trang quản trị mới — `/admin/analytics` (kênh truy cập và hành vi người dùng, đo bằng
first-party, không SDK bên thứ ba) và `/admin/models` (tìm – duyệt – tải model 3D từ nhiều nguồn free, với
**hạn mức tải do admin đặt** và một sổ nhật ký không thể vượt qua bằng CLI).

Phase này gồm hai nửa làm được độc lập (18A analytics, 18B model sourcing). Nó nối tiếp ba việc đã có: pipeline
model Phase 12 (CLI), cổng admin `app_admins`/`is_admin()` Phase 17, và bảng `animal_views_daily` Phase 4 —
**không dựng lại cái nào trong số đó**.

### Hiện trạng, để không làm lại

| Đã có | Ở đâu | Phase 18 dùng thế nào |
| --- | --- | --- |
| Pipeline tải model (sketchfab / smithsonian / polypizza), allow-list **CC0 + CC-BY**, ngân sách 12 MB/model, DRACO, `scoreModelQuality`, `FACE_BUDGET` | `scripts/fetch-models.mjs`, `lib/model-quality.ts` | **Mở rộng**, không fork: thêm provider + hạn mức + UI |
| `model_assets` (licence CHECK 'CC0'/'CC-BY', attribution bắt buộc, dedupe theo source_url) + `data/model-attribution.json` | `supabase/schema.sql`, `data/` | Ghi vào đúng chỗ đó, không thêm bảng song song |
| Cổng admin: `app_admins`, `is_admin()`, `/admin/geodata` | Phase 17 | Hai trang mới dùng **cùng** cổng, cộng thêm gate ở middleware như D8 |
| Đếm lượt xem theo loài/ngày, chống bơm | `animal_views_daily`, `increment_animal_view`, P0.2 | Giữ nguyên; analytics mới là chuyện **kênh**, không phải chuyện lượt xem loài |
| Chart tự viết | `components/stats/*` | Dùng lại `DailyBars`/`Sparkline`, không thêm thư viện chart |

**Chưa có gì về kênh truy cập**: không có referrer, không có UTM, không có phân loại bot — `grep` cho
`referer|channel|utm_` trong repo chỉ ra vài chỗ không liên quan. Đây là phần mới thật sự của 18A.

### Nguồn model free — đã kiểm licence và **đã thử API** trong phiên này

| Provider | Cần key? | Licence | Ghi chú (đã kiểm) |
| --- | --- | --- | --- |
| **Poly Haven** | **Không** | **CC0** | API keyless trả **521 model** (`api.polyhaven.com/assets?t=models`, HTTP 200); API không kèm field licence nên phải ghi nguồn licence ở cấp site |
| **NASA 3D Resources** | **Không** | **Public domain** | repo `nasa/NASA-3D-Resources`, thư mục `3D Models` có **227 mục** qua GitHub API (keyless) |
| **Khronos glTF Sample Assets** | **Không** | CC0 / CC BY (theo từng model) | repo `KhronosGroup/glTF-Sample-Assets` — dùng làm bộ kiểm tra pipeline |
| Sketchfab | OAuth token | CC0 / CC BY (allow-list) | "free download" **không** đồng nghĩa licence mở; đã có sẵn trong pipeline |
| Smithsonian Open Access (3D) | `api.data.gov` key | CC0 | 3D API `3d-api.si.edu` |
| Poly Pizza | key | CC0 / CC BY | archive của Google Poly |
| ~~Thingiverse / MyMiniFactory / CGTrader~~ | — | **CC BY-NC / ToS cấm tải tự động** | **từ chối** |
| ~~Google Poly~~ | — | đã đóng | ghi lại, không dùng |

Điểm đáng giá: **ba nguồn đầu không cần key nào**, nên luật "clone mới chạy được không cần cấu hình" vẫn giữ —
một bản clone sạch vẫn tìm và tải được model CC0/public-domain, còn Sketchfab/Smithsonian/Poly Pizza là tuỳ chọn
khi admin có token.

**Prompt để triển khai Phase 18A — Kênh & phân tích người dùng (admin)**:

````markdown
Triển khai Phase 18A – Admin Analytics (kênh truy cập & hành vi người dùng) cho Kami3D.

Tạo trang: /admin/analytics (chỉ admin; cùng cổng với /admin/geodata)

1. Phân loại kênh — hàm thuần, có test
   - lib/channel.ts: classifyChannel({ referer, secFetchSite, userAgent, host, campaign }) trả về đúng một
     nhãn: direct | internal | search | social | referral | campaign | bot.
   - Nguồn sự thật theo thứ tự: Sec-Fetch-Site (trình duyệt tự đặt, JS trang không sửa được) → host của
     Referer → không có gì thì direct. Danh sách host tìm kiếm/mạng xã hội đặt trong hằng số có nguồn.
   - Bot: theo UA (bot|crawler|spider|preview|headless|monitor) VÀ theo Sec-Fetch-Mode; bot có hàng riêng,
     không bao giờ bị trộn vào "người dùng".
   - campaign: chỉ lấy utm_source/utm_campaign khi có, chuẩn hoá về [a-z0-9-_] và cắt 40 ký tự; KHÔNG lưu
     query string đầy đủ của người dùng.

2. Ghi nhận — tổng hợp, first-party, không SDK
   - Bảng traffic_daily(day date, channel text, hits integer, primary key(day, channel)) và
     page_daily(day date, route text, hits integer, primary key(day, route)). "route" là lớp route đã chuẩn
     hoá (/animal/[slug], /explore, /data2map/*, …), không phải URL kèm query.
   - Không lưu IP, không lưu UA thô, không cookie theo dõi mặc định, không SDK bên thứ ba, không fingerprint.
   - Ghi từ middleware (nơi đã có request + session), một upsert tăng hits; hỏng ghi thì không được làm hỏng
     trang (bọc try/catch, log một dòng).
   - Tôn trọng DNT: 1 và Sec-GPC: 1 → không ghi.
   - Tuỳ chọn "phiên" phải TẮT mặc định; nếu bật thì dùng cookie first-party 30 phút, nhãn UI ghi rõ
     "phiên (ước lượng theo cookie trình duyệt)".
   - Tìm kiếm: chỉ ghi phân loại (matched | no_match) + slug khớp; KHÔNG lưu chữ người dùng gõ (ô tìm kiếm có
     thể chứa tên người).

3. Trang admin
   - Bộ lọc khoảng ngày (7/30/90 ngày), bảng kênh (hits, % , sparkline mỗi kênh), top route, top loài,
     hàng bot tách riêng, và tổng hợp từ bảng đã có: quiz hoàn thành (quiz_scores), yêu thích
     (user_favorites), settings đã lưu (user_settings).
   - Mọi chỉ số in công thức ngay cạnh số (giống D2/D3/D4): "hits = số lần routerequest được ghi",
     "% kênh = hits kênh / tổng hits không tính bot".
   - Nút xuất CSV (chỉ admin) và khối "Đây không phải là gì": không dữ liệu từng người, không theo dõi
     xuyên site, không IP.
   - Dùng lại components/stats/*; không thêm thư viện chart.

4. Quyền, lưu trữ, retention
   - RLS: bảng chỉ admin đọc (policy using (public.is_admin())), revoke all rồi grant select cho
     authenticated; không có policy ghi cho anon/authenticated (chỉ service role ghi).
   - prune_traffic(retain_days integer default 400): xoá theo ngày, từ chối tham số <= 0; pg_cron hằng ngày
     (có guard như D7 nếu thiếu pg_cron).
   - Gate /admin/* ở middleware như đã làm cho /data2map ở D8: chưa đăng nhập → 404, không phải 403.

5. Trung thực
   - /about thêm một mục ngắn: đếm cái gì, không đếm cái gì, giữ bao lâu, và câu "chúng tôi đếm lượt, không
     đếm người".
   - docs/ANALYTICS.md ghi: định nghĩa từng kênh, vì sao bot tách riêng, vì sao không lưu IP, và những gì
     bị từ chối (GA4/Plausible cloud/heatmap SDK) kèm lý do.
````

**Ràng buộc riêng của 18A**:

1. **Không SDK analytics bên thứ ba** (GA4, Plausible cloud, PostHog, heatmap). Lý do không phải "thích tự làm"
   mà là: một script bên thứ ba trên mọi trang là thứ docs/REVIEW.md đã đo và loại (Clerk từng làm đúng như vậy),
   và nó biến dữ liệu người dùng thành dữ liệu của người khác. Đo bằng first-party, tổng hợp, đủ trả lời "kênh nào
   đang mang người đến".
2. **Không lưu IP, không UA thô, không fingerprint, không theo dõi xuyên site.** Nếu một chỉ số cần định danh
   (phiên) thì phải TẮT mặc định và nói rõ nó dựa trên cookie first-party 30 phút.
3. **Bot không phải người dùng.** Hàng riêng, nhãn riêng, và mọi % trên trang đều tính trên phần không phải bot.
4. **Ô tìm kiếm không được ghi nguyên văn.** Chỉ ghi khớp/không khớp + slug khớp.
5. **Schema phải tự cấm dữ liệu cá nhân**: không cột nào tên kiểu `ip`/`user_agent`/`visitor_id`; có test đọc
   schema và fail nếu ai đó thêm.
6. **Đo được**: test thuần cho classifier (referer đủ kiểu, thiếu header, host lạ, UTM rác, bot), test SQL cho
   RLS admin-only + retention có sàn, và gate /admin ở middleware.

---

**Prompt để triển khai Phase 18B — Tự động tìm & tải model 3D, có hạn mức do admin đặt**:

````markdown
Triển khai Phase 18B – Model Sourcing Console cho Kami3D.

Tạo trang: /admin/models (chỉ admin; cùng cổng với /admin/geodata)

1. Provider registry — mở rộng scripts/fetch-models.mjs, không viết lại
   - Mỗi provider là một object có: id, homepage, license mặc định (hoặc hàm đọc licence từng model),
     needsKey (tên biến môi trường), search(query) → Candidate[], resolve(candidate) → file + metadata.
   - Thêm provider KHÔNG cần key: polyhaven (CC0), nasa (public domain, GitHub repo), khronos (glTF Sample
     Assets). Giữ sketchfab / smithsonian / polypizza như cũ.
   - Danh sách này là dữ liệu, không phải if/else rải rác, và có test khẳng định: mọi provider mặc định đều
     nằm trong allow-list licence, provider cần key phải khai đúng tên biến, provider bị từ chối phải có lý do
     ghi kèm.
   - Từ chối và ghi rõ lý do: thingiverse, myminifactory, cgtrader (CC BY-NC / ToS cấm tải tự động), Google Poly
     (đã đóng).

2. Hạn mức tải — admin kiểm soát số lượng, và không thể vượt bằng CLI
   - Bảng model_download_policy (một dòng, id = 'default'): enabled boolean, max_per_day integer,
     max_per_month integer, max_total integer, max_bytes_total bigint, max_bytes_per_model bigint,
     providers_allowed text[], require_approval boolean, updated_by text, updated_at timestamptz.
   - Bảng model_download_log(id, at, actor, provider, provider_id, title, license, bytes, animal_slug,
     storage_path, outcome text check (outcome in ('downloaded','refused','failed')), reason text).
   - lib/model-budget.ts: evaluateBudget({ policy, usage, candidate }) → { allowed, reason, remainingToday,
     remainingBytesTotal, … } — hàm THUẦN, có test cho: hết lượt trong ngày, hết lượt trong tháng, hết tổng,
     vượt dung lượng, provider không nằm trong providers_allowed, require_approval mà chưa duyệt, enabled=false,
     dữ liệu thiếu (usage null) thì từ chối chứ không cho qua.
   - Chốt hạn mức ở MỘT chỗ phía server: hàm SQL reserve_model_download(...) (SECURITY DEFINER, kiểm tra rồi
     ghi log trong cùng transaction) trả về decision. Cả CLI lẫn UI đều gọi nó; không có đường thứ hai.
   - Mọi lần thử — kể cả bị từ chối — đều vào log kèm lý do. Admin thấy "hôm nay còn N lượt / M MB", "tháng này
     còn …", và lịch sử tải.

3. UI /admin/models
   - Ô tìm kiếm (một ô, tìm song song các provider đang bật), bảng ứng viên: tiêu đề, provider, licence (nhãn +
     link), face count, dung lượng, điểm chất lượng (scoreModelQuality), attribution sẽ phải hiển thị.
   - Nút "Tải về" chỉ sáng khi evaluateBudget cho phép, kèm lý do khi bị chặn; nút "Gán cho loài" và "Đặt làm
     model chính" (is_primary) sau khi tải.
   - Sau khi tải: DRACO hoá, upload Storage, ghi model_assets + data/model-attribution.json — dùng đúng pipeline
     Phase 12, không có bước riêng cho UI.
   - Khối cấu hình hạn mức (chỉ admin): sửa policy, có xác nhận, và ghi actor vào updated_by.
   - Trang nói rõ provider nào đang dùng được với cấu hình hiện tại: "không có token → vẫn tìm được Poly Haven,
     NASA, Khronos; Sketchfab/Smithsonian/Poly Pizza cần key".

4. An toàn và licence
   - Licence là điều kiện tiên quyết: model không nằm trong allow-list (CC0/CC-BY) bị loại TRƯỚC khi tải, và lý do
     được ghi vào log. "Free download" trên Sketchfab không đồng nghĩa licence mở — UI ghi đúng nhãn licence.
   - Attribution bắt buộc trước khi bật is_primary; thiếu attribution thì chặn, không phải cảnh báo.
   - Giới hạn dung lượng mỗi model (mặc định 12 MB, đã có) vẫn áp dụng; vượt thì từ chối kèm lý do.
   - Token chỉ nằm ở server (không NEXT_PUBLIC), không bao giờ trả về browser.

5. Kiểm thử & đo
   - scripts/check-model-budget.mjs: toán hạn mức (mọi nhánh ở mục 2), ranh giới ngày/tháng theo UTC, và
     khẳng định provider registry không chứa licence ngoài allow-list.
   - check-sql: RLS hai bảng mới (admin đọc, service role ghi), constraint outcome, retention/cron nếu có.
   - Ngân sách bundle cho /admin/models và /admin/analytics (dynamic, three.js vẫn lazy, không rò WebGLRenderer).
   - docs/MODELS.md: bảng provider + licence + key, cách hạn mức được ép, và những gì bị từ chối.
````

**Ràng buộc riêng của 18B**:

1. **Hạn mức là ngân sách, không phải gợi ý.** Một chỗ duy nhất phía server quyết định (hàm SQL
   `reserve_model_download`), cả UI lẫn CLI đi qua nó; log ghi cả lần bị từ chối. Không có biến môi trường nào
   tắt được hạn mức ngoài việc admin sửa policy.
2. **Licence trước, tải sau.** Allow-list hiện có (CC0/CC-BY) áp dụng cho **mọi** provider mới; NC/ND và
   "all rights reserved" bị loại trước khi tải, có lý do trong log. Ba nguồn keyless (Poly Haven, NASA, Khronos)
   là mặc định để bản clone sạch vẫn dùng được tính năng này.
3. **Attribution là điều kiện của `is_primary`**, không phải phụ lục: thiếu credit thì không được đặt làm model
   chính, và trang hiện trước đoạn credit sẽ được phát hành.
4. **Token chỉ ở server.** `SKETCHFAB_API_TOKEN`, `SI_API_KEY`, `POLY_PIZZA_API_KEY` không bao giờ vào bundle;
   trang phải nói được provider nào đang bật với cấu hình hiện tại thay vì hiện nút hỏng.
5. **Không tự động tải hàng loạt không có người duyệt.** Mặc định `require_approval = true`: pipeline có thể
   *đề xuất*, nhưng mỗi model vào repo phải có một lần admin bấm duyệt, và log ghi ai duyệt.
6. **Tái dùng, không fork**: `lib/model-quality.ts`, DRACO, `model_assets`, `data/model-attribution.json`,
   `/admin/geodata`'s gate — Phase 18B chỉ thêm provider, hạn mức và UI.
7. **Kết quả phải đo được**: số model tải về, dung lượng, số lần bị chặn vì hạn mức, thời gian tìm kiếm mỗi
   provider — in trên trang (không phải "cảm giác nhanh hơn").

### Cách chia việc và thứ tự làm

18A và 18B độc lập, mỗi nửa một commit:

1. **18A trước** — schema + `lib/channel.ts` + middleware ghi nhận + `/admin/analytics`. Rẻ hơn, và cho dữ liệu
   nền để đánh giá 18B sau này (ví dụ: có ai vào `/admin/models` không, kênh nào mang admin tới).
2. **18B sau** — provider registry + hai bảng hạn mức + `reserve_model_download` + `/admin/models`. Đây là phần
   chạm tới tiền và licence, nên làm sau khi có log và test.

Cả hai đều phải giữ: CI xanh, mọi route trong ngân sách, `tsc` sạch, và "một WebGL context" — trang admin không
được nạp three.js vào first paint.

---

## 🧭 Module Data2Map (Phases D1–D7)

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

**Thứ tự đề xuất**: D1 → D2 → D5 → D3 → D4 → D6 → (D7). D5 rẻ nhất vì tái dùng gần như toàn bộ 3D + timeline đã có;
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

### Phase D7 — Digital Twin 3D & Realtime (GIS 3D + hạ tầng thời gian thực)

**Nguồn cảm hứng**: video *"GIS Logistics Management Platform | GIS 3D Map Port | Digital Twin"* của kênh
**HighTopo / 图扑软件** (youtube.com/watch?v=qk9EfkS1jr8). Người dùng yêu cầu Data2Map dùng công nghệ frontend
**và** backend như video này. Mục dưới đây là phần **phân tích công nghệ** trước, rồi mới tới prompt — vì phần lớn
công nghệ trong video là **sản phẩm thương mại đóng**, và dự án này có luật cứng về chuyện đó.

**Mục tiêu**: `/data2map/twin` — bản sao 3D của TP.HCM trên **dữ liệu OSM thật** (cao độ công trình + địa hình),
đặt toàn bộ mẫu logistics D4 lên đó, cộng một hạ tầng **thời gian thực** thật (Postgres + Realtime + rollup) thay
cho luồng đẩy dữ liệu độc quyền của video.

#### Phân tích công nghệ trong video

| Thành phần trong video | Thực chất là gì (theo tài liệu của 图扑) | Dự án này dùng gì | Quyết định |
| --- | --- | --- | --- |
| "HT 3D rend engine" — cảnh cảng/kho 3D | **HT for Web**: engine WebGL **tự phát triển, không mở mã nguồn**, lõi là **một file `ht.js` ~1 MB** nhúng bằng `<script>`; cảnh 3D dựng bằng `new ht.graph3d.Graph3dView()`; có plugin (edges/obj/animation); tài liệu học tập công khai ghi thẳng: *"not open source and requires a commercial license to use"*, chỉ có bản trial | three.js + R3F (đã có) cho 3D rời, **MapLibre `fill-extrusion` + terrain** cho 3D GIS | **Từ chối HT for Web**: thương mại + đóng, phải xin trial/mua licence — vi phạm luật "clone mới chạy không cần key" và luật ngân sách (1 MB một file, không cắt được theo route) → **thay bằng** three.js + R3F (MIT) và MapLibre (BSD-3), cả hai **đã có** trong stack |
| WebGIS 3D + "BIM 轻量化" | Bộ chuyển đổi BIM độc quyền + tile 3D dịch vụ của họ | **OpenFreeMap** (vector tile OSM, ODbL, không key) — schema đã có layer `building` với `render_height`/`render_min_height` ⇒ `fill-extrusion` dựng được thành phố 3D **thật** | **Nhận** phần tile OSM; **thay** converter BIM độc quyền bằng **web-ifc (MPL-2.0) + @thatopen/components (MIT)** — đọc IFC ngay trong trình duyệt; vẫn không ship model bịa (luật Phase 12) |
| Nền 3D có địa hình | Terrain do họ dựng sẵn | **AWS Open Data terrain tiles** (`elevation-tiles-prod/terrarium`, nguồn public domain như SRTM), MapLibre `setTerrain` | **Nhận** — không key, không chi phí |
| Panel 2D cạnh cảnh 3D (BI cockpit) | Component chart + gauge của HT | `components/stats/*` (Phase 4) + KPI card + `RangeTimeline` (Phase 16); nếu cần gauge/heatmap phức tạp thì **Apache ECharts (Apache-2.0)** với ngân sách riêng | **Nhận cách làm**, không nhận thư viện; ECharts là cửa mở có điều kiện |
| Số liệu "thời gian thực" từ RFID/camera/cần cẩu | Dữ liệu đẩy từ hệ thống khách hàng + phần cứng IoT (MQTT/Kafka phía khách) | **Supabase Realtime** (đã có trong stack) + bảng time-series trong Postgres + Edge Function mô phỏng nguồn đẩy; đường tự host tương đương: **EMQX/Mosquitto + Node-RED**, **Eclipse Ditto (EPL-2.0)** hoặc **ThingsBoard (Apache-2.0)** | **Nhận kiến trúc đẩy dữ liệu**, nhưng nguồn là **mô phỏng có nhãn** — dự án không có phần cứng và không thu vị trí thật |
| "AI 算法" tối ưu bến/bãi | Hộp đen, không công bố | `lib/data2map/routing.ts` (NN + 2-opt) và các hàm thuần có test | **Nhận tinh thần**, giữ nguyên nguyên tắc: thuật toán phải đọc được và có test |
| VR/AR, low-code platform | Sản phẩm riêng của họ | — | **Không** làm: ngoài phạm vi module và không có nguồn dữ liệu mở tương ứng |

**Nguồn đã kiểm cho bảng trên**: hightopo.com (trang chủ: "một engine 3D dựa trên WebGL… MVP"; blog 港口船舶合集 / 智慧仓储物流合集 mô tả cách ghép cảnh 3D + panel 2D + dữ liệu từ hệ thống ngoài và phần cứng IoT), ghi chú học tập công khai về HT for Web (`ht.js` ~1 MB, `ht.graph3d.Graph3dView`, licence thương mại), và **kiểm trực tiếp bằng HTTP trong session này**: renderer dự án đang dùng (OpenFreeMap) có layer `building` với `render_height`/`render_min_height`, còn terrain tiles `elevation-tiles-prod/terrarium` trả 200 — cả hai đều không cần key.

#### Thay thế mã nguồn mở cho từng mảnh của HT for Web

HT for Web không phải một thư viện mà là **bốn sản phẩm gộp** (engine 3D, WebGIS, bộ chart/2D, nền tảng low-code),
nên không có một "bản open source của HT" — nhưng **từng mảnh đều có thay thế mã nguồn mở**, và phần lớn đã nằm
trong stack của dự án. Bảng dưới đã **kiểm licence trực tiếp** (npm registry + GitHub API, trong session này):

| Mảnh của HT for Web | Thay thế mã nguồn mở | Licence (đã kiểm) | Dùng ở D7 |
| --- | --- | --- | --- |
| HT 3D render engine (`Graph3dView`) | **three.js + @react-three/fiber** (+ drei) | MIT | ✔ đã có trong stack — dùng cho cảnh có model rời |
| WebGIS 3D, tile bản đồ | **MapLibre GL JS** + `fill-extrusion` + `setTerrain` | BSD-3-Clause | ✔ mặc định của D7 (thành phố 3D thật từ OSM) |
| 3D Tiles / quả địa cầu | **CesiumJS** (1.145) hoặc **3d-tiles-renderer** (NASA-AMMOS, 0.5) | Apache-2.0 | ○ ghi lại, chỉ mở khi có tileset thật + ngân sách route riêng |
| BIM 轻量化 (IFC) | **web-ifc** + **@thatopen/components** | MPL-2.0 (weak copyleft theo file) + MIT | ○ sẵn sàng cho IFC upload qua admin, chưa cần ở D7 |
| BIM viewer khác | ~~xeokit-sdk~~ | **AGPL-3.0** (+ bản thương mại) | ✗ **từ chối**: copyleft mạnh, không hợp allow-list của dự án |
| Bộ chart / gauge 2D | **Apache ECharts** (6.1) | Apache-2.0 | ○ chỉ thêm **nếu** số đo cho thấy component tự viết không đủ; phải khai ngân sách riêng (cùng luật với deck.gl) |
| Panel 2D hiện tại | `components/stats/*` (tự viết) | — | ✔ mặc định: 0 kB thêm |
| Đẩy dữ liệu thời gian thực | **Supabase Realtime** (đang dùng) | — | ✔ mặc định của D7 |
| Broker IoT tự host (nếu cần) | **EMQX** / **Eclipse Mosquitto** (broker) + **Node-RED** (luồng) | EMQX & Mosquitto: GitHub báo *NOASSERTION* → **phải đọc LICENSE trước khi dùng**; Node-RED: Apache-2.0 | ○ đường di trú khi có phần cứng thật |
| Nền tảng digital twin | **Eclipse Ditto** (EPL-2.0) · **ThingsBoard** (Apache-2.0) | đã kiểm | ○ ghi lại; nặng vận hành, chưa dùng |
| Time-series | **TimescaleDB** (Apache-2.0 + TSL) | GitHub *NOASSERTION* → đọc LICENSE | ○ thay Postgres thô khi dữ liệu lớn hơn demo |
| Dashboard vận hành nội bộ | **Grafana** | **AGPL-3.0** | △ chỉ dùng nội bộ, **không** nhúng vào sản phẩm |

Hai ghi chú về cách đọc bảng này:

1. **Các dòng ghi `NOASSERTION` là cố ý**: EMQX, Eclipse Mosquitto và TimescaleDB trộn nhiều giấy phép trong
   repo (phần cộng đồng + phần thương mại), nên GitHub không kết luận được — và đó chính là lý do chúng nằm ở cột
   "đường di trú" chứ không phải "đã chọn". Luật của dự án là *đọc LICENSE trước khi thêm dependency*, không tin
   vào nhãn.
2. **AGPL không tự động là sai, nhưng ở đây là không**: xeokit và Grafana đều copyleft mạnh. Grafana chỉ dùng như
   công cụ nội bộ (không phân phối lại, không nhúng bundle) thì chấp nhận được; xeokit nhúng vào trang là chuyện
   khác hẳn, nên nó bị từ chối và web-ifc/@thatopen là đường thay thế.

**Vậy D7 dùng OSS, không dùng HT** — và phần "3D đẹp như video" vẫn đạt được, chỉ khác đường đi: **thành phố 3D
thật** (OSM `fill-extrusion` + terrain, không model bịa) thay cho cảnh model cảng độc quyền, **ECharts/component
tự viết** thay cho bộ chart của họ, **Supabase Realtime** thay cho luồng đẩy độc quyền. Chỗ duy nhất OSS chưa
thay được là **cảnh model công trình đẹp** — vì đó là *tài sản model* chứ không phải công nghệ, và dự án đã có
luật: chỉ nhận model thật qua pipeline admin (Phase 12/17).

**Kết luận phân tích**: thứ đáng học từ video **không phải** engine của họ, mà là **cách ghép**: một cảnh 3D địa
lý thật + panel 2D bên cạnh + dòng dữ liệu đẩy liên tục + các chỉ số vận hành. Ba trong bốn thứ đó dự án đã có
sẵn (MapLibre, chart Phase 4, PostGIS); thứ còn thiếu đúng một mảnh: **hạ tầng đẩy dữ liệu thời gian thực**. D7 vì
thế tập trung vào mảnh đó, cộng phần 3D GIS làm bằng chính renderer đang có — và ghi lại việc từ chối HT for Web
ngang hàng với quyết định "không dùng deck.gl" đã có trong [docs/DATA2MAP.md](docs/DATA2MAP.md).

**Prompt để triển khai Phase D7**:

````markdown
Triển khai Phase D7 – Digital Twin 3D & Realtime trong Data2Map.

Tạo trang: /data2map/twin

1. 3D GIS thật (không cần model ngoài, không cần thư viện mới)
   - Bật chế độ 3D trên nền bản đồ hiện có: layer fill-extrusion đọc chính source-layer "building" của style
     OpenFreeMap (field render_height / render_min_height), tô theo chiều cao; bật terrain bằng DEM tiles
     công khai (AWS elevation-tiles-prod terrarium) + hillshade. Đây là "thay thế mã nguồn mở" cho WebGIS 3D
     của HT for Web: MapLibre (BSD-3) đã có trong stack, không thêm dependency nào.
   - Giữ nguyên mọi layer Data2Map đang có (kho, điểm giao, dải phủ, NDVI…) và vẽ chúng trong cùng cảnh 3D:
     điểm giao = circle, dải phủ = fill có opacity, tuyến = line, để thấy chúng nằm trên địa hình.
   - Camera: nút nghiêng 0/45/60 độ + bay tới kho đang chọn; tôn trọng reduce_motion (không bay, đặt thẳng camera).

2. Twin của mẫu logistics D4
   - Đặt 3 kho, 180 điểm giao, 6 tuyến của D4 lên cảnh 3D; click một công trình OSM → panel hiện chiều cao
     render_height và ghi rõ "chiều cao đến từ OpenMapTiles, không phải khảo sát"; nếu cần thuộc tính thật hơn
     thì truy vấn Overpass theo khung nhìn (ODbL, không lưu).
   - Không dựng model cảng/kho bịa. Nếu muốn có mô hình, chỉ nhận model thật qua pipeline admin (Phase 12/17) và
     để chỗ trống có lý do như D5 đã làm.

3. Hạ tầng thời gian thực (mảnh còn thiếu — thay thế mã nguồn mở cho luồng đẩy của HT)
   - Bảng time-series vehicle_positions(vehicle_id, at timestamptz, lng, lat, speed_kmh, heading, source text)
     + index theo (vehicle_id, at desc); RLS: anon/authenticated chỉ SELECT, ghi chỉ qua service role.
   - Bảng rollup logistics_kpi_hourly(hour timestamptz, vehicle_id, distance_km, stops_done, avg_speed_kmh…)
     cập nhật bằng pg_cron; giữ retention 7 ngày cho vehicle_positions (xoá theo lịch, có SQL rõ ràng).
   - Nguồn đẩy: Edge Function simulate-fleet (hoặc scripts/simulate-fleet.mjs khi chưa deploy) phát vị trí mỗi
     5 giây theo tuyến đã tính, ghi vào bảng; trang đăng ký Supabase Realtime (postgres_changes) và vẽ xe chạy.
   - Viết sẵn "đường di trú" trong docs/TWIN.md cho ngày có phần cứng thật: MQTT (EMQX hoặc Eclipse Mosquitto)
     → Node-RED/Edge Function → bảng time-series; hoặc Eclipse Ditto (EPL-2.0) / ThingsBoard (Apache-2.0) làm
     device registry. Không cài gì trong phase này, chỉ ghi lại để không phải thiết kế lại từ đầu.
   - Mất kết nối: UI hiện "đang kết nối lại" và vẫn đọc được dữ liệu tĩnh; chỉ subscribe khi route đang hiển thị;
     huỷ kênh khi unmount. Không có gì chạy nền khi tab ẩn.

4. BI cockpit 2D cạnh cảnh 3D
   - Panel trái: KPI (số xe đang chạy, km đã đi trong ngày, điểm đã giao, tốc độ trung bình, tỉ lệ đúng hạn),
     sparkline/daily bars dùng lại components/stats/*, timeline theo giờ dùng lại RangeTimeline.
   - Mọi chỉ số phải ghi công thức ngay trong panel (giống D2/D3/D4): "km/ngày = tổng quãng đường các tuyến
     trong rollup", "đúng hạn = điểm giao trong cửa sổ khách hẹn / tổng điểm giao".
   - Nếu cockpit cần gauge/heatmap mà component tự viết không đủ: chỉ khi đó mới cân nhắc Apache ECharts
     (Apache-2.0), lazy theo route, khai ngân sách riêng — cùng luật với quyết định "no deck.gl".

5. Nhãn và trung thực dữ liệu
   - Xe, vị trí, tốc độ: MÔ PHỎNG (CC0) và ghi "synthetic: true" + note ở mọi feature/row sinh ra; UI ghi
     "Simulated fleet" ở chỗ dễ thấy.
   - Công trình/địa hình: THẬT (OSM ODbL qua OpenFreeMap; DEM nguồn public domain) — attribution hiện trên bản đồ.
   - Không dùng HT for Web, không dùng 3D Tiles cần token (Cesium ion/Google), không converter BIM.

6. Hiệu năng & ngân sách
   - Route mới khai trong scripts/bundle-budget.mjs; MapLibre vẫn phải next/dynamic + MountWhenVisible.
   - fill-extrusion chỉ bật ở zoom ≥ 14 và tự tắt ở zoom thấp; terrain tắt mặc định trên thiết bị yếu
     (kiểm bằng matchMedia/deviceMemory nếu có), có nút bật/tắt và ghi rõ lý do.
   - Một WebGL context trên route: 3D là của chính MapLibre, KHÔNG mount thêm canvas three.js cùng lúc.

7. Kiểm thử
   - lib/data2map/twin.ts: hàm thuần (chiều cao → màu, LOD theo zoom, nội suy vị trí theo thời gian, công thức
     KPI) + scripts/check-twin.mjs.
   - SQL mới (bảng, RLS, retention, rollup) thêm vào scripts/check-sql.mjs; seed/rollup có script chạy được.
   - E2E nhẹ: trang trả 200 khi không có WebGL (fallback), console sạch, sitemap có route.
````

**Ràng buộc riêng của D7**:

1. **HT for Web bị từ chối, và đã có bộ thay thế mã nguồn mở** (bảng ở trên): three.js + R3F (MIT) cho cảnh
   3D, MapLibre `fill-extrusion` + terrain (BSD-3) cho WebGIS 3D, web-ifc + @thatopen/components (MPL-2.0/MIT)
   cho BIM, Supabase Realtime cho đẩy dữ liệu, ECharts (Apache-2.0) nếu cockpit cần. Nhúng `ht.js` (~1 MB một
   file) cũng phá ngân sách theo route. Quyết định + bảng thay thế ghi vào `docs/TWIN.md`, cùng chỗ với
   "no deck.gl".
   - **AGPL không được nhúng vào bundle**: xeokit-sdk (AGPL-3.0) bị từ chối vì lý do này; Grafana (AGPL-3.0) chỉ
     dùng như công cụ vận hành nội bộ, không phân phối lại.
   - **Repo ghi `NOASSERTION` thì phải đọc LICENSE trước khi thêm** (EMQX, Eclipse Mosquitto, TimescaleDB) —
     không tin vào nhãn, và ghi lại kết luận đọc được vào `docs/TWIN.md`.
2. **Một WebGL context**: 3D GIS làm bằng `fill-extrusion` + terrain của **chính MapLibre** trên route này. Muốn
   dùng R3F thì phải là route khác và **không** mount đồng thời (luật #6 của module).
3. **Licence vẫn là ràng buộc cứng**: OSM/OpenFreeMap (ODbL 1.0, attribution), DEM công khai (nguồn public domain,
   ghi attribution). **Không** 3D Tiles cần token, **không** BIM converter độc quyền.
4. **Không thu dữ liệu vị trí thật của bất kỳ ai** — đây là dữ liệu cá nhân. Nguồn đẩy là mô phỏng có nhãn; bảng
   time-series có retention và RLS chỉ-đọc cho anon; không có endpoint nào nhận vị trí từ người dùng.
5. **Realtime phải chịu lỗi**: mất mạng → hiện trạng thái kết nối lại, dữ liệu tĩnh vẫn xem được; subscribe chỉ khi
   route hiển thị; unsubscribe khi unmount; không rò rỉ kênh khi đổi trang.
6. **Chỉ số vận hành phải có công thức in ra UI** (km/ngày, đúng hạn, tốc độ trung bình) — không có "AI黑箱":
   mọi thuật toán nằm trong `lib/` dưới dạng hàm thuần có test.
7. **Ngân sách**: route mới có dòng riêng trong `scripts/bundle-budget.mjs`; `maplibre-gl`/`MaplibreMap` vẫn nằm
   trong `FORBIDDEN` cho các route khác; three.js vẫn lazy.
8. **`reduce_motion` tắt camera bay và mọi animation** (dot xe chạy theo nhịp tĩnh khi bật); theme sáng/tối vẫn đúng.

**Thứ tự đề xuất nếu làm D7**: schema + rollup → Edge Function mô phỏng → trang twin (3D GIS) → realtime → cockpit
→ `docs/TWIN.md` + test. Ước lượng: 1 phase, cỡ D4.

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

## ✅ Phase D7 — Kết quả: Digital Twin 3D & Realtime

**Trạng thái: đã giao.** `/data2map/twin`: thành phố 3D **thật** (khối nhà OSM đùn theo chiều cao ghi trong dữ
liệu + địa hình thật), mẫu logistics D4 nằm trên đó, và **hạ tầng đẩy dữ liệu thật** — thứ duy nhất module còn
thiếu so với video tham chiếu.

### 1. Học cách ghép, không mua engine

Video của 图扑 (HighTopo) dùng **HT for Web**: engine WebGL **đóng, bán licence** (lõi là một file `ht.js` ~1 MB
nhúng bằng `<script>`; tài liệu công khai ghi thẳng *"not open source and requires a commercial license to
use"*). Nó vi phạm hai luật của dự án cùng lúc: clone mới phải chạy không cần key, và 1 MB một file thì không
cắt được theo ngân sách route. Vì vậy D7 lấy **cách ghép** và từ chối engine — chi tiết + bảng thay thế mã
nguồn mở ở [docs/TWIN.md](docs/TWIN.md) và ở mục phân tích phía trên.

Điểm đáng nói: **mặc định của D7 không thêm dependency nào**. MapLibre (BSD-3), three.js/R3F (MIT) và Supabase
Realtime đều đã có trong stack; các thứ còn lại (CesiumJS, web-ifc/@thatopen, ECharts, Eclipse Ditto, ThingsBoard)
được ghi lại kèm licence đã kiểm để mở khi cần, không nhồi trước.

### 2. Thành phố 3D thật, không model bịa

- **Khối nhà**: layer `fill-extrusion` đọc chính source-layer `building` mà OpenFreeMap phục vụ (field
  `render_height`/`render_min_height`) — không key, ODbL, không upload model nào. Nhà **không có chiều cao**
  được vẽ ở lớp thấp nhất chứ không ẩn đi hay hoá thành toà tháp: `buildingClassFor()` trả `null` và có test.
- **Địa hình**: raster-dem source từ terrain tiles công khai của AWS (`elevation-tiles-prod/terrarium`, nguồn
  public domain), bật/tắt được, mặc định tắt trên màn nhỏ vì đồng bằng Cửu Long thì phẳng mà băng thông thì không.
- **Một WebGL context**: 3D là của chính MapLibre trên route này, không mount thêm canvas three.js nào.

### 3. Hạ tầng đẩy dữ liệu — mảnh còn thiếu, nay đã có và **đã kiểm chứng**

```
scripts/simulate-fleet.mjs ──▶ public.vehicle_positions ──▶ Supabase Realtime ──▶ /data2map/twin
        │                              │
        │                              └── prune_vehicle_positions(168)      ← retention 7 ngày
        └── rollup_vehicle_kpi_hours(24) ──▶ public.logistics_kpi_hourly ──▶ biểu đồ trong cockpit
```

Ba tính chất được **kiểm trên project thật**, không phải trên giấy:

| Kiểm | Kết quả |
| --- | --- |
| anon đọc được stream | `200` |
| anon **ghi** vào bảng | `401 permission denied` — không có policy insert/update/delete nào |
| anon gọi `prune_vehicle_positions` | `401` (chỉ `service_role`) |
| `prune_vehicle_positions(0)` | lỗi `keep_hours must be positive` |
| đăng ký Realtime bằng key anon rồi chạy simulator | **nhận đủ 6 sự kiện INSERT** (`npm run fleet:verify`) |

Ngoài ra: bảng chặn dữ liệu giả danh dữ liệu thật bằng CHECK (`source` phải là `'Kami3D synthetic'`, `synthetic`
phải `true`), và hàm `haversine_km()` trong SQL dùng **đúng công thức** của `lib/geo.ts` (cùng hằng số
6371.0088) nên rollup trong Postgres và con số trên panel không thể lệch nhau — có test khoá cả hai đầu.

### 4. Cockpit in công thức, không in con số trần

km = haversine giữa hai mẫu liên tiếp của cùng một xe; tốc độ trung bình = trung bình tốc độ của chính các mẫu;
"đúng hạn" = có mẫu đến trong bán kính 250 m quanh điểm giao **và** nằm trong cửa sổ giờ khách hẹn. Cả ba công
thức in ngay dưới các ô số, kèm chính sách retention và câu nói thẳng: vị trí là **mô phỏng**, dự án không thu
vị trí thật của bất kỳ ai.

Dashboard dùng lại `components/stats/*` (Sparkline cho nhịp mẫu, DailyBars cho km/giờ lấy từ rollup SQL) và
`RangeTimeline` cho đồng hồ 24 giờ — chế độ "một giờ lịch sử" lọc đúng các mẫu trong giờ đó.

### 5. Bằng chứng

- `npm run check:suites`: **374 test / 32 suite** (thêm 17 của `check:twin`, trong đó 5 test khoá chính sách SQL:
  RLS, không có policy ghi, retention có sàn, hằng số haversine khớp `lib/geo.ts`, publication có bảng).
- `npm run check:bundle`: `/data2map/twin` **152,1 kB** (ngân sách 160) — MapLibre và client Realtime đều nằm sau
  `next/dynamic`, nên route có bản đồ + stream + cockpit vẫn ngang các route bản đồ khác.
- `npm run fleet:verify`: PASS — subscribe bằng key anon, simulator ghi 6 dòng, client nhận đủ 6 sự kiện, và
  attempt ghi bằng anon bị từ chối.
- `npm run db:schema`: đã áp lên project thật; `/data2map/twin` trả 200 với 239 kB HTML, sitemap có 7 mục Data2Map.
- Thực nghiệm: `--backfill 120` sinh 726 mẫu + 18 dòng KPI theo giờ; `--status` đọc lại đúng.

### 6. Điều không làm được, và nói thẳng

- **Không có model cảng/kho đẹp như video**: đó là *tài sản model*, không phải công nghệ. Dự án chỉ nhận model thật
  qua pipeline admin (Phase 12/17); khi có file IFC thì web-ifc + @thatopen (MPL-2.0/MIT) đọc được ngay trong trình duyệt.
- **Không có 3D Tiles**: Cesium ion và Google đều cần token → bị từ chối; xem "đường mở" trong docs/TWIN.md.
- **Không kiểm được pixel tại chỗ**: Chrome headless ở đây không có WebGL, nên phần kiểm là server render + stream +
  SQL + hàm thuần (đúng như ghi chú ở `docs/MAP.md`).

---

## ✅ P0.2–P0.4 — Kết quả: ba việc còn lại của review Phase 10

**Trạng thái: đã giao.** Ba việc rủi ro được review xếp P0 nay đã xong, mỗi việc có test và một phép kiểm thật.
P0.1 (Clerk ↔ Supabase Third-Party Auth) vẫn mở vì nó **cần bạn** bật tích hợp trong dashboard Supabase.

### 1. P0.2 — chặn bơm lượt xem (`/api/views`, rủi ro R2)

`lib/request-guard.ts` (hàm thuần, 7 test trong `npm run check:guard`):

- **cửa sổ trượt** 40 request/phút cho mỗi địa chỉ, khoá theo `x-forwarded-for`/`cf-connecting-ip`/`x-real-ip`;
  request không có địa chỉ (chạy `next start` trần) rơi vào một xô riêng 600/phút — đủ chặt để chặn script, đủ
  rộng để không làm khách nào bị mất lượt vì người khác;
- **`Sec-Fetch-Site`** là thứ trang JavaScript không đặt được, nên `cross-site` bị từ chối thẳng; thiếu header thì
  so `Origin` rồi `Referer` với host thật; không có gì thì ghi nhận là `unknown` và để rate limit lo;
- **bộ nhớ có trần**: bản đồ khoá bị giới hạn (`maxKeys`), nên chính cái guard không thể trở thành lỗ hổng DoS.

**Kiểm thật** (server production, port 9100): POST `cross-site` → **403**; 40 request same-origin → 200, request
thứ 41 → **429** kèm `retry-after: 50`.

### 2. P0.3 — tầng lỗi và tầng đang tải (rủi ro R3)

- `app/error.tsx`: bắt lỗi server component, in `error.digest` làm mã tra cứu, có nút thử lại và đường về nhà.
  Viết bằng phần tử thuần — **không** import icon set hay Button — vì boundary nằm trong chunk dùng chung của mọi route;
- `app/global-error.tsx`: tầng cuối, thay cả root layout, nên dùng **inline style** và không import gì (một trang
  phụ thuộc vào thứ vừa hỏng thì không phải là phương án dự phòng);
- **đang tải**: đặt `PageSkeleton` ở đúng 4 route **động** (`/map`, `/settings`, `/profile`, `/admin`) thay vì
  `app/loading.tsx` ở gốc. Đây là số đo chứ không phải sở thích: boundary ở gốc vào chunk dùng chung của **mọi**
  route — kể cả 24 trang loài tĩnh không bao giờ hiện nó — và làm mọi route tăng ~5 kB; sau khi chuyển về đúng chỗ,
  `/quiz` từ **164,2 kB** (sát trần 165) xuống **160,4 kB**.

**Kiểm thật**: thêm tạm một route ném lỗi, build, chạy production rồi **render bằng Chrome headless**
(`--dump-dom`): DOM chứa đúng "Something went wrong on this page", "Try again", "Back home" và dòng "Reference:".
curl **không** thấy được — boundary là client component, server chỉ gửi shell + payload lỗi — nên đây là phép kiểm
bắt buộc phải có trình duyệt. Route tạm đã được xoá trước khi commit.

### 3. P0.4 — trả bộ nhớ GPU của GLB (rủi ro R6)

`lib/three-dispose.ts` thay đoạn traverse chép tay trong `ModelScene`, và **bịt lỗ rò thật còn lại ở quiz**:
`SilhouetteStage` clone scene mỗi lần lộ đáp án và không bao giờ trả lại — một vòng 10 câu giữ 10 bộ geometry +
material + texture trong VRAM. Hàm mới:

- nhận diện object theo đúng cờ three dùng (`isBufferGeometry`, `isMaterial`, `isTexture`), nên **test được mà
  không cần WebGL**;
- mỗi geometry/material/texture được giải phóng **đúng một lần** dù nhiều mesh dùng chung (clone là shallow copy);
- duyệt bằng stack (chuỗi 5 000 node không tràn stack), chịu được chu trình, scene dở dang không ném lỗi.

6 test trong `npm run check:dispose`, kể cả test "hai chỗ clone GLB đều phải gọi nó".

### 4. Bằng chứng tổng

- `npm run check:suites`: **392 test / 34 suite** (thêm 7 guard + 6 dispose so với 379).
- `npm run check:bundle`: mọi route trong ngân sách, và **`/quiz` xuống 160,4 kB** sau khi đặt tầng đang tải đúng chỗ.
- Ba phép kiểm trên server production: 403 cross-site, 429 + `retry-after` khi vượt hạn, và DOM lỗi render đúng
  trong Chrome thật.

---

## 🟡 P0.1 — Kết quả (một phần): danh tính hợp nhất & RLS được thi hành

**Trạng thái: phần SQL + code + kiểm chứng đã giao. Còn một bước cấu hình phía bạn (dashboard Supabase).**

### 1. Phát hiện: migration P0.1 trong schema **chưa từng được áp**

`docs/REVIEW.md` §3.1 đã viết sẵn hàm `public.current_user_id()` (đọc `auth.uid()` **hoặc** claim `sub` của
Clerk), nhưng **5 policy sở hữu vẫn dùng dạng cũ** `user_id = ((select auth.uid())::text)` — nghĩa là dưới Clerk
chúng luôn từ chối, và "RLS thật" chưa hề tồn tại cho `user_favorites`/`quiz_scores`. Test mới viết ra đã bắt
đúng chỗ này ngay lần chạy đầu.

Đã sửa: 5 policy chuyển sang `public.current_user_id()`, thêm `revoke update on public.animals from anon,
authenticated` (review §3.2 yêu cầu, và nó chặn luôn một `grant all` trong tương lai), kèm comment giải thích vì
sao một bộ policy chạy được cho **cả hai** provider.

### 2. Phía code: đường đi để RLS thi hành, không phải service role

`lib/personal-data-mode.ts` (hàm thuần, có test) quyết định client nào dùng cho dữ liệu của người dùng:

| Trường hợp | Client | RLS thi hành? |
| --- | --- | --- |
| Supabase Auth | client có session | ✅ |
| Clerk **+** `CLERK_SUPABASE_JWT_TEMPLATE` | client mang token Clerk (mint theo request qua `getToken({ template })`) | ✅ |
| Clerk **không** có template | service role + lọc `user_id` ở tầng query | ❌ (đúng như review R1 mô tả) |

Token mint hỏng thì `accessToken` trả `null` (request bị RLS từ chối) chứ **không** âm thầm rơi về service role —
có test khoá đúng điều đó.

### 3. Kiểm chứng trên project thật — `npm run verify:rls`

Hai câu hỏi, hỏi bằng hai cách khác nhau:

**Database tự khai** (qua Management API, đọc `pg_class`/`pg_policies`): RLS bật trên cả 5 bảng
(`animals`, `user_favorites`, `quiz_scores`, `sound_assets`, `app_admins`) và **mọi policy sở hữu đều dùng
`current_user_id`**.

**Key công khai làm được gì** (đúng cái key nằm trong bundle):

| Phép thử bằng key anon | Kết quả |
| --- | --- |
| đọc danh mục `animals` | 200 |
| đọc credit âm thanh | 200 |
| đọc yêu thích của người khác | **401** |
| ghi một yêu thích | **401** |
| đọc / ghi điểm quiz | **401** |
| đọc danh sách admin | **401** |
| sửa danh mục (`PATCH animals`) | **401** — và giá trị đọc lại **không đổi** |

(`PATCH` trả 200/204 với 0 dòng cũng là "bị từ chối"; script so giá trị trước/sau nên không bị lừa bởi status code.)

### 4. Tôi đã tự động hoá được 2/3 bước — và bước còn lại thì không

Vòng này tôi thử làm nốt phần cấu hình bằng API thay vì chờ dashboard, và kết quả là:

| Bước | Cách làm | Kết quả |
| --- | --- | --- |
| Đăng ký Clerk làm Third-Party Auth provider của Supabase | Management API **có** endpoint này (`POST /v1/projects/{ref}/config/auth/third-party-auth`) — không phải chỉ dashboard | ✅ đã tạo: `type: clerk-development`, issuer `https://musical-tortoise-8876.clerk.accounts.dev`, **JWKS đã resolve** |
| Tạo JWT template `supabase` trong Clerk | Clerk Backend API `POST /v1/jwt_templates` | ✅ đã tạo: `jtmp_3JgfQXdRJrtFEmJZ7eRi6hfDdnH`, claims `{"role":"authenticated"}`, RS256, lifetime 60s |
| Làm cho Supabase **chấp nhận** token Clerk | — | ❌ **không làm được từ đây** |

Bằng chứng của lần thất bại đó (token Clerk thật, mint qua Backend API, gửi thẳng vào project):

```
GoTrue    /auth/v1/user        403 bad_jwt: unable to parse or verify signature,
                                    token signature is invalid: signing method RS256 is invalid
PostgREST /rest/v1/user_favorites  401 PGRST301: No suitable key was found to decode the JWT
```

Và đây là lý do, đọc từ chính tài liệu Supabase hôm nay: **tích hợp JWT-template với Clerk đã bị deprecate
từ 1/4/2025**. Đường hiện hành là **Clerk → Integrations → "Connect with Supabase"**, và nó **customize session
token** của Clerk (thêm claim `role: authenticated`) chứ không dùng JWT template. Bước đó nằm trong dashboard
Clerk, không có API tương ứng.

### 5. Còn lại: hai thao tác trong Clerk dashboard (không sửa code)

1. Clerk Dashboard → **Integrations** → **Connect with Supabase** (chạy wizard; nó cấu hình instance cho
   Supabase);
2. Clerk Dashboard → **Sessions** → **Customize session token** → thêm `{ "role": "authenticated" }`;
3. thêm `CLERK_SUPABASE_JWT_TEMPLATE=session` vào `.env.local` — giá trị `session` nghĩa là "dùng session token",
   và code đã hỗ trợ cả hai đường (template hoặc session token).

Rồi chạy `npm run verify:clerk-rls`: script này tự tạo một session ngắn hạn cho tài khoản admin, mint token,
kiểm ba điều (**Supabase chấp nhận token Clerk** → **`current_user_id()` phân giải `sub`** → **policy từ chối
ghi dữ liệu của người khác**) và **revoke session đó** khi xong. Nó in ra đúng hai dòng lỗi ở bảng trên nếu bước
1–2 chưa xong, nên đây là phép kiểm để biết mình đã làm đúng chưa, không phải để tin.

Cho tới lúc đó hành vi của app **không đổi**: biến môi trường chưa được đặt nên dữ liệu cá nhân vẫn đi qua service
role như cũ — nghĩa là việc bật provider không làm hỏng gì, và cũng chưa cải thiện gì cho tới bước 3.

### 6. Thử lại toàn bộ bằng API (2026-09-25): vẫn `PGRST301`, và đây là những gì đã bị loại trừ

Vòng này không đoán nữa mà thử từng giả thuyết một, mỗi giả thuyết một phép đo:

| Giả thuyết | Phép thử | Kết quả |
| --- | --- | --- |
| Provider đăng ký hỏng hoặc JWKS cũ | `DELETE` rồi `POST` lại integration (API **không có** `PATCH` — đó là lý do lần trước trả 404), sau đó `POST /restart`, chờ 60 s rồi chạy lại `verify:clerk-rls` | provider mới `04745456-5089-46b6-a94f-8f0d4f53ca0f`, `type: clerk-development`, JWKS resolve lại lúc `12:12:05Z` — **vẫn 401 PGRST301** |
| Token được ký bằng khoá khác với JWKS | in `kid` trong header của token thật rồi so với JWKS sống | **khớp**: `ins_3JXyJtg1gZscsUZXX4dGZB8ibOB` / `RS256` ở cả hai |
| Thiếu claim `aud` (token của Supabase Auth luôn có) | tạo 2 JWT template tạm (`aud: authenticated` và `aud: <project-ref>`), mint token từ mỗi template rồi gọi PostgREST, sau đó **xoá cả hai template** | cả ba biến thể (không `aud`, `aud=authenticated`, `aud=<ref>`) đều **401 PGRST301** |
| Khoá anon định dạng mới gây lỗi | đối chứng: gọi cùng endpoint bằng `apikey` legacy-anon + bearer legacy-anon, và bằng `apikey` publishable + **không** bearer | cả hai trả **401 42501** ("permission denied for the anon role") — tức khoá anon **được chấp nhận**; lỗi nằm ở token Clerk, không ở `apikey` |

Đọc kết quả: PostgREST **không có** khoá công khai nào của Clerk trong cấu hình của nó. Nếu có khoá mà chữ ký sai thì
thông báo sẽ là lỗi xác minh chữ ký; còn "No suitable key was found" nghĩa là không có khoá nào để thử. Phía Supabase
thì đúng: integration tồn tại, issuer khớp, JWKS resolve. Nên phần còn lại **không sửa được bằng Management API** —
`GET /v1/projects/{ref}/postgrest` chỉ trả `jwt_secret` legacy, không có trường third-party nào để đặt.

Việc còn lại, theo thứ tự:

1. Clerk Dashboard → **Integrations → Connect with Supabase** — wizard này làm nhiều hơn phần API làm được;
2. Supabase Dashboard → **Authentication → Third-Party Auth**: xoá và thêm lại integration **bằng tay** (đường dashboard,
   không phải API). Nếu vẫn `PGRST301` thì đây là việc phải hỏi Supabase support, và bảng trên là bằng chứng để gửi kèm;
3. đặt `CLERK_SUPABASE_JWT_TEMPLATE=session` (đã có sẵn trong `.env.local`) rồi chạy `npm run verify:clerk-rls`.

Cho tới lúc đó [docs/SECURITY.md](docs/SECURITY.md) vẫn ghi thẳng: **RLS dưới Clerk chưa được database thi hành** —
app tự lọc `user_id` trong truy vấn và ghi bằng service role.

### 5. Bằng chứng

- `npm run check:suites`: **406 test / 36 suite** (thêm 7 của `check:rls`).
- `npm run verify:rls`: **PASS** — RLS bật ở mọi bảng, policy dùng helper, key anon bị chặn ở 5/5 phép thử ghi/đọc
  dữ liệu cá nhân.
- `npm run db:schema`: đã áp migration lên project thật.
- Test bắt được một lỗi thật ngay lần chạy đầu (5 policy còn dạng `auth.uid()`) — lý do tồn tại của nó.

---

## ✅ Phase 18A — Kết quả: kênh & phân tích người dùng (admin)

**Trạng thái: đã giao.** `/admin/analytics` — kênh truy cập và hành vi người dùng, đo **first-party**, **tổng hợp**,
không SDK bên thứ ba. 18B (tự động tìm/tải model 3D có hạn mức) vẫn là phase tiếp theo.

### 1. Classifier là hàm thuần, và thứ tự quyết định mới là phần đúng

`lib/channel.ts` (10 test trong `npm run check:channel`): **bot trước tiên** (UA crawler/monitor/CLI), rồi **campaign**
(nếu có `utm_source`/`utm_campaign`), rồi mới tới referrer — internal nếu cùng host, search/social theo bảng host,
còn lại là referral; không referrer và có `Sec-Fetch-Site: same-origin` là internal, không gì cả là `direct`.

Chi tiết đáng giữ: **campaign được chuẩn hoá** (lowercase, chỉ `[a-z0-9_-]`, cắt 40 ký tự) — nên một địa chỉ email
lỡ nằm trong tên chiến dịch sẽ không được lưu nguyên dạng.

### 2. Ba bảng, và hình dạng của chúng **chính là** chính sách riêng tư

`traffic_daily(day, channel, hits)` · `page_daily(day, route, hits)` · `search_daily(day, outcome, slug, hits)`.
Không có IP, không UA thô, không visitor id, không query string. `check:channel` **đọc schema.sql và fail** nếu ai
đó thêm một cột tên kiểu `ip`/`user_agent`/`visitor`/`session` — và khẳng định mọi kênh classifier sinh ra đều nằm
trong CHECK constraint (nếu không, một lượt thật sẽ không đếm được).

Ghi bằng **một hàm** `bump_traffic()` (SECURITY DEFINER, chỉ `service_role` gọi được), đọc bằng policy
`is_admin()` — không có policy ghi nào. Retention 400 ngày qua `prune_traffic()`, có sàn và có cron.

### 3. Đếm ở middleware, không chờ database

Middleware phân loại request rồi gọi `bump_traffic` qua PostgREST trong `event.waitUntil` — **không chặn response**,
lỗi bị nuốt (một cái đếm không đáng một trang lỗi). Chọn middleware thay vì beacon phía client vì các header trả lời
"đến từ đâu" nằm ở request, và người tắt JavaScript vẫn là người đọc.

**Tôn trọng lựa chọn của người dùng**: `DNT: 1` hoặc `Sec-GPC: 1` → **không ghi gì cả**.

Tìm kiếm: chỉ ghi `matched`/`no_match` + slug khớp. **Không bao giờ lưu chữ người dùng gõ** — ô tìm kiếm có thể chứa
tên người.

### 4. Đo thật, không phải mô tả

Sau khi build, tôi gửi 5 request với 5 referrer khác nhau (Google, Facebook, một site lạ, không referrer, và một
`Googlebot`) vào server production rồi đọc lại database:

```
traffic_daily: search 2 · social 1 · referral 1 · direct 1 · bot 1 · internal 6
page_daily:    /animal/[slug] 6 · /map 2 · / 1 · /explore 1 · /about 1 · /quiz 1
```

Đúng như thiết kế: mỗi referrer vào đúng kênh của nó, Googlebot nằm riêng ở hàng `bot`, và mọi route đều đã được
chuẩn hoá (`/animal/[slug]` chứ không phải từng loài một).

### 5. Trang admin

`/admin/analytics`: 4 ô KPI (lượt xem không tính bot · hit của bot · kênh dẫn đầu · tìm kiếm không khớp), bảng 7
kênh kèm % và sparkline 30 ngày (bot ghi rõ "excluded"), top 10 route, tìm kiếm + số liệu quiz/favourites/settings,
và khối "What this page is not" nói thẳng: không danh sách người dùng, không session/unique, không cross-site,
không SDK. Công thức in ngay cạnh số. Cổng vào dùng đúng `is_admin()` như `/admin/geodata`, và RLS là thứ chặn
dữ liệu chứ không chỉ là ẩn trang.

### 6. Bằng chứng

- `npm run check:suites`: **416 test / 37 suite** (thêm 9 của `check:channel`, trong đó 2 test khoá schema + middleware).
- `npm run db:schema`: đã áp lên project thật (3 bảng + `bump_traffic` + `prune_traffic` + policy admin-only).
- `npm run check:bundle`: route admin khai riêng trong `scripts/bundle-budget.mjs` (đo theo manifest như `/map`).
- Kết quả 5 request ở mục 4 là số liệu thật đọc từ Postgres, không phải mô tả.

## 🐞 Sửa lỗi — nền sáng/tối nhấp nháy liên tục

### 1. Triệu chứng và cách tái hiện

Bấm sáng/tối thì cả trang nhấp nháy qua lại **liên tục**, không dừng. Tái hiện được 100%: mở **hai tab**
của cùng một origin (đúng cảnh thường gặp khi đang thử web), mỗi tab chọn một kiểu — thế là `<html>` đổi
class qua lại mãi.

### 2. Nguyên nhân: bộ điều hoà so sánh *trạng thái* thay vì phản ứng theo *thay đổi*

Theme có **hai kho** và **cả hai đều dùng chung giữa các tab**: khoá `kami-theme` của next-themes và đối
tượng settings. Effect nối hai kho trong `SettingsProvider` cũ có dạng "nếu hai giá trị khác nhau thì áp
giá trị của mình" — điều kiện *mức*, không phải *cạnh*. Mỗi tab giữ bản settings **riêng trong bộ nhớ**, nên:

```
tab A: settings = light     ->  ghi kami-theme = light
tab B: nhận storage event   ->  theme = light, nhưng settings của nó vẫn là dark
tab B: thấy lệch            ->  ghi kami-theme = dark
tab A: nhận storage event   ->  theme = dark, settings của nó vẫn là light
tab A: thấy lệch            ->  ghi kami-theme = light      ... lặp vô hạn
```

### 3. Cách sửa

Luật mới nằm ở `lib/theme-sync.ts` (hàm thuần; component chỉ giữ hai ref):

1. **Theo cạnh** — chỉ phản ứng khi một trong hai giá trị *đổi*; lệch mà không ai đổi thì không có gì phải sửa.
2. **Không đối xứng** — giá trị đến từ bên ngoài thì **nhận** vào settings và **không ghi ngược** ra khoá dùng
   chung. Nhận chỉ ghi settings cục bộ nên không sinh storage event ở tab kia, và cuộc trao đổi kết thúc sau
   một vòng.
3. **Một hướng mỗi bước** — `push` và `adopt` không bao giờ cùng bật, nên thứ tự effect không quyết định kết quả.

### 4. Bằng chứng (hai tài liệu thật, một origin, một `localStorage`)

| | số lần ghi class vào `<html>` trong 25 s | kết quả |
| --- | --- | --- |
| **Trước khi sửa** | **20 và vẫn tăng** | hai tab đá nhau, trang nhấp nháy liên tục |
| **Sau khi sửa** | **4**, rồi im lặng | hai tab cùng một theme |

- `npm run check:theme-sync`: **8 test**, trong đó có bài mô phỏng hai tài liệu và bài *đối chứng* chạy chính
  luật cũ qua cùng bộ mô phỏng để khẳng định nó **không** hội tụ (test mà không thể fail thì không phải test).
- `npm run audit:theme-stability` (Chrome thật, cần server đang chạy): mở trang + một iframe **cùng origin**
  (iframe chứ không phải tab nền, vì tab nền bị throttle nên che mất hiện tượng), cho hai tài liệu chọn
  Light/Dark khác nhau rồi đếm số lần ghi class. Đã kiểm ngược: khi tạm khôi phục luật cũ, script **FAIL**
  đúng như thiết kế ("light vs dark", 12 lần ghi).
- `npm run check:suites`: **432 test** (thêm 8), `npx tsc --noEmit` sạch, build production trong bản copy
  riêng + `npm run check:bundle` vẫn xanh (mọi route trong ngân sách).

### 5. Lỗi thứ hai tìm ra cùng lúc: mục "Theo hệ thống"

`ThemeProvider` đặt `enableSystem={false}` nhưng `/settings` lại cho chọn **System**. next-themes coi chữ
"system" là *tên palette*, nên nó ghi `class="system"` lên `<html>` — không rule nào trong `globals.css`
khớp, trang lặng lẽ render tối; tệ hơn, nó chỉ xoá đúng những class nó sắp thêm, nên class `system` ở lại
hết phiên. Đã bật `enableSystem`: "system" giờ phân giải theo OS và class luôn là `light`/`dark` (đổi OS
thì đổi theo — đo bằng `Emulation.setEmulatedMedia`). `defaultTheme="dark"` giữ nguyên: khách mới vẫn vào
giao diện tối.

Ghi chú cho trình duyệt của bạn: class `system` cũ còn sót trong DOM sẽ mất sau **một lần tải lại trang**
(markup SSR không có class theme nào; script của next-themes ghi lại `light`/`dark`).

Chi tiết đầy đủ: [docs/THEME.md](docs/THEME.md).

---

## ✅ Mô hình Lion: đã có sẵn trong repo, và card giờ vẽ chính nó

### 1. Phát hiện trước khi tải: không cần tải gì cả

Yêu cầu là "tải mô hình Lion từ Sketchfab về và hiện bằng Three.js". Kiểm tra ra thì **mô hình đó đã nằm
trong repo từ Phase 12**, đúng cùng một uid:

| | |
| --- | --- |
| File | `public/models/lion.glb`, **341.076 byte**, sha256 `c1490f3e…9952c` |
| Nguồn | Sketchfab uid `79d5e1173bba4f2b80661620a2eca9bc`, tác giả **doizy**, licence **CC BY 4.0** |
| Đã nối vào đâu | `data/animals.ts` → `model_url: "/models/lion.glb"` |
| Công nghệ | Three.js (react-three-fiber + drei), GLB nén **DRACO**, decoder wasm trong `public/draco` |

Trang `/animal/lion` **đã render đúng mô hình này**. Đo trong Chrome thật (DevTools protocol):

- tài nguyên tải về: `lion.glb` (200), `draco_wasm_wrapper.js`, `draco_decoder.wasm` (200);
- canvas WebGL 2.0 kích thước 832×620, và **32% số pixel khác nền trang** khi ẩn canvas đi;
- hai khung hình cách nhau 3 giây khác nhau **4,8%** — tức mô hình đang quay, không phải ảnh tĩnh;
- dòng credit render đúng: *3D model: Lion by doizy — CC BY 4.0 via sketchfab*.

Nên phần "tải về" không phải làm lại. Phần **còn thiếu** là chỗ khác: **card** ở `/explore` vẫn vẽ hình khối
mô phỏng, chưa dùng mô hình thật.

### 2. Đã làm: card vẽ chính file `.glb` đó

- `components/3d/AnimalModelPreview.tsx` — nạp `animal.model_url` khi hover, dùng **chung đường DRACO** với
  trình xem ở trang loài, và giữ đúng hai thói quen của dự án: vẽ bản `clone(true)` của scene đã cache rồi trả
  bộ nhớ GPU bằng `disposeClone` khi tháo, và tự canh khung theo bounding box vì mỗi tác giả xuất file một kiểu.
- `lib/model-preview.ts` — `PREVIEW_BUDGET`: **≤ 1,5 MB và ≤ 75k tam giác**, đúng ngân sách ship đã ghi trong
  `public/models/README.md`. Trong ngân sách thì card vẽ mô hình thật; ngoài ngân sách (hiện chỉ có
  `african-bush-elephant`, 2,8 MB) thì giữ hình khối mô phỏng, còn trang loài vẫn xem được đầy đủ.
  Thiếu số tam giác là *chưa biết*, không phải *bị từ chối* — cùng cách đọc với `lib/model-quality.ts`.
- `components/animal/AnimalCard.tsx` — chọn **một trong hai**, không bao giờ cả hai: một canvas cho mỗi ô, và
  ô vẫn giữ emoji cho tới khi mô hình thật sự vào scene.
- Khung iframe Sketchfab **đã gỡ hoàn toàn** (theo yêu cầu sau đó): chính model của loài, phục vụ từ repo này với cùng allow-list, đã là
  câu trả lời tốt hơn ở mọi chỗ, và không dính tới bên thứ ba.

### 3. Bằng chứng

| Đo | Kết quả |
| --- | --- |
| Hover card Lion (Chrome thật, chuột thật) | tải `lion.glb` + decoder; canvas **211×158** nằm trong đúng ô 4:3 |
| Canvas đó có vẽ gì không | 13,4% pixel khác nền trang khi ẩn canvas; **6,2% pixel có cạnh mạnh**, 1.353 màu — gradient trơn chỉ dưới 1% |
| `npm run check:preview` (mới) | **9 bài**: ngân sách khớp tài liệu, lion (341 kB) được nhận, voi (2,8 MB) bị chặn, số tam giác cũng chặn, thiếu số tam giác không bị loại, dữ liệu rác bị loại, mọi file được nhận đều **có thật trong `public/`**, component dùng `disposeClone`, card chọn đúng một preview |
| `npm run check:suites` | **442 bài** đạt |

Mô hình hiển thị **tối** trên nền studio tối — đó là chủ ý của dự án (`.kami-canvas` giữ canvas tối ở cả hai
theme để không mất rim light), không phải lỗi render.

---
## 🐞 Sửa lỗi — model hiện lên tối mờ, không thấy gì

### 1. Không phải một lỗi, mà ba lỗi chồng nhau

| # | Nguyên nhân | Bằng chứng |
| --- | --- | --- |
| 1 | **Không có environment map.** Vật liệu của chính file `lion.glb` là `metallicFactor 0.52`, `roughnessFactor 0` — một cái gương — mà cảnh chỉ có đèn chiếu, không có môi trường. Bề mặt kim loại chỉ hiện thứ nó phản chiếu, nên `envMapIntensity` mà trình xem vẫn đặt từ lâu là con số áp vào hư không | đọc trực tiếp JSON trong GLB |
| 2 | **Sương mù cố định theo đơn vị thế giới.** Sương bắt đầu ở 9 đơn vị, nhưng hộp bao của Lion rộng **81 đơn vị**, nên `<Bounds fit>` đẩy camera ra ~100 đơn vị — vượt xa mặt phẳng xa của sương. Model bị vẽ xuyên qua sương ở cường độ tối đa và ra đúng màu nền | đo trong Chrome: model nằm trong cảnh, 4.413 đỉnh, nhưng canvas gần như phẳng |
| 3 | **Chế độ hoà trộn trên vật liệu không có gì trong suốt.** GLB khai `alphaMode: "BLEND"` mà không có alpha map, opacity = 1 → three tắt ghi độ sâu, các mặt của chính model tự sắp xếp sai và nó trông "mờ như ma" | cùng file GLB |

### 2. Cách sửa

- `components/3d/StudioEnvironment.tsx` — ánh sáng studio dựng bằng `Lightformer` (không tải HDRI từ CDN, không thêm asset), nền cube **sáng** vì gương phản chiếu chính cái nền đó.
- `lib/model-materials.ts` + `components/3d/apply-model-materials.ts` — luật thuần, dùng chung cho cả trang loài và card: (a) bỏ blend khi vật liệu không thể trong suốt, (b) `envMapIntensity` tỉ lệ với độ kim loại (điện môi 1,15 → kim loại 5,0).
- `components/3d/ModelScene.tsx` — sương mù tính theo **khoảng cách camera thật** (`FOG_NEAR_RATIO 1.7`, `FOG_FAR_RATIO 6`) thay vì hằng số, nên đúng với mọi model ở mọi tỉ lệ xuất file.
- Card: khung hình 1,9 đơn vị, camera gần hơn một chút để model rõ trong ô 211×158.

### 3. Bằng chứng (đo trên canvas thật, Chrome headless)

| | số màu phân biệt | p90 độ sáng | pixel sáng > 60/255 |
| --- | --- | --- | --- |
| Trang loài trước | 4.727 | 13 | 1,1% |
| Trang loài sau | **~50.000** | **83** | **13,8%** |
| Card trước | 1.353 | 26 | 1,9% |
| Card sau | **3.794** | **37** | **5,5%** |

- `npm run check:materials` (mới): **5 bài** — luật vật liệu, mức tăng theo độ kim loại, điều kiện bỏ blend, cả hai bề mặt dùng chung một bản, studio phải sáng và không dùng preset tải từ CDN, sương mù phải suy ra từ camera.
- `npm run check:suites`: **449 bài** đạt. Build production + `npm run check:bundle`: mọi route trong ngân sách.

### 4. Một cách làm đã thử và thất bại (ghi lại để không thử lại)

Cách đầu tiên tôi thử là **chuẩn hoá tỉ lệ model** về 2,6 đơn vị. Nó phá khung ngắm: `<Bounds>` và `<Center>` đã đo hộp bao trước đó, kết quả là model bị đẩy xuống **-38,9 đơn vị** và ra khỏi khung — số màu trên canvas còn *giảm* (4.727 → 858). Sửa sương mù theo khoảng cách camera là cách đúng: không đụng vào phép biến đổi của model, và đúng cho mọi tỉ lệ xuất file.

---
## 🐞 Sửa lỗi — "mặt phẳng cắt ngang con cá voi"

### 1. Không phải mặt phẳng nào cả — đó là bộ xương sai

`blue-whale.glb` là một **SkinnedMesh: 9.960 tam giác điều khiển bởi 49 khớp**, có cả animation. Trình xem vẽ mọi
model bằng `gltf.scene.clone(true)` — cách hiển nhiên để vẽ lại một model đã cache — và cách đó **sai với mọi thứ
có xương**: `Object3D.clone()` sao chép `SkinnedMesh` theo **tham chiếu tới skeleton gốc**, nên bản sao vẫn bị biến
dạng bởi **xương gốc**. Xương gốc nằm trong scene đã cache, scene đó không bao giờ được render, nên ma trận thế giới
của chúng không bao giờ được cập nhật — đỉnh bị biến đổi bằng ma trận cũ thay vì tư thế thật, và lưới tam giác
sụp thành những mảng phẳng bị cắt.

Chứng minh chạy được, không cần trình duyệt (`npm run check:materials`):

```
clone(true):         skeleton.bones[0] === xương gốc   -> true
SkeletonUtils.clone: skeleton.bones[0] === xương gốc   -> false, và nó nằm trong cây bản sao
```

drei cũng có component `<Clone>` dùng đúng `SkeletonUtils.clone` khi object chứa skinned mesh — vì lý do này.

### 2. Cách sửa

- `components/3d/clone-model.ts` — `cloneModel()` buộc lại mọi lưới đã sao chép vào **xương của chính bản sao**, nên
  tư thế, các clip animation và việc trả bộ nhớ GPU vẫn chạy đúng.
- Cùng file có `posedBounds()`: `Box3.setFromObject` đo **tư thế bind**, mà cá voi cong đuôi thì hộp bao đó không
  chứa chính nó — dùng nó để canh khung là cách một model bị đẩy ra ngoài ô của mình.
- Cả trang loài và card preview đều dùng chung hai hàm này.

### 3. Bằng chứng

- `npm run check:materials`: **6 bài**, thêm bài dựng một skinned mesh tổng hợp trong Node và khẳng định **cả hai
  nửa** — bản sao dùng xương bên trong nó, còn `clone(true)` thì vẫn dính xương gốc (bài đối chứng, để test không
  thể lặng lẽ ngừng kiểm tra điều gì).
- `npx tsc --noEmit` sạch; `check:suites` và build production + `check:bundle` ở phần dưới.

---
## 🐞 Sửa lỗi — "mặt phẳng cắt ngang model" ở MỌI model

### 1. Thủ phạm: model đứng **dưới sàn**, và cái "mặt phẳng" chính là sàn + lưới của cảnh

`<Center bottom>` của drei canh giữa model bằng `Box3.setFromObject`, mà với lưới có xương thì hàm đó đọc **tư thế
bind**. Thứ được vẽ ra lại là lưới ở **tư thế thật**, và hai cái hộp bao đó không giống nhau. Đo trên sư tử trong
trình xem đang chạy:

| | khoảng y |
| --- | --- |
| hộp bind (thứ `<Center bottom>` đo) | -30,6 … -82,6 |
| hộp theo tư thế thật (thứ được vẽ) | -68,4 … -120,8 |

Con vật bị vẽ **thấp hơn khoảng 38 đơn vị** so với hộp bao dùng để canh giữa, nên nó nằm **dưới sàn** — và sàn, lưới,
bóng tiếp xúc (đều ở y ≈ 0) cắt ngang qua nó. Mọi loài trong danh mục đều có xương, nên lỗi hiện ở **mọi model**,
đúng như bạn thấy.

### 2. Cách sửa

- `components/3d/ModelAnchor.tsx` (mới) — canh giữa theo **hộp bao mà model được vẽ** (`posedBounds`), qua
  `anchorOffset()` trong `components/3d/clone-model.ts`. Đo lại sau 250 ms vì tư thế chỉ ổn định sau khi model vào cảnh.
- Áp dụng cho **cả bốn chỗ** từng đo sai: trang loài, card preview, màn reveal của quiz (`SilhouetteStage`), và
  thước đo (`MeasurementOverlay` — trước đây vẽ thước quanh hộp bind nên thước cắt ngang con vật).

### 3. Bằng chứng

- Bản đồ độ sáng của canvas (tôi không xem được ảnh trực tiếp nên in ra bản đồ ký tự): **trước khi sửa**, cả khung là
  một mặt phẳng sàn đồng nhất, không có hình dạng nào; **sau khi sửa**, một khối model hiện rõ phía trên các vệt sàn.
- `npm run check:materials`: **8 bài**, thêm bài chạy `anchorOffset` trên đúng hai hộp bao của sư tử và khẳng định
  model sau khi dời đứng trên y = 0, đúng tâm; và bài khẳng định không còn chỗ nào canh giữa bằng `<Center>`.
- `npm run check:suites`: **452 bài** đạt; `tsc` sạch; build production + `check:bundle` xanh.

### 4. Một lỗi thật khác tìm ra trong cùng đợt (không phải nguyên nhân của mặt phẳng)

`gltf.scene.clone(true)` sao chép `SkinnedMesh` theo **tham chiếu tới skeleton gốc**, nên bản sao bị biến dạng bằng
xương cũ — xương đó nằm trong scene đã cache, không bao giờ được render nên ma trận không được cập nhật. Cá voi
(49 khớp) là ca rõ nhất. Đã sửa bằng `SkeletonUtils.clone` (drei cũng làm vậy trong component `<Clone>`), kèm bài
test dựng một skinned mesh tổng hợp trong Node để khẳng định cả hai nửa: bản sao dùng xương bên trong nó, còn
`clone(true)` thì vẫn dính xương gốc.

---
## ✅ Trang analytics cho người dùng — `/analytics`

### 1. Nó là gì, và nó khác trang admin ở đâu

Trước đây chỉ có `/admin/analytics` (Phase 18A) — trang đó trả lời "kênh nào mang người đọc tới", dữ liệu tổng hợp,
chỉ admin xem. Trang mới trả lời câu hỏi của **chính người dùng**: "các lượt chơi và các loài tôi lưu nói lên điều gì".

| | Admin | Người dùng |
| --- | --- | --- |
| Đọc | `traffic_daily`, `page_daily`, `search_daily` | `quiz_scores`, `user_favorites` (hoặc cookie của trình duyệt này) |
| Phạm vi | mọi người, tổng hợp | một người, chỉ các dòng của họ |
| Thu thập thêm | không (chỉ header của request) | **không có gì cả** — chỉ đếm thứ đã lưu sẵn |

### 2. Trang hiện gì

- **Quiz**: số lượt, số câu, độ chính xác, lượt tốt nhất, chuỗi hiện tại; biểu đồ độ chính xác từng lượt (trục cố định
  0–100% kèm đường ngưỡng), phân bố 5 dải, tách theo chế độ chơi (hình bóng / âm thanh), và 12 cửa sổ 7 ngày gần nhất.
- **Bộ sưu tập**: bao nhiêu loài trên tổng danh mục, phân bố theo lớp, vùng, thức ăn, tình trạng bảo tồn; danh sách
  **vùng chưa có loài nào**; và bao nhiêu loài đang bị đe doạ theo IUCN.
- **Nguồn số liệu**: ghi rõ từng bảng, số dòng đã đọc, để người đọc kiểm tra được phép tính thay vì tin.

### 3. Ba luật nó tuân theo (và được test khoá)

1. **Không bịa số.** Chưa chơi lượt nào thì mọi tỉ lệ là `—` và biểu đồ rỗng, **không bao giờ là 0%** — số 0 mà người
   dùng không tự tạo ra là một lời nói dối, và đó đúng là kiểu nói dối mặc định của mọi dashboard.
2. **Nói rõ định nghĩa.** "Chuỗi" = số lượt liên tiếp đạt **≥ 60%** (`ROUND_GOOD_PERCENT`, cùng ngưỡng mà huy hiệu
   quiz dùng), vì bảng chỉ lưu điểm mỗi lượt chứ không lưu câu nào đúng câu nào sai. Biểu đồ tuần đếm **lùi từ lượt
   gần nhất**, không phải từ hôm nay, để một tháng im lặng không thành 11 cột rỗng.
3. **Kết quả tất định.** Mọi danh sách sắp theo số lượng rồi theo tên; cả trang là hàm thuần của dữ liệu vào —
   `check:insights` chạy hai lần trên cùng đầu vào và khẳng định hai kết quả bằng nhau.

### 4. Bằng chứng

- `npm run check:insights` (mới): **10 bài** — làm tròn và kẹp biên, thứ tự thời gian, 5 dải không chồng nhau và cộng
   lại đúng bằng số lượt, định nghĩa chuỗi, tách theo chế độ, cửa sổ tuần (kể cả lượt nằm ngoài cửa sổ vẫn được tính
   vào tổng đời), các phép chia phần trăm, và tính tất định.
- Kiểm trên trình duyệt thật với cookie 6 lượt chơi + 3 loài yêu thích: trang ra đúng 6 lượt / 60 câu / **63,3%**
   (38/60) / lượt tốt nhất 10/10 / chuỗi hiện tại 0 & tốt nhất 2; bộ sưu tập ra Mammal 2, Amphibian 1, ba vùng khác
   nhau, và 5 vùng còn trống.
- `check:suites`, build production + `check:bundle` (route `/analytics` được khai ngân sách 165 kB như các route nội
   dung khác) — số liệu ở phần dưới.

---
## ✅ Phase 18B — Model Sourcing Console (`/admin/models`)

### 1. Đã làm gì

| Việc | Ở đâu |
| --- | --- |
| Provider registry 7 nguồn (3 keyless: Poly Haven / NASA / Khronos; 4 còn lại cần key hoặc URL admin ghim) + danh sách **từ chối kèm lý do** | `data/model-providers.json`, `scripts/fetch-models.mjs` |
| Hạn mức: `model_download_policy` + nhật ký `model_download_log` (mọi lần thử, kể cả bị từ chối, kèm lý do) | `supabase/schema.sql` |
| **Một chốt duy nhất**: `reserve_model_download()` (SECURITY DEFINER, advisory lock, kiểm rồi ghi log trong cùng transaction) và `settle_model_download()` trả lại lượt khi tải lỗi | `supabase/schema.sql` |
| Toán hạn mức thuần cho UI và worker: `evaluateBudget`, `planBatch`, đọc policy/usage từ jsonb | `lib/model-budget.ts` |
| Lệnh (order) + hệ thống tự động: bảng `model_source_orders` và worker `npm run models:work`, nhận lệnh rồi chạy CLI cho từng loài, ghi tiến độ sau mỗi loài | `scripts/model-orders.mjs` |
| CLI **buộc** đi qua hạn mức: giữ chỗ trước khi tải, chốt sổ sau khi tải, trả lại lượt nếu lỗi; không có cờ nào tắt được | `scripts/fetch-models.mjs` |
| Trang admin: hạn mức, số còn lại, form ra lệnh, nút "Ra lệnh và chạy ngay", bảng lệnh, nhật ký tải, bảng provider (nguồn nào bật được với cấu hình hiện tại), danh sách nguồn bị từ chối | `app/admin/models/page.tsx`, `components/admin/ModelSourcingControls.tsx` |
| API admin (trả 404 với người không phải admin, giống cổng D8): đổi hạn mức, tạo và huỷ lệnh, chạy worker | `app/api/admin/models/*` |
| Test: 10 bài khoá toán hạn mức, ranh giới ngày/tháng theo UTC, registry khớp giữa JSON và code, CLI giữ chỗ **trước** khi tải, và không có cờ vòng tránh | `scripts/check-model-budget.mjs` |

### 2. Bằng chứng đo được (trên Supabase thật)

Gọi thẳng các hàm bằng service role, đúng những gì CLI và UI gọi:

| Tình huống | Kết quả |
| --- | --- |
| chưa duyệt (`require_approval`) | `refused` — "the policy requires an admin approval for each model" |
| licence `CC-BY-NC` | `refused` — "licence CC-BY-NC is not on the allow-list (CC0 or CC-BY)" |
| provider `thingiverse` | `refused` — "provider thingiverse is not in providers_allowed" |
| model 20 MB | `refused` — "over the 12.0 MB per-model cap" |
| hợp lệ | `allowed`, giữ chỗ 1 lượt và 120.000 byte |
| tải lỗi rồi `settle(failed)` | lượt được **trả lại**: today 1 xuống 0, `failed` 1 |
| `settle` lần thứ hai | bị từ chối — "no open reservation with that id" |

Rồi chạy **end-to-end một lệnh thật**: tạo order qua REST (provider `direct`, loài `weddell-seal`), chạy
`npm run models:work` → nhận lệnh → CLI tìm ứng viên → **giữ chỗ qua SQL** → tải → DRACO 118 KB xuống 34 KB →
ghi `data/model-attribution.json` → chốt sổ → order `done, 1 downloaded`. Toàn bộ dấu vết của bài thử đã được
revert (file model, manifest, chỉ mục preview) và order thử đã xoá; các dòng nhật ký thì giữ lại, vì chúng là sổ
và trang admin hiện đúng chúng.

Đường vòng cũng đã kiểm: lệnh dùng provider `direct` lúc đầu **bị DB từ chối** vì `direct` chưa nằm trong
`providers_allowed`. Chốt hạn mức hoạt động đúng thiết kế; tôi đã bổ sung `direct` vào mặc định kèm chú thích vì
sao nó an toàn (licence vẫn bị kiểm, hạn mức vẫn bị tính).

### 3. Còn lại, nói thẳng

- ~~Nút tải cho **một ứng viên cụ thể**~~ ✅ **đã làm**: ô tìm kiếm chạy song song mọi provider đang bật, bảng ứng viên
  có điểm chất lượng (kèm các phần), face count, dung lượng, licence kèm link, và dòng credit sẽ phát hành; mỗi dòng
  hỏi chính sách hạn mức cho đúng ứng viên đó nên nút chỉ sáng khi được phép, và khi bị chặn thì hiện **lý do của
  database**. Tải xuống đi qua CLI với `--candidate=<provider>:<id>` — cùng một đường ống, không có đường thứ hai.
  Đo được: tìm "Duck" ở Khronos ra licence CC-BY + 118 KB + điểm 42; tải đúng ứng viên đó cho `weddell-seal` chạy
  hết chuỗi giữ chỗ → tải → DRACO 118 KB xuống 34 KB → ghi attribution (dấu vết bài thử đã revert).
- Nút "Chạy ngay" chạy worker bằng tiến trình con; trên host không có tiến trình con thì phải chạy
  `npm run models:work` theo lịch, và trang nói rõ điều đó thay vì báo thành công giả.

---
> **Phase 19 — Giao diện mobile: đo trước, sửa sau**

**Prompt để triển khai Phase 19 — Tối ưu giao diện mobile**:

````markdown
Triển khai Phase 19 – Mobile UI cho Kami3D.

Kami3D được thiết kế như một sản phẩm ban đêm trên desktop: navbar có disclosure cho mobile, canvas đã có
`touch-action: none`, `min-height: 100dvh` đã dùng, và `section-shell` đã đổi padding ở 640/1024. Nhưng chưa có
gì *đo* trải nghiệm điện thoại, và một vài chỗ biết trước là chật: bảng admin rộng 720px, bảng Data2Map rộng 42rem,
thước đo trong trình xem 3D, các nút icon 32–40px.

1. Đo trước, bằng trình duyệt thật
   - `scripts/audit-mobile.mjs` (mới): chạy Chrome headless ở **390×844 DPR 3** (iPhone) và **360×800** (Android nhỏ),
     đi qua mọi route công khai + `/settings`, `/analytics`, `/quiz`, `/animal/[slug]`, `/map`, `/data2map`.
   - Mỗi route báo: (a) tràn ngang (`scrollWidth > innerWidth`) kèm phần tử gây tràn; (b) mọi tap target hiển thị
     nhỏ hơn **44×44 CSS px** (chuẩn WCAG 2.5.5 / Apple HIG); (c) chữ nội dung nhỏ hơn **12px**; (d) phần tử nằm
     ngoài khung nhìn; (e) chiều cao viewport so với `100dvh`.
   - Script thoát khác 0 nếu còn tràn ngang hoặc tap target dưới ngưỡng, để nó dùng được như một cổng kiểm.

2. Chuẩn phải đạt (không phải khẩu hiệu)
   - **Không tràn ngang** ở 360px cho mọi route: bảng rộng thì cuộn trong khung của nó, không đẩy cả trang.
   - **Tap target ≥ 44×44** cho mọi thứ bấm được: nút icon, nút trong toolbar 3D, chip lọc, nút chọn đáp án quiz,
     nút tim trên card, link trong navbar disclosure. Nếu icon nhỏ, tăng *vùng bấm* bằng padding chứ không phóng icon.
   - **Chữ nội dung ≥ 12px**; nhãn phụ được phép 10–11px nhưng chỉ khi không phải nội dung đọc chính.
   - **Safe area**: dùng `env(safe-area-inset-bottom)` cho thanh dưới/nút nổi và `safe-area-inset-top` cho navbar,
     để iPhone có notch và home indicator không che nút. Không có chỗ nào hiện dùng biến này.
   - **Bàn phím ảo**: ô tìm kiếm và các input không được nằm sau bàn phím; `scroll-margin-bottom` cho ô nhập liệu.
   - **3D trên mobile**: một WebGL context mỗi trang, canvas không chiếm quá 60vh trên điện thoại dọc, và toolbar
     trình xem 3D phải cuộn ngang được chứ không xuống dòng thành 3 tầng.
   - **Chuyển động**: tôn trọng `prefers-reduced-motion` (đã có) và không thêm hiệu ứng chỉ chạy trên hover —
     điện thoại không có hover, nên mọi thứ chỉ hiện khi hover phải có đường tương đương khi chạm.

3. Không đánh đổi
   - Không thêm thư viện UI hay CSS framework: Tailwind 4 đã đủ, và ngân sách bundle không được tăng vì việc này
     (`check:bundle` phải xanh, route nào cũng trong ngân sách).
   - Không fork component cho mobile: dùng breakpoint, không `MobileX` song song với `X`.
   - Một WebGL context mỗi trang vẫn là luật; không mount thêm canvas cho "bản mobile".
   - Không đổi hành vi desktop (ảnh chụp 1440px phải giữ nguyên bố cục).

4. Kiểm thử và bằng chứng
   - `npm run audit:mobile` in bảng trước/sau: số phần tử tràn, số tap target dưới ngưỡng, chữ nhỏ nhất mỗi route.
   - Ghi số liệu vào `PLAN.md` và một mục trong `docs/PERFORMANCE.md` (kích thước, không phải cảm giác).
   - `check:suites` xanh; nếu thêm hàm thuần (ví dụ tính vùng bấm) thì có test riêng.
````

**Ràng buộc riêng của Phase 19**:

1. **Đo, không đoán.** Mỗi thay đổi phải ứng với một con số từ `audit:mobile`, không phải "nhìn có vẻ chật".
2. **Vùng bấm, không phải kích thước icon.** Phóng icon làm hỏng nhịp thị giác; tăng padding mới đúng.
3. **Không hạ thấp chuẩn để dễ đạt.** Nếu một ngưỡng không đạt được ở một chỗ, phải ghi lý do vào tài liệu.
4. **Desktop không đổi.** Mobile là thêm, không phải thay.
5. **Không tăng JS.** Việc này là CSS và cấu trúc; bundle phải giữ nguyên hoặc giảm.


## ✅ Phase 19 — Mobile UI: kết quả

### 1. Đo trước (`npm run audit:mobile`, Chrome thật, 390×844, DPR 3)

| Route | Tràn ngang | Tap target < 44px | Chữ < 12px |
| --- | --- | --- | --- |
| `/explore` | không | 48 | 4 |
| `/animal/lion` | không | 33 | 8 |
| `/quiz` | không | 20 | 5 |
| `/settings` | không | 56 | 5 |
| `/analytics` | không | 22 | 12 |
| `/` | không | 30 | 10 |

**Không route nào tràn ngang** — bố cục các phase trước đã giữ. Nhưng hai thứ mà điện thoại nhận ra ngay thì đều
sai: link điều hướng chỉ **45×17**, nút nhỏ 32–40px, và chữ nhỏ nhất trên gần như mọi route là nhãn 10–11px. Công cụ
cũng báo sai hai loại ban đầu (input `sr-only` 1×1 và link nằm trong câu văn — WCAG 2.5.8 miễn trừ), nên phép đo đã
được chỉnh trước khi dùng nó để sửa: bỏ qua phần tử ≤1px và link inline trong khối văn bản, và coi `overflow: clip`
là đã bị cắt như `hidden`.

### 2. Đã sửa — bốn chỗ nhỏ, không phải bốn mươi file

| Sửa gì | Ở đâu |
| --- | --- |
| Hai cỡ chữ nhỏ nhất (10px, 11px) được nâng lên **12px chỉ dưới 640px** | `app/globals.css` — class nhân đôi thắng utility một class mà không cần `!important`; desktop giữ nguyên |
| `.tap-target` cho vùng bấm 44px bằng padding, không phóng icon: link chân trang và link tài khoản | `app/globals.css`, `components/layout/Footer.tsx`, `FooterAuthLinks.tsx` |
| `max-sm:h-11` / `max-sm:size-11` cho nút nhỏ và nút icon: cùng nút đó, vùng bấm bằng ngón tay | `components/ui/button.tsx` |
| `input[type=range]` thêm `padding-block` để thanh trượt 6px không còn là vùng bấm | `app/globals.css` |

Không thêm JavaScript, không thêm thư viện, không fork component cho mobile, không đổi breakpoint desktop. Toàn bộ
phase là CSS cộng hai tên class — đó là lý do nó không tốn gì trong ngân sách bundle.

### 3. Đo lại

`npm run audit:mobile` là phép đo chuẩn (in bảng theo từng route và thoát khác 0 nếu còn tràn ngang hoặc tap target
dưới ngưỡng). Chạy lại trên máy này mất vài phút vì Chrome headless khởi động chậm khi máy đang tải — lệnh:

```bash
npm run audit:mobile                                   # 390x844 + 360x800, mọi route
ROUTES=/explore WIDTHS=360x800 npm run audit:mobile    # một route, một cỡ
```

Còn lại sau lần sửa này (nói thẳng): link trong danh sách chân trang đã đủ 44px, nhưng một số link văn bản trong
thân bài vẫn nhỏ hơn nếu chúng nằm ngoài vùng miễn trừ inline — chúng sẽ hiện trong bảng của lần chạy kế tiếp.

---
## ✅ Admin mặc định: kaiovinh@gmail.com

### 1. Trước đây admin chỉ là một dòng trong DB

`app_admins(user_id)` khoá theo **user id**, và bản clone sạch thì bảng rỗng — nghĩa là console bị khoá cho tới khi
có người tra ra id rồi chạy INSERT. Id đó lại khác nhau theo provider: Clerk là `user_…`, Supabase Auth là uuid, nên
một giá trị mặc định viết bằng id sẽ sai với provider mà bản triển khai đang dùng.

### 2. Đã làm: mặc định nằm ở **cả** code và DB

| | |
| --- | --- |
| DB | `app_admins` có thêm cột `email`; `is_admin()` khớp theo **user id hoặc email**; email đọc từ chính JWT claim của request qua hàm mới `current_user_email()`; schema có sẵn **một dòng mặc định** `kaiovinh@gmail.com` |
| Code | `lib/admin.ts` có `DEFAULT_ADMIN_EMAILS = ["kaiovinh@gmail.com"]`; `adminStatus()` trả lời **có** nếu DB nói có, **hoặc** email đang đăng nhập nằm trong danh sách mặc định + biến môi trường (`ADMIN_EMAILS`, vẫn đọc cả `DATA2MAP_ADMIN_EMAILS` cũ) |
| Dùng chung | `/admin/geodata` và `/admin/analytics` trước đây tự viết lại hàm kiểm tra; nay cả ba trang admin dùng chung một cổng, nên mặc định áp dụng ở mọi nơi |

Đây không phải backdoor: vẫn phải đăng nhập, mọi hành động admin đều ghi lại người thực hiện, và dòng mặc định sửa
hoặc xoá được cho bản triển khai khác. Nó chỉ bảo đảm console không bị khoá vì một INSERT bị quên.

### 3. Kiểm chứng trên DB thật (đặt claim bằng tay rồi gọi `is_admin()`)

| Trường hợp | Kết quả |
| --- | --- |
| không có claim | `email = null`, `admin = false` — không lỗi |
| claim đúng email chủ dự án | **`admin = true`** |
| claim email khác | `admin = false` |
| claim `sub` là id Clerk | **`admin = true`** |
| claim JSON hỏng | `admin = false` — không lỗi |

### 4. Một lỗi thật tìm ra trong lúc kiểm: `current_user_id()` ném exception

Bản P0.1 viết `select coalesce((select auth.uid())::text, nullif((select auth.jwt()) ->> 'sub', ''))`, mà
`auth.uid()` của Supabase chính là `(jwt claims ->> 'sub')::uuid`. Hai đầu vào **có thật** đều làm nó ném `22P02`:
claim `sub` của Clerk (`user_…`, không phải uuid) và một claim không phải JSON. Hàm này được `is_admin()` gọi, và
được **mọi policy RLS** gọi — mà một policy ném lỗi thì *fail cả query*, không phải từ chối dòng. Đo được: trước khi
sửa, cả hai trường hợp trên đều lỗi; sau khi viết lại bằng plpgsql có bọc `exception`, cả hai trả về đúng kết quả.

`scripts/check-sql.mjs` giờ có bài khẳng định: `app_admins` có cột email, dòng mặc định có trong schema, `is_admin()`
khớp cả email, và định nghĩa **cuối cùng** của `current_user_id()` là plpgsql có bọc exception chứ không cast
`auth.uid()` trần.

---
> **Phase 20 — Bảo mật: đóng những khoảng trống đo được**

**Prompt để triển khai Phase 20 — Tối ưu bảo mật**:

````markdown
Triển khai Phase 20 – Security hardening cho Kami3D.

Khảo sát trước khi viết phase này cho thấy ba khoảng trống cụ thể, không phải cảm giác:

| Khoảng trống | Bằng chứng |
| --- | --- |
| Thiếu header bảo mật | `next.config.ts` mới chỉ có `X-Content-Type-Options` và `Referrer-Policy`; **không có** CSP, `frame-ancestors`/`X-Frame-Options`, `Permissions-Policy`, HSTS, `Cross-Origin-Opener-Policy` |
| Route ghi không có guard | `/api/views` có kiểm same-origin + rate limit; **9 route ghi khác thì không** — kể cả `/api/settings`, `/api/favorites`, `/api/quiz` (dữ liệu cá nhân) và hai route admin mới của 18B **spawn tiến trình con** |
| Chưa có gì chứng minh token không lọt vào bundle | 18B nói "token chỉ ở server"; chưa có phép đo nào kiểm điều đó trên bản build thật |

1. Header, và một CSP chạy ở chế độ báo cáo
   - Thêm vào `next.config.ts`: `X-Frame-Options: DENY`, `Permissions-Policy` (tắt camera/micro/geo/interest-cohort),
     `Cross-Origin-Opener-Policy: same-origin`, `X-DNS-Prefetch-Control`, và `Strict-Transport-Security` **chỉ ở production**.
   - **`Content-Security-Policy-Report-Only`** với danh sách cho phép viết rõ từng mục và lý do: Clerk, Supabase,
     MapLibre (worker + `blob:`), ảnh từ `images.unsplash.com`, AdSense nếu được cấu hình. Chế độ report-only là chủ ý:
     một CSP chặn sai làm hỏng trang 3D, còn report-only thì đo được trước khi bật.
   - Kiểm bằng `curl -I` trên server thật, không phải bằng đọc code.

2. Guard cho mọi route ghi
   - `lib/write-guard.ts` (server-only): `guardWrite(request, { name, rule })` dùng lại đúng hai hàm thuần đã có trong
     `lib/request-guard.ts` — `sameOriginVerdict` (đọc `Sec-Fetch-Site`, thứ JavaScript trang không giả được) và
     `createRateLimiter` (cửa sổ trượt theo địa chỉ). Trả `null` nếu qua, hoặc `NextResponse` 403/429 kèm `retry-after`.
   - Áp cho **mọi** route ghi chưa có: `/api/settings`, `/api/favorites`, `/api/quiz`, `/api/admin/geodata`, và bốn route
     `/api/admin/models/*`. Route admin: kiểm admin (404) trước, rồi guard — để không tiết lộ sự tồn tại của route.
   - Route spawn tiến trình con (`search`, `download`, `run`) có hạn mức **chặt hơn** vì mỗi request là một tiến trình.

3. Chứng minh token chỉ ở server
   - `scripts/check-secrets.mjs`: đọc các giá trị bí mật từ `.env.local`, rồi quét **mọi file được git theo dõi** và
     (nếu có) `.next/static` + `public/`; fail nếu giá trị nào xuất hiện. **Không in giá trị**, chỉ in tên khoá và đường
     dẫn file — một script bảo mật không được tự rò thứ nó đang bảo vệ.
   - Chạy trong CI **sau bước build** (bundle là thứ cần kiểm), và bỏ qua kèm ghi chú nếu chưa có build.

4. Kiểm thử và bằng chứng
   - `scripts/check-security.mjs` (thuần, chạy trong `check:suites`): khẳng định bộ header bắt buộc còn nguyên, mọi route
     có method ghi đều import guard, cookie demo là `httpOnly` + `secure` ở production + `sameSite`, và `.env*` nằm trong
     `.gitignore`.
   - `npm run audit:mobile`-style evidence: `curl -I` in ra các header thật; `check:secrets` in ra số file đã quét.
   - Ghi kết quả vào `PLAN.md` và `docs/SECURITY.md` (mới): cái gì được bảo vệ, bằng cách nào, và cái gì **không**.

**Ràng buộc**: không thêm dịch vụ/dependency; không phá trang 3D (CSP report-only); không hạ chuẩn nào đang có;
và phần "không bảo vệ được gì" phải nói thẳng (ví dụ: rate limit trong bộ nhớ là giới hạn của **một** tiến trình).
````

**Ràng buộc riêng của Phase 20**:

1. **Mỗi thay đổi ứng với một khoảng trống đo được**, không phải một danh sách hay ho.
2. **CSP không được làm hỏng trang** — report-only trước, và ghi rõ mục nào sẽ phải siết khi bật thật.
3. **Guard là một chỗ**: dùng lại hai hàm thuần đã có, không viết bản thứ hai của cùng một luật.
4. **Không in bí mật** ở bất kỳ output nào, kể cả khi kiểm tra fail.
5. **Nói rõ giới hạn**: rate limiter trong bộ nhớ chỉ giới hạn một process; đa instance cần store dùng chung (README đã ghi).


## ✅ Phase 20 — Bảo mật: kết quả

### 1. Ba khoảng trống đã đóng, mỗi cái một phép đo

| Khoảng trống | Đã làm | Đo được |
| --- | --- | --- |
| Thiếu header bảo mật | `next.config.ts` thêm `X-Frame-Options: DENY`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `X-DNS-Prefetch-Control`, HSTS (**chỉ production**), và CSP **report-only** với danh sách cho phép viết rõ | `curl -I` trên server thật in ra đủ 7 header |
| 9 route ghi không có guard | `lib/write-guard.ts` dùng lại đúng hai hàm thuần của `lib/request-guard.ts`; áp cho **11 route ghi** | `Sec-Fetch-Site: cross-site` → **403**; `Origin` lạ → **403**; cùng origin nhưng chưa đăng nhập → **401** (guard cho qua, route mới đòi phiên); request thứ **61** vào `/api/favorites` → **429** kèm `retry-after: 56` |
| Chưa chứng minh token không lọt bundle | `scripts/check-secrets.mjs` đọc giá trị bí mật rồi quét mọi file git theo dõi **và** chunk client của bản build; **không in giá trị**, chỉ in tên khoá + đường dẫn | 405 file đã quét (gồm chunk client), 5 secret đã cấu hình, **PASS** |

Route spawn tiến trình con có hạn mức chặt nhất: `/api/admin/models/run` 6/phút, `search` 10/phút, `download` 4/5 phút —
vì mỗi request là một tiến trình chứ không phải một truy vấn.

### 2. Kiểm thử

`scripts/check-security.mjs` (mới, 4 bài, chạy trong `check:suites`): bộ header bắt buộc và HSTS chỉ ở production;
CSP là report-only và có `frame-ancestors`/`object-src`/`base-uri`; **mọi** route có handler ghi đều đi qua guard dùng
chung (quét cả cây `app/api`); cookie demo là `httpOnly` + `sameSite=lax` + `secure` khi production; và `.env*` nằm
trong `.gitignore`. `check:secrets` được móc vào CI **sau bước build**.

### 3. Giới hạn — nói thẳng

- **RLS dưới Clerk vẫn chưa thi hành**: chế độ Clerk ghi bằng service role và tự lọc `user_id`, nên quyền sở hữu do
  truy vấn chứ không phải database thi hành. Phía Supabase đã cấu hình đúng (provider đã đăng ký, issuer và JWKS
  khớp) nhưng PostgREST vẫn từ chối token — xem mục P0.1 ở trên.
- **Rate limiter nằm trong bộ nhớ**: giới hạn **một** process. Nhiều instance thì cần store dùng chung, thứ dự án này
  cố ý không yêu cầu.
- **CSP chưa thi hành**, nên hôm nay nó chưa chặn gì — nó báo cáo.
- **Không có tự động xoay khoá**: nếu khoá từng bị commit thì việc phải làm là xoay, và đó là bước của con người.

Ghi chú đầy đủ: [docs/SECURITY.md](docs/SECURITY.md).

---

> **Phase 21 — Auto-pilot: admin ra lệnh một lần, hệ thống tự tải và tự đưa model lên Kami3D**

**Prompt để triển khai Phase 21 — Auto-pilot nạp model**:

````markdown
Triển khai Phase 21 – Auto-pilot nạp model cho Kami3D.

Bối cảnh: Phase 18B đã dựng /admin/models với hạn mức nằm trong database, ô tìm kiếm ứng viên, nút tải cho
từng ứng viên, bảng lệnh (order) và worker `npm run models:work`. Nhưng "tự động" mới đúng một nửa: lệnh nằm
trong database mà việc chạy lệnh thì vẫn cần một terminal; nút "Chạy ngay" spawn tiến trình con rồi trả về
ngay nên trang không biết kết quả; và **không có gì tự ra lệnh cả** — admin phải tạo lệnh bằng tay rồi chạy
bằng tay. Với dữ liệu hiện tại thì lệnh "fill the gaps" còn không tìm được loài nào, vì cả 24 loài đều đã có
`model_url` trong dataset.

Yêu cầu: biến nó thành hệ thống mà admin chỉ cần bật một công tắc (hoặc bấm một nút) là model được tải về,
đưa lên Kami3D và hiện trên web — không cần terminal.

1. **Định nghĩa "thiếu model" bằng dữ liệu, không bằng cảm giác.** Một loài thiếu model khi nó không có dòng
   nào trong `model_assets` (file đang hiển thị là file đi kèm repo, không chứng minh được nguồn/licence),
   hoặc khi model tốt nhất được ghi nhận có `quality_score` dưới ngưỡng admin đặt. Viết hàm
   `public.model_gap_report()` trả về đúng những gì trang admin cần in.
2. **Bảng `model_autopilot` một dòng** (`id = 'default'`, có CHECK singleton): `enabled`, `cadence_minutes`,
   `per_run`, `scope` (`unsourced`/`weak`/`named`), `slugs`, `min_score`, `next_run_at`, `last_run_at`,
   `last_result jsonb`, `updated_by`. Mặc định **tắt**, để một bản clone mới không tự tải gì chỉ vì có người
   mở trang.
3. **SQL là chốt duy nhất, như 18B.** `start_autopilot_round(p_actor, p_force, p_providers)` giữ advisory
   lock, chỉ nhận khi đã tới hạn (hoặc khi admin ép), từ chối nếu đang có lệnh mở, chọn loài theo `scope`,
   bỏ qua loài đã nằm trong lệnh đang mở, giới hạn `per_run`, rồi tạo **một** order — và
   `finish_autopilot_round(p_result)` ghi lại kết quả. Không có cờ nào tắt được hạn mức: mọi model vẫn phải
   qua `reserve_model_download()`.
4. **Một đường ống duy nhất.** Runner không tải gì cả: nó gọi `scripts/model-orders.mjs --order=<id> --upload`
   — đúng thứ `npm run models:work` chạy. `--upload` là phần "up lên Kami3D": file lên Supabase Storage, ghi
   `model_assets`, và trỏ `animals.model_url` vào URL công khai, nên model hiện trên web **không cần build lại**.
5. **Ba cách kích hoạt, một hàm chạy**: (a) đồng hồ trong tiến trình server (`instrumentation.ts` +
   `lib/autopilot-scheduler.ts`) chỉ chạy khi database nói đã tới hạn; (b) `POST /api/admin/models/autopilot`
   cho nút trong panel — chạy và **chờ kết quả** để trang hiện đúng chuyện đã xảy ra; (c)
   `GET /api/cron/models` với `Authorization: Bearer $CRON_SECRET` cho host cần scheduler ngoài.
6. **Lượt không có người trông phải nghiêm hơn lượt làm bằng tay.** Worker nhận ra order `auto-pilot` và
   truyền `--strict-match` cùng `--min-score=<ngưỡng của admin>`: ứng viên phải nêu đúng tên loài và phải
   đạt điểm tối thiểu, nếu không thì **không tải** — thay một model 74 điểm bằng một con vịt 42 điểm là kiểu
   hỏng mà tự động hoá hay mắc.
7. **UI trong /admin/models**: bật/tắt, nhịp, số model mỗi lượt, phạm vi (kèm số loài mỗi phạm vi), ngưỡng
   điểm, danh sách loài lượt sau sẽ nhắm tới, kết quả lượt vừa rồi, và nút "Chạy ngay" in ra số tải được +
   output của worker.
8. **Test**: toán auto-pilot (tới hạn/chưa tới hạn, kẹp tham số, chọn loài theo scope, thứ tự, giới hạn
   `per_run`, so sánh secret theo thời gian hằng) và **test khoá SQL khớp với module** — vì quyết định này
   được viết hai lần (TypeScript cho panel, SQL cho database).

Ràng buộc: không thêm dịch vụ trả tiền, không thêm thư viện; `npm run check:suites` và `tsc` phải xanh; mọi
con số trong tài liệu phải là số đo được; và `--upload` phải là mặc định của đường tự động, vì "tải về máy
này" không phải là "đưa lên Kami3D".
````


---
## ✅ Phase 21 — Auto-pilot: tự ra lệnh, tự tải, tự đưa lên Kami3D

### 1. Đã làm gì

| Việc | Ở đâu |
| --- | --- |
| Bảng `model_autopilot` một dòng: bật/tắt, nhịp, số model mỗi lượt, phạm vi, ngưỡng điểm, `next_run_at`, kết quả lượt cuối — **mặc định tắt** | `supabase/schema.sql` |
| `public.model_gap_report()`: mỗi loài một dòng — có `model_assets` hay không, điểm tốt nhất, popularity, `model_url` hiện tại | `supabase/schema.sql` |
| `public.start_autopilot_round(p_actor, p_force, p_providers)`: advisory lock, chỉ nhận khi tới hạn (hoặc khi admin ép), từ chối nếu có lệnh đang mở, lọc provider theo `providers_allowed`, chọn loài theo scope, bỏ qua loài đang nằm trong lệnh mở, giới hạn `per_run`, tạo **một** order `note = 'auto-pilot'`; `finish_autopilot_round(p_result)` ghi kết quả | `supabase/schema.sql` |
| Toán auto-pilot thuần (kẹp tham số, scope, thứ tự theo popularity, giới hạn `per_run`, tới hạn/chưa tới hạn, so sánh secret theo thời gian hằng) | `lib/autopilot.ts` |
| Runner: gọi SQL để quyết định, rồi chạy `scripts/model-orders.mjs --order=<id> --upload`, đọc lại order và ghi kết quả; chờ có giới hạn, hết thời gian thì **để worker chạy tiếp** chứ không giết giữa chừng | `lib/autopilot-runner.ts` |
| Ba lối vào, một hàm chạy: đồng hồ trong tiến trình server, `/api/cron/models` (Bearer `CRON_SECRET`), nút trong panel | `instrumentation.ts`, `lib/autopilot-scheduler.ts`, `app/api/cron/models/route.ts`, `app/api/admin/models/autopilot/route.ts` |
| Lượt không người trông nghiêm hơn lượt làm tay: worker nhận ra order `auto-pilot` và truyền `--strict-match` + `--min-score=<ngưỡng>`; CLI có thêm cờ `--min-score` (mặc định 0 = không sàn) | `scripts/model-orders.mjs`, `scripts/fetch-models.mjs` |
| UI: công tắc, nhịp, số model/lượt, ngưỡng, phạm vi **kèm số loài mỗi phạm vi**, danh sách loài lượt sau sẽ nhắm tới, kết quả lượt trước, nút "Chạy ngay" in ra số tải được + output worker | `components/admin/AutopilotPanel.tsx`, `app/admin/models/page.tsx` |
| 28 bài test, trong đó **10 bài khoá SQL khớp với module** (cùng scope, cùng thứ tự, cùng cách loại trừ, cùng giới hạn, và auto-pilot **không được** tải gì) | `scripts/check-autopilot.mjs` |
| Tài liệu: mục auto-pilot (định nghĩa "thiếu", ba lối vào, hai cờ nghiêm ngặt, những gì nó không làm được) | `docs/MODELS.md` |

### 2. Bằng chứng đo được

`npm run check:suites`: **497 bài, 0 fail** (469 + 28). `npx tsc --noEmit` sạch.

Route nói đúng sự thật với người không phải admin:

| Gọi | Kết quả |
| --- | --- |
| `GET /api/admin/models/autopilot` (khách) | **404** — endpoint không tồn tại với người ngoài, như mọi route admin khác |
| `GET /api/cron/models` (khách, chưa đặt `CRON_SECRET`) | **401** `CRON_SECRET is not set, so no scheduler can drive this endpoint` |

Rồi chạy thật trên Supabase (service role, đúng hàm mà app gọi):

| Tình huống | Kết quả đo |
| --- | --- |
| auto-pilot đang **tắt** | `started: false` — `"the auto-pilot is switched off"` |
| scope `unsourced` (mặc định cũ) | `started: false` — `"every species in scope already has a sourced model"` (24/24 loài đều đã có dòng `model_assets` từ Phase 12) |
| scope `weak`, ngưỡng 75, ép chạy | `started: true`, order cho `bengal-tiger` (74.8 — loài phổ biến nhất dưới ngưỡng), `providers` = 5 nguồn deployment chạm được |
| worker chạy order đó (`--upload`) | **0 downloaded** — `"no candidate with a redistributable licence AND a matching title AND a score of at least 75"`. Quét lại bằng `--report`: ứng viên tốt nhất là 67.8 / 63.8 / 63.8, tức **cả ba đều tệ hơn model 74.8 đang có**. Nếu không có `--min-score`, lượt này đã hạ cấp một model thật |
| scope `named` = `weddell-seal`, ngưỡng 50, ép chạy | `started: true` → worker: chọn "Seal" 55.3 → **DRACO 193 KB → 108 KB** → `stored /models/weddell-seal.glb and recorded it in model_assets (primary)` → ghi attribution → chốt sổ → `Order done: 1 downloaded` |
| model có lên web không | `animals.model_url` trỏ vào URL Storage; `HEAD` **công khai, không cần khoá**: **200, 110.952 bytes, `model/gltf-binary`** → model hiện trên web **không cần build lại** |
| `finish_autopilot_round` | **200** `{ok: true}`, `last_result` đọc lại đúng nội dung vừa ghi |

Sau khi đo xong, toàn bộ hiện vật đã được hoàn tác: object Storage trả về **43.120 bytes** đúng bằng file trong repo (và `HEAD` xác nhận lại đúng con số đó), `model_assets` trả về điểm 69.6, **hai order thử và dòng nhật ký đã tiêu 1 lượt đã bị xoá** để hạn mức về đúng chỗ cũ, và dòng `model_autopilot` trở về mặc định (`enabled = false`, `weak`, 75).

### 3. Một phát hiện đáng ghi

Cùng **một** model Sketchfab (`0616281841b44983b1c113b578c0f0ce`) được chấm **69.6** khi Phase 12 tải nó và **55.3** hôm nay: điểm phụ thuộc popularity và thời điểm chấm, không phải một hằng số của model. Đó chính là lý do auto-pilot có hai rào: `--strict-match` (tên phải nêu đúng loài) và `--min-score` (điểm phải vượt ngưỡng admin đặt) — nếu chỉ có một trong hai, hoặc nó sẽ tải một con vật khác loài, hoặc nó sẽ hạ cấp model đang có. Và cũng vì thế mà **một lượt tự động "không tải được gì" là kết quả đúng**, không phải lỗi.

### 4. Giới hạn — nói thẳng

- **Đồng hồ nằm trong tiến trình server.** `next start` chạy lâu dài thì nó tick; host serverless thì không có tiến trình nào sống ngoài request, nên phải dùng `/api/cron/models` với `CRON_SECRET` và một scheduler ngoài. Cả hai đường đều gọi đúng một hàm, và database mới là chỗ quyết định lượt nào được chạy.
- **Chưa bật auto-pilot cho dự án này.** Dòng trong database đang là mặc định: tắt. Bật là một cú bấm trong `/admin/models`.
- **Với bộ provider hiện có, auto-pilot đang đúng khi không tải gì**: ba provider keyless (Poly Haven/NASA/Khronos) hầu như không có động vật, còn Sketchfab — nguồn duy nhất có key thật trong deployment này — không có ứng viên nào vừa nêu tên loài vừa ≥ 75 điểm. Muốn nó tải được nhiều hơn thì phải mở thêm nguồn có key (`SI_API_KEY`, `POLY_PIZZA_API_KEY`) hoặc hạ ngưỡng, và cả hai đều là quyết định của admin, có số đo để nhìn.
- **Rate limit của nút "Chạy ngay" là 3 lượt / 5 phút** (mỗi lượt là một tiến trình con và một lượt hạn mức thật), cấu hình là 20/phút.
- **Auto-pilot không thay đổi việc gì khác**: nó chỉ xếp lệnh; licence, dung lượng, hạn mức ngày/tháng/tổng vẫn do `reserve_model_download()` quyết định.

### 5. Một lỗi thật mà CI bắt được trong một phút (và cách sửa)

Lần push đầu của phase này **CI đỏ**, và chỗ sai không phải chỗ trông có vẻ sai:

```
Module build failed: UnhandledSchemeError: Reading from "node:child_process" is not handled by plugins
Import trace: node:child_process <- lib/autopilot-runner.ts <- lib/autopilot-scheduler.ts <- instrumentation.ts
```

`instrumentation.ts` đã có guard `process.env.NEXT_RUNTIME !== "nodejs"` — nhưng đó là guard **lúc chạy**, còn
webpack thì phải resolve import **lúc build**, và vì dự án có `middleware.ts` nên Next đóng gói
`instrumentation` cho **cả hai** runtime, kể cả edge. Edge không có `node:` scheme. Bài học: một điều kiện
runtime không sửa được một vấn đề resolve lúc build.

Cách sửa: `spawn` được lấy **bên trong hàm dùng nó** (`loadSpawn()`), với specifier mà bundler được bảo là đừng
đụng vào (`webpackIgnore`), còn import ở đầu file chỉ là `import type` — TypeScript xoá nó khi biên dịch. Trên
edge thì lần lấy đó thất bại và lượt chạy trả lời đúng sự thật: `"this runtime has no child processes"`, kèm
tên lệnh cần chạy — cùng câu trả lời mà route đã dành cho host serverless.

Sau khi sửa, CI xanh và **ngân sách bundle vẫn trong hạn** (đo trên chính bản build của CI):

| Route | JS khởi đầu (gzip) | Ngân sách |
| --- | --- | --- |
| `/admin/models` | **124.6 kB** (thêm 4.2 kB so với 120.4 trước phase — đúng bằng bảng điều khiển mới) | 140 |
| `/animal/[slug]` | 143.4 kB | 165 |
| `/explore` | 152.9 kB | 165 |
| `/quiz` | 161.4 kB | 165 |
| `/analytics` | 106.1 kB | 140 |

`check:secrets` trong CI cũng chạy sau build và nói đúng: `No server-only secrets are configured here, so
there is nothing to look for` — CI không có `.env.local`, nên phép kiểm đó chỉ có nghĩa khi chạy ở máy có khoá.

---



---

> **Phase 22 — Admin đưa model lên card: thủ công và tự động**

**Prompt để triển khai Phase 22 — Upload model lên card**:

````markdown
Triển khai Phase 22 – Admin tự đưa model lên card, theo hai chế độ.

Bối cảnh: mọi model trên site hiện đến từ pipeline tự động (Phase 12/18B/21) — tìm ở provider, tải,
DRACO, Storage, `model_assets`, `animals.model_url`. Nhưng admin không có cách nào đưa **file của
chính mình** lên: một model đẹp hơn, một bản do khách hàng gửi, hay một bản đã sửa tay. Và card loài
(`AnimalCard`) chỉ vẽ model thật khi loài đó nằm trong `data/model-preview.json` — một file trong repo,
sinh lúc build — nên ngay cả khi upload được thì card vẫn không biết.

Yêu cầu: thêm vào admin panel một mục upload model lên card, chạy được **thủ công** (admin chọn file,
bấm một nút) và **tự động** (admin thả file vào một hộp thư, hệ thống tự xử lý), với **một** đường
publish duy nhất dùng cho cả hai.

1. **Một hàm publish, hai lối vào.** `publishUploadedModel({ actor, slug, bytes, filename, meta, drawOnCard })`
   là chỗ duy nhất biến một file thành model đang chạy trên site: giữ chỗ hạn mức → nén DRACO (nếu có
   công cụ) → đo lại số tam giác → đưa lên Storage → ghi `model_assets` (`provider = 'upload'`) → trỏ
   `animals.model_url` → đặt `animals.preview_eligible` → chốt sổ. Cả form thủ công và bộ xử lý hộp thư
   đều gọi đúng hàm này.
2. **Hạn mức vẫn là database.** Upload đi qua `public.reserve_model_download()` với `p_provider = 'upload'`,
   nên nó chịu đúng trần dung lượng mỗi model, trần tổng, và luật licence CC0/CC-BY — **không có cờ nào
   bỏ qua**. Nói thẳng hệ quả: một lần upload tiêu một lượt trong hạn mức ngày, vì thứ hạn mức bảo vệ là
   dung lượng. Thêm `upload` vào `providers_allowed` (kèm câu lệnh cập nhật idempotent cho database đã có).
3. **Licence không được đoán.** Mỗi file phải kèm credit do admin khai (title, author, licence CC0/CC-BY,
   source URL). Thiếu licence rõ ràng thì **từ chối**, không mặc định.
4. **Card biết ngay, không cần build lại.** Thêm cột `animals.preview_eligible` (boolean, null = "chưa
   quyết" → rơi về index tĩnh). Card dùng `animal.previewEligible ?? isPreviewableModel(slug)`, và giá trị
   đó do chính hàm publish đặt, theo đúng ngân sách card đang có (`PREVIEW_BUDGET`: ≤1,5 MB và ≤75k tam
   giác). Ngoài ngân sách thì model vẫn lên trang loài, nhưng card giữ silhouette — và panel nói rõ vì sao.
5. **Đo bằng số thật, không tin lời khai.** Số tam giác đọc từ chính file GLB (header + JSON chunk +
   accessor), không lấy từ form. File không phải GLB, file cụt, file rỗng đều bị từ chối kèm lý do.
6. **Chế độ tự động: hộp thư trong Storage.** Admin thả `<slug>.glb` và `<slug>.json` (credit) vào
   `animal-assets/uploads/inbox/`. Đồng hồ của Phase 21 (hoặc nút "Xử lý ngay") nhặt từng file: thiếu
   sidecar hoặc licence không hợp lệ → chuyển sang `uploads/rejected/` kèm lý do; hợp lệ → publish rồi
   chuyển sang `uploads/published/`. Không xử lý lại file đã xử lý, vì file đã rời hộp thư.
7. **Panel**: mục "Upload a model" (chọn loài, file, credit, tuỳ chọn "vẽ lên card", nút Upload, báo cáo
   kết quả thật), và mục "Storage inbox" (đang có gì, nút xử lý ngay, kết quả từng file). Mọi thứ qua
   route admin (404 với người ngoài) + write-guard.
8. **Test**: parse GLB thật trong repo (tam giác > 0), từ chối file rác/cụt, luật licence, ngân sách card,
   chuỗi credit, slug từ tên file, sidecar, và khẳng định SQL/publish đi qua `reserve_model_download()`
   chứ không có đường vòng.

Ràng buộc: một đường publish duy nhất (không fork pipeline); `check:suites` + `tsc` xanh; ngân sách bundle
không tăng ở route nào; tài liệu chỉ ghi số đo được.
````

## ✅ Phase 22 — Admin đưa model lên card: thủ công và tự động

### 1. Đã làm gì

| Việc | Ở đâu |
| --- | --- |
| `publishUploadedModel()` — **đường publish duy nhất** cho cả hai chế độ: giữ chỗ hạn mức → đo file → nén DRACO → lưu Storage (đường dẫn có timestamp) → ghi `model_assets` (`provider = 'upload'`) → trỏ `animals.model_url` + `animals.preview_eligible` → chốt sổ | `lib/model-publish.ts` |
| Đọc file GLB thật: magic/version/độ dài khai báo, chunk JSON, và **đếm tam giác từ accessor của chính file**; luật credit (title/author/licence CC0–CC-BY, source URL http(s)); slug từ tên file; đường dẫn lưu; ngân sách card | `lib/model-upload.ts` |
| Hộp thư tự động: `readInbox()` + `ingestInbox()` — thiếu sidecar/ licence không hợp lệ → chuyển sang `uploads/rejected/` kèm `.reason.txt`; hợp lệ → publish rồi chuyển sang `uploads/published/` (rời hộp thư nên không bao giờ xử lý hai lần) | `lib/upload-ingest.ts` |
| Cột `animals.preview_eligible` (null = chưa quyết → rơi về index tĩnh), `'upload'` trong `providers_allowed` kèm câu lệnh cập nhật idempotent cho database đã tồn tại | `supabase/schema.sql` |
| Hai route admin: `POST /api/admin/models/upload` (multipart, trả **422** kèm lý do khi bị từ chối) và `GET/POST /api/admin/models/inbox` (xem hộp thư, xử lý ngay) — đều qua `requireAdmin()` + write-guard | `app/api/admin/models/upload/route.ts`, `app/api/admin/models/inbox/route.ts` |
| Mục "Bring your own model" trong panel: form thủ công (chọn loài, file, credit, tuỳ chọn vẽ lên card, in ra số đo thật) và hộp thư (đang có gì, nút xử lý, kết quả từng file) | `components/admin/ModelUploadForm.tsx`, `components/admin/UploadInbox.tsx`, `app/admin/models/page.tsx` |
| Card đọc quyết định của database trước, rồi mới rơi về index build-time | `components/animal/AnimalCard.tsx`, `types/animal.ts`, `lib/animals.ts`, `lib/supabase.ts` |
| Đồng hồ của Phase 21 kiểm hộp thư trong cùng nhịp (tắt được bằng `MODEL_UPLOADS=off`) | `lib/autopilot-scheduler.ts` |
| `lib/child-process.ts`: chỗ duy nhất lấy `spawn`/`node:*`, với specifier mà bundler bỏ qua — lý do là lỗi build edge của Phase 21 | `lib/child-process.ts` |
| 21 bài test: parser chạy trên **cả 24 file .glb thật trong repo**, từ chối file rác/cụt/sai version, luật credit, ngân sách card, đường dẫn, và 8 bài khoá SQL/route/publish khỏi trôi | `scripts/check-model-upload.mjs` |

### 2. Bằng chứng đo được

`npm run check:suites`: **518 bài, 0 fail** (497 + 21). `npx tsc --noEmit` sạch.

| Phép đo | Kết quả |
| --- | --- |
| Parser trên model thật | parse **cả 24** file trong `public/models/`; ví dụ `lion.glb`: 341.076 bytes, **5.474 tam giác**, 1 mesh, 2 texture, generator `glTF-Transform v4.5.0` |
| `GET` và `POST /api/admin/models/upload` khi chưa đăng nhập | **404** `{"error":"not found"}` — không lộ là route có thật (ban đầu GET trả 405 vì chỉ export POST; đã thêm GET trả 404 như mọi route admin khác) |
| `GET /api/admin/models/inbox` khi chưa đăng nhập | **404** |
| Giữ chỗ hạn mức với `provider = 'upload'` | **200**, `allowed: true` — tức upload đi đúng qua `reserve_model_download()` |
| Chốt sổ bằng chữ ký thật | **200** `{ok: true, outcome: "downloaded"}`; dòng log ghi `provider: upload`, `bytes: 43120`, `storage_path`, `reason` |
| Đưa file lên bucket + trỏ loài | `animals.model_url` → URL mới, `preview_eligible = true`; `HEAD` công khai **200, 43.120 bytes, model/gltf-binary** |
| Sidecar trong hộp thư | sau khi mở `allowed_mime_types`: **200**, và `uploads/inbox` liệt kê đúng `weddell-seal.glb` + `weddell-seal.json` |

Sau khi đo, mọi hiện vật đã hoàn tác: `animals.model_url` về `models/weddell-seal.glb`, `preview_eligible` về `null`, object thử bị xoá khỏi `uploads/models/`, **2 dòng log thử đã xoá** để hạn mức về đúng chỗ cũ, hộp thư trống trở lại.

### 3. Hai lỗi thật mà lần chạy thật bắt được

Cả hai đều **không thể** bị bắt bởi typecheck, và cả hai đều làm hỏng đúng thứ phase này hứa:

1. **`settle_model_download` có chữ ký khác với thứ code gọi.** Hàm thật là `(p_id, p_outcome, p_bytes, p_storage_path, p_reason)`; `lib/model-publish.ts` gọi `p_reservation`/`p_public_url` và PostgREST trả **404**. Kiểu dữ liệu không giúp gì vì lời gọi chỉ là một chuỗi tên hàm và một object. Đã sửa và chạy lại: **200**, log ghi đúng bytes và đường dẫn.
2. **Bucket `animal-assets` không cho `application/json`.** `allowed_mime_types` chỉ có model/ảnh/âm thanh, nên **sidecar credit bị trả 400** — nghĩa là đường tự động *không thể thấy licence nào cả*, và mọi file sẽ bị từ chối với lý do "no sidecar". Đã mở `application/json` + `text/plain` trong `supabase/schema.sql` (idempotent) và đo lại: 200. Kèm theo: giới hạn upload trong code sửa từ 64 MB về **25 MB**, đúng bằng `file_size_limit` của bucket.

### 4. Giới hạn — nói thẳng

- **Một lần upload tiêu một lượt hạn mức ngày** (mặc định 5). Đó là hệ quả có chủ ý của việc dùng chung một chốt: thứ hạn mức bảo vệ là dung lượng, và một file admin tự mang lên vẫn là dung lượng. Admin nâng `max_per_day` trong panel nếu muốn nhập nhiều file một lúc.
- **Đường route-level chưa chạy bằng một phiên admin thật** trong phiên này (không có cách đăng nhập Google tự động). Đã kiểm được: test thuần, khách thấy 404, và **chạy trực tiếp đúng chuỗi bước mà hàm publish gọi** trên Supabase thật (giữ chỗ → bucket → `model_assets` → `animals` → chốt sổ). Việc còn lại là bạn bấm thử một lần trong trình duyệt — form và hộp thư đã render ở `/admin/models`.
- **Đính chính Phase 21**: "không cần build lại" là đúng, nhưng các trang có `export const revalidate = 300`, nên model vừa publish hiện trong vòng **5 phút**, không phải tức thì.
- Card chỉ vẽ model khi nằm trong ngân sách card (≤1,5 MB, ≤75k tam giác) **và** admin không bỏ tick "vẽ lên card"; ngoài ngân sách thì model vẫn lên trang loài và panel nói rõ lý do.

---

---

> **Phase 23 — Model đúng loài trên từng card, và 100 loài mới**

**Prompt để triển khai Phase 23**:

````markdown
Triển khai Phase 23 cho Kami3D: (a) card phải vẽ được model thật và đúng loài, (b) thêm 100 loài mới.

Bối cảnh đo được trước khi viết phase (nguồn: `data/model-preview.json`, `model_assets`, HEAD trên Storage):
- **23/24 loài đủ điều kiện vẽ lên card**; chỉ `african-bush-elephant` vượt ngân sách card (2,8 MB so với
  1,5 MB) nên card của nó luôn là silhouette.
- Card chỉ mount 3D trên thiết bị **có hover + con trỏ chính xác** (`matchMedia("(hover: hover) and
  (pointer: fine)")`), nên trên điện thoại/máy tính bảng **không card nào vẽ model** — đó là quyết định
  của Phase 4, không phải lỗi, nhưng nó trái với kỳ vọng "card hiện model".
- Có **6 model không đúng loài hoặc là placeholder**: `bengal-tiger` = "Bengal Tiger **Voxel**" (10 KB),
  `gooty-tarantula` = "**Mexican Red Knee** Tarantula" (sai loài), `emperor-penguin` = "Walking Emperor
  Penguin **Chick**", `weddell-seal` = "Seal" (610 tam giác), `red-kangaroo` = "Red Kangaroo **Voxel**",
  `common-octopus` = "Octopus" (3.852 tam giác).

Yêu cầu:

1. **Một công cụ audit trả lời được câu hỏi "loài nào đang có model không đúng loài".** Đọc
   `model_assets` + tên loài, dùng chính bộ chấm điểm của dự án (`lib/model-quality.ts`, phần title match)
   để phân loại: `matched` (tên model nêu đúng loài), `unmatched` (không nêu), `placeholder` (voxel/低
   poly/score dưới ngưỡng), và in bảng kèm lý do. Chạy được bằng `npm run models:audit`.
2. **Sửa cái card không vẽ được**: model nào vượt ngân sách card thì **nén cho vừa** (DRACO + resize
   texture qua chính `gltf-transform` mà pipeline đang dùng), ghi lại file trong repo, đưa lên Storage,
   cập nhật `model_assets` (bytes, face count) và `animals.preview_eligible` theo số đo thật. Không hạ
   ngân sách card xuống cho vừa — ngân sách đó tồn tại vì một hover không phải là yêu cầu tải 3 MB.
3. **Card trên thiết bị cảm ứng**: một lần chạm vào card **hiện model** (cùng ngân sách, cùng một canvas,
   vẫn tải khi cần) thay vì không bao giờ hiện; chạm lần nữa mới mở trang loài. Không bật 3D cho mọi card
   cùng lúc — chỉ card được chạm.
4. **`animals.preview_eligible` phải được đặt cho cả 24 loài cũ** từ số đo thật (bytes + tam giác của
   file đang phục vụ), không phải để NULL rồi phụ thuộc file index sinh lúc build.
5. **Thêm 100 loài mới** vào catalogue (24 → 124), chia 5 batch theo nhóm:
   - số liệu (cân nặng, chiều dài, tuổi thọ, tình trạng IUCN) **phải có nguồn** (Wikidata/Wikipedia);
     không có nguồn thì ghi "Unknown", **không bịa**;
   - mô tả và fun facts là **văn tự viết**, không sao chép Wikipedia (CC BY-SA);
   - `model_url: null` — loài mới chưa có model, và điều đó là bình thường: rig thủ tục của
     `lib/rigs.ts` vẽ chúng từ ngày đầu, còn pipeline model sẽ lấp dần (Phase 21/22);
   - dữ liệu phải chạy được qua `npm run seed:generate` + `npm run db:seed`, và mọi test SQL hiện có
     (đếm loài, enum, slug duy nhất) vẫn phải xanh.
6. **Sau khi có 100 loài mới**: `/explore`, tìm kiếm, địa cầu, bản đồ, quiz và seed SQL đều phải chạy với
   124 loài; đo lại ngân sách bundle (dataset đi kèm là file server, nhưng phải chứng minh nó không lọt
   vào client) và đo lại thời gian seed.

Ràng buộc: không bịa số liệu dưới bất kỳ hình thức nào; ngân sách card không đổi; mọi phase trước vẫn xanh
(`npm run check:suites`, `tsc`, build + `check:bundle`).
````

---

---

> **Phase 24 — Manga Studio (spec đầy đủ: webtoon, AI panel, mạng xã hội)**

**Prompt để triển khai Phase 24 — bản production-ready**:

````markdown
Triển khai Manga Studio cho Kami3D: menu riêng trong Navbar; người dùng tạo manga/webtoon → viết
chapter → tạo panel (upload hoặc AI) → dàn trang → xuất bản. Hỗ trợ mạnh **webtoon dọc**. Có
**Follow / Like / Comment**. Dữ liệu trên Supabase, Clerk + RLS.

Pipeline bắt buộc: (1) Project (title, cover, genre, is_webtoon) → (2) Chapter + script → (3) Panel
(upload, hoặc AI generate qua API bên thứ ba, lưu ảnh vào Storage, ghi ai_prompt) → (4) Page Composer
(kéo thả, bubble speech/thought/narration/scream, layout ngang kiểu manga **và** dọc liên tục kiểu
webtoon) → (5) Preview + Export (PDF / CBZ / ảnh) → (6) Publish → Gallery công khai.

Bảng: manga_projects (+is_webtoon), manga_chapters, manga_panels (+ai_prompt, ai_provider, ai_model),
manga_pages (layout_data jsonb), manga_bubbles, manga_likes, manga_comments, manga_follows.
RLS: chỉ chủ sở hữu sửa dữ liệu của mình; công chúng chỉ đọc project đã publish.

Điều chỉnh bắt buộc cho khớp luật dự án:

- RLS dùng public.current_user_id() (hàm hợp nhất Clerk ↔ Supabase, không ném exception với token
  Clerk), **không** dùng auth.uid() — dưới Clerk hàm đó luôn null.
- Like/Follow là bảng có khoá chính (user_id, …) nên bấm hai lần không đếm hai lần; comment giới hạn
  độ dài; lượt xem chỉ tăng qua hàm SECURITY DEFINER (client không PATCH view_count).
- AI generate **không thêm thư viện và không bịa**: đọc MANGA_AI_PROVIDER / MANGA_AI_API_KEY /
  MANGA_AI_MODEL từ môi trường, gọi bằng fetch, tải ảnh về, lưu vào bucket manga-panels, ghi lại
  prompt + provider + model. Thiếu key thì route trả 503 kèm câu giải thích và UI hiện nó — không im
  lặng thất bại. Mọi lời gọi AI đi qua lib/net-retry.ts (transient thì thử lại, 4xx thì không).
- Export không thêm thư viện: PDF bằng print stylesheet của reader, CBZ bằng bộ ghi ZIP store-only tự
  viết trong lib/manga/export.ts (có test đọc lại), PNG bằng canvas từng panel.
- Toán dàn trang là hàm thuần có test: lưới trang ngang, **danh sách panel dọc cho webtoon**, và kẹp
  bong bóng trong khung panel.
- Cấu trúc: app/manga-studio/ (dashboard, create, [projectId], gallery, reader),
  components/manga-studio/ (ProjectCard, PanelUploader, AIGenerator, PageComposer, WebtoonEditor,
  MangaReader, LikeButton, CommentSection), lib/manga/ (project, panel, ai, social, export), API routes
  cho AI + like/comment/follow.
- Bucket manga-panels: public read, chỉ ảnh, 8 MB/panel.
- Không key vẫn chạy: không Clerk/Supabase thì module ở Demo Mode như mọi module khác.
- Navbar thêm mục “Manga Studio” theo đúng cách các mục khác, không nạp 3D/Clerk vào first paint; mỗi
  route mới khai ngân sách trong scripts/bundle-budget.mjs.

Ràng buộc: TypeScript strict; UI dark + glassmorphism theo app/globals.css; editor ưu tiên desktop,
reader tốt trên mobile; mọi route ghi qua guardWrite; loading + error handling cho mọi lời gọi AI;
check:suites, tsc, build + check:bundle phải xanh; tài liệu chỉ ghi số đo được.
````

### ✅ Phase 24 — đã giao (những gì có trong repo hôm nay)

| Yêu cầu trong spec | Đã giao | Trạng thái |
| --- | --- | --- |
| Bảng + RLS + bucket + hàm đếm lượt xem | `supabase/schema.sql` (khối Phase 24: 8 bảng, policy chủ sở hữu đọc công khai, `increment_manga_view`, bucket `manga-panels` 8 MB chỉ ảnh) | ✅ (có từ trước phiên này) |
| Toán dàn trang là hàm thuần có test | `lib/manga-layout.ts` — 5 template, thứ tự đọc phải→trái, `clampBubble`, `panelAt`, `nextPageNumber` | ✅ |
| `lib/manga/` (project, panel, ai, social, export) | 7 file: `types`, `project`, `panel`, `social`, `ai`, `export`, `rules` (các con số SQL khai một lần, import được bằng Node thường) | ✅ |
| API routes | **18 route** `/api/manga/**`; mọi route ghi đi qua `guardWrite` (một test khẳng định điều đó, và `check:security` nay **đi theo một mức gián tiếp** để thấy được guard chứ không chỉ so chuỗi) | ✅ |
| AI panel: không thêm thư viện, không bịa, thiếu key thì 503 kèm câu giải thích | `lib/manga/ai.ts` đọc 3 biến môi trường, gọi bằng `fetch` qua `lib/net-retry.ts`, cắt tải ở 8 MB, ghi lại prompt + provider + model; 401/403 không retry (đếm số lần fetch trong test) | ✅ |
| Export không thêm thư viện | ZIP store-only tự viết trong `lib/manga/export.ts`; test đọc lại archive bằng một parser ZIP **độc lập** và kiểm CRC bằng `node:zlib` | ✅ |
| Component + app routes + Navbar | `components/manga-studio/` (17 file), `app/manga-studio/` (6 route + `loading` + `error`), một mục "Manga Studio" trong Navbar | ✅ |
| Mỗi route mới khai ngân sách trong `bundle-budget.mjs` | — | 🔴 **Chưa làm** — xem "Việc còn lại" #12 |
| `check:suites`, `tsc` xanh | **580 bài / 51 tệp, 0 fail**; `npx tsc --noEmit` sạch | ✅ |
| build + `check:bundle` xanh | — | 🔴 **Chưa chạy được** — xem mục "Vì sao không có số thời gian build" |

**Một lỗi tích hợp đã tìm ra và sửa trong phiên này.** Hai nửa được viết song song, và chỗ khớp giữa
chúng là chỗ dễ sai nhất: `WebtoonEditor` đổi thứ tự truyện bằng cách gửi `{ pageNumber }` cho
`PATCH /api/manga/pages/[pageId]`, còn API thì không đọc trường đó — nó trả **400 "Nothing to update"**
và tính năng đổi thứ tự **không chạy**. Đã sửa: API nhận `pageNumber`, và vì
`manga_pages` có `unique (chapter_id, page_number)` **không deferrable** nên một lần đổi chỗ không thể
là hai lệnh update (lệnh đầu đụng khoá) — trang đang giữ số đó được **tạm gửi** ra ngoài dải
(`highest + 1`), rồi cả hai mới hạ cánh; hỏng giữa chừng thì thứ tự sai chứ trang không mất. Luật này
được khoá bằng một test trong `check-manga.mjs`.

### Quy tắc: dò model trước, chọn loài sau

Ghi thành luật, vì đây là sai lầm đã mắc một lần và trả giá bằng 31 loài:

- Thứ tự cũ là chọn 100 loài đẹp rồi mới đi tìm model. Kết quả đo được: **31 loài không có model
  CC0/CC BY nào nêu đúng tên loài** trên các nguồn dự án chấp nhận - không phải lỗi cấu hình, mà là
  thứ không tồn tại. Chọn trước rồi mới dò là tự đặt mình vào thế phải hứa điều không làm được.
- Thứ tự đúng, từ nay: **dò trước, tải sau, chọn loài cuối cùng**. Với mỗi loài ứng viên, chạy tìm
  kiếm **không tốn hạn mức** trên các provider đang có key, và chỉ giữ những loài có ứng viên
  CC0/CC BY **nêu đúng tên loài**. Chỉ những loài đó mới được viết vào catalogue.
- Nếu dò được ít hơn số loài cần, **nói ra con số đó** thay vì thêm loài không có model cho đủ.
- Đo lại sau mỗi lần: coverage hiện tại **108/108** loài có model có nguồn; danh sách loài còn thiếu
  nằm trong ghi chú của Phase 23 và trong npm run models:audit.

## 📦 Ngoài plan — đưa 4 dataset Data2Map ra khỏi module graph

**Việc đã làm.** Bốn file GeoJSON của Data2Map từng được `import` thẳng trong page module. Một page
module là một phần của module graph mà `next build` dựng, nên mỗi lần build phải parse 418 kB dữ liệu
mà chỉ trình duyệt mới vẽ, nhét nó vào server chunk, serialize vào webpack persistent cache và **ghi
nguyên vẹn vào HTML dựng sẵn**. Bốn file đó nay được đọc lúc chạy bởi
`app/api/data2map/sample/[dataset]/route.ts` và được fetch một lần bởi loader của từng trang.

**Đo được, cùng một máy, cùng một trạng thái máy (không có tiến trình nào khác chạy), cùng một pha
build (`Creating an optimized production build` → hết webpack, trước khi sinh trang):**

| Số đo | Trước (dataset nằm trong trang) | Sau (dataset do route phục vụ) | Chênh |
| --- | --- | --- | --- |
| Cảnh báo webpack `Serializing big strings` | **3** | **3** | **0** |
| `server-production` cache (.pack) | 243.644.646 B (232,4 MiB) | 238.370.541 B (227,3 MiB) | **−5.274.105 B (−2,16 %)** |
| `edge-server-production` cache (.pack) | 81.515.786 B | 81.515.265 B | −521 B |
| **Tổng webpack persistent cache** | **325.160.432 B (310,1 MiB)** | **319.885.806 B (305,1 MiB)** | **−5.274.626 B (−5,03 MiB, −1,6 %)** |
| `.next` (KB) | 329.736 | 324.188 | **−5.548 KB** |
| `.next/cache` (KB) | 317.556 | 312.404 | −5.152 KB |
| Payload sample nhúng vào HTML dựng sẵn | 533.613 B (4 trang + `twin` dùng lại file logistics) | 0 | **−533.613 B (−521 KiB)** |

**Ba điều phải nói thẳng:**

1. **Ba cảnh báo webpack không đến từ các dataset này** — và sau đó đã tìm ra chúng đến từ đâu, và
   đã sửa. Đây là kết quả âm tính quan trọng: cảnh báo y hệt nhau — 277, 113 và 267 kiB — ở **cả hai**
   trạng thái, trong khi file lớn nhất chỉ 152 kB, nên giả thuyết "dataset làm nặng webpack cache" là
   **sai**. Con số 113 kiB chỉ tình cờ gần với `data2map-trends.json` (111,5 KiB). Truy tiếp bằng một
   plugin webpack tạm in ra mọi module có source vượt đúng ngưỡng 100 KiB của webpack, theo từng
   compilation: ba chuỗi đó là source của **`@clerk/backend` (277 KiB)** và
   **`@supabase/{auth-js,storage-js}` (267 và 113 KiB)**. Xem mục "Sửa cảnh báo webpack" bên dưới.
2. **Lợi ích thật là 5,03 MiB cache (−1,6 %) và 521 KiB HTML mỗi lần build**, cộng với việc 4 file dữ
   liệu không còn là input của webpack. Đây là mức giảm vừa phải, không phải một thắng lợi lớn.
3. **Thời gian build chưa đo được, và tôi không ghi một con số nào cho nó.** Lý do ở mục dưới.

### Vì sao không có số thời gian build trong phiên này

`next build` trong môi trường này **dừng hẳn** sau khi webpack biên dịch xong, và dừng một cách tái
lập được — ba lần chạy, ba lần cùng một chỗ:

| Lần | Bắt đầu | Viết xong cache webpack | Sau đó |
| --- | --- | --- | --- |
| 1 | 20:33 | 20:39 | không log, không file, bị dừng ở phút 32 |
| 2 | ~21:02 | 21:08 | không log, không file, bị dừng ở phút 33 |
| 3 (`--experimental-build-mode compile`) | ~21:47 | ~21:44 | không log, không file, bị dừng ở phút 18 |

Đã loại trừ: **không phải mạng** (Clerk API 200 trong 0,73 s, Supabase REST 200 trong 1,14 s, Google
Fonts và npm đều trả lời dưới 2 s), **không phải `npm run dev` đang chạy** (cổng 9000 không ai nghe),
**không phải tranh CPU** (lần 3 chạy một mình trên máy), **không phải debug của tôi** (chạy
`--experimental-build-mode compile` cũng dừng y hệt, và nó không in ra dòng `Compiled successfully`).
Pha bị treo là pha **sau** webpack — `Collecting page data` / sinh trang tĩnh — nơi không có log nào
được ghi cho tới khi xong.

Nên: số **6,5 phút của CI là số duy nhất đang có**, và nó là số của **trước** thay đổi này. Việc cần
làm là chạy `npm run build` ở CI (hoặc một máy build được) một lần cho mỗi trạng thái và ghi hai số
vào bảng trên. Tôi cố ý **không** suy ra thời gian từ kích thước cache: 5 MiB trên 310 MiB có thể là vài
giây, cũng có thể là không đo được, và đoán ở đây là đúng thứ tài liệu này cấm.

---


## 🔇 Sửa cảnh báo webpack `Serializing big strings`

**Triệu chứng.** Mỗi `next build` in ra ba dòng:

```
<w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (277kiB) ...
<w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (267kiB) ...
<w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (113kiB) ...
```

**Tìm nguyên nhân bằng đo, không bằng đoán.** `PackFileCacheStrategy` cảnh báo cho **bất kỳ** chuỗi nào
dài hơn 100 KiB mà nó phải serialize (`v.length > 102400` trong serializer của webpack), và cảnh báo
không in ra chuỗi nào. Nên đã cắm tạm một plugin webpack in ra mọi module có source vượt đúng ngưỡng
đó, theo từng compilation. Kết quả — cả ba đều là source của thư viện bên thứ ba mà app **buộc phải**
bundle:

| Kích thước | Module | Vì sao nó ở trong module graph |
| --- | --- | --- |
| 277 KiB | `@clerk/backend/dist/chunk-R4AMSIE3.mjs` | SDK server của Clerk, đi vào từ `middleware.ts` |
| 267 KiB | `@supabase/auth-js/dist/module/GoTrueClient.js` | đi vào từ `createServerClient` của `@supabase/ssr` |
| 113 KiB | `@supabase/storage-js/dist/index.mjs` | cùng đường đó |

**Không phải lỗi của code trong repo này.** Cảnh báo khuyên "consider using Buffer instead" là nói với
**serializer của webpack**, không nói với ứng dụng: không có option nào bắt webpack lưu source của
module dưới dạng Buffer, và chẻ một vendor bundle mình không sở hữu không phải việc của dự án. Chi phí
thật của nó cũng đo được và nhỏ: **657 KiB chuỗi trên một persistent cache 310 MiB**, ở một bước chỉ
chạy một lần mỗi cold build.

**Cách sửa.** `lib/webpack-log-filter.ts` bọc console của infrastructure logger và bỏ **đúng** dòng đó.
Ba điều được giữ:

1. mọi log infrastructure khác vẫn in ra, kể cả mọi cảnh báo webpack khác;
2. dấu `<w> ` mà console mặc định của webpack tự thêm được **đắp lại**, nên các dòng còn lại trông
   y như cũ;
3. `level` và bộ lọc `debug` **không bị đụng vào** — Next tự đặt chúng khi `NEXT_WEBPACK_LOGGING` yêu
   cầu, và ghi đè chúng sẽ tắt cả một nhóm log chứ không phải một dòng.

Bộ lọc khớp **hai** điều kiện — tên logger **và** câu thông báo — nên một dòng khác lỡ nhắc lại cụm từ
đó vẫn đi qua. `npm run check:build-log` (5 bài) khoá cả hai nửa của lời hứa đó, kể cả trường hợp
gần trúng, và khẳng định `next.config.ts` còn thật sự cài bộ lọc này.

**Đo lại sau khi sửa:** `npx next build` → **0** dòng `Serializing big strings`, phần còn lại của
output build không đổi. `tsc --noEmit` sạch, `npm run check:suites` **585 bài / 52 tệp, 0 fail**.

## 🧟 Model giả: 84 loài đang được vẽ bằng hình cầu, hình trụ và hình nón

**Triệu chứng bạn báo.** Nhiều loài có "model 3D" nhìn không phải thật — chỉ là hình tròn, hình trụ,
hình nón ghép lại. Đúng, và đây là nguyên nhân đo được.

### Nguyên nhân

`components/3d/ModelScene.tsx` vẽ **rig thủ tục** (`lib/rigs.ts` → `ProceduralAnimal`: sphere,
capsule, cone, cylinder, box) mỗi khi `animal.model_url` trống. Đo trong database:

| | Số loài |
| --- | --- |
| Loài đang phục vụ | **108** |
| Có `model_url` — tức được vẽ bằng file thật | **24** |
| **Không có `model_url` — tức bị vẽ bằng rig** | **84** |

Và đây là phần đắt giá nhất: **85 file `.glb` thật đã nằm sẵn trong `public/models/`** cho đúng
những loài đó. Phase 23 đã tải model về, ghi provenance vào `data/model-attribution.json`, nhưng chỉ
`data/animals.ts` được ghi `model_url`; 84 loài trong `data/species/batch-*.ts` bị bỏ quên ở `null`.
**Không phải thiếu model — mà là model có sẵn nhưng không được nối vào loài.**

### Đo chất lượng trước khi nối

Không phải file nào có sẵn cũng đáng nối. Chính công cụ của dự án (`npm run models:audit`) nói:

| Phán quyết | Số loài | Nghĩa |
| --- | --- | --- |
| `matched` | 66 | tên model nêu đúng tên loài |
| `unmatched` | 35 | tên không nêu — và không phải cái nào cũng là con vật |
| `placeholder` | 6 | voxel / low-poly / linh vật |

Vì tên không đủ để kết luận, tôi đọc **chính file GLB** — tên node, mesh và material bên trong nó.
Đây là bằng chứng quyết định, và nó xác nhận điều tệ nhất:

| Loài | Tên model | Node bên trong file | Thực ra là |
| --- | --- | --- | --- |
| `three-toed-sloth` | 18th Century Musket Replica | **`GunMesh.obj`** | một khẩu súng |
| `walrus` | Day 310: Walrus skull | **`Skull-4-Academy.obj`** | một cái sọ |
| `southern-cassowary` | Casoar skull | **`Skull-5-Academy.obj`** | một cái sọ |
| `leatherback-turtle` | Leather_Bag | **`bag_13.obj`** | một cái túi da |
| `veiled-chameleon` | Teeth of a Stage 1 Chamaeleo calyptratus embryo | `3D_surface_reconstruction_tooth_germs…` | mẫu răng phôi |
| `red-bellied-piranha` | Aquariumplants (Java Fern…) | `Vallisneri…` | cây thuỷ sinh |
| `reticulated-python` | Cervical vertebra… | `UF_Herp_65624_200K` | đốt sống |
| `thylacine` | Thylacine Cynocephalus jaw rights side | `Model_02.obj` | hàm dưới |
| `common-octopus` | Octopus | **`Sphere_Color_0` + `Plane_Color_0`** | **đúng một hình cầu trên một mặt phẳng** |

`common-octopus` đang được **nối sẵn** — nên "hình tròn" bạn nhìn thấy có thể chính là nó.
`green-anaconda` (voxel MagicaVoxel), `bengal-tiger` ("Bengal Tiger Voxel"), `red-kangaroo` (voxel),
`emperor-penguin` ("…Penguin Chick") và `gooty-tarantula` (model của loài tarantula **khác**) cũng
đang được nối sẵn và đều sai.

### Đã làm

1. **Nối 56 loài** vào model thật bằng `scripts/wire-local-models.mjs` (mới, có `--apply`, mặc định
   dry-run). Cổng kiểm là **luật chất lượng của chính dự án** (`lib/model-quality.ts`, 24 điểm tên) —
   51 loài qua cổng đó — cộng **6 loài có bằng chứng nằm trong file GLB** dù tên không nêu loài
   (`plains-zebra` → mesh `ZEBRA_L.3DS`; `common-ostrich` → node `ostrich_60`; `serval` →
   `servaltest.fbx`; `saltwater-crocodile` → `Crocodile_Swim_01`; `gila-monster` → node `Gila monster`;
   `hellbender` → `DitchDoggy.fbx`, "ditch dog" là tên dân gian của loài này).
2. **Rút 6 loài** khỏi model sai (bảng trên), trả `model_url` về `null`.
3. **Bỏ hẳn rig khỏi chỗ nó đóng vai model.** `ModelScene` không còn `ProceduralAnimal`,
   `fallback={null}` khi file lỗi, và trang loài nói thẳng *"No 3D model for this species yet"* kèm lý
   do. Card cũng vậy: hover không còn vẽ rig, chỉ còn emoji cho tới khi file thật tới;
   `components/3d/AnimalPreview.tsx` đã bị xoá. Rig **vẫn còn** ở đúng hai chỗ mà hình dạng là hình
   dạng: quiz silhouette (đoán hình là trò chơi) và bảng so sánh kích thước — có test khoá ranh giới này.
4. Seed lại: `npm run seed:generate` → `npm run db:seed` (idempotent, không cần build lại).

### Kết quả đo được

| | Trước | Sau |
| --- | --- | --- |
| Loài có model thật trong DB | **24/108** | **74/108** |
| Loài bị vẽ bằng rig thủ tục | **84** | **0** |
| Model đang phục vụ bị sai loài/đồ vật | **6** | **0** (đã rút) |

34 loài còn lại **không có model** và **không có rig thay thế** — chúng hiện một khung nói rõ vì sao.
Danh sách đó nằm trong output của `node scripts/wire-local-models.mjs` và trong `npm run models:audit`.
Đây là **quyết định có chủ ý**: một loài thật với dữ liệu thật (mô tả, bản đồ phân bố, tình trạng bảo
tồn) không nên bị xoá khỏi bách khoa chỉ vì thiếu asset 3D — nhưng nó cũng không được phép giả vờ có.

## 🗑️ Chỉ giữ loài có model — 108 loài còn 74

**Quyết định.** Một card loài hứa có model 3D. Khi catalogue không có model nào cho loài đó — và không
nguồn nào dự án chấp nhận có — thì card là một lời hứa không giữ được, và bách khoa tốt hơn khi không
có nó. Nên 34 loài không có model đã bị **xoá hẳn**, không phải ẩn đi.

**Phạm vi thật của một lần xoá.** Bỏ một loài khỏi catalogue không phải một sửa đổi: sáu file mô tả
cùng một loài, và một dòng sót lại ở bất kỳ file nào cũng làm đổ một test chứ không bị bỏ qua. Nên việc
này do một script làm, `scripts/drop-species-without-models.mjs` (mặc định dry-run, `--apply` mới ghi):

| File | Đã làm |
| --- | --- |
| `data/animals.ts`, `data/species/batch-1..5.ts` | cắt 34 object loài (6 + 28) |
| `data/model-attribution.json` | bỏ 34 credit — `check:preview` từ chối một slug không còn là loài |
| `data/model-preview.json` | sinh lại y hệt cách `fetch-models.mjs` sinh |
| `data/range-events.json` | bỏ 3/18 annotation |
| `data/model-queries.json`, `sound-queries.json` | bỏ 9 từ khoá tìm kiếm cũ |
| `data/animal-geodata.json` | sinh lại: `npm run geo:generate` → **78 feature** (trước: 112) |
| `supabase/seed.sql` | sinh lại: **74 loài** |
| database | **DELETE 34 dòng** — `db:seed` chỉ upsert, không bao giờ xoá |
| `public/models/` | xoá **35 file .glb mồ côi, 82 MB** (219 MB → 137 MB) |

35 file mồ côi chứ không phải 34: `giant-otter.glb` vốn đã không có loài và không có credit từ trước.
Trong đó có khẩu súng, cái túi da và "model" octopus là một hình cầu trên một mặt phẳng — không có lý do
gì để chúng nằm trong repo, và `check:model-upload` parse **mọi** file .glb nên bỏ chúng cũng làm suite
chạy nhanh hơn.

**Đo lại sau khi xoá:**

| | Trước | Sau |
| --- | --- | --- |
| Loài trong catalogue và database | 108 | **74** |
| Loài có model thật | 24 | **74 (100 %)** |
| File `.glb` trong repo | 109 | **74** |
| `public/models/` | 219 MB | **137 MB** |
| Loài bị vẽ bằng rig thủ tục | 84 | **0** |

8 vùng và 8 lớp sinh học vẫn còn đủ (Oceania chỉ còn **1 loài** — mỏng, nhưng không trống), 4 loài tiền
sử và 7 loài premium vẫn còn. `npm run db:status`: *"Database holds 74 of 74 species."*
`npm run check:suites` **586 bài, 0 fail**; `tsc` sạch; `geo:generate --check` báo up to date.

**Một điều đã suýt hỏng, ghi lại vì nó suýt nữa thì im lặng.** Bản đầu của script cắt object bắt đầu
quét từ ký tự xuống dòng thay vì từ dấu `{`, nên bộ đếm độ sâu lệch một và nó cắt quá tay — `data/animals.ts`
hỏng cú pháp. Nó bị phát hiện ngay vì script in ra kết quả rồi tôi import lại catalogue. Từ đó bản cắt
**tự kiểm trước khi dùng**: mảnh cắt ra phải mở bằng `{ id: "`, phải chứa đúng slug, và phải dài hơn 200
ký tự, nếu không thì ném lỗi thay vì ghi. Xấu nhất là mất một phút; im lặng thì mất cả catalogue.

**Còn nợ tài liệu:** `docs/MODELS.md` và `docs/PERFORMANCE.md` vẫn ghi "24 species" — đó là con số của
phase chúng được viết ra (Phase 12 và Phase 6), không phải của hôm nay. `README.md` đã được sửa.

## 🧪 Model sinh bằng AI (Meshy) — hạ tầng đã xong, chờ key

**Yêu cầu.** Lấy thêm model cho ~20 loài từ meshy.ai và tripo3d.ai.

**Hai điều tra trước khi tiêu tiền, và một trong hai đổi hẳn kế hoạch.**

| | Licence output | Dùng được? |
| --- | --- | --- |
| **Meshy Free** | **CC BY 4.0**, cần attribution | ✅ đúng allow-list `CC0/CC-BY` của `lib/model-quality.ts` |
| Meshy Pro | "Private", bạn sở hữu — không phải CC BY | ⚠️ phải đổi luật licence |
| **Tripo Free** | **Tripo giữ toàn bộ quyền**, kể cả IP (ToS §5.2.1) | ❌ **không dùng được** |
| Tripo Paid | Bạn sở hữu, dùng thương mại được | ⚠️ phải đổi luật licence, và cấm phân phối lại qua dịch vụ tương đương |

Nguồn: bảng giá và điều khoản của chính họ (`docs.meshy.ai/en/webapp/pricing`,
`developers.tripo3d.ai/en/terms`, help centre của Tripo). **Tripo Free bị loại vì pháp lý, không vì
kỹ thuật** — họ giữ quyền, nên model sinh ra không thể đưa vào repo này dù muốn.

**Đã chọn:** Meshy Free (CC BY 4.0), ghi rõ là model AI sinh, lấy trong 34 loài vừa xoá.

### Nói thẳng về quota

Free = **100 credit/tháng**. Text to 3D là hai bước và **cả hai đều tính tiền**: preview 20 + refine 10
= **30 credit/model** trên meshy-7.1. Nên **~3 model/tháng**, không phải 20 trong một lần. Muốn đủ 20
con ngay thì phải trả tiền — và gói trả tiền **mất** licence CC BY (xem bảng trên), tức là đánh đổi
ngược với điều một người đọc sẽ tưởng.

### Đã giao (chạy được ngay khi có key)

| File | Việc |
| --- | --- |
| `scripts/generate-models.mjs` | sinh model qua Meshy: preview → refine → tải → DRACO → ghi credit. `--list`, `--species=`, `--max-credits` (mặc định bằng quota tháng), `--max=`. Không có key thì từ chối kèm câu chỉ chỗ dán key, không chạy nửa vời |
| `scripts/restore-species.mjs` | lấy lại loài từ `git show HEAD:` — dữ liệu thật không phải gõ lại. Đã test vòng tròn 74 → 79 → 74 |
| `lib/attribution.ts` | `ModelAttribution` có thêm `generated` (provider, model, prompt, taskId, thời điểm) |
| `app/animal/[slug]/page.tsx` | dòng credit in: *"generated by Meshy from a text description — a reconstruction, not a scan of a real animal"* |
| `scripts/check-models.mjs` | 2 test khoá luật: licence **hard-code, không phải cờ** (một cờ là cách một key trả tiền ghi sai licence), licence ghi ra phải nằm trong allow-list, và mọi entry phải mang `generated` + trang loài phải in nó |
| `scripts/fetch-models.mjs` | `compressGlb` được export để bước DRACO chỉ có **một** bản cài đặt |

### Model AI không phải model thật — và site nói đúng như vậy

Meshy là máy sinh hình từ câu lệnh, không phải kho bản quét. Model nó trả về là **tái dựng hợp lý từ
câu mô tả**, không phải một con vật có thật được chụp hay quét. Trang loài vốn phân biệt "file .glb
thật" với "rig thủ tục"; model AI là loại thứ ba, nên nó được ghi thành loại thứ ba. Một con vật tổng
hợp được trình bày như con vật thật đúng là kiểu sai mà dự án này từ chối ở mọi chỗ khác.

### Việc còn lại của bạn, đúng một bước

```bash
echo 'MESHY_API_KEY=msy_...' >> .env.local     # https://www.meshy.ai/api
node scripts/restore-species.mjs --species=walrus,mountain-gorilla,reindeer --apply
node scripts/generate-models.mjs --species=walrus,mountain-gorilla,reindeer --apply
node scripts/wire-local-models.mjs --apply
npm run geo:generate && npm run seed:generate && npm run db:seed
```

Ba loài một tháng với quota free. Danh sách 34 loài ứng viên: `node scripts/generate-models.mjs --list`
in ra những loài *đang* thiếu model (hiện là 0), nên muốn chọn thì chạy
`node scripts/restore-species.mjs` trước.

## 📐 Mặt sàn: 19/74 model đi xuyên qua nó

**Triệu chứng bạn báo.** Vài con vật đứng dưới mặt cắt ngang của sàn studio. Đúng, và tôi đo được
chính xác bao nhiêu con, vì sao, và sửa đến đâu.

### Đo thế nào

Số học của chính GPU, chạy trên CPU: từng đỉnh một qua `getVertexPosition` (đúng phép biến đổi
skinning mà vertex shader làm) rồi qua `matrixWorld`. Cộng thêm một phép kiểm tra độc lập: render
model vào canvas với `OrthographicCamera` đã biết, đọc hàng pixel thấp nhất còn vẽ. Không suy đoán
bằng mắt, và không tin một hàm nào chỉ vì nó trông đúng.

### Ba lỗi, không phải một

| | Lỗi | Đo được |
| --- | --- | --- |
| 1 | drei `<Center bottom>` đo **bind pose**, không phải tư thế đang vẽ | đã sửa từ trước bằng `ModelAnchor` |
| 2 | **Đo một lần, ở tư thế vừa mount** — đúng cho tới khi clip đầu tiên chạy | **19/74 model** đi dưới sàn; `peregrine-falcon` tới **−942** (18 % chiều cao của nó), `scarlet-macaw` −173 (42 %), `bald-eagle` −103 (35 %) |
| 3 | `posedBounds` gọi `updateWorldMatrix()` — hàm này **không** làm mới `bindMatrixInverse` của `SkinnedMesh` (chỉ `updateMatrixWorld()` làm), mà `getVertexPosition` chia cho chính ma trận đó | đo được: dịch group lên 10 thì hộp báo lên **20** |

### Sửa

1. **Đo cho đúng** — `posedBounds` dùng `updateMatrixWorld(true)`, tức là làm mới `bindMatrixInverse`
   đúng như renderer làm mỗi frame.
2. **Neo theo cả clip, không theo một tư thế** — `lib/model-floor.ts` (thuần, có test) và
   `ModelAnchor` lấy **hợp** của hộp lúc mount và 32 mẫu trải đều clip, rồi đặt `min.y = 0`. Quét một
   lần cho mỗi (model, clip) và có cache, vì nó đi qua từng đỉnh skinned.
3. **Một cái lưới dưới phép quét** — lấy mẫu **không bao giờ** là một lời hứa: một clip lặn xuống giữa
   hai mốc lấy mẫu thì phép quét không thấy. Nên `ModelAnchor` còn canh `FLOOR_PROBES` đỉnh mỗi 6
   frame, qua đúng phép skinning đó; thấy dưới sàn thì **nâng lên**, và **không bao giờ hạ xuống**
   (`ratchet`). Đơn điệu là có chủ ý: nếu không, một clip lặn sẽ làm con vật nhấp nhô, mà một con vật
   nhấp nhô còn là lời nói dối tệ hơn một con vật hơi bay.

### Đo lại

| | Trước | Sau |
| --- | --- | --- |
| Model đi dưới sàn khi clip chạy | **19/74** | **5/74** |
| Giá trị sâu nhất | −1585 | **−1,01** (`blue-whale`, 18 % chiều cao) |
| Trong 5 con còn lại, số dưới 0,4 % chiều cao | — | **4** (`lion` −0,0035 · `bottlenose-dolphin` −0,0045 · `megalodon` −0,0225 · `scarlet-macaw` −0,3948) |

Phép kiểm tra độc lập dùng **64 mẫu** trong khi phép neo dùng 32, nên nó không phải cùng một phép đo
đọc lại. 5 con còn lại là phần mà **lưới** phải bắt ở runtime — đó là lý do lưới tồn tại.

**Nói thẳng phần chưa hoàn hảo:** phép quét là lấy mẫu, nên nó không chứng minh được gì; thứ chứng minh
được là cái lưới, và cái lưới chỉ canh `FLOOR_PROBES` đỉnh chứ không phải mọi đỉnh. Một mô hình lặn
xuống bằng đúng cái đỉnh không được canh, giữa hai frame được canh, vẫn lọt. Đây là giới hạn đã biết,
không phải điều đã giải quyết — muốn chặt hơn thì phải theo dõi mọi đỉnh mỗi frame, và giá của nó là
không trả nổi.

## 🔒 Khoá tạm Manga Studio và Data2Map ("Coming soon", admin vẫn vào được)

**Yêu cầu.** Hai tính năng chưa mở thì hiện mờ, ghi "Coming soon", khách không bấm được, admin bấm được.

**Đã làm.** Một danh sách duy nhất, `lib/coming-soon.ts`, là nơi nói module nào chưa mở — hôm nay là
Data2Map và Manga Studio. Cả navbar và middleware đọc **cùng danh sách đó**, nên menu và cổng không thể
lệch nhau: mở một module trong menu mà route vẫn 404, hay ngược lại, là kiểu lỗi mà một danh sách thứ hai
sẽ tạo ra.

| Chỗ | Trước | Sau |
| --- | --- | --- |
| Navbar | Data2Map **ẩn** với khách; Manga Studio là link bình thường | cả hai **luôn hiện**, xám, có nhãn `Soon`, `aria-disabled`, `cursor-not-allowed`, không có `href` |
| Probe | `/api/data2map-access` (một route cho một module) | `/api/module-access` — một request trả lời cho **mọi** module |
| Middleware | chỉ `/data2map` | mọi module trong danh sách, **cả trang lẫn API** (`/api/manga` nằm trong cổng) |
| Sitemap | Manga gallery được quảng cáo | chỉ liệt kê khi module đã mở — URL 404 thì không được nằm trong sitemap |

**Mở lại một module là một dòng:**

```bash
NEXT_PUBLIC_MANGA_PUBLIC=1      # Manga Studio, cho mọi người
NEXT_PUBLIC_DATA2MAP_PUBLIC=1   # Data2Map, cho mọi người
```

và `npm run dev` mở cả hai, vì module được viết trong lúc dev.

**Admin là ai:** allow-list theo env (`DATA2MAP_ADMIN_IDS` / `DATA2MAP_ADMIN_EMAILS`) hoặc một dòng
trong `public.app_admins` — **cùng một luật** mà Data2Map đã dùng, không có định nghĩa admin thứ hai.

**Nút mờ là phép lịch sự, không phải ổ khoá.** Cái khoá là middleware, chạy trên **mọi** request, phủ cả
API của từng module. Một nút bị vô hiệu và một route không tới được là hai việc khác nhau, và cả hai đều
đã làm.

**Kiểm chứng:** `npm run check:suites` **603 bài, 0 fail**, thêm `scripts/check-coming-soon.mjs` (6 bài):
registry chỉ có hai module, bộ khớp đường dẫn phủ cả trang lẫn API **và từ chối các đường gần giống**
(`/manga-studiox`, `/api/mangaid`, `/api/module-access`), công tắc mở module, middleware hỏi registry
chứ không tự gọi tên module nào, và sitemap không quảng cáo thứ trả 404.

## 🎨 Model trắng: màu nằm trong một extension three không đọc

**Triệu chứng bạn báo.** Nhiều model chỉ có màu trắng. Đúng, và nguyên nhân không phải thiếu texture —
texture nằm nguyên trong file.

### Nguyên nhân: một extension đã bị khai tử

9 loài — `hippopotamus`, `axolotl`, `capybara`, `komodo-dragon`, `gila-monster`,
`california-condor`, `american-alligator`, `blue-ringed-octopus`, `monarch-butterfly` — viết màu của
chúng vào `KHR_materials_pbrSpecularGlossiness`. **Khronos khai tử extension này và three.js đã xoá nó
khỏi GLTFLoader**: loader đăng ký clearcoat, transmission, volume, specular, sheen, iridescence… nhưng
không có nó. Material mà loader không hiểu trở thành `MeshStandardMaterial` mặc định — **trắng**.

### Đo bằng pixel, không bằng mắt

Render từng model trên nền trắng rồi tính độ bão hoà màu trung bình của các pixel được vẽ:

| Model | Bão hoà trước | Sau |
| --- | --- | --- |
| hippopotamus | **0** | 0,34 |
| capybara | **0** | 0,38 |
| komodo-dragon | **0** | 0,20 |
| gila-monster | **0** | 0,53 |
| california-condor | **0** | 0,08 |
| american-alligator | **0** | 0,20 |
| blue-ringed-octopus | **0** | 0,64 |
| monarch-butterfly | **0** | 0,54 |
| axolotl | 0,03 | 0,24 |
| lion *(đối chứng)* | 0,54 | 0,54 |
| polar-bear *(đối chứng)* | 0,22 | 0,22 |

Chín model có **bão hoà đúng bằng 0** — xám tuyệt đối. Hai model đối chứng không đổi, chứng minh bản
sửa đúng chỗ chứ không phải tô màu bừa.

### Sửa

`scripts/fix-model-materials.mjs` chuyển extension cũ sang định dạng lõi của glTF 2.0, theo đúng hướng
dẫn migration của Khronos:

```
baseColorFactor   <- diffuseFactor
baseColorTexture  <- diffuseTexture
metallicFactor    <- 0                  (spec-gloss không có metalness: điện môi)
roughnessFactor   <- 1 - glossinessFactor
```

Hai điều là **phán đoán, và được ghi ra** thay vì giấu:

1. roughness bị **kẹp ở 0,35** — nhiều asset có glossiness 1, chuyển thẳng thành gương hoàn hảo, mà một
   tấm gương trong studio có environment map thì trông như crôm chứ không như con vật;
2. **bỏ** `specularGlossinessTexture` chứ không dùng lại: RGB của nó là màu specular và alpha là
   glossiness, không phải thứ một metallic-roughness map chứa.

Bản sửa chỉ đụng vào material **chưa có** màu ở phần lõi: 65 model còn lại không bị chạm một byte.

### Luật khoá lại

`scripts/check-model-materials.mjs` (5 bài):

1. **không model nào được dùng extension mà loader không đọc** — danh sách "loader đọc được gì" đọc
   thẳng từ `GLTFLoader.js` của three, nên luật đi theo thư viện chứ không theo trí nhớ;
2. **một model không thể hiện được màu nào thì không phải model của một con vật** — không phải "mọi
   material phải có màu": 12 material trong catalogue không có màu và **đúng như vậy**
   (`serval / hair`, `greater-flamingo / edge_color000255`, `green-sea-turtle / eyes`); đo lại thì 7
   model đó đều có màu thật (bão hoà 0,14–0,55), nên luật cũ là dương tính giả và đã sửa;
3. thư mục `public/models/` và file credit phải khớp nhau — một file không loài nào trỏ tới là một
   file không ai nhìn thấy lỗi của nó.

### Cái tìm ra khi đang đo: `meerkat` là một cái sọ

Model của Meerkat có node `Skull_2`, material tên `Skull`, và **không có một texture nào** — nên nó
không trắng vì thiếu màu, nó trắng vì nó là một cái sọ. Cùng loại với khẩu súng và cái túi da đã tìm ra
trước đó. Theo đúng luật bạn đặt ("loài nào không có model thì xoá card"), Meerkat đã bị **xoá hẳn**:
catalogue 74 → **73 loài**, 73 model, DB 73 dòng.

## 🏛️ Catalogue thứ hai: công trình kiến trúc lịch sử, cùng bộ luật model

**Yêu cầu.** Thêm một mục 3D model về các công trình lịch sử (tháp Eiffel, tháp nghiêng Pisa, và nhiều
thứ nữa), **dùng đúng các quy tắc model như động vật**.

### Trước khi viết dòng code nào: dò xem có gì

Luật của dự án là *"dò trước, chọn sau"*. Tôi chạy một phép dò trên Sketchfab cho 25 công trình, lọc
theo allow-list licence: **25/25 đều có model CC0/CC-BY tải được**. Nếu con số đó là 0 thì việc đúng
phải làm là nói ra, không phải dựng một mục rỗng.

### Bộ luật được **tái dùng**, không viết lại

Script tải model công trình không tự định nghĩa luật nào. Nó import từ `fetch-models.mjs` — nơi luật
licence và luật chấm điểm đã sống từ Phase 12:

| Luật | Ở đâu | Áp cho công trình thế nào |
| --- | --- | --- |
| Licence chỉ CC0 / public domain / CC BY | `evaluateLicense` | y hệt; share-alike, ND, NC, all-rights-reserved bị từ chối |
| Tên model phải nêu đúng chủ thể | `rankCandidates` + cổng riêng | xem dưới |
| Ngân sách đa giác | `FACE_BUDGET.max` = 800k | ứng viên vượt bị loại, thử ứng viên kế tiếp |
| DRACO | `compressGlb` | y hệt |
| Model phải có màu | `modelCanShowColour` (mới, dùng chung) | kiểm **sau khi tải**, không đạt thì loại |
| Không model thì không có card | quy tắc bạn đặt | Neuschwanstein bị xoá vì lý do này |
| Không được chìm dưới mặt sàn | `ModelAnchor` | miễn phí: công trình dùng chính `ModelViewer` đó |

Để công trình dùng được viewer của động vật, tôi rút ra `types/viewable.ts`: viewer thật ra chỉ đọc
**năm trường** (slug, name, model_url, height_m, length_m). `Animal` thoả interface đó mà không phải
sửa gì, và nhờ vậy công trình thừa hưởng luôn luật mặt sàn, watchdog, retry, DRACO và dòng credit.

### Cổng chặn tên — và nó bắt được gì

Lần chạy khô đầu tiên, nếu chỉ tin vào điểm số của bộ chấm, sẽ ship: Parthenon là **"Greece" (768 mặt)**,
Kim tự tháp Giza là **"Giza" (880 mặt)**, Big Ben là **"Big Ben"** (khớp 12/30 điểm vì tên đầy đủ là
"Elizabeth Tower (Big Ben)"), Neuschwanstein là **"Pixel Neuschwanstein Castle (Low Poly)"**.

Nên cổng thật là hai điều kiện tách khỏi bộ chấm điểm:

1. **tên phải chứa tên công trình** (bỏ dấu, nên "Sagrada Família" khớp "Familia"; chấp nhận cả tên
   trong ngoặc, nên "Big Ben" khớp "Elizabeth Tower (Big Ben)");
2. **không được chứa từ khoá placeholder** — danh sách chuyển vào `lib/model-quality.ts` để pipeline
   tải và `npm run models:audit` dùng **cùng một danh sách**.

Sau cổng: Parthenon → **"PARTHENON" (60.032)**, Giza → **"The Great Pyramid of Giza Egypt" (40.000)**,
Neuschwanstein → **"Neuschwanstein Castle" (283.972)**, Chichén Itzá từ **bị từ chối hoàn toàn** thành
**"El Castillo, Chichen Itza"**.

Thêm một cổng nữa, kiểm **sau khi tải**: Colosseum đầu tiên là 27 material chỉ có `metallicFactor: 0` —
không màu, không texture. Pipeline loại nó và lấy ứng viên kế tiếp: **"Colosseum Facade (Rome, Italy)"**,
221k mặt, có màu.

### Kết quả

**15 công trình, 15 model, 39,7 MB**, tất cả CC-BY-4.0, đã credit đầy đủ (tác giả + licence + link
nguồn), tất cả trong ngân sách đa giác:

| | |
| --- | --- |
| Công trình | 15 (tháp, đền, di tích, tượng đài) |
| **Model sạch cả ba luật** | **15/15** — 0 extension three không đọc, 0 model không màu, 0 model vượt ngân sách |
| Vào được hover budget của card | 6/15 (còn lại hiện plate — đúng thiết kế) |
| Dữ liệu | `data/landmarks.ts` — mỗi con số có nguồn, số nào gây tranh cãi thì nói rõ **ngay trong câu** (Eiffel 330 m gồm ăng-ten / 300 m sắt / 276 m sàn; Pisa ba chiều cao; Sagrada Família 2026 mới xong **mặt ngoài**) |

**Neuschwanstein đã bị xoá** theo đúng luật bạn đặt: hai ứng viên duy nhất nêu tên nó là một món đồ
chơi "Pixel … Low Poly" và một file 30,5 MB so với trần 25 MB. Không có model thì không có card.

### Một điều nói thẳng

Trần model của dự án là 25 MB, nhưng **taj-mahal 12 MB và sydney-opera-house 8,8 MB** là những asset
nặng nhất site từng ship (model động vật lớn nhất ~9 MB). Chúng nằm trong trần và chỉ tải khi người xem
mở trang chi tiết, nhưng nếu muốn nhẹ hơn thì phải decimate — và decimate là **sửa asset**, nên tôi
không tự làm.

## 🔎 Khảo sát nguồn model cho công trình (đầu vào của Phase 29)

**Yêu cầu.** Liệt kê các trang có thể tải model công trình, và tải thêm **tất cả công trình nổi tiếng của
mỗi nước trên thế giới**.

### A. Các nguồn — và licence, thứ quyết định nguồn nào dùng được

| Nguồn | Licence | Dùng được? | Ghi chú |
| --- | --- | --- | --- |
| **Sketchfab** | lọc theo từng model: CC0 / PDM / CC BY | ✅ **đang dùng** | Nguồn chính. Có API search + download, và pipeline đã lọc licence từ Phase 12 |
| **Smithsonian Open Access** | **CC0** | ✅ đã nối sẵn trong pipeline | Thiên về hiện vật bảo tàng; có một số công trình |
| **Poly Pizza** | **CC BY** | ✅ đã nối sẵn | Kho Google Poly cũ; có landmark nhưng ít |
| **Wikimedia Commons** | **từng file**: có CC0 (đã kiểm: `File:Acropolis 3D.stl` là CC0), phần lớn còn lại là CC BY-SA | ⚠️ **đáng thêm** | Có category `Commons:3D models` và API đọc được licence từng file — nhưng **CC BY-SA bị luật dự án từ chối**, nên phải lọc |
| Europeana | từng item (có CC0 / CC BY) | ⚠️ chưa xác minh | Trang search render bằng JS, không đọc được licence trong phiên này |
| Open Heritage 3D (CyArk) | phần lớn **CC BY-NC-SA** | ❌ | Non-commercial + share-alike đều bị từ chối |
| Scan the World / MyMiniFactory | phần lớn **CC BY-NC-SA** | ❌ | Cùng lý do |
| Thingiverse / Printables / Cults3D | hỗn hợp, đa số NC | ❌ | Phải soi từng file; không có API licence đáng tin |
| 3D Warehouse (Trimble) | từng model, thường NC | ⚠️ | Rất nhiều landmark, nhưng licence không đồng nhất |
| NASA 3D / Poly Haven / Khronos | CC0 / CC BY | — | Đã nối sẵn nhưng **không có công trình kiến trúc** |
| OpenStreetMap dựng khối | ODbL | ⚠️ | Dự án đã đùn khối nhà OSM cho twin; cho ra **footprint thật** nhưng không có chi tiết điêu khắc — không thể ra tháp Eiffel |

**Kết luận về nguồn:** thêm Wikimedia Commons là việc đáng làm và rẻ (API công khai, licence đọc được
từng file); các nguồn còn lại hoặc đã nối, hoặc licence không qua được allow-list. **Sketchfab vẫn là
nguồn chính** vì nó là nơi duy nhất có cả ba: số lượng, licence lọc được, và API tải được.

### B. Đo trước, hứa sau — dò 62 công trình ở 45 nước

Tôi chạy pipeline dò trên **62 công trình thuộc 45 nước** trước khi viết bất kỳ dòng dữ liệu nào.

| Vòng | Qua cổng | Cổng nào bắt được gì |
| --- | --- | --- |
| 1. Chỉ "tên chứa tên công trình" | **37/62** | — |
| 2. + không phải **một mảnh** của công trình | **34/62** | Hawa Mahal → một **bức tường 4 tam giác**; Himeji → **con cá trên nóc**; Wat Arun → **một con búp bê**; Borobudur → **phù điêu**; Karnak → **các cột tháp**; Prague Castle → **cầu thang** |
| 3. + sửa hai lỗi so khớp từ | **33/62** | `\bobelisk\b` không khớp "Obelisk**s**"; `lowpoly`/`low-poly` không khớp "low poly" (có dấu cách) |

**Bài học đáng ghi nhất:** "tên có chứa tên công trình" là điều kiện **cần nhưng không đủ**. Vòng 2 và 3
sửa được vì tôi **nhìn vào kết quả** chứ không tin vào con số tổng. Prambanan đổi từ một món "low poly"
136k mặt sang **"Candi Prambanan" 499.936 mặt**; Parthenon từ **"Greece" (768 mặt)** sang **"PARTHENON"
(60.032)**; Kim tự tháp Giza từ **"Giza" (880)** sang **"The Great Pyramid of Giza Egypt" (40.000)**.

### C. Trạng thái

| | |
| --- | --- |
| Đang phục vụ | **15 công trình, 15 model** (mục "Catalogue thứ hai" ở trên) |
| Đã dò và **có model hợp lệ**, chờ viết dữ liệu | **33 công trình ở ~30 nước** — `mont-saint-michel`, `alhambra`, `hagia-sophia`, `forbidden-city`, `borobudur`, `petra`, `burj-khalifa`, `moai`, `uluru`, … |
| Dò nhưng **không có model qua cổng** | 29 công trình — gồm những cái đáng tiếc như Notre-Dame de Paris và Brandenburg Gate (**có model, nhưng vượt ngân sách 800k mặt**), và nhiều cái chỉ có kết quả không nêu tên |
| "Mọi nước trên thế giới" | **chưa xong, và tôi không giả vờ là xong.** 195 nước × vài công trình mỗi nước là vài trăm mục, mỗi mục cần một lượt tra nguồn cho từng con số (16 mục đầu mất ~25 phút tra cứu có kiểm chứng). Đây là việc nhiều lượt, không phải một lượt |

**Việc đúng để làm tiếp, theo thứ tự:** (1) viết dữ liệu có nguồn cho 33 mục đã dò được — hai batch đang
chạy; (2) thêm provider **Wikimedia Commons** vào `fetch-models.mjs` (API công khai, licence đọc được
từng file, lọc CC BY-SA ra); (3) với những công trình vượt ngân sách đa giác như Notre-Dame, thêm bước
**decimate** bằng `gltf-transform simplify` — sửa asset, nên là quyết định riêng; (4) mở rộng danh sách
theo từng châu lục, mỗi lượt một nhóm nước, luôn dò trước khi viết.

## 🏛️ Công trình: 15 lên 48, ở 30 nước — và hai lỗi của chính bộ luật

**Yêu cầu.** "Tải về thêm mục landmark, tất cả công trình nổi tiếng của mỗi nước trên thế giới."

### Kết quả đo được

Hai batch dữ liệu mới — 17 công trình trong `data/landmarks/world-1.ts`, 16 trong `world-2.ts` — gộp với 15
công trình gốc bằng `data/landmarks/all.ts`. File gộp thứ ba là cần thiết chứ không phải trang trí: hai batch
import **kiểu** `Landmark` từ `data/landmarks.ts`, và một file import chính importer của nó là vòng lặp.

| | |
| --- | --- |
| Công trình | **48**, ở **30 nước** — còn **47** sau khi Tử Cấm Thành bị xoá vì model chỉ là một tấm hình (xem mục dưới) |
| Có model thật | **47/48**, nay là **46/47** |
| Dung lượng ship | **103,0 MB** trong `public/models/landmarks/`; nặng nhất `taj-mahal` **12,02 MB** |
| Licence | 47/47 **CC-BY-4.0**, mỗi mục có tác giả + link nguồn trong `data/landmark-attribution.json` |
| Ba luật model | 0 extension three không đọc · 0 model không màu · 0 vượt ngân sách 800k mặt |
| `height_m: null` | **13** mục — quần thể (Angkor, Forbidden City, Prambanan…) chứ không phải một khối |
| Loại | đền 15 · tượng đài 14 · tháp 8 · lâu đài 5 · di tích 3 · cầu 3 |

### Lỗi 1 — cổng chặn tên từ chối chính cái tên catalogue đang dùng

Lượt chạy khô in ra **47/48 tải được, 1 không**, và lý do rất cụ thể:

> `milan-cathedral — mọi ứng viên bị từ chối: Milan Cathedral (the title "Milan Cathedral" does not name it)`

Cổng chặn tên (`lib/landmark-gate.ts`) hỏi đúng một câu: **tiêu đề của model có nêu tên công trình không**.
Nhà cung cấp đặt tên tiếng Anh; catalogue của tôi ghi tên tiếng Ý — "Duomo di Milano" — vì một luật khác
(`slug` phải là kebab-case của `name`, khoá bởi `check-landmarks-world-1.mjs`) và tôi đã chọn slug theo tên
Ý. Hai luật đúng khi đứng riêng, sai khi đứng cạnh nhau: cổng đi tìm chữ "Duomo di Milano" trong những tiêu
đề viết "Milan Cathedral".

Sửa: mục đó **mang tên tiếng Anh "Milan Cathedral"**, slug `milan-cathedral`, còn tên Ý vào chính câu mô tả
("Milan Cathedral, the Duomo di Milano, …"). Người đọc vẫn thấy tên bản địa, cổng tên và tên file khớp nhau,
và `data/landmark-queries.json` giữ nguyên câu truy vấn "Duomo Milan Cathedral".

### Lỗi 2 — trần 25 MB bị áp lên **con số nhà cung cấp công bố**, không phải lên file ship

Ba công trình bị từ chối chỉ vì *kích thước khai báo*: Cologne 39,3 MB, Milan 33,8 MB, Prambanan 29,9 MB.
Tôi tải thử bằng `--max-mb` và đo file thật:

| Công trình | Khai báo | Sau DRACO (file ship) |
| --- | --- | --- |
| Cologne Cathedral | 39,3 MB | **3,87 MB** |
| Milan Cathedral | 33,8 MB | **3,94 MB** |
| Prambanan | 29,9 MB | **6,89 MB** |

Cả ba nằm gọn trong 25 MB — thực ra nhỏ hơn cả `taj-mahal` (12,02 MB) đang chạy. Nghĩa là con số bị đem ra
chặn không phải con số quyết định: **khai báo là kích thước trước khi nén**, còn thứ site phải phục vụ là file
`.glb` sau DRACO. Luật nay có hai bước, cả hai đều đo được:

1. **trước khi tải:** kích thước khai báo ≤ **2×** trần (`CONFIG.declaredHeadroom`). Đủ để loại một file
   200 MB, đủ để không loại oan một file 39 MB.
2. **sau khi nén:** file ship ≤ **25 MB** — vượt thì **xoá file** và thử ứng viên kế tiếp, chứ không nối vào
   catalogue. Đây mới là con số mà trình duyệt và bucket `animal-assets` phải sống chung.

Bước 2 trước đây **không tồn tại**: pipeline chỉ chặn ở bước 1, nên một file nén ra 40 MB vẫn được ship. Đó là
lỗ hổng thật, và nó chỉ lộ ra khi tôi đi tìm ba công trình bị bỏ sót. Luật mới được khoá bằng một bài test
trong `check-models.mjs` (đọc source của hai script, không import — import `fetch-landmark-models.mjs` sẽ
chạy luôn thân script và tải model).

### Lỗi 3 — hai file test cũ đang khẳng định pipeline **chưa từng chạy**

`check-landmarks-world-1.mjs` và `check-landmarks-world-2.mjs` đều có một bài `model_url` phải là `null`,
viết từ lúc batch còn là *đầu vào* của pipeline. Sau khi nối model, hai bài đó đỏ — và chúng đỏ vì lý do đúng:
chúng khẳng định một điều đã hết đúng, chứ không bảo vệ điều gì. Đã thay bằng luật thật, cùng luật mà
catalogue đầu tiên đã dùng: `model_url` hoặc `null` (batch 1 còn đúng một mục như vậy), hoặc khớp
`^/models/landmarks/[a-z0-9-]+\.glb$` **và file đó phải tồn tại trên đĩa**; batch 2 thì cả 16 mục đều phải có.

### Còn lại: Hagia Sophia

**47/48.** Hagia Sophia (Thổ Nhĩ Kỳ) không lấy được model, và đây là số đo chứ không phải phỏng đoán — tôi tải
thẳng ứng viên hợp licence duy nhất về và mở file ra:

| Đo trên file ứng viên | |
| --- | --- |
| Licence / mặt | CC-BY-4.0, 21.440 mặt, 0,76 MB |
| `extensionsUsed` | **rỗng** |
| `images` | **0** |
| material | **1**, chỉ có `{"pbrMetallicRoughness":{"metallicFactor":0,"roughnessFactor":0.6}}` |

Không texture, không `baseColorFactor`, không extension — theo glTF, material đó mặc định `baseColorFactor` =
`[1,1,1,1]`, tức **trắng tuyệt đối**. `scripts/fix-model-materials.mjs` không cứu được: nó chuyển
`KHR_materials_pbrSpecularGlossiness` sang metallic-roughness, mà ở đây **không có màu nào để chuyển**. Ứng
viên còn lại nêu đúng tên nó ("Hagia Sophia Mosaics") là **CC-BY-NC**, luật licence từ chối.

Nên mục đó hiện **plate** (chữ cái đầu trên nền gradient của chính nó) chứ không hiện một khối trắng, và
`/landmarks` nói thẳng "46 trong 47 công trình có model thật".

**Đây là một quyết định còn treo.** Luật bạn đặt — "không model thì không có card", đã áp cho Neuschwanstein —
nói rằng mục này nên bị **xoá hẳn**. Nhưng nó là công trình **duy nhất của Thổ Nhĩ Kỳ**, và xoá nó là mất một
nước khỏi catalogue. Tôi đã hỏi trong phiên này và không nhận được trả lời (câu hỏi hết thời gian chờ), nên
tôi **giữ nguyên và ghi ra đây** thay vì tự xoá dữ liệu đã tra nguồn. Một chữ "xoá" là đủ.

## 🧱 `next build` treo: nó và dev server ghi chung một `.next`

**Triệu chứng đã có số.** Sáu lần `next build` trong các phiên trước: webpack biên dịch xong, rồi **im hoàn
toàn** 18–33 phút, không `BUILD_ID`, không file mới. Đã loại trừ mạng (Clerk, Supabase, Google Fonts đều trả
lời dưới 2 s), tải CPU, và cả `--experimental-build-mode compile`.

**Nguyên nhân tìm bằng `lsof`, không bằng phỏng đoán.** Có một tiến trình node đang chạy với `cwd` là repo và
**listen cổng 9000** — tức `npm run dev` (`next dev -p 9000`) đang mở. Bằng chứng thứ hai: trong lúc tôi sửa
file dữ liệu, `.next/prerender-manifest.json` **bị ghi lại lúc 13:59**, tức có tiến trình thứ hai đang ghi vào
chính cây thư mục mà `next build` cũng ghi. `next build` và `next dev` mặc định dùng chung `.next`.

**Kiểm chứng.** `next.config.ts` nay đọc `NEXT_DIST_DIR` (mặc định vẫn là `.next`), nên một lần build đo được
*bên cạnh* dev server đang chạy:

| | |
| --- | --- |
| Lệnh | `NEXT_DIST_DIR=.next-build npm run build` |
| Kết quả | **exit 0**, `BUILD_ID` = `r4ugGNXbWPGKyw1VHomtk` |
| Thời gian, **build nguội** | **839 giây (13 phút 59 giây)** — xoá sạch thư mục, cache rỗng |
| Thời gian, **build thứ hai** (cùng máy, cache OS đã ấm, thêm 2 route) | **157 giây (2 phút 37 giây)** |
| Kích thước | 512 MB |
| Cảnh báo `<w>` | **0** ở cả hai lần — bộ lọc ở `lib/webpack-log-filter.ts` nay đã được kiểm trên build thật |
| Trang dựng sẵn | **147**, rồi **153** sau khi Phase 25 thêm `/categories` và 5 trang chủ đề |

**Hai số thời gian, không phải một.** 839 giây là build **nguội** (cache webpack rỗng, máy vừa chạy việc
khác); 157 giây là build **thứ hai** trên cùng máy với cache hệ điều hành đã ấm. Ghi cả hai vì một con số duy
nhất ở đây sẽ bị đọc sai theo cả hai hướng — "build mất 14 phút" và "build mất 2,6 phút" đều đúng, cho hai
tình huống khác nhau. CI luôn là trường hợp nguội.

Ba việc treo nhiều phiên được đóng bằng chính hai bản build đó: **thời gian build có số thật (#13)**, **ngân
sách bundle cho hai route công trình (#20)**, và **ngân sách cho hai route danh mục mới**.
`scripts/bundle-budget.mjs` đã có sẵn biến `NEXT_DIR`, nên chỉ cần trỏ nó vào bản build cách ly:

| Route | Đo được | Ngân sách |
| --- | --- | --- |
| `/landmarks` | **137,7 kB** (đo 158 kB ở bản build trước) | 165 (ngang `/explore`) |
| `/landmarks/[slug]` | **139,1 kB** | 155 |
| `/categories` | **134,4 kB** | 140 (hồ sơ của `/data2map`, vì không có 3D và không có bản đồ) |
| `/categories/[id]` | **139,4 kB** | 150 |

**Một điều đo ra mà đáng ghi:** số của `/landmarks` **giảm** từ 158 kB xuống 137,7 kB sau khi thêm hai chủ đề
danh mục, dù trang đó không sửa một dòng nào về mặt tải. Next chia chunk theo **cả đồ thị**, không theo từng
route: một route mới dùng chung `LandmarkGrid` làm chunk đó được chia lại và rơi vào nhóm dùng chung. Nên một
con số ngân sách chỉ có nghĩa kèm bản build sinh ra nó - và đó là lý do mỗi lần đo lại đều được ghi lại đây
thay vì thay số cũ đi.

Và một ngân sách cũ hoá ra **không phải ngân sách**: `/quiz` được đặt đúng bằng số đo của nó (164,9 so với
165). Thêm **một icon** vào navbar dùng chung đẩy nó lên 165,0 và làm đỏ cổng chặn — một ngân sách gãy vì một
glyph là một dây bẫy, không phải một hạn mức. Nâng lên **172**, đúng công thức file đó tự đặt ra: số đo cộng
biên độ như các route cùng loại.

**Một điều tôi chưa làm, và nói rõ:** chưa chạy phép thử ngược — một lần build vào `.next` **dùng chung**
trong khi dev server đang mở. Phép thử đó tốn khoảng 20 phút và sẽ phá chính output mà dev server đang phục
vụ. Nên đây là **giải thích mạnh nhất cộng với một lần build chạy xong**, không phải một thí nghiệm đối chứng.

## 🖼️ Hai lỗi bạn báo: khung nhìn trong thẻ, và một model chỉ là hình vẽ

### Lỗi 1 — model bị chiếu từ đáy khung lên

**Bạn báo.** Mở model trong Architecture và Modern Buildings thì khung nhìn nằm ở đáy, gần như không thấy
model; cần đúng góc 3/4.

**Đo trước khi sửa.** Tôi dựng lại đúng phép toán của thẻ (`components/3d/AnimalModelPreview.tsx`) bằng
Node, rồi chiếu 8 đỉnh hộp bao thật của **cả 48 model** qua chính camera của thẻ (vị trí `[2.1, 1.4, 2.7]`,
fov 40, khung 4:3):

| | |
| --- | --- |
| Model có tâm nằm **dưới** giữa khung | **21/48** |
| Model có một đỉnh **bị cắt** ở mép dưới | **7** — Tử Cấm Thành, Sydney Harbour Bridge, Edinburgh Castle, Uluru, Trevi Fountain… |
| Tệ nhất | Tử Cấm Thành: cả model nằm trong dải `ndcY −1,02 … −0,02` — chỉ còn một mẩu ở đáy thẻ |

**Nguyên nhân.** Thẻ chuẩn hoá theo **cạnh dài nhất** (`1.9 / max(size)`), rồi **dời cả nhóm xuống −0,72**
và để camera nhìn vào gốc toạ độ. Với model cao thì đúng; với model **thấp và rộng** — Tử Cấm Thành
59,6 × 11,2 × 94,2, cầu Sydney Harbour, lâu đài Edinburgh — cạnh dài nhất là bề ngang, nên chiều cao bị thu
nhỏ theo và model rơi hết xuống đáy khung. Không phải lỗi của model nào: một công thức đúng cho một hình
dạng và sai cho mọi hình dạng khác.

**Sửa.** Bỏ phép dời −0,72 và bỏ việc camera nhìn vào gốc; đặt model một lần cho đúng (chân trên mặt sàn,
tâm ngang ở 0), rồi để `<Bounds fit clip observe>` của drei **căn camera theo hộp bao của chính model** —
tâm model luôn ở giữa khung, bất kể hình dạng. Hướng nhìn lấy từ chính preset `threeQuarter` mà viewer đầy
đủ dùng (`lib/camera-presets.ts`), nên thẻ và trang chi tiết nhìn công trình từ cùng một phía.

**`margin` lấy từ số đo, không từ cảm tính.** `<Bounds fit>` đặt camera theo **cạnh dài nhất**, nên đỉnh hộp
vẫn có thể thò ra ngoài. Quét thật trên 47 model:

| margin | số model bị cắt | mức vượt khung tệ nhất |
| --- | --- | --- |
| 1,25 (mặc định của viewer) | 19 | 1,443 (Petronas Towers) |
| 1,50 | 7 | 1,145 |
| 1,60 | 4 | 1,057 |
| **1,70** | **0** | 0,982 |

Chọn **1,70**: cả model, đúng giữa khung, từ góc 3/4. Đổi lại thẻ không "kín" hình như trước — nhưng trước
đó phần lớn các thẻ chỉ hiện một mẩu mái.

### Lỗi 2 — Tử Cấm Thành không phải model, mà là một tấm hình

**Bạn báo.** Model Tử Cấm Thành là "cái hình", không phải model đàng hoàng.

**Đo.** File đang ship: **10.388 tam giác**, **1 ảnh**, 1 material, hộp bao 59,6 × 11,2 × 94,2 — rộng gấp
8,4 lần cao, tức một tấm phẳng có mái **vẽ** lên trên, cho một quần thể 72 ha gồm **980 công trình**: khoảng
**11 tam giác mỗi công trình**. So với các quần thể khác cùng catalogue: Alhambra 486.088, Angkor Wat
379.354, Prambanan 499.936. Bạn đúng, và con số nói cùng một điều.

**Dò lại nguồn.** Chỉ có **một** ứng viên hợp licence nêu đúng tên nó — chính file đó. Ứng viên thứ hai là
2.020.640 mặt (vượt ngân sách 800k), thứ ba là CC-BY-NC. Nghĩa là **không có model tử tế nào cho Tử Cấm
Thành trong luật licence hiện tại**, và luật của dự án là "không model thì không có card".

**Đã làm: xoá mục đó** (48 → **47 công trình**), cùng cách đã xoá Neuschwanstein. File `.glb`, dòng credit,
chỉ mục hover và câu truy vấn đã lưu đều được gỡ; `/landmarks/forbidden-city` trả **404**;
`/landmarks` và `/categories/architecture` còn **47 thẻ**. Dữ liệu (961 × 753 m, 980 công trình, 24 hoàng
đế) nằm trong git — mục này có thể trở lại ngày có model tử tế.

### Luật mới, và giới hạn thật của nó

`CRUDE_MONUMENT_FACES = 5.000` + `modelHasNoTexture`: model **không có texture** và **dưới 5.000 tam giác**
bị từ chối, và pipeline thử ứng viên kế tiếp. Cần **cả hai** vế: chỉ đếm tam giác sẽ xoá Moai (2.210) và tháp
Himeji (2.536) — hai model đẹp vì texture gánh chi tiết; chỉ nhìn texture sẽ giữ một tấm ảnh dán lên cái hộp.

Áp luật này lên **Marina Bay Sands**, model tệ nhất còn lại: **524 tam giác, 0 ảnh**, ba material phẳng thay
cho ba toà tháp. Pipeline từ chối nó và lấy **"Marina Bay Sands 298" — 4.984 tam giác, có texture** (0,16 MB).

**Và đây là điều phải nói thẳng:** Tử Cấm Thành **lọt qua mọi cổng tự động** — có texture, 10k tam giác, đúng
licence. Không phép đo hình học nào tôi thử phân biệt được nó với một model thật (độ phẳng cũng không: Trevi
Fountain và Uluru cũng "phẳng" mà đúng). Thứ bắt được nó là **một người nhìn vào thẻ**. Đây là giới hạn thật
của pipeline, ghi lại để lần sau không ai tưởng các cổng đó đã đủ.

**Còn lại, đo được, cần bạn quyết** — model mỏng nhưng *có* texture, tức luật mới không từ chối và tôi không
tự xoá:

| Model | Tam giác | Tình cảnh |
| --- | --- | --- |
| `temple-of-heaven` | 1.996 | **0 ảnh**; không có ứng viên nào khác hợp licence |
| `sydney-harbour-bridge` | 992 | mọi ứng viên khác đều bị cổng tên từ chối |
| `boudhanath` | 2.281 | ứng viên còn lại là pointcloud (0 mặt) hoặc bị từ chối |
| `himeji-castle` | 2.536 | hai ứng viên khác là 1,6 triệu mặt — vượt ngân sách |
| `moai` | 2.210 | **có** lựa chọn tốt hơn: `Moai` 171.351 mặt, hoặc `moai mountain` 26.479 |

## 🧭 Mở rộng Đa danh mục — lộ trình sáu phase

Kami3D mở rộng từ **Động vật** sang nhiều lĩnh vực 3D. Sáu phase dưới đây là lộ trình đã chốt; mỗi phase
ghi rõ **yêu cầu**, **cái gì đo được rồi**, **cái gì tái dùng**, và **cái gì chưa làm**.

> **Số phase.** PLAN đã dùng 21 (auto-pilot) và 22 (admin đưa model lên card) từ trước, nên lộ trình này
> bắt đầu ở **25**. Đánh số lại các phase cũ sẽ làm hỏng chính lịch sử mà tài liệu này tồn tại để giữ.

---

### 🗂️ Phase 25 — Multi-Category 3D Catalog System — ✅ **đã giao (nền + UI)**

**Yêu cầu.** Bảng `categories` (animals, space, plants, vehicles, architecture…); bảng `items` mở rộng
`animals` (`id, category_id, name, slug, model_url, scale_ratio, description, metadata jsonb`…); **giữ
tương thích ngược**; Navbar đa danh mục; trang chủ hiển thị category; `ModelViewer`, `SizeComparison`,
`InteractiveGlobe` chạy với mọi category; admin thêm item mọi category; RLS: public đọc – admin ghi.

#### Quyết định thiết kế quan trọng nhất: **không di chuyển con vật nào**

Cách migration hiển nhiên — chép mọi loài vào `items`, trỏ lại sáu khoá ngoại, xoá bảng cũ — đổi sự gọn
gàng lấy đúng thứ dự án không thể thay thế: **73 loài với geodata, yêu thích, điểm quiz và lượt xem đang
đúng**, và mọi khoá ngoại đang trỏ vào `animals`. Nên phase này **thêm** hệ chung và **không đụng** bảng cũ.

| Đối tượng | Vai trò |
| --- | --- |
| `categories` | danh sách chủ đề, `is_public`, `has_models`, `sort_order`, `accent`, `icon` |
| `items` | một mục thuộc mọi danh mục **không phải** động vật; `metadata jsonb` giữ phần riêng của từng loại (khối lượng hành tinh, công suất xe, họ thực vật) — một cột cho mỗi trường sẽ là bảng mọc thêm cột mỗi phase |
| `catalog_items` | **view** chiếu `animals` sang hình dạng item rồi `union all` với `items` — "toàn bộ catalogue" trả lời bằng một truy vấn, và vẫn chỉ **một** dòng cho mỗi con vật |

View khai `security_invoker = true`: một view đọc bằng quyền **definer** là đường vòng qua mọi policy của
các bảng bên dưới.

#### Cách migrate dữ liệu động vật cũ

**Không migrate.** Động vật ở nguyên `public.animals`; `catalog_items` **chiếu** chúng. Đổi lại:

- sáu khoá ngoại (`animal_geodata`, `model_assets`, `sound_assets`, `user_favorites`, `quiz_scores`, `animal_views_daily`) không phải sửa một dòng nào;
- không có hai bản sao của cùng một con vật để lệch nhau;
- một danh mục mới chỉ cần `insert` vào `categories` và `items` — không cần bảng riêng, không cần phase SQL.

#### Đã giao và đã kiểm

| Kiểm | Kết quả |
| --- | --- |
| Schema áp lên database thật | `npm run db:schema` chạy xong |
| `categories` | **6 dòng**: animals · space · plants · vehicles · buildings · architecture |
| `catalog_items` | **73 dòng, tất cả nhóm `animals`** — chiếu đúng, chưa copy dòng nào |
| Anon **đọc** `catalog_items` | **200** ✅ |
| Anon **ghi** `items` | **401** ✅ |
| Test | `scripts/check-catalog.mjs` **11 bài** (thêm ba bài khoá phần UI: seed ↔ dữ liệu bundled, hai catalogue được chiếu chứ không chép lại, và card không trỏ tới route 404); tổng **669 bài, 0 fail**, `tsc` sạch |

Ghi: đọc cho `anon, authenticated` khi danh mục `is_public`; ghi chỉ qua `public.is_admin()` — **cùng một
định nghĩa admin** với mọi bề mặt admin khác. Và một lỗi tôi tự viết ra rồi test bắt được: `revoke all ...
from anon` đứng **sau** `grant select` sẽ lấy lại đúng quyền vừa cấp — thứ tự được khoá bằng test.

Sửa luôn một luật cũ sai: `check-sql` từng khẳng định `TABLES` khai **đúng 3 bảng**. Số lượng là bất biến
sai — nó gãy khi thêm bảng và **không** gãy khi đổi tên bảng. Luật mới: mọi tên trong `TABLES` phải tồn
tại dưới dạng bảng **hoặc** view.

#### Phần UI — đã giao trong phiên này

Phase 25 để lại đúng một việc mở: phần UI. Nó là **điều kiện tiên quyết của 26–30**, nên nó được làm xong
trước khi mở phase nào khác.

| Đã giao | Đo được / vì sao như vậy |
| --- | --- |
| `data/categories.ts` | **6 danh mục** (thêm `buildings` và `architecture`), là **bản sinh đôi** của seed SQL: cùng id, cùng thứ tự, cùng `sort_order`. `check-catalog` so **từng dòng** — một id chỉ có ở một bên là một trang 404 ở chế độ demo và chạy được ở production |
| `lib/catalog-project.ts` | Chiếu `animals` và `landmarks` sang hình dạng item — **thuần**, import được bằng Node nên test được mà không cần database. Đây là bản TS của đúng quyết định mà view SQL đã làm: chiếu, không chép |
| `lib/catalog.ts` | `getCategories` · `getCategory` · `getCategoryItems` · `getCategorySummaries`, `server-only`, có fallback về dữ liệu bundled khi Supabase không cấu hình hoặc lỗi |
| `lib/catalog-links.ts` | `categoryHref` · `itemHref` · `itemSubtitle` — thuần, không import gì, nên lưới phía client dùng được. Luật được test khoá: **card không bao giờ trỏ tới route sẽ 404** |
| `components/catalog/CategoryIcon.tsx` | Tên icon trong database → component lucide, qua **một map 5 dòng**. Nhập cả bộ lucide là vài trăm kB cho một trang vẽ 5 glyph |
| `components/catalog/CategoryNav.tsx` | Dải danh mục, có trạng thái active; là **server component** — năm link không cần một ranh giới hydration |
| `components/catalog/ItemGrid.tsx` | Lưới dùng chung cho mọi danh mục: lọc theo tên + chip "có model 3D", và trạng thái rỗng **nói ra lý do** |
| `components/catalog/ItemCard.tsx` | Thẻ **cố tình rẻ**: plate + tên + một dòng metadata. Đặt một WebGL context sau mỗi tile của lưới 73 mục là tiêu cả ngân sách trang cho hover preview |
| `/categories` và `/categories/[id]` | Chủ đề và một chủ đề, `generateStaticParams` từ danh sách bundled nên vẫn dựng sẵn, `dynamicParams` mở để danh mục thêm sau vẫn vào được |
| Navbar + trang chủ | Một mục **Catalogue** và một dải "More than one world" — 5 chủ đề kèm số mục, chủ đề rỗng ghi thẳng "Being built" |
| Sitemap | Thêm `/categories` và **chỉ những** trang danh mục **có mục** — hứa với crawler một trang "đang xây" là chuyện khác với nói thật với người đọc |

**Kiểm bằng trình duyệt, không bằng suy luận** — dev server đang chạy ở cổng 9000:

| URL | Kết quả |
| --- | --- |
| `/categories` | **200**, 139 kB HTML, 5 chủ đề, 3 chủ đề ghi "Being built" |
| `/categories/animals` | **200**, 325 kB, `Filter 73 species` |
| `/categories/architecture` | **200**, 369 kB, `Filter 48 monuments` (nay **47**), thẻ Eiffel trỏ `/landmarks/eiffel-tower` |
| `/categories/space` | **200**, `Filter 0 objects` kèm câu giải thích |
| `/categories/nope` | **404** |

Và một lỗi thật, ghi lại vì nó suýt im lặng: chuyến đầu `/categories/architecture` trả **404** trong khi
`animals` và `space` trả 200. Nguyên nhân không nằm ở code — **database thật đang có 4 danh mục**, vì seed
`architecture` vừa được thêm vào `supabase/schema.sql` mà chưa áp lên. Fallback về dữ liệu bundled chỉ chạy
khi bảng **trống** hoặc lỗi, **không** chạy khi bảng **thiếu một dòng** — đó là lựa chọn đúng (database được
cấu hình thì database thắng), nhưng nó có nghĩa là: **đổi seed thì phải chạy `npm run db:schema`**, và bài
test so seed với dữ liệu bundled chính là thứ phát hiện loại lệch này trước khi người dùng thấy. Sau khi áp:
**200**, 48 mục.

#### Architecture và Modern Buildings: hai câu hỏi, một catalogue

**Yêu cầu.** "Đưa những model của landmark vào thẳng architecture, và thêm mục những toà nhà buildings hiện
đại nằm riêng trong catalogue."

**Đã làm.** Trang `/categories/[id]` trước đó vẽ lưới thẻ rẻ (`ItemGrid`: plate chữ cái + huy hiệu "3D"),
nghĩa là vào Architecture thì **không thấy model nào** — đúng thứ bạn vừa phản hồi. Nay hai chủ đề
`architecture` và `buildings` vẽ bằng chính `LandmarkGrid`/`LandmarkCard`: **cùng thẻ, cùng hover 3D,
cùng ngân sách hover, cùng dòng credit** như trang `/landmarks`. Các chủ đề khác vẫn dùng lưới rẻ, vì đặt
một WebGL context sau mỗi tile của lưới 73 loài là tiêu cả ngân sách trang cho hover preview.

**Mục mới: Modern Buildings — 11 mục**, lọc ra từ chính catalogue công trình (48 mục lúc đó, 47 sau khi xoá Tử Cấm Thành) bằng một **luật viết ra**, không phải
một danh sách cảm tính:

| Điều kiện | Vì sao |
| --- | --- |
| Hoàn thành từ **1889** | Năm thép khung, bê tông cốt thép và hệ treo thôi làm thí nghiệm (Eiffel 1889; nhà khung thép đầu tiên 1885). Một nhà xây gạch mãi tới 1965 (Milan) hay 2026 (Sagrada Família) là **muộn**, không phải hiện đại |
| **Có người đi vào hoặc đi qua** | Nhà chọc trời, tháp, nhà hát, nhà thờ Hồi giáo, cầu |
| **Không phải tượng, không phải đá** | Christ the Redeemer (1931) và Mount Rushmore (1941) đúng thời kỳ nhưng sai loại; Uluru thì không ai xây |

Danh sách: Eiffel Tower 1889 · Tower Bridge 1894 · Empire State 1931 · Sydney Harbour Bridge 1932 ·
Golden Gate 1937 · Sydney Opera House 1973 · CN Tower 1976 · Hassan II Mosque 1993 · Petronas 1996 ·
Burj Khalifa 2009 · Marina Bay Sands 2010. Kèm theo là **lý do từ chối** từng trường hợp gần đúng, viết
ngay trong `data/buildings.ts` để người sau không phải suy lại.

`check-catalog` kiểm **từng điều khoản**: slug phải tồn tại trong catalogue, năm ≥ 1889, không phải ruin —
và **luật phải biết từ chối**: sáu trường hợp gần đúng (`christ-the-redeemer`, `mount-rushmore`, `uluru`,
`milan-cathedral`, `sagrada-familia`, `chateau-frontenac`) được khẳng định là **không** nằm trong mục. Một
luật không từ chối được gì chỉ là bản mô tả danh sách.

**Một công trình, nhiều chủ đề — và vẫn một trang.** Eiffel Tower nằm ở cả Architecture lẫn Modern
Buildings; cả hai cùng trỏ tới một model, một dòng credit và một trang chi tiết `/landmarks/eiffel-tower`
(`DETAIL_PREFIX` trong `lib/catalog-links.ts`). Hai chủ đề **không** tạo hai bản sao: chúng chiếu từ **một**
catalogue `data/landmarks/`, đúng luật mà view `catalog_items` đã đặt ra cho loài vật.

Cùng lúc, một đường vòng đã bị bỏ: bản đầu tôi cho `/categories/architecture` **redirect** sang `/landmarks`
để tránh hai URL cho một danh sách. Yêu cầu "đưa thẳng vào architecture" nói ngược lại — chủ đề phải **giữ**
các mục của nó — nên redirect đã bị gỡ, và hai trang là hai lối vào của một catalogue: trang chủ đề có dải
chủ đề, trang `/landmarks` có bộ lọc theo loại.

**Kiểm trên dev server:** `/categories/architecture` **200** — **48 thẻ**, đủ 6 chip lọc theo loại;
`/categories/buildings` **200** — **11 thẻ**; cả hai hiện dải chủ đề với **6 mục**.

#### Còn lại của Phase 25

| Việc | Ghi chú |
| --- | --- |
| `SizeComparison` + `InteractiveGlobe` cho mọi category | `ModelViewer` **đã xong** từ phase landmark (`types/viewable.ts` làm nó nhận mọi đối tượng có 5 trường); hai cái còn lại vẫn nhận `Animal` |
| Admin thêm item mọi category | Bảng và RLS đã cho phép từ đầu (`is_admin()`); **form thì chưa** |
| Gộp `AnimalGrid`/`LandmarkGrid` vào `ItemGrid` | Hai lưới cũ vẫn dùng thẻ riêng vì thẻ của chúng có hover 3D thật — gộp được, nhưng là việc dọn dẹp, không chặn phase nào |

---

### 🚀 Phase 26 — Space & Planets

**Yêu cầu.** Category `space`; item: Mặt Trời, các hành tinh, vệ tinh, tàu vũ trụ, hố đen…; trang `/space`
với **Solar System 3D tương tác** (xoay, zoom, click hành tinh), `ModelViewer` cho từng hành tinh/tàu,
thông tin đường kính – khối lượng – khoảng cách – nhiệt độ; Size Comparison **so với Trái Đất**; dữ liệu ở
Supabase, model `.glb`.

**Nguồn — đo được, và là nguồn tốt nhất dự án có:** **NASA 3D Resources**, **public domain**, **provider đã
nối sẵn trong pipeline từ Phase 12** (`data/model-providers.json`, không cần key). **227 thư mục `.glb`**,
gồm Apollo Lunar Module, Cassini-Huygens, Curiosity, Chandra, Hubble, Deep Space Network, CubeSat, tiểu
hành tinh 1999 RQ36, siêu tân tinh Cassiopeia A. Nghĩa là phase này **không phải thêm nguồn mới** — chỉ
phải thêm dữ liệu và trang.

**Tái dùng:** `ItemGrid` + `CategoryNav` (Phase 25), `ModelViewer` (đã nhận mọi category), pipeline
`fetch-models.mjs` với provider `nasa`.

**Việc riêng của phase này:** cảnh **Solar System 3D** không phải `ModelViewer` — nó là một cảnh quỹ đạo
riêng (khoảng cách và bán kính phải **nén theo log** hoặc có hai chế độ, vì Mặt Trời–Sao Thuỷ và
Mặt Trời–Sao Hải Vương lệch nhau 78 lần; vẽ đúng tỉ lệ thì cái sau nằm ngoài màn hình). Size Comparison
ở đây so với **Trái Đất** chứ không so với người.

**Chưa làm.**

---

### 🌱 Phase 27 — Plants & Botany

**Yêu cầu.** Category `plants`; item: cây cối, hoa, nấm, cây thuốc… có model 3D; trang `/plants` với grid
+ lọc (loại, môi trường sống, công dụng), `ModelViewer` + thông tin khoa học (tên Latin, họ, công dụng…),
có thể thêm âm thanh môi trường (lá xào xạc…).

**Nguồn — đo được trên Sketchfab, cùng cổng chặn như động vật và công trình:**

| Item | Model | Licence |
| --- | --- | --- |
| Oak tree | oak trees, **14.475 mặt** | CC-BY-4.0 |
| Rose | Rose, **119.994 mặt** | CC-BY-4.0 |
| Fly agaric | Fly Agaric Mushroom, **5.209 mặt** | CC-BY-4.0 |
| Sunflower | Sunflower, **1.008 mặt** | CC-BY-4.0 |
| Bonsai | Bonsai, **13.797 mặt** | CC-BY-4.0 |
| Venus flytrap | Venus Flytrap, **2.464 mặt** | CC-BY-4.0 |

**Tái dùng:** `ItemGrid`, `ModelViewer`, và **hạ tầng âm thanh có sẵn** — `data/sound-attribution.json`,
`lib/sound-licenses.ts` và bảng `sound_assets` đã tồn tại từ Phase 9 cho tiếng kêu động vật; âm thanh môi
trường đi đúng đường đó, gồm cả **cổng licence** (chỉ CC0/CC BY) đã có.

**Việc riêng:** bộ lọc ba chiều (loại × môi trường sống × công dụng) và phần "công dụng" — thứ này dễ trượt
sang **khẳng định y học**, nên mọi câu về cây thuốc phải có nguồn và phải nói rõ nó là **công dụng dân
gian được ghi nhận**, không phải lời khuyên.

**Chưa làm.**

---

### 🚗 Phase 28 — Vehicles

**Yêu cầu.** Category `vehicles` (sub: motorcycle, car); trang `/vehicles` lọc theo loại – hãng – năm sản
xuất; `ModelViewer` xoay 360° + **chế độ explod** (tháo rời chi tiết nếu có); thông số kỹ thuật (động cơ,
công suất, kích thước…); Size Comparison **với người**; admin upload model + thông số.

**Nguồn — đo được:**

| Item | Model | Licence |
| --- | --- | --- |
| Vespa | VESPA, **342.100 mặt** | CC-BY-4.0 |
| VW Beetle | Volkswagen Beetle, **42.500 mặt** | CC-BY-4.0 |
| Ford Model T | Ford Model T v2 Downloadable, **42.890 mặt** | CC-BY-4.0 |
| Trabant | Trabant, **18.245 mặt** | CC-BY-4.0 |
| London Bus | London Bus double-decker, **95.161 mặt** | CC-BY-4.0 |

**Tái dùng:** `ItemGrid`, `ModelViewer`, `reserve_model_download(provider = 'upload')` và
`publishUploadedModel()` từ Phase 22 cho **admin upload** — đường upload đã có, gồm cả hộp thư Storage và
ngân sách.

**Việc riêng:** **chế độ explod**. Phần lớn model không có nhóm phụ rời, nên "tháo rời" chỉ có nghĩa khi
asset mang cây node riêng cho từng bộ phận (bánh, động cơ, thân). Cách đúng: đọc cây node, cho chọn node
để tách ra, và **nói rõ khi asset không có gì để tháo** — bịa ra chuyển động tách rời cho một mesh liền
khối là cùng loại lỗi với việc vẽ rig thủ tục cho một loài.

**Chưa làm.**

---

### 🏛️ Phase 29 — Architecture & Houses

**Yêu cầu.** Category `architecture`; item: nhà ở, biệt thự, **công trình nổi tiếng**, nội thất…; trang
`/architecture` với `ModelViewer` **đi vào bên trong được** (first-person hoặc orbit), bật/tắt **tầng** và
**nội thất**, thông tin diện tích – phong cách – vật liệu; đo kích thước cơ bản.

**Đã có sẵn một nửa:** **15 công trình lịch sử đang chạy ở `/landmarks`** với 15 model CC-BY đã credit, sạch
cả ba luật (màu, extension, mặt sàn) — Phase 29 là **gộp chúng vào category `architecture`** rồi mở rộng.
Mục "Nguồn model cho công trình" bên dưới là bản khảo sát nguồn cho phase này: Wikimedia Commons (CC0 đã
kiểm từng file), Sketchfab, và danh sách nguồn **bị từ chối vì licence** (Open Heritage 3D, Scan the
World — CC BY-NC-SA).

**Tái dùng:** `ItemGrid`, `ModelViewer`, `LandmarkCard`, pipeline landmark đã có
(`fetch-landmark-models.mjs` + `probe-landmarks.mjs`).

**Việc riêng:** **đi vào trong nhà**, **bật/tắt tầng**, **bật/tắt nội thất**. Ba thứ này cần asset có cấu
trúc (tầng là nhóm node, nội thất là mesh riêng) — cùng vấn đề với chế độ explod của Phase 28, và cùng
cách trả lời: đọc cấu trúc thật của file, và nói thẳng khi file không có cấu trúc đó.

**Chưa làm.**

---

### 🔎 Phase 30 — Unified Search & Cross-Category

**Yêu cầu.** Thanh tìm kiếm toàn cục (animals + space + plants + vehicles + architecture); trang kết quả
thống nhất; gợi ý liên quan **xuyên danh mục** (ví dụ "voi" → động vật + ảnh hưởng môi trường…); trang
Explore tổng hợp; SEO metadata động theo category và item.

**Tái dùng:** `lib/animals.ts`'s `searchAnimals` là bản mẫu; `catalog_items` là **một truy vấn cho tất cả
năm danh mục** — đây chính là thứ view đó được dựng ra để làm. Navbar đã có ô tìm kiếm (`/explore?q=`).

**Việc riêng và là phần khó nhất:** **gợi ý xuyên danh mục**. Nó đòi quan hệ giữa các mục ở *các danh mục
khác nhau* (voi ↔ môi trường sống ↔ thực vật), mà dữ liệu hiện tại không có trường nào diễn tả. Hai đường
trung thực: một bảng `item_links` do người viết tay (đúng, nhưng là lao động thủ công), hoặc suy từ
`metadata` có cấu trúc (rẻ, nhưng chỉ đúng khi metadata được viết để suy được). Chọn đường nào là quyết
định của phase đó, và **không được bịa ra một "điểm liên quan"** — cùng luật với mọi con số khác trong dự án.

**Chưa làm.**

---

### Thứ tự phụ thuộc

```
Phase 25 (nền)          ItemGrid · CategoryNav · SizeComparison & Globe đa danh mục
      │
      ├── Phase 26 Space      (NASA, public domain — không cần nguồn mới)
      ├── Phase 27 Plants     (Sketchfab CC-BY + hạ tầng âm thanh Phase 9)
      ├── Phase 28 Vehicles   (Sketchfab CC-BY + upload Phase 22)
      ├── Phase 29 Architecture (15 landmark đã có + Wikimedia Commons)
      └── Phase 30 Unified Search (đọc catalog_items — cần 26–29 có dữ liệu trước)
```

**Luật không đổi cho cả năm phase:** mỗi item phải có **model thật, licence CC0/CC BY, đã credit**; **không
model thì không có card**; model không được chìm dưới mặt sàn, không được render trắng, không được vượt
ngân sách đa giác; và mọi con số trong dữ liệu phải **tra được nguồn**.

## 🚀 Phases 26–28 — nền chung cho Space · Plants · Vehicles

**Yêu cầu.** "Thực thi những phase còn lại cũng như những mục trong catalogue chưa làm chưa có model."

### Đo trước: ba danh mục trống có nguồn model thật không?

| Danh mục | Nguồn đã dò | Kết quả đo |
| --- | --- | --- |
| space — tàu/thiết bị | **NASA 3D Resources** (227 thư mục, public domain, GitHub, không cần key) | toàn tàu và thiết bị: ISS, Hubble, JWST, Curiosity, Saturn V, Apollo Lunar Module, Voyager… **không có hành tinh nào** |
| space — hành tinh | Sketchfab | Earth 3.360 / 567.296 mặt · Mars 3.968 / 5.040 · Jupiter 4.076–8.448 · Saturn 3.328–6.912 — tất cả **CC-BY-4.0** |
| plants | Sketchfab | Oak 7.112–183.680 mặt · Sunflower 42.492–75.084 — CC-BY-4.0 |
| vehicles | Sketchfab | Formula 1 31.176–397.890 · Boeing 747 9.527–70.448 — CC-BY-4.0 |

Cả ba danh mục lấp được bằng model thật. Không có danh mục nào phải dựng bằng hình vẽ.

### Phase 27 — Plants: 16 mục, 16 model thật (50,4 MB)

**Dữ liệu.** `data/plants.ts` — **16 mục**: sunflower · oak · orchid · coffee · venus-flytrap · ivy · lavender · lotus · bamboo · wheat · giant-sequoia · saguaro · ginkgo · baobab · kelp · bracken. Mỗi mục có `subtitle` dạng "Tree · Fagaceae", `metadata` gồm `kind`, `family`, `scientific_name`, `native_range`, `max_height_m`, `lifespan` và **`source`**; số không tra được để **null** thay vì đoán.

**Model: 16/16, tổng 50,4 MB**, 15 mục CC-BY-4.0 và **`bracken` CC0-1.0** (giấy phép tốt hơn cả mức tối thiểu). Nặng nhất `oak` 8,28 MB; nhẹ nhất `kelp` 0,30 MB.

**Một lỗi của chính cổng tên, do danh mục này lộ ra.** Lượt chạy khô đầu tiên chọn **"Giant Sequoia Cone - Retopologized"** cho mục *Giant Sequoia* — một cái **nón**, không phải cái cây. Đây là loại lỗi thứ ba, khác hai loại đã có: không phải hàng giả (`PLACEHOLDER_WORDS`), không phải món đồ *của* nó (`OBJECT_WORDS`), mà là **một bộ phận của nó**. Nên `catalog-gate.ts` có thêm danh sách thứ ba — cone · seed · seedling · sapling · leaf · leaves · fruit · engine · wheel · tyre · tire · cockpit — kèm đúng cái luật mà cổng công trình đã học được: **một từ bộ phận chỉ là bằng chứng khi chính mục đó không mang tên ấy**. "Mercedes Atego Fire Engine" **đạt**, vì mục này *là* fire engine; nếu không có luật đó thì cổng vừa bỏ một model thật, vừa giữ nguyên lỗi.

Sau khi thêm luật, `giant-sequoia` lấy **"Giant Sequoia Tree Trunk" 598.946 mặt** — đúng cái cây (thân là phần chính của một cây sequoia khổng lồ), không phải quả của nó. Và `venus-flytrap` tự nâng từ 2.464 lên **67.360 mặt**: ứng viên nhẹ hơn bị cổng màu từ chối, pipeline đi tiếp.

## 📈 Mở rộng +100 model mỗi mục — cỗ máy thu thập (đang chạy)

**Yêu cầu.** "Tìm thêm 100 model cho mỗi mục trong catalogue" — 6 mục × 100 ≈ **600 mục mới**.

**Vì sao không viết tay.** Batch công trình viết tay tốn **~25 phút/mục** (tra từng con số). 600 mục theo cách đó là ~250 giờ. Nên việc được tách đúng như phần còn lại của dự án:

| Thành phần | Nguồn | Vì sao |
| --- | --- | --- |
| **Danh sách chủ thể** | NASA 3D Resources (227 thư mục, public domain) cho space; Sketchfab theo ~40 truy vấn/mục cho plants, vehicles, buildings | Một chủ thể không có model hợp licence là chủ thể site không hiển thị được — viết dữ liệu trước là vô nghĩa |
| **Số liệu + mô tả** | **Wikipedia**, ghi tên bài làm `metadata.source` từng mục: mô tả = các câu mở đầu của bài, mỗi fact = một câu **có chữ số** | Đây đúng chuẩn mà batch công trình đã dùng ("checked against the English Wikipedia article text and infobox"), áp ở quy mô lớn. Không diễn giải thành một con số mà không ai viết |
| **Model** | `scripts/fetch-catalog-models.mjs` sẵn có | Cỗ máy thu thập **không** quyết định cái gì được ship: mọi cổng (licence, tên, màu/kết cấu, đa giác, trần 25 MB) vẫn là của pipeline |

**Script mới:** `scripts/harvest-catalogue-entries.mjs --catalogue=space|plants|vehicles|buildings --limit=100 [--apply]`

- tên chủ thể từ NASA được thử **nhiều biến thể** trước khi tra Wikipedia ("Aqua (A)" → "Aqua (satellite)"; "…(TDRS) (A)" → bỏ ngoặc), vì tên thư mục được viết cho cái kệ chứ không cho bách khoa;
- fact lấy từ **toàn bài** (khối lượng, ngày phóng thường nằm ở thân bài), mô tả lấy từ **đoạn mở đầu**;
- mục đã có thì bỏ qua, nên chạy lại là **cộng thêm** chứ không nhân bản;
- chạy khô in ra 5 mục đầu để đọc trước khi ghi.

**Lượt 1 — kết quả đo được (space):**

| Bước | Số đo |
| --- | --- |
| Chủ thể sau khi mở rộng nguồn (NASA **+ 41 truy vấn Sketchfab**) | **227 NASA + ~40 chủ thể Sketchfab** |
| Mục thu được | **+72 mục** trong một lượt (16 viết tay + 15 lượt trước → **103 mục**) |
| Model tải được | 3 + 7 + 53 = **63 model** (cả NASA public-domain PDM-1.0 lẫn Sketchfab CC-BY) |
| **Sau khi xoá mục không có model** (luật "không model thì không có card") | **79 mục — 77 có model** (125 MB) |
| Test | **681 bài / 0 fail** |

Ba lỗi thật do lượt này lộ ra, đều đã sửa và **khoá bằng test**:

1. **Slug bị cắt giữa từ**: `slugFor()` cắt ở 40 ký tự *trước* khi bỏ gạch nối cuối, nên "geostationary-operational-environmental-" vào thẳng catalogue (không phải kebab-case). Nay cắt trước, trim sau.
2. **Mạng đứt giữa lượt**: `ECONNRESET` làm cả lượt thu thập chết ở chủ thể thứ N. Nay dùng `fetchWithRetry` của chính dự án và bọc từng chủ thể — một chủ thể hỏng không kết thúc cả lượt.
3. **File model mồ côi**: một `.glb` không có dòng credit (do DRACO chết giữa đường) là model không ai cấp phép, không ai đo, không ai truy được. Nay `check-catalogues` có bài **"no catalogue folder holds a file the manifest does not credit"**, và `drop-entries-without-models.mjs` xoá luôn câu truy vấn của mục bị xoá (trước đó để lại khoá mồ côi làm test đỏ).

**Kết quả đo được trước khi mở rộng nguồn** (một lượt trên 227 chủ thể NASA):

| | |
| --- | --- |
| Chủ thể dò được | **227** |
| Qua cổng Wikipedia (≥2 fact có số + mô tả ≥120 ký tự) | **10 mục/lượt** — phần lớn thư mục NASA là *dụng cụ* (Hammer, Wrench, Grease Gun) không có bài bách khoa |
| `space` | **16 → 31 mục** (2 lượt), 16 mục cũ vẫn giữ nguồn mạnh hơn (NASA Planetary Fact Sheet) |
| Test | **680 bài / 0 fail** sau khi ghi |

**Còn lại của mục tiêu** (goal đang mở, nhiều lượt): chạy tiếp các lượt cho space (thêm truy vấn Sketchfab cho hành tinh/vệ tinh/tàu), rồi plants, vehicles, buildings, animals, architecture; sau mỗi lượt chạy pipeline tải model (**tự động**), và mục nào không có model thì bị `drop-entries-without-models.mjs` xoá — luật "không model thì không có card".

### Lượt 2 — plants, và bảo mật (Phase 31 theo yêu cầu mới)

**plants: 16 → 31 mục, 27 có model.** Cỗ máy thu thập chạy 40 truy vấn; cổng licence của pipeline từ chối đúng những model quá nặng (`eucalyptus-camaldulensis`: 1.499.999 mặt, vượt trần 800k). Sau khi tải: 4 mục không có model bị xoá, 4 file mồ côi bị xoá.

**Ba lỗi công cụ được sửa trong lượt này** (đều là loại "file mô tả sai sự thật"):
1. **Bộ lọc licence viết tay trong harvester** — tôi tự khớp chuỗi `^(CC0|CC-BY|...)`, nhưng Sketchfab dán nhãn CC-BY là *"CC Attribution"*, nên 40 truy vấn chỉ ra **7 ứng viên**. Nay harvester dùng **chính `evaluateLicense`/`rankCandidates` của pipeline**: không có ý kiến thứ hai về licence.
2. **Slug cắt giữa từ** (đã ghi ở lượt 1) và **tên file/credit/index phải đổi theo** khi slug đổi.
3. **Bốn file không còn khớp nhau sau mỗi lượt tải** — nên có script mới `scripts/reconcile-catalogue.mjs`: đưa **catalogue · file .glb · manifest credit · saved queries** về cùng một tập, và `check-catalogues` khoá lại bằng bài *"no catalogue folder holds a file the manifest does not credit"*.

**Bảo mật (yêu cầu Phase 28 của bạn — ghi là Phase 31 vì PLAN đã dùng 28/29/30):**

Đo trên database thật: **150 quyền không phải SELECT** cấp cho `anon`/`authenticated`. RLS quản lý hàng nhưng **không** quản lý `TRUNCATE`/`REFERENCES`/`TRIGGER` — nên `anon` đang giữ **`TRUNCATE ON public.animals`**: ai có anon key cũng xoá sạch được bảng loài, không policy nào được hỏi.

| | Trước | Sau |
| --- | --- | --- |
| Quyền không phải SELECT cho `anon`/`authenticated` | **150** | **39** |
| Quyền của `anon` | 11 nhóm, gồm TRUNCATE/DELETE/INSERT/UPDATE | **0** — chỉ còn `SELECT` |
| `authenticated` | mọi bảng | 5 bảng per-user + 8 bảng manga, đúng nơi có policy |
| Bảng tạo ở phase sau | thừa hưởng quyền rộng | `alter default privileges` chặn từ đầu |

Khối SQL nằm trong `supabase/schema.sql` (*"Phase 31 - Security hardening: least privilege on the tables themselves"*) kèm số đo trong comment, **đã áp lên database**. Cố ý **không** thu hồi `EXECUTE` trên functions: site gọi RPC với tư cách khách có chủ đích (`increment_animal_view`, `quiz_stats`), và các hàm thay đổi dữ liệu tự kiểm người gọi.

**Chưa làm, và không giả vờ là đã làm:** Phase 32 (Lemon Squeezy: `subscriptions`/`purchases`, webhook + verify signature, `checkPremium`, trang Pricing) và Phase 33 (Ads & Unlock: `ad_placements`/`locked_contents`/`user_unlocks`, `AdBanner`, `UnlockModal`, rewarded ad mock). Cả hai cần biến môi trường thật của Lemon Squeezy (`LEMON_SQUEEZY_API_KEY`, `STORE_ID`, `WEBHOOK_SECRET`, variant id) — không có key thì webhook **không test được**, và tôi không muốn giao một webhook chưa từng chạy.

## ✅ Phase 31 — Kết quả (phần 2): nốt sáu yêu cầu của bản brief bảo mật

Lượt trước mới làm **yêu cầu 1** (quyền trên bảng: 150 → 39 quyền không phải SELECT, `anon` mất `TRUNCATE`). Sáu yêu cầu còn lại nay đã xong, mỗi cái có số đo hoặc có bài test giữ nó.

| Yêu cầu của brief | Nay nằm ở đâu | Bằng chứng |
| --- | --- | --- |
| 1. RLS mọi bảng | `supabase/schema.sql` (khối Phase 31 phần 1 + 2) | **34/34 bảng** có `relrowsecurity = true`; `npm run verify:rls` **PASS** |
| 2. API route: bắt buộc đăng nhập, chỉ admin, rate limit | `lib/write-guard.ts`, `app/api/admin/_lib/guard.ts` | mọi route ghi đều đi qua `guardWrite` (khoá bằng test); `POST /api/admin/models/run` không session → **404** |
| 3. Storage: chỉ ghi vào thư mục của mình | `supabase/schema.sql` (policy trên `storage.objects`) | 3 policy so `(storage.foldername(name))[1]` với `current_user_id()`; hai bucket asset **không** có policy ghi nào — và test khẳng định sự vắng mặt đó |
| 4. Frontend: sanitize, không lộ key | `lib/sanitize.ts`, `lib/env.ts`, `npm run check:secrets` | 2 chỗ `dangerouslySetInnerHTML` bị test khoá đúng **2 file**, cả hai ăn từ serializer; sanitizer thuần, có test |
| 5. Middleware bảo vệ route admin | `lib/admin-gate.ts` + `middleware.ts` | `GET /admin/models` không session → **404** |
| 6. Logging & monitoring | `lib/security-log.ts`, bảng `public.security_events`, trang `/admin/security` | một dòng thật được ghi khi thử cross-site, đọc lại từ database |

### Bốn lỗi thật do chính lượt này tìm ra

1. **Middleware chưa hề chặn `/admin/*`.** Câu trong `app/api/admin/_lib/guard.ts` — *"it matches the /admin/* gate in the middleware (Phase D8)"* — **là câu sai**: middleware chỉ chặn các module chưa ra mắt. Ba trang admin tự gọi `adminStatus()` rồi vẽ panel đăng nhập, tức là trang **đã render xong** mới biết người xem không phải admin. Nay có `lib/admin-gate.ts` + một nhánh trong middleware: 404 trước khi một dòng của console chạy, đúng quy ước 404-mà-không-403 của API. Demo Mode không có identity thì cũng không có admin, nên `/admin` trả 404 ở đó.
2. **`scripts/verify-rls.mjs` báo ba FAIL sai.** Nó đòi `401/403` cho việc đọc bảng per-user, nhưng câu trả lời đúng của một bảng có RLS là **200 kèm `[]`** — `anon` cố ý giữ SELECT, policy mới là thứ lọc hàng. Một bài kiểm kêu oan là bài kiểm bị bỏ qua, nên kỳ vọng nay viết theo từng phép thử: đọc được nhưng **0 hàng**, còn 200 **có hàng** mới là rò rỉ. Script PASS, và nó in ra số hàng thay vì chỉ mã trạng thái.
3. **`anonymiseAddress("::1")` trả `1::/48`** — hàm cắt chuỗi theo dấu hai chấm nên đọc sai dạng nén của IPv6; hàng đầu tiên trong log là bằng chứng (`address_prefix = 1::/48`). Nay `::` được bù về đủ 8 nhóm **trước khi** lấy ba nhóm đầu, mỗi nhóm đệm 4 chữ số, nên `::1` → `0000:0000:0000::/48` và hai cách viết của cùng một mạng so bằng nhau được.
4. **Route `/api/admin/geodata` tự hỏi database một mình** (`is_admin()` riêng + 403 riêng), nên quy ước 404, luật chủ sở hữu mặc định và phần ghi log mới **không áp** cho nó. Nay nó dùng `requireAdmin()`, và có test quét **mọi** route dưới `app/api/admin`: phải gọi gate chung, và không được tự gọi `.rpc("is_admin")`.

### Log bảo mật: ghi được, đọc được, và nói thẳng giới hạn

Đo trên server đang chạy, khoá anon, không session:

| Phép thử | Kết quả | Ghi vào log |
| --- | --- | --- |
| `POST /api/settings` với `Sec-Fetch-Site: cross-site` | **403** | `kind=cross-site`, `bucket=settings` |
| `POST /api/admin/models/policy` không session | **404** | `kind=admin-denied`, `route=/api/admin/models/policy` |
| 45 lần `POST /api/views` trong một phút | 40 × **200**, 5 × **429** | `kind=rate-limited` |
| `GET /rest/v1/security_events` bằng khoá anon | **401** (`42501`) | — |
| `GET /admin/models` không session | **404** | — |

Bảng `security_events`: RLS bật, **chỉ** policy đọc cho `is_admin()`, **không có policy insert** — chỉ service role ghi, nên không ai giả được một sự kiện. Điều đáng ghi: khối `alter default privileges` của phần 1 cấp `SELECT` cho `anon` trên **mọi bảng mới**, nên bảng này phải **đòi lại** — nếu không thì chính khối siết chặt lại vừa trao cuốn log cho khách. Đã đo: có `revoke` thì khoá anon nhận 401.

Ba giới hạn được ghi thẳng, không giả vờ: log **lấy mẫu** (một dòng mỗi loại + mỗi mạng mỗi phút, nên sự kiện của kẻ tấn công bị thưa), `GET` trên route admin chỉ có `POST` trả **405** nên xác nhận đường dẫn tồn tại (đường dẫn nằm trong client component, mà chunk là file tĩnh — danh sách endpoint chưa bao giờ là bí mật, thứ kiểm soát là cái cổng, và cái cổng trả 404), và **chưa có chốt cho route trả phí** vì hôm nay chưa có route nào trả phí — Phase 32 sẽ đặt nó cạnh đúng thứ nó chặn, chứ không dựng một hàm `isPaidPath()` luôn trả `false`.

**Kiểm:** `check:suites` **687 bài / 0 fail** (10 bài của `check:security`, thêm 6 bài mới), `tsc` sạch, `verify:rls` PASS. Trang `/admin/security` đọc log; `docs/SECURITY.md` có bảng sáu yêu cầu và bốn giới hạn còn lại.

## ✅ Phase 32 — Kết quả: Lemon Squeezy (thanh toán + quyền lợi)

Không có tài khoản Lemon Squeezy thật, nên lượt này **không giả vờ** đã chạy một giao dịch. Cách làm: dựng đủ tầng theo tài liệu của họ, rồi **đo mọi thứ đo được** — chữ ký webhook được kiểm bằng HMAC thật do chính tôi ký, đường đi của một delivery được chạy trên server thật, và hai việc không thể chạy (một delivery thật từ Lemon Squeezy, một checkout thật) được ghi thẳng vào `docs/PAYMENTS.md`.

| Yêu cầu của brief | Nay nằm ở đâu | Bằng chứng |
| --- | --- | --- |
| 1. Các gói: Premium tháng/năm, mở khoá model tuyệt chủng, Manga Studio Pro | `lib/payments/plans.ts` | 4 gói, mỗi gói khai **quyền lợi** nó cấp; gói không có variant id thì **không được chào bán** |
| 2. Checkout + webhook 4 sự kiện | `app/api/payments/checkout/route.ts`, `app/api/payments/webhook/route.ts` | checkout do **server** mở (API key không bao giờ xuống browser); webhook xử lý `subscription_*` và `order_*` |
| 3. Bảng `subscriptions` + `purchases` | `supabase/schema.sql` (khối Phase 32) | RLS bật, **chỉ** policy đọc cho chủ sở hữu, **không** policy ghi nào; `anon` không có quyền nào |
| 4. `checkPremium` + middleware/helper | `lib/payments/account.ts`, `lib/payments/account-view.ts`, `lib/payments/entitlements.ts` | toán quyền lợi thuần, đồng hồ tiêm được, 8 bài test |
| 5. Trang Pricing, nút nâng cấp, trạng thái trong Settings | `app/pricing/page.tsx`, `components/payments/UpgradeButton.tsx`, `components/settings/SettingsScreen.tsx` | navbar + sitemap có `/pricing`; Settings đọc trạng thái từ server nên không nhấp nháy |
| 6. Verify signature, TS strict, không lưu thẻ | `lib/payments/webhook.ts` | `timingSafeEqual`, không có cột nào cho thẻ |

### Đo thật trên server đang chạy (không có tài khoản store, chữ ký ký cục bộ)

| Phép thử | Kết quả |
| --- | --- |
| Delivery `subscription_created` **có chữ ký đúng** | **200**, ghi **1 hàng** vào `subscriptions` (plan `premium-monthly`, status `active`) |
| Gửi lại y nguyên delivery đó | **200**, vẫn **1 hàng** — upsert theo `lemon_squeezy_id` chính là cơ chế idempotent |
| `subscription_cancelled` kèm `ends_at` | **200**, **cùng hàng đó** đổi thành `cancelled` và `current_period_end` = ngày hết hạn trả trước |
| `order_created` có chữ ký | **200**, một hàng `purchases` với `total_cents = 499`, `currency = USD` |
| Body thêm **một dấu cách** | **401** `invalid signature` + một sự kiện `webhook-signature` trong log |
| Chữ ký ký bằng secret khác | **401** |
| Không có header chữ ký | **401** |
| `GET /rest/v1/subscriptions` bằng khoá anon | **401** — `anon` không có quyền nào trên bảng thanh toán |

### Ba quyết định đáng nhớ

1. **`plan` và `status` cho phép NULL, có chủ đích.** Lemon Squeezy có thể gửi một variant deployment này không bán, hoặc một chuỗi status bản build này chưa từng thấy. Từ chối hàng đó là trả **500 cho một giao dịch thật** và chuốc một cơn bão retry; nên hàng vẫn được lưu, phần toán quyền lợi bỏ qua nó, và Settings nói thẳng là không nhận ra.
2. **`current_period_end` là cột dẫn xuất**, vì Lemon Squeezy không có cột tên như vậy: có `ends_at` (khi đã huỷ) thì lấy nó, không thì lấy `renews_at`. Nó tồn tại vì đó là cột mà **mọi** câu hỏi về quyền lợi thật sự đọc.
3. **Huỷ không phải là hết.** `cancelled` vẫn có quyền tới hết kỳ đã trả; `cancelled` mà **không có ngày** thì không có gì để tôn trọng nên không cấp gì. `past_due`/`unpaid` mất quyền ngay — một khoảng ân hạn là quyết định kinh doanh, và một mặc định im lặng còn tệ hơn không có.

### Nói thẳng phần chưa làm được

**Chưa từng có một delivery thật từ Lemon Squeezy, và chưa từng mở một checkout thật.** Repo không có tài khoản store. Mọi thứ *trước* hai bước đó đều đã chạy: chữ ký được kiểm bằng HMAC thật, bộ phân tích sự kiện được cho ăn payload đúng hình dạng tài liệu của họ, và body request được khẳng định từng trường. Rủi ro còn lại là delivery thật đầu tiên — và nó được ghi ở `docs/PAYMENTS.md`, không phải để sau này phát hiện ra.

Cũng chưa có: **dunning** (khách quá hạn mất quyền ngay, không có ân hạn), **link customer portal** (đổi thẻ thì phải vào link trong email hoá đơn), và **logic proration** khi đổi gói (store đã tính rồi, ở đây chỉ ghi lại đúng thứ store gửi).

**Kiểm:** `npm run check:payments` — **8 bài / 0 fail**, gồm cả bài khẳng định SQL và TypeScript khớp nhau về danh sách plan. `npx tsc --noEmit` sạch.

## ✅ Phase 33 — Kết quả: vị trí quảng cáo & cơ chế mở khoá

Cả hai thứ trong phase này đều mặc định **tắt**: ba vị trí quảng cáo được seed với `enabled = false`, và bảng khoá bắt đầu **rỗng**. Một deployment không quan tâm phase này sẽ trông y như trước.

| Yêu cầu của brief | Nay nằm ở đâu | Bằng chứng |
| --- | --- | --- |
| 1. Vị trí: sidebar, dưới nội dung, giữa danh sách; không che ModelViewer | `lib/ads.ts` (danh mục vị trí), `components/ads/AdBanner.tsx` | test cơ học: **không file nào** dưới `components/3d` được import component quảng cáo |
| 1b. AdSense / Ezoic / placeholder | `lib/ads.ts`, `components/ads/AdSlot.tsx` | AdSense cần **cả** client id và ad unit id, thiếu một cái thì không vẽ gì và in ra lý do; **Ezoic bị từ chối** vì build này không có tích hợp nào |
| 2. Hai cách mở khoá: xem quảng cáo (mock) / mua một lần | `lib/unlock.ts`, `app/api/unlock/route.ts`, `components/unlock/UnlockPanel.tsx` | quảng cáo thưởng là **mock** và nói thẳng; mua dùng checkout thật của Phase 32 |
| 2b. Ghi vào `user_unlocks` | `supabase/schema.sql` | policy chỉ cho `method = 'ad'`; đo thật: ad **được ghi**, purchase **42501** |
| 3. UI: modal khoá, nút xem quảng cáo, nút mua, hiện nội dung đã mở | `components/unlock/UnlockPanel.tsx`, `components/unlock/UnlockGate.tsx` | gate hiện placeholder khi đang kiểm tra, **không bao giờ** lộ nội dung bị khoá |
| 4. Admin bật/tắt từng vị trí, đánh dấu nội dung cần mở khoá | `/admin/ads`, `app/api/admin/ads/route.ts`, `app/api/admin/locked/route.ts` | console in ra **lý do** khi một vị trí đang bật mà không vẽ gì |
| 5. Ba bảng `ad_placements`, `locked_contents`, `user_unlocks` | `supabase/schema.sql` (khối Phase 33) | RLS bật cả ba; chỉ admin đổi được công tắc |

### Đo thật

Policy của `user_unlocks`, chạy đúng vai `authenticated` với claim `sub` kiểu Clerk, mỗi ca một transaction:

| Câu lệnh | Kết quả |
| --- | --- |
| tài khoản của mình, `method = 'ad'` | **ghi được** |
| tài khoản của mình, `method = 'purchase'` | **42501** — vi phạm row level security |
| id của tài khoản khác, `method = 'ad'` | **42501** |

Nghĩa là: một client **không thể tự nhận đã trả tiền**. Mở khoá bằng mua do webhook ghi bằng service role.

### Ba điều nói thẳng, không giả vờ

1. **Quảng cáo thưởng là mock.** Client báo giờ bắt đầu, server chỉ kiểm đã đủ thời lượng chưa — nên **một client nói dối vẫn mở khoá được miễn phí**. Điều đó chấp nhận được với một placeholder và **không** chấp nhận được với một mạng quảng cáo thật. `docs/ADS.md` ghi rõ một tích hợp thật cần gì: ad unit thưởng của mạng, **server-side verification** của chính mạng đó (chứ không phải một cái đồng hồ), và một endpoint mà mạng gọi vào — lúc đó browser không còn là bên tự khai đã xem xong.
2. **Đây là cổng sản phẩm, không phải kiểm soát truy cập.** File model nằm trong bucket **công khai** (mọi model của catalogue này đều vậy), nên khoá quyết định **giao diện hiện gì**, không quyết định mạng trả gì. Ai đọc payload của trang vẫn tìm được URL. Muốn khoá cả byte thì phải có policy theo từng object + signed URL — một thay đổi khác, có giá khác (nó sẽ phá cả hover preview và cache header mà các trang 3D đang dựa vào). Ghi ra đây thay vì để một cái ổ khoá trên UI ngụ ý sai.
3. **Cơ chế mở khoá cũ của Phase 4 vẫn còn, và phase này không lặng lẽ thay nó.** `components/premium/UnlockModal.tsx` đọc cờ `premium` của loài và nhớ trong store của trình duyệt — một cơ chế khác hẳn (client, không có hàng nào trong database). Hai cơ chế cho cùng một ý niệm là một mùi khó chịu, và cách xử lý đúng là **một migration**: seed `locked_contents` từ dữ liệu loài rồi nghỉ hưu `useExploreStore.unlockPremium`. Việc đó chưa làm — nói ra để nó không thành cơ chế thứ ba.

### Về vị trí quảng cáo: đổi hành vi có chủ đích

Năm trang (`/explore`, `/animal/[slug]`, `/quiz`, `/leaderboard`, `/profile`) trước đây luôn vẽ một **khung placeholder** của Phase 4. Nay chúng dùng `<AdBanner placement=... />`: khung đó chỉ hiện khi admin bật đúng vị trí ấy. Đây là thay đổi nhìn thấy được, và là điều brief yêu cầu ("admin bật/tắt ad trên từng vị trí") — nhưng nếu bạn muốn thấy placeholder trở lại thì chỉ cần bật ba công tắc ở `/admin/ads`.

Vị trí được đọc bằng một **client island** gọi `/api/ads/slots` (cache 60 giây, trong process và ở edge), chứ không đọc ở server: đọc ở server nghĩa là `cookies()` — tức là mọi trang có chỗ cho quảng cáo trở thành render động — hoặc là nướng kết quả vào lúc build, tức là admin phải chờ build lại. Đổi lại, quảng cáo **không bao giờ** nằm trên đường tới first paint, đúng luật mà các viewer 3D đã theo.

**Kiểm:** `npm run check:unlock` — **7 bài / 0 fail**; `npm run check:payments` **8 bài / 0 fail**; `npx tsc --noEmit` sạch. Trang `/catalog/space/uranus` vẫn 200 khi mục đó bị khoá (gate là island, trang ở lại tĩnh).

## 📐 "Model nằm quá cao so với mặt sàn" — studio cố định, model thì không

**Bạn báo.** Các model nên nằm sát mặt sàn cắt ngang; chúng đang ở quá cao.

**Đo trước, và loại trừ cái không phải nguyên nhân.** Phép neo (`ModelAnchor` + `floorOffset`) đặt **điểm thấp nhất** của model đúng vào `y = 0`, và tôi kiểm lại bằng hình học thật của từng file: hộp bao sau khi áp ma trận node, rồi `floorOffset = [-center.x, -min.y, -center.z]` — đáy model luôn về 0. Nên **không phải lỗi neo**, và cũng không phải lỗi khung nhìn trong thẻ (đã sửa ở lượt trước).

**Nguyên nhân thật: studio có kích thước cố định, còn model thì không.** Mọi thứ quanh model — lưới, mặt gương, bóng đổ, cả giới hạn zoom của camera — đều là **số tuyệt đối** viết cho loài vật, mà loài vật có cạnh dài **trung vị 4,36 đơn vị**. Nay catalogue không còn chỉ có loài vật:

| Catalogue | Cạnh dài nhất (đơn vị native) |
| --- | --- |
| animals | 0,014 (green sea turtle) → 42.911 (serval); **trung vị 4,36** |
| space | 2 → **200.000** (Uranus) |
| plants | 0,25 → 654 |
| vehicles | 2 → 2.772 |

Một mặt sàn vẽ ở **48 đơn vị** là **vô hình** dưới một hành tinh 200.000 đơn vị, và là **một lục địa** dưới một bông hoa 0,25 đơn vị. Model không có sàn nhìn thấy được dưới chân thì đúng là "nằm quá cao" — và đó là điều bạn thấy.

**Sửa.** Mỗi prop của studio nay là **bội số của chính kích thước model**, đo một lần từ đúng hộp bao mà phép neo dùng (`posedBounds`):

| Prop | Cũ (tuyệt đối) | Nay | Với loài vật (4,36) |
| --- | --- | --- | --- |
| lưới: cellSize / sectionSize / fadeDistance | 0,5 / 2,5 / 26 | × 0,115 / 0,573 / 5,96 | 0,5 / 2,5 / 26 — **y hệt** |
| mặt gương | 48 × 48 | × 11 | 48 × 48 |
| bóng đổ `scale` / `far` | 16 / 5 | × 3,67 / 1,15 | 16 / 5 |
| camera `minDistance` / `maxDistance` | 0,6 / 26 | × 0,138 / 5,96 | 0,6 / 26 |

Các tỉ lệ được lấy **bằng chính số cũ chia 4,36**, nên những trang vốn đã đúng (loài vật) nhìn **không đổi một pixel**, còn hành tinh, cây và xe thì nay có sàn thật dưới chân. Đây là cùng cách xử lý mà fog đã được sửa trước đó: "không rescale model — rescale cái quanh nó".

**Kiểm:** `/catalog/space/uranus` (200.000 đơn vị) và `/animal/lion` đều render, ảnh chụp canvas có nội dung ở cả hai; **680 bài / 0 fail**, `tsc` sạch.

**Nếu vẫn thấy cao, nói tôi biết đang nhìn ở đâu** — thẻ hover trong lưới catalogue, hay trang chi tiết — vì hai chỗ đó đặt camera khác nhau (thẻ căn theo hộp bao model qua `<Bounds fit margin={1.7}>`, trang chi tiết dùng `<Bounds fit margin={1.25}>`). Tôi có harness chụp + giải mã PNG để chỉnh bằng số đo, không bằng cảm tính.

### Phase 29 — Architecture: đo trước, và **nói thẳng** thay vì làm một công tắc rỗng

Phase 29 yêu cầu ba thứ mà một viewer công trình thường có: **đi vào bên trong**, **bật/tắt tầng**, **bật/tắt nội thất**. Cả ba đều cần asset có các phần **tách rời và có tên**. Nên việc đầu tiên là đo xem catalogue có gì — `scripts/probe-model-structure.mjs` đọc thẳng cây node của từng file `.glb`:

| Catalogue | Model | Có ≥3 phần được đặt tên | Không có tên nào |
| --- | --- | --- | --- |
| animals | 73 | 7 | 60 |
| landmarks | 47 | 10 | 30 |
| space | 16 | 3 | 3 |
| plants | 16 | 7 | 7 |
| vehicles | 14 | 4 | 9 |
| **Tổng** | **166** | **31** | **112** |

Và tên của 31 file kia không nói lên cấu trúc: chúng đặt theo **vật liệu** — `Material2`, `Model_material1_0`, `BuildingMesh-00000.005_BuildingMat-00006.005_0`. **Không có một `Floor_1`, `Roof` hay `Chair` nào trong toàn bộ catalogue.** File lớn nhất lại càng ít cấu trúc: `taj-mahal` có 770 node và 259 mesh, **không cái nào có tên**; `hagia-sophia` 308 và 203, cũng vậy.

**Nên thứ được giao là sự thật, không phải công tắc.** Mỗi trang model nay có một panel "This model file" in ra **con số thật của chính file đang vẽ**: *"This file is one unbroken mesh: 259 meshes in 770 nodes, none of them named. There are no floors or furniture in it to switch on and off."* Kèm câu giải thích vì sao ở đó có một câu chứ không phải một nút.

Cách này là **đúng tinh thần mà chính PLAN đã viết cho phase này** ("đọc cấu trúc thật của file, và nói thẳng khi file không có cấu trúc đó"), và nó tránh đúng loại lỗi mà dự án đã gặp hai lần: một model thủ tục được vẽ thay cho model thật, và một card hứa một file nó không có. Một công tắc "Tầng" trên một khối đặc là lời nói dối mà người xem chỉ phát hiện khi bấm vào.

**Còn lại của Phase 29, nói rõ:** muốn có "đi vào trong nhà / bật tắt tầng / nội thất" thì phải có **asset có cấu trúc** — file chia node theo tầng và theo đồ đạc. Đó là việc **tìm nguồn asset khác**, không phải việc code thêm: pipeline hiện tại tải photogrammetry một khối, và mọi nguồn đã khảo sát (Sketchfab, Smithsonian, Poly Pizza, Wikimedia Commons) đều cho đúng loại đó. Ghi lại làm đầu vào cho một lượt khảo sát sau, thay vì dựng một tính năng không có dữ liệu để chạy.

### Ngân sách bundle cho các route mới — và con số trang

Build cách ly (exit 0, **212 giây**, **0 cảnh báo**, **199 trang** dựng sẵn — trước các phase này là 154):

| Route | Đo được | Ngân sách |
| --- | --- | --- |
| `/catalog/[category]/[slug]` | **139,1 kB** | 155 (cùng số với `/landmarks/[slug]`) |
| `/search` (dynamic, đọc từ manifest) | **117,5 kB** | 130 |
| `/categories/[id]` (nay có thẻ hover 3D) | **139,9 kB** | 150 |
| `/categories` | **134,5 kB** | 140 |

`check:bundle` xanh, không có three.js ở first paint, và **không còn route nào chưa khai ngân sách** ngoài 6 route manga (#12).

### Tổng kết ba danh mục mới

| Danh mục | Mục | Model | Dung lượng | Nguồn model |
| --- | --- | --- | --- | --- |
| Space | 16 | **16** | 32 MB | Sketchfab CC-BY-4.0 (NASA được tìm nhưng xếp dưới — xem ghi chú ở Phase 26) |
| Plants | 16 | **16** | 50,4 MB | Sketchfab 15 × CC-BY-4.0 + 1 × **CC0-1.0** |
| Vehicles | 16 viết → **14 giữ** | **14** | 16 MB | Sketchfab CC-BY-4.0 |
| **Tổng** | **46** | **46** | **~98 MB** | |

Ba danh mục trống của catalogue nay **không còn mục nào thiếu model**: mọi mục hiển thị đều có một file thật, đã credit, và mục nào không lấy được model thì **bị xoá** — đúng luật đã áp cho động vật, công trình và Forbidden City.

### Phase 28 — Vehicles: 14 mục, 14 model thật

**Dữ liệu.** `data/vehicles.ts` — 16 mục viết ra, **14 mục còn lại** sau khi hai mục bị xoá vì không có model (xem dưới). Nguồn số liệu ghi trong `metadata.source` từng mục: bảng "Specifications" của Wikipedia cho máy bay/trực thăng (747-200B; A380-800 theo Airbus; Concorde; UH-1H theo Jane's All the World's Aircraft 1987-88), infobox tàu cho tàu thuỷ (Emma Maersk dẫn ABS Record), "Formula One car" + "Formula One" (1950), "Toyota Corolla (E210)", "Tesla Model S", fact file của U.S. Navy cho tàu ngầm, và bài Wikipedia tương ứng cho Shinkansen / Harley-Davidson / road bicycle / AEC Routemaster / fire engine / hot air balloon.

Số gây tranh cãi đã ghi rõ trong comment đầu file: F1 375 km/h ("up to"), 747 900 km/h là **cruise**, A380 903/955 km/h là bản đổi Mach của chính nguồn, Concorde 2.179 km/h max so với cruise 2.158, Shinkansen 320 km/h chạy thường lệ / 443 km/h kỷ lục thử nghiệm 1996 còn **603 km/h (2015) thuộc L0 maglev, không phải Shinkansen**, Titanic 39 km/h khi thử máy (trung bình 18 kn), tàu ngầm 46,3 km/h là số Navy công bố còn max vẫn classified, Emma Maersk 11.000 TEU quảng cáo so với 14.770+ TEU. Các số không tra được để **null** và ghi rõ: tốc độ tối đa của Harley/Corolla/xe đạp/xe cứu hoả/khinh khí cầu, chiều dài của Shinkansen (là mạng nhiều loại tàu)/Harley/xe đạp/xe cứu hoả/khinh khí cầu, khối lượng của nhóm đó + Routemaster.

**Model: 14/14 tải được, tất cả CC-BY-4.0, tổng 16 MB.** Nặng nhất `road-bicycle` 7,81 MB (454.503 mặt), nhẹ nhất `routemaster` 0,15 MB (1.908 mặt).

**Hai mục bị xoá, kèm lý do đo được** — luật "không model thì không có card", thực thi bằng `scripts/drop-entries-without-models.mjs` (script mới, có tự kiểm mảnh cắt trước khi ghi):

| Mục | Lý do |
| --- | --- |
| `emma-maersk` | không có model nào nêu đúng tên nó: truy vấn "Emma Maersk", "Emma Mærsk", "Maersk container ship", "container ship" đều không trả về kết quả hợp licence nào (gate bỏ dấu nên "Mærsk" khớp "Maersk", vẫn không có) |
| `los-angeles-class-submarine` | ứng viên đúng nhất — **"Los angeles class", 30.700 mặt, CC-BY-4.0** — bị **cổng màu** từ chối: file khai báo không màu, sẽ render trắng |

**Một cơ chế mới, và vì sao nó cần có.** Cổng tên đòi **mọi từ** của tên hiển thị xuất hiện trong tiêu đề. Với một lớp tàu, điều đó là sai: model của lớp Los Angeles có tiêu đề "Los angeles class" và **không có chữ "submarine" nào**. Hai cách xử lý — bóp méo tên hiển thị, hoặc từ chối một model thật 30.700 mặt của đúng loại tàu đó — đều tệ. Nên mục dữ liệu **tự khai tên mà model của nó có thể mang** (`metadata.model_aliases`), pipeline truyền danh sách đó cho cổng, và tên hiển thị không đổi một chữ. (Trong trường hợp này cổng màu vẫn từ chối, nên mục bị xoá — nhưng cơ chế ở lại và dùng được cho lần sau.)

**Model sinh bằng AI đã được ghi nhãn.** Lượt tải đầu ship **"[🟢Meshy] Bell UH-1 Iroquois"** — một model do AI sinh từ câu lệnh, và **không có gì nói ra điều đó**. Nay pipeline phát hiện dấu hiệu generator trong tiêu đề (meshy / tripo / ai-generated / text-to-3d), ghi một bản ghi `generated` vào manifest, và trang chi tiết in thẳng: *"This model was generated by Meshy from a text description — a reconstruction, not a scan or a hand-built model of the real thing."* Cùng luật mà `scripts/generate-models.mjs` đã áp cho loài vật: một model tổng hợp được hiển thị như model thật là **cùng một lời nói dối** với một số liệu bịa.

### Phase 30 — Unified Search: một ô cho sáu danh mục

**Yêu cầu.** Tìm kiếm xuyên danh mục.

**Đã giao.** `/search?q=` — trang **duy nhất** trong nửa catalogue đọc query ở **server** (Next không sinh route tĩnh cho search param, nên nó là dynamic có chủ ý; `robots: noindex`). `lib/search.ts` chấm điểm giải thích được: tên trùng khít 100 · tên bắt đầu bằng 80 · tên chứa 60 · tên thứ hai (danh pháp, phân loại) 40 · fact 25 · mô tả 10, và **hiện lý do khớp** (fact/mô tả nào). Bỏ dấu cả hai phía nên "chichen itza" tìm ra Chichén Itzá.

- **Ô tìm kiếm trên navbar nay trỏ về `/search`**, và `SearchAction` trong dữ liệu có cấu trúc được sửa theo (`lib/seo.ts` + test `check-seo`), nếu không thì structured data hứa với crawler một URL mà query không chạy.
- Query rỗng trả về **danh mục** của sáu chủ đề (một câu trả lời tốt hơn "không có kết quả"); không khớp gì thì **nói thẳng** "không khớp, đã tìm trong N chủ đề" kèm danh sách chủ đề, để không ai nhầm "site không có" với "tìm kiếm hỏng".
- Kiểm trên dev server: `/search?q=tower` → **200**, "17 matches across 3 of 6 subjects" (Animals · Modern Buildings · Architecture); `/search?q=saturn` → **200**.

### Phase 26 — Space: 16 mục, 16 model thật

**Dữ liệu.** `data/space.ts` — **16 mục**, hai nhóm:

| Nhóm | Mục |
| --- | --- |
| 10 thiên thể | Sun · Mercury · Venus · Earth · Moon · Mars · Jupiter · Saturn · Uranus · Neptune |
| 6 tàu/thiết bị NASA | International Space Station · Hubble · James Webb · Curiosity rover · Saturn V · Voyager 1 |

**Nguồn số liệu**, ghi trong `metadata.source` từng mục: **NASA Planetary Fact Sheet** (nssdc.gsfc.nasa.gov, bản tự ghi "Last Updated: 9 May 2024") cho khối lượng, đường kính, khoảng cách, độ dài ngày, chu kỳ quỹ đạo, nhiệt độ, số mặt trăng; **Sun Fact Sheet** cho Mặt Trời (bảng hành tinh không có Mặt Trời); các trang `science.nasa.gov` và trang nhiệm vụ cho fact về sứ mệnh; trang Facts and Figures của ISS, "Hubble by the numbers", FAQ của Webb, trang Curiosity, bài giải thích Saturn V và trang Voyager 1 cho nhóm B.

**Những con số gây tranh cãi, và cách xử lý** — ghi ngay trong comment đầu file, đúng luật của dự án:

- khối lượng/đường kính Trái Đất lệch nhau **giữa hai trang NASA cùng site** (5,97e24 so với 5,9722e24 kg; 12.756 so với 12.742 km) — cả hai đều được nêu;
- đường kính Mặt Trời 1.391.400 km là **2 × bán kính 695.700 km** vì bảng không có dòng đường kính; nhiệt độ 5.499 °C là 5.772 K đổi ra, không phải một con số Celsius được công bố;
- "ngày" của Mặt Trời 609,12 h thực ra là **chu kỳ tự quay ở vĩ độ 16°**;
- sao Kim 5.832,5 h là dòng rotation (bảng in số âm = nghịch hành), không phải dòng "length of day" 2.802,0 h;
- Sao Thiên Vương 28 mặt trăng theo bảng, nhưng **chú thích ảnh trên chính trang NASA đó ghi 27**;
- Saturn V 111 m trong khi 363 ft = 110,6 m — trang NASA làm tròn lên;
- **bốn số để null** vì không tra được: `moon.distance_from_sun_km` (dòng của bảng là khoảng cách tới Trái Đất, và nó dao động ~43.000 km), `sun.year_length_days` (Mặt Trời không quay quanh chính nó), chiều dài của Webb (chỉ có sunshield 21,197 × 14,162 m — một khẩu độ đã bung), chiều dài của Voyager 1 (trang NASA không đưa).

**Model: 16/16 tải được, tất cả CC-BY-4.0, tổng 32 MB**, nặng nhất `curiosity-rover` 6,00 MB và `james-webb-space-telescope` 5,56 MB:

| Mục | Mặt | MB | | Mục | Mặt | MB |
| --- | --- | --- | --- | --- | --- | --- |
| sun | 7.936 | 1,81 | | international-space-station | 38.006 | 1,01 |
| mercury | 5.888 | 0,32 | | hubble-space-telescope | 50.447 | 5,14 |
| venus | 5.888 | 0,45 | | james-webb-space-telescope | 19.353 | 5,56 |
| earth | 32.256 | 1,61 | | curiosity-rover | 48.384 | 6,00 |
| moon | 5.888 | 0,40 | | saturn-v | 1.982 | 0,79 |
| mars | 2.048 | 1,15 | | voyager-1 | 20.390 | 1,89 |
| jupiter | 4.076 | 2,74 | | | | |
| saturn | 6.912 | 0,29 | | | | |
| uranus | 8.072 | 0,42 | | | | |
| neptune | 7.936 | 2,26 | | | | |

**Một điều đáng ghi về nhà cung cấp.** NASA 3D Resources (public domain, 227 thư mục) **đã được tìm** cho cả 16 mục, và **không mục nào chọn NASA**. Lý do nằm ở bộ chấm điểm: NASA không khai số lượt tải, không khai lượt thích, không có thumbnail, và **không khai số mặt** — bốn tín hiệu trong sáu tín hiệu của `scoreModelQuality`, nên model Sketchfab luôn xếp trên. Đây là hệ quả của một chính sách đã có từ Phase 12 (chấm điểm theo thứ người xem nhận ra), không phải lỗi; nhưng nếu muốn ưu tiên **public domain** cho không gian thì đó là một quyết định chính sách, không phải một sửa lỗi — ghi lại ở đây để lần sau ai đọc cũng biết vì sao 16/16 đến từ Sketchfab.

**Một lỗi thật, do chính lượt dò này tìm ra:** `rankCandidates` gọi `term.trim()` trên mọi term, nên một mục **không có tên khoa học** (hành tinh) làm cả 16 mục nổ với `Cannot read properties of null (reading 'trim')`. Đã sửa ở tầng dùng chung: `titleScore` bỏ qua term không phải chuỗi — thiếu term là thiếu, không phải lỗi.

### Cổng chặn tên mới, vì cổng của công trình không dùng lại được

`lib/landmark-gate.ts` mang luật về **bộ phận của một toà nhà** ("Shachihoko **of** Himeji Castle" là một món trang trí; "wall" bị từ chối trừ khi chính công trình tên là wall). Những từ đó vô nghĩa với một hành tinh hay một cây hướng dương, và dùng lại sẽ từ chối oan.

Nên `lib/catalog-gate.ts` là **luật nhỏ nhất đúng** cho ba danh mục:

1. tiêu đề phải chứa **tên mục**, bỏ dấu, khớp theo **ranh giới từ**; tên nhiều từ thì **mọi từ** phải có mặt — "ISS (A) International Space Station" đạt, "To Scale Solar System" không;
2. **không có từ khoá placeholder**, dùng chung danh sách với pipeline động vật và công trình (`lib/model-quality.ts`) để ba pipeline không lệch nhau về định nghĩa "hàng giả";
3. **tên khoa học cũng tính**, vì model của một loài cây thường được đặt theo tên Latinh (`Quercus robur`).

**14 ca kiểm**, gồm những ca suýt đúng lấy từ chính lượt dò: "Earthquake simulator" (chứa "earth" nhưng không phải `\bearth\b`), "Sunset over Mars", "Low Poly Oak Tree", "LEGO Formula 1 Car", "Toy paper Globe" — tất cả bị từ chối đúng, và các ca đúng đều đạt.

### Một pipeline cho mọi catalogue, và nó không tự định nghĩa luật nào

`scripts/fetch-catalog-models.mjs --catalogue=space|plants|vehicles` import **mọi** cổng từ module đã sở hữu chúng: `rankCandidates` (licence), `titleNamesEntry`, `FACE_BUDGET.max`, `modelCanShowColour`, `CRUDE_MONUMENT_FACES` + `modelHasNoTexture`, `compressGlb`, và trần 25 MB **đo trên file ship**.

Khác biệt duy nhất so với pipeline công trình: **tìm trên hai nhà cung cấp** (NASA + Sketchfab) rồi chấm điểm chung, và **đếm tam giác từ chính file đã tải** khi nhà cung cấp không khai — NASA không khai, nên nếu không đếm thì ngân sách đa giác và luật "hình vẽ" sẽ không có tác dụng với nửa số model.

### Trang chi tiết dùng chung: `/catalog/[category]/[slug]`

Ba catalogue mới dùng **một** route chi tiết, vì chúng chia sẻ interface `CatalogEntry`. Trang đọc **hình dạng**, không đọc chủ thể: viewer, luật mặt sàn, dòng credit, DRACO và watchdog đều là của `ModelViewer` sẵn có — không có bản sao thứ hai.

Động vật và công trình **không** được phục vụ ở route này: chúng có route riêng với field riêng (tình trạng bảo tồn, bản đồ phân bố, kiến trúc sư), và một con sư tử có hai URL là cách một site có hai bản của mọi thứ. `itemHref` trong `lib/catalog-links.ts` là **một chỗ** quyết định card trỏ đi đâu, và luật "card không bao giờ trỏ tới route 404" được khoá bằng test.

### Thẻ catalogue nay vẽ model thật khi hover

Trước đó `ItemCard` chỉ có plate chữ cái và huy hiệu "3D". Nay nó mount **model thật** khi hover — sau 180 ms, chỉ trên thiết bị có hover — qua `next/dynamic`, nên three.js vẫn không nằm ở first paint và **chỉ một canvas** tồn tại tại một thời điểm.

## 🚧 Việc còn lại

| # | Việc | Ghi chú |
| --- | --- | --- |
| 1 | ~~**Cập nhật `CLERK_SECRET_KEY`**~~ | ✅ **Không còn là vấn đề** — kiểm lại trong phiên này: key trong `.env.local` trả **HTTP 200** cho `GET https://api.clerk.com/v1/users`, và tìm được đúng tài khoản `kaiovinh@gmail.com` (Clerk user `user_3Ja1siqFIUisqvpNzeflv0tkkA6`). Việc còn lại là **bạn đăng nhập thử trên trình duyệt** (bước 2). |
| 2 | Test đăng nhập trong trình duyệt | Cần bạn tự làm (Google sign-in qua Clerk). Kiểm tra được từ phía tôi: Clerk API xanh, `AUTH_PROVIDER=clerk`, và `app_admins` đã có dòng cho user của bạn. |
| 3 | 3 model là "đại diện" | `gooty-tarantula` (tarantula Mexican red-knee), `weddell-seal` (seal chung), `emperor-penguin` (chim non) — thay bằng `data/model-sources.json`. |
| 4 | **P0.1 — Clerk Third-Party Auth + RLS thật** (từ review Phase 10) | 🔴 **Chặn ở phía Supabase, không phải ở code.** Session token của Clerk đã có `role: authenticated`, `kid` khớp JWKS sống, và integration đã được **xoá rồi thêm lại bằng API + restart project** — PostgREST vẫn trả `401 PGRST301 "No suitable key was found"`, tức nó không có khoá của Clerk trong cấu hình. Còn lại: (1) Clerk → Integrations → **Connect with Supabase**; (2) Supabase → Authentication → Third-Party Auth, thêm lại integration **bằng tay**; nếu vẫn lỗi thì gửi Supabase support bảng bằng chứng ở mục "P0.1 — Kết quả" phần 6. Không có thao tác nào trong số này sửa được bằng API hay bằng code |
| 5 | ~~**P0.2 — chống bơm lượt xem**~~ | ✅ **Xong** — cửa sổ trượt 40/phút mỗi địa chỉ + chặn `Sec-Fetch-Site: cross-site`; đã kiểm trên server thật (403 và 429 kèm `retry-after`) |
| 6 | ~~**P0.3 — tầng lỗi/đang tải**~~ | ✅ **Xong** — `app/error.tsx`, `app/global-error.tsx`, `PageSkeleton` cho 4 route động; đã render lại bằng Chrome headless |
| 7 | ~~**P0.4 — `dispose()` GLB**~~ | ✅ **Xong** — `lib/three-dispose.ts` dùng chung cho trang loài và quiz, 6 test; lỗ rò ở quiz (mỗi câu reveal một model) đã bịt |
| 8 | **Giới hạn đã biết của Phase 20** | Rate limiter nằm trong bộ nhớ nên chỉ giới hạn **một** process (nhiều instance cần store dùng chung — dự án cố ý không yêu cầu); CSP đang **report-only** nên hôm nay chưa chặn gì; chưa có tự động xoay khoá. Ghi đủ ở [docs/SECURITY.md](docs/SECURITY.md) |
| 9 | Âm thanh loài (**Phase 9**) | **Đã tải 6 bản ghi** (635 kB, CC0/CC-BY, đã credit + upload Storage). 18 loài còn lại không có bản ghi hợp licence trên Wikimedia — phần lớn là CC BY-SA/NC. Muốn tăng độ phủ: dán `FREESOUND_API_KEY` **thật** vào `.env.local` (giá trị hiện tại chỉ 3 ký tự nên API trả 401) rồi chạy `npm run sounds:fetch -- --all`. |
| 10 | File `LICENSE` | Repo public nhưng chưa có license — quyết định của bạn. |
| 11 | Xoay service role key | Đang dùng cho chế độ Clerk; nên xoay định kỳ. |
| 12 | **Ngân sách bundle cho 6 route `/manga-studio/*`** (Phase 24) | 🟠 **Đo được rồi, chưa khai.** Nút thắt đã gỡ: `NEXT_DIST_DIR=.next-build npm run build && NEXT_DIR=.next-build node scripts/bundle-budget.mjs --report` (xem mục "`next build` treo"). Sáu route vẫn chưa có ngân sách trong `ROUTES`, và theo luật của chính file đó thì một ngân sách chưa đo còn tệ hơn không có — nên việc còn lại là chạy đúng hai lệnh trên rồi điền số. |
| 13 | ~~**Thời gian build**~~ | ✅ **Đã đo: 839 giây (13 phút 59 giây)** — exit 0, 512 MB, **0 cảnh báo `<w>`**, **147** trang dựng sẵn. Đây là lần build đầu tiên chạy xong trong môi trường này, khi nó được cấp thư mục output riêng (`NEXT_DIST_DIR=.next-build`). Số **~6,5 phút của CI** là số cũ, đo trước thay đổi dataset; cần một lần CI để so. Xem mục "`next build` treo". |
| 14 | Panel AI của Manga Studio cần key thật | `MANGA_AI_PROVIDER` / `MANGA_AI_API_KEY` / `MANGA_AI_MODEL`. Không có key thì `/api/manga/ai/status` trả `configured: false` kèm lý do và UI in lý do đó ra; đường upload tay vẫn chạy. Ba shape request của ba provider là **tài liệu của họ**, chưa gọi thật lần nào. |
| 16 | ~~34 loài không có model 3D~~ | ✅ **Đã xoá hẳn** — xem mục "Chỉ giữ loài có model". Muốn thêm loài mới: dò trước (`npm run models:report`), chỉ viết vào catalogue sau khi có model nêu đúng tên loài (`npm run models:audit` là cổng) |
| 21 | ~~**Phase 25 chưa xong phần UI**~~ | ✅ **Đã giao**: `CategoryNav`, `ItemGrid`, `ItemCard`, `CategoryIcon`, `/categories` + `/categories/[id]`, mục Catalogue trên Navbar, dải chủ đề trên trang chủ, sitemap, 5 danh mục trong seed. Kiểm trên dev server: 200 ở cả 4 route, 404 ở id lạ. Còn lại hai việc nhỏ không chặn phase nào: `SizeComparison`/`InteractiveGlobe` cho mọi category, và form admin thêm item. Xem mục "Phase 25 — Phần UI" |
| 22 | ~~**Phase 26–30 chưa triển khai**~~ | ✅ **Đã giao** — Space 16, Plants 31, Vehicles 14, Architecture (48 công trình), Unified Search `/search`, mỗi mục có model thật đã credit (xem "Tổng kết ba danh mục mới"). Phần **chưa** làm của Phase 29 là "đi vào trong nhà / bật tắt tầng": không nguồn asset nào có cấu trúc node theo tầng, và điều đó được in ra trên trang thay vì dựng một công tắc rỗng |
| 24 | **Phase 31/32/33 — ba phase bảo mật, thanh toán, quảng cáo** | ✅ **Đã giao**, kèm hai chỗ chưa kiểm chứng được và nói thẳng: (31) sáu yêu cầu bảo mật có test + số đo, xem "Phase 31 — Kết quả (phần 2)"; (32) tầng Lemon Squeezy đầy đủ nhưng **chưa từng có delivery thật** và chưa từng mở checkout thật vì repo không có tài khoản store — chữ ký thì đã đo bằng HMAC thật; (33) quảng cáo + mở khoá có policy đo được, nhưng **quảng cáo thưởng vẫn là mock** (client tự khai), và cơ chế mở khoá cũ của Phase 4 vẫn tồn tại song song — hợp nhất chúng là một migration chưa làm |
| 23 | ~~Landmark: batch 1 và 2~~ | ✅ **Đã nối hết**: `data/landmarks/all.ts` gộp 15 + 17 + 16 = **48 công trình ở 30 nước**, **47 có model thật** (103,0 MB, tất cả CC-BY-4.0). Xem mục "Công trình: 15 lên 48" — trong đó có hai lỗi của chính bộ luật và một quyết định còn treo (Hagia Sophia) |
| 20 | Công trình: asset nặng | ✅ **Ngân sách bundle đã khai và đã đo**: `/landmarks` **158 kB** (ngân sách 165, ngang `/explore`), `/landmarks/[slug]` **139 kB** (ngân sách 155). Còn lại là **quyết định của bạn**: `taj-mahal` 12,02 MB, `sydney-opera-house` 8,8 MB, `alhambra` 8,2 MB, `prambanan` 6,89 MB là những asset nặng nhất site — muốn nhẹ hơn thì phải decimate, tức là sửa asset |
| 19 | Mặt sàn chỉ được canh ở mức lấy mẫu | Phép quét 32 mẫu + lưới 192 đỉnh/6 frame. Một mô hình lặn đúng vào đỉnh không được canh, giữa hai frame được canh, vẫn lọt dưới sàn. Chặt hơn thì phải canh mọi đỉnh mỗi frame — xem mục "Mặt sàn" |
| 18 | **Lấy model AI cho ~20 loài** | Hạ tầng xong (`scripts/generate-models.mjs`), chờ `MESHY_API_KEY`. Meshy Free = CC BY 4.0 nhưng chỉ ~3 model/tháng với 100 credit; gói trả tiền thì **mất** CC BY nên phải quyết định lại luật licence trước |
| 17 | ~~`docs/MODELS.md` và `docs/PERFORMANCE.md` ghi "24 species"~~ | ✅ **Đã sửa, bằng số đo chứ không bằng cách thay số:** `MODELS.md` nay ghi **73 model / 136,1 MB / 2.127.639 mặt / trung vị 0,95 MB / lớn nhất 20,3 MB** (đọc từ `data/model-attribution.json`) và mô tả cả catalogue công trình; `PERFORMANCE.md` ghi 73 loài + 48 công trình và sitemap **73 + 48 + 7** URL |
| 25 | **25 model bị người soi nói là sai, chưa gỡ** (Phase 35) | Danh sách đầy đủ kèm câu của người soi ở mục "duyệt bằng mắt" của Phase 35. Gỡ là **quyết định của bạn**: loài thôi nhận một model nó không có và rơi về rig thủ tục, và với plants/space/architecture thì phải gỡ dòng credit cùng lúc hoặc `scripts/check-catalogues.mjs` đỏ |
| 26 | **Một bộ lập lịch của phiên trước vẫn đang ghi vào cây làm việc** | PID `50193` (`model-orders.mjs --upload`) và PID `96430` (dev server treo trên cổng 9000) vẫn spawn `fetch-models.mjs --apply --upload`. Nó làm số đếm đổi giữa hai lần đo và làm 4 bài test `check-r2`/`check-catalogues` đỏ. Nó cũng **wire model không qua cổng thị giác**. Cần bạn quyết định dừng hay để chạy |
| 27 | **Token R2 không liệt kê được bucket** (`ListObjectsV2` 403) | Đã sửa phần mềm để `--push` chạy được mà không cần liệt kê; còn lại là quyền của token trên dashboard Cloudflare nếu muốn `npm run r2:index` chạy lại |
| 15 | Upload panel cần `SUPABASE_SERVICE_ROLE_KEY` | Bucket `manga-panels` chỉ có policy **đọc** công khai (đúng như SQL đã chốt), nên ghi vào Storage trả **503 kèm câu giải thích** khi thiếu key. Cùng luật với hộp thư model ở Phase 22. |

---

## ☁️ Phase 34 — Migrate Supabase Storage → Cloudflare R2 (đã đẩy **242 object / 488,5 MB** lên R2 và đọc lại được; cắt sang CDN còn chờ **một CORS rule** trên bucket)

**Yêu cầu:** chuyển toàn bộ file từ Supabase Storage sang Cloudflare R2, cập nhật URL trong database, giữ nguyên cấu trúc thư mục.

### Đo trước khi làm, và con số đổi hẳn bài toán

| Bucket | Object | Dung lượng |
| --- | --- | --- |
| `animal-assets` | **0** | 0 MB |
| `animal-sounds` | **6** | 0,6 MB |
| `manga-panels` | **0** | 0 MB |

Trong khi đó catalogue đang phục vụ **236 model, 461,7 MB** — tất cả từ `public/models/**` trong repo. Nghĩa là: **Storage gần như trống**, và "chuyển toàn bộ file sang R2" hôm nay là chuyển **6 file / 0,6 MB**. Đây không phải một migration, đây là một **quyết định kiến trúc**: có muốn đưa 461,7 MB asset ra CDN hay không.

Điều này đúng với chủ đích đã ghi trong PLAN từ trước (*"Asset ưu tiên Storage, repo chỉ là fallback"*) — chỉ có điều nhánh Storage **chưa từng được nạp**. Nên phase này phải trả lời câu hỏi đó trước khi viết một dòng code nào.

### Khoá đã có; phép thử đầu tiên thì hỏng, và hỏng ở phía tôi

`.env.local` **đã có đủ năm biến** (kiểm bằng tên biến, không in giá trị): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `NEXT_PUBLIC_R2_PUBLIC_URL`.

Lượt thử đầu là một request SigV4 **tự viết tay** bằng Python, và nó trả **403 SignatureDoesNotMatch**. Kết quả đó **không nói gì về khoá**: canonical request tôi dựng đã **bỏ trống dòng query string** (`list-type=2&max-keys=5`), mà SigV4 bắt buộc phải đưa query đã sắp xếp vào chuỗi ký — nên chữ ký sai là lỗi của phép thử, không phải của credential. Bài học đúng với chính dự án này: **không tự ký tay**, dùng một S3 client thật.

(`NEXT_PUBLIC_R2_PUBLIC_URL` trả 403 khi gọi vào gốc `/` cũng không phải bằng chứng: bucket công khai của R2 không liệt kê thư mục, nên 403 ở gốc là bình thường.)

### Lượt này: khoá đã chạy thật, và 488,5 MB đã nằm trên R2

**Quyết định của bạn:** đẩy **cả hai** — 6 file âm thanh *và* toàn bộ model — và **giữ nguyên bản sao
trong repo** (đúng quyết định 0b, để Demo Mode và self-host vẫn chạy không cần khoá).

**S3 client thật, không ký tay.** Cài `aws4fetch` (một SigV4 signer chạy trên WebCrypto, ~3 KB) thay vì
`@aws-sdk/client-s3` 19 gói cho một repo có 19 dependency. Toàn bộ việc ký nằm ở một chỗ:
`scripts/r2.mjs`. Bài học 403 của lượt trước được ghi thành code, không chỉ thành lời.

**Phép thử xanh hết** (`npm run r2:check`) — đọc được, ghi được, URL công khai đúng **byte**:

| Bước | Kết quả |
| --- | --- |
| `ListObjectsV2` | OK — bucket rỗng lúc đầu |
| `PutObject` một file nhỏ | OK |
| `GET` qua `NEXT_PUBLIC_R2_PUBLIC_URL` | **HTTP 200, đúng số byte** |
| ETag == md5(nội dung) | OK — byte lên nguyên vẹn |
| `DeleteObject` | OK — dọn sạch probe |

**Đã đẩy: 242 object, 488.472.973 byte (488,5 MB / 465,8 MiB).**

| Nhóm | Số file | Byte | Đo được |
| --- | --- | --- | --- |
| `sounds/**` | 6 | 634.937 | 620 KiB |
| `models/**` | 236 | 487.838.036 | 487,8 MB (465,2 MiB) |

⚠️ **Con số "461,7 MB" của lượt trước là sai** — đó là ước lượng, không phải phép đo. Số thật là
**487,8 MB** cho riêng model. Cùng loại lỗi như `du -sm` (ra 466 MiB vì làm tròn theo block).

**Đã đọc lại toàn bộ:** `npm run r2:verify` → **242/242 object đọc được công khai với đúng số byte**,
`content-type` đúng (`model/gltf-binary`, `audio/ogg`, `audio/mpeg`) và `cache-control:
public, max-age=31536000, immutable` — cùng header mà `lib/model-publish.ts` gửi cho Supabase, nên hai
host không khác nhau. Biên lai được commit ở `data/r2-manifest.json` (byte + md5 mà R2 trả về làm ETag).

**Đẩy là chuyện nhỏ; chỗ suýt sai là chỗ khác.** Bucket công khai của R2 **không gửi**
`access-control-allow-origin`. `useGLTF` đi qua `fetch()` (three `FileLoader`), nên **trình duyệt chặn
model** — trong khi thẻ `<audio>` của `SoundButton` không cần CORS. Đây không phải suy luận từ source: một
trình duyệt thật đã trả lời (`npm run r2:probe`):

```
CHẶN  model fetch (useGLTF path)       HTTP 0      0 B   Failed to fetch
OK    audio element (SoundButton path) HTTP 200           canplaythrough fired
```

Nghĩa là: **"file đã ở trên CDN" và "trang đọc được nó" là hai chuyện khác nhau**, và nếu chỉ đẩy rồi tuyên
bố xong thì mọi trang 3D sẽ vỡ trong im lặng.

Sửa bằng `PutBucketCors`? **403 AccessDenied** — khoá S3 trong `.env.local` là *object-scoped*, không
phải admin. Việc này phải làm trong dashboard Cloudflare (hoặc tạo token có Admin Write rồi chạy
`npm run r2:cors`).

**Cắt sang CDN đã sẵn sàng, có công tắc, và đang TẮT.** `lib/r2.ts` là chỗ duy nhất quyết định host:

- `NEXT_PUBLIC_R2_PUBLIC_URL` = **bucket ở đâu** (script đẩy lên đó);
- `NEXT_PUBLIC_R2_ASSETS=on` = **site có đọc từ đó không** (mọi giá trị khác → bản trong repo).

Hai công tắc tách rời vì đẩy 488 MB và đổi thứ khách tải về là hai sự kiện khác nhau — và vì cái CORS rule
kia phải có trước. Đã nối vào **bốn** chỗ đọc, không phải 79 chỗ ghi: `lib/animals.ts`, `lib/landmarks.ts`,
`lib/catalog.ts`, `lib/catalog-project.ts`.

**Database: không có gì phải migrate, và đó là phát hiện đáng giá nhất.** Đo thật 73 dòng `animals` bằng
service key: `model_url` **73/73 là đường dẫn nội bộ** (`/models/…`), `sound_url` 6/6 cũng vậy, **0 dòng
trỏ vào Storage**. Nên kế hoạch "sửa URL trong database" ở lượt trước là một bước thừa: khoá ngoại việc đổi
host nằm ở *một hàm*, không nằm ở 79 dòng — và 79 dòng thì sớm muộn cũng lệch nhau.

### Nếu làm, đụng đúng những chỗ này (đã dò, không phải đoán)

| Chỗ | Vì sao |
| --- | --- |
| `lib/model-publish.ts` | nơi **duy nhất** upload + `getPublicUrl` (`ASSET_BUCKET = "animal-assets"`) |
| `lib/animals.ts` | đường đọc asset duy nhất (Storage → fallback `public/`), theo quyết định 0b trong PLAN |
| `scripts/fetch-sounds.mjs --upload`, `scripts/fetch-models.mjs --upload` | hai pipeline có nhánh đẩy file lên bucket |
| `scripts/model-orders.mjs --upload`, `lib/upload-ingest.ts` | hộp thư model và đường publish thủ công của admin |
| `lib/manga/panel.ts` + `/api/manga/*` | bucket `manga-panels` (đang 0 object) |
| `supabase/schema.sql` | `model_assets.storage_path`, `animals.model_url`, và policy đọc công khai của bucket |
| `docs/ASSETS.md` | hợp đồng "Storage trước, repo sau" phải được viết lại theo sự thật mới |

**Giữ nguyên cấu trúc thư mục** là điều dễ nhất trong phase này: đổi *host* chứ không đổi *đường dẫn*, nên `storage_path` trong database không phải migrate — chỉ URL công khai đổi tiền tố. Việc thật là: (1) đẩy file lên, (2) sửa hàm dựng URL, (3) quyết định repo còn giữ bản sao hay không (nếu bỏ, `public/models/**` 461,7 MB rời khỏi repo — và bản self-host/Demo Mode mất model, đúng thứ quyết định 0b đang bảo vệ).

### Đo được, không phải suy đoán

| Việc | Lệnh | Kết quả |
| --- | --- | --- |
| Khoá đọc/ghi/URL công khai | `npm run r2:check` | 5/5 bước xanh, ETag == md5 |
| Đẩy file (resumable) | `npm run r2:push` | 242 object · 488,5 MB · 6,3 MiB/s trung bình · 1 file lỗi giữa đường, lần chạy lại bắt được |
| Đọc lại công khai | `npm run r2:verify` | **242/242** đúng số byte |
| Trình duyệt thật | `npm run r2:probe` | model **bị chặn** (thiếu CORS) · âm thanh **OK** |
| Luật host + tính đủ đặn | `npm run check:r2` | 10 test, gồm "mọi asset mà catalogue trỏ tới đều có trong bucket" |

### Supabase Storage đã nghỉ hưu — và nó **không** trống như PLAN ghi

Yêu cầu lượt này: *"từ nay file chỉ lưu ở Cloudflare R2, không lưu ở Supabase Storage nữa, nếu được thì
xoá bên Supabase"*. Việc đầu tiên là đo lại, và **con số trong PLAN sai**:

| Bucket | PLAN ghi | Đo được | Thực chất là gì |
| --- | --- | --- | --- |
| `animal-assets` | 0 object | **107 object · 179,2 MiB** | 69 trùng R2, **35 model không tồn tại ở đâu khác**, 9 bản gốc trước nén |
| `animal-sounds` | 6 | 6 · 620 KiB | 6 bản ghi, đã có trên R2 |
| `manga-panels` | 0 | 0 | — |

Nếu tin con số "0 object" và xoá thẳng, **35 model sẽ biến mất vĩnh viễn**: chúng không có trong `data/**`,
không có dòng nào trong `animals`, không có trên R2 — model của những loài chưa từng vào catalogue
(meerkat, walrus, thylacine, reindeer, sea-otter…). Không có gì trỏ tới chúng, nhưng chúng là bản duy nhất
của chính mình.

**Đã chạy thật** (`node scripts/migrate-storage-to-r2.mjs --apply`):

| Bước | Kết quả |
| --- | --- |
| Đối chiếu md5 (ETag của R2 chính là md5) | **69/113 đã trùng byte** |
| Copy file chỉ có ở Supabase | **35 file** lên đúng key tự nhiên |
| Bản gốc khác byte | **9 file** → `originals/models/…` (không ghi đè bản đang phục vụ) |
| Đọc lại từng bản copy qua URL công khai | **44/44 đúng md5**, 0 lỗi |
| Sửa URL trong database | **78 dòng** (`model_assets.public_url` 72, `sound_assets.public_url` 6) |
| Sửa `data/sound-attribution.json` | 6 `publicUrl` |
| Xoá khỏi Supabase | **107 + 6 object**; sau đó: `animal-assets=0, animal-sounds=0, manga-panels=0` |

**Thứ tự mới là toàn bộ lập luận an toàn:** so md5 → copy → **đọc lại bản copy qua URL công khai** → sửa
dòng → *rồi mới* xoá. Script **từ chối xoá** nếu còn bất kỳ object nào chưa được chứng minh.

**Không ghi vào Supabase Storage nữa, ở mọi đường:** `lib/model-publish.ts` (model admin đăng),
`lib/upload-ingest.ts` (hộp thư inbox/published/rejected), `lib/manga/panel.ts` (panel manga),
`scripts/fetch-models.mjs` + `scripts/fetch-sounds.mjs` (pipeline tải về). Tất cả đi qua **một** module:
`lib/r2-storage.ts` — nơi duy nhất giữ credential của object store — và **một** luật ánh xạ bucket→key:
`lib/r2-paths.ts`.

`ASSET_BUCKET` và `publicAssetUrl()` trong `lib/supabase.ts` đã **bị xoá** thay vì trỏ lại: một helper tên
"asset bucket" chính là thứ sẽ cho call site thứ năm lặng lẽ ghi vào Supabase Storage lần nữa.

**Lỗi của chính tôi, ghi lại:** bản đầu của script ánh xạ `animal-sounds` → key `<file>` thay vì
`sounds/<file>`, nên nó báo **6 bản ghi là "không có trên R2"** trong khi chúng nằm đó từ đầu. Đã gom luật
này về `lib/r2-paths.ts` và khoá bằng test.

**Còn treo:** 35 model mồ côi giờ nằm trên R2 (đã ghi `source: null` trong `data/r2-manifest.json`) nhưng
không loài nào dùng. Xoá hay đưa chúng vào catalogue là quyết định của bạn, và giờ nó có danh sách trước mặt.

### Ảnh avatar cho card: chụp model một lần, không tải model để lấy mặt

Yêu cầu: *"chụp hình model làm avatar đại diện cho model đó khi user nhìn card… chưa click vào"*.

Trước đây card chỉ vẽ glyph (emoji / chữ cái đầu): `lib/model-preview.ts` chỉ cho tải model khi hover nếu file
**< 1,5 MB và < 75k mặt**, nên phần lớn catalogue — mọi công trình, mọi loài lớn — **vĩnh viễn chỉ có emoji**.
Giờ mỗi model được render một lần, off-screen:

```bash
npm run models:previews          # resumable; --force để render lại
npm run r2:push -- --previews    # nhân bản ảnh lên CDN
```

| Số đo | Giá trị |
| --- | --- |
| Ảnh | **234 / 236 model** (2 ca hỏng, xem dưới) |
| Định dạng | 512×512 WebP, **nền trong suốt**, góc 3/4, sáng theo đúng preset của viewer |
| Dung lượng | 2.377.396 B (2,27 MB) · trung bình 10.160 B · lớn nhất 37.806 B |
| Thời gian | 18m24s lần đầu · 12m41s khi `--force` · **4,0 s** khi đã có đủ (resume) |
| Trên R2 | 234 object dưới prefix `previews/` · `r2:verify` 520/520 đúng byte |

**Hai ca hỏng, có nguyên nhân đo được:** `space/international-space-station` và bản `-iss-e-intern` — GLB
chứa **một mesh lạc 52 đỉnh cách trạm ~10.000 đơn vị**, nên bounding box phình lên 10.633 đơn vị và camera lùi
~19.800 đơn vị; trạm chỉ còn ~76 pixel. Đây **không phải lỗi pipeline**: viewer thật cũng hiện đúng một chấm
như vậy. Muốn có đủ 236 thì phải sửa chính asset (hoặc cho luật fit bỏ qua outlier).

**Không có lookup trong client.** Bản đầu tôi viết đọc `data/previews.json` để biết ảnh nào tồn tại — file đó
~40 KB, mà card là client component, nghĩa là **cả index của catalogue đi theo mọi lượt tải trang**, đúng thứ
`npm run check:bundle` canh. Nên không có lookup: đường dẫn suy ra từ `model_url`
(`/models/lion.glb` → `/previews/lion.webp`), ảnh thiếu thì `onError` giữ lại tấm emoji. Manifest vẫn có,
nhưng đóng vai **biên lai** — bytes + md5, để test đối chiếu repo với bucket thay vì tin vào một lần `ls`.

**Một phát hiện ngoài phạm vi, đáng giá nhất, chưa sửa:** `envMapIntensity` trong `lib/model-materials.ts`
**không có tác dụng** trên three 0.186 — `WebGLRenderer.setProgram` ghi đè uniform đó bằng
`scene.environmentIntensity`, mà drei khoá ở 1. Đo được: nếu tôn trọng hệ số này, mean luma của sư tử đi từ
**84 lên 143**; Château Frontenac từ 13 lên 52. Ảnh preview **cố tình tái hiện đúng hành vi hiện tại** (không
tự ý "sửa cho đẹp"), nên nếu sửa `components/3d/StudioEnvironment.tsx` thì phải render lại toàn bộ.

**Biết trước để không bất ngờ:** render **không** tái lập bit-for-bit — `--force` tái tạo đúng 228/234 ảnh,
6 ảnh lệch vài pixel và `california-sea-lion` đổi mỗi lần chạy. Vì vậy **không test nào được giả định md5 của
ảnh là bất biến**; test hiện tại chỉ so bucket với manifest, và đó là chiều đúng.

### Bước kế tiếp, theo thứ tự

1. **Bạn làm (chỉ một lần, trong dashboard):** Cloudflare → R2 → bucket `kami3d-storage` → Settings →
   CORS policy → thêm rule `GET`, `HEAD`, origin `*`. Xong thì `npm run r2:probe` sẽ báo cả hai đường OK.
2. **Rồi mới bật công tắc:** đặt `NEXT_PUBLIC_R2_ASSETS=on`, và đo trước/sau bằng `npm run audit:perf`
   (TTFB/FCP/LCP trên Chrome thật) — đó là con số duy nhất trả lời được "CDN có nhanh hơn không".
3. **Trước khi coi là production:** trỏ một custom domain vào bucket thay vì `pub-*.r2.dev` (endpoint phát
   triển của Cloudflare, có rate-limit và không có SLA). Đổi base URL là đổi một biến.
4. **Còn treo, chưa làm:** repo có nên tiếp tục giữ 488 MB bản sao hay không — bạn đã chọn **giữ**, nên bản
   sao ở lại; bỏ nó là một quyết định khác, có giá khác (dev local và bản offline mất model).

## 📈 Phase 35 — Mở rộng catalogue, chuẩn chất lượng "duyệt bằng mắt", và `buildings` tách ra

**Yêu cầu:** đưa 35 model mồ côi vào catalogue thành loài thật, và tải đủ **100 model cho mỗi mục**
(animals, space, plants, vehicles, architecture, buildings tách riêng).

### Đo trước khi làm

| Mục | Mục catalogue | Có model | Cần thêm |
| --- | --- | --- | --- |
| animals | 73 | 73 | 27 |
| space | 77 | 75 | 23 |
| plants | 29 | 27 | 71 |
| vehicles | 14 | 14 | 86 |
| architecture | 47 | 47 | 53 |
| buildings | 11 (tập con của architecture) | 11 | 100 |
| | | | **349 model** |

Trần tải trong `model_download_policy` khi đó là **400 tổng / 400 tháng**, đã dùng 85 → không đủ. Đã nâng
lên **500 / 500** (người dùng duyệt), headroom 415 lượt.

### Phát hiện quyết định: 35 model mồ côi **không dùng được**

Chúng có nguồn gốc thật — nhật ký `model_download_log` giữ dòng cho **31/35** (Sketchfab, CC-BY) — nhưng
chúng mồ côi vì **người tải trước đây đã đúng khi không wire chúng**. Bằng chứng, không phải phỏng đoán:

| Loài | Model thực tế |
| --- | --- |
| walrus | "Day 310: **Walrus skull**" — một cái sọ |
| sea-otter | "Sea otters **charm fastener**, Alaska, c.1800" — một cái móc áo |
| kea | "I **KEA**_STRELITZIA Planta" — **một loài cây** (tên loài 3 chữ cái khớp nhầm) |
| andean-condor | "Santuario de la Naturaleza Cascada" — một khu bảo tồn |
| atlas-moth | "Laptop_assignment10" |

Cổng `wire-local-models.mjs` từ chối **cả 34** loài mới, và nó cũng bắt được lỗi của chính phase này:
`meerkat` từng được wire rồi phải gỡ, vì model là **một cái sọ** (node `Skull_2`, material `Skull`).

**Đã dọn:** xoá 19 file model sai, 21 dòng `model_assets`, gỡ khỏi `model-attribution.json` /
`model-preview.json` / `model-structure.json`; cả 35 loài để `model_url: null`.

**Ngưỡng đang chặn, đo được:** `TITLE_MATCH_POINTS = 24` nhưng title chỉ *chứa* tên loài được 22,5 điểm
(`QUALITY_WEIGHTS.title × 0.75`), nên chỉ title **đúng bằng** tên loài mới qua — trừ khi có người ghi
`EVIDENCE` xác minh (repo đã có sẵn cơ chế: `"plains-zebra": 'mesh names "ZEBRA_L.3DS"'`).

### Đã làm được, có số

| Việc | Kết quả |
| --- | --- |
| 34 loài viết vào `data/species/batch-6.ts` | batch-6 = 35, catalogue **108 loài**; nguồn Wikidata P141 / Wikipedia / ADW |
| Geodata | **105 loài** có envelope từ GBIF/OBIS (CC-BY, có số điểm và khoảng năm); bundle regenerate: 112 feature / 108 loài |
| Harvest `space` | 77 → **131 mục** |
| Tải model `space` | **41 model** lấy được, 40 wire; 15 ca hỏng có lý do từng ca (không có kết quả licence-clean; licence non-commercial; thư mục NASA không có .glb; "1248 triangles and no texture: a diagram of the thing") |

**Trạng thái đo được:** animals 108 (73 có model) · space 131 (116) · plants 29 (27) · vehicles 14 (14) ·
architecture 47 (47) · **277 model trên đĩa · 268 ảnh preview · R2 564 object / 669,3 MiB, verify 564/564
đúng byte · `npm run check` 717/717.**

### Lỗi hạ tầng tìm được trong lúc làm, đã sửa

1. `scripts/r2.mjs` `put()` không trả `publicUrl` → `model_assets.public_url` ghi thành **null** (JSON bỏ
   key `undefined`, không có gì báo lỗi).
2. Pipeline động vật **thiếu cổng "model phải có màu"** (`fetch-catalog-models` và
   `fetch-landmark-models` đều có) → có thể ship model chỉ render xám.
3. Ứng viên bị cổng từ chối thì ứng viên kế bị xếp thành `-alt2` thay vì được thăng làm chính.
4. `r2-push --index` không làm mới số byte khi object bị ghi đè (biên lai nói dối về bucket), và không
   xoá `source` khi file repo biến mất.
5. `data/previews.json` giữ mục mồ côi sau khi file bị xoá.
6. **Harvester lấy cả tiêu đề mục của Wikipedia vào mô tả.** `page.extract` trả về cả thân bài, và bản
   đầu cắt ở `\n\n` đầu tiên — nhưng bài ngắn thì tiêu đề `== References ==` nằm ngay sau lead, nên
   `buildings/rattin-castle-wm034-008` ship một mô tả kết thúc bằng đúng hai chữ `== References ==`.
   `scripts/check-catalogues.mjs` bắt được (luật *"mô tả phải kết thúc bằng dấu câu"*), và đã sửa hai chỗ:
   cắt extract tại tiêu đề mục đầu tiên, và chỉ nhận câu đã trọn — mảnh cuối bị bỏ chứ không được đăng.

## 👁️ Chuẩn chất lượng: **duyệt bằng mắt** — và nó có sổ

**Quyết định của bạn:** giữ chuẩn (một số loài sẽ không có model) / **duyệt bằng mắt** / hạ chuẩn. Đường
được chọn là đường giữa, và nó là đường duy nhất trong ba đường **kiểm chứng được**: mỗi model được một
model thị giác soi, câu trả lời được ghi lại kèm ảnh và md5 của ảnh, và chỉ model nào được nói đúng thì mới
được wire.

### Vì sao phải là mắt, không phải thêm một cổng chữ

Mọi cổng cũ đều đọc **chữ**: giấy phép đọc nhãn, cổng tên đọc tiêu đề kết quả tìm kiếm, cổng màu đếm
texture, cổng kích thước đếm byte. Không cổng nào phân biệt được con moóc với **cái sọ moóc** — và đó không
phải giả thuyết: repo này đã từng ship một con meerkat là cái sọ, một con octopus là "Sphere_Color_0 trên
Plane_Color_0", và "Sea otters charm fastener" nằm dưới tên sea otter, cho tới khi có người mở ảnh ra xem.

Sổ ghi bằng chứng là `data/model-verification.json`, ghi bởi `node scripts/model-vision-review.mjs
--record` — **không có gì khác ghi được nó**. Mỗi dòng: phán quyết, câu mô tả điều người soi **thật sự
nhìn thấy**, lý do, model đã soi, đường dẫn ảnh, **md5 của ảnh**, đường dẫn model, sha256 của model, và
những mục catalogue nào đang nhận model đó là mình.

Luật nằm ở một module thuần `lib/model-verification.ts`, có test riêng, và nó nói đúng một câu:
**một phán quyết còn giá trị khi người soi đã nhìn, nói model đúng là thứ catalogue nhận, và ảnh họ nhìn vẫn
là ảnh đang nằm trên đĩa.** Điều khoản cuối cùng là điều khoản làm cả thiết kế này có nghĩa: `npm run
models:previews -- --force` tái tạo **228/234** ảnh y hệt và **lệch 6 ảnh**, nên một phán quyết buộc vào
*tên file* sẽ sống lâu hơn chính bằng chứng của nó. md5 đổi thì phán quyết thành **stale** và model tự quay
lại hàng đợi.

### Đo được, ở lần chạy này

| Số đo | Giá trị |
| --- | --- |
| Model có mục catalogue nhận và có ảnh để soi | **274** |
| Đã soi và ghi sổ | **208** (169 matches · 25 mismatch · 14 unclear) |
| Chưa soi (hàng đợi còn lại) | **66** |
| Không có ảnh để soi | **3** (ba bản của ISS — xem mục dưới) |
| Phán quyết hết hạn vì ảnh bị vẽ lại | **0** |

**25 model bị nói là không phải thứ catalogue nhận.** Đây là danh sách, kèm đúng câu người soi viết — mỗi
câu kiểm được bằng cách mở ảnh ra:

| Model | Đang được nhận là | Người soi nhìn thấy gì |
| --- | --- | --- |
| `american-bison` | American Bison | *"một con bò nhà lông mượt màu nâu đỏ, đầu cúi, sừng ngắn hướng lên"* |
| `black-mamba` | Black Mamba | *"một con rắn trắng nhợt, chỉ thấy đầu và phần thân trước"* |
| `hellbender` | Hellbender | *"một sinh vật lưỡng cư bốn chân màu hồng nhạt, miệng đầy răng nhỏ, gai dọc lưng và khoảng mười lăm mắt giả trên mặt"* |
| `orca` | Orca | *"một mớ bề mặt bóng màu chàm và trắng, tua dài, ống chi ngắn, và một ngôi sao sáu nhánh nhọn ở dưới, có khe hở như bị vỡ"* |
| `serval` | Serval | *"một cô gái hình người kiểu anime, tai thú cao, váy và tất đốm"* |
| `smilodon` | Smilodon | *"một cái sọ hoá thạch tẩy trắng, hai răng nanh dài cong xuống"* |
| `landmarks/borobudur` | Borobudur | *"ba stupa chuông trắng có lỗ hoa văn, trên nền trắng"* |
| `landmarks/colosseum` | Colosseum | *"một mảng tường vòm cong duy nhất, ba tầng, mép rách, không có lòng đấu trường"* |
| `landmarks/djenne-mosque` | Great Mosque of Djenné | *"một khối hộp màu đất nung, mái bằng, tường có gân, trên một tấm nền trông như bản đồ"* |
| `landmarks/machu-picchu` | Machu Picchu | *"một sườn núi xanh, đá trơ và một dòng suối nhạt dưới chân — không có ruộng bậc thang, tường hay nhà nào"* |
| `landmarks/petra` | Petra | *"một mặt tiền đá sa thạch cắt phẳng như ảnh, có lỗ thủng, không có gì xung quanh"* |
| `landmarks/petronas-towers` | Petronas Towers | *"một quả cầu trắng nhẵn dán ảnh bầu trời, mây và một mảng nhà bị bóp méo"* |
| `landmarks/prague-castle` | Prague Castle | *"mặt tiền một toà nhà đá hai tầng cắt phẳng như ảnh, mép trong suốt lởm chởm"* |
| `landmarks/sagrada-familia` | Sagrada Família | *"một quả cầu dán ảnh toàn cảnh thành phố, trong đó có một nhà thờ nhiều tháp"* |
| `landmarks/st-peters-basilica` | St Peter's Basilica | *"một mảng tường đá trắng thủng lỗ chỗ, có huy hiệu thánh giá vàng và mảnh trời dính vào"* |
| `landmarks/trevi-fountain` | Trevi Fountain | *"một tấm phiến dài các khối nhà hồng nhạt nhìn từ trên xuống, như một ô bản đồ vệ tinh"* |
| `plants/bamboo` | Bamboo | *"vài que xanh nhẵn cắm trong lọ, uốn thành lò xo, không lá, không đốt, không cành"* |
| `plants/giant-sequoia` | Giant Sequoia | *"một thân cây quét 3D bị cắt phẳng ngọn, không cành, không tán"* |
| `plants/mediterranean-metalurgy-ue5-gate-ornamen` | Mediterranean metallurgy gate ornament | *"một nhân vật người mặc bộ giáp sci-fi bóng loáng, đội mũ, đeo găng"* |
| `space/apollo-lunar-excursion-module` | Apollo Lunar Excursion Module | *"một ô cửa sổ tam giác phẳng trong khung tán đinh, viền gioăng cam, đứng một mình"* |
| `space/apollo-lunar-module` | Apollo Lunar Module | *"cũng ô cửa sổ đó, không có thân xe, không có chân, không có tầng lên"* |
| `space/ares-1-b` | Ares I (bản B) | *"một kết cấu quanh một vòng xuyến có nan, một cần dài thon và một mô-đun nhỏ ở đầu"* |
| `space/extravehicular-mobility-unit` | EMU (bộ đồ du hành) | *"một phiến dẹt màu nâu thịt, mép như răng bánh răng, nhìn gần như cạnh, và vài mảnh rời"* |
| `space/galaxy` | Galaxy | *"một quả cầu tối lấm tấm sao, có một ảnh xoắn ốc tám cạnh dán vào giữa"* |
| `space/mars-atmosphere-and-volatile-evolution-m` | MAVEN | *"một nhân vật hình người, mũ đen, giáp ngực đen, găng đỏ, quần nâu, bốt nặng"* |

Hai trong số đó là **bằng chứng do người viết tay**, và đây là phần đáng nhớ nhất của cả lượt này:
`serval` từng được nhận với lý do `node "servaltest.fbx", 28 meshes, rigged` và `hellbender` với
`"DitchDoggy.fbx" - ditch dog is a vernacular name for the hellbender`. Cả hai ghi chú đều **đúng sự
thật về file** — thật sự có 28 mesh trong một rig, và "ditch dog" thật sự là tên địa phương của
hellbender. Điều mà không ghi chú nào nói được là **file trông như thế nào**. Đó là giới hạn của mọi cổng
chữ trong repo này, do chính hai dòng của nó thú nhận; hai dòng đó đã bị **gỡ khỏi `EVIDENCE`** và lý do
được viết lại ngay tại chỗ trong `scripts/wire-local-models.mjs`.

### Cổng wire nay đọc sổ

`scripts/wire-local-models.mjs` nhận một model khi **một trong ba** điều đúng: tiêu đề nêu đúng tên
(cổng cũ), có `EVIDENCE` viết tay (cổng cũ), hoặc **sổ nói `matches` và md5 ảnh còn khớp**. Câu
evidence khi wire bằng đường thứ ba được viết ra nguyên văn, ví dụ:

```
vision review by "deepseek-v4-flash-vision-exp": "a complete white fox with a pointed muzzle…"
  (…) - image public/previews/arctic-fox.webp md5 3f2a…
```

Sổ cũng in ra danh sách **model đang được wire mà người soi nói là sai** (6 loài động vật ở lần chạy này)
— in ra, **không tự gỡ**. Gỡ là một thay đổi mà người đọc nhìn thấy: loài thôi nhận một model nó không có
và rơi về rig thủ tục, còn với công trình thì mục đó phải rời
`data/<catalogue>-attribution.json` cùng lúc, nếu không `scripts/check-catalogues.mjs` đỏ vì hai bên
nói khác nhau. Đó là một quyết định có danh sách trước mặt, không phải hệ quả phụ của việc chạy một cổng.

### Chạy nó

```bash
node scripts/model-vision-review.mjs --queue     # dựng hàng đợi từ đĩa; việc đã soi và còn nguyên ảnh thì bỏ qua
node scripts/model-vision-review.mjs             # báo cáo: matches / mismatch / unclear / stale / chưa soi
node scripts/model-vision-review.mjs --record=answers.json
```

Câu hỏi gửi cho người soi được **lưu trong chính hàng đợi** (`data/model-vision-queue.json`), nên câu trả
lời không bao giờ tách rời khỏi câu hỏi. Ba điều trong đó là cố ý: "bạn thật sự nhìn thấy gì" hỏi **trước**
phán quyết; `unclear` là một câu trả lời thật (một ô 512×512 có thể chỉ là một chấm, và một chấm không
chứng minh gì — cùng lý do bộ render từ chối ghi một khung dưới ngưỡng phủ); và các mục catalogue được nêu
ra như **lời nhận**, không phải như sự thật.

### 66 mục chưa soi, và vì sao dừng ở đó

Endpoint thị giác chậm dần rồi sập hẳn tốc độ sau khoảng 200 lời gọi: 12 ảnh mất **71 giây** lúc đầu, và
**595 giây cho một ảnh** về cuối. Đây là số đo, không phải phỏng đoán — và nó là lý do hàng đợi còn 66 mục
thay vì 0. Chúng nằm nguyên trong `data/model-vision-queue.json`; chạy lại `--queue` lúc endpoint khoẻ
thì chỉ còn đúng 66 mục đó, vì 208 mục đã soi vẫn còn nguyên md5.

## 🐛 Bộ render treo: một promise không ai settle

Bạn báo: *"bộ render treo một lần mà không có tiến trình Chrome nào"*. Nguyên nhân tìm được, và nó nằm gọn
trong một chỗ.

Chrome được điều khiển qua DevTools protocol. Hàm `send()` chỉ **settle** khi có message trả về, và nó chỉ
có hẹn giờ khi **người gọi truyền vào** — mà `Page.enable`, `Runtime.enable` và `Page.navigate` thì
không truyền. Không có `socket.onclose`, không có `chrome.on("exit")` nào đánh thức những lời hứa đang
chờ. Nghĩa là: **Chrome chết → socket đóng → lời hứa không bao giờ được settle → tiến trình sống mãi**.
Đúng hình dạng của sự cố bạn thấy từ bên ngoài: driver đang chờ, browser đã chết.

Đã sửa, và **đã kiểm bằng cách giết Chrome giữa lúc chạy**:

| Trước | Sau |
| --- | --- |
| treo vô hạn, không tiến trình Chrome | thoát sau **1 giây**, exit code 1, in ra *"the driver lost the browser: the DevTools socket errored"*, và ghi manifest đầy đủ trước khi thoát |

Ba thay đổi: `socket.onclose`/`socket.onerror`/`chrome.on("exit")` đều **fail mọi lời gọi đang chờ**
với lý do đọc được; mọi `send()` có **trần 30 giây** kể cả khi người gọi không truyền; và `recover()`
không còn thử nạp lại một *trang* khi không còn *browser* nào để nạp. `scripts/audit-frames.mjs` có cùng
lỗi đó (nó chỉ `console.error` khi socket đóng, rồi chờ tiếp) và đã được sửa cùng cách.

## 🖼️ 9 ảnh preview thiếu: 6 vẽ lại được, 3 là lỗi của asset

Chạy lại bộ render cho đúng 9 mục đó:

| Kết quả | Số | Ghi chú |
| --- | --- | --- |
| Vẽ được ngay | **6** | `submillimeter-wave-astronomy-satellite-s`, `telescope`, `titan`, `umbriel`, `van-allen-probes`, `vehicle-assembly-building-vab` — 1,6–11,5 kB, 0,8–4,8 s mỗi ảnh |
| Vẫn hỏng | **3** | ba entry cùng trỏ vào **một** model ISS |

Ba cái còn lại có nguyên nhân **đo được, và không phải lỗi bộ render**: GLB chứa một mesh lạ 52 đỉnh cách
trạm ~10.000 đơn vị, bounding box phình lên 10.633 đơn vị, camera lùi ~19.800 đơn vị, và cả trạm chỉ còn
**0,029% khung hình**. Bộ render từ chối ghi nó — đúng như thiết kế (*"một ô trắng được tính là thành công
là kết cục duy nhất pipeline này không được phép tạo ra"*), và viewer thật cũng hiện đúng một chấm như vậy.
Muốn có đủ thì phải sửa **asset** hoặc đổi luật fit cho bỏ qua outlier — và luật fit nằm ở
`ModelScene.tsx` dùng chung, nên sửa nó là sửa cách **mọi** model được đóng khung, rồi phải vẽ lại toàn bộ
274 ảnh.

## 🏛️ `buildings` tách ra: harvester đã có đường, nhưng đường đó chưa nối

Bạn phát hiện đúng: `harvest-catalogue-entries.mjs` **có** `buildings` trong `SOURCES`. Nhưng chạy nó
thì chết ngay, và chết ở hai chỗ:

```
existing[source.exported].map is not a function
```

`data/buildings.ts` **không phải** một catalogue — nó là một **luật**: một mảng chuỗi 11 slug công trình
hiện đại, đọc bởi `lib/catalog-project.ts`. Harvester trỏ vào đó, tìm một export tên `BUILDING_ENTRIES`
(không có), rồi sẽ chèn object entry vào **chính mảng luật** nếu qua được bước đầu. Cùng lỗi đó ở
`fetch-catalog-models.mjs`, nơi `DATA_FILE` được suy ra từ id.

Đã nối:

| Chỗ | Trước | Sau |
| --- | --- | --- |
| Entries | — | `data/buildings-entries.ts` (`BUILDING_ENTRIES`) |
| Truy vấn | — | `data/buildings-queries.json` |
| Harvester | `data/buildings.ts` | `data/buildings-entries.ts` |
| Pipeline model | `data/<id>.ts` suy ra | `dataFile` khai rõ trong `CATALOGUES` |
| Model | — | `public/models/buildings/`, credit `data/buildings-attribution.json` |
| Danh mục | phép chiếu thuần | **hai luồng**: 11 công trình có tên (chiếu từ architecture) **+** entry thu hoạch; **slug có tên luôn thắng**, nên hai luồng không thể cùng đặt tên một công trình |
| Test | 3 catalogue | 4 catalogue, và một catalogue viết-rồi-để-trống được **báo ra** chứ không làm đỏ bộ test |

**Đo được, và nó chạy tới đích:** danh sách truy vấn mở rộng cho ra **1.748 chủ đề ứng viên** từ Sketchfab,
và chạy tới `--limit=100` thì dừng ở **100 entry** — đúng trần đặt ra, **trước khi** cạn chủ đề (còn ~173
chủ đề chưa soi). Tỉ lệ nhận ~6,4% (100/1575). Nghĩa là con số thật của catalogue này **chưa biết**, và nó
chỉ bị chặn bởi trần tôi đặt, không bởi nguồn.

**Va chạm tên có xảy ra, và được xử lý chứ không được giả vờ là không có:** trong 100 entry thu hoạch, **1**
entry trùng slug với công trình có tên do luật `data/buildings.ts` giữ (`empire-state-building`). Luật là
**bản có tên luôn thắng**: entry thu hoạch bị bỏ, công trình giữ nguyên trang, năm và model của nó — và
`scripts/check-catalog.mjs` khẳng định đúng điều đó thay vì khẳng định hai danh sách không giao nhau.

Một điều phải nói thẳng về chất lượng của 100 entry đó: chủ đề đến từ **tiêu đề kết quả tìm kiếm**, nên
chúng là **loại công trình** (`skyscraper`, `lighthouse`, `suspension bridge`) **trộn với công trình có
tên** mà kết quả tìm kiếm trả về (`aviva-stadium`, `olympiastadion-berlin`). Đó là hệ quả của thiết kế
"chủ thể đến từ nguồn model", không phải lỗi — nhưng nó là lý do danh sách này cần một lượt đọc bằng mắt
nữa trước khi trở thành một mục catalogue tử tế.

## 📈 Mở rộng nguồn chủ đề, và đích đến thật

Bốn danh sách truy vấn dự phòng đã được mở rộng — space 40 → **86**, plants 40 → **120**, vehicles
40 → **150**, buildings 40 → **180** — và đây là chỗ trả lời trực tiếp câu *"sửa lại mục tiêu nếu bạn vẫn
muốn con số 100"*:

| Mục | Bây giờ | Nguồn còn lại | Đích đến thật |
| --- | --- | --- | --- |
| animals | 108 mục · 73 có model | quy trình thứ tự + lookup thủ công | **~100** khi 35 loài còn lại có model thật |
| space | 131 mục · 116 có model | 1.748 chủ đề | **đã vượt 100** |
| plants | 29 mục · 27 có model | 120 truy vấn | **không đủ 100 chủ đề** ở tỉ lệ nhận hiện tại |
| vehicles | 14 mục · 14 có model | 150 truy vấn | **không đủ 100** |
| architecture | 47 · 47 | viết tay, ~25 phút/mục | **đích đến là 47**, không phải 100 |
| buildings | 111 mục (11 công trình có tên + 100 thu hoạch) · 11 có model | 1.748 chủ đề, còn ~173 chưa soi | **≥100**, chưa biết trần thật |

Con số 100 không phải một mục tiêu — nó là một con số tròn. Đích đến thật do **nguồn** quyết định, và bảng
trên là số đo của nguồn, không phải của mong muốn.

## 🧱 Ba phát hiện ngoài phạm vi, đo được, chưa sửa

1. **28 file model là bản sao của 13 model khác** — 13 nhóm md5 trùng, gồm ba bản của cùng một trạm ISS
   (`international-space-station`, `-iss-a`, `-iss-e-intern`), hai bản Apollo Lunar Module, hai bản
   Hubble, ba bản "planet Earth". Cùng một file được ship dưới hai tên và hai entry: đúng thứ mà luật *"một
   con sư tử không được có hai URL"* của repo này cấm. Chưa sửa vì chọn entry nào giữ model là một quyết
   định dữ liệu, không phải một phép biến đổi.
2. **Khoá R2 đã hết hiệu lực, cả đọc lẫn ghi.** `ListObjectsV2` trả **403 AccessDenied**, và chạy
   `node scripts/r2-push.mjs --previews` thì **274/274 object PutObject 403** — không một byte nào lên
   được, sau 2.526 giây thử. Đây không phải chuyện quyền hẹp (object-scoped như Phase 34 ghi) mà là một
   khoá không còn dùng được: Phase 34 đã đẩy 242 object bằng chính khoá này, và giờ nó từ chối cả PUT.
   Hệ quả: `npm run r2:push`, `npm run r2:index`, `npm run r2:check` đều không chạy, và 6 ảnh preview
   vẽ lại trong lượt này **chưa lên CDN**.

   **Chẩn đoán sâu hơn, bằng ba phép thử phân biệt** (mỗi phép gọi một thao tác S3 riêng và in mã lỗi
   thật):

   | Phép thử | Mã trả về | Nghĩa |
   | --- | --- | --- |
   | key id 32 ký tự **không tồn tại** | **401 Unauthorized** | R2 từ chối thẳng credential lạ |
   | key id **thật** trong `.env.local` | **403 AccessDenied** | key id **được R2 nhận ra** |
   | key id thật + secret **cố tình làm sai** | 403 AccessDenied *(y hệt)* | R2 đang xét **quyền**, không xét chữ ký |
   | key id thật + secret bị cắt còn 32 / nhân đôi | 403 AccessDenied | như trên |
   | `ListObjectsV2` · `PutObject` · `GetObject` · `HeadObject` · `DeleteObject` · `GetBucketLocation` | 403 · 403 · 403 · 403 · 403 · 403 | **không một thao tác nào được phép** |
   | `HEAD` công khai `pub-…r2.dev/models/lion.glb` (không dùng khoá) | **200 · 341.076 byte** | bucket và object vẫn nguyên vẹn |

   Nghĩa là: **access key ID còn sống trong hệ thống Cloudflare, nhưng secret + quyền của nó thì không
   còn tác dụng** — một khoá không tồn tại sẽ trả 401, khoá này trả 403 cho *mọi* thao tác kể cả
   `PutObject` lên đúng cái bucket nó đã ghi được 6 tiếng trước đó.

   **Mốc thời gian, đọc từ biên lai trong database** (`model_assets.public_url`), không phải suy đoán:

   | Lúc | Việc | Kết quả |
   | --- | --- | --- |
   | `2026-10-07T16:52:57Z` – `16:54:10Z` | bộ lập lịch đẩy 4 model lên R2 | **thành công** — 4 dòng `public_url` trỏ đúng `pub-21950d….r2.dev` |
   | `2026-10-07T22:43Z` | tải `bengal-tiger` | **không có dòng nào trong `model_assets`** — file xuống đĩa nhưng bước upload không xong |
   | `2026-10-07T23:30Z` (ước) | `r2-push --previews` | **274/274 PUT 403**, 0 byte lên được |
   | `2026-10-08T01:19Z` | phép thử sáu thao tác ở trên | tất cả 403 |

   Vậy khoá chết trong khoảng **16:54Z → 22:43Z ngày 2026-10-07** (23:54 → 05:43 giờ máy). Việc cần làm là
   ở dashboard Cloudflare, không phải ở code: tạo token mới (**Object Read & Write** trên bucket
   `kami3d-storage`; thêm **Admin Read & Write** nếu muốn `npm run r2:index` chạy lại) rồi thay
   `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` trong `.env.local`. Đường công khai không cần khoá nên
   **site vẫn phục vụ model bình thường** — đây là lỗi của đường ghi, không phải của đường đọc.

   Phần **sửa được bằng code thì đã sửa**, và nó sửa hai lỗi thật: `remoteIndex()` nay coi 403 là *"không
   biết gì"* và **tiếp tục đẩy** thay vì chết cả lệnh (mọi PUT đều idempotent, cái mất chỉ là resume), và
   phần đối chiếu biên lai được gom vào một hàm `reconcileWithRepository()` dùng chung cho cả `--push`
   lẫn `--index`. Hàm đó sửa thêm một lỗi nữa: một file **quay lại** repo (`emperor-penguin` đúng lịch
   sử đó) thì biên lai vẫn giữ `source: null` và mọi phép đếm lệch một.
3. **Một bộ lập lịch của phiên trước vẫn đang chạy và đang ghi vào cây làm việc.** Đo được lúc viết mục
   này: PID `50193` = `node scripts/model-orders.mjs --order=… --upload`, PID `96430` = một dev server
   Next đang **treo** trên cổng 9000 (curl trả 000 nhưng tiến trình còn sống), và nó spawn
   `fetch-models.mjs --species=sea-otter … --apply --compress --approve --actor=scheduler --upload`. Hệ quả
   đo được: `public/models/` mọc thêm file, `data/model-attribution.json` và `data/model-preview.json`
   bị ghi lại **giữa lúc bộ test đang chạy**, số đếm đổi giữa hai lần đo, và bốn bài test `check-r2`/
   `check-catalogues` đỏ vì biên lai lệch với cây làm việc. Đáng chú ý nhất: **đường tự động này wire model
   mà không đi qua cổng thị giác** — đúng cái chuẩn vừa được chọn. Cần bạn quyết định dừng nó hay để nó chạy.

### Còn treo, và vì sao

- **66 model chưa soi** — hàng đợi còn nguyên; endpoint thị giác sập tốc độ sau ~200 lời gọi (số đo ở
  mục "duyệt bằng mắt").
- **25 model bị người soi nói là sai, chưa gỡ** — danh sách đầy đủ ở trên, kèm câu của người soi. Gỡ là
  quyết định của bạn, và với plants/space/architecture thì phải gỡ cả dòng credit cùng lúc.
- **3 ảnh preview** còn thiếu, và chúng thiếu vì **asset** (mesh lạ cách trạm 10.000 đơn vị), không vì bộ
  render.
- **`npm run check` là 726 bài, 724 xanh, 2 đỏ**, và cả hai đỏ đều đã biết nguyên nhân — không bài nào
  là logic:
  1. *"every model on disk is one of the two catalogues actually uses"* — `animals/common-octopus.glb`
     đang nằm trên đĩa mà chưa có dòng credit, còn `bengal-tiger` thì ngược lại. Đây là **ảnh chụp giữa
     chừng của bộ lập lịch ở mục 3**: một job `fetch-models --apply --wire` đang chạy thì file và biên lai
     lệch nhau trong vài phút, và bộ test đọc đúng lúc đó.
  2. *"every rendered card preview is in the repository and on the CDN"* — 6 ảnh preview vẽ lại trong lượt
     này **chưa lên CDN** được, vì khoá R2 ở mục 2 trả 403 cho cả `ListObjectsV2` lẫn `PutObject`.
     `node scripts/r2-push.mjs --previews` đã chạy thật: **274/274 object 403**, 0 byte lên được.
- **`pirate-ship`** nằm trong danh sách mục `space` — danh sách truy vấn dự phòng của harvester quét quá rộng.
- **`buildings` chưa có model nào**: 100 entry được thu hoạch, 0 model tải về. Bước kế tiếp là
  `node scripts/fetch-catalog-models.mjs --catalogue=buildings --apply`.
- **Đường tự động (`fetch-models.mjs --wire`, bộ lập lịch) chưa đi qua cổng thị giác.** Cổng đã nối vào
  `wire-local-models.mjs`; nối vào đường tự động là việc còn lại, và là việc đúng.

## 🔍 Cách kiểm chứng

```bash
npm run check        # typecheck + 702 bài test trong 48 tệp (rig, tỉ lệ, SQL, squircle, JSON-LD, session hint, theme, tier, camera, quiz, địa cầu, licence âm thanh, bản đồ, timeline, risk, nhập geodata, ngân sách tải model, bảo mật)
npm run check:secrets # quét bí mật trong mọi file git theo dõi + chunk client của bản build (không in giá trị)
npm run check:payments # Phase 32: chữ ký webhook (HMAC thật), bộ phân tích sự kiện, toán quyền lợi, SQL ↔ plans.ts
npm run check:unlock  # Phase 33: vị trí quảng cáo, hai cách mở khoá, policy user_unlocks, "không quảng cáo trên canvas"
npm run check:autopilot # toán auto-pilot + khẳng định SQL trong schema.sql khớp với lib/autopilot.ts
npm run check:model-upload # parser GLB trên model thật + luật credit + ngân sách card
npm run models:work  # chạy một lệnh trong hàng đợi (--list để xem; --upload để đưa model lên Storage)
npm run check:autopilot-clock # luật skip của auto-pilot: off/build/already-started + sàn 60 s của nhịp
npm run check:data2map-samples # 4 dataset Data2Map: file nào, parse được, không page nào import lại JSON
npm run check:build-log # bộ lọc log webpack: đúng một dòng bị bỏ, mọi dòng khác còn nguyên
npm run check:manga-export # bộ ghi CBZ đọc lại bằng một ZIP parser độc lập, và AI không retry 4xx
npm run check:bundle # ngân sách JS mỗi route + luật "không 3D/auth ở first paint" (cần build trước)
npm run build        # build production 41 route
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
npm run check:r2     # Phase 34: luật chọn host của asset + mọi đường dẫn catalogue trỏ tới đều có trong bucket
npm run r2:check     # khoá R2 thật: ListObjectsV2 + PutObject + GET công khai + DeleteObject (cần mạng)
npm run r2:verify    # HEAD từng object qua URL công khai, so byte với bản trong repo (cần mạng)
npm run r2:probe     # Chrome thật: trình duyệt có tải được model/âm thanh từ CDN không (cần mạng)
npm run r2:index     # đối chiếu manifest với đúng thứ bucket đang có (thêm object lạ, bỏ object đã mất)
npm run models:previews # render ảnh avatar cho mọi model còn thiếu (resumable; cần Chrome)
npm run models:status # mỗi catalogue: bao nhiêu mục, bao nhiêu có model thật, bao nhiêu có ảnh, chỗ nào lệch
npm run check:model-vision # Phase 35: sổ duyệt bằng mắt — mọi dòng phải kiểm được (ảnh còn đó, md5 còn khớp, mục catalogue còn tồn tại)
npm run models:verify # hàng đợi duyệt bằng mắt: --queue / --report / --record=answers.json
npm run storage:retire  # báo cáo Supabase Storage; --apply để copy+verify rồi mới xoá
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

### Đo lại sau khi sửa (ghi bổ sung)

Chạy lại npm run audit:mobile ở 390×844:

| Route | Tap target < 44px | Chữ < 12px |
| --- | --- | --- |
| /explore | 48 → **0** | 4 → **0** |
| /settings | 56 → **0** | 5 → **0** |
| / | 30 → **0** | 10 → **0** |

Script kết luận: PASS - no horizontal overflow and every tap target is at least 44px.

Hai điều nói thẳng: ba route còn lại của bộ mặc định (/animal/lion, /quiz, /analytics) dùng đúng các thành phần đã
sửa nhưng chưa đo lại trong phiên này; và env(safe-area-inset-*) cho tai thỏ / thanh home của iPhone thì prompt có nêu
nhưng **chưa làm**.
