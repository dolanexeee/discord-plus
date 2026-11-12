import Foundation

/// Central settings hub. Everything is persisted in UserDefaults and mirrored
/// into the webview as JSON (see WebBridge). No credentials or tokens are
/// ever stored here — login happens inside the WKWebView only.
final class SettingsStore: ObservableObject {
    static let shared = SettingsStore()

    enum Keys {
        static let themeId = "dp.themeId"
        static let accentHex = "dp.accentHex"
        static let fontFamily = "dp.fontFamily"
        static let customCSS = "dp.customCSS"
        static let pluginStates = "dp.pluginStates"
        static let pluginOptions = "dp.pluginOptions"
        static let userPluginURLs = "dp.userPluginURLs"
    }

    private let defaults = UserDefaults.standard

    /// Bumped on theme / accent / font / CSS changes: the webview re-applies
    /// styles live without reloading.
    @Published var settingsRevision: Int = 0
    /// Bumped on plugin enable/disable or user-plugin URL changes: the
    /// webview does a full reload because plugins are injected at load time.
    @Published var reloadToken: Int = 0

    @Published var themeId: String {
        didSet { defaults.set(themeId, forKey: Keys.themeId); bumpRevision() }
    }
    @Published var accentHex: String {
        didSet { defaults.set(accentHex, forKey: Keys.accentHex); bumpRevision() }
    }
    @Published var fontFamily: String {
        didSet { defaults.set(fontFamily, forKey: Keys.fontFamily); bumpRevision() }
    }
    @Published var customCSS: String {
        didSet { defaults.set(customCSS, forKey: Keys.customCSS); bumpRevision() }
    }
    @Published var pluginStates: [String: Bool] {
        didSet { defaults.set(pluginStates, forKey: Keys.pluginStates) }
    }
    @Published var pluginOptions: [String: [String: Bool]] {
        didSet { defaults.set(pluginOptions, forKey: Keys.pluginOptions) }
    }
    @Published var userPluginURLs: [String] {
        didSet { defaults.set(userPluginURLs, forKey: Keys.userPluginURLs); bumpReload() }
    }

    private init() {
        self.themeId = defaults.string(forKey: Keys.themeId) ?? "midnight"
        self.accentHex = defaults.string(forKey: Keys.accentHex) ?? "#5865F2"
        self.fontFamily = defaults.string(forKey: Keys.fontFamily) ?? "system"
        self.customCSS = defaults.string(forKey: Keys.customCSS) ?? ""
        self.pluginStates = defaults.dictionary(forKey: Keys.pluginStates) as? [String: Bool] ?? [:]
        self.pluginOptions = defaults.dictionary(forKey: Keys.pluginOptions) as? [String: [String: Bool]] ?? [:]
        self.userPluginURLs = defaults.stringArray(forKey: Keys.userPluginURLs) ?? []
    }

    private func bumpRevision() { settingsRevision += 1 }
    private func bumpReload() { reloadToken += 1 }

    // MARK: - Plugins

    func isPluginEnabled(_ id: String) -> Bool {
        pluginStates[id] ?? PluginRegistry.defaultEnabled(id)
    }

    func setPluginEnabled(_ id: String, enabled: Bool) {
        pluginStates[id] = enabled
        bumpReload()
    }

    func pluginOption(pluginId: String, optionId: String) -> Bool {
        pluginOptions[pluginId]?[optionId]
            ?? PluginRegistry.optionDefault(pluginId: pluginId, optionId: optionId)
    }

    func setPluginOption(pluginId: String, optionId: String, value: Bool) {
        var options = pluginOptions[pluginId] ?? [:]
        options[optionId] = value
        pluginOptions[pluginId] = options
        bumpReload()
    }

    func addUserPluginURL(_ url: String) {
        guard !userPluginURLs.contains(url) else { return }
        userPluginURLs.append(url)
    }

    func removeUserPluginURL(_ url: String) {
        userPluginURLs.removeAll { $0 == url }
    }

    // MARK: - JSON for the JS side

    func settingsDictionary() -> [String: Any] {
        var plugins: [String: Any] = [:]
        for meta in PluginRegistry.bundled {
            plugins[meta.id] = [
                "enabled": isPluginEnabled(meta.id),
                "options": pluginOptions[meta.id] ?? [:]
            ]
        }
        return [
            "themeId": themeId,
            "accentHex": accentHex,
            "fontFamily": fontFamily,
            "customCSS": customCSS,
            "plugins": plugins,
            "userPlugins": userPluginURLs
        ]
    }

    func settingsJSONString() -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: settingsDictionary(), options: []),
              let string = String(data: data, encoding: .utf8) else { return "{}" }
        return string
    }
}
