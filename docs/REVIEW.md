# Review toàn diện Kami3D — Kiến trúc · 3D Performance · Bảo mật Supabase

> **Phase 10.** Báo cáo này review **đúng trạng thái repo** tại commit `13387e5` (sau Phase 9), không phải review
> theo mô tả. Mọi con số đều lấy từ lệnh chạy được: `npm run check:suites` (**155 bài / 16 suite**),
> `npm run check:bundle`, `npm run audit:perf`, `npm run audit:theme`, `pg_policies` trên project thật, và
> `supabase/schema.sql`.
>
> **Cách đọc**: phần 1 là đánh giá thẳng; phần 3 là SQL chạy được ngay; phần 6 là thứ tự thi hành; phần 7 chỉ ra
> chính xác section nào của `PLAN.md` cần sửa.

---

## 1. Tổng quan đánh giá

### Điểm mạnh thật (không phải khẩu hiệu)

| Điểm mạnh | Bằng chứng đo được |
| --- | --- |
| **Nội dung trước, WebGL sau** — thứ khó nhất của một app 3D, và nó đã đúng | JS khởi đầu mỗi route 126–154 kB (gzip); bundle 3D (~250 kB) chỉ bắt đầu tải **sau** `load`; CI có **cổng chặn** (`bundle-budget.mjs`) fail nếu `three`/Clerk/Supabase quay lại first paint |
| **Adapter pattern cho mọi tích hợp** | Supabase/Clerk/ads/3D model đều tuỳ chọn; không key vẫn chạy Demo Mode; `lib/animals.ts` là **một** read path duy nhất, fallback dataset khi DB lỗi |
| **Toán tách khỏi render** | 16 suite thuần Node: rig, tỉ lệ, SQL↔dataset, squircle, JSON-LD, session hint, theme contrast, device tier, camera, quiz, quiz scoring, globe, licence âm thanh |
| **Bảo mật ở tầng dữ liệu, không chỉ ở app** | 5/5 bảng đều bật RLS; **không có policy ghi nào cho `anon`** ở bất kỳ bảng nào; storage cũng chỉ có policy đọc |
| **Trung thực về licence** | Model: allow-list CC0/PD/CC BY + credit bắt buộc. Âm thanh: cùng chính sách, có test khẳng định loài nào phát tiếng thì **phải** có credit |
| **Đo, không đoán** | `audit:perf` (Chrome thật, có throttle), `audit:theme` (12/12 route×theme đạt AA), `check:bundle` (đọc HTML build ra) |

### Điểm yếu & rủi ro lớn nhất (xếp theo mức thiệt hại)

