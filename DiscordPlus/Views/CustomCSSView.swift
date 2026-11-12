import SwiftUI

struct CustomCSSView: View {
    @EnvironmentObject var store: SettingsStore
    @State private var draft: String = ""
    @State private var savedNote = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("اكتب CSS مخصصًا يُحقن في ديسكورد ويُطبّق فورًا.")
                .font(.subheadline)
                .foregroundColor(.secondary)
            TextEditor(text: $draft)
                .font(.system(.body, design: .monospaced))
                .autocapitalization(.none)
                .autocorrectionDisabled()
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.gray.opacity(0.4), lineWidth: 1)
                )
                .frame(minHeight: 220)
            HStack(spacing: 10) {
                Button("حفظ وتطبيق") {
                    store.customCSS = draft
                    savedNote = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) { savedNote = false }
                }
                .buttonStyle(.borderedProminent)
                Button("مسح") {
                    draft = ""
                    store.customCSS = ""
                }
                .buttonStyle(.bordered)
                Spacer()
                if savedNote {
                    Text("تم الحفظ ✓").font(.caption).foregroundColor(.green)
                }
            }
            Text("مقاطع جاهزة:")
                .font(.caption).foregroundColor(.secondary)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    snippetButton(title: "إخفاء Nitro", css: "a[href*=\"nitro\" i] { display: none !important; }")
                    snippetButton(title: "رسائل مدمجة أكثر", css: "[class*=\"messageListItem\"] { margin-bottom: -2px !important; }")
                    snippetButton(title: "إخفاء زر الهدايا", css: "[aria-label*=\"gift\" i] { display: none !important; }")
                }
            }
            Spacer()
        }
        .padding()
        .environment(\.layoutDirection, .rightToLeft)
        .navigationTitle("CSS مخصص")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { draft = store.customCSS }
    }

    private func snippetButton(title: String, css: String) -> some View {
        Button(title) {
            draft = draft.isEmpty ? css : draft + "\n" + css
        }
        .font(.caption)
        .buttonStyle(.bordered)
    }
}
