import Foundation

/// Metadata for one bundled plugin. The JS implementation lives in a
/// same-named .js file in the app bundle (Resources/JS).
struct PluginOption: Identifiable {
    let id: String
    let label: String
    let labelAr: String
    let defaultValue: Bool
}

struct PluginMeta: Identifiable {
    let id: String
    let name: String
    let nameAr: String
    let summary: String
    let summaryAr: String
    let fileName: String
    let defaultEnabled: Bool
    let options: [PluginOption]
}

enum PluginRegistry {
    static let bundled: [PluginMeta] = [
        PluginMeta(
            id: "copyIDs",
            name: "Copy IDs",
            nameAr: "نسخ المعرّفات",
            summary: "Long-press a message, user, server or channel to copy its ID.",
            summaryAr: "اضغط مطولًا على رسالة أو مستخدم أو خادم أو قناة لنسخ معرّفه.",
            fileName: "copyIDs.js",
            defaultEnabled: true,
            options: []
        ),
        PluginMeta(
            id: "localTimestamps",
            name: "Local Timestamps",
            nameAr: "الأوقات المحلية",
            summary: "Show the full local date and time on message timestamps.",
            summaryAr: "اعرض التاريخ والوقت المحلي الكامل على أوقات الرسائل.",
            fileName: "localTimestamps.js",
            defaultEnabled: true,
            options: [
                PluginOption(id: "replace", label: "Replace the displayed time", labelAr: "استبدال الوقت المعروض", defaultValue: false)
            ]
        ),
        PluginMeta(
            id: "hideBlocked",
            name: "Hide Blocked Messages",
            nameAr: "إخفاء الرسائل المحظورة",
            summary: "Hide blocked and ignored message placeholders from chat.",
            summaryAr: "أخفِ عناصر الرسائل المحظورة والمتجاهَلة من المحادثة.",
            fileName: "hideBlocked.js",
            defaultEnabled: true,
            options: []
        ),
        PluginMeta(
            id: "mediaTools",
            name: "Media Tools",
            nameAr: "أدوات الوسائط",
            summary: "Tap any image to zoom it fullscreen, with a download button.",
            summaryAr: "المس أي صورة لتكبيرها بملء الشاشة، مع زر تنزيل.",
            fileName: "mediaTools.js",
            defaultEnabled: true,
            options: []
        ),
        PluginMeta(
            id: "customCSS",
            name: "Custom CSS Loader",
            nameAr: "مُحمّل CSS المخصص",
            summary: "Injects the custom CSS you write in Settings.",
            summaryAr: "يحقن كود CSS المخصص الذي تكتبه في الإعدادات.",
            fileName: "customCSS.js",
            defaultEnabled: true,
            options: []
        ),
        PluginMeta(
            id: "hideNitro",
            name: "Hide Nitro Upsell",
            nameAr: "إخفاء عروض Nitro",
            summary: "Hide Nitro upsell buttons and banners.",
            summaryAr: "أخفِ أزرار ولافتات الترويج لـ Nitro.",
            fileName: "hideNitro.js",
            defaultEnabled: false,
            options: []
        )
    ]

    static func meta(for id: String) -> PluginMeta? {
        bundled.first { $0.id == id }
    }

    static func defaultEnabled(_ id: String) -> Bool {
        meta(for: id)?.defaultEnabled ?? false
    }

    static func optionDefault(pluginId: String, optionId: String) -> Bool {
        meta(for: pluginId)?.options.first { $0.id == optionId }?.defaultValue ?? false
    }
}
