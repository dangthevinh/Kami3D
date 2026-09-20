import type { LanguageCode } from "@/lib/user-settings";

/**
 * The first slice of the interface translation (Phase 11, group D).
 *
 * It covers **this panel** — the place the language is chosen — and nothing else
 * yet. That boundary is deliberate and is stated in the UI: a visitor who picks
 * Tiếng Việt and finds the species entries still in English has been told the
 * truth, whereas a half-translated navigation bar over English content would just
 * look broken. The catalogue copy, the quiz and the 3D toolbars are the next
 * slices; the plumbing — one dictionary per language, one lookup, and a test that
 * both languages define every key — is what this file exists to have in place.
 *
 * Numbers stay formatted by `Intl` rather than by hand, so a language also brings
 * its own decimal and grouping conventions wherever a number is printed.
 */

export const MESSAGES = {
  en: {
    "page.title": "Settings",
    "page.subtitle": "Your preferences, on every device you sign in from.",
    "page.scope": "Language covers this panel so far — species entries are still English.",

    "save.account": "Saved to your account",
    "save.browser": "Saved in this browser",
    "save.saving": "Saving…",
    "save.failed": "Saved in this browser only — the server did not accept the change.",

    "appearance.title": "Appearance",
    "appearance.hint": "Theme, accent, and how much glass the interface uses.",
    "appearance.theme": "Theme",
    "appearance.themeHint": "System follows your operating system.",
    "theme.dark": "Dark",
    "theme.light": "Light",
    "theme.system": "System",
    "appearance.accent": "Accent colour",
    "appearance.accentHint": "Re-tints buttons, links, focus rings and highlights.",
    "accent.cyan": "Cyan",
    "accent.emerald": "Emerald",
    "accent.violet": "Violet",
    "accent.amber": "Amber",
    "accent.rose": "Rose",
    "appearance.glass": "Glass intensity",
    "appearance.glassHint": "Higher means more blur, and more work for the GPU.",
    "glass.low": "Low",
    "glass.medium": "Medium",
    "glass.high": "High",
    "appearance.motion": "Reduce motion",
    "appearance.motionHint": "Turns off CSS animation and transitions, and stops 3D models and previews from auto-rotating.",

    "performance.title": "3D performance",
    "performance.hint": "What the canvases are allowed to spend on a frame.",
    "performance.preset": "Quality preset",
    "performance.presetHint": "Automatic measures this device, then picks low, balanced or high.",
    "preset.auto": "Automatic",
    "preset.low": "Low",
    "preset.medium": "Medium",
    "preset.high": "High",
    "preset.ultra": "Ultra",
    "performance.measured": "This device measures as",
    "performance.shadows": "Shadows",
    "performance.shadowsHint": "The shadow the model casts, and the soft patch under it.",
    "performance.reflections": "Floor reflection",
    "performance.reflectionsHint": "Mirrors the model in the floor. Costs a second render pass.",
    "performance.dpr": "Maximum pixel ratio",
    "performance.dprHint": "Lower means fewer pixels per frame on a high-density screen.",
    "performance.autoRotate": "Auto-rotate models",
    "performance.autoRotateHint": "Spins a model slowly until you drag it. Your drag always wins.",

    "audio.title": "Audio",
    "audio.hint": "Call recordings and interface sounds.",
    "audio.master": "Master volume",
    "audio.animal": "Animal calls",
    "audio.ui": "Interface sounds",
    "audio.uiHint": "Short tones for correct and wrong answers in the quiz.",
    "audio.autoplay": "Play a call when a species page opens",
    "audio.autoplayHint": "Browsers block sound until you interact, so the first automatic attempt may be silent.",
    "audio.test": "Play a test tone",

    "region.title": "Language & region",
    "region.hint": "The language of this panel, and the units every measurement is printed in.",
    "region.language": "Interface language",
    "language.vi": "Tiếng Việt",
    "language.en": "English",
    "region.unit": "Measurement unit",
    "region.unitHint": "Metres and kilograms, or feet and pounds.",
    "unit.metric": "Metric",
    "unit.imperial": "Imperial",

    "notifications.title": "Notifications",
    "notifications.hint": "What Kami3D may tell you about.",
    "notifications.email": "Email",
    "notifications.emailHint": "New species, and your quiz results.",
    "notifications.push": "Browser notifications",
    "notifications.pushHint": "Needs a browser permission prompt, which is not requested yet.",
    "notifications.none": "Kami3D sends nothing yet. These switches are stored, and they are what the email and push code will read once it exists.",

    "account.title": "Account",
    "account.hint": "Who you are signed in as, and what Kami3D stores about you.",
    "account.signedInAs": "Signed in as",
    "account.manage": "Manage account",
    "account.delete": "Delete my data",
    "account.deleteHint": "Removes your favourites, your quiz scores and these settings.",
    "account.confirm": "Delete everything?",
    "account.confirmYes": "Yes, delete",
    "account.cancel": "Cancel",
    "account.deleted": "Deleted. Favourites, quiz scores and settings are gone.",
    "account.deletedPartial": "Deleted what could be reached; some rows may remain.",
    "account.guestTitle": "You are not signed in",
    "account.guestHint": "The preferences below are stored in this browser. Sign in to keep them on every device.",
    "account.signIn": "Sign in",
    "account.reset": "Reset to defaults",
    "account.resetHint": "Puts every preference back to what a new visitor gets.",
  },
  vi: {
    "page.title": "Cài đặt",
    "page.subtitle": "Tuỳ chọn của bạn, áp dụng trên mọi thiết bị bạn đăng nhập.",
    "page.scope": "Ngôn ngữ mới áp dụng cho bảng này — nội dung về loài vẫn là tiếng Anh.",

    "save.account": "Đã lưu vào tài khoản",
    "save.browser": "Đã lưu trong trình duyệt này",
    "save.saving": "Đang lưu…",
    "save.failed": "Chỉ lưu được trong trình duyệt này — máy chủ không nhận thay đổi.",

    "appearance.title": "Giao diện",
    "appearance.hint": "Chủ đề, màu nhấn và độ kính của giao diện.",
    "appearance.theme": "Chủ đề",
    "appearance.themeHint": "Theo hệ thống sẽ bám cài đặt của thiết bị.",
    "theme.dark": "Tối",
    "theme.light": "Sáng",
    "theme.system": "Theo hệ thống",
    "appearance.accent": "Màu nhấn",
    "appearance.accentHint": "Đổi màu nút, liên kết, viền tiêu điểm và các điểm nhấn.",
    "accent.cyan": "Xanh cyan",
    "accent.emerald": "Xanh ngọc",
    "accent.violet": "Tím",
    "accent.amber": "Hổ phách",
    "accent.rose": "Hồng",
    "appearance.glass": "Độ kính mờ",
    "appearance.glassHint": "Càng cao càng mờ, và càng tốn GPU.",
    "glass.low": "Thấp",
    "glass.medium": "Vừa",
    "glass.high": "Cao",
    "appearance.motion": "Giảm chuyển động",
    "appearance.motionHint": "Tắt hiệu ứng CSS, đồng thời tắt tự xoay của mô hình 3D và các ô xem trước.",

    "performance.title": "Hiệu năng 3D",
    "performance.hint": "Giới hạn cho mỗi khung hình của các khung 3D.",
    "performance.preset": "Mức chất lượng",
    "performance.presetHint": "Tự động sẽ đo thiết bị rồi chọn thấp, vừa hoặc cao.",
    "preset.auto": "Tự động",
    "preset.low": "Thấp",
    "preset.medium": "Vừa",
    "preset.high": "Cao",
    "preset.ultra": "Siêu cao",
    "performance.measured": "Thiết bị này được đo ở mức",
    "performance.shadows": "Đổ bóng",
    "performance.shadowsHint": "Bóng của mô hình và vệt bóng mờ bên dưới.",
    "performance.reflections": "Phản chiếu sàn",
    "performance.reflectionsHint": "Soi mô hình xuống sàn. Tốn thêm một lượt dựng hình.",
    "performance.dpr": "Tỉ lệ điểm ảnh tối đa",
    "performance.dprHint": "Càng thấp thì mỗi khung hình càng ít điểm ảnh trên màn hình nét.",
    "performance.autoRotate": "Tự xoay mô hình",
    "performance.autoRotateHint": "Mô hình quay chậm cho tới khi bạn kéo. Thao tác kéo luôn được ưu tiên.",

    "audio.title": "Âm thanh",
    "audio.hint": "Tiếng kêu của loài và âm thanh giao diện.",
    "audio.master": "Âm lượng tổng",
    "audio.animal": "Tiếng kêu động vật",
    "audio.ui": "Âm thanh giao diện",
    "audio.uiHint": "Tiếng ngắn cho câu trả lời đúng và sai trong quiz.",
    "audio.autoplay": "Tự phát tiếng kêu khi mở trang loài",
    "audio.autoplayHint": "Trình duyệt chặn âm thanh tới khi bạn tương tác, nên lần tự phát đầu tiên có thể im lặng.",
    "audio.test": "Nghe thử âm thanh",

    "region.title": "Ngôn ngữ & khu vực",
    "region.hint": "Ngôn ngữ của bảng này, và đơn vị đo cho mọi số liệu.",
    "region.language": "Ngôn ngữ giao diện",
    "language.vi": "Tiếng Việt",
    "language.en": "English",
    "region.unit": "Đơn vị đo",
    "region.unitHint": "Mét và kilôgam, hoặc feet và pound.",
    "unit.metric": "Hệ mét",
    "unit.imperial": "Hệ Anh",

    "notifications.title": "Thông báo",
    "notifications.hint": "Kami3D được phép thông báo cho bạn về việc gì.",
    "notifications.email": "Email",
    "notifications.emailHint": "Loài mới, và kết quả quiz của bạn.",
    "notifications.push": "Thông báo trình duyệt",
    "notifications.pushHint": "Cần xin quyền từ trình duyệt, hiện vẫn chưa xin.",
    "notifications.none": "Kami3D chưa gửi gì cả. Hai công tắc này chỉ được lưu lại, và sẽ là thứ mà phần email/push đọc khi nó tồn tại.",

    "account.title": "Tài khoản",
    "account.hint": "Bạn đang đăng nhập bằng ai, và Kami3D lưu gì về bạn.",
    "account.signedInAs": "Đang đăng nhập với",
    "account.manage": "Quản lý tài khoản",
    "account.delete": "Xoá dữ liệu của tôi",
    "account.deleteHint": "Xoá yêu thích, điểm quiz và các cài đặt này.",
    "account.confirm": "Xoá hết chứ?",
    "account.confirmYes": "Xoá",
    "account.cancel": "Huỷ",
    "account.deleted": "Đã xoá. Yêu thích, điểm quiz và cài đặt đều đã mất.",
    "account.deletedPartial": "Đã xoá những gì với tới được; có thể còn sót vài dòng.",
    "account.guestTitle": "Bạn chưa đăng nhập",
    "account.guestHint": "Các tuỳ chọn bên dưới được lưu trong trình duyệt này. Đăng nhập để giữ chúng trên mọi thiết bị.",
    "account.signIn": "Đăng nhập",
    "account.reset": "Về mặc định",
    "account.resetHint": "Đưa mọi tuỳ chọn về như một khách mới.",
  },
} as const;

export type MessageKey = keyof (typeof MESSAGES)["en"];

/** The `lang` attribute, and the locale `Intl` prints numbers with. */
export const LOCALES: Record<LanguageCode, string> = { en: "en-US", vi: "vi-VN" };

export function translate(language: LanguageCode, key: MessageKey): string {
  return MESSAGES[language]?.[key] ?? MESSAGES.en[key] ?? key;
}

/** The whole dictionary, for a component that renders many keys at once. */
export function messagesFor(language: LanguageCode): Record<MessageKey, string> {
  return (MESSAGES[language] ?? MESSAGES.en) as unknown as Record<MessageKey, string>;
}
