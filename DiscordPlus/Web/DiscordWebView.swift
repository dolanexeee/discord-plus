import SwiftUI
import WebKit

/// The Discord web client inside a WKWebView.
///
/// User-agent choice: a macOS desktop Safari UA. Discord then serves the
/// *full desktop* web client — the most feature-complete version, with the
/// most stable DOM for the plugin system. Trade-off: the desktop layout is
/// designed for wide screens, so on a phone you pinch-zoom; the mobile web
/// client would fit better but has fewer features and a different DOM.
struct DiscordWebView: UIViewRepresentable {
    @EnvironmentObject var store: SettingsStore
    var bridge: WebBridge

    static let homeURL = URL(string: "https://discord.com/app")!

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.customUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Safari/605.1.15"
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.websiteDataStore = .default()
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        let controller = config.userContentController
        controller.addUserScript(UserScripts.earlyScript())
        controller.add(context.coordinator.messageHandler, name: "discordPlus")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.bounces = true
        bridge.webView = webView

        webView.load(URLRequest(url: Self.homeURL))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // Plugin set changed -> full reload (plugins are injected at load).
        if context.coordinator.lastReloadToken != store.reloadToken {
            context.coordinator.lastReloadToken = store.reloadToken
            webView.reload()
            return
        }
        // Theme / CSS changed -> re-apply live without reloading.
        if context.coordinator.lastRevision != store.settingsRevision {
            context.coordinator.lastRevision = store.settingsRevision
            bridge.applyThemeAndCSS(to: webView)
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(bridge: bridge, store: store)
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        let bridge: WebBridge
        let store: SettingsStore
        var lastReloadToken = -1
        var lastRevision = -1
        lazy var messageHandler = WeakScriptMessageHandler(delegate: self)

        init(bridge: WebBridge, store: SettingsStore) {
            self.bridge = bridge
            self.store = store
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            bridge.isLoading = true
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            bridge.isLoading = false
            lastRevision = store.settingsRevision
            bridge.injectAll(into: webView)
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            bridge.isLoading = false
            bridge.loadError = error.localizedDescription
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            bridge.isLoading = false
            let nsError = error as NSError
            if nsError.code == NSURLErrorCancelled { return }
            bridge.loadError = error.localizedDescription
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }
            if isDiscordURL(url) {
                decisionHandler(.allow)
                return
            }
            if navigationAction.navigationType == .linkActivated {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, window: WKWindowFeatures?) -> WKWebView? {
            if let url = navigationAction.request.url {
                if isDiscordURL(url) {
                    webView.load(URLRequest(url: url))
                } else {
                    UIApplication.shared.open(url, options: [:], completionHandler: nil)
                }
            }
            return nil
        }

        private func isDiscordURL(_ url: URL) -> Bool {
            guard let host = url.host?.lowercased() else { return false }
            return host == "discord.com" || host.hasSuffix(".discord.com")
                || host == "discordapp.com" || host.hasSuffix(".discordapp.com")
                || host == "discord.gg" || host.hasSuffix(".discord.gg")
                || host == "cdn.discordapp.com" || host.hasSuffix(".cdn.discordapp.com")
                || host == "media.discordapp.net" || host.hasSuffix(".media.discordapp.net")
        }
    }
}

extension DiscordWebView.Coordinator: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        bridge.handle(message: message)
    }
}

/// WKScriptMessageHandler that holds its delegate weakly.
/// WKUserContentController retains handlers strongly; without this the
/// coordinator (and the webview) would leak.
final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    weak var delegate: WKScriptMessageHandler?

    init(delegate: WKScriptMessageHandler) {
        self.delegate = delegate
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        delegate?.userContentController(userContentController, didReceive: message)
    }
}
