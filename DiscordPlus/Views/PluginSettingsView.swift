import SwiftUI

struct PluginSettingsView: View {
    @EnvironmentObject var store: SettingsStore
    @State private var newPluginURL = ""

    var body: some View {
        List {
            Section("بلجنات مدمجة") {
                ForEach(PluginRegistry.bundled) { meta in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(meta.nameAr).font(.body)
                                Text(meta.name).font(.caption).foregroundColor(.secondary)
                                Text(meta.summaryAr).font(.caption2).foregroundColor(.secondary)
                            }
                            Spacer()
                            Toggle("", isOn: Binding(
                                get: { store.isPluginEnabled(meta.id) },
                                set: { store.setPluginEnabled(meta.id, enabled: $0) }
                            ))
                            .labelsHidden()
                        }
                        ForEach(meta.options) { option in
                            Toggle(option.labelAr, isOn: Binding(
                                get: { store.pluginOption(pluginId: meta.id, optionId: option.id) },
                                set: { store.setPluginOption(pluginId: meta.id, optionId: option.id, value: $0) }
                            ))
                            .font(.caption)
                            .disabled(!store.isPluginEnabled(meta.id))
                        }
                    }
                    .padding(.vertical, 4)
                }
            }

            Section("بلجنات من روابط") {
                HStack {
                    TextField("https://…/plugin.js", text: $newPluginURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    Button("إضافة") {
                        let url = newPluginURL.trimmingCharacters(in: .whitespacesAndNewlines)
                        guard !url.isEmpty, URL(string: url) != nil else { return }
                        store.addUserPluginURL(url)
                        newPluginURL = ""
                    }
                    .disabled(newPluginURL.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                ForEach(store.userPluginURLs, id: \.self) { url in
                    HStack {
                        Text(url).font(.caption).lineLimit(1)
                        Spacer()
                        Button(role: .destructive) {
                            store.removeUserPluginURL(url)
                        } label: {
                            Image(systemName: "trash")
                        }
                    }
                }
                Text("تحذير: روابط البلجنات تنفّذ كود جافاسكربت داخل ديسكورد. أضف روابط من مصادر تثق بها فقط.")
                    .font(.caption)
                    .foregroundColor(.orange)
            }

            Section {
                Text("تفعيل أو تعطيل بلجن يعيد تحميل ديسكورد لتطبيق التغيير.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
        .navigationTitle("البلجنات")
        .navigationBarTitleDisplayMode(.inline)
    }
}