| # | Rủi ro | Vì sao nghiêm trọng | Bằng chứng |
| --- | --- | --- | --- |
| **R1** | **Đường Clerk đi vòng qua RLS bằng service role** | Với Clerk, `auth.uid()` luôn null nên mọi policy `authenticated` đều **deny**; app buộc phải ghi bằng service role và tự lọc `user_id`. Một query quên filter = rò dữ liệu người khác, và không có gì ở tầng DB chặn. Đây là rủi ro số 1 của hệ thống | `lib/personal-data.ts` (`activeAuthProvider() === "clerk" ? admin : server`), comment trong chính file đó thừa nhận "weaker guarantee than RLS" |
| **R2** | **Bộ đếm view có thể bơm** | `/api/views` chỉ chống trùng bằng cookie 6 giờ; không rate limit, không kiểm chứng. Kẻ xấu xoá cookie là tăng lượt xem không giới hạn → bảng xếp hạng sai | `app/api/views/route.ts` |
| **R3** | **Không có error boundary / loading UI ở tầng route** | Một lỗi render ở server component rơi vào trang lỗi mặc định của Next (trắng, không branding, không lối thoát). Không có `app/error.tsx`, `app/global-error.tsx`, `app/loading.tsx` | `ls app/error.tsx` → không tồn tại |
| **R4** | **Kiến trúc dữ liệu là O(N) ở mọi tầng** | `getAllAnimals()` đọc **toàn bộ** bảng mỗi lần render; grid render hết card (không ảo hoá); `generateStaticParams` pre-render mọi loài; sitemap liệt kê mọi URL. Ở 24 loài thì không sao; ở 5.000 loài thì build timeout, RSC payload phình, trang chủ nặng | `lib/animals.ts`, `components/animal/AnimalGrid.tsx`, `app/animal/[slug]/page.tsx` |
| **R5** | **Không có giám sát lỗi** | Không Sentry, không log tập trung, không health endpoint. Lỗi ở production chỉ biết khi người dùng báo | `grep sentry package.json` → rỗng |
| **R6** | **3D chưa có KTX2/meshopt/LOD và GLB không được dispose** | Texture trong GLB là PNG/JPEG giải nén trong VRAM (1024² RGBA ≈ 4 MB mỗi texture); geometry/material của GLB không được `dispose()` khi đổi loài (chỉ rig procedural có) → VRAM phình khi khách xem nhiều loài liên tiếp | `grep -rn "dispose()" components` → chỉ thấy ở `InteractiveGlobe` (texture) và `ProceduralAnimal` |
| **R7** | **Chưa sẵn sàng i18n** | Toàn bộ chuỗi tiếng Anh nằm rải trong JSX (~250 chuỗi); thêm ngôn ngữ sau này là một cuộc refactor lớn, không phải một lần cấu hình | `grep next-intl package.json` → rỗng; `layout.tsx` chỉ có `locale: "en"` |
| **R8** | **Chi phí/egress chưa được kiểm soát bằng số** | Không có ai đó theo dõi egress model (10 MB) + tiếng kêu (0,6 MB) + view; bucket public, cache immutable đã đúng, nhưng chưa có trần hay cảnh báo | `next.config.ts` headers; không có script đo egress |

---

## 2. Đề xuất cải tiến Kiến trúc

1. **Thống nhất một đường ghi dữ liệu cá nhân có RLS thật** — xem §3. Đây là thay đổi kiến trúc quan trọng nhất:
   Clerk cấu hình làm **Third-Party Auth provider** trong Supabase, policy dùng `public.current_user_id()`
   (`auth.uid()` cho Supabase, `auth.jwt()->>'sub'` cho Clerk). Khi đó service role **không còn cần** cho
   favourites/quiz và RLS là hàng rào thật, không phải quy ước.
2. **Thêm tầng lỗi/đang tải ở route**: `app/error.tsx` (client, có nút thử lại), `app/global-error.tsx` (bắt lỗi
   cả root layout), `app/loading.tsx` (skeleton dùng lại `components/ui/skeleton`). Chi phí ~1 giờ, gỡ được R3.
3. **Server Actions cho mutation**: `/api/favorites`, `/api/quiz`, `/api/views` đang là route handler tự viết
   (parse JSON, kiểm kiểu, trả lỗi bằng tay). Server Action + `zod` cho cùng độ an toàn với ít mã hơn, và
   `revalidatePath` thay được việc `router.refresh()` thủ công. *Không bắt buộc*, nhưng là món nợ kỹ thuật rõ.
4. **Đọc catalogue theo nhu cầu**: tách `getAllAnimals()` thành `getAnimalSummaries({ limit, filters })` (chỉ cột
   cần cho card) và `getAnimalBySlug()`. Trang chủ chỉ cần 8 loài nổi bật + số liệu tổng hợp; `/explore` cần
   toàn bộ nhưng chỉ **một lần** và nên được `unstable_cache` theo `revalidate 300` (đã có ISR nhưng chưa cache
   tầng dữ liệu, nên mỗi lần revalidate lại query lại toàn bảng).
5. **Chuẩn bị cho N lớn**: ảo hoá grid (`@tanstack/react-virtual` hoặc đơn giản là phân trang 48 card/trang) và
   chuyển 24 trang loài sang **ISR theo yêu cầu** (`dynamicParams = true` + `revalidate`) thay vì pre-render hết.
   Ở 5.000 loài, `generateStaticParams` hiện tại là build không thể xong.
