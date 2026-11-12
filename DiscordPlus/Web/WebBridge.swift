import Foundation
import WebKit

/// Native <-> JS bridge. Owns injection of settings, the loader, plugins and
/// theme CSS, and handles messages coming back from JS (toasts, logs,
/// plugin storage, open-external).
///
/// Security note: the bridge never handles credentials or session tokens.
/// Login happens inside the webview; the session lives in WebKit's own
/// cookie store, which this code never reads.
final class WebBridge: NSObject, ObservableObject {
    weak var webView: WKWebView?
    let store: SettingsStore

    @Published var isLoading = false
    @Published var toastMessage: String?
    @Published var loadError: String?

    init(store: SettingsStore = .shared) {
        self.store = store
    }

    // MARK: - Injection

    /// Full injection sequence, run on every page load (didFinish).
    func injectAll(into webView: WKWebView) {
        var scripts: [String] = []

        // 1. Settings JSON, visible to JS as window.__DP_SETTINGS__.
        scripts.append("window.__DP_SETTINGS__ = \(store.settingsJSONString());")

        // 2. The loader (defines window.DP + bridge helpers).
        if let loader = UserScripts.loadBundledJS(named: "loader") {
            scripts.append(loader)
        }

        // 3. Theme + custom CSS (as function calls — the loader defines them).
        let themeCSS = ThemeEngine.css(themeId: store.themeId, accentHex: store.accentHex, fontFamily: store.fontFamily)
        scripts.append("window.__DP_APPLY_THEME__ && window.__DP_APPLY_THEME__(\(jsonEncode(themeCSS)));")
        scripts.append("window.__DP_APPLY_CUSTOM_CSS__ && window.__DP_APPLY_CUSTOM_CSS__(\(jsonEncode(store.customCSS)));")

        // 4. Enabled bundled plugins.
        for meta in PluginRegistry.bundled where store.isPluginEnabled(meta.id) {
            if let code = UserScripts.loadBundledJS(named: meta.fileName.replacingOccurrences(of: ".js", with: "")) {
                scripts.append(code)
            }
        }

        // 5. Start everything, then fetch user-added plugin URLs.
        scripts.append("window.DP && window.DP.startAll && window.DP.startAll();")

        evaluateSequentially(scripts, into: webView) { [weak self] in
            self?.injectUserPlugins(into: webView)
        }
    }

    /// Re-apply theme + custom CSS without reloading (live theme switching).
    func applyThemeAndCSS(to webView: WKWebView) {
        let themeCSS = ThemeEngine.css(themeId: store.themeId, accentHex: store.accentHex, fontFamily: store.fontFamily)
        webView.evaluateJavaScript(
            "window.__DP_APPLY_THEME__ && window.__DP_APPLY_THEME__(\(jsonEncode(themeCSS)));",
            completionHandler: nil
        )
        webView.evaluateJavaScript(
            "window.__DP_APPLY_CUSTOM_CSS__ && window.__DP_APPLY_CUSTOM_CSS__(\(jsonEncode(store.customCSS)));",
            completionHandler: nil
        )
    }

    /// Fetch user-added plugin URLs and evaluate them in the page, then start
    /// any plugins they registered. Runs on the main queue after download.
    func injectUserPlugins(into webView: WKWebView) {
        let urls = store.userPluginURLs
        guard !urls.isEmpty else { return }
        let group = DispatchGroup()
        var scripts: [String] = []
        for urlString in urls {
            guard let url = URL(string: urlString) else { continue }
            group.enter()
            URLSession.shared.dataTask(with: url) { data, _, _ in
                defer { group.leave() }
                if let data = data, let code = String(data: data, encoding: .utf8), !code.isEmpty {
                    // Append directly: URLSession calls completions on its
                    // serial delegate queue, and group.notify runs only after
                    // every leave(), so this happens-before the notify.
                    // (Dispatching the append to main here would race with
                    // the notify and could drop the plugin.)
                    scripts.append(code)
                }
            }.resume()
        }
        group.notify(queue: .main) {
            self.evaluateSequentially(scripts, into: webView) {
                webView.evaluateJavaScript("window.DP && window.DP.startAll && window.DP.startAll();", completionHandler: nil)
            }
        }
    }

    private func evaluateSequentially(_ scripts: [String], into webView: WKWebView, completion: @escaping () -> Void) {
        var remaining = scripts
        func next() {
            guard !remaining.isEmpty else { completion(); return }
            let script = remaining.removeFirst()
            webView.evaluateJavaScript(script) { _, _ in next() }
        }
        next()
    }

    // MARK: - Messages from JS

    func handle(message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let type = body["type"] as? String else { return }
        switch type {
        case "toast":
            if let text = body["message"] as? String {
                showToast(text)
            }
        case "log":
            #if DEBUG
            print("[DP-JS]", body["message"] as? String ?? "")
            #endif
        case "storage":
            handleStorage(body)
        case "openExternal":
            if let urlString = body["url"] as? String, let url = URL(string: urlString) {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        default:
            break
        }
    }

    private func handleStorage(_ body: [String: Any]) {
        guard let action = body["action"] as? String,
              let key = body["key"] as? String else { return }
        let defaultsKey = "dp.pluginStorage.\(key)"
        if action == "set" {
            UserDefaults.standard.set(body["value"], forKey: defaultsKey)
        } else if action == "get", let id = body["id"] as? Int {
            let value = UserDefaults.standard.object(forKey: defaultsKey)
            let valueJSON = value.map { jsonEncode($0) } ?? "null"
            webView?.evaluateJavaScript("window.__DP_BRIDGE_REPLY__(\(id), \(valueJSON));", completionHandler: nil)
        }
    }

    func showToast(_ text: String) {
        DispatchQueue.main.async {
            self.toastMessage = text
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
                if self?.toastMessage == text { self?.toastMessage = nil }
            }
        }
    }

    // MARK: - JSON helpers

    /// JSON-encodes any JSON-compatible value as a JS literal.
    private func jsonEncode(_ value: Any) -> String {
        if let data = try? JSONSerialization.data(withJSONObject: [value], options: []),
           var string = String(data: data, encoding: .utf8) {
            string.removeFirst()
            string.removeLast()
            return string
        }
        return "null"
    }
}
