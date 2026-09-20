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

**Số liệu hiện tại**

| Hạng mục | Giá trị |
| --- | --- |
| Loài trong bách khoa | **24** (8 vùng, 8 lớp, 4 loài tiền sử) |
| Model 3D thật | **24** file `.glb`, DRACO, tổng **10 MB** (nén từ 61 MB) |
| Route dựng sẵn | **37** (24 trang loài là SSG, `/explore` nay **tĩnh**) |
| Test tự động | **133** bài trong **15** suite (`npm run check:suites`) |
| First Load JS | `/` 132 kB · `/explore` 133 kB · `/quiz` 126 kB · `/animal/[slug]` 129 kB |
| JS khởi đầu mỗi route (gzip, `npm run check:bundle`) | `/` 143.4 · `/explore` 146.5 · `/quiz` 153.3 · `/animal/[slug]` 139.2 kB (ngân sách 165) |
| Bundle 3D | tải **sau** khi trang đã dùng được (cổng CI chặn nếu quay lại first paint) |
| CI | GitHub Actions xanh — typecheck → checks → build mỗi lần push |
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

## 🚧 Việc còn lại

| # | Việc | Ghi chú |
| --- | --- | --- |
| 1 | **Cập nhật `CLERK_SECRET_KEY`** | Key hiện tại trả **403 / code 1010** (đã bị xoay). Lấy key mới ở Clerk Dashboard → API Keys rồi dán vào `.env.local`. **Đây là việc duy nhất đang chặn đăng nhập.** |
| 2 | Test đăng nhập trong trình duyệt | Cần bạn tự làm — mọi bước còn lại đã verify bằng session thật qua API. |
| 3 | 3 model là "đại diện" | `gooty-tarantula` (tarantula Mexican red-knee), `weddell-seal` (seal chung), `emperor-penguin` (chim non) — thay bằng `data/model-sources.json`. |
| 4 | Âm thanh loài (**chặn Mục 5 của Phase 8**) | Chưa có file ghi âm → chế độ "đoán qua tiếng kêu" và nút âm thanh đang tắt. Cần bạn quyết: (a) tôi tự tìm & tải CC0/CC-BY qua pipeline có kiểm licence (~24 file, 2–6 MB, tải theo yêu cầu), hay (b) giữ tắt. Khuyến nghị (b) trước. |
| 5 | File `LICENSE` | Repo public nhưng chưa có license — quyết định của bạn. |
| 6 | Xoay service role key | Đang dùng cho chế độ Clerk; nên xoay định kỳ. |

---

## 🔍 Cách kiểm chứng

```bash
npm run check        # typecheck + 133 bài test trong 15 suite (rig, tỉ lệ, SQL, squircle, JSON-LD, session hint, theme, tier, camera, quiz, địa cầu)
npm run check:bundle # ngân sách JS mỗi route + luật "không 3D/auth ở first paint" (cần build trước)
npm run build        # build production 37 route
npm run db:status    # database đang có bao nhiêu loài
npm run models:report # model nào tải được, kèm license
npm run audit:perf   # Chrome thật: TTFB/FCP/LCP/CLS + byte tải trước và sau `load`
npm run check:theme  # bảng màu sáng/tối: đủ token + độ tương phản WCAG AA
npm run check:camera # toán camera của ModelViewer: preset, bay, xoay, zoom
npm run check:bundle  # sau khi build: ngân sách JS mỗi route + luật "không 3D/auth ở first paint"
npm run audit:theme  # Chrome thật: chữ khó đọc và panel tối sót lại ở theme sáng
npm run check:quiz   # bộ sinh câu hỏi + luật tính điểm của quiz
npm run check:globe  # toán địa cầu: camera bay tới vùng, xếp hạng pin theo vùng
```

> ⚠️ **Đừng chạy `npm run build` khi `npm run dev` đang chạy** — hai tiến trình cùng ghi vào
> `.next` sẽ làm hỏng server dev. Lỗi này đã xảy ra 3 lần trong quá trình phát triển.

---

## 📌 Quyết định thiết kế đáng nhớ

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
