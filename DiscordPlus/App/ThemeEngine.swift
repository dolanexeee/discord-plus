import Foundation
import SwiftUI

/// A theme is a set of Discord CSS-variable overrides. The web client styles
/// itself through these variables, so overriding them re-skins the whole app.
struct DPTheme: Identifiable, Equatable {
    let id: String
    let name: String
    let nameAr: String
    let tagline: String
    let taglineAr: String
    let variables: [String: String]
}

enum ThemeEngine {
    static let midnight = DPTheme(
        id: "midnight",
        name: "Midnight",
        nameAr: "منتصف الليل",
        tagline: "Deep blue-grey dark",
        taglineAr: "داكن أزرق-رمادي عميق",
        variables: [
            "--background-primary": "#1a1b1e",
            "--background-secondary": "#202124",
            "--background-secondary-alt": "#232529",
            "--background-tertiary": "#17181a",
            "--background-accent": "#232428",
            "--background-floating": "#111214",
            "--background-mobile-primary": "#1a1b1e",
            "--background-mobile-secondary": "#202124",
            "--background-modifier-hover": "rgba(255, 255, 255, 0.06)",
            "--background-modifier-active": "rgba(255, 255, 255, 0.09)",
            "--background-modifier-selected": "rgba(255, 255, 255, 0.1)",
            "--background-message-hover": "rgba(255, 255, 255, 0.03)",
            "--channeltextarea-background": "#232428",
            "--input-background": "#232428",
            "--scrollbar-auto-thumb": "#1a1b1e",
            "--scrollbar-auto-track": "#232428",
            "--scrollbar-thin-thumb": "#1a1b1e",
            "--text-normal": "#dcddde",
            "--text-muted": "#a3a6aa",
            "--header-primary": "#ffffff",
            "--header-secondary": "#b5bac1",
            "--interactive-normal": "#b5bac1",
            "--interactive-hover": "#ffffff",
            "--interactive-active": "#ffffff",
            "--interactive-muted": "#6d6f78"
        ]
    )

    static let amoled = DPTheme(
        id: "amoled",
        name: "AMOLED",
        nameAr: "أسود خالص",
        tagline: "Pure black — saves battery on OLED",
        taglineAr: "أسود نقي — يوفر البطارية على شاشات OLED",
        variables: [
            "--background-primary": "#000000",
            "--background-secondary": "#000000",
            "--background-secondary-alt": "#000000",
            "--background-tertiary": "#000000",
            "--background-accent": "#0a0a0a",
            "--background-floating": "#000000",
            "--background-mobile-primary": "#000000",
            "--background-mobile-secondary": "#000000",
            "--background-modifier-hover": "rgba(255, 255, 255, 0.08)",
            "--background-modifier-active": "rgba(255, 255, 255, 0.12)",
            "--background-modifier-selected": "rgba(255, 255, 255, 0.14)",
            "--background-message-hover": "rgba(255, 255, 255, 0.04)",
            "--channeltextarea-background": "#0a0a0a",
            "--input-background": "#0a0a0a",
            "--scrollbar-auto-thumb": "#1a1a1a",
            "--scrollbar-auto-track": "#000000",
            "--scrollbar-thin-thumb": "#1a1a1a",
            "--text-normal": "#f2f3f5",
            "--text-muted": "#b5bac1",
            "--header-primary": "#ffffff",
            "--header-secondary": "#c9ccd1",
            "--interactive-normal": "#c9ccd1",
            "--interactive-hover": "#ffffff",
            "--interactive-active": "#ffffff",
            "--interactive-muted": "#80848e"
        ]
    )

