import SwiftUI

struct ThemeSettingsView: View {
    @EnvironmentObject var store: SettingsStore

    var body: some View {
        List {
            Section("الثيم") {
                ForEach(ThemeEngine.themes) { theme in
                    Button(action: { store.themeId = theme.id }) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(theme.nameAr).font(.body)
                                Text(theme.name).font(.caption).foregroundColor(.secondary)
                                Text(theme.taglineAr).font(.caption2).foregroundColor(.secondary)
                            }
                            Spacer()
                            themeSwatch(theme)
                            if store.themeId == theme.id {
                                Image(systemName: "checkmark.circle.fill").foregroundColor(.green)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }

            Section("لون التمييز") {
                HStack(spacing: 14) {
                    ForEach(ThemeEngine.accentPresets, id: \.hex) { preset in
                        Button(action: { store.accentHex = preset.hex }) {
                            Circle()
                                .fill(Color(hex: preset.hex))
                                .frame(width: 34, height: 34)
                                .overlay(
                                    Circle().stroke(Color.white, lineWidth: store.accentHex == preset.hex ? 2 : 0)
                                )
                        }
                        .buttonStyle(.plain)
                    }
                    ColorPicker("", selection: Binding(
                        get: { Color(hex: store.accentHex) },
                        set: { store.accentHex = $0.toHex() ?? "#5865F2" }
                    ))
                    .labelsHidden()
                }
                Text("اللون المخصص يطبّق فورًا على الأزرار والروابط.")
                    .font(.caption).foregroundColor(.secondary)
            }

            Section("الخط") {
                Picker("الخط", selection: $store.fontFamily) {
                    ForEach(ThemeEngine.fonts, id: \.id) { font in
                        Text("\(font.nameAr) — \(font.name)").tag(font.id)
                    }
                }
                .pickerStyle(.inline)
            }

            Section("معاينة") {
                themePreview
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
        .navigationTitle("المظهر والثيمات")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func themeSwatch(_ theme: DPTheme) -> some View {
        // Explicit hex background keys — the alphabetical first keys include
        // rgba() values, which Color(hex:) cannot parse (they'd render black).
        let keys = ["--background-primary", "--background-secondary", "--background-accent"]
        return HStack(spacing: -6) {
            ForEach(keys, id: \.self) { key in
                Circle()
                    .fill(Color(hex: theme.variables[key] ?? "#000000"))
                    .frame(width: 20, height: 20)
                    .overlay(Circle().stroke(Color.black.opacity(0.4), lineWidth: 1))
            }
        }
    }

    private var themePreview: some View {
        let theme = ThemeEngine.theme(for: store.themeId)
        let bg = Color(hex: theme.variables["--background-primary"] ?? "#1a1b1e")
        let secondary = Color(hex: theme.variables["--background-secondary"] ?? "#202124")
        let text = Color(hex: theme.variables["--text-normal"] ?? "#dcddde")
        let accent = Color(hex: store.accentHex)
        return VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Circle().fill(accent).frame(width: 36, height: 36)
                    .overlay(Text("م").foregroundColor(.white).bold())
                VStack(alignment: .leading, spacing: 2) {
                    Text("مصطفى").font(.subheadline).bold().foregroundColor(text)
                    Text("رسالة تجريبية بالثيم الحالي").font(.subheadline).foregroundColor(text)
                }
                Spacer()
            }
            HStack {
                Spacer()
                Text("إرسال").font(.caption).bold()
                    .foregroundColor(.white)
                    .padding(.horizontal, 14).padding(.vertical, 6)
                    .background(accent)
                    .cornerRadius(14)
            }
        }
        .padding()
        .background(secondary)
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(bg, lineWidth: 1))
    }
}