6. **Giữ Zustand, nhưng biên giới rõ**: 4 store hiện tại đều là state **thuần client** (filter, ui, favourite cache).
   Đúng chỗ dùng. Việc cần làm là một quy ước: store **không** giữ dữ liệu server (đã đúng) và mọi mutation đi qua
   API/Action rồi mới cập nhật store (đã đúng) — viết thành một dòng trong `docs/ARCHITECTURE.md` để không ai phá.
7. **Hợp nhất hai "nguồn asset"**: model nằm trong `public/models` **và** có thể nằm ở Supabase Storage; tiếng kêu
   nằm trong `public/sounds` **và** bucket `animal-sounds`. Hiện tại dataset trỏ đường repo, DB trỏ URL Storage —
   chạy được cả hai nhưng là hai câu trả lời cho một câu hỏi. Nên chốt: **Storage là nguồn duy nhất khi có
   Supabase**, repo chỉ là fallback cho Demo Mode, và ghi rõ thứ tự ưu tiên trong `lib/animals.ts`.

---

## 3. RLS Policies hoàn chỉnh (SQL copy-paste được)

> Trạng thái hiện tại (đọc từ `pg_policies` trên project thật): 8 policy ở `public`, 2 policy đọc ở
> `storage.objects`, **5/5 bảng đều bật RLS**, không có policy ghi nào cho `anon`. Nghĩa là **không có lỗ hổng
> "quên bật RLS"** — vấn đề nằm ở chỗ Clerk đi vòng qua RLS (§1 R1), và ở chỗ thiếu vai trò admin.

### 3.1 Danh tính: một hàm dùng cho cả hai provider

```sql
-- Cho phép policy nói "chủ sở hữu" mà không cần biết visitor đăng nhập bằng Supabase Auth
-- (auth.uid()) hay Clerk (JWT 'sub' do Supabase Third-Party Auth phát hành).
-- Yêu cầu: bật Clerk trong Supabase → Authentication → Third-Party Auth. Nếu chưa bật,
-- auth.jwt() rỗng và hàm trả về auth.uid() như cũ — tức là KHÔNG nới lỏng gì cả.
create or replace function public.current_user_id()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select auth.uid())::text,
    nullif((select auth.jwt()) ->> 'sub', '')
  );
$$;

revoke all on function public.current_user_id() from public;
grant execute on function public.current_user_id() to anon, authenticated;

comment on function public.current_user_id() is
  'Danh tính của người đang gọi, hợp nhất Supabase Auth (auth.uid()) và Clerk (JWT sub). Dùng trong mọi policy sở hữu.';
```

### 3.2 Bảng `animals` — đọc công khai, không ai ghi từ browser

```sql
alter table public.animals enable row level security;

-- Giữ nguyên policy hiện có (đã đúng): ai cũng đọc được, vì danh mục là dữ liệu công khai.
drop policy if exists "animals are publicly readable" on public.animals;
create policy "animals are publicly readable"
  on public.animals for select
  to anon, authenticated
  using (true);

-- KHÔNG tạo policy INSERT/UPDATE/DELETE cho anon/authenticated:
-- việc ghi do seed (service role) và admin (policy dưới) thực hiện.
-- Lượt xem đi qua hàm SECURITY DEFINER hẹp, không cấp UPDATE cho ai:

revoke update on public.animals from anon, authenticated;
grant select on public.animals to anon, authenticated;
```

### 3.3 `user_favorites` — chủ sở hữu, cả hai provider

```sql
alter table public.user_favorites enable row level security;

drop policy if exists "favourites are visible to their owner" on public.user_favorites;
create policy "favourites are visible to their owner"
  on public.user_favorites for select
  to authenticated
  using (user_id = public.current_user_id());

drop policy if exists "favourites are added by their owner" on public.user_favorites;
create policy "favourites are added by their owner"
  on public.user_favorites for insert
  to authenticated
  with check (user_id = public.current_user_id());

drop policy if exists "favourites are removed by their owner" on public.user_favorites;
create policy "favourites are removed by their owner"
  on public.user_favorites for delete
  to authenticated
  using (user_id = public.current_user_id());

-- Không có policy UPDATE: một dòng yêu thích hoặc tồn tại hoặc không.
revoke all on public.user_favorites from anon;
grant select, insert, delete on public.user_favorites to authenticated;
```