    static let aurora = DPTheme(
        id: "aurora",
        name: "Aurora",
        nameAr: "الشفق",
        tagline: "Dark violet night with a teal accent",
        taglineAr: "ليل بنفسجي داكن بلمسة تركوازية",
        variables: [
            "--background-primary": "#0e1120",
            "--background-secondary": "#141830",
            "--background-secondary-alt": "#181d38",
            "--background-tertiary": "#0a0d1a",
            "--background-accent": "#181d38",
            "--background-floating": "#0a0d1a",
            "--background-mobile-primary": "#0e1120",
            "--background-mobile-secondary": "#141830",
            "--background-modifier-hover": "rgba(45, 212, 191, 0.08)",
            "--background-modifier-active": "rgba(45, 212, 191, 0.14)",
            "--background-modifier-selected": "rgba(45, 212, 191, 0.18)",
            "--background-message-hover": "rgba(45, 212, 191, 0.04)",
            "--channeltextarea-background": "#181d38",
            "--input-background": "#181d38",
            "--scrollbar-auto-thumb": "#232850",
            "--scrollbar-auto-track": "#141830",
            "--scrollbar-thin-thumb": "#232850",
            "--text-normal": "#e6e8ff",
            "--text-muted": "#9aa3c7",
            "--header-primary": "#ffffff",
            "--header-secondary": "#c2c8ee",
            "--interactive-normal": "#c2c8ee",
            "--interactive-hover": "#ffffff",
            "--interactive-active": "#ffffff",
            "--interactive-muted": "#6b739f"
        ]
    )

    static let themes: [DPTheme] = [midnight, amoled, aurora]

    static func theme(for id: String) -> DPTheme {
        themes.first { $0.id == id } ?? midnight
    }

    static let accentPresets: [(name: String, nameAr: String, hex: String)] = [
        ("Blurple", "بنفسجي ديسكورد", "#5865F2"),
        ("Teal", "تركوازي", "#2DD4BF"),
        ("Pink", "وردي", "#EB459E"),
        ("Gold", "ذهبي", "#FEE75C"),
        ("Green", "أخضر", "#57F287"),
        ("Red", "أحمر", "#ED4245")
    ]

    static let fonts: [(id: String, name: String, nameAr: String, css: String)] = [
        ("system", "System Default", "خط النظام", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"),
        ("serif", "Serif", "خط كلاسيكي", "Georgia, 'Times New Roman', serif"),
        ("mono", "Monospace", "خط برمجي", "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"),
        ("rounded", "Rounded", "خط مستدير", "'SF Pro Rounded', ui-rounded, 'Helvetica Neue', Arial, sans-serif")
    ]

    /// Builds the full theme stylesheet injected into the Discord web client.
    static func css(themeId: String, accentHex: String, fontFamily: String) -> String {
        let theme = theme(for: themeId)
        var vars = theme.variables
        // The user's accent colour wins over the theme's brand colour.
        vars["--brand-experiment"] = accentHex
        vars["--brand-500"] = accentHex
        vars["--control-brand-foreground"] = accentHex
        vars["--text-link"] = accentHex

        let fontCSS = fonts.first { $0.id == fontFamily }?.css ?? fonts[0].css

        var out = ":root, .theme-dark, .theme-light {\n"
        for (key, value) in vars.sorted(by: { $0.key < $1.key }) {
            out += "  \(key): \(value) !important;\n"
        }
        out += "  --font-primary: \(fontCSS) !important;\n"
        out += "  --font-display: \(fontCSS) !important;\n"
        out += "  --font-headline: \(fontCSS) !important;\n"
        out += "  --font-code: ui-monospace, 'SF Mono', Menlo, Consolas, monospace !important;\n"
        out += "  color-scheme: dark;\n"
        out += "}\n"
        out += "body { background-color: var(--background-primary) !important; font-family: \(fontCSS) !important; }\n"
        return out
    }
}

extension Color {
    init(hex: String) {
        var hexString = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if hexString.hasPrefix("#") { hexString.removeFirst() }
        var rgb: UInt64 = 0
        Scanner(string: hexString).scanHexInt64(&rgb)
        let r = Double((rgb >> 16) & 0xFF) / 255.0
        let g = Double((rgb >> 8) & 0xFF) / 255.0
        let b = Double(rgb & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }

    func toHex() -> String? {
        let uiColor = UIColor(self)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        guard uiColor.getRed(&r, green: &g, blue: &b, alpha: &a) else { return nil }
        return String(format: "#%02X%02X%02X", Int(r * 255), Int(g * 255), Int(b * 255))
    }
}
