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
        ),
        PluginMeta(
            id: "messageLogger",
            name: "Message Logger",
            nameAr: "سجل الرسائل",
            summary: "Keeps messages seen while the logger runs: deleted messages stay visible and edits keep history. Cannot recover messages deleted before it was enabled.",
            summaryAr: "يحفظ الرسائل التي تصل أثناء تشغيل السجل: الرسائل المحذوفة تبقى ظاهرة والتعديلات تحتفظ بسجلها. لا يستطيع استرجاع رسائل حُذفت قبل تفعيله.",
            fileName: "messageLogger.js",
            defaultEnabled: true,
            options: [
                PluginOption(id: "showDeleted", label: "Keep deleted messages visible", labelAr: "إبقاء الرسائل المحذوفة ظاهرة", defaultValue: true),
                PluginOption(id: "keepEdits", label: "Keep edit history", labelAr: "الاحتفاظ بسجل التعديلات", defaultValue: true)
            ]
        ),
        PluginMeta(
            id: "timeoutCountdown",
            name: "Timeout Countdown",
            nameAr: "عدّاد التايم أوت",
            summary: "Live countdown for timed-out members in profiles and the member list, with the exact end time.",
            summaryAr: "عدّاد حي للأعضاء المأخوذين تايم أوت في الملفات وقائمة الأعضاء، مع وقت الانتهاء الدقيق.",
            fileName: "timeoutCountdown.js",
            defaultEnabled: true,
            options: []
        ),
        PluginMeta(
            id: "memberDetails",
            name: "Member Details",
            nameAr: "تفاصيل الأعضاء",
            summary: "Account creation date, server join date, roles and account age in user profiles.",
            summaryAr: "تاريخ إنشاء الحساب وتاريخ الانضمام للخادم والأدوار وعمر الحساب في ملفات المستخدمين.",
            fileName: "memberDetails.js",
            defaultEnabled: true,
            options: []
        ),
        PluginMeta(
            id: "translateMessages",
            name: "Translate Messages",
            nameAr: "ترجمة الرسائل",
            summary: "Long-press a message to translate it in place, Arabic ↔ English.",
            summaryAr: "اضغط مطولًا على رسالة لترجمتها في مكانها، عربي ↔ إنجليزي.",
            fileName: "translateMessages.js",
            defaultEnabled: true,
            options: []
        ),
        PluginMeta(
            id: "exportTools",
            name: "Export Tools",
            nameAr: "أدوات التصدير",
            summary: "Export loaded channel messages (text or JSON) and the server member list (CSV).",
            summaryAr: "صدّر رسائل القناة المحمّلة (نص أو JSON) وقائمة أعضاء الخادم (CSV).",
            fileName: "exportTools.js",
            defaultEnabled: true,
            options: []
        ),
        PluginMeta(
            id: "messageBookmarks",
            name: "Message Bookmarks",
            nameAr: "حفظ الرسائل",
            summary: "Save messages locally and read them later from the saved list.",
            summaryAr: "احفظ الرسائل على جهازك واقرأها لاحقًا من قائمة المحفوظات.",
            fileName: "messageBookmarks.js",
            defaultEnabled: true,
            options: []
        ),
        PluginMeta(
            id: "serverInfo",
            name: "Server Info",
            nameAr: "معلومات الخادم",
            summary: "Server creation date, member count, boost level and channel count.",
            summaryAr: "تاريخ إنشاء الخادم وعدد الأعضاء ومستوى البوست وعدد القنوات.",
            fileName: "serverInfo.js",
            defaultEnabled: true,
            options: []
        ),
        PluginMeta(
            id: "silentTyping",
            name: "Silent Typing",
            nameAr: "الكتابة الصامتة",
            summary: "Stop sending your typing indicator and/or hide others' typing indicators.",
            summaryAr: "أوقف إرسال مؤشر الكتابة خاصتك و/أو أخفِ مؤشر كتابة الآخرين.",
            fileName: "silentTyping.js",
            defaultEnabled: true,
            options: [
                PluginOption(id: "blockOutgoing", label: "Don't send my typing", labelAr: "لا ترسل مؤشر كتابتي", defaultValue: true),
                PluginOption(id: "hideIncoming", label: "Hide others' typing", labelAr: "أخفِ مؤشر كتابة الآخرين", defaultValue: true)
            ]
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