> **Lưu ý Clerk**: với Third-Party Auth, Supabase phát JWT mang role `authenticated`, nên các policy trên áp dụng
> nguyên vẹn. Kiểm tra nhanh sau khi bật:
> ```sql
> select public.current_user_id() is not null as co_danh_tinh;
> ```
> chạy trong SQL editor khi đã đăng nhập (Supabase Auth) hoặc qua app (Clerk + token).

### 3.4 `quiz_scores` — ghi một lần, chỉ đọc của mình

```sql
alter table public.quiz_scores enable row level security;

drop policy if exists "scores are visible to their owner" on public.quiz_scores;
create policy "scores are visible to their owner"
  on public.quiz_scores for select
  to authenticated
  using (user_id = public.current_user_id());

drop policy if exists "scores are recorded by their owner" on public.quiz_scores;
create policy "scores are recorded by their owner"
  on public.quiz_scores for insert
  to authenticated
  with check (
    user_id = public.current_user_id()
    -- Chặn điểm vô lý ngay ở tầng dữ liệu, không chỉ ở API.
    and score >= 0
    and score <= total_questions
    and total_questions between 1 and 50
    and mode in ('silhouette', 'sound')
  );

-- Không UPDATE, không DELETE: một vòng thi đã ghi là lịch sử.
revoke all on public.quiz_scores from anon;
grant select, insert on public.quiz_scores to authenticated;
```

### 3.5 `sound_assets` — credit công khai, chỉ service role ghi

```sql
alter table public.sound_assets enable row level security;

drop policy if exists "sound credits are publicly readable" on public.sound_assets;
create policy "sound credits are publicly readable"
  on public.sound_assets for select
  to anon, authenticated
  using (true);

-- Không policy ghi: pipeline dùng service role, browser không thể tự tạo credit.
revoke all on public.sound_assets from anon;
grant select on public.sound_assets to authenticated;
```

### 3.6 Vai trò admin (mới, tuỳ chọn nhưng nên có trước Phase 12)

```sql
-- Bảng admin đầu tiên. Thêm cột này thay vì tạo bảng riêng: quyền admin là thuộc tính của người dùng.
create table if not exists public.app_admins (
  user_id    text primary key,
  created_at timestamptz not null default now(),
  note       text
);

alter table public.app_admins enable row level security;

-- Chỉ admin đọc được danh sách admin; không ai ghi từ browser (thêm bằng SQL/service role).
drop policy if exists "admins are readable by admins" on public.app_admins;
create policy "admins are readable by admins"
  on public.app_admins for select
  to authenticated
  using (user_id = public.current_user_id() or exists (
    select 1 from public.app_admins a where a.user_id = public.current_user_id()
  ));

revoke all on public.app_admins from anon;
grant select on public.app_admins to authenticated;

-- Hàm kiểm tra quyền, dùng lại trong policy của animals/sound_assets khi cần CMS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_admins a where a.user_id = public.current_user_id()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Ví dụ: cho admin sửa danh mục (Phase 12 cần) mà vẫn không mở cho người thường.
drop policy if exists "admins may edit the catalogue" on public.animals;
create policy "admins may edit the catalogue"
  on public.animals for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins may add species" on public.animals;
create policy "admins may add species"
  on public.animals for insert
  to authenticated
  with check (public.is_admin());
```

### 3.7 Storage: hai bucket, cùng một luật

```sql
-- Đọc công khai cả hai bucket (asset được phát trong <img>/<model-viewer>/<audio>).
drop policy if exists "animal assets are publicly readable" on storage.objects;
create policy "animal assets are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'animal-assets');

drop policy if exists "animal sounds are publicly readable" on storage.objects;
create policy "animal sounds are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'animal-sounds');

-- KHÔNG policy INSERT/UPDATE/DELETE: upload do pipeline (service role) và admin (Phase 12) thực hiện.
-- Nếu sau này cho admin upload trực tiếp từ browser, dùng policy theo tiền tố thư mục:
--   create policy "admins may upload assets"
--     on storage.objects for insert to authenticated
--     with check (bucket_id = 'animal-assets' and (storage.foldername(name))[1] = 'uploads' and public.is_admin());
```

