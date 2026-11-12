import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var store: SettingsStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section {
                    NavigationLink(destination: ThemeSettingsView()) {
                        settingsRow(icon: "paintpalette.fill", title: "المظهر والثيمات", subtitle: "Themes")
                    }
                    NavigationLink(destination: PluginSettingsView()) {
                        settingsRow(icon: "puzzlepiece.extension.fill", title: "البلجنات", subtitle: "Plugins")
                    }
                    NavigationLink(destination: CustomCSSView()) {
                        settingsRow(icon: "curlybraces", title: "CSS مخصص", subtitle: "Custom CSS")
                    }
                } header: {
                    Text("التخصيص")
                }

                Section {
                    NavigationLink(destination: AboutView()) {
                        settingsRow(icon: "info.circle.fill", title: "حول التطبيق", subtitle: "About Discord Plus")
                    }
                }

                Section {
                    Text("تنبيه: العملاء المعدّلة قد تؤدي إلى حظر حساب Discord. جرّب بحساب ثانوي أولًا.")
                        .font(.footnote)
                        .foregroundColor(.orange)
                } header: {
                    Text("مهم")
                }

                Section {
                    HStack {
                        Text("الإصدار")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .environment(\.layoutDirection, .rightToLeft)
            .navigationTitle("الإعدادات")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إغلاق") { dismiss() }
                }
            }
        }
    }

    private func settingsRow(icon: String, title: String, subtitle: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(.white)
                .frame(width: 30, height: 30)
                .background(Color(hex: "#5865F2"))
                .cornerRadius(8)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.body)
                Text(subtitle).font(.caption).foregroundColor(.secondary)
            }
        }
    }
}
