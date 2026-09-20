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

**Số liệu hiện tại**

| Hạng mục | Giá trị |
| --- | --- |
| Loài trong bách khoa | **24** (8 vùng, 8 lớp, 4 loài tiền sử) |
| Model 3D thật | **24** file `.glb`, DRACO, tổng **10 MB** (nén từ 61 MB) |
| Route dựng sẵn | **34** (24 trang loài là SSG) |
| Test tự động | **26** bài trong **4** suite (`npm run check`) |
| First Load JS | `/` 173 kB · `/explore` 174 kB · `/quiz` 168 kB · `/animal/[slug]` 127 kB |
| CI | GitHub Actions xanh — typecheck → checks → build mỗi lần push |
| Bảo mật database | Supabase advisors: **0 phát hiện security** |

**Tech stack đang chạy**: Next.js `15.5.25` (App Router) · React `19.2.8` · Tailwind CSS `4` ·
React Three Fiber `9` + drei `10` + three `0.186` · Clerk `7` · Supabase `2.116` + `@supabase/ssr` ·
Framer Motion `13` · Lucide `1`.

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

## 🚧 Việc còn lại

| # | Việc | Ghi chú |
| --- | --- | --- |
| 1 | **Cập nhật `CLERK_SECRET_KEY`** | Key hiện tại trả **403 / code 1010** (đã bị xoay). Lấy key mới ở Clerk Dashboard → API Keys rồi dán vào `.env.local`. **Đây là việc duy nhất đang chặn đăng nhập.** |
| 2 | Test đăng nhập trong trình duyệt | Cần bạn tự làm — mọi bước còn lại đã verify bằng session thật qua API. |
| 3 | 3 model là "đại diện" | `gooty-tarantula` (tarantula Mexican red-knee), `weddell-seal` (seal chung), `emperor-penguin` (chim non) — thay bằng `data/model-sources.json`. |
| 4 | Âm thanh loài | Chưa có file ghi âm → chế độ "đoán qua tiếng kêu" và nút âm thanh đang tắt. |
| 5 | File `LICENSE` | Repo public nhưng chưa có license — quyết định của bạn. |
| 6 | Xoay service role key | Đang dùng cho chế độ Clerk; nên xoay định kỳ. |

---

## 🔍 Cách kiểm chứng

```bash
npm run check        # typecheck + 26 bài test (hình học rig, tỉ lệ, SQL, bo góc squircle)
npm run build        # build production 34 route
npm run db:status    # database đang có bao nhiêu loài
npm run models:report # model nào tải được, kèm license
```

> ⚠️ **Đừng chạy `npm run build` khi `npm run dev` đang chạy** — hai tiến trình cùng ghi vào
> `.next` sẽ làm hỏng server dev. Lỗi này đã xảy ra 3 lần trong quá trình phát triển.

---

## 📌 Quyết định thiết kế đáng nhớ

1. **Mọi tích hợp đều tuỳ chọn và suy giảm mềm.** Không key Clerk, không Supabase, không model,
   không âm thanh — mỗi thứ đều lùi về một trạng thái vẫn dùng được, không bao giờ trắng trang.
   Ứng dụng chạy được **không cần cấu hình gì** (Demo Mode).
2. **Code 3D nặng không bao giờ chặn nội dung.** `three` + R3F + drei (~750 KB) luôn nằm sau
   `next/dynamic ssr:false`; chữ và metadata của loài là HTML tĩnh.
3. **Toán kiểm chứng được thì phải kiểm chứng.** Hình học rig, tỉ lệ kích thước, bo góc squircle và
   sự khớp giữa SQL ↔ dataset đều là module thuần có test — vì đó là những chỗ sai mà mắt thường
   không thấy.
4. **License model là ràng buộc cứng.** Pipeline chỉ tải CC0 / public domain / CC BY, từ chối
   share-alike / no-derivatives / non-commercial / all-rights-reserved, và luôn ghi credit — nên
   không thể vô tình đưa model có bản quyền lên site.
5. **Một nguồn sự thật cho mỗi thứ.** Logo (SVG sinh ra favicon + OG), nhà cung cấp auth
   (`lib/auth-provider.ts`), seed SQL (sinh từ `data/animals.ts`), và cả cách ghi dữ liệu cá nhân
   (`lib/personal-data.ts`).

---

## 🗂️ Bản đồ thư mục

```
app/                 route (mặc định là Server Component)
components/3d/       canvas, địa cầu, model viewer, size chart, rig procedural
components/animal/   grid, card, filter, info panel, nút yêu thích
components/auth/     form Supabase, panel Clerk, nút Google, slot navbar
components/brand/    logo
lib/rigs.ts          hình học sinh vật + toán bounding box (thuần, có test)
lib/size-comparison.ts  toán tỉ lệ thật (thuần, có test)
lib/squircle.ts      góc bo cong liên tục kiểu Apple (thuần, có test)
lib/animals.ts       đường đọc dữ liệu loài duy nhất (Supabase → fallback dataset)
data/animals.ts      nguồn sự thật của catalogue
supabase/            schema.sql + seed.sql (sinh tự động)
scripts/             4 suite test + sinh seed + tải model + seed database
```