### 3.8 Việc cần làm ngay ở tầng API (không phải SQL)

```ts
// app/api/views/route.ts — chống bơm lượt xem. Cookie 6 giờ hiện tại chỉ là "coarse defence"
// và xoá cookie là qua được. Thêm hai lớp rẻ tiền:
//   1. rate limit theo IP + slug (bộ nhớ tiến trình là đủ cho quy mô này, hoặc Upstash nếu nhiều instance)
//   2. chỉ đếm khi request có header Sec-Fetch-Site cùng origin (chặn script gọi thẳng API)
const recent = new Map<string, number>(); // ip -> timestamp; thay bằng Redis/Upstash khi chạy nhiều instance
const WINDOW_MS = 60_000;
```

---

## 4. Đề xuất tối ưu 3D chi tiết

### 4.1 Nén: DRACO đã có, còn thiếu KTX2 và meshopt

| Kỹ thuật | Trạng thái | Việc cần làm |
| --- | --- | --- |
| DRACO (geometry) | ✅ đã dùng, decoder vendor trong `public/draco` | Giữ. Thêm `meshopt` cho model có animation (DRACO không nén được morph/skin tốt bằng) |
| **KTX2 / Basis (texture)** | ❌ chưa dùng | Đây là món nặng nhất còn lại: texture 1024² RGBA trong GLB là ~4 MB VRAM **mỗi texture**, giải nén bằng CPU lúc load. `npx gltf-transform etc1s in.glb out.glb` giảm 3–6× dung lượng VRAM và cả file |
| Mipmap/anisotropy | ⚠️ anisotropy 8 trên texture cầu (tự sinh) | Với model thật, đặt `texture.generateMipmaps = true` và `anisotropy = min(4, maxAnisotropy)` — 8 gây nhiễu trên mobile |
| Meshopt (nén bổ sung) | ❌ | Chỉ đáng làm ở Phase 12 khi số model tăng |

### 4.2 Vòng đời bộ nhớ — lỗ hổng thật đang có

```tsx
// components/3d/ModelScene.tsx — GltfModel
// Hiện tại: clone scene rồi trả về <primitive>, không dispose khi unmount.
// Khách xem 20 loài liên tiếp sẽ giữ 20 bộ geometry + material trong VRAM.
function GltfModel({ url, wireframe, clip, playing, onClips, onReady }: GltfModelProps) {
  const gltf = useGLTF(url, publicEnv.dracoDecoderPath);
  const model = React.useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  React.useEffect(() => {
    return () => {
      // Chỉ dispose bản clone, KHÔNG dispose cache của useGLTF (dùng chung cho lần sau).
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          for (const key of ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap", "aoMap"] as const) {
            (material as THREE.MeshStandardMaterial)[key]?.dispose?.();
          }
          material.dispose();
        }
      });
    };
  }, [model]);
  // ...
}
```

### 4.3 LOD & progressive loading

- **Chưa có LOD.** Với 24 model 100–600 kB thì không cần; khi lên hàng trăm model, xuất 2 mức (`-lod0` full,
  `-lod1` 40% triangles) và chọn theo `quality.tier` đã có sẵn trong `lib/quality.ts` — hạ tầng đã đủ, chỉ cần
  thêm một dòng chọn URL.
- **Progressive đang đúng**: rig procedural hiển thị ngay, model thật tráo vào sau (`Suspense fallback={rig}`).
  Giữ nguyên; chỉ cần thêm **decode off-thread** (`useGLTF` + `KHR_draco_mesh_compression` đã chạy trong worker
  của decoder, nên không cần làm gì thêm).

### 4.4 Draw call & ánh sáng

- Đo nhanh bằng `renderer.info` (thêm tạm vào `ModelScene`): rig procedural là nhiều mesh rời; model thật
  thường 1–5 mesh. Nếu số draw call > 100, gộp bằng `mergeGeometries` cho rig.
- Ánh sáng hiện tại: 1 ambient + 1 hemisphere + 2 directional + 1 spot + contact shadows. **Chỉ 1 directional
  castShadow** — đúng. Không thêm nữa; thay vào đó nếu cần tương phản, sửa `intensity` chứ đừng thêm đèn.

### 4.5 Tránh re-render không cần thiết trong R3F

- **Đã đúng**: state nặng nằm ngoài Canvas (store), canvas chỉ nhận primitive props; `useFrame` chỉ đọc ref.
- **Cần chú ý**: đừng truyền object/array mới mỗi render vào props của mesh (ví dụ `position={[x, y, z]}` tạo mảng
  mới → R3F gán lại). Với giá trị động, dùng `useMemo` hoặc gán qua `ref` trong `useFrame` (đã làm đúng ở
  `ScaledFigure`).
- `frameloop`: đã có `never` khi tab ẩn (globe). Cân nhắc `demand` cho SizeComparison khi không có animation.

---

## 5. Cải tiến SEO

Đã có (đừng làm lại): canonical tuyệt đối mọi trang, OG image 1200×630 cho từng loài + toàn site, JSON-LD
`WebSite`+`SearchAction`+`Organization`+`BreadcrumbList`+`Taxon`+`ItemList`+`Quiz`, sitemap 29 URL, robots chặn
`/profile` `/api` `/sign-in`, `max-image-preview: large`, manifest, theme-color hai scheme.

Còn thiếu, theo thứ tự giá trị:

1. **OG image đang nặng 375–624 kB PNG.** `ImageResponse` chỉ xuất PNG, nhưng ta tự kiểm soát nội dung:
   giảm chi tiết (bỏ mảng màu lớn, giảm số lớp gradient) và giữ dưới ~200 kB. Đây là ảnh **mọi** lần share lên
   mạng xã hội — cùng một ảnh, một nửa dung lượng, không mất gì.
2. **Chưa có hình ảnh trong sitemap.** Thêm `images` cho từng loài (chính là OG image) để Google Images lập chỉ mục:
   ```ts
   { url: `${site}/animal/${a.slug}`, images: [`${site}/animal/${a.slug}/opengraph-image`], ... }
   ```
3. **Schema `Article`/`LearningResource` cho /about và /quiz** — hiện chỉ có `Quiz`. Thêm `LearningResource` với
   `teaches`/`educationalLevel` cho cả hai.
4. **`hreflang` chưa có** vì chỉ một ngôn ngữ — nhưng nên đặt sẵn `alternates.languages` khi làm i18n (§ Other).
5. **RSS/Atom**: một feed `/feed.xml` cho "loài mới thêm" là cách rẻ để có backlink tự nhiên; hiện chưa có.
6. **`og:image:alt`** chưa được set cho từng loài (ảnh OG có `alt` nhưng metadata `openGraph.images[].alt` thì chưa).
7. **Kiểm chứng rich result thật** chưa từng chạy: nên dán URL vào Google Rich Results Test sau khi deploy thật, và
   thêm một test trong CI kiểm JSON-LD bằng `serializeJsonLd` (đã có) — nhưng **schema hợp lệ** thì phải xác nhận
   bằng công cụ của Google, không tự suy đoán.

---

## 6. Roadmap cải tiến theo thứ tự ưu tiên

### P0 — làm ngay (rủi ro thật, chi phí thấp)

| # | Việc | Gỡ rủi ro | Ước lượng |
| --- | --- | --- | --- |
| P0.1 | Bật **Clerk làm Third-Party Auth** trong Supabase + áp §3.1–3.3 | R1 (service role đi vòng RLS) | 2–3 giờ (gồm kiểm chứng bằng session thật) |
| P0.2 | Rate limit + same-origin check cho `/api/views` | R2 (bơm lượt xem) | 1 giờ |
| P0.3 | `app/error.tsx` + `app/global-error.tsx` + `app/loading.tsx` | R3 (trang lỗi trắng) | 1 giờ |
| P0.4 | `dispose()` cho geometry/material của GLB (đoạn code ở §4.2) | R6 (rò VRAM) | 30 phút + test rò bằng `renderer.info.memory` |

### P1 — nên làm trong tháng này

| # | Việc | Gỡ rủi ro |
| --- | --- | --- |
| P1.1 | Sentry (hoặc tương đương) + `/api/health` | R5 |
| P1.2 | KTX2/Basis cho 24 model (`gltf-transform`) — đo lại tổng dung lượng trước/sau | R6, egress |
| P1.3 | `unstable_cache` cho đọc catalogue + tách `getAnimalSummaries` | R4 (query lặp mỗi 300 s) |
| P1.4 | Ảnh OG nhẹ hơn (< 200 kB) + images trong sitemap | SEO |
| P1.5 | Trích chuỗi i18n vào `lib/i18n/en.ts` (không cần thư viện ngay) | R7 |
| P1.6 | Admin role §3.6 — chuẩn bị cho Phase 12 | R1 (biên), Phase 12 |

### P2 — khi quy mô tăng (hàng nghìn loài)

| # | Việc |
| --- | --- |
| P2.1 | ISR theo yêu cầu thay `generateStaticParams` toàn bộ; phân trang/ảo hoá grid |
| P2.2 | LOD 2 mức + chọn theo `quality.tier` |
| P2.3 | CDN riêng cho model/sound (hoặc Supabase Storage + `Cache-Control` immutable đã có) |
| P2.4 | PWA có service worker (offline đọc + cache model đã xem) |
| P2.5 | Khoá egress: bảng theo dõi + cảnh báo ngưỡng |

---

## 7. Các thay đổi nên cập nhật vào PLAN.md

| Section trong PLAN.md | Sửa/thêm gì | Lý do |
| --- | --- | --- |
| **§Tổng quan trạng thái** (bảng số liệu) | Thêm dòng *Rủi ro đang mở*: R1–R8 kèm mức ưu tiên | Bảng hiện chỉ có số đẹp (test, bundle, AA) — không thấy nợ kỹ thuật |
| **§Phase 10** (section này) | Đổi trạng thái sang ✅ và trỏ tới `docs/REVIEW.md` | Đầu ra của phase là báo cáo, nên nó phải nằm trong repo |
| **§Phase 11 (Settings)** | Bổ sung: dùng `public.current_user_id()` trong policy `user_settings` (thay vì lặp lại `auth.uid()`), và ghi rõ yêu cầu P0.1 phải xong trước | Phase 11 thêm bảng người dùng thứ tư — nếu chưa có danh tính hợp nhất thì lại phải service role |
| **§Phase 12 (Admin model)** | Thêm việc "tạo `app_admins` + `is_admin()`" (§3.6) làm bước 0 | Không có vai trò admin thì không thể cho CMS sửa `animals` một cách an toàn |
| **§Quyết định thiết kế đáng nhớ** | Thêm 3 quyết định mới: (1) Clerk đi qua Third-Party Auth để RLS là thật; (2) asset ưu tiên Storage, repo chỉ là fallback Demo Mode; (3) chuỗi i18n tách khỏi JSX trước khi thêm ngôn ngữ | Ba điều này sẽ bị "quên" nếu chỉ nằm trong báo cáo |
| **§Cách kiểm chứng** | Thêm `npm run audit:perf`, `audit:theme`, `check:bundle`, và một mục "kiểm tra RLS sau khi deploy" (`select public.current_user_id()`) | Hiện chỉ liệt kê `check`/`build`/`db:status`/`models:report` |
| **§Việc còn lại** | Thêm P0.1–P0.4 như 4 dòng việc cụ thể | Đây là việc có hạn, không phải "đề xuất" |

---

*Báo cáo này chỉ nêu thứ **đo được** trong repo tại `13387e5`. Những chỗ tôi không kiểm chứng được (ví dụ: hành vi
thật của RLS sau khi bật Clerk Third-Party Auth, hay kích thước VRAM trên GPU thật) đều được ghi rõ là cần kiểm
chứng, không được trình bày như đã xác nhận.*
